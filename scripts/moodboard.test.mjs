// Per-style moodboards (spec: docs/superpowers/specs/2026-09-28-moodboard-design.md, ADR-0018):
// the manifest matches the style references, the studies host is generated, real stills stay local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMoodboard, fetchRefs, LOCAL, MB, ogImage, ordered, readMoodboard, sheetHtml, studiesHost } from './lib/moodboard.mjs';
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

test('ogImage finds og:image or twitter:image and resolves it against the page', () => {
  assert.equal(ogImage('<meta property="og:image" content="/a/b.jpg">', 'https://x.org/p/'), 'https://x.org/a/b.jpg');
  assert.equal(ogImage("<meta content='https://c.dn/i.png?x=1&amp;y=2' name='twitter:image'>", 'https://x.org/'), 'https://c.dn/i.png?x=1&y=2');
  assert.equal(ogImage('<title>none</title>', 'https://x.org/'), null);
});

test('fetchRefs uses image when given, falls back to og:image, skips failures, and writes only under local/', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mb-'));
  try {
    mkdirSync(join(root, MB), { recursive: true });
    writeFileSync(join(root, MB, 'moodboard.json'), JSON.stringify({ studies: [], refs: [
      { style: 'vox', ref: 'R1', source: 'https://a.test/page', image: 'https://a.test/direct.png' },
      { style: 'vox', ref: 'R2', source: 'https://b.test/page' },
      { style: 'vox', ref: 'R3', source: 'https://c.test/down' },
      { style: 'vox', ref: 'R4', source: 'https://d.test/page' },
      { style: 'parallax', ref: 'R1', source: 'https://e.test/page' },
    ] }));
    const res = (status, body, type) => ({ ok: status === 200, status, headers: { get: () => type }, text: async () => body, arrayBuffer: async () => new TextEncoder().encode(body).buffer });
    const WEB = {
      'https://a.test/direct.png': res(200, 'PNG1', 'image/png'),
      'https://b.test/page': res(200, '<meta property="og:image" content="/og.jpg">', 'text/html'),
      'https://b.test/og.jpg': res(200, 'JPG2', 'image/jpeg'),
      'https://c.test/down': res(503, '', 'text/html'),
      'https://d.test/page': res(200, '<meta property="og:image" content="https://d.test/page.html">', 'text/html'),
      'https://d.test/page.html': res(200, '<html>', 'text/html'),
    };
    const seen = [];
    const got = await fetchRefs(root, 'vox', { fetchImpl: async (u) => { seen.push(u); return WEB[u] ?? res(404, '', ''); }, log: () => {} });
    assert.deepEqual(got.map((g) => g.ref), ['R1', 'R2']);
    assert.equal(readFileSync(join(root, LOCAL, 'vox/R1.png'), 'utf8'), 'PNG1');
    assert.equal(readFileSync(join(root, LOCAL, 'vox/R2.jpg'), 'utf8'), 'JPG2');
    assert.ok(!seen.includes('https://a.test/page'), 'a given image skips the source page');
    assert.ok(!seen.some((u) => u.startsWith('https://e.test')), 'only the asked style');
    for (const g of got) assert.ok(g.file.startsWith(join(root, LOCAL) + '/'));
    assert.deepEqual(readdirSync(join(root, MB)).sort(), ['local', 'moodboard.json']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

