import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { main, refArgs } from './voice.mjs';
import { WAV, audioBody, fakeFetch, fakeMedia, voiceRoot } from './voice-fixtures.mjs';

test('voice say writes a voiceover and prints its WER', async () => {
  const root = voiceRoot();
  const logs = [];
  const f = fakeFetch([{ status: 200, body: audioBody }, { status: 200, body: audioBody }]);
  await main(['say', '--preset', 'g-kore', '--text', 'Jujur, gue kira gampang.\n\nTernyata susah.', '--out', join(root, 'o')], { root, env: { GEMINI_TTS_API_KEY: 'k' }, fetchImpl: f, run: fakeMedia().run, log: (m) => logs.push(m) });
  assert.match(logs[0], /^voiceover .*voiceover\.wav \(2 s, WER 0\)$/);
  await assert.rejects(main(['say', '--preset', 'g-kore', '--out', join(root, 'o')], { root, run: fakeMedia().run }), /--text <text> or --file/);
});

test('voice ref cuts a 24 kHz mono clip of 10-30 s and transcribes it', async () => {
  const root = voiceRoot();
  writeFileSync(join(root, 'take.mp4'), 'v');
  assert.deepEqual(refArgs({ from: 'a.mp4', at: 12.5, dur: 20, out: 'ref.wav' }), ['-y', '-loglevel', 'error', '-ss', '12.5', '-t', '20', '-i', 'a.mp4', '-vn', '-ar', '24000', '-ac', '1', '-sample_fmt', 's16', 'ref.wav']);
  await assert.rejects(main(['ref', '--from', join(root, 'take.mp4'), '--at', '3', '--dur', '8'], { root, run: fakeMedia().run }), /--dur must be 10-30/);
  const media = fakeMedia({ durations: { 'ref.part.wav': 20 } });
  await main(['ref', '--from', join(root, 'take.mp4'), '--at', '3', '--dur', '20'], { root, run: media.run, log: () => {} });
  assert.equal(readFileSync(join(root, 'shared/voices/dena/ref.txt'), 'utf8'), '\n');
  assert.equal(readFileSync(join(root, 'shared/voices/dena/ref.wav'), 'utf8'), 'RIFF');
  writeFileSync(join(root, 'shared/voices/dena/ref.wav'), 'approved');
  await assert.rejects(main(['ref', '--from', join(root, 'take.mp4'), '--at', '300', '--dur', '20'], { root, run: fakeMedia({ durations: { 'ref.part.wav': 4 } }).run }), /reference clip must be 10-30 s long \(got 4 s\)/);
  assert.equal(readFileSync(join(root, 'shared/voices/dena/ref.wav'), 'utf8'), 'approved', 'a failed retry keeps the approved reference');
  assert.equal(existsSync(join(root, 'shared/voices/dena/ref.part.wav')), false);
});

test('voice clone needs consent and a reference, and writes the voice id to shared/voices', async () => {
  const root = voiceRoot();
  const env = { GEMINI_TTS_API_KEY: 'k' };
  await assert.rejects(main(['clone'], { root, env }), /needs --consent .*Saya pemilik suara ini/);
  writeFileSync(join(root, 'consent.m4a'), 'c');
  await assert.rejects(main(['clone', '--consent', join(root, 'consent.m4a')], { root, env, run: fakeMedia().run }), /ref\.wav not found; run npm run voice -- ref first/);
  mkdirSync(join(root, 'shared/voices/dena'), { recursive: true });
  writeFileSync(join(root, 'shared/voices/dena/ref.wav'), 'R');
  const f = fakeFetch([{ status: 200, body: { id: 'voice_dena', type: 'replicated', model: 'gemini-3.8-flash-tts', expire_time: '2027-09-29T00:00:00Z' } }]);
  await assert.rejects(main(['clone', '--consent', join(root, 'consent.m4a')], { root, env, run: fakeMedia({ durations: { 'ref.wav': 20, 'consent.part.wav': 45 } }).run }), /consent clip must be 2-30 s long/);
  const media = fakeMedia({ durations: { 'ref.wav': 20, 'consent.part.wav': 6 } });
  await main(['clone', '--consent', join(root, 'consent.m4a')], { root, env, fetchImpl: f, run: media.run, now: () => new Date('2026-09-29T10:00:00Z'), log: () => {} });
  const saved = JSON.parse(readFileSync(join(root, 'shared/voices/dena/voice.json'), 'utf8'));
  assert.deepEqual([saved.id, saved.type, saved.expireTime], ['voice_dena', 'replicated', '2027-09-29T00:00:00Z']);
  assert.equal(f.calls[0].body.voice.type, 'replicated');
  await assert.rejects(main(['clone', '--consent', join(root, 'consent.m4a')], { root, env, run: media.run }), /already exists; pass --force/);
});

test('voice design stores the voice id and its preview; voices filters the prebuilt list', async () => {
  const root = voiceRoot();
  const env = { GEMINI_TTS_API_KEY: 'k' };
  await assert.rejects(main(['design', '--name', 'designed-a', '--prompt', 'x', '--gender', 'robot'], { root, env }), /--gender must be one of/);
  const f = fakeFetch([{ status: 200, body: { id: 'voice_d1', prompted: { sample_audio: { data: WAV.toString('base64') } } } }]);
  await main(['design', '--name', 'designed-a', '--prompt', 'Narator Indonesia, hangat'], { root, env, fetchImpl: f, log: () => {} });
  assert.equal(JSON.parse(readFileSync(join(root, 'shared/voices/designed-a/voice.json'), 'utf8')).id, 'voice_d1');
  assert.deepEqual(readFileSync(join(root, 'shared/voices/designed-a/sample.wav')), WAV);
  assert.equal(f.calls[0].body.voice.language_code, 'id-ID');
  await assert.rejects(main(['design', '--name', 'designed-a', '--prompt', 'lagi'], { root, env }), /voice\.json already exists; pass --force/);
  const logs = [];
  const list = fakeFetch([{ status: 200, body: { voices: [{ id: 'kore', language_code: 'en-US', gender: 'female', pitch: 'medium', persona: 'Host' }, { id: 'jv-id-concierge-6', language_code: 'jv-ID', gender: 'female', pitch: 'medium', persona: 'Tech' }] } }]);
  await main(['voices', '--lang', 'jv'], { root, env, fetchImpl: list, log: (m) => logs.push(m) });
  assert.deepEqual(logs, ['jv-id-concierge-6\tjv-ID\tfemale\tmedium\tTech', '1 of 2 prebuilt voices']);
});

test('voice test build refuses a seed that is not an integer', async () => {
  await assert.rejects(main(['test', 'build', '--seed', 'abc'], { root: voiceRoot() }), /--seed must be an integer/);
});
