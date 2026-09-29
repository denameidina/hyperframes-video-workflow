# Multi-Source Projects — Banyak Video + Gambar Menjadi Satu Edited Video — Design

Status: draft 2026-09-29
Date: 2026-09-29

## Latar belakang

Pipeline sekarang mengasumsikan **satu raw video per project**:

- `videos/<slug>/source.mp4` adalah satu symlink ke satu file di `raw/`
  (`docs/agents/01-story.md` langkah salin/symlink).
- `metadata.json.source` dan `cut-list.json.source` masing-masing satu string;
  timestamp segmen cut-list hanya punya satu timeline.
- Agen Story menulis perintah ffmpeg sendiri untuk membangun `processed.mp4`.
- Studio (ADR-0020, RD-05) memodelkan raw ↔ project 1:1: upload hanya video,
  sesi agen dibuka per raw file (`@studio_raw`, `buildPrompt({rawFile})`), dan
  delete raw meng-cascade project.
- Gambar dari Dena baru bisa masuk di Build (`assets/`, `video layers --image`);
  Story tidak tahu gambar itu ada.

Dena ingin satu edited video bisa dibuat dari **beberapa take talking-head
(speech) + B-roll video milik sendiri + gambar**, baik lewat Studio maupun
langsung lewat Claude/Codex.

## Keputusan yang sudah diambil

- **Scope:** kombinasi lengkap — beberapa take speech, B-roll video tanpa ucapan,
  dan gambar dalam satu project. Minimal satu sumber speech; montage tanpa narasi
  di luar scope.
- **Peran sumber:** label + catatan per file opsional. Bila ada, agen
  mengikutinya dan tidak pernah menimpanya; bila kosong, agen mendeteksi.
- **Urutan & take:** agen boleh memakai segmen dari take mana pun, urutan apa
  pun; kalimat yang direkam ulang → agen memilih satu take dan mencatat alasan.
- **Project-first:** project/slug dibuat dulu, file khusus video di-upload ke
  `videos/<slug>/sources/`.
- **Library shared:** folder baru `shared/` untuk file reusable (video + gambar),
  terpisah di Studio; setiap project bisa multi-select dari sana. `raw/`
  dipensiunkan dan isinya dimigrasi ke `shared/`.
- **Pendekatan teknis:** manifest `sources.json` + cut-list multi-sumber + script
  `npm run video -- cut <slug>` yang menormalisasi dan membangun `processed.mp4`.
  B-roll dan gambar **tidak** masuk `processed.mp4`; mereka jadi kandidat visual
  Screen Plan dan dipasang Build sebagai overlay (batas fase tetap).
- **Normalisasi:** 1080×1920 portrait, 30 fps, yuv420p; take landscape
  scale-to-fill + crop tengah (override `cropX`); audio 48 kHz stereo,
  loudnorm dua pass per sumber ke −16 LUFS, fade ±15 ms di setiap sambungan.

## 1. Layout folder dan `sources.json`

```
shared/                         # library reusable (menggantikan raw/), gitignored
  <file>.mp4|.mov|.m4v|.png|.jpg|.jpeg|.webp
videos/<slug>/
  sources/                      # upload khusus project ini
  sources.json                  # manifest semua sumber project
  transcripts/<id>.json         # transcript per sumber video (koordinat sumber)
  cut-list.json                 # segmen punya field source
  cut-map.json                  # hasil generate `video cut`
  processed.mp4                 # hasil `video cut`
  processed-transcript.json     # tetap, dari processed.mp4
```

Dihapus dari layout project: `source.mp4` (symlink) dan `transcript.json`
(diganti `transcripts/`).

File shared **dirujuk, tidak disalin**: `path` relatif ke folder project
(`../../shared/<file>`). Build tetap menyalin frame/cuplikan yang benar-benar
dipakai ke `assets/` dan mencatatnya di `asset-manifest.json` dengan
`provenance: "user-supplied"` plus `sourceId`.

### Skema `sources.json`

