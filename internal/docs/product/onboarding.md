# Onboarding
Status: accepted
Date: 2026-07-20

Kanonik untuk: cara pengguna baru (manusia/agent) mulai memakai produk. Langkah
teknis diturunkan dari `docs/initial-setup.md` + `docs/ai-agent-initial-setup.md`;
framing produk dari wawancara (personal tool + template open-source).

## Untuk Dena / pemilik (personal use)

1. Setup lingkungan sekali (Node 22+, Git, CMake, FFmpeg) — lihat
   [operations/runbook](../operations/runbook.md).
2. Taruh raw footage di `raw/` atau `videos/<slug>/`.
3. Jalankan workflow agent mulai dari
   `docs/skills/dena-video-editing-workflow/SKILL.md` → agent 01..06.
4. `npm run render`, review, lalu publish ter-gate approval bila diinginkan.

## Untuk adopter template (open-source)

1. Clone repo; baca `README.md` + `AGENTS.md` + [README index](../README.md).
2. Media lokal Dena tidak disertakan (di-ignore git) — sediakan footage sendiri.
3. Ganti persona/style: sesuaikan `docs/dena-social-video-style-guide.md`
   (identitas, voice, warna) sesuai kreator target.
4. Untuk publish sendiri: isi `.env` (dari `.env.example`) dengan kredensial
   R2/Repliz milik sendiri.
5. Pertimbangkan aturan lisensi aset skill pihak ketiga (`THIRD_PARTY_NOTICES.md`)
   sebelum memakai ulang.

## Untuk agent AI

Baca [operations/agent-documentation-workflow](../operations/agent-documentation-workflow.md)
dan `docs/ai-agent-initial-setup.md`. Verifikasi toolchain (`node --version` ≥ 22,
`ffmpeg`, `cmake`), pastikan `raw/ videos/ references/ renders/` ada, lalu route
task lewat skill router.

## Referensi

- [operations/runbook](../operations/runbook.md)
- [product/scope-principles](scope-principles.md)
