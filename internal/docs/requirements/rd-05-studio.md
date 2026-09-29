# RD-05 Studio Web UI
Status: accepted
Date: 2026-09-28

Domain: web UI lokal untuk project video (sumber per project + shared library),
sesi agen tmux, dan publish. Owner:
`scripts/studio.mjs`, `scripts/studio/`. Keputusan:
[ADR-0020](../adr/0020-studio-web-ui.md), [ADR-0022](../adr/0022-multi-source-projects.md),
[ADR-0023](../adr/0023-voice-adapter-tts.md), [ADR-0024](../adr/0024-music-library.md).

- **RD-05-01** (Ubiquitous) — Studio shall listen only on `127.0.0.1` and, while
  Tailscale reports `BackendState: Running` at startup, the host's Tailscale
  IPv4 address.
- **RD-05-02** (Unwanted) — If a request's `Host` is not a listen address, or a
  mutating request's `Origin` does not match, then Studio shall reject it with 403.
- **RD-05-03** (Optional) — Where `STUDIO_TOKEN` is set, Studio shall require a
  valid session cookie for every route except `/login`.
- **RD-05-04** (Event-driven) — When Dena uploads a video or image, Studio shall
  stream it to `<dir>/.<name>.part` (dir = `shared/` or `videos/<slug>/sources/`)
  and rename it to `<dir>/<name>` only after the upload completes; an existing
  name shall be rejected with 409.
- **RD-05-05** (Unwanted) — If Dena deletes a shared file that a project's
  `sources.json` references, then Studio shall reject it with 409 and name those
  projects.
- **RD-05-06** (Event-driven) — When Dena starts an edit for a project, Studio shall start an
  interactive tmux session `studio-<slug>` running the selected runtime with the
  selected model and effort and the workflow prompt as its first message.
- **RD-05-07** (State-driven) — While a session `studio-<slug>` exists, Studio
  shall offer to open its terminal instead of starting another session for that
  slug.
- **RD-05-08** (Event-driven) — When a viewer opens a terminal, Studio shall
  relay the tmux pane output to that viewer and write that viewer's input to the
  pane.
- **RD-05-09** (Ubiquitous) — Studio shall keep agent sessions running when a
  viewer disconnects or the Studio server restarts.
- **RD-05-10** (Event-driven) — When Dena confirms a publish, Studio shall run
  `repliz-publish.mjs` with `--approved` for that render and stream its output.
- **RD-05-11** (Unwanted) — If a publish for the same slug is already running,
  then Studio shall reject a new publish request with 409.
- **RD-05-12** (Ubiquitous) — The prompt Studio sends to an agent shall instruct
  it not to publish to Repliz.
- **RD-05-13** (Event-driven) — When Dena confirms deleting a project, Studio
  shall kill its tmux session and delete `videos/<slug>/` without touching
  `shared/`.
- **RD-05-14** (Event-driven) — When Dena sets a source's role or note, Studio
  shall write it to `sources.json` with `roleSource: "user"` (Auto clears role
  and roleSource).
- **RD-05-15** (Event-driven) — When Dena attaches shared files to a project,
  Studio shall add them to `sources.json` with `origin: "shared"` without
  copying them.
- **RD-05-16** (Event-driven) — When Dena opens the session form, Studio shall
  offer the model choices read from each runtime at that moment — Claude: its
  aliases, `additionalModelOptionsCache` in `~/.claude.json`, and the
  `~/.claude/settings.json` default; Codex: models with `visibility: "list"` in
  `~/.codex/models_cache.json` by priority, defaulting to `~/.codex/config.toml` —
  and limit the effort choices to the efforts that model supports.
- **RD-05-17** (Unwanted) — If a session request names a known model with an
  effort that model does not support, then Studio shall reject it with 400.
- **RD-05-18** (Event-driven) — When Dena opens the Suara tab, Studio shall list the runs in
  `shared/voice-tests/` (a `YYYYMMDD-HHMM` folder with `key.json`) and, for one run, serve
  only `samples/<label>.wav` and `ref.wav`; `key.json` and candidate names are never served.
