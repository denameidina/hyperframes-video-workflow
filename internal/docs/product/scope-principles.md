# Scope Principles
Status: accepted
Date: 2026-07-20

Kanonik untuk: batas scope produk. Diisi dari wawancara (2026-07-20) + kode.

## In scope

- Pipeline produksi video sosial Dena (4 fase: story → screen plan → build →
  QA opsional).
- Komposisi HyperFrames (HTML+GSAP) → render MP4 deterministik.
- Transkripsi lokal (whisper.cpp) untuk merancang caption/cut.
- Auto-publish render final ke Cloudflare R2 + Repliz (multi-platform),
  ter-gate approval.
- Rilis kode sebagai template open-source (MIT).

## Out of scope

- Strategi branding/marketing formal, growth hacking, atau kampanye berbayar
  (repo = personal use, bukan inisiatif branding).
- Monetisasi terintegrasi (affiliate automation, checkout, dsb.).
- Backend/aplikasi web ter-deploy, database, atau API publik milik sendiri.
- Menyimpan media besar/kredensial di git (raw/render/`.env` selalu di-ignore).
- OAuth/connect akun sosial baru dari repo (Repliz MVP hanya schedule).

## Prinsip

- **Personal-first:** keputusan optimalkan produksi pribadi Dena, bukan skalabilitas
  produk multi-tenant.
- **Deterministik & lokal:** render reproducible; aset & transkripsi lokal.
- **Approval sebelum keluar:** tidak ada aksi eksternal (publish) tanpa
  persetujuan manusia eksplisit.
- **Docs-driven:** perubahan perilaku ditulis EARS dulu; doc detail kanonik.

## Referensi

- [product/blueprint](blueprint.md), [requirements/prd](../requirements/prd.md)
- [operations/implementation-standard](../operations/implementation-standard.md)
