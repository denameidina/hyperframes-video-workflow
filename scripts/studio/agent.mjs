// Studio agent sessions: runtime options, command line, and first prompt (ADR-0020).
import { HttpError } from './http.mjs';

export const RUNTIMES = ['claude', 'codex'];
export const CLAUDE_ALIASES = [
  { value: 'opus', label: 'Opus' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'fable', label: 'Fable' },
  { value: 'haiku', label: 'Haiku' },
];
export const EFFORTS = {
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
  codex: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
};
const OPTION_RE = /^[A-Za-z0-9._:[\]-]+$/;
const parseJson = (text) => {
  try {
    return JSON.parse(text || '');
  } catch {
    return null;
  }
};
const SKILL = '`docs/skills/dena-video-editing-workflow/SKILL.md`';

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

const GENERATE_DOC = '`docs/agents/references/generate-mode.md`';

export function buildPrompt({ mode, slug, notes, format = 'explainer' }) {
  const note = String(notes ?? '').trim() || '-';
  const first = {
    continue: `Lanjutkan proyek \`videos/${slug}/\` (sumber di \`sources.json\`). Baca artefak yang sudah ada, tentukan fase terakhir yang selesai, lalu lanjutkan sesuai ${SKILL}.`,
    new: `Edit video project \`videos/${slug}/\` dari sumber di \`videos/${slug}/sources.json\` (jalankan \`npm run video -- sources ${slug}\` dulu). Gunakan style yang sudah ada; serahkan ke agent Story untuk memilih dan memastikan hasil editing videonya bagus.`,
    // ADR-0026: Studio types gate answers into this session; they are already in gates.json
    generate: `Buat video mode generate (${format}) di \`videos/${slug}/\`. Brief Dena ada di \`research/brief.md\`; pilihannya di \`research/request.json\` — pilihan yang terisi wajib dipakai (Teks persis kata demi kata), yang kosong kamu tentukan. Ikuti ${SKILL} dan ${GENERATE_DOC}${format === 'explainer' ? '' : ' (bagian Music-driven formats)'}. Berhenti di ${format === 'explainer' ? 'Gate 1 (naskah + suara), Gate 2 (storyboard), dan Gate 3 (render)' : 'Gate 1 (teks + musik + storyboard) dan Gate 2 (render)'}; keputusan Dena datang sebagai pesan "Gate N disetujui dari Studio …" atau "Gate N revisi dari Studio: …" dan sudah tercatat di \`gates.json\`.`,
    'generate-continue': `Lanjutkan proyek mode generate \`videos/${slug}/\`. Jalankan \`npm run video -- gate ${slug}\` untuk posisi dan keputusan terakhir, baca artefak yang sudah ada, lalu lanjutkan sesuai ${SKILL} dan ${GENERATE_DOC}. Keputusan Dena dari Studio sudah tercatat di \`gates.json\`.`,
  }[mode];
  if (!first) throw new Error(`unknown prompt mode ${mode}`);
  return `${first}\nCatatan dari Dena: ${note}\nJangan publish ke Repliz — publish dilakukan Dena dari Studio.\n`;
}

export function codexDefaults(text = '') {
  const top = text.split(/^\s*\[/m)[0];
  const pick = (key) => (new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm').exec(top) || [])[1] || '';
  return { model: pick('model'), effort: pick('model_reasoning_effort') };
}

/* Model choices for the session form (RD-05-16). Claude Code keeps no model list on disk: its aliases,
   plus the extra options it cached in ~/.claude.json (e.g. Fable 1M), plus the settings.json default. */
export function claudeModels({ claudeJson = '', settings = '' } = {}) {
  const models = CLAUDE_ALIASES.map((m) => ({ ...m, efforts: EFFORTS.claude }));
  const add = (value, label) => {
    if (typeof value === 'string' && OPTION_RE.test(value) && !models.some((m) => m.value === value)) models.push({ value, label, efforts: EFFORTS.claude });
  };
  const extra = parseJson(claudeJson)?.additionalModelOptionsCache;
  for (const o of Array.isArray(extra) ? extra : []) add(o?.value, o?.label ? `${o.label} (${o.value})` : o?.value);
  const setting = parseJson(settings)?.model;
  add(setting, setting);
  const fallback = models.some((m) => m.value === setting) ? setting : 'opus';
  return { models, default: fallback, defaultEffort: 'high' };
}

// Codex caches its model catalog in ~/.codex/models_cache.json; only models it lists (visibility "list"), by priority.
export function codexModels({ cache = '', config = '' } = {}) {
  const { model, effort } = codexDefaults(config);
  const all = parseJson(cache)?.models;
  const models = (Array.isArray(all) ? all : [])
    .filter((m) => m?.visibility === 'list' && typeof m.slug === 'string' && OPTION_RE.test(m.slug))
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((m) => {
      const efforts = (m.supported_reasoning_levels || []).map((l) => l?.effort).filter((e) => EFFORTS.codex.includes(e));
      return { value: m.slug, label: m.display_name || m.slug, efforts: efforts.length ? efforts : EFFORTS.codex.slice(0, 4), defaultEffort: m.default_reasoning_level };
    });
  if (model && OPTION_RE.test(model) && !models.some((m) => m.value === model)) models.unshift({ value: model, label: model, efforts: EFFORTS.codex.slice(0, 4) });
  return { models, default: model || models[0]?.value || '', defaultEffort: effort };
}
