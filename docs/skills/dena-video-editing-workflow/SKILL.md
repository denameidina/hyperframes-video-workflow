---
name: dena-video-editing-workflow
description: Use when planning, editing, assembling, reviewing, or rendering Dena Meidina social videos in this repository, especially raw videos, reference-video adaptation, captions, overlays, HyperFrames compositions, QA, render readiness, or platform publishing checks.
---

# Dena Video Editing Workflow

## Overview

Use this skill as the router for Dena Meidina social-video work in this project. It enforces the `docs/agents/` sequence, Dena style guide, HyperFrames composition rules, handoff artifacts, and optional QA review gate.

## Start Here

Before any Dena video task:

1. Read `AGENTS.md`.
2. Read `docs/dena-social-video-style-guide.md`.
3. Identify the current workflow stage.
4. Read the matching agent file in `docs/agents/` completely.
5. Read required upstream artifacts listed by that agent.
6. Produce the expected handoff files in `videos/<slug>/`.

For the full chain and routing table, read `references/agent-chain.md`.

For validation, QA, and render gates, read `references/quality-gates.md`.

## Stage Router

Use exactly the agent that owns the current decision:

| User need | Agent |
| --- | --- |
| New raw/reference video, angle, hook, format, style adaptation | `docs/agents/01-creative-director.md` |
| Transcript, three-second spoken hook selection/reorder, silence/filler cuts, pacing, processed base video | `docs/agents/02-transcript-cut-agent.md` |
| Captions, subtitles, verbatim hook card, phrase grouping, ASR correction | `docs/agents/03-caption-subtitle-agent.md` |
| Screenshots, b-roll, generated images/video, diagrams, stickers | `docs/agents/04-asset-generation-agent.md` |
| Overlay timing, pattern interrupts, zooms, effects, transitions | `docs/agents/05-motion-overlay-agent.md` |
| `index.html`, `compositions/*.html`, timed clips, GSAP, HyperFrames assembly | `docs/agents/06-hyperframes-assembly-agent.md` |
| Optional QA, punch list, render/platform readiness review, regression review | `docs/agents/07-qa-review-agent.md` |
| R2/Repliz auto publish after explicit user approval | `docs/repliz/integration-spec.md` |

Do not skip ahead unless the user explicitly requests a narrow technical fix and upstream decisions already exist.

## Lean Fixing Defaults

Use this when fixing a previous Dena edit, or when the user says the result was over-cut, captions drifted, or the process burned too much time/token.

- Do not rerun the full agent chain by default. Reuse existing artifacts, route only the broken part, and update downstream files that depend on it.
- Treat "boring motion", "too much transcript was cut", "needs non-slop assets", and "no sound effects" as one targeted revision path: keep the compact cut as the baseline when it feels denser, Agent 02 restores only missing context, Agent 04 creates local/manual explanatory assets when useful, Agent 05 adds purposeful motion plus SFX timing, Agent 06 assembles, and Agent 07 re-verifies.
- Treat "captions skipped words" as a Caption Agent bug by default. Regenerate or realign from the locked processed word-level transcript so every surviving spoken word is represented by active running captions.
- Default recut intensity is `light-medium`: remove long silence, heavy filler, and clear repetition only. Do not force a viral hard-cut unless the user asks for aggressive pacing.
- Lock the base cut before final captions. If `processed.mp4` changes, regenerate or realign `caption-beats.json` from the processed video instead of manually nudging old raw-timeline captions.
- If captions, assets, motion, or SFX feel out of sync after a compact recut, transcribe the locked processed audio and retime `caption-beats.json`, `overlay-timeline.json`, HTML clips, and SFX cues from the same cue map.
- If the user wants source code/editor footage visible as proof, keep overlays as compact callouts in unused top/side space. Do not use large privacy/context masks that hide the proof moment.
- If the user provides a link or the transcript names a tool/product/site, route to Agent 04 for web research/inspection and local screenshot or screen-record capture before motion planning.
- If real captures do not explain the point well enough, use Codex/image generation for grounded bitmap stills or short support visuals instead of stiff filler cards.
- Preview with frame grabs/contact sheets first. Run full render only after cut, captions, and overlays look correct, then rerender only for blocker/major fixes.
- For Dena raw talking-head clips, preserve natural context without killing density. A compact 55-70s cut can beat a fuller 80-100s cut when the lesson still lands.
- If the user says SFX has no sound, verify both the solo SFX stem and the final render audio with a level scan. File existence is not enough; cues that peak too low are effectively missing.
- For transcript quality, use the project-local Whisper install in `vendor/whisper.cpp` with `ggml-large-v3-turbo.bin`; convert source audio to WAV first and pass an Indonesian/domain-term prompt.
- If a longer HyperFrames render stalls in default low-memory mode after passing check/snapshot review, retry the final render with `PRODUCER_LOW_MEMORY_MODE=false` and document the workaround in `render-review.md`.
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

