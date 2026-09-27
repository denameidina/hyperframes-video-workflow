# Pustaka Aset Bersama + Preset Palet/Tipografi (Sub-proyek 1 dari "Style Enrichment") — Design

Status: implemented 2026-09-27 (branch `feat/asset-lib`)
Date: 2026-09-27
Branch: `feat/asset-lib`
Dibangun di atas: style-kit (ADR-0012), paper pack (ADR-0013), VOX/mix-media
(ADR-0014), parallax (ADR-0015).

## Latar belakang

Tujuh gaya sudah tersedia. Tiap gaya punya 10–14 pola, 11–14 referensi dunia
nyata, dan 4 contoh. Bahan mentahnya masih tipis:

- `vendor/paper-pack/`: 7 tekstur, 2 selotip, 2 tangan, pin, klip, sticky, dan
  satu peta Indonesia (~0,9 MB).
- `vendor/motion-kit/`: 19 ikon (`M.IC`).
- `vendor/style-kit/`: 3 font (Anton, Caveat, Newsreader), ditambah Geist dan
  Geist Mono dari motion-kit.
- Palet hanya ditulis sebagai tabel hex di dokumen gaya (4 per gaya).

Dena ingin referensi yang kaya, supaya pilihan visual di Screen Plan lebih
variatif dan hasil videonya lebih baik. Permintaan ini dipecah jadi tiga
sub-proyek, dengan urutan yang disetujui Dena:

1. **Pustaka file aset + preset palet/tipografi per gaya** (spec ini).
2. Pola + contoh baru yang memakai pustaka ini.
3. Moodboard per gaya. Still karya berhak cipta tidak di-commit: disimpan lokal
   di folder yang di-gitignore bersama sumbernya, atau dibuat sebagai "study"
   buatan sendiri.

## Bukti kelayakan (spike, 2026-09-27)

Salinan scratch repo, HyperFrames 0.7.24, `check-broll-examples` (lint, validate,
snapshot):

- **(a) Font dari sheet baru**: `@font-face` di `vendor/asset-lib/asset-lib.css`,
  `.sk-f-bebas-neue`, dan `.sk-type-text-editorial` (variabel
  `--sk-font-display`/`--sk-font-body` yang dibaca `.sk-display`/`.sk-sans` di
  `style-kit.css`) lolos lint dengan 0 error. Bebas Neue dan Instrument Serif
  ter-render.
- **(b) `SK.rough`**: dua render berturut-turut menghasilkan frame yang
  byte-identik. Setelan yang tampak seperti spidol (bukan gemetar): `amp` 0.3,
  `step` 1 (satuan grid ikon), dua gelombang sinus berfrekuensi 0.12–0.22 dan
  0.45–0.70 rad/satuan, dengan overshoot kecil di ujung.
- **(c) Starter + contoh**: host contoh memuat `asset-lib.css`/`.js`, dan
  `.sk-display`/`.sk-sans` diganti menjadi `var(--sk-font-*, <font lama>)`.
  Ke-60 still lama (34 komposisi) byte-identik dengan baseline di main.
- **(d) Grade parallax**: `filter` pada `.sk-view` mempertahankan skala lapisan
  3D dan blur DOF, dan hanya mengubah warna (dibandingkan dengan still px-01
  pada waktu lokal yang sama).
- Ikon Lucide berisi `<circle>`, `<rect>`, `<line>`, `<polyline>`, `<polygon>`,
  dan `<ellipse>` selain `<path>`, serta perintah relatif dan subpath ganda.
  Build mengubah semuanya menjadi path absolut per subpath (`scripts/lib/svg-path.mjs`),
  jadi `SK.draw`/`SK.rough` hanya menangani satu jenis data.
- Peta Node (port `make_map.py`) untuk world/sea/id-provinces/java berukuran
  62/55/52/19 KB.
- Linter `inspect` memberi peringatan kontras (bukan error) untuk teks clip yang
  sedang tidak tampil di host contoh, karena diukur di atas base video. Ini
  artefak host contoh, bukan cacat palet.

## Keputusan yang sudah diambil

- Pendekatan A: satu pustaka bersama `vendor/asset-lib/`, dikelompokkan per
  jenis aset dan di-tag per gaya. Tidak ada pack per gaya.
- Anggaran: aset baru yang di-commit (termasuk contact sheet) ≤ 25 MB.
- Semua sumber boleh: SVG/CSS buatan sendiri, Codex image gen, pustaka CC0 atau
  berlisensi terbuka (dibekukan lokal).
- Vektor dulu. Bitmap hanya untuk benda fisik yang harus terlihat nyata.
- `vendor/paper-pack/` tidak dipindah. Catalog ikut mendaftarkannya.
- Palet lama (4 per gaya) dipertahankan nilainya, lalu dijadikan class bernama.

## Tujuan

- ~500 aset baru dari 12 jenis, masing-masing punya id, tag gaya, tag topik,
  sumber, dan lisensi di `catalog.json`.
- 56 preset palet/grade (8 per gaya) dan 23 preset tipografi sebagai class CSS.
- Contact sheet per jenis dan per preset, supaya agen bisa *melihat* pilihan;
  ditambah `CATALOG.md` yang bisa di-grep.
- API `SK` baru: `SK.icon`, `SK.pict`, `SK.doodle`, `SK.rough`, `SK.doc`, dan
  `SK.geo` multi-peta.
- Screen Plan dan Build membaca pustaka sebelum membuat aset baru per video.

## Non-tujuan

- Pola animasi dan contoh clip baru (sub-proyek 2).
- Moodboard (sub-proyek 3).
- SFX (sudah ada di skill hyperframes-media).
- Foto orang atau ilustrasi karakter manusia yang detail. Pembawa peran tetap
  stick figure dan cut-out Dena.
- Logo merek atau desain uang kertas asli.
- Mengubah contoh lama. Ke-60 still lama harus identik piksel.
- Push ke remote.

## Struktur

