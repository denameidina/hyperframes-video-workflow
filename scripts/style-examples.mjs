#!/usr/bin/env node
// Per-style example hosts (spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md).
//   npm run style-examples -- build   examples.json → index.html + snapshots.json for every style
//   npm run style-examples -- check   exit 1 when a generated host is stale
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildHosts } from './lib/style-examples.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const cmd = process.argv[2];
try {
  const files = buildHosts(root);
  if (cmd === 'build') {
    for (const [p, c] of Object.entries(files)) { writeFileSync(resolve(root, p), c); console.log('wrote', p); }
  } else if (cmd === 'check') {
    const stale = Object.entries(files).filter(([p, c]) => !existsSync(resolve(root, p)) || readFileSync(resolve(root, p), 'utf8') !== c).map(([p]) => p);
    if (stale.length) { console.error('stale (run: npm run style-examples -- build):\n  ' + stale.join('\n  ')); process.exit(1); }
    console.log('example hosts are up to date');
  } else throw new Error('usage: style-examples <build|check>');
} catch (e) { console.error(e.message); process.exit(1); }
