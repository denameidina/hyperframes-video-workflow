# Mode Generate — Format Tanpa Narasi: kinetic-post dan motion-short — Design

Status: approved 2026-09-29 (sub-proyek 4 dari "generate video motion design")
Date: 2026-09-29

## Latar belakang

Sub-proyek 2 (ADR-0025) membangun mode generate format **explainer**: naskah + TTS
sebagai sumbu waktu, tiga gate, BGM ter-duck. Sub-proyek 3 (ADR-0026) menambahkan tab
Generate di Studio (form + panel review gate) dan `gates.json` / `npm run video -- gate`.
Dekomposisi induk (`docs/superpowers/specs/2026-09-29-audio-foundation-design.md`)
menjadwalkan sub-proyek 4 sebagai **format tanpa narasi, timing dari beat musik**.

## Keputusan yang sudah diambil

- **Dua format berbeda**, keduanya tanpa suara narasi dan dipotong di beat musik:
  - **kinetic-post** — 8–20 detik, tipografi kinetik satu ide / kutipan / hook, loop.
  - **motion-short** — 15–40 detik, cerita motion graphic pendek 3–6 scene (teks + objek +
    angka) dari menu style.
- **Dua gate**: Gate 1 = teks layar + musik + storyboard sekaligus; Gate 2 = render.
- **Teks ditulis agent, bisa dikunci**: form Studio punya kolom opsional "Teks persis";
  bila diisi, kata-katanya dipakai apa adanya (agent hanya memecah per ketukan dan
  memilih kata yang ditekan).
- **Akhir video**: kinetic-post loop mulus (frame terakhir menyambung ke frame pertama),
  CTA hanya di caption publish; motion-short ditutup kartu CTA singkat tanpa janji.
- **Pendekatan A**: memperluas mode generate yang ada dengan `format`; bukan workflow
  upstream `/music-to-video`, bukan "explainer bisu" tiga gate.
- **Analyzer sendiri**: skill `/music-to-video` yang terpasang tidak membawa berkas lisensi,
  jadi kodenya tidak disalin; repo menulis analyzer kecil sendiri (librosa lewat `uv`).
- Di luar cakupan: product-promo (sub-proyek 5), lagu bervokal, birama selain 4/4, suara
  asli Dena di kinetic-post.

## 1. Data dan perintah

### Format proyek

- `creative-brief.md` `## Workflow Settings`: `- format: explainer | kinetic-post |
  motion-short` di bawah `- mode: generate`. Tanpa baris `format` = `explainer` (proyek
  lama tidak berubah). Nilai lain → error yang menyebut `creative-brief.md`.
- `research/request.json` mendapat `format` dan `text` (Teks persis atau `null`).
- `npm run video -- new <slug> --generate [--format kinetic-post|motion-short]`: brief stub
  menulis `format`; untuk format musik starter tanpa elemen `<audio id="bgm-audio">` (musik
  adalah `processed-audio.wav`).
- Modul bersama: `scripts/lib/formats.mjs` — `FORMATS`, `readFormat(dir)`,
  `isMusicFormat(format)`, rentang durasi `{ explainer: [30, 90], 'kinetic-post': [8, 20],
  'motion-short': [15, 40] }`, dan gate terakhir per format (explainer 3, musik 2).

### Analyzer — `scripts/lib/music/beats.py`

Sidecar Python lewat `uv run --python 3.12 --with librosa==1.0.0 --with soundfile==0.14.0`
(pola Supertonic, ADR-0023; tidak ada yang dipasang ke repo). Spike 2026-09-29: API
`librosa.beat.beat_track` 1.0.0 sama seperti 0.10 (keyword-only); `tempo` kembali sebagai array
(`[123.05]` untuk `m05-hazy-after-hours`). Input: berkas audio; output
JSON ke stdout:

```json
{ "version": 1, "meter": "4/4", "bpm": 118.4, "duration": 127.2, "beats": [0.51, 1.02], "downbeats": [0.51, 2.54], "beatEnergy": [0.42, 0.37] }
```

- Tempo + beat: `librosa.beat.beat_track` di atas onset strength (hop 512, sr 22050).
- Downbeat: fase 0–3 yang memaksimalkan jumlah onset strength di setiap beat ke-4
  (asumsi 4/4, dicatat sebagai `meter`).
- `beatEnergy`: RMS rata-rata per beat, dinormalisasi 0–1.
- Deterministik: tanpa sampling acak.

Hasil analisis di-cache di `shared/music/beats/<track-id>.json` bersama `sha256` berkas
lagu; sha berbeda atau cache rusak → dianalisis ulang.

