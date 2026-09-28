# ADR-0017 Host contoh per gaya, dihasilkan dari manifest
Status: accepted
Date: 2026-09-28

## Context

Contoh gaya (ADR-0012..0015) hidup di satu host HyperFrames
(`docs/agents/references/style-examples/index.html`) yang ditulis tangan: 29
clip + 3 layer front, waktu mulai dan tween split dihitung manual, dan satu
`snapshots.json` untuk semuanya. Sub-proyek 2 (Style Enrichment) menargetkan
setiap pola punya contoh — puluhan contoh baru — sehingga host tangan jadi
rawan salah hitung dan satu check harus merender semua gaya.

Spike 2026-09-28 (salinan scratch, HyperFrames 0.7.24): host hasil generator
dengan CSS dan urutan kit yang sama menghasilkan 59 dari 60 still lama identik
byte; satu still (sm-01, lokal 5,7 s) berbeda ±1 pada dua nilai kanal karena
derau float waktu lokal (80,2 − 74,5 vs 6,2 − 0,5).

## Decision

- Satu host per gaya: `style-examples/<gaya>/` berisi `examples.json`
  (sumber), `compositions/`, `hyperframes.json`, dan `index.html` +
  `snapshots.json` yang DIHASILKAN oleh `npm run style-examples -- build`
  (`scripts/lib/style-examples.mjs`). Test gagal bila hasil generator beda dengan disk.
- Tata letak tetap: clip pertama 0,5 s, jeda 0,5 s; split menggeser
  `#base-video` 480 px; cutout (track 6) dan front (track 7) dari flag manifest.
- Tambahan 2c (resep mix-media yang butuh host): `cutouts: [{ x, y, s, at }]`
  menaruh satu atau dua potongan (yang kedua di track 5, karena satu track hanya
  boleh satu klip sekaligus) dan `punch: [[at, skala]]` men-tween potongan
  pertama masuk 2 langkah dan keluar 3 langkah, 0,02 s setelahnya (tween yang
  bersentuhan memicu peringatan linter). Host tanpa field ini tidak berubah.
- Aset contoh bersama tetap di `style-examples/assets/` dan disalin ke proyek
  sementara oleh `scripts/check-broll-examples.mjs`.
- `npm run check:style-examples [-- <gaya>]` merender satu atau ketujuh host.
- Bukti migrasi: identik, atau selisih ≤ 1 per kanal pada ≤ 0,001% nilai.

## Rationale

- Menambah contoh = satu file komposisi + satu baris manifest; tidak ada waktu
  yang dihitung tangan.
- Check per gaya lebih cepat dan kegagalannya jelas milik gaya mana.
- Toleransi ±1 menerima derau float tanpa menyembunyikan perubahan nyata.

## Consequences

- `index.html` dan `snapshots.json` di host tidak boleh diedit tangan.
- Tes cakupan (`COVERED` di `scripts/style-docs.test.mjs`) mewajibkan setiap
  pola punya contoh untuk gaya yang sudah dicakup; 2b dan 2c menambah gaya.
- Selector template-literal di clip ditolak linter; cari region peta lewat
  `querySelectorAll('[data-region]')`.

## Sources

- Spec: `docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md`
- Plan: `docs/superpowers/plans/2026-09-28-pattern-examples-2a.md`
- [ADR-0012](0012-style-broll-style-kit.md), [ADR-0016](0016-shared-asset-library.md)
