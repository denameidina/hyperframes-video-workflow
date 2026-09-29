import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  formatSources, isMedia, kindOf, nextId, parseProbe, readManifest, removeSource, setSource, syncManifest, writeManifest,
} from './lib/video-sources.mjs';
import { main } from './video.mjs';

const VIDEO_PROBE = { duration: 3, width: 1080, height: 1920, fps: 30, rotation: 0, hasAudio: true };
const fakeProbe = () => {
  const calls = [];
  const probe = (file, kind) => {
    calls.push(file);
    return kind === 'image' ? { width: 10, height: 20 } : { ...VIDEO_PROBE };
  };
  return { probe, calls };
};

function project() {
  const root = mkdtempSync(join(tmpdir(), 'sources-'));
  const dir = join(root, 'videos/demo');
  mkdirSync(join(dir, 'sources'), { recursive: true });
  mkdirSync(join(root, 'shared'));
  return { root, dir, done: () => rmSync(root, { recursive: true, force: true }) };
}

test('kindOf and isMedia', () => {
  assert.equal(kindOf('a.MOV'), 'video');
  assert.equal(kindOf('a.jpeg'), 'image');
  assert.equal(kindOf('a.txt'), null);
  assert.equal(isMedia('.a.mp4.part'), false);
  assert.equal(isMedia('a.webp'), true);
});

test('parseProbe reads a rotated video and an image', () => {
  const video = JSON.stringify({
    streams: [
      { codec_type: 'video', width: 1920, height: 1080, r_frame_rate: '30000/1001', side_data_list: [{ rotation: -90 }] },
      { codec_type: 'audio' },
    ],
    format: { duration: '12.3456' },
  });
  assert.deepEqual(parseProbe(video, 'video'), { duration: 12.346, width: 1920, height: 1080, fps: 29.97, rotation: -90, hasAudio: true });
  const silent = JSON.stringify({ streams: [{ codec_type: 'video', width: 1, height: 2, r_frame_rate: '25/1', tags: { rotate: '90' } }], format: { duration: '1' } });
  assert.equal(parseProbe(silent, 'video').hasAudio, false);
  assert.equal(parseProbe(silent, 'video').rotation, 90);
  assert.deepEqual(parseProbe(JSON.stringify({ streams: [{ codec_type: 'video', width: 4, height: 5 }] }), 'image'), { width: 4, height: 5 });
  assert.throws(() => parseProbe(JSON.stringify({ streams: [] }), 'video'), /no video stream/);
});

test('nextId fills the first free number per prefix', () => {
  assert.equal(nextId([], 'speech'), 's1');
  assert.equal(nextId([{ id: 's1' }, { id: 's3' }], 'speech'), 's2');
  assert.equal(nextId([{ id: 'u1' }], null), 'u2');
  assert.equal(nextId([], 'image'), 'i1');
  assert.equal(nextId([], 'broll'), 'b1');
});

test('readManifest returns an empty manifest and rejects a foreign file', () => {
  const p = project();
  assert.deepEqual(readManifest(p.dir), { version: 1, sources: [] });
  writeFileSync(join(p.dir, 'sources.json'), '{"sources":[]}');
  assert.throws(() => readManifest(p.dir), /version 1/);
  p.done();
});

test('syncManifest adds project files and shared files, then keeps ids, roles, and notes', () => {
  const p = project();
  writeFileSync(join(p.dir, 'sources/take-1.mp4'), 'a');
  writeFileSync(join(p.dir, 'sources/shot.png'), 'b');
  writeFileSync(join(p.root, 'shared/intro.mov'), 'c');
  const { probe, calls } = fakeProbe();
  const m = syncManifest({ dir: p.dir, root: p.root, addShared: ['intro.mov'], probe });
  assert.deepEqual(m.sources.map((s) => [s.id, s.path, s.origin, s.kind, s.role, s.roleSource]), [
    ['i1', 'sources/shot.png', 'project', 'image', 'image', 'detected'],
    ['u1', 'sources/take-1.mp4', 'project', 'video', null, null],
    ['u2', '../../shared/intro.mov', 'shared', 'video', null, null],
  ]);
  assert.equal(calls.length, 3);
  assert.equal(m.sources[1].probe.duration, 3);
  assert.equal(typeof m.sources[1].probe.size, 'number');
  assert.deepEqual(readManifest(p.dir), m);

  setSource(p.dir, 'u1', { role: 'speech', note: 'take utama' });
  const again = syncManifest({ dir: p.dir, root: p.root, probe });
  assert.equal(calls.length, 3, 'unchanged files are not probed again');
  assert.deepEqual(again.sources.find((s) => s.id === 'u1'), { ...m.sources[1], role: 'speech', roleSource: 'user', note: 'take utama' });

  writeFileSync(join(p.dir, 'sources/take-1.mp4'), 'changed');
  utimesSync(join(p.dir, 'sources/take-1.mp4'), new Date(), new Date(Date.now() + 5000));
  syncManifest({ dir: p.dir, root: p.root, probe });
  assert.equal(calls.length, 4, 'a changed file is probed again');

  rmSync(join(p.dir, 'sources/shot.png'));
  assert.deepEqual(syncManifest({ dir: p.dir, root: p.root, probe }).sources.map((s) => s.id), ['u1', 'u2']);
  p.done();
});

