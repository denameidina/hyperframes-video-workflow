# ADR-0032 — MCP stdio lokal lintas client
Status: accepted
Date: 2026-10-01

## Context

Claude, Codex, Hermes dan client MCP lainnya perlu memakai proyek, dokumen,
command video/audio, pustaka, gate, dan publish yang sama. Repo sudah memiliki
CLI dan fungsi pemilik domain. ADR-0007 menetapkan tanpa dependency npm lokal;
media dan secret tetap berada di workspace lokal.

## Decision

Tambahkan `scripts/mcp.mjs` dan modul terpisah di `scripts/mcp/` memakai Node 22+
dan transport JSON-RPC stdio. Negosiasikan revisi legacy 2024-11-05, 2025-03-26,
2025-06-18 dan 2025-11-25. Client dengan revisi lebih baru menerima 2025-11-25
saat negosiasi; server tidak mengiklankan protokol stateless 2026.

Tool memakai schema tertutup dan parameter domain, tanpa shell/argv bebas.
Command lama dijalankan sebagai job sesi dengan log terbatas, penghentian grup
proses, timeout dan kunci per proyek/pustaka. CLI pemilik domain tetap menulis
sources, audio, gate, dan receipt. Resource/prompt mengekspos workflow yang ada.

Path dibatasi allowlist dan diperiksa sampai lokasi fisiknya. Import dari luar
repo memerlukan `--import-root` eksplisit saat server dimulai. Penulisan artefak
memakai SHA-256 dan rename atomik; file pemilik domain dan secret dikecualikan.
HTML tetap kode yang dapat dijalankan: server ditujukan untuk agent lokal yang
dipercaya pemilik, bukan sandbox untuk client yang tidak dipercaya.

Gate/publish/sync remote/clone memerlukan konfirmasi manusia dan catatan.
Konfirmasi adalah keputusan manusia yang dinyatakan client, bukan autentikasi
manusia. Mode `--read-only` menyembunyikan tool mutatif dan menolak sync remote.
Server MCP tidak membuka port jaringan; Studio/preview yang dimulai melalui
tool tetap memakai aturan jaringan layanan masing-masing.

## Alternatives

- SDK MCP mengurangi pemeliharaan protokol tetapi menambah deps/lockfile dan
  mengubah ADR-0007; tidak dipakai untuk subset stdio ini.
- MCP HTTP memerlukan auth, filesystem remote, dan infrastruktur tambahan;
  workspace sekarang memakai proses lokal.
- Shell MCP generik tidak menjelaskan kontrak dan gate proyek; ditolak.

## Consequences

Tidak memerlukan `npm install`. Konfigurasi dapat dihasilkan untuk tiap client
dan transport asli wajib diuji. Job/log hilang saat server dimulai ulang;
output dan receipt tetap ada di disk. Perubahan revisi protokol perlu verifikasi
ulang. Tool kreatif eksternal disediakan client.

## Sources

- [MCP stdio](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [RD-08](../requirements/rd-08-mcp.md)
