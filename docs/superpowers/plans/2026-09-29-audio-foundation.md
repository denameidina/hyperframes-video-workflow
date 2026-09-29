# Audio Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A voice adapter (Gemini 3.8 Flash TTS, local Supertonic 3, or Dena's own recording) that turns a script into a timed, loudness-normalized voiceover; a blind listening test Dena rates on her phone to pick the default voice; and a license-allowlisted BGM library in `shared/music/` — sub-project 1 of "generate video motion design".

**Architecture:** `scripts/lib/voice/` holds small pure-ish modules (normalize → script → providers → synth → whisper/align → render) behind one entry, `renderVoice()`, used by the `npm run voice` CLI and the listening test. Providers are injected (`fetch`, `spawnSync`) so every test runs offline. `scripts/lib/music.mjs` is the one writer of `shared/music/catalog.json`, used by `npm run music` and the Studio. The Studio gets two tabs, **Suara** (blind rating) and **Musik** (listen/reject), on its existing router.

**Tech Stack:** Node 22+ built-ins only (`node:fs`, `node:child_process`, `node:crypto`, `node:test`, `fetch`), ffmpeg/ffprobe, whisper.cpp (`vendor/whisper.cpp`, large-v3-turbo), Gemini REST `v1beta` (`gemini-3.8-flash-tts`), Supertonic 3 via `uv run --python 3.12 --with supertonic==1.3.1`, plain HTML/CSS/JS Studio UI, Markdown docs (Indonesian EARS in `internal/docs/`).

**Spec:** `docs/superpowers/specs/2026-09-29-audio-foundation-design.md` (amended in Task 1 with the spike results below).

## Global Constraints

- No npm dependencies (ADR-0007): import only `node:*` modules and repo files. Python only as the Supertonic sidecar run by `uv` (nothing installed into the repo).
- ES modules; 2-space indent, single quotes, semicolons (match `scripts/video.mjs`). Helper modules in `scripts/lib/`; tests are `scripts/*.test.mjs` run by `node --test`.
- Gemini key env var is `GEMINI_TTS_API_KEY`, never `GEMINI_API_KEY` (hyperframes snapshot sends frames to Gemini under that name; Studio loads `.env` into agent tmux sessions). `.env` already holds `GEMINI_TTS_API_KEY` on Dena's Mac.
- Gemini model `gemini-3.8-flash-tts`; endpoint `POST https://generativelanguage.googleapis.com/v1beta/interactions`; voices `https://generativelanguage.googleapis.com/v1beta/voices`.
- Supertonic: `uv run --quiet --python 3.12 --with supertonic==1.3.1 python scripts/lib/voice/providers/supertonic_say.py`; voices `F1`–`F5`, `M1`–`M5`; language `id`.
- `voiceover.wav`: WAV 48 kHz mono; paragraphs trimmed at −50 dB, joined with a 0.35 s gap, one gain pass to −16 LUFS (clamp ±20 dB) with limiter 0.84 — reuse `loudnessArgs`, `parseLoudnorm`, `gainDb`, `LOUDNESS` from `scripts/lib/cut-plan.mjs`.
- Paragraph cache key: `sha256(JSON.stringify([provider, model, voice, style, String(speed), spokenText]))` (first 32 hex chars) in `<out>/cache/`.
- whisper: `vendor/whisper.cpp/build/bin/whisper-cli -m vendor/whisper.cpp/models/ggml-large-v3-turbo.bin -l id -nfa --dtw large.v3.turbo -oj -ojf -np --prompt <domain prompt, never the script>`.
- Alignment WER warning threshold 0.10. Retry Gemini synthesis on 429/5xx up to 3 times (1 s, 2 s, 4 s); never retry `POST /v1beta/voices`.
- Voice replication: reference 10–30 s, consent 2–30 s, both converted to 24 kHz mono s16 WAV. Consent sentence (id-ID): "Saya pemilik suara ini dan saya menyetujui Google menggunakan suara ini untuk membuat model suara sintetis."
- Private voice ids and recordings only in `shared/voices/<name>/` (gitignored); tracked presets reference them through `voiceRef`.
- Music license allowlist: `cc0`, `public-domain` (tier A), `pixabay`, `mixkit` (tier B). Moods: `reflektif, tech-ringan, tensi, playful, sinematik, upbeat`. Energy 1–5. Audio `.mp3 .ogg .wav .m4a`.
- Files are written as `.part` then renamed. No partial files after a failure.
- Docs: ADR/RD text in Indonesian EARS style (`internal/docs/requirements/ears-standard.md`); touched docs committed with their code; Task 1 writes the contracts first.
- Do not call Repliz or upload to R2 anywhere in this plan. Only Tasks 10–12 make real Gemini calls (cents), and Task 11 creates stored voices only after Dena's go-ahead.

## Spec amendments (recorded in Task 1)

Every item below was verified on 2026-09-29 against the live API / this Mac before this plan was written; all code in this plan ran green in a scratch copy of the repo (voice 29 tests, music 6, Studio 32, video 37) and end to end with real Gemini + Supertonic.

- Key renamed to `GEMINI_TTS_API_KEY` (see Global Constraints).
- Gemini has **no Indonesian-native prebuilt voice** (2,089 prebuilt voices; the closest are 8 `jv-ID`, Javanese accent). Candidates: A clone Dena; 2 voice designs `id-ID`; the 2 best by WER from a Gemini prebuilt pool (incl. 2 `jv-ID`); the 2 best by WER from Supertonic's 10 voices. Flash-Lite dropped (saves only ≈ USD 0.0045/min).
- Verified request shapes: style goes in `input: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }]`; audio comes back in `steps[].content[]` as `audio/wav` 24 kHz mono. Voice design/replication: `POST /v1beta/voices` with `{ store: true, voice: { model, type, display_name, language_code?, prompted: { input } | replicated: { source_audio, consent_audio } } }`; list with `GET /v1beta/voices?type=prebuilt&page_size=100&page_token=…`.
- Pricing: free tier inputs are "used to improve our products"; paid tier not. Paid ≈ USD 0.0135 per audio minute through 2026-12-31. Enable billing before cloning.
- Supertonic reads `<short pause>` / `<long pause>` as a comma / full stop; other tags are dropped (no inserted silence).
- whisper prompt is a domain prompt, never the script (a script prompt would hide words the TTS skipped). `words.json` times are DTW times (±0.2–0.3 s after onset, RD-04-11).
- Studio: tabs **Suara** and **Musik** in the existing single-page UI instead of separate `/voice-test` and `/music` pages. Files go through `/api/voice-tests/<run>/files/<name>` and `/api/music/<id>/file` (a `/media/music/<x>` path would collide with the render route `/media/<slug>/<file>`).
- Music: Pixabay answers 403 to scripted downloads → manual download + `music add <file>`. Mixkit, Freesound (HQ previews), OpenGameArt download directly. License proof = a text record written by `music add` plus an optional `--proof <file>`.
- Code layout: `scripts/lib/voice/` (+ `providers/`), tests `scripts/voice-*.test.mjs` with shared helpers in `scripts/voice-fixtures.mjs`; `npm run test:voice` uses the glob.
- Requirement ids: RD-06-01…RD-06-22 (new RD-06), RD-05-18…RD-05-20 (Studio).

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/lib/voice/normalize.mjs` | Indonesian number words, money/percent/units/`Nx`/`ke-N`/ranges, lexicon; `normalizeForSpeech`, `loadLexicon` |
| `scripts/lib/voice/script.mjs` | Script markdown → paragraphs; inline tags per provider; caption words |
| `scripts/lib/voice/whisper.mjs` | whisper.cpp command plan + transcript text |
| `scripts/lib/voice/align.mjs` | whisper tokens → words; DP alignment onto the script in spoken form; WER |
| `scripts/lib/voice/exec.mjs` | Child-process wrapper with "not installed" hints |
| `scripts/lib/voice/presets.mjs` | `config/voices.json`, preset lookup, `voiceRef` resolution |
| `scripts/lib/voice/providers/gemini.mjs` | Gemini REST: speech, prebuilt voice list, voice design, replication |
| `scripts/lib/voice/providers/supertonic.mjs` + `supertonic_say.py` | Supertonic uv sidecar |
| `scripts/lib/voice/synth.mjs` | Paragraph cache, trim, join, loudness → `voiceover.wav`; recordings |
| `scripts/lib/voice/render.mjs` | `renderVoice()`: synth + alignment + `voice-meta.json` / `words.json` |
| `scripts/lib/voice/test-run.mjs` | Listening test: screen, build, ratings, reveal |
| `scripts/voice.mjs` | CLI `npm run voice -- say|ref|clone|design|voices|test build|test reveal` |
| `scripts/lib/music.mjs`, `scripts/music.mjs` | BGM catalog writer + CLI `npm run music -- add|list|check` |
| `scripts/studio/voice-tests.mjs`, `scripts/studio/music.mjs` | Studio handlers for the Suara and Musik tabs |
| `config/voices.json`, `config/pronunciation.json`, `config/voice-test.json`, `config/voice-test-script.md` | Tracked presets, lexicon, listening-test config and script |
| `scripts/voice-fixtures.mjs`, `scripts/voice-*.test.mjs`, `scripts/music.test.mjs` | Tests (offline) |

---

### Task 1: Docs first — spec amendments, ADR-0023/0024, RD-06, RD-05-18…20, data model

**Files:**
- Modify: `docs/superpowers/specs/2026-09-29-audio-foundation-design.md` (append amendments)
- Create: `internal/docs/adr/0023-voice-adapter-tts.md`, `internal/docs/adr/0024-music-library.md`, `internal/docs/requirements/rd-06-audio.md`
- Modify: `internal/docs/README.md`, `internal/docs/requirements/{ears-standard,frd,rd-05-studio}.md`, `internal/docs/entrypoints/rd.md`, `internal/docs/architecture/data-model.md`, `internal/docs/security/security-standard.md`, `.env.example`

**Interfaces:**
- Produces: the requirement ids every later task cites (RD-06-01…22, RD-05-18…20) and the data contracts in `data-model.md`.

- [ ] **Step 1: Append the amendments to the spec**

Append this section to the end of `docs/superpowers/specs/2026-09-29-audio-foundation-design.md` (the spec status line stays):

```md
## Amandemen saat planning (2026-09-29, hasil spike)

Semua butir di bawah diverifikasi terhadap API Gemini dan mesin ini sebelum plan
`docs/superpowers/plans/2026-09-29-audio-foundation.md` ditulis.

1. **Nama key `GEMINI_TTS_API_KEY`**, bukan `GEMINI_API_KEY`. Studio memuat `.env` ke
   sesi agen tmux, dan `hyperframes snapshot` memakai `GEMINI_API_KEY` untuk mengirim
   frame ke Gemini (RD-02-24).
2. **Tidak ada suara prebuilt native Indonesia** di Gemini (2.089 suara; terdekat 8 suara
   `jv-ID` berlogat Jawa). Kandidat uji dengar menjadi: clone Dena; 2 voice design
   `id-ID`; 2 terbaik saringan WER dari pool prebuilt Gemini (termasuk 2 `jv-ID`);
   2 terbaik saringan WER dari 10 suara Supertonic. Flash-Lite dicoret: selisih biaya
   hanya ±USD 0,0045 per menit.
3. **Bentuk API terverifikasi.** Sintesis: `POST /v1beta/interactions`, gaya di
   `input: [{ type: "text", text, annotations: [{ type: "speech_metadata", style }] }]`,
   audio di `steps[].content[]` (`audio/wav`, 24 kHz mono). Voice:
   `POST /v1beta/voices` dengan
   `{ store: true, voice: { model, type, display_name, language_code?, prompted: { input } | replicated: { source_audio, consent_audio } } }`;
   daftar suara `GET /v1beta/voices?type=prebuilt&page_size=100&page_token=…`.
   Referensi clone 10–30 s (24 kHz mono 16-bit); kalimat consent bahasa Indonesia:
   "Saya pemilik suara ini dan saya menyetujui Google menggunakan suara ini untuk membuat
   model suara sintetis."
4. **Harga dan data.** Free tier: input dipakai Google untuk memperbaiki produk; paid tier
   tidak. Paid ±USD 0,0135 per menit audio sampai 2026-12-31. Paid tier dulu sebelum clone.
5. **Supertonic**: `supertonic==1.3.1` lewat `uv run --python 3.12 --with …`, suara
   `F1`–`F5` / `M1`–`M5`, output 44,1 kHz, model di `~/.cache/supertonic3` (unduhan pertama
   ±70 s). Tag `<short pause>` / `<long pause>` dibaca sebagai koma / titik, bukan hening.
6. **Prompt whisper** = prompt domain, bukan teks naskah (kalau naskah jadi prompt, kata
   yang dilewati TTS ikut "terdengar"). Waktu `words.json` = waktu DTW.
7. **Studio**: tab **Suara** dan **Musik** di UI yang ada, bukan halaman `/voice-test` dan
   `/music` terpisah. File lewat `/api/voice-tests/<run>/files/<name>` dan
   `/api/music/<id>/file`; path `/media/music/<x>` akan bentrok dengan route render
   `/media/<slug>/<file>`.
8. **Musik**: Pixabay menjawab 403 untuk unduhan skrip → unduh manual lalu
   `music add <file>`. Mixkit, Freesound (preview HQ), dan OpenGameArt bisa diunduh
   langsung. Bukti lisensi = catatan teks yang ditulis `music add` + file bukti opsional
   `--proof`.
9. **Cache** juga memakai `speed` di kuncinya, dan tinggal di `<out>/cache/`.
10. **Layout kode**: `scripts/lib/voice/` (+ `providers/`), test `scripts/voice-*.test.mjs`
    dengan helper `scripts/voice-fixtures.mjs`; `npm run test:voice` memakai glob.
11. **Nomor kriteria**: RD-06-01…RD-06-22 dan RD-05-18…RD-05-20.
```

- [ ] **Step 2: Create ADR-0023**

Create `internal/docs/adr/0023-voice-adapter-tts.md`:

```md
# ADR-0023 Adapter suara: Gemini 3.8 Flash TTS + Supertonic lokal, preset, uji dengar blind
Status: accepted
Date: 2026-09-29

## Context

Dena ingin repo ini juga **menghasilkan** video motion design (mode generate), bukan
hanya mengedit talking-head. Video bernarasi butuh voiceover. Belum ada key TTS di
`.env`, dan mesin ini M2 dengan RAM 8 GB. Kokoro, Chatterbox v3, dan Qwen3-TTS tidak
mendukung bahasa Indonesia; OmniVoice dan Higgs Audio v3 dicoret Dena. Gemini 3.8
Flash TTS (GA 2026-09-23) mendukung bahasa Indonesia, voice design, dan voice
replication (wajib klip consent lisan). Dari 2.089 suara prebuilt Gemini tidak ada yang
native Indonesia; yang terdekat 8 suara `jv-ID` berlogat Jawa.

## Decision

- Satu adapter `scripts/lib/voice/` dengan tiga provider, tanpa fallback antar provider:
  - `gemini` — REST `POST /v1beta/interactions` lewat `fetch` (tanpa SDK), model
    `gemini-3.8-flash-tts`; gaya bicara di `speech_metadata.style`.
  - `supertonic` — Supertonic 3 lokal, `supertonic==1.3.1` lewat
    `uv run --python 3.12 --with …`, suara stok `F1`–`F5` / `M1`–`M5`, bahasa `id`.
  - `recorded` — rekaman VO Dena sendiri, lewat trim + loudness + alignment yang sama.
- Preset di `config/voices.json` (ter-track). Id suara pribadi (`voice_…`) hanya di
  `shared/voices/<name>/voice.json` (gitignored), dirujuk lewat `voiceRef`.
- Key bernama `GEMINI_TTS_API_KEY`, **bukan** `GEMINI_API_KEY`: Studio memuat `.env`
  ke sesi agen tmux, dan `hyperframes snapshot` memakai `GEMINI_API_KEY` untuk mengirim
  frame ke Gemini (RD-02-24).
- Teks dinormalisasi sebelum provider (bilangan, rupiah, persen, satuan, `Nx`, `ke-N`,
  rentang) dan melewati leksikon `config/pronunciation.json`; caption tetap memakai teks
  naskah.
- Sintesis per paragraf dengan cache
  `sha256(provider, model, voice, style, speed, teks ternormalisasi)`, trim hening tepi,
  jeda 0,35 s, satu pass loudness ke −16 LUFS (target dan limiter sama dengan
  `video cut`), WAV 48 kHz mono.
- Timing kata dari whisper.cpp (large-v3-turbo, DTW, prompt domain — bukan teks naskah)
  + alignment DP dalam bentuk ucapan → `words.json`; WER > 0,10 menjadi peringatan.
- Preset default dipilih lewat uji dengar blind (`npm run voice -- test build|reveal`,
  tab Studio **Suara**): clone Dena, 2 voice design `id-ID`, 2 terbaik saringan WER dari
  pool prebuilt Gemini, 2 terbaik dari 10 suara Supertonic.
- Python hanya dipakai sebagai sidecar Supertonic lewat `uv` (tanpa venv atau
  dependency ter-commit; bobot di `~/.cache/supertonic3`). Ini pengecualian sempit
  ADR-0007: `package.json` tetap tanpa dependency.

## Consequences

- Sampel suara dan klip consent Dena tersimpan di project Google sebagai voice
  (TTL 1 tahun, maksimal 200 per project). Di free tier input dipakai Google untuk
  memperbaiki produk; di paid tier tidak — aktifkan billing sebelum `voice clone`.
- Biaya Gemini paid tier ±USD 0,0135 per menit audio (harga sampai 2026-12-31).
- Clone butuh referensi 10–30 s satu pembicara (24 kHz mono) + klip consent berbahasa
  Indonesia: "Saya pemilik suara ini dan saya menyetujui Google menggunakan suara ini
  untuk membuat model suara sintetis."
- Waktu di `words.json` adalah waktu DTW (±0,2–0,3 s setelah onset, RD-04-11).
- Supertonic membaca tag `<short pause>` / `<long pause>` sebagai koma / titik; tag lain
  dibuang.

## Hasil uji dengar

Belum dijalankan; `config/voices.json` `default` tetap `null` sampai Dena memilih.

## Referensi

- Spec: `docs/superpowers/specs/2026-09-29-audio-foundation-design.md`
- Kriteria: [RD-06-01…RD-06-17](../requirements/rd-06-audio.md), RD-05-18/19
- Kode: `scripts/voice.mjs`, `scripts/lib/voice/`, `scripts/studio/voice-tests.mjs`
```

- [ ] **Step 3: Create ADR-0024**

Create `internal/docs/adr/0024-music-library.md`:

```md
# ADR-0024 Pustaka musik `shared/music/` dengan allowlist lisensi
Status: accepted
Date: 2026-09-29

## Context

Video generate — terutama motion graphic tanpa narasi — butuh BGM yang sudah ter-bake di
render: publish lewat Repliz tidak bisa menambahkan trending sound dari aplikasi. Dena
ingin BGM diambil dari web dan disimpan di `shared/music/`, hanya yang bebas dipakai.
Tidak ada musik yang benar-benar "tanpa lisensi"; yang dicari adalah lisensi yang boleh
dipakai komersial tanpa atribusi.

## Decision

- Allowlist lisensi dikunci di `scripts/lib/music.mjs`:
  - tier A: `cc0`, `public-domain`;
  - tier B: `pixabay`, `mixkit` — komersial tanpa atribusi; sebagian uploader
    mendaftarkan track ke Content ID, jadi risikonya dicatat per track.
  - Ditolak: CC-BY (wajib atribusi), NC/ND, "personal use only", YouTube Audio Library,
    musik AI dengan hak tidak jelas.
- Katalog `shared/music/catalog.json` (version 1) dengan sha256, durasi, loudness, mood,
  energi, `contentIdRisk`, dan `rejected`; bukti lisensi di
  `shared/music/licenses/<id>.txt` (+ file bukti opsional `--proof`).
- CLI `npm run music -- add|list|check` adalah satu-satunya penulis katalog selain tombol
  tolak di Studio (tab **Musik**), yang memakai modul yang sama.
- Unduhan dikurasi satu per satu, bukan crawler. Situs yang menolak unduhan otomatis
  (Pixabay menjawab 403) → Dena mengunduh manual lalu `music add <file>`.

## Consequences

- `shared/` gitignored: musik dan katalog hanya ada di mesin Dena; clone baru mulai kosong.
- Ducking/level BGM di bawah narasi dan BPM diputuskan di sub-proyek 2 dan 4.

## Referensi

- Spec: `docs/superpowers/specs/2026-09-29-audio-foundation-design.md`
- Kriteria: [RD-06-18…RD-06-22](../requirements/rd-06-audio.md), RD-05-20
- Kode: `scripts/music.mjs`, `scripts/lib/music.mjs`, `scripts/studio/music.mjs`
```

- [ ] **Step 4: Create RD-06**

Create `internal/docs/requirements/rd-06-audio.md`:

```md
# RD-06 Audio: Adapter Suara, Uji Dengar, Pustaka Musik
Status: accepted
Date: 2026-09-29

Domain: voiceover TTS untuk video generate, uji dengar blind pemilihan suara, dan pustaka
BGM. Owner: `scripts/voice.mjs`, `scripts/lib/voice/`, `scripts/music.mjs`,
`scripts/lib/music.mjs`. Keputusan: [ADR-0023](../adr/0023-voice-adapter-tts.md),
[ADR-0024](../adr/0024-music-library.md).

## Adapter suara

- **RD-06-01** (Ubiquitous) — The voice adapter shall membaca preset hanya dari
  `config/voices.json` (version 1); preset `gemini` memakai `voice` langsung atau
  `voiceRef` ke file `{ id | key }` di `shared/voices/<name>/`.
- **RD-06-02** (Event-driven) — When adapter menyintesis naskah, the adapter shall memecah
  paragraf di baris kosong lalu menormalisasi tiap paragraf (bilangan, desimal, rupiah +
  `rb/jt/M/T`, persen, `Nx`, `ke-N`, rentang `a-b`, leksikon `config/pronunciation.json`
  dengan `only` per provider) sebelum dikirim ke provider; `words.json` dan
  `voice-meta.json` memakai teks naskah.
- **RD-06-03** (Event-driven) — When WAV paragraf dengan kunci
  `sha256(provider, model, voice, style, speed, teks ternormalisasi)` sudah ada di
  `<out>/cache/`, the adapter shall memakainya tanpa memanggil provider.
- **RD-06-04** (Ubiquitous) — `voiceover.wav` shall berupa WAV 48 kHz mono: tiap paragraf
  di-trim hening tepi (−50 dB), disambung dengan jeda 0,35 s, lalu satu pass gain ke
  −16 LUFS (clamp ±20 dB) dengan limiter 0,84.
- **RD-06-05** (Unwanted) — If provider gagal, then the adapter shall berhenti dengan pesan
  provider itu, tidak memakai provider lain, dan tidak menulis `voiceover.wav`.
- **RD-06-06** (Event-driven) — When Gemini menjawab 429 atau 5xx pada sintesis, the adapter
  shall mencoba ulang maksimal 3 kali dengan jeda 1, 2, 4 s; status 4xx lain gagal tanpa
  retry, dan pembuatan voice (`POST /v1beta/voices`) tidak pernah di-retry.
- **RD-06-07** (Unwanted) — If `GEMINI_TTS_API_KEY` kosong, then preset `gemini` shall gagal
  sebelum request apa pun dan menyebut `.env`.
- **RD-06-08** (Ubiquitous) — Kredensial Gemini TTS shall dibaca dari `GEMINI_TTS_API_KEY`,
  tidak pernah dari `GEMINI_API_KEY`.
- **RD-06-09** (Event-driven) — When alignment berjalan, the adapter shall mentranskrip
  `voiceover.wav` dengan whisper.cpp proyek (`large-v3-turbo`, `-l id`,
  `-nfa --dtw large.v3.turbo`, prompt domain tanpa teks naskah) dan menulis `words.json`
  `[{ text, start, end, matched }]` dengan ejaan naskah dan waktu whisper.
- **RD-06-10** (State-driven) — While WER alignment > 0,10, the adapter shall menulis
  peringatan yang menyebut kata naskah yang meleset di `voice-meta.json` (`warnings`) dan
  di output CLI.
- **RD-06-11** (Unwanted) — If `voice clone` dijalankan tanpa `--consent`, tanpa
  `shared/voices/<name>/ref.wav`, dengan referensi di luar 10–30 s, atau consent di luar
  2–30 s, then the CLI shall menolak tanpa memanggil Gemini.
- **RD-06-12** (Unwanted) — If `shared/voices/<name>/voice.json` tujuan `clone` atau
  `design` sudah ada tanpa `--force`, then the CLI shall menolak.
