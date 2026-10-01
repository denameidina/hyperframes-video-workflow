# MCP proyek video
Status: operating standard
Date: 2026-10-01

Pemilik kontrak: [RD-08](../requirements/rd-08-mcp.md), keputusan:
[ADR-0032](../adr/0032-local-project-mcp.md). Entry point `scripts/mcp.mjs`.

## Memulai

Node 22+; tidak perlu `npm install`. MCP memakai stdio lokal, kompatibel dengan
client yang mendukung negosiasi MCP legacy sampai 2025-11-25. Claude, Codex,
Hermes, Cursor, dan VS Code memakai executable yang sama; format konfigurasi
client berbeda. Dukungan protokol diuji melalui client stdio, bukan melalui
GUI seluruh aplikasi tersebut.

```bash
node scripts/mcp.mjs --help
node scripts/mcp.mjs --print-config claude
node scripts/mcp.mjs --print-config codex
node scripts/mcp.mjs --print-config hermes
node scripts/mcp.mjs --print-config vscode
```

Generator mengambil path Node yang sedang dipakai dan path repo absolut,
sehingga client GUI tidak bergantung pada cwd atau inisialisasi nvm shell.
Setelah pindah repo/upgrade lokasi Node, hasilkan ulang konfigurasi. Generator
hanya mencetak output; gabungkan entry `dena-video` dengan konfigurasi yang ada.
Jangan menimpa file konfigurasi client yang berisi server lain.

| Client | Tempat entry hasil generator |
| --- | --- |
| Claude Code | `.mcp.json` di root proyek, gunakan format `claude` |
| Claude Desktop macOS | `~/Library/Application Support/Claude/claude_desktop_config.json`, format `claude` |
| Codex | `~/.codex/config.toml`, section `mcp_servers.dena-video` |
| Hermes | `~/.hermes/config.yaml`, section `mcp_servers.dena-video` |
| Cursor | `.cursor/mcp.json` atau konfigurasi MCP user, format `claude` |
| VS Code | `.vscode/mcp.json`, format `vscode` (`servers`, bukan `mcpServers`) |
| Client stdio lain | Gunakan field `command` dan `args` dari format `json` sesuai schema client |

Restart/reload koneksi MCP setelah menambahkan entry. Pakai **Node langsung**
sebagai `command`; banner `npm run mcp` tidak boleh masuk ke stdout MCP.

