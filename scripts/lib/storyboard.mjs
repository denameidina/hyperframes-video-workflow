// Actual project storyboard evidence (RD-03-103/106). Library stills are an explicitly labelled
// reference-only mode and never become production design evidence. Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { PREFIX, layout, readManifest, snapshots } from './style-examples.mjs';
import { HYPERFRAMES } from '../video.mjs';

export const COLS = 4;
export const PER_SHEET = 28; // 7 rows of 4: a taller page is cut off at 4096 px by the snapshot
export const EVIDENCE_FILE = 'preview/storyboard-evidence.json';
const TILE = { w: 240, h: 427, gap: 24, caption: 104 };
const FONT = 'plus-jakarta-sans-latin-wght-normal.woff2';
const STYLE_OF = Object.fromEntries(Object.entries(PREFIX).map(([style, p]) => [p, style]));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function mmss(t) {
  const tenths = Math.round(t * 10);
  return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
}

export function sceneRows(timeline, { referenceOnly = false } = {}) {
  const rows = (timeline?.elements || []).filter((e) => e.placement === 'full').sort((a, b) => a.start - b.start);
  if (!rows.length) throw new Error('overlay-timeline.json has no scene rows (placement "full")');
  const missing = rows.filter((e) => !e.example).map((e) => e.id);
  if (referenceOnly && missing.length) throw new Error(`scene rows without "example" (Screen Plan fills it): ${missing.join(', ')}`);
  return rows;
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const decodedImages = new WeakMap();
function requireDecodedImage(file, hash, run, env) {
  let cache = decodedImages.get(run);
  if (cache?.has(hash)) return;
  exec(run, 'ffmpeg', ['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', file, '-frames:v', '1', '-f', 'null', '-'], env ? { env } : {});
  if (sha256(readFileSync(file)) !== hash) throw new Error('image changed during decode');
  if (!cache) { cache = new Set(); decodedImages.set(run, cache); }
  cache.add(hash);
}

function localImage(dir, row) {
  const name = row.storyboardFrame;
  const fail = (why) => { throw new Error(`${row.id}: storyboardFrame ${why}; Screen Plan supplies an actual project-local PNG, JPEG or WebP`); };
  if (typeof name !== 'string' || !name.trim() || isAbsolute(name)) fail('must be a relative path');
  const project = realpathSync(dir);
  const file = resolve(project, name);
  const within = (p) => { const rel = relative(project, p); return rel && !rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel); };
  if (!within(file)) fail('escapes the project');
  let bytes;
  try {
    if (!within(realpathSync(file))) fail('resolves outside the project');
    if (!statSync(file).isFile()) fail('must be a regular image file');
    bytes = readFileSync(file);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') fail('is missing');
    throw e;
  }
  const png = bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
  const jpeg = bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  const webp = bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpeg && !webp) fail('is not a supported image');
  return { id: row.id, path: relative(project, file).split(sep).join('/'), file, sha256: sha256(bytes) };
}

