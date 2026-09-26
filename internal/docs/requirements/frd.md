# Functional Requirements (FRD)
Status: accepted (reverse-engineered)
Date: 2026-07-20

Kanonik untuk: ikhtisar fungsional repo + peta domain requirement. Detail per
domain ada di file `rd-NN-*.md`. Diturunkan dari perilaku nyata kode + spec.

## Domain fungsional

Repo mengerjakan dua fungsi besar yang berurutan:

1. **Produksi video** — dari raw footage jadi komposisi HyperFrames siap render
   (workflow 4 fase). Lihat [RD-03](rd-03-video-editing-workflow.md) dan
   [RD-02](rd-02-composition-render.md).
2. **Distribusi** — dari render final MP4 jadi post terjadwal multi-platform via
   R2 + Repliz. Lihat [RD-01](rd-01-publish-pipeline.md).

Fungsi pendukung: transkripsi lokal & setup lingkungan
([RD-04](rd-04-transcription-setup.md)).

## Peta domain → requirement doc

| Domain | Doc | Owner utama |
| --- | --- | --- |
| Auto-publish R2/Repliz | [rd-01-publish-pipeline](rd-01-publish-pipeline.md) | `scripts/repliz-publish.mjs` |
| Komposisi & render | [rd-02-composition-render](rd-02-composition-render.md) | `index.html`, HyperFrames |
| Workflow editing (4 fase) | [rd-03-video-editing-workflow](rd-03-video-editing-workflow.md) | `docs/agents/*` |
| Transkripsi & setup | [rd-04-transcription-setup](rd-04-transcription-setup.md) | whisper.cpp, setup docs |

## Batasan lintas domain (ubiquitous)

- The system shall menyimpan semua media kerja (`raw/`, `videos/`, `references/`,
  `renders/`) di luar git kecuali `.gitkeep`.
- The system shall menjaga komposisi tetap deterministik (tanpa `Date.now`,
  `Math.random`, network runtime).
- The system shall menuntut approval user eksplisit sebelum distribusi keluar
  (upload R2 / schedule Repliz).

## Non-functional

Kriteria terukur non-fungsional (loudness, keterbacaan caption, timeout,
idempotensi, batas platform) ada di [architecture/nfr](../architecture/nfr.md).
