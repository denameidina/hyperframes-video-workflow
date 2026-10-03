// Studio routes (ADR-0020, ADR-0022, ADR-0023, ADR-0024, RD-05). Filesystem + tmux are the only state.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkSlug } from '../video.mjs';
import { gateStatus, isGenerate } from '../lib/gates.mjs';
import { probeMedia } from '../lib/video-sources.mjs';
import { agentCommand, buildPrompt, checkMotion } from './agent.mjs';
import { HttpError, guardRequest, hasToken, openSse, readJson, sendFile, sendJson, tokenCookie, tokenMatches } from './http.mjs';
import { createGenerate, decide, generateDetail, generateDir, generateMediaPath, generateOptions, lastDecisionNote, listGenerate, saveScript } from './generate.mjs';
import { attachShared, createProject, deleteProject, deleteSource, getProject, listProjects, projectPath, sourcePathOf, updateSource, uploadSource } from './projects.mjs';
import { listResults, publishPreview, renderPath } from './results.mjs';
import { canvasOf } from '../lib/ratio.mjs';
import { thumbVersion, thumbnailPath } from './thumbs.mjs';
import { ReplizCalendar } from './calendar.mjs';
import { listMusic, musicFile, rejectMusic } from './music.mjs';
import { deleteShared, listShared, receiveShared } from './shared.mjs';
import { interruptSession, killSession, listSessions, startSession } from './sessions.mjs';
import { VIEWER_RE } from './terminal.mjs';
import { getVoiceTest, listVoiceTests, saveVoiceRatings, voiceTestFile } from './voice-tests.mjs';

const PUBLIC = join(import.meta.dirname, 'public');
const XTERM = join(import.meta.dirname, '..', '..', 'vendor', 'xterm');
const STATIC = { '/': 'index.html', '/login': 'login.html', '/app.js': 'app.js', '/generate.js': 'generate.js', '/calendar.js': 'calendar.js', '/app.css': 'app.css' };
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

