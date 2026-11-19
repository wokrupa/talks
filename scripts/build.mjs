#!/usr/bin/env node
// Build every deck into _site/ and generate the index + per-talk pages.
//
//   node scripts/build.mjs            HTML + PDF for every deck
//   node scripts/build.mjs --no-pdf   HTML only (faster, no Chrome needed)
//
// A deck is any top-level folder named YYYY-MM-DD-something/ with a slides.md.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
let OUT = join(ROOT, '_site');
const MARP = join(ROOT, 'node_modules', '.bin', 'marp');
const withPdf = !process.argv.includes('--no-pdf');

const site = JSON.parse(readFileSync(join(ROOT, 'site.json'), 'utf8'));
// In CI, point "Source" links at the real repo automatically.
const env = process.env;
if (env.CI_PROJECT_URL) {                       // GitLab CI
  site.repo = env.CI_PROJECT_URL;
  site.branch = env.CI_DEFAULT_BRANCH || site.branch;
} else if (env.GITHUB_REPOSITORY) {             // GitHub Actions
  site.repo = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}`;
}
// GitLab folder links look like …/-/tree/main/dir, GitHub's like …/tree/main/dir.
const treePath = /gitlab/i.test(site.repo || '') ? '/-/tree/' : '/tree/';
// Output folder: _site by default, `--out public` for GitLab Pages.
const outArg = process.argv.indexOf('--out');
if (outArg > -1 && process.argv[outArg + 1]) OUT = resolve(ROOT, process.argv[outArg + 1]);
// The output folder is wiped on each build, so it must be a subfolder of the project.
if (!OUT.startsWith(ROOT + '/') || OUT.slice(ROOT.length + 1).includes('/')) {
  console.error(`--out must name a folder directly inside the project, e.g. public`);
  process.exit(1);
}

// ---------------------------------------------------------------- helpers

/** Minimal front-matter reader: flat `key: value` lines, optional quotes. */
function frontMatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = {};
  if (!m) return meta;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    meta[kv[1]] = v;
  }
  return meta;
}

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function marp(args) {
  // --no-stdin / 'ignore': otherwise Marp waits for Markdown on stdin when it
  // isn't a terminal (pipes, CI) and the build hangs.
  const r = spawnSync(MARP, ['--no-stdin', '--config-file', join(ROOT, '.marprc.yml'), ...args], {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (r.status !== 0) throw new Error(`marp failed: ${args.join(' ')}`);
}

// ---------------------------------------------------------------- build decks

if (!existsSync(MARP)) {
  console.error('Marp is not installed. Run `npm install` first.');
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Two kinds of talk folder (YYYY-MM-DD-name/):
//   slides.md            a Marp deck, built to HTML + PDF
//   talk.md + a .pdf     an already-presented talk: the PDF is published as is,
//                        talk.md holds the same front matter as a deck (title, event, …)
const folders = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}-/.test(d.name))
  .map((d) => d.name);
const decks = folders.filter((n) => existsSync(join(ROOT, n, 'slides.md')));
const pdfTalks = folders.filter((n) => !decks.includes(n) && existsSync(join(ROOT, n, 'talk.md')));

const talks = [];
for (const name of pdfTalks) {
  console.log(`\n▸ ${name} (PDF)`);
  const pdfFile = readdirSync(join(ROOT, name)).find((f) => f.toLowerCase().endsWith('.pdf'));
  if (!pdfFile) {
    console.warn(`  ! skipped: ${name}/talk.md exists but there is no .pdf next to it`);
    continue;
  }
  const dest = join(OUT, name);
  mkdirSync(dest, { recursive: true });
  cpSync(join(ROOT, name, pdfFile), join(dest, `${name}.pdf`));
  const talk = talkInfo(name, frontMatter(readFileSync(join(ROOT, name, 'talk.md'), 'utf8')), {
    kind: 'pdf',
    slides: `${name}/${name}.pdf`,
    pdf: `${name}/${name}.pdf`,
  });
  talks.push(talk);
  writeFileSync(join(dest, 'index.html'), talkPage(talk));
}

for (const name of decks) {
  console.log(`\n▸ ${name}`);
  const src = join(ROOT, name, 'slides.md');
  const dest = join(OUT, name);
  mkdirSync(dest, { recursive: true });
  if (existsSync(join(ROOT, name, 'assets'))) cpSync(join(ROOT, name, 'assets'), join(dest, 'assets'), { recursive: true });

  marp([src, '-o', join(dest, 'slides.html')]);
  if (withPdf) marp([src, '--pdf', '-o', join(dest, `${name}.pdf`)]);

  const talk = talkInfo(name, frontMatter(readFileSync(src, 'utf8')), {
    kind: 'deck',
    slides: `${name}/slides.html`,
    pdf: withPdf ? `${name}/${name}.pdf` : null,
  });
  talks.push(talk);
  writeFileSync(join(dest, 'index.html'), talkPage(talk));
}

function talkInfo(name, meta, files) {
  return {
    name,
    title: meta.title || name,
    subtitle: meta.subtitle,
    description: meta.description,
    author: meta.author,
    event: meta.event,
    event_url: meta.event_url,
    date: meta.date || name.slice(0, 10),
    page: `${name}/`,
    source: site.repo ? `${site.repo}${treePath}${site.branch || 'main'}/${name}` : null,
    ...files,
  };
}

// Talks that live elsewhere (no deck in this repo).
const extPath = join(ROOT, 'external-talks.json');
if (existsSync(extPath)) {
  for (const t of JSON.parse(readFileSync(extPath, 'utf8'))) talks.push({ ...t, external: true });
}

talks.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(join(OUT, 'index.html'), indexPage(talks));
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`\n✓ Built ${decks.length} deck(s) and ${pdfTalks.length} PDF talk(s) into ${OUT.slice(ROOT.length + 1)}/`);

// ---------------------------------------------------------------- templates

function styles() {
  return `
  :root {
    --text: #f3f5fb; --muted: #b5bdd3; --glass: rgba(255,255,255,0.075);
    --glass-border: rgba(255,255,255,0.16); --accent: #8ec5ff;
  }
  * { box-sizing: border-box; }
  html { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh; color: var(--text);
    font-family: 'Inter', system-ui, sans-serif; line-height: 1.5;
    background:
      /* LHCb-style blues on a deep navy base */
      radial-gradient(60vw 50vh at 15% 10%, rgba(30,110,230,0.60), transparent 70%),
      radial-gradient(50vw 50vh at 90% 35%, rgba(0,150,255,0.35), transparent 70%),
      radial-gradient(70vw 60vh at 50% 100%, rgba(20,70,190,0.55), transparent 70%),
      linear-gradient(180deg, #0a2a66 0%, #061a44 100%);
    background-attachment: fixed;
  }
  body::before { /* faint grid behind the glass */
    content: ""; position: fixed; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  main { position: relative; max-width: 860px; margin: 0 auto; padding: 40px 16px 64px; }
  .glass {
    background: var(--glass); border: 1px solid var(--glass-border); border-radius: 18px;
    backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%);
    box-shadow: 0 10px 40px rgba(0,0,0,0.25);
  }
  header.glass { padding: 28px 28px 24px; margin-bottom: 20px; }
  header h1 { margin: 0; font-size: clamp(36px, 6vw, 52px); font-weight: 800; letter-spacing: -0.02em; }
  .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .card { display: block; padding: 22px 24px; margin-bottom: 16px; color: inherit; text-decoration: none; }
  .card h2 { margin: 6px 0 6px; font-size: 22px; line-height: 1.3; }
  .card h2 a { color: inherit; text-decoration: none; }
  .card h2 a:hover { text-decoration: underline; }
  .card p { margin: 0 0 14px; color: var(--muted); font-size: 15px; }
  a.card.external:hover { background: rgba(255,255,255,0.11); }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
  .btn {
    display: inline-block; padding: 7px 16px; border-radius: 999px; font-size: 14px; font-weight: 600;
    text-decoration: none; color: var(--text); border: 1px solid var(--glass-border); background: rgba(255,255,255,0.06);
  }
  .btn:hover { background: rgba(255,255,255,0.14); }
  .btn.primary { background: #f3f5fb; color: #061a44; border-color: transparent; }
  .btn.primary:hover { background: #fff; }
  .spacer { flex: 1; }
  .link { color: var(--muted); font-size: 13px; text-decoration: none; }
  .link:hover { color: var(--text); }
  footer { text-align: center; color: var(--muted); font-size: 13px; margin-top: 28px; }
  footer a { color: var(--muted); }
  .frame { position: relative; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; margin-top: 18px; background: #000; }
  .frame.pdf { aspect-ratio: 4 / 3; background: #2a2f3a; }
  .frame object { position: absolute; inset: 0; width: 100%; height: 100%; }
  .fallback { margin: 0; padding: 32px; text-align: center; color: var(--muted); }
  .fallback a { color: var(--accent); }
  .frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .back { display: inline-block; margin-bottom: 14px; }
  `;
}

function shell(title, body, base = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>${styles()}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

function linkRow(t, prefix = '') {
  const parts = [`<a class="btn primary" href="${esc(prefix + t.slides)}">View slides</a>`];
  // For a PDF talk "View slides" already opens the PDF, so offer a download instead.
  if (t.kind === 'pdf') parts.push(`<a class="btn" href="${esc(prefix + t.pdf)}" download>Download PDF</a>`);
  else if (t.pdf) parts.push(`<a class="btn" href="${esc(prefix + t.pdf)}">PDF</a>`);
  if (t.event_url) parts.push(`<a class="btn" href="${esc(t.event_url)}">Event ↗</a>`);
  parts.push('<span class="spacer"></span>');
  if (t.source) parts.push(`<a class="link" href="${esc(t.source)}">Source ↗</a>`);
  return `<div class="row">${parts.join('')}</div>`;
}

function meta(t) {
  return [fmtDate(t.date), t.event].filter(Boolean).map(esc).join(' · ');
}

function indexPage(talks) {
  const cards = talks.map((t) => {
    if (t.external && t.pdf) {
      // Slides hosted elsewhere: same buttons as a local talk, all pointing off-site.
      const buttons = [`<a class="btn primary" href="${esc(t.pdf)}">${esc(t.label || 'View slides')}</a>`];
      if (t.event_url) buttons.push(`<a class="btn" href="${esc(t.event_url)}">${esc(t.event_label || 'Event')} ↗</a>`);
      return `<article class="card glass">
  <div class="mono">${meta(t)}</div>
  <h2><a href="${esc(t.event_url || t.pdf)}">${esc(t.title)}</a></h2>
  ${t.description ? `<p>${esc(t.description)}</p>` : ''}
  <div class="row">${buttons.join('')}</div>
</article>`;
    }
    if (t.external) {
      const href = t.event_url || '#';
      return `<a class="card glass external" href="${esc(href)}">
  <div class="mono">${meta(t)} ↗</div>
  <h2>${esc(t.title)}</h2>
  ${t.description ? `<p>${esc(t.description)}</p>` : ''}
</a>`;
    }
    return `<article class="card glass">
  <div class="mono">${meta(t)}</div>
  <h2><a href="${esc(t.page)}">${esc(t.title)}</a></h2>
  ${t.description ? `<p>${esc(t.description)}</p>` : ''}
  ${linkRow(t)}
</article>`;
  }).join('\n');

  return shell(site.title, `
<header class="glass">
  <h1>${esc(site.title)}</h1>
  <div class="mono" style="margin-top:8px">${esc(site.byline || '')}</div>
</header>
${cards}
<footer>Built with <a href="https://marp.app/">Marp</a> · ${talks.length} talk${talks.length === 1 ? '' : 's'}</footer>`);
}

// Paths on a talk page are relative to the talk's own folder.
function local(p) {
  return p.split('/').pop();
}

function talkPage(t) {
  return shell(`${t.title} · ${site.title}`, `
<a class="link back" href="../">← All talks</a>
<article class="card glass">
  <div class="mono">${meta(t)}</div>
  <h2 style="font-size:28px">${esc(t.title)}</h2>
  ${t.subtitle ? `<p style="margin-bottom:6px">${esc(t.subtitle)}</p>` : ''}
  ${t.description ? `<p>${esc(t.description)}</p>` : ''}
  ${linkRow({ ...t, slides: local(t.slides), pdf: t.pdf && local(t.pdf) })}
  ${t.kind === 'pdf'
    // <object> shows the browser's PDF viewer, or the fallback link when there is none (e.g. some phones).
    ? `<div class="frame pdf"><object data="${esc(local(t.slides))}" type="application/pdf" aria-label="${esc(t.title)} slides">
    <p class="fallback">This browser can't show the PDF here. <a href="${esc(local(t.slides))}">Open the slides (PDF)</a></p>
  </object></div>`
    : `<div class="frame"><iframe src="${esc(local(t.slides))}" title="${esc(t.title)} slides" allowfullscreen></iframe></div>`}
</article>`);
}
