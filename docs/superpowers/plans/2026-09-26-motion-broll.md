# Motion B-roll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Barty-Bart motion-broll engine into this HyperFrames project as `vendor/motion-kit`, prove it with three vertical example clips, add an optional motion-blur render pass, and wire motion b-roll into the Screen Plan and Build phases.

**Architecture:** `motion-kit.js` is a classic script that defines `window.M`; the host `index.html` loads it once. Each clip is a HyperFrames sub-composition whose template script calls `M.clip(id, cfg)`, which builds the scene inside that clip's root and registers a paused GSAP timeline whose single proxy tween calls `seek(t)` in `onUpdate` (proven by the 2026-09-26 spike; `hf-seek` is never dispatched). Docs route Screen Plan to a planning reference and Build to an authoring reference.

**Tech Stack:** HyperFrames 0.7.24 via pinned `npx`, GSAP (vendored), plain JS/CSS, Node 22+ built-ins (`node:test`, `node:vm`, `node:child_process`), ffmpeg.

**Spec:** `docs/superpowers/specs/2026-09-26-motion-broll-design.md`

## Global Constraints

- No npm dependencies (ADR-0007). Scripts use Node built-ins only; HyperFrames is always `npx --yes hyperframes@0.7.24`.
- Upstream source is pinned: `https://github.com/Barty-Bart/motion-graphics` at commit `e8d610adcf946367430c8b43a97aad8059befaad` (MIT, Copyright (c) 2026 Bart).
- Clip frame: `W: 1080`, `H: 1920`. Clip ids are `broll-NN-name` in real videos and `ex-NN-name` in the examples.
- Clips mount on `data-track-index="4"` with host class `broll` (`position:absolute; inset:0; z-index:22`).
- Look: canvas `#050505`; shapes `#FFFFFF` (ink `#050505`) or panel `#111111` with border `rgba(255,255,255,.12)`; one accent `#facc15`; success `#22c55e` only; muted `#d4d4d8`; Geist for UI text, Geist Mono for mono; captions stay Arial 950.
- Every CSS class from the engine starts with `mk-`.
- Determinism: no `requestAnimationFrame`, `performance.now()`, `Date.now()`, `Math.random()`, `location`, or timers in engine or clips.
- Snapshots always run with `env -u GEMINI_API_KEY` so frames are never sent to Gemini (`snapshot --describe` runs automatically when the key is set). This refines the spec's `GEMINI_API_KEY=` wording: unsetting is the only form the CLI documents as "not set".
- Gate 2 R3 threshold becomes 10 seconds.
- Motion blur: render at 4× fps, `tmix=frames=4`, keep every 4th frame, copy audio, delete the intermediate.
- Docs language: `docs/agents/**` English; `internal/docs/**` Indonesian.
- The sub-project 1 migration verifier (`docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs`) is an archive; it is not expected to pass after this sub-project edits reference text.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- In inline "replace X with Y" specs, `\n` is a line break and `` \` `` is a literal backtick in the file; preserve existing indentation. Each replacement must match exactly once — stop and re-read the file if it does not.
- `hyperframes lint`, `validate`, `snapshot`, and `render` all accept the project directory as the last argument (verified with `--help` on 0.7.24).

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `internal/docs/adr/0009-motion-broll-motion-kit.md` | Create | Decision record |
| `internal/docs/requirements/rd-02-composition-render.md` | Modify | EARS RD-02-15..19 |
| `internal/docs/requirements/rd-03-video-editing-workflow.md` | Modify | EARS RD-03-31..34 |
| `internal/docs/README.md` | Modify | Register ADR-0009 |
| `vendor/motion-kit/motion-kit.js` | Create | Engine (`window.M`, `M.build`, `M.clip`) |
| `scripts/motion-kit.test.mjs` | Create | Engine unit tests |
| `vendor/motion-kit/motion-kit.css`, `fonts/*`, `LICENSE` | Create | Engine styles, fonts, license |
| `THIRD_PARTY_NOTICES.md` | Modify | MIT/OFL/ISC notices |
| `docs/agents/references/motion-broll-examples/**` | Create | Example project (host + 3 clips + snapshot times) |
| `scripts/check-broll-examples.mjs` | Create | Assemble examples → lint, validate, snapshot |
| `scripts/render-blur.mjs`, `scripts/render-blur.test.mjs` | Create | Motion-blur pass + tests |
| `docs/agents/references/motion-broll-planning.md` | Create | Screen Plan reference |
| `docs/agents/references/motion-broll-authoring.md` | Create | Build reference |
| `docs/agents/02-screen-plan.md`, `03-build.md`, `references/visual-planning.md`, `references/qa-checklist.md` | Modify | Wiring |
| `AGENTS.md`, `CLAUDE.md`, `docs/dena-social-video-style-guide.md`, `docs/skills/dena-video-editing-workflow/references/quality-gates.md` | Modify | Entry doors + gates |
| `internal/docs/design-system/visual-system.md`, `architecture/stack.md`, `operations/runbook.md`, `operations/video-editing-workflow.md`, `operations/roadmap.md` | Modify | Canon sync |
| `package.json`, `.github/workflows/ci.yml` | Modify | Scripts + CI |

---

### Task 1: Governance first — ADR-0009, EARS, index

**Files:**
- Create: `internal/docs/adr/0009-motion-broll-motion-kit.md`
- Modify: `internal/docs/requirements/rd-02-composition-render.md` (insert before `## Verifikasi`)
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md` (insert before `## Referensi`)
- Modify: `internal/docs/README.md`

**Interfaces:**
- Produces: ADR path `internal/docs/adr/0009-motion-broll-motion-kit.md`; EARS ids RD-02-15..19 and RD-03-31..34.

- [ ] **Step 1: Create ADR-0009**

```markdown
# ADR-0009 Motion B-roll lewat motion-kit
Status: accepted
Date: 2026-09-26

## Context

Visual Dena selama ini berupa kartu, screenshot, dan imagegen. Skill motion-broll
(`Barty-Bart/motion-graphics`, MIT) membuat B-roll "satu shape yang tidak pernah
cut" dengan spring closed-form dan kursor, tetapi dirancang untuk 16:9, render
Playwright terpisah, dan output clip untuk editor luar. Repo ini merender semua
lewat HyperFrames 0.7.24 tanpa dependency npm (ADR-0007) dan memakai workflow
4 fase (ADR-0008).

Spike 2026-09-26: di HyperFrames, sub-composition yang punya tween proxy GSAP
menerima waktu lokal clip lewat `onUpdate`, baik di `snapshot` maupun `render`;
event `hf-seek` tidak pernah dikirim untuk komposisi non-Three/TypeGPU; engine
global yang dimuat di `<head>` host dapat dipakai dari dalam `<template>`.

## Decision

- Engine di-vendor sebagai script klasik `vendor/motion-kit/motion-kit.js`
  (`window.M`) plus `motion-kit.css` dan font Geist, dimuat sekali oleh host.
- Satu clip = satu sub-composition `compositions/broll/*.html` di track 4 yang
  memanggil `M.clip(id, cfg)`; `M.clip` mencari elemen di dalam root clip dan
  mendaftarkan timeline paused dengan satu tween proxy `{t: 0→T}`.
- Motion b-roll menjadi visual pertama untuk kalimat yang menjelaskan,
  menunjukkan, membandingkan, atau berurutan; capture untuk bukti; imagegen untuk
  mood/tekstur/latar.
- Treatment per clip: cutaway, split, panel. Gate 2 R3 naik ke 10 detik.
- Motion blur opsional: `npm run render:blur` (render 4× fps → ffmpeg `tmix`).

## Rationale

- Satu pipeline render dan satu cue map dengan caption dan SFX.
- Fungsi spring asli tetap dipakai, jadi kualitas gerak setara skill asli.
- Tanpa Playwright atau dependency npm.

## Consequences

- Blur setara shutter 360° (asli 180°) dan render final 4× lebih lama bila dipakai.
- `M.clip` wajib dipanggil sinkron di script template clip.
- Belum teruji di video nyata; video pertama dicatat di
  [operations/roadmap](../operations/roadmap.md).

## Sources

- Spec: `docs/superpowers/specs/2026-09-26-motion-broll-design.md`
- `vendor/motion-kit/`, `docs/agents/references/motion-broll-planning.md`,
  `docs/agents/references/motion-broll-authoring.md`
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md),
  [requirements/rd-03-video-editing-workflow](../requirements/rd-03-video-editing-workflow.md)
```

- [ ] **Step 2: Add EARS to rd-02**

In `internal/docs/requirements/rd-02-composition-render.md`, insert before the line `## Verifikasi`:

```markdown
## Motion b-roll

- **RD-02-15** (Optional) — Where komposisi memakai motion b-roll, host
  `index.html` shall memuat `vendor/motion-kit/motion-kit.js` dan
  `vendor/motion-kit/motion-kit.css` tepat sekali, setelah `vendor/gsap.min.js`.
- **RD-02-16** (Ubiquitous) — Setiap clip motion b-roll shall berupa
  sub-composition di `compositions/broll/` yang memanggil `M.clip(id, cfg)` secara
  sinkron, sehingga timeline paused terdaftar di `window.__timelines[id]` dengan
  durasi `cfg.T`.
- **RD-02-17** (Ubiquitous) — Setiap frame clip motion b-roll shall hanya
  bergantung pada waktu lokal clip, tanpa timer, `requestAnimationFrame`, atau
  jam render.
- **RD-02-18** (Event-driven) — When `npm run render:blur -- --slug <slug>`
  dijalankan, the system shall merender pada 4× fps (120 untuk 30 fps), memadukan
  4 frame per frame output dengan ffmpeg `tmix`, menyalin stream audio tanpa encode
  ulang, menulis `renders/<slug>-blur.mp4`, dan menghapus file antara 120 fps.
- **RD-02-19** (Unwanted) — If `--slug` berisi karakter selain huruf kecil, angka,
  dan tanda hubung, then `render:blur` shall menolak tanpa merender.

```

- [ ] **Step 3: Add EARS to rd-03**

In `internal/docs/requirements/rd-03-video-editing-workflow.md`, insert before the line `## Referensi`:

```markdown
## Motion b-roll

- **RD-03-31** (Ubiquitous) — Fase Screen Plan shall memilih motion b-roll lebih
  dulu untuk kalimat yang menjelaskan, menunjukkan, membandingkan, atau
  berurutan, dan mencatat alasannya di Visual Decision Log.
- **RD-03-32** (Ubiquitous) — Setiap baris `motion-broll` di `visual-plan.md`
  shall punya Motion B-roll Brief dengan treatment (cutaway/split/panel) beserta
  alasan dan state per kata.
- **RD-03-33** (Unwanted) — If sebuah visual menutup wajah Dena penuh lebih dari
  10 detik atau menutup kalimat personal/emosional/opini, then Gate 2 shall
  menandainya sebagai R3.
- **RD-03-34** (Event-driven) — When fase Build selesai menulis clip motion
  b-roll, fase Build shall mengambil snapshot clip pada waktu kata kunci brief
  tanpa `GEMINI_API_KEY` dan memperbaiki temuan sebelum render.

```

- [ ] **Step 4: Register ADR-0009 in the index**

In `internal/docs/README.md`, replace every line from the one starting `30. [adr/0008-four-phase-workflow.md]` through the one starting `40. [security/audit-2026-07-20.md]` with:

```markdown
30. [adr/0008-four-phase-workflow.md](adr/0008-four-phase-workflow.md) - Produksi 4 fase (Story, Screen Plan, Build, QA opsional) dengan gate.
31. [adr/0009-motion-broll-motion-kit.md](adr/0009-motion-broll-motion-kit.md) - Motion b-roll lewat engine motion-kit + sub-composition HyperFrames.

### Design System & Frontend
32. [design-system/visual-system.md](design-system/visual-system.md) - Sistem visual: palet, tipografi, kartu, track/z-index, safe area, motion.
33. [frontend/composition-implementation.md](frontend/composition-implementation.md) - Cara `index.html` mengimplementasikan komposisi aktif.

### Operations
34. [operations/runbook.md](operations/runbook.md) - Perintah harian: setup, dev, check, render, publish, transkripsi.
35. [operations/publish-runbook.md](operations/publish-runbook.md) - Menjalankan auto-publish R2/Repliz + kegagalan umum.
36. [operations/video-editing-workflow.md](operations/video-editing-workflow.md) - Operasional 4 fase + gate + ikhtisar per fase.
37. [operations/implementation-standard.md](operations/implementation-standard.md) - Alur perubahan, verifikasi wajib, Definition of Done.
38. [operations/agent-documentation-workflow.md](operations/agent-documentation-workflow.md) - Cara agent memakai docs sebagai SoT + Stop hook.
39. [operations/roadmap.md](operations/roadmap.md) - Rencana: imagegen fix, rilis open-source; arah produk draft.

### Security
40. [security/security-standard.md](security/security-standard.md) - Aturan secret, model kredensial publish, secret scan.
41. [security/audit-2026-07-20.md](security/audit-2026-07-20.md) - Audit awal: tidak ada secret asli ter-track (pass).
```

Then replace `| Keputusan arsitektur | [adr/](adr/) (0001–0008) |` with `| Keputusan arsitektur | [adr/](adr/) (0001–0009) |`.

- [ ] **Step 5: Check the numbering and links**

Run: `grep -c -E '^[0-9]+\. \[' internal/docs/README.md; grep -n 'adr/0009' internal/docs/README.md; test -f internal/docs/adr/0009-motion-broll-motion-kit.md && echo adr-ok`
Expected: `41`, one line with `31. [adr/0009-motion-broll-motion-kit.md]`, and `adr-ok`.

- [ ] **Step 6: Commit**

```bash
git add internal/docs/adr/0009-motion-broll-motion-kit.md internal/docs/requirements/rd-02-composition-render.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/README.md
git commit -q -F - <<'EOF'
docs: add ADR-0009 and EARS for motion b-roll

Engine, clip, motion-blur, and workflow criteria are written before the
code. Registers ADR-0009 in the internal docs index.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: motion-kit engine (TDD)

**Files:**
- Create: `scripts/motion-kit.test.mjs`
- Create: `vendor/motion-kit/motion-kit.js`
- Modify: `package.json` (`scripts`), `.github/workflows/ci.yml`, `internal/docs/architecture/stack.md`

**Interfaces:**
- Produces on `window.M`: pure helpers `clamp, lerp, eo, eio, S, MORPH, FAST, SLOW, SOFT, CAM, INSTANT, track(v0, keys, def?, period?) → t=>number, hex, ctrack(hex0, keys, def?, period?) → t=>'rgb(r,g,b)', step, vis(t, tin, tout, {din,lin,lout,blur}) → {o,blur,s,a,b}, apply(el, v, extra?) → boolean, setText(el, s), IC, icon(name, size, color, strokeW?) → svg string, path(keys) → t=>{x,y}, presses(clicks, drags) → t=>number, crossTimes(f, t0, t1, thresholds) → number[]`.
- Produces: `M.CURSOR_SVG` (string), `M.stageOf(id) → Element` (throws `motion-kit: no .mk-stage inside [data-composition-id="<id>"]`), `M.finder(id) → (elId) => Element|null`, `M.build(id, cfg) → seek(t)`, `M.clip(id, cfg) → seek(t)` (registers `window.__timelines[id]`).
- `cfg` keys: `W, H, T, bg, center, intro, SH, start, SEQ, layers, cursor, shapePress, spring, camSpring, geom, extra`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/motion-kit.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../vendor/motion-kit/motion-kit.js', import.meta.url), 'utf8');

function fakeEl(name) {
  return {
    name,
    style: {},
    children: {},
    innerHTML: '',
    querySelector(sel) { return this.children[sel] ?? null; },
    insertAdjacentHTML(pos, html) { if (html.includes('mk-cursor')) this.children['.mk-cursor'] = fakeEl('cursor'); },
  };
}

function load({ layers = ['Lcard'], withCursor = false } = {}) {
  const stage = fakeEl('stage');
  stage.children['.mk-world'] = fakeEl('world');
  stage.children['.mk-shape'] = fakeEl('shape');
  for (const id of layers) stage.children['#' + id] = fakeEl(id);
  if (withCursor) stage.children['.mk-cursor'] = fakeEl('cursor');
  const timelines = [];
  const ctx = {
    document: { querySelector: (sel) => (sel === '[data-composition-id="broll-test"] .mk-stage' ? stage : null) },
    gsap: {
      timeline(opts) {
        const tl = { opts, tweens: [], to(target, vars, pos) { this.tweens.push({ target, vars, pos }); return this; } };
        timelines.push(tl);
        return tl;
      },
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { M: ctx.M, ctx, stage, timelines };
}

const CFG = () => ({
  W: 1080, H: 1920, T: 4, bg: '#050505',
  SH: { a: { w: 400, h: 120, r: 60, bg: '#ffffff', cam: 1.5 }, b: { w: 700, h: 500, r: 40, bg: '#111111', cam: 1.2 } },
  start: 'a', SEQ: [[1.5, 'b']],
  layers: [{ el: 'Lcard', tin: 0.2, tout: null, anchor: 't' }],
});

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);

test('S is a spring step response from 0 to 1', () => {
  const { M } = load();
  assert.equal(M.S(0, 15, 0.84), 0);
  assert.equal(M.S(-1, 15, 0.84), 0);
  near(M.S(5, 15, 0.84), 1);
  assert.equal(M.S(0.01, Infinity, 1), 1);
  near(M.S(0.1, 10, 1), 1 - 2 / Math.E);
});

test('track sums one spring per change and can retarget', () => {
  const { M } = load();
  const f = M.track(0, [[1, 10], [2, 20]]);
  assert.equal(f(0.5), 0);
  near(f(10), 20);
  assert.equal(M.track(5, [[1, 5]])(3), 5);
});

test('ctrack moves colours between hex targets', () => {
  const { M } = load();
  const c = M.ctrack('#000000', [[1, '#ffffff']]);
  assert.equal(c(0), 'rgb(0,0,0)');
  assert.equal(c(30), 'rgb(255,255,255)');
});

test('vis hides before tin+din, shows after, and hides after tout', () => {
  const { M } = load();
  assert.equal(M.vis(0.1, 0.5, null).o, 0);
  near(M.vis(2, 0.5, null).o, 1);
  assert.equal(M.vis(3, 0.5, 2).o, 0);
  assert.equal(M.vis(1, null, null).o, 1);
});

test('path holds its end keys and arcs between them', () => {
  const { M } = load();
  const p = M.path([[0, 0, 0], [1, 100, 0]]);
  assert.equal(p(-1).x, 0);
  assert.equal(p(-1).y, 0);
  assert.equal(p(2).x, 100);
  assert.equal(p(2).y, 0);
  near(p(0.5).x, 50);
  near(p(0.5).y, 6);
});

test('presses dips on a click and settles back', () => {
  const { M } = load();
  const pr = M.presses([1], []);
  assert.equal(pr(0), 0);
  assert.ok(pr(1) > 0.5);
  near(pr(5), 0);
});

test('crossTimes finds the first crossing of each threshold', () => {
  const { M } = load();
  const ct = M.crossTimes((t) => t, 0, 2, [0.5, 1.5, 3]);
  near(ct[0], 0.5, 0.002);
  near(ct[1], 1.5, 0.002);
  assert.equal(ct[2], Infinity);
});

test('icon normalises stroke width and includes the new vocabulary icons', () => {
  const { M } = load();
  assert.match(M.icon('check', 24, '#fff', 2.2), /stroke-width="2\.200"/);
  assert.match(M.icon('check', 48, '#fff', 2.2), /stroke-width="1\.100"/);
  for (const n of ['message', 'calendar', 'bell', 'users']) assert.ok(M.IC[n] && M.IC[n].length > 0, n);
});

test('finder looks up ids inside the clip stage only', () => {
  const { M, stage } = load();
  assert.equal(M.finder('broll-test')('Lcard'), stage.children['#Lcard']);
  assert.throws(() => M.finder('missing'), /no \.mk-stage inside \[data-composition-id="missing"\]/);
});

test('build draws the shape, camera, and layers as a function of t', () => {
  const { M, stage } = load();
  const seek = M.build('broll-test', CFG());
  assert.equal(stage.style.width, '1080px');
  assert.equal(stage.style.background, '#050505');
  seek(0.1);
  const shape = stage.children['.mk-shape'].style;
  assert.equal(shape.width, '400.000px');
  assert.match(stage.children['.mk-world'].style.transform, /scale\(1\.50000\)/);
  assert.equal(stage.children['#Lcard'].style.display, 'none');
  seek(10);
  near(parseFloat(shape.width), 700, 0.01);
  assert.equal(stage.children['#Lcard'].style.display, '');
  assert.equal(stage.children['#Lcard'].style.top, '0.000px');
});

test('build removes the shape shadow for transparent clips', () => {
  const { M, stage } = load();
  M.build('broll-test', { ...CFG(), bg: null });
  assert.equal(stage.style.background, 'transparent');
  assert.equal(stage.children['.mk-shape'].style.boxShadow, 'none');
});

test('build rejects unknown states and missing layers', () => {
  const { M } = load();
  assert.throws(() => M.build('broll-test', { ...CFG(), start: 'zzz' }), /start state "zzz" is not in SH/);
  assert.throws(() => M.build('broll-test', { ...CFG(), SEQ: [[1, 'zzz']] }), /state "zzz" is not in SH/);
  assert.throws(() => M.build('broll-test', { ...CFG(), layers: [{ el: 'Lmissing', tin: 0, tout: null }] }), /layer #Lmissing not found/);
});

test('build adds a cursor when the clip has none and moves it', () => {
  const { M, stage } = load();
  const seek = M.build('broll-test', { ...CFG(), cursor: { size: 40, clicks: [1], keys: [[0, 10, 20], [1, 30, 40]] } });
  seek(2);
  const cur = stage.children['.mk-cursor'];
  assert.ok(cur, 'cursor inserted');
  assert.equal(cur.style.width, '40px');
  assert.match(cur.style.transform, /^translate\(/);
});

test('clip registers a paused timeline whose proxy tween drives seek', () => {
  const { M, ctx, stage, timelines } = load();
  const seek = M.clip('broll-test', CFG());
  assert.equal(ctx.__timelines['broll-test'], timelines[0]);
  assert.equal(timelines[0].opts.paused, true);
  const tw = timelines[0].tweens[0];
  assert.equal(tw.vars.t, 4);
  assert.equal(tw.vars.duration, 4);
  assert.equal(tw.vars.ease, 'none');
  assert.equal(tw.pos, 0);
  tw.target.t = 2.3;
  tw.vars.onUpdate();
  const viaTimeline = { ...stage.children['.mk-shape'].style };
  seek(0);
  seek(2.3);
  assert.deepEqual({ ...stage.children['.mk-shape'].style }, viaTimeline);
});

test('clip rejects a missing or zero duration', () => {
  const { M } = load();
  assert.throws(() => M.clip('broll-test', { ...CFG(), T: 0 }), /needs cfg\.T > 0/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test scripts/motion-kit.test.mjs 2>&1 | tail -5`
Expected: FAIL, with `ENOENT` for `vendor/motion-kit/motion-kit.js`.

- [ ] **Step 3: Write the engine**

Create `vendor/motion-kit/motion-kit.js`:

```js
/* motion-kit: one shape that never cuts, as HyperFrames sub-compositions.
   Adapted from Barty-Bart/motion-graphics skills/motion-broll/engine/motion.js
   (MIT, commit e8d610a). Every style is a pure function of clip-local time.
   Changes from upstream:
   - elements are found inside the clip's .mk-stage, because several clips share one document;
   - M.scene is replaced by M.build (DOM wiring, returns seek) and M.clip (registers a paused
     GSAP timeline whose proxy tween calls seek in onUpdate);
   - the browser preview loop, location/performance clocks and html.alpha class are removed
     (HyperFrames determinism rules); a transparent clip drops the shape shadow instead;
   - icons message, calendar, bell and users are added (Lucide, ISC). */
