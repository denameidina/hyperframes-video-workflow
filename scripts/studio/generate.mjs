// Studio tab Generate (ADR-0026, RD-05-21..29): the form that starts a generate-mode video, the project list and
// detail the review panel shows, and the /media whitelist for its files. Gate state and decisions go through
// scripts/lib/gates.mjs, the only writer of gates.json.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DURATION, FORMATS, isMusicFormat, readFormat } from '../lib/formats.mjs';
import { GateError, editedSinceDecision, finalRender, gateStatus, isGenerate, readGates, recordDecision, sheetsOf } from '../lib/gates.mjs';
import { readCatalog } from '../lib/music.mjs';
import { loadVoices } from '../lib/voice/presets.mjs';
import { scriptBody, splitParagraphs } from '../lib/voice/script.mjs';
import { checkSlug, scaffold } from '../video.mjs';
import { projectSlugs } from './files.mjs';
import { HttpError } from './http.mjs';
import { JobRunner } from './jobs.mjs';
import { projectPath } from './projects.mjs';
import { listSessions, runFile, sessionName } from './sessions.mjs';

export const STYLES = ['motion-broll', 'broll-text', 'motion-graphic', 'whiteboard', 'stop-motion', 'vox', 'parallax'];
const RESERVED = new Set(['options', 'new']); // /api/generate/options and #generate/new
const MEDIA_RE = /^(processed-audio\.wav|preview\/storyboard-sheet(-\d+)?\.jpg)$/;

const hasContent = (f) => {
  try {
    const st = statSync(f);
    return st.isFile() && st.size > 0;
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return false;
    throw e;
  }
};
const readText = (f) => {
  try {
    return hasContent(f) ? readFileSync(f, 'utf8') : '';
  } catch (e) {
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(e.code)) return '';
    throw e;
  }
};
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
  return { voices, defaultVoice, styles: STYLES, music, repurpose, formats: FORMATS, durations: DURATION };
}

const empty = (v) => v === undefined || v === null || v === '';

