# Shared Asset Library + Style Presets (Style Enrichment, Sub-project 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every one of the seven styles a rich, browsable asset library: ~500 catalogued assets (266 Lucide icons, 70 Phosphor pictograms, 50 doodles, marks, stamps, CSS frames, 10 VOX document templates, 5 maps + 37 cities, 24 textures (7 paper-pack, 3 paper-pack CSS, 6 procedural/overlay, 8 CC0), 36 paper objects, 4 hands, 5 layered scenes, 12 fonts), 56 palette/grade presets and 23 type presets, contact sheets an agent can look at, and the workflow wiring that makes Screen Plan use them.

**Architecture:** One library at `vendor/asset-lib/`. Hand-written sources live in `vendor/asset-lib/src/`; third-party data is fetched once from pinned versions and frozen (`icons/`, `pictograms/`, `fonts/`, `maps/`, `textures/`). `node scripts/asset-lib.mjs build` is a pure function of those files and writes `asset-lib.js` (the `SK.LIB` data + runtime helpers on top of style-kit), `asset-lib.css` (fonts, presets, object/texture classes), `catalog.json`, `LICENSES.md`, `CATALOG.md`, and `scenes/*/scene.json`; the test rebuilds in memory and fails on any drift. `sheets` renders one 1080×1920 contact sheet per kind with HyperFrames into `docs/agents/references/asset-catalog/sheets/`.

**Tech Stack:** HyperFrames 0.7.24 (pinned `npx`), GSAP + motion-kit + style-kit (vendored), Node 22+ built-ins (`node:test`, `node:vm`, global `fetch`), `tar`, `unzip`, `ffmpeg`, `cwebp`, Codex image generation (`codex-image` skill).

**Spec:** `docs/superpowers/specs/2026-09-27-asset-library-design.md`

