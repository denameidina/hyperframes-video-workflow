# Music-Driven Generate Formats (kinetic-post, motion-short) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate mode gains two unnarrated formats, kinetic-post and motion-short, whose time base is a music track cut on whole bars, with two gates (text + music + storyboard, then render), from the CLI and from the Studio Generate tab.

**Architecture:** A `format` field (`explainer` | `kinetic-post` | `motion-short`) in `creative-brief.md` drives everything through one helper module `scripts/lib/formats.mjs`. A new command `npm run video -- music` analyses a catalog track once with a small librosa sidecar run through `uv` (cached per sha256), cuts whole bars from a downbeat into `processed-audio.wav`, and writes `beats.json`. `scripts/lib/gates.mjs` becomes format-aware (two gates for the music formats), and Studio's form, detail, and panel follow the format.

**Tech Stack:** Node 22+ built-ins, `node:test`; Python 3.12 via `uv` with `librosa==1.0.0` + `soundfile==0.14.0` (sidecar only); ffmpeg; plain browser JS.

**Spec:** `docs/superpowers/specs/2026-09-29-music-formats-design.md` (approved 2026-09-29).

## Global Constraints

- Node 22+, built-in modules only in `scripts/` (ADR-0007). The analyzer is a Python sidecar run through `uv run --python 3.12 --with librosa==1.0.0 --with soundfile==0.14.0` (pattern of Supertonic, ADR-0023); nothing is installed into the repo.
- Formats, exactly: `explainer`, `kinetic-post`, `motion-short`. No `format` line in `creative-brief.md` = `explainer`.
- Durations, exactly: explainer 30–90 s, kinetic-post 8–20 s, motion-short 15–40 s.
- Gates: explainer 3 (unchanged); kinetic-post / motion-short 2 — Gate 1 fingerprints `script.md`, `processed-audio.wav`, every `preview/storyboard-sheet*.jpg`, `storyboard.md`; Gate 2 fingerprints `renders/<slug>.mp4`. `qa` and the "video selesai; jangan publish" message belong to the last gate of the format.
- Music cut: start at the first downbeat ≥ `--from`, exactly `--bars` bars, −16 LUFS (the `LOUDNESS` target in `scripts/lib/cut-plan.mjs`), 48 kHz stereo; kinetic-post 20 ms fades at both ends (loop seam on a bar line); motion-short 20 ms fade-in and a fade-out over its last bar. Meter assumed 4/4 and written to `beats.json`.
- Studio "Teks persis": optional, at most 1000 characters, music formats only; voice preset: explainer only.
- Documentation-First: every commit touching `scripts/` or `docs/agents/` stages a doc under `internal/docs/`, `AGENTS.md`, or `CLAUDE.md`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `feat/music-formats`.
- Tests never run real `uv`, ffmpeg, tmux, or network; inject `run` / `spawnImpl` / `now`. File edits in scripts read the file before writing it (never `open(p, 'w').write(open(p).read() …)`).
- Never publish, upload, or call Repliz.

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/lib/formats.mjs` (new) | `FORMATS`, `DURATION`, `isMusicFormat`, `finalGate`, `checkFormat`, `readFormat`. |
| `scripts/lib/gates.mjs` | Format-aware positions, fingerprints, final gate, `qa` / `edit` rules. |
| `scripts/lib/generate.mjs` | `briefStub(slug, format)`, `musicStarter(html)`, `video voice` refuses music formats. |
| `scripts/lib/bgm.mjs` | `video bgm` refuses music formats. |
| `scripts/lib/music/beats.py` (new) | librosa sidecar: tempo, beats, 4/4 downbeats, energy per beat → JSON on stdout. |
| `scripts/lib/music/cut.mjs` (new) | `analyzeTrack` (cache), `planCut`, `musicArgs`, `runMusic` → `processed-audio.wav` + `beats.json`. |
| `scripts/video.mjs` | `new --format`, `music` command. |
| `scripts/lib/storyboard.mjs` | Tile text = row `text` when present. |
| `scripts/music-cut.test.mjs` (new) | Tests for `cut.mjs` and `video music`. |
| `scripts/generate-gates.test.mjs`, `scripts/generate.test.mjs` | Format tests (gates, scaffold, refusals, storyboard text). |
| `scripts/studio/generate.mjs`, `scripts/studio/agent.mjs`, `scripts/studio/app.mjs` | Form validation per format, scaffold with format, prompt, detail (`format`, `beats`, lines, bars), final-gate messages, refusals. |
| `scripts/studio/public/index.html`, `generate.js` | Format select, Teks persis, panel per format. |
| `scripts/studio.test.mjs` | Studio format tests. |
| Docs | ADR-0027; RD-03-94…99; RD-06-29…32; RD-05-30…33; `generate-mode.md`, `qa-checklist.md`, `01/02/03`, SKILL router + handoff; `data-model.md`; `CLAUDE.md`, `AGENTS.md`; `internal/docs/README.md`, `entrypoints/rd.md`. |

---

### Task 1: Formats, format-aware gates, scaffold, and refusals

**Files:**
- Create: `scripts/lib/formats.mjs`
- Modify: `scripts/lib/gates.mjs`, `scripts/lib/generate.mjs`, `scripts/lib/bgm.mjs`, `scripts/video.mjs`, `templates/dena-generate/index.html` (one comment line)
- Modify: `scripts/generate-gates.test.mjs`, `scripts/generate.test.mjs`
- Create: `internal/docs/adr/0027-music-formats.md`
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md` (RD-03-94…96), `internal/docs/requirements/rd-06-audio.md` (RD-06-29), `internal/docs/README.md`, `internal/docs/architecture/data-model.md`

**Interfaces:**
- Produces (`scripts/lib/formats.mjs`): `FORMATS: string[]`; `DURATION: { [format]: [min, max] }`; `isMusicFormat(format) → boolean`; `finalGate(format) → 2|3`; `checkFormat(format, where?) → format` (throws `Error` `"<where>: "<x>" is not one of explainer, kinetic-post, motion-short"`); `readFormat(dir) → format`.
- Produces (`gates.mjs`): `gateStatus` result gains `format` and `finalGate`; `gateFiles(dir, gate, slug?, format?)`, `fingerprint(dir, gate, slug?, format?)`.
- Produces (`generate.mjs`): `briefStub(slug, format = 'explainer')`, `musicStarter(html) → html`.
- Produces (`video.mjs`): `scaffold({ …, format })`; CLI `new <slug> --generate [--format <f>]`.

- [ ] **Step 1: Write the failing tests**

In `scripts/generate-gates.test.mjs`:

1. Extend imports: add `import { DURATION, finalGate, readFormat } from './lib/formats.mjs';` and add `gateFiles` is not needed.
2. Change the `project` helper's signature and brief line to take a format:

```js
function project(slug = 'demo', { generate = true, format } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gates-'));
  const dir = join(root, 'videos', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), generate ? briefStub(slug, format) : '# Creative Brief\n\n- gate_cut: off\n');
```

(the rest of `project` is unchanged).

3. Append:

```js
test('a music-driven format walks story -> screen-plan -> Gate 1 (text + music + storyboard) -> build -> Gate 2 -> done', () => {
  const { dir, put } = project('post', { format: 'kinetic-post' });
  const code = (fn) => { try { fn(); return 'ok'; } catch (e) { return e.code; } };
  assert.deepEqual(status(dir), ['story', null, null]);
  put('script.md', 'BUKAN\nAI-NYA\n', 1000);
  put('processed-audio.wav', 'M', 1001);
  assert.deepEqual(status(dir), ['screen-plan', null, null]);
  put('preview/storyboard-sheet.jpg', 'S');
  put('storyboard.md', '| 1 | 1 | 0:00 | BUKAN |');
  assert.deepEqual(status(dir), ['gate', 1, 'waiting']);
  const s = gateStatus(dir);
  assert.deepEqual([s.format, s.finalGate, s.voiceStale], ['kinetic-post', 2, false]);
  assert.deepEqual(Object.keys(s.fingerprint).sort(), ['preview/storyboard-sheet.jpg', 'processed-audio.wav', 'script.md', 'storyboard.md']);
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'qa', by: 'cli', now })), 'bad-decision');
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'edit', by: 'studio', now })), 'bad-decision');
  recordDecision(dir, { gate: 1, decision: 'approve', by: 'studio', now });
  assert.deepEqual(status(dir), ['build', null, null]);
  put('renders/post.mp4', 'R');
  assert.deepEqual(status(dir), ['gate', 2, 'waiting']);
  recordDecision(dir, { gate: 2, decision: 'qa', by: 'studio', now });
  assert.deepEqual(status(dir), ['gate', 2, 'qa']);
  recordDecision(dir, { gate: 2, decision: 'approve', by: 'studio', now });
  assert.deepEqual(status(dir), ['done', null, null]);
  assert.equal(code(() => fingerprint(dir, 3)), 'bad-gate');
  put('storyboard.md', 'changed');
  assert.deepEqual(status(dir), ['gate', 1, 'waiting'], 'a new storyboard reopens Gate 1');
  assert.match(formatGateStatus(gateStatus(dir), 'post'), /^\[kinetic-post\] Gate 1: menunggu keputusan/);
});

test('formats: durations, final gates, readFormat default and errors', () => {
  assert.deepEqual([DURATION.explainer, DURATION['kinetic-post'], DURATION['motion-short']], [[30, 90], [8, 20], [15, 40]]);
  assert.deepEqual([finalGate('explainer'), finalGate('kinetic-post'), finalGate('motion-short')], [3, 2, 2]);
  const { dir } = project('x');
  assert.equal(readFormat(dir), 'explainer');
  assert.equal(gateStatus(dir).finalGate, 3);
  writeFileSync(join(dir, 'creative-brief.md'), '# B\n\n## Workflow Settings\n\n- mode: generate\n');
  assert.equal(readFormat(dir), 'explainer', 'no format line: a project made before ADR-0027');
  writeFileSync(join(dir, 'creative-brief.md'), '# B\n\n- mode: generate\n- format: reel\n');
  assert.throws(() => readFormat(dir), /creative-brief\.md: "reel" is not one of explainer, kinetic-post, motion-short/);
  assert.throws(() => gateStatus(dir), (e) => e.code === 'bad-file');
});
```

In `scripts/generate.test.mjs`, append:

```js
test('new --generate --format: the brief names the format; a music format has no separate bgm element', () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'post', root, generate: true, format: 'kinetic-post' });
  assert.match(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), /^- format: kinetic-post$/m);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /bgm\.wav|bgm-audio/);
  assert.match(html, /src="processed-audio\.wav"/);
  assert.match(html, /npm run video -- music/);
  const ex = scaffold({ slug: 'ex', root, generate: true });
  assert.match(readFileSync(join(ex.dir, 'creative-brief.md'), 'utf8'), /^- format: explainer$/m);
  assert.match(readFileSync(join(ex.dir, 'index.html'), 'utf8'), /src="bgm\.wav"/);
  assert.throws(() => scaffold({ slug: 'bad', root, generate: true, format: 'reel' }), /"reel" is not one of/);
  assert.equal(existsSync(join(root, 'videos/bad')), false, 'a bad format creates nothing');
  assert.throws(() => scaffold({ slug: 'edit', root, format: 'kinetic-post' }), /--format needs --generate/);
  main(['new', 'short', '--generate', '--format', 'motion-short'], { root });
  assert.match(readFileSync(join(root, 'videos/short/creative-brief.md'), 'utf8'), /^- format: motion-short$/m);
});

test('video voice and video bgm refuse a music-driven project', async () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'post', root, generate: true, format: 'kinetic-post' });
  writeFileSync(join(dir, 'script.md'), 'BUKAN\n');
  await assert.rejects(main(['voice', 'post'], { root, env: {}, run: fakeMedia().run }), /kinetic-post project: it has no narration/);
  assert.throws(() => main(['bgm', 'post', '--track', 'm01-calm'], { root, env: {}, run: fakeMedia().run }), /kinetic-post project: the music is its only audio/);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npm run test:video`
