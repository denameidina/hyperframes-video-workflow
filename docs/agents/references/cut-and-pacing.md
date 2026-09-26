# Cut And Pacing (Reference)

Rules for media audit, transcription, cuts, speed, audio cleanup, and
`edit-decision-notes.md`. Loaded by `docs/agents/01-story.md` at the step that
names it. Workflow order lives in the phase documents, not here.

## Media Audit

Start every job by inspecting the source.

Record:

- File path
- Duration
- Resolution
- Orientation and rotation metadata
- FPS
- Audio codec, channels, sample rate
- Approximate loudness/peak
- Whether the video is talking-head, vlog, screen demo, mixed, or B-roll
- Whether captions/text are already burned in
- Any visual issues:
  - bad crop
  - shaky footage
  - low light
  - face off-center
  - important object near caption area
  - background noise

Recommended commands:

```bash
ffprobe -v error -show_entries format=duration,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,sample_rate,channels -of json <input>
ffmpeg -hide_banner -i <input> -af volumedetect -vn -sn -dn -f null /dev/null
ffmpeg -hide_banner -i <input> -af silencedetect=noise=-34dB:d=0.35 -vn -f null /dev/null
```

Use thresholds as starting points, not rigid rules.

## Transcription Workflow

Generate word-level transcript when possible.

Use project-local Whisper, not a global binary:

```bash
ffmpeg -y -i videos/<slug>/<input-media> -ar 16000 -ac 1 videos/<slug>/audio.wav

vendor/whisper.cpp/build/bin/whisper-cli \
  -m vendor/whisper.cpp/models/ggml-large-v3-turbo.bin \
  -f videos/<slug>/audio.wav \
  -l id \
  --prompt "Dena Meidina, HyperFrames, Codex, AGENTS.md, skills, motion overlay, transcript cut, IG, TikTok, AI workflow" \
  -oj -ojf \
  -of videos/<slug>/transcript-large-v3-turbo
```

Preferred output:

`videos/<slug>/transcript.json`

Transcript entries should include:

- `start`
- `end`
- `text`

After transcription:

1. Read the full transcript.
2. Identify ASR mistakes.
3. Mark uncertain words.
4. Correct obvious domain words:
   - `Claude`, not `cloud` when context is AI/dev.
   - `ChatGPT`, not `chat gpt` if used as product name.
   - `agent`, `workflow`, `CRM`, `ERP`, `Flutter`, `frontend`, `backend`.
5. Do not invent missing speech.

If transcript is poor:

- Keep the raw ASR file.
- Add a `Transcript Quality` section in `edit-decision-notes.md`.
- Flag parts that need human review.

For storytelling/talking-head edits, downstream captions depend on complete word coverage. Preserve word-level timing for every spoken word that survives the cut. If `processed.mp4` is speed-adjusted, the handoff must include either:

- a processed-timeline word-level transcript, or
- a reliable raw-to-processed time mapping in `cut-list.json`.

Do not hand off only sentence-level notes when Screen Plan phase (captions step) needs running captions.

## Content Map

Before cutting, map the content.

Create a sequence like:

```md
## Content Map

- 00:00-00:08: slow setup about topic
- 00:08-00:21: first clear problem statement
- 00:21-00:38: repeated explanation / filler
- 00:38-00:56: strongest insight
- 00:56-01:10: example/proof
- 01:10-01:22: weak ending
```

The content map helps avoid cutting only by waveform.

## Cut Categories

Label every cut decision with one category.

Use these categories:

- `keep`: essential for story, proof, or emotion.
- `tighten`: keep meaning but remove pauses/filler.
- `move-to-hook`: the locked verbatim phrase moves to output `00:00.00` and
  ends no later than `00:03.00`.
- `cut-silence`: dead air, long pause, empty thinking.
- `cut-filler`: "eee", "um", "jadi", "kayak", "sebenernya" when not meaningful.
- `cut-repeat`: repeated phrase or restarted sentence.
- `cut-tangent`: interesting but not needed for this video.
- `cut-unclear`: speech is too unclear to caption confidently.
- `preserve-human`: keep a pause/laugh/breath because it adds authenticity.

Do not mark a section `cut-tangent` just because it is quiet. A quiet moment may be the emotional proof.

