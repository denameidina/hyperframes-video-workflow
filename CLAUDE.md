# HyperFrames Composition Project

## Initial Setup After Clone

For a fresh clone, read `docs/initial-setup.md` before running preview, render,
or transcription commands. AI agents must also read
`docs/ai-agent-initial-setup.md`.

The project-local transcription tool is `vendor/whisper.cpp`. If it is missing,
initialize the submodule and build/download the default model:

```bash
git submodule update --init --recursive vendor/whisper.cpp
cmake -S vendor/whisper.cpp -B vendor/whisper.cpp/build
cmake --build vendor/whisper.cpp/build -j --config Release
sh vendor/whisper.cpp/models/download-ggml-model.sh large-v3-turbo
```

## Dena Video Editing Context

Before editing any Dena Meidina social video, read:

`docs/dena-social-video-style-guide.md`

Use it as the source of truth for Dena's IG/TikTok style, voice, hook patterns, caption style, edit pipeline, and HyperFrames layer contract. Do not ask the user to re-explain the style unless the uploaded video creates a real ambiguity.

## Dena Agent Workflow Discipline

For Dena Meidina social-video work, use the specialized agents in `docs/agents/` as the operating workflow. These files are not optional notes; they are the project contract for planning, editing, assembling, and reviewing videos.

Start by reading the local workflow skill:

`docs/skills/dena-video-editing-workflow/SKILL.md`

Use that skill as the router, then read the specific agent file for the current stage.

### Mandatory Agent Order

Default full workflow:

1. `docs/agents/01-creative-director.md`
2. `docs/agents/02-transcript-cut-agent.md`
3. `docs/agents/03-caption-subtitle-agent.md`
4. `docs/agents/04-asset-generation-agent.md`
5. `docs/agents/05-motion-overlay-agent.md`
6. `docs/agents/06-hyperframes-assembly-agent.md`
7. `docs/agents/07-qa-review-agent.md`

Run the agents sequentially unless the user explicitly requests a narrow technical fix. Do not jump to assembly before creative direction, cut logic, captions, assets, and motion have either been completed or explicitly marked unnecessary.

### Routing Rules

- New raw video, reference video, "make this viral", "edit like this", hook/style direction, or format choice: start with Agent 01.
- Silence cuts, transcript, filler removal, pacing, content structure, or processed media: use Agent 02.
- Captions, subtitles, hook text, caption grouping, highlights, ASR corrections, or CTA text: use Agent 03.
- Screenshots, generated stills/video, b-roll, diagrams, UI mockups, stickers, textures, or proof visuals: use Agent 04.
- Overlay timing, pattern interrupts, zooms, effects, cards, progress bars, or transition behavior: use Agent 05.
- Editing `index.html`, `compositions/*.html`, timed clips, GSAP timelines, HyperFrames tracks, or local asset wiring: use Agent 06 and the relevant HyperFrames skill.
- Final approval, punch list, render readiness, platform readiness, or regression review: use Agent 07.

### Discipline Rules

1. Before acting as an agent, read that agent's markdown file completely.
2. Read all required upstream files listed by that agent before making decisions.
3. Produce the expected handoff artifacts for that agent in `videos/<slug>/` whenever a slug exists.
4. If an upstream artifact is missing, either create it with the correct upstream agent first or write a readiness/blocker note. Do not silently invent missing decisions.
5. Keep each agent inside its responsibility boundary. For example, Agent 05 may design motion timing, but Agent 06 implements it in HyperFrames.
6. QA findings must route fixes back to the owning agent instead of becoming vague "polish" work.
7. If the user says "lanjut agent berikutnya", continue to the next numbered file in `docs/agents/` and keep the same level of detail.

### Minimum Handoff Chain

For a complete social video, expect this chain:

- `creative-brief.md`
- `edit-decision-notes.md`
- `caption-plan.md`
- `caption-beats.json`
- `publish-captions.md`
- `asset-plan.md` and `asset-manifest.json`, when assets are needed
- `motion-plan.md`
- `overlay-timeline.json`
- `assembly-notes.md`
- `assembly-checklist.md`
- `qa-report.md`
- `qa-punch-list.md`
- `final-approval.md`, only after QA passes

### Interaction With HyperFrames

Agent 06 does not replace HyperFrames skills. When writing or modifying HyperFrames compositions, read `/hyperframes` and the routed HyperFrames skill first, then follow Agent 06. After editing any `.html` composition, run `npm run check` before reporting completion.

Docs-only edits to `docs/agents/*.md`, `AGENTS.md`, or `CLAUDE.md` do not require `npm run check` unless they also modify `.html` composition files.

## Skills — USE THESE FIRST

**Always invoke the relevant skill before writing or modifying compositions.** Skills encode framework-specific patterns (e.g., `window.__timelines` registration, `data-*` attribute semantics, shader-compatible CSS rules) that are NOT in generic web docs. Skipping them produces broken compositions.

