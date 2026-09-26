# Data Model
Status: accepted (reverse-engineered)
Date: 2026-07-20

Kanonik untuk: semua entitas data, file kontrak, dan bentuk JSON di repo ini.
Repo tidak punya database — "data model" = file di working dir `videos/<slug>/`,
konfigurasi env, dan file project-level. Diturunkan dari
`scripts/repliz-publish.mjs`, `scripts/repliz-publish.test.mjs`, `index.html`,
`.env.example`, `meta.json`, `hyperframes.json`, dan spec di `docs/`.

## Peta entitas

| Entitas | Lokasi | Format | Owner (fase) |
| --- | --- | --- | --- |
| Env config | `.env` (template `.env.example`) | dotenv | manusia |
| Publish receipt / metadata | `videos/<slug>/repliz-publish.json` | JSON | CLI publish + manusia |
| Publish captions | `videos/<slug>/publish-captions.md` | Markdown | Screen Plan |
| Creative brief | `videos/<slug>/creative-brief.md` | Markdown | Story |
| Cut list | `videos/<slug>/cut-list.json` | JSON | Story |
| Media metadata | `videos/<slug>/metadata.json` | JSON | Story |
| Transcript | `videos/<slug>/transcript.json` | JSON (whisper) | Story |
| Processed transcript | `videos/<slug>/processed-transcript.json` | JSON (whisper, waktu processed) | Story |
| Caption beats | `videos/<slug>/caption-beats.json` | JSON | Screen Plan |
| Asset manifest | `videos/<slug>/assets/asset-manifest.json` | JSON | Build |
| Overlay timeline | `videos/<slug>/overlay-timeline.json` | JSON | Screen Plan |
| Visual plan | `videos/<slug>/visual-plan.md` | Markdown | Screen Plan |
| Komposisi video | `videos/<slug>/index.html`, `videos/<slug>/compositions/*.html` (di-ignore) | HTML+GSAP | Build |
| Project meta | `meta.json` | JSON | HyperFrames |
| HyperFrames config | `hyperframes.json` | JSON | HyperFrames |

> Semua `videos/<slug>/**` di-ignore git kecuali `.gitkeep` (lihat
> `.gitignore`). Data ini lokal dan tidak masuk repo publik.

## Env config

Dari `.env.example` dan `loadConfig()` / `buildTargetAccounts()` di
`scripts/repliz-publish.mjs`.

**Wajib** (publish gagal jika salah satu kosong — `loadConfig`,
`repliz-publish.mjs:429`):

- `REPLIZ_API_BASE_URL` — base URL Repliz (OpenAPI tidak punya `servers`, jadi
  base URL harus dikonfigurasi).
- `REPLIZ_ACCESS_KEY`, `REPLIZ_SECRET_KEY` — kredensial HTTP Basic Auth.
- `CLOUDFLARE_ACCOUNT_ID` — dipilih per invocation, bukan lewat `wrangler.jsonc`.
- `R2_BUCKET` — nama bucket R2 tujuan.
- `R2_PUBLIC_BASE_URL` — domain publik/custom yang bisa di-fetch Repliz tanpa auth.

**Opsional:**

- `R2_PREFIX` — default `final-renders` bila kosong.
- Target akun (platform tanpa ID akan dilewati) — `buildTargetAccounts`,
  `repliz-publish.mjs:58`:
  - `REPLIZ_FACEBOOK_ACCOUNT_ID` → platform `facebook`
  - `REPLIZ_YOUTUBE_ACCOUNT_ID` → platform `youtube`
  - `REPLIZ_TIKTOK_ACCOUNT_ID` → platform `tiktok`
  - `REPLIZ_INSTAGRAM_ACCOUNT_ID` → platform `instagram`

Secret tidak boleh masuk git (`.gitignore` mengabaikan `.env` + `.env.*` kecuali
`.env.example`). Lihat [security-standard](../security/security-standard.md).

