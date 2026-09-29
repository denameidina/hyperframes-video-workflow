# Phase 1 - Story

## Purpose

The Story phase decides what the video should become and produces the base cut
that every later phase builds on.

It inspects the source, transcribes it, chooses the angle, locks a verbatim
hook from the transcript (and decides where it ends), removes dead air and redundant speech,
applies the default `1.2x` speed, and writes `processed.mp4` with a cut plan that
later phases can trust.

This phase does not design captions, plan or produce visuals, author HyperFrames
compositions, or render the final video.

## When To Use

Use this phase when:

- Dena provides video/image sources for a project in `videos/<slug>/sources/`
  or `shared/` (one or many takes, B-roll, images; ADR-0022).
- Dena provides a reference video in `references/` and asks to adapt the style.
- A previous edit feels weak and needs a stronger angle or hook.
- The request is broad, such as "make this viral", "edit like this reference",
  "buat lebih cinematic", or "bikin orang stop scrolling".
- A rough cut needs silence, filler, and repeated words removed, or pacing/speed
  changed.
- Later phases need accurate timing, transcript, and processed base footage.

Do not use this phase for:

- Caption styling or caption typo fixes (Screen Plan).
- Visual, overlay, or motion work (Screen Plan, Build).
- Render/lint/debug tasks (Build).
- Edit-mode projects with no speech source at all (montage only): write a blocker
  note instead (RD-03-68). A video with no footage of Dena is generate mode (below).

## Mode generate

When `creative-brief.md` sets `mode: generate` (a project made with
`npm run video -- new <slug> --generate`), there is no footage to cut: this phase
researches, writes `script.md`, makes the voiceover with `npm run video -- voice <slug>`,
and stops at Gate 1 (script + voice, mandatory). Follow Story (generate) in
`docs/agents/references/generate-mode.md` instead of Steps 2 and 4–9 below; Step 1 (context) and Step 3
(direction, format `explainer`) still apply. The 1.2x speed, the verbatim transcript
hook, cuts, and `video cut` do not apply (ADR-0025, RD-03-75…81).

## Core Principles

### Direction

Dena's strongest social videos should feel like:

> A credible AI systems builder showing real founder/operator insight in a way that is direct, human, and scroll-stopping.

Protect this identity. Do not turn Dena into a generic motivational creator,
generic CapCut account, or copycat of a reference.

Reference styles are ingredients, not costumes.

### Cut

Cut for meaning first, rhythm second, speed third.

The goal is not to remove every breath. The goal is to make Dena sound sharp,
natural, and credible.

A good cut preserves:

- Dena's real voice
- The strongest insight
- Natural emotion
- Sentence meaning
- Proof moments
- Context needed for the hook and CTA

A bad cut creates:

- Robotic pacing
- Missing context
- Jump cuts that feel anxious
- Captions that no longer match speech
- A video that is shorter but less persuasive

## Inputs

- Sources: `videos/<slug>/sources.json` (project files in `sources/`, shared
  files in `shared/`), with Dena's optional role labels and notes
- Reference video: `references/<file>.mp4`, if any
- Existing `transcripts/`, `edit-decision-notes.md`, `cut-list.json`, or
  `processed.mp4` for the same slug
- User goal, such as "edit like Kumar", "make this more viral", "more
  cinematic", "cut silent/redundant words", "add hook, overlay, CTA"
- Target platform: Instagram Reels, TikTok, YouTube Shorts
- Optional constraints: target duration, speed multiplier, preserve a specific
  quote or moment, cut a specific section, keep original audio feel, no
  AI-generated faces, must include a specific CTA, draft only

## Steps

1. **Read context.** `docs/dena-social-video-style-guide.md`, the user request,
   reference notes, and existing artifacts for the slug. If a reference video
   exists, inspect it as evidence; do not infer from memory when a local file is
   available. If `videos/<slug>/` does not exist, run `npm run video -- new <slug>`.
   Files Dena names from `shared/` are attached with
   `npm run video -- sources <slug> --add-shared <a,b>`; roles/notes Dena gives in
   the prompt are written with `--set <id> --role <speech|broll> --note "<text>"`.
2. **Inventory and transcribe.** Run `npm run video -- sources <slug>`. Read
   `docs/agents/references/cut-and-pacing.md` sections Media Audit, Transcription
   Workflow, Source Roles, and Content Map. Transcribe every video source to
   `transcripts/<id>.json` (source timeline). For each source with role `auto`,
   decide `speech` (meaningful speech) or `broll` and record it with
   `npm run video -- sources <slug> --set <id> --role <r> --detected`, with the
   reason in `edit-decision-notes.md`. Never change a role marked `(user)`. If no
   speech source remains, stop and write a blocker note. Take one contact sheet per
   `broll` source and per image and write `## Source Inventory` in
   `creative-brief.md` (id, role, duration or size, what it shows, Dena's note).
   Write `metadata.json` (with `"sources": "sources.json"`).
3. **Direct.** Read `docs/agents/references/hook-and-angle.md` section Decision
   Workflow (and Kumar-Inspired Adaptation Rules when a reference calls for it).
   Choose content lane, premise, audience, emotional promise, retention spine,
   format, visual grammar, visual direction notes, and CTA from the transcript.
4. **Lock the hook.** Read `docs/agents/references/hook-and-angle.md` sections
   Transcript Hook and Hook Extraction. Rank at least three hook candidates and
   lock one verbatim excerpt starting at processed output `00:00.00`. You decide
   `hook_end`: the point where the hook's decision (tension, peak problem,
   contradiction, curiosity gap) lands. There is no fixed 3-second cap; take the
   shortest intact span that carries that decision, and write why it needs that
   length. The hook must pass the stop-scroll test (opening words grab muted)
   and the watch-to-end test (it opens a loop whose payoff lands late in the
   cut); record the open loop and payoff. If no intact phrase carries it, stop
   and ask the user; never fabricate or splice speech.
