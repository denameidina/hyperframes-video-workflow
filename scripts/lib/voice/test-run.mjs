// Blind listening test (ADR-0023, RD-06-14..17): screen stock-voice pools by WER on the hook, render every candidate
// through the same adapter, shuffle with a seed into A, B, ..., and reveal the ranking from Dena's ratings.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLexicon } from './normalize.mjs';
import { getPreset, loadVoices, resolveVoiceId } from './presets.mjs';
import { renderVoice, writeJson } from './render.mjs';
import { scriptBody, splitParagraphs } from './script.mjs';

export const TEST_CONFIG = join('config', 'voice-test.json');
export const TESTS_DIR = join('shared', 'voice-tests');
export const RUN_RE = /^\d{8}-\d{4}$/;
export const CRITERIA = ['natural', 'pronunciation', 'register', 'similarity', 'endurance'];
export const CORE = ['natural', 'pronunciation', 'register', 'endurance']; // the score; similarity is reported apart
export const NOTE_MAX = 1000;
// USD per minute of audio on the paid tier, valid through 2026-12-31 (ai.google.dev/gemini-api/docs/pricing).
export const COST_PER_MIN = { 'gemini-3.8-flash-tts': 0.0135, 'gemini-3.8-flash-lite-tts': 0.009 };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, seed) {
  const rnd = mulberry32(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pad = (n) => String(n).padStart(2, '0');
export const runId = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
export const labelOf = (i) => String.fromCharCode(65 + i);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

export function loadTestConfig(root = '.') {
  const file = join(root, TEST_CONFIG);
  const c = readJson(file);
  if (c?.version !== 1 || typeof c.script !== 'string' || !Array.isArray(c.presets) || !Array.isArray(c.screens)) throw new Error(`${file} is not a version 1 listening-test config`);
  return c;
}

export async function buildRun({ root = '.', env, fetchImpl, run = spawnSync, seed = Math.floor(Math.random() * 2 ** 31), now = new Date(), render = renderVoice, log = () => {} }) {
  const config = loadTestConfig(root);
  const voices = loadVoices(root);
  const lexicon = loadLexicon(root);
  const presets = config.presets.map((name) => getPreset(voices, name));
  // Preflight: every named preset must resolve before the first paid call.
  const missing = [];
  for (const p of presets) {
    try {
      if (p.provider === 'gemini') resolveVoiceId(p, root);
      if (p.provider === 'recorded') missing.push(`preset ${p.name} is a recording; the listening test only takes TTS presets`);
    } catch (e) {
      missing.push(e.message);
    }
  }
  if (missing.length) throw new Error(`listening test cannot start:\n- ${missing.join('\n- ')}`);
  const text = scriptBody(readFileSync(join(root, config.script), 'utf8'));
  const hook = splitParagraphs(text)[0];
  if (!hook) throw new Error(`${config.script} has no text`);
  const id = runId(now);
  const dir = join(root, TESTS_DIR, id);
  if (existsSync(dir)) throw new Error(`${dir} already exists; run again in a minute`);
  mkdirSync(join(dir, 'samples'), { recursive: true });
  writeFileSync(join(dir, 'script.md'), text);
  const candidates = presets.map((p) => ({ name: p.name, preset: p }));
  const screen = {};
  for (const s of config.screens) {
    screen[s.id] = [];
    for (const voice of s.voices) {
      const preset = { ...s.base, voice, name: `${s.id}:${voice}` };
      try {
        const meta = await render({ text: hook, preset, out: join(dir, 'screen', s.id, voice), root, lexicon, env, fetchImpl, run });
        screen[s.id].push({ voice, wer: meta.alignment.wer });
        log(`screen ${s.id}:${voice} WER ${meta.alignment.wer}`);
      } catch (e) {
        screen[s.id].push({ voice, wer: null, error: e.message });
        log(`screen ${s.id}:${voice} failed: ${e.message}`);
      }
    }
    const best = screen[s.id].filter((x) => x.wer !== null).sort((a, b) => a.wer - b.wer || a.voice.localeCompare(b.voice)).slice(0, s.keep);
    for (const b of best) candidates.push({ name: `${s.id}:${b.voice}`, preset: { ...s.base, voice: b.voice, name: `${s.id}:${b.voice}` } });
  }
  writeJson(join(dir, 'screen.json'), screen);
  if (candidates.length > 26) throw new Error('at most 26 candidates (labels A-Z)');
  const labels = {};
  for (const [i, c] of shuffle(candidates, seed).entries()) {
    const label = labelOf(i);
    const out = join(dir, 'work', label);
    const meta = await render({ text, preset: c.preset, out, root, lexicon, env, fetchImpl, run });
    copyFileSync(join(out, 'voiceover.wav'), join(dir, 'samples', `${label}.wav`));
    labels[label] = { name: c.name, provider: meta.provider, model: meta.model, voice: meta.voice, duration: meta.duration, wer: meta.alignment?.wer ?? null };
    log(`sample ${label} ready`);
  }
  const ref = join(root, config.ref || join('shared', 'voices', 'dena', 'ref.wav'));
  const hasRef = existsSync(ref);
  if (hasRef) copyFileSync(ref, join(dir, 'ref.wav'));
  writeJson(join(dir, 'key.json'), { version: 1, run: id, seed, createdAt: now.toISOString(), labels });
  return { id, dir, labels: Object.keys(labels), hasRef };
}

export function validateRatings(body, labels) {
  const input = body?.ratings;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('ratings must be an object keyed by sample label');
  const out = {};
  for (const [label, r] of Object.entries(input)) {
    if (!labels.includes(label)) throw new Error(`unknown sample ${label}`);
    if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error(`${label}: a rating must be an object`);
    const row = {};
    for (const c of CRITERIA) {
      const v = r[c] ?? null;
      if (v !== null && !(Number.isInteger(v) && v >= 1 && v <= 5)) throw new Error(`${label}.${c} must be 1-5 or empty`);
      row[c] = v;
    }
    const note = r.note ?? '';
    if (typeof note !== 'string' || note.length > NOTE_MAX) throw new Error(`${label}.note must be text of at most ${NOTE_MAX} characters`);
    row.note = note;
    out[label] = row;
  }
  return out;
}

export function saveRatings(dir, labels, body, now = new Date()) {
  const data = { version: 1, savedAt: now.toISOString(), ratings: validateRatings(body, labels) };
  writeJson(join(dir, 'ratings.json'), data);
  return data;
}

const mean = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
};

export function revealRun({ root = '.', id }) {
  if (!RUN_RE.test(String(id))) throw new Error('reveal needs a run id like 20260929-1430 (see shared/voice-tests/)');
  const dir = join(root, TESTS_DIR, id);
  const key = readJson(join(dir, 'key.json'));
  const file = join(dir, 'ratings.json');
  if (!existsSync(file)) throw new Error(`${file} not found; rate the samples in Studio (tab Suara) first`);
  const { ratings } = readJson(file);
  const rows = Object.entries(key.labels)
    .map(([label, k]) => {
      const r = ratings[label] || {};
      const cost = k.provider === 'gemini' ? (COST_PER_MIN[k.model] ?? null) : 0;
      return { label, ...k, score: mean(CORE.map((c) => r[c])), ...Object.fromEntries(CRITERIA.map((c) => [c, r[c] ?? null])), note: r.note || '', costPerMin: cost };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.label.localeCompare(b.label));
  writeFileSync(join(dir, 'reveal.md'), formatReveal(key, rows));
  return rows;
}

const cell = (x) => (x === null || x === undefined || x === '' ? '–' : String(x));

export function formatReveal(key, rows) {
  const head = [
    `# Uji dengar ${key.run} — hasil`,
    '',
    'Skor = rata-rata natural, ucapan, gaya, betah (1–5). Mirip = kemiripan dengan suara asli Dena, dilaporkan terpisah.',
    '',
    '| # | Label | Kandidat | Provider | Model | Skor | Natural | Ucapan | Gaya | Betah | Mirip | WER | Durasi (s) | USD/menit |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const body = rows.map((r, i) => `| ${i + 1} | ${r.label} | ${r.name} | ${r.provider} | ${cell(r.model)} | ${cell(r.score)} | ${cell(r.natural)} | ${cell(r.pronunciation)} | ${cell(r.register)} | ${cell(r.endurance)} | ${cell(r.similarity)} | ${cell(r.wer)} | ${cell(r.duration)} | ${cell(r.costPerMin)} |`);
  const notes = rows.filter((r) => r.note).map((r) => `- **${r.label}** (${r.name}): ${r.note}`);
  return [...head, ...body, ...(notes.length ? ['', '## Catatan', '', ...notes] : []), ''].join('\n');
}
