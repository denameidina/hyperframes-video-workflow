# Visual Planning (Reference)

Rules for deciding which moments get visuals, what type, and why, plus the
`visual-plan.md` template. Loaded by `docs/agents/02-screen-plan.md` in the
visual step. Workflow order lives in the phase documents, not here.

## Asset Categories

### `screenshot`

Real capture from an app, website, dashboard, code editor, terminal, tool, or product.

Best for:

- proof
- concrete context
- UI walkthrough
- before/after
- showing what Dena actually built or reviewed

Rules:

- Blur or remove private data.
- Crop to the relevant area.
- Avoid tiny unreadable UI.
- Prefer one focused region over a full busy screen.
- Preserve enough context to be credible.

### `generated-still`

AI-generated image or designed bitmap still.

Best for:

- metaphor
- cinematic character support
- abstract AI/workflow idea
- background texture
- impossible b-roll

Rules:

- Must be grounded in the brief.
- Codex image generation is allowed for generated stills and bitmap support assets.
- Avoid fake dashboards unless explicitly stylized as abstract.
- Avoid robot faces, neon sci-fi clutter, and generic AI stock imagery.
- Do not generate a fake Dena likeness unless explicitly requested and approved.
- Do not imply real client/work evidence if it is fictional.

### `generated-video`

Short AI-generated clip or animated asset.

Best for:

- 2-5 second pattern interrupt
- cinematic atmosphere
- abstract process visualization
- transition plate

Rules:

- Use only when a still image or simple overlay is not enough.
- Keep it short.
- Avoid hard-to-read details.
- Avoid generated humans unless explicitly approved.
- Must be safe to loop or cut abruptly.

### `diagram`

Simple visual model, flowchart, before/after, or system map.

Best for:

- workflow automation
- AI agent process
- CRM/ERP pipeline
- cause/effect explanation
- "manual -> automated"

Rules:

- 3-5 nodes max for social video.
- Large labels.
- No dense architecture diagrams.
- Must be readable on phone.
- Prefer simple shapes and strong contrast.

### `icon-sticker`

Small visual cue.

Best for:

- tool identifiers
- light emphasis
- quick reset
- label reinforcement

Rules:

- Use sparingly.
- Prefer meaningful symbols over random decoration.
- Do not use many emojis.
- Do not cover face or important object.

### `b-roll-from-source`

Extracted source footage segment or frame.

Best for:

- proof that the story happened
- vlog context
- showing environment
- alternate angle from same raw footage

Rules:

- Preserve source authenticity.
- Avoid overusing if the video is already talking-head.
- Note source timestamp.

### `reference-derived-style-note`

A style reference extracted from another video, not a copied asset.

Best for:

- adapting Kumar-style manifesto mechanics
- capturing type/mood/pacing principles
- guiding Screen Plan phase (visual step)

Rules:

- Do not copy copyrighted frames into final video unless user owns/clears them.
- Extract technique, not exact visual identity.

## Asset Decision Workflow

### 1. Map Asset Opportunities

Read the creative brief and caption plan. Identify timestamp windows where the video needs support.

Look for:

- abstract ideas
- tool mentions
- proof claims
- confusing transitions
- long talking-head stretches
- mission statements
- CTA/end card

Default pattern interrupt target:

- every `4-8s` for dense talking-head content
- every `8-12s` for more cinematic/editorial content
- less frequent for emotional or family/vlog moments

### 2. Assign Asset Purpose

Every asset must have exactly one primary purpose:

- `clarify`
- `prove`
- `contrast`
- `emphasize`
- `reset-attention`
- `humanize`
- `brand`
- `transition`
- `background`

If the purpose is only "looks cool", do not create the asset.

### 3. Choose Asset Type

Prefer the simplest asset that works.

Priority:

1. A motion visual from the menu in `styles/README.md` (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, `mix-media`, `parallax`) for a line that explains, shows, compares, or sequences something, or whose words or number are the point.
2. Dena's own sources from the Source Inventory (`broll`/`image` ids in `sources.json`; her note says where they fit), existing real source footage, or real web/app capture when the moment needs proof (it may sit inside a motion b-roll state).
3. Cropped/censored proof asset or focused screenshot/screen recording.
4. Generated still or designed bitmap support asset for mood, texture, or background.
5. Generated video.

A personal, emotional, or opinion line gets no visual.

Generated video is the most expensive and least controllable. Use it only when it earns its place.

### 3A. Visual Decision Log

For every visual-support opportunity, write an `Visual Decision Log` entry in `visual-plan.md` before deciding that generated media is unnecessary.

Required fields:

