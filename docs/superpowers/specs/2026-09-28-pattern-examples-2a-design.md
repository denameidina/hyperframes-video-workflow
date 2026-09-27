# Pola + Contoh (Style Enrichment, Sub-proyek 2a) — Design

Status: approved (brainstorming 2026-09-28), belum diimplementasi
Date: 2026-09-28
Branch: `feat/examples-2a`
Sub-proyek: 2 dari rangkaian "Style Enrichment", putaran pertama dari tiga
(2a broll-text + motion-graphic + fondasi host; 2b whiteboard + stop-motion;
2c VOX + mix-media + parallax). Dibangun di atas pustaka aset
(`docs/superpowers/specs/2026-09-27-asset-library-design.md`, ADR-0016).

## Latar belakang

Tujuh gaya punya 104 pola terdokumentasi, tetapi hanya 54 yang punya contoh
yang bisa dirender; tidak ada contoh yang memakai pustaka aset. Contoh adalah
resep yang bisa dilihat dan disalin agen, jadi pola tanpa contoh jarang dipakai
dan variasi video terbatas. Dena memilih: pola baru **dan** contoh untuk pola
lama, dengan target **setiap pola punya minimal satu contoh**, dikerjakan dalam
tiga putaran; contoh disusun **satu host per gaya**.

## Keputusan yang sudah diambil

- Tiga putaran (2a, 2b, 2c), masing-masing spec → plan → implementasi.
- Satu proyek contoh per gaya, dihasilkan dari manifest; 29 contoh lama
  (32 file komposisi termasuk 3 layer front mix-media) dipindahkan dan
  dibuktikan identik piksel.
- 2a: fondasi host (ketujuh gaya), 4 pola baru broll-text, 4 pola baru
  motion-graphic, 4 helper engine, 13 contoh baru; cakupan 100% untuk
  broll-text dan motion-graphic.

## Tujuan

- `docs/agents/references/style-examples/<gaya>/` untuk ketujuh gaya, dengan
  `index.html` dan `snapshots.json` dihasilkan dari `examples.json`.
- 60 still lama identik byte setelah migrasi.
- broll-text dan motion-graphic masing-masing 20 pola, semuanya punya contoh.
- `SK.typeOn`, `SK.shake`, `SK.arcPath` (style-kit), `SK.mapSvg` (asset-lib).
- Test cakupan pola aktif untuk broll-text dan motion-graphic.

## Non-tujuan

- Pola baru atau contoh untuk whiteboard, stop-motion, VOX, mix-media,
  parallax (2b, 2c) — kecuali memindahkan contoh lamanya.
- Mengubah perilaku contoh lama (harus identik piksel).
- Push ke remote.

## Host per gaya

Struktur:

```
docs/agents/references/style-examples/
  assets/                       # bersama (tetap di tempatnya), disalin ke proyek sementara saat check
  broll-text/  motion-graphic/  whiteboard/  stop-motion/  vox/  mix-media/  parallax/
    examples.json               # SUMBER: satu baris per contoh
    compositions/*.html         # clip (dipindah dari compositions/ lama)
    index.html                  # GENERATED dari examples.json
    snapshots.json              # GENERATED dari examples.json
    hyperframes.json
```

Skema `examples.json`:

```json
{
  "style": "broll-text",
  "examples": [
    { "clip": "tx-01-slam", "duration": 4, "treatment": "cutaway", "stills": [0.7, 3.7] },
    { "clip": "mm-01-collage-doodle", "duration": 5, "treatment": "collage", "cutout": true, "front": false, "stills": [2.0] }
  ]
}
```

- `treatment`: `cutaway | split | panel | collage | parallax-stage`.
- `stills`: waktu lokal clip (detik) untuk snapshot.
- `cutout: true` menambah `<video class="clip cutout sk-sticker-cut">`
  (`assets/placeholder-cutout.webm`, track 6); `front: true` menambah mount
  `<clip>-front` (`.broll-front`, track 7) dengan komposisi
  `compositions/<clip>-front.html`.

Generator (`scripts/lib/style-examples.mjs`, dipakai CLI dan test):

- Waktu mulai: clip pertama 0,5 s; setiap clip berikutnya dimulai 0,5 s setelah
  clip sebelumnya selesai. Durasi host = akhir clip terakhir.
