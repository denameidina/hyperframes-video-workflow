import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedHosts, guardRequest, hasToken, parseRange, tokenCookie, tokenMatches } from './studio/http.mjs';
import { CLAUDE_ALIASES, EFFORTS, agentCommand, buildPrompt, claudeModels, codexDefaults, codexModels, paneCommand } from './studio/agent.mjs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FORMAT, hasSession, interruptSession, killSession, listSessions, parseSessions, sessionName, startSession } from './studio/sessions.mjs';
import { Readable } from 'node:stream';
import { safeMediaName, receiveFile, projectSlugs } from './studio/files.mjs';
import { deleteShared, listShared, sharedPath, sharedUsage } from './studio/shared.mjs';
import { attachShared, createProject, deleteProject, deleteSource, getProject, listProjects, rendersOf, updateSource, uploadSource } from './studio/projects.mjs';
import { syncManifest } from './lib/video-sources.mjs';
import { EventEmitter } from 'node:events';
import { Publisher, listResults, publishPreview, receiptStatus, renderPath } from './studio/results.mjs';
import { Terminals, VIEWER_RE, attachCommand } from './studio/terminal.mjs';
import { createServer } from 'node:http';
import { createApp } from './studio/app.mjs';
import { parseTailscaleStatus } from './studio.mjs';
import { STYLES, VoiceJobs, gateMessage, generateOptions, listGenerate, mdSection, storyboardRows, validateRequest } from './studio/generate.mjs';
import { JobRunner } from './studio/jobs.mjs';
import { readGates, recordDecision as record } from './lib/gates.mjs';

const HOSTS = allowedHosts({ addresses: ['127.0.0.1', '100.64.0.1'], port: 4777, names: ['mac.tail.ts.net'] });
const statusOf = (fn) => { try { fn(); return 0; } catch (e) { return e.status; } };

test('guardRequest accepts listen hosts and same-origin mutations', () => {
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: '127.0.0.1:4777' } }, HOSTS)), 0);
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: 'localhost:4777' } }, HOSTS)), 0);
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: 'mac.tail.ts.net:4777' } }, HOSTS)), 0);
  assert.equal(statusOf(() => guardRequest({ method: 'POST', headers: { host: '100.64.0.1:4777', origin: 'http://100.64.0.1:4777' } }, HOSTS)), 0);
});

test('guardRequest rejects foreign hosts and cross-origin mutations', () => {
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: 'evil.example:4777' } }, HOSTS)), 403);
  assert.equal(statusOf(() => guardRequest({ method: 'POST', headers: { host: '127.0.0.1:4777' } }, HOSTS)), 403);
  assert.equal(statusOf(() => guardRequest({ method: 'DELETE', headers: { host: '127.0.0.1:4777', origin: 'http://evil.example' } }, HOSTS)), 403);
});

test('token cookie gate', () => {
  assert.equal(hasToken({}, ''), true);
  assert.equal(hasToken({}, 's3cret'), false);
  assert.equal(hasToken({ cookie: `a=1; studio=${tokenCookie('s3cret')}` }, 's3cret'), true);
  assert.equal(hasToken({ cookie: 'studio=nope' }, 's3cret'), false);
  assert.equal(tokenMatches('s3cret', 's3cret'), true);
  assert.equal(tokenMatches('x', 's3cret'), false);
  assert.equal(tokenMatches('x', ''), false);
});

test('parseRange', () => {
  assert.equal(parseRange(undefined, 100), null);
  assert.deepEqual(parseRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.equal(parseRange('bytes=200-', 100), 'invalid');
});

test('agentCommand builds claude and codex argv', () => {
  assert.deepEqual(agentCommand({ runtime: 'claude', model: 'opus', effort: 'max' }), ['claude', '--model', 'opus', '--effort', 'max', '--dangerously-skip-permissions']);
  assert.deepEqual(agentCommand({ runtime: 'codex', model: 'gpt-6-sol', effort: 'xhigh' }), ['codex', '-m', 'gpt-6-sol', '-c', 'model_reasoning_effort="xhigh"', '--dangerously-bypass-approvals-and-sandbox', '--no-alt-screen']);
});

test('agentCommand rejects unsafe or unknown values', () => {
  assert.throws(() => agentCommand({ runtime: 'claude', model: 'opus; rm -rf ~', effort: 'high' }), { status: 400 });
  assert.throws(() => agentCommand({ runtime: 'codex', model: 'x', effort: 'turbo' }), { status: 400 });
  assert.throws(() => agentCommand({ runtime: 'bash', model: 'x', effort: 'high' }), { status: 400 });
});

test('paneCommand quotes argv and reads the prompt file', () => {
  assert.equal(paneCommand(['claude', '--model', "o'pus"], '.studio/prompts/a.md'), `'claude' '--model' 'o'\\''pus' "$(cat '.studio/prompts/a.md')"`);
});

test('buildPrompt points the agent at the project and its sources.json', () => {
  const p = buildPrompt({ mode: 'new', slug: 'a', notes: '  hook soal token ' });
  assert.equal(p.split('\n')[0], 'Edit video project `videos/a/` dari sumber di `videos/a/sources.json` (jalankan `npm run video -- sources a` dulu). Gunakan style yang sudah ada; serahkan ke agent Story untuk memilih dan memastikan hasil editing videonya bagus.');
  assert.doesNotMatch(p, /SKILL\.md|raw\//);
  assert.match(p, /Catatan dari Dena: hook soal token\n/);
  assert.match(p, /Jangan publish ke Repliz — publish dilakukan Dena dari Studio\.\n$/);
  const c = buildPrompt({ mode: 'continue', slug: 'a' });
  assert.match(c, /^Lanjutkan proyek `videos\/a\/` \(sumber di `sources\.json`\)/);
  assert.match(c, /Catatan dari Dena: -\n/);
});

test('codexDefaults reads top-level model and effort only', () => {
  assert.deepEqual(codexDefaults('model = "gpt-6-sol"\nmodel_reasoning_effort = "xhigh"\n[profiles.x]\nmodel = "other"\n'), { model: 'gpt-6-sol', effort: 'xhigh' });
  assert.deepEqual(codexDefaults(''), { model: '', effort: '' });
  assert.ok(CLAUDE_ALIASES.some((m) => m.value === 'opus'));
  assert.deepEqual(EFFORTS.codex, ['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
});

test('claudeModels: aliases, cached extra options, and the settings default', () => {
  const claudeJson = JSON.stringify({ additionalModelOptionsCache: [{ value: 'claude-fable-5-1[1m]', label: 'Fable', description: '1M' }, { value: 'bad; rm', label: 'x' }] });
  const m = claudeModels({ claudeJson, settings: JSON.stringify({ model: 'sonnet' }) });
  assert.deepEqual(m.models.map((x) => x.value), ['opus', 'sonnet', 'fable', 'haiku', 'claude-fable-5-1[1m]']);
  assert.equal(m.models[4].label, 'Fable (claude-fable-5-1[1m])');
  assert.equal(m.default, 'sonnet');
  assert.deepEqual(m.models[0].efforts, EFFORTS.claude);
  assert.equal(claudeModels({ claudeJson: 'not json' }).default, 'opus');
  assert.equal(claudeModels({ settings: JSON.stringify({ model: 'claude-opus-5-5' }) }).models.at(-1).value, 'claude-opus-5-5');
});

test('codexModels: listed models by priority with their own efforts', () => {
  const cache = JSON.stringify({ models: [
    { slug: 'gpt-6-sol', display_name: 'GPT-6-Sol', visibility: 'list', priority: 2, default_reasoning_level: 'low', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'xhigh' }, { effort: 'ultra' }] },
    { slug: 'gpt-6-astra', display_name: 'GPT-6-Astra', visibility: 'list', priority: 1, supported_reasoning_levels: [{ effort: 'medium' }] },
    { slug: 'codex-auto-review', visibility: 'hide', priority: 0 },
  ] });
  const m = codexModels({ cache, config: 'model = "gpt-6-sol"\nmodel_reasoning_effort = "xhigh"\n' });
  assert.deepEqual(m.models.map((x) => [x.value, x.label, x.efforts]), [['gpt-6-astra', 'GPT-6-Astra', ['medium']], ['gpt-6-sol', 'GPT-6-Sol', ['low', 'xhigh', 'ultra']]]);
  assert.deepEqual([m.default, m.defaultEffort, m.models[1].defaultEffort], ['gpt-6-sol', 'xhigh', 'low']);
  const bare = codexModels({ cache: '', config: 'model = "gpt-7"\n' });
  assert.deepEqual(bare.models.map((x) => x.value), ['gpt-7']);
  assert.deepEqual(codexModels({}), { models: [], default: '', defaultEffort: '' });
});

function fakeRun(responses = {}) {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push([cmd, ...args]);
    return responses[args[0]] || { code: 0, stdout: '', stderr: '' };
  };
  return { run, calls };
}

test('parseSessions keeps studio sessions and derives status', () => {
  const out = [
    'hanoman-1\t100\t0\t\t\t\t',
    'studio-a\t998\t0\tclaude\topus\thigh\t900',
    'studio-b\t990\t0\tcodex\tgpt-6-sol\txhigh\t900',
    'studio-c\t990\t1\tclaude\topus\thigh\t900',
  ].join('\n');
  assert.deepEqual(parseSessions(out, 1000).map((s) => [s.slug, s.status]), [['a', 'running'], ['b', 'idle'], ['c', 'exited']]);
  assert.deepEqual(parseSessions(out, 1000)[0], { slug: 'a', runtime: 'claude', model: 'opus', effort: 'high', started: 900, status: 'running' });
});

test('listSessions returns [] when no tmux server runs', async () => {
  const { run, calls } = fakeRun({ 'list-panes': { code: 1, stdout: '', stderr: 'no server running' } });
  assert.deepEqual(await listSessions({ run }), []);
  assert.deepEqual(calls[0], ['tmux', 'list-panes', '-a', '-F', FORMAT]);
});

test('startSession writes the prompt and starts a detached tmux session with metadata', async () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-'));
  const { run, calls } = fakeRun({ 'has-session': { code: 1, stdout: '', stderr: '' } });
  await startSession({ root, slug: 'my-vid', runtime: 'claude', model: 'opus', effort: 'high', prompt: 'Edit raw video\n', run, now: () => 1_000_000 });
  assert.equal(readFileSync(join(root, '.studio/prompts/my-vid.md'), 'utf8'), 'Edit raw video\n');
  const args = calls[1];
  assert.deepEqual(args.slice(0, 9), ['tmux', 'new-session', '-d', '-s', 'studio-my-vid', '-x', '120', '-y', '40']);
  assert.ok(args.includes(`'claude' '--model' 'opus' '--effort' 'high' '--dangerously-skip-permissions' "$(cat '.studio/prompts/my-vid.md')"`));
  for (const [key, value] of [['remain-on-exit', 'on'], ['@studio_runtime', 'claude'], ['@studio_started', '1000']]) {
    const i = args.indexOf(key);
    assert.ok(i > 0, key);
    assert.equal(args[i + 1], value);
  }
  assert.ok(!args.includes('@studio_raw'));
});

