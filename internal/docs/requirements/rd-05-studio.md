# RD-05 Studio Web UI
Status: accepted
Date: 2026-09-28

Domain: web UI lokal untuk raw video, sesi agen tmux, dan publish. Owner:
`scripts/studio.mjs`, `scripts/studio/`. Keputusan:
[ADR-0020](../adr/0020-studio-web-ui.md).

- **RD-05-01** (Ubiquitous) — Studio shall listen only on `127.0.0.1` and the
  host's Tailscale IPv4 address.
- **RD-05-02** (Unwanted) — If a request's `Host` is not a listen address, or a
  mutating request's `Origin` does not match, then Studio shall reject it with 403.
- **RD-05-03** (Optional) — Where `STUDIO_TOKEN` is set, Studio shall require a
  valid session cookie for every route except `/login`.
- **RD-05-04** (Event-driven) — When Dena uploads a video, Studio shall stream it
  to `raw/.<name>.part` and rename it to `raw/<name>` only after the upload
  completes.
- **RD-05-05** (Event-driven) — When Dena confirms deleting a raw video, Studio
  shall kill the tmux sessions of linked projects, delete every `videos/<slug>/`
  whose `source.mp4` resolves to that raw file, and delete the raw file.
- **RD-05-06** (Event-driven) — When Dena starts an edit, Studio shall start an
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
