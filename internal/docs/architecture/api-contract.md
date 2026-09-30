# API Contract
Status: accepted (reverse-engineered)
Date: 2026-09-30

Kanonik untuk: kontrak eksternal (Repliz API, Cloudflare R2 via Wrangler, Gemini TTS)
dan surface fungsi CLI publish serta HTTP Studio lokal. Diturunkan dari `scripts/repliz-publish.mjs`,
`scripts/repliz-publish.test.mjs`, `docs/repliz/openapi.json`, dan
`docs/repliz/integration-spec.md`.

Studio mengekspos API lokal melalui `node:http` (`scripts/studio/app.mjs`).
Kontrak layanan yang dikonsumsi, CLI, dan seluruh route Studio dicatat di sini.

## 1. Cloudflare R2 (via Wrangler CLI)

Upload via `uploadToR2` (`repliz-publish.mjs`). Bukan S3 API, bukan signed
URL — memakai Wrangler remote put.

Command yang dijalankan:

```bash
npx wrangler r2 object put "<R2_BUCKET>/<r2Key>" --remote --file "<file>" --content-type video/mp4 [--force]
```

- Dijalankan dengan env `CLOUDFLARE_ACCOUNT_ID=<config.cloudflareAccountId>`
  (di-inject ke child process, `repliz-publish.mjs`).
- `--force` ditambahkan hanya bila flag `--force` dipakai.
- `access(file)` dipanggil dulu; file tidak ada → throw sebelum upload.
- **Object key** (`buildR2Key`, `repliz-publish.mjs`):
  `<R2_PREFIX>/<basename(slug)>/<basename(file)>`, prefix default `final-renders`,
  slash pinggir dipangkas.
- **Public URL** (`buildPublicUrl`, `repliz-publish.mjs`):
  `<R2_PUBLIC_BASE_URL tanpa trailing slash>/<key, tiap segmen encodeURIComponent>`.

### Verifikasi reachability

`verifyPublicUrl` (`repliz-publish.mjs`): `GET <videoUrl>` dengan header
`Range: bytes=0-0`. Diterima jika status **200 atau 206**; selain itu throw
`R2 public URL is not reachable: <status>`.

## 2. Repliz API

Base URL = `REPLIZ_API_BASE_URL` (OpenAPI `docs/repliz/openapi.json`,
`title: Repliz API`, `version: 1.0.0`, `servers: []` — makanya base URL wajib
dari env). 53 path total; CLI ini memakai **3**.

**Auth:** HTTP Basic — `Authorization: Basic base64(REPLIZ_ACCESS_KEY:REPLIZ_SECRET_KEY)`
(`basicAuthHeader`, `repliz-publish.mjs`). Semua request JSON pakai
`Content-Type: application/json`. Non-2xx → throw `data.message` atau
`Repliz API failed: <status>`.

### 2.1 GET `/public/account/{accountId}` — validasi akun

`validateAccounts` (`repliz-publish.mjs`). Untuk tiap target account:

- Panggil `GET /public/account/<encoded accountId>`.
- Tolak (throw) jika `account.isConnected !== true` →
  `Repliz account <id> is not connected`.
- Tolak jika `account.type !== target.platform` →
  `Repliz account <id> expected <platform>, got <type>`.

Alternatif listing (integration spec): `GET /public/account?page=1&limit=20&types=tiktok`.

### 2.2 POST `/public/schedule` — buat schedule

`createSchedules` (`repliz-publish.mjs`) memanggil satu POST per target
account. Payload dibangun `buildSchedulePayload` (`repliz-publish.mjs`):

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

- **Threads (`platform === "threads"`)**: `description` = `post.threads.post`
  (bukan `post.description`), dan `replies` = `post.threads.replies.map(text
  => ({ title: "", description: text, topic: post.topic, type: "text", medias:
  [] }))`. Setiap bubble (post + replies) divalidasi ≤150 karakter oleh
  `validateThreadsThread` sebelum dikirim; lebih dari itu → throw yang
  menyebut bubble mana. Platform lain selalu mengirim `replies: []`.
- **`description` wajib non-empty** — `requireDescription` throw
  `Missing <platform> post description` jika kosong/whitespace.
