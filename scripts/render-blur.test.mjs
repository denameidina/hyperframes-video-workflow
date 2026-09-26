import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blendFilter, blurPlan, HYPERFRAMES } from './render-blur.mjs';

test('blendFilter blends 4 subframes into one output frame', () => {
  assert.equal(blendFilter(30), "tmix=frames=4,select='eq(mod(n\\,4)\\,3)',setpts=N/(30*TB)");
});

test('blurPlan renders at 4x fps into renders/.blur and writes <slug>-blur.mp4', () => {
  const p = blurPlan({ slug: 'demo', fps: 30, project: '.' });
  assert.equal(p.tmpDir, 'renders/.blur');
  assert.equal(p.hi, 'renders/.blur/demo-120.mp4');
  assert.equal(p.out, 'renders/demo-blur.mp4');
  assert.deepEqual(p.render, ['npx', ['--yes', HYPERFRAMES, 'render', '--fps', '120', '--quality', 'high', '-o', 'renders/.blur/demo-120.mp4', '.']]);
  assert.deepEqual(p.blend, ['ffmpeg', ['-loglevel', 'error', '-y', '-i', 'renders/.blur/demo-120.mp4', '-vf', blendFilter(30), '-r', '30', '-c:a', 'copy', 'renders/demo-blur.mp4']]);
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
