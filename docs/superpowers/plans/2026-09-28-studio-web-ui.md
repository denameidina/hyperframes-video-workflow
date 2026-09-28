# Studio Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run studio` serves a mobile-first web UI (localhost + Tailscale) to upload/delete raw videos, start interactive Claude/Codex editing sessions in tmux, watch and steer their terminal, list renders, and publish a render to Repliz.

**Architecture:** One zero-dependency Node server (`scripts/studio.mjs`) wires small modules under `scripts/studio/`. State lives only on disk (`raw/`, `videos/<slug>/`) and in tmux (`studio-<slug>` sessions with `@studio_*` options). The browser terminal is xterm.js fed by SSE; each viewer gets a PTY from macOS `script(1)` running `tmux attach`, and keystrokes come back via POST.

**Tech Stack:** Node 22+ built-ins only (`node:http`, `node:child_process`, `node:test`), tmux 3.x, macOS `script(1)`, vendored xterm.js 6.0.0 + addon-fit 0.11.0, plain HTML/CSS/JS UI.

**Spec:** `docs/superpowers/specs/2026-09-28-studio-web-ui-design.md`

## Global Constraints

- No npm dependencies (ADR-0007): `package.json` gains scripts only; import only `node:*` modules and repo files.
- Node 22+; ES modules; 2-space indent, single quotes, semicolons (match `scripts/video.mjs`).
- Listen only on `127.0.0.1` and the Tailscale IPv4; default port `4777` (`--port`, `STUDIO_PORT`).
- tmux session name `studio-<slug>`; slug must match `SLUG_RE` from `scripts/video.mjs` (`/^[a-z0-9][a-z0-9-]*$/`).
- tmux targets always use exact match: `=studio-<slug>` (and `=studio-<slug>:` for `send-keys`).
- Claude argv: `claude --model <M> --effort <E> --dangerously-skip-permissions`; efforts `low medium high xhigh max`; model aliases `opus sonnet fable haiku`.
- Codex argv: `codex -m <M> -c model_reasoning_effort="<E>" --dangerously-bypass-approvals-and-sandbox --no-alt-screen`; efforts `low medium high xhigh`.
- Model/effort strings must match `/^[A-Za-z0-9._:[\]-]+$/`.
- Prompt file `.studio/prompts/<slug>.md`; `.studio/` is gitignored.
- Every agent prompt ends with `Jangan publish ke Repliz — publish dilakukan Dena dari Studio.`
- Publish runs `node scripts/repliz-publish.mjs --slug videos/<slug> --file videos/<slug>/renders/<file> --approved`, one job per slug at a time.
- Never close a terminal attach's stdin (script(1) would send ^D into the agent); always kill the attach's process group.
- Node child pipes are sockets on macOS and `script(1)` rejects them (`tcgetattr/ioctl: Operation not supported on socket`); the attach command must start with `cat |` (verified 2026-09-28).
- Docs rule (CLAUDE.md): Task 1 commits ADR-0020 + RD-05 together with the first code; later commits state "no docs update needed — covered by ADR-0020/RD-05" unless they touch a documented contract; Task 9 syncs the command docs.

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/studio.mjs` | Entry: args, `.env`, Tailscale + tool detection, listen on each address |
| `scripts/studio/http.mjs` | `HttpError`, host/origin guard, token cookie, JSON/SSE helpers, ranged file send |
| `scripts/studio/agent.mjs` | Model/effort options, argv builder, pane command quoting, prompt text, codex defaults, slug suggestion |
| `scripts/studio/sessions.mjs` | tmux runner, list/parse/start/kill/interrupt `studio-*` sessions |
| `scripts/studio/raw.mjs` | Raw list, streamed upload, project linkage via `source.mp4`, renders list, cascade delete |
| `scripts/studio/results.mjs` | Render list, receipt summary, publish preview, `Publisher` job runner |
| `scripts/studio/terminal.mjs` | `attachCommand`, `Terminals` (one PTY per viewer) |
| `scripts/studio/app.mjs` | `createApp(deps)` request handler: static files + all routes |
| `scripts/studio/public/{index.html,login.html,app.css,app.js}` | UI |
| `scripts/studio.test.mjs` | All Studio unit + route tests (`npm run test:studio`) |
| `vendor/xterm/` | `xterm.js`, `xterm.css`, `addon-fit.js`, `LICENSE` |

---

### Task 1: HTTP helpers + docs foundation

**Files:**
- Create: `scripts/studio/http.mjs`
- Create: `scripts/studio.test.mjs`
- Create: `internal/docs/adr/0020-studio-web-ui.md`
- Create: `internal/docs/requirements/rd-05-studio.md`
- Modify: `internal/docs/README.md` (register both new docs)
- Modify: `package.json` (scripts `studio`, `test:studio`)
- Modify: `.github/workflows/ci.yml` (run `npm run test:studio`)
- Modify: `.gitignore`, `.env.example`

**Interfaces:**
- Produces: `class HttpError(status, message)` with `.status`; `allowedHosts({ addresses, port, names }) → Set<string>` of `host:port`; `guardRequest({ method, headers }, hosts)` throws `HttpError(403)`; `tokenCookie(token) → hex`; `tokenMatches(given, token) → boolean`; `hasToken(headers, token) → boolean`; `sendJson(res, status, body)`; `readJson(req, limit?) → Promise<object>`; `openSse(res) → { send(event, data), end(), onClose(fn) }`; `parseRange(header, size) → null | 'invalid' | { start, end }`; `sendFile(req, res, file)`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/studio.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedHosts, guardRequest, hasToken, parseRange, tokenCookie, tokenMatches } from './studio/http.mjs';

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
```

- [ ] **Step 2: Add the npm scripts and run the tests to see them fail**

In `package.json` `scripts`, after `"test:video"`, add:

```json
    "studio": "node scripts/studio.mjs",
    "test:studio": "node --test scripts/studio.test.mjs"
```

(keep the comma after `"test:video": ...`). Run: `npm run test:studio`
Expected: FAIL — `Cannot find module '.../scripts/studio/http.mjs'`.

- [ ] **Step 3: Implement `scripts/studio/http.mjs`**

```js
// Studio HTTP helpers: request guard, token cookie, JSON, SSE, ranged files (ADR-0020).
import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { extname } from 'node:path';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function allowedHosts({ addresses, port, names = [] }) {
  return new Set([...addresses, 'localhost', ...names].map((h) => `${h}:${port}`));
}

// Rejects a foreign Host (DNS rebinding) and a cross-origin mutation (CSRF).
export function guardRequest({ method, headers }, hosts) {
  const host = headers.host || '';
  if (!hosts.has(host)) throw new HttpError(403, 'host not allowed');
  if (method !== 'GET' && method !== 'HEAD' && headers.origin !== `http://${host}`) throw new HttpError(403, 'origin not allowed');
}

export const tokenCookie = (token) => createHash('sha256').update(`studio:${token}`).digest('hex');

const same = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const tokenMatches = (given, token) => Boolean(token) && same(tokenCookie(String(given ?? '')), tokenCookie(token));

function cookieValue(header = '', name) {
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

export function hasToken(headers, token) {
  if (!token) return true;
  return same(cookieValue(headers.cookie, 'studio'), tokenCookie(token));
}

export function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export async function readJson(req, limit = 65536) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'body too large');
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'invalid JSON');
  }
}

export function openSse(res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write(': open\n\n');
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  const closers = [];
  let closed = false;
  res.on('close', () => {
    closed = true;
    clearInterval(ping);
    for (const f of closers) f();
  });
  return {
    send(event, data) {
      if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      if (!closed) res.end();
    },
    onClose(f) {
      closers.push(f);
    },
  };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
};

export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start > end || start >= size) return 'invalid';
  return { start, end };
}

