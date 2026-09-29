# Studio Generate Form + Gate Review Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dena can start a generate-mode video from a Studio form and answer Gate 1/2/3 in a phone-friendly review panel, with every decision recorded in one place (`gates.json`) whether it comes from Studio or from chat.

**Architecture:** A new library `scripts/lib/gates.mjs` derives a generate project's position from its artifacts plus an append-only decision log `videos/<slug>/gates.json` (the only writer, used by `npm run video -- gate` and by Studio). Studio gets a server module `scripts/studio/generate.mjs` (options, form validation, project creation, detail, decisions, script edit, voice job) wired into the route table, and a browser module `scripts/studio/public/generate.js` for the new Generate tab. The agent keeps running in its tmux session (`studio-<slug>`); Studio types each decision into it with `tmux send-keys -l`.

**Tech Stack:** Node 22+ built-ins only (`node:fs`, `node:crypto`, `node:child_process`, `node:test`), tmux, plain browser JS/CSS (no build step), headless Google Chrome for the manual screenshot check.

**Spec:** `docs/superpowers/specs/2026-09-29-studio-generate-design.md` (approved 2026-09-29).

## Global Constraints

- Node 22+, built-in modules only; no npm dependencies (ADR-0007). Studio UI is plain JS/CSS with no build step (ADR-0020).
- Documentation-First: every commit that touches `scripts/` or `docs/agents/` also stages a doc under `internal/docs/`, `AGENTS.md`, or `CLAUDE.md` (Stop hook `.claude/hooks/ensure-docs-updated.py`).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `feat/studio-generate`; never commit to `main`.
- Tests never touch real tmux, TTS, network, or Repliz: inject `run` (tmux), `spawnImpl` (child processes), and `now`.
- UI text is Indonesian; code, comments, and requirement IDs follow the existing files (RD-03 in Indonesian, RD-05 in English).
- Style styles offered in the form, exactly: `motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, `parallax` (no `mix-media`).
- Limits, exactly: brief 1–4000 characters; at most 5 URLs, `http:`/`https:` only; duration integer 30–90 or empty; script edit at most 20 KB (20480 bytes); tmux message one line, control characters removed, at most 1000 characters; gate note at most 2000 characters.
- Gate fingerprints, exactly: G1 `script.md` + `processed-audio.wav`; G2 every `preview/storyboard-sheet.jpg` / `storyboard-sheet-N.jpg` (sorted) + `storyboard.md`; G3 `renders/<slug>.mp4`.
- Never publish, upload to R2, or call Repliz.

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/lib/gates.mjs` (new) | Generate-project position from artifacts, fingerprints, `gates.json` read/append, `formatGateStatus`, `editedSinceDecision`. The only writer of `gates.json`. |
| `scripts/generate-gates.test.mjs` (new) | Tests for `gates.mjs` and the `video gate` CLI. |
| `scripts/video.mjs` | New `gate` subcommand. |
| `scripts/studio/jobs.mjs` (new) | `JobRunner`: one child process per key with a replayable log (publish and voice jobs share it). |
| `scripts/studio/results.mjs` | `Publisher` refactored onto `JobRunner` (behaviour unchanged). |
| `scripts/studio/generate.mjs` (new) | Generate options, request validation, project creation, list, detail, media whitelist, decisions + tmux message, script save, `VoiceJobs`. |
| `scripts/studio/agent.mjs` | `buildPrompt` modes `generate` and `generate-continue`. |
| `scripts/studio/app.mjs` | Generate routes, media whitelist route, generate-aware session prompt, `/generate.js` static file. |
| `scripts/studio.mjs` | Passes `voiceJobs` to `createApp`. |
| `scripts/studio.test.mjs` | Generate API tests; `startApp` accepts extra fake tmux responses. |
| `scripts/studio/public/index.html`, `app.js`, `app.css`, `generate.js` (new) | Generate tab, form dialog, note dialog, review panel. |
| Docs | ADR-0026; RD-03-88…93; RD-05-21…29; `generate-mode.md`, `01-story.md`, `02-screen-plan.md`, `03-build.md`; `CLAUDE.md`, `AGENTS.md`; `internal/docs/README.md`, `internal/docs/entrypoints/rd.md`. |

---

### Task 1: Gate state library (`scripts/lib/gates.mjs`) + ADR-0026

**Files:**
- Create: `scripts/lib/gates.mjs`
- Create: `scripts/generate-gates.test.mjs`
- Modify: `package.json` (`test:video` script)
- Create: `internal/docs/adr/0026-studio-generate.md`
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md` (append RD-03-88…91 after RD-03-87)
- Modify: `internal/docs/README.md` (ADR index line + range)

**Interfaces:**
- Produces:
  - `class GateError extends Error { code }` with codes `not-generate`, `bad-decision`, `bad-note`, `note-required`, `bad-gate`, `not-waiting`, `stale`, `voice-stale`, `bad-file`.
  - `isGenerate(dir) → boolean`
  - `sheetsOf(dir) → string[]` (e.g. `['preview/storyboard-sheet.jpg']`)
  - `fingerprint(dir, gate, slug?) → { [relPath]: sha256hex }`
  - `readGates(dir) → { version: 1, log: Entry[] }`, `Entry = { gate, decision, note, at, by, fingerprint }`
  - `gateStatus(dir, { slug? }) → { mode: 'generate'|'edit', phase: 'story'|'gate'|'screen-plan'|'build'|'done'|null, gate: 1|2|3|null, state: 'waiting'|'revising'|'qa'|null, voiceStale: boolean, fingerprint: object|null, last: Entry|null, log: Entry[] }`
  - `recordDecision(dir, { gate, decision, note?, by, fingerprint?, now? }) → Entry` (`decision` in `approve|revise|qa|edit`, `by` in `studio|cli`; `fingerprint` undefined = use the current one)
  - `editedSinceDecision(log, gate) → boolean`
  - `formatGateStatus(status, slug) → string`

- [ ] **Step 1: Write the failing tests**

Create `scripts/generate-gates.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { briefStub } from './lib/generate.mjs';
import { GateError, editedSinceDecision, fingerprint, formatGateStatus, gateStatus, readGates, recordDecision, sheetsOf } from './lib/gates.mjs';

const T0 = new Date('2026-09-29T08:00:00Z');
const now = () => T0;

// a generate project under a temp root; put(f, text, secondsAfterEpoch) sets the mtime so voiceStale is deterministic
function project(slug = 'demo', { generate = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gates-'));
  const dir = join(root, 'videos', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), generate ? briefStub(slug) : '# Creative Brief\n\n- gate_cut: off\n');
  const put = (f, text = f, at = 1000) => {
    mkdirSync(join(dir, f, '..'), { recursive: true });
    writeFileSync(join(dir, f), text);
    utimesSync(join(dir, f), at, at);
  };
  return { root, dir, put };
}

const status = (dir) => {
  const s = gateStatus(dir);
  return [s.phase, s.gate, s.state];
};

test('gateStatus walks story -> Gate 1 -> screen-plan -> Gate 2 -> build -> Gate 3 -> done', () => {
  const { dir, put } = project();
  assert.deepEqual(status(dir), ['story', null, null]);
  put('script.md', 'Halo.\n', 1000);
  assert.deepEqual(status(dir), ['story', null, null], 'no voice yet');
  put('processed-audio.wav', 'A', 1001);
  assert.deepEqual(status(dir), ['gate', 1, 'waiting']);
  recordDecision(dir, { gate: 1, decision: 'approve', by: 'cli', now });
  assert.deepEqual(status(dir), ['screen-plan', null, null]);
  put('preview/storyboard-sheet.jpg', 'S');
  put('storyboard.md', '| 1 | 0:00 |');
  assert.deepEqual(status(dir), ['gate', 2, 'waiting']);
  recordDecision(dir, { gate: 2, decision: 'approve', by: 'studio', now });
  assert.deepEqual(status(dir), ['build', null, null]);
  put('renders/demo.mp4', 'R');
  assert.deepEqual(status(dir), ['gate', 3, 'waiting']);
  recordDecision(dir, { gate: 3, decision: 'approve', by: 'studio', now });
  assert.deepEqual(status(dir), ['done', null, null]);
  assert.equal(gateStatus(dir).mode, 'generate');
});

test('an approval holds only for the fingerprint it was given', () => {
  const { dir, put } = project();
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  const fp = fingerprint(dir, 1);
  assert.deepEqual(Object.keys(fp).sort(), ['processed-audio.wav', 'script.md']);
  recordDecision(dir, { gate: 1, decision: 'approve', by: 'cli', fingerprint: fp, now });
  assert.deepEqual(status(dir), ['screen-plan', null, null]);
  put('processed-audio.wav', 'A2', 1002);
  assert.deepEqual(status(dir), ['gate', 1, 'waiting'], 'a new voiceover reopens Gate 1');
  assert.notDeepEqual(gateStatus(dir).fingerprint, fp);
});

test('revise shows revising until the artifacts change; qa keeps Gate 3 open', () => {
  const { dir, put } = project();
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  recordDecision(dir, { gate: 1, decision: 'revise', note: 'CTA kurang natural', by: 'studio', now });
  assert.deepEqual(status(dir), ['gate', 1, 'revising']);
  assert.equal(gateStatus(dir).last.note, 'CTA kurang natural');
  put('processed-audio.wav', 'A2', 1002);
  assert.deepEqual(status(dir), ['gate', 1, 'waiting']);
  recordDecision(dir, { gate: 1, decision: 'approve', by: 'studio', now });
  put('preview/storyboard-sheet.jpg', 'S');
  recordDecision(dir, { gate: 2, decision: 'approve', by: 'studio', now });
  put('renders/demo.mp4', 'R');
  recordDecision(dir, { gate: 3, decision: 'qa', by: 'studio', now });
  assert.deepEqual(status(dir), ['gate', 3, 'qa']);
  recordDecision(dir, { gate: 3, decision: 'approve', by: 'studio', now });
  assert.deepEqual(status(dir), ['done', null, null]);
});

test('voiceStale blocks approving Gate 1 until the voiceover is newer than the script', () => {
  const { dir, put } = project();
  put('processed-audio.wav', 'A', 1000);
  put('script.md', 'Halo lagi.\n', 1005);
  assert.equal(gateStatus(dir).voiceStale, true);
  assert.throws(() => recordDecision(dir, { gate: 1, decision: 'approve', by: 'studio', now }), (e) => e instanceof GateError && e.code === 'voice-stale');
  recordDecision(dir, { gate: 1, decision: 'revise', note: 'boleh revisi walau stale', by: 'studio', now });
  put('processed-audio.wav', 'A2', 1010);
  assert.equal(gateStatus(dir).voiceStale, false);
  recordDecision(dir, { gate: 1, decision: 'approve', by: 'studio', now });
});

test('recordDecision refuses bad input without touching gates.json', () => {
  const { dir, put } = project();
  const code = (fn) => { try { fn(); return 'ok'; } catch (e) { return e.code; } };
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'approve', by: 'cli', now })), 'not-waiting', 'story phase');
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  assert.equal(code(() => recordDecision(dir, { gate: 2, decision: 'approve', by: 'cli', now })), 'not-waiting');
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'approve', by: 'cli', fingerprint: { 'script.md': 'x' }, now })), 'stale');
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'revise', note: '  ', by: 'cli', now })), 'note-required');
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'qa', by: 'cli', now })), 'bad-decision');
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'ship', by: 'cli', now })), 'bad-decision');
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'approve', by: 'bot', now })), 'bad-decision');
  assert.equal(code(() => recordDecision(dir, { gate: 1, decision: 'revise', note: 'x'.repeat(2001), by: 'cli', now })), 'bad-note');
  assert.equal(code(() => recordDecision(dir, { gate: 2, decision: 'edit', by: 'studio', now })), 'bad-decision');
  assert.equal(existsSync(join(dir, 'gates.json')), false);
  const edit = project('plain', { generate: false });
  assert.equal(code(() => recordDecision(edit.dir, { gate: 1, decision: 'approve', by: 'cli', now })), 'not-generate');
  assert.equal(gateStatus(edit.dir).mode, 'edit');
  assert.equal(gateStatus(edit.dir).phase, null);
});

test('edit entries are logged without a fingerprint and do not move the gate', () => {
  const { dir, put } = project();
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  const e = recordDecision(dir, { gate: 1, decision: 'edit', note: 'naskah diedit di Studio', by: 'studio', now });
  assert.deepEqual(e, { gate: 1, decision: 'edit', note: 'naskah diedit di Studio', at: '2026-09-29T08:00:00.000Z', by: 'studio', fingerprint: null });
  assert.deepEqual(status(dir), ['gate', 1, 'waiting']);
  assert.equal(editedSinceDecision(readGates(dir).log, 1), true);
  recordDecision(dir, { gate: 1, decision: 'approve', by: 'studio', now });
  assert.equal(editedSinceDecision(readGates(dir).log, 1), false);
  assert.equal(editedSinceDecision([], 1), false);
});

test('gates.json is appended atomically and a broken file is an error, never overwritten', () => {
  const { dir, put } = project();
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  recordDecision(dir, { gate: 1, decision: 'revise', note: 'a', by: 'cli', now });
  recordDecision(dir, { gate: 1, decision: 'revise', note: 'b', by: 'cli', now });
  assert.deepEqual(readGates(dir).log.map((e) => e.note), ['a', 'b']);
  assert.equal(existsSync(join(dir, 'gates.json.part')), false);
  writeFileSync(join(dir, 'gates.json'), '{oops');
  assert.throws(() => gateStatus(dir), (e) => e.code === 'bad-file' && /gates\.json/.test(e.message));
  writeFileSync(join(dir, 'gates.json'), JSON.stringify({ version: 2, log: [] }));
  assert.throws(() => recordDecision(dir, { gate: 1, decision: 'revise', note: 'c', by: 'cli', now }), (e) => e.code === 'bad-file');
  assert.equal(readFileSync(join(dir, 'gates.json'), 'utf8'), JSON.stringify({ version: 2, log: [] }));
});

test('sheetsOf lists only storyboard sheets, sorted; formatGateStatus reads well', () => {
  const { dir, put } = project();
  put('preview/storyboard-sheet-2.jpg');
  put('preview/storyboard-sheet-1.jpg');
  put('preview/contact-sheet.jpg');
  assert.deepEqual(sheetsOf(dir), ['preview/storyboard-sheet-1.jpg', 'preview/storyboard-sheet-2.jpg']);
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  recordDecision(dir, { gate: 1, decision: 'revise', note: 'hook terlalu panjang', by: 'studio', now });
  assert.equal(formatGateStatus(gateStatus(dir), 'demo'), 'Gate 1: agent merevisi (menunggu artefak baru)\nterakhir: Gate 1 revise — hook terlalu panjang (studio, 2026-09-29T08:00:00.000Z)');
  assert.match(formatGateStatus(gateStatus(project('x', { generate: false }).dir), 'x'), /bukan proyek mode generate/);
});
```

In `package.json`, append ` scripts/generate-gates.test.mjs` to the end of the `test:video` value:

```json
"test:video": "node --test scripts/video.test.mjs scripts/video-sources.test.mjs scripts/cut-plan.test.mjs scripts/migrate-sources.test.mjs scripts/generate-lib.test.mjs scripts/generate.test.mjs scripts/generate-gates.test.mjs",
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test scripts/generate-gates.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/lib/gates.mjs'`.