(function () {
const M = window.M = {};
const clamp = M.clamp = (x,a=0,b=1)=>Math.min(b,Math.max(a,x));
M.lerp = (a,b,u)=>a+(b-a)*u;
const eo = M.eo = x=>{x=clamp(x);return 1-Math.pow(1-x,3)};
const eio = M.eio = x=>{x=clamp(x);return x*x*x*(x*(6*x-15)+10)};

// closed-form spring step response 0 -> 1 (zero initial velocity)
const S = M.S = (tau,w,z)=>{
  if(tau<=0) return 0;
  if(!isFinite(w)) return 1;
  if(z<1){const wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*tau)*(Math.cos(wd*tau)+z*w/wd*Math.sin(wd*tau));}
  return 1-Math.exp(-w*tau)*(1+w*tau);
};
M.MORPH=[15,0.84]; M.FAST=[27,0.86]; M.SLOW=[12.5,0.9]; M.SOFT=[10,0.95]; M.CAM=[7.5,1]; M.INSTANT=[Infinity,1];

// a value that changes target many times = the sum of one spring per change.
// period>0 and a closed loop adds the previous cycle's residue so t=period == t=0.
M.track = (v0,keys,def=M.MORPH,period=0)=>{
  let prev=v0; const ks=[];
  for(const k of keys){const d=k[1]-prev; prev=k[1]; const sp=k[2]||def; if(d!==0) ks.push([k[0],d,sp[0],sp[1]]);}
  const loop = period>0 && Math.abs(prev-v0)<1e-9;
  return t=>{let v=v0; for(const k of ks){v+=k[1]*S(t-k[0],k[2],k[3]); if(loop) v+=k[1]*(S(t+period-k[0],k[2],k[3])-1);} return v;};
};
const hex = M.hex = h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
M.ctrack = (h0,keys,def=[20,1],period=0)=>{
  const c0=hex(h0); const tr=[0,1,2].map(i=>M.track(c0[i],keys.map(k=>[k[0],hex(k[1])[i],k[2]]),def,period));
  return t=>`rgb(${tr.map(f=>Math.round(clamp(f(t),0,255))).join(',')})`;
};
// step helper: pick the latest value whose time has passed
M.step = (v0,keys)=>t=>{let v=v0; for(const k of keys) if(t>=k[0]) v=k[1]; return v;};

// content swap: exit blurs out fast; enter waits, then blurs in (own timings -> no overlap)
M.vis = (t,tin,tout,o={})=>{
  const din=o.din??0.07, lin=o.lin??0.26, lout=o.lout??0.12, bl=o.blur??12;
  const a = tin==null?1:eo((t-tin-din)/lin);
  const b = tout==null?0:eo((t-tout)/lout);
  return {o:a*(1-b), blur:(1-a)*bl+b*bl*0.8, s:(0.94+0.06*a)*(1-0.03*b), a, b};
};
M.apply = (el,v,extra='')=>{
  if(v.o<0.002){el.style.display='none';return false;}
  el.style.display=''; el.style.opacity=v.o.toFixed(4);
  el.style.filter=v.blur>0.05?`blur(${v.blur.toFixed(2)}px)`:'none';
  el.style.transform=`scale(${v.s.toFixed(4)})${extra}`;
  return true;
};
M.setText = (el,s)=>{ if(el._t!==s){ el.textContent=s; el._t=s; } };

// one icon set, 24-grid, stroke normalised so every icon has the same world stroke width
M.IC = {
 arrow:['M5 12h14','M13 5l7 7-7 7'], check:['M20 6 9 17l-5-5'], x:['M18 6 6 18','M6 6l12 12'], plus:['M5 12h14','M12 5v14'],
 folder:['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'],
 terminal:['m4 17 6-6-6-6','M12 19h8'], file:['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z','M14 2v4a2 2 0 0 0 2 2h4','M8 13h8','M8 17h5'],
 pencil:['M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z','m15 5 4 4'],
 coin:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z','M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8','M12 18V6'],
 clock:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z','M12 6v6l4 2'],
 chip:['M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z','M9 9h6v6H9z','M9 1v3','M15 1v3','M9 20v3','M15 20v3','M20 9h3','M20 14h3','M1 9h3','M1 14h3'],
 sparkle:['M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z'],
 castle:['M3 21V9l3-1v2h3V7l3-2 3 2v3h3V8l3 1v12','M3 21h18','M10 21v-4a2 2 0 0 1 4 0v4','M6 13h1','M17 13h1'],
 search:['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z','m21 21-4.3-4.3'],
 message:['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
 calendar:['M8 2v4','M16 2v4','M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z','M3 10h18'],
 bell:['M10.268 21a2 2 0 0 0 3.464 0','M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'],
 users:['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z','M22 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
};
M.icon = (name,size,color,sw=2.2)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${(sw*24/size).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">${M.IC[name].map(d=>`<path d="${d}"/>`).join('')}</svg>`;

// cursor path: keyframes [t,x,y] in world coords, eased between keys with a slight human arc
M.path = (CK)=>t=>{
  if(t<=CK[0][0]) return {x:CK[0][1],y:CK[0][2]};
  const L=CK[CK.length-1]; if(t>=L[0]) return {x:L[1],y:L[2]};
  let i=0; while(t>=CK[i+1][0]) i++;
  const [t0,x0,y0]=CK[i],[t1,x1,y1]=CK[i+1];
  const u=eio((t-t0)/(t1-t0)), dx=x1-x0, dy=y1-y0, arc=Math.sin(Math.PI*u)*0.06;
  return {x:x0+dx*u-dy*arc, y:y0+dy*u+dx*arc};
};
M.presses = (clicks=[],drags=[])=>{
  const k=[];
  for(const c of clicks){k.push([c-0.07,1,[45,1]],[c+0.035,0,[22,0.72]]);}
  for(const [a,b] of drags){k.push([a-0.04,1,[45,1]],[b,0,[22,0.72]]);}
  k.sort((a,b)=>a[0]-b[0]); return M.track(0,k);
};
// time at which a monotonic function first crosses a threshold (precomputed at 1ms)
M.crossTimes = (f,t0,t1,ths)=>ths.map(th=>{for(let t=t0;t<=t1;t+=0.001) if(f(t)>=th) return t; return Infinity;});

M.CURSOR_SVG = '<svg class="mk-cursor" viewBox="0 0 40 56"><path d="M3 3 L3 41 L12.5 32 L19 47 L25.5 44.2 L19.2 29.8 L32 29.8 Z" fill="#050505" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>';

// the clip's stage: the .mk-stage inside the element carrying the clip's data-composition-id
M.stageOf = (id)=>{
  const stage=document.querySelector(`[data-composition-id="${id}"] .mk-stage`);
  if(!stage) throw new Error(`motion-kit: no .mk-stage inside [data-composition-id="${id}"]`);
  return stage;
};
// id lookup scoped to one clip, so ids may repeat across clips
M.finder = (id)=>{const stage=M.stageOf(id); return elId=>stage.querySelector('#'+elId);};

/* build: wire one clip and return seek(t).
 cfg = { W,H, center:[x,y], bg:'#hex'|null, SH:{name:{w,h,r,bg,cam}}, start:'name', SEQ:[[t,'name'],...],
         layers:[{el,tin,tout,anchor:'c'|'t'|'l',o,update(t,g,v)}], cursor:{keys,clicks,drags,size}, shapePress:[t],
         intro:t|null, spring, camSpring, geom(t,g) -> g, extra(t,g) }                                              */
M.build = (id,cfg)=>{
  const stage=M.stageOf(id);
  const world=stage.querySelector('.mk-world'), shape=stage.querySelector('.mk-shape');
  if(!world||!shape) throw new Error(`motion-kit: clip "${id}" needs .mk-world and .mk-shape inside .mk-stage`);
  const {W,H}=cfg; const [CX,CY]=cfg.center||[W/2,H/2];
  const SEQ=cfg.SEQ||[];
  const P0=cfg.SH[cfg.start];
  if(!P0) throw new Error(`motion-kit: clip "${id}" start state "${cfg.start}" is not in SH`);
  for(const [,n] of SEQ) if(!cfg.SH[n]) throw new Error(`motion-kit: clip "${id}" state "${n}" is not in SH`);
  stage.style.width=W+'px'; stage.style.height=H+'px';
  stage.style.background=cfg.bg||'transparent';
  if(!cfg.bg) shape.style.boxShadow='none';
  const sp=cfg.spring||M.MORPH;
  const tr=k=>M.track(P0[k],SEQ.map(([t,n])=>[t,cfg.SH[n][k]]),sp);
  const shW=tr('w'), shH=tr('h'), shR=tr('r');
  const shBG=M.ctrack(P0.bg,SEQ.map(([t,n])=>[t,cfg.SH[n].bg]),[20,1]);
  const cam=M.track(P0.cam,SEQ.map(([t,n])=>[t,cfg.SH[n].cam]),cfg.camSpring||M.CAM);
  const press=M.track(0,(cfg.shapePress||[]).flatMap(c=>[[c-0.07,1,[45,1]],[c+0.035,0,[22,.72]]]));
  const intro=cfg.intro===undefined?0.02:cfg.intro;
  let cur=stage.querySelector('.mk-cursor');
  if(cfg.cursor&&!cur){stage.insertAdjacentHTML('beforeend',M.CURSOR_SVG); cur=stage.querySelector('.mk-cursor');}
  const cpath=cfg.cursor?M.path(cfg.cursor.keys):null, cpress=cfg.cursor?M.presses(cfg.cursor.clicks,cfg.cursor.drags):null;
  if(cfg.cursor) cur.style.width=(cfg.cursor.size||46)+'px'; else if(cur) cur.style.display='none';
  const layers=(cfg.layers||[]).map(L=>{
    const node=stage.querySelector('#'+L.el);
    if(!node) throw new Error(`motion-kit: clip "${id}" layer #${L.el} not found`);
    return {...L,node};
  });
  return (t)=>{
    let g={t, w:shW(t), h:shH(t), r:shR(t), bg:shBG(t), s:cam(t), cx:0, cy:0, fx:0, fy:0, sc:1-0.035*press(t), op:1};
    if(intro!=null){const a=S(t-intro,13,0.78); g.sc*=0.55+0.45*a; g.op=clamp((t-intro)/0.12);}
    g.cursor=cpath?cpath(t):null;
    if(cfg.geom) g=cfg.geom(t,g)||g;
    g.r=Math.min(g.r,g.h/2,g.w/2);
    world.style.transform=`translate(${(CX-g.s*g.fx).toFixed(3)}px,${(CY-g.s*g.fy).toFixed(3)}px) scale(${g.s.toFixed(5)})`;
    const st=shape.style;
    st.left=(g.cx-g.w/2).toFixed(3)+'px'; st.top=(g.cy-g.h/2).toFixed(3)+'px';
    st.width=g.w.toFixed(3)+'px'; st.height=g.h.toFixed(3)+'px'; st.borderRadius=g.r.toFixed(3)+'px';
    st.background=g.bg; st.transform=`scale(${g.sc.toFixed(5)})`; st.opacity=g.op.toFixed(4);
    for(const L of layers){
      const v=M.vis(t,L.tin,L.tout,L.o||{});
      if(M.apply(L.node,v)){
        const an=L.anchor||'c';
        L.node.style.left=(an==='l'?0:g.w/2).toFixed(3)+'px';
        L.node.style.top=(an==='t'?0:g.h/2).toFixed(3)+'px';
        if(L.update) L.update(t,g,v);
      }
    }
    if(cfg.extra) cfg.extra(t,g);
    if(cpath){
      const c=g.cursor, sx=CX+g.s*(c.x-g.fx), sy=CY+g.s*(c.y-g.fy);
      cur.style.transform=`translate(${(sx-3).toFixed(2)}px,${(sy-3).toFixed(2)}px) scale(${(1-0.13*cpress(t)).toFixed(4)})`;
    }
  };
};

// clip: build + a paused GSAP timeline whose proxy tween drives seek (HyperFrames seeks it per frame)
M.clip = (id,cfg)=>{
  if(!(cfg.T>0)) throw new Error(`motion-kit: clip "${id}" needs cfg.T > 0`);
  const seek=M.build(id,cfg);
  const proxy={t:0};
  const tl=gsap.timeline({paused:true});
  tl.to(proxy,{t:cfg.T,duration:cfg.T,ease:'none',onUpdate:()=>seek(proxy.t)},0);
  seek(0);
  window.__timelines=window.__timelines||{};
  window.__timelines[id]=tl;
  return seek;
};
})();
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test scripts/motion-kit.test.mjs 2>&1 | grep -E '^ℹ (tests|pass|fail)'`
Expected: `ℹ tests 15`, `ℹ pass 15`, `ℹ fail 0`.

- [ ] **Step 5: Wire the script, CI, and stack doc**

In `package.json` `scripts`, replace `"test:repliz": "node --test scripts/repliz-publish.test.mjs"` with:

```json
    "test:repliz": "node --test scripts/repliz-publish.test.mjs",
    "test:motion-kit": "node --test scripts/motion-kit.test.mjs"
```

In `.github/workflows/ci.yml`, replace `      - run: npm run test:repliz` with:

```yaml
      - run: npm run test:repliz
      - run: npm run test:motion-kit
```

In `internal/docs/architecture/stack.md`, insert after the row that starts `| GSAP |`:

```markdown
| motion-kit | Engine motion b-roll: satu shape morph + kursor, spring closed-form, frame = fungsi waktu lokal clip | Vendored `vendor/motion-kit/`, di-`<script>` + `<link>` di `index.html`; clip memanggil `M.clip()` | `docs/agents/references/motion-broll-authoring.md` |
```

Run: `npm run test:motion-kit 2>&1 | grep -E '^ℹ (pass|fail)'`
Expected: `ℹ pass 15`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/motion-kit.test.mjs vendor/motion-kit/motion-kit.js package.json .github/workflows/ci.yml internal/docs/architecture/stack.md
git commit -q -F - <<'EOF'
feat: add motion-kit engine for motion b-roll clips

Port of the motion-broll spring engine as window.M, with M.build scoped
to one clip's stage and M.clip registering a paused GSAP timeline whose
proxy tween drives seek. Unit tests run in node:vm and in CI.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Styles, fonts, license, notices

**Files:**
- Create: `vendor/motion-kit/motion-kit.css`
- Create: `vendor/motion-kit/fonts/Geist-Variable.woff2`, `vendor/motion-kit/fonts/GeistMono-Medium.woff2`, `vendor/motion-kit/fonts/OFL-Geist.txt`, `vendor/motion-kit/LICENSE` (copied from upstream)
- Modify: `THIRD_PARTY_NOTICES.md`, `internal/docs/design-system/visual-system.md` (insert before `## SFX`)

**Interfaces:**
- Produces CSS classes: `mk-stage`, `mk-world`, `mk-shape`, `mk-layer`, `mk-a`, `mk-row`, `mk-blend`, `mk-mono`, `mk-cursor`; font families `Geist`, `Geist Mono`.

- [ ] **Step 1: Copy fonts and license from the pinned upstream commit**

```bash
TMP=$(mktemp -d)
git clone -q https://github.com/Barty-Bart/motion-graphics.git "$TMP/mg"
git -C "$TMP/mg" checkout -q e8d610adcf946367430c8b43a97aad8059befaad
mkdir -p vendor/motion-kit/fonts
cp "$TMP/mg/skills/motion-broll/engine/fonts/Geist-Variable.woff2" "$TMP/mg/skills/motion-broll/engine/fonts/GeistMono-Medium.woff2" "$TMP/mg/skills/motion-broll/engine/fonts/OFL-Geist.txt" vendor/motion-kit/fonts/
cp "$TMP/mg/LICENSE" vendor/motion-kit/LICENSE
rm -rf "$TMP"
ls -la vendor/motion-kit/fonts vendor/motion-kit/LICENSE
```
Expected: `Geist-Variable.woff2` (~68 KB), `GeistMono-Medium.woff2` (~50 KB), `OFL-Geist.txt`, and `LICENSE` present.

- [ ] **Step 2: Write the stylesheet**

Create `vendor/motion-kit/motion-kit.css`:

```css
/* motion-kit styles. Adapted from Barty-Bart/motion-graphics skills/motion-broll/engine/base.css
   (MIT, commit e8d610a). Classes are prefixed mk- because this sheet is global in the host. */
@font-face { font-family: 'Geist'; src: url(fonts/Geist-Variable.woff2) format('woff2'); font-weight: 100 900; font-display: block; }
@font-face { font-family: 'Geist Mono'; src: url(fonts/GeistMono-Medium.woff2) format('woff2'); font-weight: 100 900; font-display: block; }
.mk-stage { position: absolute; left: 0; top: 0; overflow: hidden; font-family: 'Geist', system-ui, sans-serif; -webkit-font-smoothing: antialiased; color: #050505; font-feature-settings: "tnum" 1; }
.mk-world { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.mk-shape { position: absolute; overflow: hidden; isolation: isolate; box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 18px 48px -12px rgba(0,0,0,.6); }
.mk-layer { position: absolute; width: 0; height: 0; transform-origin: 0 0; }
.mk-a { position: absolute; }
.mk-row { position: absolute; display: flex; align-items: center; white-space: nowrap; }
.mk-blend { mix-blend-mode: difference; }
.mk-mono { font-family: 'Geist Mono', ui-monospace, monospace; }
.mk-stage svg { display: block; overflow: visible; }
.mk-cursor { position: absolute; left: 0; top: 0; height: auto; transform-origin: 3px 3px; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); z-index: 10; }
```

- [ ] **Step 3: Add the notices**

Append to `THIRD_PARTY_NOTICES.md`:

```markdown

## motion-kit (`vendor/motion-kit`)

`vendor/motion-kit/motion-kit.js` and `vendor/motion-kit/motion-kit.css` are
adapted from `skills/motion-broll/engine` in
https://github.com/Barty-Bart/motion-graphics (commit e8d610a), MIT License,
Copyright (c) 2026 Bart. The upstream license is kept in
`vendor/motion-kit/LICENSE`; the changes are listed at the top of
`motion-kit.js`.

- Geist and Geist Mono (`vendor/motion-kit/fonts/`): SIL Open Font License 1.1,
  Copyright (c) 2023 Vercel, in collaboration with basement.studio
  (`vendor/motion-kit/fonts/OFL-Geist.txt`).
- Icon paths in `M.IC`: adapted from Lucide, ISC License.
```

- [ ] **Step 4: Document the look in the visual system**

In `internal/docs/design-system/visual-system.md`, insert before the line `## SFX`:

```markdown
## Motion b-roll (motion-kit)

- Engine `vendor/motion-kit/` dimuat sekali di `index.html`; setiap clip adalah
  sub-composition `compositions/broll/*.html` di **track 4**. Mount host ber-class
  `broll` (`position:absolute; inset:0; z-index:22`), di bawah caption (45) dan
  hook/CTA (56–57).
- Token: kanvas `#050505`; shape putih `#FFFFFF` (tinta `#050505`) atau panel
  `#111111` + border `rgba(255,255,255,.12)`; satu aksen `#facc15`; sukses
  `#22c55e`; muted `#d4d4d8`.
- Font di dalam shape: Geist (UI), Geist Mono (terminal/nama file). Caption tetap
  Arial 950.
- Treatment: cutaway (latar `#050505` penuh), split (clip mengisi separuh atas;
  host menggeser `#base-video` ke bawah lewat `y`), panel (clip transparan di zona
  kosong). Detail: `docs/agents/references/motion-broll-authoring.md`.

```

- [ ] **Step 5: Verify files**

Run: `grep -c 'mk-' vendor/motion-kit/motion-kit.css; grep -n 'Copyright (c) 2026 Bart' vendor/motion-kit/LICENSE; grep -n 'motion-kit' THIRD_PARTY_NOTICES.md | head -2`
Expected: a count ≥ 10, one LICENSE line, and the new notices heading.

- [ ] **Step 6: Commit**

```bash
git add vendor/motion-kit/motion-kit.css vendor/motion-kit/fonts vendor/motion-kit/LICENSE THIRD_PARTY_NOTICES.md internal/docs/design-system/visual-system.md
git commit -q -F - <<'EOF'
feat: add motion-kit styles, Geist fonts, and license notices

Global mk- classes for stage, shape, layers, and cursor; Geist and Geist
Mono from the pinned upstream commit; MIT, OFL, and ISC notices.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Example clips and the example check

**Files:**
- Create: `docs/agents/references/motion-broll-examples/index.html`
- Create: `docs/agents/references/motion-broll-examples/hyperframes.json`
- Create: `docs/agents/references/motion-broll-examples/snapshots.json`
- Create: `docs/agents/references/motion-broll-examples/compositions/ex-01-invoice.html`
- Create: `docs/agents/references/motion-broll-examples/compositions/ex-02-chat-split.html`
- Create: `docs/agents/references/motion-broll-examples/compositions/ex-03-steps-panel.html`
- Create: `scripts/check-broll-examples.mjs`
- Modify: `package.json`, `internal/docs/operations/runbook.md`

**Interfaces:**
- Consumes: `M.finder`, `M.icon`, `M.track`, `M.ctrack`, `M.vis`, `M.eio`, `M.clamp`, `M.FAST`, `M.SLOW`, `M.clip` (Task 2); `mk-*` classes (Task 3).
- Produces: `npm run check:broll-examples` → lint, validate, and `renders/broll-examples/contact-sheet.jpg`.

- [ ] **Step 1: Write the check script (it fails until the examples exist)**

Create `scripts/check-broll-examples.mjs`:

```js
#!/usr/bin/env node
// Assemble the motion b-roll example project in a temp dir, then lint, validate,
// and snapshot it at the key-word times listed in snapshots.json.
// Spec: docs/superpowers/specs/2026-09-26-motion-broll-design.md ("Pengujian").
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const HYPERFRAMES = 'hyperframes@0.7.24';
const SRC = 'docs/agents/references/motion-broll-examples';
const OUT = resolve('renders/broll-examples');

const env = { ...process.env };
delete env.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe

const hf = (...args) => {
  const r = spawnSync('npx', ['--yes', HYPERFRAMES, ...args], { stdio: 'inherit', env });
  if (r.status !== 0) throw new Error(`hyperframes ${args[0]} failed (exit ${r.status})`);
};

const dir = mkdtempSync(join(tmpdir(), 'broll-examples-'));
try {
  cpSync(SRC, dir, { recursive: true });
  mkdirSync(join(dir, 'vendor'), { recursive: true });
  cpSync('vendor/gsap.min.js', join(dir, 'vendor/gsap.min.js'));
  cpSync('vendor/motion-kit', join(dir, 'vendor/motion-kit'), { recursive: true });
  const { at } = JSON.parse(readFileSync(join(SRC, 'snapshots.json'), 'utf8'));
  hf('lint', dir);
  hf('validate', dir);
  rmSync(OUT, { recursive: true, force: true });
  hf('snapshot', '--at', at.join(','), '-o', OUT, dir);
  console.log(`snapshots: ${OUT}/contact-sheet.jpg`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
```

In `package.json` `scripts`, replace `"test:motion-kit": "node --test scripts/motion-kit.test.mjs"` with:

```json
    "test:motion-kit": "node --test scripts/motion-kit.test.mjs",
    "check:broll-examples": "node scripts/check-broll-examples.mjs"
```

Run: `npm run check:broll-examples 2>&1 | tail -3`
Expected: FAIL with `ENOENT` for `docs/agents/references/motion-broll-examples`.

- [ ] **Step 2: Create the example host and project files**

Create `docs/agents/references/motion-broll-examples/hyperframes.json`:

```json
{
  "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  "paths": {
    "blocks": "compositions",
    "components": "compositions/components",
    "assets": "assets"
  }
}
```

Create `docs/agents/references/motion-broll-examples/snapshots.json`:

```json
{
  "at": [1.5, 2.25, 3.1, 3.8, 5.3, 9.6, 11.25, 12, 13.2, 16.8, 18.5, 20.2]
}
```

Create `docs/agents/references/motion-broll-examples/index.html`:

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="vendor/gsap.min.js"></script>
    <script src="vendor/motion-kit/motion-kit.js"></script>
    <link rel="stylesheet" href="vendor/motion-kit/motion-kit.css" />
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
    <div id="root" data-composition-id="broll-examples" data-start="0" data-width="1080" data-height="1920" data-duration="22">
      <div id="base-video" class="clip" data-start="0" data-duration="22" data-track-index="1">
        <div id="face"></div>
        <div id="face-label">placeholder wajah</div>
      </div>
      <div class="broll" data-composition-id="ex-01-invoice" data-composition-src="compositions/ex-01-invoice.html"
           data-start="0.5" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div class="broll" data-composition-id="ex-02-chat-split" data-composition-src="compositions/ex-02-chat-split.html"
           data-start="7" data-duration="8" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div class="broll" data-composition-id="ex-03-steps-panel" data-composition-src="compositions/ex-03-steps-panel.html"
           data-start="15.3" data-duration="6.5" data-track-index="4" data-width="1080" data-height="1920"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // Split treatment for ex-02: slide the base video into the bottom half, then back.
      tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, 7);
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, 14.55);
      window.__timelines['broll-examples'] = tl;
    </script>
  </body>
</html>
```

- [ ] **Step 3: Create example 1 — cutaway, pill + click → card → check**

Create `docs/agents/references/motion-broll-examples/compositions/ex-01-invoice.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .sk { position: absolute; height: 14px; border-radius: 7px; background: #e4e4e7; }
        .lbl { font-size: 26px; color: #52525b; white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="ex-01-invoice" data-width="1080" data-height="1920" data-duration="6">
        <div class="mk-stage">
          <div class="mk-world">
            <div class="mk-shape">
              <div class="mk-layer" id="Lpill">
                <div class="mk-row" style="transform:translate(-50%,-50%);gap:16px;font-size:44px;font-weight:600;letter-spacing:-.02em"><span id="icSend"></span>Kirim invoice</div>
              </div>
              <div class="mk-layer" id="Lcard">
                <div class="mk-row mk-mono" style="left:-300px;top:40px;gap:14px;font-size:28px"><span id="icFile"></span>invoice-klien.pdf</div>
                <div class="mk-a" style="left:-300px;top:98px;width:600px;height:2px;background:#e4e4e7"></div>
                <div class="sk" id="sk0" style="left:-300px;top:136px"></div>
                <div class="sk" id="sk1" style="left:-300px;top:172px"></div>
                <div class="sk" id="sk2" style="left:-300px;top:208px"></div>
                <div class="mk-a" style="left:-300px;top:300px;width:600px;height:16px;border-radius:8px;background:#e4e4e7"></div>
                <div class="mk-a" id="bar" style="left:-300px;top:300px;height:16px;border-radius:8px;background:#facc15"></div>
                <div class="mk-a lbl" style="left:-300px;top:340px">Mengirim ke klien</div>
              </div>
              <div class="mk-layer" id="Ldone">
                <div class="mk-row" style="transform:translate(-50%,-50%);gap:16px;color:#fff;font-size:46px;font-weight:600;letter-spacing:-.02em"><span id="icCheck"></span>Terkirim</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'ex-01-invoice';
          const $ = M.finder(ID);
          $('icSend').innerHTML = M.icon('arrow', 40, '#050505');
          $('icFile').innerHTML = M.icon('file', 32, '#050505');
          $('icCheck').innerHTML = M.icon('check', 44, '#ffffff', 3);
          const SKW = [520, 440, 480];
          M.clip(ID, {
            W: 1080, H: 1920, T: 6, bg: '#050505', intro: 0.15,
            SH: {
              pill: { w: 520, h: 120, r: 60, bg: '#FFFFFF', cam: 1.5 },
              card: { w: 700, h: 420, r: 40, bg: '#FFFFFF', cam: 1.25 },
              done: { w: 460, h: 120, r: 60, bg: '#22c55e', cam: 1.5 },
            },
            start: 'pill', SEQ: [[1.6, 'card'], [4.2, 'done']],
            shapePress: [1.2],
            layers: [
              { el: 'Lpill', tin: 0.15, tout: 1.6 },
              { el: 'Lcard', tin: 1.6, tout: 4.2, anchor: 't', update: (t) => {
                SKW.forEach((w, i) => { $('sk' + i).style.width = (w * M.eio((t - 1.85 - 0.12 * i) / 0.35)) + 'px'; });
                $('bar').style.width = (600 * M.eio((t - 2.6) / 1.3)) + 'px';
              } },
              { el: 'Ldone', tin: 4.2, tout: null },
            ],
            cursor: { size: 44, clicks: [1.2], keys: [[0, 240, 300], [0.7, 240, 300], [1.1, 40, 10], [1.3, 40, 10], [2.0, 290, 300]] },
          });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 4: Create example 2 — split, chat thread → before/after**

Create `docs/agents/references/motion-broll-examples/compositions/ex-02-chat-split.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .bub { position: absolute; left: -330px; padding: 16px 24px; border-radius: 22px; background: #27272a; color: #fff; font-size: 30px; white-space: nowrap; }
        .col { position: absolute; top: 0; width: 320px; }
        .col .hd { position: absolute; left: 0; width: 320px; top: -130px; text-align: center; font-size: 26px; color: #71717a; }
        .col .ic { position: absolute; left: 124px; top: -70px; }
        .col .lb { position: absolute; left: 0; width: 320px; top: 40px; text-align: center; font-size: 30px; font-weight: 600; white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="ex-02-chat-split" data-width="1080" data-height="1920" data-duration="8">
        <div class="mk-stage">
          <div class="mk-a" style="left:0;top:0;width:1080px;height:960px;background:#050505"></div>
          <div class="mk-world">
            <div class="mk-shape">
              <div class="mk-layer" id="Lchat">
                <div class="mk-row" style="left:-330px;top:36px;gap:12px;color:#fff;font-size:30px;font-weight:600"><span id="icMsg"></span>Chat klien</div>
                <div class="bub" id="b0" style="top:110px">Kak, invoice-nya udah?</div>
                <div class="bub" id="b1" style="top:210px">Bisa dikirim ulang?</div>
                <div class="bub" id="b2" style="top:310px">Halo kak?</div>
                <div class="mk-a" id="pending" style="left:-330px;top:430px;font-size:24px;color:#d4d4d8">Belum dibalas</div>
              </div>
              <div class="mk-layer" id="Lcompare">
                <div class="mk-a" id="hl" style="top:-150px;height:300px;border-radius:28px;background:#f4f4f5"></div>
                <div class="col" style="left:-350px"><div class="hd">Sebelum</div><div class="ic" id="icX"></div><div class="lb">Balas manual</div></div>
                <div class="col" style="left:30px"><div class="hd">Sesudah</div><div class="ic" id="icOk"></div><div class="lb">Balas otomatis</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'ex-02-chat-split';
          const $ = M.finder(ID);
          $('icMsg').innerHTML = M.icon('message', 32, '#ffffff');
          $('icX').innerHTML = M.icon('x', 72, '#52525b', 2.4);
          $('icOk').innerHTML = M.icon('check', 72, '#22c55e', 2.4);
          const BUB = [0.7, 1.4, 2.1];
          const hlL = M.track(-370, [[5.6, 10, M.SLOW]]);
          const hlR = M.track(-10, [[5.6, 370, M.FAST]]);
          M.clip(ID, {
            W: 1080, H: 1920, T: 8, bg: null, center: [540, 480], intro: 0.2,
            SH: {
              chat: { w: 760, h: 520, r: 36, bg: '#111111', cam: 1.1 },
              compare: { w: 760, h: 420, r: 36, bg: '#FFFFFF', cam: 1.1 },
            },
            start: 'chat', SEQ: [[4.0, 'compare']],
            layers: [
              { el: 'Lchat', tin: 0.2, tout: 4.0, anchor: 't', update: (t) => {
                BUB.forEach((tb, i) => {
                  const v = M.vis(t, tb, null, { din: 0, lin: 0.22 });
                  const s = $('b' + i).style;
                  s.opacity = v.o; s.filter = v.blur > 0.05 ? `blur(${v.blur}px)` : 'none'; s.transform = `translateY(${(1 - v.a) * 16}px)`;
                });
                $('pending').style.opacity = M.vis(t, 2.8, null, { din: 0, lin: 0.2 }).o;
              } },
              { el: 'Lcompare', tin: 4.0, tout: null, update: (t) => {
                const L = hlL(t), R = hlR(t);
                Object.assign($('hl').style, { left: L + 'px', width: Math.max(0, R - L) + 'px' });
                $('icOk').style.transform = `scale(${1 + 0.12 * Math.sin(Math.PI * M.clamp((t - 5.65) / 0.3))})`;
              } },
            ],
            cursor: { size: 44, clicks: [5.5], keys: [[0, 300, 330], [3.9, 300, 330], [5.2, 190, 30], [5.6, 190, 30], [6.4, 300, 300]] },
          });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 5: Create example 3 — panel, timeline langkah**

Create `docs/agents/references/motion-broll-examples/compositions/ex-03-steps-panel.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .dot { position: absolute; width: 20px; height: 20px; border-radius: 10px; top: -40px; }
        .lab { position: absolute; width: 260px; top: 0; text-align: center; font-size: 30px; font-weight: 600; white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="ex-03-steps-panel" data-width="1080" data-height="1920" data-duration="6.5">
        <div class="mk-stage">
          <div class="mk-world">
            <div class="mk-shape" style="border:1px solid rgba(255,255,255,.12);box-sizing:border-box">
              <div class="mk-layer" id="Lsteps">
                <div class="mk-a" id="ind" style="top:-70px;height:120px;border-radius:60px;background:#27272a"></div>
                <div class="mk-a" style="left:-300px;top:-31px;width:600px;height:2px;background:#3f3f46"></div>
                <div class="mk-a" id="fill" style="left:-300px;top:-31px;height:2px;background:#ffffff"></div>
                <div class="dot" id="d0" style="left:-310px"></div>
                <div class="dot" id="d1" style="left:-10px"></div>
                <div class="dot" id="d2" style="left:290px"></div>
                <div class="lab" id="l0" style="left:-430px">Catat</div>
                <div class="lab" id="l1" style="left:-130px">Otomatis</div>
                <div class="lab" id="l2" style="left:170px">Laporan</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'ex-03-steps-panel';
          const $ = M.finder(ID);
          const ACT = [0.9, 2.6, 4.3];
          const indL = M.track(-430, [[2.6, -130, M.SLOW], [4.3, 170, M.SLOW]]);
          const indR = M.track(-170, [[2.6, 130, M.FAST], [4.3, 430, M.FAST]]);
          const fill = M.track(0, [[2.6, 300, M.SLOW], [4.3, 600, M.SLOW]]);
          const dot = ACT.map((ta, i) => M.ctrack('#3f3f46', [[ta, '#facc15']].concat(i < 2 ? [[ACT[i + 1], '#ffffff']] : [])));
          const lab = ACT.map((ta) => M.ctrack('#71717a', [[ta, '#ffffff']]));
          M.clip(ID, {
            W: 1080, H: 1920, T: 6.5, bg: null, center: [540, 470], intro: 0.2,
            SH: { steps: { w: 900, h: 200, r: 100, bg: '#111111', cam: 1.0 } },
            start: 'steps', SEQ: [],
            layers: [
              { el: 'Lsteps', tin: 0.2, tout: null, update: (t) => {
                const v = M.vis(t, ACT[0], null, { din: 0, lin: 0.2 });
                const L = indL(t), R = indR(t);
                Object.assign($('ind').style, { left: L + 'px', width: Math.max(0, R - L) + 'px', opacity: v.o });
                $('fill').style.width = Math.max(0, fill(t)) + 'px';
                for (let i = 0; i < 3; i++) { $('d' + i).style.background = dot[i](t); $('l' + i).style.color = lab[i](t); }
              } },
            ],
          });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 6: Run the example check**

Run: `npm run check:broll-examples 2>&1 | grep -v 'Unknown user config' | tail -12`
Expected: lint and validate finish with 0 errors (warnings allowed), and the last line is `snapshots: <repo>/renders/broll-examples/contact-sheet.jpg`. If lint or validate reports an error, fix the named file and re-run; do not change the engine to satisfy lint unless the error names `vendor/motion-kit`.

- [ ] **Step 7: Look at every snapshot**

Open `renders/broll-examples/contact-sheet.jpg` (Read tool) and each `frame-*.png` that looks wrong. Check, per frame:
- 1.5 s: white pill "Kirim invoice" centred, cursor on it; 2.25 s: mid-morph, no overlapping text; 3.1 s: card with file name and three skeleton lines; 3.8 s: yellow bar about half full; 5.3 s: green "Terkirim" pill.
- 9.6 s: three chat bubbles in the top half, grey placeholder visible in the bottom half; 11.25 s: mid-morph; 12 s: white compare card, highlight on "Sebelum"; 13.2 s: highlight on "Sesudah", check icon green.
- 16.8 s / 18.5 s / 20.2 s: dark panel above the placeholder face; step 1 / 2 / 3 highlighted in turn; text in Geist (not Arial).
- Everywhere: cursor inside the frame, text readable, nothing clipped.
Fix any failure in the clip file, re-run Step 6, and look again. Record in the commit body which frames needed a fix.

- [ ] **Step 8: Document the commands**

In `internal/docs/operations/runbook.md`, replace the line `npm run test:repliz   # node --test scripts/repliz-publish.test.mjs` with:

```
npm run test:repliz          # node --test scripts/repliz-publish.test.mjs
npm run test:motion-kit      # node --test scripts/motion-kit.test.mjs
npm run check:broll-examples # lint + validate + snapshot contoh motion b-roll → renders/broll-examples/
```

- [ ] **Step 9: Commit**

```bash
git add docs/agents/references/motion-broll-examples scripts/check-broll-examples.mjs package.json internal/docs/operations/runbook.md
git commit -q -F - <<'EOF'
feat: add vertical motion b-roll examples and their snapshot check

Cutaway (pill -> card -> check), split (chat -> before/after), and panel
(step timeline) clips on a placeholder face; check:broll-examples lints,
validates, and snapshots them at key-word times without Gemini.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Motion-blur pass (TDD)

**Files:**
- Create: `scripts/render-blur.test.mjs`, `scripts/render-blur.mjs`
- Modify: `package.json`, `.github/workflows/ci.yml`, `internal/docs/operations/runbook.md`, `internal/docs/architecture/stack.md`

**Interfaces:**
- Produces: `export const HYPERFRAMES = 'hyperframes@0.7.24'`, `export const SUBFRAMES = 4`, `export function blendFilter(fps: number): string`, `export function blurPlan({ slug, fps = 30, project = '.' }): { tmpDir, hi, out, render: [cmd, args], blend: [cmd, args] }`, `export function main(argv: string[]): void`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/render-blur.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blendFilter, blurPlan, HYPERFRAMES } from './render-blur.mjs';

test('blendFilter blends 4 subframes into one output frame', () => {
  assert.equal(blendFilter(30), "tmix=frames=4,select='eq(mod(n\\,4)\\,3)',setpts=N/(30*TB)");
});

test('blurPlan renders at 4x fps into renders/.blur and writes <slug>-blur.mp4', () => {
  const p = blurPlan({ slug: 'demo', fps: 30, project: '.' });
  assert.equal(p.tmpDir, 'renders/.blur');
  assert.equal(p.hi, 'renders/.blur/demo-120.mp4');
  assert.equal(p.out, 'renders/demo-blur.mp4');
  assert.deepEqual(p.render, ['npx', ['--yes', HYPERFRAMES, 'render', '--fps', '120', '--quality', 'high', '-o', 'renders/.blur/demo-120.mp4', '.']]);
  assert.deepEqual(p.blend, ['ffmpeg', ['-loglevel', 'error', '-y', '-i', 'renders/.blur/demo-120.mp4', '-vf', blendFilter(30), '-r', '30', '-c:a', 'copy', 'renders/demo-blur.mp4']]);
});

test('blurPlan keeps outputs inside another project directory', () => {
  const p = blurPlan({ slug: 'demo', fps: 30, project: 'renders/.examples-project' });
  assert.equal(p.hi, 'renders/.examples-project/renders/.blur/demo-120.mp4');
  assert.equal(p.out, 'renders/.examples-project/renders/demo-blur.mp4');
  assert.equal(p.render[1].at(-1), 'renders/.examples-project');
});

test('blurPlan rejects unsafe slugs and bad fps', () => {
  assert.throws(() => blurPlan({ slug: '../x' }), /--slug/);
  assert.throws(() => blurPlan({ slug: '' }), /--slug/);
  assert.throws(() => blurPlan({ slug: 'Demo' }), /--slug/);
  assert.throws(() => blurPlan({ slug: 'demo', fps: 0 }), /--fps/);
  assert.throws(() => blurPlan({ slug: 'demo', fps: 29.97 }), /--fps/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test scripts/render-blur.test.mjs 2>&1 | tail -4`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/render-blur.mjs`.

- [ ] **Step 3: Write the script**

Create `scripts/render-blur.mjs`:

```js
#!/usr/bin/env node
// Optional motion-blur pass: render at 4x fps, then blend each group of 4 subframes
// into one output frame with ffmpeg tmix. The audio stream is copied unchanged.
// Spec: docs/superpowers/specs/2026-09-26-motion-broll-design.md ("Motion blur").
// Usage: npm run render:blur -- --slug <slug> [--fps 30] [--project .]
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const HYPERFRAMES = 'hyperframes@0.7.24';
export const SUBFRAMES = 4;

export function blendFilter(fps) {
  return `tmix=frames=${SUBFRAMES},select='eq(mod(n\\,${SUBFRAMES})\\,${SUBFRAMES - 1})',setpts=N/(${fps}*TB)`;
}

export function blurPlan({ slug, fps = 30, project = '.' }) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('--slug must use lowercase letters, digits, and dashes');
  if (!Number.isInteger(fps) || fps <= 0) throw new Error('--fps must be a positive integer');
  const hiFps = fps * SUBFRAMES;
  const tmpDir = join(project, 'renders', '.blur');
  const hi = join(tmpDir, `${slug}-${hiFps}.mp4`);
  const out = join(project, 'renders', `${slug}-blur.mp4`);
  return {
    tmpDir,
    hi,
    out,
    render: ['npx', ['--yes', HYPERFRAMES, 'render', '--fps', String(hiFps), '--quality', 'high', '-o', hi, project]],
    blend: ['ffmpeg', ['-loglevel', 'error', '-y', '-i', hi, '-vf', blendFilter(fps), '-r', String(fps), '-c:a', 'copy', out]],
  };
}

function run([cmd, args]) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} exited with ${r.status}`);
}

export function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      slug: { type: 'string' },
      fps: { type: 'string', default: '30' },
      project: { type: 'string', default: '.' },
    },
  });
  const plan = blurPlan({ slug: values.slug, fps: Number(values.fps), project: values.project });
  mkdirSync(plan.tmpDir, { recursive: true });
  try {
    run(plan.render);
    run(plan.blend);
  } finally {
    rmSync(plan.hi, { force: true });
  }
  console.log(`motion blur: ${plan.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test scripts/render-blur.test.mjs 2>&1 | grep -E '^ℹ (tests|pass|fail)'`
Expected: `ℹ tests 4`, `ℹ pass 4`, `ℹ fail 0`.

- [ ] **Step 5: Wire scripts, CI, and docs**

In `package.json` `scripts`, replace `"check:broll-examples": "node scripts/check-broll-examples.mjs"` with:

```json
    "check:broll-examples": "node scripts/check-broll-examples.mjs",
    "test:render-blur": "node --test scripts/render-blur.test.mjs",
    "render:blur": "node scripts/render-blur.mjs"
```

In `.github/workflows/ci.yml`, replace `      - run: npm run test:motion-kit` with:

```yaml
      - run: npm run test:motion-kit
      - run: npm run test:render-blur
```

In `internal/docs/operations/runbook.md`, replace `npm run render   # render MP4` with:

```
npm run render   # render MP4
npm run render:blur -- --slug <slug>  # opsional: render final dengan motion blur (4× lebih lama)
```

and replace `npm run test:motion-kit      # node --test scripts/motion-kit.test.mjs` with:

```
npm run test:motion-kit      # node --test scripts/motion-kit.test.mjs
npm run test:render-blur     # node --test scripts/render-blur.test.mjs
```

In `internal/docs/architecture/stack.md`, insert after the row that starts `| motion-kit |`:

```markdown
| render-blur | Pass motion blur opsional: render 4× fps → ffmpeg `tmix` → fps asal, audio disalin | `npm run render:blur -- --slug <slug>` | `scripts/render-blur.mjs` |
```

- [ ] **Step 6: Verify the pass on the example project**

```bash
rm -rf renders/.examples-project
mkdir -p renders/.examples-project/vendor
cp -R docs/agents/references/motion-broll-examples/. renders/.examples-project/
cp vendor/gsap.min.js renders/.examples-project/vendor/
cp -R vendor/motion-kit renders/.examples-project/vendor/
npm run render:blur -- --slug examples --project renders/.examples-project
npx --yes hyperframes@0.7.24 render --quality high -o renders/.examples-project/renders/examples.mp4 renders/.examples-project
for f in examples examples-blur; do ffprobe -v error -show_entries format=duration -of csv=p=0 renders/.examples-project/renders/$f.mp4; done
ls renders/.examples-project/renders/.blur
ffmpeg -loglevel error -i renders/.examples-project/renders/examples.mp4 -i renders/.examples-project/renders/examples-blur.mp4 -filter_complex "[0:v]trim=start=0.02:end=0.12,setpts=PTS-STARTPTS[a];[1:v]trim=start=0.02:end=0.12,setpts=PTS-STARTPTS[b];[a][b]psnr" -f null - 2>&1 | grep -o 'average:[0-9.inf]*'
for f in examples examples-blur; do ffmpeg -loglevel error -y -ss 2.25 -i renders/.examples-project/renders/$f.mp4 -frames:v 1 -vf scale=360:-1 renders/.examples-project/$f-2.25.png; done
ffmpeg -loglevel error -y -i renders/.examples-project/examples-2.25.png -i renders/.examples-project/examples-blur-2.25.png -filter_complex hstack=inputs=2 renders/.examples-project/blur-compare.png
```
Expected:
- both durations are `22.0` ±0.034 s (one frame at 30 fps);
- `renders/.blur` is empty (the 120 fps intermediate was deleted);
- PSNR `average:` ≥ 40 (or `inf`) on the static opening frames, so still content stays sharp;
- `blur-compare.png` (open it with Read) shows the mid-morph frame sharper on the left and motion-smeared on the right.
The example project has no audio track, so audio passthrough (`-c:a copy`) is not exercised here; say so in the commit body. It is checked on the first real video (roadmap entry in Task 7).

- [ ] **Step 7: Commit**

```bash
git add scripts/render-blur.mjs scripts/render-blur.test.mjs package.json .github/workflows/ci.yml internal/docs/operations/runbook.md internal/docs/architecture/stack.md
git commit -q -F - <<'EOF'
feat: add optional motion-blur render pass

render:blur renders at 4x fps and blends each 4 subframes with ffmpeg
tmix, copying audio. Verified on the example project: duration matches,
static frames stay sharp, intermediate is deleted. Audio passthrough is
not exercised because the example has no audio track.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Planning and authoring references

**Files:**
- Create: `docs/agents/references/motion-broll-planning.md`
- Create: `docs/agents/references/motion-broll-authoring.md`

**Interfaces:**
- Produces section names cited by Task 7: planning — `## When To Use It`, `## Treatment`, `## Density`, `## Content Rules`, `## Vocabulary`, `## Motion B-roll Brief`; authoring — `## Host Setup`, `## Clip Skeleton`, `## Engine API`, `## Patterns`, `## Treatments In Code`, `## Still Check`, `## Gotchas`.

- [ ] **Step 1: Write the planning reference**

Create `docs/agents/references/motion-broll-planning.md`:

````markdown
# Motion B-roll Planning (Reference)

When and how to plan motion b-roll in `visual-plan.md`. Loaded by
`docs/agents/02-screen-plan.md` in the visual step. Adapted from
Barty-Bart/motion-graphics `skills/motion-broll` (MIT). Build-side rules live in
`motion-broll-authoring.md`; worked examples live in `motion-broll-examples/`.

## What It Is

Every clip is one shape that never cuts. It morphs its size, corners, and colour
from state to state while its content swaps with a short blur. A cursor drives
the changes with real clicks and drags, and every change lands on a spoken word.

## When To Use It

Motion b-roll is the first choice for a line that explains, shows, compares, or
sequences something the viewer should see: a process, a tool, a real number, a
step, a chapter change, or a story moment with a concrete object.

Use something else when:

- the line needs real proof (the actual tool UI or the actual result): use a
  capture; the capture may sit inside one state of the shape;
- the moment is mood, texture, or background: use a generated still;
- the line is personal, emotional, or an opinion: keep Dena's face, no visual.

## Treatment

Decide per clip and write the reason in the brief.

| Treatment | What the viewer sees | Use when |
| --- | --- | --- |
| Cutaway | The shape on `#050505`, full frame; Dena's face is hidden | The idea must be seen in detail: a product, a process, a comparison, a real number, a chapter change. Lasts as long as the idea, 3–10 s. |
| Split | The shape in the top half; Dena's face slides into the bottom half | The visual needs room, but the face should stay on screen. |
| Panel | A transparent shape in empty space (below the hook card, above the head); the face stays full | A short label or status, or a long sequence that can run past 10 s as one continuous morph. |

Rules:

- No cutaway or split that covers Dena's face in `00:00.00–00:03.00` unless
  `## User Approvals` in `creative-brief.md` allows it (Gate 2 R4).
- Leave at least 2 s of face between two cutaways.
- A cutaway longer than 10 s trips Gate 2 R3.
- Never cut away on a personal, emotional, or opinion line.

## Density

| `visual_density` | Clips per minute |
| --- | --- |
| `light` | 2–4, only the strongest moments |
| `medium` (default) | 4–7 |
| `heavy` | most lines, with at least 2 s of face between clips |

## Content Rules

- One idea per clip. A long panel may hold several states of that idea.
- Put each state change on its word, 0.4–1.2 s apart. Prefer the first or last
  word of a caption beat; word times come from `processed-transcript.json`.
- Labels come from the transcript, in the language Dena spoke.
- Never invent numbers, prices, results, names, or quotes (Gate 2 R1). Use
  relative bars, skeleton lines, or transcript labels, and mark what is
  illustrative.
- One accent (`#facc15`) per clip; green `#22c55e` only for a success state.
- SFX: cursor click → `click-soft`; morph → soft `whoosh-short`; both under
  speech.
- Banned: bouncy easing, particles, glows, gradients on UI, mixed icon strokes,
  dead time, anything that looks like a template, made-up data.

## Vocabulary

| Pattern | Use for | Shape behaviour |
| --- | --- | --- |
| Pill + click | One action ("kirim", "klik", "mulai") | Pill with icon and label; the cursor clicks on the word and the shape presses |
| Progress | Something running or loading | A bar or lanes fill from the start word to the result word |
| Check / toast | A result or confirmation | The shape morphs into a green pill with a check |
| Status island | A live state that changes several times | A compact pill whose label and icon swap on each word |
| Card + drag | Moving an item into place (hand-off, upload) | The card follows the cursor while held and drops on a target |
| Slider | A level, intensity, or trade-off | The cursor drags a knob; the value drives the content |
| Toggle | On/off, manual/otomatis | A switch flips on the word and the content swaps |
| Tabs | Switching between options | A liquid indicator slides between tabs (leading edge fast, trailing edge slow) |
| Chart + tooltip | A relative comparison or trend | Bars grow on words and a tooltip appears on the key word; no invented values |
| Search / filter | Finding one thing among many | A typed query filters a list down to one row |
| Drag-drop file | A file going into a tool | A file chip is dragged onto a drop target |
| Terminal typing | A command or prompt | Mono text is typed character by character with a caret |
| Side-by-side | Two options compared | Two columns; a highlight moves to the winner |
| Chapter card | A new section of the story | A short title card between sections |
| Chat thread | A conversation or client messages | Generic bubbles (no brand), lines from the transcript, one per word beat |
| Timeline langkah | A journey or a sequence of steps | Step nodes; a liquid indicator moves to each step on its word |
| Before → after | A change from one state to another | One shape morphs from "sebelum" to "sesudah" with transcript labels |
| Notif / kalender / jam | Time pressure, interruptions, schedules | Stacked notifications, a calendar, or a clock; times only from the transcript |

## Motion B-roll Brief

Use this instead of the generic Asset Brief for a `motion-broll` row in
`visual-plan.md`:

```md
### <ov-NNN>

- Type: motion-broll
- Purpose:
- Privacy notes:
- Planned file: `compositions/broll/NN-name.html`
- Treatment: <cutaway | split | panel> — <reason>
- Pattern: <vocabulary pattern(s)>
- In–out (host time): <start>–<end> s
- States on words:
  - "<word>" @ <host time> → <state>: <what the shape shows>
- Layers: <content per state; labels verbatim from the transcript>
- Cursor: <clicks and drags on words, or none>
- Illustrative: <what is not real data>
- SFX: <cue @ host time>
- Key-word times for the still check: <host times>
```
````

- [ ] **Step 2: Write the authoring reference**

Create `docs/agents/references/motion-broll-authoring.md`:

````markdown
# Motion B-roll Authoring (Reference)

How to turn a Motion B-roll Brief into a HyperFrames clip. Loaded by
`docs/agents/03-build.md` in the author step. Engine: `vendor/motion-kit/`
(adapted from Barty-Bart/motion-graphics, MIT). Worked examples:
`docs/agents/references/motion-broll-examples/` (`npm run check:broll-examples`).

## Host Setup

Once per video, in `index.html` `<head>`, after `vendor/gsap.min.js`:

```html
<script src="vendor/motion-kit/motion-kit.js"></script>
<link rel="stylesheet" href="vendor/motion-kit/motion-kit.css" />
```

and in the host `<style>`:

```css
.broll { position: absolute; inset: 0; z-index: 22; }
```

Mount each clip on track 4. The host `data-composition-id` must equal the id
inside the clip file and the `M.clip` id:

```html
<div class="broll" data-composition-id="broll-03-crm-check"
     data-composition-src="compositions/broll/03-crm-check.html"
     data-start="12.40" data-duration="6" data-track-index="4"
     data-width="1080" data-height="1920"></div>
```

`data-start` is the brief's in-time; `data-duration` is the clip's `T` (or longer:
the clip then holds its last state).

## Clip Skeleton

Everything lives inside `<template>`; the root is styled by `#root`, never by a
class. Ids inside a clip only need to be unique within that clip.

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        /* clip-only classes: descendants only */
      </style>
      <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="T">
        <div class="mk-stage">
          <!-- optional backdrop outside the world, e.g. the split top half -->
          <div class="mk-world">
            <!-- optional world elements beside the shape (drop targets, ghosts) -->
            <div class="mk-shape">
              <div class="mk-layer" id="Lfirst"> … </div>
              <div class="mk-layer" id="Lsecond"> … </div>
            </div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'broll-NN-name';
          const $ = M.finder(ID);
          M.clip(ID, { W: 1080, H: 1920, T: 6, bg: '#050505', SH: { … }, start: '…', SEQ: [ … ], layers: [ … ] });
        })();
      </script>
    </template>
  </body>
