# Mode Generate — Format Explainer (Brief, URL, Repurpose) — Design

Status: approved 2026-09-29 (sub-proyek 2 dari "generate video motion design"; plan docs/superpowers/plans/2026-09-29-generate-mode-explainer.md)
Date: 2026-09-29

## Latar belakang

Sub-proyek 1 (`docs/superpowers/specs/2026-09-29-audio-foundation-design.md`,
ADR-0023/0024) membangun adapter suara (`npm run voice`), uji dengar, dan pustaka
musik (`npm run music`). Default suara sementara: `supertonic-f2`; ronde Gemini
masih tertunda karena kuota free tier.

Workflow 4 fase (ADR-0008) masih sepenuhnya bertumpu pada footage Dena:
Story memotong `processed.mp4`, Screen Plan menaruh caption dan b-roll di atasnya,
Build memasang base video. Sub-proyek ini menambahkan **mode generate** untuk format
**explainer**: video 30–90 detik yang seluruh visualnya motion design dari tujuh
style yang ada, dengan narasi TTS. Input: topik/brief, URL/artikel/thread, atau
repurpose video lama.

Pendekatan yang disetujui: **bagian "Mode generate" di tiap dokumen fase + satu
reference `docs/agents/references/generate-mode.md`**, ditambah tooling kecil
(`video new --generate`, `video voice`, `video bgm`, `video storyboard`). Bukan
dokumen fase terpisah, bukan orkestrator satu perintah.

## Keputusan yang sudah diambil

- **Repurpose = tulis ulang + TTS.** Isi video lama menjadi bahan naskah baru; suara
  dari TTS, bukan potongan audio asli.
- **Caption hybrid.** Setiap kata voiceover punya beat caption; beat yang jatuh di
  scene yang sudah menampilkan kata yang sama disembunyikan dari rail.
- **Storyboard Gate 2 = sheet contoh style.** Tabel scene + contact sheet dari still
  contoh style (bukan animatic).
- **Durasi ditentukan agent** per topik dalam 30–90 detik; alasannya di brief.
- **Voiceover tidak dipercepat 1,2x.** Tempo ditentukan preset (Supertonic `speed`,
  arahan tempo di `style` Gemini); tidak ada `atempo` pasca-sintesis.
- Dari brainstorm induk: tiga gate (naskah + suara → storyboard → render), satu style
  utama + 1–2 aksen, BGM dari `shared/music/`.

## 1. Fase Story (mode generate)

### Pemicu dan layout

`npm run video -- new <slug> --generate` membuat project dari starter
`templates/dena-generate/` dan menulis `creative-brief.md` awal dengan
`mode: generate` di `## Workflow Settings` (default proyek lain tetap `edit`).
Menolak bila `videos/<slug>/` sudah ada.

```
videos/<slug>/
  research/brief.md           # brief Dena, verbatim
  research/NN-<domain>.md     # per URL: url, retrievedAt, kutipan relevan, apa yang bisa di-capture
  research/repurpose.md       # project sumber + path transkripnya (bila repurpose)
  script.md                   # naskah (paragraf = beat), ## Fakta
  voice/                      # output renderVoice: voiceover.wav, voice-meta.json, words.json, cache/
  processed-audio.wav         # salinan voice/voiceover.wav (konvensi audio Build)
  processed-transcript.json   # skema sama dengan jalur edit (segments + words)
  creative-brief.md, metadata.json, edit-decision-notes.md
```

Tidak ada `processed.mp4`, `cut-list.json`, `cut-map.json`, atau `sources.json`
berisi speech di mode generate.

### Langkah

1. **Kumpulkan bahan ke `research/`.** Brief disalin verbatim. URL/artikel/thread
   diambil lalu diringkas (URL, tanggal ambil, kutipan yang dipakai, elemen yang layak
   di-capture untuk `vox`). Repurpose: slug sumber dan path `processed-transcript.json`
   atau `transcripts/<id>.json`-nya.
2. **Arahkan.** Decision Workflow `hook-and-angle.md` (lane, premis, audiens,
   emotional promise, retention spine, format `explainer`, grammar visual, CTA).
   Target durasi 30–90 s dengan alasan. Anggaran kata ±2,7 kata/detik
   (30 s ≈ 80 kata, 90 s ≈ 240 kata).
