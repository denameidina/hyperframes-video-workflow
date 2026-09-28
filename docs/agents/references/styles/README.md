# Motion Visual Styles (Menu)

The menu of motion visuals a clip can use. Loaded by
`docs/agents/02-screen-plan.md` in the visual step (together with
`motion-broll-planning.md`) and by `docs/agents/03-build.md` in the author step.
Each style has its own reference in this folder; the engine is
`vendor/style-kit/` (`window.SK`) on top of `vendor/motion-kit/` (`window.M`).
Worked examples: one host per style in `docs/agents/references/style-examples/<style>/`
(`npm run check:style-examples [-- <style>]`). Decision records: ADR-0012, ADR-0017.

## Menu

| Type (Decision Log `decision`) | What the viewer sees | Reference | Status |
| --- | --- | --- | --- |
| `motion-broll` | One morphing shape + cursor, UI-like | `../motion-broll-planning.md` | available |
| `broll-text` | Full-frame kinetic typography of the spoken words | `broll-text.md` | available |
| `motion-graphic` | Flat infographic: numbers, bars, rings, icons, arrows | `motion-graphic.md` | available |
| `whiteboard` | Hand-drawn lines and handwriting on a board, marker follows | `whiteboard.md` | available |
| `vox` | A real capture or an "Ilustrasi" document on paper, highlighter on the spoken phrase, red pen, map zooms | `vox.md` | available |
| `stop-motion` | Paper cut-outs moving in steps (on twos), torn edges, tape, pins | `stop-motion.md` | available |
| `mix-media` | Dena keeps talking on a paper collage (matted cut-out of her footage) | `mix-media.md` | available |
| `parallax` | 2.5D: a photo, scene, or collage in depth layers; the camera dollies, pans, or dolly-zooms through them | `parallax.md` | available |

Only `available` types may appear in a `visual-plan.md` decision.

## Choosing A Style

Match the line, not the topic:

| The line… | Style | Why |
| --- | --- | --- |
| shows an action in a tool or UI (klik, kirim, upload, filter) | `motion-broll` | the cursor and the morphing shape act it out |
| is a punchline, verdict, rule, or quote | `broll-text` | the words themselves are the message |
| contrasts two words ("bukan X, tapi Y") | `broll-text` (word-swap) or `whiteboard` (cross-out) | text for a hard verdict; whiteboard when the correction is a thought process |
| says a number, percentage, or ratio | `motion-graphic` | the quantity needs a shape (Gate 2 R1: spoken numbers only) |
| compares two options by size or time | `motion-graphic` (bar-compare) | relative shapes, zero baseline |
| lists steps, a framework, or a flow | `whiteboard` (draw-flow, list-tick) or `motion-graphic` (arrow-flow) | whiteboard feels thought-out-loud; arrow-flow feels product-clean |
| maps facets of one idea | `whiteboard` (mind-map) | the board grows around a named centre |
| is about a person or a relation between people | `whiteboard` (stick-figure, speech-bubble) | simple figures carry roles without fake likeness |
| describes manual work, a pile of tasks, or concrete objects | `stop-motion` (stack-pile, sticky-wall, slide-on-twos) | handmade paper objects make the manual feel tangible |
| swaps, tears away, or throws out an old way ("dulu… sekarang", "jangan") | `stop-motion` (pin-and-swap, tear-reveal, crumple-away) | a physical swap reads instantly |
| quotes what someone said | `stop-motion` (replacement-face + speech bubble) or `whiteboard` (speech-bubble) | a paper figure carries the role without a fake likeness |
| quotes or points at an article, report, post, or website | `vox` (capture + highlight-sweep, pinned-source) | the viewer sees the words the claim comes from, with the source on screen |
| names a place, city, or market | `vox` (map-zoom) | the pin lands where the place really is (`SK.geo`) |
| names several tools or sources, or says "gue" / "dulu vs sekarang" while her presence matters | `mix-media` (screenshot-orbit, arrow-to-speaker, polaroid-frame) | Dena stays on screen while the world around her changes |
| tells a memory, a moment, or a story anchored in a photo or place | `parallax` (photo-2.5d, dolly-in, multiplane-fog) | depth pulls the viewer into the scene |
| is a realization or turn ("ternyata…") | `parallax` (dolly-zoom, once) or `broll-text` | the vertigo move marks the turn |
| needs context behind Dena while she talks | `parallax` (`parallax-stage`) or `mix-media` | the scene moves behind her; she stays readable |
| needs proof | capture (`use-real`) or `vox` with a real capture | a capture is the evidence; `vox` frames it and cites it; a reconstructed parallax plate never is |
| is personal, emotional, or an opinion | none (`skip`) | keep Dena's face |