</html>
```

All times in the clip are clip-local: brief host time − `data-start`.

Coordinates are world pixels. The shape is centred at world (0,0) unless `geom`
moves it. The camera maps world → screen as `center + cam × (world − focus)`.
Choose `cam` per state so the state fills the frame without touching the edges
(1080 px wide): roughly 1.1–1.3 for cards, 1.5–1.9 for pills. Layer content is
positioned from its anchor: in an `anchor: 't'` layer, `left:-300px; top:40px`
is 300 px left of centre and 40 px below the shape's top edge.

## Engine API

| Call | What it does |
| --- | --- |
| `M.clip(id, cfg)` | Builds the clip inside `[data-composition-id="id"] .mk-stage`, registers the paused timeline, returns `seek(t)`. Call it synchronously. |
| `M.finder(id)` | `(elId) => element` scoped to the clip. Use it instead of `document.getElementById`. |
| `M.track(v0, [[t, value, spring?], …])` | A value that changes target many times: one closed-form spring per change. Returns `t => value`. |
| `M.ctrack('#hex', [[t, '#hex'], …])` | The same for colours. Returns `t => 'rgb(...)'`. |
| `M.MORPH`, `M.FAST`, `M.SLOW`, `M.SOFT`, `M.CAM`, `M.INSTANT` | Spring presets `[stiffness, damping]`. |
| `M.vis(t, tin, tout, {din, lin, lout})` | Content swap timing: exit blurs out fast; enter waits `din`, then blurs in over `lin`. |
| `M.apply(el, v)` | Applies a `vis` result (opacity, blur, scale). |
| `M.path([[t, x, y], …])` | Cursor or point path with a slight human arc. |
| `M.crossTimes(f, t0, t1, thresholds)` | When a rising value first crosses each threshold. |
| `M.icon(name, size, colour, strokeW?)` | Icon from `M.IC` with a normalised stroke. Names: arrow, check, x, plus, folder, terminal, file, pencil, coin, clock, chip, sparkle, castle, search, message, calendar, bell, users. |
| `M.setText(el, s)`, `M.eo`, `M.eio`, `M.clamp`, `M.lerp`, `M.S` | Helpers. |

`cfg` keys:

| Key | Meaning |
| --- | --- |
| `W`, `H` | `1080`, `1920` |
| `T` | Clip length in seconds (> 0) |
| `bg` | `'#050505'` for cutaway; `null` (transparent) for split and panel |
| `center` | Screen point the camera centres on; default `[540, 960]` |
| `intro` | Time the shape pops in; `null` = already on screen |
| `SH` | States: `{ name: { w, h, r, bg, cam } }` |
| `start`, `SEQ` | First state and `[[t, 'state'], …]` changes, each on its word |
| `layers` | `[{ el, tin, tout, anchor: 'c' \| 't' \| 'l', o, update(t, g, v) }]` |
| `cursor` | `{ size, clicks: [t], drags: [[t0, t1]], keys: [[t, x, y], …] }` or omit |
| `shapePress` | Times the shape itself presses |
| `geom(t, g)`, `extra(t, g)` | Per-frame geometry change (drag, focus) and extra work |

## Patterns

| Pattern | How | Example |
| --- | --- | --- |
| Pill → card → result | `SH` states + one layer per state with `tin/tout` | `motion-broll-examples/compositions/ex-01-invoice.html` |
| Rows or bars appearing on words | Per-row `M.vis(t, wordTime, …)` + width from `M.eio` or a spring | ex-01 skeleton lines, ex-02 bubbles |
| Liquid indicator | Two `M.track`s for the left and right edges: the edge moving forward uses `M.FAST`, the trailing edge `M.SLOW` | ex-02 highlight, ex-03 step indicator |
| Colour change on a word | `M.ctrack` per element | ex-03 dots and labels |
| Split backdrop | `.mk-a` of `1080×960` `#050505` inside `.mk-stage`, before `.mk-world`; `bg: null`; `center: [540, 480]` | ex-02 |
| Transparent panel | `bg: null`, `center` in the empty zone, dark panel with a thin border | ex-03 |
| Typing | `text.slice(0, n)` with `n` from time, plus a caret | upstream `examples/opus-aoe2/02-pip-builds.html` |
| Slider / direct manipulation | While the cursor is held, the value comes from its position; on release it springs back | upstream `examples/opus-aoe2/03-effort-slider.html` |
| Drag and drop | `geom` sets `g.cx/g.cy` from the cursor while held; a world drop target; `g.fx` moves the camera focus | upstream `examples/opus-aoe2/04-master-prompt.html` |