5. **Write the brief.** Use the Output Template in
   `docs/agents/references/hook-and-angle.md` to write `creative-brief.md`,
   including Workflow Settings `visual_density` and `gate_cut`. Check it against
   Quality Bar and Dena-Specific Guardrails in the same reference.
6. **Cut.** Read `docs/agents/references/cut-and-pacing.md` sections Cut
   Categories through Speed Rules and Edit Decision List. Write `cut-list.json`.
   Every segment names its `source` id; segments may come from any take in any
   order. When a line was recorded more than once, keep one take and log the
   others as `cut-retake` with the reason.
7. **Build the base video.** Run `npm run video -- cut <slug>`: it validates the
   cut-list, normalizes every take (1080×1920, 30 fps, −16 LUFS per source,
   15 ms fades) and writes `processed.mp4` and `cut-map.json`. Do not write your
   own ffmpeg cut. Check orientation with a frame grab of `processed.mp4`. Audio
   cleanup beyond that follows sections Processed Base Video and Audio Cleanup
   Handoff (`audio-clean.wav` when audio is cleaned separately). Then transcribe
   `processed.mp4` with the
   same Transcription Workflow and save it as `processed-transcript.json`: the
   processed-timeline word timing that Screen Plan uses.
8. **Write notes.** Use the Output Template in
   `docs/agents/references/cut-and-pacing.md` for `edit-decision-notes.md`, and
   end it with the Cut Summary below.
9. **Gate 1.** Apply Gate 1 below.

## Outputs

All in `videos/<slug>/`:

- `creative-brief.md` (hook `locked-from-transcript` with `hook_end`, `visual_density`, `gate_cut`)
- `metadata.json`
- `sources.json` (roles settled) and `transcripts/<id>.json` (source timelines)
- `processed-transcript.json` (processed timeline)
- `edit-decision-notes.md` (ends with `## Cut Summary`)
- `cut-list.json`
- `processed.mp4` and `cut-map.json` (from `video cut`)
- Conditional: `audio-clean.wav`, `preview/contact-sheet.jpg` or
  `preview/processed-sheet.jpg`

Leave enough information for another session to reproduce or revise the cut.

## Cut Summary

Append to `edit-decision-notes.md`:

```md
## Cut Summary

- Hook (output 00:00.00-<hook_end>): "<exact spoken quote>" (source <id> <mm:ss.s-mm:ss.s>)
- Hook length: <why the hook ends here: the decision it completes>
- Open loop -> payoff: <question the hook leaves open> -> <output mm:ss.s, line that closes it>
- Duration: <sum of speech sources mm:ss> -> <processed mm:ss> at <speed>x (<n> sources)
- Take choices: <line> - <id> used, <id> cut-retake - <why>
- Source Inventory: see creative-brief.md (<n> broll, <n> image)
- Removed:
  - <id> <source range>: <what was removed> - <why>
```

## Gate 1 - Cut Review (optional)

- Default: off.
- On only when the user asks ("cek cut dulu") or `creative-brief.md` sets
  `gate_cut: on`.
- When on: stop, show `processed.mp4` and the Cut Summary, and wait for the
  user's approval before Screen Plan starts.
- When off: write the Cut Summary and continue to
  `docs/agents/02-screen-plan.md`.

## Handoff

Hand off decisions, not tasks alone.

Bad handoff:

> Add cool overlays and make captions better.

Good handoff:

> Use `cinematic-operator` grammar. Keep captions sparse during the manifesto line. Add dashboard proof overlay only when Dena mentions workflow automation. Do not add random AI robot imagery. CTA should invite a comment without promising a future breakdown.

`edit-decision-notes.md` must give timing precise enough for caption and
visual work:

- final processed video path
- exact output duration
- transcript path
- processed-timeline word-level transcript path (`processed-transcript.json`)
- cut-list path
- three hook candidate timestamps
- locked hook quote, source timing, output timing (`hook_end`), length reason,
  transition, and original-occurrence handling
- key quote timestamps
- sections where captions need extra care
- sections where visuals should support meaning
- sections where ASR is uncertain

Bad handoff:

> I cut the boring parts. Captions can start now.

Good handoff:

> `processed.mp4` is 54.2s at 1.18x. The locked verbatim hook is source
> `00:42.1-00:44.7`, now output `00:00.0-00:02.6`; its original occurrence is
> removed and the explanation resumes at output `00:02.6`. ASR may confuse
> `Claude` with `cloud` at output `00:18.2`.

## Fix Routing

This phase owns: weak hook, wrong format, wrong CTA direction, rambling cut,
missing context, rough jump cut, bad base audio edit, wrong speed, or an
undocumented slower speed.

A change here invalidates Screen Plan outputs for the affected time ranges:
realign `caption-beats.json`, `visual-plan.md`, and `overlay-timeline.json` from
the new processed transcript before Build runs again.
