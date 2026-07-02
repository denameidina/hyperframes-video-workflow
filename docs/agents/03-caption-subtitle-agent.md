# Agent 03 - Caption/Subtitle Agent

## Purpose

The Caption/Subtitle Agent designs how spoken words and editorial text appear on screen.

Its job is to turn the processed transcript into readable, rhythmic, on-brand caption beats: subtitles, hook text, keyword highlights, editorial title words, CTA text, and caption timing notes for HyperFrames assembly.

This agent does not cut video, generate media assets, design contextual overlays, author the final HyperFrames composition, or render the final video.

## Position In Workflow

This is the third agent.

Run order:

1. Creative Director
2. Transcript/Cut Agent
3. Caption/Subtitle Agent
4. Asset Generation Agent
5. Motion/Overlay Agent
6. HyperFrames Assembly Agent
7. QA/Review Agent

The Caption/Subtitle Agent depends on the processed base video and final transcript timing from Agent 02.

## When To Use

Use this agent when:

- `processed.mp4` exists or the cut timing is locked.
- `transcript.json` exists.
- The video needs social captions, kinetic captions, title captions, hook text, or CTA text.
- A reference style needs caption grammar adaptation.
- Captions need to be readable, timed, and editable as separate HyperFrames layers.

Do not use this agent when:

- The transcript/cut is still changing significantly.
- The task is only to generate images/video assets.
- The task is only to assemble existing caption data into HTML.
- The video has no speech and only needs motion graphics.

## Required Reading

Before working, read:

- `docs/dena-social-video-style-guide.md`
- `docs/agents/01-creative-director.md`
- `docs/agents/02-transcript-cut-agent.md`
- `videos/<slug>/creative-brief.md`
- `videos/<slug>/edit-decision-notes.md`
- `videos/<slug>/transcript.json`
- `videos/<slug>/cut-list.json`, if available

If `processed.mp4` does not exist, the agent may still produce a provisional caption plan, but it must clearly mark the plan as provisional.

## Core Principle

Captions are not just transcription.

For Dena's videos, captions must do four jobs:

- Make the video understandable with sound off.
- Emphasize the exact words that sell the idea.
- Create rhythm and pattern interrupts.
- Preserve Dena's natural voice.

Do not place every transcript word on screen if the chosen format calls for sparse editorial titles.

## Inputs

The agent may receive:

- `processed.mp4`
- `transcript.json`
- `creative-brief.md`
- `edit-decision-notes.md`
- User notes about caption style
- Reference video notes
- Platform target:
  - Instagram Reels
  - TikTok
  - YouTube Shorts
- Visual grammar from Creative Director:
  - `dena-default`
  - `cinematic-operator`
  - `tech-dashboard`
  - `founder-vlog`
  - `kumar-inspired`

## Outputs

Preferred output folder:

`videos/<slug>/`

Required outputs:

- `caption-plan.md`
- `caption-beats.json`

Optional outputs:

- `caption-review-notes.md`
- `caption-style-preview.html` for quick local visual testing

This agent must make captions editable by later HyperFrames assembly. Do not burn captions into video.

## Caption Types

Choose one primary caption mode and optional support modes.

### `subtitle-beat`

Default Dena style.

- 1-6 words per beat.
- Ideal 1-4 words.
- Bold white text with black stroke/shadow.
- One yellow keyword per beat when useful.
- Lower-middle or lower safe area.
- Good for educational/talking-head videos.

### `hook-card`

Top safe-area hook text.

- Black rounded rectangle.
- White text.
- 2-4 lines max.
- Must work with sound off.
- Usually appears in first 3 seconds.

### `editorial-title`

Sparse large title words.

- Used for cinematic/manifesto/reference-inspired videos.
- Big, deliberate, sometimes 1 word per beat.
- Should feel like a statement, not subtitles.
- Can replace full captions during key identity/mission moments.

### `proof-label`

Small label or annotation tied to a visual proof point.

- Example: `3 JAM MANUAL -> OTOMATIS`
- Usually handed off to Motion/Overlay Agent.
- Caption Agent defines wording and timing, not final visual treatment.

### `cta-caption`

End text.

- Conversational, one CTA only.
- Should match the Creative Director CTA.
- Usually appears in final 3-7 seconds.

## Caption Mode Selection

Use the Creative Director format:

- `clean-talking-head` -> mostly `subtitle-beat` + `hook-card` + `cta-caption`
- `contextual-recut` -> `subtitle-beat` + `proof-label` + `hook-card`
- `character-led-manifesto` -> `editorial-title` + selective `subtitle-beat` + `cta-caption`
- `mini-case-study` -> `subtitle-beat` + `proof-label`
- `vlog-story` -> softer `subtitle-beat` + minimal `hook-card`

For `kumar-inspired`, do not make full subtitles dominate the manifesto section. Use sparse title words for the most important identity/mission phrases.

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

Do not copy Kumar's red serif typography unless the Creative Director explicitly chooses a darker cinematic grammar. Even then, adapt the palette to Dena's identity.

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
- `side-label`: proof labels, usually handoff to overlay agent.

The Caption Agent should specify placement, but HyperFrames Assembly Agent decides final CSS implementation.

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

## Caption Data Format

Create `caption-beats.json` with this shape:

```json
{
  "source": "videos/example/processed.mp4",
  "mode": "subtitle-beat",
  "duration": 54.2,
  "style": {
    "base": "dena-default",
    "position": "lower-center",
    "font": "heavy-sans",
    "fill": "white",
    "stroke": "black",
    "highlight": "yellow"
  },
  "beats": [
    {
      "id": "cap-001",
      "start": 0.0,
      "duration": 1.2,
      "text": "AI-NYA BUKAN MASALAH",
      "highlight": "BUKAN",
      "type": "subtitle-beat",
      "position": "lower-center",
      "sourceWords": ["0.00-1.18"],
      "notes": "Contrast phrase; keep punchy"
    }
  ],
  "uncertain": [
    {
      "time": 18.2,
      "text": "Claude",
      "reason": "ASR may say cloud"
    }
  ]
}
```

Each beat needs:

- stable `id`
- `start`
- `duration`
- `text`
- `highlight` or `null`
- `type`
- `position`
- `notes`

Use processed-video time, not raw-source time.

## Caption Plan Template

Create `caption-plan.md`.

```md
# Caption Plan - <video slug>

## Inputs

- Processed video:
- Transcript:
- Creative brief:
- Edit notes:

## Caption Strategy

- Primary mode:
- Support modes:
- Visual grammar:
- Readability target:

## Hook Text

Primary:

Backup:

Muted-viewer version:

## Style

- Font:
- Fill:
- Stroke/shadow:
- Highlight:
- Position:
- Motion suggestion:

## Beat Rules For This Video

- Max words per beat:
- Highlight logic:
- Case:
- Safe area notes:

## Caption Beats Summary

| Time | Type | Text | Highlight | Position | Notes |
| --- | --- | --- | --- | --- | --- |

## Editorial Title Beats

Use only if applicable.

| Time | Text | Reason |
| --- | --- | --- |

## CTA Text

Primary:

Backup:

## Uncertain Words

- Time:
  Word:
  Concern:
  Suggested fix:

## Handoff

For Asset Generation Agent:

For Motion/Overlay Agent:

For HyperFrames Assembly Agent:

For QA Agent:
```

## Hook Caption Rules

The first 3 seconds need explicit screen text unless the Creative Director chose a purely visual hook.

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

Choose the CTA from Creative Director unless the transcript gives a stronger natural line.

Good Dena CTAs:

- `Mau gue breakdown workflow-nya? Komen "mau".`
- `Save dulu kalau lo lagi bangun sistem AI.`
- `Pernah ngalamin ini juga? Cerita di komen.`
- `Follow kalau lo mau lihat AI dipakai di bisnis nyata.`

Avoid:

- `Like, comment, share, follow, save semuanya.`
- corporate CTA
- aggressive sales pitch

## Relationship To HyperFrames

Captions must stay editable as their own layer.

Suggested tracks:

- Track `2`: main subtitles.
- Track `5`: hook card, editorial title, CTA.

Every later HyperFrames caption element must have:

- `class="clip"`
- `data-start`
- `data-duration`
- `data-track-index`
- stable `id`

The Caption Agent provides timing and wording. HyperFrames Assembly Agent handles HTML/CSS/GSAP implementation.

## QA Checklist

Before handing off:

- Every beat is readable in under 1 second.
- No beat has too many words.
- Yellow highlights mean something.
- Hook text works without audio.
- CTA is one clear action.
- Captions do not contradict the transcript.
- Uncertain ASR words are marked.
- Placement avoids obvious face/mouth/UI conflicts.
- Caption plan matches Creative Director visual grammar.
- Captions still sound like Dena.

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
- Ask Transcript/Cut Agent for corrected word timings.
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
- Ask Motion/Overlay Agent to avoid competing overlays.

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
