// The Mandelbrot set's boundary, approached by one line. Iterate z -> z² + c
// from z = 0; the points c where the n-th iterate has |z| = 2 form a closed
// curve (a lemniscate) around the set, and as n grows these curves close in
// on its boundary. The line steps through n = 2 ... 10 and back. Starts as
// a dot that grows into the first.
//
// Each curve is traced once at load, by following the solution of
// z_n(c) = 2·e^(i·2^(n-1)·θ) as θ goes round: θ is the same "external angle"
// on every curve, so point j of one sits next to point j of the next, and a
// morph moves each point a short way.
"use strict";
(() => {
  const svg = document.getElementById("mandelbrot");
  if (!svg || !shown("mandelbrot")) return;
  const path = svg.querySelector("path");

  const M = 8192; // points per curve
  const LEVELS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const DOT = 0.6; // seconds the dot shows
  const GROW = 1.2; // seconds for it to grow into the first curve
  const HOLD = 1.2; // seconds a curve holds
  const LAST_HOLD = 4; // ... and at either end
  const MORPH = 1.2; // seconds to melt into the next
  const CENTER = -0.5; // middle of the view, on the real axis
  const GAP = 0.005; // skip points closer than this to the last drawn one
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows
  const TAU = 2 * Math.PI;

  // The curve |z_n(c)| = 2 as M points [x0, y0, x1, y1, ...].
  function trace(n) {
    const pts = new Float64Array(2 * M), deg = 2 ** (n - 1);
    // z_n(c) and its derivative, into zr, zi, dr, di.
    let zr, zi, dr, di;
    function iterate(cr, ci) {
      zr = zi = dr = di = 0;
      for (let k = 0; k < n; k++) {
        const ndr = 2 * (zr * dr - zi * di) + 1, ndi = 2 * (zr * di + zi * dr);
        const nzr = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = nzr;
        dr = ndr;
        di = ndi;
      }
    }
    // Newton's method on z_n(c) = w from c; returns [cr, ci, |z_n(c) - w|].
    function solve(cr, ci, wr, wi, steps) {
      for (let s = 0; s < steps; s++) {
        iterate(cr, ci);
        const fr = zr - wr, fi = zi - wi, den = dr * dr + di * di;
        cr -= (fr * dr + fi * di) / den;
        ci -= (fi * dr - fr * di) / den;
      }
      iterate(cr, ci);
      return [cr, ci, Math.hypot(zr - wr, zi - wi)];
    }
    // Start at the curve's rightmost point. On the real axis past 1/4, z_n
    // only grows with c, so bisect for z_n(c) = 2.
    let lo = 0.25, hi = 2;
    for (let s = 0; s < 60; s++) {
      const mid = (lo + hi) / 2;
      iterate(mid, 0);
      if (zr > 2 || !isFinite(zr)) hi = mid;
      else lo = mid;
    }
    let cr = (lo + hi) / 2, ci = 0;
    // Walk round in steps of θ small enough that c moves at most STEP, so
    // the solution never jumps to another part of the curve.
    const STEP = 0.002;
    let th = 0, dth = TAU / M;
    for (let j = 0; j < M; j++) {
      const goal = (TAU * j) / M;
      while (th < goal) {
        const h = Math.min(dth, goal - th), a = deg * (th + h);
        const wr = 2 * Math.cos(a), wi = 2 * Math.sin(a);
        iterate(cr, ci);
        // Predict where c goes (Newton from here), then refine.
        const fr = wr - zr, fi = wi - zi, den = dr * dr + di * di;
        const pr = cr + (fr * dr + fi * di) / den, pi = ci + (fi * dr - fr * di) / den;
        const [nr, ni, err] = solve(pr, pi, wr, wi, 3);
        if (Math.hypot(nr - cr, ni - ci) > STEP || !(err < 1e-9)) {
          dth = h / 2; // too far or didn't settle: a smaller step
          if (dth < 1e-13) return null; // stuck: leave this level out
          continue;
        }
        cr = nr;
        ci = ni;
        th += h;
        dth = h * 1.5;
      }
      pts[2 * j] = cr;
      pts[2 * j + 1] = ci;
    }
    return pts;
  }
  // Traced when first needed; after the first, the rest in the background,
  // one per task, long before the line gets to them. A level that can't be
  // traced shows the first instead.
  const curves = new Map();
  function curve(n) {
    if (!curves.has(n)) curves.set(n, trace(n));
    return curves.get(n) ?? curves.get(LEVELS[0]);
  }
  curve(LEVELS[0]);
  let next = 1;
  (function more() {
    if (next < LEVELS.length) {
      curve(LEVELS[next++]);
      setTimeout(more, 0);
    }
  })();

  // Up through the levels and back down, holding longer at the ends.
  const steps = [...LEVELS, ...LEVELS.slice(1, -1).reverse()];
  const holds = steps.map((n) => (n === LEVELS[0] || n === LEVELS.at(-1) ? LAST_HOLD : HOLD));
  const period = holds.reduce((a, h) => a + h + MORPH, 0);

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);

  // Curve a blended into b by w, scaled about the center by g (0: a dot).
  function at(t) {
    const first = curve(steps[0]);
    if (t < DOT + GROW) return [first, first, 0, t < DOT ? 0 : ease((t - DOT) / GROW)];
    let u = Math.max(t - DOT - GROW, 0) % period; // rounding can dip below 0
    for (let k = 0; ; k++) {
      if (u < holds[k] + MORPH || k === steps.length - 1) {
        const w = u < holds[k] ? 0 : ease(Math.min((u - holds[k]) / MORPH, 1));
        return [curve(steps[k]), curve(steps[(k + 1) % steps.length]), w, 1];
      }
      u -= holds[k] + MORPH;
    }
  }

  let width = null;
  function draw(t) {
    const [a, b, w, g] = at(t);
    let d = "", lx = Infinity, ly = Infinity;
    for (let j = 0; j <= M; j++) {
      const i = 2 * (j % M); // j = M closes the loop
      const x = CENTER + (a[i] + (b[i] - a[i]) * w - CENTER) * g;
      const y = (a[i + 1] + (b[i + 1] - a[i + 1]) * w) * g;
      if (j < M && Math.abs(x - lx) + Math.abs(y - ly) < GAP) continue;
      d += (d ? "L" : "M") + x.toFixed(4) + " " + (-y).toFixed(4);
      lx = x;
      ly = y;
    }
    path.setAttribute("d", d);
    if (g !== width) {
      // A fat round dot that thins as it grows; at 1, back to the CSS width.
      path.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }
  }

  // Still frame: the last level, closest to the set.
  const top = holds.slice(0, LEVELS.length - 1).reduce((a, h) => a + h + MORPH, 0);
  animate(svg, "mandelbrot-time", draw, { still: DOT + GROW + top });
})();
