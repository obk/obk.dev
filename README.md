# obk.dev

The source of [obk.dev](https://obk.dev): a small personal site with essays,
built by one Go program. Markdown in, static HTML out, no framework, no
Node. A mathematical animation on the home page (ASCII shapes, Lissajous
figures, cycloids, the Mandelbrot set's boundary), Tufte-style sidenotes in
posts, an RSS feed, dark mode, and self-hosted fonts from Google Fonts.

Feel free to copy it and make it yours: the code is free software under the
GPL v3, the writing and images CC BY-SA 4.0 (see [License](#license)).

## Make it yours

You need [Go](https://go.dev/dl/) 1.24 or newer.

1. Fork or clone this repository.
2. Edit `config.toml`: the site's name, URL, description, the animation,
   fonts, and analytics (or none).
3. Replace what's personal:
   - `content/about.md`: the text on the home page (and `/about/`).
   - `content/contact.md`: the contact page.
   - `content/posts/`: delete `hello-world.md`, add your own (see below).
   - `static/public.asc`: a PGP public key, linked from the contact page.
     Replace or delete it.
   - `static/images/favicon.ico`: the browser tab icon.
   - `static/_redirects`: redirects old links (Cloudflare Pages format);
     delete it if you have none.
4. Build and look:

       go run .                  # build into public/
       go run . -serve :8000     # build, then serve on http://localhost:8000

   The server doesn't watch files: Ctrl+C and run it again after a change.
   The first build downloads the fonts, so it needs the internet; they're
   cached in `.cache/fonts/` after that.

## Deploy

`public/` is the whole site: upload it to any static host.

This one is on Cloudflare Pages, built from GitHub on every push. In the
project's build settings: build command `go run .`, output directory
`public`, and environment variable `GO_VERSION` set to `1.24` or newer.
Cloudflare Pages serves `404.html` for any missing path; `-serve` does the
same locally.

## Writing a post

Add `content/posts/<slug>.md`; the file name becomes the URL.

    ---
    title: Post title
    description: Optional. Subtitle, meta description, feed summary.
    date: 01-10-2026   # DD-MM-YYYY, optional
    ---

- No `date:`: the file's first git commit date, else its modification time.
  That needs full git history where you build, so set `date:` to be safe.
- GitHub-flavored Markdown (tables, strikethrough, task lists, autolinks);
  raw HTML is allowed. No smart quotes: type real quotes and dashes.
- `##` headings get ids (`/posts/<slug>/#heading`). Two or more add a
  contents list: a sidebar on wide screens that follows your reading, a
  list under the date on narrow ones.
- Sidenotes: `{sn|text}` numbered, `{mn|text}` unnumbered. Markdown works
  inside; `}` ends the note; ignored inside code. In the margin on wide
  screens, opened with a click on narrow ones.
- Posts keep their own capitalization; the rest of the site is lowercase.

## How it's put together

    config.toml  settings
    main.go      the generator: Markdown, sidenotes, contents, feed, pages
    fonts.go     downloads the fonts from Google Fonts at build time
    content/     about.md, contact.md, posts/*.md
    templates/   base.html wraps every page; one template per page type
    static/      copied as-is: css/site.css, js/, images/, public.asc

| url               | source                                | template        |
|-------------------|---------------------------------------|-----------------|
| `/`               | `about.md`                            | `index.html`    |
| `/posts/<slug>/`  | `posts/<slug>.md`                     | `post.html`     |
| `/writings/`      | all posts, grouped by year            | `writings.html` |
| `/feed.xml`       | all posts, full text (RSS 2.0)        | (in `main.go`)  |
| `/about/`         | `about.md`                            | `page.html`     |
| `/contact/`       | `contact.md`                          | `page.html`     |
| `/404.html`       | (none)                                | `404.html`      |

There's no header or nav. Home is the animation, the about text, and links
to contact and writings; every other page ends with a link one level up
(a post to writings; writings, about and contact to home).

### Animations

Set `animation` in `config.toml`. Each is one script in `static/js/`, all
run by `loop.js`, which pauses them off screen, shows a still frame to
people who ask for reduced motion, and carries the animation over from
home to contact so it doesn't restart. Without JavaScript they're hidden;
the site works without it.

- `shapes`: a donut, cube, octahedron, Menger sponge, dodecahedron, gyroid
  and Hopf link in ASCII, after donut.c. Each character raymarches a signed
  distance field; a morph blends two fields, so shapes melt into each other.
- `curve`: a dot stretches into a line that opens into a Lissajous figure,
  then loops through Lissajous figures and rose curves. Every curve has the
  same 1200 points, so a morph moves each point to its partner.
- `cycloid`: a circle rolls round a fixed one and its pen draws a cardioid,
  nephroid, epicycloid, deltoid, astroid and hypocycloid.
- `mandelbrot`: the curves |z_n(c)| = 2 for n = 2 to 10 and back, closing in
  on the Mandelbrot set's boundary. Each is traced in the browser by
  following z_n(c) = 2·e^(i·2^(n-1)·θ) round in small steps; θ is the same
  "external angle" on every curve, so a morph moves each point a short way.
- `cycloid-horizontal`: a circle rolls along a line, end to end and back,
  never stopping; around each turn its pen slides along the spoke, drawing
  normal, curtate and prolate (looped) cycloids.
- `medley`: `curve`, `cycloid` and `cycloid-horizontal` as one, with one
  line throughout. The last rose becomes a cardioid as the circles fade in;
  later the fixed circle unrolls into a line and the curve into the trail
  of a circle rolling along it (a cycloid is an epicycloid round an
  infinitely large circle); then the trail closes back into the first
  Lissajous figure. Every change blends the same points, so nothing cuts.
- `ford`: Ford circles. Over every fraction p/q between 0 and 1, in lowest
  terms, a circle of radius 1/(2q²) resting on a line; no two overlap, and
  neighbours in a Farey sequence touch. The two big ones over 0 and 1 rise
  first, then each denominator up to 20, smaller and quicker; they hold,
  then sink back, smallest first.
- `random`: one of these, picked once per visit and kept from page to page;
  a return visit gets a different one.
- `custom`: like `random`, but only from the ones listed in `custom`, e.g.
  `custom = ["curve", "cycloid", "ford"]`.

### Style

All in `static/css/site.css`: ivory paper and slate ink, after
darioamodei.com. Dark mode follows the system (no toggle). Fonts are
Newsreader for text and IBM Plex Mono for code, set in `config.toml`; the
build downloads them from Google Fonts with only the Latin character sets,
so pages load them from the site itself. Hard-refresh (Ctrl+Shift+R) after
changing CSS.

## License

- The code: [GNU GPL v3](LICENSE). Use it, change it, run your own site
  with it; if you share a changed version, share its source under the GPL
  too.
- The writing in `content/` and the images in `static/images/`:
  [CC BY-SA 4.0](LICENSE-CONTENT). Share and adapt them with credit, under
  the same license. If you copy the site, replace them with your own; your
  content's license is `[license]` in `config.toml`, shown under each post
  and in the feed.
- The fonts aren't in this repository; they're downloaded at build time and
  carry their own licenses (both defaults are under the SIL Open Font
  License).

The code's notice:

    obk.dev, a small static site generator and its animations.
    Copyright (C) 2026 obk

    This program is free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your
    option) any later version.

    This program is distributed in the hope that it will be useful, but
    WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
    Public License for more details.
