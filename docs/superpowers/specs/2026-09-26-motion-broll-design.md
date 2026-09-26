# Motion B-roll — Design

Status: approved (brainstorming 2026-09-26), belum diimplementasi
Date: 2026-09-26
Sub-proyek: 2 dari 2. Dibangun di atas workflow 4 fase
(`docs/superpowers/specs/2026-09-26-four-phase-workflow-design.md`, ADR-0008).
Sumber yang diadaptasi: `https://github.com/Barty-Bart/motion-graphics`
→ `skills/motion-broll` (MIT).

## Latar belakang

Skill motion-broll membuat B-roll motion graphic dari transcript dengan gaya
"satu shape yang tidak pernah cut": satu elemen morph (pill → card → terminal →
chart), konten berganti dengan blur singkat, kursor melakukan klik/drag, dan
setiap perubahan jatuh di kata yang diucapkan. Engine-nya (`motion.js`) membuat
setiap frame sebagai fungsi murni dari `t` memakai spring closed-form, lalu
merender lewat Playwright dengan motion blur 4 subframe.

Pipeline Dena berbeda: 9:16 1080×1920, semua dirender HyperFrames dalam satu
komposisi, ADR-0007 melarang dependency npm lokal, dan workflow 4 fase memisah
perencanaan (Screen Plan) dari produksi (Build).

## Bukti kelayakan (spike, 2026-09-26)

Komposisi uji di scratchpad (host 1080×1920 + satu sub-composition, dirender
dengan `hyperframes@0.7.24` lewat `snapshot --at` dan `render`):

| Mekanisme | Snapshot | Render MP4 |
|---|---|---|
| Tween proxy GSAP `{t: 0→T}` + `onUpdate` → `seek(t)` | berjalan; `t` = waktu lokal clip (0.50/1.50/2.50 pada host 1.5/2.5/3.5 s) | sama |
| Event `hf-seek` | tidak pernah dikirim | tidak pernah dikirim |
| Engine global dimuat sekali di host `<head>`, dipakai dari dalam `<template>` sub-composition | berjalan | berjalan |

Kesimpulan: engine digerakkan oleh proxy `onUpdate`, bukan `hf-seek` (adapter
itu hanya aktif untuk Three.js/TypeGPU).

## Keputusan yang sudah diambil

- Yang dibawa dari skill: gaya visual (satu shape + kursor), kualitas gerak
  (spring + motion blur), aturan konten, proses rencana → cek still.
- Default untuk semua video talking-head; banyaknya clip mengikuti
  `visual_density` di brief.
- Treatment per clip: cutaway / split / panel, dipilih Screen Plan beserta alasan.
- Look sistem Dena gelap.
- Motion b-roll adalah visual utama; capture asli untuk bukti; imagegen untuk
  mood/tekstur/latar.
- Pendekatan teknis A: port native ke HyperFrames, tanpa dependency npm.
- Vocabulary: 14 pola asli + 4 pola baru (chat thread, timeline langkah,
  before → after, notif/kalender/jam).
- R3 (Gate 2) naik dari 6 ke 10 detik.
- Motion blur masuk v1 sebagai perintah opsional `npm run render:blur`.

## Tujuan

- Clip motion b-roll dapat ditulis per video sebagai sub-composition HyperFrames
  yang deterministik dan lolos `lint`/`validate`.
- Screen Plan dapat merencanakan clip (momen, treatment, state per kata) dalam
  `visual-plan.md`; Build dapat menulis, mengecek, dan merakitnya.
- Kualitas gerak setara skill asli (spring, indikator cair, kursor), dengan blur
  opsional pada render final.

## Non-tujuan

- Generator clip otomatis dari transcript.
- Halaman `viewer.html` / `compare.html` dan export ProRes untuk editor luar.
- Memperbaiki `index.html` WIP yang merujuk `videos/wfh-jaga-anak/` (media sudah
  dihapus user).
