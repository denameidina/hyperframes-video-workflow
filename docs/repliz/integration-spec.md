# Repliz Auto Publish Integration Spec

**Goal:** setelah video final selesai dirender, pipeline bisa membuat scheduled post di Repliz otomatis untuk satu atau lebih akun sosial.

**Source API:** `docs/repliz/openapi.json`.

## Scope

Masuk scope:

- Ambil akun Repliz dan validasi akun masih `isConnected`.
- Upload MP4 render final ke Cloudflare R2.
- Publish video final sebagai post Repliz lewat `POST /public/schedule`.
- Support multi-account dengan membuat satu schedule per `accountId`.
- Simpan receipt lokal berisi `scheduleId`, status, dan payload non-secret.
- Cegah accidental duplicate publish dari render yang sama.
- Wajib ada approval user setelah review hasil edit sebelum upload R2 dan scheduling Repliz.

Di luar scope MVP:

- OAuth/connect akun sosial baru.
- Upload file langsung ke Repliz, karena OpenAPI tidak menyediakan endpoint upload media.
- Signed URL R2 per-object. MVP memakai public/custom domain supaya Repliz bisa fetch video saat publish.
- Comment/reply automation setelah publish.

## Required Configuration

Credentials disimpan di environment, bukan di file repo:

```bash
REPLIZ_API_BASE_URL=<repliz-api-base-url>
REPLIZ_ACCESS_KEY=<repliz-access-key>
REPLIZ_SECRET_KEY=<repliz-secret-key>

R2_BUCKET=<r2-bucket>
R2_PUBLIC_BASE_URL=https://<r2-public-domain>
R2_PREFIX=<r2-prefix>
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>

REPLIZ_FACEBOOK_ACCOUNT_ID=...
REPLIZ_YOUTUBE_ACCOUNT_ID=...
REPLIZ_TIKTOK_ACCOUNT_ID=...
REPLIZ_INSTAGRAM_ACCOUNT_ID=...
```

`REPLIZ_API_BASE_URL` wajib configurable karena OpenAPI tidak mendefinisikan `servers`.

Cloudflare R2 upload memakai Wrangler, bukan S3 access key/secret:

- Local machine: login Wrangler biasa dengan `npx wrangler login`, lalu set `CLOUDFLARE_ACCOUNT_ID` ke target Cloudflare Account ID.
- CI/automation: set `CLOUDFLARE_ACCOUNT_ID` dan `CLOUDFLARE_API_TOKEN` di environment runner.
- Token harus punya akses R2 object read/write untuk bucket target.
- Tidak perlu `wrangler.jsonc` untuk flow ini. Script memilih account lewat env `CLOUDFLARE_ACCOUNT_ID`.

Target R2 aktif:

```text
bucket: <r2-bucket>
public base URL: https://<r2-public-domain>
object key: <r2-prefix>/<slug>/<renderBasename>
```

Target publish default dibaca dari `.env`:

```json
{
  "facebook": "REPLIZ_FACEBOOK_ACCOUNT_ID",
  "youtube": "REPLIZ_YOUTUBE_ACCOUNT_ID",
  "tiktok": "REPLIZ_TIKTOK_ACCOUNT_ID",
  "instagram": "REPLIZ_INSTAGRAM_ACCOUNT_ID"
}
```

Per video/project, integrasi membutuhkan metadata post dengan `description`
non-empty. Source priority:

1. `videos/<slug>/repliz-publish.json` `post.description`
2. `videos/<slug>/repliz-publish.json` root `description`
3. `videos/<slug>/publish-captions.md` `## Instagram` fenced `text` block
4. `videos/<slug>/publish-captions.md` `## TikTok` fenced `text` block

Jika semua source kosong, script berhenti sebelum upload R2 atau scheduling Repliz.

`title` wajib non-empty untuk YouTube. Source priority:

1. `videos/<slug>/repliz-publish.json` `post.title`
2. `videos/<slug>/repliz-publish.json` root `title`
3. `videos/<slug>/publish-captions.md` `## YouTube Title` fenced `text` block
4. Derivasi otomatis dari `description`: baris non-kosong pertama yang bukan
   baris hashtag, dinormalisasi spasinya dan dipotong di batas kata maksimal
   `100` karakter.

Jika `REPLIZ_YOUTUBE_ACCOUNT_ID` terisi dan title tetap kosong setelah semua
source di atas, script berhenti sebelum upload R2 atau scheduling Repliz. Title
yang sama dikirim ke semua platform; hanya YouTube yang divalidasi non-empty.

