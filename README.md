# HyperFrames Video Workspace

Repo ini adalah workspace HyperFrames untuk komposisi video sosial Dena Meidina.
Dokumen ini ditulis supaya manusia dan AI agent bisa clone, paham kebutuhan
minimum, lalu menjalankan project tanpa menebak-nebak.

## Open Source Status

Source code project ini dirilis dengan lisensi MIT. Raw video, render final,
credential, dan media kerja pribadi tidak disimpan di git.

Catatan penting:

- `shared/`, `videos/`, `references/`, dan `renders/` adalah workspace lokal yang
  ignored by git.
- `raw/` adalah layout lama; migrasikan dengan `npm run video -- migrate-sources`.
  Folder itu sendiri tidak lagi di-ignore, jadi jangan taruh file pribadi baru di sana.
- File `.env` tidak boleh di-commit. Pakai `.env.example` sebagai template.
- Beberapa vendored skill/assets punya lisensi pihak ketiga. Lihat
  `THIRD_PARTY_NOTICES.md`.

## Requirements

- Node.js 22+.
- npm/npx, biasanya sudah ikut saat install Node.js.
- Git.
- Python 3 untuk tes hook dokumentasi; FFmpeg/ffprobe untuk produksi video.
- Koneksi internet saat pertama kali menjalankan command, karena script memakai
  `npx --yes hyperframes@0.7.24`.
- File media lokal untuk komposisi aktif, karena file besar tidak disimpan di git.
- Wrangler via `npx wrangler` hanya diperlukan untuk upload final ke Cloudflare
  R2/Repliz auto publish.

Tidak ada dependency npm lokal yang wajib di-install sekarang. `package.json`
langsung menjalankan HyperFrames lewat `npx`.

Setup lengkap setelah clone ada di `docs/initial-setup.md`. AI agent wajib baca
`docs/ai-agent-initial-setup.md` sebelum menjalankan workflow video.

## First Run After Clone

```bash
git clone <repo-url>
cd videos
git submodule update --init --recursive vendor/whisper.cpp
```

Kalau hanya ingin melihat struktur project atau mengedit dokumen, berhenti di
sini sudah cukup.

Kalau ingin membuat transcript, build Whisper lokal dan download model:

```bash
cmake -S vendor/whisper.cpp -B vendor/whisper.cpp/build
cmake --build vendor/whisper.cpp/build -j --config Release
sh vendor/whisper.cpp/models/download-ggml-model.sh large-v3-turbo
```

Root `index.html` adalah template kosong (ADR-0010). Untuk video, buat atau
pulihkan `videos/<slug>/`, lalu cek media yang dirujuk oleh HTML proyek itu,
`sources.json`, dan manifest asetnya. Sumber reusable berada di `shared/`.

## How To Run

Preview satu video:

```bash
npm run video -- dev <slug>
```

Command preview menjalankan server HyperFrames dan akan terus hidup sampai
dihentikan. Di agent/automation, jalankan sebagai background process.

Cek komposisi sebelum render atau handoff:

```bash
npm run video -- check <slug>
```

Render MP4:

```bash
npm run video -- render <slug> [--blur]
```

Untuk template root saja: `npm run dev`, `npm run check`, dan `npm run render`.
Publish HyperFrames dari cwd proyek dan ambil link:

```bash
cd videos/<slug>
npx --yes hyperframes@0.7.24 publish
```

Auto publish final render ke Repliz lewat Cloudflare R2:

```bash
npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved
```

Sebelum command ini, pastikan description tersedia di
`videos/<slug>/repliz-publish.json` (`post.description` atau root
`description`) atau di `videos/<slug>/publish-captions.md` (`## Instagram`
atau `## TikTok`). Script berhenti sebelum upload jika description tetap kosong.

Title diambil dari `post.title` / root `title` di `repliz-publish.json`, lalu
blok `## YouTube Title` di `publish-captions.md`, lalu diturunkan otomatis dari
baris pertama description (max 100 karakter). Title yang sama dikirim ke semua
platform, tapi hanya YouTube yang wajib non-empty: jika target YouTube aktif dan
title tetap kosong, script berhenti sebelum upload.