Upstream examples: `https://github.com/Barty-Bart/motion-graphics/tree/e8d610adcf946367430c8b43a97aad8059befaad/skills/motion-broll/examples/opus-aoe2`
(16:9 and light palette; port the mechanism, not the look, and replace
`document.getElementById` with `M.finder`).

## Treatments In Code

- Cutaway: `bg: '#050505'`; default `center`.
- Split: clip `bg: null`, the split backdrop, `center: [540, 480]`, every state
  and cursor key kept inside the top half (screen y < 960). In the host timeline,
  slide the base video down for the clip window, with the offset chosen from a
  frame grab so the face stays in the bottom half:
  ```js
  tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, CLIP_START);
  tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, CLIP_END - 0.45);
  ```
- Panel: `bg: null`, `center` in the empty zone (for example `[540, 470]`, below
  the hook card and above the head), shape `#111111` with
  `border: 1px solid rgba(255,255,255,.12); box-sizing: border-box` on `.mk-shape`.

## Still Check

After writing a clip and mounting it, snapshot it at the brief's key-word times
(host time), including each settled state and a couple of mid-morph moments:

```bash
env -u GEMINI_API_KEY npx --yes hyperframes@0.7.24 snapshot --at 12.9,13.6,14.8 -o renders/snapshots/<slug> .
```

