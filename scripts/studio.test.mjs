import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedHosts, guardRequest, hasToken, parseRange, tokenCookie, tokenMatches } from './studio/http.mjs';
import { CLAUDE_MODELS, EFFORTS, agentCommand, buildPrompt, codexDefaults, paneCommand, suggestSlug } from './studio/agent.mjs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FORMAT, hasSession, interruptSession, killSession, listSessions, parseSessions, sessionName, startSession } from './studio/sessions.mjs';
import { Readable } from 'node:stream';
import { deletePlan, deleteRawCascade, linkedProjects, listRaw, projectRaw, rawPath, receiveUpload, rendersOf, safeUploadName } from './studio/raw.mjs';
import { EventEmitter } from 'node:events';
import { Publisher, listResults, publishPreview, receiptStatus, renderPath } from './studio/results.mjs';
import { Terminals, VIEWER_RE, attachCommand } from './studio/terminal.mjs';
import { createServer } from 'node:http';
import { createApp } from './studio/app.mjs';
import { parseTailscaleStatus } from './studio.mjs';

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

test('suggestSlug', () => {
  assert.equal(suggestSlug('DJI_20260912050651_0419_D.MP4'), 'dji-20260912050651-0419-d');
  assert.equal(suggestSlug('  Hello World!.mov'), 'hello-world');
  assert.equal(suggestSlug('___.mp4'), 'video');
});

test('agentCommand builds claude and codex argv', () => {
  assert.deepEqual(agentCommand({ runtime: 'claude', model: 'opus', effort: 'max' }), ['claude', '--model', 'opus', '--effort', 'max', '--dangerously-skip-permissions']);
  assert.deepEqual(agentCommand({ runtime: 'codex', model: 'gpt-6-sol', effort: 'xhigh' }), ['codex', '-m', 'gpt-6-sol', '-c', 'model_reasoning_effort="xhigh"', '--dangerously-bypass-approvals-and-sandbox', '--no-alt-screen']);
});

test('agentCommand rejects unsafe or unknown values', () => {
  assert.throws(() => agentCommand({ runtime: 'claude', model: 'opus; rm -rf ~', effort: 'high' }), { status: 400 });
  assert.throws(() => agentCommand({ runtime: 'codex', model: 'x', effort: 'max' }), { status: 400 });
  assert.throws(() => agentCommand({ runtime: 'bash', model: 'x', effort: 'high' }), { status: 400 });
});

test('paneCommand quotes argv and reads the prompt file', () => {
  assert.equal(paneCommand(['claude', '--model', "o'pus"], '.studio/prompts/a.md'), `'claude' '--model' 'o'\\''pus' "$(cat '.studio/prompts/a.md')"`);
});

test('buildPrompt', () => {
  const p = buildPrompt({ mode: 'new', rawFile: 'a.mp4', slug: 'a', notes: '  hook soal token ' });
  assert.match(p, /^Edit raw video `raw\/a\.mp4` sebagai proyek `videos\/a\/`/);
  assert.match(p, /Catatan dari Dena: hook soal token\n/);
  assert.match(p, /Jangan publish ke Repliz — publish dilakukan Dena dari Studio\.\n$/);
  const c = buildPrompt({ mode: 'continue', rawFile: 'a.mp4', slug: 'a' });
  assert.match(c, /^Lanjutkan proyek `videos\/a\/`/);
  assert.match(c, /Catatan dari Dena: -\n/);
  assert.match(c, /Jangan publish ke Repliz/);
});

