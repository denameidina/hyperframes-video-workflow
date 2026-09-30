# Agent Documentation Workflow
Status: operating standard
Date: 2026-09-30

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
- Update doc tersentuh **dalam commit yang sama**; bila murni mekanis, tulis
  satu baris jawaban akhir agent `no docs update needed: <alasan tidak kosong>`.

## Hook dokumentasi (RD-07)

**Claude:** `.claude/settings.json` mendaftarkan Stop hook
`.claude/hooks/ensure-docs-updated.py`. Hook memblok penyelesaian bila ada file
implementasi ter-stage tanpa file docs ter-stage.

- `IMPLEMENTATION_PREFIXES`: `scripts/`, `index.html`, `compositions/`,
  `docs/agents/` (folder implementasi/kontrak nyata repo ini).
- `DOC_PREFIXES`: `internal/docs/`, `AGENTS.md`, `CLAUDE.md`.

Nama path dibaca dengan separator NUL agar spasi/Unicode tetap utuh.

**Codex:** `.codex/hooks/ensure-learning-docs.py` membaca seluruh status Git
(staged, unstaged, untracked, rename/copy dengan path asal dan tujuan) via
`--porcelain=v1 -z --untracked-files=all`. Implementasi yang dicakup:
`.codex/`, `.claude/skills/`, `compositions/`, `scripts/`, dan file root
`index.html`, `package.json`, `package-lock.json`, `hyperframes.json`, `meta.json`.
`vendor/`, `videos/`, `.git/`, dan `node_modules/` diabaikan. Perubahan dokumen
(`internal/docs/`, `docs/`, AGENTS/CLAUDE, atau suffix `.md/.mdx/.rst`) memenuhi
syarat dokumentasi pada jalur perubahan workflow.

Prompt learning mencatat waktu di `.git/codex-learning-docs-required.json`.
Stop memerlukan mtime dokumen `internal/docs/`, `docs/`, AGENTS/CLAUDE yang
setidaknya waktu prompt tersebut, lalu menghapus state. Syarat learning ini
berlaku sebelum pengecualian mekanis dan tidak dapat dilewati olehnya.

**Pengecualian mekanis:** kedua Stop hook hanya membaca
`last_assistant_message`; satu baris utuh `no docs update needed: <alasan>`
(case-insensitive) mengizinkan perubahan mekanis tanpa docs. Alasan wajib pada
baris yang sama. Frasa di prompt user, bagian kalimat, atau alasan kosong tidak
mengizinkan pengecualian. Perubahan perilaku tetap wajib EARS/docs.

Verifikasi: `npm run test:hooks` memakai Python 3 dan Git di repo sementara;
`npm test` memasukkannya ke suite lengkap dan CI. Kontrak:
[RD-07](../requirements/rd-07-documentation-hooks.md).

## Laporan akhir

Setiap task selesai, sebut docs yang berubah dan artifact yang dihasilkan
(`videos/<slug>/*` untuk produksi video).
