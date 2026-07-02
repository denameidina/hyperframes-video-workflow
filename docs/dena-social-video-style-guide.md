# Dena Social Video Style Guide

Snapshot date: 2026-07-02

Use this before editing any Dena Meidina social video in this project. The goal is: preserve Dena's current IG/TikTok identity, then make the pacing, audio, captions, overlays, and retention stronger.

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

- Stop scroll in first 3 seconds.
- Remove dead air and repeated thinking.
- Keep the authentic monologue.
- Make captions easy to read without pausing.
- Add contextual overlays only when they clarify or re-engage.
- End with a clear CTA that matches the topic.

Do not over-edit into generic CapCut chaos. Dena's style is credible developer/founder content, not meme spam.

## Default Edit Pipeline

When user provides a raw vlog/monologue video:

1. Inspect source
   - Get duration, fps, resolution, audio levels.
   - Identify whether it is talking-head, handheld vlog, or mixed.
   - Check if existing burned-in captions/text exist.

2. Transcript and content edit
   - Transcribe word-level.
   - Cut silence/dead air.
   - Cut filler and repeated starts when meaning stays intact.
   - Keep human texture; do not remove every pause if it makes speech unnatural.
   - Build a tighter retention structure: hook, problem, insight, example, takeaway, CTA.

3. Audio cleanup
   - Reduce noise.
   - Normalize speech loudness.
   - Enhance clarity.
   - Avoid harsh over-compression.

4. Timing
   - Default speed: `1.2x`.
   - If the speech becomes too rushed, use `1.12x-1.18x`.
   - Keep cuts on sentence/phrase boundaries where possible.

5. Visual layers in HyperFrames
   - Video/audio base layer.
   - Caption layer.
   - Effect layer.
   - Context overlay layer: text/sticker/image/video/screenshot.
   - CTA/end layer.

6. Verify
   - Run `npm run check`.
   - Snapshot/preview key frames before final render.
   - Check caption readability, overlap, safe area, and timing.

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

Default hook shape:

- Top black rounded rectangle, white text.
- Make a specific promise, conflict, or curiosity gap.
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

## Overlay / Sticker / B-Roll Rules

Use overlays to clarify context or reset attention every 4-8 seconds.

Good overlays:

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
- Occasional glass/black cards.
- Minimal accent lines.
- Screenshots and UI cards when context demands.

## CTA Defaults

End with one CTA, not three.

Choose by content:

- AI/dev educational: "Save dulu kalau lo lagi bangun workflow AI."
- Reflection/founder journey: "Pernah ngalamin hal yang sama? Cerita di komentar."
- Tool recommendation: "Mau gue breakdown workflow-nya? Komen `mau`."
- Family/lifestyle vlog: "Menurut lo, simple moment kayak gini worth it nggak?"

CTA should feel conversational and match Dena's voice.

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
- `edit-decision-notes.md` with cuts and hook/CTA rationale.
- `storyboard.json` for layers/cards.
- `public/index.html` HyperFrames composition.
- `output.mp4` final render.

Keep intermediate files unless user asks to delete them.

## Minimal Default If User Gives No Extra Direction

Use:

- Format: 9:16, 1080x1920.
- Speed: 1.2x unless too rushed.
- Hook: top black rounded card.
- Captions: bold white with black stroke, yellow keyword.
- Effects: light zoom/punch on key claims, not every word.
- Overlays: only transcript-relevant.
- CTA: one conversational question or save/comment prompt.

Do this without asking again unless the input video has a real ambiguity that affects the output.