test('codexDefaults reads top-level model and effort only', () => {
  assert.deepEqual(codexDefaults('model = "gpt-6-sol"\nmodel_reasoning_effort = "xhigh"\n[profiles.x]\nmodel = "other"\n'), { model: 'gpt-6-sol', effort: 'xhigh' });
  assert.deepEqual(codexDefaults(''), { model: '', effort: '' });
  assert.ok(CLAUDE_MODELS.includes('opus'));
  assert.deepEqual(EFFORTS.codex, ['low', 'medium', 'high', 'xhigh']);
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
    'hanoman-1\t100\t0\t\t\t\t\t',
    'studio-a\t998\t0\tclaude\topus\thigh\ta.mp4\t900',
    'studio-b\t990\t0\tcodex\tgpt-6-sol\txhigh\tb.mp4\t900',
    'studio-c\t990\t1\tclaude\topus\thigh\tc.mp4\t900',
  ].join('\n');
  assert.deepEqual(parseSessions(out, 1000).map((s) => [s.slug, s.status]), [['a', 'running'], ['b', 'idle'], ['c', 'exited']]);
  assert.deepEqual(parseSessions(out, 1000)[0], { slug: 'a', runtime: 'claude', model: 'opus', effort: 'high', raw: 'a.mp4', started: 900, status: 'running' });
});

test('listSessions returns [] when no tmux server runs', async () => {
  const { run, calls } = fakeRun({ 'list-panes': { code: 1, stdout: '', stderr: 'no server running' } });
  assert.deepEqual(await listSessions({ run }), []);
  assert.deepEqual(calls[0], ['tmux', 'list-panes', '-a', '-F', FORMAT]);
});

test('startSession writes the prompt and starts a detached tmux session with metadata', async () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-'));
  const { run, calls } = fakeRun({ 'has-session': { code: 1, stdout: '', stderr: '' } });
  await startSession({ root, slug: 'my-vid', runtime: 'claude', model: 'opus', effort: 'high', rawFile: 'a.mp4', prompt: 'Edit raw video\n', run, now: () => 1_000_000 });
  assert.equal(readFileSync(join(root, '.studio/prompts/my-vid.md'), 'utf8'), 'Edit raw video\n');
  const args = calls[1];
  assert.deepEqual(args.slice(0, 9), ['tmux', 'new-session', '-d', '-s', 'studio-my-vid', '-x', '120', '-y', '40']);
  assert.ok(args.includes(`'claude' '--model' 'opus' '--effort' 'high' '--dangerously-skip-permissions' "$(cat '.studio/prompts/my-vid.md')"`));
  for (const [key, value] of [['remain-on-exit', 'on'], ['@studio_runtime', 'claude'], ['@studio_raw', 'a.mp4'], ['@studio_started', '1000']]) {
    const i = args.indexOf(key);
    assert.ok(i > 0, key);
    assert.equal(args[i + 1], value);
  }
});

test('startSession refuses an existing session', async () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-'));
  const { run } = fakeRun();
  await assert.rejects(startSession({ root, slug: 'a', runtime: 'claude', model: 'opus', effort: 'high', rawFile: 'a.mp4', prompt: 'x', run }), { status: 409 });
});

test('kill and interrupt target the exact session', async () => {
  const { run, calls } = fakeRun();
  await killSession('a', { run });
  await interruptSession('a', { run });
  assert.deepEqual(calls, [['tmux', 'kill-session', '-t', '=studio-a'], ['tmux', 'send-keys', '-t', '=studio-a:', 'Escape']]);
  assert.equal(sessionName('a'), 'studio-a');
  assert.equal(await hasSession('a', { run }), true);
});

function studioRoot() {
  const root = mkdtempSync(join(tmpdir(), 'studio-'));
  mkdirSync(join(root, 'raw'));
  mkdirSync(join(root, 'videos'));
  writeFileSync(join(root, 'raw/a.MP4'), 'A');
  writeFileSync(join(root, 'raw/b.mov'), 'B');
  writeFileSync(join(root, 'raw/.gitkeep'), '');
  const project = (slug, raw, renders = []) => {
    mkdirSync(join(root, 'videos', slug, 'renders'), { recursive: true });
    symlinkSync(`../../raw/${raw}`, join(root, 'videos', slug, 'source.mp4'));
    for (const r of renders) writeFileSync(join(root, 'videos', slug, 'renders', r), 'R');
  };
  project('vid-a', 'a.MP4', ['vid-a.mp4']);
  project('vid-a2', 'a.MP4');
  project('vid-b', 'b.mov');
  return root;
}

