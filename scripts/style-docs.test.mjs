// Richness guard for the style references (spec: docs/superpowers/specs/2026-09-27-style-kit-design.md,
// "Target kekayaan referensi"): minimum patterns, verified-source references, anti-slop items,
// and examples that exist on disk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const REF = new URL('../docs/agents/references/', import.meta.url);
const STYLES = [
  { file: 'broll-text.md', patterns: 12, refs: 6, prefix: 'tx-' },
  { file: 'motion-graphic.md', patterns: 12, refs: 6, prefix: 'mg-' },
  { file: 'whiteboard.md', patterns: 10, refs: 6, prefix: 'wb-' },
  { file: 'stop-motion.md', patterns: 12, refs: 6, prefix: 'sm-' },
  { file: 'vox.md', patterns: 12, refs: 6, prefix: 'vx-', sections: ['Documents', 'Document Ethics'] },
  { file: 'mix-media.md', patterns: 12, refs: 6, prefix: 'mm-', treatments: ['collage'], sections: ['Treatment: collage', 'Matte Notes'] },
];

const section = (md, title) => {
  const start = md.indexOf(`\n## ${title}\n`);
  assert.ok(start >= 0, `missing "## ${title}"`);
  const end = md.indexOf('\n## ', start + 4);
  return md.slice(start, end < 0 ? undefined : end);
};

for (const s of STYLES) {
  const md = readFileSync(new URL('styles/' + s.file, REF), 'utf8');

  test(`${s.file}: has the required sections`, () => {
    for (const h of ['When To Use', 'Look', 'Timing', 'Patterns', 'References', 'Build Recipe', 'SFX', 'Examples', 'Anti-slop Checklist', ...(s.sections ?? [])]) section(md, h);
  });

  test(`${s.file}: at least ${s.patterns} patterns, each with every column filled`, () => {
    const rows = section(md, 'Patterns').split('\n').filter((l) => l.startsWith('| **'));
    assert.ok(rows.length >= s.patterns, `${rows.length} patterns`);
    for (const r of rows) {
      const cells = r.split('|').slice(1, -1).map((c) => c.trim());
      assert.equal(cells.length, 7, r);
      assert.ok(cells.every((c) => c.length > 0), r);
    }
  });

  test(`${s.file}: at least ${s.refs} references, each with a source URL, steal, and 9:16 note`, () => {
    const refs = section(md, 'References').split('\n### ').slice(1);
    assert.ok(refs.length >= s.refs, `${refs.length} references`);
    for (const r of refs) {
      assert.match(r, /^R\d+ — /, r.slice(0, 40));
      assert.match(r, /- Source: .*https?:\/\//, r.slice(0, 40));
      assert.match(r, /- Steal: /, r.slice(0, 40));
      assert.match(r, /- 9:16: /, r.slice(0, 40));
    }
  });

  test(`${s.file}: at least 8 anti-slop checks`, () => {
    const items = section(md, 'Anti-slop Checklist').split('\n').filter((l) => l.startsWith('- [ ] '));
    assert.ok(items.length >= 8, `${items.length} items`);
  });

  test(`${s.file}: at least 4 examples that exist and cover ${(s.treatments ?? ['cutaway', 'split', 'panel']).join(', ')}`, () => {
    const rows = section(md, 'Examples').split('\n').filter((l) => l.startsWith('| `style-examples/'));
    assert.ok(rows.length >= 4, `${rows.length} examples`);
    const treatments = new Set();
    for (const r of rows) {
      const path = r.match(/`(style-examples\/compositions\/[^`]+)`/)[1];
      assert.ok(path.includes('/' + s.prefix), path);
      assert.ok(existsSync(new URL(path, REF)), `${path} is missing`);
      treatments.add(r.split('|').slice(-2, -1)[0].trim());
    }
    assert.deepEqual([...treatments].sort(), [...(s.treatments ?? ['cutaway', 'panel', 'split'])].sort());
  });
}

test('styles/README.md lists every available style and its reference file', () => {
  const md = readFileSync(new URL('styles/README.md', REF), 'utf8');
  for (const s of STYLES) {
    assert.match(md, new RegExp('\\| `' + s.file.replace('.md', '') + '` \\|.*\\| `' + s.file + '` \\| available \\|'));
  }
  for (const h of ['Menu', 'Choosing A Style', 'Variety Rules', 'Style B-roll Brief', 'Build Contract (all styles)']) section(md, h);
});

test('every example clip on disk is mounted in the example host, and every mount exists', () => {
  const host = readFileSync(new URL('style-examples/index.html', REF), 'utf8');
  const clips = [...host.matchAll(/data-composition-src="compositions\/([^"]+)"/g)].map((m) => m[1]);
  const onDisk = readdirSync(new URL('style-examples/compositions/', REF)).filter((f) => f.endsWith('.html'));
  assert.deepEqual([...clips].sort(), [...onDisk].sort());
  assert.equal(clips.length, 28);
});
