// Project thumbnails for Studio lists (RD-05-55): one JPEG frame from the most finished media of a project,
// cached next to it as videos/<slug>/.studio-thumb.jpg and regenerated when its source changes.
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { readManifest, sourceFile } from '../lib/video-sources.mjs';
import { HttpError } from './http.mjs';
import { projectPath, rendersOf } from './projects.mjs';

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

const frame = (input, out, seek) => new Promise((resolve, reject) => {
  const args = ['-y', '-v', 'error', ...(seek ? ['-ss', String(seek)] : []), '-i', input, '-frames:v', '1', '-vf', 'scale=-2:320', '-q:v', '4', '-f', 'image2', out];
  execFile('ffmpeg', args, { timeout: 30_000 }, (err) => (err ? reject(err) : resolve()));
});

const inflight = new Map();
// Returns the cached thumbnail path, making it first when missing or older than its source; null when the project has no media.
export async function thumbnailPath(root, slug, { make = frame } = {}) {
  projectPath(root, slug);
  const src = thumbSource(root, slug);
  if (!src) return null;
  const out = join(root, 'videos', slug, THUMB_FILE);
  if (existsSync(out) && mtime(out) >= src.mtimeMs) return out;
  const key = `${slug}:${src.mtimeMs}`;
  if (!inflight.has(key)) {
    const tmp = `${out}.${process.pid}.tmp`;
    inflight.set(key, (async () => {
      try {
        try {
          await make(src.file, tmp, src.kind === 'video' ? 1 : 0);
        } catch {
          await make(src.file, tmp, 0); // clips shorter than the seek point
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

// Cache-busting version for list rows: the source's mtime, or null when there is nothing to show.
export const thumbVersion = (root, slug) => thumbSource(root, slug)?.mtimeMs ?? null;
