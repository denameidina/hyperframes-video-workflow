# ADR-0012 Style B-roll lewat style-kit
Status: accepted
Date: 2026-09-27

## Context

Motion b-roll (ADR-0009) memberi satu gaya visual: satu shape morph + kursor,
bergaya UI. Dena ingin video memakai tujuh gaya tambahan: VOX, b-roll text,
motion graphic, whiteboard, stop-motion, mix-media, dan 2.5D parallax, dengan
referensi yang kaya supaya Screen Plan dan Build punya banyak pola. Gaya
dipilih per klip dan boleh dicampur dalam satu video; palet bebas per gaya.

Spike 2026-09-27 (HyperFrames 0.7.24, `snapshot`): draw-on SVG
(`getTotalLength`), count-up, handwriting reveal lewat `clip-path`, dan kamera
berjalan deterministik di dalam `<template>` sub-composition. Anak yang diberi
`visibility: visible` tetap tampil setelah mount klip disembunyikan, jadi kit
menyembunyikan elemen lewat `opacity`. Linter menolak `font-family` di
`<style>` klip bila `@font-face`-nya tidak di file yang sama.

## Decision

- Satu kit bersama `vendor/style-kit/` (`style-kit.js` → `window.SK`,
  `style-kit.css`, font OFL Anton + Caveat) dimuat sekali oleh host setelah
  motion-kit, dan memakai helper `window.M` (easing, spring, track) alih-alih
  menyalinnya.
- Satu klip = satu sub-composition `compositions/broll/*.html` di track 4 yang
  memanggil `SK.clip(id, {T, update})`; `update(t)` fungsi murni waktu lokal klip.
- Gaya adalah `Type` baru di Visual Decision Log, sejajar `motion-broll`:
  `broll-text`, `motion-graphic`, `whiteboard` (sub-proyek 1). Menu dan Style
  B-roll Brief ada di `docs/agents/references/styles/README.md`; satu reference
  per gaya berisi pola, referensi terverifikasi, dan checklist anti-slop.
- Treatment, densitas, dan aturan wajah mengikuti motion b-roll. Maksimal tiga
  tipe motion visual per video.
- Tiga sub-proyek berurutan: (1) style-kit + broll-text, motion-graphic,
  whiteboard; (2) stop-motion, VOX, mix-media + pipeline aset bitmap (Codex,
  CC0, remove-background) dan tangan whiteboard; (3) 2.5D parallax.

## Rationale

- Primitive yang sama (draw-on, boil, stagger, kamera, count-up) dipakai lintas
  gaya; VOX dan mix-media nanti tinggal menggabungkannya.
- Satu pipeline render dan satu cue map dengan caption dan SFX, seperti ADR-0009.
- Tanpa dependency npm (ADR-0007); font dan kode di-vendor.

## Consequences

- Kekayaan referensi dijaga test (`scripts/style-docs.test.mjs`): jumlah pola,
  referensi bersumber URL, checklist anti-slop, dan contoh yang benar-benar ada.
- Klip tidak boleh memakai `visibility` dan tidak boleh menyebut `font-family`
  sendiri; keduanya tercatat di Build Contract.
- Belum teruji di video nyata; video pertama dicatat di
  [operations/roadmap](../operations/roadmap.md).

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-style-kit-design.md`
- `vendor/style-kit/`, `docs/agents/references/styles/`,
  `docs/agents/references/style-examples/`
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md),
  [requirements/rd-03-video-editing-workflow](../requirements/rd-03-video-editing-workflow.md)
