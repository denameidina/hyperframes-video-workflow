# HyperFrames Assembly (Reference)

Contract, procedure, skeleton, and handoff formats for assembling the edit in
HyperFrames. Loaded by `docs/agents/03-build.md` in the assembly step, after the
`/hyperframes` and `/hyperframes-core` skills. Tracks and z-index follow
`internal/docs/design-system/visual-system.md`. Screen Plan reads only the
HyperFrames Compatibility Notes section.

## HyperFrames Contract

Follow these rules without exception.

Root composition:

- Use a stable `data-composition-id`.
- Set explicit `data-width`, `data-height`, and `data-duration`.
- Default social video size is `1080x1920` for Reels, TikTok, and Shorts unless the project specifies otherwise.
- Keep the root deterministic and self-contained.

Timed elements:

- Every timed element needs `data-start`, `data-duration`, and `data-track-index`.
- Every visible timed element needs `class="clip"`.
- Timed clips should be direct children of the composition root unless HyperFrames docs explicitly allow the chosen pattern.
- Every important clip needs a stable `id`.
- Use seconds for timing.
- Do not allow same-track temporal overlap.

Timeline:

- Create one paused GSAP timeline for each composition.
- Register it on `window.__timelines` using the exact root `data-composition-id`.
- Build the timeline during page setup, not through asynchronous runtime behavior.
- Do not rely on `Date.now()`, `Math.random()`, timers, network fetches, or user interaction.

Media:

- Use local media paths.
- Place video/audio elements according to the HyperFrames media rules.
- Main video should be muted.
- Use a separate audio element for audio playback.
- Do not depend on remote CDNs or external image/video URLs in the render path.
- If a local `vendor/gsap.min.js` exists in the project, prefer it over a remote script.

Sub-compositions:

- Use `data-composition-src="compositions/file.html"` only when a sub-composition reduces real complexity.
- The host clip and inner composition must agree on composition identity and duration.
- Register the sub-composition timeline under its own composition id.
- Keep sub-composition assets local and deterministic.
- Do not hide broken root structure inside a sub-composition.

## Assembly Procedure

### 1. Confirm Readiness

Check that the upstream files exist and agree with each other:

- source duration
- output aspect ratio
- caption beat timing
- overlay timing
- asset filenames
- CTA timing
- style lane
- user constraints

If `caption-beats.json` and `overlay-timeline.json` disagree, do not silently merge them. Write the conflict in `assembly-notes.md` and send it back to the owning upstream phase.

### 2. Prepare Composition Settings

Set:

- composition id
- width and height
- duration
- background color or base fill
- font stack
- CSS variables for colors, spacing, safe areas, and z-index layers
- local asset paths

For Dena default social videos:

- size: `1080x1920`
- safe top: at least `120px`
- safe bottom: at least `220px`
- caption zone: lower-middle or lower-center, not platform-bottom
- text style: bold sans, white fill, black stroke/shadow, selective yellow highlight

For cinematic/operator videos:

- allow sparse title frames
- use controlled dim/vignette
- keep motion restrained
- do not copy a reference video's full color identity unless approved

### 3. Place Base Media

Use the processed cut as the base visual layer.

Rules:

- keep the source video unchanged unless upstream cut decisions require replacement
- make the video cover the full 9:16 frame without distortion
- keep video muted
- add a separate audio element
- give both media elements timing attributes
- keep media paths local and stable

If audio is already embedded in `processed.mp4`, still follow the project's HyperFrames rule: video muted, separate audio element for playback.

### 4. Implement Captions

Convert `caption-beats.json` into timed caption clips.

Rules:

- preserve caption text unless the Screen Plan phase (captions step) marked a correction
- keep each caption beat editable as text
- preserve full spoken-word coverage from `caption-beats.json`; do not collapse running captions into sparse highlight-only text
- use stable ids such as `cap-001`
- use one highlighted phrase per beat by default
- avoid placing captions over the mouth, key objects, or platform UI
- avoid overlong lines
- use CSS classes for variants instead of inline one-off styling

Caption implementation options:

- simple text clip
- text with highlighted span
- hook card
- editorial title
- CTA text

Do not turn captions into images unless a specific typography effect requires it and QA approves the tradeoff.

### 5. Implement Assets And Overlays

Convert `asset-manifest.json` and `overlay-timeline.json` into timed clips.

Rules:

- every asset clip needs a purpose tied to the brief
- keep screenshots readable
- blur or crop private data before assembly
- use local files only
- do not stretch assets unnaturally
- do not hide Dena's face for too long
- do not place dense proof cards behind active captions

Preferred overlay structure:

```html
<figure
  id="proof-card-018"
  class="clip proof-card"
  data-start="18.2"
  data-duration="3.4"
  data-track-index="4"
>
  <img src="assets/crm-dashboard-proof-18s.png" alt="" />
  <figcaption>CRM flow before automation</figcaption>
</figure>
```

### 6. Implement Motion

Translate `visual-plan.md` into GSAP timeline steps.

Rules:

- use short, readable animation primitives
- keep timeline labels meaningful when useful
- animate transform and opacity before expensive layout properties
- avoid negative letter spacing
- avoid viewport-scaled font sizes
- keep text inside its container on mobile and desktop preview sizes
- keep animation deterministic

Good motion mapping:

- `caption-pop` -> opacity plus small y/scale change
- `proof-card-slide` -> x/y plus opacity
- `background-dim` -> opacity
- `punch-zoom` -> scale on base video wrapper
- `progress-bar` -> deterministic transform scaleX
- `cta-morph` -> grouped exit/enter sequence

Do not add new motion because it looks interesting. Only implement motion that supports the approved plan.

### 6a. Implement SFX Cues

If `visual-plan.md` or `overlay-timeline.json` includes SFX cues, wire them as local audio assets or a prepared SFX stem.

Rules:

- keep SFX files under `videos/<slug>/assets/` or another documented local project path
- time cues to the same processed-video timeline as captions and overlays
- keep SFX under speech; do not mask spoken words
- document any skipped cue in `assembly-notes.md`
- if no SFX asset exists for a required cue, produce one in the asset production step instead of silently omitting it

Do not rely on remote sound URLs in the render path.

### 7. Validate Layout

Check:

- no text over platform bottom UI
- no important text outside safe areas
- no unexpected overflow
- no unreadable screenshot
- no caption/card collision
- no face or mouth blocked for too long
- no text clipped by its container
- no asset path missing
- no timing mismatch at the first or last frame
- planned SFX cues are wired or explicitly documented as skipped

If the composition uses `data-layout-allow-overflow`, document why in `assembly-notes.md`.

### 8. Run Verification

After editing any `.html` composition, run:

```bash
npm run video -- check <slug>
```

Also use targeted HyperFrames checks when needed:

```bash
npx hyperframes lint --verbose
npx hyperframes lint --json
```

Fix all errors before handoff. Review warnings before user review or optional QA.

## HTML Skeleton

The canonical skeleton is the Dena starter `templates/dena-video/index.html`.
`npm run video -- new <slug>` copies it to `videos/<slug>/index.html` and fills the
composition id (`dena-<slug>`) and duration. It follows
`internal/docs/design-system/visual-system.md`: base video track 1, base audio
track 10, progress track 3, captions alternating tracks 2 and 8, hook/CTA track 5,
b-roll mounts track 4, SFX tracks 11+, caption z-index 45, hook/CTA 56, `.broll` 22.
Media paths are relative to the project (`processed.mp4`, `processed-audio.wav`,
`assets/...`).

## Assembly Notes Format

Create `videos/<slug>/assembly-notes.md`:

```md
# Assembly Notes

## Source

- Processed video:
- Audio:
- Duration:
- Aspect ratio:
- Composition id:

## Implemented Inputs

- Creative brief:
- Cut notes:
- Caption beats:
- Asset manifest:
- Visual plan:
- Overlay timeline:

## Composition Files

- index.html:
- sub-compositions:
- assets:

## Asset Production

- One Capture And Privacy Record per captured or generated asset (format in
  `docs/agents/references/asset-production.md`).

## Key Decisions

- Track model:
- Caption placement:
- Overlay placement:
- Motion primitives:
- SFX cues:
- Safe area adjustments:

## Deviations From Plan

- None, or list exact changes and reason.

## Verification

- npm run video -- check <slug>:
- npx hyperframes lint --verbose:
- warnings reviewed:

## Handoff Risks

- None, or list items QA should inspect.
```

