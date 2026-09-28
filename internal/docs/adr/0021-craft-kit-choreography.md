# ADR-0021 Koreografi motion lewat craft-kit
Status: accepted
Date: 2026-09-28

## Context

Dena ingin animasi overlay dan b-roll terasa semahal template di
[blixvip/NullMotion](https://github.com/blixvip/NullMotion). Kualitas itu tidak
datang dari library (mereka memakai GSAP biasa), tetapi dari koreografi yang
konsisten: travel → overshoot → settle, squash & stretch, opacity yang dipisah
dari gerakan, anticipation sebelum exit, contact shadow, word mask, sheen,
clip-path reveal, rubber-band, recoil, dan hold yang tetap hidup. Project ini
punya dua cara menulis animasi: rantai GSAP langsung (overlay root) dan fungsi
murni `update(t)` (motion-kit, style-kit). NullMotion belum memilih lisensi.

Spike 2026-09-28 (GSAP 3.15.0 di `node:vm`, HyperFrames 0.7.24 `snapshot`):
`gsap.parseEase` dan `gsap.utils.interpolate` menghasilkan nilai yang sama
dengan tween GSAP (string bernomor dibulatkan 4 desimal); ease default `tl.to`
adalah `power1.out`; `tl.set` di posisi 0 tidak dirender saat timeline baru
di-seek ke 0 kecuali `immediateRender: true`; linter menolak selector
`querySelector` berbasis template literal di sub-composition.

## Decision

- Satu kit `vendor/craft-kit/` (`craft-kit.js` → `window.CK`, `craft-kit.css`),
  hanya bergantung pada GSAP, ditulis dari nol (tanpa kode/aset NullMotion).
- Resep adalah data keyframe `[t, nilai, ease]` per properti. Satu resep punya
  dua pintu: `CK.add(tl, …)` menulis `fromTo` eksplisit ke timeline GSAP;
  `CK.at(el, …, t)` mengambil sampel dengan `parseEase` untuk klip `update(t)`.
  Ease selalu eksplisit (`'none'` bila kosong).
- 12 resep: `arrive`, `exit`, `bob`, `rubber`, `squash`, `recoil`, `wordMask`,
  `sharpen`, `sheen`, `clip`, `flip`, `shadow`.
- Adopsi opsional: template `dena-video`, `overlay-timeline.json`, kontrak
  Screen Plan, dan ke-7 gaya style-kit tidak berubah. Reference
  `docs/agents/references/motion-craft.md`; contoh di
  `docs/agents/references/craft-examples/`.

## Rationale

- Data keyframe menjaga angka koreografi di satu tempat dan membuat paritas dua
  mode bisa diuji (RD-02-39) tanpa DOM.
- Hanya GSAP sebagai dependensi: overlay root bisa memuat kit tanpa motion-kit.
- Menulis ulang dari nol menghormati repo tanpa lisensi; tekniknya bebas dipakai.

## Consequences

- Tes memuat `vendor/gsap.min.js` asli; upgrade GSAP perlu menjalankan
  `npm run test:craft-kit`.
- Satu elemen hanya boleh punya satu resep entrance; resep berantai pada satu
  elemen harus berurutan waktu (didokumentasikan di `motion-craft.md`).
- Frame 0 aman: resep entrance dan resep di posisi 0 langsung menerapkan frame
  pertamanya.
