# Talks

Talk slides written in Markdown, built with [Marp](https://marp.app/), and
published to GitHub Pages as a card index (one card per talk) plus a page per
talk with the slides embedded.

## Layout

```
site.json               site title, byline, GitHub repo URL (for "Source" links)
external-talks.json     older talks that aren't in this repo (cards link out)
.marprc.yml             Marp settings: registers ./theme/
theme/talks.css         the slide theme
scripts/build.mjs       build every deck -> _site/ (HTML, PDF, index, talk pages)
scripts/new.mjs         create a new deck folder
scripts/add-pdf.mjs     add an already-presented talk from its PDF
YYYY-MM-DD-short-name/  a Marp deck:
  slides.md             the slides; its front matter feeds the index card
  assets/               images used by that deck
YYYY-MM-DD-short-name/  or a PDF talk:
  slides.pdf            published as is
  talk.md               front matter only (title, date, event, description)
.github/workflows/deploy.yml   build + publish to GitHub Pages on push to main
```

## Usage

```bash
npm install                                        # once
npm run new -- 2026-12-01-my-talk "My talk title"  # new deck
npm run add-pdf -- ~/Downloads/old.pdf 2025-03-10-old-talk "Old talk title"  # add a PDF talk
npm run dev                                        # live preview at http://localhost:8080
npm run build                                      # build _site/ (HTML + PDF)
npm run build:fast                                 # build _site/ without PDFs
npm run serve                                      # look at the built site locally
```

PDF export needs Google Chrome (or set `CHROME_PATH`).

## Already-presented talks (PDF)

For talks you made in PowerPoint, Keynote, LaTeX, etc.:

```bash
npm run add-pdf -- ~/Downloads/old.pdf 2025-03-10-old-talk "Old talk title"
```

This creates `2025-03-10-old-talk/` with `slides.pdf` and a `talk.md` — fill
in `event`, `event_url` and `description` there. The talk gets a card on the
index ("View slides" opens the PDF, plus "Download PDF") and a talk page with
the PDF embedded. You can also make the folder by hand: any `.pdf` next to a
`talk.md` works.

Keep PDFs reasonably small (compress large ones) since they're stored in git.

If the PDF is already online somewhere (Indico, CDS), you don't need to copy
it: add an entry to `external-talks.json` with `event_url` and/or `pdf` links.

## Front matter

```yaml
title: "Talk title"          # card heading
subtitle: "Optional"
date: "2026-12-01"           # sort order + card date
event: "Group Meeting"       # shown next to the date
event_url: "https://…"       # adds an "Event ↗" button
description: "One line for the index card."
```

## Slide classes

Put one of these at the top of a slide:

- `<!-- _class: title -->` cover slide
- `<!-- _class: section -->` section divider
- `<!-- _class: invert -->` dark slide

Two columns: `<div class="cols"><div>…</div><div>…</div></div>` (leave blank
lines around the Markdown inside each `<div>`).

## Publishing on GitLab Pages

`.gitlab-ci.yml` builds the site on every push to the default branch and
publishes it with GitLab Pages. Merge requests are built too, as a check.

1. Create an empty project on GitLab (no README).
2. Set `repo` in `site.json` to the project URL (CI also fills it in automatically).
3. Push:
   ```bash
   git init -b main
   git add .
   git commit -m "Talks site"
   git remote add origin <your project URL>.git
   git push -u origin main
   ```
4. Watch **Build → Pipelines**. When the `pages` job passes, the address is
   under **Deploy → Pages**:
   - gitlab.com: `https://<user>.gitlab.io/<project>/`
   - gitlab.cern.ch: GitLab Pages sites need to be registered with CERN Web
     Services first (see CERN's GitLab Pages documentation); the site then has
     its own `*.docs.cern.ch` style address.
5. Optional: make the site public or restricted under
   **Settings → General → Visibility → Pages**.

## Publishing on GitHub Pages

`.github/workflows/deploy.yml` does the same on GitHub.

1. Push this folder to a GitHub repo.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The site appears at `https://<user>.github.io/<repo>/`.
