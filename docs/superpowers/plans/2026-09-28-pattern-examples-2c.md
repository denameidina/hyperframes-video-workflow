# Pattern Examples 2c (Style Enrichment, Sub-project 2c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VOX +5, mix-media +5, and parallax +6 patterns (20 each), twenty new examples so every pattern of every style has a rendered example (coverage test over all seven styles), one helper (`SK.handheld`), and host support for placed and punched speaker layers (`cutouts`, `punch`).

**Architecture:** Built on the per-style example hosts (ADR-0017). New compositions go in `docs/agents/references/style-examples/<style>/compositions/`, one line each is appended to that style's `examples.json`, and `npm run style-examples -- build` regenerates the host. The generator gains two optional manifest fields for the mix-media recipes that need host code; hosts that do not use them stay byte-identical, and appending keeps every old clip's start time, so old stills must not change.

**Tech Stack:** HyperFrames 0.7.24 (pinned `npx`), GSAP + motion-kit + style-kit + asset-lib (vendored, including the five layered scene kits), Node 22+ built-ins, `ffmpeg` (pixel proof).

**Spec:** `docs/superpowers/specs/2026-09-28-pattern-examples-2c-design.md`

**Evidence:** Every block below was written and run in a scratch copy of the repo on 2026-09-28 (`scratchpad/dev4/repo`): `SK.handheld` and the generator fields test first; all 20 new examples were rendered and looked at, and fixed where the stills showed a problem (traps listed per task); the three hosts lint and validate with 0 errors; the 25 old VOX, mix-media, and parallax stills are **byte-identical** to a render from `main`; `test:style-kit` 106/106 and `test:asset-lib` 29/29. The plan was then replayed op by op in a clean clone of `feat/examples-2c` (renders skipped): every replacement matched exactly once, every commit left a clean tree, and the final files equal the tested copy.

## Global Constraints

- No npm dependencies (ADR-0007); HyperFrames is always `npx --yes hyperframes@0.7.24`.
- Never edit a host's generated `index.html` or `snapshots.json`; append to `examples.json` and run `npm run style-examples -- build`.
- Old examples stay pixel-identical (identical, or ≤ 1 per channel on ≤ 0.001% of values); never touch old compositions.
- Clip rules: never set `visibility`; never name a `font-family` in a clip `<style>`; never write `../` in a url; never build a selector from a template literal; no `!important`.
- VOX: every `SK.doc` shows "Ilustrasi" (keep a fixed tag in frame when a push crops it); no real brand, person, or number; private details redacted from their first visible frame. Mix-media: keep the face zone (x 300–780, y 780–1320) clear; never filter the speaker video. Parallax: stay inside the Depth Budget; never blur text.
- Example words and numbers are made up and marked "Example only"; archival material only from the public-domain photo already listed in `THIRD_PARTY_NOTICES.md`.
- Stage files with explicit paths only, never `git add -A`.
- Docs language: `docs/agents/**` English; `internal/docs/**` Indonesian. RD-03-56 changes wording (all styles); ADR-0017 gets an amendment for the new fields.
- Replacement steps give exact **old** and **new** blocks; each old block must match exactly once — if not, stop and re-read the file. "Append" means add the block at the end of the file.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- The `rtk` hook rewrites `grep` with parentheses or `cat` of JSON; use `rtk proxy grep -F …` or `rtk proxy cat …`. `npm run` and `node` are unaffected.
- Do not push. Merge to local `main` only after Dena approves.

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `vendor/style-kit/style-kit.js`, `scripts/style-kit.test.mjs` | Modify | `SK.handheld` |
| `scripts/lib/style-examples.mjs`, `scripts/style-examples.test.mjs` | Modify | `cutouts`, `punch` |
| `docs/agents/references/style-examples/{vox,mix-media,parallax}/**` | Create/Modify | 20 compositions (+3 front layers), manifests, generated hosts |
| `docs/agents/references/styles/{vox,mix-media,parallax}.md`, `styles/README.md` | Modify | 16 pattern rows, recipes, SFX, examples, Build Contract |
| `scripts/style-docs.test.mjs` | Modify | `COVERED` = every style |
| `internal/docs/adr/0017-per-style-example-hosts.md`, `internal/docs/requirements/rd-03-video-editing-workflow.md` | Modify | ADR amendment, RD-03-56 |

---

### Task 0: Preflight and pixel baseline

**Files:** none (checks only)

- [ ] **Step 1: Confirm the branch and a clean tree**

Run:

```bash
git branch --show-current && git status --short
```

Expected: `feat/examples-2c` and no status output.

- [ ] **Step 2: Render the VOX, mix-media, and parallax hosts before anything changes**

Run:

```bash
mkdir -p /tmp/examples-2c && for s in vox mix-media parallax; do npm run -s check:style-examples -- $s || exit 1; done && rm -rf /tmp/examples-2c/baseline && mkdir -p /tmp/examples-2c/baseline && cp -R renders/style-examples/vox renders/style-examples/mix-media renders/style-examples/parallax /tmp/examples-2c/baseline/ && ls /tmp/examples-2c/baseline/*/frame-*.png | wc -l
```

Expected: three hosts `0 errors`, then `25` (VOX 8, mix-media 8, parallax 9). Task 6 compares against `/tmp/examples-2c/baseline`.

---

### Task 1: `SK.handheld`

**Files:**
- Modify: `scripts/style-kit.test.mjs`, `vendor/style-kit/style-kit.js`

**Interfaces:**
- Produces: `SK.handheld(t, seed = 1, { amp = 6 })` → `{ x, y, r }`: three seeded sines per axis (0.2–0.9 Hz), `|x|, |y| ≤ amp` px, `|r| ≤ amp × 0.05` deg; smooth (no jumps), the same for a seed, different across seeds.

- [ ] **Step 1: Write the failing test**

Append to `scripts/style-kit.test.mjs`:

```js
test('handheld drifts smoothly within amp, the same for a seed and different across seeds', () => {
  const { SK } = load();
  const plain = (o) => JSON.parse(JSON.stringify(o));
  assert.deepEqual(plain(SK.handheld(2.5, 7)), plain(SK.handheld(2.5, 7)));
  assert.notDeepEqual(plain(SK.handheld(2.5, 7)), plain(SK.handheld(2.5, 8)));
  let prev = SK.handheld(0, 3, { amp: 10 }), moved = 0;
  for (let i = 1; i <= 300; i++) {
    const p = SK.handheld(i / 30, 3, { amp: 10 });
    assert.ok(Math.abs(p.x) <= 10 && Math.abs(p.y) <= 10 && Math.abs(p.r) <= 0.5, `frame ${i} out of range`);
    assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) < 2, `frame ${i} jumps`);
    moved = Math.max(moved, Math.hypot(p.x, p.y));
    prev = p;
  }
  assert.ok(moved > 3, 'it actually drifts');
});
```

Run:

```bash
node --test scripts/style-kit.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 1` (`SK.handheld is not a function`).

- [ ] **Step 2: Implement it after `SK.sagPath`**

In `vendor/style-kit/style-kit.js` replace:

old:
```js
};
})();
```

new:
```js
};
/* handheld: a smooth camera drift like a hand-held shot — three seeded sines per axis (0.2–0.9 Hz),
   |x|, |y| ≤ amp px and |r| ≤ amp × 0.05 deg. Unlike SK.boil it never jumps; same seed, same drift. */
SK.handheld = (t,seed=1,o={})=>{
  const amp=o.amp??6, r=SK.rng(mix(seed,41)), w=()=>({f:0.2+r()*0.7, p:r()*6.2832});
  const W=[[w(),w(),w()],[w(),w(),w()],[w(),w(),w()]], k=[0.5,0.3,0.2];
  const s=(ax)=>ax.reduce((v,{f,p},i)=>v+k[i]*Math.sin(t*f*6.2832+p),0);
  return {x:amp*s(W[0]), y:amp*s(W[1]), r:amp*0.05*s(W[2])};
};
})();
```

- [ ] **Step 3: Run the tests**

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `pass 102`, `fail 0`.

- [ ] **Step 4: Commit**

Run:

```bash
git add scripts/style-kit.test.mjs vendor/style-kit/style-kit.js && git status --short && git commit -q -F - <<'MSG'
feat: SK.handheld camera drift

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 2: Host speaker layers — `cutouts` and `punch`

**Files:**
- Modify: `scripts/style-examples.test.mjs`, `scripts/lib/style-examples.mjs`
- Modify: `docs/agents/references/styles/README.md` (Build Contract), `internal/docs/adr/0017-per-style-example-hosts.md` (amendment)

**Interfaces:**
- Produces (manifest, per example): `cutouts: [{ x, y, s, at }]` — one or two matted speakers (px offsets, scale about the feet, clip-local pop-in second); the first on track 6 with id `<xx-NN>-cut`, the second on track 5 with id `<xx-NN>-cut2`; not together with `cutout: true`. `punch: [[at, scale]]` — the host steps `#<xx-NN>-cut` to `scale` in 0.1 s (`steps(2)`) at `start + at` and back to 1 in 0.3 s (`steps(3)`) at `start + at + 0.12`; needs a cutout, `at + 0.4 ≤ duration`, `1 < scale ≤ 1.25`. Hosts without these fields are byte-identical.

- [ ] **Step 1: Write the failing tests**

In `scripts/style-examples.test.mjs` replace:

old:
```js

test('checkManifest rejects a wrong prefix, an unknown treatment, and stills outside the clip', () => {
```

new:
```js

test('cutouts place several speaker layers and punch steps the first one in and out', () => {
  const html = hostHtml({ style: 'mix-media', examples: [
    { clip: 'mm-01-a', duration: 5, treatment: 'collage', stills: [1], cutouts: [{ x: -240, s: 0.8 }, { x: 240, s: 0.8, at: 2 }] },
    { clip: 'mm-02-b', duration: 4, treatment: 'collage', stills: [1], cutout: true, punch: [[2, 1.15]] },
  ] });
  assert.match(html, /<video id="mm-01-cut" [^>]*style="transform-origin: 50% 100%; transform: translate\(-240px, 0px\) scale\(0\.8\)"/);
  assert.match(html, /<video id="mm-01-cut2" [^>]*style="transform-origin: 50% 100%; transform: translate\(240px, 0px\) scale\(0\.8\)"\s+data-start="2\.5" data-duration="3" data-track-index="5"/);
  assert.match(html, /<video id="mm-02-cut" class="clip cutout sk-sticker-cut" src="assets\/placeholder-cutout\.webm" muted playsinline\n/);
  assert.match(html, /tl\.to\('#mm-02-cut', \{ scale: 1\.15, transformOrigin: '50% 60%', duration: 0\.1, ease: 'steps\(2\)' \}, 8\);/);
  assert.match(html, /tl\.to\('#mm-02-cut', \{ scale: 1, duration: 0\.3, ease: 'steps\(3\)' \}, 8\.12\);/);
  const ok = { clip: 'mm-01-a', duration: 4, treatment: 'collage', stills: [1] };
  assert.throws(() => checkManifest({ style: 'mix-media', examples: [{ ...ok, punch: [[1, 1.1]] }] }), /punch needs a cutout/);
  assert.throws(() => checkManifest({ style: 'mix-media', examples: [{ ...ok, cutout: true, punch: [[3.8, 1.1]] }] }), /punch needs/);
  assert.throws(() => checkManifest({ style: 'mix-media', examples: [{ ...ok, cutout: true, cutouts: [{}] }] }), /either cutout: true or a cutouts list of one or two/);
  assert.throws(() => checkManifest({ style: 'mix-media', examples: [{ ...ok, cutouts: [{}, {}, {}] }] }), /one or two/);
  assert.throws(() => checkManifest({ style: 'mix-media', examples: [{ ...ok, cutouts: [{ at: 4 }] }] }), /at must be inside/);
});

test('checkManifest rejects a wrong prefix, an unknown treatment, and stills outside the clip', () => {
```

Run:

```bash
node --test scripts/style-examples.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 1` (the new host test).

- [ ] **Step 2: Extend the generator**

In `scripts/lib/style-examples.mjs` replace:

old:
```js
    if (!e.stills?.length || e.stills.some((s) => !(s >= 0 && s < e.duration))) throw new Error(`${e.clip}: stills must be clip-local times inside the clip`);
  }
```

new:
```js
    if (!e.stills?.length || e.stills.some((s) => !(s >= 0 && s < e.duration))) throw new Error(`${e.clip}: stills must be clip-local times inside the clip`);
    if (e.cutouts && (e.cutout || !Array.isArray(e.cutouts) || !e.cutouts.length || e.cutouts.length > 2)) throw new Error(`${e.clip}: use either cutout: true or a cutouts list of one or two`);
    if (cutouts(e).some((c) => c.at != null && !(c.at >= 0 && c.at < e.duration))) throw new Error(`${e.clip}: a cutout's at must be inside the clip`);
    if (e.punch && (!cutouts(e).length || e.punch.some(([at, s]) => !(at >= 0 && at + 0.4 <= e.duration && s > 1 && s <= 1.25)))) throw new Error(`${e.clip}: punch needs a cutout, times that end inside the clip, and scales in (1, 1.25]`);
  }
```

In `scripts/lib/style-examples.mjs` replace:

old:
```js
const cutId = (clip) => clip.split('-').slice(0, 2).join('-') + '-cut';

```

new:
```js
const cutId = (clip) => clip.split('-').slice(0, 2).join('-') + '-cut';
// matted speaker layers: cutout: true is one full-frame layer; cutouts: [{ x, y, s, at }] places several
// (x/y px offsets, s scale about the feet, at = clip-local second it pops in), e.g. split-self.
// The first is on track 6, a second on track 5 (a track holds one clip at a time; stacking is CSS z-index).
const cutouts = (e) => e.cutouts ?? (e.cutout ? [{}] : []);

```

In `scripts/lib/style-examples.mjs` replace:

old:
```js
    mount(e.clip, 'broll', e.start, e.duration, 4),
    ...(e.cutout ? [`      <video id="${cutId(e.clip)}" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline
             data-start="${e.start}" data-duration="${e.duration}" data-track-index="6"></video>`] : []),
    ...(e.front ? [mount(e.clip + '-front', 'broll-front', e.start, e.duration, 7)] : []),
