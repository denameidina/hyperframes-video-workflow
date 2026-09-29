// Studio routes (ADR-0020, ADR-0022, RD-05). Filesystem + tmux are the only state.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkSlug } from '../video.mjs';
import { probeMedia } from '../lib/video-sources.mjs';
import { buildPrompt } from './agent.mjs';
import { HttpError, guardRequest, hasToken, openSse, readJson, sendFile, sendJson, tokenCookie, tokenMatches } from './http.mjs';
import { attachShared, createProject, deleteProject, deleteSource, getProject, listProjects, projectPath, sourcePathOf, updateSource, uploadSource } from './projects.mjs';
import { listResults, publishPreview, renderPath } from './results.mjs';
import { deleteShared, listShared, receiveShared } from './shared.mjs';
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

export function createApp({ root, env = {}, hosts, token = '', tools = {}, models = async () => ({}), run, terminals, publisher, probe = async () => null, probeSource = probeMedia }) {
  const opt = run ? { run } : {};

  const routes = [
    ['GET', /^\/api\/state$/, async () => ({ tools, models: await models() })],
    ['GET', /^\/api\/shared$/, async () => listShared(root, { probe })],
    ['POST', /^\/api\/shared$/, async (req, url) => ({ name: await receiveShared(root, url.searchParams.get('name'), req) })],
    ['DELETE', /^\/api\/shared\/([^/]+)$/, async (req, url, [name]) => deleteShared(root, name)],
    ['GET', /^\/api\/projects$/, async () => listProjects(root)],
    ['POST', /^\/api\/projects$/, async (req) => createProject(root, (await readJson(req)).slug)],
    ['GET', /^\/api\/projects\/([^/]+)$/, async (req, url, [slug]) => getProject(root, slug)],
    ['DELETE', /^\/api\/projects\/([^/]+)$/, async (req, url, [slug]) => {
      projectPath(root, slug);
      await killSession(slug, opt);
      return deleteProject(root, slug);
    }],
    ['POST', /^\/api\/projects\/([^/]+)\/sources$/, async (req, url, [slug]) => uploadSource(root, slug, url.searchParams.get('name'), req, { probe: probeSource })],
    ['POST', /^\/api\/projects\/([^/]+)\/shared$/, async (req, url, [slug]) => attachShared(root, slug, (await readJson(req)).names, { probe: probeSource })],
    ['PATCH', /^\/api\/projects\/([^/]+)\/sources\/([^/]+)$/, async (req, url, [slug, id]) => {
      const b = await readJson(req);
      return updateSource(root, slug, id, { role: b.role, note: b.note });
    }],
    ['DELETE', /^\/api\/projects\/([^/]+)\/sources\/([^/]+)$/, async (req, url, [slug, id]) => deleteSource(root, slug, id)],
    ['GET', /^\/api\/projects\/([^/]+)\/sources\/([^/]+)\/file$/, async (req, url, [slug, id], res) => {
      sendFile(req, res, sourcePathOf(root, slug, id));
      return RAW;
    }],
    ['GET', /^\/api\/sessions$/, async () => listSessions(opt)],
    ['POST', /^\/api\/sessions$/, async (req) => {
      const b = await readJson(req);
      const slug = slugParam(b.slug);
      const dir = projectPath(root, slug);
      const known = (await models())[b.runtime]?.models?.find((m) => m.value === b.model);
      if (known && !known.efforts.includes(b.effort)) throw new HttpError(400, `${b.model} supports effort ${known.efforts.join(', ')}`);
      const mode = existsSync(join(dir, 'creative-brief.md')) ? 'continue' : 'new';
      const prior = (await listSessions(opt)).find((s) => s.slug === slug);
      if (prior?.status === 'exited') await killSession(slug, opt);
      const prompt = buildPrompt({ mode, slug, notes: b.notes });
      return startSession({ root, slug, runtime: b.runtime, model: b.model, effort: b.effort, prompt, ...opt });
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