3. **Tulis `script.md`.**
   - Satu paragraf per beat cerita; register Dena (gue/lo, jujur, ternyata); istilah
     Inggris boleh; tag inline Gemini boleh (`<short pause>` dan lain-lain).
   - **Paragraf pertama = hook**: lolos uji stop-scroll (kata pembuka menarik tanpa
     suara) dan uji tonton-sampai-akhir (open loop yang payoff-nya jatuh di akhir).
   - `## Fakta`: setiap angka, nama, harga, hasil, atau kutipan di naskah punya sumber
     (`research/brief.md`, `research/NN-*.md`, atau transkrip sumber repurpose). Tidak
     ada fakta atau kutipan karangan; tidak mengatributkan kutipan ke orang nyata tanpa
     sumber.
   - CTA non-promissory kecuali Dena menyetujui janjinya.
4. **Buat suara.** `npm run video -- voice <slug> [--preset <p>]` (default:
   `config/voices.json` `default`). Menulis `voice/…`, `processed-audio.wav`, dan
   `processed-transcript.json` (segments = paragraf, words = `words.json`). Peringatan
   WER → perbaiki naskah atau leksikon, jalankan ulang (paragraf yang tidak berubah
   dari cache).
5. **Gate 1 — naskah + suara (wajib di mode generate).** Berhenti; Dena membaca
   `script.md` dan mendengar `processed-audio.wav`. Revisi = edit naskah → `video voice`
   lagi. Lanjut hanya setelah disetujui.
6. **Tulis brief dan catatan.** Template brief versi generate (§ Template di
   `generate-mode.md`): `## Source` berisi bahan research; `## Hook` berstatus
   `scripted` dengan teks hook, `hook_end` = `paragraphs[0].end` dari
   `voice/voice-meta.json`, open loop, dan payoff (timestamp output); `## Voice` berisi
   preset, provider, model; `## Workflow Settings` berisi `mode: generate` dan
   `visual_density`. `metadata.json` mencatat `mode: "generate"` dan durasi.
   `edit-decision-notes.md` diakhiri `## Script Summary`:

   ```md
   ## Script Summary

   - Hook (output 00:00.00-<hook_end>): "<paragraf 1>"
   - Open loop -> payoff: <pertanyaan> -> <output mm:ss.s, kalimat penutup loop>
   - Duration: <mm:ss> (<n> paragraf, <n> kata), preset <p> (<provider>/<model>)
   - Alignment: WER <x>; kata yang meleset: <daftar atau "none">
   - Facts: see script.md ## Fakta (<n> fakta, semua bersumber)
   ```

### Yang tidak berlaku di mode generate

- Kecepatan default 1,2x (lihat Keputusan).
- Hook verbatim dari transkrip → hook = paragraf pertama naskah yang disetujui Dena.
- Cut, retake, Source Inventory speech, `video cut`.
- Aturan wajah (Gate 2 R3/R4).

## 2. Fase Screen Plan (mode generate)

### Caption (hybrid)

Mengikuti `captions.md` dan `caption-artifacts.md`, dengan penyesuaian:

- Setiap kata voiceover (`processed-transcript.json` words) punya beat caption.
- Beat yang jatuh di dalam scene yang sudah menampilkan kata yang sama (kinetic
  text, quote) mendapat field baru `"rail": "hidden"`: tetap tercatat, tidak dirender
  di rail. Default `rail` = `"shown"` (field boleh tidak ada).
- Hook card memakai kata-kata paragraf 1 untuk jendela `00:00.00-<hook_end>` dari
  `creative-brief.md` (bukan `cut-list.json`).
- `publish-captions.md` tidak berubah.

### Visual: style world dan scene penuh

1. **Style world** — `## Style World` di `visual-plan.md`: satu style utama + palet
   (preset `.sk-pal-*` dari `## Look` style itu), maksimal 2 style aksen, dengan
   alasan; rujuk moodboard dan sheet asset-lib seperti sekarang. `mix-media` dan
   `parallax-stage` tidak tersedia (keduanya butuh footage Dena).
2. **Scene** — voiceover dipecah menjadi scene 2–8 s, satu ide/kalimat per scene,
   batas di jeda antarkalimat (`words.json`). Scene menutup `0 … durasi voiceover`
   tanpa celah dan tanpa tumpang tindih (kecuali overlap transisi 0,2–0,4 s).
3. **Baris Timeline** — setiap scene satu baris dengan Style B-roll Brief yang sama
   (style, pola, `Beats on words`, SFX, transisi masuk), treatment baru **`full`**, dan
   field baru `Example:` = id contoh style terdekat (misalnya `wb-03-mind-map`) untuk
   storyboard. Di `overlay-timeline.json` baris scene punya `type` = style, `track` 4
   atau 7 (bergantian), `placement: "full"`, dan `example`.
