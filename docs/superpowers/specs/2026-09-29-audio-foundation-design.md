# Audio Foundation — Adapter Suara (TTS), Uji Dengar, dan Pustaka Musik — Design

Status: approved 2026-09-29 (sub-proyek 1 dari "generate video motion design"; plan docs/superpowers/plans/2026-09-29-audio-foundation.md)
Date: 2026-09-29

## Latar belakang

Sampai sekarang repo ini hanya **mengedit** video talking-head Dena: tujuh style
(`vendor/style-kit`) dipakai sebagai overlay b-roll di atas footage, dan Story
berhenti dengan blocker bila tidak ada sumber speech (ADR-0022). Dena ingin
Claude/Codex dan Studio juga bisa **menghasilkan** video motion design dari
style yang sudah ada — explainer bernarasi, motion graphic pendek, kinetic post,
dan promo produk digital — dari topik/brief, URL/artikel/thread, produk digital,
atau repurpose video lama.

Pendekatan yang disetujui: **mode `generate` di dalam workflow 4 fase yang
sudah ada** (bukan skill upstream HyperFrames, bukan workflow terpisah), dengan
voiceover TTS menggantikan `processed.mp4` sebagai sumbu waktu. Pekerjaannya
dipecah menjadi lima sub-proyek, masing-masing dengan spec → plan → implementasi
sendiri:

1. **Fondasi audio** — dokumen ini.
2. Mode generate format explainer (brief / URL / repurpose): docs fase, starter
   tanpa base video, aturan *style world* (1 style utama + 1–2 aksen), ADR.
3. Studio: form "Generate video" + panel review (voiceover, storyboard, render).
4. Format tanpa narasi: motion-short dan kinetic-post (timing dari beat musik).
5. Format product-promo (capture/rekaman UI produk dibungkus motion).

Keputusan lintas sub-proyek yang sudah diambil: tiga gate untuk video generate
(naskah + suara → storyboard → render); satu style utama + aksen per video;
BGM dari web disimpan di `shared/music/`; Studio mendapat form + panel review.

## Keputusan yang sudah diambil (sub-proyek 1)

- **TTS dipakai untuk narasi.** Provider dipilih lewat **uji dengar blind**,
  bukan dari artikel benchmark. Uji dengar memuat **clone suara Dena dan suara
  narator stok**; keputusan suara diambil setelah mendengar.
- **Provider cloud: Gemini 3.8 Flash TTS** (`gemini-3.8-flash-tts`, GA
  2026-09-23; varian `gemini-3.8-flash-lite-tts`). Bahasa Indonesia didukung;
  punya voice replication (clone, wajib klip consent lisan), voice design, dan
  pustaka suara stok. Key `GEMINI_API_KEY` sudah ada di `.env` dan terverifikasi
  bisa melihat kedua model (2026-09-29).
- **Provider lokal: Supertonic 3** saja (99M, ONNX, Indonesian `id`, suara stok,
  tanpa clone; lisensi model OpenRAIL-M). OmniVoice dan Higgs Audio v3 dicoret.
  Kokoro, Chatterbox v3, dan Qwen3-TTS gugur karena tidak mendukung bahasa
  Indonesia; mesin ini M2 dengan RAM 8 GB.
- **Provider `recorded`**: rekaman VO Dena sendiri lewat jalur yang sama — jaring
  pengaman bila tidak ada TTS yang lolos.
- **BGM**: diambil dari web, disimpan di `shared/music/`, hanya lisensi yang
  boleh dipakai komersial tanpa atribusi (allowlist), bukti lisensi disimpan.
- **Uji dengar dan review musik dibuka dari HP lewat Studio**, karena penonton
  mendengar dari speaker HP.

## 1. Adapter suara

### Alur

```
teks naskah → split paragraf → normalisasi teks (+ leksikon) → provider (per paragraf, di-cache)
           → sambung paragraf (jeda tetap) → loudnorm −16 LUFS + trim hening → voiceover.wav
           → whisper.cpp (large-v3-turbo, id, prompt = naskah) → alignment DP ke kata naskah → words.json
```

