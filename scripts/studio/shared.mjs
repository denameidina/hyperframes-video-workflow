// Studio shared library shared/: list, usage, guarded delete, streamed upload (ADR-0022, RD-05-04/05).
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { SHARED_DIR, isMedia, kindOf, readManifest } from '../lib/video-sources.mjs';
import { projectSlugs, receiveFile } from './files.mjs';
import { HttpError } from './http.mjs';

const sharedDir = (root) => join(root, SHARED_DIR);

export function sharedPath(root, name) {
  if (typeof name !== 'string' || basename(name) !== name || !isMedia(name)) throw new HttpError(400, 'invalid shared file name');
  const p = join(sharedDir(root), name);
  if (!existsSync(p) || !statSync(p).isFile()) throw new HttpError(404, `shared/${name} not found`);
  return p;
}

// A project whose sources.json cannot be read counts as a user, so a delete never breaks it silently.
export function sharedUsage(root, name) {
  const path = `../../${SHARED_DIR}/${name}`;
  return projectSlugs(root).filter((slug) => {
    try {
      return readManifest(join(root, 'videos', slug)).sources.some((s) => s.origin === 'shared' && s.path === path);
    } catch {
      return true;
    }
  });
}

export async function listShared(root, { probe }) {
  const dir = sharedDir(root);
  if (!existsSync(dir)) return [];
  const items = [];
  for (const name of readdirSync(dir).filter(isMedia).sort()) {
    const file = join(dir, name);
    const st = statSync(file);
    if (!st.isFile()) continue;
    const kind = kindOf(name);
    items.push({ name, kind, size: st.size, mtime: st.mtimeMs, duration: kind === 'video' ? await probe(file, st.mtimeMs) : null, projects: sharedUsage(root, name) });
  }
  return items;
}

export function deleteShared(root, name) {
  const file = sharedPath(root, name);
  const used = sharedUsage(root, name);
  if (used.length) throw new HttpError(409, `shared/${name} is used by ${used.map((s) => `videos/${s}`).join(', ')}; remove it from those projects first`);
  rmSync(file);
  return { name };
}

export const receiveShared = (root, name, stream) => receiveFile(sharedDir(root), SHARED_DIR, name, stream);
