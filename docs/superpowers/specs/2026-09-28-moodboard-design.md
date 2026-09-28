# Moodboard per Gaya (Style Enrichment, Sub-proyek 3) — Design

Status: approved (brainstorming 2026-09-28), belum diimplementasi
Date: 2026-09-28
Branch: `feat/moodboard`
Sub-proyek: 3 dari rangkaian "Style Enrichment" (1 pustaka aset — selesai,
ADR-0016; 2 pola + contoh — selesai, ADR-0017; **3 moodboard**).

## Latar belakang

Setiap dokumen gaya punya 11–14 referensi teks (`### R…`: sumber, yang dicuri,
catatan 9:16), tetapi tidak ada gambarnya. Agen di Screen Plan memilih arah visual
hanya dari teks. Keputusan awal (spec pustaka aset): still karya berhak cipta
tidak di-commit; disimpan lokal di folder yang di-gitignore bersama sumbernya,
atau dibuat sebagai "studi" buatan sendiri.

## Keputusan yang sudah diambil

- Bentuk: **studi buatan sendiri (di-commit) + still asli lokal (gitignored)**.
- **6 studi per gaya** (42), masing-masing satu frame 9:16 penuh.
- Pendekatan A: satu komposisi per studi; skrip merender dan menyusun satu sheet
  2×3 per gaya.
- Studi meniru **teknik**, bukan karya: tanpa logo, judul, karakter, atau tata
  letak yang disalin; kata bertema Dena; setiap tile berlabel "studi".

## Tujuan

- `docs/agents/references/moodboard/` dengan manifest, 42 studi, dan 7 sheet.
- `npm run moodboard -- build | sheets | fetch [gaya]`.
- Screen Plan melihat moodboard gaya sebelum menulis Style B-roll Brief.
- Still asli hanya pernah ada di `moodboard/local/` (gitignored).

## Non-tujuan

- Menyimpan atau mendistribusikan still karya pihak lain di git.
- Studi untuk semua ±90 referensi (hanya 6 per gaya).
- Mengubah pola, contoh, atau pustaka aset.

## Struktur

```
docs/agents/references/moodboard/
  moodboard.json                 # SUMBER: studies[] + refs[]
  studies/
    compositions/<id>.html       # 42 studi (id: tx-s1 … px-s6)
    index.html, snapshots.json   # DIHASILKAN (hostHtml yang sama dengan host contoh)
    hyperframes.json
  sheets/<gaya>.webp             # DIHASILKAN, di-commit (2×3 + label)
  local/                         # GITIGNORED: still asli + <gaya>.webp lokal
```

Prefiks id studi sama dengan prefiks contoh (`tx`, `mg`, `wb`, `sm`, `vx`, `mm`,
`px`) diikuti `-s1…-s6`.

## Manifest `moodboard.json`

```json
{
  "studies": [
    { "id": "tx-s1", "style": "broll-text", "ref": "R1", "title": "Saul Bass, North by Northwest — kata di kisi kolom",
      "steal": "words rise and fall in grid columns", "duration": 3, "at": 2.0 }
  ],
  "refs": [
    { "style": "broll-text", "ref": "R1", "source": "https://…", "image": "https://…" }
  ]
}
```

- `ref` harus ada sebagai heading `### R<n>` di dokumen gaya.
- `duration` dan `at`: studi boleh bergerak singkat; still diambil di `at`.
- `refs` memuat sumber setiap referensi yang punya studi (42); `image` opsional
  (URL gambar untuk dilihat pribadi). Tanpa `image`, fetch mengambil `og:image`
  dari `source`.

## CLI (`scripts/moodboard.mjs`, lib `scripts/lib/moodboard.mjs`)

- `build`: dari manifest, tulis `studies/index.html` + `snapshots.json` dengan
  `hostHtml`/`snapshots` dari `scripts/lib/style-examples.mjs` (treatment
  `cutaway`, `stills: [at]`), gaya berurutan. `check` gagal bila basi.
- `sheets [gaya]`: render host studi (lint, validate, snapshot — seperti
  `check-broll-examples`), lalu per gaya buat halaman sheet 1080×1920 (6 tile 2×3,
  label "R1 · Saul Bass, North by Northwest — …", satu baris `steal`, tanda
  "studi, bukan karya asli"), render, dan simpan `sheets/<gaya>.webp` (cwebp).
- `fetch [gaya]`: untuk setiap `refs` gaya itu, unduh `image` atau `og:image`
  ke `local/<gaya>/<ref>.<ext>`, lalu susun `local/<gaya>.webp`. Kegagalan
  jaringan atau HTTP dilewati dengan pesan; tidak pernah menulis di luar `local/`.
  Hanya berjalan bila dipanggil; tidak ada test yang memakai jaringan.

## Isi (6 studi per gaya)

