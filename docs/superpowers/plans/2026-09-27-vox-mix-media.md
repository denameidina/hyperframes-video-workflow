# VOX + Mix-media (Sub-project 2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `vox` style (real captures or "Ilustrasi" documents, highlighter on the spoken phrase, red pen, Indonesia map pins) and the `mix-media` style (Dena keeps talking, matted from her own footage, over a paper collage) with a tested `npm run video -- cutout` CLI, rich references, and eight new examples.

**Architecture:** `vox` reuses style-kit primitives plus `SK.highlight` and `SK.geo`/`SK.CITIES` over a Natural Earth map in the paper pack, and a Newsreader serif. `mix-media` is a host recipe: an opaque collage mount (track 4), the matted speaker as a host `<video class="clip cutout sk-sticker-cut">` (track 6), an optional front mount (track 7); the cut-out is made per clip by `video cutout` (ffmpeg segment → `remove-background` → alpha WebM).

**Tech Stack:** HyperFrames 0.7.24 (pinned `npx`), GSAP + motion-kit + style-kit (vendored), plain JS/CSS/SVG, Node 22+ built-ins, ffmpeg, `hyperframes remove-background` (CoreML/CPU).

**Spec:** `docs/superpowers/specs/2026-09-27-vox-mix-media-design.md`

**Evidence:** Built and run in a scratch copy of the repo on 2026-09-27: `test:style-kit` 71/71, `test:video` 13/13, `test:motion-kit` 15/15, `test:render-blur` 4/4, `test:repliz` 47/47; `check:style-examples` 0 errors / 0 warnings, 51 stills reviewed, the 35 existing stills pixel-identical; `check:broll-examples` and root `npm run check` clean; an MP4 render of `mm-02` (collage + placeholder + front layer) shows the alpha cut-out; `video cutout` on Dena's real footage wrote a 2.5 MB alpha WebM and an MP4 render showed her lip-synced over a collage. Traps found and encoded: tweening `#base-video` opacity fails lint (the opaque collage covers it instead); a white-on-black "Ilustrasi" tag fails the contrast check over paper (dark on yellow passes); in an agent shell the RTK hook can make `npx … -o` write nothing, so `video cutout` spawns without a shell and checks its output.

## Global Constraints

- No npm dependencies (ADR-0007); HyperFrames is always `npx --yes hyperframes@0.7.24`.
- Frame 1080×1920; example clips `vx-NN-…` and `mm-NN-…`; mix-media front layers `mm-NN-…-front`.
- Every frame is a pure function of clip-local time; no timers, clocks, `Math.random`, or network.
- Never set `visibility` in a clip; never name a `font-family` in a clip `<style>` (use `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`); never write `../` in a url; repeated paper objects are classed divs.
- Mix-media: the collage mount is an opaque full-frame backdrop; never tween `#base-video` opacity; the cut-out is muted and shares the clip's start and duration.
- VOX: every capture shows `.sk-source` (≥ 28 px, ≥ 1.5 s); every illustration shows `.sk-tag` "Ilustrasi" and imitates no real outlet; highlights sit only on spoken words.
- Dena's likeness only from her footage (`video cutout`); never generated. Repo examples use the placeholder silhouette.
- Docs language: `docs/agents/**` English; `internal/docs/**` Indonesian.
- Richness: `vox.md` and `mix-media.md` ≥ 12 patterns, ≥ 6 references with source URLs, ≥ 8 anti-slop checks, ≥ 4 examples (vox: cutaway/split/panel; mix-media: collage).
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Replacement steps give exact **old** and **new** blocks; each old block must match exactly once — if not, stop and re-read the file.
- Reviewed binaries come from `/private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b` and are checked against its `SHA256SUMS`. If it is missing: re-capture the Wikipedia page with `hyperframes capture`, rebuild the map with `/private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b/make_map.py` from Natural Earth 1:50m admin-0 countries, re-render the placeholder with `docs/agents/references/mix-media-placeholder/README.md`, review them, and record new checksums.
- In this agent shell, run `npx … -o <file>` HyperFrames commands as `rtk proxy npx …`; `npm run` scripts are unaffected.

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `internal/docs/adr/0014-vox-mix-media.md` | Create | Decision record |
| `internal/docs/requirements/rd-02-composition-render.md`, `rd-03-video-editing-workflow.md`, `internal/docs/README.md` | Modify | EARS RD-02-32..34, RD-03-42..45; ADR index |
| `vendor/style-kit/style-kit.js`, `style-kit.css`, `fonts/Newsreader-Variable.woff2`, `fonts/OFL-Newsreader.txt`, `scripts/style-kit.test.mjs` | Modify/Create | `SK.highlight`, `SK.geo`, VOX + mix-media CSS, serif font, tests |
| `vendor/paper-pack/map-indonesia.svg`, `LICENSES.md` | Create/Modify | Natural Earth map + license row |
| `scripts/video.mjs`, `scripts/video.test.mjs` | Modify | `video cutout` + tests |
| `templates/dena-video/index.html`, `THIRD_PARTY_NOTICES.md`, `CLAUDE.md`, `AGENTS.md`, `internal/docs/operations/runbook.md` | Modify | Collage host CSS + recipe comment, notices, commands |
| `docs/agents/references/mix-media-placeholder/{index.html,hyperframes.json,README.md}` | Create | Placeholder source |
| `docs/agents/references/style-examples/**` | Modify/Create | 11 new composition files, 2 assets, host, snapshot times |
| `docs/agents/references/styles/{vox,mix-media}.md`, `styles/README.md`, `scripts/style-docs.test.mjs`, `asset-production.md` | Create/Modify | References, menu, richness guard, Style Assets |
| `docs/agents/02-screen-plan.md`, `03-build.md`, `references/{visual-planning,motion-broll-planning,qa-checklist}.md`, `docs/skills/…/quality-gates.md`, `docs/dena-social-video-style-guide.md`, `internal/docs/{operations/video-editing-workflow,design-system/visual-system,architecture/stack,operations/roadmap}.md` | Modify | Wiring + canon |

---

### Task 0: Preflight

- [ ] **Step 1: Branch, clean tree, staging**

```bash
git branch --show-current
git status --short
cd /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b && shasum -a 256 -c SHA256SUMS && cd -
```
Expected: `feat/vox-mix-media`; no `git status` output; three `OK` lines. Stop and ask the user if the tree has changes that are not from this plan.

- [ ] **Step 2: Toolchain**

Run: `node --version && ffmpeg -version | head -1 && npx --yes hyperframes@0.7.24 --version`
Expected: Node ≥ 22, an ffmpeg version line, `0.7.24`.

---

### Task 1: Governance first — ADR-0014, EARS, index

**Files:** Create `internal/docs/adr/0014-vox-mix-media.md`; Modify `internal/docs/requirements/rd-02-composition-render.md`, `internal/docs/requirements/rd-03-video-editing-workflow.md`, `internal/docs/README.md`.

- [ ] **Step 1: Write ADR-0014**

Create `internal/docs/adr/0014-vox-mix-media.md`:

````markdown
# ADR-0014 VOX dan mix-media
Status: accepted
Date: 2026-09-27

## Context

Dua gaya terakhir keluarga kertas (ADR-0012, ADR-0013): `vox` — dokumen di
atas kertas dengan highlighter tepat di frasa yang diucapkan — dan `mix-media` —
Dena tetap bicara, dipotong dari footage-nya sendiri, di atas kolase. Dena
memilih: VOX boleh capture asli atau dokumen ilustratif; mix-media memakai
cutout video bergerak; cutout dibuat lewat CLI; contoh repo memakai siluet
placeholder.

Spike 2026-09-27 (`badiblum-storynight`, HyperFrames 0.7.24): `remove-background`
segmen 3 s → VP9 ber-alpha dalam 21 s (CoreML); WebM alpha sebagai `<video>`
host ter-render transparan di `snapshot` dan `render` MP4, sinkron < 1 frame.
Lint menolak tween opacity `#base-video` (`gsap_fullscreen_overlay_starts_visible`).
Di sesi agen dengan hook RTK, `npx … -o` bisa tidak menulis output sehingga file
lama terpakai ulang tanpa error.

## Decision

- Treatment `collage` untuk `mix-media`: mount kolase opaque full-frame (track 4,
  z 22) menutupi base video; cutout Dena adalah `<video class="clip cutout
  sk-sticker-cut" muted>` milik host (track 6, z 24) dengan waktu sama; lapisan
  depan opsional `.broll-front` (track 7, z 26). Opacity `#base-video` tidak
  pernah di-tween.
- CLI `npm run video -- cutout <slug> --from --dur --name`: validasi, hapus output
  lama, ffmpeg memotong segmen `processed.mp4`, `remove-background` → WebM
  ber-alpha, gagal bila output tidak tertulis. Dipanggil lewat `spawnSync` (tanpa
  shell), jadi tidak terpengaruh hook.
- VOX: dokumen `capture` (screenshot asli + baris sumber) atau `illustrative`
  (lembar generik + tag "Ilustrasi", tanpa masthead media nyata). Engine:
  `SK.highlight`, `SK.geo` + `SK.CITIES`; aset: `map-indonesia.svg` (Natural
  Earth, domain publik), font Newsreader (OFL). Gate 2 R6 diperluas ke dokumen
  ilustratif yang meniru media nyata.
- Contoh `mix-media` memakai `placeholder-cutout.webm` yang dirender dari
  `docs/agents/references/mix-media-placeholder/`; tidak ada wajah asli di repo.

## Rationale

- Cutout sebagai media host memakai jalur video HyperFrames yang sudah terbukti
  (alpha diekstrak sebagai PNG saat render), tanpa pass komposit terpisah.
- Kolase opaque menghindari aturan lint dan menjaga audio tetap dari
  `#base-audio`.
- Aturan sumber dan tag menjaga VOX tetap jujur: capture adalah bukti, ilustrasi
  diberi label.

## Consequences

- Matting ±4 fps di Apple silicon: segmen dibatasi 15 s per klip; aset per video
  tidak di-commit.
- Posisi doodle/panah harus disetel dari still check cutout asli (posisi kepala
  berbeda per video).
- Sub-proyek 3 (2.5D parallax) dapat memakai ulang cutout dan lapisan kamera.

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-vox-mix-media-design.md`
- `docs/agents/references/styles/vox.md`, `docs/agents/references/styles/mix-media.md`,
  `scripts/video.mjs` (`cutout`)
- [ADR-0012](0012-style-broll-style-kit.md), [ADR-0013](0013-paper-pack-bitmap-assets.md)
````

- [ ] **Step 2: EARS and the ADR range**

1. In `internal/docs/requirements/rd-02-composition-render.md` replace:

````text
  frame pada render 30 fps) lewat `SK.onTwos`/`SK.piece`, tanpa motion blur atau
  crossfade.
````

   with:

````text
  frame pada render 30 fps) lewat `SK.onTwos`/`SK.piece`, tanpa motion blur atau
  crossfade.
- **RD-02-32** (Ubiquitous) — Clip `mix-media` shall terdiri dari mount kolase
  opaque full-frame di track 4, `<video>` cutout ber-alpha milik host di track 6
  (z 24, `muted`, waktu sama dengan jendela klip), dan mount depan opsional di
  track 7 (z 26); opacity `#base-video` shall tidak di-tween.
- **RD-02-33** (Event-driven) — When `npm run video -- cutout <slug> --from <s>
  --dur <s> --name NN-name` dijalankan, the system shall memvalidasi argumen
  (`--dur` ≤ 15 s, segmen di dalam durasi `processed.mp4`), menghapus output lama,
  memotong segmen dengan ffmpeg, menjalankan `remove-background`, dan menulis
  `assets/cutouts/<name>.webm`.
- **RD-02-34** (Unwanted) — If `remove-background` tidak menulis output atau
  outputnya kosong, then `video cutout` shall gagal dengan pesan yang menyebut
  file tersebut.
````

2. In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

````text
  (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`) per baris lewat
````

   with:

````text
  (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`,
  `vox`, `mix-media`) per baris lewat
````

3. In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

````text
- **RD-03-36** (Ubiquitous) — Setiap baris `broll-text`, `motion-graphic`,
  `whiteboard`, atau `stop-motion` di `visual-plan.md` shall punya Style B-roll
````

   with:

````text
- **RD-03-36** (Ubiquitous) — Setiap baris `broll-text`, `motion-graphic`,
  `whiteboard`, `stop-motion`, `vox`, atau `mix-media` di `visual-plan.md` shall punya Style B-roll
````

4. In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

````text
  meng-generate ulang (teks) atau menandainya Gate 2 R6 (orang/brand nyata).
````

   with:

````text
  meng-generate ulang (teks) atau menandainya Gate 2 R6 (orang/brand nyata).
- **RD-03-42** (Ubiquitous) — Setiap dokumen `capture` di clip `vox` shall
  menampilkan baris sumber (media/domain dan tanggal) ≥ 28 px selama ≥ 1,5 detik,
  dengan data privat diredaksi.
- **RD-03-43** (Ubiquitous) — Setiap dokumen `illustrative` di clip `vox` shall
  menampilkan tag "Ilustrasi" dan tidak meniru masthead, layout, atau logo media
  nyata.
- **RD-03-44** (Unwanted) — If highlight di clip `vox` menandai kata yang tidak
  diucapkan, atau frasa yang maknanya berubah di luar kalimat utuhnya, then fase
  Screen Plan shall memindahkannya sebelum Gate 2.
- **RD-03-45** (Event-driven) — When sebuah baris `mix-media` direncanakan, fase
  Build shall membuat cutout Dena dengan `npm run video -- cutout` untuk jendela
  klip itu, bukan dengan meng-generate kemiripannya.
````

5. In `internal/docs/README.md` replace:

````text
| Keputusan arsitektur | [adr/](adr/) (0001–0013) |
````

   with:

````text
| Keputusan arsitektur | [adr/](adr/) (0001–0014) |
````

- [ ] **Step 3: Register ADR-0014 and renumber**

````bash
python3 - <<'PYEOF'
# Insert an ADR after a given ADR in internal/docs/README.md and renumber the items after it.
import re
p, after, new_line = 'internal/docs/README.md', '35. [adr/0013-paper-pack-bitmap-assets.md]', '36. [adr/0014-vox-mix-media.md](adr/0014-vox-mix-media.md) - VOX (capture/ilustrasi + highlighter, peta) dan mix-media (Dena di atas kolase via `video cutout`).'
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
print('inserted ADR-0014 as item 36')
PYEOF
````

Expected: `inserted ADR-0014 as item 36`; `### Design System & Frontend` now starts at 37.

- [ ] **Step 4: Commit**

