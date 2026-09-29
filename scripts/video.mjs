#!/usr/bin/env node
// Per-video HyperFrames projects under videos/<slug>/ (ADR-0010).
// Spec: docs/superpowers/specs/2026-09-26-per-video-projects-design.md
// Usage: npm run video -- <new|check|dev|snapshot|render> <slug> [--duration s] [--at t,...] [--blur]
//        npm run video -- cutout <slug> --from <s> --dur <s> --name NN-name   (matted mix-media cut-out)
//        npm run video -- layers <slug> (--at <s> | --image <file>) --name NN-name   (parallax source + subject)
// Cut-out spec: docs/superpowers/specs/2026-09-27-vox-mix-media-design.md
//        npm run video -- sources <slug> [--add-shared a,b] [--set <id> --role <r> [--note <t>] [--detected]] [--remove <id>]
//        npm run video -- cut <slug>   (processed.mp4 + cut-map.json from cut-list.json + sources.json)
//        npm run video -- migrate-sources [--apply]   (raw/ + source.mp4 -> shared/ + sources.json, once)
// Layers spec: docs/superpowers/specs/2026-09-27-parallax-design.md
// Multi-source spec: docs/superpowers/specs/2026-09-29-multi-source-projects-design.md (ADR-0022)
//        npm run video -- new <slug> --generate   (generate mode: templates/dena-generate, research/, brief stub)
//        npm run video -- voice <slug> [--preset <p>]   (script.md -> voice/, processed-audio.wav, processed-transcript.json)
//        npm run video -- bgm <slug> --track <id> [--from <s>]   (shared/music track -> ducked bgm.wav + bgm.json)
//        npm run video -- storyboard <slug>   (overlay-timeline.json scenes -> preview/storyboard-sheet.jpg)
// Generate-mode spec: docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md (ADR-0025)
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv } from 'node:util';
import { runBgm } from './lib/bgm.mjs';
import { GENERATE_TEMPLATE, briefStub, voiceStep } from './lib/generate.mjs';
import { applyMigration, formatPlan, planMigration } from './lib/migrate-sources.mjs';
import { runStoryboard } from './lib/storyboard.mjs';
import { buildCutPlan, loudnessArgs, parseLoudnorm, validateCutList } from './lib/cut-plan.mjs';
import { SOURCES_DIR, formatSources, probeMedia, readManifest, removeSource, setSource, sourceFile, syncManifest, writeManifest } from './lib/video-sources.mjs';

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

// The project's time base: processed.mp4 (edit) or processed-audio.wav, the voiceover (generate).
export function resolveDuration({ duration, dir, probe = probeDuration, media = 'processed.mp4' }) {
  if (duration !== undefined) {
    const d = Number(duration);
    if (!(d > 0)) throw new Error('--duration must be > 0');
    return d;
  }
  const file = join(dir, media);
  return existsSync(file) ? probe(file) : 10;
}

const hasEntry = (p) => { try { lstatSync(p); return true; } catch { return false; } };

