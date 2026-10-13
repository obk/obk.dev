// curve, cycloid and cycloid-horizontal as one, with one line throughout:
//
//   1. A dot stretches into a line that opens into a Lissajous figure; then
//      Lissajous figures and roses, as in curve.js.
//   2. The last rose becomes a cardioid as a fixed circle, a rolling circle
//      and its pen fade in; then epi- and hypocycloids, as in cycloid.js.
//   3. The fixed circle unrolls into a line and the curve into the trail of
//      a circle rolling along it, as in cycloid-horizontal.js: a cycloid is
//      an epicycloid round a circle grown infinitely large.
//   4. The trail closes back into the first Lissajous figure as the circles
//      fade, and it goes round again.
//
// Each scene gives the same things: the line (N + 1 points), the base (the
// fixed circle or the ground, NB + 1 points), the rolling circle with its
// pen, and in the last scene the fading trail of the pass before. Going from
// one scene to the next blends them point by point, so nothing cuts.
"use strict";
(() => {
  const svg = document.getElementById("medley");
  if (!svg || !shown("medley")) return;
  const [baseEl, oldEl, lineEl, ringEl, spokeEl, penEl] = ["base", "old", "line", "rolling", "spoke", "pen"].map((c) => svg.querySelector("." + c));

  const N = 1200; // points along the line
  const NB = 240; // points along the base
  const TAU = 2 * Math.PI;

  // Timing, seconds.
  const DOT = 0.6, GROW = 1, LINE = 0.5, OPEN = 1.5; // the start
  const START = DOT + GROW + LINE + OPEN;
  const HOLD = 3, MORPH = 1.5; // Lissajous figures and roses
  const C_HOLD = 4, C_MORPH = 1.8; // cycloids
  const BRIDGE = 2; // from one part to the next
  const DRIFT = 0.8; // Lissajous phase drift, radians per second
  const SPIN = 0.25; // rose rotation, radians per second
  const ROLL = 0.9; // the rolling circle going round, radians per second
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows

  // The circle on a line, scaled by HS into this view, its ground at y = HY.
  const HS = 0.7, HY = 0.35;
  const R = 0.5, HALF = 2.2, LEFT = -1.4, RIGHT = 1.4, TURN = (RIGHT - LEFT) / R;
  const PENS = [1, 0.45, 1.65]; // pen distance / R: normal, curtate, prolate
  const PASS = 3.5, SLIDE = 1.4, SHARP = 0.95, FADE = 1.4;
  const H_FROM = 0.4 * PASS, H_TO = 3 * PASS; // from 40% into the first pass to the end of the third

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const f = (v) => v.toFixed(4);

  // --- Scenes: each gives the state at time t (and local: seconds since
  // its way in began, held at the end of its stay) ----------------------------

  function points(fn) {
    const a = new Float64Array(2 * (N + 1));
    for (let i = 0; i <= N; i++) {
      const [x, y] = fn(i / N);
      a[2 * i] = x;
      a[2 * i + 1] = y;
    }
    return a;
  }

  const lissajous = (a, b) => (t) => ({
    line: points((s) => [Math.sin(a * s * TAU + Math.PI / 2 + t * DRIFT), -Math.sin(b * s * TAU)]),
  });

  const rose = (p, q) => {
    const span = (p % 2 && q % 2 ? 1 : 2) * q * Math.PI;
    return (t) => ({
      line: points((s) => {
        const th = s * span, r = Math.cos((p / q) * th), a = th + t * SPIN;
        return [r * Math.cos(a), -r * Math.sin(a)];
      }),
    });
  };

  // A fixed circle of radius R0 as NB + 1 points from its bottom round both
  // ways to its top, so it can unroll into a line.
  function circle(R0) {
    const a = new Float64Array(2 * (NB + 1));
    for (let j = 0; j <= NB; j++) {
      const phi = -Math.PI + (TAU * j) / NB;
      a[2 * j] = R0 * Math.sin(phi);
      a[2 * j + 1] = R0 * Math.cos(phi);
    }
    return a;
  }

  // Epicycloid (out = true) or hypocycloid with k cusps, reaching radius 1.
  function roulette(k, out) {
    const R0 = out ? k / (k + 2) : 1, r = out ? 1 / (k + 2) : 1 / k;
    const d = out ? R0 + r : R0 - r, ratio = d / r;
    const at = (th) => {
      const cx = d * Math.cos(th), cy = d * Math.sin(th), a = ratio * th;
      return out ? [cx, cy, cx - r * Math.cos(a), cy - r * Math.sin(a)] : [cx, cy, cx + r * Math.cos(a), cy - r * Math.sin(a)];
    };
    const base = circle(R0);
    return (t) => {
      const [cx, cy, px, py] = at(t * ROLL);
      return {
        line: points((s) => {
          const p = at(s * TAU);
          return [p[2], -p[3]];
        }),
        base,
        ring: [cx, -cy, r],
        pen: [px, -py],
      };
    };
  }

  // The circle on a line (see cycloid-horizontal.js), s seconds into rolling.
  const turnAt = (s) => (TURN * (1 - Math.asin(SHARP * Math.cos((Math.PI * s) / PASS)) / Math.asin(SHARP))) / 2;
  function penAt(s) {
    const m = Math.round(s / PASS), off = s - m * PASS;
    if (m >= 1 && Math.abs(off) < SLIDE / 2) {
      const a = PENS[(m - 1) % PENS.length], b = PENS[m % PENS.length];
      return R * (a + (b - a) * ease(off / SLIDE + 0.5));
    }
    return R * PENS[(off >= 0 ? m : m - 1) % PENS.length];
  }
  function penXY(s) {
    const a = turnAt(s), d = penAt(s);
    return [HS * (LEFT + R * a - d * Math.sin(a)), HY - HS * (R - d * Math.cos(a))];
  }
  const ground = (() => {
    const a = new Float64Array(2 * (NB + 1));
    for (let j = 0; j <= NB; j++) {
      a[2 * j] = HS * HALF * (-1 + (2 * j) / NB);
      a[2 * j + 1] = HY;
    }
    return a;
  })();
  function rolling(t, local) {
    const s = Math.min(H_FROM + local, H_TO - 1e-6);
    const p = Math.floor(s / PASS), s0 = p * PASS;
    const line = points((u) => penXY(s0 + (s - s0) * u));
    let old = null;
    if (p > 0 && s - s0 < FADE) {
      let d = "";
      for (let i = 0; i <= 300; i++) {
        const [x, y] = penXY((p - 1) * PASS + (PASS * i) / 300);
        d += (i ? "L" : "M") + f(x) + " " + f(y);
      }
      old = { d, op: 1 - ease((s - s0) / FADE) };
    }
    const a = turnAt(s), d = penAt(s), cx = HS * (LEFT + R * a), cy = HY - HS * R;
    return { line, base: ground, ring: [cx, cy, HS * R], pen: [cx - HS * d * Math.sin(a), cy + HS * d * Math.cos(a)], old };
  }

  // --- The timeline: [scene, seconds it stays, seconds to the next] ---------

  const STEPS = [
    [lissajous(1, 2), HOLD, MORPH],
    [rose(2, 1), HOLD, MORPH],
    [lissajous(3, 2), HOLD, MORPH],
    [rose(5, 1), HOLD, BRIDGE],
    [roulette(1, true), C_HOLD, C_MORPH], // cardioid
    [roulette(2, true), C_HOLD, C_MORPH], // nephroid
    [roulette(3, true), C_HOLD, C_MORPH],
    [roulette(3, false), C_HOLD, C_MORPH], // deltoid
    [roulette(4, false), C_HOLD, BRIDGE], // astroid
    [rolling, H_TO - H_FROM - BRIDGE, BRIDGE],
  ];
  // When each step's stay starts, within one round.
  const starts = [];
  let period = 0;
  for (const [, hold, morph] of STEPS) {
    starts.push(period);
    period += hold + morph;
  }
  const morphBefore = (i) => STEPS[(i + STEPS.length - 1) % STEPS.length][2];

  // Blend two states: the line and base point by point; what only one has
  // fades in or out.
  function blend(A, B, w) {
    const lerp = (a, b) => {
      const o = new Float64Array(a.length);
      for (let i = 0; i < a.length; i++) o[i] = a[i] + (b[i] - a[i]) * w;
      return o;
    };
    const both = (k) => A[k] && B[k];
    return {
      line: lerp(A.line, B.line),
      base: both("base") ? lerp(A.base, B.base) : A.base ?? B.base,
      baseOp: (A.base ? 1 - w : 0) + (B.base ? w : 0),
      ring: both("ring") ? lerp(A.ring, B.ring) : A.ring ?? B.ring,
      pen: both("pen") ? lerp(A.pen, B.pen) : A.pen ?? B.pen,
      toolOp: (A.ring ? 1 - w : 0) + (B.ring ? w : 0),
      old: A.old ? { d: A.old.d, op: A.old.op * (1 - w) } : B.old ? { d: B.old.d, op: B.old.op * w } : null,
    };
  }

  function state(t) {
    // The start: a dot, a line, then the first Lissajous figure opening.
    if (t < START) {
      const g = t < DOT ? 0 : Math.min(ease((t - DOT) / GROW), 1);
      const w = t < DOT + GROW + LINE ? 0 : ease((t - DOT - GROW - LINE) / OPEN);
      const first = STEPS[0][0](t);
      const line = points((s) => [g * Math.sin(s * TAU + Math.PI / 2 + t * DRIFT), 0]);
      for (let i = 0; i < line.length; i++) line[i] += (first.line[i] - line[i]) * w;
      return { line, g };
    }
    const u = (t - START) % period;
    let i = STEPS.length - 1;
    while (starts[i] > u) i--;
    const [scene, hold, morph] = STEPS[i], local = u - starts[i];
    const here = scene(t, Math.min(local, hold) + morphBefore(i));
    if (local < hold) return { ...here, baseOp: here.base ? 1 : 0, toolOp: here.ring ? 1 : 0, g: 1 };
    const j = (i + 1) % STEPS.length;
    return { ...blend(here, STEPS[j][0](t, local - hold), ease((local - hold) / morph)), g: 1 };
  }

  // --- Drawing --------------------------------------------------------------

  const path = (a) => {
    let d = "";
    for (let i = 0; i < a.length; i += 2) d += (i ? "L" : "M") + f(a[i]) + " " + f(a[i + 1]);
    return d;
  };

  let width = null;
  function draw(t) {
    const s = state(t);
    lineEl.setAttribute("d", path(s.line));
    baseEl.setAttribute("d", s.base ? path(s.base) : "");
    baseEl.style.opacity = s.baseOp ?? 0;
    oldEl.setAttribute("d", s.old ? s.old.d : "");
    oldEl.style.opacity = s.old ? s.old.op : 0;
    const op = s.toolOp ?? 0;
    for (const el of [ringEl, spokeEl, penEl]) el.style.opacity = op;
    if (s.ring) {
      const [cx, cy, r] = s.ring, [px, py] = s.pen;
      ringEl.setAttribute("cx", f(cx));
      ringEl.setAttribute("cy", f(cy));
      ringEl.setAttribute("r", f(r));
      spokeEl.setAttribute("d", `M${f(cx)} ${f(cy)}L${f(px)} ${f(py)}`);
      penEl.setAttribute("cx", f(px));
      penEl.setAttribute("cy", f(py));
    }
    if (s.g !== width) {
      // A fat round dot that thins as it grows; at 1, back to the CSS width.
      lineEl.style.strokeWidth = s.g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * s.g}px` : "";
      width = s.g;
    }
  }

  // Still frame: the first cycloid, circles and all.
  animate(svg, "medley-time", draw, { still: START + starts[4] + 1 });
})();