test('startSession refuses an existing session', async () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-'));
  const { run } = fakeRun();
  await assert.rejects(startSession({ root, slug: 'a', runtime: 'claude', model: 'opus', effort: 'high', prompt: 'x', run }), { status: 409 });
});

test('kill and interrupt target the exact session', async () => {
  const { run, calls } = fakeRun();
  await killSession('a', { run });
  await interruptSession('a', { run });
  assert.deepEqual(calls, [['tmux', 'kill-session', '-t', '=studio-a'], ['tmux', 'send-keys', '-t', '=studio-a:', 'Escape']]);
  assert.equal(sessionName('a'), 'studio-a');
  assert.equal(await hasSession('a', { run }), true);
});

const PROBE = (file, kind) => (kind === 'image' ? { width: 10, height: 20 } : { duration: 3, width: 1080, height: 1920, fps: 30, rotation: 0, hasAudio: true });
function studioRoot() {
  const root = mkdtempSync(join(tmpdir(), 'studio-'));
  mkdirSync(join(root, 'templates/dena-video'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-video/index.html'), '<div data-duration="__DURATION__">__SLUG__</div>');
  writeFileSync(join(root, 'templates/dena-video/hyperframes.json'), '{}');
  mkdirSync(join(root, 'shared'));
  writeFileSync(join(root, 'shared/intro.MP4'), 'I');
  writeFileSync(join(root, 'shared/logo.png'), 'L');
  writeFileSync(join(root, 'shared/.gitkeep'), '');
  const project = (slug, { files = [], shared = [], renders = [] } = {}) => {
    const dir = join(root, 'videos', slug);
    mkdirSync(join(dir, 'sources'), { recursive: true });
    mkdirSync(join(dir, 'renders'), { recursive: true });
    for (const f of files) writeFileSync(join(dir, 'sources', f), f);
    for (const r of renders) writeFileSync(join(dir, 'renders', r), 'R');
    syncManifest({ dir, root, addShared: shared, probe: PROBE });
  };
  project('vid-a', { files: ['take-1.mp4'], shared: ['intro.MP4'], renders: ['vid-a.mp4'] });
  project('vid-b', { files: ['take-1.mov', 'shot.jpg'] });
  return root;
}

function fakeChild() {
  const c = new EventEmitter();
  c.stdout = new EventEmitter();
  c.stderr = new EventEmitter();
  c.stdin = { writes: [], write(d) { this.writes.push(String(d)); } };
  c.pid = 4242;
  return c;
}

test('receiptStatus summarizes schedules', () => {
  assert.equal(receiptStatus(null), null);
  assert.deepEqual(
    receiptStatus({ createdAt: 't', schedules: [{ platform: 'youtube', status: 'pending' }, { platform: 'tiktok' }] }),
    { createdAt: 't', platforms: [{ platform: 'youtube', status: 'pending' }, { platform: 'tiktok', status: 'unknown' }] },
  );
});

test('listResults and renderPath', () => {
  const root = studioRoot();
  writeFileSync(join(root, 'videos/vid-a/repliz-publish.json'), JSON.stringify({ createdAt: 't', schedules: [{ platform: 'youtube', status: 'published' }] }));
  assert.deepEqual(listResults(root).map((r) => [r.slug, r.file, r.publish?.platforms[0].status]), [['vid-a', 'vid-a.mp4', 'published']]);
  assert.throws(() => renderPath(root, 'vid-a', '../../shared/intro.MP4'), { status: 404 });
});

test('publishPreview reads caption and configured targets', async () => {
  const root = studioRoot();
  writeFileSync(join(root, 'videos/vid-a/repliz-publish.json'), JSON.stringify({ post: { title: 'Judul', description: 'Deskripsi' } }));
  assert.deepEqual(await publishPreview(root, 'vid-a', 'vid-a.mp4', { REPLIZ_YOUTUBE_ACCOUNT_ID: 'y1' }), { slug: 'vid-a', file: 'vid-a.mp4', title: 'Judul', description: 'Deskripsi', targets: ['youtube'] });
});

test('Publisher runs repliz-publish with --approved and locks per slug', () => {
  const root = studioRoot();
  const spawned = [];
  const pub = new Publisher({ root, env: {}, spawnImpl: (cmd, args, opts) => { const c = fakeChild(); spawned.push({ cmd, args, opts, c }); return c; } });
  pub.start('vid-a', 'vid-a.mp4');
  assert.equal(spawned[0].cmd, process.execPath);
  assert.deepEqual(spawned[0].args, ['scripts/repliz-publish.mjs', '--slug', 'videos/vid-a', '--file', 'videos/vid-a/renders/vid-a.mp4', '--approved']);
  assert.equal(spawned[0].opts.cwd, root);
  assert.throws(() => pub.start('vid-a', 'vid-a.mp4'), { status: 409 });
  const seen = [];
  spawned[0].c.stdout.emit('data', Buffer.from('uploading\n'));
  pub.follow('vid-a', (event, data) => seen.push([event, data]));
  spawned[0].c.emit('close', 0);
  assert.deepEqual(seen, [['log', 'uploading\n'], ['done', { code: 0 }]]);
  pub.start('vid-a', 'vid-a.mp4');
  assert.equal(spawned.length, 2);
  assert.throws(() => pub.start('vid-a', 'nope.mp4'), { status: 404 });
});

test('attachCommand pipes through cat into script(1) and clamps size', () => {
  const [cmd, args] = attachCommand('vid-a', 9999, 'x');
  assert.equal(cmd, 'sh');
  assert.deepEqual(args, ['-c', `cat | script -q /dev/null sh -c 'stty rows 5 cols 400; exec tmux -u attach -t =studio-vid-a' 2>&1 | cat`]);
  assert.throws(() => attachCommand('Bad Slug', 80, 24));
});

test('Terminals relays data, writes input, and kills the process group on close', () => {
  const kills = [];
  const children = [];
  const t = new Terminals({
    spawnImpl: (cmd, args, opts) => { const c = fakeChild(); c.pid = 5000 + children.length; children.push({ c, opts }); return c; },
    killImpl: (pid, sig) => kills.push([pid, sig]),
  });
  const data = [];
  let exited = 0;
  const h = t.open('viewer-0001', 'vid-a', 80, 24, { onData: (b) => data.push(String(b)), onExit: () => exited++ });
  assert.equal(children[0].opts.detached, true);
  assert.equal(children[0].opts.env.TMUX, undefined);
  assert.equal(children[0].opts.env.TERM, 'xterm-256color');
  children[0].c.stdout.emit('data', Buffer.from('hello'));
  t.write('viewer-0001', 'ls\r');
  assert.deepEqual(data, ['hello']);
  assert.deepEqual(children[0].c.stdin.writes, ['ls\r']);
  const h2 = t.open('viewer-0001', 'vid-a', 100, 30, { onData() {}, onExit() {} }); // resize replaces the attach
  assert.deepEqual(kills, [[5000, 'SIGTERM']]);
  t.close(h); // stale handle: no second kill
  assert.deepEqual(kills, [[5000, 'SIGTERM']]);
  children[0].c.emit('exit');
  assert.equal(exited, 0); // closed on purpose: no exit event to the viewer
  t.close(h2);
  assert.deepEqual(kills, [[5000, 'SIGTERM'], [5001, 'SIGTERM']]);
  assert.throws(() => t.write('viewer-0001', 'x'), { status: 404 });
  assert.equal(VIEWER_RE.test('bad id'), false);
});

async function startApp(root, overrides = {}, responses = {}) {
  const fake = fakeRun({
    'list-panes': { code: 0, stdout: 'studio-vid-b\t0\t0\tclaude\topus\thigh\t1\n', stderr: '' },
    'has-session': { code: 1, stdout: '', stderr: '' },
    ...responses,
  });
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  server.on('request', createApp({
    root,
    env: {},
    hosts: allowedHosts({ addresses: ['127.0.0.1'], port }),
    token: '',
    tools: { tmux: true, claude: true, codex: true, ffprobe: true },
    models: async () => ({ codex: { models: [{ value: 'gpt-6-sol', label: 'GPT-6-Sol', efforts: ['low', 'ultra'] }], default: 'gpt-6-sol' } }),
    run: fake.run,
    terminals: new Terminals({ spawnImpl: () => fakeChild(), killImpl: () => {} }),
    publisher: new Publisher({ root, env: {}, spawnImpl: () => fakeChild() }),
    voiceJobs: new VoiceJobs({ root, env: {}, spawnImpl: () => fakeChild() }),
    probeSource: PROBE,
    ...overrides,
  }));
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, { method, headers: { origin: base, 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
  return { server, call, calls: fake.calls, base };
}

test('app token gate', async (t) => {
  const root = studioRoot();
  const { server, call } = await startApp(root, { token: 's3cret' });
  t.after(() => server.close());
  assert.equal((await call('GET', '/api/projects')).status, 401);
  assert.equal((await call('POST', '/login', { token: 'wrong' })).status, 401);
  const login = await call('POST', '/login', { token: 's3cret' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('GET', '/api/projects', undefined, { cookie })).status, 200);
});

test('app publish rejects a second run for the same slug', async (t) => {
  const root = studioRoot();
  const { server, call } = await startApp(root);
  t.after(() => server.close());
  assert.equal((await call('POST', '/api/results/vid-a/publish', { file: 'vid-a.mp4' })).status, 200);
  assert.equal((await call('POST', '/api/results/vid-a/publish', { file: 'vid-a.mp4' })).status, 409);
});

test('safeMediaName keeps a basename with a media extension', () => {
  assert.equal(safeMediaName('../../etc/DJI 01.MP4'), 'DJI_01.MP4');
  assert.equal(safeMediaName('.hidden.png'), 'hidden.png');
  assert.throws(() => safeMediaName('notes.txt'), { status: 400 });
  assert.throws(() => safeMediaName(''), { status: 400 });
});

test('receiveFile streams to a .part file, renames, refuses overwrite, and cleans up on failure', async () => {
  const root = studioRoot();
  const dir = join(root, 'shared');
  assert.equal(await receiveFile(dir, 'shared', 'new clip.mp4', Readable.from([Buffer.from('xy')])), 'new_clip.mp4');
  assert.equal(readFileSync(join(dir, 'new_clip.mp4'), 'utf8'), 'xy');
  await assert.rejects(receiveFile(dir, 'shared', 'new_clip.mp4', Readable.from([])), { status: 409, message: 'shared/new_clip.mp4 already exists' });
  const broken = new Readable({ read() { this.push('x'); this.destroy(new Error('client aborted')); } });
  await assert.rejects(receiveFile(dir, 'shared', 'c.mp4', broken), /client aborted/);
  assert.equal(existsSync(join(dir, '.c.mp4.part')), false);
  assert.equal(existsSync(join(dir, 'c.mp4')), false);
});

test('shared library lists usage and refuses to delete a used file', async () => {
  const root = studioRoot();
  const items = await listShared(root, { probe: async () => 4.5 });
  assert.deepEqual(items.map((f) => [f.name, f.kind, f.duration, f.projects]), [['intro.MP4', 'video', 4.5, ['vid-a']], ['logo.png', 'image', null, []]]);
  assert.deepEqual(sharedUsage(root, 'intro.MP4'), ['vid-a']);
  assert.throws(() => deleteShared(root, 'intro.MP4'), { status: 409, message: /videos\/vid-a/ });
  assert.deepEqual(deleteShared(root, 'logo.png'), { name: 'logo.png' });
  assert.equal(existsSync(join(root, 'shared/logo.png')), false);
  assert.throws(() => sharedPath(root, '../shared/intro.MP4'), { status: 400 });
  assert.throws(() => sharedPath(root, 'zzz.mp4'), { status: 404 });
  assert.deepEqual(projectSlugs(root), ['vid-a', 'vid-b']);
});

test('projects: list, create, sources, delete', async () => {
  const root = studioRoot();
  assert.deepEqual(listProjects(root).map((p) => [p.slug, p.counts, p.renders]), [
    ['vid-a', { speech: 0, broll: 0, image: 0, auto: 2 }, ['vid-a.mp4']],
    ['vid-b', { speech: 0, broll: 0, image: 1, auto: 1 }, []],
  ]);
  assert.deepEqual(rendersOf(root, 'vid-a'), ['vid-a.mp4']);

  assert.deepEqual(createProject(root, 'baru'), { slug: 'baru' });
  assert.ok(existsSync(join(root, 'videos/baru/index.html')));
  assert.deepEqual(getProject(root, 'baru').sources, []);
  assert.throws(() => createProject(root, 'baru'), { status: 409 });
  assert.throws(() => createProject(root, 'Bad Slug'), { status: 400 });
  assert.throws(() => getProject(root, 'nope'), { status: 404 });

  const up = await uploadSource(root, 'baru', 'take 2.MOV', Readable.from([Buffer.from('v')]), { probe: PROBE });
  assert.deepEqual([up.id, up.path, up.kind, up.role], ['u1', 'sources/take_2.MOV', 'video', null]);
  await assert.rejects(uploadSource(root, 'baru', 'bad.mp4', Readable.from([Buffer.from('v')]), { probe: () => { throw new Error('ffprobe could not read'); } }), { status: 400 });
  assert.equal(existsSync(join(root, 'videos/baru/sources/bad.mp4')), false, 'an unreadable upload is removed');

  const attached = attachShared(root, 'baru', ['logo.png', 'intro.MP4'], { probe: PROBE });
  assert.deepEqual(attached.map((s) => [s.id, s.origin]), [['u1', 'project'], ['i1', 'shared'], ['u2', 'shared']]);
  assert.throws(() => attachShared(root, 'baru', [], { probe: PROBE }), { status: 400 });
  assert.throws(() => attachShared(root, 'baru', ['nope.mp4'], { probe: PROBE }), { status: 400 });

  assert.deepEqual([updateSource(root, 'baru', 'u1', { role: 'speech', note: 'take utama' })].map((s) => [s.role, s.roleSource, s.note]), [['speech', 'user', 'take utama']]);
  assert.equal(updateSource(root, 'baru', 'u1', { role: 'auto' }).role, null);
  assert.throws(() => updateSource(root, 'baru', 'i1', { role: 'speech' }), { status: 400 });

  deleteSource(root, 'baru', 'u2');
  assert.ok(existsSync(join(root, 'shared/intro.MP4')), 'detaching keeps the shared file');
  deleteSource(root, 'baru', 'u1');
  assert.equal(existsSync(join(root, 'videos/baru/sources/take_2.MOV')), false);

  deleteProject(root, 'baru');
  assert.equal(existsSync(join(root, 'videos/baru')), false);
  assert.ok(existsSync(join(root, 'shared/logo.png')));
});

test('app projects, sources, shared, and sessions routes', async (t) => {
  const root = studioRoot();
  const { server, call, calls, base } = await startApp(root);
  t.after(() => server.close());
  assert.deepEqual((await call('GET', '/api/projects')).body.map((p) => p.slug), ['vid-a', 'vid-b']);
  assert.equal((await call('POST', '/api/projects', { slug: 'baru' })).status, 200);
  assert.equal((await call('POST', '/api/projects', { slug: 'baru' })).status, 409);

  const up = await fetch(`${base}/api/projects/baru/sources?name=${encodeURIComponent('take 1.mp4')}`, { method: 'POST', headers: { origin: base }, body: 'video' });
  assert.equal(up.status, 200);
  assert.equal((await up.json()).id, 'u1');
  assert.equal((await call('POST', '/api/projects/baru/shared', { names: ['logo.png'] })).status, 200);
  assert.equal((await call('PATCH', '/api/projects/baru/sources/u1', { role: 'speech', note: 'utama' })).body.roleSource, 'user');
  assert.equal((await call('PATCH', '/api/projects/baru/sources/i1', { role: 'speech' })).status, 400);
  const file = await fetch(`${base}/api/projects/baru/sources/u1/file`);
  assert.equal(await file.text(), 'video');
  assert.deepEqual((await call('GET', '/api/projects/baru')).body.sources.map((s) => s.id), ['u1', 'i1']);

  assert.equal((await call('DELETE', '/api/shared/logo.png')).status, 409);
  const sh = await fetch(`${base}/api/shared?name=new.png`, { method: 'POST', headers: { origin: base }, body: 'P' });
  assert.equal(sh.status, 200);
  assert.deepEqual((await call('GET', '/api/shared')).body.map((f) => f.name), ['intro.MP4', 'logo.png', 'new.png']);
  assert.equal((await call('DELETE', '/api/shared/new.png')).status, 200);

  assert.equal((await call('POST', '/api/sessions', { slug: 'nope', runtime: 'claude', model: 'opus', effort: 'high' })).status, 404);
  assert.equal((await call('POST', '/api/sessions', { slug: 'Bad', runtime: 'claude', model: 'opus', effort: 'high' })).status, 400);
  assert.equal((await call('GET', '/api/state')).body.models.codex.default, 'gpt-6-sol');
  const wrongEffort = await call('POST', '/api/sessions', { slug: 'baru', runtime: 'codex', model: 'gpt-6-sol', effort: 'high' });
  assert.deepEqual([wrongEffort.status, wrongEffort.body.error], [400, 'gpt-6-sol supports effort low, ultra']);
  const ok = await call('POST', '/api/sessions', { slug: 'baru', runtime: 'claude', model: 'opus', effort: 'high', notes: 'fokus hook' });
  assert.equal(ok.status, 200);
  assert.match(readFileSync(join(root, '.studio/prompts/baru.md'), 'utf8'), /^Edit video project `videos\/baru\/`[\s\S]*fokus hook/);
  writeFileSync(join(root, 'videos/baru/creative-brief.md'), 'brief');
  calls.length = 0;
  await call('POST', '/api/sessions', { slug: 'baru', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.match(readFileSync(join(root, '.studio/prompts/baru.md'), 'utf8'), /^Lanjutkan proyek `videos\/baru\/`/);

  assert.equal((await call('DELETE', '/api/projects/vid-b', undefined, { origin: 'http://evil.example' })).status, 403);
  assert.equal((await call('DELETE', '/api/projects/vid-b')).status, 200);
  assert.ok(calls.some((c) => c.join(' ') === 'tmux kill-session -t =studio-vid-b'));
  assert.equal(existsSync(join(root, 'videos/vid-b')), false);
  assert.equal((await call('GET', '/api/nope')).status, 404);
});

test('parseTailscaleStatus needs a running backend', () => {
  const self = { TailscaleIPs: ['100.76.52.99', 'fd7a::1'], DNSName: 'mac.tail.ts.net.' };
  assert.deepEqual(parseTailscaleStatus(JSON.stringify({ BackendState: 'Running', Self: self })), { ip: '100.76.52.99', names: ['mac.tail.ts.net', 'mac'] });
  assert.equal(parseTailscaleStatus(JSON.stringify({ BackendState: 'Stopped', Self: self })), null);
  assert.equal(parseTailscaleStatus(''), null);
});

function audioRoot() {
  const root = mkdtempSync(join(tmpdir(), 'studio-audio-'));
  const dir = join(root, 'shared/voice-tests/20260929-1430');
  mkdirSync(join(dir, 'samples'), { recursive: true });
  writeFileSync(join(dir, 'key.json'), JSON.stringify({ version: 1, run: '20260929-1430', seed: 7, labels: { A: { name: 'dena-clone' }, B: { name: 'supertonic:F2' } } }));
  writeFileSync(join(dir, 'samples/A.wav'), 'AAA');
  writeFileSync(join(dir, 'samples/B.wav'), 'BBB');
  writeFileSync(join(dir, 'ref.wav'), 'REF');
  writeFileSync(join(dir, 'script.md'), 'Halo semua.\n');
  mkdirSync(join(root, 'shared/voice-tests/not-a-run'), { recursive: true });
  mkdirSync(join(root, 'shared/music/licenses'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-quiet.mp3'), 'MP3');
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify({ version: 1, tracks: [{ id: 'm01-quiet', file: 'm01-quiet.mp3', title: 'Quiet', author: 'X', sourceUrl: 'https://freesound.org/s/1/', license: 'cc0', mood: ['reflektif'], energy: 2, duration: 90, contentIdRisk: 'none', rejected: false, notes: '' }] }));
  return root;
}

test('app voice-test routes serve samples and the reference only, and validate ratings', async (t) => {
  const root = audioRoot();
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  const list = await call('GET', '/api/voice-tests');
  assert.deepEqual(list.body, [{ id: '20260929-1430', labels: ['A', 'B'], hasRef: true, rated: false }]);
  const run = await call('GET', '/api/voice-tests/20260929-1430');
  assert.deepEqual([run.body.labels, run.body.script, run.body.ratings], [['A', 'B'], 'Halo semua.\n', null]);
  assert.doesNotMatch(JSON.stringify(run.body), /dena-clone|supertonic/);
  const a = await fetch(`${base}/api/voice-tests/20260929-1430/files/A.wav`);
  assert.deepEqual([a.status, a.headers.get('content-type'), await a.text()], [200, 'audio/wav', 'AAA']);
  assert.equal(await (await fetch(`${base}/api/voice-tests/20260929-1430/files/ref.wav`)).text(), 'REF');
  assert.equal((await fetch(`${base}/api/voice-tests/20260929-1430/files/key.json`)).status, 404);
  assert.equal((await fetch(`${base}/api/voice-tests/20260929-1430/files/Z.wav`)).status, 404);
  assert.equal((await call('GET', '/api/voice-tests/..%2Fx')).status, 400);
  assert.equal((await call('GET', '/api/voice-tests/20260101-0000')).status, 404);
  const saved = await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: { A: { natural: 4, note: 'hangat' }, B: { natural: 2 } } });
  assert.equal(saved.status, 200);
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'shared/voice-tests/20260929-1430/ratings.json'), 'utf8')).ratings.A, { natural: 4, pronunciation: null, register: null, similarity: null, endurance: null, note: 'hangat' });
  assert.equal((await call('GET', '/api/voice-tests')).body[0].rated, true);
  assert.equal((await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: { A: { natural: 6 } } })).status, 400);
  assert.equal((await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: { Z: {} } })).status, 400);
  assert.equal((await call('POST', '/api/voice-tests/20260929-1430/ratings', { ratings: {} }, { origin: 'http://evil.example' })).status, 403);
});

