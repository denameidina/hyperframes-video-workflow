# HyperFrames Composition Project

## Source of Truth — internal/docs/

The canonical documentation for this repo lives in `internal/docs/`, indexed by
`internal/docs/README.md` (numbered reading order + registry). This file and
`CLAUDE.md` are entry doors; detail docs are canonical. If they conflict, fix the
detail doc first, then sync the entry door.

**Start here:** read this file → `internal/docs/README.md` → only the doc
relevant to your task. Do not implement from memory when a doc exists.

- Video production → `docs/skills/dena-video-editing-workflow/SKILL.md` (router),
  with canon index [operations/video-editing-workflow](internal/docs/operations/video-editing-workflow.md).
- Code / publish / composition → [operations/implementation-standard](internal/docs/operations/implementation-standard.md).

**Documentation-First Rule:** before a task identify the owning doc (README →
Canonical Files); behavior change → write/update EARS first
([ears-standard](internal/docs/requirements/ears-standard.md)); architectural
decision → new ADR (`internal/docs/adr/NNNN-*.md`); a new doc must be linked from
the README index; update touched docs in the same commit as the code, or state
"no docs update needed" for purely mechanical changes.

**Definition of Done:** implementation matches docs; touched docs updated in the
same commit; tests run (or blocked with explicit reason); no stale paths/terms;
final report names the docs that changed.

**Enforcement:** Stop hook `.claude/hooks/ensure-docs-updated.py` blocks
completion when implementation files (`scripts/`, `index.html`, `compositions/`,
`docs/agents/`) are staged with no docs (`internal/docs/`, `AGENTS.md`,
`CLAUDE.md`) staged.

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

### Dena Social Video Non-Negotiables

- Every edited video must open with a contiguous, verbatim transcript excerpt
  that captures the core tension or peak problem, starting at processed output
  `00:00.00` and ending at the `hook_end` the Story phase decides (where the hook's
  decision lands; no fixed 3-second cap), then continue into the explanation.
  The hook must make viewers stop scrolling and watch to the end: its opening
  words grab muted viewers, and it opens a loop whose payoff lands late.
  The Story phase owns the source move and hook length; the Screen Plan phase
  captions the same words for muted viewing.
- Most Dena videos are storytelling/talking-head content. Default captions must cover every spoken word that survives the cut, using short running beats so muted viewers can follow the full story.
- Default processed speed is `1.2x`. If it is lowered, document the exact reason in `edit-decision-notes.md` and keep speech clarity as the only exception.
- When a user provides a URL or the transcript mentions a tool/product/site, the Screen Plan phase must research or inspect it and plan captures timed to the transcript context; the Build phase captures local screenshots/screen recordings when useful.
- The Screen Plan phase must write a `Visual Decision Log` in `visual-plan.md` for every visual-support opportunity. A motion visual from the menu in `docs/agents/references/styles/README.md` (motion b-roll, b-roll text, motion graphic, whiteboard, stop-motion, vox, mix-media, parallax) is the default for a line that explains, shows, compares, or sequences, or whose words or number are the point; use a real capture when the moment needs proof, and Codex/image generation for grounded bitmap assets only for mood, texture, or background moments that no motion visual can carry.
- Do not generate AI slop. Generated assets must be specific to the transcript, visually credible, and rejected if they look generic, fake, or detached from the workflow.
- Designed recuts need purposeful motion and audible but speech-safe SFX cues. Missing or too-quiet SFX is a QA issue.
- CTA must be non-promissory by default. Do not imply "gue akan kirim/bahas/share source later" unless the user explicitly asks for that promise.
- Generate mode (ADR-0025, `mode: generate`): a motion-design explainer from a topic, URL, or rewritten older video, with no footage of Dena. The hook is paragraph 1 of the script Dena approved at Gate 1 (script + voice); the TTS voiceover is never sped up to 1.2x; captions are hybrid (every word, hidden on the rail where a scene already shows it); Gate 2 always stops with the storyboard sheet. Rules: `docs/agents/references/generate-mode.md`.

## Dena Workflow Discipline

For Dena Meidina social-video work, use the phase documents in `docs/agents/` as the operating workflow. They are the project contract for planning, editing, assembling, and reviewing videos. Decision record: `internal/docs/adr/0008-four-phase-workflow.md`.

Start by reading the local workflow skill:

`docs/skills/dena-video-editing-workflow/SKILL.md`

Use that skill as the router, then read the phase document for the current phase. Each phase document names the reference in `docs/agents/references/` to read at each step; read references only when that step needs them.

### Phase Order

1. `docs/agents/01-story.md` — direction, transcript, hook locked from the transcript, cut, `processed.mp4`. Gate 1 (cut review) is optional: on only when the user asks or `creative-brief.md` sets `gate_cut: on`.
2. `docs/agents/02-screen-plan.md` — captions, then one visual plan (`visual-plan.md`). Gate 2 stops only when a timeline row matches a risk trigger R1–R6.
3. `docs/agents/03-build.md` — asset production, HyperFrames assembly in `videos/<slug>/`, `npm run video -- check <slug>`, render. Gate 3: stop for user review after render.
4. `docs/agents/04-qa.md` — optional. Runs only when the user chooses QA first or asks for a readiness, punch-list, or regression review, and always as a fresh-context subagent.

