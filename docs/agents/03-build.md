# Phase 3 - Build

## Purpose

The Build phase turns the approved Story and Screen Plan artifacts into real
files: it captures or generates the planned assets, assembles an editable
HyperFrames composition, verifies it, and renders it for the user's review.

This phase does not change the creative idea, the cut, the captions, or the
visual decisions. When one of those is wrong, route it back to the owning phase.

## When To Use

Use this phase when:

- Story and Screen Plan artifacts exist, including `## Gate 2 Result` in
  `visual-plan.md`.
- Planned assets need to be captured, generated, cropped, or recorded.
- `videos/<slug>/index.html` or `videos/<slug>/compositions/*.html` must be created or updated to match the
  plans.
- The video must stay editable as separate layers instead of being burned into
  the source MP4.
- A render is needed for user review.

Do not use this phase when:

- The cut, captions, or visual plan are still being decided.
- The user only wants analysis, a brief, or a plan.
- The task is only QA review or publishing.
- The project is not a HyperFrames project and no conversion/initialization has
  been approved.

## Core Principle

Assembly must be faithful, inspectable, and deterministic.

The composition should make the approved edit real without hiding decisions
inside a rendered file. Captions, overlays, cards, screenshots, video, and audio
should remain separate timed layers that can be inspected and adjusted.

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

From `videos/<slug>/`: `creative-brief.md`, `edit-decision-notes.md`,
`processed.mp4` (and separate audio, if present), `caption-plan.md`,
`caption-beats.json`, `visual-plan.md`, `overlay-timeline.json`. Also: the video's
HyperFrames project (`index.html`, `compositions/*.html` in `videos/<slug>/`), local fonts, textures,
screenshots, b-roll, stickers, icons, generated media, and user constraints
(keep all overlays editable, no generated media, no remote assets, no heavy
motion, match Dena default style, reuse existing project structure).

## Steps

1. **Readiness.** Confirm every Story and Screen Plan artifact above exists and `visual-plan.md` has a
   filled `## Gate 2 Result`. If anything is missing, stop and write an assembly
   readiness report naming the missing artifact and its owning phase; do not
   guess.
2. **Produce assets.** Read `docs/agents/references/asset-production.md`. For
   each Asset Brief in `visual-plan.md`, and for each file in a Style B-roll
   Brief's `Assets:` list (Style Assets in `asset-production.md`; the clips
   themselves are not assets, step 4a writes them), capture or generate the file into
   `videos/<slug>/assets/` under its Planned file name, record it in
   `videos/<slug>/assets/asset-manifest.json` (Asset Manifest Format, with the
   Timeline ID in `handoff`), and add a Capture And Privacy Record to
   `assembly-notes.md` under `## Asset Production`. Prepare a local, trimmed SFX
   file for every SFX cue in the Timeline, sourced from a local project library or
   the `/hyperframes-media` bundled SFX library (no `data-media-start`; see Lean Fixing
   Defaults in `docs/skills/dena-video-editing-workflow/SKILL.md`). If a capture
   shows text or data that would trip R1 or R2 and Gate 2 did not approve it,
   stop and ask the user before using it. If a planned capture is unusable,
   route the row back to Screen Plan (visual step) instead of picking a
   replacement. Use stable, descriptive
   filenames:
   - Good: `assets/ai-workflow-control-room-12s.png`,
     `assets/crm-dashboard-proof-28s.png`,
     `assets/manual-to-automated-diagram.svg`
   - Bad: `assets/image1.png`, `assets/final-final.png`, `assets/cool-bg.mp4`
2a. **Scaffold the project.** If `videos/<slug>/index.html` does not exist, run
   `npm run video -- new <slug>` (starter from `templates/dena-video/`, duration
   from `processed.mp4`). All composition work happens in `videos/<slug>/`;
   never edit the root `index.html` for a video (ADR-0010).
