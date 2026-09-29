// `video music` (ADR-0027, RD-06-30..32): the time base of a music-driven generate format. A catalog track is
// analysed once (tempo, beats, 4/4 downbeats, energy; cached per sha256 in shared/music/beats/), cut to whole bars
// from a downbeat, and set to -16 LUFS -> processed-audio.wav + beats.json. Node 22+ built-ins (ADR-0007); the
// analyser is a uv sidecar (beats.py), like Supertonic (ADR-0023).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOUDNESS, gainDb, loudnessArgs, parseLoudnorm } from '../cut-plan.mjs';
import { DURATION, isMusicFormat, readFormat } from '../formats.mjs';
import { isGenerate } from '../gates.mjs';
import { syncDuration } from '../generate.mjs';
import { LICENSES, MUSIC_DIR, checkCatalog, findTrack, readCatalog } from '../music.mjs';
import { exec } from '../voice/exec.mjs';
import { writeJson } from '../voice/render.mjs';

export const ANALYZER = { python: '3.12', packages: ['librosa==1.0.0', 'soundfile==0.14.0'] };
export const EDGE_FADE = 0.02; // seconds: no click at the start, or where a loop joins
export const DOWNBEAT_SURE = 1.25; // best / second-best phase; below it `video music` asks for a listen
const SCRIPT = join(import.meta.dirname, 'beats.py');
// a cached analysis is reused only when it came from this analyser: beats.py and the pinned packages
export const ANALYZER_ID = createHash('sha256').update(readFileSync(SCRIPT)).update(ANALYZER.packages.join(',')).digest('hex').slice(0, 12);
const r3 = (x) => Math.round(x * 1000) / 1000;
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

export const analyzerArgs = (file) => ['run', '--quiet', '--python', ANALYZER.python, ...ANALYZER.packages.flatMap((p) => ['--with', p]), 'python', SCRIPT, file];
export const barLength = (bpm) => 240 / bpm; // four beats (4/4)

function checkAnalysis(a) {
  const ok = a?.version === 1 && a.bpm > 0 && a.duration > 0 && Array.isArray(a.beats) && a.beats.length >= 8 && Array.isArray(a.downbeats) && a.downbeats.length > 0;
  if (!ok) throw new Error('the beat analyser returned no usable beat grid');
  return a;
}

// shared/music/beats/<id>.json keeps the analysis next to the sha256 of the file and the analyser it came from
export function analyzeTrack({ root = '.', track, run = spawnSync }) {
  const file = join(root, MUSIC_DIR, track.file);
  const sha = sha256(file);
  const cacheFile = join(root, MUSIC_DIR, 'beats', `${track.id}.json`);
  if (existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
      if (cached.sha256 === sha && cached.analyzer === ANALYZER_ID) return checkAnalysis(cached);
    } catch {
      // unreadable or unusable cache: analyse again
    }
  }
  const r = exec(run, 'uv', analyzerArgs(file));
  let a;
  try {
    a = JSON.parse(String(r.stdout).trim().split('\n').at(-1));
  } catch {
    throw new Error('the beat analyser printed no JSON');
  }
  const out = { ...checkAnalysis(a), track: track.id, sha256: sha, analyzer: ANALYZER_ID };
  mkdirSync(join(root, MUSIC_DIR, 'beats'), { recursive: true });
  writeFileSync(`${cacheFile}.part`, `${JSON.stringify(out)}\n`);
  renameSync(`${cacheFile}.part`, cacheFile);
  return out;
}

export function barsHint(bpm, format) {
  const [lo, hi] = DURATION[format];
  const bar = barLength(bpm);
  return `at ${r3(bpm)} BPM a bar is ${r3(bar)} s; a ${format} (${lo}–${hi} s) fits --bars ${Math.ceil(lo / bar)}–${Math.floor(hi / bar)}`;
}

