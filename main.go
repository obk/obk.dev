// Tiny static site generator: content/ + templates/ + static/ -> public/
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"flag"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/BurntSushi/toml"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

type Post struct {
	Title, Description, Slug string
	Time                     time.Time
	Body                     template.HTML
	TOC                      []Heading
}

// Heading is a level-2 heading, listed in a post's table of contents.
type Heading struct {
	ID   string
	Text template.HTML
}

func (p Post) Year() int        { return p.Time.Year() }
func (p Post) Date() string     { return p.Time.Format("02-01-2006") }
func (p Post) LongDate() string { return strings.ToLower(p.Time.Format("2 January 2006")) }

// Year groups the posts published in one year.
type Year struct {
	Year  int
	Posts []Post
}

// Config is config.toml, the site's settings; see there.
type Config struct {
	Title       string `toml:"title"`
	URL         string `toml:"url"`
	Description string `toml:"description"`
	Animation   string `toml:"animation"`
	GoatCounter string `toml:"goatcounter"`
	Fonts       struct {
		Text string `toml:"text"`
		Mono string `toml:"mono"`
	} `toml:"fonts"`
	License struct {
		Name string `toml:"name"`
		URL  string `toml:"url"`
	} `toml:"license"`
}

// The animations config.toml can name, besides "random" and "".
var animations = []string{"shapes", "curve", "cycloid", "mandelbrot", "cycloid-horizontal", "medley", "ford"}

// loadConfig reads and checks config.toml.
func loadConfig(path string) *Config {
	var c Config
	md, err := toml.DecodeFile(path, &c)
	if err != nil {
		log.Fatalf("%s: %v", path, err)
	}
	if keys := md.Undecoded(); len(keys) > 0 {
		log.Fatalf("%s: unknown settings %q", path, keys)
	}
	c.URL = strings.TrimSuffix(c.URL, "/")
	assert(c.Title != "" && c.URL != "", "%s: title and url are required", path)
	assert(c.Animation == "" || c.Animation == "random" || slices.Contains(animations, c.Animation),
		"%s: animation is %q, want \"random\", \"\" or one of %q", path, c.Animation, animations)
	assert(c.Fonts.Text != "" && c.Fonts.Mono != "", "%s: [fonts] text and mono are required", path)
	return &c
}

// Link is a link to another page of the site.
type Link struct{ URL, Name string }

// Where each page's back link goes: one level up.
var (
	upHome     = &Link{"/", "home page"}
	upWritings = &Link{"/writings/", "writings"}
)

type Page struct {
	Title, Description string
	Intro              template.HTML
	Years              []Year
	Animation          string   // on top of home and contact (config.toml); "" for none
	Up                 *Link    // the "← back to" link at the bottom; nil for none
	Site               *Config  // set by render: config.toml
	FontPreload        string   // set by render: the font file every page needs first
	Animations         []string // set by render: the animations "random" picks from
	Post
}

// Tufte-style notes: {sn|text} is a numbered sidenote, {mn|text} an
// unnumbered margin note. Both are plain CSS toggles, no JavaScript.
var note = regexp.MustCompile("(?s)```.*?```|`[^`\n]*`|\\{(sn|mn)\\|([^}]*)\\}")

func notes(src string) string {
	n := 0
	return note.ReplaceAllStringFunc(src, func(m string) string {
		g := note.FindStringSubmatch(m)
		if g[1] == "" { // inside a code span
			return m
		}
		n++
		if g[1] == "sn" {
			return fmt.Sprintf(`<label for="n%d" class="margin-toggle sidenote-number"></label><input type="checkbox" id="n%d" class="margin-toggle"/><span class="sidenote">%s</span>`, n, n, g[2])
		}
		return fmt.Sprintf(`<label for="n%d" class="margin-toggle">&#8853;</label><input type="checkbox" id="n%d" class="margin-toggle"/><span class="marginnote">%s</span>`, n, n, g[2])
	})
}

var (
	h2   = regexp.MustCompile(`(?s)<h2 id="([^"]+)">(.*?)</h2>`)
	tags = regexp.MustCompile(`<[^>]*>`)
)

// toc lists the level-2 headings of rendered HTML, with their markup stripped.
func toc(body string) []Heading {
	var hs []Heading
	for _, m := range h2.FindAllStringSubmatch(body, -1) {
		hs = append(hs, Heading{ID: m[1], Text: template.HTML(strings.TrimSpace(tags.ReplaceAllString(m[2], "")))})
	}
	return hs
}

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