```bash
git add internal/docs/adr/0014-vox-mix-media.md internal/docs/requirements/rd-02-composition-render.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/README.md
git commit -m "docs: add ADR-0014 and EARS for VOX and mix-media

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: VOX engine, serif font, map (TDD)

**Files:** Modify `scripts/style-kit.test.mjs`, `vendor/style-kit/style-kit.js`, `vendor/style-kit/style-kit.css`, `vendor/paper-pack/LICENSES.md`; Create `vendor/style-kit/fonts/Newsreader-Variable.woff2`, `vendor/style-kit/fonts/OFL-Newsreader.txt`, `vendor/paper-pack/map-indonesia.svg`.

**Interfaces:**
- Produces: `SK.highlight(el, u)` (clip-path wipe, opacity 0 at u=0); `SK.MAP = {src, w:2400, h:950, lon0:94, lat0:7.5, k:50}`; `SK.geo(lat, lon) → {x, y}` in map pixels; `SK.CITIES` (`jakarta`, `bandung`, `yogyakarta`, `surabaya`, `denpasar`, `medan`, `makassar`, `jayapura` → `[lat, lon]`).
- CSS: `.sk-serif` (Newsreader), `.sk-vox`, `.sk-hl`, `.sk-redact`, `.sk-doc`, `.sk-doc-line`, `.sk-tag`, `.sk-source`, `.sk-sticker-cut`.

- [ ] **Step 1: Append the failing tests**

Append to `scripts/style-kit.test.mjs`:

````js
// ---- VOX (sub-project 2b) ----

test('highlight wipes in left to right and hides at 0', () => {
  const { SK } = load();
  const el = fakeEl('hl');
  SK.highlight(el, 0);
  assert.equal(el.style.opacity, '0');
  assert.equal(el.style.clipPath, 'inset(0 100.00% 0 0)');
  SK.highlight(el, 0.25);
  assert.equal(el.style.opacity, '1');
  assert.equal(el.style.clipPath, 'inset(0 75.00% 0 0)');
  SK.highlight(el, 3);
  assert.equal(el.style.clipPath, 'inset(0 0.00% 0 0)');
  assert.equal(el.style.visibility, undefined);
});

test('geo projects lat/lon into the map and keeps cities in place', () => {
  const { SK } = load();
  assert.deepEqual({ ...SK.geo(7.5, 94) }, { x: 0, y: 0 });
  assert.deepEqual({ ...SK.geo(-11.5, 142) }, { x: SK.MAP.w, y: SK.MAP.h });
  const at = (c) => SK.geo(...SK.CITIES[c]);
  for (const c of Object.keys(SK.CITIES)) {
    const p = at(c);
    assert.ok(p.x > 0 && p.x < SK.MAP.w && p.y > 0 && p.y < SK.MAP.h, c);
  }
  assert.ok(at('medan').x < at('jakarta').x && at('jakarta').x < at('bandung').x && at('bandung').x < at('surabaya').x
    && at('surabaya').x < at('denpasar').x && at('denpasar').x < at('makassar').x && at('makassar').x < at('jayapura').x, 'west to east');
  assert.ok(at('medan').y < at('jakarta').y, 'Medan is north of Jakarta');
  assert.ok(Math.abs(at('jakarta').x - 643) < 1 && Math.abs(at('jakarta').y - 685) < 1, 'Jakarta at (643, 685)');
});
````

Run: `node --test scripts/style-kit.test.mjs`
Expected: 2 fail (`highlight`, `geo`), the rest pass.

- [ ] **Step 2: Engine and CSS**

1. In `vendor/style-kit/style-kit.js` replace:

````text
/* style-kit: primitives for style b-roll clips (broll-text, motion-graphic, whiteboard, stop-motion)
   as HyperFrames sub-compositions. Specs: docs/superpowers/specs/2026-09-27-style-kit-design.md,
````

   with:

````text
/* style-kit: primitives for style b-roll clips (broll-text, motion-graphic, whiteboard, stop-motion,
   vox, mix-media)
   as HyperFrames sub-compositions. Specs: docs/superpowers/specs/2026-09-27-style-kit-design.md,
````

2. In `vendor/style-kit/style-kit.js` replace:

````text
   as HyperFrames sub-compositions. Specs: docs/superpowers/specs/2026-09-27-style-kit-design.md,
   docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md.
   Needs gsap and window.M (vendor/motion-kit/motion-kit.js) loaded first; reuses M.clamp,
````

   with:

````text
   as HyperFrames sub-compositions. Specs: docs/superpowers/specs/2026-09-27-style-kit-design.md,
   docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md,
   docs/superpowers/specs/2026-09-27-vox-mix-media-design.md.
   Needs gsap and window.M (vendor/motion-kit/motion-kit.js) loaded first; reuses M.clamp,
````

3. In `vendor/style-kit/style-kit.js` replace:

````text
};
})();
````

   with:

````text
};

// ---- VOX (sub-project 2b) --------------------------------------------------------------------
// highlight: a marker (.sk-hl, yellow multiply) or a redaction bar (.sk-redact) wipes in left to right
SK.highlight = (el,u)=>{
  u=clamp(u);
  el.style.clipPath=`inset(0 ${((1-u)*100).toFixed(2)}% 0 0)`;
  el.style.opacity=u>0?'1':'0';
};
/* map: vendor/paper-pack/map-indonesia.svg is Natural Earth 1:50m, equirectangular, 50 px per degree,
   lon 94..142 and lat 7.5..-11.5 (2400×950). SK.geo gives a lat/lon point in that SVG's pixels, so a
   pin lands where the place really is. SK.CITIES holds a few city centres (lat, lon). */
SK.MAP = {src:'vendor/paper-pack/map-indonesia.svg', w:2400, h:950, lon0:94, lat0:7.5, k:50};
SK.geo = (lat,lon)=>({x:(lon-SK.MAP.lon0)*SK.MAP.k, y:(SK.MAP.lat0-lat)*SK.MAP.k});
SK.CITIES = {
  jakarta:[-6.2088,106.8456], bandung:[-6.9175,107.6191], yogyakarta:[-7.7956,110.3695],
  surabaya:[-7.2575,112.7521], denpasar:[-8.6705,115.2126], medan:[3.5952,98.6722],
  makassar:[-5.1477,119.4327], jayapura:[-2.5337,140.7181],
};
})();
````

4. In `vendor/style-kit/style-kit.css` replace:

````text
@font-face { font-family: 'Caveat'; src: url(fonts/Caveat-Variable.woff2) format('woff2'); font-weight: 400 700; font-display: block; }
.sk-stage { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--sk-bg); color: var(--sk-ink); -webkit-font-smoothing: antialiased; }
````

   with:

````text
@font-face { font-family: 'Caveat'; src: url(fonts/Caveat-Variable.woff2) format('woff2'); font-weight: 400 700; font-display: block; }
@font-face { font-family: 'Newsreader'; src: url(fonts/Newsreader-Variable.woff2) format('woff2'); font-weight: 200 800; font-display: block; }
.sk-stage { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--sk-bg); color: var(--sk-ink); -webkit-font-smoothing: antialiased; }
````

5. In `vendor/style-kit/style-kit.css` replace:

````text
.sk-hand { font-family: 'Caveat', cursive; text-transform: none; }
.sk-wb .sk-stroke { stroke: var(--sk-ink); stroke-width: 7; }
````

   with:

````text
.sk-hand { font-family: 'Caveat', cursive; text-transform: none; }
.sk-serif { font-family: 'Newsreader', serif; text-transform: none; }
.sk-wb .sk-stroke { stroke: var(--sk-ink); stroke-width: 7; }
````

6. In `vendor/style-kit/style-kit.css` replace:

````text
.sk-hand-img { position: absolute; left: 0; top: 0; transform-origin: 0 0; z-index: 11; filter: drop-shadow(0 8px 10px rgba(0,0,0,.18)); }
````

   with:

````text
.sk-hand-img { position: absolute; left: 0; top: 0; transform-origin: 0 0; z-index: 11; filter: drop-shadow(0 8px 10px rgba(0,0,0,.18)); }
/* VOX and mix-media (sub-project 2b) */
.sk-vox { --sk-bg: #efe9dc; --sk-ink: #1b1b1b; --sk-accent: #ffe14d; --sk-accent-2: #d7263d; --sk-muted: #8c8577; font-family: 'Geist', system-ui, sans-serif; }
.sk-hl { position: absolute; opacity: 0; background: var(--sk-hl-color, #ffe14d); mix-blend-mode: multiply; border-radius: 4px 10px 6px 12px / 10px 5px 11px 6px; }
.sk-redact { position: absolute; opacity: 0; background: #111111; }
.sk-doc { position: absolute; background: #fbfaf6; color: #1b1b1b; }
.sk-doc-line { height: 14px; margin: 20px 0; border-radius: 7px; background: #d9d3c6; }
.sk-tag { position: absolute; padding: 6px 14px; border: 3px solid #1b1b1b; background: #ffe14d; color: #1b1b1b; font-family: 'Geist', system-ui, sans-serif; font-size: 30px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.sk-source { position: absolute; padding: 8px 14px; background: rgba(255,255,255,.88); color: #3f3a33; font-family: 'Geist', system-ui, sans-serif; font-size: 30px; font-weight: 500; }
/* sticker outline for a matted person (host <video>): chained drop-shadows compound, so four 10px
   offsets build a ~10px off-white ring; the last one is the hard paper shadow */
.sk-sticker-cut { filter: drop-shadow(10px 0 0 #f6f2e9) drop-shadow(-10px 0 0 #f6f2e9) drop-shadow(0 10px 0 #f6f2e9) drop-shadow(0 -10px 0 #f6f2e9) drop-shadow(8px 12px 0 rgba(40,25,10,.28)); }
````

- [ ] **Step 3: Font and map**

```bash
curl -sSfL -o vendor/style-kit/fonts/Newsreader-Variable.woff2 https://cdn.jsdelivr.net/npm/@fontsource-variable/newsreader@5.3.0/files/newsreader-latin-wght-normal.woff2
curl -sSfL -o vendor/style-kit/fonts/OFL-Newsreader.txt https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt
file vendor/style-kit/fonts/Newsreader-Variable.woff2 && sed -n 1p vendor/style-kit/fonts/OFL-Newsreader.txt
cp /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b/paper-pack/map-indonesia.svg vendor/paper-pack/
```
Expected: `Web Open Font Format (Version 2)`; `Copyright 2020 The Newsreader Project Authors …`.

1. In `vendor/paper-pack/LICENSES.md` replace:

````text
| `sticky.png` | Codex (generated) — "one square yellow sticky note, completely blank, bottom edge slightly curled; studio photo; transparent background; no writing" | project asset (MIT) | crop, 520 px, palette PNG |
| `paper-pack.css` | this project | MIT | — |
````

   with:

````text
| `sticky.png` | Codex (generated) — "one square yellow sticky note, completely blank, bottom edge slightly curled; studio photo; transparent background; no writing" | project asset (MIT) | crop, 520 px, palette PNG |
| `map-indonesia.svg` | Natural Earth 1:50m Admin 0 – Countries — https://www.naturalearthdata.com/about/terms-of-use/ ("All versions of Natural Earth raster + vector map data … are in the public domain", checked 2026-09-27) | Public domain | Indonesia + neighbours, equirectangular lon 94..142 / lat 7.5..-11.5 at 50 px/deg, Douglas–Peucker 0.025°, islands < 0.004 deg² dropped |
| `paper-pack.css` | this project | MIT | — |
````

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/style-kit.test.mjs scripts/paper-pack.test.mjs && npm run test:motion-kit`
Expected: 39 pass / 0 fail, then 15 / 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/style-kit.test.mjs vendor/style-kit vendor/paper-pack/map-indonesia.svg vendor/paper-pack/LICENSES.md
git commit -m "feat: add VOX highlight, Indonesia map, and serif font to style-kit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `video cutout` (TDD) and the collage host recipe

**Files:** Modify `scripts/video.test.mjs`, `scripts/video.mjs`, `templates/dena-video/index.html`, `THIRD_PARTY_NOTICES.md`, `CLAUDE.md`, `AGENTS.md`, `internal/docs/operations/runbook.md`.

**Interfaces:**
- Produces: `cutoutPlan(slug, {from, dur, name, root, probe}) → {seg, out, cmds}`; `CUTOUT_NAME_RE`; `CUTOUT_MAX_DUR` = 15; `main(['cutout', slug, '--from', s, '--dur', s, '--name', n])` writes `videos/<slug>/assets/cutouts/<name>.webm`.

- [ ] **Step 1: Replace the test file (red)**

Replace `scripts/video.test.mjs` with:

````js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HYPERFRAMES, checkSlug, commandsFor, cutoutPlan, fillTemplate, main, resolveDuration, scaffold } from './video.mjs';

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'video-test-'));
  mkdirSync(join(root, 'templates/dena-video'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-video/index.html'), '<div data-composition-id="dena-__SLUG__" data-duration="__DURATION__"></div><script>t["dena-__SLUG__"]</script>');
  writeFileSync(join(root, 'templates/dena-video/hyperframes.json'), '{"paths":{}}');
  return root;
}

test('checkSlug accepts lowercase slugs and rejects others', () => {
  assert.equal(checkSlug('wfh-2'), 'wfh-2');
  for (const bad of ['', '../x', 'Demo', '-x', 'a b', undefined]) assert.throws(() => checkSlug(bad), /slug/);
});

test('fillTemplate replaces every placeholder', () => {
  assert.equal(fillTemplate('a __SLUG__ __SLUG__ __DURATION__', { slug: 'x', duration: 12.5 }), 'a x x 12.5');
  assert.throws(() => fillTemplate('', { slug: 'x', duration: 0 }), /duration/);
});

test('resolveDuration prefers --duration, then processed.mp4, then 10', () => {
  const root = tempRoot();
  const dir = join(root, 'videos/a');
  mkdirSync(dir, { recursive: true });
  assert.equal(resolveDuration({ duration: '7', dir }), 7);
  assert.equal(resolveDuration({ dir, probe: () => { throw new Error('should not probe'); } }), 10);
  writeFileSync(join(dir, 'processed.mp4'), '');
  assert.equal(resolveDuration({ dir, probe: (f) => { assert.ok(f.endsWith('processed.mp4')); return 54.81; } }), 54.81);
  assert.throws(() => resolveDuration({ duration: '0', dir }), /--duration/);
  rmSync(root, { recursive: true, force: true });
});

test('scaffold creates the project, fills the template, and links vendor', () => {
  const root = tempRoot();
  const { dir, duration } = scaffold({ slug: 'demo', root, duration: '12' });
  assert.equal(duration, 12);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), '<div data-composition-id="dena-demo" data-duration="12"></div><script>t["dena-demo"]</script>');
  assert.equal(readFileSync(join(dir, 'hyperframes.json'), 'utf8'), '{"paths":{}}');
  assert.ok(lstatSync(join(dir, 'compositions/broll')).isDirectory());
  assert.ok(lstatSync(join(dir, 'assets')).isDirectory());
  assert.ok(lstatSync(join(dir, 'vendor')).isSymbolicLink());
  assert.equal(readlinkSync(join(dir, 'vendor')), '../../vendor');
  rmSync(root, { recursive: true, force: true });
});

test('scaffold refuses to overwrite an existing index.html', () => {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '5' });
  writeFileSync(join(root, 'videos/demo/index.html'), 'edited');
  assert.throws(() => scaffold({ slug: 'demo', root, duration: '5' }), /already exists/);
  assert.equal(readFileSync(join(root, 'videos/demo/index.html'), 'utf8'), 'edited');
  rmSync(root, { recursive: true, force: true });
});

test('scaffold keeps existing artifacts and an existing vendor link', () => {
  const root = tempRoot();
  const dir = join(root, 'videos/demo');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), 'brief');
  scaffold({ slug: 'demo', root, duration: '5' });
  rmSync(join(dir, 'index.html'));
  assert.doesNotThrow(() => scaffold({ slug: 'demo', root, duration: '5' }));
  assert.equal(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), 'brief');
  rmSync(root, { recursive: true, force: true });
});

test('commandsFor builds pinned hyperframes calls on videos/<slug>', () => {
  const hf = (...a) => ['npx', ['--yes', HYPERFRAMES, ...a]];
  assert.deepEqual(commandsFor('check', 'demo'), [hf('lint', 'videos/demo'), hf('validate', 'videos/demo'), hf('inspect', 'videos/demo')]);
  assert.deepEqual(commandsFor('dev', 'demo'), [hf('preview', 'videos/demo')]);
  assert.deepEqual(commandsFor('snapshot', 'demo', { at: '1.5,3' }), [hf('snapshot', '--at', '1.5,3', '-o', 'videos/demo/snapshots', 'videos/demo')]);
  assert.deepEqual(commandsFor('render', 'demo'), [hf('render', '--quality', 'high', '-o', 'videos/demo/renders/demo.mp4', 'videos/demo')]);
  assert.deepEqual(commandsFor('render', 'demo', { blur: true }), [['node', ['scripts/render-blur.mjs', '--slug', 'demo', '--project', 'videos/demo']]]);
});

test('commandsFor rejects bad input', () => {
  assert.throws(() => commandsFor('snapshot', 'demo', {}), /--at/);
  assert.throws(() => commandsFor('snapshot', 'demo', { at: '1;rm' }), /--at/);
  assert.throws(() => commandsFor('publish', 'demo'), /unknown command/);
  assert.throws(() => commandsFor('check', '../x'), /slug/);
});

test('main runs commands without GEMINI_API_KEY and stops on failure', () => {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '5' });
  const calls = [];
  main(['check', 'demo'], { root, env: { GEMINI_API_KEY: 'k', PATH: 'p' }, run: (c, a, o) => { calls.push([c, a, o.env]); return { status: 0 }; } });
  assert.equal(calls.length, 3);
  assert.equal(calls[0][2].GEMINI_API_KEY, undefined);
  assert.equal(calls[0][2].PATH, 'p');
  assert.throws(() => main(['check', 'demo'], { root, env: {}, run: () => ({ status: 1 }) }), /exited with 1/);
  rmSync(root, { recursive: true, force: true });
});

test('main refuses to run on a project that does not exist', () => {
  const root = tempRoot();
  assert.throws(() => main(['check', 'ghost'], { root, env: {}, run: () => ({ status: 0 }) }), /npm run video -- new ghost/);
  rmSync(root, { recursive: true, force: true });
});

// ---- cutout (sub-project 2b) ----

function cutoutRoot() {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '20' });
  writeFileSync(join(root, 'videos/demo/processed.mp4'), 'x');
  return root;
}

test('cutoutPlan validates input and builds ffmpeg + remove-background calls', () => {
  const root = cutoutRoot();
  const probe = () => 20;
  const p = cutoutPlan('demo', { from: '4.5', dur: '3', name: '04-dena', root, probe });
  const dir = join(root, 'videos/demo');
  assert.equal(p.seg, join(dir, 'assets/frames/04-dena-seg.mp4'));
  assert.equal(p.out, join(dir, 'assets/cutouts/04-dena.webm'));
  assert.deepEqual(p.cmds[0], ['ffmpeg', ['-y', '-loglevel', 'error', '-ss', '4.5', '-t', '3', '-i', join(dir, 'processed.mp4'), '-an', '-c:v', 'libx264', '-crf', '16', p.seg]]);
  assert.deepEqual(p.cmds[1], ['npx', ['--yes', HYPERFRAMES, 'remove-background', p.seg, '-o', p.out]]);
  assert.throws(() => cutoutPlan('demo', { dur: '3', name: '04-dena', root, probe }), /--from/);
  assert.throws(() => cutoutPlan('demo', { from: '-1', dur: '3', name: '04-dena', root, probe }), /--from/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '0', name: '04-dena', root, probe }), /--dur/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '16', name: '04-dena', root, probe }), /--dur/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '3', name: 'dena', root, probe }), /--name/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '3', name: '04-../x', root, probe }), /--name/);
  assert.throws(() => cutoutPlan('demo', { from: '18', dur: '3', name: '04-dena', root, probe }), /past the end/);
  rmSync(join(dir, 'processed.mp4'));
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '3', name: '04-dena', root, probe }), /processed\.mp4 not found/);
  rmSync(root, { recursive: true, force: true });
});

