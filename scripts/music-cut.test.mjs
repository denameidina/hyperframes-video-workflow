import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { analyzerArgs, barsHint, musicArgs, planCut } from './lib/music/cut.mjs';
import { main, scaffold } from './video.mjs';

const REPO = process.cwd();
// 120 BPM: a beat every 0.5 s, a bar every 2 s; downbeats on 0.5, 2.5, ...; the first beat of each bar is loud
const ANALYSIS = {
  version: 1, meter: '4/4', bpm: 120, duration: 60,
  beats: Array.from({ length: 119 }, (_, k) => 0.5 + k * 0.5),
  downbeats: Array.from({ length: 30 }, (_, k) => 0.5 + k * 2),
  beatEnergy: Array.from({ length: 119 }, (_, k) => (k % 4 === 0 ? 1 : 0.5)),
};

test('planCut: from the first downbeat at or after --from, whole bars, shifted to video time', () => {
  const c = planCut({ analysis: ANALYSIS, from: 0, bars: 6, format: 'kinetic-post' });
  assert.deepEqual([c.start, c.end, c.duration, c.loop], [0.5, 12.5, 12, true]);
  assert.equal(c.beats.length, 24);
  assert.deepEqual(c.downbeats, [0, 2, 4, 6, 8, 10]);
  assert.deepEqual(c.barList[0], { n: 1, start: 0, end: 2, energy: 0.625 });
  assert.equal(c.barList.length, 6);
  assert.equal(planCut({ analysis: ANALYSIS, from: 3, bars: 6, format: 'kinetic-post' }).start, 4.5);
  const short = planCut({ analysis: ANALYSIS, from: 0, bars: 10, format: 'motion-short' });
  assert.deepEqual([short.duration, short.loop], [20, false]);
});

test('planCut refuses a bad bar count, a cut outside the format, and a --from past the grid', () => {
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 0, bars: 3, format: 'kinetic-post' }), /3 bars = 6 s, outside 8–20 s; at 120 BPM a bar is 2 s; a kinetic-post \(8–20 s\) fits --bars 4–10/);
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 0, bars: Number.NaN, format: 'motion-short' }), /--bars must be a whole number of bars; .*fits --bars 8–20/);
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 59, bars: 4, format: 'kinetic-post' }), /--from 59 is after the last downbeat/);
  assert.throws(() => planCut({ analysis: ANALYSIS, from: 50, bars: 8, format: 'kinetic-post' }), /runs past the end of the track/);
  const sparse = { ...ANALYSIS, downbeats: ANALYSIS.downbeats.slice(0, 6) }; // the grid ends at 10.5 s
  assert.equal(planCut({ analysis: sparse, from: 0, bars: 8, format: 'kinetic-post' }).end, 16.5, 'bar period beyond the grid');
  assert.equal(barsHint(120, 'explainer'), 'at 120 BPM a bar is 2 s; a explainer (30–90 s) fits --bars 15–45');
});

test('musicArgs: 20 ms fades for a loop, a last-bar fade-out otherwise; analyzerArgs pins the packages', () => {
  const loop = musicArgs({ track: 't.mp3', start: 0.5, duration: 12, loop: true, bar: 2, gain: 4, out: 'o.wav' });
  assert.deepEqual(loop.slice(0, 9), ['-y', '-loglevel', 'error', '-ss', '0.5', '-t', '12', '-i', 't.mp3']);
  assert.equal(loop[loop.indexOf('-af') + 1], 'volume=4dB,afade=t=in:d=0.02,afade=t=out:st=11.98:d=0.02,alimiter=limit=0.84:level=0:latency=1');
  const fade = musicArgs({ track: 't.mp3', start: 0.5, duration: 20, loop: false, bar: 2, gain: 4, out: 'o.wav' });
  assert.match(fade[fade.indexOf('-af') + 1], /afade=t=out:st=18:d=2/);
  assert.deepEqual(analyzerArgs('x.mp3').slice(0, 9), ['run', '--quiet', '--python', '3.12', '--with', 'librosa==1.0.0', '--with', 'soundfile==0.14.0', 'python']);
  assert.equal(analyzerArgs('x.mp3').at(-1), 'x.mp3');
});