- **RD-06-13** (Ubiquitous) — Id suara pribadi dan rekaman referensi/consent shall hanya
  disimpan di `shared/voices/<name>/` (gitignored), tidak di file ter-track.

## Uji dengar

- **RD-06-14** (Event-driven) — When `voice test build` dijalankan, the CLI shall menyaring
  tiap pool di `config/voice-test.json` pada paragraf pertama naskah uji berdasarkan WER,
  mengambil `keep` terbaik per pool, dan menambahkan preset yang dinamai config sebagai
  kandidat; pool voice yang gagal dicatat di `screen.json` dan dilewati.
- **RD-06-15** (Ubiquitous) — Setiap sampel uji dengar shall dibuat lewat adapter yang sama
  (normalisasi dan −16 LUFS yang sama) dan diberi label A… dalam urutan acak ber-seed yang
  hanya tercatat di `key.json`.
- **RD-06-16** (Unwanted) — If `voiceRef` preset kandidat tidak ada, then `test build` shall
  berhenti sebelum sintesis pertama dan menyebut perintah pembuatnya.
- **RD-06-17** (Event-driven) — When `voice test reveal <run>` dijalankan, the CLI shall
  mengurutkan kandidat berdasarkan rata-rata natural, ucapan, gaya, betah (1–5) dan
  melaporkan kemiripan, WER, serta USD/menit terpisah di `reveal.md`.

## Pustaka musik

- **RD-06-18** (Unwanted) — If `music add` menerima lisensi di luar
  {`cc0`, `public-domain`, `pixabay`, `mixkit`}, mood di luar enam mood, energi di luar
  1–5, atau source bukan URL http(s), then the CLI shall menolak tanpa menulis file.
- **RD-06-19** (Event-driven) — When `music add` menyimpan track, the CLI shall mencatat
  `id, file, title, author, sourceUrl, license, licenseProof, retrievedAt, sha256,
  duration, lufs, mood, energy, bpm: null, vocals: false, loopable, contentIdRisk,
  rejected: false, notes` di `shared/music/catalog.json` dan menulis
  `shared/music/licenses/<id>.txt`.
- **RD-06-20** (Unwanted) — If unduhan gagal atau audio yang sama (sha256) sudah ada, then
  `music add` shall tidak meninggalkan file parsial dan menyebut langkah berikutnya.
- **RD-06-21** (Event-driven) — When `music check` dijalankan, the CLI shall gagal untuk
  file hilang, sha256 berbeda, lisensi di luar allowlist, atau bukti lisensi hilang.
- **RD-06-22** (Ubiquitous) — `music list` shall menyembunyikan track `rejected: true`
  kecuali `--include-rejected`.

## Referensi

- Studio (tab Suara, Musik): [rd-05-studio](rd-05-studio.md) RD-05-18…20
- Transkripsi: [rd-04-transcription-setup](rd-04-transcription-setup.md)
```

- [ ] **Step 5: Apply the index, registry, data-model, security, `.env.example`, and RD-05 edits**

Save this script as `/tmp/task1-docs.py` and run it from the repo root with `python3 /tmp/task1-docs.py`. Every edit asserts its anchor exists exactly once, so a drifted file fails loudly instead of being half-edited.

```python
# Task 1 docs edits (run from the repo root): README index + registry, RD registries, .env.example,
# security standard, data model, RD-05. Each edit asserts its anchor exists exactly once.
import re

def edit(path, old, new, count=1):
    s = open(path).read()
    assert s.count(old) == count, f'{path}: expected {count} match(es) for {old[:60]!r}, got {s.count(old)}'
    open(path, 'w').write(s.replace(old, new))

# README: new entries, then renumber the Reading Order list 1..N.
R = 'internal/docs/README.md'
edit(R, '[requirements/rd-05-studio.md](requirements/rd-05-studio.md) - EARS Studio web UI: bind, guard, upload, cascade delete, sesi tmux, publish.\n',
     '[requirements/rd-05-studio.md](requirements/rd-05-studio.md) - EARS Studio web UI: bind, guard, upload, cascade delete, sesi tmux, publish.\n'
     '0. [requirements/rd-06-audio.md](requirements/rd-06-audio.md) - EARS audio: adapter suara TTS, uji dengar blind, pustaka musik.\n')
edit(R, '`video cut`, Studio berpusat project.\n',
     '`video cut`, Studio berpusat project.\n'
     '0. [adr/0023-voice-adapter-tts.md](adr/0023-voice-adapter-tts.md) - Adapter suara: Gemini 3.8 Flash TTS (`GEMINI_TTS_API_KEY`) + Supertonic lokal via `uv` + rekaman; preset, cache per paragraf, uji dengar blind.\n'
     '0. [adr/0024-music-library.md](adr/0024-music-library.md) - Pustaka BGM `shared/music/`: allowlist lisensi (cc0, public-domain, pixabay, mixkit), katalog + bukti lisensi, tab Studio Musik.\n')
lines = open(R).read().split('\n')
n = 0
for i, l in enumerate(lines):
    if re.match(r'^\d+\. \[', l):
        n += 1
        lines[i] = re.sub(r'^\d+\.', f'{n}.', l, count=1)
open(R, 'w').write('\n'.join(lines))
edit(R, '| Studio web UI (EARS) | [requirements/rd-05-studio](requirements/rd-05-studio.md) |\n',
     '| Studio web UI (EARS) | [requirements/rd-05-studio](requirements/rd-05-studio.md) |\n'
     '| Audio: suara TTS, uji dengar, musik (EARS) | [requirements/rd-06-audio](requirements/rd-06-audio.md) |\n')
edit(R, '| Keputusan arsitektur | [adr/](adr/) (0001–0022) |', '| Keputusan arsitektur | [adr/](adr/) (0001–0024) |')

# RD registries (RD-05 was missing from them too).
edit('internal/docs/requirements/ears-standard.md', '- [RD-04 Transcription & Setup](rd-04-transcription-setup.md)\n',
     '- [RD-04 Transcription & Setup](rd-04-transcription-setup.md)\n- [RD-05 Studio Web UI](rd-05-studio.md)\n- [RD-06 Audio](rd-06-audio.md)\n')
edit('internal/docs/requirements/frd.md', '| Transkripsi & setup | [rd-04-transcription-setup](rd-04-transcription-setup.md) | whisper.cpp, setup docs |\n',
     '| Transkripsi & setup | [rd-04-transcription-setup](rd-04-transcription-setup.md) | whisper.cpp, setup docs |\n'
     '| Studio web UI | [rd-05-studio](rd-05-studio.md) | `scripts/studio.mjs`, `scripts/studio/` |\n'
     '| Audio: suara TTS, uji dengar, musik | [rd-06-audio](rd-06-audio.md) | `scripts/voice.mjs`, `scripts/music.mjs`, `scripts/lib/voice/` |\n')
edit('internal/docs/entrypoints/rd.md', '- [RD-04 Transcription & Setup](../requirements/rd-04-transcription-setup.md) — whisper + setup.\n',
     '- [RD-04 Transcription & Setup](../requirements/rd-04-transcription-setup.md) — whisper + setup.\n'
     '- [RD-05 Studio Web UI](../requirements/rd-05-studio.md) — web UI lokal: project, sesi agen, publish, tab Suara/Musik.\n'
     '- [RD-06 Audio](../requirements/rd-06-audio.md) — adapter suara TTS, uji dengar blind, pustaka musik.\n')

# .env.example
edit('.env.example', '# Studio web UI (ADR-0020). Port defaults to 4777; set a token to require login.\n',
     '# Voice adapter TTS (ADR-0023). Not GEMINI_API_KEY: hyperframes snapshot would send frames to Gemini with that name.\n'
     'GEMINI_TTS_API_KEY=\n\n'
     '# Studio web UI (ADR-0020). Port defaults to 4777; set a token to require login.\n')

# Security standard
S = 'internal/docs/security/security-standard.md'
edit(S, '- Cloudflare API token, `CLOUDFLARE_ACCOUNT_ID` nyata.\n',
     '- Cloudflare API token, `CLOUDFLARE_ACCOUNT_ID` nyata.\n- `GEMINI_TTS_API_KEY` (adapter suara, ADR-0023).\n')
edit(S, '## Approval sebelum aksi keluar\n',
     '## Data suara (ADR-0023)\n\n'
     '- Rekaman referensi, klip consent, dan id suara (`voice_…`) hanya di\n'
     '  `shared/voices/<name>/` (gitignored); `config/voices.json` merujuknya lewat `voiceRef`.\n'
     '- `voice clone` mengirim referensi + consent ke Google dan menyimpan voice di project\n'
     '  Google (TTL 1 tahun). Di free tier Gemini, input dipakai Google untuk memperbaiki\n'
     '  produk; aktifkan paid tier sebelum clone.\n'
     '- Clone hanya untuk suara pemilik akun yang merekam klip consent sendiri.\n'
     '- Key bernama `GEMINI_TTS_API_KEY`, bukan `GEMINI_API_KEY`, supaya `hyperframes snapshot`\n'
     '  di sesi agen tidak mengirim frame ke Gemini (RD-02-24).\n\n'
     '## Approval sebelum aksi keluar\n')

D = 'internal/docs/architecture/data-model.md'
edit(D, '| HyperFrames config | `hyperframes.json` | JSON | HyperFrames |\n',
     '| HyperFrames config | `hyperframes.json` | JSON | HyperFrames |\n'
     '| Voice presets | `config/voices.json` | JSON | manusia + `npm run voice` |\n'
     '| Leksikon ucapan | `config/pronunciation.json` | JSON | manusia |\n'
     '| Suara pribadi | `shared/voices/<name>/voice.json` + `ref.wav`, `consent.wav` (di-ignore) | JSON + WAV | `npm run voice -- clone/design` |\n'
     '| Voiceover | `<out>/voiceover.wav`, `voice-meta.json`, `words.json` | WAV + JSON | `npm run voice` |\n'
     '| Uji dengar | `shared/voice-tests/<run>/` (di-ignore); config `config/voice-test.json` | WAV + JSON | `npm run voice -- test`, Studio |\n'
     '| Katalog musik | `shared/music/catalog.json` + `licenses/` (di-ignore) | JSON | `npm run music`, Studio |\n')
edit(D, 'Secret tidak boleh masuk git (`.gitignore` mengabaikan `.env` + `.env.*` kecuali\n',
     '**Voice adapter (opsional, [ADR-0023](../adr/0023-voice-adapter-tts.md)):**\n\n'
     '- `GEMINI_TTS_API_KEY` — key Gemini untuk `npm run voice` (TTS, voice design, clone).\n'
     '  Sengaja bukan `GEMINI_API_KEY`: nama itu membuat `hyperframes snapshot` mengirim frame\n'
     '  ke Gemini (RD-02-24).\n\n'
     'Secret tidak boleh masuk git (`.gitignore` mengabaikan `.env` + `.env.*` kecuali\n')
edit(D, '## Komposisi HyperFrames (`videos/<slug>/index.html`)\n', '''## `config/voices.json` (voice adapter, ter-track)

`{ version: 1, default: <preset | null>, presets: { <nama>: { provider, model?, voice?, voiceRef?, style?, speed?, language? } } }` —
[ADR-0023](../adr/0023-voice-adapter-tts.md). `provider` ∈ `gemini | supertonic | recorded`.
`voice` = id suara langsung (prebuilt Gemini seperti `kore`, atau `F1`–`F5` / `M1`–`M5`
Supertonic). `voiceRef` = path ke `shared/voices/<name>/voice.json`
(`{ id: "voice_…", type: "replicated" | "prompted", model, displayName, createdAt, expireTime, prompt?, language?, gender? }`,
di-ignore, ditulis `npm run voice -- clone` / `design`). `style` = arahan gaya bicara Gemini
(`speech_metadata.style`). `default` diisi setelah uji dengar.

## `config/pronunciation.json` (leksikon ucapan, ter-track)

`{ version: 1, entries: [{ term, say, only? }] }` — `term` diganti `say` sebagai kata utuh
sebelum TTS; `only` (daftar provider) membatasi entri itu.

## Output voiceover (`voiceover.wav`, `voice-meta.json`, `words.json`)

Ditulis `renderVoice` (`scripts/lib/voice/render.mjs`) ke satu folder `<out>`
(`npm run voice -- say --out`, tiap sampel uji dengar): `voiceover.wav` (48 kHz mono,
−16 LUFS), `cache/<sha>.wav` per paragraf, `voice-meta.json`
`{ version: 1, preset, provider, model, voice, paragraphs: [{ hash, text, start, end, cached }], duration, lufs, alignment: { wer, unmatched } | null, warnings: [] }`,
dan `words.json` `[{ text, start, end, matched }]` (ejaan naskah, waktu whisper DTW).

## Uji dengar `shared/voice-tests/<YYYYMMDD-HHMM>/` (di-ignore)

Config ter-track `config/voice-test.json`
`{ version: 1, script, ref, presets: [<preset>], screens: [{ id, keep, base: <preset tanpa voice>, voices: [<id>] }] }`
dan naskah `config/voice-test-script.md`. Isi run: `script.md`, `screen.json`
(`{ <pool>: [{ voice, wer, error? }] }`), `samples/<A…>.wav`, `ref.wav`, `work/<label>/`,
`key.json` `{ version: 1, run, seed, createdAt, labels: { A: { name, provider, model, voice, duration, wer } } }`
(tidak pernah dilayani Studio), `ratings.json`
`{ version: 1, savedAt, ratings: { A: { natural, pronunciation, register, similarity, endurance, note } } }`
(skor 1–5 atau `null`, ditulis Studio), dan `reveal.md`.

## `shared/music/catalog.json` (pustaka musik, di-ignore)

`{ version: 1, tracks: [{ id, file, title, author, sourceUrl, license, licenseProof, extraProof?, retrievedAt, sha256, duration, lufs, mood, energy, bpm, vocals, loopable, contentIdRisk, rejected, notes }] }` —
[ADR-0024](../adr/0024-music-library.md). `id` = `mNN-<slug>`; `license` ∈
`cc0 | public-domain | pixabay | mixkit`; `mood` ⊆
`reflektif | tech-ringan | tensi | playful | sinematik | upbeat`; `energy` 1–5;
`contentIdRisk` ∈ `none | unknown | known`. Bukti lisensi `licenses/<id>.txt`.
Penulis tunggal: `scripts/lib/music.mjs` (`npm run music`, Studio).

## Komposisi HyperFrames (`videos/<slug>/index.html`)
''')

# RD-05: Studio criteria for the Suara and Musik tabs.
F = 'internal/docs/requirements/rd-05-studio.md'
edit(F, 'Keputusan:\n[ADR-0020](../adr/0020-studio-web-ui.md), [ADR-0022](../adr/0022-multi-source-projects.md).',
     'Keputusan:\n[ADR-0020](../adr/0020-studio-web-ui.md), [ADR-0022](../adr/0022-multi-source-projects.md),\n[ADR-0023](../adr/0023-voice-adapter-tts.md), [ADR-0024](../adr/0024-music-library.md).')
s = open(F).read().rstrip('\n') + '\n'
s += """- **RD-05-18** (Event-driven) — When Dena opens the Suara tab, Studio shall list the runs in
  `shared/voice-tests/` (a `YYYYMMDD-HHMM` folder with `key.json`) and, for one run, serve
  only `samples/<label>.wav` and `ref.wav`; `key.json` and candidate names are never served.
- **RD-05-19** (Event-driven) — When Dena saves ratings, Studio shall check every label
  against the run, every score (natural, pronunciation, register, similarity, endurance)
  as an integer 1–5 or empty, and the note as at most 1000 characters, then write
  `ratings.json` atomically; anything else gets 400.
- **RD-05-20** (Event-driven) — When Dena rejects or restores a track in the Musik tab,
  Studio shall set `rejected` in `shared/music/catalog.json` through
  `scripts/lib/music.mjs`; a non-boolean value gets 400 and an unknown id 404.
"""
open(F, 'w').write(s)
print('task1 docs ok')
```

Expected output: `task1 docs ok`.

- [ ] **Step 6: Check the index**

Run: `python3 -c "import re;l=[x for x in open('internal/docs/README.md').read().split(chr(10)) if re.match(r'^\d+\. \[',x)];print(len(l), l[19][:3], l[19][5:32], l[46][:3], l[47][:3])"`
Expected: `58 20. requirements/rd-06-audio.md 47. 48.`

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-09-29-audio-foundation-design.md internal/docs .env.example
git commit -m "docs: ADR-0023/0024, RD-06 audio, Studio RD-05-18..20, spec amendments"
```

### Task 2: Text normalization and script helpers

**Files:**
- Create: `scripts/lib/voice/normalize.mjs`, `scripts/lib/voice/script.mjs`, `config/pronunciation.json`, `scripts/voice-fixtures.mjs`, `scripts/voice-text.test.mjs`
- Modify: `package.json` (add `test:voice`)

**Interfaces:**
- Produces: `terbilang(n) → string`, `readNumber(s) → string`, `normalizeForSpeech(text, { lexicon = [], provider = '' }) → string`, `loadLexicon(root) → [{ term, say, only? }]`, `LEXICON_FILE`; `scriptBody(md)`, `splitParagraphs(text) → string[]`, `stripTags(p)`, `forProvider(p, provider)`, `scriptWords(text) → string[]`, `TAG_RE`. Test helpers `WHISPER`, `WAV`, `audioBody`, `fakeFetch(queue)`, `fakeMedia({ durations, whisper, fail })`, `voiceRoot()` from `scripts/voice-fixtures.mjs` (used by Tasks 3–7).

- [ ] **Step 1: Write the shared test fixtures**

Create `scripts/voice-fixtures.mjs` (a helper, not a test file):

```js
// Shared fixtures for the voice adapter tests (not a test file itself).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

export const WHISPER = {
  transcription: [
    {
      offsets: { from: 0, to: 2000 },
      tokens: [
        { text: '[_BEG_]', t_dtw: -1, offsets: { from: 0, to: 0 } },
        { text: ' J', t_dtw: 10 }, { text: 'ujur', t_dtw: 20 }, { text: ',', t_dtw: 40 },
        { text: ' gue', t_dtw: 60 }, { text: ' kira', t_dtw: 90 }, { text: ' gampang', t_dtw: 130 }, { text: '.', t_dtw: 180 },
        { text: '[_TT_100]', t_dtw: -1 },
      ],
    },
    { offsets: { from: 2350, to: 4000 }, tokens: [{ text: ' Ternyata', t_dtw: 240 }, { text: ' susah', t_dtw: 320 }, { text: '.', t_dtw: 380 }] },
  ],
};
export const WAV = Buffer.from('RIFF0000WAVEfmt fake');
export const audioBody = { steps: [{ type: 'model_output', content: [{ type: 'audio', mime_type: 'audio/wav', data: WAV.toString('base64') }] }] };

// fetch stand-in: answers from a queue of { status, body }; records every call.
export function fakeFetch(queue) {
  const calls = [];
  const f = async (url, opts = {}) => {
    calls.push({ url, method: opts.method, headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : undefined });
    const r = queue.shift();
    if (!r) throw new Error(`unexpected fetch ${url}`);
    return { ok: r.status < 400, status: r.status, text: async () => JSON.stringify(r.body ?? {}) };
  };
  f.calls = calls;
  return f;
}

// spawnSync stand-in for ffmpeg, ffprobe, whisper-cli, and uv: writes the output file each tool would write.
export function fakeMedia({ durations = {}, whisper = WHISPER, fail = {} } = {}) {
  const calls = [];
  const run = (cmd, args, opts = {}) => {
    calls.push([basename(cmd), ...args]);
    const name = basename(cmd);
    if (fail[name]) return { status: 1, stdout: '', stderr: fail[name] };
    if (name === 'ffprobe') return { status: 0, stdout: `${durations[basename(args.at(-1))] ?? 2}\n`, stderr: '' };
    if (name === 'ffmpeg' && args.includes('null')) return { status: 0, stdout: '', stderr: '{\n"input_i" : "-20.00",\n"input_tp" : "-3.00"\n}' };
    if (name === 'ffmpeg') {
      writeFileSync(args.at(-1), 'RIFF');
      return { status: 0, stdout: '', stderr: '' };
    }
    if (name === 'whisper-cli') {
      writeFileSync(`${args[args.indexOf('-of') + 1]}.json`, JSON.stringify(whisper));
      return { status: 0, stdout: '', stderr: '' };
    }
    if (name === 'uv') {
      writeFileSync(args[args.indexOf('--out') + 1], 'RIFF');
      calls.at(-1).push(`<stdin:${opts.input}>`);
      return { status: 0, stdout: '', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: `unexpected ${cmd}` };
  };
  return { run, calls };
}

export function voiceRoot() {
  const root = mkdtempSync(join(tmpdir(), 'voice-test-'));
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({
    version: 1,
    default: null,
    presets: {
      'g-kore': { provider: 'gemini', model: 'gemini-3.8-flash-tts', voice: 'kore', style: 'santai' },
      'dena-clone': { provider: 'gemini', model: 'gemini-3.8-flash-tts', voiceRef: 'shared/voices/dena/voice.json' },
      'st-f2': { provider: 'supertonic', voice: 'F2', speed: 1.05 },
      recorded: { provider: 'recorded' },
    },
  }));
  return root;
}
```

- [ ] **Step 2: Write the failing test**

Create `scripts/voice-text.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLexicon, normalizeForSpeech, readNumber, terbilang } from './lib/voice/normalize.mjs';
import { forProvider, scriptBody, scriptWords, splitParagraphs, stripTags } from './lib/voice/script.mjs';
import { voiceRoot } from './voice-fixtures.mjs';

test('terbilang reads Indonesian integers', () => {
  const cases = [[0, 'nol'], [1, 'satu'], [10, 'sepuluh'], [11, 'sebelas'], [12, 'dua belas'], [19, 'sembilan belas'], [20, 'dua puluh'], [21, 'dua puluh satu'], [100, 'seratus'], [110, 'seratus sepuluh'], [250, 'dua ratus lima puluh'], [1000, 'seribu'], [1500, 'seribu lima ratus'], [2026, 'dua ribu dua puluh enam'], [100000, 'seratus ribu'], [1000000, 'satu juta'], [2500000, 'dua juta lima ratus ribu'], [3000000000, 'tiga miliar']];
  for (const [n, w] of cases) assert.equal(terbilang(n), w, String(n));
  assert.throws(() => terbilang(-1), /out of range/);
});

test('readNumber handles thousands dots and decimals', () => {
  assert.equal(readNumber('2.500.000'), 'dua juta lima ratus ribu');
  assert.equal(readNumber('2,5'), 'dua koma lima');
  assert.equal(readNumber('2,75'), 'dua koma tujuh lima');
  assert.equal(readNumber('0,05'), 'nol koma nol lima');
  assert.equal(readNumber('1.2'), 'satu koma dua');
  assert.equal(readNumber('70'), 'tujuh puluh');
  assert.equal(readNumber('1.2.3'), '1.2.3');
});

test('normalizeForSpeech rewrites money, percent, units, multipliers, ordinals, ranges, and plain numbers', () => {
  const n = (t) => normalizeForSpeech(t);
  assert.equal(n('Biayanya Rp2,5 jt per bulan.'), 'Biayanya dua koma lima juta rupiah per bulan.');
  assert.equal(n('Harganya Rp2.500.000.'), 'Harganya dua juta lima ratus ribu rupiah.');
  assert.equal(n('Cuma Rp 50rb!'), 'Cuma lima puluh ribu rupiah!');
  assert.equal(n('Naik 70% dalam 3x percobaan.'), 'Naik tujuh puluh persen dalam tiga kali percobaan.');
  assert.equal(n('Omzet 2,5 M setahun'), 'Omzet dua koma lima miliar setahun');
  assert.equal(n('Butuh 3-5 hari, bukan 3–5 minggu.'), 'Butuh tiga sampai lima hari, bukan tiga sampai lima minggu.');
  assert.equal(n('Ini yang ke-3 kalinya di 2026.'), 'Ini yang ketiga kalinya di dua ribu dua puluh enam.');
  assert.equal(n('Pakai v3 dan 4K'), 'Pakai v3 dan 4K');
  assert.equal(n('Tunggu <short pause> 3 detik.'), 'Tunggu <short pause> tiga detik.');
});

test('the lexicon replaces whole words, only for the listed providers', () => {
  const lexicon = [{ term: 'CRM', say: 'si ar em', only: ['supertonic'] }, { term: 'Nafanesia', say: 'nafa nesia' }];
  assert.equal(normalizeForSpeech('CRM Nafanesia, bukan CRMX.', { lexicon, provider: 'supertonic' }), 'si ar em nafa nesia, bukan CRMX.');
  assert.equal(normalizeForSpeech('CRM Nafanesia.', { lexicon, provider: 'gemini' }), 'CRM nafa nesia.');
  const root = voiceRoot();
  assert.deepEqual(loadLexicon(root), []);
  writeFileSync(join(root, 'config/pronunciation.json'), JSON.stringify({ version: 1, entries: [{ term: 'CRM' }] }));
  assert.throws(() => loadLexicon(root), /needs "term" and "say"/);
});

test('script helpers: body, paragraphs, tags per provider, caption words', () => {
  const md = '# Naskah uji\n\nJujur, gue kira <short pause> gampang.\n\n<!-- catatan -->\nTernyata   susah.\n';
  const body = scriptBody(md);
  assert.deepEqual(splitParagraphs(body), ['Jujur, gue kira <short pause> gampang.', 'Ternyata susah.']);
  assert.equal(stripTags('Jujur, gue kira <short pause> gampang.'), 'Jujur, gue kira gampang.');
  assert.equal(forProvider('Jujur, gue kira <short pause> gampang. <long pause> Oke <laugh> ya.', 'supertonic'), 'Jujur, gue kira, gampang. Oke ya.');
  assert.equal(forProvider('A <breath> B', 'gemini'), 'A <breath> B');
  assert.deepEqual(scriptWords(body), ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.']);
});
```

