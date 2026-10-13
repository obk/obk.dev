// The loop the animations share. animate(el, key, draw, options) shows el,
// then calls draw(t) every frame, t in seconds:
//
// - Time only runs while el is on screen, by at most 0.1 s a frame, so it
//   resumes where it stopped after scrolling away or switching tabs.
// - With reduced motion it draws one still frame, at options.still.
// - Time carries over between pages showing the same animation (home and
//   contact), under sessionStorage key: saved when a page is left, picked up
//   by the next one if it loads within a few seconds. Back and forward can
//   restore a page as it was; it catches up then too.
//
// It returns redraw(), which draws again at the current time.
"use strict";
function animate(el, key, draw, { start = 0, still = start } = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let t = start, last = null, raf = 0, visible = true;

  function saved() {
    try {
      const s = JSON.parse(sessionStorage.getItem(key));
      const gap = (Date.now() - s.at) / 1000;
      return gap >= 0 && gap < 5 ? s.t + gap : null;
    } catch {
      return null;
    }
  }

  function tick(now) {
    if (last !== null) t += Math.min(now - last, 100) / 1000;
    last = now;
    draw(t);
    raf = requestAnimationFrame(tick);
  }

  function update() {
    const run = visible && !reduce.matches;
    if (run && !raf) {
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = null;
    }
  }

  addEventListener("pagehide", () => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ t, at: Date.now() }));
    } catch {}
  });
  addEventListener("pageshow", (e) => {
    const s = e.persisted ? saved() : null;
    if (s === null) return;
    t = s;
    last = null;
    draw(t);
  });

  el.removeAttribute("hidden"); // works for <svg> too, which has no .hidden
  t = saved() ?? (reduce.matches ? still : start);
  draw(t);
  new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    update();
  }).observe(el);
  reduce.addEventListener("change", update);
  update();
  return () => draw(t);
}
