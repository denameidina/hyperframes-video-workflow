# Multi-Source Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One edited video can be built from several speech takes, B-roll videos, and images — uploaded per project or picked from a shared library — through the Studio or directly through Claude/Codex.

**Architecture:** Every project gets a `videos/<slug>/sources.json` manifest (one writer module, `scripts/lib/video-sources.mjs`, used by the CLI and the Studio). `cut-list.json` segments name their `source`; a pure planner (`scripts/lib/cut-plan.mjs`) turns them into one ffmpeg call that normalizes and joins the takes into `processed.mp4` plus `cut-map.json`. B-roll and images never enter `processed.mp4`: Story inventories them, Screen Plan places them, Build overlays them. `raw/` is retired for `shared/`; a one-off `migrate-sources` converts existing projects. The Studio becomes project-centered with a Shared Library tab.

**Tech Stack:** Node 22+ built-ins only (`node:fs`, `node:child_process`, `node:test`, `node:http`), ffmpeg/ffprobe 8.x, plain HTML/CSS/JS Studio UI, Markdown docs (Indonesian EARS in `internal/docs/`).

**Spec:** `docs/superpowers/specs/2026-09-29-multi-source-projects-design.md`

## Global Constraints

- No npm dependencies (ADR-0007): import only `node:*` modules and repo files.
- ES modules; 2-space indent, single quotes, semicolons (match `scripts/video.mjs`).
- Helper modules live in `scripts/lib/` (repo convention); tests are `scripts/*.test.mjs` run by `node --test`.
- Slug regex: `/^[a-z0-9][a-z0-9-]*$/` (`SLUG_RE` in `scripts/video.mjs`).
- Media extensions: video `.mp4 .mov .m4v`, image `.png .jpg .jpeg .webp` (case-insensitive).
- `sources.json` is `{ "version": 1, "sources": [...] }`; entry fields `id, path, origin (project|shared), kind (video|image), role (speech|broll|image|null), roleSource (user|detected|null), note, probe`.
- Id prefixes: `s` speech, `b` broll, `i` image, `u` role not yet known. Ids never change once given.
- A role with `roleSource: "user"` is never overwritten by the agent or a script.
- Shared files are referenced, never copied: `path` = `../../shared/<name>`.
- Rendered cut-list actions: `keep | tighten | move-to-hook | preserve-human`; not rendered: `cut-silence | cut-filler | cut-repeat | cut-tangent | cut-unclear | cut-retake`. Array order of rendered segments = output order.
- `processed.mp4`: 1080×1920, 30 fps, yuv420p, libx264 CRF 18 preset medium, GOP 30, AAC 192 kbps 48 kHz stereo, `+faststart`. Landscape → scale-to-fill + crop (`cropX` 0–1, default 0.5). Loudness per source to −16 LUFS (gain clamp ±20 dB, limiter ceiling 0.84 ≈ −1.5 dBTP). 15 ms fade at every segment edge. Speed default 1.2, allowed 0.5–2.0.
- Output files are written as `.part` then renamed.
- Studio: uploads never overwrite (409); deleting a shared file that a project uses → 409 with the slugs; no cascade.
- Docs: RD/ADR text in Indonesian EARS style (`internal/docs/requirements/ears-standard.md`); touched docs committed with the code they describe.
- Do not upload to R2 or call Repliz anywhere in this plan.

## Spec deviations (recorded in Task 1)