- [ ] **Step 3: Add the test script and run it to see it fail**

In `package.json`, replace
```json
    "test:studio": "node --test scripts/studio.test.mjs"
```
with
```json
    "test:studio": "node --test scripts/studio.test.mjs",
    "test:voice": "node --test scripts/voice-*.test.mjs"
```
Run: `npm run test:voice`
Expected: FAIL — `Cannot find module '.../scripts/lib/voice/normalize.mjs'`.

- [ ] **Step 4: Implement normalization**

Create `scripts/lib/voice/normalize.mjs`:

```js
// TTS text normalization (ADR-0023, RD-06-02): numbers, money, percent, units, "3x", "ke-3", ranges, and the
// pronunciation lexicon. Only the text sent to a provider is normalized; captions keep the script text.
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const LEXICON_FILE = join('config', 'pronunciation.json');
const ONES = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
const SCALES = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']];

const withRest = (head, rest) => (rest ? `${head} ${terbilang(rest)}` : head);

export function terbilang(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n >= 1e15) throw new Error(`terbilang: ${n} is out of range`);
  if (n < 12) return ONES[n];
  if (n < 20) return `${ONES[n - 10]} belas`;
  if (n < 100) return withRest(`${ONES[Math.floor(n / 10)]} puluh`, n % 10);
  if (n < 200) return withRest('seratus', n - 100);
  if (n < 1000) return withRest(`${ONES[Math.floor(n / 100)]} ratus`, n % 100);
  if (n < 2000) return withRest('seribu', n - 1000);
  const [size, word] = SCALES.find(([s]) => n >= s);
  return withRest(`${terbilang(Math.floor(n / size))} ${word}`, n % size);
}

const digits = (dec) => [...dec].map((d) => ONES[Number(d)]).join(' ');

// "2.500.000" thousands, "2,5" or "1.2" decimals; anything else is returned unchanged.
export function readNumber(s) {
  let int;
  let dec = '';
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) [int, dec = ''] = s.replaceAll('.', '').split(',');
  else {
    const m = /^(\d+)(?:[.,](\d+))?$/.exec(s);
    if (!m) return s;
    [, int, dec = ''] = m;
  }
  const n = Number(int);
  if (!Number.isSafeInteger(n) || n >= 1e15) return s;
  return dec ? `${terbilang(n)} koma ${digits(dec)}` : terbilang(n);
}

const NUM = String.raw`\d+(?:[.,]\d+)*`;
const UNITS = { rb: 'ribu', ribu: 'ribu', jt: 'juta', juta: 'juta', M: 'miliar', miliar: 'miliar', milyar: 'miliar', T: 'triliun', triliun: 'triliun' };
const UNIT = Object.keys(UNITS).join('|');
const START = String.raw`(?<![\p{L}\p{N}])`;
const END = String.raw`(?![\p{L}\p{N}])`;
const unit = (u) => (u ? ` ${UNITS[u]}` : '');
const RULES = [
  [new RegExp(String.raw`Rp\.?\s?(${NUM})(?:\s?(${UNIT})${END})?`, 'gu'), (m, n, u) => `${readNumber(n)}${unit(u)} rupiah`],
  [new RegExp(String.raw`${START}(${NUM})\s?%`, 'gu'), (m, n) => `${readNumber(n)} persen`],
  [new RegExp(String.raw`${START}(${NUM})\s?(${UNIT})${END}`, 'gu'), (m, n, u) => `${readNumber(n)}${unit(u)}`],
  [new RegExp(String.raw`${START}(${NUM})x${END}`, 'gu'), (m, n) => `${readNumber(n)} kali`],
  [new RegExp(String.raw`(?<!\p{L})ke-(\d+)${END}`, 'gu'), (m, n) => (n === '1' ? 'pertama' : `ke${terbilang(Number(n))}`)],
  [/(?<![\d.,–-])(\d+)\s?[–-]\s?(\d+)(?![\d.,–-])/gu, (m, a, b) => `${terbilang(Number(a))} sampai ${terbilang(Number(b))}`],
  [new RegExp(String.raw`(?<![\p{L}\p{N}.,])(${NUM})${END}`, 'gu'), (m, n) => readNumber(n)],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function loadLexicon(root = '.') {
  const file = join(root, LEXICON_FILE);
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data?.version !== 1 || !Array.isArray(data.entries)) throw new Error(`${file} is not a version 1 pronunciation lexicon`);
  for (const e of data.entries) {
    if (typeof e?.term !== 'string' || !e.term || typeof e.say !== 'string') throw new Error(`${file}: every entry needs "term" and "say"`);
    if (e.only !== undefined && !Array.isArray(e.only)) throw new Error(`${file}: "only" must be a list of providers (${e.term})`);
  }
  return data.entries;
}

function applyLexicon(text, lexicon, provider) {
  let out = text;
  for (const e of lexicon) {
    if (e.only && !e.only.includes(provider)) continue;
    out = out.replace(new RegExp(`${START}${escapeRe(e.term)}${END}`, 'gu'), () => e.say);
  }
  return out;
}

// Inline Gemini tags (<short pause>, <breath>, ...) pass through untouched.
export function normalizeForSpeech(text, { lexicon = [], provider = '' } = {}) {
  return String(text)
    .split(/(<[a-z][a-z ]*>)/)
    .map((part, i) => {
      if (i % 2) return part;
      let out = applyLexicon(part, lexicon, provider);
      for (const [re, fn] of RULES) out = out.replace(re, fn);
      return out;
    })
    .join('')
    .replace(/[ \t]{2,}/g, ' ');
}
```

- [ ] **Step 5: Implement the script helpers**

Create `scripts/lib/voice/script.mjs`:

```js
// Script text helpers for the voice adapter (ADR-0023, RD-06-02): paragraphs, inline Gemini tags, caption words.
export const TAG_RE = /<([a-z][a-z ]*)>/g;
const PAUSE = { 'short pause': ',', 'long pause': '.' };

// Markdown script file -> plain text: drops heading lines and HTML comments.
export function scriptBody(md) {
  return String(md).replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
}

export function splitParagraphs(text) {
  return String(text).replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export const stripTags = (p) => p.replace(TAG_RE, ' ').replace(/\s+([,.!?])/g, '$1').replace(/\s+/g, ' ').trim();

// Gemini reads the tags; other providers get a comma for <short pause>, a full stop for <long pause>, nothing else.
export function forProvider(p, provider) {
  if (provider === 'gemini') return p;
  return p
    .replace(TAG_RE, (m, name) => PAUSE[name] ?? ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/([.,!?])[,.]+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export const scriptWords = (text) => splitParagraphs(text).flatMap((p) => stripTags(p).split(' ').filter(Boolean));
```

- [ ] **Step 6: Create the pronunciation lexicon**

Create `config/pronunciation.json`:

```json
{
  "version": 1,
  "entries": [
    { "term": "CRM", "say": "si ar em", "only": ["supertonic"] },
    { "term": "ERP", "say": "i ar pi", "only": ["supertonic"] },
    { "term": "API", "say": "ei pi ai", "only": ["supertonic"] },
    { "term": "AI", "say": "ei ai", "only": ["supertonic"] }
  ]
}
```

- [ ] **Step 7: Run the tests**

Run: `npm run test:voice`
Expected: `ℹ pass 5`, `ℹ fail 0`.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/voice/normalize.mjs scripts/lib/voice/script.mjs scripts/voice-fixtures.mjs scripts/voice-text.test.mjs config/pronunciation.json package.json
git commit -m "feat(voice): Indonesian speech normalization, lexicon, script helpers (RD-06-02)"
```
(Docs for this behavior were written in Task 1: RD-06-02, data-model `config/pronunciation.json`.)

### Task 3: whisper runner and alignment

**Files:**
- Create: `scripts/lib/voice/whisper.mjs`, `scripts/lib/voice/align.mjs`, `scripts/voice-align.test.mjs`

**Interfaces:**
- Consumes: `normalizeForSpeech` (Task 2), `WHISPER` fixture (Task 2).
- Produces: `WHISPER_BIN`, `WHISPER_MODEL`, `DOMAIN_PROMPT`, `whisperPlan({ wav, work, root = '.', prompt }) → { json, cmds: [[cmd, args], …] }`, `transcriptText(json) → string`; `whisperWords(json) → [{ text, start, end }]`, `alignWords({ script: string[], asr: [{ text, start, end }], duration }) → { words: [{ text, start, end, matched }], wer, unmatched: string[] }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/voice-align.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords, whisperWords } from './lib/voice/align.mjs';
import { WHISPER } from './voice-fixtures.mjs';

test('whisperWords joins tokens into words and skips special tokens', () => {
  assert.deepEqual(whisperWords(WHISPER), [
    { text: 'Jujur,', start: 0.1, end: 0.6 }, { text: 'gue', start: 0.6, end: 0.9 }, { text: 'kira', start: 0.9, end: 1.3 },
    { text: 'gampang.', start: 1.3, end: 2.4 }, { text: 'Ternyata', start: 2.4, end: 3.2 }, { text: 'susah.', start: 3.2, end: 4 },
  ]);
});

test('alignWords keeps script spelling, flags misreads, and interpolates missing words', () => {
  const script = ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.'];
  const exact = alignWords({ script, asr: whisperWords(WHISPER), duration: 4 });
  assert.equal(exact.wer, 0);
  assert.deepEqual(exact.words[3], { text: 'gampang.', start: 1.3, end: 2.4, matched: true });
  const asr = [{ text: 'Jujur', start: 0.1, end: 0.6 }, { text: 'gue', start: 0.6, end: 0.9 }, { text: 'kiri', start: 0.9, end: 1.3 }, { text: 'gampang.', start: 1.3, end: 2.4 }, { text: 'Ternyata', start: 2.4, end: 4 }];
  const r = alignWords({ script, asr, duration: 4.5 });
  assert.equal(r.wer, 0.333);
  assert.deepEqual(r.words[2], { text: 'kira', start: 0.9, end: 1.3, matched: false });
  assert.deepEqual(r.words[5], { text: 'susah.', start: 4, end: 4.5, matched: false });
  assert.deepEqual(r.unmatched, ['kira', 'susah.']);
});

test('alignWords compares spoken forms, so written numbers match spoken ones', () => {
  const asr = [{ text: 'bayar', start: 0, end: 0.4 }, { text: 'Rp2,5', start: 0.4, end: 1.6 }, { text: 'juta.', start: 1.6, end: 2 }];
  const r = alignWords({ script: ['bayar', 'Rp2,5', 'juta.'], asr, duration: 2 });
  assert.equal(r.wer, 0);
  assert.deepEqual(r.words[1], { text: 'Rp2,5', start: 0.4, end: 1.6, matched: true });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test scripts/voice-align.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/lib/voice/align.mjs'`.

- [ ] **Step 3: Implement the whisper runner**

Create `scripts/lib/voice/whisper.mjs`:

```js
// whisper.cpp runner for voiceover timing (ADR-0023, RD-06-09); flags follow RD-04-06 and RD-04-11.
import { join } from 'node:path';

export const WHISPER_BIN = join('vendor', 'whisper.cpp', 'build', 'bin', 'whisper-cli');
export const WHISPER_MODEL = join('vendor', 'whisper.cpp', 'models', 'ggml-large-v3-turbo.bin');
// Not the script text: a prompt holding the script would hide words the TTS skipped or misread.
export const DOMAIN_PROMPT = 'Dena Meidina, gue, lo, AI agent, workflow, deploy, prompt, CRM, ERP, API, Flutter, Nafanesia, HyperFrames.';

export function whisperPlan({ wav, work, root = '.', prompt = DOMAIN_PROMPT }) {
  const wav16 = join(work, 'asr-16k.wav');
  const base = join(work, 'asr');
  return {
    json: `${base}.json`,
    cmds: [
      ['ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ar', '16000', '-ac', '1', wav16]],
      [join(root, WHISPER_BIN), ['-m', join(root, WHISPER_MODEL), '-f', wav16, '-l', 'id', '-nfa', '--dtw', 'large.v3.turbo', '-oj', '-ojf', '-of', base, '--prompt', prompt, '-np']],
    ],
  };
}

export const transcriptText = (json) => (json?.transcription || []).map((s) => String(s.text || '').trim()).filter(Boolean).join(' ');
```

- [ ] **Step 4: Implement the alignment**

Create `scripts/lib/voice/align.mjs`. Note the special-token test: whisper emits `[_BEG_]` and `[_TT_177]`; both must be skipped (the second does not end in `_]`).

```js
// Voiceover word timing (ADR-0023, RD-06-09/10): whisper.cpp tokens -> words, then a DP alignment onto the script
// in spoken form (both sides normalized, so "Rp2,5" and "dua koma lima rupiah" meet), keeping the script spelling.
import { normalizeForSpeech } from './normalize.mjs';

const r3 = (x) => Math.round(x * 1000) / 1000;
const norm = (w) => w.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');

// whisper-cli -ojf JSON with --dtw: a token that starts with a space starts a word; [_..._] tokens are special.
export function whisperWords(json) {
  const words = [];
  for (const seg of json?.transcription || []) {
    const segEnd = (seg.offsets?.to ?? 0) / 1000;
    for (const tok of seg.tokens || []) {
      const text = String(tok.text ?? '');
      if (!text.trim() || /^\[_[^\]]*\]$/.test(text.trim())) continue;
      const t = tok.t_dtw >= 0 ? tok.t_dtw / 100 : (tok.offsets?.from ?? 0) / 1000;
      if (text.startsWith(' ') || !words.length) words.push({ text: text.trim(), start: t, end: segEnd });
      else words[words.length - 1].text += text;
    }
  }
  for (let i = 0; i < words.length - 1; i++) words[i].end = Math.max(words[i].start, words[i + 1].start);
  return words.map((w) => ({ text: w.text, start: r3(w.start), end: r3(w.end) }));
}

// Each word -> its spoken tokens; an ASR word's time is split evenly across its tokens.
function spoken(words, times) {
  const tokens = [];
  const ranges = [];
  words.forEach((w, i) => {
    const toks = normalizeForSpeech(w).split(/\s+/).map(norm).filter(Boolean);
    const from = tokens.length;
    toks.forEach((t, k) => {
      const tm = times?.[i];
      const step = tm ? (tm.end - tm.start) / toks.length : 0;
      tokens.push({ t, start: tm ? tm.start + step * k : null, end: tm ? tm.start + step * (k + 1) : null });
    });
    ranges.push([from, tokens.length]);
  });
  return { tokens, ranges };
}

function interpolate(words, duration) {
  let k = 0;
  while (k < words.length) {
    if (words[k].start !== null) {
      k++;
      continue;
    }
    let e = k;
    while (e < words.length && words[e].start === null) e++;
    const from = k > 0 ? words[k - 1].end : 0;
    const to = e < words.length ? words[e].start : duration;
    const step = Math.max(0, to - from) / (e - k);
    for (let q = k; q < e; q++) {
      words[q].start = r3(from + step * (q - k));
      words[q].end = r3(from + step * (q - k + 1));
    }
    k = e;
  }
}

export function alignWords({ script, asr, duration }) {
  const S = spoken(script);
  const A = spoken(asr.map((w) => w.text), asr).tokens;
  const n = S.tokens.length;
  const m = A.length;
  const cost = (i, j) => (S.tokens[i].t === A[j].t ? 0 : 1);
  const D = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Uint32Array(m + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + cost(i - 1, j - 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
  }
  const pair = new Array(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + cost(i - 1, j - 1)) pair[--i] = --j;
    else if (i > 0 && D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  const words = script.map((text, w) => {
    const [from, to] = S.ranges[w];
    const idx = Array.from({ length: to - from }, (_, k) => from + k);
    const timed = idx.filter((k) => pair[k] >= 0).map((k) => A[pair[k]]);
    return {
      text,
      start: timed.length ? r3(Math.min(...timed.map((a) => a.start))) : null,
      end: timed.length ? r3(Math.max(...timed.map((a) => a.end))) : null,
      matched: idx.every((k) => pair[k] >= 0 && S.tokens[k].t === A[pair[k]].t),
    };
  });
  interpolate(words, duration);
  return { words, wer: n ? r3(D[n][m] / n) : 0, unmatched: [...new Set(words.filter((w) => !w.matched).map((w) => w.text))].slice(0, 20) };
}
```

- [ ] **Step 5: Run the tests**

Run: `npm run test:voice`
Expected: `ℹ pass 8`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/voice/whisper.mjs scripts/lib/voice/align.mjs scripts/voice-align.test.mjs
git commit -m "feat(voice): whisper word timing aligned onto the script in spoken form (RD-06-09/10)"
```

### Task 4: Presets, Gemini provider, Supertonic sidecar

**Files:**
- Create: `scripts/lib/voice/exec.mjs`, `scripts/lib/voice/presets.mjs`, `scripts/lib/voice/providers/gemini.mjs`, `scripts/lib/voice/providers/supertonic.mjs`, `scripts/lib/voice/providers/supertonic_say.py`, `config/voices.json`, `scripts/voice-gemini.test.mjs`

**Interfaces:**
- Consumes: `fakeFetch`, `voiceRoot`, `WAV`, `audioBody` (Task 2).
- Produces: `exec(run, cmd, args, opts) → spawnSync result` (throws `<name> not found; <hint>` or `<name> failed (exit N): <stderr tail>`); `VOICES_FILE`, `VOICE_DIR = 'shared/voices'`, `PROVIDERS`, `loadVoices(root)`, `getPreset(voices, name) → { name, provider, model?, voice?, voiceRef?, style?, speed?, language? }`, `resolveVoiceId(preset, root) → string`; `GEMINI_KEY_ENV`, `CONSENT_ID`, `geminiKey(env)`, `geminiFetch(path, { method, body, key, fetchImpl, sleep, retries })`, `speechRequest({ model, text, voice, style, language })`, `audioFromInteraction(body)`, `geminiSay({ text, model, voice, style, language, key, fetchImpl, sleep }) → Buffer`, `listPrebuiltVoices({ key, fetchImpl, sleep })`, `designRequest({ model, name, prompt, language = 'id-ID', gender })`, `replicateRequest({ model, name, source, consent })`, `createVoice(request, { key, fetchImpl, sleep }) → { id, model, type, displayName, expireTime, sample }`; `SUPERTONIC`, `supertonicArgs({ voice, speed = 1.05, lang = 'id', out })`, `supertonicSay({ text, voice, speed, out, run })`.

- [ ] **Step 1: Write the failing test**

Create `scripts/voice-gemini.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPreset, loadVoices, resolveVoiceId } from './lib/voice/presets.mjs';
import { createVoice, designRequest, geminiKey, geminiSay, listPrebuiltVoices, replicateRequest, speechRequest } from './lib/voice/providers/gemini.mjs';
import { supertonicArgs } from './lib/voice/providers/supertonic.mjs';
import { WAV, audioBody, fakeFetch, voiceRoot } from './voice-fixtures.mjs';

test('presets load, name their voice directly or through a private voice file', () => {
  const root = voiceRoot();
  const voices = loadVoices(root);
  assert.throws(() => getPreset(voices, 'nope'), /unknown voice preset "nope"/);
  assert.equal(resolveVoiceId(getPreset(voices, 'g-kore'), root), 'kore');
  assert.throws(() => resolveVoiceId(getPreset(voices, 'dena-clone'), root), /shared\/voices\/dena\/voice\.json not found.*clone or design/);
  mkdirSync(join(root, 'shared/voices/dena'), { recursive: true });
  writeFileSync(join(root, 'shared/voices/dena/voice.json'), JSON.stringify({ id: 'voice_abc' }));
  assert.equal(resolveVoiceId(getPreset(voices, 'dena-clone'), root), 'voice_abc');
});

test('geminiKey reads GEMINI_TTS_API_KEY only', () => {
  assert.throws(() => geminiKey({ GEMINI_API_KEY: 'x' }), /GEMINI_TTS_API_KEY is not set/);
  assert.equal(geminiKey({ GEMINI_TTS_API_KEY: 'k' }), 'k');
});

test('speechRequest puts the style in speech_metadata and the voice in speech_config', () => {
  assert.deepEqual(speechRequest({ model: 'm', text: 'Halo', voice: 'kore' }), { model: 'm', input: 'Halo', response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: 'kore' }] } });
  assert.deepEqual(speechRequest({ model: 'm', text: 'Halo', voice: 'kore', style: 'santai', language: 'id-ID' }).input, [{ type: 'text', text: 'Halo', annotations: [{ type: 'speech_metadata', style: 'santai' }] }]);
  assert.deepEqual(speechRequest({ model: 'm', text: 'Halo', voice: 'kore', language: 'id-ID' }).generation_config.speech_config, [{ voice: 'kore', language: 'id-ID' }]);
});

test('geminiSay returns WAV bytes, retries 429 and 5xx with backoff, and fails at once on other errors', async () => {
  const slept = [];
  const sleep = async (ms) => slept.push(ms);
  const f = fakeFetch([{ status: 429, body: { error: { message: 'slow down' } } }, { status: 503, body: {} }, { status: 200, body: audioBody }]);
  const out = await geminiSay({ text: 'Halo', model: 'gemini-3.8-flash-tts', voice: 'kore', key: 'k', fetchImpl: f, sleep });
  assert.deepEqual(out, WAV);
  assert.deepEqual(slept, [1000, 2000]);
  assert.equal(f.calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(f.calls[0].headers['x-goog-api-key'], 'k');
  const bad = fakeFetch([{ status: 400, body: { error: { message: "Unknown parameter 'x'" } } }]);
  await assert.rejects(geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: bad, sleep }), /HTTP 400 Unknown parameter 'x'/);
  assert.equal(bad.calls.length, 1);
  const down = fakeFetch([500, 500, 500, 500].map((status) => ({ status, body: {} })));
  await assert.rejects(geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: down, sleep }), /HTTP 500/);
  assert.equal(down.calls.length, 4);
  const empty = fakeFetch([{ status: 200, body: { steps: [] } }]);
  await assert.rejects(geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: empty, sleep }), /no audio/);
});

test('listPrebuiltVoices follows page tokens', async () => {
  const f = fakeFetch([{ status: 200, body: { voices: [{ id: 'kore' }], next_page_token: 't2' } }, { status: 200, body: { voices: [{ id: 'puck' }] } }]);
  assert.deepEqual((await listPrebuiltVoices({ key: 'k', fetchImpl: f })).map((v) => v.id), ['kore', 'puck']);
  assert.match(f.calls[1].url, /\/voices\?type=prebuilt&page_size=100&page_token=t2$/);
});

test('createVoice sends design and replication requests once, never retrying', async () => {
  assert.deepEqual(designRequest({ model: 'm', name: 'a', prompt: 'hangat', gender: 'female' }), { store: true, voice: { model: 'm', type: 'prompted', display_name: 'a', language_code: 'id-ID', prompted: { input: 'hangat' }, gender: 'female' } });
  const rep = replicateRequest({ model: 'm', name: 'dena', source: Buffer.from('S'), consent: Buffer.from('C') });
  assert.deepEqual(rep.voice.replicated, { source_audio: { mime_type: 'audio/wav', data: 'Uw==' }, consent_audio: { mime_type: 'audio/wav', data: 'Qw==' } });
  const f = fakeFetch([{ status: 200, body: { id: 'voice_1', type: 'prompted', prompted: { sample_audio: { data: WAV.toString('base64') } } } }]);
  const v = await createVoice(designRequest({ model: 'm', name: 'a', prompt: 'hangat' }), { key: 'k', fetchImpl: f });
  assert.equal(v.id, 'voice_1');
  assert.deepEqual(v.sample, WAV);
  const busy = fakeFetch([{ status: 503, body: {} }]);
  await assert.rejects(createVoice(rep, { key: 'k', fetchImpl: busy, sleep: async () => {} }), /HTTP 503/);
  assert.equal(busy.calls.length, 1);
});

