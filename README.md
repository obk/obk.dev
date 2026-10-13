# obk.dev

Personal site. Static, with a little JavaScript: the two animations and the
contents highlight. One Go program turns Markdown into HTML:
`content/` + `templates/` + `static/` -> `public/`.

    go run .                  # build into public/
    go run . -serve :8000     # build, then serve on http://localhost:8000

The server doesn't watch files: Ctrl+C and rerun to rebuild.

Deploys on push to GitHub: Cloudflare Pages (project `obk-dev`) builds it
with its Git integration. Settings: build command `go run .`, output
directory `public`, and environment variable `GO_VERSION` set to the Go in
`go.mod` (1.24 or newer). The build needs the internet, to fetch the fonts.

## Layout

    main.go      the generator: Markdown, sidenotes, contents, feed, 404
    fonts.go     fetches the fonts from Google Fonts into public/fonts/
    content/     about.md, contact.md, posts/*.md
    templates/   base.html wraps every page; one template per page type
    static/      copied as-is: css/site.css, js/ (loop + 5 animations, toc), images/,
                 public.asc (pgp key), _redirects (old /archive/ -> /writings/)

| url                          | source                                | template       |
|------------------------------|---------------------------------------|----------------|
| `/`                          | `about.md`                            | `index.html`   |
| `/posts/<slug>/`             | `posts/<slug>.md`                     | `post.html`    |
| `/writings/`                 | all `posts/*.md`, grouped by year     | `writings.html`|
| `/feed.xml`                  | all `posts/*.md`, full text (RSS 2.0) | (in `main.go`) |
| `/about/`                    | `about.md`                            | `page.html`    |
| `/contact/`                  | `contact.md`                          | `page.html`    |
| `/404.html`                  | (none)                                | `404.html`     |

No header or nav; about and contact have no title either. Home and contact
are centered in the window, with an animation on top, picked by `animation`
in `main.go`: `shapes`, `curve`, `cycloid`, `mandelbrot` or
`cycloid-horizontal` (each `static/js/<name>.js`, all run by
`static/js/loop.js`). Home is that, the about text, and two links side by
side: Contact (scm, email, pgp) and Writings (all posts by year). Pages end
with a back link one level up (`Up` in `main.go`): a post goes to writings;
writings, about and contact go home. Home and 404 have none.

Cloudflare Pages serves `404.html` for any missing path; `-serve` does the
same locally.

## Writing a post

Add `content/posts/<slug>.md`; the file name becomes the URL.

    ---
    title: Post title
    description: Optional. Subtitle, meta description, feed summary.
    date: 01-10-2026   # DD-MM-YYYY, optional
    ---

- No `date:` -> the file's first git commit date, else its mtime. That needs
  full git history in CI, so set `date:` to be safe.
- GFM Markdown (tables, strikethrough, task lists, autolinks); raw HTML is
  allowed. No smart quotes: type real quotes and dashes.
- `##` headings get ids (`/posts/<slug>/#heading`). Two or more add a
  Contents list: a left sidebar at 90rem+, a list under the date below that.
- Sidenotes: `{sn|text}` numbered, `{mn|text}` unnumbered. Markdown works
  inside; `}` ends the note; ignored inside code. In the margin at 88rem+,
  click-to-open below that.

## Style

All in `static/css/site.css`, in sections: fonts, colors, base, content,
sidenotes, contents, pages, reduced motion. Ivory paper and slate ink, after
darioamodei.com.

- Fonts: `textFont` and `monoFont` in `main.go`, by their Google Fonts
  name (now Newsreader and IBM Plex Mono). The build downloads them into
  `public/fonts/` and writes `css/fonts.css` (`--font-text`, `--font-mono`),
  so visitors never contact Google. Variable fonts come whole; static ones
  with the weights the CSS uses. Latin and latin-ext only. Downloads are
  cached in `.cache/fonts/`; delete it to fetch afresh.
- Dark mode follows the OS, no toggle. Body weight drops to 370 and `<img>`
  SVGs are inverted.
- Animations (`animation` in `main.go`):
  - shapes: donut, cube, octahedron, Menger sponge, dodecahedron, gyroid,
    Hopf link in ASCII; each character raymarches a signed distance field,
    and a morph blends two fields.
  - curve: a dot stretches into a line that opens into Lissajous 1:2, then
    loops through Lissajous figures and roses; every curve has the same
    1200 points, so a morph blends point to point.
  - cycloid: a circle rolls round a fixed one and its pen draws cardioid,
    nephroid, a 3-cusped epicycloid, deltoid, astroid, a 5-cusped
    hypocycloid.
  - mandelbrot: the lemniscates |z_n(c)| = 2 for n = 2 ... 10 and back,
    closing in on the set's boundary. Each is traced once at load, by
    following z_n(c) = 2·e^(i·2^(n-1)·θ) round in small steps; θ is the same
    on every curve, so morphs move each point a short way.
  - cycloid-horizontal: a circle rolls along a line; every 2.5 s its pen
    slides along the spoke, from the rim (cycloid) to inside (curtate) to
    outside (prolate, with loops). The trail keeps the shape it was drawn
    with and runs off to the left; the line fades at both ends.
  - All but shapes start as a dot. `loop.js` pauses them off screen, shows
    a still frame under reduced motion, and carries the time between
    pages; without JavaScript they're hidden.
- Home to contact is seamless: the animation sits at the same height on
  both, the time carries over in sessionStorage (if the next page loads
  within 5 s), and a view transition crossfades the text (Chrome, Safari).
  `scrollbar-gutter: stable` keeps pages from shifting sideways.
- Code: 0.84em, no ligatures, tab = 4, no syntax highlighting.
- The contents ×/☰ button is a checkbox + label. The section being read is
  highlighted by `static/js/toc.js` (sidebar only; without JavaScript,
  nothing is highlighted).

## Gotchas

- Front matter dates are DD-MM-YYYY. Lists show `05-10-2026`; page stamps
  show "5 October 2026".
- Hard-refresh (Ctrl+Shift+R) after CSS changes.