- Modules are `scripts/lib/video-sources.mjs`, `scripts/lib/cut-plan.mjs`, `scripts/lib/migrate-sources.mjs` (repo convention), not `scripts/video/*.mjs`.
- CLI flags: `video sources <slug> [--add-shared a,b] [--set <id> --role <r> [--note <t>] [--detected]] [--remove <id>]`.
- Retakes use the new action `cut-retake` (the spec said `drop`); rendered/not-rendered follows the action list above.
- tmux `@studio_raw` is removed, not renamed (the session name already carries the slug).
- `--source-frame` for `cutout`/`layers` is dropped from this plan (YAGNI; `cut-map.json` is enough to find source time by hand).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/lib/video-sources.mjs` (new) | Read/write/sync `sources.json`, probe media, set role/note, remove source, format table |
| `scripts/lib/cut-plan.mjs` (new) | Validate cut-list vs manifest, build ffmpeg argv, compute cut-map, parse loudnorm |
| `scripts/lib/migrate-sources.mjs` (new) | Plan/apply the raw/ + source.mp4 → shared/ + sources.json migration |
| `scripts/video.mjs` (modify) | Subcommands `sources`, `cut`, `migrate-sources`; `scaffold` creates `sources/` + empty manifest |
| `scripts/video-sources.test.mjs`, `scripts/cut-plan.test.mjs`, `scripts/migrate-sources.test.mjs` (new) | Unit + integration tests |
| `scripts/studio/files.mjs` (new) | Upload name sanitizing, streamed upload, project slug listing |
| `scripts/studio/shared.mjs` (new, replaces `raw.mjs`) | Shared library list/usage/delete/upload |
| `scripts/studio/projects.mjs` (new) | Project create/list/get/delete, source upload/attach/update/remove |
| `scripts/studio/app.mjs`, `agent.mjs`, `sessions.mjs`, `public/*` (modify) | Routes, prompt, tmux metadata, UI |
| `scripts/studio/raw.mjs` (delete) | Replaced |

---

### Task 1: ADR-0022, EARS criteria, spec amendments (docs first)

**Files:**
- Create: `internal/docs/adr/0022-multi-source-projects.md`
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md` (append after RD-03-64, before `## Referensi`)
- Modify: `internal/docs/requirements/rd-05-studio.md`
- Modify: `internal/docs/adr/0010-per-video-hyperframes-projects.md`, `internal/docs/adr/0020-studio-web-ui.md` (status line)
- Modify: `internal/docs/README.md` (index + registry)
- Modify: `docs/superpowers/specs/2026-09-29-multi-source-projects-design.md` (deviations)

**Interfaces:** Produces the requirement ids RD-03-65…74 and RD-05-04/05/13/14/15 that later tasks cite in comments.

- [ ] **Step 1: Write ADR-0022**

Create `internal/docs/adr/0022-multi-source-projects.md`:

```markdown
# ADR-0022 Multi-source projects: banyak take, B-roll, dan gambar menjadi satu video
Status: accepted
Date: 2026-09-29

## Context

Sampai ADR ini, satu project `videos/<slug>/` terikat ke satu raw video lewat
symlink `source.mp4`; `metadata.source` dan `cut-list.source` satu string; agen
Story menulis pipeline ffmpeg cut sendiri; Studio memodelkan raw ↔ project 1:1
(ADR-0020) dan delete raw meng-cascade project. Dena ingin satu edited video
dibuat dari beberapa take talking-head, B-roll miliknya sendiri, dan gambar —
lewat Studio maupun langsung lewat Claude/Codex.

## Decision

- **Project-first.** File khusus satu video di-upload ke `videos/<slug>/sources/`.
- **`shared/` menggantikan `raw/`** sebagai library file reusable (video + gambar).
  Project merujuk file shared lewat path `../../shared/<name>`, tidak menyalin.
- **Manifest `videos/<slug>/sources.json`** (version 1) mencatat setiap sumber:
  `id`, `path`, `origin`, `kind`, `role` (`speech|broll|image|null`),
  `roleSource` (`user|detected|null`), `note`, `probe`. Satu modul penulis
  (`scripts/lib/video-sources.mjs`) dipakai CLI (`npm run video -- sources`) dan
  Studio. Peran dari Dena (`roleSource: "user"`) tidak pernah ditimpa.
- **Cut-list multi-sumber.** Setiap segmen punya `source: "<id>"`; field
  `source` tingkat atas dihapus. Urutan segmen yang dirender = urutan output.
  Aksi baru `cut-retake` untuk take yang tidak dipakai.
- **`npm run video -- cut <slug>`** adalah satu-satunya jalur membangun
  `processed.mp4`: normalisasi 1080×1920/30 fps, loudness per sumber −16 LUFS,
  fade 15 ms per sambungan, speed via `setpts`/`atempo`; juga menulis
  `cut-map.json` (waktu output ↔ sumber).
- **B-roll dan gambar tidak masuk `processed.mp4`.** Story menginventarisnya
  (Source Inventory), Screen Plan menempatkannya, Build memasangnya sebagai
  overlay. Batas fase ADR-0008 tetap.
- **Studio berpusat project** dengan tab Shared Library. Hapus file shared yang
  masih dipakai ditolak (409); tidak ada cascade delete.
- Migrasi sekali jalan: `npm run video -- migrate-sources [--apply]`.

## Consequences

- Satu take pun memakai model yang sama (`sources.json` dengan satu `s1`).
- `transcript.json` diganti `transcripts/<id>.json` (koordinat sumber);
  `processed-transcript.json` tetap.
- Montage tanpa sumber speech di luar scope; Story berhenti dengan blocker note.
- Mengubah sebagian ADR-0010 (layout project) dan ADR-0020 (raw library Studio).

## Referensi

- Spec: `docs/superpowers/specs/2026-09-29-multi-source-projects-design.md`
- Kriteria: RD-03-65…RD-03-74, RD-05-04/05/13/14/15
```

- [ ] **Step 2: Append RD-03-65…74**

In `internal/docs/requirements/rd-03-video-editing-workflow.md`, insert after the RD-03-64 bullet (before `## Referensi`):

```markdown
- **RD-03-65** (Ubiquitous) — Fase Story shall membaca sumber project dari
  `videos/<slug>/sources.json` dan menjalankan `npm run video -- sources <slug>`
  sebelum transcribe ([ADR-0022](../adr/0022-multi-source-projects.md)).
- **RD-03-66** (Event-driven) — When sebuah sumber video punya `role: null`,
  fase Story shall men-transcribe-nya ke `transcripts/<id>.json`, menetapkan
  `role` `speech` (ada ucapan bermakna) atau `broll` dengan
  `roleSource: "detected"`, dan mencatat alasannya di `edit-decision-notes.md`.
- **RD-03-67** (Unwanted) — If sebuah sumber punya `roleSource: "user"`, then
  fase Story dan `video sources --detected` shall tidak mengubah `role`-nya.
- **RD-03-68** (Unwanted) — If tidak ada sumber `speech` setelah deteksi, then
  fase Story shall berhenti dan menulis blocker note, bukan membuat cut.
- **RD-03-69** (Ubiquitous) — Fase Story shall menulis `source` di setiap segmen
  `cut-list.json` dan membangun `processed.mp4` hanya dengan
  `npm run video -- cut <slug>`.
- **RD-03-70** (Event-driven) — When sebuah kalimat direkam di lebih dari satu
  take, fase Story shall memakai satu take dan mencatat take lain sebagai segmen
  `cut-retake` beserta alasannya.
- **RD-03-71** (Ubiquitous) — Fase Story shall mencatat setiap sumber `broll` dan
  `image` (id, durasi/ukuran, isi, catatan Dena) di bagian `## Source Inventory`
  pada `creative-brief.md`.
- **RD-03-72** (Ubiquitous) — Fase Screen Plan shall mencantumkan setiap sumber
  `broll`/`image` dari Source Inventory di Visual Decision Log, termasuk alasan
  bila sumber itu tidak dipakai.
- **RD-03-73** (Unwanted) — If sebuah segmen yang dirender merujuk sumber yang
  tidak ada, bukan video `speech`, atau melewati durasi sumber, then
  `video cut` shall gagal dengan pesan yang menyebut indeks segmen dan tidak
  menulis `processed.mp4`.
- **RD-03-74** (Ubiquitous) — `video cut` shall menormalisasi setiap segmen ke
  1080×1920, 30 fps, audio 48 kHz stereo dengan loudness per sumber −16 LUFS,
  dan menulis `cut-map.json`.
```

- [ ] **Step 3: Rewrite RD-05 criteria**

In `internal/docs/requirements/rd-05-studio.md`:
- Domain line: replace `web UI lokal untuk raw video, sesi agen tmux, dan publish` with `web UI lokal untuk project video (sumber per project + shared library), sesi agen tmux, dan publish`, and add `, [ADR-0022](../adr/0022-multi-source-projects.md)` after the ADR-0020 link.
- Replace RD-05-04 and RD-05-05 with:

```markdown
- **RD-05-04** (Event-driven) — When Dena uploads a video or image, Studio shall
  stream it to `<dir>/.<name>.part` (dir = `shared/` or `videos/<slug>/sources/`)
  and rename it to `<dir>/<name>` only after the upload completes; an existing
  name shall be rejected with 409.
- **RD-05-05** (Unwanted) — If Dena deletes a shared file that a project's
  `sources.json` references, then Studio shall reject it with 409 and name those
  projects.
```

- Replace RD-05-06 text `When Dena starts an edit` with `When Dena starts an edit for a project`.
- Append:

```markdown
- **RD-05-13** (Event-driven) — When Dena confirms deleting a project, Studio
  shall kill its tmux session and delete `videos/<slug>/` without touching
  `shared/`.
- **RD-05-14** (Event-driven) — When Dena sets a source's role or note, Studio
  shall write it to `sources.json` with `roleSource: "user"` (Auto clears role
  and roleSource).
- **RD-05-15** (Event-driven) — When Dena attaches shared files to a project,
  Studio shall add them to `sources.json` with `origin: "shared"` without
  copying them.
```

- [ ] **Step 4: Mark amended ADRs and index**

- In `internal/docs/adr/0010-per-video-hyperframes-projects.md` and `internal/docs/adr/0020-studio-web-ui.md`, change the `Status: accepted` line to `Status: accepted (amended by [ADR-0022](0022-multi-source-projects.md))`.
- In `internal/docs/README.md`, add after the `adr/0021-craft-kit-choreography.md` entry (line ~68) a numbered entry `45. [adr/0022-multi-source-projects.md](adr/0022-multi-source-projects.md) - project multi-sumber: sources.json, shared/, video cut, Studio berpusat project.` (renumber any following entries by +1), and change the registry row `| Keputusan arsitektur | [adr/](adr/) (0001–0020) |` to `(0001–0022)`.

- [ ] **Step 5: Amend the spec**

In `docs/superpowers/specs/2026-09-29-multi-source-projects-design.md`: set `Status: approved 2026-09-29 (plan docs/superpowers/plans/2026-09-29-multi-source-projects.md)` and append a section `## Amandemen saat planning` listing the five "Spec deviations" bullets from this plan's header (translated to Indonesian).

- [ ] **Step 6: Verify links and commit**

Run: `grep -rn "0022-multi-source-projects" internal/docs | wc -l` → Expected: ≥ 5.

```bash
git add internal/docs docs/superpowers/specs/2026-09-29-multi-source-projects-design.md
git commit -m "docs: ADR-0022 multi-source projects and RD-03/RD-05 criteria"
```

---

### Task 2: `sources.json` module and `video sources`

**Files:**
- Create: `scripts/lib/video-sources.mjs`
- Create: `scripts/video-sources.test.mjs`
- Modify: `scripts/video.mjs` (imports, `scaffold`, `main`, usage header, `commandsFor` error text)
- Modify: `scripts/video.test.mjs` (scaffold test)
- Modify: `package.json` (`test:video`)
- Modify: `internal/docs/architecture/data-model.md` (new `sources.json` section)

**Interfaces:**
- Produces (all exported from `scripts/lib/video-sources.mjs`):
  - `VIDEO_EXT: string[]`, `IMAGE_EXT: string[]`, `SOURCES_FILE = 'sources.json'`, `SOURCES_DIR = 'sources'`, `SHARED_DIR = 'shared'`
  - `kindOf(name) → 'video'|'image'|null`, `isMedia(name) → boolean`
  - `readManifest(dir) → {version:1, sources}` (empty manifest when file missing)
  - `writeManifest(dir, manifest) → void`
  - `nextId(sources, role) → string`
  - `sourceFile(dir, source) → string` (absolute-ish path of the file)
  - `parseProbe(json, kind) → probe`, `probeMedia(file, kind, run = spawnSync) → probe`
  - `syncManifest({ dir, root, addShared = [], probe = probeMedia }) → manifest`
  - `setSource(dir, id, { role, note, by = 'user' }) → source`
  - `removeSource(dir, id) → source`
  - `formatSources(manifest) → string`
- Probe shape: video `{ duration, width, height, fps, rotation, hasAudio, size, mtime }`; image `{ width, height, size, mtime }`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/video-sources.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  formatSources, isMedia, kindOf, nextId, parseProbe, readManifest, removeSource, setSource, syncManifest, writeManifest,
} from './lib/video-sources.mjs';
import { main } from './video.mjs';

const VIDEO_PROBE = { duration: 3, width: 1080, height: 1920, fps: 30, rotation: 0, hasAudio: true };
const fakeProbe = () => {
  const calls = [];
  const probe = (file, kind) => {
    calls.push(file);
    return kind === 'image' ? { width: 10, height: 20 } : { ...VIDEO_PROBE };
  };
  return { probe, calls };
};

function project() {
  const root = mkdtempSync(join(tmpdir(), 'sources-'));
  const dir = join(root, 'videos/demo');
  mkdirSync(join(dir, 'sources'), { recursive: true });
  mkdirSync(join(root, 'shared'));
  return { root, dir, done: () => rmSync(root, { recursive: true, force: true }) };
}

test('kindOf and isMedia', () => {
  assert.equal(kindOf('a.MOV'), 'video');
  assert.equal(kindOf('a.jpeg'), 'image');
  assert.equal(kindOf('a.txt'), null);
  assert.equal(isMedia('.a.mp4.part'), false);
  assert.equal(isMedia('a.webp'), true);
});

test('parseProbe reads a rotated video and an image', () => {
  const video = JSON.stringify({
    streams: [
      { codec_type: 'video', width: 1920, height: 1080, r_frame_rate: '30000/1001', side_data_list: [{ rotation: -90 }] },
      { codec_type: 'audio' },
    ],
    format: { duration: '12.3456' },
  });
  assert.deepEqual(parseProbe(video, 'video'), { duration: 12.346, width: 1920, height: 1080, fps: 29.97, rotation: -90, hasAudio: true });
  const silent = JSON.stringify({ streams: [{ codec_type: 'video', width: 1, height: 2, r_frame_rate: '25/1', tags: { rotate: '90' } }], format: { duration: '1' } });
  assert.equal(parseProbe(silent, 'video').hasAudio, false);
  assert.equal(parseProbe(silent, 'video').rotation, 90);
  assert.deepEqual(parseProbe(JSON.stringify({ streams: [{ codec_type: 'video', width: 4, height: 5 }] }), 'image'), { width: 4, height: 5 });
  assert.throws(() => parseProbe(JSON.stringify({ streams: [] }), 'video'), /no video stream/);
});

test('nextId fills the first free number per prefix', () => {
  assert.equal(nextId([], 'speech'), 's1');
  assert.equal(nextId([{ id: 's1' }, { id: 's3' }], 'speech'), 's2');
  assert.equal(nextId([{ id: 'u1' }], null), 'u2');
  assert.equal(nextId([], 'image'), 'i1');
  assert.equal(nextId([], 'broll'), 'b1');
});

test('readManifest returns an empty manifest and rejects a foreign file', () => {
  const p = project();
  assert.deepEqual(readManifest(p.dir), { version: 1, sources: [] });
  writeFileSync(join(p.dir, 'sources.json'), '{"sources":[]}');
  assert.throws(() => readManifest(p.dir), /version 1/);
  p.done();
});

test('syncManifest adds project files and shared files, then keeps ids, roles, and notes', () => {
  const p = project();
  writeFileSync(join(p.dir, 'sources/take-1.mp4'), 'a');
  writeFileSync(join(p.dir, 'sources/shot.png'), 'b');
  writeFileSync(join(p.root, 'shared/intro.mov'), 'c');
  const { probe, calls } = fakeProbe();
  const m = syncManifest({ dir: p.dir, root: p.root, addShared: ['intro.mov'], probe });
  assert.deepEqual(m.sources.map((s) => [s.id, s.path, s.origin, s.kind, s.role, s.roleSource]), [
    ['i1', 'sources/shot.png', 'project', 'image', 'image', 'detected'],
    ['u1', 'sources/take-1.mp4', 'project', 'video', null, null],
    ['u2', '../../shared/intro.mov', 'shared', 'video', null, null],
  ]);
  assert.equal(calls.length, 3);
  assert.equal(m.sources[1].probe.duration, 3);
  assert.equal(typeof m.sources[1].probe.size, 'number');
  assert.deepEqual(readManifest(p.dir), m);

  setSource(p.dir, 'u1', { role: 'speech', note: 'take utama' });
  const again = syncManifest({ dir: p.dir, root: p.root, probe });
  assert.equal(calls.length, 3, 'unchanged files are not probed again');
  assert.deepEqual(again.sources.find((s) => s.id === 'u1'), { ...m.sources[1], role: 'speech', roleSource: 'user', note: 'take utama' });

  writeFileSync(join(p.dir, 'sources/take-1.mp4'), 'changed');
  utimesSync(join(p.dir, 'sources/take-1.mp4'), new Date(), new Date(Date.now() + 5000));
  syncManifest({ dir: p.dir, root: p.root, probe });
  assert.equal(calls.length, 4, 'a changed file is probed again');

  rmSync(join(p.dir, 'sources/shot.png'));
  assert.deepEqual(syncManifest({ dir: p.dir, root: p.root, probe }).sources.map((s) => s.id), ['u1', 'u2']);
  p.done();
});

test('syncManifest rejects bad or missing shared files', () => {
  const p = project();
  const { probe } = fakeProbe();
  assert.throws(() => syncManifest({ dir: p.dir, root: p.root, addShared: ['../x.mp4'], probe }), /invalid shared file name/);
  assert.throws(() => syncManifest({ dir: p.dir, root: p.root, addShared: ['nope.mp4'], probe }), /shared\/nope\.mp4 not found/);
  writeFileSync(join(p.root, 'shared/gone.mp4'), 'x');
  syncManifest({ dir: p.dir, root: p.root, addShared: ['gone.mp4'], probe });
  rmSync(join(p.root, 'shared/gone.mp4'));
  assert.throws(() => syncManifest({ dir: p.dir, root: p.root, probe }), /u1: \.\.\/\.\.\/shared\/gone\.mp4 is missing/);
  p.done();
});

test('setSource guards roles, detected writes, and notes', () => {
  const p = project();
  writeManifest(p.dir, { version: 1, sources: [
    { id: 'u1', path: 'sources/a.mp4', origin: 'project', kind: 'video', role: null, roleSource: null, note: '' },
    { id: 'i1', path: 'sources/b.png', origin: 'project', kind: 'image', role: 'image', roleSource: 'detected', note: '' },
  ] });
  assert.equal(setSource(p.dir, 'u1', { role: 'broll', by: 'detected' }).roleSource, 'detected');
  assert.equal(setSource(p.dir, 'u1', { role: 'speech' }).roleSource, 'user');
  assert.throws(() => setSource(p.dir, 'u1', { role: 'broll', by: 'detected' }), /set by Dena/);
  assert.deepEqual([setSource(p.dir, 'u1', { role: 'auto' }).role, readManifest(p.dir).sources[0].roleSource], [null, null]);
  assert.throws(() => setSource(p.dir, 'u1', { role: 'image' }), /speech, broll, or auto/);
  assert.throws(() => setSource(p.dir, 'i1', { role: 'speech' }), /always role image/);
  assert.throws(() => setSource(p.dir, 'zz', { role: 'speech' }), /unknown source id "zz"/);
  assert.equal(setSource(p.dir, 'i1', { note: '  logo  ' }).note, 'logo');
  assert.throws(() => setSource(p.dir, 'i1', { note: 'x'.repeat(501) }), /at most 500/);
  p.done();
});

test('removeSource deletes project files and only detaches shared files', () => {
  const p = project();
  writeFileSync(join(p.dir, 'sources/a.mp4'), 'a');
  writeFileSync(join(p.root, 'shared/s.mp4'), 's');
  const { probe } = fakeProbe();
  syncManifest({ dir: p.dir, root: p.root, addShared: ['s.mp4'], probe });
  removeSource(p.dir, 'u1');
  removeSource(p.dir, 'u2');
  assert.equal(existsSync(join(p.dir, 'sources/a.mp4')), false);
  assert.equal(existsSync(join(p.root, 'shared/s.mp4')), true);
  assert.deepEqual(readManifest(p.dir).sources, []);
  assert.throws(() => removeSource(p.dir, 'u1'), /unknown source id/);
  p.done();
});

test('formatSources prints one line per source', () => {
  assert.match(formatSources({ sources: [] }), /no sources yet/);
  const line = formatSources({ sources: [{ id: 's1', role: 'speech', roleSource: 'user', path: 'sources/a.mp4', probe: { duration: 3 }, note: 'hook' }] });
  assert.equal(line, 's1  speech  (user)  sources/a.mp4  3 s  "hook"');
});

test('video sources CLI syncs, attaches shared, and sets roles', () => {
  const p = project();
  writeFileSync(join(p.dir, 'sources/a.mp4'), 'a');
  writeFileSync(join(p.root, 'shared/logo.png'), 'l');
  const probeJson = JSON.stringify({ streams: [{ codec_type: 'video', width: 1080, height: 1920, r_frame_rate: '30/1' }, { codec_type: 'audio' }], format: { duration: '2' } });
  const run = (cmd) => ({ status: cmd === 'ffprobe' ? 0 : 1, stdout: probeJson, stderr: '' });
  main(['sources', 'demo', '--add-shared', 'logo.png'], { run, root: p.root });
  main(['sources', 'demo', '--set', 'u1', '--role', 'speech', '--note', 'take 1'], { run, root: p.root });
  const m = JSON.parse(readFileSync(join(p.dir, 'sources.json'), 'utf8'));
  assert.deepEqual(m.sources.map((s) => [s.id, s.role, s.roleSource, s.note]), [['u1', 'speech', 'user', 'take 1'], ['i1', 'image', 'detected', '']]);
  assert.throws(() => main(['sources', 'demo', '--set', 'u1', '--role', 'broll', '--detected'], { run, root: p.root }), /set by Dena/);
  p.done();
});

test('video sources CLI refuses a missing project', () => {
  const root = mkdtempSync(join(tmpdir(), 'sources-'));
  assert.throws(() => main(['sources', 'nope'], { root }), /videos\/nope not found/);
  rmSync(root, { recursive: true, force: true });
});
```

In `scripts/video.test.mjs`, extend the `scaffold creates the project…` test with:

```js
  assert.ok(lstatSync(join(dir, 'sources')).isDirectory());
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')), { version: 1, sources: [] });
```

In `package.json` set `"test:video": "node --test scripts/video.test.mjs scripts/video-sources.test.mjs"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:video`
Expected: FAIL — `Cannot find module './lib/video-sources.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/video-sources.mjs`**

```js
// Project source manifest videos/<slug>/sources.json (ADR-0022, RD-03-65..67, RD-05-14/15).
// The one writer used by the video CLI and the Studio: scan sources/, attach shared/ files, probe, set role/note.
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

export const VIDEO_EXT = ['.mp4', '.mov', '.m4v'];
export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
export const SOURCES_FILE = 'sources.json';
export const SOURCES_DIR = 'sources';
export const SHARED_DIR = 'shared';
const PREFIX = { speech: 's', broll: 'b', image: 'i' };
const NOTE_MAX = 500;

export function kindOf(name) {
  const ext = extname(String(name)).toLowerCase();
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (IMAGE_EXT.includes(ext)) return 'image';
  return null;
}

export const isMedia = (name) => !String(name).startsWith('.') && kindOf(name) !== null;

export function readManifest(dir) {
  const file = join(dir, SOURCES_FILE);
  if (!existsSync(file)) return { version: 1, sources: [] };
  const m = JSON.parse(readFileSync(file, 'utf8'));
  if (m?.version !== 1 || !Array.isArray(m.sources)) throw new Error(`${file} is not a version 1 sources manifest`);
  return m;
}

export function writeManifest(dir, manifest) {
  const file = join(dir, SOURCES_FILE);
  writeFileSync(`${file}.part`, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(`${file}.part`, file);
}

// Ids are stable: a u-source that later becomes speech keeps its u-id (cut-lists refer to it).
export function nextId(sources, role) {
  const p = PREFIX[role] ?? 'u';
  const used = new Set(sources.map((s) => s.id));
  for (let n = 1; ; n++) if (!used.has(`${p}${n}`)) return `${p}${n}`;
}

export const sourceFile = (dir, source) => join(dir, source.path);

function newEntry(sources, { path, origin, name }) {
  const kind = kindOf(name);
  const role = kind === 'image' ? 'image' : null;
  return { id: nextId(sources, role), path, origin, kind, role, roleSource: role ? 'detected' : null, note: '' };
}

const round3 = (x) => Math.round(x * 1000) / 1000;

export function parseProbe(json, kind) {
  const d = JSON.parse(json);
  const streams = d.streams || [];
  const v = streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error('no video stream');
  const size = { width: v.width, height: v.height };
  if (kind === 'image') return size;
  const [num, den] = String(v.r_frame_rate || '0/1').split('/').map(Number);
  const rotation = (v.side_data_list || []).find((x) => x.rotation !== undefined)?.rotation ?? Number(v.tags?.rotate ?? 0);
  return {
    duration: round3(Number.parseFloat(d.format?.duration)),
    ...size,
    fps: den ? round3(num / den) : 0,
    rotation: Number(rotation) || 0,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
  };
}

export function probeMedia(file, kind, run = spawnSync) {
  const r = run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe could not read ${file}`);
  return parseProbe(r.stdout, kind);
}

/* Bring the manifest in line with the disk: add new files in sources/ and the named shared files,
   drop project files that are gone, and (re)probe entries whose size or mtime changed.
   id, role, roleSource, and note of existing entries are never changed here. */
export function syncManifest({ dir, root, addShared = [], probe = probeMedia }) {
  const manifest = readManifest(dir);
  const sources = manifest.sources.filter((s) => s.origin !== 'project' || existsSync(sourceFile(dir, s)));
  const srcDir = join(dir, SOURCES_DIR);
  for (const name of existsSync(srcDir) ? readdirSync(srcDir).filter(isMedia).sort() : []) {
    const path = `${SOURCES_DIR}/${name}`;
    if (!sources.some((s) => s.path === path)) sources.push(newEntry(sources, { path, origin: 'project', name }));
  }
  for (const name of addShared) {
    if (basename(name) !== name || !isMedia(name)) throw new Error(`invalid shared file name "${name}"`);
    if (!existsSync(join(root, SHARED_DIR, name))) throw new Error(`${SHARED_DIR}/${name} not found`);
    const path = `../../${SHARED_DIR}/${name}`;
    if (!sources.some((s) => s.path === path)) sources.push(newEntry(sources, { path, origin: 'shared', name }));
  }
  for (const s of sources) {
    const file = sourceFile(dir, s);
    if (!existsSync(file)) throw new Error(`${s.id}: ${s.path} is missing`);
    const st = statSync(file);
    if (s.probe?.size === st.size && s.probe?.mtime === st.mtimeMs) continue;
    s.probe = { ...probe(file, s.kind), size: st.size, mtime: st.mtimeMs };
  }
  const next = { ...manifest, sources };
  writeManifest(dir, next);
  return next;
}

function findSource(manifest, id) {
  const s = manifest.sources.find((x) => x.id === id);
  if (!s) throw new Error(`unknown source id "${id}"`);
  return s;
}

// by: 'user' (Dena, via Studio or prompt) or 'detected' (the Story agent). A user role is never overwritten by detection.
export function setSource(dir, id, { role, note, by = 'user' } = {}) {
  const manifest = readManifest(dir);
  const s = findSource(manifest, id);
  if (role !== undefined) {
    if (by === 'detected' && s.roleSource === 'user') throw new Error(`${id}: role was set by Dena; not changing it`);
    if (s.kind === 'image') {
      if (role !== 'image') throw new Error(`${id} is an image; an image source is always role image`);
    } else if (role === 'auto' || role === null) {
      s.role = null;
      s.roleSource = null;
    } else if (role === 'speech' || role === 'broll') {
      s.role = role;
      s.roleSource = by;
    } else {
      throw new Error(`role for a video source must be speech, broll, or auto (got "${role}")`);
    }
  }
  if (note !== undefined) {
    if (typeof note !== 'string' || note.length > NOTE_MAX) throw new Error(`note must be a string of at most ${NOTE_MAX} characters`);
    s.note = note.trim();
  }
  writeManifest(dir, manifest);
  return s;
}