// assert stops the build when an invariant doesn't hold.
func assert(ok bool, format string, args ...any) {
	if !ok {
		log.Fatalf("assertion failed: "+format, args...)
	}
}

// maxPosts bounds every loop over the posts.
const maxPosts = 10000

// frontMatter splits a Markdown file into its front matter and body.
func frontMatter(path string) (fm, body string) {
	raw, err := os.ReadFile(path)
	must(err)
	parts := strings.SplitN(strings.ReplaceAll(string(raw), "\r\n", "\n"), "---\n", 3)
	if len(parts) != 3 || parts[0] != "" {
		log.Fatalf("%s: missing front matter", path)
	}
	return parts[1], parts[2]
}

func parse(path string) Post {
	p := Post{Slug: strings.TrimSuffix(filepath.Base(path), ".md")}
	fm, body := frontMatter(path)
	for _, line := range strings.Split(fm, "\n") {
		k, v, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		v = strings.TrimSpace(v)
		switch strings.TrimSpace(k) {
		case "title":
			p.Title = v
		case "description":
			p.Description = v
		case "date":
			t, err := time.Parse("02-01-2006", v)
			must(err)
			p.Time = t
		}
	}
	assert(p.Title != "", "%s: missing title", path)
	// Only posts carry a date; pages (about, contact) don't.
	if p.Time.IsZero() && filepath.Base(filepath.Dir(path)) == "posts" {
		p.Time = fileDate(path)
	}
	var buf bytes.Buffer
	md := goldmark.New(goldmark.WithExtensions(extension.GFM),
		goldmark.WithParserOptions(parser.WithAutoHeadingID()),
		goldmark.WithRendererOptions(html.WithUnsafe()))
	must(md.Convert([]byte(notes(body)), &buf))
	p.Body = template.HTML(buf.String())
	p.TOC = toc(buf.String())
	return p
}

// fileDate returns the date the file was first committed to git, falling back
// to its modification time. Needs full git history (not a shallow clone).
func fileDate(path string) time.Time {
	out, err := exec.Command("git", "log", "--diff-filter=A", "--format=%aI", "--", path).Output()
	if lines := strings.Fields(string(out)); err == nil && len(lines) > 0 {
		if t, err := time.Parse(time.RFC3339, lines[len(lines)-1]); err == nil {
			return t
		}
	}
	info, err := os.Stat(path)
	must(err)
	return info.ModTime()
}

// loadPosts parses every Markdown file in dir, newest first.
func loadPosts(dir string) []Post {
	files, err := filepath.Glob(filepath.Join(dir, "*.md"))
	must(err)
	assert(len(files) <= maxPosts, "%s: %d posts, over the limit of %d", dir, len(files), maxPosts)
	var posts []Post
	for _, f := range files {
		posts = append(posts, parse(f))
	}
	sort.SliceStable(posts, func(i, j int) bool { return posts[i].Time.After(posts[j].Time) })
	return posts
}

// groupByYear groups date-sorted posts under their year, keeping the order.
func groupByYear(posts []Post) []Year {
	var years []Year
	for _, p := range posts {
		n := len(years)
		assert(n == 0 || years[n-1].Year >= p.Year(), "posts not sorted newest first")
		if n == 0 || years[n-1].Year != p.Year() {
			years = append(years, Year{Year: p.Year()})
		}
		y := &years[len(years)-1]
		y.Posts = append(y.Posts, p)
	}
	return years
}

// site is config.toml; fontPreload is the font file to preload on every
// page, from buildFonts.
var (
	site        *Config
	fontPreload string
)

// asset returns the URL of a file in public/ with a hash of its contents
// appended, so browsers fetch it again whenever it changes, however long
// they were told to cache it.
var assetURLs = map[string]string{}

func asset(url string) string {
	if v, ok := assetURLs[url]; ok {
		return v
	}
	b, err := os.ReadFile(filepath.Join("public", filepath.FromSlash(url)))
	must(err)
	sum := sha256.Sum256(b)
	v := url + "?v=" + hex.EncodeToString(sum[:4])
	assetURLs[url] = v
	return v
}

