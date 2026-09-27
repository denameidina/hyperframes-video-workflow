#!/usr/bin/env node
// Lint, validate, and snapshot the per-style example hosts (all, or the one style given):
//   npm run check:style-examples [-- <style>]   → renders/style-examples/<style>/
// Spec: docs/superpowers/specs/2026-09-28-pattern-examples-2a-design.md. Node 22+, built-ins only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { EXAMPLES, STYLES } from './lib/style-examples.mjs';

const only = process.argv[2];
if (only && !STYLES.includes(only)) { console.error(`unknown style "${only}" (one of: ${STYLES.join(', ')})`); process.exit(1); }
for (const style of only ? [only] : STYLES) {
  console.log(`\n== ${style}`);
  const r = spawnSync('node', ['scripts/check-broll-examples.mjs', `${EXAMPLES}/${style}`, `style-examples/${style}`], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
