# obk.dev

The source of [obk.dev](https://obk.dev): a few pages and posts, Markdown in, static
HTML out, no JavaScript. `main.go` reads every Markdown file in
`content/`, renders each with [goldmark](https://github.com/yuin/goldmark)
into `templates/page.html`, inlines `templates/style.css`, and writes the
site to `public/`, next to a copy of `static/`. With
[Go](https://go.dev/dl/) 1.25 or newer:

    go run .               # build into public/
    go run . -serve :8080  # build, then serve public/ on localhost:8080

`-serve` builds once, so run it again after a change. `-src` and `-out`
point it at another content folder or output folder; the output
folder is emptied first, so the build refuses one that holds `content/`
or `static/`.

    content/
      index.md        home, at /: the bio and the contact list
      projects.md     /projects/: the projects, in lists by kind
      now.md          /now/: what i'm doing now
      uses.md         /uses/: the software i work with
      posts.md        /posts/: the list of posts, filled in by the build
      posts/          one Markdown file per post, at /posts/<name>/
    templates/
      page.html       the HTML around each page: the menu, a post's parts
      feed.xml        the RSS feed
      style.css       the design, inlined into every page
    static/           copied into public/ as is
      favicon.svg     the icon
      favicon.ico     the same, drawn from favicon.svg, for browsers
                      without SVG icons
      public.asc      the PGP key, linked from the contact list
      fonts/          Inter and IBM Plex Mono, Latin only, with their licenses
    main.go           the build: front matter, Markdown, posts, template, copy
    public/           the site, built; not committed

## Editing the pages

`content/index.md` becomes `/`, and any other `content/<name>.md` becomes
`/<name>/`. Each opens with `key: value` lines between two `---` lines:

    ---
    title: obk
    description: notes on systems, tooling, building, learning, and navigating in life.
    url: https://obk.dev/
    menu: home
    order: 1
    ---

`title` is the tab's title, `description` the summary search engines and
link previews show, `url` the page's canonical address, and `menu` its
name in the menu at the top of every page; a page without `menu` is left
out of it. `order: n` places it there, smallest first: home, posts,
projects, uses, now.

Under them is Markdown. A page opens with a paragraph; the part of it
in `*emphasis*` is shown in grey. Rows, the contact list and the
projects alike, are definition lists: the label on its own line, then a
`: ` line for each value, and a blank line before the next:

    email
    : [obkdev@pm.me](mailto:obkdev@pm.me)

    [canopy](https://github.com/obk/canopy)
    : a read-only web viewer for git repositories: ...

A `## ` heading above a list names it, in grey. The pages show their
text in lowercase, however it's typed; `title` and `description` reach
tabs and link previews as written, so write them lowercase too.
A page without a `title` stops the build.

## Writing a post

Add `content/posts/<name>.md`; it becomes `/posts/<name>/`. Its front
matter needs a `date` as well as a `title`, or the build stops:

    ---
    title: hello
    date: 2026-11-04
    description: the first post on obk.dev.
    url: https://obk.dev/posts/hello/
    ---

A post has a link back to `/posts/`, its title, its `description` as a
grey line under it, and "written on" with the date at the foot.
`/posts/` lists every post by year, newest first, each with its
description, under whatever `content/posts.md` says; `/feed.xml` is an
RSS feed of them all, whole, with links made absolute against
`index.md`'s `url`.

Posts take, after simple-site-generator:

- GitHub's Markdown: tables, task lists (`- [x]`), `~~strikethrough~~`,
  and raw HTML, for `<figure>` and a quote with a `<footer>`.
- Code in fenced blocks, coloured at build time in grey alone:
  keywords bold, comments and strings grey.
- `{sn|text}` for a numbered sidenote, `{mn|text}` for an unnumbered
  margin note. From 75rem wide they sit in the right margin; narrower,
  a tap on the number or ⊕ opens them in place (a checkbox, no script).
- A contents list of the `## ` headings, once there are two: at the
  top, or in the left margin from 75rem, following the scroll.

`content/posts/hello.md` shows all of it.

## Design

As little as reads well: one narrow column, black on white (or white on
black, following the system), grey for the quieter half, plain
underlined links. No animation, no JavaScript.

Text is set in [Inter](https://rsms.me/inter/), code in
[IBM Plex Mono](https://www.ibm.com/plex/), both served by the site
itself from `static/fonts/`, in Google Fonts' Latin subset: Inter
variable, upright and italic (about 50 KB each, the italic loaded only
where a post uses it), and Plex Mono regular, italic and semibold
(about 15 KB each, loaded only on pages with code). A character
outside the subset, like ← or ⊕, comes from the system's fonts.

## Deploy

GitHub Pages builds this repository on every push to main, with
`.github/workflows/pages.yml`: it runs `go run .` with the Go version in
`go.mod` and publishes `public/`. It also copies `index.html` to
`404.html`, so every unknown path, old links like `/contact/` among them,
gets the home page.

## License

[MIT](LICENSE), except the fonts in `static/fonts/`, which are under the
SIL Open Font License 1.1: [Inter](static/fonts/OFL-inter.txt) and
[IBM Plex Mono](static/fonts/OFL-ibm-plex-mono.txt).
