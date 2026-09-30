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
REPLIZ_THREADS_ACCOUNT_ID=...
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
  "instagram": "REPLIZ_INSTAGRAM_ACCOUNT_ID",
  "threads": "REPLIZ_THREADS_ACCOUNT_ID"
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

## Threads Character Limits

Threads adalah platform 150-karakter-per-bubble: satu post utama, lalu rantai
reply, masing-masing maksimal **150 karakter**. Ini berbeda dari platform lain
di atas (yang memakai `description` panjang penuh), jadi Threads tidak
mengirim `post.description` apa adanya — ia mengirim `post.threads.post`
sebagai body utama dan `post.threads.replies[]` sebagai rantai balasan.

Sumber `post.threads` (prioritas, dibaca `readPostMetadata`):

1. `repliz-publish.json` `post.threads = { "post": "...", "replies": ["...", ...] }` (eksplisit).
2. `publish-captions.md` heading eksak `## Threads`: setiap blok berpagar
   ` ```text ` di section itu adalah satu bubble, berurutan. Blok pertama =
   post utama, blok berikutnya = reply chain.
3. Fallback otomatis: word-wrap `description` (sumber yang sama dipakai
   Instagram/TikTok) ke potongan ≤150 karakter pada batas kata, tanpa memotong
   kata di tengah kecuali satu kata tunggal memang lebih panjang dari 150
   karakter.

Setiap bubble (post + tiap reply) divalidasi ≤150 karakter **sebelum** upload
R2 atau network call apa pun; bubble yang kelewat panjang membuat publish
berhenti dengan pesan yang menyebut bubble mana dan berapa karakter
kelebihannya.

Karena kontennya rantai balasan bukan satu caption panjang, tulis Threads
sebagai thread asli — beat-beat pendek berdiri sendiri — bukan caption
Instagram yang di-word-wrap begitu saja. Fallback word-wrap tetap ada supaya
Threads tidak pernah memblokir publish pada video yang caption-nya ditulis
sebelum Threads didukung, tapi opsi 2 (ditulis manual) adalah default yang
disarankan untuk kualitas.

Payload reply Repliz (`ScheduleReply`, lihat `docs/repliz/openapi.json`):

```json
{ "title": "", "description": "<bubble text>", "topic": "<post.topic>", "type": "text", "medias": [] }
```

## Per-Target Publish Idempotency

Menambah satu platform target baru ke slug yang sudah pernah publish (misalnya
mengisi `REPLIZ_THREADS_ACCOUNT_ID` setelah Facebook/YouTube sudah sukses)
**tidak** boleh mengirim ulang platform yang sudah sukses. Idempotensi
dievaluasi per `platform:accountId`, bukan per seluruh target set — detail
lengkap: [ADR-0011](../../internal/docs/adr/0011-per-target-publish-idempotency.md)
dan [requirements/rd-01-publish-pipeline](../../internal/docs/requirements/rd-01-publish-pipeline.md).

Ringkas: setiap target dibandingkan lewat `targetKey` = `sha256({r2Key,
platform, accountId, description, title, replies})` terhadap entry
`platform:accountId` yang sama di `schedules[]` receipt sebelumnya.

- Tidak ada entry sebelumnya, entry berstatus `error`, atau `--force` → jadwalkan.
- Entry ada, `targetKey` sama, status bukan `error` → reuse entry lama,
  tanpa POST baru; pending/process tetap dipoll lewat GET.
- Entry ada, `targetKey` beda (caption/judul/Threads-reply berubah untuk
  platform yang sudah sukses), tanpa `--force` → `blocked`: platform itu
  **tidak** dijadwalkan ulang, dicatat di `receipt.blocked[]` dan dicetak di
  CLI dengan pesan yang mengarahkan ke `--force`.

Upload R2 + validasi akun hanya dijalankan bila ada minimal satu target yang
akan dijadwalkan. Bila tidak ada target baru (semua reuse atau blocked),
publish skip tanpa upload/POST baru, tetapi reused pending/process tetap
dipoll lewat GET. Riwayat blocked dan akun sementara nonaktif tetap disimpan.
Setiap hasil scheduling di-checkpoint atomik sebelum akun berikutnya/polling;
gagal polling tetap menyisakan ID untuk resume. Detail durability:
[ADR-0028](../../internal/docs/adr/0028-durable-publish-receipts.md).

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
# Jika user memilih QA dulu, jalankan fase QA (docs/agents/04-qa.md) lalu kembali ke gate review ini.
# Setelah user approve/confirm hasil edit untuk publish:
npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved
```

Minimal script behavior:

1. Tolak publish jika CLI tidak diberi `--approved`.
2. Baca env Repliz dan R2 public config.
3. Baca metadata publish dari `videos/<slug>/repliz-publish.json` atau fallback `videos/<slug>/publish-captions.md`; hentikan publish jika `description` kosong, jika target YouTube aktif dan `title` tidak bisa di-resolve, atau jika target Threads aktif dan salah satu bubble `post.threads` melebihi 150 karakter.
4. Bentuk target account dari `REPLIZ_FACEBOOK_ACCOUNT_ID`, `REPLIZ_YOUTUBE_ACCOUNT_ID`, `REPLIZ_TIKTOK_ACCOUNT_ID`, `REPLIZ_INSTAGRAM_ACCOUNT_ID`, dan `REPLIZ_THREADS_ACCOUNT_ID`.
5. Bagi target per `platform:accountId` menjadi *dijadwalkan* (baru/error/`--force`), *reuse* (`targetKey` sama dengan entry sukses sebelumnya), atau *blocked* (`targetKey` beda dari entry sukses sebelumnya, tanpa `--force`) — lihat Per-Target Publish Idempotency di atas.
6. Poll reused pending/process lewat ID lama; tanpa target baru, simpan status/key/blocked yang berubah lalu skip tanpa upload/POST.
7. Bila ada target baru: upload `--file` ke R2, verifikasi URL publik, lalu validasi seluruh accountId yang akan dijadwalkan sebelum POST pertama.
8. Buat schedule per target dan checkpoint setiap hasil dengan `targetKey` sebelum POST berikutnya atau polling; gagal checkpoint menghentikan run.
9. Poll schedule baru sampai terminal `success/error` atau timeout, lalu checkpoint final.
10. Receipt menggabungkan seluruh riwayat target (termasuk blocked/nonaktif) dan hasil terbaru untuk target yang sama; bukan hanya reused + baru.

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
      "postId": "platform_post_id_if_returned",
      "targetKey": "sha256:..."
    }
  ],
  "blocked": [
    {
      "platform": "instagram",
      "accountId": "680affa5ce12f2f72916f67e",
      "reason": "content changed since the last successful publish; rerun with --force to repost"
    }
  ]
}
```

`targetKey` is per-schedule-entry (see Per-Target Publish Idempotency above);
`blocked` is only present when at least one already-succeeded target's content
changed and the run was not `--force`d.

Do not store Repliz access keys, Repliz secret keys, Cloudflare API tokens, full Basic Auth headers, or signed URLs.

## Failure Rules

- Missing env: fail before network call.
- Missing `--file` argument: fail before network call. Missing media on disk fails before a new upload (a reused pending schedule may already have made GET polling calls).
- Missing `--approved`: fail before R2 upload or Repliz scheduling.
- No target account IDs configured: fail before network call.
- Wrangler missing or not authenticated: fail before creating Repliz schedules.
- R2 upload failure: fail before creating Repliz schedules.
- R2 public URL is not reachable with HTTP 200/206: fail before creating Repliz schedules.
- Account missing/disconnected: account validation throws before any new schedule POST in that run; R2 may already have been uploaded.
- One account schedule fails in a multi-account publish: keep successful `scheduleId`s in receipt and mark failed account with error message.
- A Threads post or reply bubble exceeds 150 characters: fail before R2 upload or Repliz scheduling, naming which bubble and its length.
- Poll timeout: keep receipt as non-terminal and print command to resume status check.
- Poll failure: keep checkpointed pending IDs and resume them through GET on ordinary rerun.
- Receipt write failure: stop before scheduling another target; retain the prior complete receipt through atomic replacement.
- A POST response lost before its ID is received: store an error; inspect Repliz before explicit rerun (error entries are retried even without `--force`). No retry POST occurs inside the same run.
- A target whose content changed since its last successful publish, without `--force`: do not schedule it; record it in `receipt.blocked[]` and print it, but still proceed with any other target that needs scheduling.

## Acceptance Criteria

- Given Wrangler is authenticated and a local MP4 exists, the script uploads the file to R2 and records `r2Key`.
- Given `--approved` is missing, the script fails before R2 upload or Repliz scheduling.
- Given a valid Repliz credential, connected accountId, caption, and R2 public MP4 URL, the script creates a schedule and records `scheduleId`.
- Given Facebook, YouTube, TikTok, Instagram, and Threads account IDs in `.env`, the script creates one Repliz schedule per configured platform and records all schedule IDs.
- Given the same video/caption/accounts twice, the second run exits without creating duplicate schedules unless `--force` is used.
- Given a slug that already published successfully to some platforms, and a newly configured platform added to `.env` (e.g. Threads), the second run schedules only the new platform and leaves the already-successful platforms' receipt entries untouched.
- Given a slug whose caption changed after a platform already succeeded, rerunning without `--force` does not resend that platform and records it in `blocked`.
- Given a disconnected account, no schedule is created.
- Given a successful schedule, status polling updates local receipt to `success`.
- Given a Threads target with a caption longer than 150 characters and no manually authored `## Threads` thread, the script auto-wraps it into a post + reply chain, each ≤150 characters.
- Given a Threads target with a post or reply over 150 characters (manually authored or explicit `post.threads`), the script fails before any network call.
