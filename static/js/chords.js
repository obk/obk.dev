// Curves from straight lines: N points round a circle, each joined by a
// chord to the point k times as far round. The chords' envelope, the curve
// they all touch, is a cardioid for k = 2, a nephroid for 3, then
// epicycloids with k - 1 cusps. A dot grows into the circle, the chords are
// drawn in one by one, then k counts up, the chords sliding from one curve
// to the next, and back down to 2.
"use strict";
(() => {
  const svg = document.getElementById("chords");
  if (!svg || !shown("chords")) return;
  const [ring, chords] = ["ring", "chords"].map((c) => svg.querySelector("." + c));

  const R = 0.92; // the circle's radius
  const N = 150; // points round it
  const KS = [2, 3, 4, 5, 6]; // the k each stage holds at
  const DOT = 0.5; // seconds the dot shows
  const GROW = 1; // seconds for the circle to grow out of it
  const DRAW = 3; // seconds to draw the chords in
  const HOLD = 2.5; // seconds each k holds
  const MORPH = 2.5; // seconds from one k to the next
  const BACK = 4; // seconds from the last k back to 2
  const CHORD = "0.6px"; // the chords' width: thinner, there are many
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows
  const CYCLE = KS.length * HOLD + (KS.length - 1) * MORPH + BACK;

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const f = (v) => v.toFixed(4);

  // The point a turns round, from the left, going clockwise.
  const at = (a, r) => [-r * Math.cos(2 * Math.PI * a), -r * Math.sin(2 * Math.PI * a)];

  // k, s seconds after the chords are drawn in: holding at each of KS,
  // sliding between them, and at the end back to the first.
  function kAt(s) {
    let u = s % CYCLE;
    for (let i = 0; i < KS.length; i++) {
      if (u < HOLD) return KS[i];
      u -= HOLD;
      const next = i + 1 < KS.length ? KS[i + 1] : KS[0];
      const len = i + 1 < KS.length ? MORPH : BACK;
      if (u < len) return KS[i] + (next - KS[i]) * ease(u / len);
      u -= len;
    }
    return KS[0];
  }

  chords.style.strokeWidth = CHORD;
  let width = null;
  function draw(t) {
    const g = t < DOT ? 0 : Math.min(ease((t - DOT) / GROW), 1); // how far grown
    const s = t - DOT - GROW; // seconds since the circle grew
    let d = "";
    for (let i = 0; i <= 120; i++) {
      const [x, y] = at(i / 120, R * g);
      d += (i ? "L" : "M") + f(x) + " " + f(y);
    }
    ring.setAttribute("d", d);
    if (g !== width) {
      // A fat round dot that thins as it grows; at 1, back to the CSS width.
      ring.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }

    // Drawn in one by one, then k on the move.
    const n = s <= 0 ? 0 : s < DRAW ? Math.floor(N * ease(s / DRAW)) : N;
    const k = s < DRAW ? KS[0] : kAt(s - DRAW);
    let c = "";
    for (let i = 1; i < n; i++) {
      const [x0, y0] = at(i / N, R), [x1, y1] = at((k * i) / N, R);
      c += "M" + f(x0) + " " + f(y0) + "L" + f(x1) + " " + f(y1);
    }
    chords.setAttribute("d", c);
  }

  // Still frame: the cardioid.
  animate(svg, "chords-time", draw, { still: DOT + GROW + DRAW + 1 });
})();
