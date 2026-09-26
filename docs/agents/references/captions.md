# Captions (Reference)

Rules for on-screen captions, hook text, and CTA text. Loaded by
`docs/agents/02-screen-plan.md` in the captions step. Workflow order lives in the
phase documents, not here.

## Caption Timing Lock

Final caption timing must follow the locked processed video, not the raw timeline.

- Create provisional captions only before cut lock.
- After `processed.mp4` changes, regenerate or realign `caption-beats.json` against that processed video.
- Do not reuse old caption times from a previous cut unless the processed media is unchanged.
- If many captions feel off-timeline, route back to Story phase first; do not hand-nudge every beat around an unstable cut.

## Caption Types

Choose one primary caption mode and optional support modes.

### `subtitle-beat`

Default Dena style.

- 1-6 words per beat.
- Ideal 1-4 words.
- Running coverage: every surviving spoken word appears in a caption beat.
- Bold white text with black stroke/shadow.
- One yellow keyword per beat when useful.
- Lower-middle or lower safe area.
- Good for educational/talking-head videos.

### `hook-card`

Top safe-area hook text.

- Black rounded rectangle.
- White text.
- 2-4 lines max.
- Uses the same verbatim words as Story phase's locked transcript hook; line
  breaks, case, and one highlight may change, but the wording may not.
- Covers every spoken word in the locked hook and works with sound off.
- Starts at `00:00.00` and ends no later than `00:03.00`.

### `editorial-title`

Sparse large title words.

- Used for cinematic/manifesto/reference-inspired videos.
- Big, deliberate, sometimes 1 word per beat.
- Should feel like a statement, not subtitles.
- Can replace full captions during key identity/mission moments.

### `proof-label`

Small label or annotation tied to a visual proof point.

- Example: `3 JAM MANUAL -> OTOMATIS`
- Usually handed off to Screen Plan phase (visual step).
- Screen Plan phase (captions step) defines wording and timing, not final visual treatment.

### `cta-caption`

End text.

- Conversational, one CTA only.
- Should match the Story phase CTA.
- Usually appears in final 3-7 seconds.

## Caption Mode Selection

Use the Story phase format:

- `clean-talking-head` -> full running `subtitle-beat` + `hook-card` + `cta-caption`
- `contextual-recut` -> full running `subtitle-beat` + `proof-label` + `hook-card`
- `character-led-manifesto` -> `editorial-title` + selective `subtitle-beat` + `cta-caption`
- `mini-case-study` -> `subtitle-beat` + `proof-label`
- `vlog-story` -> softer full running `subtitle-beat` + minimal `hook-card`

For `kumar-inspired`, do not make full subtitles dominate the manifesto section. Use sparse title words for the most important identity/mission phrases, then return to running subtitle coverage for normal speech.

## Running Word Coverage Rules

This is the default for Dena storytelling videos.

- Start from the locked processed word-level transcript, not a summary.
- Every spoken word that survives Story phase must map to one caption beat through `sourceWords`.
- Group small words into readable phrase beats; do not drop them silently.
- Keep active captions moving with the speech so a muted viewer can follow the complete story.
- If exact timing is missing, mark the plan provisional and route back to Story phase for word-level timing.
- If a word is intentionally omitted because it is cut audio, filler removed by Story phase, or part of a sparse manifesto section, document it in `caption-plan.md`.

Bad:

```md
Transcript says: "jadi ini tuh workflow yang gue pakai buat auto publish"
Caption only shows: AUTO PUBLISH
```

Good:

```md
JADI INI TUH
WORKFLOW YANG GUE PAKAI
BUAT AUTO PUBLISH
```

## Dena Default Caption Style

Base style:

- Font: heavy sans.
- Fill: white.
- Stroke/shadow: black, strong enough for busy footage.
- Keyword fill: yellow.
- Case: uppercase for emphasis, title-case if uppercase feels too shouty.
- Position: lower-middle or bottom safe area.
- Max visible phrase: 1-6 words.
- Ideal visible phrase: 1-4 words.
- Motion: small pop, rise, scale, or snap. No chaotic bouncing.

