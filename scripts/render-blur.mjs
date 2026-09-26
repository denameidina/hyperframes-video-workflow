#!/usr/bin/env node
// Optional motion-blur pass: render at 4x fps, then blend each group of 4 subframes
// into one output frame with ffmpeg tmix. The audio stream is copied unchanged.
// Spec: docs/superpowers/specs/2026-09-26-motion-broll-design.md ("Motion blur").
// Usage: npm run render:blur -- --slug <slug> [--fps 30] [--project .]
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const HYPERFRAMES = 'hyperframes@0.7.24';
export const SUBFRAMES = 4;

export function blendFilter(fps) {
  return `tmix=frames=${SUBFRAMES},select='eq(mod(n\\,${SUBFRAMES})\\,${SUBFRAMES - 1})',setpts=N/(${fps}*TB)`;
}

export function blurPlan({ slug, fps = 30, project = '.' }) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('--slug must use lowercase letters, digits, and dashes');
  if (!Number.isInteger(fps) || fps <= 0) throw new Error('--fps must be a positive integer');
  const hiFps = fps * SUBFRAMES;
  const tmpDir = join(project, 'renders', '.blur');
  const hi = join(tmpDir, `${slug}-${hiFps}.mp4`);
  const out = join(project, 'renders', `${slug}-blur.mp4`);
  return {
    tmpDir,
    hi,
    out,
    render: ['npx', ['--yes', HYPERFRAMES, 'render', '--fps', String(hiFps), '--quality', 'high', '-o', hi, project]],
    blend: ['ffmpeg', ['-loglevel', 'error', '-y', '-i', hi, '-vf', blendFilter(fps), '-r', String(fps), '-c:a', 'copy', out]],
  };
}

function run([cmd, args]) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} exited with ${r.status}`);
}

export function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      slug: { type: 'string' },
      fps: { type: 'string', default: '30' },
      project: { type: 'string', default: '.' },
    },
  });
  const plan = blurPlan({ slug: values.slug, fps: Number(values.fps), project: values.project });
  mkdirSync(plan.tmpDir, { recursive: true });
  try {
    run(plan.render);
    run(plan.blend);
  } finally {
    rmSync(plan.hi, { force: true });
  }
  console.log(`motion blur: ${plan.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
