# Paper Pack + Stop-motion (Sub-proyek 2a) — Design

Status: approved (brainstorming 2026-09-27), belum diimplementasi
Date: 2026-09-27
Sub-proyek: 2a dari rangkaian 7 gaya (ADR-0012). Dibangun di atas style-kit
(`docs/superpowers/specs/2026-09-27-style-kit-design.md`). Sub-proyek 2b (VOX +
mix-media) dan 3 (2.5D parallax) menyusul.

## Latar belakang

Sub-proyek 1 menambah `broll-text`, `motion-graphic`, dan `whiteboard` yang
sepenuhnya dibangun dari kode. Gaya keluarga kertas (stop-motion, VOX,
mix-media) butuh aset bitmap: tekstur kertas, selotip, tangan, dan cutout objek
per video. Sub-proyek 2 dipecah: 2a menyiapkan paper pack, pipeline aset per
video, gaya `stop-motion`, dan tangan whiteboard; 2b memakai semuanya untuk VOX
dan mix-media (Dena tetap bicara di atas kolase, lewat cutout video ber-alpha).

## Keputusan yang sudah diambil

- Acuan look: riset kanon (tanpa link dari user); dicek lewat contoh render.
- Paper pack sumber campuran: tekstur/scan kertas asli dari CC0 (ambientCG),
  sisanya (selotip, tangan, pin, klip, sticky note) di-generate Codex; semua
  di-vendor di repo dengan lisensi tercatat.
- Mix-media (2b) memakai cutout video Dena yang bergerak; 2a hanya menyiapkan
  pipeline cutout foto (remove-background untuk still).
- Pecahan sub-proyek 2: 2a (dokumen ini) lalu 2b.

## Tujuan

- `vendor/paper-pack/` berisi aset dasar yang dipakai ulang semua video, dengan
  `LICENSES.md` per file, total ≤ 5 MB.
- style-kit v2: primitive stop-motion, kertas, grain, dan tangan whiteboard.
- Gaya `stop-motion` siap pakai dengan referensi kaya (target sama seperti
  sub-proyek 1).
- Pipeline aset per video yang terdokumentasi: cutout Codex, aset CC0 yang
  dibekukan, dan cutout foto via remove-background, semuanya dengan provenance.
- Tangan whiteboard sebagai opsi (`Pen: hand`), default tetap marker.

## Non-tujuan

- VOX dan mix-media (2b), 2.5D parallax (3).
- Cutout video ber-alpha (2b).
- Mengubah perilaku klip sub-proyek 1 (contoh lama harus tetap identik).
- Push ke remote.

## Paper pack (`vendor/paper-pack/`)

| Aset | Sumber | Format |
|---|---|---|
| Kertas krem, putih, abu (3–4 varian) | ambientCG `Paper00x` (CC0), di-crop/kompres ke 1080×1920 | JPG ≤ 400 KB |
| Kraft/kardus (2 varian) | ambientCG `Cardboard00x` (CC0) | JPG |
| Buku tulis bergaris, grid | kertas CC0 + garis CSS | kode (style-kit) |
| Koran | kertas CC0 + blok teks abu kabur (bukan teks asli) | kode |
| Grain/debu | SVG `feTurbulence` ber-seed | kode |
| Tepian sobek | `SK.torn(...)` → `clip-path` | kode |
| Selotip (2–3 varian) | Codex, PNG transparan | PNG |
| Tangan memegang marker: pose `write`, `point` | Codex, PNG transparan, gaya flat serasi line art | PNG |
| Pin, klip kertas, sticky note | Codex, PNG transparan | PNG |

Aturan:

- `vendor/paper-pack/LICENSES.md`: satu baris per file — nama, sumber
  (URL aset + id untuk CC0; `codex` + prompt untuk generated), lisensi,
  tanggal. CC0 diverifikasi di halaman asetnya saat diunduh.
- Aset Codex dibuat lewat skill `codex-image`, dicek visual, dan ditolak bila
  terlihat generik/AI (tepi kabur, tekstur plastik, jari ganjil, teks).
- Titik ujung pena pada PNG tangan diukur sekali dan disimpan sebagai konstanta
  di style-kit.
- Total ≤ 5 MB; repo tanpa LFS.

## style-kit v2

Semua fungsi murni dari `t`, ber-seed, tanpa `Math.random`.

