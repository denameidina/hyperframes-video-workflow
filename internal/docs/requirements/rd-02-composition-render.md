# RD-02 Composition & Render
Status: accepted (reverse-engineered)
Date: 2026-09-30

Domain: kontrak komposisi HyperFrames + render deterministik. Owner: `index.html`,
`compositions/*.html`, CLI HyperFrames. Diturunkan dari `index.html`, AGENTS.md,
`docs/agents/03-build.md`, `docs/agents/references/hyperframes-assembly.md`, `hyperframes.json`.

## Struktur root

- **RD-02-01** (Ubiquitous) — The system shall memberi root komposisi
  `data-composition-id` stabil serta `data-width`, `data-height`, dan
  `data-duration` (detik) eksplisit.
- **RD-02-02** (Ubiquitous) — The system shall memakai ukuran sosial default
  `1080x1920` (9:16) untuk komposisi Dena.

## Elemen ber-waktu

- **RD-02-03** (Ubiquitous) — The system shall memberi setiap elemen ber-waktu
  atribut `data-start`, `data-duration`, dan `data-track-index`.
- **RD-02-04** (Ubiquitous) — The system shall memberi `class="clip"` pada setiap
  elemen ber-waktu yang tampil selain mount `data-composition-src`; framework
  mengelola mount tersebut sebagai sub-composition tanpa `class="clip"` agar
  kontrol visibilitas tidak bertabrakan.
- **RD-02-05** (Unwanted) — If dua elemen berbagi `data-track-index` sama, then
  the system shall memastikan rentang waktunya tidak tumpang tindih.
- **RD-02-06** (Ubiquitous) — The system shall menggunakan `data-track-index`
  hanya untuk tumpang tindih temporal, dan CSS `z-index` untuk urutan paint.

## Timeline

- **RD-02-07** (Ubiquitous) — The system shall mendaftarkan satu timeline GSAP
  `paused` per komposisi di `window.__timelines[<data-composition-id>]`.
- **RD-02-08** (Unwanted) — If komposisi memakai `Date.now()`, `Math.random()`,
  timer, `fetch`/network, atau interaksi user, then the render dianggap tidak
  deterministik dan harus ditolak.
- **RD-02-09** (Ubiquitous) — The system shall memuat GSAP dari lokal
  `vendor/gsap.min.js`, bukan remote.

## Media

- **RD-02-10** (Ubiquitous) — The system shall membuat elemen `<video>` `muted`
  dan menyediakan track audio utama lewat elemen `<audio>` terpisah.
- **RD-02-11** (Optional) — Where elemen `<audio>` SFX ada, the system shall
  mengatur levelnya via `data-volume` sehingga audible namun di bawah speech.
- **RD-02-12** (Ubiquitous) — The system shall mereferensikan hanya aset lokal
  (mis. `videos/<slug>/assets/...`) di komposisi.

## Motion b-roll

- **RD-02-15** (Optional) — Where komposisi memakai motion b-roll, host
  `index.html` shall memuat `vendor/motion-kit/motion-kit.js` dan
  `vendor/motion-kit/motion-kit.css` tepat sekali, setelah `vendor/gsap.min.js`.
- **RD-02-16** (Ubiquitous) — Setiap clip motion b-roll shall berupa
  sub-composition di `compositions/broll/` yang memanggil `M.clip(id, cfg)` secara
  sinkron, sehingga timeline paused terdaftar di `window.__timelines[id]` dengan
  durasi `cfg.T`.
- **RD-02-17** (Ubiquitous) — Setiap frame clip motion b-roll shall hanya
  bergantung pada waktu lokal clip, tanpa timer, `requestAnimationFrame`, atau
  jam render.
- **RD-02-18** (Event-driven) — When `npm run render:blur -- --slug <slug>`
  dijalankan, the system shall merender pada 4× fps (120 untuk 30 fps), memadukan
  4 frame per frame output dengan ffmpeg `tmix`, menyalin stream audio tanpa encode
  ulang, menulis `renders/<slug>-blur.mp4`, dan menghapus file antara 120 fps.
- **RD-02-19** (Unwanted) — If `--slug` berisi karakter selain huruf kecil, angka,
  dan tanda hubung, then `render:blur` shall menolak tanpa merender.

## Proyek per video

- **RD-02-20** (Ubiquitous) — The system shall menjaga `index.html` root sebagai
  template HyperFrames blank portrait; komposisi video shall hidup di
  `videos/<slug>/index.html`.
- **RD-02-21** (Event-driven) — When `npm run video -- new <slug>` dijalankan,
  the system shall menyalin `templates/dena-video/` ke `videos/<slug>/`, mengganti
  `__SLUG__` dan `__DURATION__`, membuat `compositions/broll/` dan `assets/`, dan
  membuat symlink `vendor -> ../../vendor`.