export function sendFile(req, res, file) {
  let st;
  try {
    st = statSync(file);
  } catch {
    throw new HttpError(404, 'not found');
  }
  const headers = { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
  const range = parseRange(req.headers.range, st.size);
  if (range === 'invalid') {
    res.writeHead(416, { 'content-range': `bytes */${st.size}` });
    res.end();
  } else if (range) {
    res.writeHead(206, { ...headers, 'content-range': `bytes ${range.start}-${range.end}/${st.size}`, 'content-length': range.end - range.start + 1 });
    createReadStream(file, range).pipe(res);
  } else {
    res.writeHead(200, { ...headers, 'content-length': st.size });
    createReadStream(file).pipe(res);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:studio`
Expected: 4 tests pass.

- [ ] **Step 5: Docs foundation**

Create `internal/docs/adr/0020-studio-web-ui.md` (read `internal/docs/adr/0019-story-decides-hook-length.md` first and match its headings):

```markdown
# ADR-0020 Studio: web UI lokal tanpa dependency untuk raw, sesi agen, dan publish
Status: accepted
Date: 2026-09-28

## Context

Alur video Dena berjalan dari terminal: salin raw ke `raw/`, buka Claude/Codex,
arahkan ke workflow, lalu `npm run repliz:publish`. Dena ingin satu halaman web
yang bisa dibuka dari Mac ini dan dari HP lewat Tailscale untuk upload/hapus raw,
memulai sesi edit agen interaktif di tmux (pola hanoman), melihat dan men-steer
terminalnya, melihat render, dan publish ke Repliz.

## Decision

- `npm run studio` menjalankan `scripts/studio.mjs`: server `node:http` bawaan,
  tanpa dependency npm (ADR-0007 tetap berlaku).
- Listen hanya di `127.0.0.1` dan IPv4 Tailscale; port default 4777. Setiap
  request dicek `Host`; request mutasi wajib `Origin` yang sama. `STUDIO_TOKEN`
  opsional mengaktifkan login cookie.
- State hanya filesystem (`raw/`, `videos/<slug>/`) dan tmux: sesi
  `studio-<slug>` dengan option `@studio_runtime`, `@studio_model`,
  `@studio_effort`, `@studio_raw`, `@studio_started`. Sesi bertahan saat Studio
  restart.
- Agen jalan interaktif dengan izin bypass (`--dangerously-skip-permissions` /
  `--dangerously-bypass-approvals-and-sandbox`); prompt pertama dari
  `.studio/prompts/<slug>.md` menyuruh mengikuti workflow Dena dan melarang
  publish. Gate workflow tetap berhenti di terminal.
- Terminal browser: xterm.js (di-vendor di `vendor/xterm/`) menerima output lewat
  SSE; tiap viewer punya PTY dari `script(1)` macOS yang menjalankan
  `tmux attach` (stdin lewat `cat |` karena pipe Node di macOS adalah socket);
  ketikan dikirim lewat POST. Resize = attach ulang.
- Hapus raw = hard delete cascade: sesi tmux terkait di-kill, setiap
  `videos/<slug>/` yang `source.mp4`-nya menunjuk raw itu dihapus, lalu raw.
- Publish dari UI: klik konfirmasi = persetujuan eksplisit (ADR-0003); Studio
  menjalankan `repliz-publish.mjs --approved`, satu job per slug.

## Rationale

- Tanpa node-pty/WebSocket: tidak ada native build dan clone tetap ringan;
  latensi POST per ketikan cukup untuk satu pengguna lewat Tailscale.
- tmux sebagai pemilik sesi (seperti hanoman) membuat agen tahan restart server
  dan tab browser yang ditutup.

## Consequences

- Studio hanya didukung di macOS (`script(1)` BSD) dengan tmux 3.x.
- Siapa pun yang bisa membuka Studio punya akses shell setara Dena; keamanannya
  bergantung pada bind address, cek Host/Origin, Tailscale, dan `STUDIO_TOKEN`.
- Resize terminal berkedip karena attach ulang.

## Sources

- `docs/superpowers/specs/2026-09-28-studio-web-ui-design.md`
- `scripts/studio.mjs`, `scripts/studio/`
- [requirements/rd-05-studio](../requirements/rd-05-studio.md)
```

Create `internal/docs/requirements/rd-05-studio.md` (match the header style of `rd-04-transcription-setup.md`):

```markdown
# RD-05 Studio Web UI
Status: accepted
Date: 2026-09-28

Domain: web UI lokal untuk raw video, sesi agen tmux, dan publish. Owner:
`scripts/studio.mjs`, `scripts/studio/`. Keputusan:
[ADR-0020](../adr/0020-studio-web-ui.md).

- **RD-05-01** (Ubiquitous) — Studio shall listen only on `127.0.0.1` and the
  host's Tailscale IPv4 address.
- **RD-05-02** (Unwanted) — If a request's `Host` is not a listen address, or a
  mutating request's `Origin` does not match, then Studio shall reject it with 403.
- **RD-05-03** (Optional) — Where `STUDIO_TOKEN` is set, Studio shall require a
  valid session cookie for every route except `/login`.
- **RD-05-04** (Event-driven) — When Dena uploads a video, Studio shall stream it
  to `raw/.<name>.part` and rename it to `raw/<name>` only after the upload
  completes.
- **RD-05-05** (Event-driven) — When Dena confirms deleting a raw video, Studio
  shall kill the tmux sessions of linked projects, delete every `videos/<slug>/`
  whose `source.mp4` resolves to that raw file, and delete the raw file.
- **RD-05-06** (Event-driven) — When Dena starts an edit, Studio shall start an
  interactive tmux session `studio-<slug>` running the selected runtime with the
  selected model and effort and the workflow prompt as its first message.
- **RD-05-07** (State-driven) — While a session `studio-<slug>` exists, Studio
  shall offer to open its terminal instead of starting another session for that
  slug.
- **RD-05-08** (Event-driven) — When a viewer opens a terminal, Studio shall
  relay the tmux pane output to that viewer and write that viewer's input to the
  pane.
- **RD-05-09** (Ubiquitous) — Studio shall keep agent sessions running when a
  viewer disconnects or the Studio server restarts.
- **RD-05-10** (Event-driven) — When Dena confirms a publish, Studio shall run
  `repliz-publish.mjs` with `--approved` for that render and stream its output.
- **RD-05-11** (Unwanted) — If a publish for the same slug is already running,
  then Studio shall reject a new publish request with 409.
- **RD-05-12** (Ubiquitous) — The prompt Studio sends to an agent shall instruct
  it not to publish to Repliz.
```

Register both in `internal/docs/README.md`: read the file, then (a) add `requirements/rd-05-studio.md` to the numbered index right after the `rd-04-transcription-setup.md` entry and `adr/0020-studio-web-ui.md` right after the `adr/0019-...` entry, renumbering the following entries so the list stays sequential; (b) add a registry row `| Studio web UI (EARS) | [requirements/rd-05-studio](requirements/rd-05-studio.md) |` after the `Transkripsi & setup (EARS)` row; (c) change `(0001–0019)` to `(0001–0020)`.

Append to `.gitignore` (after the `# caches and temporary files` block):

```
# Studio agent prompts (ADR-0020)
.studio/
```

Append to `.env.example`:

```
# Studio web UI (ADR-0020). Port defaults to 4777; set a token to require login.
STUDIO_PORT=
STUDIO_TOKEN=
```

In `.github/workflows/ci.yml` add after `- run: npm run test:video`:

```yaml
      - run: npm run test:studio
```

- [ ] **Step 6: Commit**

```bash
git add scripts/studio/http.mjs scripts/studio.test.mjs package.json .github/workflows/ci.yml .gitignore .env.example internal/docs/adr/0020-studio-web-ui.md internal/docs/requirements/rd-05-studio.md internal/docs/README.md
git commit -m "feat(studio): HTTP guard helpers, ADR-0020, RD-05

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Agent command, prompt, and options

**Files:**
- Create: `scripts/studio/agent.mjs`
- Modify: `scripts/studio.test.mjs`

**Interfaces:**
- Consumes: `HttpError` (Task 1).
- Produces: `RUNTIMES = ['claude','codex']`; `CLAUDE_MODELS = ['opus','sonnet','fable','haiku']`; `EFFORTS = { claude: [...5], codex: [...4] }`; `suggestSlug(fileName) → string`; `agentCommand({ runtime, model, effort }) → string[]` (throws `HttpError(400)`); `shellQuote(s) → string`; `paneCommand(argv, promptPath) → string`; `buildPrompt({ mode: 'new'|'continue', rawFile, slug, notes }) → string`; `codexDefaults(tomlText) → { model, effort }`.

- [ ] **Step 1: Write the failing tests**

Add to the imports at the top of `scripts/studio.test.mjs`:

```js
import { CLAUDE_MODELS, EFFORTS, agentCommand, buildPrompt, codexDefaults, paneCommand, suggestSlug } from './studio/agent.mjs';
```

Append:

```js
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
```

- [ ] **Step 2: Run to see failure**

Run: `npm run test:studio`
Expected: FAIL — cannot find `./studio/agent.mjs`.

- [ ] **Step 3: Implement `scripts/studio/agent.mjs`**

```js
// Studio agent sessions: runtime options, command line, and first prompt (ADR-0020).
import { basename, extname } from 'node:path';
import { HttpError } from './http.mjs';

export const RUNTIMES = ['claude', 'codex'];
export const CLAUDE_MODELS = ['opus', 'sonnet', 'fable', 'haiku'];
export const EFFORTS = {
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
  codex: ['low', 'medium', 'high', 'xhigh'],
};
const OPTION_RE = /^[A-Za-z0-9._:[\]-]+$/;
const SKILL = '`docs/skills/dena-video-editing-workflow/SKILL.md`';

export function suggestSlug(fileName) {
  const stem = basename(String(fileName), extname(String(fileName)));
  const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  return slug || 'video';
}

export function agentCommand({ runtime, model, effort }) {
  if (!RUNTIMES.includes(runtime)) throw new HttpError(400, 'runtime must be claude or codex');
  if (typeof model !== 'string' || !OPTION_RE.test(model)) throw new HttpError(400, 'model has invalid characters');
  if (!EFFORTS[runtime].includes(effort)) throw new HttpError(400, `effort must be one of ${EFFORTS[runtime].join(', ')}`);
  if (runtime === 'claude') return ['claude', '--model', model, '--effort', effort, '--dangerously-skip-permissions'];
  return ['codex', '-m', model, '-c', `model_reasoning_effort="${effort}"`, '--dangerously-bypass-approvals-and-sandbox', '--no-alt-screen'];
}

export const shellQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// The prompt stays in a file so Dena's notes never pass through shell parsing.
export function paneCommand(argv, promptPath) {
  return `${argv.map(shellQuote).join(' ')} "$(cat ${shellQuote(promptPath)})"`;
}

export function buildPrompt({ mode, rawFile, slug, notes }) {
  const note = String(notes ?? '').trim() || '-';
  const first = mode === 'continue'
    ? `Lanjutkan proyek \`videos/${slug}/\` (raw \`raw/${rawFile}\`). Baca artefak yang sudah ada, tentukan fase terakhir yang selesai, lalu lanjutkan sesuai ${SKILL}.`
    : `Edit raw video \`raw/${rawFile}\` sebagai proyek \`videos/${slug}/\`. Ikuti ${SKILL} mulai dari fase Story.`;
  return `${first}\nCatatan dari Dena: ${note}\nJangan publish ke Repliz — publish dilakukan Dena dari Studio.\n`;
}

export function codexDefaults(text = '') {
  const top = text.split(/^\s*\[/m)[0];
  const pick = (key) => (new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm').exec(top) || [])[1] || '';
  return { model: pick('model'), effort: pick('model_reasoning_effort') };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:studio`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/studio/agent.mjs scripts/studio.test.mjs
git commit -m "feat(studio): agent argv, prompt, and runtime options

No docs update needed — covered by ADR-0020/RD-05.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: tmux sessions

**Files:**
- Create: `scripts/studio/sessions.mjs`
- Modify: `scripts/studio.test.mjs`

**Interfaces:**
- Consumes: `checkSlug` from `scripts/video.mjs`; `agentCommand`, `paneCommand` (Task 2); `HttpError` (Task 1).
- Produces: `PREFIX = 'studio-'`; `sessionName(slug)`; `FORMAT` (tab-separated tmux format); `tmuxEnv(env?) → env without TMUX/TMUX_PANE`; `runFile(cmd, args) → Promise<{ code, stdout, stderr }>`; `parseSessions(stdout, nowSec) → Session[]` where `Session = { slug, runtime, model, effort, raw, started, status: 'running'|'idle'|'exited' }`; `listSessions({ run?, now? })`; `hasSession(slug, { run? }) → boolean`; `startSession({ root, slug, runtime, model, effort, rawFile, prompt, run?, now? }) → { slug, name }` (409 if exists); `killSession(slug, { run? })`; `interruptSession(slug, { run? })` (404 if missing). Every `run` is `async (cmd, args) → { code, stdout, stderr }`.

- [ ] **Step 1: Write the failing tests**

Add imports at the top of `scripts/studio.test.mjs`:

```js
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FORMAT, hasSession, interruptSession, killSession, listSessions, parseSessions, sessionName, startSession } from './studio/sessions.mjs';
```

Append:

```js
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
```

- [ ] **Step 2: Run to see failure**

Run: `npm run test:studio`
Expected: FAIL — cannot find `./studio/sessions.mjs`.

- [ ] **Step 3: Implement `scripts/studio/sessions.mjs`**

```js
// Studio agent sessions live in tmux as studio-<slug>; metadata sits in tmux user options (ADR-0020).
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkSlug } from '../video.mjs';
import { agentCommand, paneCommand } from './agent.mjs';
import { HttpError } from './http.mjs';

export const PREFIX = 'studio-';
export const IDLE_AFTER = 3;
export const sessionName = (slug) => PREFIX + checkSlug(slug);
const FIELDS = ['session_name', 'window_activity', 'pane_dead', '@studio_runtime', '@studio_model', '@studio_effort', '@studio_raw', '@studio_started'];
export const FORMAT = FIELDS.map((f) => `#{${f}}`).join('\t');

// A Studio started inside tmux must not make tmux think it is nesting.
export function tmuxEnv(env = process.env) {
  const e = { ...env };
  delete e.TMUX;
  delete e.TMUX_PANE;
  return e;
}

export function runFile(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { env: tmuxEnv(), maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

export function parseSessions(stdout, nowSec) {
  const seen = new Set();
  const out = [];
  for (const line of stdout.split('\n')) {
    const [name, activity, dead, runtime, model, effort, raw, started] = line.split('\t');
    if (!name || !name.startsWith(PREFIX) || seen.has(name)) continue;
    seen.add(name);
    const status = dead === '1' ? 'exited' : nowSec - Number(activity) < IDLE_AFTER ? 'running' : 'idle';
    out.push({ slug: name.slice(PREFIX.length), runtime, model, effort, raw, started: Number(started) || 0, status });
  }
  return out;
}

export async function listSessions({ run = runFile, now = Date.now } = {}) {
  const r = await run('tmux', ['list-panes', '-a', '-F', FORMAT]);
  if (r.code !== 0) return []; // no tmux server yet
  return parseSessions(r.stdout, Math.floor(now() / 1000));
}

export async function hasSession(slug, { run = runFile } = {}) {
  return (await run('tmux', ['has-session', '-t', `=${sessionName(slug)}`])).code === 0;
}

export async function startSession({ root, slug, runtime, model, effort, rawFile, prompt, run = runFile, now = Date.now }) {
  const name = sessionName(slug);
  const argv = agentCommand({ runtime, model, effort });
  if (await hasSession(slug, { run })) throw new HttpError(409, `session ${name} already exists`);
  const promptPath = join('.studio', 'prompts', `${slug}.md`);
  mkdirSync(join(root, '.studio', 'prompts'), { recursive: true });
  writeFileSync(join(root, promptPath), prompt);
  const set = (key, value) => [';', 'set-option', '-t', name, key, String(value)];
  const r = await run('tmux', [
    'new-session', '-d', '-s', name, '-x', '120', '-y', '40', '-c', root, '-e', `PATH=${process.env.PATH}`, paneCommand(argv, promptPath),
    ';', 'set-option', '-w', '-t', name, 'remain-on-exit', 'on',
    ...set('@studio_runtime', runtime),
    ...set('@studio_model', model),
    ...set('@studio_effort', effort),
    ...set('@studio_raw', rawFile),
    ...set('@studio_started', Math.floor(now() / 1000)),
  ]);
  if (r.code !== 0) throw new HttpError(500, `tmux new-session failed: ${r.stderr.trim()}`);
  return { slug, name };
}

export async function killSession(slug, { run = runFile } = {}) {
  await run('tmux', ['kill-session', '-t', `=${sessionName(slug)}`]);
}

export async function interruptSession(slug, { run = runFile } = {}) {
  const r = await run('tmux', ['send-keys', '-t', `=${sessionName(slug)}:`, 'Escape']);
  if (r.code !== 0) throw new HttpError(404, 'session not found');
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:studio`
Expected: all tests pass.

- [ ] **Step 5: Real tmux check (one-off, not committed)**

```bash
node -e '
import("./scripts/studio/sessions.mjs").then(async (s) => {
  const r = await s.runFile("tmux", ["new-session","-d","-s","studio-plancheck","sleep 30",";","set-option","-t","studio-plancheck","@studio_raw","x.mp4"]);
  console.log(r.code, (await s.listSessions()).find((x) => x.slug === "plancheck"));
  await s.interruptSession("plancheck"); await s.killSession("plancheck");
  console.log(await s.hasSession("plancheck"));
});'
```

Expected: `0 { slug: 'plancheck', ..., raw: 'x.mp4', status: 'running' }` then `false`.

- [ ] **Step 6: Commit**

```bash
git add scripts/studio/sessions.mjs scripts/studio.test.mjs
git commit -m "feat(studio): tmux session start/list/kill/interrupt

No docs update needed — covered by ADR-0020/RD-05.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Raw library (list, upload, cascade delete)

**Files:**
- Create: `scripts/studio/raw.mjs`
- Modify: `scripts/studio.test.mjs`

**Interfaces:**
- Consumes: `SLUG_RE` from `scripts/video.mjs`; `HttpError`.
- Produces: `VIDEO_EXT`; `safeUploadName(name) → string` (400 on bad ext); `rawPath(root, name) → absolute path` (400 bad name, 404 missing); `projectSlugs(root) → string[]` (sorted); `projectRaw(root, slug) → rawName | null`; `linkedProjects(root, rawName) → string[]`; `rendersOf(root, slug) → string[]` (`*.mp4` in `videos/<slug>/renders/`); `listRaw(root, { probe }) → Promise<{ name, size, mtime, duration, projects }[]>` where `probe(file, mtimeMs) → Promise<number|null>`; `deletePlan(root, name) → { raw, projects: { slug, renders }[] }`; `deleteRawCascade(root, name) → plan`; `receiveUpload(root, name, readable) → Promise<savedName>` (409 if exists).

- [ ] **Step 1: Write the failing tests**

Update the `node:fs` import at the top of `scripts/studio.test.mjs` to:

```js
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
```

Add imports:

```js
import { Readable } from 'node:stream';
import { deletePlan, deleteRawCascade, linkedProjects, listRaw, projectRaw, rawPath, receiveUpload, rendersOf, safeUploadName } from './studio/raw.mjs';
```

Append:

```js
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
```

- [ ] **Step 2: Run to see failure**

Run: `npm run test:studio`
Expected: FAIL — cannot find `./studio/raw.mjs`.

- [ ] **Step 3: Implement `scripts/studio/raw.mjs`**

```js
// Studio raw library: list, streamed upload, project linkage, cascade hard delete (ADR-0020).
// A project belongs to a raw video when videos/<slug>/source.mp4 resolves to that raw file.
import { createWriteStream, existsSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { SLUG_RE } from '../video.mjs';
import { HttpError } from './http.mjs';

export const VIDEO_EXT = ['.mp4', '.mov', '.m4v'];
const isVideo = (n) => !n.startsWith('.') && VIDEO_EXT.includes(extname(n).toLowerCase());
const rawDir = (root) => join(root, 'raw');
const real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
};

export function safeUploadName(name) {
  const base = basename(String(name ?? '')).normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+/, '').slice(-120);
  if (!isVideo(base)) throw new HttpError(400, 'file must be .mp4, .mov, or .m4v');
  return base;
}

export function rawPath(root, name) {
  if (typeof name !== 'string' || basename(name) !== name || !isVideo(name)) throw new HttpError(400, 'invalid raw name');
  const p = join(rawDir(root), name);
  if (!existsSync(p) || !statSync(p).isFile()) throw new HttpError(404, `raw/${name} not found`);
  return p;
}

export function projectSlugs(root) {
  const dir = join(root, 'videos');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => SLUG_RE.test(d) && statSync(join(dir, d)).isDirectory()).sort();
}

export function projectRaw(root, slug) {
  const src = real(join(root, 'videos', slug, 'source.mp4'));
  if (!src || dirname(src) !== real(rawDir(root))) return null;
  return basename(src);
}

export const linkedProjects = (root, name) => projectSlugs(root).filter((slug) => projectRaw(root, slug) === name);

export function rendersOf(root, slug) {
  if (!SLUG_RE.test(slug)) throw new HttpError(400, 'invalid slug');
  const dir = join(root, 'videos', slug, 'renders');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => !f.startsWith('.') && extname(f).toLowerCase() === '.mp4').sort();
}

export async function listRaw(root, { probe }) {
  const dir = rawDir(root);
  if (!existsSync(dir)) return [];
  const items = [];
  for (const name of readdirSync(dir).filter(isVideo).sort()) {
    const file = join(dir, name);
    const st = statSync(file);
    if (!st.isFile()) continue;
    items.push({ name, size: st.size, mtime: st.mtimeMs, duration: await probe(file, st.mtimeMs), projects: linkedProjects(root, name) });
  }
  return items;
}

export function deletePlan(root, name) {
  rawPath(root, name);
  return { raw: name, projects: linkedProjects(root, name).map((slug) => ({ slug, renders: rendersOf(root, slug) })) };
}

// Callers kill the linked tmux sessions first (RD-05-05).
export function deleteRawCascade(root, name) {
  const plan = deletePlan(root, name);
  for (const { slug } of plan.projects) rmSync(join(root, 'videos', slug), { recursive: true, force: true });
  rmSync(join(rawDir(root), name));
  return plan;
}

export async function receiveUpload(root, rawName, stream) {
  const name = safeUploadName(rawName);
  const dir = rawDir(root);
  mkdirSync(dir, { recursive: true });
  const final = join(dir, name);
  const part = join(dir, `.${name}.part`);
  if (existsSync(final) || existsSync(part)) throw new HttpError(409, `raw/${name} already exists`);
  try {
    await pipeline(stream, createWriteStream(part, { flags: 'wx' }));
    renameSync(part, final);
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  return name;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:studio`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/studio/raw.mjs scripts/studio.test.mjs
git commit -m "feat(studio): raw list, streamed upload, cascade delete

No docs update needed — covered by ADR-0020/RD-05.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Results and publish job

**Files:**
- Create: `scripts/studio/results.mjs`
- Modify: `scripts/studio.test.mjs`

**Interfaces:**
- Consumes: `buildTargetAccounts(env)`, `readPostMetadata(slugDir)` from `scripts/repliz-publish.mjs`; `projectSlugs`, `rendersOf` (Task 4); `HttpError`.
- Produces: `receiptStatus(receipt) → { createdAt, platforms: { platform, status }[] } | null`; `listResults(root) → { slug, file, size, mtime, publish }[]` (newest first); `renderPath(root, slug, file)` (404 unless listed); `publishPreview(root, slug, file, env) → Promise<{ slug, file, title, description, targets: string[] }>`; `class Publisher({ root, env?, spawnImpl? })` with `start(slug, file)` (409 while running), `has(slug) → boolean`, `follow(slug, listener(event: 'log'|'done', data)) → unfollow()`.

- [ ] **Step 1: Write the failing tests**

Add imports:

```js
import { EventEmitter } from 'node:events';
import { Publisher, listResults, publishPreview, receiptStatus, renderPath } from './studio/results.mjs';
```

Append:

```js
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
```

- [ ] **Step 2: Run to see failure**

Run: `npm run test:studio`
Expected: FAIL — cannot find `./studio/results.mjs`.

- [ ] **Step 3: Implement `scripts/studio/results.mjs`**

```js
// Studio results: renders, publish receipts, and the approval-gated Repliz publish (ADR-0003, ADR-0020).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildTargetAccounts, readPostMetadata } from '../repliz-publish.mjs';
import { HttpError } from './http.mjs';
import { projectSlugs, rendersOf } from './raw.mjs';

export function receiptStatus(receipt) {
  if (!receipt || !Array.isArray(receipt.schedules)) return null;
  return { createdAt: receipt.createdAt || null, platforms: receipt.schedules.map((s) => ({ platform: s.platform, status: s.status || 'unknown' })) };
}

function readReceipt(root, slug) {
  const p = join(root, 'videos', slug, 'repliz-publish.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function listResults(root) {
  const out = [];
  for (const slug of projectSlugs(root)) {
    const publish = receiptStatus(readReceipt(root, slug));
    for (const file of rendersOf(root, slug)) {
      const st = statSync(join(root, 'videos', slug, 'renders', file));
      out.push({ slug, file, size: st.size, mtime: st.mtimeMs, publish });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

export function renderPath(root, slug, file) {
  if (!rendersOf(root, slug).includes(file)) throw new HttpError(404, 'render not found');
  return join(root, 'videos', slug, 'renders', file);
}

export async function publishPreview(root, slug, file, env) {
  renderPath(root, slug, file);
  const post = await readPostMetadata(join(root, 'videos', slug));
  return { slug, file, title: post.title, description: post.description, targets: buildTargetAccounts(env).map((t) => t.platform) };
}

export class Publisher {
  constructor({ root, env = process.env, spawnImpl = spawn }) {
    this.root = root;
    this.env = env;
    this.spawn = spawnImpl;
    this.jobs = new Map();
  }

  has(slug) {
    return this.jobs.has(slug);
  }

  start(slug, file) {
    renderPath(this.root, slug, file);
    const current = this.jobs.get(slug);
    if (current && current.code === null) throw new HttpError(409, `publish for ${slug} is already running`);
    const job = { file, log: [], code: null, listeners: new Set() };
    this.jobs.set(slug, job);
    const emit = (event, data) => {
      if (event === 'log') job.log.push(data);
      for (const f of job.listeners) f(event, data);
    };
    const child = this.spawn(process.execPath, ['scripts/repliz-publish.mjs', '--slug', `videos/${slug}`, '--file', `videos/${slug}/renders/${file}`, '--approved'], { cwd: this.root, env: this.env });
    child.stdout.on('data', (d) => emit('log', String(d)));
    child.stderr.on('data', (d) => emit('log', String(d)));
    child.on('error', (e) => emit('log', `${e.message}\n`));
    child.on('close', (code) => {
      job.code = code ?? 1;
      emit('done', { code: job.code });
      job.listeners.clear();
    });
    return job;
  }

  follow(slug, listener) {
    const job = this.jobs.get(slug);
    if (!job) throw new HttpError(404, 'no publish job');
    for (const line of job.log) listener('log', line);
    if (job.code !== null) {
      listener('done', { code: job.code });
      return () => {};
    }
    job.listeners.add(listener);
    return () => job.listeners.delete(listener);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:studio`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/studio/results.mjs scripts/studio.test.mjs
git commit -m "feat(studio): results list and approval-gated publish job

No docs update needed — covered by ADR-0020/RD-05.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Terminal attach (PTY per viewer)

**Files:**
- Create: `scripts/studio/terminal.mjs`
- Modify: `scripts/studio.test.mjs`

**Interfaces:**
- Consumes: `sessionName`, `tmuxEnv` (Task 3); `HttpError`.
- Produces: `VIEWER_RE = /^[A-Za-z0-9-]{8,64}$/`; `attachCommand(slug, cols, rows) → ['sh', ['-c', string]]`; `class Terminals({ spawnImpl?, killImpl? })` with `open(viewer, slug, cols, rows, { onData(buf), onExit() }) → handle`, `write(viewer, data)` (404 when not open), `close(handle)`, `closeAll()`.

- [ ] **Step 1: Write the failing tests**

Add import:

```js
import { Terminals, VIEWER_RE, attachCommand } from './studio/terminal.mjs';
```

Append:

```js
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
```

- [ ] **Step 2: Run to see failure**

Run: `npm run test:studio`
Expected: FAIL — cannot find `./studio/terminal.mjs`.

- [ ] **Step 3: Implement `scripts/studio/terminal.mjs`**

```js
// Studio terminal: one PTY per viewer, from script(1) running `tmux attach` (ADR-0020).
// Node child pipes are sockets on macOS and script(1) rejects them, so `cat |` hands it a real pipe.
// Never end the attach's stdin: script(1) would forward ^D into the agent. Kill the process group instead.
import { spawn } from 'node:child_process';
import { HttpError } from './http.mjs';
import { sessionName, tmuxEnv } from './sessions.mjs';

export const VIEWER_RE = /^[A-Za-z0-9-]{8,64}$/;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(n)) || lo));

export function attachCommand(slug, cols, rows) {
  const c = clamp(cols, 20, 400);
  const r = clamp(rows, 5, 200);
  return ['sh', ['-c', `cat | script -q /dev/null sh -c 'stty rows ${r} cols ${c}; exec tmux -u attach -t =${sessionName(slug)}' 2>&1 | cat`]];
}

export class Terminals {
  constructor({ spawnImpl = spawn, killImpl = (pid, sig) => process.kill(-pid, sig) } = {}) {
    this.spawn = spawnImpl;
    this.kill = killImpl;
    this.viewers = new Map();
  }

  open(viewer, slug, cols, rows, { onData, onExit }) {
    if (!VIEWER_RE.test(String(viewer))) throw new HttpError(400, 'invalid viewer id');
    const [cmd, args] = attachCommand(slug, cols, rows);
    const previous = this.viewers.get(viewer);
    if (previous) this.close(previous);
    const child = this.spawn(cmd, args, { detached: true, env: { ...tmuxEnv(), TERM: 'xterm-256color' } });
    const handle = { viewer, child, closed: false };
    this.viewers.set(viewer, handle);
    child.stdout.on('data', onData);
    child.on('exit', () => {
      if (this.viewers.get(viewer) === handle) this.viewers.delete(viewer);
      if (!handle.closed) onExit();
    });
    return handle;
  }

  write(viewer, data) {
    const handle = this.viewers.get(viewer);
    if (!handle) throw new HttpError(404, 'terminal not open');
    handle.child.stdin.write(data);
  }

  close(handle) {
    if (handle.closed) return;
    handle.closed = true;
    if (this.viewers.get(handle.viewer) === handle) this.viewers.delete(handle.viewer);
    try {
      this.kill(handle.child.pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }

  closeAll() {
    for (const handle of [...this.viewers.values()]) this.close(handle);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:studio`
Expected: all tests pass.

- [ ] **Step 5: Real PTY check (one-off, not committed)**

```bash
tmux new-session -d -s studio-ptycheck -x 80 -y 20 "cat -v"
node -e '
import("./scripts/studio/terminal.mjs").then((m) => {
  const t = new m.Terminals(); let n = 0;
  const h = t.open("viewer-check1", "ptycheck", 80, 20, { onData: (b) => { n += b.length; }, onExit: () => console.log("exit") });
  setTimeout(() => t.write("viewer-check1", "hello"), 800);
  setTimeout(() => { t.close(h); console.log("bytes", n > 0); }, 1500);
  setTimeout(() => process.exit(0), 2000);
});'
tmux list-clients -t studio-ptycheck; tmux capture-pane -p -t studio-ptycheck | head -2; tmux kill-session -t studio-ptycheck
```

Expected: `bytes true`, no clients listed, pane shows `hello` with no `^D`.

- [ ] **Step 6: Commit**

```bash
git add scripts/studio/terminal.mjs scripts/studio.test.mjs
git commit -m "feat(studio): per-viewer PTY attach via script(1)

No docs update needed — covered by ADR-0020/RD-05.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Routes (`createApp`) and server entry

**Files:**
- Create: `scripts/studio/app.mjs`
- Create: `scripts/studio.mjs`
- Modify: `scripts/studio.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1–6; `checkSlug`, `probeDuration` from `scripts/video.mjs`.
- Produces: `createApp({ root, env, hosts, token, tools, codex, run?, terminals, publisher, probe? }) → (req, res) => Promise<void>`. Routes (all JSON unless noted):
  - `GET /api/state` → `{ tools, codex, claudeModels, efforts }`
  - `GET /api/raw`; `POST /api/raw?name=<file>` (raw body) → `{ name }`
  - `GET /api/raw/:name/edit-plan` → `{ mode: 'open'|'continue'|'new', slug }`
  - `GET /api/raw/:name/delete-plan` → `{ raw, projects, sessions }`; `DELETE /api/raw/:name`
  - `GET /api/sessions`; `POST /api/sessions` body `{ raw, slug, runtime, model, effort, notes }` → `{ slug, name }`
  - `POST /api/sessions/:slug/interrupt`; `DELETE /api/sessions/:slug`
  - `GET /api/sessions/:slug/stream?viewer&cols&rows` (SSE: `data` = base64 string, `exit`)
  - `POST /api/sessions/:slug/input` body `{ viewer, data }`
  - `GET /api/results`; `GET /media/:slug/:file` (ranged video)
  - `GET /api/results/:slug/publish-preview?file=`; `POST /api/results/:slug/publish` body `{ file }`
  - `GET /api/results/:slug/publish/stream` (SSE: `log` = string, `done` = `{ code }`)
  - `POST /login` body `{ token }` (sets cookie); `GET /`, `/login`, `/app.js`, `/app.css`, `/vendor/xterm/{xterm.js,xterm.css,addon-fit.js}`

- [ ] **Step 1: Write the failing tests**

Add imports:

```js
import { createServer } from 'node:http';
import { createApp } from './studio/app.mjs';
```

Append:

```js
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
```

- [ ] **Step 2: Run to see failure**

Run: `npm run test:studio`
Expected: FAIL — cannot find `./studio/app.mjs`.

- [ ] **Step 3: Implement `scripts/studio/app.mjs`**

```js
// Studio routes (ADR-0020, RD-05). Filesystem + tmux are the only state.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkSlug } from '../video.mjs';
import { CLAUDE_MODELS, EFFORTS, buildPrompt, suggestSlug } from './agent.mjs';
import { HttpError, guardRequest, hasToken, openSse, readJson, sendFile, sendJson, tokenCookie, tokenMatches } from './http.mjs';
import { deletePlan, deleteRawCascade, linkedProjects, listRaw, projectRaw, rawPath, receiveUpload } from './raw.mjs';
import { listResults, publishPreview, renderPath } from './results.mjs';
import { interruptSession, killSession, listSessions, startSession } from './sessions.mjs';
import { VIEWER_RE } from './terminal.mjs';

const PUBLIC = join(import.meta.dirname, 'public');
const XTERM = join(import.meta.dirname, '..', '..', 'vendor', 'xterm');
const STATIC = { '/': 'index.html', '/login': 'login.html', '/app.js': 'app.js', '/app.css': 'app.css' };
const VENDOR = new Set(['xterm.js', 'xterm.css', 'addon-fit.js']);
const RAW = Symbol('handled');
const OPEN = new Set(['/login', '/app.css']); // reachable before login

function slugParam(slug) {
  try {
    return checkSlug(slug);
  } catch (e) {
    throw new HttpError(400, e.message);
  }
}

function decode(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    throw new HttpError(400, 'bad path');
  }
}

export function createApp({ root, env = {}, hosts, token = '', tools = {}, codex = {}, run, terminals, publisher, probe = async () => null }) {
  const opt = run ? { run } : {};
  const sessionsForRaw = async (name) => (await listSessions(opt)).filter((s) => s.raw === name);

  const routes = [
    ['GET', /^\/api\/state$/, async () => ({ tools, codex, claudeModels: CLAUDE_MODELS, efforts: EFFORTS })],
    ['GET', /^\/api\/raw$/, async () => listRaw(root, { probe })],
    ['POST', /^\/api\/raw$/, async (req, url) => ({ name: await receiveUpload(root, url.searchParams.get('name'), req) })],
    ['GET', /^\/api\/raw\/([^/]+)\/edit-plan$/, async (req, url, [name]) => {
      rawPath(root, name);
      const live = (await sessionsForRaw(name)).find((s) => s.status !== 'exited');
      if (live) return { mode: 'open', slug: live.slug };
      const [slug] = linkedProjects(root, name);
      return slug ? { mode: 'continue', slug } : { mode: 'new', slug: suggestSlug(name) };
    }],
    ['GET', /^\/api\/raw\/([^/]+)\/delete-plan$/, async (req, url, [name]) => ({ ...deletePlan(root, name), sessions: (await sessionsForRaw(name)).map((s) => s.slug) })],
    ['DELETE', /^\/api\/raw\/([^/]+)$/, async (req, url, [name]) => {
      rawPath(root, name);
      const slugs = new Set([...linkedProjects(root, name), ...(await sessionsForRaw(name)).map((s) => s.slug)]);
      for (const slug of slugs) await killSession(slug, opt);
      return deleteRawCascade(root, name);
    }],
    ['GET', /^\/api\/sessions$/, async () => listSessions(opt)],
    ['POST', /^\/api\/sessions$/, async (req) => {
      const b = await readJson(req);
      rawPath(root, b.raw);
      const slug = slugParam(b.slug);
      const owner = projectRaw(root, slug);
      if (owner && owner !== b.raw) throw new HttpError(409, `videos/${slug} belongs to raw/${owner}`);
      const mode = existsSync(join(root, 'videos', slug)) ? 'continue' : 'new';
      const prior = (await listSessions(opt)).find((s) => s.slug === slug);
      if (prior?.status === 'exited') await killSession(slug, opt);
      const prompt = buildPrompt({ mode, rawFile: b.raw, slug, notes: b.notes });
      return startSession({ root, slug, runtime: b.runtime, model: b.model, effort: b.effort, rawFile: b.raw, prompt, ...opt });
    }],
    ['POST', /^\/api\/sessions\/([^/]+)\/interrupt$/, async (req, url, [slug]) => {
      await interruptSession(slugParam(slug), opt);
      return { ok: true };
    }],
    ['DELETE', /^\/api\/sessions\/([^/]+)$/, async (req, url, [slug]) => {
      await killSession(slugParam(slug), opt);
      return { ok: true };
    }],
    ['GET', /^\/api\/sessions\/([^/]+)\/stream$/, async (req, url, [slug], res) => {
      slugParam(slug);
      const viewer = url.searchParams.get('viewer') || '';
      if (!VIEWER_RE.test(viewer)) throw new HttpError(400, 'invalid viewer id');
      const sse = openSse(res);
      const handle = terminals.open(viewer, slug, url.searchParams.get('cols'), url.searchParams.get('rows'), {
        onData: (buf) => sse.send('data', buf.toString('base64')),
        onExit: () => {
          sse.send('exit', {});
          sse.end();
        },
      });
      sse.onClose(() => terminals.close(handle));
      return RAW;
    }],
    ['POST', /^\/api\/sessions\/([^/]+)\/input$/, async (req, url, [slug]) => {
      slugParam(slug);
      const b = await readJson(req);
      if (typeof b.data !== 'string') throw new HttpError(400, 'data must be a string');
      terminals.write(b.viewer, b.data);
      return { ok: true };
    }],
    ['GET', /^\/api\/results$/, async () => listResults(root)],
    ['GET', /^\/media\/([^/]+)\/([^/]+)$/, async (req, url, [slug, file], res) => {
      sendFile(req, res, renderPath(root, slugParam(slug), file));
      return RAW;
    }],
    ['GET', /^\/api\/results\/([^/]+)\/publish-preview$/, async (req, url, [slug]) => publishPreview(root, slugParam(slug), url.searchParams.get('file'), env)],
    ['POST', /^\/api\/results\/([^/]+)\/publish$/, async (req, url, [slug]) => {
      const b = await readJson(req);
      publisher.start(slugParam(slug), b.file);
      return { ok: true };
    }],
    ['GET', /^\/api\/results\/([^/]+)\/publish\/stream$/, async (req, url, [slug], res) => {
      if (!publisher.has(slugParam(slug))) throw new HttpError(404, 'no publish job');
      const sse = openSse(res);
      const unfollow = publisher.follow(slug, (event, data) => {
        sse.send(event, data);
        if (event === 'done') sse.end();
      });
      sse.onClose(unfollow);
      return RAW;
    }],
    ['POST', /^\/login$/, async (req, url, m, res) => {
      const b = await readJson(req);
      if (!tokenMatches(b.token, token)) throw new HttpError(401, 'wrong token');
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `studio=${tokenCookie(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000` });
      res.end('{"ok":true}');
      return RAW;
    }],
  ];

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://studio.invalid');
    try {
      guardRequest(req, hosts);
      if (!OPEN.has(url.pathname) && !hasToken(req.headers, token)) {
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) throw new HttpError(401, 'login required');
        res.writeHead(302, { location: '/login' });
        res.end();
        return;
      }
      if (req.method === 'GET' && STATIC[url.pathname]) return sendFile(req, res, join(PUBLIC, STATIC[url.pathname]));
      const vendor = /^\/vendor\/xterm\/([^/]+)$/.exec(url.pathname);
      if (req.method === 'GET' && vendor && VENDOR.has(vendor[1])) return sendFile(req, res, join(XTERM, vendor[1]));
      for (const [method, re, fn] of routes) {
        const m = re.exec(url.pathname);
        if (!m || req.method !== method) continue;
        const out = await fn(req, url, m.slice(1).map(decode), res);
        if (out !== RAW) sendJson(res, 200, out);
        return;
      }
      throw new HttpError(404, 'not found');
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      if (!res.headersSent) sendJson(res, status, { error: e.message });
      else res.end();
    }
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:studio`
Expected: all tests pass.

- [ ] **Step 5: Implement `scripts/studio.mjs`**

```js
#!/usr/bin/env node
// Studio: local web UI for raw videos, tmux agent sessions, and Repliz publish (ADR-0020, RD-05).
// Spec: docs/superpowers/specs/2026-09-28-studio-web-ui-design.md
// Usage: npm run studio [-- --port 4777]
// Node 22+, built-in modules only (ADR-0007).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { codexDefaults } from './studio/agent.mjs';
import { createApp } from './studio/app.mjs';
import { allowedHosts } from './studio/http.mjs';
import { Publisher } from './studio/results.mjs';
import { Terminals } from './studio/terminal.mjs';
import { probeDuration } from './video.mjs';

const TAILSCALE = ['tailscale', '/Applications/Tailscale.app/Contents/MacOS/Tailscale'];

function tryRun(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

export function detectTailscale() {
  for (const bin of TAILSCALE) {
    const ip = tryRun(bin, ['ip', '-4']).split('\n')[0];
    if (!/^100\.\d+\.\d+\.\d+$/.test(ip)) continue;
    let names = [];
    try {
      const dns = String(JSON.parse(tryRun(bin, ['status', '--json'])).Self?.DNSName || '').replace(/\.$/, '');
      if (dns) names = [dns, dns.split('.')[0]];
    } catch {
      // MagicDNS names are optional; the IP still works
    }
    return { ip, names };
  }
  return null;
}

const durations = new Map();
async function probe(file, mtime) {
  const key = `${file}:${mtime}`;
  if (!durations.has(key)) {
    try {
      durations.set(key, probeDuration(file));
    } catch {
      durations.set(key, null);
    }
  }
  return durations.get(key);
}

function main(argv) {
  const { values } = parseArgs({ args: argv, options: { port: { type: 'string' } } });
  const root = process.cwd();
  if (!existsSync(join(root, 'scripts', 'studio.mjs'))) throw new Error('run npm run studio from the repo root');
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = process.env;
  const port = Number(values.port || env.STUDIO_PORT || 4777);
  const ts = detectTailscale();
  const addresses = ['127.0.0.1', ...(ts ? [ts.ip] : [])];
  const tools = Object.fromEntries(['tmux', 'claude', 'codex', 'ffprobe'].map((t) => [t, tryRun('sh', ['-c', `command -v ${t}`]) !== '']));
  const codexConfig = join(homedir(), '.codex', 'config.toml');
  const codex = codexDefaults(existsSync(codexConfig) ? readFileSync(codexConfig, 'utf8') : '');
  const terminals = new Terminals();
  const handler = createApp({
    root,
    env,
    hosts: allowedHosts({ addresses, port, names: ts?.names || [] }),
    token: env.STUDIO_TOKEN || '',
    tools,
    codex,
    terminals,
    publisher: new Publisher({ root, env }),
    probe,
  });
  for (const address of addresses) createServer(handler).listen(port, address, () => console.log(`Studio: http://${address}:${port}`));
  if (!ts) console.log('Tailscale not detected; listening on localhost only');
  for (const [t, ok] of Object.entries(tools)) if (!ok) console.log(`warning: ${t} not found on PATH`);
  const stop = () => {
    terminals.closeAll(); // agents keep running in tmux (RD-05-09)
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
```

- [ ] **Step 6: Smoke the entry**

Run `npm run studio -- --port 4799` with `run_in_background: true`, then:

```bash
curl -s -H 'Host: 127.0.0.1:4799' http://127.0.0.1:4799/api/state
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: evil.example' http://127.0.0.1:4799/api/state
```

Expected: JSON with `tools`, `codex`, `claudeModels`, `efforts`; then `403`. Stop the background server.

- [ ] **Step 7: Commit**

```bash
git add scripts/studio/app.mjs scripts/studio.mjs scripts/studio.test.mjs
git commit -m "feat(studio): routes and server entry

No docs update needed — covered by ADR-0020/RD-05.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Vendored xterm.js and the UI

**Files:**
- Create: `vendor/xterm/xterm.js`, `vendor/xterm/xterm.css`, `vendor/xterm/addon-fit.js`, `vendor/xterm/LICENSE`
- Create: `scripts/studio/public/index.html`, `scripts/studio/public/login.html`, `scripts/studio/public/app.css`, `scripts/studio/public/app.js`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: the routes in Task 7. Globals from the vendored UMD builds: `window.Terminal`, `window.FitAddon.FitAddon`.

- [ ] **Step 1: Vendor xterm.js**

```bash
S="$(mktemp -d)"
(cd "$S" && npm pack @xterm/xterm@6.0.0 @xterm/addon-fit@0.11.0 --silent >/dev/null && mkdir a b && tar xzf xterm-xterm-6.0.0.tgz -C a && tar xzf xterm-addon-fit-0.11.0.tgz -C b)
mkdir -p vendor/xterm
cp "$S/a/package/lib/xterm.js" "$S/a/package/css/xterm.css" vendor/xterm/
cp "$S/b/package/lib/addon-fit.js" vendor/xterm/
cp "$S/a/package/LICENSE" vendor/xterm/LICENSE
diff -q "$S/a/package/LICENSE" "$S/b/package/LICENSE" && echo same-license
ls -la vendor/xterm
```

Expected: four files; `same-license` (both MIT, same copyright holders). If the licenses differ, also copy `$S/b/package/LICENSE` to `vendor/xterm/LICENSE-addon-fit`.

Append to `THIRD_PARTY_NOTICES.md` (read it first and match its section style):

```markdown
## xterm.js

`vendor/xterm/xterm.js`, `vendor/xterm/xterm.css`, and `vendor/xterm/addon-fit.js`
are unmodified builds of `@xterm/xterm@6.0.0` and `@xterm/addon-fit@0.11.0`,
MIT License, copyright the xterm.js authors. Full text: `vendor/xterm/LICENSE`.
Used by the Studio web terminal (ADR-0020).
```

- [ ] **Step 2: Write `scripts/studio/public/index.html`**

```html
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Studio</title>
<link rel="stylesheet" href="/vendor/xterm/xterm.css">
<link rel="stylesheet" href="/app.css">
</head>
<body>
<header>
  <h1>Studio</h1>
  <nav>
    <button data-tab="raw" class="active">Raw</button>
    <button data-tab="sessions">Sessions</button>
    <button data-tab="results">Results</button>
  </nav>
</header>
<p id="banner" hidden></p>
<main>
  <section id="tab-raw">
    <div class="bar">
      <label class="btn primary">Upload<input id="upload" type="file" accept="video/mp4,video/quicktime,.mp4,.mov,.m4v" hidden></label>
      <progress id="upload-progress" max="1" value="0" hidden></progress>
    </div>
    <ul id="raw-list" class="list"></ul>
  </section>
  <section id="tab-sessions" hidden><ul id="session-list" class="list"></ul></section>
  <section id="tab-results" hidden><ul id="result-list" class="list"></ul></section>
</main>

<dialog id="edit-dialog">
  <form method="dialog" id="edit-form">
    <h2>Edit <span id="edit-raw"></span></h2>
    <p id="edit-mode" class="muted"></p>
    <label>Slug <input name="slug" required pattern="[a-z0-9][a-z0-9\-]*" autocapitalize="off" autocomplete="off"></label>
    <label>Runtime <select name="runtime"><option value="claude">Claude</option><option value="codex">Codex</option></select></label>
    <label>Model <input name="model" list="model-options" required autocapitalize="off" autocomplete="off"></label>
    <datalist id="model-options"></datalist>
    <label>Effort <select name="effort"></select></label>
    <label>Catatan <textarea name="notes" rows="4" placeholder="Arahan opsional untuk agen"></textarea></label>
    <p class="error" id="edit-error"></p>
    <menu><button value="cancel" formnovalidate>Batal</button><button value="start" class="primary">Mulai sesi</button></menu>
  </form>
</dialog>

<dialog id="delete-dialog">
  <form method="dialog" id="delete-form">
    <h2>Hapus permanen?</h2>
    <ul id="delete-items"></ul>
    <label id="delete-confirm-wrap" hidden>Ketik nama file untuk konfirmasi <input id="delete-confirm" autocomplete="off" autocapitalize="off"></label>
    <p class="error" id="delete-error"></p>
    <menu><button value="cancel" formnovalidate>Batal</button><button value="delete" class="danger">Hapus</button></menu>
  </form>
</dialog>

<dialog id="publish-dialog">
  <form method="dialog" id="publish-form">
    <h2>Publish ke Repliz</h2>
    <p><strong id="publish-file"></strong></p>
    <p id="publish-targets" class="muted"></p>
    <pre id="publish-caption"></pre>
    <pre id="publish-log" hidden></pre>
    <p class="error" id="publish-error"></p>
    <menu><button value="cancel" formnovalidate>Tutup</button><button value="publish" class="primary" id="publish-go">Konfirmasi publish</button></menu>
  </form>
</dialog>

<div id="term-panel" hidden>
  <div class="term-head"><strong id="term-title"></strong><button id="term-close">Tutup</button></div>
  <div id="term"></div>
  <div class="keys">
    <button data-key="esc">Esc</button><button data-key="tab">Tab</button><button data-key="up">↑</button>
    <button data-key="down">↓</button><button data-key="ctrlc">Ctrl-C</button><button data-key="enter">Enter</button>
  </div>
</div>

<script src="/vendor/xterm/xterm.js"></script>
<script src="/vendor/xterm/addon-fit.js"></script>
<script src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write `scripts/studio/public/login.html`**

```html
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Studio Login</title>
<link rel="stylesheet" href="/app.css">
</head>
<body>
<main class="login">
  <h1>Studio</h1>
  <form id="login">
    <label>Token <input name="token" type="password" required autocomplete="current-password"></label>
    <p class="error" id="login-error"></p>
    <button class="primary">Masuk</button>
  </form>
</main>
<script>
document.getElementById('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: e.target.token.value }) });
  if (res.ok) location.href = '/';
  else document.getElementById('login-error').textContent = 'Token salah';
});
</script>
</body>
</html>
```

(`/login` and `/app.css` are the only paths reachable without the token cookie.)

- [ ] **Step 4: Write `scripts/studio/public/app.css`**

```css
:root {
  --bg: #f6f5f2; --fg: #1d1d1b; --muted: #6b6a66; --card: #ffffff; --line: #e2e0da;
  --primary: #1f5eff; --primary-fg: #ffffff; --danger: #c62828; --ok: #2e7d32; --warn: #b26a00;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #151514; --fg: #ecebe7; --muted: #9b9a95; --card: #1f1f1d; --line: #33322f; --primary: #5b8cff; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
header { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg); border-bottom: 1px solid var(--line); }
h1 { margin: 0; font-size: 18px; }
nav { display: flex; gap: 4px; }
main { padding: 12px 16px 80px; max-width: 900px; margin: 0 auto; }
button, .btn { font: inherit; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--fg); cursor: pointer; min-height: 40px; display: inline-flex; align-items: center; }
button.active { border-color: var(--primary); color: var(--primary); }
.primary { background: var(--primary); border-color: var(--primary); color: var(--primary-fg); }
.danger { color: var(--danger); border-color: var(--danger); }
button:disabled { opacity: .5; cursor: default; }
.bar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
progress { flex: 1; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.list > li { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 10px; }
.meta { display: grid; gap: 2px; overflow-wrap: anywhere; }
.muted { color: var(--muted); font-size: 13px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.status { font-size: 12px; font-weight: 600; text-transform: uppercase; }
.status.running { color: var(--ok); } .status.idle { color: var(--warn); } .status.exited { color: var(--muted); }
video { width: 100%; max-height: 60vh; background: #000; border-radius: 8px; }
#banner { margin: 0; padding: 10px 16px; background: #fff3cd; color: #5c4400; }
dialog { width: min(560px, calc(100vw - 32px)); border: 1px solid var(--line); border-radius: 12px; background: var(--card); color: var(--fg); padding: 16px; }
dialog form { display: grid; gap: 10px; }
dialog h2 { margin: 0; font-size: 17px; overflow-wrap: anywhere; }
label { display: grid; gap: 4px; font-size: 13px; color: var(--muted); }
input, select, textarea { font: inherit; font-size: 16px; padding: 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); width: 100%; }
menu { display: flex; justify-content: flex-end; gap: 8px; margin: 0; padding: 0; }
pre { margin: 0; white-space: pre-wrap; max-height: 30vh; overflow: auto; background: var(--bg); padding: 8px; border-radius: 8px; font-size: 13px; }
.error { color: var(--danger); margin: 0; min-height: 1em; }
#term-panel { position: fixed; inset: 0; z-index: 10; display: flex; flex-direction: column; background: #111; }
#term-panel[hidden] { display: none; }
.term-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; color: #eee; }
.term-head button { background: #222; color: #eee; border-color: #444; }
#term { flex: 1; min-height: 0; padding: 4px; }
.keys { display: flex; gap: 6px; padding: 8px; overflow-x: auto; padding-bottom: max(8px, env(safe-area-inset-bottom)); }
.keys button { background: #222; color: #eee; border-color: #444; flex: 0 0 auto; }
.login { max-width: 360px; margin: 15vh auto; padding: 0 16px; display: grid; gap: 12px; }
.login form { display: grid; gap: 10px; }
```

- [ ] **Step 5: Write `scripts/studio/public/app.js`**

```js
// Studio UI (ADR-0020). Plain JS, no build step.
const $ = (s) => document.querySelector(s);
const enc = encodeURIComponent;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '–');
const when = (t) => (t ? new Date(t).toLocaleString('id-ID') : '');
// crypto.randomUUID needs a secure context; the Tailscale URL is plain http.
const viewer = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (res.status === 401) {
    location.href = '/login';
    throw new Error('login required');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });

let state = { tools: {}, codex: {}, claudeModels: [], efforts: {} };
let tab = 'raw';

function banner(msg) {
  $('#banner').textContent = msg || '';
  $('#banner').hidden = !msg;
}

function showTab(name) {
  tab = name;
  for (const b of document.querySelectorAll('nav button')) b.classList.toggle('active', b.dataset.tab === name);
  for (const t of ['raw', 'sessions', 'results']) $(`#tab-${t}`).hidden = t !== name;
  refresh();
}
document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

async function refresh() {
  try {
    if (tab === 'raw') renderRaw(await api('/api/raw'));
    if (tab === 'sessions') renderSessions(await api('/api/sessions'));
    if (tab === 'results') renderResults(await api('/api/results'));
  } catch (e) {
    banner(e.message);
  }
}

// ---- Raw ----
function renderRaw(items) {
  $('#raw-list').innerHTML = items.length ? items.map((r) => `
    <li>
      <div class="meta"><strong>${esc(r.name)}</strong><span class="muted">${mb(r.size)} · ${dur(r.duration)} · ${r.projects.length} proyek</span></div>
      <div class="actions"><button class="primary" data-edit="${esc(r.name)}">Edit this video</button><button class="danger" data-delete="${esc(r.name)}">Delete</button></div>
    </li>`).join('') : '<li class="muted">Belum ada raw video.</li>';
}
$('#raw-list').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b?.dataset.edit) openEdit(b.dataset.edit);
  if (b?.dataset.delete) openDelete(b.dataset.delete);
});

$('#upload').addEventListener('change', () => {
  const file = $('#upload').files[0];
  if (!file) return;
  const bar = $('#upload-progress');
  bar.hidden = false;
  bar.value = 0;
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `/api/raw?name=${enc(file.name)}`);
  xhr.upload.onprogress = (e) => { if (e.lengthComputable) bar.value = e.loaded / e.total; };
  xhr.onload = () => {
    bar.hidden = true;
    $('#upload').value = '';
    if (xhr.status >= 400) banner((JSON.parse(xhr.responseText || '{}').error) || `Upload gagal (${xhr.status})`);
    refresh();
  };
  xhr.onerror = () => {
    bar.hidden = true;
    banner('Upload terputus');
  };
  xhr.send(file);
});

// ---- Edit ----
let editRaw = '';
function fillModelOptions() {
  const f = $('#edit-form');
  const rt = f.runtime.value;
  const models = rt === 'claude' ? state.claudeModels : [state.codex.model].filter(Boolean);
  $('#model-options').innerHTML = models.map((m) => `<option value="${esc(m)}">`).join('');
  f.model.value = rt === 'claude' ? 'opus' : state.codex.model || '';
  const efforts = state.efforts[rt] || [];
  f.effort.innerHTML = efforts.map((x) => `<option>${x}</option>`).join('');
  f.effort.value = rt === 'codex' && efforts.includes(state.codex.effort) ? state.codex.effort : 'high';
}
$('#edit-form').runtime.addEventListener('change', fillModelOptions);

async function openEdit(name) {
  let plan;
  try {
    plan = await api(`/api/raw/${enc(name)}/edit-plan`);
  } catch (e) {
    return banner(e.message);
  }
  if (plan.mode === 'open') return openTerminal(plan.slug);
  editRaw = name;
  const f = $('#edit-form');
  f.reset();
  $('#edit-raw').textContent = name;
  $('#edit-mode').textContent = plan.mode === 'continue' ? `Lanjutkan proyek videos/${plan.slug}/` : 'Proyek baru';
  f.slug.value = plan.slug;
  f.slug.readOnly = plan.mode === 'continue';
  for (const o of f.runtime.options) o.disabled = state.tools[o.value] === false;
  f.runtime.value = state.tools.claude === false ? 'codex' : 'claude';
  fillModelOptions();
  $('#edit-error').textContent = '';
  $('#edit-dialog').showModal();
}
$('#edit-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'start') return;
  e.preventDefault();
  const f = e.target;
  try {
    const s = await post('/api/sessions', { raw: editRaw, slug: f.slug.value, runtime: f.runtime.value, model: f.model.value, effort: f.effort.value, notes: f.notes.value });
    $('#edit-dialog').close();
    openTerminal(s.slug);
  } catch (err) {
    $('#edit-error').textContent = err.message;
  }
});

// ---- Delete ----
let deleteTarget = '';
async function openDelete(name) {
  let plan;
  try {
    plan = await api(`/api/raw/${enc(name)}/delete-plan`);
  } catch (e) {
    return banner(e.message);
  }
  deleteTarget = name;
  $('#delete-items').innerHTML = [
    `<li>raw/${esc(name)}</li>`,
    ...plan.projects.map((p) => `<li>videos/${esc(p.slug)}/${p.renders.length ? ` (${p.renders.length} render)` : ''}</li>`),
    ...plan.sessions.map((s) => `<li>sesi tmux studio-${esc(s)}</li>`),
  ].join('');
  const mustType = plan.projects.some((p) => p.renders.length);
  $('#delete-confirm-wrap').hidden = !mustType;
  $('#delete-confirm').value = '';
  $('#delete-confirm').dataset.required = mustType ? name : '';
  $('#delete-error').textContent = '';
  $('#delete-dialog').showModal();
}
$('#delete-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'delete') return;
  e.preventDefault();
  const need = $('#delete-confirm').dataset.required;
  if (need && $('#delete-confirm').value !== need) {
    $('#delete-error').textContent = 'Nama file tidak cocok';
    return;
  }
  try {
    await api(`/api/raw/${enc(deleteTarget)}`, { method: 'DELETE' });
    $('#delete-dialog').close();
    refresh();
  } catch (err) {
    $('#delete-error').textContent = err.message;
  }
});

// ---- Sessions ----
function renderSessions(items) {
  $('#session-list').innerHTML = items.length ? items.map((s) => `
    <li>
      <div class="meta"><strong>${esc(s.slug)}</strong><span class="status ${esc(s.status)}">${esc(s.status)}</span>
        <span class="muted">${esc(s.runtime)} · ${esc(s.model)} · ${esc(s.effort)} · ${esc(s.raw)}</span></div>
      <div class="actions"><button class="primary" data-open="${esc(s.slug)}">Show terminal</button><button data-esc="${esc(s.slug)}">Esc</button><button class="danger" data-kill="${esc(s.slug)}">Kill</button></div>
    </li>`).join('') : '<li class="muted">Tidak ada sesi.</li>';
}
$('#session-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.open) openTerminal(b.dataset.open);
    if (b.dataset.esc) await post(`/api/sessions/${enc(b.dataset.esc)}/interrupt`);
    if (b.dataset.kill && confirm(`Kill sesi ${b.dataset.kill}?`)) {
      await api(`/api/sessions/${enc(b.dataset.kill)}`, { method: 'DELETE' });
      refresh();
    }
  } catch (err) {
    banner(err.message);
  }
});

// ---- Terminal ----
let term;
let fit;
let source;
let termSlug = '';
let lastSize = '';
let pending = '';
let sending = false;
let resizeTimer;

function ensureTerm() {
  if (term) return;
  term = new Terminal({ fontSize: 13, cursorBlink: true, scrollback: 5000, theme: { background: '#111111' } });
  fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open($('#term'));
  term.onData(sendInput);
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reconnectIfResized, 250);
  }).observe($('#term'));
}

