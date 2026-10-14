// Command gifs records each home page animation as a GIF for the README.
//
// It runs the real scripts from static/js/ in a JavaScript engine against
// a stand-in for the page (dom.js), with the markup from
// templates/base.html, steps time at a fixed rate, and draws what the
// scripts leave in the SVG (or, for shapes, the text) itself. From the
// repository root:
//
//	go -C tools/gifs run .              # every animation into docs/animations/
//	go -C tools/gifs run . curve ford   # just these
//
// It's its own module, so its dependencies stay out of the site's build;
// they need Go 1.26 or newer, the site only 1.24.
package main

import (
	_ "embed"
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html/template"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	"io"
	"log"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/dop251/goja"
	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"
)

//go:embed dom.js
var domJS string

// What to record: how many seconds of each, from its start. Those that
// loop get one whole loop; the rest, long enough to see what they do.
var clips = []struct {
	name    string
	seconds float64
}{
	{"shapes", 12},
	{"curve", 14},
	{"cycloid", 14},
	{"mandelbrot", 14},
	{"cycloid-horizontal", 14},
	{"medley", 24},
	{"ford", 15.4},
	{"golden", 12.6},
	{"nautilus", 16.7},
	{"sine", 14},
	{"penrose", 12},
	{"chords", 15}, // to 4: a whole loop is 31 s, and the chords make it big
	{"newton", 9},
}

const (
	fps    = 12.5 // GIF delays are in hundredths of a second: 8 each
	width  = 280  // px, an SVG animation's width (on the site, up to 320)
	textW  = 420  // px, the shapes text box
	textH  = 420
	ss     = 3   // supersampling, for smooth lines
	stroke = 1.2 // px, the CSS stroke width
	faint  = 0.35
	levels = 16 // shades from paper to ink
)

// The site's light theme (static/css/site.css).
var (
	paper = color.RGBA{0xf0, 0xee, 0xe6, 0xff}
	ink   = color.RGBA{0x1f, 0x1e, 0x1d, 0xff}
)

func main() {
	log.SetFlags(0)
	// Work from the repository root, two levels up from here.
	if _, err := os.Stat("templates/base.html"); err != nil {
		if err := os.Chdir(filepath.Join("..", "..")); err != nil {
			log.Fatal(err)
		}
	}
	want := map[string]bool{}
	for _, a := range os.Args[1:] {
		want[a] = true
	}
	tpl := template.Must(template.New("base.html").
		Funcs(template.FuncMap{"asset": func(s string) string { return s }}).
		ParseFiles("templates/base.html"))
	out := filepath.Join("docs", "animations")
	if err := os.MkdirAll(out, 0o755); err != nil {
		log.Fatal(err)
	}
	for _, c := range clips {
		if len(want) > 0 && !want[c.name] {
			continue
		}
		g, err := record(tpl, c.name, c.seconds)
		if err != nil {
			log.Fatalf("%s: %v", c.name, err)
		}
		var buf bytes.Buffer
		if err := gif.EncodeAll(&buf, g); err != nil {
			log.Fatalf("%s: %v", c.name, err)
		}
		file := filepath.Join(out, c.name+".gif")
		if err := os.WriteFile(file, buf.Bytes(), 0o644); err != nil {
			log.Fatal(err)
		}
		log.Printf("%-20s %3d frames  %4d KB  -> %s", c.name, len(g.Image), buf.Len()/1024, filepath.ToSlash(file))
	}
}

// node is an element, as dom.js takes and gives it.
type node struct {
	Tag      string            `json:"tag"`
	Attrs    map[string]string `json:"attrs"`
	Style    map[string]any    `json:"style"`
	Text     string            `json:"text"`
	Children []*node           `json:"children"`
}

func (n *node) class(c string) bool {
	return strings.Contains(" "+n.Attrs["class"]+" ", " "+c+" ")
}

