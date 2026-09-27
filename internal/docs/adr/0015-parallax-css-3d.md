# ADR-0015 2.5D parallax lewat multiplane CSS 3D
Status: accepted
Date: 2026-09-27

## Context

Gaya ketujuh dan terakhir (ADR-0012): gambar dipecah menjadi 2–5 lapisan
kedalaman dan kamera bergerak di antaranya, plus treatment di mana latar
parallax bergerak di belakang cutout Dena. Dena memilih tiga sumber lapisan:
foto/frame asli, adegan Codex berlapis, dan kolase multiplane. Tidak ada model
depth lokal (hanya `u2net_human_seg` lewat HyperFrames), jadi pemisahan lapisan
memakai segmentasi orang, Codex, atau komposisi manual.

Spike 2026-09-27 (HyperFrames 0.7.24, `render` MP4): `perspective` +
`preserve-3d` + `translateZ` dengan skala kompensasi `(P − z)/P` dan blur DOF
ter-render benar; lapisan depan membesar paling cepat saat dolly. Skala harus
berporos di tengah view, jadi lapisan adalah kontainer full-frame. Dolly-zoom
yang terlalu kuat mengecilkan plate belakang sampai tepinya terlihat. Edit Codex
dengan ukuran berbeda rasio dari sumber menggeser komposisi plate; ukuran yang
sama rasio + `--fit` menjaga plate selaras. Segmentasi orang bisa ikut memotong
bayangan berbentuk orang.

Saat membangun contoh ditemukan bahwa `.gitignore` (`*.webm`) mengabaikan
`style-examples/assets/placeholder-cutout.webm` dari sub-proyek 2b, sehingga
contoh mix-media gagal di clone baru.

## Decision

- Multiplane CSS 3D di style-kit: `SK.layer`, `SK.camera`, `SK.dof`,
  `SK.dollyZoom` (+ `ox/oy` untuk view split/panel); struktur `.sk-view >
  .sk-world > .sk-ly`. Cadangan bila suatu gerak gagal di render: parallax 2D
  (geser per lapisan), bukan Three.js.
- Treatment `parallax-stage` memakai resep host collage (ADR-0014) dengan latar
  parallax opaque.
- CLI `npm run video -- layers` menyiapkan sumber + subjek ter-matte; plate latar
  lewat Codex edit (rasio sama + `--fit`), dicatat `reconstructed`, tidak pernah
  bukti. Foto arsip hanya domain publik terverifikasi.
- Depth Budget di `parallax.md` membatasi gerak kamera, fill plate, dan blur.
- `.gitignore` mengecualikan `docs/agents/references/style-examples/assets/*.webm`;
  test memastikan setiap aset yang dirujuk contoh ter-track di git.

## Rationale

- CSS 3D memakai jalur render HyperFrames yang sama dengan gaya lain dan semua
  jenis lapisan (img, div kertas, video cutout di host).
- Tanpa runtime atau dependency baru (ADR-0007).

## Consequences

- Kualitas lapisan foto bergantung pada matte orang dan tambalan Codex; contoh
  memotong alpha subjek ke area orang dan mengecek keselarasan plate.
- Dengan sub-proyek ini ketujuh gaya tersedia; validasi di video nyata dicatat
  di [operations/roadmap](../operations/roadmap.md).

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-parallax-design.md`
- `docs/agents/references/styles/parallax.md`, `scripts/video.mjs` (`layers`)
- [ADR-0012](0012-style-broll-style-kit.md), [ADR-0013](0013-paper-pack-bitmap-assets.md),
  [ADR-0014](0014-vox-mix-media.md)