`env -u GEMINI_API_KEY` keeps frames on this machine: with the key set, snapshot
sends frames to Gemini for `--describe`. Open the contact sheet and every frame
that looks off. Fix anything cramped, clipped, unreadable, off-word, or with the
cursor outside the frame, then check once more.

## Gotchas

- Never put `will-change` on anything the camera scales; text renders blurry.
- Text swapping inside a morphing container needs its own enter and exit timing
  (`M.vis` `din`/`lin`/`lout`), or old and new text overlap.
- `mix-blend-mode: difference` labels (`mk-blend`) must sit in a layer that has
  the blend mode itself; a filtered parent isolates them.
- Items that slide under a highlight need `M.FAST`, or the highlight row sits
  empty for a moment.
- Keep the cursor inside the frame at every camera zoom, including during
  morphs.
- A clip ends by holding its last state; a longer host `data-duration` holds it.
- Do not use `document.getElementById`, `requestAnimationFrame`, timers,
  `Date.now()`, `performance.now()`, or `Math.random()` in a clip.
````

- [ ] **Step 2b: Check the references against the engine**

Run: `for n in arrow check x plus folder terminal file pencil coin clock chip sparkle castle search message calendar bell users; do grep -q "^ $n:\|, $n:\|^ *$n:" vendor/motion-kit/motion-kit.js || echo "missing icon $n"; done; grep -c '^| ' docs/agents/references/motion-broll-planning.md`
Expected: no `missing icon` lines; a table-row count ≥ 30.

