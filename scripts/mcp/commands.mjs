// Typed adapters to existing CLI contracts. Keep business logic in its owning CLI.
import { dirname, join, relative } from 'node:path';
import { existsSync, readdirSync, lstatSync, realpathSync, readFileSync } from 'node:fs';
import { HYPERFRAMES } from '../video.mjs';
import { readManifest } from '../lib/video-sources.mjs';
import { readFormat, isMusicFormat } from '../lib/formats.mjs';
import { safePath } from './files.mjs';
import { bool, choice, confirm, integer, list, need, num, object, slug, str } from './schema.mjs';

export const VIDEO_ACTIONS = ['cut', 'check', 'snapshot', 'render', 'cutout', 'layers', 'voice', 'bgm', 'music', 'storyboard'];
export const VIDEO_OPTIONS = object({ from: num(), dur: num(0.001, 15), name: str({ pattern: '^\\d\\d-[a-z0-9][a-z0-9-]*$' }), image: str(), at: num(), times: list(num()), blur: bool, preset: slug, track: slug, bars: integer(1, 512), reference: bool });
export const VOICE_ACTIONS = ['say', 'ref', 'clone', 'design', 'voices', 'test-build', 'test-reveal'];
export const VOICE_OPTIONS = object({ preset: slug, text: str({ maxLength: 100000 }), file: str(), out: str(), recorded: str(), no_align: bool, from: str(), at: num(), dur: num(2, 30), name: slug, consent: str(), force: bool, prompt: str(), gender: choice('female', 'male', 'neutral'), language: str(), lang: str(), search: str(), seed: integer(0, 2147483647), only: choice('gemini', 'supertonic'), keep: integer(1, 100), run: str({ pattern: '^[A-Za-z0-9-]+$' }) });
export const MUSIC_OPTIONS = object({ input: str(), source: str(), license: choice('cc0', 'public-domain', 'pixabay', 'mixkit'), title: str(), author: str(), mood: str(), energy: integer(1, 5), notes: str({ minLength: 0 }), loopable: bool, content_id: choice('none', 'unknown', 'known'), proof: str() });
export const STYLES = ['broll-text', 'motion-graphic', 'whiteboard', 'stop-motion', 'vox', 'mix-media', 'parallax'];

