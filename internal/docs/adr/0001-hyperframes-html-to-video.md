# ADR-0001 HyperFrames HTML-to-Video Sebagai Engine Komposisi
Status: accepted (reverse-engineered)
Date: 2026-07-20

## Context

Repo perlu memproduksi video sosial vertikal (9:16) yang presisi, dapat diulang,
dan bisa diedit oleh agent AI. Opsi lazim: editor NLE manual, atau framework
kode (Remotion/React, After Effects). Project butuh output byte-stabil dan
authoring lewat teks yang bisa dibaca/diedit LLM.

## Decision

Memakai **HyperFrames** (di-pin `hyperframes@0.7.24`) sebagai engine: komposisi
ditulis sebagai HTML + CSS + GSAP di `index.html` (dan `compositions/*.html`),
lalu dirender ke MP4 oleh CLI HyperFrames. Timeline animasi = satu GSAP timeline
`paused` per komposisi, terdaftar di `window.__timelines`. GSAP di-vendor lokal
(`vendor/gsap.min.js`).

## Rationale

- HTML/CSS/GSAP adalah target authoring yang natural untuk agent AI dan mudah
  di-review sebagai teks/diff.
- Timeline `paused` + seek membuat render deterministik dan bisa di-snapshot per
  frame.
- HyperFrames menyediakan lint/validate/inspect (`npm run check`) yang menegakkan
  kontrak komposisi sebelum render.

## Consequences

- Kontrak ketat: elemen ber-waktu butuh `data-start`, `data-duration`, dan
  `data-track-index`; clip biasa memakai `class="clip"`, mount `data-composition-src`
  tidak (klarifikasi RD-02-04). Larangan `Date.now`/`Math.random`/network.
- HTML video diperiksa dengan `npm run video -- check <slug>`; template root
  memakai `npm run check` (ADR-0010).
- Bergantung pada `npx hyperframes@0.7.24` (butuh internet saat pertama).
- Skill HyperFrames lokal (`.claude/skills/`) jadi bagian workflow.

## Sources

- `index.html`, `package.json`, `hyperframes.json`, `vendor/gsap.min.js`
- `docs/agents/references/hyperframes-assembly.md`, AGENTS.md
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md)