- [ ] **Step 3: Commit**

```bash
git add docs/agents/references/motion-broll-planning.md docs/agents/references/motion-broll-authoring.md
git commit -q -F - <<'EOF'
docs: add motion b-roll planning and authoring references

Planning covers when to use it, treatments, density, content rules, the
18-pattern vocabulary, and the Motion B-roll Brief; authoring covers host
setup, the clip skeleton, the M API, patterns, and the still check.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Wire motion b-roll into the workflow docs

**Files:**
- Modify: `docs/agents/02-screen-plan.md`, `docs/agents/03-build.md`
- Modify: `docs/agents/references/visual-planning.md`, `docs/agents/references/qa-checklist.md`
- Modify: `docs/skills/dena-video-editing-workflow/references/quality-gates.md`, `docs/dena-social-video-style-guide.md`
- Modify: `AGENTS.md`, `CLAUDE.md`
- Modify: `internal/docs/operations/video-editing-workflow.md`, `internal/docs/operations/roadmap.md`

**Interfaces:**
- Consumes: reference section names from Task 6.

- [ ] **Step 1: Screen Plan**

In `docs/agents/02-screen-plan.md`:
- Replace `4. **Map and decide.** Read \`docs/agents/references/visual-planning.md\` (Asset` with `4. **Map and decide.** Read \`docs/agents/references/motion-broll-planning.md\` first (motion b-roll is the default visual), then \`docs/agents/references/visual-planning.md\` (Asset`.
- Replace `| R3 | A visual that covers Dena's face completely for more than 6 seconds, or covers a personal, emotional, or opinion line |` with `| R3 | A visual that covers Dena's face completely for more than 10 seconds, or covers a personal, emotional, or opinion line |`.