test('app music routes list, serve, and reject tracks', async (t) => {
  const root = audioRoot();
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  assert.deepEqual((await call('GET', '/api/music')).body.map((m) => [m.id, m.rejected]), [['m01-quiet', false]]);
  const f = await fetch(`${base}/api/music/m01-quiet/file`);
  assert.deepEqual([f.status, f.headers.get('content-type'), await f.text()], [200, 'audio/mpeg', 'MP3']);
  assert.equal((await call('POST', '/api/music/m01-quiet/reject', { rejected: true })).body.rejected, true);
  assert.equal(JSON.parse(readFileSync(join(root, 'shared/music/catalog.json'), 'utf8')).tracks[0].rejected, true);
  assert.equal((await call('POST', '/api/music/m01-quiet/reject', { rejected: 'yes' })).status, 400);
  assert.equal((await call('POST', '/api/music/nope/reject', { rejected: true })).status, 404);
  assert.equal((await fetch(`${base}/api/music/nope/file`)).status, 404);
});

// studioRoot plus the generate starter, voice presets, a music catalog, and a repurpose-able project
function genStudioRoot() {
  const root = studioRoot();
  mkdirSync(join(root, 'templates/dena-generate'), { recursive: true });
  writeFileSync(join(root, 'templates/dena-generate/index.html'), '<main data-composition-id="dena-__SLUG__" data-duration="__DURATION__"></main>');
  writeFileSync(join(root, 'templates/dena-generate/hyperframes.json'), '{}');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/voices.json'), JSON.stringify({ version: 1, default: 'st-f2', presets: { 'st-f2': { provider: 'supertonic', voice: 'F2' }, 'gm-a': { provider: 'gemini', model: 'gemini-3.8-flash-tts' }, recorded: { provider: 'recorded' } } }));
  mkdirSync(join(root, 'shared/music'), { recursive: true });
  writeFileSync(join(root, 'shared/music/m01-quiet.mp3'), 'MP3');
  writeFileSync(join(root, 'shared/music/catalog.json'), JSON.stringify({ version: 1, tracks: [
    { id: 'm01-quiet', file: 'm01-quiet.mp3', title: 'Quiet', mood: ['reflektif'], energy: 2, duration: 90, rejected: false },
    { id: 'm02-loud', file: 'm02-loud.mp3', title: 'Loud', mood: ['upbeat'], energy: 4, duration: 60, rejected: true },
  ] }));
  writeFileSync(join(root, 'videos/vid-a/processed-transcript.json'), '{"words":[]}');
  return root;
}