3. **Load HyperFrames rules.** Read the `/hyperframes` and `/hyperframes-core`
   skills, and as needed `npx hyperframes docs data-attributes`,
   `compositions`, `gsap`, `rendering`, `troubleshooting`. Tracks, z-index, and
   safe area follow `internal/docs/design-system/visual-system.md`.
4. **Assemble.** Follow `docs/agents/references/hyperframes-assembly.md`
   (HyperFrames Contract, Assembly Procedure, HTML Skeleton, HyperFrames
   Compatibility Notes, Common Failure Modes). For the separate `<audio>`
   element, extract the audio of `processed.mp4` (or use `audio-clean.wav` when
   Story made one) to `videos/<slug>/processed-audio.wav`; never use Story's
   raw-time ASR extract.
4a. **Author motion visuals.** For each `motion-broll` row, follow
   `docs/agents/references/motion-broll-authoring.md`; for each `broll-text`,
   `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, or `mix-media` row, follow the Build Contract in
   `docs/agents/references/styles/README.md` and the Build Recipe in that
   style's file. For a `mix-media` row, first run
   `npm run video -- cutout <slug> --from <start> --dur <duration> --name NN-dena`
   and mount the speaker `<video>` on track 6 as in `mix-media.md`. Write the clip at its Planned file, mount it in `videos/<slug>/index.html` on track 4, add the split transform
   when the treatment is split, then run the Still Check at the brief's key-word
   times and fix what it shows before step 5.
5. **Verify.** Run `npm run video -- check <slug>` and fix every error; review warnings. Preview
   keyframes as listed in the Render Gate of
   `docs/skills/dena-video-editing-workflow/references/quality-gates.md`.
6. **Write handoff notes.** `assembly-notes.md` and `assembly-checklist.md`
   (formats in `docs/agents/references/hyperframes-assembly.md`).
7. **Render.** `npm run video -- render <slug>` (writes `videos/<slug>/renders/<slug>.mp4`; add `--blur` for a final render with motion blur, which writes `<slug>-blur.mp4`), then the export sanity check from the Render
   Gate (file exists, duration plausible, audio present, first/last frames not
   blank).
8. **Gate 3.** Apply Gate 3 below.

## Outputs

- `videos/<slug>/index.html`
- `videos/<slug>/compositions/broll/*.html` for motion b-roll and style b-roll clips; other
  `compositions/*.html` only when sub-compositions are justified
- `videos/<slug>/assets/*` and `videos/<slug>/assets/asset-manifest.json`, when
  assets exist
- `videos/<slug>/processed-audio.wav`
- `videos/<slug>/assembly-notes.md`
- `videos/<slug>/assembly-checklist.md`
- Render MP4: `videos/<slug>/renders/<slug>.mp4`
- Optional: `videos/<slug>/storyboard.json`, `videos/<slug>/preview/keyframes/`,
  `videos/<slug>/warnings.md`, `videos/<slug>/render-notes.md`

## Gate 3 - Final Review (mandatory)

Stop after the render and send it to the user with:

- render MP4 path
- composition file paths
- asset paths
- source video path
- audio path
- `assembly-notes.md`
- `assembly-checklist.md`
- latest verification command output summary
- unresolved warnings
- known visual risks
- key moments the user should inspect

Offer three paths:

1. **Approve** (default): go to the publish gate.
2. **QA first**: run `docs/agents/04-qa.md` as a fresh-context subagent, then
   return here.
3. **Revise**: route each fix to its owning phase (Fix Routing in
   `docs/skills/dena-video-editing-workflow/references/phase-chain.md`), then
   re-assemble and re-render.

Do not upload or schedule publishing from this phase.

## Publish Gate

Only after the user's explicit approval:

```bash
npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved
```

QA artifacts are not required when the user approves without QA. Details:
`docs/repliz/integration-spec.md`.

## Fix Routing

This phase owns: unreadable or badly cropped asset, weak generated asset,
missing capture of a planned item, privacy issue in a produced asset, broken
HyperFrames contract, missing media, track overlap, z-index, and render
failure.