```
vendor/asset-lib/
  asset-lib.js        # BUILD: SK.LIB (data vektor) + runtime; dimuat setelah style-kit.js
  asset-lib.css       # BUILD: @font-face, .sk-pal-*, .sk-type-*, .sk-f-*, .sk-tex-*, .sk-obj-*, .sk-frame-*
  catalog.json        # BUILD: satu entri per aset (termasuk paper-pack)
  LICENSES.md         # BUILD: satu baris per file
  CATALOG.md          # BUILD: tabel per jenis + tautan sheet
  src/                # SUMBER yang ditulis tangan
    runtime.js        #   SK.icon, SK.pict, SK.doodle, SK.rough, SK.doc, SK.mark, SK.geo, SK.asset
    base.css          #   class tekstur prosedural, objek, frame, doc
    presets.json      #   56 palet + 22 tipografi (sumber untuk CSS, test kontras, dokumen)
    bitmaps.json      #   metadata semua bitmap (sumber, lisensi, prompt, anchor, tag)
    icons.json        #   daftar ikon terverifikasi per kategori → tag
    pictograms.json   #   daftar pictogram + tag
    doodles/*.svg  frames/*.svg  marks/*.svg
  icons/lucide.json  pictograms/phosphor.json    # FETCH (dibekukan)
  maps/*.svg  fonts/*.woff2 + lisensi  textures/*.jpg  paper/*.png  hands/*.png  scenes/<nama>/
scripts/lib/svg-path.mjs  scripts/lib/geo-svg.mjs
scripts/asset-lib.mjs            # fetch | build | sheets
scripts/asset-lib.test.mjs       # npm run test:asset-lib
docs/agents/references/asset-catalog/   # proyek HyperFrames untuk contact sheet
  sheets/*.webp
```

`asset-lib.js` dihasilkan oleh `node scripts/asset-lib.mjs build` dari
`icons/*.json`, `pictograms/*.json`, `doodles/*.svg`, `frames/*.svg`, dan
`maps/*.svg`. File hasil build ikut di-commit. Test memastikan hasil build
sama dengan sumbernya.

Mengikuti ADR-0007 (tanpa dependensi npm lokal), `asset-lib.mjs fetch` mengambil
Lucide, Phosphor, dan Natural Earth satu kali lewat HTTPS dari versi yang
dipin. Datanya dibekukan di repo, dan nomor versi serta checksum dicatat di
`LICENSES.md`. Tidak ada paket npm baru.

### Skema `catalog.json`

```json
{
  "id": "icon.coins",
  "kind": "icon | pictogram | doodle | paper | hand | frame | doc | map | texture | scene | font | palette | type",
  "file": "vendor/asset-lib/paper/coin-stack.png",
  "inline": "SK.LIB.icons.coins",
  "styles": ["motion-graphic", "vox", "whiteboard"],
  "tags": ["uang", "bisnis"],
  "source": "lucide-static 1.48.0",
  "license": "ISC",
  "prompt": null,
  "anchor": null,
  "bytes": 0
}
```

- Setiap entri punya `file` atau `inline`, tidak keduanya.
- `anchor` diisi untuk tangan (ujung pena atau jari), selotip (titik tempel),
  dan scene (z tiap layer).
- Tag topik diambil dari kosakata tetap: `ai`, `uang`, `bisnis`, `umkm`,
  `chat`, `kerja`, `waktu`, `orang`, `perangkat`, `keamanan`, `data`, `logistik`,
  `ide`, `status`, `arah`, `tempat`, `hidup`, `media`, `kertas`, `peta`, `benda`. Test
  menolak tag di luar daftar ini.

## Isi per jenis

| Jenis | Isi | Jumlah | Sumber | Perkiraan |
| --- | --- | --- | --- | --- |
| icon | Ikon garis Lucide, daftar di bawah | 266 | lucide-static 1.48.0 (ISC) | ~80 KB |
| pictogram | Ikon isi Phosphor, daftar di bawah | 70 | @phosphor-icons/core 2.1.1, bobot `fill` (MIT) | ~45 KB |
| doodle | Doodle whiteboard buatan tangan, daftar di bawah; plus `SK.rough` untuk ikon mana pun | 50 | project (MIT) | ~60 KB |
| paper | Benda kertas dan cut-out karton | 36 | Codex | ~4 MB |
| hand | Tangan ilustrasi datar, satu gaya dengan `hand-write.png` | 4 | Codex | ~0,4 MB |
| frame | Bingkai, mask sobekan, stempel/badge | 25 | project (SVG/CSS) | ~50 KB |
| doc | Template dokumen VOX (`SK.doc`) + tanda pena | 10 + 8 | project | ~40 KB |
| map | Peta | 4 | Natural Earth (PD) | ~0,6 MB |
| texture | Bitmap CC0 (7 + 1 turunan) dan prosedural | 8 + 6 | ambientCG (CC0) + project | ~2 MB |
| scene | Kit scene parallax berlapis | 5 | Codex | ~3 MB |
| font | Font (subset Latin, fontsource 5.3.0) | 12 (13 file) | Google Fonts via fontsource (OFL/Apache 2.0) | ~0,4 MB |
| sheet | Contact sheet | ~20 | project | ~3 MB |
| **Total** | | | | **~15 MB** (batas 25 MB) |

### icon (Lucide, 266)

Nama sudah diverifikasi terhadap `lucide-static@1.48.0/tags.json` pada
2026-09-27. Id katalog: `icon.<nama>`.

- **ai**: bot brain brain-circuit cpu sparkles wand-sparkles message-square-code workflow network git-branch code terminal database server cloud cloud-upload cloud-download webhook plug zap cog settings sliders-horizontal scan-search scan-text file-code binary braces
- **uang**: banknote coins wallet credit-card receipt piggy-bank hand-coins badge-percent percent trending-up trending-down chart-line chart-column chart-pie chart-bar calculator landmark scale gem circle-dollar-sign tag tags ticket
- **bisnis**: store shopping-cart shopping-bag package package-check truck warehouse factory building building-complex briefcase handshake presentation target trophy award rocket flag megaphone clipboard-list clipboard-check file-text file-spreadsheet files folder folder-open archive stamp signature
- **chat**: message-circle message-square messages-square mail mail-open send inbox phone phone-call bell bell-ring at-sign share-2 reply forward mic video camera image link qr-code
- **orang**: user users user-plus user-check user-x user-round users-round contact baby graduation-cap hand heart-handshake face-slightly-smiling face-slightly-frowning face-neutral face-grinning face-angry thumbs-up thumbs-down crown
- **waktu**: clock alarm-clock timer hourglass calendar calendar-check calendar-clock refresh-cw rotate-ccw repeat
- **perangkat**: laptop monitor smartphone tablet keyboard mouse printer wifi battery-low battery-full hard-drive usb headphones watch tv
- **keamanan**: lock lock-open lock-keyhole-open shield shield-check shield-alert key key-round fingerprint-pattern eye eye-off scan-face
- **status**: check check-check x circle-check circle-x circle-alert triangle-alert info circle-question-mark ban octagon-x loader
- **arah**: arrow-right arrow-left arrow-up arrow-down arrow-up-right arrow-down-right move-right redo undo shuffle split merge corner-down-right chevrons-right refresh-ccw
- **ide**: lightbulb lightbulb-off puzzle compass map map-pin map-pinned navigation route milestone signpost globe earth search zoom-in zoom-out funnel list-checks list-ordered layers layout-dashboard kanban notebook-pen book-open library pencil pen-line eraser highlighter scissors paperclip pin bookmark
- **hidup**: coffee utensils-crossed house bike car bus plane ship train-front motorbike fuel sun moon cloud-rain flame droplet leaf sprout tree-pine mountain
- **media**: play pause circle-play film clapperboard music volume-2
- **lain**: gift star heart sparkle party-popper medal hammer wrench construction bug skull ghost dice-5 box boxes container recycle trash download upload external-link