// markup renders the animation's template and splits it into its element
// and its script's path.
func markup(tpl *template.Template, name string) (*node, string, error) {
	var b bytes.Buffer
	if err := tpl.ExecuteTemplate(&b, "art", name); err != nil {
		return nil, "", err
	}
	// A bare hidden isn't XML.
	src := regexp.MustCompile(`\shidden>`).ReplaceAllString(b.String(), ` hidden="">`)
	dec := xml.NewDecoder(strings.NewReader("<root>" + src + "</root>"))
	var stack []*node
	var top *node
	script := ""
	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, "", err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			n := &node{Tag: t.Name.Local, Attrs: map[string]string{}}
			for _, a := range t.Attr {
				n.Attrs[a.Name.Local] = a.Value
			}
			if n.Tag == "script" {
				script = strings.SplitN(n.Attrs["src"], "?", 2)[0]
			}
			if len(stack) > 0 {
				p := stack[len(stack)-1]
				p.Children = append(p.Children, n)
			}
			stack = append(stack, n)
			if len(stack) == 2 && (n.Tag == "svg" || n.Tag == "pre") {
				top = n
			}
		case xml.EndElement:
			stack = stack[:len(stack)-1]
		}
	}
	if top == nil || script == "" {
		return nil, "", fmt.Errorf("no element or script in its template")
	}
	return top, filepath.Join("static", filepath.FromSlash(script)), nil
}

func record(tpl *template.Template, name string, seconds float64) (*gif.GIF, error) {
	el, script, err := markup(tpl, name)
	if err != nil {
		return nil, err
	}
	src, err := os.ReadFile(script)
	if err != nil {
		return nil, err
	}
	vm := goja.New()
	if _, err := vm.RunScript("dom.js", domJS); err != nil {
		return nil, err
	}
	tree, _ := json.Marshal(el)
	if _, err := vm.RunString(fmt.Sprintf("__build(%q, %d, %d)", tree, textW, textH)); err != nil {
		return nil, err
	}
	if _, err := vm.RunScript(script, string(src)); err != nil {
		return nil, err
	}
	if _, err := vm.RunString("__ready()"); err != nil {
		return nil, err
	}
	start := vm.Get("__start").Export()
	frame, ok := goja.AssertFunction(vm.Get("__frame"))
	if !ok {
		return nil, fmt.Errorf("no __frame")
	}

	pal := palette()
	g := &gif.GIF{}
	var prev *image.Paletted
	n := int(math.Round(seconds * fps))
	for i := 0; i < n; i++ {
		t := float64(i)/fps + toFloat(start)
		v, err := frame(goja.Undefined(), vm.ToValue(t))
		if err != nil {
			return nil, err
		}
		var root node
		if err := json.Unmarshal([]byte(v.String()), &root); err != nil {
			return nil, err
		}
		var img *image.Paletted
		if root.Tag == "pre" {
			img = text(&root, pal)
		} else {
			img = vector(&root, pal)
		}
		g.Image = append(g.Image, delta(prev, img))
		g.Delay = append(g.Delay, int(math.Round(100/fps)))
		g.Disposal = append(g.Disposal, gif.DisposalNone)
		prev = img
	}
	return g, nil
}

func toFloat(v any) float64 {
	switch x := v.(type) {
	case int64:
		return float64(x)
	case float64:
		return x
	}
	return 0
}

// palette is paper to ink in even steps, and last a transparent entry for
// the pixels a frame leaves as they were.
func palette() color.Palette {
	p := make(color.Palette, 0, levels+1)
	for i := 0; i < levels; i++ {
		a := float64(i) / (levels - 1)
		mix := func(x, y uint8) uint8 { return uint8(math.Round(float64(x) + (float64(y)-float64(x))*a)) }
		p = append(p, color.RGBA{mix(paper.R, ink.R), mix(paper.G, ink.G), mix(paper.B, ink.B), 0xff})
	}
	return append(p, color.RGBA{})
}

const keep = levels // the transparent entry: the pixel stays as it was

