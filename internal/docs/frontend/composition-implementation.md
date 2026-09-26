# Composition Implementation
Status: accepted (reverse-engineered)
Date: 2026-07-20

Kanonik untuk: cara `index.html` mengimplementasikan komposisi HyperFrames.
Ini catatan implementasi konkret dari komposisi aktif, bukan aturan umum (aturan
ada di [rd-02](../requirements/rd-02-composition-render.md) dan
[visual-system](../design-system/visual-system.md)).

## Komposisi aktif

- Root: `<main id="root" data-composition-id="dena-repliz-affiliate-joke"
  data-start="0" data-width="1080" data-height="1920" data-duration="77.508">`.
- Judul: "Dena - Repliz Affiliate Joke Workflow". Konten: Dena menjelaskan
  workflow edit video AI yang di-push ke GitHub (Codex + R2 + Repliz), durasi
  **77.508 detik**.
- Media base: `videos/repliz-affiliate-joke/processed.mp4` (video `muted` +
  `<audio>` terpisah dari sumber yang sama).

## Struktur elemen

- **Video** `#base-video` (track 1) + **audio** `#base-audio` (track 10), keduanya
  `data-duration="77.508"`.
- **SFX** `#sfx-hook/github/diagram/approve/affiliate/cta` (track 11–16), tiap
  `<audio>` punya `data-volume` (0.09–0.12) dan di-time ke momen tertentu.
- **Progress** `#progress` + `#progress-fill` (track 3).
- **Kartu**: `#hook-card` (track 5), `#cta-card` (track 5), proof cards
  `#github-card-a/#workflow-card/#repliz-card/#github-card-b` (track 4), label
  `#proof-label/#approval-badge/#tool-chips` dan `#affiliate-sticker` (track 6).
- **Caption**: `cap-001`..`cap-051` (track 2), masing-masing `.caption` dengan
  satu `<span class="highlight">` kuning per beat.

## Timeline GSAP

- Dibuat `gsap.timeline({ paused: true })`, di-`window.__timelines['dena-repliz-affiliate-joke']`.
- Progress fill: `to('#progress-fill', { scaleX: 1, duration: 77.508, ease:'none' }, 0)`.
- Tiap kartu: pola `fromTo(enter)` lalu `to(exit, autoAlpha:0)` pada waktu masing-masing.
- Punch-zoom base video di beberapa momen (mis. `scale 1.04/1.05` lalu balik `1.0`).
- Caption di-loop: untuk tiap `.caption`, `fromTo({autoAlpha:0,y:16,scale:0.96}→
  {autoAlpha:1,y:0,scale:1,duration:0.14})` pada `dataset.start` masing-masing.

## Aturan implementasi yang ditegakkan

- GSAP dari lokal `vendor/gsap.min.js` (bukan remote).
- Semua timing dalam detik, `class="clip"` di tiap elemen ber-waktu.
- Tidak ada `Date.now`/`Math.random`/network — timeline murni deterministik.
- Aset gambar/SFX direferensikan dari path lokal `videos/repliz-affiliate-joke/assets/...`.
- Setelah edit `.html`: jalankan `npm run check` (lint + validate + inspect).

## Catatan clone

Media lokal (`processed.mp4`, aset, SFX) di-ignore git; setelah clone, preview
akan blank sampai file `videos/<slug>/...` yang dirujuk `index.html` dipulihkan.

## Komposisi Standalone Per Slug

Jika repo-root `index.html` sedang berisi edit lain yang belum boleh ditimpa,
sebuah video boleh memakai proyek HyperFrames mandiri di
`videos/<slug>/hyperframes/index.html`. Media harus tetap menjadi direct child
root komposisi standalone, semua path harus lokal terhadap proyek tersebut,
dan verifikasi dijalankan dari folder standalone dengan `npm run check`.

Contoh yang sudah dirender:

- `videos/20260805-pak-radin-ai/hyperframes/index.html`
- composition id `dena-pak-radin-ai`, 1080x1920, 48.566 detik
- base media memakai proxy GOP-30 lokal untuk seek deterministik tanpa mengubah
  `processed.mp4` atau timing transcript
- hasil review: `videos/20260805-pak-radin-ai/render.mp4`

## Referensi

- [design-system/visual-system](../design-system/visual-system.md)
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md)
- [operations/runbook](../operations/runbook.md)
