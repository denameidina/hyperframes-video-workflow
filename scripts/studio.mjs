#!/usr/bin/env node
// Studio: local web UI for projects and the shared library, tmux agent sessions, and Repliz publish (ADR-0020, RD-05).
// Spec: docs/superpowers/specs/2026-09-28-studio-web-ui-design.md
// Usage: npm run studio [-- --port 4777]
// Node 22+, built-in modules only (ADR-0007).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { claudeModels, codexModels } from './studio/agent.mjs';
import { createApp } from './studio/app.mjs';
import { allowedHosts } from './studio/http.mjs';
import { VoiceJobs } from './studio/generate.mjs';
import { CaptionJobs, Publisher } from './studio/results.mjs';
import { Terminals } from './studio/terminal.mjs';
import { probeDuration } from './video.mjs';

const TAILSCALE = ['tailscale', '/Applications/Tailscale.app/Contents/MacOS/Tailscale'];

function tryRun(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

// Only a connected tailnet has its 100.x address on an interface we can bind.
export function parseTailscaleStatus(json) {
  let status;
  try {
    status = JSON.parse(json);
  } catch {
    return null;
  }
  if (status?.BackendState !== 'Running') return null;
  const ip = (status.Self?.TailscaleIPs || []).find((a) => /^100\.\d+\.\d+\.\d+$/.test(a));
  if (!ip) return null;
  const dns = String(status.Self?.DNSName || '').replace(/\.$/, '');
  return { ip, names: dns ? [dns, dns.split('.')[0]] : [] };
}

export function detectTailscale() {
  for (const bin of TAILSCALE) {
    const found = parseTailscaleStatus(tryRun(bin, ['status', '--json']));
    if (found) return found;
  }
  return null;
}

const durations = new Map();
async function probe(file, mtime) {
  const key = `${file}:${mtime}`;
  if (!durations.has(key)) {
    try {
      durations.set(key, probeDuration(file));
    } catch {
      durations.set(key, null);
    }
  }
  return durations.get(key);
}

function main(argv) {
  const { values } = parseArgs({ args: argv, options: { port: { type: 'string' } } });
  const root = process.cwd();
  if (!existsSync(join(root, 'scripts', 'studio.mjs'))) throw new Error('run npm run studio from the repo root');
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = process.env;
  const port = Number(values.port || env.STUDIO_PORT || 4777);
  const ts = detectTailscale();
  const addresses = ['127.0.0.1', ...(ts ? [ts.ip] : [])];
  const tools = Object.fromEntries(['tmux', 'claude', 'codex', 'ffprobe'].map((t) => [t, tryRun('sh', ['-c', `command -v ${t}`]) !== '']));
  const readText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
  // Read on every /api/state so a refreshed Codex cache or new Claude option shows without a restart.
  const models = async () => ({
    claude: claudeModels({ claudeJson: readText(join(homedir(), '.claude.json')), settings: readText(join(homedir(), '.claude', 'settings.json')) }),
    codex: codexModels({ cache: readText(join(homedir(), '.codex', 'models_cache.json')), config: readText(join(homedir(), '.codex', 'config.toml')) }),
  });
  const terminals = new Terminals();
  const handler = createApp({
    root,
    env,
    hosts: allowedHosts({ addresses, port, names: ts?.names || [] }),
    token: env.STUDIO_TOKEN || '',
    tools,
    models,
    terminals,
    publisher: new Publisher({ root, env }),
    voiceJobs: new VoiceJobs({ root, env }),
    captionJobs: new CaptionJobs({ root, env }),
    probe,
  });
  for (const address of addresses) {
    const server = createServer(handler);
    server.on('error', (e) => {
      if (address === '127.0.0.1') throw e;
      console.log(`warning: cannot listen on ${address}:${port} (${e.code}); localhost only`);
    });
    server.listen(port, address, () => console.log(`Studio: http://${address}:${port}`));
  }
  if (!ts) console.log('Tailscale not connected; listening on localhost only (restart Studio after connecting)');
  for (const [t, ok] of Object.entries(tools)) if (!ok) console.log(`warning: ${t} not found on PATH`);
  const stop = () => {
    terminals.closeAll(); // agents keep running in tmux (RD-05-09)
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
