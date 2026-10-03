// Canvas ratios (ADR-0035): the table, canvas.json, the template swap, scaffold, the cut filter, and the agent prompt.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_RATIO, RATIOS, RATIO_LIST, applyCanvas, canvasFor, canvasOf, checkRatio, writeCanvas } from './lib/ratio.mjs';
import { buildCutPlan } from './lib/cut-plan.mjs';
import { buildPrompt } from './studio/agent.mjs';
import { scaffold } from './video.mjs';

const root = process.cwd();
const tmp = () => mkdtempSync(join(tmpdir(), 'ratio-'));

test('the table offers 9:16 (default), 4:5, 1:1 and 16:9 with matching pixel sizes', () => {
  assert.deepEqual(RATIO_LIST, ['9:16', '4:5', '1:1', '16:9']);
  assert.equal(DEFAULT_RATIO, '9:16');
  for (const [name, c] of Object.entries(RATIOS)) {
    const [w, h] = name.split(':').map(Number);
    assert.ok(Math.abs(c.width / c.height - w / h) < 0.001, `${name} is ${c.width}x${c.height}`);
    assert.ok(c.safe.top > 0 && c.safe.bottom > 0 && c.safe.side > 0);
  }
  assert.throws(() => checkRatio('21:9'), /not one of/);
  assert.deepEqual(canvasFor('4:5'), { ratio: '4:5', width: 1080, height: 1350, safe: RATIOS['4:5'].safe });
});

test('canvas.json round-trips and a project without one is 9:16', () => {
  const dir = tmp();
  assert.equal(canvasOf(dir).ratio, '9:16');
  writeCanvas(dir, '16:9');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'canvas.json'), 'utf8')), { ratio: '16:9', width: 1920, height: 1080 });
  assert.equal(canvasOf(dir).width, 1920);
  writeFileSync(join(dir, 'canvas.json'), '{"ratio":"7:7"}');
  assert.throws(() => canvasOf(dir), /not one of/);
});

test('applyCanvas swaps both sizes in one pass, so 16:9 does not undo itself', () => {
  const html = '<meta name="viewport" content="width=1080, height=1920" /><main data-width="1080" data-height="1920"></main> width: 1080px; height: 1920px;';
  assert.equal(applyCanvas(html, '9:16'), html);
  assert.equal(applyCanvas(html, '16:9'), '<meta name="viewport" content="width=1920, height=1080" /><main data-width="1920" data-height="1080"></main> width: 1920px; height: 1080px;');
  assert.match(applyCanvas(html, '4:5'), /width=1080, height=1350/);
  assert.doesNotMatch(applyCanvas(html, '1:1'), /1920/);
});

test('scaffold writes canvas.json and sizes the starter for the chosen ratio, for both starters', () => {
  for (const generate of [false, true]) {
    for (const ratio of RATIO_LIST) {
      const base = tmp();
      mkdirSync(join(base, 'templates'), { recursive: true });
      for (const t of ['dena-video', 'dena-generate']) {
        mkdirSync(join(base, 'templates', t), { recursive: true });
        for (const f of ['index.html', 'hyperframes.json']) writeFileSync(join(base, 'templates', t, f), readFileSync(join(root, 'templates', t, f)));
      }
      mkdirSync(join(base, 'vendor'), { recursive: true });
      const r = scaffold({ slug: 'uji', root: base, duration: 10, generate, ratio });
      const { width, height } = RATIOS[ratio];
      assert.equal(r.ratio, ratio);
      assert.deepEqual(canvasOf(r.dir), canvasFor(ratio));
      const html = readFileSync(join(r.dir, 'index.html'), 'utf8');
      assert.match(html, new RegExp(`data-width="${width}" data-height="${height}"`));
      assert.match(html, new RegExp(`width=${width}, height=${height}`));
      if (ratio !== '9:16') assert.ok(!html.includes(ratio === '16:9' ? 'width: 1080px; height: 1920px' : '1920px'), `${ratio} leaves no 9:16 size behind`);
    }
  }
  const base = tmp();
  assert.throws(() => scaffold({ slug: 'x', root: base, duration: 5, ratio: '3:7' }), /--ratio/);
  assert.equal(existsSync(join(base, 'videos', 'x')), false, 'a bad ratio creates nothing');
});

test('the cut scales to fill and centre-crops at the project canvas', () => {
  const manifest = { sources: [{ id: 'u1', kind: 'video', role: 'speech', path: 'sources/a.mp4', probe: { duration: 30, hasAudio: true } }] };
  const cutList = { speed: 1.2, segments: [{ action: 'keep', source: 'u1', sourceStart: 0, sourceEnd: 5 }] };
  const filter = (canvas) => buildCutPlan({ manifest, cutList, dir: '/p', loudness: {}, out: '/o.mp4', canvas }).args[buildCutPlan({ manifest, cutList, dir: '/p', loudness: {}, out: '/o.mp4' }).args.indexOf('-filter_complex') + 1];
  assert.match(filter(undefined), /scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
  assert.match(filter(canvasFor('4:5')), /scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350/);
  assert.match(filter(canvasFor('16:9')), /scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080/);
});

test('the agent prompt names the canvas only when it is not 9:16', () => {
  assert.doesNotMatch(buildPrompt({ mode: 'new', slug: 'a' }), /Canvas:/);
  assert.doesNotMatch(buildPrompt({ mode: 'new', slug: 'a', ratio: '9:16' }), /Canvas:/);
  const p = buildPrompt({ mode: 'generate', slug: 'a', ratio: '4:5' });
  assert.match(p, /Canvas: rasio 4:5 \(1080×1350\)/);
  assert.match(p, /aspect-ratios\.md/);
});

test('cropY shifts the vertical crop (0 = top, 1 = bottom), centred by default, and is validated', () => {
  const manifest = { sources: [{ id: 'u1', kind: 'video', role: 'speech', path: 'sources/a.mp4', probe: { duration: 30, hasAudio: true } }] };
  const plan = (g) => buildCutPlan({ manifest, cutList: { speed: 1, segments: [{ action: 'keep', source: 'u1', sourceStart: 0, sourceEnd: 5, ...g }] }, dir: '/p', loudness: {}, out: '/o.mp4', canvas: canvasFor('1:1') }).args.join(' ');
  assert.match(plan({}), /crop=1080:1080:\(iw-1080\)\*0\.5:\(ih-1080\)\/2/);
  assert.match(plan({ cropY: 0.2 }), /\(ih-1080\)\*0\.2/);
  assert.throws(() => plan({ cropY: 1.5 }), /cropY must be a number from 0 to 1/);
});
