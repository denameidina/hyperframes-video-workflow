# Runbook
Status: operating standard
Date: 2026-07-20

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

Pastikan folder kerja ada: `mkdir -p raw videos references renders` (+ `.gitkeep`).

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

> `npm run video -- dev <slug>` (dan `npm run dev`) memblokir sampai dihentikan. Di agent/automation jalankan sebagai
> background process, jangan foreground (akan timeout & server mati).

Referensi HyperFrames tanpa jaringan: `npx hyperframes docs <topic>` (topik:
`data-attributes`, `gsap`, `compositions`, `rendering`, `examples`,
`troubleshooting`). Lint verbose: `npx hyperframes lint --verbose`.

## Transkripsi satu video

```bash
ffmpeg -y -i videos/<slug>/<input-media> -ar 16000 -ac 1 -c:a pcm_s16le videos/<slug>/audio.wav
vendor/whisper.cpp/build/bin/whisper-cli \
  -m vendor/whisper.cpp/models/ggml-large-v3-turbo.bin \
  -f videos/<slug>/audio.wav -l id \
  --prompt "Dena Meidina, HyperFrames, Codex, AGENTS.md, skills, motion overlay, transcript cut, IG, TikTok, AI workflow" \
  -oj -ojf -of videos/<slug>/transcript-large-v3-turbo
```

Normalisasi hasil ke `videos/<slug>/transcript.json`. Ingat: cut berbasis
amplitudo, bukan word-level timing (lihat
[rd-04](../requirements/rd-04-transcription-setup.md)).

## Publish final

Lihat [publish-runbook](publish-runbook.md). Ringkas — hanya setelah approval user:

```bash
npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved
```

## Test

```bash
npm run test:repliz          # node --test scripts/repliz-publish.test.mjs
npm run test:motion-kit      # node --test scripts/motion-kit.test.mjs
npm run test:craft-kit       # node --test scripts/craft-kit.test.mjs (resep koreografi craft-kit, paritas CK.add/CK.at)
npm run test:style-kit       # node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs scripts/paper-pack.test.mjs
npm run test:asset-lib       # node --test scripts/asset-lib.test.mjs (pustaka aset: build, katalog, lisensi, anggaran, preset, runtime)
npm run asset-lib -- build   # bangun ulang output vendor/asset-lib dari src/ (offline)
npm run asset-lib -- sheets  # render contact sheet → docs/agents/references/asset-catalog/sheets/*.webp
npm run test:render-blur     # node --test scripts/render-blur.test.mjs
npm run test:video          # node --test scripts/video.test.mjs
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
