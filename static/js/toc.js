// Contents sidebar: mark the section being read. The current section is the
// last heading above a line a quarter of the way down the window; at the very
// bottom of the page it's the last one, which may never reach that line.
"use strict";
(() => {
  const links = [...document.querySelectorAll('.toc a[href^="#"]')];
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  if (!links.length || heads.includes(null)) return;

  let current = -1, queued = false;

  function update() {
    queued = false;
    const line = innerHeight / 4;
    let i = -1;
    heads.forEach((h, k) => {
      if (h.getBoundingClientRect().top <= line) i = k;
    });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) i = heads.length - 1;
    if (i === current) return;
    links[current]?.classList.remove("current");
    links[current]?.removeAttribute("aria-current");
    links[i]?.classList.add("current");
    links[i]?.setAttribute("aria-current", "location");
    current = i;
  }

  function queue() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  update();
})();
