# How to use this talks site

The site is at `https://wokrupa.github.io/talks/`. Every `git push` to `main`
rebuilds and redeploys it within 2–3 minutes; watch the build in the repo's **Actions** tab.

## First time on a new machine

```bash
git clone https://github.com/wokrupa/talks.git
cd talks
npm install
```

## New talk (Markdown slides)

```bash
npm run new -- 2026-12-05-short-name "Talk title"
```

1. Edit `2026-12-05-short-name/slides.md`. Fill in the details between the two `---` lines at the top
   (`event`, `event_url`, `description`).
2. Separate slides with a line containing only `---`.
3. Put images in `assets/` and use them with `![](assets/plot.png)`.
4. Change a slide's layout by putting one of these at its top:
   `<!-- _class: title -->`, `<!-- _class: section -->` or `<!-- _class: invert -->`.

## Old talk (PDF)

```bash
npm run add-pdf -- ~/Downloads/old-talk.pdf 2025-03-10-short-name "Talk title"
```

Then fill in `event`, `event_url` and `description` in `2025-03-10-short-name/talk.md`.

If a talk is only online (Indico, CDS), add it to `external-talks.json` instead.

## Preview locally

```bash
npm run dev        # live preview: http://localhost:8080, reloads on save
npm run build      # build the whole site into _site/
npm run serve      # look at the built site
```

## Publish

```bash
git add .
git commit -m "Add talk"
git push
```

## If something breaks

- **Actions run is red:** click it to see which step failed. This is usually a typo in the details at the top
  of `slides.md` or `talk.md`. Run `npm run build` locally to see the error.
- **Site doesn't change:** wait for the green tick in Actions, then hard-refresh (`Cmd+Shift+R`).
- **Public site:** only publish talks that are cleared to be public.