- Use Indonesian by default and preserve Dena's natural register.
- Treat reference videos as ingredients, not costumes.
- Keep Dena positioned as a credible AI systems builder, senior developer, founder/operator.
- Every edited video opens with a contiguous, verbatim transcript excerpt that
  carries the core tension or peak problem at `00:00.00-00:03.00`, followed by
  the explanation; Agent 02 documents the source move and Agent 03 captions the
  same words for muted viewing.
- Default Dena storytelling/talking-head videos require running captions that cover every spoken word surviving the cut, not only highlight phrases.
- Default processed speed is `1.2x`; any lower speed needs a documented clarity/emotion exception.
- Keep captions readable on phone: short phrases, white/black base, selective yellow emphasis.
- Keep overlays purposeful: clarify, prove, reset attention, or transition. URL/tool/product mentions need researched/captured or generated context assets when they help viewer understanding.
- Motion plans for designed recuts must include purposeful, audible-but-under-speech SFX cues when transitions, proof reveals, or title hits need impact.
- CTA must be non-promissory unless the user explicitly approves a promise.
- Keep every layer editable until final render.
- For HyperFrames work, read `/hyperframes` and the routed HyperFrames skill before editing `.html`.
- After any `.html` edit, run `npm run check` and fix errors before handoff.
- After final render, stop for user review. Offer publish as-is, QA first, or revisions. Do not upload to R2 or schedule Repliz until the user explicitly approves.
- Repliz publish must use `--approved`; R2 uses Wrangler with `CLOUDFLARE_ACCOUNT_ID`, bucket from `R2_BUCKET`, and `https://<r2-public-domain>`.

## Handoff Contract

For a complete edit, the expected artifact chain is:

```text
videos/<slug>/creative-brief.md
videos/<slug>/edit-decision-notes.md
videos/<slug>/caption-plan.md
videos/<slug>/caption-beats.json
videos/<slug>/publish-captions.md
videos/<slug>/asset-plan.md
videos/<slug>/asset-manifest.json
videos/<slug>/motion-plan.md
videos/<slug>/overlay-timeline.json
videos/<slug>/assembly-notes.md
videos/<slug>/assembly-checklist.md
```

Only create asset artifacts when assets are needed. Only create QA artifacts when the user chooses QA first or explicitly asks for QA. Only create `final-approval.md` after QA passes.

## If Inputs Are Missing

Do not invent missing upstream decisions.

- Missing direction: run Agent 01.
- Missing transcript/cut: run Agent 02.
- Missing caption timing: run Agent 03.
- Missing assets: run Agent 04 or mark assets unnecessary.
- Missing motion plan: run Agent 05.
- Missing assembly notes/checklist: run Agent 06.
- User chose QA first and QA evidence is missing: run Agent 07.

If the user asks for a narrow fix, document which upstream assumptions are being reused.