```json
{
  "version": 1,
  "sources": [
    {
      "id": "s1",
      "path": "sources/take-1.mp4",
      "origin": "project",
      "kind": "video",
      "role": "speech",
      "roleSource": "detected",
      "note": "",
      "probe": { "duration": 212.4, "width": 1080, "height": 1920, "fps": 30, "rotation": -90, "hasAudio": true }
    },
    {
      "id": "b1",
      "path": "../../shared/produk-closeup.mov",
      "origin": "shared",
      "kind": "video",
      "role": "broll",
      "roleSource": "user",
      "note": "pakai waktu bahas harga",
      "probe": { "duration": 8.2, "width": 1920, "height": 1080, "fps": 60, "rotation": 0, "hasAudio": false }
    },
    {
      "id": "i1",
      "path": "sources/screenshot-dm.png",
      "origin": "project",
      "kind": "image",
      "role": "image",
      "roleSource": "user",
      "note": "",
      "probe": { "width": 1170, "height": 2532 }
    }
  ]
}
```

Aturan:

- `id` berprefiks peran: `s` speech, `b` broll, `i` image, `u` untuk video yang
  perannya belum ditentukan. Id sekali diberikan **stabil** — tidak diganti saat
  peran berubah (sumber yang dimulai `u3` lalu terdeteksi speech tetap `u3`).
  Prefiks hanya membantu membaca; kebenaran peran ada di `role`.
- `kind`: `video` | `image` dari ekstensi. `image` selalu `role: "image"`.
- `role`: `speech` | `broll` | `image` | `null` (Auto). `roleSource`: `user` |
  `detected` | `null`. Peran dengan `roleSource: "user"` tidak pernah ditimpa
  agen maupun script.
- `probe` hanya ditulis script (ffprobe), bukan tangan.
- Semua penulisan `sources.json` lewat satu modul `scripts/video/sources.mjs`
  (dipakai CLI dan Studio).

### `npm run video -- sources <slug> [--add-shared a,b] [--remove <id>] [--set <id> role=<r> note=<t>]`

- Memindai `videos/<slug>/sources/`: file baru ditambahkan dengan id baru, file
  yang hilang dihapus dari manifest.
- `--add-shared` menambahkan file dari `shared/` (`origin: "shared"`); file yang
  tidak ada → error.
- Menjalankan ffprobe untuk setiap entri yang belum punya `probe` atau yang
  mtime/ukurannya berubah.
- Mempertahankan `id`, `role`, `roleSource`, `note` entri yang sudah ada.
- Mencetak ringkasan tabel sumber.

`metadata.json`: field `source` diganti `"sources": "sources.json"`; blok probe
per-file pindah ke `sources.json`.

## 2. Perubahan fase Story

- **Input:** `sources.json`, bukan `raw/<file>.mp4`. Tidak ada sumber `speech`
  setelah deteksi → Story berhenti dan menulis blocker note.
- **Inventaris sumber:** jalankan `video sources <slug>`, lalu transcribe setiap
  sumber `kind: video` (termasuk yang `role: null`) ke `transcripts/<id>.json`
  dengan timestamp relatif ke file sumbernya.
- **Deteksi peran** (hanya `role: null`): video dengan ucapan bermakna → `speech`,
  selain itu → `broll` (`roleSource: "detected"`). Output whisper yang hanya
  noise/halusinasi pendek tidak dihitung. Alasan setiap deteksi dicatat di
  `edit-decision-notes.md`.
- **Inventaris visual:** satu contact sheet (beberapa frame) per sumber `broll`
  dan per gambar; satu baris deskripsi per sumber di bagian **Source Inventory**
  pada `creative-brief.md` (id, peran, durasi, isi, catatan Dena). Story
  mendeskripsikan, tidak memutuskan penempatan.
- **Cerita lintas take:** hook dan segmen boleh dari take mana pun. Kalimat yang
  direkam ulang → satu take dipilih, alasan dicatat; take lain `action: "drop"`
  dengan `reason: "retake — s1 dipakai"`.