## Assembly Checklist Format

Create `videos/<slug>/assembly-checklist.md`:

```md
# Assembly Checklist

- [ ] Root has stable `data-composition-id`
- [ ] Root has `data-width`, `data-height`, `data-duration`
- [ ] Every timed visible element has `class="clip"`
- [ ] Every timed element has `data-start`, `data-duration`, `data-track-index`
- [ ] Same-track clips do not overlap
- [ ] Main video is muted
- [ ] Separate audio element exists
- [ ] Timeline is paused
- [ ] Timeline is registered on `window.__timelines`
- [ ] Timeline key matches composition id
- [ ] Assets are local
- [ ] SFX assets/stems are local when planned
- [ ] No `Date.now()`
- [ ] No `Math.random()`
- [ ] No network fetches or remote render assets
- [ ] Captions stay inside safe area
- [ ] Overlays do not hide important face/object regions
- [ ] Text fits inside containers
- [ ] Planned SFX cues are implemented or documented
- [ ] `npm run video -- check <slug>` passes
- [ ] Warnings are reviewed
```

## Common Failure Modes

### Captions Stay Visible All The Time

Likely causes:

- missing `class="clip"`
- missing timing attributes
- clip is not a direct child where the framework expects one
- composition id mismatch

Fix:

- add required data attributes
- make the element a proper timed clip
- verify root and timeline registration

### Lint Reports Same-Track Overlap

Likely causes:

- captions share track `2` but overlap by a few frames
- proof cards share track `4` during a transition
- media and overlay placed on the same track unnecessarily

Fix:

- trim durations
- move one overlapping clip to another valid track
- keep visual stacking controlled by CSS `z-index`

### Audio Missing

Likely causes:

- relying on muted video audio
- missing separate audio element
- wrong audio path
- audio not timed

Fix:

- add or repair separate audio element
- verify local path
- match timing to base video duration

### Blank Or Broken Video

Likely causes:

- wrong media path
- media element not placed according to HyperFrames rules
- unsupported file location
- CSS hiding the video

Fix:

- verify the path from project root
- keep base media direct and visible
- check z-index and opacity

### Sub-Composition Does Not Render

Likely causes:

- host `data-composition-src` path is wrong
- inner composition id mismatch
- timeline registered under the wrong key
- duration mismatch

Fix:

- align host and inner composition metadata
- register the correct timeline id
- inspect the sub-composition independently

### Render Is Non-Deterministic

Likely causes:

- `Date.now()`
- `Math.random()`
- timer-based animation
- network fetch
- remote images/scripts

Fix:

- replace runtime behavior with fixed timing and local data
- precompute randomized-looking values upstream if needed
- store assets locally

### Text Overlaps Platform UI

Likely causes:

- caption bottom too low
- CTA card too tall
- viewport-scaled font
- long unwrapped word

Fix:

- increase bottom safe area
- reduce line length
- use stable font size with responsive constraints
- split caption beat upstream if needed

## HyperFrames Compatibility Notes

The Screen Plan phase (visual step) should keep the plan easy to implement in HyperFrames.

Every planned timed element should map cleanly to:

- `class="clip"`
- `data-start`
- `data-duration`
- `data-track-index`
- stable `id`

Animation should be deterministic:

- no random values
- no network fetches
- no time-dependent behavior
- no external CDN assumptions

Prefer simple GSAP-compatible motion:

- opacity
- x/y
- scale
- rotation only when subtle
- clip-path only when necessary
- filter/blur only when performance is safe

Avoid:

- complex shader assumptions
- huge layered blur effects
- dozens of simultaneous moving elements
- CSS that may render inconsistently