test('main cutout removes the old output, runs both steps, and checks the new file', () => {
  const root = cutoutRoot();
  const out = join(root, 'videos/demo/assets/cutouts/04-dena.webm');
  mkdirSync(join(root, 'videos/demo/assets/cutouts'), { recursive: true });
  writeFileSync(out, 'stale');
  const calls = [];
  const run = (c, a) => {
    calls.push(c === 'npx' ? a[2] : c);
    if (c === 'ffprobe') return { status: 0, stdout: '20\n' };
    if (c === 'npx') { assert.equal(existsSync(out), false, 'old cut-out removed before the matte'); writeFileSync(out, 'webm'); }
    return { status: 0 };
  };
  main(['cutout', 'demo', '--from', '2', '--dur', '3', '--name', '04-dena'], { root, env: {}, run });
  assert.deepEqual(calls, ['ffprobe', 'ffmpeg', 'remove-background']);
  assert.equal(readFileSync(out, 'utf8'), 'webm');
  rmSync(root, { recursive: true, force: true });
});

test('main cutout fails when remove-background writes nothing', () => {
  const root = cutoutRoot();
  const run = (c) => (c === 'ffprobe' ? { status: 0, stdout: '20\n' } : { status: 0 });
  assert.throws(() => main(['cutout', 'demo', '--from', '0', '--dur', '2', '--name', '05-dena'], { root, env: {}, run }), /did not write .*05-dena\.webm/);
  assert.throws(() => main(['cutout', 'demo', '--from', '0', '--dur', '2', '--name', '05-dena'], { root, env: {}, run: (c) => (c === 'ffprobe' ? { status: 0, stdout: '20' } : { status: 1 }) }), /exited with 1/);
  rmSync(root, { recursive: true, force: true });
});
````

Run: `node --test scripts/video.test.mjs`
Expected: FAIL — `cutoutPlan` is not exported.

- [ ] **Step 2: Replace the CLI**

Replace `scripts/video.mjs` with:

````js
#!/usr/bin/env node
// Per-video HyperFrames projects under videos/<slug>/ (ADR-0010).
// Spec: docs/superpowers/specs/2026-09-26-per-video-projects-design.md
// Usage: npm run video -- <new|check|dev|snapshot|render> <slug> [--duration s] [--at t,...] [--blur]
//        npm run video -- cutout <slug> --from <s> --dur <s> --name NN-name   (matted mix-media cut-out)
// Cut-out spec: docs/superpowers/specs/2026-09-27-vox-mix-media-design.md
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const HYPERFRAMES = 'hyperframes@0.7.24';
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const TEMPLATE = join('templates', 'dena-video');

export function checkSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) throw new Error('slug must use lowercase letters, digits, and dashes');
  return slug;
}

export const projectDir = (slug, root = '.') => join(root, 'videos', checkSlug(slug));

export function fillTemplate(html, { slug, duration }) {
  if (!(duration > 0)) throw new Error('duration must be > 0');
  return html.replaceAll('__SLUG__', slug).replaceAll('__DURATION__', String(duration));
}

export function probeDuration(file, run = spawnSync) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = Number.parseFloat(r.stdout);
  if (r.status !== 0 || !(d > 0)) throw new Error(`ffprobe could not read the duration of ${file}`);
  return Math.round(d * 1000) / 1000;
}

export function resolveDuration({ duration, dir, probe = probeDuration }) {
  if (duration !== undefined) {
    const d = Number(duration);
    if (!(d > 0)) throw new Error('--duration must be > 0');
    return d;
  }
  const media = join(dir, 'processed.mp4');
  return existsSync(media) ? probe(media) : 10;
}

const hasEntry = (p) => { try { lstatSync(p); return true; } catch { return false; } };

export function scaffold({ slug, root = '.', duration, probe }) {
  const dir = projectDir(slug, root);
  const index = join(dir, 'index.html');
  if (hasEntry(index)) throw new Error(`${index} already exists; refusing to overwrite`);
  mkdirSync(join(dir, 'compositions', 'broll'), { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });
  const d = resolveDuration({ duration, dir, probe });
  const tpl = join(root, TEMPLATE);
  writeFileSync(index, fillTemplate(readFileSync(join(tpl, 'index.html'), 'utf8'), { slug, duration: d }));
  cpSync(join(tpl, 'hyperframes.json'), join(dir, 'hyperframes.json'));
  if (!hasEntry(join(dir, 'vendor'))) symlinkSync('../../vendor', join(dir, 'vendor'));
  return { dir, duration: d };
}

const hf = (...args) => ['npx', ['--yes', HYPERFRAMES, ...args]];

export function commandsFor(cmd, slug, { at, blur = false, root = '.' } = {}) {
  const dir = projectDir(slug, root);
  switch (cmd) {
    case 'check':
      return [hf('lint', dir), hf('validate', dir), hf('inspect', dir)];
    case 'dev':
      return [hf('preview', dir)];
    case 'snapshot':
      if (typeof at !== 'string' || !/^\d+(\.\d+)?(,\d+(\.\d+)?)*$/.test(at)) throw new Error('snapshot needs --at <t,...> in seconds');
      return [hf('snapshot', '--at', at, '-o', join(dir, 'snapshots'), dir)];
    case 'render':
      return blur
        ? [['node', [join(root, 'scripts', 'render-blur.mjs'), '--slug', slug, '--project', dir]]]
        : [hf('render', '--quality', 'high', '-o', join(dir, 'renders', `${slug}.mp4`), dir)];
    default:
      throw new Error(`unknown command "${cmd}" (use new, check, dev, snapshot, render, cutout)`);
  }
}

export const CUTOUT_NAME_RE = /^\d\d-[a-z0-9][a-z0-9-]*$/;
export const CUTOUT_MAX_DUR = 15;

/* cutout: cut a segment of processed.mp4 and matte it into a transparent WebM for a mix-media clip.
   The segment starts at the clip's host time, so the cut-out stays in sync with the audio. */