// delta crops a frame to what changed since the last one, leaving
// unchanged pixels inside that box transparent. GIFs shrink a lot this way.
func delta(prev, img *image.Paletted) *image.Paletted {
	if prev == nil {
		return img
	}
	b := img.Rect
	x0, y0, x1, y1 := b.Max.X, b.Max.Y, b.Min.X, b.Min.Y
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			if img.ColorIndexAt(x, y) != prev.ColorIndexAt(x, y) {
				x0, y0 = min(x0, x), min(y0, y)
				x1, y1 = max(x1, x+1), max(y1, y+1)
			}
		}
	}
	if x0 >= x1 { // nothing changed: one transparent pixel
		x0, y0, x1, y1 = 0, 0, 1, 1
	}
	f := image.NewPaletted(image.Rect(x0, y0, x1, y1), img.Palette)
	for y := y0; y < y1; y++ {
		for x := x0; x < x1; x++ {
			if c := img.ColorIndexAt(x, y); c != prev.ColorIndexAt(x, y) {
				f.SetColorIndex(x, y, c)
			} else {
				f.SetColorIndex(x, y, keep)
			}
		}
	}
	return f
}

// --- SVG -------------------------------------------------------------------

// canvas holds ink coverage, 0 to 1, at ss times the output resolution.
type canvas struct {
	w, h       int
	cov        []float64
	minX, minY float64 // the viewBox's corner
	vbW        float64 // and width
	scale      float64 // output px per viewBox unit
}

func vector(root *node, pal color.Palette) *image.Paletted {
	vb := strings.Fields(root.Attrs["viewBox"])
	var v [4]float64
	for i := range v {
		v[i], _ = strconv.ParseFloat(vb[i], 64)
	}
	w, h := width, int(math.Round(width*v[3]/v[2]))
	c := &canvas{w: w * ss, h: h * ss, cov: make([]float64, w*ss*h*ss), minX: v[0], minY: v[1], scale: width / v[2], vbW: v[2]}
	c.walk(root, 1, false)
	img := image.NewPaletted(image.Rect(0, 0, w, h), pal)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			s := 0.0
			for dy := 0; dy < ss; dy++ {
				for dx := 0; dx < ss; dx++ {
					s += c.cov[(y*ss+dy)*c.w+x*ss+dx]
				}
			}
			img.SetColorIndex(x, y, uint8(math.Round(s/(ss*ss)*(levels-1))))
		}
	}
	return img
}

func opacity(n *node) float64 {
	o := 1.0
	if v, ok := n.Style["opacity"]; ok {
		switch x := v.(type) {
		case float64:
			o = x
		case string:
			if f, err := strconv.ParseFloat(x, 64); err == nil {
				o = f
			}
		}
	}
	if n.class("faint") {
		o *= faint
	}
	return o
}

func (c *canvas) walk(n *node, op float64, fade bool) {
	op *= opacity(n)
	if _, ok := n.Attrs["mask"]; ok {
		fade = true // the masks fade the line out at both ends
	}
	sw := stroke
	if s, ok := n.Style["strokeWidth"].(string); ok && s != "" {
		if f, err := strconv.ParseFloat(strings.TrimSuffix(s, "px"), 64); err == nil {
			sw = f
		}
	}
	num := func(k string) float64 { f, _ := strconv.ParseFloat(n.Attrs[k], 64); return f }
	switch n.Tag {
	case "defs":
		return
	case "path":
		for _, line := range parsePath(n.Attrs["d"]) {
			c.polyline(line, sw, op, fade)
		}
	case "circle":
		r := num("r")
		if r <= 0 {
			break
		}
		cx, cy := num("cx"), num("cy")
		if n.class("pen") {
			c.disc(cx, cy, r*c.scale*ss, op, fade)
			break
		}
		k := max(24, int(r*c.scale*2))
		pts := make([][2]float64, k+1)
		for i := range pts {
			a := 2 * math.Pi * float64(i) / float64(k)
			pts[i] = [2]float64{cx + r*math.Cos(a), cy + r*math.Sin(a)}
		}
		c.polyline(pts, sw, op, fade)
	}
	for _, ch := range n.Children {
		c.walk(ch, op, fade)
	}
}

var pathTok = regexp.MustCompile(`[MLHVZmlhvz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?`)

