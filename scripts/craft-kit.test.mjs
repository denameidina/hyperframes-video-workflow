// craft-kit engine + recipes (spec: docs/superpowers/specs/2026-09-28-craft-kit-design.md,
// criteria RD-02-39 … RD-02-45 and RD-02-47). Loads the real vendor/gsap.min.js in a vm; targets are plain
// objects, so GSAP tweens their properties directly and both modes can be compared value by value.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const GSAP = read('../vendor/gsap.min.js');
const CKJS = read('../vendor/craft-kit/craft-kit.js');

function fakeDocument() {
  const node = (tag) => ({
    tag, className: '', children: [], _text: '',
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); },
    set textContent(v) { this._text = v; this.children = []; },
    appendChild(c) { this.children.push(c); return c; },
  });
  return { createElement: node, createTextNode: (s) => ({ textContent: s }), node };
}

function load({ withGsap = true } = {}) {
  const document = fakeDocument();
  const quiet = { ...console, warn() {} }; // gsap warns about properties a bare object does not have yet
  const ctx = { console: quiet, setTimeout, clearTimeout, performance, Date };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  if (withGsap) vm.runInContext(GSAP, ctx);
  ctx.document = document; // after gsap: a document at load time makes gsap boot its CSS plugin
  vm.runInContext(CKJS, ctx);
  return { CK: ctx.CK, gsap: ctx.gsap, document };
}

const nums = (v) => (typeof v === 'number' ? [v] : (String(v).match(/-?\d+(\.\d+)?/g) ?? [NaN]).map(Number));
const close = (a, b, eps, msg) => {
  const x = nums(a), y = nums(b);
  assert.equal(x.length, y.length, `${msg}: ${a} vs ${b}`);
  assert.ok(!x.some(Number.isNaN) && !y.some(Number.isNaN), `${msg}: ${a} vs ${b}`);
  x.forEach((n, i) => assert.ok(Math.abs(n - y[i]) <= eps, `${msg}: ${a} vs ${b}`));
};

// every recipe with the options its catalog row names
const CASES = [
  ['arrive', {}], ['arrive', { dir: 'down', dist: 600 }], ['arrive', { dir: 'left' }], ['arrive', { dir: 'right', tilt: 8 }],
  ['exit', {}], ['exit', { dir: 'down' }], ['exit', { dir: 'left', dist: 900 }],
  ['bob', {}], ['bob', { amp: 12, cycles: 1 }],
  ['rubber', {}], ['rubber', { axis: 'y' }],
  ['squash', {}], ['recoil', {}], ['wordMask', {}], ['sharpen', {}], ['sheen', {}],
  ['clip', {}], ['clip', { shape: 'circle' }], ['clip', { shape: 'wipe' }], ['clip', { radius: 52 }],
  ['flip', {}], ['shadow', {}], ['shadow', { phase: 'exit' }],
];

test('RD-02-39: CK.at matches the timeline CK.add builds, at 30 fps, for every recipe', () => {
  const { CK, gsap } = load();
  for (const [name, opts] of CASES) {
    const o = { ...opts, stagger: 0.07 };
    const viaTl = [{}, {}], viaAt = [{}, {}];
    const tl = gsap.timeline({ paused: true });
    const AT = 0.5;
    CK.add(tl, viaTl, name, AT, o);
    const end = AT + CK.duration(name, { ...o, count: 2 }) + 0.3;
    for (let f = 0; f <= Math.ceil(end * 30); f++) {
      const t = f / 30;
      tl.seek(t);
      CK.at(viaAt, name, t - AT, o);
      viaTl.forEach((a, i) => {
        if (t - AT - i * 0.07 < 0 && !CK.tracks(name, o).enter) return; // not started: nothing to compare
        for (const p of Object.keys(CK.tracks(name, o).tracks)) close(a[p], viaAt[i][p], 0.01, `${name} ${JSON.stringify(opts)} target ${i} ${p} t=${t.toFixed(3)}`);
      });
    }
  }
});