export function projectPath(root, slugValue) {
  const dir = safePath(root, `videos/${slugValue}`, [`videos/${slugValue}`]);
  if (!existsSync(join(dir, 'index.html'))) throw new Error('project does not exist; use project_create first');
  return dir;
}
// Existing CLIs use fixed output subdirectories. Refuse planted links before dispatch.
// vendor is the scaffold's intentionally shared symlink and may only point to root/vendor.
export function guardProject(root, slugValue, { legacy = false } = {}) {
  const dir = legacy ? safePath(root, `videos/${slugValue}`, [`videos/${slugValue}`]) : projectPath(root, slugValue);
  function walk(folder) {
    for (const name of readdirSync(folder)) {
      const path = join(folder, name), st = lstatSync(path);
      if (st.isSymbolicLink()) {
        if (path === join(dir, 'vendor') && realpathSync(path) === realpathSync(join(root, 'vendor'))) continue;
        if (legacy && path === join(dir, 'source.mp4')) {
          const target = realpathSync(path), raw = safePath(root, 'raw', ['raw']);
          if (dirname(target) === raw && lstatSync(target).isFile() && /\.(mp4|mov|m4v)$/i.test(target)) continue;
        }
        throw new Error('project contains a protected symlink; remove the link before dispatch');
      }
      if (st.isDirectory()) walk(path);
    }
  }
  walk(dir);
  for (const s of readManifest(dir).sources) {
    if (!s || typeof s.path !== 'string') throw new Error('invalid source path');
    if (s.origin === 'shared' && /^\.\.\/\.\.\/shared\/[^/.][^/]*$/.test(s.path)) safePath(root, s.path.slice(6), ['shared']);
    else if (s.origin === 'project' && /^sources\/[^/.][^/]*$/.test(s.path)) safePath(root, `videos/${slugValue}/${s.path}`, [`videos/${slugValue}`]);
    else throw new Error('source manifest contains an outside or invalid source path');
  }
  return dir;
}
export function ensureBuild(root, slugValue) {
  const dir = projectPath(root, slugValue);
  const brief = existsSync(join(dir, 'creative-brief.md')) ? readFileSync(join(dir, 'creative-brief.md'), 'utf8') : '';
  const generate = /^\s*-\s*mode:\s*generate\b/m.test(brief);
  const music = generate && isMusicFormat(readFormat(dir));
  const required = ['creative-brief.md', 'metadata.json', 'visual-plan.md', 'overlay-timeline.json', 'publish-captions.md'];
  if (generate) required.push('script.md', 'processed-audio.wav', 'storyboard.md');
  else required.push('sources.json', 'processed.mp4', 'processed-transcript.json', 'cut-list.json', 'cut-map.json', 'edit-decision-notes.md');
  if (music) required.push('beats.json');
  else required.push('processed-transcript.json', 'caption-plan.md', 'caption-beats.json');
  const missing = [...new Set(required)].filter((p) => !existsSync(join(dir, p)));
  const visual = existsSync(join(dir, 'visual-plan.md')) ? readFileSync(join(dir, 'visual-plan.md'), 'utf8') : '';
  if (!new RegExp(`^##\\s+Gate ${music ? 1 : 2} Result\\b`, 'm').test(visual)) missing.push(`visual-plan.md: Gate ${music ? 1 : 2} Result`);
  if (missing.length) throw new Error(`missing upstream handoff artifacts: ${missing.join(', ')}. Read the workflow prompt and finish the owning phase first.`);
}
const flag = (args, key, value) => { if (value !== undefined && value !== false) args.push(`--${key}`, ...(value === true ? [] : [String(value)])); };
function only(options, allowed) {
  for (const key of Object.keys(options)) if (!allowed.includes(key)) throw new Error(`option ${key} is not valid for this action`);
}
export function localMedia(root, path, areas = ['shared', 'videos', 'references']) {
  const file = safePath(root, path, areas);
  if (!/\.(mp4|mov|m4v|webm|png|jpe?g|webp|wav|mp3|m4a|ogg)$/i.test(path)) throw new Error('input must be a supported media file');
  if (!existsSync(file)) throw new Error('media file does not exist');
  return file;
}
export function videoCommand(root, a) {
  guardProject(root, a.slug);
  const o = a.options ?? {}, args = [a.action, a.slug];
  const allowed = { cut: [], check: [], snapshot: ['times'], render: ['blur'], cutout: ['from', 'dur', 'name'], layers: ['at', 'image', 'name'], voice: ['preset'], bgm: ['track', 'from'], music: ['track', 'from', 'bars'], storyboard: ['reference'] };
  only(o, allowed[a.action]);
  if (['snapshot', 'render', 'cutout', 'layers', 'storyboard'].includes(a.action)) ensureBuild(root, a.slug);
  if (a.action === 'snapshot') { need(o, 'times'); if (!o.times.length) throw new Error('times must not be empty'); flag(args, 'at', o.times.join(',')); }
  if (a.action === 'cutout') need(o, 'from', 'dur', 'name');
  if (a.action === 'layers') { need(o, 'name'); if ((o.at === undefined) === (o.image === undefined)) throw new Error('layers needs exactly one of at or image'); if (o.image) o.image = localMedia(root, o.image); }
  if (a.action === 'bgm' || a.action === 'music') need(o, 'track');
  if (a.action === 'music') need(o, 'bars');
  for (const [k, v] of Object.entries(o)) if (k !== 'times') flag(args, k, v);
  return { key: `project:${a.slug}`, script: 'video.mjs', args };
}
function outputPath(root, path, areas) { return safePath(root, path, areas); }
export function voiceCommand(root, a) {
  const o = { ...(a.options ?? {}) };
  if (a.action === 'clone') confirm(a);
  const allowed = { say: ['preset', 'text', 'file', 'out', 'recorded', 'no_align'], ref: ['from', 'at', 'dur', 'name'], clone: ['consent', 'name', 'force'], design: ['name', 'prompt', 'gender', 'language', 'force'], voices: ['lang', 'search'], 'test-build': ['seed', 'only', 'keep'], 'test-reveal': ['run'] };
  only(o, allowed[a.action]);
  const args = a.action.startsWith('test-') ? ['test', a.action.slice(5)] : [a.action];
  if (a.action === 'say') {
    need(o, 'preset', 'out');
    if (!/^videos\/[a-z0-9][a-z0-9-]*\/voice(?:\/|$)/.test(o.out) && !/^shared\/voices\/[a-z0-9][a-z0-9-]*(?:\/|$)/.test(o.out)) throw new Error('say out must be videos/<slug>/voice[/subdir] or shared/voices/<name>[/subdir]');
    if (!o.recorded && (o.text === undefined) === (o.file === undefined)) throw new Error('say needs exactly one of text or file, or a recorded file');
    if (o.file) o.file = safePath(root, o.file, ['videos', 'docs']);
    o.out = outputPath(root, o.out, ['videos', 'shared/voices']);
  }
  if (a.action === 'ref') need(o, 'from', 'dur');
  if (a.action === 'clone') need(o, 'consent');
  if (a.action === 'design') need(o, 'name', 'prompt');
  for (const key of ['from', 'recorded', 'consent']) if (o[key]) o[key] = localMedia(root, o[key]);
  if (a.action === 'test-reveal') { need(o, 'run'); args.push(o.run); delete o.run; }
  safePath(root, 'shared/voices', ['shared/voices']); safePath(root, 'shared/voice-tests', ['shared/voice-tests']);
  if (o.name) safePath(root, `shared/voices/${o.name}`, ['shared/voices']);
  for (const [k, v] of Object.entries(o)) flag(args, k.replaceAll('_', '-'), v);
  const project = o.out && /^videos\/([^/]+)(?:\/|$)/.exec(relative(root, o.out));
  if (project) guardProject(root, project[1]);
  return { key: project ? `project:${project[1]}` : 'voice-library', script: 'voice.mjs', args, secrets: true };
}
export function musicAddCommand(root, options) {
  const o = { ...options }; need(o, 'input', 'source', 'license', 'title', 'author', 'mood', 'energy');
  // Download only HTTPS public URLs; local imports use the media tool. Redirected
  // remote URLs are not accepted here: use a browser/download tool then add locally.
  if (/^https?:\/\//i.test(o.input)) throw new Error('download music with the client browser first, import the local file, then add it with its license source URL');
  const input = localMedia(root, o.input); delete o.input;
  if (o.proof) o.proof = safePath(root, o.proof, ['videos', 'shared', 'references', 'docs']);
  safePath(root, 'shared/music/licenses', ['shared/music']);
  const args = ['add', input];
  for (const [k, v] of Object.entries(o)) flag(args, k.replaceAll('_', '-'), v);
  return { key: 'music-library', script: 'music.mjs', args };
}
export const hfCommand = (...args) => ({ command: 'npx', args: ['--yes', HYPERFRAMES, ...args] });
