// Paper pack guard (spec: docs/superpowers/specs/2026-09-27-paper-pack-stop-motion-design.md):
// every file is licensed in LICENSES.md, every PNG keeps an alpha channel, the pack stays ≤ 5 MB,
// and the hand anchors in style-kit match the PNG sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const DIR = new URL('../vendor/paper-pack/', import.meta.url);
const files = readdirSync(DIR).filter((f) => !f.startsWith('.'));
const licenses = readFileSync(new URL('LICENSES.md', DIR), 'utf8');

// PNG IHDR: width @16, height @20, colour type @25 (4 = grey+alpha, 6 = RGBA, 3 = palette with tRNS)
const png = (f) => {
  const b = readFileSync(new URL(f, DIR));
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${f} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: b[25], trns: b.includes(Buffer.from('tRNS')) };
};

test('every paper-pack file has a LICENSES.md row with a source and a license', () => {
  for (const f of files) {
    const row = licenses.split('\n').find((l) => l.startsWith('| `' + f + '` |'));
    assert.ok(row, `${f} is missing from LICENSES.md`);
    const cells = row.split('|').slice(1, -1).map((c) => c.trim());
    assert.equal(cells.length, 4, row);
    assert.ok(cells[1].length > 0 && cells[2].length > 0, row);
    if (cells[2].startsWith('CC0')) assert.match(cells[1], /https:\/\/ambientcg\.com\/view\?id=\w+/, row);
  }
});

test('every PNG keeps transparency', () => {
  for (const f of files.filter((x) => x.endsWith('.png'))) {
    const p = png(f);
    assert.ok(p.type === 6 || p.type === 4 || (p.type === 3 && p.trns), `${f} has no alpha (colour type ${p.type})`);
  }
});

test('the pack stays within 5 MB', () => {
  const total = files.reduce((n, f) => n + statSync(new URL(f, DIR)).size, 0);
  assert.ok(total <= 5 * 1024 * 1024, `${(total / 1048576).toFixed(2)} MB`);
});

test('texture JPGs are 1080×1920-ready and hand anchors match the PNGs', () => {
  for (const f of files.filter((x) => x.endsWith('.jpg'))) assert.ok(statSync(new URL(f, DIR)).size <= 400 * 1024, f);
  const src = readFileSync(new URL('../vendor/style-kit/style-kit.js', import.meta.url), 'utf8');
  for (const pose of ['write', 'point']) {
    const m = src.match(new RegExp(pose + ":\\{src:'vendor/paper-pack/hand-" + pose + "\\.png', w:(\\d+), h:(\\d+), tx:(\\d+), ty:(\\d+)\\}"));
    assert.ok(m, `SK.HAND.${pose} not found`);
    const p = png(`hand-${pose}.png`);
    assert.deepEqual([p.w, p.h], [Number(m[1]), Number(m[2])], `hand-${pose}.png size`);
    assert.ok(Number(m[3]) < p.w && Number(m[4]) < p.h);
  }
});