## Variety Rules

- Use at most 3 motion visual types in one video (counting `motion-broll`).
- Two neighbouring clips use different types unless they are one sequence (the
  same board continuing, or a numbered series).
- Within a type, keep the same palette for the whole video unless a palette change
  marks a new story section (Kuntzel + Deygas).
- Pick 3–4 motion behaviours per video and reuse them (Paone): write them once in
  `visual-plan.md` under `## Motion Behaviours`.
- Treatments, density, and face rules are the ones in `motion-broll-planning.md`
  (cutaway / split / panel, 2 s of face between cutaways, cutaway ≤ 10 s, no face
  cover in the hook window `00:00.00–hook_end` without approval). `mix-media` adds the `collage`
  treatment: Dena stays visible, so it never trips R3 or R4.
- `mix-media` is a peak: at most ~20% of the video, at most two collage clips in a
  row. `parallax` adds `parallax-stage` (the same host recipe, a parallax
  backdrop) and is used for one or two clips per video.

## Style B-roll Brief

Use this instead of the generic Asset Brief for a `broll-text`,
`motion-graphic`, or `whiteboard` row in `visual-plan.md`:

```md
### <ov-NNN>

- Type: <broll-text | motion-graphic | whiteboard | stop-motion | vox | mix-media | parallax>
- Purpose:
- Required: <yes | no>
- Privacy notes:
- Do not cover: <e.g. Dena's face in 0–3 s, the caption area>
- Planned file: `compositions/broll/NN-name.html`
- Placement / Track: <treatment> / track 4
- Treatment: <cutaway | split | panel | collage (mix-media only) | parallax-stage (parallax only)> — <reason>
- Pattern: <pattern names from the style's Patterns table>
- Palette: <preset class, e.g. `sk-pal-wb-graph-paper` (+ its add class), or hex values with the reason>
- Type: <preset class, e.g. `sk-type-wb-kalam`, or font classes `.sk-f-*`>, sizes in px
- Pen (whiteboard only): <marker | hand>
- Document (vox only): <capture `assets/captures/NN-name.png` | illustrative>
- Source line (vox capture only): <outlet or domain, date, license if any>
- Cutout (mix-media, parallax-stage): from <host s>, dur <s>, name <NN-dena>; front layer <yes | no>
- Layers (parallax only): <each layer: file or class, z, source (photo | codex | collage | archive), provenance>
- Camera (parallax only): <dolly-in | pan | orbit | dolly-zoom | tilt; amount; landing word>
- Focus (parallax only): <focus depth; rack from → to on which word, or none>
- Moodboard: <study id from `moodboard/sheets/<style>.webp`, e.g. `vx-s5`, or "none">
- Library assets: <catalog ids from `vendor/asset-lib/CATALOG.md`, e.g. `doodle.think`, `paper.coin-stack`, `map.java`, or "none">
- Assets: <each per-video bitmap the clip needs, or "none">
  - `assets/cutouts/NN-name.png` — <codex | cc0 | dena-footage | user> — <what it shows, tied to the transcript> — <why the library has nothing that fits>
- In–out (host time): <start>–<end> s
- Beats on words:
  - "<word>" @ <host time> → <what appears or changes>
- On-screen text: <every word, verbatim from the transcript>
- Numbers: <each number and the transcript time it is spoken, or "none">
- Illustrative: <what is not real data>
- SFX: <cue @ host time>
- Key-word times for the still check: <host times>
```

