# ADR-0003 Publish Ter-gate oleh Approval Eksplisit
Status: accepted (reverse-engineered)
Date: 2026-07-20

## Context

Publish menyentuh dunia luar: mengunggah media dan menjadwalkan post ke akun
sosial nyata. Kesalahan sulit dibatalkan (post terjadwal, media publik). Agent AI
menjalankan pipeline; tanpa pagar, agent bisa publish tanpa persetujuan manusia.

## Decision

Publish di-gate flag **`--approved`**. `runPublish` throw
`Publishing requires user approval...` bila flag tidak ada — sebelum menyentuh
R2 atau Repliz. Workflow agent mewajibkan: setelah render, berhenti, minta user
review, dan hanya jalankan
`npm run repliz:publish -- --slug <videos/slug> --file <render.mp4> --approved`
setelah user menyetujui. `final-approval.md` dari QA adalah lulus QA internal,
**bukan** izin publish.

## Rationale

- Aksi keluar yang sulit dibalik butuh konfirmasi manusia.
- Flag eksplisit membuat gate tak sengaja terlewati oleh otomasi.
- Memisahkan "siap secara teknis" dari "disetujui untuk terbit".

## Consequences

- Tidak ada auto-publish diam-diam; selalu ada langkah manusia.
- Test menegakkan gate (`runPublish requires approval before uploading...`).
- Docs (AGENTS.md, CLAUDE.md, agent 06/07, integration spec) mengulang aturan ini.

## Sources

- `scripts/repliz-publish.mjs:458`, `scripts/repliz-publish.test.mjs`
- AGENTS.md (Repliz/R2 Auto Publish Gate), `docs/repliz/integration-spec.md`
- [requirements/rd-01-publish-pipeline](../requirements/rd-01-publish-pipeline.md) (RD-01-01)