- **RD-02-22** (Unwanted) — If `videos/<slug>/index.html` sudah ada, then
  `video new` shall menolak tanpa mengubah file apa pun.
- **RD-02-23** (Event-driven) — When `npm run video -- render <slug>` dijalankan,
  the system shall merender `videos/<slug>` ke `videos/<slug>/renders/<slug>.mp4`
  (atau `<slug>-blur.mp4` dengan `--blur`).
- **RD-02-24** (Ubiquitous) — Proses anak `scripts/video.mjs` shall berjalan tanpa
  `GEMINI_API_KEY` di environment.

## Style b-roll

- **RD-02-25** (Ubiquitous) — Starter `templates/dena-video/index.html` shall
  memuat `vendor/style-kit/style-kit.js` dan `vendor/style-kit/style-kit.css`
  tepat sekali, setelah `vendor/motion-kit/motion-kit.js`.
- **RD-02-26** (Ubiquitous) — Setiap clip style b-roll shall berupa
  sub-composition di `compositions/broll/` yang memanggil `SK.clip(id, cfg)`
  secara sinkron, sehingga timeline paused terdaftar di `window.__timelines[id]`
  dengan durasi `cfg.T`, dan setiap frame hanya bergantung pada waktu lokal clip.
- **RD-02-27** (Unwanted) — If sebuah elemen di dalam clip style b-roll perlu
  disembunyikan, then clip shall memakai `opacity` atau `display`, bukan
  `visibility`, agar elemen tidak tampil setelah mount clip disembunyikan.
- **RD-02-28** (Ubiquitous) — Clip style b-roll shall memilih font lewat kelas
  `.sk-display`, `.sk-sans`, atau `.sk-hand` dan tidak menyebut `font-family`
  di `<style>` clip; font berasal dari file lokal di `vendor/`.
- **RD-02-29** (Ubiquitous) — Setiap file di `vendor/paper-pack/` shall tercatat
  di `vendor/paper-pack/LICENSES.md` dengan sumber dan lisensinya, setiap PNG-nya
  shall punya kanal alpha, dan total paket shall ≤ 5 MB.
- **RD-02-30** (Ubiquitous) — Starter shall memuat
  `vendor/paper-pack/paper-pack.css` setelah `style-kit.css`, dan url di
  stylesheet kit shall tidak memakai `../`.
- **RD-02-31** (Ubiquitous) — Clip `stop-motion` shall menggerakkan potongan
  kertas pada grid `SK.STOP_FPS` (15 langkah per detik, tiap pose tertahan dua
  frame pada render 30 fps) lewat `SK.onTwos`/`SK.piece`, tanpa motion blur atau
  crossfade.
- **RD-02-32** (Ubiquitous) — Clip `mix-media` shall terdiri dari mount kolase
  opaque full-frame di track 4, `<video>` cutout ber-alpha milik host di track 6
  (z 24, `muted`, waktu sama dengan jendela klip), dan mount depan opsional di
  track 7 (z 26); opacity `#base-video` shall tidak di-tween.
- **RD-02-33** (Event-driven) — When `npm run video -- cutout <slug> --from <s>
  --dur <s> --name NN-name` dijalankan, the system shall memvalidasi argumen
  (`--dur` ≤ 15 s, segmen di dalam durasi `processed.mp4`), menghapus output lama,
  memotong segmen dengan ffmpeg, menjalankan `remove-background`, dan menulis
  `assets/cutouts/<name>.webm`.
- **RD-02-34** (Unwanted) — If `remove-background` tidak menulis output atau
  outputnya kosong, then `video cutout` shall gagal dengan pesan yang menyebut
  file tersebut.
- **RD-02-35** (Ubiquitous) — Clip `parallax` shall menyusun 2–5 lapisan
  full-frame `.sk-ly` di dalam `.sk-view` (perspective) dan `.sk-world`
  (preserve-3d), menempatkan tiap lapisan lewat `SK.layer` (skala kompensasi
  `(P − z) / P` berporos di tengah view) dan menggerakkan kamera lewat
  `SK.camera`, sebagai fungsi murni waktu lokal clip.
- **RD-02-36** (Ubiquitous) — Treatment `parallax-stage` shall memakai resep host
  collage: mount parallax opaque di track 4, `<video>` cutout Dena di track 6,
  mount depan opsional di track 7.
- **RD-02-37** (Event-driven) — When `npm run video -- layers <slug> (--at <s> |
  --image <file>) --name NN-name` dijalankan, the system shall memvalidasi
  argumen (tepat satu sumber, `--at` di dalam durasi `processed.mp4`), menghapus
  output lama, mengambil sumber ke `assets/layers/<name>-src.png`, menjalankan
  `remove-background` ke `<name>-fg.png`, dan gagal bila salah satunya tidak
  tertulis.
