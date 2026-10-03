# ADR-0035 — Per-project aspect ratio (canvas)
Status: accepted
Date: 2026-10-03

## Context

Every starter, the cut filter and the workflow docs assumed one canvas, 1080×1920
(9:16). Dena also posts to feed formats and YouTube, and three older projects were
hand-edited to 1920×1080. Studio had no way to choose a size, so a different ratio
meant editing HTML and prompts by hand.

## Decision

A project has one **canvas**, chosen when it is created and stored in
`videos/<slug>/canvas.json` (`{ ratio, width, height }`). Supported ratios:
`9:16` (default, 1080×1920), `4:5` (1080×1350), `1:1` (1080×1080), `16:9`
(1920×1080). Every ratio has a 1080 px short side, so type scale and spacing in the
docs carry over; only the long side and vertical bands change.

- `scripts/lib/ratio.mjs` is the single table, with safe areas per ratio.
- `video new --ratio <r>` and Studio's two creation forms write `canvas.json` and
  size the starter (a single-pass swap of 1080/1920, so 16:9 does not undo itself).
- `video cut` scales to fill and centre-crops to the canvas; `cropY` joins `cropX`.
- Generate stores `ratio` in `research/request.json`; Studio's prompt names the
  canvas for non-9:16 projects and points at `docs/agents/references/aspect-ratios.md`.
- A project without `canvas.json` is 9:16. Nothing is migrated.

## Consequences

- The default path and old projects are unchanged (prompts, template, cut filter).
- Layout libraries (motion-kit, style-kit, asset-lib tiles) stay authored at 9:16;
  Build derives layout from `W`/`H` per the new reference. Asset tiles need re-cropping
  for other ratios; making the libraries ratio-aware is future work.
- Changing the ratio of an existing project is not supported; create a new project.