## `repliz-publish.json` — receipt + metadata (entitas sentral)

File dwifungsi: **input metadata** (dibaca `readPostMetadata`) dan **output
receipt** (ditulis `writeReceipt`, `repliz-publish.mjs:452`).

### Sebagai input (metadata post)

`readPostMetadata` (`repliz-publish.mjs:163`) menerima dua bentuk:

- Root object: `{ "description": "...", "tags": [...], ... }`
- Post object: `{ "post": { "description": "...", ... } }`

Field post (default dari `DEFAULT_POST`, `repliz-publish.mjs:22`):

| Field | Tipe | Default | Catatan |
| --- | --- | --- | --- |
| `title` | string | `""` | Wajib non-empty untuk YouTube; auto-derive dari `description` bila kosong |
| `description` | string | `""` | Wajib non-empty saat publish (lihat prioritas di bawah) |
| `topic` | string | `""` | |
| `type` | string | `"video"` | Repliz media type; default `video`, bukan `reel` |
| `tags` | string[] | `[]` | Masuk `additionalInfo.tags` |
| `mentions` | string[] | `[]` | Masuk `additionalInfo.mentions` |
| `targetCountries` | string[] | `["ID"]` | Masuk `additionalInfo.targetCountries` |
| `scheduleAt` | string | `"now"` | `"now"` → sekarang + 60 detik ISO; ISO lain dikirim apa adanya |

**Prioritas sumber `description`** (`readPostMetadata` + `readPublishDescription`):

1. `repliz-publish.json` → `post.description`
2. `repliz-publish.json` → root `description`
3. `publish-captions.md` → blok `## Instagram`
4. `publish-captions.md` → blok `## TikTok`

Jika keempatnya kosong, publish berhenti sebelum upload/scheduling.

**Prioritas sumber `title`** (`readPostMetadata` + `readPublishTitle` +
`deriveTitleFromDescription`):

1. `repliz-publish.json` → `post.title`
2. `repliz-publish.json` → root `title`
3. `publish-captions.md` → blok `## YouTube Title`
4. Derivasi dari `description`: baris non-kosong pertama yang bukan baris
   hashtag, whitespace dinormalkan, dipotong di batas kata maksimal 100 karakter

Title dikirim ke payload semua platform. Untuk YouTube, `<`/`>` dibuang dan
title dipotong ke maksimal 100 karakter; jika hasilnya kosong sementara target
YouTube aktif, publish berhenti sebelum upload/scheduling.

### Sebagai output (receipt)

Ditulis setelah publish sukses (`repliz-publish.mjs:452`):

```json
{
  "post": { "...": "post object di atas" },
  "r2Bucket": "<R2_BUCKET>",
  "r2Key": "<prefix>/<slug-basename>/<file-basename>",
  "videoUrl": "<R2_PUBLIC_BASE_URL>/<r2Key url-encoded>",
  "descriptionHash": "sha256:<hex>",
  "titleHash": "sha256:<hex>",
  "publishKey": "sha256:<hex>",
  "createdAt": "<ISO now>",
  "schedules": [
    {
      "accountId": "<id>",
      "platform": "tiktok|instagram|youtube|facebook",
      "scheduleId": "<id>",
      "status": "pending|process|success|error",
      "postId": "<id, jika ada>",
      "error": "<pesan, jika status error>"
    }
  ]
}
```

Receipt **tidak boleh** menyimpan access/secret key, Cloudflare API token,
header Basic Auth penuh, atau signed URL (lihat integration spec).

## `publish-captions.md` — kontrak heading eksak

Dibaca `extractPublishCaption` (`repliz-publish.mjs:114`). Regex mencari heading
`^## <Heading>$` (case-insensitive, multiline), lalu mengambil isi blok berpagar
` ```text ... ``` ` (atau ` ``` ... ``` `) pertama di section itu, di-`trim`.