## Filler Rules

Cut filler when:

- It delays the hook.
- It repeats the same sentence start.
- It makes Dena sound unsure without adding honesty.
- It blocks caption readability.
- It appears between two clear clauses and can be removed cleanly.

Keep filler when:

- It sounds natural and conversational.
- It signals reflection.
- Removing it creates a jumpy or fake delivery.
- It supports a self-aware/human moment.

Dena's voice should remain human, not corporate.

## Cut Intensity Defaults

Default to `light-medium` for Dena raw talking-head fixes unless the user explicitly asks for aggressive viral pacing.

- Remove long silence, obvious repeated starts, and filler that blocks the point.
- Keep natural pauses, context, and human delivery when they make the story easier to follow.
- Do not compress a raw clip to a target duration just to make it feel fast.
- If a previous edit was "too cut", rebuild from raw or the cut list with fewer removals instead of patching caption timing around the bad cut.

## Silence Rules

Default:

- Remove silence longer than `0.35-0.45s` in normal monologue.
- Preserve shorter pauses if they create emphasis.
- Preserve micro-pauses before a key realization when it helps retention.
- Avoid cutting so tightly that consonants are clipped.

For cinematic/manifesto style:

- Some silence is useful.
- Allow intentional pauses before bold identity or mission lines.
- Do not apply aggressive auto-cut blindly.

For fast educational/tactical videos:

- Cut tighter.
- Favor `1.12x-1.2x` speed depending on speech clarity.

## Speed Rules

Default Dena speed:

`1.2x`

Apply `1.2x` by default for raw Dena talking-head/storytelling content. This is not optional polish; it is part of the base pacing standard.

Use `1.2x` when:

- Speech remains clear.
- The video is educational or tactical.
- There is too much dead space.

Use `1.12x-1.18x` when:

- The source is already fast.
- Emotional delivery matters.
- The video is cinematic/manifesto style.
- Indonesian words become hard to catch at `1.2x`.

Any lower speed must be documented in `edit-decision-notes.md` under `Pacing Plan` with the exact reason.

Avoid speed changes when:

- The clip relies on natural timing or humor.
- There is music sync that would break.
- The user asks to preserve the original delivery.

## Edit Decision List

Produce an edit decision list before generating `processed.mp4`.

Use this format in `edit-decision-notes.md`:

```md
## Edit Decision List

| Source Start | Source End | Action | Reason | Output Position |
| --- | --- | --- | --- | --- |
| 00:00.00 | 00:06.20 | cut-silence | slow setup before hook | - |
| 00:42.10 | 00:44.70 | move-to-hook | locked peak problem | 00:00.00 |
| 00:06.20 | 00:18.90 | keep | explanation after hook | 00:02.60 |
| 00:18.90 | 00:24.50 | cut-repeat | repeated setup | - |
| 00:24.50 | 00:41.00 | tighten | useful context, remove pauses | 00:15.30 |
```

Also create machine-readable `cut-list.json`.

Recommended JSON shape:

```json
{
  "source": "raw/example.mp4",
  "targetDuration": 60,
  "speed": 1.2,
  "primaryHook": {
    "text": "Workflow bisnisnya yang belum jelas.",
    "sourceStart": 42.1,
    "sourceEnd": 44.7,
    "outputStart": 0.0,
    "outputEnd": 2.6,
    "reason": "peak problem; creates curiosity before the explanation",
    "transition": "resume the original setup immediately after the hook",
    "originalOccurrence": "removed"
  },
  "segments": [
    {
      "sourceStart": 42.1,
      "sourceEnd": 44.7,
      "action": "move-to-hook",
      "outputStart": 0.0,
      "reason": "locked peak problem"
    }
  ],
  "notes": [
    "Preserve the pause before the realization at 32.4s"
  ]
}
```

## Processed Base Video

If asked to create `processed.mp4`, the output should be:

- Vertical `9:16`
- Prefer `1080x1920` for final work
- 30fps unless source requires otherwise
- Audio cleaned but not overprocessed
- Speech clear after speed change
- No captions burned in
- No overlays burned in
- No CTA graphics burned in

The base video should remain a clean foundation for HyperFrames layers.

