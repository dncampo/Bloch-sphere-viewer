import { QuantumState, GATES } from './quantum.js';
import { Bloch3D } from './bloch3d.js';
import { PlaneView } from './planes.js';

const state = new QuantumState();
const view3d = new Bloch3D(document.getElementById('view3d'), v => state.setVector(v));
const planes = ['xy', 'xz', 'yz'].map(p =>
  new PlaneView(document.getElementById(`plane-${p}`), p)
);

// Gate toolbar
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

// Theme toggle
const btnTheme = document.getElementById('btn-theme');
function applyTheme(isLight) {
  document.body.classList.toggle('light', isLight);
  btnTheme.textContent = isLight ? 'Dark' : 'Light';
  view3d.setTheme(isLight);
}
const savedLight = localStorage.getItem('theme') === 'light';
applyTheme(savedLight);
btnTheme.addEventListener('click', () => {
  const isLight = !document.body.classList.contains('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  applyTheme(isLight);
});

// Column resize (3D view vs side panel)
(function initColumnResize() {
  const handle = document.getElementById('col-handle');
  const app = document.getElementById('app');
  let drag = null;

  handle.addEventListener('pointerdown', e => {
    drag = {
      startX: e.clientX,
      startW: document.getElementById('side').getBoundingClientRect().width,
    };
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  handle.addEventListener('pointermove', e => {
    if (!drag) return;
    // dragging left widens side panel, dragging right shrinks it
    const dx = drag.startX - e.clientX;
    const newW = Math.max(200, Math.min(700, drag.startW + dx));
    app.style.gridTemplateColumns = `1fr 6px ${newW}px`;
  });

  const end = () => { drag = null; };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
})();

// Panel resize
(function initPanelResize() {
  document.querySelectorAll('.resize-handle').forEach(handle => {
    let drag = null;

    handle.addEventListener('pointerdown', e => {
      const above = handle.previousElementSibling;
      const below = handle.nextElementSibling;
      drag = {
        startY: e.clientY,
        startX: e.clientX,
        aboveH: above.getBoundingClientRect().height,
        belowH: below.getBoundingClientRect().height,
        aboveW: above.getBoundingClientRect().width,
        belowW: below.getBoundingClientRect().width,
        above,
        below,
      };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    handle.addEventListener('pointermove', e => {
      if (!drag) return;
      const isMobile = window.innerWidth <= 900;
      if (isMobile) {
        const dx = e.clientX - drag.startX;
        const total = drag.aboveW + drag.belowW;
        const newAbove = Math.max(80, Math.min(total - 80, drag.aboveW + dx));
        drag.above.style.flex = `0 0 ${newAbove}px`;
        drag.below.style.flex = `0 0 ${total - newAbove}px`;
      } else {
        const dy = e.clientY - drag.startY;
        const total = drag.aboveH + drag.belowH;
        const newAbove = Math.max(60, Math.min(total - 60, drag.aboveH + dy));
        drag.above.style.flex = `0 0 ${newAbove}px`;
        drag.below.style.flex = `0 0 ${total - newAbove}px`;
      }
    });

    const end = () => { drag = null; };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
})();

// State readout
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

// Render loop
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
