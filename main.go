// Command site builds obk.dev, a one-page static site: content/index.md,
// rendered into templates/page.html with templates/style.css inlined,
// becomes public/index.html, next to a copy of static/.
//
//	go run .               build into public/
//	go run . -serve :8080  build, then serve public/ for a look
package main

import (
	"bytes"
	_ "embed"
	"flag"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
)

var (
	//go:embed templates/page.html
	pageHTML string

	//go:embed templates/style.css
	styleCSS string

	page = template.Must(template.New("page").Parse(pageHTML))

	// Definition lists ("term" then ": value" lines) for label-value pairs.
	md = goldmark.New(goldmark.WithExtensions(extension.DefinitionList))
)

func main() {
	src := flag.String("src", "content/index.md", "the page's Markdown")
	out := flag.String("out", "public", "the output directory, emptied first")
	serve := flag.String("serve", "", "after building, serve -out at this address, like :8080")
	flag.Parse()

	if err := build(*src, *out); err != nil {
		log.Fatal(err)
	}
	log.Printf("built %s", filepath.Join(*out, "index.html"))

	if *serve != "" {
		log.Printf("serving %s at http://localhost%s", *out, *serve)
		log.Fatal(http.ListenAndServe(*serve, http.FileServer(http.Dir(*out))))
	}
}

func build(src, out string) error {
	raw, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	meta, text := frontMatter(strings.ReplaceAll(string(raw), "\r\n", "\n"))

	var body bytes.Buffer
	if err := md.Convert([]byte(text), &body); err != nil {
		return err
	}

	var html bytes.Buffer
	err = page.Execute(&html, map[string]any{
		"Title":       meta["title"],
		"Description": meta["description"],
		"URL":         meta["url"],
		"Style":       template.CSS(styleCSS),
		"Body":        template.HTML(body.String()),
	})
	if err != nil {
		return err
	}

	if err := os.RemoveAll(out); err != nil {
		return err
	}
	if err := os.CopyFS(out, os.DirFS("static")); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(out, "index.html"), html.Bytes(), 0o644)
}

// frontMatter splits "key: value" lines between two "---" lines off the top
// of src. Without them, all of src is the body.
func frontMatter(src string) (meta map[string]string, body string) {
	meta = map[string]string{}
	rest, ok := strings.CutPrefix(src, "---\n")
	if !ok {
		return meta, src
	}
	head, body, ok := strings.Cut(rest, "\n---\n")
	if !ok {
		return meta, src
	}
	for _, line := range strings.Split(head, "\n") {
		if k, v, ok := strings.Cut(line, ":"); ok {
			meta[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	}
	return meta, body
}
