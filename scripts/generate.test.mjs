import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { briefStub } from './lib/generate.mjs';
import { exampleStill } from './lib/storyboard.mjs';
import { readManifest, snapshots } from './lib/style-examples.mjs';
import { main, resolveDuration, scaffold } from './video.mjs';
import { fakeMedia } from './voice-fixtures.mjs';

const REPO = process.cwd();

function genRoot() {
  const root = mkdtempSync(join(tmpdir(), 'generate-test-'));
  for (const t of ['dena-video', 'dena-generate']) {
    mkdirSync(join(root, 'templates', t), { recursive: true });
    writeFileSync(join(root, 'templates', t, 'hyperframes.json'), '{}');
  }
  writeFileSync(join(root, 'templates/dena-video/index.html'), '<main data-duration="__DURATION__">edit __SLUG__</main>');
  writeFileSync(join(root, 'templates/dena-generate/index.html'), readFileSync(join(REPO, 'templates/dena-generate/index.html'), 'utf8'));
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({ version: 1, default: 'st-f2', presets: { 'st-f2': { provider: 'supertonic', voice: 'F2', speed: 1.05 }, recorded: { provider: 'recorded' } } }));
  return root;
}

// ---------- scaffold ----------

test('new --generate scaffolds the generate starter, research/, and a mode: generate brief', () => {
  const root = genRoot();
  const { dir, duration } = scaffold({ slug: 'ai-agent', root, generate: true });
  assert.equal(duration, 10, 'no voiceover yet: placeholder length');
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.match(html, /data-composition-id="dena-ai-agent"/);
  assert.match(html, /src="processed-audio\.wav"/);
  assert.match(html, /src="bgm\.wav"/);
  assert.doesNotMatch(html, /processed\.mp4|__DURATION__|__SLUG__/);
  assert.ok(existsSync(join(dir, 'research')));
  assert.equal(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), briefStub('ai-agent'));
  assert.match(briefStub('x'), /- mode: generate\n/);
  assert.throws(() => scaffold({ slug: 'ai-agent', root, generate: true }), /already exists; generate mode starts a new project/);
  const edit = scaffold({ slug: 'talk', root, duration: '12' });
  assert.equal(readFileSync(join(edit.dir, 'index.html'), 'utf8'), '<main data-duration="12">edit talk</main>');
});

test('resolveDuration reads the time base the mode names', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dur-'));
  writeFileSync(join(dir, 'processed-audio.wav'), 'RIFF');
  const probe = (f) => (f.endsWith('processed-audio.wav') ? 41.2 : assert.fail(`probed ${f}`));
  assert.equal(resolveDuration({ dir, probe, media: 'processed-audio.wav' }), 41.2);
  assert.equal(resolveDuration({ dir, probe }), 10, 'edit mode looks for processed.mp4');
});

// ---------- voice ----------

test('video voice reads script.md with the default preset and writes the edit-path audio and transcript', async () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'demo', root, generate: true });
  await assert.rejects(main(['voice', 'demo'], { root, env: {}, run: fakeMedia().run }), /script\.md not found; the Story phase writes the script first/);
  writeFileSync(join(dir, 'script.md'), '# Naskah\n\nJujur, gue kira gampang.\n\nTernyata susah.\n');
  const media = fakeMedia({ durations: { 'voiceover.wav': 4.35 } });
  const meta = await main(['voice', 'demo'], { root, env: {}, run: media.run });
  assert.equal(meta.preset, 'st-f2');
  assert.equal(readFileSync(join(dir, 'processed-audio.wav'), 'utf8'), 'RIFF');
  const t = JSON.parse(readFileSync(join(dir, 'processed-transcript.json'), 'utf8'));
  assert.deepEqual(t.segments.map((s) => s.text), ['Jujur, gue kira gampang.', 'Ternyata susah.']);
  assert.equal(t.words.length, 6);
  assert.equal((readFileSync(join(dir, 'index.html'), 'utf8').match(/data-duration="4\.35"/g) || []).length, 4);
  await assert.rejects(main(['voice', 'demo', '--preset', 'recorded'], { root, env: {}, run: media.run }), /is a recording; generate mode reads the script with a TTS preset/);
  const cfg = JSON.parse(readFileSync(join(root, 'config/voices.json'), 'utf8'));
  cfg.default = null;
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify(cfg));
  await assert.rejects(main(['voice', 'demo'], { root, env: {}, run: media.run }), /no voice preset: pass --preset/);
  assert.throws(() => main(['voice', 'ghost'], { root, env: {}, run: media.run }), /npm run video -- new ghost --generate/);
});

