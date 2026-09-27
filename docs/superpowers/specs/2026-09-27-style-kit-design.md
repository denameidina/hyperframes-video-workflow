# Style B-roll (style-kit) — Design

Status: approved (brainstorming 2026-09-27), belum diimplementasi
Date: 2026-09-27
Sub-proyek: 1 dari 3. Dibangun di atas workflow 4 fase (ADR-0008), motion
b-roll (ADR-0009), dan per-video projects (ADR-0010).

## Latar belakang

Visual Dena saat ini: motion b-roll (satu shape morph + kursor, gaya UI),
capture/screenshot, generated still/video, dan diagram. Dena ingin project ini
menguasai tujuh gaya visual tambahan:

1. VOX style
2. B-roll text
3. Motion graphic
4. Whiteboard animation
5. Stop-motion
6. Mix-media
7. 2.5D Parallax Animation

Syarat dari user: **referensinya harus sangat kaya**, supaya fase Screen Plan
dan Build punya banyak pola yang bisa dipilih, bukan satu-dua template.

## Keputusan yang sudah diambil

- Kedalaman: tiap gaya mendapat reference (planning + authoring), contoh
  komposisi yang bisa dirender, dan kit/helper bila perlu.
- Peran: **menu per klip**. Gaya adalah `Type` baru di Visual Decision Log,
  sejajar `motion-broll`; satu video boleh mencampur gaya. Treatment
  cutaway / split / panel tetap berlaku.
- Palet: **bebas per gaya** (tidak dipaksa ke dark look Dena). Palet tiap klip
  wajib ditulis di brief. Caption, hook card, dan CTA host tetap memakai sistem
  Dena.
- Sumber aset yang diizinkan: kode murni (SVG/CSS), Codex image gen, footage
  Dena sendiri (remove-background, frame, screenshot), dan library aset bebas
  lisensi (CC0, dibekukan lokal, atribusi dicatat). Sub-proyek 1 hanya memakai
  kode murni + font OFL.
- Pendekatan A: **satu style-kit bersama** berisi primitive lintas gaya; tiap
  gaya adalah resep di atas primitive itu.
- Pemecahan sub-proyek, dari risiko aset terendah:
  1. Fondasi style-kit + broll-text, motion-graphic, whiteboard (dokumen ini).
  2. Keluarga kertas/tekstur: stop-motion, VOX, mix-media, plus pipeline aset
     bitmap (Codex, CC0, remove-background) dan tangan whiteboard.
  3. 2.5D parallax: pemisahan layer depth + kamera.

## Tujuan (sub-proyek 1)

- `vendor/style-kit/` yang deterministik dan teruji, dimuat oleh template
  `dena-video`.
- Tiga gaya siap pakai di video nyata: `broll-text`, `motion-graphic`,
  `whiteboard`, masing-masing dengan referensi kaya (lihat Target kekayaan).
- Screen Plan dapat memilih gaya lewat tabel keputusan; Build dapat menulis
  klip dari Style B-roll Brief tanpa menebak.
- 12 contoh klip yang lolos lint/validate/snapshot dan checklist anti-slop.

## Non-tujuan

- VOX, stop-motion, mix-media, parallax (sub-proyek 2 dan 3).
- Pipeline aset bitmap dan gambar tangan untuk whiteboard (sub-proyek 2).
- Mengubah engine `motion-kit` atau perilaku motion b-roll yang ada.
- Mengubah sistem caption/hook/CTA Dena.
- Push ke remote.

## Definisi gaya

| Type | Isi | Dipakai untuk kalimat yang… |
|---|---|---|
| `broll-text` | Kinetic typography full-frame. Kata verbatim dari transkrip muncul / dibanting / di-scale tepat di kata yang diucapkan. Font display tebal, palet kontras tinggi. | punchline, kutipan kunci, klaim yang harus nempel |
| `motion-graphic` | Infografis flat tanpa kursor/UI: ikon, bar, donut, count-up, panah, relasi antar-objek. | angka/proporsi yang disebut, konsep abstrak, sebab-akibat |
| `whiteboard` | Latar putih, garis dan teks tulisan tangan tergambar stroke demi stroke dengan "boil" halus, ujung marker SVG mengikuti goresan. | framework, alur berpikir, diagram yang dibangun bertahap |

