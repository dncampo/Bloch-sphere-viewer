import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLORS = {
  x: 0xff5370,
  y: 0x3fd68c,
  z: 0x5aa2ff,
  vec: 0xffb300,
  ring: 0x3a4458,
  text: '#dfe6f0',
};

const TRAIL_MAX = 1500;

// Bloch coords are z-up; three.js is y-up. Right-handed mapping:
// (bx, by, bz) -> three (bx, bz, -by)
const b2t = b => new THREE.Vector3(b.x, b.z, -b.y);
const t2b = t => ({ x: t.x, y: -t.z, z: t.y });

function textSprite(text, { color = COLORS.text, size = 0.26 } = {}) {
  const pad = 24, fontPx = 96;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `600 ${fontPx}px "Segoe UI", system-ui, sans-serif`;
  g.font = font;
  c.width = Math.ceil(g.measureText(text).width) + pad * 2;
  c.height = fontPx + pad * 2;
  g.font = font;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c),
    transparent: true,
    depthWrite: false,
  }));
  sprite.scale.set(size * c.width / c.height, size, 1);
  return sprite;
}

// Circle of given radius in a Bloch coordinate plane ('xy' | 'xz' | 'yz'),
// optionally offset along the plane normal (for latitude circles).
function circleLine(plane, { radius = 1, offset = 0, color = COLORS.ring, opacity = 0.5 } = {}) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const t = (i / 128) * 2 * Math.PI;
    const a = radius * Math.cos(t), b = radius * Math.sin(t);
    let p;
    if (plane === 'xy') p = { x: a, y: b, z: offset };
    else if (plane === 'xz') p = { x: a, y: offset, z: b };
    else p = { x: offset, y: a, z: b };
    pts.push(b2t(p));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
}

function axisLine(axis, color) {
  const dir = b2t(axis);
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([dir.clone().multiplyScalar(-1.15), dir.clone().multiplyScalar(1.15)]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.1, 16),
    new THREE.MeshBasicMaterial({ color })
  );
  cone.position.copy(dir.clone().multiplyScalar(1.15));
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const group = new THREE.Group();
  group.add(line, cone);
  return group;
}

export class Bloch3D {
  constructor(container, onDragVector) {
    this.container = container;
    this.onDragVector = onDragVector;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(2.6, 1.5, 2.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 8;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(3, 4, 2);
    this.scene.add(light);

    this.buildSphere();
    this.buildVector();
    this.buildTrail();
    this.bindPointer();

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  buildSphere() {
    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshPhongMaterial({
        color: 0x3a78c9,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        shininess: 60,
      })
    );
    this.scene.add(surface);

    // Great circles, one per projection plane.
    this.scene.add(circleLine('xy', { opacity: 0.7 }));
    this.scene.add(circleLine('xz', { opacity: 0.7 }));
    this.scene.add(circleLine('yz', { opacity: 0.7 }));
    // Faint latitude circles.
    for (const off of [-0.5, 0.5]) {
      this.scene.add(circleLine('xy', { radius: Math.sqrt(1 - off * off), offset: off, opacity: 0.22 }));
    }

    this.scene.add(axisLine({ x: 1, y: 0, z: 0 }, COLORS.x));
    this.scene.add(axisLine({ x: 0, y: 1, z: 0 }, COLORS.y));
    this.scene.add(axisLine({ x: 0, y: 0, z: 1 }, COLORS.z));

    const labels = [
      ['x', { x: 1.34, y: 0, z: 0 }, '#ff5370'],
      ['y', { x: 0, y: 1.34, z: 0 }, '#3fd68c'],
      ['z', { x: 0, y: 0, z: 1.34 }, '#5aa2ff'],
      ['|0⟩', { x: 0.2, y: 0, z: 1.12 }, COLORS.text],
      ['|1⟩', { x: 0.2, y: 0, z: -1.12 }, COLORS.text],
      ['|+⟩', { x: 1.1, y: 0, z: -0.14 }, '#9aa5b8'],
      ['|−⟩', { x: -1.1, y: 0, z: -0.14 }, '#9aa5b8'],
      ['|+i⟩', { x: 0, y: 1.1, z: -0.14 }, '#9aa5b8'],
      ['|−i⟩', { x: 0, y: -1.1, z: -0.14 }, '#9aa5b8'],
    ];
    for (const [text, pos, color] of labels) {
      const s = textSprite(text, { color, size: text.length > 2 ? 0.21 : 0.26 });
      s.position.copy(b2t(pos));
      this.scene.add(s);
    }
  }

  buildVector() {
    this.arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, COLORS.vec, 0.14, 0.06
    );
    this.scene.add(this.arrow);

    this.tipDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 12),
      new THREE.MeshBasicMaterial({ color: COLORS.vec })
    );
    this.scene.add(this.tipDot);

    // Oversized invisible hit target around the tip, for grabbing.
    this.tipHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.scene.add(this.tipHandle);
  }

  buildTrail() {
    this.trailPositions = new Float32Array(TRAIL_MAX * 3);
    this.trailColors = new Float32Array(TRAIL_MAX * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    geo.setDrawRange(0, 0);
    this.trailLine = new THREE.Line(geo, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    }));
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);
  }

  bindPointer() {
    const el = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const unitSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
    const hit = new THREE.Vector3();
    this.dragging = false;

    const castFrom = e => {
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      return raycaster;
    };

    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const ray = castFrom(e);
      if (ray.intersectObject(this.tipHandle).length) {
        this.dragging = true;
        this.controls.enabled = false;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = 'grabbing';
      }
    });

    el.addEventListener('pointermove', e => {
      const ray = castFrom(e);
      if (this.dragging) {
        // Drag along the sphere surface; if the ray misses, use the closest point.
        if (!ray.ray.intersectSphere(unitSphere, hit)) {
          ray.ray.closestPointToPoint(unitSphere.center, hit);
          hit.normalize();
        }
        this.onDragVector(t2b(hit));
      } else {
        el.style.cursor = ray.intersectObject(this.tipHandle).length ? 'grab' : '';
      }
    });

    const endDrag = e => {
      if (!this.dragging) return;
      this.dragging = false;
      this.controls.enabled = true;
      el.style.cursor = '';
      if (e.pointerId !== undefined && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  setVector(v, trail) {
    const dir = b2t(v).normalize();
    this.arrow.setDirection(dir);
    this.tipDot.position.copy(dir);
    this.tipHandle.position.copy(dir);

    const n = Math.min(trail.length, TRAIL_MAX);
    const start = trail.length - n;
    const bright = new THREE.Color(COLORS.vec);
    const dim = new THREE.Color(0x2a2417);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const p = b2t(trail[start + i]);
      this.trailPositions[i * 3] = p.x;
      this.trailPositions[i * 3 + 1] = p.y;
      this.trailPositions[i * 3 + 2] = p.z;
      const t = n > 1 ? i / (n - 1) : 1;
      c.lerpColors(dim, bright, 0.15 + 0.85 * t * t);
      this.trailColors[i * 3] = c.r;
      this.trailColors[i * 3 + 1] = c.g;
      this.trailColors[i * 3 + 2] = c.b;
    }
    const geo = this.trailLine.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, n);
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
