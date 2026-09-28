# Hook And Angle (Reference)

Rules for choosing the angle, the transcript hook (and its length), and writing
`creative-brief.md`. Loaded by `docs/agents/01-story.md` at the step that names
it. Workflow order lives in the phase documents, not here.

## Decision Workflow

### 1. Identify The Content Lane

Pick exactly one primary lane:

- `ai-systems`: AI agents, automation, system building, CRM/ERP, real business workflows.
- `developer-craft`: coding, Flutter, debugging, software delivery, engineering taste.
- `founder-operator`: client delivery, business process, leadership, execution.
- `journey-reflection`: personal lesson, hard moment, realization, founder life.
- `family-vlog`: family/lifestyle story with a practical or emotional takeaway.
- `viral-character`: cinematic identity/mission format inspired by references like Kumar.

You may add one secondary lane, but the primary lane drives the edit.

Bad output:

`ai-systems + founder + developer + lifestyle + motivation`

Good output:

`primary: ai-systems`

`secondary: founder-operator`

### 2. Find The Real Story

Do not summarize the video. Extract the story engine.

Ask:

- What is the tension?
- What does Dena know that the audience does not?
- What would make a founder/developer stop scrolling?
- What is the strongest contrast?
- What moment proves this is real, not generic advice?
- What should the viewer remember after 24 hours?

The story should fit one of these patterns:

- `problem -> discovery -> proof -> lesson`
- `assumption -> contradiction -> realization -> CTA`
- `enemy -> mission -> proof -> follow/save`
- `mistake -> consequence -> correction -> takeaway`
- `ordinary scene -> unexpected twist -> meaning`

### 3. Choose The Hook Type

Pick one hook type:

- `callout`: Directly addresses a target viewer.
  - Example: "Ini pesan buat founder yang masih nyebut AI cuma ChatGPT."
- `contrast`: Shows a mismatch.
  - Example: "Gue kira problemnya AI-nya. Ternyata workflow bisnisnya yang rusak."
- `mistake`: Names a costly error.
  - Example: "Kesalahan paling mahal waktu bikin AI agent: langsung ngoding."
- `proof`: Opens with evidence.
  - Example: "Workflow manual 3 jam ini gue bikin jalan sendiri."
- `mission`: Publicly declares an ambition.
  - Example: "Gue mau buktiin AI bukan gimmick, tapi sistem kerja bisnis nyata."
- `plot-twist`: Starts ordinary, then flips.
  - Example: "Awalnya cuma mau review UI. Ujungnya ketahuan product thinking-nya bolong."

The opening must work with audio muted: the hook card shows the hook's first
words from `00:00.00`.

The hook strategy starts here, and the final opening audio must be grounded in
the transcript. The Story phase transcribes the source before this step, so
base the primary and backup hooks on exact spoken lines and include their
source timestamps. Do not invent a spoken claim and hand it off as though it
exists in the footage.

### 4. Decide The Format

Choose one format:

- `clean-talking-head`: Tight monologue, strong captions, light overlays.
- `contextual-recut`: Talking-head plus screenshots, diagrams, cards, and proof overlays.
- `character-led-manifesto`: Cinematic identity + bold mission + sparse title captions.
- `mini-case-study`: Before/after, problem, system, result.
- `vlog-story`: Real-life scene, narrative captions, lightweight overlays.

Use `character-led-manifesto` only when the source video supports confidence, stakes, and identity. Do not force it onto a casual diary clip.

### 5. Define The Retention Spine

Every video needs a retention spine.

Default structure for a 30-75 second Dena video:

- `0-hook_end`: hook / enemy / contradiction (length decided in Transcript Hook)
- `hook_end-10s`: identity or problem setup
- `10-25s`: proof, example, or escalation
- `25-45s`: insight, framework, or consequence
- `45-60s`: takeaway
- `last 3-7s`: CTA

Default structure for a 20-30 second character-led video:

