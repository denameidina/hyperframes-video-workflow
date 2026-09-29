# ADR-0024 Pustaka musik `shared/music/` dengan allowlist lisensi
Status: accepted
Date: 2026-09-29

## Context

Video generate — terutama motion graphic tanpa narasi — butuh BGM yang sudah ter-bake di
render: publish lewat Repliz tidak bisa menambahkan trending sound dari aplikasi. Dena
ingin BGM diambil dari web dan disimpan di `shared/music/`, hanya yang bebas dipakai.
Tidak ada musik yang benar-benar "tanpa lisensi"; yang dicari adalah lisensi yang boleh
dipakai komersial tanpa atribusi.

## Decision

- Allowlist lisensi dikunci di `scripts/lib/music.mjs`:
  - tier A: `cc0`, `public-domain`;
  - tier B: `pixabay`, `mixkit` — komersial tanpa atribusi; sebagian uploader
    mendaftarkan track ke Content ID, jadi risikonya dicatat per track.
  - Ditolak: CC-BY (wajib atribusi), NC/ND, "personal use only", YouTube Audio Library,
    musik AI dengan hak tidak jelas.
- Katalog `shared/music/catalog.json` (version 1) dengan sha256, durasi, loudness, mood,
  energi, `contentIdRisk`, dan `rejected`; bukti lisensi di
  `shared/music/licenses/<id>.txt` (+ file bukti opsional `--proof`).
- CLI `npm run music -- add|list|check` adalah satu-satunya penulis katalog selain tombol
  tolak di Studio (tab **Musik**), yang memakai modul yang sama.
- Unduhan dikurasi satu per satu, bukan crawler. Situs yang menolak unduhan otomatis
  (Pixabay menjawab 403) → Dena mengunduh manual lalu `music add <file>`.

## Consequences

- `shared/` gitignored: musik dan katalog hanya ada di mesin Dena; clone baru mulai kosong.
- Ducking/level BGM di bawah narasi dan BPM diputuskan di sub-proyek 2 dan 4.

## Referensi

- Spec: `docs/superpowers/specs/2026-09-29-audio-foundation-design.md`
- Kriteria: [RD-06-18…RD-06-22](../requirements/rd-06-audio.md), RD-05-20
- Kode: `scripts/music.mjs`, `scripts/lib/music.mjs`, `scripts/studio/music.mjs`
