import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HYPERFRAMES, checkSlug, commandsFor, cutoutPlan, fillTemplate, layersPlan, main, resolveDuration, scaffold } from './video.mjs';

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'video-test-'));
  mkdirSync(join(root, 'templates/dena-video'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-video/index.html'), '<div data-composition-id="dena-__SLUG__" data-duration="__DURATION__"></div><script>t["dena-__SLUG__"]</script>');
  writeFileSync(join(root, 'templates/dena-video/hyperframes.json'), '{"paths":{}}');
  return root;
}

test('checkSlug accepts lowercase slugs and rejects others', () => {
  assert.equal(checkSlug('wfh-2'), 'wfh-2');
  for (const bad of ['', '../x', 'Demo', '-x', 'a b', undefined]) assert.throws(() => checkSlug(bad), /slug/);
});

test('fillTemplate replaces every placeholder', () => {
  assert.equal(fillTemplate('a __SLUG__ __SLUG__ __DURATION__', { slug: 'x', duration: 12.5 }), 'a x x 12.5');
  assert.throws(() => fillTemplate('', { slug: 'x', duration: 0 }), /duration/);
});

test('resolveDuration prefers --duration, then processed.mp4, then 10', () => {
  const root = tempRoot();
  const dir = join(root, 'videos/a');
  mkdirSync(dir, { recursive: true });
  assert.equal(resolveDuration({ duration: '7', dir }), 7);
  assert.equal(resolveDuration({ dir, probe: () => { throw new Error('should not probe'); } }), 10);
  writeFileSync(join(dir, 'processed.mp4'), '');
  assert.equal(resolveDuration({ dir, probe: (f) => { assert.ok(f.endsWith('processed.mp4')); return 54.81; } }), 54.81);
  assert.throws(() => resolveDuration({ duration: '0', dir }), /--duration/);
  rmSync(root, { recursive: true, force: true });
});

test('scaffold creates the project, fills the template, and links vendor', () => {
  const root = tempRoot();
  const { dir, duration } = scaffold({ slug: 'demo', root, duration: '12' });
  assert.equal(duration, 12);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), '<div data-composition-id="dena-demo" data-duration="12"></div><script>t["dena-demo"]</script>');
  assert.equal(readFileSync(join(dir, 'hyperframes.json'), 'utf8'), '{"paths":{}}');
  assert.ok(lstatSync(join(dir, 'compositions/broll')).isDirectory());
  assert.ok(lstatSync(join(dir, 'assets')).isDirectory());
  assert.ok(lstatSync(join(dir, 'vendor')).isSymbolicLink());
  assert.equal(readlinkSync(join(dir, 'vendor')), '../../vendor');
  assert.ok(lstatSync(join(dir, 'sources')).isDirectory());
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')), { version: 1, sources: [] });
  rmSync(root, { recursive: true, force: true });
});

test('scaffold refuses to overwrite an existing index.html', () => {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '5' });
  writeFileSync(join(root, 'videos/demo/index.html'), 'edited');
  assert.throws(() => scaffold({ slug: 'demo', root, duration: '5' }), /already exists/);
  assert.equal(readFileSync(join(root, 'videos/demo/index.html'), 'utf8'), 'edited');
  rmSync(root, { recursive: true, force: true });
});

test('scaffold keeps existing artifacts and an existing vendor link', () => {
  const root = tempRoot();
  const dir = join(root, 'videos/demo');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), 'brief');
  scaffold({ slug: 'demo', root, duration: '5' });
  rmSync(join(dir, 'index.html'));
  assert.doesNotThrow(() => scaffold({ slug: 'demo', root, duration: '5' }));
  assert.equal(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), 'brief');
  rmSync(root, { recursive: true, force: true });
});

test('commandsFor builds pinned hyperframes calls on videos/<slug>', () => {
  const hf = (...a) => ['npx', ['--yes', HYPERFRAMES, ...a]];
  assert.deepEqual(commandsFor('check', 'demo'), [hf('lint', 'videos/demo'), hf('validate', 'videos/demo'), hf('inspect', 'videos/demo')]);
  assert.deepEqual(commandsFor('dev', 'demo'), [hf('preview', 'videos/demo')]);
  assert.deepEqual(commandsFor('snapshot', 'demo', { at: '1.5,3' }), [hf('snapshot', '--at', '1.5,3', '-o', 'videos/demo/snapshots', 'videos/demo')]);
  assert.deepEqual(commandsFor('render', 'demo'), [hf('render', '--fps', '30', '--quality', 'high', '-o', 'videos/demo/renders/.demo.pending.mp4', 'videos/demo')]);
  assert.deepEqual(commandsFor('render', 'demo', { blur: true }), [['node', ['scripts/render-blur.mjs', '--slug', 'demo', '--project', 'videos/demo']]]);
});