// Readiness validates all linked bytes, not just the presence of an old sheet. The manifest is written
// only after the sheet succeeds; any scene/timeline/sheet change requires regenerating the evidence.
export function inspectStoryboardEvidence(dir, { run = spawnSync } = {}) {
  const missing = (message) => ({ ready: false, code: 'missing-file', message });
  const stale = (message) => ({ ready: false, code: 'stale-evidence', message });
  if (!existsSync(join(dir, EVIDENCE_FILE))) return missing(`${EVIDENCE_FILE} is required; migrate legacy example sheets with actual storyboardFrame images`);
  try {
    const evidence = JSON.parse(readFileSync(join(dir, EVIDENCE_FILE), 'utf8'));
    if (evidence?.version !== 1 || evidence.kind !== 'actual' || !Array.isArray(evidence.frames) || !Array.isArray(evidence.sheets) || !evidence.sheets.length) return stale('storyboard evidence must be version 1 actual scene evidence');
    const timeline = readFileSync(join(dir, 'overlay-timeline.json'));
    if (sha256(timeline) !== evidence.timelineSha256) return stale('overlay-timeline.json changed; regenerate actual storyboard evidence');
    const frames = sceneRows(JSON.parse(timeline)).map((row) => localImage(dir, row));
    if (frames.length !== evidence.frames.length || frames.some((frame, i) => ['id', 'path', 'sha256'].some((key) => frame[key] !== evidence.frames[i]?.[key]))) return stale('actual storyboard frames changed; regenerate the sheet');
    for (const frame of frames) requireDecodedImage(frame.file, frame.sha256, run);
    const names = readdirSync(join(dir, 'preview')).filter((name) => /^storyboard-sheet(-\d+)?\.jpg$/.test(name)).sort().map((name) => `preview/${name}`);
    if (JSON.stringify(names) !== JSON.stringify(evidence.sheets.map((sheet) => sheet.path).sort())) return stale('actual storyboard sheet set changed or is incomplete');
    for (const sheet of evidence.sheets) {
      if (!/^preview\/storyboard-sheet(-\d+)?\.jpg$/.test(sheet.path)) return stale('invalid actual storyboard sheet path');
      const st = statSync(join(dir, sheet.path));
      if (!st.isFile() || !st.size) return stale('actual storyboard sheet is empty or not a regular file');
      const bytes = readFileSync(join(dir, sheet.path));
      if (bytes[0] !== 255 || bytes[1] !== 216) return stale('actual storyboard sheet must be an intact JPEG image');
      if (sha256(bytes) !== sheet.sha256) return stale('actual storyboard sheet changed; regenerate the evidence');
      requireDecodedImage(join(dir, sheet.path), sheet.sha256, run);
    }
    return { ready: true, frames: frames.map(({ file, ...frame }) => frame), sheets: names };
  } catch (e) {
    return stale(`actual storyboard evidence is incomplete or invalid: ${e.message}`);
  }
}