Satu ikon bisa punya lebih dari satu tag topik. Kategori di atas menjadi tag
pertamanya (`lain` menjadi tag `benda`).
Semua ikon ditandai untuk gaya `motion-graphic`, `vox`, `whiteboard` (lewat
`SK.rough`), `broll-text`, dan `mix-media`.

### pictogram (Phosphor fill, 70)

Nama sudah diverifikasi terhadap `@phosphor-icons/core@2.1.1`. Id:
`pict.<nama>`. Dipakai untuk Isotype (satu ikon diulang, tidak pernah
diperbesar) di `motion-graphic`, `stop-motion` (label karton), dan `vox`.

person users-three user baby student money coins coin bank storefront
shopping-cart package truck house buildings factory laptop device-mobile desktop
robot cpu lightbulb clock calendar chat-circle envelope phone heart star trophy
flag rocket target lock shield-check key globe map-pin car motorcycle airplane
bicycle bus coffee fork-knife tree leaf drop lightning fire sun moon cloud gift
ticket receipt wallet credit-card chart-bar chart-pie file folder briefcase
handshake thumbs-up gear hourglass warning check-circle x-circle

### doodle (50, buatan tangan)

Path stroke monoline di grid 200×200, sudah dalam gaya goresan tangan (overshoot,
ujung tidak menutup rapat), sehingga bisa digambar dengan `SK.draw`. Id:
`doodle.<nama>`.

- **Stick figure (10)**: stand, wave, point, think, shrug, celebrate, sit-laptop, walk, carry-box, facepalm
- **Panah dan konektor (12)**: arrow-curve, arrow-loop, arrow-zigzag, arrow-double, arrow-bounce, arrow-down-curl, connector-elbow, connector-dashed, bracket-curly, bracket-square, cycle-arrows, fork-split
- **Aksen (10)**: burst, star-hand, sparkle-hand, spiral, cloud-thought, lightbulb-hand, heart-hand, exclaim, question, lightning-hand
- **Bubble (6)**: speech-round, speech-rect, speech-shout, thought, whisper, double-bubble
- **Tanda (8)**: circle-loose, circle-double, underline-wave, underline-double, tick-hand, cross-hand, box-hand, strike-scribble
- **Benda sederhana (4)**: laptop-hand, phone-hand, money-hand, chart-hand

Gaya: `whiteboard` (utama), `mix-media` (stiker doodle), dan `broll-text`
(tanda di sekitar kata).

### paper (Codex, 36)

Semuanya satu keluarga visual: foto studio dari atas, cahaya kiri atas, latar
transparan, tanpa teks atau logo. Hasil diproses jadi PNG palette ≤ 720 px sisi
terpanjang. Dipasang sebagai div ber-class `.sk-obj-<nama>` (lihat Build
Contract). Id: `paper.<nama>`.

- **Selotip (6)**: washi-pink, washi-mint, washi-grid, tape-clear, lakban-brown, tape-black
- **Sobekan dan kertas (8)**: scrap-torn-1..4 (putih, krem, kuning, biru muda), notebook-strip, graph-scrap, newspaper-scrap-blank (kolom kosong, tanpa huruf), envelope
- **Benda kecil (8)**: receipt-blank, ticket-stub, postage-stamp-blank, staple, binder-clip, rubber-band, sticky-pink, sticky-blue
- **Stiker kertas (4)**: star-sticker, arrow-sticker, circle-dot-sticker, check-sticker
- **Cut-out karton topik (10)**: coin-stack, banknote-generic (desain generik "Rp" tanpa gambar atau seri, bukan tiruan uang asli), chat-bubble, ai-chip, warung-front, shopping-bag, parcel-box, lightbulb, magnifier, calculator

Tag: `stop-motion`, `mix-media`, `vox`. Cut-out topik juga untuk `parallax`
(lapis depan kolase).

### hand (Codex, 4)

Satu gaya dengan `hand-write.png`: ilustrasi datar, kontur arang seragam.
Jangkar dicatat di katalog. Id: `hand.<nama>`.

hold-card (memegang kartu dari bawah), swipe (jari menggeser ke kiri), erase
(memegang penghapus papan), hold-highlighter (memegang stabilo, ujung kiri
bawah).

Dipasang dengan `SK.placeHand`. `SK.HAND` diperluas dengan pose baru.

### frame (25, SVG/CSS)

Id: `frame.<nama>`.

- **Bingkai (7)**: polaroid, polaroid-tilt, film-strip-3, browser-generic, phone-generic, notebook-page, index-card
- **Mask sobekan (6)**: torn-top, torn-bottom, torn-left, torn-right, torn-all, torn-rough. Preset parameter `SK.torn` (edges, seed, amp, step) yang dipanggil lewat `SK.tornFrame(id, w, h)`, sehingga mask tetap deterministik dan menyesuaikan ukuran.
- **Stempel dan badge (8)**: stamp-ilustrasi, stamp-contoh, stamp-baru, stamp-hemat, badge-circle, badge-ribbon, badge-starburst, label-tag. Hanya stempel bertulisan yang teksnya tetap; badge diisi teks dari transkrip.
- **Garis bawah swash (4)**: swash-1..4 untuk `broll-text`

Contoh CSS: `.sk-frame-polaroid`, `.sk-frame-browser`. Stempel "ILUSTRASI"
dipakai VOX untuk dokumen ilustratif.

### doc (VOX, 10 template + 8 tanda)

`SK.doc(kind, fields)` mengembalikan elemen `.sk-doc` yang sudah terisi.
Template: `article`, `report-page`, `spreadsheet`, `chat-thread`, `email`,
`social-post`, `receipt`, `invoice`, `search-results`, `terminal`.

- `fields` hanya berisi teks dari transkrip atau placeholder baris abu-abu
  (`.sk-doc-line`).
- Tidak ada nama outlet, logo, atau avatar asli. `social-post` dan `chat-thread`
  memakai avatar lingkaran polos dan nama generik ("Klien", "Tim").