export function cutoutPlan(slug, { from, dur, name, root = '.', probe = probeDuration }) {
  const dir = projectDir(slug, root);
  const f = Number(from), d = Number(dur);
  if (from === undefined || !Number.isFinite(f) || f < 0) throw new Error('--from must be a number of seconds >= 0');
  if (!(d > 0 && d <= CUTOUT_MAX_DUR)) throw new Error(`--dur must be > 0 and <= ${CUTOUT_MAX_DUR} seconds`);
  if (typeof name !== 'string' || !CUTOUT_NAME_RE.test(name)) throw new Error('--name must look like NN-name (for example 04-dena)');
  const media = join(dir, 'processed.mp4');
  if (!existsSync(media)) throw new Error(`${media} not found; a cut-out is cut from the processed video`);
  const total = probe(media);
  if (f + d > total + 1e-6) throw new Error(`--from + --dur (${f + d} s) is past the end of processed.mp4 (${total} s)`);
  const seg = join(dir, 'assets', 'frames', `${name}-seg.mp4`);
  const out = join(dir, 'assets', 'cutouts', `${name}.webm`);
  return {
    seg,
    out,
    cmds: [
      ['ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(f), '-t', String(d), '-i', media, '-an', '-c:v', 'libx264', '-crf', '16', seg]],
      hf('remove-background', seg, '-o', out),
    ],
  };
}

export function main(argv, { run = spawnSync, env = process.env, root = '.' } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      at: { type: 'string' }, blur: { type: 'boolean', default: false }, duration: { type: 'string' },
      from: { type: 'string' }, dur: { type: 'string' }, name: { type: 'string' },
    },
  });
  const [cmd, slug] = positionals;
  if (cmd === 'new') {
    const { dir, duration } = scaffold({ slug, root, duration: values.duration });
    console.log(`created ${dir} (${duration} s)`);
    return;
  }
  if (cmd === 'cutout') {
    const { seg, out, cmds } = cutoutPlan(slug, { ...values, root, probe: (f) => probeDuration(f, run) });
    mkdirSync(join(projectDir(slug, root), 'assets', 'frames'), { recursive: true });
    mkdirSync(join(projectDir(slug, root), 'assets', 'cutouts'), { recursive: true });
    // never reuse an old file: a failed or skipped matte must not leave a stale cut-out behind
    rmSync(seg, { force: true });
    rmSync(out, { force: true });
    for (const [c, a] of cmds) {
      const r = run(c, a, { stdio: 'inherit', env });
      if (r.status !== 0) throw new Error(`${c} ${a.slice(0, 3).join(' ')} exited with ${r.status}`);
    }
    if (!existsSync(out) || statSync(out).size === 0) throw new Error(`remove-background did not write ${out}`);
    console.log(`cut-out ${out}`);
    return;
  }
  const cmds = commandsFor(cmd, slug, { at: values.at, blur: values.blur, root });
  const dir = projectDir(slug, root);
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`${join(dir, 'index.html')} not found; run npm run video -- new ${slug}`);
  if (cmd === 'render') mkdirSync(join(dir, 'renders'), { recursive: true });
  const childEnv = { ...env };
  delete childEnv.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  for (const [c, a] of cmds) {
    const r = run(c, a, { stdio: 'inherit', env: childEnv });
    if (r.status !== 0) throw new Error(`${c} ${a.slice(0, 3).join(' ')} exited with ${r.status}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
````

Run: `node --test scripts/video.test.mjs`
Expected: 13 pass / 0 fail.

- [ ] **Step 3: Host recipe, notices, commands**

1. In `CLAUDE.md` replace:

````text
npm run video -- render <slug> [--blur]      # render to videos/<slug>/renders/
````

   with:

````text
npm run video -- render <slug> [--blur]      # render to videos/<slug>/renders/
npm run video -- cutout <slug> --from 31.2 --dur 5 --name 07-dena  # matte a mix-media cut-out
````

2. In `AGENTS.md` replace:

````text
npm run video -- render <slug> [--blur]      # render to videos/<slug>/renders/
````

   with:

````text
npm run video -- render <slug> [--blur]      # render to videos/<slug>/renders/
npm run video -- cutout <slug> --from 31.2 --dur 5 --name 07-dena  # matte a mix-media cut-out
````

3. In `internal/docs/operations/runbook.md` replace:

````text
npm run video -- render <slug> --blur  # opsional: render final dengan motion blur (4× lebih lama)
````

   with:

````text
npm run video -- render <slug> --blur  # opsional: render final dengan motion blur (4× lebih lama)
npm run video -- cutout <slug> --from <s> --dur <s> --name NN-dena  # cutout mix-media → assets/cutouts/NN-dena.webm
````

4. In `THIRD_PARTY_NOTICES.md` replace:

````text
  The Caveat Project Authors (`vendor/style-kit/fonts/OFL-Caveat.txt`).
````

   with:

````text
  The Caveat Project Authors (`vendor/style-kit/fonts/OFL-Caveat.txt`).
- Newsreader (`vendor/style-kit/fonts/Newsreader-Variable.woff2`, latin subset
  from `@fontsource-variable/newsreader@5.3.0`): SIL Open Font License 1.1,
  Copyright 2020 The Newsreader Project Authors
  (`vendor/style-kit/fonts/OFL-Newsreader.txt`).
````

5. In `THIRD_PARTY_NOTICES.md` replace:

````text
- Example cut-outs in `docs/agents/references/style-examples/assets/` (laptop,
  phone): generated for this project with Codex image generation.
````

   with:

````text
- Example cut-outs in `docs/agents/references/style-examples/assets/` (laptop,
  phone): generated for this project with Codex image generation.
- `vendor/paper-pack/map-indonesia.svg`: derived from Natural Earth 1:50m Admin 0
  – Countries (https://www.naturalearthdata.com), public domain.
- `docs/agents/references/style-examples/assets/cap-ken-burns.png`: a screenshot
  of the English Wikipedia article "Ken Burns effect"
  (https://en.wikipedia.org/wiki/Ken_Burns_effect), text available under
  CC BY-SA 4.0; captured 2026-09-27, credited on screen in the examples.
- `docs/agents/references/style-examples/assets/placeholder-cutout.webm`: this
  project's own render of `docs/agents/references/mix-media-placeholder/`.
````

6. In `templates/dena-video/index.html` replace:

````text
        - Style b-roll (broll-text, motion-graphic, whiteboard, stop-motion): the same mount; the clip
````

   with:

````text
        - Mix-media (collage): an opaque collage mount on track 4, the matted speaker video
          "assets/cutouts/NN-dena.webm" (class "clip cutout sk-sticker-cut", muted, track 6, same start and
          duration; make it with npm run video -- cutout), and an optional front mount (class "broll-front",
          track 7). Never tween #base-video opacity. Recipe: docs/agents/references/styles/mix-media.md.
        - Style b-roll (broll-text, motion-graphic, whiteboard, stop-motion, vox, mix-media): the same mount; the clip
````

7. In `templates/dena-video/index.html` replace:

````text
      .broll { position: absolute; inset: 0; z-index: 22; }
````

   with:

````text
      .broll { position: absolute; inset: 0; z-index: 22; }
      /* mix-media: matted speaker (track 6) above the collage, front layer (track 7) above the speaker */
      .cutout { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 24; object-fit: cover; }
      .broll-front { position: absolute; inset: 0; z-index: 26; }
````

- [ ] **Step 4: Real-footage smoke (not committed)**

With any video project whose `processed.mp4` has Dena on camera (for example `videos/badiblum-storynight`, talking head from 42 s):
```bash
npm run -s video -- new tmp-cutout --duration 10
ln -sf "$PWD/videos/badiblum-storynight/processed.mp4" videos/tmp-cutout/processed.mp4
npm run -s video -- cutout tmp-cutout --from 50 --dur 3 --name 01-dena
ffprobe -v error -show_entries stream=codec_name:stream_tags=alpha_mode -of compact videos/tmp-cutout/assets/cutouts/01-dena.webm
ffmpeg -loglevel error -y -c:v libvpx-vp9 -ss 1 -i videos/tmp-cutout/assets/cutouts/01-dena.webm -frames:v 1 -vf alphaextract renders/01-alpha.png
rm -rf videos/tmp-cutout
```
Expected: `cut-out …/01-dena.webm`; `vp9` with `ALPHA_MODE=1`; the alpha frame (view it) shows the person white on black. If no such project exists, skip and say so in the Task 7 report.

- [ ] **Step 5: Commit**

```bash
git add scripts/video.mjs scripts/video.test.mjs templates/dena-video/index.html THIRD_PARTY_NOTICES.md CLAUDE.md AGENTS.md internal/docs/operations/runbook.md
git commit -m "feat: add video cutout for mix-media and the collage host recipe

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Examples — four VOX, four mix-media

**Files:** Create `docs/agents/references/mix-media-placeholder/{index.html,hyperframes.json,README.md}`, `docs/agents/references/style-examples/assets/{cap-ken-burns.png,placeholder-cutout.webm}`, `compositions/{vx-01-illustrative,vx-02-capture-split,vx-03-map-pin,vx-04-clipping-panel,mm-01-collage-doodle,mm-02-orbit-arrow,mm-02-orbit-arrow-front,mm-03-torn-window,mm-03-torn-window-front,mm-04-polaroid-caption,mm-04-polaroid-caption-front}.html`; Modify `docs/agents/references/style-examples/index.html`, `snapshots.json`.

Timeline (host s): vx-01 106.5–111.5 cutaway · vx-02 112–118 split · vx-03 118.5–123.5 cutaway · vx-04 124–129 panel · mm-01 129.5–134.5 · mm-02 135–141 · mm-03 141.5–147.5 · mm-04 148–153 (collage).

- [ ] **Step 1: Assets and the placeholder source**

```bash
cp /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b/example-assets/* docs/agents/references/style-examples/assets/
mkdir -p docs/agents/references/mix-media-placeholder
```

Create `docs/agents/references/mix-media-placeholder/index.html`:

````html
<!doctype html>
<html lang="en">
  <head>
    <!-- Source of style-examples/assets/placeholder-cutout.webm: a grey stand-in for a matted speaker, so the
         mix-media examples show no real face. Render it with the commands in README.md (they copy vendor/ in). -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="vendor/gsap.min.js"></script>
    <style>
      body { margin: 0; background: transparent; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: transparent; }
      #figure { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform-origin: 540px 1920px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="placeholder-cutout" data-start="0" data-width="1080" data-height="1920" data-duration="6">
      <svg id="figure" class="clip" data-start="0" data-duration="6" data-track-index="1" viewBox="0 0 1080 1920" width="1080" height="1920">
        <path d="M150 1920 C150 1560 290 1400 540 1400 C790 1400 930 1560 930 1920 Z" fill="#6b6b73" />
        <rect x="470" y="1250" width="140" height="190" rx="50" fill="#6b6b73" />
        <g id="head"><ellipse cx="540" cy="1060" rx="215" ry="255" fill="#7a7a82" /><text x="540" y="1075" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#d4d4d8">placeholder</text></g>
      </svg>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // slow breathing and small head nods, the way a speaker moves while talking
      tl.to('#figure', { y: -10, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0);
      tl.to('#head', { rotation: 3, transformOrigin: '540px 1300px', duration: 0.75, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 0);
      window.__timelines['placeholder-cutout'] = tl;
    </script>
  </body>
</html>
````

Create `docs/agents/references/mix-media-placeholder/hyperframes.json`:

````json
{
  "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  "paths": {
    "blocks": "compositions",
    "components": "compositions/components",
    "assets": "assets"
  }
}
````

Create `docs/agents/references/mix-media-placeholder/README.md`:

````markdown
# Mix-media placeholder cut-out

Source of `docs/agents/references/style-examples/assets/placeholder-cutout.webm`:
a grey silhouette that breathes and nods, standing in for a matted speaker so the
mix-media examples show no real face. Real videos use `npm run video -- cutout`
on Dena's footage instead.

Re-render from the repo root (transparent WebM, then a smaller VP9 with alpha):

```bash
T=$(mktemp -d) && cp -R docs/agents/references/mix-media-placeholder/. "$T"/ && mkdir -p "$T/vendor" && cp vendor/gsap.min.js "$T/vendor/"
npx --yes hyperframes@0.7.24 render --format=webm -o "$T/raw.webm" "$T"
ffmpeg -y -loglevel error -c:v libvpx-vp9 -i "$T/raw.webm" -c:v libvpx-vp9 -pix_fmt yuva420p -crf 42 -b:v 0 -row-mt 1 -an docs/agents/references/style-examples/assets/placeholder-cutout.webm
rm -rf "$T"
```

The result must keep its alpha channel (`ffprobe` shows `ALPHA_MODE=1`) and stay
under 1 MB.
````

- [ ] **Step 2: VOX clips**

Create `docs/agents/references/style-examples/compositions/vx-01-illustrative.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: an illustrative document (tagged "Ilustrasi", no real outlet) whose words are invented to show the mechanism. In a real clip the headline and the highlighted sentence are verbatim from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #cam { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform-origin: 0 0; }
        #sheet { position: absolute; left: 110px; top: 330px; width: 860px; height: 1120px; }
        #paper { position: absolute; inset: 0; padding: 70px 70px; box-sizing: border-box; }
        #kicker { font-size: 28px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--sk-muted); }
        #head { margin-top: 26px; font-size: 76px; font-weight: 700; line-height: 1.04; }
        #lede { position: relative; margin-top: 44px; font-size: 44px; line-height: 1.32; }
        .hlw { position: relative; }
        #hl { left: -8px; right: -8px; top: 14%; bottom: 2%; }
        #tag { right: 30px; top: 30px; }
      </style>
      <div id="root" data-composition-id="vx-01-illustrative" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-vox sk-newsprint">
          <div id="cam">
            <div id="sheet" class="sk-cut">
              <div id="paper" class="sk-paper-white">
                <div id="kicker">Catatan kerja</div>
                <div id="head" class="sk-serif">Yang bikin capek bukan kerjanya</div>
                <div id="lede" class="sk-serif">tapi setiap hari harus <span class="hlw"><span class="sk-hl" id="hl"></span>nyari datanya</span> lagi dari chat dan kertas.</div>
                <div class="sk-doc-line" style="width:96%;margin-top:46px"></div>
                <div class="sk-doc-line" style="width:88%"></div>
                <div class="sk-doc-line" style="width:92%"></div>
                <div class="sk-doc-line" style="width:64%"></div>
                <div class="sk-doc-line" style="width:90%;margin-top:40px"></div>
                <div class="sk-doc-line" style="width:84%"></div>
                <div class="sk-doc-line" style="width:72%"></div>
              </div>
              <div class="sk-tag" id="tag">Ilustrasi</div>
            </div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-01-illustrative';
          const $ = SK.finder(ID);
          $('paper').style.clipPath = SK.torn(860, 1120, 11, { edges: 'b', amp: 12 });
          const inY = SK.onTwos(M.track(1, [[0.1, 0, [16, 0.8]]]));
          const push = SK.onTwos(M.track(1, [[1.7, 1.28, M.SLOW]]));
          const fy = SK.onTwos(M.track(960, [[1.7, 790, M.SLOW]]));
          SK.clip(ID, { T: 5, update: (t) => {
            SK.cam($('cam'), push(t), 540, fy(t));
            SK.piece($('sheet'), { x: 0, y: 1500 * inY(t), r: -1.5 }, 1, t, { amp: 1 });
            SK.highlight($('hl'), SK.smooth((t - 2.3) / 0.45));
            SK.grain($('grain'), t, 2);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/vx-02-capture-split.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: a real capture of Wikipedia's "Ken Burns effect" article (text CC BY-SA 4.0), shown with its source line. In a real clip the capture is the page Dena or the user named, and the highlighted phrase is the one being spoken. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #half { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; overflow: hidden; }
        #cam { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; transform-origin: 0 0; }
        #card { position: absolute; left: 70px; top: 150px; width: 940px; height: 548px; }
        #card img.cap { position: absolute; left: 0; top: 0; width: 940px; }
        #hl { left: 254px; top: 118px; width: 268px; height: 28px; }
        #ring { position: absolute; left: 0; top: 0; }
        #tape { left: 360px; top: -30px; width: 220px; transform: rotate(-4deg); }
        #src { left: 70px; top: 870px; }
      </style>
      <div id="root" data-composition-id="vx-02-capture-split" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-vox">
          <div id="half" class="sk-paper-cream">
            <div id="cam">
              <div id="card" class="sk-cut">
                <img class="cap" src="assets/cap-ken-burns.png" alt="" />
                <span class="sk-hl" id="hl"></span>
                <svg id="ring" viewBox="0 0 940 548" width="940" height="548"></svg>
                <div class="sk-tape-a" id="tape"></div>
              </div>
            </div>
            <div class="sk-source" id="src">Sumber: Wikipedia, "Ken Burns effect" (CC BY-SA 4.0)</div>
            <div class="sk-grain" id="grain"></div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-02-capture-split';
          const $ = SK.finder(ID);
          $('ring').innerHTML = `<path id="circ" class="sk-stroke" d="${SK.ellipse(150, 44, 150, 42, 5)}" style="stroke:var(--sk-accent-2);stroke-width:7"/>`;
          const inY = SK.onTwos(M.track(1, [[0.15, 0, [16, 0.8]]]));
          const push = SK.onTwos(M.track(1, [[2.4, 1.35, M.SLOW]]));
          const fx = SK.onTwos(M.track(540, [[2.4, 420, M.SLOW]]));
          const fy = SK.onTwos(M.track(480, [[2.4, 360, M.SLOW]]));
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            $('half').style.transform = `translateY(${(-(1 - M.eo(t / 0.3)) * 960).toFixed(2)}px)`;
            SK.cam($('cam'), push(t), fx(t), fy(t), 1080, 960);
            SK.piece($('card'), { x: 0, y: 900 * inY(t), r: 1 }, 3, t, { amp: 1 });
            SK.drawSeq(t, [{ el: $('circ'), at: 1.2, dur: 0.45 }]);
            SK.highlight($('hl'), SK.smooth((t - 3.2) / 0.6));
            $('src').style.opacity = t >= 0.4 ? '1' : '0';
            SK.grain($('grain'), t, 6);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/vx-03-map-pin.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the title is invented to show the mechanism. The map is Natural Earth (public domain) and the pin sits at Jakarta's real latitude/longitude via SK.geo. In a real clip the place is the one Dena names. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #cam { position: absolute; left: 0; top: 0; width: 2400px; height: 950px; transform-origin: 0 0; }
        #map { position: absolute; left: 0; top: 0; width: 2400px; height: 950px; }
        #pinwrap { position: absolute; left: 0; top: 0; width: 0; height: 0; }
        #pin { left: -18px; top: -52px; width: 36px; }
        #lab { position: absolute; left: 30px; top: -30px; padding: 4px 12px; background: #fbfaf6; font-size: 40px; font-weight: 700; white-space: nowrap; }
        #title { position: absolute; left: 70px; top: 230px; padding: 18px 30px; font-size: 92px; font-weight: 700; line-height: 1; color: var(--sk-ink); }
        #src { left: 80px; top: 1480px; font-size: 28px; }
      </style>
      <div id="root" data-composition-id="vx-03-map-pin" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-vox sk-paper-cream">
          <div id="cam">
            <img id="map" src="vendor/paper-pack/map-indonesia.svg" alt="" />
            <div id="pinwrap"><div class="sk-pin" id="pin"></div><div class="sk-sans" id="lab">Jakarta</div></div>
          </div>
          <div class="sk-serif sk-paper-white sk-cut" id="title">Mulai dari sini</div>
          <div class="sk-source" id="src">Peta: Natural Earth (domain publik)</div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-03-map-pin';
          const $ = SK.finder(ID);
          const J = SK.geo(...SK.CITIES.jakarta);
          $('pinwrap').style.transform = `translate(${J.x}px,${J.y}px)`;
          // map-zoom: whole country (width fits the frame), then a stepped push onto Jakarta
          const s = SK.onTwos(M.track(1080 / 2400, [[1.2, 1.4, [7, 1]]]));
          const fx = SK.onTwos(M.track(1200, [[1.2, J.x, [7, 1]]]));
          const fy = SK.onTwos(M.track(475, [[1.2, J.y, [7, 1]]]));
          const drop = SK.onTwos(M.track(1, [[2.6, 0, [24, 0.6]]]));
          SK.clip(ID, { T: 5, update: (t) => {
            SK.cam($('cam'), s(t), fx(t), fy(t));
            SK.enter($('title'), t - 0.2, 'rise');
            const d = drop(t);
            SK.piece($('pin'), { x: 0, y: -160 * d, o: t >= 2.6 ? 1 : 0 }, 9, t, { amp: 0.6 });
            SK.enter($('lab'), t - 2.9, 'pop');
            SK.grain($('grain'), t, 8);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/vx-04-clipping-panel.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: illustrative clippings (tagged "Ilustrasi", no real outlet) with invented headlines, to show the mechanism. In a real clip each headline is verbatim from the transcript or a real capture with its source line. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .clp { position: absolute; left: 0; top: 0; width: 620px; height: 250px; transform-origin: 50% 50%; }
        .clp .pp { position: absolute; inset: 0; padding: 34px 40px; box-sizing: border-box; }
        .clp .hd { font-size: 60px; font-weight: 700; line-height: 1.02; color: #1b1b1b; }
        .clp .sk-doc-line { height: 12px; margin: 16px 0; }
        #stampWrap { position: absolute; left: 610px; top: 560px; transform: rotate(-9deg); }
        #stamp { display: inline-block; padding: 10px 26px; border: 8px solid var(--sk-accent-2); color: var(--sk-accent-2); font-size: 84px; line-height: 1; letter-spacing: .04em; transform-origin: 50% 50%; mix-blend-mode: multiply; }
        #tag { left: 760px; top: 170px; }
      </style>
      <div id="root" data-composition-id="vx-04-clipping-panel" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-vox">
          <div class="clp sk-cut" id="c0"><div class="pp sk-paper-white" id="p0"><div class="hd sk-serif">Pesanan makin banyak</div><div class="sk-doc-line" style="width:90%"></div><div class="sk-doc-line" style="width:70%"></div></div></div>
          <div class="clp sk-cut" id="c1"><div class="pp sk-paper-cream" id="p1"><div class="hd sk-serif">Admin mulai kewalahan</div><div class="sk-doc-line" style="width:84%"></div><div class="sk-doc-line" style="width:60%"></div></div></div>
          <div class="clp sk-cut" id="c2"><div class="pp sk-paper-white" id="p2"><div class="hd sk-serif">Data tercecer di chat</div><div class="sk-doc-line" style="width:88%"></div><div class="sk-doc-line" style="width:66%"></div></div></div>
          <div id="stampWrap"><div class="sk-display" id="stamp">DICEK</div></div>
          <div class="sk-tag" id="tag">Ilustrasi</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-04-clipping-panel';
          const $ = SK.finder(ID);
          const SLAP = [[0.3, 90, 200, -4], [0.8, 330, 330, 3], [1.3, 150, 470, -2]];
          SLAP.forEach((_, i) => { $('p' + i).style.clipPath = SK.torn(620, 250, 60 + i, { edges: 'tb', amp: 8 }); });
          const fall = SLAP.map(([at]) => SK.onTwos(M.track(1, [[at, 0, [24, 0.62]]])));
          SK.clip(ID, { T: 5, bg: null, update: (t) => {
            SLAP.forEach(([at, x, y, r], i) => {
              const k = fall[i](t);
              SK.piece($('c' + i), { x, y: y - 260 * k, r: r + 10 * k, s: 1 + 0.2 * k, o: t >= at ? 1 : 0 }, 60 + i, t);
            });
            SK.enter($('stamp'), t - 2.4, 'slam');
            $('tag').style.opacity = t >= 1.3 ? '1' : '0';
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

- [ ] **Step 3: Mix-media clips**

Create `docs/agents/references/style-examples/compositions/mm-01-collage-doodle.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the note is invented. The speaker is the host's matted <video> (placeholder here) on track 6; this clip is the collage behind it. Keep the face zone (x 300–780, y 780–1320) clear. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        #strip { width: 520px; height: 130px; }
        #news { width: 420px; height: 520px; }
        #note { width: 280px; }
        #note span { position: absolute; left: 0; right: 0; top: 86px; text-align: center; font-size: 56px; font-weight: 700; line-height: 1; color: #2b2118; }
        #pin { left: 116px; top: -36px; width: 48px; }
        #ink { position: absolute; left: 0; top: 0; }
      </style>
      <div id="root" data-composition-id="mm-01-collage-doodle" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-stop sk-grid">
          <div class="p sk-cut" id="stripW"><div class="p sk-kraft" id="strip"></div></div>
          <div class="p sk-cut" id="newsW"><div class="p sk-newsprint" id="news"></div></div>
          <div class="p sk-cut" id="note"><div class="sk-sticky" style="width:280px"></div><span class="sk-hand">ide jam 2 pagi</span><div class="sk-pin" id="pin"></div></div>
          <svg class="sk-full" id="ink" viewBox="0 0 1080 1920" width="1080" height="1920"></svg>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-01-collage-doodle';
          const $ = SK.finder(ID);
          $('strip').style.clipPath = SK.torn(520, 130, 71, { edges: 'lr', amp: 14 });
          $('news').style.clipPath = SK.torn(420, 520, 72, { amp: 12 });
          // doodle-halo: short bursts above the head and two stars beside it, drawn on the key word
          const star = (x, y, r, s) => SK.line(x - r, y, x + r, y, s, 2) + ' ' + SK.line(x, y - r, x, y + r, s + 1, 2) + ' ' + SK.line(x - r * .7, y - r * .7, x + r * .7, y + r * .7, s + 2, 2);
          const rays = [[-60, 745, -95, 660], [0, 730, 0, 640], [60, 745, 95, 660]].map(([x1, y1, x2, y2], i) => SK.line(540 + x1, y1, 540 + x2, y2, 80 + i, 4));
          $('ink').innerHTML = rays.map((d, i) => `<path id="r${i}" class="sk-stroke" d="${d}" style="stroke:var(--sk-accent);stroke-width:9"/>`).join('') +
            `<path id="s0" class="sk-stroke" d="${star(230, 900, 38, 90)}" style="stroke:var(--sk-accent-2);stroke-width:7"/>` +
            `<path id="s1" class="sk-stroke" d="${star(870, 1000, 30, 93)}" style="stroke:var(--sk-accent-2);stroke-width:7"/>`;
          const S = [0, 1, 2].map((i) => ({ el: $('r' + i), at: 1.3 + i * 0.1, dur: 0.18 })).concat([{ el: $('s0'), at: 1.7, dur: 0.3 }, { el: $('s1'), at: 1.9, dur: 0.3 }]);
          const inS = SK.onTwos(M.track(1, [[0.1, 0, [18, 0.75]]]));
          SK.clip(ID, { T: 5, update: (t) => {
            const k = inS(t);
            SK.piece($('stripW'), { x: -60 - 400 * k, y: 230, r: -8 }, 1, t);
            SK.piece($('newsW'), { x: -110 - 400 * k, y: 1330, r: 7 }, 2, t);
            SK.piece($('note'), { x: 740 + 400 * k, y: 330, r: 5 }, 3, t);
            SK.drawSeq(t, S, { boil: 1.2 });
            SK.grain($('grain'), t, 4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/mm-02-orbit-arrow.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. Collage behind the speaker (track 4): real screenshots and cut-outs orbit above the face, one per spoken name. The capture is Wikipedia's "Ken Burns effect" (CC BY-SA 4.0); in a real clip each card is the tool or page Dena names. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        #cap { width: 400px; }
        #lap { width: 330px; }
        #pho { width: 170px; }
        #src { left: 60px; top: 90px; font-size: 26px; }
      </style>
      <div id="root" data-composition-id="mm-02-orbit-arrow" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-kraft">
          <img class="p sk-cut" id="cap" src="assets/cap-ken-burns.png" alt="" />
          <img class="p sk-cut" id="lap" src="assets/cut-laptop.png" alt="" />
          <img class="p sk-cut" id="pho" src="assets/cut-phone.png" alt="" />
          <div class="sk-source" id="src">Sumber: Wikipedia (CC BY-SA 4.0)</div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-02-orbit-arrow';
          const $ = SK.finder(ID);
          // screenshot-orbit: each card drops in on its word, then drifts in a slow stepped orbit
          const CARDS = [['cap', 0.5, 60, 170, -5], ['lap', 1.2, 700, 300, 6], ['pho', 1.9, 470, 90, -3]];
          const fall = CARDS.map(([, at]) => SK.onTwos(M.track(1, [[at, 0, [22, 0.65]]])));
          const drift = SK.onTwos((t) => t);
          SK.clip(ID, { T: 6, update: (t) => {
            const u = drift(t);
            CARDS.forEach(([id, at, x, y, r], i) => {
              const k = fall[i](t);
              SK.piece($(id), { x: x + 10 * Math.sin(u * 1.3 + i * 2), y: y - 500 * k + 8 * Math.cos(u * 1.1 + i), r: r + 12 * k, o: t >= at ? 1 : 0 }, 20 + i, t);
            });
            $('src').style.opacity = t >= 0.6 ? '1' : '0';
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/mm-02-orbit-arrow-front.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. Front layer of mm-02 (track 7, above the speaker): a note and an arrow that points at the speaker on the pronoun ("gue"). Never cross the eyes or mouth. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #note { position: absolute; left: 0; top: 0; width: 230px; transform-origin: 50% 50%; }
        #note span { position: absolute; left: 0; right: 0; top: 70px; text-align: center; font-size: 76px; font-weight: 700; color: #2b2118; }
        #ink { position: absolute; left: 0; top: 0; }
      </style>
      <div id="root" data-composition-id="mm-02-orbit-arrow-front" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop">
          <div class="sk-cut" id="note"><div class="sk-sticky" style="width:230px"></div><span class="sk-hand">gue</span></div>
          <svg class="sk-full" id="ink" viewBox="0 0 1080 1920" width="1080" height="1920"></svg>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-02-orbit-arrow-front';
          const $ = SK.finder(ID);
          const a = SK.arrow(230, 1270, 330, 1120, 30, 10, 40);
          $('ink').innerHTML = `<path id="as" class="sk-stroke" d="${a.shaft}" style="stroke:var(--sk-accent-2);stroke-width:9"/><path id="ah" class="sk-stroke" d="${a.head}" style="stroke:var(--sk-accent-2);stroke-width:9"/>`;
          const pop = SK.onTwos(M.track(0, [[2.6, 1, [24, 0.55]]]));
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            SK.piece($('note'), { x: 30, y: 1260, r: -6, s: Math.max(0.01, pop(t)), o: t >= 2.6 ? 1 : 0 }, 31, t);
            SK.drawSeq(t, [{ el: $('as'), at: 3.0, dur: 0.3 }, { el: $('ah'), at: 3.3, dur: 0.12 }], { boil: 1 });
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/mm-03-torn-window.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. Collage behind the speaker (track 4) for mm-03: newsprint seen through the torn window of the front layer. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
      </style>
      <div id="root" data-composition-id="mm-03-torn-window" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-newsprint">
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-03-torn-window';
          const $ = SK.finder(ID);
          SK.clip(ID, { T: 6, update: (t) => SK.grain($('grain'), t, 7) });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/mm-03-torn-window-front.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. Front layer of mm-03 (track 7): a kraft sheet over everything tears open around the speaker (the torn edge also hides matte edges), then a paper phone cut-out lands beside them. The phone is a Codex paper cut-out. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #sheet { position: absolute; left: 0; top: 0; }
        #pho { position: absolute; left: 0; top: 0; width: 230px; transform-origin: 50% 50%; }
      </style>
      <div id="root" data-composition-id="mm-03-torn-window-front" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop">
          <svg class="sk-full sk-cut" id="sheet" viewBox="0 0 1080 1920" width="1080" height="1920">
            <defs><pattern id="kraftTex" patternUnits="userSpaceOnUse" width="1080" height="1920"><image href="vendor/paper-pack/kraft.jpg" width="1080" height="1920" /></pattern></defs>
            <path id="hole" fill="url(#kraftTex)" fill-rule="evenodd" d="M0 0H1080V1920H0Z" />
          </svg>
          <img class="sk-cut" id="pho" src="assets/cut-phone.png" alt="" />
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-03-torn-window-front';
          const $ = SK.finder(ID);
          // the window: a seeded ragged outline around the speaker, scaled about its centre as it tears open
          const r = SK.rng(303), CX = 540, CY = 1320, W = 430, H = 720, N = 56, ring = [];
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2, j = 1 + (r() - 0.5) * 0.09;
            ring.push([Math.cos(a) * W * j, Math.sin(a) * H * j]);
          }
          const open = SK.onTwos(M.track(0.02, [[0.3, 1, [9, 0.95]]]));
          const drop = SK.onTwos(M.track(1, [[2.6, 0, [22, 0.62]]]));
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            const k = open(t);
            const pts = ring.map(([x, y]) => `${(CX + x * k).toFixed(1)} ${(CY + y * k).toFixed(1)}`);
            $('hole').setAttribute('d', `M0 0H1080V1920H0Z M${pts.join('L')}Z`);
            const d = drop(t);
            SK.piece($('pho'), { x: 800, y: 1330 - 700 * d, r: 9 + 14 * d, o: t >= 2.6 ? 1 : 0 }, 32, t);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/mm-04-polaroid-caption.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. Collage behind the speaker (track 4) for mm-04: dark kraft with torn notebook scraps in the corners. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        .scrap { width: 380px; height: 240px; }
      </style>
      <div id="root" data-composition-id="mm-04-polaroid-caption" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-stop sk-kraft-dark">
          <div class="p sk-cut" id="a"><div class="p scrap sk-lined" id="ap"></div></div>
          <div class="p sk-cut" id="b"><div class="p scrap sk-paper-grey" id="bp"></div></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-04-polaroid-caption';
          const $ = SK.finder(ID);
          $('ap').style.clipPath = SK.torn(380, 240, 41, { amp: 10 });
          $('bp').style.clipPath = SK.torn(380, 240, 42, { amp: 10 });
          SK.clip(ID, { T: 5, update: (t) => {
            SK.piece($('a'), { x: -90, y: 120, r: -12 }, 1, t);
            SK.piece($('b'), { x: 800, y: 60, r: 14 }, 2, t);
            SK.grain($('grain'), t, 9);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

Create `docs/agents/references/style-examples/compositions/mm-04-polaroid-caption-front.html`:

````html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the caption words are invented. Front layer of mm-04 (track 7): a polaroid frame drops around the speaker (its bottom band hides the matte's cut-off body), then a torn paper strip caption is taped on. In a real clip the words are verbatim from the transcript. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #pol { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform-origin: 540px 1160px; }
        #frame { position: absolute; left: 0; top: 0; }
        #pcap { position: absolute; left: 0; right: 0; top: 1600px; text-align: center; font-size: 84px; font-weight: 700; color: #2b2118; }
        .tp { top: 548px; width: 230px; }
        #strip { position: absolute; left: 0; top: 0; width: 760px; height: 150px; transform-origin: 50% 50%; }
        #stripP { position: absolute; inset: 0; }
        #stripP span { position: absolute; left: 0; right: 0; top: 24px; text-align: center; font-size: 100px; color: var(--sk-accent); }
      </style>
      <div id="root" data-composition-id="mm-04-polaroid-caption-front" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-stop">
          <div id="pol">
            <svg class="sk-full sk-cut" id="frame" viewBox="0 0 1080 1920" width="1080" height="1920">
              <path fill="#f7f5f0" fill-rule="evenodd" d="M90 560H990V1780H90Z M140 610V1540H940V610Z" />
            </svg>
            <div class="sk-hand" id="pcap">tim kecil, sistem rapi</div>
            <div class="tp sk-tape-a" style="left:40px;transform:rotate(-32deg)"></div>
            <div class="tp sk-tape-b" style="left:810px;transform:rotate(30deg)"></div>
          </div>
          <div class="sk-cut" id="strip"><div class="sk-paper-cream" id="stripP"><span class="sk-display">SEKARANG BEDA</span></div></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-04-polaroid-caption-front';
          const $ = SK.finder(ID);
          $('stripP').style.clipPath = SK.torn(760, 150, 44, { edges: 'lr', amp: 12 });
          const fall = SK.onTwos(M.track(1, [[0.2, 0, [16, 0.7]]]));
          const lab = SK.onTwos(M.track(1, [[1.6, 0, [22, 0.7]]]));
          SK.clip(ID, { T: 5, bg: null, update: (t) => {
            const k = fall(t);
            SK.piece($('pol'), { x: 0, y: 0, r: -2 + 8 * k, s: 1 + 0.18 * k, o: t >= 0.2 ? 1 : 0 }, 50, t, { amp: 1 });
            const s = lab(t);
            SK.piece($('strip'), { x: 160, y: 300 + 200 * s, r: -3 + 6 * s, o: t >= 1.6 ? 1 : 0 }, 51, t);
          } });
        })();
      </script>
    </template>
  </body>
</html>
````

- [ ] **Step 4: Host and snapshot times**

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
      /* mix-media: matted speaker (track 6) above the collage, front layer (track 7) above the speaker */
      .cutout { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 24; object-fit: cover; }
      .broll-front { position: absolute; inset: 0; z-index: 26; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="style-examples" data-start="0" data-width="1080" data-height="1920" data-duration="153.5">
      <div id="base-video" class="clip" data-start="0" data-duration="153.5" data-track-index="1">
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
      <div id="vx-01-illustrative-mount" class="broll" data-composition-id="vx-01-illustrative" data-composition-src="compositions/vx-01-illustrative.html"
           data-start="106.5" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="vx-02-capture-split-mount" class="broll" data-composition-id="vx-02-capture-split" data-composition-src="compositions/vx-02-capture-split.html"
           data-start="112" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="vx-03-map-pin-mount" class="broll" data-composition-id="vx-03-map-pin" data-composition-src="compositions/vx-03-map-pin.html"
           data-start="118.5" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="vx-04-clipping-panel-mount" class="broll" data-composition-id="vx-04-clipping-panel" data-composition-src="compositions/vx-04-clipping-panel.html"
           data-start="124" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="mm-01-collage-doodle-mount" class="broll" data-composition-id="mm-01-collage-doodle" data-composition-src="compositions/mm-01-collage-doodle.html"
           data-start="129.5" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <video id="mm-01-cut" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline
             data-start="129.5" data-duration="5" data-track-index="6"></video>
      <div id="mm-02-orbit-arrow-mount" class="broll" data-composition-id="mm-02-orbit-arrow" data-composition-src="compositions/mm-02-orbit-arrow.html"
           data-start="135" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <video id="mm-02-cut" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline
             data-start="135" data-duration="6" data-track-index="6"></video>
      <div id="mm-02-orbit-arrow-front-mount" class="broll-front" data-composition-id="mm-02-orbit-arrow-front" data-composition-src="compositions/mm-02-orbit-arrow-front.html"
           data-start="135" data-duration="6" data-track-index="7" data-width="1080" data-height="1920"></div>
      <div id="mm-03-torn-window-mount" class="broll" data-composition-id="mm-03-torn-window" data-composition-src="compositions/mm-03-torn-window.html"
           data-start="141.5" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <video id="mm-03-cut" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline
             data-start="141.5" data-duration="6" data-track-index="6"></video>
      <div id="mm-03-torn-window-front-mount" class="broll-front" data-composition-id="mm-03-torn-window-front" data-composition-src="compositions/mm-03-torn-window-front.html"
           data-start="141.5" data-duration="6" data-track-index="7" data-width="1080" data-height="1920"></div>
      <div id="mm-04-polaroid-caption-mount" class="broll" data-composition-id="mm-04-polaroid-caption" data-composition-src="compositions/mm-04-polaroid-caption.html"
           data-start="148" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
      <video id="mm-04-cut" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline
             data-start="148" data-duration="5" data-track-index="6"></video>
      <div id="mm-04-polaroid-caption-front-mount" class="broll-front" data-composition-id="mm-04-polaroid-caption-front" data-composition-src="compositions/mm-04-polaroid-caption-front.html"
           data-start="148" data-duration="5" data-track-index="7" data-width="1080" data-height="1920"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // Split treatment (tx-02, mg-02, wb-03, sm-02, vx-02): slide the base video into the bottom half, then back.
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 5);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 10.55);
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 28);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 33.55);
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 60.5);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 67.05);
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 81);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 86.55);
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 112);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 117.55);
      // Collage treatment (mm-01..04): the collage clip is an opaque full-frame backdrop, so it already covers the
      // base video; never tween #base-video opacity (the linter treats it as a full-frame overlay).
      window.__timelines['style-examples'] = tl;
    </script>
  </body>
</html>
````

Replace `docs/agents/references/style-examples/snapshots.json` with:

````json
{"at": [1.2, 4.2, 7.0, 10.7, 13.5, 15.6, 18.0, 21.2, 23.2, 27.2, 29.5, 33.7, 35.5, 40.2, 43.0, 46.7, 49.5, 53.2, 56.0, 59.7, 63.0, 67.2, 70.9, 73.7, 77.3, 80.2, 82.5, 86.7, 89.3, 92.2, 95.2, 98.7, 101.5, 104.6, 105.4, 108.9, 111.2, 114.4, 117.7, 120.2, 123.2, 125.9, 128.7, 131.6, 134.2, 138.6, 140.7, 142.3, 147.2, 149.8, 152.7]}
````

- [ ] **Step 5: Check and review**

```bash
rm -rf /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b/before-stills && cp -R renders/style-examples /private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b/before-stills
npm run check:style-examples
```
Expected: lint `0 errors, 0 warnings`; validate `0 error(s), 0 warning(s)` + 5 contrast warnings (all `#face-label`); `51 snapshots saved`.

Pixel-compare the previous 35 stills (all must be identical):
```bash
python3 - <<'PYEOF'
from PIL import Image, ImageChops
import glob, os
old = sorted(glob.glob('/private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b/before-stills/frame-*.png'))
same = sum(ImageChops.difference(Image.open(o).convert('RGB'), Image.open('renders/style-examples/' + os.path.basename(o)).convert('RGB')).getbbox() is None for o in old)
print(f'{same}/{len(old)} previous frames pixel-identical')
PYEOF
```

Open `renders/style-examples/contact-sheet-4.jpg` (last frame), `-5.jpg`, `-6.jpg` and confirm:
- 108.9 / 111.2 s vx-01: illustrative sheet with "ILUSTRASI" (dark on yellow); at 111.2 the highlight covers "nyari datanya".
- 114.4 / 117.7 s vx-02: Wikipedia capture in the top half, red circle around the title, highlight on "panning and zooming effect", source line readable, face below.
- 120.2 / 123.2 s vx-03: "Mulai dari sini" label over the map; at 123.2 the pin and "Jakarta" sit on Java's north-west coast.
- 125.9 / 128.7 s vx-04: three clippings above the face, "ILUSTRASI" tag; "DICEK" stamp at 128.7.
- 131.6 / 134.2 s mm-01: grid collage, the placeholder with an off-white outline, rays above the head, two stars beside it.
- 138.6 / 140.7 s mm-02: capture and cut-outs orbiting the top; "gue" note and arrow pointing at the head.
- 142.3 / 147.2 s mm-03: kraft sheet torn open around the speaker; phone cut-out beside them at 147.2.
- 149.8 / 152.7 s mm-04: polaroid frame around the speaker, taped; "SEKARANG BEDA" strip above.

- [ ] **Step 6: Prove the alpha cut-out in an MP4 render**

```bash
M=/private/tmp/claude-501/-Users-denameidina-Documents-videos/83e8d37e-31a6-4e0d-9c92-1143d97f6b32/scratchpad/staging-2b/mm-mini && rm -rf "$M" && mkdir -p "$M" && cp -R docs/agents/references/style-examples/. "$M"/ && mkdir -p "$M/vendor" && cp -R vendor/gsap.min.js vendor/motion-kit vendor/style-kit vendor/paper-pack "$M/vendor/"
python3 - "$M/index.html" <<'PYEOF'
import sys
p = sys.argv[1]; s = open(p).read(); head = s[:s.index('<body>')]
open(p, 'w').write(head + '''<body>
    <div id="root" data-composition-id="mm-mini" data-start="0" data-width="1080" data-height="1920" data-duration="6">
      <div id="base-video" class="clip" data-start="0" data-duration="6" data-track-index="1"><div id="face"></div><div id="face-label">placeholder wajah</div></div>
      <div id="mm-02-orbit-arrow-mount" class="broll" data-composition-id="mm-02-orbit-arrow" data-composition-src="compositions/mm-02-orbit-arrow.html" data-start="0" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <video id="mm-02-cut" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline data-start="0" data-duration="6" data-track-index="6"></video>
      <div id="mm-02-orbit-arrow-front-mount" class="broll-front" data-composition-id="mm-02-orbit-arrow-front" data-composition-src="compositions/mm-02-orbit-arrow-front.html" data-start="0" data-duration="6" data-track-index="7" data-width="1080" data-height="1920"></div>
    </div>
    <script>window.__timelines = window.__timelines || {}; window.__timelines['mm-mini'] = gsap.timeline({ paused: true });</script>
  </body>
</html>
''')
PYEOF
rtk proxy npx --yes hyperframes@0.7.24 render --quality high -o "$M/mm-mini.mp4" "$M"
ffmpeg -loglevel error -y -ss 4 -i "$M/mm-mini.mp4" -frames:v 1 renders/mm-mini-4s.png
rm -rf "$M"
```
Expected: the render finishes; `renders/mm-mini-4s.png` (view it) shows the kraft collage, cards at the top, the grey silhouette with an off-white outline, and the "gue" arrow — the collage visible around the silhouette, not a grey box.

- [ ] **Step 7: Commit**

```bash
git add docs/agents/references/style-examples docs/agents/references/mix-media-placeholder
git commit -m "feat: add VOX and mix-media examples with a placeholder cut-out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: References, menu, Style Assets

**Files:** Create `docs/agents/references/styles/vox.md`, `docs/agents/references/styles/mix-media.md`; Modify `scripts/style-docs.test.mjs`, `docs/agents/references/styles/README.md`, `docs/agents/references/asset-production.md`.

- [ ] **Step 1: Extend the richness test (red)**

1. In `scripts/style-docs.test.mjs` replace:

````text
  { file: 'stop-motion.md', patterns: 12, refs: 6, prefix: 'sm-' },
````

   with:

````text
  { file: 'stop-motion.md', patterns: 12, refs: 6, prefix: 'sm-' },
  { file: 'vox.md', patterns: 12, refs: 6, prefix: 'vx-', sections: ['Documents', 'Document Ethics'] },
  { file: 'mix-media.md', patterns: 12, refs: 6, prefix: 'mm-', treatments: ['collage'], sections: ['Treatment: collage', 'Matte Notes'] },
````

2. In `scripts/style-docs.test.mjs` replace:

````text
    for (const h of ['When To Use', 'Look', 'Timing', 'Patterns', 'References', 'Build Recipe', 'SFX', 'Examples', 'Anti-slop Checklist']) section(md, h);
````

   with:

````text
    for (const h of ['When To Use', 'Look', 'Timing', 'Patterns', 'References', 'Build Recipe', 'SFX', 'Examples', 'Anti-slop Checklist', ...(s.sections ?? [])]) section(md, h);
````

3. In `scripts/style-docs.test.mjs` replace:

````text
  test(`${s.file}: at least 4 examples that exist and cover cutaway, split, and panel`, () => {
````

   with:

````text
  test(`${s.file}: at least 4 examples that exist and cover ${(s.treatments ?? ['cutaway', 'split', 'panel']).join(', ')}`, () => {
````

4. In `scripts/style-docs.test.mjs` replace:

````text
    assert.deepEqual([...treatments].sort(), ['cutaway', 'panel', 'split']);
````

   with:

````text
    assert.deepEqual([...treatments].sort(), [...(s.treatments ?? ['cutaway', 'panel', 'split'])].sort());
````

5. In `scripts/style-docs.test.mjs` replace:

````text
  assert.equal(clips.length, 17);
````

   with:

````text
  assert.equal(clips.length, 28);
````

Run: `node --test scripts/style-docs.test.mjs`
Expected: FAIL — `ENOENT … styles/vox.md`.

- [ ] **Step 2: Write the references**

Every reference URL was opened during research on 2026-09-27. Do not add references without opening their URL.

Create `docs/agents/references/styles/vox.md`:

````markdown
# VOX (Style Reference)

The Vox-explainer look: a real capture or a clearly illustrative document on
paper, a yellow highlighter sweeping across the exact phrase being spoken, red-pen
circles and underlines, a stepped camera push into the paragraph that matters,
map zooms with pins, grain, and a source line on screen. Loaded by
`docs/agents/02-screen-plan.md` (visual step, after `styles/README.md`) and
`docs/agents/03-build.md` (author step). Engine: `vendor/style-kit/`
(`window.SK`, including `SK.highlight`, `SK.geo`) on top of `vendor/motion-kit/`;
paper, pins, tape, and the Indonesia map: `vendor/paper-pack/`. Worked examples:
`docs/agents/references/style-examples/` (`vx-01` … `vx-04`,
`npm run check:style-examples`).

## When To Use

Use `vox` for a line that **points at a document, a source, or a place**:

- Dena quotes or paraphrases an article, report, post, policy, or website;
- a claim that is stronger when the viewer sees the words it comes from;
- a place name, a market, a city (map-zoom);
- a pattern across several sources ("semua orang bilang…").

Do not use it for:

- a tool being used (use `motion-broll` or a screen capture);
- a punchline with no source (use `broll-text`);
- a personal, emotional, or opinion line (keep Dena's face).

## Documents

Every VOX clip shows one of two document kinds; the brief says which
(`Document: capture | illustrative`).

| Kind | Source | Must be on screen |
| --- | --- | --- |
| `capture` | A real screenshot from Screen Plan research — the article, document, site, or tool Dena or the user named — saved as `assets/captures/NN-name.png` (Screenshot Rules and URL Research in `asset-production.md`) | A source line (outlet or domain, and date or "diakses <date>") ≥ 28 px, visible ≥ 1.5 s; private data redacted (Gate 2 R2) |
| `illustrative` | A generic sheet built in the clip: a headline from the transcript, body as grey lines (`.sk-doc-line`), never fake prose | The tag **"Ilustrasi"** (`.sk-tag`); no real outlet's masthead, layout, or logo; no invented numbers |

## Document Ethics

- Never fake a source: a capture is a capture of the real page; an illustration
  is labelled "Ilustrasi" and never imitates a real outlet (Kompas, Tempo,
  TechCrunch, …) — doing so trips Gate 2 R6.
- Highlight only the words being spoken, and only where the phrase means the same
  inside its full sentence.
- Crop honestly: keep qualifiers ("perkiraan", "hingga", a date) that change the
  meaning.
- Cite on screen: outlet or domain and date. Licensed text (for example Wikipedia,
  CC BY-SA) names its license in the source line.
- Redact names, phone numbers, emails, account ids, and faces of private people in
  captures (`.sk-redact` or blur before the capture is saved).
- Archival photos: public domain or CC only, license recorded in the asset
  manifest.

## Look

| Token | Default (`.sk-vox`) | Alt A "newsprint" | Alt B "dark desk" | Alt C "blueprint" |
| --- | --- | --- | --- | --- |
| background class | `.sk-paper-cream` | `.sk-newsprint` | `.sk-kraft-dark` | `.sk-grid` |
| `--sk-ink` | `#1b1b1b` | `#1b1b1b` | `#f5efe6` | `#1e3a5f` |
| `--sk-accent` (highlighter) | `#ffe14d` | `#ffe14d` | `#ffe14d` | `#ffe14d` |
| `--sk-accent-2` (red pen) | `#d7263d` | `#d7263d` | `#ff6b6b` | `#d7263d` |
| `--sk-muted` | `#8c8577` | `#6b665c` | `#a8a29e` | `#7ea3d4` |

- One highlighter colour across the whole video, so it reads as a signature
  (*Explained*).
- Documents sit on white or cream paper pieces with torn edges and a hard
  `.sk-cut` shadow; tape or a pin holds a capture.
- Type: headlines and pull-quotes in Newsreader (`.sk-serif`), labels and source
  lines in Geist (`.sk-source`, `.sk-tag`).
- Maps: `vendor/paper-pack/map-indonesia.svg` (Natural Earth, desaturated
  sand/grey), pins from `.sk-pin`, place labels on a paper chip.
- Grain: one `.sk-grain` overlay moved by `SK.grain`; imperfection is the brand —
  "you don't want it to look perfect" (Vox art director, via Storybench).

## Timing

- Step every graphic move on the 15-steps-per-second grid (`SK.onTwos`) — the
  Vox "12 fps inside 24" stutter at a 30 fps render. Dena's footage is never
  stepped.
- A highlight starts ~2 frames before the first highlighted word and finishes on
  the last one (0.3–0.7 s).
- One motion per beat: a push, then a hold. Don't push, pan, and shake at once;
  hold a document long enough to read (Estelle Caswell holds archival images for
  seconds).
- The key image comes after the context (Joss Fong): build 1–2 s of setup, then
  reveal the proof on the payoff word.
- Keep a VOX clip ≤ 7 s; it supports the line, it doesn't outlast it.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **highlight-sweep** | Yellow marker wipes left to right under the exact phrase | Quoting a document or a figure | Starts ~2 frames before the first word, ends on the last | soft marker squeak | Highlighting a paragraph, or words nobody says | `.sk-hl` inside a `position: relative` span of the phrase + `SK.highlight(el, u)` |
| **pen-underline** | Red wavy line under 1–3 words | A contrast word or a number | Drawn during the stressed word, 0.2–0.35 s | pen scratch | A perfect vector line | `SK.line` in the accent-2 colour + `SK.drawSeq` |
| **circle-annotate** | Loose red ellipse around a name or figure, overshooting its start | "Angka ini" / "yang ini" | Closes on the word | quick scribble | Circling several things at once | `SK.ellipse(...)` + `SK.drawSeq` |
| **doc-push** | Stepped camera push 15–35% into the paragraph that matters | Moving from the whole page to one clause | Push on the setup, land as the clause is read | low paper rustle | A push that keeps drifting after the line | `SK.cam` with `SK.onTwos(M.track(...))` |
| **clipping-stack** | 3–4 clippings slap down, rotated, with hard shadows | "Semua orang bilang…", a pattern across sources | One per beat or stressed word | paper slap each | Illegible or fake headlines | `SK.piece` drop + `SK.torn` edges |
| **pinned-source** | A capture pinned or taped to the board with a source line | Proof of a claim | Source line visible ≥ 1.5 s | tape rip | Missing or fake source | `.sk-tape-a`/`.sk-pin` + `.sk-source` |
| **redact-bar** | Black bars wipe over private or irrelevant text | Hiding personal data or noise | Before the document is readable | marker swipe | Redacting to fake a "leak" | `.sk-redact` + `SK.highlight` |
| **pull-quote** | One sentence isolated on paper in a big serif, with its speaker | A strong line from a founder or document | Words appear as they are said | soft typewriter or none | Paraphrase inside quote marks | `.sk-serif` + `SK.reveal(..., 'rise')` |
| **map-zoom** | Desaturated map, stepped zoom, a pin drops, a place label | A place or a market | Pin lands on the place name | pin thud | Wrong borders; a label that drifts off the pin | `SK.geo(lat, lon)` + `SK.cam` on `map-indonesia.svg` |
| **archival-pan** | Slow stepped pan or push across a real photo, with grain | History, an origin story | Movement ends on the detail being named | room tone | Pan and zoom in one 3 s shot | `SK.cam` on an `<img>`, one direction, 3–6% |
| **stamp** | A word stamp ("DICEK", "2019") slams onto the document | Verdicts, dates, turning points | Hard hit on the stressed syllable | rubber stamp | Stamping an opinion as fact | `.sk-display` in a wrapper + `SK.enter(el, dt, 'slam')` |
| **source-line** | Small line at the bottom: outlet or domain, date, license | Every capture, stat, photo, map | For the whole shot | none | Under 28 px, or missing | `.sk-source` |
| **split-docs** | Two documents stacked top and bottom | Claim vs reality, then vs now | Second enters on "tapi" / "sedangkan" | two slaps | Both too small to read | two `SK.piece` sheets, each ≥ 900 px wide |
| **arrow-callout** | Hand-drawn arrow + 1–3 word label pointing at a detail | Pointing at a number or a line in a capture | Arrow draws on the noun | pen flick | Arrows pointing at nothing | `SK.arrow` + `.sk-hand` label |
| **before-after-doc** | The same document, old then new; a wipe or strike changes it | Pivots, price or policy changes | Swap on "sekarang" / "berubah" | paper flip | Implying a change the source doesn't show | two layers + `SK.highlight`-style wipe or `.sk-redact` strike |

## References

### R1 — "5 Breakdowns on Replicating the VOX Motion Graphic Look" (PremiumBeat, 2021)
- Source: https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/
- Steal: graphics rendered at 12 fps inside a 24 fps timeline; camera pull-backs
  with blur to hide cuts; layered textures that move slightly.
- 9:16: step the graphic layer (`SK.onTwos`) while Dena stays at 30 fps; a short
  stepped push into the next document replaces a transition.

### R2 — "How Vox uses animation to make complicated topics digestible for everyone" (Storybench, 2024)
- Source: https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/
- Steal: "You don't want it to look perfect because that might make it look more
  like an ad than an editorial piece"; handmade construction-paper visuals; a
  recurring motif per concept.
- 9:16: torn, slightly crooked paper and visible grain; one motif (the
  highlighter) repeated across the video.

### R3 — "Explainer: An Interview with Vox Pop Video Essayist Estelle Caswell" (Film Independent, 2018)
- Source: https://www.filmindependent.org/blog/explainer-an-interview-with-vox-pop-video-essayist-estelle-caswell/
- Steal: "the whole point of video is that you're talking about the thing
  onscreen"; original data first.
- 9:16: every document on screen is the thing being said at that moment — never
  generic "paper vibes".

### R4 — "Vox Earworm Storytelling: A Chat with Estelle Caswell" (School of Motion)
- Source: https://schoolofmotion.com/blog/estelle-caswell-vox-podcast
- Steal: archival material first; colour highlighting on the words that matter;
  jump cuts and long holds instead of flashy transitions.
- 9:16: one clipping, one highlight, one hold — no triple motion on a 4 s beat.

### R5 — "Videogram: How a Vox Video Explains the Science behind the First Photo of a Black Hole" (The Open Notebook, 2020)
- Source: https://www.theopennotebook.com/2020/01/07/videogram-how-a-vox-video-explains-the-science-behind-the-first-photo-of-a-black-hole/
- Steal: context before the key image; label the image when it appears; show that
  illustrations are illustrations.
- 9:16: 1–2 s of setup, then the proof document with its label on the payoff word;
  the "Ilustrasi" tag is the same honesty.

### R6 — "Behind the scenes of the Vox web series 'Borders'" (Storybench, 2020)
- Source: https://www.storybench.org/behind-the-scenes-of-the-vox-web-series-borders/
- Steal: Johnny Harris hunts for visual anchors that carry meaning; the host talks
  to camera and the b-roll is the evidence.
- 9:16: Dena's face carries the voice; each VOX clip is one strong anchor for one
  claim.

### R7 — "How to Create Vox Style Maps in Adobe After Effects" (No Film School, 2020)
- Source: https://nofilmschool.com/how-create-vox-style-map-animations-after-effects
- Steal: camera path over the map, labels parented to the track points; desaturate,
  grade, drop to ~10 fps, add low-opacity grain.
- 9:16: 3–5 s zoom from the country to the city with `SK.geo`, the pin landing on
  the place name.

### R8 — "How I Got a Gig Making Maps for Johnny Harris" (PremiumBeat, 2022)
- Source: https://www.premiumbeat.com/blog/making-maps-for-johnny-harris/
- Steal: call-outs and shapes tracked to the camera move; markers that blink.
- 9:16: the label moves with the pin inside the camera layer; a label that drifts
  off its pin looks cheap.

### R9 — Ken Burns effect and *City of Gold* (NFB, 1957)
- Source: https://en.wikipedia.org/wiki/Ken_Burns_effect and
  https://en.wikipedia.org/wiki/City_of_Gold_(1957_film)
- Steal: slow pan and zoom across stills, settling on the subject being named;
  Burns cites *City of Gold* as the inspiration.
- 9:16: `archival-pan` — one direction, 3–6% over the shot, ending on the detail
  the line names.

### R10 — *Explained* (Netflix / Vox Media) and a Jasper Pictures case study
- Source: https://en.wikipedia.org/wiki/Explained_(TV_series) and
  https://jasperpictures.com.au/blog/vox-explained-a-case-study/
- Steal: the "trademark yellow highlighting" as a series signature.
- 9:16: one highlighter colour for the whole video (`--sk-hl-color` stays the same).

### R11 — "How Vox-Style Edits Are Built" (EarnEdits, secondary source)
- Source: https://earnedits.com/how-vox-style-edits-are-built/?v=0b3b97fa6688
- Steal: "a professional Vox edit uses motion to carry information, and an amateur
  imitation adds motion for decoration."
- 9:16: the QA rule — any move not tied to a spoken word is cut.

## Build Recipe

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    #sheet { position: absolute; left: 110px; top: 330px; width: 860px; height: 900px; }
    #paper { position: absolute; inset: 0; padding: 70px; box-sizing: border-box; }
    #head { font-size: 76px; font-weight: 700; line-height: 1.04; }
    #lede { margin-top: 40px; font-size: 44px; line-height: 1.32; }
    .hlw { position: relative; }
    #hl { left: -8px; right: -8px; top: 14%; bottom: 2%; }
    #tag { right: 30px; top: 30px; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="5">
    <div class="sk-stage sk-vox sk-newsprint">
      <div id="sheet" class="sk-cut">
        <div id="paper" class="sk-paper-white">
          <div id="head" class="sk-serif">Yang bikin capek bukan kerjanya</div>
          <div id="lede" class="sk-serif">tapi harus <span class="hlw"><span class="sk-hl" id="hl"></span>nyari datanya</span> lagi.</div>
          <div class="sk-doc-line" style="width:92%"></div>
        </div>
        <div class="sk-tag" id="tag">Ilustrasi</div>
      </div>
      <div class="sk-grain" id="grain"></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      $('paper').style.clipPath = SK.torn(860, 900, 11, { edges: 'b', amp: 12 });
      SK.clip(ID, { T: 5, update: (t) => {
        SK.highlight($('hl'), SK.smooth((t - 2.3) / 0.45));   // "nyari datanya" at clip time 2.3 s
        SK.grain($('grain'), t, 2);
      } });
    })();
  </script>
