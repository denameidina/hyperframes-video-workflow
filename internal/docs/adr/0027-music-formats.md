# ADR-0027 Mode generate: format tanpa narasi (kinetic-post, motion-short)
Status: accepted
Date: 2026-09-29

## Context

Mode generate (ADR-0025) hanya punya format explainer: naskah + TTS sebagai sumbu waktu,
tiga gate. Dekomposisi induk menjadwalkan format tanpa narasi yang timing-nya dari beat
musik: tipografi kinetik pendek dan motion graphic pendek untuk IG/TikTok.

## Decision

- **`format` di `creative-brief.md`** (`explainer` | `kinetic-post` | `motion-short`;
  tanpa baris = `format` di `research/request.json`, lalu explainer; keduanya berbeda atau
  nilai tak dikenal = error, tidak pernah menebak). `scripts/lib/formats.mjs` memegang daftar, rentang durasi
  (30–90 / 8–20 / 15–40 detik), dan gate terakhir per format.
- **Musik sebagai sumbu waktu.** `npm run video -- music` menganalisis lagu katalog sekali
  (sidecar librosa lewat `uv`, di-cache per sha256), memotong bar utuh dari downbeat ke
  `processed-audio.wav` (−16 LUFS), dan menulis `beats.json` (BPM, beat, downbeat 4/4, bar).
  Tanpa TTS, tanpa BGM terpisah, tanpa ducking. Downbeat = fase (dari 4) dengan onset pita
  rendah (kick, < 200 Hz) terkuat: pada 18 lagu katalog onset pita penuh hampir rata antar
  fase (rasio 1,00–1,36), pita rendah jauh lebih tegas dan cocok dengan awal lagu loop
  (m16). Rasio < 1,25 → `video music` memperingatkan agar potongan didengar dulu.
- **Dua gate**: Gate 1 = teks layar + musik + storyboard; Gate 2 = render. `gates.mjs`
  format-aware; `qa` dan pesan "jangan publish" di gate terakhir format.
- **Teks ditulis agent, bisa dikunci** lewat "Teks persis" di form Studio.
- **Akhir**: kinetic-post loop mulus (CTA di caption publish); motion-short kartu CTA di bar
  terakhir.
- Analyzer ditulis sendiri: skill upstream `/music-to-video` tidak membawa berkas lisensi.

## Consequences

- Proyek lama (tanpa baris `format`) tetap explainer.
- `video voice` / `video bgm` menolak format musik; `video music` menolak explainer.
- Birama diasumsikan 4/4 (tercatat di `beats.json`); lagu bervokal di luar cakupan.

## Alternatives

- **Workflow upstream `/music-to-video`**: di luar workflow 4 fase, style kit, gate, dan
  panel Studio.
- **"Explainer bisu" tiga gate**: bertentangan dengan pilihan dua gate dan memaksa langkah
  suara yang tidak ada.
