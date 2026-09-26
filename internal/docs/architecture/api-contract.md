# API Contract
Status: accepted (reverse-engineered)
Date: 2026-07-20

Kanonik untuk: kontrak eksternal (Repliz API, Cloudflare R2 via Wrangler) dan
surface fungsi internal CLI publish. Diturunkan dari `scripts/repliz-publish.mjs`,
`scripts/repliz-publish.test.mjs`, `docs/repliz/openapi.json`, dan
`docs/repliz/integration-spec.md`.

Repo ini **tidak mengekspos API sendiri**. Kontrak di sini adalah API yang
*dikonsumsi* + kontrak CLI internal.

## 1. Cloudflare R2 (via Wrangler CLI)

Upload via `uploadToR2` (`repliz-publish.mjs:274`). Bukan S3 API, bukan signed
URL — memakai Wrangler remote put.

Command yang dijalankan:

```bash
npx wrangler r2 object put "<R2_BUCKET>/<r2Key>" --remote --file "<file>" --content-type video/mp4 [--force]
```

- Dijalankan dengan env `CLOUDFLARE_ACCOUNT_ID=<config.cloudflareAccountId>`
  (di-inject ke child process, `repliz-publish.mjs:291`).
- `--force` ditambahkan hanya bila flag `--force` dipakai.
- `access(file)` dipanggil dulu; file tidak ada → throw sebelum upload.
- **Object key** (`buildR2Key`, `repliz-publish.mjs:68`):
  `<R2_PREFIX>/<basename(slug)>/<basename(file)>`, prefix default `final-renders`,
  slash pinggir dipangkas.
- **Public URL** (`buildPublicUrl`, `repliz-publish.mjs:75`):
  `<R2_PUBLIC_BASE_URL tanpa trailing slash>/<key, tiap segmen encodeURIComponent>`.

### Verifikasi reachability

`verifyPublicUrl` (`repliz-publish.mjs:297`): `GET <videoUrl>` dengan header
`Range: bytes=0-0`. Diterima jika status **200 atau 206**; selain itu throw
`R2 public URL is not reachable: <status>`.

## 2. Repliz API

Base URL = `REPLIZ_API_BASE_URL` (OpenAPI `docs/repliz/openapi.json`,
`title: Repliz API`, `version: 1.0.0`, `servers: []` — makanya base URL wajib
dari env). 53 path total; CLI ini memakai **3**.

**Auth:** HTTP Basic — `Authorization: Basic base64(REPLIZ_ACCESS_KEY:REPLIZ_SECRET_KEY)`
(`basicAuthHeader`, `repliz-publish.mjs:306`). Semua request JSON pakai
`Content-Type: application/json`. Non-2xx → throw `data.message` atau
`Repliz API failed: <status>`.

### 2.1 GET `/public/account/{accountId}` — validasi akun

`validateAccounts` (`repliz-publish.mjs:339`). Untuk tiap target account:

- Panggil `GET /public/account/<encoded accountId>`.
- Tolak (throw) jika `account.isConnected !== true` →
  `Repliz account <id> is not connected`.
- Tolak jika `account.type !== target.platform` →
  `Repliz account <id> expected <platform>, got <type>`.

Alternatif listing (integration spec): `GET /public/account?page=1&limit=20&types=tiktok`.

### 2.2 POST `/public/schedule` — buat schedule

`createSchedules` (`repliz-publish.mjs:358`) memanggil satu POST per target
account. Payload dibangun `buildSchedulePayload` (`repliz-publish.mjs:228`):

```json
{
  "title": "<sanitized title>",
  "description": "<sanitized description>",
  "topic": "<post.topic>",
  "type": "<post.type, default 'video'>",
  "medias": [
    { "alt": "", "customThumbnail": false, "type": "video", "thumbnail": "", "url": "<videoUrl>" }
  ],
  "meta": { "title": "", "description": "", "url": "" },
  "additionalInfo": {
    "isAiGenerated": false, "isDraft": false, "collaborators": [],
    "music": { "id": "", "artist": "", "name": "", "thumbnail": "" },
    "products": [],
    "tags": ["..."], "mentions": ["..."], "link": "",
    "targetCountries": ["ID"]
  },
  "replies": [],
  "accountId": "<accountId>",
  "scheduleAt": "<ISO>"
}
```

- **`description` wajib non-empty** — `requireDescription` throw
  `Missing <platform> post description` jika kosong/whitespace.