// Keystrokes are queued and sent in order, one POST at a time.
function sendInput(data) {
  pending += data;
  if (sending) return;
  sending = true;
  (async () => {
    while (pending) {
      const chunk = pending;
      pending = '';
      try {
        await post(`/api/sessions/${enc(termSlug)}/input`, { viewer, data: chunk });
      } catch (e) {
        term.write(`\r\n[input gagal: ${e.message}]\r\n`);
      }
    }
    sending = false;
  })();
}

function connect() {
  if (source) source.close();
  fit.fit();
  lastSize = `${term.cols}x${term.rows}`;
  source = new EventSource(`/api/sessions/${enc(termSlug)}/stream?viewer=${viewer}&cols=${term.cols}&rows=${term.rows}`);
  source.addEventListener('data', (e) => term.write(Uint8Array.from(atob(JSON.parse(e.data)), (c) => c.charCodeAt(0))));
  source.addEventListener('exit', () => {
    term.write('\r\n[sesi selesai atau terputus]\r\n');
    source.close();
  });
}

function reconnectIfResized() {
  if (!termSlug || $('#term-panel').hidden) return;
  fit.fit();
  if (`${term.cols}x${term.rows}` !== lastSize) connect();
}

function openTerminal(slug) {
  termSlug = slug;
  $('#term-title').textContent = `studio-${slug}`;
  $('#term-panel').hidden = false;
  ensureTerm();
  term.reset();
  connect();
  term.focus();
}

