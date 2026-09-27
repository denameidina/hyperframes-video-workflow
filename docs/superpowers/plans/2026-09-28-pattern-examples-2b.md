# Pattern Examples 2b (Style Enrichment, Sub-project 2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six new patterns each for whiteboard and stop-motion (20 each), twelve new examples so every pattern of both styles has a rendered example, one helper (`SK.sagPath`), and one library cut-out (`paper.scissors`), enforced by the coverage test.

**Architecture:** Built on the per-style example hosts (ADR-0017): new compositions go in `docs/agents/references/style-examples/<style>/compositions/`, one line each is appended to that style's `examples.json`, and `npm run style-examples -- build` regenerates the host. Appending keeps every old clip's start time, so the old stills must stay byte-identical.

**Tech Stack:** HyperFrames 0.7.24 (pinned `npx`), GSAP + motion-kit + style-kit + asset-lib (vendored), Node 22+ built-ins, Codex image generation (`codex-image`, one job), `ffmpeg`.

**Spec:** `docs/superpowers/specs/2026-09-28-pattern-examples-2b-design.md`

**Evidence:** Every block below was written and run in a scratch copy of the repo on 2026-09-28 (`scratchpad/dev3/repo`): `SK.sagPath` test first; the Codex scissors passed review on the first try; both hosts lint and validate with 0 errors; all 12 new examples were rendered and looked at, and fixed where the stills showed a problem (the traps are listed in each task); the 19 old whiteboard and stop-motion stills are **byte-identical** to a render from `main`; `test:style-kit` 101/101 and `test:asset-lib` 29/29. The plan was then replayed op by op in a clean clone of `feat/examples-2b` (host renders skipped, sheets rendered): every replacement matched exactly once, every commit left a clean tree, and the final files equal the tested copy.

## Global Constraints

- No npm dependencies (ADR-0007); HyperFrames is always `npx --yes hyperframes@0.7.24`.
- Never edit a host's generated `index.html` or `snapshots.json`; append to `examples.json` and run `npm run style-examples -- build`.
- Old examples stay pixel-identical (identical, or ≤ 1 per channel on ≤ 0.001% of values); never touch old compositions.
- Clip rules: never set `visibility`; never name a `font-family` in a clip `<style>`; never write `../` in a url; never build a selector from a template literal; no `!important`. Stop-motion moves on twos (`SK.STOP_FPS` = 15).
- Example words and numbers are made up and marked "Example only"; no real brands or logos; generated art has no text or logos.
- Codex: one job at a time, run in the background; check the file before using it.
- Stage files with explicit paths only, never `git add -A`.
- Docs language: `docs/agents/**` English; `internal/docs/**` Indonesian. No new ADR or EARS (ADR-0017 and RD-03-56 cover this); no internal docs update needed.
- Replacement steps give exact **old** and **new** blocks; each old block must match exactly once — if not, stop and re-read the file. "Append" means add the block at the end of the file.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- The `rtk` hook rewrites `grep` with parentheses or `cat` of JSON; use `rtk proxy grep -F …` or `rtk proxy cat …`. `npm run` and `node` are unaffected.
- Do not push. Merge to local `main` only after Dena approves.

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `vendor/style-kit/style-kit.js`, `scripts/style-kit.test.mjs` | Modify | `SK.sagPath` |
| `vendor/asset-lib/paper/scissors.png`, `vendor/asset-lib/src/items.json` | Create/Modify | `paper.scissors` |
| `vendor/asset-lib/*` (build outputs), `docs/agents/references/asset-catalog/**` (paper-2 sheet) | Generated | Library build and sheets |
| `docs/agents/references/style-examples/whiteboard/**` | Create/Modify | wb-06 … wb-11, manifest, generated host |
| `docs/agents/references/style-examples/stop-motion/**` | Create/Modify | sm-05 … sm-10, manifest, generated host |
| `docs/agents/references/styles/whiteboard.md`, `stop-motion.md` | Modify | 12 pattern rows, recipes, SFX, examples, Kit |
| `scripts/style-docs.test.mjs` | Modify | `COVERED` += whiteboard, stop-motion |

---

### Task 0: Preflight and pixel baseline

**Files:** none (checks only)

- [ ] **Step 1: Confirm the branch and a clean tree**

Run:

```bash
git branch --show-current && git status --short
```

Expected: `feat/examples-2b` and no status output.

- [ ] **Step 2: Render the whiteboard and stop-motion hosts before anything changes**

Run:

```bash
mkdir -p /tmp/examples-2b && npm run -s check:style-examples -- whiteboard && npm run -s check:style-examples -- stop-motion && rm -rf /tmp/examples-2b/baseline && mkdir -p /tmp/examples-2b/baseline && cp -R renders/style-examples/whiteboard renders/style-examples/stop-motion /tmp/examples-2b/baseline/ && ls /tmp/examples-2b/baseline/*/frame-*.png | wc -l
```

Expected: both hosts `0 errors`, then `19` (11 whiteboard + 8 stop-motion stills). Task 5 compares against `/tmp/examples-2b/baseline`.

---

### Task 1: `SK.sagPath`

**Files:**
- Modify: `scripts/style-kit.test.mjs`, `vendor/style-kit/style-kit.js`

**Interfaces:**
- Produces: `SK.sagPath(p0, p1, sag = 0.12)` → `M… Q… …` (one decimal). The middle of the curve hangs `sag × distance` straight down the screen whatever the direction (the control point drops twice that); `sag = 0` is a straight line.

- [ ] **Step 1: Write the failing test**

Append to `scripts/style-kit.test.mjs`:

```js
test('sagPath hangs below the chord in either direction and is straight at sag 0', () => {
  const { SK } = load();
  const q = (d) => d.match(/Q(-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
  assert.equal(SK.sagPath({ x: 0, y: 0 }, { x: 100, y: 0 }), 'M0.0 0.0 Q50.0 24.0 100.0 0.0');
  assert.deepEqual(q(SK.sagPath({ x: 100, y: 0 }, { x: 0, y: 0 })), [50, 24], 'right to left still hangs down');
  assert.deepEqual(q(SK.sagPath({ x: 0, y: 0 }, { x: 0, y: 100 }, 0.1)), [0, 70], 'a vertical string bows downward too');
  assert.equal(SK.sagPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0), 'M0.0 0.0 Q50.0 0.0 100.0 0.0');
  assert.equal(SK.sagPath({ x: 3, y: 4 }, { x: 90, y: 20 }), SK.sagPath({ x: 3, y: 4 }, { x: 90, y: 20 }));
});
```

Run:

```bash
node --test scripts/style-kit.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 1` (`SK.sagPath is not a function`).

- [ ] **Step 2: Implement it after `SK.arcPath`**

In `vendor/style-kit/style-kit.js` replace:

old:
```js
};
})();
```

new:
```js
};
/* sagPath: a hanging string from p0 to p1; the curve's middle hangs sag × distance straight down the
   screen (y grows) whatever the direction, so the control point drops twice that. sag 0 is straight. */
SK.sagPath = (p0,p1,sag=0.12)=>{
  const cx=(p0.x+p1.x)/2, cy=(p0.y+p1.y)/2+Math.hypot(p1.x-p0.x,p1.y-p0.y)*sag*2;
  return `M${f2(p0.x)} ${f2(p0.y)} Q${f2(cx)} ${f2(cy)} ${f2(p1.x)} ${f2(p1.y)}`;
};
})();
```

- [ ] **Step 3: Run the tests**

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `pass 99`, `fail 0`.

- [ ] **Step 4: Commit**

Run:

```bash
git add scripts/style-kit.test.mjs vendor/style-kit/style-kit.js && git status --short && git commit -q -F - <<'MSG'
feat: SK.sagPath for hanging strings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 2: `paper.scissors` in the asset library

**Files:**
- Create: `vendor/asset-lib/paper/scissors.png` (Codex, reviewed, processed)
- Modify: `vendor/asset-lib/src/items.json`
- Generated: `vendor/asset-lib/{asset-lib.js,asset-lib.css,catalog.json,LICENSES.md,CATALOG.md}`, `docs/agents/references/asset-catalog/compositions/paper-2.html`, `docs/agents/references/asset-catalog/sheets/paper-2.webp`

**Interfaces:**
- Produces: catalog id `paper.scissors` (styles stop-motion, mix-media; tags benda, kerja) and the class `.sk-obj-scissors` (720 × 496, blades pointing right).

- [ ] **Step 1: Generate the scissors (skip if the reviewed file exists)**

The planning run generated and reviewed this file: `/tmp/examples-2b/staging/scissors.png`, SHA-256 `d6ebc1b2b2fa11cd204058c7d860f9684d030751f07e95386074e4707399620b` (1254 × 1254 RGBA). If `shasum -a 256` shows that hash, use it and skip to Step 2. Otherwise run one Codex job in the background (never two at once):

Run:

```bash
mkdir -p /tmp/examples-2b/staging && ~/.claude/skills/codex-image/scripts/codex-image.sh --out /tmp/examples-2b/staging/scissors.png --size 1024x1024 --transparent --timeout 400 <<'SPEC'
Use case: illustration-story
Asset type: paper cut-out object for a stop-motion and collage b-roll clip
Primary request: a pair of open scissors seen from above, blades apart at about 35 degrees, with orange plastic handles and silver blades, made as a flat paper cutout
Style/medium: flat paper cutout, visible paper fibre, construction-paper colours, thin white paper border around the whole silhouette, soft paper shadow inside the cut edges
Composition/framing: whole object centered, pointing right, about 80% of the canvas
Constraints: plain transparent background; no text, no letters, no logos, no UI
Avoid: glossy 3D render, photorealism, checkerboard, fake transparency grid
SPEC
```

Expected: `OK /tmp/examples-2b/staging/scissors.png`. Composite it on kraft (`ffmpeg -f lavfi -i color=c=0xc4965a:s=1254x1254 -i scissors.png -filter_complex overlay,scale=800:800 -frames:v 1 check.png`) and look: whole scissors, paper-cutout look, white border, no text. Retry at most twice; after a third rejection stop and tell Dena (spec fallback: vector scissors in the clip).

- [ ] **Step 2: Process it into the library and register it**

Run:

```bash
npm run -s asset-lib -- process /tmp/examples-2b/staging/scissors.png vendor/asset-lib/paper/scissors.png --max 720 && file vendor/asset-lib/paper/scissors.png
```

Expected: `720 x 496, 8-bit colormap` (processing is deterministic: SHA-256 starts `8b7b0ac48c20`).

In `vendor/asset-lib/src/items.json` replace:

old:
```json
  {"id":"paper.calculator","kind":"paper","file":"vendor/asset-lib/paper/calculator.png","styles":["stop-motion","mix-media","vox","parallax"],"tags":["uang","kerja"],"source":"Codex (generated)","license":"project asset (MIT)","prompt":"a desk calculator with plain blank keys, made as a flat paper cutout","changes":"crop to alpha, long edge 720 px, 256-colour palette PNG with alpha"},
  {"id":"hand.hold-card","kind":"hand","file":"vendor/asset-lib/hands/hold-card.png","styles":["whiteboard","mix-media"],"tags":["orang","kertas"],"source":"Codex (generated)","license":"project asset (MIT)","prompt":"right hand holding a blank white index card from below, thumb in front, the card's top edge horizontal","changes":"crop to alpha, long edge 720 px, 256-colour palette PNG with alpha; anchor measured","anchor":{"pose":"hold-card","w":720,"h":674,"tx":212,"ty":4}},