</template>
```

- Put the highlight inside a `position: relative` span around the spoken phrase,
  so it follows the text wherever it wraps. On a capture, place `.sk-hl` at the
  phrase's pixel box inside the capture's container.
- Map pins: `const p = SK.geo(...SK.CITIES.jakarta)` (or any `[lat, lon]`), put the
  pin and label inside the same camera layer as the map.
- A capture is an `<img>` of `assets/captures/NN-name.png`; always add `.sk-source`.

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| highlight-sweep | soft marker squeak | 0.08–0.12 |
| pen-underline, circle-annotate, arrow-callout | pen scratch / flick | 0.08–0.12 |
| clipping-stack, split-docs | paper slap | 0.1–0.14 |
| stamp, map-zoom pin | rubber stamp / pin thud | 0.12–0.16 |
| doc-push, archival-pan | low paper rustle / room tone | 0.06–0.1 |

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/compositions/vx-01-illustrative.html` | illustrative document + highlight-sweep + doc-push, "Ilustrasi" tag | cutaway |
| `style-examples/compositions/vx-02-capture-split.html` | real capture (Wikipedia, CC BY-SA 4.0) + circle-annotate + highlight-sweep + doc-push + source-line | split |
| `style-examples/compositions/vx-03-map-pin.html` | map-zoom onto Jakarta via `SK.geo` + source-line | cutaway |
| `style-examples/compositions/vx-04-clipping-panel.html` | clipping-stack + stamp, "Ilustrasi" tag | panel |