// a generate project at stage 'story' (brief only) or 'gate1' (script + voiceover); later gates are reached in the
// tests through recordDecision and real files, so their fingerprints are real
function genProject(root, slug, stage) {
  const dir = join(root, 'videos', slug);
  mkdirSync(join(dir, 'research'), { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), '# Creative Brief\n\n## Workflow Settings\n\n- mode: generate\n');
  writeFileSync(join(dir, 'research/brief.md'), '# Brief (verbatim dari Dena, 2026-09-29)\n\nKenapa AI agent gagal di bisnis kecil.\n');
  writeFileSync(join(dir, 'research/request.json'), JSON.stringify({ version: 1, brief: 'x', urls: [], repurpose: null, voice: 'st-f2', duration: null, style: null, music: null }));
  if (stage === 'story') return dir;
  writeFileSync(join(dir, 'script.md'), '# Naskah\n\nHook paragraf.\n\nParagraf dua.\n\n## Fakta\n\n- tidak ada angka\n');
  writeFileSync(join(dir, 'processed-audio.wav'), 'WAV');
  utimesSync(join(dir, 'script.md'), 1000, 1000);
  utimesSync(join(dir, 'processed-audio.wav'), 1001, 1001);
  mkdirSync(join(dir, 'voice'), { recursive: true });
  writeFileSync(join(dir, 'voice/voice-meta.json'), JSON.stringify({ preset: 'st-f2', duration: 49.78, alignment: { wer: 0 } }));
  return dir;
}

