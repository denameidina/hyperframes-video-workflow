---
name: dena-video-editing-workflow
description: Use when planning, editing, assembling, reviewing, or rendering Dena Meidina social videos in this repository, especially raw videos, reference-video adaptation, captions, overlays, HyperFrames compositions, QA, render readiness, or platform publishing checks.
---

# Dena Video Editing Workflow

## Overview

Use this skill as the router for Dena Meidina social-video work in this project. It enforces the phase order in `docs/agents/`, the Dena style guide, HyperFrames composition rules, handoff artifacts, and the review gates. Decision record: `internal/docs/adr/0008-four-phase-workflow.md`.

## Start Here

Before any Dena video task:

1. Read `AGENTS.md`.
2. Read `docs/dena-social-video-style-guide.md`.
3. Identify the current phase.
4. Read that phase document in `docs/agents/` completely.
5. Read upstream artifacts in `videos/<slug>/`, not upstream phase documents.
6. Read a reference in `docs/agents/references/` only at the step that names it.
7. Produce the phase's output artifacts in `videos/<slug>/`.

For the full chain, gates, skip rules, and fix routing, read `references/phase-chain.md`.

For validation, QA, and render gates, read `references/quality-gates.md`.

## Phase Router

| User need | Phase |
| --- | --- |
| New project sources (one or many raw takes, B-roll, images), reference video, angle, hook, format, style adaptation, transcript, verbatim spoken hook and its length, silence/filler cuts, pacing, speed, processed base video | `docs/agents/01-story.md` |
| Captions, subtitles, verbatim hook card, phrase grouping, ASR correction, CTA text, publish captions | `docs/agents/02-screen-plan.md` (captions step) |
| Which moments get screenshots, b-roll, generated images/video, diagrams, stickers, proof cards; overlay timing, pattern interrupts, zooms, effects, transitions, SFX cues | `docs/agents/02-screen-plan.md` (visual step) |
| Capturing/generating asset files, `videos/<slug>/index.html`, `videos/<slug>/compositions/*.html`, timed clips, GSAP, HyperFrames assembly, render | `docs/agents/03-build.md` |
| Optional QA, punch list, render/platform readiness review, regression review | `docs/agents/04-qa.md` (fresh-context subagent) |
| Motion-design video with no footage of Dena, from a topic, brief, URL, article, thread, or a rewritten older video (generate mode: explainer, kinetic-post, motion-short) | `docs/agents/01-story.md` (Mode generate) with `docs/agents/references/generate-mode.md` |
| R2/Repliz auto publish after explicit user approval | `docs/repliz/integration-spec.md` |

Do not skip ahead unless the user explicitly requests a narrow technical fix and upstream decisions already exist.

## Lean Fixing Defaults

Use this when fixing a previous Dena edit, or when the user says the result was over-cut, captions drifted, or the process burned too much time/token.

