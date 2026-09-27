# 2.5D Parallax (Sub-proyek 3) — Design

Status: approved (brainstorming 2026-09-27), belum diimplementasi
Date: 2026-09-27
Sub-proyek: 3 dari rangkaian 7 gaya (ADR-0012), yang terakhir. Dibangun di atas
style-kit (ADR-0012), paper pack (ADR-0013), dan VOX/mix-media + `video cutout`
(ADR-0014).

## Latar belakang

Gaya ketujuh: sebuah gambar dipecah menjadi 2–5 lapisan kedalaman dan kamera
bergerak di antaranya (dolly, pan, orbit kecil, dolly-zoom), dengan depth of
field. Dena memilih ketiga sumber lapisan (foto/frame asli, adegan Codex
berlapis, kolase multiplane) dan treatment baru di mana latar parallax bergerak
di belakang cutout Dena yang tetap bicara.

## Bukti kelayakan (spike, 2026-09-27)

Proyek scratch, HyperFrames 0.7.24, `render` MP4: `#view` dengan
`perspective: 1200px`, `#world` `preserve-3d`, tiga lapisan (kraft gelap
z −1400, kertas krem z −500, cutout laptop z +200) dengan skala kompensasi
`(P − z) / P`, dolly 0→420 px, pan, dan blur DOF sebanding jarak dari bidang
fokus → lint 0 error; lapisan depan membesar paling cepat, belakang nyaris
diam; laptop dekat kamera blur, bidang fokus tajam. Pelajaran: skala
kompensasi harus berporos di tengah frame, jadi setiap lapisan adalah kontainer
full-frame.

Tooling lokal: onnxruntime (lewat HyperFrames) dengan model `u2net_human_seg`
saja; tidak ada model depth, tidak ada PyTorch. Pemisahan lapisan karenanya
memakai segmentasi orang, Codex, atau komposisi manual.

## Keputusan yang sudah diambil

- Sumber lapisan: foto/frame asli, adegan Codex berlapis, kolase multiplane.
- Treatment `parallax-stage`: latar parallax di belakang cutout Dena.
- Pendekatan A: multiplane CSS 3D; cadangan bila gagal: parallax 2D (geser per
  lapisan), bukan Three.js.

## Tujuan

- Gaya `parallax` siap pakai dengan referensi kaya (target sama seperti gaya
  lain) dan treatment `parallax-stage`.
- Engine: `SK.layer`, `SK.camera`, `SK.dof`, `SK.dollyZoom`, deterministik.
- CLI `npm run video -- layers` yang teruji.
- 4 contoh (`px-01..04`) lolos check; render MP4 membuktikan parallax di belakang
  cutout.

## Non-tujuan

- Model depth / pemisahan otomatis objek non-manusia.
- Three.js / WebGL.
- Mengubah contoh lama (harus tetap identik piksel). Push ke remote.

## Engine (style-kit)

| API | Perilaku |
|---|---|
| `SK.layer(el, z, {P=1200})` | Lapisan full-frame 1080×1920 di kedalaman `z`, skala `(P − z)/P`, poros tengah frame, sehingga komposisi tetap seperti rancangan saat kamera diam. |
| `SK.camera(world, {x, y, z, rx, ry})` | Transform `#world`: `z` dolly, `x`/`y` pan, `rx`/`ry` orbit kecil (≤ 6°). |
| `SK.dof(items, focusZ, {k, max})` | Blur tiap lapisan = `min(max, |z_efektif − focusZ| / k)`; `items = [{el, z}]`, `z_efektif` memperhitungkan dolly kamera. |
| `SK.dollyZoom(u, {P0, z0, z1})` | Menghitung perspektif dan dolly sehingga subjek pada `z0` tetap berukuran sama sementara latar meregang ("vertigo"). |

Semua fungsi murni dari waktu; bisa digabung `SK.onTwos` (multiplane patah-patah
ala Norstein). Struktur klip: `.sk-stage > #view (perspective) > #world
(preserve-3d) > .sk-ly` × 2–5.

## Treatment

| Treatment | Isi |
|---|---|
| cutaway / split / panel | Klip parallax biasa tanpa Dena. |
| `parallax-stage` | Resep host collage (ADR-0014): mount parallax opaque track 4, `<video>` cutout Dena track 6 (statis atau skala kecil dari host agar bibir terbaca), mount depan opsional track 7. Dena terlihat → tidak memicu R3/R4. |

## Sumber lapisan

### Foto/frame asli — CLI `npm run video -- layers <slug> --at <s> --name NN-scene [--image <file>]`

1. Sumber: frame `processed.mp4` pada `--at` (ffmpeg) atau file `--image`
   (foto user) → `assets/layers/NN-scene-src.png`.
2. `remove-background` → `assets/layers/NN-scene-fg.png` (orangnya).
3. Hapus output lama dulu; gagal bila output tidak tertulis. Validasi: tepat satu
   dari `--at`/`--image`; `--at` di dalam durasi `processed.mp4`; `--name`
   `^\d\d-[a-z0-9-]+$`.

Plate latar: skill `codex-image` dengan `--ref NN-scene-src.png`, resep tetap
"remove the person, fill the background naturally, keep everything else
unchanged" → `NN-scene-bg.png` (opaque). Manifest: `provenance: "reconstructed"`;
plate tidak pernah bukti. Bila tambalan terlihat palsu: tutup dengan bingkai/DOF
atau pindah ke kolase.

