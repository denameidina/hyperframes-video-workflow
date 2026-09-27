# Pola + Contoh Whiteboard dan Stop-motion (Style Enrichment, Sub-proyek 2b) — Design

Status: implemented 2026-09-28 (plan `docs/superpowers/plans/2026-09-28-pattern-examples-2b.md`)
Date: 2026-09-28
Branch: `feat/examples-2b`
Sub-proyek: 2 dari rangkaian "Style Enrichment", putaran kedua dari tiga
(2a broll-text + motion-graphic + fondasi host — selesai; **2b whiteboard +
stop-motion**; 2c VOX + mix-media + parallax). Dibangun di atas host per gaya
(`docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md`, ADR-0017)
dan pustaka aset (ADR-0016).

## Latar belakang

Setelah 2a, whiteboard punya 14 pola dengan 8 yang sudah punya contoh, dan
stop-motion punya 14 pola dengan 9 yang sudah punya contoh. Dena memilih
menambah **6 pola baru per gaya** (jadi 20, sama dengan broll-text dan
motion-graphic) dan memberi contoh untuk setiap pola.

## Keputusan yang sudah diambil

- 6 pola baru per gaya (daftar di bawah, disetujui Dena).
- 12 contoh baru, 6 per gaya, masing-masing memuat satu atau dua pola.
- Satu aset pustaka baru: `paper.scissors` (Codex). Tokoh kertas dibuat dari
  potongan kertas di clip, bukan bitmap.
- Satu helper baru: `SK.sagPath`.
- Tanpa ADR atau EARS baru: host per gaya sudah diputuskan di ADR-0017, dan
  RD-03-56 berlaku untuk setiap gaya di `COVERED`.

## Tujuan

- whiteboard 20/20 dan stop-motion 20/20 pola punya contoh yang bisa dirender.
- `COVERED` = broll-text, motion-graphic, whiteboard, stop-motion.
- Still lama kedua host tetap identik (toleransi 2a).

## Non-tujuan

- Pola atau contoh untuk VOX, mix-media, parallax (2c).
- Mengubah contoh lama atau host generator.
- Push ke remote.

## Pola baru

Kolom mengikuti tabel Patterns yang ada; baris di dokumen gaya ditulis dalam
bahasa Inggris.

### whiteboard (+6 → 20)

| Pola | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **matrix-2x2** | Dua sumbu tergambar dengan label, item ditulis ke kuadrannya | Prioritas, "penting vs mendesak", memilih tools | Sumbu tergambar sebelum kata pertama; tiap item muncul di namanya | goresan spidol per item | Lebih dari 6 item; kuadran tanpa label sumbu | `SK.line` + `SK.write` + `SK.drawSeq` |
| **timeline-sketch** | Garis tangan dengan tanda tahap; label tahap ditulis satu per satu | "Bulan pertama… bulan ketiga…" | Tanda dan label muncul di kata tahapnya | tik spidol per tahap | Jarak tahap tidak konsisten; tahap yang tidak disebut | `SK.line` + `SK.write` |
| **split-compare** | Papan dibelah garis vertikal; "dulu" digambar kiri, "sekarang" kanan | Perbandingan sebelum/sesudah | Garis pembelah dulu; sisi kanan mulai di "sekarang"/"tapi" | sapuan spidol | Dua sisi dengan skala berbeda; lebih dari satu ide per sisi | `SK.line` + `SK.drawSeq` per sisi |
| **highlight-marker** | Sapuan stabilo transparan di atas kata tulisan tangan yang sudah ada | Menandai satu istilah di catatan | Sapuan 0,3–0,5 s mulai di kata | desis stabilo | Menstabilo satu baris penuh; lebih dari dua sapuan | `SK.highlight` + `hand.hold-highlighter` via `SK.placeHand` |
| **arrow-callout** | Panah melengkung dari catatan ke satu bagian gambar | "Nah, yang bikin bocor di sini" | Panah tergambar di kata tunjuk; catatan ditulis sesudahnya | sapuan cepat | Panah lurus kaku; menunjuk ke area kosong | `SK.arcPath` + `SK.draw` + `SK.write` |
| **table-sketch** | Tabel 2–3 kolom tangan; sel terisi ✓/✗ satu per satu | Membandingkan opsi/fitur | Garis tabel dulu; tiap ✓/✗ di kata fiturnya | tik per sel | Lebih dari 4 baris; nilai yang tidak diucapkan | `SK.line` + `SK.write` + `mark.red-check`/`mark.red-cross` |

### stop-motion (+6 → 20)