export function createApp({ root, env = {}, hosts, token = '', tools = {}, models = async () => ({}), run, terminals, publisher, voiceJobs, probe = async () => null, probeSource = probeMedia, thumbMaker, calendar = new ReplizCalendar({ root, env }) }) {
  const opt = run ? { run } : {};
  // generate routes take a JSON object; null, arrays, and scalars are a 400, not a TypeError (500)
  const readObject = async (req, limit) => {
    const b = await readJson(req, limit);
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'body must be a JSON object');
    return b;
  };
  const checkModel = async (b) => {
    const known = (await models())[b.runtime]?.models?.find((m) => m.value === b.model);
    if (known && !known.efforts.includes(b.effort)) throw new HttpError(400, `${b.model} supports effort ${known.efforts.join(', ')}`);
  };

  const routes = [
    ['GET', /^\/api\/state$/, async () => ({ tools, models: await models() })],
    ['GET', /^\/api\/shared$/, async () => listShared(root, { probe })],
    ['POST', /^\/api\/shared$/, async (req, url) => ({ name: await receiveShared(root, url.searchParams.get('name'), req) })],
    ['DELETE', /^\/api\/shared\/([^/]+)$/, async (req, url, [name]) => deleteShared(root, name)],
    ['GET', /^\/api\/projects$/, async () => listProjects(root).map((p) => ({ ...p, thumb: thumbVersion(root, p.slug) }))],
    ['POST', /^\/api\/projects$/, async (req) => {
      const b = await readJson(req);
      return createProject(root, b.slug, b.ratio || undefined);
    }],
    ['GET', /^\/api\/projects\/([^/]+)\/thumb$/, async (req, url, [slug], res) => {
      const file = await thumbnailPath(root, slug, thumbMaker ? { make: thumbMaker } : {});
      if (!file) throw new HttpError(404, 'no media to preview');
      sendFile(req, res, file, { cache: 'private, max-age=86400' });
      return RAW;
    }],
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
      await checkModel(b);
      const mode = isGenerate(dir) ? 'generate-continue' : existsSync(join(dir, 'creative-brief.md')) ? 'continue' : 'new';
      const prior = (await listSessions(opt)).find((s) => s.slug === slug);
      if (prior?.status === 'exited') await killSession(slug, opt);
      const prompt = buildPrompt({ mode, slug, notes: b.notes, motion: checkMotion(b.motion), ratio: canvasOf(dir).ratio });
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
    ['GET', /^\/api\/voice-tests$/, async () => listVoiceTests(root)],
    ['GET', /^\/api\/voice-tests\/([^/]+)$/, async (req, url, [id]) => getVoiceTest(root, id)],
    ['GET', /^\/api\/voice-tests\/([^/]+)\/files\/([^/]+)$/, async (req, url, [id, name], res) => {
      sendFile(req, res, voiceTestFile(root, id, name));
      return RAW;
    }],
    ['POST', /^\/api\/voice-tests\/([^/]+)\/ratings$/, async (req, url, [id]) => saveVoiceRatings(root, id, await readJson(req))],
    ['GET', /^\/api\/music$/, async () => listMusic(root)],
    ['GET', /^\/api\/music\/([^/]+)\/file$/, async (req, url, [id], res) => {
      sendFile(req, res, musicFile(root, id));
      return RAW;
    }],
    ['POST', /^\/api\/music\/([^/]+)\/reject$/, async (req, url, [id]) => rejectMusic(root, id, (await readJson(req)).rejected)],
    ['GET', /^\/api\/generate$/, async () => listGenerate(root, await listSessions(opt)).map((p) => ({ ...p, thumb: thumbVersion(root, p.slug) }))],
    ['GET', /^\/api\/generate\/options$/, async () => generateOptions(root)],
    ['POST', /^\/api\/generate$/, async (req, url, m, res) => {
      const b = await readObject(req);
      agentCommand(b); // runtime, model, and effort are checked before anything is created (RD-05-23)
      checkMotion(b.motion);
      await checkModel(b);
      const { slug, request } = createGenerate(root, b);
      let session = { started: true, error: null };
      try {
        await startSession({ root, slug, runtime: b.runtime, model: b.model, effort: b.effort, prompt: buildPrompt({ mode: 'generate', slug, format: request.format, motion: request.motion, ratio: request.ratio }), ...opt });
      } catch (e) {
        session = { started: false, error: e.message }; // the project stays; the panel offers "Mulai sesi"
      }
      sendJson(res, 201, { slug, session });
      return RAW;
    }],
    ['GET', /^\/api\/generate\/([^/]+)$/, async (req, url, [slug]) => generateDetail(root, slugParam(slug), await listSessions(opt), { voiceJobs })],
    ['POST', /^\/api\/generate\/([^/]+)\/decision$/, async (req, url, [slug]) => decide(root, slugParam(slug), await readObject(req), { ...opt, voiceJobs })],
    ['PUT', /^\/api\/generate\/([^/]+)\/script$/, async (req, url, [slug]) => saveScript(root, slugParam(slug), (await readObject(req, 65536)).text, { ...opt, voiceJobs })],
    ['POST', /^\/api\/generate\/([^/]+)\/voice$/, async (req, url, [slug]) => {
      const dir = generateDir(root, slugParam(slug));
      const s = gateStatus(dir, { slug });
      if (s.format !== 'explainer') throw new HttpError(409, 'format musik tidak punya suara; musiknya dipotong dengan npm run video -- music');
      if (s.phase !== 'gate' || s.gate !== 1) throw new HttpError(409, 'suara hanya dibuat ulang di Gate 1');
      if ((await listSessions(opt)).find((x) => x.slug === slug)?.status === 'running') throw new HttpError(409, 'agent sedang bekerja; tunggu sampai ia berhenti di gate');
      voiceJobs.start(slug);
      return { ok: true };
    }],
    ['GET', /^\/api\/generate\/([^/]+)\/voice\/stream$/, async (req, url, [slug], res) => {
      if (!voiceJobs.has(slugParam(slug))) throw new HttpError(404, 'no voice job');
      const sse = openSse(res);
      const unfollow = voiceJobs.follow(slug, (event, data) => {
        sse.send(event, data);
        if (event === 'done') sse.end();
      });
      sse.onClose(unfollow);
      return RAW;
    }],
    ['POST', /^\/api\/generate\/([^/]+)\/session$/, async (req, url, [slug]) => {
      const dir = generateDir(root, slugParam(slug));
      const b = await readObject(req);
      agentCommand(b);
      await checkModel(b);
      const prior = (await listSessions(opt)).find((s) => s.slug === slug);
      if (prior?.status === 'exited') await killSession(slug, opt);
      return startSession({ root, slug, runtime: b.runtime, model: b.model, effort: b.effort, prompt: buildPrompt({ mode: 'generate-continue', slug, notes: lastDecisionNote(dir), ratio: canvasOf(dir).ratio }), ...opt });
    }],
    ['GET', /^\/media\/([^/]+)\/(processed-audio\.wav|preview\/storyboard-sheet(?:-\d+)?\.jpg)$/, async (req, url, [slug, file], res) => {
      sendFile(req, res, generateMediaPath(root, slugParam(slug), file));
      return RAW;
    }],
    ['GET', /^\/api\/results$/, async () => listResults(root, { probe: probeSource })],
    ['GET', /^\/api\/calendar$/, async (req, url) => {
      const sync = url.searchParams.get('sync');
      if (sync !== null && sync !== '1') throw new HttpError(400, 'sync must be 1');
      return calendar.read(url.searchParams.get('month'), { sync: sync === '1' });
    }],
    ['GET', /^\/media\/([^/]+)\/([^/]+)$/, async (req, url, [slug, file], res) => {
      sendFile(req, res, renderPath(root, slugParam(slug), file));
      return RAW;
    }],
    ['GET', /^\/api\/results\/([^/]+)\/publish-preview$/, async (req, url, [slug]) => publishPreview(root, slugParam(slug), url.searchParams.get('file'), env)],
    ['POST', /^\/api\/results\/([^/]+)\/publish$/, async (req, url, [slug]) => {
      const b = await readObject(req);
      publisher.start(slugParam(slug), b.file, b.scheduleAt);
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
