# Runbook
Status: operating standard
Date: 2026-09-30

Kanonik untuk: perintah operasional harian (setup, preview, check, render,
publish). Diturunkan dari `package.json`, `README.md`, `docs/initial-setup.md`,
`docs/ai-agent-initial-setup.md`.

## Prasyarat

- Node.js **22+**, Git, CMake, C/C++ toolchain, FFmpeg/ffprobe.
- Internet untuk run pertama (`npx hyperframes@0.7.24`).
- Wrangler (`npx wrangler`) hanya untuk publish R2/Repliz.

## Setup setelah clone

```bash
git clone <repo-url>
cd videos
git submodule update --init --recursive vendor/whisper.cpp
```

Transkripsi (opsional, sekali):

```bash
cmake -S vendor/whisper.cpp -B vendor/whisper.cpp/build
cmake --build vendor/whisper.cpp/build -j --config Release
sh vendor/whisper.cpp/models/download-ggml-model.sh large-v3-turbo
```

Pastikan folder kerja ada: `mkdir -p shared videos references renders` (+ `.gitkeep`).
Root `index.html` adalah template kosong; video aktif selalu di `videos/<slug>/`.

## Loop editing harian

```bash
npm run video -- new <slug>       # proyek video dari starter Dena (sekali per video)
npm run video -- dev <slug>       # preview (long-running; jalankan di background)
npm run video -- check <slug>     # lint + validate + inspect — WAJIB setelah tiap edit .html
npm run video -- snapshot <slug> --at 1.5,3   # still check tanpa upload ke Gemini
npm run video -- render <slug>    # render → videos/<slug>/renders/<slug>.mp4
npm run video -- render <slug> --blur  # opsional: render final dengan motion blur (4× lebih lama)
npm run video -- cutout <slug> --from <s> --dur <s> --name NN-dena  # cutout mix-media → assets/cutouts/NN-dena.webm
npm run video -- layers <slug> (--at <s> | --image <file>) --name NN-scene  # sumber + subjek parallax → assets/layers/
npm run check                     # hanya untuk template root index.html
```

Setiap render normal/blur memakai direktori kerja unik dalam `renders/`, sehingga
proses yang tumpang tindih tidak menulis atau menghapus output satu sama lain.
Delivery memindahkan MP4 selesai ke file miliknya dalam direktori unik **sebelum**
validasi; penulisan ulang path incoming tidak dapat mengubah kandidat yang diuji.
Keduanya memeriksa root
`data-width`/`data-height`/`data-duration`, 30 fps (blur langsung menerima `--fps`),
jumlah frame, durasi stream, dan decode penuh sebelum mengganti master secara
atomik. Audio yang dinyatakan pada audio/video tanpa `muted` di komposisi lokal
harus muncul sebagai AAC stereo 48 kHz; proyek tanpa audio tetap boleh dirender.
Output parsial dihapus pada kegagalan, master dan receipt sebelumnya dipertahankan.
Promosi MP4 dan receipt dijaga lock eksklusif `<final>.mp4.delivery.lock` selama
operasi file; contender gagal tanpa menyentuh pasangan yang sedang dipromosikan.
Lock dilepas pada sukses maupun error. Jika proses dimatikan paksa saat promosi,
hapus lock tertinggal hanya setelah PID yang tertulis di dalamnya sudah berhenti.

Pengukuran loudness/true peak memakai **AAC yang sudah diencode dalam MP4**.
Default speech/explainer ialah −16 LUFS ±1 LU; kinetic-post, motion-short,
music/showreel ialah −17 LUFS ±1 LU; true peak paling tinggi −1 dBTP. Mix di luar
profil dimaster lewat FFmpeg loudnorm dua pass dengan video `copy`, lalu MP4 baru
diukur dan didecode lagi. Jika tetap di luar profil, delivery ditolak. Jalur blur
secara eksplisit memakai libx264 CRF 16, preset slow, yuv420p, BT.709 (termasuk
VUI x264), faststart, serta audio `copy` pada pass blend.

Target yang lebih tenang dapat dinyatakan di `videos/<slug>/render-profile.json`:

```json
{"name":"quiet-gallery","targetLufs":-20,"toleranceLu":1,"truePeakDbtp":-2}
```

