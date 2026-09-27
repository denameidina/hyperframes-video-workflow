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

// ---- stop-motion, paper, and hand (sub-project 2a) ----

test('STOP_FPS holds each pose for two frames at 30 fps', () => {
  const { SK } = load();
  assert.equal(SK.STOP_FPS, 15);
  assert.equal(30 / SK.STOP_FPS, 2);
});

test('onTwos evaluates a curve on the step grid', () => {
  const { SK } = load();
  const f = SK.onTwos((t) => t * 10);
  assert.equal(f(0.05), 0);
  assert.equal(f(0.07), 10 / 15);
  assert.equal(f(0.1), 10 / 15);
});

test('piece places a pose with seeded jitter that holds within a step', () => {
  const { SK } = load();
  const a = fakeEl('a'), b = fakeEl('b');
  SK.piece(a, { x: 100, y: 200, r: 5, s: 1.2, o: 0.5 }, 3, 0.01);
  SK.piece(b, { x: 100, y: 200, r: 5, s: 1.2, o: 0.5 }, 3, 0.06);
  assert.equal(a.style.transform, b.style.transform);
  assert.match(a.style.transform, /^translate\(\d+\.\d{2}px,\d+\.\d{2}px\) rotate\(\d+\.\d{3}deg\) scale\(1\.2000\)$/);
  assert.equal(a.style.opacity, '0.5000');
  const [, x, y] = a.style.transform.match(/translate\(([\d.]+)px,([\d.]+)px/);
  assert.ok(Math.abs(x - 100) <= 1.5 && Math.abs(y - 200) <= 1.5);
  const c = fakeEl('c');
  SK.piece(c, { x: 100, y: 200 }, 3, 0.07);
  assert.notEqual(c.style.transform.split(' rotate')[0], a.style.transform.split(' rotate')[0]);
  SK.piece(c, { x: 0, y: 0 }, 3, 0.5, { amp: 0 });
  assert.equal(c.style.transform, 'translate(0.00px,0.00px) rotate(0.000deg) scale(1.0000)');
});

test('cycle picks a replacement drawing per step and repeats', () => {
  const { SK } = load();
  assert.equal(SK.cycle(0, 3), 0);
  assert.equal(SK.cycle(1 / 15, 3), 1);
  assert.equal(SK.cycle(2 / 15, 3), 2);
  assert.equal(SK.cycle(3 / 15, 3), 0);
  assert.equal(SK.cycle(0.5, 4, 12), 2);
});

test('torn builds a deterministic polygon that tears only the listed edges', () => {
  const { SK } = load();
  const p = SK.torn(200, 100, 5);
  assert.equal(p, SK.torn(200, 100, 5));
  assert.notEqual(p, SK.torn(200, 100, 6));
  assert.match(p, /^polygon\([\d.]+px [\d.-]+px(,[\d.-]+px [\d.-]+px)+\)$/);
  const pts = (s) => s.slice(8, -1).split(',').map((q) => q.split(' ').map(parseFloat));
  const onlyTop = pts(SK.torn(200, 100, 5, { edges: 't', amp: 10 }));
  assert.ok(onlyTop.some(([, y]) => y > 0 && y < 50), 'top edge torn inward');
  assert.ok(onlyTop.filter(([x]) => x > 150).every(([x]) => x === 200 || x < 200), 'right edge straight');
  for (const [x, y] of pts(p)) assert.ok(x >= -3 && x <= 203 && y >= -3 && y <= 103, `${x},${y}`);
});

test('grain jumps to a seeded offset each step', () => {
  const { SK } = load();
  const a = fakeEl('g'), b = fakeEl('g');
  SK.grain(a, 0.01, 2); SK.grain(b, 0.05, 2);
  assert.equal(a.style.backgroundPosition, b.style.backgroundPosition);
  assert.match(a.style.backgroundPosition, /^\d+px \d+px$/);
  SK.grain(b, 0.1, 2);
  assert.notEqual(a.style.backgroundPosition, b.style.backgroundPosition);
});

test('lastTip reports the end of the most recently finished stroke', () => {
  const { SK } = load();
  const a = fakePath(), b = fakePath();
  const items = [{ el: a, at: 0, dur: 1 }, { el: b, at: 1, dur: 1 }];
  assert.equal(SK.lastTip(0.5, items), null);
  const l = SK.lastTip(1.5, items);
  assert.equal(l.x, 100);
  assert.equal(l.since, 0.5);
  assert.equal(SK.lastTip(3, items).since, 1);
});

test('placeHand puts the pen tip on the tip, hovers, then glides off', () => {
  const { SK } = load();
  const img = fakeEl('img', { setAttribute(k, v) { this[k] = v; } });
  SK.placeHand(img, { x: 300, y: 400 });
  assert.equal(img.src, 'vendor/paper-pack/hand-write.png');
  const H = SK.HAND.write, s = 0.55;
  assert.equal(img.style.width, (H.w * s).toFixed(1) + 'px');
  assert.equal(img.style.transform, `translate(${(300 - H.tx * s).toFixed(2)}px,${(400 - H.ty * s).toFixed(2)}px)`);
  SK.placeHand(img, null, { last: { x: 300, y: 400, since: 0.2 } });
  assert.equal(img.style.transform, `translate(${(300 - H.tx * s).toFixed(2)}px,${(400 - H.ty * s).toFixed(2)}px)`, 'hovers first');
  SK.placeHand(img, null, { last: { x: 300, y: 400, since: 5 } });
  assert.equal(img.style.transform, `translate(${(1300 - H.tx * s).toFixed(2)}px,${(2200 - H.ty * s).toFixed(2)}px)`, 'gone');
  SK.placeHand(img, { x: 10, y: 10 }, { pose: 'point' });
  assert.equal(img.src, 'vendor/paper-pack/hand-point.png');
  assert.throws(() => SK.placeHand(img, null, { pose: 'wave' }), /unknown hand pose "wave"/);
});

// ---- VOX (sub-project 2b) ----

test('highlight wipes in left to right and hides at 0', () => {
  const { SK } = load();
  const el = fakeEl('hl');
  SK.highlight(el, 0);
  assert.equal(el.style.opacity, '0');
  assert.equal(el.style.clipPath, 'inset(0 100.00% 0 0)');
  SK.highlight(el, 0.25);
  assert.equal(el.style.opacity, '1');
  assert.equal(el.style.clipPath, 'inset(0 75.00% 0 0)');
  SK.highlight(el, 3);
  assert.equal(el.style.clipPath, 'inset(0 0.00% 0 0)');
  assert.equal(el.style.visibility, undefined);
});

test('geo projects lat/lon into the map and keeps cities in place', () => {
  const { SK } = load();
  assert.deepEqual({ ...SK.geo(7.5, 94) }, { x: 0, y: 0 });
  assert.deepEqual({ ...SK.geo(-11.5, 142) }, { x: SK.MAP.w, y: SK.MAP.h });
  const at = (c) => SK.geo(...SK.CITIES[c]);
  for (const c of Object.keys(SK.CITIES)) {
    const p = at(c);
    assert.ok(p.x > 0 && p.x < SK.MAP.w && p.y > 0 && p.y < SK.MAP.h, c);
  }
  assert.ok(at('medan').x < at('jakarta').x && at('jakarta').x < at('bandung').x && at('bandung').x < at('surabaya').x
    && at('surabaya').x < at('denpasar').x && at('denpasar').x < at('makassar').x && at('makassar').x < at('jayapura').x, 'west to east');
  assert.ok(at('medan').y < at('jakarta').y, 'Medan is north of Jakarta');
  assert.ok(Math.abs(at('jakarta').x - 643) < 1 && Math.abs(at('jakarta').y - 685) < 1, 'Jakarta at (643, 685)');
});
