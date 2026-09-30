# Onboarding
Status: accepted
Date: 2026-09-30

Kanonik untuk: cara pengguna baru (manusia/agent) mulai memakai produk. Langkah
teknis diturunkan dari `docs/initial-setup.md` + `docs/ai-agent-initial-setup.md`;
framing produk dari wawancara (personal tool + template open-source).

## Untuk Dena / pemilik (personal use)

1. Setup lingkungan sekali (Node 22+, Git, CMake, FFmpeg) — lihat
   [operations/runbook](../operations/runbook.md).
2. Buat project (`npm run video -- new <slug>` atau Studio), taruh footage di
   `videos/<slug>/sources/`, atau di `shared/` untuk file reusable.
3. Jalankan workflow agent mulai dari
   `docs/skills/dena-video-editing-workflow/SKILL.md` → fase 01..03 (QA opsional).
4. `npm run video -- check <slug>` lalu `npm run video -- render <slug> [--blur]`,
   review file yang dirender, lalu publish ter-gate approval bila diinginkan.
   Root `index.html` adalah template kosong; command root bukan render video aktif.

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
`ffmpeg`, `cmake`), pastikan `shared/ videos/ references/ renders/` ada, lalu route
task lewat skill router.

Tes lengkap memakai Python 3 + Git (`npm test`, termasuk hook dokumentasi).
Generate dari topic/URL memakai `video new <slug> --generate --format <f>`:
explainer memiliki Gate 1/2/3; kinetic-post/motion-short memiliki Gate 1 teks +
musik + storyboard, kemudian Gate 2 render. Handoff per-format ada di router.

## Referensi

- [operations/runbook](../operations/runbook.md)
- [product/scope-principles](scope-principles.md)