test('safeUploadName keeps a basename with a video extension', () => {
  assert.equal(safeUploadName('../../etc/DJI 01.MP4'), 'DJI_01.MP4');
  assert.equal(safeUploadName('.hidden.mp4'), 'hidden.mp4');
  assert.throws(() => safeUploadName('notes.txt'), { status: 400 });
  assert.throws(() => safeUploadName(''), { status: 400 });
});

test('listRaw links projects through source.mp4', async () => {
  const root = studioRoot();
  const items = await listRaw(root, { probe: async () => 12.5 });
  assert.deepEqual(items.map((r) => [r.name, r.duration, r.projects]), [['a.MP4', 12.5, ['vid-a', 'vid-a2']], ['b.mov', 12.5, ['vid-b']]]);
  assert.equal(projectRaw(root, 'vid-b'), 'b.mov');
  assert.deepEqual(rendersOf(root, 'vid-a'), ['vid-a.mp4']);
});

test('rawPath rejects traversal and unknown names', () => {
  const root = studioRoot();
  assert.throws(() => rawPath(root, '../raw/a.MP4'), { status: 400 });
  assert.throws(() => rawPath(root, 'zzz.mp4'), { status: 404 });
});

test('deleteRawCascade removes the raw and only its projects', () => {
  const root = studioRoot();
  assert.deepEqual(deletePlan(root, 'a.MP4'), { raw: 'a.MP4', projects: [{ slug: 'vid-a', renders: ['vid-a.mp4'] }, { slug: 'vid-a2', renders: [] }] });
  deleteRawCascade(root, 'a.MP4');
  assert.equal(existsSync(join(root, 'raw/a.MP4')), false);
  assert.equal(existsSync(join(root, 'videos/vid-a')), false);
  assert.equal(existsSync(join(root, 'videos/vid-a2')), false);
  assert.equal(existsSync(join(root, 'videos/vid-b')), true);
  assert.deepEqual(linkedProjects(root, 'b.mov'), ['vid-b']);
});

test('receiveUpload streams to a .part file then renames', async () => {
  const root = studioRoot();
  assert.equal(await receiveUpload(root, 'new clip.mp4', Readable.from([Buffer.from('xy')])), 'new_clip.mp4');
  assert.equal(readFileSync(join(root, 'raw/new_clip.mp4'), 'utf8'), 'xy');
  await assert.rejects(receiveUpload(root, 'new_clip.mp4', Readable.from([])), { status: 409 });
});

test('receiveUpload removes the partial file when the stream fails', async () => {
  const root = studioRoot();
  const broken = new Readable({ read() { this.push('x'); this.destroy(new Error('client aborted')); } });
  await assert.rejects(receiveUpload(root, 'c.mp4', broken), /client aborted/);
  assert.equal(existsSync(join(root, 'raw/.c.mp4.part')), false);
  assert.equal(existsSync(join(root, 'raw/c.mp4')), false);
});

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
  assert.throws(() => renderPath(root, 'vid-a', '../../raw/a.MP4'), { status: 404 });
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

