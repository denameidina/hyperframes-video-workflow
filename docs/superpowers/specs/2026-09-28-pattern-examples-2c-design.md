# Pola + Contoh VOX, Mix-media, dan Parallax (Style Enrichment, Sub-proyek 2c) — Design

Status: approved (brainstorming 2026-09-28), belum diimplementasi
Date: 2026-09-28
Branch: `feat/examples-2c`
Sub-proyek: 2 dari rangkaian "Style Enrichment", putaran ketiga dan terakhir
(2a broll-text + motion-graphic + fondasi host — selesai; 2b whiteboard +
stop-motion — selesai; **2c VOX + mix-media + parallax**). Dibangun di atas
host per gaya (ADR-0017) dan pustaka aset (ADR-0016).

## Latar belakang

Setelah 2b, VOX punya 15 pola (7 dengan contoh), mix-media 15 (9 dengan
contoh), parallax 14 (6 dengan contoh). Dena memilih menggenapkan ketiganya
menjadi **20 pola** (VOX +5, mix-media +5, parallax +6) dan mengerjakan ketiga
gaya **dalam satu putaran**. Setelah 2c, ketujuh gaya punya 20 pola dan setiap
pola punya contoh yang bisa dirender.

## Keputusan yang sudah diambil

- 16 pola baru (daftar di bawah, disetujui Dena).
- 20 contoh baru: VOX 7, mix-media 6, parallax 7.
- Tanpa aset Codex baru: scene berlapis, stiker, dan potongan kertas dari
  pustaka, plus aset contoh bersama yang sudah ada (`cut-phone.png`,
  `px-archive-plate.jpg`, `px-archive-subject.png`, `placeholder-cutout.webm`).
- Satu helper baru: `SK.handheld`.
- Test cakupan berlaku untuk semua gaya (`COVERED` diganti `STYLES`).
- RD-03-56 disesuaikan (cakupan penuh); tanpa ADR baru.

## Tujuan

- VOX, mix-media, dan parallax masing-masing 20/20 pola punya contoh.
- Ketujuh gaya tercakup test cakupan.
- Still lama ketiga host tetap identik (toleransi 2a).

## Non-tujuan

- Sub-proyek 3 (moodboard).
- Mengubah contoh lama atau host generator.
- Push ke remote.

## Pola baru

Kolom mengikuti tabel Patterns yang ada; baris di dokumen gaya ditulis dalam
bahasa Inggris.

### VOX (+5 → 20)

| Pola | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **chat-reveal** | Pesan di dokumen chat muncul satu per satu; pesan kunci distabilo | "klien chat gue bilang…" | Satu pesan per kalimat yang dikutip; stabilo di frasa kunci | pop pesan lembut | Pesan yang tidak diucapkan; nama/nomor orang sungguhan | `SK.doc('chat-thread', …)` + `SK.enter` per pesan + `.sk-hl` |
| **cell-zoom** | Kamera masuk ke satu sel spreadsheet; sel dikotak dan angkanya distabilo | Satu angka di laporan | Dorongan bertahap di kata angkanya | dengung rendah | Angka yang tidak diucapkan; zoom ke sel kosong | `SK.doc('spreadsheet', …)` + kamera `scale` bertahap + `SK.rect` |
| **search-query** | Kueri diketik di halaman hasil pencarian; hasil yang relevan digarisbawahi | "coba lo search…" | Mengetik selesai di akhir kueri; garis bawah di hasil yang disebut | ketikan pelan | Merek mesin pencari sungguhan; hasil karangan yang tampak nyata tanpa tag | `SK.doc('search-results', …)` + `SK.typeOn` + garis pena |
| **doc-timeline** | Kliping bertanggal berjajar; kamera melangkah dari tanggal ke tanggal | Kronologi kejadian | Satu langkah kamera per tanggal yang disebut | klik per langkah | Tanggal yang tidak diucapkan; lebih dari 4 kliping | kliping `SK.doc` + label tanggal + kamera `x` via `SK.onTwos` |
| **loupe-zoom** | Lensa pembesar bulat memperbesar satu detail dokumen | "lihat baris kecil ini" | Lensa tiba di kata tunjuk, 0,3–0,5 s | whoosh kecil | Lensa di area yang tidak dibahas; lensa yang bergetar | salinan dokumen `scale` 2× di-clip `circle()` + bingkai lensa |

### mix-media (+5 → 20)