// A project file is deleted from sources/; a shared file is only detached (shared/ is untouched).
export function removeSource(dir, id) {
  const manifest = readManifest(dir);
  const s = findSource(manifest, id);
  if (s.origin === 'project') rmSync(sourceFile(dir, s), { force: true });
  writeManifest(dir, { ...manifest, sources: manifest.sources.filter((x) => x !== s) });
  return s;
}

export function formatSources({ sources }) {
  if (!sources.length) return 'no sources yet: put files in sources/ or use --add-shared <name,...>';
  return sources.map((s) => [
    s.id, s.role ?? 'auto', s.roleSource ? `(${s.roleSource})` : '', s.path,
    s.probe?.duration ? `${s.probe.duration} s` : '', s.note ? `"${s.note}"` : '',
  ].filter(Boolean).join('  ')).join('\n');
}
```

- [ ] **Step 4: Wire `scaffold` and `video sources` into `scripts/video.mjs`**

1. Header usage comment: add a line
   `//        npm run video -- sources <slug> [--add-shared a,b] [--set <id> --role <r> [--note <t>] [--detected]] [--remove <id>]`
   and `// Multi-source spec: docs/superpowers/specs/2026-09-29-multi-source-projects-design.md (ADR-0022)`.
2. Import:
   ```js
   import { SOURCES_DIR, formatSources, probeMedia, readManifest, removeSource, setSource, syncManifest, writeManifest } from './lib/video-sources.mjs';
   ```
   (`readManifest` is used in Task 3; importing it now is fine.)
3. In `scaffold`, after `mkdirSync(join(dir, 'assets'), { recursive: true });` add:
   ```js
   mkdirSync(join(dir, SOURCES_DIR), { recursive: true });
   if (!hasEntry(join(dir, 'sources.json'))) writeManifest(dir, { version: 1, sources: [] });
   ```
4. In `main`'s `parseArgs` options add: `'add-shared': { type: 'string' }, set: { type: 'string' }, role: { type: 'string' }, note: { type: 'string' }, detected: { type: 'boolean', default: false }, remove: { type: 'string' }, apply: { type: 'boolean', default: false },`
5. In `main`, after the `new` branch:
   ```js
   if (cmd === 'sources') {
     const dir = projectDir(slug, root);
     if (!existsSync(dir)) throw new Error(`${dir} not found; run npm run video -- new ${slug}`);
     const probe = (f, k) => probeMedia(f, k, run);
     const addShared = (values['add-shared'] || '').split(',').map((x) => x.trim()).filter(Boolean);
     syncManifest({ dir, root, addShared, probe });
     if (values.set !== undefined) setSource(dir, values.set, { role: values.role, note: values.note, by: values.detected ? 'detected' : 'user' });
     if (values.remove !== undefined) removeSource(dir, values.remove);
     console.log(formatSources(readManifest(dir)));
     return;
   }
   ```
6. `commandsFor` default error: `use new, sources, cut, check, dev, snapshot, render, cutout, layers, migrate-sources`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:video`
Expected: all tests PASS (fix the `commandsFor` unknown-command test if it asserts the old message text).

- [ ] **Step 6: Document `sources.json` in the data model**

In `internal/docs/architecture/data-model.md`, insert before `## \`cut-list.json\` (Story)`:

```markdown
## `sources.json` (Story, Studio)

`{ version: 1, sources: [{ id, path, origin, kind, role, roleSource, note, probe }] }` —
satu entri per sumber project ([ADR-0022](../adr/0022-multi-source-projects.md)).
`path` relatif ke `videos/<slug>/`: `sources/<file>` (`origin: "project"`) atau
`../../shared/<file>` (`origin: "shared"`, dirujuk tanpa disalin).
`kind` ∈ `video | image`. `role` ∈ `speech | broll | image | null` (null = Auto,
belum dideteksi). `roleSource` ∈ `user | detected | null`; peran `user` tidak
pernah ditimpa. `id` berprefiks `s|b|i|u` dan tidak pernah berubah.
`probe` (hanya ditulis script): video `{ duration, width, height, fps, rotation,
hasAudio, size, mtime }`, gambar `{ width, height, size, mtime }`.
Penulis tunggal: `scripts/lib/video-sources.mjs` (`npm run video -- sources`, Studio).
Transcript per sumber video: `transcripts/<id>.json` (timestamp sumber).
`metadata.json` merujuknya lewat `"sources": "sources.json"` (field `source` lama dihapus).
```

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/video-sources.mjs scripts/video-sources.test.mjs scripts/video.mjs scripts/video.test.mjs package.json internal/docs/architecture/data-model.md
git commit -m "feat(video): sources.json manifest and video sources command"
```

---

### Task 3: Cut planner and `video cut`

**Files:**
- Create: `scripts/lib/cut-plan.mjs`
- Create: `scripts/cut-plan.test.mjs`
- Modify: `scripts/video.mjs` (`cut` subcommand, usage header)
- Modify: `package.json` (`test:video` adds `scripts/cut-plan.test.mjs`)
- Modify: `internal/docs/architecture/data-model.md` (`cut-list.json` section + new `cut-map.json` section)

**Interfaces:**
- Consumes: `readManifest`, `sourceFile`, `syncManifest`, `setSource` from Task 2.
- Produces (from `scripts/lib/cut-plan.mjs`):
  - `RENDERED: string[]`, `DROPPED: string[]`, `OUT = { width: 1080, height: 1920, fps: 30, rate: 48000 }`, `LOUDNESS = { target: -16, peak: 0.84 }`, `FADE = 0.015`, `DEFAULT_SPEED = 1.2`
  - `validateCutList(cutList, manifest) → renderedSegments[]` (throws `Error` listing every problem)
  - `cutMapOf(cutList) → { speed, duration, segments: [{ index, source, sourceStart, sourceEnd, outStart, outEnd }] }` (no manifest needed; used by Task 4)
  - `loudnessArgs(file) → string[]`, `parseLoudnorm(stderr) → number|null`, `gainDb(inputI) → number`
  - `buildCutPlan({ manifest, cutList, dir, loudness, out }) → { args, cutMap, sources }`

- [ ] **Step 1: Write the failing tests**

Create `scripts/cut-plan.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCutPlan, cutMapOf, gainDb, parseLoudnorm, validateCutList } from './lib/cut-plan.mjs';
import { main } from './video.mjs';

const src = (id, extra = {}) => ({ id, path: `sources/${id}.mp4`, origin: 'project', kind: 'video', role: 'speech', roleSource: 'user', note: '', probe: { duration: 10, hasAudio: true }, ...extra });
const MANIFEST = { version: 1, sources: [
  src('s1'),
  src('s2', { probe: { duration: 20, hasAudio: true } }),
  src('b1', { role: 'broll' }),
  src('s9', { probe: { duration: 10, hasAudio: false } }),
  { id: 'i1', path: 'sources/i1.png', origin: 'project', kind: 'image', role: 'image', roleSource: 'detected', note: '', probe: { width: 1, height: 1 } },
] };
const seg = (source, sourceStart, sourceEnd, action = 'keep', extra = {}) => ({ source, sourceStart, sourceEnd, action, reason: 'r', ...extra });

test('validateCutList returns rendered segments in array order and skips dropped ones', () => {
  const cut = { speed: 1.2, segments: [seg('s2', 10, 16, 'move-to-hook'), seg('s1', 0, 2, 'cut-retake'), seg('s1', 2, 5, 'tighten')] };
  assert.deepEqual(validateCutList(cut, MANIFEST).map((g) => [g.source, g.sourceStart]), [['s2', 10], ['s1', 2]]);
});

test('validateCutList names every bad segment', () => {
  const cut = { source: 'raw/x.mp4', speed: 3, segments: [
    seg('s1', 0, 1), seg('zz', 0, 1), seg('b1', 0, 1), seg('s1', 5, 11), seg('s1', 4, 4), seg('s1', 0, 1, 'cut-everything'), seg('s1', 0, 1, 'keep', { cropX: 2 }), seg('s9', 0, 1), seg('i1', 0, 1),
  ] };
  const msg = (() => { try { validateCutList(cut, MANIFEST); return ''; } catch (e) { return e.message; } })();
  for (const part of [
    /speed must be a number from 0\.5 to 2/,
    /top-level "source" is gone/,
    /segments\[1\]\.source "zz" is not in sources\.json/,
    /segments\[2\]\.source b1 is not a speech video/,
    /segments\[3\]\.sourceEnd 11 is past the end of s1 \(10 s\)/,
    /segments\[4\] needs 0 <= sourceStart < sourceEnd/,
    /segments\[5\]\.action "cut-everything"/,
    /segments\[6\]\.cropX must be a number from 0 to 1/,
    /segments\[7\]\.source s9 has no audio stream/,
    /segments\[8\]\.source i1 is not a speech video/,
  ]) assert.match(msg, part);
  assert.throws(() => validateCutList({ segments: [seg('s1', 0, 1, 'cut-silence')] }, MANIFEST), /no segment to render/);
  assert.throws(() => validateCutList({ segments: [seg('u1', 0, 1)] }, { version: 1, sources: [src('u1', { probe: undefined })] }), /no probed duration/);
});

test('cutMapOf lays out rendered segments at speed', () => {
  const map = cutMapOf({ speed: 1.2, segments: [seg('s2', 10, 16, 'move-to-hook'), seg('s1', 0, 2, 'cut-retake'), seg('s1', 2, 5)] });
  assert.deepEqual(map, { speed: 1.2, duration: 7.5, segments: [
    { index: 0, source: 's2', sourceStart: 10, sourceEnd: 16, outStart: 0, outEnd: 5 },
    { index: 1, source: 's1', sourceStart: 2, sourceEnd: 5, outStart: 5, outEnd: 7.5 },
  ] });
  assert.equal(cutMapOf({ segments: [seg('s1', 0, 1.2)] }).duration, 1);
});

test('parseLoudnorm and gainDb', () => {
  const stderr = 'noise\n[Parsed_loudnorm_0 @ 0x1] \n{\n\t"input_i" : "-23.40",\n\t"input_tp" : "-4.00"\n}\n';
  assert.equal(parseLoudnorm(stderr), -23.4);
  assert.equal(parseLoudnorm('{ "input_i" : "-inf" }'), null);
  assert.throws(() => parseLoudnorm('nothing'), /no measurement/);
  assert.equal(gainDb(-23.4), 7.4);
  assert.equal(gainDb(null), 0);
  assert.equal(gainDb(-70), 20);
  assert.equal(gainDb(10), -20);
});

