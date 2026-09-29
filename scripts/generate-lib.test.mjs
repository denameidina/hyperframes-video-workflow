import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { BGM, bgmArgs, bgmCopies, bgmGain } from './lib/bgm.mjs';
import { briefStub, syncDuration, transcriptFromVoice } from './lib/generate.mjs';
import { PER_SHEET, exampleStill, findFrame, mmss, sceneRows, sheetHtml, spokenIn } from './lib/storyboard.mjs';
import { readManifest, snapshots } from './lib/style-examples.mjs';

const REPO = process.cwd();

test('briefStub starts a generate-mode brief', () => {
  assert.match(briefStub('x'), /^# Creative Brief - x\n/);
  assert.match(briefStub('x'), /- mode: generate\n/);
});

test('syncDuration rewrites data-duration only on elements marked data-voice-duration', () => {
  const html = '<main id="root" data-duration="10" data-voice-duration><audio id="v" data-start="0" data-duration="10" data-voice-duration></audio><div id="cap" data-duration="1.3"></div></main>';
  assert.equal(syncDuration(html, 42.5), '<main id="root" data-duration="42.5" data-voice-duration><audio id="v" data-start="0" data-duration="42.5" data-voice-duration></audio><div id="cap" data-duration="1.3"></div></main>');
  const starter = readFileSync(join(REPO, 'templates/dena-generate/index.html'), 'utf8').replaceAll('__SLUG__', 'x').replaceAll('__DURATION__', '10');
  const synced = syncDuration(starter, 33.3);
  assert.equal((synced.match(/data-duration="33\.3"/g) || []).length, 4, 'root, voice audio, bgm audio, progress');
  assert.throws(() => syncDuration(html, 0), /duration must be > 0/);
});

test('transcriptFromVoice writes the edit-path processed-transcript schema', () => {
  const t = transcriptFromVoice({ meta: { provider: 'supertonic', model: null, voice: 'F2', paragraphs: [{ hash: 'h', text: 'Halo semua.', start: 0, end: 1.2, cached: false }] }, words: [{ text: 'Halo', start: 0.1, end: 0.5, matched: true }, { text: 'semua.', start: 0.5, end: 1.2, matched: true }] });
  assert.deepEqual(t, { source: 'voice/voiceover.wav', model: 'supertonic/-/F2', language: 'id', note: 'generate mode: words from voice/words.json (script spelling, whisper DTW times)', segments: [{ start: 0, end: 1.2, text: 'Halo semua.' }], words: [{ start: 0.1, end: 0.5, text: 'Halo' }, { start: 0.5, end: 1.2, text: 'semua.' }] });
});

test('transcriptFromVoice ends the last word of a paragraph at the paragraph end, not in the gap', () => {
  const meta = { provider: 'supertonic', voice: 'F2', paragraphs: [{ text: 'Satu dua.', start: 0, end: 1.0 }, { text: 'Tiga.', start: 1.35, end: 2.0 }] };
  // alignment stretches a word to the next word's start, across the 0.35 s pause between paragraphs
  const words = [{ text: 'Satu', start: 0.1, end: 0.5 }, { text: 'dua.', start: 0.5, end: 1.4 }, { text: 'Tiga.', start: 1.4, end: 2.0 }];
  assert.deepEqual(transcriptFromVoice({ meta, words }).words.map((w) => w.end), [0.5, 1.0, 2.0]);
});

test('bgmCopies, bgmGain, and bgmArgs build one deterministic ffmpeg call', () => {
  assert.equal(bgmCopies({ trackDuration: 120, from: 5, duration: 60 }), 1);
  assert.equal(bgmCopies({ trackDuration: 60, from: 0, duration: 59.5 }), 2, 'too close to the end: a spare copy guards against a short mp3');
  assert.equal(bgmCopies({ trackDuration: 20, from: 2, duration: 34.76 }), 3);
  assert.equal(bgmCopies({ trackDuration: 20, from: 0, duration: 80 }), 6);
  assert.throws(() => bgmCopies({ trackDuration: 20, from: 19.5, duration: 30 }), /leaves less than 1 s/);
  assert.equal(bgmGain(-12.02), -17.98);
  assert.equal(bgmGain(-70), 20);
  assert.equal(bgmGain(null), 0);
  const a = bgmArgs({ track: 't.mp3', from: 2, copies: 2, voice: 'v.wav', duration: 34.759, gainDb: -17.98, out: 'o.wav' });
  assert.deepEqual(a.slice(0, 11), ['-y', '-loglevel', 'error', '-ss', '2', '-i', 't.mp3', '-i', 't.mp3', '-i', 'v.wav']);
  const graph = a[a.indexOf('-filter_complex') + 1].split(';');
  assert.equal(graph[2], '[t0][t1]acrossfade=d=1:c1=tri:c2=tri[x1]');
  assert.equal(graph[3], '[x1]atrim=0:34.759,asetpts=PTS-STARTPTS,volume=-17.98dB,afade=t=in:d=0.5,afade=t=out:st=33.259:d=1.5,apad[bg]');
  assert.equal(graph[4], '[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,apad[key]');
  assert.equal(graph[5], `[bg][key]sidechaincompress=threshold=${BGM.duck.threshold}:ratio=${BGM.duck.ratio}:attack=${BGM.duck.attack}:release=${BGM.duck.release},atrim=0:34.759[out]`);
  assert.deepEqual(a.slice(-9), ['-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', 'o.wav']);
});

const TIMELINE = {
  elements: [
    { id: 'ov-001', type: 'hook-card', track: 5, start: 0, duration: 3, placement: 'top-card' },
    { id: 'ov-003', type: 'motion-graphic', track: 7, start: 3, duration: 4, placement: 'full', example: 'mg-01-count' },
    { id: 'ov-002', type: 'whiteboard', track: 4, start: 0, duration: 3, placement: 'full', example: 'wb-01-flow' },
  ],
};

test('sceneRows keeps full-frame scenes in time order and names rows without an example', () => {
  assert.deepEqual(sceneRows(TIMELINE).map((e) => e.id), ['ov-002', 'ov-003']);
  assert.throws(() => sceneRows({ elements: [{ id: 'ov-009', placement: 'full', start: 0 }] }), /without "example" \(Screen Plan fills it\): ov-009/);
  assert.throws(() => sceneRows({ elements: [] }), /no scene rows/);
});

// the files hyperframes snapshot writes for a style host: frame-NN-at-<t.toFixed(1)>s.png
function writeFrames(dir, style) {
  const { at } = snapshots(readManifest(REPO, style));
  at.forEach((t, i) => writeFileSync(join(dir, `frame-${String(i).padStart(2, '0')}-at-${t.toFixed(1)}s.png`), `${style}:${i}`));
  return at;
}

test('exampleStill finds the snapshot index of an example\'s first still; findFrame matches it by index', () => {
  const total = snapshots(readManifest(REPO, 'whiteboard')).at.length;
  assert.deepEqual(exampleStill(REPO, 'wb-01-flow'), { style: 'whiteboard', clip: 'wb-01-flow', at: 2.5, index: 0, total });
  assert.throws(() => exampleStill(REPO, 'wb-99-nope'), /unknown style example "wb-99-nope"/);
  const d = mkdtempSync(join(tmpdir(), 'frames-'));
  writeFrames(d, 'broll-text');
  const zoom = exampleStill(REPO, 'tx-07-zoom-grid');
  assert.equal(zoom.at, 34.45, 'two decimals: the file says 34.5');
  assert.equal(basename(findFrame(d, zoom)), `frame-${String(zoom.index).padStart(2, '0')}-at-34.5s.png`);
  assert.equal(findFrame(join(d, 'missing'), zoom), null);
  const partial = mkdtempSync(join(tmpdir(), 'frames-'));
  writeFileSync(join(partial, `frame-${String(zoom.index).padStart(2, '0')}-at-34.5s.png`), 'p');
  assert.equal(findFrame(partial, zoom), null, 'an incomplete or stale set is rendered again');
});

test('exampleStill picks a later still by its 1-based number (a scene row\'s exampleStill)', () => {
  const second = exampleStill(REPO, 'tx-07-zoom-grid', 2);
  assert.equal(second.at, 37.9);
  assert.equal(second.index, exampleStill(REPO, 'tx-07-zoom-grid').index + 1);
  assert.throws(() => exampleStill(REPO, 'tx-07-zoom-grid', 3), /tx-07-zoom-grid has 2 stills; exampleStill 3 is out of range/);
  assert.throws(() => exampleStill(REPO, 'tx-07-zoom-grid', 0), /out of range/);
});

test('mmss rounds to tenths without printing 60 seconds', () => {
  assert.equal(mmss(3), '0:03.0');
  assert.equal(mmss(59.96), '1:00.0');
  assert.equal(mmss(75.34), '1:15.3');
  assert.equal(PER_SHEET, 28);
});

test('sheetHtml lays tiles out in a 4-column grid with escaped labels', () => {
  const { height, html } = sheetHtml([{ time: '0:00.0–0:03.0', example: 'wb-01-flow', words: 'Jujur, gue <kira>' }, { time: '0:03.0–0:07.0', example: 'mg-01-count', words: 'x'.repeat(80) }]);
  assert.equal(height, 24 + 1 * (427 + 104 + 24));
  assert.match(html, /<b>1<\/b> 0:00\.0–0:03\.0 · wb-01-flow<br \/>Jujur, gue &lt;kira&gt;/);
  assert.match(html, /x{57}…/);
  assert.match(sheetHtml([{ time: 't', example: 'e', words: 'w' }], 28).html, /<img src="img\/00\.png" \/><div class="cap"><b>29<\/b>/, 'numbers continue on the next sheet');
  assert.equal(spokenIn([{ start: 0.1, text: 'a' }, { start: 2.9, text: 'b' }, { start: 3, text: 'c' }], 0, 3), 'a b');
});