test('supertonicArgs pins the uv sidecar', () => {
  const a = supertonicArgs({ voice: 'F2', out: 'x.wav' });
  assert.deepEqual(a.slice(0, 6), ['run', '--quiet', '--python', '3.12', '--with', 'supertonic==1.3.1']);
  assert.ok(a.at(-9).endsWith('supertonic_say.py'));
  assert.deepEqual(a.slice(-8), ['--voice', 'F2', '--lang', 'id', '--speed', '1.05', '--out', 'x.wav']);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test scripts/voice-gemini.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/lib/voice/presets.mjs'`.

- [ ] **Step 3: Implement the process helper**

Create `scripts/lib/voice/exec.mjs`:

```js
// Child-process helper for the voice adapter (ADR-0023): one place for "not installed" and "failed" messages.
import { basename } from 'node:path';

const HINTS = {
  uv: 'install it with: brew install uv (docs/initial-setup.md)',
  'whisper-cli': 'build vendor/whisper.cpp (docs/initial-setup.md)',
  ffmpeg: 'install it with: brew install ffmpeg',
  ffprobe: 'install it with: brew install ffmpeg',
};

export function exec(run, cmd, args, opts = {}) {
  const r = run(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  const name = basename(cmd);
  if (r.error?.code === 'ENOENT') throw new Error(`${name} not found; ${HINTS[name] || 'install it and retry'}`);
  if (r.status !== 0) throw new Error(`${name} failed (exit ${r.status}): ${String(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
  return r;
}
```

- [ ] **Step 4: Implement presets**

Create `scripts/lib/voice/presets.mjs`:

```js
// Voice presets config/voices.json (ADR-0023, RD-06-01). Private voice ids live in shared/voices/<name>/voice.json.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const VOICES_FILE = join('config', 'voices.json');
export const VOICE_DIR = join('shared', 'voices');
export const PROVIDERS = ['gemini', 'supertonic', 'recorded'];

export function loadVoices(root = '.') {
  const file = join(root, VOICES_FILE);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data?.version !== 1 || !data.presets || typeof data.presets !== 'object') throw new Error(`${file} is not a version 1 voices file`);
  return data;
}

export function getPreset(voices, name) {
  const p = voices.presets?.[name];
  if (!p) throw new Error(`unknown voice preset "${name}" (config/voices.json has ${Object.keys(voices.presets || {}).join(', ')})`);
  if (!PROVIDERS.includes(p.provider)) throw new Error(`preset ${name}: provider must be one of ${PROVIDERS.join(', ')}`);
  return { name, ...p };
}

// A preset names a voice directly ("voice") or through a private file ("voiceRef" -> { id } or { key }).
export function resolveVoiceId(preset, root = '.') {
  if (preset.voice) return preset.voice;
  if (!preset.voiceRef) throw new Error(`preset ${preset.name} has neither "voice" nor "voiceRef"`);
  const file = join(root, preset.voiceRef);
  if (!existsSync(file)) throw new Error(`${preset.voiceRef} not found for preset ${preset.name}; create it with npm run voice -- clone or design`);
  const v = JSON.parse(readFileSync(file, 'utf8'));
  const id = v.id || v.key;
  if (!id) throw new Error(`${preset.voiceRef} has no voice id`);
  return id;
}
```

- [ ] **Step 5: Implement the Gemini provider**

Create `scripts/lib/voice/providers/gemini.mjs`:

```js
// Gemini 3.8 TTS over REST (ADR-0023, RD-06-05..08): speech, prebuilt voice list, voice design, voice replication.
// Plain fetch, no SDK (ADR-0007). The key is GEMINI_TTS_API_KEY: GEMINI_API_KEY would make hyperframes snapshot
// send frames to Gemini (RD-02-24).
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_KEY_ENV = 'GEMINI_TTS_API_KEY';
export const CONSENT_ID = 'Saya pemilik suara ini dan saya menyetujui Google menggunakan suara ini untuk membuat model suara sintetis.';

export function geminiKey(env = process.env) {
  const key = env[GEMINI_KEY_ENV];
  if (!key) throw new Error(`${GEMINI_KEY_ENV} is not set; add it to .env (see .env.example)`);
  return key;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 429 and 5xx are retried with 1 s, 2 s, 4 s backoff; any other error fails at once.
export async function geminiFetch(path, { method = 'GET', body, key, fetchImpl = fetch, sleep = wait, retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(`${GEMINI_BASE}${path}`, {
      method,
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // not JSON; the raw text goes into the error below
    }
    if (res.ok) return json;
    if (!(res.status === 429 || res.status >= 500) || attempt >= retries) {
      throw new Error(`Gemini ${method} ${path.split('?')[0]} failed: HTTP ${res.status} ${json?.error?.message || text.slice(0, 200)}`.trim());
    }
    await sleep(1000 * 2 ** attempt);
  }
}

export function speechRequest({ model, text, voice, style, language }) {
  const config = { voice };
  if (language) config.language = language;
  return {
    model,
    input: style ? [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] : text,
    response_format: { type: 'audio' },
    generation_config: { speech_config: [config] },
  };
}

export function audioFromInteraction(body) {
  for (const step of body?.steps || []) {
    for (const c of step.content || []) if (c.type === 'audio' && c.data) return { mime: c.mime_type || '', data: Buffer.from(c.data, 'base64') };
  }
  throw new Error('Gemini returned no audio');
}

export async function geminiSay({ text, model, voice, style, language, key, fetchImpl, sleep }) {
  const body = await geminiFetch('/interactions', { method: 'POST', body: speechRequest({ model, text, voice, style, language }), key, fetchImpl, sleep });
  const { mime, data } = audioFromInteraction(body);
  if (!mime.includes('wav')) throw new Error(`Gemini returned ${mime || 'unknown audio'}, expected audio/wav`);
  return data;
}

export async function listPrebuiltVoices({ key, fetchImpl, sleep }) {
  const voices = [];
  let token = '';
  do {
    const q = new URLSearchParams({ type: 'prebuilt', page_size: '100' });
    if (token) q.set('page_token', token);
    const page = await geminiFetch(`/voices?${q}`, { key, fetchImpl, sleep });
    voices.push(...(page?.voices || []));
    token = page?.next_page_token || '';
  } while (token);
  return voices;
}

export function designRequest({ model, name, prompt, language = 'id-ID', gender }) {
  const voice = { model, type: 'prompted', display_name: name, language_code: language, prompted: { input: prompt } };
  if (gender) voice.gender = gender;
  return { store: true, voice };
}

export function replicateRequest({ model, name, source, consent }) {
  return {
    store: true,
    voice: {
      model,
      type: 'replicated',
      display_name: name,
      replicated: {
        source_audio: { mime_type: 'audio/wav', data: source.toString('base64') },
        consent_audio: { mime_type: 'audio/wav', data: consent.toString('base64') },
      },
    },
  };
}

// Never retried: a retry after a timeout could store the same voice twice.
export async function createVoice(request, { key, fetchImpl, sleep }) {
  const v = await geminiFetch('/voices', { method: 'POST', body: request, key, fetchImpl, sleep, retries: 0 });
  if (!v?.id) throw new Error('Gemini did not return a stored voice id');
  const sample = v.prompted?.sample_audio?.data || v.sample_audio?.data;
  return {
    id: v.id,
    model: v.model || request.voice.model,
    type: v.type || request.voice.type,
    displayName: v.display_name || request.voice.display_name,
    expireTime: v.expire_time || null,
    sample: sample ? Buffer.from(sample, 'base64') : null,
  };
}
```

- [ ] **Step 6: Implement the Supertonic sidecar**

Create `scripts/lib/voice/providers/supertonic_say.py`:

```python
# Supertonic 3 sidecar for scripts/lib/voice (ADR-0023): text on stdin -> 44.1 kHz mono WAV at --out.
# Run through uv (scripts/lib/voice/providers/supertonic.mjs); nothing is installed into the repo.
import argparse
import sys

from supertonic import TTS

parser = argparse.ArgumentParser()
parser.add_argument('--voice', required=True)
parser.add_argument('--lang', default='id')
parser.add_argument('--speed', type=float, default=1.05)
parser.add_argument('--out', required=True)
args = parser.parse_args()
text = sys.stdin.read().strip()
if not text:
    sys.exit('empty text')
tts = TTS()
wav, _ = tts.synthesize(text, tts.get_voice_style(args.voice), speed=args.speed, lang=args.lang)
tts.save_audio(wav, args.out)
```

Create `scripts/lib/voice/providers/supertonic.mjs`:

```js
// Supertonic 3 local TTS (ADR-0023): a pinned uv sidecar, stock voices F1-F5 / M1-M5, Indonesian "id".
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { exec } from '../exec.mjs';

export const SUPERTONIC = { python: '3.12', package: 'supertonic==1.3.1', voices: ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'] };
const SAY_PY = join(import.meta.dirname, 'supertonic_say.py');

export function supertonicArgs({ voice, speed = 1.05, lang = 'id', out }) {
  return ['run', '--quiet', '--python', SUPERTONIC.python, '--with', SUPERTONIC.package, 'python', SAY_PY, '--voice', voice, '--lang', lang, '--speed', String(speed), '--out', out];
}

export function supertonicSay({ text, voice, speed, out, run = spawnSync }) {
  if (!SUPERTONIC.voices.includes(voice)) throw new Error(`Supertonic voice must be one of ${SUPERTONIC.voices.join(', ')} (got "${voice}")`);
  exec(run, 'uv', supertonicArgs({ voice, speed, out }), { input: text });
}
```

- [ ] **Step 7: Create the tracked presets**

Create `config/voices.json` (`dena-clone` and `gemini-designed-*` resolve only after Task 11 creates their voice files; `gemini-kore` and `supertonic-f2` are smoke presets):

```json
{
  "version": 1,
  "default": null,
  "presets": {
    "dena-clone": {
      "provider": "gemini",
      "model": "gemini-3.8-flash-tts",
      "voiceRef": "shared/voices/dena/voice.json",
      "style": "Santai dan jujur, seperti founder yang cerita ke teman; register Jakarta, tempo sedang."
    },
    "gemini-designed-a": {
      "provider": "gemini",
      "model": "gemini-3.8-flash-tts",
      "voiceRef": "shared/voices/designed-a/voice.json",
      "style": "Santai dan jujur, seperti founder yang cerita ke teman; register Jakarta, tempo sedang."
    },
    "gemini-designed-b": {
      "provider": "gemini",
      "model": "gemini-3.8-flash-tts",
      "voiceRef": "shared/voices/designed-b/voice.json",
      "style": "Santai dan jujur, seperti founder yang cerita ke teman; register Jakarta, tempo sedang."
    },
    "gemini-kore": {
      "provider": "gemini",
      "model": "gemini-3.8-flash-tts",
      "voice": "kore",
      "style": "Santai dan jujur, seperti founder yang cerita ke teman; register Jakarta, tempo sedang."
    },
    "supertonic-f2": { "provider": "supertonic", "voice": "F2", "speed": 1.05 },
    "recorded": { "provider": "recorded" }
  }
}
```

- [ ] **Step 8: Run the tests**

Run: `npm run test:voice`
Expected: `ℹ pass 15`, `ℹ fail 0`.

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/voice/exec.mjs scripts/lib/voice/presets.mjs scripts/lib/voice/providers config/voices.json scripts/voice-gemini.test.mjs
git commit -m "feat(voice): presets, Gemini 3.8 TTS provider, Supertonic uv sidecar (RD-06-01, RD-06-05..08)"
```

### Task 5: Synthesis and `renderVoice`

**Files:**
- Create: `scripts/lib/voice/synth.mjs`, `scripts/lib/voice/render.mjs`, `scripts/voice-synth.test.mjs`

**Interfaces:**
- Consumes: Tasks 2–4; `LOUDNESS`, `gainDb`, `loudnessArgs`, `parseLoudnorm` from `scripts/lib/cut-plan.mjs`; `probeDuration(file, run)` from `scripts/video.mjs`.
- Produces: `OUT_RATE = 48000`, `GAP = 0.35`, `cacheKey({ provider, model, voice, style, speed, text })`, `prepArgs(src, dst)`, `concatArgs(files, out, gap)`, `finalArgs(src, gain, out)`, `synthesize({ text, preset, voiceId, out, say, lexicon, run }) → { paragraphs: [{ hash, text, start, end, cached }], duration }`, `prepareRecorded({ file, out, run })`; `WER_WARN = 0.1`, `writeJson(file, data)`, `makeSay(preset, { root, env, fetchImpl, run, sleep }) → { voiceId, say }`, `renderVoice({ text, preset, out, root, lexicon, env, fetchImpl, run, sleep, recorded, align = true, say }) → meta` (writes `voiceover.wav`, `voice-meta.json`, `words.json`).

- [ ] **Step 1: Write the failing test**

Create `scripts/voice-synth.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPreset, loadVoices } from './lib/voice/presets.mjs';
import { renderVoice } from './lib/voice/render.mjs';
import { GAP, cacheKey, concatArgs } from './lib/voice/synth.mjs';
import { audioBody, fakeFetch, fakeMedia, voiceRoot } from './voice-fixtures.mjs';

test('concatArgs joins paragraphs with a fixed gap', () => {
  const a = concatArgs(['a.wav', 'b.wav'], 'raw.wav');
  assert.equal(a[a.indexOf('-filter_complex') + 1], `anullsrc=r=48000:cl=mono:d=${GAP}[g0];[0:a][g0][1:a]concat=n=3:v=0:a=1[a]`);
  const one = concatArgs(['a.wav'], 'raw.wav');
  assert.equal(one[one.indexOf('-filter_complex') + 1], '[0:a]concat=n=1:v=0:a=1[a]');
});

test('cacheKey changes with any input that changes the audio', () => {
  const base = { provider: 'gemini', model: 'm', voice: 'kore', style: 's', speed: '', text: 'Halo' };
  const k = cacheKey(base);
  for (const change of [{ voice: 'puck' }, { style: 't' }, { text: 'Halo.' }, { model: 'n' }, { speed: 1.1 }]) assert.notEqual(cacheKey({ ...base, ...change }), k);
  assert.equal(cacheKey(base), k);
});

test('renderVoice caches paragraphs, times them, and writes words.json + voice-meta.json', async () => {
  const root = voiceRoot();
  const out = join(root, 'out');
  const media = fakeMedia({ durations: { 'voiceover.wav': 4.35 } });
  const said = [];
  const say = async ({ text, file }) => {
    said.push(text);
    writeFileSync(file, 'RIFF');
  };
  const preset = getPreset(loadVoices(root), 'g-kore');
  const text = 'Jujur, gue kira gampang.\n\nTernyata susah.';
  const meta = await renderVoice({ text, preset, out, root, run: media.run, say });
  assert.deepEqual(said, ['Jujur, gue kira gampang.', 'Ternyata susah.']);
  assert.deepEqual(meta.paragraphs.map((p) => [p.text, p.start, p.end, p.cached]), [['Jujur, gue kira gampang.', 0, 2, false], ['Ternyata susah.', 2.35, 4.35, false]]);
  assert.equal(meta.duration, 4.35);
  assert.deepEqual(meta.alignment, { wer: 0, unmatched: [] });
  assert.equal(JSON.parse(readFileSync(join(out, 'words.json'), 'utf8')).length, 6);
  assert.equal(JSON.parse(readFileSync(join(out, 'voice-meta.json'), 'utf8')).preset, 'g-kore');
  assert.ok(existsSync(join(out, 'voiceover.wav')));
  const whisper = media.calls.find((c) => c[0] === 'whisper-cli');
  assert.deepEqual(whisper.slice(whisper.indexOf('-l'), whisper.indexOf('-l') + 5), ['-l', 'id', '-nfa', '--dtw', 'large.v3.turbo']);
  assert.doesNotMatch(whisper[whisper.indexOf('--prompt') + 1], /gampang/);
  said.length = 0;
  const again = await renderVoice({ text, preset, out, root, run: media.run, say });
  assert.deepEqual(said, []);
  assert.deepEqual(again.paragraphs.map((p) => p.cached), [true, true]);
});

test('renderVoice warns when the alignment misses words and never falls back to another provider', async () => {
  const root = voiceRoot();
  const preset = getPreset(loadVoices(root), 'g-kore');
  const say = async ({ file }) => writeFileSync(file, 'RIFF');
  const meta = await renderVoice({ text: 'Jujur, gue kira gampang. Ternyata susah banget sekali.', preset, out: join(root, 'o1'), root, run: fakeMedia().run, say });
  assert.ok(meta.alignment.wer > 0.1);
  assert.match(meta.warnings[0], /alignment WER .* check banget, sekali\./);
  const boom = async () => {
    throw new Error('HTTP 400 bad voice');
  };
  await assert.rejects(renderVoice({ text: 'Halo.', preset, out: join(root, 'o2'), root, run: fakeMedia().run, say: boom }), /HTTP 400 bad voice/);
  assert.equal(existsSync(join(root, 'o2/voiceover.wav')), false);
});

test('renderVoice drives Gemini and Supertonic through makeSay, and takes a recording for "recorded"', async () => {
  const root = voiceRoot();
  const voices = loadVoices(root);
  const f = fakeFetch([{ status: 200, body: audioBody }]);
  await renderVoice({ text: 'Halo semua.', preset: getPreset(voices, 'g-kore'), out: join(root, 'g'), root, env: { GEMINI_TTS_API_KEY: 'k' }, fetchImpl: f, run: fakeMedia().run, align: false });
  assert.equal(f.calls[0].body.generation_config.speech_config[0].voice, 'kore');
  await assert.rejects(renderVoice({ text: 'Halo.', preset: getPreset(voices, 'g-kore'), out: join(root, 'g2'), root, env: {}, run: fakeMedia().run }), /GEMINI_TTS_API_KEY is not set/);
  const media = fakeMedia();
  await renderVoice({ text: 'Rp2,5 jt <short pause> saja.', preset: getPreset(voices, 'st-f2'), out: join(root, 's'), root, run: media.run, align: false });
  const uv = media.calls.find((c) => c[0] === 'uv');
  assert.equal(uv.at(-1), '<stdin:dua koma lima juta rupiah, saja.>');
  writeFileSync(join(root, 'take.m4a'), 'audio');
  const rec = await renderVoice({ text: 'Halo semua.', preset: getPreset(voices, 'recorded'), out: join(root, 'r'), root, run: fakeMedia().run, recorded: join(root, 'take.m4a') });
  assert.deepEqual(rec.paragraphs, []);
  await assert.rejects(renderVoice({ text: 'x', preset: getPreset(voices, 'recorded'), out: join(root, 'r2'), root, run: fakeMedia().run }), /needs --recorded/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test scripts/voice-synth.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/lib/voice/render.mjs'`.

- [ ] **Step 3: Implement synthesis**

Create `scripts/lib/voice/synth.mjs`. The ffmpeg chains were checked on real Gemini (24 kHz) and Supertonic (44.1 kHz) output: 6.321 s + 0.35 s + 8.271 s joined to exactly 14.943 s, and the gain pass landed at −16.57 LUFS.

```js
// Voice synthesis (ADR-0023, RD-06-02..05): one provider call per paragraph, cached by content hash, edges trimmed,
// joined with a fixed gap, one loudness pass to -16 LUFS (same target and limiter as `video cut`) -> voiceover.wav.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { LOUDNESS, gainDb, loudnessArgs, parseLoudnorm } from '../cut-plan.mjs';
import { probeDuration } from '../../video.mjs';
import { exec } from './exec.mjs';
import { normalizeForSpeech } from './normalize.mjs';
import { forProvider, splitParagraphs, stripTags } from './script.mjs';

export const OUT_RATE = 48000;
export const GAP = 0.35; // seconds between paragraphs
const r3 = (x) => Math.round(x * 1000) / 1000;

export function cacheKey({ provider, model = '', voice = '', style = '', speed = '', text }) {
  return createHash('sha256').update(JSON.stringify([provider, model, voice, style, String(speed), text])).digest('hex').slice(0, 32);
}

const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB';
export const prepArgs = (src, dst) => ['-y', '-loglevel', 'error', '-i', src, '-af', `aresample=${OUT_RATE},aformat=sample_fmts=s16:channel_layouts=mono,${TRIM},areverse,${TRIM},areverse`, dst];

export function concatArgs(files, out, gap = GAP) {
  const labels = [];
  const gaps = [];
  files.forEach((_, k) => {
    labels.push(`[${k}:a]`);
    if (k < files.length - 1) {
      gaps.push(`anullsrc=r=${OUT_RATE}:cl=mono:d=${gap}[g${k}]`);
      labels.push(`[g${k}]`);
    }
  });
  const graph = [...gaps, `${labels.join('')}concat=n=${labels.length}:v=0:a=1[a]`].join(';');
  return ['-y', '-loglevel', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex', graph, '-map', '[a]', '-ar', String(OUT_RATE), '-ac', '1', out];
}

export const finalArgs = (src, gain, out) => ['-y', '-loglevel', 'error', '-i', src, '-af', `volume=${gain}dB,alimiter=limit=${LOUDNESS.peak}:level=0:latency=1`, '-ar', String(OUT_RATE), '-ac', '1', out];

// raw -> <out>/voiceover.wav at the loudness target; raw is removed.
function finish({ raw, out, run }) {
  const r = exec(run, 'ffmpeg', loudnessArgs(raw));
  const part = join(out, 'voiceover.part.wav');
  exec(run, 'ffmpeg', finalArgs(raw, gainDb(parseLoudnorm(r.stderr)), part));
  renameSync(part, join(out, 'voiceover.wav'));
  rmSync(raw, { force: true });
}

// say({ text, file }) writes the provider's WAV for one paragraph to file.
export async function synthesize({ text, preset, voiceId = preset.voice || '', out, say, lexicon = [], run = spawnSync }) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) throw new Error('the script has no text');
  mkdirSync(join(out, 'cache'), { recursive: true });
  const items = [];
  for (const p of paragraphs) {
    const spoken = normalizeForSpeech(forProvider(p, preset.provider), { lexicon, provider: preset.provider });
    const hash = cacheKey({ provider: preset.provider, model: preset.model, voice: voiceId, style: preset.style, speed: preset.speed, text: spoken });
    const file = join(out, 'cache', `${hash}.wav`);
    const cached = existsSync(file);
    if (!cached) {
      const src = join(out, 'cache', `${hash}.src.wav`);
      const part = join(out, 'cache', `${hash}.part.wav`);
      rmSync(src, { force: true });
      await say({ text: spoken, file: src });
      if (!existsSync(src)) throw new Error(`${preset.provider} wrote no audio for "${p.slice(0, 60)}"`);
      exec(run, 'ffmpeg', prepArgs(src, part));
      renameSync(part, file);
      rmSync(src, { force: true });
    }
    items.push({ hash, text: stripTags(p), cached, file, duration: probeDuration(file, run) });
  }
  const raw = join(out, 'voice-raw.wav');
  exec(run, 'ffmpeg', concatArgs(items.map((x) => x.file), raw));
  finish({ raw, out, run });
  let t = 0;
  const timed = items.map((x) => {
    const start = r3(t);
    t += x.duration;
    const end = r3(t);
    t += GAP;
    return { hash: x.hash, text: x.text, start, end, cached: x.cached };
  });
  return { paragraphs: timed, duration: probeDuration(join(out, 'voiceover.wav'), run) };
}

// Dena's own recording: same trim and loudness, no paragraphs (alignment gives the words).
export function prepareRecorded({ file, out, run = spawnSync }) {
  if (!existsSync(file)) throw new Error(`${file} not found`);
  mkdirSync(out, { recursive: true });
  const raw = join(out, 'voice-raw.wav');
  exec(run, 'ffmpeg', prepArgs(file, raw));
  finish({ raw, out, run });
  return { paragraphs: [], duration: probeDuration(join(out, 'voiceover.wav'), run) };
}
```

- [ ] **Step 4: Implement `renderVoice`**

Create `scripts/lib/voice/render.mjs`:

```js
// One voiceover end to end (ADR-0023, RD-06): synthesize (or take a recording), whisper + alignment -> words.json,
// and voice-meta.json. Used by `npm run voice -- say` and the listening test; sub-project 2 adds `video voice`.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOUDNESS } from '../cut-plan.mjs';
import { alignWords, whisperWords } from './align.mjs';
import { exec } from './exec.mjs';
import { resolveVoiceId } from './presets.mjs';
import { geminiKey, geminiSay } from './providers/gemini.mjs';
import { supertonicSay } from './providers/supertonic.mjs';
import { scriptWords } from './script.mjs';
import { prepareRecorded, synthesize } from './synth.mjs';
import { whisperPlan } from './whisper.mjs';

export const WER_WARN = 0.1;

export function writeJson(file, data) {
  writeFileSync(`${file}.part`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${file}.part`, file);
}

export function makeSay(preset, { root = '.', env = process.env, fetchImpl = fetch, run = spawnSync, sleep } = {}) {
  if (preset.provider === 'gemini') {
    const key = geminiKey(env);
    const voice = resolveVoiceId(preset, root);
    return {
      voiceId: voice,
      say: async ({ text, file }) => writeFileSync(file, await geminiSay({ text, model: preset.model, voice, style: preset.style, language: preset.language, key, fetchImpl, sleep })),
    };
  }
  if (preset.provider === 'supertonic') return { voiceId: preset.voice, say: async ({ text, file }) => supertonicSay({ text, voice: preset.voice, speed: preset.speed, out: file, run }) };
  throw new Error(`preset ${preset.name} (${preset.provider}) has no synthesizer; pass a recording with --recorded <file>`);
}

export async function renderVoice({ text, preset, out, root = '.', lexicon = [], env, fetchImpl, run = spawnSync, sleep, recorded, align = true, say }) {
  mkdirSync(out, { recursive: true });
  let audio;
  let voiceId = null;
  if (preset.provider === 'recorded') {
    if (!recorded) throw new Error(`preset ${preset.name} needs --recorded <audio file>`);
    audio = prepareRecorded({ file: recorded, out, run });
  } else {
    const s = say ? { say, voiceId: preset.voice || '' } : makeSay(preset, { root, env, fetchImpl, run, sleep });
    voiceId = s.voiceId;
    audio = await synthesize({ text, preset, voiceId, out, say: s.say, lexicon, run });
  }
  const meta = { version: 1, preset: preset.name, provider: preset.provider, model: preset.model || null, voice: voiceId, paragraphs: audio.paragraphs, duration: audio.duration, lufs: LOUDNESS.target, alignment: null, warnings: [] };
  if (align) {
    const plan = whisperPlan({ wav: join(out, 'voiceover.wav'), work: out, root });
    for (const [c, a] of plan.cmds) exec(run, c, a);
    const asr = whisperWords(JSON.parse(readFileSync(plan.json, 'utf8')));
    rmSync(join(out, 'asr-16k.wav'), { force: true });
    const { words, wer, unmatched } = alignWords({ script: scriptWords(text), asr, duration: audio.duration });
    writeJson(join(out, 'words.json'), words);
    meta.alignment = { wer, unmatched };
    if (wer > WER_WARN) meta.warnings.push(`alignment WER ${wer} > ${WER_WARN}: check ${unmatched.join(', ')}; regenerate the paragraph that holds them`);
  }
  writeJson(join(out, 'voice-meta.json'), meta);
  return meta;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm run test:voice`
Expected: `ℹ pass 20`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/voice/synth.mjs scripts/lib/voice/render.mjs scripts/voice-synth.test.mjs
git commit -m "feat(voice): cached per-paragraph synthesis, -16 LUFS voiceover, renderVoice (RD-06-02..05, RD-06-09/10)"
```

### Task 6: Blind listening test module and config

**Files:**
- Create: `scripts/lib/voice/test-run.mjs`, `config/voice-test.json`, `config/voice-test-script.md`, `scripts/voice-test-run.test.mjs`

**Interfaces:**
- Consumes: `loadLexicon` (Task 2), `getPreset`, `loadVoices`, `resolveVoiceId` (Task 4), `renderVoice`, `writeJson` (Task 5), `scriptBody`, `splitParagraphs` (Task 2).
- Produces: `TEST_CONFIG`, `TESTS_DIR = 'shared/voice-tests'`, `RUN_RE = /^\d{8}-\d{4}$/`, `CRITERIA = ['natural', 'pronunciation', 'register', 'similarity', 'endurance']`, `CORE`, `NOTE_MAX = 1000`, `COST_PER_MIN`, `mulberry32`, `shuffle(items, seed)`, `runId(date)`, `labelOf(i)`, `loadTestConfig(root)`, `buildRun({ root, env, fetchImpl, run, seed, now, render, log }) → { id, dir, labels, hasRef }`, `validateRatings(body, labels)`, `saveRatings(dir, labels, body, now) → { version, savedAt, ratings }`, `revealRun({ root, id }) → rows`, `formatReveal(key, rows)`. Studio (Task 9) uses `RUN_RE`, `TESTS_DIR`, `saveRatings`.

- [ ] **Step 1: Write the failing test**

Create `scripts/voice-test-run.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CRITERIA, buildRun, formatReveal, labelOf, revealRun, runId, saveRatings, shuffle, validateRatings } from './lib/voice/test-run.mjs';

function testRoot({ withClone = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'voice-run-'));
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({
    version: 1,
    default: null,
    presets: { 'dena-clone': { provider: 'gemini', model: 'gemini-3.8-flash-tts', voiceRef: 'shared/voices/dena/voice.json' } },
  }));
  writeFileSync(join(root, 'config/voice-test.json'), JSON.stringify({
    version: 1,
    script: 'config/voice-test-script.md',
    ref: 'shared/voices/dena/ref.wav',
    presets: ['dena-clone'],
    screens: [
      { id: 'gemini', keep: 2, base: { provider: 'gemini', model: 'gemini-3.8-flash-tts', style: 'santai' }, voices: ['kore', 'puck', 'aoede', 'bad'] },
      { id: 'supertonic', keep: 1, base: { provider: 'supertonic', speed: 1.05 }, voices: ['F1', 'M2'] },
    ],
  }));
  writeFileSync(join(root, 'config/voice-test-script.md'), '# Naskah\n\nHook pertama.\n\nIsi kedua.\n');
  if (withClone) {
    mkdirSync(join(root, 'shared/voices/dena'), { recursive: true });
    writeFileSync(join(root, 'shared/voices/dena/voice.json'), JSON.stringify({ id: 'voice_dena' }));
    writeFileSync(join(root, 'shared/voices/dena/ref.wav'), 'REF');
  }
  return root;
}

// renderVoice stand-in: WER per voice, writes voiceover.wav like the real one.
const WER = { kore: 0.2, puck: 0.05, aoede: 0.05, F1: 0.3, M2: 0.1 };
function fakeRender(calls) {
  return async ({ text, preset, out }) => {
    calls.push({ text, name: preset.name, voice: preset.voice });
    if (preset.voice === 'bad') throw new Error('HTTP 400 unknown voice');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'voiceover.wav'), `wav:${preset.name}`);
    return { provider: preset.provider, model: preset.model || null, voice: preset.voice || preset.voiceRef, duration: 40, alignment: { wer: WER[preset.voice] ?? 0.02 } };
  };
}

test('shuffle is deterministic for a seed and keeps every item', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(shuffle(items, 42), shuffle(items, 42));
  assert.deepEqual([...shuffle(items, 42)].sort(), items);
  assert.notDeepEqual(shuffle(items, 1), shuffle(items, 2));
  assert.equal(runId(new Date(2026, 8, 29, 14, 5)), '20260929-1405');
  assert.equal(labelOf(0), 'A');
});

test('buildRun screens pools on the hook, keeps the best, and writes a blind run', async () => {
  const root = testRoot();
  const calls = [];
  const logs = [];
  const r = await buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 14, 30), render: fakeRender(calls), log: (m) => logs.push(m) });
  assert.equal(r.id, '20260929-1430');
  assert.deepEqual(r.labels, ['A', 'B', 'C', 'D']);
  assert.equal(r.hasRef, true);
  const screens = calls.filter((c) => c.text === 'Hook pertama.');
  assert.deepEqual(screens.map((c) => c.name), ['gemini:kore', 'gemini:puck', 'gemini:aoede', 'gemini:bad', 'supertonic:F1', 'supertonic:M2']);
  const screen = JSON.parse(readFileSync(join(r.dir, 'screen.json'), 'utf8'));
  assert.deepEqual(screen.gemini.find((x) => x.voice === 'bad'), { voice: 'bad', wer: null, error: 'HTTP 400 unknown voice' });
  assert.ok(logs.some((m) => m === 'screen gemini:bad failed: HTTP 400 unknown voice'));
  const key = JSON.parse(readFileSync(join(r.dir, 'key.json'), 'utf8'));
  assert.equal(key.seed, 7);
  assert.deepEqual(Object.values(key.labels).map((l) => l.name).sort(), ['dena-clone', 'gemini:aoede', 'gemini:puck', 'supertonic:M2']);
  for (const [label, k] of Object.entries(key.labels)) assert.equal(readFileSync(join(r.dir, 'samples', `${label}.wav`), 'utf8'), `wav:${k.name}`);
  assert.equal(readFileSync(join(r.dir, 'ref.wav'), 'utf8'), 'REF');
  assert.equal(readFileSync(join(r.dir, 'script.md'), 'utf8').includes('# Naskah'), false);
  const again = await buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 16, 0), render: fakeRender([]) });
  const key2 = JSON.parse(readFileSync(join(again.dir, 'key.json'), 'utf8'));
  assert.deepEqual(Object.values(key2.labels).map((l) => l.name), Object.values(key.labels).map((l) => l.name));
  await assert.rejects(buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 16, 0), render: fakeRender([]) }), /already exists/);
});

test('buildRun stops before any synthesis when a preset voice file is missing', async () => {
  const root = testRoot({ withClone: false });
  const calls = [];
  await assert.rejects(buildRun({ root, seed: 1, now: new Date(2026, 8, 29, 9, 0), render: fakeRender(calls) }), /cannot start:\n- shared\/voices\/dena\/voice\.json not found/);
  assert.deepEqual(calls, []);
  assert.equal(existsSync(join(root, 'shared/voice-tests')), false);
});

test('validateRatings accepts 1-5 or empty per criterion and a short note', () => {
  const ok = validateRatings({ ratings: { A: { natural: 4, pronunciation: 3, note: 'agak cepat' }, B: {} } }, ['A', 'B']);
  assert.deepEqual(ok.A, { natural: 4, pronunciation: 3, register: null, similarity: null, endurance: null, note: 'agak cepat' });
  assert.deepEqual(Object.keys(ok.B), [...CRITERIA, 'note']);
  assert.throws(() => validateRatings({ ratings: { Z: {} } }, ['A']), /unknown sample Z/);
  assert.throws(() => validateRatings({ ratings: { A: { natural: 6 } } }, ['A']), /A\.natural must be 1-5/);
  assert.throws(() => validateRatings({ ratings: { A: { natural: 2.5 } } }, ['A']), /A\.natural must be 1-5/);
  assert.throws(() => validateRatings({ ratings: { A: { note: 'x'.repeat(1001) } } }, ['A']), /at most 1000/);
  assert.throws(() => validateRatings({}, ['A']), /ratings must be an object/);
});

test('revealRun ranks by the core score and reports similarity, WER, and cost apart', async () => {
  const root = testRoot();
  const r = await buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 14, 30), render: fakeRender([]) });
  assert.throws(() => revealRun({ root, id: r.id }), /ratings\.json not found; rate the samples in Studio/);
  assert.throws(() => revealRun({ root, id: '../x' }), /run id like/);
  const key = JSON.parse(readFileSync(join(r.dir, 'key.json'), 'utf8'));
  const labelOfName = (n) => Object.entries(key.labels).find(([, k]) => k.name === n)[0];
  const clone = labelOfName('dena-clone');
  const puck = labelOfName('gemini:puck');
  saveRatings(r.dir, r.labels, { ratings: { [clone]: { natural: 4, pronunciation: 4, register: 5, endurance: 4, similarity: 5, note: 'mirip' }, [puck]: { natural: 5, pronunciation: 5, register: 5, endurance: 5, similarity: 1 } } }, new Date('2026-09-29T08:00:00Z'));
  const rows = revealRun({ root, id: r.id });
  assert.deepEqual(rows.slice(0, 2).map((x) => [x.name, x.score, x.similarity, x.costPerMin]), [['gemini:puck', 5, 1, 0.0135], ['dena-clone', 4.25, 5, 0.0135]]);
  assert.equal(rows.find((x) => x.name === 'supertonic:M2').costPerMin, 0);
  const md = readFileSync(join(r.dir, 'reveal.md'), 'utf8');
  assert.match(md, /^# Uji dengar 20260929-1430 — hasil/);
  assert.match(md, new RegExp(`\\*\\*${clone}\\*\\* \\(dena-clone\\): mirip`));
  assert.equal(formatReveal({ run: 'x' }, []).includes('| # | Label |'), true);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test scripts/voice-test-run.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/lib/voice/test-run.mjs'`.

- [ ] **Step 3: Implement the listening test**

Create `scripts/lib/voice/test-run.mjs`:

```js
// Blind listening test (ADR-0023, RD-06-14..17): screen stock-voice pools by WER on the hook, render every candidate
// through the same adapter, shuffle with a seed into A, B, ..., and reveal the ranking from Dena's ratings.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLexicon } from './normalize.mjs';
import { getPreset, loadVoices, resolveVoiceId } from './presets.mjs';
import { renderVoice, writeJson } from './render.mjs';
import { scriptBody, splitParagraphs } from './script.mjs';

export const TEST_CONFIG = join('config', 'voice-test.json');
export const TESTS_DIR = join('shared', 'voice-tests');
export const RUN_RE = /^\d{8}-\d{4}$/;
export const CRITERIA = ['natural', 'pronunciation', 'register', 'similarity', 'endurance'];
export const CORE = ['natural', 'pronunciation', 'register', 'endurance']; // the score; similarity is reported apart
export const NOTE_MAX = 1000;
// USD per minute of audio on the paid tier, valid through 2026-12-31 (ai.google.dev/gemini-api/docs/pricing).
export const COST_PER_MIN = { 'gemini-3.8-flash-tts': 0.0135, 'gemini-3.8-flash-lite-tts': 0.009 };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, seed) {
  const rnd = mulberry32(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pad = (n) => String(n).padStart(2, '0');
export const runId = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
export const labelOf = (i) => String.fromCharCode(65 + i);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

export function loadTestConfig(root = '.') {
  const file = join(root, TEST_CONFIG);
  const c = readJson(file);
  if (c?.version !== 1 || typeof c.script !== 'string' || !Array.isArray(c.presets) || !Array.isArray(c.screens)) throw new Error(`${file} is not a version 1 listening-test config`);
  return c;
}

export async function buildRun({ root = '.', env, fetchImpl, run = spawnSync, seed = Math.floor(Math.random() * 2 ** 31), now = new Date(), render = renderVoice, log = () => {} }) {
  const config = loadTestConfig(root);
  const voices = loadVoices(root);
  const lexicon = loadLexicon(root);
  const presets = config.presets.map((name) => getPreset(voices, name));
  // Preflight: every named preset must resolve before the first paid call.
  const missing = [];
  for (const p of presets) {
    try {
      if (p.provider === 'gemini') resolveVoiceId(p, root);
      if (p.provider === 'recorded') missing.push(`preset ${p.name} is a recording; the listening test only takes TTS presets`);
    } catch (e) {
      missing.push(e.message);
    }
  }
  if (missing.length) throw new Error(`listening test cannot start:\n- ${missing.join('\n- ')}`);
  const text = scriptBody(readFileSync(join(root, config.script), 'utf8'));
  const hook = splitParagraphs(text)[0];
  if (!hook) throw new Error(`${config.script} has no text`);
  const id = runId(now);
  const dir = join(root, TESTS_DIR, id);
  if (existsSync(dir)) throw new Error(`${dir} already exists; run again in a minute`);
  mkdirSync(join(dir, 'samples'), { recursive: true });
  writeFileSync(join(dir, 'script.md'), text);
  const candidates = presets.map((p) => ({ name: p.name, preset: p }));
  const screen = {};
  for (const s of config.screens) {
    screen[s.id] = [];
    for (const voice of s.voices) {
      const preset = { ...s.base, voice, name: `${s.id}:${voice}` };
      try {
        const meta = await render({ text: hook, preset, out: join(dir, 'screen', s.id, voice), root, lexicon, env, fetchImpl, run });
        screen[s.id].push({ voice, wer: meta.alignment.wer });
        log(`screen ${s.id}:${voice} WER ${meta.alignment.wer}`);
      } catch (e) {
        screen[s.id].push({ voice, wer: null, error: e.message });
        log(`screen ${s.id}:${voice} failed: ${e.message}`);
      }
    }
    const best = screen[s.id].filter((x) => x.wer !== null).sort((a, b) => a.wer - b.wer || a.voice.localeCompare(b.voice)).slice(0, s.keep);
    for (const b of best) candidates.push({ name: `${s.id}:${b.voice}`, preset: { ...s.base, voice: b.voice, name: `${s.id}:${b.voice}` } });
  }
  writeJson(join(dir, 'screen.json'), screen);
  if (candidates.length > 26) throw new Error('at most 26 candidates (labels A-Z)');
  const labels = {};
  for (const [i, c] of shuffle(candidates, seed).entries()) {
    const label = labelOf(i);
    const out = join(dir, 'work', label);
    const meta = await render({ text, preset: c.preset, out, root, lexicon, env, fetchImpl, run });
    copyFileSync(join(out, 'voiceover.wav'), join(dir, 'samples', `${label}.wav`));
    labels[label] = { name: c.name, provider: meta.provider, model: meta.model, voice: meta.voice, duration: meta.duration, wer: meta.alignment?.wer ?? null };
    log(`sample ${label} ready`);
  }
  const ref = join(root, config.ref || join('shared', 'voices', 'dena', 'ref.wav'));
  const hasRef = existsSync(ref);
  if (hasRef) copyFileSync(ref, join(dir, 'ref.wav'));
  writeJson(join(dir, 'key.json'), { version: 1, run: id, seed, createdAt: now.toISOString(), labels });
  return { id, dir, labels: Object.keys(labels), hasRef };
}

export function validateRatings(body, labels) {
  const input = body?.ratings;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('ratings must be an object keyed by sample label');
  const out = {};
  for (const [label, r] of Object.entries(input)) {
    if (!labels.includes(label)) throw new Error(`unknown sample ${label}`);
    if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error(`${label}: a rating must be an object`);
    const row = {};
    for (const c of CRITERIA) {
      const v = r[c] ?? null;
      if (v !== null && !(Number.isInteger(v) && v >= 1 && v <= 5)) throw new Error(`${label}.${c} must be 1-5 or empty`);
      row[c] = v;
    }
    const note = r.note ?? '';
    if (typeof note !== 'string' || note.length > NOTE_MAX) throw new Error(`${label}.note must be text of at most ${NOTE_MAX} characters`);
    row.note = note;
    out[label] = row;
  }
  return out;
}

export function saveRatings(dir, labels, body, now = new Date()) {
  const data = { version: 1, savedAt: now.toISOString(), ratings: validateRatings(body, labels) };
  writeJson(join(dir, 'ratings.json'), data);
  return data;
}

const mean = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
};

export function revealRun({ root = '.', id }) {
  if (!RUN_RE.test(String(id))) throw new Error('reveal needs a run id like 20260929-1430 (see shared/voice-tests/)');
  const dir = join(root, TESTS_DIR, id);
  const key = readJson(join(dir, 'key.json'));
  const file = join(dir, 'ratings.json');
  if (!existsSync(file)) throw new Error(`${file} not found; rate the samples in Studio (tab Suara) first`);
  const { ratings } = readJson(file);
  const rows = Object.entries(key.labels)
    .map(([label, k]) => {
      const r = ratings[label] || {};
      const cost = k.provider === 'gemini' ? (COST_PER_MIN[k.model] ?? null) : 0;
      return { label, ...k, score: mean(CORE.map((c) => r[c])), ...Object.fromEntries(CRITERIA.map((c) => [c, r[c] ?? null])), note: r.note || '', costPerMin: cost };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.label.localeCompare(b.label));
  writeFileSync(join(dir, 'reveal.md'), formatReveal(key, rows));
  return rows;
}

const cell = (x) => (x === null || x === undefined || x === '' ? '–' : String(x));

export function formatReveal(key, rows) {
  const head = [
    `# Uji dengar ${key.run} — hasil`,
    '',
    'Skor = rata-rata natural, ucapan, gaya, betah (1–5). Mirip = kemiripan dengan suara asli Dena, dilaporkan terpisah.',
    '',
    '| # | Label | Kandidat | Provider | Model | Skor | Natural | Ucapan | Gaya | Betah | Mirip | WER | Durasi (s) | USD/menit |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const body = rows.map((r, i) => `| ${i + 1} | ${r.label} | ${r.name} | ${r.provider} | ${cell(r.model)} | ${cell(r.score)} | ${cell(r.natural)} | ${cell(r.pronunciation)} | ${cell(r.register)} | ${cell(r.endurance)} | ${cell(r.similarity)} | ${cell(r.wer)} | ${cell(r.duration)} | ${cell(r.costPerMin)} |`);
  const notes = rows.filter((r) => r.note).map((r) => `- **${r.label}** (${r.name}): ${r.note}`);
  return [...head, ...body, ...(notes.length ? ['', '## Catatan', '', ...notes] : []), ''].join('\n');
}
```

- [ ] **Step 4: Create the listening-test config and script**

Create `config/voice-test.json` (the Gemini pool mixes voice characters; Task 11 asks Dena before the first real run and edits this list if she wants):

```json
{
  "version": 1,
  "script": "config/voice-test-script.md",
  "ref": "shared/voices/dena/ref.wav",
  "presets": ["dena-clone", "gemini-designed-a", "gemini-designed-b"],
  "screens": [
    {
      "id": "gemini",
      "keep": 2,
      "base": {
        "provider": "gemini",
        "model": "gemini-3.8-flash-tts",
        "style": "Santai dan jujur, seperti founder yang cerita ke teman; register Jakarta, tempo sedang."
      },
      "voices": ["kore", "aoede", "sulafat", "vindemiatrix", "puck", "achird", "umbriel", "jv-id-concierge-6", "jv-id-concierge-7"]
    },
    {
      "id": "supertonic",
      "keep": 2,
      "base": { "provider": "supertonic", "speed": 1.05 },
      "voices": ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]
    }
  ]
}
```

Create `config/voice-test-script.md` (≈36 s with Supertonic; the traps are deliberate):

```md
# Naskah uji dengar (±40 detik)

<!-- Dena boleh mengedit sebelum `npm run voice -- test build`. Paragraf pertama dipakai untuk saringan WER.
     Jebakan yang sengaja ada: campuran Inggris, register santai, angka + rupiah + persen, singkatan, kalimat tanya. -->

Jujur, gue kira bikin AI agent buat bisnis itu gampang. Ternyata yang bikin pusing justru deploy workflow-nya.

Klien gue bayar Rp2,5 juta per bulan buat CRM yang katanya udah pakai AI. Pas gue cek, prompt-nya cuma satu baris, dan API-nya dipanggil 3 kali tiap ada chat masuk.

Dari situ gue sadar. <short pause> Masalahnya bukan di model. Masalahnya di sistem yang nggak pernah dites.

Jadi sekarang, sebelum ngomongin AI, gue minta tim cek dulu datanya di ERP. Hasilnya? Waktu balas chat turun 70%.

Lo sendiri, <short pause> pernah ngalamin hal yang sama nggak?
```

- [ ] **Step 5: Run the tests**

Run: `npm run test:voice`
Expected: `ℹ pass 25`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/voice/test-run.mjs config/voice-test.json config/voice-test-script.md scripts/voice-test-run.test.mjs
git commit -m "feat(voice): blind listening test with WER screening, seeded labels, reveal (RD-06-14..17)"
```

### Task 7: `npm run voice` CLI

**Files:**
- Create: `scripts/voice.mjs`, `scripts/voice-cli.test.mjs`
- Modify: `package.json` (add `voice`), `.github/workflows/ci.yml`, `internal/docs/operations/runbook.md`, `internal/docs/architecture/stack.md`, `docs/initial-setup.md`, `CLAUDE.md`, `AGENTS.md`

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces: `main(argv, { root, env, fetchImpl, run, now, log })`, `NAME_RE`, `REF = { min: 10, max: 30 }`, `CONSENT = { min: 2, max: 30 }`, `VOICE_MODEL`, `refArgs({ from, at, dur, out })`. The entry point loads `.env` before `main`.

- [ ] **Step 1: Write the failing test**

Create `scripts/voice-cli.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { main, refArgs } from './voice.mjs';
import { WAV, audioBody, fakeFetch, fakeMedia, voiceRoot } from './voice-fixtures.mjs';

test('voice say writes a voiceover and prints its WER', async () => {
  const root = voiceRoot();
  const logs = [];
  const f = fakeFetch([{ status: 200, body: audioBody }, { status: 200, body: audioBody }]);
  await main(['say', '--preset', 'g-kore', '--text', 'Jujur, gue kira gampang.\n\nTernyata susah.', '--out', join(root, 'o')], { root, env: { GEMINI_TTS_API_KEY: 'k' }, fetchImpl: f, run: fakeMedia().run, log: (m) => logs.push(m) });
  assert.match(logs[0], /^voiceover .*voiceover\.wav \(2 s, WER 0\)$/);
  await assert.rejects(main(['say', '--preset', 'g-kore', '--out', join(root, 'o')], { root, run: fakeMedia().run }), /--text <text> or --file/);
});

test('voice ref cuts a 24 kHz mono clip of 10-30 s and transcribes it', async () => {
  const root = voiceRoot();
  writeFileSync(join(root, 'take.mp4'), 'v');
  assert.deepEqual(refArgs({ from: 'a.mp4', at: 12.5, dur: 20, out: 'ref.wav' }), ['-y', '-loglevel', 'error', '-ss', '12.5', '-t', '20', '-i', 'a.mp4', '-vn', '-ar', '24000', '-ac', '1', '-sample_fmt', 's16', 'ref.wav']);
  await assert.rejects(main(['ref', '--from', join(root, 'take.mp4'), '--at', '3', '--dur', '8'], { root, run: fakeMedia().run }), /--dur must be 10-30/);
  const media = fakeMedia({ durations: { 'ref.wav': 20 } });
  await main(['ref', '--from', join(root, 'take.mp4'), '--at', '3', '--dur', '20'], { root, run: media.run, log: () => {} });
  assert.equal(readFileSync(join(root, 'shared/voices/dena/ref.txt'), 'utf8'), '\n');
  assert.ok(existsSync(join(root, 'shared/voices/dena/ref.wav')));
});

test('voice clone needs consent and a reference, and writes the voice id to shared/voices', async () => {
  const root = voiceRoot();
  const env = { GEMINI_TTS_API_KEY: 'k' };
  await assert.rejects(main(['clone'], { root, env }), /needs --consent .*Saya pemilik suara ini/);
  writeFileSync(join(root, 'consent.m4a'), 'c');
  await assert.rejects(main(['clone', '--consent', join(root, 'consent.m4a')], { root, env, run: fakeMedia().run }), /ref\.wav not found; run npm run voice -- ref first/);
  mkdirSync(join(root, 'shared/voices/dena'), { recursive: true });
  writeFileSync(join(root, 'shared/voices/dena/ref.wav'), 'R');
  const f = fakeFetch([{ status: 200, body: { id: 'voice_dena', type: 'replicated', model: 'gemini-3.8-flash-tts', expire_time: '2027-09-29T00:00:00Z' } }]);
  const media = fakeMedia({ durations: { 'ref.wav': 20, 'consent.wav': 6 } });
  await main(['clone', '--consent', join(root, 'consent.m4a')], { root, env, fetchImpl: f, run: media.run, now: () => new Date('2026-09-29T10:00:00Z'), log: () => {} });
  const saved = JSON.parse(readFileSync(join(root, 'shared/voices/dena/voice.json'), 'utf8'));
  assert.deepEqual([saved.id, saved.type, saved.expireTime], ['voice_dena', 'replicated', '2027-09-29T00:00:00Z']);
  assert.equal(f.calls[0].body.voice.type, 'replicated');
  await assert.rejects(main(['clone', '--consent', join(root, 'consent.m4a')], { root, env, run: media.run }), /already exists; pass --force/);
});

test('voice design stores the voice id and its preview; voices filters the prebuilt list', async () => {
  const root = voiceRoot();
  const env = { GEMINI_TTS_API_KEY: 'k' };
  await assert.rejects(main(['design', '--name', 'designed-a', '--prompt', 'x', '--gender', 'robot'], { root, env }), /--gender must be one of/);
  const f = fakeFetch([{ status: 200, body: { id: 'voice_d1', prompted: { sample_audio: { data: WAV.toString('base64') } } } }]);
  await main(['design', '--name', 'designed-a', '--prompt', 'Narator Indonesia, hangat'], { root, env, fetchImpl: f, log: () => {} });
  assert.equal(JSON.parse(readFileSync(join(root, 'shared/voices/designed-a/voice.json'), 'utf8')).id, 'voice_d1');
  assert.deepEqual(readFileSync(join(root, 'shared/voices/designed-a/sample.wav')), WAV);
  assert.equal(f.calls[0].body.voice.language_code, 'id-ID');
  const logs = [];
  const list = fakeFetch([{ status: 200, body: { voices: [{ id: 'kore', language_code: 'en-US', gender: 'female', pitch: 'medium', persona: 'Host' }, { id: 'jv-id-concierge-6', language_code: 'jv-ID', gender: 'female', pitch: 'medium', persona: 'Tech' }] } }]);
  await main(['voices', '--lang', 'jv'], { root, env, fetchImpl: list, log: (m) => logs.push(m) });
  assert.deepEqual(logs, ['jv-id-concierge-6\tjv-ID\tfemale\tmedium\tTech', '1 of 2 prebuilt voices']);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test scripts/voice-cli.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/voice.mjs'`.

- [ ] **Step 3: Implement the CLI**

Create `scripts/voice.mjs`:

```js
#!/usr/bin/env node
// Voice adapter CLI (ADR-0023, RD-06): TTS voiceovers, reference/clone/design voices, the blind listening test.
// Spec: docs/superpowers/specs/2026-09-29-audio-foundation-design.md
// Usage: npm run voice -- say --preset <p> (--text <t> | --file <f>) --out <dir> [--recorded <audio>] [--no-align]
//        npm run voice -- ref --from <audio|video> --at <s> --dur <s> [--name dena]
//        npm run voice -- clone --consent <audio> [--name dena] [--force]
//        npm run voice -- design --name <n> --prompt "<deskripsi>" [--gender female|male|neutral] [--language id-ID] [--force]
//        npm run voice -- voices [--lang <bcp47>] [--search <kata>]
//        npm run voice -- test build [--seed <n>]
//        npm run voice -- test reveal <run>
// Node 22+, built-in modules only (ADR-0007); Supertonic runs as a uv sidecar (ADR-0023).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { exec } from './lib/voice/exec.mjs';
import { loadLexicon } from './lib/voice/normalize.mjs';
import { VOICE_DIR, getPreset, loadVoices } from './lib/voice/presets.mjs';
import { CONSENT_ID, createVoice, designRequest, geminiKey, listPrebuiltVoices, replicateRequest } from './lib/voice/providers/gemini.mjs';
import { renderVoice, writeJson } from './lib/voice/render.mjs';
import { scriptBody } from './lib/voice/script.mjs';
import { buildRun, revealRun } from './lib/voice/test-run.mjs';
import { transcriptText, whisperPlan } from './lib/voice/whisper.mjs';
import { probeDuration } from './video.mjs';

export const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
export const REF = { min: 10, max: 30 }; // seconds, Gemini voice replication
export const CONSENT = { min: 2, max: 30 };
export const VOICE_MODEL = 'gemini-3.8-flash-tts';
const GENDERS = ['female', 'male', 'neutral'];

function voiceDir(root, name = 'dena') {
  if (!NAME_RE.test(String(name))) throw new Error('--name must use lowercase letters, digits, and dashes');
  return join(root, VOICE_DIR, name);
}

// 24 kHz mono 16-bit WAV: the format Gemini recommends for replication.
export const refArgs = ({ from, at = 0, dur, out }) => ['-y', '-loglevel', 'error', ...(dur === undefined ? [] : ['-ss', String(at), '-t', String(dur)]), '-i', from, '-vn', '-ar', '24000', '-ac', '1', '-sample_fmt', 's16', out];

function checkLength(file, { min, max }, what, run) {
  const d = probeDuration(file, run);
  if (d < min || d > max) throw new Error(`${what} must be ${min}-${max} s long (got ${d} s)`);
  return d;
}

function refuseOverwrite(file, force) {
  if (existsSync(file) && !force) throw new Error(`${file} already exists; pass --force to replace it (the old voice stays in Google until deleted)`);
}

export async function main(argv, { root = '.', env = process.env, fetchImpl = fetch, run = spawnSync, now = () => new Date(), log = console.log } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      preset: { type: 'string' }, text: { type: 'string' }, file: { type: 'string' }, out: { type: 'string' },
      recorded: { type: 'string' }, 'no-align': { type: 'boolean', default: false },
      from: { type: 'string' }, at: { type: 'string' }, dur: { type: 'string' }, name: { type: 'string' },
      consent: { type: 'string' }, force: { type: 'boolean', default: false },
      prompt: { type: 'string' }, gender: { type: 'string' }, language: { type: 'string' },
      lang: { type: 'string' }, search: { type: 'string' }, seed: { type: 'string' },
    },
  });
  const [cmd, sub, arg] = positionals;

  if (cmd === 'say') {
    const preset = getPreset(loadVoices(root), values.preset);
    const text = values.text ?? (values.file ? scriptBody(readFileSync(values.file, 'utf8')) : undefined);
    if (preset.provider !== 'recorded' && !text) throw new Error('say needs --text <text> or --file <script.md>');
    if (!values.out) throw new Error('say needs --out <dir>');
    const meta = await renderVoice({ text: text ?? '', preset, out: values.out, root, lexicon: loadLexicon(root), env, fetchImpl, run, recorded: values.recorded, align: !values['no-align'] });
    log(`voiceover ${join(values.out, 'voiceover.wav')} (${meta.duration} s${meta.alignment ? `, WER ${meta.alignment.wer}` : ''})`);
    for (const w of meta.warnings) log(`warning: ${w}`);
    return;
  }

  if (cmd === 'ref') {
    const dir = voiceDir(root, values.name ?? 'dena');
    const at = Number(values.at ?? 0);
    const dur = Number(values.dur);
    if (!values.from || !existsSync(values.from)) throw new Error('ref needs --from <audio or video file>');
    if (!Number.isFinite(at) || at < 0) throw new Error('--at must be a number of seconds >= 0');
    if (!(dur >= REF.min && dur <= REF.max)) throw new Error(`--dur must be ${REF.min}-${REF.max} seconds`);
    mkdirSync(dir, { recursive: true });
    const ref = join(dir, 'ref.wav');
    exec(run, 'ffmpeg', refArgs({ from: values.from, at, dur, out: ref }));
    checkLength(ref, REF, 'the reference clip', run);
    const plan = whisperPlan({ wav: ref, work: dir, root });
    for (const [c, a] of plan.cmds) exec(run, c, a);
    writeFileSync(join(dir, 'ref.txt'), `${transcriptText(JSON.parse(readFileSync(plan.json, 'utf8')))}\n`);
    rmSync(join(dir, 'asr-16k.wav'), { force: true });
    log(`reference ${ref}; check ${join(dir, 'ref.txt')}: one speaker, no music, no noise`);
    return;
  }

  if (cmd === 'clone') {
    const name = values.name ?? 'dena';
    const dir = voiceDir(root, name);
    if (!values.consent) throw new Error(`clone needs --consent <audio>: the same speaker saying "${CONSENT_ID}"`);
    const ref = join(dir, 'ref.wav');
    if (!existsSync(ref)) throw new Error(`${ref} not found; run npm run voice -- ref first`);
    if (!existsSync(values.consent)) throw new Error(`${values.consent} not found`);
    refuseOverwrite(join(dir, 'voice.json'), values.force);
    checkLength(ref, REF, 'the reference clip', run);
    const consent = join(dir, 'consent.wav');
    exec(run, 'ffmpeg', refArgs({ from: values.consent, out: consent }));
    checkLength(consent, CONSENT, 'the consent clip', run);
    const key = geminiKey(env);
    const v = await createVoice(replicateRequest({ model: VOICE_MODEL, name, source: readFileSync(ref), consent: readFileSync(consent) }), { key, fetchImpl });
    writeJson(join(dir, 'voice.json'), { id: v.id, type: 'replicated', model: v.model, displayName: v.displayName, createdAt: now().toISOString(), expireTime: v.expireTime });
    log(`cloned voice ${v.id} -> ${join(dir, 'voice.json')}`);
    return;
  }

  if (cmd === 'design') {
    if (!values.name) throw new Error('design needs --name <n>');
    const dir = voiceDir(root, values.name);
    if (!values.prompt?.trim()) throw new Error('design needs --prompt "<voice description>"');
    if (values.gender !== undefined && !GENDERS.includes(values.gender)) throw new Error(`--gender must be one of ${GENDERS.join(', ')}`);
    refuseOverwrite(join(dir, 'voice.json'), values.force);
    const language = values.language || 'id-ID';
    const key = geminiKey(env);
    const v = await createVoice(designRequest({ model: VOICE_MODEL, name: values.name, prompt: values.prompt.trim(), language, gender: values.gender }), { key, fetchImpl });
    mkdirSync(dir, { recursive: true });
    if (v.sample) writeFileSync(join(dir, 'sample.wav'), v.sample);
    writeJson(join(dir, 'voice.json'), { id: v.id, type: 'prompted', model: v.model, displayName: v.displayName, prompt: values.prompt.trim(), language, gender: values.gender ?? null, createdAt: now().toISOString(), expireTime: v.expireTime });
    log(`designed voice ${v.id} -> ${join(dir, 'voice.json')}${v.sample ? ` (preview ${join(dir, 'sample.wav')})` : ''}`);
    return;
  }

  if (cmd === 'voices') {
    const all = await listPrebuiltVoices({ key: geminiKey(env), fetchImpl });
    const lang = values.lang?.toLowerCase();
    const q = values.search?.toLowerCase();
    const hits = all.filter((v) => (!lang || String(v.language_code).toLowerCase().startsWith(lang)) && (!q || [v.id, v.display_name, v.persona, v.description].join(' ').toLowerCase().includes(q)));
    for (const v of hits) log([v.id, v.language_code, v.gender, v.pitch, v.persona].join('\t'));
    log(`${hits.length} of ${all.length} prebuilt voices`);
    return;
  }

  if (cmd === 'test' && sub === 'build') {
    const seed = values.seed === undefined ? undefined : Number(values.seed);
    const r = await buildRun({ root, env, fetchImpl, run, seed, now: now(), log });
    log(`listening test ${r.dir}: samples ${r.labels.join(' ')}${r.hasRef ? ' + reference' : ''}; rate them in Studio (tab Suara), then npm run voice -- test reveal ${r.id}`);
    return;
  }
  if (cmd === 'test' && sub === 'reveal') {
    const rows = revealRun({ root, id: arg });
    for (const [i, r] of rows.entries()) log(`${i + 1}. ${r.label} ${r.name} score ${r.score ?? '–'} similarity ${r.similarity ?? '–'} WER ${r.wer ?? '–'}`);
    log(`table: ${join(root, 'shared', 'voice-tests', arg, 'reveal.md')}`);
    return;
  }
  throw new Error('usage: npm run voice -- say | ref | clone | design | voices | test build | test reveal <run> (see the header of scripts/voice.mjs)');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Wire the npm script and CI**

In `package.json`, replace
```json
    "test:voice": "node --test scripts/voice-*.test.mjs"
```
with
```json
    "voice": "node scripts/voice.mjs",
    "test:voice": "node --test scripts/voice-*.test.mjs"
```
In `.github/workflows/ci.yml`, after `      - run: npm run test:studio` add `      - run: npm run test:voice`.

- [ ] **Step 5: Run the tests**

Run: `npm run test:voice`
Expected: `ℹ pass 29`, `ℹ fail 0`.

- [ ] **Step 6: Update the operational docs**

Save as `/tmp/task7-docs.py` and run `python3 /tmp/task7-docs.py` from the repo root (expected `task7 docs ok`):

````python
# Task 7 docs: voice CLI in runbook, stack, initial setup, CLAUDE.md, AGENTS.md.
def edit(path, old, new, count=1):
    s = open(path).read()
    assert s.count(old) == count, f'{path}: expected {count} match(es) for {old[:60]!r}, got {s.count(old)}'
    open(path, 'w').write(s.replace(old, new))

VOICE_CMDS = (
    'npm run voice -- say --preset <p> --file <naskah.md> --out <dir>  # TTS voiceover + words.json (ADR-0023)\n'
    'npm run voice -- ref --from <file> --at <s> --dur <s>   # 10-30 s reference of Dena\'s voice -> shared/voices/dena/\n'
    'npm run voice -- clone --consent <audio>                 # Gemini voice replication (needs the consent clip)\n'
    'npm run voice -- design --name <n> --prompt "<deskripsi>"  # Gemini voice design (id-ID)\n'
    'npm run voice -- voices [--lang jv] [--search <q>]       # list Gemini prebuilt voices\n'
    'npm run voice -- test build | test reveal <run>          # blind listening test (rate in Studio, tab Suara)\n'
    'npm run test:voice             # unit test the voice adapter and listening test\n'
)
for f in ('CLAUDE.md', 'AGENTS.md'):
    edit(f, 'npm run test:studio            # unit test the Studio server\n', 'npm run test:studio            # unit test the Studio server\n' + VOICE_CMDS)

edit('internal/docs/operations/runbook.md', '## Troubleshooting cepat\n', '''## Suara (TTS)

Adapter suara ([ADR-0023](../adr/0023-voice-adapter-tts.md), [RD-06](../requirements/rd-06-audio.md)).
Butuh `GEMINI_TTS_API_KEY` di `.env` untuk preset Gemini dan `uv` untuk Supertonic.

```bash
npm run voice -- say --preset <p> --file <naskah.md> --out <dir>   # voiceover.wav + voice-meta.json + words.json
npm run voice -- ref --from shared/<take>.mp4 --at <s> --dur 20    # referensi suara Dena (10-30 s)
npm run voice -- clone --consent <rekaman-consent.m4a>             # clone Gemini (paid tier dulu)
npm run voice -- design --name designed-a --prompt "<deskripsi>"   # voice design id-ID
npm run voice -- voices --lang jv                                  # daftar suara prebuilt
npm run voice -- test build                                        # uji dengar blind -> shared/voice-tests/<run>/
npm run voice -- test reveal <run>                                 # setelah dinilai di Studio (tab Suara)
```

## Troubleshooting cepat
''')
edit('internal/docs/operations/runbook.md', 'npm run test:video          # node --test scripts/video.test.mjs\n',
     'npm run test:video          # node --test scripts/video.test.mjs\nnpm run test:voice          # node --test scripts/voice.test.mjs scripts/voice-test-run.test.mjs (adapter suara, uji dengar)\n')
edit('internal/docs/operations/runbook.md', '- Publish berhenti "user approval" → tambah `--approved` setelah review.\n',
     '- Publish berhenti "user approval" → tambah `--approved` setelah review.\n'
     '- `voice` berhenti "GEMINI_TTS_API_KEY is not set" → isi di `.env` (bukan `GEMINI_API_KEY`).\n'
     '- `voice` berhenti "uv not found" → `brew install uv`; unduhan model Supertonic pertama ±70 s.\n'
     '- Peringatan "alignment WER" → dengarkan paragraf yang disebut, perbaiki naskah/leksikon, buat ulang.\n')

edit('internal/docs/architecture/stack.md', '| whisper.cpp | Transkripsi audio → JSON word-level, lokal, offline |',
     '| Voice adapter | Voiceover TTS per paragraf (cache sha256, −16 LUFS), clone/design suara, uji dengar blind | `npm run voice -- say\\|ref\\|clone\\|design\\|voices\\|test` | `scripts/voice.mjs`, `scripts/lib/voice/`, [ADR-0023](../adr/0023-voice-adapter-tts.md) |\n'
     '| Gemini 3.8 Flash TTS | TTS cloud bahasa Indonesia, voice design, voice replication | `fetch` ke `generativelanguage.googleapis.com/v1beta` dengan `GEMINI_TTS_API_KEY` | `scripts/lib/voice/providers/gemini.mjs` |\n'
     '| Supertonic 3 + uv | TTS lokal (suara stok F1–F5/M1–M5), Python 3.12 sidecar, bobot di `~/.cache/supertonic3` | `uv run --python 3.12 --with supertonic==1.3.1 …` | `scripts/lib/voice/providers/supertonic.mjs` |\n'
     '| whisper.cpp | Transkripsi audio → JSON word-level, lokal, offline |')
edit('internal/docs/architecture/stack.md', '- `npm run test:repliz` → `node --test scripts/repliz-publish.test.mjs`.\n',
     '- `npm run test:repliz` → `node --test scripts/repliz-publish.test.mjs`.\n'
     '- `npm run voice` → `node scripts/voice.mjs` (adapter suara, ADR-0023); `npm run test:voice`.\n')
edit('internal/docs/architecture/stack.md', '- Tidak ada SDK cloud; R2 murni lewat Wrangler CLI, Repliz murni lewat `fetch`.\n',
     '- Tidak ada SDK cloud; R2 murni lewat Wrangler CLI, Repliz dan Gemini TTS murni lewat `fetch`.\n'
     '- Tidak ada venv/dependency Python ter-commit; Supertonic dijalankan sekali pakai lewat `uv` (ADR-0023).\n')

edit('docs/initial-setup.md', '## Run HyperFrames\n', '''## Voice (TTS) — opsional

Untuk voiceover video generate ([ADR-0023](../internal/docs/adr/0023-voice-adapter-tts.md)):

```bash
brew install uv                       # Supertonic lokal berjalan lewat uv (Python 3.12, sekali pakai)
echo 'GEMINI_TTS_API_KEY=<key>' >> .env   # Gemini 3.8 Flash TTS; bukan GEMINI_API_KEY
npm run voice -- say --preset <p> --text "Halo semua." --out /tmp/voice-smoke
```

Panggilan Supertonic pertama mengunduh model ke `~/.cache/supertonic3` (±70 s).

## Run HyperFrames
''')
edit('docs/initial-setup.md', '- Wrangler via `npx wrangler` jika akan upload final render ke Cloudflare R2/Repliz.\n',
     '- Wrangler via `npx wrangler` jika akan upload final render ke Cloudflare R2/Repliz.\n'
     '- `uv` (opsional) untuk TTS lokal Supertonic; `GEMINI_TTS_API_KEY` (opsional) untuk TTS Gemini.\n')
print('task7 docs ok')
````

- [ ] **Step 7: Commit**

```bash
git add scripts/voice.mjs scripts/voice-cli.test.mjs package.json .github/workflows/ci.yml internal/docs/operations/runbook.md internal/docs/architecture/stack.md docs/initial-setup.md CLAUDE.md AGENTS.md
git commit -m "feat(voice): npm run voice (say, ref, clone, design, voices, test) + docs (ADR-0023)"
```

### Task 8: Music library and `npm run music`

**Files:**
- Create: `scripts/lib/music.mjs`, `scripts/music.mjs`, `scripts/music.test.mjs`
- Modify: `package.json`, `.github/workflows/ci.yml`, `internal/docs/operations/runbook.md`, `internal/docs/architecture/stack.md`, `CLAUDE.md`, `AGENTS.md`

**Interfaces:**
- Consumes: `loudnessArgs`, `parseLoudnorm` (`scripts/lib/cut-plan.mjs`), `probeDuration` (`scripts/video.mjs`).
- Produces: `MUSIC_DIR`, `LICENSES`, `MOODS`, `AUDIO_EXT`, `RISKS`, `readCatalog(root)`, `writeCatalog(root, catalog)`, `slugify`, `nextTrackId(tracks, title)`, `validateTrackInput(…)`, `proofText(track)`, `addTrack({ root, input, license, title, author, source, mood, energy, notes, loopable, contentIdRisk, proof, fetchImpl, run, now }) → track`, `listTracks(catalog, { mood, minDur, includeRejected })`, `checkCatalog(root) → string[]`, `findTrack`, `setRejected(root, id, rejected) → track`, `musicPath(root, id)`; CLI `main(argv, { root, fetchImpl, run, now, log })`, `formatTrack`. Studio (Task 9) uses `readCatalog`, `setRejected`, `musicPath`.

- [ ] **Step 1: Write the failing test**

Create `scripts/music.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MOODS, addTrack, checkCatalog, listTracks, musicPath, nextTrackId, readCatalog, setRejected, slugify } from './lib/music.mjs';
import { main } from './music.mjs';

function media() {
  return (cmd, args) => {
    if (cmd === 'ffprobe') return { status: 0, stdout: '93.5\n', stderr: '' };
    if (cmd === 'ffmpeg') return { status: 0, stdout: '', stderr: '{\n"input_i" : "-14.20",\n"input_tp" : "-1.00"\n}' };
    return { status: 1, stdout: '', stderr: 'unexpected' };
  };
}
const TRACK = { license: 'cc0', title: 'Quiet Desk', author: 'Someone', source: 'https://freesound.org/s/1/', mood: 'reflektif,tech-ringan', energy: '2' };

function musicRoot() {
  const root = mkdtempSync(join(tmpdir(), 'music-test-'));
  writeFileSync(join(root, 'track.mp3'), 'ID3 fake audio');
  return root;
}

test('ids and slugs', () => {
  assert.equal(slugify('Quiet Désk — Lo-Fi!'), 'quiet-desk-lo-fi');
  assert.equal(nextTrackId([], 'Quiet Desk'), 'm01-quiet-desk');
  assert.equal(nextTrackId([{ id: 'm07-x' }, { id: 'm02-y' }], 'Next'), 'm08-next');
  assert.deepEqual(MOODS, ['reflektif', 'tech-ringan', 'tensi', 'playful', 'sinematik', 'upbeat']);
});

test('addTrack stores a local file with probe, sha, and a license proof', async () => {
  const root = musicRoot();
  const t = await addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, run: media(), now: new Date('2026-09-29T10:00:00Z') });
  assert.deepEqual([t.id, t.file, t.duration, t.lufs, t.contentIdRisk, t.rejected, t.vocals, t.bpm], ['m01-quiet-desk', 'm01-quiet-desk.mp3', 93.5, -14.2, 'none', false, false, null]);
  assert.deepEqual(t.mood, ['reflektif', 'tech-ringan']);
  assert.equal(readFileSync(join(root, 'shared/music/licenses/m01-quiet-desk.txt'), 'utf8').split('\n')[3], 'license: cc0 (https://creativecommons.org/publicdomain/zero/1.0/)');
  assert.deepEqual(readCatalog(root).tracks.map((x) => x.id), ['m01-quiet-desk']);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, run: media() }), /same audio as m01-quiet-desk/);
  assert.deepEqual(readdirSync(join(root, 'shared/music')).filter((f) => f.includes('.part')), []);
});

