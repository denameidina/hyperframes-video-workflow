# Per-Video HyperFrames Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset the tracked root `index.html` to the HyperFrames blank portrait template and move every video's composition into an ignored project under `videos/<slug>/`, scaffolded from a tracked Dena starter and driven by `npm run video`.

**Architecture:** `scripts/video.mjs` (Node built-ins only) scaffolds `videos/<slug>/` from `templates/dena-video/` (placeholders `__SLUG__`, `__DURATION__`), symlinks `vendor -> ../../vendor`, and runs pinned HyperFrames commands with `videos/<slug>` as the project directory. Docs switch Build, motion b-roll authoring, and entry doors from the root `index.html` to the per-video project.

**Tech Stack:** Node 22+ (`node:test`, `node:fs`, `node:child_process`), HyperFrames 0.7.24 via pinned `npx`, ffmpeg/ffprobe.

**Spec:** `docs/superpowers/specs/2026-09-26-per-video-projects-design.md`

## Global Constraints

- No npm dependencies (ADR-0007). HyperFrames is always `npx --yes hyperframes@0.7.24`.
- Slug pattern: `^[a-z0-9][a-z0-9-]*$` (same as `render-blur`).
- Per-video layout: `videos/<slug>/index.html`, `compositions/broll/`, `assets/`, `vendor -> ../../vendor`, `renders/<slug>.mp4`, `snapshots/`. Media paths inside a video composition are relative (`processed.mp4`, `processed-audio.wav`, `assets/...`).
- `video new` never overwrites an existing `videos/<slug>/index.html`.
- Child processes started by `scripts/video.mjs` run with `GEMINI_API_KEY` removed from the environment.
- Root `index.html` = `hyperframes init --example blank --resolution portrait` output with GSAP from `vendor/gsap.min.js` instead of the CDN.
- Starter values follow `internal/docs/design-system/visual-system.md`: base video track 1, base audio track 10, SFX track 11+, progress track 3, captions track 2/8 alternating, hook/CTA track 5, b-roll mounts track 4 with an `id`, `.broll` z-index 22, caption z-index 45, hook/CTA z-index 56, yellow `#facc15`.
- The old `dena-wfh-jaga-anak` composition is not migrated (its media was deleted by the user; it stays in git at `17b3683`).
- In inline "replace X with Y" specs, `\n` is a line break and `` \` `` a literal backtick; each replacement must match exactly once.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `internal/docs/adr/0010-per-video-hyperframes-projects.md` | Create | Decision |
| `internal/docs/requirements/rd-02-composition-render.md` | Modify | EARS RD-02-20..24 |
| `internal/docs/README.md` | Modify | Register ADR-0010 |
| `scripts/video.mjs`, `scripts/video.test.mjs` | Create | CLI + tests |
| `package.json`, `.github/workflows/ci.yml` | Modify | `video`, `test:video` scripts; CI |
| `templates/dena-video/index.html`, `templates/dena-video/hyperframes.json` | Create | Dena starter |
| `index.html` | Rewrite | Blank portrait template |
| `docs/agents/03-build.md`, `docs/agents/references/motion-broll-authoring.md`, `docs/agents/references/hyperframes-assembly.md`, `docs/skills/dena-video-editing-workflow/references/quality-gates.md`, `AGENTS.md`, `CLAUDE.md` | Modify | Workflow docs |
| `internal/docs/architecture/data-model.md`, `internal/docs/frontend/composition-implementation.md`, `internal/docs/operations/runbook.md`, `internal/docs/design-system/visual-system.md`, `internal/docs/architecture/stack.md` | Modify | Canon docs |

---

### Task 1: Governance — ADR-0010, EARS, index

**Files:**
- Create: `internal/docs/adr/0010-per-video-hyperframes-projects.md`
- Modify: `internal/docs/requirements/rd-02-composition-render.md` (insert before `## Verifikasi`)
- Modify: `internal/docs/README.md`

- [ ] **Step 1: Create ADR-0010**

```markdown
# ADR-0010 Proyek HyperFrames per Video
Status: accepted
Date: 2026-09-26

## Context

Setiap video ditulis langsung di `index.html` root yang ter-track git, sehingga
setiap edit video ikut ter-commit (contoh `dena-wfh-jaga-anak` di `17b3683`) dan
`npm run check` root gagal begitu media video dihapus. Spike 2026-09-26: proyek
`videos/demo/` dengan symlink `vendor -> ../../vendor` lolos `hyperframes lint`
dan `snapshot` merender clip motion-kit dengan font termuat; `lint`,
`validate`, `inspect`, `preview`, `snapshot`, dan `render` menerima `[DIR]`.

## Decision

- Root `index.html` adalah template blank portrait HyperFrames (GSAP lokal) dan
  tidak diubah untuk video.
- Setiap video adalah proyek HyperFrames di `videos/<slug>/` (sudah di-ignore):
  `index.html`, `compositions/broll/`, `assets/`, `renders/`, `snapshots/`,
  symlink `vendor -> ../../vendor`; path media relatif.
- Starter Dena ter-track di `templates/dena-video/`; `npm run video -- new|check|dev|snapshot|render <slug>`
  (`scripts/video.mjs`) membuat dan menjalankan proyek itu.

## Consequences

- Pekerjaan video tidak lagi masuk commit; clone baru hanya berisi template.
- Semua perintah HyperFrames untuk video memakai `videos/<slug>` sebagai DIR.
- Starter menaruh audio di track 10 (konflik lama "audio di track 1" selesai
  untuk video baru).

## Sources

- Spec: `docs/superpowers/specs/2026-09-26-per-video-projects-design.md`
- `scripts/video.mjs`, `templates/dena-video/`
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md)
```

- [ ] **Step 2: Add EARS to rd-02**

Insert before the line `## Verifikasi` in `internal/docs/requirements/rd-02-composition-render.md`:

```markdown
## Proyek per video

- **RD-02-20** (Ubiquitous) — The system shall menjaga `index.html` root sebagai
  template HyperFrames blank portrait; komposisi video shall hidup di
  `videos/<slug>/index.html`.
- **RD-02-21** (Event-driven) — When `npm run video -- new <slug>` dijalankan,
  the system shall menyalin `templates/dena-video/` ke `videos/<slug>/`, mengganti
  `__SLUG__` dan `__DURATION__`, membuat `compositions/broll/` dan `assets/`, dan
  membuat symlink `vendor -> ../../vendor`.
- **RD-02-22** (Unwanted) — If `videos/<slug>/index.html` sudah ada, then
  `video new` shall menolak tanpa mengubah file apa pun.
- **RD-02-23** (Event-driven) — When `npm run video -- render <slug>` dijalankan,
  the system shall merender `videos/<slug>` ke `videos/<slug>/renders/<slug>.mp4`
  (atau `<slug>-blur.mp4` dengan `--blur`).
- **RD-02-24** (Ubiquitous) — Proses anak `scripts/video.mjs` shall berjalan tanpa
  `GEMINI_API_KEY` di environment.

```

- [ ] **Step 3: Register ADR-0010**

In `internal/docs/README.md`, replace every line from the one starting `31. [adr/0009-motion-broll-motion-kit.md]` through the one starting `41. [security/audit-2026-07-20.md]` with:

```markdown
31. [adr/0009-motion-broll-motion-kit.md](adr/0009-motion-broll-motion-kit.md) - Motion b-roll lewat engine motion-kit + sub-composition HyperFrames.
32. [adr/0010-per-video-hyperframes-projects.md](adr/0010-per-video-hyperframes-projects.md) - Komposisi per video di `videos/<slug>/`; root `index.html` hanya template.

### Design System & Frontend
33. [design-system/visual-system.md](design-system/visual-system.md) - Sistem visual: palet, tipografi, kartu, track/z-index, safe area, motion.
34. [frontend/composition-implementation.md](frontend/composition-implementation.md) - Starter Dena dan tata letak proyek per video.

### Operations
35. [operations/runbook.md](operations/runbook.md) - Perintah harian: setup, dev, check, render, publish, transkripsi.
36. [operations/publish-runbook.md](operations/publish-runbook.md) - Menjalankan auto-publish R2/Repliz + kegagalan umum.
37. [operations/video-editing-workflow.md](operations/video-editing-workflow.md) - Operasional 4 fase + gate + ikhtisar per fase.
38. [operations/implementation-standard.md](operations/implementation-standard.md) - Alur perubahan, verifikasi wajib, Definition of Done.
39. [operations/agent-documentation-workflow.md](operations/agent-documentation-workflow.md) - Cara agent memakai docs sebagai SoT + Stop hook.
40. [operations/roadmap.md](operations/roadmap.md) - Rencana: imagegen fix, rilis open-source; arah produk draft.

### Security
41. [security/security-standard.md](security/security-standard.md) - Aturan secret, model kredensial publish, secret scan.
42. [security/audit-2026-07-20.md](security/audit-2026-07-20.md) - Audit awal: tidak ada secret asli ter-track (pass).
```

Then replace `| Keputusan arsitektur | [adr/](adr/) (0001–0009) |` with `| Keputusan arsitektur | [adr/](adr/) (0001–0010) |`.

Run: `grep -c -E '^[0-9]+\. \[' internal/docs/README.md` → Expected: `42`.

- [ ] **Step 4: Commit**

```bash
git add internal/docs/adr/0010-per-video-hyperframes-projects.md internal/docs/requirements/rd-02-composition-render.md internal/docs/README.md
git commit -q -F - <<'EOF'
docs: add ADR-0010 and EARS for per-video HyperFrames projects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: `scripts/video.mjs` (TDD)

**Files:**
- Create: `scripts/video.test.mjs`, `scripts/video.mjs`
- Modify: `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `HYPERFRAMES`, `SLUG_RE`, `checkSlug(slug) → slug`, `projectDir(slug, root='.') → string`, `fillTemplate(html, { slug, duration }) → string`, `probeDuration(file, run?) → number`, `resolveDuration({ duration, dir, probe? }) → number`, `scaffold({ slug, root='.', duration, probe? }) → { dir, duration }`, `commandsFor(cmd, slug, { at, blur, root='.' }) → [cmd, args][]`, `main(argv, { run, env, root })`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/video.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HYPERFRAMES, checkSlug, commandsFor, fillTemplate, main, resolveDuration, scaffold } from './video.mjs';

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'video-test-'));
  mkdirSync(join(root, 'templates/dena-video'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-video/index.html'), '<div data-composition-id="dena-__SLUG__" data-duration="__DURATION__"></div><script>t["dena-__SLUG__"]</script>');
  writeFileSync(join(root, 'templates/dena-video/hyperframes.json'), '{"paths":{}}');
  return root;
}

test('checkSlug accepts lowercase slugs and rejects others', () => {
  assert.equal(checkSlug('wfh-2'), 'wfh-2');
  for (const bad of ['', '../x', 'Demo', '-x', 'a b', undefined]) assert.throws(() => checkSlug(bad), /slug/);
});

test('fillTemplate replaces every placeholder', () => {
  assert.equal(fillTemplate('a __SLUG__ __SLUG__ __DURATION__', { slug: 'x', duration: 12.5 }), 'a x x 12.5');
  assert.throws(() => fillTemplate('', { slug: 'x', duration: 0 }), /duration/);
});

test('resolveDuration prefers --duration, then processed.mp4, then 10', () => {
  const root = tempRoot();
  const dir = join(root, 'videos/a');
  mkdirSync(dir, { recursive: true });
  assert.equal(resolveDuration({ duration: '7', dir }), 7);
  assert.equal(resolveDuration({ dir, probe: () => { throw new Error('should not probe'); } }), 10);
  writeFileSync(join(dir, 'processed.mp4'), '');
  assert.equal(resolveDuration({ dir, probe: (f) => { assert.ok(f.endsWith('processed.mp4')); return 54.81; } }), 54.81);
  assert.throws(() => resolveDuration({ duration: '0', dir }), /--duration/);
  rmSync(root, { recursive: true, force: true });
});

test('scaffold creates the project, fills the template, and links vendor', () => {
  const root = tempRoot();
  const { dir, duration } = scaffold({ slug: 'demo', root, duration: '12' });
  assert.equal(duration, 12);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), '<div data-composition-id="dena-demo" data-duration="12"></div><script>t["dena-demo"]</script>');
  assert.equal(readFileSync(join(dir, 'hyperframes.json'), 'utf8'), '{"paths":{}}');
  assert.ok(lstatSync(join(dir, 'compositions/broll')).isDirectory());
  assert.ok(lstatSync(join(dir, 'assets')).isDirectory());
  assert.ok(lstatSync(join(dir, 'vendor')).isSymbolicLink());
  assert.equal(readlinkSync(join(dir, 'vendor')), '../../vendor');
  rmSync(root, { recursive: true, force: true });
});

