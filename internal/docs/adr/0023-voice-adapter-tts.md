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
  `sha256(provider, model, voice, style, speed, language, teks ternormalisasi)` (Supertonic:
  `model` = versi paket ter-pin), trim hening tepi,
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
