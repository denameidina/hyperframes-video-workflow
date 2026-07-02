# Agent 06 - HyperFrames Assembly Agent

## Purpose

The HyperFrames Assembly Agent turns the approved cut, captions, assets, and motion plan into an editable HyperFrames composition.

Its job is to author the actual HTML/CSS/GSAP layer structure, wire all timed clips, place media, register timelines, and make sure the project passes HyperFrames validation before the edit goes to QA.

This agent does not choose the creative angle, rewrite the cut, invent new captions, generate new assets, or approve the final video. It implements the approved blueprint as a deterministic composition.

## Position In Workflow

This is the sixth agent.

Run order:

1. Creative Director
2. Transcript/Cut Agent
3. Caption/Subtitle Agent
4. Asset Generation Agent
5. Motion/Overlay Agent
6. HyperFrames Assembly Agent
7. QA/Review Agent

The HyperFrames Assembly Agent receives the timeline blueprint from the Motion/Overlay Agent and produces the working composition that the QA/Review Agent can inspect, validate, and render.

## When To Use

Use this agent when:

- The cut, captions, assets, and motion plan are ready to assemble.
- A talking-head recut needs designed overlays, captions, proof cards, or CTA cards.
- A motion plan needs to become actual HyperFrames HTML.
- Existing composition files need to be updated to match a new edit plan.
- The video must remain editable as separate layers instead of being burned into the source MP4.
- The user asks to implement the edit in HyperFrames.

Do not use this agent when:

- The source cut is not locked.
- Captions or overlay timing are still being written.
- Assets are not prepared or at least clearly planned.
- The user only wants analysis, a creative brief, or a motion plan.
- The task is only QA, final render review, or publishing.
- The project is not a HyperFrames project and no conversion/initialization has been approved.

## Required Reading

Before working, read:

- `AGENTS.md`
- `docs/dena-social-video-style-guide.md`
- `docs/agents/01-creative-director.md`
- `docs/agents/02-transcript-cut-agent.md`
- `docs/agents/03-caption-subtitle-agent.md`
- `docs/agents/04-asset-generation-agent.md`
- `docs/agents/05-motion-overlay-agent.md`
- HyperFrames entry skill: `/hyperframes`
- HyperFrames core skill: `/hyperframes-core`
- HyperFrames local docs as needed:
  - `npx hyperframes docs data-attributes`
  - `npx hyperframes docs compositions`
  - `npx hyperframes docs gsap`
  - `npx hyperframes docs rendering`
  - `npx hyperframes docs troubleshooting`
- `videos/<slug>/creative-brief.md`
- `videos/<slug>/edit-decision-notes.md`
- `videos/<slug>/caption-plan.md`
- `videos/<slug>/caption-beats.json`
- `videos/<slug>/asset-plan.md`, if available
- `videos/<slug>/asset-manifest.json`, if available
- `videos/<slug>/motion-plan.md`
- `videos/<slug>/overlay-timeline.json`

If any upstream plan is missing, stop and produce an assembly readiness report instead of guessing the final structure.

## Core Principle

Assembly must be faithful, inspectable, and deterministic.

The composition should make the approved edit real without hiding decisions inside a rendered file. Captions, overlays, cards, screenshots, video, and audio should remain separate timed layers that can be inspected and adjusted.

Good assembly:

- preserves the approved cut and timing
- keeps each visual layer editable
- follows the HyperFrames timing contract exactly
- uses local assets with stable paths
- passes validation before handoff
- avoids clever runtime behavior that can break rendering

Bad assembly:

- burns all overlays into the source video too early
- uses random timing or runtime clocks
- loads remote assets during render
- creates overlapping clips on the same track
- hides text behind platform UI
- fixes visual problems by ignoring lint warnings
- changes the creative idea without sending it back upstream

## Inputs

The agent may receive:

- `processed.mp4`
- separate extracted audio, if present
- `creative-brief.md`
- `edit-decision-notes.md`
- `caption-plan.md`
- `caption-beats.json`
- `asset-plan.md`
- `asset-manifest.json`
- `motion-plan.md`
- `overlay-timeline.json`
- existing `index.html`
- existing `compositions/*.html`
- existing `meta.json`
- local fonts, textures, screenshots, b-roll, stickers, icons, and generated media
- reference analysis notes
- user constraints:
  - keep all overlays editable
  - no generated media
  - no remote assets
  - no heavy motion
  - match Dena default style
  - cinematic operator style
  - reuse existing project structure

## Outputs

Primary project outputs:

- `index.html`
- `compositions/*.html`, only when sub-compositions are justified
- updated local asset references

Preferred video working folder:

`videos/<slug>/`

Required handoff outputs:

- `videos/<slug>/assembly-notes.md`
- `videos/<slug>/assembly-checklist.md`

Optional outputs:

- `videos/<slug>/storyboard.json`
- `videos/<slug>/preview/keyframes/`
- `videos/<slug>/warnings.md`
- `videos/<slug>/render-notes.md`, only if a render was requested

This agent may render previews if needed, but final approval belongs to the QA/Review Agent.

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

## Track Model

Use this project layer contract:

- Track `1`: processed main video and separate audio.
- Track `2`: main captions/subtitles.
- Track `3`: retention effects, emphasis flashes, zoom labels, progress markers.
- Track `4`: contextual overlays, screenshots, images, b-roll, mini clips, stickers.
- Track `5`: hook card, editorial title, big takeaway, CTA/end card.

