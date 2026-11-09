// Command site builds obk.dev, a small static site: each content/<name>.md,
// rendered into templates/page.html with templates/style.css inlined,
// becomes public/<name>/index.html (index.md becomes public/index.html),
// next to a copy of static/. Each content/posts/<slug>.md, with a date,
// becomes /posts/<slug>/; content/posts.md lists them by year, and
// /feed.xml carries them whole.
//
//	go run .               build into public/
//	go run . -serve :8080  build, then serve public/ for a look
package main

import (
	"bytes"
	_ "embed"
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	texttemplate "text/template"
	"time"

	chromahtml "github.com/alecthomas/chroma/v2/formatters/html"
	"github.com/yuin/goldmark"
	highlighting "github.com/yuin/goldmark-highlighting/v2"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

var (
	//go:embed templates/page.html
	pageHTML string

	//go:embed templates/style.css
	styleCSS string

	//go:embed templates/feed.xml
	feedXML string

	page = template.Must(template.New("page").Parse(pageHTML))

	// The list of posts under content/posts.md: by year, newest first.
	postList = template.Must(template.New("posts").Parse(`{{range .}}<h2>{{.Year}}</h2>
<dl>
{{range .Posts}}<dt><time datetime="{{.DateTime}}">{{.Date "2 Jan"}}</time></dt>
<dd><a href="{{.Path}}">{{.Title}}</a>{{with .Description}}<span class="desc">{{.}}</span>{{end}}</dd>
{{end}}</dl>
{{end}}`))

	feed = texttemplate.Must(texttemplate.New("feed").Funcs(texttemplate.FuncMap{
		"xml": template.HTMLEscapeString,
		// cdata keeps a post's body from closing its CDATA section early.
		"cdata": func(s string) string { return strings.ReplaceAll(s, "]]>", "]]]]><![CDATA[>") },
	}).Parse(feedXML))

	// GFM for tables, task lists and strikethrough; definition lists for
	// label-value pairs; code coloured at build time as CSS classes; ids on
	// headings for the contents list. Raw HTML is let through, for figures
	// and the notes below: the content is the site's own.
	md = goldmark.New(
		goldmark.WithExtensions(extension.GFM, extension.DefinitionList,
			highlighting.NewHighlighting(highlighting.WithFormatOptions(chromahtml.WithClasses(true)))),
		goldmark.WithParserOptions(parser.WithAutoHeadingID()),
		goldmark.WithRendererOptions(html.WithUnsafe()))
)

// A source is one Markdown file, split into its front matter and body.
type source struct {
	name string // the file's name without .md: "index", "projects", "posts/hello"
	meta map[string]string
	text string
	date time.Time // a post's date; zero for the other pages
	body string    // the rendered HTML
}

func (s source) post() bool { return !s.date.IsZero() }

// path is where the page lives on the site: "/" for index, "/<name>/" else.
func (s source) path() string {
	if s.name == "index" {
		return "/"
	}
	return "/" + s.name + "/"
}

// A link is one entry in the menu at the top of every page.
type link struct {
	Label, Href string
	Current     bool
}

// An entry is a post as the list and the feed see it.
type entry struct {
	Title, Description, Path, Body string
	Time                           time.Time
}

func (e entry) Date(layout string) string { return e.Time.Format(layout) }
func (e entry) DateTime() string          { return e.Time.Format(time.DateOnly) }

// A year is the posts of one year, for the list.
type year struct {
	Year  int
	Posts []entry
}

// A heading is one ## in a post, for its contents list.
type heading struct {
	ID   string
	Text template.HTML
}

func main() {
	src := flag.String("src", "content", "the folder of Markdown pages")
	out := flag.String("out", "public", "the output directory, emptied first")
	serve := flag.String("serve", "", "after building, serve -out at this address, like :8080")
	flag.Parse()

	n, err := build(*src, *out)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("built %d pages into %s", n, *out)

	if *serve != "" {
		log.Printf("serving %s at http://localhost%s", *out, *serve)
		log.Fatal(http.ListenAndServe(*serve, http.FileServer(http.Dir(*out))))
	}
}

func build(src, out string) (int, error) {
	// out is emptied first, so it must not hold the sources.
	if within(src, out) || within("static", out) {
		return 0, fmt.Errorf("-out %s would delete the sources in %s or static", out, src)
	}
	pages, err := read(src)
	if err != nil {
		return 0, err
	}
	for i := range pages {
		var body bytes.Buffer
		if err := md.Convert([]byte(notes(pages[i].text)), &body); err != nil {
			return 0, fmt.Errorf("%s: %w", pages[i].name, err)
		}
		pages[i].body = body.String()
	}
	posts := entries(pages)

	if err := os.RemoveAll(out); err != nil {
		return 0, err
	}
	if err := os.CopyFS(out, os.DirFS("static")); err != nil {
		return 0, err
	}

	for _, p := range pages {
		body := p.body
		if p.name == "posts" {
			var list bytes.Buffer
			if err := postList.Execute(&list, byYear(posts)); err != nil {
				return 0, err
			}
			body += list.String()
		}

		if strings.Contains(body, filmsMark) {
			body = strings.Replace(body, filmsMark, films(out, 10), 1)
		}

		data := map[string]any{
			"Name":        p.name,
			"Title":       p.meta["title"],
			"Description": p.meta["description"],
			"URL":         p.meta["url"],
			"Menu":        menu(pages, p),
			"Style":       template.CSS(styleCSS),
			"Body":        template.HTML(body),
		}
		if p.post() {
			data["Name"] = "post"
			data["Post"] = true
			data["Date"] = p.date.Format("2 January 2006")
			data["DateTime"] = p.date.Format(time.DateOnly)
			data["Contents"] = contents(p.body)
		}

		var html bytes.Buffer
		if err := page.Execute(&html, data); err != nil {
			return 0, err
		}
		dir := filepath.Join(out, filepath.FromSlash(p.path()))
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return 0, err
		}
		if err := os.WriteFile(filepath.Join(dir, "index.html"), html.Bytes(), 0o644); err != nil {
			return 0, err
		}
	}

	if err := writeFeed(filepath.Join(out, "feed.xml"), pages, posts); err != nil {
		return 0, err
	}
	return len(pages), nil
}

