import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyMigration, formatPlan, planMigration } from './lib/migrate-sources.mjs';

const probe = () => ({ duration: 60, width: 1920, height: 1080, fps: 30, rotation: -90, hasAudio: true });
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

function oldRepo() {
  const root = mkdtempSync(join(tmpdir(), 'migrate-'));
  mkdirSync(join(root, 'raw'));
  writeFileSync(join(root, 'raw/.gitkeep'), '');
  writeFileSync(join(root, 'raw/.DS_Store'), '');
  writeFileSync(join(root, 'raw/DJI_1.MP4'), 'raw');
  const old = join(root, 'videos/old');
  mkdirSync(old, { recursive: true });
  symlinkSync('../../raw/DJI_1.MP4', join(old, 'source.mp4'));
  writeFileSync(join(old, 'transcript.json'), '{"t":1}');
  writeFileSync(join(old, 'metadata.json'), JSON.stringify({ source: 'raw/DJI_1.MP4', duration: 60 }));
  writeFileSync(join(old, 'cut-list.json'), JSON.stringify({ source: 'raw/DJI_1.MP4', speed: 1.2, segments: [
    { sourceStart: 15.1, sourceEnd: 19.66, action: 'move-to-hook' }, { sourceStart: 22.72, sourceEnd: 30.45, action: 'keep' },
  ] }));
  const copy = join(root, 'videos/copy');
  mkdirSync(copy, { recursive: true });
  writeFileSync(join(copy, 'source.mp4'), 'copied');
  mkdirSync(join(root, 'videos/done'), { recursive: true });
  writeFileSync(join(root, 'videos/done/sources.json'), '{"version":1,"sources":[]}');
  mkdirSync(join(root, 'videos/empty'), { recursive: true });
  return root;
}

test('planMigration lists moves and per-project actions', () => {
  const root = oldRepo();
  const plan = planMigration(root);
  assert.deepEqual(plan.moves, [{ name: 'DJI_1.MP4', from: 'raw/DJI_1.MP4', to: 'shared/DJI_1.MP4' }]);
  assert.deepEqual(plan.conflicts, []);
  assert.deepEqual(plan.projects, [
    { slug: 'copy', action: 'project', name: 'source.mp4' },
    { slug: 'done', action: 'skip', reason: 'sources.json exists' },
    { slug: 'empty', action: 'skip', reason: 'no source.mp4' },
    { slug: 'old', action: 'shared', name: 'DJI_1.MP4' },
  ]);
  assert.match(formatPlan(plan), /raw\/DJI_1\.MP4 -> shared\/DJI_1\.MP4/);
  rmSync(root, { recursive: true, force: true });
});

test('applyMigration converts projects and is idempotent', () => {
  const root = oldRepo();
  applyMigration(root, planMigration(root), { probe });
  assert.equal(existsSync(join(root, 'raw')), false);
  assert.equal(readFileSync(join(root, 'shared/DJI_1.MP4'), 'utf8'), 'raw');

  const old = join(root, 'videos/old');
  assert.throws(() => lstatSync(join(old, 'source.mp4')));
  const m = json(join(old, 'sources.json'));
  assert.deepEqual(m.sources.map((s) => [s.id, s.path, s.origin, s.role, s.roleSource, s.probe.duration]), [['s1', '../../shared/DJI_1.MP4', 'shared', 'speech', 'user', 60]]);
  assert.equal(readFileSync(join(old, 'transcripts/s1.json'), 'utf8'), '{"t":1}');
  assert.equal(existsSync(join(old, 'transcript.json')), false);
  const cut = json(join(old, 'cut-list.json'));
  assert.equal(cut.source, undefined);
  assert.deepEqual(cut.segments.map((g) => g.source), ['s1', 's1']);
  assert.deepEqual(json(join(old, 'cut-map.json')).segments.map((g) => [g.outStart, g.outEnd]), [[0, 3.8], [3.8, 10.242]]);
  assert.deepEqual(json(join(old, 'metadata.json')), { duration: 60, sources: 'sources.json' });

  const copy = join(root, 'videos/copy');
  assert.equal(readFileSync(join(copy, 'sources/source.mp4'), 'utf8'), 'copied');
  assert.deepEqual(json(join(copy, 'sources.json')).sources.map((s) => [s.id, s.path, s.origin]), [['s1', 'sources/source.mp4', 'project']]);

  const again = planMigration(root);
  assert.deepEqual(again.moves, []);
  assert.ok(again.projects.every((p) => p.action === 'skip'));
  rmSync(root, { recursive: true, force: true });
});

test('applyMigration refuses to overwrite a shared file', () => {
  const root = oldRepo();
  mkdirSync(join(root, 'shared'));
  writeFileSync(join(root, 'shared/DJI_1.MP4'), 'other');
  const plan = planMigration(root);
  assert.deepEqual(plan.conflicts, ['shared/DJI_1.MP4']);
  assert.throws(() => applyMigration(root, plan, { probe }), /already in shared/);
  assert.equal(readFileSync(join(root, 'raw/DJI_1.MP4'), 'utf8'), 'raw');
  rmSync(root, { recursive: true, force: true });
});
