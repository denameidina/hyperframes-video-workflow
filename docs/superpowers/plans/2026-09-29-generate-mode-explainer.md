# Generate Mode (Explainer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude/Codex can make a 30–90 s motion-design explainer with no footage of Dena — from a topic, a URL, or a rewritten older video — through the same 4-phase workflow: script + TTS voice (Gate 1), a style-world storyboard (Gate 2), and a render (Gate 3).

**Architecture:** `mode: generate` in `creative-brief.md` branches each phase document into `docs/agents/references/generate-mode.md`. Small tools make the time base and the review material: `video new --generate` (a starter without base video), `video voice` (script → `processed-audio.wav` + `processed-transcript.json` in the edit-path schema), `video bgm` (a ducked music bed), and `video storyboard` (a Gate 2 sheet from style-example stills). Library code lives in `scripts/lib/{generate,bgm,storyboard}.mjs`; `scripts/video.mjs` only dispatches.

**Tech Stack:** Node 22+ built-ins only (`node:util` `parseEnv`, `node:fs`, `node:child_process`, `node:test`), ffmpeg (no `drawtext` on this Mac), HyperFrames 0.7.24 (`snapshot` renders the storyboard sheet), the voice adapter and music library from sub-project 1.

**Spec:** `docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md` (amended in Task 1).

## Global Constraints

- No npm dependencies (ADR-0007). ES modules, 2-space indent, single quotes, semicolons; libs in `scripts/lib/`, tests `scripts/*.test.mjs`.
- Generate voiceovers are never sped up (no 1.2x, no `atempo`); tempo comes from the preset.
- Starter tracks: voiceover `processed-audio.wav` track 10, BGM `bgm.wav` track 9, scenes alternate tracks 4 and 7, captions 2/8, hook/CTA 5, progress 3.
- `data-voice-duration` marks every element whose `data-duration` equals the voiceover length (root, both audio elements, progress).
- BGM: target −30 LUFS (gain clamped −30…+20 dB), fade in 0.5 s / out 1.5 s, loop crossfade 1 s, `sidechaincompress` threshold 0.05, ratio 8, attack 20 ms, release 400 ms, `apad` on both inputs + final `atrim` to the voiceover duration; output 48 kHz stereo `pcm_s16le`.
- Storyboard: scene rows are `overlay-timeline.json` elements with `placement: "full"`, each with `example`; stills come from `renders/style-examples/<style>/frame-NN-at-<t>s.png` (made by `npm run check:style-examples -- <style>`); the sheet is HTML (4 columns, 240×427 tiles, 104 px labels, Plus Jakarta Sans) snapshotted by `npx --yes hyperframes@0.7.24 snapshot --at 0.5`; child processes run without `GEMINI_API_KEY`.
- `script.md` narration = text before the first `## ` section; `## Fakta` is never read aloud.
- Files are written as `.part` then renamed.
- Docs in Indonesian EARS; RD-03-75…87 and RD-06-23…28; touched docs in the same commit as their code (Task 1 writes the contracts first).
- Do not call Repliz or upload to R2. The only paid calls are Gemini TTS calls, and only if a Gemini preset is chosen (the default is `supertonic-f2`).

## Spec amendments (recorded in Task 1)

All verified in a scratch copy of the repo (test:voice 41, test:video 49, all other suites unchanged) and by a real smoke run (`new --generate` → Supertonic `voice` → `bgm` → `storyboard` → two example scenes → lint 0/0, validate clean → render 1080×1920 at −16.1 LUFS):

- ffmpeg has no `drawtext` here: the sheet is HTML + `hyperframes snapshot`.
- Stills reuse `renders/style-examples/<style>/` from `check:style-examples`.
- `script.md` narration ends at the first `## ` section.
- Alignment normalizes word groups (≤ 3 words); WER on the F2 test voiceover fell 0.043 → 0.021.
- `video voice` reads `.env` with `parseEnv` into its own env copy.
- `data-voice-duration` marker; progress reads the root's `data-duration`.
- `new --generate` still writes an empty `sources.json`.
- Prefer `cutaway` examples; `inspect` overflow from example clips is a per-scene Build fix.
- `apad` + `atrim` make the ducked BGM exact and byte-identical run to run (±8 dB duck measured).

## File Structure

| File | Responsibility |
| --- | --- |
| `docs/agents/references/generate-mode.md` | The generate-mode contract for Story, Screen Plan, Build, QA |
| `internal/docs/adr/0025-generate-mode-explainer.md` | Decision record |
| `scripts/lib/voice/script.mjs`, `scripts/lib/voice/align.mjs` | Narration rule; grouped alignment |
| `templates/dena-generate/index.html`, `hyperframes.json` | Starter without base video |
| `scripts/lib/generate.mjs` | Brief stub, `syncDuration`, `transcriptFromVoice`, `voiceStep` |
| `scripts/lib/bgm.mjs` | `bgmCopies`, `bgmGain`, `bgmArgs`, `runBgm` |
| `scripts/lib/storyboard.mjs` | `sceneRows`, `exampleStill`, `findFrame`, `spokenIn`, `sheetHtml`, `runStoryboard` |
| `scripts/video.mjs` | `new --generate`, `voice`, `bgm`, `storyboard` dispatch |
| `scripts/generate-lib.test.mjs`, `scripts/generate.test.mjs` | Library and CLI tests (in `test:video`) |

---

### Task 1: Docs first — ADR-0025, RD-03-75…87, RD-06-23…28, generate-mode reference, phase sections

**Files:**
- Modify: `docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md` (append amendments)
- Create: `internal/docs/adr/0025-generate-mode-explainer.md`, `docs/agents/references/generate-mode.md`
- Modify (by script): `internal/docs/requirements/rd-03-video-editing-workflow.md`, `internal/docs/requirements/rd-06-audio.md`, `docs/agents/01-story.md`, `02-screen-plan.md`, `03-build.md`, `04-qa.md`, `docs/agents/references/caption-artifacts.md`, `motion-grammar.md`, `docs/skills/dena-video-editing-workflow/SKILL.md`, `docs/dena-social-video-style-guide.md`, `CLAUDE.md`, `AGENTS.md`, `internal/docs/architecture/data-model.md`, `stack.md`, `internal/docs/design-system/visual-system.md`, `internal/docs/frontend/composition-implementation.md`, `internal/docs/operations/video-editing-workflow.md`, `runbook.md`, `internal/docs/adr/0023-voice-adapter-tts.md`, `internal/docs/README.md`

**Interfaces:**
- Produces: the contract every later task implements (RD ids, file formats, commands).

- [ ] **Step 1: Append the amendments to the spec**

Append this section to the end of `docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md`:

```md
## Amandemen saat planning (2026-09-29, hasil spike)

Semua butir di bawah diverifikasi di salinan repo sebelum plan
`docs/superpowers/plans/2026-09-29-generate-mode-explainer.md` ditulis. Smoke nyata
(`new --generate` → `voice` Supertonic → `bgm` → `storyboard` → dua scene contoh →
lint/validate bersih → render 1080×1920, audio −16,1 LUFS) lulus.

1. **ffmpeg lokal tanpa `drawtext`** (build Homebrew tanpa libfreetype). Storyboard sheet
   dirakit sebagai halaman HTML (grid still + label, font OFL Plus Jakarta Sans dari
   asset-lib) lalu di-snapshot `hyperframes snapshot`, dan PNG-nya dikonversi ke JPG.
   Area label per tile 104 px.
2. **Still contoh** memakai hasil `npm run check:style-examples -- <style>` yang sudah ada
   di `renders/style-examples/<style>/frame-NN-at-<t>s.png` (bukan cache terpisah
   `renders/storyboard-cache/`); gaya yang still-nya belum ada di-render sekali.
3. **Narasi `script.md` berakhir di section `## ` pertama** (`scriptBody`): `## Fakta` dan
   catatan lain tidak pernah dibacakan TTS; baris judul `# ` dibuang; `#1`/`#AI` tetap.
4. **Alignment per kelompok kata** (maksimal 3 kata; perluasan dua kata hanya bila
   pasangan itu sendiri tidak berubah bentuk ucapannya). Timing di dalam kelompok dibagi
   rata. Pada voiceover F2 naskah uji, WER turun 0,043 → 0,021.
5. **`video voice` membaca `.env` dengan `parseEnv`** ke salinan env-nya sendiri; `process.env`
   dan proses anak HyperFrames tidak berubah.
6. **Penanda `data-voice-duration`**: `video voice` mengisi `data-duration` elemen bertanda
   (di luar komentar HTML); tween progress membaca `data-duration` root lewat DOM.
7. **`video new --generate` tetap menulis `sources.json` kosong**, supaya gambar/B-roll Dena
   bisa dilampirkan (Studio membaca manifest yang sama).
8. **`example` sebaiknya contoh bertreatment `cutaway`** (full frame): contoh `split`/`panel`
   menampilkan wajah placeholder di sheet.
9. **`inspect` bisa melaporkan overflow dari klip contoh** (lapisan kamera `wb-01-flow` lebih
   besar dari frame). Itu urusan klip per scene di Build (perbaiki, atau tandai
   `data-layout-allow-overflow` bila disengaja); starter generate sendiri bersih.
10. **BGM:** `apad` di kedua input + `atrim` akhir membuat `sidechaincompress` berhenti tepat
    di durasi voiceover dan hasilnya identik antar-run (tanpa itu durasinya berubah-ubah).
    Ducking terukur ±8 dB (−30,2 → −37,8 LUFS pada voiceover 35 s).
11. **Test:** `scripts/generate-lib.test.mjs` (fungsi murni) dan `scripts/generate.test.mjs`
    (CLI) masuk `npm run test:video`.
12. **Nomor kriteria:** RD-03-75…RD-03-87 dan RD-06-23…RD-06-28 (+ rumusan RD-06-02).
```

- [ ] **Step 2: Create ADR-0025**

Create `internal/docs/adr/0025-generate-mode-explainer.md`:

```md
# ADR-0025 Mode generate: video explainer motion design dari naskah + TTS
Status: accepted
Date: 2026-09-29

## Context

Workflow 4 fase (ADR-0008) hanya mengedit footage Dena: Story memotong
`processed.mp4`, Screen Plan menaruh caption dan b-roll di atasnya, Build memasang base
video. Dena ingin Claude/Codex juga menghasilkan video motion design dari tujuh style yang
ada (ADR-0012…0015), tanpa footage, dari topik/brief, URL/artikel/thread, atau repurpose
video lama. Sub-proyek 1 (ADR-0023/0024) menyediakan adapter suara dan pustaka musik.

## Decision

- **Mode di dalam workflow yang sama.** `creative-brief.md` `## Workflow Settings` punya
  `mode: generate` (default `edit`); tiap dokumen fase punya bagian "Mode generate" yang
  merujuk `docs/agents/references/generate-mode.md`. Tidak ada dokumen fase terpisah, tidak
  ada orkestrator satu perintah.
- **Naskah + TTS adalah sumbu waktu.** Story menulis `script.md` (paragraf 1 = hook,
  `## Fakta` bersumber), lalu `npm run video -- voice <slug>` menghasilkan
  `processed-audio.wav` dan `processed-transcript.json` dengan skema jalur edit, sehingga
  caption dan Build memakai konvensi yang sama. Repurpose = tulis ulang + TTS.
- **Tanpa percepatan.** Voiceover generate diputar pada tempo preset; 1,2x dan `atempo`
  tidak berlaku.
- **Gate 1 wajib** (naskah + suara) dan **Gate 2 selalu berhenti** dengan storyboard sheet
  (`npm run video -- storyboard <slug>`: still contoh style per scene, dirakit di HTML dan
  di-snapshot HyperFrames karena ffmpeg lokal tanpa `drawtext`).
- **Caption hybrid:** setiap kata punya beat; beat di scene yang sudah menampilkan kata itu
  diberi `"rail": "hidden"`.
- **Style world + scene penuh:** satu style utama + palet, maksimal 2 aksen (±30% durasi),
  scene 2–8 s menutup setiap detik, treatment `full`, field `example`.
- **Starter `templates/dena-generate/`** (`video new <slug> --generate`): tanpa base video,
  voiceover di track 10, BGM di track 9, scene bergantian di track 4 dan 7, elemen bertanda
  `data-voice-duration` diselaraskan `video voice`.
- **BGM:** `npm run video -- bgm <slug> --track <id> [--from <s>]` memotong/meloop track
  `shared/music/`, fade, −30 LUFS, lalu ducking `sidechaincompress` dengan voiceover sebagai
  key → `bgm.wav` deterministik + `bgm.json`.

## Consequences

- Video generate tidak punya `processed.mp4`, `cut-list.json`, `cut-map.json`; `mix-media`
  dan `parallax-stage` tidak tersedia; aturan wajah (R3/R4) tidak berlaku.
- `video voice` membaca `.env` ke salinan env-nya sendiri (`parseEnv`), bukan ke
  `process.env`, supaya proses anak HyperFrames tidak mewarisi key.
- Alignment kata dinormalisasi per kelompok kata ("Rp 2.500", "2,5 jt", "50 %"); timing
  di dalam kelompok dibagi rata.
- Storyboard sheet memakai still contoh (look), bukan isi asli; isi asli baru terlihat di
  render Gate 3.

## Referensi

- Spec: `docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md`
- Kriteria: [RD-03-75…RD-03-87](../requirements/rd-03-video-editing-workflow.md),
  [RD-06-23…RD-06-28](../requirements/rd-06-audio.md)
- Kode: `scripts/lib/generate.mjs`, `scripts/lib/bgm.mjs`, `scripts/lib/storyboard.mjs`,
  `templates/dena-generate/`
