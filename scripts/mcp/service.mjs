import { execFile } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createReadStream, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { scaffold } from '../video.mjs';
import { readManifest, sourceFile, isMedia } from '../lib/video-sources.mjs';
import { readFormat, isMusicFormat } from '../lib/formats.mjs';
import { loadVoices } from '../lib/voice/presets.mjs';
import { whisperWords } from '../lib/voice/align.mjs';
import { DOMAIN_PROMPT, WHISPER_BIN, WHISPER_MODEL } from '../lib/voice/whisper.mjs';
import { listTracks, readCatalog, setRejected } from '../lib/music.mjs';
import { receiveShared, deleteShared, sharedUsage } from '../studio/shared.mjs';
import { listVoiceTests, getVoiceTest, saveVoiceRatings } from '../studio/voice-tests.mjs';
import { listSessions, killSession, interruptSession, hasSession } from '../studio/sessions.mjs';
import { ReplizCalendar } from '../studio/calendar.mjs';
import { Jobs } from './jobs.mjs';
import { artifactPath, FILE_LIMIT, listFiles, MIME, pathFromUri, readFile, safePath, uriFor, writeArtifact } from './files.mjs';
import { ensureBuild, guardProject, hfCommand, localMedia, MUSIC_OPTIONS, musicAddCommand, projectPath, STYLES, VIDEO_ACTIONS, VIDEO_OPTIONS, videoCommand, VOICE_ACTIONS, VOICE_OPTIONS, voiceCommand } from './commands.mjs';
import { approval, bool, choice, confirm, integer, list, need, num, object, slug, str, validate } from './schema.mjs';

const execAsync = promisify(execFile);
const SECRETS = /KEY|TOKEN|SECRET|PASSWORD|ACCOUNT_ID/i;
export const INSTRUCTIONS = 'Use workspace_info, then read AGENTS.md and internal/docs/README.md. Read the owning workflow/HyperFrames skill before creative work. Story → Screen Plan → Build; QA only on request in a fresh-context subagent. Read upstream artifacts. Job start means accepted, never completed: poll job_get and inspect code/log. After render stop for human review. Gate decisions, remote Repliz sync, clone and publishing require explicit human confirmation plus approval_note. Never invent approval. Browser captures and AI image generation use the client tools. All paths are relative to the configured workspace; no arbitrary shell execution.';
export function redactor(env) {
  const values = Object.entries(env).filter(([k, v]) => SECRETS.test(k) && typeof v === 'string' && v.length >= 4).flatMap(([, v]) => [v, JSON.stringify(v).slice(1, -1)]).sort((a, b) => b.length - a.length);
  return (s) => {
    let text = String(s);
    for (const value of values) text = text.replaceAll(value, '[redacted]');
    return text.replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/=_-]+/g, '[redacted authorization]').replace(/\bvoice_[A-Za-z0-9_-]+/g, '[private voice id]');
  };
}
export function redactValue(value, redact, path = []) {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map((item, i) => redactValue(item, redact, [...path, i]));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const binary = typeof item === 'string' && ((key === 'data' && ['image', 'audio'].includes(value.type) && /^result\.content\.\d+$/.test(path.join('.'))) || (key === 'blob' && typeof value.uri === 'string' && typeof value.mimeType === 'string' && /^result\.contents\.\d+$/.test(path.join('.'))));
    return [redact(key), binary ? item : redactValue(item, redact, [...path, key])];
  }));
  return value;
}

