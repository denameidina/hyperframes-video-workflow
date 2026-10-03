# RD-05 Studio Web UI
Status: accepted
Date: 2026-10-01

Domain: web UI lokal untuk project video (sumber per project + shared library),
sesi agen tmux, dan publish. Owner:
`scripts/studio.mjs`, `scripts/studio/`, `config/studio-launchagent.plist`. Keputusan:
[ADR-0020](../adr/0020-studio-web-ui.md), [ADR-0022](../adr/0022-multi-source-projects.md),
[ADR-0023](../adr/0023-voice-adapter-tts.md), [ADR-0024](../adr/0024-music-library.md),
[ADR-0026](../adr/0026-studio-generate.md).

- **RD-05-01** (Ubiquitous) — Studio shall listen only on `127.0.0.1` and, while
  Tailscale reports `BackendState: Running` at startup, the host's Tailscale
  IPv4 address.
- **RD-05-02** (Unwanted) — If a request's `Host` is not a listen address, or a
  mutating request's `Origin` does not match, then Studio shall reject it with 403.
- **RD-05-03** (Optional) — Where `STUDIO_TOKEN` is set, Studio shall require a
  valid session cookie for every route except `/login` and the login stylesheet
  `/app.css`; API/media requests without it return 401, protected pages redirect
  to `/login` with 302.
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
  `tmux send-keys -l` followed, after a short pause, by `Enter` (C0/C1 control characters
  removed, at most 1000 characters; a long note is shortened, the instruction is kept). A
  Gate 3 approval tells the agent the video is done and not to publish to Repliz or R2.
- **RD-05-26** (Unwanted) — If the fingerprint is missing or differs from the files, the gate
  is not waiting, a revision has no note, the session is busy (`running`), or a voice job is
  running for the project, then Studio shall refuse the decision (409, or 400 for a missing note or fingerprint) without
  recording it; without a live session it shall record the decision and answer
  `sent: false` with the reason.
- **RD-05-27** (Event-driven) — When Dena saves an edited script at Gate 1 while the session
  is not busy and no voice job runs, Studio shall write `script.md` atomically (at most 20 KB, narration not empty)
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
- **RD-05-30** (Event-driven) — When Dena submits the Generate form, Studio shall accept a
  `format` (`explainer` default, `kinetic-post`, `motion-short`), check the duration against
  that format's range (30–90, 8–20, 15–40 s), accept a voice preset only for `explainer` and
  "Teks persis" (at most 1000 characters) only for the music formats, scaffold with
  `--format`, write `format` and `text` to `research/request.json` and the Teks persis to
  `research/brief.md`, and start the agent with a prompt naming the format and its gates
  (ADR-0027).
- **RD-05-31** (Event-driven) — When Dena opens a music-format project, Studio shall show its
  format and, at Gate 1, the music (`processed-audio.wav`), tempo from `beats.json` (track,
  BPM, bars, duration, loop), the on-screen text line by line, the storyboard sheet, and the
  scene rows with their bars; at Gate 2 the render with Revisi, QA dulu, and Setuju.
- **RD-05-32** (Unwanted) — If a music-format project gets a script edit or a voice job,
  then Studio shall refuse it (409); the approval at a format's last gate tells the agent the
  video is done and not to publish, and QA dulu is offered only at that gate.
- **RD-05-33** (Ubiquitous) — The Generate form shall show Teks persis and hide the voice
  preset for the music formats, show the duration range of the chosen format (clearing a
  typed duration outside it), and read a storyboard's bars column from the table header; the
  list and panel shall name each project's format (`?` when the format line is broken).

- **RD-05-34** (Ubiquitous) — The Generate final-gate player shall show the exact normal
  or blur render selected and fingerprinted by `scripts/lib/gates.mjs` (RD-03-101),
  including its actual filename in `gate3.render`; absent/empty renders are not reviewable.
- **RD-05-35** (Unwanted) — If a script, audio, or storyboard artifact is missing,
  empty, or a directory, then Generate detail shall still show the owning phase's
  incomplete status without attempting to read/preview it as a valid artifact;
  Generate audio/sheet media requests for such paths shall return 404.

- **RD-05-36** (Ubiquitous) — Studio shall group navigation into production
  (Proyek, Generate, Hasil, Kalender) and supporting tools (Sesi, Pustaka, Suara,
  Musik), mark the active page, provide a heading and next-step description for
  each page, and support 390 px width without horizontal document scrolling.
- **RD-05-37** (Event-driven) — When Dena searches Proyek or Hasil, Studio shall
  filter by slug/filename without fetching again or replacing a playing video;
  zero matches shall offer a clear-search action.
