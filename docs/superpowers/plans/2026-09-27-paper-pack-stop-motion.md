# Paper Pack + Stop-motion (Sub-project 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a licensed, vendored paper pack, style-kit v2 primitives for stop-motion and a whiteboard hand, a per-video bitmap asset pipeline, and the `stop-motion` style with a rich reference and five new examples.

**Architecture:** `vendor/paper-pack/` holds CC0 ambientCG textures and reviewed Codex objects, exposed as CSS classes in `paper-pack.css` (loaded after `style-kit.css`, urls inside its own folder). `style-kit.js` gains `SK.STOP_FPS`/`SK.onTwos`/`SK.piece`/`SK.cycle`/`SK.torn`/`SK.grain` and `SK.HAND`/`SK.lastTip`/`SK.placeHand`, all pure functions of clip-local time. Screen Plan lists bitmaps under `Assets:` in the Style B-roll Brief; Build produces them via the new Style Assets section before writing clips.

**Tech Stack:** HyperFrames 0.7.24 via pinned `npx`, GSAP + motion-kit + style-kit (vendored), plain JS/CSS/SVG, Node 22+ built-ins (`node:test`, `node:vm`, `node:fs`), ffmpeg (asset prep only), Codex image generation (skill `codex-image`, asset prep only).

**Spec:** `docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md`

**Evidence:** Every file in this plan was built and run in a scratch copy of the repo on 2026-09-27: `test:style-kit` 59/59, `test:motion-kit` 15/15, `test:render-blur` 4/4, `test:video` 10/10, `test:repliz` 47/47; `check:style-examples` 0 errors / 0 warnings with 35 snapshots reviewed, the 24 existing example frames pixel-identical to the previous render; `check:broll-examples` and root `npm run check` clean; starter smoke shows only the two expected missing-media errors. The spike found three traps now encoded as rules: `url(../…)` in a kit stylesheet fails lint; repeated `<img>` with one `src` trips `duplicate_media_discovery_risk`; 12 fps steps hold unevenly at the 30 fps render (use 15).

## Global Constraints

- No npm dependencies (ADR-0007). Scripts use Node built-ins only; HyperFrames is always `npx --yes hyperframes@0.7.24`.
- Clip frame 1080×1920; clips mount on track 4 with host class `broll`; `data-duration` = clip `T`. Example stop-motion clips are `sm-NN-…`.
- Every frame is a pure function of clip-local time: no `requestAnimationFrame`, `performance.now()`, `Date.now()`, `Math.random()`, timers, or network.
- Never set `visibility` inside a clip; never name a `font-family` in a clip `<style>`; never write `../` in a url; repeated paper objects are `div`s with a paper-pack class, not repeated `<img>`.
- Stop-motion steps at `SK.STOP_FPS` = 15 (two frames per pose at 30 fps). No motion blur, morphs, or crossfades on paper.
- Paper pack ≤ 5 MB; every file has a row in `vendor/paper-pack/LICENSES.md`; every PNG keeps alpha.
- Never generate Dena's likeness; generated cut-outs contain no text and no real person or brand.
- Docs language: `docs/agents/**` English; `internal/docs/**` Indonesian.
- Richness minimums for `stop-motion.md`: ≥ 12 patterns, ≥ 6 references with a source URL, ≥ 8 anti-slop checks, ≥ 4 examples covering cutaway, split, and panel.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Replacement steps give an exact **old** and **new** block. Each old block must match exactly once — if not, stop and re-read the file.
- Reviewed binary assets are copied from the staging folder `/private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a` and checked against its `SHA256SUMS`. If that folder is missing, regenerate with the recipes in `vendor/paper-pack/LICENSES.md` (ambientCG crops with ffmpeg; Codex prompts), review them on a grey and a kraft ground, and record the new checksums — never substitute hand-drawn stand-ins.

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `internal/docs/adr/0013-paper-pack-bitmap-assets.md` | Create | Decision record |
| `internal/docs/requirements/rd-02-composition-render.md`, `rd-03-video-editing-workflow.md` | Modify | EARS RD-02-29..31, RD-03-39..41 (+ RD-03-35/36 list stop-motion) |
| `internal/docs/README.md` | Modify | Register ADR-0013 (item 35, renumber) |
| `vendor/paper-pack/*.jpg`, `*.png` | Create | Textures and objects (binary, from staging) |
| `vendor/paper-pack/paper-pack.css`, `LICENSES.md` | Create | Paper classes, per-file licenses |
| `scripts/paper-pack.test.mjs` | Create | License / alpha / size / hand-anchor guard |
| `templates/dena-video/index.html` | Modify | Load `paper-pack.css` |
| `vendor/style-kit/style-kit.js`, `style-kit.css`, `scripts/style-kit.test.mjs` | Modify | Engine v2 + tests |
| `docs/agents/references/style-examples/**` | Modify/Create | 5 new clips, 2 cut-outs, host, snapshot times |
| `scripts/check-broll-examples.mjs` | Modify | Copy `vendor/paper-pack` |
| `docs/agents/references/styles/stop-motion.md` | Create | Style reference |
| `docs/agents/references/styles/README.md`, `whiteboard.md`, `scripts/style-docs.test.mjs` | Modify | Menu, brief fields, hand, richness guard |
| `docs/agents/references/asset-production.md` | Modify | Style Assets section |
| `docs/agents/02-screen-plan.md`, `03-build.md`, `references/{visual-planning,motion-broll-planning,qa-checklist}.md`, `docs/skills/…/quality-gates.md`, `docs/dena-social-video-style-guide.md`, `CLAUDE.md`, `AGENTS.md` | Modify | Wiring |
| `internal/docs/{design-system/visual-system,architecture/stack,frontend/composition-implementation,operations/runbook,operations/video-editing-workflow,operations/roadmap}.md`, `THIRD_PARTY_NOTICES.md`, `package.json` | Modify | Canon sync |

---

### Task 0: Preflight

**Files:** none (read-only checks).

- [ ] **Step 1: Branch, clean tree, staging assets**

Run:
```bash
git branch --show-current
git status --short
cd /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a && shasum -a 256 -c SHA256SUMS && cd -
```
Expected: branch `feat/paper-pack`; `git status` prints nothing; every staging file reports `OK`. If the tree has changes that are not from this plan, stop and ask the user.

- [ ] **Step 2: Toolchain**

Run: `node --version && npx --yes hyperframes@0.7.24 --version`
Expected: Node ≥ 22 and `0.7.24`.

---

### Task 1: Governance first — ADR-0013, EARS, index

**Files:**
- Create: `internal/docs/adr/0013-paper-pack-bitmap-assets.md`
- Modify: `internal/docs/requirements/rd-02-composition-render.md`, `internal/docs/requirements/rd-03-video-editing-workflow.md`, `internal/docs/README.md`

**Interfaces:**
- Produces: RD-02-29..31, RD-03-39..41; ADR path `internal/docs/adr/0013-paper-pack-bitmap-assets.md`.

- [ ] **Step 1: Write ADR-0013**

Create `internal/docs/adr/0013-paper-pack-bitmap-assets.md`:

````markdown
# ADR-0013 Paper pack dan aset bitmap per video
Status: accepted
Date: 2026-09-27

## Context

Sub-proyek 1 (ADR-0012) menambah gaya yang sepenuhnya dibangun dari kode. Gaya
keluarga kertas — stop-motion sekarang, VOX dan mix-media nanti — butuh bitmap:
tekstur kertas, selotip, pin, sticky note, tangan whiteboard, dan cutout objek
per video. Dena menyetujui sumber campuran: tekstur CC0 yang otentik, sisanya
di-generate Codex, semua di-vendor dengan lisensi tercatat; kemiripan Dena tidak
boleh di-generate.

Spike 2026-09-27 (HyperFrames 0.7.24): `<img src="vendor/paper-pack/…">` dan
`url(vendor/paper-pack/…)` di dalam sub-composition lolos lint, validate,
snapshot, dan tetap jalan lewat symlink `vendor` di `videos/<slug>/`; PNG
ber-alpha tampil benar. `url(../paper-pack/…)` di `style-kit.css` ditolak lint
(`invalid_parent_traversal_in_asset_path`), dan `<img>` dengan `src` sama yang
diulang memicu `duplicate_media_discovery_risk`. Render HyperFrames 30 fps, jadi
stop-motion 12 fps menahan pose tidak rata (3:2).

## Decision

- `vendor/paper-pack/` berisi tekstur ambientCG (CC0 1.0) yang di-crop ke
  1080×1920 dan objek Codex (PNG palet ber-alpha), dengan `LICENSES.md` satu
  baris per file dan batas total 5 MB.
- Kelas tekstur dan objek ada di `vendor/paper-pack/paper-pack.css` (url di
  folder sendiri, tanpa `../`), dimuat starter setelah `style-kit.css`; objek yang
  bisa berulang adalah `div` berkelas, bukan `<img>` berulang.
- style-kit mendapat primitive stop-motion (`SK.STOP_FPS` = 15, `SK.onTwos`,
  `SK.piece`, `SK.cycle`, `SK.torn`, `SK.grain`) dan tangan whiteboard
  (`SK.HAND`, `SK.lastTip`, `SK.placeHand`).
- Aset per video mengikuti field `Assets:` di Style B-roll Brief dan bagian
  Style Assets di `asset-production.md`: `codex` (resep cutout tetap), `cc0`
  (ambientCG, Poly Haven, Wikimedia Commons CC0/PD, dicek per file),
  `dena-footage` (frame `processed.mp4` + `remove-background`), `user`.
- Kemiripan Dena hanya dari footage-nya; cutout generate tanpa teks dan tanpa
  orang/brand nyata.

## Rationale

- Tekstur hasil scan asli menghindari tampilan "AI plastik"; Codex dipakai untuk
  objek yang tidak tersedia CC0.
- Satu paket bersama menjaga konsistensi lintas video dan lintas gaya kertas
  (stop-motion, VOX, mix-media).
- Lisensi per file membuat rilis open-source tetap bersih.

## Consequences

- `scripts/paper-pack.test.mjs` menjaga lisensi, alpha, ukuran, dan titik ujung
  pena tangan.
- Aset Codex tidak dapat dibuat ulang identik; file yang sudah ditinjau adalah
  sumber kebenarannya, prompt di `LICENSES.md` hanya untuk regenerasi.
- VOX dan mix-media (sub-proyek 2b) memakai paket ini; cutout video ber-alpha
  dibuktikan lewat spike di 2b.

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md`
- `vendor/paper-pack/`, `docs/agents/references/styles/stop-motion.md`,
  `docs/agents/references/asset-production.md` (Style Assets)
- [ADR-0012](0012-style-broll-style-kit.md)
````

- [ ] **Step 2: EARS and the ADR range**

1. In `internal/docs/requirements/rd-02-composition-render.md` replace:

````text
  di `<style>` clip; font berasal dari file lokal di `vendor/`.
````

   with:

````text
  di `<style>` clip; font berasal dari file lokal di `vendor/`.
- **RD-02-29** (Ubiquitous) — Setiap file di `vendor/paper-pack/` shall tercatat
  di `vendor/paper-pack/LICENSES.md` dengan sumber dan lisensinya, setiap PNG-nya
  shall punya kanal alpha, dan total paket shall ≤ 5 MB.
- **RD-02-30** (Ubiquitous) — Starter shall memuat
  `vendor/paper-pack/paper-pack.css` setelah `style-kit.css`, dan url di
  stylesheet kit shall tidak memakai `../`.
- **RD-02-31** (Ubiquitous) — Clip `stop-motion` shall menggerakkan potongan
  kertas pada grid `SK.STOP_FPS` (15 langkah per detik, tiap pose tertahan dua
  frame pada render 30 fps) lewat `SK.onTwos`/`SK.piece`, tanpa motion blur atau
  crossfade.
````

2. In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

````text
  (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`) per baris lewat
````

   with:

