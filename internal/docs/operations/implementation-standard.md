# Implementation Standard
Status: operating standard
Date: 2026-07-20

Kanonik untuk: standar cara mengubah kode/komposisi + Definition of Done. Selaras
dengan STANDAR DOCS repo (docs-driven) dan aturan HyperFrames.

## Prinsip

- Root repo hanya untuk konfigurasi agent + folder implementasi; semua dokumen
  hidup di `internal/docs/`.
- Doc detail = kanonik. `entrypoints/` hanya pintu masuk ringkas. Bila konflik,
  perbaiki doc detail dulu lalu sinkronkan entrypoint.
- Perubahan perilaku ditulis sebagai EARS **sebelum** kode
  ([ears-standard](../requirements/ears-standard.md)).
- Update doc yang tersentuh **dalam commit yang sama** dengan kodenya.

## Alur perubahan

1. Kenali doc pemilik area (lihat [README index](../README.md) → Canonical Files).
2. Perubahan perilaku → tulis/ubah kriteria EARS di `requirements/rd-NN-*.md`.
3. Keputusan arsitektural → ADR baru di `adr/NNNN-*.md`.
4. Implementasi:
   - Komposisi `.html` → ikuti [rd-02](../requirements/rd-02-composition-render.md)
     + skill HyperFrames; jalankan `npm run check`.
   - CLI publish `scripts/*.mjs` → tambah/ubah test di
     `scripts/repliz-publish.test.mjs`; jalankan `npm run test:repliz`.
5. Perbarui doc tersentuh + link di index; commit bareng kode.
6. Doc baru wajib ter-link dari [README index](../README.md).

## Verifikasi wajib

- Edit `.html` komposisi → `npm run check` (lint + validate + inspect), fix semua
  error.
- Edit `scripts/repliz-publish.mjs` → `npm run test:repliz`.
- Edit murni docs (`internal/docs/**`, `docs/agents/*.md`, `AGENTS.md`,
  `CLAUDE.md`) tanpa `.html` → tidak perlu `npm run check`; nyatakan eksplisit
  "no docs update needed" hanya bila perubahan murni mekanis.

## Definition of Done

- Implementasi sesuai docs pemilik area.
- Doc tersentuh terbarui di commit yang sama; doc baru ter-link di index.
- Test jalan (atau diblokir dengan alasan eksplisit).
- Tidak ada path/istilah basi (cek [README → Naming Standard](../README.md)).
- Laporan akhir menyebut docs yang berubah.

## Enforcement

Stop hook `.claude/hooks/ensure-docs-updated.py` memblok bila implementasi
ter-stage (`scripts/`, `index.html`, `compositions/`, `docs/agents/`) tanpa update
`internal/docs/**`/`AGENTS.md`/`CLAUDE.md`. Lihat
[agent-documentation-workflow](agent-documentation-workflow.md).
