# Product Requirements (PRD)
Status: accepted
Date: 2026-07-20

Kanonik untuk: kebutuhan produk tingkat "apa & kenapa". Fungsional detail ada di
[FRD](frd.md) + `rd-NN-*.md`. Diisi dari wawancara (2026-07-20) + kode.

## Problem

Memproduksi video sosial berkualitas viral secara manual itu lambat dan tidak
konsisten. Dena butuh cara **berulang & deterministik** untuk mengubah raw footage
jadi video 9:16 berstandar (hook kuat, caption cakupan penuh, motion+SFX, pacing
1.2x) lalu mempublikasikannya multi-platform — tanpa menaruh kredensial/media di
git dan tanpa publish tak-disetujui.

## Tujuan produk

- **Produksi konsisten:** setiap video memenuhi bar style guide + kontrak
  HyperFrames dan lulus `npm run check`.
- **Distribusi aman:** publish ke R2+Repliz ter-gate approval, idempoten, tanpa
  secret di repo.
- **Dapat diadopsi:** kode dirilis open-source (MIT) sebagai template.

## Pengguna & kebutuhan

| Pengguna | Kebutuhan utama |
| --- | --- |
| Dena (pemilik) | Alur produksi cepat/konsisten untuk konten pribadi |
| Agent AI | Kontrak jelas + artifact handoff agar bisa mengeksekusi tanpa menebak |
| Adopter template | Struktur & docs yang bisa disesuaikan untuk kreator lain |

## Kebutuhan fungsional (ringkas → detail)

1. Produksi video 4 fase → [rd-03](rd-03-video-editing-workflow.md).
2. Komposisi & render deterministik → [rd-02](rd-02-composition-render.md).
3. Auto-publish R2/Repliz ter-gate → [rd-01](rd-01-publish-pipeline.md).
4. Transkripsi & setup lokal → [rd-04](rd-04-transcription-setup.md).

## Kebutuhan non-fungsional

Lihat [architecture/nfr](../architecture/nfr.md) (determinisme, keamanan,
idempotensi, target audio/caption, batas platform).

## Metrik sukses

- Operasional (accepted): video diproduksi konsisten pada bar kualitas
  terdokumentasi, tanpa publish tak-disetujui, tanpa secret ter-commit.
- Pertumbuhan/leads numerik: **draft — menunggu input** (repo = personal use,
  bukan inisiatif branding/komersial; lihat [business/brd](../business/brd.md)).

## Referensi

- [product/blueprint](../product/blueprint.md), [FRD](frd.md),
  [ears-standard](ears-standard.md)