$('#term-close').addEventListener('click', () => {
  if (source) source.close();
  source = null;
  termSlug = '';
  $('#term-panel').hidden = true;
  refresh();
});

const KEYS = { esc: '\x1b', tab: '\t', up: '\x1b[A', down: '\x1b[B', ctrlc: '\x03', enter: '\r' };
document.querySelector('.keys').addEventListener('click', (e) => {
  const k = e.target.closest('button')?.dataset.key;
  if (!k) return;
  sendInput(KEYS[k]);
  term.focus();
});

// ---- Results ----
function renderResults(items) {
  $('#result-list').innerHTML = items.length ? items.map((r) => `
    <li>
      <div class="meta"><strong>${esc(r.slug)}</strong><span class="muted">${esc(r.file)} · ${mb(r.size)} · ${when(r.mtime)}</span>
        ${r.publish ? `<span class="muted">Publish ${esc(when(r.publish.createdAt))}: ${r.publish.platforms.map((p) => `${esc(p.platform)} ${esc(p.status)}`).join(', ')}</span>` : ''}</div>
      <video controls preload="metadata" playsinline src="/media/${enc(r.slug)}/${enc(r.file)}"></video>
      <div class="actions"><button class="primary" data-publish="${esc(r.slug)}" data-file="${esc(r.file)}">Publish to Repliz</button></div>
    </li>`).join('') : '<li class="muted">Belum ada render.</li>';
}