test('video voice refuses an edit-mode project and runs every child process without Gemini keys', async () => {
  const root = genRoot();
  const edit = scaffold({ slug: 'talk', root, duration: '12' });
  writeFileSync(join(edit.dir, 'script.md'), 'Halo.\n');
  await assert.rejects(main(['voice', 'talk'], { root, env: {}, run: fakeMedia().run }), /not a generate-mode project/);
  const { dir } = scaffold({ slug: 'gen', root, generate: true });
  writeFileSync(join(dir, 'script.md'), 'Jujur, gue kira gampang.\n\nTernyata susah.\n');
  const media = fakeMedia();
  const envs = [];
  const run = (cmd, args, opts = {}) => {
    envs.push(opts.env);
    return media.run(cmd, args, opts);
  };
  await main(['voice', 'gen'], { root, env: { GEMINI_API_KEY: 'a', GEMINI_TTS_API_KEY: 'b', PATH: 'p' }, run });
  assert.ok(envs.length > 3);
  for (const e of envs) assert.deepEqual([e?.GEMINI_API_KEY, e?.GEMINI_TTS_API_KEY, e?.PATH], [undefined, undefined, 'p']);
  assert.deepEqual(readdirSync(dir).filter((f) => f.endsWith('.part')), []);
});

// ---------- bgm ----------

function bgmRoot() {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'demo', root, generate: true });
  mkdirSync(join(root, 'shared/music/licenses'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-calm.mp3'), 'mp3');
  writeFileSync(join(root, 'shared/music/licenses/m01-calm.txt'), 'proof');
  const sha = createHash('sha256').update('mp3').digest('hex');
  const track = { id: 'm01-calm', file: 'm01-calm.mp3', title: 'Calm', author: 'A', sourceUrl: 'https://x/', license: 'cc0', licenseProof: 'licenses/m01-calm.txt', sha256: sha, duration: 20, mood: ['reflektif'], energy: 2, rejected: false };
  const catalog = { version: 1, tracks: [track, { ...track, id: 'm02-no', file: 'm01-calm.mp3', rejected: true }] };
  return { root, dir, catalog };
}

test('video bgm refuses before the voiceover exists, rejected tracks, and a failed check; then writes bgm.wav + bgm.json', () => {
  const { root, dir, catalog } = bgmRoot();
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify(catalog));
  assert.throws(() => main(['bgm', 'demo', '--track', 'm01-calm'], { root, env: {}, run: fakeMedia().run }), /processed-audio\.wav not found; run npm run video -- voice <slug> first/);
  writeFileSync(join(dir, 'processed-audio.wav'), 'RIFF');
  assert.throws(() => main(['bgm', 'demo'], { root, env: {}, run: fakeMedia().run }), /bgm needs --track/);
  assert.throws(() => main(['bgm', 'demo', '--track', 'm02-no'], { root, env: {}, run: fakeMedia().run }), /was rejected in the Studio/);
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify({ ...catalog, tracks: [...catalog.tracks, { ...catalog.tracks[0], id: 'm03-by', license: 'cc-by' }] }));
  assert.throws(() => main(['bgm', 'demo', '--track', 'm03-by'], { root, env: {}, run: fakeMedia().run }), /license "cc-by" is not allowed/);
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify(catalog));
  const media = fakeMedia({ durations: { 'processed-audio.wav': 34.759 } });
  assert.throws(() => main(['bgm', 'demo', '--track', 'm01-calm', '--from', 'x'], { root, env: {}, run: fakeMedia().run }), /--from must be a number of seconds >= 0/);
  assert.throws(() => main(['bgm', 'demo', '--track', 'm01-calm', '--from', '19.5'], { root, env: {}, run: fakeMedia({ durations: { 'processed-audio.wav': 30 } }).run }), /leaves less than 1 s of the track/);
  const broken = fakeMedia({ durations: { 'processed-audio.wav': 30 } });
  const failing = (cmd, args, opts) => (cmd === 'ffmpeg' && !args.includes('null') ? (writeFileSync(args.at(-1), 'half'), { status: 1, stderr: 'boom' }) : broken.run(cmd, args, opts));
  assert.throws(() => main(['bgm', 'demo', '--track', 'm01-calm'], { root, env: {}, run: failing }), /ffmpeg failed/);
  assert.deepEqual(readdirSync(dir).filter((f) => f.startsWith('bgm')), [], 'no bgm.part.wav or bgm.wav after a failed run');
  const meta = main(['bgm', 'demo', '--track', 'm01-calm', '--from', '2'], { root, env: {}, run: media.run });
  assert.deepEqual([meta.track, meta.from, meta.copies, meta.gainDb], ['m01-calm', 2, 3, -10]);
  const measure = media.calls.find((c) => c[0] === 'ffmpeg' && c.includes('null'));
  assert.deepEqual(measure.slice(1, 7), ['-hide_banner', '-nostats', '-ss', '2', '-t', '18']);
  assert.equal(readFileSync(join(dir, 'bgm.wav'), 'utf8'), 'RIFF');
  assert.equal(JSON.parse(readFileSync(join(dir, 'bgm.json'), 'utf8')).sha256, createHash('sha256').update('RIFF').digest('hex'));
  catalog.tracks[0].sha256 = 'nope';
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify(catalog));
  assert.throws(() => main(['bgm', 'demo', '--track', 'm01-calm'], { root, env: {}, run: media.run }), /sha256 does not match.*npm run music -- check/);
});