### `npm run video -- music <slug> --track <id> [--from <s>] --bars <n>`

1. Menolak bila proyek bukan mode generate, format-nya `explainer` (explainer memakai
   `video bgm`), lagu tidak dikenal atau `rejected`, `--bars` kosong (pesan menyebut jumlah
   bar yang masuk rentang format pada tempo lagu itu), atau `--from` melewati lagu.
2. Titik mulai = downbeat pertama ≥ `--from` (default 0). Titik akhir = downbeat ke-`n`
   sesudahnya (atau akhir bar ke-`n` dihitung dari periode bar bila downbeat habis).
   Durasi harus dalam rentang format; di luar rentang → error dengan rentang `--bars` yang
   pas.
3. Potong dengan ffmpeg ke `processed-audio.wav` (48 kHz), loudness −16 LUFS (sama dengan
   jalur voice/cut):
   - kinetic-post: fade in dan fade out 20 ms (sambungan loop jatuh di batas bar, tanpa
     klik);
   - motion-short: fade in 20 ms, fade out sepanjang bar terakhir.
4. Tulis `beats.json` (waktu video, 0 = titik mulai):

   ```json
   { "version": 1, "track": "m05-hazy-after-hours", "file": "m05-hazy-after-hours.mp3", "sha256": "…", "meter": "4/4", "bpm": 118.4, "from": 12.34, "bars": 8, "duration": 16.2, "loop": true,
     "beats": [0, 0.507], "downbeats": [0, 2.03], "barList": [{ "n": 1, "start": 0, "end": 2.03, "energy": 0.41 }] }
   ```

5. Sesuaikan `data-duration` setiap elemen `data-voice-duration` di `index.html`
   (`syncDuration`, seperti `video voice`).

Semua berkas ditulis sebagai `.part` lalu rename; gagal → berkas lama tidak disentuh.
Proses anak (uv, ffmpeg) berjalan tanpa `GEMINI_API_KEY` / `GEMINI_TTS_API_KEY`.

`video voice` dan `video bgm` menolak proyek format musik.

### Gate per format — `scripts/lib/gates.mjs`

| Format | Gate | Sidik jari |
| --- | --- | --- |
| explainer | 1 naskah + suara, 2 storyboard, 3 render (tidak berubah) | tidak berubah |
| kinetic-post, motion-short | 1 teks + musik + storyboard | `script.md`, `processed-audio.wav`, semua `preview/storyboard-sheet*.jpg`, `storyboard.md` |
| | 2 render | `renders/<slug>.mp4` |

Urutan fase format musik: `story` (tanpa `script.md` atau `processed-audio.wav`) →
`screen-plan` (tanpa storyboard sheet) → Gate 1 → `build` (tanpa render) → Gate 2 → `done`.
`voiceStale` hanya untuk explainer. `qa` dan pesan Studio "video selesai; jangan publish"
berlaku di **gate terakhir** format itu (explainer 3, musik 2). `gateStatus` mengembalikan
`format` dan `finalGate`.

### Storyboard sheet

Baris scene `overlay-timeline.json` format musik membawa `text` (teks layar scene itu);
`video storyboard` memakai `text` bila ada, selain itu kata terucap dari
`processed-transcript.json` (explainer, tidak berubah).

## 2. Alur kerja agent (`docs/agents/references/generate-mode.md`)

### Story (format musik)

1. Riset seperti explainer. Teks persis di `request.json` wajib dipakai apa adanya.
2. `script.md` = teks layar (bukan narasi): satu baris per ketukan / kelompok ketukan;
   `## Fakta` tetap wajib untuk angka, nama, harga, hasil, atau kutipan.
   - kinetic-post: satu ide, 10–30 kata; kata puncak di downbeat; baris terakhir menyambung
     ke baris pertama.
   - motion-short: 3–6 scene, maksimal 8 kata per tampilan; scene terakhir kartu CTA tanpa
     janji.
3. Musik: pilih lagu katalog (mood `upbeat`, `playful`, `tech-ringan`), lalu
   `npm run video -- music <slug> --track <id> --from <s> --bars <n>`. Kecepatan baca ≈ satu
   kata/frasa per ketukan; bila terlalu cepat, pilih lagu lebih lambat — jangan memadatkan
   teks.
4. Tidak ada `video voice`, tidak ada `processed-transcript.json`.

### Screen Plan (format musik)

- Tidak ada caption rail, tidak ada `caption-beats.json` (teks layar adalah isinya);
  `publish-captions.md` tetap ditulis, CTA kinetic-post ada di sana.
