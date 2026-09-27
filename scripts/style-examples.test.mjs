// Per-style example hosts (spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md):
// generated hosts are up to date, every composition is in its manifest, every example asset is tracked,
// and the generator lays clips out as documented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHosts, checkManifest, EXAMPLES, hostHtml, layout, PREFIX, readManifest, snapshots, STYLES } from './lib/style-examples.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('layout starts at 0.5 s with 0.5 s gaps; stills become sorted host times', () => {
  const m = { style: 'vox', examples: [
    { clip: 'vx-01-a', duration: 4, treatment: 'cutaway', stills: [1, 3.5] },
    { clip: 'vx-02-b', duration: 6, treatment: 'split', stills: [0.25] },
  ] };
  assert.deepEqual(layout(m).map((e) => e.start), [0.5, 5]);
  assert.deepEqual(snapshots(m).at, [1.5, 4, 5.25]);
});

test('the host slides the base video only for split clips and adds cutout / front layers when asked', () => {
  const html = hostHtml({ style: 'mix-media', examples: [
    { clip: 'mm-01-a', duration: 5, treatment: 'collage', stills: [1], cutout: true, front: true },
    { clip: 'mm-02-b', duration: 4, treatment: 'split', stills: [1] },
  ] });
  assert.match(html, /<video id="mm-01-cut" class="clip cutout sk-sticker-cut" src="assets\/placeholder-cutout\.webm" muted playsinline\s+data-start="0\.5" data-duration="5" data-track-index="6">/);
  assert.match(html, /id="mm-01-a-front-mount" class="broll-front" data-composition-id="mm-01-a-front" data-composition-src="compositions\/mm-01-a-front\.html"\s+data-start="0\.5" data-duration="5" data-track-index="7"/);
  assert.match(html, /tl\.fromTo\('#base-video', \{ y: 0 \}, \{ y: 480, duration: 0\.45, ease: 'power3\.inOut' \}, 6\);/);
  assert.match(html, /tl\.to\('#base-video', \{ y: 0, duration: 0\.45, ease: 'power3\.inOut' \}, 9\.55\);/);
  assert.equal((html.match(/#base-video', \{ y: 0 \}/g) || []).length, 1, 'only the split clip slides the base video');
  assert.match(html, /data-composition-id="style-examples-mix-media" data-start="0" data-width="1080" data-height="1920" data-duration="10"/);
});

test('checkManifest rejects a wrong prefix, an unknown treatment, and stills outside the clip', () => {
  const ok = { clip: 'tx-01-a', duration: 4, treatment: 'cutaway', stills: [1] };
  assert.throws(() => checkManifest({ style: 'broll-text', examples: [{ ...ok, clip: 'mg-01-a' }] }), /starts with "tx-"/);
  assert.throws(() => checkManifest({ style: 'broll-text', examples: [{ ...ok, treatment: 'overlay' }] }), /unknown treatment/);
  assert.throws(() => checkManifest({ style: 'broll-text', examples: [{ ...ok, stills: [4] }] }), /inside the clip/);
  assert.equal(PREFIX['broll-text'], 'tx');
});

test('every style has an example host, and the generated files match (run: npm run style-examples -- build)', () => {
  for (const style of STYLES) assert.ok(readManifest(ROOT, style), `${style}/examples.json is missing`);
  for (const [p, c] of Object.entries(buildHosts(ROOT))) assert.equal(read(p), c, `${p} is stale`);
  assert.ok(!existsSync(join(ROOT, EXAMPLES, 'index.html')), 'the old single host must be gone');
});

test('every composition on disk is in its manifest (clip or -front) and every listed one exists', () => {
  for (const style of STYLES) {
    const m = readManifest(ROOT, style);
    const want = m.examples.flatMap((e) => [e.clip, ...(e.front ? [e.clip + '-front'] : [])]).map((c) => c + '.html').sort();
    const have = readdirSync(join(ROOT, EXAMPLES, style, 'compositions')).filter((f) => f.endsWith('.html')).sort();
    assert.deepEqual(have, want, style);
  }
});

test('every asset an example references exists and is tracked in git', () => {
  const tracked = new Set(execFileSync('git', ['ls-files', EXAMPLES], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));
  for (const style of STYLES) {
    const dir = `${EXAMPLES}/${style}`;
    for (const page of ['index.html', ...readdirSync(join(ROOT, dir, 'compositions')).map((f) => 'compositions/' + f)]) {
      for (const [, ref] of read(`${dir}/${page}`).matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
        assert.ok(tracked.has(`${EXAMPLES}/${ref}`), `${ref} (in ${style}/${page}) is not tracked in git`);
      }
    }
  }
});