test('generate options offer presets without recorded, the styles, unrejected music, and repurpose projects', () => {
  const root = genStudioRoot();
  const o = generateOptions(root);
  assert.deepEqual(o.voices, [{ name: 'st-f2', provider: 'supertonic' }, { name: 'gm-a', provider: 'gemini' }]);
  assert.equal(o.defaultVoice, 'st-f2');
  assert.deepEqual(o.styles, STYLES);
  assert.equal(STYLES.includes('mix-media'), false);
  assert.deepEqual(o.music.map((m) => m.id), ['m01-quiet']);
  assert.deepEqual(o.repurpose, ['vid-a']);
});

test('validateRequest names the bad field and creates nothing', () => {
  const root = genStudioRoot();
  const ok = { brief: 'Kenapa AI agent gagal', slug: 'ai-baru' };
  const err = (body) => { try { validateRequest(root, body); return 'ok'; } catch (e) { return `${e.status} ${e.message}`; } };
  assert.equal(err(ok), 'ok');
  assert.match(err({ ...ok, brief: '  ' }), /^400 brief:/);
  assert.match(err({ ...ok, brief: 'x'.repeat(4001) }), /^400 brief:/);
  assert.match(err({ ...ok, slug: 'Bad Slug' }), /^400 slug:/);
  assert.match(err({ ...ok, slug: 'options' }), /^400 slug:/);
  assert.match(err({ ...ok, slug: 'new' }), /^400 slug:/);
  assert.match(err({ ...ok, slug: 'vid-a' }), /^409 slug:/);
  assert.match(err({ ...ok, urls: ['ftp://x.id'] }), /^400 urls:/);
  assert.match(err({ ...ok, urls: ['https://a.id', 'https://b.id', 'https://c.id', 'https://d.id', 'https://e.id', 'https://f.id'] }), /^400 urls:/);
  assert.match(err({ ...ok, repurpose: 'vid-b' }), /^400 repurpose:/);
  assert.match(err({ ...ok, voice: 'recorded' }), /^400 voice:/);
  assert.match(err({ ...ok, duration: 25 }), /^400 duration:/);
  assert.match(err({ ...ok, duration: 45.5 }), /^400 duration:/);
  assert.match(err({ ...ok, style: 'mix-media' }), /^400 style:/);
  assert.match(err({ ...ok, music: 'm02-loud' }), /^400 music:/);
  const v = validateRequest(root, { ...ok, urls: ['https://a.id/x'], repurpose: 'vid-a', voice: 'gm-a', duration: '60', style: 'stop-motion', music: 'm01-quiet' }, { now: () => new Date('2026-09-29T08:00:00Z') });
  assert.deepEqual(v, { slug: 'ai-baru', request: { version: 1, format: 'explainer', brief: 'Kenapa AI agent gagal', text: null, urls: ['https://a.id/x'], repurpose: 'vid-a', voice: 'gm-a', duration: 60, style: 'stop-motion', music: 'm01-quiet', createdAt: '2026-09-29T08:00:00.000Z' } });
  assert.equal(existsSync(join(root, 'videos/ai-baru')), false);
});

test('mdSection and storyboardRows read the plan files', () => {
  const md = '# T\n\n## Style World\n\n- main: stop-motion\n\n### sub\n\nx\n\n## Music\n\n- m01-quiet\n';
  assert.equal(mdSection(md, 'Style World'), '- main: stop-motion\n\n### sub\n\nx');
  assert.equal(mdSection(md, 'Music'), '- m01-quiet');
  assert.equal(mdSection(md, 'Nope'), '');
  const rows = storyboardRows('| # | time | spoken words | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- |\n| 1 | 0:00.0–0:04.4 | Banyak AI | stop-motion / pop-up | Warung | `sm-08-walk-hinge` (still 2) |\n');
  assert.deepEqual(rows, [{ n: 1, bars: null, time: '0:00.0–0:04.4', words: 'Banyak AI', style: 'stop-motion / pop-up', what: 'Warung', example: 'sm-08-walk-hinge (still 2)' }]);
});

