// Generate-mode gate state (ADR-0026, RD-03-88..91): a project's position comes from its artifacts plus the
// append-only decision log videos/<slug>/gates.json. This module is the only writer of gates.json; Studio and
// `npm run video -- gate` both go through it. Node 22+ built-ins (ADR-0007).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { finalGate, isMusicFormat, readFormat } from './formats.mjs';
import { EVIDENCE_FILE, inspectStoryboardEvidence } from './storyboard.mjs';
import { isPlayableRender } from './render-quality.mjs';

export const GATES_FILE = 'gates.json';
export const DECISIONS = ['approve', 'revise', 'qa', 'edit'];
const BY = ['studio', 'cli'];
const SHEET_RE = /^storyboard-sheet(-\d+)?\.jpg$/;
const MAX_NOTE = 2000;
const DESIGN_PATHS = ['art-direction/design.md', 'art-direction.md', 'design.md'];

export class GateError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function isGenerate(dir) {
  const brief = join(dir, 'creative-brief.md');
  return existsSync(brief) && /^\s*-\s*mode:\s*generate\b/m.test(readFileSync(brief, 'utf8'));
}

// Studio polls every 3 s and a render is tens of MB: hash a file again only when its size, mtime, or inode changed.
const hashes = new Map();
function sha(file) {
  const st = statSync(file);
  const key = `${st.size}:${st.mtimeMs}:${st.ctimeMs}:${st.ino}`;
  const hit = hashes.get(file);
  if (hit?.key === key) return hit.hash;
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
  hashes.set(file, { key, hash });
  return hash;
}

export function sheetsOf(dir) {
  const preview = join(dir, 'preview');
  if (!existsSync(preview)) return [];
  return readdirSync(preview).filter((f) => SHEET_RE.test(f)).sort().map((f) => `preview/${f}`);
}

function readyFile(file) {
  try {
    const st = statSync(file);
    return st.isFile() && st.size > 0;
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return false;
    throw e;
  }
}

// Shared by gate fingerprints and the Studio player (RD-03-101, RD-05-34).
// Prefer the newest completed normal/blur output; normal wins a timestamp tie.
const playable = new WeakMap();
function cachedPlayable(file, run) {
  const st = statSync(file);
  const key = `${st.size}:${st.mtimeMs}:${st.ctimeMs}:${st.ino}`;
  let cache = playable.get(run);
  if (cache?.get(file) === key) return true;
  if (!isPlayableRender(file, { run })) { cache?.delete(file); return false; }
  if (!cache) { cache = new Map(); playable.set(run, cache); }
  cache.set(file, key);
  return true;
}

export function finalRender(dir, slug = basename(dir), { run = spawnSync } = {}) {
  return [`${slug}.mp4`, `${slug}-blur.mp4`]
    .map((name) => ({ name, file: join(dir, 'renders', name) }))
    .filter(({ file }) => readyFile(file) && cachedPlayable(file, run))
    .sort((a, b) => statSync(b.file).mtimeMs - statSync(a.file).mtimeMs)[0]?.name ?? null;
}

