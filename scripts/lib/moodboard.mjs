// Per-style moodboards (spec: docs/superpowers/specs/2026-09-28-moodboard-design.md, ADR-0018).
// moodboard.json lists 6 self-made studies per style (committed) and the source of each referenced
// work (for local stills only). The studies are compositions in a host generated like the example
// hosts; `sheets` renders them and tiles one sheet per style; `fetch` downloads the real stills into
// the gitignored local/ folder. Node 22+, built-in modules only (ADR-0007); rendering needs
// `npx hyperframes`, `cwebp`, and `ffmpeg`.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EXAMPLES, hostHtml, PREFIX, snapshots, STYLES } from './style-examples.mjs';

export const MB = 'docs/agents/references/moodboard';
export const LOCAL = `${MB}/local`;
const HYPERFRAMES = 'hyperframes@0.7.24';
const PER_STYLE = 6;

export const readMoodboard = (root) => JSON.parse(readFileSync(join(root, MB, 'moodboard.json'), 'utf8'));

// the studies in host order: styles in STYLES order, s1…s6 inside each
export const ordered = (m) => STYLES.flatMap((st) => m.studies.filter((s) => s.style === st));

export function checkMoodboard(m, docs = {}) {
  const ids = new Set();
  for (const st of STYLES) {
    const list = m.studies.filter((s) => s.style === st);
    if (list.length !== PER_STYLE) throw new Error(`${st}: needs ${PER_STYLE} studies, has ${list.length}`);
  }
  for (const s of m.studies) {
    if (!STYLES.includes(s.style)) throw new Error(`${s.id}: unknown style "${s.style}"`);
    if (!new RegExp(`^${PREFIX[s.style]}-s[1-${PER_STYLE}]$`).test(s.id)) throw new Error(`${s.id}: a ${s.style} study is ${PREFIX[s.style]}-s1 … -s${PER_STYLE}`);
    if (ids.has(s.id)) throw new Error(`${s.id}: listed twice`);
    ids.add(s.id);
    if (!/^R\d+$/.test(s.ref)) throw new Error(`${s.id}: ref must look like R3`);
    if (docs[s.style] && !new RegExp(`^### ${s.ref} — `, 'm').test(docs[s.style])) throw new Error(`${s.id}: ${s.style}.md has no ### ${s.ref}`);
    if (!s.title || !s.steal) throw new Error(`${s.id}: needs a title and a steal line`);
    if (!(s.duration > 0) || !(s.at >= 0 && s.at < s.duration)) throw new Error(`${s.id}: at must be inside the study`);
    if (!m.refs.some((r) => r.style === s.style && r.ref === s.ref)) throw new Error(`${s.id}: no refs entry for ${s.style} ${s.ref}`);
  }
  for (const r of m.refs) if (!/^https:\/\//.test(r.source ?? '')) throw new Error(`${r.style} ${r.ref}: source must be an https URL`);
  return m;
}

// the studies host: the example host generator, renamed, with every study as a cutaway clip
export function studiesHost(m) {
  const ex = { style: 'moodboard', examples: ordered(m).map((s) => ({ clip: s.id, duration: s.duration, treatment: 'cutaway', stills: [s.at] })) };
  const html = hostHtml(ex)
    .replaceAll('style-examples-moodboard', 'moodboard-studies')
    .replace('from examples.json', 'from moodboard.json')
    .replace('npm run style-examples -- build', 'npm run moodboard -- build');
  return {
    [`${MB}/studies/index.html`]: html,
    [`${MB}/studies/snapshots.json`]: JSON.stringify(snapshots(ex)) + '\n',
  };
}