- Menjaga script V1 sub-proyek 1 tetap lulus: script itu arsip migrasi; sub-proyek
  ini sengaja mengubah teks referensi.

## Arsitektur

### File

```
vendor/motion-kit/
  motion-kit.js        port motion.js → window.M, + M.clip() adapter HyperFrames
  motion-kit.css       dari base.css: .mk-stage, .mk-world, .mk-shape, .mk-layer,
                       .mk-cursor, @font-face Geist (font-display: block)
  fonts/Geist-Variable.woff2, fonts/GeistMono-Medium.woff2, fonts/OFL-Geist.txt
  LICENSE              MIT (Barty-Bart) + catatan ikon Lucide (ISC)
compositions/broll/NN-nama.html      satu clip = satu sub-composition
docs/agents/references/motion-broll-planning.md    dibaca Screen Plan
docs/agents/references/motion-broll-authoring.md   dibaca Build
docs/agents/references/motion-broll-examples/      3 clip contoh + host contoh
scripts/motion-kit.test.mjs          unit test engine (node --test)
scripts/render-blur.mjs              pass motion blur
scripts/render-blur.test.mjs         unit test render-blur (node --test)
scripts/check-broll-examples.mjs     rakit proyek contoh sementara → lint/validate/snapshot
```

### Engine (`vendor/motion-kit/motion-kit.js`)

- Script klasik (bukan ES module) yang membuat `window.M`, dimuat sekali di
  `index.html` `<head>` setelah `vendor/gsap.min.js`, bersama
  `<link rel="stylesheet" href="vendor/motion-kit/motion-kit.css">`.
- Fungsi murni dipindah apa adanya: `clamp`, `lerp`, `eo`, `eio`, `S`, preset
  spring (`MORPH`, `FAST`, `SLOW`, `SOFT`, `CAM`, `INSTANT`), `track`, `hex`,
  `ctrack`, `step`, `vis`, `apply`, `setText`, `IC`, `icon`, `path`, `presses`,
  `crossTimes`.
- Ikon tambahan untuk vocabulary baru (garis 24-grid, Lucide ISC): `message`,
  `calendar`, `bell`, `users`. `arrow` dan `clock` sudah ada di `M.IC`.
- `M.scene` diganti `M.clip(id, cfg)`:
  - Mencari elemen di dalam root clip
    (`document.querySelector('[data-composition-id="<id>"]')` lalu
    `.mk-stage`, `.mk-world`, `.mk-shape`, `.mk-cursor`, dan layer lewat id yang
    diberi prefix id clip), bukan `document.getElementById`, karena beberapa clip
    hidup dalam satu dokumen.
  - Tidak ada mode preview, `requestAnimationFrame`, `performance.now()`, atau
    `location.search` (aturan determinisme HyperFrames).
  - Membuat `gsap.timeline({ paused: true })` secara sinkron, menambah satu tween
    `{t: 0 → cfg.T}` (`duration: cfg.T`, `ease: 'none'`) dengan `onUpdate` yang
    memanggil `seek(proxy.t)`, memanggil `seek(0)` sekali, lalu mendaftarkannya di
    `window.__timelines[id]`.
  - Mengembalikan `seek` agar dapat diuji.
- `cfg` sama dengan `M.scene` asli: `W`, `H`, `T`, `bg` (warna atau `null` =
  transparan), `center`, `intro`, `SH` (state: `w,h,r,bg,cam`), `start`, `SEQ`
  (`[[t,'state']]`), `layers` (`{el, tin, tout, anchor, o, update}`), `cursor`
  (`{size, clicks, drags, keys}`), `shapePress`, `spring`, `camSpring`, `geom`,
  `extra`.

### Format clip (`compositions/broll/NN-nama.html`)