- Setiap dokumen hasil `SK.doc` otomatis membawa `.sk-tag` "ILUSTRASI". Tidak ada
  opsi untuk mematikannya. Capture asli tetap lewat jalur capture di `vox.md`.

Tanda pena (id `mark.<nama>`, path SVG): red-circle, red-underline,
red-arrow, red-check, red-cross, red-bracket, red-exclaim, red-question.
Ditambah 3 bentuk stabilo (`.sk-hl` varian `-chisel`, `-marker`, `-block`).

### map (Natural Earth, 4)

| id | Isi | Proyeksi | Sumber |
| --- | --- | --- | --- |
| `map.indonesia` | yang sudah ada (`paper-pack/map-indonesia.svg`) | equirectangular 94..142 / 7.5..-11.5, 50 px/deg | NE 1:50m Admin 0 |
| `map.world` | dunia, negara | equirectangular −180..180 / 84..−60, 6 px/deg | NE 1:110m Admin 0 |
| `map.sea` | Asia Tenggara | equirectangular 90..145 / 25..−12, 36 px/deg | NE 1:50m Admin 0 |
| `map.id-provinces` | provinsi Indonesia | sama dengan `map.indonesia` | NE 1:10m Admin 1 |
| `map.java` | Pulau Jawa + Bali, provinsi | equirectangular 105..116 / −5.5..−9, 180 px/deg | NE 1:10m Admin 1 |

(`map.indonesia` sudah ada, jadi yang baru ada 4.)

- `SK.MAPS` menyimpan `{src, w, h, lon0, lat0, k}` per peta.
- `SK.geo(lat, lon, map = 'indonesia')` tetap kompatibel.
- `SK.CITIES` ditambah ~35 kota: ibukota provinsi dari Natural Earth 10m
  populated places v5.1.2 (`featurecla` "Admin-1 capital", kecuali Sumenep dan
  Tuban yang salah label) + 10 ibu kota Asia Tenggara ("Admin-0 capital").
  Domain publik. Delapan kota lama tetap memakai nilai lamanya supaya contoh
  tidak berubah.
- Natural Earth v5.1.2 admin-1 berisi 33 provinsi (sebelum pemekaran Kalimantan
  Utara dan provinsi Papua). Keterbatasan ini dicatat di `LICENSES.md` dan
  `vox.md`, dan peta provinsi tidak dipakai untuk klaim batas administratif
  terbaru.
- Simplifikasi Douglas–Peucker seperti peta lama. Warnanya pasir/abu
  terdesaturasi, di-set lewat CSS.

### texture (8 bitmap + 6 prosedural)

Bitmap ambientCG (CC0) dari zip `2K-JPG` (peta `Color`): crop tengah 9:16,
1080×1920, JPEG q6–7, ≤ 400 KB. Class `.sk-tex-<nama>`. Kandidat dipilih dari
thumbnail ambientCG pada 2026-09-27.

| nama | aset ambientCG | catatan |
| --- | --- | --- |
| cork | `Cork004` | papan gabus klasik |
| cardboard | `Cardboard004` | karton bergaris, bersih |
| paper-tan | `Paper005` | kertas tan berkerut |
| concrete-light | `Concrete034` | beton terang halus |
| linen | `Fabric036` | linen abu |
| wood-desk | `Wood049` | kayu oak terang |
| plaster | `Plaster002` | dinding plester putih |
| blackboard | turunan `Concrete031` | beton gelap, diberi tint hijau slate (`colorchannelmixer`), dicatat sebagai turunan |

ambientCG tidak punya papan tulis, koran, atau kertas cat air. Karena itu:
papan tulis dibuat sebagai turunan, koran memakai `.sk-newsprint` yang sudah ada,
dan kertas cat air dihapus dari daftar.

Prosedural (0 KB, SVG/CSS di `asset-lib.css`): `.sk-tex-graph` (grid
milimeter), `.sk-tex-dots` (dot grid), `.sk-tex-halftone`, `.sk-tex-riso`
(grain risograph), `.sk-tex-film` (film grain, digerakkan `SK.grain`) — riso dan film berupa tile PNG 256 px yang dibuat ffmpeg dengan seed tetap, karena noise SVG di background data-URI tampil kosong di Chrome HyperFrames,
`.sk-tex-whiteboard` (putih dengan bekas hapusan samar).

`.sk-lined`, `.sk-grid`, dan `.sk-newsprint` di paper-pack tetap ada dan tidak
diubah.

### scene (Codex, 5 kit)

Setiap kit berisi `plate.webp` (latar tanpa subjek) + 2–3 layer PNG/WebP
beralpha + `scene.json` (`{layers: [{file, z, role}], light, provenance}`).
Semua layer dibuat dengan `--size` dan `--fit` yang sama agar tetap
pixel-aligned, seperti temuan sub-proyek parallax. Id: `scene.<nama>`.

warung-counter (kasir warung/UMKM, etalase, toples), cafe-cowork (meja kafe,
laptop, cangkir, jendela), city-dusk (skyline kota generik senja, tanpa
landmark nyata), server-room (lorong rak server, kabel), street-motor (jalan
kota dengan motor parkir, tanpa plat terbaca).

Aturan: tanpa orang, tanpa teks terbaca, dan tanpa merek. Label provenance:
`codex (reconstructed scene, bukan foto asli)`.

### font (12)

| id | Font | Lisensi | Peran |
| --- | --- | --- | --- |
| `font.bebas-neue` | Bebas Neue | OFL | display tegak sempit |
| `font.archivo-black` | Archivo Black | OFL | display tebal brutal |
| `font.bricolage` | Bricolage Grotesque (variable) | OFL | headline ekspresif |
| `font.space-grotesk` | Space Grotesk (variable) | OFL | sans teknis |
| `font.plus-jakarta` | Plus Jakarta Sans (variable) | OFL | sans; desainer Indonesia (Tokotype) |
| `font.instrument-serif` | Instrument Serif | OFL | serif editorial |
| `font.dm-serif-display` | DM Serif Display | OFL | serif display |
| `font.jetbrains-mono` | JetBrains Mono (variable) | OFL | mono / terminal |
| `font.permanent-marker` | Permanent Marker | Apache 2.0 | spidol |
| `font.kalam` | Kalam | OFL | tulisan tangan |
| `font.patrick-hand` | Patrick Hand | OFL | tulisan tangan rapi |
| `font.special-elite` | Special Elite | Apache 2.0 | mesin ketik |

- Subset: Latin (file `*-latin-*.woff2` dari fontsource 5.3.0, sama seperti Anton dan Caveat).
- File lisensi (`OFL-*.txt` atau `LICENSE-*.txt`) ikut di `fonts/`.
- Lisensi sudah diverifikasi dari `package.json` fontsource 5.3.0 (2026-09-27):
  Permanent Marker dan Special Elite berlisensi Apache-2.0, sisanya OFL-1.1.
  Kalam memakai dua file (400, 700).