| API | Perilaku |
|---|---|
| `SK.stepTime(t, 12)` (sudah ada) | Waktu stop-motion; kurva `M.track`/spring dievaluasi pada `ts` agar gerak "on twos". |
| `SK.piece(el, pose, seed, t, {fps=12, amp=2})` | Transform cutout ke `pose = {x, y, r, s}` + replacement jitter per frame yang ditahan (±`amp` px, ±0.3·`amp`°). |
| `SK.cycle(ts, n, fps=12)` | Indeks gambar untuk replacement animation (0..n-1, berulang). |
| `SK.torn(w, h, seed, {edges='trbl', amp=8, step=14})` | String `polygon(...)` untuk `clip-path`: tepi sobek deterministik pada sisi yang dipilih. |
| `SK.grain(el, t, seed, {fps=12})` | Menggeser `background-position` overlay grain per frame, deterministik. |
| `SK.placeHand(el, tip, {pose='write'})` | Menaruh PNG tangan dengan ujung pena tepat di `tip`; bila `tip` null, tangan bergeser keluar frame (bukan hilang mendadak). |
| `SK.HAND` | Konstanta file dan titik ujung pena per pose. |

CSS baru di `style-kit.css`:

- `.sk-paper-cream`, `.sk-paper-white`, `.sk-kraft`, `.sk-newsprint`,
  `.sk-lined`, `.sk-grid`: latar tekstur `url(../paper-pack/...)` + garis CSS.
- `.sk-cut` (bayangan kertas terangkat), `.sk-tape`, `.sk-grain`.
- Tema `.sk-stop`: latar kraft/krem, tinta hitam hangat, aksen merah bata; font
  tetap lewat `.sk-display`, `.sk-sans`, `.sk-hand`.

Aturan sub-proyek 1 tetap: tanpa `visibility`, tanpa `font-family` di `<style>`
klip.

### Spike wajib (awal implementasi)

Buktikan di proyek contoh dan di `videos/<slug>/` (symlink `vendor`):

1. `<img src="vendor/paper-pack/...">` di dalam sub-composition lolos `lint`,
   `validate`, `snapshot`, dan `render`;
2. `url(../paper-pack/...)` di `style-kit.css` ter-resolve;
3. PNG transparan tampil dengan alpha benar.

Bila path relatif host gagal, spec direvisi sebelum lanjut (mis. inline aset
atau path lain), bukan diakali diam-diam.

## Pipeline aset per video

Bagian baru "Style Assets" di `docs/agents/references/asset-production.md`,
dijalankan di Build sebelum klip ditulis.

- Style B-roll Brief mendapat field `Assets:` — tiap cutout/gambar dengan
  sumbernya: `codex`, `cc0`, `dena-footage`, `user`. Screen Plan memutuskan
  sumber; Build memproduksi.
- **Cutout Codex** → `videos/<slug>/assets/cutouts/NN-name.png` (PNG
  transparan) lewat `codex-image`. Resep prompt tetap: "flat paper cutout,
  visible paper fibre, thin white border, soft paper shadow, no text, no
  letters, plain transparent background, <objek spesifik dari transkrip>".
  Dicek dengan checklist anti-slop; manifest `provenance: "generated"` +
  `promptSummary`.
- **Aset CC0** → `videos/<slug>/assets/cc0/`: hanya ambientCG, Poly Haven,
  dan Wikimedia Commons berlabel CC0/PD (dicek per file). Manifest mencatat
  URL, id, lisensi, tanggal unduh.
- **Cutout foto** (Dena atau foto user) → `npx hyperframes remove-background
  <frame.png> -o <cutout.png>`; frame Dena diambil dari `processed.mp4` dengan
  ffmpeg.
- Larangan: kemiripan Dena tidak pernah di-generate (hanya dari footage);
  generated yang menggambarkan orang/brand nyata tetap Gate 2 R6; teks di dalam
  gambar generated dilarang.

## Gaya `stop-motion`

`docs/agents/references/styles/stop-motion.md`, struktur sama dengan tiga gaya
sub-proyek 1 dan dijaga `style-docs.test.mjs`:

- ≥ 12 pola. Kandidat: slide-on-twos, pop-up, fold/unfold, tear-reveal,
  pin-and-swap, replacement-face, paper-scroll, stack-pile, sticky-wall,
  flip-card, tape-on, crumple-away.