- [ ] **Step 3: Write `scripts/lib/gates.mjs`**

```js
// Generate-mode gate state (ADR-0026, RD-03-88..91): a project's position comes from its artifacts plus the
// append-only decision log videos/<slug>/gates.json. This module is the only writer of gates.json; Studio and
// `npm run video -- gate` both go through it. Node 22+ built-ins (ADR-0007).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export const GATES_FILE = 'gates.json';
export const DECISIONS = ['approve', 'revise', 'qa', 'edit'];
const BY = ['studio', 'cli'];
const SHEET_RE = /^storyboard-sheet(-\d+)?\.jpg$/;
const MAX_NOTE = 2000;

export class GateError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function isGenerate(dir) {
  const brief = join(dir, 'creative-brief.md');
  return existsSync(brief) && /^\s*-\s*mode:\s*generate\b/m.test(readFileSync(brief, 'utf8'));
}

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

export function sheetsOf(dir) {
  const preview = join(dir, 'preview');
  if (!existsSync(preview)) return [];
  return readdirSync(preview).filter((f) => SHEET_RE.test(f)).sort().map((f) => `preview/${f}`);
}

// The files a gate approves (RD-03-89). visual-plan.md is left out on purpose: the agent writes
// "## Gate 2 Result" into it after the approval, which would reopen Gate 2.
export function gateFiles(dir, gate, slug = basename(dir)) {
  if (gate === 1) return ['script.md', 'processed-audio.wav'];
  if (gate === 2) return [...sheetsOf(dir), 'storyboard.md'];
  if (gate === 3) return [`renders/${slug}.mp4`];
  throw new GateError('bad-gate', `gate must be 1, 2, or 3 (got ${gate})`);
}

export function fingerprint(dir, gate, slug = basename(dir)) {
  return Object.fromEntries(gateFiles(dir, gate, slug).filter((f) => existsSync(join(dir, f))).map((f) => [f, sha(join(dir, f))]));
}

export function readGates(dir) {
  const file = join(dir, GATES_FILE);
  if (!existsSync(file)) return { version: 1, log: [] };
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new GateError('bad-file', `${file} is not valid JSON; fix or remove it`);
  }
  if (data?.version !== 1 || !Array.isArray(data.log)) throw new GateError('bad-file', `${file} is not a version 1 gates file`);
  return data;
}

function sameFingerprint(a, b) {
  const ka = Object.keys(a || {}).sort();
  const kb = Object.keys(b || {}).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

export function gateStatus(dir, { slug = basename(dir) } = {}) {
  const { log } = readGates(dir);
  const base = { mode: isGenerate(dir) ? 'generate' : 'edit', log };
  const running = (phase) => ({ ...base, phase, gate: null, state: null, voiceStale: false, fingerprint: null, last: log.at(-1) || null });
  if (base.mode !== 'generate') return running(null);
  const has = (f) => existsSync(join(dir, f));
  // null when the gate is approved for the files on disk now; otherwise the waiting status
  const at = (gate) => {
    const fp = fingerprint(dir, gate, slug);
    const mine = log.filter((e) => e.gate === gate && e.decision !== 'edit' && sameFingerprint(e.fingerprint, fp));
    const last = mine.at(-1);
    if (last?.decision === 'approve') return null;
    const state = !last ? 'waiting' : last.decision === 'revise' ? 'revising' : 'qa';
    const voiceStale = gate === 1 && statSync(join(dir, 'script.md')).mtimeMs > statSync(join(dir, 'processed-audio.wav')).mtimeMs;
    return { ...base, phase: 'gate', gate, state, voiceStale, fingerprint: fp, last: log.filter((e) => e.gate === gate).at(-1) || null };
  };
  if (!has('script.md') || !has('processed-audio.wav')) return running('story');
  const g1 = at(1);
  if (g1) return g1;
  if (!sheetsOf(dir).length) return running('screen-plan');
  const g2 = at(2);
  if (g2) return g2;
  if (!has(`renders/${slug}.mp4`)) return running('build');
  return at(3) || running('done');
}

export function recordDecision(dir, { gate, decision, note = '', by, fingerprint: shown, now = () => new Date() }) {
  if (!isGenerate(dir)) throw new GateError('not-generate', `${dir} is not a generate-mode project (creative-brief.md has no "mode: generate")`);
  if (!DECISIONS.includes(decision)) throw new GateError('bad-decision', `decision must be one of ${DECISIONS.join(', ')}`);
  if (!BY.includes(by)) throw new GateError('bad-decision', 'by must be studio or cli');
  const text = String(note ?? '').trim();
  if (text.length > MAX_NOTE) throw new GateError('bad-note', `note is longer than ${MAX_NOTE} characters`);
  if (decision === 'revise' && !text) throw new GateError('note-required', 'revise needs a note: what should change');
  if (decision === 'qa' && gate !== 3) throw new GateError('bad-decision', 'qa is a Gate 3 decision only');
  if (decision === 'edit' && gate !== 1) throw new GateError('bad-decision', 'edit is a Gate 1 entry only');
  const status = gateStatus(dir);
  if (status.phase !== 'gate' || status.gate !== gate) {
    const where = status.phase === 'gate' ? `Gate ${status.gate}` : status.phase;
    throw new GateError('not-waiting', `Gate ${gate} is not waiting for a decision (now: ${where})`);
  }
  let fp = null;
  if (decision !== 'edit') {
    if (shown !== undefined && !sameFingerprint(shown, status.fingerprint)) throw new GateError('stale', `Gate ${gate} files changed after they were shown; reload and look again`);
    if (decision === 'approve' && status.voiceStale) throw new GateError('voice-stale', 'script.md is newer than the voiceover; run npm run video -- voice first');
    fp = status.fingerprint;
  }
  const entry = { gate, decision, note: text, at: now().toISOString(), by, fingerprint: fp };
  const data = readGates(dir);
  data.log.push(entry);
  const file = join(dir, GATES_FILE);
  writeFileSync(`${file}.part`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${file}.part`, file);
  return entry;
}

// True when the newest Gate <gate> entry is an "edit": the script changed in Studio since the last decision.
export function editedSinceDecision(log, gate) {
  for (let i = log.length - 1; i >= 0; i--) if (log[i].gate === gate) return log[i].decision === 'edit';
  return false;
}

const PHASE_TEXT = { story: 'Story berjalan', 'screen-plan': 'Screen Plan berjalan', build: 'Build berjalan', done: 'Selesai' };
const STATE_TEXT = { waiting: 'menunggu keputusan', revising: 'agent merevisi (menunggu artefak baru)', qa: 'QA dulu (menunggu keputusan setelah QA)' };

