# Asset Production (Reference)

Rules for capturing and generating the assets that `visual-plan.md` asks for,
and for recording them in `assets/asset-manifest.json`. Loaded by
`docs/agents/03-build.md` in the asset production step. Screen Plan also reads
URL Research And Screen Capture Rules and the image-generation decision rules
here: those decision rules apply when Screen Plan fills the Visual Decision Log.
In Build, follow the Visual Decision Log and route disagreements back to Screen
Plan.

## Asset Production Steps

Steps 1–4 of the Asset Decision Workflow are in `visual-planning.md`.

### 5. Generate Or Prepare Asset

When preparing assets:

- Use project-local output paths.
- Move Codex-generated project assets into `videos/<slug>/assets/`; do not leave referenced files only in the Codex default output folder.
- Actively consider Codex/image generation when a static card would feel stiff and a grounded bitmap still can explain the idea more clearly.
- Keep originals if useful.
- Export web/render-friendly formats.
- Prefer PNG for overlays/stills.
- Prefer MP4/WebM for short clips.
- Prefer SVG only for simple diagrams/icons that should scale cleanly.
- Keep file sizes reasonable.

Image generation must be tried at least once when all are true:

- The asset purpose is `background`, `metaphor`, `abstract AI/workflow idea`, `transition`, `reset-attention`, `texture`, or `impossible b-roll`.
- The asset is not being used as factual proof.
- The current alternative would be a stiff text card, generic SVG, or empty decorative background.
- The prompt can be grounded in the transcript without fake UI, fake client data, generated people, or robot/neon AI cliches.

If the generated result looks generic or fake after one revision, remove it and document the rejection in `assembly-notes.md`.

Do not generate when:

- The asset's primary purpose is `prove` and a real capture/source frame exists.
- The viewer needs to inspect a real product, repo, website, app, dashboard, or code state.
- The only possible prompt would create fake evidence.
- The video is family/vlog or emotionally human, and source footage already carries the moment.
- The user explicitly asks for no generated assets.

### 6. Document Provenance

Every asset must say where it came from:

- `source-frame`
- `source-video-segment`
- `user-supplied`
- `screenshot`
- `screen-recording`
- `web-research`
- `generated`
- `designed`
- `reference-analysis`

If generated, include the prompt or short prompt summary.

A `user-supplied` asset cut from Dena's own sources also records `sourceId` (its id in `sources.json`).

## Style Assets

Bitmaps a style b-roll clip lists under `Assets:` in its Style B-roll Brief
(stop-motion cut-outs, a whiteboard prop, a collage piece, a VOX capture, a
mix-media speaker cut-out). Produce them in Build
step 2, before the clip is written. Check the shared library first: `vendor/asset-lib/CATALOG.md`
and the sheets in `docs/agents/references/asset-catalog/sheets/` hold icons, pictograms,
doodles, marks, stamps, frames, VOX document templates, maps, textures, paper objects, cut-outs,
hands, and layered scenes (plus the paper pack). Use a library asset when it fits; generate a
new one only for what the library lacks and note why in the brief (RD-03-55). A new asset that
would help future videos can be added to the library (`vendor/asset-lib/src/items.json`,
`npm run asset-lib -- build`, `sheets`) instead of staying in one video.

| Source in the brief | How | File | Manifest |
| --- | --- | --- | --- |
| `codex` | skill `codex-image` with `--transparent`, using the Cut-out Recipe below | `assets/cutouts/NN-name.png` | `type: "cutout"`, `provenance: "generated"`, `promptSummary` |
| `cc0` | download from ambientCG, Poly Haven, or a Wikimedia Commons file marked CC0 or Public Domain; confirm the license on the asset's own page | `assets/cc0/<source>-<id>.<ext>` | `provenance: "cc0"`, `source` = asset URL + id, `license`, `downloaded` (date) |
| `dena-footage` | `ffmpeg -ss <processed time> -i processed.mp4 -frames:v 1 assets/frames/NN.png`, then `npx --yes hyperframes@0.7.24 remove-background assets/frames/NN.png -o assets/cutouts/NN-dena.png` | `assets/cutouts/NN-dena.png` | `provenance: "dena-footage"`, `source` = processed time |
| `user` | the user's file; remove the background the same way when needed | `assets/cutouts/NN-name.png` | `provenance: "user"`, `source` = what the user gave |
| `capture` (VOX document) | a screenshot of the real page per Screenshot Rules and URL Research below; crop to the quoted region, redact private data | `assets/captures/NN-name.png` | `type: "screenshot"`, `provenance: "screenshot"`, `source` = URL, `captured` (date), license when the text is licensed (e.g. CC BY-SA) |
| `layers` (parallax photo/frame) | `npm run video -- layers <slug> --at <s> --name NN-scene` (a frame) or `--image <file>` (a user photo) → `assets/layers/NN-scene-src.png` + `NN-scene-fg.png`; then the plate with `codex-image` (Parallax Plate Recipe below) → `NN-scene-bg.png` | `assets/layers/NN-scene-*.png` | `src`/`fg`: `dena-footage` or `user`; plate: `provenance: "reconstructed"` + `promptSummary` |
| `archive` (parallax archival photo) | a public-domain photo whose status is confirmed on its own page (for example Wikimedia Commons "published before 1931"), then `layers --image` + the plate recipe | `assets/layers/NN-archive-*.png` | `provenance: "pd-archive"`, `source` = page URL, `license` = the stated reason |
| `dena-video` (mix-media speaker) | `npm run video -- cutout <slug> --from <clip start> --dur <clip duration> --name NN-dena` (segment of `processed.mp4` → `remove-background`; ≤ 15 s; it fails if nothing is written) | `assets/cutouts/NN-dena.webm` | `provenance: "dena-footage"`, `source` = processed time range |