| Pola | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **string-connect** | Benang merah ditarik antar kartu yang dipin (papan detektif) | Menghubungkan sebab-sebab | Setiap benang tertarik di kata penghubung, 3–6 langkah | petikan benang | Benang lurus kaku; lebih dari 4 benang | `SK.sagPath` + `SK.draw` di `SK.onTwos` + `.sk-pin` |
| **receipt-print** | Struk keluar dari printer kasir (di bawah) ke atas, baris demi baris | Penjualan, transaksi UMKM | Satu baris per item yang disebut; total di kata "total" | derit printer per baris | Nominal yang tidak diucapkan; struk mulus tanpa langkah | `paper.receipt-blank` + `SK.onTwos` + teks `.sk-mono` |
| **flip-book** | Pojok buku tulis membalik 3–5 halaman, gambarnya berubah | Perubahan bertahap dari waktu ke waktu | Satu halaman per tahap, 2–3 langkah per balikan | kibas kertas | Lebih dari 5 halaman; gambar tanpa perubahan jelas | `paper.notebook-strip` + `SK.cycle` + scaleY bertahap |
| **cutout-walk** | Tokoh kertas berjalan melintas, pose kaki berganti tiap langkah | Perjalanan pelanggan, "si owner datang ke…" | Berjalan sepanjang frasa; berhenti di tujuan | tap kertas per langkah | Meluncur tanpa pose kaki; berjalan lebih dari 2 s | Potongan kertas di clip + `SK.cycle` + `SK.onTwos` + `SK.piece` |
| **cut-along** | Gunting memotong garis putus-putus; potongan terlepas dan jatuh | Memangkas biaya/langkah | Gunting jalan sepanjang kata kerja; potongan jatuh di akhir kata | snip gunting | Memotong tanpa garis putus-putus; gunting mulus tanpa langkah | `paper.scissors` + `SK.onTwos` + `SK.piece` |
| **envelope-open** | Tutup amplop terbuka, kartu naik keluar | Pesan, notifikasi, "ada order masuk" | Tutup terbuka di kata pengantar; kartu naik di kata isinya | kertas bergeser | Kartu kosong; amplop terbuka tanpa isi yang diucapkan | `paper.envelope` dua kali: badan tanpa segitiga tutup, tutup (gambar yang sama di-clip ke segitiga) `scaleY` 1 → −1 on twos; kartu di antaranya, terpotong di tepi kantong |

## Helper engine

| API | Tempat | Perilaku |
| --- | --- | --- |
| `SK.sagPath(p0, p1, sag = 0.12)` | style-kit | Path `M p0 Q c p1` (angka 1 desimal). Bagian tengah lengkungan melorot `sag × jarak` ke arah **bawah layar** (y bertambah), apa pun arah p0 → p1, sehingga titik kontrolnya turun dua kali itu; `sag = 0` = garis lurus. Beda dengan `SK.arcPath`, yang membengkok tegak lurus arah jalan. |

## Aset baru

- `paper.scissors`: gunting potongan kertas/foto (bukan ikon garis), PNG
  ber-alpha, dari Codex (`codex-image`), satu job di background, direview
  lalu diproses dengan `npm run asset-lib -- process` (crop alpha, ≤ 720 px).
  Masuk `vendor/asset-lib/src/items.json` (styles: stop-motion, mix-media;
  tags: benda, kerja), `LICENSES.md` lewat build, dan sheet `paper-*`. Tanpa
  merek, teks, atau logo. Bila tiga percobaan gagal review, gunting dibuat
  sebagai vektor potongan kertas di clip dan aset ini dibatalkan.
- Tokoh kertas (cutout-walk, hinge-limb): kepala, badan, lengan, dan kaki
  sebagai div bertekstur kertas (`.sk-paper-*`/`.sk-kraft`) dengan
  `transform-origin` di titik engsel dan `.sk-pin` di sendi. Tidak ada bitmap.

## Contoh baru (12)

