# Studio — Web UI Sederhana untuk Raw, Sesi Agen, dan Publish — Design

Status: implemented 2026-09-28 (plan docs/superpowers/plans/2026-09-28-studio-web-ui.md)
Date: 2026-09-28

## Latar belakang

Saat ini seluruh alur video Dena berjalan dari terminal: salin raw ke `raw/`,
buka Claude/Codex, arahkan ke workflow, lalu `npm run repliz:publish`. Dena ingin
satu halaman web yang bisa dibuka dari Mac ini maupun dari HP (via Tailscale)
untuk: upload raw, menghapus raw, memulai sesi edit agen interaktif di tmux
(seperti hanoman), melihat dan men-steer terminalnya, melihat hasil render, dan
mem-publish ke Repliz.

## Keputusan yang sudah diambil

- **Akses:** localhost di Mac ini dan IP Tailscale (HP). Tidak bind `0.0.0.0`.
- **Pendekatan A — tanpa dependency npm** (ADR-0007 tetap berlaku): server
  `node:http` bawaan, terminal via `script(1)` macOS sebagai PTY + SSE/POST,
  xterm.js di-vendor. Bukan Fastify/WebSocket/node-pty seperti hanoman.
- **Form edit:** slug (saran dari nama file, bisa diubah) + runtime + model +
  effort + catatan opsional.
- **Izin agen:** bypass seperti hanoman (`--dangerously-skip-permissions` /
  `--dangerously-bypass-approvals-and-sandbox`). Gate workflow tetap ditahan oleh
  aturan repo dan sesi interaktif.
- **Delete raw:** hard delete dengan cascade — raw + semua `videos/<slug>/` yang
  `source.mp4`-nya menunjuk ke raw itu + sesi tmux-nya, setelah dialog
  konfirmasi yang menampilkan daftar yang akan terhapus.
- **Publish:** dari UI; klik konfirmasi = persetujuan eksplisit (ADR-0003).
  Tanpa opsi `--force`.

## Tujuan

- Satu command `npm run studio` membuka web UI yang bisa dipakai dari Mac dan HP.
- Alur raw → sesi agen → render → publish bisa dijalankan tanpa membuka terminal
  lokal, dengan terminal agen tetap bisa dilihat dan di-steer dari browser.
- Sesi agen bertahan walau server Studio di-restart.

## Non-tujuan

- Multi-user, akun, atau role.
- Editor timeline/visual di browser; semua keputusan edit tetap lewat agen dan
  workflow fase.
- Deploy ke internet publik.
- Menggantikan hanoman.

## Arsitektur

### Server

- `scripts/studio.mjs` — entry: parse argumen, deteksi alamat, pasang route,
  listen. `npm run studio` di `package.json`.
- Modul di `scripts/studio/` (tiap modul punya satu tugas, bisa dites dengan
  runner palsu):
  - `raw.mjs` — list/upload/delete raw, resolusi cascade.
  - `sessions.mjs` — pembuat perintah agen, start/kill/interrupt/status sesi tmux.
  - `terminal.mjs` — attach PTY per viewer, jembatan ke SSE dan input.
  - `results.mjs` — list render, baca receipt, jalankan publish.
  - `http.mjs` — guard Host/Origin/token, helper JSON/SSE/static.
- UI statis: `scripts/studio/public/index.html` + `app.js` + `app.css`, JS polos.
  xterm.js (+ addon fit) di-vendor ke `vendor/xterm/` dengan lisensinya dan
  dicatat di `THIRD_PARTY_NOTICES.md`.
- Hanya modul bawaan Node 22+.

### Alamat listen

- Selalu `127.0.0.1`.
- Plus IP Tailscale bila `tailscale status --json` (atau binary di
  `/Applications/Tailscale.app/Contents/MacOS/Tailscale`) melaporkan
  `BackendState: Running`. Tidak terhubung atau bind gagal → hanya localhost,
  dengan pesan di log (ditemukan saat implementasi: `tailscale ip -4` tetap
  mengembalikan IP walau Tailscale Stopped).
- Port default `4777`, bisa diubah `--port` atau `STUDIO_PORT`.

### Sumber data = filesystem

- **Raw** = file video di `raw/` (ekstensi `.mp4 .mov .m4v`, tanpa `.gitkeep`).
  Durasi via `ffprobe` (di-cache per mtime di memori).
- **Proyek** = `videos/<slug>/`; keterkaitan dengan raw lewat symlink
  `source.mp4` (`realpath` dibandingkan dengan raw). Folder contoh berawalan `.`
  diabaikan.
- **Sesi** = tmux session `studio-<slug>`. Metadata disimpan sebagai option tmux:
  `@studio_runtime`, `@studio_model`, `@studio_effort`, `@studio_raw`,
  `@studio_started`. Tidak ada database, tidak ada file state tambahan.