test('commandsFor rejects bad input', () => {
  assert.throws(() => commandsFor('snapshot', 'demo', {}), /--at/);
  assert.throws(() => commandsFor('snapshot', 'demo', { at: '1;rm' }), /--at/);
  assert.throws(() => commandsFor('publish', 'demo'), /unknown command/);
  assert.throws(() => commandsFor('check', '../x'), /slug/);
});

test('main runs commands without GEMINI_API_KEY and stops on failure', () => {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '5' });
  const calls = [];
  main(['check', 'demo'], { root, env: { GEMINI_API_KEY: 'k', PATH: 'p' }, run: (c, a, o) => { calls.push([c, a, o.env]); return { status: 0 }; } });
  assert.equal(calls.length, 3);
  assert.equal(calls[0][2].GEMINI_API_KEY, undefined);
  assert.equal(calls[0][2].PATH, 'p');
  assert.throws(() => main(['check', 'demo'], { root, env: {}, run: () => ({ status: 1 }) }), /exited with 1/);
  rmSync(root, { recursive: true, force: true });
});

test('main refuses to run on a project that does not exist', () => {
  const root = tempRoot();
  assert.throws(() => main(['check', 'ghost'], { root, env: {}, run: () => ({ status: 0 }) }), /npm run video -- new ghost/);
  rmSync(root, { recursive: true, force: true });
});

function renderRoot(t) {
  const root = tempRoot(); t.after(() => rmSync(root, { recursive: true, force: true }));
  const { dir } = scaffold({ slug: 'demo', root, duration: '3' });
  writeFileSync(join(dir, 'index.html'), '<main data-composition-id="demo" data-width="160" data-height="96" data-duration="3"></main>');
  mkdirSync(join(dir, 'renders'), { recursive: true });
  return { root, dir, final: join(dir, 'renders/demo.mp4'), pending: join(dir, 'renders/.demo.pending.mp4') };
}

test('normal CLI rejects a non-video pending render without replacing the old master', (t) => {
  const f = renderRoot(t); writeFileSync(f.final, 'old master');
  const run = (cmd, args, opts) => {
    if (cmd === 'npx') { writeFileSync(args[args.indexOf('-o') + 1], 'new but invalid'); return { status: 0 }; }
    return spawnSync(cmd, args, opts);
  };
  assert.throws(() => main(['render', 'demo'], { root: f.root, env: process.env, run }), /probe/);
  assert.equal(readFileSync(f.final, 'utf8'), 'old master');
  assert.equal(existsSync(f.pending), false);
});

test('normal CLI removes interrupted output and preserves the old quality receipt', (t) => {
  const f = renderRoot(t); writeFileSync(f.final, 'old master'); writeFileSync(`${f.final}.quality.json`, 'old receipt');
  const run = (_cmd, args) => { writeFileSync(args[args.indexOf('-o') + 1], 'partial'); return { status: 1 }; };
  assert.throws(() => main(['render', 'demo'], { root: f.root, env: {}, run }), /exited with 1/);
  assert.equal(readFileSync(f.final, 'utf8'), 'old master');
  assert.equal(readFileSync(`${f.final}.quality.json`, 'utf8'), 'old receipt');
  assert.equal(existsSync(f.pending), false);
});

test('normal CLI refuses to reuse a stale pending output when rendering writes nothing', (t) => {
  const f = renderRoot(t); writeFileSync(f.pending, 'stale'); writeFileSync(f.final, 'old master');
  const run = (cmd, _args, opts) => {
    if (cmd === 'npx') { assert.equal(existsSync(_args[_args.indexOf('-o') + 1]), false, 'this run starts with a fresh pending file'); return { status: 0 }; }
    return spawnSync(cmd, _args, opts);
  };
  assert.throws(() => main(['render', 'demo'], { root: f.root, env: process.env, run }), /ENOENT/);
  assert.equal(readFileSync(f.final, 'utf8'), 'old master'); assert.equal(readFileSync(f.pending, 'utf8'), 'stale', 'a run ignores and does not delete unrelated pending files');
});

