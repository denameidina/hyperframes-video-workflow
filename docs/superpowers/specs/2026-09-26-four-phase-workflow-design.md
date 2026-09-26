# Four-Phase Workflow — Design

Status: approved (brainstorming 2026-09-26), belum diimplementasi
Date: 2026-09-26
Sub-proyek: 1 dari 2. Sub-proyek 2 (motion b-roll, adaptasi
`Barty-Bart/motion-graphics` → `skills/motion-broll`) punya spec terpisah dan
dibangun di atas struktur ini.

## Latar belakang

Workflow Dena saat ini adalah 7 agent (`docs/agents/01..07`, ADR-0005). Router
`docs/skills/dena-video-editing-workflow/SKILL.md` tidak men-dispatch subagent;
ketujuh "agent" adalah peran bergiliran dalam satu sesi. Biaya tiap agent = dokumen
wajib baca + titik serah-terima artifact, bukan proses.

Masalah yang ditemukan dari batas dokumen (belum dari kegagalan di lapangan —
satu-satunya slug, `videos/tumbuh-ai-client-visit`, dikerjakan di ChatCut):

1. **Hook diputuskan dua kali.** Hook wajib kutipan verbatim transcript, tapi
   Agent 01 berjalan sebelum transcript ada → hook `provisional`, dikunci ulang
   oleh Agent 02 (`01-creative-director.md:165-169`).
2. **Momen visual dipilih dua kali.** Agent 04 mencari timestamp window + placement
   (`04-asset-generation-agent.md:284`, `:690`); Agent 05 memutuskan lagi apa
   muncul kapan dan di mana (`05-motion-overlay-agent.md:7`). Aset dibuat sebelum
   treatment/placement diketahui.
3. **Produksi aset (04) dan assembly (06)** sama-sama authoring; batasnya lemah.
4. **Hanya satu gate user, di akhir** setelah render.
5. **Bacaan wajib berlipat.** Agent 06 wajib membaca kelima dokumen agent hulu
   (~90KB) sebelum bekerja (`06-hyperframes-assembly-agent.md:47-57`).

## Tujuan

- Setiap keputusan dibuat sekali, di fase yang punya input yang cukup.
- Pisahkan agent hanya di titik yang nyata: (a) user harus memutuskan (gate),
  (b) butuh independensi (QA), (c) langkah berikut tak bisa mulai tanpa input
  terkunci.
- Pengetahuan domain tetap terpisah dan hanya dimuat di langkah yang
  membutuhkannya (progressive disclosure).
- Tidak ada aturan Dena yang hilang.

## Non-tujuan

- Mengubah aturan kreatif/style Dena (isi aturan dipindah, bukan ditulis ulang).
- Motion b-roll, field `motion_broll`, engine, atau prioritas "motion b-roll
  dulu" — semuanya sub-proyek 2.
- Mengubah publish pipeline (ADR-0003, `repliz-publish.mjs`) atau HyperFrames
  composition apa pun.
- Memigrasikan artifact slug lama (`videos/tumbuh-ai-client-visit` tetap apa
  adanya sebagai historis).

## Struktur fase

| Fase | Asal | Isi | Gate sesudahnya |
|---|---|---|---|
| **1. Story** | 01 + 02 | Media audit → transcribe → angle + hook terkunci dari transcript → cut + speed 1.2x → `processed.mp4` | Gate 1 (opsional) |
| **2. Screen Plan** | 03 + perencanaan 04 + 05 | Caption dari transcript processed yang terkunci → satu rencana visual (momen, jenis visual, placement, motion, SFX) | Gate 2 (kondisional) |
| **3. Build** | produksi 04 + 06 | Capture/generate aset → rakit HyperFrames → `npm run check` → render | Gate 3 (wajib) |
| **4. QA** | 07 | Audit independen, hanya bila dipilih | — lalu gate publish |

## Layout file

Path `docs/agents/` tetap (Stop hook `.claude/hooks/ensure-docs-updated.py`
memakai prefix ini).