// ---------- storyboard ----------

const TIMELINE = {
  elements: [
    { id: 'ov-001', type: 'hook-card', track: 5, start: 0, duration: 3, placement: 'top-card' },
    { id: 'ov-003', type: 'motion-graphic', track: 7, start: 3, duration: 4, placement: 'full', example: 'mg-01-count' },
    { id: 'ov-002', type: 'whiteboard', track: 4, start: 0, duration: 3, placement: 'full', example: 'wb-01-flow' },
  ],
};

// the files hyperframes snapshot writes for a style host: frame-NN-at-<t.toFixed(1)>s.png
function writeFrames(root, style) {
  const dir = join(root, 'renders/style-examples', style);
  mkdirSync(dir, { recursive: true });
  snapshots(readManifest(REPO, style)).at.forEach((t, i) => writeFileSync(join(dir, `frame-${String(i).padStart(2, '0')}-at-${t.toFixed(1)}s.png`), style));
}

function storyboardRoot() {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'demo', root, generate: true });
  cpSync(join(REPO, 'docs/agents/references/style-examples'), join(root, 'docs/agents/references/style-examples'), { recursive: true });
  mkdirSync(join(root, 'vendor/asset-lib/fonts'), { recursive: true });
  writeFileSync(join(root, 'vendor/gsap.min.js'), '//');
  writeFileSync(join(root, 'vendor/asset-lib/fonts/plus-jakarta-sans-latin-wght-normal.woff2'), 'f');
  return { root, dir };
}

// fake node / npx / ffmpeg for runStoryboard; node renders the named style's stills
function storyboardRun(root, calls, onPage = () => {}) {
  return (cmd, args, opts = {}) => {
    calls.push([cmd, ...args]);
    if (cmd === 'npx' || cmd === 'node') assert.equal(opts.env?.GEMINI_API_KEY, undefined, 'no frames to Gemini');
    if (cmd === 'node') {
      writeFrames(root, args.at(-1));
      return { status: 0 };
    }
    if (cmd === 'npx') {
      onPage(readFileSync(join(args.at(-1), 'index.html'), 'utf8'));
      mkdirSync(args[args.indexOf('-o') + 1], { recursive: true });
      writeFileSync(join(args[args.indexOf('-o') + 1], 'frame-00-at-0.5s.png'), 'png');
      return { status: 0 };
    }
    if (cmd === 'ffmpeg') {
      writeFileSync(args.at(-1), 'jpg');
      return { status: 0 };
    }
    return { status: 1 };
  };
}

test('video storyboard renders missing stills, snapshots the sheet, and writes preview/storyboard-sheet.jpg', () => {
  const { root, dir } = storyboardRoot();
  assert.throws(() => main(['storyboard', 'demo'], { root, env: {}, run: fakeMedia().run }), /overlay-timeline\.json not found; the Screen Plan phase writes it first/);
  writeFileSync(join(dir, 'overlay-timeline.json'), JSON.stringify(TIMELINE));
  writeFileSync(join(dir, 'processed-transcript.json'), JSON.stringify({ words: [{ start: 0.2, text: 'Jujur,' }, { start: 3.4, text: '70%' }] }));
  writeFrames(root, 'whiteboard');
  const calls = [];
  const pages = [];
  const r = main(['storyboard', 'demo'], { root, env: { GEMINI_API_KEY: 'k' }, run: storyboardRun(root, calls, (html) => pages.push(html)) });
  assert.equal(r.scenes, 2);
  assert.deepEqual(r.outs.map((o) => o.split('/').at(-1)), ['storyboard-sheet.jpg']);
  assert.match(pages[0], /<b>2<\/b> 0:03\.0–0:07\.0 · mg-01-count<br \/>70%/);
  assert.equal(readFileSync(join(dir, 'preview/storyboard-sheet.jpg'), 'utf8'), 'jpg');
  assert.deepEqual(calls.filter((c) => c[0] === 'node').map((c) => c.at(-1)), ['motion-graphic'], 'only the style with a missing still is rendered');
  assert.equal(exampleStill(REPO, 'mg-01-count').style, 'motion-graphic');
});

