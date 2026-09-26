# Roadmap
Status: draft — menunggu input
Date: 2026-07-20

Kanonik untuk: pekerjaan yang direncanakan. Bagian "Dari kode/spec" diturunkan
dari dokumen nyata; bagian "Arah produk" menunggu input manusia (fase Wawancara).

## Dari kode/spec (terdokumentasi)

### Imagegen fix (selesai)
Spec `docs/asset-generation-imagegen-fix-spec.md` (arsip) sudah diterapkan.
Evaluasi image generation untuk setiap peluang visual-support kini tercatat
sebagai `Visual Decision Log` di `visual-plan.md` (fase Screen Plan,
`docs/agents/references/visual-planning.md`), dan QA gagal bila log itu hilang
(`docs/skills/dena-video-editing-workflow/references/quality-gates.md`).

### Validasi workflow 4 fase
Video asli pertama setelah [ADR-0008](../adr/0008-four-phase-workflow.md) menjadi
uji nyata struktur 4 fase. Catat temuan (gate, artifact, referensi yang dibaca)
dan revisi lewat ADR baru bila perlu.

### Validasi motion b-roll
Video asli pertama yang memakai motion b-roll
([ADR-0009](../adr/0009-motion-broll-motion-kit.md)) menguji engine, treatment
split pada footage nyata, dan pass `render:blur` termasuk audio passthrough
(belum teruji karena proyek contoh tanpa audio). Catat temuannya; revisi lewat
ADR baru bila perlu.

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