// Approval records are excluded, while all creative sections retain their meaning and hash.
export function normalizeCreativePlan(text) {
  let result = false;
  let fence = null;
  return String(text).replace(/\r\n/g, '\n').split('\n').filter((line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    const inFence = Boolean(fence);
    if (marker && !fence) fence = marker[1];
    else if (marker && marker[1][0] === fence?.[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    if (!marker && !inFence && /^#{1,2}\s+/.test(line)) result = /^##\s+Gate\s+[12]\s+Result\s*#*\s*$/.test(line);
    return !result;
  }).map((line) => line.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function designFiles(dir, run) {
  const evidence = inspectStoryboardEvidence(dir, { run });
  if (!evidence.ready) throw new GateError(evidence.code, evidence.message);
  return [...sheetsOf(dir), 'storyboard.md', 'visual-plan.md', 'overlay-timeline.json', EVIDENCE_FILE,
    ...evidence.frames.map((frame) => frame.path), ...DESIGN_PATHS.filter((path) => existsSync(join(dir, path)))];
}

// Design gates approve actual scene evidence and creative dependencies (RD-03-106).
export function gateFiles(dir, gate, slug = basename(dir), format = readFormat(dir), { run } = {}) {
  if (isMusicFormat(format)) {
    if (gate === 1) return ['script.md', 'processed-audio.wav', ...designFiles(dir, run)];
    if (gate === 2) return [`renders/${finalRender(dir, slug, { run }) ?? `${slug}.mp4`}`];
    throw new GateError('bad-gate', `a ${format} project has Gate 1 and Gate 2 (got ${gate})`);
  }
  if (gate === 1) return ['script.md', 'processed-audio.wav'];
  if (gate === 2) return designFiles(dir, run);
  if (gate === 3) return [`renders/${finalRender(dir, slug, { run }) ?? `${slug}.mp4`}`];
  throw new GateError('bad-gate', `gate must be 1, 2, or 3 (got ${gate})`);
}

export function fingerprint(dir, gate, slug = basename(dir), format = readFormat(dir), { run } = {}) {
  if (gate === finalGate(format) && !finalRender(dir, slug, { run })) throw new GateError('missing-file', 'a playable final video is required before this gate');
  const files = gateFiles(dir, gate, slug, format, { run });
  if (gate !== finalGate(format) && (isMusicFormat(format) || gate === 2) && !sheetsOf(dir).length) {
    throw new GateError('missing-file', `${dir}/preview/storyboard-sheet.jpg is required before this gate`);
  }
  for (const file of files) {
    if (!readyFile(join(dir, file))) throw new GateError('missing-file', `${join(dir, file)} must be a nonempty regular file before this gate`);
  }
  return Object.fromEntries(files.map((f) => [f, f === 'visual-plan.md' ? createHash('sha256').update(normalizeCreativePlan(readFileSync(join(dir, f), 'utf8'))).digest('hex') : sha(join(dir, f))]));
}

export function readGates(dir) {
  const file = join(dir, GATES_FILE);
  if (!existsSync(file)) return { version: 1, log: [] };
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new GateError('bad-file', `${file} is not valid JSON; fix or remove it`);
  }
  if (data?.version !== 1 || !Array.isArray(data.log)) throw new GateError('bad-file', `${file} is not a version 1 gates file`);
  return data;
}

function sameFingerprint(a, b) {
  const ka = Object.keys(a || {}).sort();
  const kb = Object.keys(b || {}).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

export function gateStatus(dir, { slug = basename(dir), run } = {}) {
  const { log } = readGates(dir);
  const generate = isGenerate(dir);
  let format = 'explainer';
  if (generate) {
    try {
      format = readFormat(dir);
    } catch (e) {
      throw new GateError('bad-file', e.message);
    }
  }
  const base = { mode: generate ? 'generate' : 'edit', format, finalGate: finalGate(format), log };
  const running = (phase) => ({ ...base, phase, gate: null, state: null, voiceStale: false, fingerprint: null, last: log.at(-1) || null });
  if (base.mode !== 'generate') return running(null);
  const has = (f) => readyFile(join(dir, f));
  const storyboardReady = () => has('storyboard.md') && has('visual-plan.md') &&
    DESIGN_PATHS.every((path) => !existsSync(join(dir, path)) || has(path)) && inspectStoryboardEvidence(dir, { run }).ready;
  // null when the gate is approved for the files on disk now; otherwise the waiting status
  const at = (gate) => {
    const fp = fingerprint(dir, gate, slug, format, { run });
    const mine = log.filter((e) => e.gate === gate && e.decision !== 'edit' && sameFingerprint(e.fingerprint, fp));
    const last = mine.at(-1);
    if (last?.decision === 'approve') return null;
    const state = !last ? 'waiting' : last.decision === 'revise' ? 'revising' : 'qa';
    const voiceStale = format === 'explainer' && gate === 1 && statSync(join(dir, 'script.md')).mtimeMs > statSync(join(dir, 'processed-audio.wav')).mtimeMs;
    return { ...base, phase: 'gate', gate, state, voiceStale, fingerprint: fp, last: log.filter((e) => e.gate === gate).at(-1) || null };
  };
  if (!has('script.md') || !has('processed-audio.wav')) return running('story');
  if (isMusicFormat(format)) {
    // kinetic-post, motion-short: text + music + storyboard are one gate, the render the other (ADR-0027)
    if (!storyboardReady()) return running('screen-plan');
    const g1 = at(1);
    if (g1) return g1;
    if (!finalRender(dir, slug, { run })) return running('build');
    return at(2) || running('done');
  }
  const g1 = at(1);
  if (g1) return g1;
  if (!storyboardReady()) return running('screen-plan');
  const g2 = at(2);
  if (g2) return g2;
  if (!finalRender(dir, slug, { run })) return running('build');
  return at(3) || running('done');
}

export function recordDecision(dir, { gate, decision, note = '', by, fingerprint: shown, now = () => new Date(), run }) {
  if (!isGenerate(dir)) throw new GateError('not-generate', `${dir} is not a generate-mode project (creative-brief.md has no "mode: generate")`);
  if (!DECISIONS.includes(decision)) throw new GateError('bad-decision', `decision must be one of ${DECISIONS.join(', ')}`);
  if (!BY.includes(by)) throw new GateError('bad-decision', 'by must be studio or cli');
  const text = String(note ?? '').trim();
  if (text.length > MAX_NOTE) throw new GateError('bad-note', `note is longer than ${MAX_NOTE} characters`);
  if (decision === 'revise' && !text) throw new GateError('note-required', 'revise needs a note: what should change');
  let format;
  try {
    format = readFormat(dir);
  } catch (e) {
    throw new GateError('bad-file', e.message);
  }
  const last = finalGate(format);
  if (decision === 'qa' && gate !== last) throw new GateError('bad-decision', `qa is a Gate ${last} decision only`);
  if (decision === 'edit' && (gate !== 1 || isMusicFormat(format))) throw new GateError('bad-decision', 'edit is an explainer Gate 1 entry only');
  const status = gateStatus(dir, { run });
  if (status.phase !== 'gate' || status.gate !== gate) {
    const where = status.phase === 'gate' ? `Gate ${status.gate}` : status.phase;
    throw new GateError('not-waiting', `Gate ${gate} is not waiting for a decision (now: ${where})`);
  }
  let fp = null;
  if (decision !== 'edit') {
    if (shown !== undefined && !sameFingerprint(shown, status.fingerprint)) throw new GateError('stale', `Gate ${gate} files changed after they were shown; reload and look again`);
    if (decision === 'approve' && status.voiceStale) throw new GateError('voice-stale', 'script.md is newer than the voiceover; run npm run video -- voice first');
    fp = status.fingerprint;
  }
  const entry = { gate, decision, note: text, at: now().toISOString(), by, fingerprint: fp };
  const data = readGates(dir);
  data.log.push(entry);
  const file = join(dir, GATES_FILE);
  writeFileSync(`${file}.part`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${file}.part`, file);
  return entry;
}

// True when the newest Gate <gate> entry is an "edit": the script changed in Studio since the last decision.
export function editedSinceDecision(log, gate) {
  for (let i = log.length - 1; i >= 0; i--) if (log[i].gate === gate) return log[i].decision === 'edit';
  return false;
}

const PHASE_TEXT = { story: 'Story berjalan', 'screen-plan': 'Screen Plan berjalan', build: 'Build berjalan', done: 'Selesai' };
const STATE_TEXT = { waiting: 'menunggu keputusan', revising: 'agent merevisi (menunggu artefak baru)', qa: 'QA dulu (menunggu keputusan setelah QA)' };

export function formatGateStatus(s, slug) {
  if (s.mode !== 'generate') return `${slug} bukan proyek mode generate (creative-brief.md tanpa "mode: generate")`;
  const head = s.phase === 'gate' ? `Gate ${s.gate}: ${STATE_TEXT[s.state]}` : PHASE_TEXT[s.phase];
  const lines = [isMusicFormat(s.format) ? `[${s.format}] ${head}` : head];
  if (s.voiceStale) lines.push(`naskah lebih baru dari suara: jalankan npm run video -- voice ${slug}`);
  const last = s.log.at(-1);
  if (last) lines.push(`terakhir: Gate ${last.gate} ${last.decision}${last.note ? ` — ${last.note}` : ''} (${last.by}, ${last.at})`);
  return lines.join('\n');
}
