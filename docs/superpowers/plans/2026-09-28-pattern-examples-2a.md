# Pattern Examples 2a (Style Enrichment, Sub-project 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One generated example host per style (seven hosts, the 32 old files moved and proven pixel-identical), four new engine helpers (`SK.typeOn`, `SK.shake`, `SK.arcPath`, `SK.mapSvg`), eight new patterns, and thirteen new examples so every broll-text and motion-graphic pattern (20 + 20) has a rendered example, enforced by a coverage test.

**Architecture:** Each style folder `docs/agents/references/style-examples/<style>/` holds `examples.json` (source), `compositions/`, `hyperframes.json`, and the GENERATED `index.html` + `snapshots.json`. `scripts/lib/style-examples.mjs` is a pure generator (layout: first clip at 0.5 s, 0.5 s gaps; split slides `#base-video`; cutout on track 6, front on track 7); `npm run style-examples -- build|check` writes or verifies; `scripts/check-style-examples.mjs` runs the existing `check-broll-examples.mjs` once per host and copies the shared `style-examples/assets/` in.

**Tech Stack:** HyperFrames 0.7.24 (pinned `npx`), GSAP + motion-kit + style-kit + asset-lib (vendored), Node 22+ built-ins (`node:test`, `node:vm`), `ffmpeg` (pixel proof only).

**Spec:** `docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md`

**Evidence:** Every block below was written and run in a scratch copy of the repo on 2026-09-28 (`scratchpad/dev2/repo`): the seven generated hosts lint and validate with 0 errors; the 60 old stills compare **59 byte-identical, 1 within ±1** (sm-01 at local 5.7 s, two channel values, float local time) against a baseline rendered from `main`; the 13 new examples pass lint/validate and every still was looked at and fixed; `test:style-kit` 98/98, `test:asset-lib` 29/29, `test:motion-kit` 15/15, `test:video` 16/16, `test:repliz` 47/47, `test:render-blur` 4/4. The plan itself was then replayed op by op in a clean clone of `feat/examples-2a` (renders skipped): every replacement matched exactly once, every commit left a clean tree, and the final files equal the tested copy byte for byte.

## Global Constraints

- No npm dependencies (ADR-0007); HyperFrames is always `npx --yes hyperframes@0.7.24`.
- The generated `index.html` and `snapshots.json` of a host are never edited by hand: change `examples.json` and run `npm run style-examples -- build`.
- Old examples stay pixel-identical: identical, or ≤ 1 per channel on ≤ 0.001% of values (float local-time noise). Do not touch the old compositions.
- Clip rules: never set `visibility`; never name a `font-family` in a clip `<style>`; never write `../` in a url; never build a `querySelector` from a template literal (lint `template_literal_selector`) — use `querySelectorAll('[data-region]')` + `getAttribute`.
- Example content is made up and marked "Example only"; no real brand logos (generic icons); the province map is Natural Earth 5.1.2 (33 provinces), never a claim about current borders.
- Stage files with explicit paths only, never `git add -A` (a scratch copy staged a deletion of the `vendor/whisper.cpp` submodule that way).
- Docs language: `docs/agents/**` English; `internal/docs/**` Indonesian. Docs change in the same commit as the code they describe.
- Replacement steps give exact **old** and **new** blocks; each old block must match exactly once — if not, stop and re-read the file. "Append" means add the block at the end of the file.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- The `rtk` hook rewrites some shell commands; run raw `cat`/`curl` of JSON as `rtk proxy …`. `npm run` and `node` are unaffected.
- Do not push. Merge to local `main` only after Dena approves.

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `scripts/lib/style-examples.mjs` | Create | Pure generator: manifest checks, layout, host HTML, snapshots |
| `scripts/style-examples.mjs` | Create | CLI `build` / `check` |
| `scripts/check-style-examples.mjs` | Create | Lint/validate/snapshot all hosts or one |
| `scripts/check-broll-examples.mjs` | Modify | Copy the shared example `assets/` |
| `scripts/style-examples.test.mjs` | Create | Generator unit tests + hosts on disk |
| `scripts/style-docs.test.mjs` | Modify | Per-host example paths, pattern coverage |
| `scripts/style-kit.test.mjs`, `vendor/style-kit/style-kit.{js,css}` | Modify | `SK.typeOn`, `SK.shake`, `SK.arcPath`, `.sk-caret` |
| `scripts/asset-lib.test.mjs`, `scripts/lib/asset-lib-build.mjs`, `vendor/asset-lib/src/runtime.js` | Modify | `mapRegions`, `SK.LIB.regions`, `SK.mapSvg` |
| `vendor/asset-lib/asset-lib.js` | Generated | Rebuilt with regions |
| `docs/agents/references/style-examples/<style>/` | Create/Move | Seven hosts; 13 new compositions |
| `docs/agents/references/styles/*.md`, `styles/README.md` | Modify | Paths, 8 patterns, recipes, SFX, examples |
| `AGENTS.md`, `CLAUDE.md`, `internal/docs/operations/runbook.md` | Modify | Commands |
| `internal/docs/adr/0017-per-style-example-hosts.md`, `internal/docs/README.md`, `internal/docs/requirements/rd-03-video-editing-workflow.md` | Create/Modify | ADR, index, RD-03-56/57 |

---

### Task 0: Preflight and pixel baseline

**Files:** none (checks only)

- [ ] **Step 1: Confirm the branch and a clean tree**

Run:

```bash
git branch --show-current && git status --short
```

Expected: `feat/examples-2a` and no status output. On `main`, run `git checkout feat/examples-2a`.

- [ ] **Step 2: Render the pixel baseline from the single host (before anything moves)**

Run:

```bash
mkdir -p /tmp/examples-2a && npm run check:style-examples && rm -rf /tmp/examples-2a/baseline && cp -R renders/style-examples /tmp/examples-2a/baseline && ls /tmp/examples-2a/baseline/frame-*.png | wc -l
```

Expected: lint/validate `0 errors`, then `60`. Task 2 compares against `/tmp/examples-2a/baseline`.

---

### Task 1: Docs first, then the host generator (TDD)

**Files:**
- Create: `internal/docs/adr/0017-per-style-example-hosts.md`
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md` (RD-03-57), `internal/docs/README.md` (index)
- Create: `scripts/style-examples.test.mjs` (generator unit tests; Task 2 appends the on-disk tests)
- Create: `scripts/lib/style-examples.mjs`, `scripts/style-examples.mjs`, `scripts/check-style-examples.mjs`
- Modify: `scripts/check-broll-examples.mjs` (copy the shared `assets/`), `package.json`

**Interfaces:**
- Produces: `EXAMPLES`, `STYLES`, `PREFIX`, `TREATMENTS`, `readManifest(root, style)`, `checkManifest(m)`, `layout(m)` (adds `start`), `snapshots(m)` (`{ at }`), `hostHtml(m)`, `buildHosts(root)` (`{ path: content }` for every style with an `examples.json`); CLI `npm run style-examples -- build|check`; `node scripts/check-style-examples.mjs [style]`.

- [ ] **Step 1: Write ADR-0017**

Create `internal/docs/adr/0017-per-style-example-hosts.md`:

```md
# ADR-0017 Host contoh per gaya, dihasilkan dari manifest
Status: accepted
Date: 2026-09-28

## Context

Contoh gaya (ADR-0012..0015) hidup di satu host HyperFrames
(`docs/agents/references/style-examples/index.html`) yang ditulis tangan: 29
clip + 3 layer front, waktu mulai dan tween split dihitung manual, dan satu
`snapshots.json` untuk semuanya. Sub-proyek 2 (Style Enrichment) menargetkan
setiap pola punya contoh — puluhan contoh baru — sehingga host tangan jadi
rawan salah hitung dan satu check harus merender semua gaya.

Spike 2026-09-28 (salinan scratch, HyperFrames 0.7.24): host hasil generator
dengan CSS dan urutan kit yang sama menghasilkan 59 dari 60 still lama identik
byte; satu still (sm-01, lokal 5,7 s) berbeda ±1 pada dua nilai kanal karena
derau float waktu lokal (80,2 − 74,5 vs 6,2 − 0,5).

## Decision

- Satu host per gaya: `style-examples/<gaya>/` berisi `examples.json`
  (sumber), `compositions/`, `hyperframes.json`, dan `index.html` +
  `snapshots.json` yang DIHASILKAN oleh `npm run style-examples -- build`
  (`scripts/lib/style-examples.mjs`). Test gagal bila hasil generator beda dengan disk.
- Tata letak tetap: clip pertama 0,5 s, jeda 0,5 s; split menggeser
  `#base-video` 480 px; cutout (track 6) dan front (track 7) dari flag manifest.
- Aset contoh bersama tetap di `style-examples/assets/` dan disalin ke proyek
  sementara oleh `scripts/check-broll-examples.mjs`.
- `npm run check:style-examples [-- <gaya>]` merender satu atau ketujuh host.
- Bukti migrasi: identik, atau selisih ≤ 1 per kanal pada ≤ 0,001% nilai.

## Rationale

- Menambah contoh = satu file komposisi + satu baris manifest; tidak ada waktu
  yang dihitung tangan.
- Check per gaya lebih cepat dan kegagalannya jelas milik gaya mana.
- Toleransi ±1 menerima derau float tanpa menyembunyikan perubahan nyata.

## Consequences

- `index.html` dan `snapshots.json` di host tidak boleh diedit tangan.
- Tes cakupan (`COVERED` di `scripts/style-docs.test.mjs`) mewajibkan setiap
  pola punya contoh untuk gaya yang sudah dicakup; 2b dan 2c menambah gaya.
- Selector template-literal di clip ditolak linter; cari region peta lewat
  `querySelectorAll('[data-region]')`.

## Sources

- Spec: `docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md`
- Plan: `docs/superpowers/plans/2026-09-28-pattern-examples-2a.md`
- [ADR-0012](0012-style-broll-style-kit.md), [ADR-0016](0016-shared-asset-library.md)
```

- [ ] **Step 2: Add EARS RD-03-57**

In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

old:
```md
  brief mencatat alasannya.

## Referensi
```

new:
```md
  brief mencatat alasannya.
- **RD-03-57** (Ubiquitous) — Contoh gaya shall ditambahkan lewat
  `style-examples/<gaya>/examples.json`; `index.html` dan `snapshots.json` host
  shall dihasilkan oleh `npm run style-examples -- build`, tidak ditulis tangan
  ([ADR-0017](../adr/0017-per-style-example-hosts.md)).

## Referensi
```

- [ ] **Step 3: Register ADR-0017 in the docs index (renumbers the entries after it)**

In `internal/docs/README.md` replace:

old:
```md
38. [adr/0016-shared-asset-library.md](adr/0016-shared-asset-library.md) - Pustaka aset bersama `vendor/asset-lib/` (ikon, doodle, kertas, peta, tekstur, scene, font), preset palet/tipografi, dan contact sheet.

```

new:
```md
38. [adr/0016-shared-asset-library.md](adr/0016-shared-asset-library.md) - Pustaka aset bersama `vendor/asset-lib/` (ikon, doodle, kertas, peta, tekstur, scene, font), preset palet/tipografi, dan contact sheet.
39. [adr/0017-per-style-example-hosts.md](adr/0017-per-style-example-hosts.md) - Satu host contoh per gaya di `style-examples/<gaya>/`, `index.html` + `snapshots.json` dihasilkan dari `examples.json`; tes cakupan pola.

```

In `internal/docs/README.md` replace:

old:
```md
### Design System & Frontend
39. [design-system/visual-system.md](design-system/visual-system.md) - Sistem visual: palet, tipografi, kartu, track/z-index, safe area, motion.
40. [frontend/composition-implementation.md](frontend/composition-implementation.md) - Starter Dena dan tata letak proyek per video.

```

new:
```md
### Design System & Frontend
40. [design-system/visual-system.md](design-system/visual-system.md) - Sistem visual: palet, tipografi, kartu, track/z-index, safe area, motion.
41. [frontend/composition-implementation.md](frontend/composition-implementation.md) - Starter Dena dan tata letak proyek per video.

```

In `internal/docs/README.md` replace:

old:
```md
### Operations
41. [operations/runbook.md](operations/runbook.md) - Perintah harian: setup, dev, check, render, publish, transkripsi.
42. [operations/publish-runbook.md](operations/publish-runbook.md) - Menjalankan auto-publish R2/Repliz + kegagalan umum.
43. [operations/video-editing-workflow.md](operations/video-editing-workflow.md) - Operasional 4 fase + gate + ikhtisar per fase.
44. [operations/implementation-standard.md](operations/implementation-standard.md) - Alur perubahan, verifikasi wajib, Definition of Done.
45. [operations/agent-documentation-workflow.md](operations/agent-documentation-workflow.md) - Cara agent memakai docs sebagai SoT + Stop hook.
46. [operations/roadmap.md](operations/roadmap.md) - Rencana: imagegen fix, rilis open-source; arah produk draft.

```

new:
```md
### Operations
42. [operations/runbook.md](operations/runbook.md) - Perintah harian: setup, dev, check, render, publish, transkripsi.
43. [operations/publish-runbook.md](operations/publish-runbook.md) - Menjalankan auto-publish R2/Repliz + kegagalan umum.
44. [operations/video-editing-workflow.md](operations/video-editing-workflow.md) - Operasional 4 fase + gate + ikhtisar per fase.
45. [operations/implementation-standard.md](operations/implementation-standard.md) - Alur perubahan, verifikasi wajib, Definition of Done.
46. [operations/agent-documentation-workflow.md](operations/agent-documentation-workflow.md) - Cara agent memakai docs sebagai SoT + Stop hook.
47. [operations/roadmap.md](operations/roadmap.md) - Rencana: imagegen fix, rilis open-source; arah produk draft.

```

In `internal/docs/README.md` replace:

old:
```md
### Security
47. [security/security-standard.md](security/security-standard.md) - Aturan secret, model kredensial publish, secret scan.
48. [security/audit-2026-07-20.md](security/audit-2026-07-20.md) - Audit awal: tidak ada secret asli ter-track (pass).

```

new:
```md
### Security
48. [security/security-standard.md](security/security-standard.md) - Aturan secret, model kredensial publish, secret scan.
49. [security/audit-2026-07-20.md](security/audit-2026-07-20.md) - Audit awal: tidak ada secret asli ter-track (pass).

```

In `internal/docs/README.md` replace:

old:
```md
| Transkripsi & setup (EARS) | [requirements/rd-04-transcription-setup](requirements/rd-04-transcription-setup.md) |
| Keputusan arsitektur | [adr/](adr/) (0001–0016) |
| Sistem visual video | [design-system/visual-system](design-system/visual-system.md) |
```

new:
```md
| Transkripsi & setup (EARS) | [requirements/rd-04-transcription-setup](requirements/rd-04-transcription-setup.md) |
| Keputusan arsitektur | [adr/](adr/) (0001–0017) |
| Sistem visual video | [design-system/visual-system](design-system/visual-system.md) |
```

- [ ] **Step 4: Write the failing generator tests**

Create `scripts/style-examples.test.mjs`:

```js
// Per-style example hosts (spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md):
// generated hosts are up to date, every composition is in its manifest, every example asset is tracked,
// and the generator lays clips out as documented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHosts, checkManifest, EXAMPLES, hostHtml, layout, PREFIX, readManifest, snapshots, STYLES } from './lib/style-examples.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('layout starts at 0.5 s with 0.5 s gaps; stills become sorted host times', () => {
  const m = { style: 'vox', examples: [
    { clip: 'vx-01-a', duration: 4, treatment: 'cutaway', stills: [1, 3.5] },
    { clip: 'vx-02-b', duration: 6, treatment: 'split', stills: [0.25] },
  ] };
  assert.deepEqual(layout(m).map((e) => e.start), [0.5, 5]);
  assert.deepEqual(snapshots(m).at, [1.5, 4, 5.25]);
});

