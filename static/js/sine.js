// The sine wave: a pen at the line's left end bobs up and down, and its
// height, carried off to the right at a steady speed, draws a sine wave.
// Starts as a dot: the line stretches out of it, then the pen starts to
// move, slowly at first, and the wave runs out along the flat line until it
// fills it.
//
// The wave at distance u along the line is the pen's height u/SPEED seconds
// ago; before the pen started moving, that was 0, the flat line ahead of
// the wave's front.
"use strict";
(() => {
  const svg = document.getElementById("sine");
  if (!svg || !shown("sine")) return;
  const [ground, wave, pen] = ["ground", "line", "pen"].map((c) => svg.querySelector("." + c));

  const R = 0.6; // the wave's height
  const X0 = -2, X1 = 2; // where the wave starts and ends
  const LENGTH = 1.35; // the wave's length: about three fit
  const PERIOD = 2.4; // seconds the pen takes to go up and down
  const SPEED = LENGTH / PERIOD; // how fast the wave moves right
  const RAMP = 0.8; // about how many seconds the pen takes to get up to speed
  const DOT = 0.5; // seconds the dot shows
  const GROW = 1; // seconds for the line to stretch out of it
  const N = 600; // points along the wave
  const DOT_R = 0.06; // the dot's radius; it shrinks to the pen's
  const PEN_R = 0.03; // as the line stretches

  const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
  const f = (v) => v.toFixed(4);

  // The pen's phase, s seconds after it starts moving: its speed rises
  // smoothly from 0 to one period per PERIOD.
  const phaseAt = (s) => (s > 0 ? ((2 * Math.PI) / PERIOD) * (Math.hypot(s, RAMP) - RAMP) : 0);

  function draw(t) {
    const g = t < DOT ? 0 : Math.min(ease((t - DOT) / GROW), 1); // how far grown
    const s = t - DOT - GROW; // seconds of moving, once positive
    const x1 = X0 + (X1 - X0) * g; // the line stretches right from the dot

    let d = "";
    for (let i = 0; i <= N; i++) {
      const u = (X1 - X0) * (i / N);
      const y = -R * Math.sin(phaseAt(s - u / SPEED)); // y down
      d += (i ? "L" : "M") + f(X0 + u * g) + " " + f(y);
    }
    wave.setAttribute("d", g > 0 ? d : "");
    ground.setAttribute("d", g > 0 ? `M${X0} 0H${f(x1)}` : "");
    pen.setAttribute("cx", X0);
    pen.setAttribute("cy", f(-R * Math.sin(phaseAt(s))));
    pen.setAttribute("r", f(DOT_R + (PEN_R - DOT_R) * g));
  }

  // Still frame: the wave filling the line.
  animate(svg, "sine-time", draw, { still: DOT + GROW + 9 });
})();