func render(tpl, out string, data Page) {
	data.Site = site
	data.FontPreload = fontPreload
	data.Animations = animations
	t := template.Must(template.New("base.html").Funcs(template.FuncMap{"asset": asset}).
		ParseFiles("templates/base.html", "templates/"+tpl))
	must(os.MkdirAll(filepath.Dir(out), 0o755))
	f, err := os.Create(out)
	must(err)
	must(t.ExecuteTemplate(f, "base", data))
	must(f.Close()) // a failed close can mean a lost write
}

// writeFeed writes an RSS 2.0 feed of the posts (newest first) to out.
func writeFeed(out string, posts []Post) {
	type item struct {
		Title       string `xml:"title"`
		Link        string `xml:"link"`
		GUID        string `xml:"guid"`
		PubDate     string `xml:"pubDate"`
		Description string `xml:"description,omitempty"`
		Content     string `xml:"content:encoded"`
	}
	type channel struct {
		Title       string `xml:"title"`
		Link        string `xml:"link"`
		Description string `xml:"description"`
		Copyright   string `xml:"copyright,omitempty"`
		Items       []item `xml:"item"`
	}
	var feed struct {
		XMLName xml.Name `xml:"rss"`
		Version string   `xml:"version,attr"`
		Content string   `xml:"xmlns:content,attr"`
		Channel channel  `xml:"channel"`
	}
	feed.Version = "2.0"
	feed.Content = "http://purl.org/rss/1.0/modules/content/"
	feed.Channel = channel{Title: site.Title, Link: site.URL + "/", Description: site.Description}
	if site.License.Name != "" {
		feed.Channel.Copyright = strings.TrimSpace(site.License.Name + " " + site.License.URL)
	}
	for _, p := range posts {
		link := site.URL + "/posts/" + p.Slug + "/"
		feed.Channel.Items = append(feed.Channel.Items, item{
			Title: p.Title, Link: link, GUID: link, PubDate: p.Time.Format(time.RFC1123Z),
			Description: p.Description, Content: string(p.Body),
		})
	}
	b, err := xml.MarshalIndent(feed, "", "  ")
	must(err)
	must(os.WriteFile(out, append([]byte(xml.Header), b...), 0o644))
}

func copyDir(src, dst string) {
	must(filepath.WalkDir(src, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, p)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(target, b, 0o644)
	}))
}

// notFound serves public/404.html for paths missing from public/, as
// Cloudflare Pages does in production.
func notFound(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if name == "" {
			name = "."
		}
		if _, err := fs.Stat(os.DirFS("public"), name); err != nil {
			b, err := os.ReadFile("public/404.html")
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusNotFound)
			if _, err := w.Write(b); err != nil {
				log.Printf("%s: %v", r.URL.Path, err)
			}
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	serve := flag.String("serve", "", "after building, serve public/ on this address (e.g. :8000)")
	flag.Parse()

	site = loadConfig("config.toml")
	must(os.RemoveAll("public"))
	copyDir("static", "public")
	fontPreload = buildFonts("public/fonts", "public/css/fonts.css", site.Fonts.Text, site.Fonts.Mono)

	// Posts: content/posts/*.md, newest first.
	posts := loadPosts("content/posts")
	for _, p := range posts {
		render("post.html", "public/posts/"+p.Slug+"/index.html",
			Page{Title: p.Title, Description: p.Description, Post: p, Up: upWritings})
	}
	// Home is the shapes and the about text, with links to contact and
	// writings; writings lists all posts by year.
	about := parse("content/about.md")
	render("index.html", "public/index.html",
		Page{Title: site.Title, Description: site.Description, Intro: about.Body, Animation: site.Animation})
	render("writings.html", "public/writings/index.html",
		Page{Title: "writings", Years: groupByYear(posts), Up: upHome})

	writeFeed("public/feed.xml", posts)

	render("page.html", "public/about/index.html",
		Page{Title: about.Title, Description: about.Description, Post: about, Up: upHome})
	contact := parse("content/contact.md")
	render("page.html", "public/contact/index.html",
		Page{Title: contact.Title, Description: contact.Description, Post: contact, Animation: site.Animation, Up: upHome})

	// Cloudflare Pages serves public/404.html for any path that doesn't exist.
	render("404.html", "public/404.html", Page{Title: "page not found"})
	log.Printf("built %d posts, writings, about, contact, 404 -> public/", len(posts))

	if *serve != "" {
		log.Printf("serving public/ on http://localhost%s", *serve)
		log.Fatal(http.ListenAndServe(*serve, notFound(http.FileServer(http.Dir("public")))))
	}
}