test('addTrack refuses licenses outside the allowlist and bad input before writing anything', async () => {
  const root = musicRoot();
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, license: 'cc-by', run: media() }), /license "cc-by" is not allowed/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, mood: 'sedih', run: media() }), /--mood must be one or more of/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, energy: '9', run: media() }), /--energy must be an integer 1-5/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, source: 'freesound', run: media() }), /--source must be the http/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.flac'), ...TRACK, run: media() }), /audio must be/);
  assert.equal(existsSync(join(root, 'shared/music')), false);
});

test('addTrack downloads a URL; a failed download leaves no partial file', async () => {
  const root = musicRoot();
  const ok = async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('mp3 bytes').buffer });
  const t = await addTrack({ root, input: 'https://assets.mixkit.co/music/282/282.mp3', ...TRACK, license: 'mixkit', fetchImpl: ok, run: media() });
  assert.equal(t.contentIdRisk, 'unknown');
  assert.equal(readFileSync(join(root, 'shared/music/m01-quiet-desk.mp3'), 'utf8'), 'mp3 bytes');
  const blocked = async () => ({ ok: false, status: 403 });
  await assert.rejects(addTrack({ root, input: 'https://pixabay.com/x.mp3', ...TRACK, license: 'pixabay', title: 'Other', fetchImpl: blocked, run: media() }), /HTTP 403.*download it by hand/);
  assert.deepEqual(readdirSync(join(root, 'shared/music')).filter((f) => f.includes('.part')), []);
  assert.equal(readCatalog(root).tracks.length, 1);
});

