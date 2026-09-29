// `video storyboard` (ADR-0025, RD-03-84..86): the Gate 2 sheet for generate mode. Each scene row
// (placement "full") in overlay-timeline.json names the style example it leans on; the sheet shows that
// example's first still with the scene number, time, and spoken words, laid out in HTML and snapshotted
// by hyperframes (this machine's ffmpeg has no drawtext). Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PREFIX, layout, readManifest, snapshots } from './style-examples.mjs';
import { HYPERFRAMES } from '../video.mjs';

export const COLS = 4;
export const PER_SHEET = 28; // 7 rows of 4: a taller page is cut off at 4096 px by the snapshot
const TILE = { w: 240, h: 427, gap: 24, caption: 104 };
const FONT = 'plus-jakarta-sans-latin-wght-normal.woff2';
const STYLE_OF = Object.fromEntries(Object.entries(PREFIX).map(([style, p]) => [p, style]));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function mmss(t) {
  const tenths = Math.round(t * 10);
  return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
}

export function sceneRows(timeline) {
  const rows = (timeline?.elements || []).filter((e) => e.placement === 'full').sort((a, b) => a.start - b.start);
  if (!rows.length) throw new Error('overlay-timeline.json has no scene rows (placement "full")');
  const missing = rows.filter((e) => !e.example).map((e) => e.id);
  if (missing.length) throw new Error(`scene rows without "example" (Screen Plan fills it): ${missing.join(', ')}`);
  return rows;
}

// The example clip's first still: its time in the style's example host, and its place among the host's
// snapshot times (index of total), which is how hyperframes numbers the files.
export function exampleStill(root, clip) {
  const style = STYLE_OF[String(clip).split('-')[0]];
  const m = style && readManifest(root, style);
  const e = m && layout(m).find((x) => x.clip === clip);
  if (!e) throw new Error(`unknown style example "${clip}" (see docs/agents/references/style-examples/<style>/examples.json)`);
  const at = Math.round((e.start + e.stills[0]) * 1000) / 1000;
  const all = snapshots(m).at;
  return { style, clip, at, index: all.indexOf(at), total: all.length };
}

// renders/style-examples/<style>/frame-NN-at-<t.toFixed(1)>s.png from npm run check:style-examples -- <style>.
// Matched by index (the label has one decimal); a set whose size differs from the host's is stale or partial.
export function findFrame(dir, still) {
  if (!existsSync(dir)) return null;
  const frames = readdirSync(dir).map((f) => /^frame-(\d+)-at-([\d.]+)s\.png$/.exec(f)).filter(Boolean);
  if (frames.length !== still.total) return null;
  const hit = frames.find((m) => Number(m[1]) === still.index && Number(m[2]) === Number(still.at.toFixed(1)));
  return hit ? join(dir, hit[0]) : null;
}

export const spokenIn = (words, start, end) => words.filter((w) => w.start >= start && w.start < end).map((w) => w.text).join(' ');

export function sheetHtml(tiles, first = 0) {
  const rows = Math.ceil(tiles.length / COLS);
  const height = TILE.gap + rows * (TILE.h + TILE.caption + TILE.gap);
  const cells = tiles.map((t, i) => `        <div class="tile"><img src="img/${String(i).padStart(2, '0')}.png" /><div class="cap"><b>${first + i + 1}</b> ${esc(t.time)} · ${esc(t.example)}<br />${esc(t.words.length > 60 ? `${t.words.slice(0, 57)}…` : t.words)}</div></div>`).join('\n');
  return { height, html: `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=${height}" />
    <script src="vendor/gsap.min.js"></script>
    <style>
      @font-face { font-family: 'Storyboard Sans'; src: url('fonts/${FONT}') format('woff2'); font-weight: 200 800; }
      html, body { margin: 0; width: 1080px; height: ${height}px; background: #141414; }
      #root { position: relative; width: 1080px; height: ${height}px; overflow: hidden; font-family: 'Storyboard Sans', sans-serif; color: #eee; }
      .grid { position: absolute; left: ${TILE.gap}px; top: ${TILE.gap}px; display: grid; grid-template-columns: repeat(${COLS}, ${TILE.w}px); gap: ${TILE.gap}px; }
      .tile img { display: block; width: ${TILE.w}px; height: ${TILE.h}px; object-fit: cover; border-radius: 8px; background: #000; }
      .cap { margin-top: 6px; height: ${TILE.caption - 12}px; overflow: hidden; font-size: 17px; line-height: 1.25; }
    </style>
  </head>
  <body>
    <main id="root" data-composition-id="storyboard" data-start="0" data-width="1080" data-height="${height}" data-duration="1">
      <div class="grid">
${cells}
      </div>
    </main>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines['storyboard'] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
` };
}