- Paragraf = blok teks dipisah baris kosong. Tag inline Gemini (`<short pause>`,
  `<long pause>`, `<breath>`, `<laugh>`, …) diteruskan apa adanya ke `gemini`;
  untuk `supertonic` tag jeda diganti hening dengan durasi tetap dan tag lain
  dibuang.
- Output audio: WAV mono 48 kHz, −16 LUFS (sama dengan target `video cut`).
- Caption memakai **teks asli naskah**, bukan teks ternormalisasi.

### Provider

| Provider | Jalan di | Suara | Catatan |
| --- | --- | --- | --- |
| `gemini` | REST `generativelanguage.googleapis.com` lewat `fetch` Node (tanpa SDK, ADR-0007 tetap) | stok, hasil voice design, clone (`voice_…`) | `GEMINI_API_KEY` dari `.env`; model di preset |
| `supertonic` | sidecar Python `uv run --python 3.12 …` (tanpa venv/dep ter-commit; bobot di `~/.cache`) | stok | pengecualian ADR-0007 untuk Python dicatat di ADR-0023 |
| `recorded` | file audio Dena | suara asli | melewati normalisasi teks & cache; tetap loudnorm + alignment |

Tidak ada fallback diam-diam antar provider: suara yang berganti tanpa
diketahui adalah bug.

### Preset suara — `config/voices.json` (ter-track)

```json
{
  "version": 1,
  "default": null,
  "presets": {
    "gemini-stock-a": { "provider": "gemini", "model": "gemini-3.8-flash-tts", "voice": "<id pustaka>", "style": "<prompt gaya>" },
    "gemini-designed": { "provider": "gemini", "model": "gemini-3.8-flash-tts", "voiceRef": "shared/voices/designed/voice.json", "style": "<prompt gaya>" },
    "dena-clone": { "provider": "gemini", "model": "gemini-3.8-flash-tts", "voiceRef": "shared/voices/dena/voice.json", "style": "<prompt gaya>" },
    "supertonic-a": { "provider": "supertonic", "voice": "<id suara>", "speed": 1.0 },
    "recorded": { "provider": "recorded" }
  }
}
```

- Id suara pribadi (`voice_…` clone Dena, suara hasil design) **tidak** ditulis di
  file ter-track: preset merujuk `voiceRef` ke file di `shared/voices/` yang
  di-gitignore (repo ini juga template open-source).
- `default` diisi setelah uji dengar dan dicatat di ADR-0023.

### Normalisasi teks + leksikon — `config/pronunciation.json` (ter-track)

Deterministik, provider-agnostik, jalan sebelum provider mana pun:

- Bilangan bulat dan desimal → kata ("2,5" → "dua koma lima"), ribuan dengan titik.
- Mata uang: "Rp2,5 jt" / "Rp2.500.000" → "dua koma lima juta rupiah" /
  "dua juta lima ratus ribu rupiah"; singkatan `rb`, `jt`, `M`.
- Persen ("70%" → "tujuh puluh persen"), rentang ("3–5" → "tiga sampai lima"),
  tahun ("2026" → "dua ribu dua puluh enam"), kali ("3x" → "tiga kali").
- Leksikon: `{ "term": "CRM", "say": "si ar em", "only": ["supertonic"] }` —
  `only` opsional membatasi entri ke provider tertentu (Gemini mungkin sudah
  benar mengucapkan istilah Inggris; leksikon tumbuh dari temuan uji dengar).

### Cache per paragraf (determinisme)

TTS tidak deterministik; render ulang harus identik. Setiap paragraf disimpan di
cache dengan kunci `sha256(provider, model, voice, style, teks ternormalisasi)`.
Paragraf yang tidak berubah tidak dibuat ulang; revisi satu kalimat hanya
membuat ulang satu paragraf. Cache disimpan di `<out>/cache/`, di samping
`voiceover.wav` dan `voice-meta.json` dari output yang sama (`<out>` = folder
`--out` untuk `voice say`, folder sampel untuk uji dengar, `videos/<slug>/voice/`
di sub-proyek 2).

