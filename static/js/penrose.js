// The Penrose triangle, the impossible one: three square beams at right
// angles, each running into the next, in a loop. It starts to turn, slowly,
// and turns for ever; every third of a turn it looks as it began.
//
// It's three real beams seen isometrically: along x from the origin, then
// along y, then along z, which in this view ends back over the origin. The
// figure is three faces, each an L of two beams' faces that are flat
// together: the first is the top (z = 1) of the x and y beams; the other
// two are it turned by a third of a turn, which also takes each beam to the
// next.
"use strict";
(() => {
  const svg = document.getElementById("penrose");
  if (!svg || !shown("penrose")) return;
  const outline = svg.querySelector(".outline");

  const L = 4; // each beam's length, past its corner, in beam widths
  const SIZE = 1.9; // the circle the figure turns in, its diameter, viewBox units
  const TURN = 30; // seconds for a whole turn, once up to speed
  const RAMP = 1.5; // about how many seconds it takes to get up to speed
  const REST = 0.8; // seconds it rests before it starts

  const f = (v) => v.toFixed(4);

  // Isometric: x down-right, y down-left, z up; y down, as SVG has it.
  const C = Math.sqrt(3) / 2;
  const P = (x, y, z) => [(x - y) * C, (x + y) / 2 - z];

  // The turn taking each beam to the next: about the middle of the
  // corners O, A, B, from O to A.
  const [O, A, B] = [P(0, 0, 0), P(L, 0, 0), P(L, L, 0)];
  const mid = [(O[0] + A[0] + B[0]) / 3, (O[1] + A[1] + B[1]) / 3];
  const phi = Math.atan2(A[1] - mid[1], A[0] - mid[0]) - Math.atan2(O[1] - mid[1], O[0] - mid[0]);
  const turn = (k) => {
    const c = Math.cos(phi * k), s = Math.sin(phi * k);
    return ([x, y]) => [mid[0] + (x - mid[0]) * c - (y - mid[1]) * s, mid[1] + (x - mid[0]) * s + (y - mid[1]) * c];
  };

  // The top of the x and y beams, and its two turns: the whole figure. The
  // z beam, rising nearer the eye, hides the y beam's top from the diagonal
  // y = x - 1 on, so that end is cut at a slant. Each face closed back on
  // its first corner.
  const top = [[0, 0], [L + 1, 0], [L + 1, L], [L, L - 1], [L, 1], [0, 1]].map(([x, y]) => P(x, y, 1));
  const faces = [0, 1, 2].map((k) => [...top, top[0]].map(turn(k)));

  // Turning about its middle, it fits a circle of diameter SIZE.
  const far = Math.max(...faces.flat().map(([x, y]) => Math.hypot(x - mid[0], y - mid[1])));
  const scale = SIZE / 2 / far;

  // How far it has turned, s seconds after it started: its speed rises
  // smoothly from 0.
  const angleAt = (s) => (s > 0 ? ((2 * Math.PI) / TURN) * (Math.hypot(s, RAMP) - RAMP) : 0);

  function draw(t) {
    const a = angleAt(t - REST);
    const c = Math.cos(a) * scale, s = Math.sin(a) * scale;
    let d = "";
    for (const face of faces) {
      face.forEach(([x, y], i) => {
        const u = x - mid[0], v = y - mid[1];
        d += (i ? "L" : "M") + f(u * c - v * s) + " " + f(u * s + v * c);
      });
    }
    outline.setAttribute("d", d);
  }

  // Still frame: the triangle as it began.
  animate(svg, "penrose-time", draw);
})();
