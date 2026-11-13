package main

import (
	"encoding/xml"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// The newest films from a public Letterboxd diary, read from its RSS feed
// at build time. Each poster is copied into the site, so a visitor's
// browser never asks Letterboxd for anything.

const letterboxdUser = "bidikburger"

// filmsMark is where the films go in a page's Markdown.
const filmsMark = "<!-- letterboxd -->"

type film struct {
	Link    string `xml:"link"`
	Title   string `xml:"https://letterboxd.com filmTitle"`
	Year    string `xml:"https://letterboxd.com filmYear"`
	Rating  string `xml:"https://letterboxd.com memberRating"`
	Watched string `xml:"https://letterboxd.com watchedDate"`
	Rewatch string `xml:"https://letterboxd.com rewatch"`
	Like    string `xml:"https://letterboxd.com memberLike"`
	Desc    string `xml:"description"`

	Poster string // the poster's path on this site, once saved
}

// Stars turns a rating like 3.5 into ★★★½.
func (f film) Stars() string {
	r, err := strconv.ParseFloat(f.Rating, 64)
	if err != nil || r <= 0 {
		return ""
	}
	s := strings.Repeat("★", int(r))
	if r-float64(int(r)) >= 0.5 {
		s += "½"
	}
	return s
}

// Day is the date it was watched, as "2 nov".
func (f film) Day() string {
	t, err := time.Parse(time.DateOnly, f.Watched)
	if err != nil {
		return ""
	}
	return strings.ToLower(t.Format("2 Jan"))
}

var (
	posterSrc = regexp.MustCompile(`<img src="([^"]+)"`)

	// A film's slug in a diary link, which may end in a count of watches:
	// /bidikburger/film/suspiria-2018/4/.
	filmSlug = regexp.MustCompile(`/film/([^/]+)/`)

	// Letterboxd serves a poster at any size its URL asks for; a small one
	// is plenty here.
	posterSize = regexp.MustCompile(`-0-\d+-0-\d+-crop`)

	filmList = template.Must(template.New("films").Parse(`<ul class="films">
{{range .}}<li><a{{with .Link}} href="{{.}}"{{end}}>{{with .Poster}}<img src="{{.}}" alt="" width="115" height="172" loading="lazy">{{end}}<span class="film-title">{{.Title}}</span></a>
<span class="film-meta">{{.Year}}{{with .Stars}} · {{.}}{{end}}{{if eq .Like "Yes"}} · ♥{{end}}{{if eq .Rewatch "Yes"}} · again{{end}}{{with .Day}}<br>{{.}}{{end}}</span></li>
{{end}}</ul>
`))
)

// films fetches the newest n diary entries and renders them, saving their
// posters under out/films/. On any trouble with the feed it says so and
// returns a plain link, so the build never fails for want of the network.
func films(out string, n int) string {
	profile := "https://letterboxd.com/" + letterboxdUser + "/"
	fallback := "<p>none to show just now.</p>"

	list, err := fetchFilms(profile+"rss/", n)
	if err != nil {
		fmt.Fprintln(os.Stderr, "letterboxd:", err)
		return fallback
	}
	dir := filepath.Join(out, "films")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		fmt.Fprintln(os.Stderr, "letterboxd:", err)
		return fallback
	}
	for i := range list {
		m := posterSrc.FindStringSubmatch(list[i].Desc)
		if m == nil || list[i].Link == "" {
			continue
		}
		name := path.Base(strings.TrimSuffix(list[i].Link, "/")) + ".jpg"
		src := posterSize.ReplaceAllString(m[1], "-0-230-0-345-crop")
		if err := download(src, filepath.Join(dir, name)); err != nil {
			fmt.Fprintln(os.Stderr, "letterboxd: poster:", err)
			continue
		}
		list[i].Poster = "/films/" + name
	}

	var b strings.Builder
	if err := filmList.Execute(&b, list); err != nil {
		return fallback
	}
	return b.String()
}

func fetchFilms(url string, n int) ([]film, error) {
	body, err := get(url)
	if err != nil {
		return nil, err
	}
	var feed struct {
		Items []film `xml:"channel>item"`
	}
	if err := xml.Unmarshal(body, &feed); err != nil {
		return nil, err
	}
	var list []film
	for _, f := range feed.Items {
		if f.Title == "" { // lists and reviews of lists carry no film
			continue
		}
		// Link the film's own page, not the diary entry, which would
		// carry the account's name.
		if m := filmSlug.FindStringSubmatch(f.Link); m != nil {
			f.Link = "https://letterboxd.com/film/" + m[1] + "/"
		} else {
			f.Link = ""
		}
		list = append(list, f)
		if len(list) == n {
			break
		}
	}
	if len(list) == 0 {
		return nil, fmt.Errorf("no films in %s", url)
	}
	return list, nil
}

var client = &http.Client{Timeout: 15 * time.Second}

func get(url string) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "obk.dev site build")
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%s: %s", url, res.Status)
	}
	return io.ReadAll(io.LimitReader(res.Body, 4<<20))
}

func download(url, file string) error {
	b, err := get(url)
	if err != nil {
		return err
	}
	return os.WriteFile(file, b, 0o644)
}