- Host memakai CSS, `#base-video` + placeholder wajah, dan urutan pemuatan kit
  yang sama persis dengan host lama.
- Split: `tl.fromTo('#base-video', {y:0}, {y:480, duration:.45, ease:'power3.inOut'}, start)`
  dan `tl.to('#base-video', {y:0, …}, start + duration - .45)`. Panel, cutaway,
  collage, parallax-stage: tanpa tween (collage/parallax-stage menutup base
  video; `#base-video` opacity tidak pernah di-tween).
- `snapshots.json.at` = `start + still` untuk setiap still, urut waktu.

Check: `scripts/check-broll-examples.mjs` menyalin juga
`docs/agents/references/style-examples/assets/` ke proyek sementara.
`npm run check:style-examples` menjalankan ketujuh host berurutan dan menulis
`renders/style-examples/<gaya>/`; `npm run check:style-examples -- <gaya>`
menjalankan satu host.

Migrasi: ke-32 file komposisi lama (29 clip + 3 front mix-media) dipindah ke host
gayanya dengan `git mv`; host lama (`style-examples/index.html`,
`snapshots.json`, `compositions/`, `hyperframes.json`) dihapus. Bukti: untuk
setiap still lama pada waktu host `T` di clip yang mulai `S`, still baru pada
`S' + (T − S)` di host gayanya harus identik byte dengan baseline yang
dirender dari `main`. `stills` di manifest diisi dari waktu lokal lama itu,
sehingga pemetaannya satu-satu.

## Pola baru

Kolom mengikuti tabel Patterns yang ada (Looks like | Use when | Timing vs word |
SFX | Common misuse | Build with).

### broll-text (+4 → 20)

| Pola | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **font-swap** | Satu kata berganti 3–4 font display dalam langkah cepat, lalu berhenti di satu | "berubah", "versi baru", identitas | Ganti setiap 2 frame (15/s) di kata pengantar; berhenti di suku kata bertekanan | klik shutter per langkah | Lebih dari 4 font; berganti sepanjang clip | class `.sk-f-*` diganti lewat `SK.cycle(t, n)` sampai waktu berhenti |
| **stamp-slam** | Stempel/badge jatuh dari 1,4× ke kata kunci dengan getar singkat yang meluruh | Vonis dan label: "GRATIS", "BARU", "HEMAT" | Mendarat di suku kata pertama; getar ≤ 0,3 s | hentakan stempel karet | Menstempel banyak kata; menstempel klaim yang bukan vonis | `SK.stamp(id, { text })` + `'slam'` + `SK.shake` |
| **swash-underline** | Swash tangan tergambar di bawah kata payoff | Kata kunci terakhir sebuah kalimat | Tergambar 0,3–0,5 s sejak awal kata | sapuan spidol | Menggarisbawahi satu baris penuh; lebih dari satu swash per layar | `SK.doodle('frame.swash-N')` + `SK.drawSeq` |
| **riso-poster** | Kata sebagai cetakan dua warna: dua lapis tinta bergeser 6–10 px, grain riso, halftone | Pernyataan besar yang terasa "dicetak", zine | Kedua lapis tinta menyatu di kata (0,3 s) | tepukan kertas | Gambar ramai di belakang; lebih dari dua tinta | `sk-pal-text-risograph` + dua salinan kata (`mix-blend-mode: multiply`) + overlay `.sk-tex-riso` |

### motion-graphic (+4 → 20)