let publishTarget = null;
$('#result-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-publish]');
  if (!b) return;
  publishTarget = { slug: b.dataset.publish, file: b.dataset.file };
  try {
    const p = await api(`/api/results/${enc(publishTarget.slug)}/publish-preview?file=${enc(publishTarget.file)}`);
    $('#publish-file').textContent = `videos/${p.slug}/renders/${p.file}`;
    $('#publish-targets').textContent = p.targets.length ? `Target: ${p.targets.join(', ')}` : 'Tidak ada target akun di .env';
    $('#publish-caption').textContent = `${p.title || ''}\n\n${p.description || '(deskripsi kosong — isi publish-captions.md dulu)'}`;
    $('#publish-log').hidden = true;
    $('#publish-log').textContent = '';
    $('#publish-error').textContent = '';
    $('#publish-go').disabled = !p.targets.length || !p.description;
    $('#publish-dialog').showModal();
  } catch (err) {
    banner(err.message);
  }
});
$('#publish-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'publish') return;
  e.preventDefault();
  $('#publish-go').disabled = true;
  try {
    await post(`/api/results/${enc(publishTarget.slug)}/publish`, { file: publishTarget.file });
    const log = $('#publish-log');
    log.hidden = false;
    const es = new EventSource(`/api/results/${enc(publishTarget.slug)}/publish/stream`);
    es.addEventListener('log', (ev) => {
      log.textContent += JSON.parse(ev.data);
      log.scrollTop = log.scrollHeight;
    });
    es.addEventListener('done', (ev) => {
      log.textContent += `\n[selesai, exit ${JSON.parse(ev.data).code}]\n`;
      es.close();
      refresh();
    });
  } catch (err) {
    $('#publish-error').textContent = err.message;
    $('#publish-go').disabled = false;
  }
});

