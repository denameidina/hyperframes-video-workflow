// Voice synthesis (ADR-0023, RD-06-02..05): one provider call per paragraph, cached by content hash, edges trimmed,
// joined with a fixed gap, one loudness pass to -16 LUFS (same target and limiter as `video cut`) -> voiceover.wav.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { LOUDNESS, gainDb, loudnessArgs, parseLoudnorm } from '../cut-plan.mjs';
import { probeDuration } from '../../video.mjs';
import { exec } from './exec.mjs';
import { normalizeForSpeech } from './normalize.mjs';
import { forProvider, splitParagraphs, stripTags } from './script.mjs';

export const OUT_RATE = 48000;
export const GAP = 0.35; // seconds between paragraphs
const r3 = (x) => Math.round(x * 1000) / 1000;

export function cacheKey({ provider, model = '', voice = '', style = '', speed = '', text }) {
  return createHash('sha256').update(JSON.stringify([provider, model, voice, style, String(speed), text])).digest('hex').slice(0, 32);
}

const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB';
export const prepArgs = (src, dst) => ['-y', '-loglevel', 'error', '-i', src, '-af', `aresample=${OUT_RATE},aformat=sample_fmts=s16:channel_layouts=mono,${TRIM},areverse,${TRIM},areverse`, dst];

export function concatArgs(files, out, gap = GAP) {
  const labels = [];
  const gaps = [];
  files.forEach((_, k) => {
    labels.push(`[${k}:a]`);
    if (k < files.length - 1) {
      gaps.push(`anullsrc=r=${OUT_RATE}:cl=mono:d=${gap}[g${k}]`);
      labels.push(`[g${k}]`);
    }
  });
  const graph = [...gaps, `${labels.join('')}concat=n=${labels.length}:v=0:a=1[a]`].join(';');
  return ['-y', '-loglevel', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex', graph, '-map', '[a]', '-ar', String(OUT_RATE), '-ac', '1', out];
}

export const finalArgs = (src, gain, out) => ['-y', '-loglevel', 'error', '-i', src, '-af', `volume=${gain}dB,alimiter=limit=${LOUDNESS.peak}:level=0:latency=1`, '-ar', String(OUT_RATE), '-ac', '1', out];

// raw -> <out>/voiceover.wav at the loudness target; raw is removed.
function finish({ raw, out, run }) {
  const r = exec(run, 'ffmpeg', loudnessArgs(raw));
  const part = join(out, 'voiceover.part.wav');
  exec(run, 'ffmpeg', finalArgs(raw, gainDb(parseLoudnorm(r.stderr)), part));
  renameSync(part, join(out, 'voiceover.wav'));
  rmSync(raw, { force: true });
}

// say({ text, file }) writes the provider's WAV for one paragraph to file.
export async function synthesize({ text, preset, voiceId = preset.voice || '', out, say, lexicon = [], run = spawnSync }) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) throw new Error('the script has no text');
  mkdirSync(join(out, 'cache'), { recursive: true });
  const items = [];
  for (const p of paragraphs) {
    const spoken = normalizeForSpeech(forProvider(p, preset.provider), { lexicon, provider: preset.provider });
    const hash = cacheKey({ provider: preset.provider, model: preset.model, voice: voiceId, style: preset.style, speed: preset.speed, text: spoken });
    const file = join(out, 'cache', `${hash}.wav`);
    const cached = existsSync(file);
    if (!cached) {
      const src = join(out, 'cache', `${hash}.src.wav`);
      const part = join(out, 'cache', `${hash}.part.wav`);
      rmSync(src, { force: true });
      await say({ text: spoken, file: src });
      if (!existsSync(src)) throw new Error(`${preset.provider} wrote no audio for "${p.slice(0, 60)}"`);
      exec(run, 'ffmpeg', prepArgs(src, part));
      renameSync(part, file);
      rmSync(src, { force: true });
    }
    items.push({ hash, text: stripTags(p), cached, file, duration: probeDuration(file, run) });
  }
  const raw = join(out, 'voice-raw.wav');
  exec(run, 'ffmpeg', concatArgs(items.map((x) => x.file), raw));
  finish({ raw, out, run });
  let t = 0;
  const timed = items.map((x) => {
    const start = r3(t);
    t += x.duration;
    const end = r3(t);
    t += GAP;
    return { hash: x.hash, text: x.text, start, end, cached: x.cached };
  });
  return { paragraphs: timed, duration: probeDuration(join(out, 'voiceover.wav'), run) };
}

// Dena's own recording: same trim and loudness, no paragraphs (alignment gives the words).
export function prepareRecorded({ file, out, run = spawnSync }) {
  if (!existsSync(file)) throw new Error(`${file} not found`);
  mkdirSync(out, { recursive: true });
  const raw = join(out, 'voice-raw.wav');
  exec(run, 'ffmpeg', prepArgs(file, raw));
  finish({ raw, out, run });
  return { paragraphs: [], duration: probeDuration(join(out, 'voiceover.wav'), run) };
}