## Preset palet (56)

Class: `.sk-pal-<gaya>-<nama>`. Class ini mengisi `--sk-bg`, `--sk-ink`,
`--sk-accent`, `--sk-accent-2`, `--sk-muted`, dan untuk gaya kertas
`background` dari class tekstur. Palet lama menyalin nilai tabel `Look` saat
ini persis, supaya still lama tetap identik piksel. Prefix gaya: `text`, `mg`,
`wb`, `vox`, `stop`, `mm`, `px`.

Aturan kontras (dicek oleh test). Warna bg class tekstur memakai rata-rata
terukur (ffmpeg `scale=1:1:flags=area`, 2026-09-27): `.sk-paper-white`/`.sk-grid`/`.sk-lined`
#f5f3f4, `.sk-paper-cream` #f5ebd0, `.sk-paper-grey`/`.sk-newsprint` #c4b9b4,
`.sk-kraft` #bb8f4d, `.sk-kraft-dark` #a68768 (tidak gelap!), `.sk-tex-paper-tan`
#caa77a, `.sk-tex-cork` #ab6f3e, `.sk-tex-cardboard` #ba8e4e, `.sk-tex-blackboard`
#233027. Nilai ini dicatat di `presets.json` sebagai `bg`.

- Peran `text` (broll-text, motion-graphic, whiteboard): ink vs bg ≥ 4.5:1 dan
  kedua aksen vs bg ≥ 3:1, karena teks berada langsung di atas latar.
- Peran `fill` (stop-motion, mix-media): ink vs bg ≥ 3:1 (label di sini selalu
  besar dan tebal, ≥ 34 px), dan label hitam `#111111` atau putih di atas aksen
  ≥ 4.5:1.
- Peran `hl` (vox): ink vs bg ≥ 3:1; ink `#1b1b1b` di atas kertas dokumen
  `#fbfaf6` yang di-multiply dengan stabilo ≥ 4.5:1; pena merah vs kertas
  dokumen `#fbfaf6` ≥ 3:1 (pena menandai dokumen, bukan latar).

Pengecualian lama (nilainya tetap, tidak boleh bertambah; dicatat di tabel
preset dokumen gaya masing-masing):

- `text-paper` aksen `#ff4d00` (2.92:1): hanya untuk kata payoff ≥ 180 px.
- `mg-default` aksen-2 `#f97316` (2.45:1) dan `mg-mint` aksen-2 `#f59e0b`
  (2.04:1): hanya untuk isi bar atau bidang besar, tidak pernah untuk teks atau
  garis tipis.
- `vox-dark-desk` (ink 2.92:1, pena 2.66:1), `stop-night-desk` dan
  `mm-night-zine` (ink 2.92:1): `.sk-kraft-dark` rata-rata #a68768, jadi tinta
  terang hanya dipakai di atas potongan kertas gelap, tidak langsung di atas
  latar. Tiga ini ditemukan saat pengukuran 2026-09-27 dan dipertahankan dengan
  keputusan yang sama seperti tiga pengecualian pertama.

Nilai bertanda † adalah rata-rata terukur untuk bg class tekstur.

### broll-text (`text`)

| nama | bg | ink | accent | accent-2 | muted | status |
| --- | --- | --- | --- | --- | --- | --- |
| default | #0a0a0a | #fafafa | #facc15 | #ef4444 | #737373 | lama |
| paper | #f2f0ea | #111111 | #ff4d00 | #2563eb | #8a8578 | lama (pengecualian) |
| signal | #111111 | #f5f5f5 | #22d3ee | #f43f5e | #525252 | lama |
| ink-blue | #0b1f4d | #f8fafc | #fde047 | #fb7185 | #64748b | lama |
| jakarta-dusk | #1a1033 | #fff4e6 | #ff8a3d | #ff4f8b | #7a6a99 | baru |
| risograph | #f6efe2 + `.sk-tex-riso` | #1d3fbb | #e8336d | #00897b | #a79f8f | baru |
| terminal | #0b0f0c | #d7ffd9 | #39ff88 | #ffb000 | #4f6b55 | baru |
| cream-red | #f3ead8 | #1a1a1a | #d62828 | #003049 | #9a8f7a | baru |

### motion-graphic (`mg`)

| nama | bg | ink | accent | accent-2 | muted | status |
| --- | --- | --- | --- | --- | --- | --- |
| default | #f4efe6 | #1c1917 | #2563eb | #f97316 | #a8a29e | lama (pengecualian) |
| night | #0f172a | #f8fafc | #38bdf8 | #f472b6 | #64748b | lama |
| economist | #f5f4f0 | #0d0d0d | #e3120b | #6b7280 | #b8b8b8 | lama |
| mint | #ecfdf5 | #052e16 | #059669 | #f59e0b | #86efac | lama (pengecualian) |
| fintech | #0b1220 | #e6edf7 | #22c55e | #f43f5e | #475569 | baru |
| sunrise | #fff7ed | #1c1917 | #c2410c | #7c3aed | #d6c7b4 | baru |
| mono-ink | #fafafa | #0a0a0a | #e11d48 | #525252 | #d4d4d4 | baru |
| ai-violet | #13111c | #f5f3ff | #a78bfa | #2dd4bf | #4c4868 | baru |

### whiteboard (`wb`)

