// `video bgm` (ADR-0025, RD-06-26..28): one BGM track from shared/music/ cut or looped to the voiceover length,
// faded, set to about -30 LUFS, and ducked under the voice with sidechaincompress -> bgm.wav + bgm.json.
// One ffmpeg call, deterministic for the same inputs. Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loudnessArgs, parseLoudnorm } from './cut-plan.mjs';
import { LICENSES, MUSIC_DIR, checkCatalog, findTrack, readCatalog } from './music.mjs';
import { writeJson } from './voice/render.mjs';
import { probeDuration } from '../video.mjs';

export const BGM = {
  target: -30, // LUFS before ducking
  xfade: 1, // seconds, loop seam
  fadeIn: 0.5,
  fadeOut: 1.5,
  duck: { threshold: 0.05, ratio: 8, attack: 20, release: 400 },
};
const r3 = (x) => Math.round(x * 1000) / 1000;

// How many copies of the track cover the video: the first starts at `from`, each next overlaps by the crossfade.
export function bgmCopies({ trackDuration, from, duration, xfade = BGM.xfade }) {
  const first = trackDuration - from;
  if (!(first > xfade)) throw new Error(`--from ${from} leaves less than ${xfade} s of the track`);
  return first >= duration ? 1 : 1 + Math.ceil((duration - first) / (trackDuration - xfade));
}

export const bgmGain = (inputI) => (inputI === null ? 0 : r3(Math.max(-30, Math.min(20, BGM.target - inputI))));

export function bgmArgs({ track, from, copies, voice, duration, gainDb, out }) {
  const fmt = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';
  const inputs = ['-ss', String(from), '-i', track, ...Array.from({ length: copies - 1 }, () => ['-i', track]).flat(), '-i', voice];
  const g = Array.from({ length: copies }, (_, k) => `[${k}:a]${fmt}[t${k}]`);
  let last = 't0';
  for (let k = 1; k < copies; k++) {
    g.push(`[${last}][t${k}]acrossfade=d=${BGM.xfade}:c1=tri:c2=tri[x${k}]`);
    last = `x${k}`;
  }
  // apad on both inputs + a hard atrim: sidechaincompress otherwise stops early, at a different point each run
  g.push(`[${last}]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${gainDb}dB,afade=t=in:d=${BGM.fadeIn},afade=t=out:st=${r3(duration - BGM.fadeOut)}:d=${BGM.fadeOut},apad[bg]`);
  g.push(`[${copies}:a]${fmt},apad[key]`);
  const { threshold, ratio, attack, release } = BGM.duck;
  g.push(`[bg][key]sidechaincompress=threshold=${threshold}:ratio=${ratio}:attack=${attack}:release=${release},atrim=0:${duration}[out]`);
  return ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', g.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', out];
}

function exec(run, args) {
  const r = run('ffmpeg', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`ffmpeg failed (exit ${r.status}): ${String(r.stderr || '').trim().split('\n').slice(-2).join(' ')}`);
  return r;
}

export function runBgm({ dir, root = '.', trackId, from = 0, run = spawnSync }) {
  const voice = join(dir, 'processed-audio.wav');
  if (!existsSync(voice)) throw new Error(`${voice} not found; run npm run video -- voice <slug> first`);
  const f = Number(from);
  if (!Number.isFinite(f) || f < 0) throw new Error('--from must be a number of seconds >= 0');
  const catalog = readCatalog(root);
  const t = findTrack(catalog, trackId);
  if (t.rejected) throw new Error(`${t.id} was rejected in the Studio (tab Musik); pick another track`);
  if (!LICENSES[t.license]) throw new Error(`${t.id}: license "${t.license}" is not allowed (ADR-0024)`);
  const problems = checkCatalog(root).filter((p) => p.startsWith(`${t.id}:`));
  if (problems.length) throw new Error(`${problems.join('; ')}; run npm run music -- check`);
  const track = join(root, MUSIC_DIR, t.file);
  const duration = probeDuration(voice, run);
  const copies = bgmCopies({ trackDuration: t.duration, from: f, duration });
  const measured = ['-hide_banner', '-nostats', '-ss', String(f), '-t', String(Math.min(duration, t.duration - f)), ...loudnessArgs(track).slice(2)];
  const gainDb = bgmGain(parseLoudnorm(exec(run, measured).stderr));
  const out = join(dir, 'bgm.wav');
  const part = join(dir, 'bgm.part.wav');
  rmSync(part, { force: true });
  exec(run, bgmArgs({ track, from: f, copies, voice, duration, gainDb, out: part }));
  renameSync(part, out);
  const meta = { version: 1, track: t.id, file: t.file, sha256: createHash('sha256').update(readFileSync(out)).digest('hex'), from: f, duration, copies, gainDb, duck: BGM.duck };
  writeJson(join(dir, 'bgm.json'), meta);
  return meta;
}
