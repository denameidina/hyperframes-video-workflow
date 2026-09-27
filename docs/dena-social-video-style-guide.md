# Dena Social Video Style Guide

Snapshot date: 2026-07-02

Use this before editing any Dena Meidina social video in this project. The goal is: preserve Dena's current IG/TikTok identity, then make the pacing, audio, captions, overlays, and retention stronger.

## Workflow Contract

This file defines Dena's social-video style and editing standards. It does not replace the execution workflow.

For every Dena social-video task, start with:

`docs/skills/dena-video-editing-workflow/SKILL.md`

Then route the work through the phase documents in `docs/agents/`:

1. `01-story.md` - source audit, transcript, angle, hook locked from transcript, cuts, base pacing, `processed.mp4`.
2. `02-screen-plan.md` - captions, then one visual plan: visual choices, overlay timing, pattern interrupts, zooms, SFX cues.
3. `03-build.md` - asset production, `index.html`, timed clips, tracks, GSAP, local asset wiring, render.
4. Optional at user review/publish gate: `04-qa.md` - QA, punch list, render/platform readiness review.

Do not jump to HyperFrames assembly before the Story and Screen Plan artifacts exist or are explicitly marked unnecessary.

## Public Profile Context

- Instagram: `https://www.instagram.com/denameidina11/`
- TikTok: `https://www.tiktok.com/@denameidina11`
- Brand/persona: Dena Meidina, AI Systems Builder, Senior Developer, founder/operator.
- Bio signals:
  - IG: "Dena | AI Systems Builder", Founder `@nafanesia.id`, Co-founder `@tumbuhaiofficial`, "Bangun sistem AI untuk bisnis nyata".
  - TikTok: "Dena Meidina | Senior Flutter Dev", "Belajar ngebacot sampai jago", mission around Flutter class.
- Main content lanes:
  - AI agent workflow, AI engineering, product building.
  - Founder/build-in-public journey: Nafanesia, ERP, CRM, client delivery.
  - Leadership/management/human skills.
  - Developer life and reflective vlog.
  - Family/lifestyle vlog when relevant.

Access note: Instagram profile/timeline metadata was readable publicly. TikTok direct page was WAF-blocked, but public metadata and video list were readable through a TikTok mirror API. Do not invent details from videos that were not inspected.

## Voice

Default language: Indonesian.

Use Dena's natural register:

- Use `gue`, `lo`, `menurut gue`, `jujur`, `ternyata`, `dari situ gue sadar`.
- Avoid stiff corporate Indonesian unless the source video is formal.
- Keep reflective founder/developer tone: honest, practical, observational.
- Make the video feel like a real lesson from work/life, not a generic motivational post.

Common narrative pattern:

1. Everyday scene or problem.
2. Unexpected friction or plot twist.
3. Realization.
4. Practical principle.
5. CTA question or save/share prompt.

## Existing Visual Style To Preserve

Default format:

- Vertical 9:16 for TikTok, Reels, Shorts.
- Talking-head or handheld vlog.
- Hook text in the top safe area:
  - Black rounded rectangle.
  - White text.
  - 2-4 lines max.
  - Clear problem/curiosity in the first 3 seconds.
- Main captions:
  - Bold uppercase or title-case.
  - White text with heavy black stroke/shadow.
  - Yellow emphasis for the key word/phrase.
  - 1-4 words per beat.
  - Position: lower-middle/bottom safe area, avoid covering mouth/important object.
- Current style is simple and readable. Improve it with better rhythm and smarter overlays, not by making it visually noisy.

Observed strong hook style:

- "Pagi coding Flutter, sore panen telur. Plot twistnya bikin gue kaget!"
- "Kalau AI lo bisa ngoding, tapi hasil UI-nya masih jelek... coba pakai cara ini."

## Editing Goals

Every edit should optimize for:

- Stop scroll with a transcript-derived spoken hook in the first 3 seconds:
  move the verbatim core tension or peak problem to `00:00.00`, end it by
  `00:03.00`, then continue into the explanation.
- Remove dead air and repeated thinking.
- Keep the authentic monologue.
- Make captions easy to read without pausing.
- For storytelling/talking-head content, make the whole surviving speech followable while muted: every spoken word must be represented by active running caption beats.
- Add contextual overlays only when they clarify or re-engage.
- End with a clear CTA that matches the topic.
- Keep CTA non-promissory unless the user explicitly asks to promise a follow-up, download, source code, or future breakdown.