- **`scheduleAt`** (`scheduleAtIso`, `repliz-publish.mjs`): `"now"` (atau
  falsy) → `now + 60_000 ms` dalam ISO; nilai lain → `new Date(value).toISOString()`.
- **Sukses** → response `{ scheduleId }`, disimpan dengan `status: "pending"`.
  Error per-akun ditangkap → entry `{ status: "error", error }` (tidak
  menggagalkan akun lain).
- `createSchedules` memanggil callback async `onSchedule(schedules)` setelah
  setiap hasil API; `runPublish` menyimpan checkpoint atomik sebelum POST
  berikutnya/polling. Error persistence dipropagasikan di luar catch API dan
  menghentikan scheduling berikutnya (ADR-0028).
- **Sanitizer YouTube** (`sanitizeDescriptionForPlatform`, `repliz-publish.mjs`)
  — hanya platform `youtube`:
  - Panah `-> => → ➜ ➔` diganti ` ke `.
  - Pasangan `kata/kata` (huruf/angka) → `kata dan kata`, kecuali didahului
    `://` (jaga URL).
  - Rapikan spasi/newline berlebih. Platform lain memakai caption apa adanya.
  - Catatan schema: `ScheduleMedia.type` di OpenAPI enum angka `0|1`, tapi contoh
    resmi memakai string `"image"`/`"video"`; MVP mengikuti string.

### 2.3 GET `/public/schedule/{scheduleId}` — poll status

`pollSchedules` (`repliz-publish.mjs`). Loop hingga semua terminal atau
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
| `buildTargetAccounts(env)` | Map 5 env ID (termasuk Threads) → `{platform, accountId}`, skip kosong |
| `buildR2Key({prefix,slug,file})` | Susun object key R2 |
| `buildPublicUrl(baseUrl,key)` | Susun public URL (encode segmen) |
| `sha256(value)` | `"sha256:" + hex` |
| `makePublishKey({r2Key,targetAccounts,description,title})` | Hash ringkasan seluruh run (disimpan di receipt, tidak lagi dipakai untuk skip — lihat `makeTargetKey`) |
| `makeTargetKey({r2Key,platform,accountId,description,title,replies})` | Hash idempotensi per target account (ADR-0011) |
| `shouldSkipPublish(receipt,publishKey,force)` | Fungsi murni lama (masih diuji langsung); tidak lagi dipanggil `runPublish` |
| `wrapIntoChunks(text,maxLength)` | Word-wrap greedy ke potongan ≤`maxLength`, tanpa memotong kata (kecuali satu kata sendiri >`maxLength`) |
| `validateThreadsThread({post,replies})` | Throw bila post/reply Threads mana pun >150 karakter |
| `readJsonIfExists(path)` / `readPostMetadata(slugDir)` | Baca metadata + fallback caption + `post.threads` |
| `scheduleAtIso(scheduleAt, now)` | Normalisasi waktu jadwal |
| `sanitizeDescriptionForPlatform(desc, platform)` | Sanitasi khusus YouTube |
| `buildSchedulePayload({...})` | Bentuk payload POST /public/schedule (Threads: post+replies, bukan description panjang) |
| `uploadToR2({...})` | Upload via Wrangler |
| `verifyPublicUrl(url, fetchImpl)` | Cek 200/206 |
| `basicAuthHeader({...})` | Header Basic Auth |
| `validateAccounts({...})` | Validasi tiap akun |
| `createSchedules({... onSchedule?})` | POST schedule per akun + callback async sesudah setiap hasil, sebelum akun berikutnya |
| `pollSchedules({...})` | Poll hingga terminal/timeout |
| `loadConfig(env)` | Validasi + baca 6 env wajib |
| `runPublish({...})` | Orkestrasi end-to-end (entry testable) |

