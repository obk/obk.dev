// Ford circles: over every fraction p/q in [0, 1], in lowest terms, a
// circle of radius 1/(2q²) resting on the line. No two overlap, and two
// touch exactly when their fractions are neighbours in a Farey sequence.
// The two big ones over 0 and 1 rise first, then each denominator in turn,
// smaller and quicker, left to right; they hold, then sink back into the
// line, smallest first, and it starts again.
"use strict";
(() => {
  const svg = document.getElementById("ford");
  if (!svg || !shown("ford")) return;
  const group = svg.querySelector(".circles");

  const QMAX = 20; // the last denominator; smaller circles are under a pixel
  const STEP = 1.3; // seconds from q = 1 to q = 2; every doubling of q takes as long
  const SWEEP = 0.4; // seconds a denominator's row takes to cross from 0 to 1
  const GROW = 0.9; // seconds a circle takes to rise, or to sink
  const HOLD = 4; // seconds they all hold
  const SINK = 0.5; // sinking runs through them at this times the rising's pace
  const REST = 0.6; // seconds of bare line before they rise again

  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const circles = [];
  for (let q = 1; q <= QMAX; q++) {
    for (let p = 0; p <= q; p++) {
      if (gcd(p, q) !== 1) continue; // not in lowest terms (0/q and q/q too, past q = 1)
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      el.setAttribute("cx", (p / q).toFixed(5));
      el.setAttribute("r", "0");
      group.append(el);
      circles.push({ el, R: 1 / (2 * q * q), at: STEP * Math.log2(q) + SWEEP * (p / q), r: 0 });
    }
  }

  const LAST = Math.max(...circles.map((c) => c.at)); // when the last one starts to rise
  const FALL = LAST + GROW + HOLD; // when the first one starts to sink
  const PERIOD = FALL + LAST * SINK + GROW + REST;

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const clamp = (e) => Math.min(Math.max(e, 0), 1);

  function draw(t) {
    const u = t % PERIOD;
    for (const c of circles) {
      // Rising: in order of c.at. Sinking: the reverse, so the last risen
      // goes first and the big two last.
      const g = u < FALL
        ? ease(clamp((u - c.at) / GROW))
        : 1 - ease(clamp((u - FALL - (LAST - c.at) * SINK) / GROW));
      const r = c.R * g;
      if (r === c.r) continue;
      c.r = r;
      // The center sits r above the line, so a growing circle stays on it.
      c.el.setAttribute("cy", (-r).toFixed(5));
      c.el.setAttribute("r", r.toFixed(5));
    }
  }

  animate(svg, "ford-time", draw, { still: LAST + GROW });
})();