Default color meaning:

- White: normal speech.
- Yellow: one key word/phrase.
- Black card: hook or special label.
- Red: only for warnings, conflict, or a deliberate cinematic reference. Do not overuse.

## Editorial Title Style

Use this when the video is cinematic, mission-driven, or reference-inspired.

Rules:

- One idea per screen.
- Large words must be short.
- Do not show a full sentence if 1-3 words can carry the force.
- Time title words to voice/music beats.
- Hold important words slightly longer.
- Leave visual space for face/body composition.

Example for Dena:

```md
00:00.00-00:01.10: INI PESAN
00:01.10-00:02.20: BUAT FOUNDER
00:02.20-00:03.00: YANG MASIH MANUAL
00:03.00-00:04.20: GUE DENA
00:04.20-00:05.80: AI SYSTEMS BUILDER
00:05.80-00:07.40: BUKAN GIMMICK
00:07.40-00:09.00: SISTEM KERJA
```

Do not copy Kumar's red serif typography unless the Story phase explicitly chooses a darker cinematic grammar. Even then, adapt the palette to Dena's identity.

## Keyword Highlight Rules

Highlight only the word that changes meaning.

Good yellow keywords:

- `AI`
- `workflow`
- `manual`
- `sistem`
- `bisnis`
- `agent`
- `bukan`
- `rusak`
- `otomatis`
- `founder`
- `client`

Weak yellow keywords:

- `yang`
- `dan`
- `jadi`
- `ini`
- `aku/gue` unless identity is the point

Only one highlighted phrase per beat by default.

Bad:

`GUE MAU BIKIN SISTEM AI UNTUK BISNIS`

with every word highlighted.

Good:

`GUE MAU BIKIN SISTEM AI`

highlight `SISTEM AI`.

## Grouping Rules

Group by meaning, not by arbitrary word count.

Good grouping:

```md
AI-NYA BUKAN MASALAH
WORKFLOW BISNISNYA
YANG BELUM JELAS
```

Bad grouping:

```md
AI-NYA BUKAN
MASALAH WORKFLOW
BISNISNYA YANG
BELUM JELAS
```

Rules:

- Keep subject and verb together when possible.
- Do not split product names: `ChatGPT`, `Claude`, `Flutter`, `CRM`, `ERP`.
- Do not split short contrast phrases: `bukan gimmick`, `kerja manual`, `sistem nyata`.
- Put punch words at the end of a beat when possible.
- Avoid more than two lines unless it is the hook card.

## Timing Rules

Default:

- Caption beat starts close to the first spoken word.
- Caption beat should not cover the next idea after speech ends.
- Minimum readable duration: `0.45s`.
- Comfortable duration: `0.8-1.4s`.
- Long hold: `1.8-2.5s` only for hook/title/CTA.

For fast speech:

- Combine very short function words into meaningful phrases.
- Do not flash single words too quickly unless it is an intentional editorial-title effect.

For cinematic manifesto:

- Let key words breathe.
- Do not subtitle every musical bridge.
- Use silence and empty frame deliberately.

## Safe Area Rules

Default vertical 9:16 safe zones:

- Avoid top UI area: first `120px` unless using a hook card placed intentionally.
- Avoid bottom platform UI area: last `220px` for TikTok/Reels controls.
- Avoid covering Dena's mouth unless the shot makes it unavoidable.
- Avoid covering key proof UI, phone, laptop, child/family face, or object of attention.

Caption placement options:

- `lower-center`: default subtitle.
- `mid-lower`: when bottom is busy.
- `top-card`: hook only.
- `center-title`: editorial title only.
- `side-label`: proof labels, usually handoff to the Screen Plan phase (visual step).

The Screen Plan phase (captions step) should specify placement, but Build phase decides final CSS implementation.

## Language Rules

Use Indonesian by default.

Keep Dena's natural register:

- `gue`
- `lo`
- `menurut gue`
- `jujur`
- `ternyata`
- `dari situ gue sadar`

Do not over-formalize captions.

Fix only obvious transcription issues. Do not rewrite Dena into generic marketing language.

Examples:

Good:

`GUE KIRA AI-NYA YANG SALAH`

Bad:

`SAYA MENGIRA TEKNOLOGINYA TIDAK OPTIMAL`

## ASR Correction Rules

Before finalizing captions:

- Check domain terms.
- Check names/tools.
- Check Indonesian/English mixed phrases.
- Check repeated or hallucinated transcript words.

Common corrections:

- `cloud` -> `Claude` when AI coding context.
- `clod` -> `Claude`.
- `chat gbt` -> `ChatGPT`.
- `front end` -> `frontend` if technical.
- `back end` -> `backend` if technical.
- `air p` -> `ERP` if business-system context.
- `cr m` -> `CRM`.

If uncertain, mark it in `caption-plan.md` instead of guessing.

## Hook Caption Rules

The first three seconds need explicit screen text derived from Story phase's
locked spoken hook. Use the exact surviving words so the audio hook and muted
hook make the same claim. You may change capitalization, line breaks, and
highlighting for readability; do not paraphrase, add stakes, or reveal an
answer that is absent from the spoken excerpt.

The hook card must:

- Start at `00:00.00` and end no later than `00:03.00`.
- Cover every spoken word in the hook through `sourceWords`.
- Remain readable in 2-4 lines without audio.
- Hand off a `blocked` status to Story phase if the locked timing or wording is
  missing; do not invent replacement copy.

Good hook text:

- Specific target.
- Specific pain.
- Clear contrast.
- 2-4 lines max.

Examples:

```md
INI PESAN BUAT FOUNDER
YANG MASIH NGANGGAP AI
CUMA CHATGPT
```

```md
AI LO BISA NGODING
TAPI UI-NYA MASIH JELEK?
```

Avoid:

- `DI VIDEO INI...`
- long explanations
- generic motivational openers
- jargon that only insiders understand

## CTA Caption Rules

One CTA only.

Choose the CTA from Story phase unless the transcript gives a stronger natural line.

Good Dena CTAs:

- `Save dulu kalau lo lagi bangun sistem AI.`
- `Pernah ngalamin ini juga? Cerita di komen.`
- `Follow kalau lo mau lihat AI dipakai di bisnis nyata.`
- `Kalau topik ini relate, komen "workflow".`

Avoid:

- `Like, comment, share, follow, save semuanya.`
- corporate CTA
- aggressive sales pitch
- CTAs that promise Dena will send, publish, or explain something later unless the user explicitly approved that promise.

## Quality Bar

A good Caption/Subtitle pass:

- Feels rhythmic, not random.
- Helps retention without visual noise.
- Makes the video understandable muted.
- Highlights only meaningful words.
- Has clear handoff timing.
- Supports the selected format.

A weak pass:

- Dumps full transcript paragraphs on screen.
- Uses yellow on random words.
- Copies reference typography without adapting.
- Blocks the speaker's face.
- Shows captions too fast to read.
- Rewrites Dena into corporate language.
- Makes every word equally loud.

## Failure Modes

If transcript timing is inaccurate:

- Mark the plan provisional.
- Ask Story phase for corrected word timings.
- Do not invent exact timings.

If processed video changes:

- Caption timings must be regenerated.
- Do not reuse raw-source timestamps.

If the video is too dense:

- Prioritize meaning.
- Merge small words into readable phrases.
- Use fewer highlights.

If the visual frame is busy:

- Choose stronger stroke/shadow.
- Move captions to `mid-lower`.
- Reduce word count per beat.
- Ask Screen Plan phase (visual step) to avoid competing overlays.

If the creative direction is cinematic/manifesto:

- Use sparse editorial-title beats.
- Do not subtitle every musical bridge.
- Let important words breathe.

## Dena-Specific Guardrails

Always protect:

- Readability.
- Natural Indonesian phrasing.
- Founder/operator credibility.
- Practical AI systems tone.
- The current IG/TikTok identity: simple, bold, white/yellow, black stroke.

Do not turn Dena captions into:

- meme spam
- corporate webinar subtitles
- random karaoke captions
- full-screen paragraph slides
- generic AI influencer copy