// parsePath reads the absolute M, L, H and V commands the scripts write.
func parsePath(d string) [][][2]float64 {
	var lines [][][2]float64
	var cmd string
	var x, y float64
	var nums []float64
	flush := func() {
		switch cmd {
		case "M", "L":
			for i := 0; i+1 < len(nums); i += 2 {
				x, y = nums[i], nums[i+1]
				if cmd == "M" && i == 0 {
					lines = append(lines, nil)
				}
				lines[len(lines)-1] = append(lines[len(lines)-1], [2]float64{x, y})
			}
		case "H":
			for _, v := range nums {
				x = v
				lines[len(lines)-1] = append(lines[len(lines)-1], [2]float64{x, y})
			}
		case "V":
			for _, v := range nums {
				y = v
				lines[len(lines)-1] = append(lines[len(lines)-1], [2]float64{x, y})
			}
		}
		nums = nums[:0]
	}
	for _, t := range pathTok.FindAllString(d, -1) {
		if f, err := strconv.ParseFloat(t, 64); err == nil {
			nums = append(nums, f)
			continue
		}
		flush()
		cmd = t
	}
	flush()
	return lines
}

// px maps viewBox coordinates to supersampled pixels.
func (c *canvas) px(x, y float64) (float64, float64) {
	return (x - c.minX) * c.scale * ss, (y - c.minY) * c.scale * ss
}

// fadeAt is the masks' gradient: 0 at the viewBox's edges, 1 from a tenth
// of its width in.
func (c *canvas) fadeAt(sx float64) float64 {
	u := sx / (c.vbW * c.scale * ss)
	return math.Min(math.Min(u/0.1, (1-u)/0.1), 1)
}

func (c *canvas) polyline(pts [][2]float64, sw, op float64, fade bool) {
	r := sw / 2 * ss
	if len(pts) == 1 {
		x, y := c.px(pts[0][0], pts[0][1])
		c.stamp(x, y, r, op, fade)
		return
	}
	for i := 1; i < len(pts); i++ {
		ax, ay := c.px(pts[i-1][0], pts[i-1][1])
		bx, by := c.px(pts[i][0], pts[i][1])
		steps := int(math.Hypot(bx-ax, by-ay)/0.5) + 1
		for s := 0; s <= steps; s++ {
			u := float64(s) / float64(steps)
			c.stamp(ax+(bx-ax)*u, ay+(by-ay)*u, r, op, fade)
		}
	}
}

func (c *canvas) disc(cx, cy, r, op float64, fade bool) {
	x, y := c.px(cx, cy)
	c.stamp(x, y, r, op, fade)
}

// stamp inks a round dot of radius r: a stroke is a run of them, which
// gives it round caps and joins as the CSS asks.
func (c *canvas) stamp(x, y, r, op float64, fade bool) {
	if fade {
		op *= math.Max(c.fadeAt(x), 0)
	}
	if op <= 0 {
		return
	}
	r = math.Max(r, 0.5)
	for py := int(y - r - 1); py <= int(y+r+1); py++ {
		if py < 0 || py >= c.h {
			continue
		}
		for px := int(x - r - 1); px <= int(x+r+1); px++ {
			if px < 0 || px >= c.w {
				continue
			}
			d := math.Hypot(float64(px)+0.5-x, float64(py)+0.5-y)
			a := op * math.Min(math.Max(r+0.5-d, 0), 1)
			if i := py*c.w + px; a > c.cov[i] {
				c.cov[i] = a
			}
		}
	}
}

// --- Text (shapes) ----------------------------------------------------------

func text(root *node, pal color.Palette) *image.Paletted {
	face := basicfont.Face7x13
	img := image.NewPaletted(image.Rect(0, 0, textW, textH), pal)
	draw.Draw(img, img.Rect, &image.Uniform{pal[0]}, image.Point{}, draw.Src)
	d := font.Drawer{Dst: img, Src: &image.Uniform{pal[levels-1]}, Face: face}
	for j, line := range strings.Split(root.Text, "\n") {
		d.Dot = fixed.P(0, (j+1)*13-3)
		d.DrawString(line)
	}
	return img
}