Heading yang dibaca untuk `description`, berurutan: **`## Instagram`** lalu
**`## TikTok`**. Heading yang dibaca untuk `title`: **`## YouTube Title`**. Teks
di luar fenced block (mis. baris "Character count: N") diabaikan. Batas panjang
(dari style guide / integration spec): IG max **1200** karakter, TikTok max
**4000** karakter, judul YouTube max **100** karakter.

Contoh minimal valid:

```markdown
## Instagram

```text
Caption final untuk IG.
```
```

## `cut-list.json` (Story)

`{ source, targetDuration, speed, segments: [{ sourceStart, sourceEnd, action, reason }], notes: [] }`.
`action` ∈ `keep | tighten | move-to-hook | cut-silence | cut-filler | cut-repeat | cut-tangent | cut-unclear | preserve-human`.
`speed` default `1.2`.

## `caption-beats.json` (Screen Plan)

Top-level: `source`, `mode`, `duration`, `style { base, position, font, fill, stroke, highlight }`, `beats[]`, `uncertain[]`.
Beat: `id`, `start`, `duration`, `text`, `highlight` (atau null), `type`, `position`, `sourceWords` (waktu processed-video), `notes`.
`type` ∈ `subtitle-beat | hook-card | editorial-title | proof-label | cta-caption`.

## `asset-manifest.json` (Build)

Per asset: `id`, `file`, `type`, `purpose`, `timestamp { start, end }`, `required`, `provenance`, `source`, `privacy`, `style`, `doNotShow[]`, `handoff`.
Aset generated menambah `promptSummary`, `rejectedAlternatives`.
`provenance` ∈ `source-frame | source-video-segment | user-supplied | screenshot | screen-recording | web-research | generated | designed | reference-analysis`.

## `overlay-timeline.json` (Screen Plan)

Top-level: `videoSlug`, `duration`, `motionDensity`, `visualGrammar`, `elements[]`, `conflicts[]`.
Element: `id`, `type`, `track`, `start`, `duration`, `contentRef`, `assetRef`, `placement`, `motion`, `purpose`, `notes`, opsional `sfx { type, intensity, mustBeAudible, notes }`. Semua waktu = waktu processed-video.

## `creative-brief.md` — Workflow Settings (Story)

Bagian `## Workflow Settings`: `visual_density` ∈ `light | medium | heavy`
(default `medium`), `gate_cut` ∈ `on | off` (default `off`). Hook `Status` selalu
`locked-from-transcript`. Bagian `## User Approvals` mencatat fakta dari user,
janji CTA yang disetujui, dan hook visual yang boleh menutup wajah (dipakai Gate 2).

## `visual-plan.md` (Screen Plan)

Markdown dengan bagian `Inputs`, `Strategy`, `Visual Decision Log` (time, line,
purpose, best real asset, simple asset option, imagegen candidate, decision,
reason), `Timeline` (ID, in–out, line, visual type, placement/track, motion,
SFX cue, illustrative, Gate 2 trigger), `Asset Briefs For Build`,
`Conflicts And Resolutions`, `Gate 2 Result`, `Handoff`. Template:
`docs/agents/references/visual-planning.md`.

## Komposisi HyperFrames (`videos/<slug>/index.html`)

Root: `data-composition-id`, `data-start`, `data-width=1080`, `data-height=1920`,
`data-duration` (detik). Setiap elemen ber-waktu: `class="clip"`, `data-start`,
`data-duration`, `data-track-index`, `id` stabil. Elemen `<audio>` boleh punya
`data-volume`. Detail track & z-index di
[design-system/visual-system](../design-system/visual-system.md) dan
[frontend/composition-implementation](../frontend/composition-implementation.md).

## Referensi

- [API Contract](api-contract.md) — bentuk request/response Repliz.
- [Publish Pipeline requirements](../requirements/rd-01-publish-pipeline.md) — EARS.
