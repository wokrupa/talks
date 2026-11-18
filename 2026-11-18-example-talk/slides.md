---
marp: true
theme: talks
paginate: true
title: "An example talk"
subtitle: "How this talks site is put together"
author: "Your Name"
affiliation: "CERN"
event: "Group Meeting"
event_url: ""
date: "2026-11-18"
description: "A sample deck showing the theme: title slide, bullets, code, columns, a section divider and a dark slide."
footer: "An example talk · Group Meeting"
---

<!-- _class: title -->
<!-- _footer: "" -->

# An example talk

## How this talks site is put together

Your Name · CERN

Group Meeting · 18 November 2026

---

## What's in a deck

- One folder per talk: `YYYY-MM-DD-short-name/`
- `slides.md` holds the slides, written in **Markdown**
- The front matter (top of the file) feeds the index page
- Images go in `assets/` next to the slides

> Separate slides with a line containing only `---`.

---

## Code looks like this

```python
def build(deck):
    html = marp(deck / "slides.md", out="slides.html")
    pdf = marp(deck / "slides.md", pdf=True)
    return html, pdf
```

Inline code too: `npm run build`.

---

## Two columns

<div class="cols">
<div>

### Left

- Write content as usual
- Leave blank lines around the Markdown inside the `<div>`

</div>
<div>

### Right

| Command | Does |
|---|---|
| `npm run dev` | live preview |
| `npm run build` | HTML + PDF |

</div>
</div>

---

<!-- _class: section -->

# A section divider

---

<!-- _class: invert -->

## A dark slide

- Add `<!-- _class: invert -->` at the top of a slide
- Useful for screenshots or demos

---

## Thanks

Questions?