### `voice-meta.json`

```json
{
  "version": 1,
  "preset": "gemini-stock-a",
  "provider": "gemini", "model": "gemini-3.8-flash-tts", "voice": "<id>",
  "paragraphs": [ { "hash": "<sha256>", "text": "<teks naskah>", "start": 0.0, "end": 6.42, "cached": true } ],
  "duration": 41.8,
  "lufs": -16.0,
  "alignment": { "wer": 0.03, "unmatched": ["deploy"] }
}
```

### Alignment ke naskah — `words.json`

whisper.cpp mentranskrip `voiceover.wav` dengan timestamp per kata; alignment DP
(edit distance di level kata, normalisasi huruf kecil dan tanda baca) memetakan
kata ASR ke kata naskah. Hasil: `[{ "text": "<kata naskah>", "start": s, "end": s,
"matched": true }]`. Kata naskah tanpa pasangan mendapat waktu interpolasi dari
tetangganya dan `matched: false`. WER > 10% → peringatan yang menyebut kata
yang meleset (TTS kemungkinan salah baca) + saran membuat ulang paragraf itu.

### CLI `npm run voice -- <cmd>` (`scripts/voice.mjs`)

- `say <teks|--file f> --preset <p> --out <dir>` — ad-hoc, untuk debug preset.
- `ref --from <file di shared/> --at <s> --dur <s> [--name dena]` — potong sampel
  referensi 10–20 s → `shared/voices/<name>/ref.wav` + `ref.txt` (whisper).
- `clone --name dena --consent <file>` — daftarkan `ref.wav` + klip consent ke
  Gemini (voice replication, `store: true`), tulis `shared/voices/<name>/voice.json`
  berisi `voice_…`. Tanpa klip consent → ditolak.
- `design --name <n> --prompt "<deskripsi>"` — voice design Gemini → `voice.json`.
- `voices [--filter …]` — daftar suara pustaka Gemini (untuk saringan uji dengar).
- `test build` / `test reveal` — bagian 2.

Sub-proyek 2 menambah `npm run video -- voice <slug>` di atas modul yang sama.

### Susunan kode

```
scripts/voice.mjs                 # CLI
scripts/lib/voice/normalize.mjs   # normalisasi teks + leksikon
scripts/lib/voice/align.mjs       # alignment DP kata ASR → kata naskah
scripts/lib/voice/synth.mjs       # split paragraf, cache, sambung, loudnorm, meta
scripts/lib/voice/providers/gemini.mjs
scripts/lib/voice/providers/supertonic.mjs  (+ supertonic_say.py dijalankan lewat uv)
scripts/lib/voice/providers/recorded.mjs
scripts/lib/voice/test-run.mjs    # build/reveal uji dengar
```

## 2. Uji dengar blind

### Naskah uji — `config/voice-test-script.md` (ter-track)

±40 detik, register Dena, sengaja memuat jebakan: hook bernada tinggi; campuran
Indonesia–Inggris (*AI agent, workflow, deploy, prompt*); register santai (*gue,
lo, jujur, ternyata*); angka dan satuan (*Rp2,5 juta, 70%, 3 kali*); singkatan
(*CRM, ERP, API*); satu kalimat tanya; satu kalimat reflektif pelan. Agent
menulis draf; Dena boleh mengedit sebelum `test build`.

### Kandidat

| # | Kandidat | Jenis |
| --- | --- | --- |
| 1 | Gemini 3.8 Flash TTS — clone Dena | clone |
| 2–3 | Gemini 3.8 Flash TTS — 2 suara stok + prompt gaya "founder ngobrol santai, register Jakarta" | stok |
| 4 | Gemini 3.8 Flash TTS — 1 suara hasil voice design | narator channel |
| 5 | Gemini 3.8 Flash-Lite TTS — suara stok terbaik dari #2–3 | cek varian murah |
| 6–7 | Supertonic 3 — 2 suara stok | lokal / offline |

