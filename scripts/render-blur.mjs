#!/usr/bin/env node
// Optional motion-blur pass: render at 4x fps, then blend each group of 4 subframes
// into one output frame with ffmpeg tmix. Audio is copied at blend, then delivery
// measures the encoded mix and masters it only when it is outside the project profile.
// Spec: docs/superpowers/specs/2026-09-26-motion-broll-design.md ("Motion blur").
// Usage: npm run render:blur -- --slug <slug> [--fps 30] [--project .]
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { deliverRender, projectRenderExpectation, selectAudioProfile } from './lib/render-quality.mjs';

export const HYPERFRAMES = 'hyperframes@0.7.24';
export const SUBFRAMES = 4;
export const BLUR_ENCODE = { codec: 'libx264', crf: 16, preset: 'slow', pixelFormat: 'yuv420p', color: 'bt709', faststart: true, blur: true, audioAtBlend: 'copy' };

export function blendFilter(fps) {
  return `tmix=frames=${SUBFRAMES},select='eq(mod(n\\,${SUBFRAMES})\\,${SUBFRAMES - 1})',setpts=N/(${fps}*TB)`;
}

export function blurPlan({ slug, fps = 30, project = '.', workDir }) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('--slug must use lowercase letters, digits, and dashes');
  if (!Number.isInteger(fps) || fps <= 0) throw new Error('--fps must be a positive integer');
  const hiFps = fps * SUBFRAMES;
  const tmpDir = workDir ?? join(project, 'renders', '.blur');
  const hi = join(tmpDir, `${slug}-${hiFps}.mp4`);
  const out = join(project, 'renders', `${slug}-blur.mp4`);
  const pending = workDir ? join(workDir, 'pending.mp4') : join(project, 'renders', `.${slug}-blur.pending.mp4`);
  return {
    tmpDir,
    hi,
    out,
    pending,
    render: ['npx', ['--yes', HYPERFRAMES, 'render', '--fps', String(hiFps), '--quality', 'high', '-o', hi, project]],
    blend: ['ffmpeg', ['-loglevel', 'error', '-y', '-i', hi, '-map', '0:v:0', '-map', '0:a?', '-vf', blendFilter(fps), '-r', String(fps), '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709', '-movflags', '+faststart', '-c:a', 'copy', pending]],
  };
}

function execute([cmd, args], run, env) {
  const r = run(cmd, args, { stdio: 'inherit', env });
  if (r.status !== 0 || r.error) throw new Error(`${cmd} exited with ${r.status}`);
}

export function main(argv, { run = spawnSync, env = process.env } = {}) {
  const { values } = parseArgs({
    args: argv,
    options: {
      slug: { type: 'string' },
      fps: { type: 'string', default: '30' },
      project: { type: 'string', default: '.' },
    },
  });
  blurPlan({ slug: values.slug, fps: Number(values.fps), project: values.project }); // validate before creating any output
  const expected = projectRenderExpectation(values.project, { fps: Number(values.fps) });
  const profile = selectAudioProfile(values.project);
  const childEnv = { ...env }; delete childEnv.GEMINI_API_KEY; delete childEnv.GEMINI_TTS_API_KEY;
  const childRun = (cmd, args, options = {}) => run(cmd, args, { ...options, env: childEnv });
  mkdirSync(join(values.project, 'renders'), { recursive: true });
  const workDir = mkdtempSync(join(values.project, 'renders', `.${values.slug}.blur-`));
  const plan = blurPlan({ slug: values.slug, fps: Number(values.fps), project: values.project, workDir });
  try {
    execute(plan.render, childRun, childEnv);
    execute(plan.blend, childRun, childEnv);
    const receipt = deliverRender({ pending: plan.pending, final: plan.out, expected, profile, run: childRun, toolchain: { hyperframes: HYPERFRAMES }, encode: { ...BLUR_ENCODE, fps: Number(values.fps), subframes: SUBFRAMES } });
    console.log(`motion blur: ${plan.out} (validated; quality receipt written)`);
    return receipt;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
