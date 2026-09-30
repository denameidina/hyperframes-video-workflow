import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { deliverRender, isPlayableRender, measureAudio, projectRenderExpectation, selectAudioProfile, validateRender } from './lib/render-quality.mjs';

// Removing probe/decode, post-AAC measurement, or atomic promotion must break these tests.
const ffmpegAvailable = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;
const expected = { width: 160, height: 96, fps: 30, duration: 3, audio: true };
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
function fixture(t, { audio = true, volume = 1, duration = 3, audioSource } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'render-quality-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'source.mp4');
  const args = ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=s=160x96:r=30:d=${duration}`];
  if (audio) args.push('-f', 'lavfi', '-i', audioSource ?? `sine=frequency=733:sample_rate=48000:duration=${duration}`, '-af', `volume=${volume}`, '-ac', '2', '-c:a', 'aac', '-b:a', '192k');
  args.push('-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file);
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return { dir, file, pending: join(dir, '.pending.mp4'), final: join(dir, 'final.mp4') };
}

test('playability rejects text and truncated media while recognizing a real video', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t);
  assert.equal(isPlayableRender(f.file), true);
  writeFileSync(f.pending, 'not a video');
  assert.equal(isPlayableRender(f.pending), false);
  writeFileSync(f.pending, readFileSync(f.file).subarray(0, 20));
  assert.equal(isPlayableRender(f.pending), false);
  assert.equal(isPlayableRender(join(f.dir, 'missing.mp4')), false);
});

test('playability rejects ffprobe failure or a zero-duration video without a shell', () => {
  assert.equal(isPlayableRender('anything.mp4', { run: () => ({ status: 1 }) }), false);
  assert.equal(isPlayableRender('anything.mp4', { run: (_cmd, _args, options) => {
    assert.notEqual(options.shell, true);
    return { status: 0, stdout: JSON.stringify({ streams: [{ codec_type: 'video', width: 160, height: 96, duration: '0', avg_frame_rate: '30/1' }], format: { duration: '0' } }) };
  } }), false);
});

test('playability rejects damaged payload even when ffprobe reads its valid header', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t);
  const bytes = readFileSync(f.file); writeFileSync(f.pending, bytes.subarray(0, Math.floor(bytes.length * 0.6)));
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', f.pending], { encoding: 'utf8' });
  assert.equal(probe.status, 0, 'fixture retains a readable MP4 header');
  assert.equal(isPlayableRender(f.pending), false, 'a probe alone cannot prove the frames decode');
});

test('media validation enforces size, rate, duration and declared stereo audio', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t);
  const result = validateRender(f.file, expected);
  assert.equal(result.video.width, 160);
  assert.equal(result.audio.codec_name, 'aac');
  assert.equal(result.audio.channels, 2);
  assert.throws(() => validateRender(f.file, { ...expected, width: 192 }), /width/);
  assert.throws(() => validateRender(f.file, { ...expected, fps: 24 }), /frame rate/);
  assert.throws(() => validateRender(f.file, { ...expected, duration: 5 }), /duration/);
  const silent = fixture(t, { audio: false });
  assert.throws(() => validateRender(silent.file, expected), /audio.*missing/);
  assert.equal(validateRender(silent.file, { ...expected, audio: false }).audio, null);
});

test('decode failure leaves the old final and removes the pending output', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t);
  copyFileSync(f.file, f.pending); copyFileSync(f.file, f.final);
  const before = hash(f.final);
  const run = (cmd, args, opts) => cmd === 'ffmpeg' && args.includes('-xerror')
    ? { status: 1, stderr: 'corrupt packet' } : spawnSync(cmd, args, opts);
  assert.throws(() => deliverRender({ pending: f.pending, final: f.final, expected, run }), /decode/);
  assert.equal(hash(f.final), before);
  assert.equal(existsSync(f.pending), false);
  assert.equal(existsSync(`${f.final}.quality.json`), false);
});

test('delivery measures encoded AAC, masters quiet audio and preserves video packets', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { volume: 0.12 });
  const packetHash = (file) => {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return r.stdout;
  };
  const videoBefore = packetHash(f.file);
  assert.ok(measureAudio(f.file).integratedLufs < -25);
  copyFileSync(f.file, f.pending);
  const receipt = deliverRender({ pending: f.pending, final: f.final, expected, toolchain: { hyperframes: '0.7.24' } });
  const measured = measureAudio(f.final);
  assert.ok(Math.abs(measured.integratedLufs + 16) <= 1, JSON.stringify(measured));
  assert.ok(measured.truePeakDbtp <= -1, JSON.stringify(measured));
  assert.equal(packetHash(f.final), videoBefore, 'audio mastering copies video packets');
  assert.equal(receipt.mastered, true);
  assert.equal(receipt.sha256, hash(f.final));
  assert.equal(receipt.profile.targetLufs, -16);
  assert.match(receipt.toolchain.ffmpeg, /ffmpeg version/);
  assert.equal(receipt.toolchain.hyperframes, '0.7.24');
  assert.equal(receipt.checks.decode, true);
  assert.deepEqual(JSON.parse(readFileSync(`${f.final}.quality.json`, 'utf8')), receipt);
  assert.equal(existsSync(f.pending), false);
});

test('mastering subprocess failure preserves both old master and old receipt', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { volume: 0.1 });
  copyFileSync(f.file, f.pending); copyFileSync(f.file, f.final);
  writeFileSync(`${f.final}.quality.json`, 'old receipt');
  const before = hash(f.final);
  const run = (cmd, args, opts) => {
    if (cmd === 'ffmpeg' && args.includes('-c:v') && args.includes('copy') && args.at(-1).endsWith('.mp4')) {
      writeFileSync(args.at(-1), 'partial encode');
      return { status: 1, stderr: 'disk full' };
    }
    return spawnSync(cmd, args, opts);
  };
  assert.throws(() => deliverRender({ pending: f.pending, final: f.final, expected, run }), /master/);
  assert.equal(hash(f.final), before);
  assert.equal(readFileSync(`${f.final}.quality.json`, 'utf8'), 'old receipt');
  assert.equal(existsSync(f.pending), false);
  assert.equal(existsSync(join(f.dir, '.pending.mastered.mp4')), false);
});

test('out-of-profile encoded result is rejected even if mastering exits successfully', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { volume: 0.1 });
  copyFileSync(f.file, f.pending); copyFileSync(f.file, f.final);
  const before = hash(f.final);
  const run = (cmd, args, opts) => {
    if (cmd === 'ffmpeg' && args.includes('-c:v') && args.includes('copy') && args.at(-1).endsWith('.mp4')) {
      copyFileSync(f.file, args.at(-1)); return { status: 0 };
    }
    return spawnSync(cmd, args, opts);
  };
  assert.throws(() => deliverRender({ pending: f.pending, final: f.final, expected, run }), /audio.*profile/);
  assert.equal(hash(f.final), before);
  assert.equal(existsSync(f.pending), false);
});

test('silent composition delivers decodable video with no fake loudness measurement', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { audio: false }); copyFileSync(f.file, f.pending);
  const receipt = deliverRender({ pending: f.pending, final: f.final, expected: { ...expected, audio: false } });
  assert.equal(receipt.audio, null);
  assert.equal(receipt.mastered, false);
  assert.equal(isPlayableRender(f.final), true);
});

test('a quieter project profile is applied to and recorded from the encoded AAC', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { volume: 4 }); copyFileSync(f.file, f.pending);
  const profile = { name: 'quiet-gallery', targetLufs: -20, toleranceLu: 1, truePeakDbtp: -2, source: 'render-profile.json' };
  const receipt = deliverRender({ pending: f.pending, final: f.final, expected, profile });
  assert.ok(Math.abs(receipt.audio.integratedLufs + 20) <= 1, JSON.stringify(receipt.audio));
  assert.ok(receipt.audio.truePeakDbtp <= -2);
  assert.deepEqual(receipt.profile, profile);
});

test('unsafe AAC true peak triggers mastering even when integrated loudness already passes', { skip: !ffmpegAvailable }, (t) => {
  const pulse = '0.15*sin(2*PI*733*t)+0.75*lt(mod(t\\,1)\\,0.005)';
  const f = fixture(t, { audioSource: `aevalsrc=${pulse}|${pulse}:s=48000:d=3` }); copyFileSync(f.file, f.pending);
  const before = measureAudio(f.file);
  assert.ok(Math.abs(before.integratedLufs + 16) <= 1, JSON.stringify(before));
  assert.ok(before.truePeakDbtp > -1, JSON.stringify(before));
  const receipt = deliverRender({ pending: f.pending, final: f.final, expected });
  assert.equal(receipt.mastered, true, 'passing loudness alone must not bypass the true-peak ceiling');
  assert.ok(receipt.audio.truePeakDbtp <= -1, JSON.stringify(receipt.audio));
  assert.ok(Math.abs(receipt.audio.integratedLufs + 16) <= 1);
});

test('receipt promotion failure rolls back an already promoted MP4', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { audio: false }); copyFileSync(f.file, f.pending); writeFileSync(f.final, 'previous master');
  mkdirSync(`${f.final}.quality.json`);
  assert.throws(() => deliverRender({ pending: f.pending, final: f.final, expected: { ...expected, audio: false } }), /EISDIR|EPERM/);
  assert.equal(readFileSync(f.final, 'utf8'), 'previous master');
  assert.equal(existsSync(f.pending), false);
  assert.equal(existsSync(join(f.dir, '.final.mp4.previous')), false);
});

test('delivery seals its candidate before a concurrent writer replaces the incoming pending path', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { audio: false }); copyFileSync(f.file, f.pending); copyFileSync(f.file, f.final);
  const wanted = hash(f.file);
  let replaced = false;
  const run = (cmd, args, opts) => {
    if (cmd === 'ffmpeg' && args.includes('-version')) { writeFileSync(f.pending, 'another writer output'); replaced = true; }
    return spawnSync(cmd, args, opts);
  };
  const receipt = deliverRender({ pending: f.pending, final: f.final, expected: { ...expected, audio: false }, run });
  assert.equal(replaced, true);
  assert.equal(hash(f.final), wanted, 'only the previously validated candidate is promoted');
  assert.equal(receipt.sha256, hash(f.final), 'the receipt describes the promoted bytes');
  assert.equal(readFileSync(f.pending, 'utf8'), 'another writer output', 'delivery does not delete a replacement it does not own');
  assert.equal(isPlayableRender(f.final), true);
});

test('an overlapping delivery cannot interleave another final and receipt during promotion', { skip: !ffmpegAvailable }, (t) => {
  const f = fixture(t, { audio: false }); copyFileSync(f.file, f.pending); copyFileSync(f.file, f.final);
  const previous = hash(f.final);
  writeFileSync(`${f.final}.quality.json`, 'previous receipt');
  writeFileSync(`${f.final}.delivery.lock`, 'another active promotion');
  assert.throws(() => deliverRender({ pending: f.pending, final: f.final, expected: { ...expected, audio: false } }), /promotion.*active/);
  assert.equal(hash(f.final), previous); assert.equal(readFileSync(`${f.final}.quality.json`, 'utf8'), 'previous receipt');
  assert.equal(readFileSync(`${f.final}.delivery.lock`, 'utf8'), 'another active promotion', 'a failing contender cannot remove the active lock');
  assert.equal(existsSync(f.pending), false);
});

test('profiles infer format defaults and validate a recorded project override', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'render-profile-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(selectAudioProfile(dir).targetLufs, -16);
  writeFileSync(join(dir, 'creative-brief.md'), '## Workflow Settings\n- format: motion-short\n');
  assert.equal(selectAudioProfile(dir).targetLufs, -17);
  writeFileSync(join(dir, 'render-profile.json'), JSON.stringify({ name: 'quiet-gallery', targetLufs: -20, toleranceLu: 0.8, truePeakDbtp: -2 }));
  const p = selectAudioProfile(dir);
  assert.equal(p.name, 'quiet-gallery'); assert.equal(p.targetLufs, -20); assert.equal(p.source, 'render-profile.json');
  writeFileSync(join(dir, 'render-profile.json'), JSON.stringify({ targetLufs: -17, truePeakDbtp: 0 }));
  assert.throws(() => selectAudioProfile(dir), /true peak/);
  writeFileSync(join(dir, 'render-profile.json'), JSON.stringify({ targetLufs: -20, truePeakDbtp: -10 }));
  assert.throws(() => selectAudioProfile(dir), /true peak/);
});

test('project expectation reads the root canvas and audio in local nested compositions', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'render-expectation-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'index.html'), '<main data-composition-id="demo" data-width="160" data-height="96" data-duration="3"><div data-composition-src="scene.html"></div><!-- <audio src="unused.wav"> --></main>');
  writeFileSync(join(dir, 'scene.html'), '<section><audio src="sound.wav"></audio></section>');
  assert.deepEqual(projectRenderExpectation(dir), expected);
  writeFileSync(join(dir, 'scene.html'), '<section><video src="silent.mp4" muted></video></section>');
  assert.equal(projectRenderExpectation(dir).audio, false);
  writeFileSync(join(dir, 'scene.html'), '<div data-composition-src="../outside.html"></div>');
  assert.throws(() => projectRenderExpectation(dir), /inside the project/);
});