| Field | Meaning |
| --- | --- |
| `time` | Transcript window |
| `purpose` | clarify, prove, contrast, reset-attention, background, etc. |
| `source` | Source Inventory id (`b1`, `i2`, …) when the row uses or considers Dena's own B-roll/image, else `-` |
| `best_real_asset` | source footage, screenshot, screen recording, user media, or `none` |
| `simple_asset_option` | diagram, text-support visual, sticker, or `none` |
| `imagegen_candidate` | `yes` or `no` |
| `decision` | `motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, `mix-media`, `parallax`, `generate`, `use-real`, `use-diagram`, `skip` |
| `reason` | One concrete sentence tied to the transcript |

Do not write "no generated image needed" unless this log explains why for each visual opportunity.

Every Source Inventory entry appears in at least one row; a source that is not used gets a row with `decision: skip` and the reason (RD-03-72).

### 4. Define Visual Constraints

Each asset needs:

- timestamp range
- purpose
- content
- style
- dimensions
- safe area notes
- privacy constraints
- whether it is mandatory or optional

## Dena-Specific Asset Rules

Preferred visual language:

- credible operator/founder visuals
- real tools
- real workflows
- clean dashboard/card abstractions
- black/white/yellow accent system
- occasional cinematic dark contrast for mission moments
- practical AI system imagery

Avoid:

- robot heads
- blue hologram overload
- generic "AI brain" visuals
- stock corporate handshake images
- fake futuristic dashboards
- unrelated memes
- too many stickers
- visuals that make Dena less credible

For AI systems content:

- Show workflows, agents, queues, dashboards, code, docs, APIs, CRM/ERP abstractions.
- Make automation visible as flow, not magic.
- Prefer "before manual / after automated" proof.

For founder/operator content:

- Show task boards, client process, dashboard proof, notes, delivery timeline.
- Keep it practical.

For cinematic character/manifesto content:

- Use sparse visuals.
- Support identity and mission.
- Avoid clutter.
- Let Dena's presence lead.

For family/vlog content:

- Use fewer generated assets.
- Preserve human footage.
- Use soft labels or simple context cards only when needed.

## Dena-Specific Examples

### AI Workflow Proof

```md
Asset: Workflow pipeline diagram
Purpose: clarify
Timestamp: 14-20s
Content: INPUT -> AI AGENT -> CRM UPDATE -> FOLLOW-UP
Style: black card, white labels, yellow active node
Required: true
Do not show: fake client data, robot imagery
```

### CRM/ERP Context

```md
Asset: Anonymized dashboard screenshot
Purpose: prove
Timestamp: 22-28s
Content: cropped dashboard showing process status only
Style: mobile-readable crop with subtle border
Required: true if screenshot exists, otherwise use diagram
Do not show: names, email, revenue, tokens
```

### Character-Led Manifesto

```md
Asset: Cinematic operator still
Purpose: background
Timestamp: 0-hook_end
Content: abstract founder/operator desk, low light, yellow accent, no face
Style: cinematic but credible
Required: optional
Do not show: robots, holograms, fake text, Dena likeness
```

### Developer Craft

```md
Asset: Code editor crop
Purpose: clarify
Timestamp: 30-36s
Content: local code snippet or abstracted UI review notes
Style: readable crop, dark editor, highlight relevant line
Required: optional
Do not show: secrets, API keys, private repo URLs
```

## Default Asset Density

For a `30-60s` talking-head educational video:

- 1 hook visual if needed.
- 2-4 proof/context overlays.
- 1 CTA/end card support asset.

For `character-led-manifesto`:

- 1-2 cinematic background/support assets.
- 1 identity/title treatment support.
- 1 humanizer or proof asset.

For `family-vlog`:

- Prefer source footage.
- 0-2 simple labels.
- Avoid generated visuals unless they clarify a practical point.

More assets is not automatically better. The right asset at the right second is the goal.

## Visual Plan Template

Create `videos/<slug>/visual-plan.md`. It replaces the old asset plan and motion
plan: every visual moment is chosen once, here. The `Line` column of the Visual
Decision Log records the spoken words for the window, in addition to the fields
in `### 3A. Visual Decision Log`.

In the Timeline, `ID` is the join key: reuse it as the element `id` in
`overlay-timeline.json`, as the heading of its Asset Brief, and in the `handoff`
field of its `assets/asset-manifest.json` entry. Use the `ov-NNN` form from the
Overlay Timeline Format in `motion-grammar.md`. `On-screen text` lists every word
the visual shows. `Illustrative` is `yes` when the visual is generated, mocked, or
otherwise not real proof. For a `motion-broll` row, use the Motion B-roll Brief
from `motion-broll-planning.md`; for a `broll-text`, `motion-graphic`,
`whiteboard`, `stop-motion`, `vox`, `mix-media`, or `parallax` row, use the Style B-roll Brief from
`styles/README.md`; both
replace the generic brief below.

```md
# Visual Plan - <video slug>

## Inputs

- Creative brief:
- Edit decision notes:
- Processed video:
- Transcript:
- Caption beats:
- References:

## Strategy

- Visual grammar:
- Visual density (`visual_density`):
- Primary visual types:
- Primary motion primitives:
- Pattern interrupt cadence:
- Safe area concerns:
- Privacy constraints:
- Generated media policy:

## Visual Decision Log

| Time | Line | Purpose | Source | Best real asset | Simple asset option | Imagegen candidate | Decision | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.0-hook_end | "<hook words>" | reset-attention | - | none | hook text card | yes | generate | The hook needs a grounded visual plate, and a static text card would feel stiff. |

## Timeline

| ID | In-Out | Line | Visual type | On-screen text | Placement / Track | Motion in / out | SFX cue | Illustrative | Gate 2 trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Asset Briefs For Build

### <timeline-id>

- Type:
- Purpose:
- Privacy notes:
- Planned file: `assets/<descriptive-name>.<ext>`
- Content:
- Style:
- Dimensions:
- Safe area notes:
- Source / URL to capture:
- Prompt direction (generated media only):
- Do not show:
- Required:

## Conflicts And Resolutions

- Conflict:
  Resolution:

## Gate 2 Result

- Triggers found: <none | timeline IDs or `CTA`, each with R1-R6>
- User decision per flagged row:
- Result: <Gate 2: no triggers | Gate 2: approved by user on YYYY-MM-DD>

## Handoff

For Build phase:

For QA phase:
```
