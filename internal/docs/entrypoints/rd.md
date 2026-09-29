# RD (Entrypoint)
Status: accepted
Date: 2026-08-25

Pintu masuk ringkas ke requirement per domain (EARS). Kanonik: file `rd-NN-*.md`
di `requirements/`.

**Requirement domain:**

- [RD-01 Publish Pipeline](../requirements/rd-01-publish-pipeline.md) — auto-publish R2/Repliz.
- [RD-02 Composition & Render](../requirements/rd-02-composition-render.md) — kontrak komposisi HyperFrames.
- [RD-03 Video Editing Workflow](../requirements/rd-03-video-editing-workflow.md)
  — workflow 4 fase + gate + hook verbatim `00:00.00-<hook_end>` dari transkrip (panjang diputuskan Story);
  mode generate (RD-03-75…93): naskah + TTS, Gate 1/2 wajib, storyboard sheet, gates.json + video gate;
  format musik kinetic-post / motion-short (RD-03-94…99): dua gate, starter tanpa BGM, teks layar di beat.
- [RD-04 Transcription & Setup](../requirements/rd-04-transcription-setup.md) — whisper + setup.
- [RD-05 Studio Web UI](../requirements/rd-05-studio.md) — web UI lokal: project, sesi agen, publish, tab Suara/Musik; tab Generate (RD-05-21…33): form + panel review gate, per format.
- [RD-06 Audio](../requirements/rd-06-audio.md) — adapter suara TTS, uji dengar blind, pustaka musik,
  `video voice` / `video bgm` untuk mode generate.

Standar penulisan → [ears-standard](../requirements/ears-standard.md).
