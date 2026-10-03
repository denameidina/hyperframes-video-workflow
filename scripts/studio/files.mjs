// Studio file helpers: upload names, streamed uploads that never overwrite, project listing (ADR-0022).
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { isMedia } from '../lib/video-sources.mjs';
import { SLUG_RE } from '../video.mjs';
import { HttpError } from './http.mjs';

export function safeMediaName(name) {
  const base = basename(String(name ?? '')).normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+/, '').slice(-120);
  if (!isMedia(base)) throw new HttpError(400, 'file must be a video (.mp4 .mov .m4v) or an image (.png .jpg .jpeg .webp)');
  return base;
}

// RD-05-04: stream to <dir>/.<name>.part, rename only after the upload completes, never overwrite.
export async function receiveFile(dir, label, rawName, stream) {
  const name = safeMediaName(rawName);
  mkdirSync(dir, { recursive: true });
  const final = join(dir, name);
  const part = join(dir, `.${name}.part`);
  if (existsSync(final) || existsSync(part)) throw new HttpError(409, `${label}/${name} already exists`);
  try {
    await pipeline(stream, createWriteStream(part, { flags: 'wx' }));
    renameSync(part, final);
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  return name;
}

export function projectSlugs(root) {
  const dir = join(root, 'videos');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => SLUG_RE.test(d) && statSync(join(dir, d)).isDirectory()).sort();
}

// Newest first (RD-05-54). birthtime is the directory's creation time; where a filesystem reports none, ctime stands in.
export function projectsByCreated(root) {
  const dir = join(root, 'videos');
  return projectSlugs(root)
    .map((slug) => {
      const st = statSync(join(dir, slug));
      return { slug, createdAt: st.birthtimeMs > 0 ? st.birthtimeMs : st.ctimeMs };
    })
    .sort((a, b) => b.createdAt - a.createdAt || (a.slug < b.slug ? -1 : 1));
}
