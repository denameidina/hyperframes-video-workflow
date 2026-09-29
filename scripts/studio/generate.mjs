// Studio tab Generate (ADR-0026, RD-05-21..29): the form that starts a generate-mode video, the project list and
// detail the review panel shows, and the /media whitelist for its files. Gate state and decisions go through
// scripts/lib/gates.mjs, the only writer of gates.json.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GateError, editedSinceDecision, gateStatus, isGenerate, readGates, recordDecision, sheetsOf } from '../lib/gates.mjs';
import { readCatalog } from '../lib/music.mjs';
import { loadVoices } from '../lib/voice/presets.mjs';
import { scriptBody, splitParagraphs } from '../lib/voice/script.mjs';
import { checkSlug, scaffold } from '../video.mjs';
import { projectSlugs } from './files.mjs';
import { HttpError } from './http.mjs';
import { JobRunner } from './jobs.mjs';
import { projectPath, rendersOf } from './projects.mjs';
import { listSessions, runFile, sessionName } from './sessions.mjs';

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

// ---- decisions (RD-05-25..26) ----
const GATE_STATUS = { stale: 409, 'not-waiting': 409, 'voice-stale': 409, 'note-required': 400, 'bad-decision': 400, 'bad-note': 400, 'bad-gate': 400, 'not-generate': 404, 'bad-file': 500 };

function asHttp(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GateError) throw new HttpError(GATE_STATUS[e.code] ?? 400, e.message);
    throw e;
  }
}

const oneLine = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const MAX_MESSAGE = 1000;

export function gateMessage({ gate, decision, note = '', edited = false }) {
  const build = (n) => {
    let text;
    if (decision === 'approve') text = `Gate ${gate} disetujui dari Studio. Catatan: ${n || '-'}. Lanjutkan ke fase berikutnya.`;
    else if (decision === 'revise') text = `Gate ${gate} revisi dari Studio: ${n}. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate ${gate}.`;
    else if (decision === 'qa') text = `Gate 3: Dena memilih QA dulu${n ? ` (${n})` : ''}. Jalankan fase QA (docs/agents/04-qa.md) sebagai subagent baru, lalu kembali ke Gate 3.`;
    else throw new Error(`no message for decision ${decision}`);
    return edited && gate === 1 ? `Naskah diedit Dena di Studio dan suaranya sudah dibuat ulang; baca ulang script.md. ${text}` : text;
  };
  const n = oneLine(note);
  const full = build(n);
  if (full.length <= MAX_MESSAGE) return full;
  return build(`${n.slice(0, n.length - (full.length - MAX_MESSAGE) - 1)}…`); // shorten the note, keep the instruction
}

const sessionFor = async (slug, run) => (await listSessions(run ? { run } : {})).find((s) => s.slug === slug);
const refuseBusy = (session) => {
  if (session?.status === 'running') throw new HttpError(409, 'agent sedang bekerja; tunggu sampai ia berhenti di gate');
};

export async function decide(root, slug, body = {}, { run, now } = {}) {
  const dir = generateDir(root, slug);
  const gate = Number(body.gate);
  if (![1, 2, 3].includes(gate)) throw new HttpError(400, 'gate must be 1, 2, or 3');
  if (!['approve', 'revise', 'qa'].includes(body.decision)) throw new HttpError(400, 'decision must be approve, revise, or qa');
  if (!body.fingerprint || typeof body.fingerprint !== 'object') throw new HttpError(400, 'fingerprint is required (reload the panel)');
  const session = await sessionFor(slug, run);
  refuseBusy(session);
  const edited = gate === 1 && editedSinceDecision(asHttp(() => readGates(dir)).log, 1);
  const recorded = asHttp(() => recordDecision(dir, { gate, decision: body.decision, note: body.note, by: 'studio', fingerprint: body.fingerprint, ...(now ? { now } : {}) }));
  if (!session || session.status === 'exited') return { recorded, sent: false, error: 'tidak ada sesi agent; mulai sesi lanjut' };
  const text = gateMessage({ gate, decision: body.decision, note: recorded.note, edited });
  const target = `=${sessionName(slug)}:`;
  const exec = run || runFile;
  const typed = await exec('tmux', ['send-keys', '-t', target, '-l', text]);
  const entered = typed.code === 0 ? await exec('tmux', ['send-keys', '-t', target, 'Enter']) : typed;
  if (entered.code !== 0) return { recorded, sent: false, error: `tmux send-keys gagal: ${String(entered.stderr || '').trim()}` };
  return { recorded, sent: true, error: null };
}

// ---- script edit (RD-05-27) ----
export async function saveScript(root, slug, text, { run, now } = {}) {
  const dir = generateDir(root, slug);
  if (typeof text !== 'string') throw new HttpError(400, 'text must be a string');
  if (Buffer.byteLength(text) > 20480) throw new HttpError(413, 'naskah maksimal 20 KB');
  if (!scriptBody(text).trim()) throw new HttpError(400, 'naskah tanpa narasi (teks sebelum ## pertama kosong)');
  const status = asHttp(() => gateStatus(dir, { slug }));
  if (status.phase !== 'gate' || status.gate !== 1) throw new HttpError(409, 'naskah hanya bisa diedit di Gate 1');
  refuseBusy(await sessionFor(slug, run));
  const file = join(dir, 'script.md');
  writeFileSync(`${file}.part`, text.endsWith('\n') ? text : `${text}\n`);
  renameSync(`${file}.part`, file);
  asHttp(() => recordDecision(dir, { gate: 1, decision: 'edit', note: 'naskah diedit di Studio', by: 'studio', ...(now ? { now } : {}) }));
  return gateStatus(dir, { slug });
}

// ---- continue session (RD-05-28) ----
export function lastDecisionNote(dir) {
  const last = readGates(dir).log.at(-1);
  return last ? `Keputusan terakhir: Gate ${last.gate} ${last.decision}${last.note ? ` — ${last.note}` : ''} (${last.by}, ${last.at}).` : '';
}

// ---- voice job (RD-05-27) ----
export class VoiceJobs {
  constructor({ root, env = process.env, spawnImpl = spawn }) {
    this.root = root;
    this.env = env;
    this.runner = new JobRunner({ spawnImpl, label: 'voice' });
  }

  has(slug) {
    return this.runner.has(slug);
  }

  running(slug) {
    return this.runner.running(slug);
  }

  // video voice reads .env itself; its own child processes stay without Gemini keys (RD-06-25)
  start(slug) {
    const preset = readRequest(generateDir(this.root, slug))?.voice || null;
    return this.runner.start(slug, process.execPath, ['scripts/video.mjs', 'voice', slug, ...(preset ? ['--preset', preset] : [])], { cwd: this.root, env: this.env });
  }

  follow(slug, listener) {
    return this.runner.follow(slug, listener);
  }
}
