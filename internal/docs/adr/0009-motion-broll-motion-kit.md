# ADR-0009 Motion B-roll lewat motion-kit
Status: accepted
Date: 2026-09-26

## Context

Visual Dena selama ini berupa kartu, screenshot, dan imagegen. Skill motion-broll
(`Barty-Bart/motion-graphics`, MIT) membuat B-roll "satu shape yang tidak pernah
cut" dengan spring closed-form dan kursor, tetapi dirancang untuk 16:9, render
Playwright terpisah, dan output clip untuk editor luar. Repo ini merender semua
lewat HyperFrames 0.7.24 tanpa dependency npm (ADR-0007) dan memakai workflow
4 fase (ADR-0008).

Spike 2026-09-26: di HyperFrames, sub-composition yang punya tween proxy GSAP
menerima waktu lokal clip lewat `onUpdate`, baik di `snapshot` maupun `render`;
event `hf-seek` tidak pernah dikirim untuk komposisi non-Three/TypeGPU; engine
global yang dimuat di `<head>` host dapat dipakai dari dalam `<template>`.

## Decision

- Engine di-vendor sebagai script klasik `vendor/motion-kit/motion-kit.js`
  (`window.M`) plus `motion-kit.css` dan font Geist, dimuat sekali oleh host.
- Satu clip = satu sub-composition `compositions/broll/*.html` di track 4 yang
  memanggil `M.clip(id, cfg)`; `M.clip` mencari elemen di dalam root clip dan
  mendaftarkan timeline paused dengan satu tween proxy `{t: 0→T}`.
- Motion b-roll menjadi visual pertama untuk kalimat yang menjelaskan,
  menunjukkan, membandingkan, atau berurutan; capture untuk bukti; imagegen untuk
  mood/tekstur/latar.
- Treatment per clip: cutaway, split, panel. Gate 2 R3 naik ke 10 detik.
- Motion blur opsional: `npm run render:blur` (render 4× fps → ffmpeg `tmix`).

## Rationale

- Satu pipeline render dan satu cue map dengan caption dan SFX.
- Fungsi spring asli tetap dipakai, jadi kualitas gerak setara skill asli.
- Tanpa Playwright atau dependency npm.

## Consequences

- Blur setara shutter 360° (asli 180°) dan render final 4× lebih lama bila dipakai.
- `M.clip` wajib dipanggil sinkron di script template clip.
- Belum teruji di video nyata; video pertama dicatat di
  [operations/roadmap](../operations/roadmap.md).

## Sources

- Spec: `docs/superpowers/specs/2026-09-26-motion-broll-design.md`
- `vendor/motion-kit/`, `docs/agents/references/motion-broll-planning.md`,
  `docs/agents/references/motion-broll-authoring.md`
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md),
  [requirements/rd-03-video-editing-workflow](../requirements/rd-03-video-editing-workflow.md)