test('scaffold refuses to overwrite an existing index.html', () => {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '5' });
  writeFileSync(join(root, 'videos/demo/index.html'), 'edited');
  assert.throws(() => scaffold({ slug: 'demo', root, duration: '5' }), /already exists/);
  assert.equal(readFileSync(join(root, 'videos/demo/index.html'), 'utf8'), 'edited');
  rmSync(root, { recursive: true, force: true });
});

test('scaffold keeps existing artifacts and an existing vendor link', () => {
  const root = tempRoot();
  const dir = join(root, 'videos/demo');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), 'brief');
  scaffold({ slug: 'demo', root, duration: '5' });
  rmSync(join(dir, 'index.html'));
  assert.doesNotThrow(() => scaffold({ slug: 'demo', root, duration: '5' }));
  assert.equal(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), 'brief');
  rmSync(root, { recursive: true, force: true });
});

test('commandsFor builds pinned hyperframes calls on videos/<slug>', () => {
  const hf = (...a) => ['npx', ['--yes', HYPERFRAMES, ...a]];
  assert.deepEqual(commandsFor('check', 'demo'), [hf('lint', 'videos/demo'), hf('validate', 'videos/demo'), hf('inspect', 'videos/demo')]);
  assert.deepEqual(commandsFor('dev', 'demo'), [hf('preview', 'videos/demo')]);
  assert.deepEqual(commandsFor('snapshot', 'demo', { at: '1.5,3' }), [hf('snapshot', '--at', '1.5,3', '-o', 'videos/demo/snapshots', 'videos/demo')]);
  assert.deepEqual(commandsFor('render', 'demo'), [hf('render', '--quality', 'high', '-o', 'videos/demo/renders/demo.mp4', 'videos/demo')]);
  assert.deepEqual(commandsFor('render', 'demo', { blur: true }), [['node', ['scripts/render-blur.mjs', '--slug', 'demo', '--project', 'videos/demo']]]);
});

test('commandsFor rejects bad input', () => {
  assert.throws(() => commandsFor('snapshot', 'demo', {}), /--at/);
  assert.throws(() => commandsFor('snapshot', 'demo', { at: '1;rm' }), /--at/);
  assert.throws(() => commandsFor('publish', 'demo'), /unknown command/);
  assert.throws(() => commandsFor('check', '../x'), /slug/);
});

test('main runs commands without GEMINI_API_KEY and stops on failure', () => {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '5' });
  const calls = [];
  main(['check', 'demo'], { root, env: { GEMINI_API_KEY: 'k', PATH: 'p' }, run: (c, a, o) => { calls.push([c, a, o.env]); return { status: 0 }; } });
  assert.equal(calls.length, 3);
  assert.equal(calls[0][2].GEMINI_API_KEY, undefined);
  assert.equal(calls[0][2].PATH, 'p');
  assert.throws(() => main(['check', 'demo'], { root, env: {}, run: () => ({ status: 1 }) }), /exited with 1/);
  rmSync(root, { recursive: true, force: true });
});

test('main refuses to run on a project that does not exist', () => {
  const root = tempRoot();
  assert.throws(() => main(['check', 'ghost'], { root, env: {}, run: () => ({ status: 0 }) }), /npm run video -- new ghost/);
  rmSync(root, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test scripts/video.test.mjs 2>&1 | grep -E 'ERR_MODULE_NOT_FOUND|^ℹ (tests|fail)' | head -3`
Expected: `ERR_MODULE_NOT_FOUND` for `scripts/video.mjs`.

- [ ] **Step 3: Write the script**

Create `scripts/video.mjs`:

```js
#!/usr/bin/env node
// Per-video HyperFrames projects under videos/<slug>/ (ADR-0010).
// Spec: docs/superpowers/specs/2026-09-26-per-video-projects-design.md
// Usage: npm run video -- <new|check|dev|snapshot|render> <slug> [--duration s] [--at t,...] [--blur]
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const HYPERFRAMES = 'hyperframes@0.7.24';
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const TEMPLATE = join('templates', 'dena-video');

export function checkSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) throw new Error('slug must use lowercase letters, digits, and dashes');
  return slug;
}

export const projectDir = (slug, root = '.') => join(root, 'videos', checkSlug(slug));

export function fillTemplate(html, { slug, duration }) {
  if (!(duration > 0)) throw new Error('duration must be > 0');
  return html.replaceAll('__SLUG__', slug).replaceAll('__DURATION__', String(duration));
}

export function probeDuration(file, run = spawnSync) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = Number.parseFloat(r.stdout);
  if (r.status !== 0 || !(d > 0)) throw new Error(`ffprobe could not read the duration of ${file}`);
  return Math.round(d * 1000) / 1000;
}

export function resolveDuration({ duration, dir, probe = probeDuration }) {
  if (duration !== undefined) {
    const d = Number(duration);
    if (!(d > 0)) throw new Error('--duration must be > 0');
    return d;
  }
  const media = join(dir, 'processed.mp4');
  return existsSync(media) ? probe(media) : 10;
}

const hasEntry = (p) => { try { lstatSync(p); return true; } catch { return false; } };