Do not over-edit into generic CapCut chaos. Dena's style is credible developer/founder content, not meme spam.

## Default Edit Pipeline

When user provides a raw vlog/monologue video:

1. Story phase (`docs/agents/01-story.md`)
   - Get duration, fps, resolution, audio levels.
   - Identify whether it is talking-head, handheld vlog, or mixed.
   - Check if existing burned-in captions/text exist.
   - Transcribe word-level before choosing the hook.
   - Choose content lane, hook tension, format, retention spine, visual grammar,
     visual density, and CTA.
   - From the complete transcript, rank at least three hook candidates and lock
     one verbatim excerpt containing the core tension or peak problem.
   - Move the locked excerpt to processed output `00:00.00-00:03.00`, remove its
     later duplicate unless it is an intentional callback, then continue with
     the explanation.
   - Cut silence/dead air.
   - Cut filler and repeated starts when meaning stays intact.
   - Keep human texture; do not remove every pause if it makes speech unnatural.
   - Build a tighter retention structure: hook, problem, insight, example, takeaway, CTA.
   - Write `creative-brief.md`, `metadata.json`, `transcript.json`, `edit-decision-notes.md`, and `cut-list.json`; after `processed.mp4`, write `processed-transcript.json`.

2. Audio cleanup and timing (Story phase, when creating `processed.mp4`)
   - Reduce noise.
   - Normalize speech loudness.
   - Enhance clarity.
   - Avoid harsh over-compression.
   - Default speed: `1.2x`.
   - If the speech becomes too rushed, use `1.12x-1.18x`.
   - Any exception to `1.2x` must be written in `edit-decision-notes.md` with the reason.
   - Keep cuts on sentence/phrase boundaries where possible.
   - Gate 1 (optional): show `processed.mp4` and the Cut Summary only when the user asks or `gate_cut: on`.

3. Caption plan (Screen Plan phase, captions step)
   - Create readable caption beats, hook text, ASR corrections, and highlight logic.
   - For storytelling/talking-head edits, cover every spoken word that survives the cut with running active captions; group words into readable 1-4 word beats instead of dropping words.
   - Write `caption-plan.md`, `caption-beats.json`, and `publish-captions.md`.

4. Visual plan (Screen Plan phase, visual step)
   - Decide which moments need screenshots, generated visuals, b-roll, diagrams, proof assets, overlays, cards, zooms, effects, or pattern interrupts.
   - If the user gives a URL or the story mentions a live tool/product/site, research/inspect it and plan local screenshots, screen recordings, or captures matched to the transcript timeline.
   - For every visual-support opportunity, write a `Visual Decision Log` entry in `visual-plan.md`; try Codex/image generation for grounded bitmap stills when a mood, abstract workflow, reset-attention, texture, transition, or background moment would otherwise become a stiff card/SVG.
   - Do not generate AI slop: reject generic, fake-looking, or transcript-detached generated assets.
   - Plan purposeful SFX cues for designed recuts, and keep them audible under speech instead of merely present as files.
   - Skip visuals only when they are explicitly unnecessary, and record that in `visual-plan.md`.
   - Write `visual-plan.md` and `overlay-timeline.json`.
   - Gate 2: stop only when a timeline row matches a risk trigger R1-R6.

5. Assets and visual layers in HyperFrames (Build phase)
   - Capture/generate the planned assets and record them in `assets/asset-manifest.json`.
   - Video/audio base layer.
   - Caption layer.
   - Effect layer.
   - Context overlay layer: text/sticker/image/video/screenshot.
   - CTA/end layer.
   - Keep layers editable until final render.

6. User review gate and optional QA
   - Render and send the edit to the user first (Gate 3).
   - Offer: publish as-is, QA first, or revisions.
   - Run the QA phase only when the user chooses QA first or asks for readiness/punch-list review, as a fresh-context subagent.
   - If QA runs, write `qa-report.md` and `qa-punch-list.md`.
   - Create `final-approval.md` only after QA passes.

## HyperFrames Layer Contract

Use separate tracks so the user can edit each layer independently later.

Suggested track indexes:

- `data-track-index="1"`: processed main video and audio.
- `data-track-index="2"`: captions/subtitles.
- `data-track-index="3"`: retention effects, emphasis flashes, zoom labels, progress markers.
- `data-track-index="4"`: contextual overlays: stickers, screenshots, images, b-roll, mini clips.
- `data-track-index="5"`: hook card, big takeaway, CTA/end card.

Rules:

- Every timed visual element needs `class="clip"`, `data-start`, `data-duration`, `data-track-index`.
- Register a paused timeline in `window.__timelines`.
- Keep deterministic logic: no `Math.random()`, no `Date.now()`, no network fetches in render path.
- Use local assets only inside the project.
- Prefer simple GSAP opacity/scale/y transitions.

## Caption Style Defaults

Storytelling coverage:

- Default Dena storytelling/talking-head edits use running captions, not sparse quote captions.
- Every spoken word that survives the cut must appear in the caption system, either in a short phrase beat or a deliberate word-level beat.
- It is acceptable to group small function words with nearby meaning words; it is not acceptable to omit meaningful speech just to make captions look cleaner.
- Sparse editorial titles may replace full running captions only for an explicitly chosen cinematic/manifesto section, and that tradeoff must be documented in `caption-plan.md`.

Base:

- Font: heavy sans, close to TikTok/Reels bold caption style.
- Fill: white.
- Stroke/shadow: black, thick enough for busy backgrounds.
- Keyword fill: yellow.
- Max words visible: 1-6, but ideal 1-4.
- Use Indonesian transcript verbatim except when shortening repeated filler.

Caption rhythm:

- Break on phrase meaning, not arbitrary word count.
- Highlight one keyword per phrase.
- Use yellow sparingly so it means something.
- Avoid full paragraph captions.

Examples:

- `KALI INI SAYA` with `KALI` in yellow.
- `TERUS NGGAK PUNYA` with `NGGAK` in yellow.
- `AI BUKAN PILOT` with `BUKAN` in yellow.

## Hook Rules

First 3 seconds decide the video.

Default editorial flow:

1. Read the complete transcript before locking the opening audio.
2. Select a contiguous, verbatim phrase that carries the core tension, peak
   problem, contradiction, proof, or curiosity gap without giving away the
   answer.
3. Place it at output `00:00.00` and end it no later than `00:03.00` after the
   speed adjustment.
4. Continue immediately with the original explanation/setup and remove the
   hook's later duplicate unless the brief calls for a documented callback.
5. Use the same spoken words in the hook card so muted viewers receive the same
   claim.

Shorten the source only by removing silence or filler while preserving meaning.
If no intact phrase fits the window, stop and ask the user
instead of fabricating dialogue or splicing separate words into a new claim.

Default hook shape:

- Top black rounded rectangle, white text.
- Make a specific payoff, conflict, or curiosity gap.
- It should work even with audio muted.

Hook formulas for Dena:

- "Kalau [target] lo masih [pain], coba cara ini."
- "Gue kira [assumption]... ternyata [twist]."
- "Kesalahan terbesar gue waktu [topic] adalah ini."
- "AI bisa bantu [thing], tapi ada satu masalah besar."
- "Hari ini gue belajar satu hal yang nggak kelihatan dari dashboard."

Avoid:

- "Di video ini saya akan..."
- Generic motivational quotes.
- Hooks that reveal the full answer too early.

## Reference Adaptation Rules

Use viral references as editing evidence, not as costumes.

When adapting a reference such as a cinematic character manifesto:

- Extract the mechanic: hook contrast, title rhythm, montage structure, aura/proof beats, humanizer ending, loop frame.
- Preserve Dena's identity: AI systems builder, senior developer, founder/operator.
- Keep the visual grammar aligned with the chosen content lane.
- Translate the reference into Dena's voice and topic.
- Use reference colors, typography, and pacing only when they serve the new brief.

Do not copy:

- the creator's persona
- exact title wording
- exact palette by default
- villain/dark identity when Dena's topic is practical or human
- cinematic seriousness without a grounded Dena moment

For Kumar-inspired edits, adapt the structure only: identity contrast, bold mission, sparse title captions, aura/proof montage, and human release. Do not default to a red-black villain palette unless the Story phase brief explicitly chooses that direction.

## Overlay / Sticker / B-Roll Rules

Use overlays to clarify context or reset attention every 4-8 seconds.

Good overlays:

- Motion b-roll: one morphing shape + cursor that shows the process, tool, comparison, or step Dena is talking about (`docs/agents/references/motion-broll-planning.md`).
- Style b-roll: kinetic text, flat motion graphics, whiteboard drawing, paper stop-motion, a VOX document with a highlighted source, a mix-media collage with Dena still talking, or a 2.5D parallax scene — when the words, a spoken number, a framework, handmade objects, a source, or Dena's presence are the point (`docs/agents/references/styles/README.md`).
- Screenshot of tool/app when mentioning a tool.
- Small UI mock/screenshot when talking about frontend.
- Simple checklist card for frameworks, scope, requirements.
- Quote card for the core lesson.
- Tiny icon/sticker only when it reinforces meaning.
- B-roll from source vlog when the video is not talking-head.

Bad overlays:

- Random stickers unrelated to transcript.
- Too many emojis.
- Full-screen graphics that hide the speaker for too long.
- Dense text blocks.

Default visual language for tech/founder monologues:

- Clean black/white/yellow caption system.
- Motion b-roll in the same palette: `#050505`, white, one yellow accent.
- Style b-roll may use its own palette per clip, written in its Style B-roll Brief; captions, hook card, and CTA stay in the Dena system.
- Occasional glass/black cards.
- Minimal accent lines.
- Screenshots and UI cards when context demands.

Revision learnings from raw talking-head workflow edits:

- If feedback says the video feels boring, first add purposeful motion and pattern interrupts before changing the core story.
- If feedback says too much transcript was cut, restore only the missing context. Keep the compact version if it feels denser and more rewatchable; do not lengthen just to prove the transcript was preserved.
- If caption feedback says words are missing, regenerate captions from the locked processed word-level transcript instead of making sparse highlight captions.
- If image assets are needed, prefer real screenshots, screen recordings, UI crops, generated stills, simple diagrams, or designed cards based on the transcript context. Avoid generic AI b-roll that looks detached from the actual workflow.
- Do not skip generated stills by default. If a visual plan uses only screenshots, SVGs, labels, or text cards, the `Visual Decision Log` in `visual-plan.md` must explain the imagegen decision per visual opportunity.
- If a user gives a link, inspect/research it and capture local visual proof where useful; do not rely only on generic cards to explain that link.
- Use purposeful SFX for transitions, card hits, emphasis, and proof reveals when it supports the speech. Do not cover the talking-head audio.
- If SFX feedback says there is no sound, measure the SFX stem and final render audio before approval. Too-quiet cues should be treated as missing, then boosted until they are audible but still under speech.
- If caption, asset, and motion timing feels detached, regenerate timing from the locked processed audio transcript and use one shared cue map for captions, cards, feature chips, zooms, and SFX.
- If raw footage intentionally shows source code/editor proof, do not cover it with a large context/privacy card. Put a compact callout in unused top/side space and blur private data upstream only when needed.
- Whisper word-level timings are token interpolations and drift up to ~1.4s across pauses. Do not cut on them. Cut on amplitude: `silencedetect` for candidate boundaries, then per-window `volumedetect` to confirm each cut sits >=18 dB under the speech peak. Segment-level timings are reliable; word-level are not.
- Whisper normalizes colloquial register on 1.2x audio (udah->sudah, nggak->tidak, masukin->masukkan, nambahin->menambahin). Captions must restore Dena's spoken forms; transcribe the raw-speed audio too when in doubt, and cross-check tool/UI terms against on-screen frames (e.g. "briefing atau QA" was misheard as "gripping atau KE", corrected from the app's `Dari brief`/`Dari QA` tabs).
- A base master limited to -1.0 dBFS true-peak leaves no headroom for SFX on loud lines: a bass hit under the loudest word will clip. Either master `processed.mp4` with ~2 dBFS headroom before layering SFX, or skip the SFX accent on the hottest moments and let the visual punch carry it. Always measure the final render for clipped samples (`astats` peak count), not just file presence.
- If the final HyperFrames render clips (astats `Max level` > 1.0), fix it without re-rendering: run the render audio through `alimiter=limit=0.8,loudnorm=I=-14:TP=-1.5:LRA=11` with `-c:v copy`. Re-verify `astats` after (AAC re-encode adds overshoot, so limit below the ceiling).
- DJI/phone raw is often stored 1920x1080 with `rotation=-90` (displays 1080x1920). In an ffmpeg `filter_complex`, `[0:v]` is already auto-rotated to upright — adding `transpose` rotates it AGAIN to sideways. In filter_complex do not add transpose (autorotate handles it); or use `-noautorotate` + `transpose`. Verify orientation with a frame grab before the long encode.
- HyperFrames memuxing banyak elemen `<audio>` dengan benar, dan `data-volume` bekerja
  persis seperti perhitungan (peak file + 20*log10(volume)). Tetapi **`data-media-start`
  pada elemen `<audio>` membuat klip itu senyap total di render** — bukan bergeser, tapi
  hilang. Kalau butuh potongan tertentu dari sebuah file SFX, potong file-nya lebih dulu
  dengan ffmpeg dan rujuk file hasil potongan itu. Diuji terpisah dengan komposisi 3 detik.
