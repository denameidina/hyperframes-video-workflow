# Agent Chain

Use this reference when deciding which Dena video agent to run and what artifact must be produced next.

## Default Edit Workflow

1. `docs/agents/01-creative-director.md`
   - Owns: angle, audience, hook, content lane, visual grammar, CTA.
   - Reads: style guide, user request, reference notes or inspected reference video.
   - Writes: `videos/<slug>/creative-brief.md`.

2. `docs/agents/02-transcript-cut-agent.md`
   - Owns: media audit, transcript, silence/filler/repetition cuts, base pacing, `1.2x` default speed or documented exception.
   - Reads: creative brief and source media.
   - Writes: `metadata.json`, `transcript.json`, `edit-decision-notes.md`, `cut-list.json`, optionally `processed.mp4`.

3. `docs/agents/03-caption-subtitle-agent.md`
   - Owns: caption text, full spoken-word running coverage for storytelling videos, phrase grouping, highlights, ASR correction, caption timing.
   - Reads: creative brief, cut notes, transcript.
   - Writes: `caption-plan.md`, `caption-beats.json`, `publish-captions.md`.

4. `docs/agents/04-asset-generation-agent.md`
   - Owns: screenshots, URL/web captures, screen recordings, generated stills/video, b-roll, diagrams, UI crops, proof visuals.
   - Reads: brief, cut notes, caption plan.
   - Writes: `asset-plan.md`, `asset-manifest.json`, asset files.

5. `docs/agents/05-motion-overlay-agent.md`
   - Owns: overlay timing, pattern interrupts, card motion, zooms, progress bars, transitions, SFX cue timing.
   - Reads: captions and assets.
   - Writes: `motion-plan.md`, `overlay-timeline.json`.

6. `docs/agents/06-hyperframes-assembly-agent.md`
   - Owns: `index.html`, optional `compositions/*.html`, local asset wiring, timed clips, GSAP timeline registration.
   - Reads: all upstream plans and `/hyperframes` routed docs.
   - Writes: composition files, `assembly-notes.md`, `assembly-checklist.md`.

7. Optional review gate: `docs/agents/07-qa-review-agent.md`
   - Owns: final verdict, punch list, render/platform readiness, revision routing.
   - Reads: all upstream artifacts, composition files, preview/render evidence.
   - Writes: `qa-report.md`, `qa-punch-list.md`, optionally `render-review.md` and `final-approval.md`.
   - Runs only when the user chooses QA first, asks for readiness/punch-list review, or needs regression review.

After Agent 06, render the edit and stop for user review. At that gate, offer publish as-is, QA first, or revisions. R2/Repliz publish still requires explicit user approval.

## Skip Rules

Skipping is allowed only when the reason is explicit.

- Skip Agent 04 only when no assets are needed and no URL/tool/product context needs visual support; write that decision in `caption-plan.md` or `motion-plan.md`.
- Skip Agent 05 only for plain captions without designed overlays, pattern interrupts, progress, or SFX.
- Skip Agent 06 only when no HyperFrames composition is being created or changed.
- Skip Agent 07 by default until the user review/publish gate. Run it only when the user chooses QA first, asks for readiness/punch-list review, or a regression review is needed.

Never skip Agent 01 for a new creative edit unless the user asks for a narrow technical operation.

## Fix Routing

Route revisions to the owner:

- Weak hook, wrong format, wrong CTA: Agent 01.
- Rambling cut, missing context, rough jump cut, bad base audio edit: Agent 02.
- Wrong speed, missing `1.2x`, or undocumented slower speed: Agent 02.
- Caption wording, missing spoken words, ASR, phrase grouping, highlight logic: Agent 03.
- Unreadable screenshot, missing URL capture, bad generated asset, privacy issue in asset: Agent 04.
- Noisy motion, weak pattern interrupt, missing/inaudible SFX cue, overlay timing conflict: Agent 05.
- Broken HyperFrames contract, missing media, track overlap, z-index, render failure: Agent 06.
- Optional QA decision, punch list, regression review: Agent 07.

## User Shortcuts

If the user says:

- `lanjut agent berikutnya`: continue to the next numbered agent.
- `audit dulu`: inspect source/reference and produce evidence before changing files.
- `buat workflow`: create or update docs first; do not jump into editing.
- `render final`: run required technical checks, render, then send to the user review gate.
- `publish final` or `publish as-is`: verify explicit user approval, then use `npm run repliz:publish -- --slug <videos/slug> --file <render.mp4> --approved`.
- `QA first`: run Agent 07, then return to the user review/publish gate.