## Anti-slop Checklist

- [ ] Every document is a real capture with a source line, or an illustration tagged "Ilustrasi" — nothing in between.
- [ ] No real outlet's masthead, layout, or logo on an illustration; no AI gibberish or lorem ipsum anywhere.
- [ ] The highlight covers only the spoken words and finishes as they finish.
- [ ] The highlighted phrase means the same inside its full sentence; qualifiers were not cropped away.
- [ ] One motion per beat, then a hold; nothing keeps drifting after the line.
- [ ] Graphics move on the step grid; Dena's footage is not stepped.
- [ ] Annotations are hand-drawn (seeded builders), not perfect vector shapes.
- [ ] Map places come from `SK.geo` with real coordinates; labels stay on their pins.
- [ ] Source lines are ≥ 28 px and on screen ≥ 1.5 s; private data is redacted.
````

Create `docs/agents/references/styles/mix-media.md`:

````markdown
# Mix-media (Style Reference)

Dena keeps talking, cut out of her own footage, on a paper collage: torn paper,
real screenshots, doodles, stickers, tape, cut-out objects, animated around her.
Loaded by `docs/agents/02-screen-plan.md` (visual step, after
`styles/README.md`) and `docs/agents/03-build.md` (author step). Cut-out:
`npm run video -- cutout` (matte of `processed.mp4`). Engine: `vendor/style-kit/`
on top of `vendor/motion-kit/`; paper and objects: `vendor/paper-pack/`. Worked
examples: `docs/agents/references/style-examples/` (`mm-01` … `mm-04`, with a
placeholder silhouette instead of a real person; `npm run check:style-examples`).