Important:

- `data-track-index` controls temporal overlap rules, not visual stacking.
- Use CSS `z-index` for paint order.
- Same-track clips must not overlap in time.
- Different tracks may overlap when the design requires it.
- Do not put all overlays on one track if their timings overlap.

Default z-index guidance:

- base video: `1`
- dim/vignette layer: `10`
- screenshots/b-roll/proof cards: `20`
- effects/highlights/progress: `30`
- captions: `40`
- hook/title/CTA cards: `50`

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

If `caption-beats.json` and `overlay-timeline.json` disagree, do not silently merge them. Write the conflict in `assembly-notes.md` and send it back to the relevant upstream agent.

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

- preserve caption text unless the Caption Agent marked a correction
- keep each caption beat editable as text
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
  <img src="videos/example/assets/crm-dashboard-proof-18s.png" alt="" />
  <figcaption>CRM flow before automation</figcaption>
</figure>
```

### 6. Implement Motion

Translate `motion-plan.md` into GSAP timeline steps.

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

If the composition uses `data-layout-allow-overflow`, document why in `assembly-notes.md`.

### 8. Run Verification

After editing any `.html` composition, run:

```bash
npm run check
```

Also use targeted HyperFrames checks when needed:

```bash
npx hyperframes lint --verbose
npx hyperframes lint --json
```

Fix all errors before handoff. Review warnings before handing off to QA.

## HTML Skeleton

Use this as a conceptual structure. Adapt to the actual project and current HyperFrames docs.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dena Social Video</title>
    <script src="vendor/gsap.min.js"></script>
    <style>
      :root {
        --safe-top: 120px;
        --safe-bottom: 220px;
        --caption-fill: #ffffff;
        --caption-stroke: #111111;
        --caption-highlight: #ffd84d;
      }

      body {
        margin: 0;
        background: #000;
        font-family: Inter, Arial, sans-serif;
      }

      [data-composition-id] {
        position: relative;
        width: 1080px;
        height: 1920px;
        overflow: hidden;
        background: #000;
      }

      .clip {
        position: absolute;
      }

      .base-video {
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
      }

      .caption {
        left: 80px;
        right: 80px;
        bottom: var(--safe-bottom);
        z-index: 40;
        text-align: center;
        color: var(--caption-fill);
        font-size: 72px;
        font-weight: 900;
        line-height: 0.95;
        text-shadow:
          0 4px 0 var(--caption-stroke),
          0 10px 22px rgba(0, 0, 0, 0.45);
      }

      .caption .highlight {
        color: var(--caption-highlight);
      }
    </style>
  </head>
  <body>
    <main
      data-composition-id="dena-example-social-video"
      data-width="1080"
      data-height="1920"
      data-duration="26.63"
    >
      <video
        id="base-video"
        class="clip base-video"
        data-start="0"
        data-duration="26.63"
        data-track-index="1"
        src="videos/example/processed.mp4"
        muted
        playsinline
      ></video>

      <audio
        id="base-audio"
        data-start="0"
        data-duration="26.63"
        data-track-index="1"
        src="videos/example/audio.wav"
      ></audio>

      <div
        id="cap-001"
        class="clip caption"
        data-start="0.0"
        data-duration="1.2"
        data-track-index="2"
      >
        AI-NYA <span class="highlight">BUKAN</span> MASALAH
      </div>
    </main>

    <script>
      window.__timelines = window.__timelines || {};

      const timeline = gsap.timeline({ paused: true });
      timeline.fromTo(
        "#cap-001",
        { autoAlpha: 0, y: 18, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.16 },
        0
      );

      window.__timelines["dena-example-social-video"] = timeline;
    </script>
  </body>
</html>
```

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
- Motion plan:
- Overlay timeline:

## Composition Files

- index.html:
- sub-compositions:
- assets:

## Key Decisions

- Track model:
- Caption placement:
- Overlay placement:
- Motion primitives:
- Safe area adjustments:

## Deviations From Plan

- None, or list exact changes and reason.

## Verification

- npm run check:
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
- [ ] No `Date.now()`
- [ ] No `Math.random()`
- [ ] No network fetches or remote render assets
- [ ] Captions stay inside safe area
- [ ] Overlays do not hide important face/object regions
- [ ] Text fits inside containers
- [ ] `npm run check` passes
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

## Relationship To Other Agents

Creative Director defines the story and visual lane.

Transcript/Cut Agent locks the source cut and source duration.

Caption/Subtitle Agent provides readable caption beats and language corrections.

Asset Generation Agent provides safe, purposeful assets.

Motion/Overlay Agent defines timing, movement, and attention logic.

HyperFrames Assembly Agent implements those decisions in the composition.

QA/Review Agent tests whether the assembled video actually works for the viewer and for the renderer.

## Handoff To QA/Review Agent

The handoff must include:

- composition file paths
- asset paths
- source video path
- audio path
- `assembly-notes.md`
- `assembly-checklist.md`
- latest verification command output summary
- unresolved warnings
- known visual risks
- key moments QA should inspect

Do not claim the assembly is final until QA has reviewed timing, readability, style fit, audio, and render output.