Sub-composition standar HyperFrames: `<style>`, markup, dan `<script>` semuanya
di dalam `<template>`; root `#root` dengan `data-composition-id="broll-NN-nama"`,
`data-width="1080"`, `data-height="1920"`, `data-duration="<T>"`; root distyle
lewat `#root`, bukan class. Script hanya memanggil `M.clip('broll-NN-nama', {...})`.
Waktu `SEQ`, `tin/tout`, `clicks/drags/keys` = waktu kata di
`processed-transcript.json` − `data-start` clip.

### Penempatan di host

- Clip di **track 4** (overlay kontekstual/b-roll), z-index 20–24: caption (z 45)
  dan hook card (z 56) tetap di atas.
- Host clip: `data-composition-id` sama dengan id di file, `data-start`,
  `data-duration`, `data-track-index="4"`, `data-width="1080"`,
  `data-height="1920"`.

### Treatment

| Treatment | Clip | Base video | Kapan |
|---|---|---|---|
| Cutaway | `bg: '#050505'`, full frame | tertutup | Ide yang harus *dilihat*: produk, proses, perbandingan, angka nyata, pergantian bab; 3–10 s |
| Split | isi separuh atas (`center` ≈ `[540, 480]`), latar `#050505` di separuh atas | host menggeser + men-scale `#base-video` ke separuh bawah selama jendela clip; offset crop wajah ditentukan Build dari frame grab | Visual perlu ruang besar tapi wajah harus tetap terlihat |
| Panel | `bg: null`, shape terang di zona kosong (di bawah hook card, di atas kepala) | tetap penuh | Label/status singkat atau urutan panjang (boleh > 10 s) |

Aturan: tidak ada cutaway/split yang menutup wajah di `00:00.00–00:03.00`
(R4, kecuali `## User Approvals`); minimal 2 s wajah di antara dua cutaway;
jangan cutaway pada kalimat personal/emosional/opini.

### Look (sistem Dena)

| Token | Nilai | Pakai |
|---|---|---|
| canvas | `#050505` | latar cutaway/split |
| surface | `#FFFFFF` (tinta `#050505`) atau panel `#111111` + border `rgba(255,255,255,.12)` | shape |
| accent | `#facc15` | satu aksen per clip |
| success | `#22c55e` | status sukses saja |
| muted | `#d4d4d8` | teks sekunder, skeleton |
| font UI | Geist | teks di dalam shape |
| font mono | Geist Mono | terminal, nama file |

Caption tetap Arial 950. Dilarang: easing memantul, partikel, glow, gradient di
UI, ketebalan ikon campur, jeda mati, tampilan template, data karangan.

## Masuk ke workflow 4 fase

### Screen Plan (langkah visual)

- `visual-planning.md` "### 3. Choose Asset Type": prioritas baru
  1. motion b-roll untuk kalimat yang menjelaskan, menunjukkan, membandingkan,
     atau berurutan;
  2. capture asli bila butuh bukti (boleh dipakai di dalam state shape);
  3. generated still untuk mood/tekstur/latar yang tak bisa dibawakan motion
     b-roll;
  4. generated video.
  Kalimat personal/emosional/opini: tanpa visual.
- Visual Decision Log dan Timeline mengenal `motion-broll` sebagai jenis visual
  dan keputusan (`decision`).
- Density dari `visual_density`: light 2–4 clip/menit, medium 4–7, heavy sebagian
  besar kalimat dengan jeda wajah ≥ 2 s.
- Aturan konten: satu ide per clip; state berganti di kata, 0,4–1,2 s antar
  perubahan; label dari transcript; tanpa angka karangan (R1); bagian ilustratif
  ditandai; SFX: klik kursor → `click-soft`, morph → `whoosh-short` pelan.
- Asset Brief tipe `motion-broll` memakai **Motion B-roll Brief** di
  `motion-broll-planning.md`: treatment + alasan, pola vocabulary, state per kata
  (`kata @ waktu → state`), isi layer, aksi kursor, bagian ilustratif, planned
  file `compositions/broll/NN-nama.html`.