Alur `runPublish` (`repliz-publish.mjs`): parseArgs → cek `--approved` →
loadConfig → buildTargetAccounts → readPostMetadata (+ cek description/title/
Threads bubble length) → buildR2Key/videoUrl/publishKey → **per target**:
hitung `targetKey` lewat `buildSchedulePayload`, bandingkan dengan entry
`platform:accountId` di receipt lama → partisi ke `toSchedule` / `reused` /
`blocked` (ADR-0011) → poll ulang reused non-terminal → bila `toSchedule`
kosong, simpan perubahan receipt bila ada lalu return skip tanpa upload/POST →
uploadToR2 → verifyPublicUrl → validateAccounts (hanya `toSchedule`) →
createSchedules (hanya `toSchedule`, stamp key + checkpoint setiap hasil) →
pollSchedules → checkpoint final. Receipt menggabungkan seluruh riwayat lama,
termasuk blocked/nonaktif, dengan hasil terbaru per `platform:accountId`.
Polling resume dapat memanggil GET meskipun run mengembalikan `skipped: true`.
Respons POST yang hilang tetap ambigu; receipt hanya dapat mencatat ID yang
benar-benar diterima. Tidak ada retry POST dalam run yang sama; error target
dijadwalkan lagi pada rerun eksplisit, jadi cek Repliz dulu bila respons hilang.

## 4. Gemini TTS (adapter suara)

Dipakai `scripts/lib/voice/providers/gemini.mjs` ([ADR-0023](../adr/0023-voice-adapter-tts.md),
[RD-06](../requirements/rd-06-audio.md)); diverifikasi 2026-09-29.

- Base `https://generativelanguage.googleapis.com/v1beta`; header `x-goog-api-key:
  $GEMINI_TTS_API_KEY` (key tidak pernah di URL); timeout 120 s per request.
- `POST /interactions` — sintesis:
  `{ model: "gemini-3.8-flash-tts", input: <teks> | [{ type: "text", text, annotations: [{ type: "speech_metadata", style }] }], response_format: { type: "audio" }, generation_config: { speech_config: [{ voice, language? }] } }`
  → audio di `steps[].content[]` `{ type: "audio", mime_type: "audio/wav", data: <base64> }`
  (24 kHz mono 16-bit). Field tak dikenal → 400 (`Unknown parameter`).
- `GET /voices?type=prebuilt&page_size=100&page_token=…` — daftar suara prebuilt
  `{ voices: [{ id, display_name, language_code, region_code, accent, gender, pitch, persona, context, description }], next_page_token }`.
- `POST /voices` — voice design / replication:
  `{ store: true, voice: { model, type: "prompted", display_name, language_code, gender?, prompted: { input } } }` atau
  `{ store: true, voice: { model, type: "replicated", display_name, replicated: { source_audio: { mime_type, data }, consent_audio: { mime_type, data } } } }`
  → `{ id: "voice_…", model, type, display_name, expire_time, prompted?: { sample_audio } }`.
  Maksimal 200 voice tersimpan per project, TTL 1 tahun.
- Retry: sintesis dan daftar suara di-retry pada 429, 5xx, gagal jaringan, dan timeout
  (1, 2, 4 s; maksimal 3 kali). `POST /voices` tidak pernah di-retry (bisa menyimpan dua voice).

## 5. Studio HTTP lokal

Source: `scripts/studio/app.mjs` dan helper `scripts/studio/*.mjs`;
requirements [RD-05](../requirements/rd-05-studio.md). Default
`http://127.0.0.1:4777`; listen address/Host Tailscale ditentukan saat start.
Ini API single-user lokal, tanpa database atau autentikasi per proyek.

### Aturan bersama

- Semua request wajib Host yang diizinkan. Mutasi (selain GET/HEAD) wajib
  `Origin: http://<Host>` persis; pelanggaran → **403** sebelum handler.
- Jika `STUDIO_TOKEN` terisi, semua API, media, SSE, dan halaman dilindungi
  cookie `studio=sha256("studio:" + token)`. Tanpa cookie valid → **401** untuk
  API/media, **302** ke `/login` untuk halaman. `/login` dan `/app.css` terbuka.
  Tanpa token, pengecekan cookie dilewati; Host/Origin tetap diperiksa.
- `POST /login` JSON `{token}` → **200** `{ok:true}` dengan cookie HttpOnly,
  SameSite=Strict, Path=/, Max-Age=2592000; salah token → **401**.