- **Storyboard** (yang disetujui Dena sebelum cut) menampilkan sumber per baris
  (`s2 01:12.40–01:20.10`) dan memuat Source Inventory, sehingga koreksi peran
  atau pilihan take terjadi di sana.
- **Cut:** setiap segmen `cut-list.json` wajib `source: "<id>"`; `processed.mp4`
  dibangun **hanya** lewat `npm run video -- cut <slug>`. Agen tidak menulis
  pipeline ffmpeg cut sendiri.
- **Cut Summary:** `s2 01:12.40–01:20.10 → out 00:03.20–00:09.60`, diambil dari
  `cut-map.json`.
- Setelah cut: `processed-transcript.json` tetap dari `processed.mp4`. Fase
  sesudah Story tetap bekerja di atas satu timeline hasil potongan.

### Tambahan Screen Plan

- Sumber `broll` dan `image` di Source Inventory masuk Visual Decision Log sebagai
  kandidat prioritas tertinggi (media milik Dena, paling kredibel). `note` Dena
  menjadi petunjuk penempatan.
- Setiap sumber `broll`/`image` yang **tidak** dipakai wajib punya baris log
  dengan alasannya.
- Build memasang sumber itu seperti aset lain: salin/trim ke `assets/`, catat di
  `asset-manifest.json` (`provenance: "user-supplied"`, `sourceId`).

## 3. Script `npm run video -- cut <slug>`

Input `sources.json` + `cut-list.json` → output `processed.mp4` + `cut-map.json`.

### Skema cut-list (berubah)

```json
{
  "targetDuration": 60,
  "speed": 1.2,
  "primaryHook": { "…": "tetap" },
  "segments": [
    { "source": "s2", "sourceStart": 72.4, "sourceEnd": 80.1, "action": "keep", "reason": "hook", "cropX": 0.5 },
    { "source": "s1", "sourceStart": 10.0, "sourceEnd": 14.2, "action": "drop", "reason": "retake — s2 dipakai" }
  ]
}
```

Field `source` tingkat atas dihapus. `cropX` opsional (0–1, default 0.5), hanya
berpengaruh bila sumber lebih lebar dari 9:16.

### Aturan

- Urutan segmen `keep` di array = urutan output. `drop` hanya catatan.
- Validasi: `source` ada di `sources.json` dengan `role: "speech"` dan
  `kind: "video"`; `0 ≤ sourceStart < sourceEnd ≤ probe.duration`; minimal satu
  segmen `keep`; `speed` di rentang 0.5–2.0 (default 1.2). Pelanggaran → exit
  non-zero, pesan menyebut indeks segmen dan field.
- Tulis ke `processed.mp4.part` / `cut-map.json.part` lalu rename; gagal → tidak
  ada output setengah jadi.

### Normalisasi

- **Video:** terapkan rotasi metadata (gotcha DJI) → scale-to-fill 1080×1920 →
  crop dengan `cropX` → 30 fps → yuv420p. Sumber yang tepat 9:16 hanya di-scale.
- **Audio:** resample 48 kHz stereo; loudnorm dua pass per **sumber** (pass 1
  mengukur seluruh file sekali, pass 2 memakai hasil ukur) ke −16 LUFS,
  TP −1.5, LRA 11; `afade` in/out 15 ms di tepi setiap segmen. Sumber speech
  tanpa audio → error validasi.
- **Speed:** `setpts`/`atempo` diterapkan setelah concat.
- Encode: libx264 CRF 18, preset medium, AAC 192 kbps, `+faststart`.

### `cut-map.json` (generated)

```json
{
  "speed": 1.2,
  "duration": 58.4,
  "segments": [
    { "index": 0, "source": "s2", "sourceStart": 72.4, "sourceEnd": 80.1, "outStart": 0, "outEnd": 6.417 }
  ]
}
```

`outStart/outEnd` dalam detik timeline `processed.mp4` (sudah dibagi speed).
Dipakai oleh Cut Summary, QA, dan `cutout`/`layers` (flag baru
`--source-frame` untuk mengambil frame resolusi asli dari sumber via cut-map;
default tetap dari `processed.mp4`).