- Jangan percaya durasi file SFX dari manifest sebagai durasi bunyinya. `riser.mp3`
  berdurasi 10.03s tapi isinya hanya 0-5s; sisanya senyap. Petakan envelope-nya dulu
  (`volumedetect` per 0.5s) sebelum menentukan titik potong dan waktu cue.
- SFX yang duduk di bawah suara **tidak akan terlihat** pada perbandingan `volumedetect`
  antara render dan `processed.mp4`: puncak speech mendominasi window-nya, dan kedua file
  tidak sample-aligned sehingga selisih 0.2-0.8 dB tidak berarti apa-apa. Untuk memastikan
  sebuah cue benar-benar masuk, render komposisi uji pendek yang hanya berisi cue tersebut,
  lalu ukur. Cue yang berada di window senyap (mis. riser) adalah satu-satunya yang bisa
  diverifikasi langsung dari render penuh.
- Untuk menutup wajah anak pada footage bergerak, jangan mengandalkan satu overlay yang
  di-keyframe saja. Deteksi wajah per-frame (macOS Vision lewat Swift) memberi posisi yang
  akurat selama kamera stabil, tapi gagal total saat whip pan karena motion blur — dan
  justru di situlah risikonya. Dua hal wajib: (1) anchor manual dari pembacaan frame untuk
  bagian whip, (2) cover kedua yang lebih besar dan diam menutup posisi tujuan lompatan
  kamera, karena frame persis terjadinya lompatan bisa meleset 1-2 frame antara waktu
  ekstraksi ffmpeg dan waktu seek komposisi. Verifikasi akhir harus frame-demi-frame pada
  MP4 hasil render, bukan pada beberapa frame sampel, dan harus dilihat mata juga karena
  detektor wajah gagal pada frame blur.
- Cover privasi harus opaque. Jangan pakai `backdrop-filter`: fitur itu bisa gagal senyap
  di renderer headless, dan gate privasi tidak boleh bergantung pada sesuatu yang gagalnya
  tidak terlihat.
