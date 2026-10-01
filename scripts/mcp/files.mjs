import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const FILE_LIMIT = 4 << 20;
export const TEXT_EXT = new Set(['.md', '.json', '.html', '.css', '.js', '.txt', '.svg', '.csv', '.vtt', '.srt', '.yaml', '.yml']);
export const MIME = { '.md': 'text/markdown', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
export const hash = (data) => createHash('sha256').update(data).digest('hex');
const within = (base, path) => path === base || path.startsWith(base + sep);
const entryExists = (p) => { try { lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };

// Check every physical ancestor, including dangling symlinks. For a project-specific
// operation, its directory itself must not be a symlink outside that project's tree.
export function safePath(root, input, areas) {
  root = realpathSync(root);
  if (typeof input !== 'string' || !input || isAbsolute(input) || input.includes('\\') || input.includes('\0')) throw new Error('invalid relative path');
  const parts = input.split('/');
  if (parts.some((p) => !p || p === '..' || p.startsWith('.'))) throw new Error('hidden/traversal path is not allowed');
  const area = areas.find((a) => input === a || input.startsWith(a + '/'));
  if (!area) throw new Error('path is outside allowed areas');
  const base = resolve(root, area), target = resolve(root, input), realRoot = realpathSync(root);
  let cursor = realRoot;
  for (const part of relative(root, target).split(sep)) {
    cursor = join(cursor, part);
    if (!entryExists(cursor)) continue;
    if (lstatSync(cursor).isSymbolicLink()) throw new Error('path symlink is protected; use its actual allowed path');
    const physical = realpathSync(cursor);
    if (!within(realRoot, physical)) throw new Error('path symlink is outside workspace');
    // Before reaching base, enforce lexical identity too, so videos/demo cannot
    // resolve to videos/other or a library via a symlink.
    if (cursor === base || within(base, cursor)) {
      if (!within(base, physical)) throw new Error('path symlink is outside allowed area');
    } else if (physical !== cursor) throw new Error('path ancestor symlink is outside allowed area');
  }
  return target;
}
export const uriFor = (p) => `dena://workspace/${p.split('/').map(encodeURIComponent).join('/')}`;
export function pathFromUri(uri) {
  const u = new URL(uri);
  if (u.protocol !== 'dena:' || u.hostname !== 'workspace' || u.search || u.hash) throw new Error('invalid resource URI');
  return u.pathname.slice(1).split('/').map(decodeURIComponent).join('/');
}
export function readAreas(path) {
  const policyPath = path.toLowerCase();
  const project = /^videos\/([a-z0-9][a-z0-9-]*)\//.exec(path);
  if (project) {
    if (/\/vendor(?:\/|$)/.test(policyPath)) throw new Error('project vendor path is protected; read reference docs instead');
    return [`videos/${project[1]}`];
  }
  if (/^shared\/voices(?:\/|$)/.test(policyPath) || /(^|\/)key\.json$/.test(policyPath) || policyPath.startsWith('config/')) throw new Error('private configuration or identity path is protected');
  if (policyPath.startsWith('shared/voice-tests/')) {
    const m = /^shared\/voice-tests\/\d{8}-\d{4}(?:\/(.*))?$/.exec(policyPath);
    if (!m || (m[1] && !/^(script\.md|ratings\.json|ref\.wav|reveal\.md|samples(?:\/[a-z]\.wav)?)$/.test(m[1]))) throw new Error('blind identity/work path is protected; use voice_tests_read');
  }
  return ['AGENTS.md', 'CLAUDE.md', 'README.md', 'internal/docs', 'docs', 'shared', 'vendor/asset-lib'];
}
export function readFile(root, path) {
  const file = safePath(root, path, readAreas(path));
  const st = statSync(file), ext = extname(file).toLowerCase();
  if (!st.isFile()) throw new Error('path must be a file');
  const info = { path, uri: uriFor(path), mimeType: MIME[ext] || 'application/octet-stream', bytes: st.size };
  if (st.size > FILE_LIMIT) {
    if (TEXT_EXT.has(ext)) throw new Error('text file exceeds 4 MiB');
    return info;
  }
  if (TEXT_EXT.has(ext)) {
    const text = readFileSync(file, 'utf8');
    return { ...info, text, sha256: hash(text) };
  }
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return { ...info, blob: readFileSync(file).toString('base64') };
  return info;
}
export function listFiles(root, path, { recursive = false, limit = 1000, extensions } = {}) {
  const file = safePath(root, path, readAreas(path));
  const files = [];
  let truncated = false;
  function walk(dir, depth) {
    if (depth > 12) { truncated = true; return; }
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || entry.name === 'vendor' || entry.isSymbolicLink()) continue;
      const rel = relative(root, join(dir, entry.name)).split(sep).join('/');
      try { safePath(root, rel, readAreas(rel)); } catch { continue; }
      if (extensions && entry.isFile() && !extensions.includes(extname(entry.name).toLowerCase())) continue;
      if (files.length >= limit) { truncated = true; return; }
      if (!extensions || !entry.isDirectory()) files.push({ path: rel, directory: entry.isDirectory(), bytes: entry.isFile() ? statSync(join(root, rel)).size : null });
      if (recursive && entry.isDirectory()) walk(join(dir, entry.name), depth + 1);
    }
  }
  if (!statSync(file).isDirectory()) throw new Error('path must be a directory');
  walk(file, 0);
  return { files, truncated };
}
export function artifactPath(root, slug, path) {
  const area = `videos/${slug}`;
  if (/^(sources|vendor|renders|preview|voice)(\/|$)/i.test(path) || /(^|\/)(sources\.json|gates\.json|repliz-publish\.json|render-quality\.json|cut-map\.json|bgm\.json|beats\.json)$/i.test(path)) throw new Error('protected owner artifact: use its owning tool');
  if (!TEXT_EXT.has(extname(path).toLowerCase())) throw new Error('artifact extension is not allowed');
  return safePath(root, `${area}/${path}`, [area]);
}
export function writeArtifact(root, slug, path, content, expected) {
  const file = artifactPath(root, slug, path);
  if (Buffer.byteLength(content) > FILE_LIMIT) throw new Error('artifact exceeds 4 MiB');
  if (extname(file).toLowerCase() === '.json') { try { JSON.parse(content); } catch { throw new Error('invalid JSON artifact'); } }
  const current = existsSync(file) ? hash(readFileSync(file)) : null;
  if (current !== null && expected !== current) throw new Error('expected_sha256 must match the existing artifact; read the current file first');
  if (current === null && expected !== undefined) throw new Error('expected_sha256 supplied for a missing artifact');
  mkdirSync(dirname(file), { recursive: true });
  const part = join(dirname(file), `.mcp-${randomUUID()}.part`);
  try {
    writeFileSync(part, content, { flag: 'wx' });
    renameSync(part, file);
  } finally { rmSync(part, { force: true }); }
  return { path: `videos/${slug}/${path}`, sha256: hash(content), bytes: Buffer.byteLength(content) };
}
