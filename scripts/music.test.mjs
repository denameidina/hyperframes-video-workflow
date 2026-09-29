import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MOODS, addTrack, checkCatalog, listTracks, musicPath, nextTrackId, readCatalog, setRejected, slugify } from './lib/music.mjs';
import { main } from './music.mjs';

function media() {
  return (cmd, args) => {
    if (cmd === 'ffprobe') return { status: 0, stdout: '93.5\n', stderr: '' };
    if (cmd === 'ffmpeg') return { status: 0, stdout: '', stderr: '{\n"input_i" : "-14.20",\n"input_tp" : "-1.00"\n}' };
    return { status: 1, stdout: '', stderr: 'unexpected' };
  };
}
const TRACK = { license: 'cc0', title: 'Quiet Desk', author: 'Someone', source: 'https://freesound.org/s/1/', mood: 'reflektif,tech-ringan', energy: '2' };

function musicRoot() {
  const root = mkdtempSync(join(tmpdir(), 'music-test-'));
  writeFileSync(join(root, 'track.mp3'), 'ID3 fake audio');
  return root;
}

test('ids and slugs', () => {
  assert.equal(slugify('Quiet Désk — Lo-Fi!'), 'quiet-desk-lo-fi');
  assert.equal(nextTrackId([], 'Quiet Desk'), 'm01-quiet-desk');
  assert.equal(nextTrackId([{ id: 'm07-x' }, { id: 'm02-y' }], 'Next'), 'm08-next');
  assert.deepEqual(MOODS, ['reflektif', 'tech-ringan', 'tensi', 'playful', 'sinematik', 'upbeat']);
});

test('addTrack stores a local file with probe, sha, and a license proof', async () => {
  const root = musicRoot();
  const t = await addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, run: media(), now: new Date('2026-09-29T10:00:00Z') });
  assert.deepEqual([t.id, t.file, t.duration, t.lufs, t.contentIdRisk, t.rejected, t.vocals, t.bpm], ['m01-quiet-desk', 'm01-quiet-desk.mp3', 93.5, -14.2, 'none', false, false, null]);
  assert.deepEqual(t.mood, ['reflektif', 'tech-ringan']);
  assert.equal(readFileSync(join(root, 'shared/music/licenses/m01-quiet-desk.txt'), 'utf8').split('\n')[3], 'license: cc0 (https://creativecommons.org/publicdomain/zero/1.0/)');
  assert.deepEqual(readCatalog(root).tracks.map((x) => x.id), ['m01-quiet-desk']);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, run: media() }), /same audio as m01-quiet-desk/);
  assert.deepEqual(readdirSync(join(root, 'shared/music')).filter((f) => f.includes('.part')), []);
});

test('addTrack refuses licenses outside the allowlist and bad input before writing anything', async () => {
  const root = musicRoot();
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, license: 'cc-by', run: media() }), /license "cc-by" is not allowed/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, mood: 'sedih', run: media() }), /--mood must be one or more of/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, energy: '9', run: media() }), /--energy must be an integer 1-5/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, source: 'freesound', run: media() }), /--source must be the http/);
  await assert.rejects(addTrack({ root, input: join(root, 'track.flac'), ...TRACK, run: media() }), /audio must be/);
  assert.equal(existsSync(join(root, 'shared/music')), false);
});

test('addTrack downloads a URL; a failed download leaves no partial file', async () => {
  const root = musicRoot();
  const ok = async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('mp3 bytes').buffer });
  const t = await addTrack({ root, input: 'https://assets.mixkit.co/music/282/282.mp3', ...TRACK, license: 'mixkit', fetchImpl: ok, run: media() });
  assert.equal(t.contentIdRisk, 'unknown');
  assert.equal(readFileSync(join(root, 'shared/music/m01-quiet-desk.mp3'), 'utf8'), 'mp3 bytes');
  const blocked = async () => ({ ok: false, status: 403 });
  await assert.rejects(addTrack({ root, input: 'https://pixabay.com/x.mp3', ...TRACK, license: 'pixabay', title: 'Other', fetchImpl: blocked, run: media() }), /HTTP 403.*download it by hand/);
  assert.deepEqual(readdirSync(join(root, 'shared/music')).filter((f) => f.includes('.part')), []);
  assert.equal(readCatalog(root).tracks.length, 1);
});

