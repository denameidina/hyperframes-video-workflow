import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CRITERIA, buildRun, formatReveal, labelOf, revealRun, runId, saveRatings, shuffle, validateRatings } from './lib/voice/test-run.mjs';

function testRoot({ withClone = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'voice-run-'));
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({
    version: 1,
    default: null,
    presets: { 'dena-clone': { provider: 'gemini', model: 'gemini-3.8-flash-tts', voiceRef: 'shared/voices/dena/voice.json' } },
  }));
  writeFileSync(join(root, 'config/voice-test.json'), JSON.stringify({
    version: 1,
    script: 'config/voice-test-script.md',
    ref: 'shared/voices/dena/ref.wav',
    presets: ['dena-clone'],
    screens: [
      { id: 'gemini', keep: 2, base: { provider: 'gemini', model: 'gemini-3.8-flash-tts', style: 'santai' }, voices: ['kore', 'puck', 'aoede', 'bad'] },
      { id: 'supertonic', keep: 1, base: { provider: 'supertonic', speed: 1.05 }, voices: ['F1', 'M2'] },
    ],
  }));
  writeFileSync(join(root, 'config/voice-test-script.md'), '# Naskah\n\nHook pertama.\n\nIsi kedua.\n');
  if (withClone) {
    mkdirSync(join(root, 'shared/voices/dena'), { recursive: true });
    writeFileSync(join(root, 'shared/voices/dena/voice.json'), JSON.stringify({ id: 'voice_dena' }));
    writeFileSync(join(root, 'shared/voices/dena/ref.wav'), 'REF');
  }
  return root;
}

// renderVoice stand-in: WER per voice, writes voiceover.wav like the real one.
const WER = { kore: 0.2, puck: 0.05, aoede: 0.05, F1: 0.3, M2: 0.1 };
function fakeRender(calls) {
  return async ({ text, preset, out }) => {
    calls.push({ text, name: preset.name, voice: preset.voice });
    if (preset.voice === 'bad') throw new Error('HTTP 400 unknown voice');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'voiceover.wav'), `wav:${preset.name}`);
    return { provider: preset.provider, model: preset.model || null, voice: preset.voice || preset.voiceRef, duration: 40, alignment: { wer: WER[preset.voice] ?? 0.02 } };
  };
}

test('shuffle is deterministic for a seed and keeps every item', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(shuffle(items, 42), shuffle(items, 42));
  assert.deepEqual([...shuffle(items, 42)].sort(), items);
  assert.notDeepEqual(shuffle(items, 1), shuffle(items, 2));
  assert.equal(runId(new Date(2026, 8, 29, 14, 5)), '20260929-1405');
  assert.equal(labelOf(0), 'A');
});

test('buildRun screens pools on the hook, keeps the best, and writes a blind run', async () => {
  const root = testRoot();
  const calls = [];
  const logs = [];
  const r = await buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 14, 30), render: fakeRender(calls), log: (m) => logs.push(m) });
  assert.equal(r.id, '20260929-1430');
  assert.deepEqual(r.labels, ['A', 'B', 'C', 'D']);
  assert.equal(r.hasRef, true);
  const screens = calls.filter((c) => c.text === 'Hook pertama.');
  assert.deepEqual(screens.map((c) => c.name), ['gemini:kore', 'gemini:puck', 'gemini:aoede', 'gemini:bad', 'supertonic:F1', 'supertonic:M2']);
  const screen = JSON.parse(readFileSync(join(r.dir, 'screen.json'), 'utf8'));
  assert.deepEqual(screen.gemini.find((x) => x.voice === 'bad'), { voice: 'bad', wer: null, error: 'HTTP 400 unknown voice' });
  assert.ok(logs.some((m) => m === 'screen gemini:bad failed: HTTP 400 unknown voice'));
  const key = JSON.parse(readFileSync(join(r.dir, 'key.json'), 'utf8'));
  assert.equal(key.seed, 7);
  assert.deepEqual(Object.values(key.labels).map((l) => l.name).sort(), ['dena-clone', 'gemini:aoede', 'gemini:puck', 'supertonic:M2']);
  for (const [label, k] of Object.entries(key.labels)) assert.equal(readFileSync(join(r.dir, 'samples', `${label}.wav`), 'utf8'), `wav:${k.name}`);
  assert.equal(readFileSync(join(r.dir, 'ref.wav'), 'utf8'), 'REF');
  assert.equal(readFileSync(join(r.dir, 'script.md'), 'utf8').includes('# Naskah'), false);
  const again = await buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 16, 0), render: fakeRender([]) });
  const key2 = JSON.parse(readFileSync(join(again.dir, 'key.json'), 'utf8'));
  assert.deepEqual(Object.values(key2.labels).map((l) => l.name), Object.values(key.labels).map((l) => l.name));
  await assert.rejects(buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 16, 0), render: fakeRender([]) }), /already exists/);
});

