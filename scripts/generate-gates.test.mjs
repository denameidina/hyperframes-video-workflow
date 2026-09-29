import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { briefStub } from './lib/generate.mjs';
import { main } from './video.mjs';
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