- `0-hook_end`: verbatim transcript hook + visual shock
- next `3s`: identity twist
- `6-12s`: mission or bold claim
- `12-20s`: aura/proof montage
- `20-25s`: humanizer CTA
- `25-27s`: end title or loopback frame

### 6. Choose Visual Grammar

Specify the visual language for the editor.

Options:

- `dena-default`: black hook card, white/yellow captions, subtle overlays.
- `cinematic-operator`: darker contrast, confident framing, sparse editorial text.
- `tech-dashboard`: UI screenshots, cards, terminal/code motifs, system diagrams.
- `founder-vlog`: handheld, warmer, more human, still tight.
- `kumar-inspired`: cinematic character manifesto, bold sparse titles, aura montage.

When using `kumar-inspired`, adapt the mechanics only:

- contrast between role and visual treatment
- big mission statement
- cinematic presence
- sparse title captions
- humanizer CTA

Do not copy:

- red-black villain palette as the default
- "steal your jobs" framing unless context truly supports it
- fake persona
- over-serious tone without a human release

### 7. Define Asset Needs

List assets required from downstream agents:

- Screenshots
- URL/site captures or screen recordings
- Generated still images
- Generated b-roll clips
- Icons/stickers
- UI diagrams
- Sound effects
- Music direction
- Text overlays
- CTA/end card

Each asset request must include:

- Purpose
- Timestamp range
- Style
- Whether it is mandatory or optional
- What it must not show
- Source or URL to inspect, when relevant

Example:

```md
Asset: AI workflow control room still
Purpose: support the line "AI bukan gimmick, ini sistem kerja"
Timestamp: 12-16s
Style: cinematic but credible, no robot faces, no sci-fi hologram clutter
Required: optional
Do not show: fake ChatGPT UI, unreadable dashboards, random neon robots
```

If the user provides a URL or the story depends on a live tool/product/site, request Screen Plan phase (visual step) to research or inspect that link and plan local screenshot/screen-record captures, which the Build phase makes when useful. Do not solve URL context with generic cards unless the real capture is unsafe, unavailable, or visually unhelpful.

When a real capture is not enough, explicitly allow Codex/image generation for grounded bitmap support assets. Generated assets should clarify mood, metaphor, or process, but must not be presented as real proof.

### 8. Choose A Non-Promissory CTA

CTA should invite a lightweight viewer action without promising a future deliverable.

Good CTA shapes:

- save/comment question
- "komen `workflow` kalau ini relate"
- "cerita di komentar kalau lo pernah ngalamin"
- "follow kalau lo suka bahas AI dipakai di bisnis nyata"

Avoid CTA that implies Dena will definitely send, publish, teach, or share something later unless the user explicitly requested that promise.

Bad default CTA:

- "Komen `mau`, nanti gue kirim source code."
- "Gue bakal breakdown lengkap di video berikutnya."
- "DM gue, nanti gue share template."

## Transcript Hook

After the full transcript and content map are available, lock exactly one
spoken source excerpt as the opening hook. The Story phase owns the hook
strategy, selecting the real source moment that fulfills it, and deciding how
long the hook runs (`hook_end`).

The hook has one job: make a scrolling viewer stop, then keep watching to the
end. It must pass both tests:

1. **Stop-scroll test.** The opening words alone, read muted on the hook card,
   interrupt the scroll: a specific pain, a contradiction, a surprising claim,
   or a named viewer. A slow wind-up before the grabbing words fails.
2. **Watch-to-end test.** The hook opens a loop (a question, a problem, a
   promise, a "why/how") that only the rest of the video closes, and the
   payoff lands late, ideally near the end before the CTA. If the answer is
   already obvious from the hook, or the video resolves it in the first few
   seconds, the viewer has no reason to stay.

The selected excerpt must:

- Contain the core tension, peak problem, contradiction, proof, or curiosity
  gap that makes the viewer want the explanation, without giving away the
  answer.