```
docs/agents/
  01-story.md
  02-screen-plan.md
  03-build.md
  04-qa.md
  references/
    hook-and-angle.md
    cut-and-pacing.md
    captions.md
    visual-planning.md
    asset-production.md
    hyperframes-assembly.md
    qa-checklist.md
```

**Dokumen fase** pendek dan seragam: Purpose · When To Use · Inputs (artifact) ·
Steps (tiap langkah menyebut referensi yang harus dibaca saat itu) · Outputs ·
Gate · Fix routing. Tidak ada bagian "Required Reading" yang menyuruh membaca
dokumen fase lain; fase hilir membaca **artifact** hulu, bukan dokumen hulu.

**Referensi** memuat aturan domain yang dipindah dari dokumen lama. Referensi
tidak memuat urutan workflow.

Dokumen `01..07` lama dihapus (tetap ada di riwayat git).

## Kontrak artifact

Semua di `videos/<slug>/`. Nama file lama dipertahankan kecuali satu penggabungan.

| Fase | Membaca | Menulis |
|---|---|---|
| Story | raw media, referensi user | `metadata.json`, `transcript.json`, `creative-brief.md`, `edit-decision-notes.md`, `cut-list.json`, `processed.mp4` (+ opsional `audio-clean.wav`, `preview/*`) |
| Screen Plan | semua output Story | `caption-plan.md`, `caption-beats.json`, `publish-captions.md`, **`visual-plan.md`**, `overlay-timeline.json` |
| Build | semua output Story + Screen Plan | aset lokal, **`asset-manifest.json`**, `index.html`, `compositions/*`, `assembly-notes.md`, `assembly-checklist.md`, render MP4 |
| QA | dokumen `04-qa.md`, `references/qa-checklist.md`, semua artifact slug, render | `qa-report.md`, `qa-punch-list.md`, `final-approval.md` (hanya bila lulus) |

Perubahan artifact:

- **`visual-plan.md`** (baru) menggantikan `asset-plan.md` + `motion-plan.md`.
  Template-nya menggabungkan Asset Plan Template (04) dan Motion Plan Template
  (05):
  1. Inputs
  2. Strategy — format grammar (`dena-default` / `cinematic-operator` /
     `tech-dashboard` / `founder-vlog` / `kumar-inspired`) dan `visual_density`
  3. Visual Decision Log — per momen: waktu, kalimat, pilihan
     (screenshot / imagegen / generated video / diagram / proof-card / label /
     sticker / tidak ada), alasan. Menggantikan "Imagegen Decision Log"; aturan
     imagegen yang berlaku sekarang dibawa utuh.
  4. Timeline — satu baris per elemen: id, in–out, kalimat, jenis visual,
     placement/track, motion masuk/keluar, cue SFX, bagian ilustratif, pemicu
     Gate 2 (R1–R6 atau `-`).
  5. Asset briefs untuk Build — apa yang di-capture/generate, per baris timeline.
  6. Conflicts And Resolutions
  7. Gate 2 result
- **`asset-manifest.json`** pindah dari output perencanaan ke output Build: ia
  mencatat file yang *benar-benar dibuat* (path, sumber, prompt/URL, lisensi,
  baris timeline yang dilayani). Format field mengikuti "Asset Manifest Format"
  dari 04.
- **`creative-brief.md`** mendapat field baru:
  - `visual_density: light | medium | heavy` (default `medium`) — generalisasi
    dari "Motion Density Levels" (05) dan "Default Asset Density" (04).
  - `gate_cut: on | off` (default `off`).
  - Hook selalu `locked-from-transcript`; status `provisional` dihapus karena
    transcribe terjadi sebelum hook dipilih.

## Gate

### Gate 1 — cut (opsional, default off)

- Aktif bila user memintanya ("cek cut dulu") atau `gate_cut: on`.
- Saat aktif: berhenti, tunjukkan `processed.mp4` + ringkasan (kutipan hook
  0–3s, durasi awal → akhir, bagian yang dibuang + alasan). Lanjut hanya setelah
  user setuju.