- When the transcript shows a live local tool/app (e.g. a client-routed SPA at 127.0.0.1), capture clean UI proof by driving Chrome over the DevTools Protocol (Node's global `WebSocket`, no deps) to click into the right view, since a plain headless screenshot only gets the default route. Real captured UI beats any generated/redrawn dashboard for proof moments.

## CTA Defaults

End with one CTA, not three.

Choose by content:

- AI/dev educational: "Save dulu kalau lo lagi bangun workflow AI."
- Reflection/founder journey: "Pernah ngalamin hal yang sama? Cerita di komentar."
- Tool recommendation: "Kalau topik ini relate, komen `workflow`."
- Family/lifestyle vlog: "Menurut lo, simple moment kayak gini worth it nggak?"

CTA should feel conversational and match Dena's voice.

Avoid promissory CTA unless explicitly requested by the user:

- "Nanti gue share source code-nya."
- "Gue bakal upload tutorial lengkapnya."
- "Komen `mau`, nanti gue kirim."

## Platform Publish Caption Defaults

For every finished social video, include `publish-captions.md`:

- YouTube title: max `100` characters, no `<` or `>`, reads as a standalone headline.
- Instagram caption: max `1200` characters.
- TikTok caption: max `4000` characters.
- Both captions must include the video's core learning, one clear CTA, and character counts.
- Keep the copy in Dena's natural Indonesian voice; avoid corporate promo language and hashtag stuffing.
- Publish-parser contract: for `npm run repliz:publish` to read the caption,
  `publish-captions.md` must use headings that are exactly `## YouTube Title`,
  `## Instagram`, and `## TikTok` (not `## Instagram (Reels) caption`), each
  followed by a fenced ` ```text ` block. The Instagram block is used as the
  description for all platforms; the `## YouTube Title` block is used as the
  title for all platforms and is required for YouTube. See
  `docs/repliz/integration-spec.md`.

## Social Findings From Public Samples

High-performing IG sample in the inspected batch:

- Topic: coding Flutter + chicken farming side hustle.
- Approx public metric at inspection: about 73K views, 9.5K likes.
- Why it works:
  - Strong contrast: developer life vs farming.
  - Immediate plot twist.
  - Human, unusual, visual.
  - Caption is simple and highly readable.

Recent AI/dev videos:

- Topics: AI UI review, AI as co-pilot, AI slop, AI agent workflow.
- Structure: reflective monologue, practical lesson, ending question.
- Improvement opportunity:
  - Stronger first 3-second hook.
  - More pattern interrupts in the middle.
  - More visual overlays when mentioning tools, docs, agents, CRM/ERP.
  - Tighter cuts and less repeated setup.

## Default Project Deliverable

For each edited video, create a work folder such as:

`videos/<slug>/`

Expected files:

- `source.mp4` or original video reference.
- `processed.mp4` after silence/redundancy/audio/speed cleanup.
- `metadata.json`.
- `transcript.json`.
- `processed-transcript.json`.
- `edit-decision-notes.md`.
- `cut-list.json`.
- `creative-brief.md`.
- `caption-plan.md`.
- `caption-beats.json`.
- `publish-captions.md`.
- `visual-plan.md`.
- `assets/asset-manifest.json`, when assets exist.
- `overlay-timeline.json`.
- `assembly-notes.md`.
- `assembly-checklist.md`.
- Optional when the user chooses QA first: `qa-report.md`, `qa-punch-list.md`, and `final-approval.md` only after QA passes.

Project-level composition files:

- `index.html` - main HyperFrames composition.
- `compositions/*.html` - sub-compositions only when justified.
- `meta.json` - project metadata.

Rendered output:

- `output.mp4` or the configured HyperFrames render output.

Keep intermediate files unless user asks to delete them.

## Review Gate And Optional QA Standard

An edit is not publishable just because it renders. After render, the user reviews first and chooses publish as-is, QA first, or revisions.

When the user chooses QA first:

- `npm run video -- check <slug>` must pass after any video composition edit.
- First frame and first 3 seconds must work without audio.
- Captions must be readable at phone size.
- Storytelling captions must account for every spoken word in the locked processed transcript.
- Speed must be `1.2x` unless a documented clarity/emotion exception exists.
- Hook, middle proof/insight, and CTA must match the creative brief.
- Overlays must clarify, prove, reset attention, or transition.
- URL/tool/product mentions must have real captured or generated context assets when they materially help the viewer understand the story.
- SFX cues must be audible in the final render when the visual plan calls for them.
- CTA must be non-promissory unless the user explicitly approved a promise.
- Audio must be clear, synced, and not harsh.
- No private/client data may be visible.
- Reference adaptation must still feel like Dena.
- `final-approval.md` is QA approval only and is not required for publish as-is. Upload to R2 and Repliz scheduling still require explicit user approval and `--approved`.
- The QA phase must write a verdict in `qa-report.md`.

Use QA phase verdicts only when QA runs:

- `pass`: ready for final render or publish.
- `pass-with-minor-notes`: usable, with non-blocking polish notes.
- `revise`: not ready because major viewer/style issues remain.
- `blocked`: cannot review because required input, preview, render, or verification evidence is missing.

## Minimal Default If User Gives No Extra Direction

Use:

- Format: 9:16, 1080x1920.
- Speed: 1.2x unless too rushed.
- Hook: top black rounded card.
- Captions: full running spoken-word coverage, bold white with black stroke, yellow keyword.
- Effects: light zoom/punch on key claims, plus purposeful SFX cues where motion needs impact.
- Overlays: only transcript-relevant, with URL/tool captures or generated assets when they clarify context.
- CTA: one conversational, non-promissory question/save/comment prompt.

Do this without asking again unless the input video has a real ambiguity that affects the output.
