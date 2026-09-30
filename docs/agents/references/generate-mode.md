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

- `research/request.json` (written by the Studio form, ADR-0026): every filled choice
  (`urls`, `repurpose`, `voice`, `duration`, `style`, `music`) is binding; an empty one
  (`null` / `[]`) is yours to decide. Research every URL it lists.
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

Every gate answer is recorded in `gates.json` (ADR-0026, RD-03-92). An answer typed into
the session by Studio ("Gate N disetujui dari Studio …", "Gate N revisi dari Studio: …")
is already recorded; an answer Dena gives in chat is recorded by you before you continue:
`npm run video -- gate <slug> approve <n> [--note "…"]`, `… revise <n> --note "…"`, or
`… qa 3`. `npm run video -- gate <slug>` prints where the project stands. The same rule
applies at Gate 2 and Gate 3. A Gate 3 approval ends the run: never publish to Repliz or
R2 from a generate session — Dena publishes from the Studio Results tab.

### 6. Brief Template (generate)

```md
# Creative Brief - <slug>

## Source

- Mode: generate (<format: explainer | kinetic-post | motion-short>)
- Research: research/brief.md, research/NN-<domain>.md, research/repurpose.md
- Target platform:
- Target duration: <explainer 30–90 s | kinetic-post 8–20 s | motion-short 15–40 s> — <why>

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
- format: <explainer | kinetic-post | motion-short> (keep the value the scaffold wrote; the gates follow it)
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

- Split the voiceover into scenes of 2–8 s by default, one idea or sentence each, with boundaries in
  the pauses between sentences (`words.json`). Scenes cover `0` to the end of the voiceover
  without gaps; neighbouring scenes may overlap 0.2–0.4 s for a transition.
- A continuous sequence may exceed 8 s when one shared diagram or causal action
  needs uninterrupted relationships. Write the rationale, timed information
  changes and quiet reading poses in the plan; repeating a static layout does
  not qualify. Keep the staged beats tied to the spoken meaning.
- Each scene stages the idea around a focal action and secondary response. A
  resolved diagram or important text may hold quietly for reading; no mandatory
  bobbing or perpetual movement. Record art direction and every boundary decision
  using `visual-planning.md`, including type/hero scale and phone-size checks.
- Accent styles take at most ±30% of the video. Two neighbouring scenes may share a style
  only with different patterns, unless they are one sequence (the same board continuing,
  a numbered series).
- Not applicable: "2 s of face between cutaways", cutaway ≤ 10 s, at most 3 types per video.
- Each scene is a Timeline row with a Style B-roll Brief (`styles/README.md`), treatment
  **`full`**. An optional `Example:` line names the closest style example, e.g.
  `wb-03-mind-map`. Prefer an example whose treatment is `cutaway` (full frame): split and
  panel examples show a placeholder face in the storyboard.
- In `overlay-timeline.json` a scene row has `type` = the style, `track` 4 or 7
  (alternating), `placement: "full"`, `assetRef` = the clip's Planned file, and
  `storyboardFrame` = a project-relative local PNG/JPEG/WebP depicting the
  intended scene's real text, artwork and layout, e.g.
  `preview/storyboard/scene-01.png`. `example` is optional stylistic annotation.
  For reference-only output, `exampleStill: n` selects a later example still
  (1-based, from the example's `stills` in `examples.json`).

### Music

Write `## Music` in `visual-plan.md`: one track from
`npm run music -- list --mood <mood>` (rejected tracks are hidden), the `from` second, and
why it fits the brief's emotional promise. SFX stay required as in edit mode.

### Storyboard and Gate 2 (always)

1. `storyboard.md`: one row per scene —
   `| # | time | spoken words | style / pattern | what appears | example | frame |`.
   Design an actual local frame for each row, with its own text, layout and
   artwork. A planning mockup can precede final animation. For complex
   continuity, optionally provide a short proxy animatic with locked audio.
