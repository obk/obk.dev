# obk.dev

Personal site. Static, with a little JavaScript: the shapes animation and
the contents highlight. One Go program turns Markdown into HTML:
`content/` + `templates/` + `static/` -> `public/`.

    go run .                  # build into public/
    go run . -serve :8000     # build, then serve on http://localhost:8000

The server doesn't watch files: Ctrl+C and rerun to rebuild.

Deploys on push: `.build.yml` (builds.sr.ht) runs `go run .` and uploads
`public/` to Cloudflare Pages (project `obk-dev`) with wrangler.

## Layout

    main.go      the generator: Markdown, sidenotes, contents, feed, 404
    content/     about.md, contact.md, posts/*.md
    templates/   base.html wraps every page; one template per page type
    static/      copied as-is: css/site.css, js/ (shapes, toc), fonts/, images/,
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

No header or nav; about and contact have no title either. Home is spinning
ASCII shapes (`static/js/shapes.js`), the about text, and two links side by
side: Contact (scm, email, pgp, with the shapes on top too) and Writings (all
posts by year). Pages end with a back link one level up
(`Up` in `main.go`): a post goes to writings; writings, about and contact go
home. Home and 404 have none.

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

- Newsreader for text, IBM Plex Mono for code; self-hosted (OFL), split into
  latin and latin-ext subsets.
- Dark mode follows the OS, no toggle. Body weight drops to 370 and `<img>`
  SVGs are inverted.
- Home animation: donut, cube, octahedron, Menger sponge, dodecahedron,
  gyroid, Hopf link. Each character raymarches a signed distance field; a
  morph blends two fields, so shapes melt into each other. Pauses off screen,
  static under reduced motion, hidden without JavaScript.
- Code: 0.84em, no ligatures, tab = 4, no syntax highlighting.
- The contents ×/☰ button is a checkbox + label. The section being read is
  highlighted by `static/js/toc.js` (sidebar only; without JavaScript,
  nothing is highlighted).

## Gotchas

- Front matter dates are DD-MM-YYYY. Lists show `05-10-2026`; page stamps
  show "5 October 2026".
- Hard-refresh (Ctrl+Shift+R) after CSS changes.