Expected: FAIL (`Cannot find module '.../scripts/lib/formats.mjs'`).

- [ ] **Step 3: Write `scripts/lib/formats.mjs`**

```js
// Generate-mode formats (ADR-0025, ADR-0027): explainer (narrated; the TTS voiceover is the time base) and the
// music-driven kinetic-post and motion-short (the cut music is the time base). Node 22+ built-ins (ADR-0007).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FORMATS = ['explainer', 'kinetic-post', 'motion-short'];
export const DURATION = { explainer: [30, 90], 'kinetic-post': [8, 20], 'motion-short': [15, 40] };
export const isMusicFormat = (format) => format === 'kinetic-post' || format === 'motion-short';
export const finalGate = (format) => (isMusicFormat(format) ? 2 : 3);

export function checkFormat(format, where = 'format') {
  if (!FORMATS.includes(format)) throw new Error(`${where}: "${format}" is not one of ${FORMATS.join(', ')}`);
  return format;
}

// "- format: <name>" under Workflow Settings; no line = explainer (projects made before ADR-0027)
export function readFormat(dir) {
  const file = join(dir, 'creative-brief.md');
  if (!existsSync(file)) return 'explainer';
  const m = /^\s*-\s*format:\s*(\S+)\s*$/m.exec(readFileSync(file, 'utf8'));
  return m ? checkFormat(m[1], file) : 'explainer';
}
```

- [ ] **Step 4: Make `scripts/lib/gates.mjs` format-aware**

1. Add the import: `import { finalGate, isMusicFormat, readFormat } from './formats.mjs';`
2. Replace `gateFiles` and `fingerprint` with:

```js
// The files a gate approves (RD-03-89, RD-03-95). visual-plan.md is left out on purpose: the agent writes
// "## Gate 2 Result" into it after the approval, which would reopen the gate.
export function gateFiles(dir, gate, slug = basename(dir), format = readFormat(dir)) {
  if (isMusicFormat(format)) {
    if (gate === 1) return ['script.md', 'processed-audio.wav', ...sheetsOf(dir), 'storyboard.md'];
    if (gate === 2) return [`renders/${slug}.mp4`];
    throw new GateError('bad-gate', `a ${format} project has Gate 1 and Gate 2 (got ${gate})`);
  }
  if (gate === 1) return ['script.md', 'processed-audio.wav'];
  if (gate === 2) return [...sheetsOf(dir), 'storyboard.md'];
  if (gate === 3) return [`renders/${slug}.mp4`];
  throw new GateError('bad-gate', `gate must be 1, 2, or 3 (got ${gate})`);
}

export function fingerprint(dir, gate, slug = basename(dir), format = readFormat(dir)) {
  return Object.fromEntries(gateFiles(dir, gate, slug, format).filter((f) => existsSync(join(dir, f))).map((f) => [f, sha(join(dir, f))]));
}
```

3. Replace the whole `gateStatus` function with:

```js
export function gateStatus(dir, { slug = basename(dir) } = {}) {
  const { log } = readGates(dir);
  const generate = isGenerate(dir);
  let format = 'explainer';
  if (generate) {
    try {
      format = readFormat(dir);
    } catch (e) {
      throw new GateError('bad-file', e.message);
    }
  }
  const base = { mode: generate ? 'generate' : 'edit', format, finalGate: finalGate(format), log };
  const running = (phase) => ({ ...base, phase, gate: null, state: null, voiceStale: false, fingerprint: null, last: log.at(-1) || null });
  if (base.mode !== 'generate') return running(null);
  const has = (f) => existsSync(join(dir, f));
  // null when the gate is approved for the files on disk now; otherwise the waiting status
  const at = (gate) => {
    const fp = fingerprint(dir, gate, slug, format);
    const mine = log.filter((e) => e.gate === gate && e.decision !== 'edit' && sameFingerprint(e.fingerprint, fp));
    const last = mine.at(-1);
    if (last?.decision === 'approve') return null;
    const state = !last ? 'waiting' : last.decision === 'revise' ? 'revising' : 'qa';
    const voiceStale = format === 'explainer' && gate === 1 && statSync(join(dir, 'script.md')).mtimeMs > statSync(join(dir, 'processed-audio.wav')).mtimeMs;
    return { ...base, phase: 'gate', gate, state, voiceStale, fingerprint: fp, last: log.filter((e) => e.gate === gate).at(-1) || null };
  };
  if (!has('script.md') || !has('processed-audio.wav')) return running('story');
  if (isMusicFormat(format)) {
    // kinetic-post, motion-short: text + music + storyboard are one gate, the render the other (ADR-0027)
    if (!sheetsOf(dir).length) return running('screen-plan');
    const g1 = at(1);
    if (g1) return g1;
    if (!has(`renders/${slug}.mp4`)) return running('build');
    return at(2) || running('done');
  }
  const g1 = at(1);
  if (g1) return g1;
  if (!sheetsOf(dir).length) return running('screen-plan');
  const g2 = at(2);
  if (g2) return g2;
  if (!has(`renders/${slug}.mp4`)) return running('build');
  return at(3) || running('done');
}
```

4. In `recordDecision`, replace the two lines

```js
  if (decision === 'qa' && gate !== 3) throw new GateError('bad-decision', 'qa is a Gate 3 decision only');
  if (decision === 'edit' && gate !== 1) throw new GateError('bad-decision', 'edit is a Gate 1 entry only');
```

with

```js
  let format;
  try {
    format = readFormat(dir);
  } catch (e) {
    throw new GateError('bad-file', e.message);
  }
  const last = finalGate(format);
  if (decision === 'qa' && gate !== last) throw new GateError('bad-decision', `qa is a Gate ${last} decision only`);
  if (decision === 'edit' && (gate !== 1 || isMusicFormat(format))) throw new GateError('bad-decision', 'edit is an explainer Gate 1 entry only');
```

5. In `formatGateStatus`, replace the line starting `const lines = [` with:

```js
  const head = s.phase === 'gate' ? `Gate ${s.gate}: ${STATE_TEXT[s.state]}` : PHASE_TEXT[s.phase];
  const lines = [isMusicFormat(s.format) ? `[${s.format}] ${head}` : head];
```

- [ ] **Step 5: Brief stub, music starter, scaffold, CLI, refusals**

In `scripts/lib/generate.mjs`:

1. Replace `briefStub` with:

```js
export const briefStub = (slug, format = 'explainer') => `# Creative Brief - ${slug}

## Workflow Settings

- mode: generate
- format: ${format}
- visual_density: medium

<!-- Story (mode generate) fills the rest from the Brief Template in docs/agents/references/generate-mode.md. -->
`;
```

2. Add after `briefStub`:

```js
const BGM_TAG = /\n[ \t]*<audio id="bgm-audio"[^>]*><\/audio>/;
const AUDIO_NOTE = '<!-- voiceover from npm run video -- voice (processed-audio.wav) and ducked music from npm run video -- bgm (bgm.wav) -->';

// A music-driven format has one audio track: the cut music in processed-audio.wav (ADR-0027, RD-03-96).
// Test roots with a minimal starter pass through unchanged; the real starter is checked in scripts/generate.test.mjs.
export const musicStarter = (html) => html.replace(BGM_TAG, '').replace(AUDIO_NOTE, '<!-- music from npm run video -- music (processed-audio.wav): the time base of a music-driven format (ADR-0027) -->');
```

In `templates/dena-generate/index.html`, change the comment line `npm run video -- voice rewrites data-duration on every element marked data-voice-duration.` to `npm run video -- voice (explainer) or music (kinetic-post, motion-short) rewrites data-duration on every element marked data-voice-duration.`

3. Import `isMusicFormat, readFormat` from `./formats.mjs`, and in `voiceStep`, directly after the `if (!isGenerate(dir) || …) { throw … }` block, add:

```js
  const format = readFormat(dir);
  if (isMusicFormat(format)) throw new Error(`${dir} is a ${format} project: it has no narration; cut its music with npm run video -- music <slug> --track <id> --bars <n>`);
```

In `scripts/lib/bgm.mjs`, import `isMusicFormat, readFormat` from `./formats.mjs` and make these the first two lines of `runBgm`:

```js
  const format = readFormat(dir);
  if (isMusicFormat(format)) throw new Error(`${dir} is a ${format} project: the music is its only audio; use npm run video -- music <slug> --track <id> --bars <n>`);
```

In `scripts/video.mjs`:

1. Import: change `import { GENERATE_TEMPLATE, briefStub, voiceStep } from './lib/generate.mjs';` to `import { GENERATE_TEMPLATE, briefStub, musicStarter, voiceStep } from './lib/generate.mjs';` and add `import { checkFormat, isMusicFormat } from './lib/formats.mjs';`.
2. Usage comment: change the `new <slug> --generate` line to `//        npm run video -- new <slug> --generate [--format explainer|kinetic-post|motion-short]   (generate mode: templates/dena-generate, research/, brief stub)`.
3. Replace `scaffold` with:

```js
export function scaffold({ slug, root = '.', duration, probe, generate = false, format }) {
  if (format !== undefined && !generate) throw new Error('--format needs --generate (formats belong to generate mode)');
  const fmt = generate ? checkFormat(format ?? 'explainer') : null; // before anything is created
  const dir = projectDir(slug, root);
  if (generate && hasEntry(dir)) throw new Error(`${dir} already exists; generate mode starts a new project`);
  const index = join(dir, 'index.html');
  if (hasEntry(index)) throw new Error(`${index} already exists; refusing to overwrite`);
  mkdirSync(join(dir, 'compositions', 'broll'), { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });
  mkdirSync(join(dir, SOURCES_DIR), { recursive: true });
  if (!hasEntry(join(dir, 'sources.json'))) writeManifest(dir, { version: 1, sources: [] });
  if (generate) {
    mkdirSync(join(dir, 'research'), { recursive: true });
    writeFileSync(join(dir, 'creative-brief.md'), briefStub(slug, fmt));
  }
  const d = resolveDuration({ duration, dir, probe, media: generate ? 'processed-audio.wav' : 'processed.mp4' });
  const tpl = join(root, generate ? GENERATE_TEMPLATE : TEMPLATE);
  const html = fillTemplate(readFileSync(join(tpl, 'index.html'), 'utf8'), { slug, duration: d });
  writeFileSync(index, generate && isMusicFormat(fmt) ? musicStarter(html) : html);
  cpSync(join(tpl, 'hyperframes.json'), join(dir, 'hyperframes.json'));
  if (!hasEntry(join(dir, 'vendor'))) symlinkSync('../../vendor', join(dir, 'vendor'));
  return { dir, duration: d, format: fmt };
}
```

4. In `main`'s `parseArgs` options add `format: { type: 'string' }, bars: { type: 'string' },` (bars is used in Task 2).
5. Replace the `new` branch with:

```js
  if (cmd === 'new') {
    const { dir, duration, format } = scaffold({ slug, root, duration: values.duration, generate: values.generate, format: values.format });
    console.log(`created ${dir} (${duration} s${values.generate ? `, generate mode, ${format}` : ''})`);
    return;
  }
```

- [ ] **Step 6: Run to see them pass**

