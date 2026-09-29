# Initial Setup

Gunakan dokumen ini setelah clone repo baru. Tujuannya: project bisa preview
HyperFrames dan siap membuat transcript dengan `vendor/whisper.cpp`.

## Requirements

- Node.js 22+ dan npm/npx.
- Git.
- CMake.
- C/C++ build tools:
  - macOS: Xcode Command Line Tools.
  - Linux: `build-essential` atau paket compiler setara.
- FFmpeg/ffprobe.
- `curl` atau `wget` untuk download model Whisper.
- Koneksi internet untuk `npx hyperframes@0.7.24`, submodule, dan model.
- Wrangler via `npx wrangler` jika akan upload final render ke Cloudflare R2/Repliz.
- `uv` (opsional) untuk TTS lokal Supertonic; `GEMINI_TTS_API_KEY` (opsional) untuk TTS Gemini.

macOS quick install:

```bash
xcode-select --install
brew install node cmake ffmpeg git
```

Linux quick install:

```bash
sudo apt-get update
sudo apt-get install -y git nodejs npm cmake build-essential ffmpeg curl
```

## Clone

```bash
git clone <repo-url>
cd videos
git submodule update --init --recursive vendor/whisper.cpp
```

Kalau sudah terlanjur clone tanpa submodule, jalankan command `git submodule`
di atas dari root repo.

## Build whisper.cpp

Project memakai Whisper lokal, bukan global binary.

```bash
cmake -S vendor/whisper.cpp -B vendor/whisper.cpp/build
cmake --build vendor/whisper.cpp/build -j --config Release
```

Verifikasi:

```bash
vendor/whisper.cpp/build/bin/whisper-cli -h
```

## Download Whisper Model

Workflow Dena memakai `ggml-large-v3-turbo.bin`.

```bash
sh vendor/whisper.cpp/models/download-ggml-model.sh large-v3-turbo
```

Verifikasi:

```bash
test -f vendor/whisper.cpp/models/ggml-large-v3-turbo.bin
```

Model ini besar dan sengaja tidak masuk git.

## Smoke Test Transcription

`whisper-cli` butuh WAV 16-bit. Untuk raw media apa pun, convert dulu:

```bash
ffmpeg -y -i <input-media> -ar 16000 -ac 1 -c:a pcm_s16le /tmp/dena-audio.wav
```

Lalu jalankan:

```bash
vendor/whisper.cpp/build/bin/whisper-cli \
  -m vendor/whisper.cpp/models/ggml-large-v3-turbo.bin \
  -f /tmp/dena-audio.wav \
  -l id \
  --prompt "Dena Meidina, HyperFrames, Codex, AGENTS.md, skills, motion overlay, transcript cut, IG, TikTok, AI workflow" \
  -oj -ojf \
  -of /tmp/dena-transcript
```

Output JSON akan dibuat di `/tmp/dena-transcript.json`.

## Restore Local Media

Git tidak menyimpan file raw, working media, references, dan render. Untuk
komposisi aktif, pulihkan file ini sebelum preview/render:

```text
videos/0702-2/processed-compact-plus.mp4
videos/0702-2/audio-compact-sync.m4a
videos/0702-2/assets/editing-bottleneck.svg
videos/0702-2/assets/tool-stack.svg
videos/0702-2/assets/workflow-pipeline.svg
videos/0702-2/assets/monitor-proof-blurred.jpg
videos/0702-2/assets/transcript-cut-flow.svg
```

Minta folder `videos/0702-2/` dari pemilik project, atau regenerate lewat
workflow agent di `docs/agents/`.

## Video Sources

Setiap video punya project `videos/<slug>/`. Taruh file khusus video itu di
`videos/<slug>/sources/`, atau file reusable di `shared/` (ADR-0022):

```bash
npm run video -- new <slug>
npm run video -- sources <slug> [--add-shared a.mp4,b.png] [--set <id> --role speech|broll --note "<text>"]
npm run video -- cut <slug>          # processed.mp4 + cut-map.json dari cut-list.json
npm run video -- migrate-sources     # clone lama dengan raw/ + source.mp4: dry run, lalu --apply
```

## Voice (TTS) — opsional

Untuk voiceover video generate ([ADR-0023](../internal/docs/adr/0023-voice-adapter-tts.md)):

```bash
brew install uv                       # Supertonic lokal berjalan lewat uv (Python 3.12, sekali pakai)
echo 'GEMINI_TTS_API_KEY=<key>' >> .env   # Gemini 3.8 Flash TTS; bukan GEMINI_API_KEY
npm run voice -- say --preset <p> --text "Halo semua." --out /tmp/voice-smoke
```

Panggilan Supertonic pertama mengunduh model ke `~/.cache/supertonic3` (±70 s).

## Run HyperFrames

Preview:

```bash
npm run dev
```

Check sebelum render/handoff:

```bash
npm run check
```

Render:

```bash
npm run render
```

Publish:

```bash
npm run publish
```

## Optional Repliz/R2 Auto Publish

Auto publish memakai Wrangler untuk upload MP4 final ke Cloudflare R2, lalu
Repliz memakai URL publik R2 itu untuk scheduling. Flow ini opsional dan hanya
boleh dijalankan setelah user review dan approve hasil edit.

Setup:

```bash
npx wrangler login
cp .env.example .env
```

Isi `.env` dengan credential Repliz, target account social, dan Cloudflare:

```bash
R2_BUCKET=<r2-bucket>
R2_PUBLIC_BASE_URL=https://<r2-public-domain>
R2_PREFIX=<r2-prefix>
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
```

Tidak perlu `wrangler.jsonc`, S3 access key, atau R2 secret key untuk flow ini.

Command publish setelah user approve:

```bash
npm run repliz:publish -- --slug videos/<slug> --file renders/final.mp4 --approved
```

Tanpa `--approved`, script wajib berhenti sebelum upload R2 atau scheduling Repliz.