async function startApp(root, overrides = {}) {
  const fake = fakeRun({
    'list-panes': { code: 0, stdout: 'studio-vid-b\t0\t0\tclaude\topus\thigh\tb.mov\t1\n', stderr: '' },
    'has-session': { code: 1, stdout: '', stderr: '' },
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
    codex: { model: 'gpt-6-sol', effort: 'xhigh' },
    run: fake.run,
    terminals: new Terminals({ spawnImpl: () => fakeChild(), killImpl: () => {} }),
    publisher: new Publisher({ root, env: {}, spawnImpl: () => fakeChild() }),
    ...overrides,
  }));
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, { method, headers: { origin: base, 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
  return { server, call, calls: fake.calls, base };
}

test('app lists raw and blocks cross-origin mutations', async (t) => {
  const root = studioRoot();
  const { server, call } = await startApp(root);
  t.after(() => server.close());
  const raw = await call('GET', '/api/raw');
  assert.equal(raw.status, 200);
  assert.deepEqual(raw.body.map((r) => r.name), ['a.MP4', 'b.mov']);
  assert.equal((await call('DELETE', '/api/raw/a.MP4', undefined, { origin: 'http://evil.example' })).status, 403);
  assert.equal(existsSync(join(root, 'raw/a.MP4')), true);
  assert.equal((await call('GET', '/api/nope')).status, 404);
});

test('app edit-plan and session start', async (t) => {
  const root = studioRoot();
  const { server, call, calls } = await startApp(root);
  t.after(() => server.close());
  assert.deepEqual((await call('GET', '/api/raw/b.mov/edit-plan')).body, { mode: 'open', slug: 'vid-b' });
  assert.deepEqual((await call('GET', '/api/raw/a.MP4/edit-plan')).body, { mode: 'continue', slug: 'vid-a' });
  writeFileSync(join(root, 'raw/c.mp4'), 'C');
  assert.deepEqual((await call('GET', '/api/raw/c.mp4/edit-plan')).body, { mode: 'new', slug: 'c' });
  assert.equal((await call('POST', '/api/sessions', { raw: 'c.mp4', slug: 'vid-a', runtime: 'claude', model: 'opus', effort: 'high' })).status, 409);
  assert.equal((await call('POST', '/api/sessions', { raw: 'c.mp4', slug: 'Bad', runtime: 'claude', model: 'opus', effort: 'high' })).status, 400);
  const ok = await call('POST', '/api/sessions', { raw: 'c.mp4', slug: 'c', runtime: 'claude', model: 'opus', effort: 'high', notes: 'fokus hook' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.slug, 'c');
  assert.match(readFileSync(join(root, '.studio/prompts/c.md'), 'utf8'), /^Edit raw video `raw\/c\.mp4`[\s\S]*fokus hook/);
  assert.ok(calls.some((c) => c[1] === 'new-session' && c.includes('studio-c')));
});

test('app cascade delete kills linked sessions and removes projects', async (t) => {
  const root = studioRoot();
  const { server, call, calls } = await startApp(root);
  t.after(() => server.close());
  assert.deepEqual((await call('GET', '/api/raw/b.mov/delete-plan')).body, { raw: 'b.mov', projects: [{ slug: 'vid-b', renders: [] }], sessions: ['vid-b'] });
  assert.equal((await call('DELETE', '/api/raw/b.mov')).status, 200);
  assert.ok(calls.some((c) => c.join(' ') === 'tmux kill-session -t =studio-vid-b'));
  assert.equal(existsSync(join(root, 'raw/b.mov')), false);
  assert.equal(existsSync(join(root, 'videos/vid-b')), false);
  assert.equal(existsSync(join(root, 'videos/vid-a')), true);
});

test('app token gate', async (t) => {
  const root = studioRoot();
  const { server, call } = await startApp(root, { token: 's3cret' });
  t.after(() => server.close());
  assert.equal((await call('GET', '/api/raw')).status, 401);
  assert.equal((await call('POST', '/login', { token: 'wrong' })).status, 401);
  const login = await call('POST', '/login', { token: 's3cret' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('GET', '/api/raw', undefined, { cookie })).status, 200);
});

test('app publish rejects a second run for the same slug', async (t) => {
  const root = studioRoot();
  const { server, call } = await startApp(root);
  t.after(() => server.close());
  assert.equal((await call('POST', '/api/results/vid-a/publish', { file: 'vid-a.mp4' })).status, 200);
  assert.equal((await call('POST', '/api/results/vid-a/publish', { file: 'vid-a.mp4' })).status, 409);
});

test('parseTailscaleStatus needs a running backend', () => {
  const self = { TailscaleIPs: ['100.76.52.99', 'fd7a::1'], DNSName: 'mac.tail.ts.net.' };
  assert.deepEqual(parseTailscaleStatus(JSON.stringify({ BackendState: 'Running', Self: self })), { ip: '100.76.52.99', names: ['mac.tail.ts.net', 'mac'] });
  assert.equal(parseTailscaleStatus(JSON.stringify({ BackendState: 'Stopped', Self: self })), null);
  assert.equal(parseTailscaleStatus(''), null);
});
