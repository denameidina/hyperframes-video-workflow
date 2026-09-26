# Dena Video Editing Project Reverse-Engineering Blueprint

> Catatan: struktur sebelum 2026-09 (7 agent). Struktur berlaku: ADR-0008 (`internal/docs/adr/0008-four-phase-workflow.md`).

Snapshot date: 2026-07-02

This is a standalone reverse-engineering blueprint for the Dena Meidina video-editing project.

It explains how the current project is structured, what workflow it encodes, what files an AI coding agent should expect, and how to recreate the same system from scratch. It is not part of the active runtime workflow and should not be required by `AGENTS.md`, `CLAUDE.md`, or any skill router.

Use this document when someone wants to understand or reconstruct the project architecture without relying on this repository's existing docs.

## Copy-Paste Prompt For Reverse Engineering

```text
You are reverse-engineering a Dena Meidina social-video editing project.

Your job is to recreate the project structure, agent workflow, style guide, skill router, HyperFrames contract, artifact chain, and QA gates described in this blueprint.

Treat this blueprint as the standalone source for reconstruction. Do not assume the original repo files exist. If they do exist, use them only as implementation references after understanding this blueprint.

Recreate a 7-agent video-editing workflow:
1. Creative Director
2. Transcript/Cut Agent
3. Caption/Subtitle Agent
4. Asset Generation Agent
5. Motion/Overlay Agent
6. HyperFrames Assembly Agent
7. QA/Review Agent

For each edited video, the reconstructed project should create a work folder:
videos/<slug>/

The reconstructed workflow should produce handoff artifacts in order:
- creative-brief.md
- metadata.json
- transcript.json
- edit-decision-notes.md
- cut-list.json
- caption-plan.md
- caption-beats.json
- asset-plan.md and asset-manifest.json, if assets are needed
- motion-plan.md
- overlay-timeline.json
- assembly-notes.md
- assembly-checklist.md
- optional after user chooses QA first: qa-report.md, qa-punch-list.md, final-approval.md only after QA passes

Optional auto-publish must be gated:
- render the final MP4 first
- stop for explicit user review with choices: publish as-is, QA first, or revisions
- only after approval may an agent upload to Cloudflare R2 and schedule Repliz
- the publish command must require an explicit approval flag, for example `--approved`
- documentation and examples must use placeholder env values only; never expose real `.env` values in repo files

The reconstructed HyperFrames assembly rules:
- use index.html as the main composition
- every timed visible element must have class="clip"
- every timed element must have data-start, data-duration, and data-track-index
- videos must be muted and use a separate audio element
- timelines must be paused and registered on window.__timelines
- use local assets only
- no Date.now(), Math.random(), network fetches, or remote render assets
- run npm run check after any .html edit

Style rules:
- default language is Indonesian
- preserve Dena's natural voice: gue, lo, direct, practical, reflective
- keep Dena positioned as AI systems builder, senior developer, founder/operator
- first 3 seconds must stop scroll and work muted
- captions must be short, readable, white with black stroke/shadow, selective yellow highlight
- overlays must clarify, prove, reset attention, or transition
- reference videos are mechanics, not costumes; never copy another creator's persona

Do not collapse the stages into one generic editor. Keep the agent boundaries and handoff artifacts explicit.
```

## Reverse-Engineered Project Intent

Dena's strongest social videos should feel like:

> A credible AI systems builder showing real founder/operator insight in a direct, human, scroll-stopping way.

The project exists to improve pacing, audio, captions, overlays, retention, and render reliability while preserving Dena's real voice. It is not a generic video-editor project. It is a discipline system for AI-assisted social video editing.

## What This Blueprint Reconstructs

Recreate these layers:

1. Project instructions: `AGENTS.md` and optionally `CLAUDE.md`.
2. Style source of truth: `docs/dena-social-video-style-guide.md`.
3. Workflow skill router: `docs/skills/dena-video-editing-workflow/SKILL.md`.
4. Seven specialized agent documents in `docs/agents/`.
5. HyperFrames project shell: `index.html`, `meta.json`, `package.json`, optional `compositions/`.
6. Video work folders under `videos/<slug>/`.
7. QA and render-readiness gates.
8. Optional R2/Repliz auto-publish gate with user approval and placeholder-only env docs.

