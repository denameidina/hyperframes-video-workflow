import { join } from 'node:path';

export function clientConfig(root, format, { node = process.execPath, readOnly = false, importRoots = [] } = {}) {
  const args = [join(root, 'scripts/mcp.mjs'), '--root', root, ...(readOnly ? ['--read-only'] : []), ...importRoots.flatMap((p) => ['--import-root', p])];
  const server = { command: node, args };
  const q = JSON.stringify;
  if (format === 'claude' || format === 'json') return JSON.stringify({ mcpServers: { 'dena-video': server } }, null, 2) + '\n';
  if (format === 'vscode') return JSON.stringify({ servers: { 'dena-video': { type: 'stdio', ...server } } }, null, 2) + '\n';
  if (format === 'codex') return `[mcp_servers.dena-video]\ncommand = ${q(node)}\nargs = [${args.map(q).join(', ')}]\nstartup_timeout_sec = 20\ntool_timeout_sec = 120\n`;
  if (format === 'hermes') return `mcp_servers:\n  dena-video:\n    command: ${q(node)}\n    args: [${args.map(q).join(', ')}]\n`;
  throw new Error('config format must be claude, json, codex, hermes or vscode');
}