// entries gives the posts, newest first.
func entries(pages []source) []entry {
	var list []entry
	for _, p := range pages {
		if p.post() {
			list = append(list, entry{p.meta["title"], p.meta["description"], p.path(), p.body, p.date})
		}
	}
	slices.SortStableFunc(list, func(a, b entry) int { return b.Time.Compare(a.Time) })
	return list
}

// byYear groups posts, newest first already, by the year they were written.
func byYear(posts []entry) []year {
	var years []year
	for _, p := range posts {
		if len(years) == 0 || years[len(years)-1].Year != p.Time.Year() {
			years = append(years, year{Year: p.Time.Year()})
		}
		years[len(years)-1].Posts = append(years[len(years)-1].Posts, p)
	}
	return years
}

var (
	h2   = regexp.MustCompile(`<h2 id="([^"]+)">(.*?)</h2>`)
	tags = regexp.MustCompile(`<[^>]+>`)
)

// contents lists a post's ## headings. A post with fewer than two gets none.
func contents(body string) []heading {
	var list []heading
	for _, m := range h2.FindAllStringSubmatch(body, -1) {
		list = append(list, heading{m[1], template.HTML(tags.ReplaceAllString(m[2], ""))})
	}
	if len(list) < 2 {
		return nil
	}
	return list
}

// Code, fenced or inline, is matched first so that it's left alone; then
// the note markers.
var noteMarks = regexp.MustCompile("(?s)```.*?```|`[^`\n]*`|" + `\{(sn|mn)\|([^}]*)\}`)

// notes turns {sn|text} into a numbered sidenote and {mn|text} into an
// unnumbered margin note: in the margin on a wide screen, opened in place
// by a tap on a narrow one, with a checkbox rather than a script.
func notes(src string) string {
	n := 0
	return noteMarks.ReplaceAllStringFunc(src, func(m string) string {
		if m[0] == '`' {
			return m
		}
		n++
		g := noteMarks.FindStringSubmatch(m)
		id := fmt.Sprintf("%s-%d", g[1], n)
		label, toggle, class := "&#8853;", "margin-toggle", "marginnote"
		if g[1] == "sn" {
			label, toggle, class = "", "margin-toggle sidenote-number", "sidenote"
		}
		return fmt.Sprintf(`<label for="%s" class="%s">%s</label><input type="checkbox" id="%s" class="margin-toggle"><span class="%s">%s</span>`,
			id, toggle, label, id, class, g[2])
	})
}