| Gaya | Studi |
| --- | --- |
| broll-text | R1 NbNW (kata naik di kisi kolom), R2 Psycho (bilah memotong kata), R4 Se7en (tipografi goresan/fotokopi bergetar), R6 Catch Me (bentuk datar + teks kecil jenaka), R7 Stranger Things (serif merah bercahaya di gelap), R10 Takahashi (satu kata raksasa) |
| motion-graphic | R1 Kurzgesagt (ikon datar cerah, bayangan panjang), R2 Isotype (pictogram berulang), R3 Rosling (gelembung dua sumbu), R5 Economist (grafik garis + aksen merah), R10 bar race, R12 Giant Ant (bentuk geometris lembut) |
| whiteboard | R1 RSA (papan penuh sketsa + tulisan), R2 UPS (gambar berubah jadi gambar lain), R3 Common Craft (potongan kertas di papan), R5 Napkin (kerangka 6 pertanyaan), R6 sketchnote (judul, ikon, panah), R8 xkcd (grafik goyang + stick figure) |
| stop-motion | R1 Reiniger (siluet hitam di cahaya), R2 Gilliam (kolase foto potong), R3 South Park (kertas konstruksi polos), R4 Norstein (lapisan kabut kertas), R8 Lenica (grafis linocut kontras), R9 Charlie and Lola (tekstur kain + krayon) |
| vox | R1 kertas bertekstur + stabilo, R5 diagram ilmiah di kertas, R7 peta desaturasi + pin, R9 Ken Burns di foto arsip, R10 papan bukti + tali, R11 kliping bertumpuk berlabel |
| mix-media | R1 Höch (fotomontase), R2 Hamilton (kolase pop interior), R3 zine (fotokopi + staples), R5 Spider-Punk (kolase punk kasar), R6 Katie Vision (coretan di atas footage), R9 Spotify Wrapped (bentuk warna berani + tipografi besar) |
| parallax | R1 Reiniger (siluet berlapis), R2 multiplane (4 lapis kaca), R4 Norstein (kabut antar lapisan), R5 Kid Stays in the Picture (foto dipotong dan dipisah), R11 Spider-Verse (kedalaman halftone, offset cetak), R12 Vertigo (dolly-zoom, satu frame di tengah gerak) |

Aturan studi: satu `SK.clip` (studi adalah komposisi seperti contoh), fungsi
murni waktu, aturan lint contoh (tanpa `visibility`, `font-family` di clip,
`../`, selector template-literal, `!important`); hanya aset pustaka, paper-pack,
aset contoh bersama, dan foto public domain yang sudah tercatat; tanpa logo,
judul, karakter, atau komposisi karya asli; kata bertema Dena (UMKM, AI, uang).

## Workflow

- `docs/agents/02-screen-plan.md`, langkah visual: setelah memilih gaya, lihat
  `moodboard/sheets/<gaya>.webp` (dan `moodboard/local/<gaya>.webp` bila ada)
  sebelum menulis Style B-roll Brief; brief boleh menyebut `Moodboard: <id>`.
- Dokumen gaya: setiap `### R<n>` yang punya studi memuat baris
  `- Study: moodboard <id>`; bagian `## Kit` menautkan sheet moodboard.

## Pengujian (`scripts/moodboard.test.mjs`, masuk `test:style-kit`)

- Manifest: 6 studi per gaya, id unik dan berprefiks gaya, `ref` ada sebagai
  heading di dokumen gaya, setiap studi punya komposisi dan setiap komposisi
  terdaftar; `refs` mencakup ke-42 ref studi dan semua `source` berupa URL https.
- Host studi sama dengan hasil generator.
- Sheets: tujuh `sheets/<gaya>.webp` ada, ter-track, ≤ 400 KB; halaman sheet
  (hasil generator, murni) cocok dengan manifest.
- Hak cipta: `docs/agents/references/moodboard/local/` ada di `.gitignore`,
  tidak ada file ter-track di bawahnya, tidak ada komposisi yang merujuk `local/`.
- Fetch: unit test dengan `fetch` palsu — `og:image` diambil dari HTML, `image`
  dipakai bila ada, kegagalan dilewati, path tulis selalu di bawah `local/`.
- Dokumen gaya: setiap ref studi punya `- Study: moodboard <id>`; Kit menautkan
  sheet.
- Visual: setiap studi dilihat; yang generik atau terlalu mirip karya asli
  diperbaiki.

## Dokumen

- `docs/agents/02-screen-plan.md`, tujuh dokumen gaya, `styles/README.md`.
- `AGENTS.md`, `CLAUDE.md`, `internal/docs/operations/runbook.md`: perintah
  `moodboard`.
- `internal/docs/requirements/rd-03-video-editing-workflow.md`: RD-03-58 (Screen
  Plan melihat moodboard gaya sebelum brief) dan RD-03-59 (still karya pihak lain
  hanya di `moodboard/local/`, tidak pernah ter-track).
- `internal/docs/adr/0018-moodboard-studies.md` + indeks.
- `.gitignore`: `docs/agents/references/moodboard/local/`.

## Urutan kerja

1. Manifest, lib + CLI `build`/`check`, test manifest/host/gitignore, ADR-0018,
   RD-03-59.
2. Pipeline `sheets` (render + halaman sheet + webp), diuji dengan studi
   pertama gaya broll-text.
3–9. Studi per gaya (satu task per gaya: 6 studi + sheet).
10. `fetch` + unit test.
11. Workflow (Screen Plan, dokumen gaya, README, perintah), RD-03-58, verifikasi
    penuh.

Dibangun dan diuji dulu di salinan scratch; plan dihasilkan dari operasi yang
sama, di-replay di clone bersih, lalu dieksekusi di repo.

## Definisi selesai

- 42 studi dan 7 sheet ter-commit dan sudah dilihat; `fetch` berfungsi dan
  hanya menulis ke `local/`.
- Semua suite hijau; dokumen, ADR, dan EARS di commit yang sama dengan kodenya.
- Merge ke main lokal hanya setelah Dena setuju.

## Risiko

- **Studi terlalu mirip karya asli**: hanya teknik; review khusus untuk ini.
- **Studi generik**: studi yang tidak jelas menunjukkan tekniknya diulang.
- **Situs memblokir fetch**: opsional, dilewati dengan pesan.
- **Ukuran**: ±7 × 300 KB.
