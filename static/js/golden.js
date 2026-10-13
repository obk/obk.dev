// The golden spiral: a dot stretches into a line, which curls up into a
// logarithmic spiral that widens by φ every quarter turn, holds, then
// uncurls and shrinks back to the dot.
//
// The curl bends the line without stretching it. Along a logarithmic
// spiral the direction turns by ln(s)/k at arc length s from the pole (k is
// the growth rate), so the curve at w (0..1) turns by w times that: at 0 a
// straight line, at 1 the spiral, and every stage between is the same line
// partly rolled up. Each frame is scaled to fit and centered.
"use strict";
(() => {
  const svg = document.getElementById("golden");
  if (!svg || !shown("golden")) return;
  const path = svg.querySelector("path");

  const PHI = (1 + Math.sqrt(5)) / 2;
  const K = Math.log(PHI) / (Math.PI / 2); // growth: r = e^(kθ), ×φ per quarter turn
  const N = 700; // points along the line
  const TURNS = 3; // turns of the spiral shown, from the outer end in
  const W = 2, H = 2 / PHI; // the box each frame fits: a golden rectangle
  // The whole curve turns by this much as it curls, so the line starts
  // level and the spiral ends up lying in a golden rectangle (found by
  // search: its bounding box is then φ wide to 1 high).
  const TURN = (86 * Math.PI) / 180;

  const DOT = 0.6; // seconds the dot shows
  const GROW = 1; // seconds for the dot to stretch into a line
  const LINE = 0.5; // seconds the line shows, before curling and after
  const CURL = 2.5; // seconds to curl up, and to uncurl
  const HOLD = 4; // seconds the spiral holds
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows
  const PERIOD = DOT + 2 * (GROW + LINE + CURL) + HOLD;

  // Arc length from the pole, outer end 1, inner end φ^(-4·TURNS): spaced
  // evenly in angle, so the tight inner turns get as many points as the
  // wide outer ones.
  const S = Array.from({ length: N + 1 }, (_, i) => Math.pow(PHI, (-4 * TURNS * i) / N));

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);

  // The dot's growth g and the curl w at time t.
  function at(t) {
    let u = t % PERIOD;
    const steps = [
      [DOT, () => [0, 0]],
      [GROW, (e) => [ease(e), 0]],
      [LINE, () => [1, 0]],
      [CURL, (e) => [1, ease(e)]],
      [HOLD, () => [1, 1]],
      [CURL, (e) => [1, 1 - ease(e)]],
      [LINE, () => [1, 0]],
      [GROW, (e) => [1 - ease(e), 0]],
    ];
    for (const [len, f] of steps) {
      if (u < len) return f(u / len);
      u -= len;
    }
    return [0, 0];
  }

  const xs = new Float64Array(N + 1), ys = new Float64Array(N + 1);
  let width = null; // the dot's growth the stroke was last drawn for
  function draw(t) {
    const [g, w] = at(t);
    // Walk in from the outer end, turning as the curl says, the whole
    // curve turned by w·TURN.
    let x = 0, y = 0, x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    for (let i = 1; i <= N; i++) {
      const ds = S[i - 1] - S[i], a = (w * Math.log(Math.sqrt(S[i - 1] * S[i]))) / K + w * TURN;
      x -= Math.cos(a) * ds;
      y -= Math.sin(a) * ds;
      xs[i] = x;
      ys[i] = y;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    // Fit the box and center it; g shrinks it all to a dot.
    const scale = g * Math.min(W / (x1 - x0), H / Math.max(y1 - y0, 1e-9));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let d = "";
    for (let i = 0; i <= N; i++) {
      d += (i ? "L" : "M") + ((xs[i] - cx) * scale).toFixed(4) + " " + ((ys[i] - cy) * scale).toFixed(4);
    }
    path.setAttribute("d", d);
    if (g !== width) {
      // A fat round dot that thins as it stretches; at 1, back to the CSS width.
      path.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }
  }

  animate(svg, "golden-time", draw, { still: DOT + GROW + LINE + CURL }); // still: the spiral
})();