- Saat off: ringkasan yang sama tetap ditulis di blok `## Cut Summary` di
  `edit-decision-notes.md`, lalu lanjut ke Screen Plan.

### Gate 2 — rencana visual (kondisional)

Screen Plan memeriksa setiap baris Timeline `visual-plan.md` terhadap pemicu:

| # | Pemicu |
|---|---|
| R1 | Angka, harga, persentase, hasil, nama klien, atau kutipan di layar yang tidak verbatim dari transcript dan tidak diberikan user |
| R2 | Screenshot/rekaman berisi data klien atau produk asli, atau informasi privat |
| R3 | Visual yang menutupi wajah penuh lebih dari 6 detik, atau yang menutupi kalimat personal/emosional/opini |
| R4 | Visual yang menutupi wajah Dena di `00:00.00–00:03.00`, kecuali `creative-brief.md` memilih hook visual itu secara eksplisit (mis. background still manifesto). Hook card, caption, progress bar, punch zoom, dan flash tidak menutupi wajah, jadi tidak memicu R4 |
| R5 | CTA yang menyiratkan janji ("nanti gue share/kirim/bahas…") tanpa persetujuan eksplisit user |
| R6 | Imagegen/generated video yang menggambarkan orang nyata atau brand nyata |

- Ada pemicu → berhenti, tampilkan hanya baris yang ditandai + pemicunya + satu
  alternatif aman per baris. User approve / ubah / buang per baris. Keputusan
  dicatat di "Gate 2 result".
- Tidak ada pemicu → tulis `Gate 2: no triggers` dan lanjut ke Build.

### Gate 3 — review final (wajib)

- Setelah render: berhenti, user menonton. Pilihan: **approve** (default,
  langsung ke gate publish), **QA dulu**, atau **revisi**.
- Revisi dirutekan ke fase pemilik (lihat Fix routing), lalu Build merakit ulang
  dan render ulang.

### Gate publish (tidak berubah)

ADR-0003 dan `docs/repliz/integration-spec.md` tetap: R2/Repliz hanya setelah
approval eksplisit, dengan `--approved`. QA artifact bukan prasyarat publish
(`scripts/repliz-publish.mjs` tidak memeriksanya).

## Eksekusi dan QA

- Fase Story, Screen Plan, Build berjalan di sesi utama (gate butuh interaksi).
- QA hanya berjalan bila user memilih "QA dulu" atau memintanya eksplisit.
- QA dijalankan lewat Agent tool (subagent `general-purpose`) dengan konteks baru.
  `04-qa.md` memuat template prompt-nya. Subagent hanya diberi: path slug, path
  render, `04-qa.md`, `references/qa-checklist.md`. Subagent tidak diberi
  ringkasan, alasan, atau diskusi dari sesi utama.
- Subagent menulis `qa-report.md` dan `qa-punch-list.md`; setiap temuan diberi
  fase pemilik. Sesi utama menjalankan perbaikan.
- QA dilewati → tidak ada `qa-report.md`/`final-approval.md`; bukan blocker.

## Fix routing

| Gejala | Fase pemilik |
|---|---|
| Hook salah, cut terlalu banyak/sedikit, pacing, speed, audio dasar | Story |
| Kata caption salah/hilang, highlight, posisi caption, CTA text, publish caption | Screen Plan (caption) |
| Visual salah momen, visual tak relevan, motion/SFX timing, density | Screen Plan (visual) |
| Aset jelek/salah crop, prompt imagegen, screenshot kurang, HTML/track/z-index/render error | Build |

Perubahan di Story membatalkan Screen Plan untuk rentang waktu yang terdampak;
perubahan di Screen Plan membatalkan Build untuk elemen yang terdampak.

## Shortcut user

- "lanjut fase berikutnya" dan (demi kompatibilitas) "lanjut agent berikutnya"
  → lanjut ke fase bernomor berikutnya.
- Permintaan perbaikan teknis sempit (mis. "typo caption di 00:12") boleh
  langsung ke fase pemilik tanpa menjalankan ulang fase lain.