`motion-broll` tetap pilihan untuk kalimat tentang tool, proses UI, atau aksi
klik.

## Arsitektur

### File

```
vendor/style-kit/
  style-kit.js        window.SK, script klasik, tanpa dependency npm
  style-kit.css       .sk-stage + tema .sk-text / .sk-mg / .sk-wb
  LICENSE             MIT (kode repo ini)
  fonts/
    Anton-Regular.woff2        display untuk broll-text (OFL)
    Caveat-Variable.woff2      tulisan tangan untuk whiteboard (OFL)
    OFL-Anton.txt
    OFL-Caveat.txt
scripts/style-kit.test.mjs
docs/agents/references/styles/
  README.md  broll-text.md  motion-graphic.md  whiteboard.md
docs/agents/references/style-examples/
  index.html  hyperframes.json  snapshots.json
  compositions/  (12 klip, lihat Contoh)
internal/docs/adr/0012-style-broll-style-kit.md
```

Nama font final boleh diganti saat implementasi selama lisensinya OFL dan
mendukung huruf Latin Indonesia; berkas lisensi ikut di-vendor. Tidak ada font
yang diambil dari CDN saat render.

### Engine (`vendor/style-kit/style-kit.js`)

Dimuat di host `<head>` setelah `vendor/gsap.min.js` dan
`vendor/motion-kit/motion-kit.js`. Memakai helper motion-kit (`M.eo`, `M.eio`,
`M.track`, `M.ctrack`, `M.step`, `M.vis`, `M.S`) alih-alih menduplikasinya;
melempar error jelas bila `window.M` tidak ada.

Semua fungsi adalah fungsi murni dari waktu lokal klip `t` (detik). Tidak ada
`Date.now()`, `Math.random()`, atau fetch.

| API | Perilaku |
|---|---|
| `SK.clip(id, {T, bg, update(t)})` | Cari root klip (elemen dengan `data-composition-id=id`) dan `.sk-stage` di dalamnya, set `bg` bila ada, daftarkan `gsap.timeline({paused:true})` dengan satu tween proxy `{t:0→T}` yang `onUpdate` memanggil `update(t)`, registrasi di `window.__timelines[id]`, panggil `update(0)` sekali. Error bila `T` ≤ 0, root/stage tidak ditemukan, atau `update` bukan fungsi. |
| `SK.finder(id)` | Pencari `#elId` di dalam stage klip (id boleh berulang antar-klip). |
| `SK.rng(seed)` | PRNG deterministik (mulberry32); seed sama → urutan sama. |
| `SK.stepTime(t, fps)` | Kuantisasi waktu ke frame `fps` (mis. 12 = "on twos" pada 24). |
| `SK.boil(seed, t, amp, fps)` | Offset `{x, y, r}` patah-patah dalam `[-amp, amp]`, berubah tiap `1/fps`, deterministik dari `seed` + frame. |
| `SK.draw(path, u)` | Draw-on stroke SVG via `stroke-dasharray/offset`; panjang path di-cache per elemen; `u` di-clamp 0..1. |
| `SK.tip(path, u)` | Titik `{x, y, angle}` di ujung goresan (untuk ujung marker). |
| `SK.words(el)` | Pecah teks elemen jadi `<span class="sk-w">` per kata sekali (idempoten), kembalikan array span. |
| `SK.reveal(spans, times, t, style)` | Tiap kata tampil di waktunya dengan gaya `pop`, `slam`, `rise`, `fade`, atau `mask`. |
| `SK.count(t, t0, t1, from, to, fmt)` | Nilai count-up ter-ease dan ter-clamp, diformat `fmt` (default: pemisah ribuan titik, gaya Indonesia). |
| `SK.len`, `SK.drawSeq(t, items, {speed, boil})` | Panjang path ter-cache; goresan berurutan dengan kecepatan pena konstan (default 750 px/s) dan boil hanya pada goresan yang selesai. |
| `SK.write`, `SK.writeTip`, `SK.MARKER_SVG`, `SK.placeMarker` | Tulisan tangan kiri → kanan lewat `clip-path`; ujung marker mengikuti pena. |
| `SK.line`, `SK.rect`, `SK.ellipse`, `SK.arrow` | Builder path gaya tangan (bow, sudut bertumpuk, lingkaran overshoot), deterministik per seed. |
| `SK.jiggle`, `SK.smooth`, `SK.stagger`, `SK.fmt`, `SK.cam` | Boil pada elemen, easing smoothstep, stagger, format angka Indonesia, kamera fokus-titik. |