Run the phases in order unless the user explicitly requests a narrow technical fix. Do not start Build before the Story and Screen Plan artifacts exist, including the `Gate 2 Result` section of `visual-plan.md`.

### Routing Rules

- A motion-design video with no footage of Dena (topic, brief, URL, article, thread, rewritten older video): Story in generate mode (`docs/agents/references/generate-mode.md`).
- New project sources (one or many raw takes, B-roll, images), reference video, "make this viral", "edit like this", angle, hook, format, transcript, silence/filler cuts, pacing, speed, or processed media: Story.
- Captions, subtitles, hook text, caption grouping, highlights, ASR corrections, CTA text, or publish captions: Screen Plan (captions step).
- Which moments get visuals, visual type (screenshot, generated still/video, diagram, proof card, label, sticker), placement, overlay timing, pattern interrupts, zooms, effects, progress bars, transitions, or SFX cues: Screen Plan (visual step).
- Capturing/generating asset files, editing `videos/<slug>/index.html`, `videos/<slug>/compositions/*.html`, timed clips, GSAP timelines, HyperFrames tracks, local asset wiring, or rendering: Build, plus the relevant HyperFrames skill.
- Optional QA, punch list, render/platform readiness review, or regression review: QA.

### Discipline Rules

1. Before acting in a phase, read that phase document completely.
2. Read upstream artifacts in `videos/<slug>/`, not upstream phase documents.
3. Produce the phase's output artifacts in `videos/<slug>/` whenever a slug exists.
4. If an upstream artifact is missing, create it in the correct upstream phase first or write a readiness/blocker note. Do not silently invent missing decisions.
5. Keep each phase inside its boundary. Screen Plan decides visuals and timing; Build implements them in HyperFrames.
6. Review and QA findings route fixes back to the owning phase instead of becoming vague "polish" work.
7. If the user says "lanjut fase berikutnya" (or "lanjut agent berikutnya"), continue to the next numbered phase document.

### Minimum Handoff Chain

- Story: `creative-brief.md`, `metadata.json`, `sources.json`, `transcripts/<id>.json`, `processed-transcript.json`, `edit-decision-notes.md`, `cut-list.json`, `cut-map.json`, `processed.mp4`
- Screen Plan: `caption-plan.md`, `caption-beats.json`, `publish-captions.md`, `visual-plan.md`, `overlay-timeline.json`
- Build: `assets/asset-manifest.json` (when assets exist), `assembly-notes.md`, `assembly-checklist.md`, render MP4
- Optional QA: `qa-report.md`, `qa-punch-list.md`, and `final-approval.md` only after QA passes

### Repliz/R2 Auto Publish Gate

Auto publish is documented in `docs/repliz/integration-spec.md`.

- After final render, stop and ask the user to review the edited video (Gate 3).
- At the review gate, offer: publish as-is, run QA first, or request revisions.
- Do not upload to Cloudflare R2 or schedule Repliz until the user explicitly approves/confirms.
- If the user chooses publish as-is, QA artifacts are not required.
- If the user chooses QA first, run the QA phase as a fresh-context subagent before asking for final publish approval.
- Only after approval, run `npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved`.
- R2 uses Wrangler remote upload, `CLOUDFLARE_ACCOUNT_ID`, bucket from `R2_BUCKET`, and public base `https://<r2-public-domain>`.
- Do not add S3 access keys, R2 secret keys, or `wrangler.jsonc` for this flow unless the user explicitly asks.
- Do not test or call Repliz unless the user explicitly asks; R2-only smoke tests are allowed when requested.

### Interaction With HyperFrames

The Build phase does not replace HyperFrames skills. When writing or modifying HyperFrames compositions, read `/hyperframes` and the routed HyperFrames skill first, then follow `docs/agents/03-build.md`. After editing a video composition, run `npm run video -- check <slug>`; after editing the root template, run `npm run check`. Do this before reporting completion.

