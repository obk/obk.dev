// Cycloids on a line: a circle rolls along a horizontal line and a pen on
// its spoke draws the trail. With the pen on the rim that's a cycloid;
// inside, a curtate one; outside, a prolate one, with loops. The circle
// rolls from one end of the line to the other and back at a steady pace,
// turning round quickly and never stopping. Its pen starts sliding along the
// spoke to the next kind before each turn, while still rolling, and finishes
// after it; the last pass's trail fades as the next one is drawn. Starts as a dot: the line stretches out, the circle grows, and it
// starts to roll.
"use strict";
(() => {
  const svg = document.getElementById("cycloid-horizontal");
  if (!svg || !shown("cycloid-horizontal")) return;
  const [ground, rolling, spoke, old, trail, pen] = ["ground", "rolling", "spoke", "old", "line", "pen"].map((c) => svg.querySelector("." + c));

  const R = 0.5; // the rolling circle's radius
  const HALF = 2.2; // half the line's length
  const LEFT = -1.4, RIGHT = 1.4; // where the circle's center turns round
  const TURN = (RIGHT - LEFT) / R; // radians the circle turns in one pass
  const PENS = [1, 0.45, 1.65]; // pen distance / R: normal, curtate, prolate
  const PASS = 3.5; // seconds from one end to the other
  const SLIDE = 1.4; // seconds the pen takes to slide, centered on the turn
  const SHARP = 0.95; // how sharp the turns are: 0 swings like a pendulum, 1 is instant
  const FADE = 1.4; // seconds for the last pass's trail to fade
  const DOT = 0.5; // seconds the dot shows
  const GROW = 1; // seconds for the line and circle to grow out of it
  const DT = 1 / 90; // seconds between trail points
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const f = (v) => v.toFixed(4);

  // s seconds into rolling: how far the circle has turned, going between 0
  // and TURN. A triangle wave with rounded corners: steady speed across, and
  // a quick, smooth turn at each end, the speed passing 0 only at the turn.
  const turnAt = (s) => (TURN * (1 - Math.asin(SHARP * Math.cos((Math.PI * s) / PASS)) / Math.asin(SHARP))) / 2;

  // ... and the pen's distance from the center. The m-th turn is at m·PASS;
  // around it the pen slides from PENS[m - 1] to PENS[m].
  function penAt(s) {
    const m = Math.round(s / PASS), off = s - m * PASS;
    if (m >= 1 && Math.abs(off) < SLIDE / 2) {
      const a = PENS[(m - 1) % PENS.length], b = PENS[m % PENS.length];
      return R * (a + (b - a) * ease(off / SLIDE + 0.5));
    }
    return R * PENS[(off >= 0 ? m : m - 1) % PENS.length]; // the turns passed
  }

  // Rolling without slipping: turned by a, the circle's center is at
  // LEFT + R·a, and a pen d from it at (LEFT + R·a - d·sin a, R - d·cos a),
  // y up; under the center, on the line, at a = 0.
  function penXY(s) {
    const a = turnAt(s), d = penAt(s);
    return [LEFT + R * a - d * Math.sin(a), -(R - d * Math.cos(a))]; // y down
  }

  // Where the pen went from s0 to s1, as a path.
  function trace(s0, s1) {
    let d = "";
    const n = Math.max(1, Math.ceil((s1 - s0) / DT));
    for (let i = 0; i <= n; i++) {
      const [x, y] = penXY(s0 + ((s1 - s0) * i) / n);
      d += (i ? "L" : "M") + f(x) + " " + f(y);
    }
    return d;
  }

  let width = null;
  function draw(t) {
    const g = t < DOT ? 0 : Math.min(ease((t - DOT) / GROW), 1); // how far grown
    const s = Math.max(t - DOT - GROW, 0); // seconds of rolling
    const p = Math.floor(s / PASS); // which pass this is
    // This pass's trail, and the last one's while it fades.
    trail.setAttribute("d", g < 1 ? "" : trace(p * PASS, s));
    const since = s - p * PASS;
    if (p > 0 && since < FADE) {
      old.setAttribute("d", trace((p - 1) * PASS, p * PASS));
      old.style.opacity = 1 - ease(since / FADE);
    } else {
      old.setAttribute("d", "");
    }

    const a = turnAt(s), d = penAt(s) * g;
    const cx = LEFT + R * a, cy = -R * g; // the circle's center, y down
    const px = cx - d * Math.sin(a), py = cy + d * Math.cos(a);
    // The line grows out of the dot both ways, to its full length.
    ground.setAttribute("d", `M${f(LEFT + (-HALF - LEFT) * g)} 0H${f(LEFT + (HALF - LEFT) * g)}`);
    rolling.setAttribute("cx", f(cx));
    rolling.setAttribute("cy", f(cy));
    rolling.setAttribute("r", f(R * g));
    spoke.setAttribute("d", `M${f(cx)} ${f(cy)}L${f(px)} ${f(py)}`);
    pen.setAttribute("cx", f(px));
    pen.setAttribute("cy", f(py));
    if (g !== width) {
      // A fat round dot that thins as it grows; at 1, back to the CSS width.
      ground.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }
  }

  // Still frame: most of the way through the first pass.
  animate(svg, "cycloid-horizontal-time", draw, { still: DOT + GROW + PASS * 0.8 });
})();
