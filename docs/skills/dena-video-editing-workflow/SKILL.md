---
name: dena-video-editing-workflow
description: Use when planning, editing, assembling, reviewing, or rendering Dena Meidina social videos in this repository, especially raw videos, reference-video adaptation, captions, overlays, HyperFrames compositions, QA, render readiness, or platform publishing checks.
---

# Dena Video Editing Workflow

## Overview

Use this skill as the router for Dena Meidina social-video work in this project. It enforces the `docs/agents/` sequence, Dena style guide, HyperFrames composition rules, handoff artifacts, and QA gates.

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
| Transcript, silence/filler cuts, pacing, processed base video | `docs/agents/02-transcript-cut-agent.md` |
| Captions, subtitles, hook text, phrase grouping, ASR correction | `docs/agents/03-caption-subtitle-agent.md` |
| Screenshots, b-roll, generated images/video, diagrams, stickers | `docs/agents/04-asset-generation-agent.md` |
| Overlay timing, pattern interrupts, zooms, effects, transitions | `docs/agents/05-motion-overlay-agent.md` |
| `index.html`, `compositions/*.html`, timed clips, GSAP, HyperFrames assembly | `docs/agents/06-hyperframes-assembly-agent.md` |
| Final review, punch list, render/platform readiness, approval | `docs/agents/07-qa-review-agent.md` |

Do not skip ahead unless the user explicitly requests a narrow technical fix and upstream decisions already exist.

## Lean Fixing Defaults

Use this when fixing a previous Dena edit, or when the user says the result was over-cut, captions drifted, or the process burned too much time/token.

- Do not rerun the full agent chain by default. Reuse existing artifacts, route only the broken part, and update downstream files that depend on it.
- Treat "boring motion", "too much transcript was cut", "needs non-slop assets", and "no sound effects" as one targeted revision path: keep the compact cut as the baseline when it feels denser, Agent 02 restores only missing context, Agent 04 creates local/manual explanatory assets when useful, Agent 05 adds purposeful motion plus SFX timing, Agent 06 assembles, and Agent 07 re-verifies.
- Default recut intensity is `light-medium`: remove long silence, heavy filler, and clear repetition only. Do not force a viral hard-cut unless the user asks for aggressive pacing.
- Lock the base cut before final captions. If `processed.mp4` changes, regenerate or realign `caption-beats.json` from the processed video instead of manually nudging old raw-timeline captions.
- If captions, assets, motion, or SFX feel out of sync after a compact recut, transcribe the locked processed audio and retime `caption-beats.json`, `overlay-timeline.json`, HTML clips, and SFX cues from the same cue map.
- If the user wants source code/editor footage visible as proof, keep overlays as compact callouts in unused top/side space. Do not use large privacy/context masks that hide the proof moment.
- Preview with frame grabs/contact sheets first. Run full render only after cut, captions, and overlays look correct, then rerender only for blocker/major fixes.
- For Dena raw talking-head clips, preserve natural context without killing density. A compact 55-70s cut can beat a fuller 80-100s cut when the lesson still lands.
- If the user says SFX has no sound, verify both the solo SFX stem and the final render audio with a level scan. File existence is not enough; cues that peak too low are effectively missing.
- For transcript quality, use the project-local Whisper install in `vendor/whisper.cpp` with `ggml-large-v3-turbo.bin`; convert source audio to WAV first and pass an Indonesian/domain-term prompt.
- If a longer HyperFrames render stalls in default low-memory mode after passing check/snapshot review, retry the final render with `PRODUCER_LOW_MEMORY_MODE=false` and document the workaround in `render-review.md`.
- When a session produces a workflow learning, update the relevant docs in the same turn; the project-local `.codex` Stop hook enforces this for learning prompts and workflow/config changes.
- If the user asks whether session learnings are already documented, treat that as a docs reconciliation task: verify the covered learnings and add or refine a concise docs note in the same turn before answering.

## Non-Negotiables

- Use Indonesian by default and preserve Dena's natural register.
- Treat reference videos as ingredients, not costumes.
- Keep Dena positioned as a credible AI systems builder, senior developer, founder/operator.
- Keep captions readable on phone: short phrases, white/black base, selective yellow emphasis.
- Keep overlays purposeful: clarify, prove, reset attention, or transition.
- Keep every layer editable until final render.
- For HyperFrames work, read `/hyperframes` and the routed HyperFrames skill before editing `.html`.
- After any `.html` edit, run `npm run check` and fix errors before handoff.

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
videos/<slug>/qa-report.md
videos/<slug>/qa-punch-list.md
videos/<slug>/final-approval.md
```

Only create asset artifacts when assets are needed. Only create `final-approval.md` after QA passes.

## If Inputs Are Missing

Do not invent missing upstream decisions.

- Missing direction: run Agent 01.
- Missing transcript/cut: run Agent 02.
- Missing caption timing: run Agent 03.
- Missing assets: run Agent 04 or mark assets unnecessary.
- Missing motion plan: run Agent 05.
- Missing assembly notes/checklist: run Agent 06.
- Missing QA evidence: run Agent 07.

If the user asks for a narrow fix, document which upstream assumptions are being reused.