4. **Aturan scene**
   - Setiap scene berkembang sepanjang durasinya; tidak diam setelah animasi masuk.
   - Style aksen total maksimal ±30% durasi video.
   - Dua scene berurutan boleh satu style, tapi polanya harus berbeda kecuali satu
     sekuens (papan yang sama berlanjut, seri bernomor).
   - Tidak berlaku: "2 s wajah di antara cutaway", batas cutaway ≤ 10 s, batas 3 tipe
     per video (diganti aturan style world).
5. **Musik** — `## Music` di `visual-plan.md`: satu track dari
   `npm run music -- list --mood <mood>` (yang tidak ditolak), titik mulai (`from`),
   dan alasan. SFX tetap wajib seperti mode edit.
6. **Storyboard + Gate 2 (selalu berhenti di mode generate)**
   - `storyboard.md`: tabel `# | waktu | kalimat | style/pola | apa yang muncul | example`.
   - `npm run video -- storyboard <slug>` → `preview/storyboard-sheet.jpg`.
   - Pemicu R1, R2, R5, R6 tetap dicek (R1 memakai `script.md ## Fakta` dan
     `research/` sebagai sumber); R3 dan R4 tidak berlaku.
   - Dena menyetujui arah visual (style world, scene, musik) sebelum Build; hasilnya di
     `## Gate 2 Result`.

## 3. Fase Build (mode generate) dan tooling

### Starter `templates/dena-generate/index.html`

- Tanpa `processed.mp4` dan base video. Lapisan bawah `.bg-fill` dengan warna latar
  style world (`--sk-bg`), diisi Build.
- `data-duration` = durasi `processed-audio.wav` (voiceover).
- Audio: `#voice-audio` (`processed-audio.wav`, track 10) dan `#bgm-audio`
  (`bgm.wav`, track 9), terpisah dan bisa diedit.
- Scene: mount `broll` bergantian di track **4 dan 7** agar transisi bisa overlap
  0,2–0,4 s tanpa bentrok di satu track.
- Rail caption (track 2/8), hook/CTA card (track 5), progress bar (track 3) sama
  dengan starter edit. Beat `rail: "hidden"` tidak dibuatkan elemen.
- Vendor sama (GSAP, motion-kit, style-kit, paper-pack, asset-lib).

### `npm run video -- voice <slug> [--preset <p>]`

Membaca `script.md` (`scriptBody`), memanggil `renderVoice` ke `videos/<slug>/voice/`,
lalu menulis `processed-audio.wav` (salinan `voice/voiceover.wav`) dan
`processed-transcript.json`:

```json
{
  "source": "voice/voiceover.wav",
  "model": "<provider>/<model>/<voice>",
  "language": "id",
  "note": "generate mode: words from words.json (script spelling, whisper DTW times)",
  "segments": [{ "start": 0, "end": 6.62, "text": "<paragraf 1>" }],
  "words": [{ "start": 0.18, "end": 1.02, "text": "Jujur," }]
}
```

Gagal bila `script.md` tidak ada (menunjuk fase Story). Peringatan WER dicetak, tidak
menghentikan.

### `npm run video -- bgm <slug> --track <id> [--from <s>]`

- Menolak track `rejected`, lisensi di luar allowlist ADR-0024, atau yang gagal
  `music check`; gagal bila `processed-audio.wav` belum ada ("jalankan video voice dulu").
- Satu panggilan ffmpeg: potong mulai `--from`; bila track lebih pendek dari video,
  loop dengan crossfade 1 s; fade in 0,5 s dan fade out 1,5 s tepat di akhir; gain ke
  ±−30 LUFS; `sidechaincompress` dengan voiceover sebagai key (turun ±8–10 dB saat
  narasi; attack ±20 ms, release ±400 ms).
- Output `bgm.wav` (48 kHz stereo) dan `bgm.json`
  `{ version: 1, track, file, sha256, from, duration, gainDb, duck: { threshold, ratio, attack, release } }`.
- Deterministik: menjalankan ulang dengan input sama menghasilkan file yang sama.

### `npm run video -- storyboard <slug>`

- Membaca baris scene (`placement: "full"`) dari `overlay-timeline.json`; gagal
  dengan daftar baris yang tidak punya `example`.
