#!/usr/bin/env node
// Verifies the four-phase workflow migration.
// Spec: docs/superpowers/specs/2026-09-26-four-phase-workflow-design.md
// Usage:
//   node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs \
//     [--check v1,v2,v3] [--old 01,02,03,04,05,06,07] [--base pre-four-phase]
// Node 22+, built-in modules only (ADR-0007).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    check: { type: 'string', default: 'v1,v2,v3' },
    old: { type: 'string', default: '01,02,03,04,05,06,07' },
    base: { type: 'string', default: 'pre-four-phase' },
  },
});

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const exists = (p) => existsSync(join(ROOT, p));
const failures = [];
const fail = (check, msg) => failures.push(`[${check}] ${msg}`);

const A = 'docs/agents/';
const R = 'docs/agents/references/';
const OLD = {
  '01': { file: `${A}01-creative-director.md`, dest: [`${A}01-story.md`, `${R}hook-and-angle.md`] },
  '02': { file: `${A}02-transcript-cut-agent.md`, dest: [`${A}01-story.md`, `${R}hook-and-angle.md`, `${R}cut-and-pacing.md`] },
  '03': { file: `${A}03-caption-subtitle-agent.md`, dest: [`${A}02-screen-plan.md`, `${R}captions.md`, `${R}caption-artifacts.md`] },
  '04': { file: `${A}04-asset-generation-agent.md`, dest: [`${A}02-screen-plan.md`, `${A}03-build.md`, `${R}visual-planning.md`, `${R}asset-production.md`] },
  '05': { file: `${A}05-motion-overlay-agent.md`, dest: [`${A}02-screen-plan.md`, `${R}visual-planning.md`, `${R}motion-grammar.md`, `${R}hyperframes-assembly.md`] },
  '06': { file: `${A}06-hyperframes-assembly-agent.md`, dest: [`${A}03-build.md`, `${R}hyperframes-assembly.md`] },
  '07': { file: `${A}07-qa-review-agent.md`, dest: [`${A}04-qa.md`, `${R}qa-checklist.md`] },
};
const NEW_DOCS = [...new Set(Object.values(OLD).flatMap((o) => o.dest))];

// Old H2 sections rewritten into phase docs, replaced, or dropped (spec: "Pemetaan isi lama → baru").
const NOT_MOVED = new Set([
  'Purpose', 'Position In Workflow', 'When To Use', 'Required Reading', 'Core Principle',
  'Inputs', 'Outputs', 'Handoff', 'Handoff Contract', 'First Downstream Agents',
  'Relationship To Other Agents', 'Relationship To HyperFrames', 'Handoff To User Review Gate',
  'Track Model', 'Asset Plan Template', 'Motion Plan Template',
]);

// Old lines changed on purpose (hook is always locked from the transcript; Asset Requests renamed).
const INTENTIONAL = {
  '01': new Set([
    'The hook strategy starts here, but the final opening audio must be grounded in',
    'the transcript. If a transcript already exists, base the primary and backup',
    'hooks on exact spoken lines and include their source timestamps. If the',
    'transcript does not exist yet, mark the hook as `provisional`, define the',
    'tension Agent 02 should search for, and let Agent 02 lock the verbatim source',
    'excerpt after transcription. Do not invent a spoken claim and hand it off as',
    'though it exists in the footage.',
    'Status: <provisional|locked-from-transcript>',
    'Exact spoken quote, if transcript exists:',
    'Source timestamp, if transcript exists:',
    '## Asset Requests',
    '- The hook is either locked to an exact transcript quote or clearly marked',
    'provisional for Agent 02 to validate after transcription.',
    '- Transcript tension to find:',
    '- Hook status to validate:',
    // V4 walkthrough fixes (Task 10): ownership after the phase split.
    'If the user provides a URL or the story depends on a live tool/product/site, request Agent 04 to research or inspect that link and create local screenshot/screen-record assets when useful. Do not solve URL context with generic cards unless the real capture is unsafe, unavailable, or visually unhelpful.',
  ]),
  // V4 walkthrough fixes (Task 10): retired role names and Build no longer writes the visual plan.
  '03': new Set([
    '- `side-label`: proof labels, usually handoff to overlay agent.',
  ]),
  '04': new Set([
    'If the generated result looks generic or fake after one revision, remove it and document the rejection in `asset-plan.md`.',
    '3. Match every capture to a transcript time window and explain the reason in `asset-plan.md`.',
    '6. If the page is inaccessible, private, or visually unhelpful, document that and use a generated still, simple diagram, or designed card instead.',
    '- Say so in `asset-plan.md`.',
    '- Let Caption/Overlay agents add real text separately.',
  ]),
  '06': new Set([
    'If `caption-beats.json` and `overlay-timeline.json` disagree, do not silently merge them. Write the conflict in `assembly-notes.md` and send it back to the relevant upstream agent.',
    '- if no SFX asset exists for a required cue, route back to Motion/Overlay Agent instead of silently omitting it',
    '- Motion plan:',
  ]),
  '07': new Set([
    '- SFX cues from the motion plan are present and audible enough to register without covering speech',
    'If the user requested final render readiness, render and review the MP4 after checks pass:',
    'npm run render',
  ]),
};

