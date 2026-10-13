// A nautilus shell in section. A dot stretches into a line, which curls
// into a logarithmic spiral widening 3 times a turn, close to a real
// nautilus; the mouth closes it, and the septa, the curved walls between
// its chambers, grow in one by one from the oldest, innermost one out,
// leaving the last third of a turn open as the body chamber. It holds, then
// it all goes back the way it came.
//
// The curl is golden.js's: the line bends without stretching, turning by
// w times the spiral's own turn at each point, and each frame is scaled to
// fit and centered.
"use strict";
(() => {
  const svg = document.getElementById("nautilus");
  if (!svg || !shown("nautilus")) return;
  const [wall, septa] = ["wall", "septa"].map((c) => svg.querySelector("." + c));

  const K = Math.log(3) / (2 * Math.PI); // growth: r = e^(kθ), ×3 a turn
  const M = 240; // points per turn
  const TURNS = 3;
  const N = M * TURNS; // points along the line; point i + M is one turn in from i
  const W = 2, H = 1.52; // the box each frame fits: the shell's own shape
  const TURN = Math.PI / 2; // the curve turns this much as it curls: mouth lower right

  const BODY = M / 3; // the body chamber, a third of a turn, has no septa
  const EVERY = M / 12; // a septum every 30°
  const BOW = 0.35; // how far a septum bows back, as a fraction of its length
  const LIP = -0.12; // the mouth bows out a little

  const DOT = 0.6; // seconds the dot shows
  const GROW = 1; // seconds for the dot to stretch into a line
  const LINE = 0.5; // seconds the line shows, before curling and after
  const CURL = 2.5; // seconds to curl up, and to uncurl
  const DRAW = 0.4; // seconds a septum takes to grow across
  const NEXT = 0.15; // seconds between one septum and the next
  const HOLD = 3.5; // seconds the shell holds
  const CLEAR = 1; // seconds for the septa to go, newest first
  const DOT_WIDTH = 4.5; // px; the stroke thins to the CSS width as it grows

  // Arc length from the pole, outer end 1: spaced evenly in angle.
  const S = Array.from({ length: N + 1 }, (_, i) => Math.exp((-K * 2 * Math.PI * TURNS * i) / N));

  // The walls inside: the mouth first, then the septa, innermost first.
  // Each joins point i on the outer wall to point i + M on the turn inside.
  const walls = [{ i: 0, bow: LIP }];
  for (let i = N - M; i >= BODY; i -= EVERY) walls.push({ i, bow: BOW });
  const BUILD = (walls.length - 1) * NEXT + DRAW;
  const PERIOD = DOT + 2 * (GROW + LINE + CURL) + BUILD + HOLD + CLEAR;

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const clamp = (e) => Math.min(Math.max(e, 0), 1);

  // The dot's growth g, the curl w, and how far each inner wall has grown
  // across (a function of its place in walls) at time t.
  function at(t) {
    let u = t % PERIOD;
    const none = () => 0;
    const steps = [
      [DOT, () => [0, 0, none]],
      [GROW, (e) => [ease(e), 0, none]],
      [LINE, () => [1, 0, none]],
      [CURL, (e) => [1, ease(e), none]],
      [BUILD, (e) => [1, 1, (j) => ease(clamp((e * BUILD - j * NEXT) / DRAW))]],
      [HOLD, () => [1, 1, () => 1]],
      [CLEAR, (e) => [1, 1, (j) => 1 - ease(clamp(e * 2 - (walls.length - 1 - j) / (walls.length - 1)))]],
      [CURL, (e) => [1, 1 - ease(e), none]],
      [LINE, () => [1, 0, none]],
      [GROW, (e) => [1 - ease(e), 0, none]],
    ];
    for (const [len, f] of steps) {
      if (u < len) return f(u / len);
      u -= len;
    }
    return [0, 0, none];
  }

  const xs = new Float64Array(N + 1), ys = new Float64Array(N + 1);
  const f = (v) => v.toFixed(4);
  let width = null; // the dot's growth the stroke was last drawn for
  function draw(t) {
    const [g, w, grown] = at(t);
    // Walk in from the outer end, turning as the curl says, the whole curve
    // turned by w·TURN.
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
    const X = (v) => (v - cx) * scale, Y = (v) => (v - cy) * scale;

    let d = "";
    for (let i = 0; i <= N; i++) d += (i ? "L" : "M") + f(X(xs[i])) + " " + f(Y(ys[i]));
    wall.setAttribute("d", d);

    // Each inner wall: a curve from the outer wall to the turn inside,
    // bowed back along the spiral, drawn as far across as it has grown.
    let s = "";
    walls.forEach(({ i, bow }, j) => {
      const e = grown(j);
      if (e <= 0) return;
      const ax = xs[i], ay = ys[i], bx = xs[i + M], by = ys[i + M];
      const tx = xs[i + 1] - xs[Math.max(i - 1, 0)], ty = ys[i + 1] - ys[Math.max(i - 1, 0)];
      const tl = Math.hypot(tx, ty) || 1, len = Math.hypot(bx - ax, by - ay);
      const qx = (ax + bx) / 2 + (bow * len * tx) / tl, qy = (ay + by) / 2 + (bow * len * ty) / tl;
      const STEPS = 12;
      for (let k = 0; k <= STEPS; k++) {
        const u = (e * k) / STEPS, v = 1 - u;
        const px = v * v * ax + 2 * v * u * qx + u * u * bx, py = v * v * ay + 2 * v * u * qy + u * u * by;
        s += (k ? "L" : "M") + f(X(px)) + " " + f(Y(py));
      }
    });
    septa.setAttribute("d", s);

    if (g !== width) {
      // A fat round dot that thins as it stretches; at 1, back to the CSS width.
      wall.style.strokeWidth = g < 1 ? `${DOT_WIDTH + (1.2 - DOT_WIDTH) * g}px` : "";
      width = g;
    }
  }

  animate(svg, "nautilus-time", draw, { still: DOT + GROW + LINE + CURL + BUILD }); // still: the whole shell
})();
