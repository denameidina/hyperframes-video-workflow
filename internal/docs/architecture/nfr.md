# Non-Functional Requirements (NFR)
Status: accepted (reverse-engineered)
Date: 2026-07-20

Kanonik untuk: kualitas terukur yang harus dipenuhi produksi video + publish.
Semua angka diambil dari kode/spec nyata, bukan target abstrak. Diturunkan dari
`scripts/repliz-publish.mjs`, `index.html`, `docs/dena-social-video-style-guide.md`,
`docs/agents/*.md`, dan `docs/repliz/integration-spec.md`.

## Determinisme render (wajib)

- Komposisi HyperFrames harus deterministik: **tanpa** `Date.now()`,
  `Math.random()`, timer, `fetch`/network runtime, atau interaksi user
  (`index.html`, AGENTS.md, semua agent docs). Render sama → output byte-stabil.
- Aset harus lokal (di `videos/<slug>/assets/`); tidak ada remote image/live
  fetch di render path.
- Satu timeline GSAP `paused`, terdaftar di `window.__timelines[<composition-id>]`.

## Keamanan & privasi

- Tidak ada secret di git: `.env`, access/secret key Repliz, Cloudflare API token,
  R2 credential/signed URL, footage privat. Enforced oleh `.gitignore` +
  `SECURITY.md` + secret scan di release checklist.
- Receipt publish tidak menyimpan secret; hanya `descriptionHash`/`publishKey`
  (sha256) dan `scheduleId`/status.
- Detail: [security-standard](../security/security-standard.md).

## Idempotensi publish

- Publish ulang dengan input identik harus di-skip. Kunci idempotensi
  (`makePublishKey`) = sha256 dari `{ r2Key, targetAccounts (sorted), description }`.
- Skip terjadi bila `!force && receipt.publishKey === publishKey && receipt.schedules.length > 0`.
- `--force` menimpa (re-upload R2 + buat schedule baru).

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
- Poll timeout `120s` → receipt disimpan non-terminal, cetak resume command.

## Kualitas audio (target terukur)

Dari fase Story (`docs/agents/references/cut-and-pacing.md`) / style guide / fase QA:

- Highpass `70–100 Hz`.
- Integrated loudness `-16` s/d `-14 LUFS`.
- True peak `-1.5` s/d `-1.0 dBFS` pada master; **sisakan ~2 dBFS headroom**
  sebelum melapisi SFX agar hit bass di bawah kata terkeras tidak clip.
- Ukur render final untuk sample clipped (`astats` peak count).
- SFX audible di HP tapi di bawah speech, tidak pernah menutup kata.

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

- `.github/workflows/ci.yml`: pada PR + push `main`, jalankan `npm run test:repliz`
  di Node 24. Tidak ada langkah lint HTML di CI (lint komposisi dijalankan lokal
  via `npm run check`).

## Referensi

- [stack](stack.md), [data-model](data-model.md), [api-contract](api-contract.md)
- Requirements EARS: [rd-01](../requirements/rd-01-publish-pipeline.md),
  [rd-02](../requirements/rd-02-composition-render.md),
  [rd-03](../requirements/rd-03-video-editing-workflow.md).
