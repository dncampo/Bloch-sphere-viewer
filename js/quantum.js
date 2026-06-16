// Single-qubit state tracked as a unit Bloch vector.
// Convention: |0> = +Z, x = sin θ cos φ, y = sin θ sin φ, z = cos θ.
// A unitary gate acts on the Bloch vector as a rotation about an axis.

export const GATES = [
  { id: 'X',   label: 'X',  axis: [1, 0, 0], angle: Math.PI,      hint: 'Pauli-X: π rotation about x' },
  { id: 'Y',   label: 'Y',  axis: [0, 1, 0], angle: Math.PI,      hint: 'Pauli-Y: π rotation about y' },
  { id: 'Z',   label: 'Z',  axis: [0, 0, 1], angle: Math.PI,      hint: 'Pauli-Z: π rotation about z' },
  { id: 'H',   label: 'H',  axis: [Math.SQRT1_2, 0, Math.SQRT1_2], angle: Math.PI, hint: 'Hadamard: π rotation about (x+z)/√2' },
  { id: 'S',   label: 'S',  axis: [0, 0, 1], angle: Math.PI / 2,  hint: 'Phase: π/2 rotation about z' },
  { id: 'Sdg', label: 'S†', axis: [0, 0, 1], angle: -Math.PI / 2, hint: 'S-dagger: −π/2 rotation about z' },
  { id: 'T',   label: 'T',  axis: [0, 0, 1], angle: Math.PI / 4,  hint: 'T: π/4 rotation about z' },
  { id: 'Tdg', label: 'T†', axis: [0, 0, 1], angle: -Math.PI / 4, hint: 'T-dagger: −π/4 rotation about z' },
];

const TRAIL_MAX = 1500;
const TRAIL_MIN_DIST = 0.003;

// Rodrigues rotation of vector v about unit axis k by angle ang.
function rotateAbout(v, k, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const dot = k[0] * v.x + k[1] * v.y + k[2] * v.z;
  const cx = k[1] * v.z - k[2] * v.y;
  const cy = k[2] * v.x - k[0] * v.z;
  const cz = k[0] * v.y - k[1] * v.x;
  return {
    x: v.x * c + cx * s + k[0] * dot * (1 - c),
    y: v.y * c + cy * s + k[1] * dot * (1 - c),
    z: v.z * c + cz * s + k[2] * dot * (1 - c),
  };
}

function normalize(v) {
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class QuantumState {
  constructor() {
    this.v = { x: 0, y: 0, z: 1 };
    this.queue = [];
    this.anim = null;
    this.trail = [];
  }

  applyGate(gate) {
    this.queue.push(gate);
  }

  setVector(v) {
    // Direct manipulation cancels any pending gate animation.
    this.anim = null;
    this.queue.length = 0;
    this.v = normalize(v);
    this.pushTrail();
  }

  reset() {
    this.anim = null;
    this.queue.length = 0;
    this.v = { x: 0, y: 0, z: 1 };
    this.trail.length = 0;
  }

  randomize() {
    const z = 2 * Math.random() - 1;
    const phi = 2 * Math.PI * Math.random();
    const r = Math.sqrt(1 - z * z);
    this.setVector({ x: r * Math.cos(phi), y: r * Math.sin(phi), z });
  }

  clearTrail() {
    this.trail.length = 0;
  }

  pushTrail() {
    const last = this.trail[this.trail.length - 1];
    if (last) {
      const d = Math.hypot(this.v.x - last.x, this.v.y - last.y, this.v.z - last.z);
      if (d < TRAIL_MIN_DIST) return;
    }
    this.trail.push({ ...this.v });
    if (this.trail.length > TRAIL_MAX) this.trail.splice(0, this.trail.length - TRAIL_MAX);
  }

  // Advance gate animations. Returns true if the vector moved this frame.
  update(dt) {
    if (!this.anim && this.queue.length) {
      const gate = this.queue.shift();
      this.anim = {
        gate,
        t: 0,
        duration: 0.25 + 0.45 * Math.abs(gate.angle) / Math.PI,
        start: { ...this.v },
      };
    }
    if (!this.anim) return false;

    this.anim.t += dt;
    const f = easeInOutCubic(Math.min(this.anim.t / this.anim.duration, 1));
    this.v = rotateAbout(this.anim.start, this.anim.gate.axis, this.anim.gate.angle * f);
    this.pushTrail();
    if (this.anim.t >= this.anim.duration) this.anim = null;
    return true;
  }

  angles() {
    const theta = Math.acos(Math.max(-1, Math.min(1, this.v.z)));
    const phi = Math.hypot(this.v.x, this.v.y) < 1e-9 ? 0 : Math.atan2(this.v.y, this.v.x);
    return { theta, phi };
  }
}