export function scaffold({ slug, root = '.', duration, probe }) {
  const dir = projectDir(slug, root);
  const index = join(dir, 'index.html');
  if (hasEntry(index)) throw new Error(`${index} already exists; refusing to overwrite`);
  mkdirSync(join(dir, 'compositions', 'broll'), { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });
  const d = resolveDuration({ duration, dir, probe });
  const tpl = join(root, TEMPLATE);
  writeFileSync(index, fillTemplate(readFileSync(join(tpl, 'index.html'), 'utf8'), { slug, duration: d }));
  cpSync(join(tpl, 'hyperframes.json'), join(dir, 'hyperframes.json'));
  if (!hasEntry(join(dir, 'vendor'))) symlinkSync('../../vendor', join(dir, 'vendor'));
  return { dir, duration: d };
}

const hf = (...args) => ['npx', ['--yes', HYPERFRAMES, ...args]];

export function commandsFor(cmd, slug, { at, blur = false, root = '.' } = {}) {
  const dir = projectDir(slug, root);
  switch (cmd) {
    case 'check':
      return [hf('lint', dir), hf('validate', dir), hf('inspect', dir)];
    case 'dev':
      return [hf('preview', dir)];
    case 'snapshot':
      if (typeof at !== 'string' || !/^\d+(\.\d+)?(,\d+(\.\d+)?)*$/.test(at)) throw new Error('snapshot needs --at <t,...> in seconds');
      return [hf('snapshot', '--at', at, '-o', join(dir, 'snapshots'), dir)];
    case 'render':
      return blur
        ? [['node', [join(root, 'scripts', 'render-blur.mjs'), '--slug', slug, '--project', dir]]]
        : [hf('render', '--quality', 'high', '-o', join(dir, 'renders', `${slug}.mp4`), dir)];
    default:
      throw new Error(`unknown command "${cmd}" (use new, check, dev, snapshot, render)`);
  }
}

