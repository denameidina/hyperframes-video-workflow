import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCutPlan, cutMapOf, gainDb, parseLoudnorm, validateCutList } from './lib/cut-plan.mjs';
import { main } from './video.mjs';

const src = (id, extra = {}) => ({ id, path: `sources/${id}.mp4`, origin: 'project', kind: 'video', role: 'speech', roleSource: 'user', note: '', probe: { duration: 10, hasAudio: true }, ...extra });
const MANIFEST = { version: 1, sources: [
  src('s1'),
  src('s2', { probe: { duration: 20, hasAudio: true } }),
  src('b1', { role: 'broll' }),
  src('s9', { probe: { duration: 10, hasAudio: false } }),
  { id: 'i1', path: 'sources/i1.png', origin: 'project', kind: 'image', role: 'image', roleSource: 'detected', note: '', probe: { width: 1, height: 1 } },
] };
const seg = (source, sourceStart, sourceEnd, action = 'keep', extra = {}) => ({ source, sourceStart, sourceEnd, action, reason: 'r', ...extra });

test('validateCutList returns rendered segments in array order and skips dropped ones', () => {
  const cut = { speed: 1.2, segments: [seg('s2', 10, 16, 'move-to-hook'), seg('s1', 0, 2, 'cut-retake'), seg('s1', 2, 5, 'tighten')] };
  assert.deepEqual(validateCutList(cut, MANIFEST).map((g) => [g.source, g.sourceStart]), [['s2', 10], ['s1', 2]]);
});

test('validateCutList names every bad segment', () => {
  const cut = { source: 'raw/x.mp4', speed: 3, segments: [
    seg('s1', 0, 1), seg('zz', 0, 1), seg('b1', 0, 1), seg('s1', 5, 11), seg('s1', 4, 4), seg('s1', 0, 1, 'cut-everything'), seg('s1', 0, 1, 'keep', { cropX: 2 }), seg('s9', 0, 1), seg('i1', 0, 1),
  ] };
  const msg = (() => { try { validateCutList(cut, MANIFEST); return ''; } catch (e) { return e.message; } })();
  for (const part of [
    /speed must be a number from 0\.5 to 2/,
    /top-level "source" is gone/,
    /segments\[1\]\.source "zz" is not in sources\.json/,
    /segments\[2\]\.source b1 is not a speech video/,
    /segments\[3\]\.sourceEnd 11 is past the end of s1 \(10 s\)/,
    /segments\[4\] needs 0 <= sourceStart < sourceEnd/,
    /segments\[5\]\.action "cut-everything"/,
    /segments\[6\]\.cropX must be a number from 0 to 1/,
    /segments\[7\]\.source s9 has no audio stream/,
    /segments\[8\]\.source i1 is not a speech video/,
  ]) assert.match(msg, part);
  assert.throws(() => validateCutList({ segments: [seg('s1', 0, 1, 'cut-silence')] }, MANIFEST), /no segment to render/);
  assert.throws(() => validateCutList({ segments: [seg('u1', 0, 1)] }, { version: 1, sources: [src('u1', { probe: undefined })] }), /no probed duration/);
});

test('cutMapOf lays out rendered segments at speed', () => {
  const map = cutMapOf({ speed: 1.2, segments: [seg('s2', 10, 16, 'move-to-hook'), seg('s1', 0, 2, 'cut-retake'), seg('s1', 2, 5)] });
  assert.deepEqual(map, { speed: 1.2, duration: 7.5, segments: [
    { index: 0, source: 's2', sourceStart: 10, sourceEnd: 16, outStart: 0, outEnd: 5 },
    { index: 1, source: 's1', sourceStart: 2, sourceEnd: 5, outStart: 5, outEnd: 7.5 },
  ] });
  assert.equal(cutMapOf({ segments: [seg('s1', 0, 1.2)] }).duration, 1);
});

test('parseLoudnorm and gainDb', () => {
  const stderr = 'noise\n[Parsed_loudnorm_0 @ 0x1] \n{\n\t"input_i" : "-23.40",\n\t"input_tp" : "-4.00"\n}\n';
  assert.equal(parseLoudnorm(stderr), -23.4);
  assert.equal(parseLoudnorm('{ "input_i" : "-inf" }'), null);
  assert.throws(() => parseLoudnorm('nothing'), /no measurement/);
  assert.equal(gainDb(-23.4), 7.4);
  assert.equal(gainDb(null), 0);
  assert.equal(gainDb(-70), 20);
  assert.equal(gainDb(10), -20);
});