| Pola | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **province-glow** | Peta provinsi; setiap provinsi yang disebut terisi aksen bergantian, dengan label | Sebaran pelanggan/kantor ("Jawa Barat, Jawa Timur…") | Setiap provinsi terisi di namanya, 0,3 s | pop lembut per wilayah | Mewarnai provinsi yang tidak disebut; menyatakan batas administratif terkini (NE 5.1.2 = 33 provinsi) | `SK.mapSvg('id-provinces', { regions })`, isi via `M.track` |
| **route-arc** | Busur tergambar dari kota A ke kota B di peta Asia Tenggara/dunia; titik berjalan di atasnya | "kirim dari Jakarta ke Singapura", ekspansi | Busur tergambar sepanjang frasa; titik tiba di nama tujuan | whoosh | Garis lurus; rute ke tempat yang tidak disebut | `SK.geo` + `SK.arcPath(p0, p1, bend)` + `SK.draw`, titik via `SK.tip` |
| **kpi-cards** | 2–3 kartu statistik: ikon, angka count-up, panah naik/turun | Beberapa angka bisnis dalam satu tarikan napas | Setiap kartu masuk dengan angkanya; hitungan berhenti di suku kata terakhir | tik per kartu | Angka yang tidak diucapkan; lebih dari tiga kartu | `SK.icon` + `SK.count` + kartu `.sk-a` dengan `'rise'` |
| **icon-orbit** | Label di tengah; ikon tool masuk satu per satu dan mengorbit | "nyambung ke semua tools", integrasi | Satu ikon per tool yang disebut; orbit pelan (≤ 20°/s) | blip lembut | Logo merek asli (pakai ikon generik); berputar cepat | `SK.icon` pada sudut via `M.track`, radius tetap |

## Helper engine

| API | Tempat | Perilaku |
| --- | --- | --- |
| `SK.typeOn(el, text, u, { caret = true })` | style-kit | Menulis `text` sampai `ceil(u × panjang)` karakter; `u` 0..1; caret `<span class="sk-caret">` berkedip setiap 0,5 s dengan `SK.stepTime`; tanpa DOM baru setiap frame (teks ditulis hanya saat berubah). |
| `SK.shake(t, t0, { amp = 10, dur = 0.3, freq = 30 })` | style-kit | `{x, y, r}` getar teredam: nol sebelum `t0` dan setelah `t0 + dur`; amplitudo meluruh linear; deterministik. |
| `SK.arcPath(p0, p1, bend = 0.25)` | style-kit | Path `M p0 Q c p1` dengan titik kontrol di tengah, digeser tegak lurus sebesar `bend × jarak` (positif = ke kiri arah jalan). |
| `SK.mapSvg(map, { fill, stroke, strokeWidth, regions = {} })` | asset-lib | String `<svg>` peta inline: setiap region sebagai `<path data-region="<id>">` dengan warna dari `regions[id]` atau `fill`. Data dari `SK.LIB.regions[map]` yang diekstrak build dari `maps/<map>.svg` (`world`, `sea`, `id-provinces`, `java`). Id tidak dikenal → error dengan saran. |

`SK.mapSvg` menambah ±170 KB ke `asset-lib.js` (peta sebagai `<img>` tidak bisa
diwarnai per region, dan clip tidak boleh memuat file saat render).

## Contoh baru (13)

| Clip | Pola | Treatment | Pustaka |
| --- | --- | --- | --- |
| `tx-05-type-counter` | type-on + counter-word | cutaway | `sk-pal-text-terminal`, `sk-type-text-terminal` |
| `tx-06-split-scale` | split-word + split-scale | panel | `sk-pal-text-cream-red`, Bebas Neue |
| `tx-07-zoom-grid` | zoom-assemble + grid-column | cutaway | `sk-type-text-editorial` |
| `tx-08-jitter-footage` | jitter-flash + over-footage | panel | `sk-type-text-brutal` |
| `tx-09-stamp-swash` | stamp-slam + swash-underline | split | `frame.stamp-hemat`, `frame.swash-2` |
| `tx-10-font-riso` | font-swap + riso-poster | cutaway | `sk-pal-text-risograph`, `.sk-tex-riso`, 4 font |
| `mg-05-race-timeline` | bar-race + timeline | cutaway | `sk-pal-mg-fintech` |
| `mg-06-before-venn` | before-after + venn | split | `sk-pal-mg-sunrise` |
| `mg-07-funnel-stack` | funnel + stack-up | panel | `sk-type-mg-jakarta`, `pict.*` |
| `mg-08-dots-bubbles` | dot-matrix + bubble-move | cutaway | `sk-pal-mg-ai-violet` |
| `mg-09-province-pin` | map-pin + province-glow | cutaway | `map.id-provinces`, `SK.mapSvg` |
| `mg-10-route` | route-arc | split | `map.sea`, `SK.CITIES` |
| `mg-11-kpi-orbit` | kpi-cards + icon-orbit | cutaway | `icon.*`, `sk-type-mg-data` |