// One still of the example clip (n is 1-based, default the first; a scene row picks another with
// "exampleStill"): its time in the style's example host, and its place among the host's snapshot times
// (index of total), which is how hyperframes numbers the files.
export function exampleStill(root, clip, n = 1) {
  const style = STYLE_OF[String(clip).split('-')[0]];
  const m = style && readManifest(root, style);
  const e = m && layout(m).find((x) => x.clip === clip);
  if (!e) throw new Error(`unknown style example "${clip}" (see docs/agents/references/style-examples/<style>/examples.json)`);
  if (!Number.isInteger(n) || n < 1 || n > e.stills.length) throw new Error(`${clip} has ${e.stills.length} stills; exampleStill ${n} is out of range`);
  const at = Math.round((e.start + e.stills[n - 1]) * 1000) / 1000;
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

export function sheetHtml(tiles, first = 0, { referenceOnly = false, actual = false } = {}) {
  const rows = Math.ceil(tiles.length / COLS);
  const header = referenceOnly || actual ? 40 : 0;
  const height = TILE.gap + header + rows * (TILE.h + TILE.caption + TILE.gap);
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
      .label { position: absolute; left: 24px; top: 14px; font-size: 20px; font-weight: 700; }
      .grid { position: absolute; left: ${TILE.gap}px; top: ${TILE.gap + header}px; display: grid; grid-template-columns: repeat(${COLS}, ${TILE.w}px); gap: ${TILE.gap}px; }
      .tile img { display: block; width: ${TILE.w}px; height: ${TILE.h}px; object-fit: cover; border-radius: 8px; background: #000; }
      .cap { margin-top: 6px; height: ${TILE.caption - 12}px; overflow: hidden; font-size: 17px; line-height: 1.25; }
    </style>
  </head>
  <body>
    <main id="root" data-composition-id="storyboard" data-start="0" data-width="1080" data-height="${height}" data-duration="1">
      ${header ? `<div class="label">${referenceOnly ? 'REFERENCE ONLY · NOT DESIGN APPROVAL' : 'ACTUAL SCENE · PROJECT STORYBOARD'}</div>` : ''}
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

export function runStoryboard({ dir, root = '.', run = spawnSync, env = process.env, log = () => {}, referenceOnly = false }) {
  const tlFile = join(dir, 'overlay-timeline.json');
  if (!existsSync(tlFile)) throw new Error(`${tlFile} not found; the Screen Plan phase writes it first`);
  const timelineBytes = readFileSync(tlFile);
  const timelineSha256 = sha256(timelineBytes);
  const rows = sceneRows(JSON.parse(timelineBytes), { referenceOnly });
  const words = existsSync(join(dir, 'processed-transcript.json')) ? JSON.parse(readFileSync(join(dir, 'processed-transcript.json'), 'utf8')).words || [] : [];
  const frames = referenceOnly ? [] : rows.map((row) => localImage(dir, row));
  const stills = referenceOnly ? rows.map((e) => exampleStill(root, e.example, e.exampleStill ?? 1)) : [];
  const childEnv = { ...env };
  delete childEnv.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  delete childEnv.GEMINI_TTS_API_KEY;
  for (const frame of frames) {
    try {
      requireDecodedImage(frame.file, frame.sha256, run, childEnv);
    } catch {
      throw new Error(`${frame.id}: storyboardFrame failed image decode; Screen Plan supplies an intact local scene image`);
    }
  }
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
  const tiles = rows.map((e, i) => ({ time: `${mmss(e.start)}–${mmss(e.start + e.duration)}`, example: referenceOnly ? e.example : `${e.id}${e.example ? ` (reference: ${e.example})` : ''}`, words: typeof e.text === 'string' ? e.text : spokenIn(words, e.start, e.start + e.duration), still: referenceOnly ? frameOf(stills[i]) : frames[i].file }));
  const pages = Array.from({ length: Math.ceil(tiles.length / PER_SHEET) }, (_, p) => tiles.slice(p * PER_SHEET, (p + 1) * PER_SHEET));
  const preview = join(dir, 'preview');
  mkdirSync(preview, { recursive: true });
  const prefix = referenceOnly ? 'storyboard-reference-sheet' : 'storyboard-sheet';
  for (const f of readdirSync(preview)) if (new RegExp(`^${prefix}(-\\d+)?\\.jpg$`).test(f)) rmSync(join(preview, f)); // keep the other mode's output
  const outs = pages.map((page, p) => {
    const tmp = mkdtempSync(join(tmpdir(), 'storyboard-'));
    try {
      mkdirSync(join(tmp, 'img'));
      mkdirSync(join(tmp, 'fonts'));
      mkdirSync(join(tmp, 'vendor'));
      page.forEach((t, i) => copyFileSync(t.still, join(tmp, 'img', `${String(i).padStart(2, '0')}.png`)));
      copyFileSync(join(root, 'vendor', 'gsap.min.js'), join(tmp, 'vendor', 'gsap.min.js'));
      copyFileSync(join(root, 'vendor', 'asset-lib', 'fonts', FONT), join(tmp, 'fonts', FONT));
      writeFileSync(join(tmp, 'index.html'), sheetHtml(page, p * PER_SHEET, { referenceOnly, actual: !referenceOnly }).html);
      exec(run, 'npx', ['--yes', HYPERFRAMES, 'snapshot', '--at', '0.5', '-o', join(tmp, 'out'), tmp], { env: childEnv, stdio: 'inherit' });
      const png = join(tmp, 'out', 'frame-00-at-0.5s.png');
      if (!existsSync(png)) throw new Error('hyperframes snapshot wrote no storyboard frame');
      const out = join(preview, pages.length === 1 ? `${prefix}.jpg` : `${prefix}-${p + 1}.jpg`);
      exec(run, 'ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', `${out}.part.jpg`]);
      renameSync(`${out}.part.jpg`, out);
      return out;
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
  if (!referenceOnly) {
    if (sha256(readFileSync(tlFile)) !== timelineSha256) throw new Error('timeline changed during storyboard generation; regenerate from the new Screen Plan');
    if (frames.some((frame) => sha256(readFileSync(frame.file)) !== frame.sha256)) throw new Error('scene frame changed during storyboard generation; regenerate from the new Screen Plan');
    const evidence = { version: 1, kind: 'actual', timelineSha256, frames: frames.map(({ file, ...frame }) => frame), sheets: outs.map((out) => ({ path: relative(dir, out).split(sep).join('/'), sha256: sha256(readFileSync(out)) })) };
    for (const sheet of evidence.sheets) {
      const bytes = readFileSync(join(dir, sheet.path));
      if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('completed storyboard sheet is not a JPEG image');
      requireDecodedImage(join(dir, sheet.path), sheet.sha256, run, childEnv);
    }
    writeFileSync(join(dir, `${EVIDENCE_FILE}.part`), `${JSON.stringify(evidence, null, 2)}\n`);
    renameSync(join(dir, `${EVIDENCE_FILE}.part`), join(dir, EVIDENCE_FILE));
  }
  return { outs, scenes: rows.length, referenceOnly };
}