- **RD-05-38** (Event-driven) — When Dena opens Kalender, Studio shall display a
  Monday-first month and selected-day agenda in Asia/Jakarta (WIB), with each
  schedule's title, platform, status and source; month navigation and Hari ini
  shall work with mouse, touch and keyboard.
- **RD-05-39** (Event-driven) — When Dena selects Sinkronkan Repliz, Studio shall
  read GET `/public/schedule` for the selected month and configured accounts,
  paginate at 100 entries/page up to 10 pages with a 30 s total timeout, merge
  remote entries with local receipts by scheduleId, and display sync time.
  Opening/polling other tabs shall not call Repliz.
- **RD-05-40** (Unwanted) — If Repliz is not configured or synchronization fails,
  then Kalender shall retain local receipts and the last successful in-memory
  snapshot, label their source and stale status, and offer retry. Invalid month
  queries shall return 400 before network access; undated legacy receipts shall
  be counted explicitly instead of placed on an invented date. A truncated
  remote result shall be identified as partial.
- **RD-05-41** (Event-driven) — When Dena selects Jadwalkan konten on a calendar
  date, Studio shall offer existing renders and open their publish preview with
  that date and a WIB time, caption, configured platforms and confirmation.
  Both calendar and Hasil shall offer explicit scheduling or publish now.
- **RD-05-42** (Unwanted) — If a supplied scheduleAt is not `now` or an ISO
  timestamp with an explicit zone at least 60 s in the future, then Studio shall
  reject publish with 400 before starting a job. A missing scheduleAt preserves
  the existing metadata behavior. Successful jobs keep existing per-target
  duplicate protection; choosing a date does not authorize reposting.
- **RD-05-43** (Ubiquitous) — Studio shall label all form controls, keep visible
  keyboard focus, use at least 44 px touch targets, announce asynchronous errors
  and calendar loading, and preserve light/dark palette and reduced-motion
  preferences. Upload controls shall be keyboard accessible.

## macOS background service

- **RD-05-44** (Optional) — Where the per-user macOS Studio LaunchAgent is
  installed and enabled, Studio shall start at user login with `RunAtLoad`,
  without an open Terminal window.
- **RD-05-45** (Unwanted) — If the registered Studio process exits while the
  LaunchAgent is enabled, then launchd shall launch it again with `KeepAlive`
  and a configured `ThrottleInterval` of 10 seconds.
- **RD-05-46** (Ubiquitous) — The Studio LaunchAgent shall use absolute Node,
  script, working-directory and log paths, port 4777, and an explicit PATH
  containing the installed tmux, Claude, Codex and ffprobe executables; Studio
  shall continue loading credentials from the repository `.env`, without
  copying credential values into the plist.
- **RD-05-47** (Event-driven) — When the user disables and unloads the Studio
  LaunchAgent, Studio shall remain stopped through later logins until the user
  explicitly enables it again.
- **RD-05-48** (Ubiquitous) — The Studio service runbook shall document status,
  restart, stop, re-enable and log commands, and distinguish login autostart
  from availability before login or while the Mac is asleep.
- **RD-05-49** (Ubiquitous) — Studio shall read tmux session metadata with
  explicit UTF-8 mode (`tmux -u list-panes`), preserving all six tab separators
  even when the LaunchAgent environment has no `LANG` or `LC_*` variables;
  session slugs, runtime, model, effort and exited status shall match the same
  tmux server queried from a UTF-8 terminal.
- **RD-05-50** (Ubiquitous) — The LaunchAgent installation shall prioritize
  the Claude and Codex executable directories selected from the user's shell
  before the Node executable directory; before starting a session, service
  verification shall run `claude --version` and `codex --version` with the
  installed plist PATH and require exit status 0 for the runtime being used.

- **RD-05-51** (Ubiquitous) — The "Mulai sesi" form and the Generate form shall
  each offer a "Motion design" control with `Rich (default)` and `Standar`, preselected
  to `Rich`, labelled per RD-05-43.
- **RD-05-52** (Event-driven) — When `POST /api/sessions` or `POST /api/generate`
  receives `motion`, the server shall accept only `rich` or `standard` (else 400),
  treat an absent value as `rich`, and state `motion_design: <value>` in the first
  agent prompt.
- **RD-05-53** (Event-driven) — When a generate project is created, the server
  shall store `motion` in `research/request.json` and write `motion_design` in the
  brief stub's Workflow Settings.

## Guided flow (Beranda, steppers, wizard)

- **RD-05-49** (Ubiquitous) — Studio shall open on Beranda, which offers two ways to
  start (Edit video dari rekaman, Buat video dari ide) and one list of every
  footage and generate project, each with a status chip and exactly one next
  action; projects waiting for Dena's decision or review list first.