```

new:
```js
    mount(e.clip, 'broll', e.start, e.duration, 4),
    ...cutouts(e).map((c, i) => {
      const place = c.x || c.y || (c.s ?? 1) !== 1 ? ` style="transform-origin: 50% 100%; transform: translate(${c.x ?? 0}px, ${c.y ?? 0}px) scale(${c.s ?? 1})"` : '';
      return `      <video id="${cutId(e.clip)}${i ? i + 1 : ''}" class="clip cutout sk-sticker-cut" src="assets/placeholder-cutout.webm" muted playsinline${place}
             data-start="${r3(e.start + (c.at ?? 0))}" data-duration="${r3(e.duration - (c.at ?? 0))}" data-track-index="${6 - i}"></video>`;
    }),
    ...(e.front ? [mount(e.clip + '-front', 'broll-front', e.start, e.duration, 7)] : []),
```

In `scripts/lib/style-examples.mjs` replace:

old:
```js
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, ${r3(e.start + e.duration - 0.45)});`).join('\n');
  return `<!doctype html>
```

new:
```js
      tl.to('#base-video', { y: 0, duration: 0.45, ease: 'power3.inOut' }, ${r3(e.start + e.duration - 0.45)});`).join('\n');
  // zoom-punch-cutout: the speaker layer punches in on the word in 2 steps and backs out in 3 (mix-media.md);
  // the way back starts 0.02 s after the way in ends (touching tweens trip the linter's overlap check)
  const punches = clips.flatMap((e) => (e.punch ?? []).map(([at, sc]) => `      tl.to('#${cutId(e.clip)}', { scale: ${sc}, transformOrigin: '50% 60%', duration: 0.1, ease: 'steps(2)' }, ${r3(e.start + at)});
      tl.to('#${cutId(e.clip)}', { scale: 1, duration: 0.3, ease: 'steps(3)' }, ${r3(e.start + at + 0.12)});`)).join('\n');
  return `<!doctype html>
```

In `scripts/lib/style-examples.mjs` replace:

old:
```js
      const tl = gsap.timeline({ paused: true });
${tweens ? `      // Split treatment: slide the base video into the bottom half for the clip, then back.\n${tweens}\n` : ''}      // Collage and parallax-stage clips are opaque full-frame backdrops; never tween #base-video opacity.
      window.__timelines['style-examples-${m.style}'] = tl;
```

new:
```js
      const tl = gsap.timeline({ paused: true });
${tweens ? `      // Split treatment: slide the base video into the bottom half for the clip, then back.\n${tweens}\n` : ''}${punches ? `      // Zoom-punch: step the matted speaker in and back out on the peak word.\n${punches}\n` : ''}      // Collage and parallax-stage clips are opaque full-frame backdrops; never tween #base-video opacity.
      window.__timelines['style-examples-${m.style}'] = tl;
```

Two lessons are encoded here: a HyperFrames track holds one clip at a time (a second full-length speaker on track 6 fails lint `overlapping_clips_same_track`), and two tweens that touch at the same second trip `overlapping_gsap_tweens` (hence the 0.02 s gap).

- [ ] **Step 3: Document the fields**

In `docs/agents/references/styles/README.md` replace:

old:
```md
  `duration`, `treatment`, clip-local `stills`, optional `cutout` / `front`); never
```

new:
```md
  `duration`, `treatment`, clip-local `stills`, optional `cutout` / `cutouts` / `punch` /
  `front`; see `mix-media.md`); never
```

In `internal/docs/adr/0017-per-style-example-hosts.md` replace:

old:
```md
- Tata letak tetap: clip pertama 0,5 s, jeda 0,5 s; split menggeser
  `#base-video` 480 px; cutout (track 6) dan front (track 7) dari flag manifest.
```

new:
```md
- Tata letak tetap: clip pertama 0,5 s, jeda 0,5 s; split menggeser
  `#base-video` 480 px; cutout (track 6) dan front (track 7) dari flag manifest.
- Tambahan 2c (resep mix-media yang butuh host): `cutouts: [{ x, y, s, at }]`
  menaruh satu atau dua potongan (yang kedua di track 5, karena satu track hanya
  boleh satu klip sekaligus) dan `punch: [[at, skala]]` men-tween potongan
  pertama masuk 2 langkah dan keluar 3 langkah, 0,02 s setelahnya (tween yang
  bersentuhan memicu peringatan linter). Host tanpa field ini tidak berubah.
```

- [ ] **Step 4: Run the tests; old hosts must not change**

Run:

```bash
node --test scripts/style-examples.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)" && npm run -s style-examples -- check
```

Expected: `pass 7`, `fail 0`, then `example hosts are up to date`.

- [ ] **Step 5: Commit**

Run:

```bash
git add scripts/style-examples.test.mjs scripts/lib/style-examples.mjs docs/agents/references/styles/README.md internal/docs/adr/0017-per-style-example-hosts.md && git status --short && git commit -q -F - <<'MSG'
feat: example hosts place several speakers and punch them in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 3: Seven VOX examples and five new patterns

**Files:**
- Create: `docs/agents/references/style-examples/vox/compositions/vx-05-chat-redact.html`, `docs/agents/references/style-examples/vox/compositions/vx-06-cell-underline.html`, `docs/agents/references/style-examples/vox/compositions/vx-07-search-arrow.html`, `docs/agents/references/style-examples/vox/compositions/vx-08-timeline-pinned.html`, `docs/agents/references/style-examples/vox/compositions/vx-09-loupe-before-after.html`, `docs/agents/references/style-examples/vox/compositions/vx-10-quote-split.html`, `docs/agents/references/style-examples/vox/compositions/vx-11-archival-pan.html`
- Modify: `docs/agents/references/style-examples/vox/examples.json`; generated `index.html`, `snapshots.json`
- Modify: `docs/agents/references/styles/vox.md` (header range, Patterns, Build Recipe, SFX, Examples)

- [ ] **Step 1: Write the example compositions**

Every clip follows the example rules: "Example only" comment (made-up words and numbers), one `SK.clip`, a pure function of `t`, no `visibility`, no `font-family` in the clip `<style>`, no `../` in a url, no template-literal selectors, no `!important`.