- Use a contiguous, verbatim spoken phrase from the source.
- Start at output `00:00.00` and end at `hook_end`: the processed-timeline
  point (after the speed adjustment) where the hook's decision is complete.
  There is no fixed maximum such as 3 seconds. Take the shortest intact span
  that still carries the whole decision; stop before the answer or the
  explanation begins.
- Preserve the original meaning. Shorten only by removing silence or filler;
  do not splice separate words into a claim Dena never made.
- Lead directly into the explanation or setup after the hook.
- Be removed from its original later position unless the Creative Brief asks
  for an intentional callback; document any retained repetition.

Decide the length by asking: at which word does a viewer feel the tension and
need the rest of the video? End there. A hook that stops before that word is too
short; a hook that keeps talking after it spends attention the explanation
needs. Tighten silence and filler inside the hook either way.

If no contiguous source excerpt carries the decision without changing meaning,
mark the hook as `blocked` and ask the user. Do not substitute fabricated
dialogue.

Record the locked hook in both `edit-decision-notes.md` and `cut-list.json`:

- exact spoken quote
- source start and end
- processed output start and end (`hook_end`)
- selection reason, stated against both tests
- length reason: the decision the hook completes at `hook_end`
- open loop: the question the hook leaves open
- payoff: the output timestamp and line where the video closes that loop
- transition into the explanation
- original-occurrence handling: `removed` or `intentional-callback`

## Hook Extraction

Hook extraction does not invent the hook strategy. It must identify at least three
source-grounded candidates, then lock exactly one candidate using the
Transcript Hook contract above.

Find:

- Strongest sentence
- Most surprising sentence
- Most specific pain
- Best proof statement
- Most emotional line
- Best CTA line

Return at least 3 hook candidate clips with timestamps and each candidate's
processed duration. Score each candidate on the stop-scroll test, the
watch-to-end test (what loop it opens and where the payoff lands), and whether
the decision lands intact. Length is not a criterion by itself; when two
candidates score equally, prefer the shorter.

Example:

```md
## Hook Candidates

1. 00:42.10-00:47.30
   Text: "AI-nya bukan masalah. Workflow bisnisnya yang belum jelas."
   Why: strong contradiction, fits Story phase `contrast` hook.

2. 01:08.20-01:13.90
   Text: "Tiga jam kerja manual ini bisa gue bikin jalan otomatis."
   Why: proof hook, concrete business value.
```

After the candidates, add the locked decision:

```md
## Transcript Hook

- Status: locked
- Exact spoken quote: "Workflow bisnisnya yang belum jelas."
- Source: 00:43.20-00:45.70
- Output: 00:00.00-00:02.50 (hook_end 00:02.50)
- Why: states the peak problem without revealing the explanation
- Length: ends on "belum jelas", where the problem is named; the next words
  start the explanation
- Open loop: "which part of the workflow is unclear, and how do you fix it?"
- Payoff: output 00:41.20, "jadi yang gue benerin duluan itu alurnya"
- Transition: resume with the original setup at output 00:02.50
- Original occurrence: removed
```

## Output Template

Use this template for every brief.

