# Visual System
Status: accepted (reverse-engineered)
Date: 2026-07-20

Kanonik untuk: sistem visual komposisi video Dena (warna, tipografi, kartu,
caption, layer/track, z-index, safe area). Diturunkan dari starter `templates/dena-video/index.html` +
`docs/dena-social-video-style-guide.md` + `docs/agents/references/captions.md` & `motion-grammar.md`.

## Kanvas

- Ukuran tetap **1080x1920** (9:16), `overflow: hidden`, background `#000`.
- Root komposisi background `#050505`, `box-sizing: border-box` global.
- Variabel CSS root komposisi (starter `templates/dena-video/index.html`; nilai lama dari komposisi video sebelumnya):
  `--white:#fff`, `--black:#050505`, `--panel:rgba(5,5,5,0.9)`,
  `--yellow:#facc15`, `--green:#22c55e`, `--muted:#d4d4d8`, `--safe-bottom:270px`.

## Palet & makna warna

| Token | Nilai | Makna |
| --- | --- | --- |
| white | `#fff` | Teks caption normal |
| yellow | `#facc15` | Satu keyword/frasa penting per beat; highlight; progress fill |
| green | `#22c55e` | Label status positif (mis. "review → approve → publish") |
| black/panel | `#050505` / `rgba(5,5,5,0.9)` | Latar kartu hook/CTA/proof/label |
| red | — | Hanya untuk peringatan (bukan dekorasi) |

## Tipografi

- Keluarga: `Arial, Helvetica, sans-serif` (heavy sans).
- Caption: `font-size 54px`, `font-weight 950`, `line-height 0.98`, uppercase,
  `text-shadow: 0 5px 0 #000, 0 12px 26px rgba(0,0,0,.72)`,
  `-webkit-text-stroke: 2px #000`, `overflow-wrap: anywhere`.
- Hook card `.line`: `48px/950`; badge `.small`: `30px/950` kuning.
- Proof figcaption: `22px/950` kuning uppercase. Label card: `25px/950` uppercase.
- Sticker: `27px/950`, background kuning, teks hitam, `rotate(3deg)`.
- CTA `.main`: `42px/950`; `.reply` chip: `31px/950` teks hitam di kuning.

## Komponen (kelas CSS)

- `.base-video` — video utama, `inset:0`, `object-fit:cover`, `z-index:1`.
- `.progress-bar` / `.progress-fill` — bar atas tinggi `10px`, fill kuning
  `scaleX` 0→1 sepanjang durasi.
- `.hook-card` — kartu atas (top `92px`), border tipis, uppercase, center.
- `.proof-card` (`.left`/`.right`/`.wide`) — kartu bukti gambar dengan figcaption.
- `.label-card` (`.left`/`.right`/`.green`) — label konteks kecil.
- `.sticker` — stiker kuning miring.
- `.caption` — subtitle utama, area bawah (`bottom: var(--safe-bottom)`).
- `.highlight` — span kuning di dalam caption.
- `.cta-card` — kartu CTA akhir.

## Layer / track (kontrak temporal, `data-track-index`)

Kontrak layer dari style guide (dipetakan ke penggunaan `index.html`):

| Track | Peran | Contoh `index.html` |
| --- | --- | --- |
| 1 | Video utama (+ audio terpisah) | `#base-video` |
| 2 | Caption utama (subtitle beats) | `.caption` (`cap-001..051`) |
| 3 | Efek retensi / progress / zoom label | `#progress` |
| 4 | Overlay kontekstual (screenshot, b-roll, kartu bukti) | `.proof-card` |
| 5 | Hook card / editorial title / takeaway besar / CTA / end card | `#hook-card`, `#cta-card` |
| 6 | Label/sticker kecil (varian track kontekstual) | `.label-card`, `.sticker` |
| 10+ | Audio: base audio (10), SFX (11..16) | `#base-audio`, `#sfx-*` |

> `data-track-index` mengatur tumpang tindih temporal saja. Urutan paint (siapa di
> atas siapa) diatur CSS `z-index`.

## Z-index (urutan paint)

Dari `index.html` (nilai aktual) dan `docs/agents/references/hyperframes-assembly.md`:

- Base video `1` → dim/vignette `10` → screenshot/b-roll/proof `~20-24` →
  efek/highlight/progress `~30-38` → caption `45` → hook/CTA `56-57`.

## Safe area

- Hindari `120px` teratas (kecuali hook card) dan `220px` terbawah (kontrol
  TikTok/Reels). `index.html` menaruh caption pada `--safe-bottom: 270px`.

## Motion primitives (default, fase Screen Plan)

- `caption-pop` (scale 0.96→1, opacity 0→1, 0.12–0.2s) — dipakai di loop caption.
- `hook-card-snap` (y −24→0, 0.2–0.35s, hold 2–3s).
- `proof-card-slide` (0.25–0.45s, track 4).
- `punch-zoom` base video (scale 1.0→1.04–1.08, 0.2–0.4s).
- `progress-bar` deterministik. `flash-cut` < 0.12s. `cta-morph` hold 2–4s.

## Motion b-roll (motion-kit)

- Engine `vendor/motion-kit/` dimuat sekali di `videos/<slug>/index.html` (starter); setiap clip adalah
  sub-composition `videos/<slug>/compositions/broll/*.html` di **track 4**. Mount host ber-class
  `broll` (`position:absolute; inset:0; z-index:22`), di bawah caption (45) dan
  hook/CTA (56–57).
- Token: kanvas `#050505`; shape putih `#FFFFFF` (tinta `#050505`) atau panel
  `#111111` + border `rgba(255,255,255,.12)`; satu aksen `#facc15`; sukses
  `#22c55e`; muted `#d4d4d8`.
- Font di dalam shape: Geist (UI), Geist Mono (terminal/nama file). Caption tetap
  Arial 950.
- Treatment: cutaway (latar `#050505` penuh), split (clip mengisi separuh atas;
  host menggeser `#base-video` ke bawah lewat `y`), panel (clip transparan di zona
  kosong). Detail: `docs/agents/references/motion-broll-authoring.md`.

## Style b-roll (style-kit)

- Engine `vendor/style-kit/` (`window.SK`) dimuat setelah motion-kit di starter;
  clip `broll-text`, `motion-graphic`, `whiteboard` memakai mount yang sama
  (track 4, class `broll`, z 22).
- Palet bebas per clip (ditulis di Style B-roll Brief) lewat variabel
  `--sk-bg`, `--sk-ink`, `--sk-accent`, `--sk-accent-2`, `--sk-muted` pada
  `.sk-stage`; default tema: `.sk-text` hitam + kuning, `.sk-mg` krem + biru,
  `.sk-wb` putih kertas + tinta + merah/biru. Caption, hook, dan CTA tetap
  sistem Dena.
- Font: Anton (`.sk-display`), Geist (`.sk-sans`), Caveat (`.sk-hand`), semua
  lokal. Teks di clip ≥ 34–36 px; area aman x 80–1000, y 180–1400.
- Detail: `docs/agents/references/styles/README.md` dan satu file per gaya.

## SFX

- Cue SFX (`#sfx-*`) dengan `data-volume` rendah (`0.09–0.12`), audible di HP
  namun di bawah speech. Contoh: impact-bass, whoosh-short, click-soft, pop, chime.

## Referensi

- Implementasi: [frontend/composition-implementation](../frontend/composition-implementation.md)
- Kontrak render: [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md)
