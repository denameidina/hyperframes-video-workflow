// Studio projects videos/<slug>/: create, list, sources (upload, attach shared, role/note, remove), delete
// (ADR-0022, RD-05-13..15). sources.json is written only through scripts/lib/video-sources.mjs.
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { SOURCES_DIR, readManifest, removeSource, setSource, sourceFile, syncManifest } from '../lib/video-sources.mjs';
import { checkSlug, scaffold } from '../video.mjs';
import { projectSlugs, receiveFile } from './files.mjs';
import { HttpError } from './http.mjs';

// Manifest and slug errors are the caller's input problems: 400.
const asBadRequest = (fn) => {
  try {
    return fn();
  } catch (e) {
    throw e instanceof HttpError ? e : new HttpError(400, e.message);
  }
};

export function projectPath(root, slug) {
  asBadRequest(() => checkSlug(slug));
  const dir = join(root, 'videos', slug);
  if (!existsSync(dir)) throw new HttpError(404, `videos/${slug} not found`);
  return dir;
}

// Same contract as the old raw.mjs helper (results.mjs relies on it): bad slug 400, missing project [].
export function rendersOf(root, slug) {
  asBadRequest(() => checkSlug(slug));
  const dir = join(root, 'videos', slug, 'renders');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => !f.startsWith('.') && extname(f).toLowerCase() === '.mp4').sort();
}

export function roleCounts(sources) {
  const c = { speech: 0, broll: 0, image: 0, auto: 0 };
  for (const s of sources) c[s.role ?? 'auto'] += 1;
  return c;
}

export function listProjects(root) {
  return projectSlugs(root).map((slug) => {
    let sources = [];
    try {
      sources = readManifest(join(root, 'videos', slug)).sources;
    } catch {
      // an unreadable manifest shows as no sources; the project page reports the error
    }
    return { slug, counts: roleCounts(sources), renders: rendersOf(root, slug) };
  });
}

export function createProject(root, slug) {
  asBadRequest(() => checkSlug(slug));
  if (existsSync(join(root, 'videos', slug))) throw new HttpError(409, `videos/${slug} already exists`);
  scaffold({ slug, root });
  return { slug };
}

export function getProject(root, slug) {
  const dir = projectPath(root, slug);
  return { slug, sources: asBadRequest(() => readManifest(dir)).sources, renders: rendersOf(root, slug) };
}

export async function uploadSource(root, slug, name, stream, { probe }) {
  const dir = projectPath(root, slug);
  const saved = await receiveFile(join(dir, SOURCES_DIR), `videos/${slug}/${SOURCES_DIR}`, name, stream);
  try {
    return syncManifest({ dir, root, probe }).sources.find((s) => s.path === `${SOURCES_DIR}/${saved}`);
  } catch (e) {
    rmSync(join(dir, SOURCES_DIR, saved), { force: true }); // an unreadable file must not stay half-registered
    throw new HttpError(400, `${saved}: ${e.message}`);
  }
}

export function attachShared(root, slug, names, { probe }) {
  const dir = projectPath(root, slug);
  if (!Array.isArray(names) || !names.length || !names.every((n) => typeof n === 'string')) throw new HttpError(400, 'names must be a non-empty array of shared file names');
  return asBadRequest(() => syncManifest({ dir, root, addShared: names, probe })).sources;
}

export function updateSource(root, slug, id, { role, note } = {}) {
  const dir = projectPath(root, slug);
  return asBadRequest(() => setSource(dir, id, { role, note, by: 'user' }));
}

export function deleteSource(root, slug, id) {
  const dir = projectPath(root, slug);
  return asBadRequest(() => removeSource(dir, id));
}

export function sourcePathOf(root, slug, id) {
  const dir = projectPath(root, slug);
  const s = asBadRequest(() => readManifest(dir)).sources.find((x) => x.id === id);
  if (!s) throw new HttpError(404, `source ${id} not found`);
  return sourceFile(dir, s);
}

// Callers kill the project's tmux session first (RD-05-13). shared/ is never touched.
export function deleteProject(root, slug) {
  rmSync(projectPath(root, slug), { recursive: true, force: true });
  return { slug };
}
