# Phase 2 - Screen Plan

## Purpose

The Screen Plan phase decides everything that appears on screen over
`processed.mp4`: first the captions, then one visual plan that chooses which
moments get visuals, what type, where they sit, how they move, and which SFX
cues support them.

Every visual moment is chosen once, in `visual-plan.md`. This phase does not cut
video, capture or generate asset files, author HyperFrames HTML, or render.

## When To Use

Use this phase when:

- `processed.mp4` exists and the cut timing is locked.
- The video needs social captions, hook text, editorial titles, CTA text, or
  publish captions.
- The edit needs screenshots, product captures, tool UI, diagrams, generated
  visuals, b-roll, stickers, proof cards, zooms, flashes, progress bars,
  lower-thirds, transitions, pattern interrupts, or SFX cues.
- The user provides a URL, or the transcript mentions a tool, product, site,
  workflow, dashboard, CRM, ERP, code, or AI agent that needs visual context.
- A reference style needs caption or motion mechanics adapted.
- The video feels visually flat after the base cut.

Do not use this phase when:

- The cut is still changing significantly (Story).
- The task is only producing asset files or HTML for an approved plan (Build).
- The task is only QA or publishing.

## Core Principles

### Captions

Captions are not just transcription.

For Dena's videos, captions must do four jobs:

- Make the video understandable with sound off.
- Emphasize the exact words that sell the idea.
- Create rhythm and pattern interrupts.
- Preserve Dena's natural voice.

For default Dena storytelling/talking-head edits, captions must cover every
spoken word that survives the cut. Sparse editorial titles may replace running
captions only for an explicitly chosen cinematic/manifesto section, and that
tradeoff must be documented.

### Visuals

Visuals must clarify, prove, or reset attention. They are not decoration.

Good visuals answer one of these questions:

- What is Dena talking about?
- Why should the viewer believe this?
- What is the contrast?
- What should the viewer look at right now?
- How do we make an abstract AI/workflow idea visible?

Bad visuals are:

- random AI robot images
- AI slop: generic generated visuals that could fit any AI video
- generic stock business photos
- unrelated stickers
- dense screenshots nobody can read
- visuals that make Dena look like a generic AI influencer
- images that compete with the speaker instead of supporting the point

### Motion

Motion must guide attention. Every motion choice needs a reason: reveal meaning,
emphasize a claim, prove a point, reset attention, transition between ideas,
create rhythm, or protect readability. Motion is not decoration. If an effect
does not improve understanding, retention, or emotional force, remove it.

## Inputs

From `videos/<slug>/`: `creative-brief.md`, `edit-decision-notes.md` (including
Cut Summary), `processed-transcript.json` (processed-timeline word timing),
`transcript.json` (raw timeline), `processed.mp4`, `cut-list.json`. Also: user notes about caption or visual style, reference video
notes, user-provided URLs or screenshots, platform target (Instagram Reels,
TikTok, YouTube Shorts), and user constraints (minimal effects, no generated
media, no generated people, no fake product UI, no client data, keep face
unobstructed, use only project-local assets).

## Steps

### Captions step

1. **Confirm cut lock.** Read `docs/agents/references/captions.md` section
   Caption Timing Lock. If `processed.mp4` or `processed-transcript.json` is
   missing, write only a provisional caption plan marked as provisional and
   route back to Story.
2. **Write caption beats.** Follow `docs/agents/references/captions.md` (caption
   types, mode selection, running word coverage, style, highlights, grouping,
   timing, safe area, language, ASR corrections, hook and CTA caption rules).
   The hook card uses the exact words of the locked hook for
   `00:00.00-00:03.00`.
3. **Write caption artifacts.** Use `docs/agents/references/caption-artifacts.md`
   for `caption-beats.json` (Caption Data Format), `caption-plan.md` (Caption
   Plan Template), and `publish-captions.md` (Platform Publish Caption Rules).
   Self-check with its QA Checklist. Captions stay editable as their own layer:
   track `2` for subtitles, track `5` for hook card, editorial title, and CTA.
   Do not burn captions into video.

### Visual step

4. **Map and decide.** Read `docs/agents/references/visual-planning.md` (Asset
   Categories, Asset Decision Workflow steps 1–4, Dena-Specific Asset Rules,
   Dena-Specific Examples, Default Asset Density). Write a Visual Decision Log
   entry for every visual-support opportunity before concluding generated media
   is unnecessary.