- ≥ 6 referensi terverifikasi lewat riset web (arah awal: Terry Gilliam /
  Monty Python, Lotte Reiniger, awal South Park, Yuri Norstein); judul tidak
  dikarang.
- ≥ 8 butir anti-slop; Look (palet default + alternatif), Timing (12 fps,
  hold, jitter), Build Recipe, SFX (paper rustle, tap, tape rip).
- 4 contoh `sm-01..04` di `docs/agents/references/style-examples/` meliputi
  cutaway, split, panel; mencampur potongan kertas kode (SVG + tekstur +
  sobekan) dan cutout Codex yang disimpan di `style-examples/assets/`.

Menu `styles/README.md`: `stop-motion` menjadi `available`, baris baru di
"Choosing A Style" (mis. proses fisik/manual, cerita dengan objek konkret,
nada hangat/handmade).

## Tangan whiteboard

- Brief whiteboard mendapat `Pen: marker | hand` (default `marker`).
- Contoh baru `wb-05-hand` memakai `SK.placeHand`. Contoh `wb-01..04` tidak
  berubah.
- `whiteboard.md` diperbarui (Look, Build Recipe, Examples); catatan lama
  "realistic hand not used" diganti aturan: hanya tangan flat dari paper pack.

## Pengujian

- `scripts/style-kit.test.mjs`: tambahan untuk `piece`, `cycle`, `torn`,
  `grain`, `placeHand`, `HAND`.
- `scripts/paper-pack.test.mjs` (baru): setiap file di `vendor/paper-pack/`
  tercatat di `LICENSES.md` dengan sumber + lisensi; setiap PNG punya alpha
  (IHDR color type 4/6, dibaca dengan modul bawaan Node); total ≤ 5 MB. Masuk
  `npm run test:style-kit`.
- `scripts/style-docs.test.mjs`: tambah `stop-motion.md`; syarat contoh jadi
  minimal 4 per gaya (whiteboard punya 5).
- `npm run check:style-examples`: lint/validate/snapshot termasuk `sm-*` dan
  `wb-05`; contact sheet ditinjau terhadap checklist anti-slop.
- Regresi: semua suite yang ada tetap hijau; smoke template
  (`video new` → `check`) lalu hapus.

## Governance dan dokumen

Diperbarui di commit yang sama dengan kodenya:

- ADR-0013 "Paper pack dan aset bitmap per video" (accepted).
- EARS: `rd-02` (paper pack lokal, lisensi per file, PNG ber-alpha, aset
  direferensikan lewat `vendor/paper-pack/`); `rd-03` (field `Assets:`,
  provenance di manifest, kemiripan Dena hanya dari footage).
- `internal/docs/README.md`, `docs/agents/references/asset-production.md`,
  `styles/README.md`, `styles/whiteboard.md`, `qa-checklist.md`,
  `THIRD_PARTY_NOTICES.md`, `internal/docs/design-system/visual-system.md`,
  `internal/docs/operations/roadmap.md`, dan entry doors bila perintah baru
  ditambah.

## Definisi selesai

- Paper pack lengkap, lolos `paper-pack.test.mjs`, aset Codex lolos tinjauan
  visual.
- `stop-motion.md` memenuhi target kekayaan referensi.
- 5 contoh baru (`sm-01..04`, `wb-05-hand`) lolos `check:style-examples` dan
  tinjauan; 12 contoh lama tetap identik.
- Semua test hijau; dokumen di Governance diperbarui.
- Branch `feat/paper-pack` di-merge fast-forward ke `main` lokal; tidak di-push.

## Risiko

- **Path aset relatif host gagal di sub-composition** → spike wajib di awal.
- **Aset Codex terlihat AI/generik** → resep prompt tetap, tinjauan visual,
  regenerasi; aset gagal ditolak, bukan dipakai.
- **Ukuran repo** → kompresi JPG/PNG, batas 5 MB diuji.
- **Lisensi CC0 salah label** → hanya sumber yang lisensinya per aset bisa
  dicek; URL dan tanggal dicatat.
- **Stop-motion terasa patah bukan "handmade"** → jitter per frame kecil,
  bayangan kertas, grain hidup; masuk checklist anti-slop.
