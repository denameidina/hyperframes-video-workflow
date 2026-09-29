// Studio tab Generate (ADR-0026, RD-05-21..29): the form that starts a generate-mode video, the project list and
// detail the review panel shows, and the /media whitelist for its files. Gate state and decisions go through
// scripts/lib/gates.mjs, the only writer of gates.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gateStatus, isGenerate, sheetsOf } from '../lib/gates.mjs';
import { readCatalog } from '../lib/music.mjs';
import { loadVoices } from '../lib/voice/presets.mjs';
import { scriptBody, splitParagraphs } from '../lib/voice/script.mjs';
import { checkSlug, scaffold } from '../video.mjs';
import { projectSlugs } from './files.mjs';
import { HttpError } from './http.mjs';
import { projectPath, rendersOf } from './projects.mjs';

export const STYLES = ['motion-broll', 'broll-text', 'motion-graphic', 'whiteboard', 'stop-motion', 'vox', 'parallax'];
const RESERVED = new Set(['options', 'new']); // /api/generate/options and #generate/new
const MEDIA_RE = /^(processed-audio\.wav|preview\/storyboard-sheet(-\d+)?\.jpg)$/;

const readText = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
const readJsonFile = (f) => {
  try {
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  } catch {
    return null;
  }
};

export function generateDir(root, slug) {
  const dir = projectPath(root, slug);
  if (!isGenerate(dir)) throw new HttpError(404, `videos/${slug} is not a generate-mode project`);
  return dir;
}

export const readRequest = (dir) => readJsonFile(join(dir, 'research', 'request.json'));

export function generateOptions(root) {
  let voices = [];
  let defaultVoice = null;
  try {
    const v = loadVoices(root);
    voices = Object.entries(v.presets).filter(([, p]) => p.provider !== 'recorded').map(([name, p]) => ({ name, provider: p.provider }));
    defaultVoice = voices.some((x) => x.name === v.default) ? v.default : null;
  } catch {
    // no config/voices.json: the field stays empty and the agent picks
  }
  let music = [];
  try {
    music = readCatalog(root).tracks.filter((t) => !t.rejected).map((t) => ({ id: t.id, title: t.title, mood: t.mood, energy: t.energy, duration: t.duration }));
  } catch {
    // unreadable catalog: no music choice
  }
  const repurpose = projectSlugs(root).filter((s) => existsSync(join(root, 'videos', s, 'processed-transcript.json')));
  return { voices, defaultVoice, styles: STYLES, music, repurpose };
}

const empty = (v) => v === undefined || v === null || v === '';

export function validateRequest(root, b = {}, { now = () => new Date() } = {}) {
  const bad = (field, msg) => {
    throw new HttpError(400, `${field}: ${msg}`);
  };
  const brief = typeof b.brief === 'string' ? b.brief.replace(/\r\n/g, '\n').trim() : '';
  if (!brief) bad('brief', 'wajib diisi');
  if (brief.length > 4000) bad('brief', 'maksimal 4000 karakter');
  let slug = '';
  try {
    slug = checkSlug(b.slug);
  } catch (e) {
    bad('slug', e.message);
  }
  if (RESERVED.has(slug)) bad('slug', `"${slug}" dipakai Studio`);
  if (existsSync(join(root, 'videos', slug))) throw new HttpError(409, `slug: videos/${slug} sudah ada`);
  const urls = empty(b.urls) ? [] : b.urls;
  if (!Array.isArray(urls) || urls.length > 5) bad('urls', 'maksimal 5 URL');
  for (const u of urls) {
    let p = null;
    try {
      p = new URL(String(u));
    } catch {
      bad('urls', `${u} bukan URL`);
    }
    if (p.protocol !== 'http:' && p.protocol !== 'https:') bad('urls', `${u} harus http atau https`);
  }
  const opts = generateOptions(root);
  const pick = (field, value, allowed) => {
    if (empty(value)) return null;
    if (!allowed.includes(value)) bad(field, `${value} tidak tersedia`);
    return value;
  };
  let duration = null;
  if (!empty(b.duration)) {
    duration = Number(b.duration);
    if (!Number.isInteger(duration) || duration < 30 || duration > 90) bad('duration', 'bilangan bulat 30–90 atau kosong');
  }
  const request = {
    version: 1,
    brief,
    urls: urls.map(String),
    repurpose: pick('repurpose', b.repurpose, opts.repurpose),
    voice: pick('voice', b.voice, opts.voices.map((v) => v.name)),
    duration,
    style: pick('style', b.style, STYLES),
    music: pick('music', b.music, opts.music.map((m) => m.id)),
    createdAt: now().toISOString(),
  };
  return { slug, request };
}