Cut-out Recipe (`codex`), filled per object:

```text
Use case: illustration-story
Asset type: paper cut-out object for a stop-motion b-roll clip
Primary request: <the object, specific to the transcript line>, made as a flat paper cutout
Style/medium: flat paper cutout, visible paper fibre, construction-paper colours, thin white paper border around the whole silhouette, soft paper shadow inside the cut edges
Composition/framing: whole object centered, about 80% of the canvas
Constraints: plain transparent background; no text, no letters, no logos, no UI
Avoid: glossy 3D render, photorealism, checkerboard, fake transparency grid
```

Rules:

- Never generate Dena's likeness; a Dena cut-out comes only from her footage.
- In an agent shell whose command hook rewrites `npx`, run
  `remove-background` as `rtk proxy npx …` and confirm the
  "Removed background from N frames" line; `video cutout` spawns it without a
  shell and checks the output itself.
- A generated cut-out never shows a real person or brand (Gate 2 R6).
- Run `codex-image` jobs one at a time. Concurrent runs can hand one job another
  job's image (seen 2026-09-27: two scene references came back byte-identical);
  after a batch, check that every output's SHA-256 is unique and that each image
  shows what its name says.
- `codex-image` exit 6 ("opaque background") checks the corners: a subject that
  touches a corner on purpose (an arm entering from the bottom-right) trips it
  although the alpha is real. Measure the alpha (`ffmpeg … alphaextract,signalstats`:
  `YMIN=0` means transparent pixels exist) before regenerating.
- No text inside generated images; words are live text in the clip.
- Check every cut-out over a grey and a kraft ground. Reject blurry edges, a
  painted checkerboard, extra fingers, plastic-looking paper, or anything generic
  to the transcript, and regenerate with the whole spec (not just the fix).
- Crop to the object and keep the long edge ≤ 800 px.

Parallax Plate Recipe (`codex-image`, edit): pass the source with `--ref`, a
`--size` matching the source aspect (both edges multiples of 16) and `--fit`, and
say: "remove only the <person / objects>; fill where they were with the
continuing <wall / floor / desk>; this is a pixel-aligned plate — keep the exact
framing, crop, and aspect ratio of the input; every other pixel stays where it
is". Check the plate against the source outside the subject (they should match);
if anything moved, regenerate. A plate is `reconstructed`, never proof.

