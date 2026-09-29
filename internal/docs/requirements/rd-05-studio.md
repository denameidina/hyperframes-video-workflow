
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