- [ ] **Step 2: Build**

In `docs/agents/03-build.md`, replace:

```
5. **Verify.** Run `npm run check` and fix every error; review warnings. Preview
```

with:

```
4a. **Author motion b-roll.** For each `motion-broll` row, follow
   `docs/agents/references/motion-broll-authoring.md`: write the clip at its
   Planned file, mount it in `index.html` on track 4, add the split transform
   when the treatment is split, then run the Still Check at the brief's key-word
   times and fix what it shows before step 5.
5. **Verify.** Run `npm run check` and fix every error; review warnings. Preview
```

and replace `7. **Render.** \`npm run render -- --output renders/<slug>.mp4\`, then the export sanity check from the Render` with `7. **Render.** \`npm run render -- --output renders/<slug>.mp4\` (or, for a final render with motion blur, \`npm run render:blur -- --slug <slug>\`, which writes \`renders/<slug>-blur.mp4\`), then the export sanity check from the Render`.

- [ ] **Step 3: Visual planning and QA references**

In `docs/agents/references/visual-planning.md`, replace:

```
1. Existing real source footage, user-supplied media, or real web/app capture.
2. Cropped/censored proof asset or focused screenshot/screen recording.
3. Simple diagram or text-support visual.
4. Generated still or designed bitmap support asset.
5. Generated video.
```

