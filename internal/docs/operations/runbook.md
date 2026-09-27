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
npm run test:style-kit       # node --test scripts/style-kit.test.mjs scripts/style-docs.test.mjs
npm run test:render-blur     # node --test scripts/render-blur.test.mjs
npm run test:video          # node --test scripts/video.test.mjs
npm run check:broll-examples # lint + validate + snapshot contoh motion b-roll → renders/broll-examples/
```

## Troubleshooting cepat

- Preview blank / render gagal setelah clone → cek media lokal yang dirujuk
  `videos/<slug>/index.html` sudah ada (proyek video tidak ikut ter-clone).
- `npm run video -- check <slug>` error → perbaiki semua error sebelum handoff/render.
- Publish berhenti "Missing env" → lengkapi `.env` dari `.env.example`.
- Publish berhenti "user approval" → tambah `--approved` setelah review.