Catatan spike 2026-09-27: elemen klip disembunyikan dengan `opacity`, bukan
`visibility` (anak `visibility: visible` tetap tampil setelah mount
disembunyikan), dan `<style>` klip tidak boleh menyebut `font-family` (linter);
font dipilih lewat `.sk-display`, `.sk-sans`, `.sk-hand`.

Penambahan primitive lain diperbolehkan saat implementasi bila dua atau lebih
contoh klip membutuhkannya; primitive sekali-pakai tetap di dalam klip.

### CSS (`vendor/style-kit/style-kit.css`)

- `.sk-stage`: absolute 1080×1920, overflow hidden.
- Tema dengan CSS variable (`--sk-bg`, `--sk-ink`, `--sk-accent`, `--sk-accent-2`,
  `--sk-muted`), ditimpa per klip lewat `#root` style:
  - `.sk-text`: default hitam pekat + putih + kuning, font Anton.
  - `.sk-mg`: default flat terang (off-white + ink + dua aksen), font Geist.
  - `.sk-wb`: default putih kertas `#fbfbf8` + tinta `#111` + marker merah/biru,
    font Caveat.
- Tidak ada gradien dekoratif, glow, atau partikel pada tema default.

### Format klip dan penempatan

Sama dengan motion b-roll (ADR-0009): satu klip = satu sub-composition
`compositions/broll/NN-nama.html` di track 4, mount `.broll` (z 22) dengan `id`
stabil, `data-duration` = `T` klip. Isi `<template>`:

```html
<div id="root" data-composition-id="broll-NN-nama" data-width="1080" data-height="1920" data-duration="T">
  <div class="sk-stage sk-wb"> … </div>
</div>
<script>
  (() => {
    const ID = 'broll-NN-nama';
    const $ = SK.finder(ID);
    SK.clip(ID, { T: 6, update: (t) => { … } });
  })();
</script>
```

Treatment cutaway / split / panel sama seperti di `motion-broll-planning.md`;
split tetap memakai transform base video di host.

## Masuk ke workflow 4 fase

### Screen Plan (langkah visual)

- `visual-planning.md` §3 Choose Asset Type: prioritas 1 menjadi **motion
  visual** (menu gaya: motion-broll atau style b-roll, lewat tabel keputusan di
  `styles/README.md`), lalu capture asli, crop/screenshot, generated still,
  generated video.
- Visual Decision Log `decision` bertambah: `broll-text`, `motion-graphic`,
  `whiteboard`.