## Pemetaan isi lama → baru

Setiap heading H2 dokumen lama berakhir di salah satu lokasi berikut.
"Dibuang" hanya untuk bagian yang digantikan oleh pola baru.

**01-creative-director.md**
- Purpose, When To Use, Core Principle, Inputs, Outputs, Handoff, Handoff
  Contract, First Downstream Agents → `01-story.md` (ditulis ulang untuk fase)
- Decision Workflow, Output Template (Source … Risks), Quality Bar,
  Dena-Specific Guardrails, Kumar-Inspired Adaptation Rules, Failure Modes →
  `references/hook-and-angle.md`
- Template "Asset Requests" → menjadi "Visual direction notes" di brief, dibaca
  Screen Plan
- Required Reading → dibuang (diganti referensi per langkah)

**02-transcript-cut-agent.md**
- Purpose, Position In Workflow, When To Use, Inputs, Outputs, Handoff, Handoff
  Contract, Relationship To Other Agents → `01-story.md`
- Three-Second Transcript Hook, Hook Extraction, Hook Candidates →
  `references/hook-and-angle.md` (digabung dengan bagian Hook dari 01; satu
  sumber kebenaran untuk hook)
- Media Audit, Transcription Workflow, Content Map, Cut Categories, Filler
  Rules, Cut Intensity Defaults, Silence Rules, Speed Rules, Edit Decision List,
  Processed Base Video, Audio Cleanup Handoff, Output Template, Quality Bar,
  Dena-Specific Notes, Failure Modes → `references/cut-and-pacing.md`
- Required Reading → dibuang

**03-caption-subtitle-agent.md**
- Purpose, Position In Workflow, When To Use, Inputs, Outputs, Handoff,
  Relationship To HyperFrames → `02-screen-plan.md` (langkah Caption)
- Caption Timing Lock s/d Dena-Specific Guardrails (Caption Types, Mode
  Selection, Running Word Coverage, Default Style, Editorial Title, Keyword
  Highlight, Grouping, Timing, Safe Area, Language, ASR Correction, Data Format,
  Plan Template, Hook/CTA/Platform Publish Caption Rules, QA Checklist, Quality
  Bar, Failure Modes) → `references/captions.md`
- Required Reading → dibuang

**04-asset-generation-agent.md**
- Purpose, Position, When To Use, Inputs, Outputs, Handoff, Handoff Contract,
  Relationship → dipecah: bagian perencanaan ke `02-screen-plan.md`, bagian
  produksi ke `03-build.md`
- Asset Categories, Asset Decision Workflow, Dena-Specific Asset Rules, Default
  Asset Density, Dena-Specific Examples, Imagegen Decision Log, Asset Plan
  Template → `references/visual-planning.md`
- Generated Image Prompt Rules, Generated Video Prompt Rules, Screenshot Rules,
  URL Research And Screen Capture Rules, Diagram Rules, Privacy Review, Asset
  Manifest Format, Quality Bar, Failure Modes → `references/asset-production.md`
- Required Reading → dibuang

**05-motion-overlay-agent.md**
- Purpose, Position, When To Use, Inputs, Outputs, Handoff, Relationship →
  `02-screen-plan.md` (langkah Visual)
- Motion Layer Responsibilities, Motion Grammar By Format, Motion Primitives,
  Pattern Interrupt Rules, Timing Rules, Placement Rules, Motion Density Levels,
  Sound/Motion Coordination, Overlay Timeline Format, Motion Plan Template,
  Dena-Specific Motion Rules, Kumar-Inspired Motion Adaptation, Quality Bar,
  Failure Modes → `references/visual-planning.md`
- Track Model → tidak diduplikasi; rujuk kanon
  `internal/docs/design-system/visual-system.md`
- HyperFrames Compatibility Notes → `references/hyperframes-assembly.md`
- Required Reading → dibuang