Referensi konfigurasi resmi: [Claude Code](https://code.claude.com/docs/en/mcp),
[Hermes](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/).
Kontrak stdio: [MCP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
Konfigurasi Codex juga dapat ditambahkan melalui `codex mcp add --help`.

## Opsi server

```bash
node scripts/mcp.mjs --root /absolute/path/to/videos
node scripts/mcp.mjs --read-only
node scripts/mcp.mjs --import-root /absolute/path/to/footage
node scripts/mcp.mjs --job-timeout-ms 7200000
node scripts/mcp.mjs --print-config hermes --import-root /absolute/path/to/footage
```

`--read-only` hanya mengiklankan tool baca; sync Repliz remote ditolak.
`--import-root` boleh diulang; tanpa opsi ini import hanya dari media dalam
workspace. Jangan memakai `/` atau home sebagai import-root bila hanya perlu
satu folder footage. Secret dibaca dari `.env` repo dan environment (environment
menang) tanpa dimasukkan ke konfigurasi client atau resource MCP.

## Tool menurut kebutuhan

Schema tiap tool tersedia melalui `tools/list`; opsi action yang tidak relevan
ditolak untuk video/voice. Semua path relatif terhadap repo, termasuk path
artefak hasil tool. `artifact_write.path` relatif terhadap `videos/<slug>/`.

| Kebutuhan | Tool |
| --- | --- |
| Orientasi/dokumen | `workspace_info`, `docs_list`, `skill_read` |
| Proyek | `project_list`, `project_create`, `project_status`, `project_delete` |
| Artefak/caption/naskah/komposisi | `file_list`, `file_read`, `artifact_write` |
| Sumber/footage | `media_import`, `shared_list`, `shared_delete`, `source_manage`, `sources_migrate` |
| Cut, check, snapshot, render, cutout, layers | `video_run` |
| Generate audio/music/storyboard | `video_run` actions `voice`, `bgm`, `music`, `storyboard` |
| Transkripsi/audit media | `transcribe`, `media_probe` |
| TTS/ref/clone/design/voices/uji dengar | `voice_presets`, `voice_run`, `voice_tests_read`, `voice_tests_rate` |
| Pustaka musik dan lisensi | `music_list`, `music_manage` |
| Aset/ikon/SVG, process bitmap, contact sheets | `asset_search`, `asset_manage` |
| Contoh gaya dan moodboard | `style_examples`, `moodboard` |
| Gate | `gate_status`, `gate_decide` |
| Preview/Studio/sesi tmux | `preview_start`, `studio_start`, `sessions_list`, `session_control` |
| Root template dan CLI docs | `template_run`, `hyperframes_help` |
| Test | `tests_run` |
| Distribusi dan kalender | `publish`, `calendar_read` |
| Proses/log | `job_list`, `job_get`, `job_cancel` |

Capture screenshot/rekaman browser, pencarian web, dan AI image generation
tetap menggunakan tool client. Hasil lokal dapat diimpor ke assets. Caption,
cut-list, overlay timeline, visual plan, SVG, dan HTML dibuat agent berdasarkan
phase docs; MCP menyediakan I/O dan command, tidak mengarang keputusan Story.
Sesi agent baru tetap dimulai dari Studio atau client sendiri; MCP dapat membaca
dan menghentikan sesi Studio yang sudah ada dengan konfirmasi pengguna.

## Alur pemakaian

1. `workspace_info` → baca `AGENTS.md` dan `internal/docs/README.md`.
2. `project_list`/`project_create`, baca artefak dari `project_status`.
3. Prompt `workflow_story`, `workflow_screen_plan`, `workflow_build`, atau
   `workflow_qa` dengan `{slug}` memuat router + phase doc. QA wajib agent
   dengan konteks baru dan hanya bila user meminta.
4. `artifact_write` untuk artefak fase. Baca file terlebih dahulu untuk memperoleh
   SHA-256 sebelum revisi; berikan `expected_sha256`. JSON invalid ditolak.
5. Command yang lama mengembalikan job. Poll `job_get` sampai `succeeded` dengan
   `code: 0`, atau laporkan `failed`, `cancelled`, `timed_out`. `cancelling` dan
   `timing_out` mempertahankan kunci sampai eskalasi penghentian selesai. Jangan menyebut
   selesai hanya karena job diterima. Log menyimpan 64 KiB terakhir.
6. Penulisan HTML/CSS/JS komposisi membutuhkan handoff Story/Screen Plan dan
   memulai check otomatis. Periksa hasil check sebelum render/handoff.
7. Render → tawarkan publish as-is, QA first, atau revisions. Approval manusia
   hanya dicatat setelah jawaban eksplisit.

Contoh argumen tool (bukan command shell):

```json
{"slug":"demo","mode":"generate","format":"explainer"}
{"slug":"demo","action":"snapshot","options":{"times":[1.5,3]}}
{"slug":"demo","action":"render","options":{"blur":false}}
{"slug":"demo","action":"voice","options":{"preset":"dena-gemini"}}
{"slug":"demo","source_id":"s1"}
{"month":"2026-10","sync":false}
```

Snapshot/render memerlukan artefak upstream. `transcribe` memilih tepat satu
`source_id` atau `processed: true`; overwrite transcript yang sudah ada
memerlukan konfirmasi. Whisper JSON mentah disimpan di subfolder `*-asr/`;
normalized transcript memakai kata dan waktu dari Whisper, bukan teks rekaan.

Gate/publish/sync remote/clone/delete memerlukan:

```json
{"human_confirmed":true,"approval_note":"User menyetujui render setelah melihat hasilnya."}
```

Field ini adalah deklarasi keputusan dari client, bukan bukti identitas manusia.
`publish.destination: "repliz"` memakai CLI publish yang sama, termasuk receipt,
idempotensi dan `--approved`; `"hyperframes"` membagikan komposisi. `file` default
`videos/<slug>/renders/<slug>.mp4`; gunakan filename render blur bila itu yang
direview. `schedule_at` diteruskan ke validator Publisher.

## Batas proses dan keamanan

Maksimal 4 job, timeout default 1 jam (opsi sampai 12 jam); preview/Studio adalah
job persisten. Job memakai kunci per proyek/pustaka; job/log hanya hidup selama
sesi MCP ini. EOF/SIGINT/SIGTERM menghentikan child process group milik MCP,
dengan eskalasi SIGKILL setelah 2 detik. Sesi tmux Studio yang sudah ada terpisah
dan tidak dihentikan otomatis.

Tidak ada tool shell/argv bebas. Path traversal, komponen tersembunyi dan symlink
pada akses file generik ditolak. `.env`, konfigurasi privat suara dan blind identity key
tidak dibaca melalui file tools. Secret environment disensor di respons/log.
Media import tidak overwrite; write artefak dibatasi 4 MiB. Sources, gates,
receipt dan output generated hanya ditulis operasi pemilik domain.

Server ini untuk agent lokal yang dipercaya. Komposisi dapat menjalankan JS
dan client dapat mengirim deklarasi approval; tool bukan sandbox bagi client
jahat. MCP sendiri tidak membuka listener HTTP. Studio/preview yang dimulai
tetap memakai listener/keamanan dari implementasi layanan itu.

## Verifikasi

```bash
npm run test:mcp
npm test
```

Tes transport memakai proses MCP asli dan workspace sementara. Dispatch cloud
diuji dengan fake runner; tes tidak upload media, tidak menghubungi Repliz/Gemini,
dan tidak merender proyek produksi.