test('list hides rejected tracks; check finds missing files, sha mismatches, and missing proofs', async () => {
  const root = musicRoot();
  await addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, run: media() });
  writeFileSync(join(root, 'b.mp3'), 'other audio');
  await addTrack({ root, input: join(root, 'b.mp3'), ...TRACK, title: 'Upbeat One', mood: 'upbeat', energy: '4', run: media() });
  setRejected(root, 'm02-upbeat-one', true);
  assert.deepEqual(listTracks(readCatalog(root)).map((t) => t.id), ['m01-quiet-desk']);
  assert.deepEqual(listTracks(readCatalog(root), { includeRejected: true, mood: 'upbeat' }).map((t) => t.id), ['m02-upbeat-one']);
  assert.deepEqual(listTracks(readCatalog(root), { minDur: 100 }), []);
  assert.deepEqual(checkCatalog(root), []);
  writeFileSync(join(root, 'shared/music/m01-quiet-desk.mp3'), 'changed');
  rmSync(join(root, 'shared/music/licenses/m02-upbeat-one.txt'));
  assert.deepEqual(checkCatalog(root), ['m01-quiet-desk: sha256 does not match m01-quiet-desk.mp3', 'm02-upbeat-one: license proof licenses/m02-upbeat-one.txt is missing']);
  assert.ok(musicPath(root, 'm01-quiet-desk').endsWith('m01-quiet-desk.mp3'));
  assert.throws(() => musicPath(root, 'nope'), /unknown track "nope"/);
});

