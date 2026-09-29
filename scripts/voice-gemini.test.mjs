import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPreset, loadVoices, resolveVoiceId } from './lib/voice/presets.mjs';
import { createVoice, designRequest, geminiKey, geminiSay, listPrebuiltVoices, replicateRequest, speechRequest } from './lib/voice/providers/gemini.mjs';
import { supertonicArgs } from './lib/voice/providers/supertonic.mjs';
import { WAV, audioBody, fakeFetch, voiceRoot } from './voice-fixtures.mjs';

test('presets load, name their voice directly or through a private voice file', () => {
  const root = voiceRoot();
  const voices = loadVoices(root);
  assert.throws(() => getPreset(voices, 'nope'), /unknown voice preset "nope"/);
  assert.equal(resolveVoiceId(getPreset(voices, 'g-kore'), root), 'kore');
  assert.throws(() => resolveVoiceId(getPreset(voices, 'dena-clone'), root), /shared\/voices\/dena\/voice\.json not found.*clone or design/);
  mkdirSync(join(root, 'shared/voices/dena'), { recursive: true });
  writeFileSync(join(root, 'shared/voices/dena/voice.json'), JSON.stringify({ id: 'voice_abc' }));
  assert.equal(resolveVoiceId(getPreset(voices, 'dena-clone'), root), 'voice_abc');
});

test('geminiKey reads GEMINI_TTS_API_KEY only', () => {
  assert.throws(() => geminiKey({ GEMINI_API_KEY: 'x' }), /GEMINI_TTS_API_KEY is not set/);
  assert.equal(geminiKey({ GEMINI_TTS_API_KEY: 'k' }), 'k');
});

test('speechRequest puts the style in speech_metadata and the voice in speech_config', () => {
  assert.deepEqual(speechRequest({ model: 'm', text: 'Halo', voice: 'kore' }), { model: 'm', input: 'Halo', response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: 'kore' }] } });
  assert.deepEqual(speechRequest({ model: 'm', text: 'Halo', voice: 'kore', style: 'santai', language: 'id-ID' }).input, [{ type: 'text', text: 'Halo', annotations: [{ type: 'speech_metadata', style: 'santai' }] }]);
  assert.deepEqual(speechRequest({ model: 'm', text: 'Halo', voice: 'kore', language: 'id-ID' }).generation_config.speech_config, [{ voice: 'kore', language: 'id-ID' }]);
});

test('geminiSay returns WAV bytes, retries 429 and 5xx with backoff, and fails at once on other errors', async () => {
  const slept = [];
  const sleep = async (ms) => slept.push(ms);
  const f = fakeFetch([{ status: 429, body: { error: { message: 'slow down' } } }, { status: 503, body: {} }, { status: 200, body: audioBody }]);
  const out = await geminiSay({ text: 'Halo', model: 'gemini-3.8-flash-tts', voice: 'kore', key: 'k', fetchImpl: f, sleep });
  assert.deepEqual(out, WAV);
  assert.deepEqual(slept, [1000, 2000]);
  assert.equal(f.calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(f.calls[0].headers['x-goog-api-key'], 'k');
  const bad = fakeFetch([{ status: 400, body: { error: { message: "Unknown parameter 'x'" } } }]);
  await assert.rejects(geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: bad, sleep }), /HTTP 400 Unknown parameter 'x'/);
  assert.equal(bad.calls.length, 1);
  const down = fakeFetch([500, 500, 500, 500].map((status) => ({ status, body: {} })));
  await assert.rejects(geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: down, sleep }), /HTTP 500/);
  assert.equal(down.calls.length, 4);
  const empty = fakeFetch([{ status: 200, body: { steps: [] } }]);
  await assert.rejects(geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: empty, sleep }), /no audio/);
});

test('listPrebuiltVoices follows page tokens', async () => {
  const f = fakeFetch([{ status: 200, body: { voices: [{ id: 'kore' }], next_page_token: 't2' } }, { status: 200, body: { voices: [{ id: 'puck' }] } }]);
  assert.deepEqual((await listPrebuiltVoices({ key: 'k', fetchImpl: f })).map((v) => v.id), ['kore', 'puck']);
  assert.match(f.calls[1].url, /\/voices\?type=prebuilt&page_size=100&page_token=t2$/);
});

test('createVoice sends design and replication requests once, never retrying', async () => {
  assert.deepEqual(designRequest({ model: 'm', name: 'a', prompt: 'hangat', gender: 'female' }), { store: true, voice: { model: 'm', type: 'prompted', display_name: 'a', language_code: 'id-ID', prompted: { input: 'hangat' }, gender: 'female' } });
  const rep = replicateRequest({ model: 'm', name: 'dena', source: Buffer.from('S'), consent: Buffer.from('C') });
  assert.deepEqual(rep.voice.replicated, { source_audio: { mime_type: 'audio/wav', data: 'Uw==' }, consent_audio: { mime_type: 'audio/wav', data: 'Qw==' } });
  const f = fakeFetch([{ status: 200, body: { id: 'voice_1', type: 'prompted', prompted: { sample_audio: { data: WAV.toString('base64') } } } }]);
  const v = await createVoice(designRequest({ model: 'm', name: 'a', prompt: 'hangat' }), { key: 'k', fetchImpl: f });
  assert.equal(v.id, 'voice_1');
  assert.deepEqual(v.sample, WAV);
  const busy = fakeFetch([{ status: 503, body: {} }]);
  await assert.rejects(createVoice(rep, { key: 'k', fetchImpl: busy, sleep: async () => {} }), /HTTP 503/);
  assert.equal(busy.calls.length, 1);
});

test('supertonicArgs pins the uv sidecar', () => {
  const a = supertonicArgs({ voice: 'F2', out: 'x.wav' });
  assert.deepEqual(a.slice(0, 6), ['run', '--quiet', '--python', '3.12', '--with', 'supertonic==1.3.1']);
  assert.ok(a.at(-9).endsWith('supertonic_say.py'));
  assert.deepEqual(a.slice(-8), ['--voice', 'F2', '--lang', 'id', '--speed', '1.05', '--out', 'x.wav']);
});

test('Gemini network failures and timeouts name Gemini; synthesis retries them, voice creation does not', async () => {
  const slept = [];
  const sleep = async (ms) => slept.push(ms);
  const f = fakeFetch([{ throws: new TypeError('fetch failed') }, { status: 200, body: audioBody }]);
  assert.deepEqual(await geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: f, sleep }), WAV);
  assert.deepEqual(slept, [1000]);
  assert.ok(f.calls[0].signal instanceof AbortSignal);
  const timeout = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
  const slow = fakeFetch([0, 1, 2, 3].map(() => ({ throws: timeout })));
  await assert.rejects(geminiSay({ text: 'Halo', model: 'm', voice: 'kore', key: 'k', fetchImpl: slow, sleep }), /^Error: Gemini POST \/interactions failed: no answer in 120 s$/);
  const down = fakeFetch([{ throws: new TypeError('fetch failed') }]);
  await assert.rejects(createVoice(designRequest({ model: 'm', name: 'a', prompt: 'x' }), { key: 'k', fetchImpl: down, sleep }), /Gemini POST \/voices failed: fetch failed/);
  assert.equal(down.calls.length, 1);
});
