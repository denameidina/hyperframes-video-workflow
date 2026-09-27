// Richness guard for the style references (spec: docs/superpowers/specs/2026-09-27-style-kit-design.md,
// "Target kekayaan referensi"): minimum patterns, verified-source references, anti-slop items,
// and examples that exist on disk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REF = new URL('../docs/agents/references/', import.meta.url);
const STYLES = [
  { file: 'broll-text.md', key: 'text', patterns: 12, refs: 6, prefix: 'tx-' },
  { file: 'motion-graphic.md', key: 'mg', patterns: 12, refs: 6, prefix: 'mg-' },
  { file: 'whiteboard.md', key: 'wb', patterns: 10, refs: 6, prefix: 'wb-' },
  { file: 'stop-motion.md', key: 'stop', patterns: 12, refs: 6, prefix: 'sm-' },
  { file: 'vox.md', key: 'vox', patterns: 12, refs: 6, prefix: 'vx-', sections: ['Documents', 'Document Ethics'] },
  { file: 'mix-media.md', key: 'mm', patterns: 12, refs: 6, prefix: 'mm-', treatments: ['collage'], sections: ['Treatment: collage', 'Matte Notes'] },
  { file: 'parallax.md', key: 'px', patterns: 12, refs: 6, prefix: 'px-', treatments: ['cutaway', 'split', 'panel', 'parallax-stage'], sections: ['Layer Sources', 'Depth Budget'] },
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
    for (const h of ['When To Use', 'Look', 'Kit', 'Timing', 'Patterns', 'References', 'Build Recipe', 'SFX', 'Examples', 'Anti-slop Checklist', ...(s.sections ?? [])]) section(md, h);
  });

  test(`${s.file}: the Look section names every preset of the style and the Kit lists ≥ 12 real catalog ids`, () => {
    const presets = JSON.parse(readFileSync(new URL('../vendor/asset-lib/src/presets.json', import.meta.url), 'utf8'));
    const ids = new Set(JSON.parse(readFileSync(new URL('../vendor/asset-lib/catalog.json', import.meta.url), 'utf8')).map((e) => e.id));
    const look = section(md, 'Look');
    const st = s.key;
    const classes = [
      ...Object.keys(presets.palettes[st] ?? {}).map((n) => `.sk-pal-${st}-${n}`),
      ...(st === 'px' ? Object.keys(presets.grades).map((n) => `.sk-grade-px-${n}`) : []),
      ...Object.keys(presets.types[st] ?? {}).map((n) => `.sk-type-${st}-${n}`),
    ];
    for (const c of classes) assert.ok(look.includes('`' + c + '`'), `${c} is missing from ## Look`);
    const kit = section(md, 'Kit');
    const used = [...kit.matchAll(/`((?:icon|pict|doodle|mark|paper|hand|frame|doc|map|texture|scene|font|palette|type)\.[a-z0-9-]+)`/g)].map((m) => m[1]);
    assert.ok(new Set(used).size >= 12, `${new Set(used).size} catalog ids in ## Kit`);
    for (const id of used) assert.ok(ids.has(id), `${id} is not in vendor/asset-lib/catalog.json`);
    for (const [, p] of kit.matchAll(/`(\.\.\/asset-catalog\/sheets\/[a-z0-9-]+\.webp)`/g)) assert.ok(existsSync(new URL('styles/' + p, REF)), `${p} is missing`);
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
      const path = r.match(/`(style-examples\/[a-z-]+\/compositions\/[^`]+)`/)[1];
      assert.ok(path.startsWith(`style-examples/${s.file.replace('.md', '')}/compositions/`), `${path} is not in the ${s.file.replace('.md', '')} host`);
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