Run: `npm run test:video`
Expected: all pass (64 previous + 4 new = 68).

- [ ] **Step 7: Docs**

Create `internal/docs/adr/0027-music-formats.md`:

```md
# ADR-0027 Mode generate: format tanpa narasi (kinetic-post, motion-short)
Status: accepted
Date: 2026-09-29

## Context

Mode generate (ADR-0025) hanya punya format explainer: naskah + TTS sebagai sumbu waktu,
tiga gate. Dekomposisi induk menjadwalkan format tanpa narasi yang timing-nya dari beat
musik: tipografi kinetik pendek dan motion graphic pendek untuk IG/TikTok.

## Decision

- **`format` di `creative-brief.md`** (`explainer` | `kinetic-post` | `motion-short`;
  tanpa baris = explainer). `scripts/lib/formats.mjs` memegang daftar, rentang durasi
  (30–90 / 8–20 / 15–40 detik), dan gate terakhir per format.
- **Musik sebagai sumbu waktu.** `npm run video -- music` menganalisis lagu katalog sekali
  (sidecar librosa lewat `uv`, di-cache per sha256), memotong bar utuh dari downbeat ke
  `processed-audio.wav` (−16 LUFS), dan menulis `beats.json` (BPM, beat, downbeat 4/4, bar).
  Tanpa TTS, tanpa BGM terpisah, tanpa ducking.
- **Dua gate**: Gate 1 = teks layar + musik + storyboard; Gate 2 = render. `gates.mjs`
  format-aware; `qa` dan pesan "jangan publish" di gate terakhir format.
- **Teks ditulis agent, bisa dikunci** lewat "Teks persis" di form Studio.
- **Akhir**: kinetic-post loop mulus (CTA di caption publish); motion-short kartu CTA di bar
  terakhir.
- Analyzer ditulis sendiri: skill upstream `/music-to-video` tidak membawa berkas lisensi.

## Consequences

- Proyek lama (tanpa baris `format`) tetap explainer.
- `video voice` / `video bgm` menolak format musik; `video music` menolak explainer.
- Birama diasumsikan 4/4 (tercatat di `beats.json`); lagu bervokal di luar cakupan.

## Alternatives

- **Workflow upstream `/music-to-video`**: di luar workflow 4 fase, style kit, gate, dan
  panel Studio.
- **"Explainer bisu" tiga gate**: bertentangan dengan pilihan dua gate dan memaksa langkah
  suara yang tidak ada.
```

In `internal/docs/requirements/rd-03-video-editing-workflow.md`, after the RD-03-93 bullet, add:

```md
- **RD-03-94** (Ubiquitous) — Mode generate shall membaca `- format:` di
  `creative-brief.md` (`explainer`, `kinetic-post`, `motion-short`; tanpa baris =
  `explainer`); nilai lain menghasilkan error yang menyebut `creative-brief.md` (ADR-0027).
- **RD-03-95** (State-driven) — While format-nya `kinetic-post` atau `motion-short`, the
  system shall memakai dua gate: Gate 1 (sidik jari `script.md`, `processed-audio.wav`,
  semua storyboard sheet, `storyboard.md`) dan Gate 2 (render), dengan urutan `story` →
  `screen-plan` → Gate 1 → `build` → Gate 2 → `done`; `qa` hanya di Gate 2 dan entri `edit`
  tidak berlaku.
- **RD-03-96** (Event-driven) — When `npm run video -- new <slug> --generate --format <f>`
  dijalankan, the CLI shall menulis `- format: <f>` di brief stub dan, untuk format musik,
  starter tanpa elemen `bgm-audio`; format tak dikenal atau `--format` tanpa `--generate`
  gagal sebelum ada berkas yang dibuat.
```

In `internal/docs/requirements/rd-06-audio.md`, after the last RD-06 bullet, add:

```md
- **RD-06-29** (Unwanted) — If proyeknya berformat `kinetic-post` atau `motion-short`, then
  `video voice` dan `video bgm` shall gagal dengan pesan yang menyebut
  `npm run video -- music` (ADR-0027).
```

In `internal/docs/README.md`, after the line starting `50. [adr/0026-studio-generate.md]`, add
`51. [adr/0027-music-formats.md](adr/0027-music-formats.md) - Format generate tanpa narasi (kinetic-post, motion-short): musik sebagai sumbu waktu (video music + beats.json), dua gate.`
and renumber every later numbered entry by +1 (read the file, change the lines, write it back); change `(0001–0026)` to `(0001–0027)`.

In `internal/docs/architecture/data-model.md`, in `## Mode generate (ADR-0025)`, change the first bullet's text `` `creative-brief.md` `## Workflow Settings` `mode: generate` (default `edit`); `` to `` `creative-brief.md` `## Workflow Settings` `mode: generate` (default `edit`) dan `format: explainer | kinetic-post | motion-short` (tanpa baris = explainer, ADR-0027); ``.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/formats.mjs scripts/lib/gates.mjs scripts/lib/generate.mjs scripts/lib/bgm.mjs scripts/video.mjs templates/dena-generate/index.html scripts/generate-gates.test.mjs scripts/generate.test.mjs internal/docs/adr/0027-music-formats.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/requirements/rd-06-audio.md internal/docs/README.md internal/docs/architecture/data-model.md
git commit -m "feat(generate): kinetic-post and motion-short formats: two gates, starter without bgm (ADR-0027, RD-03-94..96)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Beat analyzer and `npm run video -- music`

**Files:**
- Create: `scripts/lib/music/beats.py`, `scripts/lib/music/cut.mjs`, `scripts/music-cut.test.mjs`
- Modify: `scripts/video.mjs`, `package.json` (`test:video`)
- Modify: `internal/docs/requirements/rd-06-audio.md` (RD-06-30…32), `internal/docs/architecture/data-model.md`, `CLAUDE.md`, `AGENTS.md`

**Interfaces:**
- Consumes: `DURATION`, `isMusicFormat`, `readFormat` (Task 1); `isGenerate` (`gates.mjs`); `syncDuration` (`lib/generate.mjs`); `LOUDNESS`, `gainDb`, `loudnessArgs`, `parseLoudnorm` (`cut-plan.mjs`); `LICENSES`, `MUSIC_DIR`, `checkCatalog`, `findTrack`, `readCatalog` (`music.mjs`); `exec` (`voice/exec.mjs`); `writeJson` (`voice/render.mjs`).
- Produces (`scripts/lib/music/cut.mjs`): `ANALYZER`, `EDGE_FADE`, `analyzerArgs(file)`, `barLength(bpm)`, `analyzeTrack({ root, track, run }) → analysis`, `barsHint(bpm, format) → string`, `planCut({ analysis, from, bars, format }) → { start, end, duration, loop, beats, downbeats, barList }`, `musicArgs({ track, start, duration, loop, bar, gain, out }) → string[]`, `runMusic({ dir, root, trackId, from, bars, run }) → beats.json object`.
- `beats.json`: `{ version: 1, track, file, sha256, meter, bpm, from, bars, duration, loop, beats, downbeats, barList: [{ n, start, end, energy }] }`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/music-cut.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { analyzerArgs, barsHint, musicArgs, planCut } from './lib/music/cut.mjs';
import { main, scaffold } from './video.mjs';

const REPO = process.cwd();
// 120 BPM: a beat every 0.5 s, a bar every 2 s; downbeats on 0.5, 2.5, ...; the first beat of each bar is loud
const ANALYSIS = {
  version: 1, meter: '4/4', bpm: 120, duration: 60,
  beats: Array.from({ length: 119 }, (_, k) => 0.5 + k * 0.5),
  downbeats: Array.from({ length: 30 }, (_, k) => 0.5 + k * 2),
  beatEnergy: Array.from({ length: 119 }, (_, k) => (k % 4 === 0 ? 1 : 0.5)),
};

test('planCut: from the first downbeat at or after --from, whole bars, shifted to video time', () => {
  const c = planCut({ analysis: ANALYSIS, from: 0, bars: 6, format: 'kinetic-post' });
  assert.deepEqual([c.start, c.end, c.duration, c.loop], [0.5, 12.5, 12, true]);
  assert.equal(c.beats.length, 24);
  assert.deepEqual(c.downbeats, [0, 2, 4, 6, 8, 10]);
  assert.deepEqual(c.barList[0], { n: 1, start: 0, end: 2, energy: 0.625 });
  assert.equal(c.barList.length, 6);
  assert.equal(planCut({ analysis: ANALYSIS, from: 3, bars: 6, format: 'kinetic-post' }).start, 4.5);
  const short = planCut({ analysis: ANALYSIS, from: 0, bars: 10, format: 'motion-short' });
  assert.deepEqual([short.duration, short.loop], [20, false]);
});

test('planCut refuses a bad bar count, a cut outside the format, and a --from past the grid', () => {
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 0, bars: 3, format: 'kinetic-post' }), /3 bars = 6 s, outside 8–20 s; at 120 BPM a bar is 2 s; a kinetic-post \(8–20 s\) fits --bars 4–10/);
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 0, bars: Number.NaN, format: 'motion-short' }), /--bars must be a whole number of bars; .*fits --bars 8–20/);
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 59, bars: 4, format: 'kinetic-post' }), /--from 59 is after the last downbeat/);
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 50, bars: 8, format: 'kinetic-post' }), /runs past the end of the track/);
  const sparse = { ...ANALYSIS, downbeats: ANALYSIS.downbeats.slice(0, 6) }; // the grid ends at 10.5 s
  assert.deepEqual(planCut({ analysis: sparse, from: 0, bars: 8, format: 'kinetic-post' }).end, 16.5, 'bar period beyond the grid');
  assert.equal(barsHint(120, 'explainer'), 'at 120 BPM a bar is 2 s; a explainer (30–90 s) fits --bars 15–45');
});

test('musicArgs: 20 ms fades for a loop, a last-bar fade-out otherwise; analyzerArgs pins the packages', () => {
  const loop = musicArgs({ track: 't.mp3', start: 0.5, duration: 12, loop: true, bar: 2, gain: 4, out: 'o.wav' });
  assert.deepEqual(loop.slice(0, 9), ['-y', '-loglevel', 'error', '-ss', '0.5', '-t', '12', '-i', 't.mp3']);
  assert.equal(loop[loop.indexOf('-af') + 1], 'volume=4dB,afade=t=in:d=0.02,afade=t=out:st=11.98:d=0.02,alimiter=limit=0.84:level=0:latency=1');
  const fade = musicArgs({ track: 't.mp3', start: 0.5, duration: 20, loop: false, bar: 2, gain: 4, out: 'o.wav' });
  assert.match(fade[fade.indexOf('-af') + 1], /afade=t=out:st=18:d=2/);
  assert.deepEqual(analyzerArgs('x.mp3').slice(0, 9), ['run', '--quiet', '--python', '3.12', '--with', 'librosa==1.0.0', '--with', 'soundfile==0.14.0', 'python']);
  assert.equal(analyzerArgs('x.mp3').at(-1), 'x.mp3');
});

