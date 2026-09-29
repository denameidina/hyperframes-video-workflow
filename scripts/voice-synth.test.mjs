import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPreset, loadVoices } from './lib/voice/presets.mjs';
import { renderVoice } from './lib/voice/render.mjs';
import { GAP, cacheKey, concatArgs } from './lib/voice/synth.mjs';
import { audioBody, fakeFetch, fakeMedia, voiceRoot } from './voice-fixtures.mjs';

test('concatArgs joins paragraphs with a fixed gap', () => {
  const a = concatArgs(['a.wav', 'b.wav'], 'raw.wav');
  assert.equal(a[a.indexOf('-filter_complex') + 1], `anullsrc=r=48000:cl=mono:d=${GAP}[g0];[0:a][g0][1:a]concat=n=3:v=0:a=1[a]`);
  const one = concatArgs(['a.wav'], 'raw.wav');
  assert.equal(one[one.indexOf('-filter_complex') + 1], '[0:a]concat=n=1:v=0:a=1[a]');
});

test('cacheKey changes with any input that changes the audio', () => {
  const base = { provider: 'gemini', model: 'm', voice: 'kore', style: 's', speed: '', text: 'Halo' };
  const k = cacheKey(base);
  for (const change of [{ voice: 'puck' }, { style: 't' }, { text: 'Halo.' }, { model: 'n' }, { speed: 1.1 }]) assert.notEqual(cacheKey({ ...base, ...change }), k);
  assert.equal(cacheKey(base), k);
});

test('renderVoice caches paragraphs, times them, and writes words.json + voice-meta.json', async () => {
  const root = voiceRoot();
  const out = join(root, 'out');
  const media = fakeMedia({ durations: { 'voiceover.wav': 4.35 } });
  const said = [];
  const say = async ({ text, file }) => {
    said.push(text);
    writeFileSync(file, 'RIFF');
  };
  const preset = getPreset(loadVoices(root), 'g-kore');
  const text = 'Jujur, gue kira gampang.\n\nTernyata susah.';
  const meta = await renderVoice({ text, preset, out, root, run: media.run, say });
  assert.deepEqual(said, ['Jujur, gue kira gampang.', 'Ternyata susah.']);
  assert.deepEqual(meta.paragraphs.map((p) => [p.text, p.start, p.end, p.cached]), [['Jujur, gue kira gampang.', 0, 2, false], ['Ternyata susah.', 2.35, 4.35, false]]);
  assert.equal(meta.duration, 4.35);
  assert.deepEqual(meta.alignment, { wer: 0, unmatched: [] });
  assert.equal(JSON.parse(readFileSync(join(out, 'words.json'), 'utf8')).length, 6);
  assert.equal(JSON.parse(readFileSync(join(out, 'voice-meta.json'), 'utf8')).preset, 'g-kore');
  assert.ok(existsSync(join(out, 'voiceover.wav')));
  const whisper = media.calls.find((c) => c[0] === 'whisper-cli');
  assert.deepEqual(whisper.slice(whisper.indexOf('-l'), whisper.indexOf('-l') + 5), ['-l', 'id', '-nfa', '--dtw', 'large.v3.turbo']);
  assert.doesNotMatch(whisper[whisper.indexOf('--prompt') + 1], /gampang/);
  said.length = 0;
  const again = await renderVoice({ text, preset, out, root, run: media.run, say });
  assert.deepEqual(said, []);
  assert.deepEqual(again.paragraphs.map((p) => p.cached), [true, true]);
});

