#!/usr/bin/env node
// Assemble an example project (motion b-roll by default, or the one given as
// argv[2]) in a temp dir, then lint, validate, and snapshot it at the key-word
// times listed in its snapshots.json; argv[3] names the folder under renders/.
// Specs: docs/superpowers/specs/2026-09-26-motion-broll-design.md ("Pengujian"),
// docs/superpowers/specs/2026-09-27-style-kit-design.md ("Pengujian").
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const HYPERFRAMES = 'hyperframes@0.7.24';
const SRC = process.argv[2] ?? 'docs/agents/references/motion-broll-examples';
const OUT = resolve('renders', process.argv[3] ?? 'broll-examples');

const env = { ...process.env };
delete env.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe

const hf = (...args) => {
  const r = spawnSync('npx', ['--yes', HYPERFRAMES, ...args], { stdio: 'inherit', env });
  if (r.status !== 0) throw new Error(`hyperframes ${args[0]} failed (exit ${r.status})`);
};

const dir = mkdtempSync(join(tmpdir(), 'broll-examples-'));
try {
  cpSync(SRC, dir, { recursive: true });
  mkdirSync(join(dir, 'vendor'), { recursive: true });
  cpSync('vendor/gsap.min.js', join(dir, 'vendor/gsap.min.js'));
  cpSync('vendor/motion-kit', join(dir, 'vendor/motion-kit'), { recursive: true });
  cpSync('vendor/style-kit', join(dir, 'vendor/style-kit'), { recursive: true });
  cpSync('vendor/paper-pack', join(dir, 'vendor/paper-pack'), { recursive: true });
  cpSync('vendor/asset-lib', join(dir, 'vendor/asset-lib'), { recursive: true, filter: (f) => !f.includes('/src') });
  // per-style example hosts share one assets/ folder next to them (docs/agents/references/style-examples/assets)
  const shared = join(SRC, '..', 'assets');
  if (!existsSync(join(SRC, 'assets')) && existsSync(shared)) cpSync(shared, join(dir, 'assets'), { recursive: true });
  const { at } = JSON.parse(readFileSync(join(SRC, 'snapshots.json'), 'utf8'));
  hf('lint', dir);
  hf('validate', dir);
  rmSync(OUT, { recursive: true, force: true });
  hf('snapshot', '--at', at.join(','), '-o', OUT, dir);
  console.log(`snapshots: ${OUT}/ (frame-*.png, contact-sheet*.jpg)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