test('video storyboard splits more than 28 scenes over several sheets and removes stale pages', () => {
  const { root, dir } = storyboardRoot();
  const elements = Array.from({ length: 30 }, (_, i) => ({ id: `ov-${i}`, type: 'broll-text', track: i % 2 ? 7 : 4, start: i * 3, duration: 3, placement: 'full', example: 'tx-07-zoom-grid' }));
  writeFileSync(join(dir, 'overlay-timeline.json'), JSON.stringify({ elements }));
  writeFrames(root, 'broll-text');
  mkdirSync(join(dir, 'preview'), { recursive: true });
  writeFileSync(join(dir, 'preview/storyboard-sheet.jpg'), 'old single sheet');
  const pages = [];
  const r = main(['storyboard', 'demo'], { root, env: {}, run: storyboardRun(root, [], (html) => pages.push(html)) });
  assert.deepEqual(r.outs.map((o) => o.split('/').at(-1)), ['storyboard-sheet-1.jpg', 'storyboard-sheet-2.jpg']);
  assert.equal(existsSync(join(dir, 'preview/storyboard-sheet.jpg')), false);
  assert.equal((pages[0].match(/class="tile"/g) || []).length, 28);
  assert.match(pages[1], /<b>29<\/b> 1:24\.0–1:27\.0 · tx-07-zoom-grid/);
});

test('new --generate --format: the brief names the format; a music format has no separate bgm element', () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'post', root, generate: true, format: 'kinetic-post' });
  assert.match(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), /^- format: kinetic-post$/m);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /bgm\.wav|bgm-audio/);
  assert.match(html, /src="processed-audio\.wav"/);
  assert.match(html, /npm run video -- music/);
  const ex = scaffold({ slug: 'ex', root, generate: true });
  assert.match(readFileSync(join(ex.dir, 'creative-brief.md'), 'utf8'), /^- format: explainer$/m);
  assert.match(readFileSync(join(ex.dir, 'index.html'), 'utf8'), /src="bgm\.wav"/);
  assert.throws(() => scaffold({ slug: 'bad', root, generate: true, format: 'reel' }), /"reel" is not one of/);
  assert.equal(existsSync(join(root, 'videos/bad')), false, 'a bad format creates nothing');
  assert.throws(() => scaffold({ slug: 'edit', root, format: 'kinetic-post' }), /--format needs --generate/);
  main(['new', 'short', '--generate', '--format', 'motion-short'], { root });
  assert.match(readFileSync(join(root, 'videos/short/creative-brief.md'), 'utf8'), /^- format: motion-short$/m);
});

test('video voice and video bgm refuse a music-driven project', async () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'post', root, generate: true, format: 'kinetic-post' });
  writeFileSync(join(dir, 'script.md'), 'BUKAN\n');
  await assert.rejects(main(['voice', 'post'], { root, env: {}, run: fakeMedia().run }), /kinetic-post project: it has no narration/);
  assert.throws(() => main(['bgm', 'post', '--track', 'm01-calm'], { root, env: {}, run: fakeMedia().run }), /kinetic-post project: the music is its only audio/);
});

test('video storyboard shows a row\'s on-screen text when it has one (music formats have no spoken words)', () => {
  const { root, dir } = storyboardRoot();
  writeFileSync(join(dir, 'overlay-timeline.json'), JSON.stringify({ elements: [
    { id: 'ov-001', type: 'broll-text', track: 4, start: 0, duration: 2, placement: 'full', example: 'tx-01-slam', text: 'BUKAN AI-NYA' },
  ] }));
  writeFrames(root, 'broll-text');
  const pages = [];
  main(['storyboard', 'demo'], { root, env: {}, run: storyboardRun(root, [], (html) => pages.push(html)) });
  assert.match(pages[0], /<b>1<\/b> 0:00\.0–0:02\.0 · tx-01-slam<br \/>BUKAN AI-NYA/);
});
