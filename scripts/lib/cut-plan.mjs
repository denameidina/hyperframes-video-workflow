// Pure plan for `npm run video -- cut <slug>` (ADR-0022, RD-03-69/73/74): validate cut-list.json against
// sources.json, build the one ffmpeg call that normalizes and joins the speech segments, and compute cut-map.json.
// Node 22+, built-in modules only (ADR-0007).
import { join } from 'node:path';

export const RENDERED = ['keep', 'tighten', 'move-to-hook', 'preserve-human'];
export const DROPPED = ['cut-silence', 'cut-filler', 'cut-repeat', 'cut-tangent', 'cut-unclear', 'cut-retake'];
export const OUT = { width: 1080, height: 1920, fps: 30, rate: 48000 };
export const LOUDNESS = { target: -16, peak: 0.84 }; // -16 LUFS per source; limiter ceiling ~ -1.5 dBTP
export const FADE = 0.015; // seconds at every segment edge, against clicks at the joins
export const DEFAULT_SPEED = 1.2;
const ms = (x) => Math.round(x * 1000) / 1000;

export function validateCutList(cutList, manifest) {
  const errors = [];
  const speed = cutList?.speed ?? DEFAULT_SPEED;
  if (typeof speed !== 'number' || !(speed >= 0.5 && speed <= 2)) errors.push(`speed must be a number from 0.5 to 2 (got ${cutList?.speed})`);
  if (cutList?.source !== undefined) errors.push('top-level "source" is gone; put "source": "<id>" on each segment (ADR-0022)');
  if (!Array.isArray(cutList?.segments)) errors.push('segments must be an array');
  const segs = Array.isArray(cutList?.segments) ? cutList.segments : [];
  const byId = new Map(manifest.sources.map((s) => [s.id, s]));
  segs.forEach((g, i) => {
    const at = `segments[${i}]`;
    if (![...RENDERED, ...DROPPED].includes(g.action)) return errors.push(`${at}.action "${g.action}" is not one of ${[...RENDERED, ...DROPPED].join(', ')}`);
    const s = byId.get(g.source);
    if (!s) return errors.push(`${at}.source "${g.source}" is not in sources.json`);
    if (!RENDERED.includes(g.action)) return;
    if (s.kind !== 'video' || s.role !== 'speech') errors.push(`${at}.source ${s.id} is not a speech video (kind ${s.kind}, role ${s.role})`);
    if (s.kind === 'video' && s.probe?.hasAudio === false) errors.push(`${at}.source ${s.id} has no audio stream`);
    const d = s.probe?.duration;
    if (!(typeof g.sourceStart === 'number' && typeof g.sourceEnd === 'number' && g.sourceStart >= 0 && g.sourceStart < g.sourceEnd)) errors.push(`${at} needs 0 <= sourceStart < sourceEnd`);
    else if (s.kind === 'video' && !(d > 0)) errors.push(`${at}.source ${s.id} has no probed duration; run npm run video -- sources`);
    else if (d > 0 && g.sourceEnd > d + 1e-3) errors.push(`${at}.sourceEnd ${g.sourceEnd} is past the end of ${s.id} (${d} s)`);
    for (const k of ['cropX', 'cropY']) if (g[k] !== undefined && !(typeof g[k] === 'number' && g[k] >= 0 && g[k] <= 1)) errors.push(`${at}.${k} must be a number from 0 to 1`);
  });
  if (!segs.some((g) => RENDERED.includes(g.action))) errors.push(`no segment to render (action ${RENDERED.join('|')})`);
  if (errors.length) throw new Error(`cut-list.json is invalid:\n- ${errors.join('\n- ')}`);
  return segs.filter((g) => RENDERED.includes(g.action));
}

// Output time of each rendered segment, in the processed.mp4 timeline (source seconds / speed).
export function cutMapOf(cutList) {
  const speed = cutList.speed ?? DEFAULT_SPEED;
  let t = 0;
  const segments = cutList.segments.filter((g) => RENDERED.includes(g.action)).map((g, index) => {
    const outStart = t;
    t += (g.sourceEnd - g.sourceStart) / speed;
    return { index, source: g.source, sourceStart: g.sourceStart, sourceEnd: g.sourceEnd, outStart: ms(outStart), outEnd: ms(t) };
  });
  return { speed, duration: ms(t), segments };
}

// Pass 1: measure a whole source once; the gain is applied to every segment cut from it.
export const loudnessArgs = (file) => ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `loudnorm=I=${LOUDNESS.target}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'];

export function parseLoudnorm(stderr) {
  const m = /\{[^{}]*"input_i"[^{}]*\}/.exec(String(stderr));
  if (!m) throw new Error('loudnorm printed no measurement');
  const i = Number.parseFloat(JSON.parse(m[0]).input_i);
  return Number.isFinite(i) ? i : null; // "-inf" = silent source
}

export const gainDb = (inputI) => (inputI === null ? 0 : ms(Math.max(-20, Math.min(20, LOUDNESS.target - inputI))));

export function buildCutPlan({ manifest, cutList, dir, loudness, out, canvas = OUT }) {
  const segs = validateCutList(cutList, manifest);
  const speed = cutList.speed ?? DEFAULT_SPEED;
  const byId = new Map(manifest.sources.map((s) => [s.id, s]));
  const { fps, rate } = OUT;
  const { width: W, height: H } = canvas;
  const inputs = [];
  const chains = [];
  segs.forEach((g, k) => {
    const s = byId.get(g.source);
    const d = ms(g.sourceEnd - g.sourceStart);
    // Input seeking re-encodes, so -ss/-t are frame accurate. ffmpeg auto-rotates (DJI rotation=-90): no transpose.
    inputs.push('-ss', String(g.sourceStart), '-t', String(d), '-i', join(dir, s.path));
    chains.push(`[${k}:v:0]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})*${g.cropX ?? 0.5}:${g.cropY === undefined ? `(ih-${H})/2` : `(ih-${H})*${g.cropY}`},setsar=1,fps=${fps},format=yuv420p[v${k}]`);
    chains.push(`[${k}:a:0]aresample=${rate},aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${gainDb(loudness[s.id] ?? null)}dB,alimiter=limit=${LOUDNESS.peak}:level=0:latency=1,afade=t=in:d=${FADE},afade=t=out:st=${ms(Math.max(0, d - FADE))}:d=${FADE}[a${k}]`);
  });
  chains.push(`${segs.map((_, k) => `[v${k}][a${k}]`).join('')}concat=n=${segs.length}:v=1:a=1[vc][ac]`);
  chains.push(`[vc]setpts=PTS/${speed},fps=${fps}[v]`);
  chains.push(`[ac]atempo=${speed}[a]`);
  const args = [
    '-y', '-loglevel', 'error', ...inputs, '-filter_complex', chains.join(';'), '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-g', String(fps), '-keyint_min', String(fps), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', String(rate), '-movflags', '+faststart', '-f', 'mp4', out,
  ];
  return { args, cutMap: cutMapOf(cutList), sources: [...new Set(segs.map((g) => g.source))] };
}