export function createGenerate(root, body, { now } = {}) {
  const { slug, request } = validateRequest(root, body, { now });
  const { dir } = scaffold({ slug, root, generate: true });
  writeFileSync(join(dir, 'research', 'brief.md'), `# Brief (verbatim dari Dena, ${request.createdAt.slice(0, 10)})\n\n${request.brief}\n`);
  writeFileSync(join(dir, 'research', 'request.json'), `${JSON.stringify(request, null, 2)}\n`);
  return { slug, request };
}

export function mdSection(md, heading) {
  const lines = String(md ?? '').split('\n');
  const start = lines.findIndex((l) => l.replace(/\s+$/, '') === `## ${heading}`);
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

export function storyboardRows(md) {
  return String(md ?? '').split('\n')
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .map(([n, time = '', words = '', style = '', what = '', example = '']) => ({ n: Number(n), time, words, style, what, example: example.replace(/`/g, '') }));
}

const briefLine = (dir) => {
  const line = readText(join(dir, 'research', 'brief.md')).split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) || '';
  return line.length > 140 ? `${line.slice(0, 139)}…` : line;
};
const sessionOf = (sessions, slug) => {
  const s = sessions.find((x) => x.slug === slug);
  return s ? { status: s.status, runtime: s.runtime, model: s.model } : null;
};

export function listGenerate(root, sessions = []) {
  return projectSlugs(root)
    .map((slug) => ({ slug, dir: join(root, 'videos', slug) }))
    .filter(({ dir }) => isGenerate(dir))
    .map(({ slug, dir }) => {
      let status;
      try {
        const s = gateStatus(dir, { slug });
        status = { phase: s.phase, gate: s.gate, state: s.state };
      } catch (e) {
        status = { phase: 'error', gate: null, state: null, error: e.message };
      }
      return { slug, brief: briefLine(dir), status, session: sessionOf(sessions, slug) };
    });
}

export function generateDetail(root, slug, sessions = []) {
  const dir = generateDir(root, slug);
  let status;
  try {
    status = gateStatus(dir, { slug });
  } catch (e) {
    throw new HttpError(500, e.message);
  }
  const script = readText(join(dir, 'script.md'));
  const meta = readJsonFile(join(dir, 'voice', 'voice-meta.json'));
  const plan = readText(join(dir, 'visual-plan.md'));
  const music = mdSection(plan, 'Music');
  let ids = [];
  try {
    ids = readCatalog(root).tracks.map((t) => t.id);
  } catch {
    // no catalog: no music preview
  }
  const notes = readText(join(dir, 'assembly-notes.md'));
  const render = rendersOf(root, slug).includes(`${slug}.mp4`) ? `${slug}.mp4` : null;
  return {
    slug,
    brief: briefLine(dir),
    request: readRequest(dir),
    status,
    session: sessionOf(sessions, slug),
    gate1: {
      script,
      paragraphs: splitParagraphs(scriptBody(script)),
      facts: mdSection(script, 'Fakta'),
      voice: meta ? { duration: meta.duration ?? null, preset: meta.preset ?? null, wer: meta.alignment?.wer ?? null } : null,
      audio: existsSync(join(dir, 'processed-audio.wav')),
    },
    gate2: {
      sheets: sheetsOf(dir),
      rows: storyboardRows(readText(join(dir, 'storyboard.md'))),
      styleWorld: mdSection(plan, 'Style World'),
      music,
      musicTrack: ids.find((id) => music.includes(id)) || null,
    },
    gate3: {
      render,
      deviations: mdSection(notes, 'Deviations From Plan'),
      risks: mdSection(notes, 'Handoff Risks'),
      qaReport: existsSync(join(dir, 'qa-report.md')),
    },
  };
}

// RD-05-24: only the voiceover and the storyboard sheets; renders keep /media/<slug>/<file> (results.mjs).
export function generateMediaPath(root, slug, file) {
  const dir = generateDir(root, slug);
  if (!MEDIA_RE.test(file) || !existsSync(join(dir, file))) throw new HttpError(404, 'not found');
  return join(dir, file);
}