- Vocabulary (18 pola): pill + klik, progress, check/toast, status island,
  card + drag, slider, toggle, tabs, chart + tooltip, search/filter, drag-drop
  file, terminal typing, side-by-side, chapter card, **chat thread** (bubble
  generik tanpa branding, kalimat dari transcript), **timeline langkah**,
  **before → after**, **notif/kalender/jam** (angka waktu hanya dari transcript).
- Gate 2: R3 menjadi "menutup wajah penuh lebih dari **10 detik**, atau menutup
  kalimat personal/emosional/opini".

### Build

- Langkah baru "Author motion b-roll" (baca `motion-broll-authoring.md`): tulis
  satu sub-composition per brief, rangkai di `index.html` (track 4), tambah
  transform `#base-video` untuk split.
- Cek still di kata kunci, per clip:
  `GEMINI_API_KEY= npx hyperframes@0.7.24 snapshot --at <waktu host>` pada saat
  setiap state settle dan beberapa titik tengah morph. `GEMINI_API_KEY`
  dikosongkan agar frame tidak dikirim ke Gemini (`--describe` aktif otomatis bila
  key ada). Lihat setiap sheet; perbaiki yang sempit, terpotong, tak terbaca,
  meleset dari kata, atau kursor keluar frame; cek sekali lagi.
- Lalu `npm run check`, `npm run render -- --output renders/<slug>.mp4`, dan
  opsional `npm run render:blur -- --slug <slug>`.

### QA

Checklist tambahan: state jatuh di kata (±0,2 s), kursor di dalam frame di semua
zoom, teks terbaca di ukuran HP, aturan treatment (hook, jeda 2 s, R3 10 s), satu
aksen, tanpa angka karangan.

### Referensi baru

- `motion-broll-planning.md` (Screen Plan): kapan memakai motion b-roll, treatment,
  density, vocabulary 18 pola, aturan konten, Motion B-roll Brief.
- `motion-broll-authoring.md` (Build): API `M` dan `M.clip`, kerangka clip,
  pola teknis (indikator cair dengan edge `FAST`/`SLOW`, typing, baris/bar muncul
  di kata, direct manipulation/slider, drag-drop dengan `geom`, panel transparan),
  gotcha (tanpa `will-change` pada elemen yang di-scale kamera; teks berganti di
  container morph butuh `M.vis` `din/lin/lout`; label `mix-blend-mode` harus di
  layer yang punya blend mode; item di bawah highlight pakai `M.FAST`; kursor
  selalu di dalam frame; clip selesai dengan menahan state terakhir).

## Motion blur (`scripts/render-blur.mjs`)

- `npm run render:blur -- --slug <slug>`:
  1. `npx --yes hyperframes@0.7.24 render --fps 120 -o renders/.blur/<slug>-120.mp4`
  2. `ffmpeg -i renders/.blur/<slug>-120.mp4 -vf "tmix=frames=4,select='eq(mod(n\,4)\,3)',setpts=N/(30*TB)" -r 30 -c:a copy renders/<slug>-blur.mp4`
  3. hapus `renders/.blur/<slug>-120.mp4`.
- Video sumber 30 fps muncul 4× berturut-turut di render 120 fps, jadi 4 subframe
  yang dipadukan berasal dari frame sumber yang sama: wajah tetap tajam; yang
  kabur hanya elemen bergerak. Setara shutter 360° (engine asli 180°); satu mode
  di v1.
- Hanya modul bawaan Node + ffmpeg via `child_process` (ADR-0007).

## Pengujian

