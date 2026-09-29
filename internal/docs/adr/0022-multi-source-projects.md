# ADR-0022 Multi-source projects: banyak take, B-roll, dan gambar menjadi satu video
Status: accepted
Date: 2026-09-29

## Context

Sampai ADR ini, satu project `videos/<slug>/` terikat ke satu raw video lewat
symlink `source.mp4`; `metadata.source` dan `cut-list.source` satu string; agen
Story menulis pipeline ffmpeg cut sendiri; Studio memodelkan raw ↔ project 1:1
(ADR-0020) dan delete raw meng-cascade project. Dena ingin satu edited video
dibuat dari beberapa take talking-head, B-roll miliknya sendiri, dan gambar —
lewat Studio maupun langsung lewat Claude/Codex.

## Decision

- **Project-first.** File khusus satu video di-upload ke `videos/<slug>/sources/`.
- **`shared/` menggantikan `raw/`** sebagai library file reusable (video + gambar).
  Project merujuk file shared lewat path `../../shared/<name>`, tidak menyalin.
- **Manifest `videos/<slug>/sources.json`** (version 1) mencatat setiap sumber:
  `id`, `path`, `origin`, `kind`, `role` (`speech|broll|image|null`),
  `roleSource` (`user|detected|null`), `note`, `probe`. Satu modul penulis
  (`scripts/lib/video-sources.mjs`) dipakai CLI (`npm run video -- sources`) dan
  Studio. Peran dari Dena (`roleSource: "user"`) tidak pernah ditimpa.
- **Cut-list multi-sumber.** Setiap segmen punya `source: "<id>"`; field
  `source` tingkat atas dihapus. Urutan segmen yang dirender = urutan output.
  Aksi baru `cut-retake` untuk take yang tidak dipakai.
- **`npm run video -- cut <slug>`** adalah satu-satunya jalur membangun
  `processed.mp4`: normalisasi 1080×1920/30 fps, loudness per sumber −16 LUFS,
  fade 15 ms per sambungan, speed via `setpts`/`atempo`; juga menulis
  `cut-map.json` (waktu output ↔ sumber).
- **B-roll dan gambar tidak masuk `processed.mp4`.** Story menginventarisnya
  (Source Inventory), Screen Plan menempatkannya, Build memasangnya sebagai
  overlay. Batas fase ADR-0008 tetap.
- **Studio berpusat project** dengan tab Shared Library. Hapus file shared yang
  masih dipakai ditolak (409); tidak ada cascade delete.
- Migrasi sekali jalan: `npm run video -- migrate-sources [--apply]`.

## Consequences

- Satu take pun memakai model yang sama (`sources.json` dengan satu `s1`).
- `transcript.json` diganti `transcripts/<id>.json` (koordinat sumber);
  `processed-transcript.json` tetap.
- Montage tanpa sumber speech di luar scope; Story berhenti dengan blocker note.
- Mengubah sebagian ADR-0010 (layout project) dan ADR-0020 (raw library Studio).

## Referensi

- Spec: `docs/superpowers/specs/2026-09-29-multi-source-projects-design.md`
- Kriteria: RD-03-65…RD-03-74, RD-05-04/05/13/14/15