```md
# Creative Brief - <video slug>

## Source

- Raw video:
- Reference video:
- Transcript:
- Target platform:
- Target duration:

## Content Lane

- Primary:
- Secondary:

## Premise

<One sentence explaining what this video is really about.>

## Audience

<Who should stop scrolling and why.>

## Emotional Promise

<What the viewer should feel: challenged, seen, curious, relieved, impressed, etc.>

## Hook

Status: locked-from-transcript

Primary hook:

Exact spoken quote:

Source timestamp:

Hook window (output): 00:00.00-<hook_end>

Length reason:

Stop-scroll reason (opening words):

Open loop:

Payoff (output timestamp + line):

Backup hooks:

1.
2.
3.

Muted-viewer hook:

## Story Spine

1. 0-hook_end:
2. hook_end-10s:
3. 10-25s:
4. 25-45s:
5. Final CTA:

## Format

- Selected format:
- Why this format:

## Workflow Settings

- visual_density: <light|medium|heavy> (default medium)
- gate_cut: <on|off> (default off)

## User Approvals

- Facts, numbers, names, or quotes the user supplied for on-screen use:
- CTA promise approved by the user: <no | exact promise>
- Hook visual allowed to cover the face in the hook window (00:00.00-<hook_end>): <no | description>

## Visual Direction

- Visual grammar:
- Color/contrast:
- Framing:
- Caption style:
- Overlay style:
- Pattern interrupts:

## Script/Caption Direction

- Voice:
- Words to preserve:
- Words to cut:
- Caption emphasis:
- Forbidden tone:

## Visual Direction Notes

1. Asset:
   Purpose:
   Timestamp:
   Style:
   Required:
   Do not show:

## CTA

Primary CTA:

Backup CTA:

## Risks

- Risk:
- Mitigation:

## Handoff

For Screen Plan phase (captions step):

- Required opening: verbatim source excerpt at 00:00.00-<hook_end>, followed by
  the explanation flow. Do not change the hook length; route that to Story.

For Screen Plan phase (visual step):

For Build phase:

For QA phase:
```

## Quality Bar

A Story phase brief is good when:

- The hook is specific enough to write on screen immediately.
- The hook is locked to an exact transcript quote with its source timestamp.
- The video can be explained in one sentence.
- The downstream agents know exactly what to do next.
- The direction still sounds like Dena.
- The asset requests are tied to meaning, not decoration.
- The CTA follows naturally from the story.
- The CTA is non-promissory unless the user explicitly asked for a promise.
- The format is chosen because the source supports it.

A brief is weak when:

- It says "make it viral" without defining the emotional engine.
- It copies a reference without adapting to Dena.
- It asks for random stickers, images, or effects.
- It uses generic advice captions.
- It treats every line as equally important.
- It has no clear audience.

## Dena-Specific Guardrails

Always preserve:

- Indonesian voice with natural `gue/lo` register when suitable.
- Founder/operator credibility.
- Practical AI systems angle.
- Real work context.
- Human tone.

Avoid:

- Fake guru energy.
- Over-polished corporate promo language.
- Random motivational quotes.
- Dense educational slides.
- AI-generated visuals that feel like stock futurism.
- Making Dena look like a copy of another creator.

## Kumar-Inspired Adaptation Rules

Use the Kumar reference when the goal is a character-led viral monologue.

What the reference teaches:

- The product is the character, not the topic.
- A boring label becomes interesting when framed cinematically.
- A public mission gives viewers a reason to follow the next chapter.
- Sparse editorial captions can feel stronger than full subtitles.
- A humanizer at the end prevents the video from feeling too self-serious.

Dena adaptation:

- Boring label: AI system builder, CRM/ERP, workflow automation, developer work.
- Cinematic contrast: show Dena as an operator building real systems, not a generic AI influencer.
- Mission: prove AI can run real business workflows, not just generate text.
- Humanizer: a candid line, family moment, client chaos, or self-aware CTA.

Example direction:

```md
Primary hook:
Ini pesan buat founder yang masih nyebut AI cuma ChatGPT.

Mission line:
Gue mau buktiin AI bukan gimmick, tapi sistem kerja bisnis nyata.

Humanizer CTA:
Kalau topik ini relate, komen "workflow".
```

## Failure Modes

If transcript quality is poor:

- Mark unclear sections.
- Do not invent missing meaning.
- Ask Story phase to verify exact wording before final caption.

If raw video lacks a clear story:

- Pick the strongest moment and frame the edit as a micro-lesson.
- Avoid forcing a cinematic manifesto.

If user asks to copy a reference exactly:

- Extract the mechanism.
- Adapt the mechanism to Dena's persona.
- Explicitly note what will not be copied.

If the hook feels clickbait:

- Rewrite it around a real tension from the video.
- Use proof or contrast instead of exaggeration.