### Susunan kode

- `scripts/video/cut-plan.mjs` — fungsi murni: `(sources, cutList, loudness) →
  { ffmpegArgs, cutMap }` + `validateCutList`. Tanpa I/O.
- `scripts/video/sources.mjs` — baca/tulis/merge manifest, scan folder, probe
  (probe di-inject agar bisa diuji).
- `scripts/video.mjs` — subcommand `sources`, `cut`, `migrate-sources`; hanya
  wiring I/O (ffprobe, loudnorm pass 1, ffmpeg, rename).

## 4. Studio

Studio berpindah dari berpusat raw ke berpusat **project**, dengan tab
**Shared Library**. Form sesi (runtime, model, effort, catatan) tetap.

### Tab Projects

- Daftar project: slug, ringkasan sumber (`3 speech · 2 broll · 1 image · 1 auto`),
  status sesi agen, render terakhir.
- **Buat project:** input slug (divalidasi seperti `video new`) → `video new
  <slug>` + folder `sources/` kosong + `sources.json` kosong.
- **Detail project:**
  - Upload banyak file (video + gambar) ke `sources/`, drag-and-drop; streaming
    ke `.part` lalu rename. Nama bentrok → 409, tidak menimpa.
  - **Tambah dari Shared:** picker multi-select isi `shared/`; attach tanpa
    salin.
  - Tabel sumber: thumbnail, nama, origin, durasi, dropdown peran (**Auto** /
    Speech / B-roll / Image — Image terkunci untuk gambar), catatan; simpan
    langsung ke `sources.json` (`roleSource: "user"`, Auto → `role: null`).
  - Hapus sumber: file project dihapus dari `sources/`; sumber shared hanya
    di-detach.
  - Mulai sesi agen per project; prompt: "Edit video project `videos/<slug>`;
    baca `sources.json`…" + catatan.
- **Hapus project:** hapus `videos/<slug>/` + sesi tmux-nya setelah konfirmasi.
  `shared/` tidak tersentuh.

### Tab Shared Library

- Upload video + gambar ke `shared/`; nama bentrok → 409.
- Setiap file menampilkan daftar project yang memakainya (scan `sources.json`
  semua project).
- Hapus file yang masih dipakai → 409 dengan daftar slug. Tidak ada cascade.

### Server

- `scripts/studio/raw.mjs` → `shared.mjs` (list, upload, delete, usage);
  ekstensi diterima `.mp4 .mov .m4v .png .jpg .jpeg .webp`.
- `scripts/studio/projects.mjs` baru: create/list/delete project, upload/hapus
  sumber, PATCH role/note, attach/detach shared — semuanya lewat
  `scripts/video/sources.mjs`.
- `POST /api/sessions` menerima `{ slug, mode, runtime, model, effort, notes }`
  (bukan `raw`); tag tmux `@studio_raw` → `@studio_slug`; `buildPrompt({ mode,
  slug, notes })`.
- Nama file upload disanitasi (basename, tanpa `..`, tanpa path separator);
  guard path tetap untuk root `shared/` dan `videos/<slug>/sources/`.

### Via Claude/Codex langsung

Dena menaruh file project di `videos/<slug>/sources/` (atau menyebut file dari
`shared/`) dan menulis role/catatan di prompt. Agen: `video new <slug>` →
`video sources <slug> --add-shared …` → `video sources <slug> --set <id>
role=… note=…` sesuai prompt → lanjut Story. Studio dan CLI bermuara ke
`sources.json` yang sama.

## 5. Migrasi

`npm run video -- migrate-sources [--apply]` (tanpa `--apply` = dry-run, hanya
mencetak rencana):

1. Pindahkan `raw/*` (kecuali `.gitkeep`) → `shared/`; hapus `raw/` bila kosong.
   Nama bentrok di `shared/` → berhenti dengan error, tidak menimpa.
