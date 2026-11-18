#!/usr/bin/env node
// Create a new deck:  npm run new -- 2026-12-01-my-talk "My talk title"
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [name, title = 'Untitled talk'] = process.argv.slice(2);
if (!name || !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(name)) {
  console.error('Usage: npm run new -- YYYY-MM-DD-short-name "Talk title"');
  process.exit(1);
}
const dir = join(resolve(import.meta.dirname, '..'), name);
if (existsSync(dir)) {
  console.error(`${name}/ already exists`);
  process.exit(1);
}
const date = name.slice(0, 10);
mkdirSync(join(dir, 'assets'), { recursive: true });
writeFileSync(join(dir, 'assets', '.gitkeep'), '');
writeFileSync(join(dir, 'slides.md'), `---
marp: true
theme: talks
paginate: true
title: "${title}"
subtitle: ""
author: "Your Name"
affiliation: ""
event: ""
event_url: ""
date: "${date}"
description: ""
footer: "${title}"
---

<!-- _class: title -->
<!-- _footer: "" -->

# ${title}

## Subtitle

Your Name

Event · ${date}

---

## First slide

- Point one
- Point two
`);
console.log(`Created ${name}/slides.md — preview with: npm run dev`);
