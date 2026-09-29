import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords, spokenGroups, whisperWords } from './lib/voice/align.mjs';
import { WHISPER } from './voice-fixtures.mjs';

test('whisperWords joins tokens into words and skips special tokens', () => {
  assert.deepEqual(whisperWords(WHISPER), [
    { text: 'Jujur,', start: 0.1, end: 0.6 }, { text: 'gue', start: 0.6, end: 0.9 }, { text: 'kira', start: 0.9, end: 1.3 },
    { text: 'gampang.', start: 1.3, end: 2.4 }, { text: 'Ternyata', start: 2.4, end: 3.2 }, { text: 'susah.', start: 3.2, end: 4 },
  ]);
});

test('alignWords keeps script spelling, flags misreads, and interpolates missing words', () => {
  const script = ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.'];
  const exact = alignWords({ script, asr: whisperWords(WHISPER), duration: 4 });
  assert.equal(exact.wer, 0);
  assert.deepEqual(exact.words[3], { text: 'gampang.', start: 1.3, end: 2.4, matched: true });
  const asr = [{ text: 'Jujur', start: 0.1, end: 0.6 }, { text: 'gue', start: 0.6, end: 0.9 }, { text: 'kiri', start: 0.9, end: 1.3 }, { text: 'gampang.', start: 1.3, end: 2.4 }, { text: 'Ternyata', start: 2.4, end: 4 }];
  const r = alignWords({ script, asr, duration: 4.5 });
  assert.equal(r.wer, 0.333);
  assert.deepEqual(r.words[2], { text: 'kira', start: 0.9, end: 1.3, matched: false });
  assert.deepEqual(r.words[5], { text: 'susah.', start: 4, end: 4.5, matched: false });
  assert.deepEqual(r.unmatched, ['kira', 'susah.']);
});

test('alignWords compares spoken forms, so written numbers match spoken ones', () => {
  const asr = [{ text: 'bayar', start: 0, end: 0.4 }, { text: 'Rp2,5', start: 0.4, end: 1.6 }, { text: 'juta.', start: 1.6, end: 2 }];
  const r = alignWords({ script: ['bayar', 'Rp2,5', 'juta.'], asr, duration: 2 });
  assert.equal(r.wer, 0);
  assert.deepEqual(r.words[1], { text: 'Rp2,5', start: 0.4, end: 1.2, matched: true }, '"Rp2,5 juta." is one group: its span is split evenly');
});

test('alignWords treats an extra transcribed word as an insertion, not a misread', () => {
  const asr = [...whisperWords(WHISPER)];
  asr.splice(3, 0, { text: 'banget', start: 1.25, end: 1.3 });
  const r = alignWords({ script: ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.'], asr, duration: 4 });
  assert.equal(r.wer, 0.167);
  assert.ok(r.words.every((w) => w.matched));
  assert.deepEqual(r.words[3], { text: 'gampang.', start: 1.3, end: 2.4, matched: true });
});

test('spokenGroups joins only the words whose spoken form depends on a neighbour', () => {
  const g = (words) => spokenGroups(words).map((x) => words.slice(x.from, x.to).join(' '));
  assert.deepEqual(g(['bayar', 'Rp', '2.500', 'per', 'bulan']), ['bayar', 'Rp 2.500', 'per', 'bulan']);
  assert.deepEqual(g(['cuma', '2,5', 'jt', 'saja']), ['cuma', '2,5 jt', 'saja']);
  assert.deepEqual(g(['naik', '50', '%']), ['naik', '50 %']);
  assert.deepEqual(g(['butuh', '3', '-', '5', 'hari']), ['butuh', '3 - 5', 'hari']);
  assert.deepEqual(g(['Jujur,', 'gue', 'kira']), ['Jujur,', 'gue', 'kira']);
});

test('alignWords matches amounts split by spaces on either side', () => {
  const at = (words) => words.map((text, i) => ({ text, start: i * 0.5, end: i * 0.5 + 0.5 }));
  const script = ['bayar', 'Rp', '2.500', 'per', 'bulan,', 'naik', '50', '%.'];
  const heard = at(['bayar', 'dua', 'ribu', 'lima', 'ratus', 'rupiah', 'per', 'bulan,', 'naik', 'lima', 'puluh', 'persen.']);
  const r = alignWords({ script, asr: heard, duration: 6 });
  assert.equal(r.wer, 0);
  assert.ok(r.words.every((w) => w.matched));
  assert.deepEqual(r.words.slice(1, 3), [{ text: 'Rp', start: 0.5, end: 1.75, matched: true }, { text: '2.500', start: 1.75, end: 3, matched: true }]);
  const written = alignWords({ script: ['cuma', 'Rp2,5', 'juta.'], asr: at(['cuma', 'Rp2,5', 'juta.']), duration: 1.5 });
  assert.equal(written.wer, 0);
  const spoken = alignWords({ script: ['cuma', 'Rp2,5', 'juta.'], asr: at(['cuma', 'dua', 'koma', 'lima', 'juta', 'rupiah.']), duration: 3 });
  assert.equal(spoken.wer, 0, '"Rp2,5 juta" is read "dua koma lima juta rupiah"');
});
