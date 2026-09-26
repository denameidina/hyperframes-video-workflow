# RD-02 Composition & Render
Status: accepted (reverse-engineered)
Date: 2026-07-20

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
  elemen ber-waktu yang tampil; framework memakainya untuk kontrol visibilitas.
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

## Verifikasi

- **RD-02-13** (Event-driven) — When file `.html` komposisi diubah, the system
  shall menjalankan `npm run check` (lint + validate + inspect) dan memperbaiki
  semua error sebelum handoff.
- **RD-02-14** (Optional) — Where hanya file docs (`docs/agents/*.md`, `AGENTS.md`,
  `CLAUDE.md`) diubah tanpa `.html`, the system shall boleh melewati `npm run check`.

## Referensi

- Implementasi: [frontend/composition-implementation](../frontend/composition-implementation.md)
- Visual: [design-system/visual-system](../design-system/visual-system.md)
- Keputusan: [ADR-0001](../adr/0001-hyperframes-html-to-video.md)
