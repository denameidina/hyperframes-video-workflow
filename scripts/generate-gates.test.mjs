import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { briefStub } from './lib/generate.mjs';
import { main } from './video.mjs';
import { GateError, editedSinceDecision, fingerprint, formatGateStatus, gateStatus, readGates, recordDecision, sheetsOf } from './lib/gates.mjs';
import { DURATION, finalGate, readFormat } from './lib/formats.mjs';

const T0 = new Date('2026-09-29T08:00:00Z');
const now = () => T0;

// a generate project under a temp root; put(f, text, secondsAfterEpoch) sets the mtime so voiceStale is deterministic
function project(slug = 'demo', { generate = true, format } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gates-'));
  const dir = join(root, 'videos', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), generate ? briefStub(slug, format) : '# Creative Brief\n\n- gate_cut: off\n');
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
  put('storyboard.md', '| 1 | scene |');
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

test('video gate needs a gate number; fingerprints follow a rewritten file (hash cache)', () => {
  const { root, dir, put } = project('demo');
  put('script.md', 'Halo.\n', 1000);
  put('processed-audio.wav', 'A', 1001);
  assert.throws(() => main(['gate', 'demo', 'approve'], { root }), /usage: npm run video -- gate demo approve <1\|2\|3>/);
  const a = fingerprint(dir, 1)['processed-audio.wav'];
  assert.equal(fingerprint(dir, 1)['processed-audio.wav'], a, 'cached');
  put('processed-audio.wav', 'B', 1002);
  assert.notEqual(fingerprint(dir, 1)['processed-audio.wav'], a);
});

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

test('readFormat reads the format line in any common spelling, falls back to request.json, and never guesses', () => {
  const { dir } = project('y');
  const brief = (line) => writeFileSync(join(dir, 'creative-brief.md'), `# B\n\n## Workflow Settings\n\n- mode: generate\n${line}\n- visual_density: medium\n`);
  for (const line of ['- format: kinetic-post (ADR-0027)', '- format: kinetic-post <!-- keep -->', '- Format: Kinetic-Post', '- **format**: kinetic-post', '- format: `kinetic-post`', '* format: kinetic-post']) {
    brief(line);
    assert.equal(readFormat(dir), 'kinetic-post', line);
  }
  brief('- format: reel');
  assert.throws(() => readFormat(dir), /"reel" is not one of/);
  brief('- format:');
  assert.throws(() => readFormat(dir), /format line has no value/);
  writeFileSync(join(dir, 'creative-brief.md'), '# B\n\n## Content Lane\n\n- Format: talking-head\n\n## Workflow Settings\n\n- mode: generate\n');
  assert.equal(readFormat(dir), 'explainer', 'only the Workflow Settings section counts');
  mkdirSync(join(dir, 'research'), { recursive: true });
  writeFileSync(join(dir, 'research/request.json'), JSON.stringify({ version: 1, format: 'motion-short' }));
  assert.equal(readFormat(dir), 'motion-short', 'a brief rewritten without the line keeps the Studio request');
  brief('- format: kinetic-post');
  assert.throws(() => readFormat(dir), /creative-brief\.md says kinetic-post but research\/request\.json says motion-short/);
  writeFileSync(join(dir, 'research/request.json'), '{oops');
  assert.equal(readFormat(dir), 'kinetic-post', 'an unreadable request.json is ignored');
});

test('video gate names the gates of the project\'s format', () => {
  const { root, dir, put } = project('post', { format: 'motion-short' });
  put('script.md', 'X\n');
  assert.throws(() => main(['gate', 'post', 'approve', '3'], { root }), /usage: npm run video -- gate post approve <1\|2>/);
  assert.equal(existsSync(join(dir, 'gates.json')), false);
});

for (const format of ['explainer', 'kinetic-post', 'motion-short']) {
  test(`${format} cannot approve a missing or empty storyboard artifact`, () => {
    const { dir, put } = project('complete', { format });
    put('script.md', 'Text', 1000);
    put('processed-audio.wav', 'Audio', 1001);
    if (format === 'explainer') recordDecision(dir, { gate: 1, decision: 'approve', by: 'cli', now });
    const gate = format === 'explainer' ? 2 : 1;
    put('preview/storyboard-sheet.jpg', 'Sheet');
    assert.deepEqual(status(dir), ['screen-plan', null, null]);
    assert.throws(() => recordDecision(dir, { gate, decision: 'approve', by: 'cli', now }), (e) => e.code === 'not-waiting');
    assert.throws(() => fingerprint(dir, gate), (e) => e.code === 'missing-file');
    put('storyboard.md', '');
    assert.deepEqual(status(dir), ['screen-plan', null, null]);
    put('storyboard.md', '| 1 | scene |');
    put('preview/storyboard-sheet.jpg', '');
    assert.deepEqual(status(dir), ['screen-plan', null, null]);
    put('preview/storyboard-sheet.jpg', 'Sheet');
    assert.deepEqual(status(dir), ['gate', gate, 'waiting']);
  });

  test(`${format} reviews a blur-only render and fingerprints the selected filename`, () => {
    const { dir, put } = project('blur', { format });
    put('script.md', 'Text', 1000);
    put('processed-audio.wav', 'Audio', 1001);
    if (format === 'explainer') recordDecision(dir, { gate: 1, decision: 'approve', by: 'cli', now });
    put('preview/storyboard-sheet.jpg', 'Sheet');
    put('storyboard.md', '| 1 | scene |');
    recordDecision(dir, { gate: format === 'explainer' ? 2 : 1, decision: 'approve', by: 'cli', now });
    put('renders/blur-blur.mp4', 'Render', 1002);
    const s = gateStatus(dir);
    assert.deepEqual([s.phase, s.gate], ['gate', format === 'explainer' ? 3 : 2]);
    assert.deepEqual(Object.keys(s.fingerprint), ['renders/blur-blur.mp4']);
    recordDecision(dir, { gate: s.gate, decision: 'approve', by: 'cli', now });
    assert.equal(gateStatus(dir).phase, 'done');
  });
}

test('a newer render variant reopens the final gate; empty renders and directories cannot satisfy it', () => {
  const { dir, put } = project();
  put('script.md', 'Text', 1000);
  put('processed-audio.wav', 'Audio', 1001);
  recordDecision(dir, { gate: 1, decision: 'approve', by: 'cli', now });
  put('preview/storyboard-sheet.jpg', 'Sheet');
  put('storyboard.md', '| 1 | scene |');
  recordDecision(dir, { gate: 2, decision: 'approve', by: 'cli', now });
  put('renders/demo.mp4', 'Normal', 1002);
  recordDecision(dir, { gate: 3, decision: 'approve', by: 'cli', now });
  put('renders/demo-blur.mp4', 'Blur', 1003);
  assert.deepEqual(status(dir), ['gate', 3, 'waiting']);
  assert.deepEqual(Object.keys(gateStatus(dir).fingerprint), ['renders/demo-blur.mp4']);
  put('renders/demo.mp4', 'New normal', 1003);
  assert.deepEqual(Object.keys(gateStatus(dir).fingerprint), ['renders/demo.mp4'], 'normal wins a timestamp tie');
  put('renders/demo.mp4', '');
  rmSync(join(dir, 'renders/demo-blur.mp4'));
  mkdirSync(join(dir, 'renders/demo-blur.mp4'));
  assert.deepEqual(status(dir), ['build', null, null]);
});
