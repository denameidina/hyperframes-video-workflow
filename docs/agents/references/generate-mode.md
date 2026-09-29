# Generate Mode (Motion Design Explainer)

Loaded by the "Mode generate" sections of `docs/agents/01-story.md`,
`02-screen-plan.md`, and `03-build.md` when `creative-brief.md` sets
`mode: generate`. Decision record: `internal/docs/adr/0025-generate-mode-explainer.md`;
requirements RD-03-75…RD-03-87 and RD-06-23…RD-06-28; spec
`docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md`.

A generate video has no footage of Dena. The script's voiceover is the time base
(`processed-audio.wav`, `processed-transcript.json`), and every second of the screen is
a motion-design scene from the style menu (`docs/agents/references/styles/README.md`).
Format: **explainer**, 30–90 s. Inputs: a topic or brief, a URL / article / thread, or a
repurposed older project (rewritten, read by TTS).

## What Changes Against Edit Mode

| Area | Edit mode | Generate mode |
| --- | --- | --- |
| Time base | `processed.mp4` from `video cut` | `processed-audio.wav` from `video voice` |
| Hook | verbatim transcript excerpt, `hook_end` from the cut | paragraph 1 of the approved script, `hook_end` = its end in `voice/voice-meta.json` |
| Speed | 1.2x default | no speed-up: the preset's own tempo (Supertonic `speed`, Gemini `style`); never `atempo` |
| Gate 1 | optional cut review | **mandatory**: script + voice |
| Captions | every spoken word on the rail | every word gets a beat; beats inside a scene that already shows those words get `"rail": "hidden"` |
| Visuals | b-roll between shots of Dena | scenes cover every second (style world) |
| Gate 2 | only on triggers R1–R6 | **always**: storyboard sheet; R3/R4 do not apply |
| Music | none by default | one ducked BGM track from `shared/music/` (`video bgm`) |
| Not used | – | `video cut`, `cut-list.json`, `cut-map.json`, `processed.mp4`, `mix-media`, `parallax-stage`, face rules |

## Story (generate)

### 0. Scaffold

`npm run video -- new <slug> --generate` (never the plain `new`: its starter binds a base
video to `processed.mp4`, and `--generate` refuses a folder that already exists). It
creates `research/`, an empty `sources.json`, the generate starter, and a brief stub with
`mode: generate`.

### 1. Research

- `research/brief.md`: Dena's brief, verbatim.
- `research/NN-<domain>.md` per URL: URL, retrieved date, the passages used, and what is
  worth capturing on screen (for a `vox` scene). Read the page yourself; never quote from
  memory.
- `research/repurpose.md`: the source slug and the path of its
  `processed-transcript.json` (or `transcripts/<id>.json`); the lines the new script
  draws on, with their times.

### 2. Direct

Decision Workflow in `hook-and-angle.md` (lane, premise, audience, emotional promise,
retention spine, visual grammar, non-promissory CTA); format `explainer`. Choose the
target duration (30–90 s) and write why in the brief. Word budget ±2.7 words/s:
30 s ≈ 80 words, 60 s ≈ 160, 90 s ≈ 240.

### 3. Script — `script.md`

```md
# Naskah - <slug>

<hook: paragraph 1>

<beat 2>

<beat 3 …>

<closing / non-promissory CTA>

## Fakta

- "<number, name, price, result, or quote exactly as in the script>" — <research/brief.md | research/NN-<domain>.md (URL) | videos/<old>/processed-transcript.json @ mm:ss>
```

- The narration is everything before the first `## ` heading; `## Fakta` and any later
  section are notes and are never read aloud (`scriptBody`).
- One paragraph per story beat, one idea each. Dena's register: gue/lo, jujur, ternyata,
  dari situ gue sadar; English tech terms stay English.
- **Paragraph 1 is the hook.** Stop-scroll test: its opening words grab a muted viewer.
  Watch-to-end test: it opens a loop whose payoff lands late. Write both in the brief.
- Every number, name, price, result, or quote has a `## Fakta` line with its source. No
  invented facts; never put a quote in a real person's mouth without a source.
- Inline Gemini tags are allowed (`<short pause>`, `<breath>`); Supertonic reads the
  pause tags as punctuation.
- Numbers may be written as digits (`Rp2,5 juta`, `70%`, `3x`); normalization reads them.
  A term the voice mispronounces goes into `config/pronunciation.json`, not the script.

### 4. Voice

`npm run video -- voice <slug> [--preset <p>]` (default: `config/voices.json` `default`).
It writes `voice/` (voiceover.wav, voice-meta.json, words.json, cache/),
`processed-audio.wav`, and `processed-transcript.json` in the edit-path schema, and sets
`data-duration` on every `data-voice-duration` element of `index.html`. A WER warning
names the words that were misread: fix the script or the lexicon and run it again
(unchanged paragraphs come from the cache).

### 5. Gate 1 — script + voice (mandatory)

Stop. Give Dena the script (`script.md`) and the voice (`processed-audio.wav`, its
duration, preset). Revisions: edit the script, run `video voice` again. Continue only
after she approves.

### 6. Brief Template (generate)

```md
# Creative Brief - <slug>

## Source

- Mode: generate (explainer)
- Research: research/brief.md, research/NN-<domain>.md, research/repurpose.md
- Target platform:
- Target duration: <30–90 s> — <why>

## Content Lane / Premise / Audience / Emotional Promise

<as in the edit template>

## Hook

Status: scripted

Hook text (paragraph 1):

Hook window (output): 00:00.00-<hook_end from voice/voice-meta.json paragraphs[0].end>

Stop-scroll reason (opening words):

Open loop:

Payoff (output timestamp + line):

## Story Spine

1. 0-hook_end:
2. …
5. Final CTA:

## Voice

- Preset: <name> (<provider>/<model>/<voice>)
- Duration: <s>, WER <x>

## Workflow Settings

- mode: generate
- visual_density: <light|medium|heavy> (default medium)

## User Approvals

- Facts, numbers, names, or quotes the user supplied for on-screen use:
- CTA promise approved by the user: <no | exact promise>
```

