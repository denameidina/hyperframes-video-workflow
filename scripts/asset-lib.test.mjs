// Asset library guard (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md, "Pengujian").
// Later tasks replace this header and append build, catalog, preset, runtime, and sheet checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absolutize, shapeToPath, splitSubpaths, stringify, tokenize } from './lib/svg-path.mjs';
import { dp, geomPath, mapSvg, ringArea } from './lib/geo-svg.mjs';

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
