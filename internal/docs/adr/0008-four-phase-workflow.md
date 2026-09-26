# ADR-0008 Workflow 4 Fase dengan Gate
Status: accepted
Date: 2026-09-26

## Context

ADR-0005 membagi produksi video Dena menjadi 7 agent. Router tidak men-dispatch
subagent; ketujuh agent adalah peran bergiliran dalam satu sesi, jadi biayanya
adalah dokumen wajib baca + titik serah-terima. Batasnya tidak mengikuti titik
keputusan nyata:

1. Hook diputuskan dua kali: Agent 01 menandai hook `provisional` sebelum
   transkrip ada, lalu Agent 02 menguncinya ulang.
2. Momen visual dipilih dua kali: Agent 04 mencari timestamp window dan
   placement, Agent 05 memutuskan lagi apa muncul kapan dan di mana; aset dibuat
   sebelum placement diketahui.
3. Produksi aset (04) dan assembly (06) sama-sama authoring.
4. Hanya ada satu gate user, setelah render final.
5. Agent 06 wajib membaca kelima dokumen agent hulu sebelum bekerja.

## Decision

- Produksi dibagi 4 fase di `docs/agents/`:
  1. `01-story.md` (dari 01 + 02): transkripsi dulu, hook dikunci dari
     transkrip, cut, `processed.mp4`.
  2. `02-screen-plan.md` (dari 03 + perencanaan 04 + 05): caption, lalu satu
     `visual-plan.md` yang menggantikan `asset-plan.md` + `motion-plan.md`.
  3. `03-build.md` (dari produksi 04 + 06): aset, HyperFrames, render.
  4. `04-qa.md` (dari 07): opsional, dijalankan sebagai subagent konteks baru.
- Gate: Gate 1 (review cut) opsional, default off (`gate_cut`); Gate 2
  kondisional pada pemicu R1–R6 di `visual-plan.md`; Gate 3 (review render)
  wajib dengan jalur default approve → gate publish; gate publish tetap ADR-0003.
- Aturan domain dipindah verbatim ke `docs/agents/references/*.md` dan dibaca
  hanya pada langkah yang menyebutnya. Fase hilir membaca artifact hulu, bukan
  dokumen fase hulu.

## Rationale

- Agent dipisah hanya di titik nyata: user harus memutuskan (gate), butuh
  independensi (QA), atau langkah berikut butuh input terkunci.
- Setiap keputusan dibuat sekali, di fase yang punya inputnya.
- User bisa melihat arah lebih awal tanpa interupsi wajib: Gate 1 opsional,
  Gate 2 hanya berhenti saat ada risiko.
- QA sebagai subagent tidak membawa alasan sesi pembuat.

## Consequences

- ADR-0005 superseded. File agent lama dihapus; isinya ada di riwayat git
  sebelum commit ADR ini dan dipindah ke `docs/agents/references/`.
- `asset-manifest.json` kini mencatat file yang benar-benar dibuat (output
  Build), bukan rencana.
- `creative-brief.md` punya `visual_density` dan `gate_cut`; status hook
  `provisional` dihapus.
- Struktur ini belum teruji di video nyata; video pertama sesudahnya dicatat di
  [operations/roadmap](../operations/roadmap.md).

## Sources

- Spec: `docs/superpowers/specs/2026-09-26-four-phase-workflow-design.md`
- `docs/agents/01-story.md`, `docs/agents/02-screen-plan.md`,
  `docs/agents/03-build.md`, `docs/agents/04-qa.md`, `docs/agents/references/`
- [requirements/rd-03-video-editing-workflow](../requirements/rd-03-video-editing-workflow.md)
- [operations/video-editing-workflow](../operations/video-editing-workflow.md)
