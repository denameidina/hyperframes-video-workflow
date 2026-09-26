# ADR-0004 Transkripsi Lokal via whisper.cpp (Submodule)
Status: accepted (reverse-engineered)
Date: 2026-07-20

## Context

Workflow butuh transkrip word-level bahasa Indonesia untuk merancang caption dan
cut. Opsi: API cloud (biaya, privasi, ketergantungan jaringan) atau transkripsi
lokal. Footage bisa privat; determinisme & kontrol lokal diinginkan.

## Decision

Memakai **whisper.cpp** sebagai git submodule di `vendor/whisper.cpp` dengan model
**`ggml-large-v3-turbo`**, dibangun lewat CMake dan dijalankan lokal
(`whisper-cli -l id` + prompt domain). Model dan build tidak masuk git.

## Rationale

- Lokal/offline: tak ada biaya per-menit, tak mengirim footage privat ke cloud.
- `large-v3-turbo` menyeimbangkan akurasi dan kecepatan untuk ID.
- Prompt domain (nama, istilah tool) menaikkan akurasi istilah spesifik.

## Consequences

- Setup lebih berat: butuh CMake + C/C++ toolchain + unduh model (`docs/initial-setup.md`).
- Word-level timing whisper adalah interpolasi token (bisa meleset ~1.4s) →
  cut **tidak** boleh bergantung padanya; pakai `silencedetect`+`volumedetect`
  (lihat RD-04-08).
- Whisper menormalkan register kolokial pada audio 1.2x → caption harus memulihkan
  bentuk ucapan asli.

## Sources

- `.gitmodules`, `docs/initial-setup.md`, `docs/ai-agent-initial-setup.md`
- `docs/agents/references/cut-and-pacing.md`, `docs/dena-social-video-style-guide.md`
- [requirements/rd-04-transcription-setup](../requirements/rd-04-transcription-setup.md)