test('buildRun stops before any synthesis when a preset voice file is missing', async () => {
  const root = testRoot({ withClone: false });
  const calls = [];
  await assert.rejects(buildRun({ root, seed: 1, now: new Date(2026, 8, 29, 9, 0), render: fakeRender(calls) }), /cannot start:\n- shared\/voices\/dena\/voice\.json not found/);
  assert.deepEqual(calls, []);
  assert.equal(existsSync(join(root, 'shared/voice-tests')), false);
});

test('validateRatings accepts 1-5 or empty per criterion and a short note', () => {
  const ok = validateRatings({ ratings: { A: { natural: 4, pronunciation: 3, note: 'agak cepat' }, B: {} } }, ['A', 'B']);
  assert.deepEqual(ok.A, { natural: 4, pronunciation: 3, register: null, similarity: null, endurance: null, note: 'agak cepat' });
  assert.deepEqual(Object.keys(ok.B), [...CRITERIA, 'note']);
  assert.throws(() => validateRatings({ ratings: { Z: {} } }, ['A']), /unknown sample Z/);
  assert.throws(() => validateRatings({ ratings: { A: { natural: 6 } } }, ['A']), /A\.natural must be 1-5/);
  assert.throws(() => validateRatings({ ratings: { A: { natural: 2.5 } } }, ['A']), /A\.natural must be 1-5/);
  assert.throws(() => validateRatings({ ratings: { A: { note: 'x'.repeat(1001) } } }, ['A']), /at most 1000/);
  assert.throws(() => validateRatings({}, ['A']), /ratings must be an object/);
});

test('revealRun ranks by the core score and reports similarity, WER, and cost apart', async () => {
  const root = testRoot();
  const r = await buildRun({ root, seed: 7, now: new Date(2026, 8, 29, 14, 30), render: fakeRender([]) });
  assert.throws(() => revealRun({ root, id: r.id }), /ratings\.json not found; rate the samples in Studio/);
  assert.throws(() => revealRun({ root, id: '../x' }), /run id like/);
  const key = JSON.parse(readFileSync(join(r.dir, 'key.json'), 'utf8'));
  const labelOfName = (n) => Object.entries(key.labels).find(([, k]) => k.name === n)[0];
  const clone = labelOfName('dena-clone');
  const puck = labelOfName('gemini:puck');
  saveRatings(r.dir, r.labels, { ratings: { [clone]: { natural: 4, pronunciation: 4, register: 5, endurance: 4, similarity: 5, note: 'mirip' }, [puck]: { natural: 5, pronunciation: 5, register: 5, endurance: 5, similarity: 1 } } }, new Date('2026-09-29T08:00:00Z'));
  const rows = revealRun({ root, id: r.id });
  assert.deepEqual(rows.slice(0, 2).map((x) => [x.name, x.score, x.similarity, x.costPerMin]), [['gemini:puck', 5, 1, 0.0135], ['dena-clone', 4.25, 5, 0.0135]]);
  assert.equal(rows.find((x) => x.name === 'supertonic:M2').costPerMin, 0);
  const md = readFileSync(join(r.dir, 'reveal.md'), 'utf8');
  assert.match(md, /^# Uji dengar 20260929-1430 — hasil/);
  assert.match(md, new RegExp(`\\*\\*${clone}\\*\\* \\(dena-clone\\): mirip`));
  assert.equal(formatReveal({ run: 'x' }, []).includes('| # | Label |'), true);
});
