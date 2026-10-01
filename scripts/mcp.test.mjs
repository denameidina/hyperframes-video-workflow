import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import { createService, redactor, redactValue } from './mcp/service.mjs';
import { Jobs } from './mcp/jobs.mjs';
import { safePath } from './mcp/files.mjs';
import { clientConfig } from './mcp/config.mjs';
import { serve, VERSIONS } from './mcp/protocol.mjs';
import { PassThrough } from 'node:stream';

const repo = resolve(new URL('..', import.meta.url).pathname);
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'videos-mcp-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const p of ['videos', 'shared', 'config', 'scripts', 'internal/docs', 'docs/agents', 'templates', 'vendor']) mkdirSync(join(root, p), { recursive: true });
  cpSync(join(repo, 'templates'), join(root, 'templates'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{"name":"videos"}');
  writeFileSync(join(root, 'scripts/video.mjs'), '');
  writeFileSync(join(root, 'AGENTS.md'), '# Project rules');
  writeFileSync(join(root, 'internal/docs/README.md'), '# Docs');
  return root;
}
class FakeJobs {
  constructor() { this.calls = []; }
  busy() { return false; }
  start(spec) { this.calls.push(spec); return { id: 'job-test', status: 'running', key: spec.key }; }
  list() { return []; }
  close() {}
}
async function setup(t) {
  const root = fixture(t), jobs = new FakeJobs();
  const service = createService({ root, jobs, env: {} });
  await service.call('project_create', { slug: 'demo', mode: 'generate', format: 'explainer' });
  return { root, jobs, service };
}

test('paths reject traversal, hidden paths and symlinks outside their permitted tree', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, 'videos/demo'));
  symlinkSync(join(root, 'config'), join(root, 'videos/demo/escape'));
  for (const p of ['../x', '/etc/passwd', '.env', 'videos/demo/../other', 'videos/demo/escape/x', 'videos/demo/secret/.env']) {
    assert.throws(() => safePath(root, p, ['videos/demo']), /path|hidden|outside/i);
  }
});
test('tools have closed schemas, readonly mode only exposes safe reads', (t) => {
  const root = fixture(t);
  const service = createService({ root, env: {} });
  const all = service.tools();
  assert.ok(all.length >= 20);
  for (const tool of all) assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
  const reads = createService({ root, env: {}, readOnly: true }).tools();
  assert.ok(reads.length > 5);
  assert.ok(reads.every((x) => x.annotations.readOnlyHint));
  assert.ok(!reads.some((x) => x.name === 'publish'));
});
test('project scaffold and artifact compare-and-swap writes are real', async (t) => {
  const { root, service } = await setup(t);
  assert.ok(existsSync(join(root, 'videos/demo/index.html')));
  assert.equal((await service.call('project_list', {})).projects[0].slug, 'demo');
  const first = await service.call('artifact_write', { slug: 'demo', path: 'script.md', content: 'Halo.' });
  await assert.rejects(service.call('artifact_write', { slug: 'demo', path: 'script.md', content: 'Changed' }), /sha256/i);
  const next = await service.call('artifact_write', { slug: 'demo', path: 'script.md', content: 'Changed', expected_sha256: first.sha256 });
  assert.notEqual(first.sha256, next.sha256);
  assert.equal(readFileSync(join(root, 'videos/demo/script.md'), 'utf8'), 'Changed');
  await assert.rejects(service.call('artifact_write', { slug: 'demo', path: 'cut-list.json', content: '{broken' }), /JSON/);
  await assert.rejects(service.call('artifact_write', { slug: 'demo', path: 'broken.JSON', content: '{broken' }), /JSON/);
  for (const path of ['gates.json', 'sources.json', 'repliz-publish.json', 'vendor/bad.js', 'renders/render-quality.json', 'render-quality.json']) {
    await assert.rejects(service.call('artifact_write', { slug: 'demo', path, content: '{}' }), /protected|allowed|owner/);
  }
});
test('composition needs upstream handoffs and schedules a check on a successful write', async (t) => {
  const { root, service, jobs } = await setup(t);
  const args = { slug: 'demo', path: 'compositions/scene.html', content: '<html></html>' };
  await assert.rejects(service.call('artifact_write', args), /handoff|missing/i);
  await assert.rejects(service.call('artifact_write', { ...args, path: 'scene.HTML' }), /handoff|missing/i);
  for (const file of ['script.md', 'metadata.json', 'processed-transcript.json', 'caption-plan.md', 'caption-beats.json', 'publish-captions.md', 'overlay-timeline.json', 'storyboard.md']) writeFileSync(join(root, 'videos/demo', file), '{}');
  writeFileSync(join(root, 'videos/demo/processed-audio.wav'), 'audio');
  writeFileSync(join(root, 'videos/demo/visual-plan.md'), '## Gate 2 Result\nready');
  const out = await service.call('artifact_write', args);
  assert.equal(out.check.id, 'job-test');
  assert.deepEqual(jobs.calls.at(-1).steps[0].args.slice(1), ['check', 'demo']);
});
test('publish, gate, clone and remote sync reject missing explicit confirmation before dispatch', async (t) => {
  const { service, jobs } = await setup(t);
  for (const [name, args] of [
    ['publish', { slug: 'demo', destination: 'repliz' }],
    ['gate_decide', { slug: 'demo', gate: 1, decision: 'approve' }],
    ['voice_run', { action: 'clone', options: { name: 'dena', consent: 'shared/consent.wav' } }],
    ['calendar_read', { month: '2026-10', sync: true }],
  ]) await assert.rejects(service.call(name, args), /confirm|approval/i);
  assert.equal(jobs.calls.length, 0);
});
test('argument arrays preserve hostile text and reject unknown fields and arbitrary commands', async (t) => {
  const { service, jobs } = await setup(t);
  await service.call('voice_run', { action: 'say', options: { preset: 'dena', text: 'hello $(touch /tmp/pwn); `id`', out: 'videos/demo/voice' } });
  assert.ok(jobs.calls.at(-1).steps[0].args.includes('hello $(touch /tmp/pwn); `id`'));
  await assert.rejects(service.call('video_run', { slug: 'demo', action: 'exec' }), /enum|one of/);
  await assert.rejects(service.call('video_run', { slug: 'demo', action: 'check', argv: [';id'] }), /unknown/);
  await assert.rejects(service.call('video_run', { slug: 'demo', action: 'check', options: { shell: true } }), /unknown/);
});
test('resources and generic file tools cannot read secrets or blind identities', async (t) => {
  const { service, root } = await setup(t);
  writeFileSync(join(root, '.env'), 'SECRET_KEY=do-not-return');
  for (const path of ['.env', 'config/voices.json', 'shared/voices/dena/voice.json', 'shared/voice-tests/20261001/key.json']) {
    await assert.rejects(service.call('file_read', { path }), /allowed|protected|hidden/);
    await assert.rejects(service.resource(`dena://workspace/${path}`), /allowed|protected|hidden/);
  }
  for (const path of ['shared/VOICES/dena/voice.json', 'shared/VOICE-TESTS/20261001-1200/KEY.JSON', 'shared/voice-tests/20261001-1200/work/A/voice-meta.json']) await assert.rejects(service.call('file_read', { path }), /protected/);
  assert.ok((await service.resource('dena://workspace/AGENTS.md')).contents[0].text.includes('Project rules'));
  mkdirSync(join(root, 'shared/voice-tests/20261001-1200'), { recursive: true });
  writeFileSync(join(root, 'shared/voice-tests/20261001-1200/key.json'), '{"secret":"private mapping"}');
  symlinkSync('voice-tests/20261001-1200/key.json', join(root, 'shared/readable.json'));
  await assert.rejects(service.call('file_read', { path: 'shared/readable.json' }), /symlink/);
  await assert.rejects(service.resource('dena://workspace/shared/readable.json'), /symlink/);
});
test('jobs bound logs, reject conflicts, record failed spawn and cancel safely', async () => {
  const children = [];
  const jobs = new Jobs({ spawnImpl: () => {
    const c = new EventEmitter(); c.stdout = new EventEmitter(); c.stderr = new EventEmitter();
    c.kill = () => { c.emit('close', null, 'SIGTERM'); }; children.push(c); return c;
  }, logLimit: 32, redact: (s) => s.replaceAll('SECRET', '[redacted]') });
  const first = jobs.start({ key: 'project:demo', steps: [{ command: 'node', args: [] }], cwd: '.' });
  assert.throws(() => jobs.start({ key: 'project:demo', steps: [{ command: 'node', args: [] }], cwd: '.' }), /running/);
  children[0].stdout.emit('data', 'SECRET' + 'x'.repeat(100));
  assert.ok(jobs.get(first.id).log.length <= 32);
  assert.equal(jobs.get(first.id).log.includes('SECRET'), false);
  assert.equal(jobs.cancel(first.id).status, 'cancelled');
  const second = jobs.start({ key: 'other', steps: [{ command: 'none', args: [] }], cwd: '.' });
  children[1].emit('error', new Error('ENOENT'));
  children[1].emit('close', -2);
  assert.equal(jobs.get(second.id).status, 'failed');
  jobs.close();
});
function handoffs(root) {
  for (const file of ['script.md', 'metadata.json', 'processed-transcript.json', 'caption-plan.md', 'caption-beats.json', 'publish-captions.md', 'overlay-timeline.json', 'storyboard.md']) writeFileSync(join(root, 'videos/demo', file), '{}');
  writeFileSync(join(root, 'videos/demo/processed-audio.wav'), 'audio');
  writeFileSync(join(root, 'videos/demo/visual-plan.md'), '## Gate 2 Result\nready');
}
test('every video and voice CLI adapter builds the actual owner flags without executing services', async (t) => {
  const { service, jobs, root } = await setup(t); handoffs(root);
  writeFileSync(join(root, 'shared/input.mp4'), 'video');
  writeFileSync(join(root, 'shared/consent.wav'), 'audio');
  writeFileSync(join(root, 'shared/image.png'), 'image');
  const videos = {
    cut: {}, check: {}, snapshot: { times: [1.5, 3] }, render: { blur: true }, cutout: { from: 1, dur: 2, name: '01-dena' },
    layers: { image: 'shared/image.png', name: '01-scene' }, voice: { preset: 'dena' }, bgm: { track: 'm01-a', from: 1 }, music: { track: 'm01-a', bars: 4 }, storyboard: { reference: true },
  };
  for (const [action, options] of Object.entries(videos)) {
    await service.call('video_run', { slug: 'demo', action, options });
    const args = jobs.calls.at(-1).steps[0].args;
    assert.ok(args[0].endsWith('/scripts/video.mjs'));
    assert.deepEqual(args.slice(1, 3), [action, 'demo']);
    if (action === 'snapshot') assert.deepEqual(args.slice(3), ['--at', '1.5,3']);
  }
  const voices = {
    say: { preset: 'dena', file: 'videos/demo/script.md', out: 'videos/demo/voice' }, ref: { from: 'shared/input.mp4', dur: 15 },
    clone: { consent: 'shared/consent.wav' }, design: { name: 'dena', prompt: 'Natural Indonesian' }, voices: { lang: 'id' },
    'test-build': { only: 'supertonic', keep: 2 }, 'test-reveal': { run: '20261001-1200' },
  };
  for (const [action, options] of Object.entries(voices)) {
    await service.call('voice_run', { action, options, human_confirmed: true, approval_note: 'User requested this voice operation.' });
    const args = jobs.calls.at(-1).steps[0].args;
    assert.ok(args[0].endsWith('/scripts/voice.mjs'));
    assert.equal(args[1], action.startsWith('test-') ? 'test' : action);
  }
  await assert.rejects(service.call('voice_run', { action: 'say', options: { preset: 'dena', text: 'Hello', out: 'videos/demo' } }), /out must/);
  await assert.rejects(service.call('video_run', { slug: 'demo', action: 'check', options: { blur: true } }), /not valid/);
});
test('music, source, publish and gate dispatch preserve owner flags and protected output paths', async (t) => {
  const { service, jobs, root } = await setup(t); handoffs(root);
  writeFileSync(join(root, 'shared/input.mp4'), 'video'); writeFileSync(join(root, 'shared/input.wav'), 'audio');
  await service.call('source_manage', { slug: 'demo', action: 'attach', names: ['input.mp4'] });
  assert.deepEqual(jobs.calls.at(-1).steps[0].args.slice(1), ['sources', 'demo', '--add-shared', 'input.mp4']);
  await service.call('source_manage', { slug: 'demo', action: 'set', id: 's1', role: 'speech', note: 'Main take' });
  assert.deepEqual(jobs.calls.at(-1).steps[0].args.slice(1), ['sources', 'demo', '--set', 's1', '--role', 'speech', '--note', 'Main take']);
  await service.call('music_manage', { action: 'add', options: { input: 'shared/input.wav', source: 'https://example.com/track', license: 'cc0', title: 'Track', author: 'Owner', mood: 'upbeat', energy: 3 } });
  assert.ok(jobs.calls.at(-1).steps[0].args.includes('--license'));
  const approval = { human_confirmed: true, approval_note: 'User approved reviewed result.' };
  await service.call('gate_decide', { slug: 'demo', gate: 1, decision: 'approve', ...approval });
  assert.deepEqual(jobs.calls.at(-1).steps[0].args.slice(1), ['gate', 'demo', 'approve', '1', '--note', approval.approval_note]);
  mkdirSync(join(root, 'videos/demo/renders')); writeFileSync(join(root, 'videos/demo/renders/demo.mp4'), 'render');
  await service.call('publish', { slug: 'demo', destination: 'repliz', schedule_at: '2026-10-02T12:00:00+07:00', ...approval });
  const args = jobs.calls.at(-1).steps[0].args;
  assert.ok(args.includes('--approved')); assert.ok(args.includes('--schedule-at'));
  await assert.rejects(service.call('publish', { slug: 'demo', destination: 'repliz', file: 'shared/input.mp4', ...approval }), /outside allowed/);
});
test('blind rating adapter conforms to actual five-criterion owner contract', async (t) => {
  const { service, root } = await setup(t);
  const dir = join(root, 'shared/voice-tests/20261001-1200'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'key.json'), '{"labels":{"A":{"voice":"secret"}}}');
  const result = await service.call('voice_tests_rate', { run: '20261001-1200', ratings: [{ label: 'A', natural: 4, pronunciation: 5, register: 4, endurance: 5, similarity: 3, note: 'Good' }] });
  assert.equal(result.ratings.A.natural, 4);
  const info = await service.call('voice_tests_read', { run: '20261001-1200' });
  assert.equal(JSON.stringify(info).includes('secret'), false);
});
test('fixed asset-sheet output directories cannot be symlinks', async (t) => {
  const { service, root, jobs } = await setup(t);
  mkdirSync(join(root, 'docs/agents/references'), { recursive: true });
  symlinkSync(join(root, 'config'), join(root, 'docs/agents/references/asset-catalog'));
  await assert.rejects(service.call('asset_manage', { action: 'sheets' }), /symlink/);
  assert.equal(jobs.calls.length, 0);
});
test('legacy source migration rejects linked project directories before running owner CLI', async (t) => {
  const { service, root, jobs } = await setup(t);
  symlinkSync(join(root, 'config'), join(root, 'videos/legacy'));
  await assert.rejects(service.call('sources_migrate', { apply: true, human_confirmed: true, approval_note: 'Migrate old projects.' }), /symlink/);
  assert.equal(jobs.calls.length, 0);
});
test('migration accepts the exact supported legacy source.mp4 link to direct raw media', async (t) => {
  const { service, root, jobs } = await setup(t);
  mkdirSync(join(root, 'raw')); writeFileSync(join(root, 'raw/input.mp4'), 'video');
  symlinkSync('../../raw/input.mp4', join(root, 'videos/demo/source.mp4'));
  await service.call('sources_migrate', {});
  assert.deepEqual(jobs.calls.at(-1).steps[0].args.slice(1), ['migrate-sources']);
});
test('receipt calendar cannot follow planted private receipt symlinks', async (t) => {
  const { service, root } = await setup(t);
  writeFileSync(join(root, 'config/private-receipt.json'), '{"schedules":[]}');
  symlinkSync(join(root, 'config/private-receipt.json'), join(root, 'videos/demo/repliz-publish.json'));
  await assert.rejects(service.call('calendar_read', { month: '2026-10' }), /symlink/);
});
test('sanitizer redacts JSON escaped secrets and arbitrary data/blob fields but preserves binary protocol payloads', () => {
  const secret = 'quoted"secret\\token', redact = redactor({ SECRET_KEY: secret });
  assert.equal(redact(secret), '[redacted]');
  assert.equal(JSON.parse(redact(JSON.stringify({ value: secret }))).value, '[redacted]');
  const value = redactValue({ data: secret, blob: secret, nested: [{ name: secret }] }, redact);
  assert.equal(value.data, '[redacted]'); assert.equal(value.blob, '[redacted]'); assert.equal(value.nested[0].name, '[redacted]');
  assert.equal(redactValue({ result: { content: [{ type: 'image', data: 'TEST', mimeType: 'image/png' }] } }, (s) => s.replaceAll('TEST', 'changed')).result.content[0].data, 'TEST');
});
test('multi-resource jobs reserve shared media while source attachment runs', async (t) => {
  const root = fixture(t); const children = [];
  const jobs = new Jobs({ spawnImpl: () => { const c = new EventEmitter(); c.stdout = new EventEmitter(); c.stderr = new EventEmitter(); c.kill = () => c.emit('close', null); children.push(c); return c; } });
  t.after(() => jobs.close());
  const service = createService({ root, jobs, env: {} });
  await service.call('project_create', { slug: 'demo' }); writeFileSync(join(root, 'shared/input.mp4'), 'video');
  const job = await service.call('source_manage', { slug: 'demo', action: 'attach', names: ['input.mp4'] });
  assert.deepEqual(job.keys, ['project:demo', 'shared-library']);
  await assert.rejects(service.call('shared_delete', { name: 'input.mp4', human_confirmed: true, approval_note: 'Remove unused file.' }), /running/);
  jobs.cancel(job.id);
});
test('concurrent shared imports cannot use an irrelevant slug to evade the shared lock', async (t) => {
  const { service, root } = await setup(t); writeFileSync(join(root, 'shared/input.png'), Buffer.alloc(1 << 20));
  const first = service.call('media_import', { input: 'shared/input.png', destination: 'shared', name: 'copy.png', slug: 'one' });
  await assert.rejects(service.call('media_import', { input: 'shared/input.png', destination: 'shared', name: 'copy.png', slug: 'two' }), /running/);
  assert.equal((await first).path, 'shared/copy.png'); assert.equal(statSize(join(root, 'shared/copy.png')), 1 << 20);
});
const statSize = (p) => readFileSync(p).length;
test('async media import locks the project and never overwrites or imports outside configured roots', async (t) => {
  const { service, root } = await setup(t);
  writeFileSync(join(root, 'shared/photo.png'), Buffer.alloc(1 << 20));
  const first = service.call('media_import', { input: 'shared/photo.png', slug: 'demo', destination: 'assets' });
  await assert.rejects(service.call('artifact_write', { slug: 'demo', path: 'notes.md', content: 'Race' }), /running/);
  assert.equal((await first).path, 'videos/demo/assets/photo.png');
  await assert.rejects(service.call('media_import', { input: 'shared/photo.png', slug: 'demo', destination: 'assets' }), /already exists/);
  await assert.rejects(service.call('media_import', { input: join(root, 'shared/photo.png'), slug: 'demo', destination: 'assets' }), /import roots/);
});
test('transcription uses the local toolchain and normalizes source and processed time-base artifacts', async (t) => {
  const { service, root, jobs } = await setup(t);
  mkdirSync(join(root, 'vendor/whisper.cpp/build/bin'), { recursive: true }); mkdirSync(join(root, 'vendor/whisper.cpp/models'), { recursive: true });
  writeFileSync(join(root, 'vendor/whisper.cpp/build/bin/whisper-cli'), 'fake');
  writeFileSync(join(root, 'vendor/whisper.cpp/models/ggml-large-v3-turbo.bin'), 'model');
  writeFileSync(join(root, 'shared/take.mp4'), 'video');
  writeFileSync(join(root, 'videos/demo/processed.mp4'), 'processed');
  writeFileSync(join(root, 'videos/demo/sources.json'), JSON.stringify({ version: 1, sources: [{ id: 's1', kind: 'video', origin: 'shared', path: '../../shared/take.mp4', role: 'speech' }] }));
  for (const a of [{ source_id: 's1' }, { processed: true }]) {
    await service.call('transcribe', { slug: 'demo', ...a });
    const spec = jobs.calls.at(-1);
    assert.equal(spec.steps[0].command, 'ffmpeg'); assert.ok(spec.steps[1].command.endsWith('/vendor/whisper.cpp/build/bin/whisper-cli'));
    const outputBase = spec.steps[1].args[spec.steps[1].args.indexOf('-of') + 1];
    writeFileSync(`${outputBase}.json`, JSON.stringify({ transcription: [{ text: ' Halo dunia', offsets: { from: 0, to: 1000 }, tokens: [{ text: ' Halo', t_dtw: 0 }, { text: ' dunia', t_dtw: 50 }] }] }));
    spec.onSuccess();
    const normalized = JSON.parse(readFileSync(join(root, 'videos/demo', a.processed ? 'processed-transcript.json' : 'transcripts/s1.json'), 'utf8'));
    assert.equal(normalized.timeBase, a.processed ? 'processed' : 'source');
    assert.deepEqual(normalized.words.map((w) => w.start), [0, 0.5]);
  }
});
test('all supported revisions initialize, unknown revisions negotiate down, and legacy media links become text', async (t) => {
  const { root, service } = await setup(t); writeFileSync(join(root, 'shared/test.wav'), 'audio');
  for (const requested of [...VERSIONS, '2099-01-01']) {
    const input = new PassThrough(), output = new PassThrough();
    const rpc = serve(service, { input, output });
    let requestId = 0; const responses = new Map(); const lines = createInterface({ input: output });
    lines.on('line', (line) => { const msg = JSON.parse(line); responses.get(msg.id)?.(msg); });
    const send = (method, params = {}) => new Promise((res) => { const id = ++requestId; responses.set(id, res); input.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
    const init = await send('initialize', { protocolVersion: requested, capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    const negotiated = VERSIONS.includes(requested) ? requested : VERSIONS.at(-1);
    assert.equal(init.result.protocolVersion, negotiated);
    input.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    const media = await send('tools/call', { name: 'file_read', arguments: { path: 'shared/test.wav' } });
    assert.equal(media.result.content[0].type, negotiated < '2025-06-18' ? 'text' : 'resource_link');
    const method = await send('unknown/method'); assert.equal(method.error.code, -32601);
    rpc.stop(); input.destroy(); lines.close(); output.destroy();
  }
});
test('client configurations encode absolute paths, readonly/import switches, and safe syntax', () => {
  const root = '/tmp/video workspace';
  const options = { node: '/tmp/node', readOnly: true, importRoots: ['/tmp/footage'] };
  for (const format of ['claude', 'json', 'vscode']) {
    const config = JSON.parse(clientConfig(root, format, options));
    const server = (config.mcpServers ?? config.servers)['dena-video'];
    assert.equal(server.command, '/tmp/node'); assert.ok(server.args.includes('--read-only')); assert.ok(server.args.includes('/tmp/footage'));
  }
  assert.ok(clientConfig(root, 'codex', options).includes('[mcp_servers.dena-video]'));
  assert.ok(clientConfig(root, 'hermes', options).startsWith('mcp_servers:\n'));
});
test('real child cancellation retains its project lock until process-group escalation completes', async (t) => {
  const jobs = new Jobs(); t.after(() => jobs.close());
  const started = jobs.start({ key: 'project:test', steps: [{ command: process.execPath, args: ['-e', 'process.on("SIGTERM",()=>{}); setInterval(()=>{},100);'] }], cwd: repo });
  const cancelled = jobs.cancel(started.id);
  assert.equal(cancelled.status, 'cancelling'); assert.equal(jobs.busy('project:test'), true);
  assert.throws(() => jobs.start({ key: 'project:test', steps: [{ command: process.execPath, args: [] }], cwd: repo }), /already running/);
  await new Promise((res) => setTimeout(res, 2200));
  assert.equal(jobs.get(started.id).status, 'cancelled'); assert.equal(jobs.busy('project:test'), false);
});
test('real stdio client initializes, reads resources, validates params, handles concurrent requests and shuts down', async (t) => {
  const root = fixture(t);
  const child = spawn(process.execPath, [join(repo, 'scripts/mcp.mjs'), '--root', root, '--read-only'], { stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const pending = new Map(); let id = 0, stderr = '';
  child.stderr.on('data', (x) => { stderr += x; });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => { const msg = JSON.parse(line); const item = pending.get(msg.id); if (item) { pending.delete(msg.id); item(msg); } });
  function call(method, params = {}) {
    const requestId = ++id;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error(`timeout ${method}: ${stderr}`)), 5000);
      pending.set(requestId, (msg) => { clearTimeout(timer); res(msg); });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n');
    });
  }
  const init = await call('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.protocolVersion, '2025-11-25');
  child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
  const [tools, resource, ping] = await Promise.all([
    call('tools/list'), call('resources/read', { uri: 'dena://workspace/AGENTS.md' }), call('ping'),
  ]);
  assert.ok(tools.result.tools.length > 5); assert.ok(resource.result.contents[0].text); assert.deepEqual(ping.result, {});
  const bad = await call('tools/call', { name: 'file_read', arguments: { path: '.env' } });
  assert.equal(bad.result.isError, true);
  assert.equal((await call('tools/call', { name: 'missing', arguments: {} })).error.code, -32602);
  const exited = new Promise((res) => child.once('exit', res));
  child.stdin.end();
  assert.equal(await exited, 0);
});