`metadata.json` records `"mode": "generate"` and the duration.
`edit-decision-notes.md` ends with:

```md
## Script Summary

- Hook (output 00:00.00-<hook_end>): "<paragraph 1>"
- Open loop -> payoff: <question> -> <output mm:ss.s, the line that closes it>
- Duration: <mm:ss> (<n> paragraphs, <n> words), preset <p> (<provider>/<model>)
- Alignment: WER <x>; words misread: <list or "none">
- Facts: see script.md ## Fakta (<n> facts, all sourced)
```

## Screen Plan (generate)

### Captions (hybrid)

Follow `captions.md` and `caption-artifacts.md` with these changes:

- Every word in `processed-transcript.json` `words` belongs to a beat.
- A beat inside a scene that already shows the same words (kinetic text, a quote) gets
  `"rail": "hidden"`: it stays in `caption-beats.json` and is not rendered on the rail.
  Default `rail` is `"shown"` (the field may be left out).
- The hook card uses paragraph 1 for `00:00.00-<hook_end>` from `creative-brief.md`.

### Style World

Write `## Style World` in `visual-plan.md`: one main style and its palette preset
(`.sk-pal-*` from the style's `## Look`), at most two accent styles, and why they fit the
topic. Look at the style's moodboard sheet and the asset-lib contact sheets as in edit
mode. `mix-media` and `parallax-stage` are not available (they need Dena's footage).

### Scenes

- Split the voiceover into scenes of 2–8 s, one idea or sentence each, with boundaries in
  the pauses between sentences (`words.json`). Scenes cover `0` to the end of the voiceover
  without gaps; neighbouring scenes may overlap 0.2–0.4 s for a transition.
- Every scene develops over its whole duration; nothing freezes after its entrance.
- Accent styles take at most ±30% of the video. Two neighbouring scenes may share a style
  only with different patterns, unless they are one sequence (the same board continuing,
  a numbered series).
- Not applicable: "2 s of face between cutaways", cutaway ≤ 10 s, at most 3 types per video.
- Each scene is a Timeline row with a Style B-roll Brief (`styles/README.md`), treatment
  **`full`**, and an `Example:` line: the id of the closest style example, e.g.
  `wb-03-mind-map`. Prefer an example whose treatment is `cutaway` (full frame): split and
  panel examples show a placeholder face in the storyboard.
- In `overlay-timeline.json` a scene row has `type` = the style, `track` 4 or 7
  (alternating), `placement: "full"`, `assetRef` = the clip's Planned file, and
  `example` = the example id.

### Music

Write `## Music` in `visual-plan.md`: one track from
`npm run music -- list --mood <mood>` (rejected tracks are hidden), the `from` second, and
why it fits the brief's emotional promise. SFX stay required as in edit mode.

### Storyboard and Gate 2 (always)

1. `storyboard.md`: one row per scene —
   `| # | time | spoken words | style / pattern | what appears | example |`.
2. `npm run video -- storyboard <slug>` → `preview/storyboard-sheet.jpg` (each scene's
   example still with its number, time, and words; styles without cached stills are
   rendered once with `npm run check:style-examples -- <style>`). More than 28 scenes
   make `storyboard-sheet-1.jpg`, `-2.jpg`, … (numbers continue).
3. Check triggers R1, R2, R5, R6 as in edit mode; R1's sources are `script.md ## Fakta`
   and `research/`. R3 and R4 do not apply.
4. Stop. Show Dena the sheet, `storyboard.md`, the style world, and the music. She
   approves or changes; record it in `## Gate 2 Result`.

## Build (generate)

1. **Readiness.** `script.md`, `processed-audio.wav`, `processed-transcript.json`,
   `caption-beats.json`, `visual-plan.md` (with `## Style World`, `## Music`,
   `## Gate 2 Result`), `overlay-timeline.json`, `storyboard.md`. No `processed.mp4`.
2. **Music.** `npm run video -- bgm <slug> --track <id> --from <s>` → `bgm.wav` (cut or
   looped to the voiceover, faded, about −30 LUFS, ducked under the voice) and `bgm.json`.
3. **Assets.** Library first (`vendor/asset-lib/`); a capture (`vox`) or Codex bitmap only
   when the library has nothing that fits, recorded as in edit mode.
4. **Scenes.** One clip per scene following the style's Build Recipe
   (`SK.clip(id, { T, update })`). A style example
   (`docs/agents/references/style-examples/<style>/compositions/<clip>.html`) is a starting
   point: copy it to the Planned file, rename the id, and replace every word and number
   with the script's. Mount it on track 4 or 7 (alternating) with class `broll`, id
   `broll-NN-name-mount`, `data-composition-id` = the clip id, and the scene's start and
   duration.
5. **Background.** Set `.bg-fill` to the style world's background colour.
6. **Captions.** Build rail captions from `caption-beats.json`, skipping beats with
   `"rail": "hidden"`; hook and CTA cards as in edit mode.
7. **Verify and render** as in edit mode: Still Check per scene, `npm run video -- check
   <slug>`, `npm run video -- render <slug>`, **Gate 3**.

## QA (generate)

`qa-checklist.md` section Generate Mode lists what changes: every second is covered by a
scene; hidden-rail beats really are on screen in their scene; the voice is not sped up;
BGM is audible in pauses and sits under the voice; every on-screen fact has a `## Fakta`
source; the 1.2x, verbatim-transcript-hook, and face checks do not apply.
