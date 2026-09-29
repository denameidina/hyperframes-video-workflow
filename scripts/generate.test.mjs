import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { briefStub } from './lib/generate.mjs';
import { exampleStill } from './lib/storyboard.mjs';
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
  const media = fakeMedia({ durations: { 'processed-audio.wav': 34.759 } });
  const meta = main(['bgm', 'demo', '--track', 'm01-calm', '--from', '2'], { root, env: {}, run: media.run });
  assert.deepEqual([meta.track, meta.from, meta.copies, meta.gainDb], ['m01-calm', 2, 2, -10]);
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

test('video storyboard renders missing stills, snapshots the sheet, and writes preview/storyboard-sheet.jpg', () => {
  const root = genRoot();
  const { dir } = scaffold({ slug: 'demo', root, generate: true });
  assert.throws(() => main(['storyboard', 'demo'], { root, env: {}, run: fakeMedia().run }), /overlay-timeline\.json not found; the Screen Plan phase writes it first/);
  writeFileSync(join(dir, 'overlay-timeline.json'), JSON.stringify(TIMELINE));
  writeFileSync(join(dir, 'processed-transcript.json'), JSON.stringify({ words: [{ start: 0.2, text: 'Jujur,' }, { start: 3.4, text: '70%' }] }));
  cpSync(join(REPO, 'docs/agents/references/style-examples'), join(root, 'docs/agents/references/style-examples'), { recursive: true });
  mkdirSync(join(root, 'vendor/asset-lib/fonts'), { recursive: true });
  writeFileSync(join(root, 'vendor/gsap.min.js'), '//');
  writeFileSync(join(root, 'vendor/asset-lib/fonts/plus-jakarta-sans-latin-wght-normal.woff2'), 'f');
  mkdirSync(join(root, 'renders/style-examples/whiteboard'), { recursive: true });
  writeFileSync(join(root, 'renders/style-examples/whiteboard/frame-00-at-2.5s.png'), 'wb');
  const mgAt = exampleStill(REPO, 'mg-01-count').at;
    const calls = [];
    const run = (cmd, args, opts = {}) => {
      calls.push([cmd, ...args]);
      if (cmd === 'npx' || cmd === 'node') assert.equal(opts.env?.GEMINI_API_KEY, undefined, 'no frames to Gemini');
      if (cmd === 'node') {
        mkdirSync(join(root, 'renders/style-examples/motion-graphic'), { recursive: true });
        writeFileSync(join(root, `renders/style-examples/motion-graphic/frame-00-at-${mgAt}s.png`), 'mg');
        return { status: 0 };
      }
      if (cmd === 'npx') {
        const out = args[args.indexOf('-o') + 1];
        const tmp = args.at(-1);
        assert.match(readFileSync(join(tmp, 'index.html'), 'utf8'), /<b>2<\/b> 0:03\.0–0:07\.0 · mg-01-count<br \/>70%/);
        assert.equal(readFileSync(join(tmp, 'img/00.png'), 'utf8'), 'wb');
        mkdirSync(out, { recursive: true });
        writeFileSync(join(out, 'frame-00-at-0.5s.png'), 'png');
        return { status: 0 };
      }
      if (cmd === 'ffmpeg') {
        writeFileSync(args.at(-1), 'jpg');
        return { status: 0 };
      }
      return { status: 1 };
    };
    const r = main(['storyboard', 'demo'], { root, env: { GEMINI_API_KEY: 'k' }, run });
    assert.equal(r.scenes, 2);
    assert.equal(readFileSync(join(dir, 'preview/storyboard-sheet.jpg'), 'utf8'), 'jpg');
  assert.deepEqual(calls.filter((c) => c[0] === 'node').map((c) => c.at(-1)), ['motion-graphic'], 'only the style with a missing still is rendered');
});
