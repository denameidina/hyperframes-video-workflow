# ADR-0018 Moodboard per gaya: studi buatan sendiri, still asli hanya lokal
Status: accepted
Date: 2026-09-28

## Context

Setiap dokumen gaya punya 11–14 referensi teks (`### R…`: sumber, yang dicuri,
catatan 9:16) tanpa gambar, sehingga Screen Plan memilih arah visual hanya dari
teks. Still karya pihak lain (film, iklan, video kanal lain) berhak cipta dan
tidak boleh didistribusikan lewat repo yang akan dirilis open-source.

## Decision

- `docs/agents/references/moodboard/moodboard.json` (sumber) memuat 6 studi per
  gaya (42) dan sumber setiap referensi yang distudi. Setiap `ref` harus ada
  sebagai heading `### R<n>` di dokumen gaya.
- Studi adalah komposisi HyperFrames buatan sendiri
  (`moodboard/studies/compositions/<id>.html`, id `tx-s1` … `px-s6`) yang meniru
  **teknik**, bukan karya: tanpa logo, judul, karakter, atau tata letak yang
  disalin; kata bertema Dena; hanya aset pustaka, paper-pack, aset contoh
  bersama, dan foto domain publik yang sudah tercatat.
- `studies/index.html` + `snapshots.json` dihasilkan oleh
  `npm run moodboard -- build` dengan `hostHtml` yang sama dengan host contoh
  (ADR-0017); test gagal bila basi.
- `npm run moodboard -- sheets [gaya]` merender studi di `at` masing-masing lalu
  menyusun satu sheet 3×2 berlabel per gaya → `moodboard/sheets/<gaya>.webp`
  (di-commit, ≤ 400 KB), dengan tanda "not the original works".
- `npm run moodboard -- fetch [gaya]` mengunduh still asli (`image`, atau
  `og:image` dari `source`) hanya ke `moodboard/local/` yang di-gitignore, untuk
  dilihat pribadi. Kegagalan jaringan dilewati; tidak ada test yang memakai
  jaringan.
- Screen Plan melihat sheet gaya sebelum menulis Style B-roll Brief; brief boleh
  menyebut `Moodboard: <id>`.

## Rationale

- Studi menunjukkan teknik secara visual tanpa mendistribusikan karya pihak
  lain; sheet kecil dan cepat dibaca agen.
- Still asli tetap tersedia untuk Dena secara lokal tanpa risiko ter-commit.

## Consequences

- Menambah atau mengganti studi = komposisi + baris manifest + `build` +
  `sheets`; dokumen gaya memuat `- Study: moodboard <id>` di blok referensinya.
- Test menolak file ter-track di `moodboard/local/` dan komposisi yang
  merujuknya.
- Kemiripan dengan karya asli adalah risiko review: setiap studi dilihat.

## Sources

- Spec: `docs/superpowers/specs/2026-09-28-moodboard-design.md`
- Plan: `docs/superpowers/plans/2026-09-28-moodboard.md`
- [ADR-0016](0016-shared-asset-library.md), [ADR-0017](0017-per-style-example-hosts.md)