2. Untuk setiap `videos/<slug>/` dengan symlink `source.mp4` dan tanpa
   `sources.json`:
   - `sources.json` dengan `s1` (`role: "speech"`, `roleSource: "user"`,
     `origin: "shared"`, path ke file hasil pindah) + probe.
   - `transcript.json` → `transcripts/s1.json`.
   - Setiap segmen `cut-list.json` diberi `source: "s1"`; field `source` tingkat
     atas dihapus.
   - `metadata.json`: `source` → `"sources": "sources.json"`.
   - `cut-map.json` dihitung dari cut-list (tanpa render ulang).
   - Symlink `source.mp4` dihapus.
3. Idempoten: project dengan `sources.json` dilewati.
4. `.gitignore`: `/raw/*` → `/shared/*` (+ `!/shared/.gitkeep`).

## Dokumentasi yang berubah

- **ADR-0022 Multi-source projects** (baru; accepted). Menandai ADR-0010 dan
  ADR-0020 "amended by ADR-0022".
- **RD-03-65…** kriteria EARS: inventaris sumber, deteksi peran & tidak menimpa
  label user, pilihan take, cut hanya via `video cut`, blocker tanpa speech,
  Screen Plan wajib mencatat sumber broll/image yang tidak dipakai.
- **RD-05** kriteria Studio ditulis ulang untuk project + shared library.
- **`internal/docs/architecture/data-model.md`**: `sources.json`, cut-list baru,
  `cut-map.json`, `metadata.sources`.
- **`docs/agents/01-story.md`, `references/cut-and-pacing.md`,
  `02-screen-plan.md`, `references/visual-planning.md`,
  `docs/skills/dena-video-editing-workflow/SKILL.md`, `03-build.md`**
  (sourceId di asset-manifest).
- **`docs/initial-setup.md`, `CLAUDE.md`, `AGENTS.md`, `internal/docs/README.md`**:
  perintah `video sources|cut|migrate-sources`, folder `shared/`, index ADR baru.

## Test

- `npm run test:video`:
  - `sources.mjs`: scan tambah/hapus, id stabil, merge tidak menimpa role user,
    add-shared file hilang → error, probe di-inject.
  - `cut-plan.mjs`: validasi (source tak dikenal, bukan speech, rentang di luar
    durasi, tanpa keep, speed di luar rentang), urutan segmen, rotasi + crop
    landscape + `cropX`, speed, `outStart/outEnd`.
  - Integrasi: dua fixture 2 detik via ffmpeg `lavfi` (portrait; landscape dengan
    rotasi) → `video cut` → durasi ≈ Σ segmen / speed (±0.1 s), 1080×1920,
    30 fps, ada audio.
  - `migrate-sources`: fixture project lama di temp dir → hasil sesuai, run kedua
    tanpa perubahan.
- `npm run test:studio`: CRUD project & sumber, attach/detach shared, hapus
  shared yang dipakai → 409, upload nama bentrok → 409, sanitasi nama, prompt
  sesi berisi slug.
- Verifikasi end-to-end manual: project percobaan dengan dua take pendek + satu
  gambar → `video sources` → `video cut` → cek `processed.mp4` dan `cut-map.json`.
  Tidak render penuh, tidak menyentuh R2/Repliz.

## Urutan pengerjaan

1. Docs: ADR-0022, RD-03-65…, RD-05, data-model.
2. `sources.mjs` + `video sources` + test.
3. `cut-plan.mjs` + `video cut` + test unit & integrasi.
4. `migrate-sources` + test, lalu jalankan pada project yang ada.
5. Docs fase Story/Screen Plan/Build + router + entry doors.
6. Studio: `shared.mjs`, `projects.mjs`, API, UI + test.
7. Verifikasi end-to-end.

## Di luar scope

- Montage/vlog tanpa sumber speech.
- B-roll sebagai cutaway yang di-bake di `processed.mp4` (tetap overlay Build).
- Letterbox blur untuk take landscape (hanya crop).
- Sinkronisasi multi-kamera (dua sudut dari momen yang sama); take dianggap
  rekaman terpisah.
