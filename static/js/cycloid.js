// Cycloids: a circle rolls around a fixed one and a pen on its rim draws
// the curve. Outside the fixed circle that's an epicycloid (cardioid,
// nephroid, ...), inside a hypocycloid (deltoid, astroid, ...). The whole
// curve shows while the rolling circle goes round it; then everything melts
// into the next one. Starts as a dot that grows into the first.
"use strict";
(() => {
  const svg = document.getElementById("cycloid");
  if (!svg) return;
  const [fixed, rolling, spoke, curve, pen] = ["fixed", "rolling", "spoke", "line", "pen"].map((c) => svg.querySelector("." + c));

  const N = 900; // points along the curve
  const DOT = 0.6; // seconds the dot shows
  const GROW = 1.2; // seconds for it to grow into the first curve
  const HOLD = 5; // seconds a curve holds
  const MORPH = 1.8; // seconds to melt into the next
  const ROLL = 0.9; // radians per second the rolling circle goes round
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows
  const TAU = 2 * Math.PI;

  // A roulette with k cusps, sized to reach radius 1. at(θ) gives the rolling
  // circle's center and the pen, with the circle at angle θ round the fixed one.
  const epi = (k) => {
    const R = k / (k + 2), r = 1 / (k + 2);
    return { R, r, at: (th) => roll(R + r, th, -r, ((R + r) / r) * th, 1) };
  };
  const hypo = (k) => {
    const R = 1, r = 1 / k;
    return { R, r, at: (th) => roll(R - r, th, r, ((R - r) / r) * th, -1) };
  };
  function roll(d, th, r, a, flip) {
    const cx = d * Math.cos(th), cy = d * Math.sin(th);
    return [cx, cy, cx + r * Math.cos(a), cy + flip * r * Math.sin(a)];
  }

  const SHAPES = [epi(1), epi(2), epi(3), hypo(3), hypo(4), hypo(5)];

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);

  // Shape a blended into b by w, everything scaled by g (0: a dot).
  function at(t) {
    if (t < DOT + GROW) {
      const g = t < DOT ? 0 : ease((t - DOT) / GROW);
      return [SHAPES[0], SHAPES[0], 0, g];
    }
    const u = Math.max(t - DOT - GROW, 0), per = HOLD + MORPH; // rounding can dip below 0
    const k = Math.floor(u / per), local = u - k * per;
    return [SHAPES[k % SHAPES.length], SHAPES[(k + 1) % SHAPES.length], local < HOLD ? 0 : ease((local - HOLD) / MORPH), 1];
  }

  const f = (v) => v.toFixed(4);
  let width = null;
  function draw(t) {
    const [a, b, w, g] = at(t);
    const mix = (p, q) => (p + (q - p) * w) * g;
    let d = "";
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * TAU, p = a.at(th), q = b.at(th);
      d += (i ? "L" : "M") + f(mix(p[2], q[2])) + " " + f(-mix(p[3], q[3]));
    }
    curve.setAttribute("d", d);
    const th = t * ROLL, p = a.at(th), q = b.at(th);
    const cx = mix(p[0], q[0]), cy = -mix(p[1], q[1]), px = mix(p[2], q[2]), py = -mix(p[3], q[3]);
    fixed.setAttribute("r", f(mix(a.R, b.R)));
    rolling.setAttribute("cx", f(cx));
    rolling.setAttribute("cy", f(cy));
    rolling.setAttribute("r", f(mix(a.r, b.r)));
    spoke.setAttribute("d", `M${f(cx)} ${f(cy)}L${f(px)} ${f(py)}`);
    pen.setAttribute("cx", f(px));
    pen.setAttribute("cy", f(py));
    if (g !== width) {
      // A fat round dot that thins as it grows; at 1, back to the CSS width.
      curve.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }
  }

  animate(svg, "cycloid-time", draw, { still: DOT + GROW });
})();
