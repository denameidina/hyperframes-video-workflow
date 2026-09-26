# RD-04 Transcription & Setup
Status: accepted (reverse-engineered)
Date: 2026-07-20

Domain: penyiapan lingkungan + transkripsi lokal (whisper.cpp). Owner:
`vendor/whisper.cpp`, `docs/initial-setup.md`, `docs/ai-agent-initial-setup.md`.
Diturunkan dari setup docs, `.gitmodules`, dan fase Story (`docs/agents/references/cut-and-pacing.md`).

## Setup lingkungan

- **RD-04-01** (Ubiquitous) — The system shall mensyaratkan Node.js 22+, Git,
  CMake, C/C++ build tools, dan FFmpeg/ffprobe untuk workflow penuh.
- **RD-04-02** (Event-driven) — When clone baru, the system shall menginisialisasi
  submodule `vendor/whisper.cpp` via
  `git submodule update --init --recursive vendor/whisper.cpp`.
- **RD-04-03** (Event-driven) — When menyiapkan transkripsi, the system shall
  membangun whisper.cpp (`cmake -S ... -B .../build` lalu
  `cmake --build .../build -j --config Release`) dan mengunduh model
  `large-v3-turbo` (`sh .../models/download-ggml-model.sh large-v3-turbo`).
- **RD-04-04** (Ubiquitous) — The system shall menjaga model whisper dan submodule
  build di luar git (di-ignore).
- **RD-04-05** (Event-driven) — When agent AI memulai, the system shall memastikan
  `raw/`, `videos/`, `references/`, `renders/` ada (buat + `.gitkeep` bila hilang).

## Transkripsi

- **RD-04-06** (Event-driven) — When mentranskrip, the system shall mengekstrak
  audio 16 kHz mono (`ffmpeg -ar 16000 -ac 1 ...`) lalu menjalankan
  `vendor/whisper.cpp/build/bin/whisper-cli` dengan model
  `ggml-large-v3-turbo.bin`, `-l id`, prompt domain (Dena Meidina, HyperFrames,
  Codex, dst.), output JSON (`-oj -ojf`).
- **RD-04-07** (Ubiquitous) — The system shall memakai whisper lokal project
  (`vendor/whisper.cpp`), bukan instalasi whisper global.
- **RD-04-08** (Unwanted) — If memotong cut mengandalkan timing word-level whisper,
  then the system shall menolak; word-level adalah interpolasi token dan bisa
  meleset hingga ~1.4s. Cut harus berbasis amplitudo (`silencedetect` untuk
  kandidat batas, `volumedetect` per-window untuk konfirmasi >= 18 dB di bawah
  puncak speech). Timing segment-level boleh dipercaya.
- **RD-04-09** (State-driven) — While Whisper menormalkan register kolokial pada
  audio 1.2x (udah→sudah, nggak→tidak, dst.), the system shall memulihkan bentuk
  ucapan asli Dena di caption dan mengecek istilah tool/UI terhadap frame
  on-screen.

## Referensi

- Operasi: [operations/runbook](../operations/runbook.md)
- Cut: [requirements/rd-03-video-editing-workflow](rd-03-video-editing-workflow.md)
- Keputusan: [ADR-0004](../adr/0004-local-whisper-transcription.md)