The blueprint itself should remain standalone. Do not wire it into runtime instructions unless a user explicitly asks for a discoverable handoff document.

## Required Environment

Recommended tools:

- `ffmpeg`
- `ffprobe`
- an ASR/transcription tool such as Whisper or any reliable speech-to-text engine
- HyperFrames project with:
  - `index.html`
  - `meta.json`
  - `package.json`
  - optional `compositions/`
- local assets only for render paths
- optional Wrangler CLI via `npx wrangler` for R2 upload

Project commands:

```bash
npm run dev
npm run check
npm run render
npm run publish
npm run test:repliz
npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved
npx hyperframes lint --verbose
npx hyperframes lint --json
npx hyperframes docs <topic>
```

Important:

- `npm run dev` is long-running. Run it in the background if using an agent environment that supports background processes.
- Run `npm run check` after every `.html` composition edit.
- Docs-only edits do not require `npm run check`.
- `npm run repliz:publish` must refuse R2 upload and Repliz scheduling unless `--approved` is present after explicit user review.
- Keep `.env`, account IDs, bucket names, public domains, API keys, and social account IDs out of docs. Use placeholders such as `<r2-bucket>`, `<r2-public-domain>`, `<cloudflare-account-id>`, and `<repliz-api-base-url>`.

## Folder Structure

Expected repo structure:

```text
.
├── AGENTS.md
├── CLAUDE.md
├── index.html
├── meta.json
├── package.json
├── scripts/
│   └── repliz-publish.mjs
├── raw/
│   └── source videos
├── references/
│   └── reference videos
├── docs/
│   ├── dena-social-video-style-guide.md
│   ├── repliz/
│   │   └── integration-spec.md
│   ├── agents/
│   ├── skills/
│   └── blueprints/
└── videos/
    └── <slug>/
        ├── source.mp4
        ├── processed.mp4
        ├── metadata.json
        ├── transcript.json
        ├── edit-decision-notes.md
        ├── cut-list.json
        ├── creative-brief.md
        ├── caption-plan.md
        ├── caption-beats.json
        ├── asset-plan.md
        ├── asset-manifest.json
        ├── motion-plan.md
        ├── overlay-timeline.json
        ├── assembly-notes.md
        ├── assembly-checklist.md
        └── optional QA: qa-report.md, qa-punch-list.md, final-approval.md
```

Create only the artifacts that apply. For example, skip `asset-plan.md` only when the decision that no assets are needed is documented. Skip QA artifacts unless the user chooses QA first or explicitly asks for QA.

## Workflow Overview

Use seven sequential agents. Each stage owns a distinct decision boundary.

| Stage | Agent | Owns | Main Output |
| --- | --- | --- | --- |
| 1 | Creative Director | angle, hook, format, content lane, CTA | `creative-brief.md` |
| 2 | Transcript/Cut Agent | source audit, transcript, base cut, pacing | `metadata.json`, `transcript.json`, `edit-decision-notes.md`, `cut-list.json`, `processed.mp4` |
| 3 | Caption/Subtitle Agent | caption text, grouping, highlights, ASR correction | `caption-plan.md`, `caption-beats.json` |
| 4 | Asset Generation Agent | screenshots, b-roll, diagrams, generated assets | `asset-plan.md`, `asset-manifest.json` |
| 5 | Motion/Overlay Agent | timing, pattern interrupts, transitions, overlay behavior | `motion-plan.md`, `overlay-timeline.json` |
| 6 | HyperFrames Assembly Agent | HTML/CSS/GSAP composition implementation | `index.html`, `assembly-notes.md`, `assembly-checklist.md` |
| 7 optional | QA/Review Agent | verdict, punch list, render readiness review | `qa-report.md`, `qa-punch-list.md`, `final-approval.md` |
| Optional | R2/Repliz Publish Gate | upload approved render to R2 and schedule Repliz | `videos/<slug>/repliz-publish.json` |