Jalankan command Repliz hanya setelah user review dan approve hasil edit. Tanpa
`--approved`, script berhenti sebelum upload R2 atau scheduling Repliz. R2
memakai Wrangler remote upload ke bucket dari `R2_BUCKET` dengan public base
`https://<r2-public-domain>`; account dipilih lewat `CLOUDFLARE_ACCOUNT_ID` di
`.env`, bukan S3 key atau `wrangler.jsonc`.

Setup minimal:

```bash
npx wrangler login
cp .env.example .env
npm run test:repliz
```

### Studio web UI

```bash
npm run studio
```

Membuka web UI lokal di `http://127.0.0.1:4777`, dan juga di IP Tailscale
(untuk HP) bila Tailscale sedang terhubung saat Studio start. Dari sana bisa
upload/hapus raw video, memulai sesi edit Claude/Codex interaktif di tmux dan
men-steer terminalnya dari browser, memutar render, lalu publish render ke
Repliz setelah konfirmasi. Isi `STUDIO_TOKEN` di `.env` untuk mewajibkan login.
Khusus macOS + tmux. Lihat `internal/docs/adr/0020-studio-web-ui.md`.

## Project Layout

```text
index.html                              blank portrait template (bukan video aktif)
templates/dena-video/                    starter untuk videos/<slug>/
package.json                            script dev/check/render/publish
scripts/repliz-publish.mjs              R2 upload + Repliz scheduling CLI
hyperframes.json                        konfigurasi path dan registry HyperFrames
meta.json                               metadata project
docs/dena-social-video-style-guide.md   style guide Dena
docs/repliz/integration-spec.md         spec R2/Repliz auto publish
docs/initial-setup.md                   setup awal untuk human/agent
docs/ai-agent-initial-setup.md          checklist setup khusus AI agent
docs/agents/                            workflow fase 01-04 + references/
docs/skills/dena-video-editing-workflow/SKILL.md
vendor/gsap.min.js                      runtime GSAP lokal
vendor/whisper.cpp/                     submodule transkripsi lokal
shared/                                 sumber reusable lokal, ignored by git
videos/<slug>/                          proyek video: sources/, transcripts/, assets/, renders/
references/                             referensi lokal, ignored by git
renders/                                output render lokal, ignored by git
```

## Workflow For Humans And AI Agents

Sebelum mengerjakan video Dena, baca file ini secara berurutan:

1. `AGENTS.md`
2. `internal/docs/README.md` (index kanonik)
3. `docs/skills/dena-video-editing-workflow/SKILL.md`
4. `docs/dena-social-video-style-guide.md`
5. Dokumen fase yang relevan di `docs/agents/`

Default full workflow:

```text
01 story        (transcript, hook, cut)
02 screen plan  (caption + rencana visual)
03 build        (aset, HyperFrames, render)
04 QA           (opsional, subagent)
```

Jangan lompat ke assembly kecuali task memang narrow technical fix.

## HyperFrames Rules

- Setiap timed element perlu `data-start`, `data-duration`, dan `data-track-index`.
  Tambahkan `class="clip"` pada clip biasa; mount `data-composition-src` tidak
  memakai class itu karena visibility-nya dikelola sebagai sub-composition.
- Timeline GSAP harus paused dan terdaftar di `window.__timelines`.
- Video element memakai `muted`; audio utama memakai `<audio>` terpisah.
- Logic komposisi harus deterministic: jangan pakai `Date.now()`,
  `Math.random()`, atau network fetch runtime.
- Setelah mengubah HTML video, jalankan `npm run video -- check <slug>`;
  perubahan template root memakai `npm run check`.
- `npm test` menjalankan seluruh tes lokal, termasuk hook, craft-kit, dan asset-lib.

## Git Notes

Folder dan file media besar di bawah ini sengaja ignored:

```text
shared/
videos/
references/
renders/
*.mp4
*.mov
*.m4v
*.webm
*.mp3
*.wav
*.m4a
```

Kalau preview blank atau render gagal setelah clone, cek dulu apakah media lokal
yang dibutuhkan `videos/<slug>/index.html` sudah ada.

## Open Source Release Checklist

Sebelum push public:

```bash
npm test
rg -n --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!vendor/**' \
  'REPLIZ_(ACCESS|SECRET)_KEY|CLOUDFLARE_API_TOKEN|-----BEGIN .*PRIVATE KEY-----|sk-[A-Za-z0-9_-]{20,}'
git status --short
```

Pastikan `git status --short --ignored` tidak menunjukkan raw/render/media
pribadi sebagai tracked file.
