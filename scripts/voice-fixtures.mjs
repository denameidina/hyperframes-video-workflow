// Shared fixtures for the voice adapter tests (not a test file itself).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

export const WHISPER = {
  transcription: [
    {
      offsets: { from: 0, to: 2000 },
      tokens: [
        { text: '[_BEG_]', t_dtw: -1, offsets: { from: 0, to: 0 } },
        { text: ' J', t_dtw: 10 }, { text: 'ujur', t_dtw: 20 }, { text: ',', t_dtw: 40 },
        { text: ' gue', t_dtw: 60 }, { text: ' kira', t_dtw: 90 }, { text: ' gampang', t_dtw: 130 }, { text: '.', t_dtw: 180 },
        { text: '[_TT_100]', t_dtw: -1 },
      ],
    },
    { offsets: { from: 2350, to: 4000 }, tokens: [{ text: ' Ternyata', t_dtw: 240 }, { text: ' susah', t_dtw: 320 }, { text: '.', t_dtw: 380 }] },
  ],
};
export const WAV = Buffer.from('RIFF0000WAVEfmt fake');
export const audioBody = { steps: [{ type: 'model_output', content: [{ type: 'audio', mime_type: 'audio/wav', data: WAV.toString('base64') }] }] };

// fetch stand-in: answers from a queue of { status, body }; records every call.
export function fakeFetch(queue) {
  const calls = [];
  const f = async (url, opts = {}) => {
    calls.push({ url, method: opts.method, headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : undefined });
    const r = queue.shift();
    if (!r) throw new Error(`unexpected fetch ${url}`);
    return { ok: r.status < 400, status: r.status, text: async () => JSON.stringify(r.body ?? {}) };
  };
  f.calls = calls;
  return f;
}

// spawnSync stand-in for ffmpeg, ffprobe, whisper-cli, and uv: writes the output file each tool would write.
export function fakeMedia({ durations = {}, whisper = WHISPER, fail = {} } = {}) {
  const calls = [];
  const run = (cmd, args, opts = {}) => {
    calls.push([basename(cmd), ...args]);
    const name = basename(cmd);
    if (fail[name]) return { status: 1, stdout: '', stderr: fail[name] };
    if (name === 'ffprobe') return { status: 0, stdout: `${durations[basename(args.at(-1))] ?? 2}\n`, stderr: '' };
    if (name === 'ffmpeg' && args.includes('null')) return { status: 0, stdout: '', stderr: '{\n"input_i" : "-20.00",\n"input_tp" : "-3.00"\n}' };
    if (name === 'ffmpeg') {
      writeFileSync(args.at(-1), 'RIFF');
      return { status: 0, stdout: '', stderr: '' };
    }
    if (name === 'whisper-cli') {
      writeFileSync(`${args[args.indexOf('-of') + 1]}.json`, JSON.stringify(whisper));
      return { status: 0, stdout: '', stderr: '' };
    }
    if (name === 'uv') {
      writeFileSync(args[args.indexOf('--out') + 1], 'RIFF');
      calls.at(-1).push(`<stdin:${opts.input}>`);
      return { status: 0, stdout: '', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: `unexpected ${cmd}` };
  };
  return { run, calls };
}

export function voiceRoot() {
  const root = mkdtempSync(join(tmpdir(), 'voice-test-'));
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({
    version: 1,
    default: null,
    presets: {
      'g-kore': { provider: 'gemini', model: 'gemini-3.8-flash-tts', voice: 'kore', style: 'santai' },
      'dena-clone': { provider: 'gemini', model: 'gemini-3.8-flash-tts', voiceRef: 'shared/voices/dena/voice.json' },
      'st-f2': { provider: 'supertonic', voice: 'F2', speed: 1.05 },
      recorded: { provider: 'recorded' },
    },
  }));
  return root;
}
