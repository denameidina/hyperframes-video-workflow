# Motion Grammar (Reference)

Rules for motion, pattern interrupts, placement, density, SFX cues, and the
`overlay-timeline.json` format. Loaded by `docs/agents/02-screen-plan.md` in the
visual step.

## Motion Layer Responsibilities

The Screen Plan phase (visual step) designs timing and behavior for:

- caption entrances/exits
- hook card motion
- editorial title motion
- proof label timing
- asset overlay motion
- zooms/punch-ins
- background dim/blur moments
- progress bars
- emphasis flashes
- screen shake, if justified
- CTA transitions
- lower-thirds
- b-roll picture-in-picture
- screenshot/card reveals
- SFX cue timing tied to motion beats

It does not decide final CSS implementation details beyond clear intent and constraints.

## Motion Grammar By Format

### `dena-default`

Use for normal Dena IG/TikTok edits.

Motion:

- caption pop/rise
- subtle punch zoom on key claims
- light proof card slide-in
- small highlight flash
- progress bar if useful
- clean CTA card

Avoid:

- heavy shakes
- too many stickers
- large full-screen interruptions

### `cinematic-operator`

Use for confident founder/operator moments.

Motion:

- slow push-in
- dark vignette/dim
- sparse editorial title reveal
- clean side-card proof overlay
- controlled cut-to-black or flash
- measured pacing

Avoid:

- frantic motion
- playful sticker spam
- over-bright neon

### `tech-dashboard`

Use for workflow, AI, CRM, ERP, code, dashboards.

Motion:

- UI card slide-in
- cursor/ring highlight
- node/flow reveal
- before/after split
- terminal/code crop pan
- checklist ticks

Avoid:

- tiny unreadable dashboards
- dense architecture motion
- fake hologram clutter

### `founder-vlog`

Use for candid story or family/business-life content.

Motion:

- gentle labels
- soft lower-thirds
- source b-roll cutaways
- mild zoom
- simple CTA

Avoid:

- over-editing emotional pauses
- aggressive sound/visual effects

### `kumar-inspired`

Use for character-led manifesto.

Motion:

- sparse title words
- silhouette/identity holds
- slow push
- hard cuts on mission words
- aura/proof montage
- humanizer cut at the end

Adapt mechanics only. Do not copy a reference's full visual identity.

Avoid:

- copying red-black villain palette by default
- fake persona
- every-word subtitles during manifesto beats
- over-serious ending without human release

## Motion Primitives

Use these primitives as the base vocabulary.

### `caption-pop`

Purpose: readable subtitle rhythm.

Default:

- enter: scale `0.96 -> 1`, opacity `0 -> 1`
- duration: `0.12-0.2s`
- exit: opacity fade or quick y-down

Use for standard captions.

### `hook-card-snap`

Purpose: stop-scroll hook.

Default:

- enter: y `-24 -> 0`, opacity `0 -> 1`
- duration: `0.2-0.35s`
- hold through first `2-3s`
- exit before the next major visual beat

Use for first-frame hook cards.

### `editorial-title-slam`

Purpose: manifesto/title force.

Default:

- enter on beat with scale or cut
- hold `0.5-1.2s`
- exit by hard cut, fade, or slide

Use sparingly.

### `proof-card-slide`

Purpose: show screenshot/diagram/proof without hiding the speaker.

Default:

- enter from side or bottom
- duration `0.25-0.45s`
- slight shadow/border
- exit before captions compete

Use for track `4`.

### `focus-ring`

Purpose: point to an exact UI/detail.

Default:

- ring or highlight appears near target
- pulse once
- hold under `2s`

Use only when the detail is visible enough.

### `punch-zoom`

Purpose: emphasize a key statement.

Default:

- scale main video `1.0 -> 1.04-1.08`
- duration `0.2-0.4s`
- return slowly or hold through phrase

Avoid if source is already shaky or low-res.

### `background-dim`

Purpose: improve caption/card readability.

Default:

- overlay black at `15-35%`
- enter/exit `0.15-0.3s`

Use when text needs contrast.

### `flash-cut`

Purpose: reset attention or mark transition.

Default:

- white/yellow/black flash under `0.12s`
- use rarely

Avoid in emotional/family moments.

### `progress-bar`

Purpose: subtle retention cue.

Default:

- top or bottom thin bar
- does not compete with captions
- deterministic width based on video time

Use when video is educational or has multiple sections.

### `cta-morph`

Purpose: ending call-to-action.

Default:

- last idea collapses/morphs into CTA card
- hold `2-4s`
- readable without audio

Use at final section.

## Pattern Interrupt Rules

Pattern interrupts should reset attention without breaking trust.

Default cadence:

- Talking-head educational: every `4-8s`.
- Cinematic manifesto: every `8-12s`.
- Vlog/reflection: only when meaning changes.
- Family/lifestyle: minimal.

Good interrupts:

- new camera crop
- proof card
- UI highlight
- short b-roll source cut
- title word
- quote card
- diagram reveal
- sound-supported transition

Bad interrupts:

- random sticker
- unrelated meme
- frequent shake
- full-screen graphic that hides Dena too long
- effect on every word

## Timing Rules

Default motion durations:

- micro-pop: `0.12-0.2s`
- card slide: `0.25-0.45s`
- proof hold: `2-5s`
- title hold: `0.5-1.5s`
- CTA hold: `2-5s`
- flash: `<0.12s`

Avoid overlapping:

- main caption and dense proof card in same screen zone
- hook card and editorial title unless designed as one unit
- CTA card with unrelated overlay
- face/mouth with large labels

If the screen becomes crowded, remove an element before shrinking everything.

## Placement Rules

Default placement:

- captions: lower-center or mid-lower
- hook card: top safe area
- proof cards: side or upper-middle when speaker remains visible
- UI screenshots: side card, picture-in-picture, or brief full-width crop
- progress bar: very top or very bottom, thin
- CTA: center or lower-center, clear and readable

Avoid:

- lower-right platform UI area
- bottom controls area
- covering mouth
- covering object being discussed
- blocking captions with overlays

## Motion Density Levels

Choose one density per video.

### `low`

Use for emotional, family, or reflective clips.

- captions
- 1-2 light labels
- minimal zoom
- CTA

### `medium`

Default for Dena educational/founder videos.

- captions
- hook card
- 2-4 proof/context overlays
- light zoom/punch
- progress or CTA

### `high`

Use only for fast tactical or manifesto edits.

- sparse title beats
- more frequent cuts
- proof cards
- montage moments
- stronger transitions

High density must still feel intentional.

## Sound/Motion Coordination

The Screen Plan phase (visual step) owns SFX cue timing and intent. It does not do the final audio mix, but it must make the audio handoff specific enough that SFX can be implemented and verified.

Useful notes:

- whoosh for card slide
- soft impact for title slam
- click for checklist/proof marker
- subtle riser before mission line
- silence/drop before key line
- style b-roll cues per pattern: the SFX table in each `styles/<type>.md`

For designed Dena recuts, plan SFX on important transitions, proof reveals, title hits, and CTA shifts by default. Do not require SFX for every caption pop or small motion.

Every SFX cue should include:

- timecode
- motion element id
- sound type
- intensity target
- whether it must be audible in final render

SFX should be audible enough to be felt on phone speakers, but must stay under speech and never mask words.

## Overlay Timeline Format

Create `overlay-timeline.json`.