// last frame of every recipe (RD-02-40: non-exit recipes end at rest)
const REST = { opacity: 1, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotationX: 0, rotationY: 0, skewY: 0, yPercent: 0 };
const FINAL = {
  sheen: { opacity: 0, '--ck-sheen': '140%' },
  clip: { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
  'clip-circle': { clipPath: 'circle(75% at 50% 50%)' },
  'clip-wipe': { clipPath: 'inset(0% 0% 0% 0%)' },
  'clip-r52': { clipPath: 'inset(0% 0% 0% 0% round 52px)' },
  flip: { '--ck-face': 1 },
  shadow: { opacity: 0.36, scaleX: 0.92, scaleY: 1 },
  'shadow-exit': { opacity: 0, scaleX: 0.3, scaleY: 0.4 },
};
test('RD-02-40: every non-exit recipe ends in its catalogued rest state', () => {
  const { CK } = load();
  for (const [name, opts] of CASES) {
    if (name === 'exit') continue;
    const key = name + (opts.shape ? '-' + opts.shape : opts.radius ? '-r' + opts.radius : opts.phase === 'exit' ? '-exit' : '');
    const end = CK.sample(name, CK.duration(name, opts) + 1, opts);
    for (const [p, v] of Object.entries(end)) {
      const want = FINAL[key]?.[p] ?? REST[p] ?? (p === 'filter' ? 'blur(0px)' : undefined);
      assert.notEqual(want, undefined, `${key}: no expected final value for ${p}`);
      close(v, want, 0.001, `${key} ${p}`);
    }
  }
});

test('RD-02-41: exit keeps opacity >= 0.5 until 80% of dist is travelled', () => {
  const { CK } = load();
  for (const [dir, axis, sign] of [['up', 'y', -1], ['down', 'y', 1], ['left', 'x', -1], ['right', 'x', 1]]) {
    const dist = 1550;
    let left = false;
    for (let t = 0; t <= CK.duration('exit', { dir }) + 0.1; t += 0.001) {
      const s = CK.sample('exit', t, { dir, dist });
      const travelled = s[axis] * sign;
      if (s.opacity < 0.5) assert.ok(travelled >= 0.8 * dist, `${dir}: opacity ${s.opacity} at ${travelled}px`);
      if (travelled >= dist - 1e-6) left = true;
    }
    assert.ok(left, `${dir}: never reached dist`);
    assert.equal(CK.sample('exit', 5, { dir }).opacity, 0);
  }
});

test('RD-02-42: sample is deterministic and the source reads no clock or randomness', () => {
  const a = load().CK, b = load().CK;
  for (const [name, opts] of CASES) for (const t of [0, 0.137, 0.5, 0.9, 1.3, 3]) {
    const json = (ck) => JSON.stringify(ck.sample(name, t, opts));
    assert.equal(json(a), json(a));
    assert.equal(json(a), json(b));
  }
  assert.doesNotMatch(CKJS, /Math\.random|Date\.now|performance\.now|requestAnimationFrame|setTimeout/);
});

test('RD-02-43: unknown recipe, dir, or clip shape throws a named error', () => {
  const { CK } = load();
  assert.throws(() => CK.tracks('wobble'), /craft-kit: unknown recipe "wobble"/);
  assert.throws(() => CK.sample('arrive', 0, { dir: 'sideways' }), /craft-kit: unknown dir "sideways"/);
  assert.throws(() => CK.sample('clip', 0, { shape: 'star' }), /craft-kit: unknown clip shape "star"/);
});

test('RD-02-44: craft-kit refuses to load before gsap', () => {
  assert.throws(() => load({ withGsap: false }), /craft-kit: load gsap before craft-kit\.js/);
});

test('RD-02-45: target i starts exactly i*stagger after target 0 in both modes', () => {
  const { CK, gsap } = load();
  const els = [{}, {}, {}];
  const tl = gsap.timeline({ paused: true });
  CK.add(tl, els, 'arrive', 1, { stagger: 0.2 });
  tl.seek(1.4 + 0.08); // target 2 starts at 1.4 and is fully faded in 0.08 s later
  assert.equal(els[2].opacity, 1);
  tl.seek(1.4 - 0.001);
  assert.equal(els[2].opacity, 0);
  const at = [{}, {}, {}];
  CK.at(at, 'arrive', 0.4 + 0.08, { stagger: 0.2 });
  assert.equal(at[2].opacity, 1);
  CK.at(at, 'arrive', 0.4 - 0.001, { stagger: 0.2 });
  assert.equal(at[2].opacity, 0);
  assert.ok(Math.abs(CK.duration('arrive', { stagger: 0.2, count: 3 }) - (1.24 + 0.4)) < 1e-9);
});

test('entrance recipes hold their first frame before they start; others leave the target alone', () => {
  const { CK, gsap } = load();
  const card = { y: 0, opacity: 1 };
  const tl = gsap.timeline({ paused: true });
  CK.add(tl, card, 'arrive', 1);
  tl.seek(0.5);
  assert.equal(card.opacity, 0);
  assert.equal(card.y, 1120);
  const held = { y: 5 };
  CK.at(held, 'exit', -0.2);
  assert.equal(held.y, 5);
});

test('speed divides every time; wordMask defaults to a 0.105 s stagger', () => {
  const { CK } = load();
  assert.ok(Math.abs(CK.duration('arrive', { speed: 2 }) - 0.62) < 1e-9);
  assert.equal(CK.sample('arrive', 0.45, { speed: 2 }).y, CK.sample('arrive', 0.9).y);
  assert.equal(CK.tracks('wordMask').stagger, 0.105);
  assert.equal(CK.tracks('wordMask', { stagger: 0.05 }).stagger, 0.05);
});

test('split wraps each word in .ck-mask > .ck-word once', () => {
  const { CK, document } = load();
  const el = document.node('h1');
  el.textContent = '  Mulai   dari satu ';
  const words = CK.split(el);
  assert.deepEqual([...words].map((w) => w.textContent), ['Mulai', 'dari', 'satu']);
  assert.equal(el.children.filter((c) => c.className === 'ck-mask').length, 3);
  assert.equal(words[0].className, 'ck-word');
  assert.equal(el.textContent, 'Mulai dari satu');
  assert.equal(CK.split(el), words);
});

test('the kit credits NullMotion as inspiration and states nothing was copied', () => {
  assert.match(CKJS, /blixvip\/NullMotion/);
  assert.match(CKJS, /no code copied/);
});

test('RD-02-47: a recipe added at time 0 is already applied at frame 0, also after seeking back', () => {
  const { CK, gsap } = load();
  const card = { opacity: 1, y: 0 };
  const tl = gsap.timeline({ paused: true });
  CK.add(tl, card, 'arrive', 0);
  tl.seek(0);
  assert.equal(card.opacity, 0);
  tl.seek(2);
  assert.equal(card.opacity, 1);
  tl.seek(0);
  assert.equal(card.opacity, 0);
  assert.equal(card.y, 1120);
});