export function planCut({ analysis, from = 0, bars, format }) {
  if (!Number.isInteger(bars) || bars < 1) throw new Error(`--bars must be a whole number of bars; ${barsHint(analysis.bpm, format)}`);
  const bar = barLength(analysis.bpm);
  const downs = analysis.downbeats;
  const i = downs.findIndex((d) => d >= from - 1e-6);
  if (i < 0) throw new Error(`--from ${from} is after the last downbeat (${downs.at(-1)} s) of the track`);
  const start = downs[i];
  // the grid can run out near the end of a track: count on in bar periods from the last detected downbeat
  const edge = (k) => downs[i + k] ?? downs.at(-1) + (i + k - (downs.length - 1)) * bar;
  const end = edge(bars);
  if (end > analysis.duration + 1e-6) throw new Error(`--bars ${bars} from ${r3(start)} s runs past the end of the track (${analysis.duration} s)`);
  const duration = r3(end - start);
  const [lo, hi] = DURATION[format];
  if (duration < lo - 1e-6 || duration > hi + 1e-6) throw new Error(`${bars} bars = ${duration} s, outside ${lo}–${hi} s; ${barsHint(analysis.bpm, format)}`);
  const inside = (t) => t >= start - 1e-6 && t < end - 1e-6;
  const shift = (t) => r3(t - start);
  const energy = (s, e) => {
    const v = analysis.beats.map((t, k) => [t, analysis.beatEnergy?.[k] ?? 0]).filter(([t]) => t >= s - 1e-6 && t < e - 1e-6).map(([, x]) => x);
    return v.length ? r3(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  };
  const warnings = [];
  for (let k = 0; k < bars; k++) {
    const len = r3(edge(k + 1) - edge(k));
    if (Math.abs(len - bar) > 0.1 * bar) warnings.push(`bar ${k + 1} is ${len} s, not ${r3(bar)} s: the beat grid is uneven there; listen to the cut or try another --from`);
  }
  return {
    start: r3(start),
    end: r3(end),
    duration,
    warnings,
    loop: format === 'kinetic-post',
    beats: analysis.beats.filter(inside).map(shift),
    downbeats: downs.filter(inside).map(shift),
    barList: Array.from({ length: bars }, (_, k) => ({ n: k + 1, start: shift(edge(k)), end: shift(edge(k + 1)), energy: energy(edge(k), edge(k + 1)) })),
  };
}

// kinetic-post: 20 ms fades only, so the loop seam (a bar line) does not click; motion-short fades out over its last bar
export function musicArgs({ track, start, duration, loop, bar, gain, out }) {
  const tail = loop ? EDGE_FADE : r3(Math.min(bar, duration));
  const af = [`volume=${gain}dB`, `afade=t=in:d=${EDGE_FADE}`, `afade=t=out:st=${r3(duration - tail)}:d=${tail}`, `alimiter=limit=${LOUDNESS.peak}:level=0:latency=1`].join(',');
  return ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(duration), '-i', track, '-af', af, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', out];
}

export function runMusic({ dir, root = '.', trackId, from = 0, bars, run = spawnSync }) {
  if (!isGenerate(dir)) throw new Error(`${dir} is not a generate-mode project; start one with npm run video -- new <slug> --generate --format kinetic-post`);
  const format = readFormat(dir);
  if (!isMusicFormat(format)) throw new Error(`${dir} is an explainer: its music is a ducked bed under the voice (npm run video -- bgm); video music is for kinetic-post and motion-short`);
  const f = Number(from);
  if (!Number.isFinite(f) || f < 0) throw new Error('--from must be a number of seconds >= 0');
  const t = findTrack(readCatalog(root), trackId);
  if (t.rejected) throw new Error(`${t.id} was rejected in the Studio (tab Musik); pick another track`);
  if (!LICENSES[t.license]) throw new Error(`${t.id}: license "${t.license}" is not allowed (ADR-0024)`);
  const problems = checkCatalog(root).filter((p) => p.startsWith(`${t.id}:`));
  if (problems.length) throw new Error(`${problems.join('; ')}; run npm run music -- check`);
  const analysis = analyzeTrack({ root, track: t, run });
  const n = bars === undefined ? Number.NaN : Number(bars);
  const cut = planCut({ analysis, from: f, bars: n, format });
  const track = join(root, MUSIC_DIR, t.file);
  const measured = ['-hide_banner', '-nostats', '-ss', String(cut.start), '-t', String(cut.duration), ...loudnessArgs(track).slice(2)];
  const gain = gainDb(parseLoudnorm(exec(run, 'ffmpeg', measured).stderr));
  const audio = join(dir, 'processed-audio.wav');
  const part = join(dir, 'processed-audio.part.wav');
  rmSync(part, { force: true });
  try {
    exec(run, 'ffmpeg', musicArgs({ track, start: cut.start, duration: cut.duration, loop: cut.loop, bar: barLength(analysis.bpm), gain, out: part }));
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  renameSync(part, audio);
  const confidence = analysis.downbeatConfidence ?? null;
  const warnings = [
    ...(confidence !== null && confidence < DOWNBEAT_SURE ? [`downbeats are uncertain on this track (confidence ${confidence}): listen to where the cut starts and loops, or pick another track`] : []),
    ...cut.warnings,
  ];
  const meta = { version: 1, track: t.id, file: t.file, sha256: analysis.sha256, meter: analysis.meter || '4/4', bpm: analysis.bpm, downbeatConfidence: confidence, from: cut.start, bars: n, duration: cut.duration, loop: cut.loop, warnings, beats: cut.beats, downbeats: cut.downbeats, barList: cut.barList };
  writeJson(join(dir, 'beats.json'), meta);
  const index = join(dir, 'index.html');
  if (existsSync(index)) {
    writeFileSync(`${index}.part`, syncDuration(readFileSync(index, 'utf8'), cut.duration));
    renameSync(`${index}.part`, index);
  }
  return meta;
}
