# ADR-0025 Mode generate: video explainer motion design dari naskah + TTS
Status: accepted
Date: 2026-09-29

## Context

Workflow 4 fase (ADR-0008) hanya mengedit footage Dena: Story memotong
`processed.mp4`, Screen Plan menaruh caption dan b-roll di atasnya, Build memasang base
video. Dena ingin Claude/Codex juga menghasilkan video motion design dari tujuh style yang
ada (ADR-0012…0015), tanpa footage, dari topik/brief, URL/artikel/thread, atau repurpose
video lama. Sub-proyek 1 (ADR-0023/0024) menyediakan adapter suara dan pustaka musik.

## Decision

- **Mode di dalam workflow yang sama.** `creative-brief.md` `## Workflow Settings` punya
  `mode: generate` (default `edit`); tiap dokumen fase punya bagian "Mode generate" yang
  merujuk `docs/agents/references/generate-mode.md`. Tidak ada dokumen fase terpisah, tidak
  ada orkestrator satu perintah.
- **Naskah + TTS adalah sumbu waktu.** Story menulis `script.md` (paragraf 1 = hook,
  `## Fakta` bersumber), lalu `npm run video -- voice <slug>` menghasilkan
  `processed-audio.wav` dan `processed-transcript.json` dengan skema jalur edit, sehingga
  caption dan Build memakai konvensi yang sama. Repurpose = tulis ulang + TTS.
- **Tanpa percepatan.** Voiceover generate diputar pada tempo preset; 1,2x dan `atempo`
  tidak berlaku.
- **Gate 1 wajib** (naskah + suara) dan **Gate 2 selalu berhenti** dengan storyboard sheet
  (`npm run video -- storyboard <slug>`: still contoh style per scene, dirakit di HTML dan
  di-snapshot HyperFrames karena ffmpeg lokal tanpa `drawtext`).
- **Caption hybrid:** setiap kata punya beat; beat di scene yang sudah menampilkan kata itu
  diberi `"rail": "hidden"`.
- **Style world + scene penuh:** satu style utama + palet, maksimal 2 aksen (±30% durasi),
  scene 2–8 s menutup setiap detik, treatment `full`, field `example`.
- **Starter `templates/dena-generate/`** (`video new <slug> --generate`): tanpa base video,
  voiceover di track 10, BGM di track 9, scene bergantian di track 4 dan 7, elemen bertanda
  `data-voice-duration` diselaraskan `video voice`.
- **BGM:** `npm run video -- bgm <slug> --track <id> [--from <s>]` memotong/meloop track
  `shared/music/`, fade, −30 LUFS, lalu ducking `sidechaincompress` dengan voiceover sebagai
  key → `bgm.wav` deterministik + `bgm.json`.

## Consequences

- Video generate tidak punya `processed.mp4`, `cut-list.json`, `cut-map.json`; `mix-media`
  dan `parallax-stage` tidak tersedia; aturan wajah (R3/R4) tidak berlaku.
- `video voice` membaca `.env` ke salinan env-nya sendiri (`parseEnv`), bukan ke
  `process.env`, supaya proses anak HyperFrames tidak mewarisi key.
- Alignment kata dinormalisasi per kelompok kata ("Rp 2.500", "2,5 jt", "50 %"); timing
  di dalam kelompok dibagi rata.
- Storyboard sheet memakai still contoh (look), bukan isi asli; isi asli baru terlihat di
  render Gate 3.

## Referensi

- Spec: `docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md`
- Kriteria: [RD-03-75…RD-03-87](../requirements/rd-03-video-editing-workflow.md),
  [RD-06-23…RD-06-28](../requirements/rd-06-audio.md)
- Kode: `scripts/lib/generate.mjs`, `scripts/lib/bgm.mjs`, `scripts/lib/storyboard.mjs`,
  `templates/dena-generate/`
