# ADR-0010 Proyek HyperFrames per Video
Status: accepted
Date: 2026-09-26

## Context

Setiap video ditulis langsung di `index.html` root yang ter-track git, sehingga
setiap edit video ikut ter-commit (contoh `dena-wfh-jaga-anak` di `17b3683`) dan
`npm run check` root gagal begitu media video dihapus. Spike 2026-09-26: proyek
`videos/demo/` dengan symlink `vendor -> ../../vendor` lolos `hyperframes lint`
dan `snapshot` merender clip motion-kit dengan font termuat; `lint`,
`validate`, `inspect`, `preview`, `snapshot`, dan `render` menerima `[DIR]`.

## Decision

- Root `index.html` adalah template blank portrait HyperFrames (GSAP lokal) dan
  tidak diubah untuk video.
- Setiap video adalah proyek HyperFrames di `videos/<slug>/` (sudah di-ignore):
  `index.html`, `compositions/broll/`, `assets/`, `renders/`, `snapshots/`,
  symlink `vendor -> ../../vendor`; path media relatif.
- Starter Dena ter-track di `templates/dena-video/`; `npm run video -- new|check|dev|snapshot|render <slug>`
  (`scripts/video.mjs`) membuat dan menjalankan proyek itu.

## Consequences

- Pekerjaan video tidak lagi masuk commit; clone baru hanya berisi template.
- Semua perintah HyperFrames untuk video memakai `videos/<slug>` sebagai DIR.
- Starter menaruh audio di track 10 (konflik lama "audio di track 1" selesai
  untuk video baru).

## Sources

- Spec: `docs/superpowers/specs/2026-09-26-per-video-projects-design.md`
- `scripts/video.mjs`, `templates/dena-video/`
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md)