test('normal CLI delivers a real fixture through validation and writes its receipt', { skip: spawnSync('ffmpeg', ['-version']).status !== 0 }, (t) => {
  const f = renderRoot(t);
  const fixture = join(f.dir, 'fixture.mp4');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=s=160x96:r=30:d=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const run = (cmd, args, opts) => {
    assert.equal(opts.env.GEMINI_API_KEY, undefined);
    assert.equal(opts.env.GEMINI_TTS_API_KEY, undefined);
    if (cmd === 'npx') { copyFileSync(fixture, args[args.indexOf('-o') + 1]); return { status: 0 }; }
    return spawnSync(cmd, args, opts);
  };
  const receipt = main(['render', 'demo'], { root: f.root, env: { ...process.env, GEMINI_API_KEY: 'strip', GEMINI_TTS_API_KEY: 'strip' }, run });
  assert.equal(receipt.checks.decode, true);
  assert.equal(receipt.video.width, 160);
  assert.deepEqual(JSON.parse(readFileSync(`${f.final}.quality.json`, 'utf8')), receipt);
  assert.equal(existsSync(f.pending), false);
});

test('overlapping normal renders write into unique workspaces and clean only their own output', (t) => {
  const f = renderRoot(t); const outputs = [];
  const render = () => main(['render', 'demo'], { root: f.root, env: process.env, run });
  const run = (cmd, args, opts) => {
    if (cmd === 'npx') {
      const out = args[args.indexOf('-o') + 1]; outputs.push(out); writeFileSync(out, 'partial');
      if (outputs.length === 1) { assert.throws(render, /exited with 1/); assert.equal(readFileSync(out, 'utf8'), 'partial', 'the second render does not remove the first render output'); }
      return { status: 1 };
    }
    return spawnSync(cmd, args, opts);
  };
  assert.throws(render, /exited with 1/);
  assert.equal(outputs.length, 2); assert.notEqual(outputs[0], outputs[1]);
  assert.ok(outputs.every((out) => !existsSync(out)));
});

// ---- cutout (sub-project 2b) ----

function cutoutRoot() {
  const root = tempRoot();
  scaffold({ slug: 'demo', root, duration: '20' });
  writeFileSync(join(root, 'videos/demo/processed.mp4'), 'x');
  return root;
}

test('cutoutPlan validates input and builds ffmpeg + remove-background calls', () => {
  const root = cutoutRoot();
  const probe = () => 20;
  const p = cutoutPlan('demo', { from: '4.5', dur: '3', name: '04-dena', root, probe });
  const dir = join(root, 'videos/demo');
  assert.equal(p.seg, join(dir, 'assets/frames/04-dena-seg.mp4'));
  assert.equal(p.out, join(dir, 'assets/cutouts/04-dena.webm'));
  assert.deepEqual(p.cmds[0], ['ffmpeg', ['-y', '-loglevel', 'error', '-ss', '4.5', '-t', '3', '-i', join(dir, 'processed.mp4'), '-an', '-c:v', 'libx264', '-crf', '16', p.seg]]);
  assert.deepEqual(p.cmds[1], ['npx', ['--yes', HYPERFRAMES, 'remove-background', p.seg, '-o', p.out]]);
  assert.throws(() => cutoutPlan('demo', { dur: '3', name: '04-dena', root, probe }), /--from/);
  assert.throws(() => cutoutPlan('demo', { from: '-1', dur: '3', name: '04-dena', root, probe }), /--from/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '0', name: '04-dena', root, probe }), /--dur/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '16', name: '04-dena', root, probe }), /--dur/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '3', name: 'dena', root, probe }), /--name/);
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '3', name: '04-../x', root, probe }), /--name/);
  assert.throws(() => cutoutPlan('demo', { from: '18', dur: '3', name: '04-dena', root, probe }), /past the end/);
  rmSync(join(dir, 'processed.mp4'));
  assert.throws(() => cutoutPlan('demo', { from: '0', dur: '3', name: '04-dena', root, probe }), /processed\.mp4 not found/);
  rmSync(root, { recursive: true, force: true });
});

test('main cutout removes the old output, runs both steps, and checks the new file', () => {
  const root = cutoutRoot();
  const out = join(root, 'videos/demo/assets/cutouts/04-dena.webm');
  mkdirSync(join(root, 'videos/demo/assets/cutouts'), { recursive: true });
  writeFileSync(out, 'stale');
  const calls = [];
  const run = (c, a) => {
    calls.push(c === 'npx' ? a[2] : c);
    if (c === 'ffprobe') return { status: 0, stdout: '20\n' };
    if (c === 'npx') { assert.equal(existsSync(out), false, 'old cut-out removed before the matte'); writeFileSync(out, 'webm'); }
    return { status: 0 };
  };
  main(['cutout', 'demo', '--from', '2', '--dur', '3', '--name', '04-dena'], { root, env: {}, run });
  assert.deepEqual(calls, ['ffprobe', 'ffmpeg', 'remove-background']);
  assert.equal(readFileSync(out, 'utf8'), 'webm');
  rmSync(root, { recursive: true, force: true });
});

