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
