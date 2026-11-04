---
title: hello
date: 2026-11-04
description: the first post on obk.dev, and a tour of what a post can hold.
url: https://obk.dev/posts/hello/
---

this site has posts now. each one is a markdown file in `content/posts/`, with a title, a date and a line of description at the top, and the build does the rest: the page, the [list of posts](/posts/), and a [feed](/feed.xml) for readers.{sn|the feed carries every post whole, so it can be read without visiting the site.}

this first one is mostly a sample, to show what a post can hold. *emphasis*, **strong text**, ~~struck-out text~~, `inline code` and [links](https://github.com/obk/obk.dev) all work inline.

## why so small

the site used to have a typeface of its own, shapes in three colours, grain over the window and words that came up out of a blur. it was fun to build.{mn|the old design was bauhaus: kandinsky's circle, square and triangle, set in jost.} but a page that is mostly words reads best when there is nothing else on it.

so now it is one column, inter for text and ibm plex mono for code, black on white or white on black, and grey for whatever is quieter.

<blockquote>
<p>make everything as simple as possible, but not simpler.</p>
<footer>after albert einstein</footer>
</blockquote>

### what went

- jost, for two fonts that read better small
- the animation and the grain
- the colours, but for grey

### what stayed

1. markdown in, static html out
2. no javascript{sn|not even for the notes in the margin: on a phone, a tap opens them with a checkbox and a line of css.}
3. lowercase, everywhere but in code

## code

code is coloured when the site is built, in grey alone: keywords bold, comments and strings quieter.

```go
// notes turns {sn|text} into a numbered sidenote.
func notes(src string) string {
	n := 0
	return noteMarks.ReplaceAllStringFunc(src, func(m string) string {
		n++
		return fmt.Sprintf("note %d", n)
	})
}
```

a long line scrolls sideways rather than wrapping:

```sh
go run . -serve :8000   # build the site into public/, then serve it on http://localhost:8000 for a look
```

## tables and tasks

| page      | at           | what                       |
| --------- | ------------ | -------------------------- |
| about     | `/`          | the bio and how to reach me |
| now       | `/now/`      | what i'm doing now         |
| posts     | `/posts/`    | every post, by year        |
| feed      | `/feed.xml`  | the same, for feed readers |

- [x] posts, with a list by year
- [x] a feed
- [x] notes in the margin
- [ ] the next post

## figures and pairs

<figure>
<img src="/favicon.svg" alt="the site's icon: a circle, a square and a triangle" width="96" height="96">
<figcaption>the icon, still in three colours.</figcaption>
</figure>

definition lists, as on the home page, work here too:

markdown
: what every page and post is written in

goldmark
: the go library that turns it into html

---

that's all for now. the next posts will be about the tools in [projects](/projects/).