test('syncManifest rejects bad or missing shared files', () => {
  const p = project();
  const { probe } = fakeProbe();
  assert.throws(() => syncManifest({ dir: p.dir, root: p.root, addShared: ['../x.mp4'], probe }), /invalid shared file name/);
  assert.throws(() => syncManifest({ dir: p.dir, root: p.root, addShared: ['nope.mp4'], probe }), /shared\/nope\.mp4 not found/);
  writeFileSync(join(p.root, 'shared/gone.mp4'), 'x');
  syncManifest({ dir: p.dir, root: p.root, addShared: ['gone.mp4'], probe });
  rmSync(join(p.root, 'shared/gone.mp4'));
  assert.throws(() => syncManifest({ dir: p.dir, root: p.root, probe }), /u1: \.\.\/\.\.\/shared\/gone\.mp4 is missing/);
  p.done();
});

test('setSource guards roles, detected writes, and notes', () => {
  const p = project();
  writeManifest(p.dir, { version: 1, sources: [
    { id: 'u1', path: 'sources/a.mp4', origin: 'project', kind: 'video', role: null, roleSource: null, note: '' },
    { id: 'i1', path: 'sources/b.png', origin: 'project', kind: 'image', role: 'image', roleSource: 'detected', note: '' },
  ] });
  assert.equal(setSource(p.dir, 'u1', { role: 'broll', by: 'detected' }).roleSource, 'detected');
  assert.equal(setSource(p.dir, 'u1', { role: 'speech' }).roleSource, 'user');
  assert.throws(() => setSource(p.dir, 'u1', { role: 'broll', by: 'detected' }), /set by Dena/);
  assert.deepEqual([setSource(p.dir, 'u1', { role: 'auto' }).role, readManifest(p.dir).sources[0].roleSource], [null, null]);
  assert.throws(() => setSource(p.dir, 'u1', { role: 'image' }), /speech, broll, or auto/);
  assert.throws(() => setSource(p.dir, 'i1', { role: 'speech' }), /always role image/);
  assert.throws(() => setSource(p.dir, 'zz', { role: 'speech' }), /unknown source id "zz"/);
  assert.equal(setSource(p.dir, 'i1', { note: '  logo  ' }).note, 'logo');
  assert.throws(() => setSource(p.dir, 'i1', { note: 'x'.repeat(501) }), /at most 500/);
  p.done();
});

test('removeSource deletes project files and only detaches shared files', () => {
  const p = project();
  writeFileSync(join(p.dir, 'sources/a.mp4'), 'a');
  writeFileSync(join(p.root, 'shared/s.mp4'), 's');
  const { probe } = fakeProbe();
  syncManifest({ dir: p.dir, root: p.root, addShared: ['s.mp4'], probe });
  removeSource(p.dir, 'u1');
  removeSource(p.dir, 'u2');
  assert.equal(existsSync(join(p.dir, 'sources/a.mp4')), false);
  assert.equal(existsSync(join(p.root, 'shared/s.mp4')), true);
  assert.deepEqual(readManifest(p.dir).sources, []);
  assert.throws(() => removeSource(p.dir, 'u1'), /unknown source id/);
  p.done();
});

test('formatSources prints one line per source', () => {
  assert.match(formatSources({ sources: [] }), /no sources yet/);
  const line = formatSources({ sources: [{ id: 's1', role: 'speech', roleSource: 'user', path: 'sources/a.mp4', probe: { duration: 3 }, note: 'hook' }] });
  assert.equal(line, 's1  speech  (user)  sources/a.mp4  3 s  "hook"');
});

test('video sources CLI syncs, attaches shared, and sets roles', () => {
  const p = project();
  writeFileSync(join(p.dir, 'sources/a.mp4'), 'a');
  writeFileSync(join(p.root, 'shared/logo.png'), 'l');
  const probeJson = JSON.stringify({ streams: [{ codec_type: 'video', width: 1080, height: 1920, r_frame_rate: '30/1' }, { codec_type: 'audio' }], format: { duration: '2' } });
  const run = (cmd) => ({ status: cmd === 'ffprobe' ? 0 : 1, stdout: probeJson, stderr: '' });
  main(['sources', 'demo', '--add-shared', 'logo.png'], { run, root: p.root });
  main(['sources', 'demo', '--set', 'u1', '--role', 'speech', '--note', 'take 1'], { run, root: p.root });
  const m = JSON.parse(readFileSync(join(p.dir, 'sources.json'), 'utf8'));
  assert.deepEqual(m.sources.map((s) => [s.id, s.role, s.roleSource, s.note]), [['u1', 'speech', 'user', 'take 1'], ['i1', 'image', 'detected', '']]);
  assert.throws(() => main(['sources', 'demo', '--set', 'u1', '--role', 'broll', '--detected'], { run, root: p.root }), /set by Dena/);
  p.done();
});

test('video sources CLI refuses a missing project', () => {
  const root = mkdtempSync(join(tmpdir(), 'sources-'));
  assert.throws(() => main(['sources', 'nope'], { root }), /videos\/nope not found/);
  rmSync(root, { recursive: true, force: true });
});