**06-hyperframes-assembly-agent.md**
- Purpose, Position, When To Use, Inputs, Outputs, Relationship → `03-build.md`
- Handoff To User Review Gate → `03-build.md` (Gate 3)
- HyperFrames Contract, Assembly Procedure, HTML Skeleton, Assembly Notes
  Format, Assembly Checklist Format, Common Failure Modes →
  `references/hyperframes-assembly.md`
- Track Model → rujuk `visual-system.md`
- Required Reading → dibuang; `03-build.md` tetap mewajibkan skill `/hyperframes`
  + `/hyperframes-core` sebelum authoring

**07-qa-review-agent.md**
- Purpose, Position, When To Use, Inputs, Outputs, Relationship → `04-qa.md`
  (+ template prompt subagent)
- Verdicts, Severity Levels, Review Axes, Review Procedure, QA Report Format,
  Punch List Format, Final Approval Format, Common Failure Modes, Definition Of
  Done → `references/qa-checklist.md`
- Required Reading → dibuang

## Migrasi dokumen dan governance

Keputusan:

- **ADR-0008 `four-phase-workflow`** (Status: accepted): konteks (masalah 1–5),
  keputusan (4 fase, gate, QA subagent opsional, referensi per langkah),
  konsekuensi.
- **ADR-0005**: Status → `superseded by 0008`; isi tidak diubah.
- **`internal/docs/requirements/rd-03-video-editing-workflow.md`**: EARS ditulis
  ulang, minimal:
  - WHEN a new raw video is provided, the Story phase SHALL transcribe the
    source before selecting the hook.
  - The Story phase SHALL lock the hook to a contiguous verbatim transcript
    excerpt placed at processed output `00:00.00–00:03.00`.
  - WHERE `gate_cut` is off and the user has not asked to review the cut, the
    Story phase SHALL write a Cut Summary to `edit-decision-notes.md` and
    proceed to Screen Plan.
  - IF any `visual-plan.md` timeline row matches trigger R1–R6, THEN the Screen
    Plan phase SHALL stop and present only the flagged rows before Build.
  - IF no timeline row matches R1–R6, THEN the Screen Plan phase SHALL record
    `Gate 2: no triggers` and proceed to Build.
  - WHEN the final render is ready, the Build phase SHALL stop for user review.
  - WHEN the user approves the final render without choosing QA, the workflow
    SHALL proceed to the publish gate without requiring QA artifacts.
  - WHERE QA is chosen, the QA phase SHALL run in a subagent that receives only
    the slug path, render path, `04-qa.md`, and `references/qa-checklist.md`.
  - Each downstream phase SHALL read upstream artifacts rather than upstream
    phase documents.

Diperbarui:

- `CLAUDE.md`, `AGENTS.md` — Mandatory Agent Order → urutan fase; Routing Rules
  per fase; Discipline Rules (shortcut "lanjut fase berikutnya"); Minimum
  Handoff Chain (dengan `visual-plan.md`); non-negotiables yang menyebut
  "Agent 02/03/04" disebut ulang per fase tanpa mengubah isi aturannya.
- `docs/skills/dena-video-editing-workflow/SKILL.md`,
  `references/agent-chain.md` (Default Edit Workflow, Skip Rules, Fix Routing,
  User Shortcuts), `references/quality-gates.md`.
- `docs/dena-social-video-style-guide.md` — daftar agent + referensi nomor.
- `internal/docs/README.md` (index + registry ADR-0008),
  `operations/video-editing-workflow.md`, `architecture/data-model.md`
  (artifact), `architecture/stack.md`, `architecture/nfr.md`,
  `design-system/visual-system.md`, `requirements/rd-02-composition-render.md`,
  `requirements/rd-04-transcription-setup.md`, `adr/0001`, `adr/0004`,
  `operations/roadmap.md` (catat validasi video nyata pertama) — bila menyebut
  nomor/nama agent.
- `docs/ai-agent-initial-setup.md`, `docs/repliz/integration-spec.md`.
- `.claude/hooks/ensure-docs-updated.py` (komentar "7-agent").
- `.codex/hooks/ensure-learning-docs.py` (assert path
  `docs/agents/02-transcript-cut-agent.md` → path fase baru).

