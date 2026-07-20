# ADR-0005 Disiplin Workflow 7-Agent Berbasis Dokumen
Status: accepted (reverse-engineered)
Date: 2026-07-20

## Context

Mengedit video sosial berkualitas viral butuh banyak keputusan berurutan (arah
kreatif, cut, caption, aset, motion, assembly, QA). Bila satu agent AI melakukan
semuanya sekaligus, keputusan kreatif tercampur dengan implementasi teknis,
artifact hilang, dan kualitas tak konsisten.

## Decision

Membagi produksi jadi **7 peran agent** dengan urutan tetap dan artifact handoff
eksplisit di `videos/<slug>/`:

1. Creative Director → `creative-brief.md`
2. Transcript/Cut → `metadata.json`, `transcript.json`, `edit-decision-notes.md`, `cut-list.json`
3. Caption/Subtitle → `caption-plan.md`, `caption-beats.json`, `publish-captions.md`
4. Asset Generation → `asset-plan.md`, `asset-manifest.json`
5. Motion/Overlay → `motion-plan.md`, `overlay-timeline.json`
6. HyperFrames Assembly → `index.html`, `assembly-notes.md`, `assembly-checklist.md`
7. QA/Review (opsional, di gate review) → `qa-report.md`, `qa-punch-list.md`, `final-approval.md`

Router = `docs/skills/dena-video-editing-workflow/SKILL.md`. Tiap agent membaca
doc-nya penuh + artifact hulu sebelum bertindak, dan tetap di dalam batas perannya.

## Rationale

- Memisahkan keputusan kreatif dari implementasi menaikkan kualitas & konsistensi.
- Artifact handoff membuat state produksi eksplisit dan bisa dilanjut siapa pun.
- Routing per intent menghindari lompat ke assembly sebelum keputusan hulu ada.

## Consequences

- Agent 06/07 tak boleh mengubah ide kreatif; QA merutekan fix ke agent pemilik.
- Artifact hulu yang hilang harus dibuat oleh agent hulu, bukan dikarang.
- Blueprint reverse-engineering (`docs/blueprints/...`) mendokumentasikan cara
  membangun ulang seluruh sistem, tapi **bukan** bagian runtime (tidak dirujuk
  AGENTS.md/CLAUDE.md/skill router).

## Sources

- AGENTS.md, CLAUDE.md, `docs/agents/01..07-*.md`
- `docs/skills/dena-video-editing-workflow/SKILL.md`,
  `docs/blueprints/dena-video-editing-project-reverse-engineering-blueprint.md`
- [requirements/rd-03-video-editing-workflow](../requirements/rd-03-video-editing-workflow.md)
