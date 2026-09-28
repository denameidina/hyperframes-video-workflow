import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedHosts, guardRequest, hasToken, parseRange, tokenCookie, tokenMatches } from './studio/http.mjs';
import { CLAUDE_MODELS, EFFORTS, agentCommand, buildPrompt, codexDefaults, paneCommand, suggestSlug } from './studio/agent.mjs';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FORMAT, hasSession, interruptSession, killSession, listSessions, parseSessions, sessionName, startSession } from './studio/sessions.mjs';

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