test('music CLI add, list, check', async () => {
  const root = musicRoot();
  const logs = [];
  const log = (m) => logs.push(m);
  await main(['add', join(root, 'track.mp3'), '--source', TRACK.source, '--license', 'cc0', '--title', 'Quiet Desk', '--author', 'Someone', '--mood', 'reflektif', '--energy', '2'], { root, run: media(), log });
  assert.equal(logs.pop(), 'added m01-quiet-desk (93.5 s, -14.2 LUFS, cc0)');
  await main(['list'], { root, log });
  assert.deepEqual(logs.splice(0), ['m01-quiet-desk\treflektif\tE2\t93.5s\tcc0\tQuiet Desk — Someone', '1 track(s)']);
  await main(['check'], { root, log });
  assert.equal(logs.pop(), 'music check ok (1 tracks)');
  writeFileSync(join(root, 'shared/music/m01-quiet-desk.mp3'), 'x');
  await assert.rejects(main(['check'], { root, log }), /music check failed:\n- m01-quiet-desk: sha256 does not match/);
  await assert.rejects(main(['nope'], { root, log }), /usage: npm run music/);
});
```

- [ ] **Step 2: Wire the npm scripts and run the test to see it fail**

In `package.json`, replace
```json
    "test:voice": "node --test scripts/voice-*.test.mjs"
```
with
```json
    "test:voice": "node --test scripts/voice-*.test.mjs",
    "music": "node scripts/music.mjs",
    "test:music": "node --test scripts/music.test.mjs"
```
In `.github/workflows/ci.yml`, after `      - run: npm run test:voice` add `      - run: npm run test:music`.

Run: `npm run test:music`
Expected: FAIL — `Cannot find module '.../scripts/lib/music.mjs'`.

- [ ] **Step 3: Implement the catalog module**

Create `scripts/lib/music.mjs` (`slugify` strips combining marks after NFKD, so "Désk" becomes "desk"):

```js
// BGM library shared/music/ (ADR-0024, RD-06-18..22): license allowlist, catalog, add/list/check, reject flag.
// The one writer of shared/music/catalog.json, used by the music CLI and the Studio. Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { loudnessArgs, parseLoudnorm } from './cut-plan.mjs';
import { probeDuration } from '../video.mjs';

export const MUSIC_DIR = join('shared', 'music');
// Commercial use without attribution only. CC-BY, NC/ND, personal-use, and YouTube Audio Library are refused.
export const LICENSES = {
  cc0: { tier: 'A', url: 'https://creativecommons.org/publicdomain/zero/1.0/', contentIdRisk: 'none' },
  'public-domain': { tier: 'A', url: 'https://creativecommons.org/publicdomain/mark/1.0/', contentIdRisk: 'none' },
  pixabay: { tier: 'B', url: 'https://pixabay.com/service/license-summary/', contentIdRisk: 'unknown' },
  mixkit: { tier: 'B', url: 'https://mixkit.co/license/#musicFree', contentIdRisk: 'unknown' },
};
export const MOODS = ['reflektif', 'tech-ringan', 'tensi', 'playful', 'sinematik', 'upbeat'];
export const AUDIO_EXT = ['.mp3', '.ogg', '.wav', '.m4a'];
export const RISKS = ['none', 'unknown', 'known'];

const catalogFile = (root) => join(root, MUSIC_DIR, 'catalog.json');
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const isUrl = (s) => /^https?:\/\//i.test(String(s ?? ''));

export function readCatalog(root = '.') {
  const file = catalogFile(root);
  if (!existsSync(file)) return { version: 1, tracks: [] };
  const c = JSON.parse(readFileSync(file, 'utf8'));
  if (c?.version !== 1 || !Array.isArray(c.tracks)) throw new Error(`${file} is not a version 1 music catalog`);
  return c;
}

export function writeCatalog(root, catalog) {
  mkdirSync(join(root, MUSIC_DIR), { recursive: true });
  const file = catalogFile(root);
  writeFileSync(`${file}.part`, `${JSON.stringify(catalog, null, 2)}\n`);
  renameSync(`${file}.part`, file);
}

export const slugify = (s) => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'track';

export function nextTrackId(tracks, title) {
  const n = tracks.reduce((m, t) => Math.max(m, Number(/^m(\d+)-/.exec(t.id)?.[1] || 0)), 0) + 1;
  return `m${String(n).padStart(2, '0')}-${slugify(title)}`;
}

export function validateTrackInput({ license, title, author, source, mood, energy, contentIdRisk }) {
  if (!LICENSES[license]) throw new Error(`license "${license}" is not allowed (allowed: ${Object.keys(LICENSES).join(', ')}); CC-BY, NC/ND, personal-use, and YouTube Audio Library tracks are refused`);
  if (!String(title ?? '').trim()) throw new Error('--title is required');
  if (!String(author ?? '').trim()) throw new Error('--author is required');
  if (!isUrl(source)) throw new Error('--source must be the http(s) page of the track');
  const moods = String(mood ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  if (!moods.length || moods.some((m) => !MOODS.includes(m))) throw new Error(`--mood must be one or more of ${MOODS.join(', ')}`);
  const e = Number(energy);
  if (!Number.isInteger(e) || e < 1 || e > 5) throw new Error('--energy must be an integer 1-5');
  const risk = contentIdRisk ?? LICENSES[license].contentIdRisk;
  if (!RISKS.includes(risk)) throw new Error(`--content-id must be one of ${RISKS.join(', ')}`);
  return { moods, energy: e, risk };
}

export const proofText = (t) => [
  `title: ${t.title}`,
  `author: ${t.author}`,
  `source: ${t.sourceUrl}`,
  `license: ${t.license} (${LICENSES[t.license].url})`,
  `retrievedAt: ${t.retrievedAt}`,
  `sha256: ${t.sha256}`,
  '',
].join('\n');

export async function addTrack({ root = '.', input, license, title, author, source, mood, energy, notes = '', loopable = false, contentIdRisk, proof, fetchImpl = fetch, run = spawnSync, now = new Date() }) {
  const { moods, energy: e, risk } = validateTrackInput({ license, title, author, source, mood, energy, contentIdRisk });
  const ext = extname(isUrl(input) ? new URL(input).pathname : String(input ?? '')).toLowerCase();
  if (!AUDIO_EXT.includes(ext)) throw new Error(`audio must be ${AUDIO_EXT.join(' ')} (got "${ext || 'no extension'}")`);
  if (proof !== undefined && !existsSync(proof)) throw new Error(`${proof} not found`);
  const catalog = readCatalog(root);
  const id = nextTrackId(catalog.tracks, title);
  const dir = join(root, MUSIC_DIR);
  mkdirSync(join(dir, 'licenses'), { recursive: true });
  const file = join(dir, `${id}${ext}`);
  const part = join(dir, `.${id}.part${ext}`);
  try {
    if (isUrl(input)) {
      const res = await fetchImpl(input);
      if (!res.ok) throw new Error(`download failed (HTTP ${res.status}); download it by hand and run npm run music -- add <file> with the same flags`);
      writeFileSync(part, Buffer.from(await res.arrayBuffer()));
    } else {
      if (!existsSync(input)) throw new Error(`${input} not found`);
      copyFileSync(input, part);
    }
    const hash = sha256(part);
    const dup = catalog.tracks.find((t) => t.sha256 === hash);
    if (dup) throw new Error(`same audio as ${dup.id}; not adding it twice`);
    const duration = probeDuration(part, run);
    const r = run('ffmpeg', loudnessArgs(part), { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`ffmpeg could not read ${input}`);
    const track = {
      id, file: basename(file), title: title.trim(), author: author.trim(), sourceUrl: source, license,
      licenseProof: `licenses/${id}.txt`, retrievedAt: now.toISOString().slice(0, 10), sha256: hash,
      duration, lufs: parseLoudnorm(r.stderr), mood: moods, energy: e, bpm: null, vocals: false,
      loopable: Boolean(loopable), contentIdRisk: risk, rejected: false, notes: notes ?? '',
    };
    renameSync(part, file);
    writeFileSync(join(dir, track.licenseProof), proofText(track));
    if (proof !== undefined) {
      track.extraProof = `licenses/${id}-proof${extname(proof).toLowerCase()}`;
      copyFileSync(proof, join(dir, track.extraProof));
    }
    catalog.tracks.push(track);
    writeCatalog(root, catalog);
    return track;
  } catch (err) {
    rmSync(part, { force: true });
    throw err;
  }
}

export function listTracks(catalog, { mood, minDur, includeRejected = false } = {}) {
  return catalog.tracks.filter((t) => (includeRejected || !t.rejected) && (!mood || t.mood.includes(mood)) && (minDur === undefined || t.duration >= minDur));
}

export function checkCatalog(root = '.') {
  const dir = join(root, MUSIC_DIR);
  const problems = [];
  for (const t of readCatalog(root).tracks) {
    if (!LICENSES[t.license]) problems.push(`${t.id}: license "${t.license}" is not allowed`);
    if (!t.licenseProof || !existsSync(join(dir, t.licenseProof))) problems.push(`${t.id}: license proof ${t.licenseProof || '(none)'} is missing`);
    const f = join(dir, t.file);
    if (!existsSync(f)) problems.push(`${t.id}: ${t.file} is missing`);
    else if (sha256(f) !== t.sha256) problems.push(`${t.id}: sha256 does not match ${t.file}`);
  }
  return problems;
}

export function findTrack(catalog, id) {
  const t = catalog.tracks.find((x) => x.id === id);
  if (!t) throw new Error(`unknown track "${id}"`);
  return t;
}

export function setRejected(root, id, rejected) {
  const catalog = readCatalog(root);
  const t = findTrack(catalog, id);
  t.rejected = Boolean(rejected);
  writeCatalog(root, catalog);
  return t;
}

export function musicPath(root, id) {
  const t = findTrack(readCatalog(root), id);
  const f = join(root, MUSIC_DIR, t.file);
  if (!existsSync(f)) throw new Error(`${t.file} is missing`);
  return f;
}
```

- [ ] **Step 4: Implement the CLI**

Create `scripts/music.mjs`:

```js
#!/usr/bin/env node
// BGM library CLI (ADR-0024, RD-06-18..22). Spec: docs/superpowers/specs/2026-09-29-audio-foundation-design.md
// Usage: npm run music -- add <url|file> --source <page> --license <cc0|public-domain|pixabay|mixkit> --title <t> --author <a>
//                            --mood <m[,m]> --energy <1-5> [--notes <t>] [--loopable] [--content-id none|unknown|known] [--proof <file>]
//        npm run music -- list [--mood <m>] [--min-dur <s>] [--include-rejected]
//        npm run music -- check
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { addTrack, checkCatalog, listTracks, readCatalog } from './lib/music.mjs';

export const formatTrack = (t) => [
  t.id, t.mood.join(','), `E${t.energy}`, `${t.duration}s`,
  `${t.license}${t.contentIdRisk === 'none' ? '' : ` (Content ID: ${t.contentIdRisk})`}`,
  `${t.title} — ${t.author}${t.rejected ? ' [ditolak]' : ''}`,
].join('\t');

export async function main(argv, { root = '.', fetchImpl = fetch, run = spawnSync, now = new Date(), log = console.log } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      source: { type: 'string' }, license: { type: 'string' }, title: { type: 'string' }, author: { type: 'string' },
      mood: { type: 'string' }, energy: { type: 'string' }, notes: { type: 'string' }, loopable: { type: 'boolean', default: false },
      'content-id': { type: 'string' }, proof: { type: 'string' }, 'min-dur': { type: 'string' },
      'include-rejected': { type: 'boolean', default: false },
    },
  });
  const [cmd, input] = positionals;
  if (cmd === 'add') {
    if (!input) throw new Error('add needs <url|file>');
    const t = await addTrack({ root, input, license: values.license, title: values.title, author: values.author, source: values.source, mood: values.mood, energy: values.energy, notes: values.notes, loopable: values.loopable, contentIdRisk: values['content-id'], proof: values.proof, fetchImpl, run, now });
    log(`added ${t.id} (${t.duration} s, ${t.lufs} LUFS, ${t.license})`);
    return;
  }
  if (cmd === 'list') {
    const minDur = values['min-dur'] === undefined ? undefined : Number(values['min-dur']);
    const tracks = listTracks(readCatalog(root), { mood: values.mood, minDur, includeRejected: values['include-rejected'] });
    for (const t of tracks) log(formatTrack(t));
    log(`${tracks.length} track(s)`);
    return;
  }
  if (cmd === 'check') {
    const problems = checkCatalog(root);
    if (problems.length) throw new Error(`music check failed:\n- ${problems.join('\n- ')}`);
    log(`music check ok (${readCatalog(root).tracks.length} tracks)`);
    return;
  }
  throw new Error('usage: npm run music -- add <url|file> ... | list [--mood m] [--min-dur s] [--include-rejected] | check');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run the tests**

Run: `npm run test:music`
Expected: `ℹ pass 6`, `ℹ fail 0`.

- [ ] **Step 6: Update the operational docs**

Save as `/tmp/task8-docs.py` and run `python3 /tmp/task8-docs.py` from the repo root (expected `task8 docs ok`):

````python
# Task 8 docs: music CLI in runbook, stack, CLAUDE.md, AGENTS.md.
def edit(path, old, new, count=1):
    s = open(path).read()
    assert s.count(old) == count, f'{path}: expected {count} match(es) for {old[:60]!r}, got {s.count(old)}'
    open(path, 'w').write(s.replace(old, new))

MUSIC_CMDS = (
    'npm run music -- add <url|file> --source <page> --license cc0|public-domain|pixabay|mixkit --title <t> --author <a> --mood <m> --energy <1-5>  # BGM -> shared/music/ (ADR-0024)\n'
    'npm run music -- list [--mood <m>] [--min-dur <s>]       # BGM catalog (rejected tracks hidden)\n'
    'npm run music -- check                                   # files, sha256, license allowlist, license proofs\n'
    'npm run test:music             # unit test the music library\n'
)
for f in ('CLAUDE.md', 'AGENTS.md'):
    edit(f, 'npm run test:voice             # unit test the voice adapter and listening test\n', 'npm run test:voice             # unit test the voice adapter and listening test\n' + MUSIC_CMDS)

edit('internal/docs/operations/runbook.md', '## Troubleshooting cepat\n', '''## Musik (BGM)

Pustaka `shared/music/` ([ADR-0024](../adr/0024-music-library.md)): hanya `cc0`,
`public-domain`, `pixabay`, `mixkit`. Situs yang menolak unduhan otomatis → unduh manual,
lalu `add <file>` dengan argumen yang sama.

```bash
npm run music -- add <url|file> --source <halaman-track> --license cc0 --title "<judul>" --author "<pembuat>" --mood reflektif --energy 2 [--loopable] [--proof <file>]
npm run music -- list --mood upbeat --min-dur 60
npm run music -- check
```

## Troubleshooting cepat
''')
edit('internal/docs/operations/runbook.md', 'npm run test:voice          # node --test scripts/voice.test.mjs scripts/voice-test-run.test.mjs (adapter suara, uji dengar)\n',
     'npm run test:voice          # node --test scripts/voice.test.mjs scripts/voice-test-run.test.mjs (adapter suara, uji dengar)\nnpm run test:music          # node --test scripts/music.test.mjs (pustaka musik)\n')
edit('internal/docs/architecture/stack.md', '| whisper.cpp | Transkripsi audio → JSON word-level, lokal, offline |',
     '| Music library | Katalog BGM `shared/music/` dengan allowlist lisensi, sha256, loudness, bukti lisensi | `npm run music -- add\\|list\\|check` | `scripts/music.mjs`, `scripts/lib/music.mjs`, [ADR-0024](../adr/0024-music-library.md) |\n'
     '| whisper.cpp | Transkripsi audio → JSON word-level, lokal, offline |')
edit('internal/docs/architecture/stack.md', '- `npm run voice` → `node scripts/voice.mjs` (adapter suara, ADR-0023); `npm run test:voice`.\n',
     '- `npm run voice` → `node scripts/voice.mjs` (adapter suara, ADR-0023); `npm run test:voice`.\n'
     '- `npm run music` → `node scripts/music.mjs` (pustaka BGM, ADR-0024); `npm run test:music`.\n')
print('task8 docs ok')
````

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/music.mjs scripts/music.mjs scripts/music.test.mjs package.json .github/workflows/ci.yml internal/docs/operations/runbook.md internal/docs/architecture/stack.md CLAUDE.md AGENTS.md
git commit -m "feat(music): shared/music BGM catalog with license allowlist, npm run music (ADR-0024)"
```

### Task 9: Studio tabs Suara and Musik

**Files:**
- Create: `scripts/studio/voice-tests.mjs`, `scripts/studio/music.mjs`
- Modify: `scripts/studio/app.mjs`, `scripts/studio/http.mjs`, `scripts/studio/public/index.html`, `scripts/studio/public/app.js`, `scripts/studio/public/app.css`, `scripts/studio.test.mjs`, `internal/docs/architecture/stack.md`, `CLAUDE.md`, `AGENTS.md`

**Interfaces:**
- Consumes: `RUN_RE`, `TESTS_DIR`, `saveRatings` (Task 6); `readCatalog`, `setRejected`, `musicPath` (Task 8); `HttpError`, `sendFile`, `readJson`, `RAW` (existing Studio).
- Produces: routes `GET /api/voice-tests`, `GET /api/voice-tests/:run`, `GET /api/voice-tests/:run/files/:name` (only `A.wav`… and `ref.wav`), `POST /api/voice-tests/:run/ratings`, `GET /api/music`, `GET /api/music/:id/file`, `POST /api/music/:id/reject` `{ rejected: boolean }` (RD-05-18…20).

- [ ] **Step 1: Write the failing tests**

Append to the end of `scripts/studio.test.mjs` (it already imports `mkdirSync`, `mkdtempSync`, `readFileSync`, `writeFileSync`, `tmpdir`, `join`, and has `startApp`):

```js
function audioRoot() {
  const root = mkdtempSync(join(tmpdir(), 'studio-audio-'));
  const dir = join(root, 'shared/voice-tests/20260929-1430');
  mkdirSync(join(dir, 'samples'), { recursive: true });
  writeFileSync(join(dir, 'key.json'), JSON.stringify({ version: 1, run: '20260929-1430', seed: 7, labels: { A: { name: 'dena-clone' }, B: { name: 'supertonic:F2' } } }));
  writeFileSync(join(dir, 'samples/A.wav'), 'AAA');
  writeFileSync(join(dir, 'samples/B.wav'), 'BBB');
  writeFileSync(join(dir, 'ref.wav'), 'REF');
  writeFileSync(join(dir, 'script.md'), 'Halo semua.\n');
  mkdirSync(join(root, 'shared/voice-tests/not-a-run'), { recursive: true });
  mkdirSync(join(root, 'shared/music/licenses'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-quiet.mp3'), 'MP3');
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify({ version: 1, tracks: [{ id: 'm01-quiet', file: 'm01-quiet.mp3', title: 'Quiet', author: 'X', sourceUrl: 'https://freesound.org/s/1/', license: 'cc0', mood: ['reflektif'], energy: 2, duration: 90, contentIdRisk: 'none', rejected: false, notes: '' }] }));
  return root;
}

test('app voice-test routes serve samples and the reference only, and validate ratings', async (t) => {
  const root = audioRoot();
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  const list = await call('GET', '/api/voice-tests');
  assert.deepEqual(list.body, [{ id: '20260929-1430', labels: ['A', 'B'], hasRef: true, rated: false }]);
  const run = await call('GET', '/api/voice-tests/20260929-1430');
  assert.deepEqual([run.body.labels, run.body.script, run.body.ratings], [['A', 'B'], 'Halo semua.\n', null]);
  assert.doesNotMatch(JSON.stringify(run.body), /dena-clone|supertonic/);
  const a = await fetch(`${base}/api/voice-tests/20260929-1430/files/A.wav`);
  assert.deepEqual([a.status, a.headers.get('content-type'), await a.text()], [200, 'audio/wav', 'AAA']);
  assert.equal(await (await fetch(`${base}/api/voice-tests/20260929-1430/files/ref.wav`)).text(), 'REF');
  assert.equal((await fetch(`${base}/api/voice-tests/20260929-1430/files/key.json`)).status, 404);
  assert.equal((await fetch(`${base}/api/voice-tests/20260929-1430/files/Z.wav`)).status, 404);
  assert.equal((await call('GET', '/api/voice-tests/..%2Fx')).status, 400);
  assert.equal((await call('GET', '/api/voice-tests/20260101-0000')).status, 404);
  const saved = await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: { A: { natural: 4, note: 'hangat' }, B: { natural: 2 } } });
  assert.equal(saved.status, 200);
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'shared/voice-tests/20260929-1430/ratings.json'), 'utf8')).ratings.A, { natural: 4, pronunciation: null, register: null, similarity: null, endurance: null, note: 'hangat' });
  assert.equal((await call('GET', '/api/voice-tests')).body[0].rated, true);
  assert.equal((await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: { A: { natural: 6 } } })).status, 400);
  assert.equal((await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: { Z: {} } })).status, 400);
  assert.equal((await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: {} }, { origin: 'http://evil.example' })).status, 403);
});