| Pola | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **frame-in-frame** | Dena tampil di dalam layar HP/laptop potongan kertas | "di HP gue…", konteks digital | Bingkai masuk di kata perangkat | ketukan kertas | Bingkai yang menutupi wajah | layer depan (track 7) dengan potongan HP, jendela layar di-clip |
| **ransom-caption** | Frasa dari huruf majalah yang tidak seragam, ditempel | Punchline yang nakal | Huruf menempel satu per satu, selesai di akhir frasa | tepukan kertas | Lebih dari 3 kata; tidak terbaca | span per huruf, font/warna/rotasi dari `SK.rng`, `SK.onTwos` |
| **sticker-bomb** | Stiker pustaka muncul di sekitar Dena per ketukan | Energi tinggi, perayaan | Satu stiker per ketukan/kata, ≤ 6 | pop stiker | Stiker menutupi wajah; stiker sepanjang clip | `.sk-obj-*-sticker` + `'pop'` bertahap |
| **torn-panel-list** | Dena di satu sisi; daftar di kertas sobek di sisi lain | Daftar sambil tetap tampil wajah | Satu butir per kata | gesekan kertas | Lebih dari 4 butir; panel menutupi wajah | panel `SK.torn` + `.sk-hand` per butir |
| **speech-cutout** | Balon bicara kertas dari arah Dena berisi kutipan | Menirukan omongan orang | Balon muncul di "bilang"; teks bersama kata kutipan | pop kertas | Kutipan lebih dari 8 kata; ekor balon tidak ke Dena | balon kertas `SK.torn` + ekor + `SK.enter` |

### parallax (+6 → 20)

| Pola | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **depth-headline** | Kata judul berada di bidang antara lapisan scene (di belakang foreground) | Membuka topik dengan suasana | Judul tampak di kata topik; kamera bergerak pelan | swell rendah | Judul di depan semua lapisan (kehilangan kedalaman) | lapisan teks `SK.layer` di antara mid dan front |
| **card-flythrough** | Kartu di kedalaman berbeda; kamera terbang melewatinya satu per satu | Daftar langkah dengan kedalaman | Satu kartu melewati kamera per langkah | whoosh per kartu | Lebih dari 4 kartu; kartu tak terbaca saat lewat | kartu `SK.layer` di z berbeda + `SK.camera({ z })` |
| **float-objects** | Benda potongan pustaka melayang di kedalaman berbeda, bergoyang pelan | Uang, ide, alat yang "berserakan" | Benda muncul di kata bendanya | denting lembut | Benda yang tidak disebut; gerak cepat | `.sk-obj-*` di `SK.layer` + goyangan sinus |
| **light-sweep** | Cahaya menyapu lapisan dengan kecepatan berbeda | Perubahan suasana, "pagi hari…" | Sapuan 1–2 s mulai di kata waktu | swell cahaya | Kilau yang menutupi subjek | gradien `mix-blend-mode: screen` per lapisan, offset per kedalaman |
| **dust-motes** | Partikel debu ber-seed di lapisan depan | Atmosfer arsip/nostalgia | Konstan, pelan | room tone | Partikel besar dan cepat (terlihat seperti salju) | titik dari `SK.rng` di lapisan depan, geser pelan |
| **handheld-drift** | Kamera bergoyang halus seperti dipegang tangan | Membuat scene statis terasa hidup | Konstan, ≤ 6 px | — | Goyangan besar (terasa gempa) | `SK.handheld(t, seed)` pada `SK.camera` |

## Helper engine

| API | Tempat | Perilaku |
| --- | --- | --- |
| `SK.handheld(t, seed, { amp = 6 })` | style-kit | `{x, y, r}` goyangan mulus dari jumlah tiga gelombang sinus ber-seed (frekuensi 0,2–0,9 Hz); `|x|, |y| ≤ amp`, `|r| ≤ amp × 0,05` derajat; deterministik; berbeda per seed. Beda dengan `SK.boil`, yang melompat per langkah. |

## Contoh baru (20)