```

- [ ] **Step 3: Create the generate-mode reference**

Create `docs/agents/references/generate-mode.md`:

````md
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
   rendered once with `npm run check:style-examples -- <style>`).
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

Add to `qa-checklist.md`: every second is covered by a scene; hidden-rail beats really are
on screen in their scene; the voice is not sped up; BGM is audible in pauses and sits
under the voice; every on-screen fact has a `## Fakta` source.
````

- [ ] **Step 4: Apply the requirement and document edits**

Save as `/tmp/gen-task1.py` and run `python3 /tmp/gen-task1.py` from the repo root. Every edit asserts its anchor exists exactly once. Expected output: `generate docs ok`.

````python
# Task 1 docs edits for generate mode (run from the repo root). Each edit asserts its anchor exists exactly once.
import re

def edit(path, old, new, count=1):
    s = open(path).read()
    assert s.count(old) == count, f'{path}: expected {count} match(es) for {old[:60]!r}, got {s.count(old)}'
    open(path, 'w').write(s.replace(old, new))

GM = '`docs/agents/references/generate-mode.md`'
# --- requirements (EARS) ---
edit('internal/docs/requirements/rd-03-video-editing-workflow.md', '  dan menulis `cut-map.json`.\n\n## Referensi',
     '  dan menulis `cut-map.json`.\n\n## Mode generate (ADR-0025)\n\n- **RD-03-75** (Event-driven) — When `npm run video -- new <slug> --generate` dijalankan,\n  the CLI shall membuat `videos/<slug>/` dari `templates/dena-generate/`, beserta\n  `research/`, `sources.json`, dan `creative-brief.md` yang memuat `mode: generate`.\n- **RD-03-76** (Unwanted) — If `videos/<slug>/` sudah ada, then `video new --generate`\n  shall menolak tanpa mengubah file apa pun.\n- **RD-03-77** (State-driven) — While `creative-brief.md` memuat `mode: generate`, fase\n  Story shall menyimpan bahan di `research/` (brief verbatim; per URL: URL, tanggal ambil,\n  kutipan; repurpose: slug + path transkrip sumber) dan menulis `script.md` dengan\n  paragraf 1 sebagai hook dan `## Fakta` setelah narasi.\n- **RD-03-78** (Unwanted) — If sebuah angka, nama, harga, hasil, atau kutipan di narasi\n  `script.md` tidak punya sumber di `## Fakta`, then fase Story shall tidak masuk Gate 1.\n- **RD-03-79** (Ubiquitous) — Voiceover mode generate shall diputar pada tempo preset;\n  percepatan 1,2x dan `atempo` tidak diterapkan.\n- **RD-03-80** (Event-driven) — When `script.md` dan suaranya ada, fase Story shall\n  berhenti di Gate 1 dan lanjut hanya setelah Dena menyetujui naskah dan suara.\n- **RD-03-81** (Ubiquitous) — Di mode generate, `hook_end` shall sama dengan\n  `paragraphs[0].end` di `voice/voice-meta.json` dan tercatat sebagai Hook window di\n  `creative-brief.md`.\n- **RD-03-82** (Ubiquitous) — Di mode generate, setiap kata `processed-transcript.json`\n  shall masuk satu beat caption; beat di dalam scene yang sudah menampilkan kata yang sama\n  memakai `"rail": "hidden"` dan tidak dirender di rail.\n- **RD-03-83** (Ubiquitous) — Di mode generate, fase Screen Plan shall menulis\n  `## Style World` (satu style utama + palet, maksimal 2 aksen) dan baris scene\n  (`placement: "full"`, track 4/7 bergantian, `example`) yang menutup `0` sampai akhir\n  voiceover tanpa celah, masing-masing 2–8 s, dengan style aksen maksimal 30% durasi.\n- **RD-03-84** (Event-driven) — When baris scene sudah ada, fase Screen Plan shall menulis\n  `storyboard.md`, menjalankan `npm run video -- storyboard <slug>`, dan berhenti di Gate 2\n  untuk persetujuan Dena, terlepas ada pemicu R1–R6 atau tidak.\n- **RD-03-85** (Unwanted) — If `overlay-timeline.json` tidak ada atau sebuah baris scene\n  tidak punya `example`, then `video storyboard` shall gagal dengan pesan yang menyebut\n  fase pemiliknya atau id barisnya.\n- **RD-03-86** (Event-driven) — When `video storyboard` berjalan, the CLI shall memakai\n  still ter-cache di `renders/style-examples/<style>/`, me-render still sebuah style hanya\n  bila ada yang hilang, dan menulis `preview/storyboard-sheet.jpg` berisi nomor scene,\n  waktu, id contoh, dan kata yang diucapkan, tanpa `GEMINI_API_KEY` di env proses anak.\n- **RD-03-87** (Ubiquitous) — Di mode generate, fase Build shall tidak memasang base\n  video, mewarnai `.bg-fill` dengan latar style world, memutar `processed-audio.wav`\n  (track 10) dan `bgm.wav` (track 9), dan memasang scene di track 4 dan 7.\n\n## Referensi')
edit('internal/docs/requirements/rd-03-video-editing-workflow.md', '- Keputusan: [ADR-0008](../adr/0008-four-phase-workflow.md) (menggantikan\n  [ADR-0005](../adr/0005-seven-agent-workflow-discipline.md))\n',
     '- Keputusan: [ADR-0008](../adr/0008-four-phase-workflow.md) (menggantikan\n  [ADR-0005](../adr/0005-seven-agent-workflow-discipline.md)); mode generate:\n  [ADR-0025](../adr/0025-generate-mode-explainer.md), `docs/agents/references/generate-mode.md`\n')
edit('internal/docs/requirements/rd-06-audio.md', '- **RD-06-02** (Event-driven) — When adapter menyintesis naskah, the adapter shall memecah\n  paragraf di baris kosong lalu menormalisasi tiap paragraf',
     '- **RD-06-02** (Event-driven) — When adapter menyintesis naskah, the adapter shall mengambil\n  narasi (teks sebelum section `## ` pertama, tanpa baris judul `# ` dan komentar HTML),\n  memecah paragraf di baris kosong lalu menormalisasi tiap paragraf')
edit('internal/docs/requirements/rd-06-audio.md', '## Referensi\n\n- Studio (tab Suara, Musik)',
     '## Mode generate (ADR-0025)\n\n- **RD-06-23** (Event-driven) — When `npm run video -- voice <slug>` dijalankan, the CLI\n  shall membaca narasi `script.md`, menyintesisnya dengan `--preset` atau `default` di\n  `config/voices.json` lewat `renderVoice` ke `voice/`, lalu menulis `processed-audio.wav`\n  dan `processed-transcript.json` (`segments` = paragraf, `words` = `words.json`) dengan\n  skema jalur edit.\n- **RD-06-24** (Event-driven) — When `index.html` ada, `video voice` shall mengisi\n  `data-duration` setiap elemen bertanda `data-voice-duration` (di luar komentar HTML)\n  dengan durasi voiceover.\n- **RD-06-25** (Unwanted) — If `script.md` tidak ada, tidak ada preset (`--preset` kosong\n  dan `default` null), atau preset-nya `recorded`, then `video voice` shall gagal sebelum\n  sintesis dan menyebut langkah yang perlu dilakukan.\n- **RD-06-26** (Event-driven) — When `npm run video -- bgm <slug> --track <id> [--from <s>]`\n  dijalankan, the CLI shall memotong track mulai `from`, meloop-nya dengan crossfade 1 s\n  bila lebih pendek dari voiceover, fade in 0,5 s dan fade out 1,5 s, mengatur loudness ke\n  −30 LUFS (gain dijepit −30…+20 dB), dan men-duck-nya di bawah `processed-audio.wav`\n  dengan `sidechaincompress` (threshold 0,05, ratio 8, attack 20 ms, release 400 ms), lalu\n  menulis `bgm.wav` (48 kHz stereo, tepat sepanjang voiceover) dan `bgm.json`.\n- **RD-06-27** (Unwanted) — If `processed-audio.wav` tidak ada, atau track-nya `rejected`,\n  lisensinya di luar allowlist, atau gagal `music check`, then `video bgm` shall gagal\n  tanpa menulis `bgm.wav`.\n- **RD-06-28** (Ubiquitous) — `video bgm` shall deterministik: input yang sama menghasilkan\n  `bgm.wav` yang identik byte per byte.\n\n## Referensi\n\n- Studio (tab Suara, Musik)')


# --- phase documents ---
edit('docs/agents/01-story.md', """- Projects with no speech source at all (montage only): write a blocker note
  instead (RD-03-68).""", """- Edit-mode projects with no speech source at all (montage only): write a blocker
  note instead (RD-03-68). A video with no footage of Dena is generate mode (below).""")
edit('docs/agents/01-story.md', """## Core Principles
""", f"""## Mode generate

When `creative-brief.md` sets `mode: generate` (a project made with
`npm run video -- new <slug> --generate`), there is no footage to cut: this phase
researches, writes `script.md`, makes the voiceover with `npm run video -- voice <slug>`,
and stops at Gate 1 (script + voice, mandatory). Follow Story (generate) in
{GM} instead of Steps 2 and 4–9 below; Step 1 (context) and Step 3
(direction, format `explainer`) still apply. The 1.2x speed, the verbatim transcript
hook, cuts, and `video cut` do not apply (ADR-0025, RD-03-75…81).

## Core Principles
""")
edit('docs/agents/02-screen-plan.md', """## Core Principles
""", f"""## Mode generate

When `creative-brief.md` sets `mode: generate`, follow Screen Plan (generate) in
{GM} alongside the steps below: hybrid captions (`"rail": "hidden"`
for beats a scene already shows), a `## Style World`, scenes that cover every second
(treatment `full`, `example`), `## Music`, and `storyboard.md` +
`npm run video -- storyboard <slug>`. Gate 2 always stops for Dena's approval; R3 and R4
do not apply (ADR-0025, RD-03-82…86).

## Core Principles
""")
edit('docs/agents/03-build.md', """## Core Principle
""", f"""## Mode generate

When `creative-brief.md` sets `mode: generate`, follow Build (generate) in
{GM}: readiness without `processed.mp4`,
`npm run video -- bgm <slug> --track <id> --from <s>` before assembly, one `SK.clip` per
scene mounted on tracks 4 and 7, `.bg-fill` in the style world colour, and rail captions
without the `"rail": "hidden"` beats. Verification, render, and Gate 3 are unchanged
(ADR-0025, RD-03-87).

## Core Principle
""")
edit('docs/agents/04-qa.md', """- `processed.mp4`, separate audio, the rendered MP4, and any preview keyframes
""", f"""- `processed.mp4`, separate audio, the rendered MP4, and any preview keyframes
- Generate mode: `script.md`, `processed-audio.wav`, `bgm.wav`, `storyboard.md`, and
  QA (generate) in {GM}
""")

# --- references ---
edit('docs/agents/references/caption-artifacts.md', """- `sourceWords` covering the exact processed transcript word range
- `notes`
""", """- `sourceWords` covering the exact processed transcript word range
- `notes`
- `rail` (generate mode only, optional): `"shown"` (default) or `"hidden"` for a beat
  whose words a scene already shows on screen (`generate-mode.md`)
""")
edit('docs/agents/references/motion-grammar.md', """- `purpose`
- `notes`
""", """- `purpose`
- `notes`
- generate mode scene rows also use `placement: "full"` and carry `example`, the id of
  the style example the scene leans on (`generate-mode.md`)
""")

# --- skill router + handoff ---
S = 'docs/skills/dena-video-editing-workflow/SKILL.md'
edit(S, """| R2/Repliz auto publish after explicit user approval | `docs/repliz/integration-spec.md` |""", f"""| Motion-design video with no footage of Dena, from a topic, brief, URL, article, thread, or a rewritten older video (generate mode) | `docs/agents/01-story.md` (Mode generate) with {GM} |
| R2/Repliz auto publish after explicit user approval | `docs/repliz/integration-spec.md` |""")
edit(S, """Build:        videos/<slug>/assets/asset-manifest.json   (when assets exist)
              videos/<slug>/assembly-notes.md
              videos/<slug>/assembly-checklist.md
```
""", """Build:        videos/<slug>/assets/asset-manifest.json   (when assets exist)
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
""")

# --- style guide ---
edit('docs/dena-social-video-style-guide.md', """4. Optional at user review/publish gate: `04-qa.md` - QA, punch list, render/platform readiness review.
""", f"""4. Optional at user review/publish gate: `04-qa.md` - QA, punch list, render/platform readiness review.

Generate mode (ADR-0025): a motion-design explainer with no footage of Dena. The script's
TTS voice is the time base and is never sped up to 1.2x; the hook is paragraph 1 of the
script Dena approved at Gate 1; captions are hybrid; one style world with scenes over
every second; a ducked BGM track. Rules: {GM}.
""")