test('app music routes list, serve, and reject tracks', async (t) => {
  const root = audioRoot();
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  assert.deepEqual((await call('GET', '/api/music')).body.map((m) => [m.id, m.rejected]), [['m01-quiet', false]]);
  const f = await fetch(`${base}/api/music/m01-quiet/file`);
  assert.deepEqual([f.status, f.headers.get('content-type'), await f.text()], [200, 'audio/mpeg', 'MP3']);
  assert.equal((await call('POST', '/api/music/m01-quiet/reject', { rejected: true })).body.rejected, true);
  assert.equal(JSON.parse(readFileSync(join(root, 'shared/music/catalog.json'), 'utf8')).tracks[0].rejected, true);
  assert.equal((await call('POST', '/api/music/m01-quiet/reject', { rejected: 'yes' })).status, 400);
  assert.equal((await call('POST', '/api/music/nope/reject', { rejected: true })).status, 404);
  assert.equal((await fetch(`${base}/api/music/nope/file`)).status, 404);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:studio`
Expected: FAIL — the two new tests get 404 for `/api/voice-tests` and `/api/music`.

- [ ] **Step 3: Implement the handlers**

Create `scripts/studio/voice-tests.mjs`:

```js
// Studio tab Suara: blind listening-test runs in shared/voice-tests/ (ADR-0023, RD-05-18/19).
// Only the samples and the reference are served; key.json (who is who) never leaves the server.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RUN_RE, TESTS_DIR, saveRatings } from '../lib/voice/test-run.mjs';
import { HttpError } from './http.mjs';

function runDir(root, id) {
  if (!RUN_RE.test(String(id))) throw new HttpError(400, 'invalid run id');
  const dir = join(root, TESTS_DIR, id);
  if (!existsSync(join(dir, 'key.json'))) throw new HttpError(404, `voice test ${id} not found`);
  return dir;
}

const labelsOf = (dir) => Object.keys(JSON.parse(readFileSync(join(dir, 'key.json'), 'utf8')).labels || {}).sort();
const readRatings = (dir) => {
  const f = join(dir, 'ratings.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};

export function listVoiceTests(root) {
  const base = join(root, TESTS_DIR);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((d) => RUN_RE.test(d) && existsSync(join(base, d, 'key.json')))
    .sort()
    .reverse()
    .map((id) => ({ id, labels: labelsOf(join(base, id)), hasRef: existsSync(join(base, id, 'ref.wav')), rated: existsSync(join(base, id, 'ratings.json')) }));
}

export function getVoiceTest(root, id) {
  const dir = runDir(root, id);
  const script = existsSync(join(dir, 'script.md')) ? readFileSync(join(dir, 'script.md'), 'utf8') : '';
  const saved = readRatings(dir);
  return { id, labels: labelsOf(dir), hasRef: existsSync(join(dir, 'ref.wav')), script, ratings: saved?.ratings ?? null, savedAt: saved?.savedAt ?? null };
}

export function voiceTestFile(root, id, name) {
  const dir = runDir(root, id);
  if (name === 'ref.wav') return join(dir, 'ref.wav');
  const m = /^([A-Z])\.wav$/.exec(String(name));
  if (!m || !labelsOf(dir).includes(m[1])) throw new HttpError(404, 'not found');
  return join(dir, 'samples', name);
}

export function saveVoiceRatings(root, id, body) {
  const dir = runDir(root, id);
  try {
    return saveRatings(dir, labelsOf(dir), body);
  } catch (e) {
    throw new HttpError(400, e.message);
  }
}
```

Create `scripts/studio/music.mjs`:

```js
// Studio tab Musik: the BGM catalog in shared/music/ (ADR-0024, RD-05-20). Writes go through scripts/lib/music.mjs.
import { musicPath, readCatalog, setRejected } from '../lib/music.mjs';
import { HttpError } from './http.mjs';

export const listMusic = (root) => readCatalog(root).tracks;

export function musicFile(root, id) {
  try {
    return musicPath(root, id);
  } catch (e) {
    throw new HttpError(404, e.message);
  }
}

export function rejectMusic(root, id, rejected) {
  if (typeof rejected !== 'boolean') throw new HttpError(400, 'rejected must be true or false');
  try {
    return setRejected(root, id, rejected);
  } catch (e) {
    throw new HttpError(404, e.message);
  }
}
```

- [ ] **Step 4: Register the routes and audio types**

In `scripts/studio/app.mjs`:
- change the first line to `// Studio routes (ADR-0020, ADR-0022, ADR-0023, ADR-0024, RD-05). Filesystem + tmux are the only state.`
- add `import { listMusic, musicFile, rejectMusic } from './music.mjs';` above `import { deleteShared, listShared, receiveShared } from './shared.mjs';`
- add `import { getVoiceTest, listVoiceTests, saveVoiceRatings, voiceTestFile } from './voice-tests.mjs';` below `import { VIEWER_RE } from './terminal.mjs';`
- insert these routes directly above `    ['GET', /^\/api\/results$/, async () => listResults(root)],`:

```js
    ['GET', /^\/api\/voice-tests$/, async () => listVoiceTests(root)],
    ['GET', /^\/api\/voice-tests\/([^/]+)$/, async (req, url, [id]) => getVoiceTest(root, id)],
    ['GET', /^\/api\/voice-tests\/([^/]+)\/files\/([^/]+)$/, async (req, url, [id, name], res) => {
      sendFile(req, res, voiceTestFile(root, id, name));
      return RAW;
    }],
    ['POST', /^\/api\/voice-tests\/([^/]+)\/ratings$/, async (req, url, [id]) => saveVoiceRatings(root, id, await readJson(req))],
    ['GET', /^\/api\/music$/, async () => listMusic(root)],
    ['GET', /^\/api\/music\/([^/]+)\/file$/, async (req, url, [id], res) => {
      sendFile(req, res, musicFile(root, id));
      return RAW;
    }],
    ['POST', /^\/api\/music\/([^/]+)\/reject$/, async (req, url, [id]) => rejectMusic(root, id, (await readJson(req)).rejected)],
```

In `scripts/studio/http.mjs`, add four entries at the end of `TYPES` (after `'.webp': 'image/webp',`):

```js
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
```

- [ ] **Step 5: Run the tests**

Run: `npm run test:studio`
Expected: `ℹ pass 32`, `ℹ fail 0`.

- [ ] **Step 6: Add the tabs to the UI**

In `scripts/studio/public/index.html`, add two nav buttons after `<button data-tab="results">Results</button>`:

```html
    <button data-tab="voice">Suara</button>
    <button data-tab="music">Musik</button>
```

and these sections after `<section id="tab-results" hidden><ul id="result-list" class="list"></ul></section>`:

```html
  <section id="tab-voice" hidden>
    <div id="voice-home"><ul id="voice-list" class="list"></ul></div>
    <div id="voice-detail" hidden>
      <div class="bar">
        <button id="voice-back">← Uji dengar</button>
        <strong id="voice-title"></strong>
      </div>
      <p class="muted">Dengarkan tiap sampel sekali lewat speaker HP dan sekali lewat headset. Nilai 1–5, kosongkan bila belum yakin. Nama suara baru dibuka setelah <code>npm run voice -- test reveal</code>.</p>
      <div id="voice-ref"></div>
      <ul id="voice-samples" class="list"></ul>
      <div class="bar"><button id="voice-save" class="primary">Simpan penilaian</button><span id="voice-saved" class="muted"></span></div>
    </div>
  </section>
  <section id="tab-music" hidden><ul id="music-list" class="list"></ul></section>
```

In `scripts/studio/public/app.js`:
- after `let openSlug = '';` add `let openRun = '';`
- in `showTab`, after `  if (name === 'projects' && tab === 'projects') openSlug = '';` add `  if (name === 'voice' && tab === 'voice') openRun = '';`
- in `showTab`, change the tab list to `['projects', 'shared', 'sessions', 'results', 'voice', 'music']`
- in `refresh`, after `    if (tab === 'results') renderResults(await api('/api/results'));` add:

```js
    if (tab === 'voice') {
      if (openRun) renderVoiceTest(await api(`/api/voice-tests/${enc(openRun)}`));
      else renderVoiceTests(await api('/api/voice-tests'));
    }
    if (tab === 'music') renderMusic(await api('/api/music'));
```

- insert this block directly above `// ---- Boot ----`:

```js
// ---- Voice test (blind; ADR-0023) ----
const CRITERIA = [
  ['natural', 'Natural (tidak robotik)'],
  ['pronunciation', 'Ucapan istilah Inggris & angka'],
  ['register', 'Cocok gaya Dena'],
  ['similarity', 'Mirip suara Dena'],
  ['endurance', 'Betah didengar 60 detik'],
];

function renderVoiceTests(runs) {
  $('#voice-home').hidden = false;
  $('#voice-detail').hidden = true;
  $('#voice-list').innerHTML = runs.length ? runs.map((r) => `
    <li>
      <div class="meta"><strong>${esc(r.id)}</strong><span class="muted">${r.labels.length} sampel${r.hasRef ? ' + referensi' : ''} · ${r.rated ? 'sudah dinilai' : 'belum dinilai'}</span></div>
      <div class="actions"><button class="primary" data-run="${esc(r.id)}">Buka</button></div>
    </li>`).join('') : '<li class="muted">Belum ada uji dengar. Jalankan <code>npm run voice -- test build</code>.</li>';
}

function scoreSelect(label, key, text, value) {
  const opts = [1, 2, 3, 4, 5].map((n) => `<option value="${n}"${value === n ? ' selected' : ''}>${n}</option>`).join('');
  return `<label>${esc(text)}<select data-label="${esc(label)}" data-key="${key}"><option value="">–</option>${opts}</select></label>`;
}

function renderVoiceTest(t) {
  $('#voice-home').hidden = true;
  $('#voice-detail').hidden = false;
  $('#voice-title').textContent = t.id;
  $('#voice-saved').textContent = t.savedAt ? `Tersimpan ${when(t.savedAt)}` : '';
  const files = `/api/voice-tests/${enc(t.id)}/files`;
  $('#voice-ref').innerHTML = t.hasRef ? `<p><strong>Referensi: suara asli Dena</strong></p><audio controls preload="none" src="${files}/ref.wav"></audio>` : '';
  const r = t.ratings || {};
  $('#voice-samples').innerHTML = t.labels.map((l) => `
    <li>
      <div class="meta"><strong>Sampel ${esc(l)}</strong></div>
      <audio controls preload="none" src="${files}/${enc(l)}.wav"></audio>
      <div class="scores">${CRITERIA.map(([k, text]) => scoreSelect(l, k, text, r[l]?.[k] ?? null)).join('')}</div>
      <label>Catatan<textarea data-label="${esc(l)}" data-key="note" rows="2" maxlength="1000">${esc(r[l]?.note || '')}</textarea></label>
    </li>`).join('');
}

$('#voice-list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-run]');
  if (!b) return;
  openRun = b.dataset.run;
  refresh();
});
$('#voice-back').addEventListener('click', () => {
  openRun = '';
  refresh();
});
$('#voice-save').addEventListener('click', async () => {
  const ratings = {};
  for (const el of document.querySelectorAll('#voice-samples [data-label]')) {
    const row = (ratings[el.dataset.label] ||= {});
    row[el.dataset.key] = el.dataset.key === 'note' ? el.value : (el.value ? Number(el.value) : null);
  }
  try {
    const saved = await post(`/api/voice-tests/${enc(openRun)}/ratings`, { ratings });
    $('#voice-saved').textContent = `Tersimpan ${when(saved.savedAt)}`;
  } catch (err) {
    banner(err.message);
  }
});

// ---- Music (ADR-0024) ----
function renderMusic(tracks) {
  $('#music-list').innerHTML = tracks.length ? tracks.map((t) => `
    <li class="${t.rejected ? 'rejected' : ''}">
      <div class="meta"><strong>${esc(t.title)}</strong>
        <span class="muted">${esc(t.author)} · ${esc(t.mood.join(', '))} · energi ${t.energy} · ${dur(t.duration)} · ${esc(t.license)}${t.contentIdRisk === 'none' ? '' : ` · Content ID: ${esc(t.contentIdRisk)}`}${t.rejected ? ' · ditolak' : ''}</span>
        ${t.notes ? `<span class="muted">${esc(t.notes)}</span>` : ''}</div>
      <audio controls preload="none" src="/api/music/${enc(t.id)}/file"></audio>
      <div class="actions">
        <button data-reject="${esc(t.id)}" data-value="${t.rejected ? 'false' : 'true'}" class="${t.rejected ? '' : 'danger'}">${t.rejected ? 'Batal tolak' : 'Tolak'}</button>
        <a class="btn" href="${esc(t.sourceUrl)}" target="_blank" rel="noopener">Sumber</a>
      </div>
    </li>`).join('') : '<li class="muted">Pustaka musik kosong. Tambah dengan <code>npm run music -- add</code>.</li>';
}

$('#music-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-reject]');
  if (!b) return;
  try {
    await post(`/api/music/${enc(b.dataset.reject)}/reject`, { rejected: b.dataset.value === 'true' });
    refresh();
  } catch (err) {
    banner(err.message);
  }
});
```

Append to `scripts/studio/public/app.css`:

```css
audio { width: 100%; }
.scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.list > li.rejected { opacity: .55; }
code { font-size: 13px; }
```

Run: `node --check scripts/studio/public/app.js && npm run test:studio`
Expected: no syntax error; `ℹ pass 32`.

- [ ] **Step 7: Update the docs**

Save as `/tmp/task9-docs.py` and run `python3 /tmp/task9-docs.py` from the repo root (expected `task9 docs ok`):

```python
# Task 9 docs: Studio tabs Suara + Musik.
def edit(path, old, new, count=1):
    s = open(path).read()
    assert s.count(old) == count, f'{path}: expected {count} match(es) for {old[:60]!r}, got {s.count(old)}'
    open(path, 'w').write(s.replace(old, new))

edit('internal/docs/architecture/stack.md', 'daftar render, publish Repliz | `npm run studio` |',
     'daftar render, publish Repliz, tab Suara (uji dengar blind) dan Musik (dengar/tolak BGM) | `npm run studio` |')
for f in ('CLAUDE.md', 'AGENTS.md'):
    edit(f, 'tmux agent sessions + terminal, renders, publish (long-running)', 'tmux agent sessions + terminal, renders, publish, voice test + music tabs (long-running)')
print('task9 docs ok')
```

- [ ] **Step 8: Commit**

```bash
git add scripts/studio scripts/studio.test.mjs internal/docs/architecture/stack.md CLAUDE.md AGENTS.md
git commit -m "feat(studio): Suara tab for blind voice ratings, Musik tab to listen and reject BGM (RD-05-18..20)"
```

### Task 10: End-to-end verification

**Files:** none changed unless a check fails (then fix in the owning task's files and note it in the commit).

- [ ] **Step 1: All suites**

Run: `npm run test:voice && npm run test:music && npm run test:studio && npm run test:video`
Expected: voice `pass 29`, music `pass 6`, studio `pass 32`, video `pass 37`, all `fail 0`.

- [ ] **Step 2: Real Supertonic voiceover (offline, free)**

Run: `npm run voice -- say --preset supertonic-f2 --file config/voice-test-script.md --out /tmp/voice-smoke/st`
Expected: `voiceover /tmp/voice-smoke/st/voiceover.wav (≈36 s, WER ≤ 0.1)`. The first run downloads the model (±70 s). Check the file: `ffprobe -v error -show_entries stream=sample_rate,channels -of csv=p=0 /tmp/voice-smoke/st/voiceover.wav` → `48000,1`. Run the same command again: it must finish in a few seconds (whisper only) with every paragraph `"cached": true` in `/tmp/voice-smoke/st/voice-meta.json`.

- [ ] **Step 3: Real Gemini voiceover (cents)**

Run: `npm run voice -- say --preset gemini-kore --text "Jujur, gue kira bikin AI agent itu gampang. Ternyata deploy workflow-nya yang bikin pusing." --out /tmp/voice-smoke/g`
Expected: `voiceover … (≈6-7 s, WER 0)`; `words.json` has 14 words, all `"matched": true`.
Run: `npm run voice -- voices --lang jv`
Expected: 8 `jv-id-concierge-*` lines and `8 of 2089 prebuilt voices` (the total may grow).

- [ ] **Step 4: Studio tabs by hand**

Make a throwaway run from the smoke outputs, then look at it in the Studio:

```bash
R=shared/voice-tests/20000101-0000 && mkdir -p $R/samples && cp /tmp/voice-smoke/st/voiceover.wav $R/samples/A.wav && cp /tmp/voice-smoke/g/voiceover.wav $R/samples/B.wav
printf '{"version":1,"run":"20000101-0000","seed":1,"labels":{"A":{"name":"supertonic-f2"},"B":{"name":"gemini-kore"}}}
' > $R/key.json
npm run studio   # run with run_in_background: true; open http://127.0.0.1:4777
```

Check on a narrow window (phone width): tab **Suara** lists `20000101-0000`; the run page plays A and B, shows five 1–5 selects per sample, "Simpan penilaian" writes `$R/ratings.json`; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4777/api/voice-tests/20000101-0000/files/key.json` prints `404`. Tab **Musik** shows the empty-state line. Then stop the Studio and `rm -rf shared/voice-tests/20000101-0000 /tmp/voice-smoke`.

- [ ] **Step 5: Review**

Use superpowers:requesting-code-review for the whole branch (Tasks 1–9) and fix what it finds before Task 11.

### Task 11: First real listening test with Dena

This task has human gates. Stop and wait at each "Ask Dena" step; do not create stored Google voices before step 3's answer.

**Files:**
- Modify: `config/voices.json` (`default`, and a preset for a winning screened voice), `config/pronunciation.json` (entries from Dena's notes), `config/voice-test.json` (only if Dena changes the pool), `config/voice-test-script.md` (only Dena's edits), `internal/docs/adr/0023-voice-adapter-tts.md` (section "Hasil uji dengar")
- Local only (gitignored): `shared/voices/{dena,designed-a,designed-b}/`, `shared/voice-tests/<run>/`

- [ ] **Step 1: Ask Dena — billing tier.** Explain: on the Gemini free tier, inputs (her voice sample and consent clip included) may be used by Google to improve products; on the paid tier they are not; cost ≈ USD 0.0135 per audio minute. Ask whether billing is on for the key's project, or whether she accepts the free-tier terms. Wait.
- [ ] **Step 2: Ask Dena — voice characters.** Ask for two short descriptions for the designed voices (language `id-ID`; age range, warmth, tempo, Jakarta register; gender only if she states it — never infer it from her name), and whether the Gemini stock pool in `config/voice-test.json` should keep both female and male voices. Edit the pool only as she says.
- [ ] **Step 3: Reference clip.** Find a clean 15–25 s stretch of Dena alone speaking in a take under `shared/` (use an existing `videos/*/transcripts/*.json` to locate calm, music-free speech). Propose file + start time to Dena, then run `npm run voice -- ref --from shared/<take> --at <s> --dur <s>`; share `shared/voices/dena/ref.txt` and ask her to listen to `ref.wav`. Redo until she approves.
- [ ] **Step 4: Consent clip.** Ask Dena to record, in her own voice, exactly: "Saya pemilik suara ini dan saya menyetujui Google menggunakan suara ini untuk membuat model suara sintetis." (phone voice memo is fine) and to put it in `shared/` (Studio Shared upload, or AirDrop). Then run `npm run voice -- clone --consent shared/<file>`. Expected: `cloned voice voice_… -> shared/voices/dena/voice.json`.
- [ ] **Step 5: Voice designs.** Run `npm run voice -- design --name designed-a --prompt "<description 1>"` and the same for `designed-b`. Offer Dena the previews `shared/voices/designed-*/sample.wav`.
- [ ] **Step 6: Test script.** Show Dena `config/voice-test-script.md`; apply her edits.
- [ ] **Step 7: Build.** Run `npm run voice -- test build` (with `run_in_background: true`; ±5–10 minutes). Expected last line: `listening test shared/voice-tests/<run>: samples A B C D E F G + reference; rate them in Studio …`. If a screened voice failed, `screen.json` shows why; the run still has the other candidates.
- [ ] **Step 8: Ask Dena to rate.** Start the Studio if it is not running; ask Dena to open tab **Suara** on her phone, rate every sample (speaker once, headset once), and tell you when she has saved. Wait.
- [ ] **Step 9: Reveal and decide.** Run `npm run voice -- test reveal <run>`; show Dena the ranking and `reveal.md`. Ask which voice becomes the default (the top score, or the clone if similarity matters more to her). Wait.
- [ ] **Step 10: Record the decision.**
  - If the winner is a screened voice (e.g. `gemini:puck`, `supertonic:M2`), add a preset for it to `config/voices.json` with the pool's `base` fields and that `voice`.
  - Set `"default"` in `config/voices.json` to the chosen preset name.
  - Add lexicon entries to `config/pronunciation.json` for every misread term in Dena's notes (`only` the provider that misread it).
  - Replace the body of "## Hasil uji dengar" in ADR-0023 with: run id, the table's top three (label, candidate, score, similarity, WER), Dena's choice and her reason, and lexicon entries added.
  - Run `npm run test:voice` (still `pass 29`), then commit:

```bash
git add config/voices.json config/pronunciation.json config/voice-test.json config/voice-test-script.md internal/docs/adr/0023-voice-adapter-tts.md
git commit -m "docs(voice): first listening test result, default voice preset (ADR-0023)"
```

### Task 12: Curate the first BGM set with Dena

**Files:** local only (`shared/music/`, gitignored). Commit only if a docs learning comes out of it (then update `internal/docs/operations/runbook.md`).

- [ ] **Step 1: Find candidates.** Look for ≈15 instrumental tracks (no vocals), ≥ 60 s or loopable, 2–3 per mood (`reflektif`, `tech-ringan`, `tensi`, `playful`, `sinematik`, `upbeat`), in this order of preference: Freesound (license filter "Creative Commons 0"; the `-hq.mp3` preview is the download), OpenGameArt (CC0 music), Free Music Archive (CC0 only), Mixkit (`assets.mixkit.co/music/<n>/<n>.mp3`, license `mixkit`). Read each track page's license yourself; skip anything CC-BY, NC, ND, "personal use", or unclear.
- [ ] **Step 2: Add them.** For each track: `npm run music -- add <url> --source <track page> --license <id> --title "<title>" --author "<author>" --mood <m> --energy <1-5> [--loopable] [--notes "<where the strong part is>"]`. For Pixabay tracks Dena wants, ask her to download them by hand into `shared/`, then `add shared/<file>` with `--license pixabay`.
- [ ] **Step 3: Check.** Run `npm run music -- check` → `music check ok (N tracks)`; `npm run music -- list` shows every mood at least twice.
- [ ] **Step 4: Ask Dena to review** in Studio tab **Musik** on her phone and reject what she dislikes. Replace rejected tracks until each mood has at least two kept tracks, then run `npm run music -- check` again.
- [ ] **Step 5: Report** the kept tracks per mood (id, title, license, Content ID risk) to Dena.