- `styles/README.md` berisi:
  - menu semua gaya (termasuk empat gaya yang akan datang, ditandai "belum
    tersedia");
  - tabel keputusan jenis kalimat → gaya;
  - aturan variasi: maksimal 3 gaya motion visual per video; dua klip
    berurutan sebaiknya beda gaya kecuali satu sekuens;
  - **Style B-roll Brief** = Motion B-roll Brief + `Style:`, `Pattern:`
    (dari kosakata gaya), `Palette:` (nilai hex), `Font:`.
- `overlay-timeline.json`: `type` baru `broll-text`, `motion-graphic`,
  `whiteboard`; `track: 4`; `assetRef: "compositions/broll/NN-nama.html"`;
  treatment di `placement`. Bukan aset: tanpa entri `asset-manifest.json`.
- Gate 2 tidak berubah. R1 berlaku ketat: teks broll-text dan angka count-up
  harus verbatim dari transkrip atau diberi user; visual relatif tanpa angka
  ditandai ilustratif. R3/R4 berlaku untuk cutaway/split.

### Build

- `03-build.md` langkah 4a "Author motion b-roll" menjadi "Author motion
  visuals": untuk `motion-broll` ikuti `motion-broll-authoring.md`; untuk gaya
  lain ikuti `styles/<gaya>.md`. Still Check di waktu kata kunci brief sama.
- Template `templates/dena-video/index.html` memuat
  `vendor/style-kit/style-kit.js` dan `style-kit.css` setelah motion-kit.
  Proyek video menerima style-kit lewat symlink `vendor/` yang sudah ada.

### QA

`qa-checklist.md` mendapat butir: klip style b-roll cocok dengan Style Brief,
teks/angka verbatim, checklist anti-slop gaya lolos.

## Target kekayaan referensi

Setiap `styles/<gaya>.md` memuat, dengan jumlah minimum:

| Isi | broll-text | motion-graphic | whiteboard |
|---|---|---|---|
| Pola di tabel kosakata | ≥ 12 | ≥ 12 | ≥ 10 |
| Contoh klip yang bisa dirender | 4 | 4 | 4 |
| Referensi dunia nyata yang dibedah | ≥ 6 | ≥ 6 | ≥ 6 |

Struktur tiap file gaya:

1. Apa itu, kapan dipakai / tidak dipakai.
2. Palet default + 2–3 palet alternatif (hex), font, skala tipografi 9:16.
3. **Kosakata pola**: nama, dipakai untuk, perilaku gerak, timing ke kata,
   SFX, salah pakai yang umum.
   - broll-text, kandidat awal: slam, stack, word-swap, highlight-swipe,
     strike-through, scale-punch, quote-card, split-word, type-on,
     counter-word, marquee, mask-reveal.
   - motion-graphic, kandidat awal: count-up, bar-race, donut, icon-grid (unit
     chart), arrow-flow, venn, scale-compare, timeline, map-pin, dot-matrix,
     before-after, cycle-loop.
   - whiteboard, kandidat awal: draw-flow, mind-map, box-and-arrow,
     underline-circle, stick-figure, list-tick, equation, cross-out,
     zoom-into-detail, speech-bubble.
4. Aturan gerak (easing, durasi per kata, ritme) dan SFX per pola.
5. Skeleton klip + cuplikan kode per pola kunci.
6. **Referensi**: tiap entri berisi kreator/karya, teknik yang dicuri (palet,
   font, ritme, transisi, cara angka muncul), dan terjemahannya ke 9:16 Dena.
   Arah awal: kinetic type — Saul Bass, Apple keynote; motion graphic —
   Kurzgesagt, The Economist, Polymatter; whiteboard — RSA Animate,
   MinutePhysics. **Tautan hanya dicantumkan bila sumbernya diverifikasi lewat
   riset web saat implementasi; judul karya tidak boleh dikarang.**
7. **Checklist anti-slop**: tanda klip mulai terlihat template/AI slop
   (mis. semua kata masuk dengan ease sama, ikon campur gaya stroke, angka
   dikarang, whiteboard terlalu rapi seperti vektor, teks terlalu kecil untuk
   9:16).

## Contoh (standar kualitas)

`docs/agents/references/style-examples/` adalah project HyperFrames dengan base
video placeholder (pola `motion-broll-examples`). Teks contoh ditandai
ilustratif. 12 klip mencakup tiga treatment dan beberapa palet:

| Klip | Gaya | Pola | Treatment |
|---|---|---|---|
| `tx-01-slam` | broll-text | slam + scale-punch | cutaway |
| `tx-02-quote-split` | broll-text | quote-card + highlight-swipe | split |
| `tx-03-word-swap` | broll-text | word-swap + strike-through | panel |
| `tx-04-stack` | broll-text | stack + mask-reveal, palet terang | cutaway |
| `mg-01-count` | motion-graphic | count-up + donut | cutaway |
| `mg-02-compare-bars` | motion-graphic | bar-race / scale-compare | split |
| `mg-03-icon-grid` | motion-graphic | icon-grid + before-after | cutaway |
| `mg-04-arrow-flow` | motion-graphic | arrow-flow + cycle-loop | panel |
| `wb-01-flow` | whiteboard | draw-flow + box-and-arrow | cutaway |
| `wb-02-framework-panel` | whiteboard | list-tick | panel |
| `wb-03-mind-map` | whiteboard | mind-map + underline-circle | split |
| `wb-04-cross-out` | whiteboard | cross-out + stick-figure | cutaway |

Nama dan kombinasi pola boleh disesuaikan saat implementasi selama jumlah,
cakupan treatment, dan cakupan gaya terpenuhi.

## Pengujian

- `scripts/style-kit.test.mjs` (node:test, memuat engine di `vm` seperti
  `motion-kit.test.mjs`): `rng` deterministik; `stepTime` kuantisasi benar;
  `boil` dalam batas dan deterministik; `count` format dan clamp; `words`
  pemecahan dan idempoten; `SK.clip` error untuk `T` ≤ 0, root hilang,
  `update` bukan fungsi. Skrip: `npm run test:style-kit`.
- `scripts/style-docs.test.mjs` menjaga Target kekayaan referensi: jumlah pola,
  referensi dengan URL sumber, checklist anti-slop, dan contoh yang ada di disk;
  `npm run test:style-kit` menjalankan kedua test.
- `scripts/check-broll-examples.mjs` digeneralisasi menerima folder contoh
  (default tetap motion-broll-examples) dan menyalin `vendor/style-kit`;
  skrip baru `npm run check:style-examples`.
- Snapshot contact sheet ditinjau visual terhadap checklist anti-slop tiap gaya.
- Regresi: `test:motion-kit`, `check:broll-examples`, `test:video`,
  `test:render-blur` tetap hijau.
- Smoke template: `npm run video -- new tmp-smoke` lalu `check`, kemudian hapus
  folder itu.

## Governance dan dokumen

Diperbarui di commit yang sama dengan kodenya:

- ADR-0012 "Style b-roll lewat style-kit" (accepted), termasuk urutan tiga
  sub-proyek.
- EARS: `rd-03` (gaya dipilih lewat Decision Log, Style Brief wajib, teks/angka
  verbatim); `rd-02` (klip style-kit deterministik, font lokal).
- `internal/docs/README.md` (index + registry), `docs/agents/02-screen-plan.md`,
  `docs/agents/03-build.md`, `visual-planning.md`, `motion-grammar.md` (SFX per
  gaya), `motion-broll-planning.md` (tautan ke menu), `qa-checklist.md`.
- Non-negotiable di `CLAUDE.md` / `AGENTS.md`: "motion b-roll adalah default"
  menjadi "menu motion visual adalah default".
- `internal/docs/operations/roadmap.md`: sub-proyek 2 dan 3.

Perubahan publish yang belum di-commit di working tree (repliz, ADR-0011) bukan
bagian dari sub-proyek ini dan tidak disentuh.

## Definisi selesai

- Tiga file gaya memenuhi Target kekayaan referensi.
- 12 contoh lolos `check:style-examples` dan tinjauan anti-slop.
- Semua test di Pengujian hijau.
- Dokumen di Governance diperbarui.
- Branch `feat/style-kit` di-merge fast-forward ke `main` lokal; tidak di-push.

## Risiko

- **Draw-on di dalam `<template>`**: `getTotalLength` butuh elemen ter-render;
  mitigasi: hitung panjang lazily pada `update` pertama dan cache.
- **Font belum termuat saat frame pertama**: `font-display: block` seperti
  Geist; cek snapshot frame awal.
- **Whiteboard terlihat "vektor rapi"**: boil + variasi ketebalan stroke +
  sedikit overshoot; masuk checklist anti-slop.
- **Kekayaan jadi kuantitas tanpa kualitas**: setiap pola harus punya contoh
  kode atau contoh klip dan alasan kapan dipakai; pola tanpa alasan dihapus.
- **Referensi dikarang**: hanya referensi yang diverifikasi riset web yang
  diberi tautan; sisanya ditulis sebagai teknik tanpa klaim judul.