Diarsipkan tanpa perubahan isi: `docs/superpowers/plans/*`,
`docs/asset-generation-imagegen-fix-spec.md`,
`docs/blueprints/dena-video-editing-project-reverse-engineering-blueprint.md`
(ditambah satu catatan di atas: "struktur sebelum 2026-09; lihat ADR-0008").

Prasyarat: perubahan belum-commit yang sudah ada sebelum sesi ini (23 file,
banyak yang tumpang tindih dengan daftar di atas) di-commit terpisah lebih dulu,
supaya diff restrukturisasi bersih.

## Verifikasi

Perubahan docs-only; tidak ada `.html` yang disentuh, jadi `npm run check` tidak
diperlukan (sesuai `CLAUDE.md`).

| # | Cek | Lulus jika |
|---|---|---|
| V1 | Cakupan isi: setiap H2 dokumen lama ada di lokasi baru sesuai "Pemetaan isi lama → baru", atau tercatat "dibuang" | Tidak ada aturan non-negotiable, gotcha, atau aturan hook yang hilang |
| V2 | Istilah basi: grep `Agent 0[1-7]`, `seven-agent`, `7-agent`, `asset-plan.md`, `motion-plan.md`, dan ketujuh nama file lama | Hanya muncul di file arsip, ADR-0005, dan ADR-0008 (sebagai konteks) |
| V3 | Link relatif di semua dokumen yang disentuh resolve; ADR-0008 terdaftar di `internal/docs/README.md` | 0 link rusak |
| V4 | Walkthrough konteks baru: subagent yang hanya diberi dokumen baru mensimulasikan video 60 detik melewati keempat fase | Setiap input fase dihasilkan fase sebelumnya; pemicu R1–R6 tak ambigu; tidak ada kontradiksi. Temuan diperbaiki, lalu V4 diulang sekali |
| V5 | Stop hook `ensure-docs-updated.py` dan test hook `.codex` | Lulus |

Validasi dunia nyata: video asli pertama setelah restrukturisasi, dicatat di
`operations/roadmap.md`. Tidak memblokir penyelesaian sub-proyek ini.

## Risiko

- **Isi hilang saat redistribusi** → V1 dengan pemetaan eksplisit.
- **Agent lain (Codex) masih mengikuti struktur lama** → `AGENTS.md` dan hook
  `.codex` ikut diperbarui.
- **Referensi terlalu besar sehingga tetap dibaca utuh** → dokumen fase menyebut
  referensi per langkah; referensi yang melebihi 600 baris dipecah per sub-topik
  saat implementasi (mis. `visual-planning.md` → pemilihan visual + motion
  grammar).
- **Struktur baru belum teruji di video nyata** → validasi video pertama dicatat
  di roadmap; revisi lewat ADR baru bila perlu.

## Keterkaitan dengan sub-proyek 2 (motion b-roll)

Keputusan yang sudah diambil dan akan masuk spec sub-proyek 2:

- Default untuk semua video talking-head; density mengikuti `visual_density`.
- Treatment per clip: cutaway / split (wajah di separuh bawah) / panel, untuk
  9:16 1080×1920.
- Look sistem Dena gelap (`#050505`, putih, satu aksen `#facc15`, hijau untuk
  status); Geist untuk teks UI di dalam shape; caption tetap Arial 950.
- Motion b-roll menjadi visual utama; screenshot/imagegen hanya untuk bukti nyata
  atau mood yang tidak bisa digambar dengan UI → mengubah prioritas di
  `references/visual-planning.md` dan non-negotiable imagegen di `CLAUDE.md`.
- Pendekatan A: `motion.js` di-port ke file lokal tanpa dependency npm; clip
  = sub-composition HyperFrames yang digerakkan proxy GSAP → `seek(t)`; pass
  motion blur opsional (render 4× fps + ffmpeg `tmix`).
- Tempat colokan: jenis visual `motion-broll` di Visual Decision Log dan
  Timeline `visual-plan.md` (Screen Plan); build clip + still check per kata
  kunci di Build.
