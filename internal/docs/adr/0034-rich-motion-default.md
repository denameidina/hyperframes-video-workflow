# ADR-0034 — Rich motion design is the default for every edit and generate session
Status: accepted
Date: 2026-10-03

## Context

Rich motion (staged relationships, motion b-roll, linked transitions, secondary
response, audible SFX; RD-03-109–112, ADR-0030) existed as craft guidance, but
nothing made a session start from it. An edit or generate run could finish with
a sparse, caption-only result unless Dena remembered to ask for more. She wants
every edit and every generated video to be rich by default, with a way to opt out
per session.

## Decision

Add one Workflow Setting, `motion_design`, with values `rich | standard`.
**Default `rich`.** It is chosen in the Studio session forms ("Mulai sesi" for
edit, and "Buat video generate"), written to `videos/<slug>/creative-brief.md`
(`## Workflow Settings`), and — for generate — to `research/request.json` as
`motion`.

- `rich`: Screen Plan plans a motion visual (or a justified real capture) for each
  line that explains, shows, compares or sequences; keeps an art direction with
  linked transitions between assets; plans speech-safe SFX; Build reviews action
  sequences at phone size (RD-03-112). Quiet reading holds stay valid (RD-03-109).
- `standard`: the behavior before this ADR. Chosen only by the explicit override.

The Studio prompt states the chosen value, so the agent does not infer it. A
brief with no `motion_design` line (older projects, hand-made briefs) is read as
`rich` for new work; finished projects are not re-opened.

`motion_design` is independent from `visual_density` (how many visuals) and
`gate_cut` (whether to review the cut): it sets how crafted each visual is.

## Consequences

- New sessions cost more agent time and tokens; `standard` is the escape hatch.
- Phase documents gain one rule each (Story records it, Screen Plan and Build obey it).
- MCP/CLI-started sessions that skip the Studio form still get `rich` through the brief default.
- Rules: [RD-03-113–116](../requirements/rd-03-video-editing-workflow.md), form and API: [RD-05-51–53](../requirements/rd-05-studio.md).
