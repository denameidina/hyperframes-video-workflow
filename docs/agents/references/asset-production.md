# Asset Production (Reference)

Rules for capturing and generating the assets that `visual-plan.md` asks for,
and for recording them in `assets/asset-manifest.json`. Loaded by
`docs/agents/03-build.md` in the asset production step.

## Asset Production Steps

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

If the generated result looks generic or fake after one revision, remove it and document the rejection in `visual-plan.md`.

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
3. Match every capture to a transcript time window and explain the reason in `visual-plan.md`.
4. Store captures under `videos/<slug>/assets/`; no remote images, videos, or live fetches in the render path.
5. Crop for phone readability and redact private/session data.
6. If the page is inaccessible, private, or visually unhelpful, document that and use a generated still, simple diagram, or designed card instead.

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

Create `asset-manifest.json`.

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

- Say so in `visual-plan.md`.
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
- Let Caption/Overlay agents add real text separately.

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
