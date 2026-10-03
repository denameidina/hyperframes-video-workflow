// Project thumbnails for Studio lists (RD-05-55): one JPEG frame from the most finished media of a project,
// cached next to it as videos/<slug>/.studio-thumb.jpg and regenerated when its source changes.
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { readManifest, sourceFile } from '../lib/video-sources.mjs';
import { HttpError } from './http.mjs';
import { projectPath, rendersOf } from './projects.mjs';
import { renderPath } from './results.mjs';

export const THUMB_FILE = '.studio-thumb.jpg';
const mtime = (f) => {
  try {
    return statSync(f).mtimeMs;
  } catch {
    return 0;
  }
};

// Newest render, else the cut (processed.mp4), else the first video source, else the first image source.
export function thumbSource(root, slug) {
  const dir = join(root, 'videos', slug);
  const renders = rendersOf(root, slug).map((f) => join(dir, 'renders', f)).sort((a, b) => mtime(b) - mtime(a));
  const candidates = [renders[0], join(dir, 'processed.mp4')];
  try {
    const sources = readManifest(dir).sources;
    for (const kind of ['video', 'image']) {
      const s = sources.find((x) => x.kind === kind);
      if (s) candidates.push(sourceFile(dir, s));
    }
  } catch {
    // an unreadable manifest just means no source fallback
  }
  const file = candidates.find((f) => f && mtime(f) > 0);
  return file ? { file, mtimeMs: mtime(file), kind: ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(file).toLowerCase()) ? 'image' : 'video' } : null;
}

const frame = (input, out, seek, height = 320) => new Promise((resolve, reject) => {
  const args = ['-y', '-v', 'error', ...(seek ? ['-ss', String(seek)] : []), '-i', input, '-frames:v', '1', '-vf', `scale=-2:${height}`, '-q:v', '4', '-f', 'image2', out];
  execFile('ffmpeg', args, { timeout: 30_000 }, (err) => (err ? reject(err) : resolve()));
});

const inflight = new Map();
// At most 3 ffmpeg runs at once: the first Hasil page asks for every poster together.
let active = 0;
const waiting = [];
async function slot(fn) {
  if (active >= 3) await new Promise((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}
// One JPEG frame of `src` cached at `out`, made when missing or older than the source; concurrent calls share one ffmpeg run.
async function cachedFrame(src, out, { make, height }) {
  if (existsSync(out) && mtime(out) >= src.mtimeMs) return out;
  const key = `${out}:${src.mtimeMs}`;
  if (!inflight.has(key)) {
    const tmp = `${out}.${process.pid}.tmp`;
    inflight.set(key, (async () => {
      try {
        try {
          await slot(() => make(src.file, tmp, src.kind === 'video' ? 1 : 0, height));
        } catch {
          await slot(() => make(src.file, tmp, 0, height)); // clips shorter than the seek point
        }
        renameSync(tmp, out);
      } catch (e) {
        rmSync(tmp, { force: true });
        throw new HttpError(500, `thumbnail failed: ${e.message}`);
      } finally {
        inflight.delete(key);
      }
    })());
  }
  await inflight.get(key);
  return out;
}

// Returns the cached thumbnail path; null when the project has no media.
export async function thumbnailPath(root, slug, { make = frame } = {}) {
  projectPath(root, slug);
  const src = thumbSource(root, slug);
  return src ? cachedFrame(src, join(root, 'videos', slug, THUMB_FILE), { make, height: 320 }) : null;
}

// Poster of one render (RD-05-59): a larger frame of that exact file, cached beside it as renders/.<name>.poster.jpg
// (rendersOf lists only visible .mp4 files, so the cache never shows up as a render).
export async function posterPath(root, slug, file, { make = frame } = {}) {
  const video = renderPath(root, slug, file); // 404 unless it is one of the project's renders
  const src = { file: video, mtimeMs: mtime(video), kind: 'video' };
  return cachedFrame(src, join(root, 'videos', slug, 'renders', `.${file}.poster.jpg`), { make, height: 720 });
}

// Cache-busting version for list rows: the source's mtime, or null when there is nothing to show.
export const thumbVersion = (root, slug) => thumbSource(root, slug)?.mtimeMs ?? null;
