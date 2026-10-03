# Aspect Ratios (canvas)

Read this when `videos/<slug>/canvas.json` names a ratio other than `9:16`, or when
the prompt says `Canvas: rasio …`. Without `canvas.json` the project is `9:16`
(every video made before ratios existed). Decision: ADR-0035. Requirements:
RD-03-117..120.

## Canvas table

| Ratio | Size | Use | Safe top | Safe bottom | Safe sides |
| --- | --- | --- | --- | --- | --- |
| `9:16` (default) | 1080×1920 | Reels, TikTok, Shorts, Stories | 120 px | 220 px | 48 px |
| `4:5` | 1080×1350 | Instagram / Facebook feed | 60 px | 110 px | 54 px |
| `1:1` | 1080×1080 | Feed, carousel, LinkedIn | 60 px | 90 px | 54 px |
| `16:9` | 1920×1080 | YouTube, LinkedIn, web | 54 px | 90 px | 96 px |

The short side is always **1080 px**, so every type size, stroke and spacing value
written in these docs for "1080 wide" carries over unchanged. What changes is the
long side: any layout number that mentions `1920`, a vertical centre such as
`[540, 960]`, or a vertical band (top / middle / bottom third) must be derived from
the canvas `W` and `H` instead.

## What every phase does with the canvas

- **Story.** `npm run video -- cut <slug>` already reads `canvas.json`: every take
  is scaled to fill the canvas and centre-cropped. `cropX` (0–1) and `cropY` (0–1,
  0 = top) per segment move the crop window; use `cropY` around `0.2`–`0.35` to keep
  a face in frame when a vertical take is cut into `1:1` or `16:9`. Write the chosen
  ratio and any heavy crop in `edit-decision-notes.md`. A vertical take cut to
  `16:9` keeps only about a third of its height: say so and recommend `9:16` or
  `4:5` unless the footage was shot wide.
- **Screen Plan.** Captions and the visual plan use the safe areas above. Plan wide
  layouts (`16:9`) as left/right splits instead of top/bottom stacks; plan `1:1` and
  `4:5` as centred compositions with the caption band inside the safe bottom.
  Caption line length can grow in `16:9` (more words per line), not font size.
- **Build.** The starter already carries the canvas size. Set `W`/`H` in
  `M.clip({ W, H, … })` and `SK.clip({ W, H, … })`, and every sub-composition's
  `data-width`/`data-height`, to the canvas. Never hard-code `1080×1920`. Expose the
  safe areas as CSS variables (`--safe-top`, `--safe-bottom`, `--safe-side`).
  Background plates, textures and matted cut-outs must cover the full canvas; check
  asset-library tiles (they are 1080×1920) and re-crop instead of stretching.
- **QA.** Check the render against the ratio's size (`ffprobe`), the safe areas, and
  phone-size legibility in the platform the ratio targets.

## Generate formats

All three formats (`explainer`, `kinetic-post`, `motion-short`) accept any ratio.
They have no Dena footage, so the canvas is the only constraint. Kinetic-post loops
at `1:1`/`4:5` are the common feed use. Storyboard sheets show each scene's example
from the style library, which is drawn at 9:16; judge composition by the scene text,
not the sheet's frame shape.

## Not covered

- Mixed ratios inside one video, and re-exporting a finished video at another
  ratio: make a new project at the other ratio instead.
- Platform-specific crops of the same render (profile-grid crops, link-preview
  crops): keep important content inside the safe areas.
