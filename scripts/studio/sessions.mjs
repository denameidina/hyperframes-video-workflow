// Studio agent sessions live in tmux as studio-<slug>; metadata sits in tmux user options (ADR-0020).
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkSlug } from '../video.mjs';
import { agentCommand, paneCommand } from './agent.mjs';
import { HttpError } from './http.mjs';

export const PREFIX = 'studio-';
export const IDLE_AFTER = 3;
export const sessionName = (slug) => PREFIX + checkSlug(slug);
const FIELDS = ['session_name', 'window_activity', 'pane_dead', '@studio_runtime', '@studio_model', '@studio_effort', '@studio_started'];
export const FORMAT = FIELDS.map((f) => `#{${f}}`).join('\t');

// A Studio started inside tmux must not make tmux think it is nesting.
export function tmuxEnv(env = process.env) {
  const e = { ...env };
  delete e.TMUX;
  delete e.TMUX_PANE;
  return e;
}

export function runFile(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { env: tmuxEnv(), maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

export function parseSessions(stdout, nowSec) {
  const seen = new Set();
  const out = [];
  for (const line of stdout.split('\n')) {
    const [name, activity, dead, runtime, model, effort, started] = line.split('\t');
    if (!name || !name.startsWith(PREFIX) || seen.has(name)) continue;
    seen.add(name);
    const status = dead === '1' ? 'exited' : nowSec - Number(activity) < IDLE_AFTER ? 'running' : 'idle';
    out.push({ slug: name.slice(PREFIX.length), runtime, model, effort, started: Number(started) || 0, status });
  }
  return out;
}

export async function listSessions({ run = runFile, now = Date.now } = {}) {
  // launchd has no UTF-8 locale by default; without -u tmux replaces metadata tabs with underscores.
  const r = await run('tmux', ['-u', 'list-panes', '-a', '-F', FORMAT]);
  if (r.code !== 0) return []; // no tmux server yet
  return parseSessions(r.stdout, Math.floor(now() / 1000));
}

export async function hasSession(slug, { run = runFile } = {}) {
  return (await run('tmux', ['has-session', '-t', `=${sessionName(slug)}`])).code === 0;
}

export async function startSession({ root, slug, runtime, model, effort, prompt, run = runFile, now = Date.now }) {
  const name = sessionName(slug);
  const argv = agentCommand({ runtime, model, effort });
  if (await hasSession(slug, { run })) throw new HttpError(409, `session ${name} already exists`);
  const promptPath = join('.studio', 'prompts', `${slug}.md`);
  mkdirSync(join(root, '.studio', 'prompts'), { recursive: true });
  writeFileSync(join(root, promptPath), prompt);
  const set = (key, value) => [';', 'set-option', '-t', name, key, String(value)];
  const r = await run('tmux', [
    'new-session', '-d', '-s', name, '-x', '120', '-y', '40', '-c', root, '-e', `PATH=${process.env.PATH}`, paneCommand(argv, promptPath),
    ';', 'set-option', '-w', '-t', name, 'remain-on-exit', 'on',
    ...set('@studio_runtime', runtime),
    ...set('@studio_model', model),
    ...set('@studio_effort', effort),
    ...set('@studio_started', Math.floor(now() / 1000)),
  ]);
  if (r.code !== 0) throw new HttpError(500, `tmux new-session failed: ${r.stderr.trim()}`);
  return { slug, name };
}

export async function killSession(slug, { run = runFile } = {}) {
  await run('tmux', ['kill-session', '-t', `=${sessionName(slug)}`]);
}

export async function interruptSession(slug, { run = runFile } = {}) {
  const r = await run('tmux', ['send-keys', '-t', `=${sessionName(slug)}:`, 'Escape']);
  if (r.code !== 0) throw new HttpError(404, 'session not found');
}