function exec(run, cmd, args, opts = {}) {
  const r = run(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(' ')} failed (exit ${r.status})`);
  return r;
}

export function runStoryboard({ dir, root = '.', run = spawnSync, env = process.env, log = () => {} }) {
  const tlFile = join(dir, 'overlay-timeline.json');
  if (!existsSync(tlFile)) throw new Error(`${tlFile} not found; the Screen Plan phase writes it first`);
  const rows = sceneRows(JSON.parse(readFileSync(tlFile, 'utf8')));
  const words = existsSync(join(dir, 'processed-transcript.json')) ? JSON.parse(readFileSync(join(dir, 'processed-transcript.json'), 'utf8')).words || [] : [];
  const stills = rows.map((e) => exampleStill(root, e.example));
  const childEnv = { ...env };
  delete childEnv.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  delete childEnv.GEMINI_TTS_API_KEY;
  for (const style of new Set(stills.map((s) => s.style))) {
    const frames = join(root, 'renders', 'style-examples', style);
    if (stills.filter((s) => s.style === style).every((s) => findFrame(frames, s))) continue;
    log(`rendering ${style} example stills (npm run check:style-examples -- ${style}) ...`);
    exec(run, 'node', [resolve(root, 'scripts', 'check-style-examples.mjs'), style], { cwd: root, env: childEnv, stdio: 'inherit' });
  }
  const frameOf = (s) => {
    const f = findFrame(join(root, 'renders', 'style-examples', s.style), s);
    if (!f) throw new Error(`no still for ${s.clip} at ${s.at} s in renders/style-examples/${s.style}/ (run npm run check:style-examples -- ${s.style})`);
    return f;
  };
  const tiles = rows.map((e, i) => ({ time: `${mmss(e.start)}–${mmss(e.start + e.duration)}`, example: e.example, words: spokenIn(words, e.start, e.start + e.duration), still: frameOf(stills[i]) }));
  const pages = Array.from({ length: Math.ceil(tiles.length / PER_SHEET) }, (_, p) => tiles.slice(p * PER_SHEET, (p + 1) * PER_SHEET));
  const preview = join(dir, 'preview');
  mkdirSync(preview, { recursive: true });
  for (const f of readdirSync(preview)) if (/^storyboard-sheet(-\d+)?\.jpg$/.test(f)) rmSync(join(preview, f)); // no stale page from a longer plan
  const outs = pages.map((page, p) => {
    const tmp = mkdtempSync(join(tmpdir(), 'storyboard-'));
    try {
      mkdirSync(join(tmp, 'img'));
      mkdirSync(join(tmp, 'fonts'));
      mkdirSync(join(tmp, 'vendor'));
      page.forEach((t, i) => copyFileSync(t.still, join(tmp, 'img', `${String(i).padStart(2, '0')}.png`)));
      copyFileSync(join(root, 'vendor', 'gsap.min.js'), join(tmp, 'vendor', 'gsap.min.js'));
      copyFileSync(join(root, 'vendor', 'asset-lib', 'fonts', FONT), join(tmp, 'fonts', FONT));
      writeFileSync(join(tmp, 'index.html'), sheetHtml(page, p * PER_SHEET).html);
      exec(run, 'npx', ['--yes', HYPERFRAMES, 'snapshot', '--at', '0.5', '-o', join(tmp, 'out'), tmp], { env: childEnv, stdio: 'inherit' });
      const png = join(tmp, 'out', 'frame-00-at-0.5s.png');
      if (!existsSync(png)) throw new Error('hyperframes snapshot wrote no storyboard frame');
      const out = join(preview, pages.length === 1 ? 'storyboard-sheet.jpg' : `storyboard-sheet-${p + 1}.jpg`);
      exec(run, 'ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', `${out}.part.jpg`]);
      renameSync(`${out}.part.jpg`, out);
      return out;
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
  return { outs, scenes: rows.length };
}
