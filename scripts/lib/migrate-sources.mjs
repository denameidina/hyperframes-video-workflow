// One-off migration from raw/ + videos/<slug>/source.mp4 to shared/ + sources.json (ADR-0022).
// Usage: npm run video -- migrate-sources [--apply]   (without --apply: print the plan only)
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { cutMapOf } from './cut-plan.mjs';
import { SHARED_DIR, SOURCES_DIR, SOURCES_FILE, probeMedia, syncManifest, writeManifest } from './video-sources.mjs';

const SLUG = /^[a-z0-9][a-z0-9-]*$/; // SLUG_RE in scripts/video.mjs (not imported: video.mjs imports this module)
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const writeJson = (f, v) => writeFileSync(f, `${JSON.stringify(v, null, 2)}\n`);

function projectAction(dir, rawReal) {
  if (existsSync(join(dir, SOURCES_FILE))) return { action: 'skip', reason: 'sources.json exists' };
  const link = join(dir, 'source.mp4');
  let st;
  try {
    st = lstatSync(link);
  } catch {
    return { action: 'skip', reason: 'no source.mp4' };
  }
  if (!st.isSymbolicLink()) return { action: 'project', name: 'source.mp4' };
  let target;
  try {
    target = realpathSync(link);
  } catch {
    return { action: 'skip', reason: 'source.mp4 is a broken link' };
  }
  if (rawReal && dirname(target) === rawReal) return { action: 'shared', name: basename(target) };
  return { action: 'skip', reason: `source.mp4 points outside raw/ (${target})` };
}

export function planMigration(root) {
  const rawDir = join(root, 'raw');
  const rawReal = existsSync(rawDir) ? realpathSync(rawDir) : null;
  const moves = rawReal
    ? readdirSync(rawDir).filter((n) => !n.startsWith('.')).sort().map((name) => ({ name, from: `raw/${name}`, to: `${SHARED_DIR}/${name}` }))
    : [];
  const conflicts = moves.filter((m) => existsSync(join(root, m.to))).map((m) => m.to);
  const videos = join(root, 'videos');
  const slugs = existsSync(videos) ? readdirSync(videos).filter((d) => SLUG.test(d)).sort() : [];
  const projects = slugs.map((slug) => ({ slug, ...projectAction(join(videos, slug), rawReal) }));
  return { moves, conflicts, projects };
}

export function formatPlan({ moves, conflicts, projects }) {
  return [
    ...moves.map((m) => `move ${m.from} -> ${m.to}`),
    ...conflicts.map((c) => `CONFLICT ${c} already exists`),
    ...projects.map((p) => (p.action === 'skip' ? `skip videos/${p.slug}: ${p.reason}` : `convert videos/${p.slug} (${p.action} ${p.name})`)),
  ].join('\n') || 'nothing to migrate';
}

function migrateProject(root, { slug, action, name }, probe) {
  const dir = join(root, 'videos', slug);
  const link = join(dir, 'source.mp4');
  let path;
  if (action === 'shared') {
    unlinkSync(link); // the raw file already moved, so the link dangles; rmSync silently skips dangling links
    path = `../../${SHARED_DIR}/${name}`;
  } else {
    mkdirSync(join(dir, SOURCES_DIR), { recursive: true });
    renameSync(link, join(dir, SOURCES_DIR, name));
    path = `${SOURCES_DIR}/${name}`;
  }
  const origin = action === 'shared' ? 'shared' : 'project';
  writeManifest(dir, { version: 1, sources: [{ id: 's1', path, origin, kind: 'video', role: 'speech', roleSource: 'user', note: '' }] });
  syncManifest({ dir, root, probe });
  const transcript = join(dir, 'transcript.json');
  if (existsSync(transcript)) {
    mkdirSync(join(dir, 'transcripts'), { recursive: true });
    renameSync(transcript, join(dir, 'transcripts', 's1.json'));
  }
  const cutFile = join(dir, 'cut-list.json');
  if (existsSync(cutFile)) {
    const cut = readJson(cutFile);
    delete cut.source;
    cut.segments = (cut.segments || []).map((g) => ({ source: 's1', ...g }));
    writeJson(cutFile, cut);
    writeJson(join(dir, 'cut-map.json'), cutMapOf(cut));
  }
  const metaFile = join(dir, 'metadata.json');
  if (existsSync(metaFile)) {
    const meta = readJson(metaFile);
    delete meta.source;
    meta.sources = SOURCES_FILE;
    writeJson(metaFile, meta);
  }
}

export function applyMigration(root, plan, { probe = probeMedia } = {}) {
  if (plan.conflicts.length) throw new Error(`already in shared/: ${plan.conflicts.join(', ')}; move them away first`);
  mkdirSync(join(root, SHARED_DIR), { recursive: true });
  for (const m of plan.moves) renameSync(join(root, m.from), join(root, m.to));
  const rawDir = join(root, 'raw');
  if (existsSync(rawDir) && readdirSync(rawDir).every((n) => n.startsWith('.'))) rmSync(rawDir, { recursive: true }); // only .gitkeep/.DS_Store left
  for (const p of plan.projects) if (p.action !== 'skip') migrateProject(root, p, probe);
}
