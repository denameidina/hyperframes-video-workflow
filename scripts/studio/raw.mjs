// Studio raw library: list, streamed upload, project linkage, cascade hard delete (ADR-0020).
// A project belongs to a raw video when videos/<slug>/source.mp4 resolves to that raw file.
import { createWriteStream, existsSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { SLUG_RE } from '../video.mjs';
import { HttpError } from './http.mjs';

export const VIDEO_EXT = ['.mp4', '.mov', '.m4v'];
const isVideo = (n) => !n.startsWith('.') && VIDEO_EXT.includes(extname(n).toLowerCase());
const rawDir = (root) => join(root, 'raw');
const real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
};

export function safeUploadName(name) {
  const base = basename(String(name ?? '')).normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+/, '').slice(-120);
  if (!isVideo(base)) throw new HttpError(400, 'file must be .mp4, .mov, or .m4v');
  return base;
}

export function rawPath(root, name) {
  if (typeof name !== 'string' || basename(name) !== name || !isVideo(name)) throw new HttpError(400, 'invalid raw name');
  const p = join(rawDir(root), name);
  if (!existsSync(p) || !statSync(p).isFile()) throw new HttpError(404, `raw/${name} not found`);
  return p;
}

export function projectSlugs(root) {
  const dir = join(root, 'videos');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => SLUG_RE.test(d) && statSync(join(dir, d)).isDirectory()).sort();
}

export function projectRaw(root, slug) {
  const src = real(join(root, 'videos', slug, 'source.mp4'));
  if (!src || dirname(src) !== real(rawDir(root))) return null;
  return basename(src);
}

export const linkedProjects = (root, name) => projectSlugs(root).filter((slug) => projectRaw(root, slug) === name);

export function rendersOf(root, slug) {
  if (!SLUG_RE.test(slug)) throw new HttpError(400, 'invalid slug');
  const dir = join(root, 'videos', slug, 'renders');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => !f.startsWith('.') && extname(f).toLowerCase() === '.mp4').sort();
}

export async function listRaw(root, { probe }) {
  const dir = rawDir(root);
  if (!existsSync(dir)) return [];
  const items = [];
  for (const name of readdirSync(dir).filter(isVideo).sort()) {
    const file = join(dir, name);
    const st = statSync(file);
    if (!st.isFile()) continue;
    items.push({ name, size: st.size, mtime: st.mtimeMs, duration: await probe(file, st.mtimeMs), projects: linkedProjects(root, name) });
  }
  return items;
}

export function deletePlan(root, name) {
  rawPath(root, name);
  return { raw: name, projects: linkedProjects(root, name).map((slug) => ({ slug, renders: rendersOf(root, slug) })) };
}

// Callers kill the linked tmux sessions first (RD-05-05).
export function deleteRawCascade(root, name) {
  const plan = deletePlan(root, name);
  for (const { slug } of plan.projects) rmSync(join(root, 'videos', slug), { recursive: true, force: true });
  rmSync(join(rawDir(root), name));
  return plan;
}

export async function receiveUpload(root, rawName, stream) {
  const name = safeUploadName(rawName);
  const dir = rawDir(root);
  mkdirSync(dir, { recursive: true });
  const final = join(dir, name);
  const part = join(dir, `.${name}.part`);
  if (existsSync(final) || existsSync(part)) throw new HttpError(409, `raw/${name} already exists`);
  try {
    await pipeline(stream, createWriteStream(part, { flags: 'wx' }));
    renameSync(part, final);
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  return name;
}
