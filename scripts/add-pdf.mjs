#!/usr/bin/env node
// Add an already-presented talk from its PDF:
//   npm run add-pdf -- ~/Downloads/my-talk.pdf 2025-03-10-my-talk "Talk title"
// Creates 2025-03-10-my-talk/ with the PDF and a talk.md to fill in.
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const [pdfArg, name, title = 'Untitled talk'] = process.argv.slice(2);
const usage = 'Usage: npm run add-pdf -- path/to/slides.pdf YYYY-MM-DD-short-name "Talk title"';
if (!pdfArg || !name) {
  console.error(usage);
  process.exit(1);
}
const pdf = resolve(pdfArg.replace(/^~(?=\/)/, homedir()));
if (!existsSync(pdf) || !pdf.toLowerCase().endsWith('.pdf')) {
  console.error(`Not a PDF file: ${pdfArg}`);
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(name)) {
  console.error(`Folder name must look like 2025-03-10-short-name (lowercase, dashes).\n${usage}`);
  process.exit(1);
}
const dir = join(resolve(import.meta.dirname, '..'), name);
if (existsSync(dir)) {
  console.error(`${name}/ already exists`);
  process.exit(1);
}

mkdirSync(dir);
copyFileSync(pdf, join(dir, 'slides.pdf'));
writeFileSync(join(dir, 'talk.md'), `---
title: "${title.replace(/"/g, '\\"')}"
event: ""
event_url: ""
date: "${name.slice(0, 10)}"
description: ""
---

Notes about this talk (not shown on the site).
`);
const mb = (statSync(pdf).size / 1e6).toFixed(1);
console.log(`Added ${name}/slides.pdf (${mb} MB) and ${name}/talk.md — fill in event and description there.`);
if (mb > 50) console.warn('! This PDF is large; consider compressing it before committing.');