Deskripsi voice design dan pilihan suara stok tidak mengasumsikan gender
dari nama; agent menanyakan preferensi karakter suara ke Dena saat menyiapkan
kandidat bila belum jelas.

### `npm run voice -- test build`

1. **Saringan otomatis:** kalimat hook dibacakan ±8 suara stok pustaka Gemini;
   whisper mengukur WER; dua terbaik menjadi kandidat #2–3 (`screen.json`).
2. Membuat semua kandidat lewat adapter (normalisasi yang sama, **semua
   −16 LUFS** supaya kandidat yang lebih keras tidak terdengar "lebih bagus").
3. Mengacak urutan dengan seed, label A–G; kunci di `key.json`.

Layout run (gitignored):

```
shared/voice-tests/<YYYYMMDD-HHMM>/
  script.md        # salinan naskah uji
  screen.json      # hasil saringan WER
  key.json         # label → preset/provider/model/voice + seed (tidak pernah dilayani Studio)
  samples/A.wav … G.wav
  ref.wav          # salinan referensi suara asli Dena (tidak diacak)
  ratings.json     # ditulis Studio
  reveal.md        # ditulis `test reveal`
```

### Halaman Studio `/voice-test`

- Daftar run (terbaru di atas) → halaman run.
- Klip referensi suara asli Dena di atas (tidak diacak) untuk menilai kemiripan.
- Tiap sampel A–G: player + rating 1–5 untuk **natural** (tidak robotik),
  **ucapan istilah Inggris & angka**, **cocok gaya Dena**, **mirip suara Dena**,
  **betah didengar 60 detik**, + catatan (≤ 1000 karakter).
- Anjuran di halaman: dengar sekali lewat speaker HP, sekali lewat headset.
- Simpan → `POST /api/voice-tests/<run>/ratings` → `ratings.json` (`savedAt`).
- Route media hanya melayani `samples/*.wav` dan `ref.wav`; **`key.json` tidak
  pernah dilayani** (blind).

### `npm run voice -- test reveal <run>`

Gabungkan `ratings.json` + `key.json` + `screen.json` → `reveal.md`: peringkat
rata-rata skor, skor per kriteria, WER alignment, provider/model, perkiraan biaya
per menit. Agent mengusulkan preset default; **Dena memutuskan**; keputusan
ditulis ke `config/voices.json.default` dan ADR-0023. Tidak ada kandidat yang
lolos → `recorded` jadi default, dan cloud lain (ElevenLabs/MiniMax) menjadi
keputusan terpisah.

## 3. Pustaka musik `shared/music/`

### Allowlist lisensi (dikunci di kode)

| Tier | Id lisensi | Sumber contoh | Catatan |
| --- | --- | --- | --- |
| A (prioritas) | `cc0`, `public-domain` | Freesound (filter CC0), OpenGameArt CC0, Free Music Archive (subset CC0) | bebas |
| B | `pixabay`, `mixkit` | Pixabay Music, Mixkit | komersial tanpa atribusi; risiko klaim Content ID dicatat per track |

Ditolak: CC-BY (wajib atribusi), NC/ND, "personal use only", YouTube Audio
Library (syarat terikat platform), musik AI dengan hak tidak jelas.

### Katalog `shared/music/catalog.json`

```json
{
  "version": 1,
  "tracks": [
    {
      "id": "m01-quiet-desk",
      "file": "m01-quiet-desk.mp3",
      "title": "…", "author": "…",
      "sourceUrl": "https://…",
      "license": "cc0",
      "licenseProof": "licenses/m01-quiet-desk.txt",
      "retrievedAt": "2026-09-29",
      "sha256": "…",
      "duration": 142.3, "lufs": -14.2,
      "mood": ["reflektif"], "energy": 2, "bpm": null,
      "vocals": false, "loopable": false,
      "contentIdRisk": "none",
      "rejected": false,
      "notes": "intro kuat di 0:04"
    }
  ]
}
```