`targetLufs` didukung dari −40 LUFS sampai default format (hanya boleh lebih
tenang), `toleranceLu` lebih dari 0 hingga 1 LU, dan `truePeakDbtp` dari −9 hingga
−1 dBTP mengikuti rentang FFmpeg loudnorm. File/profil yang tidak valid ditolak
sebelum render. Delivery menulis `<final>.mp4.quality.json`: SHA-256, bytes,
expected/actual stream, hasil pengukuran audio sebelum/sesudah mastering, profil
dan sumbernya, profil encode, versi Node/FFmpeg/ffprobe/HyperFrames, serta hasil
check. Ini receipt kualitas media; determinisme seek/pixel tidak menjamin byte
MP4 identik antara versi encoder.

> `npm run video -- dev <slug>` (dan `npm run dev`) memblokir sampai dihentikan. Di agent/automation jalankan sebagai
> background process, jangan foreground (akan timeout & server mati).

Referensi HyperFrames tanpa jaringan: `npx hyperframes docs <topic>` (topik:
`data-attributes`, `gsap`, `compositions`, `rendering`, `examples`,
`troubleshooting`). Lint verbose: `npx hyperframes lint --verbose`.

## Transkripsi satu video

```bash
npm run video -- sources <slug>    # baca id/path speech dari sources.json
mkdir -p videos/<slug>/transcripts
ffmpeg -y -i videos/<slug>/sources/<input-media> -ar 16000 -ac 1 -c:a pcm_s16le videos/<slug>/transcripts/<id>-audio.wav
vendor/whisper.cpp/build/bin/whisper-cli \
  -m vendor/whisper.cpp/models/ggml-large-v3-turbo.bin \
  -f videos/<slug>/transcripts/<id>-audio.wav -l id \
  --prompt "Dena Meidina, HyperFrames, Codex, AGENTS.md, skills, motion overlay, transcript cut, IG, TikTok, AI workflow" \
  -oj -ojf -of videos/<slug>/transcripts/<id>-whisper
```

Normalisasi hasil ke `videos/<slug>/transcripts/<id>.json`; sumber reusable
memakai input `shared/<file>` dari manifest. Setelah cut, Story membuat
`processed-transcript.json` dalam waktu processed. Ingat: cut berbasis
amplitudo, bukan word-level timing (lihat
[rd-04](../requirements/rd-04-transcription-setup.md)).

## Publish final

Lihat [publish-runbook](publish-runbook.md). Ringkas — hanya setelah approval user:

```bash
npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved
```

## Test

```bash
npm test                   # semua scripts/*.test.mjs; sama dengan CI
npm run test:hooks         # regresi hook Python dalam repo Git sementara
npm run test:repliz          # node --test scripts/repliz-publish.test.mjs
npm run test:motion-kit      # node --test scripts/motion-kit.test.mjs
npm run test:craft-kit       # node --test scripts/craft-kit.test.mjs (resep koreografi craft-kit, paritas CK.add/CK.at)
npm run test:style-kit       # node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs
npm run test:asset-lib       # node --test scripts/asset-lib.test.mjs (pustaka aset: build, katalog, lisensi, anggaran, preset, runtime)
npm run asset-lib -- build   # bangun ulang output vendor/asset-lib dari src/ (offline)
npm run asset-lib -- sheets  # render contact sheet → docs/agents/references/asset-catalog/sheets/*.webp
npm run test:render-blur     # node --test scripts/render-blur.test.mjs
node --test scripts/render-quality.test.mjs # fixture video/AAC nyata, atomic delivery, profile, corrupt payload
npm run test:video          # CLI, sources, cut, generate, gate, music-cut
npm run test:studio         # server/route/terminal/Generate Studio
npm run test:voice          # node --test scripts/voice-*.test.mjs (adapter suara, uji dengar)
npm run test:music          # node --test scripts/music.test.mjs (pustaka musik)
npm run check:broll-examples # lint + validate + snapshot contoh motion b-roll → renders/broll-examples/
npm run check:style-examples # lint + validate + snapshot contoh style b-roll, satu host per gaya → renders/style-examples/<gaya>/ (-- <gaya> untuk satu)
npm run check:craft-examples # lint + validate + snapshot contoh resep craft-kit → renders/craft-examples/
npm run style-examples -- build # hasilkan ulang index.html + snapshots.json tiap host dari examples.json
npm run moodboard -- build     # hasilkan ulang host studi moodboard dari moodboard.json
npm run moodboard -- sheets [gaya]  # render sheet moodboard per gaya → docs/agents/references/moodboard/sheets/*.webp
npm run moodboard -- fetch [gaya]   # unduh still referensi asli ke moodboard/local/ (gitignored, jaringan)
```

