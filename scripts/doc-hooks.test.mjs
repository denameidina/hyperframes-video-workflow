import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const hooks = { codex: resolve('.codex/hooks/ensure-learning-docs.py'), claude: resolve('.claude/hooks/ensure-docs-updated.py') };
function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'doc-hooks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout;
  };
  const put = (file, text) => { mkdirSync(dirname(join(dir, file)), { recursive: true }); writeFileSync(join(dir, file), text); };
  git('init', '--quiet');
  git('config', 'user.name', 'Hook test');
  git('config', 'user.email', 'hook-test@example.invalid');
  put('scripts/test.mjs', '// initial\n');
  put('internal/docs/test.md', '# Initial\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');
  const run = (runtime, data = {}, event = 'stop') => {
    const r = spawnSync('python3', ['-B', hooks[runtime]], { cwd: dir, input: JSON.stringify({ cwd: dir, ...data }), encoding: 'utf8', env: { ...process.env, DENA_LEARNING_DOC_HOOK_EVENT: event } });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim() ? JSON.parse(r.stdout) : null;
  };
  return { dir, put, git, run };
}

test('Codex blocks an unstaged workflow edit and accepts a canonical docs edit', (t) => {
  const r = repo(t);
  r.put('scripts/test.mjs', '// changed\n');
  assert.equal(r.run('codex')?.decision, 'block');
  r.put('internal/docs/test.md', '# Changed\n');
  assert.equal(r.run('codex'), null);
});

test('Codex preserves spaces and Unicode when reporting a staged rename', (t) => {
  const r = repo(t);
  r.git('mv', 'scripts/test.mjs', 'scripts/é ruang.mjs');
  const block = r.run('codex');
  assert.equal(block?.decision, 'block');
  assert.match(block.reason, /scripts\/é ruang\.mjs/);
});

test('Codex learning is satisfied by a canonical document updated after the prompt', (t) => {
  const r = repo(t);
  r.run('codex', { prompt: 'Catat learning ini' }, 'user_prompt_submit');
  const state = join(r.dir, '.git/codex-learning-docs-required.json');
  assert.ok(existsSync(state));
  assert.equal(r.run('codex')?.decision, 'block');
  r.put('internal/docs/test.md', '# Learning\n');
  const future = new Date(Date.now() + 1000);
  utimesSync(join(r.dir, 'internal/docs/test.md'), future, future);
  assert.equal(r.run('codex'), null);
  assert.equal(existsSync(state), false);
});

for (const runtime of ['codex', 'claude']) {
  test(`${runtime} accepts only an explicit assistant mechanical exemption with a reason`, (t) => {
    const r = repo(t);
    r.put('scripts/test.mjs', '// formatting\n');
    r.git('add', 'scripts/test.mjs');
    assert.equal(r.run(runtime)?.decision, 'block');
    assert.equal(r.run(runtime, { prompt: 'no docs update needed: formatting only' })?.decision, 'block');
    assert.equal(r.run(runtime, { last_assistant_message: 'no docs update needed' })?.decision, 'block');
    assert.equal(r.run(runtime, { last_assistant_message: 'no docs update needed: \nDone.' })?.decision, 'block');
    assert.equal(r.run(runtime, { last_assistant_message: 'Summary: no docs update needed: formatting only' })?.decision, 'block');
    assert.equal(r.run(runtime, { last_assistant_message: 'Done.\nno docs update needed: formatting only\n' }), null);
  });
}

test('a mechanical exception cannot bypass an outstanding Codex learning requirement', (t) => {
  const r = repo(t);
  r.run('codex', { prompt: 'Catat learning ini' }, 'user_prompt_submit');
  assert.equal(r.run('codex', { last_assistant_message: 'no docs update needed: formatting only' })?.decision, 'block');
});