function musicRoot() {
  const root = mkdtempSync(join(tmpdir(), 'music-cut-'));
  mkdirSync(join(root, 'templates/dena-generate'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-generate/index.html'), readFileSync(join(REPO, 'templates/dena-generate/index.html'), 'utf8'));
  writeFileSync(join(root, 'templates/dena-generate/hyperframes.json'), '{}');
  mkdirSync(join(root, 'shared/music/licenses'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-beat.mp3'), 'mp3');
  writeFileSync(join(root, 'shared/music/licenses/m01-beat.txt'), 'proof');
  const sha = createHash('sha256').update('mp3').digest('hex');
  const track = { id: 'm01-beat', file: 'm01-beat.mp3', title: 'Beat', author: 'A', sourceUrl: 'https://x/', license: 'cc0', licenseProof: 'licenses/m01-beat.txt', sha256: sha, duration: 60, mood: ['upbeat'], energy: 4, rejected: false };
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify({ version: 1, tracks: [track, { ...track, id: 'm02-no', rejected: true }] }));
  return { root, sha };
}

// uv answers with the analysis; ffmpeg measures -20 LUFS and writes its output file
function musicRun({ failCut = false } = {}) {
  const calls = [];
  const run = (cmd, args) => {
    const name = basename(cmd);
    calls.push([name, ...args]);
    if (name === 'uv') return { status: 0, stdout: `${JSON.stringify(ANALYSIS)}\n`, stderr: '' };
    if (name === 'ffmpeg' && args.includes('null')) return { status: 0, stdout: '', stderr: '{\n"input_i" : "-20.00"\n}' };
    if (name === 'ffmpeg') {
      writeFileSync(args.at(-1), failCut ? 'half' : 'RIFF-MUSIC');
      return failCut ? { status: 1, stdout: '', stderr: 'boom' } : { status: 0, stdout: '', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: `unexpected ${name}` };
  };
  return { run, calls };
}

test('video music cuts whole bars into processed-audio.wav, writes beats.json, syncs index.html, caches the analysis', () => {
  const { root, sha } = musicRoot();
  const { dir } = scaffold({ slug: 'post', root, generate: true, format: 'kinetic-post' });
  const m = musicRun();
  const meta = main(['music', 'post', '--track', 'm01-beat', '--bars', '6'], { root, env: { GEMINI_API_KEY: 'k' }, run: m.run });
  assert.deepEqual([meta.track, meta.from, meta.bars, meta.duration, meta.loop, meta.bpm, meta.meter, meta.sha256], ['m01-beat', 0.5, 6, 12, true, 120, '4/4', sha]);
  assert.equal(readFileSync(join(dir, 'processed-audio.wav'), 'utf8'), 'RIFF-MUSIC');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'beats.json'), 'utf8')).barList.length, 6);
  assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /id="voice-audio"[^>]*data-duration="12"/);
  const cut = m.calls.find((c) => c[0] === 'ffmpeg' && !c.includes('null'));
  assert.equal(cut[cut.indexOf('-af') + 1], 'volume=4dB,afade=t=in:d=0.02,afade=t=out:st=11.98:d=0.02,alimiter=limit=0.84:level=0:latency=1');
  assert.ok(existsSync(join(root, 'shared/music/beats/m01-beat.json')));
  const again = musicRun();
  main(['music', 'post', '--track', 'm01-beat', '--bars', '5', '--from', '3'], { root, env: {}, run: again.run });
  assert.equal(again.calls.filter((c) => c[0] === 'uv').length, 0, 'cached analysis');
  writeFileSync(join(root, 'shared/music/beats/m01-beat.json'), '{oops');
  const third = musicRun();
  main(['music', 'post', '--track', 'm01-beat', '--bars', '6'], { root, env: {}, run: third.run });
  assert.equal(third.calls.filter((c) => c[0] === 'uv').length, 1, 'a broken cache is analysed again');
});

test('video music refuses an explainer, a missing or rejected track, a missing --bars, and keeps the old audio on failure', () => {
  const { root } = musicRoot();
  const ex = scaffold({ slug: 'ex', root, generate: true });
  assert.throws(() => main(['music', 'ex', '--track', 'm01-beat', '--bars', '6'], { root, env: {}, run: musicRun().run }), /is an explainer: .*npm run video -- bgm/);
  const { dir } = scaffold({ slug: 'short', root, generate: true, format: 'motion-short' });
  assert.throws(() => main(['music', 'short', '--bars', '10'], { root, env: {}, run: musicRun().run }), /music needs --track <id>/);
  assert.throws(() => main(['music', 'short', '--track', 'm02-no', '--bars', '10'], { root, env: {}, run: musicRun().run }), /was rejected in the Studio/);
  assert.throws(() => main(['music', 'short', '--track', 'm01-beat'], { root, env: {}, run: musicRun().run }), /--bars must be a whole number of bars; at 120 BPM a bar is 2 s; a motion-short \(15–40 s\) fits --bars 8–20/);
  writeFileSync(join(dir, 'processed-audio.wav'), 'OLD');
  assert.throws(() => main(['music', 'short', '--track', 'm01-beat', '--bars', '10'], { root, env: {}, run: musicRun({ failCut: true }).run }), /ffmpeg failed/);
  assert.equal(readFileSync(join(dir, 'processed-audio.wav'), 'utf8'), 'OLD');
  assert.deepEqual(readdirSync(dir).filter((f) => f.includes('.part')), []);
  assert.equal(existsSync(join(ex.dir, 'beats.json')), false);
});
```

Append ` scripts/music-cut.test.mjs` to the end of `test:video` in `package.json`.

- [ ] **Step 2: Run to see them fail**

Run: `node --test scripts/music-cut.test.mjs`
Expected: FAIL (`Cannot find module '.../scripts/lib/music/cut.mjs'`).

- [ ] **Step 3: Write `scripts/lib/music/beats.py`**

```python
# Beat grid for the music-driven generate formats (ADR-0027, RD-06-30): tempo, beats, 4/4 downbeats, and energy
# per beat of one audio file, as JSON on stdout. Run through uv by scripts/lib/music/cut.mjs; nothing is installed
# into the repo. Deterministic: librosa's beat tracker has no random sampling.
import json
import sys

import librosa
import numpy as np

SR = 22050
HOP = 512


def analyse(path):
    y, sr = librosa.load(path, sr=SR, mono=True)
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    tempo, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=HOP, units='frames')
    frames = np.asarray(frames, dtype=int)
    if len(frames) < 8:
        sys.exit('fewer than 8 beats found; does this track have a pulse?')
    times = librosa.frames_to_time(frames, sr=sr, hop_length=HOP)
    # 4/4: the downbeat phase is the one whose every 4th beat has the most onset strength
    strength = onset[np.clip(frames, 0, len(onset) - 1)]
    phase = int(np.argmax([strength[p::4].sum() for p in range(4)]))
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    edges = list(frames) + [len(rms)]
    energy = np.array([rms[edges[k]:max(edges[k] + 1, edges[k + 1])].mean() for k in range(len(frames))])
    if energy.max() > 0:
        energy = energy / energy.max()
    r = lambda x: round(float(x), 3)
    return {
        'version': 1,
        'meter': '4/4',
        'bpm': round(float(np.atleast_1d(tempo)[0]), 2),
        'duration': r(len(y) / sr),
        'beats': [r(t) for t in times],
        'downbeats': [r(t) for t in times[phase::4]],
        'beatEnergy': [r(e) for e in energy],
    }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('usage: beats.py <audio file>')
    print(json.dumps(analyse(sys.argv[1])))
```

- [ ] **Step 4: Write `scripts/lib/music/cut.mjs`**

```js
// `video music` (ADR-0027, RD-06-30..32): the time base of a music-driven generate format. A catalog track is
// analysed once (tempo, beats, 4/4 downbeats, energy; cached per sha256 in shared/music/beats/), cut to whole bars
// from a downbeat, and set to -16 LUFS -> processed-audio.wav + beats.json. Node 22+ built-ins (ADR-0007); the
// analyser is a uv sidecar (beats.py), like Supertonic (ADR-0023).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOUDNESS, gainDb, loudnessArgs, parseLoudnorm } from '../cut-plan.mjs';
import { DURATION, isMusicFormat, readFormat } from '../formats.mjs';
import { isGenerate } from '../gates.mjs';
import { syncDuration } from '../generate.mjs';
import { LICENSES, MUSIC_DIR, checkCatalog, findTrack, readCatalog } from '../music.mjs';
import { exec } from '../voice/exec.mjs';
import { writeJson } from '../voice/render.mjs';

export const ANALYZER = { python: '3.12', packages: ['librosa==1.0.0', 'soundfile==0.14.0'] };
export const EDGE_FADE = 0.02; // seconds: no click at the start, or where a loop joins
const SCRIPT = join(import.meta.dirname, 'beats.py');
const r3 = (x) => Math.round(x * 1000) / 1000;
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

export const analyzerArgs = (file) => ['run', '--quiet', '--python', ANALYZER.python, ...ANALYZER.packages.flatMap((p) => ['--with', p]), 'python', SCRIPT, file];
export const barLength = (bpm) => 240 / bpm; // four beats (4/4)

function checkAnalysis(a) {
  const ok = a?.version === 1 && a.bpm > 0 && a.duration > 0 && Array.isArray(a.beats) && a.beats.length >= 8 && Array.isArray(a.downbeats) && a.downbeats.length > 0;
  if (!ok) throw new Error('the beat analyser returned no usable beat grid');
  return a;
}

// shared/music/beats/<id>.json keeps the analysis next to the sha256 of the file it came from
export function analyzeTrack({ root = '.', track, run = spawnSync }) {
  const file = join(root, MUSIC_DIR, track.file);
  const sha = sha256(file);
  const cacheFile = join(root, MUSIC_DIR, 'beats', `${track.id}.json`);
  if (existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
      if (cached.sha256 === sha) return checkAnalysis(cached);
    } catch {
      // unreadable or stale cache: analyse again
    }
  }
  const r = exec(run, 'uv', analyzerArgs(file));
  let a;
  try {
    a = JSON.parse(String(r.stdout).trim().split('\n').at(-1));
  } catch {
    throw new Error('the beat analyser printed no JSON');
  }
  const out = { ...checkAnalysis(a), track: track.id, sha256: sha };
  mkdirSync(join(root, MUSIC_DIR, 'beats'), { recursive: true });
  writeFileSync(`${cacheFile}.part`, `${JSON.stringify(out)}\n`);
  renameSync(`${cacheFile}.part`, cacheFile);
  return out;
}

export function barsHint(bpm, format) {
  const [lo, hi] = DURATION[format];
  const bar = barLength(bpm);
  return `at ${r3(bpm)} BPM a bar is ${r3(bar)} s; a ${format} (${lo}–${hi} s) fits --bars ${Math.ceil(lo / bar)}–${Math.floor(hi / bar)}`;
}

