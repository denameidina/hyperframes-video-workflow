# HyperFrames Video Workspace

Repo ini adalah workspace HyperFrames untuk komposisi video sosial Dena Meidina.
Dokumen ini ditulis supaya manusia dan AI agent bisa clone, paham kebutuhan
minimum, lalu menjalankan project tanpa menebak-nebak.

## Requirements

- Node.js 22+.
- npm/npx, biasanya sudah ikut saat install Node.js.
- Git.
- Koneksi internet saat pertama kali menjalankan command, karena script memakai
  `npx --yes hyperframes@0.7.24`.
- File media lokal untuk komposisi aktif, karena file besar tidak disimpan di git.

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

Kalau ingin preview/render komposisi aktif, pulihkan dulu file media lokal yang
diabaikan git:

```text
videos/0702-2/processed-compact-plus.mp4
videos/0702-2/audio-compact-sync.m4a
videos/0702-2/assets/editing-bottleneck.svg
videos/0702-2/assets/tool-stack.svg
videos/0702-2/assets/workflow-pipeline.svg
videos/0702-2/assets/monitor-proof-blurred.jpg
videos/0702-2/assets/transcript-cut-flow.svg
```

Minta folder `videos/0702-2/` dari pemilik project, atau regenerate asset lewat
workflow Dena di `docs/`.

## How To Run

Preview lokal:

```bash
npm run dev
```

`npm run dev` menjalankan server preview HyperFrames dan akan terus hidup sampai
dihentikan. Di agent/automation, jalankan sebagai background process.

Cek komposisi sebelum render atau handoff:

```bash
npm run check
```

Render MP4:

```bash
npm run render
```

Publish dan ambil link:

```bash
npm run publish
```

## Project Layout

```text
index.html                              main HyperFrames composition
package.json                            script dev/check/render/publish
hyperframes.json                        konfigurasi path dan registry HyperFrames
meta.json                               metadata project
docs/dena-social-video-style-guide.md   style guide Dena
docs/initial-setup.md                   setup awal untuk human/agent
docs/ai-agent-initial-setup.md          checklist setup khusus AI agent
docs/agents/                            workflow agent 01-07
docs/skills/dena-video-editing-workflow/SKILL.md
vendor/gsap.min.js                      runtime GSAP lokal
vendor/whisper.cpp/                     submodule transkripsi lokal
raw/                                    input mentah lokal, ignored by git
videos/                                 working media lokal, ignored by git
references/                             referensi lokal, ignored by git
renders/                                output render lokal, ignored by git
```

## Workflow For Humans And AI Agents

Sebelum mengerjakan video Dena, baca file ini secara berurutan:

1. `AGENTS.md`
2. `docs/skills/dena-video-editing-workflow/SKILL.md`
3. `docs/dena-social-video-style-guide.md`
4. Agent yang relevan di `docs/agents/`

Default full workflow:

```text
01 creative director
02 transcript cut
03 caption/subtitle
04 asset generation
05 motion/overlay
06 HyperFrames assembly
07 QA review
```

Jangan lompat ke assembly kecuali task memang narrow technical fix.

## HyperFrames Rules

- Setiap timed element perlu `class="clip"`, `data-start`, `data-duration`, dan
  `data-track-index`.
- Timeline GSAP harus paused dan terdaftar di `window.__timelines`.
- Video element memakai `muted`; audio utama memakai `<audio>` terpisah.
- Logic komposisi harus deterministic: jangan pakai `Date.now()`,
  `Math.random()`, atau network fetch runtime.
- Setelah mengubah `index.html` atau file composition `.html`, wajib jalankan
  `npm run check`.

## Git Notes

Folder dan file media besar di bawah ini sengaja ignored:

```text
raw/
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
yang dibutuhkan `index.html` sudah ada.
