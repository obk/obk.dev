// Cycloids on a line: a circle rolls along a horizontal line and a pen on
// its spoke leaves a trail. With the pen on the rim that's a cycloid; inside,
// a curtate one; outside, a prolate one, with loops. Every few seconds the pen
// slides along the spoke to the next kind, and the trail behind it keeps the
// shape it was drawn with. The circle stays in the middle and the trail runs
// off to the left, so the line seems endless. Starts as a dot: the line
// stretches out, the circle grows, and it starts to roll.
"use strict";
(() => {
  const svg = document.getElementById("cycloid-horizontal");
  if (!svg) return;
  const [ground, rolling, spoke, trail, pen] = ["ground", "rolling", "spoke", "line", "pen"].map((c) => svg.querySelector("." + c));

  const R = 0.5; // the rolling circle's radius
  const HALF = 2.3; // half the drawn width, past the view's edge
  const PENS = [1, 0.45, 1.65]; // pen distance / R: normal, curtate, prolate
  const PEN_HOLD = 1.8; // seconds the pen stays put
  const PEN_MOVE = 0.7; // seconds it takes to slide to the next distance
  const DOT = 0.6; // seconds the dot shows
  const GROW = 1.2; // seconds for the line and circle to grow out of it
  const SPIN = 1.2; // radians per second the circle turns as it rolls
  const STEP = 0.02; // radians of turn between trail points
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);

  // Pen distance from the center, s seconds into rolling.
  function penAt(s) {
    const per = PEN_HOLD + PEN_MOVE, k = Math.floor(Math.max(s, 0) / per), local = Math.max(s, 0) - k * per;
    const a = PENS[k % PENS.length], b = PENS[(k + 1) % PENS.length];
    return R * (local < PEN_HOLD ? a : a + (b - a) * ease((local - PEN_HOLD) / PEN_MOVE));
  }

  const f = (v) => v.toFixed(4);
  let width = null;
  function draw(t) {
    const g = t < DOT ? 0 : Math.min(ease((t - DOT) / GROW), 1); // how far grown
    const s = Math.max(t - DOT - GROW, 0); // seconds of rolling
    const phi = s * SPIN; // how far the circle has turned

    // The trail: where the pen was when the circle had turned th, for every
    // th since rolling began, placed relative to the circle's center now.
    let d = "";
    const from = Math.max(0, phi - (HALF + 2 * R) / R);
    for (let th = phi; ; th -= STEP) {
      const t2 = Math.max(th, from), p = penAt(t2 / SPIN);
      d += (d ? "L" : "M") + f(R * (t2 - phi) - p * Math.sin(t2)) + " " + f(-(R - p * Math.cos(t2)) * g);
      if (t2 === from) break;
    }
    trail.setAttribute("d", d);

    const p = penAt(s) * g, cy = -R * g; // the circle's center is at (0, cy)
    const px = -p * Math.sin(phi), py = cy + p * Math.cos(phi);
    ground.setAttribute("d", `M${f(-HALF * g)} 0H${f(HALF * g)}`);
    rolling.setAttribute("cy", f(cy));
    rolling.setAttribute("r", f(R * g));
    spoke.setAttribute("d", `M0 ${f(cy)}L${f(px)} ${f(py)}`);
    pen.setAttribute("cx", f(px));
    pen.setAttribute("cy", f(py));
    if (g !== width) {
      // A fat round dot that thins as it grows; at 1, back to the CSS width.
      ground.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }
  }

  // Still frame: a few seconds in, with some of each kind of trail.
  animate(svg, "cycloid-horizontal-time", draw, { still: DOT + GROW + 5.5 });
})();
