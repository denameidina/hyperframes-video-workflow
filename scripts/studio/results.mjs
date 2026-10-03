// Studio results: renders, publish receipts, and the approval-gated Repliz publish (ADR-0003, ADR-0020).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildTargetAccounts, readPostMetadata } from '../repliz-publish.mjs';
import { normalizePublishTime } from '../lib/publish-time.mjs';
import { probeMedia } from '../lib/video-sources.mjs';
import { captionCommand, captionPrompt } from './agent.mjs';
import { HttpError } from './http.mjs';
import { JobRunner } from './jobs.mjs';
import { projectSlugs } from './files.mjs';
import { rendersOf } from './projects.mjs';

export function receiptStatus(receipt) {
  if (!receipt || !Array.isArray(receipt.schedules)) return null;
  return { createdAt: receipt.createdAt || null, platforms: receipt.schedules.map((s) => ({ platform: s.platform, status: s.status || 'unknown' })) };
}

function readReceipt(root, slug) {
  const p = join(root, 'videos', slug, 'repliz-publish.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const KNOWN_RATIOS = [[9, 16], [4, 5], [1, 1], [16, 9], [3, 4], [4, 3], [2, 3], [3, 2]];
// "9:16" for the common social ratios, else the decimal ("2.35:1"); null without both sides.
export function ratioLabel(width, height) {
  if (!(width > 0 && height > 0)) return null;
  const r = width / height;
  const hit = KNOWN_RATIOS.find(([w, h]) => Math.abs(r - w / h) / (w / h) < 0.01);
  return hit ? `${hit[0]}:${hit[1]}` : `${r.toFixed(2)}:1`;
}

// Displayed size of a render (a 90/270 degree rotation swaps the stored sides), cached per file version.
const sizes = new Map();
function renderSize(file, st, probe) {
  const key = `${file}:${st.mtimeMs}:${st.size}`;
  if (!sizes.has(key)) {
    let v = null;
    try {
      const p = probe(file, 'video');
      const turned = Math.abs(p.rotation || 0) % 180 === 90;
      const [width, height] = turned ? [p.height, p.width] : [p.width, p.height];
      if (width > 0 && height > 0) v = { width, height, ratio: ratioLabel(width, height), duration: p.duration || null };
    } catch {
      // unreadable media: the row still lists, without a size
    }
    sizes.set(key, v);
  }
  return sizes.get(key);
}

export function listResults(root, { probe = probeMedia } = {}) {
  const out = [];
  for (const slug of projectSlugs(root)) {
    const publish = receiptStatus(readReceipt(root, slug));
    for (const file of rendersOf(root, slug)) {
      const path = join(root, 'videos', slug, 'renders', file);
      const st = statSync(path);
      out.push({ slug, file, size: st.size, mtime: st.mtimeMs, publish, video: renderSize(path, st, probe) });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

export function renderPath(root, slug, file) {
  if (!rendersOf(root, slug).includes(file)) throw new HttpError(404, 'render not found');
  return join(root, 'videos', slug, 'renders', file);
}

export async function publishPreview(root, slug, file, env, { captionJobs } = {}) {
  renderPath(root, slug, file);
  const post = await readPostMetadata(join(root, 'videos', slug));
  return { slug, file, title: post.title, description: post.description, targets: buildTargetAccounts(env).map((t) => t.platform), captionRunning: Boolean(captionJobs?.running(slug)) };
}

// RD-05-60: when a render has no caption yet, one headless agent run writes publish-captions.md so scheduling can go on.
export class CaptionJobs {
  constructor({ root, env = process.env, spawnImpl = spawn }) {
    this.root = root;
    this.env = env;
    this.runner = new JobRunner({ spawnImpl, label: 'caption' });
  }

  has(slug) {
    return this.runner.has(slug);
  }

  running(slug) {
    return this.runner.running(slug);
  }

  async start(slug, file, agent) {
    renderPath(this.root, slug, file);
    const existing = await readPostMetadata(join(this.root, 'videos', slug));
    if (existing.description) throw new HttpError(409, 'publish-captions.md sudah ada');
    const targets = buildTargetAccounts(this.env).map((t) => t.platform);
    const [cmd, args] = captionCommand({ ...agent, prompt: captionPrompt({ slug, file, targets }) });
    return this.runner.start(slug, cmd, args, { cwd: this.root, env: this.env });
  }

  follow(slug, listener) {
    return this.runner.follow(slug, listener);
  }
}

export class Publisher {
  constructor({ root, env = process.env, spawnImpl = spawn }) {
    this.root = root;
    this.env = env;
    this.runner = new JobRunner({ spawnImpl, label: 'publish' });
  }

  has(slug) {
    return this.runner.has(slug);
  }

  start(slug, file, scheduleAt) {
    renderPath(this.root, slug, file);
    const args = ['scripts/repliz-publish.mjs', '--slug', `videos/${slug}`, '--file', `videos/${slug}/renders/${file}`, '--approved'];
    if (scheduleAt !== undefined) {
      try { args.push('--schedule-at', normalizePublishTime(scheduleAt)); }
      catch (e) { throw new HttpError(400, e.message); }
    }
    return this.runner.start(slug, process.execPath, args, { cwd: this.root, env: this.env });
  }

  follow(slug, listener) {
    return this.runner.follow(slug, listener);
  }
}