- **`scheduleAt`** (`scheduleAtIso`, `repliz-publish.mjs:202`): `"now"` (atau
  falsy) → `now + 60_000 ms` dalam ISO; nilai lain → `new Date(value).toISOString()`.
- **Sukses** → response `{ scheduleId }`, disimpan dengan `status: "pending"`.
  Error per-akun ditangkap → entry `{ status: "error", error }` (tidak
  menggagalkan akun lain).
- **Sanitizer YouTube** (`sanitizeDescriptionForPlatform`, `repliz-publish.mjs:209`)
  — hanya platform `youtube`:
  - Panah `-> => → ➜ ➔` diganti ` ke `.
  - Pasangan `kata/kata` (huruf/angka) → `kata dan kata`, kecuali didahului
    `://` (jaga URL).
  - Rapikan spasi/newline berlebih. Platform lain memakai caption apa adanya.
  - Catatan schema: `ScheduleMedia.type` di OpenAPI enum angka `0|1`, tapi contoh
    resmi memakai string `"image"`/`"video"`; MVP mengikuti string.

### 2.3 GET `/public/schedule/{scheduleId}` — poll status

`pollSchedules` (`repliz-publish.mjs:394`). Loop hingga semua terminal atau
timeout:

- **Timeout** default `120_000 ms`, **interval** default `5_000 ms`.
- Untuk tiap schedule non-terminal dengan `scheduleId`, panggil
  `GET /public/schedule/<encoded scheduleId>`; set `schedule.status` dari
  `detail.status`, set `postId` bila ada.
- Terminal statuses: **`success`**, **`error`**. Status lain yang mungkin
  (integration spec): `pending`, `process`. Retry manual:
  `PUT /public/schedule/{scheduleId}/retry`.
- Jika `pendingCount === 0` atau semua terminal → return. Jika timeout →
  return apa adanya (receipt non-terminal; user diberi resume command).

## 3. Surface fungsi internal (CLI publish)

`scripts/repliz-publish.mjs` mengekspor fungsi murni + berefek (dipakai test).
Semua efek eksternal (`runCommand`, `fetchImpl`, `now`, `sleep`) di-inject agar
testable.

| Fungsi | Peran |
| --- | --- |
| `parseArgs(argv)` | Parse `--slug`, `--file`, `--approved`, `--force`, `--help`; wajib slug+file |
| `buildTargetAccounts(env)` | Map 4 env ID → `{platform, accountId}`, skip kosong |
| `buildR2Key({prefix,slug,file})` | Susun object key R2 |
| `buildPublicUrl(baseUrl,key)` | Susun public URL (encode segmen) |
| `sha256(value)` | `"sha256:" + hex` |
| `makePublishKey({r2Key,targetAccounts,description})` | Hash idempotensi (targets di-sort) |
| `shouldSkipPublish(receipt,publishKey,force)` | Skip bila key sama & ada schedules & !force |
| `readJsonIfExists(path)` / `readPostMetadata(slugDir)` | Baca metadata + fallback caption |
| `scheduleAtIso(scheduleAt, now)` | Normalisasi waktu jadwal |
| `sanitizeDescriptionForPlatform(desc, platform)` | Sanitasi khusus YouTube |
| `buildSchedulePayload({...})` | Bentuk payload POST /public/schedule |
| `uploadToR2({...})` | Upload via Wrangler |
| `verifyPublicUrl(url, fetchImpl)` | Cek 200/206 |
| `basicAuthHeader({...})` | Header Basic Auth |
| `validateAccounts({...})` | Validasi tiap akun |
| `createSchedules({...})` | POST schedule per akun |
| `pollSchedules({...})` | Poll hingga terminal/timeout |
| `loadConfig(env)` | Validasi + baca 6 env wajib |
| `runPublish({...})` | Orkestrasi end-to-end (entry testable) |

Alur `runPublish` (`repliz-publish.mjs:458`): parseArgs → cek `--approved` →
loadConfig → buildTargetAccounts → readPostMetadata (+ cek description) →
buildR2Key/videoUrl/publishKey → shouldSkipPublish → uploadToR2 →
verifyPublicUrl → validateAccounts → createSchedules → pollSchedules →
writeReceipt.

## Referensi

- EARS lengkap: [rd-01-publish-pipeline](../requirements/rd-01-publish-pipeline.md).
- Data receipt/metadata: [data-model](data-model.md).
- Operasi publish: [operations/publish-runbook](../operations/publish-runbook.md).
