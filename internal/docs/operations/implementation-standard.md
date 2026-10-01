# Implementation Standard
Status: operating standard
Date: 2026-09-30

Kanonik untuk: standar cara mengubah kode/komposisi + Definition of Done. Selaras
dengan STANDAR DOCS repo (docs-driven) dan aturan HyperFrames.

## Prinsip

- `internal/docs/` adalah index/kanon teknis. Panduan produksi rinci hidup di
  `docs/agents/`, `docs/skills/`, dan style guide; README/AGENTS/CLAUDE adalah
  entrypoint. Dokumen detail di luar internal tetap diregistrasikan dari index.
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
     + skill HyperFrames; jalankan `npm run video -- check <slug>` (template root:
     `npm run check`).
   - CLI publish `scripts/repliz-publish.mjs` → tambah/ubah test di
     `scripts/repliz-publish.test.mjs`; jalankan `npm run test:repliz`.
5. Perbarui doc tersentuh + link di index; commit bareng kode.
6. Doc baru wajib ter-link dari [README index](../README.md).

## Verifikasi wajib

- Edit `.html` komposisi video → `npm run video -- check <slug>`; template root →
  `npm run check` (lint + validate + inspect); fix semua error.
- Edit `scripts/video.mjs` → `npm run test:video`.
- Edit `scripts/repliz-publish.mjs` → `npm run test:repliz`.
- Edit `scripts/mcp.mjs` / `scripts/mcp/` → `npm run test:mcp`; adapter lintas
  domain → `npm test`. Jangan menguji endpoint cloud live tanpa permintaan user.
- Edit gates/Studio → `npm run test:video` / `npm run test:studio` sesuai area;
  hook Python → `npm run test:hooks`; perubahan lintas area → `npm test`.
- Edit murni docs (`internal/docs/**`, `docs/agents/*.md`, `AGENTS.md`,
  `CLAUDE.md`) tanpa `.html` → tidak perlu `npm run check`.
- Perubahan implementasi murni mekanis yang tidak memerlukan docs → tulis
  `no docs update needed: <alasan tidak kosong>` pada satu baris jawaban akhir agent.

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

Codex memeriksa perubahan staged/unstaged/untracked dan learning melalui hook
lokal; kedua runtime menerima pengecualian mekanis eksplisit di jawaban akhir
agent. Syarat learning Codex tetap wajib. Kontrak dan tes: [RD-07](../requirements/rd-07-documentation-hooks.md),
`npm run test:hooks`; tes lengkap lokal/CI: `npm test`.
