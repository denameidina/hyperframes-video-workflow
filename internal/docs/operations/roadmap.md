# Roadmap
Status: draft — menunggu input
Date: 2026-07-20

Kanonik untuk: pekerjaan yang direncanakan. Bagian "Dari kode/spec" diturunkan
dari dokumen nyata; bagian "Arah produk" menunggu input manusia (fase Wawancara).

## Dari kode/spec (terdokumentasi)

### Imagegen fix (Agent 04)
Spec `docs/asset-generation-imagegen-fix-spec.md` merencanakan agar Agent 04
aktif mengevaluasi image generation untuk setiap peluang visual-support (bukan
fallback lemah), tetap menolak AI slop. Patch dokumentasi (4 item):

1. Update `docs/agents/04-asset-generation-agent.md`.
2. Update `docs/skills/dena-video-editing-workflow/references/quality-gates.md`
   (QA gagal bila aset ada tanpa `Imagegen Decision Log`; gagal aset generik/palsu).
3. Update `docs/dena-social-video-style-guide.md` (ganti bahasa longgar dengan
   aturan decision-log).
4. Opsional: mirror satu bullet di `AGENTS.md` + `CLAUDE.md`.

Verifikasi: perubahan docs-only (tanpa `npm run check` kecuali `.html` diubah).

### Rilis open source
`docs/open-source-release-checklist.md` merencanakan langkah rilis publik:
konfirmasi nama repo publik + MIT; pastikan footage/render/transcript/receipt/
`.env` tetap untracked; `npm run test:repliz`; secret scan; review
`THIRD_PARTY_NOTICES.md`. Rekomendasi: pertimbangkan hapus `.claude/skills/**`
(andalkan installer upstream); pastikan `index.html` menunjuk komposisi sampel
publik vs komposisi kerja lokal.

## Arah produk (menunggu input)

Status: draft — menunggu input. Prioritas fitur, target rilis, kanal, dan tujuan
bisnis lintas kuartal belum tercatat di kode. Akan diisi setelah fase Wawancara
(lihat [product/blueprint](../product/blueprint.md),
[business/brd](../business/brd.md)).
