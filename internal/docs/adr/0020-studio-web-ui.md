# ADR-0020 Studio: web UI lokal tanpa dependency untuk raw, sesi agen, dan publish
Status: accepted
Date: 2026-09-28

## Context

Alur video Dena berjalan dari terminal: salin raw ke `raw/`, buka Claude/Codex,
arahkan ke workflow, lalu `npm run repliz:publish`. Dena ingin satu halaman web
yang bisa dibuka dari Mac ini dan dari HP lewat Tailscale untuk upload/hapus raw,
memulai sesi edit agen interaktif di tmux (pola hanoman), melihat dan men-steer
terminalnya, melihat render, dan publish ke Repliz.

## Decision

- `npm run studio` menjalankan `scripts/studio.mjs`: server `node:http` bawaan,
  tanpa dependency npm (ADR-0007 tetap berlaku).
- Listen hanya di `127.0.0.1` dan IPv4 Tailscale; port default 4777. Setiap
  request dicek `Host`; request mutasi wajib `Origin` yang sama. `STUDIO_TOKEN`
  opsional mengaktifkan login cookie.
- State hanya filesystem (`raw/`, `videos/<slug>/`) dan tmux: sesi
  `studio-<slug>` dengan option `@studio_runtime`, `@studio_model`,
  `@studio_effort`, `@studio_raw`, `@studio_started`. Sesi bertahan saat Studio
  restart.
- Agen jalan interaktif dengan izin bypass (`--dangerously-skip-permissions` /
  `--dangerously-bypass-approvals-and-sandbox`); prompt pertama dari
  `.studio/prompts/<slug>.md` menyuruh mengikuti workflow Dena dan melarang
  publish. Gate workflow tetap berhenti di terminal.
- Terminal browser: xterm.js (di-vendor di `vendor/xterm/`) menerima output lewat
  SSE; tiap viewer punya PTY dari `script(1)` macOS yang menjalankan
  `tmux attach` (stdin lewat `cat |` karena pipe Node di macOS adalah socket);
  ketikan dikirim lewat POST. Resize = attach ulang.
- Hapus raw = hard delete cascade: sesi tmux terkait di-kill, setiap
  `videos/<slug>/` yang `source.mp4`-nya menunjuk raw itu dihapus, lalu raw.
- Publish dari UI: klik konfirmasi = persetujuan eksplisit (ADR-0003); Studio
  menjalankan `repliz-publish.mjs --approved`, satu job per slug.

## Rationale

- Tanpa node-pty/WebSocket: tidak ada native build dan clone tetap ringan;
  latensi POST per ketikan cukup untuk satu pengguna lewat Tailscale.
- tmux sebagai pemilik sesi (seperti hanoman) membuat agen tahan restart server
  dan tab browser yang ditutup.

## Consequences

- Studio hanya didukung di macOS (`script(1)` BSD) dengan tmux 3.x.
- Siapa pun yang bisa membuka Studio punya akses shell setara Dena; keamanannya
  bergantung pada bind address, cek Host/Origin, Tailscale, dan `STUDIO_TOKEN`.
- Resize terminal berkedip karena attach ulang.

## Sources

- `docs/superpowers/specs/2026-09-28-studio-web-ui-design.md`
- `scripts/studio.mjs`, `scripts/studio/`
- [requirements/rd-05-studio](../requirements/rd-05-studio.md)
