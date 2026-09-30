# Non-Functional Requirements (NFR)
Status: accepted (reverse-engineered)
Date: 2026-09-30

Kanonik untuk: kualitas terukur yang harus dipenuhi produksi video + publish.
Semua angka diambil dari kode/spec nyata, bukan target abstrak. Diturunkan dari
`scripts/repliz-publish.mjs`, `index.html`, `docs/dena-social-video-style-guide.md`,
`docs/agents/*.md`, dan `docs/repliz/integration-spec.md`.

## Determinisme render (wajib)

- Komposisi HyperFrames harus deterministik: **tanpa** `Date.now()`,
  `Math.random()`, timer, `fetch`/network runtime, atau interaksi user
  (`index.html`, AGENTS.md, semua agent docs). Pose pada timestamp yang sama
  harus sama setelah seek maju/mundur; setiap properti animasi dihitung dari waktu.
  Kesamaan byte MP4 lintas versi encoder/OS tidak dijamin. Receipt mencatat
  toolchain, parameter encode, hash delivery dan hasil ukur audio/video (ADR-0030).
- Aset harus lokal (di `videos/<slug>/assets/`); tidak ada remote image/live
  fetch di render path.
- Satu timeline GSAP `paused`, terdaftar di `window.__timelines[<composition-id>]`.

## Keamanan & privasi

- Tidak ada secret di git: `.env`, access/secret key Repliz, Cloudflare API token,
  R2 credential/signed URL, footage privat. Enforced oleh `.gitignore` +
  `SECURITY.md` + secret scan di release checklist.
- Receipt publish menyimpan metadata `post` termasuk caption/title, URL publik,
  hash (`descriptionHash`, `titleHash`, `publishKey`, `targetKey`), dan riwayat
  `scheduleId`/status. Credential tidak disimpan; receipt live tetap privat.
- Detail: [security-standard](../security/security-standard.md).

## Idempotensi publish

- Idempotensi berlaku per `platform:accountId`. `makeTargetKey` meng-hash
  `{ r2Key, platform, accountId, description, title, replies }` dari payload
  platform yang sudah disanitasi. Akun baru/berstatus `error` dijadwalkan;
  riwayat non-error dengan key sama digunakan kembali. Konten berubah pada
  riwayat non-error diblok tanpa `--force`; receipt lama tanpa `targetKey`
  digunakan kembali dan diberi key saat ini (ADR-0011).
- `makePublishKey({r2Key,targetAccounts,description,title})` hanya ringkasan run.
  Jika tidak ada target baru, tidak ada upload/POST baru; schedule non-terminal
  yang digunakan kembali tetap dipoll melalui GET lalu hasilnya disimpan.
- Riwayat target yang diblok atau sementara dinonaktifkan tetap disimpan.
  `--force` re-upload dan menjadwalkan ulang target aktif saja (ADR-0028).

## Approval gate (wajib)

- Upload R2 + scheduling Repliz **hanya** boleh setelah `--approved`. Tanpa flag,
  `runPublish` throw sebelum menyentuh jaringan. Ini gate keras, bukan default.

## Ketahanan / error handling

- Config env tak lengkap → gagal sebelum jaringan (`loadConfig`).
- Tidak ada target account → gagal sebelum jaringan.
- Description kosong → gagal sebelum upload.
- File render tidak ada → gagal sebelum upload (`access`).
- R2 public URL tidak reachable (bukan 200/206) → throw.
- Kegagalan sebagian multi-akun: `scheduleId` sukses dipertahankan, akun gagal
  ditandai `error`, akun lain tetap jalan.
- Setiap hasil POST di-checkpoint atomik sebelum POST berikutnya dan sebelum
  polling. Gagal menulis checkpoint menghentikan run; gagal polling tetap
  menyisakan ID untuk resume. POST yang responsnya hilang belum dapat dijamin
  idempoten oleh layanan eksternal; cek Repliz sebelum rerun eksplisit karena
  target `error` akan dijadwalkan lagi, bahkan tanpa `--force`.
- Poll timeout `120s` → receipt disimpan non-terminal, cetak resume command.

## Kualitas audio (target terukur)

Dari fase Story (`docs/agents/references/cut-and-pacing.md`) / style guide / fase QA:

- Highpass `70–100 Hz`.
- Delivery AAC: speech/explainer **−16 LUFS ±1 LU**; format musik/showreel
  **−17 LUFS ±1 LU**; **true peak ≤−1 dBTP**. Profil lebih tenang harus
  eksplisit dalam `render-profile.json` dan dicatat dalam receipt.
- Sisakan headroom pada source master; ukuran final sesudah AAC menjadi penentu.
  CLI memeriksa decode, mengukur loudness/true peak dan memaster audio dengan
  video stream-copy bila perlu sebelum promosi atomik (RD-06-33/34).
- SFX audible di HP tapi di bawah speech, tidak pernah menutup kata.
- Timbre/onset harus mendukung aksi visual; cue sintetis dan substitusi dicatat.
  Ukuran loudness tidak menggantikan uji dengar.

## Pacing (target terukur)

- Default kecepatan processed video **1.2x** untuk talking-head/storytelling
  Dena (standar dasar, bukan poles). `1.12x–1.18x` bila sumber sudah cepat /
  emosional / sulit ditangkap. Kecepatan lain **wajib** didokumentasikan di
  `edit-decision-notes.md` dengan alasan eksak.
- Silence > `0.35–0.45s` di monolog normal dipangkas.

## Keterbacaan caption (target terukur)

- Frasa ideal `1–4` kata; boleh `1–6`.
- Durasi tampil: min terbaca `0.45s`; nyaman `0.8–1.4s`; hold panjang `1.8–2.5s`
  (khusus hook/title/CTA).
- Safe area: hindari `120px` teratas (kecuali hook card) dan `220px` terbawah
  (kontrol TikTok/Reels). Di `index.html` `--safe-bottom: 270px`.
- Cakupan penuh: setiap kata terucap yang lolos cut punya beat caption
  (storytelling/talking-head).

## Batas platform (publish)

- Caption Instagram max **1200** karakter; TikTok max **4000** karakter.
- `targetCountries` default `["ID"]`.
- YouTube: notasi panah/slash disanitasi jadi kata (`ke`/`dan`).

## Format & dimensi

- Video sosial default **9:16, 1080x1920, 30fps**. `index.html` menyetel
  viewport & body `1080x1920`.

## Performa build

- Zero local npm deps → `npm ci` tidak diperlukan; startup bergantung `npx`
  mengunduh `hyperframes@0.7.24` saat pertama (butuh internet).
- Transkripsi lokal/offline setelah model `ggml-large-v3-turbo` terunduh.

## CI

- `.github/workflows/ci.yml`: pada PR + push `main`, Node 24 + Python 3 menjalankan
  `npm test` (`node --test scripts/*.test.mjs`), dengan FFmpeg di-install untuk
  tes integrasi cut: publish, video/generate/gate,
  Studio, voice/music, motion/style/craft, asset-lib, render-blur, dan hooks.
  Semua efek publish memakai test doubles; tidak ada upload/publish live.
- CI tidak lint HTML video lokal yang di-ignore. Perubahan HTML video diperiksa
  dengan `npm run video -- check <slug>`; template root dengan `npm run check`.

## Referensi

- [stack](stack.md), [data-model](data-model.md), [api-contract](api-contract.md)
- Requirements EARS: [rd-01](../requirements/rd-01-publish-pipeline.md),
  [rd-02](../requirements/rd-02-composition-render.md),
  [rd-03](../requirements/rd-03-video-editing-workflow.md).
