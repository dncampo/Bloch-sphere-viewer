// 2D orthographic projection of the Bloch vector onto a coordinate plane,
// drawn on a canvas. Updated every frame alongside the 3D view.

function getColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    axX: s.getPropertyValue('--ax-x').trim(),
    axY: s.getPropertyValue('--ax-y').trim(),
    axZ: s.getPropertyValue('--ax-z').trim(),
    vec: s.getPropertyValue('--vec').trim(),
    ring: s.getPropertyValue('--ring').trim(),
    dim: s.getPropertyValue('--dim').trim(),
  };
}

export class PlaneView {
  constructor(canvas, plane) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.h = plane[0];
    this.vAx = plane[1];
    this.out = 'xyz'.replace(plane[0], '').replace(plane[1], '');
    this.w = 0;
    this.hgt = 0;

    new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      const dpr = Math.min(window.devicePixelRatio, 2);
      this.w = r.width;
      this.hgt = r.height;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      this.dpr = dpr;
    }).observe(canvas);
  }

  draw(vec, trail) {
    const { ctx, w, hgt: h } = this;
    if (!w || !h) return;
    const C = getColors();
    const axColors = { x: C.axX, y: C.axY, z: C.axZ };

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 6;
    const R = Math.min(w, h) / 2 - 26;
    if (R < 10) return;

    const a = vec[this.h], b = vec[this.vAx], out = vec[this.out];
    const px = v => cx + v * R;
    const py = v => cy - v * R;

    // Crosshair axes, colored to match the 3D view.
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = axColors[this.h];
    line(ctx, cx - R - 8, cy, cx + R + 8, cy);
    ctx.strokeStyle = axColors[this.vAx];
    line(ctx, cx, cy + R + 8, cx, cy - R - 8);
    ctx.globalAlpha = 1;

    // Unit circle (the sphere's silhouette) and half-radius guide.
    ctx.strokeStyle = C.ring;
    ctx.lineWidth = 1.5;
    circle(ctx, cx, cy, R);
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    circle(ctx, cx, cy, R / 2);
    ctx.restore();

    // Axis letters.
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = axColors[this.h];
    ctx.fillText(`+${this.h}`, cx + R + 14, cy);
    ctx.fillStyle = axColors[this.vAx];
    ctx.fillText(`+${this.vAx}`, cx, cy - R - 14);

    // Trace of recent motion, projected onto this plane.
    if (trail.length > 1) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = C.vec;
      const n = trail.length;
      for (let i = 1; i < n; i++) {
        ctx.globalAlpha = 0.05 + 0.45 * (i / n) ** 2;
        line(ctx,
          px(trail[i - 1][this.h]), py(trail[i - 1][this.vAx]),
          px(trail[i][this.h]), py(trail[i][this.vAx]));
      }
      ctx.globalAlpha = 1;
    }

    // Dashed circle at the current in-plane radius.
    const r = Math.hypot(a, b);
    if (r > 0.02) {
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = C.vec;
      ctx.globalAlpha = 0.3;
      circle(ctx, cx, cy, r * R);
      ctx.restore();
    }

    // Projected state vector.
    arrow(ctx, cx, cy, px(a), py(b), C.vec, 2);
    ctx.fillStyle = C.vec;
    dot(ctx, px(a), py(b), 4);

    // Numeric readout.
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = axColors[this.h];
    ctx.fillText(`${this.h} ${fmt(a)}`, 8, h - 8);
    ctx.fillStyle = axColors[this.vAx];
    ctx.fillText(`${this.vAx} ${fmt(b)}`, 78, h - 8);
    ctx.fillStyle = C.dim;
    ctx.textAlign = 'right';
    ctx.fillText(`${this.out} ${fmt(out)}`, w - 8, h - 8);
  }
}

function fmt(n) {
  const s = (Math.abs(n) < 5e-4 ? 0 : n).toFixed(3);
  return s.startsWith('-') ? s : '+' + s;
}

function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.stroke();
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

function arrow(ctx, x0, y0, x1, y1, color, width) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  line(ctx, x0, y0, x1, y1);
  if (len < 8) return;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const hl = 9;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - hl * Math.cos(ang - 0.45), y1 - hl * Math.sin(ang - 0.45));
  ctx.lineTo(x1 - hl * Math.cos(ang + 0.45), y1 - hl * Math.sin(ang + 0.45));
  ctx.closePath();
  ctx.fill();
}