```json
{
  "type": "video",
  "title": "Judul YouTube final",
  "description": "Caption final untuk post",
  "topic": "",
  "tags": [],
  "mentions": [],
  "targetCountries": ["ID"],
  "scheduleAt": "now"
}
```

Default `type` adalah `video`, karena Repliz mendukung video untuk Facebook, Instagram, Threads, TikTok, YouTube, dan LinkedIn. `reel` tidak dipakai sebagai default karena dokumentasi menyebut Reels hanya untuk Facebook.

## Cloudflare R2 Upload Requirement

`POST /public/schedule` menerima media sebagai URL publik:

```json
{
  "type": "video",
  "medias": [
    {
      "alt": "",
      "customThumbnail": false,
      "type": "video",
      "thumbnail": "",
      "url": "https://<r2-public-domain>/<r2-prefix>/0702-2/final.mp4"
    }
  ]
}
```

Karena OpenAPI Repliz tidak punya upload endpoint, pipeline wajib upload MP4 final ke Cloudflare R2 lalu memakai public URL R2 sebagai `medias[0].url`.

1. Render video dengan flow HyperFrames yang sudah ada.
2. Upload MP4 hasil render ke R2 memakai Wrangler CLI.
3. Bentuk `videoUrl` dari `R2_PUBLIC_BASE_URL + "/" + objectKey`.
4. Kirim URL R2 itu ke Repliz schedule.

Upload command:

```bash
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}" npx wrangler r2 object put "${R2_BUCKET}/${objectKey}" --remote --file "${renderFile}" --content-type video/mp4
```

Object key default:

```text
${R2_PREFIX}/${slug}/${renderBasename}
```

Contoh:

```text
<r2-prefix>/0702-2/final.mp4
```

Upload wajib mengirim `Content-Type: video/mp4`. `R2_PUBLIC_BASE_URL` harus berupa custom/public domain yang bisa diakses Repliz tanpa Authorization header.

## API Contract

Semua request memakai HTTP Basic Auth:

```text
Authorization: Basic base64(REPLIZ_ACCESS_KEY:REPLIZ_SECRET_KEY)
```

### Validate Account

Gunakan salah satu:

- `GET /public/account?page=1&limit=20&types=tiktok`
- `GET /public/account?page=1&limit=20&types=facebook&types=youtube&types=tiktok&types=instagram`
- `GET /public/account/{accountId}`

Publish diblokir jika akun tidak ditemukan, `isConnected !== true`, atau platform akun tidak cocok dengan env target. Empty env target dilewati; kalau semua target kosong, publish gagal sebelum network call.

### Create Schedule

Endpoint:

```text
POST /public/schedule
```

YouTube description sanitizer:

- Before creating a YouTube schedule, sanitize `description` only for the YouTube payload.
- Replace arrow pipeline notation such as `->`, `=>`, or `→` with natural text (`ke`).
- Replace slash-heavy word pairs such as `Repliz/API` with `Repliz dan API`.
- Keep the original caption for Facebook, TikTok, Instagram, and the local receipt.

YouTube title sanitizer:

- Collapse whitespace and trim on every platform.
- For YouTube only, drop `<` dan `>` (ditolak YouTube) lalu potong di batas kata
  maksimal `100` karakter.
- Reject the YouTube schedule when the sanitized title is empty.

Payload per akun:

```json
{
  "title": "Judul YouTube final",
  "description": "Caption final untuk post",
  "topic": "",
  "type": "video",
  "medias": [
    {
      "alt": "",
      "customThumbnail": false,
      "type": "video",
      "thumbnail": "",
      "url": "https://<r2-public-domain>/<r2-prefix>/0702-2/final.mp4"
    }
  ],
  "meta": {
    "title": "",
    "description": "",
    "url": ""
  },
  "additionalInfo": {
    "isAiGenerated": false,
    "isDraft": false,
    "collaborators": [],
    "music": {
      "id": "",
      "artist": "",
      "name": "",
      "thumbnail": ""
    },
    "products": [],
    "tags": [],
    "mentions": [],
    "link": "",
    "targetCountries": ["ID"]
  },
  "replies": [],
  "accountId": "680affa5ce12f2f72916f67e",
  "scheduleAt": "2026-07-03T01:40:08.119Z"
}
```

Response sukses:

```json
{ "scheduleId": "69c7532ff0c3b7c83ab9e681" }
```

Catatan schema: `ScheduleMedia.type` di OpenAPI bertipe number enum `0|1`, tetapi semua contoh resmi memakai string `"image"` atau `"video"`. Implementasi MVP mengikuti contoh resmi dulu. Jika API production menolak payload ini, mapping numerik harus dikonfirmasi ke Repliz sebelum diubah.