export function validateRequest(root, b = {}, { now = () => new Date() } = {}) {
  const bad = (field, msg) => {
    throw new HttpError(400, `${field}: ${msg}`);
  };
  const brief = typeof b.brief === 'string' ? b.brief.replace(/\r\n/g, '\n').trim() : '';
  if (!brief) bad('brief', 'wajib diisi');
  if (brief.length > 4000) bad('brief', 'maksimal 4000 karakter');
  const format = empty(b.format) ? 'explainer' : b.format;
  if (!FORMATS.includes(format)) bad('format', `harus salah satu dari ${FORMATS.join(', ')}`);
  const music = isMusicFormat(format);
  let text = null;
  if (!empty(b.text)) {
    if (!music) bad('text', 'Teks persis hanya untuk kinetic-post dan motion-short');
    text = String(b.text).replace(/\r\n/g, '\n').trim();
    if (text.length > 1000) bad('text', 'maksimal 1000 karakter');
  }
  if (music && !empty(b.voice)) bad('voice', `${format} tidak punya suara`);
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
    const [lo, hi] = DURATION[format];
    duration = Number(b.duration);
    if (!Number.isInteger(duration) || duration < lo || duration > hi) bad('duration', `bilangan bulat ${lo}–${hi} atau kosong`);
  }
  const request = {
    version: 1,
    format,
    brief,
    text: text || null,
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
  const { dir } = scaffold({ slug, root, generate: true, format: request.format });
  const locked = request.text ? `\n## Teks persis (wajib dipakai kata demi kata)\n\n${request.text}\n` : '';
  writeFileSync(join(dir, 'research', 'brief.md'), `# Brief (verbatim dari Dena, ${request.createdAt.slice(0, 10)})\n\n${request.brief}\n${locked}`);
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

// explainer: | # | time | spoken words | style | what | example |; music formats add a "bars" column after "#"
// (ADR-0027), recognised by its header, so an explainer table with an extra column is not misread
export function storyboardRows(md) {
  const rows = String(md ?? '').split('\n').filter((l) => /^\s*\|/.test(l)).map((l) => l.trim().split('|').slice(1, -1).map((c) => c.trim()));
  const withBars = rows.find((c) => c[0] === '#')?.[1]?.toLowerCase() === 'bars';
  return rows
    .filter((c) => /^\d+$/.test(c[0]))
    .map((c) => {
      const [n, bars, time = '', words = '', style = '', what = '', example = ''] = withBars ? c : [c[0], null, ...c.slice(1)];
      return { n: Number(n), bars, time, words, style, what, example: example.replace(/`/g, '') };
    });
}

const briefLine = (dir) => {
  const line = readText(join(dir, 'research', 'brief.md')).split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) || '';
  return line.length > 140 ? `${line.slice(0, 139)}…` : line;
};
const sessionOf = (sessions, slug) => {
  const s = sessions.find((x) => x.slug === slug);
  return s ? { status: s.status, runtime: s.runtime, model: s.model } : null;
};

const readFormatSafe = (dir) => {
  try {
    return readFormat(dir);
  } catch {
    return 'explainer';
  }
};
const beatsSummary = (dir) => {
  const b = readJsonFile(join(dir, 'beats.json'));
  return b ? { track: b.track ?? null, bpm: b.bpm ?? null, bars: b.bars ?? null, duration: b.duration ?? null, loop: Boolean(b.loop) } : null;
};

export function listGenerate(root, sessions = []) {
  return projectSlugs(root)
    .map((slug) => ({ slug, dir: join(root, 'videos', slug) }))
    .filter(({ dir }) => isGenerate(dir))
    .map(({ slug, dir }) => {
      let status;
      let format = null; // unknown when the format line is broken (the status says why)
      try {
        const s = gateStatus(dir, { slug });
        status = { phase: s.phase, gate: s.gate, state: s.state };
        format = s.format;
      } catch (e) {
        status = { phase: 'error', gate: null, state: null, error: e.message };
      }
      return { slug, format, brief: briefLine(dir), status, session: sessionOf(sessions, slug) };
    });
}

export function generateDetail(root, slug, sessions = [], { voiceJobs } = {}) {
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
  const render = finalRender(dir, slug);
  return {
    slug,
    brief: briefLine(dir),
    request: readRequest(dir),
    status,
    format: status.format,
    beats: beatsSummary(dir),
    session: sessionOf(sessions, slug),
    voiceJob: { running: Boolean(voiceJobs?.running(slug)) },
    gate1: {
      script,
      paragraphs: splitParagraphs(scriptBody(script)),
      lines: scriptBody(script).split('\n').map((l) => l.trim()).filter(Boolean),
      facts: mdSection(script, 'Fakta'),
      voice: meta ? { duration: meta.duration ?? null, preset: meta.preset ?? null, wer: meta.alignment?.wer ?? null } : null,
      audio: hasContent(join(dir, 'processed-audio.wav')),
    },
    gate2: {
      sheets: sheetsOf(dir).filter((file) => hasContent(join(dir, file))),
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
  if (!MEDIA_RE.test(file) || !hasContent(join(dir, file))) throw new HttpError(404, 'not found');
  return join(dir, file);
}

// ---- decisions (RD-05-25..26) ----
const GATE_STATUS = { stale: 409, 'not-waiting': 409, 'voice-stale': 409, 'missing-file': 409, 'note-required': 400, 'bad-decision': 400, 'bad-note': 400, 'bad-gate': 400, 'not-generate': 404, 'bad-file': 500 };

function asHttp(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GateError) throw new HttpError(GATE_STATUS[e.code] ?? 400, e.message);
    throw e;
  }
}

// C0, DEL, and C1 control characters become spaces: a note can never press a key in the agent's terminal
const oneLine = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim();
const MAX_MESSAGE = 1000;

// Every message starts and ends with fixed text (so a note can never begin the line with "/" or "!", nor end a tmux
// argument with ";"). The last gate's approval (explainer 3, music formats 2; ADR-0027) ends the run: the next step
// in Build would be the publish gate, which is Dena's.
export function gateMessage({ gate, decision, note = '', edited = false, voiceStale = false, finalGate = 3 }) {
  const build = (n) => {
    let text;
    if (decision === 'approve' && gate === finalGate) text = `Gate ${gate} disetujui dari Studio. Catatan: ${n || '-'}. Video selesai; jangan publish ke Repliz atau R2 — Dena publish sendiri dari tab Results. Berhenti di sini.`;
    else if (decision === 'approve') text = `Gate ${gate} disetujui dari Studio. Catatan: ${n || '-'}. Lanjutkan ke fase berikutnya.`;
    else if (decision === 'revise') text = `Gate ${gate} revisi dari Studio: ${n}. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate ${gate}.`;
    else if (decision === 'qa') text = `Gate ${gate}: Dena memilih QA dulu${n ? ` (${n})` : ''}. Jalankan fase QA (docs/agents/04-qa.md) sebagai subagent baru, lalu kembali ke Gate ${gate}.`;
    else throw new Error(`no message for decision ${decision}`);
    if (!edited || gate !== 1) return text;
    return voiceStale
      ? `Naskah diedit Dena di Studio (suaranya belum dibuat ulang); baca ulang script.md. ${text}`
      : `Naskah diedit Dena di Studio dan suaranya sudah dibuat ulang; baca ulang script.md. ${text}`;
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
// While "Buat ulang suara" runs, processed-audio.wav is about to change: no approval, revision, or edit may bind to it.
const refuseVoiceJob = (voiceJobs, slug) => {
  if (voiceJobs?.running(slug)) throw new HttpError(409, 'suara sedang dibuat ulang; tunggu sampai selesai');
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function decide(root, slug, body = {}, { run, now, voiceJobs, pause = wait } = {}) {
  const dir = generateDir(root, slug);
  const gate = Number(body.gate);
  if (![1, 2, 3].includes(gate)) throw new HttpError(400, 'gate must be 1, 2, or 3');
  if (!['approve', 'revise', 'qa'].includes(body.decision)) throw new HttpError(400, 'decision must be approve, revise, or qa');
  if (!body.fingerprint || typeof body.fingerprint !== 'object') throw new HttpError(400, 'fingerprint is required (reload the panel)');
  refuseVoiceJob(voiceJobs, slug);
  const session = await sessionFor(slug, run);
  refuseBusy(session);
  const before = asHttp(() => gateStatus(dir, { slug }));
  const edited = gate === 1 && editedSinceDecision(before.log, 1);
  const recorded = asHttp(() => recordDecision(dir, { gate, decision: body.decision, note: body.note, by: 'studio', fingerprint: body.fingerprint, ...(now ? { now } : {}) }));
  if (!session || session.status === 'exited') return { recorded, sent: false, error: 'tidak ada sesi agent; mulai sesi lanjut' };
  const text = gateMessage({ gate, decision: body.decision, note: recorded.note, edited, voiceStale: before.voiceStale, finalGate: before.finalGate });
  const target = `=${sessionName(slug)}:`;
  const exec = run || runFile;
  const typed = await exec('tmux', ['send-keys', '-t', target, '-l', text]);
  if (typed.code === 0) await pause(300); // let the TUI take the typed line before Enter submits it
  const entered = typed.code === 0 ? await exec('tmux', ['send-keys', '-t', target, 'Enter']) : typed;
  if (entered.code !== 0) return { recorded, sent: false, error: `tmux send-keys gagal: ${String(entered.stderr || '').trim()}` };
  return { recorded, sent: true, error: null };
}

// ---- script edit (RD-05-27) ----
export async function saveScript(root, slug, text, { run, now, voiceJobs } = {}) {
  const dir = generateDir(root, slug);
  if (isMusicFormat(readFormatSafe(dir))) throw new HttpError(409, 'teks format musik direvisi lewat catatan ke agent (storyboard ikut berubah)');
  if (typeof text !== 'string') throw new HttpError(400, 'text must be a string');
  if (Buffer.byteLength(text) > 20480) throw new HttpError(413, 'naskah maksimal 20 KB');
  if (!scriptBody(text).trim()) throw new HttpError(400, 'naskah tanpa narasi (teks sebelum ## pertama kosong)');
  refuseVoiceJob(voiceJobs, slug);
  refuseBusy(await sessionFor(slug, run)); // the await comes before the Gate 1 check, so nothing can move in between
  const status = asHttp(() => gateStatus(dir, { slug }));
  if (status.phase !== 'gate' || status.gate !== 1) throw new HttpError(409, 'naskah hanya bisa diedit di Gate 1');
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
