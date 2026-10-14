// Cycloids on a line: a circle rolls along a horizontal line and a pen on
// its spoke draws the trail. With the pen on the rim that's a cycloid;
// inside, a curtate one; outside, a prolate one, with loops. The circle
// rolls from one end of the line to the other and back at a steady pace,
// turning round quickly and never stopping. As it goes from edge to edge
// its pen slides along the spoke to the next kind, arriving at the turn;
// the last pass's trail fades as the next one is drawn. Starts with a dot
// falling onto the line: where it lands, the circle grows out of it, the
// dot on its rim, and rolls off as it grows, its trail coming out of the
// dot.
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
  const SHARP = 0.95; // how sharp the turns are: 0 swings like a pendulum, 1 is instant
  const FADE = 1.4; // seconds for the last pass's trail to fade
  const FALL = 0.8; // seconds the dot takes to fall onto the line
  const TOP = -1.3; // where it falls from
  const GROW = 1; // seconds for the circle to grow out of it
  const DT = 1 / 90; // seconds between trail points
  const DOT_R = 0.06; // the falling dot's radius; it shrinks to the pen's
  const PEN_R = 0.03; // as the circle grows

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const f = (v) => v.toFixed(4);

  // s seconds into rolling: how far the circle has turned, going between 0
  // and TURN. A triangle wave with rounded corners: steady speed across, and
  // a quick, smooth turn at each end, the speed passing 0 only at the turn.
  const turnAt = (s) => (TURN * (1 - Math.asin(SHARP * Math.cos((Math.PI * s) / PASS)) / Math.asin(SHARP))) / 2;

  // ... and the pen's distance from the center. The p-th pass runs from
  // turn p to turn p + 1; across it the pen slides from PENS[p] to
  // PENS[p + 1], starting and stopping gently at the turns.
  function penAt(s) {
    const p = Math.floor(s / PASS);
    const a = PENS[p % PENS.length], b = PENS[(p + 1) % PENS.length];
    return R * (a + (b - a) * ease(s / PASS - p));
  }

  // How far grown, s seconds into rolling: it rolls while it grows.
  const grownAt = (s) => Math.min(ease(s / GROW), 1);

  // Rolling without slipping: turned by a, the circle's center is at
  // LEFT + R·a, and a pen d from it at (LEFT + R·a - d·sin a, R - d·cos a),
  // y up; under the center, on the line, at a = 0. While growing, the radius
  // and pen are scaled by g, so the pen starts on the dot.
  function penXY(s) {
    const a = turnAt(s), g = grownAt(s), d = penAt(s) * g;
    return [LEFT + R * a - d * Math.sin(a), -(R * g - d * Math.cos(a))]; // y down
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

  ground.setAttribute("d", `M${-HALF} 0H${HALF}`);

  function draw(t) {
    const s = Math.max(t - FALL, 0); // seconds of rolling
    const g = grownAt(s); // how far grown
    const p = Math.floor(s / PASS); // which pass this is
    // This pass's trail, and the last one's while it fades.
    trail.setAttribute("d", s > 0 ? trace(p * PASS, s) : "");
    const since = s - p * PASS;
    if (p > 0 && since < FADE) {
      old.setAttribute("d", trace((p - 1) * PASS, p * PASS));
      old.style.opacity = 1 - ease(since / FADE);
    } else {
      old.setAttribute("d", "");
    }

    const a = turnAt(s), d = penAt(s) * g;
    const cx = LEFT + R * a, cy = -R * g; // the circle's center, y down
    const px = cx - d * Math.sin(a);
    // Falling, speeding up as things do, until it lands on the line.
    const py = t < FALL ? TOP * (1 - (t / FALL) ** 2) : cy + d * Math.cos(a);
    rolling.setAttribute("cx", f(cx));
    rolling.setAttribute("cy", f(cy));
    rolling.setAttribute("r", f(R * g));
    spoke.setAttribute("d", t < FALL ? "" : `M${f(cx)} ${f(cy)}L${f(px)} ${f(py)}`);
    pen.setAttribute("cx", f(px));
    pen.setAttribute("cy", f(py));
    pen.setAttribute("r", f(DOT_R + (PEN_R - DOT_R) * g));
  }

  // Still frame: most of the way through the first pass.
  animate(svg, "cycloid-horizontal-time", draw, { still: FALL + PASS * 0.8 });
})();