# --- CLAUDE.md / AGENTS.md ---
for f in ('CLAUDE.md', 'AGENTS.md'):
    edit(f, """- CTA must be non-promissory by default. Do not imply "gue akan kirim/bahas/share source later" unless the user explicitly asks for that promise.
""", f"""- CTA must be non-promissory by default. Do not imply "gue akan kirim/bahas/share source later" unless the user explicitly asks for that promise.
- Generate mode (ADR-0025, `mode: generate`): a motion-design explainer from a topic, URL, or rewritten older video, with no footage of Dena. The hook is paragraph 1 of the script Dena approved at Gate 1 (script + voice); the TTS voiceover is never sped up to 1.2x; captions are hybrid (every word, hidden on the rail where a scene already shows it); Gate 2 always stops with the storyboard sheet. Rules: {GM}.
""")
    edit(f, """- New project sources (one or many raw takes, B-roll, images), reference video,""", """- A motion-design video with no footage of Dena (topic, brief, URL, article, thread, rewritten older video): Story in generate mode (`docs/agents/references/generate-mode.md`).
- New project sources (one or many raw takes, B-roll, images), reference video,""")
    edit(f, """npm run music -- check                                   # files, sha256, license allowlist, license proofs
""", """npm run music -- check                                   # files, sha256, license allowlist, license proofs
npm run video -- new <slug> --generate      # generate mode: starter without base video, research/, brief stub (ADR-0025)
npm run video -- voice <slug> [--preset <p>]  # script.md -> voiceover, processed-audio.wav, processed-transcript.json
npm run video -- bgm <slug> --track <id> [--from <s>]  # shared/music track -> ducked bgm.wav + bgm.json
npm run video -- storyboard <slug>          # Gate 2 sheet from each scene's style example -> preview/storyboard-sheet.jpg
""")

# --- internal docs ---
D = 'internal/docs/architecture/data-model.md'
edit(D, """| Katalog musik | `shared/music/catalog.json` + `licenses/` (di-ignore) | JSON | `npm run music`, Studio |
""", """| Katalog musik | `shared/music/catalog.json` + `licenses/` (di-ignore) | JSON | `npm run music`, Studio |
| Naskah (generate) | `videos/<slug>/script.md`, `research/` | Markdown | Story (mode generate) |
| Storyboard (generate) | `videos/<slug>/storyboard.md`, `preview/storyboard-sheet.jpg` | Markdown + JPG | Screen Plan (mode generate) |
| BGM (generate) | `videos/<slug>/bgm.wav`, `bgm.json` | WAV + JSON | Build (`npm run video -- bgm`) |
""")
edit(D, """## Komposisi HyperFrames (`videos/<slug>/index.html`)
""", """## Mode generate (ADR-0025)

- `creative-brief.md` `## Workflow Settings` `mode: generate` (default `edit`); Hook
  `Status: scripted` dengan `hook_end` = `voice/voice-meta.json` `paragraphs[0].end`;
  bagian `## Voice` (preset, provider, model).
- `research/`: `brief.md` (verbatim), `NN-<domain>.md` (URL, tanggal ambil, kutipan),
  `repurpose.md` (slug + path transkrip sumber).
- `script.md`: narasi = teks sebelum section `## ` pertama (paragraf 1 = hook);
  `## Fakta` memberi sumber tiap angka, nama, harga, hasil, atau kutipan.
- `processed-transcript.json` versi generate:
  `{ source: "voice/voiceover.wav", model: "<provider>/<model>/<voice>", language: "id", note, segments: [{ start, end, text }], words: [{ start, end, text }] }`
  (`segments` = paragraf).
- `caption-beats.json`: field opsional `rail` = `"shown"` (default) | `"hidden"`.
- `overlay-timeline.json`: baris scene `placement: "full"`, `track` 4/7, `example`
  (id contoh style, mis. `wb-03-mind-map`).
- `storyboard.md`: `| # | time | spoken words | style / pattern | what appears | example |`;
  `preview/storyboard-sheet.jpg` dari `npm run video -- storyboard`.
- `bgm.json`: `{ version: 1, track, file, sha256, from, duration, copies, gainDb, duck: { threshold, ratio, attack, release } }`, di samping `bgm.wav`.

## Komposisi HyperFrames (`videos/<slug>/index.html`)
""")
edit('internal/docs/design-system/visual-system.md', """| 6 | Label/sticker kecil (varian track kontekstual) | `.label-card`, `.sticker` |
""", """| 6 | Label/sticker kecil (varian track kontekstual) | `.label-card`, `.sticker` |
| 7 | Mix-media: lapisan depan `.broll-front`; mode generate: scene (bergantian dengan track 4) | `.broll` |
| 9 | Mode generate: BGM ter-duck (`bgm.wav`) | `#bgm-audio` |
""")
edit('internal/docs/frontend/composition-implementation.md', """## Aturan implementasi
""", """## Starter generate (`templates/dena-generate/index.html`, ADR-0025)

- Dibuat oleh `npm run video -- new <slug> --generate`. Tanpa `#base-video`; `.bg-fill`
  diwarnai latar style world oleh Build.
- `#voice-audio` (`processed-audio.wav`, track 10), `#bgm-audio` (`bgm.wav`, track 9),
  `#progress` (track 3). Elemen bertanda `data-voice-duration` diselaraskan ke durasi
  voiceover oleh `npm run video -- voice`.
- Tween progress membaca `data-duration` root lewat DOM (bukan jam), jadi tetap
  deterministik.
- Scene: mount `.broll` bergantian di track 4 dan 7; caption, hook/CTA card, dan SFX sama
  dengan starter edit.

## Aturan implementasi
""")
edit('internal/docs/operations/video-editing-workflow.md', """## Gate review/publish
""", """## Mode generate (ADR-0025)

Video motion design tanpa footage Dena (`mode: generate`, dibuat
`npm run video -- new <slug> --generate`). Story: `research/` → `script.md` (paragraf 1 =
hook, `## Fakta`) → `npm run video -- voice <slug>` → **Gate 1 wajib** (naskah + suara).
Screen Plan: caption hybrid, `## Style World`, scene penuh, `## Music`, `storyboard.md` +
`npm run video -- storyboard <slug>` → **Gate 2 selalu**. Build: `npm run video -- bgm`,
satu `SK.clip` per scene di track 4/7, render → Gate 3. Tanpa percepatan 1,2x. Detail:
`docs/agents/references/generate-mode.md`,
[rd-03](../requirements/rd-03-video-editing-workflow.md) RD-03-75…87.

## Gate review/publish
""")
edit('internal/docs/operations/runbook.md', """## Suara (TTS)
""", """## Mode generate (explainer tanpa footage)

[ADR-0025](../adr/0025-generate-mode-explainer.md); alur per fase di
`docs/agents/references/generate-mode.md`.

```bash
npm run video -- new <slug> --generate                 # starter generate + research/ + brief mode: generate
npm run video -- voice <slug> [--preset <p>]           # script.md -> processed-audio.wav + processed-transcript.json
npm run video -- storyboard <slug>                     # Gate 2 sheet -> preview/storyboard-sheet.jpg
npm run video -- bgm <slug> --track <id> --from <s>    # BGM ter-duck -> bgm.wav + bgm.json
```

## Suara (TTS)
""")
edit('internal/docs/architecture/stack.md', """; `layers` menyiapkan sumber + subjek parallax |""", """; `layers` menyiapkan sumber + subjek parallax; mode generate: `new --generate`, `voice`, `bgm`, `storyboard` ([ADR-0025](../adr/0025-generate-mode-explainer.md)) |""")
edit('internal/docs/adr/0023-voice-adapter-tts.md', """- Alignment menormalisasi per kata, jadi ungkapan yang terpisah spasi ("Rp 2.500",
  "2,5 jt", "50 %") belum bertemu bentuk ucapannya: WER naik dan peringatan RD-06-10 bisa
  muncul palsu. Diperbaiki (normalisasi per paragraf + peta offset) sebelum sub-proyek 2
  memakai `words.json` untuk caption. Jam ("10.30") dan "M" setelah angka dibaca harfiah;
  tulis sebagai kata atau tambahkan ke leksikon.""", """- Alignment menormalisasi per kelompok kata (sejak ADR-0025): ungkapan yang terpisah
  spasi ("Rp 2.500", "2,5 jt", "50 %", "3 - 5") bertemu bentuk ucapannya; timing di dalam
  kelompok dibagi rata. Jam ("10.30") dan "M" setelah angka dibaca harfiah; tulis sebagai
  kata atau tambahkan ke leksikon.""")

# --- README index ---
R = 'internal/docs/README.md'
edit(R, """Pustaka BGM `shared/music/`: allowlist lisensi (cc0, public-domain, pixabay, mixkit), katalog + bukti lisensi, tab Studio Musik.
""", """Pustaka BGM `shared/music/`: allowlist lisensi (cc0, public-domain, pixabay, mixkit), katalog + bukti lisensi, tab Studio Musik.
0. [adr/0025-generate-mode-explainer.md](adr/0025-generate-mode-explainer.md) - Mode generate: explainer motion design dari naskah + TTS (tanpa footage), Gate 1/2 wajib, storyboard sheet, BGM ter-duck, starter `dena-generate`.
""")
lines = open(R).read().split('\n')
n = 0
for i, l in enumerate(lines):
    if re.match(r'^\d+\. \[', l):
        n += 1
        lines[i] = re.sub(r'^\d+\.', f'{n}.', l, count=1)
open(R, 'w').write('\n'.join(lines))
edit(R, '| Keputusan arsitektur | [adr/](adr/) (0001–0024) |', '| Keputusan arsitektur | [adr/](adr/) (0001–0025) |')
print('generate docs ok')
````

- [ ] **Step 5: Check the index**

Run: `python3 -c "import re;l=[x for x in open('internal/docs/README.md').read().split(chr(10)) if re.match(r'^\d+\. \[',x)];print(len(l), l[48][:40])"`
Expected: `59 49. [adr/0025-generate-mode-explainer.md]`

- [ ] **Step 6: Commit**

```bash
git add docs internal CLAUDE.md AGENTS.md
git commit -m "docs: ADR-0025 generate mode, RD-03-75..87, RD-06-23..28, generate-mode reference"
```

### Task 2: Narration ends at `## `; grouped alignment

**Files:**
- Modify: `scripts/lib/voice/script.mjs`, `scripts/lib/voice/align.mjs`, `scripts/voice-text.test.mjs`, `scripts/voice-align.test.mjs`

**Interfaces:**
- Produces: `scriptBody(md)` returns only the narration (before the first `## ` section); `spokenGroups(words) → [{ from, to, tokens }]` (exported); `alignWords` unchanged signature, now group-aware (timing inside a group split evenly).

- [ ] **Step 1: Write the failing tests**

Replace `scripts/voice-text.test.mjs` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLexicon, normalizeForSpeech, readNumber, terbilang } from './lib/voice/normalize.mjs';
import { forProvider, scriptBody, scriptWords, splitParagraphs, stripTags } from './lib/voice/script.mjs';
import { voiceRoot } from './voice-fixtures.mjs';

test('terbilang reads Indonesian integers', () => {
  const cases = [[0, 'nol'], [1, 'satu'], [10, 'sepuluh'], [11, 'sebelas'], [12, 'dua belas'], [19, 'sembilan belas'], [20, 'dua puluh'], [21, 'dua puluh satu'], [100, 'seratus'], [110, 'seratus sepuluh'], [250, 'dua ratus lima puluh'], [1000, 'seribu'], [1500, 'seribu lima ratus'], [2026, 'dua ribu dua puluh enam'], [100000, 'seratus ribu'], [1000000, 'satu juta'], [2500000, 'dua juta lima ratus ribu'], [3000000000, 'tiga miliar']];
  for (const [n, w] of cases) assert.equal(terbilang(n), w, String(n));
  assert.throws(() => terbilang(-1), /out of range/);
});

test('readNumber handles thousands dots and decimals', () => {
  assert.equal(readNumber('2.500.000'), 'dua juta lima ratus ribu');
  assert.equal(readNumber('2,5'), 'dua koma lima');
  assert.equal(readNumber('2,75'), 'dua koma tujuh lima');
  assert.equal(readNumber('0,05'), 'nol koma nol lima');
  assert.equal(readNumber('1.2'), 'satu koma dua');
  assert.equal(readNumber('70'), 'tujuh puluh');
  assert.equal(readNumber('1.2.3'), '1.2.3');
});

test('normalizeForSpeech rewrites money, percent, units, multipliers, ordinals, ranges, and plain numbers', () => {
  const n = (t) => normalizeForSpeech(t);
  assert.equal(n('Biayanya Rp2,5 jt per bulan.'), 'Biayanya dua koma lima juta rupiah per bulan.');
  assert.equal(n('Harganya Rp2.500.000.'), 'Harganya dua juta lima ratus ribu rupiah.');
  assert.equal(n('Cuma Rp 50rb!'), 'Cuma lima puluh ribu rupiah!');
  assert.equal(n('Naik 70% dalam 3x percobaan.'), 'Naik tujuh puluh persen dalam tiga kali percobaan.');
  assert.equal(n('Omzet 2,5 M setahun'), 'Omzet dua koma lima miliar setahun');
  assert.equal(n('Butuh 3-5 hari, bukan 3–5 minggu.'), 'Butuh tiga sampai lima hari, bukan tiga sampai lima minggu.');
  assert.equal(n('Ini yang ke-3 kalinya di 2026.'), 'Ini yang ketiga kalinya di dua ribu dua puluh enam.');
  assert.equal(n('Pakai v3 dan 4K'), 'Pakai v3 dan 4K');
  assert.equal(n('Tunggu <short pause> 3 detik.'), 'Tunggu <short pause> tiga detik.');
  assert.equal(n('Cuma 1rb, ongkir Rp1rb.'), 'Cuma seribu, ongkir seribu rupiah.');
  assert.doesNotThrow(() => n('Kode 1234567890123456-2 lalu 9999999999999999-3.'));
  assert.equal(n('Yang ke-12345678901234567.'), 'Yang ke-12345678901234567.');
});

