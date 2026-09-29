import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords, whisperWords } from './lib/voice/align.mjs';
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
  assert.deepEqual(r.words[1], { text: 'Rp2,5', start: 0.4, end: 1.6, matched: true });
});