test('the host slides the base video only for split clips and adds cutout / front layers when asked', () => {
  const html = hostHtml({ style: 'mix-media', examples: [
    { clip: 'mm-01-a', duration: 5, treatment: 'collage', stills: [1], cutout: true, front: true },
    { clip: 'mm-02-b', duration: 4, treatment: 'split', stills: [1] },
  ] });
  assert.match(html, /<video id="mm-01-cut" class="clip cutout sk-sticker-cut" src="assets\/placeholder-cutout\.webm" muted playsinline\s+data-start="0\.5" data-duration="5" data-track-index="6">/);
  assert.match(html, /id="mm-01-a-front-mount" class="broll-front" data-composition-id="mm-01-a-front" data-composition-src="compositions\/mm-01-a-front\.html"\s+data-start="0\.5" data-duration="5" data-track-index="7"/);
  assert.match(html, /tl\.fromTo\('#base-video', \{ y: 0 \}, \{ y: 480, duration: 0\.45, ease: 'power3\.inOut' \}, 6\);/);
  assert.match(html, /tl\.to\('#base-video', \{ y: 0, duration: 0\.45, ease: 'power3\.inOut' \}, 9\.55\);/);
  assert.equal((html.match(/#base-video', \{ y: 0 \}/g) || []).length, 1, 'only the split clip slides the base video');
  assert.match(html, /data-composition-id="style-examples-mix-media" data-start="0" data-width="1080" data-height="1920" data-duration="10"/);
});

test('checkManifest rejects a wrong prefix, an unknown treatment, and stills outside the clip', () => {
  const ok = { clip: 'tx-01-a', duration: 4, treatment: 'cutaway', stills: [1] };
  assert.throws(() => checkManifest({ style: 'broll-text', examples: [{ ...ok, clip: 'mg-01-a' }] }), /starts with "tx-"/);
  assert.throws(() => checkManifest({ style: 'broll-text', examples: [{ ...ok, treatment: 'overlay' }] }), /unknown treatment/);
  assert.throws(() => checkManifest({ style: 'broll-text', examples: [{ ...ok, stills: [4] }] }), /inside the clip/);
  assert.equal(PREFIX['broll-text'], 'tx');
});
```

Run:

```bash
node --test scripts/style-examples.test.mjs 2>&1 | tail -3
```

Expected: FAIL: `Cannot find module …/scripts/lib/style-examples.mjs`.

- [ ] **Step 5: Write the generator**

Create `scripts/lib/style-examples.mjs`:

```js
// Per-style example hosts (spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md).
// Each style has docs/agents/references/style-examples/<style>/examples.json; buildHosts(root) turns
// every manifest into that folder's index.html and snapshots.json. Pure: the CLI writes the files,
// the test compares them with disk. Node 22+, built-in modules only (ADR-0007).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const EXAMPLES = 'docs/agents/references/style-examples';
export const STYLES = ['broll-text', 'motion-graphic', 'whiteboard', 'stop-motion', 'vox', 'mix-media', 'parallax'];
export const PREFIX = { 'broll-text': 'tx', 'motion-graphic': 'mg', whiteboard: 'wb', 'stop-motion': 'sm', vox: 'vx', 'mix-media': 'mm', parallax: 'px' };
export const TREATMENTS = ['cutaway', 'split', 'panel', 'collage', 'parallax-stage'];
const GAP = 0.5; // seconds between clips (and before the first)
const r3 = (n) => Math.round(n * 1000) / 1000;

export function readManifest(root, style) {
  const f = join(root, EXAMPLES, style, 'examples.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
}

export function checkManifest(m) {
  if (!STYLES.includes(m.style)) throw new Error(`examples.json: unknown style "${m.style}"`);
  const seen = new Set();
  for (const e of m.examples) {
    if (!e.clip.startsWith(PREFIX[m.style] + '-')) throw new Error(`${e.clip}: a ${m.style} clip starts with "${PREFIX[m.style]}-"`);
    if (seen.has(e.clip)) throw new Error(`${e.clip}: listed twice`);
    seen.add(e.clip);
    if (!(e.duration > 0)) throw new Error(`${e.clip}: needs duration > 0`);
    if (!TREATMENTS.includes(e.treatment)) throw new Error(`${e.clip}: unknown treatment "${e.treatment}"`);
    if (!e.stills?.length || e.stills.some((s) => !(s >= 0 && s < e.duration))) throw new Error(`${e.clip}: stills must be clip-local times inside the clip`);
  }
  return m;
}

// start time of every clip: the first at GAP, each next GAP after the previous one ends
export function layout(m) {
  let t = GAP;
  return m.examples.map((e) => { const start = r3(t); t = r3(t + e.duration + GAP); return { ...e, start }; });
}

export function snapshots(m) {
  return { at: layout(m).flatMap((e) => e.stills.map((s) => r3(e.start + s))).sort((a, b) => a - b) };
}

const cutId = (clip) => clip.split('-').slice(0, 2).join('-') + '-cut';

export function hostHtml(m) {
  const clips = layout(m);
  const total = r3(clips.at(-1).start + clips.at(-1).duration);
  const mount = (id, cls, start, dur, track) => `      <div id="${id}-mount" class="${cls}" data-composition-id="${id}" data-composition-src="compositions/${id}.html"
           data-start="${start}" data-duration="${dur}" data-track-index="${track}" data-width="1080" data-height="1920"></div>`;
  const body = clips.flatMap((e) => [
    mount(e.clip, 'broll', e.start, e.duration, 4),
    ...(e.cutout ? [`      <video id="${cutId(e.clip)}" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline
             data-start="${e.start}" data-duration="${e.duration}" data-track-index="6"></video>`] : []),
    ...(e.front ? [mount(e.clip + '-front', 'broll-front', e.start, e.duration, 7)] : []),
  ]).join('\n');
  const splits = clips.filter((e) => e.treatment === 'split');
  const tweens = splits.map((e) => `      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, ${e.start});
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, ${r3(e.start + e.duration - 0.45)});`).join('\n');
  return `<!doctype html>
<html lang="id">
  <head>
    <!-- GENERATED by \`npm run style-examples -- build\` from examples.json; do not edit. vendor/ and assets/ are copied in by scripts/check-broll-examples.mjs. -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="vendor/gsap.min.js"></script>
    <script src="vendor/motion-kit/motion-kit.js"></script>
    <script src="vendor/style-kit/style-kit.js"></script>
    <script src="vendor/asset-lib/asset-lib.js"></script>
    <link rel="stylesheet" href="vendor/motion-kit/motion-kit.css" />
    <link rel="stylesheet" href="vendor/style-kit/style-kit.css" />
    <link rel="stylesheet" href="vendor/paper-pack/paper-pack.css" />
    <link rel="stylesheet" href="vendor/asset-lib/asset-lib.css" />
    <style>
      body { margin: 0; background: #050505; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #050505; }
      #base-video { position: absolute; inset: 0; background: #3f3f46; z-index: 1; }
      #face { position: absolute; left: 290px; top: 700px; width: 500px; height: 560px; border-radius: 240px; background: #52525b; }
      #face-label { position: absolute; left: 0; right: 0; top: 1300px; text-align: center; font: 600 32px Arial, sans-serif; color: #d4d4d8; }
      .broll { position: absolute; inset: 0; z-index: 22; }
      /* mix-media: matted speaker (track 6) above the collage, front layer (track 7) above the speaker */
      .cutout { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 24; object-fit: cover; }
      .broll-front { position: absolute; inset: 0; z-index: 26; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="style-examples-${m.style}" data-start="0" data-width="1080" data-height="1920" data-duration="${total}">
      <div id="base-video" class="clip" data-start="0" data-duration="${total}" data-track-index="1">
        <div id="face"></div>
        <div id="face-label">placeholder wajah</div>
      </div>
${body}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${tweens ? `      // Split treatment: slide the base video into the bottom half for the clip, then back.\n${tweens}\n` : ''}      // Collage and parallax-stage clips are opaque full-frame backdrops; never tween #base-video opacity.
      window.__timelines['style-examples-${m.style}'] = tl;
    </script>
  </body>
</html>
`;
}

export function buildHosts(root) {
  const out = {};
  for (const style of STYLES) {
    const m = readManifest(root, style);
    if (!m) continue;
    checkManifest(m);
    out[`${EXAMPLES}/${style}/index.html`] = hostHtml(m);
    out[`${EXAMPLES}/${style}/snapshots.json`] = JSON.stringify(snapshots(m)) + '\n';
  }
  return out;
}
```

The `<head>` block and CSS are copied verbatim from the old `style-examples/index.html`; any change there breaks the pixel proof in Task 2.

- [ ] **Step 6: Write the CLI and the per-style check**

Create `scripts/style-examples.mjs`:

```js
#!/usr/bin/env node
// Per-style example hosts (spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md).
//   npm run style-examples -- build   examples.json → index.html + snapshots.json for every style
//   npm run style-examples -- check   exit 1 when a generated host is stale
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildHosts } from './lib/style-examples.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const cmd = process.argv[2];
try {
  const files = buildHosts(root);
  if (cmd === 'build') {
    for (const [p, c] of Object.entries(files)) { writeFileSync(resolve(root, p), c); console.log('wrote', p); }
  } else if (cmd === 'check') {
    const stale = Object.entries(files).filter(([p, c]) => !existsSync(resolve(root, p)) || readFileSync(resolve(root, p), 'utf8') !== c).map(([p]) => p);
    if (stale.length) { console.error('stale (run: npm run style-examples -- build):\n  ' + stale.join('\n  ')); process.exit(1); }
    console.log('example hosts are up to date');
  } else throw new Error('usage: style-examples <build|check>');
} catch (e) { console.error(e.message); process.exit(1); }
```

Create `scripts/check-style-examples.mjs`:

```js
#!/usr/bin/env node
// Lint, validate, and snapshot the per-style example hosts (all, or the one style given):
//   npm run check:style-examples [-- <style>]   → renders/style-examples/<style>/
// Spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md. Node 22+, built-ins only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { EXAMPLES, STYLES } from './lib/style-examples.mjs';

const only = process.argv[2];
if (only && !STYLES.includes(only)) { console.error(`unknown style "${only}" (one of: ${STYLES.join(', ')})`); process.exit(1); }
for (const style of only ? [only] : STYLES) {
  console.log(`\n== ${style}`);
  const r = spawnSync('node', ['scripts/check-broll-examples.mjs', `${EXAMPLES}/${style}`, `style-examples/${style}`], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
```

- [ ] **Step 7: Copy the shared example assets into the temporary check project**

In `scripts/check-broll-examples.mjs` replace:

old:
```js
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
```

new:
```js
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
```

In `scripts/check-broll-examples.mjs` replace:

old:
```js
  cpSync('vendor/asset-lib', join(dir, 'vendor/asset-lib'), { recursive: true, filter: (f) => !f.includes('/src') });
  const { at } = JSON.parse(readFileSync(join(SRC, 'snapshots.json'), 'utf8'));
```

new:
```js
  cpSync('vendor/asset-lib', join(dir, 'vendor/asset-lib'), { recursive: true, filter: (f) => !f.includes('/src') });
  // per-style example hosts share one assets/ folder next to them (docs/agents/references/style-examples/assets)
  const shared = join(SRC, '..', 'assets');
  if (!existsSync(join(SRC, 'assets')) && existsSync(shared)) cpSync(shared, join(dir, 'assets'), { recursive: true });
  const { at } = JSON.parse(readFileSync(join(SRC, 'snapshots.json'), 'utf8'));
```

- [ ] **Step 8: Add the npm scripts**

In `package.json` replace:

old:
```json
    "test:motion-kit": "node --test scripts/motion-kit.test.mjs",
    "test:style-kit": "node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs",
    "test:asset-lib": "node --test scripts/asset-lib.test.mjs",
```

new:
```json
    "test:motion-kit": "node --test scripts/motion-kit.test.mjs",
    "test:style-kit": "node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs scripts/style-examples.test.mjs",
    "style-examples": "node scripts/style-examples.mjs",
    "test:asset-lib": "node --test scripts/asset-lib.test.mjs",
```

- [ ] **Step 9: Run the tests**

Run:

```bash
node --test scripts/style-examples.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `pass 3`, `fail 0`.

- [ ] **Step 10: Commit**

Run:

```bash
git add internal/docs/adr/0017-per-style-example-hosts.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/README.md scripts/style-examples.test.mjs scripts/lib/style-examples.mjs scripts/style-examples.mjs scripts/check-style-examples.mjs scripts/check-broll-examples.mjs package.json && git status --short && git commit -q -F - <<'MSG'
feat: generate per-style example hosts from examples.json

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above (plus renames); the commit succeeds.

---

### Task 2: Move the 32 example files into seven hosts and prove them pixel-identical

**Files:**
- Move: `docs/agents/references/style-examples/compositions/*.html` → `style-examples/<style>/compositions/` (32 files)
- Create: `style-examples/<style>/examples.json`, `hyperframes.json` (copy); generated `index.html`, `snapshots.json`
- Delete: `style-examples/index.html`, `snapshots.json`, `hyperframes.json`
- Modify: `scripts/style-docs.test.mjs`, `scripts/style-examples.test.mjs`, `package.json`
- Modify: the seven `docs/agents/references/styles/*.md` (example paths), `styles/README.md`, `AGENTS.md`, `CLAUDE.md`, `internal/docs/operations/runbook.md`

**Interfaces:**
- Consumes: `buildHosts` and the CLI from Task 1.
- Produces: seven hosts whose clips start at 0.5 s with 0.5 s gaps; root id and timeline `style-examples-<style>`.

- [ ] **Step 1: Move the compositions and split the project file**

Run:

```bash
cd docs/agents/references/style-examples && for pair in \
  broll-text:tx \
  motion-graphic:mg \
  whiteboard:wb \
  stop-motion:sm \
  vox:vx \
  mix-media:mm \
  parallax:px; do
  st=${pair%%:*}; p=${pair##*:}; mkdir -p "$st/compositions"
  for f in compositions/$p-*.html; do git mv "$f" "$st/compositions/"; done
  cp hyperframes.json "$st/hyperframes.json"
done && git rm -q index.html snapshots.json hyperframes.json && ls compositions 2>/dev/null | wc -l; cd - >/dev/null
```

Expected: `0` (the old `compositions/` folder is empty and gone).

- [ ] **Step 2: Write the seven manifests**

`stills` are the old clip-local still times, so every old still maps to exactly one new still.

Create `docs/agents/references/style-examples/broll-text/examples.json`:

```json
{
  "style": "broll-text",
  "examples": [
    {"clip": "tx-01-slam", "duration": 4, "treatment": "cutaway", "stills": [0.7, 3.7]},
    {"clip": "tx-02-quote-split", "duration": 6, "treatment": "split", "stills": [2.0, 5.7]},
    {"clip": "tx-03-word-swap", "duration": 4.5, "treatment": "panel", "stills": [2.0, 4.1]},
    {"clip": "tx-04-stack", "duration": 5, "treatment": "cutaway", "stills": [1.5, 4.7]}
  ]
}
```

Create `docs/agents/references/style-examples/motion-graphic/examples.json`:

```json
{
  "style": "motion-graphic",
  "examples": [
    {"clip": "mg-01-count", "duration": 5.5, "treatment": "cutaway", "stills": [1.2, 5.2]},
    {"clip": "mg-02-compare-bars", "duration": 6, "treatment": "split", "stills": [1.5, 5.7]},
    {"clip": "mg-03-icon-grid", "duration": 6, "treatment": "cutaway", "stills": [1.0, 5.7]},
    {"clip": "mg-04-arrow-flow", "duration": 6, "treatment": "panel", "stills": [2.0, 5.7]}
  ]
}
```

Create `docs/agents/references/style-examples/whiteboard/examples.json`:

```json
{
  "style": "whiteboard",
  "examples": [
    {"clip": "wb-01-flow", "duration": 6, "treatment": "cutaway", "stills": [2.0, 5.7]},
    {"clip": "wb-02-framework-panel", "duration": 6, "treatment": "panel", "stills": [2.0, 5.7]},
    {"clip": "wb-03-mind-map", "duration": 7, "treatment": "split", "stills": [2.5, 6.7]},
    {"clip": "wb-04-cross-out", "duration": 6, "treatment": "cutaway", "stills": [2.9, 5.7]},
    {"clip": "wb-05-hand", "duration": 6, "treatment": "cutaway", "stills": [2.0, 5.1, 5.9]}
  ]
}
```

Create `docs/agents/references/style-examples/stop-motion/examples.json`:

```json
{
  "style": "stop-motion",
  "examples": [
    {"clip": "sm-01-slide-pin", "duration": 6, "treatment": "cutaway", "stills": [2.8, 5.7]},
    {"clip": "sm-02-tear-split", "duration": 6, "treatment": "split", "stills": [1.5, 5.7]},
    {"clip": "sm-03-replace-panel", "duration": 5, "treatment": "panel", "stills": [1.8, 4.7]},
    {"clip": "sm-04-stack-crumple", "duration": 6, "treatment": "cutaway", "stills": [2.2, 5.7]}
  ]
}
```

Create `docs/agents/references/style-examples/vox/examples.json`:

```json
{
  "style": "vox",
  "examples": [
    {"clip": "vx-01-illustrative", "duration": 5, "treatment": "cutaway", "stills": [2.4, 4.7]},
    {"clip": "vx-02-capture-split", "duration": 6, "treatment": "split", "stills": [2.4, 5.7]},
    {"clip": "vx-03-map-pin", "duration": 5, "treatment": "cutaway", "stills": [1.7, 4.7]},
    {"clip": "vx-04-clipping-panel", "duration": 5, "treatment": "panel", "stills": [1.9, 4.7]}
  ]
}
```

Create `docs/agents/references/style-examples/mix-media/examples.json`:

```json
{
  "style": "mix-media",
  "examples": [
    {"clip": "mm-01-collage-doodle", "duration": 5, "treatment": "collage", "stills": [2.1, 4.7], "cutout": true},
    {"clip": "mm-02-orbit-arrow", "duration": 6, "treatment": "collage", "stills": [3.6, 5.7], "cutout": true, "front": true},
    {"clip": "mm-03-torn-window", "duration": 6, "treatment": "collage", "stills": [0.8, 5.7], "cutout": true, "front": true},
    {"clip": "mm-04-polaroid-caption", "duration": 5, "treatment": "collage", "stills": [1.8, 4.7], "cutout": true, "front": true}
  ]
}
```

Create `docs/agents/references/style-examples/parallax/examples.json`:

```json
{
  "style": "parallax",
  "examples": [
    {"clip": "px-01-collage-dolly", "duration": 5, "treatment": "cutaway", "stills": [1.5, 4.7]},
    {"clip": "px-02-night-desk", "duration": 6, "treatment": "split", "stills": [1.8, 5.7]},
    {"clip": "px-03-archive-zoom", "duration": 5, "treatment": "panel", "stills": [1.2, 2.7, 4.7]},
    {"clip": "px-04-stage", "duration": 6, "treatment": "parallax-stage", "stills": [2.0, 5.5], "cutout": true}
  ]
}
```

- [ ] **Step 3: Generate the hosts**

Run:

```bash
npm run -s style-examples -- build | wc -l && npm run -s style-examples -- check
```

Expected: `14`, then `example hosts are up to date`.

- [ ] **Step 4: Point `check:style-examples` at the per-style check**

In `package.json` replace:

old:
```json
    "check:broll-examples": "node scripts/check-broll-examples.mjs",
    "check:style-examples": "node scripts/check-broll-examples.mjs docs/agents/references/style-examples style-examples",
    "test:render-blur": "node --test scripts/render-blur.test.mjs",
```

new:
```json
    "check:broll-examples": "node scripts/check-broll-examples.mjs",
    "check:style-examples": "node scripts/check-style-examples.mjs",
    "test:render-blur": "node --test scripts/render-blur.test.mjs",
```

- [ ] **Step 5: Render the seven hosts and compare with the baseline**

Create `/tmp/examples-2a/still-map.json`:

```json
[{"old_at":1.2,"style":"broll-text","clip":"tx-01-slam","local":0.7},{"old_at":4.2,"style":"broll-text","clip":"tx-01-slam","local":3.7},{"old_at":7.0,"style":"broll-text","clip":"tx-02-quote-split","local":2.0},{"old_at":10.7,"style":"broll-text","clip":"tx-02-quote-split","local":5.7},{"old_at":13.5,"style":"broll-text","clip":"tx-03-word-swap","local":2.0},{"old_at":15.6,"style":"broll-text","clip":"tx-03-word-swap","local":4.1},{"old_at":18.0,"style":"broll-text","clip":"tx-04-stack","local":1.5},{"old_at":21.2,"style":"broll-text","clip":"tx-04-stack","local":4.7},{"old_at":23.2,"style":"motion-graphic","clip":"mg-01-count","local":1.2},{"old_at":27.2,"style":"motion-graphic","clip":"mg-01-count","local":5.2},{"old_at":29.5,"style":"motion-graphic","clip":"mg-02-compare-bars","local":1.5},{"old_at":33.7,"style":"motion-graphic","clip":"mg-02-compare-bars","local":5.7},{"old_at":35.5,"style":"motion-graphic","clip":"mg-03-icon-grid","local":1.0},{"old_at":40.2,"style":"motion-graphic","clip":"mg-03-icon-grid","local":5.7},{"old_at":43.0,"style":"motion-graphic","clip":"mg-04-arrow-flow","local":2.0},{"old_at":46.7,"style":"motion-graphic","clip":"mg-04-arrow-flow","local":5.7},{"old_at":49.5,"style":"whiteboard","clip":"wb-01-flow","local":2.0},{"old_at":53.2,"style":"whiteboard","clip":"wb-01-flow","local":5.7},{"old_at":56.0,"style":"whiteboard","clip":"wb-02-framework-panel","local":2.0},{"old_at":59.7,"style":"whiteboard","clip":"wb-02-framework-panel","local":5.7},{"old_at":63.0,"style":"whiteboard","clip":"wb-03-mind-map","local":2.5},{"old_at":67.2,"style":"whiteboard","clip":"wb-03-mind-map","local":6.7},{"old_at":70.9,"style":"whiteboard","clip":"wb-04-cross-out","local":2.9},{"old_at":73.7,"style":"whiteboard","clip":"wb-04-cross-out","local":5.7},{"old_at":77.3,"style":"stop-motion","clip":"sm-01-slide-pin","local":2.8},{"old_at":80.2,"style":"stop-motion","clip":"sm-01-slide-pin","local":5.7},{"old_at":82.5,"style":"stop-motion","clip":"sm-02-tear-split","local":1.5},{"old_at":86.7,"style":"stop-motion","clip":"sm-02-tear-split","local":5.7},{"old_at":89.3,"style":"stop-motion","clip":"sm-03-replace-panel","local":1.8},{"old_at":92.2,"style":"stop-motion","clip":"sm-03-replace-panel","local":4.7},{"old_at":95.2,"style":"stop-motion","clip":"sm-04-stack-crumple","local":2.2},{"old_at":98.7,"style":"stop-motion","clip":"sm-04-stack-crumple","local":5.7},{"old_at":101.5,"style":"whiteboard","clip":"wb-05-hand","local":2.0},{"old_at":104.6,"style":"whiteboard","clip":"wb-05-hand","local":5.1},{"old_at":105.4,"style":"whiteboard","clip":"wb-05-hand","local":5.9},{"old_at":108.9,"style":"vox","clip":"vx-01-illustrative","local":2.4},{"old_at":111.2,"style":"vox","clip":"vx-01-illustrative","local":4.7},{"old_at":114.4,"style":"vox","clip":"vx-02-capture-split","local":2.4},{"old_at":117.7,"style":"vox","clip":"vx-02-capture-split","local":5.7},{"old_at":120.2,"style":"vox","clip":"vx-03-map-pin","local":1.7},{"old_at":123.2,"style":"vox","clip":"vx-03-map-pin","local":4.7},{"old_at":125.9,"style":"vox","clip":"vx-04-clipping-panel","local":1.9},{"old_at":128.7,"style":"vox","clip":"vx-04-clipping-panel","local":4.7},{"old_at":131.6,"style":"mix-media","clip":"mm-01-collage-doodle","local":2.1},{"old_at":134.2,"style":"mix-media","clip":"mm-01-collage-doodle","local":4.7},{"old_at":138.6,"style":"mix-media","clip":"mm-02-orbit-arrow","local":3.6},{"old_at":140.7,"style":"mix-media","clip":"mm-02-orbit-arrow","local":5.7},{"old_at":142.3,"style":"mix-media","clip":"mm-03-torn-window","local":0.8},{"old_at":147.2,"style":"mix-media","clip":"mm-03-torn-window","local":5.7},{"old_at":149.8,"style":"mix-media","clip":"mm-04-polaroid-caption","local":1.8},{"old_at":152.7,"style":"mix-media","clip":"mm-04-polaroid-caption","local":4.7},{"old_at":155.0,"style":"parallax","clip":"px-01-collage-dolly","local":1.5},{"old_at":158.2,"style":"parallax","clip":"px-01-collage-dolly","local":4.7},{"old_at":160.8,"style":"parallax","clip":"px-02-night-desk","local":1.8},{"old_at":164.7,"style":"parallax","clip":"px-02-night-desk","local":5.7},{"old_at":166.7,"style":"parallax","clip":"px-03-archive-zoom","local":1.2},{"old_at":168.2,"style":"parallax","clip":"px-03-archive-zoom","local":2.7},{"old_at":170.2,"style":"parallax","clip":"px-03-archive-zoom","local":4.7},{"old_at":173.0,"style":"parallax","clip":"px-04-stage","local":2.0},{"old_at":176.5,"style":"parallax","clip":"px-04-stage","local":5.5}]
```

Create `/tmp/examples-2a/pixcheck.cjs`:

```js
// migrated stills vs the main baseline: identical, or ≤ 1 per channel on ≤ 0.001% of values
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [map, base] = [JSON.parse(fs.readFileSync(process.argv[2])), process.argv[3]];
const raw = (f) => execFileSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1e8 });
import(path.resolve('scripts/lib/style-examples.mjs')).then(({ layout, readManifest, snapshots }) => {
  const r3 = (n) => Math.round(n * 1000) / 1000; let same = 0, near = 0; const bad = [];
  for (const m of map) {
    const man = readManifest(process.cwd(), m.style), e = layout(man).find((x) => x.clip === m.clip);
    const idx = snapshots(man).at.indexOf(r3(e.start + m.local)), dir = `renders/style-examples/${m.style}`;
    const nf = fs.readdirSync(dir).find((f) => f.startsWith(`frame-${String(idx).padStart(2, '0')}-`));
    const of = fs.readdirSync(base).find((f) => f.endsWith(`-at-${m.old_at.toFixed(1)}s.png`));
    const a = fs.readFileSync(path.join(dir, nf)), b = fs.readFileSync(path.join(base, of));
    if (Buffer.compare(a, b) === 0) { same++; continue; }
    const x = raw(path.join(dir, nf)), y = raw(path.join(base, of)); let n = 0, mx = 0;
    for (let i = 0; i < x.length; i++) { const d = Math.abs(x[i] - y[i]); if (d) { n++; mx = Math.max(mx, d); } }
    if (mx <= 1 && n <= x.length * 1e-5) near++; else bad.push(`${m.clip}@${m.local}: ${n} values, max ${mx}`);
  }
  console.log(`identical ${same}, within ±1 ${near}, different ${bad.length}`, bad);
  process.exit(bad.length ? 1 : 0);
});
```

Run:

```bash
npm run check:style-examples && node /tmp/examples-2a/pixcheck.cjs /tmp/examples-2a/still-map.json /tmp/examples-2a/baseline
```

Expected: every host `0 errors`; then `identical 59, within ±1 1, different 0 []` (the ±1 still is sm-01 at local 5.7 s: two channel values off by one from float local time, `80.2 − 74.5` vs `6.2 − 0.5`). Any `different` entry: stop — the host head or CSS drifted from the old host.

- [ ] **Step 6: Point the style-doc test at the per-style hosts**

In `scripts/style-docs.test.mjs` replace:

old:
```js
      const path = r.match(/`(style-examples\/compositions\/[^`]+)`/)[1];
```

new:
```js
      const path = r.match(/`(style-examples\/[a-z-]+\/compositions\/[^`]+)`/)[1];
      assert.ok(path.startsWith(`style-examples/${s.file.replace('.md', '')}/compositions/`), `${path} is not in the ${s.file.replace('.md', '')} host`);
```

Delete the two single-host tests at the end of the file (Step 7 adds per-host versions):

In `scripts/style-docs.test.mjs` replace:

old:
```js

test('every example clip on disk is mounted in the example host, and every mount exists', () => {
  const host = readFileSync(new URL('style-examples/index.html', REF), 'utf8');
  const clips = [...host.matchAll(/data-composition-src="compositions\/([^"]+)"/g)].map((m) => m[1]);
  const onDisk = readdirSync(new URL('style-examples/compositions/', REF)).filter((f) => f.endsWith('.html'));
  assert.deepEqual([...clips].sort(), [...onDisk].sort());
  assert.equal(clips.length, 32);
});

test('every asset the examples reference is tracked in git', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const base = 'docs/agents/references/style-examples/';
  const tracked = new Set(execFileSync('git', ['ls-files', base], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean));
  const pages = ['index.html', ...readdirSync(new URL('style-examples/compositions/', REF)).map((f) => 'compositions/' + f)];
  for (const page of pages) {
    const html = readFileSync(new URL('style-examples/' + page, REF), 'utf8');
    for (const [, ref] of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) assert.ok(tracked.has(base + ref), `${ref} (in ${page}) is not tracked in git`);
  }
});
```

new:
(nothing — delete the old block)

- [ ] **Step 7: Add the on-disk host tests**

Append to `scripts/style-examples.test.mjs`:

```js
test('every style has an example host, and the generated files match (run: npm run style-examples -- build)', () => {
  for (const style of STYLES) assert.ok(readManifest(ROOT, style), `${style}/examples.json is missing`);
  for (const [p, c] of Object.entries(buildHosts(ROOT))) assert.equal(read(p), c, `${p} is stale`);
  assert.ok(!existsSync(join(ROOT, EXAMPLES, 'index.html')), 'the old single host must be gone');
});

test('every composition on disk is in its manifest (clip or -front) and every listed one exists', () => {
  for (const style of STYLES) {
    const m = readManifest(ROOT, style);
    const want = m.examples.flatMap((e) => [e.clip, ...(e.front ? [e.clip + '-front'] : [])]).map((c) => c + '.html').sort();
    const have = readdirSync(join(ROOT, EXAMPLES, style, 'compositions')).filter((f) => f.endsWith('.html')).sort();
    assert.deepEqual(have, want, style);
  }
});

test('every asset an example references exists and is tracked in git', () => {
  const tracked = new Set(execFileSync('git', ['ls-files', EXAMPLES], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));
  for (const style of STYLES) {
    const dir = `${EXAMPLES}/${style}`;
    for (const page of ['index.html', ...readdirSync(join(ROOT, dir, 'compositions')).map((f) => 'compositions/' + f)]) {
      for (const [, ref] of read(`${dir}/${page}`).matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
        assert.ok(tracked.has(`${EXAMPLES}/${ref}`), `${ref} (in ${style}/${page}) is not tracked in git`);
      }
    }
  }
});
```

- [ ] **Step 8: Update the example paths and commands in the docs**

Run:

```bash
for st in broll-text motion-graphic whiteboard stop-motion vox mix-media parallax; do sed -i '' "s#| \`style-examples/compositions/#| \`style-examples/$st/compositions/#" docs/agents/references/styles/$st.md; done && grep -c "style-examples/compositions/" docs/agents/references/styles/*.md | grep -v ":0" | wc -l
```

Expected: `0`.

In `docs/agents/references/styles/broll-text.md` replace:

old:
```md
`docs/agents/references/style-examples/`
(`tx-01` … `tx-04`, `npm run check:style-examples`
```

new:
```md
`docs/agents/references/style-examples/broll-text/`
(`tx-01` … `tx-04`, `npm run check:style-examples -- broll-text`
```

In `docs/agents/references/styles/motion-graphic.md` replace:

old:
```md
`docs/agents/references/style-examples/` (`mg-01` … `mg-04`,
`npm run check:style-examples`
```

new:
```md
`docs/agents/references/style-examples/motion-graphic/` (`mg-01` … `mg-04`,
`npm run check:style-examples -- motion-graphic`
```

In `docs/agents/references/styles/whiteboard.md` replace:

old:
```md
`docs/agents/references/style-examples/` (`wb-01` … `wb-04`,
`npm run check:style-examples`
```

new:
```md
`docs/agents/references/style-examples/whiteboard/` (`wb-01` … `wb-04`,
`npm run check:style-examples -- whiteboard`
```

In `docs/agents/references/styles/stop-motion.md` replace:

old:
```md
`docs/agents/references/style-examples/` (`sm-01` … `sm-04`,
`npm run check:style-examples`
```

new:
```md
`docs/agents/references/style-examples/stop-motion/` (`sm-01` … `sm-04`,
`npm run check:style-examples -- stop-motion`
```

In `docs/agents/references/styles/vox.md` replace:

old:
```md
`docs/agents/references/style-examples/` (`vx-01` … `vx-04`,
`npm run check:style-examples`
```

new:
```md
`docs/agents/references/style-examples/vox/` (`vx-01` … `vx-04`,
`npm run check:style-examples -- vox`
```

In `docs/agents/references/styles/mix-media.md` replace:

old:
```md
`docs/agents/references/style-examples/` (`mm-01` … `mm-04`, with a
placeholder silhouette instead of a real person; `npm run check:style-examples`
```

new:
```md
`docs/agents/references/style-examples/mix-media/` (`mm-01` … `mm-04`, with a
placeholder silhouette instead of a real person; `npm run check:style-examples -- mix-media`
```

In `docs/agents/references/styles/parallax.md` replace:

old:
```md
`docs/agents/references/style-examples/` (`px-01` …
`px-04`, `npm run check:style-examples`
```

new:
```md
`docs/agents/references/style-examples/parallax/` (`px-01` …
`px-04`, `npm run check:style-examples -- parallax`
```

In `docs/agents/references/styles/README.md` replace:

old:
```md
Worked examples: `docs/agents/references/style-examples/`
(`npm run check:style-examples`). Decision record: ADR-0012.
```

new:
```md
Worked examples: one host per style in `docs/agents/references/style-examples/<style>/`
(`npm run check:style-examples [-- <style>]`). Decision records: ADR-0012, ADR-0017.
```

In `docs/agents/references/styles/README.md` replace:

old:
```md
- Every file an example references must be tracked in git
```

new:
```md
- Examples: each style has a host in `style-examples/<style>/`. Its `index.html` and
  `snapshots.json` are GENERATED from `examples.json` (one line per example: `clip`,
  `duration`, `treatment`, clip-local `stills`, optional `cutout` / `front`); never
  edit them by hand. To add an example: write `compositions/<xx-NN-name>.html`, add
  its line to `examples.json`, run `npm run style-examples -- build`, then
  `npm run check:style-examples -- <style>` and look at the stills. Shared example
  media stays in `style-examples/assets/`.
- Every file an example references must be tracked in git
```

In `AGENTS.md` replace:

old:
```md
npm run check:style-examples   # lint + validate + snapshot style b-roll examples
```

new:
```md
npm run check:style-examples   # lint + validate + snapshot style b-roll examples (all 7 hosts; -- <style> for one)
npm run style-examples -- build # regenerate example hosts from each style's examples.json
```

In `CLAUDE.md` replace:

old:
```md
npm run check:style-examples   # lint + validate + snapshot style b-roll examples
```

new:
```md
npm run check:style-examples   # lint + validate + snapshot style b-roll examples (all 7 hosts; -- <style> for one)
npm run style-examples -- build # regenerate example hosts from each style's examples.json
```

In `internal/docs/operations/runbook.md` replace:

old:
```md
npm run check:style-examples # lint + validate + snapshot contoh style b-roll → renders/style-examples/
```

new:
```md
npm run check:style-examples # lint + validate + snapshot contoh style b-roll, satu host per gaya → renders/style-examples/<gaya>/ (-- <gaya> untuk satu)
npm run style-examples -- build # hasilkan ulang index.html + snapshots.json tiap host dari examples.json
```

- [ ] **Step 9: Run the suites**

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 10: Commit**

Run:

```bash
git add docs/agents/references/style-examples scripts/style-docs.test.mjs scripts/style-examples.test.mjs package.json docs/agents/references/styles AGENTS.md CLAUDE.md internal/docs/operations/runbook.md && git status --short && git commit -q -F - <<'MSG'
refactor: one generated example host per style (pixel-identical)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above (plus renames); the commit succeeds.

---

### Task 3: `SK.typeOn`, `SK.shake`, `SK.arcPath`

**Files:**
- Modify: `scripts/style-kit.test.mjs`, `vendor/style-kit/style-kit.js`, `vendor/style-kit/style-kit.css`

**Interfaces:**
- Produces: `SK.typeOn(el, text, u, { caret = true, t })` → characters shown (writes `innerHTML` only when it changes; caret `<span class="sk-caret">` blinks with `t`); `SK.shake(t, t0, { amp = 10, dur = 0.3, freq = 30 })` → `{ x, y, r }`, zero outside `[t0, t0 + dur]`; `SK.arcPath(p0, p1, bend = 0.25)` → `M… Q… …` (one decimal).

- [ ] **Step 1: Write the failing tests**

Append to `scripts/style-kit.test.mjs`:

```js
test('typeOn writes the first ceil(u × length) characters, escapes HTML, and blinks the caret', () => {
  const { SK } = load();
  const el = { innerHTML: '' };
  assert.equal(SK.typeOn(el, 'a<b>', 0.5, { t: 0.2 }), 2);
  assert.equal(el.innerHTML, 'a&lt;<span class="sk-caret"></span>');
  assert.equal(SK.typeOn(el, 'a<b>', 1, { t: 0.7 }), 4);
  assert.equal(el.innerHTML, 'a&lt;b&gt;', 'caret is off in the second half of each second once typing is done');
  SK.typeOn(el, 'abc', 1, { caret: false });
  assert.equal(el.innerHTML, 'abc');
  assert.equal(SK.typeOn(el, 'abc', 0), 0);
  let writes = 0;
  const spy = { set innerHTML(v) { writes++; this._v = v; }, get innerHTML() { return this._v; } };
  SK.typeOn(spy, 'abc', 0.5, { t: 0 }); SK.typeOn(spy, 'abc', 0.55, { t: 0.1 });
  assert.equal(writes, 1, 'unchanged text is not rewritten');
});

test('shake is zero outside [t0, t0 + dur], decays, and is deterministic', () => {
  const { SK } = load();
  const plain = (o) => JSON.parse(JSON.stringify(o)); // the vm realm has its own Object prototype
  assert.deepEqual(plain(SK.shake(0.9, 1)), { x: 0, y: 0, r: 0 });
  assert.deepEqual(plain(SK.shake(1.31, 1)), { x: 0, y: 0, r: 0 });
  const early = SK.shake(1.01, 1), late = SK.shake(1.25, 1);
  assert.deepEqual(plain(early), plain(SK.shake(1.01, 1)));
  assert.ok(Math.hypot(early.x, early.y) > Math.hypot(late.x, late.y));
  assert.ok(Math.abs(SK.shake(1.01, 1, { amp: 20 }).y) > Math.abs(early.y));
});

test('arcPath bends the control point perpendicular to the route', () => {
  const { SK } = load();
  assert.equal(SK.arcPath({ x: 0, y: 0 }, { x: 100, y: 0 }), 'M0.0 0.0 Q50.0 -25.0 100.0 0.0');
  assert.equal(SK.arcPath({ x: 0, y: 0 }, { x: 100, y: 0 }, -0.5), 'M0.0 0.0 Q50.0 50.0 100.0 0.0');
  assert.equal(SK.arcPath({ x: 0, y: 0 }, { x: 0, y: 100 }, 0), 'M0.0 0.0 Q0.0 50.0 0.0 100.0');
});
```

Run:

```bash
node --test scripts/style-kit.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 3` (`SK.typeOn is not a function`, …).

- [ ] **Step 2: Implement the helpers**

In `vendor/style-kit/style-kit.js` replace:

old:
```js
};
})();
```

new:
```js
};
// ---- text and impact helpers (sub-project 2a) ----------------------------------------------------
const escHtml = s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* typeOn: write the first ceil(u * length) characters of text into el, plus a caret while typing and
   blinking at 2 Hz after (o.t = clip time for the blink; o.caret = false hides it). The DOM is only
   touched when the visible text changes. Returns the number of characters shown. */
SK.typeOn = (el,text,u,o={})=>{
  const n=Math.max(0,Math.ceil(clamp(u)*text.length-1e-9));
  const on=o.caret!==false&&(u<1||((o.t??0)%1)<0.5);
  const html=escHtml(text.slice(0,n))+(on?'<span class="sk-caret"></span>':'');
  if(el._skType!==html){el.innerHTML=html; el._skType=html;}
  return n;
};
/* shake: a decaying impact offset {x, y (px), r (deg)} for dur seconds after t0 (stamp slams, hits);
   zero before t0 and after t0 + dur */
SK.shake = (t,t0,o={})=>{
  const amp=o.amp??10, dur=o.dur??0.3, fq=o.freq??30, d=t-t0;
  if(d<0||d>dur) return {x:0,y:0,r:0};
  const k=amp*(1-d/dur);
  return {x:k*Math.sin(d*fq*6.2832), y:k*0.6*Math.cos(d*fq*4.7), r:k*0.08*Math.sin(d*fq*5.3)};
};
/* arcPath: a quadratic arc from p0 to p1 ({x, y}); the control point sits at the midpoint pushed
   bend × distance to the left of the direction of travel (negative bends right) */
SK.arcPath = (p0,p1,bend=0.25)=>{
  const cx=(p0.x+p1.x)/2+(p1.y-p0.y)*bend, cy=(p0.y+p1.y)/2-(p1.x-p0.x)*bend;
  return `M${f2(p0.x)} ${f2(p0.y)} Q${f2(cx)} ${f2(cy)} ${f2(p1.x)} ${f2(p1.y)}`;
};
})();
```

In `vendor/style-kit/style-kit.css` replace:

old:
```css
.sk-ly > img.sk-plate { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; }
```

new:
```css
.sk-ly > img.sk-plate { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; }
/* typing caret (SK.typeOn) */
.sk-caret { display: inline-block; width: .08em; height: .9em; margin-left: .05em; vertical-align: -.08em; background: currentColor; }
```

`Math.max(0, …)` keeps `u = 0` from returning `-0`. Nothing old calls these helpers, so the existing examples are unchanged.

- [ ] **Step 3: Run the tests**

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 4: Commit**

Run:

```bash
git add scripts/style-kit.test.mjs vendor/style-kit/style-kit.js vendor/style-kit/style-kit.css && git status --short && git commit -q -F - <<'MSG'
feat: SK.typeOn, SK.shake, SK.arcPath helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above (plus renames); the commit succeeds.

