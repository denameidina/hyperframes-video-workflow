# Stack
Status: accepted (reverse-engineered)
Date: 2026-07-20

Kanonik untuk: teknologi, runtime, dependency, dan tooling repo ini. Diturunkan
dari `package.json`, `.github/workflows/ci.yml`, `.gitmodules`, `index.html`,
`scripts/repliz-publish.mjs`, dan `hyperframes.json`.

## Ringkasan

Repo ini adalah **workspace HyperFrames** untuk memproduksi video sosial vertikal
(9:16, 1080x1920) milik Dena Meidina, plus satu CLI Node untuk auto-publish
render final ke social media lewat Cloudflare R2 + Repliz. Tidak ada database
dan tidak ada frontend web ter-deploy; satu-satunya server aplikasi adalah
Studio lokal (`npm run studio`, ADR-0020). "Aplikasi" = komposisi HTML yang
dirender jadi MP4, sebuah CLI publish, dan Studio.

## Runtime & bahasa

- **Node.js 22+** (`README.md`, `docs/initial-setup.md`). CI memakai Node 24
  (`.github/workflows/ci.yml`). Tidak ada engine pin di `package.json`.
- **ES Modules** — `package.json` menyetel `"type": "module"`; semua script
  Node pakai `import` (`scripts/repliz-publish.mjs`).
- **Bahasa implementasi:** JavaScript (`.mjs`) untuk CLI; HTML + CSS + JavaScript
  inline (GSAP) untuk komposisi (`index.html`).

## Dependency strategy: zero local npm deps

- `package.json` **tidak punya `dependencies` maupun `devDependencies`**. Tidak
  ada `node_modules` yang wajib di-install. Lihat
  [ADR-0007](../adr/0007-no-local-npm-deps-pinned-npx.md).
- HyperFrames dipanggil per invocation lewat **`npx --yes hyperframes@0.7.24`**
  (versi di-pin di setiap script `dev`/`check`/`render`/`publish`).
- CLI publish (`scripts/repliz-publish.mjs`) hanya memakai **modul bawaan Node**:
  `node:crypto`, `node:child_process`, `node:fs/promises`, `node:path`,
  `node:process`, `node:url`, `node:util`. Tidak ada SDK AWS/Cloudflare/Repliz.

## Komponen tooling

| Komponen | Peran | Cara dipanggil | Sumber |
| --- | --- | --- | --- |
| HyperFrames 0.7.24 | Render HTML → MP4, preview, lint, validate, inspect, publish | `npx --yes hyperframes@0.7.24 <cmd>` | `package.json` |
| GSAP | Animation runtime komposisi (timeline paused, seek-safe) | Vendored `vendor/gsap.min.js`, di-`<script>` di template/starter dan tiap `videos/<slug>/index.html` | `index.html:7` |
| motion-kit | Engine motion b-roll: satu shape morph + kursor, spring closed-form, frame = fungsi waktu lokal clip | Vendored `vendor/motion-kit/`, di-`<script>` + `<link>` di `index.html`; clip memanggil `M.clip()` | `docs/agents/references/motion-broll-authoring.md` |
| style-kit | Engine style b-roll (broll-text, motion-graphic, whiteboard, stop-motion, vox, mix-media, parallax): draw-on, boil, handwriting, count-up, kamera, langkah on twos, sobekan, tangan, highlighter, peta (`SK.geo`), lapisan 3D (`SK.layer`, `SK.camera`, `SK.dof`, `SK.dollyZoom`); frame = fungsi waktu lokal clip | Vendored `vendor/style-kit/` (+ font OFL Anton, Caveat), dimuat setelah motion-kit; clip memanggil `SK.clip()` | `docs/agents/references/styles/README.md` |
| render-blur | Pass motion blur opsional: render 4× fps → ffmpeg `tmix` → fps asal, audio disalin | `npm run render:blur -- --slug <slug>` | `scripts/render-blur.mjs` |
| video CLI | Scaffold + jalankan proyek HyperFrames per video; `cutout` me-matte segmen `processed.mp4` untuk mix-media; `layers` menyiapkan sumber + subjek parallax; mode generate: `new --generate`, `voice`, `bgm`, `storyboard` ([ADR-0025](../adr/0025-generate-mode-explainer.md)) | `npm run video -- new\|check\|dev\|snapshot\|render\|cutout\|layers <slug>` | `scripts/video.mjs` |
| Studio | Web UI lokal (localhost + Tailscale): upload/hapus raw, sesi agen Claude/Codex di tmux dengan terminal xterm.js, tab Generate (form + panel review gate, ADR-0026), daftar render, publish Repliz, tab Suara (uji dengar blind) dan Musik (dengar/tolak BGM) | `npm run studio` | `scripts/studio.mjs`, [ADR-0020](../adr/0020-studio-web-ui.md) |
| xterm.js 6.0.0 | Terminal browser untuk Studio (di-vendor, MIT) | `vendor/xterm/` di-`<script>` oleh `scripts/studio/public/index.html` | `THIRD_PARTY_NOTICES.md` |
| Voice adapter | Voiceover TTS per paragraf (cache sha256, −16 LUFS), clone/design suara, uji dengar blind | `npm run voice -- say\|ref\|clone\|design\|voices\|test` | `scripts/voice.mjs`, `scripts/lib/voice/`, [ADR-0023](../adr/0023-voice-adapter-tts.md) |
| Gemini 3.8 Flash TTS | TTS cloud bahasa Indonesia, voice design, voice replication | `fetch` ke `generativelanguage.googleapis.com/v1beta` dengan `GEMINI_TTS_API_KEY` | `scripts/lib/voice/providers/gemini.mjs` |
| Supertonic 3 + uv | TTS lokal (suara stok F1–F5/M1–M5), Python 3.12 sidecar, bobot di `~/.cache/supertonic3` | `uv run --python 3.12 --with supertonic==1.3.1 …` | `scripts/lib/voice/providers/supertonic.mjs` |
| Music library | Katalog BGM `shared/music/` dengan allowlist lisensi, sha256, loudness, bukti lisensi | `npm run music -- add\|list\|check` | `scripts/music.mjs`, `scripts/lib/music.mjs`, [ADR-0024](../adr/0024-music-library.md) |
| whisper.cpp | Transkripsi audio → JSON word-level, lokal, offline | Git submodule `vendor/whisper.cpp`, model `ggml-large-v3-turbo` | `.gitmodules`, `docs/initial-setup.md` |
| ffmpeg / ffprobe | Audit media, ekstrak/normalisasi audio, silence/volume detect | Dipanggil manual di fase Story | `docs/agents/references/cut-and-pacing.md` |
| Cloudflare R2 | Object storage publik untuk MP4 final | `npx wrangler r2 object put` (remote) | `scripts/repliz-publish.mjs:274` |
| Wrangler | Auth + upload R2 (bukan S3 key) | `npx wrangler login`, `npx wrangler r2 ...` | `docs/repliz/integration-spec.md` |
| Repliz API | Schedule post multi-platform | `fetch` ke `REPLIZ_API_BASE_URL`, HTTP Basic Auth | `scripts/repliz-publish.mjs` |
| node:test | Unit test CLI publish | `node --test scripts/repliz-publish.test.mjs` | `package.json` |
| GitHub Actions | CI test on PR + push ke `main` | `.github/workflows/ci.yml` | CI |

