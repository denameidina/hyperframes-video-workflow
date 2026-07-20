# Video Editing Workflow (7 Agent)
Status: operating standard
Date: 2026-07-20

Kanonik untuk: cara operasional menjalankan produksi video Dena via 7 agent.
Aturan/kriteria: [rd-03](../requirements/rd-03-video-editing-workflow.md);
keputusan: [ADR-0005](../adr/0005-seven-agent-workflow-discipline.md). Sumber
detail tetap `docs/agents/01..07-*.md` dan
`docs/skills/dena-video-editing-workflow/SKILL.md` (router).

## Urutan

01 Creative Director → 02 Transcript/Cut → 03 Caption/Subtitle → 04 Asset
Generation → 05 Motion/Overlay → 06 HyperFrames Assembly → (07 QA/Review,
opsional di gate review). Jangan lompat ke assembly sebelum hulu selesai/ditandai
tak perlu. Slug per video: `videos/<slug>/`.

## Ikhtisar per agent

### 01 Creative Director
Lapisan keputusan sebelum edit teknis (tidak cut/generate/assembly/render).
Baca style guide + request. **Output:** `creative-brief.md` (content lane,
premis, audience, hook utama + cadangan, struktur retensi, arah visual/caption,
kebutuhan aset, CTA, risiko). Content lane (pilih 1 primer): `ai-systems`,
`developer-craft`, `founder-operator`, `journey-reflection`, `family-vlog`,
`viral-character`. Hook: `callout|contrast|mistake|proof|mission|plot-twist` —
3 detik pertama harus jalan tanpa audio. CTA non-promissory.

### 02 Transcript/Cut
Raw → base editorial bersih. Baca brief dulu. **Output wajib:** `metadata.json`,
`transcript.json`, `edit-decision-notes.md`, `cut-list.json`. Kondisional:
`audio-clean.wav`, `processed.mp4`, `preview/*`. Audit media pakai
`ffprobe`/`ffmpeg volumedetect`/`silencedetect=noise=-34dB:d=0.35`. Transkrip
pakai whisper lokal. Cut berbasis amplitudo, bukan word-level. **Kecepatan
default 1.2x** (1.12–1.18x bila sumber cepat; lebih rendah wajib
didokumentasikan). Base video 9:16 1080x1920 30fps, tanpa caption/overlay
burned-in. Audio: highpass 70–100Hz, −16..−14 LUFS, true peak −1.5..−1.0 dBFS.
Serahkan timing word-level tiap kata yang lolos + ≥3 kandidat hook.

### 03 Caption/Subtitle
**Output wajib:** `caption-plan.md`, `caption-beats.json`, `publish-captions.md`.
Tipe caption: `subtitle-beat` (default 1–4 kata, max 6), `hook-card`,
`editorial-title`, `proof-label`, `cta-caption`. **Cakupan penuh** kata terucap
(editorial title sparse hanya untuk section cinematic terdokumentasi). Timing:
min 0.45s, nyaman 0.8–1.4s, hold panjang 1.8–2.5s. Safe: top 120px, bottom 220px.
Koreksi ASR (cloud→Claude, chat gbt→ChatGPT, dst.). `publish-captions.md`: IG max
1200 char, TikTok max 4000 char, sertakan character count. Track 2 = subtitle,
track 5 = hook/title/CTA.

### 04 Asset Generation
**Output wajib:** `assets/asset-plan.md`, `asset-manifest.json` (aset di
`videos/<slug>/assets/`). Nama file stabil/deskriptif. Kategori: `screenshot`,
`generated-still`, `generated-video`, `diagram`, `icon-sticker`,
`b-roll-from-source`, `reference-derived-style-note`. Satu `purpose` per aset.
**`Imagegen Decision Log` wajib** untuk tiap peluang visual-support (fields:
time, purpose, best_real_asset, simple_asset_option, imagegen_candidate,
decision, reason) sebelum menyimpulkan generated tak perlu. Prioritas aset: real
footage/capture > screenshot bukti > diagram sederhana > generated still >
generated video. Tolak AI slop setelah 1 revisi. Riset URL: capture screenshot/
rekaman lokal, time ke transkrip, redaksi data privat, tanpa remote fetch di
render path.

### 05 Motion/Overlay
**Output wajib:** `motion-plan.md`, `overlay-timeline.json` (waktu processed-video).
Layer/track 1–5 (lihat [visual-system](../design-system/visual-system.md)).
Motion primitives + default (caption-pop 0.12–0.2s, hook-card-snap 0.2–0.35s,
proof-card-slide 0.25–0.45s, punch-zoom 0.2–0.4s, flash-cut <0.12s, cta-morph
2–4s). Density: low/medium(default)/high. Owns timing/intent SFX (bukan mix
final); SFX audible di HP, di bawah speech. Kompat HyperFrames (deterministik).

### 06 HyperFrames Assembly
Menulis HTML/CSS/GSAP nyata (implementasi, bukan ubah ide). Baca AGENTS.md +
semua agent doc + skill `/hyperframes`+`/hyperframes-core` + `npx hyperframes docs`.
**Output:** `index.html` (+ `compositions/*.html` bila perlu),
`assembly-notes.md`, `assembly-checklist.md`. Kontrak: root `data-composition-id`
+ `data-width/height/duration`; tiap elemen ber-waktu `class="clip"`+timing;
tanpa overlap track sama; timeline paused terdaftar; deterministik; video muted +
audio terpisah; aset lokal. Verifikasi `npm run check`, fix semua error. **Tidak
publish dari assembly** — render untuk review lalu tawarkan publish/QA/revisi.

### 07 QA/Review (opsional)
Jalan hanya saat user memilih QA dulu / minta readiness/punch-list/regression.
**Output:** `qa-report.md`, `qa-punch-list.md`; `final-approval.md` hanya bila
`pass`. Verdict: `pass|pass-with-minor-notes|revise|blocked`. Severity:
`blocker|major|minor|note`. 8 axis review (creative fit, style fit, caption
readability, motion quality, teknis HyperFrames, audio, render, platform
readiness). Threshold caption/audio sama seperti di [nfr](../architecture/nfr.md).
`final-approval.md` = lulus QA internal, **bukan** izin publish (publish tetap
butuh approval + `--approved`).

## Gate review/publish

Setelah render Agent 06: berhenti, minta user review. Tawarkan: publish as-is /
QA dulu / revisi. Publish hanya via
`npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved`
setelah approval. Lihat [publish-runbook](publish-runbook.md).

## Referensi

- [rd-03](../requirements/rd-03-video-editing-workflow.md),
  [design-system/visual-system](../design-system/visual-system.md),
  [agent-documentation-workflow](agent-documentation-workflow.md)
