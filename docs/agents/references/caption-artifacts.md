# Caption Artifacts (Reference)

Formats for `caption-beats.json`, `caption-plan.md`, and `publish-captions.md`,
plus the caption self-check. Loaded by `docs/agents/02-screen-plan.md` in the
captions step.

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
- `sourceWords` covering the exact processed transcript word range
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

Locked transcript quote:

Story phase source timestamp:

Processed timing: <00:00.00-00:03.00 maximum>

Verbatim match: <pass|blocked>

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

For Screen Plan phase (visual step):

For Screen Plan phase (visual step):

For Build phase:

For QA phase:
```

## Platform Publish Caption Rules

Create `publish-captions.md` for the upload copy.

Rules:

- `publish-captions.md` must contain a `## YouTube Title` section with the title
  inside a fenced ```` ```text ```` block. The auto-publish CLI reads that exact
  heading; without it the title is derived from the first line of the caption.
- YouTube title must be max `100` characters, must not contain `<` or `>`, and
  must read as a standalone headline (not a truncated caption).
- Instagram caption must be max `1200` characters.
- TikTok caption must be max `4000` characters.
- Include the video's core learning, not just a teaser.
- Keep Dena's Indonesian voice: direct, practical, founder/developer, not corporate.
- Use one clear CTA.
- Use only relevant hashtags; avoid hashtag stuffing.
- Include character counts for the YouTube title and both captions before handoff.
- When Threads is a publish target, add a `## Threads` section: one fenced
  ` ```text ` block per bubble, in order — the first block is the main post,
  every later block is one reply in the chain. Each bubble (post and every
  reply) must be `150` characters or fewer; the publish CLI rejects any bubble
  over that limit before uploading anything. Write it as its own thread —
  short, standalone beats — not the Instagram caption reflowed into 150-char
  slices. Skip the section only when Threads is not a target for this video;
  the CLI then falls back to auto word-wrapping `description`, which reads
  more mechanically than an authored thread.

Expected shape (fenced `text` block under each heading):

    ## YouTube Title

    ```text
    Cara Gue Rombak Workflow Editing Pakai AI
    ```

    ## Instagram

    ```text
    <caption>
    ```

    ## TikTok

    ```text
    <caption>
    ```

    ## Threads

    ```text
    <post, <=150 chars>
    ```

    ```text
    <reply 1, <=150 chars>
    ```

    ```text
    <reply 2, <=150 chars>
    ```

## QA Checklist

Before handing off:

- Every beat is readable in under 1 second.
- Every surviving spoken word is represented for storytelling/talking-head edits.
- No beat has too many words.
- Yellow highlights mean something.
- Hook text works without audio.
- Hook-card wording matches Story phase's locked transcript quote verbatim and
  covers every hook word from `00:00.00` through no later than `00:03.00`.
- CTA is one clear action.
- Captions do not contradict the transcript.
- Uncertain ASR words are marked.
- Placement avoids obvious face/mouth/UI conflicts.
- Caption plan matches Story phase visual grammar.
- Captions still sound like Dena.
- When Threads is a target, every `## Threads` bubble (post and each reply) is
  150 characters or fewer, and reads as a standalone thread beat rather than a
  chopped-up paragraph.