## When To Use

Use `mix-media` when **Dena should stay on screen while the world around her
changes**:

- she names several tools, pages, or sources and they gather around her;
- a "gue" / "dulu vs sekarang" moment where her presence is the point;
- the hook or a chapter change that needs energy without hiding her face;
- a proof screenshot that should sit next to her instead of replacing her.

Do not use it for:

- a detailed document or UI that needs the full frame (use `vox`, a capture, or
  `motion-broll` cutaway);
- more than ~20% of the video (it is a peak, not a background);
- shots where the matte fails (fast hands across the face, busy backgrounds with
  the same colours as clothes) — check the cut-out first.

Dena's likeness only ever comes from her footage (`video cutout`); never generate
it. Screenshots are real captures with a source line when they carry information.

## Treatment: collage

A mix-media clip is three layers in the host, all with the same in and out times:

| Layer | Element | Track | z | Notes |
| --- | --- | --- | --- | --- |
| Collage (back) | style-kit mount `.broll` | 4 | 22 | an **opaque full-frame** paper backdrop — it covers the base video |
| Speaker | `<video class="clip cutout sk-sticker-cut" src="assets/cutouts/NN-dena.webm" muted playsinline>` | 6 | 24 | the matted segment of `processed.mp4`, same host start |
| Front (optional) | style-kit mount `.broll-front` | 7 | 26 | arrows, doodles, frames, strips that overlap the speaker |

Rules:

- Make the cut-out for exactly the clip window:
  `npm run video -- cutout <slug> --from <clip start> --dur <clip duration> --name NN-dena`.
  The audio keeps playing from `#base-audio`; the cut-out is muted.
- Never tween `#base-video` opacity to hide it — the linter treats it as a
  full-frame overlay (`gsap_fullscreen_overlay_starts_visible`). The opaque collage
  already covers it.
- Host CSS: `.cutout { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 24; object-fit: cover; }`
  and `.broll-front { position: absolute; inset: 0; z-index: 26; }`.
- Dena stays visible, so `collage` never trips Gate 2 R3 or R4.

## Look

| Token | Default | Alt A "notebook" | Alt B "kraft desk" | Alt C "night zine" |
| --- | --- | --- | --- | --- |
| backdrop class | `.sk-grid` | `.sk-lined` | `.sk-kraft` | `.sk-kraft-dark` |
| `--sk-ink` | `#2b2118` | `#1f2937` | `#2b2118` | `#f5efe6` |
| `--sk-accent` | `#b5452b` | `#dc2626` | `#b5452b` | `#f59e0b` |
| `--sk-accent-2` | `#2f6f8f` | `#2563eb` | `#2f6f8f` | `#7dd3fc` |

- Stage theme `.sk-stop` plus a backdrop class; palette free per clip.
- The speaker always gets `.sk-sticker-cut`: a ~10 px off-white (#F6F2E9) ring and
  a hard shadow — it makes the matte look intentional and hides rough edges.
- Clutter lives in the corners and the top third; keep the **face zone** clear —
  roughly 1.2× the head box, and never over the eyes or mouth.
- No texture, grain, halftone, or colour effect on the speaker; only on the
  collage.
- One light direction for every shadow (`.sk-cut`, `.sk-sticker-cut`).

## Timing

- The collage moves on the step grid (`SK.onTwos`, `SK.piece`); the speaker stays
  at the full 30 fps — that contrast is what makes it read as a deliberate
  collage and keeps lip-sync credible (Spider-Punk).
- Pieces land on their words: a card per spoken name, a doodle 0–0.1 s before the
  stressed syllable, an arrow on the pronoun.
- Hold: after the pieces land, let them rest (small drift at most) until the clip
  ends; don't keep everything moving.
- 3–7 s per clip; at most two collage clips back to back.

## Matte Notes

- `video cutout` segments are ≤ 15 s; matting runs at roughly 4 frames per second
  on Apple silicon (CoreML), so a 5 s clip takes about a minute.
- Hair, fast hands, and motion blur fray the edge: the sticker ring swallows
  small frizz; a frame layer (polaroid, torn window) hides the rest.
- Furniture behind the shoulders can come along (a chair back): cover it with the
  front layer, or cut the segment where it is out of view.
- The body is cut off at the bottom of the frame; hide the cut behind a front
  frame's bottom band or a paper strip — never let the torso float mid-backdrop.
- Place doodles and arrows from the still check of the real cut-out: the head
  position varies per video (the placeholder is only a guide).
- After a cut-out, run the Still Check at the clip's key-word times and look at
  the mouth, hands, and edges.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **collage-backdrop** | A paper or photo collage replaces the room behind Dena | Opening or a "world" change | On the cut; held for the beat | soft paper slap | So busy the face loses contrast | back mount with a paper class + `SK.piece` scraps |
| **sticker-outline** | Off-white ring + hard shadow around Dena | Every collage clip | From frame 0 | none | A pure-white ring next to cream paper | `.sk-sticker-cut` on the host `<video>` |
| **doodle-halo** | Stars, rays, question marks drawn around the head | An idea, confusion, excitement | Drawn on twos, just before the stressed syllable | marker squeak | Looping doodles with no meaning | `SK.line`/`SK.ellipse` + `SK.drawSeq(..., { boil })` |
| **torn-window** | A paper sheet tears open around Dena | A reveal, "lihat ini" | The tear opens on the noun | short paper rip | The tear crosses the chin or mouth | front mount: evenodd SVG path, hole scaled on twos |
| **screenshot-orbit** | 2–4 real screenshots drift around the top of the frame | Listing tools, products, sources | One card per spoken name | soft tick per card | Fake or blurry UI; too many cards | back mount, `SK.piece` drop + small stepped drift, `.sk-source` |
| **arrow-to-speaker** | A hand-drawn arrow from a label to Dena | "Gue", credentials | On the pronoun | pen swipe | Arrow crosses the eyes | front mount, `SK.arrow` + `.sk-sticky` label |
| **polaroid-frame** | Dena inside a taped polaroid | Memory, "dulu", a proof photo | On the time word | camera shutter | A polaroid on every beat | front mount: evenodd frame + `.sk-tape-a/b` + `.sk-hand` caption |
| **halftone-duotone** | Two-colour halftone backdrop, Dena in true colour | Serious claims, stats | Switches on a beat | low paper thump | Halftone on the skin | back mount only; never filter the `<video>` |
| **cut-in-object** | A real object cut-out lands beside Dena's hand | Naming a concrete thing | Lands on the noun, one-step overshoot | soft thud | A generic object that isn't the named one | `assets/cutouts/*.png` (Style Assets) + `SK.piece` |
| **paper-strip-caption** | A key phrase on a torn paper strip, taped | Hook line, key phrase | Strip per word group | tape pull | Replacing the running captions | front mount, `SK.torn` + `.sk-display`, above y 1400 |
| **scrapbook-stack** | Proof cards pile up behind Dena | Evidence, momentum | One card per claim, 0.4–0.8 s apart | paper shuffle | The stack buries the face | back mount, `SK.piece` drops in the top third |
| **zoom-punch-cutout** | The speaker layer scales 110–120% on a peak word, stepped | Punchline | On the stressed syllable, back out over 0.3 s | short thud | Every sentence | host `tl.to('#cut-NN', { scale })` with `steps`, backdrop still |
| **split-self** | Two cut-outs of Dena (then vs now) | "Gue dulu vs sekarang" | Second self pops in on the contrast word | two paper slaps | Mismatched outlines or lighting | two `video cutout` segments, two host `<video>`s, both `.sk-sticker-cut` |
| **scribble-emphasis** | A circle or underline over a number in a screenshot beside Dena | Pointing at a figure | The scribble finishes as the number is spoken | marker scratch | Scribbling over nothing | `SK.ellipse` on the card inside the back mount |
| **grid-backdrop** | Notebook or grid paper, faint drift | Calm explanation beats | Held | none | A grid that fights the captions | `.sk-grid` / `.sk-lined` backdrop |

## References

### R1 — Hannah Höch, *Cut with the Kitchen Knife Dada through the Last Weimar Beer-Belly Cultural Epoch in Germany* (1919)
- Source: https://en.wikipedia.org/wiki/Hannah_H%C3%B6ch
- Steal: press photos and text fragments cut and combined on purpose; dense but
  organised around focal clusters; text as image.
- 9:16: keep Dena in a calm centre band; 3–5 real fragments only in the top and
  bottom thirds.

### R2 — Richard Hamilton, *Just what is it that makes today's homes so different, so appealing?* (1956)
- Source: https://en.wikipedia.org/wiki/Just_what_is_it_that_makes_today's_homes_so_different,_so_appealing
- Steal: a room built from magazine cut-outs; objects named by showing them;
  deliberately mismatched scale.
- 9:16: build a "room" around Dena from real product screenshots and cut-outs of
  the things she names.

### R3 — Zines and DIY print
- Source: https://en.wikipedia.org/wiki/Zine
- Steal: photocopy degradation, cut-and-paste layout, typed text and collage
  together.
- 9:16: a xeroxed/threshold backdrop — never on the face — reads as a founder's
  notebook page.

### R4 — *Spider-Man: Into the Spider-Verse* (2018)
- Source: https://en.wikipedia.org/wiki/Spider-Man:_Into_the_Spider-Verse
- Steal: halftone and Ben-Day dots for tone; print misregistration; animation on
  twos with on-screen text.
- 9:16: halftone only on the backdrop; collage on twos while Dena plays at full
  frame rate.

### R5 — Spider-Punk in *Spider-Man: Across the Spider-Verse* (2023)
- Source: https://www.slashfilm.com/1305454/spider-man-across-the-spider-verse-spider-punk-three-years-animate/
- Steal: built from hand-cut, xeroxed punk zines; different parts at different
  frame rates, so it feels like a flyer come to life.
- 9:16: stickers and scraps boil on twos, the footage stays smooth — the contrast is
  the look.

### R6 — *The Mitchells vs. the Machines* (2021), "Katie Vision"
- Source: https://collider.com/mitchells-vs-the-machines-animation-explained-video/
- Steal: 2D doodles splattered over the image, motivated by the character's head;
  amateurish on purpose.
- 9:16: doodles come from Dena's own thought — drawn on the key word near her head
  or hands (`doodle-halo`).

### R7 — "How Vox uses animation…" (Storybench, 2024)
- Source: https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/
- Steal: construction-paper objects that turn into data; a recurring motif per
  concept; balance illustration and photography.
- 9:16: one physical object per beat that becomes information beside Dena.

### R8 — "Vox / Johnny Harris documentary style" in Final Cut Pro (FCPX Full Access)
- Source: https://fcpxfullaccess.com/blogs/blog/vox-johnny-harris-documentary-style-final-cut-pro
- Steal: cut-out photos with a white stroke and drop shadow, pinned-to-a-wall look,
  small rotation, 12 fps steps, paper-rustle and soft-thud SFX.
- 9:16: the core recipe for the cut-out Dena — stroke, shadow, landing thud.

### R9 — Spotify Wrapped 2022 identity (It's Nice That)
- Source: https://www.itsnicethat.com/features/spotify-wrapped-campaign-identity-2022-graphic-design-301122
- Steal: overlapping shape layers on a grid; each layer gets one motion behaviour.
- 9:16: a grid underneath keeps the collage systematic; one motion verb per layer
  (drop, drift, draw).

### R10 — The Instagram "digital scrapbook" trend (Bustle)
- Source: https://www.bustle.com/life/digital-scrapbook-instagram-style-photos-trend-apps
- Steal: stickers, handwriting, layered photos, looking "ripped from a scrapbook".
- 9:16: handwritten margin notes in Indonesian and layered polaroids of real proof.

### R11 — CapCut: background removal for sticker design
- Source: https://www.capcut.com/ideas/remove-image-background/remove-image-background-for-sticker-design-assets
- Steal: the sticker stroke — an expanded copy of the cut-out filled white under
  it; check hair edges; a subtle shadow on busy backgrounds.
- 9:16: `.sk-sticker-cut` does this per frame on the matted video.

### R12 — Ken Burns effect
- Source: https://en.wikipedia.org/wiki/Ken_Burns_effect
- Steal: slow pan and zoom that settles on the named subject; parallax planes
  make a flat image read as depth.
- 9:16: three planes — backdrop, Dena, front scraps — and a slow push into a
  screenshot that lands on the spoken line.

## Build Recipe

Host (in `videos/<slug>/index.html`, after running `video cutout`):

```html
<div id="broll-07-collage-mount" class="broll" data-composition-id="broll-07-collage" data-composition-src="compositions/broll/07-collage.html"
     data-start="31.2" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
<video id="cut-07" class="clip cutout sk-sticker-cut" src="assets/cutouts/07-dena.webm" muted playsinline
       data-start="31.2" data-duration="5" data-track-index="6"></video>
<div id="broll-07-collage-front-mount" class="broll-front" data-composition-id="broll-07-collage-front" data-composition-src="compositions/broll/07-collage-front.html"
     data-start="31.2" data-duration="5" data-track-index="7" data-width="1080" data-height="1920"></div>
```

made with `npm run video -- cutout <slug> --from 31.2 --dur 5 --name 07-dena`.

Collage clip (back): an opaque paper stage, pieces in the corners and top third:

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
    #strip { width: 520px; height: 130px; }
  </style>
  <div id="root" data-composition-id="broll-07-collage" data-width="1080" data-height="1920" data-duration="5">
    <div class="sk-stage sk-stop sk-grid">
      <div class="p sk-cut" id="stripW"><div class="p sk-kraft" id="strip"></div></div>
      <div class="sk-grain" id="grain"></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-07-collage';
      const $ = SK.finder(ID);
      $('strip').style.clipPath = SK.torn(520, 130, 71, { edges: 'lr', amp: 14 });
      const k = SK.onTwos(M.track(1, [[0.1, 0, [18, 0.75]]]));
      SK.clip(ID, { T: 5, update: (t) => {
        SK.piece($('stripW'), { x: -60 - 400 * k(t), y: 230, r: -8 }, 1, t);
        SK.grain($('grain'), t, 4);
      } });
    })();
  </script>
</template>
```

- The front clip uses `bg: null` (transparent) and only draws what overlaps the
  speaker (see `mm-02`, `mm-03`, `mm-04`).
- Frames and windows are one SVG `path` with `fill-rule="evenodd"` (outer rect +
  inner hole); fill it with a paper `<pattern>` whose `<image href="vendor/paper-pack/…">`.
- The placeholder in the examples is `style-examples/assets/placeholder-cutout.webm`,
  rendered from `docs/agents/references/mix-media-placeholder/` (commands in its
  `README.md`).

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| collage-backdrop, scrapbook-stack | paper slap / shuffle | 0.1–0.14 |
| doodle-halo, arrow-to-speaker, scribble-emphasis | marker squeak / pen swipe | 0.08–0.12 |
| torn-window, paper-strip-caption | paper rip / tape pull | 0.12–0.16 |
| cut-in-object, zoom-punch-cutout | soft thud | 0.12–0.16 |
| polaroid-frame | camera shutter | 0.1–0.14 |

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/compositions/mm-01-collage-doodle.html` | collage-backdrop + sticker-outline + doodle-halo | collage |
| `style-examples/compositions/mm-02-orbit-arrow.html` | screenshot-orbit (+ front: arrow-to-speaker) | collage |
| `style-examples/compositions/mm-03-torn-window.html` | torn-window (front) + cut-in-object | collage |
| `style-examples/compositions/mm-04-polaroid-caption.html` | polaroid-frame + paper-strip-caption (front) | collage |

## Anti-slop Checklist