**Doing anything with HyperFrames?** Start at `/hyperframes` — it tells you what HyperFrames can do and which skill or workflow handles your intent (make a video, TTS / BGM, prep footage, author / animate, render, install blocks), and routes every "make me a video" request to the right workflow. Read it first, especially when there's no project context to orient you. The video workflows it routes to:

- `/product-launch-video` — a **product** URL or brief / script → 60-90s product launch / SaaS / promo video.
- `/website-to-video` — a **general** website / URL → a video _of_ the site (tour / showcase / social clip from captured visuals); a product **launch / promo** is `/product-launch-video`.
- `/faceless-explainer` — arbitrary text (topic / article / notes), **no URL, no website capture** → 60-90s faceless explainer.
- `/embedded-captions` — an existing talking-head video (MP4) → the same footage with captions / subtitles added (rail + embed, or pure-cinematic embed); the footage itself is untouched.
- `/talking-head-recut` — an existing talking-head / interview / podcast video (MP4) → the same footage **packaged with designed graphic overlays** (kinetic titles, lower-thirds, data callouts, pull-quotes, side panels, pip) synced to the transcript; the clip plays unchanged underneath. (Plain captions/subtitles → `/embedded-captions`.)
- `/pr-to-video` — a GitHub PR (URL / `owner/repo#N` / "this PR") → 30-90s code-change explainer (changelog / feature reveal / fix / refactor).
- `/motion-graphics` — a short (typically under 10s) design-led **motion graphic**, motion-is-the-message, no narration: kinetic type, a stat / number count-up, a chart, a logo sting, a lower-third / overlay, or an animated tweet / headline / captured-page highlight; rendered to MP4 or a transparent overlay. Longer / narrated / custom → `/general-video`.
- `/general-video` — fallback for any other video (title card, longer brand / sizzle reel, multi-scene montage, static loop, custom composition); the original hyperframes authoring flow, any length.

**Porting an existing composition?** `/remotion-to-hyperframes` translates a Remotion (React) composition into HyperFrames HTML — a source migration, separate from the creation workflows above.

The domain skills (`/hyperframes-core`, `/hyperframes-animation`, `/hyperframes-creative`, `/hyperframes-cli`, `/hyperframes-media`, `/hyperframes-registry`) and the full capability map live inside `/hyperframes` — it is the single source of truth for which skill handles which intent.

> **Tailwind v4 projects** (`hyperframes init --tailwind`): see `/hyperframes-core` → `references/tailwind.md`.

> **Skills not available or need updating?** Run `npx skills add heygen-com/hyperframes`
> and restart the agent session so the new skills load.

## Commands

```bash
npm run dev          # start the preview server (long-running — keep it alive in background)
npm run check        # lint + validate + inspect
npm run render       # render to MP4
npm run publish      # publish and get a shareable link
npx hyperframes lint --verbose  # include info-level findings
npx hyperframes lint --json     # machine-readable output for CI
npx hyperframes docs <topic> # reference docs in terminal
```

> **`npm run dev` is a long-running server, not a one-shot command.** It blocks until stopped.
> In Claude Code, always run it with `run_in_background: true`. Never run it as a foreground
> command — it will time out and the server will die, breaking the browser preview.

## Documentation

**For quick reference**, use the local CLI docs command (no network required):

```bash
npx hyperframes docs <topic>
```

Topics: `data-attributes`, `gsap`, `compositions`, `rendering`, `examples`, `troubleshooting`

**For full documentation**, discover pages via the machine-readable index — do NOT guess URLs:

```
https://hyperframes.heygen.com/llms.txt
```

## Project Structure

- `index.html` — main composition (root timeline)
- `compositions/` — sub-compositions referenced via `data-composition-src`
- `meta.json` — project metadata (id, name)
- `transcript.json` — whisper word-level transcript (if generated)

## Linting — ALWAYS RUN AFTER CHANGES

After creating or editing any `.html` composition, **always** run the full check before considering the task complete:

```bash
npm run check
```

Fix all errors before presenting the result. Inspect warnings should be reviewed before rendering.

## Key Rules

1. Every timed element needs `data-start`, `data-duration`, and `data-track-index`
2. Elements with timing **MUST** have `class="clip"` — the framework uses this for visibility control
3. Timelines must be paused and registered on `window.__timelines`:
   ```js
   window.__timelines = window.__timelines || {};
   window.__timelines["composition-id"] = gsap.timeline({ paused: true });
   ```
4. Videos use `muted` with a separate `<audio>` element for the audio track
5. Sub-compositions use `data-composition-src="compositions/file.html"` to reference other HTML files
6. Only deterministic logic — no `Date.now()`, no `Math.random()`, no network fetches
