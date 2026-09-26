# Per-Video HyperFrames Projects — Design

Status: approved (brainstorming 2026-09-26), belum diimplementasi
Date: 2026-09-26

## Masalah

Setiap video Dena ditulis langsung di `index.html` root yang ter-track git,
sehingga setiap edit video ikut ter-commit (contoh: komposisi
`dena-wfh-jaga-anak` di commit `17b3683`) dan `npm run check` di root gagal saat
media video dihapus.

## Keputusan

- Root `index.html` kembali ke template HyperFrames `init --example blank
  --resolution portrait` (1080×1920, 10 s), dengan satu penyesuaian: GSAP dari
  `vendor/gsap.min.js`, bukan CDN (RD-02-12, aset lokal). File ini tidak diubah
  untuk video.
- Setiap video menjadi proyek HyperFrames sendiri di `videos/<slug>/`
  (`/videos/*` sudah di-ignore):
  ```
  videos/<slug>/
    index.html              komposisi video (dari starter)
    compositions/broll/     clip motion b-roll
    assets/                 aset + SFX
    vendor -> ../../vendor  symlink
    renders/<slug>.mp4      hasil render
    snapshots/              hasil still check
  ```
  Path media di komposisi relatif terhadap folder itu (`processed.mp4`,
  `processed-audio.wav`, `assets/...`).
- Starter ter-track di `templates/dena-video/` (`index.html`, `hyperframes.json`).
- `scripts/video.mjs` lewat `npm run video -- <perintah> <slug>`.

## Bukti (spike 2026-09-26)

Proyek `videos/demo/` di scratchpad dengan symlink `vendor -> ../../vendor`:
`hyperframes lint videos/demo` tanpa error; `snapshot` menampilkan clip
motion-kit dengan font Geist termuat lewat symlink. `lint`, `validate`,
`inspect`, `preview`, `snapshot`, dan `render` semuanya menerima `[DIR]`
(0.7.24, `--help`). `repliz-publish --file` menerima path apa pun.

## Perintah (`scripts/video.mjs`)

| Perintah | Perilaku |
|---|---|
| `new <slug> [--duration <s>]` | Salin `templates/dena-video/` ke `videos/<slug>/`; ganti `__SLUG__` dan `__DURATION__` di `index.html`; durasi = `--duration`, atau durasi `videos/<slug>/processed.mp4` via `ffprobe` bila ada, atau `10`; buat `compositions/broll/`, `assets/`, dan symlink `vendor -> ../../vendor`. Tolak bila `videos/<slug>/index.html` sudah ada. |
| `check <slug>` | `hyperframes lint`, `validate`, `inspect` pada `videos/<slug>`; berhenti di kegagalan pertama. |
| `dev <slug>` | `hyperframes preview videos/<slug>` (long-running). |
| `snapshot <slug> --at <t,...>` | `hyperframes snapshot --at <t,...> -o videos/<slug>/snapshots videos/<slug>` dengan `GEMINI_API_KEY` dihapus dari environment. |
| `render <slug> [--blur]` | `hyperframes render --quality high -o videos/<slug>/renders/<slug>.mp4 videos/<slug>`; dengan `--blur`: `scripts/render-blur.mjs --slug <slug> --project videos/<slug>` (hasil `videos/<slug>/renders/<slug>-blur.mp4`). |

Slug: huruf kecil, angka, tanda hubung (`^[a-z0-9][a-z0-9-]*$`), sama dengan
`render-blur`. HyperFrames selalu `npx --yes hyperframes@0.7.24`. Hanya modul
bawaan Node (ADR-0007).

## Starter (`templates/dena-video/index.html`)

Struktur tanpa konten, nilai dari `internal/docs/design-system/visual-system.md`
dan pola yang terbukti di komposisi `wfh-jaga-anak`:

- `<head>`: `vendor/gsap.min.js`, `vendor/motion-kit/motion-kit.js`,
  `vendor/motion-kit/motion-kit.css`.
- CSS: `.clip`, `.bg-fill` (latar sebagai child), `.base-video`, `audio.clip`
  tersembunyi, token (`--white`, `--panel`, `--yellow: #facc15`,
  `--safe-bottom`), `.hl` (inline-block), `.progress-track`/`.progress-fill`,
  `.hook-card`, `.cta-card`, `.proof-chip`, `.label-card`, `.sticker`,
  `.caption` (Arial 950, stroke), `.broll` (z 22).
- Markup: `#root` (`data-composition-id="dena-__SLUG__"`, `data-start="0"`,
  1080×1920, `data-duration="__DURATION__"`), `.bg-fill`, `#base-video`
  (`processed.mp4`, track 1, `muted`), `#base-audio` (`processed-audio.wav`,
  track 10), `#progress` (track 3); komentar contoh untuk caption (track 2/8
  bergantian), hook/CTA (track 5), SFX (track 11+, tanpa `data-media-start`),
  mount b-roll (track 4, `id` wajib).
- Timeline `window.__timelines["dena-__SLUG__"]` dengan tween progress
  `scaleX 0→1` sepanjang durasi.

Audio di track 10 menyelesaikan satu konflik lama (skeleton lama menaruh audio
di track 1 bersama video).

## Dokumen

- **ADR-0010** `per-video-hyperframes-projects`.
- **EARS `rd-02`**: root `index.html` hanya sampel; komposisi video hidup di
  `videos/<slug>/`; `video new` menolak menimpa dan membuat symlink `vendor`;
  `video render` menulis ke `videos/<slug>/renders/`; `video snapshot` tanpa
  `GEMINI_API_KEY`.
- **`docs/agents/03-build.md`**: scaffold (`video new`), rakit di
  `videos/<slug>/index.html`, `video check`, `video render`, path render di
  Gate 3 dan publish.
- **`motion-broll-authoring.md`**: host = `videos/<slug>/index.html` (starter
  sudah memuat motion-kit), clip di `videos/<slug>/compositions/broll/`, still
  check via `video snapshot`.
- **`hyperframes-assembly.md`**: isi HTML Skeleton diganti rujukan ke starter;
  path `videos/example/...` menjadi relatif.
- **`quality-gates.md`**, **`CLAUDE.md`**, **`AGENTS.md`** (Project Structure,
  Commands, Interaction With HyperFrames, Linting), **`internal/docs`**
  (`data-model`, `frontend/composition-implementation` ditulis ulang, `runbook`,
  `visual-system`, `stack`, README index).

## Pengujian

- `npm run test:video` (`node --test scripts/video.test.mjs`, folder sementara
  lewat opsi `root`): penggantian placeholder, tolak menimpa, symlink `vendor`,
  durasi (`--duration`, `ffprobe`, default), argumen `check`/`dev`/`snapshot`/
  `render`, validasi slug. Masuk CI.
- End-to-end: `video new e2e-check --duration 4`, `video check e2e-check`
  (0 error), `video snapshot e2e-check --at 1,3`, `video render e2e-check`
  (MP4 4 s), lalu hapus `videos/e2e-check`.
- Root `npm run check` lulus untuk template sampel.

## Non-tujuan

- Memindahkan komposisi `wfh-jaga-anak` (medianya sudah dihapus user; tetap
  ada di git `17b3683`).
- Mengubah proyek contoh motion b-roll (tetap dirakit oleh
  `check:broll-examples`).
