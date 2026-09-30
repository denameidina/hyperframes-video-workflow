import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { blendFilter, blurPlan, HYPERFRAMES, main } from './render-blur.mjs';

test('blendFilter blends 4 subframes into one output frame', () => {
  assert.equal(blendFilter(30), "tmix=frames=4,select='eq(mod(n\\,4)\\,3)',setpts=N/(30*TB)");
});

test('blurPlan renders at 4x fps into renders/.blur and writes <slug>-blur.mp4', () => {
  const p = blurPlan({ slug: 'demo', fps: 30, project: '.' });
  assert.equal(p.tmpDir, 'renders/.blur');
  assert.equal(p.hi, 'renders/.blur/demo-120.mp4');
  assert.equal(p.out, 'renders/demo-blur.mp4');
  assert.equal(p.pending, 'renders/.demo-blur.pending.mp4');
  assert.deepEqual(p.render, ['npx', ['--yes', HYPERFRAMES, 'render', '--fps', '120', '--quality', 'high', '-o', 'renders/.blur/demo-120.mp4', '.']]);
  assert.deepEqual(p.blend, ['ffmpeg', ['-loglevel', 'error', '-y', '-i', 'renders/.blur/demo-120.mp4', '-map', '0:v:0', '-map', '0:a?', '-vf', blendFilter(30), '-r', '30', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709', '-movflags', '+faststart', '-c:a', 'copy', 'renders/.demo-blur.pending.mp4']]);
});

const mediaAvailable = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;
function blurFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'render-blur-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const p = blurPlan({ slug: 'demo', project: dir }); mkdirSync(p.tmpDir, { recursive: true });
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=160x96:r=120:d=3', '-f', 'lavfi', '-i', 'sine=frequency=733:sample_rate=48000:duration=3', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', p.hi], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  writeFileSync(join(dir, 'index.html'), '<main data-composition-id="demo" data-width="160" data-height="96" data-duration="3"><audio src="audio.wav"></audio></main>');
  return { dir, p };
}

test('real blur encode produces H264 BT709 30fps with copied AAC and faststart', { skip: !mediaAvailable }, (t) => {
  const { p } = blurFixture(t);
  const audioHash = (file) => spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { encoding: 'utf8' }).stdout;
  const before = audioHash(p.hi);
  const r = spawnSync(p.blend[0], p.blend[1], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', p.pending], { encoding: 'utf8' }).stdout);
  const video = data.streams.find((s) => s.codec_type === 'video');
  assert.equal(video.codec_name, 'h264'); assert.equal(video.pix_fmt, 'yuv420p');
  assert.equal(video.avg_frame_rate, '30/1'); assert.equal(video.nb_frames, '90');
  assert.equal(video.color_space, 'bt709'); assert.equal(video.color_transfer, 'bt709'); assert.equal(video.color_primaries, 'bt709');
  assert.equal(audioHash(p.pending), before, 'the blend copies the encoded AAC packets');
  const bytes = readFileSync(p.pending); assert.ok(bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat')), 'faststart places the metadata before video packets');
});

test('blur CLI rejects an invalid blended output and keeps the previous master', { skip: !mediaAvailable }, (t) => {
  const { dir, p } = blurFixture(t);
  const saved = join(dir, 'fixture.mp4'); copyFileSync(p.hi, saved);
  writeFileSync(p.out, 'old valid master');
  const outputs = [];
  const run = (cmd, args) => {
    if (cmd === 'npx') { const out = args[args.indexOf('-o') + 1]; outputs.push(out); copyFileSync(saved, out); return { status: 0 }; }
    if (cmd === 'ffmpeg') { outputs.push(args.at(-1)); writeFileSync(args.at(-1), 'bad output'); return { status: 0 }; }
    return spawnSync(cmd, args, { encoding: 'utf8' });
  };
  assert.throws(() => main(['--slug', 'demo', '--project', dir], { run, env: process.env }), /probe/);
  assert.equal(readFileSync(p.out, 'utf8'), 'old valid master');
  assert.ok(outputs.every((out) => !existsSync(out)));
});

test('blur CLI validates and masters its real final delivery', { skip: !mediaAvailable }, (t) => {
  const { dir, p } = blurFixture(t);
  const saved = join(dir, 'fixture.mp4'); copyFileSync(p.hi, saved);
  const outputs = [];
  const run = (cmd, args, opts) => {
    if (cmd === 'npx') { const out = args[args.indexOf('-o') + 1]; outputs.push(out); copyFileSync(saved, out); return { status: 0 }; }
    return spawnSync(cmd, args, opts);
  };
  const receipt = main(['--slug', 'demo', '--project', dir], { run, env: process.env });
  assert.equal(receipt.checks.decode, true); assert.equal(receipt.encode.crf, 16);
  assert.equal(receipt.encode.preset, 'slow'); assert.equal(receipt.encode.blur, true);
  assert.ok(receipt.audio.truePeakDbtp <= -1); assert.ok(Math.abs(receipt.audio.integratedLufs + 16) <= 1);
  assert.ok(outputs.every((out) => !existsSync(out)));
  assert.deepEqual(JSON.parse(readFileSync(`${p.out}.quality.json`, 'utf8')), receipt);
});

test('overlapping blur renders own separate high-fps and pending paths', { skip: !mediaAvailable }, (t) => {
  const { dir } = blurFixture(t); const outputs = [];
  const render = () => main(['--slug', 'demo', '--project', dir], { run, env: process.env });
  const run = (cmd, args) => {
    if (cmd === 'npx') {
      const out = args[args.indexOf('-o') + 1]; outputs.push(out); writeFileSync(out, 'partial high fps');
      if (outputs.length === 1) { assert.throws(render, /exited with 1/); assert.equal(readFileSync(out, 'utf8'), 'partial high fps'); }
      return { status: 1 };
    }
    throw new Error(`unexpected ${cmd}`);
  };
  assert.throws(render, /exited with 1/);
  assert.equal(outputs.length, 2); assert.notEqual(outputs[0], outputs[1]);
  assert.ok(outputs.every((out) => !existsSync(out)));
});

test('blurPlan keeps outputs inside another project directory', () => {
  const p = blurPlan({ slug: 'demo', fps: 30, project: 'renders/.examples-project' });
  assert.equal(p.hi, 'renders/.examples-project/renders/.blur/demo-120.mp4');
  assert.equal(p.out, 'renders/.examples-project/renders/demo-blur.mp4');
  assert.equal(p.render[1].at(-1), 'renders/.examples-project');
});

test('blurPlan rejects unsafe slugs and bad fps', () => {
  assert.throws(() => blurPlan({ slug: '../x' }), /--slug/);
  assert.throws(() => blurPlan({ slug: '' }), /--slug/);
  assert.throws(() => blurPlan({ slug: 'Demo' }), /--slug/);
  assert.throws(() => blurPlan({ slug: 'demo', fps: 0 }), /--fps/);
  assert.throws(() => blurPlan({ slug: 'demo', fps: 29.97 }), /--fps/);
});