// ---- Boot ----
(async () => {
  try {
    state = await api('/api/state');
  } catch (e) {
    return banner(e.message);
  }
  const missing = Object.entries(state.tools).filter(([, ok]) => !ok).map(([t]) => t);
  if (missing.length) banner(`Tidak ditemukan di PATH: ${missing.join(', ')}`);
  refresh();
  // Only the Sessions tab polls; re-rendering Results would reset playing videos.
  setInterval(() => { if (tab === 'sessions' && $('#term-panel').hidden) refresh(); }, 2000);
})();
```

- [ ] **Step 6: Browser smoke on this Mac**

Start `npm run studio` in the background. Open `http://127.0.0.1:4777` (use the run skill or a browser). Check:

1. Raw tab lists `raw/` files; upload a small `.mp4` (e.g. `ffmpeg -f lavfi -i testsrc=d=2 -pix_fmt yuv420p "$TMPDIR/studio-smoke.mp4"`) and it appears.
2. **Edit this video** on the smoke file → slug `studio-smoke`, Claude / `haiku` / `low`, note "cuma tes, jangan lakukan apa pun, jawab OK" → terminal opens and shows the agent receiving the prompt.
3. Type a reply in the terminal and see it arrive; press the **Esc** key button; resize the window and see the terminal redraw.
4. Close the terminal panel; `tmux ls` still lists `studio-studio-smoke`.
5. Sessions tab shows the session; **Kill** removes it.
6. **Delete** the smoke raw → dialog lists it; after confirming, the file is gone from `raw/`.
7. Results tab lists existing renders and plays one (seek works).
8. Do **not** click "Konfirmasi publish" unless Dena asks; opening the dialog and seeing the caption + targets is enough.