test('buildCutPlan builds one ffmpeg call with a normalized chain per segment', () => {
  const cut = { speed: 1.2, segments: [seg('s2', 10, 16, 'move-to-hook', { cropX: 0.3 }), seg('s1', 2, 5)] };
  const { args, cutMap, sources } = buildCutPlan({ manifest: MANIFEST, cutList: cut, dir: 'videos/demo', loudness: { s1: -18, s2: null }, out: 'videos/demo/processed.mp4.part' });
  assert.deepEqual(sources, ['s2', 's1']);
  assert.equal(cutMap.duration, 7.5);
  assert.deepEqual(args.slice(0, 11), ['-y', '-loglevel', 'error', '-ss', '10', '-t', '6', '-i', 'videos/demo/sources/s2.mp4', '-ss', '2']);
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /\[0:v:0\]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:\(iw-1080\)\*0\.3:\(ih-1920\)\/2,setsar=1,fps=30,format=yuv420p\[v0\]/);
  assert.match(graph, /crop=1080:1920:\(iw-1080\)\*0\.5:/);
  assert.match(graph, /\[0:a:0\]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0dB,alimiter=limit=0\.84:level=0:latency=1,afade=t=in:d=0\.015,afade=t=out:st=5\.985:d=0\.015\[a0\]/);
  assert.match(graph, /volume=2dB/);
  assert.match(graph, /\[v0\]\[a0\]\[v1\]\[a1\]concat=n=2:v=1:a=1\[vc\]\[ac\];\[vc\]setpts=PTS\/1\.2,fps=30\[v\];\[ac\]atempo=1\.2\[a\]$/);
  assert.deepEqual(args.slice(-4), ['+faststart', '-f', 'mp4', 'videos/demo/processed.mp4.part']);
  for (const flag of ['-crf', '18', '-g', '30', 'libx264', 'aac', '192k']) assert.ok(args.includes(flag), flag);
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

test('video cut joins a portrait and a landscape take into a 1080x1920 processed.mp4', { skip: !hasFfmpeg && 'ffmpeg not installed' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'cut-'));
  const dir = join(root, 'videos/demo');
  mkdirSync(join(dir, 'sources'), { recursive: true });
  const make = (file, size, freq) => {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=30`, '-f', 'lavfi', '-i', `sine=frequency=${freq}:sample_rate=44100`, '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', join(dir, 'sources', file)]);
    assert.equal(r.status, 0, String(r.stderr));
  };
  make('take-1.mp4', '1080x1920', 440);
  make('take-2.mov', '1920x1080', 660);
  main(['sources', 'demo'], { root });
  main(['sources', 'demo', '--set', 'u1', '--role', 'speech'], { root });
  main(['sources', 'demo', '--set', 'u2', '--role', 'speech'], { root });
  writeFileSync(join(dir, 'cut-list.json'), JSON.stringify({ speed: 1.2, segments: [seg('u2', 0.5, 1.5, 'move-to-hook'), seg('u1', 0.2, 1.8)] }));
  main(['cut', 'demo'], { root });
  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', join(dir, 'processed.mp4')], { encoding: 'utf8' }).stdout);
  const v = probe.streams.find((s) => s.codec_type === 'video');
  assert.deepEqual([v.width, v.height, v.r_frame_rate], [1080, 1920, '30/1']);
  assert.ok(probe.streams.some((s) => s.codec_type === 'audio' && s.sample_rate === '48000'));
  assert.ok(Math.abs(Number(probe.format.duration) - 2.6 / 1.2) < 0.1, probe.format.duration);
  assert.equal(JSON.parse(readFileSync(join(dir, 'cut-map.json'), 'utf8')).duration, 2.167);
  assert.equal(existsSync(join(dir, 'processed.mp4.part')), false);
  rmSync(root, { recursive: true, force: true });
});

test('video cut writes nothing when the cut-list is invalid', () => {
  const root = mkdtempSync(join(tmpdir(), 'cut-'));
  const dir = join(root, 'videos/demo');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sources.json'), JSON.stringify(MANIFEST));
  writeFileSync(join(dir, 'cut-list.json'), JSON.stringify({ segments: [seg('zz', 0, 1)] }));
  const run = () => { throw new Error('must not run ffmpeg'); };
  assert.throws(() => main(['cut', 'demo'], { root, run }), /segments\[0\]\.source "zz"/);
  assert.equal(existsSync(join(dir, 'processed.mp4')), false);
  assert.throws(() => main(['cut', 'nope'], { root, run }), /cut-list\.json not found/);
  rmSync(root, { recursive: true, force: true });
});
