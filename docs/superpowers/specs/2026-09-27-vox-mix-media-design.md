# VOX + Mix-media (Sub-proyek 2b) — Design

Status: approved (brainstorming 2026-09-27), belum diimplementasi
Date: 2026-09-27
Sub-proyek: 2b dari rangkaian 7 gaya (ADR-0012). Dibangun di atas style-kit
(ADR-0012) dan paper pack (ADR-0013). Sub-proyek 3 (2.5D parallax) menyusul.

## Latar belakang

Setelah 2a, pipeline punya lima motion visual. 2b menambah dua gaya keluarga
kertas yang paling dekat dengan kebutuhan Dena: `vox` (dokumen/kliping dengan
highlighter tepat di kalimat yang diucapkan) dan `mix-media` (Dena tetap bicara,
dipotong dari footage-nya sendiri, di atas kolase kertas).

## Bukti kelayakan (spike, 2026-09-27)

Di scratchpad, dengan `videos/badiblum-storynight/processed.mp4` (1080×1920,
30 fps):

| Uji | Hasil |
|---|---|
| `remove-background` segmen 3 s (90 frame), CoreML | 21 s (4,3 fps), VP9 `ALPHA_MODE=1`, ±1,6 MB |
| Still talking-head | 43,4% piksel opaque; kursi di belakang bahu ikut sedikit |
| WebM alpha sebagai `<video class="clip">` host di atas `.sk-kraft`, `snapshot` | transparansi benar, video maju antar-waktu |
| Sinkron: snapshot host 1,0 s (klip mulai 0,5 s) vs frame sumber | paling cocok di 0,467–0,500 s → selisih < 1 frame |
| `hyperframes render --format=webm` | mendukung output transparan (untuk placeholder contoh) |

Jebakan yang ditemukan: di sesi agen dengan hook RTK, `npx … -o <file>`
bisa diubah sehingga npm memakan `-o`; `remove-background` tidak menulis apa pun
dan file lama terpakai ulang tanpa error. CLI `cutout` menghapus output lama dan
memverifikasi output baru (lihat CLI), dan agen menjalankan `rtk proxy npx …`.

## Keputusan yang sudah diambil

- Acuan look: riset kanon (tanpa link dari user).
- VOX memakai **capture asli atau dokumen ilustratif**.
- Mix-media: Dena **hidup di kolase** (cutout video bergerak, lip-sync tetap).
- Cutout dibuat lewat **CLI** `npm run video -- cutout`.
- Subjek contoh mix-media di repo: **siluet placeholder** (tanpa wajah siapa pun).

## Tujuan

- Gaya `vox` dan `mix-media` siap pakai dengan referensi kaya (target sama
  seperti gaya lain; mix-media memakai treatment `collage`).
- CLI `video cutout` yang teruji dan tidak bisa diam-diam memakai output lama.
- Engine: `SK.highlight` dan `SK.geo`; aset: peta Indonesia (Natural Earth,
  domain publik) dan font serif OFL.
- 8 contoh baru (`vx-01..04`, `mm-01..04`) lolos check; render MP4 membuktikan
  alpha ter-render.

## Non-tujuan

- 2.5D parallax (sub-proyek 3).
- Matte seluruh video sekali jalan; peta selain Indonesia; peta 3D/Google Earth.
- Mengubah klip contoh lama (harus tetap identik piksel).
- Push ke remote.

## VOX

### Dokumen

| Jenis | Sumber | Wajib di layar |
|---|---|---|
| `capture` | Screenshot asli dari riset Screen Plan (artikel, dokumen, website, tool yang disebut), `assets/captures/NN-name.png` via aturan capture di `asset-production.md` | baris sumber (media/domain, tanggal) ≥ 28 px, terlihat ≥ 1,5 s; data privat diredaksi (R2) |
| `illustrative` | Lembar generik di dalam klip: judul dari transkrip, badan teks berupa baris abu-abu (bukan teks palsu) | tag **"Ilustrasi"**; tanpa masthead/layout media nyata; tanpa angka karangan |

Highlight hanya pada frasa yang diucapkan dan maknanya sama dalam kalimat
utuhnya; crop tidak boleh membuang kualifikasi ("perkiraan", tanggal).

### Look (`.sk-vox`)

Latar `.sk-newsprint`/`.sk-paper-cream`, tinta hitam, highlighter kuning
(multiply, tepi tak rata), pena merah, grain; gerak di-step `SK.onTwos`
(15 langkah/detik, padanan 12-di-24). Font serif OFL (mis. Newsreader, subset
latin via fontsource, di-vendor) lewat `.sk-serif` untuk judul dan pull-quote.