// writeFeed writes the RSS feed of every post, whole, with links made
// absolute against the home page's url.
func writeFeed(path string, pages []source, posts []entry) error {
	var home source
	for _, p := range pages {
		if p.name == "index" {
			home = p
		}
	}
	site := strings.TrimRight(home.meta["url"], "/")
	if site == "" {
		return fmt.Errorf("index.md needs a url for the feed")
	}
	for i, p := range posts {
		b := strings.ReplaceAll(p.Body, `href="/`, `href="`+site+`/`)
		posts[i].Body = strings.ReplaceAll(b, `src="/`, `src="`+site+`/`)
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return feed.Execute(f, map[string]any{
		"Title":       home.meta["title"],
		"Description": home.meta["description"],
		"URL":         site,
		"Posts":       posts,
	})
}

// read loads every .md file in dir and in dir/posts, index first, the rest
// by name. A post must have a date, as YYYY-MM-DD.
func read(dir string) ([]source, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.md"))
	if err != nil {
		return nil, err
	}
	postFiles, err := filepath.Glob(filepath.Join(dir, "posts", "*.md"))
	if err != nil {
		return nil, err
	}
	var pages []source
	for _, f := range append(files, postFiles...) {
		raw, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		meta, text := frontMatter(strings.ReplaceAll(string(raw), "\r\n", "\n"))
		if meta["title"] == "" {
			return nil, fmt.Errorf("%s: no title in its front matter", f)
		}
		p := source{name: strings.TrimSuffix(filepath.Base(f), ".md"), meta: meta, text: text}
		if filepath.Base(filepath.Dir(f)) == "posts" {
			p.name = "posts/" + p.name
			if p.date, err = time.Parse(time.DateOnly, meta["date"]); err != nil {
				return nil, fmt.Errorf("%s: a post needs a date like 2026-11-04: %w", f, err)
			}
		}
		pages = append(pages, p)
	}
	slices.SortFunc(pages, func(a, b source) int {
		switch {
		case a.name == b.name:
			return 0
		case a.name == "index":
			return -1
		case b.name == "index":
			return 1
		}
		return strings.Compare(a.name, b.name)
	})
	return pages, nil
}

// menu lists the pages that name themselves in the menu ("menu: label" in
// their front matter), by their "order: n", marking the one being built. A
// post marks posts.
func menu(pages []source, current source) []link {
	var in []source
	for _, p := range pages {
		if p.meta["menu"] != "" {
			in = append(in, p)
		}
	}
	slices.SortStableFunc(in, func(a, b source) int {
		x, _ := strconv.Atoi(a.meta["order"])
		y, _ := strconv.Atoi(b.meta["order"])
		return x - y
	})
	var links []link
	for _, p := range in {
		here := p.name == current.name || (p.name == "posts" && current.post())
		links = append(links, link{p.meta["menu"], p.path(), here})
	}
	return links
}

// within reports whether path is dir or inside it.
func within(path, dir string) bool {
	p, err1 := filepath.Abs(path)
	d, err2 := filepath.Abs(dir)
	if err1 != nil || err2 != nil {
		return true // can't tell, so don't risk it
	}
	rel, err := filepath.Rel(d, p)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

// frontMatter splits "key: value" lines between two "---" lines off the top
// of src. Without them, all of src is the body.
func frontMatter(src string) (meta map[string]string, body string) {
	meta = map[string]string{}
	rest, ok := strings.CutPrefix(src, "---\n")
	if !ok {
		return meta, src
	}
	// The closing line may end the file, and the front matter may be empty.
	rest = "\n" + rest
	head, body, ok := strings.Cut(rest, "\n---\n")
	if !ok {
		head, ok = strings.CutSuffix(rest, "\n---")
		if !ok {
			return meta, src
		}
	}
	for _, line := range strings.Split(head, "\n") {
		if k, v, ok := strings.Cut(line, ":"); ok {
			meta[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	}
	return meta, body
}