- **Prompt** = `.studio/prompts/<slug>.md` (folder `.studio/` di-gitignore).

## UI (satu halaman, mobile-first)

Tiga tab.

### Raw

- Daftar raw: nama, ukuran, durasi, jumlah proyek terkait.
- Tombol **Upload** (input file, progress bar). Upload di-stream ke disk.
- Per baris: **Edit this video** dan **Delete**.
- **Delete** membuka dialog berisi daftar: file raw, tiap `videos/<slug>/` terkait
  (termasuk render di dalamnya), dan sesi tmux yang akan di-kill. Cukup klik
  **Hapus** untuk konfirmasi (keputusan Dena 2026-09-28: tanpa ketik ulang nama
  file).

### Form Edit

- Slug: saran = nama file di-lowercase, karakter non `[a-z0-9]` jadi `-`,
  dipangkas; bisa diubah; divalidasi `SLUG_RE` dari `scripts/video.mjs`.
- Bila raw sudah punya proyek, slug terisi otomatis dengan slug proyek itu dan
  mode = lanjutkan. Bila sesi `studio-<slug>` masih hidup, form diganti tombol
  **Open terminal**.
- Runtime: Claude | Codex.
- Model (dropdown + isian bebas):
  - Claude: `opus`, `sonnet`, `fable`, `haiku`.
  - Codex: nilai `model` dari `~/.codex/config.toml` sebagai default + isian bebas.
- Effort:
  - Claude: `low`, `medium`, `high`, `xhigh`, `max`.
  - Codex: `low`, `medium`, `high`, `xhigh` (default dari `model_reasoning_effort`).
- Catatan opsional (textarea).

### Sessions

- Daftar sesi `studio-*`: slug, runtime/model/effort, status, umur.
- Status: `running` (aktivitas < 3 detik), `idle` (`window_activity` ≥ 3 detik),
  `exited` (`pane_dead`). UI mem-poll `GET /api/sessions` tiap 2 detik.
- Aksi: **Show terminal**, **Esc** (interrupt), **Kill**.
- Panel terminal: xterm.js + baris tombol bantu untuk HP: `Esc`, `Enter`, `↑`,
  `↓`, `Tab`, `Ctrl-C`.

### Results

- Daftar `videos/<slug>/renders/*.mp4`: nama, ukuran, waktu, player `<video>`
  inline (range request didukung agar bisa seek di HP).
- Status publish per platform dari `videos/<slug>/repliz-publish.json` bila ada.
- Tombol **Publish to Repliz**.

## Sesi agen

### Start

1. Validasi slug; tolak bila `videos/<slug>/` ada tetapi `source.mp4`-nya tidak
   menunjuk raw yang sama (bentrok).
2. Tulis prompt ke `.studio/prompts/<slug>.md`.
3. Jalankan:

   ```sh
   tmux new-session -d -s studio-<slug> -x 120 -y 40 -c <repo> \
     "<agent-cmd> \"\$(cat .studio/prompts/<slug>.md)\""
   tmux set-option -t studio-<slug> remain-on-exit on
   tmux set-option -t studio-<slug> @studio_runtime <runtime>   # dst.
   ```

   `<agent-cmd>`:

   - Claude: `claude --model <M> --effort <E> --dangerously-skip-permissions`
   - Codex: `codex -m <M> -c 'model_reasoning_effort="<E>"' --dangerously-bypass-approvals-and-sandbox --no-alt-screen`

   Model dan effort divalidasi terhadap pola `^[A-Za-z0-9._:\[\]-]+$` sebelum
   masuk perintah; argumen tmux dipanggil lewat `execFile` (bukan shell) kecuali
   string perintah pane yang dibangun dari nilai tervalidasi saja.

### Isi prompt

Baru:

> Edit raw video `raw/<file>` sebagai proyek `videos/<slug>/`. Ikuti
> `docs/skills/dena-video-editing-workflow/SKILL.md` mulai dari fase Story.
> Catatan dari Dena: <catatan>.
> Jangan publish ke Repliz — publish dilakukan Dena dari Studio.

Lanjutkan:

> Lanjutkan proyek `videos/<slug>/` (raw `raw/<file>`). Baca artefak yang sudah
> ada, tentukan fase terakhir yang selesai, lalu lanjutkan sesuai
> `docs/skills/dena-video-editing-workflow/SKILL.md`. Catatan dari Dena:
> <catatan>. Jangan publish ke Repliz — publish dilakukan Dena dari Studio.

Sesi interaktif, jadi gate (approval storyboard, Gate 3) berhenti dan menunggu
jawaban Dena di terminal.

### Terminal (PTY tanpa node-pty)

- Tiap viewer membuka `GET /api/sessions/<slug>/stream?cols=C&rows=R` (SSE).
  Server spawn:

  ```sh
  script -q /dev/null sh -c 'stty rows R cols C; exec tmux attach -t studio-<slug>'
  ```

  dengan `TERM=xterm-256color`. stdout dikirim sebagai event SSE (base64),
  ditulis ke xterm.