### Engine dan aset

| API / aset | Perilaku |
|---|---|
| `SK.highlight(el, u)` | Sapuan kiri→kanan via `clip-path` pada elemen `.sk-hl` (kuning, multiply) atau `.sk-redact` (hitam); dipakai di atas teks HTML atau di koordinat capture. |
| `SK.geo(lat, lon)` | Proyeksi equirectangular ke koordinat `map-indonesia.svg` (bbox tetap), sehingga pin kota jatuh di tempat sebenarnya. |
| `vendor/paper-pack/map-indonesia.svg` | Garis pantai Indonesia disederhanakan dari Natural Earth (domain publik), < 60 KB, tercatat di `LICENSES.md`. |
| `vendor/style-kit/fonts/<serif>.woff2` + OFL | Font serif untuk `.sk-serif`, tercatat di `THIRD_PARTY_NOTICES.md`. |

Sisanya memakai primitive yang ada: pena (`SK.ellipse`, `SK.line`,
`SK.drawSeq`), doc-push (`SK.cam` + `SK.onTwos`), stamp (`'slam'`),
clipping-stack (`SK.piece`, `SK.torn`).

### Contoh

| Klip | Pola | Treatment |
|---|---|---|
| `vx-01` | dokumen ilustratif + highlight-sweep + tag Ilustrasi | cutaway |
| `vx-02` | capture asli halaman Wikipedia (CC BY-SA, baris sumber) + circle-annotate + doc-push | split |
| `vx-03` | map-zoom Indonesia, pin di Jakarta | cutaway |
| `vx-04` | clipping-stack + stamp | panel |

## Mix-media

### Arsitektur host (treatment `collage`)

- **Cutout** = media milik host: `<video class="clip" src="assets/cutouts/NN-dena.webm" muted>`
  di track 6, z 24 (di atas kolase z 22, di bawah caption z 45), `data-start`
  sama dengan jendela klip; segmen di-matte dari `processed.mp4` pada detik yang
  sama.
- **Kolase belakang** = mount style-kit di track 4.
- **Lapisan depan** (opsional) = mount kedua di track 7, z 26: panah, doodle,
  stiker yang menimpa Dena.
- **Base video** disembunyikan lewat timeline host:
  `tl.set('#base-video', {opacity: 0}, start)` dan dikembalikan di akhir; audio
  tetap `#base-audio`.
- **Look cutout**: `.sk-sticker-cut` — outline #F6F2E9 8–14 px (drop-shadow
  berlapis) + bayangan keras satu arah; outline menyamarkan tepi matte (rambut,
  tangan, kursi). Kolase bergerak on twos; Dena tetap 30 fps.
- Dena tetap terlihat, jadi `collage` tidak memicu R3/R4.

### CLI `npm run video -- cutout <slug> --from <s> --dur <s> --name NN-dena`

1. Validasi: `--from` ≥ 0; 0 < `--dur` ≤ 15; `--name` cocok `^\d\d-[a-z0-9-]+$`;
   `processed.mp4` ada dan `from + dur` ≤ durasinya.
2. Hapus `assets/cutouts/<name>.webm` dan `assets/frames/<name>-seg.mp4` lama.
3. `ffmpeg -ss <from> -t <dur> -i processed.mp4 -an -c:v libx264 -crf 16 assets/frames/<name>-seg.mp4`.
4. `npx --yes hyperframes@0.7.24 remove-background <seg> -o assets/cutouts/<name>.webm`.
5. Gagal dengan pesan jelas bila output tidak ada atau berukuran 0.

Diuji di `video.test.mjs` dengan runner tiruan.

### Contoh

Semua `collage`, subjek `style-examples/assets/placeholder-cutout.webm`: siluet
abu yang sedikit bergerak, dirender HyperFrames (`--format=webm`, transparan)
dari `style-examples/sources/placeholder-cutout/` (ikut di-commit, dengan
perintah render ulang).

| Klip | Pola |
|---|---|
| `mm-01` | collage-backdrop + sticker-outline + doodle-halo |
| `mm-02` | screenshot-orbit + arrow-to-speaker |
| `mm-03` | torn-window + cut-in-object |
| `mm-04` | polaroid-frame + paper-strip-caption |

Smoke pipeline asli: proyek scratch di `videos/` (tidak di-commit) dengan footage
Dena → `video cutout` → render MP4 pendek → cek visual lip-sync dan outline.

## Referensi

`styles/vox.md` dan `styles/mix-media.md` mengikuti struktur gaya lain
(When To Use, Look, Timing, Patterns, References, Build Recipe, SFX, Examples,
Anti-slop Checklist) dan dijaga `style-docs.test.mjs`:

- `vox.md`: ≥ 12 pola (15 kandidat dari riset: highlight-sweep, pen-underline,
  circle-annotate, doc-push, clipping-stack, pinned-source, redact-bar,
  pull-quote, map-zoom, archival-pan, stamp, source-line, split-docs,
  arrow-callout, before-after-doc), ≥ 6 referensi terverifikasi (11 dari riset:
  PremiumBeat, Storybench, Estelle Caswell, The Open Notebook, No Film School,
  Ken Burns/City of Gold, *Explained*, dst.), bagian **Document Ethics**.
- `mix-media.md`: ≥ 12 pola (15 kandidat: collage-backdrop, sticker-outline,
  doodle-halo, torn-window, screenshot-orbit, arrow-to-speaker, polaroid-frame,
  halftone-duotone, cut-in-object, paper-strip-caption, scrapbook-stack,
  zoom-punch-cutout, split-self, scribble-emphasis, grid-backdrop), ≥ 6
  referensi terverifikasi (12 dari riset: Hannah Höch, Richard Hamilton, zine,
  Spider-Verse, Spider-Punk, Mitchells vs. the Machines, dst.), bagian
  **Matte Notes**.
- Tautan hanya yang dibuka saat riset; judul tidak dikarang.

## Workflow

- Menu `styles/README.md`: `vox`, `mix-media` → `available`; baris baru di
  "Choosing A Style"; treatment `collage`; Brief mendapat `Document:
  capture|illustrative` + `Source line:` (vox) dan `Cutout: from, dur, name`
  (mix-media); Build Contract mendapat resep host collage.
- `02-screen-plan.md`, `03-build.md` (4a: jalankan `video cutout`, pasang video
  host + mount, sembunyikan base video), `visual-planning.md`,
  `asset-production.md` (capture untuk VOX, cutout Dena lewat CLI), QA,
  quality gates, template starter (komentar resep collage).
- Gate 2 R6 diperluas: dokumen ilustratif yang meniru media/brand nyata.

## Pengujian

- `video.test.mjs`: validasi `cutout`, urutan perintah, penghapusan output lama,
  gagal bila output tidak tertulis.
- `style-kit.test.mjs`: `SK.highlight`, `SK.geo` (Jakarta dan Surabaya di dalam
  bbox peta, urutan barat→timur benar).
- `paper-pack.test.mjs`: peta SVG tercatat; `style-docs.test.mjs`: `vox.md`,
  `mix-media.md`, treatment wajib per gaya (mix-media: `collage`).
- `check:style-examples` untuk 8 klip baru + tinjauan visual; contoh lama tetap
  identik piksel; render MP4 host contoh (alpha ter-render).
- Smoke pipeline asli (scratch, tidak di-commit); regresi semua suite; smoke
  template.

## Governance dan dokumen

- ADR-0014 "VOX dan mix-media" (accepted).
- EARS `rd-02`: cutout track 6 + base video disembunyikan + output CLI
  terverifikasi; `rd-03`: capture wajib baris sumber, ilustrasi wajib tag
  "Ilustrasi", highlight sesuai konteks, kemiripan Dena hanya dari footage,
  R6 diperluas.
- `internal/docs/README.md`, `visual-system.md`, `stack.md`,
  `composition-implementation.md`, `runbook.md` (perintah cutout),
  `video-editing-workflow.md`, `roadmap.md`, `THIRD_PARTY_NOTICES.md`
  (Natural Earth, font serif, Wikipedia CC BY-SA), `CLAUDE.md`/`AGENTS.md`.

## Definisi selesai

- `vox.md` dan `mix-media.md` memenuhi target kekayaan referensi.
- 8 contoh baru lolos check dan tinjauan; render MP4 membuktikan alpha.
- CLI `cutout` teruji unit dan lolos smoke dengan footage asli.
- Semua test hijau; dokumen diperbarui.
- Branch `feat/vox-mix-media` di-merge fast-forward ke `main` lokal; tidak di-push.

## Risiko

- **Tepi matte kasar (rambut, tangan cepat, kursi)** → outline stiker, bingkai
  kertas, jaga area tepi tetap tenang; dicek di smoke.
- **Durasi matting** (±7 s per 1 s footage) → segmen ≤ 15 s per klip.
- **Ukuran WebM** (±0,5 MB/s) → aset per video tidak di-commit; placeholder
  contoh ≤ 1 MB.
- **Dokumen ilustratif terbaca sebagai bukti palsu** → tag Ilustrasi wajib,
  larangan masthead, Gate 2 R6.
- **Peta salah** → hanya dari Natural Earth + `SK.geo` lat/lon, diuji.
