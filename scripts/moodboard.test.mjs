// Per-style moodboards (spec: docs/superpowers/specs/2026-09-28-moodboard-design.md, ADR-0018):
// the manifest matches the style references, the studies host is generated, real stills stay local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMoodboard, LOCAL, MB, ordered, readMoodboard, sheetHtml, studiesHost } from './lib/moodboard.mjs';
import { STYLES } from './lib/style-examples.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const docs = Object.fromEntries(STYLES.map((s) => [s, read(`docs/agents/references/styles/${s}.md`)]));
const m = readMoodboard(ROOT);
const tracked = () => new Set(execFileSync('git', ['ls-files', MB], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));

test('the manifest has six studies per style, each on a reference the style doc really has', () => {
  checkMoodboard(m, docs);
  assert.equal(m.studies.length, 6 * STYLES.length);
});

test('checkMoodboard rejects a wrong count, a missing reference, a still outside the study, and a non-https source', () => {
  const one = m.studies[0];
  assert.throws(() => checkMoodboard({ ...m, studies: m.studies.slice(1) }), /needs 6 studies/);
  assert.throws(() => checkMoodboard({ ...m, studies: [{ ...one, ref: 'R99' }, ...m.studies.slice(1)] }, docs), /has no ### R99/);
  assert.throws(() => checkMoodboard({ ...m, studies: [{ ...one, at: one.duration }, ...m.studies.slice(1)] }), /at must be inside/);
  assert.throws(() => checkMoodboard({ ...m, refs: [{ ...m.refs[0], source: 'http://x' }, ...m.refs.slice(1)] }), /https URL/);
});

test('the studies host is generated from the manifest (run: npm run moodboard -- build)', () => {
  for (const [p, c] of Object.entries(studiesHost(m))) assert.equal(read(p), c, `${p} is stale`);
  assert.ok(existsSync(join(ROOT, MB, 'studies/hyperframes.json')));
});

test('real stills stay local: local/ is gitignored, nothing under it is tracked, no study points at it', () => {
  assert.match(read('.gitignore'), /^docs\/agents\/references\/moodboard\/local\/$/m);
  assert.deepEqual([...tracked()].filter((f) => f.startsWith(LOCAL + '/')), []);
  const dir = join(ROOT, MB, 'studies/compositions');
  for (const f of existsSync(dir) ? readdirSync(dir) : []) assert.doesNotMatch(read(`${MB}/studies/compositions/${f}`), /local\//, f);
});

test('a sheet page lists its six studies in order with reference, title, and what they steal', () => {
  const list = ordered(m).filter((s) => s.style === 'vox');
  const html = sheetHtml('vox', list);
  let at = 0;
  for (const s of list) {
    const i = html.indexOf(`frames/${s.id}.png`);
    assert.ok(i > at, `${s.id} out of order`);
    at = i;
    assert.ok(html.includes(`${s.ref} · ${s.id}`));
  }
  assert.match(html, /not the original works/);
});