| nama | bg | ink | accent | accent-2 | muted | status |
| --- | --- | --- | --- | --- | --- | --- |
| default | #fbfbf8 | #151515 | #dc2626 | #2563eb | #9ca3af | lama |
| kraft | #efe6d6 | #2b2118 | #c2410c | #1d4ed8 | #a08c70 | lama |
| blackboard | #1f2a24 | #f1f5f0 | #fde047 | #93c5fd | #6b7f72 | lama |
| blueprint | #123a6b | #eaf2ff | #fbbf24 | #f472b6 | #7ea3d4 | lama |
| graph-paper | #f7f9fc + `.sk-tex-graph` | #1f2937 | #e11d48 | #0284c7 | #cbd5e1 | baru |
| chalk-green | `.sk-tex-blackboard` (#233027†) | #f4f1e8 | #ffd166 | #8ecae6 | #5f7a6b | baru |
| napkin | #fbf6ee | #3b2f2f | #2563eb | #dc2626 | #cbbfae | baru |
| neon-marker | #111111 | #f5f5f5 | #ff3ea5 | #3ef0ff | #555555 | baru |

### vox (`vox`)

| nama | bg | ink | stabilo | pena | muted | status |
| --- | --- | --- | --- | --- | --- | --- |
| default | `.sk-paper-cream` | #1b1b1b | #ffe14d | #d7263d | #8c8577 | lama |
| newsprint | `.sk-newsprint` | #1b1b1b | #ffe14d | #d7263d | #6b665c | lama |
| dark-desk | `.sk-kraft-dark` | #f5efe6 | #ffe14d | #ff6b6b | #a8a29e | lama |
| blueprint | `.sk-grid` | #1e3a5f | #ffe14d | #d7263d | #7ea3d4 | lama |
| archive-sepia | `.sk-tex-paper-tan` (#caa77a†) | #2a1f14 | #f2c14e | #9b2226 | #8a7a5c | baru |
| cork-board | `.sk-tex-cork` (#ab6f3e†) | #1b1b1b | #ffe14d | #6e0d10 | #6b4f33 | baru |
| evidence | #1d1f22 | #f1ede4 | #ffe14d | #e5383b | #6b6f76 | baru |
| pastel-brief | #eef2f7 | #1e293b | #a7f3d0 | #e11d48 | #94a3b8 | baru |

### stop-motion (`stop`)

| nama | bg | ink | accent | accent-2 | muted | status |
| --- | --- | --- | --- | --- | --- | --- |
| default | `.sk-kraft` | #2b2118 | #b5452b | #2f6f8f | #8a7355 | lama |
| notebook | `.sk-lined` | #1f2937 | #dc2626 | #2563eb | #9ca3af | lama |
| night-desk | `.sk-kraft-dark` | #f5efe6 | #f59e0b | #7dd3fc | #a8a29e | lama |
| blueprint-paper | `.sk-grid` | #1e3a5f | #b5452b | #2f6f8f | #7ea3d4 | lama |
| warung | `.sk-tex-cardboard` | #2b2118 | #d62828 | #2a9d8f | #8a7355 | baru |
| school-craft | `.sk-paper-white` | #1f2937 | #f4a261 | #3a86ff | #adb5bd | baru |
| midnight-desk | #2a1f17 + `.sk-tex-film` | #f5efe6 | #e9c46a | #7dd3fc | #a8a29e | baru |
| pastel-cut | `.sk-paper-cream` | #2b2d42 | #ffafcc | #a2d2ff | #bdb2a0 | baru |

### mix-media (`mm`)

| nama | backdrop | ink | accent | accent-2 | status |
| --- | --- | --- | --- | --- | --- |
| default | `.sk-grid` (#f5f3f4†) | #2b2118 | #b5452b | #2f6f8f | lama |
| notebook | `.sk-lined` | #1f2937 | #dc2626 | #2563eb | lama |
| kraft-desk | `.sk-kraft` | #2b2118 | #b5452b | #2f6f8f | lama |
| night-zine | `.sk-kraft-dark` | #f5efe6 | #f59e0b | #7dd3fc | lama |
| zine-pink | `.sk-paper-white` + `.sk-tex-riso` | #111111 | #ff3d8b | #1f6feb | baru |
| scrapbook | `.sk-kraft` | #2b2118 | #e76f51 | #2a9d8f | baru |
| xerox | `.sk-paper-grey` + `.sk-tex-halftone` | #111111 | #ff2a2a | #5f5f5f | baru |
| pop-collage | #ffd23f + `.sk-tex-halftone` | #1a1a1a | #ee4266 | #3bceac | baru |

### parallax (`px`), preset grade

Parallax tidak memakai palet hex. Preset di sini adalah grade: class
`.sk-grade-px-*` dipasang di stage, lalu mengatur `filter` di `.sk-view`, warna
dan opasitas kabut (`.sk-haze`), dan opasitas `.sk-grain`.

| nama | filter | haze | grain | status |
| --- | --- | --- | --- | --- |
| default | none | none | 0 | lama |
| archive | `grayscale(.6) contrast(1.05)` | `.sk-paper-crumpled` 12% | .18 | lama |
| night-desk | `brightness(.9)` | #0f1e3d 15% | .12 | lama |
| paper-stage | none | `.sk-paper-white` 20% | .1 | lama |
| golden-hour | `sepia(.15) saturate(1.1) brightness(1.03)` | #ffb86b 12% | .12 | baru |
| blue-hour | `saturate(.9) hue-rotate(-8deg) brightness(.92)` | #1e3a8a 18% | .12 | baru |
| faded-film | `contrast(.9) saturate(.8) brightness(1.05)` | #f5e6d0 10% | .2 | baru |
| mono-archive | `grayscale(1) contrast(1.1)` | #d9d4c7 12% | .22 | baru |

Empat preset "lama" mengubah deskripsi kualitatif di tabel `Look`
`parallax.md` menjadi nilai konkret. Contoh `px-01..04` tidak memakai class
grade (px-03 hanya punya `contrast(1.05)` lokal pada plate-nya), jadi class
baru ini tidak mengubah piksel contoh mana pun.

## Preset tipografi (23)

Class `.sk-type-<gaya>-<nama>` mengisi variabel `--sk-font-display`,
`--sk-font-body`, `--sk-font-hand`, dan `--sk-font-mono`.

`.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, dan `.sk-mono` (baru)
membaca variabel tersebut, dengan fallback ke font lama. Tanpa class type,
hasil render sama persis dengan sekarang.

Ditambah class langsung per font `.sk-f-<id>` (misal `.sk-f-bebas-neue`),
karena clip tidak boleh menulis `font-family` di `<style>` miliknya.

| Gaya | Preset (display + body) |
| --- | --- |
| broll-text | `poster` Anton + Geist (lama) · `editorial` Bebas Neue + Instrument Serif · `brutal` Archivo Black + Space Grotesk · `terminal` JetBrains Mono |
| motion-graphic | `clean` Geist tnum (lama) · `jakarta` Plus Jakarta Sans · `data` Space Grotesk + JetBrains Mono · `expressive` Bricolage Grotesque + Geist |
| whiteboard | `caveat` Caveat (lama) · `kalam` Kalam · `neat` Patrick Hand · `marker` Permanent Marker (judul) + Caveat |
| vox | `paper` Newsreader + Geist (lama) · `magazine` DM Serif Display + Space Grotesk · `archive` Special Elite + Newsreader |
| stop-motion | `default` Geist (lama) · `school` Patrick Hand · `label` Archivo Black + Geist |
| mix-media | `zine` Permanent Marker + Geist · `editorial` Instrument Serif + Space Grotesk · `typewriter` Special Elite + Geist |
| parallax | `memory` Instrument Serif + Geist · `label` Geist (lama) |

## API `SK` (tambahan)

| API | Perilaku |
| --- | --- |
| `SK.icon(id, {size, color, sw=2.2})` | String `<svg>` ikon Lucide dari `SK.LIB.icons`, lebar stroke dinormalisasi seperti `M.icon`. Id tidak dikenal akan throw error dengan saran id terdekat. |
| `SK.pict(id, {size, color})` | String `<svg>` pictogram Phosphor fill. |
| `SK.doodle(id, {size, color, sw=7})` | String `<svg>` berisi `<path class="sk-dpath">` per goresan, siap untuk `SK.draw` / `SK.drawSeq`. Bukan `.sk-stroke`, karena `.sk-wb .sk-stroke` di style-kit memaksa `stroke-width` 7 satuan viewBox. |
| `SK.frame(id, {w, h, content, caption})` | String HTML bingkai CSS (polaroid, film strip, browser, HP, halaman buku, kartu indeks). |
| `SK.stamp(id, {text, color, size})` | String HTML stempel/badge SVG; stempel bertulisan memakai teks tetapnya, badge memakai `text` dari transkrip. |
| `SK.tornFrame(id, w, h)` | `clip-path` sobekan dari preset `SK.torn`. |
| `SK.rough(svgEl, {seed=1, amp=1.2, step=6})` | Mengganti setiap `<path>` di dalam `svgEl` dengan versi goresan tangan. Path disampel tiap `step` px dengan `getPointAtLength`, diberi jitter memakai `SK.rng(seed)`, lalu dihaluskan (Catmull-Rom). Hasilnya deterministik untuk seed yang sama, dan di-cache per elemen. |
| `SK.doc(kind, fields, {w})` | String HTML `.sk-doc .sk-docx` untuk template VOX (tata letak di `.sk-docx`; `.sk-doc` tidak diubah); tag "Ilustrasi" selalu ada. |
| `SK.mark(id, {color})` | String `<svg>` tanda pena merah (`mark.*`). |
| `SK.geo(lat, lon, map='indonesia')` | Koordinat piksel pada peta `SK.MAPS[map]`. |
| `SK.HAND` | Ditambah pose `hold-card`, `swipe`, `erase`, `hold-highlighter`. |
| `SK.asset(id)` | Entri catalog (path, anchor) untuk dipakai clip; throw error jika id tidak ada. |

`M.icon` dan `M.IC` tidak diubah.

## Build Contract (tambahan untuk dokumen gaya)

- Starter Dena memuat `vendor/asset-lib/asset-lib.css` setelah `paper-pack.css`,
  dan `asset-lib.js` setelah `style-kit.js`. Host contoh gaya juga ikut memuat
  keduanya.
- Bitmap objek kertas: `<div class="sk-obj-coin-stack" style="width:320px">`
  (`aspect-ratio` di class), bukan `<img>` yang diulang.
- Tangan: `<img class="sk-hand-img" src="vendor/asset-lib/hands/erase.png">`.
- Scene: path layer dibaca dari `scene.json` saat menulis clip, lalu disalin ke
  `<img class="sk-plate">` di tiap `.sk-ly`.
- Path selalu host-relative (`vendor/asset-lib/…`), tidak pernah `../`.

## Alur produksi aset bitmap

1. Prompt ditulis per keluarga aset, sekali, dengan kalimat gaya yang sama
   (lihat tiap jenis di atas).
2. Codex (`codex-image`) menghasilkan 2–3 varian. Semua varian masuk ke
   `staging-assetlib/` di scratchpad, lengkap dengan `SHA256SUMS`, karena output
   Codex tidak bisa dibuat ulang dengan hasil identik.
3. Review di latar abu-abu `#8a8a8a` dan kraft. Aset **ditolak** kalau ada teks,
   logo, atau angka seri; bentuk tangan atau jari yang salah; kilap plastik "AI
   glossy"; perspektif yang tidak konsisten dengan keluarganya; objek generik yang
   tidak terbaca dalam 0,5 detik pada lebar 300 px; atau cahaya tidak dari kiri
   atas.
4. Post-process: crop ke kotak alpha, resize, lalu PNG palette 256 warna (atau
   WebP q80 untuk plate scene).
5. Tulis ke `LICENSES.md`: prompt, tanggal, dan perubahan.
6. Aset CC0 dan PD: URL sumber, id aset, halaman lisensi beserta tanggal cek,
   dan perubahan.

## Contact sheet dan `CATALOG.md`

- Proyek HyperFrames `docs/agents/references/asset-catalog/`:
  - Satu komposisi per sheet. Grid berisi thumbnail dengan id di bawahnya.
  - Latar netral abu-abu muda. Aset gelap ditampilkan di atas kartu terang,
    dan sebaliknya.
  - Snapshot 1080×1920 → WebP q80 ke `sheets/`.
- Daftar sheet:
  - icons ×3 (~90 per sheet)
  - pictograms, doodles, doodles-rough (20 ikon contoh lewat `SK.rough`), paper,
    hands, frames, docs, maps, textures, scenes
  - fonts: tiap font dengan kalimat Indonesia "Bangun sistem AI untuk bisnis
    nyata — Rp 169 jt"
  - preset ×7, satu halaman per gaya (swatch palet/grade + contoh tipografi)
- `node scripts/asset-lib.mjs sheets` membuat ulang sheet. Perintahnya: `npm run
  asset-lib -- sheets`.
- `CATALOG.md` dihasilkan dari `catalog.json`: satu tabel per jenis (id, gaya,
  tag, sumber) plus tautan ke sheet-nya.

## Perubahan workflow dan dokumen

- `docs/agents/02-screen-plan.md` (langkah visual): sebelum memilih visual,
  baca `CATALOG.md`, lihat sheet gaya yang relevan, dan pilih preset palet +
  tipografi. Brief mencatat `Palette: sk-pal-…`, `Type: sk-type-…`, dan
  `Assets:` dengan id catalog.
- `docs/agents/references/styles/README.md`: brief menerima id catalog dan nama
  preset. Aturan variasi: satu preset palet per gaya per video, kecuali saat
  menandai babak cerita baru.
- 7 dokumen gaya: tabel `Look` diganti tabel preset bernama (termasuk
  pengecualian). Ada bagian baru `## Kit` berisi id aset yang cocok dan tautan
  ke sheet.
- `docs/agents/references/asset-production.md`: urutannya pustaka dulu, lalu
  Codex/CC0 per video hanya kalau pustaka tidak punya asetnya. Alasan ini
  dicatat di brief.
- `docs/agents/03-build.md`: cara memuat dan memakai aset pustaka.
- `templates/dena-video/`: memuat `asset-lib.css`/`.js`.
- `internal/docs/adr/0016-shared-asset-library.md` (Status accepted).
- `internal/docs/requirements/rd-03-video-editing-workflow.md`: kriteria EARS di
  bawah ini.
- `internal/docs/README.md`: registry dan indeks. `package.json`: skrip
  `asset-lib` dan `test:asset-lib`.

### Kriteria EARS (untuk rd-03)

- WHEN the Screen Plan phase chooses a motion visual, the agent SHALL consult
  `vendor/asset-lib/CATALOG.md` and the relevant contact sheets before
  requesting a new per-video asset.
- WHEN a style brief names a palette or type preset, the preset SHALL exist as
  a `.sk-pal-*` or `.sk-type-*` class in `asset-lib.css`.
- WHEN a brief lists an asset from the library, it SHALL use the catalog id,
  and the id SHALL exist in `catalog.json`.
- The asset library SHALL keep every file listed in `catalog.json` and
  `LICENSES.md`, tracked in git, with its total committed size ≤ 25 MB.
- WHEN `SK.doc` renders a document, it SHALL show the "ILUSTRASI" stamp.
- WHEN a per-video asset duplicates what the library provides, the Build
  phase SHALL use the library asset unless the brief records why not.

## Pengujian (`npm run test:asset-lib`)

- Catalog ↔ file ↔ `LICENSES.md`: tiga arah lengkap. Tidak ada file tanpa
  entri, dan tidak ada entri tanpa file. `catalog.json`, `LICENSES.md`, dan
  `CATALOG.md` dihasilkan oleh `build` dari sumber (data fetch, SVG, dan
  `src/bitmaps.json` untuk bitmap), sehingga satu sumber per jenis.
- Semua file di `vendor/asset-lib/` dan `asset-catalog/sheets/` tercatat di git.
- Ukuran total aset baru ≤ 25 MB.
- `asset-lib.js` sama dengan hasil `build` dari sumbernya.
- Tag topik hanya dari kosakata tetap. `styles[]` hanya berisi gaya yang
  `available`.
- Setiap id di bagian `## Kit` dokumen gaya ada di catalog.
- Setiap `.sk-type-*` dan `.sk-f-*` merujuk font yang punya `@font-face` di
  `asset-lib.css`.
- Kontras 56 palet sesuai aturan. Tiga pengecualian lama ada di allowlist
  eksplisit, dan tidak boleh bertambah.
- `SK.icon`, `SK.pict`, `SK.doodle`, `SK.doc`, `SK.mark`, dan `SK.geo`
  deterministik di vm. `SK.doc` selalu menghasilkan stempel.
- `SK.rough` deterministik: seed sama → path sama, diuji dengan stub
  `getPointAtLength`. Stabilitas render dicek di spike (b).
- Regresi: `npm run test:style-kit`, `test:motion-kit`, `test:video`, dan
  `check:style-examples` tetap hijau. Ke-60 still contoh lama identik piksel
  dengan snapshot di main.
- Visual: setiap contact sheet dilihat satu per satu, dan aset yang lolos
  dicentang di `staging-assetlib/REVIEW.md`.

## Spike sebelum plan

1. **(a) Font dari sheet baru.** Linter HyperFrames menerima `.sk-f-*` dan
   `.sk-type-*` yang memakai `@font-face` di `asset-lib.css`, tanpa error
   `font-family` di sub-komposisi. Cadangan: pindahkan `@font-face` baru ke
   `style-kit.css`.
2. **(b) `SK.rough` stabil saat render.** `getPointAtLength` menghasilkan
   frame yang identik di dua render berturut-turut. Cadangan: `rough` dihitung
   saat build (node, parser path sederhana) dan hasilnya dibekukan.
3. **(c) Starter + contoh memuat pustaka.** Memuat `asset-lib.css`/`.js` tidak
   mengubah satu piksel pun pada 60 still lama, dan variabel `--sk-font-*`
   dengan fallback menghasilkan font yang sama.
4. **(d) Grade parallax di `.sk-view`.** `filter` pada `.sk-view` tidak
   meratakan 3D `.sk-world`. Cadangan: grade sebagai overlay `mix-blend-mode`
   di atas world.

## Definisi selesai

- ~500 aset + 56 palet/grade + 23 tipografi ada di catalog. Semua test hijau.
- Semua contact sheet ada dan sudah direview. `CATALOG.md` sudah di-generate.
- Dokumen workflow, 7 dokumen gaya, ADR-0016, rd-03, dan indeks internal/docs
  diperbarui di commit yang sama dengan kodenya.
- 60 still lama identik piksel. Total ukuran ≤ 25 MB.
- Merge ke main lokal hanya setelah Dena setuju.

## Risiko

- **Konsistensi keluarga Codex**: 36 objek kertas bisa terlihat beda gaya.
  Mitigasi: kalimat gaya yang sama, review berkelompok per keluarga, dan buat
  ulang yang menyimpang.
- **Aset generik menjadi slop**: pustaka besar menggoda agen untuk menempel
  ikon di mana-mana. Mitigasi: aturan dokumen gaya tetap berlaku (satu set ikon
  per clip, Isotype tanpa memperbesar ikon), dan setiap aset di brief harus
  terkait dengan kata di transkrip.
- **Ukuran**: sheet dan scene yang terbesar. Mitigasi: WebP, dan test anggaran
  gagal sebelum batas terlampaui.
- **Nama ikon Lucide berubah** di versi mendatang: data dibekukan pada 1.48.0,
  jadi tidak terpengaruh.

## Temuan saat implementasi (2026-09-27)

- Contact sheet yang isinya melebihi satu halaman dipecah jadi `-1`, `-2`
  (doodle, frame, paper, icon, doc, texture); `## Kit` merujuk nama halaman itu.
- `SK.stamp` mengukur teks dari tinggi **dan** lebar badge (teks badge persegi
  sempat meluap).
- `paper/` berukuran 8,1 MB pada 720 px (perkiraan awal ~4 MB); total pustaka +
  sheet tetap di bawah 25 MB.
- `codex-image` yang dijalankan paralel pernah menyerahkan gambar job lain
  (dua referensi scene identik byte). Job Codex dijalankan satu per satu dan
  keunikan SHA-256 dicek setelah setiap batch.
- Exit 6 `codex-image` ("opaque background") bisa false positive saat subjek
  sengaja menyentuh sudut (lengan dari kanan bawah); alpha diukur langsung
  (`alphaextract,signalstats`, `YMIN=0`) sebelum membuat ulang.
- Tiga pengecualian kontras `.sk-kraft-dark` dipertahankan sebagai default
  sampai Dena memutuskan lain.
