# Publish Runbook (R2 + Repliz)
Status: operating standard
Date: 2026-07-20

Kanonik untuk: menjalankan auto-publish render final. Perilaku detail:
[rd-01](../requirements/rd-01-publish-pipeline.md); kontrak:
[api-contract](../architecture/api-contract.md).

## Prasyarat

- `.env` terisi (dari `.env.example`): `REPLIZ_API_BASE_URL`, `REPLIZ_ACCESS_KEY`,
  `REPLIZ_SECRET_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`,
  (opsional `R2_PREFIX`), plus minimal satu `REPLIZ_<PLATFORM>_ACCOUNT_ID`.
- Wrangler ter-auth: `npx wrangler login`.
- Description tersedia (salah satu): `videos/<slug>/repliz-publish.json`
  (`post.description` atau root `description`) **atau** `publish-captions.md`
  (`## Instagram` / `## TikTok`, fenced ` ```text ` block).
- Title tersedia bila target YouTube aktif: `repliz-publish.json` (`post.title`
  atau root `title`) **atau** `publish-captions.md` (`## YouTube Title`, fenced
  ` ```text ` block). Tanpa keduanya, title diturunkan dari baris pertama
  description (max 100 karakter).
- **Approval user** atas render final.

## Langkah

1. Render + minta user review (jangan publish tanpa approval).
2. Smoke test tanpa jaringan (opsional): `npm run test:repliz`.
3. Publish:

```bash
npm run repliz:publish -- --slug videos/<slug> --file renders/final.mp4 --approved
```

Script akan: cek `--approved` → load env → baca metadata/description → susun target
account → upload R2 (Wrangler) → verifikasi URL publik (200/206) → validasi akun
Repliz → buat schedule per akun → poll status → tulis receipt.

## Flag

- `--approved` (wajib) — buka upload + scheduling.
- `--force` — re-upload R2 + buat schedule baru meski receipt cocok.
- `--slug <dir>` / `--file <mp4>` — wajib. `--help` — tampilkan usage.

## Output

- `Uploaded: <videoUrl>` lalu per platform: `<platform>: <status> <scheduleId>`.
- Duplikat: `Skipped duplicate publish. Receipt: videos/<slug>/repliz-publish.json`.
- Receipt tersimpan di `videos/<slug>/repliz-publish.json`.

## Kegagalan umum (semua berhenti sebelum efek keluar)

| Gejala | Sebab | Aksi |
| --- | --- | --- |
| `Publishing requires user approval` | Tanpa `--approved` | Review lalu tambah `--approved` |
| `Missing env: ...` | Env wajib kosong | Lengkapi `.env` |
| `No target account IDs configured` | Semua `REPLIZ_*_ACCOUNT_ID` kosong | Isi minimal satu |
| `Missing post description...` | Description kosong di semua sumber | Isi `repliz-publish.json`/`publish-captions.md` |
| `Missing YouTube post title...` | Target YouTube aktif tapi title kosong & tidak bisa diturunkan dari description | Isi `post.title` atau blok `## YouTube Title` |
| `R2 public URL is not reachable: <status>` | Domain publik salah / objek belum ada | Cek `R2_PUBLIC_BASE_URL`, ulangi |
| `Repliz account <id> is not connected` | Akun belum connect | Hubungkan akun di Repliz |
| `... expected <platform>, got <type>` | ID akun salah platform | Perbaiki env ID |

## Multi-akun & timeout

- Kegagalan satu akun tidak menggagalkan lainnya; akun gagal ditandai `error`.
- Poll timeout 120s → receipt disimpan non-terminal; jalankan ulang untuk lanjut.

## Keamanan

- Jangan commit `.env`, receipt post live, atau media privat.
- Publish tidak butuh S3 access key / R2 secret key / `wrangler.jsonc`.
- Lihat [security-standard](../security/security-standard.md).