test('list hides rejected tracks; check finds missing files, sha mismatches, and missing proofs', async () => {
  const root = musicRoot();
  await addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, run: media() });
  writeFileSync(join(root, 'b.mp3'), 'other audio');
  await addTrack({ root, input: join(root, 'b.mp3'), ...TRACK, title: 'Upbeat One', mood: 'upbeat', energy: '4', run: media() });
  setRejected(root, 'm02-upbeat-one', true);
  assert.deepEqual(listTracks(readCatalog(root)).map((t) => t.id), ['m01-quiet-desk']);
  assert.deepEqual(listTracks(readCatalog(root), { includeRejected: true, mood: 'upbeat' }).map((t) => t.id), ['m02-upbeat-one']);
  assert.deepEqual(listTracks(readCatalog(root), { minDur: 100 }), []);
  assert.deepEqual(checkCatalog(root), []);
  writeFileSync(join(root, 'shared/music/m01-quiet-desk.mp3'), 'changed');
  rmSync(join(root, 'shared/music/licenses/m02-upbeat-one.txt'));
  assert.deepEqual(checkCatalog(root), ['m01-quiet-desk: sha256 does not match m01-quiet-desk.mp3', 'm02-upbeat-one: license proof licenses/m02-upbeat-one.txt is missing']);
  assert.ok(musicPath(root, 'm01-quiet-desk').endsWith('m01-quiet-desk.mp3'));
  assert.throws(() => musicPath(root, 'nope'), /unknown track "nope"/);
});

test('music CLI add, list, check', async () => {
  const root = musicRoot();
  const logs = [];
  const log = (m) => logs.push(m);
  await main(['add', join(root, 'track.mp3'), '--source', TRACK.source, '--license', 'cc0', '--title', 'Quiet Desk', '--author', 'Someone', '--mood', 'reflektif', '--energy', '2'], { root, run: media(), log });
  assert.equal(logs.pop(), 'added m01-quiet-desk (93.5 s, -14.2 LUFS, cc0)');
  await main(['list'], { root, log });
  assert.deepEqual(logs.splice(0), ['m01-quiet-desk\treflektif\tE2\t93.5s\tcc0\tQuiet Desk — Someone', '1 track(s)']);
  await main(['check'], { root, log });
  assert.equal(logs.pop(), 'music check ok (1 tracks)');
  writeFileSync(join(root, 'shared/music/m01-quiet-desk.mp3'), 'x');
  await assert.rejects(main(['check'], { root, log }), /music check failed:\n- m01-quiet-desk: sha256 does not match/);
  await assert.rejects(main(['nope'], { root, log }), /usage: npm run music/);
});

test('a failure after the audio is in place leaves no orphan track', async () => {
  const root = musicRoot();
  // copying a directory as the proof fails after the audio was moved into place (EISDIR on Linux, ENOTSUP on macOS)
  await assert.rejects(addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, proof: root, run: media() }));
  assert.deepEqual(readdirSync(join(root, 'shared/music')).filter((f) => f.endsWith('.mp3')), []);
  assert.deepEqual(readdirSync(join(root, 'shared/music/licenses')), []);
  assert.deepEqual(readCatalog(root).tracks, []);
});

test('check reports a missing file and a license outside the allowlist; musicPath refuses path names', async () => {
  const root = musicRoot();
  await addTrack({ root, input: join(root, 'track.mp3'), ...TRACK, run: media() });
  const cat = readCatalog(root);
  cat.tracks.push({ ...cat.tracks[0], id: 'm02-x', file: 'm02-x.mp3', license: 'cc-by', sha256: 'x' });
  cat.tracks.push({ ...cat.tracks[0], id: 'm03-y', file: '../../track.mp3' });
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify(cat));
  assert.deepEqual(checkCatalog(root), [
    'm02-x: license "cc-by" is not allowed',
    'm02-x: m02-x.mp3 is missing',
    'm03-y: file "../../track.mp3" must be a plain file name',
  ]);
  assert.throws(() => musicPath(root, 'm03-y'), /must be a plain file name/);
});