with:

```
1. Motion b-roll (`motion-broll-planning.md`) for a line that explains, shows, compares, or sequences something.
2. Existing real source footage, user-supplied media, or real web/app capture when the moment needs proof (it may sit inside a motion b-roll state).
3. Cropped/censored proof asset or focused screenshot/screen recording.
4. Generated still or designed bitmap support asset for mood, texture, or background.
5. Generated video.

A personal, emotional, or opinion line gets no visual.
```

Replace `| \`decision\` | \`generate\`, \`use-real\`, \`use-diagram\`, \`skip\` |` with `| \`decision\` | \`motion-broll\`, \`generate\`, \`use-real\`, \`use-diagram\`, \`skip\` |`.

Replace:

```
the visual shows. `Illustrative` is `yes` when the visual is generated, mocked, or
otherwise not real proof.
```

with:

```
the visual shows. `Illustrative` is `yes` when the visual is generated, mocked, or
otherwise not real proof. For a `motion-broll` row, use the Motion B-roll Brief
from `motion-broll-planning.md` instead of the generic brief below.
```

In `docs/agents/references/qa-checklist.md`, insert before the line `## Definition Of Done`:

```markdown
## Motion B-roll Review

- For every clip in `compositions/broll/`, each state change lands on its word (±0.2 s against `processed-transcript.json`).
- The cursor stays inside the frame at every zoom, including mid-morph.
- Text is readable at phone size in every settled state.
- Treatment rules hold: no face cover in 0–3 s without approval, 2 s of face between cutaways, cutaways ≤ 10 s.
- One accent colour; no invented numbers; illustrative parts match the brief.

```

Run: `wc -l docs/agents/references/qa-checklist.md`
Expected: ≤ 600.

- [ ] **Step 4: Quality gates and style guide**

In `docs/skills/dena-video-editing-workflow/references/quality-gates.md`:
- Replace `- a mood, background, reset-attention, texture, transition, or abstract workflow moment uses only a stiff card/SVG and does not explain why image generation was skipped` with `- a moment that explains, shows, compares, or sequences uses a stiff card/SVG instead of motion b-roll, or a mood, background, or texture moment skips image generation without a reason`.
- Replace `- avoid motion/SFX that feels generic, chaotic, or detached from the transcript` with:

```
- avoid motion/SFX that feels generic, chaotic, or detached from the transcript
- land motion b-roll state changes on their words and keep the cursor inside the frame
```

In `docs/dena-social-video-style-guide.md`:
- Replace `Good overlays:\n\n- Screenshot of tool/app when mentioning a tool.` with `Good overlays:\n\n- Motion b-roll: one morphing shape + cursor that shows the process, tool, comparison, or step Dena is talking about (\`docs/agents/references/motion-broll-planning.md\`).\n- Screenshot of tool/app when mentioning a tool.`
- Replace `- Clean black/white/yellow caption system.\n- Occasional glass/black cards.` with `- Clean black/white/yellow caption system.\n- Motion b-roll in the same palette: \`#050505\`, white, one yellow accent.\n- Occasional glass/black cards.`

- [ ] **Step 5: Entry doors**

In both `AGENTS.md` and `CLAUDE.md`, replace:

```
- The Screen Plan phase must write a `Visual Decision Log` in `visual-plan.md` for every visual-support opportunity; use Codex/image generation for grounded bitmap support assets when a mood, abstract workflow, reset-attention, texture, transition, or background moment would otherwise become a stiff card/SVG.
```

with:

```
- The Screen Plan phase must write a `Visual Decision Log` in `visual-plan.md` for every visual-support opportunity. Motion b-roll (`docs/agents/references/motion-broll-planning.md`) is the default for a line that explains, shows, compares, or sequences; use a real capture when the moment needs proof, and Codex/image generation for grounded bitmap assets only for mood, texture, or background moments that motion b-roll cannot carry.
```

In both files, replace:

```
npm run test:repliz  # unit test R2/Repliz CLI without real network
```

with:

```
npm run test:repliz  # unit test R2/Repliz CLI without real network
npm run test:motion-kit        # unit test motion b-roll engine
npm run test:render-blur       # unit test motion-blur pass
npm run check:broll-examples   # lint + validate + snapshot motion b-roll examples
npm run render:blur -- --slug <slug>  # optional final render with motion blur (4x slower)
```

Run: `diff <(sed -n '/^## Dena Workflow Discipline/,/^Docs-only edits/p' AGENTS.md) <(sed -n '/^## Dena Workflow Discipline/,/^Docs-only edits/p' CLAUDE.md) && echo same`
Expected: `same`.

- [ ] **Step 6: Operations workflow and roadmap**

In `internal/docs/operations/video-editing-workflow.md`:
- Replace `prioritas aset real capture > screenshot\nbukti > diagram > generated still > generated video;` with `prioritas motion b-roll > capture bukti\n> generated still > generated video (lihat \`motion-broll-planning.md\`);`
- Replace `wajah tertutup >6s atau saat kalimat` with `wajah tertutup >10s atau saat kalimat`.
- Replace `\`caption-artifacts.md\`, \`visual-planning.md\`, \`motion-grammar.md\`.` with `\`caption-artifacts.md\`, \`visual-planning.md\`, \`motion-grammar.md\`,\n\`motion-broll-planning.md\`.`
- Replace `→ baca skill \`/hyperframes\` + \`/hyperframes-core\` → rakit` with `→ baca skill \`/hyperframes\` + \`/hyperframes-core\` → tulis clip motion b-roll\n(\`compositions/broll/*.html\`) dan cek snapshot-nya di kata kunci → rakit`.
- Replace `\`assembly-checklist.md\`, render. **Gate 3**` with `\`assembly-checklist.md\`, render (opsional \`npm run render:blur\`). **Gate 3**`.
- Replace `Referensi: \`asset-production.md\`, \`hyperframes-assembly.md\`.` with `Referensi: \`asset-production.md\`, \`hyperframes-assembly.md\`,\n\`motion-broll-authoring.md\`.`

In `internal/docs/operations/roadmap.md`, replace `dan revisi lewat ADR baru bila perlu.\n` (end of the "Validasi workflow 4 fase" subsection) with:

```
dan revisi lewat ADR baru bila perlu.

### Validasi motion b-roll
Video asli pertama yang memakai motion b-roll
([ADR-0009](../adr/0009-motion-broll-motion-kit.md)) menguji engine, treatment
split pada footage nyata, dan pass `render:blur` termasuk audio passthrough
(belum teruji karena proyek contoh tanpa audio). Catat temuannya; revisi lewat
ADR baru bila perlu.
```

- [ ] **Step 7: Check for stale values**

Run: `grep -rn -E "more than 6 seconds|>6s|6 detik" docs/agents docs/skills internal/docs/operations AGENTS.md CLAUDE.md docs/dena-social-video-style-guide.md; echo "exit=$?"`
Expected: no matches, `exit=1`.

- [ ] **Step 8: Commit**

```bash
git add docs/agents/02-screen-plan.md docs/agents/03-build.md docs/agents/references/visual-planning.md docs/agents/references/qa-checklist.md docs/skills/dena-video-editing-workflow/references/quality-gates.md docs/dena-social-video-style-guide.md AGENTS.md CLAUDE.md internal/docs/operations/video-editing-workflow.md internal/docs/operations/roadmap.md
git commit -q -F - <<'EOF'
docs: make motion b-roll the default visual in Screen Plan and Build

Screen Plan reads the planning reference first, R3 rises to 10 s, Build
gains an author + still-check step and the optional blur render, QA and
gates check motion b-roll, and the imagegen non-negotiable now puts motion
b-roll first.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Final verification and reviews

**Files:** fixes only, where a finding points.

- [ ] **Step 1: Run every automated check**

```bash
npm run test:repliz 2>&1 | grep -E '^ℹ (pass|fail)'
npm run test:motion-kit 2>&1 | grep -E '^ℹ (pass|fail)'
npm run test:render-blur 2>&1 | grep -E '^ℹ (pass|fail)'
npm run check:broll-examples 2>&1 | grep -v 'Unknown user config' | tail -3
python3 .codex/hooks/ensure-learning-docs.py --self-test
git status --short
```
Expected: `fail 0` three times; the example check ends with the contact-sheet path; hook self-test passes; clean tree.

- [ ] **Step 2: Engine port review (fresh subagent)**

Agent tool, `subagent_type: general-purpose`, prompt:

```text
Do not edit files. In /Users/denameidina/Documents/videos, compare
vendor/motion-kit/motion-kit.js with the upstream engine at
https://raw.githubusercontent.com/Barty-Bart/motion-graphics/e8d610adcf946367430c8b43a97aad8059befaad/skills/motion-broll/engine/motion.js
Expected differences (not findings): elements are found inside the clip's .mk-stage
(M.stageOf, M.finder); M.scene is replaced by M.build + M.clip (paused GSAP timeline,
proxy tween, onUpdate -> seek); no preview loop, location, performance.now or html.alpha
class; a transparent clip sets shape.style.boxShadow='none'; icons message, calendar,
bell, users added; M.CURSOR_SVG added; errors for unknown states and missing layers.
Report every other behavioural difference with line numbers, and anything in the port
that breaks determinism (same t -> same styles). Say "none" if there are none.
```

- [ ] **Step 3: Docs walkthrough (fresh subagent)**

Agent tool, `subagent_type: general-purpose`, prompt:

```text
Do not edit files. In /Users/denameidina/Documents/videos, read only:
docs/agents/02-screen-plan.md, docs/agents/03-build.md,
docs/agents/references/motion-broll-planning.md,
docs/agents/references/motion-broll-authoring.md,
docs/agents/references/visual-planning.md (Visual Plan Template),
docs/agents/references/motion-broll-examples/ (all files), vendor/motion-kit/motion-kit.js.
Job: Dena says "Dulu gue balas chat klien satu-satu, sekarang udah otomatis" at host
12.0-18.0 s in a 9:16 video. Plan it as a motion b-roll row (write the Motion B-roll
Brief), then write, on paper, the clip file and the host mount it needs.
Report, with file:line: (1) any information the docs require that you could not find;
(2) any contradiction between these files; (3) any API, class, or path the docs name
that does not exist in the engine or examples. Say "none" for an empty category.
```

- [ ] **Step 4: Fix findings**

Fix each reported item in the file it names. Engine behaviour changes need a new or updated test in `scripts/motion-kit.test.mjs` first (red → green). Re-run Step 1. Do not run the walkthroughs a second time without asking the user.

- [ ] **Step 5: Commit fixes (skip if none)**

```bash
git add -A vendor/motion-kit scripts docs/agents docs/skills internal/docs AGENTS.md CLAUDE.md docs/dena-social-video-style-guide.md
git commit -q -F - <<'EOF'
fix: resolve motion b-roll review findings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 6: Report**

Report to the user: commits on `feat/motion-broll`, test counts, the example contact sheet path (`renders/broll-examples/contact-sheet.jpg`), the blur comparison (`renders/.examples-project/blur-compare.png`), review findings and fixes, that audio passthrough is untested until a real video, and that the branch is not merged or pushed.