Do not let one stage silently take over another stage's responsibility. If QA finds a weak hook, send it back to the Creative Director. If captions are unreadable, send it back to Caption/Subtitle or HyperFrames Assembly depending on whether the issue is wording/timing or layout.

Do not let QA approval silently become publish approval. After final render, stop and ask the user to review the edited video with three choices: publish as-is, QA first, or revisions. R2 upload and Repliz scheduling happen only after explicit user approval and only through a command that includes `--approved`.

## Stage 0 - Intake

Start every project by collecting:

- raw video path, usually `raw/<file>.mp4`
- reference video path, usually `references/<file>.mp4`, if any
- user goal
- target platform: Reels, TikTok, Shorts
- target duration, if any
- required CTA, if any
- moments that must be preserved
- restrictions:
  - no generated people
  - no fake UI
  - no client/private data
  - no heavy motion
  - keep original footage untouched

Create a slug:

```text
videos/<slug>/
```

Good slug examples:

- `ai-workflow-founder-hook`
- `flutter-ui-review`
- `kumar-inspired-ai-systems-manifesto`

Bad slug examples:

- `final`
- `video1`
- `new-edit`

## Stage 1 - Creative Director

Purpose:

Create the editorial direction before any technical editing.

Inputs:

- user request
- source video notes
- reference video notes
- Dena style guide

Output:

`videos/<slug>/creative-brief.md`

Required decisions:

- primary content lane
- optional secondary lane
- one-sentence premise
- audience
- emotional promise
- primary hook
- backup hooks
- retention structure
- visual direction
- caption direction
- asset needs
- CTA
- risks
- handoff instructions

Content lanes:

- `ai-systems`
- `developer-craft`
- `founder-operator`
- `journey-reflection`
- `family-vlog`
- `viral-character`

Format choices:

- `clean-talking-head`
- `contextual-recut`
- `character-led-manifesto`
- `mini-case-study`
- `vlog-story`

Rule:

Reference styles are ingredients, not costumes. If adapting a viral reference, extract mechanics such as hook contrast, title rhythm, montage structure, and ending loop. Do not copy persona, exact wording, or palette by default.

## Stage 2 - Transcript/Cut Agent

Purpose:

Turn raw footage into a clean editorial base with accurate transcript and reproducible cut decisions.

Start with media audit:

```bash
ffprobe -v error \
  -show_entries format=duration,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,sample_rate,channels \
  -of json <input>

ffmpeg -hide_banner -i <input> \
  -af volumedetect -vn -sn -dn -f null /dev/null

ffmpeg -hide_banner -i <input> \
  -af silencedetect=noise=-34dB:d=0.35 -vn -f null /dev/null
```

Extract audio for ASR:

```bash
ffmpeg -i <input> -vn -ac 1 -ar 16000 videos/<slug>/audio.wav
```

Transcription requirements:

- create `transcript.json`
- include timestamps
- prefer word-level timestamps when possible
- correct obvious domain terms
- do not invent missing speech
- mark uncertain words

Common domain corrections:

- `cloud` -> `Claude` when AI/dev context supports it
- `chat gpt` -> `ChatGPT`
- `cr m` -> `CRM`
- `air p` -> `ERP`
- `front end` -> `frontend`
- `back end` -> `backend`

Cut rules:

- Cut for meaning first, rhythm second, speed third.
- Remove dead air and repeated starts.
- Preserve human pauses when they add authenticity.
- Avoid robotic over-tightening.
- Default speed: `1.2x`.
- If rushed, use `1.12x-1.18x`.

Outputs:

- `metadata.json`
- `transcript.json`
- `edit-decision-notes.md`
- `cut-list.json`
- `processed.mp4`, if a base cut is produced

## Stage 3 - Caption/Subtitle Agent

Purpose:

Turn transcript and cut decisions into readable social captions and hook/CTA text.

Outputs:

- `caption-plan.md`
- `caption-beats.json`

Caption style:

- language: Indonesian by default
- register: Dena's natural `gue/lo` voice
- text: short phrase beats
- ideal visible phrase: `1-4` words
- acceptable visible phrase: `1-6` words
- fill: white
- stroke/shadow: black
- highlight: yellow for one meaningful word or phrase
- placement: lower-middle or lower-center, not platform-bottom
- safe bottom: at least `220px`
- safe top: at least `120px`, unless an intentional hook card uses it

