#!/usr/bin/env node
// Per-video HyperFrames projects under videos/<slug>/ (ADR-0010).
// Spec: docs/superpowers/specs/2026-09-26-per-video-projects-design.md
// Usage: npm run video -- <new|check|dev|snapshot|render> <slug> [--duration s] [--at t,...] [--blur]
//        npm run video -- cutout <slug> --from <s> --dur <s> --name NN-name   (matted mix-media cut-out)
// Cut-out spec: docs/superpowers/specs/2026-09-27-vox-mix-media-design.md
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const HYPERFRAMES = 'hyperframes@0.7.24';
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const TEMPLATE = join('templates', 'dena-video');

export function checkSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) throw new Error('slug must use lowercase letters, digits, and dashes');
  return slug;
}

export const projectDir = (slug, root = '.') => join(root, 'videos', checkSlug(slug));

export function fillTemplate(html, { slug, duration }) {
  if (!(duration > 0)) throw new Error('duration must be > 0');
  return html.replaceAll('__SLUG__', slug).replaceAll('__DURATION__', String(duration));
}

export function probeDuration(file, run = spawnSync) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = Number.parseFloat(r.stdout);
  if (r.status !== 0 || !(d > 0)) throw new Error(`ffprobe could not read the duration of ${file}`);
  return Math.round(d * 1000) / 1000;
}

export function resolveDuration({ duration, dir, probe = probeDuration }) {
  if (duration !== undefined) {
    const d = Number(duration);
    if (!(d > 0)) throw new Error('--duration must be > 0');
    return d;
  }
  const media = join(dir, 'processed.mp4');
  return existsSync(media) ? probe(media) : 10;
}

const hasEntry = (p) => { try { lstatSync(p); return true; } catch { return false; } };

export function scaffold({ slug, root = '.', duration, probe }) {
  const dir = projectDir(slug, root);
  const index = join(dir, 'index.html');
  if (hasEntry(index)) throw new Error(`${index} already exists; refusing to overwrite`);
  mkdirSync(join(dir, 'compositions', 'broll'), { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });
  const d = resolveDuration({ duration, dir, probe });
  const tpl = join(root, TEMPLATE);
  writeFileSync(index, fillTemplate(readFileSync(join(tpl, 'index.html'), 'utf8'), { slug, duration: d }));
  cpSync(join(tpl, 'hyperframes.json'), join(dir, 'hyperframes.json'));
  if (!hasEntry(join(dir, 'vendor'))) symlinkSync('../../vendor', join(dir, 'vendor'));
  return { dir, duration: d };
}

const hf = (...args) => ['npx', ['--yes', HYPERFRAMES, ...args]];

export function commandsFor(cmd, slug, { at, blur = false, root = '.' } = {}) {
  const dir = projectDir(slug, root);
  switch (cmd) {
    case 'check':
      return [hf('lint', dir), hf('validate', dir), hf('inspect', dir)];
    case 'dev':
      return [hf('preview', dir)];
    case 'snapshot':
      if (typeof at !== 'string' || !/^\d+(\.\d+)?(,\d+(\.\d+)?)*$/.test(at)) throw new Error('snapshot needs --at <t,...> in seconds');
      return [hf('snapshot', '--at', at, '-o', join(dir, 'snapshots'), dir)];
    case 'render':
      return blur
        ? [['node', [join(root, 'scripts', 'render-blur.mjs'), '--slug', slug, '--project', dir]]]
        : [hf('render', '--quality', 'high', '-o', join(dir, 'renders', `${slug}.mp4`), dir)];
    default:
      throw new Error(`unknown command "${cmd}" (use new, check, dev, snapshot, render, cutout)`);
  }
}

export const CUTOUT_NAME_RE = /^\d\d-[a-z0-9][a-z0-9-]*$/;
export const CUTOUT_MAX_DUR = 15;

/* cutout: cut a segment of processed.mp4 and matte it into a transparent WebM for a mix-media clip.
   The segment starts at the clip's host time, so the cut-out stays in sync with the audio. */
export function cutoutPlan(slug, { from, dur, name, root = '.', probe = probeDuration }) {
  const dir = projectDir(slug, root);
  const f = Number(from), d = Number(dur);
  if (from === undefined || !Number.isFinite(f) || f < 0) throw new Error('--from must be a number of seconds >= 0');
  if (!(d > 0 && d <= CUTOUT_MAX_DUR)) throw new Error(`--dur must be > 0 and <= ${CUTOUT_MAX_DUR} seconds`);
  if (typeof name !== 'string' || !CUTOUT_NAME_RE.test(name)) throw new Error('--name must look like NN-name (for example 04-dena)');
  const media = join(dir, 'processed.mp4');
  if (!existsSync(media)) throw new Error(`${media} not found; a cut-out is cut from the processed video`);
  const total = probe(media);
  if (f + d > total + 1e-6) throw new Error(`--from + --dur (${f + d} s) is past the end of processed.mp4 (${total} s)`);
  const seg = join(dir, 'assets', 'frames', `${name}-seg.mp4`);
  const out = join(dir, 'assets', 'cutouts', `${name}.webm`);
  return {
    seg,
    out,
    cmds: [
      ['ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(f), '-t', String(d), '-i', media, '-an', '-c:v', 'libx264', '-crf', '16', seg]],
      hf('remove-background', seg, '-o', out),
    ],
  };
}

export function main(argv, { run = spawnSync, env = process.env, root = '.' } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      at: { type: 'string' }, blur: { type: 'boolean', default: false }, duration: { type: 'string' },
      from: { type: 'string' }, dur: { type: 'string' }, name: { type: 'string' },
    },
  });
  const [cmd, slug] = positionals;
  if (cmd === 'new') {
    const { dir, duration } = scaffold({ slug, root, duration: values.duration });
    console.log(`created ${dir} (${duration} s)`);
    return;
  }
  if (cmd === 'cutout') {
    const { seg, out, cmds } = cutoutPlan(slug, { ...values, root, probe: (f) => probeDuration(f, run) });
    mkdirSync(join(projectDir(slug, root), 'assets', 'frames'), { recursive: true });
    mkdirSync(join(projectDir(slug, root), 'assets', 'cutouts'), { recursive: true });
    // never reuse an old file: a failed or skipped matte must not leave a stale cut-out behind
    rmSync(seg, { force: true });
    rmSync(out, { force: true });
    for (const [c, a] of cmds) {
      const r = run(c, a, { stdio: 'inherit', env });
      if (r.status !== 0) throw new Error(`${c} ${a.slice(0, 3).join(' ')} exited with ${r.status}`);
    }
    if (!existsSync(out) || statSync(out).size === 0) throw new Error(`remove-background did not write ${out}`);
    console.log(`cut-out ${out}`);
    return;
  }
  const cmds = commandsFor(cmd, slug, { at: values.at, blur: values.blur, root });
  const dir = projectDir(slug, root);
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`${join(dir, 'index.html')} not found; run npm run video -- new ${slug}`);
  if (cmd === 'render') mkdirSync(join(dir, 'renders'), { recursive: true });
  const childEnv = { ...env };
  delete childEnv.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  for (const [c, a] of cmds) {
    const r = run(c, a, { stdio: 'inherit', env: childEnv });
    if (r.status !== 0) throw new Error(`${c} ${a.slice(0, 3).join(' ')} exited with ${r.status}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
