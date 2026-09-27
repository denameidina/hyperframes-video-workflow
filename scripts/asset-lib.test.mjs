// Asset library guard (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md, "Pengujian"):
// path + map helpers, generated files up to date, catalog ↔ files ↔ LICENSES, budget, presets contrast,
// fonts, hand anchors, and the SK runtime (icons, pictograms, strokes, rough, stamps, frames, docs, maps).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { absolutize, shapeToPath, splitSubpaths, stringify, tokenize } from './lib/svg-path.mjs';
import { dp, geomPath, mapSvg, ringArea } from './lib/geo-svg.mjs';
import { buildAll, LIB, OUTPUTS, parseStrokeSvg, pngSize, STYLE_KEY, STYLES, TAGS } from './lib/asset-lib-build.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const catalog = JSON.parse(read(`${LIB}/catalog.json`));

// ---- svg-path ----------------------------------------------------------------------------------------
test('splitSubpaths makes relative commands, H/V, implicit lineto, and compact arc flags absolute', () => {
  assert.deepEqual(splitSubpaths('m21 21-4.3-4.3'), ['M21 21L16.7 16.7']);
  assert.deepEqual(splitSubpaths('M3 3v18h18m-3-5-5-5-4 4-3-3'), ['M3 3L3 21L21 21', 'M18 16L13 11L9 15L6 12']);
  assert.deepEqual(splitSubpaths('M12 2a1 1 0 011 1'), ['M12 2A1 1 0 0 1 13 3']);
  assert.deepEqual(splitSubpaths('m6.134 14.768.866-.5 2 3.464'), ['M6.134 14.768L7 14.268L9 17.732']);
  assert.deepEqual(splitSubpaths('M13.744 17.736a6 6 0 1 1-7.48-7.48'), ['M13.744 17.736A6 6 0 1 1 6.264 10.256']);
});
test('S and T reflect the previous control point; z returns to the subpath start', () => {
  assert.equal(stringify(absolutize('M0 0C1 1 2 1 3 0S5 -1 6 0')), 'M0 0C1 1 2 1 3 0C4 -1 5 -1 6 0');
  assert.equal(stringify(absolutize('M0 0Q1 1 2 0T4 0')), 'M0 0Q1 1 2 0Q3 -1 4 0');
  assert.deepEqual(splitSubpaths('M10 10l5 0z m2 2l1 0'), ['M10 10L15 10Z', 'M12 12L13 12']);
});
test('tokenize rejects a command with the wrong number of arguments', () => {
  assert.throws(() => tokenize('M1'), /M needs a multiple of 2/);
});
test('shapeToPath turns every Lucide shape into path data', () => {
  assert.deepEqual(splitSubpaths(shapeToPath('circle', { cx: '16', cy: '8', r: '6' })), ['M10 8A6 6 0 1 0 22 8A6 6 0 1 0 10 8Z']);
  assert.deepEqual(splitSubpaths(shapeToPath('rect', { x: '2', y: '4', width: '20', height: '16', rx: '2' })), ['M4 4L20 4A2 2 0 0 1 22 6L22 18A2 2 0 0 1 20 20L4 20A2 2 0 0 1 2 18L2 6A2 2 0 0 1 4 4Z']);
  assert.equal(shapeToPath('rect', { x: '1', y: '1', width: '4', height: '2' }), 'M1 1H5V3H1Z');
  assert.equal(shapeToPath('line', { x1: '1', y1: '2', x2: '3', y2: '4' }), 'M1 2L3 4');
  assert.equal(shapeToPath('polyline', { points: '22 7 13.5 15.5 8.5 10.5' }), 'M22 7L13.5 15.5L8.5 10.5');
  assert.equal(shapeToPath('polygon', { points: '0 0 4 0 2 3' }), 'M0 0L4 0L2 3Z');
  assert.equal(shapeToPath('ellipse', { cx: '5', cy: '5', rx: '4', ry: '2' }), 'M1 5A4 2 0 1 0 9 5A4 2 0 1 0 1 5Z');
  assert.throws(() => shapeToPath('text', {}), /unsupported shape <text>/);
});
// ---- geo-svg -----------------------------------------------------------------------------------------
test('dp drops near-collinear points and keeps corners; ringArea is the shoelace area', () => {
  assert.deepEqual(dp([[0, 0], [1, 0.001], [2, 0]], 0.01), [[0, 0], [2, 0]]);
  assert.deepEqual(dp([[0, 0], [1, 1], [2, 0]], 0.01), [[0, 0], [1, 1], [2, 0]]);
  assert.equal(ringArea([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]), 1);
});
test('geomPath projects equirectangular pixels, skips far rings and tiny islands', () => {
  const box = { lon0: 94, lon1: 142, lat0: 7.5, lat1: -11.5, k: 50, tol: 0, minArea: 0.004 };
  const sq = { type: 'Polygon', coordinates: [[[100, 0], [101, 0], [101, -1], [100, -1], [100, 0]]] };
  assert.equal(geomPath(sq, box), 'M300 375L350 375L350 425L300 425L300 375Z');
  const far = { type: 'Polygon', coordinates: [[[10, 50], [11, 50], [11, 49], [10, 49], [10, 50]]] };
  assert.equal(geomPath(far, box), '');
  const tiny = { type: 'Polygon', coordinates: [[[100, 0], [100.01, 0], [100.01, -0.01], [100, 0]]] };
  assert.equal(geomPath(tiny, box), '');
  const svg = mapSvg(box, [{ id: 'provinces', each: true, fill: '#b9ad96', features: [{ id: 'a', geometry: sq }] }], 'note');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 2400 950" width="2400" height="950"><!-- note --><g id="provinces"/);
  assert.match(svg, /<path id="a" d="M300 375/);
});

// ---- build outputs -----------------------------------------------------------------------------------
test('generated files match a fresh build (run: npm run asset-lib -- build)', () => {
  for (const [p, c] of Object.entries(buildAll(ROOT))) assert.equal(read(p), c, `${p} is stale`);
});
// ---- catalog -----------------------------------------------------------------------------------------
test('catalog ids are unique and every entry has a known kind, styles, and vocabulary tags', () => {
  const ids = catalog.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of catalog) {
    assert.ok(e.styles.length && e.styles.every((s) => STYLES.includes(s)), e.id);
    assert.ok(e.tags.length && e.tags.every((t) => TAGS.includes(t)), e.id);
    assert.ok(e.use, `${e.id} has no use`);
  }
});
test('every catalog file exists and is tracked in git', () => {
  const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n'));
  for (const e of catalog.filter((x) => x.file)) {
    assert.ok(existsSync(join(ROOT, e.file)), `${e.id}: ${e.file} is missing`);
    if (e.kind !== 'scene') assert.ok(tracked.has(e.file), `${e.id}: ${e.file} is not tracked in git`);
  }
});
const libFiles = (dir = '') => readdirSync(join(ROOT, LIB, dir), { withFileTypes: true }).flatMap((d) => {
  const p = dir ? `${dir}/${d.name}` : d.name;
  if (d.isDirectory()) return p === 'src' ? [] : libFiles(p);
  return d.name.startsWith('.') ? [] : [p];
});
test('every library file outside src/ has a LICENSES.md row', () => {
  const lic = read(`${LIB}/LICENSES.md`);
  for (const f of libFiles()) {
    if (OUTPUTS.includes(f) || f.endsWith('/scene.json')) continue;
    assert.ok(lic.includes('| `' + f + '` |'), `${f} is missing from ${LIB}/LICENSES.md`);
  }
});
test('the library and its contact sheets stay within 25 MB', () => {
  const sheets = 'docs/agents/references/asset-catalog/sheets';
  const lib = libFiles().reduce((n, f) => n + statSync(join(ROOT, LIB, f)).size, 0);
  const sh = existsSync(join(ROOT, sheets)) ? readdirSync(join(ROOT, sheets)).reduce((n, f) => n + statSync(join(ROOT, sheets, f)).size, 0) : 0;
  assert.ok(lib + sh <= 25 * 1024 * 1024, `${((lib + sh) / 1048576).toFixed(2)} MB`);
});
test('texture JPGs stay ≤ 400 KB and PNG assets keep alpha', () => {
  for (const f of libFiles()) {
    if (f.endsWith('.jpg')) assert.ok(statSync(join(ROOT, LIB, f)).size <= 400 * 1024, f);
    if (f.endsWith('.png')) {
      const b = readFileSync(join(ROOT, LIB, f));
      assert.ok(b[25] === 6 || b[25] === 4 || (b[25] === 3 && b.includes(Buffer.from('tRNS'))), `${f} has no alpha`);
    }
  }
});
// ---- runtime -----------------------------------------------------------------------------------------
function load() {
  const ctx = { document: { querySelector: () => null }, gsap: { timeline: () => ({ to() { return this; } }) } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['vendor/motion-kit/motion-kit.js', 'vendor/style-kit/style-kit.js', `${LIB}/asset-lib.js`]) vm.runInContext(read(f), ctx);
  return ctx.SK;
}
test('asset-lib refuses to load before style-kit', () => {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  assert.throws(() => vm.runInContext(read(`${LIB}/asset-lib.js`), ctx), /load vendor\/style-kit\/style-kit\.js before asset-lib\.js/);
});
test('SK.icon and SK.pict return sized SVG strings and name close matches for unknown ids', () => {
  const SK = load();
  const s = SK.icon('coins', { size: 120, sw: 3, color: '#123456' });
  assert.match(s, /^<svg class="sk-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#123456" stroke-width="0\.600"/);
  assert.equal((s.match(/<path /g) || []).length, 4);
  assert.equal(SK.icon('icon.coins'), SK.icon('coins'));
  assert.throws(() => SK.icon('coin'), /unknown icon "coin" \(did you mean .*coins/);
  assert.match(SK.pict('robot', { size: 48, color: 'red' }), /^<svg class="sk-pict" width="48" height="48" viewBox="0 0 256 256" fill="red"><path d="M/);
  assert.equal(SK.asset('icon.coins').inline, "SK.icon('coins')");
});
test('SK.rough is deterministic per seed, redraws each path once, and resets the length cache', () => {
  const SK = load();
  const mk = () => {
    const p = { d: 'M0 0L20 0', _skLen: 20, getTotalLength: () => 20, getPointAtLength: (s) => ({ x: s, y: 0 }), setAttribute(k, v) { this[k] = v; } };
    return { p, svg: { querySelectorAll: () => [p] } };
  };
  const a = mk(), b = mk(), c = mk();
  SK.rough(a.svg, { seed: 4 }); SK.rough(b.svg, { seed: 4 }); SK.rough(c.svg, { seed: 5 });
  assert.equal(a.p.d, b.p.d);
  assert.notEqual(a.p.d, c.p.d);
  assert.match(a.p.d, /^M-?\d+\.\d{2} -?\d+\.\d{2}C/);
  assert.equal(a.p._skLen, null);
  const once = a.p.d; SK.rough(a.svg, { seed: 9 }); assert.equal(a.p.d, once);
});

// ---- contact sheets ----------------------------------------------------------------------------------
test('the contact-sheet project matches the catalog and every page has a rendered sheet (run: npm run asset-lib -- sheets)', async () => {
  const { sheetProject, CATALOG_DIR } = await import('./lib/asset-lib-sheets.mjs');
  const { pages, files } = sheetProject(ROOT);
  for (const [p, c] of Object.entries(files)) assert.equal(read(p), c, `${p} is stale`);
  const onDisk = readdirSync(join(ROOT, CATALOG_DIR, 'compositions')).sort();
  assert.deepEqual(onDisk, pages.map((p) => `${p.name}.html`).sort());
  for (const p of pages) assert.ok(existsSync(join(ROOT, CATALOG_DIR, 'sheets', `${p.name}.webp`)), `sheets/${p.name}.webp is missing`);
});