- Untuk tiap `example`: host time still = offset klip di host `style-examples/<style>`
  + still pertama klip (dari `examples.json`, lewat `scripts/lib/style-examples.mjs`);
  still di-render sekali dengan `hyperframes snapshot` ke cache
  `renders/storyboard-cache/<style>/<clip>.png` (tanpa `GEMINI_API_KEY`).
- Grid ffmpeg (kolom 4) dengan label per tile: nomor scene, waktu, potongan kalimat
  (maks ±40 karakter), font OFL dari `vendor/asset-lib/fonts/`.
  Output `preview/storyboard-sheet.jpg`.

### Langkah Build

Sama dengan mode edit, dengan perbedaan:

1. Readiness memeriksa artefak generate (bukan `processed.mp4`).
2. `npm run video -- bgm <slug> --track <id> --from <s>` sesuai `## Music` sebelum
   merakit.
3. Aset per scene: asset-lib dulu, capture (vox) atau Codex hanya bila perlu.
4. Satu klip `SK.clip` per scene sesuai Build Recipe style-nya, mount di track 4/7,
   Still Check, `video check`, render, **Gate 3** (tidak berubah).

### Perbaikan alignment (hutang sub-proyek 1)

`alignWords` menormalisasi per paragraf dengan peta offset ke kata naskah, sehingga
ungkapan yang terpisah spasi ("Rp 2.500", "2,5 jt", "50 %") bertemu bentuk ucapannya.
Timing kata tetap per kata naskah; WER tidak lagi naik palsu. (Tercatat di ADR-0023.)

## 4. Error handling

| Kondisi | Perilaku |
| --- | --- |
| `video new --generate` pada slug yang sudah ada | ditolak |
| `video voice` tanpa `script.md` | gagal, menunjuk fase Story |
| WER alignment > 0,10 | peringatan (kata yang meleset), tidak menghentikan |
| `video bgm` sebelum `processed-audio.wav` ada | gagal: "jalankan video voice dulu" |
| Track BGM `rejected`, lisensi di luar allowlist, sha tidak cocok | ditolak |
| `video storyboard` dengan scene tanpa `example` | gagal, menyebut baris-barisnya |
| Still contoh tidak bisa di-render | gagal, menyebut style + klip |

## Dokumentasi yang berubah

- **ADR-0025** mode generate format explainer (keputusan di atas).
- **RD-03-75…** kriteria EARS alur generate (Story, Screen Plan, Build, gate, starter,
  storyboard); **RD-06-23…** `video voice` dan `video bgm`.
- `docs/agents/01-story.md`, `02-screen-plan.md`, `03-build.md`: bagian
  "Mode generate" yang merujuk `docs/agents/references/generate-mode.md` (baru).
- `docs/skills/dena-video-editing-workflow/SKILL.md` (router + handoff generate),
  `docs/dena-social-video-style-guide.md` dan non-negotiables di `CLAUDE.md` /
  `AGENTS.md` (versi generate: hook = paragraf 1, tanpa 1,2x, caption hybrid).
- `internal/docs/architecture/data-model.md` (`script.md`, `research/`,
  `storyboard.md`, `bgm.json`, `processed-transcript.json` versi generate,
  `overlay-timeline.json` `example`/`placement: "full"`, caption beat `rail`),
  `design-system/visual-system.md` (track 7 dan 9 di mode generate),
  `frontend/composition-implementation.md` (starter generate),
  `operations/video-editing-workflow.md`, `operations/runbook.md`, README index.

## Test

- `npm run test:video`: `new --generate` (starter, durasi dari `processed-audio.wav`,
  tolak slug yang ada); `voice` (skema `processed-transcript.json`,
  `processed-audio.wav`, error tanpa `script.md`); `bgm` (argumen ffmpeg loop/trim,
  fade, gain, sidechain; penolakan track; `bgm.json`); `storyboard` (host time still,
  grid + label, error tanpa `example`, cache).
- `npm run test:voice`: alignment per paragraf ("Rp 2.500", "2,5 jt", "50 %", kata
  hilang/tambahan tetap benar).
- Smoke nyata: project generate kecil (satu scene contoh + voiceover Supertonic +
  BGM dari pustaka) lolos `video check` dan render pendek.

## Urutan pengerjaan

1. Dokumen dulu: ADR-0025, RD-03-75…, RD-06-23…, `generate-mode.md`, bagian fase,
   data model.
