# RD-03 Video Editing Workflow
Status: accepted (reverse-engineered)
Date: 2026-07-20

Domain: disiplin workflow 7 agent untuk video sosial Dena. Owner: `docs/agents/*`,
`docs/skills/dena-video-editing-workflow/SKILL.md`. Diturunkan dari AGENTS.md,
CLAUDE.md, dan tiap agent doc. Detail operasional:
[operations/video-editing-workflow](../operations/video-editing-workflow.md).

## Urutan & routing

- **RD-03-01** (Event-driven) — When sebuah task Dena dimulai, the system shall
  membaca `docs/skills/dena-video-editing-workflow/SKILL.md` sebagai router lalu
  agent yang relevan.
- **RD-03-02** (Ubiquitous) — The system shall menjalankan agent secara berurutan
  01 → 02 → 03 → 04 → 05 → 06 sebelum user review, kecuali user meminta perbaikan
  teknis sempit.
- **RD-03-03** (Unwanted) — If assembly (Agent 06) hendak dimulai sebelum arah
  kreatif, cut, caption, aset, dan motion selesai atau ditandai tidak perlu, then
  the system shall menolak dan kembali ke agent hulu yang kurang.
- **RD-03-04** (Optional) — Where user memilih QA lebih dulu di gate review, the
  system shall menjalankan Agent 07 sebelum meminta approval publish final.

## Handoff artifacts

- **RD-03-05** (Ubiquitous) — The system shall menghasilkan artifact handoff milik
  tiap agent di `videos/<slug>/` bila slug ada (mis. `creative-brief.md`,
  `edit-decision-notes.md`, `caption-plan.md`, `caption-beats.json`,
  `publish-captions.md`, `asset-plan.md`, `asset-manifest.json`, `motion-plan.md`,
  `overlay-timeline.json`, `assembly-notes.md`, `assembly-checklist.md`).
- **RD-03-06** (Unwanted) — If artifact hulu hilang, then the system shall
  membuatnya lewat agent hulu yang benar atau menulis catatan blocker; tidak
  boleh mengarang keputusan yang hilang.

## Aturan konten (non-negotiable)

- **RD-03-07** (Ubiquitous) — The system shall memberi cakupan caption penuh:
  setiap kata terucap yang lolos cut punya beat caption (talking-head/storytelling).
- **RD-03-08** (State-driven) — While memproses video Dena default, the system
  shall memakai kecepatan `1.2x`; If kecepatan diturunkan, then the system shall
  mendokumentasikan alasan eksak di `edit-decision-notes.md`.
- **RD-03-09** (Ubiquitous) — The system shall membuat CTA non-promissory secara
  default; the system shall tidak menyiratkan janji "kirim/bahas/share source
  nanti" kecuali user memintanya eksplisit.
- **RD-03-10** (Event-driven) — When user memberi URL atau transkrip menyebut
  tool/produk/situs, Agent 04 shall meneliti/inspeksi, menangkap screenshot/
  rekaman lokal bila berguna, dan menautkannya ke jendela transkrip.
- **RD-03-11** (Ubiquitous) — Agent 04 shall menulis `Imagegen Decision Log` untuk
  setiap peluang visual-support sebelum menyimpulkan generated media tidak perlu.
- **RD-03-12** (Unwanted) — If aset generated tampak generik/palsu/lepas dari
  workflow (AI slop), then the system shall menolaknya setelah maksimal satu
  revisi dan mendokumentasikan penolakan.
- **RD-03-13** (Ubiquitous) — The system shall menyertakan cue SFX yang audible
  namun tidak menutup speech; SFX hilang atau terlalu pelan adalah temuan QA.

## Batas tanggung jawab

- **RD-03-14** (Ubiquitous) — The system shall menjaga tiap agent dalam batas
  perannya (mis. Agent 05 merancang timing motion; Agent 06 mengimplementasikan
  di HyperFrames).
- **RD-03-15** (Ubiquitous) — Temuan QA (Agent 07) shall dirutekan sebagai
  perbaikan ke agent pemilik, bukan "polish" kabur.

## Referensi

- Operasional detail: [operations/video-editing-workflow](../operations/video-editing-workflow.md)
- Keputusan: [ADR-0005](../adr/0005-seven-agent-workflow-discipline.md)
- Sistem visual: [design-system/visual-system](../design-system/visual-system.md)
