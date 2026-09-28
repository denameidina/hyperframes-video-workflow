// Studio agent sessions: runtime options, command line, and first prompt (ADR-0020).
import { basename, extname } from 'node:path';
import { HttpError } from './http.mjs';

export const RUNTIMES = ['claude', 'codex'];
export const CLAUDE_MODELS = ['opus', 'sonnet', 'fable', 'haiku'];
export const EFFORTS = {
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
  codex: ['low', 'medium', 'high', 'xhigh'],
};
const OPTION_RE = /^[A-Za-z0-9._:[\]-]+$/;
const SKILL = '`docs/skills/dena-video-editing-workflow/SKILL.md`';

export function suggestSlug(fileName) {
  const stem = basename(String(fileName), extname(String(fileName)));
  const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  return slug || 'video';
}

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

export function buildPrompt({ mode, rawFile, slug, notes }) {
  const note = String(notes ?? '').trim() || '-';
  const first = mode === 'continue'
    ? `Lanjutkan proyek \`videos/${slug}/\` (raw \`raw/${rawFile}\`). Baca artefak yang sudah ada, tentukan fase terakhir yang selesai, lalu lanjutkan sesuai ${SKILL}.`
    : `Edit raw video \`raw/${rawFile}\` sebagai proyek \`videos/${slug}/\`. Gunakan style yang sudah ada; serahkan ke agent Story untuk memilih dan memastikan hasil editing videonya bagus.`;
  return `${first}\nCatatan dari Dena: ${note}\nJangan publish ke Repliz — publish dilakukan Dena dari Studio.\n`;
}

export function codexDefaults(text = '') {
  const top = text.split(/^\s*\[/m)[0];
  const pick = (key) => (new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm').exec(top) || [])[1] || '';
  return { model: pick('model'), effort: pick('model_reasoning_effort') };
}