2. Perbaikan alignment per paragraf (TDD).
3. Starter `dena-generate` + `video new --generate`.
4. `video voice`.
5. `video bgm`.
6. `video storyboard`.
7. Router/skill/style guide/CLAUDE.md/AGENTS.md + runbook.
8. Smoke nyata + review kode.
9. **Satu video explainer nyata bersama Dena**: brief/topik dari Dena → Gate 1
   (naskah + suara `supertonic-f2`) → Gate 2 (storyboard) → Gate 3 (render) sampai
   disetujui atau revisinya di-route ke fase pemiliknya.

**Definition of Done:** semua suite hijau; dokumen tersinkron di commit yang sama;
satu explainer nyata melewati tiga gate bersama Dena.

## Di luar scope

- Form "Generate video" dan panel review di Studio — sub-proyek 3.
- Format motion-short dan kinetic-post (timing dari beat musik, BPM) — sub-proyek 4.
- Product-promo (capture/rekaman UI produk) — sub-proyek 5.
- Ronde Gemini uji dengar dan pemilihan default final — lanjutan sub-proyek 1.
- Suara asli Dena untuk repurpose (provider `recorded`) — tidak dipilih.

## Amandemen saat planning (2026-09-29, hasil spike)

Semua butir di bawah diverifikasi di salinan repo sebelum plan
`docs/superpowers/plans/2026-09-29-generate-mode-explainer.md` ditulis. Smoke nyata
(`new --generate` → `voice` Supertonic → `bgm` → `storyboard` → dua scene contoh →
lint/validate bersih → render 1080×1920, audio −16,1 LUFS) lulus.

1. **ffmpeg lokal tanpa `drawtext`** (build Homebrew tanpa libfreetype). Storyboard sheet
   dirakit sebagai halaman HTML (grid still + label, font OFL Plus Jakarta Sans dari
   asset-lib) lalu di-snapshot `hyperframes snapshot`, dan PNG-nya dikonversi ke JPG.
   Area label per tile 104 px.
2. **Still contoh** memakai hasil `npm run check:style-examples -- <style>` yang sudah ada
   di `renders/style-examples/<style>/frame-NN-at-<t>s.png` (bukan cache terpisah
   `renders/storyboard-cache/`); gaya yang still-nya belum ada di-render sekali.
3. **Narasi `script.md` berakhir di section `## ` pertama** (`scriptBody`): `## Fakta` dan
   catatan lain tidak pernah dibacakan TTS; baris judul `# ` dibuang; `#1`/`#AI` tetap.
4. **Alignment per kelompok kata** (maksimal 3 kata; perluasan dua kata hanya bila
   pasangan itu sendiri tidak berubah bentuk ucapannya). Timing di dalam kelompok dibagi
   rata. Pada voiceover F2 naskah uji, WER turun 0,043 → 0,021.
5. **`video voice` membaca `.env` dengan `parseEnv`** ke salinan env-nya sendiri; `process.env`
   dan proses anak HyperFrames tidak berubah.
6. **Penanda `data-voice-duration`**: `video voice` mengisi `data-duration` elemen bertanda
   (di luar komentar HTML); tween progress membaca `data-duration` root lewat DOM.
7. **`video new --generate` tetap menulis `sources.json` kosong**, supaya gambar/B-roll Dena
   bisa dilampirkan (Studio membaca manifest yang sama).
8. **`example` sebaiknya contoh bertreatment `cutaway`** (full frame): contoh `split`/`panel`
   menampilkan wajah placeholder di sheet.
9. **`inspect` bisa melaporkan overflow dari klip contoh** (lapisan kamera `wb-01-flow` lebih
   besar dari frame). Itu urusan klip per scene di Build (perbaiki, atau tandai
   `data-layout-allow-overflow` bila disengaja); starter generate sendiri bersih.
10. **BGM:** `apad` di kedua input + `atrim` akhir membuat `sidechaincompress` berhenti tepat
    di durasi voiceover dan hasilnya identik antar-run (tanpa itu durasinya berubah-ubah).
    Ducking terukur ±8 dB (−30,2 → −37,8 LUFS pada voiceover 35 s).
11. **Test:** `scripts/generate-lib.test.mjs` (fungsi murni) dan `scripts/generate.test.mjs`
    (CLI) masuk `npm run test:video`.
12. **Nomor kriteria:** RD-03-75…RD-03-87 dan RD-06-23…RD-06-28 (+ rumusan RD-06-02).