export function planCut({ analysis, from = 0, bars, format }) {
  if (!Number.isInteger(bars) || bars < 1) throw new Error(`--bars must be a whole number of bars; ${barsHint(analysis.bpm, format)}`);
  const bar = barLength(analysis.bpm);
  const downs = analysis.downbeats;
  const i = downs.findIndex((d) => d >= from - 1e-6);
  if (i < 0) throw new Error(`--from ${from} is after the last downbeat (${downs.at(-1)} s) of the track`);
  const start = downs[i];
  const edge = (k) => downs[i + k] ?? start + k * bar; // the grid can run out near the end of a track
  const end = edge(bars);
  if (end > analysis.duration + 1e-6) throw new Error(`--bars ${bars} from ${r3(start)} s runs past the end of the track (${analysis.duration} s)`);
  const duration = r3(end - start);
  const [lo, hi] = DURATION[format];
  if (duration < lo - 1e-6 || duration > hi + 1e-6) throw new Error(`${bars} bars = ${duration} s, outside ${lo}–${hi} s; ${barsHint(analysis.bpm, format)}`);
  const inside = (t) => t >= start - 1e-6 && t < end - 1e-6;
  const shift = (t) => r3(t - start);
  const energy = (s, e) => {
    const v = analysis.beats.map((t, k) => [t, analysis.beatEnergy?.[k] ?? 0]).filter(([t]) => t >= s - 1e-6 && t < e - 1e-6).map(([, x]) => x);
    return v.length ? r3(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  };
  return {
    start: r3(start),
    end: r3(end),
    duration,
    loop: format === 'kinetic-post',
    beats: analysis.beats.filter(inside).map(shift),
    downbeats: downs.filter(inside).map(shift),
    barList: Array.from({ length: bars }, (_, k) => ({ n: k + 1, start: shift(edge(k)), end: shift(edge(k + 1)), energy: energy(edge(k), edge(k + 1)) })),
  };
}

// kinetic-post: 20 ms fades only, so the loop seam (a bar line) does not click; motion-short fades out over its last bar
export function musicArgs({ track, start, duration, loop, bar, gain, out }) {
  const tail = loop ? EDGE_FADE : r3(Math.min(bar, duration));
  const af = [`volume=${gain}dB`, `afade=t=in:d=${EDGE_FADE}`, `afade=t=out:st=${r3(duration - tail)}:d=${tail}`, `alimiter=limit=${LOUDNESS.peak}:level=0:latency=1`].join(',');
  return ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(duration), '-i', track, '-af', af, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', out];
}

export function runMusic({ dir, root = '.', trackId, from = 0, bars, run = spawnSync }) {
  if (!isGenerate(dir)) throw new Error(`${dir} is not a generate-mode project; start one with npm run video -- new <slug> --generate --format kinetic-post`);
  const format = readFormat(dir);
  if (!isMusicFormat(format)) throw new Error(`${dir} is an explainer: its music is a ducked bed under the voice (npm run video -- bgm); video music is for kinetic-post and motion-short`);
  const f = Number(from);
  if (!Number.isFinite(f) || f < 0) throw new Error('--from must be a number of seconds >= 0');
  const catalog = readCatalog(root);
  const t = findTrack(catalog, trackId);
  if (t.rejected) throw new Error(`${t.id} was rejected in the Studio (tab Musik); pick another track`);
  if (!LICENSES[t.license]) throw new Error(`${t.id}: license "${t.license}" is not allowed (ADR-0024)`);
  const problems = checkCatalog(root).filter((p) => p.startsWith(`${t.id}:`));
  if (problems.length) throw new Error(`${problems.join('; ')}; run npm run music -- check`);
  const analysis = analyzeTrack({ root, track: t, run });
  const n = bars === undefined ? Number.NaN : Number(bars);
  const cut = planCut({ analysis, from: f, bars: n, format });
  const track = join(root, MUSIC_DIR, t.file);
  const measured = ['-hide_banner', '-nostats', '-ss', String(cut.start), '-t', String(cut.duration), ...loudnessArgs(track).slice(2)];
  const gain = gainDb(parseLoudnorm(exec(run, 'ffmpeg', measured).stderr));
  const audio = join(dir, 'processed-audio.wav');
  const part = join(dir, 'processed-audio.part.wav');
  rmSync(part, { force: true });
  try {
    exec(run, 'ffmpeg', musicArgs({ track, start: cut.start, duration: cut.duration, loop: cut.loop, bar: barLength(analysis.bpm), gain, out: part }));
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  renameSync(part, audio);
  const meta = { version: 1, track: t.id, file: t.file, sha256: analysis.sha256, meter: analysis.meter || '4/4', bpm: analysis.bpm, from: cut.start, bars: n, duration: cut.duration, loop: cut.loop, beats: cut.beats, downbeats: cut.downbeats, barList: cut.barList };
  writeJson(join(dir, 'beats.json'), meta);
  const index = join(dir, 'index.html');
  if (existsSync(index)) {
    writeFileSync(`${index}.part`, syncDuration(readFileSync(index, 'utf8'), cut.duration));
    renameSync(`${index}.part`, index);
  }
  return meta;
}
```

- [ ] **Step 5: Wire `music` into `scripts/video.mjs`**

1. Import: `import { runMusic } from './lib/music/cut.mjs';`
2. Usage comment: add after the `bgm` line: `//        npm run video -- music <slug> --track <id> [--from <s>] --bars <n>   (kinetic-post / motion-short: music cut on bars -> processed-audio.wav + beats.json, ADR-0027)`
3. Change `if (cmd === 'voice' || cmd === 'bgm' || cmd === 'storyboard') {` to `if (cmd === 'voice' || cmd === 'bgm' || cmd === 'storyboard' || cmd === 'music') {`.
4. Inside that block, directly before `if (cmd === 'bgm') {`, add:

```js
    if (cmd === 'music') {
      if (!values.track) throw new Error('music needs --track <id> (npm run music -- list --mood upbeat)');
      const meta = runMusic({ dir, root, trackId: values.track, from: values.from ?? 0, bars: values.bars, run: childRun });
      console.log(`music ${join(dir, 'processed-audio.wav')} (${meta.track} from ${meta.from} s, ${meta.bars} bars at ${meta.bpm} BPM = ${meta.duration} s${meta.loop ? ', loop' : ''})`);
      return meta;
    }
```

- [ ] **Step 6: Run to see them pass**

Run: `npm run test:video`
Expected: all pass (68 + 5 = 73).

- [ ] **Step 7: Real analyzer smoke (manual)**

```bash
npm run video -- new music-smoke --generate --format kinetic-post
npm run video -- music music-smoke --track m05-hazy-after-hours --bars 6
```

Expected: the first run installs librosa through uv, then prints `music … (m05-hazy-after-hours from <s> s, 6 bars at ~123 BPM = ~11.7 s, loop)`. Check `videos/music-smoke/beats.json` (`bpm` about 123, 24 beats, 6 downbeats 0, ~1.95, …) and the loudness:

```bash
ffmpeg -hide_banner -nostats -i videos/music-smoke/processed-audio.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:"
```

Expected: about −16 LUFS. Run the command again and confirm it is fast (cache in `shared/music/beats/`). Then `rm -rf videos/music-smoke`.

- [ ] **Step 8: Docs**

In `internal/docs/requirements/rd-06-audio.md`, after RD-06-29, add:

```md
- **RD-06-30** (Event-driven) — When `npm run video -- music <slug> --track <id> [--from <s>]
  --bars <n>` dijalankan untuk proyek `kinetic-post` / `motion-short`, the CLI shall
  menganalisis lagu dengan `scripts/lib/music/beats.py` lewat
  `uv run --python 3.12 --with librosa==1.0.0 --with soundfile==0.14.0` (tempo, beat,
  downbeat 4/4, energi per beat; di-cache di `shared/music/beats/<id>.json` bersama sha256
  berkas lagu) tanpa kunci Gemini di env proses anak.
- **RD-06-31** (Event-driven) — When analisis ada, the CLI shall memotong dari downbeat
  pertama ≥ `--from` tepat `n` bar ke `processed-audio.wav` (48 kHz stereo, −16 LUFS;
  kinetic-post fade 20 ms di kedua ujung, motion-short fade-in 20 ms dan fade-out sepanjang
  bar terakhir), menulis `beats.json` (waktu video), dan menyesuaikan `data-duration`
  elemen `data-voice-duration` di `index.html`.
- **RD-06-32** (Unwanted) — If proyeknya explainer atau bukan mode generate, lagunya tidak
  dikenal, ditolak, atau lisensinya tidak diizinkan, `--bars` bukan bilangan bulat positif,
  potongan di luar rentang durasi format (pesan menyebut rentang `--bars` pada tempo lagu),
  atau ffmpeg gagal, then the CLI shall berhenti tanpa mengubah `processed-audio.wav`;
  cache yang rusak atau sha-nya beda dianalisis ulang.
```

In `internal/docs/architecture/data-model.md`, in `## Mode generate (ADR-0025)`, add at the end of the bullet list:

```md
- `beats.json` (format musik, ADR-0027): `{ version: 1, track, file, sha256, meter: "4/4", bpm, from, bars, duration, loop, beats: [s], downbeats: [s], barList: [{ n, start, end, energy }] }` dalam waktu video; ditulis `npm run video -- music`. Cache analisis per lagu: `shared/music/beats/<id>.json` (`{ version, meter, bpm, duration, beats, downbeats, beatEnergy, track, sha256 }`).
```

In `CLAUDE.md` and `AGENTS.md`, replace the line `npm run video -- new <slug> --generate      # generate mode: starter without base video, research/, brief stub (ADR-0025)` with:

```bash
npm run video -- new <slug> --generate [--format explainer|kinetic-post|motion-short]  # generate mode: starter without base video, research/, brief stub (ADR-0025, ADR-0027)
npm run video -- music <slug> --track <id> [--from <s>] --bars <n>  # kinetic-post / motion-short: music cut on bars -> processed-audio.wav + beats.json (ADR-0027)
```

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/music/beats.py scripts/lib/music/cut.mjs scripts/music-cut.test.mjs scripts/video.mjs package.json internal/docs/requirements/rd-06-audio.md internal/docs/architecture/data-model.md CLAUDE.md AGENTS.md
git commit -m "feat(video): video music — librosa beat grid, whole-bar cut, beats.json (RD-06-30..32)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Storyboard text tiles and the agent workflow for the music formats

**Files:**
- Modify: `scripts/lib/storyboard.mjs`, `scripts/generate.test.mjs`
- Modify: `docs/agents/references/generate-mode.md`, `docs/agents/references/qa-checklist.md`, `docs/agents/01-story.md`, `docs/agents/02-screen-plan.md`, `docs/agents/03-build.md`, `docs/skills/dena-video-editing-workflow/SKILL.md`
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md` (RD-03-97…99), `CLAUDE.md`, `AGENTS.md`

**Interfaces:**
- Consumes: overlay rows may carry `text` (string).
- Produces: storyboard tiles show `row.text` when present.

- [ ] **Step 1: Write the failing test**

Append to `scripts/generate.test.mjs`:

```js
test('video storyboard shows a row\'s on-screen text when it has one (music formats have no spoken words)', () => {
  const { root, dir } = storyboardRoot();
  writeFileSync(join(dir, 'overlay-timeline.json'), JSON.stringify({ elements: [
    { id: 'ov-001', type: 'broll-text', track: 4, start: 0, duration: 2, placement: 'full', example: 'tx-01-slam', text: 'BUKAN AI-NYA' },
  ] }));
  writeFrames(root, 'broll-text');
  const pages = [];
  main(['storyboard', 'demo'], { root, env: {}, run: storyboardRun(root, [], (html) => pages.push(html)) });
  assert.match(pages[0], /<b>1<\/b> 0:00\.0–0:02\.0 · tx-01-slam<br \/>BUKAN AI-NYA/);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `node --test scripts/generate.test.mjs`
Expected: the new test FAILS (the tile has no words: there is no `processed-transcript.json`).

- [ ] **Step 3: Implement**

In `scripts/lib/storyboard.mjs`, in `runStoryboard`, change `words: spokenIn(words, e.start, e.start + e.duration)` to `words: typeof e.text === 'string' ? e.text : spokenIn(words, e.start, e.start + e.duration)`, and extend the header comment's first sentence with `; a music-format row shows its on-screen \`text\` instead of spoken words (ADR-0027)`.

- [ ] **Step 4: Run to see it pass**

Run: `npm run test:video`
Expected: all pass (74).

- [ ] **Step 5: Workflow docs**

Append to `docs/agents/references/generate-mode.md` (before `## QA (generate)`):

```md
## Music-driven formats: kinetic-post and motion-short (ADR-0027)

`creative-brief.md` sets `- format: kinetic-post` or `- format: motion-short` (scaffold:
`npm run video -- new <slug> --generate --format <f>`). There is no voice: the cut music is
the time base, and there are **two gates** — Gate 1 (on-screen text + music + storyboard)
and Gate 2 (render). Everything above applies unless this section says otherwise.

| | kinetic-post | motion-short |
| --- | --- | --- |
| Length | 8–20 s | 15–40 s |
| Content | one idea, quote, or hook as kinetic type | 3–6 scenes (text + objects + numbers) |
| Words | 10–30 | at most 8 per state |
| End | loops: the last frame is the first frame's state; CTA only in `publish-captions.md` | a CTA card (non-promissory) in the last bar |
| Main style | usually `broll-text` (+ at most one accent) | a style world as for an explainer |

### Story (music formats)

1. Research as for an explainer. When `research/request.json` has `text` (Teks persis),
   use those words exactly: only split them into beat groups and choose the stressed word.
2. `script.md` holds the **on-screen text**, one line per beat or beat group (no
   narration); `## Fakta` still sources every number, name, price, result, or quote.
   kinetic-post: the payoff word lands on a downbeat, and the last line leads back into the
   first. motion-short: the last scene is the CTA card.
3. Music: pick a catalog track (`npm run music -- list --mood upbeat`, also `playful`,
   `tech-ringan`), then `npm run video -- music <slug> --track <id> --from <s> --bars <n>`
   (the command names the `--bars` range that fits). Reading pace is about one word or
   phrase per beat; when that is too fast, pick a slower track — never cram the text.
4. No `video voice`, no `processed-transcript.json`, no Gate 1 stop here: continue to
   Screen Plan.

### Screen Plan (music formats)

- No caption rail and no `caption-beats.json`: the on-screen text is the content.
  `publish-captions.md` is still written (the kinetic-post CTA lives there).
- Scenes follow the bars in `beats.json`: every text line enters on a beat; scene changes
  and the payoff word land on downbeats.
- `storyboard.md`: `| # | bars | time | on-screen text | style / pattern | what appears | example |`.
  Each scene row in `overlay-timeline.json` carries `text` (its on-screen words); then
  `npm run video -- storyboard <slug>`.
- **Gate 1**: stop and show Dena `script.md`, the music (`processed-audio.wav`, track, BPM,
  bars), the storyboard sheet, `storyboard.md`, and the style world. Record a chat answer
  with `npm run video -- gate <slug> approve 1` (or `revise 1 --note "…"`).

### Build (music formats)

- `processed-audio.wav` (the music) on track 10 is the only music: no `video bgm`, no
  ducking. SFX sparingly, only accents the music does not already hit.
- kinetic-post: the last frame returns to the first frame's state (an invisible loop), no
  fade to black. motion-short: the CTA card in the last bar while the music fades.
- Render → **Gate 2**; record a chat answer with
  `npm run video -- gate <slug> approve|revise|qa 2`. A Gate 2 approval ends the run: never
  publish.
```

In `docs/agents/references/qa-checklist.md`, at the end of `## Generate Mode`, add:

```md
- Music formats (`kinetic-post`, `motion-short`, ADR-0027): kinetic-post's first and last
  frames show the same state (the loop is invisible); every text change lands on a beat in
  `beats.json` (±1 frame); no text is on screen for less than 0.4 s; there is no caption
  rail; the music is the only music track (no ducked bed).
```

In `docs/agents/01-story.md`, `## Mode generate`, append: ``The music-driven formats `kinetic-post` and `motion-short` write on-screen text instead of narration and cut their music with `npm run video -- music` (section Music-driven formats in `generate-mode.md`, ADR-0027).``

In `docs/agents/02-screen-plan.md`, `## Mode generate`, append: ``In `kinetic-post` / `motion-short` there are no captions; scenes follow `beats.json`, rows carry `text`, and Gate 1 shows text + music + storyboard together (ADR-0027).``

In `docs/agents/03-build.md`, `## Mode generate`, append: ``In `kinetic-post` / `motion-short` the music is the only music track (no `video bgm`); kinetic-post loops, motion-short ends on a CTA card; the render is Gate 2 (ADR-0027).``

In `docs/skills/dena-video-editing-workflow/SKILL.md`, in the Phase Router row that starts `| Motion-design video with no footage of Dena`, change the first cell to `Motion-design video with no footage of Dena, from a topic, brief, URL, article, thread, or a rewritten older video (generate mode: explainer, kinetic-post, motion-short)`; and in `## Handoff Contract`, after the generate-mode chain, add the line `Music formats (kinetic-post, motion-short): Story writes script.md (on-screen text) + processed-audio.wav + beats.json (npm run video -- music) instead of voice/; Screen Plan skips caption-beats.json; gates are 1 (text + music + storyboard) and 2 (render).`

In `CLAUDE.md` and `AGENTS.md`, in the Generate-mode non-negotiable bullet, append: `` Two music-driven formats, `kinetic-post` (8–20 s, loop) and `motion-short` (15–40 s, CTA card), have no voice: `npm run video -- music` cuts the music on bars, and there are two gates (text + music + storyboard, then render; ADR-0027).``

In `internal/docs/requirements/rd-03-video-editing-workflow.md`, after RD-03-96, add:

```md
- **RD-03-97** (State-driven) — While format-nya `kinetic-post` / `motion-short`, fase Story
  shall menulis teks layar (bukan narasi) di `script.md` — kinetic-post satu ide 10–30 kata
  yang menyambung ke awal, motion-short 3–6 scene maksimal 8 kata per tampilan dengan
  kartu CTA terakhir — memakai Teks persis `request.json` kata demi kata bila ada, lalu
  memotong musik dengan `npm run video -- music`.
- **RD-03-98** (State-driven) — While format-nya musik, fase Screen Plan shall tidak menulis
  `caption-beats.json`, menyelaraskan setiap baris teks ke beat dan pergantian scene serta
  kata puncak ke downbeat (`beats.json`), memberi `text` pada baris scene
  `overlay-timeline.json`, dan berhenti di Gate 1 dengan teks + musik + storyboard.
- **RD-03-99** (State-driven) — While format-nya musik, fase Build shall memakai
  `processed-audio.wav` sebagai satu-satunya musik (tanpa `video bgm` dan ducking), membuat
  kinetic-post loop (frame terakhir = keadaan frame pertama, tanpa fade ke hitam) dan
  motion-short berakhir dengan kartu CTA di bar terakhir, lalu berhenti di Gate 2.
```

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/storyboard.mjs scripts/generate.test.mjs docs/agents/references/generate-mode.md docs/agents/references/qa-checklist.md docs/agents/01-story.md docs/agents/02-screen-plan.md docs/agents/03-build.md docs/skills/dena-video-editing-workflow/SKILL.md internal/docs/requirements/rd-03-video-editing-workflow.md CLAUDE.md AGENTS.md
git commit -m "feat(generate): music-format workflow — on-screen text, beat-aligned scenes, storyboard text tiles (RD-03-97..99)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Studio backend per format

**Files:**
- Modify: `scripts/studio/generate.mjs`, `scripts/studio/agent.mjs`, `scripts/studio/app.mjs`, `scripts/studio.test.mjs`
- Modify: `internal/docs/requirements/rd-05-studio.md` (RD-05-30…32), `internal/docs/architecture/data-model.md` (`request.json`)

**Interfaces:**
- Consumes: `DURATION`, `FORMATS`, `isMusicFormat`, `readFormat` (Task 1); `scaffold({ format })` (Task 1).
- Produces:
  - `generateOptions(root)` gains `formats: string[]`, `durations: { [format]: [min, max] }`.
  - `validateRequest` accepts `format`, `text`; request gains `format`, `text`.
  - `listGenerate` items gain `format`.
  - `generateDetail` gains `format`, `beats: { track, bpm, bars, duration, loop } | null`, `gate1.lines: string[]`; `storyboardRows` rows gain `bars` (7-column tables).
  - `gateMessage({ gate, decision, note, edited, voiceStale, finalGate = 3 })`.
  - `buildPrompt({ mode, slug, notes, format = 'explainer' })`.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/studio.test.mjs`:

```js
// ---- music formats (ADR-0027) ----

function genMusicProject(root, slug, stage) {
  const dir = join(root, 'videos', slug);
  mkdirSync(join(dir, 'research'), { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), '# Creative Brief\n\n## Workflow Settings\n\n- mode: generate\n- format: kinetic-post\n');
  writeFileSync(join(dir, 'research/brief.md'), '# Brief (verbatim dari Dena, 2026-09-29)\n\nBukan AI-nya yang bodoh.\n');
  writeFileSync(join(dir, 'research/request.json'), JSON.stringify({ version: 1, format: 'kinetic-post', text: 'Bukan AI-nya yang bodoh', brief: 'x', urls: [], repurpose: null, voice: null, duration: null, style: null, music: null }));
  writeFileSync(join(dir, 'script.md'), '# Teks\n\nBUKAN\nAI-NYA\nYANG BODOH\n');
  writeFileSync(join(dir, 'processed-audio.wav'), 'MUSIC');
  writeFileSync(join(dir, 'beats.json'), JSON.stringify({ version: 1, track: 'm01-quiet', bpm: 120, bars: 6, duration: 12, loop: true, beats: [], downbeats: [], barList: [] }));
  mkdirSync(join(dir, 'preview'), { recursive: true });
  writeFileSync(join(dir, 'preview/storyboard-sheet.jpg'), 'JPG');
  writeFileSync(join(dir, 'storyboard.md'), '| # | bars | time | on-screen text | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | 1–2 | 0:00–0:04 | BUKAN AI-NYA | broll-text / slam | Kata jatuh di downbeat | `tx-01-slam` |\n');
  if (stage === 'gate2') {
    record(dir, { gate: 1, decision: 'approve', by: 'cli' });
    mkdirSync(join(dir, 'renders'), { recursive: true });
    writeFileSync(join(dir, 'renders', `${slug}.mp4`), 'MP4');
  }
  return dir;
}

test('validateRequest per format: durations, voice only for explainer, Teks persis only for music formats', () => {
  const root = genStudioRoot();
  const ok = { brief: 'Bukan AI-nya yang bodoh', slug: 'post-baru', format: 'kinetic-post' };
  const err = (body) => { try { validateRequest(root, body); return 'ok'; } catch (e) { return `${e.status} ${e.message}`; } };
  assert.equal(err({ ...ok, duration: 12, text: 'BUKAN AI-NYA YANG BODOH' }), 'ok');
  assert.match(err({ ...ok, format: 'reel' }), /^400 format:/);
  assert.match(err({ ...ok, duration: 25 }), /^400 duration: bilangan bulat 8–20 atau kosong/);
  assert.match(err({ ...ok, format: 'motion-short', duration: 12 }), /^400 duration: bilangan bulat 15–40/);
  assert.match(err({ ...ok, voice: 'st-f2' }), /^400 voice:/);
  assert.match(err({ ...ok, text: 'x'.repeat(1001) }), /^400 text:/);
  assert.match(err({ brief: 'x', slug: 'ex-baru', text: 'teks' }), /^400 text:/);
  const v = validateRequest(root, { ...ok, text: '  BUKAN\r\nAI-NYA  ' });
  assert.deepEqual([v.request.format, v.request.text, v.request.voice], ['kinetic-post', 'BUKAN\nAI-NYA', null]);
  assert.equal(validateRequest(root, { brief: 'x', slug: 'ex-baru' }).request.format, 'explainer');
  assert.deepEqual(generateOptions(root).durations['motion-short'], [15, 40]);
});

test('app generate kinetic-post: scaffold with format, Teks persis in the brief, prompt with two gates', async (t) => {
  const root = genStudioRoot();
  const { server, call } = await startApp(root);
  t.after(() => server.close());
  const made = await call('POST', '/api/generate', { brief: 'Bukan AI-nya yang bodoh', slug: 'post-baru', format: 'kinetic-post', text: 'BUKAN AI-NYA YANG BODOH', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(made.status, 201);
  const dir = join(root, 'videos/post-baru');
  assert.match(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), /^- format: kinetic-post$/m);
  assert.doesNotMatch(readFileSync(join(dir, 'index.html'), 'utf8'), /bgm-audio/);
  assert.match(readFileSync(join(dir, 'research/brief.md'), 'utf8'), /## Teks persis \(wajib dipakai kata demi kata\)\n\nBUKAN AI-NYA YANG BODOH\n$/);
  const prompt = readFileSync(join(root, '.studio/prompts/post-baru.md'), 'utf8');
  assert.match(prompt, /^Buat video mode generate \(kinetic-post\) di `videos\/post-baru\/`/);
  assert.match(prompt, /Gate 1 \(teks \+ musik \+ storyboard\) dan Gate 2 \(render\)/);
  assert.equal((await call('GET', '/api/generate')).body.find((p) => p.slug === 'post-baru').format, 'kinetic-post');
});

test('app generate music-format detail, final-gate messages, and explainer-only script/voice routes', async (t) => {
  const root = genStudioRoot();
  genMusicProject(root, 'post-a', 'gate1');
  const dir2 = genMusicProject(root, 'post-b', 'gate2');
  const app = await startApp(root, {}, idlePanes('post-b'));
  t.after(() => app.server.close());
  const d1 = (await app.call('GET', '/api/generate/post-a')).body;
  assert.deepEqual([d1.format, d1.status.gate, d1.status.finalGate], ['kinetic-post', 1, 2]);
  assert.deepEqual(d1.beats, { track: 'm01-quiet', bpm: 120, bars: 6, duration: 12, loop: true });
  assert.deepEqual(d1.gate1.lines, ['BUKAN', 'AI-NYA', 'YANG BODOH']);
  assert.deepEqual([d1.gate2.rows[0].bars, d1.gate2.rows[0].words, d1.gate2.rows[0].example], ['1–2', 'BUKAN AI-NYA', 'tx-01-slam']);
  assert.equal((await app.call('PUT', '/api/generate/post-a/script', { text: '# T\n\nBARU\n' })).status, 409);
  assert.equal((await app.call('POST', '/api/generate/post-a/voice')).status, 409);
  const fp = (await app.call('GET', '/api/generate/post-b')).body.status.fingerprint;
  app.calls.length = 0;
  assert.equal((await app.call('POST', '/api/generate/post-b/decision', { gate: 2, decision: 'approve', fingerprint: fp })).status, 200);
  assert.match(app.calls.find((c) => c.includes('-l')).at(-1), /^Gate 2 disetujui dari Studio\. Catatan: -\. Video selesai; jangan publish ke Repliz atau R2/);
  assert.equal(readGates(dir2).log.at(-1).gate, 2);
});

test('gateMessage uses the format\'s last gate for approval and QA', () => {
  assert.match(gateMessage({ gate: 2, decision: 'approve', finalGate: 2 }), /^Gate 2 disetujui dari Studio\. Catatan: -\. Video selesai; jangan publish/);
  assert.match(gateMessage({ gate: 2, decision: 'approve' }), /Lanjutkan ke fase berikutnya\.$/, 'an explainer Gate 2 continues');
  assert.equal(gateMessage({ gate: 2, decision: 'qa', finalGate: 2 }), 'Gate 2: Dena memilih QA dulu. Jalankan fase QA (docs/agents/04-qa.md) sebagai subagent baru, lalu kembali ke Gate 2.');
  assert.match(buildPrompt({ mode: 'generate', slug: 'a', format: 'motion-short' }), /^Buat video mode generate \(motion-short\)[\s\S]*Gate 1 \(teks \+ musik \+ storyboard\) dan Gate 2 \(render\)/);
});
```

Update two existing assertions in `scripts/studio.test.mjs` that use `deepEqual` on the whole object:

- In `validateRequest names the bad field and creates nothing`, the expected request becomes `{ version: 1, format: 'explainer', brief: 'Kenapa AI agent gagal', text: null, urls: ['https://a.id/x'], repurpose: 'vid-a', voice: 'gm-a', duration: 60, style: 'stop-motion', music: 'm01-quiet', createdAt: '2026-09-29T08:00:00.000Z' }`.
- In `mdSection and storyboardRows read the plan files`, the expected row gains `bars: null`: `{ n: 1, bars: null, time: '0:00.0–0:04.4', words: 'Banyak AI', style: 'stop-motion / pop-up', what: 'Warung', example: 'sm-08-walk-hinge (still 2)' }`.

(`genStudioRoot`'s starter is a bare `<main>`; `musicStarter` passes it through unchanged, so the create test only checks what the Studio writes.)

- [ ] **Step 2: Run to see them fail**

Run: `npm run test:studio`
Expected: the four new tests FAIL.

- [ ] **Step 3: Implement in `scripts/studio/generate.mjs`**

1. Imports: add `import { DURATION, FORMATS, isMusicFormat, readFormat } from '../lib/formats.mjs';`.
2. In `generateOptions`, change the return to `return { voices, defaultVoice, styles: STYLES, music, repurpose, formats: FORMATS, durations: DURATION };`.
3. In `validateRequest`, directly after the brief checks, add:

```js
  const format = empty(b.format) ? 'explainer' : b.format;
  if (!FORMATS.includes(format)) bad('format', `harus salah satu dari ${FORMATS.join(', ')}`);
  const music = isMusicFormat(format);
  let text = null;
  if (!empty(b.text)) {
    if (!music) bad('text', 'Teks persis hanya untuk kinetic-post dan motion-short');
    text = String(b.text).replace(/\r\n/g, '\n').trim();
    if (text.length > 1000) bad('text', 'maksimal 1000 karakter');
  }
  if (music && !empty(b.voice)) bad('voice', `${format} tidak punya suara`);
```

   and replace the duration check with:

```js
  let duration = null;
  if (!empty(b.duration)) {
    const [lo, hi] = DURATION[format];
    duration = Number(b.duration);
    if (!Number.isInteger(duration) || duration < lo || duration > hi) bad('duration', `bilangan bulat ${lo}–${hi} atau kosong`);
  }
```

   and add `format,` and `text,` to the returned `request` object (after `version: 1,` and after `brief,` respectively).
4. In `createGenerate`, change the scaffold call to `const { dir } = scaffold({ slug, root, generate: true, format: request.format });` and the brief write to:

```js
  const locked = request.text ? `\n## Teks persis (wajib dipakai kata demi kata)\n\n${request.text}\n` : '';
  writeFileSync(join(dir, 'research', 'brief.md'), `# Brief (verbatim dari Dena, ${request.createdAt.slice(0, 10)})\n\n${request.brief}\n${locked}`);
```

5. Replace `storyboardRows` with:

```js
// explainer: | # | time | spoken words | style | what | example |; music formats add "bars" after "#" (ADR-0027)
export function storyboardRows(md) {
  return String(md ?? '').split('\n')
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .map((c) => {
      const [n, bars, time = '', words = '', style = '', what = '', example = ''] = c.length >= 7 ? c : [c[0], null, ...c.slice(1)];
      return { n: Number(n), bars, time, words, style, what, example: example.replace(/`/g, '') };
    });
}
```

   (The existing explainer test expects `{ n, time, words, style, what, example }`; update that assertion in `scripts/studio.test.mjs` to include `bars: null`.)
6. In `listGenerate`, add `format: readFormatSafe(dir)` to each item, with this helper above it:

```js
const readFormatSafe = (dir) => {
  try {
    return readFormat(dir);
  } catch {
    return 'explainer';
  }
};
```

7. In `generateDetail`: add `format: status.format,` after `status,`; add `beats: beatsSummary(dir),` after it with

```js
const beatsSummary = (dir) => {
  const b = readJsonFile(join(dir, 'beats.json'));
  return b ? { track: b.track ?? null, bpm: b.bpm ?? null, bars: b.bars ?? null, duration: b.duration ?? null, loop: Boolean(b.loop) } : null;
};
```

   and add `lines: scriptBody(script).split('\n').map((l) => l.trim()).filter(Boolean),` inside `gate1` after `paragraphs`.
8. `gateMessage`: add `finalGate = 3` to its parameter object and change the two decision lines to:

```js
    if (decision === 'approve' && gate === finalGate) text = `Gate ${gate} disetujui dari Studio. Catatan: ${n || '-'}. Video selesai; jangan publish ke Repliz atau R2 — Dena publish sendiri dari tab Results. Berhenti di sini.`;
    else if (decision === 'approve') text = `Gate ${gate} disetujui dari Studio. Catatan: ${n || '-'}. Lanjutkan ke fase berikutnya.`;
```

   and the qa line to:

```js
    else if (decision === 'qa') text = `Gate ${gate}: Dena memilih QA dulu${n ? ` (${n})` : ''}. Jalankan fase QA (docs/agents/04-qa.md) sebagai subagent baru, lalu kembali ke Gate ${gate}.`;
```

9. In `decide`, pass the final gate: `const text = gateMessage({ gate, decision: body.decision, note: recorded.note, edited, voiceStale: before.voiceStale, finalGate: before.finalGate });`
10. In `saveScript`, directly after `const dir = generateDir(root, slug);`, add:

```js
  if (isMusicFormat(readFormatSafe(dir))) throw new HttpError(409, 'teks format musik direvisi lewat catatan ke agent (storyboard ikut berubah)');
```

- [ ] **Step 4: Prompt and routes**

In `scripts/studio/agent.mjs`, change the signature to `export function buildPrompt({ mode, slug, notes, format = 'explainer' }) {` and the `generate` entry to:

```js
    generate: `Buat video mode generate (${format}) di \`videos/${slug}/\`. Brief Dena ada di \`research/brief.md\`; pilihannya di \`research/request.json\` — pilihan yang terisi wajib dipakai (Teks persis kata demi kata), yang kosong kamu tentukan. Ikuti ${SKILL} dan ${GENERATE_DOC}${format === 'explainer' ? '' : ' (bagian Music-driven formats)'}. Berhenti di ${format === 'explainer' ? 'Gate 1 (naskah + suara), Gate 2 (storyboard), dan Gate 3 (render)' : 'Gate 1 (teks + musik + storyboard) dan Gate 2 (render)'}; keputusan Dena datang sebagai pesan "Gate N disetujui dari Studio …" atau "Gate N revisi dari Studio: …" dan sudah tercatat di \`gates.json\`.`,
```

In `scripts/studio/app.mjs`:
- `POST /api/generate`: change `const { slug } = createGenerate(root, b);` to `const { slug, request } = createGenerate(root, b);` and the prompt to `buildPrompt({ mode: 'generate', slug, format: request.format })`.
- `POST /api/generate/<slug>/voice`: after `const s = gateStatus(dir, { slug });` add `if (s.format !== 'explainer') throw new HttpError(409, 'format musik tidak punya suara; musiknya dipotong dengan npm run video -- music');`.

- [ ] **Step 5: Run to see them pass**

Run: `npm run test:studio`
Expected: all pass (47 + 4 = 51).

- [ ] **Step 6: Docs**

Append to `internal/docs/requirements/rd-05-studio.md`:

```md
- **RD-05-30** (Event-driven) — When Dena submits the Generate form, Studio shall accept a
  `format` (`explainer` default, `kinetic-post`, `motion-short`), check the duration against
  that format's range (30–90, 8–20, 15–40 s), accept a voice preset only for `explainer` and
  "Teks persis" (at most 1000 characters) only for the music formats, scaffold with
  `--format`, write `format` and `text` to `research/request.json` and the Teks persis to
  `research/brief.md`, and start the agent with a prompt naming the format and its gates
  (ADR-0027).
- **RD-05-31** (Event-driven) — When Dena opens a music-format project, Studio shall show its
  format and, at Gate 1, the music (`processed-audio.wav`), tempo from `beats.json` (track,
  BPM, bars, duration, loop), the on-screen text line by line, the storyboard sheet, and the
  scene rows with their bars; at Gate 2 the render with Revisi, QA dulu, and Setuju.
- **RD-05-32** (Unwanted) — If a music-format project gets a script edit or a voice job,
  then Studio shall refuse it (409); the approval at a format's last gate tells the agent the
  video is done and not to publish, and QA dulu is offered only at that gate.
```

In `internal/docs/architecture/data-model.md`, change `` `research/request.json` (ADR-0026): `{ version: 1, brief, urls: [], repurpose, voice, duration, style, music, createdAt }`; `` to `` `research/request.json` (ADR-0026, ADR-0027): `{ version: 1, format, brief, text, urls: [], repurpose, voice, duration, style, music, createdAt }` (`text` = Teks persis or `null`; `voice` is `null` for the music formats); ``.

- [ ] **Step 7: Commit**

```bash
git add scripts/studio/generate.mjs scripts/studio/agent.mjs scripts/studio/app.mjs scripts/studio.test.mjs internal/docs/requirements/rd-05-studio.md internal/docs/architecture/data-model.md
git commit -m "feat(studio): Generate backend per format — Teks persis, durations, beats detail, final-gate messages (RD-05-30..32)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Studio UI per format

**Files:**
- Modify: `scripts/studio/public/index.html`, `scripts/studio/public/generate.js`
- Modify: `internal/docs/requirements/rd-05-studio.md` (RD-05-33), `internal/docs/entrypoints/rd.md`

**Interfaces:**
- Consumes: detail `format`, `beats`, `gate1.lines`, row `bars`, `status.finalGate`; options `formats`, `durations`.

- [ ] **Step 1: `index.html` form fields**

In `#gen-form`, directly after `<h2>Buat video generate</h2>`, add:

```html
    <label>Format <select name="format">
      <option value="explainer">explainer — narasi TTS, 30–90 dtk</option>
      <option value="kinetic-post">kinetic-post — tipografi kinetik, 8–20 dtk, loop</option>
      <option value="motion-short">motion-short — motion graphic, 15–40 dtk, kartu CTA</option>
    </select></label>
```

After the Slug label, add:

```html
    <label id="gen-text-field" hidden>Teks persis (opsional, dipakai kata demi kata) <textarea name="text" rows="3" maxlength="1000" placeholder="BUKAN AI-NYA YANG BODOH"></textarea></label>
```

Give the voice label an id: change `<label>Preset suara <select name="voice"></select></label>` to `<label id="gen-voice-field">Preset suara <select name="voice"></select></label>`. Mark the duration range: change `<label>Durasi (detik, 30–90) <input` to `<label>Durasi (detik, <span id="gen-duration-range">30–90</span>) <input`.

- [ ] **Step 2: `generate.js`**

1. After `let followingVoice = '';`, add `let durations = {};` and the helper `const isMusic = (f) => f === 'kinetic-post' || f === 'motion-short';`.
2. `statusText` stays; in `renderList`, change `${esc(statusText(p.status))}` to `${esc(`${p.format || 'explainer'} · ${statusText(p.status)}`)}`.
3. Split `gate2` so the storyboard cards can be reused, and show bars on a scene when present. Replace the whole `gate2` function with:

```js
  function storyboardCards(d) {
    const g = d.gate2;
    return `
      <section class="gen-card"><h3>Storyboard</h3>
        ${g.sheets.map((s) => `<a href="${media(d.slug, s)}" target="_blank" rel="noopener"><img class="sheet" alt="${esc(s)}" src="${media(d.slug, s, d.status.fingerprint?.[s])}"></a>`).join('') || '<p class="muted">Belum ada sheet.</p>'}
      </section>
      <section class="gen-card"><h3>Scene</h3>
        <ol class="scenes">${g.rows.map((r) => `<li><strong>${r.n}. ${r.bars ? `bar ${esc(r.bars)} · ` : ''}${esc(r.time)}</strong> <span class="muted">${esc(r.style)}</span><span>${esc(r.what)}</span><span class="muted">“${esc(r.words)}” · ${esc(r.example)}</span></li>`).join('')}</ol>
      </section>
      <section class="gen-card"><h3>Style World</h3><pre>${esc(g.styleWorld || '–')}</pre></section>`;
  }

  function gate2(d) {
    const g = d.gate2;
    return `${storyboardCards(d)}
      <section class="gen-card"><h3>Musik</h3><pre>${esc(g.music || '–')}</pre>
        ${g.musicTrack ? `<audio controls preload="none" src="/api/music/${enc(g.musicTrack)}/file"></audio>` : ''}</section>`;
  }
```

   and add after `gate3(d)`:

```js
  // kinetic-post / motion-short Gate 1: the cut music, its tempo, the on-screen text, and the storyboard (ADR-0027)
  function musicGate1(d) {
    const b = d.beats;
    return `
      <section class="gen-card"><h3>Musik</h3>
        ${d.gate1.audio ? `<audio controls preload="none" src="${media(d.slug, 'processed-audio.wav', d.status.fingerprint?.['processed-audio.wav'])}"></audio>` : ''}
        <p class="muted">${b ? `${esc(b.track)} · ${esc(b.bpm)} BPM · ${esc(b.bars)} bar · ${dur(b.duration)}${b.loop ? ' · loop' : ''}` : 'beats.json belum ada'}</p>
      </section>
      <section class="gen-card"><h3>Teks layar</h3>
        <div id="gen-script-view">${d.gate1.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
          ${d.gate1.facts ? `<details><summary>Fakta</summary><pre>${esc(d.gate1.facts)}</pre></details>` : ''}</div>
      </section>
      ${storyboardCards(d)}`;
  }
```

4. (Folded into 3.)
5. In `renderDetail`, change the head status to include the format: replace `${esc(statusText(s))}` in `#gen-head` with `${esc(`${d.format} · ${statusText(s)}`)}`; add `d.beats?.duration` to the `key` array; and replace the body line with:

```js
      const views = isMusic(d.format) ? { 1: musicGate1, 2: gate3 } : { 1: gate1, 2: gate2, 3: gate3 };
      $('#gen-body').innerHTML = s.phase === 'gate' ? views[s.gate](d) : running(d);
```

6. In `renderActions`, change `${s.gate === 3 ? ` to `${s.gate === s.finalGate ? `.
7. In `askNote`, change `qa: 'QA dulu (Gate 3)'` to ``qa: `QA dulu (Gate ${gate})` ``.
8. Form: in `openForm`, after `f.reset();`, add `durations = o.durations || {};` and after `fillModels(f);` add `applyFormat(f);`. Add this function above `openForm`:

```js
  function applyFormat(f) {
    const music = isMusic(f.format.value);
    $('#gen-text-field').hidden = !music;
    $('#gen-voice-field').hidden = music;
    const [lo, hi] = durations[f.format.value] || [30, 90];
    f.duration.min = String(lo);
    f.duration.max = String(hi);
    $('#gen-duration-range').textContent = `${lo}–${hi}`;
  }
```

   and after the `form.runtime.addEventListener(…)` line add `form.format.addEventListener('change', () => applyFormat(form));`.
9. In the form submit body, add `format: f.format.value,` and `text: isMusic(f.format.value) ? f.text.value : '',`, and change `voice: f.voice.value,` to `voice: isMusic(f.format.value) ? '' : f.voice.value,`.

- [ ] **Step 3: Automated suites**

Run: `npm run test:studio && npm run test:video`
Expected: all pass. Also `node --check scripts/studio/public/generate.js`.

- [ ] **Step 4: Browser check (CDP, 390 px) on a throwaway kinetic-post**

Start a throwaway Studio: `npm run studio -- --port 4787` (background). Make a throwaway project with real music and fake storyboard/render files:

```bash
npm run video -- new ui-post --generate --format kinetic-post
npm run video -- music ui-post --track m05-hazy-after-hours --bars 6
printf '# Teks\n\nBUKAN\nAI-NYA\nYANG BODOH\n' > videos/ui-post/script.md
mkdir -p videos/ui-post/preview && cp videos/ai-agent-gagal/preview/storyboard-sheet.jpg videos/ui-post/preview/
printf '| # | bars | time | on-screen text | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | 1–2 | 0:00–0:03.9 | BUKAN AI-NYA | broll-text / slam | Kata jatuh di downbeat | `tx-01-slam` |\n' > videos/ui-post/storyboard.md
```

Screenshot with the CDP helper from sub-project 3 (`cdp-shot.mjs` in the scratchpad; re-create it from the Task 5 notes of `docs/superpowers/plans/2026-09-29-studio-generate.md` if the scratchpad is gone): the form with Format `kinetic-post` (`#generate/new`, then set `document.querySelector('#gen-form').format.value='kinetic-post'` and dispatch `change`), the list, and Gate 1 (`#generate/ui-post`). Then `npm run video -- gate ui-post approve 1`, copy `videos/ai-agent-gagal/renders/ai-agent-gagal.mp4` to `videos/ui-post/renders/ui-post.mp4`, and screenshot Gate 2. Check: Teks persis visible and voice hidden for kinetic-post, duration hint 8–20, music player + "m05-hazy-after-hours · ~123 BPM · 6 bar · 0:12 · loop", text lines, sheet + scene card with "bar 1–2", Gate 2 with Revisi / QA dulu / Setuju, no horizontal overflow. Remove the throwaway project and stop the throwaway Studio.

- [ ] **Step 5: Docs**

Append to `internal/docs/requirements/rd-05-studio.md`:

```md
- **RD-05-33** (Ubiquitous) — The Generate form shall show Teks persis and hide the voice
  preset for the music formats, and show the duration range of the chosen format; the list
  and panel shall name each project's format.
```

In `internal/docs/entrypoints/rd.md`, change the RD-05 line's `tab Generate (RD-05-21…29): form + panel review gate.` to `tab Generate (RD-05-21…33): form + panel review gate, per format.`

- [ ] **Step 6: Commit**

```bash
git add scripts/studio/public/index.html scripts/studio/public/generate.js internal/docs/requirements/rd-05-studio.md internal/docs/entrypoints/rd.md
git commit -m "feat(studio): Generate tab per format — Format select, Teks persis, music Gate 1 panel (RD-05-33)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verification and review

- [ ] **Step 1:** Run every suite (`test:voice test:video test:music test:studio test:repliz test:motion-kit test:craft-kit test:style-kit test:asset-lib test:render-blur`); every one `fail 0`.
- [ ] **Step 2:** Walk the spec sections 1–4 against the code and RD-03-94…99, RD-06-29…32, RD-05-30…33; fix gaps in the owning task's files with their docs.
- [ ] **Step 3:** Request a code review (superpowers:requesting-code-review) of `main..feat/music-formats`; fix Critical/Important, re-run the suites, commit with docs.
- [ ] **Step 4:** Report to Dena and offer the finishing-a-development-branch options. After the merge, restart Studio and make the first real kinetic-post from the Studio form with Dena at Gate 1 and Gate 2 (topic chosen by Dena).