function musicRoot() {
  const root = mkdtempSync(join(tmpdir(), 'music-cut-'));
  mkdirSync(join(root, 'templates/dena-generate'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-generate/index.html'), readFileSync(join(REPO, 'templates/dena-generate/index.html'), 'utf8'));
  writeFileSync(join(root, 'templates/dena-generate/hyperframes.json'), '{}');
  mkdirSync(join(root, 'shared/music/licenses'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-beat.mp3'), 'mp3');
  writeFileSync(join(root, 'shared/music/licenses/m01-beat.txt'), 'proof');
  const sha = createHash('sha256').update('mp3').digest('hex');
  const track = { id: 'm01-beat', file: 'm01-beat.mp3', title: 'Beat', author: 'A', sourceUrl: 'https://x/', license: 'cc0', licenseProof: 'licenses/m01-beat.txt', sha256: sha, duration: 60, mood: ['upbeat'], energy: 4, rejected: false };
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify({ version: 1, tracks: [track, { ...track, id: 'm02-no', rejected: true }] }));
  return { root, sha };
}

// uv answers with the analysis; ffmpeg measures -20 LUFS and writes its output file
function musicRun({ failCut = false } = {}) {
  const calls = [];
  const run = (cmd, args, opts = {}) => {
    const name = basename(cmd);
    calls.push([name, ...args]);
    assert.equal(opts.env?.GEMINI_API_KEY, undefined, 'no Gemini key in a child process');
    if (name === 'uv') return { status: 0, stdout: `${JSON.stringify(ANALYSIS)}\n`, stderr: '' };
    if (name === 'ffmpeg' && args.includes('null')) return { status: 0, stdout: '', stderr: '{\n"input_i" : "-20.00"\n}' };
    if (name === 'ffmpeg') {
      writeFileSync(args.at(-1), failCut ? 'half' : 'RIFF-MUSIC');
      return failCut ? { status: 1, stdout: '', stderr: 'boom' } : { status: 0, stdout: '', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: `unexpected ${name}` };
  };
  return { run, calls };
}

test('video music cuts whole bars into processed-audio.wav, writes beats.json, syncs index.html, caches the analysis', () => {
  const { root, sha } = musicRoot();
  const { dir } = scaffold({ slug: 'post', root, generate: true, format: 'kinetic-post' });
  const m = musicRun();
  const meta = main(['music', 'post', '--track', 'm01-beat', '--bars', '6'], { root, env: { GEMINI_API_KEY: 'k' }, run: m.run });
  assert.deepEqual([meta.track, meta.from, meta.bars, meta.duration, meta.loop, meta.bpm, meta.meter, meta.sha256], ['m01-beat', 0.5, 6, 12, true, 120, '4/4', sha]);
  assert.equal(readFileSync(join(dir, 'processed-audio.wav'), 'utf8'), 'RIFF-MUSIC');
  assert.equal(JSON.parse(readFileSync(join(dir, 'beats.json'), 'utf8')).barList.length, 6);
  assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /id="voice-audio"[^>]*data-duration="12"/);
  const cut = m.calls.find((c) => c[0] === 'ffmpeg' && !c.includes('null'));
  assert.equal(cut[cut.indexOf('-af') + 1], 'volume=4dB,afade=t=in:d=0.02,afade=t=out:st=11.98:d=0.02,alimiter=limit=0.84:level=0:latency=1');
  assert.ok(existsSync(join(root, 'shared/music/beats/m01-beat.json')));
  const again = musicRun();
  main(['music', 'post', '--track', 'm01-beat', '--bars', '5', '--from', '3'], { root, env: {}, run: again.run });
  assert.equal(again.calls.filter((c) => c[0] === 'uv').length, 0, 'cached analysis');
  writeFileSync(join(root, 'shared/music/beats/m01-beat.json'), '{oops');
  const third = musicRun();
  main(['music', 'post', '--track', 'm01-beat', '--bars', '6'], { root, env: {}, run: third.run });
  assert.equal(third.calls.filter((c) => c[0] === 'uv').length, 1, 'a broken cache is analysed again');
});

test('video music refuses an explainer, a missing or rejected track, a missing --bars, and keeps the old audio on failure', () => {
  const { root } = musicRoot();
  const ex = scaffold({ slug: 'ex', root, generate: true });
  assert.throws(() => main(['music', 'ex', '--track', 'm01-beat', '--bars', '6'], { root, env: {}, run: musicRun().run }), /is an explainer: .*npm run video -- bgm/);
  const { dir } = scaffold({ slug: 'short', root, generate: true, format: 'motion-short' });
  assert.throws(() => main(['music', 'short', '--bars', '10'], { root, env: {}, run: musicRun().run }), /music needs --track <id>/);
  assert.throws(() => main(['music', 'short', '--track', 'm02-no', '--bars', '10'], { root, env: {}, run: musicRun().run }), /was rejected in the Studio/);
  assert.throws(() => main(['music', 'short', '--track', 'm01-beat'], { root, env: {}, run: musicRun().run }), /--bars must be a whole number of bars; at 120 BPM a bar is 2 s; a motion-short \(15–40 s\) fits --bars 8–20/);
  writeFileSync(join(dir, 'processed-audio.wav'), 'OLD');
  assert.throws(() => main(['music', 'short', '--track', 'm01-beat', '--bars', '10'], { root, env: {}, run: musicRun({ failCut: true }).run }), /ffmpeg failed/);
  assert.equal(readFileSync(join(dir, 'processed-audio.wav'), 'utf8'), 'OLD');
  assert.deepEqual(readdirSync(dir).filter((f) => f.includes('.part')), []);
  assert.equal(existsSync(join(ex.dir, 'beats.json')), false);
});
