// Studio results: renders, publish receipts, and the approval-gated Repliz publish (ADR-0003, ADR-0020).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildTargetAccounts, readPostMetadata } from '../repliz-publish.mjs';
import { HttpError } from './http.mjs';
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
    this.spawn = spawnImpl;
    this.jobs = new Map();
  }

  has(slug) {
    return this.jobs.has(slug);
  }

  start(slug, file) {
    renderPath(this.root, slug, file);
    const current = this.jobs.get(slug);
    if (current && current.code === null) throw new HttpError(409, `publish for ${slug} is already running`);
    const job = { file, log: [], code: null, listeners: new Set() };
    this.jobs.set(slug, job);
    const emit = (event, data) => {
      if (event === 'log') job.log.push(data);
      for (const f of job.listeners) f(event, data);
    };
    const child = this.spawn(process.execPath, ['scripts/repliz-publish.mjs', '--slug', `videos/${slug}`, '--file', `videos/${slug}/renders/${file}`, '--approved'], { cwd: this.root, env: this.env });
    child.stdout.on('data', (d) => emit('log', String(d)));
    child.stderr.on('data', (d) => emit('log', String(d)));
    child.on('error', (e) => emit('log', `${e.message}\n`));
    child.on('close', (code) => {
      job.code = code ?? 1;
      emit('done', { code: job.code });
      job.listeners.clear();
    });
    return job;
  }

  follow(slug, listener) {
    const job = this.jobs.get(slug);
    if (!job) throw new HttpError(404, 'no publish job');
    for (const line of job.log) listener('log', line);
    if (job.code !== null) {
      listener('done', { code: job.code });
      return () => {};
    }
    job.listeners.add(listener);
    return () => job.listeners.delete(listener);
  }
}