**Evidence:** Every code block in this plan was written and run in a scratch copy of the repo on 2026-09-27 (`scratchpad/dev/repo`, a full rsync with `.git`): all fetchers ran against the pinned sources (266 icons, 70 pictograms, 13 font files, 4 maps + 37 cities, 8 textures); `node --test scripts/asset-lib.test.mjs` 25/25 once the sheets are rendered (the plan's fragments were also replayed task by task in a second clean copy, matching every expected count: 6, 15, 16, 20, 23, 24, 25); `test:style-kit` 82/82, `test:video` 16/16, `test:motion-kit` 15/15; `check:style-examples` with the library loaded and the `var(--sk-font-*)` fallbacks: 0 errors, 5 contrast warnings (same as main), **all 60 existing stills byte-identical** to a baseline rendered from main; `sheets` rendered 22 contact sheets (1.4 MB) that were reviewed by eye. Traps found and encoded here: a `/*@LIB@*/` inside the runtime's header comment made the build replace the wrong marker and close the comment early; restyling `.sk-doc` would change vx-01/vx-04 (new document layout lives in `.sk-docx`); `.sk-wb .sk-stroke` forces `stroke-width: 7` in viewBox units, so library strokes use `.sk-dpath`; `.sk-kraft-dark` averages #a68768 (not dark), which is why three legacy palettes fail ink contrast; a sheet tile's `background-size: cover` kills pattern textures; `mix-blend-mode: overlay` film grain is invisible on white; ambientCG textures can exceed 400 KB at JPEG q6 (the fetcher raises q until they fit); ambientCG has no blackboard, newspaper, or watercolour paper.

## Global Constraints

- No npm dependencies (ADR-0007); HyperFrames is always `npx --yes hyperframes@0.7.24`. Network is used only by `asset-lib fetch` and Codex; `build`, tests, and renders are offline.
- Budget: everything under `vendor/asset-lib/` plus `docs/agents/references/asset-catalog/sheets/` ≤ 25 MB (tested).
- Pinned sources: `lucide-static@1.48.0` (ISC), `@phosphor-icons/core@2.1.1` fill (MIT), fontsource `@5.3.0` Latin subsets (OFL-1.1; Permanent Marker and Special Elite Apache-2.0), Natural Earth v5.1.2 (public domain), ambientCG (CC0 1.0).
- Tag vocabulary (only these): `ai, uang, bisnis, umkm, chat, kerja, waktu, orang, perangkat, keamanan, data, logistik, ide, status, arah, tempat, hidup, media, kertas, peta, benda`. Styles: `broll-text, motion-graphic, whiteboard, vox, stop-motion, mix-media, parallax`.
- Generated files (`asset-lib.js`, `asset-lib.css`, `catalog.json`, `LICENSES.md`, `CATALOG.md`, `scenes/*/scene.json`, `asset-catalog/index.html` + `compositions/`) are never hand-edited; change `src/` and rebuild.
- Existing examples stay pixel-identical: never restyle `.sk-doc`, `.sk-stroke`, `.sk-grain`, or any paper-pack class; `style-kit.css` changes are `var(--sk-font-*, <old font>)` fallbacks only; the eight old `SK.CITIES` and `SK.HAND.write/point` keep their values.
- Clip rules unchanged: never set `visibility` in a clip; never name a `font-family` in a clip `<style>` (use `.sk-f-*`, `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`); never write `../` in a url; repeated paper objects are divs (`.sk-obj-*`), not repeated `<img>`.
- Asset content: no text, logos, serial numbers, or real brands in generated art; no real banknote designs; no people except stick figures and Dena's own footage; every `SK.doc` document shows the Ilustrasi tag.
- Legacy palette contrast exceptions are exactly: `text.paper:accent`, `mg.default:accent2`, `mg.mint:accent2`, `vox.dark-desk:ink+accent2`, `stop.night-desk:ink`, `mm.night-zine:ink` — Dena approved keeping the first three on 2026-09-27; the three `.sk-kraft-dark` ones were found later by measuring the texture and are kept under the same decision (confirm with Dena before Task 5 if she has not yet). No new palette may be an exception.
- Docs language: `docs/agents/**` English; `internal/docs/**` Indonesian.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Replacement steps give exact **old** and **new** blocks; each old block must match exactly once — if not, stop and re-read the file.
- In this agent shell the `rtk` hook rewrites some commands: run raw `curl`/`cat` of JSON as `rtk proxy …`; `npm run` and `node` are unaffected.
- Codex jobs take 1–3 min each: run them as background commands **one at a time**. (Executing this plan on 2026-09-27, three concurrent `codex-image` runs handed one scene job another job's image — two references came back byte-identical; check SHA-256 uniqueness after every batch.)

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `internal/docs/requirements/rd-03-video-editing-workflow.md`, `internal/docs/adr/0016-shared-asset-library.md`, `internal/docs/README.md`, `internal/docs/operations/runbook.md` | Modify/Create | EARS RD-03-50..55, ADR, index, commands |
| `scripts/lib/svg-path.mjs` | Create | SVG path tokenizer, absolutizer, subpath split, shape → path |
| `scripts/lib/geo-svg.mjs` | Create | Natural Earth GeoJSON → equirectangular SVG |
| `scripts/lib/asset-lib-build.mjs` | Create | Pure build: catalog, LICENSES, CATALOG, JS, CSS, scene.json |
| `scripts/lib/asset-lib-fetch.mjs` | Create | Pinned fetchers (icons, pictograms, fonts, maps, textures) + `processImage` |
| `scripts/lib/asset-lib-sheets.mjs` | Create | Contact-sheet pages, project, render |
| `scripts/asset-lib.mjs` | Create | CLI: `fetch`, `build`, `check`, `process`, `sheets` |
| `scripts/asset-lib.test.mjs` | Create | `npm run test:asset-lib` |
| `vendor/asset-lib/src/{runtime.js,base.css,icons.json,pictograms.json,fonts.json,presets.json,maps.json,docs.json,items.json}` | Create | Sources |
| `vendor/asset-lib/src/{doodles,marks,frames}/*.svg` | Create | Hand-authored strokes |
| `vendor/asset-lib/{icons,pictograms,fonts,maps,textures,paper,hands,scenes}/` | Create (fetch/Codex) | Frozen data and reviewed bitmaps |
| `vendor/asset-lib/{asset-lib.js,asset-lib.css,catalog.json,LICENSES.md,CATALOG.md}` | Generated | Build outputs |
| `docs/agents/references/asset-catalog/**` | Generated | Contact-sheet project + `sheets/*.webp` |
| `vendor/style-kit/style-kit.css` | Modify | Font roles read `--sk-font-*` with the old font as fallback |
| `docs/agents/references/style-examples/index.html`, `scripts/check-broll-examples.mjs`, `templates/dena-video/index.html` | Modify | Load the library |
| `package.json`, `AGENTS.md`, `CLAUDE.md`, `THIRD_PARTY_NOTICES.md` | Modify | Scripts, commands, notices |
| `docs/agents/references/styles/*.md`, `styles/README.md`, `asset-production.md`, `docs/agents/02-screen-plan.md`, `docs/agents/03-build.md`, `scripts/style-docs.test.mjs` | Modify | Preset tables, `## Kit`, workflow wiring, Kit test |
| `docs/superpowers/specs/2026-09-27-asset-library-design.md` | Modify | Sync with what was built |

---

### Task 0: Preflight

**Files:** none (checks only)

- [ ] **Step 1: Confirm the branch and a clean tree**

Run: `git branch --show-current && git status --short`
Expected: `feat/asset-lib` and no output from status. If you are on `main`, run `git checkout feat/asset-lib`.

- [ ] **Step 2: Confirm the tools**

Run: `node --version && which tar unzip ffmpeg cwebp && ls ~/.claude/skills/codex-image/scripts/codex-image.sh`
Expected: Node ≥ 22 and every path printed. If `cwebp` is missing: `brew install webp`.

- [ ] **Step 3: Render the pixel baseline from the current examples**

Run: `npm run check:style-examples && rm -rf /tmp/asset-lib-baseline && cp -R renders/style-examples /tmp/asset-lib-baseline && ls /tmp/asset-lib-baseline/frame-*.png | wc -l`
Expected: lint/validate `0 errors`, then `60`. Every later "pixel-identical" check compares against `/tmp/asset-lib-baseline`.

- [ ] **Step 4: Create the staging folder for generated art**

Run: `mkdir -p "$TMPDIR/asset-lib-staging" && echo "$TMPDIR/asset-lib-staging"`
Codex outputs land here first with a `SHA256SUMS` file (they cannot be regenerated identically); only reviewed files are copied into the repo.

---

### Task 1: Requirements, ADR, and index first (docs-first rule)

**Files:**
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md`
- Create: `internal/docs/adr/0016-shared-asset-library.md`
- Modify: `internal/docs/README.md`

- [ ] **Step 1: Add EARS RD-03-50..55 under `## Style b-roll`**

In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

old:
```md
  clip, sehingga teks yang disembunyikan tidak pernah terbaca selama kartu
  bergerak masuk.

## Referensi
```

new:
```md
  clip, sehingga teks yang disembunyikan tidak pernah terbaca selama kartu
  bergerak masuk.
- **RD-03-50** (Event-driven) — When fase Screen Plan memilih motion visual,
  agen shall membaca `vendor/asset-lib/CATALOG.md` dan contact sheet gaya itu
  (`docs/agents/references/asset-catalog/sheets/`) sebelum meminta aset baru
  per video.
- **RD-03-51** (Ubiquitous) — Palet dan tipografi di Style B-roll Brief shall
  berupa preset bernama (`sk-pal-*`, `sk-grade-px-*`, `sk-type-*`) yang ada di
  `vendor/asset-lib/asset-lib.css`, atau hex eksplisit dengan alasan.
- **RD-03-52** (Ubiquitous) — Aset pustaka di daftar `Assets:` shall ditulis
  dengan id katalog yang ada di `vendor/asset-lib/catalog.json`.
- **RD-03-53** (Ubiquitous) — Pustaka aset shall mencatat setiap file di
  `catalog.json` dan `LICENSES.md`, ter-track di git, dengan total (pustaka +
  contact sheet) ≤ 25 MB.
- **RD-03-54** (Ubiquitous) — Setiap dokumen dari `SK.doc` shall menampilkan
  tag "Ilustrasi"; tag itu tidak bisa dimatikan.
- **RD-03-55** (Unwanted) — If sebuah aset per video menduplikasi aset yang
  sudah ada di pustaka, then fase Build shall memakai aset pustaka, kecuali
  brief mencatat alasannya.

## Referensi
```

- [ ] **Step 2: Write ADR-0016**

Create `internal/docs/adr/0016-shared-asset-library.md`:

```md
# ADR-0016 Pustaka aset bersama + preset palet/tipografi
Status: accepted
Date: 2026-09-27

## Context

Tujuh gaya (ADR-0012..0015) punya pola dan referensi yang kaya, tetapi bahan
mentahnya tipis: 19 ikon (`M.IC`), 7 tekstur, 2 selotip, 2 tangan, satu peta,
lima font, dan palet yang hanya tertulis sebagai tabel hex. Dena ingin
referensi yang lebih kaya supaya pilihan visual di Screen Plan lebih variatif.
Permintaan dipecah jadi tiga sub-proyek: (1) pustaka aset + preset, (2) pola +
contoh baru, (3) moodboard.

Spike 2026-09-27 (salinan scratch, HyperFrames 0.7.24): `@font-face` di sheet
baru dan class `var(--sk-font-*)` lolos lint; `SK.rough` (sampel
`getPointAtLength` + gelombang sinus berseed) byte-identik di dua render;
memuat pustaka tidak mengubah satu piksel pun dari 60 still contoh; `filter`
pada `.sk-view` mempertahankan 3D. Pengukuran warna rata-rata tekstur menemukan
`.sk-kraft-dark` #a68768 — tiga palet lama bertinta terang di atasnya gagal
kontras.

## Decision

- Satu pustaka `vendor/asset-lib/` (bukan pack per gaya), dikelompokkan per
  jenis dan di-tag per gaya + topik. Sumber tulisan tangan di `src/`; data
  pihak ketiga di-fetch sekali dari versi yang dipin lalu dibekukan; `build`
  menghasilkan `asset-lib.js`, `asset-lib.css`, `catalog.json`, `LICENSES.md`,
  `CATALOG.md`. Test membangun ulang di memori dan gagal bila ada drift.
- Vektor dulu (ikon, pictogram, doodle, tanda, stempel, peta sebagai path);
  bitmap hanya untuk benda fisik (kertas, tangan, scene, tekstur).
- Preset: 8 palet per gaya (4 lama sebagai class + 4 baru), 8 grade parallax,
  23 preset tipografi; peran font di style-kit membaca `--sk-font-*` dengan font
  lama sebagai fallback. Enam pengecualian kontras palet lama dipertahankan
  (tiga disetujui Dena; tiga `.sk-kraft-dark` ditemukan lewat pengukuran dan
  diperlakukan sama) dan dikunci oleh test.
- Contact sheet dirender dengan HyperFrames supaya agen bisa melihat pilihan.
- `paper-pack` tidak dipindah; katalog mendaftarkannya.

## Rationale

- Satu tempat untuk lisensi, anggaran, dan pencarian; tanpa duplikasi antar gaya.
- Build murni + test drift menjaga katalog, lisensi, dan data selalu sinkron.
- Fallback `var()` membuat preset tipografi tidak mengubah contoh lama.

## Consequences

- Menambah aset = ubah `src/` (atau fetch/Codex) lalu `npm run asset-lib -- build`
  dan `sheets`.
- Peta provinsi Natural Earth 5.1.2 berisi 33 provinsi (sebelum pemekaran
  Kalimantan Utara dan Papua) — tidak untuk klaim batas administratif terbaru.
- Sub-proyek 2 (pola + contoh) dan 3 (moodboard) memakai pustaka ini.

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-asset-library-design.md`
- Plan: `docs/superpowers/plans/2026-09-27-asset-library.md`
- [ADR-0007](0007-no-local-npm-deps-pinned-npx.md), [ADR-0012](0012-style-broll-style-kit.md),
  [ADR-0013](0013-paper-pack-bitmap-assets.md), [ADR-0014](0014-vox-mix-media.md),
  [ADR-0015](0015-parallax-css-3d.md)
```

- [ ] **Step 3: Register the ADR in the index**

In `internal/docs/README.md` replace:

old:
```md
37. [adr/0015-parallax-css-3d.md](adr/0015-parallax-css-3d.md) - 2.5D parallax lewat multiplane CSS 3D, `parallax-stage`, dan `video layers`; ketujuh gaya lengkap.
```

new:
```md
37. [adr/0015-parallax-css-3d.md](adr/0015-parallax-css-3d.md) - 2.5D parallax lewat multiplane CSS 3D, `parallax-stage`, dan `video layers`; ketujuh gaya lengkap.
38. [adr/0016-shared-asset-library.md](adr/0016-shared-asset-library.md) - Pustaka aset bersama `vendor/asset-lib/` (ikon, doodle, kertas, peta, tekstur, scene, font), preset palet/tipografi, dan contact sheet.
```

Then replace `| Keputusan arsitektur | [adr/](adr/) (0001–0015) |` with `| Keputusan arsitektur | [adr/](adr/) (0001–0016) |`.

The index is one numbered list (1–47 on 2026-09-27), so the inserted line pushes every later entry down by one. Renumber the whole list:

```bash
python3 - <<'PY'
import re
p = 'internal/docs/README.md'; lines = open(p).read().split('\n'); n = 0
for i, l in enumerate(lines):
    m = re.match(r'^(\d+)\. ', l)
    if m: n += 1; lines[i] = f'{n}. ' + l[m.end():]
open(p, 'w').write('\n'.join(lines))
print(n)
PY
```

Expected: `48`, and `git diff internal/docs/README.md` shows only the new line, the renumbered entries, and the `0001–0016` row.

- [ ] **Step 4: Commit**

```bash
git add internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/adr/0016-shared-asset-library.md internal/docs/README.md
git commit -m "docs: EARS and ADR-0016 for the shared asset library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: SVG path and map helpers

**Files:**
- Create: `scripts/lib/svg-path.mjs`, `scripts/lib/geo-svg.mjs`
- Create: `scripts/asset-lib.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `tokenize(d)`, `absolutize(d) → [[cmd, ...nums]]`, `stringify(cmds)`, `splitSubpaths(d) → string[]` (one absolute path per subpath), `shapeToPath(tag, attrs) → d`; `dp(pts, tol)`, `ringArea(ring)`, `geomPath(geom, box) → d`, `mapSvg(box, layers, note) → svg`. `box = {lon0, lon1, lat0, lat1, k, tol, minArea}`; a layer is `{id, fill, stroke?, strokeWidth?, each?, features: [{id, geometry}]}`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/asset-lib.test.mjs`:

```js
// Asset library guard (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md, "Pengujian").
// Later tasks replace this header and append build, catalog, preset, runtime, and sheet checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absolutize, shapeToPath, splitSubpaths, stringify, tokenize } from './lib/svg-path.mjs';
import { dp, geomPath, mapSvg, ringArea } from './lib/geo-svg.mjs';

// ---- svg-path ----------------------------------------------------------------------------------------
test('splitSubpaths makes relative commands, H/V, implicit lineto, and compact arc flags absolute', () => {
  assert.deepEqual(splitSubpaths('m21 21-4.3-4.3'), ['M21 21L16.7 16.7']);
  assert.deepEqual(splitSubpaths('M3 3v18h18m-3-5-5-5-4 4-3-3'), ['M3 3L3 21L21 21', 'M18 16L13 11L9 15L6 12']);
  assert.deepEqual(splitSubpaths('M12 2a1 1 0 011 1'), ['M12 2A1 1 0 0 1 13 3']);
  assert.deepEqual(splitSubpaths('m6.134 14.768.866-.5 2 3.464'), ['M6.134 14.768L7 14.268L9 17.732']);
  assert.deepEqual(splitSubpaths('M13.744 17.736a6 6 0 1 1-7.48-7.48'), ['M13.744 17.736A6 6 0 1 1 6.264 10.256']);
});
test('S and T reflect the previous control point; z returns to the subpath start', () => {
  assert.equal(stringify(absolutize('M0 0C1 1 2 1 3 0S5 -1 6 0')), 'M0 0C1 1 2 1 3 0C4 -1 5 -1 6 0');
  assert.equal(stringify(absolutize('M0 0Q1 1 2 0T4 0')), 'M0 0Q1 1 2 0Q3 -1 4 0');
  assert.deepEqual(splitSubpaths('M10 10l5 0z m2 2l1 0'), ['M10 10L15 10Z', 'M12 12L13 12']);
});
test('tokenize rejects a command with the wrong number of arguments', () => {
  assert.throws(() => tokenize('M1'), /M needs a multiple of 2/);
});
test('shapeToPath turns every Lucide shape into path data', () => {
  assert.deepEqual(splitSubpaths(shapeToPath('circle', { cx: '16', cy: '8', r: '6' })), ['M10 8A6 6 0 1 0 22 8A6 6 0 1 0 10 8Z']);
  assert.deepEqual(splitSubpaths(shapeToPath('rect', { x: '2', y: '4', width: '20', height: '16', rx: '2' })), ['M4 4L20 4A2 2 0 0 1 22 6L22 18A2 2 0 0 1 20 20L4 20A2 2 0 0 1 2 18L2 6A2 2 0 0 1 4 4Z']);
  assert.equal(shapeToPath('rect', { x: '1', y: '1', width: '4', height: '2' }), 'M1 1H5V3H1Z');
  assert.equal(shapeToPath('line', { x1: '1', y1: '2', x2: '3', y2: '4' }), 'M1 2L3 4');
  assert.equal(shapeToPath('polyline', { points: '22 7 13.5 15.5 8.5 10.5' }), 'M22 7L13.5 15.5L8.5 10.5');
  assert.equal(shapeToPath('polygon', { points: '0 0 4 0 2 3' }), 'M0 0L4 0L2 3Z');
  assert.equal(shapeToPath('ellipse', { cx: '5', cy: '5', rx: '4', ry: '2' }), 'M1 5A4 2 0 1 0 9 5A4 2 0 1 0 1 5Z');
  assert.throws(() => shapeToPath('text', {}), /unsupported shape <text>/);
});
// ---- geo-svg -----------------------------------------------------------------------------------------
test('dp drops near-collinear points and keeps corners; ringArea is the shoelace area', () => {
  assert.deepEqual(dp([[0, 0], [1, 0.001], [2, 0]], 0.01), [[0, 0], [2, 0]]);
  assert.deepEqual(dp([[0, 0], [1, 1], [2, 0]], 0.01), [[0, 0], [1, 1], [2, 0]]);
  assert.equal(ringArea([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]), 1);
});
test('geomPath projects equirectangular pixels, skips far rings and tiny islands', () => {
  const box = { lon0: 94, lon1: 142, lat0: 7.5, lat1: -11.5, k: 50, tol: 0, minArea: 0.004 };
  const sq = { type: 'Polygon', coordinates: [[[100, 0], [101, 0], [101, -1], [100, -1], [100, 0]]] };
  assert.equal(geomPath(sq, box), 'M300 375L350 375L350 425L300 425L300 375Z');
  const far = { type: 'Polygon', coordinates: [[[10, 50], [11, 50], [11, 49], [10, 49], [10, 50]]] };
  assert.equal(geomPath(far, box), '');
  const tiny = { type: 'Polygon', coordinates: [[[100, 0], [100.01, 0], [100.01, -0.01], [100, 0]]] };
  assert.equal(geomPath(tiny, box), '');
  const svg = mapSvg(box, [{ id: 'provinces', each: true, fill: '#b9ad96', features: [{ id: 'a', geometry: sq }] }], 'note');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 2400 950" width="2400" height="950"><!-- note --><g id="provinces"/);
  assert.match(svg, /<path id="a" d="M300 375/);
});
```

- [ ] **Step 2: Add the test script and run it to see it fail**

In `package.json` replace:

old:
```json
    "test:style-kit": "node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs",
```

new:
```json
    "test:style-kit": "node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs",
    "test:asset-lib": "node --test scripts/asset-lib.test.mjs",
    "asset-lib": "node scripts/asset-lib.mjs",
```

Run: `npm run test:asset-lib`
Expected: FAIL — `Cannot find module …/scripts/lib/svg-path.mjs`.

- [ ] **Step 3: Write `scripts/lib/svg-path.mjs`**

```js
// SVG path helpers for the asset library build (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md).
// absolutize(d) rewrites every command as absolute (M L C Q A Z; H/V become L, S/T become C/Q),
// splitSubpaths(d) returns one absolute path string per subpath so each can be drawn or roughened alone.
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

export function tokenize(d) {
  const out = [];
  for (const m of d.matchAll(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g)) {
    const cmd = m[1], up = cmd.toUpperCase(), n = ARGS[up];
    // arc flags may be written without separators ("a2 2 0 011 1"): read them one digit at a time
    let nums;
    if (up === 'A') {
      nums = [];
      const s = m[2];
      let i = 0;
      const re = /[\s,]*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/iy;
      while (i < s.length) {
        const k = nums.length % 7;
        if (k === 3 || k === 4) {
          const f = /[\s,]*([01])/y; f.lastIndex = i; const fm = f.exec(s);
          if (!fm) break; nums.push(Number(fm[1])); i = f.lastIndex; continue;
        }
        re.lastIndex = i; const nm = re.exec(s);
        if (!nm) break; nums.push(Number(nm[1])); i = re.lastIndex;
      }
    } else nums = (m[2].match(NUM) || []).map(Number);
    if (n === 0) { out.push([cmd]); continue; }
    if (nums.length % n !== 0) throw new Error(`svg-path: ${cmd} needs a multiple of ${n} numbers, got ${nums.length} in "${m[0]}"`);
    for (let i = 0; i < nums.length; i += n) {
      // extra pairs after M/m are implicit L/l
      const c = i > 0 && up === 'M' ? (cmd === 'M' ? 'L' : 'l') : cmd;
      out.push([c, ...nums.slice(i, i + n)]);
    }
  }
  return out;
}

const r = (n) => Number(n.toFixed(3));

export function absolutize(d) {
  let x = 0, y = 0, sx = 0, sy = 0, cx = null, cy = null, qx = null, qy = null;
  const out = [];
  for (const [cmd, ...a] of tokenize(d)) {
    const rel = cmd !== cmd.toUpperCase(), up = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    let nc = null, nq = null;
    if (up === 'M') { x = a[0] + ox; y = a[1] + oy; sx = x; sy = y; out.push(['M', x, y]); }
    else if (up === 'L') { x = a[0] + ox; y = a[1] + oy; out.push(['L', x, y]); }
    else if (up === 'H') { x = a[0] + ox; out.push(['L', x, y]); }
    else if (up === 'V') { y = a[0] + (rel ? y : 0); out.push(['L', x, y]); }
    else if (up === 'C') { const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, a[4] + ox, a[5] + oy]; out.push(['C', ...p]); nc = [p[2], p[3]]; x = p[4]; y = p[5]; }
    else if (up === 'S') { const c1 = cx == null ? [x, y] : [2 * x - cx, 2 * y - cy]; const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy]; out.push(['C', ...c1, ...p]); nc = [p[0], p[1]]; x = p[2]; y = p[3]; }
    else if (up === 'Q') { const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy]; out.push(['Q', ...p]); nq = [p[0], p[1]]; x = p[2]; y = p[3]; }
    else if (up === 'T') { const c1 = qx == null ? [x, y] : [2 * x - qx, 2 * y - qy]; const p = [a[0] + ox, a[1] + oy]; out.push(['Q', ...c1, ...p]); nq = c1; x = p[0]; y = p[1]; }
    else if (up === 'A') { x = a[5] + ox; y = a[6] + oy; out.push(['A', a[0], a[1], a[2], a[3], a[4], x, y]); }
    else if (up === 'Z') { x = sx; y = sy; out.push(['Z']); }
    [cx, cy] = nc ?? [null, null];
    [qx, qy] = nq ?? [null, null];
  }
  return out;
}

export const stringify = (cmds) => cmds.map(([c, ...a]) => c + a.map(r).join(' ')).join('');

export function splitSubpaths(d) {
  const parts = [];
  for (const c of absolutize(d)) {
    if (c[0] === 'M') parts.push([c]);
    else parts[parts.length - 1].push(c);
  }
  return parts.filter((p) => p.length > 1).map(stringify);
}

// Lucide icon nodes are [tag, attrs]; turn every shape into path data so one drawing code path
// (SK.draw, SK.rough) handles all of them. Rounded rects keep their corners as arcs.
export function shapeToPath(tag, a) {
  const n = (k, dflt = 0) => (a[k] == null ? dflt : Number(a[k]));
  if (tag === 'path') return a.d;
  if (tag === 'line') return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
  if (tag === 'polyline' || tag === 'polygon') {
    const p = (a.points.match(NUM) || []).map(Number), pts = [];
    for (let i = 0; i < p.length; i += 2) pts.push(`${p[i]} ${p[i + 1]}`);
    return 'M' + pts.join('L') + (tag === 'polygon' ? 'Z' : '');
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = n('cx'), cy = n('cy'), rx = tag === 'circle' ? n('r') : n('rx'), ry = tag === 'circle' ? n('r') : n('ry');
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
  }
  if (tag === 'rect') {
    const x = n('x'), y = n('y'), w = n('width'), h = n('height');
    let rx = a.rx != null ? n('rx') : n('ry'), ry = a.ry != null ? n('ry') : rx;
    rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
    if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
  }
  throw new Error(`svg-path: unsupported shape <${tag}>`);
}
```

- [ ] **Step 4: Write `scripts/lib/geo-svg.mjs`**

```js
// Natural Earth GeoJSON → equirectangular SVG paths for the asset library maps
// (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md, "map"). Ported from the
// paper-pack make_map.py: x = (lon - lon0) * k, y = (lat0 - lat) * k, Douglas–Peucker in degrees,
// small islands dropped, rings far outside the box skipped.
export function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-12;
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], d = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax <= tol) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}

export const ringArea = (r) => Math.abs(r.reduce((s, p, i) => { const q = r[(i || r.length) - 1]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

// box = {lon0, lon1, lat0, lat1, k, tol, minArea}; returns an SVG path string (integer px)
export function geomPath(geom, box) {
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  const m = 2, out = [];
  for (const poly of polys) {
    const ring = poly[0];
    if (ringArea(ring) < box.minArea) continue;
    if (ring.every(([x, y]) => x < box.lon0 - m || x > box.lon1 + m || y > box.lat0 + m || y < box.lat1 - m)) continue;
    let far = 0, fd = -1;
    ring.forEach(([x, y], i) => { const d = Math.hypot(x - ring[0][0], y - ring[0][1]); if (d > fd) { fd = d; far = i; } });
    const s = [...dp(ring.slice(0, far + 1), box.tol).slice(0, -1), ...dp(ring.slice(far), box.tol)];
    if (s.length < 4) continue;
    out.push('M' + s.map(([x, y]) => `${Math.round((x - box.lon0) * box.k)} ${Math.round((box.lat0 - y) * box.k)}`).join('L') + 'Z');
  }
  return out.join('');
}

// layers = [{id, fill, features: [geojson feature]}]; returns the whole SVG document
export function mapSvg(box, layers, note) {
  const W = Math.round((box.lon1 - box.lon0) * box.k), H = Math.round((box.lat0 - box.lat1) * box.k);
  const body = layers.map((l) => {
    const paths = l.features.map((f) => ({ id: f.id, d: geomPath(f.geometry, box) })).filter((p) => p.d);
    if (l.each) return `<g id="${l.id}" fill="${l.fill}" stroke="${l.stroke ?? 'none'}" stroke-width="${l.strokeWidth ?? 0}">` + paths.map((p) => `<path id="${p.id}" d="${p.d}"/>`).join('') + '</g>';
    return `<path id="${l.id}" fill="${l.fill}" d="${paths.map((p) => p.d).join('')}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><!-- ${note} -->${body}</svg>\n`;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm run test:asset-lib`
Expected: `ℹ pass 6`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/svg-path.mjs scripts/lib/geo-svg.mjs scripts/asset-lib.test.mjs package.json
git commit -m "feat: SVG path and Natural Earth map helpers for the asset library

No docs update needed: helpers only; the library docs land with the build (Task 3).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Build pipeline, icons, pictograms, core runtime, and wiring

**Files:**
- Create: `scripts/lib/asset-lib-build.mjs`, `scripts/lib/asset-lib-fetch.mjs`, `scripts/asset-lib.mjs`
- Create: `vendor/asset-lib/src/{runtime.js,base.css,icons.json,pictograms.json,items.json}`
- Create (fetched): `vendor/asset-lib/icons/lucide.json`, `vendor/asset-lib/pictograms/phosphor.json`
- Create (built): `vendor/asset-lib/{asset-lib.js,asset-lib.css,catalog.json,LICENSES.md,CATALOG.md}`
- Modify: `scripts/asset-lib.test.mjs`, `docs/agents/references/style-examples/index.html`, `scripts/check-broll-examples.mjs`, `templates/dena-video/index.html`
- Modify: `AGENTS.md`, `CLAUDE.md`, `internal/docs/operations/runbook.md`, `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: `splitSubpaths`, `shapeToPath` (Task 2).
- Produces: `buildAll(root) → { path: content }`; exports `LIB = 'vendor/asset-lib'`, `TAGS`, `STYLES`, `KINDS`, `STYLE_KEY`, `OUTPUTS`, `parseStrokeSvg(src, file)`, `pngSize(buf)`. Catalog entry: `{id, kind, file | inline, use, styles, tags, source, license, prompt?, anchor?, bytes?}`. Fetchers `fetchIcons/fetchPictograms/fetchFonts/fetchMaps/fetchTextures(root)`, `makeGrainTiles(root)`, `processImage(in, out, {max, pad})`. CLI `npm run asset-lib -- fetch|build|check|process|sheets`. Runtime: `SK.LIB`, `SK.asset(id)`, `SK.icon(id, {size, sw, color})`, `SK.pict(id, {size, color})`, `SK.rough(svg, {seed, amp, step})`. Source formats: `src/items.json` is an array of catalog entries plus optional `legacy`, `overlay`, `torn`, `fetch`, `layers`, `light`, `provenance`, `changes`.

- [ ] **Step 1: Replace the test header and add the build, catalog, and runtime tests**

In `scripts/asset-lib.test.mjs` replace:

old:
```js
// Asset library guard (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md, "Pengujian").
// Later tasks replace this header and append build, catalog, preset, runtime, and sheet checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absolutize, shapeToPath, splitSubpaths, stringify, tokenize } from './lib/svg-path.mjs';
import { dp, geomPath, mapSvg, ringArea } from './lib/geo-svg.mjs';
```

new:
```js
// Asset library guard (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md, "Pengujian"):
// path + map helpers, generated files up to date, catalog ↔ files ↔ LICENSES, budget, presets contrast,
// fonts, hand anchors, and the SK runtime (icons, pictograms, strokes, rough, stamps, frames, docs, maps).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { absolutize, shapeToPath, splitSubpaths, stringify, tokenize } from './lib/svg-path.mjs';
import { dp, geomPath, mapSvg, ringArea } from './lib/geo-svg.mjs';
import { buildAll, LIB, OUTPUTS, parseStrokeSvg, pngSize, STYLE_KEY, STYLES, TAGS } from './lib/asset-lib-build.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const catalog = JSON.parse(read(`${LIB}/catalog.json`));
```

Then append to the end of the file:

```js
// ---- build outputs -----------------------------------------------------------------------------------
test('generated files match a fresh build (run: npm run asset-lib -- build)', () => {
  for (const [p, c] of Object.entries(buildAll(ROOT))) assert.equal(read(p), c, `${p} is stale`);
});
// ---- catalog -----------------------------------------------------------------------------------------
test('catalog ids are unique and every entry has a known kind, styles, and vocabulary tags', () => {
  const ids = catalog.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of catalog) {
    assert.ok(e.styles.length && e.styles.every((s) => STYLES.includes(s)), e.id);
    assert.ok(e.tags.length && e.tags.every((t) => TAGS.includes(t)), e.id);
    assert.ok(e.use, `${e.id} has no use`);
  }
});
test('every catalog file exists and is tracked in git', () => {
  const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n'));
  for (const e of catalog.filter((x) => x.file)) {
    assert.ok(existsSync(join(ROOT, e.file)), `${e.id}: ${e.file} is missing`);
    if (e.kind !== 'scene') assert.ok(tracked.has(e.file), `${e.id}: ${e.file} is not tracked in git`);
  }
});
const libFiles = (dir = '') => readdirSync(join(ROOT, LIB, dir), { withFileTypes: true }).flatMap((d) => {
  const p = dir ? `${dir}/${d.name}` : d.name;
  if (d.isDirectory()) return p === 'src' ? [] : libFiles(p);
  return d.name.startsWith('.') ? [] : [p];
});
test('every library file outside src/ has a LICENSES.md row', () => {
  const lic = read(`${LIB}/LICENSES.md`);
  for (const f of libFiles()) {
    if (OUTPUTS.includes(f) || f.endsWith('/scene.json')) continue;
    assert.ok(lic.includes('| `' + f + '` |'), `${f} is missing from ${LIB}/LICENSES.md`);
  }
});
test('the library and its contact sheets stay within 25 MB', () => {
  const sheets = 'docs/agents/references/asset-catalog/sheets';
  const lib = libFiles().reduce((n, f) => n + statSync(join(ROOT, LIB, f)).size, 0);
  const sh = existsSync(join(ROOT, sheets)) ? readdirSync(join(ROOT, sheets)).reduce((n, f) => n + statSync(join(ROOT, sheets, f)).size, 0) : 0;
  assert.ok(lib + sh <= 25 * 1024 * 1024, `${((lib + sh) / 1048576).toFixed(2)} MB`);
});
test('texture JPGs stay ≤ 400 KB and PNG assets keep alpha', () => {
  for (const f of libFiles()) {
    if (f.endsWith('.jpg')) assert.ok(statSync(join(ROOT, LIB, f)).size <= 400 * 1024, f);
    if (f.endsWith('.png')) {
      const b = readFileSync(join(ROOT, LIB, f));
      assert.ok(b[25] === 6 || b[25] === 4 || (b[25] === 3 && b.includes(Buffer.from('tRNS'))), `${f} has no alpha`);
    }
  }
});
// ---- runtime -----------------------------------------------------------------------------------------
function load() {
  const ctx = { document: { querySelector: () => null }, gsap: { timeline: () => ({ to() { return this; } }) } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['vendor/motion-kit/motion-kit.js', 'vendor/style-kit/style-kit.js', `${LIB}/asset-lib.js`]) vm.runInContext(read(f), ctx);
  return ctx.SK;
}
test('asset-lib refuses to load before style-kit', () => {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  assert.throws(() => vm.runInContext(read(`${LIB}/asset-lib.js`), ctx), /load vendor\/style-kit\/style-kit\.js before asset-lib\.js/);
});
test('SK.icon and SK.pict return sized SVG strings and name close matches for unknown ids', () => {
  const SK = load();
  const s = SK.icon('coins', { size: 120, sw: 3, color: '#123456' });
  assert.match(s, /^<svg class="sk-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#123456" stroke-width="0\.600"/);
  assert.equal((s.match(/<path /g) || []).length, 4);
  assert.equal(SK.icon('icon.coins'), SK.icon('coins'));
  assert.throws(() => SK.icon('coin'), /unknown icon "coin" \(did you mean .*coins/);
  assert.match(SK.pict('robot', { size: 48, color: 'red' }), /^<svg class="sk-pict" width="48" height="48" viewBox="0 0 256 256" fill="red"><path d="M/);
  assert.equal(SK.asset('icon.coins').inline, "SK.icon('coins')");
});
test('SK.rough is deterministic per seed, redraws each path once, and resets the length cache', () => {
  const SK = load();
  const mk = () => {
    const p = { d: 'M0 0L20 0', _skLen: 20, getTotalLength: () => 20, getPointAtLength: (s) => ({ x: s, y: 0 }), setAttribute(k, v) { this[k] = v; } };
    return { p, svg: { querySelectorAll: () => [p] } };
  };
  const a = mk(), b = mk(), c = mk();
  SK.rough(a.svg, { seed: 4 }); SK.rough(b.svg, { seed: 4 }); SK.rough(c.svg, { seed: 5 });
  assert.equal(a.p.d, b.p.d);
  assert.notEqual(a.p.d, c.p.d);
  assert.match(a.p.d, /^M-?\d+\.\d{2} -?\d+\.\d{2}C/);
  assert.equal(a.p._skLen, null);
  const once = a.p.d; SK.rough(a.svg, { seed: 9 }); assert.equal(a.p.d, once);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:asset-lib`
Expected: FAIL — `Cannot find module …/scripts/lib/asset-lib-build.mjs`.

- [ ] **Step 3: Write the pure build, `scripts/lib/asset-lib-build.mjs`**

```js
// Build the shared asset library (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md).
// Pure: buildAll(root) reads vendor/asset-lib/src + the frozen fetch data and returns
// { 'vendor/asset-lib/<file>': content } for every generated file; the CLI writes them and the
// test compares them with disk. One source per kind:
//   icons      src/icons.json (names per tag)        + icons/lucide.json (fetched path data)
//   pictograms src/pictograms.json (tags per name)   + pictograms/phosphor.json (fetched)
//   strokes    src/doodles/*.svg, src/marks/*.svg, src/frames/*.svg (hand-authored)
//   fonts      src/fonts.json; maps src/maps.json + maps/cities.json; presets src/presets.json
//   docs       src/docs.json; everything else (bitmaps, CSS frames, torn masks, scenes) src/items.json
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { splitSubpaths } from './svg-path.mjs';

export const LIB = 'vendor/asset-lib';
export const TAGS = ['ai', 'uang', 'bisnis', 'umkm', 'chat', 'kerja', 'waktu', 'orang', 'perangkat', 'keamanan', 'data', 'logistik', 'ide', 'status', 'arah', 'tempat', 'hidup', 'media', 'kertas', 'peta', 'benda'];
export const STYLES = ['broll-text', 'motion-graphic', 'whiteboard', 'vox', 'stop-motion', 'mix-media', 'parallax'];
export const KINDS = ['icon', 'pictogram', 'doodle', 'paper', 'hand', 'frame', 'doc', 'map', 'texture', 'scene', 'font', 'palette', 'type'];
export const STYLE_KEY = { text: 'broll-text', mg: 'motion-graphic', wb: 'whiteboard', vox: 'vox', stop: 'stop-motion', mm: 'mix-media', px: 'parallax' };
// generated files at the library root; scenes/<name>/scene.json are generated too
export const OUTPUTS = ['asset-lib.js', 'asset-lib.css', 'catalog.json', 'LICENSES.md', 'CATALOG.md'];
const ICON_STYLES = ['motion-graphic', 'vox', 'whiteboard', 'broll-text', 'mix-media'];
const PICT_STYLES = ['motion-graphic', 'stop-motion', 'vox'];
const SHEETS = '../../docs/agents/references/asset-catalog/sheets/';

const read = (root, p) => readFileSync(join(root, p), 'utf8');
const json = (root, p, dflt) => (existsSync(join(root, p)) ? JSON.parse(read(root, p)) : dflt);
const svgFiles = (root, dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.svg')).sort() : []);
const bytes = (root, p) => statSync(join(root, p)).size;

export function pngSize(buf) {
  if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error('not a PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// A hand-authored stroke SVG: viewBox 0 0 W H, one <path d> per pen stroke (drawing order),
// data-tags / data-styles (comma lists), optional data-text (fixed stamp text).
export function parseStrokeSvg(src, file) {
  const vb = src.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!vb) throw new Error(`${file}: needs viewBox="0 0 W H"`);
  const attr = (n) => (src.match(new RegExp(`data-${n}="([^"]*)"`)) || [])[1];
  const d = [...src.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].flatMap((m) => splitSubpaths(m[1]));
  if (!d.length) throw new Error(`${file}: no <path d="…">`);
  const list = (n) => (attr(n) || '').split(',').map((s) => s.trim()).filter(Boolean);
  return { vb: [Number(vb[1]), Number(vb[2])], d, tags: list('tags'), styles: list('styles'), text: attr('text') ?? null };
}

const check = (e) => {
  if (!KINDS.includes(e.kind)) throw new Error(`${e.id}: unknown kind "${e.kind}"`);
  for (const s of e.styles) if (!STYLES.includes(s)) throw new Error(`${e.id}: unknown style "${s}"`);
  for (const t of e.tags) if (!TAGS.includes(t)) throw new Error(`${e.id}: tag "${t}" is not in the vocabulary`);
  if (!e.styles.length) throw new Error(`${e.id}: needs at least one style`);
  if (!e.tags.length) throw new Error(`${e.id}: needs at least one tag`);
  if (!!e.file === !!e.inline) throw new Error(`${e.id}: needs exactly one of file / inline`);
};

const fam = (f) => `'${f}'`;

export function buildAll(root) {
  const S = LIB + '/src';
  const icons = json(root, S + '/icons.json', { categories: {} });
  const lucide = json(root, LIB + '/icons/lucide.json', {});
  const picts = json(root, S + '/pictograms.json', { tags: {} });
  const phosphor = json(root, LIB + '/pictograms/phosphor.json', {});
  const presets = json(root, S + '/presets.json', { roles: {}, exceptions: [], palettes: {}, grades: {}, types: {} });
  const fonts = json(root, S + '/fonts.json', []);
  const maps = json(root, S + '/maps.json', []);
  const cities = json(root, LIB + '/maps/cities.json', {});
  const docs = json(root, S + '/docs.json', []);
  const items = json(root, S + '/items.json', []);

  const lib = { icons: {}, picts: {}, strokes: {}, torn: {}, maps: {}, cities, hands: {}, assets: {} };
  const entries = [];
  const licenses = []; // [path relative to LIB, source, license, changes]
  const add = (e) => {
    const full = { styles: [], tags: [], ...e };
    check(full);
    if (lib.assets[full.id]) throw new Error(`duplicate catalog id "${full.id}"`);
    if (full.file && full.kind === 'scene') {
      // scene.json is generated below; the catalog counts the layer files instead
      const dir = full.file.slice(0, full.file.lastIndexOf('/'));
      full.bytes = e.layers.reduce((n, l) => n + bytes(root, `${dir}/${l.file}`), 0);
    } else if (full.file) {
      if (!existsSync(join(root, full.file))) throw new Error(`${full.id}: missing file ${full.file}`);
      full.bytes = bytes(root, full.file);
    }
    lib.assets[full.id] = { kind: full.kind, ...(full.file ? { file: full.file } : { inline: full.inline }), ...(full.anchor ? { anchor: full.anchor } : {}) };
    entries.push(full);
    return full;
  };

  // ---- icons (Lucide) and pictograms (Phosphor fill) ----
  if (Object.keys(icons.categories).length) {
    const src = `${icons.source.package} ${icons.source.version}`;
    for (const [tag, names] of Object.entries(icons.categories)) {
      for (const n of names) {
        if (!lucide[n]) throw new Error(`icon "${n}" is in src/icons.json but not in icons/lucide.json (run: npm run asset-lib -- fetch icons)`);
        lib.icons[n] = lucide[n];
        add({ id: 'icon.' + n, kind: 'icon', inline: `SK.icon('${n}')`, styles: ICON_STYLES, tags: [tag], source: src, license: icons.source.license });
      }
    }
    licenses.push(['icons/lucide.json', `${src} — ${icons.source.tarball}`, icons.source.license, `${Object.keys(lib.icons).length} icons; every shape converted to absolute path data, one string per subpath`]);
  }
  if (Object.keys(picts.tags).length) {
    const src = `${picts.source.package} ${picts.source.version} (${picts.source.weight})`;
    for (const [n, tags] of Object.entries(picts.tags)) {
      if (!phosphor[n]) throw new Error(`pictogram "${n}" is in src/pictograms.json but not in pictograms/phosphor.json (run: npm run asset-lib -- fetch pictograms)`);
      lib.picts[n] = phosphor[n];
      add({ id: 'pict.' + n, kind: 'pictogram', inline: `SK.pict('${n}')`, styles: PICT_STYLES, tags, source: src, license: picts.source.license });
    }
    licenses.push(['pictograms/phosphor.json', `${src} — ${picts.source.tarball}`, picts.source.license, `${Object.keys(lib.picts).length} icons, 256 grid, path data only`]);
  }

  // ---- hand-authored stroke SVGs ----
  for (const [dir, prefix, kind] of [['doodles', 'doodle', 'doodle'], ['marks', 'mark', 'doc'], ['frames', 'frame', 'frame']]) {
    for (const f of svgFiles(root, `${S}/${dir}`)) {
      const id = `${prefix}.${f.slice(0, -4)}`;
      const s = parseStrokeSvg(read(root, `${S}/${dir}/${f}`), `${S}/${dir}/${f}`);
      lib.strokes[id] = { vb: s.vb, d: s.d, ...(s.text ? { text: s.text } : {}) };
      // frames/swash-* are drawn strokes; every other frame SVG is a stamp or badge border
      const fn = prefix === 'mark' ? 'SK.mark' : prefix === 'frame' && !f.startsWith('swash') ? 'SK.stamp' : 'SK.doodle';
      add({ id, kind, inline: `${fn}('${id}')`, styles: s.styles, tags: s.tags, source: 'project', license: 'MIT' });
    }
  }

  // ---- VOX document templates (SK.doc) ----
  for (const d of docs) add({ id: 'doc.' + d.kind, kind: 'doc', inline: `SK.doc('${d.kind}', …)`, styles: d.styles, tags: d.tags, source: 'project', license: 'MIT' });

  // ---- maps ----
  for (const m of maps) {
    const b = m.box, file = m.file ?? `${LIB}/maps/${m.id}.svg`;
    lib.maps[m.id] = { src: file, w: Math.round((b.lon1 - b.lon0) * b.k), h: Math.round((b.lat0 - b.lat1) * b.k), lon0: b.lon0, lat0: b.lat0, k: b.k };
    add({ id: 'map.' + m.id, kind: 'map', file, styles: ['vox', 'motion-graphic', 'parallax'], tags: ['peta', 'tempat'], source: m.source, license: 'Public domain' });
    if (!m.file) licenses.push([`maps/${m.id}.svg`, m.source, 'Public domain', m.changes]);
  }
  if (Object.keys(cities).length) licenses.push(['maps/cities.json', 'Natural Earth 10m populated places v5.1.2 — https://www.naturalearthdata.com/about/terms-of-use/', 'Public domain', `${Object.keys(cities).length} cities: Indonesian province capitals + Southeast Asian capitals, [lat, lon]`]);

  // ---- fonts ----
  for (const f of fonts) {
    add({ id: 'font.' + f.id, kind: 'font', ...(f.legacy ? { inline: `.sk-f-${f.id}` } : { file: `${LIB}/fonts/${f.files[0].file}` }), styles: f.styles, tags: ['media'], source: f.source, license: f.license });
    if (!f.legacy) {
      for (const x of f.files) licenses.push([`fonts/${x.file}`, f.source, f.license, 'Latin subset woff2, unchanged']);
      licenses.push([`fonts/${f.licenseFile}`, f.source, f.license, 'license text, unchanged']);
    }
  }

  // ---- presets ----
  for (const [st, list] of Object.entries(presets.palettes)) {
    for (const [n, p] of Object.entries(list)) add({ id: `palette.${st}-${n}`, kind: 'palette', inline: `.sk-pal-${st}-${n}`, styles: [STYLE_KEY[st]], tags: ['media'], source: p.legacy ? 'project (legacy Look table)' : 'project', license: 'MIT' });
  }
  for (const [n, g] of Object.entries(presets.grades)) add({ id: `palette.px-${n}`, kind: 'palette', inline: `.sk-grade-px-${n}`, styles: ['parallax'], tags: ['media'], source: g.legacy ? 'project (legacy Look table)' : 'project', license: 'MIT' });
  for (const [st, list] of Object.entries(presets.types)) {
    for (const [n, t] of Object.entries(list)) add({ id: `type.${st}-${n}`, kind: 'type', inline: `.sk-type-${st}-${n}`, styles: [STYLE_KEY[st]], tags: ['media'], source: t.legacy ? 'project (legacy)' : 'project', license: 'MIT' });
  }

  // ---- items: bitmaps, CSS frames, torn masks, procedural textures, scenes, legacy paper-pack ----
  const sceneFiles = {};
  for (const it of items) {
    add(it);
    if (it.torn) lib.torn[it.id] = it.torn;
    if (it.kind === 'hand' && !it.legacy) {
      const a = it.anchor, sz = pngSize(readFileSync(join(root, it.file)));
      if (sz.w !== a.w || sz.h !== a.h) throw new Error(`${it.id}: anchor size ${a.w}×${a.h} ≠ PNG ${sz.w}×${sz.h}`);
      lib.hands[a.pose] = { src: it.file, w: a.w, h: a.h, tx: a.tx, ty: a.ty };
    }
    if (it.kind === 'scene') {
      const dir = it.file.slice(0, it.file.lastIndexOf('/'));
      const scene = { id: it.id, light: it.light, provenance: it.provenance, layers: it.layers.map((l) => ({ file: `${dir}/${l.file}`, z: l.z, role: l.role })) };
      sceneFiles[it.file] = JSON.stringify(scene, null, 2) + '\n';
      for (const l of it.layers) {
        if (!existsSync(join(root, dir, l.file))) throw new Error(`${it.id}: missing layer ${dir}/${l.file}`);
        licenses.push([`${dir.slice(LIB.length + 1)}/${l.file}`, `Codex (generated) — "${l.prompt}"`, 'project asset (MIT)', l.changes]);
      }
    } else if (it.file && it.file.startsWith(LIB + '/') && !it.legacy) {
      licenses.push([it.file.slice(LIB.length + 1), it.prompt ? `Codex (generated) — "${it.prompt}"` : it.source, it.license, it.changes ?? '—']);
    }
  }

  // ---- asset-lib.js ----
  const runtime = read(root, S + '/runtime.js');
  if (!runtime.includes('/*@LIB@*/')) throw new Error('src/runtime.js lost its /*@LIB@*/ marker');
  const js = runtime.replace('/*@LIB@*/', 'SK.LIB = ' + JSON.stringify(lib) + ';');

  // ---- asset-lib.css ----
  const css = [`/* GENERATED by \`npm run asset-lib -- build\` from vendor/asset-lib/src — edit the sources, not this file.
   Spec: docs/superpowers/specs/2026-09-27-asset-library-design.md */`];
  for (const f of fonts.filter((x) => !x.legacy)) {
    for (const x of f.files) css.push(`@font-face { font-family: ${fam(f.family)}; src: url(fonts/${x.file}) format('woff2'); font-weight: ${x.weight}; font-display: block; }`);
  }
  for (const f of fonts) css.push(`.sk-f-${f.id} { font-family: ${fam(f.family)}, ${f.fallback}; text-transform: ${f.transform ?? 'none'}; }`);
  for (const [st, list] of Object.entries(presets.palettes)) {
    for (const [n, p] of Object.entries(list)) {
      const hint = [p.bgClass && `add .${p.bgClass}`, p.overlay && `overlay .${p.overlay}`].filter(Boolean).join(', ');
      css.push(`.sk-pal-${st}-${n} { --sk-bg: ${p.bg}; --sk-ink: ${p.ink}; --sk-accent: ${p.accent}; --sk-accent-2: ${p.accent2}; --sk-muted: ${p.muted}; }${hint ? ` /* ${hint} */` : ''}`);
    }
  }
  for (const [n, g] of Object.entries(presets.grades)) {
    css.push(`.sk-grade-px-${n} .sk-view { filter: ${g.filter}; }`);
    css.push(`.sk-grade-px-${n} .sk-haze { background: ${g.haze ? g.haze[0] : 'transparent'}; opacity: ${g.haze ? g.haze[1] : 0}; }`);
    css.push(`.sk-grade-px-${n} .sk-grain { opacity: ${g.grain}; }`);
  }
  const ROLE = { display: '--sk-font-display', body: '--sk-font-body', hand: '--sk-font-hand', serif: '--sk-font-serif', mono: '--sk-font-mono' };
  for (const [st, list] of Object.entries(presets.types)) {
    for (const [n, t] of Object.entries(list)) {
      css.push(`.sk-type-${st}-${n} { ${Object.entries(ROLE).filter(([r]) => t[r]).map(([r, v]) => `${v}: ${fam(t[r])};`).join(' ')} }`);
    }
  }
  const objs = items.filter((i) => i.kind === 'paper' && !i.legacy);
  if (objs.length) css.push(objs.map((o) => '.sk-obj-' + o.id.slice(6)).join(', ') + ' { position: absolute; background-repeat: no-repeat; background-size: 100% 100%; }');
  for (const o of objs) {
    const sz = pngSize(readFileSync(join(root, o.file)));
    css.push(`.sk-obj-${o.id.slice(6)} { background-image: url(${o.file.slice(LIB.length + 1)}); aspect-ratio: ${sz.w} / ${sz.h}; }`);
  }
  const texs = items.filter((i) => i.kind === 'texture' && i.file && !i.legacy && !i.overlay); // overlays are styled in base.css
  if (texs.length) css.push(texs.map((t) => '.sk-tex-' + t.id.slice(8)).join(', ') + ' { background-size: 1080px 1920px; background-position: 0 0; }');
  for (const t of texs) css.push(`.sk-tex-${t.id.slice(8)} { background-image: url(${t.file.slice(LIB.length + 1)}); }`);
  css.push(read(root, S + '/base.css').trim());
  const cssOut = css.join('\n') + '\n';

  // ---- catalog.json, CATALOG.md, LICENSES.md ----
  // how a clip uses the entry: a class, a call, or the file
  const useOf = (e) => e.use ?? e.inline ?? ({
    texture: `.sk-tex-${e.id.slice(8)}`, paper: `.sk-obj-${e.id.slice(6)}`, font: `.sk-f-${e.id.slice(5)}`,
    hand: `SK.placeHand(img, tip, { pose: '${e.anchor?.pose}' })`, map: `SK.geo(lat, lon, '${e.id.slice(4)}')`, scene: e.file,
  }[e.kind] ?? e.file);
  const catalog = entries.map((e) => {
    const o = { id: e.id, kind: e.kind };
    if (e.file) o.file = e.file; else o.inline = e.inline;
    o.use = useOf(e);
    Object.assign(o, { styles: e.styles, tags: e.tags, source: e.source, license: e.license });
    if (e.prompt) o.prompt = e.prompt;
    if (e.anchor) o.anchor = e.anchor;
    if (e.file) o.bytes = e.bytes;
    return o;
  });
  const md = ['# Asset Library Catalog', '', 'GENERATED by `npm run asset-lib -- build` from `vendor/asset-lib/src`. Look at the contact sheet',
    'for a kind before choosing; grep this file by tag (`uang`, `ai`, `chat`, …) or style. Spec:',
    '`docs/superpowers/specs/2026-09-27-asset-library-design.md`.', ''];
  for (const k of KINDS) {
    const rows = catalog.filter((e) => e.kind === k);
    if (!rows.length) continue;
    md.push(`## ${k} (${rows.length})`, '', `Sheet: [${k}](${SHEETS}) — files \`${k}*.webp\``, '', '| id | use | styles | tags | source |', '| --- | --- | --- | --- | --- |');
    for (const r of rows) md.push(`| \`${r.id}\` | \`${r.use}\` | ${r.styles.join(', ')} | ${r.tags.join(', ')} | ${r.source} |`);
    md.push('');
  }
  const lic = ['# Asset Library Licenses', '', 'GENERATED by `npm run asset-lib -- build`. One row per file in `vendor/asset-lib/` outside `src/`',
    '(project source, MIT) and the generated files. `scripts/asset-lib.test.mjs` fails when a file has no row.',
    'Paper-pack files keep their rows in `vendor/paper-pack/LICENSES.md`.', '', '| File | Source | License | Changes |', '| --- | --- | --- | --- |'];
  for (const [p, s, l, c] of licenses.sort((a, b) => a[0].localeCompare(b[0]))) lic.push(`| \`${p}\` | ${s} | ${l} | ${c} |`);

  const out = {
    [`${LIB}/asset-lib.js`]: js,
    [`${LIB}/asset-lib.css`]: cssOut,
    [`${LIB}/catalog.json`]: JSON.stringify(catalog, null, 1) + '\n',
    [`${LIB}/CATALOG.md`]: md.join('\n') + '\n',
    [`${LIB}/LICENSES.md`]: lic.join('\n') + '\n',
  };
  for (const [f, c] of Object.entries(sceneFiles)) out[f] = c;
  return out;
}
```

- [ ] **Step 4: Write the fetchers, `scripts/lib/asset-lib-fetch.mjs`**

All fetchers live here now; later tasks only run them.

```js
// Fetch and freeze third-party data for the asset library (spec:
// docs/superpowers/specs/2026-09-27-asset-library-design.md). Every source is pinned to a version or
// a fixed asset id; the output is committed, so the build and the renders never touch the network.
// Needs network, `tar`, `unzip`, and `ffmpeg` on PATH. Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mapSvg } from './geo-svg.mjs';
import { shapeToPath, splitSubpaths } from './svg-path.mjs';
import { LIB } from './asset-lib-build.mjs';

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r;
};

async function download(url, file) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

// a tarball from the npm registry, unpacked into a temp dir; returns the package/ path
async function npmPackage(tarball, tmp) {
  const tgz = await download(tarball, join(tmp, 'pkg.tgz'));
  run('tar', ['-xzf', tgz, '-C', tmp]);
  return join(tmp, 'package');
}

const src = (root, p) => JSON.parse(readFileSync(join(root, LIB, 'src', p), 'utf8'));
const out = (root, p) => { const f = join(root, LIB, p); mkdirSync(join(f, '..'), { recursive: true }); return f; };

export async function fetchIcons(root) {
  const { source, categories } = src(root, 'icons.json');
  const tmp = mkdtempSync(join(tmpdir(), 'lucide-'));
  try {
    const pkg = await npmPackage(source.tarball, tmp);
    const version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;
    if (version !== source.version) throw new Error(`lucide-static ${version} ≠ pinned ${source.version}`);
    const nodes = JSON.parse(readFileSync(join(pkg, 'icon-nodes.json'), 'utf8'));
    const data = {};
    for (const n of Object.values(categories).flat().sort()) {
      if (!nodes[n]) throw new Error(`lucide-static ${version} has no icon "${n}"`);
      data[n] = nodes[n].flatMap(([tag, attrs]) => splitSubpaths(shapeToPath(tag, attrs)));
    }
    writeFileSync(out(root, 'icons/lucide.json'), '{\n' + Object.entries(data).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
    return Object.keys(data).length;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

export async function fetchPictograms(root) {
  const { source, tags } = src(root, 'pictograms.json');
  const tmp = mkdtempSync(join(tmpdir(), 'phosphor-'));
  try {
    const pkg = await npmPackage(source.tarball, tmp);
    const data = {};
    for (const n of Object.keys(tags).sort()) {
      const f = join(pkg, 'assets', source.weight, `${n}-${source.weight}.svg`);
      if (!existsSync(f)) throw new Error(`phosphor ${source.version} has no ${source.weight} icon "${n}"`);
      const ds = [...readFileSync(f, 'utf8').matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
      if (!ds.length) throw new Error(`${f}: no path`);
      data[n] = ds.join(' ');
    }
    writeFileSync(out(root, 'pictograms/phosphor.json'), '{\n' + Object.entries(data).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
    return Object.keys(data).length;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

export async function fetchFonts(root) {
  let n = 0;
  for (const f of src(root, 'fonts.json').filter((x) => !x.legacy)) {
    for (const x of f.files) { await download(x.url, out(root, `fonts/${x.file}`)); n++; }
    await download(f.licenseUrl, out(root, `fonts/${f.licenseFile}`));
  }
  return n;
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function fetchMaps(root) {
  const maps = src(root, 'maps.json').filter((m) => !m.file);
  const tmp = join(tmpdir(), 'natural-earth-5.1.2');
  mkdirSync(tmp, { recursive: true });
  const cache = {};
  const load = async (name) => {
    if (!cache[name]) {
      const f = join(tmp, name + '.geojson');
      if (!existsSync(f)) await download(NE + name + '.geojson', f);
      cache[name] = JSON.parse(readFileSync(f, 'utf8')).features;
    }
    return cache[name];
  };
  for (const m of maps) {
    const layers = [];
    for (const l of m.layers) {
      const feats = (await load(l.dataset)).filter((f) => {
        const p = f.properties;
        if (l.admin && p.admin !== l.admin && p.ADMIN !== l.admin) return false;
        if (l.exclude && (l.exclude.includes(p.ADMIN) || l.exclude.includes(p.admin))) return false;
        return true;
      }).map((f) => ({ ...f, id: slug(f.properties.ADMIN ?? f.properties.name) }));
      layers.push({ ...l, features: feats });
    }
    writeFileSync(out(root, `maps/${m.id}.svg`), mapSvg(m.box, layers, `${m.source}; equirectangular lon ${m.box.lon0}..${m.box.lon1}, lat ${m.box.lat0}..${m.box.lat1}, ${m.box.k} px/deg`));
  }
  // cities: Indonesian province capitals + Southeast Asian capitals, [lat, lon] rounded to 4 places
  const places = (await load('ne_10m_populated_places_simple')).map((f) => f.properties);
  const SEA = ['Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Philippines', 'Brunei', 'Cambodia', 'Laos', 'Myanmar', 'East Timor'];
  const WRONG = ['Sumenep', 'Tuban']; // labelled Admin-1 capital in NE 5.1.2 but are not province capitals
  const pick = places.filter((p) => (p.adm0name === 'Indonesia' && /capital/.test(p.featurecla) && !WRONG.includes(p.name))
    || (SEA.includes(p.adm0name) && p.featurecla === 'Admin-0 capital'));
  const cities = {};
  for (const p of pick.sort((a, b) => slug(a.nameascii).localeCompare(slug(b.nameascii)))) cities[slug(p.nameascii)] = [Number(p.latitude.toFixed(4)), Number(p.longitude.toFixed(4))];
  writeFileSync(out(root, 'maps/cities.json'), JSON.stringify(cities, null, 1) + '\n');
  return { maps: maps.length, cities: Object.keys(cities).length };
}

// ambientCG 2K-JPG Color map → centre crop 9:16 → 1080×1920 → optional ffmpeg filter → JPEG,
// raising the quantiser until the file is ≤ 400 KB
export async function fetchTextures(root) {
  const items = src(root, 'items.json').filter((i) => i.fetch?.ambientcg);
  const tmp = mkdtempSync(join(tmpdir(), 'ambientcg-'));
  try {
    for (const it of items) {
      const id = it.fetch.ambientcg;
      const zip = await download(`https://ambientcg.com/get?file=${id}_2K-JPG.zip`, join(tmp, id + '.zip'));
      run('unzip', ['-o', '-q', zip, `${id}_2K-JPG_Color.jpg`, '-d', tmp]);
      const vf = ['crop=ih*9/16:ih', 'scale=1080:1920:flags=lanczos', ...(it.fetch.filter ? [it.fetch.filter] : [])].join(',');
      const dest = join(root, it.file);
      mkdirSync(join(dest, '..'), { recursive: true });
      let q = 6;
      for (;;) {
        run('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(tmp, `${id}_2K-JPG_Color.jpg`), '-vf', vf, '-q:v', String(q), dest]);
        if (statSync(dest).size <= 400 * 1024 || q >= 12) break;
        q++;
      }
      if (statSync(dest).size > 400 * 1024) throw new Error(`${it.file} is still over 400 KB at q ${q}`);
    }
    makeGrainTiles(root);
    return items.length + 2;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/* Overlay grain as small PNG tiles: an SVG feTurbulence filter inside a data-URI background renders
   blank in HyperFrames' Chrome, so the noise is baked. ffmpeg's `noise` filter with a fixed seed gives
   the same bytes every run. riso: ~9% pink speckles on alpha; film: grey grain (gray + opaque alpha). */
export function makeGrainTiles(root) {
  const dir = join(root, LIB, 'textures');
  mkdirSync(dir, { recursive: true });
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0xEC3D7F:s=256x256', '-f', 'lavfi', '-i',
    "color=c=gray:s=256x256,noise=alls=100:allf=u:all_seed=3,format=gray,geq=lum='if(gt(lum(X\\,Y)\\,175)\\,255\\,0)'",
    '-filter_complex', '[0]format=rgba[c];[c][1]alphamerge', '-frames:v', '1', '-update', '1', join(dir, 'riso-tile.png')]);
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=gray:s=256x256,noise=alls=60:allf=u:all_seed=9,format=ya8',
    '-frames:v', '1', '-update', '1', join(dir, 'film-tile.png')]);
}

// crop a transparent PNG to its alpha box (+pad), fit the long edge to max, and write a 256-colour
// palette PNG with alpha (or WebP q80 with alpha when out ends in .webp)
export function processImage(input, output, { max = 720, pad = 4 } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'asset-proc-'));
  try {
    const rgba = join(tmp, 'rgba.png');
    run('ffmpeg', ['-loglevel', 'error', '-y', '-i', input, '-vf', `format=rgba,pad=iw+${2 * pad}:ih+${2 * pad}:${pad}:${pad}:color=black@0`, rgba]);
    const r = spawnSync('ffmpeg', ['-hide_banner', '-i', rgba, '-vf', 'alphaextract,bbox=min_val=16', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = [...r.stderr.matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)].pop();
    if (!m) throw new Error(`${input}: no opaque pixels found`);
    const [x1, x2, y1, y2] = m.slice(1).map(Number);
    const x = Math.max(0, x1 - pad), y = Math.max(0, y1 - pad), w = x2 - x1 + 1 + 2 * pad, h = y2 - y1 + 1 + 2 * pad;
    const scale = Math.max(w, h) > max ? (w >= h ? `scale=${max}:-2:flags=lanczos` : `scale=-2:${max}:flags=lanczos`) : 'null';
    const crop = `crop=${w}:${h}:${x}:${y},${scale}`;
    if (output.endsWith('.webp')) {
      // Homebrew ffmpeg may lack libwebp: crop/scale with ffmpeg, encode with cwebp (keeps alpha)
      const png = join(tmp, 'crop.png');
      run('ffmpeg', ['-loglevel', 'error', '-y', '-i', rgba, '-vf', crop, png]);
      run('cwebp', ['-quiet', '-q', '80', png, '-o', output]);
    }
    else run('ffmpeg', ['-loglevel', 'error', '-y', '-i', rgba, '-vf', `${crop},split[a][b];[a]palettegen=max_colors=256:reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128`, output]);
    return { w, h };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
```

- [ ] **Step 5: Write the CLI, `scripts/asset-lib.mjs`**

```js
#!/usr/bin/env node
// Asset library CLI (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md).
//   npm run asset-lib -- fetch <icons|pictograms|fonts|maps|textures>   pinned sources → frozen files (network)
//   npm run asset-lib -- build                                          src + frozen data → generated files
//   npm run asset-lib -- check                                          exit 1 when a generated file is stale
//   npm run asset-lib -- process <in.png> <out.png|out.webp> [--max N]  crop to alpha, resize, compress
//   npm run asset-lib -- sheets                                         contact sheets → asset-catalog/sheets/
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildAll } from './lib/asset-lib-build.mjs';
import { fetchFonts, fetchIcons, fetchMaps, fetchPictograms, fetchTextures, processImage } from './lib/asset-lib-fetch.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const [cmd, ...args] = process.argv.slice(2);
const FETCH = { icons: fetchIcons, pictograms: fetchPictograms, fonts: fetchFonts, maps: fetchMaps, textures: fetchTextures };

function stale() {
  return Object.entries(buildAll(root)).filter(([p, c]) => !existsSync(resolve(root, p)) || readFileSync(resolve(root, p), 'utf8') !== c).map(([p]) => p);
}

try {
  if (cmd === 'fetch') {
    const what = args[0];
    if (!FETCH[what]) throw new Error(`fetch what? one of: ${Object.keys(FETCH).join(', ')}`);
    console.log(`fetched ${what}:`, await FETCH[what](root));
  } else if (cmd === 'build') {
    for (const [p, c] of Object.entries(buildAll(root))) {
      mkdirSync(dirname(resolve(root, p)), { recursive: true });
      writeFileSync(resolve(root, p), c);
      console.log('wrote', p);
    }
  } else if (cmd === 'check') {
    const s = stale();
    if (s.length) { console.error('stale (run: npm run asset-lib -- build):\n  ' + s.join('\n  ')); process.exit(1); }
    console.log('asset library outputs are up to date');
  } else if (cmd === 'process') {
    const [input, output] = args;
    const i = args.indexOf('--max');
    if (!input || !output) throw new Error('usage: process <in.png> <out.png|out.webp> [--max N]');
    console.log(output, processImage(input, output, { max: i >= 0 ? Number(args[i + 1]) : 720 }));
  } else if (cmd === 'sheets') {
    const { buildSheets } = await import('./lib/asset-lib-sheets.mjs');
    console.log(await buildSheets(root));
  } else {
    throw new Error('usage: asset-lib <fetch|build|check|process|sheets> …');
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
```

- [ ] **Step 6: Write the runtime source, `vendor/asset-lib/src/runtime.js`**

This is the core; Tasks 6, 7, and 10 insert more sections before the final `})();`.

```js
/* asset-lib: the shared asset library for style b-roll clips — icons, pictograms, doodles, marks,
   stamps, frames, VOX documents, maps, hands. Built into vendor/asset-lib/asset-lib.js by
   `npm run asset-lib -- build` (the LIB marker below becomes the SK.LIB data); edit
   vendor/asset-lib/src/runtime.js, never the built file.
   Spec: docs/superpowers/specs/2026-09-27-asset-library-design.md. Needs window.SK (style-kit.js).
   Helpers return HTML strings (insert them once, outside update(t)); nothing here reads a clock or
   Math.random, so every frame stays a pure function of clip time. */
(function () {
if (!window.SK) throw new Error('asset-lib: load vendor/style-kit/style-kit.js before asset-lib.js');
const SK = window.SK;
/*@LIB@*/

// ---- lookup ------------------------------------------------------------------------------------
const has = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const pick = (table,kind,id)=>{
  if(has(table,id)) return table[id];
  const stem=String(id).replace(/^[a-z]+\./,'').split('-')[0];
  const near=Object.keys(table).filter(k=>k.includes(stem)).slice(0,5);
  throw new Error(`asset-lib: unknown ${kind} "${id}"${near.length?` (did you mean ${near.join(', ')}?)`:''}`);
};
// a catalog id or the short name: 'icon.coins' and 'coins' both work
const bare = (id,prefix)=>String(id).startsWith(prefix+'.')?String(id).slice(prefix.length+1):String(id);
const full = (id,prefix)=>String(id).includes('.')?String(id):prefix+'.'+id;
const esc = s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mix = (seed,n)=>(Math.imul(seed|0,0x9E3779B1)^Math.imul((n|0)+1,0x85EBCA77))>>>0;

// catalog entry {kind, file | inline, anchor?} for any id in vendor/asset-lib/CATALOG.md
SK.asset = id=>pick(SK.LIB.assets,'asset',id);

// ---- icons and pictograms ----------------------------------------------------------------------
// Lucide line icon; sw is the on-screen stroke width in px at any size (like M.icon)
SK.icon = (id,o={})=>{
  const size=o.size??96, sw=o.sw??2.2, ds=pick(SK.LIB.icons,'icon',bare(id,'icon'));
  return `<svg class="sk-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${o.color??'currentColor'}" stroke-width="${(sw*24/size).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">${ds.map(d=>`<path d="${d}"/>`).join('')}</svg>`;
};
// Phosphor filled pictogram (Isotype: repeat it to show more, never scale one up)
SK.pict = (id,o={})=>{
  const size=o.size??96, d=pick(SK.LIB.picts,'pictogram',bare(id,'pict'));
  return `<svg class="sk-pict" width="${size}" height="${size}" viewBox="0 0 256 256" fill="${o.color??'currentColor'}"><path d="${d}"/></svg>`;
};

// ---- rough: any stroke drawing as a marker line --------------------------------------------------
/* rough: redraw every <path> inside svg as a marker stroke — sample every o.step viewBox units,
   push the points along the normal by two slow seeded sine waves (±o.amp units), overshoot the end
   a little, and join the points with a Catmull-Rom curve. Same seed → same path. Runs once per
   path (the result is cached on the element), so call it right after inserting the svg. */
SK.rough = (svg,o={})=>{
  const seed=o.seed??1, amp=o.amp??0.3, step=o.step??1;
  svg.querySelectorAll('path').forEach((p,i)=>{
    if(p._skRough) return;
    const L=p.getTotalLength(), n=Math.max(3,Math.ceil(L/step)), r=SK.rng(mix(seed,i+31));
    const f1=0.12+r()*0.1, f2=0.45+r()*0.25, ph1=r()*6.283, ph2=r()*6.283, over=(r()*0.6+0.2)*step;
    const pts=[];
    for(let k=0;k<=n;k++){
      const s=L*k/n, a=p.getPointAtLength(Math.max(0,s-0.01)), b=p.getPointAtLength(Math.min(L,s+0.01)), c=p.getPointAtLength(s);
      const dx=b.x-a.x, dy=b.y-a.y, l=Math.hypot(dx,dy)||1, off=amp*(0.65*Math.sin(s*f1+ph1)+0.35*Math.sin(s*f2+ph2));
      pts.push([c.x-dy/l*off, c.y+dx/l*off]);
    }
    const [x1,y1]=pts[pts.length-2], [x2,y2]=pts[pts.length-1], ll=Math.hypot(x2-x1,y2-y1)||1;
    pts.push([x2+(x2-x1)/ll*over, y2+(y2-y1)/ll*over]);
    const f=v=>v.toFixed(2);
    let d=`M${f(pts[0][0])} ${f(pts[0][1])}`;
    for(let k=0;k<pts.length-1;k++){
      const p0=pts[Math.max(0,k-1)], p1=pts[k], p2=pts[k+1], p3=pts[Math.min(pts.length-1,k+2)];
      d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    p.setAttribute('d',d); p._skRough=true; p._skLen=null;
  });
  return svg;
};
})();
```

- [ ] **Step 7: Write the other sources**

`vendor/asset-lib/src/base.css` (Tasks 5, 6, and 8 add rules):

```css
/* ---- base (vendor/asset-lib/src/base.css): hand-written rules appended to the generated sheet ---- */
.sk-icon, .sk-pict, .sk-doodle, .sk-mark { display: block; overflow: visible; }
```

`vendor/asset-lib/src/icons.json` — 266 names verified against `lucide-static@1.48.0/tags.json` on 2026-09-27; the key is the tag:

```json
{
  "source": {"package":"lucide-static","version":"1.48.0","license":"ISC","tarball":"https://registry.npmjs.org/lucide-static/-/lucide-static-1.48.0.tgz"},
  "categories": {
    "ai": ["bot","brain","brain-circuit","cpu","sparkles","wand-sparkles","message-square-code","workflow","network","git-branch","code","terminal","database","server","cloud","cloud-upload","cloud-download","webhook","plug","zap","cog","settings","sliders-horizontal","scan-search","scan-text","file-code","binary","braces"],
    "uang": ["banknote","coins","wallet","credit-card","receipt","piggy-bank","hand-coins","badge-percent","percent","trending-up","trending-down","chart-line","chart-column","chart-pie","chart-bar","calculator","landmark","scale","gem","circle-dollar-sign","tag","tags","ticket"],
    "bisnis": ["store","shopping-cart","shopping-bag","package","package-check","truck","warehouse","factory","building","building-complex","briefcase","handshake","presentation","target","trophy","award","rocket","flag","megaphone","clipboard-list","clipboard-check","file-text","file-spreadsheet","files","folder","folder-open","archive","stamp","signature"],
    "chat": ["message-circle","message-square","messages-square","mail","mail-open","send","inbox","phone","phone-call","bell","bell-ring","at-sign","share-2","reply","forward","mic","video","camera","image","link","qr-code"],
    "orang": ["user","users","user-plus","user-check","user-x","user-round","users-round","contact","baby","graduation-cap","hand","heart-handshake","face-slightly-smiling","face-slightly-frowning","face-neutral","face-grinning","face-angry","thumbs-up","thumbs-down","crown"],
    "waktu": ["clock","alarm-clock","timer","hourglass","calendar","calendar-check","calendar-clock","refresh-cw","rotate-ccw","repeat"],
    "perangkat": ["laptop","monitor","smartphone","tablet","keyboard","mouse","printer","wifi","battery-low","battery-full","hard-drive","usb","headphones","watch","tv"],
    "keamanan": ["lock","lock-open","lock-keyhole-open","shield","shield-check","shield-alert","key","key-round","fingerprint-pattern","eye","eye-off","scan-face"],
    "status": ["check","check-check","x","circle-check","circle-x","circle-alert","triangle-alert","info","circle-question-mark","ban","octagon-x","loader"],
    "arah": ["arrow-right","arrow-left","arrow-up","arrow-down","arrow-up-right","arrow-down-right","move-right","redo","undo","shuffle","split","merge","corner-down-right","chevrons-right","refresh-ccw"],
    "ide": ["lightbulb","lightbulb-off","puzzle","compass","map","map-pin","map-pinned","navigation","route","milestone","signpost","globe","earth","search","zoom-in","zoom-out","funnel","list-checks","list-ordered","layers","layout-dashboard","kanban","notebook-pen","book-open","library","pencil","pen-line","eraser","highlighter","scissors","paperclip","pin","bookmark"],
    "hidup": ["coffee","utensils-crossed","house","bike","car","bus","plane","ship","train-front","motorbike","fuel","sun","moon","cloud-rain","flame","droplet","leaf","sprout","tree-pine","mountain"],
    "media": ["play","pause","circle-play","film","clapperboard","music","volume-2"],
    "benda": ["gift","star","heart","sparkle","party-popper","medal","hammer","wrench","construction","bug","skull","ghost","dice-5","box","boxes","container","recycle","trash","download","upload","external-link"]
  }
}
```

`vendor/asset-lib/src/pictograms.json` — 70 names verified against `@phosphor-icons/core@2.1.1`:

```json
{
  "source": {"package": "@phosphor-icons/core", "version": "2.1.1", "license": "MIT", "weight": "fill", "tarball": "https://registry.npmjs.org/@phosphor-icons/core/-/core-2.1.1.tgz"},
  "tags": {
    "person": ["orang"], "users-three": ["orang"], "user": ["orang"], "baby": ["orang"], "student": ["orang"],
    "money": ["uang"], "coins": ["uang"], "coin": ["uang"], "bank": ["uang"], "wallet": ["uang"], "credit-card": ["uang"], "receipt": ["uang"], "ticket": ["uang"],
    "storefront": ["umkm", "bisnis"], "shopping-cart": ["bisnis"], "buildings": ["bisnis"], "factory": ["bisnis"], "rocket": ["bisnis"], "target": ["bisnis"], "handshake": ["bisnis"],
    "package": ["logistik"], "truck": ["logistik"],
    "laptop": ["perangkat"], "device-mobile": ["perangkat"], "desktop": ["perangkat"],
    "robot": ["ai"], "cpu": ["ai"], "lightbulb": ["ide"],
    "clock": ["waktu"], "calendar": ["waktu"], "hourglass": ["waktu"],
    "chat-circle": ["chat"], "envelope": ["chat"], "phone": ["chat"],
    "star": ["status"], "trophy": ["status"], "flag": ["status"], "thumbs-up": ["status"], "warning": ["status"], "check-circle": ["status"], "x-circle": ["status"],
    "lock": ["keamanan"], "shield-check": ["keamanan"], "key": ["keamanan"],
    "globe": ["tempat"], "map-pin": ["tempat"],
    "house": ["hidup"], "heart": ["hidup"], "car": ["hidup"], "motorcycle": ["hidup"], "airplane": ["hidup"], "bicycle": ["hidup"], "bus": ["hidup"], "coffee": ["hidup"], "fork-knife": ["hidup"], "tree": ["hidup"], "leaf": ["hidup"], "drop": ["hidup"], "sun": ["hidup"], "moon": ["hidup"], "cloud": ["hidup"],
    "lightning": ["benda"], "fire": ["benda"], "gift": ["benda"],
    "chart-bar": ["data"], "chart-pie": ["data"],
    "file": ["kerja"], "folder": ["kerja"], "briefcase": ["kerja"], "gear": ["kerja"]
  }
}
```

`vendor/asset-lib/src/items.json` (Tasks 6, 8, 10, 11 fill it):

```json
[
]
```

- [ ] **Step 8: Fetch, build, and run the tests**

Run:
```bash
npm run asset-lib -- fetch icons && npm run asset-lib -- fetch pictograms && npm run asset-lib -- build
git add -A vendor/asset-lib scripts
npm run test:asset-lib
```
Expected: `fetched icons: 266`, `fetched pictograms: 70`, five `wrote vendor/asset-lib/…` lines, then `ℹ pass 15`, `ℹ fail 0`. (`git add` first: one test checks that catalog files are tracked.)

- [ ] **Step 9: Load the library in the example host, the example check, and the Dena starter**

In both `docs/agents/references/style-examples/index.html` and `templates/dena-video/index.html` replace (keep each file's indentation):

old:
```html
<script src="vendor/style-kit/style-kit.js"></script>
```

new:
```html
<script src="vendor/style-kit/style-kit.js"></script>
<script src="vendor/asset-lib/asset-lib.js"></script>
```

old:
```html
<link rel="stylesheet" href="vendor/paper-pack/paper-pack.css" />
```

new:
```html
<link rel="stylesheet" href="vendor/paper-pack/paper-pack.css" />
<link rel="stylesheet" href="vendor/asset-lib/asset-lib.css" />
```

In `scripts/check-broll-examples.mjs` replace:

old:
```js
  cpSync('vendor/paper-pack', join(dir, 'vendor/paper-pack'), { recursive: true });
```

new:
```js
  cpSync('vendor/paper-pack', join(dir, 'vendor/paper-pack'), { recursive: true });
  cpSync('vendor/asset-lib', join(dir, 'vendor/asset-lib'), { recursive: true, filter: (f) => !f.includes('/src') });
```

(Video projects reach `vendor/asset-lib/` through their existing `vendor` symlink.)

- [ ] **Step 10: Prove the existing examples are pixel-identical**

Run:
```bash
npm run check:style-examples
for f in /tmp/asset-lib-baseline/frame-*.png; do cmp -s "$f" "renders/style-examples/$(basename "$f")" || echo "DIFF $(basename "$f")"; done; echo checked
npm run test:style-kit && npm run test:video && npm run test:motion-kit
```
Expected: `0 errors`, `5 contrast warning(s)` (as on main), `checked` with no `DIFF` line, and the three suites green (82, 16, 15).

- [ ] **Step 11: Document the commands and notices**

In `AGENTS.md` and `CLAUDE.md` replace:

old:
```bash
npm run test:style-kit         # unit test style-kit engine + style reference richness + paper pack licenses
```

new:
```bash
npm run test:style-kit         # unit test style-kit engine + style reference richness + paper pack licenses
npm run test:asset-lib         # asset library: build up to date, catalog/licenses/budget, presets contrast, SK runtime
npm run asset-lib -- build     # rebuild vendor/asset-lib outputs from vendor/asset-lib/src (offline)
npm run asset-lib -- fetch <icons|pictograms|fonts|maps|textures>  # refresh pinned third-party data (network)
npm run asset-lib -- process <in.png> <out.png|.webp> [--max 720]   # crop to alpha, resize, compress a bitmap
```

In `internal/docs/operations/runbook.md` replace:

old:
```bash
npm run test:style-kit       # node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs
```

new:
```bash
npm run test:style-kit       # node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs
npm run test:asset-lib       # node --test scripts/asset-lib.test.mjs (pustaka aset: build, katalog, lisensi, anggaran, preset, runtime)
npm run asset-lib -- build   # bangun ulang output vendor/asset-lib dari src/ (offline)
```

In `THIRD_PARTY_NOTICES.md` insert before `## paper-pack (\`vendor/paper-pack\`)`:

```md
## asset-lib (`vendor/asset-lib`)

The runtime, build scripts, SVG doodles, marks, stamps, frames, and document
templates are this project's own work (MIT). Per-file sources are listed in
`vendor/asset-lib/LICENSES.md` (generated from `vendor/asset-lib/src`).

- Icons (`vendor/asset-lib/icons/lucide.json`): path data from
  `lucide-static@1.48.0` (https://lucide.dev), ISC License.
- Pictograms (`vendor/asset-lib/pictograms/phosphor.json`): path data from
  `@phosphor-icons/core@2.1.1` fill weight (https://phosphoricons.com), MIT License.

```

- [ ] **Step 12: Commit**

```bash
git add scripts/lib/asset-lib-build.mjs scripts/lib/asset-lib-fetch.mjs scripts/asset-lib.mjs scripts/asset-lib.test.mjs vendor/asset-lib docs/agents/references/style-examples/index.html scripts/check-broll-examples.mjs templates/dena-video/index.html AGENTS.md CLAUDE.md internal/docs/operations/runbook.md THIRD_PARTY_NOTICES.md
git commit -m "feat: asset library build, catalog, icons, pictograms, and core runtime

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Contact sheets

**Files:**
- Create: `scripts/lib/asset-lib-sheets.mjs`
- Create (generated): `docs/agents/references/asset-catalog/{index.html,hyperframes.json,compositions/*.html,sheets/*.webp}`
- Modify: `scripts/asset-lib.test.mjs`, `internal/docs/operations/runbook.md`

**Interfaces:**
- Consumes: `LIB`, `STYLE_KEY` (Task 3), the built `asset-lib.js` (loaded in a vm for the pure string helpers).
- Produces: `CATALOG_DIR = 'docs/agents/references/asset-catalog'`, `sheetPages(root) → [{name, title, cols, cells}]`, `sheetHtml(page)`, `sheetProject(root) → {pages, files}`, `buildSheets(root)` (writes the project, lints, validates, snapshots at `i + 0.5`, converts to `sheets/<page>.webp`). Pages appear only for kinds that have entries, so every later task re-runs `sheets`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/asset-lib.test.mjs`:

```js
// ---- contact sheets ----------------------------------------------------------------------------------
test('the contact-sheet project matches the catalog and every page has a rendered sheet (run: npm run asset-lib -- sheets)', async () => {
  const { sheetProject, CATALOG_DIR } = await import('./lib/asset-lib-sheets.mjs');
  const { pages, files } = sheetProject(ROOT);
  for (const [p, c] of Object.entries(files)) assert.equal(read(p), c, `${p} is stale`);
  const onDisk = readdirSync(join(ROOT, CATALOG_DIR, 'compositions')).sort();
  assert.deepEqual(onDisk, pages.map((p) => `${p.name}.html`).sort());
  for (const p of pages) assert.ok(existsSync(join(ROOT, CATALOG_DIR, 'sheets', `${p.name}.webp`)), `sheets/${p.name}.webp is missing`);
});
```

Run: `npm run test:asset-lib`
Expected: FAIL — `Cannot find module …/scripts/lib/asset-lib-sheets.mjs`.

- [ ] **Step 2: Write `scripts/lib/asset-lib-sheets.mjs`**

```js
// Contact sheets for the asset library (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md,
// "Contact sheet"). sheetPages(root) turns the catalog into 1080×1920 pages; sheetProject(root) writes
// them as a HyperFrames project (docs/agents/references/asset-catalog/); buildSheets(root) renders
// every page and saves sheets/<page>.webp so an agent can *look* at the library before choosing.
// Node 22+, built-in modules only (ADR-0007); rendering needs `npx hyperframes` and `cwebp`.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { LIB, STYLE_KEY } from './asset-lib-build.mjs';

export const CATALOG_DIR = 'docs/agents/references/asset-catalog';
const HYPERFRAMES = 'hyperframes@0.7.24';

// SK in a vm, for the pure string helpers (icon, pict, doodle, mark, stamp, frame, doc, torn)
function loadSK(root) {
  const ctx = { document: { querySelector: () => null }, gsap: { timeline: () => ({ to() { return this; } }) } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['vendor/motion-kit/motion-kit.js', 'vendor/style-kit/style-kit.js', `${LIB}/asset-lib.js`]) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx);
  return ctx.SK;
}

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const short = (id) => id.slice(id.indexOf('.') + 1);
const cell = (art, label, o = {}) => `<div class="c${o.dark ? ' c-grey' : ''}"${o.style ? ` style="${o.style}"` : ''}><div class="a">${art}</div><div class="l sk-f-geist-mono">${label}</div></div>`;

// sample text for fonts and documents: invented, marked as an example on the page itself
const SAMPLE = 'Sistem AI untuk bisnis — Rp 169 jt';
const DOC_SAMPLE = {
  'article': { kicker: 'Contoh', headline: 'Judul artikel contoh', dek: 'Satu kalimat ringkasan.' },
  'report-page': { section: 'Contoh', title: 'Ringkasan', rows: [{ label: 'Baris A', value: '12' }, { label: 'Baris B', value: '34' }] },
  'spreadsheet': { columns: ['A', 'B', 'C'], rows: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']], highlightRow: 1 },
  'chat-thread': { messages: [{ from: 'Klien', side: 'l', text: 'Contoh pesan masuk' }, { from: 'Tim', side: 'r', text: 'Contoh balasan' }] },
  'email': { from: 'Tim', subject: 'Contoh subjek' },
  'social-post': { name: 'Akun contoh', text: 'Contoh isi postingan.' },
  'receipt': { title: 'STRUK', items: [{ name: 'Item A', price: '10.000' }, { name: 'Item B', price: '5.000' }], total: '15.000' },
  'invoice': { number: '#001', to: 'Klien', items: [{ name: 'Jasa A', qty: '1', price: '1.000.000' }], total: '1.000.000' },
  'search-results': { query: 'contoh pencarian', results: [{ title: 'Hasil pertama', snippet: 'Cuplikan contoh.' }, { title: 'Hasil kedua', snippet: 'Cuplikan contoh.' }] },
  'terminal': { lines: [{ prompt: true, text: 'npm run contoh' }, { text: 'selesai' }] },
};

export function sheetPages(root) {
  const SK = loadSK(root);
  const cat = JSON.parse(readFileSync(join(root, LIB, 'catalog.json'), 'utf8'));
  const pf = join(root, LIB, 'src/presets.json');
  const presets = existsSync(pf) ? JSON.parse(readFileSync(pf, 'utf8')) : { palettes: {}, types: {}, grades: {} };
  const of = (k) => cat.filter((e) => e.kind === k);
  const pages = [];
  const grid = (name, title, cols, cells, per) => chunk(cells, per).forEach((cs, i, all) => pages.push({ name: all.length > 1 ? `${name}-${i + 1}` : name, title: all.length > 1 ? `${title} (${i + 1}/${all.length})` : title, cols, cells: cs }));

  grid('icon', 'icon — Lucide (SK.icon)', 9, of('icon').map((e) => cell(SK.icon(short(e.id), { size: 72, sw: 3 }), short(e.id))), 90);
  grid('pictogram', 'pictogram — Phosphor fill (SK.pict)', 8, of('pictogram').map((e) => cell(SK.pict(short(e.id), { size: 84 }), short(e.id))), 72);
  const doodles = of('doodle');
  if (doodles.length) grid('doodle', 'doodle (SK.doodle)', 6, doodles.map((e) => cell(SK.doodle(e.id, { size: 150, sw: 6 }), short(e.id))), 48);
  const rough = ['coins', 'bot', 'store', 'chart-line', 'lightbulb', 'laptop', 'receipt', 'message-circle', 'users', 'rocket', 'truck', 'target', 'clock', 'calendar', 'database', 'shield-check', 'wallet', 'handshake', 'search', 'workflow'];
  grid('doodle-rough', 'doodle — any icon via SK.rough (seed = index)', 5, rough.map((n, i) => cell(SK.icon(n, { size: 150, sw: 7 }).replace('<svg ', `<svg data-rough="${i + 1}" `), n)), 20);
  const marks = cat.filter((e) => e.id.startsWith('mark.'));
  const stamps = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.stamp'));
  const swashes = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.doodle'));
  const cssFrames = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.frame'));
  const torn = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.tornFrame'));
  grid('frame', 'frame + mark — SK.frame · tornFrame · stamp · mark', 4, [
    ...cssFrames.map((e) => cell(`<div style="position:relative;width:200px;height:230px"><div style="transform:scale(.38);transform-origin:0 0;position:absolute">${SK.frame(short(e.id), { w: 460, h: 400, content: short(e.id) === 'film-strip-3' ? ['', '', ''] : '', caption: 'caption' })}</div></div>`, short(e.id))),
    ...torn.map((e) => cell(`<div class="sk-paper-cream" style="width:200px;height:200px;clip-path:${SK.tornFrame(e.id, 200, 200)}"></div>`, short(e.id), { dark: true })),
    ...stamps.map((e) => cell(`<div style="position:relative;width:220px;height:110px">${SK.stamp(e.id, { size: 220, text: SK.LIB.strokes[e.id].text ?? 'Badge' })}</div>`, short(e.id))),
    ...swashes.map((e) => cell(SK.doodle(e.id, { size: 220, sw: 7 }), short(e.id))),
    // tall marks (bracket, exclaim) are sized by height so every cell stays ~200 px high
    ...marks.map((e) => { const [vw, vh] = SK.LIB.strokes[e.id].vb; return cell(SK.mark(e.id, { size: Math.min(200, (200 * vw) / vh) }), short(e.id)); }),
  ], 24);
  grid('doc', 'doc — SK.doc (always tagged Ilustrasi; sample text)', 2, of('doc').filter((e) => e.id.startsWith('doc.')).map((e) => cell(`<div style="position:relative;width:440px;height:520px"><div style="transform:scale(.52);transform-origin:0 0;position:absolute;left:0;top:14px">${SK.doc(short(e.id), DOC_SAMPLE[short(e.id)] ?? {}, { w: 820 })}</div></div>`, short(e.id))), 6);
  grid('map', 'map — SK.geo(lat, lon, map)', 1, of('map').map((e) => cell(`<img src="${e.file}" style="width:960px;max-height:300px;object-fit:contain" alt="" />`, short(e.id))), 5);
  // bitmap textures are scaled to the tile; pattern classes keep their own size; overlays sit on white paper
  const OVERLAY = ['.sk-tex-halftone', '.sk-tex-riso', '.sk-tex-film'];
  const tile = (e) => OVERLAY.includes(e.use)
    ? `<div class="${e.use === '.sk-tex-film' ? '' : 'sk-paper-white'}" style="position:relative;width:220px;height:300px;background-size:cover;overflow:hidden${e.use === '.sk-tex-film' ? ';background:#8a7355' : ''}"><div class="${e.use.slice(1)}" style="width:220px;height:300px"></div></div>`
    : `<div class="${e.use.slice(1)}" style="position:relative;width:220px;height:300px;background-color:#f5f3f4;overflow:hidden${e.file ? ';background-size:cover' : ''}"></div>`;
  grid('texture', 'texture — classes (overlays on paper; film on kraft)', 4, of('texture').map((e) => cell(tile(e), short(e.id))), 20);
  const papers = of('paper');
  if (papers.length) grid('paper', 'paper — .sk-obj-* (cut-outs, tape, scraps)', 5, papers.map((e) => cell(`<div class="${e.use.slice(1)}" style="position:relative;width:160px;max-height:200px"></div>`, short(e.id), { dark: true })), 30);
  const hands = of('hand');
  if (hands.length) grid('hand', 'hand — SK.placeHand poses', 3, hands.map((e) => cell(`<img src="${e.file}" style="width:260px" alt="" />`, e.anchor.pose, { dark: true })), 9);
  const scenes = of('scene');
  if (scenes.length) {
    grid('scene', 'scene — layered parallax kits (back → front)', 1, scenes.map((e) => {
      const s = JSON.parse(readFileSync(join(root, e.file), 'utf8'));
      return cell(`<div style="display:flex;gap:10px">${s.layers.map((l) => `<img src="${l.file}" style="height:300px;background:#8a8a8a" alt="" />`).join('')}</div>`, `${short(e.id)} — ${s.layers.map((l) => `${l.role} z${l.z}`).join(', ')}`);
    }), 5);
  }
  grid('font', 'font — .sk-f-*', 1, of('font').map((e) => cell(`<div class="${e.use.slice(1)}" style="width:980px;font-size:38px;line-height:1.1;color:#1c1917;white-space:nowrap;overflow:hidden">${SAMPLE}</div>`, short(e.id), { style: 'height:68px;align-items:flex-start;padding:8px 20px' })), 17);
  for (const [st, list] of Object.entries(presets.palettes)) {
    const types = Object.entries(presets.types[st] ?? {});
    pages.push({ name: `preset-${STYLE_KEY[st]}`, title: `preset — ${STYLE_KEY[st]}: .sk-pal-${st}-* and .sk-type-${st}-*`, cols: 2, cells: [
      ...Object.entries(list).map(([n, p]) => cell(`<div class="sk-pal-${st}-${n}${p.bgClass ? ' ' + p.bgClass : ''}" style="position:relative;width:440px;height:210px;background-color:var(--sk-bg);overflow:hidden">${p.overlay ? `<div class="${p.overlay}" style="width:440px;height:210px"></div>` : ''}<div class="sk-f-geist" style="position:absolute;left:20px;top:14px;font-size:40px;font-weight:800;color:var(--sk-ink)">${n}</div><div style="position:absolute;left:20px;top:78px;width:170px;height:40px;background:var(--sk-accent)"></div><div style="position:absolute;left:200px;top:78px;width:110px;height:40px;background:var(--sk-accent-2)"></div><div style="position:absolute;left:320px;top:78px;width:80px;height:40px;background:var(--sk-muted)"></div><div class="sk-f-geist-mono" style="position:absolute;left:20px;top:140px;font-size:20px;color:var(--sk-ink)">${p.bg} ${p.ink}${p.legacy ? ' · legacy' : ''}</div></div>`, `.sk-pal-${st}-${n}`)),
      ...types.map(([n]) => cell(`<div class="sk-type-${st}-${n}" style="width:440px;color:#1c1917"><div class="sk-display" style="font-size:52px;line-height:1">Judul Contoh</div><div class="sk-sans" style="font-size:30px">Kalimat isi contoh.</div><div class="sk-hand" style="font-size:36px">catatan tangan</div><div class="sk-serif" style="font-size:34px">Serif kutipan</div></div>`, `.sk-type-${st}-${n}`, { style: 'height:250px' })),
    ] });
  }
  if (Object.keys(presets.grades).length) pages.push({ name: 'preset-parallax', title: 'preset — parallax grades: .sk-grade-px-* (on the stage)', cols: 2, cells: Object.entries(presets.grades).map(([n, g]) => cell(`<div class="sk-grade-px-${n}" style="position:relative;width:440px;height:260px;overflow:hidden"><div class="sk-view" style="width:440px;height:260px"><div class="sk-paper-cream" style="position:absolute;inset:0"></div><div class="sk-kraft" style="position:absolute;left:40px;top:40px;width:200px;height:170px"></div><div style="position:absolute;left:260px;top:70px;width:140px;height:140px;border-radius:50%;background:#2f6f8f"></div></div><div class="sk-haze" style="width:440px;height:260px"></div></div>`, `.sk-grade-px-${n}${g.legacy ? ' · legacy' : ''}`)) });
  return pages;
}

const PAGE_CSS = `#root { position: absolute; inset: 0; }
        .t { position: absolute; left: 40px; top: 40px; right: 40px; font-size: 30px; font-weight: 700; color: #1c1917; white-space: nowrap; overflow: hidden; }
        .g { position: absolute; left: 30px; top: 110px; right: 30px; bottom: 30px; display: grid; gap: 14px; align-content: start; }
        .c { background: #fbfaf6; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; color: #1c1917; }
        .c-grey { background: #8a8a8a; }
        .a { position: relative; display: flex; align-items: center; justify-content: center; }
        .l { margin-top: 6px; font-size: 16px; color: #57534e; text-align: center; word-break: break-all; }`;

export function sheetHtml(page) {
  const id = `sheet-${page.name}`;
  return `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- GENERATED by \`npm run asset-lib -- sheets\` from the catalog; do not edit. -->
    <template>
      <style>
        ${PAGE_CSS}
      </style>
      <div id="root" data-composition-id="${id}" data-width="1080" data-height="1920" data-duration="1">
        <div class="sk-stage" style="background:#ecebe7">
          <div class="t sk-f-geist">${page.title}</div>
          <div class="g" style="grid-template-columns:repeat(${page.cols},1fr)">${page.cells.join('')}</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = '${id}';
          const stage = SK.stageOf(ID);
          stage.querySelectorAll('svg[data-rough]').forEach((s) => SK.rough(s, { seed: Number(s.dataset.rough) }));
          SK.clip(ID, { T: 1, update: () => {} });
        })();
      </script>
    </template>
  </body>
</html>
`;
}

export function sheetProject(root) {
  const pages = sheetPages(root);
  const mounts = pages.map((p, i) => `      <div id="sheet-${p.name}-mount" class="sheet" data-composition-id="sheet-${p.name}" data-composition-src="compositions/${p.name}.html"
           data-start="${i}" data-duration="1" data-track-index="1" data-width="1080" data-height="1920"></div>`).join('\n');
  const index = `<!doctype html>
<html lang="id">
  <head>
    <!-- GENERATED by \`npm run asset-lib -- sheets\`; vendor/ is copied in when rendering. -->
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
      body { margin: 0; background: #ecebe7; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #ecebe7; }
      .sheet { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="asset-catalog" data-start="0" data-width="1080" data-height="1920" data-duration="${pages.length}">
${mounts}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines['asset-catalog'] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  const files = { [`${CATALOG_DIR}/index.html`]: index, [`${CATALOG_DIR}/hyperframes.json`]: JSON.stringify({ id: 'asset-catalog', name: 'Asset library contact sheets' }, null, 2) + '\n' };
  for (const p of pages) files[`${CATALOG_DIR}/compositions/${p.name}.html`] = sheetHtml(p);
  return { pages, files };
}

export async function buildSheets(root) {
  const { pages, files } = sheetProject(root);
  rmSync(join(root, CATALOG_DIR, 'compositions'), { recursive: true, force: true });
  for (const [p, c] of Object.entries(files)) { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), c); }
  const dir = mkdtempSync(join(tmpdir(), 'asset-catalog-'));
  const env = { ...process.env };
  delete env.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  const hf = (...args) => { const r = spawnSync('npx', ['--yes', HYPERFRAMES, ...args], { stdio: 'inherit', env }); if (r.status !== 0) throw new Error(`hyperframes ${args[0]} failed`); };
  try {
    cpSync(join(root, CATALOG_DIR), dir, { recursive: true, filter: (f) => !f.includes('/sheets') });
    mkdirSync(join(dir, 'vendor'), { recursive: true });
    cpSync(join(root, 'vendor/gsap.min.js'), join(dir, 'vendor/gsap.min.js'));
    for (const v of ['motion-kit', 'style-kit', 'paper-pack']) cpSync(join(root, 'vendor', v), join(dir, 'vendor', v), { recursive: true });
    cpSync(join(root, LIB), join(dir, LIB), { recursive: true, filter: (f) => !f.includes('/src') });
    hf('lint', dir);
    hf('validate', dir);
    const snaps = join(dir, 'snaps');
    hf('snapshot', '--at', pages.map((_, i) => i + 0.5).join(','), '-o', snaps, dir);
    const out = join(root, CATALOG_DIR, 'sheets');
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const frames = readdirSync(snaps).filter((f) => /^frame-\d+/.test(f)).sort();
    if (frames.length !== pages.length) throw new Error(`expected ${pages.length} frames, got ${frames.length}`);
    frames.forEach((f, i) => {
      const r = spawnSync('cwebp', ['-quiet', '-q', '80', join(snaps, f), '-o', join(out, `${pages[i].name}.webp`)]);
      if (r.status !== 0) throw new Error(`cwebp failed for ${f}`);
    });
    return `${pages.length} sheets → ${CATALOG_DIR}/sheets/`;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
```

- [ ] **Step 3: Render the sheets and run the tests**

Run:
```bash
npm run asset-lib -- sheets
git add -A docs/agents/references/asset-catalog
npm run test:asset-lib
```
Expected: lint `0 errors`, `5 sheets → docs/agents/references/asset-catalog/sheets/` (icon-1, icon-2, icon-3, pictogram, doodle-rough), then `ℹ pass 16`, `ℹ fail 0`. The sheet project's `validate` reports many WCAG contrast *warnings* (labels and sample text on swatches of every colour; ~1,000 once all kinds exist); they are expected for a catalog page and are not errors.

- [ ] **Step 4: Review the sheets by eye**

Open every `docs/agents/references/asset-catalog/sheets/*.webp` with the Read tool. Check: every cell shows its icon, the labels match, `doodle-rough` looks like a marker drawing (not trembling, not ruler-straight). A blank or cut cell is a bug in `sheetPages`, not something to accept.

- [ ] **Step 5: Document and commit**

In `internal/docs/operations/runbook.md` replace:

old:
```bash
npm run asset-lib -- build   # bangun ulang output vendor/asset-lib dari src/ (offline)
```

new:
```bash
npm run asset-lib -- build   # bangun ulang output vendor/asset-lib dari src/ (offline)
npm run asset-lib -- sheets  # render contact sheet → docs/agents/references/asset-catalog/sheets/*.webp
```

Add the same `sheets` line to the command blocks in `AGENTS.md` and `CLAUDE.md` after the `asset-lib -- process` line:

```bash
npm run asset-lib -- sheets    # render the contact sheets agents look at (docs/agents/references/asset-catalog/sheets/)
```

```bash
git add scripts/lib/asset-lib-sheets.mjs scripts/asset-lib.test.mjs docs/agents/references/asset-catalog internal/docs/operations/runbook.md AGENTS.md CLAUDE.md
git commit -m "feat: asset library contact sheets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Fonts, palette/grade/type presets, and font roles

**Files:**
- Create: `vendor/asset-lib/src/fonts.json`, `vendor/asset-lib/src/presets.json`
- Create (fetched): `vendor/asset-lib/fonts/*` (13 woff2 + 12 license files)
- Modify: `vendor/style-kit/style-kit.css`, `vendor/asset-lib/src/base.css`, `scripts/asset-lib.test.mjs`, `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produces: `.sk-f-<font-id>` (17 fonts: 5 legacy + 12 new), `.sk-pal-<st>-<name>` (48, `st` ∈ text, mg, wb, vox, stop, mm), `.sk-grade-px-<name>` (8, on the stage; styles `.sk-view` filter, `.sk-haze`, `.sk-grain`), `.sk-type-<st>-<name>` (23, `st` also `px`), `.sk-mono`; CSS variables `--sk-font-display|body|hand|serif|mono` read by `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono` and by the `.sk-text`, `.sk-mg`, `.sk-wb`, `.sk-stop`, `.sk-vox` themes. `presets.json`: `{roles, docPaper, exceptions, palettes: {st: {name: {bg, ink, accent, accent2, muted, bgClass?, overlay?, legacy?}}}, grades: {name: {filter, haze: [color, opacity] | null, grain, legacy?}}, types: {st: {name: {display?, body?, hand?, serif?, mono?, legacy?}}}}`. For a class background, `bg` is the texture's measured mean colour (ffmpeg `scale=1:1:flags=area`).

- [ ] **Step 1: Write the failing tests**

Append to `scripts/asset-lib.test.mjs`:

```js
// ---- presets -----------------------------------------------------------------------------------------
const presets = JSON.parse(read(`${LIB}/src/presets.json`));
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const multiply = (a, b) => '#' + [1, 3, 5].map((i) => Math.round((parseInt(a.slice(i, i + 2), 16) * parseInt(b.slice(i, i + 2), 16)) / 255).toString(16).padStart(2, '0')).join('');
test('every style has 8 palettes (4 legacy + 4 new) and parallax 8 grades', () => {
  for (const st of ['text', 'mg', 'wb', 'vox', 'stop', 'mm']) {
    const ps = Object.values(presets.palettes[st]);
    assert.equal(ps.length, 8, st);
    assert.equal(ps.filter((p) => p.legacy).length, 4, st);
  }
  assert.equal(Object.keys(presets.grades).length, 8);
});
test('palettes meet the contrast rules; only the listed legacy palettes are exempt', () => {
  const failures = [];
  for (const [st, list] of Object.entries(presets.palettes)) {
    const role = presets.roles[st];
    for (const [n, p] of Object.entries(list)) {
      const fail = (what) => failures.push(`${st}.${n}:${what}`);
      if (ratio(p.ink, p.bg) < (role === 'text' ? 4.5 : 3)) fail('ink');
      if (role === 'text') { if (ratio(p.accent, p.bg) < 3) fail('accent'); if (ratio(p.accent2, p.bg) < 3) fail('accent2'); }
      if (role === 'fill') for (const k of ['accent', 'accent2']) if (Math.max(ratio('#111111', p[k]), ratio('#ffffff', p[k])) < 4.5) fail(k);
      if (role === 'hl') { if (ratio('#1b1b1b', multiply(presets.docPaper, p.accent)) < 4.5) fail('accent'); if (ratio(p.accent2, presets.docPaper) < 3) fail('accent2'); }
    }
  }
  const allowed = Object.entries(presets.exceptions).flatMap(([k, v]) => v.map((x) => `${k}:${x}`));
  assert.deepEqual(failures.sort(), allowed.sort());
  for (const k of Object.keys(presets.exceptions)) {
    const [st, n] = k.split('.');
    assert.ok(presets.palettes[st][n].legacy, `${k}: only legacy palettes may be exceptions`);
  }
});
test('every type preset names a font the library can load', () => {
  const css = read(`${LIB}/asset-lib.css`) + read('vendor/style-kit/style-kit.css') + read('vendor/motion-kit/motion-kit.css');
  const families = new Set([...css.matchAll(/@font-face \{ font-family: '([^']+)'/g)].map((m) => m[1]));
  for (const [st, list] of Object.entries(presets.types)) {
    assert.ok(STYLE_KEY[st], st);
    for (const [n, t] of Object.entries(list)) for (const r of ['display', 'body', 'hand', 'serif', 'mono']) if (t[r]) assert.ok(families.has(t[r]), `${st}.${n}.${r}: no @font-face for ${t[r]}`);
  }
});
test('style-kit roles read the type variables and fall back to the old fonts', () => {
  const css = read('vendor/style-kit/style-kit.css');
  assert.match(css, /\.sk-display \{ font-family: var\(--sk-font-display, 'Anton'\), sans-serif;/);
  assert.match(css, /\.sk-sans \{ font-family: var\(--sk-font-body, 'Geist'\), system-ui, sans-serif;/);
  assert.match(css, /\.sk-hand \{ font-family: var\(--sk-font-hand, 'Caveat'\), cursive;/);
  assert.match(css, /\.sk-serif \{ font-family: var\(--sk-font-serif, 'Newsreader'\), serif;/);
});
```

Run: `npm run test:asset-lib`
Expected: FAIL — `ENOENT … vendor/asset-lib/src/presets.json`.

- [ ] **Step 2: Write `vendor/asset-lib/src/fonts.json` and fetch the fonts**

Legacy entries (already vendored in style-kit/motion-kit) only get `.sk-f-*` classes; new ones get `@font-face` too. Every URL was checked (HTTP 200) on 2026-09-27.

```json
[
  {"id":"anton","family":"Anton","fallback":"sans-serif","transform":"uppercase","styles":["broll-text"],"license":"OFL-1.1","source":"project (legacy, vendored earlier)","legacy":true},
  {"id":"geist","family":"Geist","fallback":"system-ui, sans-serif","transform":"none","styles":["motion-graphic","vox","stop-motion","mix-media","parallax"],"license":"OFL-1.1","source":"project (legacy, vendored earlier)","legacy":true},
  {"id":"geist-mono","family":"Geist Mono","fallback":"ui-monospace, monospace","transform":"none","styles":["motion-graphic"],"license":"OFL-1.1","source":"project (legacy, vendored earlier)","legacy":true},
  {"id":"caveat","family":"Caveat","fallback":"cursive","transform":"none","styles":["whiteboard"],"license":"OFL-1.1","source":"project (legacy, vendored earlier)","legacy":true},
  {"id":"newsreader","family":"Newsreader","fallback":"serif","transform":"none","styles":["vox"],"license":"OFL-1.1","source":"project (legacy, vendored earlier)","legacy":true},
  {"id":"bebas-neue","family":"Bebas Neue","fallback":"sans-serif","transform":"uppercase","styles":["broll-text"],"license":"OFL-1.1","source":"fontsource @fontsource/bebas-neue@5.3.0 — https://www.npmjs.com/package/@fontsource/bebas-neue","files":[{"file":"bebas-neue-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.3.0/files/bebas-neue-latin-400-normal.woff2"}],"licenseFile":"OFL-bebas-neue.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/OFL.txt"},
  {"id":"archivo-black","family":"Archivo Black","fallback":"sans-serif","transform":"none","styles":["broll-text","stop-motion"],"license":"OFL-1.1","source":"fontsource @fontsource/archivo-black@5.3.0 — https://www.npmjs.com/package/@fontsource/archivo-black","files":[{"file":"archivo-black-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/archivo-black@5.3.0/files/archivo-black-latin-400-normal.woff2"}],"licenseFile":"OFL-archivo-black.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/archivoblack/OFL.txt"},
  {"id":"bricolage-grotesque","family":"Bricolage Grotesque","fallback":"sans-serif","transform":"none","styles":["motion-graphic"],"license":"OFL-1.1","source":"fontsource @fontsource-variable/bricolage-grotesque@5.3.0 — https://www.npmjs.com/package/@fontsource-variable/bricolage-grotesque","files":[{"file":"bricolage-grotesque-latin-wght-normal.woff2","weight":"200 800","url":"https://cdn.jsdelivr.net/npm/@fontsource-variable/bricolage-grotesque@5.3.0/files/bricolage-grotesque-latin-wght-normal.woff2"}],"licenseFile":"OFL-bricolage-grotesque.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt"},
  {"id":"space-grotesk","family":"Space Grotesk","fallback":"sans-serif","transform":"none","styles":["broll-text","motion-graphic","vox","mix-media"],"license":"OFL-1.1","source":"fontsource @fontsource-variable/space-grotesk@5.3.0 — https://www.npmjs.com/package/@fontsource-variable/space-grotesk","files":[{"file":"space-grotesk-latin-wght-normal.woff2","weight":"300 700","url":"https://cdn.jsdelivr.net/npm/@fontsource-variable/space-grotesk@5.3.0/files/space-grotesk-latin-wght-normal.woff2"}],"licenseFile":"OFL-space-grotesk.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/OFL.txt"},
  {"id":"plus-jakarta-sans","family":"Plus Jakarta Sans","fallback":"sans-serif","transform":"none","styles":["motion-graphic"],"license":"OFL-1.1","source":"fontsource @fontsource-variable/plus-jakarta-sans@5.3.0 — https://www.npmjs.com/package/@fontsource-variable/plus-jakarta-sans","files":[{"file":"plus-jakarta-sans-latin-wght-normal.woff2","weight":"200 800","url":"https://cdn.jsdelivr.net/npm/@fontsource-variable/plus-jakarta-sans@5.3.0/files/plus-jakarta-sans-latin-wght-normal.woff2"}],"licenseFile":"OFL-plus-jakarta-sans.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/OFL.txt"},
  {"id":"instrument-serif","family":"Instrument Serif","fallback":"serif","transform":"none","styles":["broll-text","mix-media","parallax"],"license":"OFL-1.1","source":"fontsource @fontsource/instrument-serif@5.3.0 — https://www.npmjs.com/package/@fontsource/instrument-serif","files":[{"file":"instrument-serif-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/instrument-serif@5.3.0/files/instrument-serif-latin-400-normal.woff2"}],"licenseFile":"OFL-instrument-serif.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/OFL.txt"},
  {"id":"dm-serif-display","family":"DM Serif Display","fallback":"serif","transform":"none","styles":["vox"],"license":"OFL-1.1","source":"fontsource @fontsource/dm-serif-display@5.3.0 — https://www.npmjs.com/package/@fontsource/dm-serif-display","files":[{"file":"dm-serif-display-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/dm-serif-display@5.3.0/files/dm-serif-display-latin-400-normal.woff2"}],"licenseFile":"OFL-dm-serif-display.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/dmserifdisplay/OFL.txt"},
  {"id":"jetbrains-mono","family":"JetBrains Mono","fallback":"ui-monospace, monospace","transform":"none","styles":["broll-text","motion-graphic"],"license":"OFL-1.1","source":"fontsource @fontsource-variable/jetbrains-mono@5.3.0 — https://www.npmjs.com/package/@fontsource-variable/jetbrains-mono","files":[{"file":"jetbrains-mono-latin-wght-normal.woff2","weight":"100 800","url":"https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono@5.3.0/files/jetbrains-mono-latin-wght-normal.woff2"}],"licenseFile":"OFL-jetbrains-mono.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/OFL.txt"},
  {"id":"permanent-marker","family":"Permanent Marker","fallback":"cursive","transform":"none","styles":["whiteboard","mix-media"],"license":"Apache-2.0","source":"fontsource @fontsource/permanent-marker@5.3.0 — https://www.npmjs.com/package/@fontsource/permanent-marker","files":[{"file":"permanent-marker-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/permanent-marker@5.3.0/files/permanent-marker-latin-400-normal.woff2"}],"licenseFile":"LICENSE-permanent-marker.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/apache/permanentmarker/LICENSE.txt"},
  {"id":"kalam","family":"Kalam","fallback":"cursive","transform":"none","styles":["whiteboard"],"license":"OFL-1.1","source":"fontsource @fontsource/kalam@5.3.0 — https://www.npmjs.com/package/@fontsource/kalam","files":[{"file":"kalam-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/kalam@5.3.0/files/kalam-latin-400-normal.woff2"},{"file":"kalam-latin-700-normal.woff2","weight":700,"url":"https://cdn.jsdelivr.net/npm/@fontsource/kalam@5.3.0/files/kalam-latin-700-normal.woff2"}],"licenseFile":"OFL-kalam.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/OFL.txt"},
  {"id":"patrick-hand","family":"Patrick Hand","fallback":"cursive","transform":"none","styles":["whiteboard","stop-motion"],"license":"OFL-1.1","source":"fontsource @fontsource/patrick-hand@5.3.0 — https://www.npmjs.com/package/@fontsource/patrick-hand","files":[{"file":"patrick-hand-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/patrick-hand@5.3.0/files/patrick-hand-latin-400-normal.woff2"}],"licenseFile":"OFL-patrick-hand.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/ofl/patrickhand/OFL.txt"},
  {"id":"special-elite","family":"Special Elite","fallback":"serif","transform":"none","styles":["vox","mix-media"],"license":"Apache-2.0","source":"fontsource @fontsource/special-elite@5.3.0 — https://www.npmjs.com/package/@fontsource/special-elite","files":[{"file":"special-elite-latin-400-normal.woff2","weight":400,"url":"https://cdn.jsdelivr.net/npm/@fontsource/special-elite@5.3.0/files/special-elite-latin-400-normal.woff2"}],"licenseFile":"LICENSE-special-elite.txt","licenseUrl":"https://raw.githubusercontent.com/google/fonts/main/apache/specialelite/LICENSE.txt"}
]
```

Run: `npm run asset-lib -- fetch fonts`
Expected: `fetched fonts: 13`.

- [ ] **Step 3: Write `vendor/asset-lib/src/presets.json`**

The legacy rows copy each style's current `## Look` table exactly; `bg` for class backgrounds is the measured mean. Exceptions are exactly the six approved legacy ones.

```json
{
  "roles": {"text":"text","mg":"text","wb":"text","vox":"hl","stop":"fill","mm":"fill"},
  "docPaper": "#fbfaf6",
  "exceptions": {"text.paper":["accent"],"mg.default":["accent2"],"mg.mint":["accent2"],"vox.dark-desk":["ink","accent2"],"stop.night-desk":["ink"],"mm.night-zine":["ink"]},
  "palettes": {
    "text": {
      "default": {"bg":"#0a0a0a","ink":"#fafafa","accent":"#facc15","accent2":"#ef4444","muted":"#737373","legacy":true},
      "paper": {"bg":"#f2f0ea","ink":"#111111","accent":"#ff4d00","accent2":"#2563eb","muted":"#8a8578","legacy":true},
      "signal": {"bg":"#111111","ink":"#f5f5f5","accent":"#22d3ee","accent2":"#f43f5e","muted":"#525252","legacy":true},
      "ink-blue": {"bg":"#0b1f4d","ink":"#f8fafc","accent":"#fde047","accent2":"#fb7185","muted":"#64748b","legacy":true},
      "jakarta-dusk": {"bg":"#1a1033","ink":"#fff4e6","accent":"#ff8a3d","accent2":"#ff4f8b","muted":"#7a6a99"},
      "risograph": {"bg":"#f6efe2","ink":"#1d3fbb","accent":"#e8336d","accent2":"#00897b","muted":"#a79f8f","overlay":"sk-tex-riso"},
      "terminal": {"bg":"#0b0f0c","ink":"#d7ffd9","accent":"#39ff88","accent2":"#ffb000","muted":"#4f6b55"},
      "cream-red": {"bg":"#f3ead8","ink":"#1a1a1a","accent":"#d62828","accent2":"#003049","muted":"#9a8f7a"}
    },
    "mg": {
      "default": {"bg":"#f4efe6","ink":"#1c1917","accent":"#2563eb","accent2":"#f97316","muted":"#a8a29e","legacy":true},
      "night": {"bg":"#0f172a","ink":"#f8fafc","accent":"#38bdf8","accent2":"#f472b6","muted":"#64748b","legacy":true},
      "economist": {"bg":"#f5f4f0","ink":"#0d0d0d","accent":"#e3120b","accent2":"#6b7280","muted":"#b8b8b8","legacy":true},
      "mint": {"bg":"#ecfdf5","ink":"#052e16","accent":"#059669","accent2":"#f59e0b","muted":"#86efac","legacy":true},
      "fintech": {"bg":"#0b1220","ink":"#e6edf7","accent":"#22c55e","accent2":"#f43f5e","muted":"#475569"},
      "sunrise": {"bg":"#fff7ed","ink":"#1c1917","accent":"#c2410c","accent2":"#7c3aed","muted":"#d6c7b4"},
      "mono-ink": {"bg":"#fafafa","ink":"#0a0a0a","accent":"#e11d48","accent2":"#525252","muted":"#d4d4d4"},
      "ai-violet": {"bg":"#13111c","ink":"#f5f3ff","accent":"#a78bfa","accent2":"#2dd4bf","muted":"#4c4868"}
    },
    "wb": {
      "default": {"bg":"#fbfbf8","ink":"#151515","accent":"#dc2626","accent2":"#2563eb","muted":"#9ca3af","legacy":true},
      "kraft": {"bg":"#efe6d6","ink":"#2b2118","accent":"#c2410c","accent2":"#1d4ed8","muted":"#a08c70","legacy":true},
      "blackboard": {"bg":"#1f2a24","ink":"#f1f5f0","accent":"#fde047","accent2":"#93c5fd","muted":"#6b7f72","legacy":true},
      "blueprint": {"bg":"#123a6b","ink":"#eaf2ff","accent":"#fbbf24","accent2":"#f472b6","muted":"#7ea3d4","legacy":true},
      "graph-paper": {"bg":"#f7f9fc","ink":"#1f2937","accent":"#e11d48","accent2":"#0284c7","muted":"#cbd5e1","bgClass":"sk-tex-graph"},
      "chalk-green": {"bg":"#233027","ink":"#f4f1e8","accent":"#ffd166","accent2":"#8ecae6","muted":"#5f7a6b","bgClass":"sk-tex-blackboard"},
      "napkin": {"bg":"#fbf6ee","ink":"#3b2f2f","accent":"#2563eb","accent2":"#dc2626","muted":"#cbbfae"},
      "neon-marker": {"bg":"#111111","ink":"#f5f5f5","accent":"#ff3ea5","accent2":"#3ef0ff","muted":"#555555"}
    },
    "vox": {
      "default": {"bg":"#f5ebd0","ink":"#1b1b1b","accent":"#ffe14d","accent2":"#d7263d","muted":"#8c8577","bgClass":"sk-paper-cream","legacy":true},
      "newsprint": {"bg":"#c4b9b4","ink":"#1b1b1b","accent":"#ffe14d","accent2":"#d7263d","muted":"#6b665c","bgClass":"sk-newsprint","legacy":true},
      "dark-desk": {"bg":"#a68768","ink":"#f5efe6","accent":"#ffe14d","accent2":"#ff6b6b","muted":"#a8a29e","bgClass":"sk-kraft-dark","legacy":true},
      "blueprint": {"bg":"#f5f3f4","ink":"#1e3a5f","accent":"#ffe14d","accent2":"#d7263d","muted":"#7ea3d4","bgClass":"sk-grid","legacy":true},
      "archive-sepia": {"bg":"#caa77a","ink":"#2a1f14","accent":"#f2c14e","accent2":"#9b2226","muted":"#8a7a5c","bgClass":"sk-tex-paper-tan"},
      "cork-board": {"bg":"#ab6f3e","ink":"#1b1b1b","accent":"#ffe14d","accent2":"#6e0d10","muted":"#6b4f33","bgClass":"sk-tex-cork"},
      "evidence": {"bg":"#1d1f22","ink":"#f1ede4","accent":"#ffe14d","accent2":"#e5383b","muted":"#6b6f76"},
      "pastel-brief": {"bg":"#eef2f7","ink":"#1e293b","accent":"#a7f3d0","accent2":"#e11d48","muted":"#94a3b8"}
    },
    "stop": {
      "default": {"bg":"#bb8f4d","ink":"#2b2118","accent":"#b5452b","accent2":"#2f6f8f","muted":"#8a7355","bgClass":"sk-kraft","legacy":true},
      "notebook": {"bg":"#f5f3f4","ink":"#1f2937","accent":"#dc2626","accent2":"#2563eb","muted":"#9ca3af","bgClass":"sk-lined","legacy":true},
      "night-desk": {"bg":"#a68768","ink":"#f5efe6","accent":"#f59e0b","accent2":"#7dd3fc","muted":"#a8a29e","bgClass":"sk-kraft-dark","legacy":true},
      "blueprint-paper": {"bg":"#f5f3f4","ink":"#1e3a5f","accent":"#b5452b","accent2":"#2f6f8f","muted":"#7ea3d4","bgClass":"sk-grid","legacy":true},
      "warung": {"bg":"#ba8e4e","ink":"#2b2118","accent":"#d62828","accent2":"#2a9d8f","muted":"#8a7355","bgClass":"sk-tex-cardboard"},
      "school-craft": {"bg":"#f5f3f4","ink":"#1f2937","accent":"#f4a261","accent2":"#3a86ff","muted":"#adb5bd","bgClass":"sk-paper-white"},
      "midnight-desk": {"bg":"#2a1f17","ink":"#f5efe6","accent":"#e9c46a","accent2":"#7dd3fc","muted":"#a8a29e","overlay":"sk-tex-film"},
      "pastel-cut": {"bg":"#f5ebd0","ink":"#2b2d42","accent":"#ffafcc","accent2":"#a2d2ff","muted":"#bdb2a0","bgClass":"sk-paper-cream"}
    },
    "mm": {
      "default": {"bg":"#f5f3f4","ink":"#2b2118","accent":"#b5452b","accent2":"#2f6f8f","muted":"#8a7355","bgClass":"sk-grid","legacy":true},
      "notebook": {"bg":"#f5f3f4","ink":"#1f2937","accent":"#dc2626","accent2":"#2563eb","muted":"#9ca3af","bgClass":"sk-lined","legacy":true},
      "kraft-desk": {"bg":"#bb8f4d","ink":"#2b2118","accent":"#b5452b","accent2":"#2f6f8f","muted":"#8a7355","bgClass":"sk-kraft","legacy":true},
      "night-zine": {"bg":"#a68768","ink":"#f5efe6","accent":"#f59e0b","accent2":"#7dd3fc","muted":"#a8a29e","bgClass":"sk-kraft-dark","legacy":true},
      "zine-pink": {"bg":"#f5f3f4","ink":"#111111","accent":"#ff3d8b","accent2":"#1f6feb","muted":"#9e9e9e","bgClass":"sk-paper-white","overlay":"sk-tex-riso"},
      "scrapbook": {"bg":"#bb8f4d","ink":"#2b2118","accent":"#e76f51","accent2":"#2a9d8f","muted":"#8a7355","bgClass":"sk-kraft"},
      "xerox": {"bg":"#c4b9b4","ink":"#111111","accent":"#ff2a2a","accent2":"#5f5f5f","muted":"#8a8a8a","bgClass":"sk-paper-grey","overlay":"sk-tex-halftone"},
      "pop-collage": {"bg":"#ffd23f","ink":"#1a1a1a","accent":"#ee4266","accent2":"#3bceac","muted":"#8a7355","overlay":"sk-tex-halftone"}
    }
  },
  "grades": {
    "default": {"filter":"none","haze":null,"grain":0,"legacy":true},
    "archive": {"filter":"grayscale(.6) contrast(1.05)","haze":["#d9d4c7",0.12],"grain":0.18,"legacy":true},
    "night-desk": {"filter":"brightness(.9)","haze":["#0f1e3d",0.15],"grain":0.12,"legacy":true},
    "paper-stage": {"filter":"none","haze":["#f5f3f4",0.2],"grain":0.1,"legacy":true},
    "golden-hour": {"filter":"sepia(.15) saturate(1.1) brightness(1.03)","haze":["#ffb86b",0.12],"grain":0.12},
    "blue-hour": {"filter":"saturate(.9) hue-rotate(-8deg) brightness(.92)","haze":["#1e3a8a",0.18],"grain":0.12},
    "faded-film": {"filter":"contrast(.9) saturate(.8) brightness(1.05)","haze":["#f5e6d0",0.1],"grain":0.2},
    "mono-archive": {"filter":"grayscale(1) contrast(1.1)","haze":["#d9d4c7",0.12],"grain":0.22}
  },
  "types": {
    "text": {
      "poster": {"display":"Anton","body":"Geist","legacy":true},
      "editorial": {"display":"Bebas Neue","body":"Instrument Serif"},
      "brutal": {"display":"Archivo Black","body":"Space Grotesk"},
      "terminal": {"display":"JetBrains Mono","body":"JetBrains Mono","mono":"JetBrains Mono"}
    },
    "mg": {
      "clean": {"body":"Geist","legacy":true},
      "jakarta": {"display":"Plus Jakarta Sans","body":"Plus Jakarta Sans"},
      "data": {"body":"Space Grotesk","mono":"JetBrains Mono"},
      "expressive": {"display":"Bricolage Grotesque","body":"Geist"}
    },
    "wb": {
      "caveat": {"hand":"Caveat","legacy":true},
      "kalam": {"hand":"Kalam"},
      "neat": {"hand":"Patrick Hand"},
      "marker": {"display":"Permanent Marker","hand":"Caveat"}
    },
    "vox": {
      "paper": {"serif":"Newsreader","body":"Geist","legacy":true},
      "magazine": {"serif":"DM Serif Display","body":"Space Grotesk"},
      "archive": {"serif":"Special Elite","body":"Newsreader"}
    },
    "stop": {
      "default": {"body":"Geist","legacy":true},
      "school": {"body":"Patrick Hand"},
      "label": {"display":"Archivo Black","body":"Geist"}
    },
    "mm": {
      "zine": {"display":"Permanent Marker","body":"Geist"},
      "editorial": {"serif":"Instrument Serif","body":"Space Grotesk"},
      "typewriter": {"body":"Special Elite"}
    },
    "px": {
      "memory": {"serif":"Instrument Serif","body":"Geist"},
      "label": {"body":"Geist","legacy":true}
    }
  }
}
```

- [ ] **Step 4: Make style-kit's font roles read the type variables**

In `vendor/style-kit/style-kit.css` make these replacements (each old text occurs once):

| old | new |
| --- | --- |
| `--sk-muted: #737373; font-family: 'Anton', sans-serif;` | `--sk-muted: #737373; font-family: var(--sk-font-display, 'Anton'), sans-serif;` |
| `--sk-muted: #a8a29e; font-family: 'Geist', system-ui, sans-serif; font-feature-settings` | `--sk-muted: #a8a29e; font-family: var(--sk-font-body, 'Geist'), system-ui, sans-serif; font-feature-settings` |
| `--sk-muted: #9ca3af; font-family: 'Caveat', cursive; }` | `--sk-muted: #9ca3af; font-family: var(--sk-font-hand, 'Caveat'), cursive; }` |
| `.sk-display { font-family: 'Anton', sans-serif;` | `.sk-display { font-family: var(--sk-font-display, 'Anton'), sans-serif;` |
| `.sk-sans { font-family: 'Geist', system-ui, sans-serif;` | `.sk-sans { font-family: var(--sk-font-body, 'Geist'), system-ui, sans-serif;` |
| `.sk-hand { font-family: 'Caveat', cursive;` | `.sk-hand { font-family: var(--sk-font-hand, 'Caveat'), cursive;` |
| `.sk-serif { font-family: 'Newsreader', serif;` | `.sk-serif { font-family: var(--sk-font-serif, 'Newsreader'), serif;` |
| `--sk-muted: #8a7355; font-family: 'Geist', system-ui, sans-serif; }` | `--sk-muted: #8a7355; font-family: var(--sk-font-body, 'Geist'), system-ui, sans-serif; }` |
| `--sk-muted: #8c8577; font-family: 'Geist', system-ui, sans-serif; }` | `--sk-muted: #8c8577; font-family: var(--sk-font-body, 'Geist'), system-ui, sans-serif; }` |

and replace the comment:

old:
```css
/* font switches for clips: a clip's own <style> must not name a font family (the linter only
   sees @font-face in this sheet and motion-kit.css) */
```

new:
```css
/* font switches for clips: a clip's own <style> must not name a font family (the linter only
   sees @font-face in the kit sheets). Each role reads a --sk-font-* variable that a type preset
   (.sk-type-*, vendor/asset-lib/asset-lib.css) may set; without one it is the old font. */
```

- [ ] **Step 5: Add the mono role to `vendor/asset-lib/src/base.css`**

Replace:

old:
```css
/* ---- base (vendor/asset-lib/src/base.css): hand-written rules appended to the generated sheet ---- */
.sk-icon, .sk-pict, .sk-doodle, .sk-mark { display: block; overflow: visible; }
```

new:
```css
/* ---- base (vendor/asset-lib/src/base.css): hand-written rules appended to the generated sheet ---- */
/* mono role; the other roles live in style-kit.css with the same var() fallback pattern */
.sk-mono { font-family: var(--sk-font-mono, 'Geist Mono'), ui-monospace, monospace; text-transform: none; }
.sk-icon, .sk-pict, .sk-doodle, .sk-mark { display: block; overflow: visible; }
```

- [ ] **Step 6: Build, test, and prove pixel identity**

Run:
```bash
npm run asset-lib -- build && git add -A vendor/asset-lib && npm run test:asset-lib
npm run check:style-examples
for f in /tmp/asset-lib-baseline/frame-*.png; do cmp -s "$f" "renders/style-examples/$(basename "$f")" || echo "DIFF $(basename "$f")"; done; echo checked
npm run test:style-kit
```
Expected: `ℹ pass 19`, `ℹ fail 1` — the one failure is the stale contact-sheet test, fixed by Step 7 (the contrast test lists exactly the six exceptions); `0 errors`; `checked` with no `DIFF`; style-kit 82/82.

- [ ] **Step 7: Sheets and review**

Run: `npm run asset-lib -- sheets && git add -A docs/agents/references/asset-catalog && npm run test:asset-lib`
Expected afterwards: `ℹ pass 20`. Review `font.webp` (every font renders its own face — none falls back to a system font), the seven `preset-*.webp` pages (swatches match `presets.json`; overlays visible; each type preset shows its faces).

- [ ] **Step 8: Notices and commit**

In `THIRD_PARTY_NOTICES.md`, append to the `## asset-lib` list:

```md
- Fonts (`vendor/asset-lib/fonts/`, Latin subsets from fontsource `@5.3.0`):
  Bebas Neue, Archivo Black, Bricolage Grotesque, Space Grotesk, Plus Jakarta
  Sans, Instrument Serif, DM Serif Display, JetBrains Mono, Kalam, Patrick Hand —
  SIL Open Font License 1.1; Permanent Marker and Special Elite — Apache License
  2.0. License texts are next to the fonts (`OFL-*.txt`, `LICENSE-*.txt`).
```

```bash
git add vendor/asset-lib vendor/style-kit/style-kit.css scripts/asset-lib.test.mjs docs/agents/references/asset-catalog THIRD_PARTY_NOTICES.md
git commit -m "feat: fonts, palette/grade/type presets, and font roles for the asset library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Strokes, stamps, CSS frames, torn masks, and VOX documents

**Files:**
- Modify: `vendor/asset-lib/src/runtime.js`, `vendor/asset-lib/src/base.css`, `vendor/asset-lib/src/items.json`, `scripts/asset-lib.test.mjs`
- Create: `vendor/asset-lib/src/docs.json`, `vendor/asset-lib/src/frames/stamp-ilustrasi.svg`, `vendor/asset-lib/src/frames/swash-1.svg`, `vendor/asset-lib/src/marks/red-circle.svg`

**Interfaces:**
- Consumes: `SK.torn` (style-kit), `SK.LIB.strokes` / `SK.LIB.torn` (built from `src/{doodles,marks,frames}/*.svg` and items with `torn`).
- Produces: `SK.doodle(id, {size, sw, color})`, `SK.mark(id, o)` (default colour `var(--sk-accent-2)`, sw 9), `SK.stamp(id, {text, color, size, sw, fontSize})`, `SK.tornFrame(id, w, h) → clip-path`, `SK.frame(id, {w, h, content, caption})`, `SK.doc(kind, fields, {w}) → html`, `SK.DOC_KINDS`. Stroke SVG contract: `viewBox="0 0 W H"`, one `<path d>` per pen stroke in drawing order, `data-tags`, `data-styles`, optional `data-text` (stamp words). Files in `src/frames/` named `swash-*` draw with `SK.doodle`; every other frame SVG is a stamp/badge border for `SK.stamp`. Paths come out as `<path class="sk-dpath">` (never `.sk-stroke`).

- [ ] **Step 1: Write the failing tests**

Append to `scripts/asset-lib.test.mjs`:

```js
// ---- strokes, frames, documents ----------------------------------------------------------------------
test('parseStrokeSvg reads viewBox, strokes, tags, styles, and fixed text', () => {
  const s = parseStrokeSvg('<svg viewBox="0 0 320 120" data-tags="status" data-styles="vox" data-text="ILUSTRASI"><path d="M10 10h300"/><path d="m10 20 5 5"/></svg>', 'x.svg');
  assert.deepEqual(s, { vb: [320, 120], d: ['M10 10L310 10', 'M10 20L15 25'], tags: ['status'], styles: ['vox'], text: 'ILUSTRASI' });
  assert.throws(() => parseStrokeSvg('<svg><path d="M0 0L1 1"/></svg>', 'x.svg'), /viewBox/);
});
test('SK.frame and SK.tornFrame build from named presets', () => {
  const SK = load();
  assert.match(SK.frame('polaroid', { w: 500, h: 400, caption: 'Rapat <1>' }), /class="sk-frame sk-frame-polaroid" style="width:500px".*height:400px.*Rapat &lt;1&gt;/);
  assert.match(SK.frame('polaroid-tilt', {}), /sk-frame-polaroid sk-frame-tilt/);
  assert.equal(SK.tornFrame('torn-all', 300, 200), SK.torn(300, 200, 11, { edges: 'trbl', amp: 8, step: 14 }));
  assert.throws(() => SK.frame('window'), /unknown frame "window"/);
});
test('SK.doc renders every template with the Ilustrasi tag and escapes transcript text', () => {
  const SK = load();
  const kinds = JSON.parse(read(`${LIB}/src/docs.json`)).map((d) => d.kind);
  assert.deepEqual([...SK.DOC_KINDS].sort(), [...kinds].sort());
  for (const k of kinds) {
    const html = SK.doc(k, {});
    assert.match(html, new RegExp(`^<div class="sk-doc sk-docx sk-doc-${k}" style="width:800px">`), k);
    assert.match(html, /<div class="sk-tag sk-doc-tag">Ilustrasi<\/div><\/div>$/, k);
  }
  assert.match(SK.doc('chat-thread', { messages: [{ from: 'Klien', side: 'l', text: 'harga <final>?' }] }), /harga &lt;final&gt;\?/);
  assert.match(SK.doc('article', { headline: 'Judul' }), /<div class="sk-doc-line"/);
});
```

Run: `npm run test:asset-lib`
Expected: FAIL — `SK.frame is not a function` (and the `docs.json` read fails).

- [ ] **Step 2: Add the runtime sections**

In `vendor/asset-lib/src/runtime.js` insert before the final `})();`:

```js
// ---- strokes: doodles, marks, stamp borders ----------------------------------------------------
/* One <path class="sk-dpath"> per pen stroke in drawing order, so SK.draw / SK.drawSeq can draw it
   on. Not .sk-stroke: `.sk-wb .sk-stroke` would force stroke-width 7 in viewBox units.
   o.size is the width in px; o.sw the on-screen stroke width in px. */
const strokeSvg = (id,o,cls)=>{
  const s=pick(SK.LIB.strokes,'stroke asset',id);
  const w=o.size??240, h=w*s.vb[1]/s.vb[0], k=s.vb[0]/w;
  return `<svg class="${cls}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="0 0 ${s.vb[0]} ${s.vb[1]}" fill="none" stroke="${o.color??'currentColor'}" stroke-width="${((o.sw??7)*k).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">${s.d.map(d=>`<path class="sk-dpath" d="${d}"/>`).join('')}</svg>`;
};
SK.doodle = (id,o={})=>strokeSvg(full(id,'doodle'),o,'sk-doodle');
// red-pen marks (circle, underline, arrow, …) default to the palette's second accent
SK.mark = (id,o={})=>strokeSvg(full(id,'mark'),{color:'var(--sk-accent-2, #d7263d)',sw:9,...o},'sk-mark');

// ---- frames ------------------------------------------------------------------------------------
/* stamp / badge: an SVG border plus centred text. Stamps with fixed words (ILUSTRASI, CONTOH, …)
   use them; badges need o.text from the transcript. */
SK.stamp = (id,o={})=>{
  const key=full(id,'frame'), s=pick(SK.LIB.strokes,'stamp',key), text=o.text??s.text;
  if(!text) throw new Error(`asset-lib: ${key} needs o.text (a word from the transcript)`);
  const w=o.size??320, h=w*s.vb[1]/s.vb[0];
  // default text size fits both the height and the width (≈ 0.62 em per uppercase letter + tracking)
  const fs=o.fontSize??Math.min(h*0.3, w*0.62/(String(text).length*0.72));
  return `<div class="sk-stamp" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;color:${o.color??'var(--sk-accent-2, #d7263d)'}">${strokeSvg(key,{size:w,sw:o.sw??5,color:'currentColor'},'sk-stamp-border')}<span class="sk-stamp-text" style="font-size:${fs.toFixed(1)}px">${esc(text)}</span></div>`;
};
// torn-paper clip-path from a named SK.torn preset, sized to the piece
SK.tornFrame = (id,w,h)=>{
  const p=pick(SK.LIB.torn,'torn frame',full(id,'frame'));
  return SK.torn(w,h,p.seed,{edges:p.edges,amp:p.amp,step:p.step});
};
/* CSS frames. o.content is HTML placed in the photo/screen area (an <img>, a .sk-obj, text);
   film-strip-3 takes o.content as an array of three. */
const FRAMES = {
  'polaroid': o=>`<div class="sk-frame sk-frame-polaroid" style="width:${o.w}px"><div class="sk-frame-photo" style="height:${o.h}px">${o.content??''}</div><div class="sk-frame-caption sk-hand">${esc(o.caption??'')}</div></div>`,
  'polaroid-tilt': o=>FRAMES['polaroid'](o).replace('sk-frame-polaroid"','sk-frame-polaroid sk-frame-tilt"'),
  'film-strip-3': o=>`<div class="sk-frame sk-frame-film" style="width:${o.w}px">${[0,1,2].map(i=>`<div class="sk-frame-cell" style="height:${o.h}px">${(o.content??[])[i]??''}</div>`).join('')}</div>`,
  'browser-generic': o=>`<div class="sk-frame sk-frame-browser" style="width:${o.w}px"><div class="sk-frame-bar"><i></i><i></i><i></i><span class="sk-frame-url"></span></div><div class="sk-frame-screen" style="height:${o.h}px">${o.content??''}</div></div>`,
  'phone-generic': o=>`<div class="sk-frame sk-frame-phone" style="width:${o.w}px"><div class="sk-frame-screen" style="height:${o.h}px">${o.content??''}</div></div>`,
  'notebook-page': o=>`<div class="sk-frame sk-frame-notebook" style="width:${o.w}px;height:${o.h}px">${o.content??''}</div>`,
  'index-card': o=>`<div class="sk-frame sk-frame-card" style="width:${o.w}px;height:${o.h}px">${o.content??''}</div>`,
};
SK.frame = (id,o={})=>pick(FRAMES,'frame',bare(id,'frame'))({w:o.w??600,h:o.h??600,...o});

// ---- VOX documents -----------------------------------------------------------------------------
/* SK.doc(kind, fields, {w}) → an illustrative document (never a copy of a real outlet or app).
   Text comes from the transcript; a missing text field becomes grey placeholder lines. Every
   document carries the ILUSTRASI tag and it cannot be turned off (RD-03-43). */
const lines = (n,w)=>Array.from({length:n},(_,i)=>`<div class="sk-doc-line" style="width:${i===n-1?w*0.6:w}px"></div>`).join('');
const para = (v,n,w)=>v==null?lines(n,w):[].concat(v).map(t=>`<p>${esc(t)}</p>`).join('');
const DOCS = {
  'article': (f,w)=>`<div class="sk-doc-kicker">${esc(f.kicker??'')}</div><h1 class="sk-serif">${esc(f.headline??'')}</h1><div class="sk-doc-dek sk-serif">${esc(f.dek??'')}</div>${para(f.body,6,w-96)}`,
  'report-page': (f,w)=>`<div class="sk-doc-kicker">${esc(f.section??'')}</div><h2>${esc(f.title??'')}</h2><table class="sk-doc-table">${(f.rows??[]).map(r=>`<tr><td>${esc(r.label)}</td><td class="sk-doc-num">${esc(r.value)}</td></tr>`).join('')}</table>${para(f.body,3,w-96)}`,
  'spreadsheet': (f)=>`<table class="sk-doc-grid"><tr><th></th>${(f.columns??[]).map((c,i)=>`<th>${esc(c)}</th>`).join('')}</tr>${(f.rows??[]).map((r,i)=>`<tr class="${i===f.highlightRow?'sk-doc-hl':''}"><th>${i+1}</th>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`,
  'chat-thread': (f)=>`<div class="sk-doc-chat">${(f.messages??[]).map(m=>`<div class="sk-doc-msg ${m.side==='r'?'sk-doc-r':'sk-doc-l'}"><b>${esc(m.from??'')}</b>${esc(m.text)}</div>`).join('')}</div>`,
  'email': (f,w)=>`<div class="sk-doc-mailhead"><div><b>Dari</b> ${esc(f.from??'')}</div><div><b>Subjek</b> ${esc(f.subject??'')}</div></div>${para(f.body,5,w-96)}`,
  'social-post': (f,w)=>`<div class="sk-doc-author"><i class="sk-doc-avatar"></i><b>${esc(f.name??'Akun')}</b></div><div class="sk-doc-post">${esc(f.text??'')}</div>${f.text==null?lines(3,w-96):''}<div class="sk-doc-meta">${esc(f.meta??'')}</div>`,
  'receipt': (f)=>`<div class="sk-doc-center"><b>${esc(f.title??'STRUK')}</b></div>${(f.items??[]).map(i=>`<div class="sk-doc-row"><span>${esc(i.name)}</span><span>${esc(i.price)}</span></div>`).join('')}<div class="sk-doc-row sk-doc-total"><span>TOTAL</span><span>${esc(f.total??'')}</span></div>`,
  'invoice': (f)=>`<div class="sk-doc-row"><h2>INVOICE</h2><span>${esc(f.number??'')}</span></div><div class="sk-doc-kicker">Kepada: ${esc(f.to??'')}</div><table class="sk-doc-table">${(f.items??[]).map(i=>`<tr><td>${esc(i.name)}</td><td class="sk-doc-num">${esc(i.qty??'')}</td><td class="sk-doc-num">${esc(i.price)}</td></tr>`).join('')}</table><div class="sk-doc-row sk-doc-total"><span>Total</span><span>${esc(f.total??'')}</span></div>`,
  'search-results': (f,w)=>`<div class="sk-doc-search">${esc(f.query??'')}</div>${(f.results??[]).map(r=>`<div class="sk-doc-result"><div class="sk-doc-rtitle">${esc(r.title)}</div><div>${esc(r.snippet??'')}</div></div>`).join('')}${f.results==null?lines(6,w-96):''}`,
  'terminal': (f)=>`<div class="sk-doc-term">${(f.lines??[]).map(l=>`<div>${l.prompt?'<span class="sk-doc-prompt">$ </span>':''}${esc(l.text)}</div>`).join('')}</div>`,
};
SK.doc = (kind,f={},o={})=>{
  const w=o.w??800, body=pick(DOCS,'document',kind)(f,w);
  return `<div class="sk-doc sk-docx sk-doc-${kind}" style="width:${w}px">${body}<div class="sk-tag sk-doc-tag">Ilustrasi</div></div>`;
};
SK.DOC_KINDS = Object.keys(DOCS);
```

- [ ] **Step 3: Add the CSS for stamps, frames, and documents**

Append to `vendor/asset-lib/src/base.css`:

```css
/* stamps and badges (SK.stamp) */
.sk-stamp { position: absolute; display: flex; align-items: center; justify-content: center; }
.sk-stamp > svg { position: absolute; left: 0; top: 0; }
.sk-stamp-text { position: relative; font-family: 'Geist', system-ui, sans-serif; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }

/* CSS frames (SK.frame) */
.sk-frame { position: absolute; }
.sk-frame-polaroid { background: #fbfaf6; padding: 28px 28px 0; box-shadow: 3px 6px 0 rgba(40,25,10,.28); }
.sk-frame-tilt { transform: rotate(-4deg); }
.sk-frame-photo, .sk-frame-cell, .sk-frame-screen { position: relative; overflow: hidden; background: #d9d4c7; }
.sk-frame-photo > img, .sk-frame-cell > img, .sk-frame-screen > img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sk-frame-caption { height: 120px; display: flex; align-items: center; justify-content: center; color: #2b2118; font-size: 54px; }
.sk-frame-film { background: #151515; padding: 0 44px; display: flex; flex-direction: column; gap: 22px;
  background-image: repeating-linear-gradient(to bottom, transparent 0 18px, #f2efe8 18px 40px, transparent 40px 58px),
    repeating-linear-gradient(to bottom, transparent 0 18px, #f2efe8 18px 40px, transparent 40px 58px);
  background-size: 18px 100%, 18px 100%; background-position: 13px 0, right 13px top 0; background-repeat: repeat-y; padding-top: 22px; padding-bottom: 22px; }
.sk-frame-browser { background: #fbfaf6; border-radius: 22px; overflow: hidden; box-shadow: 0 18px 40px rgba(0,0,0,.18); }
.sk-frame-bar { height: 72px; display: flex; align-items: center; gap: 14px; padding: 0 26px; background: #e8e4da; }
.sk-frame-bar i { width: 20px; height: 20px; border-radius: 50%; background: #b7ae9c; }
.sk-frame-url { flex: 1; height: 34px; margin-left: 18px; border-radius: 17px; background: #fbfaf6; }
.sk-frame-phone { background: #161616; border-radius: 64px; padding: 26px; box-shadow: 0 18px 40px rgba(0,0,0,.22); }
.sk-frame-phone .sk-frame-screen { border-radius: 42px; background: #fbfaf6; }
.sk-frame-notebook { background-color: #fbfaf6; background-image: linear-gradient(to right, transparent 92px, rgba(220,38,38,.45) 92px 95px, transparent 95px),
  repeating-linear-gradient(to bottom, transparent 0 58px, rgba(37,99,235,.25) 58px 60px); padding: 70px 50px 40px 120px; box-sizing: border-box; }
.sk-frame-card { background-color: #fbfaf6; background-image: linear-gradient(to bottom, transparent 96px, rgba(220,38,38,.55) 96px 99px, transparent 99px),
  repeating-linear-gradient(to bottom, transparent 0 157px, rgba(37,99,235,.22) 157px 159px); padding: 36px 44px; box-sizing: border-box; box-shadow: 3px 6px 0 rgba(40,25,10,.25); }

/* VOX documents (SK.doc): .sk-doc (style-kit) gives the paper, .sk-docx the layout — never restyle .sk-doc itself (vx-01, vx-04 use it) */
.sk-docx { padding: 48px; box-sizing: border-box; font-family: 'Geist', system-ui, sans-serif; font-size: 30px; line-height: 1.35; box-shadow: 3px 6px 0 rgba(40,25,10,.28); }
.sk-docx h1 { font-size: 72px; line-height: 1.02; margin: 12px 0 18px; font-weight: 600; }
.sk-docx h2 { font-size: 46px; margin: 0 0 18px; }
.sk-docx p { margin: 0 0 14px; }
.sk-doc-kicker { font-size: 24px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8c8577; }
.sk-doc-dek { font-size: 36px; color: #3f3a33; margin-bottom: 24px; }
.sk-doc-table, .sk-doc-grid { width: 100%; border-collapse: collapse; margin: 10px 0 20px; }
.sk-doc-table td { padding: 10px 0; border-bottom: 2px solid #e3ddd0; }
.sk-doc-num { text-align: right; font-feature-settings: "tnum" 1; }
.sk-doc-grid th, .sk-doc-grid td { border: 2px solid #d9d3c6; padding: 8px 12px; font-size: 26px; }
.sk-doc-grid th { background: #efeae0; color: #6b665c; }
.sk-doc-grid .sk-doc-hl td { background: rgba(255,225,77,.55); }
.sk-doc-chat { display: flex; flex-direction: column; gap: 16px; }
.sk-doc-msg { max-width: 78%; padding: 16px 22px; border-radius: 26px; background: #e8e4da; }
.sk-doc-msg b { display: block; font-size: 22px; color: #6b665c; }
.sk-doc-l { align-self: flex-start; border-bottom-left-radius: 6px; }
.sk-doc-r { align-self: flex-end; border-bottom-right-radius: 6px; background: #d8ecd3; }
.sk-doc-mailhead { border-bottom: 2px solid #e3ddd0; padding-bottom: 16px; margin-bottom: 22px; }
.sk-doc-author { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
.sk-doc-avatar { width: 64px; height: 64px; border-radius: 50%; background: #c9c1b1; display: inline-block; }
.sk-doc-post { font-size: 36px; margin-bottom: 16px; }
.sk-doc-meta { color: #8c8577; font-size: 24px; }
.sk-doc-center { text-align: center; margin-bottom: 18px; }
.sk-doc-row { display: flex; justify-content: space-between; gap: 24px; padding: 6px 0; }
.sk-doc-total { border-top: 3px dashed #b9b09e; margin-top: 12px; padding-top: 14px; font-weight: 800; }
.sk-doc-receipt { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 28px; }
.sk-doc-search { border: 3px solid #d9d3c6; border-radius: 40px; padding: 14px 28px; margin-bottom: 24px; }
.sk-doc-result { margin-bottom: 22px; }
.sk-doc-rtitle { color: #2f4f9f; font-size: 34px; }
.sk-doc-terminal { background: #141414; color: #d7ffd9; }
.sk-doc-term { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 28px; }
.sk-doc-prompt { color: #39ff88; }
.sk-doc-tag { right: 24px; top: -22px; }
```

- [ ] **Step 4: Add `docs.json`, the frame items, and three sample stroke SVGs**

`vendor/asset-lib/src/docs.json`:

```json
[
  {"kind":"article","tags":["media"],"styles":["vox","mix-media"]},
  {"kind":"report-page","tags":["data","kerja"],"styles":["vox","mix-media"]},
  {"kind":"spreadsheet","tags":["data","kerja"],"styles":["vox","mix-media"]},
  {"kind":"chat-thread","tags":["chat"],"styles":["vox","mix-media"]},
  {"kind":"email","tags":["chat","kerja"],"styles":["vox","mix-media"]},
  {"kind":"social-post","tags":["media","chat"],"styles":["vox","mix-media"]},
  {"kind":"receipt","tags":["uang","umkm"],"styles":["vox","mix-media"]},
  {"kind":"invoice","tags":["uang","bisnis"],"styles":["vox","mix-media"]},
  {"kind":"search-results","tags":["ide","media"],"styles":["vox","mix-media"]},
  {"kind":"terminal","tags":["ai","kerja"],"styles":["vox","mix-media"]}
]
```

Replace the contents of `vendor/asset-lib/src/items.json` with:

```json
[
  {"id":"frame.polaroid","kind":"frame","inline":"SK.frame('polaroid', …)","styles":["mix-media","parallax","stop-motion"],"tags":["media","hidup"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.polaroid-tilt","kind":"frame","inline":"SK.frame('polaroid-tilt', …)","styles":["mix-media","parallax","stop-motion"],"tags":["media","hidup"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.film-strip-3","kind":"frame","inline":"SK.frame('film-strip-3', …)","styles":["mix-media","parallax"],"tags":["media"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.browser-generic","kind":"frame","inline":"SK.frame('browser-generic', …)","styles":["vox","mix-media","motion-graphic"],"tags":["perangkat","media"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.phone-generic","kind":"frame","inline":"SK.frame('phone-generic', …)","styles":["vox","mix-media","motion-graphic"],"tags":["perangkat","chat"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.notebook-page","kind":"frame","inline":"SK.frame('notebook-page', …)","styles":["whiteboard","stop-motion","mix-media"],"tags":["kertas","ide"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.index-card","kind":"frame","inline":"SK.frame('index-card', …)","styles":["stop-motion","vox","mix-media"],"tags":["kertas","ide"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.torn-top","kind":"frame","inline":"SK.tornFrame('torn-top', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"t","seed":3,"amp":8,"step":14}},
  {"id":"frame.torn-bottom","kind":"frame","inline":"SK.tornFrame('torn-bottom', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"b","seed":5,"amp":8,"step":14}},
  {"id":"frame.torn-left","kind":"frame","inline":"SK.tornFrame('torn-left', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"l","seed":7,"amp":8,"step":14}},
  {"id":"frame.torn-right","kind":"frame","inline":"SK.tornFrame('torn-right', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"r","seed":9,"amp":8,"step":14}},
  {"id":"frame.torn-all","kind":"frame","inline":"SK.tornFrame('torn-all', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"trbl","seed":11,"amp":8,"step":14}},
  {"id":"frame.torn-rough","kind":"frame","inline":"SK.tornFrame('torn-rough', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"trbl","seed":13,"amp":14,"step":22}}
]
```

`vendor/asset-lib/src/frames/stamp-ilustrasi.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" data-tags="status,media" data-styles="vox,mix-media" data-text="ILUSTRASI">
  <path d="M18 14Q160 8 302 14Q308 60 302 106Q160 112 18 106Q12 60 18 14Z"/>
  <path d="M30 26Q160 21 290 26Q295 60 290 94Q160 99 30 94Q25 60 30 26Z"/>
</svg>
```

`vendor/asset-lib/src/frames/swash-1.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" data-tags="arah" data-styles="broll-text,whiteboard,mix-media">
  <path d="M14 54C90 34 200 30 300 38C340 42 372 46 388 30"/>
</svg>
```

`vendor/asset-lib/src/marks/red-circle.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 140" data-tags="status" data-styles="vox,whiteboard">
  <path d="M58 28C112 8 226 12 270 44C300 72 262 118 180 126C98 134 26 116 18 80C12 52 46 34 96 26"/>
</svg>
```

- [ ] **Step 5: Build, test, sheets, review**

Run:
```bash
npm run asset-lib -- build && git add -A vendor/asset-lib && npm run test:asset-lib
npm run asset-lib -- sheets && git add -A docs/agents/references/asset-catalog && npm run test:asset-lib
```
Expected: `ℹ pass 23` after `sheets` (before it, 22 + the stale sheet test). Review `frame.webp` (polaroid, tilt, film strip, browser, phone, notebook, index card, six torn masks on grey, the ILUSTRASI stamp, the swash as a single stroke, the red circle) and `doc-1.webp`/`doc-2.webp` (ten templates, each with the yellow ILUSTRASI tag, sample text only).

- [ ] **Step 6: Prove pixel identity and commit**

Run the Task 5 Step 6 comparison loop again (the new CSS must not touch `.sk-doc`). Expected: `checked`, no `DIFF`.

```bash
git add vendor/asset-lib scripts/asset-lib.test.mjs docs/agents/references/asset-catalog
git commit -m "feat: strokes, stamps, CSS frames, torn masks, and VOX document templates

No docs update needed here: the style references and workflow docs are updated together in Task 12.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Maps and cities

**Files:**
- Create: `vendor/asset-lib/src/maps.json`
- Create (fetched): `vendor/asset-lib/maps/{world,sea,id-provinces,java}.svg`, `vendor/asset-lib/maps/cities.json`
- Modify: `vendor/asset-lib/src/runtime.js`, `scripts/asset-lib.test.mjs`, `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: `mapSvg` (Task 2), `fetchMaps` (Task 3).
- Produces: `SK.MAPS[id] = {src, w, h, lon0, lat0, k}` for `indonesia` (the paper-pack map, unchanged frame), `world`, `sea`, `id-provinces`, `java`; `SK.geo(lat, lon, map = 'indonesia')`; `SK.CITIES` gains 37 cities without changing the eight old ones. Provinces/countries are `<path id="<slug>">` inside `<g id="provinces|countries">`, so a clip can colour one region.

- [ ] **Step 1: Write the failing test**

Append to `scripts/asset-lib.test.mjs`:

```js
// ---- maps --------------------------------------------------------------------------------------------
test('SK.geo keeps the old Indonesia frame, adds the library maps, and keeps the old cities', () => {
  const SK = load();
  assert.deepEqual({ ...SK.geo(-6.2088, 106.8456) }, { x: (106.8456 - 94) * 50, y: (7.5 + 6.2088) * 50 });
  assert.deepEqual({ ...SK.geo(0, 0, 'world') }, { x: 180 * 6, y: 84 * 6 });
  assert.deepEqual([...SK.CITIES.jakarta], [-6.2088, 106.8456]);
  assert.ok(SK.CITIES.pontianak && SK.CITIES.bangkok, 'new cities are added');
  assert.throws(() => SK.geo(0, 0, 'mars'), /unknown map "mars"/);
});
```

Run: `npm run test:asset-lib`
Expected: FAIL — the world lookup returns the Indonesia frame or throws `unknown map`.

- [ ] **Step 2: Add the runtime section**

In `vendor/asset-lib/src/runtime.js` insert before the final `})();`:

```js
// ---- maps and places ---------------------------------------------------------------------------
/* SK.MAPS: every library map ({src, w, h, lon0, lat0, k}, equirectangular). SK.geo(lat, lon, map)
   keeps its old two-argument form for the Indonesia map. New cities are added to SK.CITIES without
   touching the eight old ones. */
SK.MAPS = SK.LIB.maps;
SK.geo = (lat,lon,map='indonesia')=>{
  const m=pick(SK.MAPS,'map',bare(map,'map'));
  return {x:(lon-m.lon0)*m.k, y:(m.lat0-lat)*m.k};
};
for(const [k,v] of Object.entries(SK.LIB.cities)) if(!has(SK.CITIES,k)) SK.CITIES[k]=v;
```

- [ ] **Step 3: Write `vendor/asset-lib/src/maps.json` and fetch**

```json
[
  {"id": "indonesia", "file": "vendor/paper-pack/map-indonesia.svg", "source": "Natural Earth 1:50m Admin 0 (paper pack)",
   "box": {"lon0": 94, "lon1": 142, "lat0": 7.5, "lat1": -11.5, "k": 50}},
  {"id": "world", "source": "Natural Earth 1:110m Admin 0 – Countries v5.1.2 — https://www.naturalearthdata.com/about/terms-of-use/",
   "changes": "equirectangular, 6 px/deg, Douglas–Peucker 0.15°, rings < 0.5 deg² dropped, one <path id> per country",
   "box": {"lon0": -180, "lon1": 180, "lat0": 84, "lat1": -60, "k": 6, "tol": 0.15, "minArea": 0.5},
   "layers": [{"id": "countries", "dataset": "ne_110m_admin_0_countries", "each": true, "fill": "#d8d2c4", "stroke": "#f4efe6", "strokeWidth": 1}]},
  {"id": "sea", "source": "Natural Earth 1:50m Admin 0 – Countries v5.1.2 — https://www.naturalearthdata.com/about/terms-of-use/",
   "changes": "Southeast Asia, equirectangular, 36 px/deg, Douglas–Peucker 0.03°, rings < 0.01 deg² dropped, one <path id> per country",
   "box": {"lon0": 90, "lon1": 145, "lat0": 25, "lat1": -12, "k": 36, "tol": 0.03, "minArea": 0.01},
   "layers": [{"id": "countries", "dataset": "ne_50m_admin_0_countries", "each": true, "fill": "#d8d2c4", "stroke": "#f4efe6", "strokeWidth": 2}]},
  {"id": "id-provinces", "source": "Natural Earth 1:10m Admin 1 v5.1.2 (33 provinces, before the Kalimantan Utara and Papua splits) + 1:50m Admin 0 — https://www.naturalearthdata.com/about/terms-of-use/",
   "changes": "same frame as map.indonesia (50 px/deg), Douglas–Peucker 0.025°, rings < 0.004 deg² dropped, one <path id> per province",
   "box": {"lon0": 94, "lon1": 142, "lat0": 7.5, "lat1": -11.5, "k": 50, "tol": 0.025, "minArea": 0.004},
   "layers": [{"id": "neighbors", "dataset": "ne_50m_admin_0_countries", "exclude": ["Indonesia"], "fill": "#d8d2c4"},
              {"id": "provinces", "dataset": "ne_10m_admin_1_states_provinces", "admin": "Indonesia", "each": true, "fill": "#b9ad96", "stroke": "#efe9dc", "strokeWidth": 2}]},
  {"id": "java", "source": "Natural Earth 1:10m Admin 1 v5.1.2 — https://www.naturalearthdata.com/about/terms-of-use/",
   "changes": "Java + Bali, equirectangular, 180 px/deg, Douglas–Peucker 0.006°, rings < 0.0005 deg² dropped, one <path id> per province",
   "box": {"lon0": 105, "lon1": 116, "lat0": -5.5, "lat1": -9, "k": 180, "tol": 0.006, "minArea": 0.0005},
   "layers": [{"id": "provinces", "dataset": "ne_10m_admin_1_states_provinces", "admin": "Indonesia", "each": true, "fill": "#b9ad96", "stroke": "#efe9dc", "strokeWidth": 3}]}
]
```

Run: `npm run asset-lib -- fetch maps && npm run asset-lib -- build && git add -A vendor/asset-lib && npm run test:asset-lib`
Expected: `fetched maps: { maps: 4, cities: 37 }`; `ℹ pass 23`, `ℹ fail 1` (stale sheets until Step 5, then 24). The GeoJSON cache lands in `$TMPDIR/natural-earth-5.1.2` (the 10m admin-1 file is 40 MB; it is never committed).

- [ ] **Step 4: Prove pixel identity (vx-03 and px-01 call `SK.geo`)**

Run the comparison loop from Task 5 Step 6. Expected: `checked`, no `DIFF`.

- [ ] **Step 5: Sheets, review, notices, commit**

Run `npm run asset-lib -- sheets && git add -A docs/agents/references/asset-catalog && npm run test:asset-lib`; review `map.webp` (five maps; provinces outlined on `id-provinces` and `java`; no stray polygons).

Append to the `## asset-lib` list in `THIRD_PARTY_NOTICES.md`:

```md
- Maps and cities (`vendor/asset-lib/maps/`): derived from Natural Earth
  v5.1.2 (https://www.naturalearthdata.com) 1:110m/1:50m Admin 0, 1:10m Admin 1,
  and 1:10m populated places — public domain. The Admin 1 data has 33
  Indonesian provinces (before the Kalimantan Utara and Papua splits).
```

```bash
git add vendor/asset-lib scripts/asset-lib.test.mjs docs/agents/references/asset-catalog THIRD_PARTY_NOTICES.md
git commit -m "feat: world, Southeast Asia, province, and Java maps with 37 cities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Textures and the paper-pack entries

**Files:**
- Modify: `vendor/asset-lib/src/items.json`, `vendor/asset-lib/src/base.css`, `THIRD_PARTY_NOTICES.md`
- Create (fetched/generated): `vendor/asset-lib/textures/{cork,cardboard,paper-tan,concrete-light,linen,wood-desk,plaster,blackboard}.jpg`, `textures/{riso,film}-tile.png`

**Interfaces:**
- Produces: `.sk-tex-<name>` for the eight bitmaps (background classes, 1080×1920), `.sk-tex-graph`, `.sk-tex-dots`, `.sk-tex-whiteboard` (procedural backgrounds), `.sk-tex-halftone`, `.sk-tex-riso`, `.sk-tex-film` (full-frame overlay divs; move `.sk-tex-film` with `SK.grain`), `.sk-haze` (the grade haze layer). Catalog entries for the paper-pack textures, tape, pin, clip, sticky, hands (legacy, `use` = their existing class).

- [ ] **Step 1: Add the texture items and the paper-pack entries**

Replace the contents of `vendor/asset-lib/src/items.json` with (the Task 6 frame entries first, then the paper-pack entries, the CSS and procedural textures, the two baked overlay tiles, and the eight ambientCG textures; one entry per line):

```json
[
  {"id":"texture.paper-white","kind":"texture","file":"vendor/paper-pack/paper-white.jpg","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"CC0 1.0","legacy":true,"use":".sk-paper-white"},
  {"id":"texture.paper-cream","kind":"texture","file":"vendor/paper-pack/paper-cream.jpg","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"CC0 1.0","legacy":true,"use":".sk-paper-cream"},
  {"id":"texture.paper-grey","kind":"texture","file":"vendor/paper-pack/paper-grey.jpg","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"CC0 1.0","legacy":true,"use":".sk-paper-grey"},
  {"id":"texture.paper-crumpled","kind":"texture","file":"vendor/paper-pack/paper-crumpled.jpg","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"CC0 1.0","legacy":true,"use":".sk-paper-crumpled"},
  {"id":"texture.kraft","kind":"texture","file":"vendor/paper-pack/kraft.jpg","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"CC0 1.0","legacy":true,"use":".sk-kraft"},
  {"id":"texture.kraft-ribbed","kind":"texture","file":"vendor/paper-pack/kraft-ribbed.jpg","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"CC0 1.0","legacy":true,"use":".sk-kraft-ribbed"},
  {"id":"texture.kraft-dark","kind":"texture","file":"vendor/paper-pack/kraft-dark.jpg","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"CC0 1.0","legacy":true,"use":".sk-kraft-dark"},
  {"id":"paper.tape-a","kind":"paper","file":"vendor/paper-pack/tape-a.png","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"project asset (MIT)","legacy":true,"use":".sk-tape-a"},
  {"id":"paper.tape-b","kind":"paper","file":"vendor/paper-pack/tape-b.png","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"project asset (MIT)","legacy":true,"use":".sk-tape-b"},
  {"id":"paper.pin","kind":"paper","file":"vendor/paper-pack/pin.png","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas","tempat"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"project asset (MIT)","legacy":true,"use":".sk-pin"},
  {"id":"paper.clip","kind":"paper","file":"vendor/paper-pack/clip.png","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"project asset (MIT)","legacy":true,"use":".sk-clip"},
  {"id":"paper.sticky","kind":"paper","file":"vendor/paper-pack/sticky.png","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas","ide"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"project asset (MIT)","legacy":true,"use":".sk-sticky"},
  {"id":"hand.write","kind":"hand","file":"vendor/paper-pack/hand-write.png","styles":["whiteboard"],"tags":["orang"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"project asset (MIT)","legacy":true,"anchor":{"pose":"write","w":664,"h":720,"tx":8,"ty":711}},
  {"id":"hand.point","kind":"hand","file":"vendor/paper-pack/hand-point.png","styles":["whiteboard"],"tags":["orang","arah"],"source":"paper pack — vendor/paper-pack/LICENSES.md","license":"project asset (MIT)","legacy":true,"anchor":{"pose":"point","w":697,"h":720,"tx":10,"ty":705}},
  {"id":"texture.lined","kind":"texture","inline":".sk-lined","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack (CSS over paper-white/paper-grey)","license":"MIT"},
  {"id":"texture.grid","kind":"texture","inline":".sk-grid","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack (CSS over paper-white/paper-grey)","license":"MIT"},
  {"id":"texture.newsprint","kind":"texture","inline":".sk-newsprint","styles":["stop-motion","mix-media","vox","parallax"],"tags":["kertas"],"source":"paper pack (CSS over paper-white/paper-grey)","license":"MIT"},
  {"id":"texture.graph","kind":"texture","inline":".sk-tex-graph","styles":["whiteboard","vox","stop-motion"],"tags":["kertas"],"source":"project (procedural CSS/SVG)","license":"MIT"},
  {"id":"texture.dots","kind":"texture","inline":".sk-tex-dots","styles":["whiteboard","motion-graphic"],"tags":["kertas"],"source":"project (procedural CSS/SVG)","license":"MIT"},
  {"id":"texture.whiteboard","kind":"texture","inline":".sk-tex-whiteboard","styles":["whiteboard"],"tags":["kertas"],"source":"project (procedural CSS/SVG)","license":"MIT"},
  {"id":"texture.halftone","kind":"texture","inline":".sk-tex-halftone","styles":["mix-media","broll-text"],"tags":["kertas"],"source":"project (procedural CSS/SVG)","license":"MIT"},
  {"id":"texture.riso","kind":"texture","styles":["mix-media","broll-text"],"tags":["kertas"],"source":"project (ffmpeg `noise` filter, fixed seed — `makeGrainTiles` in scripts/lib/asset-lib-fetch.mjs)","license":"MIT","file":"vendor/asset-lib/textures/riso-tile.png","use":".sk-tex-riso","overlay":true,"changes":"256×256 tile, pink speckles on alpha"},
  {"id":"texture.film","kind":"texture","styles":["parallax","stop-motion","mix-media"],"tags":["kertas"],"source":"project (ffmpeg `noise` filter, fixed seed — `makeGrainTiles` in scripts/lib/asset-lib-fetch.mjs)","license":"MIT","file":"vendor/asset-lib/textures/film-tile.png","use":".sk-tex-film","overlay":true,"changes":"256×256 tile, grey grain"},
  {"id":"frame.polaroid","kind":"frame","inline":"SK.frame('polaroid', …)","styles":["mix-media","parallax","stop-motion"],"tags":["media","hidup"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.polaroid-tilt","kind":"frame","inline":"SK.frame('polaroid-tilt', …)","styles":["mix-media","parallax","stop-motion"],"tags":["media","hidup"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.film-strip-3","kind":"frame","inline":"SK.frame('film-strip-3', …)","styles":["mix-media","parallax"],"tags":["media"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.browser-generic","kind":"frame","inline":"SK.frame('browser-generic', …)","styles":["vox","mix-media","motion-graphic"],"tags":["perangkat","media"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.phone-generic","kind":"frame","inline":"SK.frame('phone-generic', …)","styles":["vox","mix-media","motion-graphic"],"tags":["perangkat","chat"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.notebook-page","kind":"frame","inline":"SK.frame('notebook-page', …)","styles":["whiteboard","stop-motion","mix-media"],"tags":["kertas","ide"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.index-card","kind":"frame","inline":"SK.frame('index-card', …)","styles":["stop-motion","vox","mix-media"],"tags":["kertas","ide"],"source":"project (CSS)","license":"MIT"},
  {"id":"frame.torn-top","kind":"frame","inline":"SK.tornFrame('torn-top', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"t","seed":3,"amp":8,"step":14}},
  {"id":"frame.torn-bottom","kind":"frame","inline":"SK.tornFrame('torn-bottom', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"b","seed":5,"amp":8,"step":14}},
  {"id":"frame.torn-left","kind":"frame","inline":"SK.tornFrame('torn-left', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"l","seed":7,"amp":8,"step":14}},
  {"id":"frame.torn-right","kind":"frame","inline":"SK.tornFrame('torn-right', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"r","seed":9,"amp":8,"step":14}},
  {"id":"frame.torn-all","kind":"frame","inline":"SK.tornFrame('torn-all', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"trbl","seed":11,"amp":8,"step":14}},
  {"id":"frame.torn-rough","kind":"frame","inline":"SK.tornFrame('torn-rough', w, h)","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"project (SK.torn preset)","license":"MIT","torn":{"edges":"trbl","seed":13,"amp":14,"step":22}},
  {"id":"texture.cork","kind":"texture","file":"vendor/asset-lib/textures/cork.jpg","styles":["vox","stop-motion","mix-media"],"tags":["kertas"],"source":"ambientCG Cork004, 2K-JPG Color map — https://ambientcg.com/view?id=Cork004","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB","fetch":{"ambientcg":"Cork004"}},
  {"id":"texture.cardboard","kind":"texture","file":"vendor/asset-lib/textures/cardboard.jpg","styles":["stop-motion","mix-media"],"tags":["kertas"],"source":"ambientCG Cardboard004, 2K-JPG Color map — https://ambientcg.com/view?id=Cardboard004","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB","fetch":{"ambientcg":"Cardboard004"}},
  {"id":"texture.paper-tan","kind":"texture","file":"vendor/asset-lib/textures/paper-tan.jpg","styles":["vox","stop-motion","mix-media"],"tags":["kertas"],"source":"ambientCG Paper005, 2K-JPG Color map — https://ambientcg.com/view?id=Paper005","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB","fetch":{"ambientcg":"Paper005"}},
  {"id":"texture.concrete-light","kind":"texture","file":"vendor/asset-lib/textures/concrete-light.jpg","styles":["parallax","mix-media","broll-text"],"tags":["kertas"],"source":"ambientCG Concrete034, 2K-JPG Color map — https://ambientcg.com/view?id=Concrete034","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB","fetch":{"ambientcg":"Concrete034"}},
  {"id":"texture.linen","kind":"texture","file":"vendor/asset-lib/textures/linen.jpg","styles":["mix-media","vox","parallax"],"tags":["kertas"],"source":"ambientCG Fabric036, 2K-JPG Color map — https://ambientcg.com/view?id=Fabric036","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB","fetch":{"ambientcg":"Fabric036"}},
  {"id":"texture.wood-desk","kind":"texture","file":"vendor/asset-lib/textures/wood-desk.jpg","styles":["stop-motion","mix-media","parallax","vox"],"tags":["kertas"],"source":"ambientCG Wood049, 2K-JPG Color map — https://ambientcg.com/view?id=Wood049","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB","fetch":{"ambientcg":"Wood049"}},
  {"id":"texture.plaster","kind":"texture","file":"vendor/asset-lib/textures/plaster.jpg","styles":["parallax","mix-media","broll-text"],"tags":["kertas"],"source":"ambientCG Plaster002, 2K-JPG Color map — https://ambientcg.com/view?id=Plaster002","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB","fetch":{"ambientcg":"Plaster002"}},
  {"id":"texture.blackboard","kind":"texture","file":"vendor/asset-lib/textures/blackboard.jpg","styles":["whiteboard"],"tags":["kertas"],"source":"ambientCG Concrete031, 2K-JPG Color map — https://ambientcg.com/view?id=Concrete031","license":"CC0 1.0","changes":"centre crop 9:16, 1080×1920, JPEG ≤ 400 KB, slate tint (`colorchannelmixer=rr=.35:gg=.5:bb=.42`)","fetch":{"ambientcg":"Concrete031","filter":"colorchannelmixer=rr=.35:gg=.5:bb=.42"}}
]
```

- [ ] **Step 2: Add the texture CSS**

In `vendor/asset-lib/src/base.css` insert before `/* stamps and badges (SK.stamp) */`:

```css
/* procedural backgrounds (add to the stage or a piece) */
.sk-tex-graph {
  background-image: repeating-linear-gradient(to right, rgba(37,99,235,.28) 0 2px, transparent 2px 96px),
    repeating-linear-gradient(to bottom, rgba(37,99,235,.28) 0 2px, transparent 2px 96px),
    repeating-linear-gradient(to right, rgba(37,99,235,.12) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(to bottom, rgba(37,99,235,.12) 0 1px, transparent 1px 24px);
}
.sk-tex-dots { background-image: radial-gradient(circle, rgba(28,25,23,.22) 2.2px, transparent 2.6px); background-size: 40px 40px; }
/* whiteboard with faint ghosts of erased marker */
.sk-tex-whiteboard {
  background-image: radial-gradient(ellipse 420px 90px at 300px 520px, rgba(120,130,150,.07), transparent 70%),
    radial-gradient(ellipse 360px 70px at 760px 1180px, rgba(120,130,150,.06), transparent 70%),
    radial-gradient(ellipse 500px 110px at 520px 1560px, rgba(120,130,150,.05), transparent 70%),
    linear-gradient(160deg, #fdfdfb, #f1f2ef);
}
/* overlays: a full-frame div over the stage (like .sk-grain); move .sk-tex-film with SK.grain. Riso and film
   are baked PNG tiles — SVG noise filters in data-URI backgrounds render blank in HyperFrames' Chrome */
.sk-tex-halftone, .sk-tex-riso, .sk-tex-film, .sk-haze { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; pointer-events: none; }
.sk-tex-halftone { background-image: radial-gradient(circle, rgba(0,0,0,.16) 1.6px, transparent 2px); background-size: 9px 9px; mix-blend-mode: multiply; }
.sk-tex-riso { mix-blend-mode: multiply; opacity: .55; background-image: url(textures/riso-tile.png); background-size: 256px 256px; }
.sk-tex-film { mix-blend-mode: overlay; opacity: .45; background-image: url(textures/film-tile.png); background-size: 256px 256px; }
.sk-haze { opacity: 0; }
```

- [ ] **Step 3: Fetch, build, test**

Run:
```bash
npm run asset-lib -- fetch textures && npm run asset-lib -- build && git add -A vendor/asset-lib && npm run test:asset-lib
```
Expected: `fetched textures: 10` (eight ambientCG JPGs, each ≤ 400 KB, plus the two baked tiles); tests pass. Running `makeGrainTiles` twice gives byte-identical tiles (`cmp` them if in doubt).

- [ ] **Step 4: Sheets and review**

Run `npm run asset-lib -- sheets && git add -A docs/agents/references/asset-catalog && npm run test:asset-lib`; review `texture-1.webp`/`texture-2.webp`: every tile shows its texture — dots and halftone as dot grids, riso as pink speckles, film as grain on kraft brown, blackboard as dark slate green. A flat or empty tile is a bug.

- [ ] **Step 5: Notices and commit**

Append to the `## asset-lib` list in `THIRD_PARTY_NOTICES.md`:

```md
- Textures (`vendor/asset-lib/textures/*.jpg`): ambientCG (https://ambientcg.com),
  Creative Commons CC0 1.0 Universal (Cork004, Cardboard004, Paper005,
  Concrete034, Fabric036, Wood049, Plaster002; the blackboard is Concrete031
  tinted). The riso and film tiles are generated by this project.
```

```bash
git add vendor/asset-lib docs/agents/references/asset-catalog THIRD_PARTY_NOTICES.md
git commit -m "feat: CC0 textures, procedural and overlay textures, and paper-pack catalog entries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Doodles, marks, stamps, and swashes (hand-authored SVG)

**Files:**
- Create: `vendor/asset-lib/src/doodles/*.svg` (50), `vendor/asset-lib/src/marks/*.svg` (7 more), `vendor/asset-lib/src/frames/*.svg` (7 stamps/badges + 3 swashes)

**Interfaces:**
- Consumes: the stroke SVG contract from Task 6.
- Produces: catalog ids `doodle.<name>`, `mark.<name>`, `frame.<name>` exactly as listed below (Task 12's `## Kit` sections reference them).

The drawing contract (every file):

- `viewBox="0 0 200 200"` for doodles; marks and stamps use the viewBox given below.
- One `<path d="…">` per pen stroke, in the order a hand would draw them; 1–8 strokes; no fills, no `<circle>`/`<rect>` (paths only), no transforms.
- Hand-drawn, not ruler-straight: long lines bow 2–4 units (`Q`/`C`), closed shapes overshoot their start by 8–15° instead of closing exactly, ends stop a little past the target.
- Rendered at 240 px with a 7 px pen (≈ 5.8 viewBox units): keep ≥ 12 units between parallel strokes so they do not merge; nothing smaller than 16 units.
- Stick figures: head 32–40 units wide, body ≈ 65 units, limbs as single strokes, a face only when the pose needs it (two dots + one mouth stroke).
- `data-tags` from the vocabulary, `data-styles` from the style list (at least `whiteboard`).
- It must read as its name at 120 px with no label.

Four worked doodles (copy these exactly):

`vendor/asset-lib/src/doodles/stand.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" data-tags="orang" data-styles="whiteboard,mix-media">
  <path d="M113 31C106 20 88 20 82 32C76 45 84 59 99 60C113 60 121 48 117 35"/>
  <path d="M100 62Q97 95 100 128"/>
  <path d="M71 93Q86 83 100 84Q115 85 130 94"/>
  <path d="M99 127Q90 150 79 177"/>
  <path d="M101 127Q111 150 122 176"/>
</svg>
```

`vendor/asset-lib/src/doodles/arrow-curve.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" data-tags="arah" data-styles="whiteboard,mix-media,broll-text">
  <path d="M24 152C40 90 100 52 166 60"/>
  <path d="M141 40Q156 50 168 60Q155 70 141 82"/>
</svg>
```

`vendor/asset-lib/src/doodles/burst.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" data-tags="ide,status" data-styles="whiteboard,mix-media,broll-text">
  <path d="M100 30Q102 46 100 62"/>
  <path d="M146 50Q138 62 128 73"/>
  <path d="M170 100Q154 102 138 100"/>
  <path d="M148 150Q137 138 128 127"/>
  <path d="M100 170Q98 154 100 138"/>
  <path d="M52 150Q62 138 72 127"/>
  <path d="M30 100Q46 98 62 100"/>
  <path d="M54 50Q63 62 72 73"/>
</svg>
```

`vendor/asset-lib/src/doodles/speech-round.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" data-tags="chat" data-styles="whiteboard,mix-media,stop-motion">
  <path d="M62 146C28 132 20 92 38 64C58 34 120 26 156 48C186 68 184 112 152 132C132 144 104 148 82 144L50 172L62 146"/>
</svg>
```

- [ ] **Step 1: Draw the stick figures (`data-tags="orang"`)**

wave (one arm up, bent), point (arm straight out to the right), think (hand at chin, head tilted), shrug (both forearms up, palms out), celebrate (both arms up in a V), sit-laptop (sitting, a laptop on the lap: two strokes), walk (legs mid-stride, arms swinging), carry-box (arms forward holding a box: box as one closed stroke), facepalm (one hand on the face). Start from `stand.svg`'s head and body.

- [ ] **Step 2: Draw arrows and connectors (`data-tags="arah"`)**

arrow-loop (a loop-the-loop then a head), arrow-zigzag (three segments + head), arrow-double (heads at both ends), arrow-bounce (a hop over an obstacle), arrow-down-curl (curls down to a head), connector-elbow (right-angle connector, no head), connector-dashed (5–7 short dashes as separate strokes + head), bracket-curly (`{` spanning 160 units), bracket-square (`[`), cycle-arrows (two curved arrows chasing each other), fork-split (one stem into two heads). Heads follow `arrow-curve.svg`: two short strokes, 20–26 units.

- [ ] **Step 3: Draw accents, bubbles, and objects**

Accents (`data-tags` as noted): star-hand (`status`), sparkle-hand (`ide`), spiral (`ide`), cloud-thought (`ide`), lightbulb-hand (`ide`), heart-hand (`hidup`), exclaim (`status`), question (`status`), lightning-hand (`benda`). Bubbles (`chat`): speech-rect, speech-shout (jagged outline), thought (cloud + two small circles as strokes), whisper (dashed outline, 8–10 dashes), double-bubble (two overlapping speech outlines). Marks-as-doodles (`status`): circle-loose, circle-double, underline-wave, underline-double, tick-hand, cross-hand, box-hand, strike-scribble. Objects: laptop-hand (`perangkat`), phone-hand (`perangkat`), money-hand (`uang`, a banknote rectangle with "Rp"-free centre circle), chart-hand (`data`, axes + a rising line).

That makes 50 doodles: 10 figures, 12 arrows/connectors, 10 accents (with `burst`), 6 bubbles (with `speech-round`), 8 marks, 4 objects.

- [ ] **Step 4: Draw the red-pen marks (`vendor/asset-lib/src/marks/`, `data-styles="vox,whiteboard"`)**

In addition to `red-circle.svg`: red-underline (`viewBox="0 0 400 60"`, one wavy stroke), red-arrow (`0 0 200 200`, curved shaft + head), red-check (`0 0 200 200`), red-cross (`0 0 200 200`, two strokes), red-bracket (`0 0 80 300`, a tall `[`), red-exclaim (`0 0 80 200`, stroke + dot as a tiny closed stroke), red-question (`0 0 140 200`).

- [ ] **Step 5: Draw stamps, badges, and swashes (`vendor/asset-lib/src/frames/`)**

Stamps (fixed words, `viewBox="0 0 320 120"`, a double hand-inked border like `stamp-ilustrasi.svg`, `data-text` set): stamp-contoh (`CONTOH`), stamp-baru (`BARU`), stamp-hemat (`HEMAT`). Badges (no `data-text`; the clip passes the transcript word): badge-circle (`0 0 200 200`, two concentric loose circles), badge-ribbon (`0 0 320 140`, banner with folded ends), badge-starburst (`0 0 200 200`, 12-point jagged ring), label-tag (`0 0 300 120`, luggage tag with a hole). Swashes (`viewBox="0 0 400 80"`, `data-styles="broll-text,whiteboard,mix-media"`): swash-2 (double stroke), swash-3 (loop at the end), swash-4 (rising flick).

- [ ] **Step 6: Build, test, sheets, and review every drawing**

Run:
```bash
npm run asset-lib -- build && git add -A vendor/asset-lib && npm run test:asset-lib
npm run asset-lib -- sheets && git add -A docs/agents/references/asset-catalog && npm run test:asset-lib
node -e "const c=require('./vendor/asset-lib/catalog.json');const n=k=>c.filter(e=>e.id.startsWith(k)).length;console.log('doodles',n('doodle.'),'marks',n('mark.'),'frames',n('frame.'))"
```
Expected: tests pass; `doodles 50 marks 8 frames 25`. Open `doodle.webp` (and `doodle-2.webp` if it paginates) and `frame.webp`: redraw any doodle that does not read as its name at thumbnail size, merges strokes, or looks ruler-drawn. Draw one on in a quick check: the `doodle-rough` page shows `SK.rough` on icons — doodles are already hand-drawn and must not need it.

- [ ] **Step 7: Commit**

```bash
git add vendor/asset-lib docs/agents/references/asset-catalog
git commit -m "feat: 50 whiteboard doodles, red-pen marks, stamps, badges, and swashes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Paper objects and hands (Codex)

**Files:**
- Create: `vendor/asset-lib/paper/*.png` (36), `vendor/asset-lib/hands/*.png` (4)
- Modify: `vendor/asset-lib/src/items.json`, `vendor/asset-lib/src/runtime.js`, `scripts/asset-lib.test.mjs`, `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: `processImage` (`npm run asset-lib -- process`), the build's paper/hand handling (Task 3).
- Produces: `.sk-obj-<name>` for each paper object (size it with `width`; `aspect-ratio` keeps the shape); `SK.HAND['hold-card'|'swipe'|'erase'|'hold-highlighter']` for `SK.placeHand(el, tip, { pose })`.

Codex rules for this task: `S=~/.claude/skills/codex-image/scripts/codex-image.sh`; run each job in the background (`run_in_background`), one at a time; write outputs to `$TMPDIR/asset-lib-staging/` and append their `shasum -a 256` to `$TMPDIR/asset-lib-staging/SHA256SUMS`. Review every output on a grey (#8a8a8a) and a kraft ground (compose with ffmpeg `overlay`, then Read the PNG). **Reject** (and regenerate with the same spec) any image with text, letters, numbers, or logos; a real banknote design; wrong fingers; plastic "AI glossy" shading; a light direction other than top-left; a perspective that does not match its family; an object that does not read in 0.5 s at 300 px. Never keep a stand-in.

- [ ] **Step 1: Write the failing test**

Append to `scripts/asset-lib.test.mjs`:

```js
// ---- hands -------------------------------------------------------------------------------------------
test('new hand anchors match their PNG sizes', () => {
  for (const e of catalog.filter((x) => x.kind === 'hand' && x.file.startsWith(LIB))) {
    const sz = pngSize(readFileSync(join(ROOT, e.file)));
    assert.deepEqual([sz.w, sz.h], [e.anchor.w, e.anchor.h], e.id);
    assert.ok(e.anchor.tx < sz.w && e.anchor.ty < sz.h, e.id);
  }
});
```

(It passes vacuously until a hand exists; Step 7 makes it meaningful.)

- [ ] **Step 2: Generate the stationery family (22 objects, studio photo)**

For each row, run (substitute `<name>` and `<object>`):

```bash
"$S" --out "$TMPDIR/asset-lib-staging/<name>.png" --size 1024x1024 --transparent <<'SPEC'
Use case: product-mockup
Asset type: paper object for stop-motion and collage b-roll, placed over paper textures
Primary request: <object>
Style/medium: studio photo, seen from directly above, lying flat, soft natural light from the top-left, true paper and material texture
Composition/framing: the whole object centered, about 75% of the canvas, nothing cropped
Constraints: transparent background; no text, no letters, no numbers, no logos, no barcodes
Avoid: glossy 3D render, plastic look, drop shadow on the background, checkerboard, extra objects
SPEC
```

| name | object |
| --- | --- |
| washi-pink | one short strip of pink washi tape with a tiny white dot pattern, both ends torn with ragged fibres |
| washi-mint | one short strip of mint-green washi tape, plain, both ends torn with ragged fibres |
| washi-grid | one short strip of cream washi tape printed with a thin blue grid, both ends torn |
| tape-clear | one short strip of clear cellophane tape, slightly wrinkled, both ends cut with a zigzag |
| lakban-brown | one short strip of brown packing tape, glossy, both ends torn |
| tape-black | one short strip of black matte gaffer tape, both ends torn with frayed fibres |
| scrap-torn-white | one torn scrap of plain white printer paper with rough fibrous edges on all sides |
| scrap-torn-cream | one torn scrap of cream drawing paper with rough fibrous edges on all sides |
| scrap-torn-yellow | one torn scrap of yellow construction paper with rough fibrous edges on all sides |
| scrap-torn-blue | one torn scrap of light blue construction paper with rough fibrous edges on all sides |
| notebook-strip | one strip torn from a lined notebook page, blue rules, a red margin line, spiral-torn left edge |
| graph-scrap | one torn scrap of pale graph paper with a fine blue grid |
| newspaper-scrap-blank | one torn scrap of newsprint showing only blurred grey column blocks, no readable letters |
| envelope | one plain kraft-brown paper envelope, flap closed, blank |
| receipt-blank | one long thermal paper receipt with a torn top edge, completely blank, slightly curled |
| ticket-stub | one blank cream admission ticket stub with a perforated edge |
| postage-stamp-blank | one blank postage stamp with a perforated edge and a plain light blue centre |
| staple | one single silver office staple, closed |
| binder-clip | one black binder clip with silver handles, closed |
| rubber-band | one tan rubber band lying in a loose loop |
| sticky-pink | one square pink sticky note, completely blank, bottom edge slightly curled |
| sticky-blue | one square light blue sticky note, completely blank, bottom edge slightly curled |

- [ ] **Step 3: Generate the cut-out family (14 objects, the Cut-out Recipe)**

Same command, with this spec (the recipe from `docs/agents/references/asset-production.md`):

```text
Use case: illustration-story
Asset type: paper cut-out object for a stop-motion and collage b-roll clip
Primary request: <object>, made as a flat paper cutout
Style/medium: flat paper cutout, visible paper fibre, construction-paper colours, thin white paper border around the whole silhouette, soft paper shadow inside the cut edges
Composition/framing: whole object centered, about 80% of the canvas
Constraints: plain transparent background; no text, no letters, no logos, no UI
Avoid: glossy 3D render, photorealism, checkerboard, fake transparency grid
```

| name | object |
| --- | --- |
| star-sticker | a five-point star sticker in golden yellow |
| arrow-sticker | a fat curved arrow sticker in coral red |
| circle-dot-sticker | a round dot sticker in teal |
| check-sticker | a thick check-mark sticker in green |
| coin-stack | a stack of five gold coins with plain faces |
| banknote-generic | a generic green paper banknote with a plain oval in the centre and plain borders, no numbers, not a real currency |
| chat-bubble | a rounded chat speech bubble in white with three grey dots |
| ai-chip | a square computer chip in dark grey with short pins on all sides and a plain glowing blue centre |
| warung-front | a small Indonesian roadside shop front (warung) with a striped awning and a wooden counter, no signage |
| shopping-bag | a paper shopping bag with twisted handles, plain |
| parcel-box | a closed cardboard parcel box with tape across the top, no labels |
| lightbulb | a lit light bulb in warm yellow |
| magnifier | a magnifying glass with a black handle |
| calculator | a desk calculator with plain blank keys |

- [ ] **Step 4: Generate the four hands**

Same command; the family matches `vendor/paper-pack/hand-write.png`:

```text
Use case: illustration-story
Asset type: flat illustrated hand for whiteboard b-roll, placed over a white board
Primary request: <pose>
Style/medium: flat vector-style illustration, uniform charcoal contour, flat skin tone, no gradients
Composition/framing: hand and wrist entering from the bottom-right, whole hand visible
Constraints: transparent background; no text; five correctly formed fingers
Avoid: realistic stock photo hand, glossy shading, extra fingers, sleeves with logos
```

| file | pose |
| --- | --- |
| hold-card | right hand holding a blank white index card from below, thumb in front, the card's top edge horizontal |
| swipe | right hand with the index finger extended, swiping to the left, other fingers curled |
| erase | right hand holding a grey whiteboard eraser flat against the board, pressing down-left |
| hold-highlighter | right hand holding a yellow highlighter in a writing grip, chisel tip pointing down-left |

- [ ] **Step 5: Process the reviewed images**

Paper objects (long edge 720 px, 256-colour PNG with alpha):

```bash
for f in "$TMPDIR"/asset-lib-staging/*.png; do n=$(basename "$f" .png); case $n in hold-card|swipe|erase|hold-highlighter) npm run -s asset-lib -- process "$f" "vendor/asset-lib/hands/$n.png" --max 720;; *) npm run -s asset-lib -- process "$f" "vendor/asset-lib/paper/$n.png" --max 720;; esac; done
```

Measure each hand's anchor (the pixel that touches the work): the extreme opaque pixel in the pose's direction — `hold-card` top edge centre of the card (direction up), `swipe` fingertip (left), `erase` eraser contact centre (down-left), `hold-highlighter` tip (down-left):

```bash
node -e '
const { execFileSync } = require("child_process");
const [file, dx, dy] = [process.argv[1], Number(process.argv[2]), Number(process.argv[3])];
const [w, h] = execFileSync("ffprobe", ["-v","error","-show_entries","stream=width,height","-of","csv=p=0",file]).toString().trim().split(",").map(Number);
const a = execFileSync("ffmpeg", ["-loglevel","error","-i",file,"-vf","format=rgba,alphaextract","-f","rawvideo","-pix_fmt","gray","-"]);
let best = null;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y*w+x] > 128) { const s = x*dx + y*dy; if (!best || s > best.s) best = { s, x, y }; }
console.log(JSON.stringify({ w, h, tx: best.x, ty: best.y }));
' vendor/asset-lib/hands/swipe.png -1 0
```

(`hold-card`: `0 -1` then take the x of the card's centre from the image; `erase` and `hold-highlighter`: `-1 1`.) Check each anchor by eye on the image.

- [ ] **Step 6: Add the items**

Append one entry per object to `vendor/asset-lib/src/items.json`, filled from your final spec (the prompt text is the `Primary request` line):

```json
{"id":"paper.washi-pink","kind":"paper","file":"vendor/asset-lib/paper/washi-pink.png","styles":["stop-motion","mix-media","vox"],"tags":["kertas"],"source":"Codex (generated)","license":"project asset (MIT)","prompt":"one short strip of pink washi tape with a tiny white dot pattern, both ends torn with ragged fibres","changes":"crop to alpha, long edge 720 px, 256-colour palette PNG with alpha"}
```

Tags: tapes, scraps, stationery, stickers `kertas`; `coin-stack`, `banknote-generic` `uang`; `chat-bubble` `chat`; `ai-chip` `ai`; `warung-front` `umkm`; `shopping-bag` `bisnis`; `parcel-box` `logistik`; `lightbulb`, `magnifier` `ide`; `calculator` `uang, kerja`; `receipt-blank` `uang, kertas`; `envelope` `chat, kertas`. Add `"parallax"` to the styles of the 14 cut-outs.

Hands:

```json
{"id":"hand.swipe","kind":"hand","file":"vendor/asset-lib/hands/swipe.png","styles":["whiteboard","mix-media"],"tags":["orang","arah"],"source":"Codex (generated)","license":"project asset (MIT)","prompt":"right hand with the index finger extended, swiping to the left, other fingers curled","changes":"crop to alpha, long edge 720 px, 256-colour palette PNG with alpha; anchor measured","anchor":{"pose":"swipe","w":0,"h":0,"tx":0,"ty":0}}
```

with the measured `w, h, tx, ty` (the build refuses a size mismatch).

- [ ] **Step 7: Add the hands runtime section**

In `vendor/asset-lib/src/runtime.js` insert before the final `})();`:

```js
// ---- hands -------------------------------------------------------------------------------------
for(const [k,v] of Object.entries(SK.LIB.hands)) if(!has(SK.HAND,k)) SK.HAND[k]=v;
```

- [ ] **Step 8: Build, test, sheets, review**

Run:
```bash
npm run asset-lib -- build && git add -A vendor/asset-lib && npm run test:asset-lib
npm run asset-lib -- sheets && git add -A docs/agents/references/asset-catalog && npm run test:asset-lib
du -sh vendor/asset-lib/paper vendor/asset-lib/hands
```
Expected: `ℹ pass 25`; paper ≤ 4.5 MB, hands ≤ 0.5 MB. Review `paper*.webp` and `hand.webp`: one consistent family per group, same light direction, no text anywhere.

- [ ] **Step 9: Notices and commit**

Append to the `## asset-lib` list in `THIRD_PARTY_NOTICES.md`:

```md
- Paper objects, cut-outs, and hands (`vendor/asset-lib/paper/`, `hands/`):
  generated for this project with Codex image generation; project assets under
  this repo's license. Prompts per file in `vendor/asset-lib/LICENSES.md`.
```

```bash
git add vendor/asset-lib scripts/asset-lib.test.mjs docs/agents/references/asset-catalog THIRD_PARTY_NOTICES.md
git commit -m "feat: 36 paper objects and cut-outs and 4 new hand poses

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Layered scene kits (Codex)

**Files:**
- Create: `vendor/asset-lib/scenes/<name>/{plate.webp,mid.png,front.png}` for 5 scenes
- Create (built): `vendor/asset-lib/scenes/<name>/scene.json`
- Modify: `vendor/asset-lib/src/items.json`

**Interfaces:**
- Produces: `scene.<name>` catalog entries; `scene.json = {id, light, provenance, layers: [{file, z, role}]}` (back → front) for `SK.layer`. Every layer is a full 1080×1920 frame, pixel-aligned with the plate.

Recipe (from `docs/agents/references/styles/parallax.md`, "Codex layered scene"): (1) a full reference scene; (2) the plate by an edit of it that removes the foreground objects (`--ref`, opaque, same `--size` + `--fit`); (3) each foreground layer by an edit of the reference onto flat green `#00FF00` (keyed) — every call uses `--size 1088x1920 --fit`, so all layers line up. No people, no readable text, no brands. Same Codex rules and review as Task 10; also reject any plate where something moved relative to the reference.

- [ ] **Step 1: Generate each scene**

Reference (run per scene with its row):

```bash
"$S" --out "$TMPDIR/asset-lib-staging/<name>-ref.png" --size 1088x1920 --fit <<'SPEC'
Use case: illustration-story
Asset type: layered parallax background for a vertical 9:16 social video
Primary request: <scene>
Style/medium: painterly flat illustration with soft depth, muted natural colours, gentle film grain
Composition/framing: vertical, eye-level, clear foreground, middle ground, and background planes; nothing important in the bottom 25% (captions)
Lighting/mood: <light>
Constraints: no people, no readable text, no logos or brand names
SPEC
```

| name | scene | light | foreground (front layer) | middle (mid layer) |
| --- | --- | --- | --- | --- |
| warung-counter | a small Indonesian warung counter with glass jars of snacks and a hanging plastic curtain, street behind | warm late-afternoon light from the left | the counter with the jars | the hanging snack sachets (not the translucent curtain) |
| cafe-cowork | a café table by a big window with a laptop and a coffee cup, a city street outside | soft morning light from the window at left | the table with laptop and cup | the window frame and a potted plant |
| city-dusk | a generic Southeast Asian city skyline at dusk seen from a rooftop, no landmark | orange and violet dusk, sun low at left | the rooftop railing and a water tank | the nearer towers |
| server-room | a server room corridor with racks of blinking lights and cable trays | cool blue light with small green LEDs | the nearest rack on the right | the middle racks |
| street-motor | a narrow Indonesian city street with parked motorbikes and small shops, no signage, no plates readable | warm midday light from the left | two parked motorbikes | the shop fronts |

Plate (edit):

```bash
"$S" --out "$TMPDIR/asset-lib-staging/<name>-plate.png" --size 1088x1920 --fit --ref "$TMPDIR/asset-lib-staging/<name>-ref.png" <<'SPEC'
Use case: precise-object-edit
Primary request: remove only <foreground> and <middle>; fill where they were with the continuing background
Constraints: this is a pixel-aligned plate — keep the exact framing, crop, and aspect ratio; every other pixel stays where it is; no people, no text
SPEC
```

Each layer (edit onto green; run for the foreground and for the middle):

```bash
"$S" --out "$TMPDIR/asset-lib-staging/<name>-<front|mid>-green.png" --size 1088x1920 --fit --ref "$TMPDIR/asset-lib-staging/<name>-ref.png" <<'SPEC'
Use case: background-extraction
Primary request: keep only <foreground | middle>; replace everything else with flat pure green #00FF00
Constraints: pixel-aligned — keep the exact framing, position, and size of what is kept; no new objects
SPEC
```

- [ ] **Step 2: Convert to full-frame layers**

```bash
d=vendor/asset-lib/scenes/<name>; mkdir -p $d
ffmpeg -loglevel error -y -i "$TMPDIR/asset-lib-staging/<name>-plate.png" -vf "scale=1080:1920:flags=lanczos" -frames:v 1 -update 1 "$TMPDIR/<name>-plate-1080.png" && cwebp -quiet -q 80 "$TMPDIR/<name>-plate-1080.png" -o $d/plate.webp  # this ffmpeg has no libwebp
for L in mid front; do ffmpeg -loglevel error -y -i "$TMPDIR/asset-lib-staging/<name>-$L-green.png" -vf "scale=1080:1920:flags=lanczos,colorkey=0x00FF00:0.32:0.08,despill=type=green,format=rgba,split[a][b];[a]palettegen=max_colors=256:reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128" $d/$L.png; done
```

Check alignment: overlay `mid.png` and `front.png` on `plate.webp` with ffmpeg and Read the result — no double edges, no green fringe. Regenerate a layer that drifted. Never put a translucent object (plastic curtain, glass, smoke) on a green layer: it keys into green fringes — leave it in the plate or drop it. When the scene itself has green (server LEDs), ask for a magenta `#FF00FF` background and key `colorkey=0xFF00FF:0.30:0.08` without `despill`; check every returned layer's background colour — Codex may return black instead of the asked colour.

- [ ] **Step 3: Add the items**

Append one entry per scene to `vendor/asset-lib/src/items.json`, e.g.:

```json
{"id":"scene.warung-counter","kind":"scene","file":"vendor/asset-lib/scenes/warung-counter/scene.json","styles":["parallax","mix-media"],"tags":["umkm","tempat"],"source":"Codex (generated)","license":"project asset (MIT)","light":"warm late-afternoon light from the left","provenance":"codex (generated scene, not a real place)","layers":[{"file":"plate.webp","z":-1400,"role":"back","prompt":"<the scene row>, foreground and middle removed","changes":"Codex edit of the reference (pixel-aligned plate), 1080×1920 WebP q80"},{"file":"mid.png","z":-500,"role":"mid","prompt":"<the middle row>","changes":"Codex edit onto #00FF00, keyed, 1080×1920 256-colour PNG with alpha"},{"file":"front.png","z":-80,"role":"front","prompt":"<the foreground row>","changes":"Codex edit onto #00FF00, keyed, 1080×1920 256-colour PNG with alpha"}]}
```

Tags: warung-counter `umkm, tempat`; cafe-cowork `kerja, tempat`; city-dusk `tempat, hidup`; server-room `ai, data`; street-motor `tempat, hidup`.

- [ ] **Step 4: Build, test, sheets, review, budget**

Run:
```bash
npm run asset-lib -- build && git add -A vendor/asset-lib && npm run test:asset-lib
npm run asset-lib -- sheets && git add -A docs/agents/references/asset-catalog && npm run test:asset-lib
du -sh vendor/asset-lib docs/agents/references/asset-catalog/sheets
```
Expected: tests pass (the budget test fails above 25 MB — lower the plate quality to 70 before dropping a scene); review `scene.webp`.

- [ ] **Step 5: Commit**

```bash
git add vendor/asset-lib docs/agents/references/asset-catalog
git commit -m "feat: five layered parallax scene kits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Style references, workflow docs, Kit test, and final verification

**Files:**
- Modify: `docs/agents/references/styles/{broll-text,motion-graphic,whiteboard,vox,stop-motion,mix-media,parallax}.md`, `docs/agents/references/styles/README.md`
- Modify: `docs/agents/references/asset-production.md`, `docs/agents/02-screen-plan.md`, `docs/agents/03-build.md`
- Modify: `scripts/style-docs.test.mjs`
- Modify: `docs/superpowers/specs/2026-09-27-asset-library-design.md`, `internal/docs/requirements/rd-03-video-editing-workflow.md`

**Interfaces:**
- Consumes: every catalog id and preset from Tasks 3–11.
- Produces: in each style reference, a `## Look` preset table naming every `.sk-pal-*` / `.sk-grade-px-*` and `.sk-type-*` of that style, and a `## Kit` section with ≥ 12 catalog ids and links to the sheets; `style-docs.test.mjs` enforces both.

- [ ] **Step 1: Write the failing Kit test**

In `scripts/style-docs.test.mjs` replace:

old:
```js
  test(`${s.file}: has the required sections`, () => {
    for (const h of ['When To Use', 'Look', 'Timing', 'Patterns', 'References', 'Build Recipe', 'SFX', 'Examples', 'Anti-slop Checklist', ...(s.sections ?? [])]) section(md, h);
  });
```

new:
```js
  test(`${s.file}: has the required sections`, () => {
    for (const h of ['When To Use', 'Look', 'Kit', 'Timing', 'Patterns', 'References', 'Build Recipe', 'SFX', 'Examples', 'Anti-slop Checklist', ...(s.sections ?? [])]) section(md, h);
  });

  test(`${s.file}: the Look section names every preset of the style and the Kit lists ≥ 12 real catalog ids`, () => {
    const presets = JSON.parse(readFileSync(new URL('../vendor/asset-lib/src/presets.json', import.meta.url), 'utf8'));
    const ids = new Set(JSON.parse(readFileSync(new URL('../vendor/asset-lib/catalog.json', import.meta.url), 'utf8')).map((e) => e.id));
    const look = section(md, 'Look');
    const st = s.key;
    const classes = [
      ...Object.keys(presets.palettes[st] ?? {}).map((n) => `.sk-pal-${st}-${n}`),
      ...(st === 'px' ? Object.keys(presets.grades).map((n) => `.sk-grade-px-${n}`) : []),
      ...Object.keys(presets.types[st] ?? {}).map((n) => `.sk-type-${st}-${n}`),
    ];
    for (const c of classes) assert.ok(look.includes('`' + c + '`'), `${c} is missing from ## Look`);
    const kit = section(md, 'Kit');
    const used = [...kit.matchAll(/`((?:icon|pict|doodle|mark|paper|hand|frame|doc|map|texture|scene|font|palette|type)\.[a-z0-9-]+)`/g)].map((m) => m[1]);
    assert.ok(new Set(used).size >= 12, `${new Set(used).size} catalog ids in ## Kit`);
    for (const id of used) assert.ok(ids.has(id), `${id} is not in vendor/asset-lib/catalog.json`);
    for (const [, p] of kit.matchAll(/`(\.\.\/asset-catalog\/sheets\/[a-z0-9-]+\.webp)`/g)) assert.ok(existsSync(new URL('styles/' + p, REF)), `${p} is missing`);
  });
```

and add `key` to each entry of `STYLES` (`broll-text.md` → `key: 'text'`, `motion-graphic.md` → `'mg'`, `whiteboard.md` → `'wb'`, `stop-motion.md` → `'stop'`, `vox.md` → `'vox'`, `mix-media.md` → `'mm'`, `parallax.md` → `'px'`), e.g. `{ file: 'broll-text.md', key: 'text', patterns: 12, refs: 6, prefix: 'tx-' },`.

Run: `npm run test:style-kit`
Expected: FAIL — `missing "## Kit"` for each style.

- [ ] **Step 2: Replace each style's `## Look` table with the preset table**

Print the table for a style (`text`, `mg`, `wb`, `vox`, `stop`, `mm`, `px`):

```bash
node -e '
const p = require("./vendor/asset-lib/src/presets.json"), st = process.argv[1];
const ex = p.exceptions;
if (st === "px") {
  console.log("| Grade (on the stage) | filter | haze | grain | status |\n| --- | --- | --- | --- | --- |");
  for (const [n, g] of Object.entries(p.grades)) console.log(`| \`.sk-grade-px-${n}\` | \`${g.filter}\` | ${g.haze ? g.haze[0] + " " + Math.round(g.haze[1]*100) + "%" : "none"} | ${g.grain} | ${g.legacy ? "legacy" : "new"} |`);
} else {
  console.log("| Palette | bg | ink | accent | accent-2 | muted | add | status |\n| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const [n, c] of Object.entries(p.palettes[st])) {
    const e = ex[`${st}.${n}`];
    console.log(`| \`.sk-pal-${st}-${n}\` | \`${c.bg}\` | \`${c.ink}\` | \`${c.accent}\` | \`${c.accent2}\` | \`${c.muted}\` | ${[c.bgClass && "`." + c.bgClass + "`", c.overlay && "overlay `." + c.overlay + "`"].filter(Boolean).join(", ") || "—"} | ${c.legacy ? "legacy" : "new"}${e ? " — exception: " + e.join(", ") : ""} |`);
  }
}
console.log("\n| Type preset | display | body | hand | serif | mono |\n| --- | --- | --- | --- | --- | --- |");
for (const [n, t] of Object.entries(p.types[st] ?? {})) console.log(`| \`.sk-type-${st}-${n}\` | ${t.display ?? "—"} | ${t.body ?? "—"} | ${t.hand ?? "—"} | ${t.serif ?? "—"} | ${t.mono ?? "—"} |`);
' text
```

In each style reference, replace the existing `| Token | Default … |` table under `## Look` (the header line through its last row) with the printed tables, and add directly below them:

```md
- Put the palette class on the stage (`<div class="sk-stage sk-text sk-pal-text-jakarta-dusk">`),
  plus the `add` class when listed; an overlay is its own full-frame div. Write the class in the
  brief's `Palette:`; hex values are still allowed when a video needs its own colours (say why).
- Type presets set `--sk-font-*`; `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`
  follow them. Font classes for one-offs: `.sk-f-<font>` (see `font.webp`).
- One palette preset per style per video, unless a palette change marks a new story section.
```

For the styles with legacy exceptions add the usage limit right under the table:
- `broll-text.md`: "`.sk-pal-text-paper` accent (2.92:1) — only for payoff words ≥ 180 px."
- `motion-graphic.md`: "`.sk-pal-mg-default` and `.sk-pal-mg-mint` accent-2 (2.45:1, 2.04:1) — only as bar or area fills, never for text or thin lines."
- `vox.md`, `stop-motion.md`, `mix-media.md`: "`.sk-kraft-dark` averages #a68768: in `dark-desk` / `night-desk` / `night-zine` the light ink goes on dark paper pieces, never straight on the backdrop."

Keep every other bullet of `## Look` that is still true; delete bullets that only repeated the old hex table.

- [ ] **Step 3: Add a `## Kit` section to each style reference (after `## Look`)**

Use this shape and these ids (every id exists after Tasks 3–11; the sheet paths are relative to `docs/agents/references/styles/`):

```md
## Kit

Library assets for this style — look at the sheets before choosing, then list the ids in the
brief's `Assets:` (`vendor/asset-lib/CATALOG.md` has every id, tag, and source). Make a new asset
only when nothing here fits the line, and say why in the brief (RD-03-55).

| Need | Catalog ids | Sheet |
| --- | --- | --- |
| … | … | `../asset-catalog/sheets/<page>.webp` |
```

| Style | Rows (need → ids → sheets) |
| --- | --- |
| broll-text | Display type → `font.anton`, `font.bebas-neue`, `font.archivo-black`, `font.instrument-serif`, `font.jetbrains-mono`, `font.space-grotesk` → `font.webp`; Texture and overlay → `texture.halftone`, `texture.riso`, `texture.concrete-light`, `texture.plaster` → `texture-1.webp`, `texture-2.webp`; Marks on words → `frame.swash-1`, `frame.swash-2`, `frame.swash-3`, `frame.swash-4`, `doodle.burst`, `doodle.circle-loose`, `doodle.underline-wave` → `frame-1.webp`, `frame-2.webp`, `doodle-1.webp` |
| motion-graphic | Line icons → `icon.coins`, `icon.chart-line`, `icon.users`, `icon.store`, `icon.bot`, `icon.clock`, `icon.receipt`, `icon.truck` → `icon-1.webp`, `icon-2.webp`, `icon-3.webp`; Isotype pictograms → `pict.person`, `pict.coins`, `pict.storefront`, `pict.package`, `pict.robot`, `pict.clock` → `pictogram.webp`; Maps behind data → `map.world`, `map.sea`, `map.id-provinces` → `map.webp`; Type → `font.plus-jakarta-sans`, `font.bricolage-grotesque`, `font.space-grotesk` → `font.webp`; Ground → `texture.dots` → `texture-1.webp` |
| whiteboard | People → `doodle.stand`, `doodle.point`, `doodle.think`, `doodle.shrug`, `doodle.celebrate`, `doodle.sit-laptop` → `doodle-1.webp`; Arrows and structure → `doodle.arrow-curve`, `doodle.connector-elbow`, `doodle.bracket-curly`, `doodle.cycle-arrows`, `doodle.fork-split` → `doodle-1.webp`; Bubbles and accents → `doodle.speech-round`, `doodle.thought`, `doodle.lightbulb-hand`, `doodle.burst` → `doodle-1.webp`; Any icon as a doodle (`SK.rough` on an `icon.*`) → `icon.rocket`, `icon.target`, `icon.handshake` → `doodle-rough.webp`; Boards → `texture.whiteboard`, `texture.blackboard`, `texture.graph` → `texture-1.webp`, `texture-2.webp`; Hands → `hand.write`, `hand.point`, `hand.erase`, `hand.hold-card` → `hand.webp`; Lettering → `font.kalam`, `font.patrick-hand`, `font.permanent-marker` → `font.webp` |
| vox | Documents (always tagged Ilustrasi) → `doc.article`, `doc.report-page`, `doc.spreadsheet`, `doc.chat-thread`, `doc.email`, `doc.social-post`, `doc.receipt`, `doc.invoice`, `doc.search-results`, `doc.terminal` → `doc-1.webp`, `doc-2.webp`; Red pen → `mark.red-circle`, `mark.red-underline`, `mark.red-arrow`, `mark.red-check`, `mark.red-cross` → `frame-2.webp`; Stamps → `frame.stamp-ilustrasi`, `frame.stamp-contoh` → `frame-1.webp`; Maps → `map.indonesia`, `map.id-provinces`, `map.java`, `map.sea`, `map.world` → `map.webp`; Desk → `texture.cork`, `texture.paper-tan`, `paper.washi-grid`, `paper.tape-clear`, `paper.binder-clip` → `texture-1.webp`, `paper-1.webp`; Type → `font.dm-serif-display`, `font.special-elite` → `font.webp` |
| stop-motion | Topic cut-outs → `paper.coin-stack`, `paper.banknote-generic`, `paper.chat-bubble`, `paper.ai-chip`, `paper.warung-front`, `paper.shopping-bag`, `paper.parcel-box`, `paper.lightbulb`, `paper.calculator` → `paper-2.webp`; Stationery → `paper.scrap-torn-yellow`, `paper.sticky-pink`, `paper.receipt-blank`, `paper.ticket-stub`, `paper.washi-pink` → `paper-1.webp`; Grounds → `texture.cardboard`, `texture.wood-desk`, `texture.kraft` → `texture-1.webp`, `texture-2.webp`; Torn edges → `frame.torn-all`, `frame.torn-rough` → `frame-1.webp`; Labels → `pict.coins`, `font.patrick-hand`, `font.archivo-black` → `pictogram.webp`, `font.webp` |
| mix-media | Frames → `frame.polaroid`, `frame.polaroid-tilt`, `frame.film-strip-3`, `frame.browser-generic`, `frame.phone-generic`, `frame.torn-top` → `frame-1.webp`; Stickers → `paper.star-sticker`, `paper.arrow-sticker`, `paper.check-sticker`, `doodle.arrow-loop`, `doodle.circle-double` → `paper-1.webp`, `paper-2.webp`, `doodle-1.webp`; Overlays → `texture.riso`, `texture.halftone` → `texture-1.webp`; Type → `font.permanent-marker`, `font.instrument-serif`, `font.special-elite` → `font.webp` |
| parallax | Scenes → `scene.warung-counter`, `scene.cafe-cowork`, `scene.city-dusk`, `scene.server-room`, `scene.street-motor` → `scene.webp`; Grain and haze → `texture.film`, `palette.px-golden-hour`, `palette.px-blue-hour`, `palette.px-faded-film` → `texture-1.webp`, `preset-parallax.webp`; Memory frame → `frame.polaroid`, `frame.polaroid-tilt` → `frame-1.webp`; Collage layers → `paper.lightbulb`, `paper.parcel-box`, `texture.linen` → `paper-2.webp`, `texture-2.webp`; Type → `font.instrument-serif` → `font.webp` |

(Sheet names follow the rendered pages: kinds with more cells than one page holds are split into `-1`, `-2`, …)

Run: `npm run test:style-kit`
Expected: PASS (every style: sections, presets named, ≥ 12 real ids, sheets exist).

- [ ] **Step 4: Wire the library into the workflow docs**

`docs/agents/references/styles/README.md`, in `## Style B-roll Brief`, replace:

old:
```md
- Palette: <--sk-bg, --sk-ink, --sk-accent, --sk-accent-2, --sk-muted as hex>
- Font: <display | sans | hand>, sizes in px
```

new:
```md
- Palette: <preset class, e.g. `sk-pal-wb-graph-paper` (+ its add class), or hex values with the reason>
- Type: <preset class, e.g. `sk-type-wb-kalam`, or font classes `.sk-f-*`>, sizes in px
```

and replace:

old:
```md
- Assets: <each bitmap the clip needs, or "none">
  - `assets/cutouts/NN-name.png` — <codex | cc0 | dena-footage | user> — <what it shows, tied to the transcript>
```

new:
```md
- Library assets: <catalog ids from `vendor/asset-lib/CATALOG.md`, e.g. `doodle.think`, `paper.coin-stack`, `map.java`, or "none">
- Assets: <each per-video bitmap the clip needs, or "none">
  - `assets/cutouts/NN-name.png` — <codex | cc0 | dena-footage | user> — <what it shows, tied to the transcript> — <why the library has nothing that fits>
```

and in `## Build Contract (all styles)` replace:

old:
```md
- Host setup: the Dena starter already loads `vendor/style-kit/style-kit.js` and
  `style-kit.css` after motion-kit, then `vendor/paper-pack/paper-pack.css`. Mounts are the same as motion b-roll (class
```

new:
```md
- Host setup: the Dena starter already loads `vendor/style-kit/style-kit.js` and
  `style-kit.css` after motion-kit, then `vendor/paper-pack/paper-pack.css`, then the asset
  library (`vendor/asset-lib/asset-lib.js` + `.css`: `SK.icon`, `SK.pict`, `SK.doodle`,
  `SK.mark`, `SK.rough`, `SK.stamp`, `SK.frame`, `SK.tornFrame`, `SK.doc`, `SK.geo(…, map)`,
  `SK.asset`; classes `.sk-pal-*`, `.sk-type-*`, `.sk-grade-px-*`, `.sk-f-*`, `.sk-tex-*`,
  `.sk-obj-*`). Insert library HTML once, outside `update(t)`. Mounts are the same as motion b-roll (class
```

`docs/agents/02-screen-plan.md`: in step 4 (**Map and decide.**), add after its first sentence:

```md
   Before deciding a visual, read `vendor/asset-lib/CATALOG.md` (grep the line's topic tag:
   `uang`, `ai`, `chat`, `umkm`, …) and open the contact sheets for the candidate style in
   `docs/agents/references/asset-catalog/sheets/`; choose a palette and type preset from the style
   reference's `## Look`, and list library ids in the brief's `Library assets:` (RD-03-50..52).
```

`docs/agents/03-build.md`: after the sentence that points to `styles/README.md` and the Build Recipe, add:

```md
Library assets from the brief come from `vendor/asset-lib/` (already loaded by the starter):
insert `SK.icon`/`SK.doodle`/`SK.doc`/… HTML once before `SK.clip`, draw doodles with
`SK.drawSeq` over their `.sk-dpath` paths, use `.sk-obj-*` divs for paper objects, and read a
scene's layers from `vendor/asset-lib/scenes/<name>/scene.json`. Per-video assets are produced
only for what the library lacks (RD-03-55).
```

`docs/agents/references/asset-production.md`: in `## Style Assets`, replace:

old:
```md
step 2, before the clip is written. Paper textures, tape, pins, sticky notes, and
the whiteboard hand already live in `vendor/paper-pack/` — use those instead of
generating new ones.
```

new:
```md
step 2, before the clip is written. Check the shared library first: `vendor/asset-lib/CATALOG.md`
and the sheets in `docs/agents/references/asset-catalog/sheets/` hold icons, pictograms,
doodles, marks, stamps, frames, VOX document templates, maps, textures, paper objects, cut-outs,
hands, and layered scenes (plus the paper pack). Use a library asset when it fits; generate a
new one only for what the library lacks and note why in the brief (RD-03-55). A new asset that
would help future videos can be added to the library (`vendor/asset-lib/src/items.json`,
`npm run asset-lib -- build`, `sheets`) instead of staying in one video.
```

- [ ] **Step 5: Sync the spec and the requirement text**

In `docs/superpowers/specs/2026-09-27-asset-library-design.md` update what changed while building (keep the rest): pictograms 70 (not 66); type presets 23 (not 22); contact sheets are one `preset-<style>` page per style (palettes + types together) instead of separate palette/type pages; `SK.doc` returns an HTML string with the layout in `.sk-docx`; swashes live in `src/frames/` and draw with `SK.doodle`; parallax grade classes go on the stage (`.sk-grade-px-*` styles `.sk-view`, `.sk-haze`, `.sk-grain`); riso and film are baked PNG tiles (SVG noise in data-URI backgrounds renders blank in HyperFrames' Chrome); `SK.stamp`/`SK.frame`/`SK.tornFrame` added to the API table; Status → "implemented 2026-09-27".

In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace in RD-03-36:

old:
```md
  Brief dengan treatment, pola, palet (hex), font, beat per kata, dan daftar
  `Assets:`.
```

new:
```md
  Brief dengan treatment, pola, palet (preset `sk-pal-*` atau hex), tipografi
  (preset `sk-type-*` atau `.sk-f-*`), beat per kata, `Library assets:`, dan
  daftar `Assets:`.
```

- [ ] **Step 6: Final verification**

Run:
```bash
npm run asset-lib -- check
npm run test:asset-lib && npm run test:style-kit && npm run test:video && npm run test:motion-kit && npm run test:render-blur && npm run test:repliz
npm run check:style-examples
for f in /tmp/asset-lib-baseline/frame-*.png; do cmp -s "$f" "renders/style-examples/$(basename "$f")" || echo "DIFF $(basename "$f")"; done; echo checked
npm run check:broll-examples && npm run check
node -e "const c=require('./vendor/asset-lib/catalog.json');const k={};for(const e of c)k[e.kind]=(k[e.kind]||0)+1;console.log(c.length,k)"
du -sh vendor/asset-lib docs/agents/references/asset-catalog/sheets
git status --short
```
Expected: `up to date`; every suite green; `0 errors` and `checked` with no `DIFF`; root and b-roll checks clean; roughly 600 catalog entries (≈ 500 assets + 79 presets); total ≤ 25 MB; a clean tree after the commit below. Read three sheets you have not looked at yet as a last check.

- [ ] **Step 7: Commit**

```bash
git add docs/agents scripts/style-docs.test.mjs docs/superpowers/specs/2026-09-27-asset-library-design.md internal/docs/requirements/rd-03-video-editing-workflow.md
git commit -m "docs: presets and Kit in every style reference; the workflow uses the asset library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Stop for Dena**

Report the numbers (catalog counts per kind, size, test results, pixel-identity), link the sheets, and ask whether to merge `feat/asset-lib` into local `main`. Do not merge or push without her answer. Next sub-projects (from the spec): 2 — new patterns and examples that use the library; 3 — moodboards.
