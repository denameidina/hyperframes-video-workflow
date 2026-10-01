#!/usr/bin/env node
// Zero-dependency local MCP stdio server (ADR-0032, RD-08). Stdout is protocol-only.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv } from 'node:util';
import { clientConfig } from './mcp/config.mjs';
import { serve } from './mcp/protocol.mjs';
import { createService } from './mcp/service.mjs';

export function main(argv) {
  const { values } = parseArgs({ args: argv, options: { root: { type: 'string' }, 'read-only': { type: 'boolean', default: false }, 'import-root': { type: 'string', multiple: true }, 'print-config': { type: 'string' }, 'job-timeout-ms': { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) {
    process.stdout.write('Dena video MCP (Node 22+, stdio)\nnode scripts/mcp.mjs [--root <repo>] [--read-only] [--import-root <dir>]\n  --print-config claude|codex|hermes|vscode|json\n  --job-timeout-ms <ms> (default 3600000; persistent services have no timeout)\n'); return;
  }
  const root = realpathSync(resolve(values.root ?? fileURLToPath(new URL('..', import.meta.url))));
  if (!existsSync(join(root, 'scripts/video.mjs')) || !existsSync(join(root, 'package.json'))) throw new Error('--root must point to the video workspace');
  const importRoots = values['import-root'] ?? [];
  if (values['print-config']) { process.stdout.write(clientConfig(root, values['print-config'], { readOnly: values['read-only'], importRoots })); return; }
  const timeoutMs = Number(values['job-timeout-ms'] ?? 3600000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 43200000) throw new Error('job-timeout-ms must be 1000–43200000');
  const env = { ...(existsSync(join(root, '.env')) ? parseEnv(readFileSync(join(root, '.env'), 'utf8')) : {}), ...process.env };
  const service = createService({ root, env, readOnly: values['read-only'], importRoots, timeoutMs });
  const server = serve(service);
  const stop = () => { server.stop(); process.stdin.destroy(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (e) { process.stderr.write(`MCP startup failed: ${e.message}\n`); process.exitCode = 1; }
}