---

### Task 4: Map regions and `SK.mapSvg`

**Files:**
- Modify: `scripts/asset-lib.test.mjs`, `scripts/lib/asset-lib-build.mjs`, `vendor/asset-lib/src/runtime.js`
- Generated: `vendor/asset-lib/asset-lib.js`
- Modify: `docs/agents/references/styles/README.md`, `docs/agents/references/styles/motion-graphic.md` (Build Recipe)

**Interfaces:**
- Produces: `mapRegions(svg)` → `{ base: [{ fill, d }], regions: { id: d } }`; `SK.LIB.regions[map]` for every map (indonesia 1, world 172, sea 24, id-provinces 33, java 13); `SK.mapSvg(map, { fill, stroke, strokeWidth, regions })` → `<svg class="sk-map">` string sized in map pixels (the `SK.geo` frame). Unknown map or region id throws with a suggestion.

- [ ] **Step 1: Write the failing tests**

In `scripts/asset-lib.test.mjs` replace:

old:
```js
import { buildAll, LIB, OUTPUTS, parseStrokeSvg, pngSize, STYLE_KEY, STYLES, TAGS } from './lib/asset-lib-build.mjs';
```

new:
```js
import { buildAll, LIB, mapRegions, OUTPUTS, parseStrokeSvg, pngSize, STYLE_KEY, STYLES, TAGS } from './lib/asset-lib-build.mjs';
```

