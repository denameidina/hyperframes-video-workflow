# Phase Chain

Use this reference when deciding which Dena video phase to run and what artifact must be produced next. Decision record: `internal/docs/adr/0008-four-phase-workflow.md`.

## Default Edit Workflow

1. `docs/agents/01-story.md`
   - Owns: media audit, transcript, angle, audience, content lane, hook locked from transcript, visual grammar, CTA direction, silence/filler/repetition cuts, base pacing, `1.2x` default speed or documented exception.
   - Reads: style guide, user request, reference notes or inspected reference video, source media.
   - Writes: `creative-brief.md`, `metadata.json`, `transcript.json`, `processed-transcript.json`, `edit-decision-notes.md` (with Cut Summary), `cut-list.json`, `processed.mp4`.
   - Gate 1 (optional): cut review only when the user asks or `gate_cut: on`.

2. `docs/agents/02-screen-plan.md`
   - Owns: caption text, full spoken-word running coverage, phrase grouping, highlights, ASR correction, caption timing, publish captions; then every visual choice, Visual Decision Log, placement, overlay timing, pattern interrupts, zooms, transitions, SFX cue timing.
   - Reads: Story artifacts.
   - Writes: `caption-plan.md`, `caption-beats.json`, `publish-captions.md`, `visual-plan.md`, `overlay-timeline.json`.
   - Gate 2 (conditional): stops only when a timeline row matches R1–R6.

3. `docs/agents/03-build.md`
   - Owns: URL/web captures, screen recordings, generated stills/video, UI crops, diagrams, `index.html`, optional `compositions/*.html`, local asset wiring, timed clips, GSAP timeline registration, render.
   - Reads: Story and Screen Plan artifacts, `/hyperframes` routed docs.
   - Writes: `assets/asset-manifest.json`, asset files, composition files, `assembly-notes.md`, `assembly-checklist.md`, render MP4.
   - Gate 3 (mandatory): stop for user review; offer publish as-is, QA first, or revisions.

4. Optional: `docs/agents/04-qa.md`
   - Owns: final verdict, punch list, render/platform readiness, revision routing.
   - Runs only when the user chooses QA first, asks for readiness/punch-list review, or needs regression review — always as a fresh-context subagent.
   - Writes: `qa-report.md`, `qa-punch-list.md`, optionally `render-review.md` and `final-approval.md`.

R2/Repliz publish still requires explicit user approval and `--approved`.

## Skip Rules

Skipping is allowed only when the reason is explicit.

- Skip the visual step only when no visuals are needed and no URL/tool/product context needs visual support; still write `visual-plan.md` with `skip` decisions and a Gate 2 Result.
- Skip Build only when no HyperFrames composition is being created or changed.
- Skip QA by default. Run it only when the user chooses QA first, asks for readiness/punch-list review, or a regression review is needed.

Never skip Story for a new creative edit unless the user asks for a narrow technical operation.

## Fix Routing

Route revisions to the owner:

- Weak hook, wrong format, wrong CTA direction, rambling cut, missing context, rough jump cut, bad base audio edit, wrong speed or undocumented slower speed: Story.
- Caption wording, missing spoken words, ASR, phrase grouping, highlight logic, CTA text: Screen Plan (captions step).
- Visual at the wrong moment, missing URL/tool context, noisy motion, weak pattern interrupt, missing/inaudible SFX cue, overlay timing conflict: Screen Plan (visual step).
- Unreadable screenshot, bad generated asset, privacy issue in an asset, broken HyperFrames contract, missing media, track overlap, z-index, render failure: Build.
- Optional QA decision, punch list, regression review: QA.

## User Shortcuts

If the user says:

- `lanjut fase berikutnya` (or `lanjut agent berikutnya`): continue to the next numbered phase document.
- `cek cut dulu`: turn Gate 1 on for this video.
- `audit dulu`: inspect source/reference and produce evidence before changing files.
- `buat workflow`: create or update docs first; do not jump into editing.
- `render final`: run required technical checks, render, then stop at Gate 3.
- `publish final` or `publish as-is`: verify explicit user approval, then use `npm run repliz:publish -- --slug <videos/slug> --file <render.mp4> --approved`.
- `QA first`: run the QA phase as a fresh-context subagent, then return to Gate 3.
