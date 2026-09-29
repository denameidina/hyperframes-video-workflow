# Security Standard
Status: operating standard
Date: 2026-07-20

Kanonik untuk: aturan keamanan & privasi repo. Diturunkan dari `SECURITY.md`,
`.gitignore`, `.env.example`, `scripts/repliz-publish.mjs`,
`docs/repliz/integration-spec.md`, `README.md`.

## Secrets — jangan pernah commit

- `.env`, `.env.*` (kecuali `.env.example`).
- Repliz access/secret key (`REPLIZ_ACCESS_KEY`, `REPLIZ_SECRET_KEY`).
- Cloudflare API token, `CLOUDFLARE_ACCOUNT_ID` nyata.
- R2 credential / signed URL.
- Footage/media klien privat.

Ditegakkan `.gitignore` (mengabaikan `.env`, `.env.*` kecuali template; serta
`shared/`, `videos/`, `references/`, `renders/`, dan ekstensi media besar).

## Model kredensial publish

- R2 upload memakai **Wrangler auth** + env `CLOUDFLARE_ACCOUNT_ID`, bukan S3
  access key / R2 secret key / `wrangler.jsonc`. Jangan tambahkan itu kecuali
  user memintanya eksplisit.
- Repliz memakai HTTP Basic Auth dari env; header dibangun runtime, tidak
  disimpan.
- CI: hanya `CLOUDFLARE_API_TOKEN` (scope R2 read/write bucket target) +
  `CLOUDFLARE_ACCOUNT_ID` untuk upload; token lain tidak diperlukan.

## Data receipt

Receipt `videos/<slug>/repliz-publish.json` **tidak** menyimpan access/secret key,
Cloudflare API token, header Basic Auth penuh, atau signed URL. Hanya
`descriptionHash`/`publishKey` (sha256), `scheduleId`, status. Receipt tetap di
working dir yang di-ignore git.

## Approval sebelum aksi keluar

Upload R2 + scheduling Repliz butuh `--approved` (lihat
[ADR-0003](../adr/0003-approval-gated-publish.md)). Jangan test/panggil Repliz
kecuali user meminta; smoke test R2-only boleh bila diminta.

## Placeholder di dokumentasi

Dokumen publik memakai placeholder, bukan nilai nyata: `<r2-bucket>`,
`<r2-public-domain>`, `<cloudflare-account-id>`, `<repliz-api-base-url>`.

## Pihak ketiga

Beberapa aset skill vendored punya lisensi/terms non-komersial (mis.
`.claude/skills/embedded-captions/assets/brand/`). Lihat `THIRD_PARTY_NOTICES.md`;
jangan perlakukan sebagai aset MIT.

## Pelaporan

Laporkan isu keamanan secara privat ke pemilik project, bukan issue publik
(`SECURITY.md`).

## Secret scan (pra-rilis)

```bash
npm run test:repliz
rg -n --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!vendor/**' \
  'REPLIZ_(ACCESS|SECRET)_KEY|CLOUDFLARE_API_TOKEN|-----BEGIN .*PRIVATE KEY-----|sk-[A-Za-z0-9_-]{20,}'
git status --short
git status --short --ignored   # pastikan media privat tidak tracked
```

Audit terjadwal / temuan: [audit-2026-07-20](audit-2026-07-20.md).