Do not flatten captions or overlays into `processed.mp4`.

## Audio Cleanup Handoff

This agent may perform basic audio cleanup, but deep audio design belongs to a later sound/music agent if one exists.

Basic cleanup may include:

- highpass around `70-100Hz`
- light denoise
- loudness normalization
- avoiding true peaks above `-1.0dB`

Target for social speech:

- Integrated loudness around `-16` to `-14 LUFS`
- True peak around `-1.5` to `-1.0 dBFS`
- Speech clear on phone speakers

Avoid:

- Harsh noise reduction artifacts
- Over-compression
- Clipped consonants
- Removing room tone so aggressively that cuts feel unnatural

## Output Template

Use this template for `edit-decision-notes.md`.

```md
# Edit Decision Notes - <video slug>

## Source Audit

- Source:
- Duration:
- Resolution/FPS:
- Audio:
- Format:
- Issues:

## Creative Brief Alignment

- Primary lane:
- Selected format:
- Hook type:
- Visual grammar:
- Target duration:

## Transcript Quality

- Status:
- Known ASR corrections:
- Needs human review:

## Content Map

- 00:00-00:00:

## Hook Candidates

1. Timestamp:
   Text:
   Why:

2. Timestamp:
   Text:
   Why:

3. Timestamp:
   Text:
   Why:

## Three-Second Transcript Hook

- Status: <locked|blocked>
- Exact spoken quote:
- Source start/end:
- Output start/end: <must begin 00:00.00 and end no later than 00:03.00>
- Why this creates curiosity:
- Transition into explanation:
- Original occurrence: <removed|intentional-callback>

## Edit Decision List

| Source Start | Source End | Action | Reason | Output Position |
| --- | --- | --- | --- | --- |

## Pacing Plan

- Speed:
- Silence threshold:
- Expected duration:
- Preserved pauses:

## Audio Plan

- Cleanup:
- Loudness target:
- Notes:

## Processed Output

- File:
- Duration:
- Resolution:
- Audio:

## Handoff

For Screen Plan phase (captions step):

For Screen Plan phase (visual step):

For Screen Plan phase (visual step):

For Build phase:

For QA phase:
```

## Quality Bar

A good Transcript/Cut pass:

- Makes the video shorter without losing context.
- Opens at `00:00.00` with the locked verbatim hook, ends it by `00:03.00`,
  then continues into the explanation.
- Preserves Dena's natural voice.
- Removes obvious dead air and repeated starts.
- Leaves clean timing for captions.
- Does not burn captions or overlays into the base footage.
- Documents every major cut.

A weak Transcript/Cut pass:

- Cuts only by silence detection.
- Removes emotion and natural timing.
- Changes the meaning of a sentence.
- Leaves repeated explanations.
- Speeds up speech until it feels rushed.
- Produces `processed.mp4` without an editable cut list.

## Dena-Specific Notes

Keep:

- Practical founder/operator insight.
- Natural Indonesian phrasing.
- Specific proof from work, clients, dashboards, AI systems, code, CRM, ERP.
- Moments that show real experience rather than generic advice.

Usually cut:

- Long setup before the actual point.
- Repeated "jadi" starts.
- Re-explaining a concept after it is already clear.
- Tangents that do not support the selected hook.
- Generic motivational language.

Be careful with:

- Family/lifestyle clips, because emotional pauses may matter.
- Cinematic manifesto clips, because silence and pose can be part of the style.
- Technical terms, because ASR often gets them wrong.

## Failure Modes

If the source video is too long:

- Build a highlight map first.
- Suggest multiple videos if there are separate ideas.
- Do not compress three topics into one reel.

If there are multiple strong angles:

- Keep the one selected by Story phase.
- Put alternate candidates under `Unused Strong Moments`.

If the audio is bad:

- Make a diagnostic note.
- Create `audio-clean.wav` only if cleanup improves speech.
- Tell downstream agents if the final render may need music/SFX to mask noise.

If the source has burned-in captions:

- Note their location.
- Avoid crop/caption decisions that conflict with them.
- Tell Screen Plan phase (captions step) whether new captions should avoid or replace that area.

If the edit becomes too short:

- Re-add the best proof or context moment.
- Do not pad with weak setup.

