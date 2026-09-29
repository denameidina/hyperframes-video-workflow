// Generate-mode gate state (ADR-0026, RD-03-88..91): a project's position comes from its artifacts plus the
// append-only decision log videos/<slug>/gates.json. This module is the only writer of gates.json; Studio and
// `npm run video -- gate` both go through it. Node 22+ built-ins (ADR-0007).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export const GATES_FILE = 'gates.json';
export const DECISIONS = ['approve', 'revise', 'qa', 'edit'];
const BY = ['studio', 'cli'];
const SHEET_RE = /^storyboard-sheet(-\d+)?\.jpg$/;
const MAX_NOTE = 2000;

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
  const key = `${st.size}:${st.mtimeMs}:${st.ino}`;
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

// The files a gate approves (RD-03-89). visual-plan.md is left out on purpose: the agent writes
// "## Gate 2 Result" into it after the approval, which would reopen Gate 2.
export function gateFiles(dir, gate, slug = basename(dir)) {
  if (gate === 1) return ['script.md', 'processed-audio.wav'];
  if (gate === 2) return [...sheetsOf(dir), 'storyboard.md'];
  if (gate === 3) return [`renders/${slug}.mp4`];
  throw new GateError('bad-gate', `gate must be 1, 2, or 3 (got ${gate})`);
}

export function fingerprint(dir, gate, slug = basename(dir)) {
  return Object.fromEntries(gateFiles(dir, gate, slug).filter((f) => existsSync(join(dir, f))).map((f) => [f, sha(join(dir, f))]));
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

export function gateStatus(dir, { slug = basename(dir) } = {}) {
  const { log } = readGates(dir);
  const base = { mode: isGenerate(dir) ? 'generate' : 'edit', log };
  const running = (phase) => ({ ...base, phase, gate: null, state: null, voiceStale: false, fingerprint: null, last: log.at(-1) || null });
  if (base.mode !== 'generate') return running(null);
  const has = (f) => existsSync(join(dir, f));
  // null when the gate is approved for the files on disk now; otherwise the waiting status
  const at = (gate) => {
    const fp = fingerprint(dir, gate, slug);
    const mine = log.filter((e) => e.gate === gate && e.decision !== 'edit' && sameFingerprint(e.fingerprint, fp));
    const last = mine.at(-1);
    if (last?.decision === 'approve') return null;
    const state = !last ? 'waiting' : last.decision === 'revise' ? 'revising' : 'qa';
    const voiceStale = gate === 1 && statSync(join(dir, 'script.md')).mtimeMs > statSync(join(dir, 'processed-audio.wav')).mtimeMs;
    return { ...base, phase: 'gate', gate, state, voiceStale, fingerprint: fp, last: log.filter((e) => e.gate === gate).at(-1) || null };
  };
  if (!has('script.md') || !has('processed-audio.wav')) return running('story');
  const g1 = at(1);
  if (g1) return g1;
  if (!sheetsOf(dir).length) return running('screen-plan');
  const g2 = at(2);
  if (g2) return g2;
  if (!has(`renders/${slug}.mp4`)) return running('build');
  return at(3) || running('done');
}

export function recordDecision(dir, { gate, decision, note = '', by, fingerprint: shown, now = () => new Date() }) {
  if (!isGenerate(dir)) throw new GateError('not-generate', `${dir} is not a generate-mode project (creative-brief.md has no "mode: generate")`);
  if (!DECISIONS.includes(decision)) throw new GateError('bad-decision', `decision must be one of ${DECISIONS.join(', ')}`);
  if (!BY.includes(by)) throw new GateError('bad-decision', 'by must be studio or cli');
  const text = String(note ?? '').trim();
  if (text.length > MAX_NOTE) throw new GateError('bad-note', `note is longer than ${MAX_NOTE} characters`);
  if (decision === 'revise' && !text) throw new GateError('note-required', 'revise needs a note: what should change');
  if (decision === 'qa' && gate !== 3) throw new GateError('bad-decision', 'qa is a Gate 3 decision only');
  if (decision === 'edit' && gate !== 1) throw new GateError('bad-decision', 'edit is a Gate 1 entry only');
  const status = gateStatus(dir);
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
  const lines = [s.phase === 'gate' ? `Gate ${s.gate}: ${STATE_TEXT[s.state]}` : PHASE_TEXT[s.phase]];
  if (s.voiceStale) lines.push(`naskah lebih baru dari suara: jalankan npm run video -- voice ${slug}`);
  const last = s.log.at(-1);
  if (last) lines.push(`terakhir: Gate ${last.gate} ${last.decision}${last.note ? ` — ${last.note}` : ''} (${last.by}, ${last.at})`);
  return lines.join('\n');
}
