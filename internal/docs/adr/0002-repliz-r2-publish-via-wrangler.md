# ADR-0002 Publish via Cloudflare R2 (Wrangler) + Repliz, Tanpa S3 Key
Status: accepted (reverse-engineered)
Date: 2026-07-20

## Context

Render final perlu dihosting di URL publik lalu dijadwalkan ke banyak platform
sosial. Repliz `POST /public/schedule` menerima media sebagai **URL publik**
(tidak ada endpoint upload langsung di OpenAPI). Butuh object storage publik dan
mekanisme upload yang tidak menaruh kredensial jangka panjang di repo.

## Decision

- Host MP4 di **Cloudflare R2**, di-upload lewat **Wrangler CLI**
  (`npx wrangler r2 object put <bucket>/<key> --remote --file <file> --content-type video/mp4`),
  bukan S3 API/SDK dan bukan signed URL.
- Pilih akun via env `CLOUDFLARE_ACCOUNT_ID` per invocation, **tanp** `wrangler.jsonc`.
- Kirim ke Repliz lewat `fetch` langsung dengan HTTP Basic Auth; URL media =
  public R2 URL dari `R2_PUBLIC_BASE_URL`.
- Jangan tambahkan S3 access key / R2 secret key kecuali user memintanya.

## Rationale

- Wrangler auth memisahkan kredensial dari repo; hanya `CLOUDFLARE_ACCOUNT_ID`
  (+ token di CI) yang dibutuhkan.
- Repliz butuh URL yang bisa di-fetch tanpa Authorization → domain publik/custom.
- `fetch` bawaan Node menghindari SDK Repliz (yang mungkin tak ada).

## Consequences

- Butuh `npx wrangler login` (lokal) atau `CLOUDFLARE_API_TOKEN` (CI, R2 read/write).
- `R2_PUBLIC_BASE_URL` harus domain yang benar-benar publik; publish memverifikasi
  reachability (HTTP 200/206, `Range: bytes=0-0`).
- Media diverifikasi sebelum scheduling; URL tak reachable → gagal cepat.

## Sources

- `scripts/repliz-publish.mjs` (`uploadToR2`, `verifyPublicUrl`, `createSchedules`)
- `docs/repliz/integration-spec.md`, `docs/repliz/openapi.json`, `.env.example`
- [architecture/api-contract](../architecture/api-contract.md),
  [requirements/rd-01-publish-pipeline](../requirements/rd-01-publish-pipeline.md)