Naming and timeline entry follow the motion b-roll rules: `NN` is the Timeline ID
number padded to two digits, the clip id is `broll-NN-name`, the mount id
`broll-NN-name-mount`; in `overlay-timeline.json` the row has `type` equal to the
style (`"broll-text"`, `"motion-graphic"`, `"whiteboard"`, `"stop-motion"`, `"vox"`, `"mix-media"`, or `"parallax"`),
`track: 4`, `assetRef: "compositions/broll/NN-name.html"`, and the treatment in
`placement`. A style clip is not an asset: it gets no `asset-manifest.json` entry,
but every file in its `Assets:` list does (Style Assets in `asset-production.md`).

## Build Contract (all styles)

- Host setup: the Dena starter already loads `vendor/style-kit/style-kit.js` and
  `style-kit.css` after motion-kit, then `vendor/paper-pack/paper-pack.css`, then the asset
  library (`vendor/asset-lib/asset-lib.js` + `.css`: `SK.icon`, `SK.pict`, `SK.doodle`,
  `SK.mark`, `SK.rough`, `SK.stamp`, `SK.frame`, `SK.tornFrame`, `SK.doc`, `SK.geo(…, map)`,
  `SK.asset`, `SK.mapSvg`; classes `.sk-pal-*`, `.sk-type-*`, `.sk-grade-px-*`, `.sk-f-*`, `.sk-tex-*`,
  `.sk-obj-*`). Insert library HTML once, outside `update(t)`. Mounts are the same as motion b-roll (class
  `broll`, track 4, `id` = `broll-NN-name-mount`, `data-duration` = clip `T`).
- One clip = one sub-composition that calls `SK.clip(id, { T, update })`
  synchronously; `update(t)` is a pure function of clip-local time.
- The stage is `<div class="sk-stage sk-text|sk-mg|sk-wb|sk-stop|sk-vox">`; override the
  palette on it with `style="--sk-bg:…"` or add a paper class (`sk-kraft`, …).
  Use `bg: null` for split and panel.
- Paper-pack files are referenced as `vendor/paper-pack/…` (host-relative); never
  write `../` in a url (the linter rejects it). Repeated paper objects are divs
  with a class (`.sk-sticky`, `.sk-pin`, …), not repeated `<img>` tags.
- Fonts: switch with `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`; never
  name a font family in a clip's `<style>`.
- Moodboard studies (`docs/agents/references/moodboard/`) show a technique, not a
  layout to copy: never copy a study's words or a reference's logo, title, character,
  or composition into a clip. Real stills of other people's work live only in the
  gitignored `moodboard/local/` and are never used as clip assets (RD-03-59).
- `mix-media` host recipe (collage): an opaque full-frame collage mount on track 4,
  the matted speaker `<video class="clip cutout sk-sticker-cut" muted>` on track 6
  (same start and duration, made with `npm run video -- cutout`), and an optional
  front mount `.broll-front` on track 7. Never tween `#base-video` opacity; the
  opaque collage covers it. Details: `mix-media.md`.
- `parallax`: `.sk-stage > .sk-view > .sk-world > .sk-ly` layers (full-frame;
  position content inside them), placed with `SK.layer`, moved with `SK.camera`,
  blurred with `SK.dof`; `parallax-stage` is the collage recipe with a parallax
  backdrop. Details and the Depth Budget: `parallax.md`.
- Examples: each style has a host in `style-examples/<style>/`. Its `index.html` and
  `snapshots.json` are GENERATED from `examples.json` (one line per example: `clip`,
  `duration`, `treatment`, clip-local `stills`, optional `cutout` / `cutouts` / `punch` /
  `front`; see `mix-media.md`); never
  edit them by hand. To add an example: write `compositions/<xx-NN-name>.html`, add
  its line to `examples.json`, run `npm run style-examples -- build`, then
  `npm run check:style-examples -- <style>` and look at the stills. Shared example
  media stays in `style-examples/assets/`.
- Every file an example references must be tracked in git (`.gitignore` ignores
  media; `style-examples/assets/*.webm` is excepted).
- Never set `visibility` on elements inside a clip (it would survive the mount
  being hidden); hide with `opacity` or `display`.
- Still Check: `npm run video -- snapshot <slug> --at <key-word times>` and fix
  what the stills show before `npm run video -- check <slug>`.