export function main(argv, { run = spawnSync, env = process.env, root = '.' } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { at: { type: 'string' }, blur: { type: 'boolean', default: false }, duration: { type: 'string' } },
  });
  const [cmd, slug] = positionals;
  if (cmd === 'new') {
    const { dir, duration } = scaffold({ slug, root, duration: values.duration });
    console.log(`created ${dir} (${duration} s)`);
    return;
  }
  const cmds = commandsFor(cmd, slug, { at: values.at, blur: values.blur, root });
  const dir = projectDir(slug, root);
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`${join(dir, 'index.html')} not found; run npm run video -- new ${slug}`);
  if (cmd === 'render') mkdirSync(join(dir, 'renders'), { recursive: true });
  const childEnv = { ...env };
  delete childEnv.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  for (const [c, a] of cmds) {
    const r = run(c, a, { stdio: 'inherit', env: childEnv });
    if (r.status !== 0) throw new Error(`${c} ${a.slice(0, 3).join(' ')} exited with ${r.status}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test scripts/video.test.mjs 2>&1 | grep -E '^ℹ (tests|pass|fail)'`
Expected: `ℹ tests 10`, `ℹ pass 10`, `ℹ fail 0`.

- [ ] **Step 5: Wire scripts and CI**

In `package.json` `scripts`, replace `"render:blur": "node scripts/render-blur.mjs"` with:

```json
    "render:blur": "node scripts/render-blur.mjs",
    "video": "node scripts/video.mjs",
    "test:video": "node --test scripts/video.test.mjs"
```

In `.github/workflows/ci.yml`, replace `      - run: npm run test:render-blur` with:

```yaml
      - run: npm run test:render-blur
      - run: npm run test:video
```

- [ ] **Step 6: Commit**

```bash
git add scripts/video.mjs scripts/video.test.mjs package.json .github/workflows/ci.yml
git commit -q -F - <<'EOF'
feat: add npm run video for per-video HyperFrames projects

new scaffolds videos/<slug>/ from the Dena starter (refuses to overwrite,
links vendor); check, dev, snapshot, and render run pinned HyperFrames on
that project without GEMINI_API_KEY.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Dena starter, root template, and end-to-end check

**Files:**
- Create: `templates/dena-video/index.html`, `templates/dena-video/hyperframes.json`
- Rewrite: `index.html`

- [ ] **Step 1: Create the starter project config**

`templates/dena-video/hyperframes.json` = a copy of the root `hyperframes.json`:

```bash
mkdir -p templates/dena-video && cp hyperframes.json templates/dena-video/hyperframes.json
```

- [ ] **Step 2: Create the starter composition**

Create `templates/dena-video/index.html`:

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Dena - __SLUG__</title>
    <script src="vendor/gsap.min.js"></script>
    <script src="vendor/motion-kit/motion-kit.js"></script>
    <link rel="stylesheet" href="vendor/motion-kit/motion-kit.css" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0; width: 1080px; height: 1920px;
        overflow: hidden; background: #000;
        font-family: Arial, Helvetica, sans-serif;
      }
      #root {
        position: relative; width: 1080px; height: 1920px; overflow: hidden;
        --white: #fff; --panel: rgba(5, 5, 5, 0.9);
        --yellow: #facc15; --green: #22c55e;
        --safe-bottom: 270px;
      }
      .clip { position: absolute; }
      /* full-bleed background as a child: a root background can drop out in the producer */
      .bg-fill { position: absolute; inset: 0; z-index: 0; background: #050505; }
      .base-video {
        inset: 0; z-index: 1; width: 100%; height: 100%;
        object-fit: cover; transform-origin: center 40%;
      }
      audio.clip { width: 0; height: 0; opacity: 0; }
      /* inline-block so transforms apply to highlighted words */
      .hl { color: var(--yellow); display: inline-block; }
      .progress-track { top: 0; left: 0; right: 0; height: 4px; z-index: 30; background: rgba(255, 255, 255, 0.12); }
      .progress-fill {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: var(--yellow); opacity: 0.55; transform-origin: left center; transform: scaleX(0);
      }
      .hook-card, .cta-card {
        top: 96px; left: 60px; right: 60px; z-index: 56;
        padding: 26px 30px; text-align: center; text-transform: uppercase; color: var(--white);
        background: var(--panel); border: 3px solid rgba(255, 255, 255, 0.16);
        border-radius: 16px; box-shadow: 0 22px 48px rgba(0, 0, 0, 0.5);
      }
      .cta-card { border-color: rgba(250, 204, 21, 0.5); }
      .hook-card .line, .cta-card .line { display: block; font-size: 52px; font-weight: 950; line-height: 1.14; }
      .hook-card .line.small { font-size: 42px; }
      .proof-chip {
        top: 190px; right: 56px; z-index: 34;
        padding: 12px 24px; border-radius: 999px;
        background: rgba(8, 8, 8, 0.8); border: 2px solid rgba(255, 255, 255, 0.18);
        color: var(--white); font-size: 30px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase;
      }
      .label-card {
        z-index: 36; padding: 10px 22px; border-radius: 12px;
        background: var(--panel); color: var(--white);
        font-size: 25px; font-weight: 950; text-transform: uppercase;
      }
      .label-card.green { background: var(--green); color: #050505; }
      .sticker {
        z-index: 36; padding: 10px 22px; border-radius: 999px;
        background: var(--yellow); color: #121212;
        font-size: 27px; font-weight: 950; letter-spacing: 0.06em; text-transform: uppercase;
        transform: rotate(3deg);
      }
      .caption {
        left: 56px; right: 56px; bottom: var(--safe-bottom); z-index: 45;
        min-height: 116px; color: var(--white); font-size: 58px; font-weight: 950;
        line-height: 1.0; text-align: center; text-transform: uppercase;
        overflow-wrap: anywhere; text-shadow: 0 5px 0 #000, 0 12px 26px rgba(0, 0, 0, 0.72);
        -webkit-text-stroke: 2px #000;
      }
      /* motion b-roll mounts (track 4), below captions and cards */
      .broll { position: absolute; inset: 0; z-index: 22; }
    </style>
  </head>
  <body>
    <main id="root" data-composition-id="dena-__SLUG__"
      data-start="0" data-width="1080" data-height="1920" data-duration="__DURATION__">
      <div class="bg-fill"></div>
      <!-- base media: muted video + separate audio (processed-audio.wav comes from processed.mp4) -->
      <video id="base-video" class="clip base-video" data-start="0" data-duration="__DURATION__" data-track-index="1" src="processed.mp4" muted playsinline></video>
      <audio id="base-audio" class="clip" data-start="0" data-duration="__DURATION__" data-track-index="10" src="processed-audio.wav"></audio>
      <div id="progress" class="clip progress-track" data-start="0" data-duration="__DURATION__" data-track-index="3">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
      <!--
        Add clips below. Patterns:
        - Captions alternate tracks 2 and 8 so neighbours never overlap on one track:
          <div id="cap-001" class="clip caption" data-start="0.02" data-duration="1.3" data-track-index="2">KATA <span class="hl">KUNCI</span></div>
        - Hook card / CTA card on track 5:
          <section id="hook-card" class="clip hook-card" data-start="0" data-duration="3" data-track-index="5"><span class="line">…</span></section>
        - SFX on tracks 11+ (one per track). Never use data-media-start; trim the file instead:
          <audio id="sfx-01" class="clip" data-start="6.9" data-duration="0.6" data-track-index="11" data-volume="0.22" src="assets/sfx/click-soft.mp3"></audio>
        - Motion b-roll mounts on track 4, each with an id (docs/agents/references/motion-broll-authoring.md):
          <div id="broll-01-name-mount" class="broll" data-composition-id="broll-01-name" data-composition-src="compositions/broll/01-name.html"
               data-start="12.4" data-duration="6" data-track-index="4" data-width="1080" data-height="1920"></div>
      -->
    </main>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.to('#progress-fill', { scaleX: 1, duration: __DURATION__, ease: 'none' }, 0);
      // Caption entrance: tl.fromTo('#cap-001', { autoAlpha: 0, y: 16, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.14 }, 0.02);
      // Split treatment: tl.fromTo('#base-video', { y: 0 }, { y: 480, duration: 0.45, ease: 'power3.inOut' }, <clip start>);
      window.__timelines['dena-__SLUG__'] = tl;
    </script>
  </body>
</html>
```

- [ ] **Step 3: Reset the root template**

Replace the whole content of `index.html` with:

```html
<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="vendor/gsap.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        width: 1080px;
        height: 1920px;
        overflow: hidden;
        background: #000;
      }
      body {
        font-family: "Inter", sans-serif;
      }
      code,
      pre,
      .monospace {
        font-family: "JetBrains Mono", monospace;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="10"
      data-width="1080"
      data-height="1920"
    >
      <!--
        Template only. Each video lives in its own project: npm run video -- new <slug>
        (ADR-0010). Add clips here only for template demos. Example:
        <div id="title" class="clip" data-start="0" data-duration="5" data-track-index="1"
             style="font-size: 64px; color: #fff; padding: 40px">
          Hello World
        </div>
      -->
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // Example: tl.from("#title", { opacity: 0, y: -50, duration: 1 }, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
```

Run: `npm run check 2>&1 | grep -v 'Unknown user config' | grep -E '✗|console errors'`
Expected: no `✗` lines (lint, validate, and inspect pass for the template).

- [ ] **Step 4: End-to-end check with a throwaway slug**

```bash
mkdir -p videos/e2e-check
ffmpeg -loglevel error -y -f lavfi -i testsrc=size=1080x1920:rate=30:duration=4 -pix_fmt yuv420p videos/e2e-check/processed.mp4
ffmpeg -loglevel error -y -f lavfi -i sine=frequency=440:duration=4 videos/e2e-check/processed-audio.wav
npm run video -- new e2e-check
npm run video -- new e2e-check; echo "second-new-exit=$?"
npm run video -- check e2e-check 2>&1 | grep -v 'Unknown user config' | grep -E 'error\(s\)|✗|console errors'
npm run video -- snapshot e2e-check --at 1,3 2>&1 | grep -v 'Unknown user config' | grep -E 'saved|Gemini|GEMINI'
npm run video -- render e2e-check 2>&1 | grep -v 'Unknown user config' | tail -2
ffprobe -v error -show_entries format=duration -of csv=p=0 videos/e2e-check/renders/e2e-check.mp4
ffprobe -v error -show_entries stream=codec_type -of csv=p=0 videos/e2e-check/renders/e2e-check.mp4
ls videos/e2e-check/snapshots
git status --short videos
```
Expected:
- first `new` prints `created videos/e2e-check (4 s)` (duration from `ffprobe`);
- second `new` fails with `already exists; refusing to overwrite`, `second-new-exit=1`;
- `check`: no `✗`, no console errors;
- snapshot saves 2 frames and prints `GEMINI_API_KEY not set` (or nothing about Gemini);
- render duration `4.000000` ±0.034, streams `video` and `audio`;
- `snapshots/` has `frame-00-at-1.0s.png`, `frame-01-at-3.0s.png`, a contact sheet;
- `git status --short videos` prints nothing (the project is ignored).

Open `videos/e2e-check/snapshots/contact-sheet.jpg` (Read): the test pattern fills the frame and the yellow progress bar grows at the top. Then remove the throwaway project: `rm -rf videos/e2e-check`.

- [ ] **Step 5: Commit**

```bash
git add templates/dena-video index.html
git commit -q -F - <<'EOF'
feat: add Dena video starter and reset root index.html to the template

templates/dena-video/index.html carries the visual-system layers (base
video track 1, audio track 10, progress, caption/hook/CTA/proof/label/
sticker classes, .broll) with motion-kit loaded. Root index.html is the
HyperFrames blank portrait template with local GSAP. Verified end to end
with a throwaway slug: scaffold, check, snapshot, render (4 s, audio).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Workflow and canon docs

**Files:** `docs/agents/03-build.md`, `docs/agents/references/motion-broll-authoring.md`, `docs/agents/references/hyperframes-assembly.md`, `docs/skills/dena-video-editing-workflow/references/quality-gates.md`, `AGENTS.md`, `CLAUDE.md`, `internal/docs/architecture/data-model.md`, `internal/docs/frontend/composition-implementation.md`, `internal/docs/operations/runbook.md`, `internal/docs/design-system/visual-system.md`, `internal/docs/architecture/stack.md`

- [ ] **Step 1: Build phase**

In `docs/agents/03-build.md`:
- `- \`index.html\` or \`compositions/*.html\` must be created or updated to match the` → `- \`videos/<slug>/index.html\` or \`videos/<slug>/compositions/*.html\` must be created or updated to match the`
- `\`caption-beats.json\`, \`visual-plan.md\`, \`overlay-timeline.json\`. Also: existing\n\`index.html\`, \`compositions/*.html\`, \`meta.json\`, local fonts, textures,` → `\`caption-beats.json\`, \`visual-plan.md\`, \`overlay-timeline.json\`. Also: the video's\nHyperFrames project (\`index.html\`, \`compositions/*.html\` in \`videos/<slug>/\`), local fonts, textures,`
- Insert before the line starting `3. **Load HyperFrames rules.**`:
  ```
  2a. **Scaffold the project.** If `videos/<slug>/index.html` does not exist, run
     `npm run video -- new <slug>` (starter from `templates/dena-video/`, duration
     from `processed.mp4`). All composition work happens in `videos/<slug>/`;
     never edit the root `index.html` for a video (ADR-0010).
  ```
- `Planned file, mount it in \`index.html\` on track 4,` → `Planned file, mount it in \`videos/<slug>/index.html\` on track 4,`
- `5. **Verify.** Run \`npm run check\` and fix every error;` → `5. **Verify.** Run \`npm run video -- check <slug>\` and fix every error;`
- `7. **Render.** \`npm run render -- --output renders/<slug>.mp4\` (or, for a final render with motion blur, \`npm run render:blur -- --slug <slug>\`, which writes \`renders/<slug>-blur.mp4\`), then` → `7. **Render.** \`npm run video -- render <slug>\` (writes \`videos/<slug>/renders/<slug>.mp4\`; add \`--blur\` for a final render with motion blur, which writes \`<slug>-blur.mp4\`), then`
- `- \`index.html\`\n- \`compositions/broll/*.html\` for motion b-roll clips; other \`compositions/*.html\`\n  only when sub-compositions are justified` → `- \`videos/<slug>/index.html\`\n- \`videos/<slug>/compositions/broll/*.html\` for motion b-roll clips; other\n  \`compositions/*.html\` only when sub-compositions are justified`
- `- Render MP4: \`renders/<slug>.mp4\`` → `- Render MP4: \`videos/<slug>/renders/<slug>.mp4\``
- `npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved` → `npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved`

- [ ] **Step 2: Motion b-roll authoring**

In `docs/agents/references/motion-broll-authoring.md`:
- `Once per video, in \`index.html\` \`<head>\`, after \`vendor/gsap.min.js\`:` → `The Dena starter (\`templates/dena-video/index.html\`, copied by \`npm run video -- new <slug>\`) already has this in \`videos/<slug>/index.html\`. For any other host, add it once in \`<head>\`, after \`vendor/gsap.min.js\`:`
- Replace the still-check command block content `env -u GEMINI_API_KEY npx --yes hyperframes@0.7.24 snapshot --at 12.9,13.6,14.8 -o renders/snapshots/<slug> .` with `npm run video -- snapshot <slug> --at 12.9,13.6,14.8`
- `\`env -u GEMINI_API_KEY\` keeps frames on this machine: with the key set, snapshot\nsends frames to Gemini for \`--describe\`.` → `The script removes \`GEMINI_API_KEY\` for the run, so frames stay on this machine\n(with the key set, snapshot sends frames to Gemini for \`--describe\`). Frames land\nin \`videos/<slug>/snapshots/\`.`

- [ ] **Step 3: HyperFrames assembly reference**

In `docs/agents/references/hyperframes-assembly.md`, replace everything from the line `## HTML Skeleton` up to (not including) `## Assembly Notes Format` with:

```markdown
## HTML Skeleton

The canonical skeleton is the Dena starter `templates/dena-video/index.html`.
`npm run video -- new <slug>` copies it to `videos/<slug>/index.html` and fills the
composition id (`dena-<slug>`) and duration. It follows
`internal/docs/design-system/visual-system.md`: base video track 1, base audio
track 10, progress track 3, captions alternating tracks 2 and 8, hook/CTA track 5,
b-roll mounts track 4, SFX tracks 11+, caption z-index 45, hook/CTA 56, `.broll` 22.
Media paths are relative to the project (`processed.mp4`, `processed-audio.wav`,
`assets/...`).

```

Then run `grep -n 'videos/example/' docs/agents/references/hyperframes-assembly.md` and in every remaining match replace `videos/example/` with nothing (paths become project-relative).

- [ ] **Step 4: Quality gates**

In `docs/skills/dena-video-editing-workflow/references/quality-gates.md`:
- In the HyperFrames Gate, replace the fenced command `npm run check` with `npm run video -- check <slug>` (keep the fence).
- `1. Run \`npm run check\`.` → `1. Run \`npm run video -- check <slug>\`.`

- [ ] **Step 5: Entry doors (AGENTS.md and CLAUDE.md, identical edits)**

- `3. \`docs/agents/03-build.md\` — asset production, HyperFrames assembly, \`npm run check\`, render.` → `3. \`docs/agents/03-build.md\` — asset production, HyperFrames assembly in \`videos/<slug>/\`, \`npm run video -- check <slug>\`, render.`
- `- Capturing/generating asset files, editing \`index.html\`, \`compositions/*.html\`,` → `- Capturing/generating asset files, editing \`videos/<slug>/index.html\`, \`videos/<slug>/compositions/*.html\`,`
- `then follow \`docs/agents/03-build.md\`. After editing any \`.html\` composition, run \`npm run check\` before reporting completion.` → `then follow \`docs/agents/03-build.md\`. After editing a video composition, run \`npm run video -- check <slug>\`; after editing the root template, run \`npm run check\`. Do this before reporting completion.`
- In `## Commands`, replace `npm run check:broll-examples   # lint + validate + snapshot motion b-roll examples` with:
  ```
  npm run check:broll-examples   # lint + validate + snapshot motion b-roll examples
  npm run video -- new <slug>    # scaffold videos/<slug>/ from the Dena starter
  npm run video -- check <slug>  # lint + validate + inspect one video project
  npm run video -- dev <slug>    # preview one video project (long-running)
  npm run video -- snapshot <slug> --at 1.5,3  # stills, no Gemini upload
  npm run video -- render <slug> [--blur]      # render to videos/<slug>/renders/
  npm run test:video             # unit test the video CLI
  ```
- `## Project Structure` list: replace `- \`index.html\` — main composition (root timeline)\n- \`compositions/\` — sub-compositions referenced via \`data-composition-src\`` with `- \`index.html\` — HyperFrames blank portrait template (not a video; ADR-0010)\n- \`templates/dena-video/\` — Dena starter copied by \`npm run video -- new <slug>\`\n- \`videos/<slug>/\` — one ignored HyperFrames project per video (\`index.html\`, \`compositions/\`, \`assets/\`, \`renders/\`)\n- \`compositions/\` — sub-compositions for the root template only`
- In `## Linting — ALWAYS RUN AFTER CHANGES`, replace `After creating or editing any \`.html\` composition, **always** run the full check before considering the task complete:` with `After creating or editing a video composition, **always** run \`npm run video -- check <slug>\`; for the root template run the check below. Do this before considering the task complete:`

Run: `diff <(sed -n '/^## Dena Workflow Discipline/,/^Docs-only edits/p' AGENTS.md) <(sed -n '/^## Dena Workflow Discipline/,/^Docs-only edits/p' CLAUDE.md) && echo same` → `same`.

- [ ] **Step 6: Canon docs**

- `internal/docs/architecture/data-model.md`: `| Komposisi | \`index.html\`, \`compositions/*.html\` | HTML+GSAP | Build |` → `| Komposisi video | \`videos/<slug>/index.html\`, \`videos/<slug>/compositions/*.html\` (di-ignore) | HTML+GSAP | Build |`; `## Komposisi HyperFrames (\`index.html\`)` → `## Komposisi HyperFrames (\`videos/<slug>/index.html\`)`.
- `internal/docs/frontend/composition-implementation.md`: replace the whole content with:

```markdown
# Composition Implementation
Status: accepted
Date: 2026-09-26

Kanonik untuk: di mana komposisi video hidup dan bagaimana starter Dena
menyusunnya. Aturan umum ada di
[rd-02](../requirements/rd-02-composition-render.md) dan
[visual-system](../design-system/visual-system.md); keputusan di
[ADR-0010](../adr/0010-per-video-hyperframes-projects.md).

## Tata letak

- `index.html` root: template HyperFrames blank portrait (1080×1920, 10 s, GSAP
  lokal). Bukan video; tidak diubah untuk video.
- Setiap video: proyek HyperFrames di `videos/<slug>/` (di-ignore git):
  `index.html`, `compositions/broll/`, `assets/`, `renders/`, `snapshots/`, dan
  symlink `vendor -> ../../vendor`. Path media relatif terhadap folder itu.
- Dibuat dengan `npm run video -- new <slug>` dari `templates/dena-video/`.

## Starter Dena (`templates/dena-video/index.html`)

- Root `<main id="root" data-composition-id="dena-<slug>" data-start="0"
  data-width="1080" data-height="1920" data-duration="<durasi processed.mp4>">`.
- `.bg-fill` (latar sebagai child), `#base-video` (`processed.mp4`, track 1,
  `muted`), `#base-audio` (`processed-audio.wav`, track 10), `#progress` (track 3).
- Kelas: `.caption` (Arial 950, stroke, z 45), `.hl`, `.hook-card`/`.cta-card`
  (track 5, z 56), `.proof-chip`, `.label-card`, `.sticker`, `.broll` (z 22).
- `motion-kit.js` + `motion-kit.css` sudah dimuat untuk motion b-roll.
- Timeline `window.__timelines["dena-<slug>"]` dengan tween progress sepanjang
  durasi; komentar contoh untuk caption (track 2/8 bergantian), hook/CTA, SFX
  (track 11+, tanpa `data-media-start`), mount b-roll (track 4, `id` wajib),
  dan treatment split.

## Aturan implementasi

- GSAP dan engine dari `vendor/` (lokal), tanpa jaringan saat render.
- `class="clip"` pada elemen ber-waktu; mount sub-composition tanpa `class="clip"`.
- Setelah edit: `npm run video -- check <slug>`; render:
  `npm run video -- render <slug> [--blur]`.

## Referensi

- [design-system/visual-system](../design-system/visual-system.md)
- [requirements/rd-02-composition-render](../requirements/rd-02-composition-render.md)
- [operations/runbook](../operations/runbook.md)
```

- `internal/docs/operations/runbook.md`: replace the code block in `## Loop editing harian` (from `npm run dev      # server preview` through `npm run publish  # link shareable HyperFrames`) with:
  ```
  npm run video -- new <slug>       # proyek video dari starter Dena (sekali per video)
  npm run video -- dev <slug>       # preview (long-running; jalankan di background)
  npm run video -- check <slug>     # lint + validate + inspect — WAJIB setelah tiap edit .html
  npm run video -- snapshot <slug> --at 1.5,3   # still check tanpa upload ke Gemini
  npm run video -- render <slug>    # render → videos/<slug>/renders/<slug>.mp4
  npm run video -- render <slug> --blur  # opsional: render final dengan motion blur (4× lebih lama)
  npm run check                     # hanya untuk template root index.html
  ```
  and replace `npm run repliz:publish -- --slug videos/<slug> --file renders/final.mp4 --approved` with `npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved`; replace `- Preview blank / render gagal setelah clone → cek media lokal yang dirujuk\n  \`index.html\` sudah ada.` with `- Preview blank / render gagal setelah clone → cek media lokal yang dirujuk\n  \`videos/<slug>/index.html\` sudah ada (proyek video tidak ikut ter-clone).`; replace `- \`npm run check\` error → perbaiki semua error sebelum handoff/render.` with `- \`npm run video -- check <slug>\` error → perbaiki semua error sebelum handoff/render.`; in `## Test` add after the `test:render-blur` line: `npm run test:video          # node --test scripts/video.test.mjs`.
- `internal/docs/design-system/visual-system.md`: `caption, layer/track, z-index, safe area). Diturunkan dari \`index.html\` +` → `caption, layer/track, z-index, safe area). Diturunkan dari starter \`templates/dena-video/index.html\` +`; `- Variabel CSS root komposisi (dari \`index.html\`):` → `- Variabel CSS root komposisi (starter \`templates/dena-video/index.html\`; nilai lama dari komposisi video sebelumnya):`; `- Engine \`vendor/motion-kit/\` dimuat sekali di \`index.html\`; setiap clip adalah\n  sub-composition \`compositions/broll/*.html\`` → `- Engine \`vendor/motion-kit/\` dimuat sekali di \`videos/<slug>/index.html\` (starter); setiap clip adalah\n  sub-composition \`videos/<slug>/compositions/broll/*.html\``.
- `internal/docs/architecture/stack.md`: in the row starting `| GSAP |`, replace `di-\`<script>\` di \`index.html\`` with `di-\`<script>\` di template/starter dan tiap \`videos/<slug>/index.html\``; insert after the row starting `| render-blur |`: `| video CLI | Scaffold + jalankan proyek HyperFrames per video | \`npm run video -- new\|check\|dev\|snapshot\|render <slug>\` | \`scripts/video.mjs\` |`

- [ ] **Step 7: Check for stale paths**

Run: `grep -rn -E "npm run render -- --output|renders/<slug>(-blur)?\.mp4|--file renders/final|--file <render\.mp4>" docs/agents docs/skills AGENTS.md CLAUDE.md internal/docs/operations internal/docs/frontend; echo "exit=$?"`
Expected: every `renders/<slug>` match is preceded by `videos/<slug>/`; there is no `npm run render -- --output`, no `--file renders/final`, and no bare `--file <render.mp4>`.

- [ ] **Step 8: Commit**

```bash
git add docs/agents docs/skills AGENTS.md CLAUDE.md internal/docs
git commit -q -F - <<'EOF'
docs: point Build, authoring, and entry doors at per-video projects

Compositions are scaffolded with npm run video -- new and checked,
snapshotted, and rendered inside videos/<slug>/; the assembly skeleton
now points at the Dena starter; composition-implementation describes the
starter and layout; publish uses videos/<slug>/renders/<slug>.mp4.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Final verification

- [ ] **Step 1: Run everything**

```bash
npm run test:repliz 2>&1 | grep -E '^ℹ (pass|fail)'
npm run test:motion-kit 2>&1 | grep -E '^ℹ (pass|fail)'
npm run test:render-blur 2>&1 | grep -E '^ℹ (pass|fail)'
npm run test:video 2>&1 | grep -E '^ℹ (pass|fail)'
npm run check 2>&1 | grep -v 'Unknown user config' | grep -E '✗|error\(s\)'
npm run check:broll-examples 2>&1 | grep -v 'Unknown user config' | grep -E 'console errors|snapshots:'
python3 .codex/hooks/ensure-learning-docs.py --self-test
git status --short
```
Expected: `fail 0` four times; root check without `✗`; examples check ends with the snapshots line; hook self-test passes; clean tree.

- [ ] **Step 2: Report**

Report: commits on `feat/per-video-projects`, test counts, the end-to-end results from Task 3 Step 4, the reset root `index.html`, and that the branch is not merged or pushed.