- Scene mengikuti bar (`beats.json`): setiap baris teks masuk tepat di beat; pergantian scene
  dan kata puncak di downbeat.
- Style: kinetic-post biasanya `broll-text` (boleh satu aksen); motion-short memakai style
  world seperti explainer (1 utama + maksimal 2 aksen).
- `storyboard.md`: `| # | bars | time | on-screen text | style / pattern | what appears | example |`;
  baris `overlay-timeline.json` membawa `text`; `npm run video -- storyboard <slug>`.
- **Gate 1** (teks + musik + storyboard) — selalu berhenti.

### Build (format musik)

- Musik (`processed-audio.wav`) di track 10, satu-satunya audio utama: tanpa `video bgm`,
  tanpa ducking.
- SFX jarang, hanya aksen yang tidak ada di musik.
- kinetic-post: frame terakhir = keadaan frame pertama (loop tak terlihat), tanpa fade ke
  hitam. motion-short: kartu CTA di bar terakhir, musik fade-out.
- Render → **Gate 2**. Agent tidak publish.

### QA (format musik)

Tambahan di `qa-checklist.md` bagian Generate Mode: kinetic-post frame pertama dan terakhir
sama; setiap perubahan teks jatuh di beat (±1 frame, `beats.json`); tidak ada teks yang
tampil kurang dari 0,4 detik; tidak ada caption rail.

## 3. Studio

### Form

- Pilihan **Format** di atas (default explainer). Menyesuaikan isian:
  - durasi: explainer 30–90, kinetic-post 8–20, motion-short 15–40, atau otomatis;
  - preset suara hanya untuk explainer (diisi untuk format musik → 400);
  - **Teks persis** (opsional, maksimal 1000 karakter) hanya untuk format musik (diisi untuk
    explainer → 400);
  - musik untuk semua format.
- `request.json` mendapat `format` dan `text`; `new --generate --format` dipakai saat
  scaffold. Prompt agent menyebut format dan merujuk aturan format di `generate-mode.md`.

### Daftar dan panel

- Kartu proyek menampilkan format ("kinetic-post · Menunggu Gate 1").
- Gate 1 format musik: pemutar musik (`processed-audio.wav`), info tempo dari `beats.json`
  (BPM, bar, durasi, lagu), teks layar per baris (`## Fakta` dilipat), storyboard sheet dan
  kartu scene (bar + waktu + teks).
- Gate 2 format musik: pemutar render, "Deviations From Plan" / "Handoff Risks", tombol
  Revisi, **QA dulu**, Setuju.
- "Edit naskah" dan "Buat ulang suara" hanya di explainer.
- Tidak ada rute baru: `GET /api/generate/<slug>` mendapat `format`, `finalGate`, dan `beats`;
  daftar putih `/media` tidak berubah.

## 4. Error, keamanan, tes, dokumen

### Error

Lihat bagian 1 (`video music`, format tidak dikenal, cache). `video voice` / `video bgm`
menolak format musik dengan pesan yang menyebut perintah yang benar.

### Keamanan

Analyzer dan ffmpeg tanpa kunci Gemini; jaringan hanya dipakai `uv` saat memasang librosa
pertama kali. Studio: penjaga yang sama, tidak ada rute baru.

### Tes (`node:test`, tanpa uv / ffmpeg / tmux sungguhan)

- Perhitungan musik (snap downbeat, n bar, rentang durasi, `beats.json`, loop vs fade-out).
- `video music` dengan analyzer + ffmpeg palsu, cache, gagal → berkas lama utuh.
- `gates.mjs` per format (urutan fase, gate terakhir, `qa`), `formats.mjs`.
- Studio: validasi form per format, detail Gate 1 format musik, pesan gate terakhir.
- Storyboard tile memakai `text`.
- Uji sungguhan: analyzer asli pada `m05-hazy-after-hours` (BPM dan downbeat masuk akal).

### Dokumen

- ADR-0027 (format musik: musik sebagai sumbu waktu, dua gate).
- Kriteria baru: RD-03-94… (format, alur, gate), RD-06-29… (`video music`, analyzer, cache),
  RD-05-30… (form + panel per format).
- `generate-mode.md`, `qa-checklist.md`, `data-model.md` (`format`, `beats.json`,
  `request.json`), `CLAUDE.md` / `AGENTS.md` (perintah), indeks `internal/docs/README.md`.

### Video uji

Setelah implementasi: satu kinetic-post sungguhan dibuat dari Studio bersama Dena (Gate 1
dan Gate 2), seperti `ai-agent-gagal` untuk explainer; topik dipilih Dena saat itu.
