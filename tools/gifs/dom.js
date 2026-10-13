// Just enough of a browser for the animation scripts in static/js/: the
// elements they look up and change, document, and animate and shown from
// loop.js, replaced so that time is whatever main.go asks for. main.go
// builds the elements from the template's markup (__build), runs the
// script, then calls __frame(t) for each frame and draws what comes back.
"use strict";

const CW = 7, CH = 13; // a character cell in the font main.go draws text with

class El {
  constructor(tag, attrs = {}) {
    this.tagName = tag;
    this.attrs = { ...attrs };
    this.children = [];
    this.parent = null;
    this.style = {};
    this.text = "";
    this.width = 0; // clientWidth, clientHeight: set by main.go
    this.height = 0;
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  get hidden() { return "hidden" in this.attrs; }
  set hidden(v) { if (v) this.attrs.hidden = ""; else delete this.attrs.hidden; }
  get className() { return this.attrs.class || ""; }
  set className(v) { this.attrs.class = v; }
  get textContent() { return this.text; }
  set textContent(v) { this.text = String(v); }
  get clientWidth() { return this.width; }
  get clientHeight() { return this.height; }
  matches(sel) {
    return sel[0] === "." ? this.className.split(/\s+/).includes(sel.slice(1)) : this.tagName === sel;
  }
  querySelector(sel) {
    for (const c of this.children) {
      if (c.matches(sel)) return c;
      const r = c.querySelector(sel);
      if (r) return r;
    }
    return null;
  }
  append(...cs) {
    for (const c of cs) {
      c.parent = this;
      this.children.push(c);
    }
  }
  after(e) {
    const p = this.parent;
    e.parent = p;
    p.children.splice(p.children.indexOf(this) + 1, 0, e);
  }
  remove() {
    if (!this.parent) return;
    const p = this.parent.children;
    p.splice(p.indexOf(this), 1);
    this.parent = null;
  }
  // Text is CW by CH a character: what shapes.js measures its probe with.
  getBoundingClientRect() {
    const lines = this.text.split("\n");
    return { width: Math.max(...lines.map((l) => l.length)) * CW, height: lines.length * CH };
  }
}

const root = new El("body");
const later = [];
const document = {
  documentElement: { dataset: {} },
  getElementById(id) {
    const find = (e) => {
      if (e.attrs.id === id) return e;
      for (const c of e.children) {
        const r = find(c);
        if (r) return r;
      }
      return null;
    };
    return find(root);
  },
  createElement: (tag) => new El(tag),
  createElementNS: (ns, tag) => new El(tag),
  fonts: { ready: { then: (f) => later.push(f) } },
};
class ResizeObserver { observe() {} }
// Tasks (mandelbrot.js traces its curves in them) all run before the first
// frame: there's no hurry here.
function setTimeout(f) { later.push(f); }

let anim = null;
function animate(el, key, draw, { start = 0 } = {}) {
  el.removeAttribute("hidden");
  anim = { el, draw, start };
  draw(start);
  return () => {};
}
function shown() { return true; }

// main.go's side.
function __build(json, width, height) {
  const make = (n) => {
    const e = new El(n.tag, n.attrs);
    e.width = width;
    e.height = height;
    for (const c of n.children || []) e.append(make(c));
    return e;
  };
  root.append(make(JSON.parse(json)));
}
function __ready() {
  while (later.length) later.shift()();
}
function __start() { return anim.start; }
function __frame(t) {
  anim.draw(t);
  const dump = (e) => ({ tag: e.tagName, attrs: e.attrs, style: e.style, text: e.text, children: e.children.map(dump) });
  return JSON.stringify(dump(anim.el));
}
