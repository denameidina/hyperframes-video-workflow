# Product Blueprint
Status: accepted
Date: 2026-07-20

Kanonik untuk: apa produk ini dan untuk siapa. Diisi dari wawancara pemilik
project (2026-07-20) + fakta kode.

## Apa ini

Repo ini adalah **workspace produksi video sosial pribadi** Dena Meidina —
sebuah pipeline untuk mengubah raw footage jadi video vertikal (9:16) siap posting
ke Instagram/TikTok, plus CLI untuk auto-publish render final ke Cloudflare R2 +
Repliz.

Sifat produk (dari wawancara):

- **Primer: personal use case.** Ini alat pribadi Dena untuk memproduksi
  konten-nya sendiri secara konsisten dan berkualitas. **Bukan** inisiatif
  branding/komersial.
- **Sekunder: template/referensi open-source.** Kode dirilis publik (MIT) agar
  bisa dipakai/dipelajari kreator atau tim lain sebagai starter kit (sejalan
  dengan `docs/open-source-release-checklist.md`).

## Untuk siapa (pengguna alat)

- **Pengguna utama:** Dena (dan agent AI yang membantu produksi).
- **Pengguna sekunder:** kreator/tim lain yang mengadopsi repo sebagai template.

## Audiens konten (siapa video ditujukan)

Dari wawancara, video Dena menyasar audiens luas Indonesia:

- Founder / pemilik bisnis
- Developer / engineer
- Early-career / aspiring tech
- Umum / kreator konten yang tertarik workflow AI

> Ini "audiens konten", bukan target pemasaran formal — repo tidak menjalankan
> strategi branding/growth (lihat [business/brd](../business/brd.md),
> [brand/strategy](../brand/strategy.md)).

## Nilai inti

Produksi video yang **dapat diulang, deterministik, dan sesuai standar** (style
guide + kontrak HyperFrames) tanpa menebak-nebak — cukup dengan workflow agent
terstruktur dan gate approval sebelum publish.

## North-star (operasional)

> Ditetapkan oleh penyusun SoT atas delegasi pemilik ("decide to me"),
> diturunkan dari framing personal-use.

Memproduksi video sosial Dena secara konsisten pada bar kualitas terdokumentasi
(caption cakupan penuh, kecepatan 1.2x default, audio pada target LUFS, render
deterministik lulus `npm run video -- check <slug>`) dengan effort manusia minimal dan tanpa
publish tak-disetujui. Target pertumbuhan/leads numerik: **draft — menunggu
input**.

## Referensi

- Scope: [product/scope-principles](scope-principles.md)
- Onboarding: [product/onboarding](onboarding.md)
- Requirement produk: [requirements/prd](../requirements/prd.md)
- Workflow: [operations/video-editing-workflow](../operations/video-editing-workflow.md)
