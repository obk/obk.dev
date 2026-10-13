// Home page animation: shapes that spin and melt into one another, drawn in
// ASCII after donut.c. Each character cell casts a ray and marches the signed
// distance field of the shape on screen. A morph blends the fields of two
// shapes, so the change is continuous, not a cut from one to the next.
"use strict";
(() => {
  const pre = document.getElementById("shapes");
  if (!pre) return;

  const RAMP = ".,-~:;=!*#$@"; // dark to bright, as in donut.c
  const HOLD = 3.5; // seconds a shape spins on its own
  const MORPH = 2; // seconds to melt into the next
  const CAM = 4.5; // camera distance from the origin
  const BOUND = 1.25; // every shape fits in a sphere this size
  const STEPS = 64;
  const EPS = 0.003;

  // --- Shapes: signed distance from (x, y, z) to the surface ----------------

  function box(x, y, z, b) {
    const qx = Math.abs(x) - b, qy = Math.abs(y) - b, qz = Math.abs(z) - b;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0);
  }

  const mod2 = (v) => v - 2 * Math.floor(v / 2);

  // Cube with two levels of holes carved out (after Inigo Quilez).
  function menger(x, y, z) {
    const S = 0.68;
    x /= S;
    y /= S;
    z /= S;
    let d = box(x, y, z, 1), s = 1;
    for (let i = 0; i < 2; i++) {
      const ax = mod2(x * s) - 1, ay = mod2(y * s) - 1, az = mod2(z * s) - 1;
      s *= 3;
      const rx = Math.abs(1 - 3 * Math.abs(ax));
      const ry = Math.abs(1 - 3 * Math.abs(ay));
      const rz = Math.abs(1 - 3 * Math.abs(az));
      const c = (Math.min(Math.max(rx, ry), Math.max(ry, rz), Math.max(rz, rx)) - 1) / s;
      if (c > d) d = c;
    }
    return d * S;
  }

  // Dodecahedron face normals are (0, 1, phi) and its cyclic shifts, normalized.
  const PHI = (1 + Math.sqrt(5)) / 2;
  const NA = 1 / Math.sqrt(1 + PHI * PHI), NB = PHI * NA;

  const SHAPES = [
    // donut
    (x, y, z) => {
      const q = Math.sqrt(x * x + z * z) - 0.72;
      return Math.sqrt(q * q + y * y) - 0.34;
    },
    // cube, edges slightly rounded
    (x, y, z) => box(x, y, z, 0.6) - 0.06,
    // octahedron
    (x, y, z) => (Math.abs(x) + Math.abs(y) + Math.abs(z) - 1.15) * 0.57735,
    menger,
    // dodecahedron: the furthest of its face planes
    (x, y, z) => {
      x = Math.abs(x);
      y = Math.abs(y);
      z = Math.abs(z);
      return Math.max(NA * y + NB * z, NA * z + NB * x, NA * x + NB * y) - 0.86;
    },
    // gyroid, a triply periodic minimal surface, cut to a ball
    (x, y, z) => {
      const k = 3.4;
      const g = Math.sin(k * x) * Math.cos(k * y) + Math.sin(k * y) * Math.cos(k * z) + Math.sin(k * z) * Math.cos(k * x);
      return Math.max(Math.sqrt(x * x + y * y + z * z) - 1.05, (Math.abs(g) - 0.35) / (k * 2.6));
    },
    // Hopf link: two rings, each through the other
    (x, y, z) => {
      const a = Math.sqrt((x + 0.38) * (x + 0.38) + z * z) - 0.58;
      const b = Math.sqrt((x - 0.38) * (x - 0.38) + y * y) - 0.58;
      return Math.min(Math.sqrt(a * a + y * y), Math.sqrt(b * b + z * z)) - 0.17;
    },
  ];

  // The field on screen: shape fa blended into fb by w (0..1).
  let fa = SHAPES[0], fb = SHAPES[1], w = 0;
  function field(x, y, z) {
    if (w === 0) return fa(x, y, z);
    return fa(x, y, z) * (1 - w) + fb(x, y, z) * w;
  }

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);

  // --- Grid: one ray per character cell -------------------------------------

  // Per cell: view-space ray direction, and where it enters and leaves the
  // bounding sphere (enter < 0: misses it, stays blank).
  let cols = 0, rows = 0, dirs, enter, leave, out;

  // Character size in the pre's font, from an off-screen probe.
  function cell() {
    const probe = document.createElement("pre");
    probe.className = "shapes";
    probe.style.cssText = "position:absolute;visibility:hidden;width:auto;height:auto;margin:0;translate:none";
    probe.textContent = Array(10).fill("M".repeat(40)).join("\n");
    pre.after(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    return [r.width / 40, r.height / 10];
  }

  function layout() {
    const [cw, ch] = cell();
    cols = Math.max(1, Math.floor(pre.clientWidth / cw));
    rows = Math.max(1, Math.floor(pre.clientHeight / ch));
    const aspect = ch / cw; // cells are taller than wide
    // Size a cell so the bounding sphere just fills the shorter side.
    const px = (1.9 * BOUND) / Math.sqrt(CAM * CAM - BOUND * BOUND) / Math.min(cols, rows * aspect);
    const n = cols * rows;
    dirs = new Float32Array(n * 3);
    enter = new Float32Array(n);
    leave = new Float32Array(n);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const c = j * cols + i;
        const u = (i + 0.5 - cols / 2) * px, v = (rows / 2 - j - 0.5) * px * aspect;
        const len = Math.sqrt(u * u + v * v + 1);
        const dz = 1 / len;
        dirs[c * 3] = u / len;
        dirs[c * 3 + 1] = v / len;
        dirs[c * 3 + 2] = dz;
        // The camera sits at (0, 0, -CAM) looking down +z.
        const b = -CAM * dz, disc = b * b - (CAM * CAM - BOUND * BOUND);
        enter[c] = disc > 0 ? -b - Math.sqrt(disc) : -1;
        leave[c] = disc > 0 ? -b + Math.sqrt(disc) : -1;
      }
    }
    out = new Array(rows * (cols + 1) - 1).fill(" ");
    for (let j = 0; j < rows - 1; j++) out[j * (cols + 1) + cols] = "\n";
  }

  // --- Frame -----------------------------------------------------------------

  function draw(t) {
    const per = HOLD + MORPH, k = Math.floor(t / per), local = t - k * per;
    fa = SHAPES[k % SHAPES.length];
    fb = SHAPES[(k + 1) % SHAPES.length];
    w = local < HOLD ? 0 : ease((local - HOLD) / MORPH);

    // Spin: rotate the rays into the shape's frame instead of the shape.
    // m is the object-to-view rotation Rz(b) * Rx(a); rays use its transpose.
    const a = t * 0.7, b = t * 0.45;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const m00 = cb, m01 = -sb * ca, m02 = sb * sa;
    const m10 = sb, m11 = cb * ca, m12 = -cb * sa;
    const m20 = 0, m21 = sa, m22 = ca;
    const ox = -CAM * m20, oy = -CAM * m21, oz = -CAM * m22;
    // Light from the upper left, toward the viewer.
    let lx = -0.45, ly = 0.6, lz = -0.66;
    [lx, ly, lz] = [m00 * lx + m10 * ly + m20 * lz, m01 * lx + m11 * ly + m21 * lz, m02 * lx + m12 * ly + m22 * lz];
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= ll;
    ly /= ll;
    lz /= ll;

    for (let j = 0, c = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++, c++) {
        const o = j * (cols + 1) + i;
        out[o] = " ";
        if (enter[c] < 0) continue;
        const vx = dirs[c * 3], vy = dirs[c * 3 + 1], vz = dirs[c * 3 + 2];
        const dx = m00 * vx + m10 * vy + m20 * vz;
        const dy = m01 * vx + m11 * vy + m21 * vz;
        const dz = m02 * vx + m12 * vy + m22 * vz;
        let s = enter[c], hit = false, px = 0, py = 0, pz = 0;
        for (let n = 0; n < STEPS && s < leave[c]; n++) {
          px = ox + dx * s;
          py = oy + dy * s;
          pz = oz + dz * s;
          const d = field(px, py, pz);
          if (d < EPS) {
            hit = true;
            break;
          }
          s += d * 0.85;
        }
        if (!hit) continue;

        // Normal from four samples on a tetrahedron around the hit.
        const h = 0.002;
        const f1 = field(px + h, py - h, pz - h), f2 = field(px - h, py - h, pz + h);
        const f3 = field(px - h, py + h, pz - h), f4 = field(px + h, py + h, pz + h);
        let nx = f1 - f2 - f3 + f4, ny = -f1 - f2 + f3 + f4, nz = -f1 + f2 - f3 + f4;
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;

        // Diffuse plus a small highlight; a little ambient keeps the dark
        // side visible as dots.
        const diff = Math.max(nx * lx + ny * ly + nz * lz, 0);
        const hx = lx - dx, hy = ly - dy, hz = lz - dz;
        const hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
        const spec = Math.max((nx * hx + ny * hy + nz * hz) / hl, 0) ** 24;
        // Darken what sits in holes (little free space off the surface) and
        // what is further back, so the sponge and gyroid read as deep.
        const ao = Math.min(Math.max(field(px + nx * 0.1, py + ny * 0.1, pz + nz * 0.1) / 0.1, 0), 1);
        const depth = (s - (CAM - BOUND)) / (2 * BOUND);
        const lum = Math.min((0.1 + 0.7 * diff + 0.4 * spec) * (0.5 + 0.5 * ao) * (1 - 0.35 * depth), 1);
        out[o] = RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))];
      }
    }
    pre.textContent = out.join("");
  }

  // --- Loop ------------------------------------------------------------------

  pre.hidden = false; // layout() measures it, so show it first
  layout();
  const redraw = animate(pre, "shapes-time", draw, { start: 0.6 });
  new ResizeObserver(() => {
    layout();
    redraw();
  }).observe(pre);
  document.fonts.ready.then(() => {
    layout();
    redraw();
  });
})();
