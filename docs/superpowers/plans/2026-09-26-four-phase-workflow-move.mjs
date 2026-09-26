#!/usr/bin/env node
// Append an exact line range of an old agent doc (read from the base tag) to a new file,
// applying the four-phase rename table.
// Spec: docs/superpowers/specs/2026-09-26-four-phase-workflow-design.md
// Usage:
//   node docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs \
//     --old 02 --from 117 --to 220 --expect "## Media Audit" \
//     --dest docs/agents/references/cut-and-pacing.md [--agent04 plan|build] [--base pre-four-phase]
// Node 22+, built-in modules only (ADR-0007).
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const OLD_FILES = {
  '01': 'docs/agents/01-creative-director.md',
  '02': 'docs/agents/02-transcript-cut-agent.md',
  '03': 'docs/agents/03-caption-subtitle-agent.md',
  '04': 'docs/agents/04-asset-generation-agent.md',
  '05': 'docs/agents/05-motion-overlay-agent.md',
  '06': 'docs/agents/06-hyperframes-assembly-agent.md',
  '07': 'docs/agents/07-qa-review-agent.md',
};

const { values: a } = parseArgs({
  options: {
    old: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' },
    expect: { type: 'string' }, dest: { type: 'string' },
    agent04: { type: 'string', default: 'plan' },
    base: { type: 'string', default: 'pre-four-phase' },
  },
});
for (const k of ['old', 'from', 'to', 'expect', 'dest']) {
  if (!a[k]) throw new Error(`--${k} is required`);
}
if (!OLD_FILES[a.old]) throw new Error(`unknown --old ${a.old}`);
if (!['plan', 'build'].includes(a.agent04)) throw new Error('--agent04 must be plan or build');

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const text = execFileSync('git', ['show', `${a.base}:${OLD_FILES[a.old]}`], { cwd: root, encoding: 'utf8' });
const from = Number(a.from);
const to = Number(a.to);
const slice = text.split('\n').slice(from - 1, to);
if ((slice[0] ?? '').trim() !== a.expect.trim()) {
  throw new Error(`line ${from} of ${a.old} is "${slice[0]}", expected "${a.expect}"`);
}

const agent04 = a.agent04 === 'build' ? 'Build phase (asset production step)' : 'Screen Plan phase (visual step)';
const RENAMES = [
  [/Transcript\/Cut Agent/g, 'Story phase'],
  [/Caption\/Subtitle Agent|Caption Agent/g, 'Screen Plan phase (captions step)'],
  [/Asset Generation Agent/g, agent04],
  [/Motion\/Overlay Agent/g, 'Screen Plan phase (visual step)'],
  [/HyperFrames Assembly Agent/g, 'Build phase'],
  [/QA\/Review Agent|QA Agent/g, 'QA phase'],
  [/Creative Director/g, 'Story phase'],
  [/Agent 0[12]\b/g, 'Story phase'],
  [/Agent 03\b/g, 'Screen Plan phase (captions step)'],
  [/Agent 04\b/g, agent04],
  [/Agent 05\b/g, 'Screen Plan phase (visual step)'],
  [/Agent 06\b/g, 'Build phase'],
  [/Agent 07\b/g, 'QA phase'],
  [/asset-plan\.md|motion-plan\.md/g, 'visual-plan.md'],
  [/Imagegen Decision Log/g, 'Visual Decision Log'],
];
const out = slice.map((line) => RENAMES.reduce((s, [re, rep]) => s.replace(re, rep), line));
while (out.length && out[out.length - 1].trim() === '') out.pop();

const dest = join(root, a.dest);
const current = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
const sep = current === '' || current.endsWith('\n\n') ? '' : current.endsWith('\n') ? '\n' : '\n\n';
appendFileSync(dest, `${sep}${out.join('\n')}\n\n`);
console.log(`moved ${a.old}:${from}-${to} -> ${a.dest} (${out.length} lines)`);