Append to `scripts/asset-lib.test.mjs`:

```js
test('mapRegions keeps neighbours as base paths and every other id as a region', () => {
  const r = mapRegions('<svg><path id="neighbors" fill="#ccc" d="M0 0Z"/><path d="M1 1Z"/><path id="aceh" fill="#b9ad96" d="M2 2Z"/></svg>');
  assert.deepEqual(r, { base: [{ fill: '#ccc', d: 'M0 0Z' }, { fill: '#d8d2c4', d: 'M1 1Z' }], regions: { aceh: 'M2 2Z' } });
  const lib = load().LIB;
  const maps = JSON.parse(read(`${LIB}/src/maps.json`));
  assert.deepEqual(Object.keys(lib.regions).sort(), maps.map((m) => m.id).sort());
  for (const m of maps) assert.deepEqual(JSON.parse(JSON.stringify(lib.regions[m.id])), mapRegions(read(m.file ?? `${LIB}/maps/${m.id}.svg`)), m.id);
  assert.equal(Object.keys(lib.regions['id-provinces'].regions).length, 33);
});

test('SK.mapSvg inlines one tintable path per region and rejects unknown maps and regions', () => {
  const SK = load();
  const ids = Object.keys(SK.LIB.regions['id-provinces'].regions);
  const s = SK.mapSvg('map.id-provinces', { fill: '#111111', regions: { [ids[0]]: '#ff0000' }, strokeWidth: 3 });
  assert.match(s, /^<svg class="sk-map" width="\d+" height="\d+" viewBox="0 0 \d+ \d+" stroke="#efe9dc" stroke-width="3" stroke-linejoin="round">/);
  assert.equal((s.match(/data-region="/g) || []).length, 33);
  assert.ok(s.includes(`data-region="${ids[0]}" d="${SK.LIB.regions['id-provinces'].regions[ids[0]]}" fill="#ff0000"`));
  assert.ok(s.includes(`data-region="${ids[1]}"`) && s.includes('fill="#111111"'));
  assert.throws(() => SK.mapSvg('id-provinces', { regions: { nowhere: 'red' } }), /unknown region of id-provinces "nowhere"/);
  assert.throws(() => SK.mapSvg('mars'), /unknown map "mars"/);
});
```

Run:

```bash
node --test scripts/asset-lib.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: FAIL: `mapRegions` is not exported.

- [ ] **Step 2: Extract regions at build time**

In `scripts/lib/asset-lib-build.mjs` replace:

old:
```js