export function createService({ root, env = process.env, readOnly = false, importRoots = [], jobs, timeoutMs } = {}) {
  root = realpathSync(resolve(root));
  const redact = redactor(env);
  jobs ??= new Jobs({ redact, timeoutMs });
  importRoots = importRoots.map((p) => realpathSync(resolve(p)));
  const cleanEnv = Object.fromEntries(Object.entries(env).filter(([k]) => !SECRETS.test(k) && !k.startsWith('REPLIZ_') && !k.startsWith('R2_')));
  delete cleanEnv.TMUX; delete cleanEnv.TMUX_PANE;
  const voiceEnv = { ...cleanEnv, ...(env.GEMINI_TTS_API_KEY ? { GEMINI_TTS_API_KEY: env.GEMINI_TTS_API_KEY } : {}) };
  const runFile = async (command, args) => {
    try { const r = await execAsync(command, args, { cwd: root, env: cleanEnv, timeout: 5000, maxBuffer: 4 << 20 }); return { code: 0, stdout: r.stdout, stderr: r.stderr }; }
    catch (e) { return { code: typeof e.code === 'number' ? e.code : 1, stdout: e.stdout || '', stderr: e.stderr || e.message }; }
  };
  const calendar = new ReplizCalendar({ root, env });
  const registry = new Map();
  const locks = new Set();
  const requestContext = new AsyncLocalStorage();
  function add(name, description, schema, handler, readonly = false, destructive = false) {
    registry.set(name, { definition: { name, description, inputSchema: schema, annotations: { readOnlyHint: readonly, destructiveHint: destructive, idempotentHint: readonly, openWorldHint: !readonly } }, handler });
  }
  const free = (key) => { if (jobs.busy(key)) throw new Error(`${key} job is already running`); };
  function ownership(name, a) {
    const projectOutput = (p) => /^videos\/([a-z0-9][a-z0-9-]*)(?:\/|$)/.exec(p ?? '')?.[1];
    if (name === 'media_import') return [a.destination === 'shared' ? 'shared-library' : `project:${a.slug}`];
    if (name === 'voice_run') { const p = a.action === 'say' && projectOutput(a.options?.out); return [...(p ? [`project:${p}`] : []), 'voice-library']; }
    if (name === 'asset_manage') { const p = a.action === 'process' && projectOutput(a.output); return [...(p ? [`project:${p}`] : []), ...(a.output?.startsWith('shared/') ? ['shared-library'] : []), 'asset-library']; }
    if (name === 'video_run') return [`project:${a.slug}`, ...(['cut'].includes(a.action) ? ['shared-library'] : []), ...(a.action === 'voice' ? ['voice-library'] : []), ...(['bgm', 'music'].includes(a.action) ? ['music-library'] : [])];
    if (['source_manage', 'transcribe', 'project_delete'].includes(name)) return [`project:${a.slug}`, 'shared-library'];
    if (name === 'preview_start') return [`preview:${a.slug}`];
    if (name === 'session_control') return [`session:${a.slug}`];
    if (name === 'job_cancel') return [];
    if (name.startsWith('voice_')) return ['voice-library'];
    if (name === 'music_manage') return ['music-library'];
    if (name === 'shared_delete') return ['shared-library'];
    if (name === 'style_examples') return ['style-examples', 'asset-library'];
    if (name === 'moodboard') return ['moodboard', 'asset-library'];
    if (name === 'template_run') return ['root-template'];
    if (name === 'sources_migrate') return ['source-migration'];
    if (name === 'tests_run') return ['tests'];
    if (name === 'studio_start') return ['studio'];
    return [a.slug ? `project:${a.slug}` : name];
  }
  // AsyncLocalStorage keeps each request's resolved ownership while copy streams
  // or other requests are running. Jobs inherit all reservations, not just a slug.
  const launch = (spec) => jobs.start({ key: spec.key, keys: requestContext.getStore() ?? [spec.key], steps: spec.steps ?? [{ command: process.execPath, args: [join(root, 'scripts', spec.script), ...spec.args] }], cwd: root, env: spec.env ?? (spec.secrets ? voiceEnv : cleanEnv), persistent: spec.persistent, onSuccess: spec.onSuccess });
  function library(area) {
    const dir = safePath(root, area, [area]);
    function walk(p) {
      if (!existsSync(p)) return;
      for (const entry of readdirSync(p, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new Error('library symlink is protected');
        if (entry.isDirectory()) walk(join(p, entry.name));
      }
    }
    walk(dir); return dir;
  }
  const docs = () => ['AGENTS.md', 'CLAUDE.md', 'README.md', ...['internal/docs', 'docs'].flatMap((area) => existsSync(join(root, area)) ? listFiles(root, area, { recursive: true, extensions: ['.md', '.json'] }).files.filter((f) => !f.directory).map((f) => f.path) : [])].filter((p) => existsSync(join(root, p)));
  function guardAllProjects() {
    const dir = safePath(root, 'videos', ['videos']);
    if (existsSync(dir)) for (const name of readdirSync(dir)) if (/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      const path = safePath(root, `videos/${name}`, [`videos/${name}`]);
      if (statSync(path).isDirectory()) guardProject(root, name, { legacy: true });
    }
  }

  add('workspace_info', 'Workspace, capabilities, setup status and workflow entrypoints. No credential values.', object(), () => ({ root, node: process.version, transport: 'stdio', readOnly, instructions: INSTRUCTIONS, tools: service.tools().map((t) => t.name), setup: { whisperBinary: existsSync(join(root, WHISPER_BIN)), whisperModel: existsSync(join(root, WHISPER_MODEL)), geminiTtsConfigured: Boolean(env.GEMINI_TTS_API_KEY), replizConfigured: Boolean(env.REPLIZ_API_BASE_URL && env.REPLIZ_ACCESS_KEY && env.REPLIZ_SECRET_KEY), importRoots }, docs: ['AGENTS.md', 'internal/docs/README.md', 'internal/docs/operations/mcp-runbook.md'], externalCreativeTools: ['client browser/screen capture', 'client image generation'] }), true);
  add('docs_list', 'Find canonical documents and workflow references by path substring.', object({ query: str(), limit: integer(1, 1000) }), (a) => ({ paths: docs().filter((p) => !a.query || p.toLowerCase().includes(a.query.toLowerCase())).slice(0, a.limit ?? 200) }), true);
  add('project_list', 'List local video projects, modes, formats and final render filenames.', object(), () => {
    const base = safePath(root, 'videos', ['videos']);
    const projects = existsSync(base) ? readdirSync(base).filter((name) => /^[a-z0-9][a-z0-9-]*$/.test(name) && !lstatSync(join(base, name)).isSymbolicLink() && existsSync(join(base, name, 'index.html'))).sort().map((name) => {
      const dir = guardProject(root, name), brief = existsSync(join(dir, 'creative-brief.md')) ? readFileSync(join(dir, 'creative-brief.md'), 'utf8') : '';
      return { slug: name, mode: /^\s*-\s*mode:\s*generate\b/m.test(brief) ? 'generate' : 'edit', format: readFormat(dir), renders: existsSync(join(dir, 'renders')) ? readdirSync(safePath(root, `videos/${name}/renders`, [`videos/${name}`])).filter((f) => /^[^.].*\.mp4$/.test(f)) : [] };
    }) : [];
    return { projects };
  }, true);
  add('project_create', 'Scaffold an edit or generate project using the existing Dena starter.', object({ slug, mode: choice('edit', 'generate'), format: choice('explainer', 'kinetic-post', 'motion-short'), duration: num(0.1, 3600) }, ['slug']), (a) => {
    safePath(root, `videos/${a.slug}`, [`videos/${a.slug}`]); free(`project:${a.slug}`);
    if (existsSync(join(root, 'videos', a.slug))) throw new Error('project already exists');
    if (a.mode !== 'generate' && a.format) throw new Error('format requires generate mode');
    const r = scaffold({ root, slug: a.slug, generate: a.mode === 'generate', format: a.format, duration: a.duration });
    return { slug: a.slug, mode: a.mode ?? 'edit', format: r.format, duration: r.duration, path: `videos/${a.slug}` };
  });
  add('project_status', 'Read sources, renders, artifacts and saved gate decisions; gate_status recomputes fingerprints.', object({ slug }, ['slug']), (a) => {
    const dir = guardProject(root, a.slug);
    return { slug: a.slug, format: readFormat(dir), sources: readManifest(dir).sources, files: listFiles(root, `videos/${a.slug}`, { recursive: true }), gates: existsSync(join(dir, 'gates.json')) ? JSON.parse(readFile(root, `videos/${a.slug}/gates.json`).text) : null, activeJobs: jobs.list().filter((j) => j.key === `project:${a.slug}`) };
  }, true);
  add('project_delete', 'Delete only this project after explicit human confirmation. Refuses active jobs or tmux sessions.', object({ slug, ...approval }, ['slug']), async (a) => {
    confirm(a); free(`project:${a.slug}`); const dir = guardProject(root, a.slug);
    if (await hasSession(a.slug, { run: runFile })) throw new Error('project has a tmux session; stop it explicitly first');
    rmSync(dir, { recursive: true }); return { deleted: a.slug };
  }, false, true);
  add('file_list', 'List allowed documentation, project, shared-media or asset-library files; skips hidden files and symlinks.', object({ path: str(), recursive: bool, limit: integer(1, 1000) }, ['path']), (a) => listFiles(root, a.path, a), true);
  add('file_read', 'Read text/artifact or a small image; large media returns a resource link for local viewing.', object({ path: str() }, ['path']), (a) => {
    const f = readFile(root, a.path);
    if (f.text !== undefined) return { ...f, text: redact(f.text) };
    const { blob, ...info } = f;
    return { content: blob ? [{ type: 'image', mimeType: f.mimeType, data: blob }] : [{ type: 'resource_link', name: a.path, uri: f.uri, mimeType: f.mimeType, size: f.bytes }], structuredContent: info };
  }, true);
  add('artifact_write', 'Atomically write a creative project text/JSON/SVG artifact. Existing files require expected_sha256. Composition writes require handoffs and automatically start check.', object({ slug, path: str(), content: str({ minLength: 0, maxLength: FILE_LIMIT }), expected_sha256: str({ pattern: '^[a-f0-9]{64}$' }) }, ['slug', 'path', 'content']), (a) => {
    guardProject(root, a.slug); free(`project:${a.slug}`); artifactPath(root, a.slug, a.path);
    const composition = /\.(html|css|js)$/i.test(a.path);
    if (composition) ensureBuild(root, a.slug);
    // Check capacity before changing content, so a failed dispatch cannot silently skip required validation.
    if (composition && jobs.list().filter((j) => ['running', 'cancelling', 'timing_out'].includes(j.status)).length >= 4) throw new Error('at most 4 jobs may run concurrently; wait before writing a composition');
    const result = writeArtifact(root, a.slug, a.path, a.content, a.expected_sha256);
    if (composition) result.check = launch({ key: `project:${a.slug}`, script: 'video.mjs', args: ['check', a.slug] });
    return result;
  });
  add('media_import', 'Copy local media into project sources/assets or shared. External files must be under a configured --import-root. Never overwrites.', object({ input: str(), destination: choice('sources', 'assets', 'shared'), slug, name: str({ pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$', maxLength: 120 }) }, ['input', 'destination']), async (a) => {
    let input;
    if (a.input.startsWith('/')) {
      input = realpathSync(a.input);
      if (!importRoots.some((p) => input.startsWith(p + '/'))) throw new Error('external media is outside configured import roots');
    } else input = localMedia(root, a.input);
    const name = a.name ?? input.split('/').at(-1);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || !/\.(mp4|mov|m4v|webm|png|jpe?g|webp|wav|mp3|m4a|ogg)$/i.test(name) || extname(name).toLowerCase() !== extname(input).toLowerCase()) throw new Error('invalid media filename/extension');
    if (!statSync(input).isFile()) throw new Error('input must be a regular file');
    if (a.destination === 'sources') {
      need(a, 'slug'); guardProject(root, a.slug); free(`project:${a.slug}`);
      if (!isMedia(name)) throw new Error('sources accept video/image only; use assets for audio');
      const file = safePath(root, `videos/${a.slug}/sources/${name}`, [`videos/${a.slug}`]);
      await copyMedia(input, file);
      return { path: `videos/${a.slug}/sources/${name}`, sync: launch({ key: `project:${a.slug}`, script: 'video.mjs', args: ['sources', a.slug] }) };
    }
    if (a.destination === 'shared' && isMedia(name)) {
      library('shared'); free('shared-library');
      const saved = await receiveShared(root, name, createReadStream(input));
      return { path: `shared/${saved}` };
    }
    const base = a.destination === 'shared' ? 'shared/imports' : (need(a, 'slug'), guardProject(root, a.slug), free(`project:${a.slug}`), `videos/${a.slug}/assets`);
    if (a.destination === 'shared') { library('shared/imports'); free('shared-library'); }
    const path = `${base}/${name}`;
    await copyMedia(input, safePath(root, path, [base])); return { path };
  });
  add('shared_list', 'List reusable footage/images with project usage; no media probing or remote calls.', object(), () => {
    guardAllProjects();
    const dir = library('shared');
    return { files: existsSync(dir) ? readdirSync(dir).filter(isMedia).map((name) => ({ name, bytes: statSync(join(dir, name)).size, projects: sharedUsage(root, name) })) : [] };
  }, true);
  add('shared_delete', 'Delete unused reusable footage/image after explicit human confirmation.', object({ name: str({ pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' }), ...approval }, ['name']), (a) => { confirm(a); guardAllProjects(); library('shared'); free('shared-library'); return deleteShared(root, a.name); }, false, true);
  add('source_manage', 'Synchronize, attach shared sources, set source role/note, or remove a project source using the owner CLI.', object({ slug, action: choice('sync', 'attach', 'set', 'remove'), names: list(str({ pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' })), id: slug, role: choice('speech', 'broll', 'image', 'auto'), note: str({ minLength: 0, maxLength: 500 }), ...approval }, ['slug', 'action']), (a) => {
    guardProject(root, a.slug); const args = ['sources', a.slug];
    if (a.action === 'attach') { need(a, 'names'); if (!a.names.length) throw new Error('names must not be empty'); library('shared'); for (const n of a.names) localMedia(root, `shared/${n}`, ['shared']); args.push('--add-shared', a.names.join(',')); }
    if (a.action === 'set') { need(a, 'id'); if (a.role === undefined && a.note === undefined) throw new Error('set needs role or note'); args.push('--set', a.id); if (a.role) args.push('--role', a.role); if (a.note !== undefined) args.push('--note', a.note); }
    if (a.action === 'remove') { confirm(a); need(a, 'id'); args.push('--remove', a.id); }
    return launch({ key: `project:${a.slug}`, script: 'video.mjs', args });
  });
  add('video_run', 'Run a typed video operation as a job. Build operations require upstream handoffs. Poll job_get to completion.', object({ slug, action: choice(...VIDEO_ACTIONS), options: VIDEO_OPTIONS }, ['slug', 'action']), (a) => {
    if (['bgm', 'music'].includes(a.action)) library('shared/music');
    if (a.action === 'voice') { library('shared/voices'); checkVoiceRefs(); }
    return launch({ ...videoCommand(root, a), secrets: a.action === 'voice' });
  });
  add('gate_status', 'Recompute generate gate readiness/fingerprints through the CLI, as a local job.', object({ slug }, ['slug']), (a) => { guardProject(root, a.slug); return launch({ key: `project:${a.slug}`, script: 'video.mjs', args: ['gate', a.slug] }); });
  add('gate_decide', 'Record the user decision at a generate gate through the owner CLI; never infer approval.', object({ slug, gate: integer(1, 3), decision: choice('approve', 'revise', 'qa'), ...approval }, ['slug', 'gate', 'decision']), (a) => { confirm(a); guardProject(root, a.slug); return launch({ key: `project:${a.slug}`, script: 'video.mjs', args: ['gate', a.slug, a.decision, String(a.gate), '--note', a.approval_note] }); });
  add('voice_presets', 'List configured TTS presets without private voice IDs.', object(), () => { checkVoiceRefs(); return { presets: Object.entries(loadVoices(root).presets).map(([name, p]) => ({ name, provider: p.provider, language: p.language ?? null, hasReference: Boolean(p.voiceRef) })) }; }, true);
  add('voice_run', 'TTS, reference extraction, voice design/clone, prebuilt voice listing, or blind listening test jobs. Clone requires human confirmation and consent audio.', object({ action: choice(...VOICE_ACTIONS), options: VOICE_OPTIONS, ...approval }, ['action']), (a) => { if (a.action === 'clone') confirm(a); library('shared/voices'); library('shared/voice-tests'); checkVoiceRefs(); if (a.action === 'test-build') checkListeningConfig(); return launch(voiceCommand(root, a)); });
  add('voice_tests_read', 'List/get blind listening tests without exposing identity keys.', object({ run: str() }), (a) => { library('shared/voice-tests'); return a.run ? getVoiceTest(root, a.run) : { runs: listVoiceTests(root) }; }, true);
  add('voice_tests_rate', 'Save human listening scores to an existing blind run.', object({ run: str({ pattern: '^\\d{8}-\\d{4}$' }), ratings: list(object({ label: str({ pattern: '^[A-Z]$' }), natural: integer(1, 5), pronunciation: integer(1, 5), register: integer(1, 5), endurance: integer(1, 5), similarity: integer(1, 5), note: str({ minLength: 0, maxLength: 2000 }) }, ['label'])) }, ['run', 'ratings']), (a) => { library('shared/voice-tests'); free('voice-library'); const ratings = {}; for (const { label, ...rating } of a.ratings) { if (Object.hasOwn(ratings, label)) throw new Error('duplicate rating label'); ratings[label] = rating; } return saveVoiceRatings(root, a.run, { ratings }); });
  add('music_list', 'Query licensed local music catalog with mood/duration filters.', object({ mood: str(), min_duration: num(), include_rejected: bool }), (a) => { library('shared/music'); return { tracks: listTracks(readCatalog(root), { mood: a.mood, minDur: a.min_duration, includeRejected: a.include_rejected }) }; }, true);
  add('music_manage', 'Check/add licensed music, or mark a track rejected. Use local imported audio and a license proof/source URL.', object({ action: choice('check', 'add', 'reject'), options: MUSIC_OPTIONS, id: slug, rejected: bool }, ['action']), (a) => {
    library('shared/music'); free('music-library');
    if (a.action === 'reject') { need(a, 'id', 'rejected'); return setRejected(root, a.id, a.rejected); }
    return launch(a.action === 'add' ? musicAddCommand(root, a.options ?? {}) : { key: 'music-library', script: 'music.mjs', args: ['check'] });
  });
  add('asset_search', 'Search reusable asset catalog by tag/text, kind or style with license metadata.', object({ query: str(), kind: str(), style: choice(...STYLES), limit: integer(1, 200) }), (a) => {
    const catalog = JSON.parse(readFile(root, 'vendor/asset-lib/catalog.json').text);
    const hits = catalog.filter((item) => (!a.query || JSON.stringify(item).toLowerCase().includes(a.query.toLowerCase())) && (!a.kind || item.kind === a.kind) && (!a.style || item.styles?.includes(a.style)));
    return { total: hits.length, assets: hits.slice(0, a.limit ?? 50) };
  }, true);
  add('asset_manage', 'Build/check asset library, fetch pinned third-party inputs, render contact sheets, or process a local image.', object({ action: choice('build', 'check', 'fetch', 'process', 'sheets'), category: choice('icons', 'pictograms', 'fonts', 'maps', 'textures'), input: str(), output: str(), max: integer(64, 4096) }, ['action']), (a) => {
    library('vendor/asset-lib'); const args = [a.action]; let key = 'asset-library';
    if (a.action === 'sheets') library('docs/agents/references/asset-catalog');
    if (a.action === 'fetch') { need(a, 'category'); args.push(a.category); }
    if (a.action === 'process') { need(a, 'input', 'output'); const input = localMedia(root, a.input); const output = safePath(root, a.output, ['videos', 'shared/imports']); if (!/\.(png|webp)$/.test(output)) throw new Error('output must be png/webp'); const project = /^videos\/([^/]+)\//.exec(a.output); if (project) { guardProject(root, project[1]); key = `project:${project[1]}`; } args.push(input, output); if (a.max) args.push('--max', String(a.max)); }
    return launch({ key, script: 'asset-lib.mjs', args });
  });
  add('style_examples', 'Build/check example hosts or verify HyperFrames style/broll/craft examples.', object({ action: choice('build', 'check', 'verify-style', 'verify-broll', 'verify-craft'), style: choice(...STYLES) }, ['action']), (a) => {
    library('docs/agents/references/style-examples');
    library('renders');
    if (a.action === 'verify-broll') library('docs/agents/references/motion-broll-examples');
    if (a.action === 'verify-craft') library('docs/agents/references/craft-examples');
    const spec = { build: ['style-examples.mjs', ['build']], check: ['style-examples.mjs', ['check']], 'verify-style': ['check-style-examples.mjs', a.style ? [a.style] : []], 'verify-broll': ['check-broll-examples.mjs', []], 'verify-craft': ['check-broll-examples.mjs', ['docs/agents/references/craft-examples', 'craft-examples']] }[a.action];
    return launch({ key: 'style-examples', script: spec[0], args: spec[1] });
  });
  add('moodboard', 'Build/check studies or produce/fetch per-style reference sheets.', object({ action: choice('build', 'check', 'sheets', 'fetch'), style: choice(...STYLES) }, ['action']), (a) => { library('docs/agents/references/moodboard'); return launch({ key: 'moodboard', script: 'moodboard.mjs', args: [a.action, ...(a.style ? [a.style] : [])] }); });
  add('media_probe', 'Inspect local video/audio streams and duration with ffprobe as a job.', object({ path: str() }, ['path']), (a) => launch({ key: `probe:${a.path}`, steps: [{ command: 'ffprobe', args: ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', localMedia(root, a.path)] }] }), true);
  add('transcribe', 'Local word-level transcription of a manifest source or processed.mp4. Preserves raw Whisper JSON and writes the correct time-base artifact.', object({ slug, source_id: slug, processed: bool, language: str({ pattern: '^[a-z]{2,3}$' }), prompt: str(), ...approval }, ['slug']), (a) => transcribe(a));
  add('preview_start', 'Start a managed persistent HyperFrames preview; stop with job_cancel.', object({ slug }, ['slug']), (a) => { guardProject(root, a.slug); return launch({ key: `preview:${a.slug}`, steps: [hfCommand('preview', join(root, 'videos', a.slug))], persistent: true }); });
  add('studio_start', 'Start the existing Studio service as a managed persistent job; stop with job_cancel.', object({ port: integer(1024, 65535) }), (a) => launch({ key: 'studio', script: 'studio.mjs', args: ['--port', String(a.port ?? 4777)], env, persistent: true }));
  add('sessions_list', 'Read existing Studio tmux agent sessions; does not launch agents.', object(), () => listSessions({ run: runFile }), true);
  add('session_control', 'Interrupt or stop an existing Studio tmux session after human confirmation.', object({ slug, action: choice('interrupt', 'stop'), ...approval }, ['slug', 'action']), async (a) => { confirm(a); projectPath(root, a.slug); if (a.action === 'stop') await killSession(a.slug, { run: runFile }); else await interruptSession(a.slug, { run: runFile }); return { slug: a.slug, action: a.action }; }, false, true);
  add('tests_run', 'Run local project test suites with no live publishing calls.', object({ suite: choice('all', 'mcp', 'video', 'studio', 'repliz', 'voice', 'music', 'hooks', 'motion-kit', 'craft-kit', 'style-kit', 'asset-lib', 'render-blur') }, ['suite']), (a) => launch({ key: 'tests', steps: [{ command: 'npm', args: a.suite === 'all' ? ['test'] : ['run', `test:${a.suite}`] }] }));
  add('sources_migrate', 'Preview or apply the legacy raw/source layout migration. Apply requires explicit user confirmation.', object({ apply: bool, ...approval }), (a) => {
    if (a.apply) confirm(a);
    if (jobs.list().some((j) => ['running', 'cancelling', 'timing_out'].includes(j.status))) throw new Error('finish running jobs before migrating sources');
    library('shared'); library('raw');
    guardAllProjects();
    return launch({ key: 'source-migration', script: 'video.mjs', args: ['migrate-sources', ...(a.apply ? ['--apply'] : [])] });
  });
  add('template_run', 'Check, snapshot, preview or render the blank root HyperFrames template. Video projects use video_run.', object({ action: choice('check', 'snapshot', 'preview', 'render'), times: list(num()) }, ['action']), (a) => {
    safePath(root, 'index.html', ['index.html']); library('compositions'); library('renders'); library('snapshots');
    if (a.action === 'check') return launch({ key: 'root-template', steps: ['lint', 'validate', 'inspect'].map((cmd) => hfCommand(cmd)) });
    if (a.action === 'snapshot') { need(a, 'times'); if (!a.times.length) throw new Error('times must not be empty'); return launch({ key: 'root-template', steps: [hfCommand('snapshot', '--at', a.times.join(','))] }); }
    return launch({ key: 'root-template', steps: [hfCommand(a.action)], persistent: a.action === 'preview' });
  });
  add('hyperframes_help', 'Read pinned HyperFrames CLI docs or environment doctor output as a job.', object({ topic: choice('data-attributes', 'gsap', 'compositions', 'rendering', 'examples', 'troubleshooting', 'doctor') }, ['topic']), (a) => launch({ key: `help:${a.topic}`, steps: [a.topic === 'doctor' ? hfCommand('doctor', '--json') : hfCommand('docs', a.topic)] }), true);
  add('publish', 'Publish a reviewed nonempty render through existing Repliz/R2 CLI, or share the HyperFrames composition. Requires explicit human approval.', object({ slug, destination: choice('repliz', 'hyperframes'), file: str(), schedule_at: str(), force: bool, ...approval }, ['slug', 'destination']), (a) => {
    confirm(a); const dir = guardProject(root, a.slug); ensureBuild(root, a.slug);
    const path = a.file ?? `videos/${a.slug}/renders/${a.slug}.mp4`;
    const file = safePath(root, path, [`videos/${a.slug}/renders`]);
    if (!/\.mp4$/.test(file) || !statSync(file).isFile() || statSync(file).size === 0) throw new Error('publish needs a nonempty final render MP4');
    if (a.destination === 'hyperframes') return launch({ key: `project:${a.slug}`, steps: [{ ...hfCommand('publish'), cwd: dir }], env: cleanEnv });
    const args = ['--slug', dir, '--file', file, '--approved'];
    if (a.schedule_at) args.push('--schedule-at', a.schedule_at); if (a.force) args.push('--force');
    return launch({ key: `project:${a.slug}`, script: 'repliz-publish.mjs', args, env });
  });
  add('calendar_read', 'Read receipt calendar offline by default. sync=true calls Repliz and requires explicit user confirmation.', object({ month: str({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }), sync: bool, ...approval }, ['month']), async (a) => { if (a.sync) { confirm(a); if (readOnly) throw new Error('remote sync is disabled in read-only mode'); } guardAllProjects(); return calendar.read(a.month, { sync: a.sync ?? false }); }, true);
  add('job_list', 'List jobs owned by this server session.', object(), () => ({ jobs: jobs.list() }), true);
  add('job_get', 'Read job status, exit code and bounded sanitized log. succeeded with code 0 is the completion signal.', object({ id: str() }, ['id']), (a) => jobs.get(a.id), true);
  add('job_cancel', 'Cancel a server-owned job and terminate its process group. Does not touch independent tmux sessions.', object({ id: str() }, ['id']), (a) => jobs.cancel(a.id), false, true);
  add('skill_read', 'Read the project workflow router or installed HyperFrames skill/reference by name. Read references only when relevant.', object({ name: str({ pattern: '^[a-z0-9][a-z0-9-]*$' }), path: str() }, ['name']), (a) => {
    const area = a.name === 'dena-video-editing-workflow' ? join(root, 'docs/skills', a.name) : join(root, '.claude/skills', a.name);
    if (!existsSync(area)) throw new Error('skill is not installed in this project');
    if (lstatSync(area).isSymbolicLink() || realpathSync(dirname(area)) !== dirname(area)) throw new Error('skill path symlink is protected');
    const file = safePath(realpathSync(area), a.path ?? 'SKILL.md', ['SKILL.md', 'references']);
    if (statSync(file).size > FILE_LIMIT) throw new Error('skill reference exceeds 4 MiB');
    return { name: a.name, path: a.path ?? 'SKILL.md', text: readFileSync(file, 'utf8') };
  }, true);

  function checkVoiceRefs() {
    safePath(root, 'config/voices.json', ['config']);
    safePath(root, 'config/pronunciation.json', ['config']);
    if (!existsSync(join(root, 'config/voices.json'))) return;
    for (const p of Object.values(loadVoices(root).presets)) if (p.voiceRef) safePath(root, p.voiceRef, ['shared/voices']);
  }
  function checkListeningConfig() {
    const file = safePath(root, 'config/voice-test.json', ['config']);
    if (!existsSync(file)) return;
    const config = JSON.parse(readFileSync(file, 'utf8'));
    safePath(root, config.script, ['config', 'docs', 'videos']);
    if (config.ref) safePath(root, config.ref, ['shared/voices']);
    for (const screen of config.screens ?? []) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(screen.id)) throw new Error('invalid listening-test screen id');
      for (const voice of screen.voices ?? []) if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(voice)) throw new Error('invalid listening-test screen voice');
    }
  }
  async function copyMedia(input, output) {
    const { pipeline } = await import('node:stream/promises');
    const { createWriteStream } = await import('node:fs');
    mkdirSync(dirname(output), { recursive: true });
    if (existsSync(output) || existsSync(`${output}.part`)) throw new Error('destination already exists; media import never overwrites');
    try { await pipeline(createReadStream(input), createWriteStream(`${output}.part`, { flags: 'wx' })); renameSync(`${output}.part`, output); }
    finally { rmSync(`${output}.part`, { force: true }); }
  }
  function transcribe(a) {
    const dir = guardProject(root, a.slug);
    if (Boolean(a.processed) === Boolean(a.source_id)) throw new Error('choose exactly one of processed=true or source_id');
    let input, target, source;
    if (a.processed) { input = join(dir, 'processed.mp4'); target = 'processed-transcript.json'; source = 'processed.mp4'; }
    else {
      const s = readManifest(dir).sources.find((item) => item.id === a.source_id);
      if (!s || s.kind !== 'video') throw new Error('source_id must refer to a video in sources.json');
      input = sourceFile(dir, s); target = `transcripts/${s.id}.json`; source = s.id;
    }
    if (!existsSync(input) || !existsSync(join(root, WHISPER_BIN)) || !existsSync(join(root, WHISPER_MODEL))) throw new Error('input or local Whisper binary/model missing; read initial setup docs');
    if (existsSync(join(dir, target))) confirm(a);
    free(`project:${a.slug}`);
    const work = safePath(root, `videos/${a.slug}/transcripts/${a.processed ? 'processed' : a.source_id}-asr`, [`videos/${a.slug}`]);
    mkdirSync(work, { recursive: true });
    const wav = join(work, 'audio.wav'), base = join(work, 'whisper');
    return launch({ key: `project:${a.slug}`, steps: [
      { command: 'ffmpeg', args: ['-y', '-loglevel', 'error', '-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav] },
      { command: join(root, WHISPER_BIN), args: ['-m', join(root, WHISPER_MODEL), '-f', wav, '-l', a.language ?? 'id', '-nfa', '--dtw', 'large.v3.turbo', '-oj', '-ojf', '-of', base, '--prompt', a.prompt ?? DOMAIN_PROMPT, '-np'] },
    ], onSuccess: () => {
      const raw = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
      const words = whisperWords(raw);
      if (!words.length) throw new Error('Whisper produced no word timings; normalized transcript was not changed');
      const content = JSON.stringify({ source, language: a.language ?? 'id', timeBase: a.processed ? 'processed' : 'source', text: words.map((w) => w.text).join(' '), words, segments: (raw.transcription ?? []).map((s) => ({ text: s.text, start: s.offsets.from / 1000, end: s.offsets.to / 1000 })), raw: relative(dir, `${base}.json`) }, null, 2) + '\n';
      const f = join(dir, target); writeFileSync(`${f}.part`, content); renameSync(`${f}.part`, f);
    } });
  }

  const phaseDocs = { workflow_story: 'docs/agents/01-story.md', workflow_screen_plan: 'docs/agents/02-screen-plan.md', workflow_build: 'docs/agents/03-build.md', workflow_qa: 'docs/agents/04-qa.md' };
  const service = {
    root, jobs, redact, sanitize: (value) => redactValue(value, redact),
    tools: () => [...registry.values()].map((x) => x.definition).filter((d) => !readOnly || d.annotations.readOnlyHint),
    hasTool: (name) => registry.has(name) && (!readOnly || registry.get(name).definition.annotations.readOnlyHint),
    async call(name, args = {}) {
      if (!service.hasTool(name)) throw new Error('unknown or disabled tool');
      const tool = registry.get(name); validate(tool.definition.inputSchema, args);
      const keys = tool.definition.annotations.readOnlyHint ? [] : ownership(name, args);
      for (const key of keys) if (locks.has(key) || jobs.busy(key) || jobs.busy('source-migration')) throw new Error(`${key} mutation is already running`);
      if (name === 'sources_migrate' && locks.size) throw new Error('finish running mutations before migration');
      for (const key of keys) locks.add(key);
      try { return await requestContext.run(keys, () => tool.handler(args)); }
      finally { for (const key of keys) locks.delete(key); }
    },
    resources: () => docs().map((path) => ({ uri: uriFor(path), name: path, mimeType: MIME[extname(path)] ?? 'text/plain' })),
    resourceTemplates: () => [{ uriTemplate: 'dena://workspace/videos/{slug}/{path}', name: 'Project artifact', description: 'Read actual project text artifacts or small images.' }, { uriTemplate: 'dena://workspace/internal/docs/{path}', name: 'Canonical document' }],
    async resource(uri) {
      const f = readFile(root, pathFromUri(uri));
      if (f.text === undefined && f.blob === undefined) throw new Error('binary resource is too large or unsupported; use a local media viewer and the returned path');
      return { contents: [{ uri, mimeType: f.mimeType, ...(f.text !== undefined ? { text: redact(f.text) } : { blob: f.blob }) }] };
    },
    prompts: () => Object.keys(phaseDocs).map((name) => ({ name, description: `Load ${name.slice(9).replaceAll('_', ' ')} phase contract and project context`, arguments: [{ name: 'slug', required: true, description: 'Existing video project slug' }] })),
    prompt(name, args) {
      if (!Object.hasOwn(phaseDocs, name)) throw new Error('unknown prompt');
      validate(object({ slug }, ['slug']), args); projectPath(root, args.slug);
      const doc = readFile(root, phaseDocs[name]);
      const router = readFile(root, 'docs/skills/dena-video-editing-workflow/SKILL.md');
      return { description: name, messages: [{ role: 'user', content: { type: 'text', text: `${INSTRUCTIONS}\nProject: videos/${args.slug}/. Read its upstream artifacts; do not create missing decisions in a later phase. ${name === 'workflow_qa' ? 'Run QA only as a fresh-context subagent after the user chooses QA.' : ''}\n\n${router.text}\n\n${doc.text}` } }] };
    },
  };
  return service;
}
