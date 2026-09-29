// Project source manifest videos/<slug>/sources.json (ADR-0022, RD-03-65..67, RD-05-14/15).
// The one writer used by the video CLI and the Studio: scan sources/, attach shared/ files, probe, set role/note.
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

export const VIDEO_EXT = ['.mp4', '.mov', '.m4v'];
export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
export const SOURCES_FILE = 'sources.json';
export const SOURCES_DIR = 'sources';
export const SHARED_DIR = 'shared';
const PREFIX = { speech: 's', broll: 'b', image: 'i' };
const NOTE_MAX = 500;

export function kindOf(name) {
  const ext = extname(String(name)).toLowerCase();
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (IMAGE_EXT.includes(ext)) return 'image';
  return null;
}

export const isMedia = (name) => !String(name).startsWith('.') && kindOf(name) !== null;

export function readManifest(dir) {
  const file = join(dir, SOURCES_FILE);
  if (!existsSync(file)) return { version: 1, sources: [] };
  const m = JSON.parse(readFileSync(file, 'utf8'));
  if (m?.version !== 1 || !Array.isArray(m.sources)) throw new Error(`${file} is not a version 1 sources manifest`);
  return m;
}

export function writeManifest(dir, manifest) {
  const file = join(dir, SOURCES_FILE);
  writeFileSync(`${file}.part`, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(`${file}.part`, file);
}

// Ids are stable: a u-source that later becomes speech keeps its u-id (cut-lists refer to it).
export function nextId(sources, role) {
  const p = PREFIX[role] ?? 'u';
  const used = new Set(sources.map((s) => s.id));
  for (let n = 1; ; n++) if (!used.has(`${p}${n}`)) return `${p}${n}`;
}

export const sourceFile = (dir, source) => join(dir, source.path);

function newEntry(sources, { path, origin, name }) {
  const kind = kindOf(name);
  const role = kind === 'image' ? 'image' : null;
  return { id: nextId(sources, role), path, origin, kind, role, roleSource: role ? 'detected' : null, note: '' };
}

const round3 = (x) => Math.round(x * 1000) / 1000;

export function parseProbe(json, kind) {
  const d = JSON.parse(json);
  const streams = d.streams || [];
  const v = streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error('no video stream');
  const size = { width: v.width, height: v.height };
  if (kind === 'image') return size;
  const [num, den] = String(v.r_frame_rate || '0/1').split('/').map(Number);
  const rotation = (v.side_data_list || []).find((x) => x.rotation !== undefined)?.rotation ?? Number(v.tags?.rotate ?? 0);
  return {
    duration: round3(Number.parseFloat(d.format?.duration)),
    ...size,
    fps: den ? round3(num / den) : 0,
    rotation: Number(rotation) || 0,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
  };
}

export function probeMedia(file, kind, run = spawnSync) {
  const r = run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe could not read ${file}`);
  return parseProbe(r.stdout, kind);
}

/* Bring the manifest in line with the disk: add new files in sources/ and the named shared files,
   drop project files that are gone, and (re)probe entries whose size or mtime changed.
   id, role, roleSource, and note of existing entries are never changed here. */
export function syncManifest({ dir, root, addShared = [], probe = probeMedia }) {
  const manifest = readManifest(dir);
  const sources = manifest.sources.filter((s) => s.origin !== 'project' || existsSync(sourceFile(dir, s)));
  const srcDir = join(dir, SOURCES_DIR);
  for (const name of existsSync(srcDir) ? readdirSync(srcDir).filter(isMedia).sort() : []) {
    const path = `${SOURCES_DIR}/${name}`;
    if (!sources.some((s) => s.path === path)) sources.push(newEntry(sources, { path, origin: 'project', name }));
  }
  for (const name of addShared) {
    if (basename(name) !== name || !isMedia(name)) throw new Error(`invalid shared file name "${name}"`);
    if (!existsSync(join(root, SHARED_DIR, name))) throw new Error(`${SHARED_DIR}/${name} not found`);
    const path = `../../${SHARED_DIR}/${name}`;
    if (!sources.some((s) => s.path === path)) sources.push(newEntry(sources, { path, origin: 'shared', name }));
  }
  for (const s of sources) {
    const file = sourceFile(dir, s);
    if (!existsSync(file)) throw new Error(`${s.id}: ${s.path} is missing`);
    const st = statSync(file);
    if (s.probe?.size === st.size && s.probe?.mtime === st.mtimeMs) continue;
    s.probe = { ...probe(file, s.kind), size: st.size, mtime: st.mtimeMs };
  }
  const next = { ...manifest, sources };
  writeManifest(dir, next);
  return next;
}

function findSource(manifest, id) {
  const s = manifest.sources.find((x) => x.id === id);
  if (!s) throw new Error(`unknown source id "${id}"`);
  return s;
}

// by: 'user' (Dena, via Studio or prompt) or 'detected' (the Story agent). A user role is never overwritten by detection.
export function setSource(dir, id, { role, note, by = 'user' } = {}) {
  const manifest = readManifest(dir);
  const s = findSource(manifest, id);
  if (role !== undefined) {
    if (by === 'detected' && s.roleSource === 'user') throw new Error(`${id}: role was set by Dena; not changing it`);
    if (s.kind === 'image') {
      if (role !== 'image') throw new Error(`${id} is an image; an image source is always role image`);
    } else if (role === 'auto' || role === null) {
      s.role = null;
      s.roleSource = null;
    } else if (role === 'speech' || role === 'broll') {
      s.role = role;
      s.roleSource = by;
    } else {
      throw new Error(`role for a video source must be speech, broll, or auto (got "${role}")`);
    }
  }
  if (note !== undefined) {
    if (typeof note !== 'string' || note.length > NOTE_MAX) throw new Error(`note must be a string of at most ${NOTE_MAX} characters`);
    s.note = note.trim();
  }
  writeManifest(dir, manifest);
  return s;
}

// A project file is deleted from sources/; a shared file is only detached (shared/ is untouched).
export function removeSource(dir, id) {
  const manifest = readManifest(dir);
  const s = findSource(manifest, id);
  if (s.origin === 'project') rmSync(sourceFile(dir, s), { force: true });
  writeManifest(dir, { ...manifest, sources: manifest.sources.filter((x) => x !== s) });
  return s;
}

export function formatSources({ sources }) {
  if (!sources.length) return 'no sources yet: put files in sources/ or use --add-shared <name,...>';
  return sources.map((s) => [
    s.id, s.role ?? 'auto', s.roleSource ? `(${s.roleSource})` : '', s.path,
    s.probe?.duration ? `${s.probe.duration} s` : '', s.note ? `"${s.note}"` : '',
  ].filter(Boolean).join('  ')).join('\n');
}