Aturan setiap contoh (sama dengan contoh lama): komentar "Example only" (kata
dan angka karangan), satu `SK.clip`, fungsi murni waktu, tanpa `visibility`,
tanpa `font-family` di `<style>` clip, tanpa `../` di url; minimal dua still
pada kata kunci; SFX tidak dirender di contoh (dicatat di baris pola).

## Pengujian

- `scripts/style-examples.test.mjs` (baru, masuk `test:style-kit`):
  - `index.html` dan `snapshots.json` tiap host sama dengan hasil generator
    dari `examples.json`.
  - Setiap file di `compositions/` tiap host ada di manifest (clip atau
    `-front`), dan sebaliknya.
  - Setiap aset `assets/...` yang dirujuk ada dan ter-track di git.
  - Generator: waktu mulai, tween split, still → `at`, cutout/front.
- `scripts/style-docs.test.mjs`: path contoh menunjuk host gaya; tes cakupan —
  untuk gaya di daftar `COVERED = ['broll-text', 'motion-graphic']`, setiap
  nama pola muncul sebagai kata utuh di kolom Patterns tabel Examples.
  Menggantikan tes lama "32 clip di satu host".
- `scripts/style-kit.test.mjs`: `SK.typeOn`, `SK.shake`, `SK.arcPath`.
- `scripts/asset-lib.test.mjs`: `SK.mapSvg` (region, warna, id tak dikenal),
  `SK.LIB.regions` sama dengan path di file peta.
- Migrasi: 60 still lama identik byte dengan baseline (skrip sekali pakai di
  scratchpad, dicatat di plan).
- Visual: setiap still contoh baru dilihat; contoh yang tidak terbaca
  diperbaiki sebelum commit.

## Dokumen

- `broll-text.md`, `motion-graphic.md`: 8 baris pola baru; tabel Examples
  (path baru + 13 contoh); `## Build Recipe` menyebut helper baru bila relevan.
- Lima gaya lain: path di tabel Examples ke host gayanya.
- `styles/README.md`: Build Contract (host per gaya, `examples.json`, cara
  menambah contoh, check satu gaya).
- `AGENTS.md`, `CLAUDE.md`, `internal/docs/operations/runbook.md`: perintah
  check per gaya.
- `internal/docs/requirements/rd-03-video-editing-workflow.md`: EARS
  RD-03-56 (setiap pola di referensi gaya punya contoh yang bisa dirender, untuk
  gaya yang sudah dicakup) dan RD-03-57 (contoh baru ditambahkan lewat
  `examples.json`, host tidak ditulis tangan).
- `internal/docs/adr/0017-per-style-example-hosts.md` + indeks.
- `THIRD_PARTY_NOTICES.md`: path aset contoh bila berubah (tidak berubah —
  `style-examples/assets/` tetap).

## Spike sebelum plan

1. Host hasil generator untuk satu gaya (mis. broll-text) → still lama pada
   waktu lokal yang sama identik byte.
2. `SK.mapSvg('id-provinces')` inline di clip: lint 0 error, region terisi.
3. Check script dengan aset bersama disalin → mix-media (cutout webm) dan
   parallax (plate png) ter-render.

## Definisi selesai

- Tujuh host per gaya; host lama dihapus; 60 still lama identik byte.
- broll-text 20/20 dan motion-graphic 20/20 pola tercakup; 13 contoh baru
  lolos lint/validate dan sudah dilihat.
- Semua suite hijau; dokumen dan ADR/EARS di commit yang sama dengan kodenya.
- Merge ke main lokal hanya setelah Dena setuju.

## Risiko

- **Identik piksel setelah pindah host**: host harus sama persis (CSS, urutan
  kit, placeholder). Mitigasi: spike 1 sebelum plan; generator menyalin blok
  host lama apa adanya.
- **Contoh generik/slop**: contoh harus menunjukkan pola dengan jelas, bukan
  dekorasi. Mitigasi: kata contoh bertema Dena (AI, UMKM, uang), review still
  per contoh, anti-slop checklist gaya.
- **Ukuran `asset-lib.js`**: +170 KB region peta; masih jauh di bawah anggaran.
