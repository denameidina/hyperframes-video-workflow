# Craft-kit (koreografi motion ala NullMotion) — Design

Status: approved (brainstorming 2026-09-28), implementasi: docs/superpowers/plans/2026-09-28-craft-kit.md
Date: 2026-09-28
Dibangun di atas: HyperFrames (ADR-0001), motion-kit (ADR-0009), style-kit
(ADR-0012). Tidak menggantikan keduanya.

## Latar belakang

Dena menilai animasi di [blixvip/NullMotion](https://github.com/blixvip/NullMotion)
sangat bagus. Template di sana (`public/NN-*/index.html`) adalah komposisi
HyperFrames + GSAP biasa. Kualitasnya tidak datang dari library, tetapi dari
disiplin koreografi yang konsisten:

1. Setiap gerakan dipecah **travel → overshoot → settle** (mis. `power4.out`
   ke `y:-24`, lalu `power2.out` ke 0 dalam 0,34 detik).
2. **Squash & stretch** selama travel (`scaleX .98 / scaleY 1.045`).
3. **Opacity dipisah dari gerakan**: fade-in 0,08 detik, transform yang bekerja;
   saat exit opacity sengaja telat sehingga objek terbang keluar frame.
4. **Anticipation** sebelum exit (turun 10 px + squash 0,12 detik, lalu `power2.in`).
5. **Contact shadow** yang mengikuti ketinggian objek.
6. **Kedalaman 3D yang ditahan**: `transformPerspective ~1500`, tilt `rotationX`
   12 → -2,5 → 0, origin `50% 82%`; flip menukar face di 88°.
7. **Blur sebagai motion blur**; reveal kata lewat mask (`yPercent 118`,
   `skewY 7`, `scale 1.075`, `blur 15 → 0`, stagger ~0,105).
8. **Sheen**: strip cahaya miring lewat setelah objek diam.
9. **Reveal lewat clip-path** (inset, circle, wipe).
10. **Rubber-band** pada bar/garis (`0 → 1.08 → 1`).
11. **Impact recoil** setelah headline mendarat.
12. **Frame tak pernah beku**: bob/drift `sine.inOut` saat hold.

Pola waktu template: entrance (0–1,4 detik) → hold yang tetap hidup → exit.

## Lisensi

NullMotion belum memilih lisensi. **Tidak ada kode, markup, CSS, atau aset yang
disalin.** Craft-kit ditulis ulang dari nol berdasarkan teknik yang diamati
(struktur gerak, kurva, orde besaran timing). NullMotion dicantumkan sebagai
inspirasi di `motion-craft.md` dan `vendor/craft-kit/LICENSE` (lisensi proyek
ini sendiri, sama dengan motion-kit/style-kit).

## Keputusan yang sudah diambil

- Bentuk: **helper + doc** (bukan porting template, bukan upgrade style-kit).
- Pendekatan C: **satu resep, dua pintu**. Resep adalah data keyframe; dipakai
  lewat timeline GSAP (overlay root) atau lewat sampling `t` (klip `update(t)`
  style-kit/motion-kit). Kurva identik di kedua mode.
- Adopsi: **opsional**. Template `dena-video`, `overlay-timeline.json`,
  kontrak Screen Plan, dan ke-7 gaya style-kit **tidak diubah**.
- CSS hanya struktural dan netral warna; tidak memaksakan look obsidian/silver.

## Tujuan

- `vendor/craft-kit/` deterministik dan teruji, hanya bergantung pada GSAP.
- 12 resep dengan angka default yang mereproduksi rasa NullMotion.
- Contoh render per resep (portrait 1080×1920) yang lolos lint/validate/snapshot.
- Reference `motion-craft.md` agar agen Build bisa memakainya tanpa membaca kode.

## Bukan tujuan

- Mengubah template, contoh, atau snapshot yang sudah ada.
- Mewajibkan resep di workflow Dena.
- Material/palet NullMotion, template gallery, editor, atau exporter mereka.

## Arsitektur

```
vendor/craft-kit/
  craft-kit.js    → window.CK (butuh window.gsap; error jelas bila belum dimuat)
  craft-kit.css   → .ck-mask .ck-word .ck-sheen .ck-shadow .ck-face-front/back
  LICENSE
```

### Bentuk resep

Resep adalah fungsi murni `opts → tracks`. `tracks` memetakan nama properti
GSAP ke daftar keyframe dengan waktu relatif terhadap awal resep:

```js
// arrive, dir 'up' (disederhanakan)
{
  opacity:  [[0, 0], [0.08, 1, 'power2.out']],
  y:        [[0, 1120], [0.90, -24, 'power4.out'], [1.24, 0, 'power2.out']],
  scaleY:   [[0, 0.72], [0.90, 1.045, 'power4.out'], [1.24, 1, 'power2.out']],
  scaleX:   [[0, 0.90], [0.90, 0.98, 'power4.out'], [1.24, 1, 'power2.out']],
  rotationX:[[0, 12], [0.90, -2.5, 'power4.out'], [1.24, 0, 'power2.out']],
}
```

Keyframe `[t, nilai, ease?]`; ease menggerakkan segmen yang **berakhir** di
keyframe itu (default `'none'`). Keyframe pertama adalah nilai awal. Dua
keyframe dengan `t` sama = lompatan (step). Nilai boleh angka atau string
bernomor (mis. `clipPath`); string diinterpolasi dengan `gsap.utils.interpolate`.
Properti bisa CSS custom property (`'--ck-face'`, `'--ck-sheen'`).
Properti statis (mis. `transformOrigin`, `transformPerspective`) masuk `set`,
diterapkan sekali di awal.

### API

- `CK.recipes` — objek `nama → fn(opts)`; bisa ditambah resep baru oleh klip.
- `CK.tracks(name, opts)` — `{ set, tracks, duration }` hasil resep, dengan
  `opts.speed` (default 1) membagi semua waktu. Nama tak dikenal → throw
  `craft-kit: unknown recipe "<name>"`.
- `CK.sample(name, t, opts)` — objek nilai properti pada waktu lokal `t`
  (sebelum 0 = nilai awal, setelah `duration` = nilai akhir). Murni, untuk tes.
- `CK.add(tl, targets, name, at, opts)` — menulis resep ke timeline GSAP: frame
  pertama lewat `tl.set` di `at`, lalu satu `tl.fromTo` eksplisit per segmen
  (`immediateRender: false`, ease segmen itu; dua keyframe dengan waktu sama =
  `tl.set`). Resep entrance, dan resep apa pun di posisi 0, juga memasang frame
  pertamanya di posisi 0 dengan `immediateRender: true` agar frame 0 benar
  (RD-02-47). `targets` bisa elemen, selector, atau array; `opts.stagger`
  (detik) menggeser tiap target berikutnya. Mengembalikan `tl`.
- `CK.at(targets, name, t, opts)` — untuk `update(t)`: mengambil sampel pada
  `t - i*stagger` per target dan menerapkannya dengan `gsap.set`.
- `CK.duration(name, opts)` — panjang resep (detik), termasuk stagger bila
  `opts.count` diberikan.
- `CK.split(el)` — memecah teks jadi `.ck-mask > .ck-word` sekali (idempoten);
  mengembalikan array `.ck-word`.

Opsi umum: `dir` (`up|down|left|right`), `dist` (px, default 1120 untuk
kanvas portrait), `speed`, `stagger`. Opsi spesifik per resep di katalog.

### Katalog resep

| Resep | Target | Inti gerak | Akhir |
|---|---|---|---|
| `arrive` | elemen | fade 0,08 s; travel `power4.out` ke overshoot (-24 px, squash, tilt -2,5°), settle `power2.out` 0,34 s; opsi `dir`, `dist`, `tilt` | rest |
| `exit` | elemen | anticipation 0,12 s (+10 px, scaleX 1.03/scaleY .97), fly-off `power2.in` 0,6 s ke `dist` searah `dir`; opacity mulai turun setelah 80% travel | keluar, opacity 0 |
| `bob` | elemen | `y` 0 → `-amp` → 0, `sine.inOut`, `cycles` kali (default amp 8, periode 1,2 s) | rest |
| `rubber` | bar/garis | `scaleX` (atau `axis:'y'`) 0 → 1.08 `expo.out` → 1 `power3.inOut` | rest |
| `squash` | pill/tombol | `scaleX .93/scaleY 1.06` + fade → `1.08/.95` `power3.out` → 1 `back.out(1.55)` | rest |
| `recoil` | grup | `x:+6`, `scale 1.022` 0,2 s `power3.out` → rest `back.out(1.45)` 0,4 s | rest |
| `wordMask` | `.ck-word` | `yPercent 118`, `skewY 7`, `scale 1.075`, `blur(15px)`, opacity 0 → rest 0,9 s `power4.out`; stagger default 0,105 | rest |
| `sharpen` | elemen | `blur(20px)` + opacity .35 → tajam 0,9 s `power2.out` | rest |
| `sheen` | `.ck-sheen` | `--ck-sheen` -40% → 140% (posisi strip) 0,9 s `power2.inOut`, opacity naik/turun di ujung | tersembunyi |
| `clip` | elemen | `shape:'inset'` (`inset(49%… round r)` → `inset(0…)`), `'circle'` (`circle(0%)` → `circle(75%)`), `'wipe'` (`inset(0 100% 0 0)` → 0) ; `expo.out` 0,9 s | rest |
| `flip` | kartu dgn `.ck-face-front/back` | `rotationY` 0 → 88 `power3.in`, lompat `--ck-face` 0→1 dan rotasi ke -88, lalu → 0 `power3.out` | face belakang, rest |
| `shadow` | `.ck-shadow` | `phase:'arrive'` mengikuti timing `arrive` (opacity 0 → .3, scaleX .45 → 1); `phase:'exit'` mengikuti `exit` (→ 0, scaleX .3) | sesuai phase |

"rest" = `x/y 0`, `scale 1`, rotasi 0, `opacity 1`, tanpa `filter`/`clipPath`
sisa (nilai akhir `blur(0px)` / `inset(0% 0% 0% 0%)` / `none` sesuai properti).

### CSS

- `.ck-mask { display:inline-block; overflow:hidden; padding:.12em .02em .16em; vertical-align:bottom }`,
  `.ck-word { display:inline-block; will-change:transform,opacity,filter }`.
- `.ck-sheen`: strip absolut `width:30%`, `left:var(--ck-sheen,-40%)`,
  `skewX(-16deg)`, gradient dari `--ck-sheen-color` (default `rgba(255,255,255,.55)`);
  parent memberi `overflow:hidden; position:relative`.
- `.ck-shadow`: elips hitam blur (`--ck-shadow-color`, `--ck-shadow-blur`).
- `.ck-face-front/.ck-face-back`: `position:absolute; inset:0;
  backface-visibility:hidden`, opacity dari `--ck-face` (front `1 - var`, back `var`).

## Cara pakai

Overlay root (GSAP langsung):

```html
<link rel="stylesheet" href="vendor/craft-kit/craft-kit.css">
<script src="vendor/craft-kit/craft-kit.js"></script>
<script>
  CK.add(tl, '#hook-card', 'arrive', 0.02, { dir: 'up', dist: 600 });
  CK.add(tl, '#hook-card .ck-sheen', 'sheen', 1.1);
  CK.add(tl, '#hook-card', 'exit', 2.6);
</script>
```

Klip style-kit (`update(t)`):

```js
const words = CK.split(find('title'));
SK.clip(id, { T: 3, update: t => {
  CK.at(words, 'wordMask', t - 0.2);
  CK.at(find('rule'), 'rubber', t - 0.6);
}});
```

Proyek per video sudah menautkan `vendor/` repo (`videos/<slug>/vendor →
../../vendor`), jadi kit tersedia tanpa disalin; template `dena-video` tidak
memuatnya secara default — klip yang memakainya menambah dua baris `<script>`/`<link>`
di `index.html` video (lihat `motion-craft.md`).

## Acceptance criteria (EARS, ditambahkan ke RD-02 bagian "Craft-kit")

- **RD-02-39** — The craft-kit shall produce, for every recipe, `CK.at` values
  equal to the values GSAP renders from `CK.add` at the same local time, within
  0,01 (px, derajat, rasio) at 30 fps samples.
- **RD-02-40** — The craft-kit shall end every non-exit recipe in the rest state
  defined in the catalog, within 0,001.
- **RD-02-41** — When `exit` runs, the craft-kit shall keep opacity ≥ 0,5
  until the element has travelled at least 80% of `dist` in the `dir` direction.
- **RD-02-42** — The craft-kit shall return identical `CK.sample` output for
  identical `(name, t, opts)` across calls, and shall not read clocks or
  `Math.random`.
- **RD-02-43** — If a recipe name is unknown, then the craft-kit shall throw
  `craft-kit: unknown recipe "<name>"`.
- **RD-02-44** — If `craft-kit.js` loads before GSAP, then it shall throw
  `craft-kit: load gsap before craft-kit.js`.
- **RD-02-45** — Where `opts.stagger` is set with N targets, the craft-kit shall
  start target *i* exactly `i × stagger` seconds after target 0 in both modes.
- **RD-02-46** — The craft examples host shall pass `lint`, `validate`, and
  snapshot rendering with one clip per recipe.
- **RD-02-47** — When `CK.add` places a recipe at time 0, or places an entrance
  recipe at any time, the craft-kit shall render that recipe's first frame at
  frame 0, including after seeking back to 0.

## Contoh

`docs/agents/references/craft-examples/`: satu host portrait berisi 13 klip
pendek: 12 klip satu per resep, ditambah 1 klip "headline card" yang
menggabungkan `arrive`, `wordMask`, `rubber`, `recoil`, `sheen`, `bob`, dan
`exit` sebagai koreografi utuh. Klip ganjil memakai mode GSAP (`CK.add`), klip
genap mode `update(t)` (`CK.at`), agar kedua pintu teruji di render.
`snapshots.json` memilih waktu di tengah travel, di overshoot, dan setelah settle.

## Pengujian

- `scripts/craft-kit.test.mjs` (node:test, memuat `vendor/gsap.min.js` asli dan
  `craft-kit.js` di `vm` dengan DOM minimal; bila GSAP butuh DOM yang lebih
  lengkap, pakai stub elemen yang menyimpan nilai `gsap.set`):
  paritas `add`/`at` (RD-02-39) untuk tiap resep; rest state (RD-02-40);
  urutan opacity/travel `exit` (RD-02-41); determinisme (RD-02-42); error
  resep dan urutan load (RD-02-43/44); stagger (RD-02-45); `split` idempoten;
  `speed` membagi durasi. Skrip: `npm run test:craft-kit`.
- `scripts/check-broll-examples.mjs` ikut menyalin `vendor/craft-kit`;
  skrip baru `npm run check:craft-examples` (RD-02-46).
- Snapshot ditinjau visual: overshoot terlihat, shadow mengikuti, tidak ada
  frame beku saat hold.
- Regresi: `test:motion-kit`, `test:style-kit`, `check:broll-examples`,
  `check:style-examples`, `test:video` tetap hijau.

## Governance dan dokumen

- ADR baru `internal/docs/adr/0021-craft-kit-choreography.md` (accepted).
- `internal/docs/README.md`: daftarkan ADR-0021, `motion-craft.md`, dan spec ini.
- `internal/docs/requirements/rd-02-composition-render.md`: bagian "Craft-kit"
  berisi RD-02-39 … RD-02-46.
- `docs/agents/references/motion-craft.md`: 12 prinsip, katalog resep, contoh
  pemakaian dua mode, kapan memakai/tidak, atribusi inspirasi NullMotion.
- Tautan opsional dari `motion-grammar.md` (Motion Primitives) dan
  `hyperframes-assembly.md` (cara menyalin & memuat kit).
- `CLAUDE.md` + `AGENTS.md`: perintah `test:craft-kit`, `check:craft-examples`.