- Input: `POST /api/sessions/<slug>/input` body `{ viewer, data }` → ditulis ke
  stdin proses attach milik viewer itu.
- Resize: client membuka stream baru dengan ukuran baru; server mematikan proses
  attach lama milik viewer itu. tmux menggambar ulang.
- Stream tertutup (tab ditutup, jaringan putus) → proses attach di-kill; agen
  tetap jalan.
- Tombol Esc/Kill memakai `tmux send-keys -t studio-<slug> Escape` dan
  `tmux kill-session`.

## Publish

1. Klik **Publish to Repliz** → `GET /api/results/<slug>/publish-preview`:
   caption dari `publish-captions.md`, target yang terkonfigurasi di `.env`,
   path render. Tampil di dialog konfirmasi.
2. **Konfirmasi** → `POST /api/results/<slug>/publish` menjalankan
   `node scripts/repliz-publish.mjs --slug videos/<slug> --file <render> --approved`
   sebagai child process; stdout/stderr di-stream ke panel log (SSE).
3. Satu publish per slug pada satu waktu (lock di memori); klik ganda ditolak.
4. Setelah selesai, status per platform dibaca ulang dari `repliz-publish.json`.
   Idempotensi sudah ditangani receipt (ADR-0006, ADR-0011).

## Keamanan

Terminal setara akses shell penuh dengan izin bypass, jadi:

- Bind hanya ke `127.0.0.1` dan IP Tailscale.
- Setiap request: header `Host` harus salah satu alamat listen (+ port) atau
  nama MagicDNS host ini; request mutasi (POST/DELETE) harus punya `Origin` yang
  sama. Mencegah CSRF dan DNS rebinding dari situs lain di browser Dena.
- `STUDIO_TOKEN` opsional di `.env`: bila diisi, halaman `/login` meminta token
  sekali lalu menyimpan cookie `HttpOnly; SameSite=Strict`.
- Slug divalidasi `SLUG_RE`. Nama file upload disanitasi (basename, karakter aman,
  ekstensi video yang diizinkan, tidak menimpa file yang ada) dan path hasil
  `resolve` harus tetap di dalam `raw/`. Delete hanya menerima nama yang ada di
  daftar raw.
- Cascade delete hanya menghapus `videos/<slug>/` yang slug-nya valid dan
  `source.mp4`-nya benar-benar menunjuk raw yang dihapus.

## Error handling

- Startup memeriksa `tmux`, `claude`, `codex`, `ffprobe`; yang tidak ada tampil
  sebagai banner di UI dan runtime terkait dinonaktifkan di form.
- Upload gagal/terputus → file parsial (`raw/.<nama>.part`) dihapus; file baru
  di-rename ke nama akhir hanya setelah selesai.
- Slug bentrok, sesi sudah ada, publish sedang jalan → HTTP 409 dengan pesan.
- `tmux` session hilang saat stream dibuka → event SSE `exit` lalu stream ditutup.
- Publish gagal → exit code dan log tetap tampil; tidak ada retry otomatis.

## Testing

`npm run test:studio` (`node --test scripts/studio.test.mjs`), dengan runner
`execFile`/`spawn` palsu:

- Pembuat perintah Claude/Codex (flag, validasi model/effort, penolakan nilai
  berbahaya).
- Saran slug dari nama file; validasi slug.
- Sanitasi nama upload dan penolakan path traversal.
- Resolusi cascade delete (symlink ke raw lain tidak ikut terhapus).
- Parser status sesi dari output `tmux list-sessions -F`.
- Guard Host/Origin/token.
- Pembaca receipt publish.

Smoke manual: `npm run studio`, upload raw kecil, start sesi Claude dan Codex,
steer dari Mac dan HP (Tailscale), resize (putar HP), kill, delete cascade,
publish ke target uji hanya bila Dena memintanya.

## Dokumentasi (commit yang sama dengan kode)

- ADR-0020 — Studio web UI tanpa dependency (PTY via `script(1)`, SSE + POST,
  bind localhost + Tailscale, izin bypass, cascade delete).
- `internal/docs/requirements/rd-05-studio.md` — kriteria EARS (di bawah),
  ditautkan dari `internal/docs/README.md`.
- `internal/docs/architecture/stack.md` — komponen Studio dan xterm.js di-vendor.
- `CLAUDE.md`, `AGENTS.md`, `README.md` — command `npm run studio`,
  `npm run test:studio`.
- `.env.example` — `STUDIO_PORT`, `STUDIO_TOKEN`.
- `.gitignore` — `.studio/`.
- `THIRD_PARTY_NOTICES.md` — xterm.js (MIT).

## Kriteria penerimaan (EARS, calon RD-05)

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