export function formatGateStatus(s, slug) {
  if (s.mode !== 'generate') return `${slug} bukan proyek mode generate (creative-brief.md tanpa "mode: generate")`;
  const lines = [s.phase === 'gate' ? `Gate ${s.gate}: ${STATE_TEXT[s.state]}` : PHASE_TEXT[s.phase]];
  if (s.voiceStale) lines.push(`naskah lebih baru dari suara: jalankan npm run video -- voice ${slug}`);
  const last = s.log.at(-1);
  if (last) lines.push(`terakhir: Gate ${last.gate} ${last.decision}${last.note ? ` — ${last.note}` : ''} (${last.by}, ${last.at})`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test scripts/generate-gates.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the docs**

Create `internal/docs/adr/0026-studio-generate.md`:

```md
# ADR-0026 Studio mode generate: form + panel review gate
Status: accepted
Date: 2026-09-29

## Context

Mode generate (ADR-0025) berhenti di tiga gate (naskah + suara, storyboard, render).
Video pertama (`videos/ai-agent-gagal`) dijawab lewat chat, dan artefaknya hanya bisa
dilihat lewat terminal. Studio (ADR-0020) sudah punya proyek, sesi agent di tmux,
Results + publish, serta pemutar audio di tab Suara/Musik, tetapi belum bisa membuat proyek
generate atau menampilkan artefak untuk menjawab gate.

## Decision

- **Satu sesi agent per proyek; panel sebagai jendela.** Form Studio membuat proyek generate
  (`scaffold` generate + `research/brief.md` + `research/request.json`) dan memulai sesi
  `studio-<slug>` dengan prompt generate. Agent mengerjakan fase dan berhenti di gate; panel
  membaca artefak, mencatat keputusan, lalu mengetik keputusan itu ke sesi dengan
  `tmux send-keys -l` (teks literal, satu baris).
- **Posisi dari artefak, keputusan di `gates.json`.** `scripts/lib/gates.mjs` menghitung fase
  dari artefak dan menulis log keputusan `videos/<slug>/gates.json` (satu-satunya penulis;
  dipakai Studio dan `npm run video -- gate`). Persetujuan mengikat sidik jari sha256 file
  gate; file berubah → gate menunggu lagi.
- **Pilihan Dena menang.** Pilihan yang terisi di `research/request.json` (URL, repurpose,
  preset suara, durasi, style, musik) wajib dipakai agent; yang kosong ditentukan agent.
- **Revisi = catatan ke agent; edit naskah langsung di Gate 1** dengan "Buat ulang suara"
  (`video voice` sebagai job Studio).
- Publish tetap lewat tab Results (ADR-0003).

## Consequences

- Keputusan di chat juga dicatat agent dengan `npm run video -- gate`, jadi Studio dan chat
  melihat status yang sama.
- Panel bergantung pada sesi tmux yang hidup untuk menyampaikan keputusan; tanpa sesi,
  keputusan tetap tercatat dan "Mulai sesi lanjut" membawa keputusan terakhir.
- Agent Studio tetap berjalan tanpa prompt izin (ADR-0020); catatan Dena hanya lewat file
  prompt atau `send-keys -l`, tidak pernah lewat parser shell.

## Alternatives

- **Run headless per fase** (`claude -p` / `codex exec`, Studio sebagai state machine):
  status rapi, tetapi infrastruktur proses baru, konteks percakapan hilang, sulit diarahkan.
- **Tombol CLI per langkah + agent hanya menulis:** alur bolak-balik tombol ↔ agent, paling
  rumit dirawat.
```

In `internal/docs/requirements/rd-03-video-editing-workflow.md`, directly after the RD-03-87 bullet, add:

```md
- **RD-03-88** (Ubiquitous) — Di mode generate, the system shall menghitung posisi proyek
  (`story`, Gate 1, `screen-plan`, Gate 2, `build`, Gate 3, `done`) dari artefak
  (`script.md` + `processed-audio.wav`, `preview/storyboard-sheet*.jpg`,
  `renders/<slug>.mp4`) dan keputusan di `videos/<slug>/gates.json`, bukan dari terminal
  agent (`scripts/lib/gates.mjs`, ADR-0026).
- **RD-03-89** (Event-driven) — When sebuah gate disetujui, the system shall mencatat sidik
  jari sha256 file gate itu (G1 `script.md` + `processed-audio.wav`; G2 semua storyboard
  sheet + `storyboard.md`; G3 render); bila salah satu file berubah, gate itu kembali
  menunggu.
- **RD-03-90** (Unwanted) — If keputusan membawa sidik jari yang berbeda dari artefak
  sekarang, gate yang diputuskan bukan gate yang menunggu, `revise` tanpa catatan, `qa` di
  luar Gate 3, atau `approve` Gate 1 saat `script.md` lebih baru dari
  `processed-audio.wav`, then the system shall menolak keputusan itu tanpa menulis
  `gates.json`.
- **RD-03-91** (Ubiquitous) — `gates.json` shall hanya ditulis lewat
  `scripts/lib/gates.mjs`, hanya ditambah (log), dan ditulis atomik; isi rusak atau versi
  lain menghasilkan error yang menyebut file itu, tanpa menimpanya.
```

In `internal/docs/README.md`, after the line starting `49. [adr/0025-generate-mode-explainer.md]`, add:

```md
50. [adr/0026-studio-generate.md](adr/0026-studio-generate.md) - Studio mode generate: form + panel review gate, `gates.json` + `video gate` (sidik jari artefak), keputusan diketik ke sesi tmux.
```

and change `| Keputusan arsitektur | [adr/](adr/) (0001–0025) |` to `| Keputusan arsitektur | [adr/](adr/) (0001–0026) |`.

- [ ] **Step 6: Run the video suite**

Run: `npm run test:video`
Expected: all pass (54 previous + 8 new = 62).

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/gates.mjs scripts/generate-gates.test.mjs package.json internal/docs/adr/0026-studio-generate.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/README.md
git commit -m "feat(gates): gate position from artifacts + gates.json decision log (ADR-0026, RD-03-88..91)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `npm run video -- gate` + workflow docs

**Files:**
- Modify: `scripts/video.mjs` (usage comment, import, new `gate` branch in `main`)
- Modify: `scripts/generate-gates.test.mjs` (CLI tests)
- Modify: `docs/agents/references/generate-mode.md`, `docs/agents/01-story.md`, `docs/agents/02-screen-plan.md`, `docs/agents/03-build.md`
- Modify: `CLAUDE.md`, `AGENTS.md` (command list)
- Modify: `internal/docs/requirements/rd-03-video-editing-workflow.md` (RD-03-92, RD-03-93), `internal/docs/entrypoints/rd.md`

**Interfaces:**
- Consumes: `gateStatus`, `recordDecision`, `formatGateStatus` from Task 1.
- Produces: CLI `npm run video -- gate <slug>` (returns the status object from `main`), `gate <slug> approve|revise|qa <n> [--note]` (returns the entry, `by: "cli"`).

- [ ] **Step 1: Write the failing CLI tests**

Append to `scripts/generate-gates.test.mjs`:

```js
import { main } from './video.mjs';

test('video gate prints the status and records cli decisions', () => {
  const { root, dir, put } = project('demo');
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  const logs = [];
  const log = console.log;
  console.log = (m) => logs.push(String(m));
  try {
    const s = main(['gate', 'demo'], { root });
    assert.deepEqual([s.phase, s.gate], ['gate', 1]);
    assert.match(logs.at(-1), /^Gate 1: menunggu keputusan/);
    assert.throws(() => main(['gate', 'demo', 'revise', '1'], { root }), /revise needs a note/);
    const e = main(['gate', 'demo', 'approve', '1', '--note', 'disetujui di chat'], { root });
    assert.deepEqual([e.gate, e.decision, e.by, e.note], [1, 'approve', 'cli', 'disetujui di chat']);
    assert.match(logs.at(-1), /^gate 1 approve recorded/);
    assert.throws(() => main(['gate', 'demo', 'qa', '1'], { root }), /qa is a Gate 3 decision only/);
    assert.throws(() => main(['gate', 'demo', 'ship', '2'], { root }), /gate action must be approve, revise, or qa/);
    assert.throws(() => main(['gate', 'nope'], { root }), /not found/);
  } finally {
    console.log = log;
  }
  assert.equal(readGates(dir).log.length, 1);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `node --test scripts/generate-gates.test.mjs`
Expected: the new test FAILS (`main` falls through to `commandsFor` and throws an unknown-command error).

- [ ] **Step 3: Add the `gate` command to `scripts/video.mjs`**

Add to the usage comment block (after the `storyboard` line):

```js
//        npm run video -- gate <slug> [approve|revise|qa <n>] [--note "…"]   (generate-mode gate status / decision, ADR-0026)
```

Add the import next to the other `./lib/` imports:

```js
import { formatGateStatus, gateStatus, recordDecision } from './lib/gates.mjs';
```

In `main`, directly after the `if (cmd === 'new') { … }` block, add:

```js
  if (cmd === 'gate') {
    const dir = projectDir(slug, root);
    if (!existsSync(dir)) throw new Error(`${dir} not found`);
    const [, , action, n] = positionals;
    if (!action) {
      const status = gateStatus(dir, { slug });
      console.log(formatGateStatus(status, slug));
      return status;
    }
    if (!['approve', 'revise', 'qa'].includes(action)) throw new Error('gate action must be approve, revise, or qa');
    const entry = recordDecision(dir, { gate: Number(n), decision: action, note: values.note ?? '', by: 'cli' });
    console.log(`gate ${entry.gate} ${action} recorded (${entry.at})`);
    return entry;
  }
```

- [ ] **Step 4: Run to see it pass**

Run: `node --test scripts/generate-gates.test.mjs`
Expected: PASS, 9 tests.

- [ ] **Step 5: Update the workflow docs**

In `docs/agents/references/generate-mode.md`:

1. In `### 1. Research`, add as the first bullet:

```md
- `research/request.json` (written by the Studio form, ADR-0026): every filled choice
  (`urls`, `repurpose`, `voice`, `duration`, `style`, `music`) is binding; an empty one
  (`null` / `[]`) is yours to decide. Research every URL it lists.
```

2. Replace the body of `### 5. Gate 1 — script + voice (mandatory)` with:

```md
Stop. Give Dena the script (`script.md`) and the voice (`processed-audio.wav`, its
duration, preset). Revisions: edit the script, run `video voice` again. Continue only
after she approves.

Every gate answer is recorded in `gates.json` (ADR-0026, RD-03-92). An answer typed into
the session by Studio ("Gate N disetujui dari Studio …", "Gate N revisi dari Studio: …")
is already recorded; an answer Dena gives in chat is recorded by you before you continue:
`npm run video -- gate <slug> approve <n> [--note "…"]`, `… revise <n> --note "…"`, or
`… qa 3`. `npm run video -- gate <slug>` prints where the project stands. The same rule
applies at Gate 2 and Gate 3.
```

3. In `### Storyboard and Gate 2 (always)`, change step 4 to:

```md
4. Stop. Show Dena the sheet, `storyboard.md`, the style world, and the music. She
   approves or changes; record it in `## Gate 2 Result` and, when she answered in chat,
   with `npm run video -- gate <slug> approve 2` (or `revise 2 --note "…"`).
```

4. In `## Build (generate)` step 7, change `**Gate 3**.` to `**Gate 3** (record a chat answer with `npm run video -- gate <slug> approve|revise|qa 3`).`

In `docs/agents/01-story.md`, in `## Mode generate`, append this sentence to the paragraph: ``A project made in Studio also has `research/request.json`; its filled choices are binding, and gate answers are recorded with `npm run video -- gate` (ADR-0026).``

In `docs/agents/02-screen-plan.md`, in `## Mode generate`, append: ``Record Dena's Gate 2 answer with `npm run video -- gate <slug> approve 2` when it comes from chat (Studio records its own).``

In `docs/agents/03-build.md`, in `## Mode generate`, append: ``Record Dena's Gate 3 answer with `npm run video -- gate <slug> approve|revise|qa 3` when it comes from chat (Studio records its own).``

In `CLAUDE.md` and `AGENTS.md`, after the `npm run video -- storyboard <slug>` command line, add:

```bash
npm run video -- gate <slug> [approve|revise|qa <n>] [--note "…"]  # generate-mode gate status / decision -> gates.json (ADR-0026)
```

In `internal/docs/requirements/rd-03-video-editing-workflow.md`, after RD-03-91, add:

```md
- **RD-03-92** (Event-driven) — When Dena menjawab sebuah gate mode generate di chat, the
  agent shall mencatat jawabannya dengan
  `npm run video -- gate <slug> approve|revise|qa <n> [--note]` sebelum melanjutkan; jawaban
  yang diketik Studio ke sesi sudah tercatat.
- **RD-03-93** (State-driven) — While `research/request.json` ada, fase mode generate shall
  memakai setiap pilihan yang terisi (URL, repurpose, preset suara, durasi, style, musik)
  dan menentukan sendiri pilihan yang kosong.
```

In `internal/docs/entrypoints/rd.md`, on the RD-03 one-liner, change `mode generate (RD-03-75…87): naskah + TTS, Gate 1/2 wajib, storyboard sheet.` to `mode generate (RD-03-75…93): naskah + TTS, Gate 1/2 wajib, storyboard sheet, gates.json + video gate.`

- [ ] **Step 6: Run the suites**

Run: `npm run test:video`
Expected: all pass (63).

- [ ] **Step 7: Commit**

```bash
git add scripts/video.mjs scripts/generate-gates.test.mjs docs/agents/references/generate-mode.md docs/agents/01-story.md docs/agents/02-screen-plan.md docs/agents/03-build.md CLAUDE.md AGENTS.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/entrypoints/rd.md
git commit -m "feat(video): video gate status/decision; agents record chat answers (RD-03-92..93)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Studio — options, create, list, detail, media

**Files:**
- Create: `scripts/studio/generate.mjs`
- Modify: `scripts/studio/agent.mjs` (`buildPrompt` modes)
- Modify: `scripts/studio/app.mjs` (routes, `checkModel` helper, generate-aware session prompt)
- Modify: `scripts/studio.test.mjs` (fixtures + tests; `startApp` accepts extra fake tmux responses)
- Modify: `internal/docs/requirements/rd-05-studio.md` (RD-05-21…24)

**Interfaces:**
- Consumes: `isGenerate`, `gateStatus`, `sheetsOf`, `readGates` (Task 1); `scaffold`, `checkSlug` (`scripts/video.mjs`); `loadVoices` (`scripts/lib/voice/presets.mjs`); `readCatalog` (`scripts/lib/music.mjs`); `scriptBody`, `splitParagraphs` (`scripts/lib/voice/script.mjs`); `projectSlugs` (`scripts/studio/files.mjs`); `projectPath` (`scripts/studio/projects.mjs`); `listSessions`, `startSession` (`scripts/studio/sessions.mjs`).
- Produces (all in `scripts/studio/generate.mjs`):
  - `STYLES: string[]`
  - `generateDir(root, slug) → dir` (404 unless a generate project)
  - `readRequest(dir) → object|null`
  - `generateOptions(root) → { voices: {name, provider}[], defaultVoice, styles, music: {id,title,mood,energy,duration}[], repurpose: string[] }`
  - `validateRequest(root, body, { now }) → { slug, request }` (throws `HttpError` 400 `"<field>: …"`, 409 for a taken slug)
  - `createGenerate(root, body, { now }) → { slug, request }`
  - `mdSection(md, heading) → string`, `storyboardRows(md) → {n,time,words,style,what,example}[]`
  - `listGenerate(root, sessions) → { slug, brief, status: {phase,gate,state}, session }[]`
  - `generateDetail(root, slug, sessions) → Detail` (shape in Step 3)
  - `generateMediaPath(root, slug, file) → absolute path` (404 outside the whitelist)
  - `agent.mjs`: `buildPrompt({ mode: 'new'|'continue'|'generate'|'generate-continue', slug, notes })`

- [ ] **Step 1: Write the failing tests**

In `scripts/studio.test.mjs`:

1. Extend the imports:

```js
import { STYLES, generateOptions, listGenerate, mdSection, storyboardRows, validateRequest } from './studio/generate.mjs';
import { utimesSync } from 'node:fs';
```

2. Change `startApp` so tests can add fake tmux responses (existing callers are unaffected):

```js
async function startApp(root, overrides = {}, responses = {}) {
  const fake = fakeRun({
    'list-panes': { code: 0, stdout: 'studio-vid-b\t0\t0\tclaude\topus\thigh\t1\n', stderr: '' },
    'has-session': { code: 1, stdout: '', stderr: '' },
    ...responses,
  });
```

(the rest of `startApp` is unchanged).

3. Add the fixture and tests at the end of the file:

```js
// studioRoot plus the generate starter, voice presets, a music catalog, and a repurpose-able project
function genStudioRoot() {
  const root = studioRoot();
  mkdirSync(join(root, 'templates/dena-generate'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-generate/index.html'), '<main data-composition-id="dena-__SLUG__" data-duration="__DURATION__"></main>');
  writeFileSync(join(root, 'templates/dena-generate/hyperframes.json'), '{}');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({ version: 1, default: 'st-f2', presets: { 'st-f2': { provider: 'supertonic', voice: 'F2' }, 'gm-a': { provider: 'gemini', model: 'gemini-3.8-flash-tts' }, recorded: { provider: 'recorded' } } }));
  mkdirSync(join(root, 'shared/music'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-quiet.mp3'), 'MP3');
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify({ version: 1, tracks: [
    { id: 'm01-quiet', file: 'm01-quiet.mp3', title: 'Quiet', mood: ['reflektif'], energy: 2, duration: 90, rejected: false },
    { id: 'm02-loud', file: 'm02-loud.mp3', title: 'Loud', mood: ['upbeat'], energy: 4, duration: 60, rejected: true },
  ] }));
  writeFileSync(join(root, 'videos/vid-a/processed-transcript.json'), '{"words":[]}');
  return root;
}

// a generate project at stage 'story' (brief only) or 'gate1' (script + voiceover); later gates are reached in the
// tests through recordDecision and real files, so their fingerprints are real
function genProject(root, slug, stage) {
  const dir = join(root, 'videos', slug);
  mkdirSync(join(dir, 'research'), { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), '# Creative Brief\n\n## Workflow Settings\n\n- mode: generate\n');
  writeFileSync(join(dir, 'research/brief.md'), '# Brief (verbatim dari Dena, 2026-09-29)\n\nKenapa AI agent gagal di bisnis kecil.\n');
  writeFileSync(join(dir, 'research/request.json'), JSON.stringify({ version: 1, brief: 'x', urls: [], repurpose: null, voice: 'st-f2', duration: null, style: null, music: null }));
  if (stage === 'story') return dir;
  writeFileSync(join(dir, 'script.md'), '# Naskah\n\nHook paragraf.\n\nParagraf dua.\n\n## Fakta\n\n- tidak ada angka\n');
  writeFileSync(join(dir, 'processed-audio.wav'), 'WAV');
  utimesSync(join(dir, 'script.md'), 1000, 1000);
  utimesSync(join(dir, 'processed-audio.wav'), 1001, 1001);
  mkdirSync(join(dir, 'voice'), { recursive: true });
  writeFileSync(join(dir, 'voice/voice-meta.json'), JSON.stringify({ preset: 'st-f2', duration: 49.78, alignment: { wer: 0 } }));
  return dir;
}

test('generate options offer presets without recorded, the styles, unrejected music, and repurpose projects', () => {
  const root = genStudioRoot();
  const o = generateOptions(root);
  assert.deepEqual(o.voices, [{ name: 'st-f2', provider: 'supertonic' }, { name: 'gm-a', provider: 'gemini' }]);
  assert.equal(o.defaultVoice, 'st-f2');
  assert.deepEqual(o.styles, STYLES);
  assert.equal(STYLES.includes('mix-media'), false);
  assert.deepEqual(o.music.map((m) => m.id), ['m01-quiet']);
  assert.deepEqual(o.repurpose, ['vid-a']);
});

test('validateRequest names the bad field and creates nothing', () => {
  const root = genStudioRoot();
  const ok = { brief: 'Kenapa AI agent gagal', slug: 'ai-baru' };
  const err = (body) => { try { validateRequest(root, body); return 'ok'; } catch (e) { return `${e.status} ${e.message}`; } };
  assert.equal(err(ok), 'ok');
  assert.match(err({ ...ok, brief: '  ' }), /^400 brief:/);
  assert.match(err({ ...ok, brief: 'x'.repeat(4001) }), /^400 brief:/);
  assert.match(err({ ...ok, slug: 'Bad Slug' }), /^400 slug:/);
  assert.match(err({ ...ok, slug: 'options' }), /^400 slug:/);
  assert.match(err({ ...ok, slug: 'new' }), /^400 slug:/);
  assert.match(err({ ...ok, slug: 'vid-a' }), /^409 slug:/);
  assert.match(err({ ...ok, urls: ['ftp://x.id'] }), /^400 urls:/);
  assert.match(err({ ...ok, urls: ['https://a.id', 'https://b.id', 'https://c.id', 'https://d.id', 'https://e.id', 'https://f.id'] }), /^400 urls:/);
  assert.match(err({ ...ok, repurpose: 'vid-b' }), /^400 repurpose:/);
  assert.match(err({ ...ok, voice: 'recorded' }), /^400 voice:/);
  assert.match(err({ ...ok, duration: 25 }), /^400 duration:/);
  assert.match(err({ ...ok, duration: 45.5 }), /^400 duration:/);
  assert.match(err({ ...ok, style: 'mix-media' }), /^400 style:/);
  assert.match(err({ ...ok, music: 'm02-loud' }), /^400 music:/);
  const v = validateRequest(root, { ...ok, urls: ['https://a.id/x'], repurpose: 'vid-a', voice: 'gm-a', duration: '60', style: 'stop-motion', music: 'm01-quiet' }, { now: () => new Date('2026-09-29T08:00:00Z') });
  assert.deepEqual(v, { slug: 'ai-baru', request: { version: 1, brief: 'Kenapa AI agent gagal', urls: ['https://a.id/x'], repurpose: 'vid-a', voice: 'gm-a', duration: 60, style: 'stop-motion', music: 'm01-quiet', createdAt: '2026-09-29T08:00:00.000Z' } });
  assert.equal(existsSync(join(root, 'videos/ai-baru')), false);
});

test('mdSection and storyboardRows read the plan files', () => {
  const md = '# T\n\n## Style World\n\n- main: stop-motion\n\n### sub\n\nx\n\n## Music\n\n- m01-quiet\n';
  assert.equal(mdSection(md, 'Style World'), '- main: stop-motion\n\n### sub\n\nx');
  assert.equal(mdSection(md, 'Music'), '- m01-quiet');
  assert.equal(mdSection(md, 'Nope'), '');
  const rows = storyboardRows('| # | time | spoken words | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- |\n| 1 | 0:00.0–0:04.4 | Banyak AI | stop-motion / pop-up | Warung | `sm-08-walk-hinge` (still 2) |\n');
  assert.deepEqual(rows, [{ n: 1, time: '0:00.0–0:04.4', words: 'Banyak AI', style: 'stop-motion / pop-up', what: 'Warung', example: 'sm-08-walk-hinge (still 2)' }]);
});

test('app generate: options, create with a session, validation, and a failed session start', async (t) => {
  const root = genStudioRoot();
  const { server, call, calls } = await startApp(root);
  t.after(() => server.close());
  const opts = await call('GET', '/api/generate/options');
  assert.deepEqual(opts.body.music.map((m) => m.id), ['m01-quiet']);
  const bad = await call('POST', '/api/generate', { brief: '', slug: 'x-1', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.deepEqual([bad.status, bad.body.error.split(':')[0]], [400, 'brief']);
  assert.equal(existsSync(join(root, 'videos/x-1')), false);
  const made = await call('POST', '/api/generate', { brief: 'Kenapa AI agent gagal\ndi bisnis kecil', slug: 'ai-baru', style: 'whiteboard', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(made.status, 201);
  assert.deepEqual(made.body.session, { started: true, error: null });
  const dir = join(root, 'videos/ai-baru');
  assert.match(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), /mode: generate/);
  assert.match(readFileSync(join(dir, 'research/brief.md'), 'utf8'), /^# Brief \(verbatim dari Dena, \d{4}-\d{2}-\d{2}\)\n\nKenapa AI agent gagal\ndi bisnis kecil\n$/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'research/request.json'), 'utf8')).style, 'whiteboard');
  assert.match(readFileSync(join(root, '.studio/prompts/ai-baru.md'), 'utf8'), /^Buat video mode generate \(explainer\) di `videos\/ai-baru\/`[\s\S]*research\/request\.json[\s\S]*Jangan publish/);
  assert.ok(calls.some((c) => c[0] === 'tmux' && c[1] === 'new-session' && c.includes('studio-ai-baru')));
  assert.equal((await call('POST', '/api/generate', { brief: 'lagi', slug: 'ai-baru', runtime: 'claude', model: 'opus', effort: 'high' })).status, 409);
  const wrongEffort = await call('POST', '/api/generate', { brief: 'x', slug: 'ai-dua', runtime: 'codex', model: 'gpt-6-sol', effort: 'high' });
  assert.equal(wrongEffort.status, 400);
  assert.equal(existsSync(join(root, 'videos/ai-dua')), false);

  const failing = await startApp(genStudioRoot(), {}, { 'new-session': { code: 1, stdout: '', stderr: 'no server' } });
  t.after(() => failing.server.close());
  const kept = await failing.call('POST', '/api/generate', { brief: 'x', slug: 'ai-tiga', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(kept.status, 201);
  assert.equal(kept.body.session.started, false);
  assert.match(kept.body.session.error, /tmux new-session failed/);
});

test('app generate list, detail per gate, media whitelist, and the generate continue prompt', async (t) => {
  const root = genStudioRoot();
  genProject(root, 'g-story', 'story');
  const g1 = genProject(root, 'g-one', 'gate1');
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  const list = (await call('GET', '/api/generate')).body;
  assert.deepEqual(list.map((p) => [p.slug, p.status.phase, p.status.gate]), [['g-one', 'gate', 1], ['g-story', 'story', null]]);
  assert.equal(list[0].brief, 'Kenapa AI agent gagal di bisnis kecil.');
  const d1 = (await call('GET', '/api/generate/g-one')).body;
  assert.deepEqual([d1.status.phase, d1.status.gate, d1.status.state, d1.status.voiceStale], ['gate', 1, 'waiting', false]);
  assert.deepEqual(d1.gate1.paragraphs, ['Hook paragraf.', 'Paragraf dua.']);
  assert.equal(d1.gate1.facts, '- tidak ada angka');
  assert.deepEqual(d1.gate1.voice, { duration: 49.78, preset: 'st-f2', wer: 0 });
  assert.equal(d1.gate1.audio, true);
  assert.equal(d1.request.voice, 'st-f2');
  assert.equal((await call('GET', '/api/generate/vid-a')).status, 404, 'an edit project is not a generate project');

  const { recordDecision } = await import('./lib/gates.mjs');
  recordDecision(g1, { gate: 1, decision: 'approve', by: 'cli' });
  mkdirSync(join(g1, 'preview'), { recursive: true });
  writeFileSync(join(g1, 'preview/storyboard-sheet.jpg'), 'JPG');
  writeFileSync(join(g1, 'storyboard.md'), '| # | time | spoken words | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- |\n| 1 | 0:00 | Halo | stop-motion / pop-up | Warung | `sm-08-walk-hinge` |\n');
  writeFileSync(join(g1, 'visual-plan.md'), '# Visual Plan\n\n## Style World\n\n- stop-motion\n\n## Music\n\n- Track: `m01-quiet` from 0\n\n## Timeline\n');
  const d2 = (await call('GET', '/api/generate/g-one')).body;
  assert.deepEqual([d2.status.gate, d2.gate2.sheets, d2.gate2.rows.length, d2.gate2.styleWorld, d2.gate2.musicTrack], [2, ['preview/storyboard-sheet.jpg'], 1, '- stop-motion', 'm01-quiet']);

  recordDecision(g1, { gate: 2, decision: 'approve', by: 'cli' });
  mkdirSync(join(g1, 'renders'), { recursive: true });
  writeFileSync(join(g1, 'renders/g-one.mp4'), 'MP4');
  writeFileSync(join(g1, 'assembly-notes.md'), '# Assembly Notes\n\n## Deviations From Plan\n\n- ov-004 strings\n\n## Verification\n\nok\n\n## Handoff Risks\n\n- CTA intonation\n');
  const d3 = (await call('GET', '/api/generate/g-one')).body;
  assert.deepEqual([d3.status.gate, d3.gate3.render, d3.gate3.deviations, d3.gate3.risks, d3.gate3.qaReport], [3, 'g-one.mp4', '- ov-004 strings', '- CTA intonation', false]);

  const audio = await fetch(`${base}/media/g-one/processed-audio.wav`);
  assert.deepEqual([audio.status, await audio.text()], [200, 'WAV']);
  assert.equal((await fetch(`${base}/media/g-one/preview/storyboard-sheet.jpg`)).status, 200);
  assert.equal((await fetch(`${base}/media/g-one/preview/other.jpg`)).status, 404);
  assert.equal((await fetch(`${base}/media/g-one/script.md`)).status, 404);
  assert.equal((await fetch(`${base}/media/g-one/renders/g-one.mp4`)).status, 404, 'renders keep their own route');
  assert.equal((await fetch(`${base}/media/g-one/g-one.mp4`)).status, 200);

  await call('POST', '/api/sessions', { slug: 'g-story', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.match(readFileSync(join(root, '.studio/prompts/g-story.md'), 'utf8'), /^Lanjutkan proyek mode generate `videos\/g-story\/`\. Jalankan `npm run video -- gate g-story`/);
});

test('buildPrompt generate modes point at request.json and the gate command', () => {
  assert.match(buildPrompt({ mode: 'generate', slug: 'a' }), /^Buat video mode generate \(explainer\) di `videos\/a\/`\. Brief Dena ada di `research\/brief\.md`/);
  const c = buildPrompt({ mode: 'generate-continue', slug: 'a', notes: 'Keputusan terakhir: Gate 1 revise — CTA' });
  assert.match(c, /npm run video -- gate a/);
  assert.match(c, /Catatan dari Dena: Keputusan terakhir: Gate 1 revise — CTA/);
  assert.match(buildPrompt({ mode: 'new', slug: 'a' }), /^Edit video project/);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test scripts/studio.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/studio/generate.mjs'`.

- [ ] **Step 3: Write `scripts/studio/generate.mjs` (part 1)**

```js
// Studio tab Generate (ADR-0026, RD-05-21..29): the form that starts a generate-mode video, the project list and
// detail the review panel shows, and the /media whitelist for its files. Gate state and decisions go through
// scripts/lib/gates.mjs, the only writer of gates.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gateStatus, isGenerate, sheetsOf } from '../lib/gates.mjs';
import { readCatalog } from '../lib/music.mjs';
import { loadVoices } from '../lib/voice/presets.mjs';
import { scriptBody, splitParagraphs } from '../lib/voice/script.mjs';
import { checkSlug, scaffold } from '../video.mjs';
import { projectSlugs } from './files.mjs';
import { HttpError } from './http.mjs';
import { projectPath, rendersOf } from './projects.mjs';

export const STYLES = ['motion-broll', 'broll-text', 'motion-graphic', 'whiteboard', 'stop-motion', 'vox', 'parallax'];
const RESERVED = new Set(['options', 'new']); // /api/generate/options and #generate/new
const MEDIA_RE = /^(processed-audio\.wav|preview\/storyboard-sheet(-\d+)?\.jpg)$/;

const readText = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
const readJsonFile = (f) => {
  try {
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  } catch {
    return null;
  }
};

export function generateDir(root, slug) {
  const dir = projectPath(root, slug);
  if (!isGenerate(dir)) throw new HttpError(404, `videos/${slug} is not a generate-mode project`);
  return dir;
}

export const readRequest = (dir) => readJsonFile(join(dir, 'research', 'request.json'));

export function generateOptions(root) {
  let voices = [];
  let defaultVoice = null;
  try {
    const v = loadVoices(root);
    voices = Object.entries(v.presets).filter(([, p]) => p.provider !== 'recorded').map(([name, p]) => ({ name, provider: p.provider }));
    defaultVoice = voices.some((x) => x.name === v.default) ? v.default : null;
  } catch {
    // no config/voices.json: the field stays empty and the agent picks
  }
  let music = [];
  try {
    music = readCatalog(root).tracks.filter((t) => !t.rejected).map((t) => ({ id: t.id, title: t.title, mood: t.mood, energy: t.energy, duration: t.duration }));
  } catch {
    // unreadable catalog: no music choice
  }
  const repurpose = projectSlugs(root).filter((s) => existsSync(join(root, 'videos', s, 'processed-transcript.json')));
  return { voices, defaultVoice, styles: STYLES, music, repurpose };
}

const empty = (v) => v === undefined || v === null || v === '';

export function validateRequest(root, b = {}, { now = () => new Date() } = {}) {
  const bad = (field, msg) => {
    throw new HttpError(400, `${field}: ${msg}`);
  };
  const brief = typeof b.brief === 'string' ? b.brief.replace(/\r\n/g, '\n').trim() : '';
  if (!brief) bad('brief', 'wajib diisi');
  if (brief.length > 4000) bad('brief', 'maksimal 4000 karakter');
  let slug = '';
  try {
    slug = checkSlug(b.slug);
  } catch (e) {
    bad('slug', e.message);
  }
  if (RESERVED.has(slug)) bad('slug', `"${slug}" dipakai Studio`);
  if (existsSync(join(root, 'videos', slug))) throw new HttpError(409, `slug: videos/${slug} sudah ada`);
  const urls = empty(b.urls) ? [] : b.urls;
  if (!Array.isArray(urls) || urls.length > 5) bad('urls', 'maksimal 5 URL');
  for (const u of urls) {
    let p = null;
    try {
      p = new URL(String(u));
    } catch {
      bad('urls', `${u} bukan URL`);
    }
    if (p.protocol !== 'http:' && p.protocol !== 'https:') bad('urls', `${u} harus http atau https`);
  }
  const opts = generateOptions(root);
  const pick = (field, value, allowed) => {
    if (empty(value)) return null;
    if (!allowed.includes(value)) bad(field, `${value} tidak tersedia`);
    return value;
  };
  let duration = null;
  if (!empty(b.duration)) {
    duration = Number(b.duration);
    if (!Number.isInteger(duration) || duration < 30 || duration > 90) bad('duration', 'bilangan bulat 30–90 atau kosong');
  }
  const request = {
    version: 1,
    brief,
    urls: urls.map(String),
    repurpose: pick('repurpose', b.repurpose, opts.repurpose),
    voice: pick('voice', b.voice, opts.voices.map((v) => v.name)),
    duration,
    style: pick('style', b.style, STYLES),
    music: pick('music', b.music, opts.music.map((m) => m.id)),
    createdAt: now().toISOString(),
  };
  return { slug, request };
}

export function createGenerate(root, body, { now } = {}) {
  const { slug, request } = validateRequest(root, body, { now });
  const { dir } = scaffold({ slug, root, generate: true });
  writeFileSync(join(dir, 'research', 'brief.md'), `# Brief (verbatim dari Dena, ${request.createdAt.slice(0, 10)})\n\n${request.brief}\n`);
  writeFileSync(join(dir, 'research', 'request.json'), `${JSON.stringify(request, null, 2)}\n`);
  return { slug, request };
}

export function mdSection(md, heading) {
  const lines = String(md ?? '').split('\n');
  const start = lines.findIndex((l) => l.replace(/\s+$/, '') === `## ${heading}`);
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

export function storyboardRows(md) {
  return String(md ?? '').split('\n')
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .map(([n, time = '', words = '', style = '', what = '', example = '']) => ({ n: Number(n), time, words, style, what, example: example.replace(/`/g, '') }));
}

const briefLine = (dir) => {
  const line = readText(join(dir, 'research', 'brief.md')).split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) || '';
  return line.length > 140 ? `${line.slice(0, 139)}…` : line;
};
const sessionOf = (sessions, slug) => {
  const s = sessions.find((x) => x.slug === slug);
  return s ? { status: s.status, runtime: s.runtime, model: s.model } : null;
};

export function listGenerate(root, sessions = []) {
  return projectSlugs(root)
    .map((slug) => ({ slug, dir: join(root, 'videos', slug) }))
    .filter(({ dir }) => isGenerate(dir))
    .map(({ slug, dir }) => {
      let status;
      try {
        const s = gateStatus(dir, { slug });
        status = { phase: s.phase, gate: s.gate, state: s.state };
      } catch (e) {
        status = { phase: 'error', gate: null, state: null, error: e.message };
      }
      return { slug, brief: briefLine(dir), status, session: sessionOf(sessions, slug) };
    });
}

export function generateDetail(root, slug, sessions = []) {
  const dir = generateDir(root, slug);
  let status;
  try {
    status = gateStatus(dir, { slug });
  } catch (e) {
    throw new HttpError(500, e.message);
  }
  const script = readText(join(dir, 'script.md'));
  const meta = readJsonFile(join(dir, 'voice', 'voice-meta.json'));
  const plan = readText(join(dir, 'visual-plan.md'));
  const music = mdSection(plan, 'Music');
  let ids = [];
  try {
    ids = readCatalog(root).tracks.map((t) => t.id);
  } catch {
    // no catalog: no music preview
  }
  const notes = readText(join(dir, 'assembly-notes.md'));
  const render = rendersOf(root, slug).includes(`${slug}.mp4`) ? `${slug}.mp4` : null;
  return {
    slug,
    brief: briefLine(dir),
    request: readRequest(dir),
    status,
    session: sessionOf(sessions, slug),
    gate1: {
      script,
      paragraphs: splitParagraphs(scriptBody(script)),
      facts: mdSection(script, 'Fakta'),
      voice: meta ? { duration: meta.duration ?? null, preset: meta.preset ?? null, wer: meta.alignment?.wer ?? null } : null,
      audio: existsSync(join(dir, 'processed-audio.wav')),
    },
    gate2: {
      sheets: sheetsOf(dir),
      rows: storyboardRows(readText(join(dir, 'storyboard.md'))),
      styleWorld: mdSection(plan, 'Style World'),
      music,
      musicTrack: ids.find((id) => music.includes(id)) || null,
    },
    gate3: {
      render,
      deviations: mdSection(notes, 'Deviations From Plan'),
      risks: mdSection(notes, 'Handoff Risks'),
      qaReport: existsSync(join(dir, 'qa-report.md')),
    },
  };
}

// RD-05-24: only the voiceover and the storyboard sheets; renders keep /media/<slug>/<file> (results.mjs).
export function generateMediaPath(root, slug, file) {
  const dir = generateDir(root, slug);
  if (!MEDIA_RE.test(file) || !existsSync(join(dir, file))) throw new HttpError(404, 'not found');
  return join(dir, file);
}
```

- [ ] **Step 4: Extend `buildPrompt` in `scripts/studio/agent.mjs`**

Replace the whole `buildPrompt` function with:

```js
const GENERATE_DOC = '`docs/agents/references/generate-mode.md`';

export function buildPrompt({ mode, slug, notes }) {
  const note = String(notes ?? '').trim() || '-';
  const first = {
    continue: `Lanjutkan proyek \`videos/${slug}/\` (sumber di \`sources.json\`). Baca artefak yang sudah ada, tentukan fase terakhir yang selesai, lalu lanjutkan sesuai ${SKILL}.`,
    new: `Edit video project \`videos/${slug}/\` dari sumber di \`videos/${slug}/sources.json\` (jalankan \`npm run video -- sources ${slug}\` dulu). Gunakan style yang sudah ada; serahkan ke agent Story untuk memilih dan memastikan hasil editing videonya bagus.`,
    // ADR-0026: Studio types gate answers into this session; they are already in gates.json
    generate: `Buat video mode generate (explainer) di \`videos/${slug}/\`. Brief Dena ada di \`research/brief.md\`; pilihannya di \`research/request.json\` — pilihan yang terisi wajib dipakai, yang kosong kamu tentukan. Ikuti ${SKILL} dan ${GENERATE_DOC}. Berhenti di Gate 1 (naskah + suara), Gate 2 (storyboard), dan Gate 3 (render); keputusan Dena datang sebagai pesan "Gate N disetujui dari Studio …" atau "Gate N revisi dari Studio: …" dan sudah tercatat di \`gates.json\`.`,
    'generate-continue': `Lanjutkan proyek mode generate \`videos/${slug}/\`. Jalankan \`npm run video -- gate ${slug}\` untuk posisi dan keputusan terakhir, baca artefak yang sudah ada, lalu lanjutkan sesuai ${SKILL} dan ${GENERATE_DOC}. Keputusan Dena dari Studio sudah tercatat di \`gates.json\`.`,
  }[mode];
  if (!first) throw new Error(`unknown prompt mode ${mode}`);
  return `${first}\nCatatan dari Dena: ${note}\nJangan publish ke Repliz — publish dilakukan Dena dari Studio.\n`;
}
```

- [ ] **Step 5: Wire the routes in `scripts/studio/app.mjs`**

1. Imports — add:

```js
import { isGenerate } from '../lib/gates.mjs';
import { createGenerate, generateDetail, generateMediaPath, generateOptions, listGenerate } from './generate.mjs';
```

2. Inside `createApp`, before `const routes = [`, add the shared model check (used by `/api/sessions` and `/api/generate`):

```js
  const checkModel = async (b) => {
    const known = (await models())[b.runtime]?.models?.find((m) => m.value === b.model);
    if (known && !known.efforts.includes(b.effort)) throw new HttpError(400, `${b.model} supports effort ${known.efforts.join(', ')}`);
  };
```

3. In the `POST /api/sessions` route, replace the two lines

```js
      const known = (await models())[b.runtime]?.models?.find((m) => m.value === b.model);
      if (known && !known.efforts.includes(b.effort)) throw new HttpError(400, `${b.model} supports effort ${known.efforts.join(', ')}`);
      const mode = existsSync(join(dir, 'creative-brief.md')) ? 'continue' : 'new';
```

with

```js
      await checkModel(b);
      const mode = isGenerate(dir) ? 'generate-continue' : existsSync(join(dir, 'creative-brief.md')) ? 'continue' : 'new';
```

4. Add these routes to the `routes` array directly before `['GET', /^\/api\/results$/, …]`:

```js
    ['GET', /^\/api\/generate$/, async () => listGenerate(root, await listSessions(opt))],
    ['GET', /^\/api\/generate\/options$/, async () => generateOptions(root)],
    ['POST', /^\/api\/generate$/, async (req, url, m, res) => {
      const b = await readJson(req);
      await checkModel(b);
      const { slug } = createGenerate(root, b);
      let session = { started: true, error: null };
      try {
        await startSession({ root, slug, runtime: b.runtime, model: b.model, effort: b.effort, prompt: buildPrompt({ mode: 'generate', slug }), ...opt });
      } catch (e) {
        session = { started: false, error: e.message }; // the project stays; the panel offers "Mulai sesi"
      }
      sendJson(res, 201, { slug, session });
      return RAW;
    }],
    ['GET', /^\/api\/generate\/([^/]+)$/, async (req, url, [slug]) => generateDetail(root, slugParam(slug), await listSessions(opt))],
    ['GET', /^\/media\/([^/]+)\/(processed-audio\.wav|preview\/storyboard-sheet(?:-\d+)?\.jpg)$/, async (req, url, [slug, file], res) => {
      sendFile(req, res, generateMediaPath(root, slugParam(slug), file));
      return RAW;
    }],
```

(The new `/media/…` route must stay above the existing `['GET', /^\/media\/([^/]+)\/([^/]+)$/, …]` route: `processed-audio.wav` would otherwise reach `renderPath` and get a 404.)

`createGenerate` throws before `scaffold` for every validation error, so a 400/409 creates nothing; `checkModel` runs before it for the same reason.

- [ ] **Step 6: Run to see them pass**

Run: `npm run test:studio`
Expected: all pass (32 previous + 6 new = 38).

- [ ] **Step 7: Write the RD-05 criteria**

Append to `internal/docs/requirements/rd-05-studio.md`:

```md
- **RD-05-21** (Event-driven) — When Dena opens the Generate tab, Studio shall list every
  project whose `creative-brief.md` sets `mode: generate` with its position from
  `scripts/lib/gates.mjs`, the first line of `research/brief.md`, and its session status
  (ADR-0026).
- **RD-05-22** (Event-driven) — When Dena submits the Generate form, Studio shall validate
  every field before writing anything — brief 1–4000 characters; slug valid, not `options` or
  `new`, not taken; at most 5 `http:`/`https:` URLs; repurpose, voice preset (not `recorded`),
  style (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`,
  `parallax`), and music (an unrejected catalog track) from the options Studio offers;
  duration an integer 30–90 or empty — then scaffold `videos/<slug>/` in generate mode, write
  `research/brief.md` (the brief verbatim) and `research/request.json`, and start
  `studio-<slug>` with the generate prompt.
- **RD-05-23** (Unwanted) — If a Generate form field is invalid, then Studio shall answer 400
  naming the field (409 for a taken slug) and create nothing; if the session cannot start,
  Studio shall keep the project and report why.
- **RD-05-24** (Event-driven) — When Dena opens a generate project, Studio shall show the
  artifacts of its current gate (Gate 1: voiceover player, duration, preset, WER, script
  paragraphs with `## Fakta`; Gate 2: storyboard sheets, `storyboard.md` rows, `## Style World`
  and `## Music` of `visual-plan.md` with the named catalog track; Gate 3: the render and
  "Deviations From Plan" / "Handoff Risks" of `assembly-notes.md`) and serve under
  `/media/<slug>/` only `processed-audio.wav`, `preview/storyboard-sheet[-N].jpg`, and the
  project's renders.
```

- [ ] **Step 8: Commit**

```bash
git add scripts/studio/generate.mjs scripts/studio/agent.mjs scripts/studio/app.mjs scripts/studio.test.mjs internal/docs/requirements/rd-05-studio.md
git commit -m "feat(studio): Generate form backend, list, per-gate detail, media whitelist (RD-05-21..24)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Studio — decisions, session start, script edit, voice job

**Files:**
- Create: `scripts/studio/jobs.mjs`
- Modify: `scripts/studio/results.mjs` (`Publisher` onto `JobRunner`)
- Modify: `scripts/studio/generate.mjs` (part 2)
- Modify: `scripts/studio/app.mjs` (routes, `voiceJobs` option)
- Modify: `scripts/studio.mjs` (construct `VoiceJobs`)
- Modify: `scripts/studio.test.mjs`
- Modify: `internal/docs/requirements/rd-05-studio.md` (RD-05-25…28)

**Interfaces:**
- Consumes: `recordDecision`, `readGates`, `gateStatus`, `editedSinceDecision`, `GateError` (Task 1); `generateDir`, `readRequest` (Task 3); `listSessions`, `sessionName`, `startSession`, `killSession` (`sessions.mjs`); `buildPrompt` `generate-continue` (Task 3).
- Produces:
  - `jobs.mjs`: `class JobRunner({ spawnImpl, label })` with `has(key)`, `running(key)`, `start(key, cmd, args, opts)`, `follow(key, listener) → unfollow`.
  - `generate.mjs`: `gateMessage({ gate, decision, note, edited }) → string`; `decide(root, slug, body, { run, now }) → { recorded, sent, error }`; `saveScript(root, slug, text, { run, now }) → status`; `lastDecisionNote(dir) → string`; `class VoiceJobs({ root, env, spawnImpl })` with `has`, `running`, `start(slug)`, `follow`.
  - Routes: `POST /api/generate/<slug>/decision`, `PUT /api/generate/<slug>/script`, `POST /api/generate/<slug>/voice`, `GET /api/generate/<slug>/voice/stream`, `POST /api/generate/<slug>/session`.

- [ ] **Step 1: Write the failing tests**

Add to the imports of `scripts/studio.test.mjs`:

```js
import { JobRunner } from './studio/jobs.mjs';
import { VoiceJobs, gateMessage } from './studio/generate.mjs';
import { readGates, recordDecision as record } from './lib/gates.mjs';
```

In `startApp`, add `voiceJobs: new VoiceJobs({ root, env: {}, spawnImpl: () => fakeChild() }),` next to the `publisher` line.

Append the tests:

```js
test('JobRunner keeps one job per key and replays its log', () => {
  const spawned = [];
  const r = new JobRunner({ spawnImpl: (cmd, args, opts) => { const c = fakeChild(); spawned.push({ cmd, args, opts, c }); return c; }, label: 'voice' });
  r.start('a', 'node', ['x'], { cwd: '/tmp' });
  assert.equal(r.running('a'), true);
  assert.throws(() => r.start('a', 'node', ['x'], {}), { status: 409, message: 'voice for a is already running' });
  spawned[0].c.stderr.emit('data', Buffer.from('warn\n'));
  const seen = [];
  r.follow('a', (e, d) => seen.push([e, d]));
  spawned[0].c.emit('close', 2);
  assert.deepEqual(seen, [['log', 'warn\n'], ['done', { code: 2 }]]);
  assert.equal(r.running('a'), false);
  assert.throws(() => r.follow('b', () => {}), { status: 404, message: 'no voice job' });
});

test('gateMessage is one line, strips control characters, and fits 1000 characters', () => {
  assert.equal(gateMessage({ gate: 1, decision: 'approve' }), 'Gate 1 disetujui dari Studio. Catatan: -. Lanjutkan ke fase berikutnya.');
  assert.equal(gateMessage({ gate: 2, decision: 'revise', note: 'scene 4\n\u001b[2Jlebih pendek' }), 'Gate 2 revisi dari Studio: scene 4 [2Jlebih pendek. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate 2.');
  assert.match(gateMessage({ gate: 3, decision: 'qa' }), /^Gate 3: Dena memilih QA dulu\. Jalankan fase QA/);
  assert.match(gateMessage({ gate: 1, decision: 'approve', edited: true }), /^Naskah diedit Dena di Studio dan suaranya sudah dibuat ulang; baca ulang script\.md\. Gate 1 disetujui/);
  const long = gateMessage({ gate: 1, decision: 'revise', note: 'x'.repeat(3000) });
  assert.equal(long.length, 1000);
  assert.match(long, /…\. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate 1\.$/);
});

const idlePanes = (slug) => ({ 'list-panes': { code: 0, stdout: `studio-${slug}\t1\t0\tclaude\topus\thigh\t1\n`, stderr: '' } });
const busyPanes = (slug) => ({ 'list-panes': { code: 0, stdout: `studio-${slug}\t${Math.floor(Date.now() / 1000)}\t0\tclaude\topus\thigh\t1\n`, stderr: '' } });

test('app generate decision: records, types one literal line into the session, and refuses stale or busy', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  const app = await startApp(root, {}, idlePanes('g-one'));
  t.after(() => app.server.close());
  const fp = (await app.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: { 'script.md': 'x' } })).status, 409);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 2, decision: 'approve', fingerprint: fp })).status, 409);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'revise', note: '', fingerprint: fp })).status, 400);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve' })).status, 400, 'fingerprint is required');
  app.calls.length = 0;
  const ok = await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'revise', note: 'CTA\nkurang natural', fingerprint: fp });
  assert.deepEqual([ok.status, ok.body.sent, ok.body.recorded.by, ok.body.recorded.note], [200, true, 'studio', 'CTA\nkurang natural']);
  const typed = app.calls.filter((c) => c[1] === 'send-keys');
  assert.deepEqual(typed, [
    ['tmux', 'send-keys', '-t', '=studio-g-one:', '-l', 'Gate 1 revisi dari Studio: CTA kurang natural. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate 1.'],
    ['tmux', 'send-keys', '-t', '=studio-g-one:', 'Enter'],
  ]);
  assert.equal(readGates(dir).log.length, 1);

  const busy = await startApp(root, {}, busyPanes('g-one'));
  t.after(() => busy.server.close());
  assert.equal((await busy.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp })).status, 409);

  const none = await startApp(root, {}, { 'list-panes': { code: 1, stdout: '', stderr: 'no server' } });
  t.after(() => none.server.close());
  const noSession = await none.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp });
  assert.deepEqual([noSession.status, noSession.body.sent], [200, false]);
  assert.match(noSession.body.error, /tidak ada sesi/);
  assert.equal(readGates(dir).log.at(-1).decision, 'approve');
});

test('app generate script edit, voice job, and the edited-script message', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  const spawned = [];
  const voiceJobs = new VoiceJobs({ root, env: {}, spawnImpl: (cmd, args, opts) => { const c = fakeChild(); spawned.push({ cmd, args, opts, c }); return c; } });
  const busyApp = await startApp(root, { voiceJobs }, busyPanes('g-one'));
  t.after(() => busyApp.server.close());
  assert.equal((await busyApp.call('PUT', '/api/generate/g-one/script', { text: '# Naskah\n\nx\n' })).status, 409, 'agent is busy');
  assert.equal((await busyApp.call('POST', '/api/generate/g-one/voice')).status, 409, 'agent is busy');

  const app = await startApp(root, { voiceJobs }, idlePanes('g-one'));
  t.after(() => app.server.close());
  const put = (text) => app.call('PUT', '/api/generate/g-one/script', { text });
  assert.equal((await put('x'.repeat(20481))).status, 413);
  assert.equal((await put('# Naskah\n\n## Fakta\n\n- a\n')).status, 400, 'no narration');
  const saved = await put('# Naskah\n\nHook baru.\n\n## Fakta\n\n- a\n');
  assert.equal(saved.status, 200);
  assert.equal(saved.body.voiceStale, true);
  assert.equal(readFileSync(join(dir, 'script.md'), 'utf8'), '# Naskah\n\nHook baru.\n\n## Fakta\n\n- a\n');
  assert.equal(readGates(dir).log.at(-1).decision, 'edit');
  const fp = (await app.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp })).status, 409, 'voice is stale');

  assert.equal((await app.call('POST', '/api/generate/g-one/voice')).status, 200);
  assert.deepEqual(spawned[0].args, ['scripts/video.mjs', 'voice', 'g-one', '--preset', 'st-f2']);
  assert.equal(spawned[0].opts.cwd, root);
  assert.equal((await app.call('POST', '/api/generate/g-one/voice')).status, 409, 'one voice job per project');
  spawned[0].c.emit('close', 0);
  writeFileSync(join(dir, 'processed-audio.wav'), 'WAV2'); // what video voice writes
  const fp2 = (await app.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  app.calls.length = 0;
  const ok = await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp2 });
  assert.equal(ok.status, 200);
  assert.match(app.calls.find((c) => c.includes('-l')).at(-1), /^Naskah diedit Dena di Studio/);
  assert.equal((await put('# Naskah\n\nLagi.\n')).status, 409, 'Gate 1 is approved: no more script edits');
});

test('app generate continue session carries the last decision', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  record(dir, { gate: 1, decision: 'revise', note: 'hook terlalu panjang', by: 'studio' });
  const app = await startApp(root);
  t.after(() => app.server.close());
  const s = await app.call('POST', '/api/generate/g-one/session', { runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(s.status, 200);
  const prompt = readFileSync(join(root, '.studio/prompts/g-one.md'), 'utf8');
  assert.match(prompt, /^Lanjutkan proyek mode generate/);
  assert.match(prompt, /Catatan dari Dena: Keputusan terakhir: Gate 1 revise — hook terlalu panjang \(studio, /);
  assert.equal((await app.call('POST', '/api/generate/vid-a/session', { runtime: 'claude', model: 'opus', effort: 'high' })).status, 404);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test scripts/studio.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/studio/jobs.mjs'`.

- [ ] **Step 3: Write `scripts/studio/jobs.mjs`**

```js
// Studio background jobs (Repliz publish, generate voice): one child process per key, its log kept so a viewer who
// joins late sees everything (ADR-0020, ADR-0026).
import { spawn } from 'node:child_process';
import { HttpError } from './http.mjs';

export class JobRunner {
  constructor({ spawnImpl = spawn, label = 'job' } = {}) {
    this.spawn = spawnImpl;
    this.label = label;
    this.jobs = new Map();
  }

  has(key) {
    return this.jobs.has(key);
  }

  running(key) {
    const job = this.jobs.get(key);
    return Boolean(job && job.code === null);
  }

  start(key, cmd, args, opts) {
    if (this.running(key)) throw new HttpError(409, `${this.label} for ${key} is already running`);
    const job = { log: [], code: null, listeners: new Set() };
    this.jobs.set(key, job);
    const emit = (event, data) => {
      if (event === 'log') job.log.push(data);
      for (const f of job.listeners) f(event, data);
    };
    const child = this.spawn(cmd, args, opts);
    child.stdout.on('data', (d) => emit('log', String(d)));
    child.stderr.on('data', (d) => emit('log', String(d)));
    child.on('error', (e) => emit('log', `${e.message}\n`));
    child.on('close', (code) => {
      job.code = code ?? 1;
      emit('done', { code: job.code });
      job.listeners.clear();
    });
    return job;
  }

  follow(key, listener) {
    const job = this.jobs.get(key);
    if (!job) throw new HttpError(404, `no ${this.label} job`);
    for (const line of job.log) listener('log', line);
    if (job.code !== null) {
      listener('done', { code: job.code });
      return () => {};
    }
    job.listeners.add(listener);
    return () => job.listeners.delete(listener);
  }
}
```

- [ ] **Step 4: Move `Publisher` onto `JobRunner` in `scripts/studio/results.mjs`**

Replace the `Publisher` class with:

```js
export class Publisher {
  constructor({ root, env = process.env, spawnImpl = spawn }) {
    this.root = root;
    this.env = env;
    this.runner = new JobRunner({ spawnImpl, label: 'publish' });
  }

  has(slug) {
    return this.runner.has(slug);
  }

  start(slug, file) {
    renderPath(this.root, slug, file);
    return this.runner.start(slug, process.execPath, ['scripts/repliz-publish.mjs', '--slug', `videos/${slug}`, '--file', `videos/${slug}/renders/${file}`, '--approved'], { cwd: this.root, env: this.env });
  }

  follow(slug, listener) {
    return this.runner.follow(slug, listener);
  }
}
```

and add `import { JobRunner } from './jobs.mjs';` to its imports. The error texts stay `publish for <slug> is already running` and `no publish job`.

- [ ] **Step 5: Add part 2 to `scripts/studio/generate.mjs`**

Change its import block to (adds `spawn`, `renameSync`, the gate writers, `JobRunner`, and the session helpers):

```js
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GateError, editedSinceDecision, gateStatus, isGenerate, readGates, recordDecision, sheetsOf } from '../lib/gates.mjs';
import { readCatalog } from '../lib/music.mjs';
import { loadVoices } from '../lib/voice/presets.mjs';
import { scriptBody, splitParagraphs } from '../lib/voice/script.mjs';
import { checkSlug, scaffold } from '../video.mjs';
import { projectSlugs } from './files.mjs';
import { HttpError } from './http.mjs';
import { JobRunner } from './jobs.mjs';
import { projectPath, rendersOf } from './projects.mjs';
import { listSessions, runFile, sessionName } from './sessions.mjs';
```

Append:

```js
// ---- decisions (RD-05-25..26) ----
const GATE_STATUS = { stale: 409, 'not-waiting': 409, 'voice-stale': 409, 'note-required': 400, 'bad-decision': 400, 'bad-note': 400, 'bad-gate': 400, 'not-generate': 404, 'bad-file': 500 };

function asHttp(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GateError) throw new HttpError(GATE_STATUS[e.code] ?? 400, e.message);
    throw e;
  }
}

const oneLine = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const MAX_MESSAGE = 1000;

export function gateMessage({ gate, decision, note = '', edited = false }) {
  const build = (n) => {
    let text;
    if (decision === 'approve') text = `Gate ${gate} disetujui dari Studio. Catatan: ${n || '-'}. Lanjutkan ke fase berikutnya.`;
    else if (decision === 'revise') text = `Gate ${gate} revisi dari Studio: ${n}. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate ${gate}.`;
    else if (decision === 'qa') text = `Gate 3: Dena memilih QA dulu${n ? ` (${n})` : ''}. Jalankan fase QA (docs/agents/04-qa.md) sebagai subagent baru, lalu kembali ke Gate 3.`;
    else throw new Error(`no message for decision ${decision}`);
    return edited && gate === 1 ? `Naskah diedit Dena di Studio dan suaranya sudah dibuat ulang; baca ulang script.md. ${text}` : text;
  };
  const n = oneLine(note);
  const full = build(n);
  if (full.length <= MAX_MESSAGE) return full;
  return build(`${n.slice(0, n.length - (full.length - MAX_MESSAGE) - 1)}…`); // shorten the note, keep the instruction
}

const sessionFor = async (slug, run) => (await listSessions(run ? { run } : {})).find((s) => s.slug === slug);
const refuseBusy = (session) => {
  if (session?.status === 'running') throw new HttpError(409, 'agent sedang bekerja; tunggu sampai ia berhenti di gate');
};

export async function decide(root, slug, body = {}, { run, now } = {}) {
  const dir = generateDir(root, slug);
  const gate = Number(body.gate);
  if (![1, 2, 3].includes(gate)) throw new HttpError(400, 'gate must be 1, 2, or 3');
  if (!['approve', 'revise', 'qa'].includes(body.decision)) throw new HttpError(400, 'decision must be approve, revise, or qa');
  if (!body.fingerprint || typeof body.fingerprint !== 'object') throw new HttpError(400, 'fingerprint is required (reload the panel)');
  const session = await sessionFor(slug, run);
  refuseBusy(session);
  const edited = gate === 1 && editedSinceDecision(asHttp(() => readGates(dir)).log, 1);
  const recorded = asHttp(() => recordDecision(dir, { gate, decision: body.decision, note: body.note, by: 'studio', fingerprint: body.fingerprint, ...(now ? { now } : {}) }));
  if (!session || session.status === 'exited') return { recorded, sent: false, error: 'tidak ada sesi agent; mulai sesi lanjut' };
  const text = gateMessage({ gate, decision: body.decision, note: recorded.note, edited });
  const target = `=${sessionName(slug)}:`;
  const exec = run || runFile;
  const typed = await exec('tmux', ['send-keys', '-t', target, '-l', text]);
  const entered = typed.code === 0 ? await exec('tmux', ['send-keys', '-t', target, 'Enter']) : typed;
  if (entered.code !== 0) return { recorded, sent: false, error: `tmux send-keys gagal: ${String(entered.stderr || '').trim()}` };
  return { recorded, sent: true, error: null };
}

// ---- script edit (RD-05-27) ----
export async function saveScript(root, slug, text, { run, now } = {}) {
  const dir = generateDir(root, slug);
  if (typeof text !== 'string') throw new HttpError(400, 'text must be a string');
  if (Buffer.byteLength(text) > 20480) throw new HttpError(413, 'naskah maksimal 20 KB');
  if (!scriptBody(text).trim()) throw new HttpError(400, 'naskah tanpa narasi (teks sebelum ## pertama kosong)');
  const status = asHttp(() => gateStatus(dir, { slug }));
  if (status.phase !== 'gate' || status.gate !== 1) throw new HttpError(409, 'naskah hanya bisa diedit di Gate 1');
  refuseBusy(await sessionFor(slug, run));
  const file = join(dir, 'script.md');
  writeFileSync(`${file}.part`, text.endsWith('\n') ? text : `${text}\n`);
  renameSync(`${file}.part`, file);
  asHttp(() => recordDecision(dir, { gate: 1, decision: 'edit', note: 'naskah diedit di Studio', by: 'studio', ...(now ? { now } : {}) }));
  return gateStatus(dir, { slug });
}

// ---- continue session (RD-05-28) ----
export function lastDecisionNote(dir) {
  const last = readGates(dir).log.at(-1);
  return last ? `Keputusan terakhir: Gate ${last.gate} ${last.decision}${last.note ? ` — ${last.note}` : ''} (${last.by}, ${last.at}).` : '';
}

// ---- voice job (RD-05-27) ----
export class VoiceJobs {
  constructor({ root, env = process.env, spawnImpl = spawn }) {
    this.root = root;
    this.env = env;
    this.runner = new JobRunner({ spawnImpl, label: 'voice' });
  }

  has(slug) {
    return this.runner.has(slug);
  }

  running(slug) {
    return this.runner.running(slug);
  }

  // video voice reads .env itself; its own child processes stay without Gemini keys (RD-06-25)
  start(slug) {
    const preset = readRequest(generateDir(this.root, slug))?.voice || null;
    return this.runner.start(slug, process.execPath, ['scripts/video.mjs', 'voice', slug, ...(preset ? ['--preset', preset] : [])], { cwd: this.root, env: this.env });
  }

  follow(slug, listener) {
    return this.runner.follow(slug, listener);
  }
}
```

- [ ] **Step 6: Wire the routes in `scripts/studio/app.mjs`**

1. `createApp` signature: add `voiceJobs` next to `publisher`:

```js
export function createApp({ root, env = {}, hosts, token = '', tools = {}, models = async () => ({}), run, terminals, publisher, voiceJobs, probe = async () => null, probeSource = probeMedia }) {
```

2. Extend the `./generate.mjs` import with `decide, generateDir, lastDecisionNote, saveScript`, and add `import { gateStatus } from '../lib/gates.mjs';` (merge with the `isGenerate` import).

3. Add these routes directly after `['GET', /^\/api\/generate\/([^/]+)$/, …]`:

```js
    ['POST', /^\/api\/generate\/([^/]+)\/decision$/, async (req, url, [slug]) => decide(root, slugParam(slug), await readJson(req), opt)],
    ['PUT', /^\/api\/generate\/([^/]+)\/script$/, async (req, url, [slug]) => saveScript(root, slugParam(slug), (await readJson(req, 65536)).text, opt)],
    ['POST', /^\/api\/generate\/([^/]+)\/voice$/, async (req, url, [slug]) => {
      const dir = generateDir(root, slugParam(slug));
      const s = gateStatus(dir, { slug });
      if (s.phase !== 'gate' || s.gate !== 1) throw new HttpError(409, 'suara hanya dibuat ulang di Gate 1');
      if ((await listSessions(opt)).find((x) => x.slug === slug)?.status === 'running') throw new HttpError(409, 'agent sedang bekerja; tunggu sampai ia berhenti di gate');
      voiceJobs.start(slug);
      return { ok: true };
    }],
    ['GET', /^\/api\/generate\/([^/]+)\/voice\/stream$/, async (req, url, [slug], res) => {
      if (!voiceJobs.has(slugParam(slug))) throw new HttpError(404, 'no voice job');
      const sse = openSse(res);
      const unfollow = voiceJobs.follow(slug, (event, data) => {
        sse.send(event, data);
        if (event === 'done') sse.end();
      });
      sse.onClose(unfollow);
      return RAW;
    }],
    ['POST', /^\/api\/generate\/([^/]+)\/session$/, async (req, url, [slug]) => {
      const dir = generateDir(root, slugParam(slug));
      const b = await readJson(req);
      await checkModel(b);
      const prior = (await listSessions(opt)).find((s) => s.slug === slug);
      if (prior?.status === 'exited') await killSession(slug, opt);
      return startSession({ root, slug, runtime: b.runtime, model: b.model, effort: b.effort, prompt: buildPrompt({ mode: 'generate-continue', slug, notes: lastDecisionNote(dir) }), ...opt });
    }],
```

4. In `scripts/studio.mjs`, import `VoiceJobs` from `./studio/generate.mjs` and pass `voiceJobs: new VoiceJobs({ root, env }),` next to `publisher: new Publisher({ root, env }),`.

- [ ] **Step 7: Run to see them pass**

Run: `npm run test:studio`
Expected: all pass (38 + 5 = 43).

- [ ] **Step 8: Write the RD-05 criteria**

Append to `internal/docs/requirements/rd-05-studio.md`:

```md
- **RD-05-25** (Event-driven) — When Dena approves, revises, or asks for QA in the Generate
  panel, Studio shall record the decision through `scripts/lib/gates.mjs` with the
  fingerprint the panel showed, then type one line into `studio-<slug>` with
  `tmux send-keys -l` followed by `Enter` (control characters removed, at most 1000
  characters; a long note is shortened, the instruction is kept).
- **RD-05-26** (Unwanted) — If the fingerprint is missing or differs from the files, the gate
  is not waiting, a revision has no note, or the session is busy (`running`), then Studio
  shall refuse the decision (409, or 400 for a missing note or fingerprint) without
  recording it; without a live session it shall record the decision and answer
  `sent: false` with the reason.
- **RD-05-27** (Event-driven) — When Dena saves an edited script at Gate 1 while the session
  is not busy, Studio shall write `script.md` atomically (at most 20 KB, narration not empty)
  and log an `edit` entry; approval stays refused until "Buat ulang suara" — one
  `video voice <slug> [--preset <request.voice>]` job per project with a live log, refused
  while the session is busy or outside Gate 1 — makes the voiceover newer than the script;
  the next Gate 1 message tells the agent the script was edited.
- **RD-05-28** (Event-driven) — When a session starts for a generate project (Generate panel
  or Sessions tab), Studio shall use the generate continue prompt, which runs
  `npm run video -- gate <slug>` first; from the panel it also carries the last decision.
```

- [ ] **Step 9: Commit**

```bash
git add scripts/studio/jobs.mjs scripts/studio/results.mjs scripts/studio/generate.mjs scripts/studio/app.mjs scripts/studio.mjs scripts/studio.test.mjs internal/docs/requirements/rd-05-studio.md
git commit -m "feat(studio): gate decisions typed into the session, script edit, voice job, continue session (RD-05-25..28)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Generate tab UI

**Files:**
- Modify: `scripts/studio/public/index.html` (nav button, section, two dialogs, script tag)
- Create: `scripts/studio/public/generate.js`
- Modify: `scripts/studio/public/app.js` (expose helpers, tab list, refresh hook, hash boot)
- Modify: `scripts/studio/public/app.css`
- Modify: `scripts/studio/app.mjs` (`STATIC` gets `/generate.js`)
- Modify: `internal/docs/requirements/rd-05-studio.md` (RD-05-29), `CLAUDE.md`, `AGENTS.md` (`npm run studio` line), `internal/docs/entrypoints/rd.md` (RD-05 one-liner)

**Interfaces:**
- Consumes: all Task 3/4 routes; existing `openTerminal(slug)`, `api`, `post`, `esc`, `enc`, `banner`, `dur`, `when`, `state`.
- Produces: `window.studio` (helpers for `generate.js`) and `window.studioGenerate = { refresh, home, open(slugOrNew) }`; hashes `#generate`, `#generate/new`, `#generate/<slug>`.

- [ ] **Step 1: `index.html`**

1. In `<nav>`, directly after the Projects button, add `<button data-tab="generate">Generate</button>`.
2. After `</section>` of `#tab-projects`, add:

```html
  <section id="tab-generate" hidden>
    <div id="gen-home">
      <div class="bar"><button id="gen-new" class="primary">Buat video</button></div>
      <ul id="gen-list" class="list"></ul>
    </div>
    <div id="gen-detail" class="gen-panel" hidden>
      <div id="gen-head" class="gen-head"></div>
      <div id="gen-body" class="gen-body"></div>
      <details id="gen-history" class="gen-card"><summary>Riwayat keputusan</summary><ol id="gen-history-list"></ol></details>
      <div id="gen-actions" class="gen-actions"></div>
    </div>
  </section>
```

3. After the `#publish-dialog` dialog, add:

```html
<dialog id="gen-dialog">
  <form method="dialog" id="gen-form">
    <h2>Buat video generate</h2>
    <label>Brief (wajib) <textarea name="brief" rows="5" maxlength="4000" required placeholder="Topik, sudut pandang, poin yang wajib ada"></textarea></label>
    <label>Slug <input name="slug" required pattern="[a-z0-9][a-z0-9\-]*" autocapitalize="off" autocomplete="off"></label>
    <details><summary>Opsional (kosong = agent yang pilih)</summary>
      <label>URL sumber (satu per baris, maks 5) <textarea name="urls" rows="2" autocapitalize="off"></textarea></label>
      <label>Repurpose dari proyek <select name="repurpose"></select></label>
      <label>Preset suara <select name="voice"></select></label>
      <label>Durasi (detik, 30–90) <input name="duration" type="number" min="30" max="90" step="1" placeholder="otomatis"></label>
      <label>Style utama <select name="style"></select></label>
      <label>Musik <select name="music"></select></label>
    </details>
    <label>Runtime <select name="runtime"><option value="claude">Claude</option><option value="codex">Codex</option></select></label>
    <label>Model <select name="model" required></select></label>
    <label>Effort <select name="effort"></select></label>
    <p class="error" id="gen-error"></p>
    <menu><button value="cancel" formnovalidate>Batal</button><button value="create" class="primary">Buat &amp; mulai agent</button></menu>
  </form>
</dialog>

<dialog id="gen-note-dialog">
  <form method="dialog" id="gen-note-form">
    <h2 id="gen-note-title"></h2>
    <label id="gen-note-label">Catatan <textarea name="note" rows="4" maxlength="2000"></textarea></label>
    <p class="error" id="gen-note-error"></p>
    <menu><button value="cancel" formnovalidate>Batal</button><button value="send" class="primary">Kirim</button></menu>
  </form>
</dialog>
```

4. After `<script src="/app.js"></script>`, add `<script src="/generate.js"></script>`.

- [ ] **Step 2: `app.js` hooks**

1. In `showTab`, add as the first line: `if (name === 'generate' && tab === 'generate') window.studioGenerate?.home();` and add `'generate'` to the list: `for (const t of ['projects', 'generate', 'shared', 'sessions', 'results', 'voice', 'music'])`.
2. In `refresh`, after the `projects` block, add: `if (tab === 'generate') await window.studioGenerate.refresh();`.
3. Just above `// ---- Boot ----`, add:

```js
// Helpers for generate.js (ADR-0026).
window.studio = { $, api, post, esc, enc, banner, dur, when, openTerminal, state: () => state, tab: () => tab, termOpen: () => !$('#term-panel').hidden };
```

4. In the boot IIFE, replace the single `refresh();` line with:

```js
  const deep = /^#generate(?:\/([a-z0-9][a-z0-9-]*))?$/.exec(location.hash);
  if (deep) {
    tab = 'generate';
    for (const b of document.querySelectorAll('nav button')) b.classList.toggle('active', b.dataset.tab === 'generate');
    for (const t of ['projects', 'generate', 'shared', 'sessions', 'results', 'voice', 'music']) $(`#tab-${t}`).hidden = t !== 'generate';
    window.studioGenerate.open(deep[1] || '');
  } else refresh();
```

5. In `scripts/studio/app.mjs`, add `'/generate.js': 'generate.js'` to `STATIC`.

- [ ] **Step 3: Write `scripts/studio/public/generate.js`**

```js
// Studio tab Generate (ADR-0026, RD-05-21..29): start a generate-mode video, then answer its gates.
// Plain JS, no build step; helpers come from app.js (window.studio).
(() => {
  const { $, api, post, esc, enc, banner, dur, openTerminal } = window.studio;
  const PHASE = { story: 'Story berjalan', 'screen-plan': 'Screen Plan berjalan', build: 'Build berjalan', done: 'Selesai', error: 'Error' };
  const STATE = { waiting: 'Menunggu', revising: 'Agent merevisi', qa: 'QA dulu' };
  let openSlug = '';
  let bodyKey = '';
  let detail = null;
  let pending = null; // { gate, decision } while the note dialog is open

  const statusText = (s) => (s.phase === 'gate' ? `${STATE[s.state] || 'Menunggu'} · Gate ${s.gate}` : PHASE[s.phase] || s.phase);
  const sessionText = (x) => (x ? x.status : 'tidak ada sesi');
  const media = (slug, file, fp) => `/media/${enc(slug)}/${file}${fp ? `?v=${enc(fp.slice(0, 12))}` : ''}`;
  const setHash = (h) => { if (location.hash !== h) history.replaceState(null, '', h); };

  async function refresh() {
    if (openSlug) renderDetail(await api(`/api/generate/${enc(openSlug)}`));
    else renderList(await api('/api/generate'));
  }

  function home() {
    openSlug = '';
    bodyKey = '';
    setHash('#generate');
  }

  function open(slug) {
    if (slug === 'new') {
      home();
      refresh().catch((e) => banner(e.message));
      openForm();
      return;
    }
    openSlug = slug;
    bodyKey = '';
    setHash(slug ? `#generate/${slug}` : '#generate');
    refresh().catch((e) => banner(e.message));
  }

  // ---- list ----
  function renderList(items) {
    $('#gen-detail').hidden = true;
    $('#gen-home').hidden = false;
    $('#gen-list').innerHTML = items.length ? items.map((p) => `
      <li>
        <div class="meta"><strong>${esc(p.slug)}</strong><span class="status ${esc(p.session?.status || '')}">${esc(statusText(p.status))}</span>
          <span class="muted">${esc(p.brief)}</span><span class="muted">Sesi: ${esc(sessionText(p.session))}</span></div>
        <div class="actions"><button class="primary" data-gen-open="${esc(p.slug)}">Buka</button></div>
      </li>`).join('') : '<li class="muted">Belum ada video generate. Tekan "Buat video".</li>';
  }
  $('#gen-list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-gen-open]');
    if (b) open(b.dataset.genOpen);
  });

  // ---- panel ----
  function gate1(d) {
    const g = d.gate1;
    const v = g.voice;
    return `
      <section class="gen-card"><h3>Suara</h3>
        ${g.audio ? `<audio controls preload="none" src="${media(d.slug, 'processed-audio.wav', d.status.fingerprint?.['processed-audio.wav'])}"></audio>` : ''}
        <p class="muted">${v ? `${dur(v.duration)} · ${esc(v.preset)}${v.wer !== null ? ` · WER ${esc(v.wer)}` : ''}` : 'meta suara belum ada'}</p>
        ${d.status.voiceStale ? '<p class="warn">Naskah berubah setelah suara dibuat. Buat ulang suara sebelum menyetujui.</p>' : ''}
      </section>
      <section class="gen-card"><h3>Naskah</h3>
        <div id="gen-script-view">${g.paragraphs.map((p, i) => `<p${i === 0 ? ' class="hook"' : ''}>${esc(p)}</p>`).join('')}
          ${g.facts ? `<details><summary>Fakta</summary><pre>${esc(g.facts)}</pre></details>` : ''}</div>
        <form id="gen-script-form" hidden><textarea name="text" rows="14">${esc(g.script)}</textarea>
          <menu><button type="button" data-gen="edit-cancel">Batal</button><button class="primary">Simpan naskah</button></menu></form>
        <div class="actions"><button data-gen="edit">Edit naskah</button><button data-gen="voice">Buat ulang suara</button></div>
        <pre id="gen-voice-log" hidden></pre>
      </section>`;
  }

  function gate2(d) {
    const g = d.gate2;
    return `
      <section class="gen-card"><h3>Storyboard</h3>
        ${g.sheets.map((s) => `<a href="${media(d.slug, s)}" target="_blank" rel="noopener"><img class="sheet" alt="${esc(s)}" src="${media(d.slug, s, d.status.fingerprint?.[s])}"></a>`).join('') || '<p class="muted">Belum ada sheet.</p>'}
      </section>
      <section class="gen-card"><h3>Scene</h3>
        <ol class="scenes">${g.rows.map((r) => `<li><strong>${r.n}. ${esc(r.time)}</strong> <span class="muted">${esc(r.style)}</span><span>${esc(r.what)}</span><span class="muted">“${esc(r.words)}” · ${esc(r.example)}</span></li>`).join('')}</ol>
      </section>
      <section class="gen-card"><h3>Style World</h3><pre>${esc(g.styleWorld || '–')}</pre></section>
      <section class="gen-card"><h3>Musik</h3><pre>${esc(g.music || '–')}</pre>
        ${g.musicTrack ? `<audio controls preload="none" src="/api/music/${enc(g.musicTrack)}/file"></audio>` : ''}</section>`;
  }

  function gate3(d) {
    const g = d.gate3;
    return `
      <section class="gen-card"><h3>Render</h3>
        ${g.render ? `<video controls preload="metadata" playsinline src="/media/${enc(d.slug)}/${enc(g.render)}?v=${enc((d.status.fingerprint?.[`renders/${g.render}`] || '').slice(0, 12))}"></video>` : '<p class="muted">Belum ada render.</p>'}
      </section>
      ${g.deviations ? `<section class="gen-card"><h3>Perubahan dari rencana</h3><pre>${esc(g.deviations)}</pre></section>` : ''}
      ${g.risks ? `<section class="gen-card"><h3>Risiko</h3><pre>${esc(g.risks)}</pre></section>` : ''}
      ${g.qaReport ? '<p class="muted">Laporan QA ada: <code>qa-report.md</code> di folder proyek.</p>' : ''}`;
  }

  function running(d) {
    const s = d.status;
    if (s.phase === 'done') return `<section class="gen-card"><p>Selesai. Publish lewat tab Results.</p></section>${gate3(d)}`;
    return `<section class="gen-card"><p>Agent sedang mengerjakan: ${esc(PHASE[s.phase] || s.phase)}…</p>
      <p class="muted">Buka Terminal untuk melihat prosesnya.</p></section>`;
  }

  function renderDetail(d) {
    detail = d;
    $('#gen-home').hidden = true;
    $('#gen-detail').hidden = false;
    const s = d.status;
    const live = d.session && d.session.status !== 'exited';
    $('#gen-head').innerHTML = `<button data-gen="back">← Generate</button><strong>${esc(d.slug)}</strong>
      <span class="status ${esc(d.session?.status || '')}">${esc(statusText(s))}</span><span class="muted">Sesi: ${esc(sessionText(d.session))}</span>
      ${live ? '<button data-gen="terminal">Terminal</button>' : '<button data-gen="session" class="primary">Mulai sesi lanjut</button>'}`;
    // redraw the body only when what it shows changed: a playing player or an open editor survives polling
    const key = JSON.stringify([s.phase, s.gate, s.fingerprint, s.voiceStale, d.gate2.rows.length, d.gate3.render]);
    if (key !== bodyKey) {
      bodyKey = key;
      $('#gen-body').innerHTML = s.phase === 'gate' ? { 1: gate1, 2: gate2, 3: gate3 }[s.gate](d) : running(d);
    }
    $('#gen-history-list').innerHTML = s.log.slice().reverse().map((e) => `<li><strong>Gate ${e.gate} ${esc(e.decision)}</strong> <span class="muted">${esc(e.by)} · ${esc(new Date(e.at).toLocaleString('id-ID'))}</span>${e.note ? `<br>${esc(e.note)}` : ''}</li>`).join('') || '<li class="muted">Belum ada keputusan.</li>';
    renderActions(d);
  }

  function renderActions(d) {
    const s = d.status;
    const bar = $('#gen-actions');
    if (s.phase !== 'gate') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const busy = d.session?.status === 'running';
    const label = s.state === 'revising'
      ? (busy ? 'Agent merevisi…' : 'Agent selesai tanpa mengubah artefak — cek terminal')
      : s.state === 'qa' ? 'QA berjalan — putuskan setelah laporan QA' : busy ? 'Agent masih bekerja…' : '';
    const canApprove = !busy && !(s.gate === 1 && s.voiceStale);
    bar.innerHTML = `${label ? `<span class="muted">${esc(label)}</span>` : ''}
      <button data-gen="revise"${busy ? ' disabled' : ''}>Revisi</button>
      ${s.gate === 3 ? `<button data-gen="qa"${busy ? ' disabled' : ''}>QA dulu</button>` : ''}
      <button class="primary" data-gen="approve"${canApprove ? '' : ' disabled'}>Setuju</button>`;
  }

  function askNote(gate, decision) {
    pending = { gate, decision };
    const f = $('#gen-note-form');
    f.reset();
    $('#gen-note-title').textContent = { approve: `Setujui Gate ${gate}`, revise: `Revisi Gate ${gate}`, qa: 'QA dulu (Gate 3)' }[decision];
    $('#gen-note-label').firstChild.textContent = decision === 'revise' ? 'Apa yang harus diubah? (wajib) ' : 'Catatan (opsional) ';
    f.note.required = decision === 'revise';
    $('#gen-note-error').textContent = '';
    $('#gen-note-dialog').showModal();
  }

  $('#gen-note-form').addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'send') return;
    e.preventDefault();
    try {
      const r = await post(`/api/generate/${enc(detail.slug)}/decision`, { ...pending, note: e.target.note.value, fingerprint: detail.status.fingerprint });
      $('#gen-note-dialog').close();
      banner(r.sent ? '' : `Keputusan tercatat, tapi belum terkirim ke agent: ${r.error}`);
      bodyKey = '';
      refresh();
    } catch (err) {
      $('#gen-note-error').textContent = err.message;
    }
  });

  function followVoice(slug) {
    const log = $('#gen-voice-log');
    if (log) {
      log.hidden = false;
      log.textContent = '';
    }
    const es = new EventSource(`/api/generate/${enc(slug)}/voice/stream`);
    es.addEventListener('log', (ev) => {
      const el = $('#gen-voice-log');
      if (!el) return;
      el.textContent += JSON.parse(ev.data);
      el.scrollTop = el.scrollHeight;
    });
    es.addEventListener('done', (ev) => {
      const code = JSON.parse(ev.data).code;
      es.close();
      banner(code === 0 ? '' : `Buat ulang suara gagal (exit ${code}); suara lama tetap dipakai.`);
      bodyKey = '';
      refresh();
    });
  }

  async function startSession() {
    const st = await api('/api/state');
    const rt = st.tools.claude === false ? 'codex' : 'claude';
    const m = st.models[rt] || { models: [] };
    const model = m.default || m.models[0]?.value;
    const effort = m.models.find((x) => x.value === model)?.efforts?.includes('high') ? 'high' : m.models.find((x) => x.value === model)?.efforts?.[0];
    await post(`/api/generate/${enc(detail.slug)}/session`, { runtime: rt, model, effort });
    openTerminal(detail.slug);
  }

  $('#gen-detail').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-gen]');
    if (!b) return;
    const act = b.dataset.gen;
    try {
      if (act === 'back') { home(); refresh(); }
      if (act === 'terminal') openTerminal(detail.slug);
      if (act === 'session') await startSession();
      if (act === 'approve' || act === 'revise' || act === 'qa') askNote(detail.status.gate, act);
      if (act === 'edit' || act === 'edit-cancel') {
        $('#gen-script-form').hidden = act === 'edit-cancel';
        $('#gen-script-view').hidden = act === 'edit';
      }
      if (act === 'voice') {
        await post(`/api/generate/${enc(detail.slug)}/voice`);
        followVoice(detail.slug);
      }
    } catch (err) {
      banner(err.message);
    }
  });

  $('#gen-detail').addEventListener('submit', async (e) => {
    if (e.target.id !== 'gen-script-form') return;
    e.preventDefault();
    try {
      await api(`/api/generate/${enc(detail.slug)}/script`, { method: 'PUT', body: JSON.stringify({ text: e.target.text.value }) });
      banner('Naskah tersimpan. Tekan "Buat ulang suara" sebelum menyetujui.');
      bodyKey = '';
      refresh();
    } catch (err) {
      banner(err.message);
    }
  });

  // ---- form ----
  const slugify = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 5).join('-').slice(0, 40).replace(/-+$/, '');
  let slugTouched = false;
  const opt = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;

  function fillModels(f) {
    const st = window.studio.state();
    const rt = st.models[f.runtime.value] || { models: [] };
    f.model.innerHTML = rt.models.map((m) => opt(m.value, m.label)).join('');
    f.model.value = rt.default || rt.models[0]?.value || '';
    const efforts = rt.models.find((m) => m.value === f.model.value)?.efforts || [];
    f.effort.innerHTML = efforts.map((x) => opt(x, x)).join('');
    f.effort.value = efforts.includes('high') ? 'high' : efforts[0] || '';
  }

  async function openForm() {
    try {
      const [o, st] = await Promise.all([api('/api/generate/options'), api('/api/state')]);
      Object.assign(window.studio.state(), st);
      const f = $('#gen-form');
      f.reset();
      slugTouched = false;
      f.repurpose.innerHTML = opt('', '—') + o.repurpose.map((s) => opt(s, s)).join('');
      f.voice.innerHTML = opt('', `otomatis${o.defaultVoice ? ` (default ${o.defaultVoice})` : ''}`) + o.voices.map((v) => opt(v.name, `${v.name} · ${v.provider}`)).join('');
      f.style.innerHTML = opt('', 'otomatis') + o.styles.map((s) => opt(s, s)).join('');
      f.music.innerHTML = opt('', 'otomatis') + o.music.map((m) => opt(m.id, `${m.title} · ${(m.mood || []).join(', ')} · ${dur(m.duration)}`)).join('');
      for (const o2 of f.runtime.options) o2.disabled = st.tools[o2.value] === false;
      f.runtime.value = st.tools.claude === false ? 'codex' : 'claude';
      fillModels(f);
      $('#gen-error').textContent = '';
      $('#gen-dialog').showModal();
    } catch (e) {
      banner(e.message);
    }
  }
  $('#gen-new').addEventListener('click', openForm);
  const form = $('#gen-form');
  form.brief.addEventListener('input', () => { if (!slugTouched) form.slug.value = slugify(form.brief.value); });
  form.slug.addEventListener('input', () => { slugTouched = true; });
  form.runtime.addEventListener('change', () => fillModels(form));
  form.model.addEventListener('change', () => {
    const rt = window.studio.state().models[form.runtime.value] || { models: [] };
    const efforts = rt.models.find((m) => m.value === form.model.value)?.efforts || [];
    form.effort.innerHTML = efforts.map((x) => opt(x, x)).join('');
    form.effort.value = efforts.includes('high') ? 'high' : efforts[0] || '';
  });
  form.addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'create') return;
    e.preventDefault();
    const f = e.target;
    const urls = f.urls.value.split('\n').map((u) => u.trim()).filter(Boolean);
    try {
      const r = await post('/api/generate', {
        brief: f.brief.value, slug: f.slug.value.trim(), urls, repurpose: f.repurpose.value, voice: f.voice.value,
        duration: f.duration.value, style: f.style.value, music: f.music.value,
        runtime: f.runtime.value, model: f.model.value, effort: f.effort.value,
      });
      $('#gen-dialog').close();
      banner(r.session.started ? '' : `Proyek dibuat, tapi sesi agent gagal dimulai: ${r.session.error}`);
      open(r.slug);
    } catch (err) {
      $('#gen-error').textContent = err.message;
    }
  });

  // ---- polling: status every 3 s while the tab is open, never while a dialog or the terminal is open ----
  setInterval(() => {
    const busyUi = window.studio.termOpen() || $('#gen-dialog').open || $('#gen-note-dialog').open;
    if (window.studio.tab() === 'generate' && !busyUi) refresh().catch((e) => banner(e.message));
  }, 3000);

  window.studioGenerate = { refresh, home, open };
})();
```

- [ ] **Step 4: `app.css`**

Append:

```css
.gen-panel { max-width: 720px; margin: 0 auto; display: grid; gap: 12px; }
.gen-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.gen-body { display: grid; gap: 12px; min-width: 0; }
.gen-card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 8px; min-width: 0; }
.gen-card h3 { margin: 0; font-size: 15px; }
.gen-card p { margin: 0; overflow-wrap: anywhere; }
.gen-card .hook { border-left: 3px solid var(--primary); padding-left: 8px; }
.gen-card menu { justify-content: flex-start; }
#gen-script-form { display: grid; gap: 8px; }
#gen-script-form textarea { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; }
.gen-actions { position: sticky; bottom: 0; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: center;
  padding: 10px 0 max(10px, env(safe-area-inset-bottom)); background: var(--bg); border-top: 1px solid var(--line); }
.gen-actions .muted { flex: 1 1 100%; }
img.sheet { display: block; width: 100%; height: auto; border-radius: 8px; }
.scenes { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.scenes li { display: grid; gap: 2px; overflow-wrap: anywhere; }
#gen-history ol { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 6px; }
.warn { color: var(--warn); }
```

- [ ] **Step 5: Run the automated suites**

Run: `npm run test:studio && npm run test:video`
Expected: all pass (43 and 63).

- [ ] **Step 6: Manual check in headless Chrome (390 px and 1280 px)**

Start a throwaway Studio on another port in the background (it reads `.env`; this repo's `.env` has no `STUDIO_TOKEN`, so no login page):

```bash
npm run studio -- --port 4787
```

(run with `run_in_background: true`). The real project `videos/ai-agent-gagal` has no `gates.json` yet, so it shows Gate 1. Its three gates were approved by Dena in chat on 2026-09-29; recording them is exactly what RD-03-92 asks for, so take one screenshot per state and record each approval with the CLI in between:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
S=/private/tmp/claude-501/-Users-denameidina-Documents-videos/08de2aef-8423-473d-8c68-91e8e305c9aa/scratchpad/studio-shots
mkdir -p "$S"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 --window-size=$2 --screenshot="$S/$1.png" "http://127.0.0.1:4787/$3"; }
shot list-390 390,844 '#generate'
shot form-390 390,1400 '#generate/new'
shot gate1-390 390,1600 '#generate/ai-agent-gagal'
npm run video -- gate ai-agent-gagal approve 1 --note "disetujui Dena di chat 2026-09-29 (ronde 2)"
shot gate2-390 390,2400 '#generate/ai-agent-gagal'
shot gate2-1280 1280,1600 '#generate/ai-agent-gagal'
npm run video -- gate ai-agent-gagal approve 2 --note "disetujui Dena di chat 2026-09-29"
shot gate3-390 390,1600 '#generate/ai-agent-gagal'
npm run video -- gate ai-agent-gagal approve 3 --note "disetujui Dena di chat 2026-09-29 (publish dilewati)"
shot done-390 390,1600 '#generate/ai-agent-gagal'
```

Open every PNG with the Read tool and check: no horizontal overflow at 390 px (nothing cut off on the right), the action bar is at the bottom of the viewport in the gate shots, Gate 1 shows the player + paragraphs (hook marked), Gate 2 shows the sheet + scene cards + style world + music player, Gate 3 shows the video + deviations + risks, the form shows every field, the list shows the card with "Selesai" at the end. Fix what the pictures show before continuing. Stop the throwaway Studio afterwards (TaskStop on its background task).

Also run `npm run video -- gate ai-agent-gagal` and expect `Selesai` plus the last decision line.

- [ ] **Step 7: Docs**

Append to `internal/docs/requirements/rd-05-studio.md`:

```md
- **RD-05-29** (Ubiquitous) — The Generate panel shall work at 390 px wide without horizontal
  scrolling, keep its decision bar at the bottom of the screen, enable Setuju/Revisi only
  while a gate waits and the session is not busy (Setuju also not while the Gate 1 voice is
  stale), not redraw a playing player or an open script editor while it polls every 3 s,
  and open from `#generate`, `#generate/new`, and `#generate/<slug>`.
```

In `CLAUDE.md` and `AGENTS.md`, change the `npm run studio` command comment to:

```
npm run studio                 # web UI: projects (sources upload, shared library), Generate tab (form + gate review panel), tmux agent sessions + terminal, renders, publish, voice test + music tabs (long-running)
```

In `internal/docs/entrypoints/rd.md`, on the RD-05 line, append `; tab Generate (RD-05-21…29): form + panel review gate.` to its description.

- [ ] **Step 8: Commit**

```bash
git add scripts/studio/public/index.html scripts/studio/public/app.js scripts/studio/public/app.css scripts/studio/public/generate.js scripts/studio/app.mjs internal/docs/requirements/rd-05-studio.md CLAUDE.md AGENTS.md internal/docs/entrypoints/rd.md
git commit -m "feat(studio): Generate tab — form, gate review panel, script edit, voice log (RD-05-29)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`videos/ai-agent-gagal/gates.json` is gitignored with the rest of `videos/`.)

---

### Task 6: Full verification and review

**Files:** none new (fixes go to the files of the task they belong to).

- [ ] **Step 1: Run every suite**

```bash
for s in test:voice test:video test:music test:studio test:repliz test:motion-kit test:craft-kit test:style-kit test:asset-lib test:render-blur; do npm run --silent $s 2>&1 | grep -E "^ℹ (pass|fail)"; done
```

Expected: every suite `fail 0`.

- [ ] **Step 2: Spec coverage check**

Walk `docs/superpowers/specs/2026-09-29-studio-generate-design.md` sections 1–8 and tick each requirement against the code (RD-03-88…93, RD-05-21…29). Anything missing goes back to its task.

- [ ] **Step 3: Code review**

Request a code review (superpowers:requesting-code-review) of `main..feat/studio-generate` against the spec; fix Critical/Important findings, re-run the suites, and commit the fixes with their docs.

- [ ] **Step 4: Hand back to Dena**

Report what changed (with the screenshots from Task 5 Step 6), and offer the finishing-a-development-branch options (merge to main locally / keep the branch).
```