2. `npm run video -- storyboard <slug>` → `preview/storyboard-sheet.jpg` (each scene's
   actual `storyboardFrame` with its number, time, optional reference and words).
   More than 28 scenes make `storyboard-sheet-1.jpg`, `-2.jpg`, … (numbers continue).
   It writes `preview/storyboard-evidence.json`: version 1, `kind: "actual"`,
   `timelineSha256`, `frames: [{id,path,sha256}]`, and `sheets: [{path,sha256}]`.
   Missing/invalid frames or paths outside the project fail; no library fallback.
   Every linked frame, timeline and sheet hash must still match at the gate.
   Both scene frames and completed JPG sheets must decode; matching hashes alone
   cannot certify broken image pixels. Successful decodes are cached by content
   hash and subprocess runner, and changed bytes are checked again.
3. Check triggers R1, R2, R5, R6 as in edit mode; R1's sources are `script.md ## Fakta`
   and `research/`. R3 and R4 do not apply.
4. Stop. Show Dena the sheet, `storyboard.md`, the style world, and the music. She
   approves or changes; record it in `## Gate 2 Result` and, when she answered in chat,
   with `npm run video -- gate <slug> approve 2` (or `revise 2 --note "…"`).

`npm run video -- storyboard <slug> --reference` is a separate planning aid:
it requires `example`, reuses/renders example stills, and writes explicitly
labelled `preview/storyboard-reference-sheet*.jpg`. It never writes actual
evidence or satisfies design approval. Legacy example-only production sheets
must be migrated: supply actual `storyboardFrame` paths, regenerate production
sheets/evidence, and obtain a new design approval. Old logs remain intact.

Design fingerprints include `storyboard.md`, all production sheets,
`overlay-timeline.json`, actual evidence/frames, `visual-plan.md` creative
content, and all present art-direction files (`art-direction/design.md`,
`art-direction.md`, `design.md`). Only the exact
`## Gate 1 Result` / `## Gate 2 Result` sections and their subsection content
are excluded from the plan hash. Other sections, including creative sections
named Result, remain covered. Timing, style, music selection or actual frame
changes reopen review; logging approval alone does not.

## Build (generate)

1. **Readiness.** `script.md`, `processed-audio.wav`, `processed-transcript.json`,
   `caption-beats.json`, `visual-plan.md` (with `## Style World`, `## Music`,
   `## Gate 2 Result`), `overlay-timeline.json`, `storyboard.md`, actual storyboard
   frames/sheets and current `preview/storyboard-evidence.json`. No `processed.mp4`.
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
   <slug>`, baseline temporal/audio preflight from `quality-gates.md`,
   `npm run video -- render <slug>`, **Gate 3** (record a chat answer with
   `npm run video -- gate <slug> approve|revise|qa 3`).

## Music-driven formats: kinetic-post and motion-short (ADR-0027)

`creative-brief.md` sets `- format: kinetic-post` or `- format: motion-short` (scaffold:
`npm run video -- new <slug> --generate --format <f>`). There is no voice: the cut music is
the time base, and there are **two gates** — Gate 1 (on-screen text + music + storyboard)
and Gate 2 (render). Everything above applies unless this section says otherwise.

| | kinetic-post | motion-short |
| --- | --- | --- |
| Length | 8–20 s | 15–40 s |
| Content | one idea, quote, or hook as kinetic type | 3–6 scenes (text + objects + numbers) |
| Words | 10–30 | at most 8 per state |
| End | loops: the last frame is the first frame's state; CTA only in `publish-captions.md` | a CTA card (non-promissory) in the last bar |
| Main style | usually `broll-text` (+ at most one accent) | a style world as for an explainer |

### Story (music formats)

1. Research as for an explainer. When `research/request.json` has `text` (Teks persis),
   use those words exactly: only split them into beat groups and choose the stressed word.
2. `script.md` holds the **on-screen text**, one line per beat or beat group (no
   narration); `## Fakta` still sources every number, name, price, result, or quote.
   kinetic-post: the payoff word lands on a downbeat, and the last line leads back into the
   first. motion-short: the last scene is the CTA card.
