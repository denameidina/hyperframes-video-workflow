# RD-07 Documentation Enforcement Hooks
Status: accepted
Date: 2026-09-30

Domain: documentation enforcement in Codex and Claude. Owners: `.codex/hooks/ensure-learning-docs.py`, `.claude/hooks/ensure-docs-updated.py`.

- **RD-07-01** (Ubiquitous) — The Codex hook shall parse staged, unstaged, untracked, renamed, and copied Git paths without losing whitespace, Unicode characters, or their first character, using NUL-delimited porcelain output.
- **RD-07-02** (Event-driven) — When a learning prompt requires a documentation update, the Codex hook shall count Markdown/RST updates in both `internal/docs/` and `docs/`, and updates to `AGENTS.md` or `CLAUDE.md`, after that prompt.
- **RD-07-03** (Unwanted) — If no qualifying document was updated after a learning prompt, then Codex shall block completion even if the assistant states a mechanical exception.
- **RD-07-04** (Optional) — Where the assistant's final message contains a standalone line `no docs update needed: <nonempty reason>`, either hook shall accept it for a mechanical change without an outstanding learning requirement. User prompt text shall not supply this exemption.
- **RD-07-05** (State-driven) — While implementation files are staged without canonical docs staged and no mechanical exemption exists, Claude shall return a JSON `decision: "block"`.
- **RD-07-06** (State-driven) — While implementation files are dirty without docs dirty and no mechanical exemption exists, Codex shall return a JSON `decision: "block"`.
- **RD-07-07** (Ubiquitous) — Hook tests shall run in temporary Git repositories without editing the production index or learning state and shall be included in `npm test` and CI.

Canonical hook scope and operational details: [agent-documentation-workflow](../operations/agent-documentation-workflow.md).