| Clip | Pola | Treatment | Pustaka |
| --- | --- | --- | --- |
| `wb-06-matrix-callout` | matrix-2x2 + arrow-callout | cutaway | `SK.arcPath` |
| `wb-07-timeline-pan` | timeline-sketch + pan-across-board | cutaway | papan tinggi, `SK.cam` |
| `wb-08-split-transform` | split-compare + transform-reveal | split | "buku catatan" → "dashboard" |
| `wb-09-equation-highlight` | equation + highlight-marker | panel | `hand.hold-highlighter` |
| `wb-10-table-erase` | table-sketch + erase-redraw | cutaway | `hand.erase`, `mark.red-check`, `mark.red-cross` |
| `wb-11-chart-bubble` | sketch-chart + speech-bubble | split | `doodle.stand`, `doodle.speech-round` |
| `sm-05-string-flip` | string-connect + flip-card | cutaway | `SK.sagPath`, `.sk-pin` |
| `sm-06-receipt-scroll` | receipt-print + paper-scroll | panel | `paper.receipt-blank` |
| `sm-07-flipbook-fold` | flip-book + fold/unfold | cutaway | `paper.notebook-strip` |
| `sm-08-walk-hinge` | cutout-walk + hinge-limb | cutaway | tokoh kertas di clip |
| `sm-09-cut-along` | cut-along | split | `paper.scissors` |
| `sm-10-envelope-depth` | envelope-open + multiplane-depth | cutaway | `paper.envelope` |

Contoh baru ditambahkan di akhir `examples.json` gaya masing-masing, sehingga
waktu mulai clip lama tidak berubah. Aturan setiap contoh sama dengan 2a:
komentar "Example only", satu `SK.clip`, fungsi murni waktu, tanpa
`visibility`, tanpa `font-family` di `<style>` clip, tanpa `../` di url, tanpa
selector template-literal; minimal dua still pada kata kunci; stop-motion
bergerak on twos (`SK.STOP_FPS`); SFX tidak dirender (dicatat di baris pola).

## Pengujian

- `scripts/style-docs.test.mjs`: `COVERED` bertambah `whiteboard.md` dan
  `stop-motion.md`.
- `scripts/style-kit.test.mjs`: `SK.sagPath` — titik kontrol di bawah titik
  tengah untuk arah kiri→kanan dan kanan→kiri, `sag = 0` lurus, deterministik.
- `scripts/asset-lib.test.mjs`: tanpa test baru; test katalog, lisensi, alpha,
  anggaran, dan sheets mencakup `paper.scissors`.
- `scripts/style-examples.test.mjs`: tanpa perubahan; host yang dihasilkan
  ulang harus sama dengan disk.
- Render: `npm run check:style-examples -- whiteboard` dan `-- stop-motion`
  0 error; setiap still baru dilihat dan diperbaiki sebelum commit.
- Still lama: 11 still whiteboard dan 8 still stop-motion identik dengan
  baseline dari `main` (toleransi 2a: selisih ≤ 1 per kanal pada ≤ 0,001%
  nilai). Hasil pembangunan di salinan scratch: 19 dari 19 identik byte.

## Dokumen

- `whiteboard.md`, `stop-motion.md`: 6 baris pola baru; baris SFX dan Build
  Recipe bila relevan; baris tabel Examples; rentang contoh di kepala dokumen
  (`wb-01` … `wb-11`, `sm-01` … `sm-10`).
- `stop-motion.md` `## Kit`: `paper.scissors`, `paper.envelope`,
  `paper.receipt-blank`, `paper.notebook-strip`.
- `vendor/asset-lib/` hasil build + sheets (katalog, LICENSES, CATALOG).
- Tanpa ADR/EARS baru (ADR-0017, RD-03-56 berlaku); `internal/docs` hanya
  berubah bila ada perintah atau keputusan baru.

## Urutan kerja

1. `SK.sagPath` (test dulu).
2. `paper.scissors` lewat Codex, review, process, `items.json`, build, sheets.
3. Enam contoh whiteboard + manifest + dokumen.
4. Enam contoh stop-motion + manifest + dokumen.
5. Test cakupan, still lama identik, verifikasi penuh.

Semua kode dibangun dan diuji dulu di salinan scratch; plan dihasilkan dari
operasi yang sama, di-replay di clone bersih, lalu dieksekusi di repo.

## Definisi selesai

- whiteboard 20/20 dan stop-motion 20/20 tercakup; 12 contoh baru lolos
  lint/validate dan sudah dilihat.
- Still lama identik (dalam toleransi); semua suite hijau.
- Dokumen di commit yang sama dengan kodenya.
- Merge ke main lokal hanya setelah Dena setuju.

## Risiko

- **Contoh generik/slop**: kata contoh bertema Dena (UMKM, AI, uang); review
  still per contoh; anti-slop checklist gaya.
- **Gunting Codex gagal atau terlihat palsu**: review, ulangi maksimal tiga kali,
  lalu jatuh ke vektor potongan kertas di clip.
- **Tokoh kertas kaku**: gerak on twos dengan `SK.piece` (jitter kertas) dan
  pose kaki bergantian lewat `SK.cycle`.