- [ ] Every collage piece ties to a spoken word; no generic vintage paper, coffee stains, or random compasses.
- [ ] Screenshots are real and readable, with a source line when they carry information.
- [ ] The sticker ring is steady around hair and hands; frayed edges are hidden by a frame layer.
- [ ] Pieces land and then rest; the collage does not move nonstop.
- [ ] No texture, grain, or colour effect on Dena; the face zone is clear of doodles and cards.
- [ ] One light direction; the outline is off-white, matching the paper, not pure white.
- [ ] Captions stay readable: nothing busy behind the caption band, strips sit above y 1400.
- [ ] The cut-out came from `video cutout` for this exact window; lips match the audio in the still check.
- [ ] Dena's likeness is never generated; generated objects show no real person or brand.
````

- [ ] **Step 3: Menu and Style Assets**

1. In `docs/agents/references/styles/README.md` replace:

````text
| `vox` | Paper texture, document clippings, highlighter, map zooms | — | planned (sub-project 2b) |
````

   with:

````text
| `vox` | A real capture or an "Ilustrasi" document on paper, highlighter on the spoken phrase, red pen, map zooms | `vox.md` | available |
````

2. In `docs/agents/references/styles/README.md` replace:

````text
| `mix-media` | Dena keeps talking on a paper collage (alpha cut-out of her footage) | — | planned (sub-project 2b) |
````

   with:

````text
| `mix-media` | Dena keeps talking on a paper collage (matted cut-out of her footage) | `mix-media.md` | available |
````

3. In `docs/agents/references/styles/README.md` replace:

````text
| needs proof | capture (`use-real`) | no style replaces real evidence |
````

   with:

````text
| quotes or points at an article, report, post, or website | `vox` (capture + highlight-sweep, pinned-source) | the viewer sees the words the claim comes from, with the source on screen |
| names a place, city, or market | `vox` (map-zoom) | the pin lands where the place really is (`SK.geo`) |
| names several tools or sources, or says "gue" / "dulu vs sekarang" while her presence matters | `mix-media` (screenshot-orbit, arrow-to-speaker, polaroid-frame) | Dena stays on screen while the world around her changes |
| needs proof | capture (`use-real`) or `vox` with a real capture | a capture is the evidence; `vox` frames it and cites it |
````

4. In `docs/agents/references/styles/README.md` replace:

````text
- Treatments, density, and face rules are the ones in `motion-broll-planning.md`
  (cutaway / split / panel, 2 s of face between cutaways, cutaway ≤ 10 s, no face
  cover in `00:00.00–00:03.00` without approval).
````

   with:

````text
- Treatments, density, and face rules are the ones in `motion-broll-planning.md`
  (cutaway / split / panel, 2 s of face between cutaways, cutaway ≤ 10 s, no face
  cover in `00:00.00–00:03.00` without approval). `mix-media` adds the `collage`
  treatment: Dena stays visible, so it never trips R3 or R4.
- `mix-media` is a peak: at most ~20% of the video, at most two collage clips in a
  row.
````

5. In `docs/agents/references/styles/README.md` replace:

````text
- Type: <broll-text | motion-graphic | whiteboard | stop-motion>
````

   with:

````text
- Type: <broll-text | motion-graphic | whiteboard | stop-motion | vox | mix-media>
````

6. In `docs/agents/references/styles/README.md` replace:

````text
- Treatment: <cutaway | split | panel> — <reason>
````

   with:

````text
- Treatment: <cutaway | split | panel | collage (mix-media only)> — <reason>
````

7. In `docs/agents/references/styles/README.md` replace:

````text
- Pen (whiteboard only): <marker | hand>
````

   with:

````text
- Pen (whiteboard only): <marker | hand>
- Document (vox only): <capture `assets/captures/NN-name.png` | illustrative>
- Source line (vox capture only): <outlet or domain, date, license if any>
- Cutout (mix-media only): from <host s>, dur <s>, name <NN-dena>; front layer <yes | no>
````

8. In `docs/agents/references/styles/README.md` replace:

````text
style (`"broll-text"`, `"motion-graphic"`, `"whiteboard"`, or `"stop-motion"`),
````

   with:

````text
style (`"broll-text"`, `"motion-graphic"`, `"whiteboard"`, `"stop-motion"`, `"vox"`, or `"mix-media"`),
````

9. In `docs/agents/references/styles/README.md` replace:

````text
- The stage is `<div class="sk-stage sk-text|sk-mg|sk-wb|sk-stop">`; override the
````

   with:

````text
- The stage is `<div class="sk-stage sk-text|sk-mg|sk-wb|sk-stop|sk-vox">`; override the
````

10. In `docs/agents/references/styles/README.md` replace:

````text
- Fonts: switch with `.sk-display`, `.sk-sans`, `.sk-hand`; never name a font
  family in a clip's `<style>`.
````

   with:

````text
- Fonts: switch with `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`; never
  name a font family in a clip's `<style>`.
- `mix-media` host recipe (collage): an opaque full-frame collage mount on track 4,
  the matted speaker `<video class="clip cutout sk-sticker-cut" muted>` on track 6
  (same start and duration, made with `npm run video -- cutout`), and an optional
  front mount `.broll-front` on track 7. Never tween `#base-video` opacity; the
  opaque collage covers it. Details: `mix-media.md`.
````

1. In `docs/agents/references/asset-production.md` replace:

````text
(stop-motion cut-outs, a whiteboard prop, a collage piece). Produce them in Build
````

   with:

````text
(stop-motion cut-outs, a whiteboard prop, a collage piece, a VOX capture, a
mix-media speaker cut-out). Produce them in Build
````

2. In `docs/agents/references/asset-production.md` replace:

````text
| `user` | the user's file; remove the background the same way when needed | `assets/cutouts/NN-name.png` | `provenance: "user"`, `source` = what the user gave |
````

   with:

````text
| `user` | the user's file; remove the background the same way when needed | `assets/cutouts/NN-name.png` | `provenance: "user"`, `source` = what the user gave |
| `capture` (VOX document) | a screenshot of the real page per Screenshot Rules and URL Research below; crop to the quoted region, redact private data | `assets/captures/NN-name.png` | `type: "screenshot"`, `provenance: "screenshot"`, `source` = URL, `captured` (date), license when the text is licensed (e.g. CC BY-SA) |
| `dena-video` (mix-media speaker) | `npm run video -- cutout <slug> --from <clip start> --dur <clip duration> --name NN-dena` (segment of `processed.mp4` → `remove-background`; ≤ 15 s; it fails if nothing is written) | `assets/cutouts/NN-dena.webm` | `provenance: "dena-footage"`, `source` = processed time range |
````

3. In `docs/agents/references/asset-production.md` replace:

````text
- Never generate Dena's likeness; a Dena cut-out comes only from her footage.
````

   with:

````text
- Never generate Dena's likeness; a Dena cut-out comes only from her footage.
- In an agent shell whose command hook rewrites `npx`, run
  `remove-background` as `rtk proxy npx …` and confirm the
  "Removed background from N frames" line; `video cutout` spawns it without a
  shell and checks the output itself.
````

- [ ] **Step 4: Run the tests**

Run: `npm run test:style-kit`
Expected: `ℹ pass 71`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/references/styles scripts/style-docs.test.mjs docs/agents/references/asset-production.md
git commit -m "docs: add the VOX and mix-media references and menu entries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Wiring and canon sync

**Files:** the Task 6 rows of the File Structure table.

- [ ] **Step 1: Apply the replacements**

1. In `docs/agents/02-screen-plan.md` replace:

````text
for each `broll-text`, `motion-graphic`, `whiteboard`, or `stop-motion` row also read that style's file
````

   with:

````text
for each `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, or `mix-media` row also read that style's file
````

2. In `docs/agents/02-screen-plan.md` replace:

````text
| R6 | Generated image or video that depicts a real person or a real brand |
````

   with:

````text
| R6 | Generated image or video that depicts a real person or a real brand, or an illustrative (VOX) document that imitates a real outlet's masthead, layout, or logo |
````

3. In `docs/agents/03-build.md` replace:

````text
   `motion-graphic`, `whiteboard`, or `stop-motion` row, follow the Build Contract in
````

   with:

````text
   `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, or `mix-media` row, follow the Build Contract in
````

4. In `docs/agents/03-build.md` replace:

````text
   style's file. Write the clip at its Planned file,
````

   with:

````text
   style's file. For a `mix-media` row, first run
   `npm run video -- cutout <slug> --from <start> --dur <duration> --name NN-dena`
   and mount the speaker `<video>` on track 6 as in `mix-media.md`. Write the clip at its Planned file,
````

5. In `docs/agents/references/visual-planning.md` replace:

````text
(`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`) for a line
````

   with:

````text
(`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, `mix-media`) for a line
````

6. In `docs/agents/references/visual-planning.md` replace:

````text
| `decision` | `motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `generate`, `use-real`, `use-diagram`, `skip` |
````

   with:

````text
| `decision` | `motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, `mix-media`, `generate`, `use-real`, `use-diagram`, `skip` |
````

7. In `docs/agents/references/visual-planning.md` replace:

````text
`whiteboard`, or `stop-motion` row, use the Style B-roll Brief from
````

   with:

````text
`whiteboard`, `stop-motion`, `vox`, or `mix-media` row, use the Style B-roll Brief from
````

8. In `docs/agents/references/motion-broll-planning.md` replace:

````text
  the point: pick `broll-text`, `motion-graphic`, `whiteboard`, or `stop-motion`
````

   with:

````text
  the point, or Dena should stay on screen: pick `broll-text`, `motion-graphic`,
  `whiteboard`, `stop-motion`, `vox`, or `mix-media`
````

9. In `docs/agents/references/qa-checklist.md` replace:

````text
- Every `broll-text`, `motion-graphic`, `whiteboard`, and `stop-motion` clip matches its Style B-roll Brief (pattern, palette, font, treatment, assets).
````

   with:

````text
- Every `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, and `mix-media` clip matches its Style B-roll Brief (pattern, palette, font, treatment, assets).
- VOX: every capture shows a source line (≥ 28 px, ≥ 1.5 s) and has private data redacted; every illustration carries "Ilustrasi" and imitates no real outlet; highlights sit on the spoken words only.
- Mix-media: the speaker cut-out is in sync with the audio (lips match at the key-word stills), the sticker outline is steady, the face zone is clear, and the collage fully covers the base video.
````

10. In `docs/dena-social-video-style-guide.md` replace:

````text
- Style b-roll: kinetic text, flat motion graphics, whiteboard drawing, or paper stop-motion when the words, a spoken number, a framework, or handmade objects are the point (`docs/agents/references/styles/README.md`).
````

   with:

````text
- Style b-roll: kinetic text, flat motion graphics, whiteboard drawing, paper stop-motion, a VOX document with a highlighted source, or a mix-media collage with Dena still talking — when the words, a spoken number, a framework, handmade objects, a source, or Dena's presence are the point (`docs/agents/references/styles/README.md`).
````

11. In `docs/skills/dena-video-editing-workflow/references/quality-gates.md` replace:

````text
- land style b-roll beats on their words, boil whiteboard strokes only after they finish, step stop-motion on twos, and keep every on-screen word and number verbatim
````

   with:

````text
- land style b-roll beats on their words, boil whiteboard strokes only after they finish, step stop-motion and VOX graphics on twos, keep every on-screen word and number verbatim, show a source line on every VOX capture, and keep a mix-media cut-out in sync with the audio
````

12. In `CLAUDE.md` replace:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard, stop-motion)
````

   with:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard, stop-motion, vox, mix-media)
````

13. In `AGENTS.md` replace:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard, stop-motion)
````

   with:

````text
(motion b-roll, b-roll text, motion graphic, whiteboard, stop-motion, vox, mix-media)
````

14. In `internal/docs/operations/video-editing-workflow.md` replace:

````text
atau style b-roll: broll-text, motion-graphic, whiteboard, stop-motion) > capture bukti
````

   with:

````text
atau style b-roll: broll-text, motion-graphic, whiteboard, stop-motion, vox,
mix-media) > capture bukti
````

15. In `internal/docs/operations/video-editing-workflow.md` replace:

````text
yang menggambarkan orang/brand nyata). Referensi: `captions.md`,
````

   with:

````text
yang menggambarkan orang/brand nyata, atau dokumen ilustratif yang meniru media
nyata). Referensi: `captions.md`,
````

16. In `internal/docs/design-system/visual-system.md` replace:

````text
  clip `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion` memakai mount yang sama
````

   with:

````text
  clip `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`,
  `mix-media` memakai mount yang sama
````

17. In `internal/docs/design-system/visual-system.md` replace:

````text
  keras `.sk-cut` satu arah cahaya, grain `.sk-grain`, gerak 15 langkah/detik.
````

   with:

````text
  keras `.sk-cut` satu arah cahaya, grain `.sk-grain`, gerak 15 langkah/detik.

## VOX dan mix-media

- VOX: tema `.sk-vox`, highlighter kuning multiply (`.sk-hl` + `SK.highlight`),
  pena merah, serif Newsreader (`.sk-serif`), peta `map-indonesia.svg` (Natural
  Earth) dengan pin lewat `SK.geo`. Capture wajib `.sk-source`; ilustrasi wajib
  `.sk-tag` "Ilustrasi".
- Mix-media (treatment `collage`): kolase opaque (track 4, z 22), cutout Dena
  `<video class="cutout sk-sticker-cut">` (track 6, z 24), lapisan depan
  `.broll-front` (track 7, z 26); caption (z 45) tetap di atas. Outline stiker
  #F6F2E9 ±10 px + bayangan keras; area wajah bebas elemen.
````

18. In `internal/docs/architecture/stack.md` replace:

````text
| style-kit | Engine style b-roll (broll-text, motion-graphic, whiteboard, stop-motion): draw-on, boil, handwriting, count-up, kamera, langkah on twos, sobekan, tangan; frame = fungsi waktu lokal clip |
````

   with:

````text
| style-kit | Engine style b-roll (broll-text, motion-graphic, whiteboard, stop-motion, vox, mix-media): draw-on, boil, handwriting, count-up, kamera, langkah on twos, sobekan, tangan, highlighter, peta (`SK.geo`); frame = fungsi waktu lokal clip |
````

19. In `internal/docs/architecture/stack.md` replace:

````text
| video CLI | Scaffold + jalankan proyek HyperFrames per video | `npm run video -- new\|check\|dev\|snapshot\|render <slug>` | `scripts/video.mjs` |
````

   with:

````text
| video CLI | Scaffold + jalankan proyek HyperFrames per video; `cutout` me-matte segmen `processed.mp4` untuk mix-media | `npm run video -- new\|check\|dev\|snapshot\|render\|cutout <slug>` | `scripts/video.mjs` |
````

20. In `internal/docs/operations/roadmap.md` replace:

````text
([ADR-0013](../adr/0013-paper-pack-bitmap-assets.md): paper pack, pipeline aset
per video, stop-motion, tangan whiteboard) selesai. Berikutnya 2b (VOX +
mix-media: Dena tetap bicara di atas kolase lewat cutout video ber-alpha, diawali
spike) lalu sub-proyek 3 (2.5D parallax). Video
````

   with:

````text
([ADR-0013](../adr/0013-paper-pack-bitmap-assets.md): paper pack, pipeline aset
per video, stop-motion, tangan whiteboard) selesai; sub-proyek 2b
([ADR-0014](../adr/0014-vox-mix-media.md): VOX, mix-media, `video cutout`)
selesai. Berikutnya sub-proyek 3 (2.5D parallax). Video
````

- [ ] **Step 2: Check for missed lists**

```bash
git grep -n "whiteboard, stop-motion)\|or \`stop-motion\` row\|\`stop-motion\`) for a line\|\`stop-motion\`, \`generate\`\|planned (sub-project 2b)" -- docs AGENTS.md CLAUDE.md internal templates ':!docs/superpowers'
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add docs/agents/02-screen-plan.md docs/agents/03-build.md docs/agents/references/visual-planning.md docs/agents/references/motion-broll-planning.md docs/agents/references/qa-checklist.md docs/dena-social-video-style-guide.md docs/skills/dena-video-editing-workflow/references/quality-gates.md CLAUDE.md AGENTS.md internal/docs/operations/video-editing-workflow.md internal/docs/design-system/visual-system.md internal/docs/architecture/stack.md internal/docs/operations/roadmap.md
git commit -m "docs: route VOX and mix-media through Screen Plan, Build, QA, and Gate 2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Final verification and merge

- [ ] **Step 1: Full run**

```bash
npm run test:motion-kit && npm run test:style-kit && npm run test:render-blur && npm run test:video && npm run test:repliz
npm run check:broll-examples && npm run check:style-examples && npm run check
npm run -s video -- new tmp-smoke --duration 10 && grep -c "broll-front" videos/tmp-smoke/index.html; npm run -s video -- check tmp-smoke; rm -rf videos/tmp-smoke
```
Expected: `fail 0` everywhere (15, 71, 4, 13, 47); example and root checks `0 errors`; smoke prints ≥ 1 and only the two missing-media errors.

- [ ] **Step 2: Spec checklist**

Confirm "Definisi selesai" item by item (richness via `test:style-kit`; 8 examples + review; MP4 alpha proof; `video cutout` unit tests + real smoke or an explicit skip; docs list from `git diff --stat main...HEAD`).

- [ ] **Step 3: Merge**

Ask the user first. With approval:
```bash
git switch main
git merge --ff-only feat/vox-mix-media
git branch -d feat/vox-mix-media
```
Do not push.