test('app generate: options, create with a session, validation, and a failed session start', async (t) => {
  const root = genStudioRoot();
  const { server, call, calls } = await startApp(root);
  t.after(() => server.close());
  const opts = await call('GET', '/api/generate/options');
  assert.deepEqual(opts.body.music.map((m) => m.id), ['m01-quiet']);
  const bad = await call('POST', '/api/generate', { brief: '', slug: 'x-1', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.deepEqual([bad.status, bad.body.error.split(':')[0]], [400, 'brief']);
  assert.equal(existsSync(join(root, 'videos/x-1')), false);
  const made = await call('POST', '/api/generate', { brief: 'Kenapa AI agent gagal\ndi bisnis kecil', slug: 'ai-baru', style: 'whiteboard', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(made.status, 201);
  assert.deepEqual(made.body.session, { started: true, error: null });
  const dir = join(root, 'videos/ai-baru');
  assert.match(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), /mode: generate/);
  assert.match(readFileSync(join(dir, 'research/brief.md'), 'utf8'), /^# Brief \(verbatim dari Dena, \d{4}-\d{2}-\d{2}\)\n\nKenapa AI agent gagal\ndi bisnis kecil\n$/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'research/request.json'), 'utf8')).style, 'whiteboard');
  assert.match(readFileSync(join(root, '.studio/prompts/ai-baru.md'), 'utf8'), /^Buat video mode generate \(explainer\) di `videos\/ai-baru\/`[\s\S]*research\/request\.json[\s\S]*Jangan publish/);
  assert.ok(calls.some((c) => c[0] === 'tmux' && c[1] === 'new-session' && c.includes('studio-ai-baru')));
  assert.equal((await call('POST', '/api/generate', { brief: 'lagi', slug: 'ai-baru', runtime: 'claude', model: 'opus', effort: 'high' })).status, 409);
  const wrongEffort = await call('POST', '/api/generate', { brief: 'x', slug: 'ai-dua', runtime: 'codex', model: 'gpt-6-sol', effort: 'high' });
  assert.equal(wrongEffort.status, 400);
  assert.equal(existsSync(join(root, 'videos/ai-dua')), false);

  const failing = await startApp(genStudioRoot(), {}, { 'new-session': { code: 1, stdout: '', stderr: 'no server' } });
  t.after(() => failing.server.close());
  const kept = await failing.call('POST', '/api/generate', { brief: 'x', slug: 'ai-tiga', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(kept.status, 201);
  assert.equal(kept.body.session.started, false);
  assert.match(kept.body.session.error, /tmux new-session failed/);
});

test('app generate list, detail per gate, media whitelist, and the generate continue prompt', async (t) => {
  const root = genStudioRoot();
  genProject(root, 'g-story', 'story');
  const g1 = genProject(root, 'g-one', 'gate1');
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  const list = (await call('GET', '/api/generate')).body;
  assert.deepEqual(list.map((p) => [p.slug, p.status.phase, p.status.gate]), [['g-one', 'gate', 1], ['g-story', 'story', null]]);
  assert.equal(list[0].brief, 'Kenapa AI agent gagal di bisnis kecil.');
  const d1 = (await call('GET', '/api/generate/g-one')).body;
  assert.deepEqual([d1.status.phase, d1.status.gate, d1.status.state, d1.status.voiceStale], ['gate', 1, 'waiting', false]);
  assert.deepEqual(d1.gate1.paragraphs, ['Hook paragraf.', 'Paragraf dua.']);
  assert.equal(d1.gate1.facts, '- tidak ada angka');
  assert.deepEqual(d1.gate1.voice, { duration: 49.78, preset: 'st-f2', wer: 0 });
  assert.equal(d1.gate1.audio, true);
  assert.equal(d1.request.voice, 'st-f2');
  assert.equal((await call('GET', '/api/generate/vid-a')).status, 404, 'an edit project is not a generate project');

  const { recordDecision } = await import('./lib/gates.mjs');
  recordDecision(g1, { gate: 1, decision: 'approve', by: 'cli' });
  mkdirSync(join(g1, 'preview'), { recursive: true });
  writeFileSync(join(g1, 'preview/storyboard-sheet.jpg'), 'JPG');
  writeFileSync(join(g1, 'storyboard.md'), '| # | time | spoken words | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- |\n| 1 | 0:00 | Halo | stop-motion / pop-up | Warung | `sm-08-walk-hinge` |\n');
  writeFileSync(join(g1, 'visual-plan.md'), '# Visual Plan\n\n## Style World\n\n- stop-motion\n\n## Music\n\n- Track: `m01-quiet` from 0\n\n## Timeline\n');
  const d2 = (await call('GET', '/api/generate/g-one')).body;
  assert.deepEqual([d2.status.gate, d2.gate2.sheets, d2.gate2.rows.length, d2.gate2.styleWorld, d2.gate2.musicTrack], [2, ['preview/storyboard-sheet.jpg'], 1, '- stop-motion', 'm01-quiet']);

  recordDecision(g1, { gate: 2, decision: 'approve', by: 'cli' });
  mkdirSync(join(g1, 'renders'), { recursive: true });
  writeFileSync(join(g1, 'renders/g-one.mp4'), 'MP4');
  writeFileSync(join(g1, 'assembly-notes.md'), '# Assembly Notes\n\n## Deviations From Plan\n\n- ov-004 strings\n\n## Verification\n\nok\n\n## Handoff Risks\n\n- CTA intonation\n');
  const d3 = (await call('GET', '/api/generate/g-one')).body;
  assert.deepEqual([d3.status.gate, d3.gate3.render, d3.gate3.deviations, d3.gate3.risks, d3.gate3.qaReport], [3, 'g-one.mp4', '- ov-004 strings', '- CTA intonation', false]);

  const audio = await fetch(`${base}/media/g-one/processed-audio.wav`);
  assert.deepEqual([audio.status, await audio.text()], [200, 'WAV']);
  assert.equal((await fetch(`${base}/media/g-one/preview/storyboard-sheet.jpg`)).status, 200);
  assert.equal((await fetch(`${base}/media/g-one/preview/other.jpg`)).status, 404);
  assert.equal((await fetch(`${base}/media/g-one/script.md`)).status, 404);
  assert.equal((await fetch(`${base}/media/g-one/renders/g-one.mp4`)).status, 404, 'renders keep their own route');
  assert.equal((await fetch(`${base}/media/g-one/g-one.mp4`)).status, 200);

  await call('POST', '/api/sessions', { slug: 'g-story', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.match(readFileSync(join(root, '.studio/prompts/g-story.md'), 'utf8'), /^Lanjutkan proyek mode generate `videos\/g-story\/`\. Jalankan `npm run video -- gate g-story`/);
});

test('Generate remains readable when required artifacts are directories or empty files', async (t) => {
  const root = genStudioRoot();
  const story = genProject(root, 'g-invalid-story', 'story');
  mkdirSync(join(story, 'script.md'));
  mkdirSync(join(story, 'processed-audio.wav'));
  const screen = genProject(root, 'g-invalid-screen', 'gate1');
  record(screen, { gate: 1, decision: 'approve', by: 'cli' });
  mkdirSync(join(screen, 'storyboard.md'));
  mkdirSync(join(screen, 'preview/storyboard-sheet.jpg'), { recursive: true });
  writeFileSync(join(screen, 'preview/storyboard-sheet-2.jpg'), '');
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  const d1 = await call('GET', '/api/generate/g-invalid-story');
  assert.equal(d1.status, 200);
  assert.deepEqual([d1.body.status.phase, d1.body.gate1.script, d1.body.gate1.audio], ['story', '', false]);
  const d2 = await call('GET', '/api/generate/g-invalid-screen');
  assert.equal(d2.status, 200);
  assert.deepEqual([d2.body.status.phase, d2.body.gate2.rows, d2.body.gate2.sheets], ['screen-plan', [], []]);
  for (const file of ['g-invalid-story/processed-audio.wav', 'g-invalid-screen/preview/storyboard-sheet.jpg', 'g-invalid-screen/preview/storyboard-sheet-2.jpg']) {
    assert.equal((await fetch(`${base}/media/${file}`)).status, 404);
  }
});

test('Generate shows and serves the exact blur render fingerprinted by its final gate', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'blur-player', 'gate1');
  record(dir, { gate: 1, decision: 'approve', by: 'cli' });
  mkdirSync(join(dir, 'preview'), { recursive: true });
  writeFileSync(join(dir, 'preview/storyboard-sheet.jpg'), 'JPG');
  writeFileSync(join(dir, 'storyboard.md'), '| 1 | scene |');
  record(dir, { gate: 2, decision: 'approve', by: 'cli' });
  mkdirSync(join(dir, 'renders'), { recursive: true });
  writeFileSync(join(dir, 'renders/blur-player.mp4'), 'OLD');
  utimesSync(join(dir, 'renders/blur-player.mp4'), 1002, 1002);
  writeFileSync(join(dir, 'renders/blur-player-blur.mp4'), 'BLUR');
  utimesSync(join(dir, 'renders/blur-player-blur.mp4'), 1003, 1003);
  const { server, call, base } = await startApp(root);
  t.after(() => server.close());
  const d = (await call('GET', '/api/generate/blur-player')).body;
  assert.equal(d.gate3.render, 'blur-player-blur.mp4');
  assert.deepEqual(Object.keys(d.status.fingerprint), ['renders/blur-player-blur.mp4']);
  const media = await fetch(`${base}/media/blur-player/${d.gate3.render}`);
  assert.equal(await media.text(), 'BLUR');
});

test('buildPrompt generate modes point at request.json and the gate command', () => {
  assert.match(buildPrompt({ mode: 'generate', slug: 'a' }), /^Buat video mode generate \(explainer\) di `videos\/a\/`\. Brief Dena ada di `research\/brief\.md`/);
  const c = buildPrompt({ mode: 'generate-continue', slug: 'a', notes: 'Keputusan terakhir: Gate 1 revise — CTA' });
  assert.match(c, /npm run video -- gate a/);
  assert.match(c, /Catatan dari Dena: Keputusan terakhir: Gate 1 revise — CTA/);
  assert.match(buildPrompt({ mode: 'new', slug: 'a' }), /^Edit video project/);
});

test('JobRunner keeps one job per key and replays its log', () => {
  const spawned = [];
  const r = new JobRunner({ spawnImpl: (cmd, args, opts) => { const c = fakeChild(); spawned.push({ cmd, args, opts, c }); return c; }, label: 'voice' });
  r.start('a', 'node', ['x'], { cwd: '/tmp' });
  assert.equal(r.running('a'), true);
  assert.throws(() => r.start('a', 'node', ['x'], {}), { status: 409, message: 'voice for a is already running' });
  spawned[0].c.stderr.emit('data', Buffer.from('warn\n'));
  const seen = [];
  r.follow('a', (e, d) => seen.push([e, d]));
  spawned[0].c.emit('close', 2);
  assert.deepEqual(seen, [['log', 'warn\n'], ['done', { code: 2 }]]);
  assert.equal(r.running('a'), false);
  assert.throws(() => r.follow('b', () => {}), { status: 404, message: 'no voice job' });
});

test('gateMessage is one line, strips control characters, and fits 1000 characters', () => {
  assert.equal(gateMessage({ gate: 1, decision: 'approve' }), 'Gate 1 disetujui dari Studio. Catatan: -. Lanjutkan ke fase berikutnya.');
  assert.equal(gateMessage({ gate: 2, decision: 'revise', note: 'scene 4\n\u001b[2Jlebih pendek' }), 'Gate 2 revisi dari Studio: scene 4 [2Jlebih pendek. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate 2.');
  assert.match(gateMessage({ gate: 3, decision: 'qa' }), /^Gate 3: Dena memilih QA dulu\. Jalankan fase QA/);
  assert.match(gateMessage({ gate: 1, decision: 'approve', edited: true }), /^Naskah diedit Dena di Studio dan suaranya sudah dibuat ulang; baca ulang script\.md\. Gate 1 disetujui/);
  const long = gateMessage({ gate: 1, decision: 'revise', note: 'x'.repeat(3000) });
  assert.equal(long.length, 1000);
  assert.match(long, /…\. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate 1\.$/);
});

const idlePanes = (slug) => ({ 'list-panes': { code: 0, stdout: `studio-${slug}\t1\t0\tclaude\topus\thigh\t1\n`, stderr: '' } });
const busyPanes = (slug) => ({ 'list-panes': { code: 0, stdout: `studio-${slug}\t${Math.floor(Date.now() / 1000)}\t0\tclaude\topus\thigh\t1\n`, stderr: '' } });

test('app generate decision: records, types one literal line into the session, and refuses stale or busy', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  const app = await startApp(root, {}, idlePanes('g-one'));
  t.after(() => app.server.close());
  const fp = (await app.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: { 'script.md': 'x' } })).status, 409);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 2, decision: 'approve', fingerprint: fp })).status, 409);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'revise', note: '', fingerprint: fp })).status, 400);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve' })).status, 400, 'fingerprint is required');
  app.calls.length = 0;
  const ok = await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'revise', note: 'CTA\nkurang natural', fingerprint: fp });
  assert.deepEqual([ok.status, ok.body.sent, ok.body.recorded.by, ok.body.recorded.note], [200, true, 'studio', 'CTA\nkurang natural']);
  const typed = app.calls.filter((c) => c[1] === 'send-keys');
  assert.deepEqual(typed, [
    ['tmux', 'send-keys', '-t', '=studio-g-one:', '-l', 'Gate 1 revisi dari Studio: CTA kurang natural. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate 1.'],
    ['tmux', 'send-keys', '-t', '=studio-g-one:', 'Enter'],
  ]);
  assert.equal(readGates(dir).log.length, 1);

  const busy = await startApp(root, {}, busyPanes('g-one'));
  t.after(() => busy.server.close());
  assert.equal((await busy.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp })).status, 409);

  const none = await startApp(root, {}, { 'list-panes': { code: 1, stdout: '', stderr: 'no server' } });
  t.after(() => none.server.close());
  const noSession = await none.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp });
  assert.deepEqual([noSession.status, noSession.body.sent], [200, false]);
  assert.match(noSession.body.error, /tidak ada sesi/);
  assert.equal(readGates(dir).log.at(-1).decision, 'approve');
});