| Clip | Pola | Treatment | Pustaka |
| --- | --- | --- | --- |
| `vx-05-chat-redact` | chat-reveal + redact-bar | cutaway | `SK.doc('chat-thread')` |
| `vx-06-cell-underline` | cell-zoom + pen-underline | split | `SK.doc('spreadsheet')` |
| `vx-07-search-arrow` | search-query + arrow-callout | cutaway | `SK.doc('search-results')`, `SK.typeOn` |
| `vx-08-timeline-pinned` | doc-timeline + pinned-source | cutaway | `SK.doc('article')`, `.sk-pin` |
| `vx-09-loupe-before-after` | loupe-zoom + before-after-doc | panel | `SK.doc('report-page')` |
| `vx-10-quote-split` | pull-quote + split-docs | cutaway | `SK.doc('article')`, `SK.doc('email')` |
| `vx-11-archival-pan` | archival-pan | cutaway | `assets/px-archive-plate.jpg`, grain |
| `mm-05-halftone-punch` | halftone-duotone + zoom-punch-cutout | collage (cutout) | `.sk-tex-halftone` |
| `mm-06-frame-grid` | frame-in-frame + grid-backdrop | collage (cutout, front) | `assets/cut-phone.png`, `.sk-grid` |
| `mm-07-scrapbook-scribble` | scrapbook-stack + scribble-emphasis | collage (cutout) | `assets/cap-ken-burns.png`, `mark.red-circle` |
| `mm-08-split-self` | split-self | collage (cutout) | placeholder dua kali |
| `mm-09-sticker-ransom` | sticker-bomb + ransom-caption | collage (cutout, front) | `.sk-obj-*-sticker` |
| `mm-10-panel-speech` | torn-panel-list + speech-cutout | collage (cutout, front) | `SK.torn` |
| `px-05-push-headline` | push-through + depth-headline | parallax-stage | `scene.warung-counter` |
| `px-06-peel-steps` | layer-peel + stepped-multiplane | cutaway | lapisan kertas pustaka |
| `px-07-wipe-fog` | foreground-wipe + multiplane-fog | cutaway | `scene.city-dusk` |
| `px-08-map-flyover` | map-flyover | cutaway | `SK.mapSvg('sea')` |
| `px-09-photo-dust` | photo-2.5d + dust-motes | cutaway | `assets/px-archive-*` |
| `px-10-tilt-light` | tilt-reveal + light-sweep | cutaway | `scene.street-motor` |
| `px-11-cards-float` | card-flythrough + float-objects + handheld-drift | cutaway | `scene.cafe-cowork`, `.sk-obj-*` |

Contoh baru ditambahkan di akhir `examples.json` gaya masing-masing, sehingga
waktu mulai clip lama tidak berubah. Aturan setiap contoh sama dengan 2a/2b:
komentar "Example only", satu `SK.clip`, fungsi murni waktu, tanpa
`visibility`, tanpa `font-family` di `<style>` clip, tanpa `../` di url, tanpa
selector template-literal, tanpa `!important`; minimal dua still pada kata
kunci; SFX tidak dirender. VOX: setiap `SK.doc` bertag "Ilustrasi", tanpa
merek, nama orang, atau nomor sungguhan. Parallax: mengikuti Depth Budget di
`parallax.md`.

Bila linter menolak video placeholder yang sama dua kali (split-self), sisi
"dulu" memakai still PNG dari placeholder itu (aset contoh bersama baru, dicatat
di `THIRD_PARTY_NOTICES.md` seperti placeholder-nya).

## Pengujian

- `scripts/style-docs.test.mjs`: test cakupan berlaku untuk setiap gaya di
  `STYLES` (menggantikan `COVERED`).
- `scripts/style-kit.test.mjs`: `SK.handheld` — deterministik, dalam batas
  `amp`, mulus (selisih antar-frame 1/30 s kecil), berbeda per seed.
- `scripts/style-examples.test.mjs`: tanpa perubahan.
- Render: `npm run check:style-examples -- vox`, `-- mix-media`,
  `-- parallax` 0 error; setiap still baru dilihat dan diperbaiki sebelum commit.
- Still lama: VOX 8, mix-media 8, parallax 9 identik dengan baseline dari
  `main` (toleransi 2a).

## Dokumen

- `vox.md`, `mix-media.md`, `parallax.md`: baris pola baru, SFX, Build Recipe
  bila relevan, baris tabel Examples, rentang contoh di kepala dokumen.
- `internal/docs/requirements/rd-03-video-editing-workflow.md`: RD-03-56 menjadi
  "setiap pola di setiap referensi gaya punya contoh yang bisa dirender".
- Tanpa ADR baru.

## Urutan kerja

1. `SK.handheld` (test dulu).
2. Tujuh contoh VOX + manifest + dokumen.
3. Enam contoh mix-media + manifest + dokumen.
4. Tujuh contoh parallax + manifest + dokumen.
5. Cakupan penuh + RD-03-56 + still lama identik + verifikasi penuh.

Semua kode dibangun dan diuji dulu di salinan scratch; plan dihasilkan dari
operasi yang sama, di-replay di clone bersih, lalu dieksekusi di repo.

## Definisi selesai

- Ketujuh gaya 20/20 tercakup; 20 contoh baru lolos lint/validate dan sudah
  dilihat.
- Still lama identik (dalam toleransi); semua suite hijau.
- Dokumen dan RD-03-56 di commit yang sama dengan kodenya.
- Merge ke main lokal hanya setelah Dena setuju.

## Risiko

- **Parallax berat** (CSS 3D, blur, plate besar): render lambat, tepi plate
  terlihat. Mitigasi: Depth Budget, `fill` di `SK.layer`, still di awal dan
  akhir gerak kamera.
- **Placeholder dipakai dua kali** (split-self): fallback still PNG (di atas).
- **Kejujuran VOX**: tag "Ilustrasi" wajib; arsip hanya foto public domain yang
  sudah tercatat.
- **Contoh generik/slop**: kata contoh bertema Dena; review still per contoh.