Caption beat shape:

```json
{
  "source": "videos/<slug>/processed.mp4",
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
  ]
}
```

Rules:

- Break by meaning, not arbitrary word count.
- Keep product names intact.
- Do not subtitle every silence or music bridge.
- Do not over-highlight.
- Hook and CTA must work muted.

## Stage 4 - Asset Generation Agent

Purpose:

Create or select visual support assets that clarify, prove, or reset attention.

Use assets when the video mentions:

- AI workflows
- agents
- dashboards
- CRM/ERP
- product UI
- code
- before/after states
- proof moments
- a reference style requiring montage or visual support

Outputs:

- `asset-plan.md`
- `asset-manifest.json`
- local files in `videos/<slug>/assets/`

Asset categories:

- `screenshot`
- `generated-still`
- `generated-video`
- `source-broll`
- `diagram`
- `icon`
- `sticker`
- `texture`

Asset manifest shape:

```json
{
  "assets": [
    {
      "id": "asset-001",
      "type": "screenshot",
      "path": "videos/<slug>/assets/crm-dashboard-proof-18s.png",
      "purpose": "Show workflow proof while Dena mentions CRM automation",
      "usedAt": [18.2],
      "privacy": "no private data visible",
      "notes": "Crop to focused table; avoid tiny full dashboard"
    }
  ]
}
```

Rules:

- Use local assets only.
- Blur or remove private data.
- Avoid generic AI robot imagery.
- Avoid fake product UI unless explicitly approved.
- Prefer focused readable crops over dense full-screen screenshots.
- Do not cover Dena's face or mouth too long.

## Stage 5 - Motion/Overlay Agent

Purpose:

Design how captions, overlays, assets, effects, and CTA moments appear through time.

Outputs:

- `motion-plan.md`
- `overlay-timeline.json`

Track model:

- Track `1`: processed main video and separate audio
- Track `2`: captions/subtitles
- Track `3`: retention effects, emphasis flashes, zoom labels, progress markers
- Track `4`: contextual overlays, screenshots, images, b-roll, mini clips, stickers
- Track `5`: hook card, editorial title, big takeaway, CTA/end card

Common motion primitives:

- `caption-pop`
- `hook-card-snap`
- `editorial-title-slam`
- `proof-card-slide`
- `focus-ring`
- `punch-zoom`
- `background-dim`
- `flash-cut`
- `progress-bar`
- `cta-morph`

Pattern interrupt cadence:

- talking-head educational: every `4-8s`
- cinematic manifesto: every `8-12s`
- vlog/reflection: only when meaning changes

Overlay timeline shape:

```json
{
  "overlays": [
    {
      "id": "proof-card-018",
      "type": "proof-card",
      "track": 4,
      "start": 18.2,
      "duration": 3.4,
      "assetId": "asset-001",
      "motion": "proof-card-slide",
      "placement": "right-mid",
      "purpose": "Show concrete proof without hiding face"
    }
  ]
}
```

Rules:

- Motion must guide attention.
- Do not add motion for decoration.
- Avoid dense proof cards behind active captions.
- Avoid heavy shake unless the brief explicitly requires it.
- Track index is for temporal overlap; visual stacking is controlled by CSS `z-index`.

## Stage 6 - HyperFrames Assembly Agent

Purpose:

Implement the approved cut, captions, assets, and motion plan into editable HyperFrames HTML.

Primary files:

- `index.html`
- optional `compositions/*.html`

Handoff outputs:

- `assembly-notes.md`
- `assembly-checklist.md`

HyperFrames contract:

- root composition has stable `data-composition-id`
- root has `data-width`, `data-height`, `data-duration`
- default social size: `1080x1920`
- every timed element has:
  - `data-start`
  - `data-duration`
  - `data-track-index`
- every visible timed element has `class="clip"`
- same-track clips do not overlap
- video is muted
- separate audio element exists
- GSAP timeline is paused
- timeline is registered on `window.__timelines`
- timeline key matches root `data-composition-id`
- local assets only
- deterministic logic only:
  - no `Date.now()`
  - no `Math.random()`
  - no network fetches
  - no remote render assets