export function scaffold({ slug, root = '.', duration, probe, generate = false }) {
  const dir = projectDir(slug, root);
  if (generate && hasEntry(dir)) throw new Error(`${dir} already exists; generate mode starts a new project`);
  const index = join(dir, 'index.html');
  if (hasEntry(index)) throw new Error(`${index} already exists; refusing to overwrite`);
  mkdirSync(join(dir, 'compositions', 'broll'), { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });
  mkdirSync(join(dir, SOURCES_DIR), { recursive: true });
  if (!hasEntry(join(dir, 'sources.json'))) writeManifest(dir, { version: 1, sources: [] });
  if (generate) {
    mkdirSync(join(dir, 'research'), { recursive: true });
    writeFileSync(join(dir, 'creative-brief.md'), briefStub(slug));
  }
  const d = resolveDuration({ duration, dir, probe, media: generate ? 'processed-audio.wav' : 'processed.mp4' });
  const tpl = join(root, generate ? GENERATE_TEMPLATE : TEMPLATE);
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
      throw new Error(`unknown command "${cmd}" (use new, sources, cut, voice, bgm, storyboard, check, dev, snapshot, render, cutout, layers, migrate-sources)`);
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

/* layers: the source of a parallax photo scene and its matted subject. The source is a frame of
   processed.mp4 (--at) or the user's image (--image); remove-background cuts the person out. The
   background plate (the hole filled) is a separate Codex step, see asset-production.md. */
export function layersPlan(slug, { at, image, name, root = '.', probe = probeDuration }) {
  const dir = projectDir(slug, root);
  if ((at === undefined) === (image === undefined)) throw new Error('give exactly one of --at <seconds> or --image <file>');
  if (typeof name !== 'string' || !CUTOUT_NAME_RE.test(name)) throw new Error('--name must look like NN-name (for example 05-scene)');
  let input, seek = [];
  if (at !== undefined) {
    const t = Number(at);
    if (!Number.isFinite(t) || t < 0) throw new Error('--at must be a number of seconds >= 0');
    input = join(dir, 'processed.mp4');
    if (!existsSync(input)) throw new Error(`${input} not found; --at takes a frame from the processed video`);
    const total = probe(input);
    if (t >= total) throw new Error(`--at ${t} s is past the end of processed.mp4 (${total} s)`);
    seek = ['-ss', String(t)];
  } else {
    if (!/\.(png|jpe?g|webp)$/i.test(image)) throw new Error('--image must be a .png, .jpg, .jpeg, or .webp file');
    if (!existsSync(image)) throw new Error(`${image} not found`);
    input = image;
  }
  const src = join(dir, 'assets', 'layers', `${name}-src.png`);
  const fg = join(dir, 'assets', 'layers', `${name}-fg.png`);
  return {
    src,
    fg,
    cmds: [
      ['ffmpeg', ['-y', '-loglevel', 'error', ...seek, '-i', input, '-frames:v', '1', src]],
      hf('remove-background', src, '-o', fg),
    ],
  };
}

export function main(argv, { run = spawnSync, env = process.env, root = '.', fetchImpl = fetch } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      at: { type: 'string' }, blur: { type: 'boolean', default: false }, duration: { type: 'string' },
      from: { type: 'string' }, dur: { type: 'string' }, name: { type: 'string' },
      image: { type: 'string' },
      'add-shared': { type: 'string' }, set: { type: 'string' }, role: { type: 'string' }, note: { type: 'string' },
      detected: { type: 'boolean', default: false }, remove: { type: 'string' }, apply: { type: 'boolean', default: false },
      generate: { type: 'boolean', default: false }, preset: { type: 'string' }, track: { type: 'string' },
    },
  });
  const [cmd, slug] = positionals;
  if (cmd === 'migrate-sources') {
    const plan = planMigration(root);
    console.log(formatPlan(plan));
    if (!values.apply) {
      console.log('dry run; add --apply to migrate');
      return;
    }
    applyMigration(root, plan, { probe: (f, k) => probeMedia(f, k, run) });
    console.log('migrated');
    return;
  }
  if (cmd === 'new') {
    const { dir, duration } = scaffold({ slug, root, duration: values.duration, generate: values.generate });
    console.log(`created ${dir} (${duration} s${values.generate ? ', generate mode' : ''})`);
    return;
  }
  if (cmd === 'voice' || cmd === 'bgm' || cmd === 'storyboard') {
    const dir = projectDir(slug, root);
    if (!existsSync(dir)) throw new Error(`${dir} not found; run npm run video -- new ${slug} --generate`);
    // every child process (uv, whisper, ffmpeg, npx) runs without Gemini keys (RD-02-24); fetch gets the key itself
    const childEnv = { ...env };
    delete childEnv.GEMINI_API_KEY;
    delete childEnv.GEMINI_TTS_API_KEY;
    const childRun = (c, a, o = {}) => run(c, a, { ...o, env: o.env ?? childEnv });
    if (cmd === 'voice') {
      // .env is read into this call's env only; process.env (and every child process) stays as it was
      const fileEnv = existsSync(join(root, '.env')) ? parseEnv(readFileSync(join(root, '.env'), 'utf8')) : {};
      return voiceStep({ dir, root, preset: values.preset, env: { ...fileEnv, ...env }, fetchImpl, run: childRun }).then((meta) => {
        console.log(`voice ${join(dir, 'processed-audio.wav')} (${meta.duration} s, preset ${meta.preset}${meta.alignment ? `, WER ${meta.alignment.wer}` : ''})`);
        for (const w of meta.warnings) console.log(`warning: ${w}`);
        return meta;
      });
    }
    if (cmd === 'bgm') {
      if (!values.track) throw new Error('bgm needs --track <id> (npm run music -- list)');
      const meta = runBgm({ dir, root, trackId: values.track, from: values.from ?? 0, run: childRun });
      console.log(`bgm ${join(dir, 'bgm.wav')} (${meta.track} from ${meta.from} s, ${meta.copies} cop${meta.copies === 1 ? 'y' : 'ies'}, gain ${meta.gainDb} dB)`);
      return meta;
    }
    const r = runStoryboard({ dir, root, run: childRun, env: childEnv, log: console.log });
    console.log(`storyboard ${r.outs.join(', ')} (${r.scenes} scenes)`);
    return r;
  }
  if (cmd === 'sources') {
    const dir = projectDir(slug, root);
    if (!existsSync(dir)) throw new Error(`${dir} not found; run npm run video -- new ${slug}`);
    const probe = (f, k) => probeMedia(f, k, run);
    const addShared = (values['add-shared'] || '').split(',').map((x) => x.trim()).filter(Boolean);
    syncManifest({ dir, root, addShared, probe });
    if (values.set !== undefined) setSource(dir, values.set, { role: values.role, note: values.note, by: values.detected ? 'detected' : 'user' });
    if (values.remove !== undefined) removeSource(dir, values.remove);
    console.log(formatSources(readManifest(dir)));
    return;
  }
  if (cmd === 'cut') {
    const dir = projectDir(slug, root);
    const cutFile = join(dir, 'cut-list.json');
    if (!existsSync(cutFile)) throw new Error(`${cutFile} not found; the Story phase writes it first`);
    const manifest = readManifest(dir);
    const cutList = JSON.parse(readFileSync(cutFile, 'utf8'));
    const segs = validateCutList(cutList, manifest);
    const loudness = {};
    for (const id of new Set(segs.map((g) => g.source))) {
      const file = sourceFile(dir, manifest.sources.find((s) => s.id === id));
      const r = run('ffmpeg', loudnessArgs(file), { encoding: 'utf8', maxBuffer: 64 << 20 });
      if (r.status !== 0) throw new Error(`loudness pass failed for ${id} (${file})`);
      loudness[id] = parseLoudnorm(r.stderr);
    }
    const out = join(dir, 'processed.mp4');
    const part = `${out}.part`;
    const { args, cutMap } = buildCutPlan({ manifest, cutList, dir, loudness, out: part });
    rmSync(part, { force: true });
    const r = run('ffmpeg', args, { stdio: 'inherit', env });
    if (r.status !== 0) {
      rmSync(part, { force: true });
      throw new Error(`ffmpeg exited with ${r.status}; processed.mp4 was not changed`);
    }
    renameSync(part, out);
    const mapFile = join(dir, 'cut-map.json');
    writeFileSync(`${mapFile}.part`, `${JSON.stringify(cutMap, null, 2)}\n`);
    renameSync(`${mapFile}.part`, mapFile);
    console.log(`processed ${out} (${cutMap.duration} s from ${cutMap.segments.length} segments)`);
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
  if (cmd === 'layers') {
    const { src, fg, cmds } = layersPlan(slug, { ...values, root, probe: (f) => probeDuration(f, run) });
    mkdirSync(join(projectDir(slug, root), 'assets', 'layers'), { recursive: true });
    // never reuse old files: a failed step must not leave a stale source or subject behind
    rmSync(src, { force: true });
    rmSync(fg, { force: true });
    for (const [c, a] of cmds) {
      const r = run(c, a, { stdio: 'inherit', env });
      if (r.status !== 0) throw new Error(`${c} ${a.slice(0, 3).join(' ')} exited with ${r.status}`);
    }
    for (const f of [src, fg]) if (!existsSync(f) || statSync(f).size === 0) throw new Error(`layers did not write ${f}`);
    console.log(`layers ${src} + ${fg}`);
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
  const fail = (e) => {
    console.error(e.message);
    process.exit(1);
  };
  try {
    const r = main(process.argv.slice(2));
    if (r?.then) r.catch(fail); // video voice is async
  } catch (e) {
    fail(e);
  }
}
