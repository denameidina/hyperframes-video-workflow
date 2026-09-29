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
- **RD-06-02** (Event-driven) — When adapter menyintesis naskah, the adapter shall mengambil
  narasi (teks sebelum section `## ` pertama, tanpa baris judul `# ` dan komentar HTML),
  memecah paragraf di baris kosong lalu menormalisasi tiap paragraf (bilangan, desimal, rupiah +
  `rb/jt/M/T`, persen, `Nx`, `ke-N`, rentang `a-b`, leksikon `config/pronunciation.json`
  dengan `only` per provider; istilah huruf kecil juga cocok dengan bentuk berhuruf kapital
  di awal kalimat) sebelum dikirim ke provider; `words.json` dan
  `voice-meta.json` memakai teks naskah.
- **RD-06-03** (Event-driven) — When WAV paragraf dengan kunci
  `sha256(provider, model, voice, style, speed, language, teks ternormalisasi)` sudah ada di
  `<out>/cache/`, the adapter shall memakainya tanpa memanggil provider. Untuk Supertonic,
  `model` diisi versi paket yang di-pin (`supertonic==1.3.1`).
- **RD-06-04** (Ubiquitous) — `voiceover.wav` shall berupa WAV 48 kHz mono: tiap paragraf
  di-trim hening tepi (−50 dB), disambung dengan jeda 0,35 s, lalu satu pass gain ke
  −16 LUFS (clamp ±20 dB) dengan limiter 0,84.
- **RD-06-05** (Unwanted) — If provider gagal, then the adapter shall berhenti dengan pesan
  provider itu, tidak memakai provider lain, dan tidak menulis `voiceover.wav`.
- **RD-06-06** (Event-driven) — When Gemini menjawab 429 atau 5xx, gagal di jaringan, atau
  tidak menjawab dalam 120 s pada sintesis, the adapter shall mencoba ulang maksimal 3 kali
  dengan jeda 1, 2, 4 s — atau selama yang diminta Gemini (`Retry-After` / "retry in Ns"),
  maksimal 60 s — dan pesan akhirnya menyebut `Gemini <method> <path>`; status 4xx lain
  gagal tanpa retry, dan pembuatan voice (`POST /v1beta/voices`) tidak pernah di-retry.
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
- **RD-06-13** (Ubiquitous) — Rekaman referensi/consent dan `voice.json` (id suara pribadi)
  shall disimpan di `shared/voices/<name>/` (gitignored); file ter-track seperti
  `config/voices.json` hanya merujuknya lewat `voiceRef`. Id yang tercatat di output kerja
  (`voice-meta.json`, `key.json`) berada di folder yang di-ignore.

## Uji dengar

- **RD-06-14** (Event-driven) — When `voice test build` dijalankan, the CLI shall menyaring
  tiap pool di `config/voice-test.json` pada paragraf pertama naskah uji berdasarkan WER,
  mengambil `keep` terbaik per pool (WER seri dipecah dengan urutan voice di config, bukan
  abjad), dan menambahkan preset yang dinamai config sebagai kandidat; pool voice yang gagal
  dicatat di `screen.json` dan dilewati. `--only <provider>` membatasi preset dan pool ke satu
  provider, `--keep <n>` menimpa `keep` semua pool; keduanya tercatat di `key.json.filter`.
- **RD-06-15** (Ubiquitous) — Setiap sampel uji dengar shall dibuat lewat adapter yang sama
  (normalisasi dan −16 LUFS yang sama) dan diberi label A… dalam urutan acak ber-seed yang
  hanya tercatat di `key.json`; folder kerja per kandidat (`work/`) dihapus setelah sampel
  disalin.
- **RD-06-16** (Unwanted) — If `voiceRef` preset kandidat tidak ada, `GEMINI_TTS_API_KEY`
  kosong padahal ada preset/pool Gemini, binary atau model whisper.cpp tidak ada, `uv` tidak
  ada padahal ada pool Supertonic, `keep` bukan bilangan bulat ≥ 1, atau config menghasilkan
  lebih dari 26 kandidat, then `test build` shall berhenti sebelum sintesis pertama dan
  menyebut semua masalahnya.
- **RD-06-17** (Event-driven) — When `voice test reveal <run>` dijalankan, the CLI shall
  mengurutkan kandidat berdasarkan rata-rata natural, ucapan, gaya, betah (1–5) dan
  melaporkan kemiripan, WER, USD/menit, catatan Dena, dan hasil saringan WER tiap pool di
  `reveal.md`.

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

## Mode generate (ADR-0025)

- **RD-06-23** (Event-driven) — When `npm run video -- voice <slug>` dijalankan, the CLI
  shall membaca narasi `script.md`, menyintesisnya dengan `--preset` atau `default` di
  `config/voices.json` lewat `renderVoice` ke `voice/`, lalu menulis `processed-audio.wav`
  dan `processed-transcript.json` (`segments` = paragraf, `words` = `words.json`, kata
  terakhir paragraf berakhir paling lambat di akhir paragrafnya, bukan di jeda) dengan
  skema jalur edit.
- **RD-06-24** (Event-driven) — When `index.html` ada, `video voice` shall mengisi
  `data-duration` setiap elemen bertanda `data-voice-duration` (di luar komentar HTML)
  dengan durasi voiceover.
- **RD-06-25** (Unwanted) — If project bukan mode generate (`creative-brief.md` tanpa
  `mode: generate`, atau ada `processed.mp4`), `script.md` tidak ada, tidak ada preset
  (`--preset` kosong dan `default` null), atau preset-nya `recorded`, then `video voice`
  shall gagal sebelum sintesis dan menyebut langkah yang perlu dilakukan; proses anaknya
  berjalan tanpa `GEMINI_API_KEY`/`GEMINI_TTS_API_KEY`.
- **RD-06-26** (Event-driven) — When `npm run video -- bgm <slug> --track <id> [--from <s>]`
  dijalankan, the CLI shall memotong track mulai `from`, meloop-nya dengan crossfade 1 s
  bila lebih pendek dari voiceover, fade in 0,5 s dan fade out 1,5 s, mengatur loudness ke
  −30 LUFS (gain dijepit −30…+20 dB), dan men-duck-nya di bawah `processed-audio.wav`
  dengan `sidechaincompress` (threshold 0,05, ratio 8, attack 20 ms, release 400 ms), lalu
  menulis `bgm.wav` (48 kHz stereo, tepat sepanjang voiceover) dan `bgm.json`.
- **RD-06-27** (Unwanted) — If `processed-audio.wav` tidak ada, atau track-nya `rejected`,
  lisensinya di luar allowlist, atau gagal `music check`, then `video bgm` shall gagal
  tanpa menulis `bgm.wav`.
- **RD-06-28** (Ubiquitous) — `video bgm` shall deterministik: input yang sama menghasilkan
  `bgm.wav` yang identik byte per byte.
- **RD-06-29** (Unwanted) — If proyeknya berformat `kinetic-post` atau `motion-short`, then
  `video voice` dan `video bgm` shall gagal dengan pesan yang menyebut
  `npm run video -- music` (ADR-0027).

## Referensi

- Studio (tab Suara, Musik): [rd-05-studio](rd-05-studio.md) RD-05-18…20
- Transkripsi: [rd-04-transcription-setup](rd-04-transcription-setup.md)
