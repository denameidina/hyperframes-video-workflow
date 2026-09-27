# ADR-0013 Paper pack dan aset bitmap per video
Status: accepted
Date: 2026-09-27

## Context

Sub-proyek 1 (ADR-0012) menambah gaya yang sepenuhnya dibangun dari kode. Gaya
keluarga kertas — stop-motion sekarang, VOX dan mix-media nanti — butuh bitmap:
tekstur kertas, selotip, pin, sticky note, tangan whiteboard, dan cutout objek
per video. Dena menyetujui sumber campuran: tekstur CC0 yang otentik, sisanya
di-generate Codex, semua di-vendor dengan lisensi tercatat; kemiripan Dena tidak
boleh di-generate.

Spike 2026-09-27 (HyperFrames 0.7.24): `<img src="vendor/paper-pack/…">` dan
`url(vendor/paper-pack/…)` di dalam sub-composition lolos lint, validate,
snapshot, dan tetap jalan lewat symlink `vendor` di `videos/<slug>/`; PNG
ber-alpha tampil benar. `url(../paper-pack/…)` di `style-kit.css` ditolak lint
(`invalid_parent_traversal_in_asset_path`), dan `<img>` dengan `src` sama yang
diulang memicu `duplicate_media_discovery_risk`. Render HyperFrames 30 fps, jadi
stop-motion 12 fps menahan pose tidak rata (3:2).

## Decision

- `vendor/paper-pack/` berisi tekstur ambientCG (CC0 1.0) yang di-crop ke
  1080×1920 dan objek Codex (PNG palet ber-alpha), dengan `LICENSES.md` satu
  baris per file dan batas total 5 MB.
- Kelas tekstur dan objek ada di `vendor/paper-pack/paper-pack.css` (url di
  folder sendiri, tanpa `../`), dimuat starter setelah `style-kit.css`; objek yang
  bisa berulang adalah `div` berkelas, bukan `<img>` berulang.
- style-kit mendapat primitive stop-motion (`SK.STOP_FPS` = 15, `SK.onTwos`,
  `SK.piece`, `SK.cycle`, `SK.torn`, `SK.grain`) dan tangan whiteboard
  (`SK.HAND`, `SK.lastTip`, `SK.placeHand`).
- Aset per video mengikuti field `Assets:` di Style B-roll Brief dan bagian
  Style Assets di `asset-production.md`: `codex` (resep cutout tetap), `cc0`
  (ambientCG, Poly Haven, Wikimedia Commons CC0/PD, dicek per file),
  `dena-footage` (frame `processed.mp4` + `remove-background`), `user`.
- Kemiripan Dena hanya dari footage-nya; cutout generate tanpa teks dan tanpa
  orang/brand nyata.

## Rationale

- Tekstur hasil scan asli menghindari tampilan "AI plastik"; Codex dipakai untuk
  objek yang tidak tersedia CC0.
- Satu paket bersama menjaga konsistensi lintas video dan lintas gaya kertas
  (stop-motion, VOX, mix-media).
- Lisensi per file membuat rilis open-source tetap bersih.

## Consequences

- `scripts/paper-pack.test.mjs` menjaga lisensi, alpha, ukuran, dan titik ujung
  pena tangan.
- Aset Codex tidak dapat dibuat ulang identik; file yang sudah ditinjau adalah
  sumber kebenarannya, prompt di `LICENSES.md` hanya untuk regenerasi.
- VOX dan mix-media (sub-proyek 2b) memakai paket ini; cutout video ber-alpha
  dibuktikan lewat spike di 2b.

## Sources

- Spec: `docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md`
- `vendor/paper-pack/`, `docs/agents/references/styles/stop-motion.md`,
  `docs/agents/references/asset-production.md` (Style Assets)
- [ADR-0012](0012-style-broll-style-kit.md)