test('buildCutPlan builds one ffmpeg call with a normalized chain per segment', () => {
  const cut = { speed: 1.2, segments: [seg('s2', 10, 16, 'move-to-hook', { cropX: 0.3 }), seg('s1', 2, 5)] };
  const { args, cutMap, sources } = buildCutPlan({ manifest: MANIFEST, cutList: cut, dir: 'videos/demo', loudness: { s1: -18, s2: null }, out: 'videos/demo/processed.mp4.part' });
  assert.deepEqual(sources, ['s2', 's1']);
  assert.equal(cutMap.duration, 7.5);
  assert.deepEqual(args.slice(0, 11), ['-y', '-loglevel', 'error', '-ss', '10', '-t', '6', '-i', 'videos/demo/sources/s2.mp4', '-ss', '2']);
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /\[0:v:0\]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:\(iw-1080\)\*0\.3:\(ih-1920\)\/2,setsar=1,fps=30,format=yuv420p\[v0\]/);
  assert.match(graph, /crop=1080:1920:\(iw-1080\)\*0\.5:/);
  assert.match(graph, /\[0:a:0\]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0dB,alimiter=limit=0\.84:level=0:latency=1,afade=t=in:d=0\.015,afade=t=out:st=5\.985:d=0\.015\[a0\]/);
  assert.match(graph, /volume=2dB/);
  assert.match(graph, /\[v0\]\[a0\]\[v1\]\[a1\]concat=n=2:v=1:a=1\[vc\]\[ac\];\[vc\]setpts=PTS\/1\.2,fps=30\[v\];\[ac\]atempo=1\.2\[a\]$/);
  assert.deepEqual(args.slice(-4), ['+faststart', '-f', 'mp4', 'videos/demo/processed.mp4.part']);
  for (const flag of ['-crf', '18', '-g', '30', 'libx264', 'aac', '192k']) assert.ok(args.includes(flag), flag);
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

test('video cut joins a portrait and a landscape take into a 1080x1920 processed.mp4', { skip: !hasFfmpeg && 'ffmpeg not installed' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'cut-'));
  const dir = join(root, 'videos/demo');
  mkdirSync(join(dir, 'sources'), { recursive: true });
  const make = (file, size, freq) => {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=30`, '-f', 'lavfi', '-i', `sine=frequency=${freq}:sample_rate=44100`, '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', join(dir, 'sources', file)]);
    assert.equal(r.status, 0, String(r.stderr));
  };
  make('take-1.mp4', '1080x1920', 440);
  make('take-2.mov', '1920x1080', 660);
  main(['sources', 'demo'], { root });
  main(['sources', 'demo', '--set', 'u1', '--role', 'speech'], { root });
  main(['sources', 'demo', '--set', 'u2', '--role', 'speech'], { root });
  writeFileSync(join(dir, 'cut-list.json'), JSON.stringify({ speed: 1.2, segments: [seg('u2', 0.5, 1.5, 'move-to-hook'), seg('u1', 0.2, 1.8)] }));
  main(['cut', 'demo'], { root });
  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', join(dir, 'processed.mp4')], { encoding: 'utf8' }).stdout);
  const v = probe.streams.find((s) => s.codec_type === 'video');
  assert.deepEqual([v.width, v.height, v.r_frame_rate], [1080, 1920, '30/1']);
  assert.ok(probe.streams.some((s) => s.codec_type === 'audio' && s.sample_rate === '48000'));
  assert.ok(Math.abs(Number(probe.format.duration) - 2.6 / 1.2) < 0.1, probe.format.duration);
  assert.equal(JSON.parse(readFileSync(join(dir, 'cut-map.json'), 'utf8')).duration, 2.167);
  assert.equal(existsSync(join(dir, 'processed.mp4.part')), false);
  rmSync(root, { recursive: true, force: true });
});

test('video cut writes nothing when the cut-list is invalid', () => {
  const root = mkdtempSync(join(tmpdir(), 'cut-'));
  const dir = join(root, 'videos/demo');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sources.json'), JSON.stringify(MANIFEST));
  writeFileSync(join(dir, 'cut-list.json'), JSON.stringify({ segments: [seg('zz', 0, 1)] }));
  const run = () => { throw new Error('must not run ffmpeg'); };
  assert.throws(() => main(['cut', 'demo'], { root, run }), /segments\[0\]\.source "zz"/);
  assert.equal(existsSync(join(dir, 'processed.mp4')), false);
  assert.throws(() => main(['cut', 'nope'], { root, run }), /cut-list\.json not found/);
  rmSync(root, { recursive: true, force: true });
});
```

In `package.json` set `"test:video": "node --test scripts/video.test.mjs scripts/video-sources.test.mjs scripts/cut-plan.test.mjs"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:video`
Expected: FAIL — `Cannot find module './lib/cut-plan.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/cut-plan.mjs`**

```js
// Pure plan for `npm run video -- cut <slug>` (ADR-0022, RD-03-69/73/74): validate cut-list.json against
// sources.json, build the one ffmpeg call that normalizes and joins the speech segments, and compute cut-map.json.
// Node 22+, built-in modules only (ADR-0007).
import { join } from 'node:path';

export const RENDERED = ['keep', 'tighten', 'move-to-hook', 'preserve-human'];
export const DROPPED = ['cut-silence', 'cut-filler', 'cut-repeat', 'cut-tangent', 'cut-unclear', 'cut-retake'];
export const OUT = { width: 1080, height: 1920, fps: 30, rate: 48000 };
export const LOUDNESS = { target: -16, peak: 0.84 }; // -16 LUFS per source; limiter ceiling ~ -1.5 dBTP
export const FADE = 0.015; // seconds at every segment edge, against clicks at the joins
export const DEFAULT_SPEED = 1.2;
const ms = (x) => Math.round(x * 1000) / 1000;

export function validateCutList(cutList, manifest) {
  const errors = [];
  const speed = cutList?.speed ?? DEFAULT_SPEED;
  if (typeof speed !== 'number' || !(speed >= 0.5 && speed <= 2)) errors.push(`speed must be a number from 0.5 to 2 (got ${cutList?.speed})`);
  if (cutList?.source !== undefined) errors.push('top-level "source" is gone; put "source": "<id>" on each segment (ADR-0022)');
  if (!Array.isArray(cutList?.segments)) errors.push('segments must be an array');
  const segs = Array.isArray(cutList?.segments) ? cutList.segments : [];
  const byId = new Map(manifest.sources.map((s) => [s.id, s]));
  segs.forEach((g, i) => {
    const at = `segments[${i}]`;
    if (![...RENDERED, ...DROPPED].includes(g.action)) return errors.push(`${at}.action "${g.action}" is not one of ${[...RENDERED, ...DROPPED].join(', ')}`);
    const s = byId.get(g.source);
    if (!s) return errors.push(`${at}.source "${g.source}" is not in sources.json`);
    if (!RENDERED.includes(g.action)) return;
    if (s.kind !== 'video' || s.role !== 'speech') errors.push(`${at}.source ${s.id} is not a speech video (kind ${s.kind}, role ${s.role})`);
    if (s.kind === 'video' && s.probe?.hasAudio === false) errors.push(`${at}.source ${s.id} has no audio stream`);
    const d = s.probe?.duration;
    if (!(typeof g.sourceStart === 'number' && typeof g.sourceEnd === 'number' && g.sourceStart >= 0 && g.sourceStart < g.sourceEnd)) errors.push(`${at} needs 0 <= sourceStart < sourceEnd`);
    else if (s.kind === 'video' && !(d > 0)) errors.push(`${at}.source ${s.id} has no probed duration; run npm run video -- sources`);
    else if (d > 0 && g.sourceEnd > d + 1e-3) errors.push(`${at}.sourceEnd ${g.sourceEnd} is past the end of ${s.id} (${d} s)`);
    if (g.cropX !== undefined && !(typeof g.cropX === 'number' && g.cropX >= 0 && g.cropX <= 1)) errors.push(`${at}.cropX must be a number from 0 to 1`);
  });
  if (!segs.some((g) => RENDERED.includes(g.action))) errors.push(`no segment to render (action ${RENDERED.join('|')})`);
  if (errors.length) throw new Error(`cut-list.json is invalid:\n- ${errors.join('\n- ')}`);
  return segs.filter((g) => RENDERED.includes(g.action));
}

// Output time of each rendered segment, in the processed.mp4 timeline (source seconds / speed).
export function cutMapOf(cutList) {
  const speed = cutList.speed ?? DEFAULT_SPEED;
  let t = 0;
  const segments = cutList.segments.filter((g) => RENDERED.includes(g.action)).map((g, index) => {
    const outStart = t;
    t += (g.sourceEnd - g.sourceStart) / speed;
    return { index, source: g.source, sourceStart: g.sourceStart, sourceEnd: g.sourceEnd, outStart: ms(outStart), outEnd: ms(t) };
  });
  return { speed, duration: ms(t), segments };
}

// Pass 1: measure a whole source once; the gain is applied to every segment cut from it.
export const loudnessArgs = (file) => ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `loudnorm=I=${LOUDNESS.target}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'];

export function parseLoudnorm(stderr) {
  const m = /\{[^{}]*"input_i"[^{}]*\}/.exec(String(stderr));
  if (!m) throw new Error('loudnorm printed no measurement');
  const i = Number.parseFloat(JSON.parse(m[0]).input_i);
  return Number.isFinite(i) ? i : null; // "-inf" = silent source
}

export const gainDb = (inputI) => (inputI === null ? 0 : ms(Math.max(-20, Math.min(20, LOUDNESS.target - inputI))));

export function buildCutPlan({ manifest, cutList, dir, loudness, out }) {
  const segs = validateCutList(cutList, manifest);
  const speed = cutList.speed ?? DEFAULT_SPEED;
  const byId = new Map(manifest.sources.map((s) => [s.id, s]));
  const { width: W, height: H, fps, rate } = OUT;
  const inputs = [];
  const chains = [];
  segs.forEach((g, k) => {
    const s = byId.get(g.source);
    const d = ms(g.sourceEnd - g.sourceStart);
    // Input seeking re-encodes, so -ss/-t are frame accurate. ffmpeg auto-rotates (DJI rotation=-90): no transpose.
    inputs.push('-ss', String(g.sourceStart), '-t', String(d), '-i', join(dir, s.path));
    chains.push(`[${k}:v:0]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})*${g.cropX ?? 0.5}:(ih-${H})/2,setsar=1,fps=${fps},format=yuv420p[v${k}]`);
    chains.push(`[${k}:a:0]aresample=${rate},aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${gainDb(loudness[s.id] ?? null)}dB,alimiter=limit=${LOUDNESS.peak}:level=0:latency=1,afade=t=in:d=${FADE},afade=t=out:st=${ms(Math.max(0, d - FADE))}:d=${FADE}[a${k}]`);
  });
  chains.push(`${segs.map((_, k) => `[v${k}][a${k}]`).join('')}concat=n=${segs.length}:v=1:a=1[vc][ac]`);
  chains.push(`[vc]setpts=PTS/${speed},fps=${fps}[v]`);
  chains.push(`[ac]atempo=${speed}[a]`);
  const args = [
    '-y', '-loglevel', 'error', ...inputs, '-filter_complex', chains.join(';'), '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-g', String(fps), '-keyint_min', String(fps), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', String(rate), '-movflags', '+faststart', '-f', 'mp4', out,
  ];
  return { args, cutMap: cutMapOf(cutList), sources: [...new Set(segs.map((g) => g.source))] };
}
```

- [ ] **Step 4: Add the `cut` subcommand to `scripts/video.mjs`**

1. Header: add `//        npm run video -- cut <slug>   (processed.mp4 + cut-map.json from cut-list.json + sources.json)`.
2. Imports: add `renameSync` to the `node:fs` import; add `sourceFile` to the video-sources import; add
   ```js
   import { buildCutPlan, loudnessArgs, parseLoudnorm, validateCutList } from './lib/cut-plan.mjs';
   ```
3. In `main`, after the `sources` branch:
   ```js
   if (cmd === 'cut') {
     const dir = projectDir(slug, root);
     const cutFile = join(dir, 'cut-list.json');
     if (!existsSync(cutFile)) throw new Error(`${cutFile} not found; the Story phase writes it first`);
     const manifest = readManifest(dir);
     const cutList = JSON.parse(readFileSync(cutFile, 'utf8'));
     const segs = validateCutList(cutList, manifest);
     const loudness = {};
     for (const id of new Set(segs.map((g) => g.source))) {
       const file = sourceFile(dir, manifest.sources.find((s) => s.id === id));
       const r = run('ffmpeg', loudnessArgs(file), { encoding: 'utf8', maxBuffer: 64 << 20 });
       if (r.status !== 0) throw new Error(`loudness pass failed for ${id} (${file})`);
       loudness[id] = parseLoudnorm(r.stderr);
     }
     const out = join(dir, 'processed.mp4');
     const part = `${out}.part`;
     const { args, cutMap } = buildCutPlan({ manifest, cutList, dir, loudness, out: part });
     rmSync(part, { force: true });
     const r = run('ffmpeg', args, { stdio: 'inherit', env });
     if (r.status !== 0) {
       rmSync(part, { force: true });
       throw new Error(`ffmpeg exited with ${r.status}; processed.mp4 was not changed`);
     }
     renameSync(part, out);
     writeFileSync(`${join(dir, 'cut-map.json')}.part`, `${JSON.stringify(cutMap, null, 2)}\n`);
     renameSync(`${join(dir, 'cut-map.json')}.part`, join(dir, 'cut-map.json'));
     console.log(`processed ${out} (${cutMap.duration} s from ${cutMap.segments.length} segments)`);
     return;
   }
   ```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:video`
Expected: all PASS, including the ffmpeg integration test (not skipped on this Mac). If ffmpeg rejects `alimiter` `latency`, check `ffmpeg -h filter=alimiter` and adjust the option name in both the planner and the test; do not drop the limiter.

- [ ] **Step 6: Update the data model**

In `internal/docs/architecture/data-model.md`, replace the `## \`cut-list.json\` (Story)` first line with:

```markdown
`{ targetDuration, speed, primaryHook, segments: [{ source, sourceStart, sourceEnd, action, reason, cropX? }], notes: [] }`.
`source` = id di `sources.json` (wajib video `speech` untuk segmen yang dirender); field `source` tingkat atas dihapus (ADR-0022).
Segmen yang dirender (`keep | tighten | move-to-hook | preserve-human`) muncul di output sesuai urutan array; segmen `cut-*` hanya catatan.
`cropX` (0–1, default 0.5) menggeser crop take yang lebih lebar dari 9:16.
```

and change the `action` line to include `cut-retake` (take ulang yang tidak dipakai). Add after that section:

```markdown
## `cut-map.json` (Story, generated)

Ditulis `npm run video -- cut <slug>` bersama `processed.mp4`:
`{ speed, duration, segments: [{ index, source, sourceStart, sourceEnd, outStart, outEnd }] }`.
`outStart/outEnd` = detik timeline `processed.mp4`. Jangan ditulis tangan.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/cut-plan.mjs scripts/cut-plan.test.mjs scripts/video.mjs package.json internal/docs/architecture/data-model.md
git commit -m "feat(video): multi-source cut planner and video cut command"
```

---

### Task 4: Migration `raw/` → `shared/`, run it on this repo

**Files:**
- Create: `scripts/lib/migrate-sources.mjs`
- Create: `scripts/migrate-sources.test.mjs`
- Modify: `scripts/video.mjs` (`migrate-sources` subcommand, usage header)
- Modify: `package.json` (`test:video` adds `scripts/migrate-sources.test.mjs`)
- Modify: `.gitignore`; create `shared/.gitkeep`; delete `raw/.gitkeep`
- Modify: `docs/ai-agent-initial-setup.md`, `internal/docs/requirements/rd-04-transcription-setup.md`, `internal/docs/requirements/frd.md`, `internal/docs/security/security-standard.md`, `internal/docs/product/scope-principles.md`, `internal/docs/product/onboarding.md` (`raw/` → `shared/`)

**Interfaces:**
- Consumes: `SHARED_DIR`, `SOURCES_DIR`, `SOURCES_FILE`, `probeMedia`, `syncManifest`, `writeManifest` (Task 2); `cutMapOf` (Task 3).
- Produces: `planMigration(root) → { moves: [{ name, from, to }], conflicts: string[], projects: [{ slug, action: 'shared'|'project'|'skip', name?, reason? }] }`, `formatPlan(plan) → string`, `applyMigration(root, plan, { probe }) → void`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/migrate-sources.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyMigration, formatPlan, planMigration } from './lib/migrate-sources.mjs';

const probe = () => ({ duration: 60, width: 1920, height: 1080, fps: 30, rotation: -90, hasAudio: true });
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

function oldRepo() {
  const root = mkdtempSync(join(tmpdir(), 'migrate-'));
  mkdirSync(join(root, 'raw'));
  writeFileSync(join(root, 'raw/.gitkeep'), '');
  writeFileSync(join(root, 'raw/DJI_1.MP4'), 'raw');
  const old = join(root, 'videos/old');
  mkdirSync(old, { recursive: true });
  symlinkSync('../../raw/DJI_1.MP4', join(old, 'source.mp4'));
  writeFileSync(join(old, 'transcript.json'), '{"t":1}');
  writeFileSync(join(old, 'metadata.json'), JSON.stringify({ source: 'raw/DJI_1.MP4', duration: 60 }));
  writeFileSync(join(old, 'cut-list.json'), JSON.stringify({ source: 'raw/DJI_1.MP4', speed: 1.2, segments: [
    { sourceStart: 15.1, sourceEnd: 19.66, action: 'move-to-hook' }, { sourceStart: 22.72, sourceEnd: 30.45, action: 'keep' },
  ] }));
  const copy = join(root, 'videos/copy');
  mkdirSync(copy, { recursive: true });
  writeFileSync(join(copy, 'source.mp4'), 'copied');
  mkdirSync(join(root, 'videos/done'), { recursive: true });
  writeFileSync(join(root, 'videos/done/sources.json'), '{"version":1,"sources":[]}');
  mkdirSync(join(root, 'videos/empty'), { recursive: true });
  return root;
}

test('planMigration lists moves and per-project actions', () => {
  const root = oldRepo();
  const plan = planMigration(root);
  assert.deepEqual(plan.moves, [{ name: 'DJI_1.MP4', from: 'raw/DJI_1.MP4', to: 'shared/DJI_1.MP4' }]);
  assert.deepEqual(plan.conflicts, []);
  assert.deepEqual(plan.projects, [
    { slug: 'copy', action: 'project', name: 'source.mp4' },
    { slug: 'done', action: 'skip', reason: 'sources.json exists' },
    { slug: 'empty', action: 'skip', reason: 'no source.mp4' },
    { slug: 'old', action: 'shared', name: 'DJI_1.MP4' },
  ]);
  assert.match(formatPlan(plan), /raw\/DJI_1\.MP4 -> shared\/DJI_1\.MP4/);
  rmSync(root, { recursive: true, force: true });
});

test('applyMigration converts projects and is idempotent', () => {
  const root = oldRepo();
  applyMigration(root, planMigration(root), { probe });
  assert.equal(existsSync(join(root, 'raw')), false);
  assert.equal(readFileSync(join(root, 'shared/DJI_1.MP4'), 'utf8'), 'raw');

  const old = join(root, 'videos/old');
  assert.throws(() => lstatSync(join(old, 'source.mp4')));
  const m = json(join(old, 'sources.json'));
  assert.deepEqual(m.sources.map((s) => [s.id, s.path, s.origin, s.role, s.roleSource, s.probe.duration]), [['s1', '../../shared/DJI_1.MP4', 'shared', 'speech', 'user', 60]]);
  assert.equal(readFileSync(join(old, 'transcripts/s1.json'), 'utf8'), '{"t":1}');
  assert.equal(existsSync(join(old, 'transcript.json')), false);
  const cut = json(join(old, 'cut-list.json'));
  assert.equal(cut.source, undefined);
  assert.deepEqual(cut.segments.map((g) => g.source), ['s1', 's1']);
  assert.deepEqual(json(join(old, 'cut-map.json')).segments.map((g) => [g.outStart, g.outEnd]), [[0, 3.8], [3.8, 10.242]]);
  assert.deepEqual(json(join(old, 'metadata.json')), { duration: 60, sources: 'sources.json' });

  const copy = join(root, 'videos/copy');
  assert.equal(readFileSync(join(copy, 'sources/source.mp4'), 'utf8'), 'copied');
  assert.deepEqual(json(join(copy, 'sources.json')).sources.map((s) => [s.id, s.path, s.origin]), [['s1', 'sources/source.mp4', 'project']]);

  const again = planMigration(root);
  assert.deepEqual(again.moves, []);
  assert.ok(again.projects.every((p) => p.action === 'skip'));
  rmSync(root, { recursive: true, force: true });
});

test('applyMigration refuses to overwrite a shared file', () => {
  const root = oldRepo();
  mkdirSync(join(root, 'shared'));
  writeFileSync(join(root, 'shared/DJI_1.MP4'), 'other');
  const plan = planMigration(root);
  assert.deepEqual(plan.conflicts, ['shared/DJI_1.MP4']);
  assert.throws(() => applyMigration(root, plan, { probe }), /already in shared/);
  assert.equal(readFileSync(join(root, 'raw/DJI_1.MP4'), 'utf8'), 'raw');
  rmSync(root, { recursive: true, force: true });
});
```

Add `scripts/migrate-sources.test.mjs` to `test:video` in `package.json`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:video`
Expected: FAIL — `Cannot find module './lib/migrate-sources.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/migrate-sources.mjs`**

```js
// One-off migration from raw/ + videos/<slug>/source.mp4 to shared/ + sources.json (ADR-0022).
// Usage: npm run video -- migrate-sources [--apply]   (without --apply: print the plan only)
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { cutMapOf } from './cut-plan.mjs';
import { SHARED_DIR, SOURCES_DIR, SOURCES_FILE, probeMedia, syncManifest, writeManifest } from './video-sources.mjs';

const SLUG = /^[a-z0-9][a-z0-9-]*$/; // SLUG_RE in scripts/video.mjs (not imported: video.mjs imports this module)
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const writeJson = (f, v) => writeFileSync(f, `${JSON.stringify(v, null, 2)}\n`);

function projectAction(dir, rawReal) {
  if (existsSync(join(dir, SOURCES_FILE))) return { action: 'skip', reason: 'sources.json exists' };
  const link = join(dir, 'source.mp4');
  let st;
  try {
    st = lstatSync(link);
  } catch {
    return { action: 'skip', reason: 'no source.mp4' };
  }
  if (!st.isSymbolicLink()) return { action: 'project', name: 'source.mp4' };
  let target;
  try {
    target = realpathSync(link);
  } catch {
    return { action: 'skip', reason: 'source.mp4 is a broken link' };
  }
  if (rawReal && dirname(target) === rawReal) return { action: 'shared', name: basename(target) };
  return { action: 'skip', reason: `source.mp4 points outside raw/ (${target})` };
}

export function planMigration(root) {
  const rawDir = join(root, 'raw');
  const rawReal = existsSync(rawDir) ? realpathSync(rawDir) : null;
  const moves = rawReal
    ? readdirSync(rawDir).filter((n) => !n.startsWith('.')).sort().map((name) => ({ name, from: `raw/${name}`, to: `${SHARED_DIR}/${name}` }))
    : [];
  const conflicts = moves.filter((m) => existsSync(join(root, m.to))).map((m) => m.to);
  const videos = join(root, 'videos');
  const slugs = existsSync(videos) ? readdirSync(videos).filter((d) => SLUG.test(d)).sort() : [];
  const projects = slugs.map((slug) => ({ slug, ...projectAction(join(videos, slug), rawReal) }));
  return { moves, conflicts, projects };
}

export function formatPlan({ moves, conflicts, projects }) {
  return [
    ...moves.map((m) => `move ${m.from} -> ${m.to}`),
    ...conflicts.map((c) => `CONFLICT ${c} already exists`),
    ...projects.map((p) => (p.action === 'skip' ? `skip videos/${p.slug}: ${p.reason}` : `convert videos/${p.slug} (${p.action} ${p.name})`)),
  ].join('\n') || 'nothing to migrate';
}

function migrateProject(root, { slug, action, name }, probe) {
  const dir = join(root, 'videos', slug);
  const link = join(dir, 'source.mp4');
  let path;
  if (action === 'shared') {
    rmSync(link);
    path = `../../${SHARED_DIR}/${name}`;
  } else {
    mkdirSync(join(dir, SOURCES_DIR), { recursive: true });
    renameSync(link, join(dir, SOURCES_DIR, name));
    path = `${SOURCES_DIR}/${name}`;
  }
  const origin = action === 'shared' ? 'shared' : 'project';
  writeManifest(dir, { version: 1, sources: [{ id: 's1', path, origin, kind: 'video', role: 'speech', roleSource: 'user', note: '' }] });
  syncManifest({ dir, root, probe });
  const transcript = join(dir, 'transcript.json');
  if (existsSync(transcript)) {
    mkdirSync(join(dir, 'transcripts'), { recursive: true });
    renameSync(transcript, join(dir, 'transcripts', 's1.json'));
  }
  const cutFile = join(dir, 'cut-list.json');
  if (existsSync(cutFile)) {
    const cut = readJson(cutFile);
    delete cut.source;
    cut.segments = (cut.segments || []).map((g) => ({ source: 's1', ...g }));
    writeJson(cutFile, cut);
    writeJson(join(dir, 'cut-map.json'), cutMapOf(cut));
  }
  const metaFile = join(dir, 'metadata.json');
  if (existsSync(metaFile)) {
    const meta = readJson(metaFile);
    delete meta.source;
    meta.sources = SOURCES_FILE;
    writeJson(metaFile, meta);
  }
}

export function applyMigration(root, plan, { probe = probeMedia } = {}) {
  if (plan.conflicts.length) throw new Error(`already in shared/: ${plan.conflicts.join(', ')}; move them away first`);
  mkdirSync(join(root, SHARED_DIR), { recursive: true });
  for (const m of plan.moves) renameSync(join(root, m.from), join(root, m.to));
  const rawDir = join(root, 'raw');
  if (existsSync(rawDir) && readdirSync(rawDir).every((n) => n === '.gitkeep')) rmSync(rawDir, { recursive: true });
  for (const p of plan.projects) if (p.action !== 'skip') migrateProject(root, p, probe);
}
```

- [ ] **Step 4: Add the subcommand to `scripts/video.mjs`**

Header: `//        npm run video -- migrate-sources [--apply]   (raw/ + source.mp4 -> shared/ + sources.json, once)`.
Import: `import { applyMigration, formatPlan, planMigration } from './lib/migrate-sources.mjs';`
In `main`, before the `new` branch (it takes no slug):

```js
if (cmd === 'migrate-sources') {
  const plan = planMigration(root);
  console.log(formatPlan(plan));
  if (!values.apply) {
    console.log('dry run; add --apply to migrate');
    return;
  }
  applyMigration(root, plan, { probe: (f, k) => probeMedia(f, k, run) });
  console.log('migrated');
  return;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:video`
Expected: all PASS.

- [ ] **Step 6: Switch the ignore rules and folder**

In `.gitignore` replace
```
/raw/*
!/raw/.gitkeep
```
with
```
/shared/*
!/shared/.gitkeep
```
Then:
```bash
mkdir -p shared && touch shared/.gitkeep
```

- [ ] **Step 7: Dry-run then apply on this repo**

Run: `npm run video -- migrate-sources`
Expected output:
```
move raw/DJI_20260910103830_0395_D.MP4 -> shared/DJI_20260910103830_0395_D.MP4
convert videos/dji-20260910103830-0395-d (shared DJI_20260910103830_0395_D.MP4)
dry run; add --apply to migrate
```
Run: `npm run video -- migrate-sources --apply` → `migrated`.
Run: `npm run video -- sources dji-20260910103830-0395-d` → one line starting `s1  speech  (user)  ../../shared/DJI_20260910103830_0395_D.MP4`.
Run: `ls raw 2>&1; git status --short` → `raw` gone; `.gitignore`, `raw/.gitkeep` (deleted), `shared/.gitkeep` shown. `videos/` stays ignored.

- [ ] **Step 8: Replace `raw/` in setup and policy docs**

Replace `raw/` with `shared/` in: `docs/ai-agent-initial-setup.md` (lines ~31, ~41: directory list and `touch shared/.gitkeep …`), `internal/docs/requirements/rd-04-transcription-setup.md:23`, `internal/docs/requirements/frd.md:32`, `internal/docs/security/security-standard.md:18`, `internal/docs/product/scope-principles.md:23` (`raw/render` → `shared/render`), `internal/docs/product/onboarding.md:13` → `2. Buat project (\`npm run video -- new <slug>\` atau Studio), taruh footage di \`videos/<slug>/sources/\` atau di \`shared/\` untuk file reusable.` and `:33` (`raw/ videos/ …` → `shared/ videos/ …`).
Verify: `grep -rn "raw/" docs/ai-agent-initial-setup.md internal/docs --include=*.md | grep -v "adr/"` → only historical mentions in RD-05 are already rewritten in Task 1; expect no matches.

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/migrate-sources.mjs scripts/migrate-sources.test.mjs scripts/video.mjs package.json .gitignore shared/.gitkeep docs/ai-agent-initial-setup.md internal/docs
git rm --cached -q raw/.gitkeep 2>/dev/null || true
git commit -m "feat(video): migrate raw/ + source.mp4 to shared/ + sources.json"
```

---

### Task 5: Workflow docs for multi-source Story, Screen Plan, Build

**Files:**
- Modify: `docs/agents/01-story.md`
- Modify: `docs/agents/references/cut-and-pacing.md`
- Modify: `docs/agents/02-screen-plan.md`, `docs/agents/references/visual-planning.md`
- Modify: `docs/agents/03-build.md`, `docs/agents/references/asset-production.md`
- Modify: `docs/agents/references/hook-and-angle.md` (brief Output Template)
- Modify: `docs/skills/dena-video-editing-workflow/SKILL.md`, `docs/dena-social-video-style-guide.md:427`
- Modify: `AGENTS.md`, `CLAUDE.md`, `docs/initial-setup.md` (commands + folders)
- Modify: `internal/docs/operations/video-editing-workflow.md` (if it lists Story inputs/outputs)

**Interfaces:** Consumes the commands from Tasks 2–4 (`video sources`, `video cut`, `migrate-sources`) and the criteria RD-03-65…72.

- [ ] **Step 1: `01-story.md`**

- "When To Use" first bullet → `- Dena provides video/image sources for a project in \`videos/<slug>/sources/\` or \`shared/\` (one or many takes, B-roll, images).`
- "Do not use" last bullet → `- Projects with no speech source at all (montage only): write a blocker note (RD-03-68).`
- Inputs first bullet → `- Sources: \`videos/<slug>/sources.json\` (project files in \`sources/\`, shared files in \`shared/\`), with Dena's optional role labels and notes`.
- Steps 1–2 become:

```markdown
1. **Read context.** `docs/dena-social-video-style-guide.md`, the user request,
   reference notes, and existing artifacts for the slug. If a reference video
   exists, inspect it as evidence; do not infer from memory when a local file is
   available. If `videos/<slug>/` does not exist, run `npm run video -- new <slug>`.
   Files Dena names from `shared/` are attached with
   `npm run video -- sources <slug> --add-shared <a,b>`; roles/notes Dena gives in
   the prompt are written with `--set <id> --role <speech|broll> --note "<text>"`.
2. **Inventory and transcribe.** Run `npm run video -- sources <slug>`. Read
   `docs/agents/references/cut-and-pacing.md` sections Media Audit, Transcription
   Workflow, Source Roles, and Content Map. Transcribe every video source to
   `transcripts/<id>.json` (source timeline). For each source with role `auto`,
   decide `speech` (meaningful speech) or `broll` and record it with
   `npm run video -- sources <slug> --set <id> --role <r> --detected`, with the
   reason in `edit-decision-notes.md`. Never change a role marked `(user)`. If no
   speech source remains, stop and write a blocker note. Take one contact sheet per
   `broll` source and per image and write `## Source Inventory` in
   `creative-brief.md` (id, role, duration or size, what it shows, Dena's note).
   Write `metadata.json` (with `"sources": "sources.json"`).
```

- Step 6 (Cut): append `Every segment names its \`source\` id; segments may come from any take in any order. When a line was recorded more than once, keep one take and log the others as \`cut-retake\` with the reason.`
- Step 7 (Build the base video) becomes:

```markdown
7. **Build the base video.** Run `npm run video -- cut <slug>`: it validates the
   cut-list, normalizes every take (1080×1920, 30 fps, −16 LUFS per source,
   15 ms fades) and writes `processed.mp4` and `cut-map.json`. Do not write your
   own ffmpeg cut. Check orientation with a frame grab of `processed.mp4`. Audio
   cleanup beyond that follows Audio Cleanup Handoff. Then transcribe
   `processed.mp4` with the same Transcription Workflow and save it as
   `processed-transcript.json`: the processed-timeline word timing that Screen
   Plan uses.
```

- Outputs: replace `- \`transcript.json\` (raw timeline)` with `- \`sources.json\` (roles settled) and \`transcripts/<id>.json\` (source timelines)`; add `- \`cut-map.json\` (from \`video cut\`)`.
- Cut Summary template: `(source <mm:ss.s-mm:ss.s>)` → `(source <id> <mm:ss.s-mm:ss.s>)`; Duration line → `- Duration: <sum of speech sources mm:ss> -> <processed mm:ss> at <speed>x (<n> sources)`; Removed line → `  - <id> <source range>: <what was removed> - <why>`; add `- Take choices: <line> - <id> used, <id> cut-retake - <why>` and `- Source Inventory: see creative-brief.md (<n> broll, <n> image)`.

- [ ] **Step 2: `cut-and-pacing.md`**

- Media Audit intro: `Start every job by inspecting every source in \`sources.json\` (\`npm run video -- sources <slug>\` already stores the probe).`
- Transcription Workflow commands: use `videos/<slug>/<source path>` as input, `-of videos/<slug>/transcripts/<id>-large-v3-turbo`, and "Preferred output: `videos/<slug>/transcripts/<id>.json`, one per video source".
- Add a section after Transcription Workflow:

```markdown
## Source Roles

- `speech`: the video carries Dena talking and can feed the cut.
- `broll`: a video without meaningful speech (whisper returning only noise,
  music, or a few hallucinated words counts as no speech). It never enters the
  cut; Screen Plan places it as an overlay.
- `image`: always an overlay candidate.
- A role marked `(user)` in `video sources` output is Dena's; never change it.
  Record detected roles with `--detected`.
- Several speech takes: read all transcripts first, then choose, per line, the
  take with the cleanest delivery, fewest fillers, and best framing. Log the other
  occurrences as `cut-retake`.
```

- JSON example: remove `"source": "raw/example.mp4",` and add `"source": "s1",` to every segment example; add a second segment example `{ "source": "s2", "sourceStart": 3.4, "sourceEnd": 9.8, "action": "keep", "reason": "explanation, cleaner take" }`.
- Edit Decision List table: add a `Source` first column (`s1`, `s2`, …).
- Processed Base Video: add first line `Built only by \`npm run video -- cut <slug>\` (ADR-0022); the bullets below are what it guarantees.` and change `30fps unless source requires otherwise` → `30fps`.

- [ ] **Step 3: Screen Plan + visual planning**

- `02-screen-plan.md` inputs paragraph (line ~86): add `the \`## Source Inventory\` in \`creative-brief.md\` (Dena's own B-roll and images, with notes)`. In the Visual Decision Log step add: `Every Source Inventory entry gets a log row: Dena's own B-roll/images are the first candidate for the moment their note or content matches; an unused source needs a reason (RD-03-72).`
- `visual-planning.md` asset priority list (line ~184 "user-supplied media"): make it `Dena's own sources from Source Inventory (\`broll\`/\`image\` ids in \`sources.json\`)` at the top, and add a `Source` column (`b1`, `i2`, or `-`) to the Visual Decision Log template.

- [ ] **Step 4: Build + asset production**

- `03-build.md` asset step (lines ~75–90): add `For a Source Inventory entry, trim/copy from its \`sources.json\` path into \`assets/\` (videos: \`ffmpeg -ss <in> -t <dur>\` re-encoded to 1080-wide H.264 without audio; images: \`npm run asset-lib -- process\`), and record \`provenance: "user-supplied"\` with \`sourceId\`.`
- `asset-production.md` manifest fields: add `sourceId` (id in `sources.json`, for user-supplied sources).
- `internal/docs/architecture/data-model.md` asset-manifest line: add `sourceId` (opsional, id `sources.json` untuk aset `user-supplied`).

- [ ] **Step 5: Brief template, router, style guide, entry doors**

- `hook-and-angle.md` Output Template: add a section `## Source Inventory` with a table `| ID | Role | Duration/Size | What it shows | Dena's note |`, placed before `## Workflow Settings`.
- `SKILL.md` line 32 routing row: prefix with `New project sources (one or many raw takes, B-roll, images), ` and add a line under the phase list: `Sources live in \`videos/<slug>/sources.json\`; shared files in \`shared/\` (ADR-0022).`
- Style guide line 427: `- \`source.mp4\` or original video reference.` → `- \`sources.json\` (all source files and their roles).`
- `AGENTS.md`, `CLAUDE.md`, `docs/initial-setup.md`: in the command lists add
  ```
  npm run video -- sources <slug> [--add-shared a,b] [--set <id> --role <r> --note <t>]  # project sources manifest
  npm run video -- cut <slug>          # processed.mp4 + cut-map.json from cut-list.json (multi-source)
  npm run video -- migrate-sources [--apply]  # one-off: raw/ + source.mp4 -> shared/ + sources.json
  ```
  and in Project Structure add `- \`shared/\` — reusable raw videos/images (ignored), referenced from any project's \`sources.json\`` and `- \`videos/<slug>/sources/\` — files for that one video`. Replace any "raw/" folder mention with `shared/`.
- `internal/docs/operations/video-editing-workflow.md`: where it lists Story inputs/outputs, mirror Step 1's Inputs/Outputs changes.

- [ ] **Step 6: Verify no stale single-source instructions remain**

Run: `grep -rnE "source\.mp4|raw/<file>|transcript\.json \(raw" docs/agents docs/skills AGENTS.md CLAUDE.md docs/initial-setup.md internal/docs --include=*.md | grep -v "adr/"`
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add docs AGENTS.md CLAUDE.md internal/docs
git commit -m "docs(workflow): multi-source Story, Source Inventory, video cut"
```

---

### Task 6: Studio server — projects + shared library

**Files:**
- Create: `scripts/studio/files.mjs`, `scripts/studio/shared.mjs`, `scripts/studio/projects.mjs`
- Delete: `scripts/studio/raw.mjs`
- Modify: `scripts/studio/app.mjs`, `scripts/studio/agent.mjs`, `scripts/studio/sessions.mjs`, `scripts/studio/results.mjs` (only if it imports from `raw.mjs`), `scripts/studio.mjs` (comment only)
- Modify: `scripts/studio.test.mjs`
- Modify: `internal/docs/adr/0020-studio-web-ui.md` is already amended; add to `docs/superpowers/specs/2026-09-28-studio-web-ui-design.md` top: `Amended 2026-09-29 by ADR-0022 (project-centered Studio, shared library).`

**Interfaces:**
- Consumes: `syncManifest`, `setSource`, `removeSource`, `readManifest`, `sourceFile`, `isMedia`, `kindOf`, `probeMedia`, `SHARED_DIR`, `SOURCES_DIR` (Task 2); `scaffold`, `checkSlug`, `SLUG_RE` (`scripts/video.mjs`).
- Produces:
  - `files.mjs`: `safeMediaName(name) → string`, `receiveFile(dir, label, name, stream) → Promise<string>`, `projectSlugs(root) → string[]`
  - `shared.mjs`: `sharedPath(root, name)`, `sharedUsage(root, name) → slug[]`, `listShared(root, { probe }) → Promise<[{ name, kind, size, mtime, duration, projects }]>`, `deleteShared(root, name)`, `receiveShared(root, name, stream)`
  - `projects.mjs`: `projectPath(root, slug)`, `rendersOf(root, slug)`, `roleCounts(sources)`, `listProjects(root)`, `createProject(root, slug)`, `getProject(root, slug)`, `uploadSource(root, slug, name, stream, { probe })`, `attachShared(root, slug, names, { probe })`, `updateSource(root, slug, id, { role, note })`, `deleteSource(root, slug, id)`, `sourcePathOf(root, slug, id)`, `deleteProject(root, slug)`
  - `agent.mjs`: `buildPrompt({ mode, slug, notes })` (no `rawFile`); `suggestSlug` removed.
  - `sessions.mjs`: `startSession({ root, slug, runtime, model, effort, prompt, run, now })` (no `rawFile`); session objects `{ slug, runtime, model, effort, started, status }`.
  - HTTP routes (all JSON unless noted):
    - `GET /api/shared`, `POST /api/shared?name=<file>` (raw body), `DELETE /api/shared/:name`
    - `GET /api/projects`, `POST /api/projects {slug}`, `GET /api/projects/:slug`, `DELETE /api/projects/:slug`
    - `POST /api/projects/:slug/sources?name=<file>` (raw body), `POST /api/projects/:slug/shared {names}`
    - `PATCH /api/projects/:slug/sources/:id {role?, note?}`, `DELETE /api/projects/:slug/sources/:id`, `GET /api/projects/:slug/sources/:id/file` (file, supports Range)
    - `POST /api/sessions {slug, runtime, model, effort, notes}`
  - `createApp({ ..., probe, probeSource = probeMedia })`.

- [ ] **Step 1: Rewrite the affected tests (failing)**

In `scripts/studio.test.mjs`:

1. Imports: replace the `./studio/raw.mjs` import and `suggestSlug` with:
   ```js
   import { safeMediaName, receiveFile, projectSlugs } from './studio/files.mjs';
   import { deleteShared, listShared, sharedPath, sharedUsage } from './studio/shared.mjs';
   import { attachShared, createProject, deleteProject, deleteSource, getProject, listProjects, rendersOf, updateSource, uploadSource } from './studio/projects.mjs';
   import { syncManifest } from './lib/video-sources.mjs';
   ```
   (keep `symlinkSync` out of the import list if unused).
2. Delete the tests `suggestSlug`, `safeUploadName…`, `listRaw…`, `rawPath…`, `deleteRawCascade…`, `receiveUpload…` (both), `app lists raw…`, `app edit-plan…`, `app cascade delete…`.
3. `buildPrompt` test becomes:
   ```js
   test('buildPrompt points the agent at the project and its sources.json', () => {
     const p = buildPrompt({ mode: 'new', slug: 'a', notes: '  hook soal token ' });
     assert.equal(p.split('\n')[0], 'Edit video project `videos/a/` dari sumber di `videos/a/sources.json` (jalankan `npm run video -- sources a` dulu). Gunakan style yang sudah ada; serahkan ke agent Story untuk memilih dan memastikan hasil editing videonya bagus.');
     assert.doesNotMatch(p, /SKILL\.md|raw\//);
     assert.match(p, /Catatan dari Dena: hook soal token\n/);
     assert.match(p, /Jangan publish ke Repliz — publish dilakukan Dena dari Studio\.\n$/);
     const c = buildPrompt({ mode: 'continue', slug: 'a' });
     assert.match(c, /^Lanjutkan proyek `videos\/a\/` \(sumber di `sources\.json`\)/);
     assert.match(c, /Catatan dari Dena: -\n/);
   });
   ```
4. `parseSessions` test: drop the raw column:
   ```js
   const out = [
     'hanoman-1\t100\t0\t\t\t\t',
     'studio-a\t998\t0\tclaude\topus\thigh\t900',
     'studio-b\t990\t0\tcodex\tgpt-6-sol\txhigh\t900',
     'studio-c\t990\t1\tclaude\topus\thigh\t900',
   ].join('\n');
   …
   assert.deepEqual(parseSessions(out, 1000)[0], { slug: 'a', runtime: 'claude', model: 'opus', effort: 'high', started: 900, status: 'running' });
   ```
5. `startSession` tests: remove `rawFile: 'a.mp4'` arguments and the `['@studio_raw', 'a.mp4']` pair; add `assert.ok(!args.includes('@studio_raw'));`.
6. Replace `studioRoot` with:
   ```js
   const PROBE = (file, kind) => (kind === 'image' ? { width: 10, height: 20 } : { duration: 3, width: 1080, height: 1920, fps: 30, rotation: 0, hasAudio: true });
   function studioRoot() {
     const root = mkdtempSync(join(tmpdir(), 'studio-'));
     mkdirSync(join(root, 'templates/dena-video'), { recursive: true });
     writeFileSync(join(root, 'templates/dena-video/index.html'), '<div data-duration="__DURATION__">__SLUG__</div>');
     writeFileSync(join(root, 'templates/dena-video/hyperframes.json'), '{}');
     mkdirSync(join(root, 'shared'));
     writeFileSync(join(root, 'shared/intro.MP4'), 'I');
     writeFileSync(join(root, 'shared/logo.png'), 'L');
     writeFileSync(join(root, 'shared/.gitkeep'), '');
     const project = (slug, { files = [], shared = [], renders = [] } = {}) => {
       const dir = join(root, 'videos', slug);
       mkdirSync(join(dir, 'sources'), { recursive: true });
       mkdirSync(join(dir, 'renders'), { recursive: true });
       for (const f of files) writeFileSync(join(dir, 'sources', f), f);
       for (const r of renders) writeFileSync(join(dir, 'renders', r), 'R');
       syncManifest({ dir, root, addShared: shared, probe: PROBE });
     };
     project('vid-a', { files: ['take-1.mp4'], shared: ['intro.MP4'], renders: ['vid-a.mp4'] });
     project('vid-b', { files: ['take-1.mov', 'shot.jpg'] });
     return root;
   }
   ```
   (vid-a: `u1` = take-1.mp4, `u2` = shared intro.MP4. vid-b: `i1` = shot.jpg, `u1` = take-1.mov.)
7. In `listResults and renderPath`, change the traversal probe to `'../../shared/intro.MP4'`.
8. In `startApp`, the fake `list-panes` stdout becomes `'studio-vid-b\t0\t0\tclaude\topus\thigh\t1\n'`, and pass `probeSource: PROBE` in the `createApp` options.
9. `app token gate`: `/api/raw` → `/api/projects`.
10. Add these tests:

```js
test('safeMediaName keeps a basename with a media extension', () => {
  assert.equal(safeMediaName('../../etc/DJI 01.MP4'), 'DJI_01.MP4');
  assert.equal(safeMediaName('.hidden.png'), 'hidden.png');
  assert.throws(() => safeMediaName('notes.txt'), { status: 400 });
  assert.throws(() => safeMediaName(''), { status: 400 });
});

test('receiveFile streams to a .part file, renames, refuses overwrite, and cleans up on failure', async () => {
  const root = studioRoot();
  const dir = join(root, 'shared');
  assert.equal(await receiveFile(dir, 'shared', 'new clip.mp4', Readable.from([Buffer.from('xy')])), 'new_clip.mp4');
  assert.equal(readFileSync(join(dir, 'new_clip.mp4'), 'utf8'), 'xy');
  await assert.rejects(receiveFile(dir, 'shared', 'new_clip.mp4', Readable.from([])), { status: 409, message: 'shared/new_clip.mp4 already exists' });
  const broken = new Readable({ read() { this.push('x'); this.destroy(new Error('client aborted')); } });
  await assert.rejects(receiveFile(dir, 'shared', 'c.mp4', broken), /client aborted/);
  assert.equal(existsSync(join(dir, '.c.mp4.part')), false);
  assert.equal(existsSync(join(dir, 'c.mp4')), false);
});

test('shared library lists usage and refuses to delete a used file', async () => {
  const root = studioRoot();
  const items = await listShared(root, { probe: async () => 4.5 });
  assert.deepEqual(items.map((f) => [f.name, f.kind, f.duration, f.projects]), [['intro.MP4', 'video', 4.5, ['vid-a']], ['logo.png', 'image', null, []]]);
  assert.deepEqual(sharedUsage(root, 'intro.MP4'), ['vid-a']);
  assert.throws(() => deleteShared(root, 'intro.MP4'), { status: 409, message: /videos\/vid-a/ });
  assert.deepEqual(deleteShared(root, 'logo.png'), { name: 'logo.png' });
  assert.equal(existsSync(join(root, 'shared/logo.png')), false);
  assert.throws(() => sharedPath(root, '../shared/intro.MP4'), { status: 400 });
  assert.throws(() => sharedPath(root, 'zzz.mp4'), { status: 404 });
  assert.deepEqual(projectSlugs(root), ['vid-a', 'vid-b']);
});

test('projects: list, create, sources, delete', async () => {
  const root = studioRoot();
  assert.deepEqual(listProjects(root).map((p) => [p.slug, p.counts, p.renders]), [
    ['vid-a', { speech: 0, broll: 0, image: 0, auto: 2 }, ['vid-a.mp4']],
    ['vid-b', { speech: 0, broll: 0, image: 1, auto: 1 }, []],
  ]);
  assert.deepEqual(rendersOf(root, 'vid-a'), ['vid-a.mp4']);

  assert.deepEqual(createProject(root, 'baru'), { slug: 'baru' });
  assert.ok(existsSync(join(root, 'videos/baru/index.html')));
  assert.deepEqual(getProject(root, 'baru').sources, []);
  assert.throws(() => createProject(root, 'baru'), { status: 409 });
  assert.throws(() => createProject(root, 'Bad Slug'), { status: 400 });
  assert.throws(() => getProject(root, 'nope'), { status: 404 });

  const up = await uploadSource(root, 'baru', 'take 2.MOV', Readable.from([Buffer.from('v')]), { probe: PROBE });
  assert.deepEqual([up.id, up.path, up.kind, up.role], ['u1', 'sources/take_2.MOV', 'video', null]);
  await assert.rejects(uploadSource(root, 'baru', 'bad.mp4', Readable.from([Buffer.from('v')]), { probe: () => { throw new Error('ffprobe could not read'); } }), { status: 400 });
  assert.equal(existsSync(join(root, 'videos/baru/sources/bad.mp4')), false, 'an unreadable upload is removed');

  const attached = attachShared(root, 'baru', ['logo.png', 'intro.MP4'], { probe: PROBE });
  assert.deepEqual(attached.map((s) => [s.id, s.origin]), [['u1', 'project'], ['i1', 'shared'], ['u2', 'shared']]);
  assert.throws(() => attachShared(root, 'baru', [], { probe: PROBE }), { status: 400 });
  assert.throws(() => attachShared(root, 'baru', ['nope.mp4'], { probe: PROBE }), { status: 400 });

  assert.deepEqual([updateSource(root, 'baru', 'u1', { role: 'speech', note: 'take utama' })].map((s) => [s.role, s.roleSource, s.note]), [['speech', 'user', 'take utama']]);
  assert.equal(updateSource(root, 'baru', 'u1', { role: 'auto' }).role, null);
  assert.throws(() => updateSource(root, 'baru', 'i1', { role: 'speech' }), { status: 400 });

  deleteSource(root, 'baru', 'u2');
  assert.ok(existsSync(join(root, 'shared/intro.MP4')), 'detaching keeps the shared file');
  deleteSource(root, 'baru', 'u1');
  assert.equal(existsSync(join(root, 'videos/baru/sources/take_2.MOV')), false);

  deleteProject(root, 'baru');
  assert.equal(existsSync(join(root, 'videos/baru')), false);
  assert.ok(existsSync(join(root, 'shared/logo.png')));
});

test('app projects, sources, shared, and sessions routes', async (t) => {
  const root = studioRoot();
  const { server, call, calls, base } = await startApp(root);
  t.after(() => server.close());
  assert.deepEqual((await call('GET', '/api/projects')).body.map((p) => p.slug), ['vid-a', 'vid-b']);
  assert.equal((await call('POST', '/api/projects', { slug: 'baru' })).status, 200);
  assert.equal((await call('POST', '/api/projects', { slug: 'baru' })).status, 409);

  const up = await fetch(`${base}/api/projects/baru/sources?name=${encodeURIComponent('take 1.mp4')}`, { method: 'POST', headers: { origin: base }, body: 'video' });
  assert.equal(up.status, 200);
  assert.equal((await up.json()).id, 'u1');
  assert.equal((await call('POST', '/api/projects/baru/shared', { names: ['logo.png'] })).status, 200);
  assert.equal((await call('PATCH', '/api/projects/baru/sources/u1', { role: 'speech', note: 'utama' })).body.roleSource, 'user');
  assert.equal((await call('PATCH', '/api/projects/baru/sources/i1', { role: 'speech' })).status, 400);
  const file = await fetch(`${base}/api/projects/baru/sources/u1/file`);
  assert.equal(await file.text(), 'video');
  assert.deepEqual((await call('GET', '/api/projects/baru')).body.sources.map((s) => s.id), ['u1', 'i1']);

  assert.equal((await call('DELETE', '/api/shared/logo.png')).status, 409);
  const sh = await fetch(`${base}/api/shared?name=new.png`, { method: 'POST', headers: { origin: base }, body: 'P' });
  assert.equal(sh.status, 200);
  assert.deepEqual((await call('GET', '/api/shared')).body.map((f) => f.name), ['intro.MP4', 'logo.png', 'new.png']);
  assert.equal((await call('DELETE', '/api/shared/new.png')).status, 200);

  assert.equal((await call('POST', '/api/sessions', { slug: 'nope', runtime: 'claude', model: 'opus', effort: 'high' })).status, 404);
  assert.equal((await call('POST', '/api/sessions', { slug: 'Bad', runtime: 'claude', model: 'opus', effort: 'high' })).status, 400);
  const ok = await call('POST', '/api/sessions', { slug: 'baru', runtime: 'claude', model: 'opus', effort: 'high', notes: 'fokus hook' });
  assert.equal(ok.status, 200);
  assert.match(readFileSync(join(root, '.studio/prompts/baru.md'), 'utf8'), /^Edit video project `videos\/baru\/`[\s\S]*fokus hook/);
  writeFileSync(join(root, 'videos/baru/creative-brief.md'), 'brief');
  calls.length = 0;
  await call('POST', '/api/sessions', { slug: 'baru', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.match(readFileSync(join(root, '.studio/prompts/baru.md'), 'utf8'), /^Lanjutkan proyek `videos\/baru\/`/);

  assert.equal((await call('DELETE', '/api/projects/vid-b', undefined, { origin: 'http://evil.example' })).status, 403);
  assert.equal((await call('DELETE', '/api/projects/vid-b')).status, 200);
  assert.ok(calls.some((c) => c.join(' ') === 'tmux kill-session -t =studio-vid-b'));
  assert.equal(existsSync(join(root, 'videos/vid-b')), false);
  assert.equal((await call('GET', '/api/nope')).status, 404);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:studio`
Expected: FAIL — `Cannot find module './studio/files.mjs'`.

- [ ] **Step 3: Implement `scripts/studio/files.mjs`**

```js
// Studio file helpers: upload names, streamed uploads that never overwrite, project listing (ADR-0022).
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { isMedia } from '../lib/video-sources.mjs';
import { SLUG_RE } from '../video.mjs';
import { HttpError } from './http.mjs';

export function safeMediaName(name) {
  const base = basename(String(name ?? '')).normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+/, '').slice(-120);
  if (!isMedia(base)) throw new HttpError(400, 'file must be a video (.mp4 .mov .m4v) or an image (.png .jpg .jpeg .webp)');
  return base;
}

// RD-05-04: stream to <dir>/.<name>.part, rename only after the upload completes, never overwrite.
export async function receiveFile(dir, label, rawName, stream) {
  const name = safeMediaName(rawName);
  mkdirSync(dir, { recursive: true });
  const final = join(dir, name);
  const part = join(dir, `.${name}.part`);
  if (existsSync(final) || existsSync(part)) throw new HttpError(409, `${label}/${name} already exists`);
  try {
    await pipeline(stream, createWriteStream(part, { flags: 'wx' }));
    renameSync(part, final);
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  return name;
}

export function projectSlugs(root) {
  const dir = join(root, 'videos');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => SLUG_RE.test(d) && statSync(join(dir, d)).isDirectory()).sort();
}
```

- [ ] **Step 4: Implement `scripts/studio/shared.mjs`**

```js
// Studio shared library shared/: list, usage, guarded delete, streamed upload (ADR-0022, RD-05-04/05).
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { SHARED_DIR, isMedia, kindOf, readManifest } from '../lib/video-sources.mjs';
import { projectSlugs, receiveFile } from './files.mjs';
import { HttpError } from './http.mjs';

const sharedDir = (root) => join(root, SHARED_DIR);

export function sharedPath(root, name) {
  if (typeof name !== 'string' || basename(name) !== name || !isMedia(name)) throw new HttpError(400, 'invalid shared file name');
  const p = join(sharedDir(root), name);
  if (!existsSync(p) || !statSync(p).isFile()) throw new HttpError(404, `shared/${name} not found`);
  return p;
}

// A project whose sources.json cannot be read counts as a user, so a delete never breaks it silently.
export function sharedUsage(root, name) {
  const path = `../../${SHARED_DIR}/${name}`;
  return projectSlugs(root).filter((slug) => {
    try {
      return readManifest(join(root, 'videos', slug)).sources.some((s) => s.origin === 'shared' && s.path === path);
    } catch {
      return true;
    }
  });
}

export async function listShared(root, { probe }) {
  const dir = sharedDir(root);
  if (!existsSync(dir)) return [];
  const items = [];
  for (const name of readdirSync(dir).filter(isMedia).sort()) {
    const file = join(dir, name);
    const st = statSync(file);
    if (!st.isFile()) continue;
    const kind = kindOf(name);
    items.push({ name, kind, size: st.size, mtime: st.mtimeMs, duration: kind === 'video' ? await probe(file, st.mtimeMs) : null, projects: sharedUsage(root, name) });
  }
  return items;
}

export function deleteShared(root, name) {
  const file = sharedPath(root, name);
  const used = sharedUsage(root, name);
  if (used.length) throw new HttpError(409, `shared/${name} is used by ${used.map((s) => `videos/${s}`).join(', ')}; remove it from those projects first`);
  rmSync(file);
  return { name };
}

export const receiveShared = (root, name, stream) => receiveFile(sharedDir(root), SHARED_DIR, name, stream);
```

- [ ] **Step 5: Implement `scripts/studio/projects.mjs`**

```js
// Studio projects videos/<slug>/: create, list, sources (upload, attach shared, role/note, remove), delete
// (ADR-0022, RD-05-13..15). sources.json is written only through scripts/lib/video-sources.mjs.
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { SOURCES_DIR, readManifest, removeSource, setSource, sourceFile, syncManifest } from '../lib/video-sources.mjs';
import { checkSlug, scaffold } from '../video.mjs';
import { projectSlugs, receiveFile } from './files.mjs';
import { HttpError } from './http.mjs';

// Manifest and slug errors are the caller's input problems: 400.
const asBadRequest = (fn) => {
  try {
    return fn();
  } catch (e) {
    throw e instanceof HttpError ? e : new HttpError(400, e.message);
  }
};

export function projectPath(root, slug) {
  asBadRequest(() => checkSlug(slug));
  const dir = join(root, 'videos', slug);
  if (!existsSync(dir)) throw new HttpError(404, `videos/${slug} not found`);
  return dir;
}

// Same contract as the old raw.mjs helper (results.mjs relies on it): bad slug 400, missing project [].
export function rendersOf(root, slug) {
  asBadRequest(() => checkSlug(slug));
  const dir = join(root, 'videos', slug, 'renders');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => !f.startsWith('.') && extname(f).toLowerCase() === '.mp4').sort();
}

export function roleCounts(sources) {
  const c = { speech: 0, broll: 0, image: 0, auto: 0 };
  for (const s of sources) c[s.role ?? 'auto'] += 1;
  return c;
}

export function listProjects(root) {
  return projectSlugs(root).map((slug) => {
    let sources = [];
    try {
      sources = readManifest(join(root, 'videos', slug)).sources;
    } catch {
      // an unreadable manifest shows as no sources; the project page reports the error
    }
    return { slug, counts: roleCounts(sources), renders: rendersOf(root, slug) };
  });
}

export function createProject(root, slug) {
  asBadRequest(() => checkSlug(slug));
  if (existsSync(join(root, 'videos', slug))) throw new HttpError(409, `videos/${slug} already exists`);
  scaffold({ slug, root });
  return { slug };
}

export function getProject(root, slug) {
  const dir = projectPath(root, slug);
  return { slug, sources: asBadRequest(() => readManifest(dir)).sources, renders: rendersOf(root, slug) };
}

export async function uploadSource(root, slug, name, stream, { probe }) {
  const dir = projectPath(root, slug);
  const saved = await receiveFile(join(dir, SOURCES_DIR), `videos/${slug}/${SOURCES_DIR}`, name, stream);
  try {
    return syncManifest({ dir, root, probe }).sources.find((s) => s.path === `${SOURCES_DIR}/${saved}`);
  } catch (e) {
    rmSync(join(dir, SOURCES_DIR, saved), { force: true }); // an unreadable file must not stay half-registered
    throw new HttpError(400, `${saved}: ${e.message}`);
  }
}

export function attachShared(root, slug, names, { probe }) {
  const dir = projectPath(root, slug);
  if (!Array.isArray(names) || !names.length || !names.every((n) => typeof n === 'string')) throw new HttpError(400, 'names must be a non-empty array of shared file names');
  return asBadRequest(() => syncManifest({ dir, root, addShared: names, probe })).sources;
}

export function updateSource(root, slug, id, { role, note } = {}) {
  const dir = projectPath(root, slug);
  return asBadRequest(() => setSource(dir, id, { role, note, by: 'user' }));
}

export function deleteSource(root, slug, id) {
  const dir = projectPath(root, slug);
  return asBadRequest(() => removeSource(dir, id));
}

export function sourcePathOf(root, slug, id) {
  const dir = projectPath(root, slug);
  const s = asBadRequest(() => readManifest(dir)).sources.find((x) => x.id === id);
  if (!s) throw new HttpError(404, `source ${id} not found`);
  return sourceFile(dir, s);
}

// Callers kill the project's tmux session first (RD-05-13). shared/ is never touched.
export function deleteProject(root, slug) {
  rmSync(projectPath(root, slug), { recursive: true, force: true });
  return { slug };
}
```

- [ ] **Step 6: Update `agent.mjs` and `sessions.mjs`**

`agent.mjs`: delete `suggestSlug` (and the `basename, extname` import if now unused) and replace `buildPrompt` with:

```js
export function buildPrompt({ mode, slug, notes }) {
  const note = String(notes ?? '').trim() || '-';
  const first = mode === 'continue'
    ? `Lanjutkan proyek \`videos/${slug}/\` (sumber di \`sources.json\`). Baca artefak yang sudah ada, tentukan fase terakhir yang selesai, lalu lanjutkan sesuai ${SKILL}.`
    : `Edit video project \`videos/${slug}/\` dari sumber di \`videos/${slug}/sources.json\` (jalankan \`npm run video -- sources ${slug}\` dulu). Gunakan style yang sudah ada; serahkan ke agent Story untuk memilih dan memastikan hasil editing videonya bagus.`;
  return `${first}\nCatatan dari Dena: ${note}\nJangan publish ke Repliz — publish dilakukan Dena dari Studio.\n`;
}
```

`sessions.mjs`:
- `FIELDS` drops `'@studio_raw'`.
- `parseSessions`: `const [name, activity, dead, runtime, model, effort, started] = line.split('\t');` and push `{ slug, runtime, model, effort, started: Number(started) || 0, status }`.
- `startSession({ root, slug, runtime, model, effort, prompt, run = runFile, now = Date.now })`; delete the `...set('@studio_raw', rawFile),` line.

- [ ] **Step 7: Rewire `app.mjs`**

- Imports: drop `raw.mjs` and `suggestSlug`; add
  ```js
  import { probeMedia } from '../lib/video-sources.mjs';
  import { deleteShared, listShared, receiveShared } from './shared.mjs';
  import { attachShared, createProject, deleteProject, deleteSource, getProject, listProjects, projectPath, sourcePathOf, updateSource, uploadSource } from './projects.mjs';
  ```
- Header comment: `// Studio routes (ADR-0020, ADR-0022, RD-05). Filesystem + tmux are the only state.`
- Signature: add `probeSource = probeMedia` to the `createApp` destructuring; remove `sessionsForRaw`.
- Replace the four `/api/raw…` routes and the `POST /api/sessions` route with:

```js
    ['GET', /^\/api\/shared$/, async () => listShared(root, { probe })],
    ['POST', /^\/api\/shared$/, async (req, url) => ({ name: await receiveShared(root, url.searchParams.get('name'), req) })],
    ['DELETE', /^\/api\/shared\/([^/]+)$/, async (req, url, [name]) => deleteShared(root, name)],
    ['GET', /^\/api\/projects$/, async () => listProjects(root)],
    ['POST', /^\/api\/projects$/, async (req) => createProject(root, (await readJson(req)).slug)],
    ['GET', /^\/api\/projects\/([^/]+)$/, async (req, url, [slug]) => getProject(root, slug)],
    ['DELETE', /^\/api\/projects\/([^/]+)$/, async (req, url, [slug]) => {
      projectPath(root, slug);
      await killSession(slug, opt);
      return deleteProject(root, slug);
    }],
    ['POST', /^\/api\/projects\/([^/]+)\/sources$/, async (req, url, [slug]) => uploadSource(root, slug, url.searchParams.get('name'), req, { probe: probeSource })],
    ['POST', /^\/api\/projects\/([^/]+)\/shared$/, async (req, url, [slug]) => attachShared(root, slug, (await readJson(req)).names, { probe: probeSource })],
    ['PATCH', /^\/api\/projects\/([^/]+)\/sources\/([^/]+)$/, async (req, url, [slug, id]) => {
      const b = await readJson(req);
      return updateSource(root, slug, id, { role: b.role, note: b.note });
    }],
    ['DELETE', /^\/api\/projects\/([^/]+)\/sources\/([^/]+)$/, async (req, url, [slug, id]) => deleteSource(root, slug, id)],
    ['GET', /^\/api\/projects\/([^/]+)\/sources\/([^/]+)\/file$/, async (req, url, [slug, id], res) => {
      sendFile(req, res, sourcePathOf(root, slug, id));
      return RAW;
    }],
    ['GET', /^\/api\/sessions$/, async () => listSessions(opt)],
    ['POST', /^\/api\/sessions$/, async (req) => {
      const b = await readJson(req);
      const slug = slugParam(b.slug);
      const dir = projectPath(root, slug);
      const mode = existsSync(join(dir, 'creative-brief.md')) ? 'continue' : 'new';
      const prior = (await listSessions(opt)).find((s) => s.slug === slug);
      if (prior?.status === 'exited') await killSession(slug, opt);
      const prompt = buildPrompt({ mode, slug, notes: b.notes });
      return startSession({ root, slug, runtime: b.runtime, model: b.model, effort: b.effort, prompt, ...opt });
    }],
```

Keep the existing `GET /api/sessions` only once (the snippet above includes it; delete the old copy). Verify `sendFile` in `http.mjs` 404s a missing file; if it throws a non-HttpError, wrap `sourcePathOf` result with an `existsSync` check that throws `new HttpError(404, …)`.

`scripts/studio/results.mjs` line 7: `import { projectSlugs, rendersOf } from './raw.mjs';` → `import { projectSlugs } from './files.mjs';` + `import { rendersOf } from './projects.mjs';`.

`scripts/studio.mjs`: header comment `raw videos` → `projects and the shared library`. Delete `scripts/studio/raw.mjs` (`git rm scripts/studio/raw.mjs`) and grep for leftovers: `grep -rn "raw.mjs\|rawFile\|studio_raw" scripts` → no matches.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm run test:studio && npm run test:video`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/studio scripts/studio.mjs scripts/studio.test.mjs docs/superpowers/specs/2026-09-28-studio-web-ui-design.md
git commit -m "feat(studio): project-centered server with shared library"
```

---

### Task 7: Studio UI — Projects and Shared tabs

**Files:**
- Modify: `scripts/studio/public/index.html`, `scripts/studio/public/app.js`, `scripts/studio/public/app.css`

**Interfaces:** Consumes the HTTP routes from Task 6 exactly as listed there.

- [ ] **Step 1: `index.html`**

Replace the `<nav>` buttons with:
```html
    <button data-tab="projects" class="active">Projects</button>
    <button data-tab="shared">Shared</button>
    <button data-tab="sessions">Sessions</button>
    <button data-tab="results">Results</button>
```
Replace `<section id="tab-raw">…</section>` with:
```html
  <section id="tab-projects">
    <div id="project-home">
      <form id="project-create" class="bar">
        <input name="slug" required pattern="[a-z0-9][a-z0-9\-]*" placeholder="slug-project-baru" autocapitalize="off" autocomplete="off">
        <button class="primary">Buat project</button>
      </form>
      <ul id="project-list" class="list"></ul>
    </div>
    <div id="project-detail" hidden>
      <div class="bar">
        <button id="project-back">← Projects</button>
        <strong id="project-title"></strong>
      </div>
      <div class="bar">
        <label class="btn primary">Upload video/gambar<input id="source-upload" type="file" multiple accept="video/mp4,video/quicktime,.mp4,.mov,.m4v,image/png,image/jpeg,image/webp" hidden></label>
        <button id="project-attach">Tambah dari Shared</button>
        <button id="project-session" class="primary">Mulai sesi</button>
        <button id="project-delete" class="danger">Hapus project</button>
        <progress id="source-progress" max="1" value="0" hidden></progress>
      </div>
      <ul id="source-list" class="list"></ul>
    </div>
  </section>
  <section id="tab-shared" hidden>
    <div class="bar">
      <label class="btn primary">Upload ke Shared<input id="shared-upload" type="file" multiple accept="video/mp4,video/quicktime,.mp4,.mov,.m4v,image/png,image/jpeg,image/webp" hidden></label>
      <progress id="shared-progress" max="1" value="0" hidden></progress>
    </div>
    <ul id="shared-list" class="list"></ul>
  </section>
```
In `#edit-dialog`: replace `<h2>Edit <span id="edit-raw"></span></h2>` with `<h2>Sesi agen <span id="edit-slug"></span></h2>` and delete the `<label>Slug …</label>` line. Delete the whole `#delete-dialog`. Add:
```html
<dialog id="attach-dialog">
  <form method="dialog" id="attach-form">
    <h2>Tambah dari Shared</h2>
    <ul id="attach-list" class="checks"></ul>
    <p class="error" id="attach-error"></p>
    <menu><button value="cancel" formnovalidate>Batal</button><button value="attach" class="primary">Tambahkan</button></menu>
  </form>
</dialog>
```

- [ ] **Step 2: `app.js`**

- `let tab = 'raw';` → `let tab = 'projects';` and add `let openSlug = '';`.
- `showTab`: the tab list becomes `['projects', 'shared', 'sessions', 'results']`; when `name === 'projects'` and the Projects button is clicked again, reset `openSlug = ''` (add `if (name === 'projects' && tab === 'projects') openSlug = '';` as the first line of `showTab`).
- `refresh()` body:

```js
    if (tab === 'projects') {
      const sessions = await api('/api/sessions');
      if (openSlug) renderProject(await api(`/api/projects/${enc(openSlug)}`), sessions);
      else renderProjects(await api('/api/projects'), sessions);
    }
    if (tab === 'shared') renderShared(await api('/api/shared'));
    if (tab === 'sessions') renderSessions(await api('/api/sessions'));
    if (tab === 'results') renderResults(await api('/api/results'));
```

- Delete the `// ---- Raw ----`, the old upload handler, the `openEdit` edit-plan code, and the whole `// ---- Delete ----` section. Insert:

```js
// ---- Uploads (one file at a time, in order) ----
function uploadOne(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status < 400) return resolve();
      let msg = '';
      try { msg = JSON.parse(xhr.responseText).error; } catch { /* not JSON */ }
      reject(new Error(msg || `Upload gagal (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload terputus'));
    xhr.send(file);
  });
}

async function uploadFiles(input, url, bar) {
  const files = [...input.files];
  if (!files.length) return;
  bar.hidden = false;
  bar.value = 0;
  for (const [i, file] of files.entries()) {
    try {
      await uploadOne(`${url}?name=${enc(file.name)}`, file, (f) => { bar.value = (i + f) / files.length; });
    } catch (err) {
      banner(`${file.name}: ${err.message}`);
    }
  }
  bar.hidden = true;
  input.value = '';
  refresh();
}

// ---- Projects ----
const countText = (c) => Object.entries(c).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(' · ') || 'belum ada sumber';

function renderProjects(items, sessions) {
  $('#project-detail').hidden = true;
  $('#project-home').hidden = false;
  const live = new Map(sessions.map((s) => [s.slug, s.status]));
  $('#project-list').innerHTML = items.length ? items.map((p) => `
    <li>
      <div class="meta"><strong>${esc(p.slug)}</strong>${live.has(p.slug) ? `<span class="status ${esc(live.get(p.slug))}">${esc(live.get(p.slug))}</span>` : ''}
        <span class="muted">${esc(countText(p.counts))} · ${p.renders.length} render</span></div>
      <div class="actions"><button class="primary" data-open-project="${esc(p.slug)}">Buka</button></div>
    </li>`).join('') : '<li class="muted">Belum ada project.</li>';
}
$('#project-list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-open-project]');
  if (!b) return;
  openSlug = b.dataset.openProject;
  refresh();
});
$('#project-create').addEventListener('submit', async (e) => {
  e.preventDefault();
  const slug = e.target.slug.value.trim();
  try {
    await post('/api/projects', { slug });
    e.target.reset();
    openSlug = slug;
    refresh();
  } catch (err) {
    banner(err.message);
  }
});

const ROLE_OPTIONS = { video: [['', 'Auto'], ['speech', 'Speech'], ['broll', 'B-roll']], image: [['image', 'Image']] };
function renderProject(p, sessions) {
  $('#project-home').hidden = true;
  $('#project-detail').hidden = false;
  $('#project-title').textContent = `videos/${p.slug}/`;
  const live = sessions.find((x) => x.slug === p.slug && x.status !== 'exited');
  $('#project-session').textContent = live ? 'Buka terminal' : 'Mulai sesi';
  $('#project-session').dataset.live = live ? '1' : '';
  $('#source-list').innerHTML = p.sources.length ? p.sources.map((x) => {
    const url = `/api/projects/${enc(p.slug)}/sources/${enc(x.id)}/file`;
    const preview = x.kind === 'image' ? `<img src="${url}" alt="" loading="lazy">` : `<video src="${url}#t=0.5" preload="metadata" muted playsinline></video>`;
    const opts = ROLE_OPTIONS[x.kind].map(([v, l]) => `<option value="${v}"${(x.role ?? '') === v ? ' selected' : ''}>${l}</option>`).join('');
    const size = x.kind === 'video' ? dur(x.probe?.duration) : `${x.probe?.width ?? '?'}×${x.probe?.height ?? '?'}`;
    return `<li class="source" data-id="${esc(x.id)}">
      ${preview}
      <div class="meta"><strong>${esc(x.id)} · ${esc(x.path.split('/').pop())}</strong>
        <span class="muted">${x.origin === 'shared' ? 'shared' : 'project'} · ${esc(size)}${x.roleSource === 'detected' ? ' · deteksi agen' : ''}</span>
        <label>Peran <select data-role${x.kind === 'image' ? ' disabled' : ''}>${opts}</select></label>
        <label>Catatan <input data-note value="${esc(x.note)}" maxlength="500" placeholder="mis. pakai waktu bahas harga"></label></div>
      <div class="actions"><button class="danger" data-remove="${esc(x.id)}">${x.origin === 'shared' ? 'Lepas' : 'Hapus'}</button></div>
    </li>`;
  }).join('') : '<li class="muted">Belum ada sumber. Upload video/gambar atau tambah dari Shared.</li>';
}

$('#project-back').addEventListener('click', () => { openSlug = ''; refresh(); });
$('#source-upload').addEventListener('change', () => uploadFiles($('#source-upload'), `/api/projects/${enc(openSlug)}/sources`, $('#source-progress')));
$('#source-list').addEventListener('change', async (e) => {
  const li = e.target.closest('li[data-id]');
  const body = e.target.matches('[data-role]') ? { role: e.target.value || 'auto' } : e.target.matches('[data-note]') ? { note: e.target.value } : null;
  if (!li || !body) return;
  try {
    await api(`/api/projects/${enc(openSlug)}/sources/${enc(li.dataset.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  } catch (err) {
    banner(err.message);
  }
  refresh();
});
$('#source-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-remove]');
  if (!b || !confirm(`${b.textContent} sumber ${b.dataset.remove}?`)) return;
  try {
    await api(`/api/projects/${enc(openSlug)}/sources/${enc(b.dataset.remove)}`, { method: 'DELETE' });
    refresh();
  } catch (err) {
    banner(err.message);
  }
});
$('#project-attach').addEventListener('click', async () => {
  let items;
  try {
    items = await api('/api/shared');
  } catch (err) {
    return banner(err.message);
  }
  $('#attach-list').innerHTML = items.length ? items.map((f) => `<li><label><input type="checkbox" value="${esc(f.name)}"${f.projects.includes(openSlug) ? ' checked disabled' : ''}> ${esc(f.name)} <span class="muted">${f.kind === 'video' ? dur(f.duration) : 'image'}</span></label></li>`).join('') : '<li class="muted">Shared library kosong.</li>';
  $('#attach-error').textContent = '';
  $('#attach-dialog').showModal();
});
$('#attach-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'attach') return;
  e.preventDefault();
  const names = [...document.querySelectorAll('#attach-list input:checked:not(:disabled)')].map((i) => i.value);
  if (!names.length) return $('#attach-dialog').close();
  try {
    await post(`/api/projects/${enc(openSlug)}/shared`, { names });
    $('#attach-dialog').close();
    refresh();
  } catch (err) {
    $('#attach-error').textContent = err.message;
  }
});
$('#project-session').addEventListener('click', () => ($('#project-session').dataset.live ? openTerminal(openSlug) : openEdit(openSlug)));
$('#project-delete').addEventListener('click', async () => {
  if (!confirm(`Hapus permanen videos/${openSlug}/ beserta render dan sesi agennya? File di shared/ tidak ikut terhapus.`)) return;
  try {
    await api(`/api/projects/${enc(openSlug)}`, { method: 'DELETE' });
    openSlug = '';
    refresh();
  } catch (err) {
    banner(err.message);
  }
});

// ---- Shared ----
function renderShared(items) {
  $('#shared-list').innerHTML = items.length ? items.map((f) => `
    <li>
      <div class="meta"><strong>${esc(f.name)}</strong><span class="muted">${f.kind === 'video' ? dur(f.duration) : 'image'} · ${mb(f.size)} · ${f.projects.length ? `dipakai: ${f.projects.map(esc).join(', ')}` : 'belum dipakai'}</span></div>
      <div class="actions"><button class="danger" data-delete-shared="${esc(f.name)}">Hapus</button></div>
    </li>`).join('') : '<li class="muted">Shared library kosong.</li>';
}
$('#shared-upload').addEventListener('change', () => uploadFiles($('#shared-upload'), '/api/shared', $('#shared-progress')));
$('#shared-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-delete-shared]');
  if (!b || !confirm(`Hapus permanen shared/${b.dataset.deleteShared}?`)) return;
  try {
    await api(`/api/shared/${enc(b.dataset.deleteShared)}`, { method: 'DELETE' });
    refresh();
  } catch (err) {
    banner(err.message);
  }
});
```

- Replace the `// ---- Edit ----` block's `editRaw` / `openEdit` / submit with:

```js
let editSlug = '';
function openEdit(slug) {
  editSlug = slug;
  const f = $('#edit-form');
  f.reset();
  $('#edit-slug').textContent = `videos/${slug}/`;
  $('#edit-mode').textContent = '';
  for (const o of f.runtime.options) o.disabled = state.tools[o.value] === false;
  f.runtime.value = state.tools.claude === false ? 'codex' : 'claude';
  fillModelOptions();
  $('#edit-error').textContent = '';
  $('#edit-dialog').showModal();
}
$('#edit-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'start') return;
  e.preventDefault();
  const f = e.target;
  try {
    const s = await post('/api/sessions', { slug: editSlug, runtime: f.runtime.value, model: f.model.value, effort: f.effort.value, notes: f.notes.value });
    $('#edit-dialog').close();
    openTerminal(s.slug);
  } catch (err) {
    $('#edit-error').textContent = err.message;
  }
});
```
(keep `fillModelOptions` and its `runtime` change listener unchanged).

- In `renderSessions`, change the muted line to `${esc(s.runtime)} · ${esc(s.model)} · ${esc(s.effort)}` (no `s.raw`).

- [ ] **Step 3: `app.css`**

Append:
```css
.source { align-items: flex-start; }
.source img, .source video { width: 72px; height: 128px; object-fit: cover; border-radius: 6px; background: #000; flex: none; }
.source label { display: grid; gap: 4px; margin-top: 6px; }
.source input, .source select, #project-create input { font: inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg, transparent); color: var(--fg); min-width: 0; }
#project-create { display: flex; gap: 8px; }
#project-create input { flex: 1; }
.checks { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; max-height: 50vh; overflow: auto; }
```

- [ ] **Step 4: Manually verify in a browser**

Run (background): `STUDIO_PORT=4799 npm run studio` with `run_in_background: true`.
With the browser tool or `curl`, check against a scratch project (do not touch the migrated one):
```bash
curl -s -H 'Origin: http://127.0.0.1:4799' -H 'content-type: application/json' -d '{"slug":"ui-check"}' http://127.0.0.1:4799/api/projects
curl -s http://127.0.0.1:4799/api/projects | head -c 400
curl -s http://127.0.0.1:4799/api/shared | head -c 400
```
Expected: `{"slug":"ui-check"}`; the project list includes `dji-20260910103830-0395-d` (1 speech) and `ui-check`; shared lists `DJI_20260910103830_0395_D.MP4` used by the dji project.
Open `http://127.0.0.1:4799/` and click through: Projects → ui-check → upload a small `.png` → role select disabled (Image) → add from Shared (DJI file) → set role Speech → note saved after blur → Lepas → Hapus project. Shared tab → Hapus DJI → error banner naming `videos/dji-…`.
Then delete the scratch project if still present: `curl -s -X DELETE -H 'Origin: http://127.0.0.1:4799' http://127.0.0.1:4799/api/projects/ui-check`, and stop the server.

- [ ] **Step 5: Commit**

```bash
git add scripts/studio/public
git commit -m "feat(studio): projects and shared library UI"
```

---

### Task 8: End-to-end verification

**Files:** none committed except fixes found here (each fix goes back to its owning task's files and docs).

- [ ] **Step 1: Full test suites**

Run: `npm run test:video && npm run test:studio && npm run test:repliz`
Expected: all PASS.

- [ ] **Step 2: Multi-source dry run on a scratch project**

```bash
npm run video -- new e2e-multi
ffmpeg -y -loglevel error -ss 5 -t 6 -i shared/DJI_20260910103830_0395_D.MP4 -c copy videos/e2e-multi/sources/take-a.mp4
ffmpeg -y -loglevel error -ss 30 -t 6 -i shared/DJI_20260910103830_0395_D.MP4 -c copy videos/e2e-multi/sources/take-b.mp4
ffmpeg -y -loglevel error -ss 40 -i shared/DJI_20260910103830_0395_D.MP4 -frames:v 1 videos/e2e-multi/sources/still.png
npm run video -- sources e2e-multi
npm run video -- sources e2e-multi --set u1 --role speech
npm run video -- sources e2e-multi --set u2 --role speech --note "take kedua"
```
Expected: the last listing shows `i1  image  (detected)`, `u1  speech  (user)`, `u2  speech  (user)  … "take kedua"`.
Write `videos/e2e-multi/cut-list.json`:
```json
{ "speed": 1.2, "segments": [
  { "source": "u2", "sourceStart": 1, "sourceEnd": 4, "action": "move-to-hook", "reason": "e2e" },
  { "source": "u1", "sourceStart": 0, "sourceEnd": 1, "action": "cut-retake", "reason": "e2e" },
  { "source": "u1", "sourceStart": 1, "sourceEnd": 5, "action": "keep", "reason": "e2e" }
] }
```
Run: `npm run video -- cut e2e-multi`
Expected: `processed videos/e2e-multi/processed.mp4 (5.833 s from 2 segments)`.
Check: `ffprobe -v error -show_entries stream=width,height,r_frame_rate,sample_rate -of csv=p=0 videos/e2e-multi/processed.mp4` → `1080,1920,30/1` and `48000`.
Check upright orientation: `ffmpeg -y -loglevel error -ss 1 -i videos/e2e-multi/processed.mp4 -frames:v 1 videos/e2e-multi/check.png` and view it with the Read tool (Dena upright, not sideways).
Check loudness: `ffmpeg -hide_banner -nostats -i videos/e2e-multi/processed.mp4 -af ebur128 -f null - 2>&1 | grep -A1 "Integrated"` → around −16 LUFS (±1.5).

- [ ] **Step 3: Migrated project still checks out**

Run: `npm run video -- check dji-20260910103830-0395-d`
Expected: lint/validate/inspect pass as before the migration (the composition uses `processed.mp4`, which the migration did not touch).

- [ ] **Step 4: Clean up and final commit**

```bash
rm -rf videos/e2e-multi
git status --short
```
Expected: clean (videos/ is ignored). If any fix was needed, commit it with the doc it touches, naming the changed docs in the message body.

---

## Self-Review Notes

- Spec coverage: layout + `sources.json` (T2), Story changes (T5 docs + T2/T3 commands), `video cut` + normalization + cut-map (T3), Studio projects/shared (T6–T7), migration (T4), ADR/RD/data-model/entry docs (T1–T5), tests (T2–T4, T6), e2e (T8). `--source-frame` intentionally dropped (see deviations).
- Names used across tasks: `syncManifest`, `setSource(dir,id,{role,note,by})`, `removeSource(dir,id)`, `readManifest`, `writeManifest`, `sourceFile`, `probeMedia(file,kind,run)`, `cutMapOf`, `validateCutList`, `buildCutPlan`, `receiveFile(dir,label,name,stream)`, `projectPath`, `startSession` without `rawFile` — consistent.