`licenseProof` = salinan teks lisensi/halaman track + tanggal ambil di
`shared/music/licenses/`. `contentIdRisk`: `none` (CC0/PD), `unknown`, `known`.

### CLI `npm run music -- <cmd>` (`scripts/music.mjs`)

- `add <url|file> --source <halaman> --license <id> --title … --author … --mood a,b --energy n [--notes …]`
  — unduh (atau salin file lokal), `ffprobe` durasi, `ebur128` loudness, sha256,
  tulis bukti lisensi, catat. Lisensi di luar allowlist → ditolak. Situs yang
  menolak unduhan otomatis → Dena unduh manual lalu `add <file>` dengan argumen
  yang sama.
- `list [--mood …] [--min-dur s] [--include-rejected]` — dipakai agent memilih BGM.
- `check` — setiap file ada, sha cocok, lisensi di allowlist, bukti lisensi ada.

Pengunduhan dikurasi satu per satu, bukan crawler massal.

### Kurasi awal

±15 track tanpa vokal, minimal 60 s atau loopable, di enam mood:

| Mood | Cocok untuk |
| --- | --- |
| reflektif | storytelling, parallax |
| tech-ringan | tutorial, motion-graphic |
| tensi / build | hook |
| playful | stop-motion, whiteboard |
| sinematik | vox, parallax |
| upbeat | product-promo, motion-short |

### Halaman Studio `/music`

Daftar track (judul, mood, energy, durasi, lisensi, risiko Content ID) dengan
player dan tombol **tolak / batal tolak** (`POST /api/music/<id>/reject`,
body `{ "rejected": true|false }`) yang menulis `rejected` di katalog. Track
`rejected` tidak muncul di `music list` default. Ducking/level BGM di bawah
narasi diputuskan di sub-proyek 2.

## 4. Error handling

| Kondisi | Perilaku |
| --- | --- |
| `GEMINI_API_KEY` tidak ada | gagal, pesan menunjuk `.env` / `.env.example` |
| Gemini 429 / 5xx | retry backoff (maks 3), lalu gagal dengan status + pesan API |
| Gemini 4xx lain | langsung gagal dengan pesan API |
| `uv` atau model Supertonic belum ada | gagal dengan perintah install/unduh |
| Provider gagal | tidak ada fallback ke provider lain |
| WER alignment > 10% | peringatan + kata yang meleset + saran regenerate paragraf |
| `voice clone` tanpa `--consent` | ditolak |
| Preset tidak dikenal / `voiceRef` hilang | gagal, sebut preset dan path |
| Lisensi musik di luar allowlist | `music add` ditolak |
| File musik hilang / sha tidak cocok / bukti lisensi hilang | `music check` gagal per track |
| Rating tidak valid (label di luar run, skor bukan 1–5, catatan terlalu panjang) | Studio 400 |

## Keamanan dan privasi

- `GEMINI_API_KEY` hanya di `.env` (gitignored); `.env.example` mendapat baris
  kosong `GEMINI_API_KEY=`. Key yang sekarang pernah ditempel di chat → sarankan
  dibatasi ke Generative Language API atau di-rotate setelah fase uji.
- Sampel suara dan klip consent Dena dikirim ke Google dan disimpan sebagai
  voice persisten (TTL 1 tahun, maks 200 per project). File lokalnya hanya di
  `shared/voices/` (gitignored). Periksa tier billing: bila free tier, cek
  ketentuan penggunaan data input oleh Google sebelum mengunggah sampel suara.
- Studio: route baru mengikuti guard yang ada (Host/Origin, `STUDIO_TOKEN`).

## Dokumentasi yang berubah

- **ADR-0023** fondasi suara: Gemini 3.8 Flash TTS + Supertonic (sidecar `uv`,
  pengecualian ADR-0007 untuk Python) + `recorded`; preset, normalisasi, cache
  per paragraf, alignment; data consent di Google; preset default hasil uji dengar.