- **RD-05-50** (Ubiquitous) — Studio shall group navigation in flow order — Buat
  video (Edit rekaman, Generate dari ide), Tayangkan (Hasil & review, Kalender) —
  and fold supporting tools (Sesi agen, Pustaka, Suara, Musik) under Peralatan.
- **RD-05-51** (Ubiquitous) — `GET /api/projects` and `GET /api/projects/<slug>`
  shall report a `stage` derived only from handoff artifacts: `sources` (no
  sources), `edit` (sources, no `processed.mp4`), `plan` (`processed.mp4`),
  `build` (`visual-plan.md` or `overlay-timeline.json`), `review` (a render exists).
- **RD-05-52** (State-driven) — While a footage project is open, Studio shall show
  a five-step tracker (Bahan, Potong & cerita, Caption & visual, Render, Review) and
  a next-action card whose button matches the stage and whether a session is live;
  upload shall accept drag and drop as well as the file picker.
- **RD-05-53** (Ubiquitous) — The Generate form shall be a three-step wizard (Jenis,
  Brief, Mulai) that validates brief and project name before leaving step 2 and
  keeps all agent/detail options optional on step 3; the Generate panel shall show
  a gate tracker and a next-action card that says whether Dena's review is needed,
  the agent is working, or its session has stopped (offering to resume it).
- **RD-05-54** (Ubiquitous) — Studio shall list projects (`GET /api/projects`, `GET /api/generate`)
  and Beranda's "Lanjutkan pekerjaan" newest first by `createdAt` (the project directory's
  creation time, `ctime` where the filesystem reports none), ties broken by slug.
- **RD-05-55** (Ubiquitous) — Studio shall show a 9:16 thumbnail on every Edit rekaman,
  Generate, and Beranda row: one JPEG frame (`GET /api/projects/<slug>/thumb`, auth-guarded)
  taken from the newest render, else `processed.mp4`, else the first video source, else the
  first image source, cached as `videos/<slug>/.studio-thumb.jpg` and regenerated only when
  that source is newer. A project without media, or a frame that fails to load, shows a plain
  tile; list rows carry `thumb` (the source's mtime) as the cache-busting version.
- **RD-05-56** (Ubiquitous) — Hasil & review shall show each render's displayed size and ratio
  (`GET /api/results` → `video: { width, height, ratio, duration }`, from ffprobe, with a 90/270
  degree rotation swapping the sides, cached per file version; `null` when the media is
  unreadable) and shall draw its player in that ratio — tall renders at a fixed height, wide
  renders at full card width — instead of a fixed box with black bars.
- **RD-05-57** (Event-driven) — When Dena creates an edit project or submits the Generate
  form, Studio shall offer the ratios `9:16` (default), `4:5`, `1:1` and `16:9`, each drawn as its
  own frame shape, send the choice as `ratio`, write `canvas.json` (and `ratio` in
  `research/request.json` for Generate), and reject any other value with 400 before creating anything.
- **RD-05-58** (Ubiquitous) — Studio shall show each project's ratio in the Beranda, Edit rekaman and
  Generate lists and on the project and Generate pages (`ratio` on `GET /api/projects`,
  `/api/projects/<slug>`, `/api/generate`, `/api/generate/<slug>`), and the agent prompt of a
  non-9:16 project shall name its canvas and `docs/agents/references/aspect-ratios.md`.
- **RD-05-59** (Ubiquitous) — Each player in Hasil & review shall carry a poster, a 720 px-high frame
  of that exact render (`GET /api/results/<slug>/poster?file=<render>`, auth-guarded, 404 unless the file
  is one of the project's renders), made by ffmpeg on first request with at most three runs at once,
  cached as `renders/.<file>.poster.jpg` until the render is newer, and never listed as a render.
- **RD-05-60** (Event-driven) — When a render's publish preview has no caption (no Instagram or
  TikTok block in `publish-captions.md`), the schedule dialog shall offer "Buat caption otomatis":
  `POST /api/results/<slug>/captions` runs one headless agent (`claude -p` or `codex exec`, the
  Studio default model at medium effort) with a prompt naming the render, the target accounts, the
  style guide and the Platform Publish Caption Rules, streams its log to the dialog
  (`GET …/captions/stream`), and on exit reloads the preview so scheduling can continue.
- **RD-05-61** (Unwanted) — If a caption already exists, a caption job for the project is running, or
  the render is not one of the project's renders, then Studio shall refuse the request (409, 409, 404)
  and shall never overwrite an existing caption; the prompt tells the agent not to touch other files,
  not to render, and not to publish to Repliz or R2.