Conceptual HTML skeleton:

```html
<main
  data-composition-id="dena-example"
  data-width="1080"
  data-height="1920"
  data-duration="26.63"
>
  <video
    id="base-video"
    class="clip base-video"
    data-start="0"
    data-duration="26.63"
    data-track-index="1"
    src="videos/example/processed.mp4"
    muted
    playsinline
  ></video>

  <audio
    id="base-audio"
    data-start="0"
    data-duration="26.63"
    data-track-index="1"
    src="videos/example/audio.wav"
  ></audio>

  <div
    id="cap-001"
    class="clip caption"
    data-start="0"
    data-duration="1.2"
    data-track-index="2"
  >
    AI-NYA <span class="highlight">BUKAN</span> MASALAH
  </div>
</main>

<script>
  window.__timelines = window.__timelines || {};
  const timeline = gsap.timeline({ paused: true });
  timeline.fromTo(
    "#cap-001",
    { autoAlpha: 0, y: 18, scale: 0.96 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.16 },
    0
  );
  window.__timelines["dena-example"] = timeline;
</script>
```

After every `.html` edit:

```bash
npm run check
```

Fix errors before handoff.

## Stage 7 - QA/Review Agent

Run only when the user chooses QA first, asks for readiness/punch-list review, or needs regression review.

Purpose:

Decide whether the edit is ready, needs revisions, or is blocked.

Outputs:

- `qa-report.md`
- `qa-punch-list.md`
- `render-review.md`, if render exists or final render was requested
- `final-approval.md`, only if verdict is `pass`

Verdicts:

- `pass`: ready for final render or publish approval
- `pass-with-minor-notes`: usable with non-blocking polish notes
- `revise`: not ready; major viewer/style issue remains
- `blocked`: cannot review because inputs, preview, render, or verification evidence are missing

Review axes:

- creative fit
- Dena style fit
- caption readability
- motion and overlay quality
- technical HyperFrames contract
- audio quality
- render output
- platform readiness

Required checks:

- `npm run check`
- preview first frame
- preview first `0-3s`
- preview first caption
- preview densest caption
- preview first overlay
- preview most complex motion
- preview CTA
- preview final frame
- if render exists, review rendered MP4 separately from HTML preview

Do not approve if:

- captions are unreadable
- hook is weak
- audio is missing/out of sync/harsh
- private data is visible
- render is blank/frozen/out of sync
- reference style overwhelms Dena's identity
- `npm run check` fails after `.html` edits

## Optional R2/Repliz Publish Gate

This gate is optional and only runs after a rendered MP4 exists.

Purpose:

- upload the approved MP4 to Cloudflare R2 with Wrangler remote storage
- build a public video URL from `R2_PUBLIC_BASE_URL` and the object key
- schedule one Repliz post per configured social account
- write a local non-secret receipt to `videos/<slug>/repliz-publish.json`

Rules:

- stop after final render and ask the user to review the edited video
- do not upload to R2 or schedule Repliz until the user explicitly approves
- require an approval flag such as `--approved` before any network publish work
- use `CLOUDFLARE_ACCOUNT_ID` to select the Cloudflare account
- use `npx wrangler r2 object put "${R2_BUCKET}/${objectKey}" --remote --file "${renderFile}" --content-type video/mp4`
- do not require S3 access keys, R2 secret keys, or `wrangler.jsonc`
- do not put real `.env` values in docs, tests, examples, or blueprints

Expected placeholder config:

```bash
REPLIZ_API_BASE_URL=<repliz-api-base-url>
REPLIZ_ACCESS_KEY=
REPLIZ_SECRET_KEY=
R2_BUCKET=<r2-bucket>
R2_PUBLIC_BASE_URL=https://<r2-public-domain>
R2_PREFIX=<r2-prefix>
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
REPLIZ_FACEBOOK_ACCOUNT_ID=
REPLIZ_YOUTUBE_ACCOUNT_ID=
REPLIZ_TIKTOK_ACCOUNT_ID=
REPLIZ_INSTAGRAM_ACCOUNT_ID=
```