- Do not rerun the full phase chain by default. Reuse existing artifacts, route only the broken part, and update downstream files that depend on it.
- Treat "boring motion", "too much transcript was cut", "needs non-slop assets", and "no sound effects" as one targeted revision path: keep the compact cut as the baseline when it feels denser, the Story phase restores only missing context, the Screen Plan phase plans local/manual explanatory assets plus purposeful motion and SFX timing, the Build phase produces and assembles them, and the QA phase re-verifies when the user chooses QA.
- Treat "captions skipped words" as a Screen Plan (captions step) bug by default. Regenerate or realign from the locked processed word-level transcript so every surviving spoken word is represented by active running captions.
- Default recut intensity is `light-medium`: remove long silence, heavy filler, and clear repetition only. Do not force a viral hard-cut unless the user asks for aggressive pacing.
- Lock the base cut before final captions. If `processed.mp4` changes, regenerate or realign `caption-beats.json` from the processed video instead of manually nudging old raw-timeline captions.
- If captions, assets, motion, or SFX feel out of sync after a compact recut, transcribe the locked processed audio and retime `caption-beats.json`, `overlay-timeline.json`, HTML clips, and SFX cues from the same cue map.
- If the user wants source code/editor footage visible as proof, keep overlays as compact callouts in unused top/side space. Do not use large privacy/context masks that hide the proof moment.
- If the user provides a link or the transcript names a tool/product/site, route to the Screen Plan phase (visual step) for web research/inspection and a planned local screenshot or screen-record capture; the Build phase captures it.
- If real captures do not explain the point well enough, use Codex/image generation for grounded bitmap stills or short support visuals instead of stiff filler cards.
- Preview with frame grabs/contact sheets first. Run full render only after cut, captions, and overlays look correct, then rerender only for blocker/major fixes.
- For Dena raw talking-head clips, preserve natural context without killing density. A compact 55-70s cut can beat a fuller 80-100s cut when the lesson still lands.
- If the user says SFX has no sound, verify both the solo SFX stem and the final render audio with a level scan. File existence is not enough; cues that peak too low are effectively missing.
- For transcript quality, use the project-local Whisper install in `vendor/whisper.cpp` with `ggml-large-v3-turbo.bin`; convert source audio to WAV first and pass an Indonesian/domain-term prompt.
- If a longer HyperFrames render stalls in default low-memory mode after passing check/snapshot review, retry the final render with `PRODUCER_LOW_MEMORY_MODE=false` and document the workaround in `render-notes.md`.
- When a session produces a workflow learning, update the relevant docs in the same turn; the project-local `.codex` Stop hook enforces this for learning prompts and workflow/config changes.
- Jangan pakai `data-media-start` pada elemen `<audio>` HyperFrames; klipnya jadi senyap
  di render. Potong file SFX-nya lebih dulu, lalu rujuk hasil potongannya.
- SFX di bawah suara tidak bisa diverifikasi dengan membandingkan level render vs
  `processed.mp4`. Render komposisi uji pendek berisi cue itu saja, lalu ukur.
- Untuk cover wajah anak: deteksi per-frame + anchor manual untuk bagian whip pan + satu
  cover kedua yang diam menutup posisi tujuan lompatan kamera. Verifikasi frame-demi-frame
  pada MP4 final, dengan detektor **dan** mata.
- If the user asks whether session learnings are already documented, treat that as a docs reconciliation task: verify the covered learnings and add or refine a concise docs note in the same turn before answering.

## Non-Negotiables

The verbatim transcript hook, 1.2x processed speed, and spoken-word captions
below apply to footage edits. Generate explainer uses the approved script's
first paragraph and TTS at its natural speed with hybrid captions; music
formats use on-screen text and beats, with no voice or caption rail. Follow
`docs/agents/references/generate-mode.md` for those branches.

- Use Indonesian by default and preserve Dena's natural register.
- Treat reference videos as ingredients, not costumes.
- Keep Dena positioned as a credible AI systems builder, senior developer, founder/operator.
- Every edited video opens with a contiguous, verbatim transcript excerpt that
  carries the core tension or peak problem at `00:00.00-<hook_end>`, followed by
  the explanation. The Story phase decides `hook_end` (where the hook's decision
  lands, no fixed 3-second cap) and documents the source move; the Screen Plan
  phase captions the same words for muted viewing.
- Default Dena storytelling/talking-head videos require running captions that cover every spoken word surviving the cut, not only highlight phrases.
- Default processed speed is `1.2x`; any lower speed needs a documented clarity/emotion exception.
- Keep captions readable on phone: short phrases, white/black base, selective yellow emphasis.
- Keep overlays purposeful: clarify, prove, reset attention, or transition. URL/tool/product mentions need researched/captured or generated context assets when they help viewer understanding.
- Visual plans for designed recuts must include purposeful, audible-but-under-speech SFX cues when transitions, proof reveals, or title hits need impact.
- CTA must be non-promissory unless the user explicitly approves a promise.
- Keep every layer editable until final render.
- For HyperFrames work, read `/hyperframes` and the routed HyperFrames skill before editing `.html`.
- After any video `.html` edit, run `npm run video -- check <slug>` (root template: `npm run check`) and fix errors before handoff. Never edit the root `index.html` for a video (ADR-0010).
- After final render, stop for user review (Gate 3 for edit/explainer, Gate 2 for music formats). Offer publish as-is, QA first, or revisions. Do not upload to R2 or schedule Repliz until the user explicitly approves.
- Repliz publish must use `--approved`; R2 uses Wrangler with `CLOUDFLARE_ACCOUNT_ID`, bucket from `R2_BUCKET`, and `https://<r2-public-domain>`.