test('the lexicon replaces whole words, only for the listed providers', () => {
  const lexicon = [{ term: 'CRM', say: 'si ar em', only: ['supertonic'] }, { term: 'Nafanesia', say: 'nafa nesia' }];
  assert.equal(normalizeForSpeech('CRM Nafanesia, bukan CRMX.', { lexicon, provider: 'supertonic' }), 'si ar em nafa nesia, bukan CRMX.');
  assert.equal(normalizeForSpeech('CRM Nafanesia.', { lexicon, provider: 'gemini' }), 'CRM nafa nesia.');
  const root = voiceRoot();
  assert.deepEqual(loadLexicon(root), []);
  writeFileSync(join(root, 'config/pronunciation.json'), JSON.stringify({ version: 1, entries: [{ term: 'CRM' }] }));
  assert.throws(() => loadLexicon(root), /needs "term" and "say"/);
});

test('script helpers: body, paragraphs, tags per provider, caption words', () => {
  const md = '# Naskah uji\n\nJujur, gue kira <short pause> gampang.\n\n<!-- catatan -->\nTernyata   susah.\n';
  const body = scriptBody(md);
  assert.deepEqual(splitParagraphs(body), ['Jujur, gue kira <short pause> gampang.', 'Ternyata susah.']);
  assert.equal(stripTags('Jujur, gue kira <short pause> gampang.'), 'Jujur, gue kira gampang.');
  assert.equal(forProvider('Jujur, gue kira <short pause> gampang. <long pause> Oke <laugh> ya.', 'supertonic'), 'Jujur, gue kira, gampang. Oke ya.');
  assert.equal(forProvider('A <breath> B', 'gemini'), 'A <breath> B');
  assert.deepEqual(scriptWords(body), ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.']);
  assert.deepEqual(splitParagraphs(scriptBody('# Judul\n\n#1 masalahnya: #AIagent itu mahal.\n')), ['#1 masalahnya: #AIagent itu mahal.']);
  const script = '# Naskah - demo\n\nHook dulu.\n\nIsi kedua.\n\n## Fakta\n\n- "Rp2,5 juta" — research/brief.md\n\n## Catatan\n\nbukan narasi\n';
  assert.deepEqual(splitParagraphs(scriptBody(script)), ['Hook dulu.', 'Isi kedua.'], 'narration ends at the first ## section');
});
```

Replace `scripts/voice-align.test.mjs` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords, spokenGroups, whisperWords } from './lib/voice/align.mjs';
import { WHISPER } from './voice-fixtures.mjs';

test('whisperWords joins tokens into words and skips special tokens', () => {
  assert.deepEqual(whisperWords(WHISPER), [
    { text: 'Jujur,', start: 0.1, end: 0.6 }, { text: 'gue', start: 0.6, end: 0.9 }, { text: 'kira', start: 0.9, end: 1.3 },
    { text: 'gampang.', start: 1.3, end: 2.4 }, { text: 'Ternyata', start: 2.4, end: 3.2 }, { text: 'susah.', start: 3.2, end: 4 },
  ]);
});

test('alignWords keeps script spelling, flags misreads, and interpolates missing words', () => {
  const script = ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.'];
  const exact = alignWords({ script, asr: whisperWords(WHISPER), duration: 4 });
  assert.equal(exact.wer, 0);
  assert.deepEqual(exact.words[3], { text: 'gampang.', start: 1.3, end: 2.4, matched: true });
  const asr = [{ text: 'Jujur', start: 0.1, end: 0.6 }, { text: 'gue', start: 0.6, end: 0.9 }, { text: 'kiri', start: 0.9, end: 1.3 }, { text: 'gampang.', start: 1.3, end: 2.4 }, { text: 'Ternyata', start: 2.4, end: 4 }];
  const r = alignWords({ script, asr, duration: 4.5 });
  assert.equal(r.wer, 0.333);
  assert.deepEqual(r.words[2], { text: 'kira', start: 0.9, end: 1.3, matched: false });
  assert.deepEqual(r.words[5], { text: 'susah.', start: 4, end: 4.5, matched: false });
  assert.deepEqual(r.unmatched, ['kira', 'susah.']);
});

test('alignWords compares spoken forms, so written numbers match spoken ones', () => {
  const asr = [{ text: 'bayar', start: 0, end: 0.4 }, { text: 'Rp2,5', start: 0.4, end: 1.6 }, { text: 'juta.', start: 1.6, end: 2 }];
  const r = alignWords({ script: ['bayar', 'Rp2,5', 'juta.'], asr, duration: 2 });
  assert.equal(r.wer, 0);
  assert.deepEqual(r.words[1], { text: 'Rp2,5', start: 0.4, end: 1.2, matched: true }, '"Rp2,5 juta." is one group: its span is split evenly');
});

test('alignWords treats an extra transcribed word as an insertion, not a misread', () => {
  const asr = [...whisperWords(WHISPER)];
  asr.splice(3, 0, { text: 'banget', start: 1.25, end: 1.3 });
  const r = alignWords({ script: ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.'], asr, duration: 4 });
  assert.equal(r.wer, 0.167);
  assert.ok(r.words.every((w) => w.matched));
  assert.deepEqual(r.words[3], { text: 'gampang.', start: 1.3, end: 2.4, matched: true });
});

test('spokenGroups joins only the words whose spoken form depends on a neighbour', () => {
  const g = (words) => spokenGroups(words).map((x) => words.slice(x.from, x.to).join(' '));
  assert.deepEqual(g(['bayar', 'Rp', '2.500', 'per', 'bulan']), ['bayar', 'Rp 2.500', 'per', 'bulan']);
  assert.deepEqual(g(['cuma', '2,5', 'jt', 'saja']), ['cuma', '2,5 jt', 'saja']);
  assert.deepEqual(g(['naik', '50', '%']), ['naik', '50 %']);
  assert.deepEqual(g(['butuh', '3', '-', '5', 'hari']), ['butuh', '3 - 5', 'hari']);
  assert.deepEqual(g(['Jujur,', 'gue', 'kira']), ['Jujur,', 'gue', 'kira']);
});

test('alignWords matches amounts split by spaces on either side', () => {
  const at = (words) => words.map((text, i) => ({ text, start: i * 0.5, end: i * 0.5 + 0.5 }));
  const script = ['bayar', 'Rp', '2.500', 'per', 'bulan,', 'naik', '50', '%.'];
  const heard = at(['bayar', 'dua', 'ribu', 'lima', 'ratus', 'rupiah', 'per', 'bulan,', 'naik', 'lima', 'puluh', 'persen.']);
  const r = alignWords({ script, asr: heard, duration: 6 });
  assert.equal(r.wer, 0);
  assert.ok(r.words.every((w) => w.matched));
  assert.deepEqual(r.words.slice(1, 3), [{ text: 'Rp', start: 0.5, end: 1.75, matched: true }, { text: '2.500', start: 1.75, end: 3, matched: true }]);
  const written = alignWords({ script: ['cuma', 'Rp2,5', 'juta.'], asr: at(['cuma', 'Rp2,5', 'juta.']), duration: 1.5 });
  assert.equal(written.wer, 0);
  const spoken = alignWords({ script: ['cuma', 'Rp2,5', 'juta.'], asr: at(['cuma', 'dua', 'koma', 'lima', 'juta', 'rupiah.']), duration: 3 });
  assert.equal(spoken.wer, 0, '"Rp2,5 juta" is read "dua koma lima juta rupiah"');
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:voice`
Expected: FAIL — `does not provide an export named 'spokenGroups'`.

- [ ] **Step 3: Implement**

Replace `scripts/lib/voice/script.mjs` with:

```js
// Script text helpers for the voice adapter (ADR-0023, RD-06-02): paragraphs, inline Gemini tags, caption words.
export const TAG_RE = /<([a-z][a-z ]*)>/g;
const PAUSE = { 'short pause': ',', 'long pause': '.' };

// Markdown script file -> the narration: HTML comments and "# " title lines are dropped, and the narration ends
// at the first "## " section (## Fakta and other notes follow it). "#1" or "#AI" in a line stay.
export function scriptBody(md) {
  const text = String(md).replace(/<!--[\s\S]*?-->/g, '');
  const notes = text.search(/^[ \t]*##\s/m);
  return (notes < 0 ? text : text.slice(0, notes)).split('\n').filter((l) => !/^\s*#\s/.test(l)).join('\n');
}

export function splitParagraphs(text) {
  return String(text).replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export const stripTags = (p) => p.replace(TAG_RE, ' ').replace(/\s+([,.!?])/g, '$1').replace(/\s+/g, ' ').trim();

// Gemini reads the tags; other providers get a comma for <short pause>, a full stop for <long pause>, nothing else.
export function forProvider(p, provider) {
  if (provider === 'gemini') return p;
  return p
    .replace(TAG_RE, (m, name) => PAUSE[name] ?? ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/([.,!?])[,.]+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export const scriptWords = (text) => splitParagraphs(text).flatMap((p) => stripTags(p).split(' ').filter(Boolean));
```

Replace `scripts/lib/voice/align.mjs` with:

```js
// Voiceover word timing (ADR-0023, RD-06-09/10): whisper.cpp tokens -> words, then a DP alignment onto the script
// in spoken form (both sides normalized in word groups, so "Rp 2.500" and "dua ribu lima ratus rupiah" meet),
// keeping the script spelling.
import { normalizeForSpeech } from './normalize.mjs';

const r3 = (x) => Math.round(x * 1000) / 1000;
const norm = (w) => w.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');

// whisper-cli -ojf JSON with --dtw: a token that starts with a space starts a word; [_..._] tokens are special.
export function whisperWords(json) {
  const words = [];
  for (const seg of json?.transcription || []) {
    const segEnd = (seg.offsets?.to ?? 0) / 1000;
    for (const tok of seg.tokens || []) {
      const text = String(tok.text ?? '');
      if (!text.trim() || /^\[_[^\]]*\]$/.test(text.trim())) continue;
      const t = tok.t_dtw >= 0 ? tok.t_dtw / 100 : (tok.offsets?.from ?? 0) / 1000;
      if (text.startsWith(' ') || !words.length) words.push({ text: text.trim(), start: t, end: segEnd });
      else words[words.length - 1].text += text;
    }
  }
  for (let i = 0; i < words.length - 1; i++) words[i].end = Math.max(words[i].start, words[i + 1].start);
  return words.map((w) => ({ text: w.text, start: r3(w.start), end: r3(w.end) }));
}

const tokensOf = (text) => normalizeForSpeech(text).split(/\s+/).map(norm).filter(Boolean);
const same = (a, b) => a.length === b.length && a.every((t, i) => t === b[i]);

// Words whose spoken form depends on a neighbour ("Rp 2.500", "2,5 jt", "50 %", "3 - 5") are normalized
// together, at most 3 words per group; every other word is its own group.
export function spokenGroups(words) {
  const groups = [];
  let i = 0;
  while (i < words.length) {
    let to = i + 1;
    grow: while (to - i < 3) {
      for (const step of [1, 2]) {
        if (to + step > words.length || to + step - i > 3) break;
        const next = words.slice(to, to + step);
        // the change must involve the group: a pair that changes on its own ("Rp2,5 juta") starts its own group
        if (step === 2 && !same(tokensOf(next.join(' ')), next.flatMap(tokensOf))) break;
        const apart = [...tokensOf(words.slice(i, to).join(' ')), ...next.flatMap(tokensOf)];
        if (!same(tokensOf(words.slice(i, to + step).join(' ')), apart)) {
          to += step;
          continue grow;
        }
      }
      break;
    }
    groups.push({ from: i, to, tokens: tokensOf(words.slice(i, to).join(' ')) });
    i = to;
  }
  return groups;
}

// Spoken tokens of every group; an ASR group's time span is split evenly across its tokens.
function spoken(words, times) {
  const groups = spokenGroups(words);
  const tokens = [];
  for (const [g, grp] of groups.entries()) {
    const span = times ? { start: times[grp.from].start, end: times[grp.to - 1].end } : null;
    const step = span ? (span.end - span.start) / (grp.tokens.length || 1) : 0;
    grp.tokens.forEach((t, k) => tokens.push({ t, g, start: span ? span.start + step * k : null, end: span ? span.start + step * (k + 1) : null }));
  }
  return { tokens, groups };
}

function interpolate(words, duration) {
  let k = 0;
  while (k < words.length) {
    if (words[k].start !== null) {
      k++;
      continue;
    }
    let e = k;
    while (e < words.length && words[e].start === null) e++;
    const from = k > 0 ? words[k - 1].end : 0;
    const to = e < words.length ? words[e].start : duration;
    const step = Math.max(0, to - from) / (e - k);
    for (let q = k; q < e; q++) {
      words[q].start = r3(from + step * (q - k));
      words[q].end = r3(from + step * (q - k + 1));
    }
    k = e;
  }
}

export function alignWords({ script, asr, duration }) {
  const S = spoken(script);
  const A = spoken(asr.map((w) => w.text), asr).tokens;
  const n = S.tokens.length;
  const m = A.length;
  const cost = (i, j) => (S.tokens[i].t === A[j].t ? 0 : 1);
  const D = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Uint32Array(m + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + cost(i - 1, j - 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
  }
  const pair = new Array(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + cost(i - 1, j - 1)) pair[--i] = --j;
    else if (i > 0 && D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  // Each script group gets the span of the ASR tokens paired with its tokens, split evenly across its words.
  const words = [];
  for (const [g, grp] of S.groups.entries()) {
    const idx = S.tokens.flatMap((tok, k) => (tok.g === g ? [k] : []));
    const timed = idx.filter((k) => pair[k] >= 0).map((k) => A[pair[k]]);
    const matched = idx.every((k) => pair[k] >= 0 && S.tokens[k].t === A[pair[k]].t);
    const start = timed.length ? Math.min(...timed.map((a) => a.start)) : null;
    const end = timed.length ? Math.max(...timed.map((a) => a.end)) : null;
    const count = grp.to - grp.from;
    for (let w = 0; w < count; w++) {
      words.push({
        text: script[grp.from + w],
        start: start === null ? null : r3(start + ((end - start) * w) / count),
        end: end === null ? null : r3(start + ((end - start) * (w + 1)) / count),
        matched,
      });
    }
  }
  interpolate(words, duration);
  return { words, wer: n ? r3(D[n][m] / n) : 0, unmatched: [...new Set(words.filter((w) => !w.matched).map((w) => w.text))].slice(0, 20) };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test:voice`
Expected: `ℹ pass 41`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/voice/script.mjs scripts/lib/voice/align.mjs scripts/voice-text.test.mjs scripts/voice-align.test.mjs
git commit -m "fix(voice): narration ends at the first ## section; alignment normalizes word groups (RD-06-02/09)"
```

### Task 3: Generate starter and libraries (`generate`, `bgm`, `storyboard`)

**Files:**
- Create: `templates/dena-generate/index.html`, `templates/dena-generate/hyperframes.json` (copy of `templates/dena-video/hyperframes.json`), `scripts/lib/generate.mjs`, `scripts/lib/bgm.mjs`, `scripts/lib/storyboard.mjs`, `scripts/generate-lib.test.mjs`
- Modify: `package.json` (`test:video`)

**Interfaces:**
- Consumes: `renderVoice`, `writeJson` (`scripts/lib/voice/render.mjs`), `loadVoices`, `getPreset`, `loadLexicon`, `scriptBody`; `loudnessArgs`, `parseLoudnorm` (`cut-plan.mjs`); `LICENSES`, `MUSIC_DIR`, `checkCatalog`, `findTrack`, `readCatalog` (`music.mjs`); `probeDuration`, `HYPERFRAMES` (`video.mjs`); `PREFIX`, `layout`, `readManifest` (`style-examples.mjs`).
- Produces: `GENERATE_TEMPLATE`, `briefStub(slug)`, `syncDuration(html, duration)`, `transcriptFromVoice({ meta, words })`, `voiceStep({ dir, root, preset, env, fetchImpl, run }) → meta`; `BGM`, `bgmCopies({ trackDuration, from, duration, xfade })`, `bgmGain(inputI)`, `bgmArgs({ track, from, copies, voice, duration, gainDb, out })`, `runBgm({ dir, root, trackId, from, run }) → meta`; `COLS`, `sceneRows(timeline)`, `exampleStill(root, clip) → { style, clip, at }`, `findFrame(dir, at)`, `spokenIn(words, start, end)`, `sheetHtml(tiles) → { height, html }`, `runStoryboard({ dir, root, run, env, log }) → { out, scenes }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/generate-lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { BGM, bgmArgs, bgmCopies, bgmGain } from './lib/bgm.mjs';
import { briefStub, syncDuration, transcriptFromVoice } from './lib/generate.mjs';
import { exampleStill, findFrame, sceneRows, sheetHtml, spokenIn } from './lib/storyboard.mjs';

const REPO = process.cwd();

test('briefStub starts a generate-mode brief', () => {
  assert.match(briefStub('x'), /^# Creative Brief - x\n/);
  assert.match(briefStub('x'), /- mode: generate\n/);
});

test('syncDuration rewrites data-duration only on elements marked data-voice-duration', () => {
  const html = '<main id="root" data-duration="10" data-voice-duration><audio id="v" data-start="0" data-duration="10" data-voice-duration></audio><div id="cap" data-duration="1.3"></div></main>';
  assert.equal(syncDuration(html, 42.5), '<main id="root" data-duration="42.5" data-voice-duration><audio id="v" data-start="0" data-duration="42.5" data-voice-duration></audio><div id="cap" data-duration="1.3"></div></main>');
  const starter = readFileSync(join(REPO, 'templates/dena-generate/index.html'), 'utf8').replaceAll('__SLUG__', 'x').replaceAll('__DURATION__', '10');
  const synced = syncDuration(starter, 33.3);
  assert.equal((synced.match(/data-duration="33\.3"/g) || []).length, 4, 'root, voice audio, bgm audio, progress');
  assert.throws(() => syncDuration(html, 0), /duration must be > 0/);
});

test('transcriptFromVoice writes the edit-path processed-transcript schema', () => {
  const t = transcriptFromVoice({ meta: { provider: 'supertonic', model: null, voice: 'F2', paragraphs: [{ hash: 'h', text: 'Halo semua.', start: 0, end: 1.2, cached: false }] }, words: [{ text: 'Halo', start: 0.1, end: 0.5, matched: true }, { text: 'semua.', start: 0.5, end: 1.2, matched: true }] });
  assert.deepEqual(t, { source: 'voice/voiceover.wav', model: 'supertonic/-/F2', language: 'id', note: 'generate mode: words from voice/words.json (script spelling, whisper DTW times)', segments: [{ start: 0, end: 1.2, text: 'Halo semua.' }], words: [{ start: 0.1, end: 0.5, text: 'Halo' }, { start: 0.5, end: 1.2, text: 'semua.' }] });
});

test('bgmCopies, bgmGain, and bgmArgs build one deterministic ffmpeg call', () => {
  assert.equal(bgmCopies({ trackDuration: 120, from: 5, duration: 60 }), 1);
  assert.equal(bgmCopies({ trackDuration: 20, from: 2, duration: 34.76 }), 2);
  assert.equal(bgmCopies({ trackDuration: 20, from: 0, duration: 80 }), 5);
  assert.throws(() => bgmCopies({ trackDuration: 20, from: 19.5, duration: 30 }), /leaves less than 1 s/);
  assert.equal(bgmGain(-12.02), -17.98);
  assert.equal(bgmGain(-70), 20);
  assert.equal(bgmGain(null), 0);
  const a = bgmArgs({ track: 't.mp3', from: 2, copies: 2, voice: 'v.wav', duration: 34.759, gainDb: -17.98, out: 'o.wav' });
  assert.deepEqual(a.slice(0, 11), ['-y', '-loglevel', 'error', '-ss', '2', '-i', 't.mp3', '-i', 't.mp3', '-i', 'v.wav']);
  const graph = a[a.indexOf('-filter_complex') + 1].split(';');
  assert.equal(graph[2], '[t0][t1]acrossfade=d=1:c1=tri:c2=tri[x1]');
  assert.equal(graph[3], '[x1]atrim=0:34.759,asetpts=PTS-STARTPTS,volume=-17.98dB,afade=t=in:d=0.5,afade=t=out:st=33.259:d=1.5,apad[bg]');
  assert.equal(graph[4], '[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,apad[key]');
  assert.equal(graph[5], `[bg][key]sidechaincompress=threshold=${BGM.duck.threshold}:ratio=${BGM.duck.ratio}:attack=${BGM.duck.attack}:release=${BGM.duck.release},atrim=0:34.759[out]`);
  assert.deepEqual(a.slice(-9), ['-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', 'o.wav']);
});

const TIMELINE = {
  elements: [
    { id: 'ov-001', type: 'hook-card', track: 5, start: 0, duration: 3, placement: 'top-card' },
    { id: 'ov-003', type: 'motion-graphic', track: 7, start: 3, duration: 4, placement: 'full', example: 'mg-01-count' },
    { id: 'ov-002', type: 'whiteboard', track: 4, start: 0, duration: 3, placement: 'full', example: 'wb-01-flow' },
  ],
};

test('sceneRows keeps full-frame scenes in time order and names rows without an example', () => {
  assert.deepEqual(sceneRows(TIMELINE).map((e) => e.id), ['ov-002', 'ov-003']);
  assert.throws(() => sceneRows({ elements: [{ id: 'ov-009', placement: 'full', start: 0 }] }), /without "example" \(Screen Plan fills it\): ov-009/);
  assert.throws(() => sceneRows({ elements: [] }), /no scene rows/);
});

test('exampleStill finds the host time of an example\'s first still; findFrame matches the snapshot file', () => {
  assert.deepEqual(exampleStill(REPO, 'wb-01-flow'), { style: 'whiteboard', clip: 'wb-01-flow', at: 2.5 });
  assert.throws(() => exampleStill(REPO, 'wb-99-nope'), /unknown style example "wb-99-nope"/);
  const d = mkdtempSync(join(tmpdir(), 'frames-'));
  writeFileSync(join(d, 'frame-00-at-2.5s.png'), 'p');
  writeFileSync(join(d, 'frame-01-at-6.2s.png'), 'p');
  assert.equal(basename(findFrame(d, 6.2)), 'frame-01-at-6.2s.png');
  assert.equal(findFrame(d, 7), null);
  assert.equal(findFrame(join(d, 'missing'), 1), null);
});

test('sheetHtml lays tiles out in a 4-column grid with escaped labels', () => {
  const { height, html } = sheetHtml([{ time: '0:00.0–0:03.0', example: 'wb-01-flow', words: 'Jujur, gue <kira>' }, { time: '0:03.0–0:07.0', example: 'mg-01-count', words: 'x'.repeat(80) }]);
  assert.equal(height, 24 + 1 * (427 + 104 + 24));
  assert.match(html, /<b>1<\/b> 0:00\.0–0:03\.0 · wb-01-flow<br \/>Jujur, gue &lt;kira&gt;/);
  assert.match(html, /x{57}…/);
  assert.equal(spokenIn([{ start: 0.1, text: 'a' }, { start: 2.9, text: 'b' }, { start: 3, text: 'c' }], 0, 3), 'a b');
});
```

In `package.json`, change `test:video` to end with `scripts/migrate-sources.test.mjs scripts/generate-lib.test.mjs"`.

Run: `node --test scripts/generate-lib.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/lib/bgm.mjs'`.

- [ ] **Step 2: Create the starter**

Run `mkdir -p templates/dena-generate && cp templates/dena-video/hyperframes.json templates/dena-generate/`, then create `templates/dena-generate/index.html`:

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Dena - __SLUG__</title>
    <script src="vendor/gsap.min.js"></script>
    <script src="vendor/motion-kit/motion-kit.js"></script>
    <script src="vendor/style-kit/style-kit.js"></script>
    <script src="vendor/asset-lib/asset-lib.js"></script>
    <link rel="stylesheet" href="vendor/motion-kit/motion-kit.css" />
    <link rel="stylesheet" href="vendor/style-kit/style-kit.css" />
    <link rel="stylesheet" href="vendor/paper-pack/paper-pack.css" />
    <link rel="stylesheet" href="vendor/asset-lib/asset-lib.css" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0; width: 1080px; height: 1920px;
        overflow: hidden; background: #000;
        font-family: Arial, Helvetica, sans-serif;
      }
      #root {
        position: relative; width: 1080px; height: 1920px; overflow: hidden;
        --white: #fff; --panel: rgba(5, 5, 5, 0.9);
        --yellow: #facc15; --green: #22c55e;
        --safe-bottom: 270px;
      }
      .clip { position: absolute; }
      /* full-bleed background as a child: a root background can drop out in the producer */
      .bg-fill { position: absolute; inset: 0; z-index: 0; background: #050505; }
      audio.clip { width: 0; height: 0; opacity: 0; }
      /* inline-block so transforms apply to highlighted words */
      .hl { color: var(--yellow); display: inline-block; }
      .progress-track { top: 0; left: 0; right: 0; height: 4px; z-index: 30; background: rgba(255, 255, 255, 0.12); }
      .progress-fill {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: var(--yellow); opacity: 0.55; transform-origin: left center; transform: scaleX(0);
      }
      .hook-card, .cta-card {
        top: 96px; left: 60px; right: 60px; z-index: 56;
        padding: 26px 30px; text-align: center; text-transform: uppercase; color: var(--white);
        background: var(--panel); border: 3px solid rgba(255, 255, 255, 0.16);
        border-radius: 16px; box-shadow: 0 22px 48px rgba(0, 0, 0, 0.5);
      }
      .cta-card { border-color: rgba(250, 204, 21, 0.5); }
      .hook-card .line, .cta-card .line { display: block; font-size: 52px; font-weight: 950; line-height: 1.14; }
      .hook-card .line.small { font-size: 42px; }
      .proof-chip {
        top: 190px; right: 56px; z-index: 34;
        padding: 12px 24px; border-radius: 999px;
        background: rgba(8, 8, 8, 0.8); border: 2px solid rgba(255, 255, 255, 0.18);
        color: var(--white); font-size: 30px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase;
      }
      .label-card {
        z-index: 36; padding: 10px 22px; border-radius: 12px;
        background: var(--panel); color: var(--white);
        font-size: 25px; font-weight: 950; text-transform: uppercase;
      }
      .label-card.green { background: var(--green); color: #050505; }
      .sticker {
        z-index: 36; padding: 10px 22px; border-radius: 999px;
        background: var(--yellow); color: #121212;
        font-size: 27px; font-weight: 950; letter-spacing: 0.06em; text-transform: uppercase;
        transform: rotate(3deg);
      }
      .caption {
        left: 56px; right: 56px; bottom: var(--safe-bottom); z-index: 45;
        min-height: 116px; color: var(--white); font-size: 58px; font-weight: 950;
        line-height: 1.0; text-align: center; text-transform: uppercase;
        overflow-wrap: anywhere; text-shadow: 0 5px 0 #000, 0 12px 26px rgba(0, 0, 0, 0.72);
        -webkit-text-stroke: 2px #000;
      }
      /* scene mounts (tracks 4 and 7, alternating), below captions and cards */
      .broll { position: absolute; inset: 0; z-index: 22; }
    </style>
  </head>
  <body>
    <main id="root" data-composition-id="dena-__SLUG__"
      data-start="0" data-width="1080" data-height="1920" data-duration="__DURATION__" data-voice-duration>
      <!-- generate mode (ADR-0025): no base video. The background takes the style world colour (--sk-bg). -->
      <div class="bg-fill"></div>
      <!-- voiceover from npm run video -- voice (processed-audio.wav) and ducked music from npm run video -- bgm (bgm.wav) -->
      <audio id="voice-audio" class="clip" data-start="0" data-duration="__DURATION__" data-voice-duration data-track-index="10" src="processed-audio.wav"></audio>
      <audio id="bgm-audio" class="clip" data-start="0" data-duration="__DURATION__" data-voice-duration data-track-index="9" src="bgm.wav"></audio>
      <div id="progress" class="clip progress-track" data-start="0" data-duration="__DURATION__" data-voice-duration data-track-index="3">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
      <!--
        npm run video -- voice rewrites data-duration on every element marked data-voice-duration.
        Add clips below (recipes: docs/agents/references/generate-mode.md, Build):
        - Scenes: one mount per scene with class "broll", alternating track 4 and track 7 so a 0.2-0.4 s
          transition can overlap; id "broll-NN-name-mount", data-composition-id "broll-NN-name", source
          compositions/broll/NN-name.html, width 1080, height 1920. The clip calls SK.clip
          (docs/agents/references/styles/README.md, Build Contract). Scenes cover 0 to the end without gaps.
        - Captions alternate tracks 2 and 8; a beat with rail "hidden" gets no element:
          <div id="cap-001" class="clip caption" data-start="0.02" data-duration="1.3" data-track-index="2">KATA <span class="hl">KUNCI</span></div>
        - Hook card / CTA card on track 5 (hook card data-duration = hook_end from creative-brief.md).
        - SFX: one audio element per cue, class "clip", track 11 and up (one cue per track),
          data-volume about 0.09-0.24, file under assets/sfx/. Never use data-media-start;
          trim the file instead. (Prose on purpose: the linter reads markup inside comments.)
      -->
    </main>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // the root's data-duration is the voiceover length (a DOM read, not a clock: deterministic)
      tl.to('#progress-fill', { scaleX: 1, duration: Number(document.getElementById('root').dataset.duration), ease: 'none' }, 0);
      // Caption entrance: tl.fromTo('#cap-001', { autoAlpha: 0, y: 16, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.14 }, 0.02);
      window.__timelines['dena-__SLUG__'] = tl;
    </script>
  </body>
</html>
```

- [ ] **Step 3: Implement the libraries**

Create `scripts/lib/generate.mjs`:

```js
// Generate mode (ADR-0025, RD-03-75..81, RD-06-23..25): the script's voiceover is the time base instead of processed.mp4.
// Brief stub for `video new --generate`, the duration sync, and `video voice`. Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLexicon } from './voice/normalize.mjs';
import { getPreset, loadVoices } from './voice/presets.mjs';
import { renderVoice, writeJson } from './voice/render.mjs';
import { scriptBody } from './voice/script.mjs';

export const GENERATE_TEMPLATE = join('templates', 'dena-generate');

export const briefStub = (slug) => `# Creative Brief - ${slug}

## Workflow Settings

- mode: generate
- visual_density: medium

<!-- Story (mode generate) fills the rest from the Brief Template in docs/agents/references/generate-mode.md. -->
`;

// Every tag marked data-voice-duration gets data-duration = the voiceover length. HTML comments are left alone
// (the starter's comments hold sample markup).
export function syncDuration(html, duration) {
  if (!(duration > 0)) throw new Error('duration must be > 0');
  return html
    .split(/(<!--[\s\S]*?-->)/)
    .map((part, i) => (i % 2 ? part : part.replace(/<[^>]*\bdata-voice-duration\b[^>]*>/g, (tag) => tag.replace(/\bdata-duration="[^"]*"/, `data-duration="${duration}"`))))
    .join('');
}

// processed-transcript.json in the schema the edit path writes (segments + words), from the voiceover.
export function transcriptFromVoice({ meta, words }) {
  return {
    source: 'voice/voiceover.wav',
    model: [meta.provider, meta.model || '-', meta.voice || '-'].join('/'),
    language: 'id',
    note: 'generate mode: words from voice/words.json (script spelling, whisper DTW times)',
    segments: meta.paragraphs.map((p) => ({ start: p.start, end: p.end, text: p.text })),
    words: words.map((w) => ({ start: w.start, end: w.end, text: w.text })),
  };
}

export async function voiceStep({ dir, root = '.', preset: presetName, env, fetchImpl, run = spawnSync }) {
  const scriptFile = join(dir, 'script.md');
  if (!existsSync(scriptFile)) throw new Error(`${scriptFile} not found; the Story phase writes the script first (docs/agents/01-story.md, mode generate)`);
  const voices = loadVoices(root);
  const name = presetName ?? voices.default;
  if (!name) throw new Error('no voice preset: pass --preset <name> or set "default" in config/voices.json');
  const preset = getPreset(voices, name);
  if (preset.provider === 'recorded') throw new Error(`preset ${name} is a recording; generate mode reads the script with a TTS preset`);
  const text = scriptBody(readFileSync(scriptFile, 'utf8'));
  const out = join(dir, 'voice');
  const meta = await renderVoice({ text, preset, out, root, lexicon: loadLexicon(root), env, fetchImpl, run });
  const audio = join(dir, 'processed-audio.wav');
  copyFileSync(join(out, 'voiceover.wav'), `${audio}.part`);
  renameSync(`${audio}.part`, audio);
  const words = JSON.parse(readFileSync(join(out, 'words.json'), 'utf8'));
  writeJson(join(dir, 'processed-transcript.json'), transcriptFromVoice({ meta, words }));
  const index = join(dir, 'index.html');
  if (existsSync(index)) writeFileSync(index, syncDuration(readFileSync(index, 'utf8'), meta.duration));
  return meta;
}
```

Create `scripts/lib/bgm.mjs`:

```js
// `video bgm` (ADR-0025, RD-06-26..28): one BGM track from shared/music/ cut or looped to the voiceover length,
// faded, set to about -30 LUFS, and ducked under the voice with sidechaincompress -> bgm.wav + bgm.json.
// One ffmpeg call, deterministic for the same inputs. Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loudnessArgs, parseLoudnorm } from './cut-plan.mjs';
import { LICENSES, MUSIC_DIR, checkCatalog, findTrack, readCatalog } from './music.mjs';
import { writeJson } from './voice/render.mjs';
import { probeDuration } from '../video.mjs';

export const BGM = {
  target: -30, // LUFS before ducking
  xfade: 1, // seconds, loop seam
  fadeIn: 0.5,
  fadeOut: 1.5,
  duck: { threshold: 0.05, ratio: 8, attack: 20, release: 400 },
};
const r3 = (x) => Math.round(x * 1000) / 1000;

// How many copies of the track cover the video: the first starts at `from`, each next overlaps by the crossfade.
export function bgmCopies({ trackDuration, from, duration, xfade = BGM.xfade }) {
  const first = trackDuration - from;
  if (!(first > xfade)) throw new Error(`--from ${from} leaves less than ${xfade} s of the track`);
  return first >= duration ? 1 : 1 + Math.ceil((duration - first) / (trackDuration - xfade));
}

export const bgmGain = (inputI) => (inputI === null ? 0 : r3(Math.max(-30, Math.min(20, BGM.target - inputI))));

export function bgmArgs({ track, from, copies, voice, duration, gainDb, out }) {
  const fmt = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';
  const inputs = ['-ss', String(from), '-i', track, ...Array.from({ length: copies - 1 }, () => ['-i', track]).flat(), '-i', voice];
  const g = Array.from({ length: copies }, (_, k) => `[${k}:a]${fmt}[t${k}]`);
  let last = 't0';
  for (let k = 1; k < copies; k++) {
    g.push(`[${last}][t${k}]acrossfade=d=${BGM.xfade}:c1=tri:c2=tri[x${k}]`);
    last = `x${k}`;
  }
  // apad on both inputs + a hard atrim: sidechaincompress otherwise stops early, at a different point each run
  g.push(`[${last}]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${gainDb}dB,afade=t=in:d=${BGM.fadeIn},afade=t=out:st=${r3(duration - BGM.fadeOut)}:d=${BGM.fadeOut},apad[bg]`);
  g.push(`[${copies}:a]${fmt},apad[key]`);
  const { threshold, ratio, attack, release } = BGM.duck;
  g.push(`[bg][key]sidechaincompress=threshold=${threshold}:ratio=${ratio}:attack=${attack}:release=${release},atrim=0:${duration}[out]`);
  return ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', g.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', out];
}

function exec(run, args) {
  const r = run('ffmpeg', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`ffmpeg failed (exit ${r.status}): ${String(r.stderr || '').trim().split('\n').slice(-2).join(' ')}`);
  return r;
}

export function runBgm({ dir, root = '.', trackId, from = 0, run = spawnSync }) {
  const voice = join(dir, 'processed-audio.wav');
  if (!existsSync(voice)) throw new Error(`${voice} not found; run npm run video -- voice <slug> first`);
  const f = Number(from);
  if (!Number.isFinite(f) || f < 0) throw new Error('--from must be a number of seconds >= 0');
  const catalog = readCatalog(root);
  const t = findTrack(catalog, trackId);
  if (t.rejected) throw new Error(`${t.id} was rejected in the Studio (tab Musik); pick another track`);
  if (!LICENSES[t.license]) throw new Error(`${t.id}: license "${t.license}" is not allowed (ADR-0024)`);
  const problems = checkCatalog(root).filter((p) => p.startsWith(`${t.id}:`));
  if (problems.length) throw new Error(`${problems.join('; ')}; run npm run music -- check`);
  const track = join(root, MUSIC_DIR, t.file);
  const duration = probeDuration(voice, run);
  const copies = bgmCopies({ trackDuration: t.duration, from: f, duration });
  const measured = ['-hide_banner', '-nostats', '-ss', String(f), '-t', String(Math.min(duration, t.duration - f)), ...loudnessArgs(track).slice(2)];
  const gainDb = bgmGain(parseLoudnorm(exec(run, measured).stderr));
  const out = join(dir, 'bgm.wav');
  const part = join(dir, 'bgm.part.wav');
  rmSync(part, { force: true });
  exec(run, bgmArgs({ track, from: f, copies, voice, duration, gainDb, out: part }));
  renameSync(part, out);
  const meta = { version: 1, track: t.id, file: t.file, sha256: createHash('sha256').update(readFileSync(out)).digest('hex'), from: f, duration, copies, gainDb, duck: BGM.duck };
  writeJson(join(dir, 'bgm.json'), meta);
  return meta;
}
```

Create `scripts/lib/storyboard.mjs` (the sheet is HTML snapshotted by HyperFrames because this Mac's ffmpeg has no `drawtext`):

```js
// `video storyboard` (ADR-0025, RD-03-84..86): the Gate 2 sheet for generate mode. Each scene row
// (placement "full") in overlay-timeline.json names the style example it leans on; the sheet shows that
// example's first still with the scene number, time, and spoken words, laid out in HTML and snapshotted
// by hyperframes (this machine's ffmpeg has no drawtext). Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PREFIX, layout, readManifest } from './style-examples.mjs';
import { HYPERFRAMES } from '../video.mjs';

export const COLS = 4;
const TILE = { w: 240, h: 427, gap: 24, caption: 104 };
const FONT = 'plus-jakarta-sans-latin-wght-normal.woff2';
const STYLE_OF = Object.fromEntries(Object.entries(PREFIX).map(([style, p]) => [p, style]));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

export function sceneRows(timeline) {
  const rows = (timeline?.elements || []).filter((e) => e.placement === 'full').sort((a, b) => a.start - b.start);
  if (!rows.length) throw new Error('overlay-timeline.json has no scene rows (placement "full")');
  const missing = rows.filter((e) => !e.example).map((e) => e.id);
  if (missing.length) throw new Error(`scene rows without "example" (Screen Plan fills it): ${missing.join(', ')}`);
  return rows;
}

// The example clip's first still, as a time in its style's example host.
export function exampleStill(root, clip) {
  const style = STYLE_OF[String(clip).split('-')[0]];
  const m = style && readManifest(root, style);
  const e = m && layout(m).find((x) => x.clip === clip);
  if (!e) throw new Error(`unknown style example "${clip}" (see docs/agents/references/style-examples/<style>/examples.json)`);
  return { style, clip, at: Math.round((e.start + e.stills[0]) * 1000) / 1000 };
}

// renders/style-examples/<style>/frame-NN-at-<t>s.png, written by npm run check:style-examples -- <style>
export function findFrame(dir, at) {
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => {
    const m = /^frame-\d+-at-([\d.]+)s\.png$/.exec(f);
    return m && Math.abs(Number(m[1]) - at) < 0.0005;
  });
  return hit ? join(dir, hit) : null;
}

export const spokenIn = (words, start, end) => words.filter((w) => w.start >= start && w.start < end).map((w) => w.text).join(' ');

export function sheetHtml(tiles) {
  const rows = Math.ceil(tiles.length / COLS);
  const height = TILE.gap + rows * (TILE.h + TILE.caption + TILE.gap);
  const cells = tiles.map((t, i) => `        <div class="tile"><img src="img/${String(i).padStart(2, '0')}.png" /><div class="cap"><b>${i + 1}</b> ${esc(t.time)} · ${esc(t.example)}<br />${esc(t.words.length > 60 ? `${t.words.slice(0, 57)}…` : t.words)}</div></div>`).join('\n');
  return { height, html: `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=${height}" />
    <script src="vendor/gsap.min.js"></script>
    <style>
      @font-face { font-family: 'Storyboard Sans'; src: url('fonts/${FONT}') format('woff2'); font-weight: 200 800; }
      html, body { margin: 0; width: 1080px; height: ${height}px; background: #141414; }
      #root { position: relative; width: 1080px; height: ${height}px; overflow: hidden; font-family: 'Storyboard Sans', sans-serif; color: #eee; }
      .grid { position: absolute; left: ${TILE.gap}px; top: ${TILE.gap}px; display: grid; grid-template-columns: repeat(${COLS}, ${TILE.w}px); gap: ${TILE.gap}px; }
      .tile img { display: block; width: ${TILE.w}px; height: ${TILE.h}px; object-fit: cover; border-radius: 8px; background: #000; }
      .cap { margin-top: 6px; height: ${TILE.caption - 12}px; overflow: hidden; font-size: 17px; line-height: 1.25; }
    </style>
  </head>
  <body>
    <main id="root" data-composition-id="storyboard" data-start="0" data-width="1080" data-height="${height}" data-duration="1">
      <div class="grid">
${cells}
      </div>
    </main>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines['storyboard'] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
` };
}

function exec(run, cmd, args, opts = {}) {
  const r = run(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(' ')} failed (exit ${r.status})`);
  return r;
}

export function runStoryboard({ dir, root = '.', run = spawnSync, env = process.env, log = () => {} }) {
  const tlFile = join(dir, 'overlay-timeline.json');
  if (!existsSync(tlFile)) throw new Error(`${tlFile} not found; the Screen Plan phase writes it first`);
  const rows = sceneRows(JSON.parse(readFileSync(tlFile, 'utf8')));
  const words = existsSync(join(dir, 'processed-transcript.json')) ? JSON.parse(readFileSync(join(dir, 'processed-transcript.json'), 'utf8')).words || [] : [];
  const stills = rows.map((e) => exampleStill(root, e.example));
  const childEnv = { ...env };
  delete childEnv.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  for (const style of new Set(stills.map((s) => s.style))) {
    const frames = join(root, 'renders', 'style-examples', style);
    if (stills.filter((s) => s.style === style).every((s) => findFrame(frames, s.at))) continue;
    log(`rendering ${style} example stills (npm run check:style-examples -- ${style}) ...`);
    exec(run, 'node', [join(root, 'scripts', 'check-style-examples.mjs'), style], { cwd: root, env: childEnv, stdio: 'inherit' });
  }
  const tmp = mkdtempSync(join(tmpdir(), 'storyboard-'));
  try {
    mkdirSync(join(tmp, 'img'));
    mkdirSync(join(tmp, 'fonts'));
    mkdirSync(join(tmp, 'vendor'));
    stills.forEach((s, i) => {
      const f = findFrame(join(root, 'renders', 'style-examples', s.style), s.at);
      if (!f) throw new Error(`no still for ${s.clip} at ${s.at} s in renders/style-examples/${s.style}/`);
      copyFileSync(f, join(tmp, 'img', `${String(i).padStart(2, '0')}.png`));
    });
    copyFileSync(join(root, 'vendor', 'gsap.min.js'), join(tmp, 'vendor', 'gsap.min.js'));
    copyFileSync(join(root, 'vendor', 'asset-lib', 'fonts', FONT), join(tmp, 'fonts', FONT));
    const tiles = rows.map((e) => ({ time: `${mmss(e.start)}–${mmss(e.start + e.duration)}`, example: e.example, words: spokenIn(words, e.start, e.start + e.duration) }));
    writeFileSync(join(tmp, 'index.html'), sheetHtml(tiles).html);
    exec(run, 'npx', ['--yes', HYPERFRAMES, 'snapshot', '--at', '0.5', '-o', join(tmp, 'out'), tmp], { env: childEnv, stdio: 'inherit' });
    const png = join(tmp, 'out', 'frame-00-at-0.5s.png');
    if (!existsSync(png)) throw new Error('hyperframes snapshot wrote no storyboard frame');
    mkdirSync(join(dir, 'preview'), { recursive: true });
    const out = join(dir, 'preview', 'storyboard-sheet.jpg');
    exec(run, 'ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', `${out}.part.jpg`]);
    renameSync(`${out}.part.jpg`, out);
    return { out, scenes: rows.length };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test:video`
Expected: `ℹ pass 44`, `ℹ fail 0` (37 existing + 7 new).

- [ ] **Step 5: Commit**

```bash
git add templates/dena-generate scripts/lib/generate.mjs scripts/lib/bgm.mjs scripts/lib/storyboard.mjs scripts/generate-lib.test.mjs package.json
git commit -m "feat(generate): starter without base video; voice step, ducked BGM, storyboard sheet libraries (ADR-0025)"
```

### Task 4: `video new --generate`, `voice`, `bgm`, `storyboard`

**Files:**
- Modify: `scripts/video.mjs`, `package.json` (`test:video`)
- Create: `scripts/generate.test.mjs`

**Interfaces:**
- Consumes: Task 3 exports.
- Produces: `scaffold({ …, generate })`, `resolveDuration({ …, media })`, `main(argv, { run, env, root, fetchImpl })` — returns a promise for `voice` only; the CLI entry awaits it.

- [ ] **Step 1: Write the failing test**

Create `scripts/generate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { briefStub } from './lib/generate.mjs';
import { exampleStill } from './lib/storyboard.mjs';
import { main, resolveDuration, scaffold } from './video.mjs';
import { fakeMedia } from './voice-fixtures.mjs';

const REPO = process.cwd();

function genRoot() {
  const root = mkdtempSync(join(tmpdir(), 'generate-test-'));
  for (const t of ['dena-video', 'dena-generate']) {
    mkdirSync(join(root, 'templates', t), { recursive: true });
    writeFileSync(join(root, 'templates', t, 'hyperframes.json'), '{}');
  }
  writeFileSync(join(root, 'templates/dena-video/index.html'), '<main data-duration="__DURATION__">edit __SLUG__</main>');
  writeFileSync(join(root, 'templates/dena-generate/index.html'), readFileSync(join(REPO, 'templates/dena-generate/index.html'), 'utf8'));
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({ version: 1, default: 'st-f2', presets: { 'st-f2': { provider: 'supertonic', voice: 'F2', speed: 1.05 }, recorded: { provider: 'recorded' } } }));
  return root;
}

// ---------- scaffold ----------

test('new --generate scaffolds the generate starter, research/, and a mode: generate brief', () => {
  const root = genRoot();
  const { dir, duration } = scaffold({ slug: 'ai-agent', root, generate: true });
  assert.equal(duration, 10, 'no voiceover yet: placeholder length');
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.match(html, /data-composition-id="dena-ai-agent"/);
  assert.match(html, /src="processed-audio\.wav"/);
  assert.match(html, /src="bgm\.wav"/);
  assert.doesNotMatch(html, /processed\.mp4|__DURATION__|__SLUG__/);
  assert.ok(existsSync(join(dir, 'research')));
  assert.equal(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), briefStub('ai-agent'));
  assert.match(briefStub('x'), /- mode: generate\n/);
  assert.throws(() => scaffold({ slug: 'ai-agent', root, generate: true }), /already exists; generate mode starts a new project/);
  const edit = scaffold({ slug: 'talk', root, duration: '12' });
  assert.equal(readFileSync(join(edit.dir, 'index.html'), 'utf8'), '<main data-duration="12">edit talk</main>');
});

test('resolveDuration reads the time base the mode names', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dur-'));
  writeFileSync(join(dir, 'processed-audio.wav'), 'RIFF');
  const probe = (f) => (f.endsWith('processed-audio.wav') ? 41.2 : assert.fail(`probed ${f}`));
  assert.equal(resolveDuration({ dir, probe, media: 'processed-audio.wav' }), 41.2);
  assert.equal(resolveDuration({ dir, probe }), 10, 'edit mode looks for processed.mp4');
});

// ---------- voice ----------

test('video voice reads script.md with the default preset and writes the edit-path audio and transcript', async () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'demo', root, generate: true });
  await assert.rejects(main(['voice', 'demo'], { root, env: {}, run: fakeMedia().run }), /script\.md not found; the Story phase writes the script first/);
  writeFileSync(join(dir, 'script.md'), '# Naskah\n\nJujur, gue kira gampang.\n\nTernyata susah.\n');
  const media = fakeMedia({ durations: { 'voiceover.wav': 4.35 } });
  const meta = await main(['voice', 'demo'], { root, env: {}, run: media.run });
  assert.equal(meta.preset, 'st-f2');
  assert.equal(readFileSync(join(dir, 'processed-audio.wav'), 'utf8'), 'RIFF');
  const t = JSON.parse(readFileSync(join(dir, 'processed-transcript.json'), 'utf8'));
  assert.deepEqual(t.segments.map((s) => s.text), ['Jujur, gue kira gampang.', 'Ternyata susah.']);
  assert.equal(t.words.length, 6);
  assert.equal((readFileSync(join(dir, 'index.html'), 'utf8').match(/data-duration="4\.35"/g) || []).length, 4);
  await assert.rejects(main(['voice', 'demo', '--preset', 'recorded'], { root, env: {}, run: media.run }), /is a recording; generate mode reads the script with a TTS preset/);
  const cfg = JSON.parse(readFileSync(join(root, 'config/voices.json'), 'utf8'));
  cfg.default = null;
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify(cfg));
  await assert.rejects(main(['voice', 'demo'], { root, env: {}, run: media.run }), /no voice preset: pass --preset/);
  assert.throws(() => main(['voice', 'ghost'], { root, env: {}, run: media.run }), /npm run video -- new ghost --generate/);
});

// ---------- bgm ----------

function bgmRoot() {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'demo', root, generate: true });
  mkdirSync(join(root, 'shared/music/licenses'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-calm.mp3'), 'mp3');
  writeFileSync(join(root, 'shared/music/licenses/m01-calm.txt'), 'proof');
  const sha = createHash('sha256').update('mp3').digest('hex');
  const track = { id: 'm01-calm', file: 'm01-calm.mp3', title: 'Calm', author: 'A', sourceUrl: 'https://x/', license: 'cc0', licenseProof: 'licenses/m01-calm.txt', sha256: sha, duration: 20, mood: ['reflektif'], energy: 2, rejected: false };
  const catalog = { version: 1, tracks: [track, { ...track, id: 'm02-no', file: 'm01-calm.mp3', rejected: true }] };
  return { root, dir, catalog };
}

test('video bgm refuses before the voiceover exists, rejected tracks, and a failed check; then writes bgm.wav + bgm.json', () => {
  const { root, dir, catalog } = bgmRoot();
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify(catalog));
  assert.throws(() => main(['bgm', 'demo', '--track', 'm01-calm'], { root, env: {}, run: fakeMedia().run }), /processed-audio\.wav not found; run npm run video -- voice <slug> first/);
  writeFileSync(join(dir, 'processed-audio.wav'), 'RIFF');
  assert.throws(() => main(['bgm', 'demo'], { root, env: {}, run: fakeMedia().run }), /bgm needs --track/);
  assert.throws(() => main(['bgm', 'demo', '--track', 'm02-no'], { root, env: {}, run: fakeMedia().run }), /was rejected in the Studio/);
  const media = fakeMedia({ durations: { 'processed-audio.wav': 34.759 } });
  const meta = main(['bgm', 'demo', '--track', 'm01-calm', '--from', '2'], { root, env: {}, run: media.run });
  assert.deepEqual([meta.track, meta.from, meta.copies, meta.gainDb], ['m01-calm', 2, 2, -10]);
  const measure = media.calls.find((c) => c[0] === 'ffmpeg' && c.includes('null'));
  assert.deepEqual(measure.slice(1, 7), ['-hide_banner', '-nostats', '-ss', '2', '-t', '18']);
  assert.equal(readFileSync(join(dir, 'bgm.wav'), 'utf8'), 'RIFF');
  assert.equal(JSON.parse(readFileSync(join(dir, 'bgm.json'), 'utf8')).sha256, createHash('sha256').update('RIFF').digest('hex'));
  catalog.tracks[0].sha256 = 'nope';
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify(catalog));
  assert.throws(() => main(['bgm', 'demo', '--track', 'm01-calm'], { root, env: {}, run: media.run }), /sha256 does not match.*npm run music -- check/);
});

// ---------- storyboard ----------

const TIMELINE = {
  elements: [
    { id: 'ov-001', type: 'hook-card', track: 5, start: 0, duration: 3, placement: 'top-card' },
    { id: 'ov-003', type: 'motion-graphic', track: 7, start: 3, duration: 4, placement: 'full', example: 'mg-01-count' },
    { id: 'ov-002', type: 'whiteboard', track: 4, start: 0, duration: 3, placement: 'full', example: 'wb-01-flow' },
  ],
};

test('video storyboard renders missing stills, snapshots the sheet, and writes preview/storyboard-sheet.jpg', () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'demo', root, generate: true });
  assert.throws(() => main(['storyboard', 'demo'], { root, env: {}, run: fakeMedia().run }), /overlay-timeline\.json not found; the Screen Plan phase writes it first/);
  writeFileSync(join(dir, 'overlay-timeline.json'), JSON.stringify(TIMELINE));
  writeFileSync(join(dir, 'processed-transcript.json'), JSON.stringify({ words: [{ start: 0.2, text: 'Jujur,' }, { start: 3.4, text: '70%' }] }));
  cpSync(join(REPO, 'docs/agents/references/style-examples'), join(root, 'docs/agents/references/style-examples'), { recursive: true });
  mkdirSync(join(root, 'vendor/asset-lib/fonts'), { recursive: true });
  writeFileSync(join(root, 'vendor/gsap.min.js'), '//');
  writeFileSync(join(root, 'vendor/asset-lib/fonts/plus-jakarta-sans-latin-wght-normal.woff2'), 'f');
  mkdirSync(join(root, 'renders/style-examples/whiteboard'), { recursive: true });
  writeFileSync(join(root, 'renders/style-examples/whiteboard/frame-00-at-2.5s.png'), 'wb');
  const mgAt = exampleStill(REPO, 'mg-01-count').at;
    const calls = [];
    const run = (cmd, args, opts = {}) => {
      calls.push([cmd, ...args]);
      if (cmd === 'npx' || cmd === 'node') assert.equal(opts.env?.GEMINI_API_KEY, undefined, 'no frames to Gemini');
      if (cmd === 'node') {
        mkdirSync(join(root, 'renders/style-examples/motion-graphic'), { recursive: true });
        writeFileSync(join(root, `renders/style-examples/motion-graphic/frame-00-at-${mgAt}s.png`), 'mg');
        return { status: 0 };
      }
      if (cmd === 'npx') {
        const out = args[args.indexOf('-o') + 1];
        const tmp = args.at(-1);
        assert.match(readFileSync(join(tmp, 'index.html'), 'utf8'), /<b>2<\/b> 0:03\.0–0:07\.0 · mg-01-count<br \/>70%/);
        assert.equal(readFileSync(join(tmp, 'img/00.png'), 'utf8'), 'wb');
        mkdirSync(out, { recursive: true });
        writeFileSync(join(out, 'frame-00-at-0.5s.png'), 'png');
        return { status: 0 };
      }
      if (cmd === 'ffmpeg') {
        writeFileSync(args.at(-1), 'jpg');
        return { status: 0 };
      }
      return { status: 1 };
    };
    const r = main(['storyboard', 'demo'], { root, env: { GEMINI_API_KEY: 'k' }, run });
    assert.equal(r.scenes, 2);
    assert.equal(readFileSync(join(dir, 'preview/storyboard-sheet.jpg'), 'utf8'), 'jpg');
  assert.deepEqual(calls.filter((c) => c[0] === 'node').map((c) => c.at(-1)), ['motion-graphic'], 'only the style with a missing still is rendered');
});
```

In `package.json`, change `test:video` to end with `scripts/generate-lib.test.mjs scripts/generate.test.mjs"`.

Run: `node --test scripts/generate.test.mjs`
Expected: FAIL (e.g. the scaffold test writes the edit starter; `voice` is an unknown command).

- [ ] **Step 2: Wire the commands**

Save as `/tmp/task4-video.py` and run `python3 /tmp/task4-video.py` from the repo root (expected `task4 video.mjs ok`):

```python
# Task 4: wire generate mode into scripts/video.mjs (run from the repo root). Each edit asserts its anchor exists once.
def edit(path, old, new):
    s = open(path).read()
    assert s.count(old) == 1, f'{path}: expected 1 match for {old[:60]!r}, got {s.count(old)}'
    open(path, 'w').write(s.replace(old, new))

V = 'scripts/video.mjs'
edit(V, """// Multi-source spec: docs/superpowers/specs/2026-09-29-multi-source-projects-design.md (ADR-0022)
// Node 22+, built-in modules only (ADR-0007).""", """// Multi-source spec: docs/superpowers/specs/2026-09-29-multi-source-projects-design.md (ADR-0022)
//        npm run video -- new <slug> --generate   (generate mode: templates/dena-generate, research/, brief stub)
//        npm run video -- voice <slug> [--preset <p>]   (script.md -> voice/, processed-audio.wav, processed-transcript.json)
//        npm run video -- bgm <slug> --track <id> [--from <s>]   (shared/music track -> ducked bgm.wav + bgm.json)
//        npm run video -- storyboard <slug>   (overlay-timeline.json scenes -> preview/storyboard-sheet.jpg)
// Generate-mode spec: docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md (ADR-0025)
// Node 22+, built-in modules only (ADR-0007).""")
edit(V, "import { parseArgs } from 'node:util';", "import { parseArgs, parseEnv } from 'node:util';")
edit(V, "import { applyMigration, formatPlan, planMigration } from './lib/migrate-sources.mjs';", "import { runBgm } from './lib/bgm.mjs';\nimport { GENERATE_TEMPLATE, briefStub, voiceStep } from './lib/generate.mjs';\nimport { applyMigration, formatPlan, planMigration } from './lib/migrate-sources.mjs';\nimport { runStoryboard } from './lib/storyboard.mjs';")
edit(V, """export function resolveDuration({ duration, dir, probe = probeDuration }) {
  if (duration !== undefined) {
    const d = Number(duration);
    if (!(d > 0)) throw new Error('--duration must be > 0');
    return d;
  }
  const media = join(dir, 'processed.mp4');
  return existsSync(media) ? probe(media) : 10;
}""", """// The project's time base: processed.mp4 (edit) or processed-audio.wav, the voiceover (generate).
export function resolveDuration({ duration, dir, probe = probeDuration, media = 'processed.mp4' }) {
  if (duration !== undefined) {
    const d = Number(duration);
    if (!(d > 0)) throw new Error('--duration must be > 0');
    return d;
  }
  const file = join(dir, media);
  return existsSync(file) ? probe(file) : 10;
}""")
edit(V, """export function scaffold({ slug, root = '.', duration, probe }) {
  const dir = projectDir(slug, root);
  const index = join(dir, 'index.html');""", """export function scaffold({ slug, root = '.', duration, probe, generate = false }) {
  const dir = projectDir(slug, root);
  if (generate && hasEntry(dir)) throw new Error(`${dir} already exists; generate mode starts a new project`);
  const index = join(dir, 'index.html');""")
edit(V, """  if (!hasEntry(join(dir, 'sources.json'))) writeManifest(dir, { version: 1, sources: [] });
  const d = resolveDuration({ duration, dir, probe });
  const tpl = join(root, TEMPLATE);""", """  if (!hasEntry(join(dir, 'sources.json'))) writeManifest(dir, { version: 1, sources: [] });
  if (generate) {
    mkdirSync(join(dir, 'research'), { recursive: true });
    writeFileSync(join(dir, 'creative-brief.md'), briefStub(slug));
  }
  const d = resolveDuration({ duration, dir, probe, media: generate ? 'processed-audio.wav' : 'processed.mp4' });
  const tpl = join(root, generate ? GENERATE_TEMPLATE : TEMPLATE);""")
edit(V, """      throw new Error(`unknown command "${cmd}" (use new, sources, cut, check, dev, snapshot, render, cutout, layers, migrate-sources)`);""", """      throw new Error(`unknown command "${cmd}" (use new, sources, cut, voice, bgm, storyboard, check, dev, snapshot, render, cutout, layers, migrate-sources)`);""")
edit(V, """export function main(argv, { run = spawnSync, env = process.env, root = '.' } = {}) {""", """export function main(argv, { run = spawnSync, env = process.env, root = '.', fetchImpl = fetch } = {}) {""")
edit(V, """      detected: { type: 'boolean', default: false }, remove: { type: 'string' }, apply: { type: 'boolean', default: false },
    },""", """      detected: { type: 'boolean', default: false }, remove: { type: 'string' }, apply: { type: 'boolean', default: false },
      generate: { type: 'boolean', default: false }, preset: { type: 'string' }, track: { type: 'string' },
    },""")
edit(V, """  if (cmd === 'new') {
    const { dir, duration } = scaffold({ slug, root, duration: values.duration });
    console.log(`created ${dir} (${duration} s)`);
    return;
  }""", """  if (cmd === 'new') {
    const { dir, duration } = scaffold({ slug, root, duration: values.duration, generate: values.generate });
    console.log(`created ${dir} (${duration} s${values.generate ? ', generate mode' : ''})`);
    return;
  }
  if (cmd === 'voice' || cmd === 'bgm' || cmd === 'storyboard') {
    const dir = projectDir(slug, root);
    if (!existsSync(dir)) throw new Error(`${dir} not found; run npm run video -- new ${slug} --generate`);
    if (cmd === 'voice') {
      // .env is read into this call's env only; process.env (and every child process) stays as it was
      const fileEnv = existsSync(join(root, '.env')) ? parseEnv(readFileSync(join(root, '.env'), 'utf8')) : {};
      return voiceStep({ dir, root, preset: values.preset, env: { ...fileEnv, ...env }, fetchImpl, run }).then((meta) => {
        console.log(`voice ${join(dir, 'processed-audio.wav')} (${meta.duration} s, preset ${meta.preset}${meta.alignment ? `, WER ${meta.alignment.wer}` : ''})`);
        for (const w of meta.warnings) console.log(`warning: ${w}`);
        return meta;
      });
    }
    if (cmd === 'bgm') {
      if (!values.track) throw new Error('bgm needs --track <id> (npm run music -- list)');
      const meta = runBgm({ dir, root, trackId: values.track, from: values.from ?? 0, run });
      console.log(`bgm ${join(dir, 'bgm.wav')} (${meta.track} from ${meta.from} s, ${meta.copies} cop${meta.copies === 1 ? 'y' : 'ies'}, gain ${meta.gainDb} dB)`);
      return meta;
    }
    const r = runStoryboard({ dir, root, run, env, log: console.log });
    console.log(`storyboard ${r.out} (${r.scenes} scenes)`);
    return r;
  }""")
edit(V, """if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}""", """if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fail = (e) => {
    console.error(e.message);
    process.exit(1);
  };
  try {
    const r = main(process.argv.slice(2));
    if (r?.then) r.catch(fail); // video voice is async
  } catch (e) {
    fail(e);
  }
}""")
print('task4 video.mjs ok')
```

- [ ] **Step 3: Run the tests**

Run: `npm run test:video`
Expected: `ℹ pass 49`, `ℹ fail 0`.

- [ ] **Step 4: Commit**

```bash
git add scripts/video.mjs scripts/generate.test.mjs package.json
git commit -m "feat(video): new --generate, voice, bgm, storyboard commands (RD-03-75..86, RD-06-23..28)"
```

### Task 5: Real smoke and review

**Files:** none unless a check fails (fix in the owning task's files).

- [ ] **Step 1: All suites** — `for s in test:voice test:music test:studio test:video test:repliz test:style-kit test:motion-kit test:craft-kit test:render-blur test:asset-lib; do npm run --silent $s 2>&1 | grep -E "^ℹ (pass|fail)"; done` → voice 41, music 8, studio 32, video 49, the rest unchanged, all `fail 0`.
- [ ] **Step 2: Smoke project.** In the repo (`videos/` is gitignored):

```bash
npm run video -- new smoke-gen --generate
printf '# Naskah smoke\n\nJujur, gue kira bikin AI agent itu gampang.\n\nTernyata yang bikin pusing justru deploy workflow-nya.\n\n## Fakta\n\n- tidak ada angka\n' > videos/smoke-gen/script.md
npm run video -- voice smoke-gen            # expect ~5 s, preset supertonic-f2, WER <= 0.1
grep -o 'data-duration="[0-9.]*"' videos/smoke-gen/index.html | sort | uniq -c   # four equal to the voice length, one 1.3 (comment)
npm run video -- bgm smoke-gen --track "$(npm run --silent music -- list --mood tech-ringan | head -1 | cut -f1)" --from 0
```

Write `videos/smoke-gen/overlay-timeline.json` with two scene rows (`placement: "full"`, `example`: `wb-01-flow` 0–2.6 s track 4, `tx-01-slam` 2.4–end track 7), then `npm run video -- storyboard smoke-gen` and open `videos/smoke-gen/preview/storyboard-sheet.jpg` (two labelled tiles). Copy `docs/agents/references/style-examples/whiteboard/compositions/wb-01-flow.html` and `.../broll-text/compositions/tx-01-slam.html` into `videos/smoke-gen/compositions/broll/`, mount them (class `broll`, ids `wb-01-flow-mount` / `tx-01-slam-mount`, tracks 4/7), add one caption, then `npx --yes hyperframes@0.7.24 lint videos/smoke-gen` (0 errors) and `validate` (no console errors), and `npm run video -- render smoke-gen`: 1080×1920, stereo 48 kHz, integrated loudness about −16 LUFS. (`video check` may report `inspect` overflow from the example clip's camera layers — a per-scene Build matter, see the amendments.) Then `rm -rf videos/smoke-gen`.
- [ ] **Step 3: Review.** Use superpowers:requesting-code-review for Tasks 1–4 and fix Critical/Important findings before Task 6.

### Task 6: First real explainer with Dena

Human gates — stop at each and wait.

- [ ] **Step 1: Ask Dena for the input**: a topic/brief, a URL/article/thread, or an older project to rewrite; target platform. Choose a slug.
- [ ] **Step 2: Story (generate)** — `npm run video -- new <slug> --generate`, then follow `docs/agents/01-story.md` (Mode generate) and `generate-mode.md`: research, `script.md` with `## Fakta`, `npm run video -- voice <slug>` (default `supertonic-f2` unless Dena picks another preset), brief and Script Summary.
- [ ] **Step 3: Gate 1** — send Dena `script.md` and `processed-audio.wav` (`! afplay videos/<slug>/processed-audio.wav`). Revise until approved.
- [ ] **Step 4: Screen Plan (generate)** — captions (hybrid), `## Style World`, scene rows, `## Music`, `storyboard.md`, `npm run video -- storyboard <slug>`.
- [ ] **Step 5: Gate 2** — show the sheet, style world, and music; record `## Gate 2 Result`.
- [ ] **Step 6: Build (generate)** — `npm run video -- bgm …`, scenes, captions, Still Check, `npm run video -- check <slug>`, `npm run video -- render <slug>`.
- [ ] **Step 7: Gate 3** — offer approve / QA first / revise, as in `03-build.md`. Record workflow learnings in `generate-mode.md` in the same turn (commit with the docs they touch).