Docs-only edits to `docs/agents/**/*.md`, `AGENTS.md`, or `CLAUDE.md` do not require `npm run check` unless they also modify `.html` composition files.

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
npm run test:repliz  # unit test R2/Repliz CLI without real network
npm run test:motion-kit        # unit test motion b-roll engine
npm run test:craft-kit         # unit test craft-kit choreography recipes (CK.add/CK.at parity)
npm run test:style-kit         # unit test style-kit engine + style reference richness + paper pack licenses
npm run test:asset-lib         # asset library: build up to date, catalog/licenses/budget, presets contrast, SK runtime
npm run asset-lib -- build     # rebuild vendor/asset-lib outputs from vendor/asset-lib/src (offline)
npm run asset-lib -- fetch <icons|pictograms|fonts|maps|textures>  # refresh pinned third-party data (network)
npm run asset-lib -- process <in.png> <out.png|.webp> [--max 720]   # crop to alpha, resize, compress a bitmap
npm run asset-lib -- sheets    # render the contact sheets agents look at (docs/agents/references/asset-catalog/sheets/)
npm run test:render-blur       # unit test motion-blur pass
npm run check:broll-examples   # lint + validate + snapshot motion b-roll examples
npm run check:style-examples   # lint + validate + snapshot style b-roll examples (all 7 hosts; -- <style> for one)
npm run check:craft-examples   # lint + validate + snapshot craft-kit recipe examples
npm run style-examples -- build # regenerate example hosts from each style's examples.json
npm run moodboard -- build     # regenerate the moodboard studies host from moodboard.json
npm run moodboard -- sheets [style]  # render the per-style moodboard sheets (docs/agents/references/moodboard/sheets/)
npm run moodboard -- fetch [style]   # download real reference stills into the gitignored moodboard/local/ (network)
npm run video -- new <slug>    # scaffold videos/<slug>/ from the Dena starter (with sources/ + sources.json)
npm run video -- sources <slug> [--add-shared a,b] [--set <id> --role <r> --note <t>]  # project sources manifest (ADR-0022)
npm run video -- cut <slug>    # processed.mp4 + cut-map.json from cut-list.json (multi-source)
npm run video -- migrate-sources [--apply]  # one-off: raw/ + source.mp4 -> shared/ + sources.json
npm run video -- check <slug>  # lint + validate + inspect one video project
npm run video -- dev <slug>    # preview one video project (long-running)
npm run video -- snapshot <slug> --at 1.5,3  # stills, no Gemini upload
npm run video -- render <slug> [--blur]      # render to videos/<slug>/renders/
npm run video -- cutout <slug> --from 31.2 --dur 5 --name 07-dena  # matte a mix-media cut-out
npm run video -- layers <slug> --at 12.4 --name 05-scene   # parallax source + matted subject (or --image <file>)
npm run test:video             # unit test the video CLI
npm run studio                 # web UI: projects (sources upload, shared library), tmux agent sessions + terminal, renders, publish, voice test + music tabs (long-running)
npm run test:studio            # unit test the Studio server
npm run voice -- say --preset <p> --file <naskah.md> --out <dir>  # TTS voiceover + words.json (ADR-0023)
npm run voice -- ref --from <file> --at <s> --dur <s>   # 10-30 s reference of Dena's voice -> shared/voices/dena/
npm run voice -- clone --consent <audio>                 # Gemini voice replication (needs the consent clip)
npm run voice -- design --name <n> --prompt "<deskripsi>"  # Gemini voice design (id-ID)
npm run voice -- voices [--lang jv] [--search <q>]       # list Gemini prebuilt voices
npm run voice -- test build | test reveal <run>          # blind listening test (rate in Studio, tab Suara)
npm run test:voice             # unit test the voice adapter and listening test
npm run music -- add <url|file> --source <page> --license cc0|public-domain|pixabay|mixkit --title <t> --author <a> --mood <m> --energy <1-5>  # BGM -> shared/music/ (ADR-0024)
npm run music -- list [--mood <m>] [--min-dur <s>]       # BGM catalog (rejected tracks hidden)
npm run music -- check                                   # files, sha256, license allowlist, license proofs
npm run video -- new <slug> --generate      # generate mode: starter without base video, research/, brief stub (ADR-0025)
npm run video -- voice <slug> [--preset <p>]  # script.md -> voiceover, processed-audio.wav, processed-transcript.json
npm run video -- bgm <slug> --track <id> [--from <s>]  # shared/music track -> ducked bgm.wav + bgm.json
npm run video -- storyboard <slug>          # Gate 2 sheet from each scene's style example -> preview/storyboard-sheet.jpg
npm run test:music             # unit test the music library
npm run render:blur -- --slug <slug>  # optional final render with motion blur (4x slower)
npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved
npx hyperframes lint --verbose  # include info-level findings
npx hyperframes lint --json     # machine-readable output for CI
npx hyperframes docs <topic> # reference docs in terminal
```

> **`npm run dev` is a long-running server, not a one-shot command.** It blocks until stopped.
> In Claude Code, always run it with `run_in_background: true`. Never run it as a foreground
> command — it will time out and the server will die, breaking the browser preview.
> `npm run studio` is also long-running; run it with `run_in_background: true`.

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

- `index.html` — HyperFrames blank portrait template (not a video; ADR-0010)
- `templates/dena-video/` — Dena starter copied by `npm run video -- new <slug>`
- `videos/<slug>/` — one ignored HyperFrames project per video (`index.html`, `compositions/`, `assets/`, `renders/`, `sources/` + `sources.json`)
- `shared/` — reusable raw videos/images (ignored), referenced from any project's `sources.json` (ADR-0022)
- `compositions/` — sub-compositions for the root template only
- `meta.json` — project metadata (id, name)
- `transcript.json` — whisper word-level transcript (if generated)

## Linting — ALWAYS RUN AFTER CHANGES

After creating or editing a video composition, **always** run `npm run video -- check <slug>`; for the root template run the check below. Do this before considering the task complete:

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