- **ADR-0024** pustaka musik `shared/music/` + allowlist lisensi + bukti lisensi.
- **RD-06-audio** (baru, EARS): adapter suara, uji dengar, pustaka musik.
- **RD-05-studio**: kriteria halaman `/voice-test` dan `/music`.
- `internal/docs/README.md` (index + registry), `architecture/stack.md` (Gemini,
  uv/Python, Supertonic), `architecture/data-model.md` (`voices.json`,
  `pronunciation.json`, `voice-meta.json`, `words.json`, run uji dengar,
  `catalog.json`), `security/security-standard.md` (key + data suara),
  `operations/runbook.md` (perintah), `docs/initial-setup.md` (uv + model
  Supertonic), `.env.example`, daftar perintah di `CLAUDE.md` / `AGENTS.md`.

## Test

Offline, `node --test`, `fetch` palsu dan fixture audio kecil:

- `npm run test:voice`: normalisasi (bilangan, desimal, Rp/rb/jt/M, %, rentang,
  tahun, `3x`, leksikon + `only`); split paragraf + perlakuan tag per provider;
  kunci cache + reuse; builder request Gemini + parsing WAV + retry 429/5xx;
  alignment DP (kata hilang, tambahan, salah dengar, interpolasi `matched:false`,
  WER); validasi preset + `voiceRef`; pengacakan dengan seed; agregasi reveal.
- `npm run test:music`: allowlist, `add` dari file lokal (probe, sha, bukti
  lisensi), `list` filter + `rejected`, `check` (file hilang, sha salah).
- `npm run test:studio` diperluas: `/voice-test` (daftar run, `key.json` tidak
  terlayani, rating valid/invalid, guard Origin), `/music` (tolak/batal tolak).

Smoke nyata (manual, tidak di suite): `voice say` satu kalimat lewat Gemini dan
Supertonic.

## Urutan pengerjaan

1. **Spike** (hasilnya menjadi amandemen spec ini bila berbeda): endpoint 3.8
   (`/v1beta/interactions` vs `generateContent`; metadata model menyebut
   `generateContent`), bentuk REST `/v1beta/voices` untuk list, design, dan
   replication + consent (format/durasi referensi), harga + free tier + ketentuan
   data; Supertonic 3 lewat `uv` di Python 3.12 pada M2 8 GB (nama suara, kualitas
   Indonesian, kecepatan); flag whisper.cpp untuk timestamp per kata.
2. Docs dulu: ADR-0023, ADR-0024, RD-06, tambahan RD-05.
3. Normalisasi + leksikon (TDD).
4. Provider `gemini`, `supertonic`, `recorded` + cache + sambung + loudnorm + meta.
5. Alignment (whisper + DP) → `words.json`.
6. CLI `voice` (`say`, `ref`, `clone`, `design`, `voices`).
7. `voice test build` / `reveal`.
8. CLI `music` (`add`, `list`, `check`).
9. Studio `/voice-test` dan `/music`.
10. Jalankan uji dengar nyata: draf naskah uji → Dena mengedit → Dena merekam
    klip consent → `test build` → Dena menilai di HP → `test reveal` → Dena
    memilih default → catat.
11. Kurasi ±15 track → `music check` → Dena review di Studio `/music`.

**Definition of Done:** semua test lulus; uji dengar pertama selesai dan
dinilai; preset default dipilih dan tercatat (`config/voices.json`, ADR-0023);
±15 track lolos `music check` dan sudah direview Dena di Studio; docs di atas
diperbarui di commit yang sama dengan kodenya.

## Di luar scope

- Mode generate itu sendiri (Story generate, `npm run video -- voice <slug>`,
  starter tanpa base video) — sub-proyek 2.
- Mixing/ducking BGM di bawah narasi, deteksi BPM — sub-proyek 2 dan 4.
- Form "Generate video" dan panel review project di Studio — sub-proyek 3.
- ElevenLabs, MiniMax, OmniVoice, Higgs Audio, Kokoro.
- Pemeriksaan klaim Content ID otomatis.
