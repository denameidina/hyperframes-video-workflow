# Composition Implementation
Status: accepted
Date: 2026-09-26

Kanonik untuk: di mana komposisi video hidup dan bagaimana starter Dena
menyusunnya. Aturan umum ada di
[rd-02](../requirements/rd-02-composition-render.md) dan
[visual-system](../design-system/visual-system.md); keputusan di
[ADR-0010](../adr/0010-per-video-hyperframes-projects.md).

## Tata letak

- `index.html` root: template HyperFrames blank portrait (1080×1920, 10 s, GSAP
  lokal). Bukan video; tidak diubah untuk video.
- Setiap video: proyek HyperFrames di `videos/<slug>/` (di-ignore git):
  `index.html`, `compositions/broll/`, `assets/`, `renders/`, `snapshots/`, dan
  symlink `vendor -> ../../vendor`. Path media relatif terhadap folder itu.
- Dibuat dengan `npm run video -- new <slug>` dari `templates/dena-video/`.

## Starter Dena (`templates/dena-video/index.html`)

- Root `<main id="root" data-composition-id="dena-<slug>" data-start="0"
  data-width="1080" data-height="1920" data-duration="<durasi processed.mp4>">`.
- `.bg-fill` (latar sebagai child), `#base-video` (`processed.mp4`, track 1,
  `muted`), `#base-audio` (`processed-audio.wav`, track 10), `#progress` (track 3).
- Kelas: `.caption` (Arial 950, stroke, z 45), `.hl`, `.hook-card`/`.cta-card`
  (track 5, z 56), `.proof-chip`, `.label-card`, `.sticker`, `.broll` (z 22).
- `motion-kit.js` + `motion-kit.css` sudah dimuat untuk motion b-roll, lalu
  `style-kit.js` + `style-kit.css` untuk style b-roll, dan `paper-pack.css`
  untuk tekstur/objek kertas.
- Timeline `window.__timelines["dena-<slug>"]` dengan tween progress sepanjang
  durasi; komentar contoh untuk caption (track 2/8 bergantian), hook/CTA, SFX
  (track 11+, tanpa `data-media-start`), mount b-roll (track 4, `id` wajib),
  dan treatment split.

## Starter generate (`templates/dena-generate/index.html`, ADR-0025)

- Dibuat oleh `npm run video -- new <slug> --generate`. Tanpa `#base-video`; `.bg-fill`
  diwarnai latar style world oleh Build.
- `#voice-audio` (`processed-audio.wav`, track 10), `#bgm-audio` (`bgm.wav`, track 9),
  `#progress` (track 3). Elemen bertanda `data-voice-duration` diselaraskan ke durasi
  voiceover oleh `npm run video -- voice`.
- Tween progress membaca `data-duration` root lewat DOM (bukan jam), jadi tetap
  deterministik.
- Scene: mount `.broll` bergantian di track 4 dan 7; caption, hook/CTA card, dan SFX sama
  dengan starter edit.
- `--format kinetic-post` / `motion-short` memakai starter tanpa `#bgm-audio`;
  `processed-audio.wav` adalah musik terpotong dari `video music` + `beats.json`.
  Tidak ada caption rail/beats atau suara TTS; teks layar mengikuti beat.

## Aturan implementasi

- GSAP dan engine dari `vendor/` (lokal), tanpa jaringan saat render.
- `class="clip"` pada elemen ber-waktu; mount sub-composition tanpa `class="clip"`.
- Setelah edit: `npm run video -- check <slug>`; render:
  `npm run video -- render <slug> [--blur]`.
- Gate final dan player Studio menggunakan normal/blur terbaru menurut mtime
  (normal menang jika seri), dengan fingerprint nama file aktual. Explainer
  memakai G3; format musik G2; file kosong/nonregular tidak siap direview.

## Referensi

- [design-system/visual-system](../design-system/visual-system.md)
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md)
- [operations/runbook](../operations/runbook.md)