5. **Research links and tools.** If the user gave a URL or the transcript names
   a tool/product/site, inspect it now and write what Build must capture in the
   Asset Briefs For Build section, tied to the transcript window. Use URL
   Research And Screen Capture Rules in `docs/agents/references/asset-production.md`
   for what to research and what a useful capture looks like; Build captures.
6. **Plan motion.** Read `docs/agents/references/motion-grammar.md` (grammar by
   format, primitives, pattern interrupts, timing, placement, density levels and
   Visual Density Mapping, sound/motion coordination, Dena-specific motion
   rules) and HyperFrames Compatibility Notes in
   `docs/agents/references/hyperframes-assembly.md`. Tracks and z-index follow
   `internal/docs/design-system/visual-system.md`.
7. **Write the plan.** Use the Visual Plan Template in
   `docs/agents/references/visual-planning.md` for `visual-plan.md`, and the
   Overlay Timeline Format in `docs/agents/references/motion-grammar.md` for
   `overlay-timeline.json`. All times are processed-video time and share one
   cue map with `caption-beats.json`. Timeline IDs are the join key (see the
   template), and `assetRef` uses each Asset Brief's Planned file.
8. **Gate 2.** Apply Gate 2 below.

If no visuals are needed, still write `visual-plan.md` with a Visual Decision
Log whose decisions are `skip`, each with a reason, and a Gate 2 Result.

## Outputs

All in `videos/<slug>/`:

- `caption-plan.md`
- `caption-beats.json`
- `publish-captions.md`
- `visual-plan.md` (with `## Gate 2 Result`)
- `overlay-timeline.json`
- Optional: `caption-review-notes.md`, `caption-style-preview.html`

## Gate 2 - Visual Plan Review (conditional)

Check every Timeline row of `visual-plan.md` against these triggers and write
the matching trigger IDs in the row's `Gate 2 trigger` column (`-` when none):

| # | Trigger |
| --- | --- |
| R1 | A number, price, percentage, result, client name, or quote on screen that is not verbatim from the transcript and was not given by the user |
| R2 | A screenshot or recording that shows real client or product data, or private information |
| R3 | A visual that covers Dena's face completely for more than 6 seconds, or covers a personal, emotional, or opinion line |
| R4 | A visual that covers Dena's face in `00:00.00-00:03.00`, unless `creative-brief.md` explicitly chose that hook visual (for example a manifesto background still). Hook card, captions, progress bar, punch zoom, and flash do not cover the face and do not trigger R4 |
| R5 | A CTA that implies a promise ("nanti gue share/kirim/bahas…") without the user's explicit approval |
| R6 | Generated image or video that depicts a real person or a real brand |

Decide each trigger from `visual-plan.md` plus these artifacts:

- R1: `processed-transcript.json` for verbatim wording; `## User Approvals` in
  `creative-brief.md` for user-supplied facts.
- R4: `## User Approvals` in `creative-brief.md` for an approved hook visual.
- R5: the `cta-caption` beats in `caption-beats.json`, even when the CTA has no
  Timeline row, and `## User Approvals` for an approved promise.
- R2, R3, R6: the Timeline row, its On-screen text, and its Asset Brief.

- Any trigger found: stop. Show only the flagged rows, each with its trigger and
  one safe alternative. The user approves, changes, or drops each row. Record
  the decisions in `## Gate 2 Result`, update the plan, then continue.
- No trigger found: write `Result: Gate 2: no triggers` and continue to
  `docs/agents/03-build.md`.

## Handoff

Hand off visuals as ingredients with a decided place, not as loose ideas. Every
Timeline row plus its Asset Brief gives Build:

- time range and the spoken line
- purpose
- required/optional flag
- placement and track
- motion in/out and SFX cue
- privacy/provenance expectation (real capture vs. generated, never presented
  as proof when generated)
- what not to cover or obscure

Bad handoff:

> Use these cool AI images somewhere.

Good handoff:

> `V-02` covers output `12-16s`, line "AI bukan gimmick". Subtle background/side card on track 4, not full-screen; fade in 0.3s with a soft whoosh under speech. Generated, so it must not be presented as proof. No robots, no readable fake UI. Keep Dena's face visible.

## Fix Routing

This phase owns:

- Captions step: caption wording, missing spoken words, ASR, phrase grouping,
  highlight logic, caption position, CTA text, publish captions.
- Visual step: visual at the wrong moment, irrelevant visual, missing URL/tool
  context, noisy motion, weak pattern interrupt, missing or inaudible SFX cue,
  overlay timing conflict, wrong density.

A change here invalidates Build outputs for the affected elements: Build
re-produces the affected assets and re-assembles those clips.
