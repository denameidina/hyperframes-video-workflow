# RD-08 — MCP lokal proyek video
Status: accepted
Date: 2026-10-01

Kanonik untuk: akses agent lintas client melalui Model Context Protocol.
Desain: [ADR-0032](../adr/0032-local-project-mcp.md). Operasi dan katalog:
[MCP runbook](../operations/mcp-runbook.md).

- **RD-08-01** When a client initializes the stdio MCP server, the server shall negotiate a supported protocol revision and advertise tools, resources, and prompts without writing non-protocol text to stdout.
- **RD-08-02** When a client lists tools, the server shall expose typed project, source, artifact, video, transcription, voice, music, asset, style, moodboard, preview, Studio, test, gate, publish, calendar, and job operations.
- **RD-08-03** When a client starts a command, the server shall dispatch an allowlisted executable with a validated argument array and `shell: false`; it shall not accept arbitrary shell commands or argv.
- **RD-08-04** When a command may run longer than one request, the server shall return a job ID immediately and expose status, exit code, a bounded log, and cancellation through tools.
- **RD-08-05** While a mutation job owns a project or shared library, the server shall reject a conflicting mutation for the same key; at most 4 jobs shall run concurrently.
- **RD-08-06** If a path contains traversal, a hidden component, or a symlink escaping the permitted area, then the server shall reject it before reading, writing, or dispatching a command.
- **RD-08-07** When an artifact is written, the server shall limit content to 4 MiB, parse JSON before saving JSON, save atomically, and reject an existing file unless its current SHA-256 is supplied and matches.
- **RD-08-08** If generic writes target sources.json, gates.json, publish receipts, render quality receipts, vendor, or media, then the server shall reject the write and route the caller to the owning operation.
- **RD-08-09** When project composition HTML/CSS/JS is written, the server shall require the Story and Screen Plan handoffs and start the project check; a check job failure shall be visible to the client.
- **RD-08-10** When resources or workflow prompts are requested, the server shall return local canonical documents and actual project artifacts; QA prompts shall state that QA requires a fresh-context subagent.
- **RD-08-11** If publish, remote calendar synchronization, voice replication, or a gate decision lacks explicit human confirmation and a nonempty approval note, then the server shall reject the operation before its external call or decision write.
- **RD-08-12** When publishing, the server shall use the existing approved R2/Repliz CLI, preserve its receipts/idempotency, and accept only a nonempty project render MP4.
- **RD-08-13** When local transcription is requested, the server shall use the project whisper.cpp binary/model, preserve raw Whisper JSON, and write a normalized source-time or processed-time word transcript to the corresponding artifact.
- **RD-08-14** When the server closes stdin or receives SIGINT/SIGTERM, the server shall terminate its own child process groups and escalate termination after 2 seconds; existing Studio tmux agent sessions shall remain independent.
- **RD-08-15** When a config is generated, the server shall emit absolute executable/root paths for Claude-compatible JSON, Codex TOML, Hermes YAML, or VS Code JSON without changing user-global configuration.
- **RD-08-16** While returning logs, errors, or configuration status, the server shall redact secret values loaded from environment/.env and shall not expose the .env file, private voice IDs, or blind-test identity keys through generic file tools.
- **RD-08-17** When MCP tests run, the tests shall exercise the real stdio transport and dispatch contracts using temporary projects and fake process runners, without calling live Repliz, R2, Gemini, or render services.

MCP adalah adapter lokal untuk command yang sudah ada. Agent client membaca
fase dan menghasilkan keputusan/artefak kreatif. Capture browser dan generasi
gambar memakai tool client. Transport HTTP remote dan pemasangan konfigurasi
global client tidak termasuk cakupan implementasi ini.