3. Music: pick a catalog track (`npm run music -- list --mood upbeat`, also `playful`,
   `tech-ringan`), then `npm run video -- music <slug> --track <id> --from <s> --bars <n>`
   (the command names the `--bars` range that fits). A duration in `request.json` cannot
   be hit exactly: pick the `--bars` whose length is closest. kinetic-post: prefer a
   multiple of 4 bars (a phrase), so the loop joins in the harmony as well as the beat.
   Reading pace is about one word or phrase per beat; when that is too fast, pick a slower
   track — never cram the text. Listen to the cut: when the command warns that the
   downbeats are uncertain or a bar is uneven, try another `--from` or another track.
4. No `video voice`, no `processed-transcript.json`, no Gate 1 stop here: continue to
   Screen Plan.
5. The brief follows the Brief Template with these changes: `## Hook` — the hook is the
   first beat group of `script.md`, and the hook window ends on the downbeat where that
   group lands (`beats.json`), not at a voice paragraph; `## Voice` becomes `## Music`
   (track, `--from`, bars, BPM, duration, loop yes/no). `## Script Summary` in
   `edit-decision-notes.md` lists the hook line, the open loop -> payoff (bar), the
   number of lines and words, the track and bars, and the facts count.

### Screen Plan (music formats)

- No caption rail and no `caption-beats.json`: the on-screen text is the content.
  `publish-captions.md` is still written (the kinetic-post CTA lives there).
- Scenes follow the bars in `beats.json`: every text line enters on a beat; scene changes
  and the payoff word land on downbeats.
- `storyboard.md`: `| # | bars | time | on-screen text | style / pattern | what appears | example | frame |`.
  Each scene row in `overlay-timeline.json` carries `text` (its on-screen words); then
  `storyboardFrame` links its actual local image; then `npm run video -- storyboard <slug>`.
- **Gate 1**: stop and show Dena `script.md`, the music (`processed-audio.wav`, track, BPM,
  bars), the storyboard sheet, `storyboard.md`, and the style world. Record a chat answer
  with `npm run video -- gate <slug> approve 1` (or `revise 1 --note "…"`).

### Build (music formats)

- Screen Plan records the approved text/music/storyboard in `## Gate 1 Result`
  of `visual-plan.md`. Build requires that result, `script.md`,
  `processed-audio.wav`, `beats.json`, `storyboard.md`, nonempty storyboard
  sheets and current actual evidence/frames, `publish-captions.md`, and
  `overlay-timeline.json`. It does not require
  `processed.mp4`, `voice/`, transcripts, caption-beats, or separate BGM.
- `processed-audio.wav` (the music) on track 10 is the only music: no `video bgm`, no
  ducking. SFX sparingly, only accents the music does not already hit.
- kinetic-post: the last frame returns to the first frame's state (an invisible loop), no
  fade to black. motion-short: the CTA card in the last bar while the music fades.
- Render → **Gate 2**; record a chat answer with
  `npm run video -- gate <slug> approve|revise|qa 2`. A Gate 2 approval ends the run: never
  publish.

For every generate format, each file a gate fingerprints must be a nonempty
regular file, including `storyboard.md` and every discovered storyboard sheet.
The final gate and Studio player select the same newest playable normal/blur render by
mtime; `<slug>.mp4` wins a tie. A changed selected file reopens final review.
Corrupt, empty or non-video files do not become review candidates. Build records
baseline full playback with audio, phone-size readability, boundaries and seek
checks, or an explicit incomplete-review note. Independent QA stays optional.

## QA (generate)

`qa-checklist.md` section Generate Mode lists what changes: every second is covered by a
scene; hidden-rail beats really are on screen in their scene; the voice is not sped up;
BGM is audible in pauses and sits under the voice; every on-screen fact has a `## Fakta`
source; the 1.2x, verbatim-transcript-hook, and face checks do not apply.