- JSON sukses default **200** dengan `Cache-Control: no-store`. Hanya create
  Generate memakai **201**. Error sebelum header dikirim berbentuk
  `{error: string}`; malformed JSON → **400**, body JSON >65536 byte → **413**,
  route/method tidak dikenal → **404** (tidak ada 405 otomatis), exception
  filesystem/tmux/state yang tidak dipetakan → **500**.
- Generate menerima body object saja; null/array/scalar → **400**. Route JSON
  lama memakai field object yang dicatat di tabel; jangan menganggap semua
  input non-object sudah mendapat validasi yang sama (null dapat menjadi 500).
- Slug `[a-z0-9-]+`; parameter path di-decode, encoding tidak valid → **400**.
  Media stream → **200**, single byte range valid → **206**, range di luar file
  → **416** (body kosong, `Content-Range: bytes */<size>`); malformed Range
  diabaikan dan dilayani penuh. File tidak ada → **404**. HEAD tidak didaftarkan.
- SSE **200** `text/event-stream`, ping 15 s. Event `data` terminal berisi string
  base64, `exit` berisi `{}`; jobs mengirim `log` string dan `done {code}`.
  Error setelah header SSE/file terkirim menutup stream, bukan JSON baru.

### State, proyek, sumber, dan sesi

`Source` mengikuti `sources.json` di [data-model](data-model.md#sourcesjson-story-studio).
`Session` = `{slug,runtime,model,effort,started,status}`; status running/idle/exited.
`AgentOptions` = `{runtime,model,effort}` (claude/codex, model aman, effort dari
`GET /api/state`; model dikenal harus mendukung effort yang dipilih).

| Method/path | Request | Response / efek dan error khusus |
| --- | --- | --- |
| GET `/api/state` | — | `{tools,models}`; katalog model per runtime dari konfigurasi/cache lokal |
| GET `/api/shared` | — | `[{name,kind,size,mtime,duration,projects:[]}]` |
| POST `/api/shared?name=<file>` | body biner stream, bukan multipart | `{name}`; simpan melalui `.part` + rename; **400** ekstensi salah, **409** nama ada/masih upload |
| DELETE `/api/shared/:name` | — | `{name}`; **400** nama tidak valid, **404** hilang, **409** masih dirujuk proyek (manifest rusak juga dianggap pemakai) |
| GET `/api/projects` | — | `[{slug,counts:{speech,broll,image,auto},renders:[]}]` |
| POST `/api/projects` | `{slug}` | `{slug}`; scaffold edit; **400** slug salah, **409** direktori sudah ada |
| GET `/api/projects/:slug` | — | `{slug,sources:[Source],renders:[]}`; **404** proyek hilang, **400** manifest tidak valid |
| DELETE `/api/projects/:slug` | — | `{slug}`; kill tmux kemudian hapus proyek; shared tetap ada; **404** proyek hilang |
| POST `/api/projects/:slug/sources?name=<file>` | body biner stream | `Source`; simpan/probe/sync manifest; **400** file/probe salah, **409** nama sudah ada; gagal sync menghapus upload baru |
| POST `/api/projects/:slug/shared` | `{names:[<shared basename>,...]}` nonempty | `[Source]`; attach sumber shared; **400** nama/manifest tidak valid; tidak menyalin media |
| PATCH `/api/projects/:slug/sources/:id` | `{role?,note?}`; role speech/broll/auto atau image untuk gambar | `Source`; set role/note melalui manifest; **400** id/role/note salah |
| DELETE `/api/projects/:slug/sources/:id` | — | `Source` yang dilepas; sumber project dihapus, shared hanya detach; **400** id tidak ditemukan |
| GET `/api/projects/:slug/sources/:id/file` | optional Range | stream sumber; **404** id/file hilang, **400** manifest/path tidak valid |
| GET `/api/sessions` | — | `[Session]`; tmux belum aktif menghasilkan `[]` |
| POST `/api/sessions` | `{slug,...AgentOptions,notes?}` | `{slug,name}`; start `studio-<slug>`, sesi exited dibersihkan; **400** opsi salah, **404** proyek hilang, **409** sesi masih ada, **500** tmux gagal |
| POST `/api/sessions/:slug/interrupt` | — | `{ok:true}`; kirim Escape; **404** sesi hilang |
| DELETE `/api/sessions/:slug` | — | `{ok:true}`; kill sesi; sesi sudah hilang juga sukses |
| GET `/api/sessions/:slug/stream?viewer=<id>&cols=<n>&rows=<n>` | viewer 8–64 alnum/hyphen | SSE terminal; **400** viewer salah; cols clamp 20–400, rows 5–200; viewer yang sama mengganti attachment sebelumnya |
| POST `/api/sessions/:slug/input` | `{viewer,data:string}` | `{ok:true}`; input ke attachment viewer; **400** data bukan string, **404** terminal belum dibuka |

### Uji suara dan musik

| Method/path | Request | Response / efek dan error khusus |
| --- | --- | --- |
| GET `/api/voice-tests` | — | `[{id,labels:[],hasRef,rated}]`, terbaru dahulu |
| GET `/api/voice-tests/:id` | — | `{id,labels,hasRef,script,ratings,savedAt}`; **400** run id salah, **404** run hilang; mapping suara/key.json tidak dikirim |
| GET `/api/voice-tests/:id/files/:name` | name `ref.wav` atau label `A.wav` dst; optional Range | stream reference/sample; **404** nama lain, termasuk key.json |
| POST `/api/voice-tests/:id/ratings` | `{ratings:{A:{natural,pronunciation,register,similarity,endurance,note},...}}` | `{version:1,savedAt,ratings}`; ganti ratings; tiap skor integer 1–5 atau null; **400** label/skor/note salah |
| GET `/api/music` | — | daftar track lengkap catalog (termasuk rejected), bentuk di data-model |
| GET `/api/music/:id/file` | optional Range | stream track; **404** track/file hilang |
| POST `/api/music/:id/reject` | `{rejected:boolean}` | track yang diperbarui; **400** bukan boolean, **404** id hilang |

### Generate dan review gate

| Method/path | Request | Response / efek dan error khusus |
| --- | --- | --- |
| GET `/api/generate` | — | `[{slug,format,brief,status:{phase,gate,state,error?},session}]`; format rusak → format null + status error |
| GET `/api/generate/options` | — | `{voices,defaultVoice,styles,music,repurpose,formats,durations}`; recorded voices/rejected music disaring |
| POST `/api/generate` | `{slug,brief,...AgentOptions,format?,text?,urls?,repurpose?,voice?,duration?,style?,music?}` | **201** `{slug,session:{started,error}}`; scaffold + research files kemudian start tmux; session gagal tetap 201 dengan started false dan proyek dipertahankan; **400** validasi, **409** slug ada |
| GET `/api/generate/:slug` | — | detail di bawah; **404** bukan generate/hilang, **500** gate/state rusak |
| POST `/api/generate/:slug/decision` | `{gate,decision,note?,fingerprint}`; decision approve/revise/qa | `{recorded,sent,error}`; append gates.json kemudian kirim pesan ke tmux; tmux hilang/gagal tetap **200**, sent false; **400** input/note salah, **409** stale/not-waiting/voice-stale/missing-file atau agent/voice job sibuk |
| PUT `/api/generate/:slug/script` | `{text:string}`; naskah ≤20480 byte dengan narasi | gate status terbaru; replace script atomik + log edit; **400** tanpa narasi, **413** terlalu besar, **409** selain explainer G1 atau agent/voice job sibuk |
| POST `/api/generate/:slug/voice` | — | `{ok:true}`; background `video voice`; **409** format musik, bukan G1, agent atau voice job sibuk |
| GET `/api/generate/:slug/voice/stream` | — | SSE log/done dengan replay; **404** belum ada job |
| POST `/api/generate/:slug/session` | `AgentOptions` | `{slug,name}`; lanjut dengan keputusan terakhir; **400** opsi salah, **404** proyek salah/hilang, **409** sesi masih ada, **500** tmux gagal |
| GET `/media/:slug/processed-audio.wav` | optional Range | stream audio generate; **404** proyek/file hilang |
| GET `/media/:slug/preview/storyboard-sheet.jpg` atau `storyboard-sheet-<n>.jpg` | optional Range | stream sheet; preview file lainnya **404** |

Create: brief wajib ≤4000 karakter; format default explainer. Durasi integer
explainer 30–90 s, kinetic-post 8–20 s, motion-short 15–40 s; optional kosong/null
berarti dipilih agent. URLs ≤5 http/https; voice/style/music/repurpose harus
tersedia di options; `text` ≤1000 karakter hanya format musik dan `voice` harus
kosong pada format musik. Runtime/model/effort divalidasi sebelum scaffold.
Slug `options`/`new` reserved. Format Gate 1/2/3 sesuai RD-03.

Detail = `{slug,brief,request,status,format,beats,session,voiceJob:{running},
gate1:{script,paragraphs,lines,facts,voice,audio},
gate2:{sheets,rows,styleWorld,music,musicTrack},
gate3:{render,deviations,risks,qaReport}}`. Nama `gate1/2/3` tetap untuk
kompatibilitas UI: format musik menampilkan text/music/storyboard pada G1 dan
isi `gate3` pada final G2. `status` memuat mode/format/finalGate/log serta
phase/gate/state/voiceStale/fingerprint/last. `gate3.render` adalah basename
normal/blur terbaru yang sama dengan fingerprint final; normal menang saat
mtime seri. Semua file wajib di gate berupa regular file tidak kosong.
Script/storyboard hilang, kosong, atau direktori tetap menghasilkan detail **200**
dengan phase yang belum lengkap; teks kosong/preview tidak ditawarkan. Media
audio/sheet yang kosong atau nonregular ditolak **404** (RD-05-35).

### Hasil render dan publish

| Method/path | Request | Response / efek dan error khusus |
| --- | --- | --- |
| GET `/api/results` | — | `[{slug,file,size,mtime,publish:{createdAt,platforms:[{platform,status}]} atau null}]`, mtime terbaru dahulu |
| GET `/media/:slug/:file` | file basename MP4 yang terdaftar di renders; optional Range | stream render normal/blur/MP4 lain; **404** bukan render yang tersedia |
| GET `/api/results/:slug/publish-preview?file=<mp4>` | — | `{slug,file,title,description,targets:[platform]}`; read-only metadata, tanpa network publish; **404** render tidak ada |
| POST `/api/results/:slug/publish` | `{file:<mp4 basename>}` | `{ok:true}`; mulai CLI dengan `--approved`; **404** render hilang, **409** job slug masih berjalan; keberhasilan HTTP berarti job dimulai, status akhir di SSE/receipt |
| GET `/api/results/:slug/publish/stream` | — | SSE log/done dengan replay; **404** belum ada publish job |

Mutasi create/upload/session tidak memiliki idempotency key HTTP; nama/proyek
duplikat ditolak 409. PATCH role/note dan reject menetapkan nilai; ratings
menimpa data beserta timestamp. PUT script dan keputusan gate menambah log,
sehingga retry harus membaca state terbaru. Delete shared/project yang sudah
hilang memberi 404; delete sesi mengembalikan ok. Publish dikunci hanya saat job
berjalan; setelahnya CLI memakai idempotensi receipt per target (section 3),
bukan POST HTTP secara umum. Approval final Generate mengakhiri sesi; publish
tetap aksi terpisah yang dikonfirmasi di Results. Request publish sendiri
merupakan otorisasi publish, dan bukan permintaan membuat keputusan gate baru.

Static GET yang terdaftar: `/`, `/login`, `/app.js`, `/generate.js`, `/app.css`,
serta `/vendor/xterm/xterm.js`, `xterm.css`, `addon-fit.js`. Tidak ada serving
direktori umum, key suara, credential, atau preview arbitrer.

## Referensi

- EARS lengkap: [rd-01-publish-pipeline](../requirements/rd-01-publish-pipeline.md).
- Data receipt/metadata: [data-model](data-model.md).
- Operasi publish: [operations/publish-runbook](../operations/publish-runbook.md).
- Keputusan idempotensi per target: [ADR-0011](../adr/0011-per-target-publish-idempotency.md).
