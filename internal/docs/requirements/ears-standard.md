# EARS Standard
Status: accepted
Date: 2026-07-20

Kanonik untuk: format acceptance criteria di repo ini. Setiap perubahan perilaku
ditulis sebagai kriteria EARS **sebelum** kode. Semua kriteria harus terukur —
tanpa kata "cepat/aman/bagus" tanpa angka.

## 5 pola EARS

- **Ubiquitous** — `The system shall <respons>.`
  Selalu berlaku, tanpa syarat.
- **Event-driven** — `When <trigger>, the system shall <respons>.`
  Dipicu kejadian diskret.
- **State-driven** — `While <keadaan>, the system shall <respons>.`
  Berlaku selama suatu keadaan aktif.
- **Optional** — `Where <fitur ada>, the system shall <respons>.`
  Berlaku hanya bila fitur/konfigurasi hadir.
- **Unwanted** — `If <kondisi tak diinginkan>, then the system shall <respons>.`
  Menangani error/kondisi buruk.

## Aturan penulisan

- Satu kriteria = satu perilaku yang bisa diuji.
- Cantumkan angka konkret (timeout ms, threshold dB, batas karakter, status HTTP).
- ID kriteria berformat `RD-NN-XX` agar bisa dirujuk QA & test.
- "System" boleh berarti: CLI publish, HyperFrames render, atau disiplin
  workflow agent — sebut subjeknya bila ambigu.

## Dokumen requirements

- [FRD](frd.md) — ikhtisar fungsional + peta domain.
- [RD-01 Publish Pipeline](rd-01-publish-pipeline.md)
- [RD-02 Composition & Render](rd-02-composition-render.md)
- [RD-03 Video Editing Workflow](rd-03-video-editing-workflow.md)
- [RD-04 Transcription & Setup](rd-04-transcription-setup.md)
- [RD-05 Studio Web UI](rd-05-studio.md)
- [RD-06 Audio](rd-06-audio.md)