test('app generate script edit, voice job, and the edited-script message', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  const spawned = [];
  const voiceJobs = new VoiceJobs({ root, env: {}, spawnImpl: (cmd, args, opts) => { const c = fakeChild(); spawned.push({ cmd, args, opts, c }); return c; } });
  const busyApp = await startApp(root, { voiceJobs }, busyPanes('g-one'));
  t.after(() => busyApp.server.close());
  assert.equal((await busyApp.call('PUT', '/api/generate/g-one/script', { text: '# Naskah\n\nx\n' })).status, 409, 'agent is busy');
  assert.equal((await busyApp.call('POST', '/api/generate/g-one/voice')).status, 409, 'agent is busy');

  const app = await startApp(root, { voiceJobs }, idlePanes('g-one'));
  t.after(() => app.server.close());
  const put = (text) => app.call('PUT', '/api/generate/g-one/script', { text });
  assert.equal((await put('x'.repeat(20481))).status, 413);
  assert.equal((await put('# Naskah\n\n## Fakta\n\n- a\n')).status, 400, 'no narration');
  const saved = await put('# Naskah\n\nHook baru.\n\n## Fakta\n\n- a\n');
  assert.equal(saved.status, 200);
  assert.equal(saved.body.voiceStale, true);
  assert.equal(readFileSync(join(dir, 'script.md'), 'utf8'), '# Naskah\n\nHook baru.\n\n## Fakta\n\n- a\n');
  assert.equal(readGates(dir).log.at(-1).decision, 'edit');
  const fp = (await app.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp })).status, 409, 'voice is stale');

  assert.equal((await app.call('POST', '/api/generate/g-one/voice')).status, 200);
  assert.deepEqual(spawned[0].args, ['scripts/video.mjs', 'voice', 'g-one', '--preset', 'st-f2']);
  assert.equal(spawned[0].opts.cwd, root);
  assert.equal((await app.call('POST', '/api/generate/g-one/voice')).status, 409, 'one voice job per project');
  spawned[0].c.emit('close', 0);
  writeFileSync(join(dir, 'processed-audio.wav'), 'WAV2'); // what video voice writes
  const fp2 = (await app.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  app.calls.length = 0;
  const ok = await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp2 });
  assert.equal(ok.status, 200);
  assert.match(app.calls.find((c) => c.includes('-l')).at(-1), /^Naskah diedit Dena di Studio/);
  assert.equal((await put('# Naskah\n\nLagi.\n')).status, 409, 'Gate 1 is approved: no more script edits');
});

test('app generate continue session carries the last decision', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  record(dir, { gate: 1, decision: 'revise', note: 'hook terlalu panjang', by: 'studio' });
  const app = await startApp(root);
  t.after(() => app.server.close());
  const s = await app.call('POST', '/api/generate/g-one/session', { runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(s.status, 200);
  const prompt = readFileSync(join(root, '.studio/prompts/g-one.md'), 'utf8');
  assert.match(prompt, /^Lanjutkan proyek mode generate/);
  assert.match(prompt, /Catatan dari Dena: Keputusan terakhir: Gate 1 revise — hook terlalu panjang \(studio, /);
  assert.equal((await app.call('POST', '/api/generate/vid-a/session', { runtime: 'claude', model: 'opus', effort: 'high' })).status, 404);
});

// ---- review fixes (2026-09-29) ----

test('gateMessage: Gate 3 approval ends the run without publishing; edited-script prefix follows the voice', () => {
  const g3 = gateMessage({ gate: 3, decision: 'approve' });
  assert.match(g3, /^Gate 3 disetujui dari Studio\. Catatan: -\. Video selesai; jangan publish ke Repliz atau R2/);
  assert.doesNotMatch(g3, /Lanjutkan ke fase berikutnya/);
  assert.match(gateMessage({ gate: 1, decision: 'revise', note: 'x', edited: true, voiceStale: true }), /^Naskah diedit Dena di Studio \(suaranya belum dibuat ulang\); baca ulang script\.md\. Gate 1 revisi/);
  assert.match(gateMessage({ gate: 1, decision: 'approve', edited: true, voiceStale: false }), /^Naskah diedit Dena di Studio dan suaranya sudah dibuat ulang/);
  assert.equal(gateMessage({ gate: 2, decision: 'revise', note: 'a\u0085b\u009bc' }), 'Gate 2 revisi dari Studio: a b c. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate 2.');
});

test('app generate refuses bad session fields and non-object bodies before creating anything', async (t) => {
  const root = genStudioRoot();
  const { server, call } = await startApp(root);
  t.after(() => server.close());
  assert.equal((await call('POST', '/api/generate', { brief: 'x', slug: 'ai-rt', runtime: 'foo', model: 'opus', effort: 'high' })).status, 400);
  assert.equal((await call('POST', '/api/generate', { brief: 'x', slug: 'ai-rt', runtime: 'claude', model: 'opus', effort: 'turbo' })).status, 400);
  assert.equal(existsSync(join(root, 'videos/ai-rt')), false);
  assert.equal((await call('POST', '/api/generate', null)).status, 400);
  genProject(root, 'g-one', 'gate1');
  assert.equal((await call('POST', '/api/generate/g-one/decision', null)).status, 400);
  assert.equal((await call('PUT', '/api/generate/g-one/script', [])).status, 400);
});

test('app generate: a running voice job blocks decisions and script edits; detail reports it', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  const spawned = [];
  const voiceJobs = new VoiceJobs({ root, env: {}, spawnImpl: (cmd, args, opts) => { const c = fakeChild(); spawned.push(c); return c; } });
  const app = await startApp(root, { voiceJobs }, idlePanes('g-one'));
  t.after(() => app.server.close());
  const fp = (await app.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  assert.equal((await app.call('POST', '/api/generate/g-one/voice')).status, 200);
  assert.equal((await app.call('GET', '/api/generate/g-one')).body.voiceJob.running, true);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp })).status, 409);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'revise', note: 'x', fingerprint: fp })).status, 409);
  assert.equal((await app.call('PUT', '/api/generate/g-one/script', { text: '# N\n\nBaru.\n' })).status, 409);
  assert.equal(readGates(dir).log.length, 0);
  spawned[0].emit('close', 0);
  assert.equal((await app.call('GET', '/api/generate/g-one')).body.voiceJob.running, false);
  assert.equal((await app.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'approve', fingerprint: fp })).status, 200);
  assert.equal((await app.call('POST', '/api/generate/g-one/voice')).status, 409, 'outside Gate 1');
});

test('app generate decision reports a failed or exited session; a second session start is refused', async (t) => {
  const root = genStudioRoot();
  const dir = genProject(root, 'g-one', 'gate1');
  const fail = await startApp(root, {}, { ...idlePanes('g-one'), 'send-keys': { code: 1, stdout: '', stderr: 'no pane' } });
  t.after(() => fail.server.close());
  const fp = (await fail.call('GET', '/api/generate/g-one')).body.status.fingerprint;
  const r = await fail.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'revise', note: 'a', fingerprint: fp });
  assert.deepEqual([r.status, r.body.sent, r.body.error], [200, false, 'tmux send-keys gagal: no pane']);
  const exited = await startApp(root, {}, { 'list-panes': { code: 0, stdout: 'studio-g-one\t1\t1\tclaude\topus\thigh\t1\n', stderr: '' } });
  t.after(() => exited.server.close());
  const r2 = await exited.call('POST', '/api/generate/g-one/decision', { gate: 1, decision: 'revise', note: 'b', fingerprint: fp });
  assert.deepEqual([r2.body.sent, /tidak ada sesi/.test(r2.body.error)], [false, true]);
  assert.equal(readGates(dir).log.length, 2);
  const live = await startApp(root, {}, { ...idlePanes('g-one'), 'has-session': { code: 0, stdout: '', stderr: '' } });
  t.after(() => live.server.close());
  assert.equal((await live.call('POST', '/api/generate/g-one/session', { runtime: 'claude', model: 'opus', effort: 'high' })).status, 409);
});

// ---- music formats (ADR-0027) ----

