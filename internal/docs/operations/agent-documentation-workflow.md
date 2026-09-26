# Agent Documentation Workflow
Status: operating standard
Date: 2026-07-20

Kanonik untuk: cara agent AI (dan manusia) memakai dokumentasi sebagai Source of
Truth saat bekerja di repo ini.

## Start here

1. Baca `AGENTS.md`.
2. Baca [internal/docs/README.md](../README.md) (index + registry).
3. Baca **hanya** doc yang relevan dengan task. Jangan implement dari ingatan bila
   doc-nya ada.

## Dua jalur kerja

Repo punya dua konteks; kenali task-nya lebih dulu:

- **Produksi video Dena** → mulai dari
  `docs/skills/dena-video-editing-workflow/SKILL.md` (router) lalu dokumen fase yang
  relevan (`docs/agents/`). Kanon internal:
  [operations/video-editing-workflow](video-editing-workflow.md),
  [rd-03](../requirements/rd-03-video-editing-workflow.md).
- **Perubahan kode/publish/komposisi** → ikuti
  [implementation-standard](implementation-standard.md) dan doc pemilik area.

## Documentation-First Rule

- Sebelum task: kenali doc pemilik area (README → Canonical Files).
- Perubahan perilaku → tulis/ubah EARS dulu.
- Keputusan arsitektural → ADR baru.
- Doc baru wajib ter-link dari README index.
- Update doc tersentuh **dalam commit yang sama**; bila murni mekanis, nyatakan
  eksplisit "no docs update needed".

## Stop hook

`.claude/settings.json` mendaftarkan Stop hook
`.claude/hooks/ensure-docs-updated.py`. Hook memblok penyelesaian bila ada file
implementasi ter-stage tanpa file docs ter-stage.

- `IMPLEMENTATION_PREFIXES`: `scripts/`, `index.html`, `compositions/`,
  `docs/agents/` (folder implementasi/kontrak nyata repo ini).
- `DOC_PREFIXES`: `internal/docs/`, `AGENTS.md`, `CLAUDE.md`.

Bila diblok: perbarui doc yang tersentuh + link di index, atau nyatakan
eksplisit "no docs update needed" (untuk perubahan murni mekanis).

## Laporan akhir

Setiap task selesai, sebut docs yang berubah dan artifact yang dihasilkan
(`videos/<slug>/*` untuk produksi video).