test('main cutout fails when remove-background writes nothing', () => {
  const root = cutoutRoot();
  const run = (c) => (c === 'ffprobe' ? { status: 0, stdout: '20\n' } : { status: 0 });
  assert.throws(() => main(['cutout', 'demo', '--from', '0', '--dur', '2', '--name', '05-dena'], { root, env: {}, run }), /did not write .*05-dena\.webm/);
  assert.throws(() => main(['cutout', 'demo', '--from', '0', '--dur', '2', '--name', '05-dena'], { root, env: {}, run: (c) => (c === 'ffprobe' ? { status: 0, stdout: '20' } : { status: 1 }) }), /exited with 1/);
  rmSync(root, { recursive: true, force: true });
});

// ---- layers (sub-project 3) ----

test('layersPlan takes a frame or an image and builds ffmpeg + remove-background calls', () => {
  const root = cutoutRoot();
  const dir = join(root, 'videos/demo');
  const probe = () => 20;
  const p = layersPlan('demo', { at: '7.25', name: '05-scene', root, probe });
  assert.equal(p.src, join(dir, 'assets/layers/05-scene-src.png'));
  assert.equal(p.fg, join(dir, 'assets/layers/05-scene-fg.png'));
  assert.deepEqual(p.cmds[0], ['ffmpeg', ['-y', '-loglevel', 'error', '-ss', '7.25', '-i', join(dir, 'processed.mp4'), '-frames:v', '1', p.src]]);
  assert.deepEqual(p.cmds[1], ['npx', ['--yes', HYPERFRAMES, 'remove-background', p.src, '-o', p.fg]]);
  const img = join(root, 'photo.JPG');
  writeFileSync(img, 'x');
  assert.deepEqual(layersPlan('demo', { image: img, name: '06-photo', root, probe }).cmds[0], ['ffmpeg', ['-y', '-loglevel', 'error', '-i', img, '-frames:v', '1', join(dir, 'assets/layers/06-photo-src.png')]]);
  rmSync(root, { recursive: true, force: true });
});

test('layersPlan rejects bad input', () => {
  const root = cutoutRoot();
  const probe = () => 20;
  assert.throws(() => layersPlan('demo', { name: '05-scene', root, probe }), /exactly one of --at/);
  assert.throws(() => layersPlan('demo', { at: '1', image: 'a.png', name: '05-scene', root, probe }), /exactly one of --at/);
  assert.throws(() => layersPlan('demo', { at: '1', name: 'scene', root, probe }), /--name/);
  assert.throws(() => layersPlan('demo', { at: '-1', name: '05-scene', root, probe }), /--at must be/);
  assert.throws(() => layersPlan('demo', { at: '20', name: '05-scene', root, probe }), /past the end/);
  assert.throws(() => layersPlan('demo', { image: 'a.gif', name: '05-scene', root, probe }), /--image must be/);
  assert.throws(() => layersPlan('demo', { image: join(root, 'missing.png'), name: '05-scene', root, probe }), /not found/);
  rmSync(root, { recursive: true, force: true });
});

test('main layers removes old files, runs both steps, and checks both outputs', () => {
  const root = cutoutRoot();
  const L = join(root, 'videos/demo/assets/layers');
  mkdirSync(L, { recursive: true });
  writeFileSync(join(L, '05-scene-fg.png'), 'stale');
  const calls = [];
  const run = (c, a) => {
    calls.push(c === 'npx' ? a[2] : c);
    if (c === 'ffprobe') return { status: 0, stdout: '20\n' };
    if (c === 'ffmpeg') writeFileSync(a[a.length - 1], 'png');
    if (c === 'npx') { assert.equal(existsSync(join(L, '05-scene-fg.png')), false, 'old subject removed first'); writeFileSync(a[a.length - 1], 'png'); }
    return { status: 0 };
  };
  main(['layers', 'demo', '--at', '3', '--name', '05-scene'], { root, env: {}, run });
  assert.deepEqual(calls, ['ffprobe', 'ffmpeg', 'remove-background']);
  const silent = (c) => (c === 'ffprobe' ? { status: 0, stdout: '20' } : { status: 0 });
  assert.throws(() => main(['layers', 'demo', '--at', '3', '--name', '06-scene'], { root, env: {}, run: silent }), /layers did not write .*06-scene-src\.png/);
  rmSync(root, { recursive: true, force: true });
});