## Mode generate (tanpa footage)

[ADR-0025](../adr/0025-generate-mode-explainer.md) (explainer),
[ADR-0027](../adr/0027-music-formats.md) (kinetic-post, motion-short); alur per fase di
`docs/agents/references/generate-mode.md`.

```bash
npm run video -- new <slug> --generate [--format kinetic-post|motion-short]  # starter generate + research/ + brief (format default explainer)
npm run video -- music <slug> --track <id> [--from <s>] --bars <n>  # format musik: potong bar utuh -> processed-audio.wav + beats.json (baca peringatannya)
npm run video -- voice <slug> [--preset <p>]           # script.md -> processed-audio.wav + processed-transcript.json
npm run video -- storyboard <slug>                     # actual project frames -> preview/storyboard-sheet.jpg + evidence
npm run video -- storyboard <slug> --reference         # sheet referensi berlabel; tidak memenuhi gate produksi
npm run video -- bgm <slug> --track <id> --from <s>    # BGM ter-duck -> bgm.wav + bgm.json
```

## Suara (TTS)

Adapter suara ([ADR-0023](../adr/0023-voice-adapter-tts.md), [RD-06](../requirements/rd-06-audio.md)).
Butuh `GEMINI_TTS_API_KEY` di `.env` untuk preset Gemini dan `uv` untuk Supertonic.

```bash
npm run voice -- say --preset <p> --file <naskah.md> --out <dir>   # voiceover.wav + voice-meta.json + words.json
npm run voice -- ref --from shared/<take>.mp4 --at <s> --dur 20    # referensi suara Dena (10-30 s)
npm run voice -- clone --consent <rekaman-consent.m4a>             # clone Gemini (paid tier dulu)
npm run voice -- design --name designed-a --prompt "<deskripsi>"   # voice design id-ID
npm run voice -- voices --lang jv                                  # daftar suara prebuilt
npm run voice -- test build                                        # uji dengar blind -> shared/voice-tests/<run>/
npm run voice -- test build --only supertonic --keep 4             # tanpa Gemini (mis. kuota free tier habis: 10 request/hari)
npm run voice -- test reveal <run>                                 # setelah dinilai di Studio (tab Suara)
```

## Musik (BGM)

Pustaka `shared/music/` ([ADR-0024](../adr/0024-music-library.md)): hanya `cc0`,
`public-domain`, `pixabay`, `mixkit`. Situs yang menolak unduhan otomatis → unduh manual,
lalu `add <file>` dengan argumen yang sama.

```bash
npm run music -- add <url|file> --source <halaman-track> --license cc0 --title "<judul>" --author "<pembuat>" --mood reflektif --energy 2 [--loopable] [--proof <file>]
npm run music -- list --mood upbeat --min-dur 60
npm run music -- check
```

## Troubleshooting cepat

- Preview blank / render gagal setelah clone → cek media lokal yang dirujuk
  `videos/<slug>/index.html` sudah ada (proyek video tidak ikut ter-clone).
- `npm run video -- check <slug>` error → perbaiki semua error sebelum handoff/render.
- Publish berhenti "Missing env" → lengkapi `.env` dari `.env.example`.
- Publish berhenti "user approval" → tambah `--approved` setelah review.
- `voice` berhenti "GEMINI_TTS_API_KEY is not set" → isi di `.env` (bukan `GEMINI_API_KEY`).
- `voice` berhenti "uv not found" → `brew install uv`; unduhan model Supertonic pertama ±70 s.
- Peringatan "alignment WER" → dengarkan paragraf yang disebut, perbaiki naskah/leksikon, buat ulang.
- `HTTP 429 … Free Tier` dari Gemini → kuota free tier `gemini-3.8-flash-tts` hanya 3 request/menit dan
  10 request/hari (±1 request per paragraf); aktifkan paid tier atau pakai `--only supertonic`.