Codex layered scene (parallax): generate the full scene first; make the plate by
an edit of it ("remove the <foreground objects> … keep everything else
unchanged"); make a foreground layer by an edit onto a flat `#00FF00` green and
key it (soft alpha from how much green exceeds red/blue, then pull the green
down on the edge), or generate a separate transparent object without a
reference (a reference drops the alpha). Green objects key out with the
background — keep them on a different layer or pick another key colour.

## Generated Image Prompt Rules

When creating generated stills, prompts must be specific and grounded.

Good prompt pattern:

```md
Vertical 9:16 cinematic but realistic still of a founder's desk at night, laptop showing abstract workflow nodes without readable private text, sticky notes, muted black background, subtle yellow accent light, credible business automation mood, no robots, no holograms, no fake brand logos, no faces.
```

Bad prompt:

```md
Cool AI background with robots and neon.
```

Generated still prompts must include:

- format/aspect ratio
- subject
- setting
- mood
- visual style
- what not to show
- privacy constraints
- whether text should be absent or readable

Avoid generating text inside images unless it is deliberately simple and will be checked. AI-generated text often becomes illegible.

## Generated Video Prompt Rules

Generated video should usually be:

- `2-5s`
- loopable or cleanly cuttable
- text-free
- visually simple
- supportive, not dominant

Good use cases:

- subtle workflow lines moving through nodes
- abstract data cards organizing themselves
- cinematic desk close-up
- process transformation from messy tasks to clean system

Bad use cases:

- complex app UI with readable text
- fake product demo
- realistic client scenes
- talking humans
- anything that must be factually exact

## Screenshot Rules

When using screenshots:

- Capture only the relevant region.
- Remove private client data.
- Blur emails, names, tokens, numbers, and internal URLs unless user approves.
- Use zoom/crop so the viewer understands the point on mobile.
- Add note if screenshot is real, recreated, or anonymized.

Do not use screenshots as tiny wallpaper behind captions.

## URL Research And Screen Capture Rules

When the user provides a URL, or the transcript names a specific product/site/tool that materially affects the story:

1. Research or inspect the current page before planning the asset.
2. Capture local screenshots or short screen recordings when the real UI helps the viewer understand the point.
3. Match every capture to its Timeline row and transcript window in `visual-plan.md`.
4. Store captures under `videos/<slug>/assets/`; no remote images, videos, or live fetches in the render path.
5. Crop for phone readability and redact private/session data.
6. If the page is inaccessible, private, or visually unhelpful, document that in `assembly-notes.md` and route the row back to the Screen Plan phase (visual step) to choose a generated still, simple diagram, or designed card instead.

For a product/tool URL, prefer real captured UI for proof/context. Use generated assets for mood, abstraction, or process visualization, not as fake proof of what the live product does.

## Diagram Rules

Diagrams should be phone-readable.

Default limits:

- Max `5` nodes.
- Max `6` words per node.
- Max `2` levels of hierarchy.
- Strong contrast.
- No dense arrows.

Good diagram:

```md
LEAD -> CRM -> AI AGENT -> FOLLOW-UP
```

Bad diagram:

```md
Full business architecture with 14 integrations and tiny labels.
```

## Asset Manifest Format

Create `assets/asset-manifest.json`.

```json
{
  "videoSlug": "example-slug",
  "assets": [
    {
      "id": "asset-001",
      "file": "assets/crm-dashboard-proof-28s.png",
      "type": "screenshot",
      "purpose": "prove",
      "timestamp": {
        "start": 28.0,
        "end": 33.0
      },
      "required": true,
      "provenance": "screenshot",
      "source": "user-supplied CRM screenshot, anonymized",
      "privacy": "emails and customer names blurred",
      "style": "clean crop, high contrast, mobile readable",
      "doNotShow": ["client names", "private revenue numbers"],
      "handoff": "Use as side card; do not full-screen for more than 2s"
    }
  ]
}
```

For generated assets, also include:

```json
{
  "promptSummary": "Vertical founder desk workflow still, no readable text, no people, no fake UI.",
  "rejectedAlternatives": ["static text card felt stiff"]
}
```

Each asset entry needs:

- stable `id`
- file path or planned file path
- type
- purpose
- timestamp range
- required/optional
- provenance
- source
- privacy notes
- style notes
- do-not-show list
- handoff note

## Quality Bar

A good asset pass:

- Makes abstract ideas visible.
- Uses real proof when available.
- Keeps generated visuals clearly supportive.
- Avoids stock/generic AI cliches.
- Protects private data.
- Provides clean filenames and manifest entries.
- Gives downstream agents clear timing and purpose.

A weak asset pass:

- Generates random backgrounds.
- Adds stickers without meaning.
- Uses fake dashboards as if they were proof.
- Makes screenshots unreadable.
- Ignores privacy.
- Creates assets with no timestamp or purpose.
- Forces too many overlays into a simple talking-head edit.

## Failure Modes

If no asset is needed:

- The Visual Decision Log in `visual-plan.md` records it; Build adds nothing.
- Do not invent assets to fill the quota.

If proof assets contain private data:

- Redact first.
- If redaction would destroy usefulness, replace with an abstract diagram.
- Document the privacy decision.

If generated assets look generic:

- Reject and revise prompt.
- Use real screenshots, simple diagrams, or text cards instead.
- If it still reads as AI slop after one revision, remove it.

If generated media includes bad text:

- Do not use the text.
- Crop it out or regenerate text-free.
- Let the Screen Plan phase add real text separately.

If the reference style conflicts with Dena's credibility:

- Extract the mechanism only.
- Do not copy the visual costume.

If an asset competes with captions:

- Mark it for Screen Plan phase (visual step) to reduce opacity, crop, blur, delay, or remove.

## Capture And Privacy Record

For every captured or generated asset, add this block to
`videos/<slug>/assembly-notes.md` under `## Asset Production`:

```md
### <asset-id>

Timeline ID:

Prompt (generated media only):

Negative prompt / exclusions:

Reason:

Screenshot/Capture Notes:
- Source:
- URL researched:
- Screen recording:
- Crop:
- Redactions:

Privacy Review:
- Sensitive data found:
- Redactions applied:
- Remaining risk:
```