test('renderVoice warns when the alignment misses words and never falls back to another provider', async () => {
  const root = voiceRoot();
  const preset = getPreset(loadVoices(root), 'g-kore');
  const say = async ({ file }) => writeFileSync(file, 'RIFF');
  const meta = await renderVoice({ text: 'Jujur, gue kira gampang. Ternyata susah banget sekali.', preset, out: join(root, 'o1'), root, run: fakeMedia().run, say });
  assert.ok(meta.alignment.wer > 0.1);
  assert.match(meta.warnings[0], /alignment WER .* check banget, sekali\./);
  const boom = async () => {
    throw new Error('HTTP 400 bad voice');
  };
  await assert.rejects(renderVoice({ text: 'Halo.', preset, out: join(root, 'o2'), root, run: fakeMedia().run, say: boom }), /HTTP 400 bad voice/);
  assert.equal(existsSync(join(root, 'o2/voiceover.wav')), false);
});

test('renderVoice drives Gemini and Supertonic through makeSay, and takes a recording for "recorded"', async () => {
  const root = voiceRoot();
  const voices = loadVoices(root);
  const f = fakeFetch([{ status: 200, body: audioBody }]);
  await renderVoice({ text: 'Halo semua.', preset: getPreset(voices, 'g-kore'), out: join(root, 'g'), root, env: { GEMINI_TTS_API_KEY: 'k' }, fetchImpl: f, run: fakeMedia().run, align: false });
  assert.equal(f.calls[0].body.generation_config.speech_config[0].voice, 'kore');
  await assert.rejects(renderVoice({ text: 'Halo.', preset: getPreset(voices, 'g-kore'), out: join(root, 'g2'), root, env: {}, run: fakeMedia().run }), /GEMINI_TTS_API_KEY is not set/);
  const media = fakeMedia();
  await renderVoice({ text: 'Rp2,5 jt <short pause> saja.', preset: getPreset(voices, 'st-f2'), out: join(root, 's'), root, run: media.run, align: false });
  const uv = media.calls.find((c) => c[0] === 'uv');
  assert.equal(uv.at(-1), '<stdin:dua koma lima juta rupiah, saja.>');
  writeFileSync(join(root, 'take.m4a'), 'audio');
  const rec = await renderVoice({ text: 'Halo semua.', preset: getPreset(voices, 'recorded'), out: join(root, 'r'), root, run: fakeMedia().run, recorded: join(root, 'take.m4a') });
  assert.deepEqual(rec.paragraphs, []);
  await assert.rejects(renderVoice({ text: 'x', preset: getPreset(voices, 'recorded'), out: join(root, 'r2'), root, run: fakeMedia().run }), /needs --recorded/);
});

test('renderVoice never leaves a previous run\'s files next to a failed one', async () => {
  const root = voiceRoot();
  const out = join(root, 'o');
  const preset = getPreset(loadVoices(root), 'g-kore');
  const say = async ({ file }) => writeFileSync(file, 'RIFF');
  await renderVoice({ text: 'Jujur, gue kira gampang.', preset, out, root, run: fakeMedia().run, say });
  assert.ok(existsSync(join(out, 'words.json')));
  const broken = fakeMedia({ fail: { 'whisper-cli': 'model not found' } });
  await assert.rejects(renderVoice({ text: 'Ternyata susah.', preset, out, root, run: broken.run, say }), /whisper-cli failed/);
  for (const f of ['voiceover.wav', 'voice-meta.json', 'words.json']) assert.equal(existsSync(join(out, f)), false, f);
  await renderVoice({ text: 'Ternyata susah.', preset, out, root, run: fakeMedia().run, say, align: false });
  assert.equal(existsSync(join(out, 'words.json')), false, 'no stale words.json next to alignment: null');
});

test('renderVoice refuses to align a recording without the script text', async () => {
  const root = voiceRoot();
  writeFileSync(join(root, 'take.m4a'), 'audio');
  const preset = getPreset(loadVoices(root), 'recorded');
  await assert.rejects(renderVoice({ text: '', preset, out: join(root, 'r'), root, run: fakeMedia().run, recorded: join(root, 'take.m4a') }), /alignment needs the script text/);
  const meta = await renderVoice({ text: '', preset, out: join(root, 'r'), root, run: fakeMedia().run, recorded: join(root, 'take.m4a'), align: false });
  assert.equal(meta.alignment, null);
});