- [ ] **Step 7: Commit**

```bash
git add vendor/xterm scripts/studio/public THIRD_PARTY_NOTICES.md
git commit -m "feat(studio): web UI with vendored xterm.js terminal

No docs update needed beyond THIRD_PARTY_NOTICES — covered by ADR-0020/RD-05.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Command docs sync and final verification

**Files:**
- Modify: `internal/docs/architecture/stack.md`
- Modify: `CLAUDE.md`, `AGENTS.md`, `README.md`

- [ ] **Step 1: Update docs**

`internal/docs/architecture/stack.md`: in the "Komponen tooling" table add a row after the `video CLI` row:

```markdown
| Studio | Web UI lokal (localhost + Tailscale): upload/hapus raw, sesi agen Claude/Codex di tmux dengan terminal xterm.js, daftar render, publish Repliz | `npm run studio` | `scripts/studio.mjs`, [ADR-0020](../adr/0020-studio-web-ui.md) |
| xterm.js 6.0.0 | Terminal browser untuk Studio (di-vendor, MIT) | `vendor/xterm/` di-`<script>` oleh `scripts/studio/public/index.html` | `THIRD_PARTY_NOTICES.md` |
```

Also correct its "Ringkasan" sentence "Tidak ada server aplikasi ... tidak ada frontend web ter-deploy" to say the only server is the local Studio UI (`npm run studio`, not deployed).

`CLAUDE.md` and `AGENTS.md`: in the `## Commands` block, after the `npm run test:video` line, add:

```bash
npm run studio                 # web UI: raw upload/delete, tmux agent sessions + terminal, renders, publish (long-running)
npm run test:studio            # unit test the Studio server
```

and after the paragraph about `npm run dev` being long-running, add one line: `` `npm run studio` is also long-running; run it with `run_in_background: true`. ``

`README.md`: read it, then add a short "Studio web UI" subsection next to the existing usage/commands section:

```markdown
### Studio web UI

`npm run studio` starts a local web UI at `http://127.0.0.1:4777` (and on your
Tailscale IP, for your phone). Upload or delete raw videos, start an interactive
Claude/Codex editing session in tmux and steer its terminal from the browser,
play renders, and publish a render to Repliz after confirming. Set
`STUDIO_TOKEN` in `.env` to require a login. macOS + tmux only. See
`internal/docs/adr/0020-studio-web-ui.md`.
```

- [ ] **Step 2: Full verification**

Run each and confirm the result:

```bash
npm run test:studio      # all pass
npm run test:video       # still passes (video.mjs untouched, imported by Studio)
npm run test:repliz      # still passes (repliz-publish.mjs untouched, imported by Studio)
git status --short       # only the intended files; no .studio/ or raw files staged
```

- [ ] **Step 3: Phone smoke over Tailscale**

With `npm run studio` running, open `http://<tailscale-ip>:4777` on the phone. Open an existing session's terminal, type, use the key bar, rotate the phone (terminal redraws at the new size). If `STUDIO_TOKEN` is set, the login page appears first.

- [ ] **Step 4: Commit**

```bash
git add internal/docs/architecture/stack.md CLAUDE.md AGENTS.md README.md
git commit -m "docs(studio): commands, stack, and README for the Studio web UI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-28-studio-web-ui-design.md` change the status line to `Status: implemented 2026-09-28 (plan docs/superpowers/plans/2026-09-28-studio-web-ui.md)` and commit with message `docs: mark Studio spec implemented`.