const check = (e) => {
```

new:
```js

// map SVG → { base: [{fill, d}], regions: {id: d} }: a path with id "neighbors" (or without an id) is
// background, every other <path id> is a region a clip may tint (SK.mapSvg)
export function mapRegions(svg) {
  const out = { base: [], regions: {} };
  for (const m of svg.matchAll(/<path\b([^>]*)\/>/g)) {
    const attr = (n) => (m[1].match(new RegExp(`\\s${n}="([^"]*)"`)) || [])[1];
    const id = attr('id'), d = attr('d');
    if (!d) continue;
    if (!id || id === 'neighbors') out.base.push({ fill: attr('fill') ?? '#d8d2c4', d });
    else out.regions[id] = d;
  }
  return out;
}

const check = (e) => {
```

In `scripts/lib/asset-lib-build.mjs` replace:

old:
```js

  const lib = { icons: {}, picts: {}, strokes: {}, torn: {}, maps: {}, cities, hands: {}, assets: {} };
  const entries = [];
```

new:
```js

  const lib = { icons: {}, picts: {}, strokes: {}, torn: {}, maps: {}, regions: {}, cities, hands: {}, assets: {} };
  const entries = [];
```

In `scripts/lib/asset-lib-build.mjs` replace:

old:
```js
    add({ id: 'map.' + m.id, kind: 'map', file, styles: ['vox', 'motion-graphic', 'parallax'], tags: ['peta', 'tempat'], source: m.source, license: 'Public domain' });
    if (!m.file) licenses.push([`maps/${m.id}.svg`, m.source, 'Public domain', m.changes]);
```

new:
```js
    add({ id: 'map.' + m.id, kind: 'map', file, styles: ['vox', 'motion-graphic', 'parallax'], tags: ['peta', 'tempat'], source: m.source, license: 'Public domain' });
    lib.regions[m.id] = mapRegions(read(root, file));
    if (!m.file) licenses.push([`maps/${m.id}.svg`, m.source, 'Public domain', m.changes]);
```

- [ ] **Step 3: Add `SK.mapSvg` to the runtime**

In `vendor/asset-lib/src/runtime.js` replace:

old:
```js
for(const [k,v] of Object.entries(SK.LIB.cities)) if(!has(SK.CITIES,k)) SK.CITIES[k]=v;
// ---- hands -------------------------------------------------------------------------------------
```

new:
```js
for(const [k,v] of Object.entries(SK.LIB.cities)) if(!has(SK.CITIES,k)) SK.CITIES[k]=v;
/* mapSvg: the map as an inline <svg> so each region can be coloured — o.regions = { id: colour };
   other regions get o.fill, the neighbours keep their own grey. Sized in map pixels (the same frame
   as SK.geo), so wrap it and scale the wrapper. */
SK.mapSvg = (map,o={})=>{
  const id=bare(map,'map'), m=pick(SK.MAPS,'map',id), r=pick(SK.LIB.regions,'map',id), tint=o.regions??{};
  for(const k of Object.keys(tint)) pick(r.regions,'region of '+id,k);
  const base=r.base.map(b=>`<path d="${b.d}" fill="${b.fill}"/>`).join('');
  const regs=Object.entries(r.regions).map(([k,d])=>`<path data-region="${k}" d="${d}" fill="${tint[k]??o.fill??'#b9ad96'}"/>`).join('');
  return `<svg class="sk-map" width="${m.w}" height="${m.h}" viewBox="0 0 ${m.w} ${m.h}" stroke="${o.stroke??'#efe9dc'}" stroke-width="${o.strokeWidth??2}" stroke-linejoin="round">${base}${regs}</svg>`;
};
// ---- hands -------------------------------------------------------------------------------------
```

- [ ] **Step 4: Rebuild and test**

Run:

```bash
npm run -s asset-lib -- build >/dev/null && wc -c < vendor/asset-lib/asset-lib.js && npm run -s test:asset-lib 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: about `398000` bytes (+≈170 KB of region paths), then `fail 0`.

- [ ] **Step 5: Document the helper**

In `docs/agents/references/styles/README.md` replace:

old:
```md
  `SK.asset`; classes
```

new:
```md
  `SK.asset`, `SK.mapSvg`; classes
```

In `docs/agents/references/styles/motion-graphic.md` replace:

old:
```md
- `bg: null` for split and panel; draw the split backdrop in the top 960 px.
```

new:
```md
- `bg: null` for split and panel; draw the split backdrop in the top 960 px.
- Maps: `SK.mapSvg(map, { regions: { id: colour } })` returns an inline `<svg>`
  with one `<path data-region>` per region (`world`, `sea`, `id-provinces`,
  `java`; ids in `SK.LIB.regions[map]`). Insert it once, then tint regions in
  `update(t)`; find them with `querySelectorAll('[data-region]')`, never a
  template-literal selector (the linter rejects it). `SK.arcPath(p0, p1, bend)`
  gives a curved route between two `SK.geo` points.
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 6: Commit**

Run:

```bash
git add scripts/asset-lib.test.mjs scripts/lib/asset-lib-build.mjs vendor/asset-lib/src/runtime.js vendor/asset-lib/asset-lib.js docs/agents/references/styles/README.md docs/agents/references/styles/motion-graphic.md && git status --short && git commit -q -F - <<'MSG'
feat: SK.mapSvg with per-region paths extracted at build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above (plus renames); the commit succeeds.

---

### Task 5: Six broll-text examples and four new patterns

**Files:**
- Create: `docs/agents/references/style-examples/broll-text/compositions/tx-05-type-counter.html`, `docs/agents/references/style-examples/broll-text/compositions/tx-06-split-scale.html`, `docs/agents/references/style-examples/broll-text/compositions/tx-07-zoom-grid.html`, `docs/agents/references/style-examples/broll-text/compositions/tx-08-jitter-footage.html`, `docs/agents/references/style-examples/broll-text/compositions/tx-09-stamp-swash.html`, `docs/agents/references/style-examples/broll-text/compositions/tx-10-font-riso.html`
- Modify: `docs/agents/references/style-examples/broll-text/examples.json`; generated `index.html`, `snapshots.json`
- Modify: `docs/agents/references/styles/broll-text.md` (Patterns, Build Recipe, SFX, Examples)

- [ ] **Step 1: Write the example compositions**

Every clip follows the example rules: "Example only" comment (made-up words and numbers), one `SK.clip`, a pure function of `t`, no `visibility`, no `font-family` in the clip `<style>`, no `../` in a url, no template-literal selectors.

Create `docs/agents/references/style-examples/broll-text/compositions/tx-05-type-counter.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #bar { position: absolute; left: 70px; top: 330px; width: 940px; height: 64px; border-radius: 18px 18px 0 0; background: #1a231d; }
        #bar i { position: absolute; top: 22px; width: 20px; height: 20px; border-radius: 50%; background: #3b4a3f; }
        #term { position: absolute; left: 70px; top: 394px; width: 940px; height: 300px; border-radius: 0 0 18px 18px; background: #111813; }
        #cmd { position: absolute; left: 110px; top: 450px; font-size: 56px; color: var(--sk-ink); white-space: pre; }
        #cmd b { color: var(--sk-accent); font-weight: 400; }
        #lab { position: absolute; left: 0; right: 0; top: 860px; text-align: center; font-size: 52px; color: var(--sk-muted); }
        #num { position: absolute; left: 0; right: 0; top: 950px; text-align: center; font-size: 150px; font-weight: 800; letter-spacing: -0.04em; color: var(--sk-accent); font-feature-settings: "tnum" 1; }
      </style>
      <div id="root" data-composition-id="tx-05-type-counter" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-text sk-pal-text-terminal sk-type-text-terminal">

          <div id="bar"><i style="left:26px"></i><i style="left:60px"></i><i style="left:94px"></i></div>
          <div id="term"></div>
          <div id="cmd" class="sk-mono"><b>$ </b><span id="typed"></span></div>
          <div id="lab" class="sk-mono">hemat per bulan</div>
          <div id="num" class="sk-mono">Rp 0 jt</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'tx-05-type-counter';
          const $ = SK.finder(ID);

          const typed = $('typed');
          SK.clip(ID, { T: 6, update: (t) => {
            SK.enter($('bar'), t - 0.1, 'rise');
            SK.enter($('term'), t - 0.15, 'rise');
            SK.enter($('cmd'), t - 0.3, 'fade');
            SK.typeOn(typed, 'otomatis laporan --harian', (t - 0.45) / 1.5, { t });
            SK.enter($('lab'), t - 2.3, 'rise');
            SK.enter($('num'), t - 2.5, 'pop');
            $('num').textContent = 'Rp ' + SK.count(t, 2.5, 3.6, 0, 12.5, 1) + ' jt';
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/broll-text/compositions/tx-06-split-scale.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #card { position: absolute; left: 90px; top: 200px; width: 900px; height: 520px; border-radius: 36px; background: var(--sk-bg); }
        #l1 { position: absolute; left: 0; right: 0; top: 270px; text-align: center; font-size: 78px; color: var(--sk-ink); }
        .big { position: absolute; left: 0; right: 0; top: 380px; text-align: center; font-size: 250px; line-height: 1; color: var(--sk-accent); }
        #top { clip-path: inset(0 0 50% 0); }
        #bot { clip-path: inset(50% 0 0 0); }
        #cut { position: absolute; left: 110px; top: 502px; width: 860px; height: 12px; background: var(--sk-ink); transform-origin: 0 50%; }
      </style>
      <div id="root" data-composition-id="tx-06-split-scale" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-text sk-pal-text-cream-red">

          <div id="card"></div>
          <div id="l1" class="sk-sans">data sama tim</div>
          <div id="top" class="big sk-f-bebas-neue">TERPISAH</div>
          <div id="bot" class="big sk-f-bebas-neue">TERPISAH</div>
          <div id="cut"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'tx-06-split-scale';
          const $ = SK.finder(ID);

          const slide = M.track(0, [[2.2, 1, [22, 0.8]]]);
          SK.clip(ID, { T: 5, bg: null, update: (t) => {
            $('card').style.transform = `scale(${(0.9 + 0.1 * M.eo(t / 0.35)).toFixed(4)})`;
            $('card').style.opacity = M.eo(t / 0.25).toFixed(4);
            SK.enter($('l1'), t - 0.3, 'rise');
            for (const id of ['top', 'bot']) SK.enter($(id), t - 0.8, 'pop');
            const cu = M.eo((t - 1.95) / 0.25);
            $('cut').style.transform = `scaleX(${cu.toFixed(4)})`;
            $('cut').style.opacity = (cu > 0 && t < 2.6 ? 1 : Math.max(0, 1 - (t - 2.6) / 0.2)).toFixed(4);
            const s = slide(t);
            $('top').style.translate = `${(-70 * s).toFixed(2)}px ${(-26 * s).toFixed(2)}px`;
            $('bot').style.translate = `${(70 * s).toFixed(2)}px ${(26 * s).toFixed(2)}px`;
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/broll-text/compositions/tx-07-zoom-grid.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #wrap { position: absolute; left: 0; top: 260px; width: 1080px; height: 360px; transform-origin: 318px 180px; }
        #word { position: absolute; left: 0; right: 0; top: 0; text-align: center; font-size: 300px; line-height: 1.1; color: var(--sk-ink); }
        #word b { color: var(--sk-accent); font-weight: 400; }
        .col { position: absolute; top: 760px; width: 300px; height: 620px; overflow: hidden; border-top: 6px solid var(--sk-ink); }
        .col div { position: absolute; left: 0; right: 0; top: 40px; text-align: center; }
        .k { font-size: 44px; color: var(--sk-muted); }
        .v { top: 110px !important; font-size: 96px; line-height: 1; color: var(--sk-ink); }
      </style>
      <div id="root" data-composition-id="tx-07-zoom-grid" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-text sk-type-text-editorial" style="--sk-bg:#f2efe8;--sk-ink:#141414;--sk-accent:#d62828;--sk-muted:#8a8578">

          <div id="wrap"><div id="word" class="sk-display"><b>A</b>UTOMASI</div></div>
          <div class="col" id="c0" style="left:60px"><div class="k sk-serif">satu</div><div class="v sk-display">INPUT</div></div>
          <div class="col" id="c1" style="left:390px"><div class="k sk-serif">dua</div><div class="v sk-display">PROSES</div></div>
          <div class="col" id="c2" style="left:720px"><div class="k sk-serif">tiga</div><div class="v sk-display">HASIL</div></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'tx-07-zoom-grid';
          const $ = SK.finder(ID);

          const z = M.track(4.2, [[0.1, 1, [9, 1]]]);
          const cols = ['c0', 'c1', 'c2'].map((id, i) => ({ el: $(id), y: M.track(640, [[2.3 + i * 0.4, 0, [20, 0.86]], [4.6 + i * 0.12, i === 1 ? 0 : 640, [18, 0.9]]]) }));
          SK.clip(ID, { T: 6, update: (t) => {
            $('wrap').style.transform = `scale(${z(t).toFixed(4)})`;
            $('word').style.opacity = M.eo(t / 0.15).toFixed(4);
            for (const c of cols) {
              const y = c.y(t);
              for (const d of c.el.children) d.style.transform = `translateY(${y.toFixed(2)}px)`;
              c.el.style.borderTopColor = y < 620 ? '' : 'transparent';
            }
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/broll-text/compositions/tx-08-jitter-footage.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #pain { position: absolute; left: 0; right: 0; top: 260px; text-align: center; font-size: 116px; letter-spacing: -0.02em; color: var(--sk-ink); text-shadow: 0 6px 24px rgba(0,0,0,.35); }
        #ghost { position: absolute; left: 0; right: 0; top: 260px; text-align: center; font-size: 116px; letter-spacing: -0.02em; color: var(--sk-accent); mix-blend-mode: screen; }
        #over { position: absolute; left: -20px; right: -20px; top: 820px; text-align: center; font-size: 330px; font-weight: 300; line-height: 1; letter-spacing: -0.05em; color: #ffffff; }
      </style>
      <div id="root" data-composition-id="tx-08-jitter-footage" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-text sk-type-text-brutal" style="--sk-ink:#fafafa;--sk-accent:#facc15">

          <div id="ghost" class="sk-display">MASALAHNYA</div>
          <div id="pain" class="sk-display">MASALAHNYA</div>
          <div id="over" class="sk-sans">capek.</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'tx-08-jitter-footage';
          const $ = SK.finder(ID);

          // jitter-flash: a distressed flash for 0.3 s (24 fps boil), then a clean hold on the word
          SK.clip(ID, { T: 5, bg: null, update: (t) => {
            const flash = t >= 0.25 && t < 0.55;
            const b = SK.boil(7, t, flash ? 18 : 0, 24);
            SK.enter($('pain'), t - 0.25, 'fade');
            $('pain').style.translate = `${b.x.toFixed(2)}px ${b.y.toFixed(2)}px`;
            $('pain').style.letterSpacing = flash ? `${(0.02 + Math.abs(b.r) * 0.02).toFixed(3)}em` : '-0.02em';
            $('ghost').style.opacity = flash ? '0.9' : '0';
            $('ghost').style.translate = `${(-b.x * 1.6).toFixed(2)}px ${(b.y * 0.8).toFixed(2)}px`;
            // over-footage: thin oversized type over the running face, partial opacity
            const o = M.eo((t - 2.0) / 0.6) * 0.85;
            $('over').style.opacity = o.toFixed(4);
            $('over').style.transform = `scale(${(1.06 - 0.06 * M.eo((t - 2.0) / 1.2)).toFixed(4)})`;
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/broll-text/compositions/tx-09-stamp-swash.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #card { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; background: var(--sk-bg); }
        #l1 { position: absolute; left: 90px; top: 250px; font-size: 180px; line-height: 1; color: var(--sk-ink); }
        #l2 { position: absolute; left: 90px; top: 450px; font-size: 96px; line-height: 1.1; color: var(--sk-ink); }
        #sw { position: absolute; left: 330px; top: 560px; }
        #st { position: absolute; left: 620px; top: 96px; width: 340px; height: 128px; }
      </style>
      <div id="root" data-composition-id="tx-09-stamp-swash" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-text sk-pal-text-cream-red">

          <div id="card"></div>
          <div id="l1" class="sk-display">BIAYA SERVER</div>
          <div id="l2" class="sk-sans">turun <span id="kw">tiap bulan</span></div>
          <div id="sw"></div>
          <div id="st"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'tx-09-stamp-swash';
          const $ = SK.finder(ID);

          $('sw').innerHTML = SK.doodle('frame.swash-2', { size: 520, sw: 11, color: 'var(--sk-accent)' });
          $('st').innerHTML = SK.stamp('frame.stamp-hemat', { size: 340, color: 'var(--sk-accent)' });
          const swash = Array.from($('sw').querySelectorAll('path')).map((el, i) => ({ el, at: 3.3 + i * 0.25, dur: 0.35 }));
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            $('card').style.transform = `translateY(${(-(1 - M.eo(t / 0.35)) * 960).toFixed(2)}px)`;
            SK.enter($('l1'), t - 0.35, 'slam');
            SK.enter($('l2'), t - 0.9, 'rise');
            // stamp-slam: drop from 1.4x at 2.2 s, then a short decaying shake
            const d = t - 2.2, st = $('st');
            st.style.opacity = d < 0 ? '0' : '1';
            const s = d < 0 ? 1.4 : 1 + 0.4 * (1 - M.eo(d / 0.12));
            const k = SK.shake(t, 2.32, { amp: 12, dur: 0.3 });
            st.style.transform = `translate(${k.x.toFixed(2)}px,${k.y.toFixed(2)}px) rotate(${(-9 + k.r).toFixed(3)}deg) scale(${s.toFixed(4)})`;
            SK.drawSeq(t, swash);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/broll-text/compositions/tx-10-font-riso.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        .w { position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 180px; line-height: 1; text-transform: uppercase; }
        #ink { color: var(--sk-ink); mix-blend-mode: multiply; }
        #pink { color: var(--sk-accent); mix-blend-mode: multiply; opacity: 0; }
        #sub { position: absolute; left: 0; right: 0; top: 800px; text-align: center; font-size: 90px; color: var(--sk-ink); }
        #tone { position: absolute; left: 250px; top: 300px; width: 580px; height: 580px; border-radius: 50%; background: var(--sk-accent-2); opacity: 0; }
        #dots { position: absolute; left: 250px; top: 300px; width: 580px; height: 580px; border-radius: 50%; opacity: 0; }
      </style>
      <div id="root" data-composition-id="tx-10-font-riso" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-text sk-pal-text-risograph">

          <div id="tone"></div>
          <div id="dots" class="sk-tex-halftone" style="position:absolute"></div>
          <div id="pink" class="w sk-f-archivo-black">BERUBAH</div>
          <div id="ink" class="w sk-f-bebas-neue">BERUBAH</div>
          <div id="sub" class="sk-f-instrument-serif">cara kita kerja</div>
          <div class="sk-tex-riso"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'tx-10-font-riso';
          const $ = SK.finder(ID);

          const FACES = ['sk-f-bebas-neue', 'sk-f-instrument-serif', 'sk-f-permanent-marker', 'sk-f-archivo-black'];
          const ink = $('ink');
          SK.clip(ID, { T: 6, update: (t) => {
            // font-swap: a new face every step (15/s) until it locks on the last one at 1.6 s
            const face = t < 1.6 ? FACES[SK.cycle(t, FACES.length)] : FACES[3];
            if (ink._face !== face) { ink.className = 'w ' + face; ink._face = face; }
            SK.enter(ink, t - 0.2, 'fade');
            // riso-poster: the accent ink layer slides in misregistered and settles 8 px off
            const m = 8 + 44 * (1 - M.eo((t - 2.3) / 0.4));
            $('pink').style.opacity = t < 2.3 ? '0' : '1';
            $('pink').style.transform = `translate(${m.toFixed(2)}px,${(m * 0.5).toFixed(2)}px)`;
            SK.enter($('sub'), t - 2.8, 'rise');
            // the riso 'sun' behind the word: a second-ink disc with halftone, printed after the word
            const tone = M.eo((t - 2.0) / 0.5);
            $('tone').style.opacity = (tone * 0.55).toFixed(4);
            $('tone').style.transform = `scale(${(0.9 + 0.1 * tone).toFixed(4)})`;
            $('dots').style.opacity = (tone * 0.9).toFixed(4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 2: List them in the manifest and regenerate the host**

Create `docs/agents/references/style-examples/broll-text/examples.json`:

```json
{
  "style": "broll-text",
  "examples": [
    {"clip": "tx-01-slam", "duration": 4, "treatment": "cutaway", "stills": [0.7, 3.7]},
    {"clip": "tx-02-quote-split", "duration": 6, "treatment": "split", "stills": [2.0, 5.7]},
    {"clip": "tx-03-word-swap", "duration": 4.5, "treatment": "panel", "stills": [2.0, 4.1]},
    {"clip": "tx-04-stack", "duration": 5, "treatment": "cutaway", "stills": [1.5, 4.7]},
    {"clip": "tx-05-type-counter", "duration": 6, "treatment": "cutaway", "stills": [1.2, 4.5]},
    {"clip": "tx-06-split-scale", "duration": 5, "treatment": "panel", "stills": [1.5, 3.2]},
    {"clip": "tx-07-zoom-grid", "duration": 6, "treatment": "cutaway", "stills": [0.45, 3.9]},
    {"clip": "tx-08-jitter-footage", "duration": 5, "treatment": "panel", "stills": [0.4, 3.8]},
    {"clip": "tx-09-stamp-swash", "duration": 6, "treatment": "split", "stills": [2.45, 5.0]},
    {"clip": "tx-10-font-riso", "duration": 6, "treatment": "cutaway", "stills": [0.9, 4.2]}
  ]
}
```

Run:

```bash
npm run -s style-examples -- build >/dev/null && npm run -s style-examples -- check
```

Expected: `example hosts are up to date`.

- [ ] **Step 3: Render and look at every new still**

Run:

```bash
npm run check:style-examples -- broll-text
```

Expected: `0 errors`; stills in `renders/style-examples/broll-text/`.

Look at each still (`Read` the PNG) against the pattern it demonstrates. Clip-local still times: tx-05 1.2 (typing, caret) / 4.5 (count landed); tx-06 1.5 (halves apart) / 3.2 (big payoff word); tx-07 0.45 (letter close-up) / 3.9 (grid columns); tx-08 0.4 (distressed flash) / 3.8 (thin type over the face); tx-09 2.45 (stamp landed, shake) / 5.0 (swash drawn); tx-10 0.9 (font mid-swap) / 4.2 (two inks registered on the halftone disc). Known traps from the tested run: a 190 px counter overflows (150 px fits); split halves need `translate(±70·s px, ±26·s px)`; brutal type at 116 px fits 1080 px; the stamp must sit beside the word, not on it.

- [ ] **Step 4: Document the patterns and examples**

In `docs/agents/references/styles/broll-text.md` replace:

old:
```md
(`tx-01` … `tx-04`,
```

new:
```md
(`tx-01` … `tx-10`,
```

In `docs/agents/references/styles/broll-text.md` replace:

old:
```md


## References
```

new:
```md

| **font-swap** | One word cycles through 3–4 display fonts in fast steps, then settles on one | "berubah", "versi baru", identity | Swap every 2 frames (15/s) over the lead-in word; settle on the stressed syllable | shutter click per step | More than 4 fonts; swapping for the whole clip | `.sk-f-*` classes swapped by `SK.cycle(t, n)` until the settle time |
| **stamp-slam** | A stamp or badge drops from 1.4× onto the keyword with a short decaying shake | Verdicts and labels: "GRATIS", "BARU", "HEMAT" | Lands on the first syllable; shake ≤ 0.3 s | rubber-stamp thud | Stamping many words; stamping a claim that is not a verdict | `SK.stamp(id, { text })` + `'slam'` + `SK.shake` |
| **swash-underline** | A hand-drawn swash draws under the payoff word | The last keyword of a sentence | Draws in 0.3–0.5 s from the word onset | marker sweep | Underlining a whole line; more than one swash per screen | `SK.doodle('frame.swash-N')` + `SK.drawSeq` |
| **riso-poster** | The word as a two-ink print: two ink layers offset 6–10 px, riso grain, halftone | A big statement that should feel "printed", zine | The two inks register on the word (0.3 s) | paper slap | A busy image behind; more than two inks | `sk-pal-text-risograph` + two copies of the word (`mix-blend-mode: multiply`) + a `.sk-tex-riso` overlay |

## References
```

In `docs/agents/references/styles/broll-text.md` replace:

old:
```md
- Keep every per-frame value a function of `t`. No timers, no `Math.random`.
```

new:
```md
- Keep every per-frame value a function of `t`. No timers, no `Math.random`.
- `SK.typeOn(el, text, u)` types `text` up to `u` (0..1) with a blinking caret
  (type-on); `SK.shake(t, t0)` returns a decaying `{x, y, r}` jolt (stamp-slam,
  jitter-flash). Both write the DOM only when the value changes.
```

In `docs/agents/references/styles/broll-text.md` replace:

old:
```md
| counter-word | tick roll → click | 0.08–0.12 |
```

new:
```md
| counter-word | tick roll → click | 0.08–0.12 |
| type-on | muted key clicks | 0.06–0.1 |
| stamp-slam | rubber-stamp thud | 0.14–0.18 |
| font-swap | shutter click per step | 0.06–0.1 |
```

In `docs/agents/references/styles/broll-text.md` replace:

old:
```md
| `style-examples/broll-text/compositions/tx-04-stack.html` | stack + mask-reveal, paper palette, step counter | cutaway |
```

new:
```md
| `style-examples/broll-text/compositions/tx-04-stack.html` | stack + mask-reveal, paper palette, step counter | cutaway |
| `style-examples/broll-text/compositions/tx-05-type-counter.html` | type-on + counter-word, terminal palette and type | cutaway |
| `style-examples/broll-text/compositions/tx-06-split-scale.html` | split-word + split-scale, cream-red palette | panel |
| `style-examples/broll-text/compositions/tx-07-zoom-grid.html` | zoom-assemble + grid-column, editorial type | cutaway |
| `style-examples/broll-text/compositions/tx-08-jitter-footage.html` | jitter-flash + over-footage, brutal type | panel |
| `style-examples/broll-text/compositions/tx-09-stamp-swash.html` | stamp-slam + swash-underline, library stamp and swash | split |
| `style-examples/broll-text/compositions/tx-10-font-riso.html` | font-swap + riso-poster, risograph palette and texture | cutaway |
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/agents/references/style-examples/broll-text docs/agents/references/styles/broll-text.md && git status --short && git commit -q -F - <<'MSG'
feat: broll-text examples for all 20 patterns (type-on, split, zoom, jitter, stamp, riso)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above (plus renames); the commit succeeds.

---

### Task 6: Seven motion-graphic examples and four new patterns

**Files:**
- Create: `docs/agents/references/style-examples/motion-graphic/compositions/mg-05-race-timeline.html`, `docs/agents/references/style-examples/motion-graphic/compositions/mg-06-before-venn.html`, `docs/agents/references/style-examples/motion-graphic/compositions/mg-07-funnel-stack.html`, `docs/agents/references/style-examples/motion-graphic/compositions/mg-08-dots-bubbles.html`, `docs/agents/references/style-examples/motion-graphic/compositions/mg-09-province-pin.html`, `docs/agents/references/style-examples/motion-graphic/compositions/mg-10-route.html`, `docs/agents/references/style-examples/motion-graphic/compositions/mg-11-kpi-orbit.html`
- Modify: `docs/agents/references/style-examples/motion-graphic/examples.json`; generated `index.html`, `snapshots.json`
- Modify: `docs/agents/references/styles/motion-graphic.md` (Patterns, Build Recipe, SFX, Examples)

- [ ] **Step 1: Write the example compositions**

Every clip follows the example rules: "Example only" comment (made-up words and numbers), one `SK.clip`, a pure function of `t`, no `visibility`, no `font-family` in the clip `<style>`, no `../` in a url, no template-literal selectors.

Create `docs/agents/references/style-examples/motion-graphic/compositions/mg-05-race-timeline.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the channels, years, and values are invented to show the mechanism. In a real clip every label is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #title { position: absolute; left: 80px; top: 170px; font-size: 64px; font-weight: 700; color: var(--sk-ink); }
        #sub { position: absolute; left: 82px; top: 250px; font-size: 32px; color: var(--sk-muted); }
        #year { position: absolute; right: 80px; top: 150px; font-size: 120px; font-weight: 800; letter-spacing: -0.04em; color: var(--sk-accent); font-feature-settings: "tnum" 1; }
        .row { position: absolute; left: 80px; height: 96px; width: 920px; }
        .row b { position: absolute; left: 0; top: 0; height: 96px; border-radius: 0 16px 16px 0; background: #334155; }
        .row span { position: absolute; left: 24px; top: 26px; font-size: 38px; font-weight: 700; color: var(--sk-ink); white-space: nowrap; }
        #r0 b { background: var(--sk-accent); }
        #tl { position: absolute; left: 0; top: 0; }
        .yr { position: absolute; top: 1420px; width: 160px; text-align: center; font-size: 36px; font-weight: 700; color: var(--sk-muted); }
        #dot { position: absolute; left: 0; top: 0; width: 34px; height: 34px; border-radius: 50%; background: var(--sk-accent); }
      </style>
      <div id="root" data-composition-id="mg-05-race-timeline" data-width="1080" data-height="1920" data-duration="7">
        <div class="sk-stage sk-mg sk-pal-mg-fintech">

          <div id="title">Kanal penjualan</div>
          <div id="sub">ilustrasi &middot; urutan berubah tiap tahun</div>
          <div id="year">2022</div>
          <div class="row" id="r0"><b></b><span>Marketplace</span></div>
          <div class="row" id="r1"><b></b><span>Chat</span></div>
          <div class="row" id="r2"><b></b><span>Toko fisik</span></div>
          <div class="row" id="r3"><b></b><span>Website</span></div>
          <svg id="tl" width="1080" height="1920" viewBox="0 0 1080 1920"><path id="axis" class="sk-stroke" d="M140 1380 L940 1380" style="stroke:#475569;stroke-width:6" /><path id="t0" class="sk-stroke" d="M180 1360 L180 1400" style="stroke:#94a3b8;stroke-width:6" /><path id="t1" class="sk-stroke" d="M540 1360 L540 1400" style="stroke:#94a3b8;stroke-width:6" /><path id="t2" class="sk-stroke" d="M900 1360 L900 1400" style="stroke:#94a3b8;stroke-width:6" /></svg>
          <div class="yr" style="left:100px">2022</div><div class="yr" style="left:460px">2023</div><div class="yr" style="left:820px">2024</div>
          <div id="dot"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mg-05-race-timeline';
          const $ = SK.finder(ID);

          // values per year (illustrative); rank → row top
          const V = { r0: [30, 55, 90], r1: [60, 70, 85], r2: [80, 50, 40], r3: [20, 35, 60] };
          const Y = [2.0, 4.0];            // the year changes at these times
          const val = (id, t) => { const v = V[id]; const a = M.eo((t - Y[0]) / 0.6), b = M.eo((t - Y[1]) / 0.6); return v[0] + (v[1] - v[0]) * a + (v[2] - v[1]) * b; };
          const top = (rank) => 420 + rank * 130;
          // rank of each row in each year; rows glide to the new rank just after the year changes (staggered)
          const rankIn = (k) => { const order = Object.keys(V).sort((x, y) => V[y][k] - V[x][k]); return (id) => order.indexOf(id); };
          const R = [0, 1, 2].map(rankIn);
          const rows = Object.keys(V).map((id, i) => ({ id, i, el: $(id), bar: $(id).querySelector('b') }));
          const dotX = M.track(180, [[Y[0], 540, M.SLOW], [Y[1], 900, M.SLOW]]);
          SK.clip(ID, { T: 7, update: (t) => {
            SK.enter($('title'), t - 0.1, 'rise'); SK.enter($('sub'), t - 0.25, 'fade');
            $('year').textContent = String(t < Y[0] + 0.3 ? 2022 : t < Y[1] + 0.3 ? 2023 : 2024);
            for (const r of rows) {
              const a = M.eo((t - Y[0] - 0.35 - r.i * 0.05) / 0.45), b = M.eo((t - Y[1] - 0.35 - r.i * 0.05) / 0.45);
              const y = top(R[0](r.id)) + (top(R[1](r.id)) - top(R[0](r.id))) * a + (top(R[2](r.id)) - top(R[1](r.id))) * b;
              r.el.style.top = y.toFixed(2) + 'px';
              r.bar.style.width = (val(r.id, t) * 9.2 * M.eo((t - 0.4 - r.i * 0.08) / 0.5)).toFixed(1) + 'px';
              SK.enter(r.el, t - 0.4 - r.i * 0.08, 'fade');
            }
            SK.draw($('axis'), M.eo((t - 0.3) / 0.5));
            ['t0', 't1', 't2'].forEach((id, i) => SK.draw($(id), M.eo((t - 0.6 - i * 0.1) / 0.2)));
            $('dot').style.transform = `translate(${(dotX(t) - 17).toFixed(2)}px, 1363px)`;
            $('dot').style.opacity = M.eo((t - 0.8) / 0.2).toFixed(4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/motion-graphic/compositions/mg-06-before-venn.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #card { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; background: var(--sk-bg); }
        .st { position: absolute; left: 0; width: 1080px; height: 330px; }
        #before { top: 130px; } #after { top: 490px; }
        .st .k { position: absolute; left: 90px; top: 20px; font-size: 40px; font-weight: 700; color: var(--sk-muted); letter-spacing: .06em; text-transform: uppercase; }
        .st .v { position: absolute; left: 90px; top: 80px; font-size: 170px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; }
        .st .n { position: absolute; left: 600px; top: 150px; font-size: 44px; font-weight: 600; color: var(--sk-ink); }
        #before .v { color: var(--sk-muted); }
        #after { background: var(--sk-bg); }
        #after .v { color: var(--sk-accent); }
        #edge { position: absolute; top: 490px; width: 8px; height: 330px; background: var(--sk-ink); }
        #venn { position: absolute; left: 0; top: 0; }
        .vl { position: absolute; top: 700px; font-size: 52px; font-weight: 700; color: var(--sk-ink); }
        #mid { position: absolute; left: 0; right: 0; top: 440px; text-align: center; font-size: 60px; font-weight: 800; color: #ffffff; }
      </style>
      <div id="root" data-composition-id="mg-06-before-venn" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-mg sk-pal-mg-sunrise">

          <div id="card"></div>
          <div class="st" id="before"><div class="k">Dulu</div><div class="v">3 hari</div><div class="n">rekap stok manual</div></div>
          <div class="st" id="after"><div class="k">Sekarang</div><div class="v">2 jam</div><div class="n">rekap stok otomatis</div></div>
          <div id="edge"></div>
          <svg id="venn" width="1080" height="960" viewBox="0 0 1080 960"><circle id="cA" cx="0" cy="480" r="230" fill="var(--sk-accent)" style="mix-blend-mode:multiply" /><circle id="cB" cx="0" cy="480" r="230" fill="var(--sk-accent-2)" style="mix-blend-mode:multiply" /></svg>
          <div class="vl" id="lA" style="left:150px">Cepat</div>
          <div class="vl" id="lB" style="left:780px">Rapi</div>
          <div id="mid">Sistem</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mg-06-before-venn';
          const $ = SK.finder(ID);

          // before-after: the "after" panel wipes in from the left on "sekarang" (1.3 s)
          const wipe = (t) => M.eo((t - 1.3) / 0.5);
          // venn: the two circles slide together from 3.2 s; the overlap tints by multiply
          const xa = M.track(160, [[3.4, 430, M.SLOW]]), xb = M.track(920, [[3.4, 650, M.SLOW]]);
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            $('card').style.transform = `translateY(${(-(1 - M.eo(t / 0.35)) * 960).toFixed(2)}px)`;
            const out = M.eo((t - 2.8) / 0.3);
            SK.enter($('before'), t - 0.3, 'fade');
            const w = wipe(t);
            $('before').style.filter = `grayscale(${w.toFixed(3)})`;
            $('after').style.clipPath = `inset(0 ${((1 - w) * 100).toFixed(2)}% 0 0)`;
            $('edge').style.transform = `translateX(${(w * 1080 - 4).toFixed(2)}px)`;
            $('edge').style.opacity = (w > 0 && w < 1 ? 1 : 0).toString();
            for (const id of ['before', 'after']) $(id).style.opacity = (1 - out).toFixed(4);
            const vin = M.eo((t - 3.0) / 0.3);
            $('cA').setAttribute('cx', xa(t).toFixed(2)); $('cB').setAttribute('cx', xb(t).toFixed(2));
            $('venn').style.opacity = vin.toFixed(4);
            SK.enter($('lA'), t - 3.3, 'rise'); SK.enter($('lB'), t - 3.5, 'rise');
            SK.enter($('mid'), t - 4.1, 'pop');
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/motion-graphic/compositions/mg-07-funnel-stack.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #card { position: absolute; left: 70px; top: 150px; width: 940px; height: 720px; border-radius: 36px; background: var(--sk-bg); }
        #h { position: absolute; left: 130px; top: 200px; font-size: 52px; font-weight: 800; color: var(--sk-ink); }
        .band { position: absolute; left: 130px; height: 104px; border-radius: 14px; background: var(--sk-accent); }
        .bl { position: absolute; left: 0; right: 0; top: 30px; text-align: center; font-size: 38px; font-weight: 700; color: #ffffff; white-space: nowrap; }
        #stack { position: absolute; left: 0; top: 0; }
        .blk { position: absolute; left: 330px; width: 420px; height: 110px; border-radius: 16px; background: #1c1917; color: #fff7ed; display: flex; align-items: center; gap: 22px; padding: 0 30px; box-sizing: border-box; font-size: 40px; font-weight: 700; }
        #tot { position: absolute; left: 0; right: 0; top: 780px; text-align: center; font-size: 44px; font-weight: 800; color: var(--sk-accent); }
      </style>
      <div id="root" data-composition-id="mg-07-funnel-stack" data-width="1080" data-height="1920" data-duration="7">
        <div class="sk-stage sk-mg sk-type-mg-jakarta" style="--sk-bg:#fff7ed;--sk-ink:#1c1917;--sk-accent:#c2410c;--sk-muted:#a8a29e">

          <div id="card"></div>
          <div id="h">Dari lihat sampai langganan</div>
          <div class="band" id="b0" style="top:300px"><div class="bl">Lihat</div></div>
          <div class="band" id="b1" style="top:418px"><div class="bl">Chat</div></div>
          <div class="band" id="b2" style="top:536px"><div class="bl">Order</div></div>
          <div class="band" id="b3" style="top:654px"><div class="bl">Langganan</div></div>
          <div id="stack">
            <div class="blk" id="k0"></div><div class="blk" id="k1"></div><div class="blk" id="k2"></div>
          </div>
          <div id="tot">biaya bulanan</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mg-07-funnel-stack';
          const $ = SK.finder(ID);

          // funnel (relative, no numbers): each band narrows on its stage word
          const W0 = [820, 820, 820, 820], W1 = [820, 600, 380, 220];
          const bands = [0, 1, 2, 3].map((i) => ({ el: $('b' + i), w: M.track(W0[i], [[0.6 + i * 0.45, W1[i], M.SLOW]]) }));
          // stack-up: blocks with library pictograms drop onto a pile, one per item word
          const items = [['server', 'robot'], ['tools', 'laptop'], ['tim', 'users-three']];
          items.forEach(([label, icon], i) => { $('k' + i).innerHTML = SK.pict(icon, { size: 64, color: '#fff7ed' }) + label; });
          const blocks = [0, 1, 2].map((i) => ({ el: $('k' + i), at: 4.1 + i * 0.55, y: 640 - i * 124 }));
          SK.clip(ID, { T: 7, bg: null, update: (t) => {
            $('card').style.opacity = M.eo(t / 0.25).toFixed(4);
            const swap = M.eo((t - 3.4) / 0.35);
            SK.enter($('h'), t - 0.2, 'rise');
            $('h').textContent = t < 3.6 ? 'Dari lihat sampai langganan' : 'Yang ditumpuk tiap bulan';
            for (const b of bands) {
              const w = b.w(t);
              b.el.style.width = w.toFixed(1) + 'px';
              b.el.style.left = (540 - w / 2).toFixed(1) + 'px';
              SK.enter(b.el, t - 0.3, 'fade');
              b.el.style.opacity = (Math.min(1, Math.max(0, (t - 0.3) / 0.2)) * (1 - swap)).toFixed(4);
            }
            for (const k of blocks) {
              SK.enter(k.el, t - k.at, 'drop', { dy: 420 });
              k.el.style.top = k.y + 'px';
            }
            SK.enter($('tot'), t - 5.9, 'rise');
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/motion-graphic/compositions/mg-08-dots-bubbles.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #dots { position: absolute; left: 190px; top: 380px; width: 700px; height: 700px; }
        .d { position: absolute; width: 50px; height: 50px; border-radius: 50%; background: #2e2a40; }
        #pct { position: absolute; left: 0; right: 0; top: 180px; text-align: center; font-size: 160px; font-weight: 800; letter-spacing: -0.04em; color: var(--sk-accent); font-feature-settings: "tnum" 1; }
        #cap { position: absolute; left: 0; right: 0; top: 1130px; text-align: center; font-size: 46px; font-weight: 600; color: var(--sk-ink); }
        #plot { position: absolute; left: 0; top: 0; }
        #yr { position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 300px; font-weight: 800; color: #221f33; letter-spacing: -0.05em; font-feature-settings: "tnum" 1; }
        .ax { position: absolute; font-size: 34px; font-weight: 600; color: var(--sk-muted); }
        .bub { position: absolute; left: 0; top: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: 800; color: #13111c; }
      </style>
      <div id="root" data-composition-id="mg-08-dots-bubbles" data-width="1080" data-height="1920" data-duration="7">
        <div class="sk-stage sk-mg sk-pal-mg-ai-violet">

          <div id="pct">0%</div>
          <div id="dots"></div>
          <div id="cap">pesanan masuk lewat chat</div>
          <div id="yr">2019</div>
          <svg id="plot" width="1080" height="1920" viewBox="0 0 1080 1920"><path id="axY" class="sk-stroke" d="M140 420 L140 1260" style="stroke:#4c4868;stroke-width:5" /><path id="axX" class="sk-stroke" d="M140 1260 L960 1260" style="stroke:#4c4868;stroke-width:5" /></svg>
          <div class="ax" id="ay" style="left:150px;top:370px">omzet</div>
          <div class="ax" id="axl" style="left:800px;top:1290px">pelanggan</div>
          <div class="bub" id="bA" style="background:var(--sk-accent)">A</div>
          <div class="bub" id="bB" style="background:var(--sk-accent-2)">B</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mg-08-dots-bubbles';
          const $ = SK.finder(ID);

          // dot-matrix: 100 dots; 38 fill in index order, done on "persen" (2.4 s)
          const box = $('dots');
          box.innerHTML = Array.from({ length: 100 }, (_, i) => `<i class="d" style="left:${(i % 10) * 70}px;top:${Math.floor(i / 10) * 70}px"></i>`).join('');
          const dots = Array.from(box.children);
          const fill = (t) => Math.round(38 * M.eo((t - 0.9) / 1.5));
          // bubble-move: two bubbles travel from 2019 to 2024 across two axes; the year counts behind
          const P = { bA: { x: M.track(230, [[4.0, 820, [9, 1]]]), y: M.track(1150, [[4.0, 560, [9, 1]]]), r: M.track(60, [[4.0, 130, [9, 1]]]) },
                      bB: { x: M.track(330, [[4.0, 560, [9, 1]]]), y: M.track(1000, [[4.0, 880, [9, 1]]]), r: M.track(90, [[4.0, 100, [9, 1]]]) } };
          SK.clip(ID, { T: 7, update: (t) => {
            const a = 1 - M.eo((t - 3.1) / 0.3);
            const n = fill(t);
            dots.forEach((d, i) => { d.style.background = i < n ? 'var(--sk-accent)' : '#2e2a40'; });
            for (const id of ['pct', 'dots', 'cap']) $(id).style.opacity = (Math.min(1, Math.max(0, t / 0.25)) * a).toFixed(4);
            $('pct').textContent = n + '%';
            const b = M.eo((t - 3.3) / 0.3);
            for (const id of ['yr', 'plot', 'ay', 'axl']) $(id).style.opacity = b.toFixed(4);
            SK.draw($('axY'), M.eo((t - 3.3) / 0.4)); SK.draw($('axX'), M.eo((t - 3.4) / 0.4));
            const yr = t < 3.6 ? 2019 : Math.round(2019 + 5 * M.eo((t - 3.6) / 3.0));
            $('yr').textContent = String(yr);
            for (const id of ['bA', 'bB']) {
              const p = P[id], r = p.r(t), el = $(id);
              el.style.width = el.style.height = (2 * r).toFixed(1) + 'px';
              el.style.transform = `translate(${(p.x(t) - r).toFixed(2)}px,${(p.y(t) - r).toFixed(2)}px)`;
              el.style.opacity = b.toFixed(4);
            }
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/motion-graphic/compositions/mg-09-province-pin.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the places are named to show the mechanism. In a real clip the provinces and the pin are the ones the speaker names (Gate 2 R1); the province map is Natural Earth 5.1.2 and is not a statement of current borders. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #title { position: absolute; left: 80px; top: 300px; font-size: 64px; font-weight: 800; color: var(--sk-ink); }
        #sub { position: absolute; left: 82px; top: 384px; font-size: 32px; color: var(--sk-muted); }
        #mapbox { position: absolute; left: 0; top: 520px; width: 1080px; height: 640px; overflow: hidden; }
        #map { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
        #pin { position: absolute; left: 0; top: 0; width: 40px; }
        .lab { position: absolute; padding: 6px 16px; border-radius: 10px; background: var(--sk-ink); color: #ffffff; font-size: 30px; font-weight: 700; white-space: nowrap; }
        #src { position: absolute; left: 80px; top: 1200px; font-size: 26px; color: var(--sk-muted); }
      </style>
      <div id="root" data-composition-id="mg-09-province-pin" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-mg" style="--sk-bg:#f4efe6;--sk-ink:#1c1917;--sk-accent:#2563eb;--sk-muted:#a8a29e">

          <div id="title">Pelanggan kami ada di</div>
          <div id="sub">ilustrasi &middot; peta: Natural Earth</div>
          <div id="mapbox"><div id="map"></div><div class="sk-pin" id="pin"></div></div>
          <div class="lab" id="l0">Jawa Barat</div>
          <div class="lab" id="l1">Jawa Timur</div>
          <div class="lab" id="l2">Sulawesi Selatan</div>
          <div id="src">Natural Earth 5.1.2 (33 provinsi)</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mg-09-province-pin';
          const $ = SK.finder(ID);

          // view: lon 104..122 across the frame (Java to Sulawesi), map pixels scaled by K and shifted
          const K = 1080 / ((122 - 104) * 50), OX = -(104 - 94) * 50 * K, OY = -(7.5 - 0) * 50 * K + 40;
          const NAMES = ['jawa-barat', 'jawa-timur', 'sulawesi-selatan'];
          $('map').innerHTML = SK.mapSvg('id-provinces', { fill: '#cfc6b4', regions: Object.fromEntries(NAMES.map((n) => [n, '#cfc6b4'])) });
          $('map').style.transform = `translate(${OX.toFixed(1)}px,${OY.toFixed(1)}px) scale(${K})`;
          // find regions by data attribute (the linter rejects template-literal selectors)
          const all = Array.from($('map').querySelectorAll('[data-region]'));
          const regions = NAMES.map((n) => all.find((p) => p.getAttribute('data-region') === n));
          const at = [1.0, 1.6, 2.2];
          // label anchors: each province's city, in frame pixels
          const pt = (c) => { const g = SK.geo(...SK.CITIES[c], 'id-provinces'); return { x: OX + g.x * K, y: 520 + OY + g.y * K }; };
          const anchors = [pt('bandung'), pt('surabaya'), pt('makassar')];
          const pin = pt('makassar');
          SK.clip(ID, { T: 6, update: (t) => {
            SK.enter($('title'), t - 0.1, 'rise'); SK.enter($('sub'), t - 0.3, 'fade');
            $('mapbox').style.opacity = M.eo((t - 0.3) / 0.4).toFixed(4);
            regions.forEach((r, i) => { r.setAttribute('fill', M.eo((t - at[i]) / 0.3) > 0.5 ? '#2563eb' : '#cfc6b4'); });
            anchors.forEach((a, i) => {
              const el = $('l' + i);
              el.style.left = (i === 2 ? a.x - 300 : a.x - 60).toFixed(1) + 'px';   // Sulawesi's label sits left of the city, inside the frame
              el.style.top = (a.y + (i === 1 ? 44 : -86)).toFixed(1) + 'px';
              SK.enter(el, t - at[i] - 0.1, 'pop');
            });
            SK.enter($('pin'), t - 3.4, 'drop', { dy: 160 });
            $('pin').style.left = (pin.x - 20).toFixed(1) + 'px';
            $('pin').style.top = (pin.y - 520 - 60).toFixed(1) + 'px';
            SK.enter($('src'), t - 0.6, 'fade');
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/motion-graphic/compositions/mg-10-route.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the cities are named to show the mechanism. In a real clip the route joins the places the speaker names (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        #card { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; background: var(--sk-bg); overflow: hidden; }
        #map { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
        #arcs { position: absolute; left: 0; top: 0; }
        .dot { position: absolute; left: 0; top: 0; width: 26px; height: 26px; border-radius: 50%; background: var(--sk-accent); }
        .city { position: absolute; padding: 6px 14px; border-radius: 10px; background: #e6edf7; color: #0b1220; font-size: 30px; font-weight: 700; white-space: nowrap; }
        #title { position: absolute; left: 70px; top: 850px; font-size: 56px; font-weight: 800; color: var(--sk-ink); }
      </style>
      <div id="root" data-composition-id="mg-10-route" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-mg sk-pal-mg-fintech">

          <div id="card"><div id="map"></div>
            <svg id="arcs" width="1080" height="960" viewBox="0 0 1080 960"><path id="a0" class="sk-stroke" style="stroke:var(--sk-accent);stroke-width:7;stroke-dasharray:0" /><path id="a1" class="sk-stroke" style="stroke:var(--sk-accent-2);stroke-width:7" /></svg>
            <div class="dot" id="d0"></div><div class="dot" id="d1" style="background:var(--sk-accent-2)"></div>
            <div class="city" id="cJ">Jakarta</div><div class="city" id="cS">Singapura</div><div class="city" id="cM">Manila</div>
            <div id="title">Kirim ke luar negeri</div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mg-10-route';
          const $ = SK.finder(ID);

          const K = 1080 / 1980;   // the Southeast Asia map (1980 x 1332) fitted to the card width
          $('map').innerHTML = SK.mapSvg('sea', { fill: '#1e293b', stroke: '#0b1220', regions: { indonesia: '#334155' } });
          $('map').style.transform = `scale(${K})`;
          const P = (c) => { const g = SK.geo(...SK.CITIES[c], 'sea'); return { x: g.x * K, y: g.y * K - 40 }; };
          const J = P('jakarta'), S = P('singapore'), Mn = P('manila');
          $('map').style.top = '-40px';
          $('a0').setAttribute('d', SK.arcPath(J, S, 0.35));
          $('a1').setAttribute('d', SK.arcPath(J, Mn, -0.25));
          const place = (id, p, dx, dy) => { $(id).style.left = (p.x + dx).toFixed(1) + 'px'; $(id).style.top = (p.y + dy).toFixed(1) + 'px'; };
          place('cJ', J, -60, 24); place('cS', S, -150, -64); place('cM', Mn, -40, -64);
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            $('card').style.transform = `translateY(${(-(1 - M.eo(t / 0.35)) * 960).toFixed(2)}px)`;
            SK.enter($('title'), t - 0.3, 'rise');
            SK.enter($('cJ'), t - 0.5, 'pop');
            for (const [k, t0, dur, city] of [[0, 0.8, 1.3, 'cS'], [1, 2.8, 1.4, 'cM']]) {
              const u = M.eo((t - t0) / dur), path = $('a' + k);
              SK.draw(path, u);
              const p = SK.tip(path, u), d = $('d' + k);
              d.style.transform = `translate(${(p.x - 13).toFixed(2)}px,${(p.y - 13).toFixed(2)}px)`;
              d.style.opacity = u > 0 ? '1' : '0';
              SK.enter($(city), t - t0 - dur + 0.1, 'pop');
            }
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/motion-graphic/compositions/mg-11-kpi-orbit.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words and numbers are invented to show the mechanism. In a real clip every word is verbatim from the transcript and every number is spoken (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }

        .kpi { position: absolute; left: 80px; width: 920px; height: 230px; border-radius: 28px; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
        .kpi .ic { position: absolute; left: 40px; top: 60px; }
        .kpi .lb { position: absolute; left: 170px; top: 50px; font-size: 38px; font-weight: 600; color: var(--sk-muted); }
        .kpi .nm { position: absolute; left: 170px; top: 100px; font-size: 88px; font-weight: 700; line-height: 1; color: var(--sk-ink); font-feature-settings: "tnum" 1; }
        .kpi .dl { position: absolute; right: 40px; top: 70px; }
        #core { position: absolute; left: 390px; top: 820px; width: 300px; height: 300px; border-radius: 50%; background: var(--sk-ink); color: #ffffff; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 52px; font-weight: 700; line-height: 1.05; }
        .orb { position: absolute; left: 0; top: 0; width: 132px; height: 132px; border-radius: 50%; background: #ffffff; box-shadow: 0 8px 22px rgba(0,0,0,.1); display: flex; align-items: center; justify-content: center; }
      </style>
      <div id="root" data-composition-id="mg-11-kpi-orbit" data-width="1080" data-height="1920" data-duration="7">
        <div class="sk-stage sk-mg sk-type-mg-data" style="--sk-bg:#f5f4f0;--sk-ink:#0d0d0d;--sk-accent:#15803d;--sk-accent-2:#b91c1c;--sk-muted:#6b7280">

          <div class="kpi" id="k0" style="top:240px"><div class="ic"></div><div class="lb">Omzet</div><div class="nm sk-mono">Rp 0 jt</div><div class="dl"></div></div>
          <div class="kpi" id="k1" style="top:500px"><div class="ic"></div><div class="lb">Pelanggan</div><div class="nm sk-mono">0</div><div class="dl"></div></div>
          <div class="kpi" id="k2" style="top:760px"><div class="ic"></div><div class="lb">Waktu admin</div><div class="nm sk-mono">0 jam</div><div class="dl"></div></div>
          <div id="core">1 sistem</div>
          <div class="orb" id="o0"></div><div class="orb" id="o1"></div><div class="orb" id="o2"></div><div class="orb" id="o3"></div><div class="orb" id="o4"></div><div class="orb" id="o5"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mg-11-kpi-orbit';
          const $ = SK.finder(ID);

          // kpi-cards: icon, count-up, up/down arrow per card (illustrative numbers)
          const KP = [['coins', 48, 'Rp ', ' jt', 'trending-up', 'var(--sk-accent)'], ['users', 1250, '', '', 'trending-up', 'var(--sk-accent)'], ['clock', 6, '', ' jam', 'trending-down', 'var(--sk-accent-2)']];
          KP.forEach(([ic, , , , dl, col], i) => {
            $('k' + i).querySelector('.ic').innerHTML = SK.icon(ic, { size: 104, sw: 5, color: '#0d0d0d' });
            $('k' + i).querySelector('.dl').innerHTML = SK.icon(dl, { size: 88, sw: 6, color: col });
          });
          // icon-orbit: generic tool icons join one by one and circle the core slowly
          const ORB = ['message-circle', 'receipt', 'database', 'calendar', 'truck', 'wallet'];
          ORB.forEach((ic, i) => { $('o' + i).innerHTML = SK.icon(ic, { size: 64, sw: 4, color: '#0d0d0d' }); });
          SK.clip(ID, { T: 7, update: (t) => {
            const out = M.eo((t - 3.4) / 0.3);
            KP.forEach(([, n, pre, suf], i) => {
              const el = $('k' + i), t0 = 0.3 + i * 0.5;
              SK.enter(el, t - t0, 'rise');
              el.style.opacity = (Math.min(1, Math.max(0, (t - t0) / 0.2)) * (1 - out)).toFixed(4);
              el.querySelector('.nm').textContent = pre + SK.count(t, t0 + 0.1, t0 + 1.0, 0, n) + suf;
            });
            SK.enter($('core'), t - 3.7, 'pop');
            ORB.forEach((_, i) => {
              const el = $('o' + i), join = 4.0 + i * 0.3;
              const ang = (i * 60 - 90 + Math.max(0, t - 4.0) * 16) * Math.PI / 180, R = 300;
              el.style.transform = `translate(${(540 + Math.cos(ang) * R - 66).toFixed(2)}px,${(970 + Math.sin(ang) * R - 66).toFixed(2)}px)`;
              el.style.opacity = M.eo((t - join) / 0.25).toFixed(4);
            });
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 2: List them in the manifest and regenerate the host**

Create `docs/agents/references/style-examples/motion-graphic/examples.json`:

```json
{
  "style": "motion-graphic",
  "examples": [
    {"clip": "mg-01-count", "duration": 5.5, "treatment": "cutaway", "stills": [1.2, 5.2]},
    {"clip": "mg-02-compare-bars", "duration": 6, "treatment": "split", "stills": [1.5, 5.7]},
    {"clip": "mg-03-icon-grid", "duration": 6, "treatment": "cutaway", "stills": [1.0, 5.7]},
    {"clip": "mg-04-arrow-flow", "duration": 6, "treatment": "panel", "stills": [2.0, 5.7]},
    {"clip": "mg-05-race-timeline", "duration": 7, "treatment": "cutaway", "stills": [1.2, 5.6]},
    {"clip": "mg-06-before-venn", "duration": 6, "treatment": "split", "stills": [1.55, 5.2]},
    {"clip": "mg-07-funnel-stack", "duration": 7, "treatment": "panel", "stills": [2.8, 6.4]},
    {"clip": "mg-08-dots-bubbles", "duration": 7, "treatment": "cutaway", "stills": [2.6, 6.4]},
    {"clip": "mg-09-province-pin", "duration": 6, "treatment": "cutaway", "stills": [2.6, 4.6]},
    {"clip": "mg-10-route", "duration": 6, "treatment": "split", "stills": [2.4, 5.0]},
    {"clip": "mg-11-kpi-orbit", "duration": 7, "treatment": "cutaway", "stills": [2.8, 6.4]}
  ]
}
```

Run:

```bash
npm run -s style-examples -- build >/dev/null && npm run -s style-examples -- check
```

Expected: `example hosts are up to date`.

- [ ] **Step 3: Render and look at every new still**

Run:

```bash
npm run check:style-examples -- motion-graphic
```

Expected: `0 errors`; stills in `renders/style-examples/motion-graphic/`.

Clip-local still times: mg-05 1.2 (bars re-sorting) / 5.6 (timeline marker on the last date); mg-06 1.55 (before/after rows, "before" greyed) / 5.2 (venn overlap tinted); mg-07 2.8 (funnel bands, centred) / 6.4 (stack total); mg-08 2.6 (dot fill) / 6.4 (bubbles at the end value); mg-09 2.6 (pin + first province) / 4.6 (provinces lit, labels left of the city); mg-10 2.4 (arc drawing) / 5.0 (dot arrived, title at the bottom); mg-11 2.8 (KPI cards counted) / 6.4 (icons orbiting). Known traps: `SK.enter` overwrites `transform`, so centre funnel bands with `left = 540 − w/2`; zoom the province map (lon 104–122) or it is too small to read; a template-literal `querySelector` fails lint (`template_literal_selector`).

- [ ] **Step 4: Document the patterns and examples**

In `docs/agents/references/styles/motion-graphic.md` replace:

old:
```md
(`mg-01` … `mg-04`,
```

new:
```md
(`mg-01` … `mg-11`,
```

In `docs/agents/references/styles/motion-graphic.md` replace:

old:
```md


## References
```

new:
```md

| **province-glow** | A province map; each named province fills with the accent in turn, with a label | Where customers or offices are ("Jawa Barat, Jawa Timur…") | Each province fills on its name, 0.3 s | soft pop per region | Tinting provinces that were not named; claiming current administrative borders (NE 5.1.2 = 33 provinces) | `SK.mapSvg('id-provinces', { regions })`, fill via `M.track` |
| **route-arc** | An arc draws from city A to city B on a Southeast Asia or world map; a dot travels along it | "kirim dari Jakarta ke Singapura", expansion | The arc draws over the phrase; the dot arrives on the destination name | whoosh | Straight lines; routes to places nobody named | `SK.geo` + `SK.arcPath(p0, p1, bend)` + `SK.draw`, dot via `SK.tip` |
| **kpi-cards** | 2–3 stat cards: icon, count-up number, up/down arrow | Several business numbers in one breath | Each card enters with its number; the count stops on the last syllable | tick per card | Numbers nobody said; more than three cards | `SK.icon` + `SK.count` + `.sk-a` cards with `'rise'` |
| **icon-orbit** | A label in the middle; tool icons enter one by one and orbit | "nyambung ke semua tools", integrations | One icon per named tool; slow orbit (≤ 20°/s) | soft blip | Real brand logos (use generic icons); spinning fast | `SK.icon` placed on an angle via `M.track`, fixed radius |

## References
```

In `docs/agents/references/styles/motion-graphic.md` replace:

old:
```md
| scale-compare | deep soft boom | 0.14–0.18 |
```

new:
```md
| scale-compare | deep soft boom | 0.14–0.18 |
| map-pin, province-glow, icon-orbit | pin tick / soft pop / blip | 0.08–0.12 |
| route-arc, bubble-move | whoosh | 0.1–0.14 |
```

In `docs/agents/references/styles/motion-graphic.md` replace:

old:
```md
| `style-examples/motion-graphic/compositions/mg-04-arrow-flow.html` | arrow-flow + cycle-loop on a panel card | panel |
```

new:
```md
| `style-examples/motion-graphic/compositions/mg-04-arrow-flow.html` | arrow-flow + cycle-loop on a panel card | panel |
| `style-examples/motion-graphic/compositions/mg-05-race-timeline.html` | bar-race + timeline, fintech palette | cutaway |
| `style-examples/motion-graphic/compositions/mg-06-before-venn.html` | before-after (two rows, "before" greyed) + venn, sunrise palette | split |
| `style-examples/motion-graphic/compositions/mg-07-funnel-stack.html` | funnel + stack-up, Jakarta type, pictograms | panel |
| `style-examples/motion-graphic/compositions/mg-08-dots-bubbles.html` | dot-matrix + bubble-move, AI-violet palette | cutaway |
| `style-examples/motion-graphic/compositions/mg-09-province-pin.html` | map-pin + province-glow on `SK.mapSvg('id-provinces')` | cutaway |
| `style-examples/motion-graphic/compositions/mg-10-route.html` | route-arc on the `sea` map between `SK.CITIES` | split |
| `style-examples/motion-graphic/compositions/mg-11-kpi-orbit.html` | kpi-cards + icon-orbit, data type | cutaway |
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/agents/references/style-examples/motion-graphic docs/agents/references/styles/motion-graphic.md && git status --short && git commit -q -F - <<'MSG'
feat: motion-graphic examples for all 20 patterns (race, venn, funnel, dots, maps, KPI)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above (plus renames); the commit succeeds.

---

### Task 7: Pattern coverage test and final verification

**Files:**
- Modify: `scripts/style-docs.test.mjs` (coverage), `internal/docs/requirements/rd-03-video-editing-workflow.md` (RD-03-56), `docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md` (status)

- [ ] **Step 1: Add the coverage test and its requirement**

Append to `scripts/style-docs.test.mjs`:

```js
// Sub-project 2 coverage: in these styles every pattern has at least one rendered example
// (spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md). 2b and 2c add styles here.
const COVERED = ['broll-text.md', 'motion-graphic.md'];
for (const file of COVERED) {
  test(`${file}: every pattern has an example`, () => {
    const md = readFileSync(new URL('styles/' + file, REF), 'utf8');
    const patterns = section(md, 'Patterns').split('\n').filter((l) => l.startsWith('| **')).map((l) => l.match(/^\| \*\*([^*]+)\*\*/)[1]);
    const shown = section(md, 'Examples').split('\n').filter((l) => l.startsWith('| `style-examples/')).map((l) => l.split('|')[2]).join(' ');
    const missing = patterns.filter((p) => !new RegExp(`(^|[^a-z-])${p.replace(/[/-]/g, (c) => '\\' + c)}([^a-z-]|$)`).test(shown));
    assert.deepEqual(missing, [], `patterns without an example in ${file}`);
  });
}
```

In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

old:
```md
- **RD-03-57**
```

new:
```md
- **RD-03-56** (Ubiquitous) — Untuk setiap gaya yang tercakup (`COVERED` di
  `scripts/style-docs.test.mjs`), setiap pola di tabel Patterns referensi gaya
  shall punya minimal satu contoh yang bisa dirender di tabel Examples.
- **RD-03-57**
```

In `docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md` replace:

old:
```md
Status: approved (brainstorming 2026-09-28), belum diimplementasi
```

new:
```md
Status: implemented 2026-09-28 (plan `docs/superpowers/plans/2026-09-28-pattern-examples-2a.md`)
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)|every pattern"
```

Expected: both `every pattern has an example` tests pass; `pass 98`, `fail 0`.

- [ ] **Step 2: Run everything**

Run:

```bash
for s in test:style-kit test:asset-lib test:motion-kit test:video test:repliz test:render-blur; do npm run -s $s 2>&1 | grep -E "^ℹ fail"; done && npm run -s style-examples -- check && npm run -s asset-lib -- check
```

Expected: six `ℹ fail 0` lines, `example hosts are up to date`, and the asset-lib check clean.

Run:

```bash
npm run check:style-examples && npm run check
```

Expected: all seven hosts `0 errors` (contrast warnings only), root check `0 errors`.

- [ ] **Step 3: Commit**

Run:

```bash
git add scripts/style-docs.test.mjs internal/docs/requirements/rd-03-video-editing-workflow.md docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md && git status --short && git commit -q -F - <<'MSG'
test: every broll-text and motion-graphic pattern has an example

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above (plus renames); the commit succeeds.

Run:

```bash
git status --short && git log --oneline main..HEAD | cat
```

Expected: clean tree; the spec commit, the plan commit, and the seven task commits. Do not push; ask Dena before merging to `main`.