Create `docs/agents/references/style-examples/vox/compositions/vx-05-chat-redact.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: an illustrative chat (tagged "Ilustrasi"; no real person, shop, or number) with invented messages, to show the mechanism. In a real clip the quoted messages are verbatim from the transcript or a real capture; private details are redacted from the first frame they appear. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #cam { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform-origin: 0 0; }
        #sheet { position: absolute; left: 110px; top: 640px; }
        #sheet .sk-docx { font-size: 42px; }
        #sheet .sk-doc-msg b { font-size: 26px; }
        .hlw { position: relative; }
        #hl { left: -6px; right: -6px; top: 8%; bottom: 0; }
        #rd { left: -4px; right: -4px; top: 4%; bottom: 4%; }
      </style>
      <div id="root" data-composition-id="vx-05-chat-redact" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-vox sk-paper-cream">
          <div id="cam"><div id="sheet" class="sk-cut"></div></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-05-chat-redact';
          const $ = SK.finder(ID);
          $('sheet').innerHTML = SK.doc('chat-thread', { messages: [
            { from: 'Pelanggan', text: 'Kak, pesanan saya belum sampai?' },
            { from: 'Admin', side: 'r', text: 'Maaf kak, lagi dicek ya' },
            { from: 'Pelanggan', text: 'Nomor saya ' },
            { from: 'Pelanggan', text: 'Tolong dibalas, sudah 3 hari' },
          ] }, { w: 860 });
          const msgs = [...$('sheet').querySelectorAll('.sk-doc-msg')];
          // redact-bar: the private number is covered from the first frame its message is visible
          msgs[2].insertAdjacentHTML('beforeend', '<span class="hlw"><span class="sk-redact" id="rd"></span>0812 0000 0000</span>');
          // the key phrase gets the highlighter
          msgs[3].innerHTML = '<b>Pelanggan</b>Tolong dibalas, <span class="hlw"><span class="sk-hl" id="hl"></span>sudah 3 hari</span>';
          // chat-reveal: one message per quoted line
          const AT = [0.4, 1.3, 2.2, 3.1];
          const push = SK.onTwos(M.track(1, [[3.6, 1.18, M.SLOW]]));
          SK.clip(ID, { T: 6, update: (t) => {
            SK.cam($('cam'), push(t), 540, 1020);
            msgs.forEach((m, i) => SK.enter(m, t - AT[i], 'rise', { dy: 30 }));
            SK.highlight($('rd'), t >= AT[2] ? 1 : 0);
            SK.highlight($('hl'), SK.smooth((t - 3.9) / 0.45));
            SK.grain($('grain'), t, 2);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/vox/compositions/vx-06-cell-underline.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: an illustrative spreadsheet (tagged "Ilustrasi") with invented numbers, to show the mechanism. In a real clip the highlighted number is the one said in the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #half { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; overflow: hidden; }
        #cam { position: absolute; left: 0; top: 0; width: 1080px; height: 960px; transform-origin: 0 0; }
        #sheet { position: absolute; left: 90px; top: 190px; }
        #sheet .sk-doc-grid { table-layout: fixed; margin: 0; }
        #sheet .sk-doc-grid th, #sheet .sk-doc-grid td { height: 64px; padding: 0 14px; font-size: 34px; box-sizing: border-box; }
        #sheet .sk-doc-grid tr > :first-child { width: 64px; }
        #hlc { position: absolute; opacity: 0; background: #ffe14d; mix-blend-mode: multiply; }
        #ink { position: absolute; left: 0; top: 0; overflow: visible; }
        #tag { right: 40px; bottom: 40px; top: auto; } /* the document's own tag leaves the frame during the push; this one stays (RD-03-54) */
      </style>
      <div id="root" data-composition-id="vx-06-cell-underline" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-vox">
          <div id="half" class="sk-paper-cream">
            <div id="cam">
              <div id="sheet" class="sk-cut"></div>
              <div id="hlc"></div>
              <svg id="ink" width="1080" height="960"></svg>
            </div>
            <div class="sk-grain" id="grain"></div>
            <div class="sk-tag" id="tag">Ilustrasi</div>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-06-cell-underline';
          const $ = SK.finder(ID);
          $('sheet').innerHTML = SK.doc('spreadsheet', {
            columns: ['Bulan', 'Order', 'Omzet'],
            rows: [['Jan', '120', 'Rp 18 jt'], ['Feb', '135', 'Rp 20 jt'], ['Mar', '210', 'Rp 31 jt'], ['Apr', '190', 'Rp 28 jt']],
          }, { w: 900 });
          // fixed geometry (table-layout: fixed): padding 48, index column 64, three equal columns, rows of 64
          const W = (900 - 96 - 64) / 3, H = 64, X = 90 + 48 + 64 + W, Y = 190 + 48 + H * 3;
          Object.assign($('hlc').style, { left: `${X}px`, top: `${Y}px`, width: `${W}px`, height: `${H}px` });
          // pen-underline: a wavy red line under the number
          let d = `M${X + 14} ${Y + H - 8}`;
          for (let i = 1; i <= 8; i++) d += ` Q${X + 14 + i * 10 - 5} ${Y + H - 8 + (i % 2 ? -7 : 7)} ${X + 14 + i * 10} ${Y + H - 8}`;
          $('ink').innerHTML = `<path id="ul" d="${d}" fill="none" stroke="var(--sk-accent-2)" stroke-width="5" stroke-linecap="round"/>`;
          const inY = SK.onTwos(M.track(1, [[0.1, 0, [16, 0.8]]]));
          // cell-zoom: a stepped push into the cell on its number word
          const push = SK.onTwos(M.track(1, [[1.3, 1.7, M.SLOW]]));
          const fx = SK.onTwos(M.track(540, [[1.3, X + W / 2, M.SLOW]])), fy = SK.onTwos(M.track(480, [[1.3, Y + H / 2, M.SLOW]]));
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            SK.cam($('cam'), push(t), fx(t), fy(t), 1080, 960);
            SK.piece($('sheet'), { x: 0, y: 900 * inY(t), r: 0 }, 70, t, { amp: 0.6 });
            SK.highlight($('hlc'), SK.smooth((t - 2.3) / 0.35));
            SK.draw($('ul'), SK.smooth((t - 3.2) / 0.3));
            SK.grain($('grain'), t, 2);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/vox/compositions/vx-07-search-arrow.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: an illustrative results page (tagged "Ilustrasi"; no real search engine or site) with invented results, to show the mechanism. In a real clip the query is the one Dena says, and a real results page is a capture with its source line. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #sheet { position: absolute; left: 50px; top: 620px; }
        #sheet .sk-docx { font-size: 36px; }
        #sheet .sk-doc-search { min-height: 52px; font-size: 40px; }
        #sheet .sk-doc-rtitle { font-size: 50px; }
        #ink { position: absolute; left: 0; top: 0; }
        #lab { position: absolute; left: 860px; top: 772px; font-size: 64px; font-weight: 700; color: var(--sk-accent-2); white-space: nowrap; }
      </style>
      <div id="root" data-composition-id="vx-07-search-arrow" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-vox sk-paper-cream">
          <div id="sheet" class="sk-cut"></div>
          <svg class="sk-full" viewBox="0 0 1080 1920" width="1080" height="1920" id="ink"></svg>
          <div id="lab" class="sk-hand">yang ini</div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-07-search-arrow';
          const $ = SK.finder(ID);
          $('sheet').innerHTML = SK.doc('search-results', { query: '', results: [
            { title: 'Rekap stok otomatis', snippet: 'Langkah membuat rekap stok harian…' },
            { title: 'Template stok gratis', snippet: 'Salin template, isi, selesai…' },
            { title: '5 aplikasi kasir', snippet: 'Perbandingan fitur dan harga…' },
          ] }, { w: 800 });
          const box = $('sheet').querySelector('.sk-doc-search');
          const res = [...$('sheet').querySelectorAll('.sk-doc-result')];
          // arrow-callout: a hand-drawn arrow from the note to the result, in the pen colour
          const ar = SK.arrow(850, 812, 600, 812, 231, 4, 30);
          $('ink').innerHTML = `<path id="as" d="${ar.shaft}" fill="none" stroke="var(--sk-accent-2)" stroke-width="8" stroke-linecap="round"/>` +
            `<path id="ah" d="${ar.head}" fill="none" stroke="var(--sk-accent-2)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
          const inY = SK.onTwos(M.track(1, [[0.1, 0, [16, 0.8]]]));
          const Q = 'rekap stok otomatis';
          SK.clip(ID, { T: 6, update: (t) => {
            SK.piece($('sheet'), { x: 0, y: 1400 * inY(t), r: -1 }, 230, t, { amp: 0.8 });
            // search-query: the query types in; the results land after it
            SK.typeOn(box, Q, M.clamp((t - 0.7) / 1.1), { t });
            res.forEach((r, i) => SK.enter(r, t - 2.0 - i * 0.25, 'rise', { dy: 24 }));
            SK.draw($('as'), SK.smooth((t - 3.2) / 0.35));
            SK.draw($('ah'), SK.smooth((t - 3.55) / 0.12));
            $('lab').style.opacity = t >= 3.7 ? '1' : '0';
            SK.write($('lab'), SK.smooth((t - 3.7) / 0.4));
            SK.grain($('grain'), t, 2);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/vox/compositions/vx-08-timeline-pinned.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: illustrative clippings (tagged "Ilustrasi"; no real outlet) with invented dates and headlines, to show the mechanism. In a real clip each date and headline is verbatim from the transcript or a real capture, and the source line names the real source. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #cam { position: absolute; left: 0; top: 0; width: 2320px; height: 1920px; transform-origin: 0 0; }
        .clp { position: absolute; top: 760px; }
        .clp .sk-docx h1 { font-size: 60px; }
        .dt { position: absolute; top: 590px; width: 540px; text-align: center; font-size: 96px; font-weight: 700; line-height: 1; color: var(--sk-accent-2); white-space: nowrap; }
        .pn { position: absolute; top: 718px; width: 46px; }
        .sk-source { top: 1210px; }
        #rule { position: absolute; left: 0; top: 700px; width: 2320px; height: 6px; background: #2b2b2b; opacity: .18; }
      </style>
      <div id="root" data-composition-id="vx-08-timeline-pinned" data-width="1080" data-height="1920" data-duration="6.5">
        <div class="sk-stage sk-vox sk-kraft">
          <div id="cam">
            <div id="rule"></div>
            <div class="dt sk-hand" id="d0" style="left:270px">Jan 2024</div>
            <div class="dt sk-hand" id="d1" style="left:890px">Jun 2024</div>
            <div class="dt sk-hand" id="d2" style="left:1510px">Des 2024</div>
            <div class="clp sk-cut" id="c0" style="left:270px"></div>
            <div class="clp sk-cut" id="c1" style="left:890px"></div>
            <div class="clp sk-cut" id="c2" style="left:1510px"></div>
            <div class="pn sk-pin" id="n0" style="left:517px"></div>
            <div class="pn sk-pin" id="n1" style="left:1137px"></div>
            <div class="pn sk-pin" id="n2" style="left:1757px"></div>
            <div class="sk-source" id="s0" style="left:270px">Sumber: arsip toko (ilustrasi)</div>
            <div class="sk-source" id="s1" style="left:890px">Sumber: arsip toko (ilustrasi)</div>
            <div class="sk-source" id="s2" style="left:1510px">Sumber: arsip toko (ilustrasi)</div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-08-timeline-pinned';
          const $ = SK.finder(ID);
          const H = ['Buka toko online', 'Order naik dua kali', 'Admin mulai kewalahan'];
          H.forEach((h, i) => { $('c' + i).innerHTML = SK.doc('article', { kicker: 'Catatan toko', headline: h, body: ['Ringkasan singkat dari catatan hari itu.'] }, { w: 540 }); });
          // doc-timeline: the camera steps from date to date; each clipping is pinned as the camera arrives
          const ARRIVE = [0.3, 2.1, 3.9], FX = [540, 1160, 1780];
          const fx = SK.onTwos(M.track(FX[0], [[1.8, FX[1], M.SLOW], [3.6, FX[2], M.SLOW]]));
          const drop = ARRIVE.map((at) => SK.onTwos(M.track(1, [[at, 0, [24, 0.7]]])));
          SK.clip(ID, { T: 6.5, update: (t) => {
            SK.cam($('cam'), 1.3, fx(t), 930, 1080, 1920);
            ARRIVE.forEach((at, i) => {
              const k = drop[i](t), on = t >= at ? 1 : 0;
              SK.piece($('c' + i), { x: 0, y: -240 * k, r: [-2, 1.5, -1][i], o: on }, 240 + i, t, { amp: 0.8 });
              SK.piece($('n' + i), { x: 0, y: -240 * k, o: on }, 250 + i, t, { amp: 0.5 });
              SK.enter($('d' + i), t - at - 0.2, 'rise');
              // pinned-source: the source line stays readable for at least 1.5 s
              SK.enter($('s' + i), t - at - 0.5, 'fade');
            });
            SK.grain($('grain'), t, 2);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/vox/compositions/vx-09-loupe-before-after.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: an illustrative report (tagged "Ilustrasi") with invented numbers, to show the mechanism. In a real clip the old and new values are the ones said in the transcript (Gate 2 R1). -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .rep { position: absolute; left: 0; top: 0; }
        .rep .sk-docx { font-size: 36px; }
        .rep .sk-doc-kicker { height: 34px; line-height: 34px; }
        .rep h2 { height: 64px; line-height: 64px; margin: 0 0 20px; }
        .rep .sk-doc-table { margin: 0; }
        .rep .sk-doc-table td { height: 72px; padding: 0; box-sizing: border-box; }
        .ba { position: relative; display: inline-block; min-width: 110px; text-align: right; }
        .old { position: relative; }
        .strike { position: absolute; left: -6px; right: -6px; top: 48%; height: 6px; background: var(--sk-accent-2); transform-origin: 0 50%; transform: scaleX(0); }
        .new { position: absolute; right: 150px; top: 0; color: var(--sk-accent-2); font-weight: 700; opacity: 0; white-space: nowrap; }
        #card { left: 90px; top: 150px; }
        #lens { position: absolute; left: 0; top: 0; width: 300px; height: 300px; border-radius: 50%; overflow: hidden; background: #f6f3ec; box-shadow: 0 0 0 12px #2b2b2b, 0 18px 40px rgba(0,0,0,.35); }
        #lensIn { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
        #handle { position: absolute; left: 0; top: 0; width: 40px; height: 190px; border-radius: 14px; background: #2b2b2b; transform-origin: 50% 0; }
      </style>
      <div id="root" data-composition-id="vx-09-loupe-before-after" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-vox">
          <div class="rep sk-cut" id="card"></div>
          <div id="handle"></div>
          <div id="lens"><div class="rep" id="lensIn"></div></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-09-loupe-before-after';
          const $ = SK.finder(ID);
          const doc = SK.doc('report-page', { section: 'Laporan bulanan', title: 'Ringkasan Maret', rows: [
            { label: 'Order masuk', value: '210' }, { label: 'Dibalas < 1 jam', value: '40%' }, { label: 'Komplain', value: '12' },
          ], body: [] }, { w: 900 });
          $('card').innerHTML = doc; $('lensIn').innerHTML = doc;
          // before-after-doc: the old value is struck, the new one wipes in beside it (in the page and in the lens)
          const stage = SK.stageOf(ID);
          stage.querySelectorAll('.rep').forEach((r) => {
            r.querySelectorAll('.sk-doc-num')[1].innerHTML = '<span class="ba"><span class="old">40%<i class="strike"></i></span><span class="new">85%</span></span>';
          });
          // loupe-zoom: a 2× copy of the page inside a round lens, centred on the row being named
          const X0 = 90, Y0 = 150, CX = X0 + 900 - 48 - 70, CY = Y0 + 48 + 34 + 64 + 20 + 72 + 36, R = 150, Z = 2;
          $('lensIn').style.transform = `translate(${R - Z * (CX - X0)}px, ${R - Z * (CY - Y0)}px) scale(${Z})`;
          // the lens shows the row, then leaves before the change so the page itself shows it
          const lensX = M.track(1300, [[1.0, CX, M.SLOW], [2.5, 1400, M.SLOW]]), lensY = M.track(1500, [[1.0, CY, M.SLOW], [2.5, 1700, M.SLOW]]);
          const cardIn = M.track(0, [[0.02, 1, [18, 0.8]]]);
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            const c = cardIn(t);
            $('card').style.opacity = M.clamp(c * 3).toFixed(4);
            $('card').style.transform = `translateY(${((1 - c) * -60).toFixed(2)}px)`;
            const lx = lensX(t), ly = lensY(t);
            $('lens').style.transform = `translate(${(lx - R).toFixed(1)}px, ${(ly - R).toFixed(1)}px)`;
            $('handle').style.transform = `translate(${(lx + 86).toFixed(1)}px, ${(ly + 86).toFixed(1)}px) rotate(-45deg)`;
            const s = SK.smooth((t - 3.1) / 0.3), n = SK.smooth((t - 3.6) / 0.3);
            stage.querySelectorAll('.strike').forEach((e) => (e.style.transform = `scaleX(${s.toFixed(4)})`));
            stage.querySelectorAll('.new').forEach((e) => { e.style.opacity = n.toFixed(4); e.style.clipPath = `inset(0 ${((1 - n) * 100).toFixed(2)}% 0 0)`; });
            stage.querySelectorAll('.old').forEach((e) => (e.style.opacity = (1 - 0.55 * n).toFixed(4)));
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/vox/compositions/vx-10-quote-split.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: an invented quote and illustrative documents (tagged "Ilustrasi"; no real person or outlet), to show the mechanism. In a real clip the quote is verbatim with its real speaker, and the documents are the ones Dena names. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #quote { position: absolute; left: 90px; top: 620px; width: 900px; transform-origin: 50% 0; }
        #q { font-size: 84px; line-height: 1.12; color: #1b1b1b; }
        #q .sk-w { display: inline-block; margin-right: .22em; }
        #who { margin-top: 26px; font-size: 36px; color: var(--sk-muted); }
        #mark { position: absolute; left: -20px; top: -110px; font-size: 220px; line-height: 1; color: var(--sk-accent-2); }
        .dc { position: absolute; left: 70px; }
        .dc .sk-docx { font-size: 40px; }
        .dc .sk-docx h1 { font-size: 80px; }
        #d0 { top: 520px; }
        #d1 { top: 1180px; }
      </style>
      <div id="root" data-composition-id="vx-10-quote-split" data-width="1080" data-height="1920" data-duration="6.5">
        <div class="sk-stage sk-vox sk-paper-cream">
          <div class="dc sk-cut" id="d0"></div>
          <div class="dc sk-cut" id="d1"></div>
          <div id="quote">
            <div id="mark" class="sk-serif">“</div>
            <div id="q" class="sk-serif">Dibalas cepat, saya jadi langganan.</div>
            <div id="who" class="sk-sans">— pesan pelanggan (ilustrasi)</div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-10-quote-split';
          const $ = SK.finder(ID);
          $('d0').innerHTML = SK.doc('article', { kicker: 'Catatan toko', headline: 'Pelanggan betah kalau dibalas cepat', body: ['Rekap bulan ini dari chat pelanggan.'] }, { w: 940 });
          $('d1').innerHTML = SK.doc('email', { from: 'Pelanggan', subject: 'Pesanan ketiga minggu ini', body: ['Kak, saya pesan lagi ya. Sama seperti kemarin, dikirim besok pagi.'] }, { w: 940 });
          // pull-quote: the words rise as they are said, then the quote moves up and makes room
          const words = SK.words($('q'));
          const AT = [0.3, 0.6, 0.95, 1.2, 1.5];
          const up = M.track(0, [[2.7, 1, M.SLOW]]);
          // split-docs: two sheets stacked; the second enters on "tapi"
          const in0 = SK.onTwos(M.track(1, [[3.0, 0, [16, 0.8]]])), in1 = SK.onTwos(M.track(1, [[3.9, 0, [16, 0.8]]]));
          SK.clip(ID, { T: 6.5, update: (t) => {
            SK.reveal(words, AT, t, 'rise');
            SK.enter($('mark'), t - 0.1, 'pop');
            SK.enter($('who'), t - 1.9, 'fade');
            const u = up(t);
            $('quote').style.transform = `translateY(${(-480 * u).toFixed(1)}px) scale(${(1 - 0.3 * u).toFixed(4)})`;
            SK.piece($('d0'), { x: 1200 * in0(t), y: 0, r: -1, o: t >= 3.0 ? 1 : 0 }, 260, t, { amp: 0.8 });
            SK.piece($('d1'), { x: -1200 * in1(t), y: 0, r: 1, o: t >= 3.9 ? 1 : 0 }, 261, t, { amp: 0.8 });
            SK.grain($('grain'), t, 2);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/vox/compositions/vx-11-archival-pan.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: a real public-domain archival photo ("Woman typist", c. 1900, Library of Congress; see THIRD_PARTY_NOTICES.md), rebuilt from the plate and subject layers the parallax example uses. In a real clip the photo is the one Dena names, with its real source line. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #print { position: absolute; left: 110px; top: 300px; width: 860px; height: 1114px; padding: 26px 26px 90px; background: #f4f1ea; box-sizing: content-box; }
        #win { position: absolute; left: 26px; top: 26px; width: 860px; height: 1114px; overflow: hidden; background: #222; }
        #cam { position: absolute; left: 0; top: 0; width: 860px; height: 1114px; transform-origin: 0 0; }
        #cam img { position: absolute; left: -43px; top: -56px; width: 946px; height: 1226px; filter: sepia(.35) contrast(1.05); }
        #cap { position: absolute; left: 26px; right: 26px; bottom: 22px; font-size: 44px; font-weight: 700; color: #3b3530; white-space: nowrap; }
        #src { left: 110px; top: 1560px; }
      </style>
      <div id="root" data-composition-id="vx-11-archival-pan" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-vox sk-kraft">
          <div class="sk-cut" id="print">
            <div id="win">
              <div id="cam">
                <img src="assets/px-archive-plate.jpg" alt="" />
                <img src="assets/px-archive-subject.png" alt="" />
              </div>
              <div class="sk-grain" id="grain"></div>
            </div>
            <div id="cap" class="sk-hand">kantor, sekitar 1900</div>
          </div>
          <div class="sk-source" id="src">Foto: "Woman typist", ±1900, Library of Congress (domain publik)</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'vx-11-archival-pan';
          const $ = SK.finder(ID);
          // archival-pan: one slow direction, a stepped 6% push toward the detail being named (the typewriter).
          // The photo is overscanned 10% so the push never shows its edge: at s = 1.06 the focus must stay
          // within x 363–497, y 470–644 of the window.
          const s = SK.onTwos(M.track(1, [[0.4, 1.06, [2.2, 1]]]));
          const fx = SK.onTwos(M.track(430, [[0.4, 368, [2.2, 1]]])), fy = SK.onTwos(M.track(557, [[0.4, 638, [2.2, 1]]]));
          const inY = SK.onTwos(M.track(1, [[0.05, 0, [18, 0.8]]]));
          SK.clip(ID, { T: 5, update: (t) => {
            SK.piece($('print'), { x: 0, y: 1300 * inY(t), r: -1.2 }, 270, t, { amp: 0.6 });
            SK.cam($('cam'), s(t), fx(t), fy(t), 860, 1114);
            SK.enter($('src'), t - 0.6, 'fade');
            SK.grain($('grain'), t, 3);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 2: Append them to the manifest and regenerate the host**

In `docs/agents/references/style-examples/vox/examples.json` replace:

old:
```json
    {"clip": "vx-03-map-pin", "duration": 5, "treatment": "cutaway", "stills": [1.7, 4.7]},
    {"clip": "vx-04-clipping-panel", "duration": 5, "treatment": "panel", "stills": [1.9, 4.7]}
  ]
```

new:
```json
    {"clip": "vx-03-map-pin", "duration": 5, "treatment": "cutaway", "stills": [1.7, 4.7]},
    {"clip": "vx-04-clipping-panel", "duration": 5, "treatment": "panel", "stills": [1.9, 4.7]},
    {"clip": "vx-05-chat-redact", "duration": 6, "treatment": "cutaway", "stills": [2.6, 5.2]},
    {"clip": "vx-06-cell-underline", "duration": 6, "treatment": "split", "stills": [1.0, 4.6]},
    {"clip": "vx-07-search-arrow", "duration": 6, "treatment": "cutaway", "stills": [1.4, 4.8]},
    {"clip": "vx-08-timeline-pinned", "duration": 6.5, "treatment": "cutaway", "stills": [2.8, 5.8]},
    {"clip": "vx-09-loupe-before-after", "duration": 6, "treatment": "panel", "stills": [2.0, 4.6]},
    {"clip": "vx-10-quote-split", "duration": 6.5, "treatment": "cutaway", "stills": [2.2, 5.6]},
    {"clip": "vx-11-archival-pan", "duration": 5, "treatment": "cutaway", "stills": [0.9, 4.6]}
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
npm run check:style-examples -- vox
```

Expected: `0 errors`; stills in `renders/style-examples/vox/`.

Clip-local stills: vx-05 2.6 / 5.2 (number redacted from its first visible frame; "sudah 3 hari" highlighted); vx-06 1.0 / 4.6 (cell highlighted, wavy underline, fixed "Ilustrasi" tag bottom-right); vx-07 1.4 / 4.8 (query typing; arrow + "yang ini" beside the first result); vx-08 2.8 / 5.8 (pinned clippings, source lines, camera at 1.3×); vx-09 2.0 / 4.6 (lens over the row, then old value struck and the new one beside it); vx-10 2.2 / 5.6 (quote, then two stacked documents); vx-11 0.9 / 4.6 (photo print, stepped push, source line). Traps: an `SK.doc` tag leaves the frame in a deep push (add a fixed tag); `SK.write` leaves a sliver at u = 0 (hide the label until it starts); layout measured in the browser is not deterministic, so fix sizes in CSS and compute positions (spreadsheet cells, report rows).

- [ ] **Step 4: Document the patterns and examples**

In `docs/agents/references/styles/vox.md` replace:

old:
```md
(`vx-01` … `vx-04`,
```

new:
```md
(`vx-01` … `vx-11`,
```

In `docs/agents/references/styles/vox.md` replace:

old:
```md


## References
```

new:
```md

| **chat-reveal** | Messages in an illustrative chat appear one by one; the key message gets the highlighter | "klien chat gue bilang…" | One message per quoted line; the highlighter on the key phrase | soft message pop | Messages nobody said; a real person's name or number | `SK.doc('chat-thread', …)` + `SK.enter` per `.sk-doc-msg` + `.sk-hl` |
| **cell-zoom** | A stepped push into one spreadsheet cell; the cell is highlighted and its number underlined | One number in a report | The push lands on the number word | low hum | A number nobody said; zooming into an empty cell | `SK.doc('spreadsheet', …)` with fixed cell sizes + `SK.cam` push + a highlight block; keep a fixed "Ilustrasi" tag in frame |
| **search-query** | A query types into an illustrative results page; the relevant result is pointed at | "coba lo search…" | Typing ends with the query; the pointer lands on the result named | soft typing | A real search engine's look; invented results that pass as real | `SK.doc('search-results', …)` + `SK.typeOn` on `.sk-doc-search` |
| **doc-timeline** | Dated clippings in a row; the camera steps from date to date | A sequence of events | One camera step per date said | click per step | Dates nobody said; more than 4 clippings | `SK.doc` clippings on a wide board + a stepped `SK.cam` focus `x` |
| **loupe-zoom** | A round magnifier enlarges one detail of the document | "lihat baris kecil ini" | The lens arrives on the pointing word, 0.3–0.5 s | small whoosh | A lens over what is not discussed; a shaking lens | a 2× copy of the document inside a round `overflow: hidden` lens, offset so its centre matches |

## References
```

In `docs/agents/references/styles/vox.md` replace:

old:
```md
- A capture is an `<img>` of `assets/captures/NN-name.png`; always add `.sk-source`.
```

new:
```md
- A capture is an `<img>` of `assets/captures/NN-name.png`; always add `.sk-source`.
- When the camera pushes so far into an `SK.doc` that its own tag leaves the frame,
  add a fixed `.sk-tag` "Ilustrasi" outside the camera layer (`vx-06`); the tag must
  stay visible (RD-03-54).
- Private details in an illustrative document (a phone number in a chat) are
  covered by `.sk-redact` from the first frame their line is visible (`vx-05`).
- An archival photo is a print: overscan it about 10% inside its window so a
  stepped push never shows its edge (`vx-11`).
```

In `docs/agents/references/styles/vox.md` replace:

old:
```md
| doc-push, archival-pan | low paper rustle / room tone | 0.06–0.1 |
```

new:
```md
| doc-push, archival-pan | low paper rustle / room tone | 0.06–0.1 |
| chat-reveal, search-query | soft message pop / soft typing | 0.06–0.1 |
| cell-zoom, doc-timeline, loupe-zoom | low hum / click per step / small whoosh | 0.06–0.1 |
```

In `docs/agents/references/styles/vox.md` replace:

old:
```md
| `style-examples/vox/compositions/vx-04-clipping-panel.html` | clipping-stack + stamp, "Ilustrasi" tag | panel |
```

new:
```md
| `style-examples/vox/compositions/vx-04-clipping-panel.html` | clipping-stack + stamp, "Ilustrasi" tag | panel |
| `style-examples/vox/compositions/vx-05-chat-redact.html` | chat-reveal + redact-bar on an illustrative chat | cutaway |
| `style-examples/vox/compositions/vx-06-cell-underline.html` | cell-zoom + pen-underline on an illustrative spreadsheet | split |
| `style-examples/vox/compositions/vx-07-search-arrow.html` | search-query + arrow-callout on illustrative results | cutaway |
| `style-examples/vox/compositions/vx-08-timeline-pinned.html` | doc-timeline + pinned-source | cutaway |
| `style-examples/vox/compositions/vx-09-loupe-before-after.html` | loupe-zoom + before-after-doc on an illustrative report | panel |
| `style-examples/vox/compositions/vx-10-quote-split.html` | pull-quote + split-docs | cutaway |
| `style-examples/vox/compositions/vx-11-archival-pan.html` | archival-pan on a public-domain photo with its source line | cutaway |
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/agents/references/style-examples/vox docs/agents/references/styles/vox.md && git status --short && git commit -q -F - <<'MSG'
feat: VOX examples for all 20 patterns (chat, cell, search, timeline, loupe, quote, archive)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 4: Six mix-media examples and five new patterns

**Files:**
- Create: `docs/agents/references/style-examples/mix-media/compositions/mm-05-halftone-punch.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-06-frame-grid.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-06-frame-grid-front.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-07-scrapbook-scribble.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-08-split-self.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-09-sticker-ransom.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-09-sticker-ransom-front.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-10-panel-speech.html`, `docs/agents/references/style-examples/mix-media/compositions/mm-10-panel-speech-front.html`
- Modify: `docs/agents/references/style-examples/mix-media/examples.json`; generated `index.html`, `snapshots.json`
- Modify: `docs/agents/references/styles/mix-media.md` (header range, Patterns, Build Recipe, SFX, Examples)

- [ ] **Step 1: Write the example compositions**

Every clip follows the example rules: "Example only" comment (made-up words and numbers), one `SK.clip`, a pure function of `t`, no `visibility`, no `font-family` in the clip `<style>`, no `../` in a url, no template-literal selectors, no `!important`.

Create `docs/agents/references/style-examples/mix-media/compositions/mm-05-halftone-punch.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the word is invented. The speaker is the host's matted <video> (placeholder here) on track 6, in true colour; the host punches it in on the peak word (manifest punch). This clip is the two-colour halftone backdrop behind it; never filter the video itself. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #bg { position: absolute; inset: 0; background: var(--sk-bg); }
        #dots { position: absolute; left: -60px; top: -60px; width: 1200px; height: 2040px; background-image: radial-gradient(circle, var(--dot) 9px, transparent 10px); background-size: 30px 30px;
          -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 42%, #000 20%, transparent 75%); mask-image: radial-gradient(ellipse 70% 55% at 50% 42%, #000 20%, transparent 75%); }
        #word { position: absolute; left: 0; right: 0; top: 250px; text-align: center; font-size: 200px; line-height: 1; color: var(--sk-ink); }
      </style>
      <div id="root" data-composition-id="mm-05-halftone-punch" data-width="1080" data-height="1920" data-duration="5">
        <div class="sk-stage sk-stop sk-pal-mm-pop-collage" id="st">
          <div id="bg"></div>
          <div id="dots"></div>
          <div class="sk-display" id="word">serius?</div>
          <div class="sk-tex-halftone"></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-05-halftone-punch';
          const $ = SK.finder(ID);
          const stage = SK.stageOf(ID);
          // halftone-duotone: two inks only; they swap on the beat (2.2 s), when the host punches the speaker in
          const BEAT = 2.2, A = ['#ffd23f', '#ee4266'];
          SK.clip(ID, { T: 5, update: (t) => {
            const on = t >= BEAT ? 1 : 0;
            stage.style.setProperty('--sk-bg', A[on]);
            stage.style.setProperty('--dot', A[1 - on]);
            const d = SK.stepTime(t, 8) * 12;
            $('dots').style.transform = `translate(${(d % 30).toFixed(1)}px, ${(-d % 30).toFixed(1)}px)`;
            SK.enter($('word'), t - BEAT, 'slam');
            SK.grain($('grain'), t, 4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-06-frame-grid.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the note is invented. The speaker is the host's matted <video> (placeholder here) on track 6; this clip is the grid backdrop behind it, and mm-06-frame-grid-front (track 7) is the phone frame in front. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #grid { position: absolute; left: -48px; top: -48px; width: 1176px; height: 2016px; }
      </style>
      <div id="root" data-composition-id="mm-06-frame-grid" data-width="1080" data-height="1920" data-duration="5.5">
        <div class="sk-stage sk-stop">
          <div class="sk-grid" id="grid"></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-06-frame-grid';
          const $ = SK.finder(ID);
          // grid-backdrop: held, with a faint drift (the front layer drifts the same way so the grids stay aligned)
          SK.clip(ID, { T: 5.5, update: (t) => {
            $('grid').style.transform = `translate(${(t * 6).toFixed(2)}px, ${(t * 4).toFixed(2)}px)`;
            SK.grain($('grain'), t, 4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-06-frame-grid-front.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. Front layer of mm-06 (track 7): the grid paper covers everything except a phone screen, so the speaker shows only inside the phone; the frame shrinks from full screen to the phone on the device word. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #cover { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }
        #grid { position: absolute; left: -48px; top: -48px; width: 1176px; height: 2016px; }
        #bezel { position: absolute; left: 0; top: 0; box-sizing: border-box; border: 36px solid #262626; box-shadow: 0 0 0 10px #f4f1ea, 10px 16px 0 10px rgba(40,25,10,.3); }
        #spk { position: absolute; left: 50%; top: 12px; width: 120px; height: 14px; margin-left: -60px; border-radius: 7px; background: #111; }
        #note { position: absolute; left: 0; top: 0; width: 420px; height: 130px; }
        #note .pp { position: absolute; inset: 0; }
        #note span { position: absolute; left: 0; right: 0; top: 24px; text-align: center; font-size: 80px; font-weight: 700; line-height: 1; color: #2b2118; }
      </style>
      <div id="root" data-composition-id="mm-06-frame-grid-front" data-width="1080" data-height="1920" data-duration="5.5">
        <div class="sk-stage sk-stop">
          <div id="cover"><div class="sk-grid" id="grid"></div></div>
          <div id="bezel"><div id="spk"></div></div>
          <div class="sk-cut" id="note"><div class="pp sk-paper-cream" id="np"></div><span class="sk-hand">di HP gue</span></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-06-frame-grid-front';
          const $ = SK.finder(ID);
          $('np').style.clipPath = SK.torn(420, 130, 290, { edges: 'lr', amp: 10 });
          // frame-in-frame: a rounded screen-shaped hole in the cover; it shrinks from beyond the frame to the phone on "HP"
          const CX = 540, CY = 1180, W1 = 600, H1 = 1060, R1 = 56;
          const k = SK.onTwos(M.track(0, [[1.2, 1, [14, 0.85]]]));
          const hole = (w, h, r) => {
            const x = CX - w / 2, y = CY - h / 2;
            return `M0 0H1080V1920H0Z M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
          };
          SK.clip(ID, { T: 5.5, bg: null, update: (t) => {
            const u = k(t), w = 2400 + (W1 - 2400) * u, h = 3600 + (H1 - 3600) * u, r = 200 + (R1 - 200) * u;
            $('cover').style.clipPath = `path(evenodd, "${hole(w, h, r)}")`;
            $('grid').style.transform = `translate(${(t * 6).toFixed(2)}px, ${(t * 4).toFixed(2)}px)`;
            Object.assign($('bezel').style, { width: `${(w + 72).toFixed(1)}px`, height: `${(h + 72).toFixed(1)}px`, borderRadius: `${(r + 36).toFixed(1)}px`,
              transform: `translate(${(CX - w / 2 - 36).toFixed(1)}px, ${(CY - h / 2 - 36).toFixed(1)}px)`, opacity: u > 0 ? '1' : '0' });
            SK.piece($('note'), { x: 330, y: 360 - 500 * (1 - SK.onTwos((s) => M.clamp((s - 1.9) / 0.3))(t)), r: -3, o: t >= 1.9 ? 1 : 0 }, 291, t);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-07-scrapbook-scribble.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the cards' words and number are invented; the screenshot is the Wikipedia capture the VOX example uses (CC BY-SA 4.0). The speaker is the host's matted <video> (placeholder here) on track 6; this clip is the scrapbook behind them. Keep the face zone (x 300–780, y 780–1320) clear. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .card { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        #ca { width: 520px; padding: 14px; background: #fbfaf6; }
        #ca img { display: block; width: 520px; }
        #cb { width: 440px; height: 250px; }
        #cc { width: 460px; height: 250px; }
        .pp { position: absolute; inset: 0; }
        .card .t { position: absolute; left: 36px; right: 30px; top: 34px; font-size: 54px; font-weight: 700; line-height: 1.05; color: #2b2118; }
        #num { position: absolute; left: 36px; top: 120px; font-size: 96px; line-height: 1; color: #2b2118; }
        #ink { position: absolute; left: 0; top: 0; overflow: visible; }
        .tp { position: absolute; top: -22px; width: 130px; }
      </style>
      <div id="root" data-composition-id="mm-07-scrapbook-scribble" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-pal-mm-scrapbook sk-kraft">
          <div class="card sk-cut" id="ca"><img src="assets/cap-ken-burns.png" alt="" /><div class="tp sk-tape-a" style="left:210px"></div></div>
          <div class="card sk-cut" id="cb"><div class="pp sk-paper-white" id="pb"></div><div class="t sk-hand">chat masuk 3× lipat</div><div class="tp sk-tape-b" style="left:150px"></div></div>
          <div class="card sk-cut" id="cc"><div class="pp sk-paper-cream" id="pc"></div><div class="t sk-hand">omzet bulan ini</div><div class="sk-display" id="num">+40%</div>
            <svg id="ink" width="460" height="250"><path id="sc" fill="none" stroke="var(--sk-accent)" stroke-width="9" stroke-linecap="round"/></svg></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-07-scrapbook-scribble';
          const $ = SK.finder(ID);
          $('pb').style.clipPath = SK.torn(440, 250, 300, { edges: 'tb', amp: 8 });
          $('pc').style.clipPath = SK.torn(460, 250, 301, { edges: 'lr', amp: 8 });
          // scribble-emphasis: a loose circle around the number, finished as the number is said
          $('sc').setAttribute('d', SK.ellipse(160, 170, 160, 72, 302, 0.07));
          // scrapbook-stack: one proof card per claim drops onto the pile in the top third
          const DROP = [['ca', 0.3, 50, 150, -6], ['cb', 1.0, 580, 110, 5], ['cc', 1.7, 300, 430, -2]];
          const fall = DROP.map(([, at]) => SK.onTwos(M.track(1, [[at, 0, [24, 0.62]]])));
          SK.clip(ID, { T: 6, update: (t) => {
            DROP.forEach(([id, at, x, y, r], i) => {
              const k = fall[i](t);
              SK.piece($(id), { x, y: y - 500 * k, r: r + 12 * k, s: 1 + 0.15 * k, o: t >= at ? 1 : 0 }, 303 + i, t);
            });
            SK.draw($('sc'), SK.smooth((t - 2.6) / 0.4));
            SK.grain($('grain'), t, 4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-08-split-self.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the labels are invented. The two speakers are the host's matted <video>s (the same placeholder twice here; in a real clip two different segments of Dena, "then" and "now"), placed by the manifest's cutouts list; the second pops in on the contrast word. This clip is the split backdrop behind them. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #then { position: absolute; left: 0; top: 0; width: 560px; height: 1920px; }
        .lab { position: absolute; top: 330px; width: 380px; height: 140px; }
        .lab .pp { position: absolute; inset: 0; }
        .lab span { position: absolute; left: 0; right: 0; top: 22px; text-align: center; font-size: 92px; font-weight: 700; line-height: 1; color: #2b2118; }
        .tp { position: absolute; top: -24px; width: 150px; }
      </style>
      <div id="root" data-composition-id="mm-08-split-self" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-kraft">
          <div class="sk-cut sk-paper-grey" id="then"></div>
          <div class="lab sk-cut" id="l0"><div class="pp sk-paper-white" id="p0"></div><span class="sk-hand">dulu</span><div class="tp sk-tape-a" style="left:115px"></div></div>
          <div class="lab sk-cut" id="l1"><div class="pp sk-paper-cream" id="p1"></div><span class="sk-hand">sekarang</span><div class="tp sk-tape-b" style="left:115px"></div></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-08-split-self';
          const $ = SK.finder(ID);
          $('then').style.clipPath = SK.torn(560, 1920, 280, { edges: 'r', amp: 18, step: 30 });
          $('p0').style.clipPath = SK.torn(380, 140, 281, { edges: 'lr', amp: 10 });
          $('p1').style.clipPath = SK.torn(380, 140, 282, { edges: 'lr', amp: 10 });
          // split-self: "then" is on the grey half from the start; "now" lands with its label on the contrast word (2.0 s)
          const d0 = SK.onTwos(M.track(1, [[0.2, 0, [22, 0.7]]])), d1 = SK.onTwos(M.track(1, [[2.0, 0, [22, 0.7]]]));
          SK.clip(ID, { T: 6, update: (t) => {
            SK.piece($('l0'), { x: 100, y: -300 * d0(t), r: -4, o: t >= 0.2 ? 1 : 0 }, 283, t);
            SK.piece($('l1'), { x: 600, y: -300 * d1(t), r: 3, o: t >= 2.0 ? 1 : 0 }, 284, t);
            SK.grain($('grain'), t, 4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-09-sticker-ransom.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. The speaker is the host's matted <video> (placeholder here) on track 6; this clip is the plain zine backdrop behind it, and mm-09-sticker-ransom-front (track 7) carries the stickers and the ransom caption. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #pink { position: absolute; inset: 0; background: #ffc6dc; }
      </style>
      <div id="root" data-composition-id="mm-09-sticker-ransom" data-width="1080" data-height="1920" data-duration="5.5">
        <div class="sk-stage sk-stop sk-pal-mm-zine-pink">
          <div id="pink"></div>
          <div class="sk-tex-halftone"></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-09-sticker-ransom';
          const $ = SK.finder(ID);
          SK.clip(ID, { T: 5.5, update: (t) => SK.grain($('grain'), t, 4) });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-09-sticker-ransom-front.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the phrase is invented. Front layer of mm-09 (track 7): library stickers pop around the speaker on the beats, and a ransom-note caption is pasted letter by letter above them. Keep the face zone (x 300–780, y 780–1320) clear. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .st { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
        #cap { position: absolute; left: 0; right: 0; top: 280px; text-align: center; white-space: nowrap; }
        .lt { display: inline-block; margin: 0 4px; padding: 6px 14px 10px; font-size: 104px; line-height: 1; color: #111; box-shadow: 3px 5px 0 rgba(40,25,10,.3); }
        .sp { display: inline-block; width: 40px; }
      </style>
      <div id="root" data-composition-id="mm-09-sticker-ransom-front" data-width="1080" data-height="1920" data-duration="5.5">
        <div class="sk-stage sk-stop">
          <div id="cap"></div>
          <div class="st sk-obj-star-sticker" id="s0" style="width:190px"></div>
          <div class="st sk-obj-check-sticker" id="s1" style="width:180px"></div>
          <div class="st sk-obj-arrow-sticker" id="s2" style="width:210px"></div>
          <div class="st sk-obj-circle-dot-sticker" id="s3" style="width:150px"></div>
          <div class="st sk-obj-star-sticker" id="s4" style="width:140px"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-09-sticker-ransom-front';
          const $ = SK.finder(ID);
          // ransom-caption: every letter is its own paper chip with a seeded font, colour, and tilt
          const TEXT = 'GAS TERUS', FONTS = ['sk-display', 'sk-serif', 'sk-hand', 'sk-mono', 'sk-sans'];
          const BG = ['#ffe14d', '#ffffff', '#ff8fb8', '#9ad0ff', '#f4f1ea', '#111111'];
          const r = SK.rng(310);
          $('cap').innerHTML = [...TEXT].map((ch) => {
            if (ch === ' ') return '<span class="sp"></span>';
            const bg = BG[Math.floor(r() * BG.length)], f = FONTS[Math.floor(r() * FONTS.length)];
            return `<span class="lt ${f}" data-r="${((r() - 0.5) * 16).toFixed(1)}" style="background:${bg};color:${bg === '#111111' ? '#fff' : '#111'}">${ch}</span>`;
          }).join('');
          const letters = [...$('cap').querySelectorAll('.lt')];
          // sticker-bomb: one sticker per beat around (never on) the face
          const ST = [[0.9, 60, 640, -12], [1.2, 850, 700, 10], [1.5, 40, 1330, 8], [1.8, 880, 1380, -6], [2.1, 170, 1640, 14]];
          SK.clip(ID, { T: 5.5, bg: null, update: (t) => {
            letters.forEach((el, i) => {
              SK.enter(el, SK.stepTime(t, SK.STOP_FPS) - (0.2 + i * 0.1), 'pop');
              el.style.transform += ` rotate(${el.dataset.r}deg)`; // keep each chip's seeded tilt
            });
            ST.forEach(([at, x, y, rot], i) => {
              const s = Math.round(SK.stepTime(t - at, SK.STOP_FPS) * SK.STOP_FPS);
              const sc = s < 0 ? 0 : [0.4, 1.18, 1][Math.min(s, 2)];
              SK.piece($('s' + i), { x, y, r: rot, s: sc, o: s >= 0 ? 1 : 0 }, 311 + i, t);
            });
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-10-panel-speech.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the list is invented. The speaker is the host's matted <video> (placeholder here) on track 6, shifted left by the manifest's cutouts entry; this clip is the backdrop and the torn list panel on the right, and mm-10-panel-speech-front (track 7) is the speech bubble. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #panel { position: absolute; left: 0; top: 0; width: 440px; height: 700px; }
        #pp { position: absolute; inset: 0; }
        #pt { position: absolute; left: 40px; top: 40px; font-size: 60px; font-weight: 700; color: var(--sk-accent-2); white-space: nowrap; }
        .it { position: absolute; left: 40px; font-size: 76px; font-weight: 700; line-height: 1; color: #2b2118; white-space: nowrap; }
        .it b { color: var(--sk-accent); margin-right: 14px; }
      </style>
      <div id="root" data-composition-id="mm-10-panel-speech" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop sk-pal-mm-kraft-desk sk-kraft">
          <div class="sk-cut" id="panel">
            <div class="sk-paper-white" id="pp"></div>
            <div class="sk-hand" id="pt">3 langkah</div>
            <div class="it sk-hand" id="i0" style="top:180px"><b>1</b>catat</div>
            <div class="it sk-hand" id="i1" style="top:330px"><b>2</b>rapikan</div>
            <div class="it sk-hand" id="i2" style="top:480px"><b>3</b>otomatis</div>
          </div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-10-panel-speech';
          const $ = SK.finder(ID);
          $('pp').style.clipPath = SK.torn(440, 700, 320, { edges: 'trbl', amp: 12 });
          // torn-panel-list: the panel stays on the side away from the face; one item per word
          const slide = SK.onTwos(M.track(1, [[0.3, 0, [16, 0.8]]]));
          SK.clip(ID, { T: 6, update: (t) => {
            SK.piece($('panel'), { x: 600 + 600 * slide(t), y: 520, r: 2 }, 321, t);
            ['i0', 'i1', 'i2'].forEach((id, i) => SK.enter($(id), t - (1.0 + i * 0.5), 'rise'));
            SK.enter($('pt'), t - 0.7, 'fade');
            SK.grain($('grain'), t, 4);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/mix-media/compositions/mm-10-panel-speech-front.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the quote is invented. Front layer of mm-10 (track 7): a paper speech bubble whose tail points at the speaker's mouth, with the quoted words written in as they are said. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #bub { position: absolute; left: 0; top: 0; width: 540px; height: 330px; transform-origin: 30% 100%; }
        #bp { position: absolute; inset: 0; }
        #q { position: absolute; left: 40px; right: 40px; top: 70px; text-align: center; font-size: 74px; font-weight: 700; line-height: 1.02; color: #2b2118; }
      </style>
      <div id="root" data-composition-id="mm-10-panel-speech-front" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage sk-stop">
          <div class="sk-cut" id="bub"><div class="sk-paper-cream" id="bp"></div><div class="sk-hand" id="q">"kok ribet sih?"</div></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'mm-10-panel-speech-front';
          const $ = SK.finder(ID);
          // speech-cutout: an oval of paper with a tail, torn at the edge, aimed down at the speaker (left of centre)
          const pts = [];
          for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2, j = 1 + (SK.rng(330 + i)() - 0.5) * 0.04;
            pts.push(`${(270 + Math.cos(a) * 262 * j).toFixed(1)}px ${(135 + Math.sin(a) * 128 * j).toFixed(1)}px`);
            if (i === 10) pts.push('190px 330px', '150px 258px');
          }
          $('bp').style.clipPath = `polygon(${pts.join(',')})`;
          SK.clip(ID, { T: 6, bg: null, update: (t) => {
            const s = Math.round(SK.stepTime(t - 2.9, SK.STOP_FPS) * SK.STOP_FPS);
            SK.piece($('bub'), { x: 40, y: 470, r: -3, s: s < 0 ? 0 : [0.5, 1.12, 1][Math.min(s, 2)], o: s >= 0 ? 1 : 0 }, 331, t);
            SK.write($('q'), SK.smooth((t - 3.2) / 0.6));
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 2: Append them to the manifest and regenerate the host**

In `docs/agents/references/style-examples/mix-media/examples.json` replace:

old:
```json
    {"clip": "mm-03-torn-window", "duration": 6, "treatment": "collage", "stills": [0.8, 5.7], "cutout": true, "front": true},
    {"clip": "mm-04-polaroid-caption", "duration": 5, "treatment": "collage", "stills": [1.8, 4.7], "cutout": true, "front": true}
  ]
```

new:
```json
    {"clip": "mm-03-torn-window", "duration": 6, "treatment": "collage", "stills": [0.8, 5.7], "cutout": true, "front": true},
    {"clip": "mm-04-polaroid-caption", "duration": 5, "treatment": "collage", "stills": [1.8, 4.7], "cutout": true, "front": true},
    {"clip": "mm-05-halftone-punch", "duration": 5, "treatment": "collage", "stills": [1.2, 2.3, 4.0], "cutout": true, "punch": [[2.2, 1.15]]},
    {"clip": "mm-06-frame-grid", "duration": 5.5, "treatment": "collage", "stills": [1.4, 4.2], "cutout": true, "front": true},
    {"clip": "mm-07-scrapbook-scribble", "duration": 6, "treatment": "collage", "stills": [1.3, 4.4], "cutout": true},
    {"clip": "mm-08-split-self", "duration": 6, "treatment": "collage", "stills": [1.2, 4.5], "cutouts": [{"x": -265, "s": 0.66}, {"x": 265, "s": 0.66, "at": 2.0}]},
    {"clip": "mm-09-sticker-ransom", "duration": 5.5, "treatment": "collage", "stills": [1.35, 3.8], "cutout": true, "front": true},
    {"clip": "mm-10-panel-speech", "duration": 6, "treatment": "collage", "stills": [2.4, 4.8], "cutouts": [{"x": -230, "s": 0.9}], "front": true}
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
npm run check:style-examples -- mix-media
```

Expected: `0 errors`; stills in `renders/style-examples/mix-media/`.

Clip-local stills: mm-05 1.2 / 2.3 / 4.0 (inks swap and the speaker punches in on the beat); mm-06 1.4 / 4.2 (the screen hole shrinks to a phone around the speaker); mm-07 1.3 / 4.4 (proof cards in the top third, "+40%" circled); mm-08 1.2 / 4.5 ("then" alone, then "now" beside it); mm-09 1.35 / 3.8 (ransom letters with their tilt, stickers around the face); mm-10 2.4 / 4.8 (list panel right of the shifted speaker, bubble pointing at the head). Keep the face zone clear in every still. Traps: `SK.enter` replaces the transform (re-apply a letter's tilt after it); a screen hole in a front cover is `clip-path: path(evenodd, …)`.

- [ ] **Step 4: Document the patterns and examples**

In `docs/agents/references/styles/mix-media.md` replace:

old:
```md
(`mm-01` … `mm-04`,
```

new:
```md
(`mm-01` … `mm-10`,
```

In `docs/agents/references/styles/mix-media.md` replace:

old:
```md


## References
```

new:
```md

| **frame-in-frame** | Dena shows inside a paper phone or laptop screen | "di HP gue…", digital context | The frame lands on the device word | paper tap | A frame over the face | front mount: a cover with a screen-shaped `clip-path: path(evenodd, …)` hole + a CSS bezel |
| **ransom-caption** | A phrase of mismatched cut-out letters, pasted | A cheeky punchline | Letters paste one by one, done on the last word | paper slap | More than 3 words; unreadable | one chip per letter with a seeded font, colour, and tilt (`SK.rng`), popped on twos |
| **sticker-bomb** | Library stickers pop around Dena on the beats | High energy, celebration | One sticker per beat or word, at most 6 | sticker pop | Stickers on the face; stickers for the whole clip | `.sk-obj-*-sticker` divs on the front mount, 2-step pop with overshoot |
| **torn-panel-list** | Dena on one side; a list on torn paper on the other | A list while the face stays on screen | One item per word | paper swipe | More than 4 items; a panel over the face | manifest `cutouts: [{ x, s }]` moves Dena aside; a torn panel on the back mount |
| **speech-cutout** | A paper speech bubble from Dena with a quote | Quoting someone | The bubble on "bilang"; the words with the quote | paper pop | A quote over 8 words; a tail that misses Dena | a torn paper oval with a tail (`clip-path: polygon`) on the front mount + `SK.write` |

## References
```

In `docs/agents/references/styles/mix-media.md` replace:

old:
```md
- The placeholder in the examples is `style-examples/assets/placeholder-cutout.webm`,
  rendered from `docs/agents/references/mix-media-placeholder/` (commands in its
  `README.md`).
```

new:
```md
- The placeholder in the examples is `style-examples/assets/placeholder-cutout.webm`,
  rendered from `docs/agents/references/mix-media-placeholder/` (commands in its
  `README.md`).
- Host speaker layers come from the example manifest: `cutout: true` is one
  full-frame speaker; `cutouts: [{ x, y, s, at }]` places one or two (offset px,
  scale about the feet, pop-in second), the second on track 5 (`mm-08`, `mm-10`);
  `punch: [[at, scale]]` steps the speaker in and out on the word (`mm-05`). In a
  video the same host code is written into `videos/<slug>/index.html`.
- The halftone backdrop recolours on the beat by setting `--sk-bg` and the dot
  colour on the stage; never filter the speaker `<video>` (`mm-05`).
```

In `docs/agents/references/styles/mix-media.md` replace:

old:
```md
| polaroid-frame | camera shutter | 0.1–0.14 |
```

new:
```md
| polaroid-frame | camera shutter | 0.1–0.14 |
| sticker-bomb, ransom-caption, speech-cutout | sticker pop / paper slap / paper pop | 0.08–0.12 |
| frame-in-frame, torn-panel-list, split-self | paper tap / paper swipe / two paper slaps | 0.08–0.12 |
```

In `docs/agents/references/styles/mix-media.md` replace:

old:
```md
| `style-examples/mix-media/compositions/mm-04-polaroid-caption.html` | polaroid-frame + paper-strip-caption (front) | collage |
```

new:
```md
| `style-examples/mix-media/compositions/mm-04-polaroid-caption.html` | polaroid-frame + paper-strip-caption (front) | collage |
| `style-examples/mix-media/compositions/mm-05-halftone-punch.html` | halftone-duotone + zoom-punch-cutout (manifest `punch`) | collage |
| `style-examples/mix-media/compositions/mm-06-frame-grid.html` | frame-in-frame (front) + grid-backdrop | collage |
| `style-examples/mix-media/compositions/mm-07-scrapbook-scribble.html` | scrapbook-stack + scribble-emphasis | collage |
| `style-examples/mix-media/compositions/mm-08-split-self.html` | split-self (manifest `cutouts`, the second pops in) | collage |
| `style-examples/mix-media/compositions/mm-09-sticker-ransom.html` | sticker-bomb + ransom-caption (front) | collage |
| `style-examples/mix-media/compositions/mm-10-panel-speech.html` | torn-panel-list + speech-cutout (front) | collage |
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/agents/references/style-examples/mix-media docs/agents/references/styles/mix-media.md && git status --short && git commit -q -F - <<'MSG'
feat: mix-media examples for all 20 patterns (halftone, frame, scrapbook, split-self, stickers, panel)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 5: Seven parallax examples and six new patterns

**Files:**
- Create: `docs/agents/references/style-examples/parallax/compositions/px-05-push-headline.html`, `docs/agents/references/style-examples/parallax/compositions/px-06-peel-steps.html`, `docs/agents/references/style-examples/parallax/compositions/px-07-wipe-fog.html`, `docs/agents/references/style-examples/parallax/compositions/px-08-map-flyover.html`, `docs/agents/references/style-examples/parallax/compositions/px-09-photo-dust.html`, `docs/agents/references/style-examples/parallax/compositions/px-10-tilt-light.html`, `docs/agents/references/style-examples/parallax/compositions/px-11-cards-float.html`
- Modify: `docs/agents/references/style-examples/parallax/examples.json`; generated `index.html`, `snapshots.json`
- Modify: `docs/agents/references/styles/parallax.md` (header range, Patterns, Build Recipe, SFX, Examples)

- [ ] **Step 1: Write the example compositions**

Every clip follows the example rules: "Example only" comment (made-up words and numbers), one `SK.clip`, a pure function of `t`, no `visibility`, no `font-family` in the clip `<style>`, no `../` in a url, no template-literal selectors, no `!important`.

Create `docs/agents/references/style-examples/parallax/compositions/px-05-push-headline.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the headline is invented. The scene is the library kit scene.warung-counter (Codex, not a real place); the speaker is the host's matted <video> (placeholder here) in front of it (parallax-stage). The camera pushes through the counter, then the headline sits between the planes. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        /* sized for the end of the push: the text plane grows ≈1.75× about the centre, so top 560 lands near y 250 */
        #head { position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 96px; line-height: .95; color: #fff8ec; text-shadow: 0 6px 24px rgba(0,0,0,.35); }
      </style>
      <div id="root" data-composition-id="px-05-push-headline" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage">
          <div class="sk-view" id="view"><div class="sk-world" id="world">
            <div class="sk-ly" id="back"><img class="sk-plate" src="vendor/asset-lib/scenes/warung-counter/plate.webp" alt="" /></div>
            <div class="sk-ly" id="mid"><img class="sk-plate" src="vendor/asset-lib/scenes/warung-counter/mid.png" alt="" /></div>
            <div class="sk-ly" id="txt"><div class="sk-display" id="head">mulai dari<br />warung</div></div>
            <div class="sk-ly" id="front"><img class="sk-plate" src="vendor/asset-lib/scenes/warung-counter/front.png" alt="" /></div>
          </div></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'px-05-push-headline';
          const $ = SK.finder(ID);
          // far planes so the push can pass the front one without blowing the others up (scale ≤ 1.7)
          const L = [{ el: $('back'), z: -4000 }, { el: $('mid'), z: -2400 }, { el: $('txt'), z: -1600 }, { el: $('front'), z: -100 }];
          L.forEach(({ el, z }, i) => SK.layer(el, z, { fill: i === 0 ? 1.2 : i === 1 ? 1.08 : 1 }));
          // push-through: the camera travels 1150 px in z; the counter passes the lens, blurs, and is gone
          const push = M.track(0, [[0.6, 1150, [2.2, 1]]]);
          SK.clip(ID, { T: 6, update: (t) => {
            const z = push(t);
            SK.camera($('world'), { z, y: -0.04 * z });
            const near = (SK.P + 100) / (SK.P + 100 - z); // apparent scale of the front layer
            $('front').style.opacity = M.clamp((4 - near) / 2).toFixed(4);
            $('front').style.filter = `blur(${Math.min(16, (near - 1) * 5).toFixed(2)}px)`;
            $('back').style.filter = 'blur(6px)';
            $('mid').style.filter = `blur(${(3 * (1 - M.clamp(z / 1150))).toFixed(2)}px)`;
            // depth-headline: the words wait behind the counter and read once the push has passed it
            SK.enter($('head'), t - 2.6, 'rise', { dy: 40 });
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/parallax/compositions/px-06-peel-steps.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the words are invented. Four paper planes from the paper pack at different depths: each top sheet peels away on its word until the base is left; the camera drifts in held steps. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .sh { position: absolute; left: 110px; top: 260px; width: 860px; height: 1400px; }
        #base .sh { left: 0; top: 0; width: 1080px; height: 1920px; }
        #l0 { rotate: -2deg; } #l1 { rotate: 1.5deg; } #l2 { rotate: -1deg; }
        .w { position: absolute; left: 0; right: 0; top: 820px; text-align: center; font-size: 170px; font-weight: 700; line-height: 1; color: #2b2118; }
        .k { position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-size: 56px; letter-spacing: .08em; color: #6b5a44; }
        #base .w { font-size: 190px; color: #fff4e0; }
        #base .k { color: #e8d7bc; }
      </style>
      <div id="root" data-composition-id="px-06-peel-steps" data-width="1080" data-height="1920" data-duration="5.5">
        <div class="sk-stage sk-stop sk-kraft-dark">
          <div class="sk-view" id="view"><div class="sk-world" id="world">
            <div class="sk-ly" id="base"><div class="sh sk-kraft-dark"></div><div class="k sk-sans">YANG TERSISA</div><div class="w sk-display">sistem</div></div>
            <div class="sk-ly" id="l2"><div class="sh sk-cut sk-grid" id="p2"></div><div class="k sk-sans">LAPISAN 3</div><div class="w sk-hand">excel</div></div>
            <div class="sk-ly" id="l1"><div class="sh sk-cut sk-newsprint" id="p1"></div><div class="k sk-sans">LAPISAN 2</div><div class="w sk-hand">catatan</div></div>
            <div class="sk-ly" id="l0"><div class="sh sk-cut sk-paper-cream" id="p0"></div><div class="k sk-sans">LAPISAN 1</div><div class="w sk-hand">chat</div></div>
          </div></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'px-06-peel-steps';
          const $ = SK.finder(ID);
          ['p0', 'p1', 'p2'].forEach((id, i) => ($(id).style.clipPath = SK.torn(860, 1400, 340 + i, { edges: 'trbl', amp: 14, step: 24 })));
          const L = [{ el: $('base'), z: -1300 }, { el: $('l2'), z: -800 }, { el: $('l1'), z: -450 }, { el: $('l0'), z: -150 }];
          L.forEach(({ el, z }, i) => SK.layer(el, z, { fill: i === 0 ? 1.2 : 1.12 }));
          // layer-peel: each top sheet slides off on its word, in held steps (6 per second)
          const PEEL = [['l0', 1.0], ['l1', 2.1], ['l2', 3.2]];
          const step6 = (f) => (t) => f(SK.stepTime(t, 6));
          const peel = PEEL.map(([, at]) => step6((t) => M.eo(M.clamp((t - at) / 0.6))));
          // stepped-multiplane: the camera drifts in held steps; each plane moves by its own depth
          const cx = step6((t) => -40 + 16 * t), cz = step6((t) => 20 * t);
          SK.clip(ID, { T: 5.5, update: (t) => {
            SK.camera($('world'), { x: cx(t), z: cz(t) });
            PEEL.forEach(([id], i) => {
              const k = peel[i](t);
              SK.layer($(id), L[3 - i].z, { fill: 1.12 });
              $(id).style.transform += ` translateX(${(-1500 * k).toFixed(1)}px) rotate(${(-6 * k).toFixed(2)}deg)`;
            });
            // no depth of field here: every plane carries a word, and text is never blurred
            SK.grain($('grain'), t, 5);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/parallax/compositions/px-07-wipe-fog.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. The scene is the library kit scene.city-dusk (Codex, not a real place). Two soft fog banks drift between the planes at different speeds; a blurred paper parcel (library cut-out paper.parcel-box) sweeps across the lens as the wipe to the next line. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .fog { position: absolute; left: -400px; width: 1880px; height: 520px; border-radius: 50%; filter: blur(40px); }
        #fogFar { top: 700px; background: radial-gradient(ellipse at 50% 50%, rgba(255,220,200,.85), rgba(255,220,200,0) 72%); }
        #fogNear { top: 980px; background: radial-gradient(ellipse at 50% 50%, rgba(222,206,240,.8), rgba(222,206,240,0) 72%); }
        #wipe { position: absolute; left: 0; top: 380px; width: 1500px; filter: blur(22px); }
      </style>
      <div id="root" data-composition-id="px-07-wipe-fog" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage">
          <div class="sk-view" id="view"><div class="sk-world" id="world">
            <div class="sk-ly" id="back"><img class="sk-plate" src="vendor/asset-lib/scenes/city-dusk/plate.webp" alt="" /></div>
            <div class="sk-ly" id="haze1"><div class="fog" id="fogFar"></div></div>
            <div class="sk-ly" id="mid"><img class="sk-plate" src="vendor/asset-lib/scenes/city-dusk/mid.png" alt="" /></div>
            <div class="sk-ly" id="haze2"><div class="fog" id="fogNear"></div></div>
            <div class="sk-ly" id="front"><img class="sk-plate" src="vendor/asset-lib/scenes/city-dusk/front.png" alt="" /></div>
          </div></div>
          <div class="sk-obj-parcel-box" id="wipe"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'px-07-wipe-fog';
          const $ = SK.finder(ID);
          const L = [{ el: $('back'), z: -1400 }, { el: $('haze1'), z: -900 }, { el: $('mid'), z: -500 }, { el: $('haze2'), z: -300 }, { el: $('front'), z: -80 }];
          L.forEach(({ el, z }, i) => SK.layer(el, z, { fill: i === 0 ? 1.2 : 1.06 }));
          const push = M.track(0, [[0.2, 110, [1.4, 1]]]);
          // foreground-wipe: a near object crosses the lens quickly, blurred, and hands over to the next shot
          const wipe = M.track(1300, [[3.6, -1900, [7, 1]]]);
          SK.clip(ID, { T: 6, update: (t) => {
            SK.camera($('world'), { z: push(t), x: -12 + 6 * t });
            // multiplane-fog: the far bank drifts slowly, the near bank faster the other way
            $('fogFar').style.transform = `translateX(${(-30 + 14 * t).toFixed(1)}px)`;
            $('fogNear').style.transform = `translateX(${(40 - 34 * t).toFixed(1)}px)`;
            $('wipe').style.transform = `translateX(${wipe(t).toFixed(1)}px) rotate(-8deg)`;
            SK.dof(L.filter((l, i) => i % 2 === 0), -500, { k: 220, max: 3 });
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/parallax/compositions/px-08-map-flyover.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the route is invented to show the mechanism. The map is the library's Natural Earth Southeast Asia map (SK.mapSvg('sea'), public domain). The camera flies low over the tilted map toward the named city; the pin stands up off the plane. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        #sky { position: absolute; inset: 0; background: linear-gradient(#f7d9b0 0%, #e9a97f 45%, #c98c6c 100%); }
        #view { position: absolute; inset: 0; perspective: 1100px; perspective-origin: 540px 620px; overflow: hidden; }
        /* the plane is the sea: 6000×5000, pivot 3000/3900 at screen 540, 1306, so it reaches far past the map
           (overflow: hidden would flatten the standing pin, so the sea must simply be bigger than the map's travel) */
        #plane { position: absolute; left: -2460px; top: -2594px; width: 6000px; height: 5000px; background: #17415f; transform-origin: 3000px 3900px; transform: rotateX(58deg); transform-style: preserve-3d; }
        #slide { position: absolute; left: 0; top: 0; width: 1980px; height: 1332px; transform-style: preserve-3d; }
                #map svg { display: block; }
        .pin { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; }
        .stand { position: absolute; left: -200px; bottom: 0; width: 400px; transform-origin: 50% 100%; text-align: center; }
        .stand i { display: block; margin: 0 auto; width: 56px; height: 56px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #e23b3b; box-shadow: 0 0 0 5px #fff; }
        .stand b { display: block; margin-top: 12px; font-size: 64px; font-weight: 800; color: #fff; text-shadow: 0 3px 10px rgba(0,0,0,.6); white-space: nowrap; }
        #ttl { position: absolute; left: 0; right: 0; top: 60px; text-align: center; font-size: 96px; line-height: 1; color: #2b2118; }
        #src { left: 40px; top: 1820px; }
      </style>
      <div id="root" data-composition-id="px-08-map-flyover" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage">
          <div id="sky"></div>
          <div id="view"><div id="plane"><div id="slide">
            <div id="map"></div>
            <div class="pin" id="pj"><div class="stand"><i></i><b>Jakarta</b></div></div>
          </div></div></div>
          <div class="sk-display" id="ttl">kirim ke jakarta</div>
          <div class="sk-source" id="src">Peta: Natural Earth (domain publik)</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'px-08-map-flyover';
          const $ = SK.finder(ID);
          $('map').innerHTML = SK.mapSvg('sea', { fill: '#d8cfb4', stroke: '#8a7f68', strokeWidth: 2 });
          const J = SK.geo(...SK.CITIES.jakarta, 'sea');
          $('pj').style.transform = `translate3d(${J.x.toFixed(1)}px, ${J.y.toFixed(1)}px, 0)`;
          // map-flyover: the plane lies tilted 58° below the horizon; the map slides along it toward the camera
          // until the named city reaches the plane's centre (screen y ≈ 1306)
          const fly = M.track(0, [[0.3, 1, [1.6, 1]]]);
          SK.clip(ID, { T: 6, update: (t) => {
            const u = fly(t);
            const x = 3000 - J.x, y0 = 3900 - J.y - 1100, y1 = 3900 - J.y;
            $('slide').style.transform = `translate(${x.toFixed(1)}px, ${(y0 + (y1 - y0) * u).toFixed(1)}px)`;
            $('pj').style.opacity = t >= 1.2 ? '1' : '0';
            SK.enter($('pj').firstElementChild, t - 1.2, 'drop');
            $('pj').firstElementChild.style.transform += ' rotateX(-58deg)'; // stand the pin up off the plane
            SK.enter($('ttl'), t - 0.3, 'rise');
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/parallax/compositions/px-09-photo-dust.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: a real public-domain archival photo ("Woman typist", c. 1900, Library of Congress; see THIRD_PARTY_NOTICES.md) split into a reconstructed plate and the cut-out subject, pushed slowly in 2.5D; seeded dust drifts in front. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .sk-ly > img.sk-plate { filter: sepia(.4) contrast(1.05); }
        #dust i { position: absolute; left: 0; top: 0; border-radius: 50%; background: #fff4dc; filter: blur(1px); }
        #src { left: 40px; top: 1810px; }
      </style>
      <div id="root" data-composition-id="px-09-photo-dust" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage">
          <div class="sk-view" id="view"><div class="sk-world" id="world">
            <div class="sk-ly" id="back"><img class="sk-plate" src="assets/px-archive-plate.jpg" alt="" /></div>
            <div class="sk-ly" id="subj"><img class="sk-plate" src="assets/px-archive-subject.png" alt="" /></div>
            <div class="sk-ly" id="dust"></div>
          </div></div>
          <div class="sk-grain" id="grain"></div>
          <div class="sk-source" id="src">Foto: "Woman typist", ±1900, Library of Congress (domain publik)</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'px-09-photo-dust';
          const $ = SK.finder(ID);
          const L = [{ el: $('back'), z: -700 }, { el: $('subj'), z: -200 }, { el: $('dust'), z: 150 }];
          L.forEach(({ el, z }, i) => SK.layer(el, z, { fill: i === 0 ? 1.18 : i === 1 ? 1.06 : 1.1 }));
          // dust-motes: small seeded specks in the near plane, drifting up slowly and twinkling
          const r = SK.rng(360), N = 46;
          const D = Array.from({ length: N }, () => ({ x: r() * 1080, y: r() * 1920, s: 3 + r() * 7, v: 6 + r() * 14, p: r() * 6.28 }));
          $('dust').innerHTML = D.map(() => '<i></i>').join('');
          const motes = [...$('dust').querySelectorAll('i')];
          // photo-2.5d: a slow push and a small drift, inside the Depth Budget (scale ≤ 12%, drift ≤ 40 px)
          const push = M.track(0, [[0.2, 130, [1.2, 1]]]);
          SK.clip(ID, { T: 6, update: (t) => {
            SK.camera($('world'), { z: push(t), x: -20 + 7 * t });
            motes.forEach((m, i) => {
              const d = D[i], y = ((d.y - d.v * t) % 1920 + 1920) % 1920;
              m.style.width = m.style.height = `${d.s.toFixed(1)}px`;
              m.style.transform = `translate(${(d.x + 8 * Math.sin(t * 0.6 + d.p)).toFixed(1)}px, ${y.toFixed(1)}px)`;
              m.style.opacity = (0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 + d.p))).toFixed(3);
            });
            SK.dof(L.slice(0, 2), -200, { k: 110, max: 5 });
            SK.enter($('src'), t - 0.6, 'fade');
            SK.grain($('grain'), t, 7);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/parallax/compositions/px-10-tilt-light.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only. The scene is the library kit scene.street-motor (Codex, not a real place). The camera tilts up from the street to the sky over the plate and mid planes; a band of morning light sweeps the planes, each at its own speed. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .beam { position: absolute; left: 0; top: -200px; width: 620px; height: 2400px; mix-blend-mode: screen; transform-origin: 50% 50%;
          background: linear-gradient(90deg, rgba(255,226,170,0), rgba(255,226,170,.55) 50%, rgba(255,226,170,0)); }
      </style>
      <div id="root" data-composition-id="px-10-tilt-light" data-width="1080" data-height="1920" data-duration="6">
        <div class="sk-stage">
          <div class="sk-view" id="view"><div class="sk-world" id="world">
            <div class="sk-ly" id="back"><img class="sk-plate" src="vendor/asset-lib/scenes/street-motor/plate.webp" alt="" /><div class="beam" id="b0"></div></div>
            <div class="sk-ly" id="mid"><img class="sk-plate" src="vendor/asset-lib/scenes/street-motor/mid.png" alt="" /><div class="beam" id="b1"></div></div>
          </div></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'px-10-tilt-light';
          const $ = SK.finder(ID);
          // two planes only: in a big vertical tilt the kit's front scooter would lift off the street it stands on
          const L = [{ el: $('back'), z: -1400 }, { el: $('mid'), z: -500 }];
          // tall plates (fill 1.55) so the tilt never shows an edge
          L.forEach(({ el, z }) => SK.layer(el, z, { fill: 1.55 }));
          // tilt-reveal: start low on the street, tilt up to the sky and the mountain
          const tilt = M.track(0, [[0.4, 1, [1.8, 1]]]);
          // light-sweep: the band crosses the far plane slowly and the middle plane faster (depth)
          const sweep = M.track(0, [[1.4, 1, [1.5, 1]]]);
          SK.clip(ID, { T: 6, update: (t) => {
            const u = tilt(t);
            SK.camera($('world'), { y: 440 - 880 * u, rx: 3 - 6 * u });
            const w = sweep(t);
            $('b0').style.transform = `translateX(${(-700 + 1600 * w).toFixed(1)}px) rotate(18deg)`;
            $('b1').style.transform = `translateX(${(-900 + 2300 * w).toFixed(1)}px) rotate(18deg)`;
            $('b0').style.opacity = $('b1').style.opacity = (Math.sin(Math.PI * M.clamp(w)) * 0.9 + 0.1 * (w > 0 ? 1 : 0)).toFixed(3);
            SK.dof(L, -500, { k: 160, max: 4 });
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

Create `docs/agents/references/style-examples/parallax/compositions/px-11-cards-float.html`:

```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Example only: the steps are invented. The scene is the library kit scene.cafe-cowork (Codex, not a real place); the floating objects are library paper cut-outs. Step cards fly out of the depth and past the lens one by one; the camera drifts like a hand-held shot. -->
    <template>
      <style>
        #root { position: absolute; inset: 0; }
        .card { position: absolute; left: 290px; top: 620px; width: 500px; height: 300px; transform-style: preserve-3d; }
        .card .cp { position: absolute; inset: 0; }
        .card b { position: absolute; left: 40px; top: 36px; font-size: 90px; line-height: 1; color: var(--sk-accent, #d62828); }
        .card span { position: absolute; left: 40px; top: 150px; font-size: 96px; font-weight: 700; line-height: 1; color: #2b2118; white-space: nowrap; }
        .ob { position: absolute; left: 0; top: 0; }
      </style>
      <div id="root" data-composition-id="px-11-cards-float" data-width="1080" data-height="1920" data-duration="7">
        <div class="sk-stage sk-stop">
          <div class="sk-view" id="view"><div class="sk-world" id="world">
            <div class="sk-ly" id="back"><img class="sk-plate" src="vendor/asset-lib/scenes/cafe-cowork/plate.webp" alt="" /></div>
            <div class="sk-ly" id="mid"><img class="sk-plate" src="vendor/asset-lib/scenes/cafe-cowork/mid.png" alt="" /></div>
            <div class="sk-ly" id="front"><img class="sk-plate" src="vendor/asset-lib/scenes/cafe-cowork/front.png" alt="" /></div>
            <div class="ob sk-cut sk-obj-coin-stack" id="o0" style="width:300px"></div>
            <div class="ob sk-cut sk-obj-chat-bubble" id="o1" style="width:320px"></div>
            <div class="ob sk-cut sk-obj-lightbulb" id="o2" style="width:250px"></div>
            <div class="ob sk-cut sk-obj-calculator" id="o3" style="width:260px"></div>
            <div class="card sk-cut" id="c0"><div class="cp sk-paper-white" id="p0"></div><b class="sk-display">1</b><span class="sk-hand">catat</span></div>
            <div class="card sk-cut" id="c1"><div class="cp sk-paper-white" id="p1"></div><b class="sk-display">2</b><span class="sk-hand">rapikan</span></div>
            <div class="card sk-cut" id="c2"><div class="cp sk-paper-white" id="p2"></div><b class="sk-display">3</b><span class="sk-hand">otomatis</span></div>
          </div></div>
          <div class="sk-grain" id="grain"></div>
        </div>
      </div>
      <script>
        (() => {
          const ID = 'px-11-cards-float';
          const $ = SK.finder(ID);
          // the scene sits far back so every card and object stays in front of its nearest plane (-1900)
          const L = [{ el: $('back'), z: -3000 }, { el: $('mid'), z: -2400 }, { el: $('front'), z: -1900 }];
          L.forEach(({ el, z }, i) => SK.layer(el, z, { fill: i === 0 ? 1.2 : 1.08 }));
          ['p0', 'p1', 'p2'].forEach((id, i) => ($(id).style.clipPath = SK.torn(500, 300, 370 + i, { edges: 'trbl', amp: 8 })));
          // float-objects: library cut-outs held at different depths, each bobbing on its own slow sine
          const OB = [[70, 330, -1200, 0.0], [820, 420, -900, 1.3], [120, 1180, -600, 2.1], [800, 1250, -1000, 0.7]];
          // card-flythrough: each card comes out of the depth and passes the lens, one per step word
          const FLY = [0.6, 2.2, 3.8], DUR = 2.2, XO = [-60, 70, -30];
          SK.clip(ID, { T: 7, update: (t) => {
            // handheld-drift: a small smooth drift on the whole world, never a jump
            const h = SK.handheld(t, 371, { amp: 7 });
            SK.camera($('world'), { x: h.x, y: h.y, z: 40 + 10 * t, rx: h.r });
            OB.forEach(([x, y, z, p], i) => {
              const bob = Math.sin(t * 0.9 + p) * 14, rot = Math.sin(t * 0.7 + p * 2) * 5;
              $('o' + i).style.transform = `translate3d(${x}px, ${(y + bob).toFixed(1)}px, ${z}px) rotate(${rot.toFixed(2)}deg)`;
              $('o' + i).style.opacity = M.clamp((t - 0.3 - i * 0.25) / 0.3).toFixed(4); // fade in (SK.enter would replace the 3D transform)
            });
            FLY.forEach((at, i) => {
              const u = M.clamp((t - at) / DUR), z = -1700 + 2700 * u * u;
              const el = $('c' + i);
              el.style.transform = `translate3d(${XO[i]}px, 0px, ${z.toFixed(1)}px) rotate(${(-4 + 3 * i).toFixed(1)}deg)`;
              el.style.opacity = t < at ? '0' : M.clamp((900 - z) / 300).toFixed(4);
            });
            SK.dof(L, -2400, { k: 200, max: 4 });
            SK.grain($('grain'), t, 9);
          } });
        })();
      </script>
    </template>
  </body>
</html>
```

- [ ] **Step 2: Append them to the manifest and regenerate the host**

In `docs/agents/references/style-examples/parallax/examples.json` replace:

old:
```json
    {"clip": "px-03-archive-zoom", "duration": 5, "treatment": "panel", "stills": [1.2, 2.7, 4.7]},
    {"clip": "px-04-stage", "duration": 6, "treatment": "parallax-stage", "stills": [2.0, 5.5], "cutout": true}
  ]
```

new:
```json
    {"clip": "px-03-archive-zoom", "duration": 5, "treatment": "panel", "stills": [1.2, 2.7, 4.7]},
    {"clip": "px-04-stage", "duration": 6, "treatment": "parallax-stage", "stills": [2.0, 5.5], "cutout": true},
    {"clip": "px-05-push-headline", "duration": 6, "treatment": "parallax-stage", "stills": [0.3, 1.6, 4.8], "cutout": true},
    {"clip": "px-06-peel-steps", "duration": 5.5, "treatment": "cutaway", "stills": [0.6, 1.3, 4.6]},
    {"clip": "px-07-wipe-fog", "duration": 6, "treatment": "cutaway", "stills": [1.5, 3.8, 5.6]},
    {"clip": "px-08-map-flyover", "duration": 6, "treatment": "cutaway", "stills": [0.4, 2.5, 5.6]},
    {"clip": "px-09-photo-dust", "duration": 6, "treatment": "cutaway", "stills": [0.6, 5.4]},
    {"clip": "px-10-tilt-light", "duration": 6, "treatment": "cutaway", "stills": [0.3, 2.4, 5.6]},
    {"clip": "px-11-cards-float", "duration": 7, "treatment": "cutaway", "stills": [2.24, 3.84, 5.44]}
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
npm run check:style-examples -- parallax
```

Expected: `0 errors`; stills in `renders/style-examples/parallax/`.

Clip-local stills: px-05 0.3 / 1.6 / 4.8 (counter, the push passing it, the headline between planes); px-06 0.6 / 1.3 / 4.6 (stacked cards, a peel mid-step, the base); px-07 1.5 / 3.8 / 5.6 (fog bands between planes, the blurred parcel wiping); px-08 0.4 / 2.5 / 5.6 (the flyover toward the standing pin); px-09 0.6 / 5.4 (2.5D photo with dust); px-10 0.3 / 2.4 / 5.6 (street, light band, sky); px-11 2.24 / 3.84 / 5.44 (each card near the lens among floating objects). Traps: see the parallax Build Recipe notes added here (push-through depths, map plane, front props in a tilt, no blur on text planes).

- [ ] **Step 4: Document the patterns and examples**

In `docs/agents/references/styles/parallax.md` replace:

old:
```md
(`px-01` …
`px-04`,
```

new:
```md
(`px-01` …
`px-11`,
```

In `docs/agents/references/styles/parallax.md` replace:

old:
```md


## References
```

new:
```md

| **depth-headline** | Headline words sit on a plane between the scene's layers (behind the foreground) | Opening a topic with atmosphere | The words read once the camera clears the foreground | low swell | A headline in front of every layer (no depth) | a text plane via `SK.layer` between mid and front; size it for its scale at the end of the move |
| **card-flythrough** | Cards at different depths; each flies out of the depth and past the lens | A list of steps with depth | One card past the lens per step | whoosh per card | More than 4 cards; unreadable while passing | cards in the world with a `translate3d` z that grows over time; the scene sits behind the nearest card |
| **float-objects** | Library cut-outs float at different depths, bobbing slowly | Money, ideas, tools "scattered" | Each object appears on its word | soft chime | Objects nobody named; fast motion | `.sk-obj-*` with `translate3d(x, y, z)` + a slow sine bob; fade with opacity (never `SK.enter`, it replaces the transform) |
| **light-sweep** | A band of light sweeps the planes at different speeds | A change of mood, "pagi hari…" | 1–2 s sweep starting on the time word | light swell | A glare over the subject | a `mix-blend-mode: screen` gradient per plane, offset by depth |
| **dust-motes** | Seeded dust specks in the near plane | Archive or nostalgia mood | Constant, slow | room tone | Large, fast specks (reads as snow) | dots from `SK.rng` in a near `.sk-ly`, drifting and twinkling |
| **handheld-drift** | The camera drifts like a hand-held shot | Making a still scene feel alive | Constant, ≤ 6–8 px | — | Big shake (reads as an earthquake) | `SK.handheld(t, seed, { amp })` into `SK.camera({ x, y, rx })` |

## References
```

In `docs/agents/references/styles/parallax.md` replace:

old:
```md
- Dolly-zoom: `const { P, d } = SK.dollyZoom(u, { z0: -400, d1: 250 });` then
  `$('view').style.perspective = P + 'px'` and `SK.camera(world, { z: d })`.
```

new:
```md
- Dolly-zoom: `const { P, d } = SK.dollyZoom(u, { z0: -400, d1: 250 });` then
  `$('view').style.perspective = P + 'px'` and `SK.camera(world, { z: d })`.
- Push-through: put the planes behind far back (−1600 … −4000) so the camera can pass
  the front plane (≈ 1150 px of travel) without blowing the others up; fade and blur
  the front plane by its apparent scale (`px-05`).
- Map flyover: tilt a large sea plane (`rotateX` ≈ 58°) with its pivot on the
  screen, slide the map on it, and stand pins up with the opposite `rotateX`;
  `overflow: hidden` on the plane would flatten the pins, so make the plane bigger
  than the map's travel instead (`px-08`).
- A big vertical tilt separates a kit's front props from the ground they stand on;
  use the plate and mid planes only (`px-10`).
- Planes that carry words are never blurred: leave `SK.dof` out when every plane
  has text (`px-06`).
```

In `docs/agents/references/styles/parallax.md` replace:

old:
```md
| photo-2.5d | faint projector hum | 0.04–0.08 |
```

new:
```md
| photo-2.5d | faint projector hum | 0.04–0.08 |
| card-flythrough, float-objects | whoosh per card / soft chime | 0.06–0.1 |
| light-sweep, multiplane-fog, depth-headline | light or low swell | 0.06–0.1 |
```

In `docs/agents/references/styles/parallax.md` replace:

old:
```md
| `style-examples/parallax/compositions/px-04-stage.html` | stage-behind-speaker (Codex plate behind the placeholder cut-out) | parallax-stage |
```

new:
```md
| `style-examples/parallax/compositions/px-04-stage.html` | stage-behind-speaker (Codex plate behind the placeholder cut-out) | parallax-stage |
| `style-examples/parallax/compositions/px-05-push-headline.html` | push-through + depth-headline (scene.warung-counter) | parallax-stage |
| `style-examples/parallax/compositions/px-06-peel-steps.html` | layer-peel + stepped-multiplane (paper planes) | cutaway |
| `style-examples/parallax/compositions/px-07-wipe-fog.html` | foreground-wipe + multiplane-fog (scene.city-dusk) | cutaway |
| `style-examples/parallax/compositions/px-08-map-flyover.html` | map-flyover over `SK.mapSvg('sea')` | cutaway |
| `style-examples/parallax/compositions/px-09-photo-dust.html` | photo-2.5d + dust-motes (public-domain photo) | cutaway |
| `style-examples/parallax/compositions/px-10-tilt-light.html` | tilt-reveal + light-sweep (scene.street-motor) | cutaway |
| `style-examples/parallax/compositions/px-11-cards-float.html` | card-flythrough + float-objects + handheld-drift (scene.cafe-cowork) | cutaway |
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/agents/references/style-examples/parallax docs/agents/references/styles/parallax.md && git status --short && git commit -q -F - <<'MSG'
feat: parallax examples for all 20 patterns (push, peel, fog, flyover, dust, tilt, flythrough)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

---

### Task 6: Every style covered, old stills, final verification

**Files:**
- Modify: `scripts/style-docs.test.mjs` (`COVERED` = every style), `internal/docs/requirements/rd-03-video-editing-workflow.md` (RD-03-56), `docs/superpowers/specs/2026-09-28-pattern-examples-2c-design.md` (status)

- [ ] **Step 1: Cover every style and update the requirement**

In `scripts/style-docs.test.mjs` replace:

old:
```js
// Sub-project 2 coverage: in these styles every pattern has at least one rendered example
// (specs: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md, …-2b-design.md). 2c adds the rest.
const COVERED = ['broll-text.md', 'motion-graphic.md', 'whiteboard.md', 'stop-motion.md'];
for (const file of COVERED) {
```

new:
```js
// Sub-project 2 coverage: in these styles every pattern has at least one rendered example
// (specs: docs/superpowers/specs/2026-09-28-pattern-examples-2a/2b/2c-design.md). Every style is covered (RD-03-56).
const COVERED = STYLES.map((s) => s.file);
for (const file of COVERED) {
```

In `internal/docs/requirements/rd-03-video-editing-workflow.md` replace:

old:
```md
  brief mencatat alasannya.
- **RD-03-56** (Ubiquitous) — Untuk setiap gaya yang tercakup (`COVERED` di
  `scripts/style-docs.test.mjs`), setiap pola di tabel Patterns referensi gaya
  shall punya minimal satu contoh yang bisa dirender di tabel Examples.
- **RD-03-57** (Ubiquitous) — Contoh gaya shall ditambahkan lewat
```

new:
```md
  brief mencatat alasannya.
- **RD-03-56** (Ubiquitous) — Setiap pola di tabel Patterns setiap referensi
  gaya shall punya minimal satu contoh yang bisa dirender di tabel Examples
  (`COVERED` di `scripts/style-docs.test.mjs` = semua gaya).
- **RD-03-57** (Ubiquitous) — Contoh gaya shall ditambahkan lewat
```

In `docs/superpowers/specs/2026-09-28-pattern-examples-2c-design.md` replace:

old:
```md
Status: approved (brainstorming 2026-09-28), belum diimplementasi
```

new:
```md
Status: implemented 2026-09-28 (plan `docs/superpowers/plans/2026-09-28-pattern-examples-2c.md`)
```

Run:

```bash
npm run -s test:style-kit 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `pass 106`, `fail 0` (seven `every pattern has an example` tests).

- [ ] **Step 2: Prove the old stills did not change**

Create `/tmp/examples-2c/samecheck.cjs`:

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
for s in vox mix-media parallax; do npm run -s check:style-examples -- $s || exit 1; done && node /tmp/examples-2c/samecheck.cjs /tmp/examples-2c/baseline/vox renders/style-examples/vox 8 && node /tmp/examples-2c/samecheck.cjs /tmp/examples-2c/baseline/mix-media renders/style-examples/mix-media 8 && node /tmp/examples-2c/samecheck.cjs /tmp/examples-2c/baseline/parallax renders/style-examples/parallax 9
```

Expected: three `different 0` lines (VOX 8, mix-media 8, parallax 9 identical or within ±1).

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
git add scripts/style-docs.test.mjs internal/docs/requirements/rd-03-video-editing-workflow.md docs/superpowers/specs/2026-09-28-pattern-examples-2c-design.md && git status --short && git commit -q -F - <<'MSG'
test: every pattern of every style has an example

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: The status lists only the files above; the commit succeeds.

Run:

```bash
git status --short && git log --oneline main..HEAD | cat
```

Expected: clean tree; spec, plan, and six task commits. Do not push; ask Dena before merging to `main`.