### Adegan Codex berlapis

Resep di `asset-production.md` (diuji spike di awal implementasi):
(1) adegan utuh sebagai acuan; (2) plate latar lewat edit dengan referensi
(opaque); (3) objek depan sebagai cutout transparan terpisah **tanpa**
referensi (referensi menghilangkan alpha), gaya dikunci lewat kata-kata. Spesifik
transkrip, tanpa teks, tanpa orang/brand nyata; `provenance: "generated"`.

### Kolase multiplane

Paper pack, cutout, capture, peta yang sudah ada, ditata di beberapa kedalaman.

## Contoh

| Klip | Isi | Treatment |
|---|---|---|
| `px-01` | kolase multiplane (paper pack + cutout + peta), dolly + DOF | cutaway |
| `px-02` | adegan Codex berlapis (mis. meja kerja malam), 3–4 lapisan, pan + orbit kecil | split |
| `px-03` | foto arsip domain publik: orang vs plate ditambal, dolly-zoom (Ken Burns 2.5D) | cutaway |
| `px-04` | `parallax-stage`: latar berlapis di belakang siluet placeholder | parallax-stage |

Foto `px-03` domain publik historis (mis. Library of Congress atau NASA), status
dicek di halaman asetnya dan dicatat; tidak ada foto orang biasa masa kini.
Smoke pipeline asli: frame Dena lewat `video layers` di proyek scratch (tidak
di-commit).

## Referensi `styles/parallax.md`

Struktur gaya lain + bagian **Layer Sources** dan **Depth Budget** (2–5 lapisan,
gerak kamera maksimal agar celah antar-lapisan tidak terlihat, blur maksimal
agar teks terbaca), dijaga `style-docs.test.mjs`:

- ≥ 12 pola (kandidat: dolly-in, pan-reveal, orbit-drift, dolly-zoom,
  rack-focus, push-through, layer-peel, foreground-wipe, multiplane-fog,
  map-flyover, photo-2.5d, stage-behind-speaker, stepped-multiplane).
- ≥ 6 referensi terverifikasi riset web (arah: kamera multiplane Disney / *The
  Old Mill*, Yuri Norstein, *The Kid Stays in the Picture*, Ken Burns,
  *Spider-Verse*, tutorial 2.5D photo parallax); judul tidak dikarang.
- ≥ 8 anti-slop (tepi "karton", bayangan orang tersisa di plate, celah
  antar-lapisan, blur pada teks, lapisan AI tak nyambung transkrip).

## Pengujian

- `style-kit.test.mjs`: `SK.layer` (skala kompensasi, poros), `SK.camera`,
  `SK.dof`, `SK.dollyZoom` (ukuran subjek tetap).
- `video.test.mjs`: `layers` — validasi, urutan perintah, hapus output lama,
  gagal bila tidak tertulis.
- `style-docs.test.mjs`: `parallax.md`, treatment wajib cutaway, split, panel,
  parallax-stage.
- `check:style-examples` 4 klip baru + tinjauan visual; contoh lama identik
  piksel; render MP4 host mini `px-04`.
- Smoke asli `video layers` + `video cutout`; regresi semua suite; smoke template.

## Governance dan dokumen

- ADR-0015 "2.5D parallax lewat multiplane CSS 3D" (accepted).
- EARS `rd-02`: lapisan full-frame + skala kompensasi, `parallax-stage`, CLI
  `layers`; `rd-03`: plate reconstructed bukan bukti, foto arsip harus domain
  publik, kemiripan Dena hanya dari footage.
- Menu `styles/README.md` (`parallax` available, baris pemilihan, Brief
  `Layers:`, `Camera:`, `Focus:`, treatment `parallax-stage`),
  `asset-production.md` (plate, adegan berlapis, `layers`), `02-screen-plan.md`,
  `03-build.md`, QA, quality gates, `visual-system.md`, `stack.md`,
  `runbook.md`, `THIRD_PARTY_NOTICES.md` (foto arsip), roadmap (7 gaya selesai),
  `CLAUDE.md`/`AGENTS.md`.

## Definisi selesai

- `parallax.md` memenuhi target kekayaan referensi.
- 4 contoh lolos check + tinjauan; render MP4 `px-04` membuktikan parallax di
  belakang cutout.
- CLI `layers` teruji unit + smoke asli.
- Semua test hijau; dokumen diperbarui.
- Branch `feat/parallax` di-merge fast-forward ke `main` lokal; tidak di-push.

## Risiko

- **CSS 3D + blur + video alpha di render** → spike sudah lolos untuk 3D + blur;
  video alpha tetap di host (terbukti di 2b).
- **Plate tambalan terlihat palsu** → label reconstructed, bingkai/DOF, atau
  kolase.
- **Konsistensi gaya lapisan Codex** → acuan adegan utuh + gaya dikunci kata;
  diuji spike, tolak yang tidak cocok.
- **Celah antar-lapisan saat kamera bergerak jauh** → Depth Budget + lapisan
  latar sedikit lebih besar dari frame.
- **Lisensi foto arsip** → hanya domain publik terverifikasi per aset.
