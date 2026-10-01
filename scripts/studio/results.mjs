// Studio results: renders, publish receipts, and the approval-gated Repliz publish (ADR-0003, ADR-0020).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildTargetAccounts, readPostMetadata } from '../repliz-publish.mjs';
import { normalizePublishTime } from '../lib/publish-time.mjs';
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

export function listResults(root) {
  const out = [];
  for (const slug of projectSlugs(root)) {
    const publish = receiptStatus(readReceipt(root, slug));
    for (const file of rendersOf(root, slug)) {
      const st = statSync(join(root, 'videos', slug, 'renders', file));
      out.push({ slug, file, size: st.size, mtime: st.mtimeMs, publish });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

export function renderPath(root, slug, file) {
  if (!rendersOf(root, slug).includes(file)) throw new HttpError(404, 'render not found');
  return join(root, 'videos', slug, 'renders', file);
}

export async function publishPreview(root, slug, file, env) {
  renderPath(root, slug, file);
  const post = await readPostMetadata(join(root, 'videos', slug));
  return { slug, file, title: post.title, description: post.description, targets: buildTargetAccounts(env).map((t) => t.platform) };
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
