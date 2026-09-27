# ADR-0016 Pustaka aset bersama + preset palet/tipografi
Status: accepted
Date: 2026-09-27

## Context

Tujuh gaya (ADR-0012..0015) punya pola dan referensi yang kaya, tetapi bahan
mentahnya tipis: 19 ikon (`M.IC`), 7 tekstur, 2 selotip, 2 tangan, satu peta,
lima font, dan palet yang hanya tertulis sebagai tabel hex. Dena ingin
referensi yang lebih kaya supaya pilihan visual di Screen Plan lebih variatif.
Permintaan dipecah jadi tiga sub-proyek: (1) pustaka aset + preset, (2) pola +
contoh baru, (3) moodboard.

Spike 2026-09-27 (salinan scratch, HyperFrames 0.7.24): `@font-face` di sheet
baru dan class `var(--sk-font-*)` lolos lint; `SK.rough` (sampel
`getPointAtLength` + gelombang sinus berseed) byte-identik di dua render;
memuat pustaka tidak mengubah satu piksel pun dari 60 still contoh; `filter`
pada `.sk-view` mempertahankan 3D. Pengukuran warna rata-rata tekstur menemukan
`.sk-kraft-dark` #a68768 — tiga palet lama bertinta terang di atasnya gagal
kontras.

## Decision

- Satu pustaka `vendor/asset-lib/` (bukan pack per gaya), dikelompokkan per
  jenis dan di-tag per gaya + topik. Sumber tulisan tangan di `src/`; data
  pihak ketiga di-fetch sekali dari versi yang dipin lalu dibekukan; `build`
  menghasilkan `asset-lib.js`, `asset-lib.css`, `catalog.json`, `LICENSES.md`,
  `CATALOG.md`. Test membangun ulang di memori dan gagal bila ada drift.
- Vektor dulu (ikon, pictogram, doodle, tanda, stempel, peta sebagai path);
  bitmap hanya untuk benda fisik (kertas, tangan, scene, tekstur).
- Preset: 8 palet per gaya (4 lama sebagai class + 4 baru), 8 grade parallax,
  23 preset tipografi; peran font di style-kit membaca `--sk-font-*` dengan font
  lama sebagai fallback. Enam pengecualian kontras palet lama dipertahankan
  (tiga disetujui Dena; tiga `.sk-kraft-dark` ditemukan lewat pengukuran dan
  diperlakukan sama) dan dikunci oleh test.
- Contact sheet dirender dengan HyperFrames supaya agen bisa melihat pilihan.
- `paper-pack` tidak dipindah; katalog mendaftarkannya.

## Rationale

- Satu tempat untuk lisensi, anggaran, dan pencarian; tanpa duplikasi antar gaya.
- Build murni + test drift menjaga katalog, lisensi, dan data selalu sinkron.
- Fallback `var()` membuat preset tipografi tidak mengubah contoh lama.

## Consequences

- Menambah aset = ubah `src/` (atau fetch/Codex) lalu `npm run asset-lib -- build`
  dan `sheets`.
- Peta provinsi Natural Earth 5.1.2 berisi 33 provinsi (sebelum pemekaran
  Kalimantan Utara dan Papua) — tidak untuk klaim batas administratif terbaru.
- Sub-proyek 2 (pola + contoh) dan 3 (moodboard) memakai pustaka ini.

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-asset-library-design.md`
- Plan: `docs/superpowers/plans/2026-09-27-asset-library.md`
- [ADR-0007](0007-no-local-npm-deps-pinned-npx.md), [ADR-0012](0012-style-broll-style-kit.md),
  [ADR-0013](0013-paper-pack-bitmap-assets.md), [ADR-0014](0014-vox-mix-media.md),
  [ADR-0015](0015-parallax-css-3d.md)