```json
{
  "videoSlug": "example-slug",
  "duration": 54.2,
  "motionDensity": "medium",
  "visualGrammar": "dena-default",
  "elements": [
    {
      "id": "ov-001",
      "type": "hook-card",
      "track": 5,
      "start": 0.0,
      "duration": 3.0,
      "contentRef": "caption:hook-primary",
      "assetRef": null,
      "placement": "top-card",
      "motion": "hook-card-snap",
      "purpose": "stop-scroll",
      "notes": "Must work muted; do not cover forehead/eyes"
    },
    {
      "id": "ov-002",
      "type": "proof-card",
      "track": 4,
      "start": 14.5,
      "duration": 4.0,
      "contentRef": "asset-002",
      "assetRef": "assets/crm-dashboard-proof-28s.png",
      "placement": "right-side-card",
      "motion": "proof-card-slide",
      "purpose": "prove",
      "notes": "Keep captions lower-center; crop must be readable"
    }
  ],
  "conflicts": [
    {
      "time": 18.2,
      "issue": "caption and asset both want lower-center",
      "resolution": "move asset to upper-right"
    }
  ]
}
```

Each element needs:

- stable `id`
- `type`
- `track`
- `start`
- `duration`
- `contentRef`
- `assetRef` if applicable
- `placement`
- `motion`
- `purpose`
- `notes`

Use processed-video time.

When an element needs sound, add an `sfx` object or a matching SFX entry in `visual-plan.md`:

```json
"sfx": {
  "type": "soft-whoosh",
  "intensity": "low",
  "mustBeAudible": true,
  "notes": "Under speech; supports proof card reveal"
}
```

## Dena-Specific Motion Rules

Always preserve:

- face visibility
- caption readability
- credible founder/operator tone
- clean black/white/yellow system
- practical visual clarity

Use motion to make Dena feel:

- sharp
- direct
- technically credible
- human
- focused

Do not make Dena feel:

- chaotic
- gimmicky
- like a generic AI hype account
- like a random meme edit
- like a corporate webinar

## Kumar-Inspired Motion Adaptation

When adapting the Kumar reference:

Use:

- slow push-in
- silhouette or confident frame holds
- sparse title words
- hard cuts on identity/mission
- aura montage
- humanizer cut at the end

Adapt for Dena:

- mission should be about real AI systems/workflows
- title words should be credible and Indonesian-friendly
- proof should show systems, dashboards, code, or process
- ending should feel self-aware/human

Avoid:

- copying red serif title style without reason
- dark villain tone if source footage does not support it
- title words that make unrealistic claims

## Quality Bar

A good Motion/Overlay pass:

- Directs attention exactly where it should go.
- Makes captions easier to read.
- Supports proof and story.
- Adds rhythm without clutter.
- Defines SFX cues that make transitions and proof reveals feel intentional.
- Uses assets only where they help.
- Keeps every motion tied to a purpose.
- Hands off clean timing to the Build phase.

A weak pass:

- Adds effects because the screen feels empty.
- Covers Dena's face or captions.
- Uses too many animations at once.
- Makes screenshots unreadable.
- Creates motion that does not match the story.
- Leaves SFX vague, missing, or too quiet to matter.
- Ignores platform safe areas.
- Requires complex implementation without payoff.

## Failure Modes

If the screen is crowded:

- Remove elements.
- Move proof asset to a different beat.
- Use dim/blur sparingly.
- Prioritize caption and face.

If assets are weak:

- Mark them optional or reject them.
- Ask Screen Plan phase (visual step) for replacements.
- Use simple text/card instead.

If captions are too dense:

- Ask Screen Plan phase (captions step) to regroup.
- Reduce overlay density.
- Avoid proof cards during dense caption bursts.

If motion feels too chaotic:

- Lower motion density.
- Use one primitive per beat.
- Remove shake/flash first.

If cinematic style feels fake:

- Return to `dena-default` or `cinematic-operator`.
- Use real proof and calmer movement.

If source footage is shaky/low quality:

- Avoid punch zoom.
- Use overlays to stabilize attention.
- Keep motion subtle.

## Visual Density Mapping

`creative-brief.md` sets `visual_density`. Map it to the levels above:

| `visual_density` | Motion density level | Asset density |
| --- | --- | --- |
| `light` | `low` | lower end of Default Asset Density in `visual-planning.md` |
| `medium` (default) | `medium` | Default Asset Density |
| `heavy` | `high` | upper end of Default Asset Density; still one idea per visual |