const ROLE = /Screen Plan phase \((?:captions|visual) step\)|Build phase \(asset production step\)|Story phase|Screen Plan phase|Build phase|QA phase|Transcript\/Cut Agent|Caption\/Subtitle Agent|Caption Agent|Asset Generation Agent|Motion\/Overlay Agent|HyperFrames Assembly Agent|QA\/Review Agent|QA Agent|Creative Director|Agent 0[1-7]/g;
const norm = (line) => line.trim()
  .replace(ROLE, '<ROLE>')
  .replace(/asset-plan\.md|motion-plan\.md|visual-plan\.md/g, '<PLAN>')
  .replace(/Imagegen Decision Log|Visual Decision Log/g, '<LOG>');

function h2Sections(text) {
  const sections = [];
  let fence = false;
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) fence = !fence;
    const m = !fence && /^## (.+)$/.exec(line);
    if (m) { cur = { title: m[1].trim(), lines: [] }; sections.push(cur); }
    if (cur) cur.lines.push(line);
  }
  return sections;
}

function v1() {
  for (const id of args.old.split(',')) {
    const spec = OLD[id];
    if (!spec) { fail('v1', `unknown old id ${id}`); continue; }
    if (exists(spec.file)) fail('v1', `${id}: old file still present: ${spec.file}`);
    const missing = spec.dest.filter((p) => !exists(p));
    if (missing.length) { fail('v1', `${id}: destination missing: ${missing.join(', ')}`); continue; }
    const have = new Set(spec.dest.flatMap((p) => read(p).split('\n')).map(norm).filter(Boolean));
    for (const sec of h2Sections(git('show', `${args.base}:${spec.file}`))) {
      if (NOT_MOVED.has(sec.title)) continue;
      for (const line of sec.lines) {
        const n = norm(line);
        if (!n || have.has(n)) continue;
        if (INTENTIONAL[id]?.has(line.trim())) { console.log(`[v1] ${id} intentional change (review): ${line.trim()}`); continue; }
        fail('v1', `${id} § ${sec.title}: missing line: ${line.trim()}`);
      }
    }
  }
}

const SCOPE = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'docs/', 'internal/docs/', '.claude/hooks/', '.codex/hooks/'];
const ARCHIVE = [
  'docs/superpowers/',
  'docs/asset-generation-imagegen-fix-spec.md',
  'docs/blueprints/',
  'internal/docs/adr/0005-seven-agent-workflow-discipline.md',
  'internal/docs/adr/0008-four-phase-workflow.md',
];
const scoped = () => git('ls-files', '-co', '--exclude-standard').split('\n').filter((p) =>
  p && /\.(md|py|mjs|yaml)$/.test(p) && SCOPE.some((s) => p === s || p.startsWith(s))
  && !ARCHIVE.some((a) => p.startsWith(a)) && exists(p));

const STALE = [
  /Agent 0[1-7]\b/,
  /\b0[1-7]-(creative-director|transcript-cut-agent|caption-subtitle-agent|asset-generation-agent|motion-overlay-agent|hyperframes-assembly-agent|qa-review-agent)\b/,
  /seven-agent|7[- ]agent/i,
  /agents?\s+01\s*(\.\.|-)\s*0[67]/i,
  /01\.\.07/,
  /asset-plan\.md|motion-plan\.md/,
  /Imagegen Decision Log/,
  /agent-chain\.md/,
  /Transcript\/Cut Agent|Caption\/Subtitle Agent|Asset Generation Agent|Motion\/Overlay Agent|HyperFrames Assembly Agent|QA\/Review Agent/,
  /^\s*0[1-7] (creative director|transcript cut|caption\/subtitle|asset generation|motion\/overlay|HyperFrames assembly|QA review)\s*$/i,
];

function v2() {
  for (const p of scoped()) {
    read(p).split('\n').forEach((line, i) => {
      const l = line.replaceAll('0005-seven-agent-workflow-discipline', '');
      if (STALE.some((re) => re.test(l))) fail('v2', `${p}:${i + 1}: ${line.trim()}`);
    });
  }
  for (const p of NEW_DOCS.filter((d) => !d.startsWith(R) && exists(d))) {
    if (/^## Required Reading\s*$/m.test(read(p))) fail('v2', `${p}: phase docs must not have "## Required Reading"`);
  }
}

function v3() {
  for (const p of NEW_DOCS) if (!exists(p)) fail('v3', `missing new doc: ${p}`);
  const chain = 'docs/skills/dena-video-editing-workflow/references/';
  if (!exists(`${chain}phase-chain.md`)) fail('v3', `missing ${chain}phase-chain.md`);
  if (exists(`${chain}agent-chain.md`)) fail('v3', `stale ${chain}agent-chain.md still present`);
  if (!read('internal/docs/README.md').includes('adr/0008-four-phase-workflow.md')) fail('v3', 'ADR-0008 not registered in internal/docs/README.md');
  const touched = new Set([
    ...git('diff', '--name-only', args.base).split('\n'),
    ...git('ls-files', '-o', '--exclude-standard').split('\n'),
  ]);
  for (const p of scoped().filter((f) => f.endsWith('.md') && touched.has(f))) {
    const text = read(p);
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1].split('#')[0];
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      if (!exists(join(dirname(p), target))) fail('v3', `${p}: broken link ${m[1]}`);
    }
    for (const m of text.matchAll(/`((?:docs|internal\/docs)\/[^`\s<>*]+\.md)`/g)) {
      if (!exists(m[1])) fail('v3', `${p}: missing path \`${m[1]}\``);
    }
  }
}

const checks = new Set(args.check.split(','));
if (checks.has('v1')) v1();
if (checks.has('v2')) v2();
if (checks.has('v3')) v3();
if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\nFAIL: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`PASS: ${[...checks].join(', ')}`);
