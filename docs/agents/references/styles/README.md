# Motion Visual Styles (Menu)

The menu of motion visuals a clip can use. Loaded by
`docs/agents/02-screen-plan.md` in the visual step (together with
`motion-broll-planning.md`) and by `docs/agents/03-build.md` in the author step.
Each style has its own reference in this folder; the engine is
`vendor/style-kit/` (`window.SK`) on top of `vendor/motion-kit/` (`window.M`).
Worked examples: `docs/agents/references/style-examples/`
(`npm run check:style-examples`). Decision record: ADR-0012.

## Menu

| Type (Decision Log `decision`) | What the viewer sees | Reference | Status |
| --- | --- | --- | --- |
| `motion-broll` | One morphing shape + cursor, UI-like | `../motion-broll-planning.md` | available |
| `broll-text` | Full-frame kinetic typography of the spoken words | `broll-text.md` | available |
| `motion-graphic` | Flat infographic: numbers, bars, rings, icons, arrows | `motion-graphic.md` | available |
| `whiteboard` | Hand-drawn lines and handwriting on a board, marker follows | `whiteboard.md` | available |
| `vox` | Paper texture, document clippings, highlighter, map zooms | — | planned (sub-project 2) |
| `stop-motion` | Paper cut-outs moving on twos (12 fps) | — | planned (sub-project 2) |
| `mix-media` | Dena cut-out + real screenshots + scribbles in one frame | — | planned (sub-project 2) |
| `parallax` | 2.5D: a photo split into depth layers, camera moves through | — | planned (sub-project 3) |

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
| needs proof | capture (`use-real`) | no style replaces real evidence |
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
  cover in `00:00.00–00:03.00` without approval).

## Style B-roll Brief

Use this instead of the generic Asset Brief for a `broll-text`,
`motion-graphic`, or `whiteboard` row in `visual-plan.md`:

```md
### <ov-NNN>

- Type: <broll-text | motion-graphic | whiteboard>
- Purpose:
- Required: <yes | no>
- Privacy notes:
- Do not cover: <e.g. Dena's face in 0–3 s, the caption area>
- Planned file: `compositions/broll/NN-name.html`
- Placement / Track: <treatment> / track 4
- Treatment: <cutaway | split | panel> — <reason>
- Pattern: <pattern names from the style's Patterns table>
- Palette: <--sk-bg, --sk-ink, --sk-accent, --sk-accent-2, --sk-muted as hex>
- Font: <display | sans | hand>, sizes in px
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
style (`"broll-text"`, `"motion-graphic"`, or `"whiteboard"`), `track: 4`,
`assetRef: "compositions/broll/NN-name.html"`, and the treatment in `placement`.
A style clip is not an asset: it gets no `asset-manifest.json` entry.

## Build Contract (all styles)

- Host setup: the Dena starter already loads `vendor/style-kit/style-kit.js` and
  `style-kit.css` after motion-kit. Mounts are the same as motion b-roll (class
  `broll`, track 4, `id` = `broll-NN-name-mount`, `data-duration` = clip `T`).
- One clip = one sub-composition that calls `SK.clip(id, { T, update })`
  synchronously; `update(t)` is a pure function of clip-local time.
- The stage is `<div class="sk-stage sk-text|sk-mg|sk-wb">`; override the palette
  on it with `style="--sk-bg:…"`. Use `bg: null` for split and panel.
- Fonts: switch with `.sk-display`, `.sk-sans`, `.sk-hand`; never name a font
  family in a clip's `<style>`.
- Never set `visibility` on elements inside a clip (it would survive the mount
  being hidden); hide with `opacity` or `display`.
- Still Check: `npm run video -- snapshot <slug> --at <key-word times>` and fix
  what the stills show before `npm run video -- check <slug>`.