Command after user approval:

```bash
npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved
```

## Dena Style Standard

Voice:

- Indonesian by default
- natural Dena register: `gue`, `lo`, `menurut gue`, `jujur`, `ternyata`
- practical, direct, reflective
- not stiff corporate Indonesian
- not generic motivational language

Visual:

- vertical `9:16`
- default `1080x1920`
- top black hook card when useful
- bold readable captions
- white text with heavy black stroke/shadow
- yellow highlight for the key word/phrase only
- clean overlays, not clutter

Editing:

- first 3 seconds must stop scroll
- remove dead air and repeated thinking
- preserve authentic monologue
- use overlays only when they clarify or re-engage
- end with one CTA

## Reference Video Adaptation

When the user supplies a viral reference, audit the reference first.

Extract:

- duration
- structure
- hook timing
- title/caption style
- motion grammar
- sound/music role
- visual pacing
- color/typography
- CTA/end frame
- loop mechanics

Adapt:

- hook contrast
- title rhythm
- montage structure
- proof/aura beats
- humanizer ending
- loop frame

Do not copy:

- creator persona
- exact title wording
- exact palette by default
- reference watermark/branding
- villain/dark identity when Dena's topic is practical/human

For Kumar-inspired videos:

- keep the idea as cinematic character manifesto
- use sparse bold titles
- create mission/proof/humanizer structure
- preserve Dena as AI systems builder
- avoid default red-black villain palette unless the Creative Director explicitly chooses it

## Data Format Appendix

### `metadata.json`

```json
{
  "source": "raw/example.mp4",
  "duration": 62.4,
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "audio": {
    "codec": "aac",
    "channels": 2,
    "sampleRate": 44100
  },
  "notes": ["talking-head", "no burned-in captions"]
}
```

### `cut-list.json`

```json
{
  "source": "raw/example.mp4",
  "target": "videos/<slug>/processed.mp4",
  "segments": [
    {
      "id": "seg-001",
      "sourceStart": 0.0,
      "sourceEnd": 4.8,
      "action": "keep",
      "reason": "strong hook"
    },
    {
      "id": "seg-002",
      "sourceStart": 4.8,
      "sourceEnd": 6.1,
      "action": "cut-filler",
      "reason": "repeated start"
    }
  ]
}
```

### `caption-beats.json`

See Stage 3.

### `asset-manifest.json`

See Stage 4.

### `overlay-timeline.json`

See Stage 5.

## Common Failure Modes

Weak result even though render succeeds:

- Creative direction was skipped.
- Hook is vague.
- Main point arrives too late.
- CTA does not match the topic.

Caption issues:

- too many words per beat
- weak phrase grouping
- captions too low
- yellow highlight overused
- ASR mistakes uncorrected

Asset issues:

- generic AI imagery
- fake product UI
- unreadable screenshot
- private data visible
- asset competes with speaker

Motion issues:

- effects added without purpose
- pattern interrupts too frequent
- overlay hides face/mouth
- dense card appears behind caption

HyperFrames issues:

- missing `class="clip"`
- missing timing attributes
- same-track overlap
- timeline key mismatch
- video audio relied on while video is muted
- remote asset in render path
- random/time/network logic creates nondeterministic render

QA issues:

- no preview evidence
- no `npm run check` after `.html` edit
- final approval written despite major issues when QA was requested
- rendered MP4 not reviewed separately
- R2/Repliz publish run before explicit user approval
- real `.env` value copied into docs or examples

## Completion Standard

A video is done only when:

- all required stage artifacts exist
- the edit matches the creative brief
- captions are readable on phone
- overlays serve the story
- audio is clear and synced
- `npm run check` passes after `.html` edits
- preview or render has been reviewed
- no blockers remain
- no major issues remain
- if QA was requested, `qa-report.md` records the verdict
- if QA was requested, `final-approval.md` exists only for `pass`
- any R2/Repliz publish waits for explicit user approval and uses `--approved`
- public docs/examples contain placeholders, not real `.env` values

If any item is missing, the AI agent must report the exact gap and route the work back to the owning stage.
