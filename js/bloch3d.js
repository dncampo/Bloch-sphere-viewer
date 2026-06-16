import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const THEME = {
  dark: {
    ring:         0x3a4458,
    text:         '#dfe6f0',
    textDim:      '#9aa5b8',
    vec:          0xffb300,
    trailDim:     0x2a2417,
    sphereOpacity: 0.12,
  },
  light: {
    ring:         0xa0aec0,
    text:         '#1a2035',
    textDim:      '#4b5563',
    vec:          0xd97706,
    trailDim:     0xfef3c7,
    sphereOpacity: 0.20,
  },
};

const AXIS_COLORS = { x: 0xff5370, y: 0x3fd68c, z: 0x5aa2ff };

const TRAIL_MAX = 1500;

const b2t = b => new THREE.Vector3(b.x, b.z, -b.y);
const t2b = t => ({ x: t.x, y: -t.z, z: t.y });

function textSprite(text, { color = '#dfe6f0', size = 0.26 } = {}) {
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

function circleLine(plane, { radius = 1, offset = 0, color = THEME.dark.ring, opacity = 0.5 } = {}) {
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
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
}

function axisLine(axis, color) {
  const dir = b2t(axis);
  const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      dir.clone().multiplyScalar(-1.15),
      dir.clone().multiplyScalar(1.15),
    ]),
    lineMat
  );
  const coneMat = new THREE.MeshBasicMaterial({ color });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 16), coneMat);
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
    this.isLight = false;

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

    this.ringMats = [];
    this.labelSprites = [];

    this.buildSphere();
    this.buildVector();
    this.buildTrail();
    this.bindPointer();

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    requestAnimationFrame(() => this.resize());
  }

  buildSphere() {
    this.sphereMat = new THREE.MeshPhongMaterial({
      color: 0x3a78c9,
      transparent: true,
      opacity: THEME.dark.sphereOpacity,
      depthWrite: false,
      shininess: 60,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), this.sphereMat));

    const addRing = (plane, opts) => {
      const ring = circleLine(plane, opts);
      this.ringMats.push(ring.material);
      this.scene.add(ring);
    };
    addRing('xy', { opacity: 0.7 });
    addRing('xz', { opacity: 0.7 });
    addRing('yz', { opacity: 0.7 });
    for (const off of [-0.5, 0.5]) {
      addRing('xy', { radius: Math.sqrt(1 - off * off), offset: off, opacity: 0.22 });
    }

    this.scene.add(axisLine({ x: 1, y: 0, z: 0 }, AXIS_COLORS.x));
    this.scene.add(axisLine({ x: 0, y: 1, z: 0 }, AXIS_COLORS.y));
    this.scene.add(axisLine({ x: 0, y: 0, z: 1 }, AXIS_COLORS.z));

    const T = THEME.dark;
    const labelDefs = [
      { text: 'x',    pos: { x:  1.34, y: 0,    z: 0    }, color: '#ff5370', size: 0.26 },
      { text: 'y',    pos: { x:  0,    y: 1.34,  z: 0    }, color: '#3fd68c', size: 0.26 },
      { text: 'z',    pos: { x:  0,    y: 0,     z: 1.34 }, color: '#5aa2ff', size: 0.26 },
      { text: '|0⟩',  pos: { x:  0.2,  y: 0,    z: 1.12 }, colorKey: 'text',    size: 0.21 },
      { text: '|1⟩',  pos: { x:  0.2,  y: 0,    z:-1.12 }, colorKey: 'text',    size: 0.21 },
      { text: '|+⟩',  pos: { x:  1.1,  y: 0,    z:-0.14 }, colorKey: 'textDim', size: 0.21 },
      { text: '|−⟩',  pos: { x: -1.1,  y: 0,    z:-0.14 }, colorKey: 'textDim', size: 0.21 },
      { text: '|+i⟩', pos: { x:  0,    y: 1.1,  z:-0.14 }, colorKey: 'textDim', size: 0.21 },
      { text: '|−i⟩', pos: { x:  0,    y:-1.1,  z:-0.14 }, colorKey: 'textDim', size: 0.21 },
    ];

    for (const def of labelDefs) {
      const color = def.color ?? T[def.colorKey];
      const sprite = textSprite(def.text, { color, size: def.size });
      sprite.position.copy(b2t(def.pos));
      this.scene.add(sprite);
      if (def.colorKey) {
        this.labelSprites.push({ sprite, text: def.text, colorKey: def.colorKey, size: def.size, pos: def.pos });
      }
    }
  }

  buildVector() {
    this.arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, THEME.dark.vec, 0.14, 0.06
    );
    this.scene.add(this.arrow);

    this.tipDotMat = new THREE.MeshBasicMaterial({ color: THEME.dark.vec });
    this.tipDot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), this.tipDotMat);
    this.scene.add(this.tipDot);

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

  setTheme(isLight) {
    this.isLight = isLight;
    const T = isLight ? THEME.light : THEME.dark;

    this.sphereMat.opacity = T.sphereOpacity;

    for (const mat of this.ringMats) {
      mat.color.setHex(T.ring);
    }

    this.arrow.setColor(T.vec);
    this.tipDotMat.color.setHex(T.vec);

    for (const entry of this.labelSprites) {
      const color = T[entry.colorKey];
      const newSprite = textSprite(entry.text, { color, size: entry.size });
      entry.sprite.material.map.dispose();
      entry.sprite.material.map = newSprite.material.map;
      entry.sprite.material.needsUpdate = true;
    }
  }

  setVector(v, trail) {
    const dir = b2t(v).normalize();
    this.arrow.setDirection(dir);
    this.tipDot.position.copy(dir);
    this.tipHandle.position.copy(dir);

    const T = this.isLight ? THEME.light : THEME.dark;
    const n = Math.min(trail.length, TRAIL_MAX);
    const start = trail.length - n;
    const bright = new THREE.Color(T.vec);
    const dim = new THREE.Color(T.trailDim);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const p = b2t(trail[start + i]);
      this.trailPositions[i * 3]     = p.x;
      this.trailPositions[i * 3 + 1] = p.y;
      this.trailPositions[i * 3 + 2] = p.z;
      const t = n > 1 ? i / (n - 1) : 1;
      c.lerpColors(dim, bright, 0.15 + 0.85 * t * t);
      this.trailColors[i * 3]     = c.r;
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