## Handoff Contract

For a complete edit, the expected artifact chain is:

```text
Story:        videos/<slug>/creative-brief.md
              videos/<slug>/metadata.json
              videos/<slug>/sources.json
              videos/<slug>/transcripts/<id>.json
              videos/<slug>/processed-transcript.json
              videos/<slug>/edit-decision-notes.md   (ends with ## Cut Summary)
              videos/<slug>/cut-list.json
              videos/<slug>/processed.mp4
              videos/<slug>/cut-map.json
Screen Plan:  videos/<slug>/caption-plan.md
              videos/<slug>/caption-beats.json
              videos/<slug>/publish-captions.md
              videos/<slug>/visual-plan.md           (includes ## Gate 2 Result)
              videos/<slug>/overlay-timeline.json
Build:        videos/<slug>/assets/asset-manifest.json   (when assets exist)
              videos/<slug>/assembly-notes.md
              videos/<slug>/assembly-checklist.md
```

For a generate-mode video (ADR-0025) the chain is:

```text
Story:        creative-brief.md (mode: generate), metadata.json, research/, script.md (## Fakta),
              voice/, processed-audio.wav, processed-transcript.json,
              edit-decision-notes.md (ends with ## Script Summary)
Screen Plan:  caption-plan.md, caption-beats.json (rail), publish-captions.md,
              visual-plan.md (## Style World, ## Music, ## Gate 2 Result),
              overlay-timeline.json (scene rows: placement full, example),
              storyboard.md, preview/storyboard-sheet.jpg
Build:        bgm.wav, bgm.json, assets/asset-manifest.json (when assets exist),
              assembly-notes.md, assembly-checklist.md
```

Music formats (kinetic-post, motion-short, ADR-0027): Story writes `script.md` (on-screen
text) + `processed-audio.wav` + `beats.json` (`npm run video -- music`) instead of `voice/`
and `processed-transcript.json`; Screen Plan skips `caption-beats.json`; Build has no
`bgm.wav`; gates are 1 (text + music + storyboard) and 2 (render).

| Mode/format | Story time base | Screen Plan | Review gates |
| --- | --- | --- | --- |
| edit | sources/transcripts + cut artifacts + processed.mp4 | caption-plan/beats, publish-captions, visual-plan (`Gate 2 Result`), overlay-timeline | G1 optional cut; G2 on R1–R6; G3 render |
| generate/explainer | research, script, voice, processed-audio + processed-transcript | caption-plan/beats, publish-captions, visual-plan (`Gate 2 Result`), overlay-timeline, storyboard doc/sheets | G1 script/voice; G2 storyboard; G3 render |
| generate/kinetic-post or motion-short | research, screen text script, processed-audio + beats | publish-captions, visual-plan (`Gate 1 Result`), overlay-timeline, storyboard doc/sheets; no caption-beats | G1 text/music/storyboard; G2 render |

Build always writes assembly notes/checklist, assets/manifest when used, and
the render. Only explainer adds separate `bgm.wav` + `bgm.json`. Required gate
files must be nonempty regular files; final review uses the newest normal/blur
render (normal wins a timestamp tie).

Only create QA artifacts when the user chooses QA first or explicitly asks for QA. Only create `final-approval.md` after QA passes.

## If Inputs Are Missing

Do not invent missing upstream decisions.

- Missing direction, transcript, hook, or cut: run the Story phase.
- Missing caption timing or captions: run the Screen Plan phase (captions step).
- Missing `visual-plan.md` or its mode-specific gate result: run the Screen Plan phase (visual step).
- Missing assets, assembly notes, checklist, or render: run the Build phase.
- User chose QA first and QA evidence is missing: run the QA phase as a fresh-context subagent.

If the user asks for a narrow fix, document which upstream assumptions are being reused.