function genMusicProject(root, slug, stage) {
  const dir = join(root, 'videos', slug);
  mkdirSync(join(dir, 'research'), { recursive: true });
  writeFileSync(join(dir, 'creative-brief.md'), '# Creative Brief\n\n## Workflow Settings\n\n- mode: generate\n- format: kinetic-post\n');
  writeFileSync(join(dir, 'research/brief.md'), '# Brief (verbatim dari Dena, 2026-09-29)\n\nBukan AI-nya yang bodoh.\n');
  writeFileSync(join(dir, 'research/request.json'), JSON.stringify({ version: 1, format: 'kinetic-post', brief: 'x', text: 'Bukan AI-nya yang bodoh', urls: [], repurpose: null, voice: null, duration: null, style: null, music: null }));
  writeFileSync(join(dir, 'script.md'), '# Teks\n\nBUKAN\nAI-NYA\nYANG BODOH\n');
  writeFileSync(join(dir, 'processed-audio.wav'), 'MUSIC');
  writeFileSync(join(dir, 'beats.json'), JSON.stringify({ version: 1, track: 'm01-quiet', bpm: 120, bars: 6, duration: 12, loop: true, beats: [], downbeats: [], barList: [] }));
  mkdirSync(join(dir, 'preview'), { recursive: true });
  writeFileSync(join(dir, 'preview/storyboard-sheet.jpg'), 'JPG');
  writeFileSync(join(dir, 'storyboard.md'), '| # | bars | time | on-screen text | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | 1–2 | 0:00–0:04 | BUKAN AI-NYA | broll-text / slam | Kata jatuh di downbeat | `tx-01-slam` |\n');
  if (stage === 'gate2') {
    record(dir, { gate: 1, decision: 'approve', by: 'cli' });
    mkdirSync(join(dir, 'renders'), { recursive: true });
    writeFileSync(join(dir, 'renders', `${slug}.mp4`), 'MP4');
  }
  return dir;
}

test('validateRequest per format: durations, voice only for explainer, Teks persis only for music formats', () => {
  const root = genStudioRoot();
  const ok = { brief: 'Bukan AI-nya yang bodoh', slug: 'post-baru', format: 'kinetic-post' };
  const err = (body) => { try { validateRequest(root, body); return 'ok'; } catch (e) { return `${e.status} ${e.message}`; } };
  assert.equal(err({ ...ok, duration: 12, text: 'BUKAN AI-NYA YANG BODOH' }), 'ok');
  assert.match(err({ ...ok, format: 'reel' }), /^400 format:/);
  assert.match(err({ ...ok, duration: 25 }), /^400 duration: bilangan bulat 8–20 atau kosong/);
  assert.match(err({ ...ok, format: 'motion-short', duration: 12 }), /^400 duration: bilangan bulat 15–40/);
  assert.match(err({ ...ok, voice: 'st-f2' }), /^400 voice:/);
  assert.match(err({ ...ok, text: 'x'.repeat(1001) }), /^400 text:/);
  assert.match(err({ brief: 'x', slug: 'ex-baru', text: 'teks' }), /^400 text:/);
  const v = validateRequest(root, { ...ok, text: '  BUKAN\r\nAI-NYA  ' });
  assert.deepEqual([v.request.format, v.request.text, v.request.voice], ['kinetic-post', 'BUKAN\nAI-NYA', null]);
  assert.equal(validateRequest(root, { brief: 'x', slug: 'ex-baru' }).request.format, 'explainer');
  assert.deepEqual(generateOptions(root).durations['motion-short'], [15, 40]);
  assert.deepEqual(generateOptions(root).formats, ['explainer', 'kinetic-post', 'motion-short']);
});

test('app generate kinetic-post: scaffold with format, Teks persis in the brief, prompt with two gates', async (t) => {
  const root = genStudioRoot();
  const { server, call } = await startApp(root);
  t.after(() => server.close());
  const made = await call('POST', '/api/generate', { brief: 'Bukan AI-nya yang bodoh', slug: 'post-baru', format: 'kinetic-post', text: 'BUKAN AI-NYA YANG BODOH', runtime: 'claude', model: 'opus', effort: 'high' });
  assert.equal(made.status, 201);
  const dir = join(root, 'videos/post-baru');
  assert.match(readFileSync(join(dir, 'creative-brief.md'), 'utf8'), /^- format: kinetic-post$/m);
  assert.match(readFileSync(join(dir, 'research/brief.md'), 'utf8'), /## Teks persis \(wajib dipakai kata demi kata\)\n\nBUKAN AI-NYA YANG BODOH\n$/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'research/request.json'), 'utf8')).text, 'BUKAN AI-NYA YANG BODOH');
  const prompt = readFileSync(join(root, '.studio/prompts/post-baru.md'), 'utf8');
  assert.match(prompt, /^Buat video mode generate \(kinetic-post\) di `videos\/post-baru\/`/);
  assert.match(prompt, /Gate 1 \(teks \+ musik \+ storyboard\) dan Gate 2 \(render\)/);
  assert.equal((await call('GET', '/api/generate')).body.find((p) => p.slug === 'post-baru').format, 'kinetic-post');
});

test('app generate music-format detail, final-gate messages, and explainer-only script/voice routes', async (t) => {
  const root = genStudioRoot();
  genMusicProject(root, 'post-a', 'gate1');
  const dir2 = genMusicProject(root, 'post-b', 'gate2');
  const app = await startApp(root, {}, idlePanes('post-b'));
  t.after(() => app.server.close());
  const d1 = (await app.call('GET', '/api/generate/post-a')).body;
  assert.deepEqual([d1.format, d1.status.gate, d1.status.finalGate], ['kinetic-post', 1, 2]);
  assert.deepEqual(d1.beats, { track: 'm01-quiet', bpm: 120, bars: 6, duration: 12, loop: true });
  assert.deepEqual(d1.gate1.lines, ['BUKAN', 'AI-NYA', 'YANG BODOH']);
  assert.deepEqual([d1.gate2.rows[0].bars, d1.gate2.rows[0].words, d1.gate2.rows[0].example], ['1–2', 'BUKAN AI-NYA', 'tx-01-slam']);
  assert.equal((await app.call('PUT', '/api/generate/post-a/script', { text: '# T\n\nBARU\n' })).status, 409);
  assert.equal((await app.call('POST', '/api/generate/post-a/voice')).status, 409);
  const fp = (await app.call('GET', '/api/generate/post-b')).body.status.fingerprint;
  app.calls.length = 0;
  assert.equal((await app.call('POST', '/api/generate/post-b/decision', { gate: 2, decision: 'approve', fingerprint: fp })).status, 200);
  assert.match(app.calls.find((c) => c.includes('-l')).at(-1), /^Gate 2 disetujui dari Studio\. Catatan: -\. Video selesai; jangan publish ke Repliz atau R2/);
  assert.equal(readGates(dir2).log.at(-1).gate, 2);
});

test('gateMessage uses the format\'s last gate for approval and QA', () => {
  assert.match(gateMessage({ gate: 2, decision: 'approve', finalGate: 2 }), /^Gate 2 disetujui dari Studio\. Catatan: -\. Video selesai; jangan publish/);
  assert.match(gateMessage({ gate: 2, decision: 'approve' }), /Lanjutkan ke fase berikutnya\.$/, 'an explainer Gate 2 continues');
  assert.equal(gateMessage({ gate: 2, decision: 'qa', finalGate: 2 }), 'Gate 2: Dena memilih QA dulu. Jalankan fase QA (docs/agents/04-qa.md) sebagai subagent baru, lalu kembali ke Gate 2.');
  assert.match(buildPrompt({ mode: 'generate', slug: 'a', format: 'motion-short' }), /^Buat video mode generate \(motion-short\)[\s\S]*Gate 1 \(teks \+ musik \+ storyboard\) dan Gate 2 \(render\)/);
});

test('storyboardRows reads the bars column from the header, not from the column count; a bad format line shows as unknown', async (t) => {
  const music = storyboardRows('| # | bars | time | on-screen text | style / pattern | what appears | example |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | 1–2 | 0:00–0:04 | BUKAN | broll-text / slam | Kata | `tx-01-slam` |\n');
  assert.deepEqual([music[0].bars, music[0].words], ['1–2', 'BUKAN']);
  const wide = storyboardRows('| # | time | spoken words | style / pattern | what appears | example | note |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | 0:00.0–0:04.4 | Banyak AI | stop-motion / pop-up | Warung | `sm-08-walk-hinge` | x |\n');
  assert.deepEqual([wide[0].bars, wide[0].time, wide[0].words, wide[0].example], [null, '0:00.0–0:04.4', 'Banyak AI', 'sm-08-walk-hinge']);
  const root = genStudioRoot();
  const dir = genMusicProject(root, 'post-bad', 'gate1');
  writeFileSync(join(dir, 'creative-brief.md'), '# B\n\n## Workflow Settings\n\n- mode: generate\n- format: reel\n');
  const app = await startApp(root);
  t.after(() => app.server.close());
  const item = (await app.call('GET', '/api/generate')).body.find((p) => p.slug === 'post-bad');
  assert.deepEqual([item.format, item.status.phase], [null, 'error']);
  assert.equal((await app.call('GET', '/api/generate/post-bad')).status, 500);
});
