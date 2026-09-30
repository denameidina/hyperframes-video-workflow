import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const project = mkdtempSync(join(tmpdir(), 'atelier-composition-'));
const built = spawnSync('python3', ['scripts/create-style-atelier-composition.py', project], { encoding: 'utf8' });
assert.equal(built.status, 0, built.stderr);
after(() => rmSync(project, { recursive: true, force: true }));

function scene(file) {
  const html = readFileSync(join(project, 'compositions', file), 'utf8');
  const nodes = new Map();
  function node(key) {
    if (!nodes.has(key)) nodes.set(key, {
      style: {},
      querySelector: selector => node(`${key}/${selector}`),
      querySelectorAll: selector => Array.from({ length: 6 }, (_, i) => node(`${key}/${selector}/${i}`)),
    });
    return nodes.get(key);
  }
  let update;
  const root = node('root');
  const context = {
    document: { querySelector: () => root },
    M: { clamp: x => Math.max(0, Math.min(1, x)), eo: x => 1 - (1 - x) ** 3, S: t => 1 - Math.exp(-t * 5) },
    SK: {
      clip: (_id, config) => { update = config.update; },
      enter: (el, t) => { el.style.transform = `translateY(${Math.max(0, 1 - t) * 100}px)`; el.style.opacity = Math.max(0, Math.min(1, t)); },
    },
  };
  vm.runInNewContext(html.match(/<script>([\s\S]+)<\/script>/)[1], context);
  return { nodes, update, snapshot: () => JSON.stringify(Array.from(nodes, ([key, el]) => [key, el.style])) };
}

test('all sixteen cuts have one scene owner at the cut and neighboring frames', () => {
  const html = readFileSync(join(project, 'index.html'), 'utf8');
  const mounts = [...html.matchAll(/<div id="mount-\d+"[^>]+data-start="([^"]+)" data-duration="([^"]+)"/g)].map(m => ({ start: +m[1], duration: +m[2] }));
  assert.equal(mounts.length, 16);
  for (let cut = 4; cut < 64; cut += 4) for (const offset of [-1 / 30, -1 / 120, 0, 1 / 120, 1 / 30]) {
    const time = cut + offset;
    assert.equal(mounts.filter(m => time >= m.start && time <= m.start + m.duration).length, 1, `ownership at ${time}`);
  }
  assert.match(html, /\.mount\{[^}]*isolation:isolate/);
});

test('tempo headline resets identically after a backward seek', () => {
  const fresh = scene('02-text-tempo.html'); fresh.update(.5);
  const seek = scene('02-text-tempo.html'); seek.update(3.5); seek.update(.5);
  assert.equal(seek.snapshot(), fresh.snapshot());
});

test('material and finale animate named parts and remain deterministic after seeks', () => {
  for (const file of ['15-material.html', '16-finale.html']) {
    const clip = scene(file);
    clip.update(1.4);
    const early = new Map(Array.from(clip.nodes, ([key, el]) => [key, JSON.stringify(el.style)]));
    clip.update(2.9);
    const changedParts = [...clip.nodes].filter(([key, el]) => key.includes('/[data-part') && JSON.stringify(el.style) !== early.get(key));
    assert.ok(changedParts.length >= 3, `${file} must change multiple material parts`);
    const fresh = scene(file); fresh.update(.5);
    clip.update(.5);
    assert.equal(clip.snapshot(), fresh.snapshot(), `${file} backward seek`);
  }
});