- **RD-05-19** (Event-driven) — When Dena saves ratings, Studio shall check every label
  against the run, every score (natural, pronunciation, register, similarity, endurance)
  as an integer 1–5 or empty, and the note as at most 1000 characters, then write
  `ratings.json` atomically; anything else gets 400.
- **RD-05-20** (Event-driven) — When Dena rejects or restores a track in the Musik tab,
  Studio shall set `rejected` in `shared/music/catalog.json` through
  `scripts/lib/music.mjs`; a non-boolean value gets 400 and an unknown id 404.
- **RD-05-21** (Event-driven) — When Dena opens the Generate tab, Studio shall list every
  project whose `creative-brief.md` sets `mode: generate` with its position from
  `scripts/lib/gates.mjs`, the first line of `research/brief.md`, and its session status
  (ADR-0026).
- **RD-05-22** (Event-driven) — When Dena submits the Generate form, Studio shall validate
  every field before writing anything — brief 1–4000 characters; slug valid, not `options` or
  `new`, not taken; at most 5 `http:`/`https:` URLs; repurpose, voice preset (not `recorded`),
  style (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`,
  `parallax`), and music (an unrejected catalog track) from the options Studio offers;
  duration an integer 30–90 or empty — then scaffold `videos/<slug>/` in generate mode, write
  `research/brief.md` (the brief verbatim) and `research/request.json`, and start
  `studio-<slug>` with the generate prompt.
- **RD-05-23** (Unwanted) — If a Generate form field is invalid, then Studio shall answer 400
  naming the field (409 for a taken slug) and create nothing; if the session cannot start,
  Studio shall keep the project and report why.
- **RD-05-24** (Event-driven) — When Dena opens a generate project, Studio shall show the
  artifacts of its current gate (Gate 1: voiceover player, duration, preset, WER, script
  paragraphs with `## Fakta`; Gate 2: storyboard sheets, `storyboard.md` rows, `## Style World`
  and `## Music` of `visual-plan.md` with the named catalog track; Gate 3: the render and
  "Deviations From Plan" / "Handoff Risks" of `assembly-notes.md`) and serve under
  `/media/<slug>/` only `processed-audio.wav`, `preview/storyboard-sheet[-N].jpg`, and the
  project's renders.
- **RD-05-25** (Event-driven) — When Dena approves, revises, or asks for QA in the Generate
  panel, Studio shall record the decision through `scripts/lib/gates.mjs` with the
  fingerprint the panel showed, then type one line into `studio-<slug>` with
  `tmux send-keys -l` followed by `Enter` (control characters removed, at most 1000
  characters; a long note is shortened, the instruction is kept).
- **RD-05-26** (Unwanted) — If the fingerprint is missing or differs from the files, the gate
  is not waiting, a revision has no note, or the session is busy (`running`), then Studio
  shall refuse the decision (409, or 400 for a missing note or fingerprint) without
  recording it; without a live session it shall record the decision and answer
  `sent: false` with the reason.
- **RD-05-27** (Event-driven) — When Dena saves an edited script at Gate 1 while the session
  is not busy, Studio shall write `script.md` atomically (at most 20 KB, narration not empty)
  and log an `edit` entry; approval stays refused until "Buat ulang suara" — one
  `video voice <slug> [--preset <request.voice>]` job per project with a live log, refused
  while the session is busy or outside Gate 1 — makes the voiceover newer than the script;
  the next Gate 1 message tells the agent the script was edited.
- **RD-05-28** (Event-driven) — When a session starts for a generate project (Generate panel
  or Sessions tab), Studio shall use the generate continue prompt, which runs
  `npm run video -- gate <slug>` first; from the panel it also carries the last decision.
- **RD-05-29** (Ubiquitous) — The Generate panel shall work at 390 px wide without horizontal
  scrolling, keep its decision bar at the bottom of the screen, enable Setuju/Revisi only
  while a gate waits and the session is not busy (Setuju also not while the Gate 1 voice is
  stale), not redraw a playing player or an open script editor while it polls every 3 s,
  and open from `#generate`, `#generate/new`, and `#generate/<slug>`.
