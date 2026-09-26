import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../vendor/motion-kit/motion-kit.js', import.meta.url), 'utf8');

function fakeEl(name) {
  return {
    name,
    style: {},
    children: {},
    innerHTML: '',
    querySelector(sel) { return this.children[sel] ?? null; },
    insertAdjacentHTML(pos, html) { if (html.includes('mk-cursor')) this.children['.mk-cursor'] = fakeEl('cursor'); },
  };
}

function load({ layers = ['Lcard'], withCursor = false } = {}) {
  const stage = fakeEl('stage');
  stage.children['.mk-world'] = fakeEl('world');
  stage.children['.mk-shape'] = fakeEl('shape');
  for (const id of layers) stage.children['#' + id] = fakeEl(id);
  if (withCursor) stage.children['.mk-cursor'] = fakeEl('cursor');
  const timelines = [];
  const ctx = {
    document: { querySelector: (sel) => (sel === '[data-composition-id="broll-test"] .mk-stage' ? stage : null) },
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
  vm.runInContext(SRC, ctx);
  return { M: ctx.M, ctx, stage, timelines };
}

const CFG = () => ({
  W: 1080, H: 1920, T: 4, bg: '#050505',
  SH: { a: { w: 400, h: 120, r: 60, bg: '#ffffff', cam: 1.5 }, b: { w: 700, h: 500, r: 40, bg: '#111111', cam: 1.2 } },
  start: 'a', SEQ: [[1.5, 'b']],
  layers: [{ el: 'Lcard', tin: 0.2, tout: null, anchor: 't' }],
});

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);

test('S is a spring step response from 0 to 1', () => {
  const { M } = load();
  assert.equal(M.S(0, 15, 0.84), 0);
  assert.equal(M.S(-1, 15, 0.84), 0);
  near(M.S(5, 15, 0.84), 1);
  assert.equal(M.S(0.01, Infinity, 1), 1);
  near(M.S(0.1, 10, 1), 1 - 2 / Math.E);
});

test('track sums one spring per change and can retarget', () => {
  const { M } = load();
  const f = M.track(0, [[1, 10], [2, 20]]);
  assert.equal(f(0.5), 0);
  near(f(10), 20);
  assert.equal(M.track(5, [[1, 5]])(3), 5);
});

test('ctrack moves colours between hex targets', () => {
  const { M } = load();
  const c = M.ctrack('#000000', [[1, '#ffffff']]);
  assert.equal(c(0), 'rgb(0,0,0)');
  assert.equal(c(30), 'rgb(255,255,255)');
});

test('vis hides before tin+din, shows after, and hides after tout', () => {
  const { M } = load();
  assert.equal(M.vis(0.1, 0.5, null).o, 0);
  near(M.vis(2, 0.5, null).o, 1);
  assert.equal(M.vis(3, 0.5, 2).o, 0);
  assert.equal(M.vis(1, null, null).o, 1);
});

test('path holds its end keys and arcs between them', () => {
  const { M } = load();
  const p = M.path([[0, 0, 0], [1, 100, 0]]);
  assert.equal(p(-1).x, 0);
  assert.equal(p(-1).y, 0);
  assert.equal(p(2).x, 100);
  assert.equal(p(2).y, 0);
  near(p(0.5).x, 50);
  near(p(0.5).y, 6);
});

test('presses dips on a click and settles back', () => {
  const { M } = load();
  const pr = M.presses([1], []);
  assert.equal(pr(0), 0);
  assert.ok(pr(1) > 0.5);
  near(pr(5), 0);
});

test('crossTimes finds the first crossing of each threshold', () => {
  const { M } = load();
  const ct = M.crossTimes((t) => t, 0, 2, [0.5, 1.5, 3]);
  near(ct[0], 0.5, 0.002);
  near(ct[1], 1.5, 0.002);
  assert.equal(ct[2], Infinity);
});

test('icon normalises stroke width and includes the new vocabulary icons', () => {
  const { M } = load();
  assert.match(M.icon('check', 24, '#fff', 2.2), /stroke-width="2\.200"/);
  assert.match(M.icon('check', 48, '#fff', 2.2), /stroke-width="1\.100"/);
  for (const n of ['message', 'calendar', 'bell', 'users']) assert.ok(M.IC[n] && M.IC[n].length > 0, n);
});

test('finder looks up ids inside the clip stage only', () => {
  const { M, stage } = load();
  assert.equal(M.finder('broll-test')('Lcard'), stage.children['#Lcard']);
  assert.throws(() => M.finder('missing'), /no \.mk-stage inside \[data-composition-id="missing"\]/);
});

test('build draws the shape, camera, and layers as a function of t', () => {
  const { M, stage } = load();
  const seek = M.build('broll-test', CFG());
  assert.equal(stage.style.width, '1080px');
  assert.equal(stage.style.background, '#050505');
  seek(0.1);
  const shape = stage.children['.mk-shape'].style;
  assert.equal(shape.width, '400.000px');
  assert.match(stage.children['.mk-world'].style.transform, /scale\(1\.50000\)/);
  assert.equal(stage.children['#Lcard'].style.display, 'none');
  seek(10);
  near(parseFloat(shape.width), 700, 0.01);
  assert.equal(stage.children['#Lcard'].style.display, '');
  assert.equal(stage.children['#Lcard'].style.top, '0.000px');
});

test('build removes the shape shadow for transparent clips', () => {
  const { M, stage } = load();
  M.build('broll-test', { ...CFG(), bg: null });
  assert.equal(stage.style.background, 'transparent');
  assert.equal(stage.children['.mk-shape'].style.boxShadow, 'none');
});

test('build rejects unknown states and missing layers', () => {
  const { M } = load();
  assert.throws(() => M.build('broll-test', { ...CFG(), start: 'zzz' }), /start state "zzz" is not in SH/);
  assert.throws(() => M.build('broll-test', { ...CFG(), SEQ: [[1, 'zzz']] }), /state "zzz" is not in SH/);
  assert.throws(() => M.build('broll-test', { ...CFG(), layers: [{ el: 'Lmissing', tin: 0, tout: null }] }), /layer #Lmissing not found/);
});

test('build adds a cursor when the clip has none and moves it', () => {
  const { M, stage } = load();
  const seek = M.build('broll-test', { ...CFG(), cursor: { size: 40, clicks: [1], keys: [[0, 10, 20], [1, 30, 40]] } });
  seek(2);
  const cur = stage.children['.mk-cursor'];
  assert.ok(cur, 'cursor inserted');
  assert.equal(cur.style.width, '40px');
  assert.match(cur.style.transform, /^translate\(/);
});

test('clip registers a paused timeline whose proxy tween drives seek', () => {
  const { M, ctx, stage, timelines } = load();
  const seek = M.clip('broll-test', CFG());
  assert.equal(ctx.__timelines['broll-test'], timelines[0]);
  assert.equal(timelines[0].opts.paused, true);
  const tw = timelines[0].tweens[0];
  assert.equal(tw.vars.t, 4);
  assert.equal(tw.vars.duration, 4);
  assert.equal(tw.vars.ease, 'none');
  assert.equal(tw.pos, 0);
  tw.target.t = 2.3;
  tw.vars.onUpdate();
  const viaTimeline = { ...stage.children['.mk-shape'].style };
  seek(0);
  seek(2.3);
  assert.deepEqual({ ...stage.children['.mk-shape'].style }, viaTimeline);
});

test('clip rejects a missing or zero duration', () => {
  const { M } = load();
  assert.throws(() => M.clip('broll-test', { ...CFG(), T: 0 }), /needs cfg\.T > 0/);
});
