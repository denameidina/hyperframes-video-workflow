# Video Editing Workflow (4 Fase)
Status: operating standard
Date: 2026-09-26

Kanonik untuk: cara operasional menjalankan produksi video Dena via 4 fase.
Aturan/kriteria: [rd-03](../requirements/rd-03-video-editing-workflow.md);
keputusan: [ADR-0008](../adr/0008-four-phase-workflow.md). Sumber detail:
dokumen fase `docs/agents/01-story.md` … `docs/agents/04-qa.md`, referensi di
`docs/agents/references/`, dan router `docs/skills/dena-video-editing-workflow/SKILL.md`.

## Urutan

Story → (Gate 1 opsional) → Screen Plan → (Gate 2 kondisional) → Build →
Gate 3 review user → (QA opsional, subagent) → gate publish. Jangan mulai Build
sebelum artifact Story dan Screen Plan ada, termasuk `Gate 2 Result`. Slug per
video: `videos/<slug>/`. Fase hilir membaca artifact hulu, bukan dokumen fase
hulu; referensi dibaca hanya pada langkah yang menyebutnya.

## Ikhtisar per fase

### 1. Story (`docs/agents/01-story.md`)
Audit media (`ffprobe`/`ffmpeg volumedetect`/`silencedetect=noise=-34dB:d=0.35`)
→ transkripsi whisper lokal → angle, content lane (`ai-systems`,
`developer-craft`, `founder-operator`, `journey-reflection`, `family-vlog`,
`viral-character`), hook (`callout|contrast|mistake|proof|mission|plot-twist`)
yang **selalu dikunci dari transkrip** → cut berbasis amplitudo → **kecepatan
default 1.2x** (1.12–1.18x bila sumber cepat; lebih rendah wajib
didokumentasikan). Hook verbatim dipindah ke output `00:00.00-00:03.00`, kemunculan
aslinya dihapus kecuali callback terdokumentasi. Base video 9:16 1080x1920 30fps
tanpa caption/overlay burned-in. Audio: highpass 70–100Hz, −16..−14 LUFS, true
peak −1.5..−1.0 dBFS. **Output:** `creative-brief.md` (+ `visual_density`,
`gate_cut`, `## User Approvals`), `metadata.json`, `transcript.json`,
`processed-transcript.json`, `edit-decision-notes.md`
(diakhiri `## Cut Summary`), `cut-list.json`, `processed.mp4`.
**Gate 1** (opsional, default off): review cut hanya bila user minta atau
`gate_cut: on`. Referensi: `hook-and-angle.md`, `cut-and-pacing.md`.

### 2. Screen Plan (`docs/agents/02-screen-plan.md`)
**Langkah caption:** tipe `subtitle-beat` (default 1–4 kata, max 6),
`hook-card`, `editorial-title`, `proof-label`, `cta-caption`; **cakupan penuh**
kata terucap; timing min 0.45s, nyaman 0.8–1.4s, hold panjang 1.8–2.5s; safe top
120px, bottom 220px; koreksi ASR; `publish-captions.md` IG max 1200 char, TikTok
max 4000 char. Track 2 subtitle, track 5 hook/title/CTA. Hook card memakai kata
yang sama dengan hook Story.
**Langkah visual:** satu `visual-plan.md` (menggantikan rencana aset dan
rencana motion lama): Visual Decision Log wajib untuk tiap peluang visual-support
(time, line, purpose, best_real_asset, simple_asset_option,
imagegen_candidate, decision, reason); prioritas motion b-roll > capture bukti
> generated still > generated video (lihat `motion-broll-planning.md`); riset URL/tool dan rencana
capture; motion primitives (caption-pop 0.12–0.2s, hook-card-snap 0.2–0.35s,
proof-card-slide 0.25–0.45s, punch-zoom 0.2–0.4s, flash-cut <0.12s, cta-morph
2–4s); density dari `visual_density`; cue SFX audible di HP namun di bawah speech.
**Output:** `caption-plan.md`, `caption-beats.json`, `publish-captions.md`,
`visual-plan.md`, `overlay-timeline.json`.
**Gate 2** (kondisional): berhenti hanya bila baris Timeline kena R1–R6 (angka/
klaim tak verbatim, data asli/privat, wajah tertutup >10s atau saat kalimat
personal, wajah tertutup di 0–3s tanpa pilihan brief, CTA berjanji, generated
yang menggambarkan orang/brand nyata). Referensi: `captions.md`,
`caption-artifacts.md`, `visual-planning.md`, `motion-grammar.md`,
`motion-broll-planning.md`.

### 3. Build (`docs/agents/03-build.md`)
Cek kesiapan (termasuk `Gate 2 Result`) → capture/generate aset sesuai Asset
Briefs ke `videos/<slug>/assets/` + `assets/asset-manifest.json` (file yang
benar-benar dibuat) → baca skill `/hyperframes` + `/hyperframes-core` → tulis clip motion b-roll
(`compositions/broll/*.html`) dan cek snapshot-nya di kata kunci → rakit
`index.html` (+ `compositions/*.html` bila perlu). Kontrak: root
`data-composition-id` + `data-width/height/duration`; tiap elemen ber-waktu
`class="clip"` + timing; tanpa overlap track sama; timeline paused terdaftar;
deterministik; video muted + audio terpisah; aset lokal. `npm run video -- check <slug>`, fix
semua error, preview keyframe, tulis `assembly-notes.md` +
`assembly-checklist.md`, render (opsional `npm run render:blur`). **Gate 3** (wajib): berhenti untuk review user.
Referensi: `asset-production.md`, `hyperframes-assembly.md`,
`motion-broll-authoring.md`.

### 4. QA (`docs/agents/04-qa.md`, opsional)
Hanya bila user memilih QA dulu / minta readiness, punch-list, atau regression.
Selalu dijalankan sebagai **subagent konteks baru** yang hanya menerima path
slug, path render, `04-qa.md`, dan `references/qa-checklist.md`. **Output:**
`qa-report.md`, `qa-punch-list.md`; `final-approval.md` hanya bila `pass`.
Verdict: `pass|pass-with-minor-notes|revise|blocked`. Severity:
`blocker|major|minor|note`. Temuan dirutekan ke fase pemilik. Threshold
caption/audio sama seperti di [nfr](../architecture/nfr.md).
`final-approval.md` = lulus QA internal, **bukan** izin publish.

## Gate review/publish

Setelah render Build: berhenti, minta user review (Gate 3). Tawarkan: publish
as-is (default) / QA dulu / revisi. Publish hanya via
`npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved`
setelah approval; artifact QA tidak disyaratkan. Lihat
[publish-runbook](publish-runbook.md).

## Referensi

- [rd-03](../requirements/rd-03-video-editing-workflow.md),
  [ADR-0008](../adr/0008-four-phase-workflow.md),
  [design-system/visual-system](../design-system/visual-system.md),
  [agent-documentation-workflow](agent-documentation-workflow.md)