### Check Status

Gunakan:

```text
GET /public/schedule/{scheduleId}
```

Status yang diketahui dari docs:

- `pending`
- `process`
- `error`
- `success`

Jika status `error`, operator bisa retry:

```text
PUT /public/schedule/{scheduleId}/retry
```

## Local Workflow

Command target:

```bash
npm run render
# Stop di sini dulu. Kirim hasil render ke user untuk review.
# Pilihan user: publish as-is, QA dulu, atau revisi.
# Jika user memilih QA dulu, jalankan Agent 07 lalu kembali ke gate review ini.
# Setelah user approve/confirm hasil edit untuk publish:
npm run repliz:publish -- --slug videos/0702-2 --file renders/final.mp4 --approved
```

Minimal script behavior:

1. Tolak publish jika CLI tidak diberi `--approved`.
2. Baca env Repliz dan R2 public config.
3. Baca metadata publish dari `videos/<slug>/repliz-publish.json` atau fallback `videos/<slug>/publish-captions.md`; hentikan publish jika `description` kosong, atau jika target YouTube aktif dan `title` tidak bisa di-resolve.
4. Bentuk target account dari `REPLIZ_FACEBOOK_ACCOUNT_ID`, `REPLIZ_YOUTUBE_ACCOUNT_ID`, `REPLIZ_TIKTOK_ACCOUNT_ID`, dan `REPLIZ_INSTAGRAM_ACCOUNT_ID`.
5. Upload `--file` ke R2 dengan Wrangler jika object belum ada atau `--force` dipakai.
6. Bentuk `videoUrl` dari public R2 URL.
7. Tolak publish ulang jika receipt untuk kombinasi `r2Key + targetAccounts + description + title` sudah ada, kecuali diberi `--force`.
8. Validasi semua accountId lewat Repliz.
9. Buat schedule untuk tiap accountId.
10. Simpan receipt lokal.
11. Poll status sampai terminal `success/error` atau timeout.

Default `scheduleAt`:

- `"now"` berarti current time + 60 detik dalam ISO UTC, supaya tidak dianggap waktu lampau oleh API.
- ISO date-time eksplisit dikirim apa adanya.

## Receipt File

Simpan ke:

```text
videos/<slug>/repliz-publish.json
```

Format:

```json
{
  "r2Bucket": "<r2-bucket>",
  "r2Key": "<r2-prefix>/0702-2/final.mp4",
  "videoUrl": "https://<r2-public-domain>/<r2-prefix>/0702-2/final.mp4",
  "descriptionHash": "sha256:...",
  "titleHash": "sha256:...",
  "createdAt": "2026-07-03T01:40:08.119Z",
  "schedules": [
    {
      "accountId": "680affa5ce12f2f72916f67e",
      "platform": "tiktok",
      "scheduleId": "69c7532ff0c3b7c83ab9e681",
      "status": "success",
      "postId": "platform_post_id_if_returned"
    }
  ]
}
```

Do not store Repliz access keys, Repliz secret keys, Cloudflare API tokens, full Basic Auth headers, or signed URLs.

## Failure Rules

- Missing env: fail before network call.
- Missing `--file`: fail before network call.
- Missing `--approved`: fail before R2 upload or Repliz scheduling.
- No target account IDs configured: fail before network call.
- Wrangler missing or not authenticated: fail before creating Repliz schedules.
- R2 upload failure: fail before creating Repliz schedules.
- R2 public URL is not reachable with HTTP 200/206: fail before creating Repliz schedules.
- Account missing/disconnected: fail before creating any schedules.
- One account schedule fails in a multi-account publish: keep successful `scheduleId`s in receipt and mark failed account with error message.
- Poll timeout: keep receipt as non-terminal and print command to resume status check.

## Acceptance Criteria

- Given Wrangler is authenticated and a local MP4 exists, the script uploads the file to R2 and records `r2Key`.
- Given `--approved` is missing, the script fails before R2 upload or Repliz scheduling.
- Given a valid Repliz credential, connected accountId, caption, and R2 public MP4 URL, the script creates a schedule and records `scheduleId`.
- Given Facebook, YouTube, TikTok, and Instagram account IDs in `.env`, the script creates one Repliz schedule per configured platform and records all schedule IDs.
- Given the same video/caption/accounts twice, the second run exits without creating duplicate schedules unless `--force` is used.
- Given a disconnected account, no schedule is created.
- Given a successful schedule, status polling updates local receipt to `success`.
