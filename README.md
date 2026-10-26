# obk.dev

The source of [obk.dev](https://obk.dev): one page, Markdown in, static
HTML out, no JavaScript. `main.go` reads `content/index.md`, renders it
with [goldmark](https://github.com/yuin/goldmark) into
`templates/page.html`, inlines `templates/style.css`, and writes the site
to `public/`, next to a copy of `static/`. With [Go](https://go.dev/dl/)
1.23 or newer:

    go run .               # build into public/
    go run . -serve :8080  # build, then serve public/ on localhost:8080

`-serve` builds once, so run it again after a change. `-src` and `-out`
point it at another Markdown file or output folder.

    content/
      index.md        the page's words: its title, description and address
                      on top, then the bio and the contact list
    templates/
      page.html       the HTML around them, with the name drawn in SVG
      style.css       the design, inlined into the page
    static/           copied into public/ as is
      favicon.ico     the icon
      public.asc      the PGP key, linked from the contact list
      fonts/          Jost, the only font, with its license
    main.go           the build: front matter, Markdown, template, copy
    public/           the site, built; not committed

## Editing the page

`content/index.md` opens with `key: value` lines between two `---` lines:

    ---
    title: obk
    description: notes on systems, tooling, building, learning, and navigating in life.
    url: https://obk.dev/
    ---

`title` is the tab's title, `description` the summary search engines and
link previews show, and `url` the page's canonical address. Under them is
Markdown. Each contact entry is a definition list: the label on its own
line, then a `: ` line for each link, and a blank line before the next:

    scm
    : [github.com/obk](https://github.com/obk)

    email
    : [obkdev@pm.me](mailto:obkdev@pm.me)

The page shows everything in lowercase, however it's typed.

## Design

Bauhaus. The name is drawn rather than typed: Kandinsky's three shapes
in the colours he gave them, a blue circle for the o, a red square for
the b and a yellow triangle for the k, the b and k on black stems, all
standing on a black base as heavy as a stem. It's an SVG in
`templates/page.html`, so it reads "obk" whatever `title` says.
Everything else is set in [Jost](https://fonts.google.com/specimen/Jost),
a geometric sans after Futura, in lowercase as the Bauhaus printed from
1925, on one column 44rem wide, centred both ways.

The colours are
[Hue Atlas's Bauhaus palette](https://hueatlas.com/color-palettes/bauhaus-color-palette/):

| Colour         | Hex       | Used for                      |
| -------------- | --------- | ----------------------------- |
| Studio White   | `#F5F2E8` | the ground                    |
| Bauhaus Black  | `#1A1A18` | text, stems and the base      |
| Bauhaus Blue   | `#1E3878` | the circle, the focus ring    |
| Bauhaus Red    | `#C8302A` | the square, links pointed at  |
| Bauhaus Yellow | `#E8C018` | the triangle, selected text   |

Dark mode follows the system: black and white swap places. Two things
change so the page stays readable on black. The blue lifts to `#5878BE`,
the same hue and chroma at OKLCH lightness 0.58 rather than 0.36, or the
circle would all but vanish. And links turn yellow when pointed at, as
red text on black is too faint; so does the focus ring.

## Deploy

GitHub Pages builds this repository on every push to main, with
`.github/workflows/pages.yml`: it runs `go run .` with the Go version in
`go.mod` and publishes `public/`. It also copies `index.html` to
`404.html`, so every unknown path, old links like `/contact/` among them,
gets the page itself.

## License

[MIT](LICENSE), except the font: Jost, in `static/fonts/`, is under the
[SIL Open Font License 1.1](static/fonts/OFL.txt).
