# Motion Quality Remediation Implementation Plan

> **For agentic workers:** Use the applicable execution workflow task-by-task;
> this session is explicitly authorized for parallel subagent implementation.

**Goal:** Close every motion-quality audit finding and deliver one richer proof video.

**Architecture:** Shared offline media validation/mastering supports atomic normal
and blur deliveries and gate readiness. Storyboard evidence is generated from actual
project frames and design fingerprints cover creative dependencies. Existing
approved narration drives a new, fully authored visual sequence.

**Tech Stack:** Node 22+ built-ins, FFmpeg/ffprobe, pinned HyperFrames 0.7.24,
local GSAP/motion/style/craft runtimes, Python asset tooling.

**Spec:** `internal/docs/requirements/rd-02-composition-render.md` RD-02-65–70;
RD-03-103–109; RD-06-33–35; ADR-0030; audit F01–F10.

## Global Constraints

- Preserve existing user configuration edits and old render masters.
- No paid APIs, upload, publishing, automatic user approval or voice regeneration.
- One final proof MP4, `videos/ai-agent-gagal-rich/renders/ai-agent-gagal-rich.mp4`.
- Actual project frames precede Build; user's requested final-only review applies to this revision.
- No local npm dependencies; deterministic time; meaningful offline regression tests.

## Review Focus

- Corrupt/newer MP4 must not become the selected final or overwrite a good master.
- Timing/style/music edits invalidate design approval, but adding Gate Result does not.
- Actual frame paths stay inside the project; missing/stale evidence must not become a reference fallback.
- Boundary frames and late→early seeks must match intended scene ownership and pose.
- Encoded AAC must satisfy its profile after mastering; blur encode settings remain explicit.

## Tasks and ownership

### 1. Render/media tooling — worker

Files: `scripts/lib/render-quality.mjs`, `scripts/render-quality.test.mjs`,
`scripts/render-blur.mjs`, `scripts/render-blur.test.mjs`, `scripts/video.mjs`,
`scripts/video.test.mjs`, render-related docs.

Interface: export `isPlayableRender(file, {run} = {})` for gate use; expose pending
delivery validation/mastering and quality receipts for the CLI. Return false for
invalid media, not merely nonempty files. Coordinate with gate worker before integration.

- [x] Add failing real-media/atomic-failure/profile tests and verify failures.
- [x] Implement probe/decode, profiles, encoded-audio measurement/mastering and atomic promotion.
- [x] Integrate normal/blur output and fixed high-quality final encode; run targeted tests.

### 2. Storyboard and gate dependencies — worker

Files: `scripts/lib/storyboard.mjs`, `scripts/lib/gates.mjs`, relevant generate/gate
tests; workflow references except central requirements/index.

Interface: each full scene row accepts `storyboardFrame`; production sheets require
actual local images. `runStoryboard({referenceOnly})` writes separate labelled
reference output when requested. Consume `isPlayableRender` from task 1.

- [x] Add failing actual-frame, path/staleness, normalized-plan and invalid-render tests.
- [x] Implement actual evidence manifest and fingerprints; keep result sections out of hashes.
- [x] Update workflow art-direction/continuity/holds/preflight documents; run targeted tests.

### 3. Rich proof composition — worker

Files owned exclusively: `videos/ai-agent-gagal-rich/` and its authored local assets/tools.
Consume approved script/audio/transcript from `videos/ai-agent-gagal/`; preserve originals.

- [x] Read Screen Plan then write actual art direction, storyboard/frames and handoff artifacts.
- [x] Author one coherent 49.8-second scene sequence with visual metaphor, part animation,
  connected transitions, kinetic type, depth, purposeful holds and material-specific sound.
- [x] Run project check and inspect actual frames/boundaries; prepare for the sole final render.

### 4. Integration and regression — parent

Files: central requirements/ADR/index, implementation/closure record, existing
Atelier generator/scene boundary and seek fixes, templates/runtime contract as needed.

- [x] Fix Atelier boundary/seek/material source and generator consistently; no second full render.
- [x] Integrate shared interfaces and review all diffs; run full tests and touched project checks.
- [x] Render the single proof, inspect final frames, audio/quality receipt, then deliver for user review.
- [x] Record closure evidence for F01–F10 and any remaining subjective listening/review limits.

The initial task requested local implementation and one reviewable video. The user subsequently authorized commit and push to main; shared code, workflow, docs and tracked audit evidence are included, while pre-existing user configuration edits and ignored video project/media stay local.

Historical verification: 462/462 tests pass; root/templates/Atelier/pilot checks completed; one 49.800s proof delivered at −16.04 LUFS / −3.33 dBTP. The user rejected that proof as stiff. Technical verification remains valid; visual acceptance is reopened in internal/docs/operations/motion-quality-remediation.md.

## Reference-driven revision after user rejection

Reference and analysis: `internal/docs/research/threads-motion-reference-2026-09-30.md`.
Requirements: RD-03-110–112. New proof: `videos/ai-agent-gagal-v2/`; keep the rejected
master intact. Reuse approved Story, voice, word timings and BGM byte-for-byte.

- [x] Retrieve the exact public Threads media, verify post identity/hash/stream,
  inspect time-ordered sequences and state playback/listening limits — parent + reference reviewer.
- [x] Rewrite original art direction, causal choreography, persistent-object
  transformations and full-word caption plan — parent, Screen Plan ownership.
- [x] Build original articulated character/material assets, actual layout frames,
  continuous motion, causal payloads and source action/seek checks — `motion_v2_build`.
  Ownership: new slug's composition/authoring/visual assets/assembly/source evidence.
- [x] Produce action-timed speech-safe local SFX stem/provenance/level checks —
  `motion_v2_sound`, ownership `assets/sfx/` + its synthesis tool only.
- [x] Inspect phone-size action sequences and code/temporal correctness; fix
  concrete visual findings before one final production render — parent + fresh reviewer.
- [x] Deliver one new proof with encoded media receipt, final motion samples and
  explicit unverified listening limits; leave aesthetic acceptance for user review — parent.

These workers share the workspace and preserve others' edits. No paid generation,
publish, recut, extra proof renders or invented gate approval is authorized.

V2 delivery: one 49.800 s, 1080×1920 / 30 fps MP4, −16.16 LUFS / −3.50 dBTP;
all encoded receipt checks pass. Parent inspected105 decoded frames in13 temporal
sheets and confirmed source freeze/previous-master preservation. Full audiovisual
playback/manual listening were not performed. User aesthetic review remains open.
