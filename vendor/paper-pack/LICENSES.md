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