## npm scripts (kontrak command)

Dari `package.json`:

- `npm run dev` → `npx --yes hyperframes@0.7.24 preview` — server preview
  long-running (jalankan sebagai background process).
- `npm run check` → `hyperframes lint && hyperframes validate && hyperframes inspect`.
- `npm run render` → `hyperframes render` (MP4).
- `npm run publish` → `hyperframes publish` (link shareable HyperFrames).
- `npm run repliz:publish` → `node scripts/repliz-publish.mjs` (auto-publish R2/Repliz).
- `npm run test:repliz` → `node --test scripts/repliz-publish.test.mjs`.
- `npm run voice` → `node scripts/voice.mjs` (adapter suara, ADR-0023); `npm run test:voice`.
- `npm run music` → `node scripts/music.mjs` (pustaka BGM, ADR-0024); `npm run test:music`.

## Konfigurasi HyperFrames

`hyperframes.json` menyetel registry + path:

- `registry`: `https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry`
- `paths.blocks`: `compositions`
- `paths.components`: `compositions/components`
- `paths.assets`: `assets`

`meta.json` = metadata project (`id: videos`, `name: videos`,
`createdAt: 2026-07-02T01:57:43.070Z`).

## Skills terpasang

`.claude/skills/` berisi paket skill HyperFrames vendored (`hyperframes`,
`hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`,
`hyperframes-cli`, `hyperframes-media`, `hyperframes-registry`, plus workflow
skill seperti `embedded-captions`, `faceless-explainer`, dsb). Sebagian aset
skill punya lisensi pihak ketiga; lihat `THIRD_PARTY_NOTICES.md`.

## Yang TIDAK ada di stack

- Tidak ada database, ORM, atau backend HTTP server.
- Tidak ada framework frontend (React/Vue/dll). Komposisi = HTML + GSAP polos.
- Tidak ada bundler/transpiler (TypeScript, webpack, vite).
- Tidak ada SDK cloud; R2 murni lewat Wrangler CLI, Repliz dan Gemini TTS murni lewat `fetch`.
- Tidak ada venv/dependency Python ter-commit; Supertonic dijalankan sekali pakai lewat `uv` (ADR-0023).

## Referensi

- [Data Model](data-model.md)
- [API Contract](api-contract.md)
- [NFR](nfr.md)
