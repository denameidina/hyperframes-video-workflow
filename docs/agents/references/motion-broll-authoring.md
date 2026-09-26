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

Mount each clip on track 4 with a stable `id` (Studio lint warns without one).
The host `data-composition-id` must equal the id inside the clip file and the
`M.clip` id:

```html
<div id="broll-03-crm-check-mount" class="broll" data-composition-id="broll-03-crm-check"
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
