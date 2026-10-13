// A dot that stretches into a line, which opens into a Lissajous figure and
// then loops through Lissajous figures and rose curves. Every curve is
// sampled at the same N points along its length, so a morph blends point i
// of one curve into point i of the next: the line never breaks. While a
// curve holds, it keeps moving: the Lissajous phase drifts, which
// makes the figure seem to turn in 3D, and roses slowly rotate.
"use strict";
(() => {
  const svg = document.getElementById("curve");
  if (!svg) return;
  const path = svg.querySelector("path");

  const N = 1200; // points along the line
  const DOT = 0.6; // seconds the dot shows
  const GROW = 1; // seconds for the dot to stretch into a line
  const LINE = 0.5; // seconds the line shows before it opens
  const OPEN = DOT + GROW + LINE; // when the line starts to open
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows
  const HOLD = 3; // seconds a curve holds
  const MORPH = 1.5; // seconds to melt into the next
  const DRIFT = 0.8; // Lissajous phase drift, radians per second
  const SPIN = 0.25; // rose rotation, radians per second
  const TAU = 2 * Math.PI;

  // Lissajous figure: x = sin(a·u + phase), y = sin(b·u), closed over one turn.
  const lissajous = (a, b) => (s, t) => {
    const u = s * TAU;
    return [Math.sin(a * u + Math.PI / 2 + t * DRIFT), Math.sin(b * u)];
  };

  // The start: Lissajous 1:2 with no height, a flat line traced back and
  // forth, g wide (0: a dot). Opening it only grows y, so it unfolds into the
  // first figure.
  const stretch = (g) => (s, t) => [g * Math.sin(s * TAU + Math.PI / 2 + t * DRIFT), 0];
  const line = stretch(1);

  // Rose r = cos(p/q · θ): closes after q·π turns if p and q are both odd,
  // 2q·π otherwise.
  const rose = (p, q) => {
    const span = (p % 2 && q % 2 ? 1 : 2) * q * Math.PI;
    return (s, t) => {
      const th = s * span, r = Math.cos((p / q) * th), a = th + t * SPIN;
      return [r * Math.cos(a), r * Math.sin(a)];
    };
  };

  const CURVES = [lissajous(1, 2), rose(2, 1), lissajous(3, 2), rose(5, 1), lissajous(3, 4), rose(7, 4), lissajous(5, 4), rose(3, 2)];

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);

  // The curve at time t: fa blended into fb by w (0..1), and how far the dot
  // has grown (g, 0..1). First the dot grows into the line, the line opens
  // into CURVES[0], then the loop runs and never returns to the start.
  function at(t) {
    if (t < DOT + GROW) {
      const g = t < DOT ? 0 : ease((t - DOT) / GROW), f = stretch(g);
      return [f, f, 0, g];
    }
    if (t < OPEN + MORPH) return [line, CURVES[0], t < OPEN ? 0 : ease((t - OPEN) / MORPH), 1];
    const u = Math.max(t - OPEN - MORPH, 0); // rounding can dip below 0
    const per = HOLD + MORPH, k = Math.floor(u / per), local = u - k * per;
    return [CURVES[k % CURVES.length], CURVES[(k + 1) % CURVES.length], local < HOLD ? 0 : ease((local - HOLD) / MORPH), 1];
  }

  let width = null; // the dot's growth the stroke was last drawn for
  function draw(t) {
    const [fa, fb, w, g] = at(t);
    if (g !== width) {
      // A fat round dot that thins as it stretches; at 1, back to the CSS width.
      path.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }
    let d = "";
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      let [x, y] = fa(s, t);
      if (w > 0) {
        const [x2, y2] = fb(s, t);
        x += (x2 - x) * w;
        y += (y2 - y) * w;
      }
      d += (i ? "L" : "M") + x.toFixed(4) + " " + (-y).toFixed(4);
    }
    path.setAttribute("d", d);
  }

  animate(svg, "curve-time", draw, { still: OPEN + MORPH }); // still: the figure, not the dot
})();
