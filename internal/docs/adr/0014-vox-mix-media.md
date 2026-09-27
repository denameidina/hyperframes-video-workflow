# ADR-0014 VOX dan mix-media
Status: accepted
Date: 2026-09-27

## Context

Dua gaya terakhir keluarga kertas (ADR-0012, ADR-0013): `vox` — dokumen di
atas kertas dengan highlighter tepat di frasa yang diucapkan — dan `mix-media` —
Dena tetap bicara, dipotong dari footage-nya sendiri, di atas kolase. Dena
memilih: VOX boleh capture asli atau dokumen ilustratif; mix-media memakai
cutout video bergerak; cutout dibuat lewat CLI; contoh repo memakai siluet
placeholder.

Spike 2026-09-27 (`badiblum-storynight`, HyperFrames 0.7.24): `remove-background`
segmen 3 s → VP9 ber-alpha dalam 21 s (CoreML); WebM alpha sebagai `<video>`
host ter-render transparan di `snapshot` dan `render` MP4, sinkron < 1 frame.
Lint menolak tween opacity `#base-video` (`gsap_fullscreen_overlay_starts_visible`).
Di sesi agen dengan hook RTK, `npx … -o` bisa tidak menulis output sehingga file
lama terpakai ulang tanpa error.

## Decision

- Treatment `collage` untuk `mix-media`: mount kolase opaque full-frame (track 4,
  z 22) menutupi base video; cutout Dena adalah `<video class="clip cutout
  sk-sticker-cut" muted>` milik host (track 6, z 24) dengan waktu sama; lapisan
  depan opsional `.broll-front` (track 7, z 26). Opacity `#base-video` tidak
  pernah di-tween.
- CLI `npm run video -- cutout <slug> --from --dur --name`: validasi, hapus output
  lama, ffmpeg memotong segmen `processed.mp4`, `remove-background` → WebM
  ber-alpha, gagal bila output tidak tertulis. Dipanggil lewat `spawnSync` (tanpa
  shell), jadi tidak terpengaruh hook.
- VOX: dokumen `capture` (screenshot asli + baris sumber) atau `illustrative`
  (lembar generik + tag "Ilustrasi", tanpa masthead media nyata). Engine:
  `SK.highlight`, `SK.geo` + `SK.CITIES`; aset: `map-indonesia.svg` (Natural
  Earth, domain publik), font Newsreader (OFL). Gate 2 R6 diperluas ke dokumen
  ilustratif yang meniru media nyata.
- Contoh `mix-media` memakai `placeholder-cutout.webm` yang dirender dari
  `docs/agents/references/mix-media-placeholder/`; tidak ada wajah asli di repo.

## Rationale

- Cutout sebagai media host memakai jalur video HyperFrames yang sudah terbukti
  (alpha diekstrak sebagai PNG saat render), tanpa pass komposit terpisah.
- Kolase opaque menghindari aturan lint dan menjaga audio tetap dari
  `#base-audio`.
- Aturan sumber dan tag menjaga VOX tetap jujur: capture adalah bukti, ilustrasi
  diberi label.

## Consequences

- Matting ±4 fps di Apple silicon: segmen dibatasi 15 s per klip; aset per video
  tidak di-commit.
- Posisi doodle/panah harus disetel dari still check cutout asli (posisi kepala
  berbeda per video).
- Sub-proyek 3 (2.5D parallax) dapat memakai ulang cutout dan lapisan kamera.

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-vox-mix-media-design.md`
- `docs/agents/references/styles/vox.md`, `docs/agents/references/styles/mix-media.md`,
  `scripts/video.mjs` (`cutout`)
- [ADR-0012](0012-style-broll-style-kit.md), [ADR-0013](0013-paper-pack-bitmap-assets.md)