````text
  (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`) per baris lewat
````

3. In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

````text
- **RD-03-36** (Ubiquitous) — Setiap baris `broll-text`, `motion-graphic`, atau
  `whiteboard` di `visual-plan.md` shall punya Style B-roll Brief dengan
  treatment, pola, palet (hex), font, dan beat per kata.
````

   with:

````text
- **RD-03-36** (Ubiquitous) — Setiap baris `broll-text`, `motion-graphic`,
  `whiteboard`, atau `stop-motion` di `visual-plan.md` shall punya Style B-roll
  Brief dengan treatment, pola, palet (hex), font, beat per kata, dan daftar
  `Assets:`.
````

4. In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

````text
  visual, then fase Screen Plan shall mengurangi tipenya sebelum Gate 2.
````

   with:

````text
  visual, then fase Screen Plan shall mengurangi tipenya sebelum Gate 2.
- **RD-03-39** (Ubiquitous) — Fase Build shall memproduksi setiap bitmap di
  `Assets:` sebelum menulis clip-nya dan mencatatnya di `asset-manifest.json`
  dengan `provenance` (`generated`, `cc0`, `dena-footage`, atau `user`).
- **RD-03-40** (Unwanted) — If sebuah aset perlu menampilkan Dena, then fase
  Build shall memotongnya dari footage Dena (`remove-background`) dan tidak
  pernah meng-generate kemiripannya.
- **RD-03-41** (Unwanted) — If cutout hasil generate berisi teks, atau
  menggambarkan orang/brand nyata, then fase Build shall menolaknya dan
  meng-generate ulang (teks) atau menandainya Gate 2 R6 (orang/brand nyata).
````

5. In `internal/docs/README.md` replace:

````text
| Keputusan arsitektur | [adr/](adr/) (0001–0012) |
````

   with:

````text
| Keputusan arsitektur | [adr/](adr/) (0001–0013) |
````

- [ ] **Step 3: Register ADR-0013 and renumber**

````bash
python3 - <<'PYEOF'
# Insert an ADR after a given ADR in internal/docs/README.md and renumber the items after it.
import re
p, after, new_line = 'internal/docs/README.md', '34. [adr/0012-style-broll-style-kit.md]', '35. [adr/0013-paper-pack-bitmap-assets.md](adr/0013-paper-pack-bitmap-assets.md) - Paper pack (tekstur CC0 + objek Codex) dan aset bitmap per video; stop-motion + tangan whiteboard.'
s = open(p).read()
assert s.count(after) == 1, 'anchor ADR line not found exactly once'
out, bump = [], False
for line in s.split('\n'):
    m = re.match(r'^(\d+)\. (.*)$', line)
    if bump and m:
        line = f'{int(m.group(1)) + 1}. {m.group(2)}'
    out.append(line)
    if line.startswith(after):
        out.append(new_line)
        bump = True
open(p, 'w').write('\n'.join(out))
print('inserted ADR-0013 as item 35')
PYEOF
````

Expected output: `inserted ADR-0013 as item 35`; `sed -n 56,62p internal/docs/README.md` shows items 34 (ADR-0012), 35 (ADR-0013), and `### Design System & Frontend` starting at 36.

- [ ] **Step 4: Commit**

```bash
git add internal/docs/adr/0013-paper-pack-bitmap-assets.md internal/docs/requirements/rd-02-composition-render.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/README.md
git commit -m "docs: add ADR-0013 and EARS for the paper pack and per-video bitmap assets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Paper pack (TDD)

**Files:**
- Create: `scripts/paper-pack.test.mjs`, `vendor/paper-pack/{paper-white,paper-cream,paper-grey,paper-crumpled,kraft,kraft-ribbed,kraft-dark}.jpg`, `vendor/paper-pack/{tape-a,tape-b,hand-write,hand-point,pin,clip,sticky}.png`, `vendor/paper-pack/paper-pack.css`, `vendor/paper-pack/LICENSES.md`
- Modify: `templates/dena-video/index.html`, `package.json`, `internal/docs/operations/runbook.md`, `CLAUDE.md`, `AGENTS.md`

**Interfaces:**
- Produces CSS classes used by Tasks 4–5: backgrounds `.sk-paper-white`, `.sk-paper-cream`, `.sk-paper-grey`, `.sk-paper-crumpled`, `.sk-kraft`, `.sk-kraft-ribbed`, `.sk-kraft-dark`, `.sk-lined`, `.sk-grid`, `.sk-newsprint`; objects `.sk-sticky`, `.sk-pin`, `.sk-clip`, `.sk-tape-a`, `.sk-tape-b` (size by `width`).
- Produces asset facts used by Task 3: `hand-write.png` 664×720 with pen tip (8, 711); `hand-point.png` 697×720 with fingertip (10, 705).

- [ ] **Step 1: Write the failing guard test**

Create `scripts/paper-pack.test.mjs`:

````js
// Paper pack guard (spec: docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md):
// every file is licensed in LICENSES.md, every PNG keeps an alpha channel, the pack stays ≤ 5 MB,
// and the hand anchors in style-kit match the PNG sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const DIR = new URL('../vendor/paper-pack/', import.meta.url);
const files = readdirSync(DIR).filter((f) => !f.startsWith('.'));
const licenses = readFileSync(new URL('LICENSES.md', DIR), 'utf8');

// PNG IHDR: width @16, height @20, colour type @25 (4 = grey+alpha, 6 = RGBA, 3 = palette with tRNS)
const png = (f) => {
  const b = readFileSync(new URL(f, DIR));
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${f} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: b[25], trns: b.includes(Buffer.from('tRNS')) };
};

test('every paper-pack file has a LICENSES.md row with a source and a license', () => {
  for (const f of files) {
    const row = licenses.split('\n').find((l) => l.startsWith('| `' + f + '` |'));
    assert.ok(row, `${f} is missing from LICENSES.md`);
    const cells = row.split('|').slice(1, -1).map((c) => c.trim());
    assert.equal(cells.length, 4, row);
    assert.ok(cells[1].length > 0 && cells[2].length > 0, row);
    if (cells[2].startsWith('CC0')) assert.match(cells[1], /https:\/\/ambientcg\.com\/view\?id=\w+/, row);
  }
});

test('every PNG keeps transparency', () => {
  for (const f of files.filter((x) => x.endsWith('.png'))) {
    const p = png(f);
    assert.ok(p.type === 6 || p.type === 4 || (p.type === 3 && p.trns), `${f} has no alpha (colour type ${p.type})`);
  }
});

test('the pack stays within 5 MB', () => {
  const total = files.reduce((n, f) => n + statSync(new URL(f, DIR)).size, 0);
  assert.ok(total <= 5 * 1024 * 1024, `${(total / 1048576).toFixed(2)} MB`);
});

test('texture JPGs are 1080×1920-ready and hand anchors match the PNGs', () => {
  for (const f of files.filter((x) => x.endsWith('.jpg'))) assert.ok(statSync(new URL(f, DIR)).size <= 400 * 1024, f);
  const src = readFileSync(new URL('../vendor/style-kit/style-kit.js', import.meta.url), 'utf8');
  for (const pose of ['write', 'point']) {
    const m = src.match(new RegExp(pose + ":\\{src:'vendor/paper-pack/hand-" + pose + "\\.png', w:(\\d+), h:(\\d+), tx:(\\d+), ty:(\\d+)\\}"));
    assert.ok(m, `SK.HAND.${pose} not found`);
    const p = png(`hand-${pose}.png`);
    assert.deepEqual([p.w, p.h], [Number(m[1]), Number(m[2])], `hand-${pose}.png size`);
    assert.ok(Number(m[3]) < p.w && Number(m[4]) < p.h);
  }
});
````

Run: `node --test scripts/paper-pack.test.mjs`
Expected: FAIL — `ENOENT … vendor/paper-pack`.

- [ ] **Step 2: Copy the reviewed assets**

```bash
mkdir -p vendor/paper-pack
cp /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a/paper-pack/* vendor/paper-pack/
ls vendor/paper-pack | wc -l
du -ch vendor/paper-pack | tail -1
```
Expected: `14` files and about `848K`.

- [ ] **Step 3: Write the stylesheet and the licenses**

Create `vendor/paper-pack/paper-pack.css`:

````css
/* paper-pack: paper backgrounds for style b-roll clips. Loaded by the host after style-kit.css.
   Urls stay inside this folder (the linter rejects ../ paths). Sources: LICENSES.md. */
.sk-paper-white, .sk-paper-cream, .sk-paper-grey, .sk-paper-crumpled, .sk-kraft, .sk-kraft-ribbed, .sk-kraft-dark,
.sk-lined, .sk-grid, .sk-newsprint { background-size: 1080px 1920px; background-position: 0 0; }
.sk-paper-white { background-image: url(paper-white.jpg); }
.sk-paper-cream { background-image: url(paper-cream.jpg); }
.sk-paper-grey { background-image: url(paper-grey.jpg); }
.sk-paper-crumpled { background-image: url(paper-crumpled.jpg); }
.sk-kraft { background-image: url(kraft.jpg); }
.sk-kraft-ribbed { background-image: url(kraft-ribbed.jpg); }
.sk-kraft-dark { background-image: url(kraft-dark.jpg); }
/* notebook: blue rules every 64px, red margin at 120px */
.sk-lined {
  background-image: linear-gradient(to right, transparent 118px, rgba(220,38,38,.45) 118px 121px, transparent 121px),
    repeating-linear-gradient(to bottom, transparent 0 62px, rgba(37,99,235,.26) 62px 64px), url(paper-white.jpg);
  background-size: auto, auto, 1080px 1920px;
}
/* squared paper: 48px grid */
.sk-grid {
  background-image: repeating-linear-gradient(to right, transparent 0 46px, rgba(37,99,235,.18) 46px 48px),
    repeating-linear-gradient(to bottom, transparent 0 46px, rgba(37,99,235,.18) 46px 48px), url(paper-white.jpg);
  background-size: auto, auto, 1080px 1920px;
}
/* newsprint: grey stock with blurred text rows in three columns (not real text) */
.sk-newsprint {
  background-image: repeating-linear-gradient(to right, transparent 0 318px, rgba(214,210,203,.95) 318px 360px),
    repeating-linear-gradient(to bottom, rgba(60,60,60,.16) 0 7px, transparent 7px 17px), url(paper-grey.jpg);
  background-size: auto, auto, 1080px 1920px;
}
/* paper objects: size with width (aspect-ratio keeps the PNG shape); a div, not an <img>, so one
   clip can repeat an object without tripping the linter's duplicate-media rule */
.sk-sticky, .sk-pin, .sk-clip, .sk-tape-a, .sk-tape-b { position: absolute; background-repeat: no-repeat; background-size: 100% 100%; }
.sk-sticky { background-image: url(sticky.png); aspect-ratio: 520 / 515; }
.sk-pin { background-image: url(pin.png); aspect-ratio: 164 / 256; }
.sk-clip { background-image: url(clip.png); aspect-ratio: 91 / 300; }
.sk-tape-a { background-image: url(tape-a.png); aspect-ratio: 720 / 147; opacity: .93; }
.sk-tape-b { background-image: url(tape-b.png); aspect-ratio: 720 / 170; opacity: .93; }
````

Create `vendor/paper-pack/LICENSES.md`:

````markdown
# Paper Pack Licenses

One row per file in `vendor/paper-pack/`. `scripts/paper-pack.test.mjs` fails when a file is
missing here. CC0 textures come from ambientCG, whose license page states: "All ambientCG
assets are provided under the Creative Commons CC0 1.0 Universal License"
(https://docs.ambientcg.com/license/, checked 2026-09-27). Generated files were made with
Codex image generation (skill `codex-image`) on 2026-09-27, reviewed on a grey and a kraft
ground, and post-processed (crop to the alpha box, resize, 256-colour palette with alpha).

| File | Source | License | Changes |
| --- | --- | --- | --- |
| `paper-white.jpg` | ambientCG `Paper001`, 2K-JPG Color map — https://ambientcg.com/view?id=Paper001 | CC0 1.0 | centre crop 9:16, 1080×1920, JPEG q6 |
| `paper-cream.jpg` | ambientCG `Paper001`, 2K-JPG Color map — https://ambientcg.com/view?id=Paper001 | CC0 1.0 | centre crop 9:16, 1080×1920, warm tint (`colorchannelmixer` g .965, b .86), JPEG q6 |
| `paper-grey.jpg` | ambientCG `Paper002`, 2K-JPG Color map — https://ambientcg.com/view?id=Paper002 | CC0 1.0 | centre crop 9:16, 1080×1920, JPEG q7 |
| `paper-crumpled.jpg` | ambientCG `Paper003`, 2K-JPG Color map — https://ambientcg.com/view?id=Paper003 | CC0 1.0 | centre crop 9:16, 1080×1920, JPEG q6 |
| `kraft.jpg` | ambientCG `Cardboard002`, 2K-JPG Color map — https://ambientcg.com/view?id=Cardboard002 | CC0 1.0 | centre crop 9:16, 1080×1920, JPEG q7 |
| `kraft-ribbed.jpg` | ambientCG `Paper004`, 2K-JPG Color map — https://ambientcg.com/view?id=Paper004 | CC0 1.0 | centre crop 9:16, 1080×1920, JPEG q7 |
| `kraft-dark.jpg` | ambientCG `Paper006`, 2K-JPG Color map — https://ambientcg.com/view?id=Paper006 | CC0 1.0 | centre crop 9:16, 1080×1920, JPEG q7 |
| `tape-a.png` | Codex (generated) — "one short strip of cream masking tape, torn at both ends with ragged fibrous edges, lying flat, seen from above; studio photo; transparent background; no text" | project asset (MIT) | crop, 720 px, palette PNG |
| `tape-b.png` | Codex (generated) — same prompt as `tape-a.png`, second variant | project asset (MIT) | crop, 720 px, palette PNG |
| `hand-write.png` | Codex (generated) — "right hand holding a black whiteboard marker in a writing grip, tip down-left; flat vector-style illustration, uniform charcoal contour; transparent background; no text" | project asset (MIT) | crop, 720 px, palette PNG; pen tip at (8, 711) |
| `hand-point.png` | Codex (generated) — "right hand, index finger pointing down-left, capped marker in the curled fingers; flat vector-style illustration, uniform charcoal contour; transparent background; no text" | project asset (MIT) | crop, 720 px, palette PNG; fingertip at (10, 705) |
| `pin.png` | Codex (generated) — "one red plastic push pin seen from above at a slight angle; studio photo; transparent background; no text" | project asset (MIT) | crop, 256 px, palette PNG |
| `clip.png` | Codex (generated) — "one standard silver metal paper clip lying flat, seen from above; studio photo; transparent background; no text" | project asset (MIT) | crop, 300 px, palette PNG |
| `sticky.png` | Codex (generated) — "one square yellow sticky note, completely blank, bottom edge slightly curled; studio photo; transparent background; no writing" | project asset (MIT) | crop, 520 px, palette PNG |
| `paper-pack.css` | this project | MIT | — |
| `LICENSES.md` | this project | MIT | — |
````

- [ ] **Step 4: Load it in the starter and add it to the test script**

1. In `templates/dena-video/index.html` replace:

````text
    <link rel="stylesheet" href="vendor/style-kit/style-kit.css" />
````

   with:

````text
    <link rel="stylesheet" href="vendor/style-kit/style-kit.css" />
    <link rel="stylesheet" href="vendor/paper-pack/paper-pack.css" />
````

2. In `package.json` replace:

````text
    "test:style-kit": "node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs",
````

   with:

````text
    "test:style-kit": "node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs",
````

3. In `internal/docs/operations/runbook.md` replace:

````text
npm run test:style-kit       # node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs
````

   with:

````text
npm run test:style-kit       # node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs
````

4. In `CLAUDE.md` replace:

````text
npm run test:style-kit         # unit test style-kit engine + style reference richness
````

   with:

````text
npm run test:style-kit         # unit test style-kit engine + style reference richness + paper pack licenses
````

5. In `AGENTS.md` replace:

````text
npm run test:style-kit         # unit test style-kit engine + style reference richness
````

   with:

````text
npm run test:style-kit         # unit test style-kit engine + style reference richness + paper pack licenses
````

Note: `test:style-kit` now includes `paper-pack.test.mjs`; `hand anchors` in that test read `SK.HAND` from `style-kit.js`, which Task 3 adds. Until Task 3, run only the first three tests:
`node --test --test-name-pattern "LICENSES|transparency|5 MB" scripts/paper-pack.test.mjs`
Expected: 3 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add scripts/paper-pack.test.mjs vendor/paper-pack templates/dena-video/index.html package.json internal/docs/operations/runbook.md CLAUDE.md AGENTS.md
git commit -m "feat: add the paper pack (CC0 textures, reviewed Codex objects) with license guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: style-kit v2 — stop-motion, paper, hand (TDD)

**Files:**
- Modify: `scripts/style-kit.test.mjs`, `vendor/style-kit/style-kit.js`, `vendor/style-kit/style-kit.css`

**Interfaces:**
- Consumes: `SK.boil`, `SK.stepTime`, `SK.rng`, `SK.tip`, `SK.len`, `M.eo`, `M.clamp` (existing).
- Produces:
  - `SK.STOP_FPS` = 15; `SK.onTwos(f, fps=15) → (t) => f(stepTime(t))`
  - `SK.piece(el, {x, y, r, s, o}, seed, t, {fps=15, amp=1.5})` — writes `transform` (+ `opacity` when `o` given)
  - `SK.cycle(t, n, fps=15) → 0..n-1`
  - `SK.torn(w, h, seed=1, {edges='trbl', amp=8, step=14}) → 'polygon(...)'`
  - `SK.grain(el, t, seed=1, {fps=15})` — writes `backgroundPosition`
  - `SK.HAND = {write:{src,w:664,h:720,tx:8,ty:711}, point:{src,w:697,h:720,tx:10,ty:705}}`
  - `SK.lastTip(t, items, {speed}) → {x, y, since} | null`
  - `SK.placeHand(imgEl, tip|null, {pose='write', scale=.55, last, hover=.5})`
  - CSS: `.sk-stop`, `.sk-cut`, `.sk-grain`, `.sk-hand-img`

- [ ] **Step 1: Append the failing tests**

Append to the end of `scripts/style-kit.test.mjs`:

````js
// ---- stop-motion, paper, and hand (sub-project 2a) ----

test('STOP_FPS holds each pose for two frames at 30 fps', () => {
  const { SK } = load();
  assert.equal(SK.STOP_FPS, 15);
  assert.equal(30 / SK.STOP_FPS, 2);
});

test('onTwos evaluates a curve on the step grid', () => {
  const { SK } = load();
  const f = SK.onTwos((t) => t * 10);
  assert.equal(f(0.05), 0);
  assert.equal(f(0.07), 10 / 15);
  assert.equal(f(0.1), 10 / 15);
});

test('piece places a pose with seeded jitter that holds within a step', () => {
  const { SK } = load();
  const a = fakeEl('a'), b = fakeEl('b');
  SK.piece(a, { x: 100, y: 200, r: 5, s: 1.2, o: 0.5 }, 3, 0.01);
  SK.piece(b, { x: 100, y: 200, r: 5, s: 1.2, o: 0.5 }, 3, 0.06);
  assert.equal(a.style.transform, b.style.transform);
  assert.match(a.style.transform, /^translate\(\d+\.\d{2}px,\d+\.\d{2}px\) rotate\(\d+\.\d{3}deg\) scale\(1\.2000\)$/);
  assert.equal(a.style.opacity, '0.5000');
  const [, x, y] = a.style.transform.match(/translate\(([\d.]+)px,([\d.]+)px/);
  assert.ok(Math.abs(x - 100) <= 1.5 && Math.abs(y - 200) <= 1.5);
  const c = fakeEl('c');
  SK.piece(c, { x: 100, y: 200 }, 3, 0.07);
  assert.notEqual(c.style.transform.split(' rotate')[0], a.style.transform.split(' rotate')[0]);
  SK.piece(c, { x: 0, y: 0 }, 3, 0.5, { amp: 0 });
  assert.equal(c.style.transform, 'translate(0.00px,0.00px) rotate(0.000deg) scale(1.0000)');
});

test('cycle picks a replacement drawing per step and repeats', () => {
  const { SK } = load();
  assert.equal(SK.cycle(0, 3), 0);
  assert.equal(SK.cycle(1 / 15, 3), 1);
  assert.equal(SK.cycle(2 / 15, 3), 2);
  assert.equal(SK.cycle(3 / 15, 3), 0);
  assert.equal(SK.cycle(0.5, 4, 12), 2);
});

test('torn builds a deterministic polygon that tears only the listed edges', () => {
  const { SK } = load();
  const p = SK.torn(200, 100, 5);
  assert.equal(p, SK.torn(200, 100, 5));
  assert.notEqual(p, SK.torn(200, 100, 6));
  assert.match(p, /^polygon\([\d.]+px [\d.-]+px(,[\d.-]+px [\d.-]+px)+\)$/);
  const pts = (s) => s.slice(8, -1).split(',').map((q) => q.split(' ').map(parseFloat));
  const onlyTop = pts(SK.torn(200, 100, 5, { edges: 't', amp: 10 }));
  assert.ok(onlyTop.some(([, y]) => y > 0 && y < 50), 'top edge torn inward');
  assert.ok(onlyTop.filter(([x]) => x > 150).every(([x]) => x === 200 || x < 200), 'right edge straight');
  for (const [x, y] of pts(p)) assert.ok(x >= -3 && x <= 203 && y >= -3 && y <= 103, `${x},${y}`);
});

test('grain jumps to a seeded offset each step', () => {
  const { SK } = load();
  const a = fakeEl('g'), b = fakeEl('g');
  SK.grain(a, 0.01, 2); SK.grain(b, 0.05, 2);
  assert.equal(a.style.backgroundPosition, b.style.backgroundPosition);
  assert.match(a.style.backgroundPosition, /^\d+px \d+px$/);
  SK.grain(b, 0.1, 2);
  assert.notEqual(a.style.backgroundPosition, b.style.backgroundPosition);
});

test('lastTip reports the end of the most recently finished stroke', () => {
  const { SK } = load();
  const a = fakePath(), b = fakePath();
  const items = [{ el: a, at: 0, dur: 1 }, { el: b, at: 1, dur: 1 }];
  assert.equal(SK.lastTip(0.5, items), null);
  const l = SK.lastTip(1.5, items);
  assert.equal(l.x, 100);
  assert.equal(l.since, 0.5);
  assert.equal(SK.lastTip(3, items).since, 1);
});

test('placeHand puts the pen tip on the tip, hovers, then glides off', () => {
  const { SK } = load();
  const img = fakeEl('img', { setAttribute(k, v) { this[k] = v; } });
  SK.placeHand(img, { x: 300, y: 400 });
  assert.equal(img.src, 'vendor/paper-pack/hand-write.png');
  const H = SK.HAND.write, s = 0.55;
  assert.equal(img.style.width, (H.w * s).toFixed(1) + 'px');
  assert.equal(img.style.transform, `translate(${(300 - H.tx * s).toFixed(2)}px,${(400 - H.ty * s).toFixed(2)}px)`);
  SK.placeHand(img, null, { last: { x: 300, y: 400, since: 0.2 } });
  assert.equal(img.style.transform, `translate(${(300 - H.tx * s).toFixed(2)}px,${(400 - H.ty * s).toFixed(2)}px)`, 'hovers first');
  SK.placeHand(img, null, { last: { x: 300, y: 400, since: 5 } });
  assert.equal(img.style.transform, `translate(${(1300 - H.tx * s).toFixed(2)}px,${(2200 - H.ty * s).toFixed(2)}px)`, 'gone');
  SK.placeHand(img, { x: 10, y: 10 }, { pose: 'point' });
  assert.equal(img.src, 'vendor/paper-pack/hand-point.png');
  assert.throws(() => SK.placeHand(img, null, { pose: 'wave' }), /unknown hand pose "wave"/);
});
````

Run: `node --test scripts/style-kit.test.mjs`
Expected: FAIL — the 8 new tests (`STOP_FPS`, `onTwos`, `piece`, `cycle`, `torn`, `grain`, `lastTip`, `placeHand`) fail; the 25 existing tests pass.

- [ ] **Step 2: Update the engine header and add the new section**

1. In `vendor/style-kit/style-kit.js` replace:

````text
/* style-kit: primitives for style b-roll clips (broll-text, motion-graphic, whiteboard)
   as HyperFrames sub-compositions. Spec: docs/superpowers/specs/2026-09-27-style-kit-design.md.
````

   with:

````text
/* style-kit: primitives for style b-roll clips (broll-text, motion-graphic, whiteboard, stop-motion)
   as HyperFrames sub-compositions. Specs: docs/superpowers/specs/2026-09-27-style-kit-design.md,
   docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md.
````

2. In `vendor/style-kit/style-kit.js` replace:

````text
// ---- camera --------------------------------------------------------------------------------
// point (fx,fy) of a .sk-cam layer sits at the frame centre, scaled by s
SK.cam = (el,s,fx=540,fy=960,W=1080,H=1920)=>{
  el.style.transformOrigin='0 0';
  el.style.transform=`translate(${(W/2-s*fx).toFixed(2)}px,${(H/2-s*fy).toFixed(2)}px) scale(${s.toFixed(5)})`;
};
})();
````

   with:

````text
// ---- camera --------------------------------------------------------------------------------
// point (fx,fy) of a .sk-cam layer sits at the frame centre, scaled by s
SK.cam = (el,s,fx=540,fy=960,W=1080,H=1920)=>{
  el.style.transformOrigin='0 0';
  el.style.transform=`translate(${(W/2-s*fx).toFixed(2)}px,${(H/2-s*fy).toFixed(2)}px) scale(${s.toFixed(5)})`;
};

// ---- stop-motion and paper (sub-project 2a) ------------------------------------------------
/* Stop-motion steps at 15 fps: HyperFrames renders at 30 fps, so every pose holds exactly two
   frames ("on twos"); 12 fps would hold an uneven 3:2 pattern at 30 fps. */
SK.STOP_FPS = 15;
// wrap a curve f(t) so it is evaluated on the step grid: SK.onTwos(M.track(...))(t)
SK.onTwos = (f,fps=SK.STOP_FPS)=>t=>f(SK.stepTime(t,fps));
/* piece: place a cut-out at pose {x, y, r (deg), s, o} plus replacement jitter — a new seeded
   offset every step (±amp px, ±0.35·amp deg), like a hand nudging paper between frames. */
SK.piece = (el,pose,seed,t,o={})=>{
  const b=SK.boil(seed,t,o.amp??1.5,o.fps||SK.STOP_FPS);
  const x=(pose.x||0)+b.x, y=(pose.y||0)+b.y, r=(pose.r||0)+b.r, s=pose.s??1;
  el.style.transform=`translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  if(pose.o!=null) el.style.opacity=clamp(pose.o).toFixed(4);
};
// replacement animation: which of n drawings shows at time t (0..n-1, repeating)
SK.cycle = (t,n,fps=SK.STOP_FPS)=>((Math.floor(t*fps+1e-9)%n)+n)%n;
/* torn: clip-path polygon for a w×h piece; the listed edges ('t','r','b','l') tear inward by up
   to amp px every ~step px, the others stay straight cut. Deterministic per seed. */
SK.torn = (w,h,seed=1,o={})=>{
  const edges=o.edges??'trbl', amp=o.amp??8, step=o.step??14, r=SK.rng(mix(seed,23)), pts=[];
  const side=(k,x0,y0,x1,y1,nx,ny)=>{
    const L=Math.hypot(x1-x0,y1-y0), n=Math.max(1,Math.round(L/step));
    for(let i=0;i<n;i++){
      const u=i/n, d=edges.includes(k)&&i>0?r()*amp:0, j=edges.includes(k)&&i>0?(r()-0.5)*step*0.4:0;
      pts.push([x0+(x1-x0)*u+nx*d+(ny?j:0), y0+(y1-y0)*u+ny*d+(nx?j:0)]);
    }
  };
  side('t',0,0,w,0,0,1); side('r',w,0,w,h,-1,0); side('b',w,h,0,h,0,-1); side('l',0,h,0,0,1,0);
  return `polygon(${pts.map(([x,y])=>`${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
};
// living grain: shift a .sk-grain overlay to a new seeded offset every step
SK.grain = (el,t,seed=1,o={})=>{
  const r=SK.rng(mix(seed,Math.floor(t*(o.fps||SK.STOP_FPS)+1e-9)));
  el.style.backgroundPosition=`${Math.floor(r()*256)}px ${Math.floor(r()*256)}px`;
};

// ---- whiteboard hand ------------------------------------------------------------------------
/* Flat hand PNGs from vendor/paper-pack; tx/ty is the pen tip (write) or fingertip (point) in
   the image's own pixels, measured once from the asset. */
SK.HAND = {
  write:{src:'vendor/paper-pack/hand-write.png', w:664, h:720, tx:8, ty:711},
  point:{src:'vendor/paper-pack/hand-point.png', w:697, h:720, tx:10, ty:705},
};
// the end point of the most recently finished stroke and the seconds since it finished
SK.lastTip = (t,items,o={})=>{
  let best=null;
  for(const it of items){
    const end=it.at+(it.dur??SK.len(it.el)/(o.speed||750));
    if(end<=t&&(!best||end>best.end)) best={end,el:it.el};
  }
  if(!best) return null;
  const p=SK.tip(best.el,1);
  return {x:p.x, y:p.y, since:t-best.end};
};
/* placeHand: el is an <img class="sk-hand-img">. With a tip the pen sits on it; without one the
   hand hovers at o.last for o.hover seconds (default 0.5), then glides off the bottom-right over
   0.4 s; with neither it stays off-frame. o.scale sizes the hand (default 0.55). */
SK.placeHand = (el,tip,o={})=>{
  const H=SK.HAND[o.pose||'write'], s=o.scale??0.55;
  if(!H) throw new Error(`style-kit: unknown hand pose "${o.pose}"`);
  if(el._skHand!==H.src){el.setAttribute('src',H.src); el._skHand=H.src;}
  let p=tip;
  if(!p&&o.last){
    const k=M.eo((o.last.since-(o.hover??0.5))/0.4);
    p={x:o.last.x+(1300-o.last.x)*k, y:o.last.y+(2200-o.last.y)*k};
  }
  if(!p) p={x:1300, y:2200};
  el.style.width=(H.w*s).toFixed(1)+'px';
  el.style.transform=`translate(${(p.x-H.tx*s).toFixed(2)}px,${(p.y-H.ty*s).toFixed(2)}px)`;
};
})();
````

- [ ] **Step 3: Add the CSS**

Append to the end of `vendor/style-kit/style-kit.css`:

````css
/* paper and stop-motion (sub-project 2a); paper backgrounds live in vendor/paper-pack/paper-pack.css */
.sk-stop { --sk-bg: #c4965a; --sk-ink: #2b2118; --sk-accent: #b5452b; --sk-accent-2: #2f6f8f; --sk-muted: #8a7355; font-family: 'Geist', system-ui, sans-serif; }
.sk-cut { filter: drop-shadow(3px 5px 1px rgba(40,25,10,.32)); }
.sk-grain { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; pointer-events: none; mix-blend-mode: multiply; opacity: .16;
  background-size: 256px 256px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .3 0 0 0 0 .25 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)'/%3E%3C/svg%3E"); }
.sk-hand-img { position: absolute; left: 0; top: 0; transform-origin: 0 0; z-index: 11; filter: drop-shadow(0 8px 10px rgba(0,0,0,.18)); }
````

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/style-kit.test.mjs scripts/paper-pack.test.mjs && npm run test:motion-kit`
Expected: 37 pass / 0 fail, then 15 pass / 0 fail.

- [ ] **Step 5: Commit**

```bash
git add scripts/style-kit.test.mjs vendor/style-kit/style-kit.js vendor/style-kit/style-kit.css
git commit -m "feat: add stop-motion, paper, and whiteboard-hand primitives to style-kit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Five examples (four stop-motion, one hand)

**Files:**
- Create: `docs/agents/references/style-examples/assets/{cut-laptop,cut-phone}.png`, `compositions/{sm-01-slide-pin,sm-02-tear-split,sm-03-replace-panel,sm-04-stack-crumple,wb-05-hand}.html`
- Modify: `docs/agents/references/style-examples/index.html`, `snapshots.json`, `scripts/check-broll-examples.mjs`

**Interfaces:**
- Consumes: Task 2 classes, Task 3 functions.
- Produces: example paths listed by Task 5's `stop-motion.md` and `whiteboard.md`.

Timeline (host seconds): sm-01 74.5–80.5 cutaway · sm-02 81–87 split · sm-03 87.5–92.5 panel · sm-04 93–99 cutaway · wb-05 99.5–105.5 cutaway.

- [ ] **Step 1: Copy the reviewed cut-outs and make the check copy the paper pack**

```bash
mkdir -p docs/agents/references/style-examples/assets
cp /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a/example-assets/* docs/agents/references/style-examples/assets/
```

1. In `scripts/check-broll-examples.mjs` replace:

````text
  cpSync('vendor/style-kit', join(dir, 'vendor/style-kit'), { recursive: true });
````

   with:

````text
  cpSync('vendor/style-kit', join(dir, 'vendor/style-kit'), { recursive: true });
  cpSync('vendor/paper-pack', join(dir, 'vendor/paper-pack'), { recursive: true });
````

- [ ] **Step 2: Write the clips**

Create `docs/agents/references/style-examples/compositions/sm-01-slide-pin.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the notes and label are invented to show the mechanism. In a real clip every word comes from the transcript (Gate 2 R1). The laptop is a Codex paper cut-out (assets/cut-laptop.png). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        .note { width: 250px; height: 248px; }
        .note .bg { left: 0; top: 0; width: 250px; }
        .note span { position: absolute; left: 0; right: 0; top: 78px; text-align: center; font-size: 64px; font-weight: 700; color: #2b2118; }
        .note .pin { left: 100px; top: -34px; width: 46px; }
        #label { width: 760px; height: 170px; }
        #labelPaper { position: absolute; inset: 0; }
        #labelPaper span { position: absolute; left: 0; right: 0; top: 30px; text-align: center; font-size: 104px; color: var(--sk-accent); }
        #tapeL, #tapeR { position: absolute; top: -26px; width: 190px; }
      </style>
      <div id="root" data-composition-id="sm-01-slide-pin" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-kraft">
          <img class="p sk-cut" id="laptop" src="assets/cut-laptop.png" alt="" style="width:760px" />
          <div class="p note sk-cut" id="n0"><div class="bg sk-sticky"></div><span class="sk-hand">chat</span><div class="pin sk-pin"></div></div>
          <div class="p note sk-cut" id="n1"><div class="bg sk-sticky"></div><span class="sk-hand">invoice</span><div class="pin sk-pin"></div></div>
          <div class="p note sk-cut" id="n2"><div class="bg sk-sticky"></div><span class="sk-hand">stok</span><div class="pin sk-pin"></div></div>
          <div class="p sk-cut" id="label">
            <div id="labelPaper" class="sk-paper-cream"><span class="sk-display">semua manual</span></div>
            <div class="sk-tape-a" id="tapeL" style="left:-40px;transform:rotate(-24deg)"></div>
            <div class="sk-tape-b" id="tapeR" style="left:610px;transform:rotate(20deg)"></div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-01-slide-pin';
          const $ = SK.finder(ID);
          $('labelPaper').style.clipPath = SK.torn(760, 170, 4, { edges: 'lr', amp: 12 });
          // laptop slides in from the left on twos and lands with a one-step overshoot
          const lx = SK.onTwos(M.track(-900, [[0.2, 160, [14, 0.7]]]));
          const NOTES = [[1.6, 90, 1030, -5], [2.3, 415, 1060, 3], [3.0, 740, 1025, -3]];
          const drop = NOTES.map(([at]) => SK.onTwos(M.track(1, [[at, 0, [26, 0.6]]])));
          const lab = SK.onTwos(M.track(1, [[4.1, 0, [22, 0.7]]]));
          SK.clip(ID, { T: 6, update: (t) => {
            SK.piece($('laptop'), { x: lx(t), y: 300 }, 1, t);
            NOTES.forEach(([at, x, y, r], i) => {
              const k = drop[i](t);
              SK.piece($('n' + i), { x, y: y - 140 * k, r: r - 10 * k, s: 1 + 0.25 * k, o: t >= at ? 1 : 0 }, 10 + i, t);
            });
            const k = lab(t);
            SK.piece($('label'), { x: 160, y: 1420 + 260 * k, r: -2 + 6 * k, o: t >= 4.1 ? 1 : 0 }, 20, t);
            SK.grain($('grain'), t, 3);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/sm-02-tear-split.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words are invented to show the mechanism. In a real clip every word comes from the transcript (Gate 2 R1). The phone is a Codex paper cut-out (assets/cut-phone.png). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #half { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; overflow: hidden; }
        .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        #word { font-size: 250px; line-height: 1; color: var(--sk-accent); }
        #sub { font-size: 84px; font-weight: 700; color: var(--sk-ink); }
        #cover { width: 940px; height: 470px; }
        #coverPaper { position: absolute; inset: 0; }
        #cover .tp { top: -30px; width: 210px; }
        #phone { width: 250px; }
      </style>
      <div id="root" data-composition-id="sm-02-tear-split" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop">
          <div id="half" class="sk-paper-cream">
            <div class="p sk-display" id="word">SISTEM</div>
            <div class="p sk-hand" id="sub">yang jalan sendiri</div>
            <img class="p sk-cut" id="phone" src="assets/cut-phone.png" alt="" />
            <div class="p sk-cut" id="cover">
              <div id="coverPaper" class="sk-kraft-ribbed"></div>
              <div class="tp sk-tape-a" style="left:-50px;transform:rotate(-30deg)"></div>
              <div class="tp sk-tape-b" style="left:780px;transform:rotate(28deg)"></div>
            </div>
            <div class="sk-grain" id="grain"></div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-02-tear-split';
          const $ = SK.finder(ID);
          $('coverPaper').style.clipPath = SK.torn(940, 470, 8, { edges: 'b', amp: 26, step: 22 });
          // tear-reveal: the cover is ripped up and away in visible steps
          const tear = SK.onTwos(M.track(0, [[1.2, 1, [9, 0.95]]]));
          const pop = SK.onTwos(M.track(0, [[2.6, 1, [24, 0.55]]]));
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            $('half').style.transform = `translateY(${(-(1 - M.eo(t / 0.3)) * 960).toFixed(2)}px)`;
            const k = tear(t);
            SK.piece($('cover'), { x: 70 - 120 * k, y: 200 - 820 * k, r: -14 * k }, 2, t);
            SK.piece($('word'), { x: 110, y: 250 }, 3, t, { amp: 1 });
            SK.piece($('sub'), { x: 120, y: 520, o: t >= 3.4 ? 1 : 0 }, 4, t, { amp: 1 });
            const p = pop(t);
            SK.piece($('phone'), { x: 760, y: 470, s: Math.max(0.01, p), r: 6, o: t >= 2.6 ? 1 : 0 }, 5, t);
            SK.grain($('grain'), t, 4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/sm-03-replace-panel.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the quotes are invented to show the mechanism. In a real clip every quote comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #card { position: absolute; left: 70px; top: 150px; width: 940px; height: 560px; transform-origin: 50% 0%; }
        #cardPaper { position: absolute; inset: 0; }
        #card > .tp { top: -28px; width: 200px; }
        #head { position: absolute; left: 70px; top: 120px; width: 300px; height: 380px; }
        .bubble { position: absolute; left: 400px; top: 110px; width: 490px; height: 260px; }
        .bubble .bp { position: absolute; inset: 0; background: #fbfbf8; }
        .bubble span { position: absolute; left: 30px; right: 30px; top: 58px; text-align: center; font-size: 66px; font-weight: 700; line-height: 1; color: #2b2118; }
        #b1 span { color: var(--sk-accent-2); }
      </style>
      <div id="root" data-composition-id="sm-03-replace-panel" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-stop">
          <div id="card" class="sk-cut">
            <div id="cardPaper" class="sk-paper-cream"></div>
            <div class="tp sk-tape-b" style="left:370px;transform:rotate(-3deg)"></div>
            <svg id="head" viewBox="0 0 300 380" width="300" height="380">
              <path d="M40 380 C40 290 90 250 150 250 C210 250 260 290 260 380 Z" fill="#2f6f8f" />
              <ellipse cx="150" cy="150" rx="105" ry="120" fill="#e8b48a" />
              <path d="M45 120 C50 40 110 20 160 25 C220 30 262 70 255 130 C230 90 180 80 140 85 C100 90 70 100 45 120 Z" fill="#2b2118" />
              <ellipse cx="112" cy="150" rx="11" ry="14" fill="#2b2118" />
              <ellipse cx="188" cy="150" rx="11" ry="14" fill="#2b2118" />
              <path id="m0" d="M118 215 Q150 222 182 215" stroke="#2b2118" stroke-width="7" fill="none" stroke-linecap="round" />
              <path id="m1" d="M120 208 Q150 250 180 208 Z" fill="#7a2e22" />
              <path id="m2" d="M126 205 Q150 268 174 205 Z" fill="#7a2e22" />
            </svg>
            <div class="bubble sk-cut" id="b0"><div class="bp" id="bp0"></div><span class="sk-hand">klien nanya lagi</span></div>
            <div class="bubble sk-cut" id="b1"><div class="bp" id="bp1"></div><span class="sk-hand">udah dicatat</span></div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-03-replace-panel';
          const $ = SK.finder(ID);
          $('cardPaper').style.clipPath = SK.torn(940, 560, 12, { edges: 'lrb', amp: 10 });
          const BUBBLE = 'polygon(0px 0px,490px 0px,490px 210px,120px 210px,60px 262px,70px 210px,0px 210px)';
          $('bp0').style.clipPath = BUBBLE; $('bp1').style.clipPath = BUBBLE;
          const card = SK.onTwos(M.track(0, [[0.1, 1, [20, 0.7]]]));
          const TALK = [[0.8, 2.4], [3.3, 4.3]];
          SK.clip(ID, { T: 5, bg: null, update: (t) => {
            const c = card(t);
            SK.piece($('card'), { x: 0, y: -40 * (1 - c), r: -3 * (1 - c), s: 0.9 + 0.1 * c, o: c > 0.05 ? 1 : 0 }, 1, t);
            // replacement-face: one mouth drawing per step while talking, closed otherwise
            const talking = TALK.some(([a, b]) => t >= a && t < b);
            const m = talking ? [1, 2, 0, 2][SK.cycle(t, 4)] : 0;
            for (let i = 0; i < 3; i++) $('m' + i).style.opacity = i === m ? '1' : '0';
            // pin-and-swap: the second bubble replaces the first with no in-between
            SK.piece($('b0'), { x: 0, y: 0, r: -2, o: t >= 1.0 && t < 3.2 ? 1 : 0 }, 6, t);
            SK.piece($('b1'), { x: 0, y: 0, r: 2, o: t >= 3.2 ? 1 : 0 }, 7, t);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/sm-04-stack-crumple.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words are invented to show the mechanism. In a real clip every word comes from the transcript (Gate 2 R1). The phone is a Codex paper cut-out (assets/cut-phone.png). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        .card { width: 600px; height: 330px; }
        .card .cp { position: absolute; inset: 0; }
        .card span { position: absolute; left: 150px; top: 96px; font-size: 104px; font-weight: 700; color: #2b2118; }
        #ball { width: 230px; height: 230px; border-radius: 50%; }
        #phone { width: 300px; }
        #label { width: 640px; height: 150px; }
        #labelPaper { position: absolute; inset: 0; }
        #labelPaper span { position: absolute; left: 0; right: 0; top: 26px; text-align: center; font-size: 96px; color: var(--sk-accent); }
        #label .tp { top: -26px; width: 170px; }
      </style>
      <div id="root" data-composition-id="sm-04-stack-crumple" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-kraft-dark">
          <div class="p card sk-cut" id="c0"><div class="cp sk-lined" id="cp0"></div><span class="sk-hand">nota</span></div>
          <div class="p card sk-cut" id="c1"><div class="cp sk-lined" id="cp1"></div><span class="sk-hand">chat</span></div>
          <div class="p card sk-cut" id="c2"><div class="cp sk-lined" id="cp2"></div><span class="sk-hand">excel</span></div>
          <div class="p card sk-cut" id="c3"><div class="cp sk-lined" id="cp3"></div><span class="sk-hand">catatan</span></div>
          <div class="p sk-cut sk-paper-crumpled" id="ball"></div>
          <img class="p sk-cut" id="phone" src="assets/cut-phone.png" alt="" />
          <div class="p sk-cut" id="label">
            <div id="labelPaper" class="sk-paper-cream"><span class="sk-display">cukup satu</span></div>
            <div class="tp sk-tape-a" style="left:-30px;transform:rotate(-18deg)"></div>
            <div class="tp sk-tape-b" style="left:500px;transform:rotate(16deg)"></div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-04-stack-crumple';
          const $ = SK.finder(ID);
          for (let i = 0; i < 4; i++) $('cp' + i).style.clipPath = SK.torn(600, 330, 30 + i, { edges: 'tb', amp: 9 });
          $('labelPaper').style.clipPath = SK.torn(640, 150, 41, { edges: 'lr', amp: 12 });
          // stack-pile: each card drops onto the pile on its word, never perfectly aligned
          const DROP = [[0.4, 240, 900, -6], [0.9, 250, 870, 4], [1.4, 225, 845, -3], [1.9, 245, 815, 7]];
          const fall = DROP.map(([at]) => SK.onTwos(M.track(1, [[at, 0, [24, 0.65]]])));
          // crumple-away: two replacement states (card, ball), then the ball leaves in steps
          const away = SK.onTwos(M.track(0, [[3.3, 1, [10, 0.9]]]));
          const slide = SK.onTwos(M.track(1400, [[3.9, 390, [14, 0.7]]]));
          const lab = SK.onTwos(M.track(1, [[4.7, 0, [22, 0.7]]]));
          SK.clip(ID, { T: 6, update: (t) => {
            DROP.forEach(([at, x, y, r], i) => {
              const k = fall[i](t);
              const crumpled = i === 3 && t >= 2.9;
              SK.piece($('c' + i), { x, y: y - 700 * k, r: r + 12 * k, o: t >= at && !crumpled ? 1 : 0 }, 30 + i, t);
            });
            const a = away(t);
            const state = t < 2.9 ? 0 : t < 3.1 ? 1 : 2;
            SK.piece($('ball'), { x: 430 - 700 * a, y: 700 + 500 * a, r: -200 * a, s: state === 1 ? 1.6 : 1, o: state ? 1 : 0 }, 44, t);
            SK.piece($('phone'), { x: slide(t), y: 250, r: -4 }, 45, t);
            const k = lab(t);
            SK.piece($('label'), { x: 220, y: 1320 + 240 * k, r: 3 - 6 * k, o: t >= 4.7 ? 1 : 0 }, 46, t);
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/wb-05-hand.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: labels are invented to show the mechanism. In a real clip every label comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .lab { position: absolute; width: 560px; text-align: center; font-size: 110px; font-weight: 700; line-height: 1; }
      </style>
      <div id="root" data-composition-id="wb-05-hand" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-wb">
          <svg class="sk-full" viewBox="0 0 1080 1920" width="1080" height="1920" id="ink"></svg>
          <div class="lab" id="l0" style="left:260px;top:520px">Ide</div>
          <div class="lab" id="l1" style="left:260px;top:1150px">Sistem</div>
          <img class="sk-hand-img" id="hand" alt="" />
        </div>
      </div>
      <script>
        (() => {
          const ID = 'wb-05-hand';
          const $ = SK.finder(ID);
          const ar = SK.arrow(540, 700, 540, 1040, 51);
          $('ink').innerHTML =
            `<path id="o" class="sk-stroke" d="${SK.ellipse(540, 575, 230, 120, 50)}"/>` +
            `<path id="s" class="sk-stroke" d="${ar.shaft}"/><path id="h" class="sk-stroke" d="${ar.head}"/>` +
            `<path id="b" class="sk-stroke" d="${SK.rect(250, 1100, 580, 200, 52)}"/>`;
          const PEN = { speed: 1100, boil: 1 };
          const S = [{ el: $('o'), at: 0.3 }, { el: $('s'), at: 1.9 }, { el: $('h'), at: 2.25, dur: 0.15 }, { el: $('b'), at: 2.5 }];
          const W = [['l0', 1.45, 0.35, 470, 610, 610], ['l1', 4.0, 0.6, 390, 690, 1245]];
          const POINT = [4.8, 5.4];
          // where the pen last lifted: the latest finished stroke or written word
          const lastOf = (t) => {
            let best = SK.lastTip(t, S, PEN);
            for (const [, at, dur, , x1, y] of W) {
              const end = at + dur;
              if (end <= t && (!best || t - end < best.since)) best = { x: x1, y, since: t - end };
            }
            return best;
          };
          SK.clip(ID, { T: 6, update: (t) => {
            let tip = SK.drawSeq(t, S, PEN);
            W.forEach(([id, at, dur, x0, x1, y]) => {
              const u = SK.smooth((t - at) / dur);
              SK.write($(id), u);
              if (u > 0 && u < 1) tip = SK.writeTip(x0, x1, y, u);
            });
            if (t >= POINT[0] && t < POINT[1]) {
              SK.placeHand($('hand'), { x: 840, y: 1210 }, { pose: 'point' });
            } else {
              const last = t >= POINT[1] ? { x: 840, y: 1210, since: t - POINT[1] } : lastOf(t);
              SK.placeHand($('hand'), tip, { last, hover: t >= POINT[1] ? 0 : 0.5 });
            }
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

- [ ] **Step 3: Replace the example host and snapshot times**

Replace `docs/agents/references/style-examples/index.html` with:

````html
<!doctype html>
<html lang="id">
  <head>
    <!-- vendor/ is copied in by scripts/check-broll-examples.mjs; this folder has no vendor/ of its own. -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="vendor/gsap.min.js"></script>
    <script src="vendor/motion-kit/motion-kit.js"></script>
    <script src="vendor/style-kit/style-kit.js"></script>
    <link rel="stylesheet" href="vendor/motion-kit/motion-kit.css" />
    <link rel="stylesheet" href="vendor/style-kit/style-kit.css" />
    <link rel="stylesheet" href="vendor/paper-pack/paper-pack.css" />
    <style>
      body { margin: 0; background: #050505; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #050505; }
      #base-video { position: absolute; inset: 0; background: #3f3f46; z-index: 1; }
      #face { position: absolute; left: 290px; top: 700px; width: 500px; height: 560px; border-radius: 240px; background: #52525b; }
      #face-label { position: absolute; left: 0; right: 0; top: 1300px; text-align: center; font: 600 32px Arial, sans-serif; color: #d4d4d8; }
      .broll { position: absolute; inset: 0; z-index: 22; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="style-examples" data-start="0" data-width="1080" data-height="1920" data-duration="106">
      <div id="base-video" class="clip" data-start="0" data-duration="106" data-track-index="1">
        <div id="face"></div>
        <div id="face-label">placeholder wajah</div>
      </div>
      <div id="tx-01-slam-mount" class="broll" data-composition-id="tx-01-slam" data-composition-src="compositions/tx-01-slam.html"
           data-start="0.5" data-duration="4" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="tx-02-quote-split-mount" class="broll" data-composition-id="tx-02-quote-split" data-composition-src="compositions/tx-02-quote-split.html"
           data-start="5" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="tx-03-word-swap-mount" class="broll" data-composition-id="tx-03-word-swap" data-composition-src="compositions/tx-03-word-swap.html"
           data-start="11.5" data-duration="4.5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="tx-04-stack-mount" class="broll" data-composition-id="tx-04-stack" data-composition-src="compositions/tx-04-stack.html"
           data-start="16.5" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="mg-01-count-mount" class="broll" data-composition-id="mg-01-count" data-composition-src="compositions/mg-01-count.html"
           data-start="22" data-duration="5.5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="mg-02-compare-bars-mount" class="broll" data-composition-id="mg-02-compare-bars" data-composition-src="compositions/mg-02-compare-bars.html"
           data-start="28" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="mg-03-icon-grid-mount" class="broll" data-composition-id="mg-03-icon-grid" data-composition-src="compositions/mg-03-icon-grid.html"
           data-start="34.5" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="mg-04-arrow-flow-mount" class="broll" data-composition-id="mg-04-arrow-flow" data-composition-src="compositions/mg-04-arrow-flow.html"
           data-start="41" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="wb-01-flow-mount" class="broll" data-composition-id="wb-01-flow" data-composition-src="compositions/wb-01-flow.html"
           data-start="47.5" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="wb-02-framework-panel-mount" class="broll" data-composition-id="wb-02-framework-panel" data-composition-src="compositions/wb-02-framework-panel.html"
           data-start="54" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="wb-03-mind-map-mount" class="broll" data-composition-id="wb-03-mind-map" data-composition-src="compositions/wb-03-mind-map.html"
           data-start="60.5" data-duration="7" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="wb-04-cross-out-mount" class="broll" data-composition-id="wb-04-cross-out" data-composition-src="compositions/wb-04-cross-out.html"
           data-start="68" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="sm-01-slide-pin-mount" class="broll" data-composition-id="sm-01-slide-pin" data-composition-src="compositions/sm-01-slide-pin.html"
           data-start="74.5" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="sm-02-tear-split-mount" class="broll" data-composition-id="sm-02-tear-split" data-composition-src="compositions/sm-02-tear-split.html"
           data-start="81" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="sm-03-replace-panel-mount" class="broll" data-composition-id="sm-03-replace-panel" data-composition-src="compositions/sm-03-replace-panel.html"
           data-start="87.5" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="sm-04-stack-crumple-mount" class="broll" data-composition-id="sm-04-stack-crumple" data-composition-src="compositions/sm-04-stack-crumple.html"
           data-start="93" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="wb-05-hand-mount" class="broll" data-composition-id="wb-05-hand" data-composition-src="compositions/wb-05-hand.html"
           data-start="99.5" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // Split treatment (tx-02, mg-02, wb-03, sm-02): slide the base video into the bottom half, then back.
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 5);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 10.55);
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 28);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 33.55);
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 60.5);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 67.05);
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 81);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 86.55);
      window.__timelines['style-examples'] = tl;
    </script>
  </body>
</html>
````

Replace `docs/agents/references/style-examples/snapshots.json` with:

````json
{"at": [1.2, 4.2, 7.0, 10.7, 13.5, 15.6, 18.0, 21.2, 23.2, 27.2, 29.5, 33.7, 35.5, 40.2, 43.0, 46.7, 49.5, 53.2, 56.0, 59.7, 63.0, 67.2, 70.9, 73.7, 77.3, 80.2, 82.5, 86.7, 89.3, 92.2, 95.2, 98.7, 101.5, 104.6, 105.4]}
````

- [ ] **Step 4: Run the check**

Save the previous stills first, then check:
```bash
rm -rf /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a/before-stills && cp -R renders/style-examples /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a/before-stills 2>/dev/null || true
npm run check:style-examples
```
Expected: lint `0 errors, 0 warnings`; validate `0 error(s), 0 warning(s)` plus 5 contrast warnings on `placeholder wajah`; `35 snapshots saved`.

- [ ] **Step 5: Review the stills**

Open `renders/style-examples/contact-sheet-3.jpg` and `-4.jpg` and confirm:
- 77.3 s sm-01: kraft ground, paper laptop, "chat" and "invoice" sticky notes pinned; 80.2 s: three notes and the taped "SEMUA MANUAL" label.
- 82.5 s sm-02: cream top half, the torn kraft cover mid-rip over "SISTEM", face in the bottom half; 86.7 s: "SISTEM", "yang jalan sendiri", the paper phone.
- 89.3 s sm-03: taped cream card above the face, paper figure with open mouth, "klien nanya lagi"; 92.2 s: mouth closed, "udah dicatat".
- 95.2 s sm-04: four torn lined cards piled, "catatan" on top; 98.7 s: "excel" on top, phone above, taped "CUKUP SATU".
- 101.5 s wb-05: "Ide" circled, the flat hand's pen tip on the arrow start; 104.6 s: the hand points at the "Sistem" box; 105.4 s: the hand is gone.
- Shadows are hard and point the same way; grain is subtle; no frame shows a leftover from another clip.

If `/private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a/before-stills` exists, prove the old 24 stills did not change:
```bash
for f in /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a/before-stills/frame-{0,1}*.png /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2a/before-stills/frame-2[0-3]*.png; do cmp -s "$f" "renders/style-examples/$(basename "$f")" || echo "CHANGED $(basename "$f")"; done
```
Expected: no `CHANGED` lines (PNG bytes can differ if the encoder differs; if a line appears, compare the two images visually before continuing).

- [ ] **Step 6: Regression and commit**

Run: `npm run check:broll-examples`
Expected: `0 errors`, 12 snapshots.

```bash
git add docs/agents/references/style-examples scripts/check-broll-examples.mjs
git commit -m "feat: add stop-motion and whiteboard-hand examples

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Stop-motion reference, menu, whiteboard hand, Style Assets

**Files:**
- Create: `docs/agents/references/styles/stop-motion.md`
- Modify: `scripts/style-docs.test.mjs`, `docs/agents/references/styles/README.md`, `docs/agents/references/styles/whiteboard.md`, `docs/agents/references/asset-production.md`

**Interfaces:**
- Consumes: example paths from Task 4.
- Produces: `stop-motion` is `available` in the menu; brief fields `Pen:` and `Assets:`; section `## Style Assets` in `asset-production.md` (Task 6 wiring points at it).

- [ ] **Step 1: Extend the richness test (red)**

1. In `scripts/style-docs.test.mjs` replace:

````text
  { file: 'whiteboard.md', patterns: 10, refs: 6, prefix: 'wb-' },
````

   with:

````text
  { file: 'whiteboard.md', patterns: 10, refs: 6, prefix: 'wb-' },
  { file: 'stop-motion.md', patterns: 12, refs: 6, prefix: 'sm-' },
````

2. In `scripts/style-docs.test.mjs` replace:

````text
  test(`${s.file}: 4 examples that exist and cover cutaway, split, and panel`, () => {
    const rows = section(md, 'Examples').split('\n').filter((l) => l.startsWith('| `style-examples/'));
    assert.equal(rows.length, 4);
````

   with:

````text
  test(`${s.file}: at least 4 examples that exist and cover cutaway, split, and panel`, () => {
    const rows = section(md, 'Examples').split('\n').filter((l) => l.startsWith('| `style-examples/'));
    assert.ok(rows.length >= 4, `${rows.length} examples`);
````

3. In `scripts/style-docs.test.mjs` replace:

````text
test('every example clip is mounted in the example host', () => {
  const host = readFileSync(new URL('style-examples/index.html', REF), 'utf8');
  const clips = [...host.matchAll(/data-composition-src="compositions\/([^"]+)"/g)].map((m) => m[1]);
  assert.equal(clips.length, 12);
  for (const c of clips) assert.ok(existsSync(new URL('style-examples/compositions/' + c, REF)), c);
});
````

   with:

````text
test('every example clip on disk is mounted in the example host, and every mount exists', () => {
  const host = readFileSync(new URL('style-examples/index.html', REF), 'utf8');
  const clips = [...host.matchAll(/data-composition-src="compositions\/([^"]+)"/g)].map((m) => m[1]);
  const onDisk = readdirSync(new URL('style-examples/compositions/', REF)).filter((f) => f.endsWith('.html'));
  assert.deepEqual([...clips].sort(), [...onDisk].sort());
  assert.equal(clips.length, 17);
});
````

4. In `scripts/style-docs.test.mjs` replace:

````text
import { existsSync, readFileSync } from 'node:fs';
````

   with:

````text
import { existsSync, readdirSync, readFileSync } from 'node:fs';
````

Run: `node --test scripts/style-docs.test.mjs`
Expected: FAIL — `ENOENT … styles/stop-motion.md`.

- [ ] **Step 2: Write the stop-motion reference**

Every reference URL below was opened during research on 2026-09-27. Do not add references without opening their URL.

Create `docs/agents/references/styles/stop-motion.md`:

````markdown
# Stop-motion (Style Reference)

Paper cut-outs animated in visible steps: pieces slide, drop, tear, pop up, and
swap drawings, each resting pose held for two frames and nudged a little between
frames, with hard paper shadows, torn edges, tape, and pins. Loaded by
`docs/agents/02-screen-plan.md` (visual step, after `styles/README.md`) and
`docs/agents/03-build.md` (author step). Engine: `vendor/style-kit/`
(`window.SK`) on top of `vendor/motion-kit/` (`window.M`); paper textures and
objects: `vendor/paper-pack/` (`paper-pack.css`, licenses in `LICENSES.md`).
Worked examples: `docs/agents/references/style-examples/` (`sm-01` … `sm-04`,
`npm run check:style-examples`).

## When To Use

Use `stop-motion` for a line that is **physical, manual, or handmade**:

- a manual process or a pile of work ("nota, chat, excel, catatan");
- a story with concrete objects (a laptop, a phone, a receipt, a sticky note);
- a before → after told as objects being swapped, torn away, or crumpled;
- a warm, human, founder-diary tone where a clean UI look would feel cold.

Do not use it for:

- a tool or UI action (use `motion-broll`), a precise number (use
  `motion-graphic`), a punchline that needs pure type (use `broll-text`);
- a personal, emotional, or opinion line (keep Dena's face);
- anything that needs real proof — a paper cut-out is always illustrative.

Objects are cut-outs from the paper pack, pieces drawn in code (SVG + paper
texture + `SK.torn`), or per-video cut-outs listed in the brief's `Assets:`
(see Style Assets in `asset-production.md`). Never generate Dena's likeness;
a Dena cut-out comes only from her footage.

## Look

| Token | Default (`.sk-stop`) | Alt A "notebook" | Alt B "night desk" | Alt C "blueprint paper" |
| --- | --- | --- | --- | --- |
| background class | `.sk-kraft` | `.sk-lined` | `.sk-kraft-dark` | `.sk-grid` |
| `--sk-ink` | `#2b2118` | `#1f2937` | `#f5efe6` | `#1e3a5f` |
| `--sk-accent` | `#b5452b` | `#dc2626` | `#f59e0b` | `#b5452b` |
| `--sk-accent-2` | `#2f6f8f` | `#2563eb` | `#7dd3fc` | `#2f6f8f` |
| `--sk-muted` | `#8a7355` | `#9ca3af` | `#a8a29e` | `#7ea3d4` |

- Palette is free per clip; write the background class and hex values in the
  brief's `Palette:`.
- Paper backgrounds: `.sk-paper-white`, `.sk-paper-cream`, `.sk-paper-grey`,
  `.sk-paper-crumpled`, `.sk-kraft`, `.sk-kraft-ribbed`, `.sk-kraft-dark`,
  `.sk-lined`, `.sk-grid`, `.sk-newsprint` (`paper-pack.css`, loaded after
  `style-kit.css`). Give each piece its own paper; one texture everywhere reads
  digital (Charlie and Lola).
- Paper objects: `.sk-sticky`, `.sk-pin`, `.sk-clip`, `.sk-tape-a`,
  `.sk-tape-b` — size them with `width` only (`aspect-ratio` keeps the shape).
  Use these divs, not `<img>`, so one clip can repeat an object.
- Shadow: `.sk-cut` — a hard offset shadow, one light direction for every piece.
  Put `.sk-cut` on a wrapper and the torn `clip-path` on an inner element; a
  shadow on the clipped element itself is cut away.
- Type on paper: `.sk-display` for stamped labels, `.sk-hand` for handwriting on
  notes; never name a font family in a clip `<style>`.
- Grain: one `.sk-grain` overlay per clip, moved by `SK.grain` each step.

## Timing

- Step rate: `SK.STOP_FPS` = 15 steps per second. HyperFrames renders at 30 fps,
  so each pose holds exactly two frames ("on twos"); 12 fps would hold an uneven
  3:2 pattern at 30 fps.
- Write curves as usual (`M.track`, springs) and wrap them in `SK.onTwos(...)`;
  never hand-pose every step (Spider-Verse: quantize a smooth curve).
- Replacement jitter: `SK.piece(el, pose, seed, t)` — ±1.5 px and ±0.5° per
  step by default; keep `amp` ≤ 2, or it reads as camera shake.
- A move lasts 3–10 steps (0.2–0.7 s); rest 6–12 steps between moves. Only the
  piece tied to the spoken word moves (South Park rule).
- Snaps, not glides: Gilliam's cut-outs make sudden moves; overshoot is at most
  one step. No motion blur, morphs, or crossfades on paper.
- Start a move 2–3 steps before the word; it lands on the word.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **slide-on-twos** | A piece slides in with visible steps and a one-step overshoot | A noun is introduced | Start 3 steps early, land on the word | soft paper slide | 10+ steps, which reads as a laggy tween | `SK.onTwos(M.track(x0, [[at, x1, [14, .7]]]))` + `SK.piece` |
| **pop-up** | A card or object springs up from flat (scaleY 0 → 1) | A reveal, "ternyata…" | 3 steps, peak on the word, 1-step overshoot | card snap | Bouncy elastic easing | `s` from `SK.onTwos(M.track(0, [[at, 1, [24, .55]]]))` |
| **fold/unfold** | A sheet opens 1 → 2 → 4 panels | A list, "ada 3 hal" | 2 steps per fold, one fold per item | crisp crease | Unfolding before the count is said | panels with `scaleX` via `SK.onTwos`, hinge at the fold |
| **tear-reveal** | A torn cover is ripped away, showing the layer below | A contrast or twist | Tear across the word, 6–10 steps | short paper rip | A straight tear edge | cover with `SK.torn(..., {edges:'b'})`, `y`/`r` via `SK.onTwos` |
| **pin-and-swap** | A pinned card is replaced by a new card | "dulu X, sekarang Y" | Swap on the Y word, no in-between | pin click | Crossfading the swap | two pieces, `o` switches at the word |
| **replacement-face** | Mouth or eye drawings swap per step while "talking" | Quoting someone, a reaction | One drawing per step while the quote is spoken; hold closed in pauses | none or a tiny tap | Lip-syncing a figure to Dena's own voice | mouth paths, `SK.cycle(t, n)` picks one |
| **paper-scroll** | A long strip moves through the frame step by step | A timeline or process | One stop per key word | low continuous rustle | A smooth continuous scroll | strip `y` via `SK.onTwos(M.track(...))` |
| **stack-pile** | Cards drop onto a growing, slightly messy pile | Accumulation, "tambah lagi" | One drop per repeated word | card tap per drop | Every card landing perfectly aligned | per-card drop `SK.onTwos` + seeded offsets, `SK.torn` edges |
| **sticky-wall** | Notes slap onto a board with pins | Brainstorm, many small items | Each note lands on its word, ≥ 3 steps apart | sticky slap + pin click | More than 5 notes (unreadable at 9:16) | `.sk-sticky` + `.sk-pin` + `.sk-hand` text, drop from 1.25× scale |
| **flip-card** | A card turns via a 2–3-step squash (not 3D) | Myth vs fact | Edge-on step just before the word, new face on the word | card flick | Smooth 3D `rotateY` | `scaleX` 1 → .1 → 1 on twos, swap faces at the edge-on step |
| **tape-on** | A label drops in and tape strips hold it | Locking a key claim | Label on the word, tape one step later | tape rip-and-press | Tape on everything (it stops meaning emphasis) | `.sk-tape-a`/`.sk-tape-b` on the label's corners |
| **crumple-away** | A piece swaps to a crumpled state, then a ball that leaves | Rejecting an idea, "jangan" | Two replacement states, exit in 3–6 steps | paper crumple | Morph or blur instead of replacement drawings | hide the card, show `.sk-paper-crumpled` ball, exit via `SK.onTwos` |
| **hinge-limb** | A jointed arm or pointer pivots from a pin | Pointing, cause → effect | Rotate across 3–4 steps, reach the target on the word | faint pin creak | Too many joints (a puppet ballet) | limb with `transform-origin` at the joint, `r` via `SK.onTwos` |
| **multiplane-depth** | 3–4 paper layers drift at different rates, a tissue veil lifts | Mood, "bayangin…" | Layers offset one step from each other; 1–2 s total | room tone | Layers moving in sync (kills the depth) | layers with different `M.track` rates, each through `SK.onTwos` |

## References

### R1 — Lotte Reiniger, *Die Abenteuer des Prinzen Achmed* (1926)
- Source: https://en.wikipedia.org/wiki/The_Adventures_of_Prince_Achmed and
  https://en.wikipedia.org/wiki/Lotte_Reiniger
- Steal: silhouette puppets of cardboard and tracing paper, jointed with wire;
  emotion from gesture, not faces; one colour tint per scene; lit from below
  through glass planes.
- 9:16: a black silhouette of the concept against one tinted panel; its jointed
  limb moves on the stressed verb (`hinge-limb`).

### R2 — Terry Gilliam, *Monty Python's Flying Circus* animations (1969–74)
- Source: https://www.openculture.com/2014/07/terry-gilliam-reveals-the-secrets-of-monty-python-animations.html and
  https://www.pixartprinting.co.uk/blog/terry-gilliams-unusual-animated-collages/
- Steal: pieces move a few millimetres per frame under glass; the lower jaw is a
  separate piece so a mouth can talk; smooth motion is "damned near impossible",
  sudden moves are easy — build on snaps.
- 9:16: a cut-out with a hinged jaw that flaps on the quoted words, then one
  sudden snap on the punchline.

### R3 — *South Park* pilot, "Cartman Gets an Anal Probe" (1997)
- Source: https://en.wikipedia.org/wiki/Cartman_Gets_an_Anal_Probe
- Steal: construction-paper cut-outs with replacement mouth shapes, shot to
  pre-recorded dialogue; only the speaker moves; backlit holes for stars.
- 9:16: lock the words first, swap mouth drawings per step while the quote runs,
  keep everything else still (`replacement-face`).

### R4 — Yuri Norstein, *Hedgehog in the Fog* (1975)
- Source: https://en.wikipedia.org/wiki/Hedgehog_in_the_Fog and
  https://animationobsessive.substack.com/p/a-guide-to-yuri-norstein-hedgehog
- Steal: cut-out pieces spread over 4–5 glass planes that slide separately; fog is
  tracing paper lifted toward the camera frame by frame.
- 9:16: `multiplane-depth` — 3–4 layers and a tissue veil that lifts to reveal the
  key noun or drops to fade a rejected idea.

### R5 — Smallfilms (Oliver Postgate, Peter Firmin), *Ivor the Engine*
- Source: https://en.wikipedia.org/wiki/Ivor_the_Engine and
  https://blog.animationstudies.org/recollecting-ivor-the-engine-1959/
- Steal: watercolour-painted cardboard cut-outs; simple motion for simple stories;
  home-made sound effects that match the handmade look.
- 9:16: one textured object making one simple move per clause; SFX from real
  paper (rustle, tap) rather than synth whooshes.

### R6 — John Ryan, *Captain Pugwash* (BBC, 1957–66)
- Source: https://en.wikipedia.org/wiki/Captain_Pugwash
- Steal: cardboard cut-outs moved by levers on their backs — a whole piece swings
  from one hidden pivot.
- 9:16: "lever" motion — an arm rises or a sign swings in from one pivot on the
  word.

### R7 — Harry Smith, *Heaven and Earth Magic* (1962)
- Source: https://en.wikipedia.org/wiki/Heaven_and_Earth_Magic
- Steal: Victorian engraving cut-outs on black; objects keep transforming into
  each other; a soundtrack of clocks, water, and effect records.
- 9:16: one object swaps into another on the beat ("dulu… sekarang") —
  `pin-and-swap` with engraved-looking pieces on a dark ground.

### R8 — Jan Lenica, *Labirynt* (1962); with Walerian Borowczyk, *Dom* (1958)
- Source: https://mubi.com/en/notebook/posts/the-forgotten-jan-lenica-s-labyrinth-1963 and
  https://en.wikipedia.org/wiki/Dom_(film)
- Steal: tinted, smudgy old photos and engravings in a collage; looped grotesque
  motion; cut-outs mixed with live action and pixilation.
- 9:16: a desaturated, tinted collage with a 4–6-step loop behind a static label;
  this leads into the mix-media style (sub-project 2b).

### R9 — *Charlie and Lola* (Tiger Aspect, 2005–08)
- Source: https://en.wikipedia.org/wiki/Charlie_and_Lola_(TV_series)
- Steal: paper cut-outs mixed with fabric, real textures, and photomontage.
- 9:16: give each piece its own scanned material (kraft, lined, crumpled, sticky
  note); mixed materials read handmade faster than one texture.

### R10 — Common Craft, "Twitter in Plain English" (2008)
- Source: https://en.wikipedia.org/wiki/Common_Craft
- Steal: paper cut-outs on a plain board explaining tech in plain language; one
  concept per board.
- 9:16: labelled cut-outs (phone, laptop, sticky notes) slide in as each is named
  — the closest match to Dena's topics.

### R11 — Animating "on twos"; *Spider-Man: Into the Spider-Verse* (2018)
- Source: https://en.wikipedia.org/wiki/Inbetweening and
  https://www.cgspectrum.com/blog/spider-man-into-the-spider-verse-how-they-got-that-mind-blowing-look
- Steal: one new drawing every two frames; Spider-Verse animated smoothly and then
  stepped the result, using sharp stepped poses instead of motion blur.
- 9:16: write a smooth curve and wrap it in `SK.onTwos` (15 steps/s at a 30 fps
  render); no blur.

## Build Recipe

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
    #label { width: 760px; height: 170px; }
    #paper { position: absolute; inset: 0; }
    #paper span { position: absolute; left: 0; right: 0; top: 30px; text-align: center; font-size: 104px; color: var(--sk-accent); }
    #label .tp { top: -26px; width: 190px; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="4">
    <div class="sk-stage sk-stop sk-kraft">
      <img class="p sk-cut" id="obj" src="assets/cutouts/NN-laptop.png" alt="" style="width:760px" />
      <div class="p sk-cut" id="label">
        <div id="paper" class="sk-paper-cream"><span class="sk-display">semua manual</span></div>
        <div class="tp sk-tape-a" style="left:-40px;transform:rotate(-24deg)"></div>
      </div>
      <div class="sk-grain" id="grain"></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      $('paper').style.clipPath = SK.torn(760, 170, 4, { edges: 'lr', amp: 12 });
      const x = SK.onTwos(M.track(-900, [[0.2, 160, [14, 0.7]]]));   // slide-on-twos
      const drop = SK.onTwos(M.track(1, [[1.6, 0, [22, 0.7]]]));       // tape-on label
      SK.clip(ID, { T: 4, update: (t) => {
        SK.piece($('obj'), { x: x(t), y: 300 }, 1, t);
        const k = drop(t);
        SK.piece($('label'), { x: 160, y: 1420 + 260 * k, r: -2 + 6 * k, o: t >= 1.6 ? 1 : 0 }, 2, t);
        SK.grain($('grain'), t, 3);
      } });
    })();
  </script>
</template>
```

- `SK.piece` owns the element's `transform`: set position, rotation, scale, and
  opacity through the pose, not in CSS.
- Per-video cut-outs live in `assets/cutouts/`; paper-pack objects are classes.
- The host must load `vendor/paper-pack/paper-pack.css` after `style-kit.css`
  (the Dena starter does).

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| slide-on-twos, paper-scroll | soft paper slide / rustle | 0.08–0.12 |
| stack-pile, pop-up, flip-card | card tap / snap | 0.1–0.14 |
| sticky-wall, pin-and-swap | sticky slap + pin click | 0.1–0.14 |
| tear-reveal, tape-on | paper rip / tape rip-and-press | 0.12–0.16 |
| crumple-away | paper crumple | 0.12–0.16 |

Prefer recorded paper sounds over synthetic whooshes (Smallfilms).

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/compositions/sm-01-slide-pin.html` | slide-on-twos (Codex laptop) + sticky-wall + tape-on | cutaway |
| `style-examples/compositions/sm-02-tear-split.html` | tear-reveal + pop-up (Codex phone) | split |
| `style-examples/compositions/sm-03-replace-panel.html` | replacement-face + pin-and-swap on a taped card | panel |
| `style-examples/compositions/sm-04-stack-crumple.html` | stack-pile + crumple-away + slide-on-twos + tape-on | cutaway |

## Anti-slop Checklist

- [ ] Motion is stepped (`SK.onTwos` / `SK.piece`); nothing glides at 30 fps under a paper texture.
- [ ] Pieces use different papers; the grain moves each step instead of sitting still.
- [ ] Shadows are hard, small, and all point the same way; no big soft blur.
- [ ] Jitter is present but ≤ 2 px; resting pieces still breathe a little.
- [ ] No motion blur, morphs, or crossfades on paper — swaps are replacement drawings.
- [ ] Edges are cut or torn (`SK.torn`), not perfect vector rectangles.
- [ ] Tape, pins, and sticky notes mark a spoken beat; they are not decoration everywhere.
- [ ] Every cut-out matches a transcript noun; no generic vintage collage, gears, or lightbulbs.
- [ ] Generated cut-outs contain no text and no real person or brand; words are live text.
````

- [ ] **Step 3: Update the menu and the whiteboard reference**

1. In `docs/agents/references/styles/README.md` replace:

````text
| `stop-motion` | Paper cut-outs moving on twos (12 fps) | — | planned (sub-project 2) |
````

   with:

````text
| `stop-motion` | Paper cut-outs moving in steps (on twos), torn edges, tape, pins | `stop-motion.md` | available |
````

2. In `docs/agents/references/styles/README.md` replace:

````text
| `vox` | Paper texture, document clippings, highlighter, map zooms | — | planned (sub-project 2) |
````

   with:

````text
| `vox` | Paper texture, document clippings, highlighter, map zooms | — | planned (sub-project 2b) |
````

3. In `docs/agents/references/styles/README.md` replace:

````text
| `mix-media` | Dena cut-out + real screenshots + scribbles in one frame | — | planned (sub-project 2) |
````

   with:

````text
| `mix-media` | Dena keeps talking on a paper collage (alpha cut-out of her footage) | — | planned (sub-project 2b) |
````

4. In `docs/agents/references/styles/README.md` replace:

````text
| needs proof | capture (`use-real`) | no style replaces real evidence |
````

   with:

````text
| describes manual work, a pile of tasks, or concrete objects | `stop-motion` (stack-pile, sticky-wall, slide-on-twos) | handmade paper objects make the manual feel tangible |
| swaps, tears away, or throws out an old way ("dulu… sekarang", "jangan") | `stop-motion` (pin-and-swap, tear-reveal, crumple-away) | a physical swap reads instantly |
| quotes what someone said | `stop-motion` (replacement-face + speech bubble) or `whiteboard` (speech-bubble) | a paper figure carries the role without a fake likeness |
| needs proof | capture (`use-real`) | no style replaces real evidence |
````

5. In `docs/agents/references/styles/README.md` replace:

````text
- Type: <broll-text | motion-graphic | whiteboard>
````

   with:

````text
- Type: <broll-text | motion-graphic | whiteboard | stop-motion>
````

6. In `docs/agents/references/styles/README.md` replace:

````text
- Font: <display | sans | hand>, sizes in px
````

   with:

````text
- Font: <display | sans | hand>, sizes in px
- Pen (whiteboard only): <marker | hand>
- Assets: <each bitmap the clip needs, or "none">
  - `assets/cutouts/NN-name.png` — <codex | cc0 | dena-footage | user> — <what it shows, tied to the transcript>
````

7. In `docs/agents/references/styles/README.md` replace:

````text
style (`"broll-text"`, `"motion-graphic"`, or `"whiteboard"`), `track: 4`,
`assetRef: "compositions/broll/NN-name.html"`, and the treatment in `placement`.
A style clip is not an asset: it gets no `asset-manifest.json` entry.
````

   with:

````text
style (`"broll-text"`, `"motion-graphic"`, `"whiteboard"`, or `"stop-motion"`),
`track: 4`, `assetRef: "compositions/broll/NN-name.html"`, and the treatment in
`placement`. A style clip is not an asset: it gets no `asset-manifest.json` entry,
but every file in its `Assets:` list does (Style Assets in `asset-production.md`).
````

8. In `docs/agents/references/styles/README.md` replace:

````text
- Host setup: the Dena starter already loads `vendor/style-kit/style-kit.js` and
  `style-kit.css` after motion-kit.
````

   with:

````text
- Host setup: the Dena starter already loads `vendor/style-kit/style-kit.js` and
  `style-kit.css` after motion-kit, then `vendor/paper-pack/paper-pack.css`.
````

9. In `docs/agents/references/styles/README.md` replace:

````text
- The stage is `<div class="sk-stage sk-text|sk-mg|sk-wb">`; override the palette
  on it with `style="--sk-bg:…"`. Use `bg: null` for split and panel.
````

   with:

````text
- The stage is `<div class="sk-stage sk-text|sk-mg|sk-wb|sk-stop">`; override the
  palette on it with `style="--sk-bg:…"` or add a paper class (`sk-kraft`, …).
  Use `bg: null` for split and panel.
- Paper-pack files are referenced as `vendor/paper-pack/…` (host-relative); never
  write `../` in a url (the linter rejects it). Repeated paper objects are divs
  with a class (`.sk-sticky`, `.sk-pin`, …), not repeated `<img>` tags.
````

10. In `docs/agents/references/styles/whiteboard.md` replace:

````text
- Marker: `SK.MARKER_SVG`, placed with `SK.placeMarker`. A realistic hand is not
  used (it clashes with flat line art); a drawn hand asset may come in sub-project 2.
````

   with:

````text
- Pen (brief `Pen:`): `marker` (default) — `SK.MARKER_SVG` placed with
  `SK.placeMarker`; or `hand` — the flat illustrated hand from the paper pack
  (`<img class="sk-hand-img">` placed with `SK.placeHand`, poses `write` and
  `point`). Only this flat hand; a realistic stock hand clashes with line art.
````

11. In `docs/agents/references/styles/whiteboard.md` replace:

````text
| `style-examples/compositions/wb-04-cross-out.html` | stick-figure + cross-out + face swap | cutaway |
````

   with:

````text
| `style-examples/compositions/wb-04-cross-out.html` | stick-figure + cross-out + face swap | cutaway |
| `style-examples/compositions/wb-05-hand.html` | draw-flow with the paper-pack hand: writes, points, then glides off | cutaway |
````

12. In `docs/agents/references/styles/whiteboard.md` replace:

````text
- [ ] No realistic stock hand; one or two accent colours only.
````

   with:

````text
- [ ] No realistic stock hand (only the paper-pack hand); one or two accent colours only.
- [ ] With `Pen: hand`, the pen tip sits on the stroke, the hand hovers between strokes and glides off at the end.
````

13. In `docs/agents/references/styles/whiteboard.md` replace:

````text
- Never set `visibility` on clip elements; hide with `opacity` (the kit does).
````

   with:

````text
- Never set `visibility` on clip elements; hide with `opacity` (the kit does).
- `Pen: hand`: put `<img class="sk-hand-img" id="hand" alt="">` last in the stage
  (no `src`; `SK.placeHand` sets it). Each frame call
  `SK.placeHand($('hand'), tip, { last: SK.lastTip(t, S, pen) })` so the hand
  hovers after a stroke and glides off at the end; pass `{ pose: 'point' }` with a
  target point to point at something. Worked example: `wb-05-hand`.
````

- [ ] **Step 4: Add the Style Assets section**

1. In `docs/agents/references/asset-production.md` replace:

````text
## Generated Image Prompt Rules
````

   with:

````text
## Style Assets

Bitmaps a style b-roll clip lists under `Assets:` in its Style B-roll Brief
(stop-motion cut-outs, a whiteboard prop, a collage piece). Produce them in Build
step 2, before the clip is written. Paper textures, tape, pins, sticky notes, and
the whiteboard hand already live in `vendor/paper-pack/` — use those instead of
generating new ones.

| Source in the brief | How | File | Manifest |
| --- | --- | --- | --- |
| `codex` | skill `codex-image` with `--transparent`, using the Cut-out Recipe below | `assets/cutouts/NN-name.png` | `type: "cutout"`, `provenance: "generated"`, `promptSummary` |
| `cc0` | download from ambientCG, Poly Haven, or a Wikimedia Commons file marked CC0 or Public Domain; confirm the license on the asset's own page | `assets/cc0/<source>-<id>.<ext>` | `provenance: "cc0"`, `source` = asset URL + id, `license`, `downloaded` (date) |
| `dena-footage` | `ffmpeg -ss <processed time> -i processed.mp4 -frames:v 1 assets/frames/NN.png`, then `npx --yes hyperframes@0.7.24 remove-background assets/frames/NN.png -o assets/cutouts/NN-dena.png` | `assets/cutouts/NN-dena.png` | `provenance: "dena-footage"`, `source` = processed time |
| `user` | the user's file; remove the background the same way when needed | `assets/cutouts/NN-name.png` | `provenance: "user"`, `source` = what the user gave |

Cut-out Recipe (`codex`), filled per object:

```text
Use case: illustration-story
Asset type: paper cut-out object for a stop-motion b-roll clip
Primary request: <the object, specific to the transcript line>, made as a flat paper cutout
Style/medium: flat paper cutout, visible paper fibre, construction-paper colours, thin white paper border around the whole silhouette, soft paper shadow inside the cut edges
Composition/framing: whole object centered, about 80% of the canvas
Constraints: plain transparent background; no text, no letters, no logos, no UI
Avoid: glossy 3D render, photorealism, checkerboard, fake transparency grid
```

Rules:

- Never generate Dena's likeness; a Dena cut-out comes only from her footage.
- A generated cut-out never shows a real person or brand (Gate 2 R6).
- No text inside generated images; words are live text in the clip.
- Check every cut-out over a grey and a kraft ground. Reject blurry edges, a
  painted checkerboard, extra fingers, plastic-looking paper, or anything generic
  to the transcript, and regenerate with the whole spec (not just the fix).
- Crop to the object and keep the long edge ≤ 800 px.

## Generated Image Prompt Rules
````

- [ ] **Step 5: Run the tests**

Run: `npm run test:style-kit`
Expected: `ℹ pass 59`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add docs/agents/references/styles scripts/style-docs.test.mjs docs/agents/references/asset-production.md
git commit -m "docs: add the stop-motion reference, whiteboard hand, and Style Assets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Wiring and canon sync

**Files:**
- Modify: `docs/agents/02-screen-plan.md`, `docs/agents/03-build.md`, `docs/agents/references/{motion-broll-planning,visual-planning,qa-checklist}.md`, `docs/dena-social-video-style-guide.md`, `docs/skills/dena-video-editing-workflow/references/quality-gates.md`, `CLAUDE.md`, `AGENTS.md`, `templates/dena-video/index.html`, `internal/docs/{operations/video-editing-workflow,design-system/visual-system,architecture/stack,frontend/composition-implementation,operations/roadmap}.md`, `THIRD_PARTY_NOTICES.md`

- [ ] **Step 1: Apply the replacements**

1. In `docs/agents/02-screen-plan.md` replace:

````text
for each `broll-text`, `motion-graphic`, or `whiteboard` row also read that style's file in `docs/agents/references/styles/`)
````

   with:

````text
for each `broll-text`, `motion-graphic`, `whiteboard`, or `stop-motion` row also read that style's file in `docs/agents/references/styles/`, and list its bitmaps under `Assets:` with a source)
````

2. In `docs/agents/03-build.md` replace:

````text
   each Asset Brief in `visual-plan.md` (Motion B-roll and Style B-roll Briefs are
   not assets; step 4a handles them), capture or generate the file into
````

   with:

````text
   each Asset Brief in `visual-plan.md`, and for each file in a Style B-roll
   Brief's `Assets:` list (Style Assets in `asset-production.md`; the clips
   themselves are not assets, step 4a writes them), capture or generate the file into
````

3. In `docs/agents/03-build.md` replace:

````text
   `docs/agents/references/motion-broll-authoring.md`; for each `broll-text`,
   `motion-graphic`, or `whiteboard` row, follow the Build Contract in
````

   with:

````text
   `docs/agents/references/motion-broll-authoring.md`; for each `broll-text`,
   `motion-graphic`, `whiteboard`, or `stop-motion` row, follow the Build Contract in
````

4. In `docs/agents/references/motion-broll-planning.md` replace:

````text
- the words, a spoken number, or a hand-built framework are the point: pick
  `broll-text`, `motion-graphic`, or `whiteboard` from `styles/README.md`;
````

   with:

````text
- the words, a spoken number, a hand-built framework, or handmade objects are
  the point: pick `broll-text`, `motion-graphic`, `whiteboard`, or `stop-motion`
  from `styles/README.md`;
````

5. In `docs/agents/references/visual-planning.md` replace:

````text
(`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`) for a line
````

   with:

````text
(`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`) for a line
````

6. In `docs/agents/references/visual-planning.md` replace:

````text
| `decision` | `motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `generate`, `use-real`, `use-diagram`, `skip` |
````

   with:

````text
| `decision` | `motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `generate`, `use-real`, `use-diagram`, `skip` |
````

7. In `docs/agents/references/visual-planning.md` replace:

````text
from `motion-broll-planning.md`; for a `broll-text`, `motion-graphic`, or
`whiteboard` row, use the Style B-roll Brief from `styles/README.md`; both
````

   with:

````text
from `motion-broll-planning.md`; for a `broll-text`, `motion-graphic`,
`whiteboard`, or `stop-motion` row, use the Style B-roll Brief from
`styles/README.md`; both
````

8. In `docs/agents/references/qa-checklist.md` replace:

````text
- Every `broll-text`, `motion-graphic`, and `whiteboard` clip matches its Style B-roll Brief (pattern, palette, font, treatment).
````

   with:

````text
- Every `broll-text`, `motion-graphic`, `whiteboard`, and `stop-motion` clip matches its Style B-roll Brief (pattern, palette, font, treatment, assets).
- Every file in a brief's `Assets:` is in `asset-manifest.json` with its provenance; no generated cut-out shows text, Dena's likeness, or a real person or brand.
- Stop-motion moves in steps (no glides, blur, or crossfades on paper); shadows are hard and point one way.
````

9. In `docs/dena-social-video-style-guide.md` replace:

````text
- Style b-roll: kinetic text, flat motion graphics, or whiteboard drawing when the words, a spoken number, or a framework are the point (`docs/agents/references/styles/README.md`).
````

   with:

````text
- Style b-roll: kinetic text, flat motion graphics, whiteboard drawing, or paper stop-motion when the words, a spoken number, a framework, or handmade objects are the point (`docs/agents/references/styles/README.md`).
````

10. In `docs/skills/dena-video-editing-workflow/references/quality-gates.md` replace:

````text
- land style b-roll beats on their words, boil whiteboard strokes only after they finish, and keep every on-screen word and number verbatim
````

   with:

````text
- land style b-roll beats on their words, boil whiteboard strokes only after they finish, step stop-motion on twos, and keep every on-screen word and number verbatim
````

11. In `CLAUDE.md` replace:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard)
````

   with:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard, stop-motion)
````

12. In `AGENTS.md` replace:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard)
````

   with:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard, stop-motion)
````

13. In `templates/dena-video/index.html` replace:

````text
        - Style b-roll (broll-text, motion-graphic, whiteboard): the same mount; the clip
````

   with:

````text
        - Style b-roll (broll-text, motion-graphic, whiteboard, stop-motion): the same mount; the clip
````

14. In `internal/docs/operations/video-editing-workflow.md` replace:

````text
atau style b-roll: broll-text, motion-graphic, whiteboard) > capture bukti
````

   with:

````text
atau style b-roll: broll-text, motion-graphic, whiteboard, stop-motion) > capture bukti
````

15. In `internal/docs/design-system/visual-system.md` replace:

````text
  clip `broll-text`, `motion-graphic`, `whiteboard` memakai mount yang sama
````

   with:

````text
  clip `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion` memakai mount yang sama
````

16. In `internal/docs/design-system/visual-system.md` replace:

````text
- Detail: `docs/agents/references/styles/README.md` dan satu file per gaya.
````

   with:

````text
- Detail: `docs/agents/references/styles/README.md` dan satu file per gaya.

## Paper pack (`vendor/paper-pack/`)

- Tekstur kertas CC0 dari ambientCG (putih, krem, abu, kusut, kraft, kraft
  bergaris, kraft gelap) sebagai kelas `.sk-paper-*`, `.sk-kraft*`, plus
  `.sk-lined`, `.sk-grid`, `.sk-newsprint` dari garis CSS; dimuat lewat
  `paper-pack.css` setelah `style-kit.css`.
- Objek hasil Codex: selotip (`.sk-tape-a`, `.sk-tape-b`), `.sk-pin`, `.sk-clip`,
  `.sk-sticky`, dan tangan whiteboard (`SK.placeHand`, pose `write`/`point`).
  Lisensi per file di `LICENSES.md`.
- Stop-motion: tema `.sk-stop` (kraft + tinta hangat + merah bata), bayangan
  keras `.sk-cut` satu arah cahaya, grain `.sk-grain`, gerak 15 langkah/detik.
````

17. In `internal/docs/architecture/stack.md` replace:

````text
| style-kit | Engine style b-roll (broll-text, motion-graphic, whiteboard): draw-on, boil, handwriting, count-up, kamera; frame = fungsi waktu lokal clip |
````

   with:

````text
| style-kit | Engine style b-roll (broll-text, motion-graphic, whiteboard, stop-motion): draw-on, boil, handwriting, count-up, kamera, langkah on twos, sobekan, tangan; frame = fungsi waktu lokal clip |
````

18. In `internal/docs/frontend/composition-implementation.md` replace:

````text
  `style-kit.js` + `style-kit.css` untuk style b-roll.
````

   with:

````text
  `style-kit.js` + `style-kit.css` untuk style b-roll, dan `paper-pack.css`
  untuk tekstur/objek kertas.
````

19. In `internal/docs/operations/roadmap.md` replace:

````text
broll-text, motion-graphic, whiteboard) selesai. Berikutnya sub-proyek 2
(stop-motion, VOX, mix-media + pipeline aset bitmap: Codex, CC0 dibekukan lokal,
remove-background; tangan whiteboard) lalu sub-proyek 3 (2.5D parallax). Video
````

   with:

````text
broll-text, motion-graphic, whiteboard) selesai; sub-proyek 2a
([ADR-0013](../adr/0013-paper-pack-bitmap-assets.md): paper pack, pipeline aset
per video, stop-motion, tangan whiteboard) selesai. Berikutnya 2b (VOX +
mix-media: Dena tetap bicara di atas kolase lewat cutout video ber-alpha, diawali
spike) lalu sub-proyek 3 (2.5D parallax). Video
````

20. In `THIRD_PARTY_NOTICES.md` replace:

````text
  The Caveat Project Authors (`vendor/style-kit/fonts/OFL-Caveat.txt`).
````

   with:

````text
  The Caveat Project Authors (`vendor/style-kit/fonts/OFL-Caveat.txt`).

## paper-pack (`vendor/paper-pack`)

- Paper and kraft textures: ambientCG (https://ambientcg.com), Creative Commons
  CC0 1.0 Universal; asset ids and changes per file in
  `vendor/paper-pack/LICENSES.md`.
- Tape, pin, paper clip, sticky note, and whiteboard hands: generated for this
  project with Codex image generation; project assets under this repo's license.
- Example cut-outs in `docs/agents/references/style-examples/assets/` (laptop,
  phone): generated for this project with Codex image generation.
````

- [ ] **Step 2: Check for missed lists**

Run:
```bash
git grep -n "broll-text\`, \`motion-graphic\`, or \`whiteboard\`\|motion graphic, whiteboard)\|whiteboard) >" -- docs AGENTS.md CLAUDE.md internal templates ':!docs/superpowers'
git grep -n "planned (sub-project 2)" -- docs/agents
```
Expected: no output from either command.

- [ ] **Step 3: Commit**

```bash
git add docs/agents/02-screen-plan.md docs/agents/03-build.md docs/agents/references/motion-broll-planning.md docs/agents/references/visual-planning.md docs/agents/references/qa-checklist.md docs/dena-social-video-style-guide.md docs/skills/dena-video-editing-workflow/references/quality-gates.md CLAUDE.md AGENTS.md templates/dena-video/index.html internal/docs/operations/video-editing-workflow.md internal/docs/design-system/visual-system.md internal/docs/architecture/stack.md internal/docs/frontend/composition-implementation.md internal/docs/operations/roadmap.md THIRD_PARTY_NOTICES.md
git commit -m "docs: route stop-motion and style assets through Screen Plan, Build, and QA

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Final verification and merge

- [ ] **Step 1: Full run**

```bash
npm run test:motion-kit && npm run test:style-kit && npm run test:render-blur && npm run test:video && npm run test:repliz
npm run check:broll-examples && npm run check:style-examples && npm run check
npm run -s video -- new tmp-smoke --duration 10 && grep -c paper-pack.css videos/tmp-smoke/index.html; npm run -s video -- check tmp-smoke; rm -rf videos/tmp-smoke
```
Expected: every suite `fail 0` (15, 59, 4, 10, 47); example checks and root check `0 errors`; smoke prints `1` and only the two missing-media errors.

- [ ] **Step 2: Spec checklist**

Confirm the spec's "Definisi selesai" item by item with the evidence above, plus `git diff --stat main...HEAD` listing ADR-0013, rd-02, rd-03, README, `vendor/paper-pack/`, `stop-motion.md`, and the Task 6 files.

- [ ] **Step 3: Merge**

Ask the user before merging. With approval:
```bash
git switch main
git merge --ff-only feat/paper-pack
git branch -d feat/paper-pack
```
Do not push.
