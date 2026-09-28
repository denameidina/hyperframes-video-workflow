#!/usr/bin/env node
// Per-style moodboards (spec: docs/superpowers/specs/2026-09-28-moodboard-design.md, ADR-0018).
//   npm run moodboard -- build            moodboard.json → studies/index.html + snapshots.json
//   npm run moodboard -- check            exit 1 when the studies host is stale
//   npm run moodboard -- sheets [style]   render the studies and write sheets/<style>.webp (all styles by default)
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSheets, checkMoodboard, readMoodboard, studiesHost } from './lib/moodboard.mjs';
import { STYLES } from './lib/style-examples.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const [cmd, arg] = process.argv.slice(2);
const styles = arg ? [arg] : STYLES;
try {
  if (arg && !STYLES.includes(arg)) throw new Error(`unknown style "${arg}" (one of: ${STYLES.join(', ')})`);
  const m = checkMoodboard(readMoodboard(root));
  const files = studiesHost(m);
  if (cmd === 'build') {
    for (const [p, c] of Object.entries(files)) { writeFileSync(resolve(root, p), c); console.log('wrote', p); }
  } else if (cmd === 'check') {
    const stale = Object.entries(files).filter(([p, c]) => !existsSync(resolve(root, p)) || readFileSync(resolve(root, p), 'utf8') !== c).map(([p]) => p);
    if (stale.length) { console.error('stale (run: npm run moodboard -- build):\n  ' + stale.join('\n  ')); process.exit(1); }
    console.log('moodboard studies host is up to date');
  } else if (cmd === 'sheets') {
    console.log(buildSheets(root, styles));
  } else throw new Error('usage: moodboard <build|check|sheets [style]>');
} catch (e) { console.error(e.message); process.exit(1); }