```

new:
```json
  {"id":"paper.calculator","kind":"paper","file":"vendor/asset-lib/paper/calculator.png","styles":["stop-motion","mix-media","vox","parallax"],"tags":["uang","kerja"],"source":"Codex (generated)","license":"project asset (MIT)","prompt":"a desk calculator with plain blank keys, made as a flat paper cutout","changes":"crop to alpha, long edge 720 px, 256-colour palette PNG with alpha"},
  {"id":"paper.scissors","kind":"paper","file":"vendor/asset-lib/paper/scissors.png","styles":["stop-motion","mix-media"],"tags":["benda","kerja"],"source":"Codex (generated)","license":"project asset (MIT)","prompt":"a pair of open scissors seen from above, blades apart at about 35 degrees, with orange plastic handles and silver blades, made as a flat paper cutout","changes":"crop to alpha, long edge 720 px, 256-colour palette PNG with alpha"},
  {"id":"hand.hold-card","kind":"hand","file":"vendor/asset-lib/hands/hold-card.png","styles":["whiteboard","mix-media"],"tags":["orang","kertas"],"source":"Codex (generated)","license":"project asset (MIT)","prompt":"right hand holding a blank white index card from below, thumb in front, the card's top edge horizontal","changes":"crop to alpha, long edge 720 px, 256-colour palette PNG with alpha; anchor measured","anchor":{"pose":"hold-card","w":720,"h":674,"tx":212,"ty":4}},
```

- [ ] **Step 3: Rebuild, render the sheets, and test**

Run:

```bash
npm run -s asset-lib -- build >/dev/null && git add vendor/asset-lib && npm run -s asset-lib -- sheets | tail -1 && npm run -s test:asset-lib 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `26 sheets → docs/agents/references/asset-catalog/sheets/`, then `pass 29`, `fail 0` (the tracked-file test needs the `git add`).

Look at `docs/agents/references/asset-catalog/sheets/paper-2.webp`: the scissors tile reads as scissors at sheet size.

- [ ] **Step 4: Commit**

Run:

```bash
git add vendor/asset-lib docs/agents/references/asset-catalog && git status --short && git commit -q -F - <<'MSG'
feat: paper.scissors cut-out in the asset library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 3: Six whiteboard examples and six new patterns

**Files:**
- Create: `docs/agents/references/style-examples/whiteboard/compositions/wb-06-matrix-callout.html`, `docs/agents/references/style-examples/whiteboard/compositions/wb-07-timeline-pan.html`, `docs/agents/references/style-examples/whiteboard/compositions/wb-08-split-transform.html`, `docs/agents/references/style-examples/whiteboard/compositions/wb-09-equation-highlight.html`, `docs/agents/references/style-examples/whiteboard/compositions/wb-10-table-erase.html`, `docs/agents/references/style-examples/whiteboard/compositions/wb-11-chart-bubble.html`
- Modify: `docs/agents/references/style-examples/whiteboard/examples.json`; generated `index.html`, `snapshots.json`
- Modify: `docs/agents/references/styles/whiteboard.md` (header range, Patterns, Build Recipe, SFX, Examples, Kit hands)

- [ ] **Step 1: Write the example compositions**

Every clip follows the example rules: "Example only" comment (made-up words and numbers), one `SK.clip`, a pure function of `t`, no `visibility`, no `font-family` in the clip `<style>`, no `../` in a url, no template-literal selectors, no `!important`.

Create `docs/agents/references/style-examples/whiteboard/compositions/wb-06-matrix-callout.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the items are invented to show the mechanism. In a real clip every item comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .lab { position: absolute; width: 420px; text-align: center; font-size: 78px; font-weight: 700; line-height: 1; white-space: nowrap; }
        .ax { position: absolute; font-size: 62px; font-weight: 700; line-height: 1; color: var(--sk-accent-2); white-space: nowrap; }
        #ttl { position: absolute; left: 0; width: 1080px; top: 170px; text-align: center; font-size: 124px; font-weight: 700; line-height: 1; }
        #note { position: absolute; left: 430px; width: 560px; top: 1600px; text-align: center; font-size: 92px; font-weight: 700; line-height: 1; color: var(--sk-accent); }
      </style>
      <div id="root" data-composition-id="wb-06-matrix-callout" data-width="1080" data-height="1920" data-duration="6.5">
        <div class="sk-stage sk-wb">
          <svg class="sk-full" viewBox="0 0 1080 1920" width="1080" height="1920" id="ink"></svg>
          <div id="ttl">Mana dulu?</div>
          <div class="ax" id="ay" style="left:570px;top:400px">penting</div>
          <div class="ax" id="ax" style="left:640px;top:950px">mendesak</div>
          <div class="lab" id="q0" style="left:115px;top:620px">rapikan stok</div>
          <div class="lab" id="q1" style="left:545px;top:620px">balas chat</div>
          <div class="lab" id="q2" style="left:545px;top:1150px">cek email</div>
          <div class="lab" id="q3" style="left:115px;top:1150px">scroll sosmed</div>
          <div id="note">mulai di sini</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'wb-06-matrix-callout';
          const $ = SK.finder(ID);
          const HOT = 'style="stroke:var(--sk-accent);stroke-width:9"';
          const up = SK.arrow(540, 1420, 540, 420, 61), right = SK.arrow(110, 920, 930, 920, 62);
          // arrow-callout: a curved arrow from the note to the item it points at; head follows the curve's end tangent
          const p0 = { x: 960, y: 1560 }, p1 = { x: 960, y: 745 }, bend = -0.12;
          const cx = (p0.x + p1.x) / 2 + (p1.y - p0.y) * bend, cy = (p0.y + p1.y) / 2 - (p1.x - p0.x) * bend;
          const a = Math.atan2(p1.y - cy, p1.x - cx);
          const hd = (k) => `${(p1.x - Math.cos(a + k * 0.5) * 42).toFixed(1)} ${(p1.y - Math.sin(a + k * 0.5) * 42).toFixed(1)}`;
          $('ink').innerHTML =
            `<path id="v" class="sk-stroke" d="${up.shaft}"/><path id="vh" class="sk-stroke" d="${up.head}"/>` +
            `<path id="h" class="sk-stroke" d="${right.shaft}"/><path id="hh" class="sk-stroke" d="${right.head}"/>` +
            `<path id="c" class="sk-stroke" d="${SK.arcPath(p0, p1, bend)}" ${HOT}/><path id="ch" class="sk-stroke" d="M${hd(1)} L${p1.x} ${p1.y} L${hd(-1)}" ${HOT}/>` +
            `<path id="o" class="sk-stroke" d="${SK.ellipse(755, 660, 250, 95, 63)}" ${HOT}/>`;
          const stage = SK.stageOf(ID);
          stage.insertAdjacentHTML('beforeend', SK.MARKER_SVG);
          const marker = stage.querySelector('.sk-marker');
          const S = [
            { el: $('v'), at: 0.8, dur: 0.45 }, { el: $('vh'), at: 1.25, dur: 0.12 },
            { el: $('h'), at: 1.4, dur: 0.45 }, { el: $('hh'), at: 1.85, dur: 0.12 },
            { el: $('c'), at: 4.75, dur: 0.5 }, { el: $('ch'), at: 5.25, dur: 0.12 },
            { el: $('o'), at: 5.95, dur: 0.4 },
          ];
          const W = [
            ['ttl', 0.15, 0.5, 300, 780, 270], ['ay', 2.0, 0.35, 570, 790, 450], ['ax', 2.35, 0.4, 640, 900, 1000],
            ['q0', 2.8, 0.5, 150, 500, 680], ['q1', 3.35, 0.4, 600, 910, 680], ['q2', 3.8, 0.4, 610, 900, 1210], ['q3', 4.25, 0.45, 130, 520, 1210],
            ['note', 5.35, 0.5, 480, 940, 1680],
          ];
          SK.clip(ID, { T: 6.5, update: (t) => {
            let tip = SK.drawSeq(t, S, { boil: 1 });
            W.forEach(([id, at, dur, x0, x1, y]) => {
              const u = SK.smooth((t - at) / dur);
              SK.write($(id), u);
              if (u > 0 && u < 1) tip = SK.writeTip(x0, x1, y, u);
            });
            SK.placeMarker(marker, tip);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/whiteboard/compositions/wb-07-timeline-pan.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the stages are invented to show the mechanism. In a real clip every stage comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #ttl { position: absolute; left: 0; width: 1080px; top: 170px; text-align: center; font-size: 124px; font-weight: 700; line-height: 1; white-space: nowrap; }
        .when { position: absolute; left: 270px; font-size: 64px; font-weight: 700; line-height: 1; color: var(--sk-accent-2); white-space: nowrap; }
        .what { position: absolute; left: 270px; font-size: 96px; font-weight: 700; line-height: 1; white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="wb-07-timeline-pan" data-width="1080" data-height="1920" data-duration="7">
        <div class="sk-stage sk-wb">
          <div class="sk-cam" id="cam" style="height:2600px">
            <svg id="ink" viewBox="0 0 1080 2600" width="1080" height="2600" style="position:absolute;left:0;top:0"></svg>
            <div id="ttl">6 bulan pertama</div>
            <div class="when" id="w0" style="top:585px">bulan 1</div>
            <div class="what" id="t0" style="top:680px">catat di buku</div>
            <div class="when" id="w1" style="top:1235px">bulan 3</div>
            <div class="what" id="t1" style="top:1330px">pakai spreadsheet</div>
            <div class="when" id="w2" style="top:1872px">bulan 6</div>
            <div class="what" id="t2" style="top:1980px">otomatis</div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'wb-07-timeline-pan';
          const $ = SK.finder(ID);
          const M0 = [700, 1350, 2000]; // milestone y on the tall board
          const HOT = 'style="stroke:var(--sk-accent);stroke-width:9"';
          // timeline-sketch: the line grows one segment per stage, a dot marks each stage
          const seg = [[430, M0[0]], [M0[0], M0[1]], [M0[1], M0[2]]];
          $('ink').innerHTML =
            seg.map(([a, b], i) => `<path id="s${i}" class="sk-stroke" d="${SK.line(185, a, 185, b, 70 + i, 5)}"/>`).join('') +
            M0.map((y, i) => `<path id="d${i}" class="sk-stroke" d="${SK.ellipse(185, y, 24, 24, 74 + i, 0.08)}" ${HOT}/>`).join('') +
            `<path id="o" class="sk-stroke" d="${SK.ellipse(450, 2040, 235, 72, 78)}" ${HOT}/>`;
          $('cam').insertAdjacentHTML('beforeend', SK.MARKER_SVG);
          const marker = $('cam').querySelector('.sk-marker');
          const S = [
            { el: $('s0'), at: 0.7, dur: 0.3 }, { el: $('d0'), at: 1.0, dur: 0.2 },
            { el: $('s1'), at: 2.2, dur: 0.5 }, { el: $('d1'), at: 2.75, dur: 0.2 },
            { el: $('s2'), at: 4.1, dur: 0.5 }, { el: $('d2'), at: 4.65, dur: 0.2 },
            { el: $('o'), at: 5.8, dur: 0.45 },
          ];
          const W = [
            ['ttl', 0.1, 0.5, 250, 830, 270],
            ['w0', 1.2, 0.3, 270, 460, 635], ['t0', 1.5, 0.55, 270, 790, 760],
            ['w1', 2.95, 0.3, 270, 460, 1285], ['t1', 3.25, 0.6, 270, 925, 1410],
            ['w2', 4.85, 0.3, 270, 460, 1922], ['t2', 5.15, 0.45, 270, 620, 2060],
          ];
          // pan-across-board: the camera glides down to the next zone while its segment draws
          const camY = M.track(835, [[2.2, 1150, M.SLOW], [4.1, 1700, M.SLOW]]);
          SK.clip(ID, { T: 7, update: (t) => {
            SK.cam($('cam'), 1.15, 540, camY(t));
            let tip = SK.drawSeq(t, S, { boil: 1 });
            W.forEach(([id, at, dur, x0, x1, y]) => {
              const u = SK.smooth((t - at) / dur);
              SK.write($(id), u);
              if (u > 0 && u < 1) tip = SK.writeTip(x0, x1, y, u);
            });
            SK.placeMarker(marker, tip);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/whiteboard/compositions/wb-08-split-transform.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the labels are invented to show the mechanism. In a real clip every label comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #half { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; overflow: hidden; background: var(--sk-bg); }
        #ink { position: absolute; left: 0; top: 0; }
        .hd { position: absolute; top: 70px; width: 480px; text-align: center; font-size: 88px; font-weight: 700; line-height: 1; color: var(--sk-accent-2); white-space: nowrap; }
        .lab { position: absolute; top: 740px; width: 480px; text-align: center; font-size: 78px; font-weight: 700; line-height: 1; white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="wb-08-split-transform" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-wb">
          <div id="half">
            <svg id="ink" viewBox="0 0 1080 960" width="1080" height="960"></svg>
            <div class="hd" id="h0" style="left:30px">dulu</div>
            <div class="hd" id="h1" style="left:570px">sekarang</div>
            <div class="lab" id="l0" style="left:30px">buku catatan</div>
            <div class="lab" id="l1" style="left:570px">dashboard</div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'wb-08-split-transform';
          const $ = SK.finder(ID);
          const HOT = 'style="stroke:var(--sk-accent);stroke-width:9"';
          // one notebook drawing per side; the right one is then turned into a screen with a chart
          const book = (x, k) => `<path id="r${k}" class="sk-stroke" d="${SK.rect(x, 220, 320, 440, 80 + k)}"/>` +
            [320, 410, 500, 590].map((y, i) => `<path id="n${k}${i}" class="sk-stroke" d="${SK.line(x + 40, y, x + 280, y, 90 + k * 4 + i, 4)}"/>`).join('');
          const bars = [[690, 130], [780, 220], [870, 320]];
          $('ink').innerHTML =
            `<path id="dv" class="sk-stroke" d="${SK.line(540, 80, 540, 900, 79, 6)}"/>` + book(110, 0) + book(650, 1) +
            bars.map(([x, h], i) => `<path id="b${i}" class="sk-stroke" d="${SK.rect(x, 620 - h, 60, h, 95 + i, 4)}" ${HOT}/>`).join('') +
            `<path id="st" class="sk-stroke" d="${SK.line(810, 665, 810, 710, 98, 2)}"/><path id="ba" class="sk-stroke" d="${SK.line(730, 715, 890, 715, 99, 3)}"/>`;
          $('half').insertAdjacentHTML('beforeend', SK.MARKER_SVG);
          const marker = $('half').querySelector('.sk-marker');
          const lines = (k, at, d) => [0, 1, 2, 3].map((i) => ({ el: $(`n${k}${i}`), at: at + i * d, dur: d }));
          const S = [
            { el: $('dv'), at: 0.2, dur: 0.4 },
            { el: $('r0'), at: 0.95, dur: 0.6 }, ...lines(0, 1.55, 0.13),
            { el: $('r1'), at: 3.1, dur: 0.5 }, ...lines(1, 3.6, 0.1),
            { el: $('b0'), at: 4.3, dur: 0.18 }, { el: $('b1'), at: 4.5, dur: 0.18 }, { el: $('b2'), at: 4.7, dur: 0.18 },
            { el: $('st'), at: 4.95, dur: 0.15 }, { el: $('ba'), at: 5.1, dur: 0.15 },
          ];
          const W = [['h0', 0.6, 0.3, 190, 350, 150], ['l0', 2.1, 0.5, 90, 450, 815], ['h1', 2.7, 0.4, 670, 930, 150], ['l1', 5.3, 0.45, 660, 940, 815]];
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            let tip = SK.drawSeq(t, S, { boil: 1 });
            // transform-reveal: the copied page lines fade as the chart bars draw over them
            const fade = 1 - M.clamp((t - 4.2) / 0.3);
            for (let i = 0; i < 4; i++) if (t >= 4.2) $('n1' + i).style.opacity = fade.toFixed(4);
            W.forEach(([id, at, dur, x0, x1, y]) => {
              const u = SK.smooth((t - at) / dur);
              SK.write($(id), u);
              if (u > 0 && u < 1) tip = SK.writeTip(x0, x1, y, u);
            });
            SK.placeMarker(marker, tip);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/whiteboard/compositions/wb-09-equation-highlight.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the terms are invented to show the mechanism. In a real clip every term comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #board { position: absolute; left: 90px; top: 150px; width: 900px; height: 560px; border-radius: 28px; background: var(--sk-bg); box-shadow: 0 26px 60px -24px rgba(0,0,0,.55); overflow: hidden; }
        #ink { position: absolute; left: 0; top: 0; }
        .t { position: absolute; font-size: 88px; font-weight: 700; line-height: 1; color: var(--sk-ink); white-space: nowrap; }
        #hl { left: 455px; top: 128px; width: 400px; height: 84px; }
      </style>
      <div id="root" data-composition-id="wb-09-equation-highlight" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-wb">
          <div id="board">
            <div class="sk-hl" id="hl"></div>
            <svg id="ink" viewBox="0 0 900 560" width="900" height="560"></svg>
            <div class="t" id="e0" style="left:60px;top:120px">stok rapi</div>
            <div class="t" id="pl" style="left:385px;top:120px">+</div>
            <div class="t" id="e1" style="left:465px;top:120px">balas cepat</div>
            <div class="t" id="eq" style="left:60px;top:330px">=</div>
            <div class="t" id="e2" style="left:175px;top:330px">pelanggan balik</div>
          </div>
          <img class="sk-hand-img" id="hand" alt="" />
        </div>
      </div>
      <script>
        (() => {
          const ID = 'wb-09-equation-highlight';
          const $ = SK.finder(ID);
          // equation: A + B = C, the result boxed
          $('ink').innerHTML = `<path id="bx" class="sk-stroke" d="${SK.rect(150, 305, 600, 140, 101)}" style="stroke:var(--sk-accent);stroke-width:9"/>`;
          $('board').insertAdjacentHTML('beforeend', SK.MARKER_SVG);
          const marker = $('board').querySelector('.sk-marker');
          const W = [['e0', 0.4, 0.45, 60, 330, 200], ['pl', 0.95, 0.12, 385, 425, 200], ['e1', 1.15, 0.5, 465, 850, 200],
                     ['eq', 1.9, 0.15, 60, 110, 410], ['e2', 2.15, 0.6, 175, 720, 410]];
          const S = [{ el: $('bx'), at: 2.9, dur: 0.6 }];
          const board = M.track(0, [[0.02, 1, [18, 0.8]]]);
          // highlight-marker: the held highlighter (library hand) swipes over the term, then leaves
          const HL = [3.9, 0.6], BX = 90, BY = 150, Y = BY + 205;
          const enter = M.track(0, [[3.45, 1, [16, 0.85]]]);
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            const b = board(t);
            $('board').style.opacity = M.clamp(b * 3).toFixed(4);
            $('board').style.transform = `translateY(${((1 - b) * -60).toFixed(2)}px)`;
            let tip = SK.drawSeq(t, S, { boil: 0.9 });
            W.forEach(([id, at, dur, x0, x1, y]) => {
              const u = SK.smooth((t - at) / dur);
              SK.write($(id), u);
              if (u > 0 && u < 1) tip = SK.writeTip(x0, x1, y, u);
            });
            SK.placeMarker(marker, tip);
            const u = SK.smooth((t - HL[0]) / HL[1]);
            SK.highlight($('hl'), u);
            const x0 = BX + 455, x1 = BX + 855;
            let hand = null, last = null;
            if (t < HL[0]) { const k = enter(t); hand = k > 0 ? { x: 1300 + (x0 - 1300) * k, y: 2200 + (Y - 2200) * k } : null; }
            else if (u < 1) hand = { x: x0 + (x1 - x0) * u, y: Y };
            else last = { x: x1, y: Y, since: t - HL[0] - HL[1] };
            SK.placeHand($('hand'), hand, { pose: 'hold-highlighter', scale: 0.5, last, hover: 0.25 });
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/whiteboard/compositions/wb-10-table-erase.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the rows and marks are invented to show the mechanism. In a real clip every row and verdict comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #ttl { position: absolute; left: 0; width: 1080px; top: 190px; text-align: center; font-size: 112px; font-weight: 700; line-height: 1; white-space: nowrap; }
        .hd { position: absolute; top: 440px; width: 280px; text-align: center; font-size: 72px; font-weight: 700; line-height: 1; color: var(--sk-accent-2); white-space: nowrap; }
        .rw { position: absolute; left: 110px; width: 290px; font-size: 84px; font-weight: 700; line-height: 1; white-space: nowrap; }
        #note { position: absolute; left: 560px; width: 480px; top: 1110px; text-align: center; font-size: 70px; font-weight: 700; line-height: 1; color: var(--sk-accent-2); white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="wb-10-table-erase" data-width="1080" data-height="1920" data-duration="7">
        <div class="sk-stage sk-wb">
          <div class="sk-cam" id="cam">
          <svg class="sk-full" viewBox="0 0 1080 1920" width="1080" height="1920" id="ink"></svg>
          <div id="ttl">Manual vs otomatis</div>
          <div class="hd" id="h0" style="left:420px">manual</div>
          <div class="hd" id="h1" style="left:700px">otomatis</div>
          <div class="rw" id="r0" style="top:580px">cepat</div>
          <div class="rw" id="r1" style="top:740px">rapi</div>
          <div class="rw" id="r2" style="top:900px">murah</div>
          <div id="note">jangka panjang</div>
          <img class="sk-hand-img" id="hand" alt="" />
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'wb-10-table-erase';
          const $ = SK.finder(ID);
          const RED = 'style="stroke:var(--sk-accent);stroke-width:10"', BLUE = 'style="stroke:var(--sk-accent-2);stroke-width:10"';
          const tick = (x, y) => `M${x - 40} ${y} L${x - 12} ${y + 30} L${x + 42} ${y - 40}`;
          const cross = (x, y, s) => SK.line(x - 36, y - 36, x + 36, y + 36, s, 3) + ' ' + SK.line(x + 36, y - 36, x - 36, y + 36, s + 1, 3);
          const CX = [560, 840], RY = [620, 780, 940];
          // table-sketch: rules first, then one verdict per cell on its row's word
          const MARK = [[0, 0, 'x'], [0, 1, 'v'], [1, 0, 'x'], [1, 1, 'v'], [2, 0, 'v'], [2, 1, 'x']];
          $('ink').innerHTML =
            [540, 700, 860, 1020].map((y, i) => `<path id="g${i}" class="sk-stroke" d="${SK.line(90, y, 990, y, 110 + i, 4)}"/>`).join('') +
            [420, 700].map((x, i) => `<path id="v${i}" class="sk-stroke" d="${SK.line(x, 420, x, 1030, 115 + i, 4)}"/>`).join('') +
            MARK.map(([r, c, k], i) => `<path id="m${i}" class="sk-stroke" d="${k === 'v' ? tick(CX[c], RY[r]) : cross(CX[c], RY[r], 120 + i)}" ${k === 'v' ? BLUE : RED}/>`).join('') +
            `<path id="fix" class="sk-stroke" d="${tick(CX[1], RY[2])}" ${BLUE}/>`;
          $('cam').insertAdjacentHTML('beforeend', SK.MARKER_SVG);
          const marker = $('cam').querySelector('.sk-marker');
          const S = [
            ...[0, 1, 2, 3].map((i) => ({ el: $('g' + i), at: 0.7 + i * 0.14, dur: 0.14 })),
            { el: $('v0'), at: 1.26, dur: 0.14 }, { el: $('v1'), at: 1.4, dur: 0.14 },
            ...MARK.map((m, i) => ({ el: $('m' + i), at: [2.75, 2.95, 3.4, 3.6, 4.05, 4.25][i], dur: 0.18 })),
            { el: $('fix'), at: 5.75, dur: 0.25 },
          ];
          const W = [['ttl', 0.1, 0.5, 170, 910, 290], ['h0', 1.65, 0.3, 470, 650, 505], ['h1', 1.95, 0.35, 740, 950, 505],
                     ['r0', 2.4, 0.3, 110, 290, 650], ['r1', 3.1, 0.25, 110, 250, 810], ['r2', 3.75, 0.3, 110, 310, 970], ['note', 6.1, 0.5, 600, 1000, 1170]];
          // erase-redraw: the eraser hand rubs out one verdict, the corrected one is drawn in its place
          const ER = [4.85, 0.7];
          SK.clip(ID, { T: 7, update: (t) => {
            SK.cam($('cam'), 1.05, 540, 690); // centre the table in the frame
            let tip = SK.drawSeq(t, S, { boil: 1 });
            W.forEach(([id, at, dur, x0, x1, y]) => {
              const u = SK.smooth((t - at) / dur);
              SK.write($(id), u);
              if (u > 0 && u < 1) tip = SK.writeTip(x0, x1, y, u);
            });
            const e = M.clamp((t - ER[0]) / ER[1]);
            if (t >= ER[0]) $('m5').style.opacity = (1 - SK.smooth(e)).toFixed(4);
            SK.placeMarker(marker, t >= ER[0] - 0.2 && t < ER[0] + ER[1] + 0.1 ? null : tip);
            let hand = null, last = null;
            if (t >= ER[0] - 0.25 && t < ER[0]) { const k = M.eo((t - ER[0] + 0.25) / 0.25); hand = { x: 1300 + (CX[1] - 1300) * k, y: 2200 + (RY[2] - 2200) * k }; }
            else if (t >= ER[0] && e < 1) hand = { x: CX[1] + Math.sin(e * Math.PI * 7) * 45, y: RY[2] + Math.cos(e * Math.PI * 5) * 14 };
            else if (e >= 1) last = { x: CX[1], y: RY[2], since: t - ER[0] - ER[1] };
            SK.placeHand($('hand'), hand, { pose: 'erase', scale: 0.5, last, hover: 0 });
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/whiteboard/compositions/wb-11-chart-bubble.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the chart and the quote are invented to show the mechanism. In a real clip the shape of the chart and the quote come from the transcript (Gate 2 R1); a sketch chart has no values unless they were said. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #half { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; overflow: hidden; background: var(--sk-bg); }
        #ink { position: absolute; left: 0; top: 0; }
        .ax { position: absolute; font-size: 60px; font-weight: 700; line-height: 1; color: var(--sk-accent-2); white-space: nowrap; }
        #fig { position: absolute; left: 745px; top: 450px; color: var(--sk-ink); }
        #bub { position: absolute; left: 620px; top: 40px; color: var(--sk-ink); transform: scaleX(-1); }
        #q { position: absolute; left: 650px; top: 170px; width: 300px; text-align: center; font-size: 62px; font-weight: 700; line-height: 1; white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="wb-11-chart-bubble" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-wb">
          <div id="half">
            <svg id="ink" viewBox="0 0 1080 960" width="1080" height="960"></svg>
            <div class="ax" id="ay" style="left:135px;top:95px">order</div>
            <div class="ax" id="ax" style="left:380px;top:790px">minggu</div>
            <div id="fig"></div>
            <div id="bub"></div>
            <div id="q">naik terus!</div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'wb-11-chart-bubble';
          const $ = SK.finder(ID);
          const HOT = 'style="stroke:var(--sk-accent);stroke-width:9"';
          // sketch-chart: wobbly axes, a rising line, the last point circled
          const up = SK.arrow(110, 770, 110, 110, 131), right = SK.arrow(100, 760, 600, 760, 132);
          const P = [[150, 700], [250, 645], [345, 570], [440, 430], [535, 270]];
          const line = P.slice(1).map(([x, y], i) => SK.line(P[i][0], P[i][1], x, y, 133 + i, 5)).join(' ');
          $('ink').innerHTML =
            `<path id="v" class="sk-stroke" d="${up.shaft}"/><path id="vh" class="sk-stroke" d="${up.head}"/>` +
            `<path id="h" class="sk-stroke" d="${right.shaft}"/><path id="hh" class="sk-stroke" d="${right.head}"/>` +
            `<path id="ln" class="sk-stroke" d="${line}" style="stroke:var(--sk-accent-2);stroke-width:9"/>` +
            `<path id="o" class="sk-stroke" d="${SK.ellipse(535, 270, 62, 58, 138, 0.08)}" ${HOT}/>`;
          // speech-bubble: a library stick figure and bubble, both drawn stroke by stroke
          $('fig').innerHTML = SK.doodle('stand', { size: 330, sw: 7 });
          $('bub').innerHTML = SK.doodle('speech-round', { size: 360, sw: 7 });
          $('half').insertAdjacentHTML('beforeend', SK.MARKER_SVG);
          const marker = $('half').querySelector('.sk-marker');
          const figP = [...$('fig').querySelectorAll('path')], bubP = [...$('bub').querySelectorAll('path')];
          const S = [
            { el: $('v'), at: 0.2, dur: 0.3 }, { el: $('vh'), at: 0.5, dur: 0.1 },
            { el: $('h'), at: 0.6, dur: 0.3 }, { el: $('hh'), at: 0.9, dur: 0.1 },
            { el: $('ln'), at: 1.5, dur: 0.9 }, { el: $('o'), at: 2.5, dur: 0.4 },
            ...figP.map((el, i) => ({ el, at: 3.0 + i * 0.1, dur: 0.1 })),
            ...bubP.map((el, i) => ({ el, at: 3.7 + i * (0.4 / bubP.length), dur: 0.4 / bubP.length })),
          ];
          const W = [['ay', 1.0, 0.3, 135, 290, 145], ['ax', 1.25, 0.3, 380, 570, 840], ['q', 4.15, 0.5, 680, 920, 225]];
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            let tip = SK.drawSeq(t, S, { boil: 1 });
            W.forEach(([id, at, dur, x0, x1, y]) => {
              const u = SK.smooth((t - at) / dur);
              SK.write($(id), u);
              if (u > 0 && u < 1) tip = SK.writeTip(x0, x1, y, u);
            });
            // doodle paths sit in their own svg, so the marker follows only the half-board strokes
            SK.placeMarker(marker, t >= 3.0 && t < 4.1 ? null : tip);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 2: Append them to the manifest and regenerate the host**

In `docs/agents/references/style-examples/whiteboard/examples.json` replace:

old:
```json
    {"clip": "wb-04-cross-out", "duration": 6, "treatment": "cutaway", "stills": [2.9, 5.7]},
    {"clip": "wb-05-hand", "duration": 6, "treatment": "cutaway", "stills": [2.0, 5.1, 5.9]}
  ]
```

new:
```json
    {"clip": "wb-04-cross-out", "duration": 6, "treatment": "cutaway", "stills": [2.9, 5.7]},
    {"clip": "wb-05-hand", "duration": 6, "treatment": "cutaway", "stills": [2.0, 5.1, 5.9]},
    {"clip": "wb-06-matrix-callout", "duration": 6.5, "treatment": "cutaway", "stills": [4.7, 6.4]},
    {"clip": "wb-07-timeline-pan", "duration": 7, "treatment": "cutaway", "stills": [1.9, 3.6, 6.6]},
    {"clip": "wb-08-split-transform", "duration": 6, "treatment": "split", "stills": [2.6, 5.85]},
    {"clip": "wb-09-equation-highlight", "duration": 6, "treatment": "panel", "stills": [4.2, 5.6]},
    {"clip": "wb-10-table-erase", "duration": 7, "treatment": "cutaway", "stills": [5.2, 6.8]},
    {"clip": "wb-11-chart-bubble", "duration": 6, "treatment": "split", "stills": [2.9, 5.2]}
  ]
```

Run:

```bash
npm run -s style-examples -- build >/dev/null && npm run -s style-examples -- check
```

Expected: `example hosts are up to date`.

- [ ] **Step 3: Render and look at every new still**

Run:

```bash
npm run check:style-examples -- whiteboard
```

Expected: `0 errors`; stills in `renders/style-examples/whiteboard/`.

Look at each still (`Read` the contact sheet) against its patterns. Clip-local stills: wb-06 4.7 (matrix filled) / 6.4 (callout arrow up the right margin, "balas chat" circled); wb-07 1.9 / 3.6 / 6.6 (the camera pans down a 2600 px board at 1.15×); wb-08 2.6 ("dulu" notebook) / 5.85 (right notebook turned into a dashboard); wb-09 4.2 (highlighter hand mid-swipe) / 5.6 (highlight done, hand gone); wb-10 5.2 (eraser hand rubbing the ✗) / 6.8 (✓ redrawn, "jangka panjang"); wb-11 2.9 (chart, last point circled) / 5.2 (figure + mirrored bubble, tail toward the head). Traps found building them: `$('root')` is null inside a clip (`SK.finder` searches the stage) — use `SK.stageOf(ID)`; a callout arrow through the matrix crosses labels (route it up the right margin); a table in the top half leaves the frame empty (wrap it in `.sk-cam` and centre with `SK.cam`); the speech bubble's tail points down-left, so mirror it (`scaleX(-1)`) to aim at a figure on its right.

- [ ] **Step 4: Document the patterns and examples**

In `docs/agents/references/styles/whiteboard.md` replace:

old:
```md
(`wb-01` … `wb-04`,
```

new:
```md
(`wb-01` … `wb-11`,
```

In `docs/agents/references/styles/whiteboard.md` replace:

old:
```md


## References
```

new:
```md

| **matrix-2x2** | Two drawn axes with labels; items are written into their quadrants | Priorities, "penting vs mendesak", choosing tools | Axes drawn before the first item; each item on its name | marker stroke per item | More than 6 items; quadrants without axis labels | `SK.arrow` axes + `SK.write` per label and item, in `SK.drawSeq` |
| **timeline-sketch** | A hand-drawn line with stage dots; each stage label is written in turn | "bulan pertama… bulan ketiga…" | The segment and dot land on the stage word, the label right after | marker tick per stage | Uneven stage spacing; stages nobody named | `SK.line` segments + `SK.ellipse` dots + `SK.write` |
| **split-compare** | The board is split by a vertical line; "then" drawn left, "now" right | Before/after comparisons | Divider first; the right side starts on "sekarang"/"tapi" | marker sweep | Different scales on the two sides; more than one idea per side | divider `SK.line` + one drawing per side in `SK.drawSeq` |
| **highlight-marker** | A transparent highlighter swipe over a handwritten word already on the board | Marking one term in existing notes | Swipe 0.3–0.5 s from the word onset | highlighter hiss | Highlighting a whole line; more than two swipes | `.sk-hl` + `SK.highlight` + `SK.placeHand(…, { pose: 'hold-highlighter' })` |
| **arrow-callout** | A curved arrow from a note to one part of the drawing | "nah, yang bikin bocor di sini" | The arrow draws on the pointing word; the note is written after | quick swish | A stiff straight arrow; pointing at empty space | `SK.arcPath` + a head from the end tangent, `SK.draw` + `SK.write` |
| **table-sketch** | A hand-drawn 2–3 column table; cells fill with ✓/✗ one by one | Comparing options or features | Rules first; each ✓/✗ on its feature word | tick per cell | More than 4 rows; verdicts nobody said | `SK.line` rules + tick/cross paths in `SK.drawSeq` + `SK.write` |

## References
```

In `docs/agents/references/styles/whiteboard.md` replace:

old:
```md
  target point to point at something. Worked example: `wb-05-hand`.
```

new:
```md
  target point to point at something. Worked example: `wb-05-hand`.
- Library hands work the same way: `{ pose: 'hold-highlighter' }` rides along a
  `.sk-hl` swipe (`wb-09`), `{ pose: 'erase' }` rubs a mark out while its opacity
  falls (`wb-10`).
- A board taller than the frame lives in `.sk-cam` (give it the board height); move
  the focus with `SK.cam(el, s, 540, y)` from `M.track` for pan-across-board (`wb-07`).
- Library doodles (`SK.doodle('stand')`, `SK.doodle('speech-round')`) are drawn
  stroke by stroke: put each `path` of the inserted svg into `SK.drawSeq` (`wb-11`).
```

In `docs/agents/references/styles/whiteboard.md` replace:

old:
```md
| zoom-into-detail | low swell | 0.08–0.12 |
```

new:
```md
| zoom-into-detail | low swell | 0.08–0.12 |
| matrix-2x2, timeline-sketch, table-sketch | marker stroke / tick per item | 0.06–0.1 |
| highlight-marker | highlighter hiss | 0.06–0.1 |
| erase-redraw | eraser rub | 0.08–0.12 |
```

In `docs/agents/references/styles/whiteboard.md` replace:

old:
```md
| `style-examples/whiteboard/compositions/wb-05-hand.html` | draw-flow with the paper-pack hand: writes, points, then glides off | cutaway |
```

new:
```md
| `style-examples/whiteboard/compositions/wb-05-hand.html` | draw-flow with the paper-pack hand: writes, points, then glides off | cutaway |
| `style-examples/whiteboard/compositions/wb-06-matrix-callout.html` | matrix-2x2 + arrow-callout + underline-circle | cutaway |
| `style-examples/whiteboard/compositions/wb-07-timeline-pan.html` | timeline-sketch + pan-across-board on a tall board | cutaway |
| `style-examples/whiteboard/compositions/wb-08-split-transform.html` | split-compare + transform-reveal (notebook → dashboard) | split |
| `style-examples/whiteboard/compositions/wb-09-equation-highlight.html` | equation + highlight-marker with the highlighter hand | panel |
| `style-examples/whiteboard/compositions/wb-10-table-erase.html` | table-sketch + erase-redraw with the eraser hand | cutaway |
| `style-examples/whiteboard/compositions/wb-11-chart-bubble.html` | sketch-chart + speech-bubble (library figure and bubble) | split |
```

In `docs/agents/references/styles/whiteboard.md` replace:

old:
```md
| Hands | `hand.write`, `hand.point`, `hand.erase`, `hand.hold-card` |
```

new:
```md
| Hands | `hand.write`, `hand.point`, `hand.erase`, `hand.hold-highlighter`, `hand.hold-card` |
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/agents/references/style-examples/whiteboard docs/agents/references/styles/whiteboard.md && git status --short && git commit -q -F - <<'MSG'
feat: whiteboard examples for all 20 patterns (matrix, timeline, split, highlight, table, chart)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 4: Six stop-motion examples and six new patterns

**Files:**
- Create: `docs/agents/references/style-examples/stop-motion/compositions/sm-05-string-flip.html`, `docs/agents/references/style-examples/stop-motion/compositions/sm-06-receipt-scroll.html`, `docs/agents/references/style-examples/stop-motion/compositions/sm-07-flipbook-fold.html`, `docs/agents/references/style-examples/stop-motion/compositions/sm-08-walk-hinge.html`, `docs/agents/references/style-examples/stop-motion/compositions/sm-09-cut-along.html`, `docs/agents/references/style-examples/stop-motion/compositions/sm-10-envelope-depth.html`
- Modify: `docs/agents/references/style-examples/stop-motion/examples.json`; generated `index.html`, `snapshots.json`
- Modify: `docs/agents/references/styles/stop-motion.md` (header range, Patterns, Build Recipe, SFX, Examples, Kit)

- [ ] **Step 1: Write the example compositions**

Every clip follows the example rules: "Example only" comment (made-up words and numbers), one `SK.clip`, a pure function of `t`, no `visibility`, no `font-family` in the clip `<style>`, no `../` in a url, no template-literal selectors, no `!important`.

Create `docs/agents/references/style-examples/stop-motion/compositions/sm-05-string-flip.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the causes and the answer are invented to show the mechanism. In a real clip every card comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        .card { width: 460px; height: 250px; }
        .card .cp { position: absolute; inset: 0; }
        .card span { position: absolute; left: 0; right: 0; top: 78px; text-align: center; font-size: 84px; font-weight: 700; color: #2b2118; white-space: nowrap; }
        #str { position: absolute; left: 0; top: 0; z-index: 3; }
        .pin { width: 46px; z-index: 4; }
        #c3 { width: 520px; height: 270px; }
        #c3 .face { position: absolute; inset: 0; }
        #c3 span { top: 84px; font-size: 88px; }
        #fb span { color: var(--sk-accent); }
      </style>
      <div id="root" data-composition-id="sm-05-string-flip" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-kraft">
          <div class="p card sk-cut" id="c0"><div class="cp sk-paper-cream" id="cp0"></div><span class="sk-hand">stok kosong</span></div>
          <div class="p card sk-cut" id="c1"><div class="cp sk-paper-cream" id="cp1"></div><span class="sk-hand">pembeli kabur</span></div>
          <div class="p card sk-cut" id="c2"><div class="cp sk-paper-cream" id="cp2"></div><span class="sk-hand">omzet turun</span></div>
          <div class="p card sk-cut" id="c3">
            <div class="face" id="fa"><div class="cp sk-paper-white" id="cpa"></div><span class="sk-hand">solusinya?</span></div>
            <div class="face" id="fb"><div class="cp sk-paper-white" id="cpb"></div><span class="sk-hand">stok otomatis</span></div>
          </div>
          <svg id="str" viewBox="0 0 1080 1920" width="1080" height="1920"></svg>
          <div class="p pin sk-pin" id="n0"></div>
          <div class="p pin sk-pin" id="n1"></div>
          <div class="p pin sk-pin" id="n2"></div>
          <div class="p pin sk-pin" id="n3"></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-05-string-flip';
          const $ = SK.finder(ID);
          ['cp0', 'cp1', 'cp2'].forEach((id, i) => ($(id).style.clipPath = SK.torn(460, 250, 150 + i, { edges: 'trbl', amp: 8 })));
          ['cpa', 'cpb'].forEach((id, i) => ($(id).style.clipPath = SK.torn(520, 270, 155 + i, { edges: 'trbl', amp: 8 })));
          // card: [x, y, r, pinned at, pin x]; pins sit near a corner so the strings run through the gaps;
          // the flip card is pinned at its centre, the axis it turns on
          const C = [[70, 300, -4, 0.2, 400], [540, 640, 3, 0.45, 60], [90, 1010, -2, 0.7, 400], [280, 1400, 2, 2.9, 260]];
          const head = C.map(([x, y, , , px]) => ({ x: x + px, y: y - 10 }));
          // string-connect: red string sags between pins and is pulled across on twos
          const LINKS = [[0, 1, 1.0], [1, 2, 1.9], [2, 3, 3.2]];
          $('str').innerHTML = LINKS.map(([a, b], i) => `<path id="s${i}" d="${SK.sagPath(head[a], head[b], 0.1)}" fill="none" stroke="#b3141f" stroke-width="6" stroke-linecap="round"/>`).join('');
          const pull = LINKS.map(([, , at]) => SK.onTwos((t) => SK.smooth((t - at) / 0.5)));
          const drop = C.map(([, , , at]) => SK.onTwos(M.track(1, [[at, 0, [26, 0.7]]])));
          // flip-card: a 2-step squash to edge-on, the face swaps, 2 steps back (not 3D)
          const FLIP = 4.0, SQ = [0.55, 0.12, 0.12, 0.55];
          SK.clip(ID, { T: 6, update: (t) => {
            C.forEach(([x, y, r, at], i) => {
              const k = drop[i](t), on = t >= at ? 1 : 0;
              const el = $('c' + i);
              SK.piece(el, { x, y: y - 60 * k, r, o: on }, 160 + i, t);
              if (i === 3) {
                const s = Math.round(SK.stepTime(t - FLIP, SK.STOP_FPS) * SK.STOP_FPS);
                const sx = s < 0 || s >= SQ.length ? 1 : SQ[s];
                el.style.transform += ` scaleX(${sx})`;
                $('fa').style.opacity = s >= 2 ? '0' : '1';
                $('fb').style.opacity = s >= 2 ? '1' : '0';
              }
              SK.piece($('n' + i), { x: head[i].x - 23, y: head[i].y - 28 - 60 * k, o: on }, 170 + i, t, { amp: 0.6 });
            });
            LINKS.forEach((l, i) => SK.draw($('s' + i), pull[i](t)));
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/stop-motion/compositions/sm-06-receipt-scroll.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the items and prices are invented to show the mechanism. In a real clip every item and amount comes from the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #win { position: absolute; left: 90px; top: 130px; width: 900px; height: 760px; border-radius: 28px; overflow: hidden; box-shadow: 0 26px 60px -24px rgba(0,0,0,.55); }
        #rc { position: absolute; left: 230px; top: 0; width: 440px; height: 1331px; }
        #paper { position: absolute; inset: 0; }
        .ln { position: absolute; left: 30px; right: 30px; font-size: 29px; line-height: 1; color: #2b2118; white-space: pre; opacity: 0; }
        .ln.c { text-align: center; }
        .ln.b { font-weight: 700; font-size: 33px; }
        #prn { position: absolute; left: 150px; top: 640px; width: 600px; height: 150px; border-radius: 22px 22px 0 0; background: #2b2118; z-index: 5; }
        #slot { position: absolute; left: 60px; right: 60px; top: 16px; height: 10px; border-radius: 5px; background: #0f0b08; }
      </style>
      <div id="root" data-composition-id="sm-06-receipt-scroll" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop">
          <div id="win" class="sk-kraft-dark">
            <div class="sk-cut" id="rc">
              <div id="paper" class="sk-obj-receipt-blank" style="width:440px"></div>
              <div class="ln c b sk-mono" id="l0">WARUNG DENA</div>
              <div class="ln sk-mono" id="l1">kopi susu x2   36.000</div>
              <div class="ln sk-mono" id="l2">roti bakar     18.000</div>
              <div class="ln sk-mono" id="l3">es teh x3      15.000</div>
              <div class="ln sk-mono" id="l4">---------------------</div>
              <div class="ln b sk-mono" id="l5">TOTAL        69.000</div>
              <div class="ln c sk-mono" id="l6">terima kasih</div>
            </div>
            <div id="prn"><div id="slot"></div></div>
            <div class="sk-grain" id="grain"></div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-06-receipt-scroll';
          const $ = SK.finder(ID);
          const SLOT = 656, LH = 56;
          // receipt-print: the printer sits at the bottom like a till; each printed line pushes the strip up one line, in 3 steps
          const AT = [0.5, 1.05, 1.55, 2.05, 2.5, 2.85, 3.45];
          AT.forEach((at, i) => ($('l' + i).style.top = `${70 + i * LH}px`));
          // paper-scroll: once printed, the strip keeps moving through the window in visible steps
          const feed = SK.onTwos((t) => 60 + AT.reduce((s, at) => s + LH * M.clamp((t - at) / 0.2), 0) + 150 * M.eo((t - 4.0) / 1.2));
          const win = M.track(0, [[0.02, 1, [18, 0.8]]]);
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            const w = win(t);
            $('win').style.opacity = M.clamp(w * 3).toFixed(4);
            $('win').style.transform = `translateY(${((1 - w) * -60).toFixed(2)}px)`;
            SK.piece($('rc'), { x: 0, y: SLOT - feed(t) }, 180, t, { amp: 0.8 });
            AT.forEach((at, i) => ($('l' + i).style.opacity = t >= at ? '1' : '0'));
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/stop-motion/compositions/sm-07-flipbook-fold.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the pages and the four steps are invented to show the mechanism. In a real clip every page and step comes from the transcript (Gate 2 R1); a flip-book shows no values unless they were said. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #pad { position: absolute; left: 210px; top: 250px; width: 660px; height: 470px; }
        .pg { position: absolute; left: 0; top: 0; width: 660px; height: 470px; transform-origin: 50% 0; box-shadow: 0 3px 0 #d8d2c4, 0 6px 0 #cfc8b8; }
        .pg .bar { position: absolute; left: 90px; bottom: 70px; width: 110px; background: var(--sk-accent); }
        .pg .wk { position: absolute; left: 250px; top: 120px; font-size: 64px; font-weight: 700; color: var(--sk-accent-2); white-space: nowrap; }
        .pg .n { position: absolute; left: 250px; top: 210px; font-size: 104px; font-weight: 700; color: #2b2118; white-space: nowrap; }
        #rings { position: absolute; left: 60px; top: -18px; width: 540px; height: 36px; display: flex; justify-content: space-between; z-index: 5; }
        #rings i { width: 22px; height: 36px; border-radius: 11px; background: #3a3a3a; box-shadow: inset -3px 0 0 #6b6b6b; }
        #note { position: absolute; left: 0; top: 0; width: 460px; height: 500px; }
        .fp { position: absolute; width: 230px; height: 250px; box-shadow: inset 0 0 0 2px rgba(120,95,60,.25); }
        .fp span { position: absolute; left: 0; right: 0; top: 88px; text-align: center; font-size: 62px; font-weight: 700; color: #2b2118; white-space: nowrap; }
        #f1 { transform-origin: 0 50%; }
        #f2, #f3 { transform-origin: 50% 0; }
      </style>
      <div id="root" data-composition-id="sm-07-flipbook-fold" data-width="1080" data-height="1920" data-duration="6.5">
        <div class="sk-stage sk-stop sk-kraft-dark">
          <div class="sk-cut" id="pad">
            <div class="pg sk-lined" id="p3"><div class="bar" style="height:300px"></div><div class="wk sk-hand">minggu 4</div><div class="n sk-hand">ramai</div></div>
            <div class="pg sk-lined" id="p2"><div class="bar" style="height:210px"></div><div class="wk sk-hand">minggu 3</div><div class="n sk-hand">naik</div></div>
            <div class="pg sk-lined" id="p1"><div class="bar" style="height:130px"></div><div class="wk sk-hand">minggu 2</div><div class="n sk-hand">mulai</div></div>
            <div class="pg sk-lined" id="p0"><div class="bar" style="height:60px"></div><div class="wk sk-hand">minggu 1</div><div class="n sk-hand">sepi</div></div>
            <div id="rings"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          </div>
          <div class="sk-cut" id="note">
            <div class="fp sk-paper-cream" id="f0" style="left:0;top:0"><span class="sk-hand">catat</span></div>
            <div class="fp sk-paper-cream" id="f1" style="left:230px;top:0"><span class="sk-hand">rapikan</span></div>
            <div class="fp sk-paper-cream" id="f2" style="left:0;top:250px"><span class="sk-hand">otomatis</span></div>
            <div class="fp sk-paper-cream" id="f3" style="left:230px;top:250px"><span class="sk-hand">pantau</span></div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-07-flipbook-fold';
          const $ = SK.finder(ID);
          const step = (t, at) => Math.round(SK.stepTime(t - at, SK.STOP_FPS) * SK.STOP_FPS); // steps since `at`
          // flip-book: each page folds up over the rings in 3 steps and is gone; the next drawing shows
          const FLIP = [0.9, 1.6, 2.3], SQ = [0.7, 0.35, 0.06];
          const padIn = SK.onTwos(M.track(1, [[0.1, 0, [24, 0.7]]]));
          // fold/unfold: the note opens 1 → 2 → 4 panels, each fold in 3 steps from its crease
          const noteIn = SK.onTwos(M.track(1, [[3.1, 0, [24, 0.7]]]));
          const OPEN = [[3.8, 'f1', 'X'], [4.5, 'f2', 'Y'], [4.5, 'f3', 'Y']], GROW = [0.15, 0.5, 0.85];
          SK.clip(ID, { T: 6.5, update: (t) => {
            SK.piece($('pad'), { x: 0, y: 700 * padIn(t), r: -1.5, s: 1.2 }, 190, t, { amp: 1 });
            FLIP.forEach((at, i) => {
              const s = step(t, at);
              const pg = $('p' + i);
              pg.style.opacity = s >= SQ.length ? '0' : '1';
              pg.style.transform = s >= 0 && s < SQ.length ? `scaleY(${SQ[s]})` : 'none';
            });
            const k = noteIn(t);
            SK.piece($('note'), { x: 310, y: 1080 + 900 * k, r: 2, s: 1.25, o: t >= 3.1 ? 1 : 0 }, 191, t, { amp: 1 });
            OPEN.forEach(([at, id, ax]) => {
              const s = step(t, at);
              const g = s < 0 ? 0 : s >= GROW.length ? 1 : GROW[s];
              $(id).style.opacity = g > 0 ? '1' : '0';
              $(id).style.transform = `scale${ax}(${g})`;
            });
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/stop-motion/compositions/sm-08-walk-hinge.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the card text is invented to show the mechanism. In a real clip the words come from the transcript (Gate 2 R1). The figure is built from paper pieces in this clip; the shop is the library cut-out paper.warung-front. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #floor { position: absolute; left: 0; top: 1300px; width: 1080px; height: 620px; }
        #shop { position: absolute; left: 0; top: 0; width: 640px; }
        #fig { position: absolute; left: 0; top: 0; width: 130px; height: 380px; transform-origin: 50% 100%; }
        #fig .pc { position: absolute; }
        #head { left: 20px; top: 0; width: 92px; height: 92px; border-radius: 50%; }
        #head i { position: absolute; top: 38px; width: 10px; height: 12px; border-radius: 5px; background: #2b2118; }
        #torso { left: 18px; top: 86px; width: 96px; height: 160px; border-radius: 34px 34px 16px 16px; background: #2f6f8f; }
        .leg { top: 236px; width: 36px; height: 144px; border-radius: 12px; background: #2b2118; transform-origin: 50% 8px; }
        .arm { top: 98px; width: 30px; height: 124px; border-radius: 14px; background: #285f7b; transform-origin: 50% 12px; }
        #armF { z-index: 3; }
        .brad { position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #c8a24a; box-shadow: inset -2px -2px 0 #8a6d2a; z-index: 4; }
        #card { position: absolute; left: 0; top: 0; width: 540px; height: 190px; }
        #card .cp { position: absolute; inset: 0; }
        #card span { position: absolute; left: 0; right: 0; top: 56px; text-align: center; font-size: 74px; font-weight: 700; color: #2b2118; white-space: nowrap; }
        #cpin { width: 40px; }
      </style>
      <div id="root" data-composition-id="sm-08-walk-hinge" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-kraft">
          <div id="floor" class="sk-kraft-dark"></div>
          <div class="sk-cut sk-obj-warung-front" id="shop"></div>
          <div class="sk-cut" id="card"><div class="cp sk-paper-cream" id="cp"></div><span class="sk-hand">pesan lewat chat</span></div>
          <div class="sk-pin" id="cpin"></div>
          <div class="sk-cut" id="fig">
            <div class="pc arm" id="armB" style="left:14px"></div>
            <div class="pc leg" id="legB" style="left:30px"></div>
            <div class="pc leg" id="legF" style="left:66px"></div>
            <div class="pc" id="torso"></div>
            <div class="pc sk-paper-cream" id="head"><i style="left:34px"></i><i style="left:58px"></i></div>
            <div class="pc arm" id="armF" style="left:88px"></div>
            <div class="brad" style="left:95px;top:102px"></div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-08-walk-hinge';
          const $ = SK.finder(ID);
          $('floor').style.clipPath = SK.torn(1080, 620, 200, { edges: 't', amp: 10 });
          $('cp').style.clipPath = SK.torn(540, 190, 201, { edges: 'trbl', amp: 8 });
          // cutout-walk: the figure crosses on twos; legs and arms swap between 4 replacement poses per step
          const walkX = SK.onTwos((t) => -220 + 430 * M.clamp((t - 0.3) / 2.6)); // steady pace: one stride per 4 steps
          const POSE = [[24, -24, -18], [8, -8, -6], [-24, 24, 18], [-8, 8, 6]];
          const STOP = 2.9;
          // hinge-limb: the front arm turns on its brad to point at the card, with a one-step overshoot
          const ARM = [[3.7, 10], [3.77, -40], [3.83, -95], [3.9, -142], [3.97, -132]];
          const cardIn = SK.onTwos(M.track(1, [[3.2, 0, [24, 0.7]]]));
          SK.clip(ID, { T: 6, update: (t) => {
            const walking = t >= 0.3 && t < STOP;
            const p = walking ? POSE[SK.cycle(t, 4)] : [0, 0, 0];
            const bob = walking && SK.cycle(t, 2) === 1 ? -6 : 0;
            SK.piece($('fig'), { x: walkX(t), y: 1335 - 380 + bob, s: 1.9 }, 202, t, { amp: 1 });
            $('legB').style.transform = `rotate(${p[0]}deg)`;
            $('legF').style.transform = `rotate(${p[1]}deg)`;
            $('armB').style.transform = `rotate(${-p[2]}deg)`;
            let a = walking ? p[2] : 4;
            for (const [at, deg] of ARM) if (t >= at) a = deg;
            $('armF').style.transform = `rotate(${a}deg)`;
            SK.piece($('shop'), { x: 420, y: 750, r: 0 }, 203, t, { amp: 0.6 });
            const k = cardIn(t), on = t >= 3.2 ? 1 : 0;
            SK.piece($('card'), { x: 500, y: 380 - 700 * k, r: 3, o: on }, 204, t);
            SK.piece($('cpin'), { x: 750, y: 348 - 700 * k, o: on }, 205, t, { amp: 0.6 });
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/stop-motion/compositions/sm-09-cut-along.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the cost items are invented to show the mechanism. In a real clip every item comes from the transcript (Gate 2 R1). The scissors are the library cut-out paper.scissors. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #half { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; overflow: hidden; }
        .pc { position: absolute; left: 190px; width: 700px; }
        #top { top: 70px; height: 530px; }
        #bot { top: 600px; height: 190px; border-top: 5px dashed #6b5a44; }
        .pc .tt { position: absolute; left: 60px; top: 50px; font-size: 70px; font-weight: 700; color: var(--sk-accent-2); white-space: nowrap; }
        .pc .it { position: absolute; left: 60px; font-size: 74px; font-weight: 700; color: #2b2118; white-space: nowrap; }
        #bot .it { top: 70px; color: var(--sk-accent); }
        #sc { position: absolute; left: 0; top: 0; width: 240px; z-index: 5; }
      </style>
      <div id="root" data-composition-id="sm-09-cut-along" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-stop">
          <div id="half" class="sk-kraft">
            <div class="pc sk-cut sk-paper-white" id="top">
              <div class="tt sk-hand">biaya bulanan</div>
              <div class="it sk-hand" style="top:170px">sewa</div>
              <div class="it sk-hand" style="top:260px">gaji</div>
              <div class="it sk-hand" style="top:350px">listrik</div>
            </div>
            <div class="pc sk-cut sk-paper-white" id="bot"><div class="it sk-hand">iklan boros</div></div>
            <div class="sk-cut sk-obj-scissors" id="sc"></div>
            <div class="sk-grain" id="grain"></div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-09-cut-along';
          const $ = SK.finder(ID);
          $('top').style.clipPath = SK.torn(700, 530, 210, { edges: 'trl', amp: 7 });
          // cut-along: the scissors travel the dashed line on twos, snipping (±7°) every step
          const ein = (u) => u * u; // ease-in: leaves and falls speed up
          const CUT = [1.1, 2.8], LINE = 600;
          const tipX = SK.onTwos((t) => 120 + 820 * M.clamp((t - CUT[0]) / (CUT[1] - CUT[0])) + 700 * ein(M.clamp((t - 3.0) / 0.5)));
          const enter = SK.onTwos(M.track(1, [[0.5, 0, [22, 0.75]]]));
          // the cut piece drops away in steps once the blades reach the far edge
          const fall = SK.onTwos((t) => ein(M.clamp((t - CUT[1] - 0.1) / 0.6)));
          SK.clip(ID, { T: 5, bg: null, update: (t) => {
            const cutting = t >= CUT[0] && t < CUT[1];
            const snip = cutting ? (SK.cycle(t, 2) ? 7 : -7) : 0;
            SK.piece($('sc'), { x: tipX(t) - 240 - 520 * enter(t), y: LINE - 80, r: snip, o: t >= 0.5 ? 1 : 0 }, 211, t);
            const f = fall(t);
            SK.piece($('bot'), { x: 40 * f, y: 520 * f, r: 14 * f }, 212, t);
            SK.piece($('top'), { x: 0, y: 0, r: -1 }, 213, t, { amp: 0.8 });
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/stop-motion/compositions/sm-10-envelope-depth.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the card text is invented to show the mechanism. In a real clip the words come from the transcript (Gate 2 R1). The envelope is the library cut-out paper.envelope; its flap is the same image clipped to the flap triangle. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .ly { position: absolute; left: -120px; top: 0; width: 1320px; height: 1920px; }
        #far { left: 0; top: 1180px; height: 740px; }
        #near { left: 0; top: 1560px; height: 360px; }
        #scrap { position: absolute; left: 60px; top: 140px; width: 300px; }
        #scrap2 { position: absolute; left: 820px; top: 260px; width: 240px; }
        #env { position: absolute; left: 0; top: 0; width: 720px; height: 520px; }
        #env > div { position: absolute; left: 0; top: 0; width: 720px; height: 520px; }
        #inside { background: #6f5134; clip-path: polygon(0 0, 100% 0, 50% 64%); }
        #flap { clip-path: polygon(0 0, 100% 0, 50% 64%); transform-origin: 50% 0; }
        #body { clip-path: polygon(0 0, 50% 64%, 100% 0, 100% 100%, 0 100%); }
        #env > #card { left: 90px; width: 540px; height: 330px; }
        #card .cp { position: absolute; inset: 0; }
        #card b { position: absolute; left: 0; right: 0; top: 70px; text-align: center; font-size: 88px; color: #2b2118; white-space: nowrap; }
        #card span { position: absolute; left: 0; right: 0; top: 190px; text-align: center; font-size: 66px; font-weight: 700; color: var(--sk-accent); white-space: nowrap; }
        #veil { position: absolute; left: -60px; top: -40px; width: 1200px; height: 2000px; opacity: .82; }
      </style>
      <div id="root" data-composition-id="sm-10-envelope-depth" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-kraft-dark">
          <div class="ly sk-cut" id="lyFar"><div class="ly sk-paper-grey" id="far"></div></div>
          <div class="ly" id="lyMid">
            <div class="sk-cut" id="env" style="left:300px;top:720px">
              <div id="inside"></div>
              <div id="flap" class="sk-obj-envelope"></div>
              <div id="card"><div class="cp sk-paper-cream" id="cp"></div><b class="sk-hand">order baru</b><span class="sk-hand">3 pesanan</span></div>
              <div id="body" class="sk-obj-envelope"></div>
            </div>
          </div>
          <div class="ly sk-cut" id="lyNear">
            <div class="ly sk-kraft-ribbed" id="near"></div>
            <div class="sk-obj-scrap-torn-yellow" id="scrap"></div>
            <div class="sk-obj-scrap-torn-blue" id="scrap2"></div>
          </div>
          <div class="sk-paper-white" id="veil"></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'sm-10-envelope-depth';
          const $ = SK.finder(ID);
          $('far').style.clipPath = SK.torn(1320, 740, 220, { edges: 't', amp: 16, step: 40 });
          $('near').style.clipPath = SK.torn(1320, 360, 221, { edges: 't', amp: 12, step: 26 });
          $('veil').style.clipPath = SK.torn(1200, 2000, 222, { edges: 'b', amp: 22, step: 30 });
          $('cp').style.clipPath = SK.torn(540, 330, 223, { edges: 'trbl', amp: 7 });
          // multiplane-depth: layers drift at different rates (far slow, near fast) on twos; the tissue veil lifts first
          const drift = SK.onTwos((t) => t - 3);
          const veil = SK.onTwos((t) => M.eo(M.clamp((t - 0.25) / 0.9)));
          // envelope-open: the flap turns up over its fold in 6 steps, then the card rises out in steps
          const FLAP = 1.5, FS = [0.62, 0.22, -0.2, -0.58, -0.86, -1];
          const rise = SK.onTwos((t) => M.eo(M.clamp((t - 2.4) / 0.6)));
          SK.clip(ID, { T: 6, update: (t) => {
            const d = drift(t);
            SK.piece($('lyFar'), { x: -5 * d, y: 0 }, 224, t, { amp: 0.5 });
            SK.piece($('lyMid'), { x: -12 * d, y: 0 }, 225, t, { amp: 0.7 });
            SK.piece($('lyNear'), { x: -28 * d, y: 0 }, 226, t, { amp: 1 });
            SK.piece($('veil'), { x: 0, y: -2100 * veil(t), r: -3 * veil(t), o: veil(t) < 1 ? 1 : 0 }, 227, t);
            const s = Math.round(SK.stepTime(t - FLAP, SK.STOP_FPS) * SK.STOP_FPS);
            const fy = s < 0 ? 1 : FS[Math.min(s, FS.length - 1)];
            $('flap').style.transform = `scaleY(${fy})`;
            $('flap').style.filter = fy < 0 ? 'brightness(.82)' : 'none';
            // the card lives inside the pocket: show only the part above the envelope's bottom edge
            const top = 340 - 560 * rise(t);
            $('card').style.top = `${top.toFixed(1)}px`;
            $('card').style.opacity = t >= 2.3 ? '1' : '0';
            $('card').style.clipPath = `inset(0 0 ${Math.max(0, top + 330 - 500).toFixed(1)}px 0)`;
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 2: Append them to the manifest and regenerate the host**

In `docs/agents/references/style-examples/stop-motion/examples.json` replace:

old:
```json
    {"clip": "sm-03-replace-panel", "duration": 5, "treatment": "panel", "stills": [1.8, 4.7]},
    {"clip": "sm-04-stack-crumple", "duration": 6, "treatment": "cutaway", "stills": [2.2, 5.7]}
  ]
```

new:
```json
    {"clip": "sm-03-replace-panel", "duration": 5, "treatment": "panel", "stills": [1.8, 4.7]},
    {"clip": "sm-04-stack-crumple", "duration": 6, "treatment": "cutaway", "stills": [2.2, 5.7]},
    {"clip": "sm-05-string-flip", "duration": 6, "treatment": "cutaway", "stills": [3.4, 4.1, 5.2]},
    {"clip": "sm-06-receipt-scroll", "duration": 6, "treatment": "panel", "stills": [3.3, 5.6]},
    {"clip": "sm-07-flipbook-fold", "duration": 6.5, "treatment": "cutaway", "stills": [1.7, 6.2]},
    {"clip": "sm-08-walk-hinge", "duration": 6, "treatment": "cutaway", "stills": [2.0, 4.8]},
    {"clip": "sm-09-cut-along", "duration": 5, "treatment": "split", "stills": [1.9, 3.3]},
    {"clip": "sm-10-envelope-depth", "duration": 6, "treatment": "cutaway", "stills": [1.1, 4.2]}
  ]
```

Run:

```bash
npm run -s style-examples -- build >/dev/null && npm run -s style-examples -- check
```

Expected: `example hosts are up to date`.

- [ ] **Step 3: Render and look at every new still**

Run:

```bash
npm run check:style-examples -- stop-motion
```

Expected: `0 errors`; stills in `renders/style-examples/stop-motion/`.

Clip-local stills: sm-05 3.4 / 4.1 (card edge-on mid-flip) / 5.2; sm-06 3.3 / 5.6 (receipt fed up out of a till printer, reads top to bottom); sm-07 1.7 (page mid-flip) / 6.2 (4 panels open); sm-08 2.0 (mid-stride) / 4.8 (arm on its brad pointing at the card); sm-09 1.9 (scissors on the dashed line) / 3.3 (piece dropping); sm-10 1.1 (tissue veil lifting) / 4.2 (flap open, card out). Traps found building them: pins in the middle of a card make strings cross the words (pin near a corner; pin a flip card at its centre); a printer at the top prints the receipt upside down in reading order (feed upward); `M.ei` does not exist (use a local `u * u`); a nested `.ly` doubles its offset (inner layers `left: 0`); near-layer drift above ~30 px/s shows the layer edge by the end of a 6 s clip.

- [ ] **Step 4: Document the patterns and examples**

In `docs/agents/references/styles/stop-motion.md` replace:

old:
```md
(`sm-01` … `sm-04`,
```

new:
```md
(`sm-01` … `sm-10`,
```

In `docs/agents/references/styles/stop-motion.md` replace:

old:
```md


## References
```

new:
```md

| **string-connect** | Red string pulled between pinned cards (a detective board) | Linking causes | Each string is pulled across on its linking word, 3–6 steps | string pluck | Straight stiff strings; more than 4 strings | `SK.sagPath` + `SK.draw` via `SK.onTwos` + `.sk-pin` |
| **receipt-print** | A receipt feeds out of a printer line by line | Sales, UMKM transactions | One line per item said; the total on "total" | printer chirp per line | Amounts nobody said; a smooth receipt without steps | `.sk-obj-receipt-blank` + `.sk-mono` lines; strip `y` via `SK.onTwos` |
| **flip-book** | A notebook corner flips 3–5 pages; the drawing changes | Gradual change over time | One page per stage, 2–3 steps per flip | paper flick | More than 5 pages; drawings without a clear change | stacked pages, each `scaleY` 1 → .06 on twos, then hidden |
| **cutout-walk** | A paper figure walks across, legs swapping pose every step | A customer journey, "si owner datang ke…" | Walks over the phrase; stops at the destination | paper tap per step | Gliding without leg poses; walking longer than 2 s | paper-piece figure + `SK.cycle(t, 4)` poses + `SK.onTwos` x + `SK.piece` |
| **cut-along** | Scissors cut a dashed line; the piece comes loose and drops | Cutting a cost or a step | The scissors travel over the verb; the piece drops at its end | scissor snip | Cutting without a dashed line; smooth scissors without steps | `.sk-obj-scissors` along the line via `SK.onTwos`, ±7° per step (`SK.cycle`) |
| **envelope-open** | The envelope flap opens and a card rises out | Messages, notifications, "ada order masuk" | Flap opens on the lead-in word; the card rises on its content | paper slide | An empty card; an opened envelope with nothing said | `.sk-obj-envelope` twice (body without the flap, flap `scaleY` 1 → −1 on twos) + card between |

## References
```

In `docs/agents/references/styles/stop-motion.md` replace:

old:
```md
- The host must load `vendor/paper-pack/paper-pack.css` after `style-kit.css`
  (the Dena starter does).
```

new:
```md
- The host must load `vendor/paper-pack/paper-pack.css` after `style-kit.css`
  (the Dena starter does).
- Step-indexed moves (flip-card, flip-book, fold/unfold, envelope-open) read the
  step since a word as `Math.round(SK.stepTime(t - at, SK.STOP_FPS) * SK.STOP_FPS)`
  and look the pose up in a short array; never tween between the poses.
- A figure is plain paper pieces (divs) with `transform-origin` at each joint and
  a brad (a small gold circle) on the joint; `SK.cycle(t, 4)` picks the leg pose
  (`sm-08`). Library cut-outs are `.sk-obj-*` divs (`.sk-obj-scissors`,
  `.sk-obj-envelope`, `.sk-obj-warung-front`).
```

In `docs/agents/references/styles/stop-motion.md` replace:

old:
```md
| crumple-away | paper crumple | 0.12–0.16 |
```

new:
```md
| crumple-away | paper crumple | 0.12–0.16 |
| string-connect, cut-along | string pluck / scissor snip | 0.08–0.12 |
| receipt-print, flip-book, envelope-open | printer chirp / paper flick / paper slide | 0.08–0.12 |
| cutout-walk | paper tap per step | 0.06–0.1 |
```

In `docs/agents/references/styles/stop-motion.md` replace:

old:
```md
| `style-examples/stop-motion/compositions/sm-04-stack-crumple.html` | stack-pile + crumple-away + slide-on-twos + tape-on | cutaway |
```

new:
```md
| `style-examples/stop-motion/compositions/sm-04-stack-crumple.html` | stack-pile + crumple-away + slide-on-twos + tape-on | cutaway |
| `style-examples/stop-motion/compositions/sm-05-string-flip.html` | string-connect + flip-card on a pinned board | cutaway |
| `style-examples/stop-motion/compositions/sm-06-receipt-scroll.html` | receipt-print + paper-scroll from a till printer | panel |
| `style-examples/stop-motion/compositions/sm-07-flipbook-fold.html` | flip-book + fold/unfold (1 → 2 → 4 panels) | cutaway |
| `style-examples/stop-motion/compositions/sm-08-walk-hinge.html` | cutout-walk + hinge-limb at the library warung | cutaway |
| `style-examples/stop-motion/compositions/sm-09-cut-along.html` | cut-along with the library scissors | split |
| `style-examples/stop-motion/compositions/sm-10-envelope-depth.html` | envelope-open + multiplane-depth with a tissue veil | cutaway |
```

In `docs/agents/references/styles/stop-motion.md` replace:

old:
```md
| Grounds | `texture.cardboard`,
```

new:
```md
| Props | `paper.scissors`, `paper.envelope`, `paper.receipt-blank`, `paper.notebook-strip` | `../asset-catalog/sheets/paper-1.webp`, `../asset-catalog/sheets/paper-2.webp` |
| Grounds | `texture.cardboard`,
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/agents/references/style-examples/stop-motion docs/agents/references/styles/stop-motion.md && git status --short && git commit -q -F - <<'MSG'
feat: stop-motion examples for all 20 patterns (string, receipt, flip-book, walk, scissors, envelope)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 5: Coverage for whiteboard and stop-motion, old stills, final verification

**Files:**
- Modify: `scripts/style-docs.test.mjs` (`COVERED`), `docs/superpowers/specs/2026-09-28-pattern-examples-2b-design.md` (status)

- [ ] **Step 1: Cover the two styles in the pattern test**

In `scripts/style-docs.test.mjs` replace:

old:
```js
// Sub-project 2 coverage: in these styles every pattern has at least one rendered example
// (spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md). 2b and 2c add styles here.
const COVERED = ['broll-text.md', 'motion-graphic.md'];
for (const file of COVERED) {
```

new:
```js
// Sub-project 2 coverage: in these styles every pattern has at least one rendered example
// (specs: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md, …-2b-design.md). 2c adds the rest.
const COVERED = ['broll-text.md', 'motion-graphic.md', 'whiteboard.md', 'stop-motion.md'];
for (const file of COVERED) {
```

In `docs/superpowers/specs/2026-09-28-pattern-examples-2b-design.md` replace:

old:
```md
Status: approved (brainstorming 2026-09-28), belum diimplementasi
```

new:
```md
Status: implemented 2026-09-28 (plan `docs/superpowers/plans/2026-09-28-pattern-examples-2b.md`)
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)|every pattern"
```

Expected: four `every pattern has an example` tests pass; `pass 101`, `fail 0`.

- [ ] **Step 2: Prove the old stills did not change**

Create `/tmp/examples-2b/samecheck.cjs`:

```js
// old stills of a host vs the baseline: identical, or ≤ 1 per channel on ≤ 0.001% of values
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [base, cur, n] = [process.argv[2], process.argv[3], Number(process.argv[4])];
const raw = (f) => execFileSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1e8 });
const frames = fs.readdirSync(base).filter((f) => f.startsWith('frame-')).sort();
let same = 0, near = 0; const bad = [];
if (frames.length !== n) bad.push(`baseline has ${frames.length} frames, expected ${n}`);
for (const f of frames) {
  const a = path.join(base, f), b = path.join(cur, f);
  if (!fs.existsSync(b)) { bad.push(`${f} missing`); continue; }
  if (Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0) { same++; continue; }
  const x = raw(a), y = raw(b); let k = 0, mx = 0;
  for (let i = 0; i < x.length; i++) { const d = Math.abs(x[i] - y[i]); if (d) { k++; mx = Math.max(mx, d); } }
  if (mx <= 1 && k <= x.length * 1e-5) near++; else bad.push(`${f}: ${k} values, max ${mx}`);
}
console.log(`identical ${same}, within ±1 ${near}, different ${bad.length}`, bad);
process.exit(bad.length ? 1 : 0);
```

Run:

```bash
npm run -s check:style-examples -- whiteboard && npm run -s check:style-examples -- stop-motion && node /tmp/examples-2b/samecheck.cjs /tmp/examples-2b/baseline/whiteboard renders/style-examples/whiteboard 11 && node /tmp/examples-2b/samecheck.cjs /tmp/examples-2b/baseline/stop-motion renders/style-examples/stop-motion 8
```

Expected: `identical 11, within ±1 0, different 0 []` and `identical 8, within ±1 0, different 0 []` (new clips are appended, so old clips keep their start times and frame numbers).

- [ ] **Step 3: Run everything**

Run:

```bash
for s in test:style-kit test:asset-lib test:motion-kit test:video test:repliz test:render-blur; do npm run -s $s 2>&1 | grep -E "^ℹ fail"; done && npm run -s style-examples -- check && npm run -s asset-lib -- check
```

Expected: six `ℹ fail 0` lines, `example hosts are up to date`, asset library up to date.

Run:

```bash
npm run check:style-examples && npm run check
```

Expected: all seven hosts `0 errors`; root check `0 errors`.

- [ ] **Step 4: Commit**

Run:

```bash
git add scripts/style-docs.test.mjs docs/superpowers/specs/2026-09-28-pattern-examples-2b-design.md && git status --short && git commit -q -F - <<'MSG'
test: every whiteboard and stop-motion pattern has an example

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

Run:

```bash
git status --short && git log --oneline main..HEAD | cat
```

Expected: clean tree; spec, plan, and five task commits. Do not push; ask Dena before merging to `main`.

