# Publish Runbook (R2 + Repliz)
Status: operating standard
Date: 2026-09-30

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
- Bila target Threads aktif (`REPLIZ_THREADS_ACCOUNT_ID`): tulis `## Threads`
  di `publish-captions.md` sebagai rantai bubble ≤150 karakter (blok pertama =
  post, sisanya reply chain) — lihat Threads Character Limits di
  [integration-spec](../../../docs/repliz/integration-spec.md). Tanpa itu, script
  otomatis word-wrap `description` jadi rantai ≤150 karakter, tapi hasilnya
  kurang natural sebagai thread.
- **Approval user** atas render final.

## Langkah

1. Render + minta user review (jangan publish tanpa approval).
2. Smoke test tanpa jaringan (opsional): `npm run test:repliz`.
3. Publish:

```bash
npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved
```

Script akan: cek `--approved` → load env → baca metadata/description → susun target
account → partisi riwayat per target → poll ulang schedule pending yang digunakan
kembali → upload R2 bila ada target baru → verifikasi URL publik (200/206) →
validasi akun Repliz → buat schedule per akun dan checkpoint setiap hasil →
poll status → checkpoint final. Riwayat target blocked/nonaktif tetap disimpan.
Resume tanpa target baru tidak upload/POST, tetapi boleh melakukan GET polling.

## Flag

- `--approved` (wajib) — buka upload + scheduling.
- `--force` — re-upload R2 + buat schedule baru meski receipt cocok.
- `--slug <dir>` / `--file <mp4>` — wajib. `--help` — tampilkan usage.

## Output

- `Uploaded: <videoUrl>` lalu per platform: `<platform>: <status> <scheduleId>`.
- Duplikat penuh (tidak ada yang berubah sama sekali): `Skipped duplicate publish. Receipt: videos/<slug>/repliz-publish.json`.
- Platform yang sudah pernah sukses tapi kontennya berubah, tanpa `--force`:
  `<platform>: blocked — content changed since the last successful publish; rerun with --force to repost`.
  Platform lain yang memang perlu dijadwalkan tetap berjalan pada run yang
  sama (lihat [ADR-0011](../adr/0011-per-target-publish-idempotency.md)).
- Menambah platform baru (mis. mengisi `REPLIZ_THREADS_ACCOUNT_ID`) ke slug
  yang sudah publish sukses ke platform lain: rerun `repliz:publish` biasa
  hanya menjadwalkan platform baru itu; platform yang sudah sukses tidak
  disentuh ulang.
- Receipt tersimpan di `videos/<slug>/repliz-publish.json`.

## Kegagalan umum

Approval/env/target/caption/title/bubble length dan keberadaan file diperiksa
sebelum upload baru. Verifikasi URL publik dan validasi akun Repliz berlangsung
setelah upload R2, sehingga kegagalannya dapat meninggalkan objek R2. Polling
resume dapat terjadi sebelum upload baru; kegagalan pada tahap ini juga merupakan
request eksternal. Tidak ada rollback objek/schedule otomatis.

| Gejala | Sebab | Aksi |
| --- | --- | --- |
| `Publishing requires user approval` | Tanpa `--approved` | Review lalu tambah `--approved` |
| `Missing env: ...` | Env wajib kosong | Lengkapi `.env` |
| `No target account IDs configured` | Semua `REPLIZ_*_ACCOUNT_ID` kosong | Isi minimal satu |
| `Missing post description...` | Description kosong di semua sumber | Isi `repliz-publish.json`/`publish-captions.md` |
| `Missing YouTube post title...` | Target YouTube aktif tapi title kosong & tidak bisa diturunkan dari description | Isi `post.title` atau blok `## YouTube Title` |
| `Threads post/reply exceeds 150 characters...` | Target Threads aktif dan salah satu bubble > 150 karakter | Pendekkan bubble di `## Threads` (`publish-captions.md`) atau `post.threads` |
| `R2 public URL is not reachable: <status>` | Domain publik salah / objek belum ada | Cek `R2_PUBLIC_BASE_URL`, ulangi |
| `Repliz account <id> is not connected` | Akun belum connect | Hubungkan akun di Repliz |
| `... expected <platform>, got <type>` | ID akun salah platform | Perbaiki env ID |

## Multi-akun & timeout

- Kegagalan satu akun tidak menggagalkan lainnya; akun gagal ditandai `error`.
- Setiap respons scheduling disimpan atomik sebelum akun berikutnya/polling.
  Gagal menulis receipt menghentikan scheduling lanjutan.
- Poll timeout 120s atau polling gagal → ID yang sudah diterima tetap di receipt;
  jalankan ulang untuk GET/resume tanpa POST duplikat pada target tersebut.
- Respons POST yang hilang karena gangguan jaringan tetap ambigu; cek Repliz
  sebelum mengulang akun `error`. Jangan memakai `--force` untuk resume polling.
- Render blur menggunakan `--file videos/<slug>/renders/<slug>-blur.mp4`;
  pastikan file tersebut yang disetujui user.

## Keamanan

- Jangan commit `.env`, receipt post live, atau media privat.
- Publish tidak butuh S3 access key / R2 secret key / `wrangler.jsonc`.
- Lihat [security-standard](../security/security-standard.md).