- **RD-02-38** (Ubiquitous) — Setiap file yang dirujuk contoh di
  `docs/agents/references/style-examples/` shall ter-track di git.

## Craft-kit

- **RD-02-39** (Ubiquitous) — The craft-kit shall produce, for every recipe,
  `CK.at` values equal to the values GSAP renders from `CK.add` at the same local
  time, within 0,01 (px, derajat, rasio) at 30 fps samples.
- **RD-02-40** (Ubiquitous) — The craft-kit shall end every non-exit recipe in
  the final state listed in `docs/agents/references/motion-craft.md`, within 0,001.
- **RD-02-41** (Event-driven) — When `exit` runs, the craft-kit shall keep
  opacity ≥ 0,5 until the element has travelled at least 80% of `dist` in the
  `dir` direction.
- **RD-02-42** (Ubiquitous) — The craft-kit shall return identical `CK.sample`
  output for identical `(name, t, opts)` across calls and loads, and shall not
  read clocks or `Math.random`.
- **RD-02-43** (Unwanted) — If a recipe name, `dir`, or clip `shape` is unknown,
  then the craft-kit shall throw `craft-kit: unknown recipe|dir|clip shape "<x>"`.
- **RD-02-44** (Unwanted) — If `craft-kit.js` loads before GSAP, then it shall
  throw `craft-kit: load gsap before craft-kit.js`.
- **RD-02-45** (Optional) — Where `opts.stagger` is set with N targets, the
  craft-kit shall start target *i* exactly `i × stagger` seconds after target 0
  in both modes.
- **RD-02-46** (Ubiquitous) — The craft examples host
  (`docs/agents/references/craft-examples/`) shall pass `lint`, `validate`, and
  snapshot rendering with one clip per recipe.
- **RD-02-47** (Event-driven) — When `CK.add` places a recipe at time 0, or places
  an entrance recipe at any time, the craft-kit shall render that recipe's first
  frame at frame 0, including after seeking back to 0.

## Paket aset transisi motion-linked-v1 (produksi lokal)

- **RD-02-48** (Optional) — Where the motion-linked-v1 asset pack is produced,
  the pack shall contain seven presets: shared-element, shape-match,
  motion-match, object-wipe, camera-handoff, shape-morph, semantic-handoff.
- **RD-02-49** (Optional) — Where the pack exists, each preset shall use a
  1080×1920, 30 fps, 3-second timebase and one deterministic, paused, registered timeline.
- **RD-02-50** (Event-driven) — When a preset is exported as WebM, its first
  and last frame shall have alpha zero at every pixel, and its frame at 1.5 s
  shall contain visible pixels.
- **RD-02-51** (State-driven) — While object-wipe hides the cut at local 1.5 s,
  its foreground shall cover all 1080×1920 pixels with alpha 255.
- **RD-02-52** (Optional) — Where the pack exists, its manifest shall identify
  each source, WebM, duration, active interval, cut/landing time, connection
  anchor, and usage limitations.
- **RD-02-53** (Optional) — Where the pack exists, it shall include editable
  SVG carriers, local runtime/fonts, seven local SFX files, and a labelled MP4
  demonstration of all seven presets.
- **RD-02-54** (Optional) — Where sample UI is shown in the demonstration,
  it shall be labelled as a sample and kept separate from proof captures and
  transition carriers.
- **RD-02-55** (Event-driven) — When the pack is handed off, both demo and
  overlay project checks shall pass and snapshots of all seven techniques
  shall have been visually inspected.

Production details: [transition-assets](../design-system/transition-assets.md).
These requirements apply to the requested local pack, not a new default video format.

## Verifikasi

- **RD-02-13** (Event-driven) — When file `.html` komposisi diubah, the system
  shall menjalankan `npm run video -- check <slug>` untuk komposisi video (atau
  `npm run check` untuk template root; lint + validate + inspect) dan
  memperbaiki semua error sebelum handoff.
- **RD-02-14** (Optional) — Where hanya file docs (`docs/agents/*.md`, `AGENTS.md`,
  `CLAUDE.md`) diubah tanpa `.html`, the system shall boleh melewati `npm run check`.

## Referensi

- Implementasi: [frontend/composition-implementation](../frontend/composition-implementation.md)
- Visual: [design-system/visual-system](../design-system/visual-system.md)
- Keputusan: [ADR-0001](../adr/0001-hyperframes-html-to-video.md)
- Koreografi (opsional): [ADR-0021](../adr/0021-craft-kit-choreography.md), `docs/agents/references/motion-craft.md`, `vendor/craft-kit/`
