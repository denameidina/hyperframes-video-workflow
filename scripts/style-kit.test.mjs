import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const MK = read('../vendor/motion-kit/motion-kit.js');
const SKJS = read('../vendor/style-kit/style-kit.js');

function fakeEl(name, extra = {}) {
  return {
    name,
    style: {},
    children: {},
    kids: [],
    textContent: '',
    className: '',
    querySelector(sel) { return this.children[sel] ?? null; },
    querySelectorAll(sel) { return this.kids.filter((k) => sel === '.' + k.className); },
    appendChild(k) { this.kids.push(k); return k; },
    insertAdjacentHTML() {},
    ...extra,
  };
}

// a straight 100-unit path from (0,0) to (100,0)
const fakePath = () => fakeEl('path', {
  getTotalLength() { this.calls = (this.calls || 0) + 1; return 100; },
  getPointAtLength(d) { return { x: d, y: 0 }; },
});

function load({ withMotionKit = true } = {}) {
  const stage = fakeEl('stage');
  const timelines = [];
  const ctx = {
    document: {
      querySelector: (sel) => (sel === '[data-composition-id="sk-test"] .sk-stage' ? stage : null),
      createElement: () => fakeEl('span'),
      createTextNode: (s) => ({ text: s }),
    },
    gsap: {
      timeline(opts) {
        const tl = { opts, tweens: [], to(target, vars, pos) { this.tweens.push({ target, vars, pos }); return this; } };
        timelines.push(tl);
        return tl;
      },
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  if (withMotionKit) vm.runInContext(MK, ctx);
  vm.runInContext(SKJS, ctx);
  return { SK: ctx.SK, M: ctx.M, ctx, stage, timelines };
}

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);

test('style-kit refuses to load without motion-kit', () => {
  assert.throws(() => load({ withMotionKit: false }), /load vendor\/motion-kit\/motion-kit\.js before style-kit\.js/);
});

test('rng is deterministic per seed and stays in [0,1)', () => {
  const { SK } = load();
  const a = SK.rng(42), b = SK.rng(42), c = SK.rng(43);
  const sa = [a(), a(), a()], sb = [b(), b(), b()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, [c(), c(), c()]);
  const r = SK.rng(7);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('stepTime quantises to the frame grid', () => {
  const { SK } = load();
  assert.equal(SK.stepTime(0.49, 12), 5 / 12);
  assert.equal(SK.stepTime(0.5, 12), 6 / 12);
  assert.equal(SK.stepTime(0, 12), 0);
});

test('boil holds within one frame, changes across frames, and stays within amp', () => {
  const { SK } = load();
  assert.deepEqual({ ...SK.boil(3, 0.01, 2, 8) }, { ...SK.boil(3, 0.12, 2, 8) });
  assert.notDeepEqual({ ...SK.boil(3, 0.01, 2, 8) }, { ...SK.boil(3, 0.13, 2, 8) });
  for (let t = 0; t < 5; t += 0.05) {
    const b = SK.boil(9, t, 2, 8);
    assert.ok(Math.abs(b.x) <= 2 && Math.abs(b.y) <= 2 && Math.abs(b.r) <= 0.7);
  }
});

test('jiggle writes a translate + rotate transform', () => {
  const { SK } = load();
  const el = fakeEl('g');
  SK.jiggle(el, 1, 0.3, 1.5);
  assert.match(el.style.transform, /^translate\(-?\d+\.\d{2}px,-?\d+\.\d{2}px\) rotate\(-?\d+\.\d{3}deg\)$/);
});

test('smooth and stagger', () => {
  const { SK } = load();
  assert.equal(SK.smooth(-1), 0);
  assert.equal(SK.smooth(0.5), 0.5);
  assert.equal(SK.smooth(2), 1);
  assert.deepEqual([...SK.stagger(1, 0.5, 0.25, 3)], [0.5, 0.25, 0]);
});

test('draw hides at 0, reveals by dash offset, and caches the path length', () => {
  const { SK } = load();
  const p = fakePath();
  SK.draw(p, 0);
  assert.equal(p.style.opacity, '0');
  assert.equal(p.style.strokeDasharray, '101 101');
  SK.draw(p, 0.5);
  assert.equal(p.style.opacity, '1');
  assert.equal(p.style.visibility, undefined, 'never touches visibility (it would override a hidden mount)');
  assert.equal(p.style.strokeDashoffset, '50.50');
  SK.draw(p, 2);
  assert.equal(p.style.strokeDashoffset, '0.00');
  assert.equal(p.calls, 1);
});

test('tip follows the path and reports its direction', () => {
  const { SK } = load();
  const tip = SK.tip(fakePath(), 0.25);
  assert.equal(tip.x, 25);
  assert.equal(tip.y, 0);
  assert.equal(tip.angle, 0);
});

test('drawSeq draws strokes in order and returns the active tip', () => {
  const { SK } = load();
  const a = fakePath(), b = fakePath();
  const items = [{ el: a, at: 0, dur: 1 }, { el: b, at: 1, dur: 1 }];
  const tip = SK.drawSeq(1.5, items);
  assert.equal(a.style.strokeDashoffset, '0.00');
  assert.equal(b.style.strokeDashoffset, '50.50');
  assert.equal(tip.x, 50);
  assert.equal(SK.drawSeq(3, items), null);
});

test('drawSeq without dur keeps a constant pen speed', () => {
  const { SK } = load();
  const a = fakePath();
  SK.drawSeq(0.1, [{ el: a, at: 0 }], { speed: 100 });
  assert.equal(a.style.strokeDashoffset, '98.17');
  SK.drawSeq(1, [{ el: a, at: 0 }], { speed: 100 });
  assert.equal(a.style.strokeDashoffset, '0.00');
});

test('drawSeq boils finished strokes only', () => {
  const { SK } = load();
  const a = fakePath(), b = fakePath();
  SK.drawSeq(1.5, [{ el: a, at: 0, dur: 1 }, { el: b, at: 1, dur: 1 }], { boil: 1.2 });
  assert.match(a.style.transform, /^translate\(/);
  assert.equal(b.style.transform, 'none');
});

test('write reveals left to right with clip-path', () => {
  const { SK } = load();
  const el = fakeEl('label');
  SK.write(el, 0);
  assert.equal(el.style.clipPath, 'inset(-30% 100.00% -30% -10%)');
  SK.write(el, 0.5);
  assert.equal(el.style.clipPath, 'inset(-30% 45.00% -30% -10%)');
  SK.write(el, 1);
  assert.equal(el.style.clipPath, 'inset(-30% -10.00% -30% -10%)');
  assert.equal(el.style.visibility, undefined);
});

test('writeTip moves along the baseline', () => {
  const { SK } = load();
  assert.equal(SK.writeTip(100, 300, 50, 0).x, 100);
  assert.equal(SK.writeTip(100, 300, 50, 1).x, 300);
  assert.equal(SK.writeTip(100, 300, 50, 0.5).x, 200);
});

test('placeMarker hides without a tip and moves with one', () => {
  const { SK } = load();
  const m = fakeEl('marker');
  SK.placeMarker(m, null);
  assert.equal(m.style.display, 'none');
  SK.placeMarker(m, { x: 10, y: 20 });
  assert.equal(m.style.display, '');
  assert.equal(m.style.transform, 'translate(16.00px,14.00px) rotate(28deg)');
});

test('hand-drawn path builders are deterministic per seed', () => {
  const { SK } = load();
  assert.equal(SK.line(0, 0, 100, 0, 3), SK.line(0, 0, 100, 0, 3));
  assert.notEqual(SK.line(0, 0, 100, 0, 3), SK.line(0, 0, 100, 0, 4));
  assert.match(SK.line(0, 0, 100, 0, 3), /^M-?[\d.]+ -?[\d.]+ Q/);
  assert.equal(SK.rect(0, 0, 100, 50, 2).split('M').length - 1, 4);
  assert.match(SK.ellipse(50, 50, 40, 20, 1), /^M[\d.]+ [\d.]+( Q[-\d. ]+)+$/);
  const ar = SK.arrow(0, 0, 100, 0, 1);
  assert.match(ar.shaft, /^M/);
  assert.match(ar.head, /^M[-\d.]+ [-\d.]+ L100\.0 0\.0 L/);
});

test('words splits text once and keeps existing .sk-w spans', () => {
  const { SK } = load();
  const el = fakeEl('p');
  el.textContent = '  bukan soal   tools ';
  const spans = SK.words(el);
  assert.deepEqual([...spans.map((s) => s.textContent)], ['bukan', 'soal', 'tools']);
  assert.equal(spans[0].className, 'sk-w');
  assert.equal(el.kids.length, 5);
  assert.equal(SK.words(el), spans);
  const pre = fakeEl('p');
  const s1 = fakeEl('span'); s1.className = 'sk-w';
  pre.kids.push(s1);
  assert.deepEqual([...SK.words(pre)], [s1]);
});

test('enter hides before its word and settles to identity', () => {
  const { SK } = load();
  for (const style of ['fade', 'rise', 'pop', 'slam', 'mask', 'drop']) {
    const el = fakeEl('w');
    SK.enter(el, -0.1, style);
    assert.equal(el.style.opacity, '0', style);
    SK.enter(el, 5, style);
    assert.equal(el.style.opacity, '1.0000', style);
    assert.match(el.style.transform, /translate\(0(px|%),0\.00(px|%)\) scale\(1\.0000\)/, style);
  }
  const s = fakeEl('w');
  SK.enter(s, 0.01, 'slam');
  assert.ok(parseFloat(s.style.transform.split('scale(')[1]) > 1.5, 'slam starts large');
  assert.throws(() => SK.enter(fakeEl('w'), 0, 'zoom'), /unknown enter style "zoom"/);
});

test('reveal times each span; null means already visible', () => {
  const { SK } = load();
  const a = fakeEl('a'), b = fakeEl('b');
  SK.reveal([a, b], [null, 2], 1, 'fade');
  assert.equal(a.style.opacity, '1.0000');
  assert.equal(b.style.opacity, '0');
});

test('fmt uses Indonesian separators', () => {
  const { SK } = load();
  assert.equal(SK.fmt(1250000), '1.250.000');
  assert.equal(SK.fmt(2.5, 1), '2,5');
  assert.equal(SK.fmt(-1500), '-1.500');
  assert.equal(SK.fmt(999), '999');
  assert.equal(SK.fmt(-0.01), '0');
});

test('count eases from start to end and clamps', () => {
  const { SK } = load();
  assert.equal(SK.count(0, 1, 2, 0, 70), '0');
  assert.equal(SK.count(1.5, 1, 2, 0, 70), '61');
  assert.equal(SK.count(9, 1, 2, 0, 70), '70');
  assert.equal(SK.count(9, 1, 2, 0, 2.5, 1), '2,5');
  assert.equal(SK.count(1, 1, 1, 0, 5), '5');
});

test('cam centres the focus point', () => {
  const { SK } = load();
  const el = fakeEl('cam');
  SK.cam(el, 2, 540, 960);
  assert.equal(el.style.transform, 'translate(-540.00px,-960.00px) scale(2.00000)');
  assert.equal(el.style.transformOrigin, '0 0');
});

test('finder looks up ids inside the clip stage only', () => {
  const { SK, stage } = load();
  stage.children['#x'] = fakeEl('x');
  assert.equal(SK.finder('sk-test')('x'), stage.children['#x']);
  assert.throws(() => SK.finder('missing'), /no \.sk-stage inside \[data-composition-id="missing"\]/);
});

test('clip registers a paused timeline whose proxy tween drives update', () => {
  const { SK, ctx, stage, timelines } = load();
  const seen = [];
  SK.clip('sk-test', { T: 4, bg: null, update: (t) => seen.push(t) });
  assert.equal(stage.style.width, '1080px');
  assert.equal(stage.style.height, '1920px');
  assert.equal(stage.style.background, 'transparent');
  assert.equal(ctx.__timelines['sk-test'], timelines[0]);
  assert.equal(timelines[0].opts.paused, true);
  const tw = timelines[0].tweens[0];
  assert.deepEqual([tw.vars.t, tw.vars.duration, tw.vars.ease, tw.pos], [4, 4, 'none', 0]);
  tw.target.t = 2.5;
  tw.vars.onUpdate();
  assert.deepEqual(seen, [0, 2.5]);
});

test('clip keeps the theme background when bg is omitted and sets it when given', () => {
  const a = load();
  a.SK.clip('sk-test', { T: 1, update() {} });
  assert.equal(a.stage.style.background, undefined);
  const b = load();
  b.SK.clip('sk-test', { T: 1, bg: '#112233', update() {} });
  assert.equal(b.stage.style.background, '#112233');
});

test('clip rejects bad config', () => {
  const { SK } = load();
  assert.throws(() => SK.clip('sk-test', { T: 0, update() {} }), /needs cfg\.T > 0/);
  assert.throws(() => SK.clip('sk-test', { T: 2 }), /needs cfg\.update\(t\)/);
  assert.throws(() => SK.clip('missing', { T: 2, update() {} }), /no \.sk-stage/);
});
