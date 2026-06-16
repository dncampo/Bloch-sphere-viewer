import { QuantumState, GATES } from './quantum.js';
import { Bloch3D } from './bloch3d.js';
import { PlaneView } from './planes.js';

const state = new QuantumState();
const view3d = new Bloch3D(document.getElementById('view3d'), v => state.setVector(v));
const planes = ['xy', 'xz', 'yz'].map(p =>
  new PlaneView(document.getElementById(`plane-${p}`), p)
);

const gatesEl = document.getElementById('gates');
for (const gate of GATES) {
  const btn = document.createElement('button');
  btn.textContent = gate.label;
  btn.title = gate.hint;
  btn.addEventListener('click', () => state.applyGate(gate));
  gatesEl.appendChild(btn);
}

document.getElementById('btn-reset').addEventListener('click', () => state.reset());
document.getElementById('btn-random').addEventListener('click', () => state.randomize());
document.getElementById('btn-clear').addEventListener('click', () => state.clearTrail());

const roPsi = document.getElementById('ro-psi');
const roAng = document.getElementById('ro-ang');
const roVec = document.getElementById('ro-vec');

function fmt(n, d = 3) {
  const s = (Math.abs(n) < 5e-4 ? 0 : n).toFixed(d);
  return s === `-0.${'0'.repeat(d)}` ? s.slice(1) : s;
}

function updateReadout() {
  const { theta, phi } = state.angles();
  const alpha = Math.cos(theta / 2);
  const bMag = Math.sin(theta / 2);
  const bRe = bMag * Math.cos(phi);
  const bIm = bMag * Math.sin(phi);
  const deg = r => (r * 180 / Math.PI).toFixed(1);

  roPsi.textContent =
    `|ψ⟩ = ${fmt(alpha)} |0⟩ + (${fmt(bRe)} ${bIm < 0 ? '−' : '+'} ${fmt(Math.abs(bIm))}i) |1⟩`;
  roAng.textContent =
    `θ = ${deg(theta)}°  φ = ${deg(phi)}°  P(0) = ${fmt(alpha * alpha)}  P(1) = ${fmt(bMag * bMag)}`;
  roVec.textContent =
    `x = ${fmt(state.v.x)}  y = ${fmt(state.v.y)}  z = ${fmt(state.v.z)}`;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  state.update(dt);
  view3d.setVector(state.v, state.trail);
  view3d.render();
  for (const p of planes) p.draw(state.v, state.trail);
  updateReadout();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
