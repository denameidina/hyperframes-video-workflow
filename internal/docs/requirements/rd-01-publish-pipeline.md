# RD-01 Publish Pipeline
Status: accepted (reverse-engineered)
Date: 2026-10-01

Domain: auto-publish render final ke Cloudflare R2 + schedule Repliz multi-platform.
Owner: `scripts/repliz-publish.mjs`. Uji: `scripts/repliz-publish.test.mjs`.

- **RD-01-44** (Event-driven) — When an approved publish includes
  `--schedule-at <ISO with zone|now>`, the CLI shall override post.scheduleAt
  for that invocation, validate a timestamp as at least 60 s in the future
  before upload/network, and persist the actual payload scheduleAt per newly
  created target in its receipt. Existing targetKeys shall still be reused.
- **RD-01-45** (State-driven) — While a newly created schedule is in the future
  by more than 60 s, the CLI shall checkpoint its pending status and return
  without waiting for that date; immediate publishing keeps existing polling.
Kontrak API: [architecture/api-contract](../architecture/api-contract.md).

## Approval gate

- **RD-01-01** (Unwanted) — If flag `--approved` tidak ada, then the system shall
  throw `Publishing requires user approval...` dan berhenti sebelum upload R2 atau
  scheduling Repliz apa pun.
- **RD-01-02** (Ubiquitous) — The system shall menerima argumen `--slug` dan
  `--file` sebagai wajib; jika salah satu hilang, the system shall throw
  `Missing required --slug` / `Missing required --file`.
- **RD-01-03** (Unwanted) — If argumen tak dikenal diberikan, then the system
  shall throw `Unknown argument: <arg>`.

## Konfigurasi & target

- **RD-01-04** (Unwanted) — If salah satu env `REPLIZ_API_BASE_URL`,
  `REPLIZ_ACCESS_KEY`, `REPLIZ_SECRET_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET`,
  `R2_PUBLIC_BASE_URL` kosong, then the system shall throw
  `Missing env: <daftar>` sebelum jaringan.
- **RD-01-05** (Optional) — Where `R2_PREFIX` kosong, the system shall memakai
  prefix `final-renders`.
- **RD-01-06** (Ubiquitous) — The system shall membangun target account hanya
  dari env `REPLIZ_{FACEBOOK,YOUTUBE,TIKTOK,INSTAGRAM,THREADS}_ACCOUNT_ID` yang
  terisi.
- **RD-01-07** (Unwanted) — If tidak ada satu pun target account ID terkonfigurasi,
  then the system shall throw `No target account IDs configured`.

## Metadata & description

- **RD-01-08** (Ubiquitous) — The system shall menentukan `description` dengan
  prioritas: `repliz-publish.json` `post.description` → root `description` →
  `publish-captions.md` blok `## Instagram` → blok `## TikTok`.
- **RD-01-09** (Unwanted) — If `description` tetap kosong setelah semua fallback,
  then the system shall throw pesan yang menyebut
  `videos/<slug>/repliz-publish.json` dan `publish-captions.md`, sebelum upload
  atau scheduling.
- **RD-01-10** (Ubiquitous) — The system shall membaca fenced block ` ```text ` di
  bawah heading eksak `## Instagram`/`## TikTok` (case-insensitive) dan
  mengabaikan teks non-fenced di section itu.

## Metadata & title

- **RD-01-31** (Ubiquitous) — The system shall menentukan `title` dengan
  prioritas: `repliz-publish.json` `post.title` → root `title` →
  `publish-captions.md` blok `## YouTube Title` → derivasi dari `description`.
- **RD-01-32** (Ubiquitous) — The system shall menurunkan title dari
  `description` dengan mengambil baris non-kosong pertama yang tidak diawali
  hashtag (`#\S`), menormalkan whitespace, dan memotongnya di batas kata
  maksimal `100` karakter.
- **RD-01-33** (Unwanted) — If ada target account `youtube` dan `title` tetap
  kosong setelah semua fallback, then the system shall throw
  `Missing YouTube post title` yang menyebut `repliz-publish.json` dan blok
  `## YouTube Title` di `publish-captions.md`, sebelum upload atau scheduling.

## Metadata & Threads thread

