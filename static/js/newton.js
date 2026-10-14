// Newton's cradle: five balls hanging in a row, touching. The first is
// lifted and let go; it swings down and stops dead as it hits the row, and
// the last swings out, as high, and back, and so on, for ever.
//
// Between hits only the end ball moves, as a pendulum would, so one angle
// does: θ = -A·cos(ωs), the left ball while it's negative, the right one
// while it's positive.
"use strict";
(() => {
  const svg = document.getElementById("newton");
  if (!svg || !shown("newton")) return;
  const [bar, strings] = ["bar", "strings"].map((c) => svg.querySelector("." + c));
  const balls = [...svg.querySelectorAll(".ball")];

  const R = 0.18; // a ball's radius
  const HANG = 1.1; // from the bar to a ball's center
  const TOP = -0.75; // the bar's height, y down
  const HALF = 1.05; // half the bar's length
  const A = (35 * Math.PI) / 180; // how far out the end balls swing
  const SWING = 1.6; // seconds from one hit to the next and back again
  const REST = 0.8; // seconds the row hangs still first
  const LIFT = 1.2; // seconds to lift the first ball
  const WAIT = 0.4; // seconds it's held up before it's let go

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const f = (v) => v.toFixed(4);
  const xs = balls.map((_, i) => (i - (balls.length - 1) / 2) * 2 * R); // where each hangs

  // The swinging angle, s seconds after the first ball starts to lift.
  function angleAt(s) {
    if (s <= 0) return 0;
    if (s < LIFT) return -A * ease(s / LIFT);
    if (s < LIFT + WAIT) return -A;
    return -A * Math.cos(((2 * Math.PI) / SWING) * (s - LIFT - WAIT));
  }

  bar.setAttribute("d", `M${-HALF} ${TOP}H${HALF}`);
  balls.forEach((ball) => ball.setAttribute("r", R));

  function draw(t) {
    const th = angleAt(t - REST);
    let d = "";
    balls.forEach((ball, i) => {
      const a = (i === 0 && th < 0) || (i === balls.length - 1 && th > 0) ? th : 0;
      const bx = xs[i] + HANG * Math.sin(a), by = TOP + HANG * Math.cos(a);
      ball.setAttribute("cx", f(bx));
      ball.setAttribute("cy", f(by));
      // The string, from the bar to the ball's edge.
      const sx = bx - R * Math.sin(a), sy = by - R * Math.cos(a);
      d += `M${f(xs[i])} ${TOP}L${f(sx)} ${f(sy)}`;
    });
    strings.setAttribute("d", d);
  }

  // Still frame: the last ball out at the top of its swing.
  animate(svg, "newton-time", draw, { still: REST + LIFT + WAIT + SWING / 2 });
})();