| Perintah | Isi | Lulus bila |
|---|---|---|
| `npm run test:motion-kit` | `node --test scripts/motion-kit.test.mjs`: memuat `vendor/motion-kit/motion-kit.js` di `node:vm` dengan stub `window`/`document`/`gsap`; menguji `S`, `track`, `ctrack`, `vis`, `path`, `presses`, `crossTimes`, `icon`, dan `M.clip` (timeline terdaftar dengan durasi `T`; `onUpdate` pada `t` memberi style yang sama dengan `seek(t)`) | semua test lulus |
| `npm run test:render-blur` | `node --test scripts/render-blur.test.mjs`: argumen render + string filter ffmpeg + path output | semua test lulus |
| `npm run check:broll-examples` | `scripts/check-broll-examples.mjs`: salin `docs/agents/references/motion-broll-examples/` + `vendor/gsap.min.js` + `vendor/motion-kit/` ke folder sementara, jalankan `hyperframes lint`, `validate`, dan `snapshot --at` pada waktu kata kunci tiap contoh | lint/validate tanpa error; sheet dicek mata |
| Uji render-blur pendek | render proyek contoh dengan `render:blur` | durasi = durasi render biasa ±1 frame, audio ada bila host punya audio, frame elemen diam identik dengan render biasa |

`npm run check` pada `index.html` saat ini bukan gerbang (WIP merujuk media yang
dihapus).

### Contoh (standar kualitas)

`docs/agents/references/motion-broll-examples/` berisi proyek HyperFrames kecil
(`index.html` host 1080×1920, `compositions/*.html`) dengan tiga clip:

1. **Cutaway** — pill + klik → card → check ("invoice terkirim otomatis").
2. **Split** — chat thread → before → after (topik bisnis).
3. **Panel** — timeline langkah di atas placeholder wajah (kotak abu-abu datar).

Teks contoh adalah kalimat buatan yang ditandai ilustratif; tanpa angka.

## Governance dan dokumen

- **ADR-0009 `motion-broll-motion-kit`**: engine di-vendor sebagai script klasik,
  clip = sub-composition, penggerak proxy `onUpdate` (bukti spike), motion blur
  opsional, prioritas visual baru, R3 10 s.
- **EARS**
  - `rd-02-composition-render.md`: WHERE a composition uses motion b-roll, the
    host SHALL load `vendor/motion-kit/motion-kit.js` once; each clip SHALL be a
    sub-composition whose timeline is registered synchronously under its
    `data-composition-id`; each frame SHALL depend only on clip-local time;
    WHEN `render:blur` runs, it SHALL render at 120 fps, blend 4 frames per output
    frame, keep the audio stream unchanged, and delete the 120 fps intermediate.
  - `rd-03-video-editing-workflow.md`: Screen Plan SHALL choose motion b-roll
    first for explain/show/compare/sequence lines; each motion-broll row SHALL
    record treatment and state-per-word; R3 SHALL use 10 s; Build SHALL snapshot
    each clip at its key-word times before render.
- **Diperbarui**: `docs/agents/02-screen-plan.md` (langkah visual + R3),
  `03-build.md` (langkah author + cek still), `04-qa.md` tidak berubah,
  `references/visual-planning.md` (prioritas + tipe), `references/qa-checklist.md`
  (checklist), `AGENTS.md` + `CLAUDE.md` (non-negotiable imagegen → motion b-roll
  dulu; bagian Commands), `docs/skills/dena-video-editing-workflow/references/quality-gates.md`
  (gate imagegen), style guide (overlay rules), `internal/docs/design-system/visual-system.md`
  (token motion b-roll, track 4), `architecture/stack.md`, `operations/runbook.md`
  (`render:blur`), `operations/video-editing-workflow.md`, `internal/docs/README.md`
  (ADR-0009), `THIRD_PARTY_NOTICES.md`, `package.json` (script baru).

## Risiko

- **Font belum termuat saat frame diambil** → `font-display: block` dan cek
  snapshot; bila tetap terjadi, tambahkan preload di host.
- **CSS engine global bentrok dengan CSS komposisi** → semua kelas berprefix
  `mk-`.
- **Beberapa clip di satu dokumen** → `M.clip` hanya mencari di dalam root clipnya.
- **Blur 360° terlalu kuat** → dicek di uji render-blur; bobot `tmix` dapat
  diatur di versi berikutnya.
- **Belum teruji di video nyata** → video pertama dengan motion b-roll dicatat di
  `operations/roadmap.md`.