- **RD-01-36** (Ubiquitous) — The system shall menentukan `post.threads =
  { post, replies[] }` dengan prioritas: `repliz-publish.json` `post.threads`
  (eksplisit, non-empty `post`) → `publish-captions.md` heading eksak
  `## Threads` (setiap blok berpagar ` ```text ` di section itu satu bubble,
  berurutan; blok pertama `post`, sisanya `replies`) → word-wrap `description`
  ke potongan ≤150 karakter pada batas kata (kata tunggal >150 karakter
  dipotong jadi beberapa chunk 150-karakter, tidak pernah menghilangkan
  karakter).
- **RD-01-37** (Unwanted) — If ada target account `threads` dan `post.threads.post`
  atau salah satu `post.threads.replies[i]` melebihi 150 karakter, then the
  system shall throw pesan yang menyebut bubble mana (`Threads post` atau
  `Threads reply <n>`) dan panjangnya, sebelum upload atau scheduling.
- **RD-01-38** (State-driven) — While platform target `threads`, the system
  shall mengirim `post.threads.post` sebagai `description` payload (bukan
  `post.description`), dan `post.threads.replies` sebagai `replies[]`
  (`{title: "", description: <bubble>, topic: post.topic, type: "text",
  medias: []}` per elemen); platform lain tetap mengirim `replies: []`.

## Object key & URL

- **RD-01-11** (Ubiquitous) — The system shall menyusun object key R2 sebagai
  `<prefix>/<basename(slug)>/<basename(file)>` dengan slash pinggir dipangkas.
- **RD-01-12** (Ubiquitous) — The system shall menyusun `videoUrl` =
  `<R2_PUBLIC_BASE_URL tanpa trailing slash>/<key dengan tiap segmen encodeURIComponent>`.

## Idempotensi

Diamandemen oleh [ADR-0011](../adr/0011-per-target-publish-idempotency.md):
keputusan skip/publish sekarang **per target account**, bukan per seluruh
target set, supaya menambah satu platform baru (mis. mengisi
`REPLIZ_THREADS_ACCOUNT_ID` setelah platform lain sukses) tidak memicu
re-publish ke platform yang sudah sukses.

- **RD-01-14** (Ubiquitous) — The system shall tetap menghitung dan menyimpan
  `publishKey` = `sha256(JSON({ r2Key, targetAccounts terurut per
  "platform:accountId", description, title }))` di receipt sebagai ringkasan
  seluruh run, tapi tidak lagi memakainya untuk keputusan skip per target.
- **RD-01-13a** (Ubiquitous) — The system shall menghitung `targetKey` per
  target account = `sha256(JSON({ r2Key, platform, accountId, description,
  title, replies }))`, dengan `description`/`title`/`replies` diambil dari
  payload `buildSchedulePayload` platform itu (jadi untuk `threads`,
  `description` = `post.threads.post` dan `replies` = `post.threads.replies`).
- **RD-01-13b** (State-driven) — While target account tidak punya entry
  `platform:accountId` di `schedules[]` receipt lama, atau entry lama
  berstatus `error`, or flag `--force` diberikan, the system shall
  menjadwalkan target itu (buat schedule baru).
- **RD-01-13c** (State-driven) — While target account punya entry
  `platform:accountId` di receipt lama dengan `targetKey` sama dan status
  bukan `error`, and flag `--force` tidak ada, the system shall reuse entry
  lama apa adanya (tanpa call Repliz baru untuk target itu).
- **RD-01-13d** (Unwanted) — If target account punya entry `platform:accountId`
  di receipt lama dengan `targetKey` berbeda (konten berubah sejak sukses
  terakhir) dan flag `--force` tidak ada, then the system shall **tidak**
  menjadwalkan ulang target itu; the system shall mencatatnya di
  `receipt.blocked[]` (`{platform, accountId, reason}`) dan mencetaknya di CLI
  dengan pesan yang menyebut `--force`, sambil tetap memproses target lain
  yang perlu dijadwalkan.
- **RD-01-13e** (State-driven) — While tidak ada satu pun target yang perlu
  dijadwalkan (semua reuse dan/atau blocked), the system shall mengembalikan
  `{ skipped: true, receipt: <receipt lama>, blocked }` tanpa upload R2,
  `verifyPublicUrl`, atau validasi akun Repliz.
- **RD-01-13f** (Unwanted) — If entry `platform:accountId` di receipt lama
  tidak punya field `targetKey` (receipt ditulis sebelum ADR-0011), then the
  system shall memperlakukannya sebagai reused (bukan `blocked`, bukan
  dijadwalkan ulang) dan menyimpan `targetKey` yang baru dihitung ke entry itu.
- **RD-01-13g** (State-driven) — While sebuah entry reused berstatus bukan
  `success`/`error` (`pending`/`process`), the system shall memanggil
  `pollSchedules` untuk entry itu dan memperbarui statusnya di receipt, sekali
  per run, terlepas dari apakah ada target lain yang dijadwalkan.
- **RD-01-15** (Optional) — Where `--force` diberikan, the system shall selalu
  menjadwalkan ulang **setiap** target (bukan hanya yang berubah) dan
  re-upload R2 bila ada minimal satu target yang dijadwalkan.

## Upload R2

- **RD-01-16** (Unwanted) — If file `--file` tidak ada di disk, then the system
  shall throw sebelum menjalankan Wrangler.
- **RD-01-17** (Event-driven) — When mengunggah, the system shall menjalankan
  `npx wrangler r2 object put <bucket>/<key> --remote --file <file> --content-type video/mp4`
  dengan env `CLOUDFLARE_ACCOUNT_ID` di-inject, dan menambah `--force` hanya bila
  flag `--force` aktif.
- **RD-01-18** (Unwanted) — If `GET <videoUrl>` dengan header `Range: bytes=0-0`
  tidak mengembalikan status 200 atau 206, then the system shall throw
  `R2 public URL is not reachable: <status>`.

## Validasi akun Repliz

- **RD-01-19** (Event-driven) — When memvalidasi, the system shall memanggil
  `GET /public/account/<accountId>` dengan HTTP Basic Auth untuk tiap target.
- **RD-01-20** (Unwanted) — If `account.isConnected !== true`, then the system
  shall throw `Repliz account <id> is not connected`.
- **RD-01-21** (Unwanted) — If `account.type !== platform` target, then the
  system shall throw `Repliz account <id> expected <platform>, got <type>`.

## Scheduling

- **RD-01-22** (Event-driven) — When membuat schedule, the system shall
  memanggil `POST /public/schedule` satu kali per target account yang perlu
  dijadwalkan (RD-01-13b), bukan untuk target yang di-reuse atau `blocked`,
  dengan payload Repliz (`medias[0].url = videoUrl`, `type` default `video`).
- **RD-01-23** (Unwanted) — If `description` payload kosong/whitespace, then the
  system shall throw `Missing <platform> post description`.
- **RD-01-24** (State-driven) — While platform target `youtube`, the system shall
  mengganti notasi panah (`-> => → ➜ ➔`) jadi ` ke ` dan pasangan `kata/kata`
  jadi `kata dan kata` (kecuali didahului `://`), tanpa mengubah caption platform
  lain.
- **RD-01-34** (Ubiquitous) — The system shall mengirim `title` hasil resolusi ke
  payload semua platform, dengan whitespace dinormalkan dan di-trim.
- **RD-01-35** (State-driven) — While platform target `youtube`, the system shall
  membuang karakter `<` dan `>` dari `title`, memotongnya di batas kata maksimal
  `100` karakter, dan throw `Missing youtube post title` bila hasilnya kosong.
- **RD-01-25** (Event-driven) — When `scheduleAt` bernilai `"now"` atau kosong,
  the system shall menjadwalkan pada `now + 60_000 ms` dalam ISO; nilai lain
  dikirim sebagai `new Date(value).toISOString()`.
- **RD-01-26** (Unwanted) — If satu akun gagal saat scheduling, then the system
  shall menandai akun itu `status: "error"` dengan pesan error dan tetap
  memproses akun lain.

## Polling status

- **RD-01-27** (State-driven) — While ada schedule non-terminal, the system shall
  memanggil `GET /public/schedule/<scheduleId>` tiap `5_000 ms`.
- **RD-01-28** (Event-driven) — When semua schedule mencapai `success`/`error`
  atau `120_000 ms` terlampaui, the system shall berhenti polling dan menyimpan
  receipt.

## Receipt

- **RD-01-29** (Event-driven) — When publish berhasil, the system shall menulis
  `videos/<slug>/repliz-publish.json` berisi `post`, `r2Bucket`, `r2Key`,
  `videoUrl`, `descriptionHash` (`sha256:...`), `titleHash` (`sha256:...`),
  `publishKey`, `createdAt`, `schedules[]` (tiap entry termasuk `targetKey`),
  dan `blocked[]` bila ada.
- **RD-01-30** (Ubiquitous) — The system shall tidak menyimpan access/secret key,
  Cloudflare API token, header Basic Auth penuh, atau signed URL di receipt.

- **RD-01-39** (Ubiquitous) — The system shall retain every prior schedule entry,
  including blocked and currently unconfigured targets, keyed by `platform:accountId`;
  only a new result for the same target shall replace that entry (ADR-0028).
- **RD-01-40** (Event-driven) — When a scheduling request returns a result, the system
  shall atomically checkpoint it in the receipt before the next scheduling request or
  polling, including `scheduleId`, `status: "pending"`, and `targetKey` on success.
- **RD-01-41** (Unwanted) — If receipt checkpointing fails, then the system shall stop
  before scheduling another target and propagate the persistence error without
  relabeling the successful remote request as a scheduling failure.
- **RD-01-42** (Unwanted) — If polling fails after scheduling succeeds, then the system
  shall leave the checkpointed pending IDs on disk so an ordinary retry polls those
  IDs without a new POST for those targets.
- **RD-01-43** (Ubiquitous) — Every receipt write shall use a temporary sibling file
  and atomic rename; skipped runs shall persist updated blocked/legacy-target metadata
  while retaining prior history, without upload or account validation.

## Referensi

- Kontrak: [architecture/api-contract](../architecture/api-contract.md)
- Data: [architecture/data-model](../architecture/data-model.md)
- Operasi: [operations/publish-runbook](../operations/publish-runbook.md)
- Keputusan: [ADR-0002](../adr/0002-repliz-r2-publish-via-wrangler.md),
  [ADR-0003](../adr/0003-approval-gated-publish.md),
  [ADR-0006](../adr/0006-idempotent-publish-receipts.md),
  [ADR-0011](../adr/0011-per-target-publish-idempotency.md)
