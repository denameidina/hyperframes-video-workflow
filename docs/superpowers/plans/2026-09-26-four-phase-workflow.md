# Four-Phase Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 7-agent Dena video workflow docs with 4 phase documents (Story, Screen Plan, Build, optional QA) plus domain references, gates, and synced governance docs, without losing any Dena rule.

**Architecture:** Docs-only migration. A verify script (V1 content coverage, V2 stale terms, V3 links) is written first and fails; each task then moves old sections verbatim (via a line-range move script with a heading guard and a fixed rename table) into `docs/agents/references/*.md`, writes a short phase doc, deletes the old agent doc, and re-runs V1 for that slice. Entry doors and `internal/docs/` are synced last; a fresh-context subagent walkthrough (V4) closes it.

**Tech Stack:** Markdown docs; Node 22+ built-in modules for the two helper scripts; git; Python 3 for the existing hook self-tests.

**Spec:** `docs/superpowers/specs/2026-09-26-four-phase-workflow-design.md`

## Global Constraints

- Docs-only. Do not modify `.html`, `scripts/`, `package.json`, or `compositions/`. `npm run check` is not required (CLAUDE.md: docs-only edits skip it).
- Helper scripts live in `docs/superpowers/plans/`, use Node 22+ built-in modules only (ADR-0007), and are not wired into `package.json`.
- Base ref for old content is the local git tag `pre-four-phase` (created in Task 0). All moves read old docs from that tag, never from the working tree.
- Moved text is verbatim except (a) the rename table applied by the move script and (b) the intentional edits listed in Task 3 Step 6. Heading levels never change.
- Rename table (applied by the move script): `Creative Director`, `Transcript/Cut Agent`, `Agent 01`, `Agent 02` → `Story phase`; `Caption/Subtitle Agent`, `Caption Agent`, `Agent 03` → `Screen Plan phase (captions step)`; `Motion/Overlay Agent`, `Agent 05` → `Screen Plan phase (visual step)`; `Asset Generation Agent`, `Agent 04` → `Screen Plan phase (visual step)` (default) or `Build phase (asset production step)` (`--agent04 build`); `HyperFrames Assembly Agent`, `Agent 06` → `Build phase`; `QA/Review Agent`, `QA Agent`, `Agent 07` → `QA phase`; `asset-plan.md`, `motion-plan.md` → `visual-plan.md`; `Imagegen Decision Log` → `Visual Decision Log`.
- Language: `docs/agents/**` stays English; `internal/docs/**` stays Indonesian.
- Artifact paths: `videos/<slug>/visual-plan.md` (replaces `asset-plan.md` + `motion-plan.md`); `videos/<slug>/assets/asset-manifest.json` (Build output).
- `creative-brief.md` gains `visual_density: light | medium | heavy` (default `medium`) and `gate_cut: on | off` (default `off`). Hook status is always `locked-from-transcript`.
- Gates: Gate 1 cut review (optional, default off); Gate 2 visual plan (stops only on triggers R1–R6); Gate 3 final review (mandatory, default path approve → publish gate); publish gate unchanged (ADR-0003). QA is optional and runs as a fresh-context subagent.
- Archive files — never edit: `docs/superpowers/plans/*` (except the two new helper scripts and this plan), `docs/superpowers/specs/*`, `docs/asset-generation-imagegen-fix-spec.md`. Exception: `docs/blueprints/dena-video-editing-project-reverse-engineering-blueprint.md` gets one note line at the top (Task 9).
- Docs-first: governance (ADR-0008, rd-03 EARS, README registry) lands in Task 2, before phase docs. Commits in Tasks 3–7 touch `docs/agents/` only; their commit bodies cite ADR-0008 + rd-03 from Task 2.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- In inline "old → new" replacement specs, `\`` means a literal backtick in the file, and ` / ` separates consecutive lines. Preserve each line's existing indentation.
- Reference split rule (spec "Risiko"): any reference over 600 lines is split at an H2 boundary. This plan pre-splits captions (→ `captions.md` + `caption-artifacts.md`) and visual rules (→ `visual-planning.md` + `motion-grammar.md`), so there are 9 reference files instead of the spec's 7.

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs` | Create | V1/V2/V3 checks |
| `docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs` | Create | Append an old line range to a new file with renames |
| `docs/agents/01-story.md` | Create | Phase 1 contract |
| `docs/agents/02-screen-plan.md` | Create | Phase 2 contract + Gate 2 |
| `docs/agents/03-build.md` | Create | Phase 3 contract + Gate 3 |
| `docs/agents/04-qa.md` | Create | Optional QA contract + subagent prompt |
| `docs/agents/references/hook-and-angle.md` | Create | Direction + hook rules (old 01 + hook parts of 02) |
| `docs/agents/references/cut-and-pacing.md` | Create | Audit, transcription, cut, speed, audio (old 02) |
| `docs/agents/references/captions.md` | Create | On-screen caption rules (old 03) |
| `docs/agents/references/caption-artifacts.md` | Create | Caption data/plan/publish formats (old 03) |
| `docs/agents/references/visual-planning.md` | Create | Visual choice rules + Visual Plan Template (old 04) |
| `docs/agents/references/motion-grammar.md` | Create | Motion rules + overlay timeline format (old 05) |
| `docs/agents/references/asset-production.md` | Create | Capture/generate rules + manifest (old 04) |
| `docs/agents/references/hyperframes-assembly.md` | Create | Assembly procedure/contract (old 06 + 05 compat) |
| `docs/agents/references/qa-checklist.md` | Create | QA verdicts/axes/formats (old 07) |
| `docs/agents/01..07-*.md` (7 old files) | Delete | Replaced |
| `docs/skills/dena-video-editing-workflow/references/agent-chain.md` | Delete → `phase-chain.md` | Chain + routing |
| `docs/skills/dena-video-editing-workflow/SKILL.md`, `references/quality-gates.md` | Modify | Router + gates |
| `AGENTS.md`, `CLAUDE.md`, `README.md` | Modify | Entry doors |
| `internal/docs/adr/0008-four-phase-workflow.md` | Create | Decision |
| `internal/docs/adr/0005-*.md`, `requirements/rd-03-*.md`, `README.md`, `operations/video-editing-workflow.md` + 14 more internal docs | Modify | Governance sync |
| `docs/dena-social-video-style-guide.md`, `docs/ai-agent-initial-setup.md`, `docs/repliz/integration-spec.md`, blueprint, 2 hooks | Modify | Stale refs |

---

### Task 0: Freeze the base (controller only — needs the user)

The working tree holds 23 pre-existing uncommitted files, including `docs/agents/01..03`, `AGENTS.md`, `CLAUDE.md`. Line ranges in this plan are taken from that working tree, so it must be committed unchanged before any move.

**Files:** none created.

**Interfaces:**
- Produces: local git tag `pre-four-phase` pointing at the commit that contains the current working-tree versions of all 7 old agent docs.

- [ ] **Step 1: Confirm branch and dirty files**

Run: `git branch --show-current && git status --short | wc -l`
Expected: `docs/four-phase-workflow` and `23`.

- [ ] **Step 2: Ask the user**

Ask: "Boleh saya commit 23 file yang belum di-commit itu apa adanya sebagai satu commit `chore: commit in-progress docs before four-phase restructure`?" Do not continue without an explicit yes. If the user prefers to commit themselves, wait until `git status --short` is empty.

- [ ] **Step 3: Commit and tag**

```bash
git add -A
git commit -q -F - <<'EOF'
chore: commit in-progress docs before four-phase restructure

Pre-existing working-tree changes, committed unchanged so the four-phase
migration can move content from a fixed base.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git tag pre-four-phase
git status --short | wc -l
```
Expected: `0`.

- [ ] **Step 4: Guard the line map**

Run: `git show pre-four-phase:docs/agents/02-transcript-cut-agent.md | sed -n '117p;221p;349p'`
Expected, exactly:
```
## Media Audit
## Three-Second Transcript Hook
## Hook Extraction
```
If any line differs, stop: the line ranges in Tasks 3–7 are stale and must be recomputed with `grep -n '^## ' docs/agents/0*.md` before continuing.

---

### Task 1: Verification and move scripts (failing test first)

**Files:**
- Create: `docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs`
- Create: `docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs`

**Interfaces:**
- Produces: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs [--check v1,v2,v3] [--old 01,..,07] [--base pre-four-phase]` → exit 0 + `PASS: ...`, or exit 1 + `[vN] ...` lines + `FAIL: N problem(s)`.
- Produces: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs --old <01..07> --from <n> --to <n> --expect "<exact first line>" --dest <path> [--agent04 plan|build]` → appends the renamed range to `<dest>` (creates it if missing) and prints `moved ...`.

- [ ] **Step 1: Write the verify script**

````js
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
````

- [ ] **Step 2: Write the move script**

````js
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
````

- [ ] **Step 3: Run verify to confirm it fails**

Run: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs; echo "exit=$?"`
Expected: lines such as `[v1] 01: old file still present: docs/agents/01-creative-director.md`, `[v1] 01: destination missing: docs/agents/01-story.md, ...`, `[v2] AGENTS.md:NN: ...`, `[v3] missing new doc: ...`, then `FAIL: N problem(s)` and `exit=1`.

- [ ] **Step 4: Check the move guard rejects a wrong heading**

Run: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs --old 02 --from 117 --to 118 --expect "## Wrong" --dest /dev/null 2>&1 | tail -1`
Expected: `Error: line 117 of 02 is "## Media Audit", expected "## Wrong"`.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs docs/superpowers/plans/2026-09-26-four-phase-workflow.md
git commit -q -F - <<'EOF'
docs: add four-phase migration plan and verify/move helpers

Verify covers content coverage (V1), stale terms (V2), and links (V3);
it fails until the migration lands.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Governance first — ADR-0008, ADR-0005, rd-03 EARS, index registry

**Files:**
- Create: `internal/docs/adr/0008-four-phase-workflow.md`
- Modify: `internal/docs/adr/0005-seven-agent-workflow-discipline.md:2`
- Rewrite: `internal/docs/requirements/rd-03-video-editing-workflow.md`
- Modify: `internal/docs/README.md`

**Interfaces:**
- Produces: ADR path `internal/docs/adr/0008-four-phase-workflow.md`; EARS IDs `RD-03-01..RD-03-30` used by later docs; README registry entry for ADR-0008.

- [ ] **Step 1: Create ADR-0008**

```markdown
# ADR-0008 Workflow 4 Fase dengan Gate
Status: accepted
Date: 2026-09-26

## Context

ADR-0005 membagi produksi video Dena menjadi 7 agent. Router tidak men-dispatch
subagent; ketujuh agent adalah peran bergiliran dalam satu sesi, jadi biayanya
adalah dokumen wajib baca + titik serah-terima. Batasnya tidak mengikuti titik
keputusan nyata:

1. Hook diputuskan dua kali: Agent 01 menandai hook `provisional` sebelum
   transkrip ada, lalu Agent 02 menguncinya ulang.
2. Momen visual dipilih dua kali: Agent 04 mencari timestamp window dan
   placement, Agent 05 memutuskan lagi apa muncul kapan dan di mana; aset dibuat
   sebelum placement diketahui.
3. Produksi aset (04) dan assembly (06) sama-sama authoring.
4. Hanya ada satu gate user, setelah render final.
5. Agent 06 wajib membaca kelima dokumen agent hulu sebelum bekerja.

## Decision

- Produksi dibagi 4 fase di `docs/agents/`:
  1. `01-story.md` (dari 01 + 02): transkripsi dulu, hook dikunci dari
     transkrip, cut, `processed.mp4`.
  2. `02-screen-plan.md` (dari 03 + perencanaan 04 + 05): caption, lalu satu
     `visual-plan.md` yang menggantikan `asset-plan.md` + `motion-plan.md`.
  3. `03-build.md` (dari produksi 04 + 06): aset, HyperFrames, render.
  4. `04-qa.md` (dari 07): opsional, dijalankan sebagai subagent konteks baru.
- Gate: Gate 1 (review cut) opsional, default off (`gate_cut`); Gate 2
  kondisional pada pemicu R1–R6 di `visual-plan.md`; Gate 3 (review render)
  wajib dengan jalur default approve → gate publish; gate publish tetap ADR-0003.
- Aturan domain dipindah verbatim ke `docs/agents/references/*.md` dan dibaca
  hanya pada langkah yang menyebutnya. Fase hilir membaca artifact hulu, bukan
  dokumen fase hulu.

## Rationale

- Agent dipisah hanya di titik nyata: user harus memutuskan (gate), butuh
  independensi (QA), atau langkah berikut butuh input terkunci.
- Setiap keputusan dibuat sekali, di fase yang punya inputnya.
- User bisa melihat arah lebih awal tanpa interupsi wajib: Gate 1 opsional,
  Gate 2 hanya berhenti saat ada risiko.
- QA sebagai subagent tidak membawa alasan sesi pembuat.

## Consequences

- ADR-0005 superseded. File agent lama dihapus; isinya ada di riwayat git
  sebelum commit ADR ini dan dipindah ke `docs/agents/references/`.
- `asset-manifest.json` kini mencatat file yang benar-benar dibuat (output
  Build), bukan rencana.
- `creative-brief.md` punya `visual_density` dan `gate_cut`; status hook
  `provisional` dihapus.
- Struktur ini belum teruji di video nyata; video pertama sesudahnya dicatat di
  [operations/roadmap](../operations/roadmap.md).

## Sources

- Spec: `docs/superpowers/specs/2026-09-26-four-phase-workflow-design.md`
- `docs/agents/01-story.md`, `docs/agents/02-screen-plan.md`,
  `docs/agents/03-build.md`, `docs/agents/04-qa.md`, `docs/agents/references/`
- [requirements/rd-03-video-editing-workflow](../requirements/rd-03-video-editing-workflow.md)
- [operations/video-editing-workflow](../operations/video-editing-workflow.md)
```

- [ ] **Step 2: Supersede ADR-0005**

In `internal/docs/adr/0005-seven-agent-workflow-discipline.md` replace the line `Status: accepted (reverse-engineered)` with:
```
Status: superseded by [ADR-0008](0008-four-phase-workflow.md)
```

- [ ] **Step 3: Rewrite rd-03**

Replace the whole content of `internal/docs/requirements/rd-03-video-editing-workflow.md` with:

```markdown
# RD-03 Video Editing Workflow
Status: accepted
Date: 2026-09-26

Domain: disiplin workflow 4 fase untuk video sosial Dena. Owner: `docs/agents/*`,
`docs/skills/dena-video-editing-workflow/SKILL.md`. Keputusan:
[ADR-0008](../adr/0008-four-phase-workflow.md). Detail operasional:
[operations/video-editing-workflow](../operations/video-editing-workflow.md).

## Urutan & routing

- **RD-03-01** (Event-driven) — When sebuah task video Dena dimulai, the system
  shall membaca `docs/skills/dena-video-editing-workflow/SKILL.md` sebagai router
  lalu dokumen fase yang relevan di `docs/agents/`.
- **RD-03-02** (Ubiquitous) — The system shall menjalankan fase berurutan
  Story → Screen Plan → Build sebelum review user, kecuali user meminta
  perbaikan teknis sempit.
- **RD-03-03** (Unwanted) — If fase Build hendak dimulai sebelum
  `creative-brief.md`, `edit-decision-notes.md`, `caption-beats.json`, dan
  `visual-plan.md` dengan bagian `Gate 2 Result` ada, then the system shall
  menolak dan kembali ke fase hulu yang kurang.
- **RD-03-04** (Ubiquitous) — Setiap fase hilir shall membaca artifact fase hulu
  di `videos/<slug>/`, bukan dokumen fase hulu.

## Gate

- **RD-03-05** (Event-driven) — When video raw baru diberikan, fase Story shall
  mentranskripsi sumber sebelum memilih hook.
- **RD-03-06** (State-driven) — While `gate_cut` bernilai `off` dan user tidak
  meminta review cut, fase Story shall menulis blok `## Cut Summary` di
  `edit-decision-notes.md` (kutipan hook `00:00.00-00:03.00`, durasi awal →
  akhir, bagian yang dibuang + alasan) lalu lanjut ke Screen Plan.
- **RD-03-07** (Optional) — Where `gate_cut` bernilai `on` atau user meminta
  review cut, fase Story shall berhenti dan menunjukkan `processed.mp4` beserta
  Cut Summary sebelum Screen Plan dimulai.
- **RD-03-08** (Unwanted) — If baris Timeline `visual-plan.md` cocok dengan
  pemicu R1–R6 (`docs/agents/02-screen-plan.md`), then fase Screen Plan shall
  berhenti dan menampilkan hanya baris yang ditandai, beserta pemicu dan satu
  alternatif aman per baris, sebelum Build.
- **RD-03-09** (Event-driven) — When tidak ada baris Timeline yang cocok dengan
  R1–R6, fase Screen Plan shall menulis `Gate 2: no triggers` di bagian
  `Gate 2 Result` lalu lanjut ke Build.
- **RD-03-10** (Event-driven) — When render final siap, fase Build shall berhenti
  untuk review user dan menawarkan approve, QA dulu, atau revisi.
- **RD-03-11** (Event-driven) — When user meng-approve render final tanpa memilih
  QA, the system shall lanjut ke gate publish tanpa mensyaratkan `qa-report.md`
  atau `final-approval.md`.
- **RD-03-12** (Optional) — Where user memilih QA, fase QA shall berjalan di
  subagent yang hanya menerima path slug, path render,
  `docs/agents/04-qa.md`, dan `docs/agents/references/qa-checklist.md`.

## Handoff artifacts

- **RD-03-13** (Ubiquitous) — The system shall menghasilkan artifact milik tiap
  fase di `videos/<slug>/` bila slug ada: Story (`creative-brief.md`,
  `metadata.json`, `transcript.json`, `edit-decision-notes.md`, `cut-list.json`,
  `processed.mp4`), Screen Plan (`caption-plan.md`, `caption-beats.json`,
  `publish-captions.md`, `visual-plan.md`, `overlay-timeline.json`), Build
  (`assets/asset-manifest.json` bila ada aset, `assembly-notes.md`,
  `assembly-checklist.md`).
- **RD-03-14** (Unwanted) — If artifact hulu hilang, then the system shall
  membuatnya lewat fase hulu yang benar atau menulis catatan blocker; tidak boleh
  mengarang keputusan yang hilang.

## Aturan konten (non-negotiable)

- **RD-03-15** (Ubiquitous) — The system shall memberi cakupan caption penuh:
  setiap kata terucap yang lolos cut punya beat caption (talking-head/storytelling).
- **RD-03-16** (State-driven) — While memproses video Dena default, the system
  shall memakai kecepatan `1.2x`; If kecepatan diturunkan, then the system shall
  mendokumentasikan alasan eksak di `edit-decision-notes.md`.
- **RD-03-17** (Ubiquitous) — The system shall membuat CTA non-promissory secara
  default; the system shall tidak menyiratkan janji "kirim/bahas/share source
  nanti" kecuali user memintanya eksplisit.
- **RD-03-18** (Event-driven) — When user memberi URL atau transkrip menyebut
  tool/produk/situs, fase Screen Plan shall meneliti/inspeksi dan merencanakan
  capture yang ditautkan ke jendela transkrip, dan fase Build shall menangkap
  screenshot/rekaman lokal yang direncanakan.
- **RD-03-19** (Ubiquitous) — Fase Screen Plan shall menulis `Visual Decision Log`
  di `visual-plan.md` untuk setiap peluang visual-support sebelum menyimpulkan
  generated media tidak perlu.
- **RD-03-20** (Unwanted) — If aset generated tampak generik/palsu/lepas dari
  workflow (AI slop), then the system shall menolaknya setelah maksimal satu
  revisi dan mendokumentasikan penolakan.
- **RD-03-21** (Ubiquitous) — The system shall menyertakan cue SFX yang audible
  namun tidak menutup speech; SFX hilang atau terlalu pelan adalah temuan review.

## Batas tanggung jawab

- **RD-03-22** (Ubiquitous) — The system shall menjaga tiap fase dalam batasnya:
  Screen Plan memutuskan visual dan timing; Build mengimplementasikannya di
  HyperFrames.
- **RD-03-23** (Ubiquitous) — Temuan review user atau QA shall dirutekan ke fase
  pemilik (Story, Screen Plan, atau Build), bukan menjadi "polish" kabur.

## Hook transkrip tiga detik

- **RD-03-24** (Event-driven) — When transkrip lengkap tersedia, fase Story shall
  memilih tepat satu potongan ucapan verbatim yang memuat intisari, puncak
  masalah, kontradiksi, atau curiosity gap sebagai hook utama.
- **RD-03-25** (Event-driven) — When hook utama dipindahkan ke awal, fase Story
  shall menempatkan awal potongan pada output `00:00.00`, mengakhirinya paling
  lambat `00:03.00` pada processed timeline, lalu melanjutkan ke penjelasan.
- **RD-03-26** (Unwanted) — If pemendekan hook diperlukan, then fase Story shall
  hanya membuang jeda atau filler tanpa mengubah makna; fase Story shall tidak
  menyambung kata terpisah untuk membuat klaim yang tidak pernah diucapkan.
- **RD-03-27** (Ubiquitous) — Fase Story shall mencatat timestamp sumber, kutipan
  verbatim, timing output, alasan pemilihan, transisi ke penjelasan, dan
  penanganan duplikasi hook di `edit-decision-notes.md` serta `cut-list.json`.
- **RD-03-28** (Event-driven) — When potongan sumber dipindahkan menjadi hook,
  fase Story shall menghapus kemunculan aslinya dari alur berikutnya kecuali
  pengulangan adalah callback yang diminta brief dan didokumentasikan.
- **RD-03-29** (Event-driven) — When fase Screen Plan membuat caption hook, fase
  Screen Plan shall memakai kata ucapan yang sama, mencakup setiap kata pada
  hook, dan menayangkannya dalam hook card yang dapat dipahami tanpa audio
  selama jendela `00:00.00`–`00:03.00`.
- **RD-03-30** (Unwanted) — If tidak ada potongan ucapan yang muat dalam tiga
  detik tanpa mengubah makna, then fase Story shall menandai blocker dan meminta
  keputusan user, bukan mengarang atau memanipulasi ucapan.

## Referensi

- Operasional detail: [operations/video-editing-workflow](../operations/video-editing-workflow.md)
- Keputusan: [ADR-0008](../adr/0008-four-phase-workflow.md) (menggantikan
  [ADR-0005](../adr/0005-seven-agent-workflow-discipline.md))
- Sistem visual: [design-system/visual-system](../design-system/visual-system.md)
```

- [ ] **Step 4: Register in the index**

Edit `internal/docs/README.md`:
1. Line `17. [requirements/rd-03-video-editing-workflow.md](...) - EARS disiplin workflow 7-agent + non-negotiable konten.` → replace the description with `- EARS workflow 4 fase + gate + non-negotiable konten.`
2. Line `27. [adr/0005-...](...) - Produksi dibagi 7 peran agent berbasis dokumen.` → description `- (Superseded oleh 0008) Produksi dibagi 7 peran agent berbasis dokumen.`
   Note: this line keeps the words "7 peran agent" on purpose; V2's `7[- ]agent` pattern does not match "7 peran agent".
3. After the line for `adr/0007-...` insert:
   `30. [adr/0008-four-phase-workflow.md](adr/0008-four-phase-workflow.md) - Produksi 4 fase (Story, Screen Plan, Build, QA opsional) dengan gate.`
   and renumber every following Reading Order item by +1 (Design System 30→31, 31→32; Operations 32..37 → 33..38; Security 38, 39 → 39, 40).
4. In the renumbered Operations item for `operations/video-editing-workflow.md`, replace `Operasional 7-agent + ikhtisar per agent.` with `Operasional 4 fase + gate + ikhtisar per fase.`
5. Canonical Files table: `| Keputusan arsitektur | [adr/](adr/) (0001–0007) |` → `(0001–0008)`; `| Workflow 7-agent (operasional) |` → `| Workflow 4 fase (operasional) |`.
6. Replace the blockquote
   ```
   > Detail workflow video per-tahap tetap hidup di `docs/agents/01..07-*.md` dan
   > `docs/dena-social-video-style-guide.md` (di luar `internal/docs/`); doc
   > operasional di sini merangkum & merujuknya, dan menjadi index kanoniknya.
   ```
   with
   ```
   > Detail workflow video per fase hidup di `docs/agents/` (dokumen fase
   > `01-story.md` … `04-qa.md` + `docs/agents/references/`) dan
   > `docs/dena-social-video-style-guide.md` (di luar `internal/docs/`); doc
   > operasional di sini merangkum & merujuknya, dan menjadi index kanoniknya.
   ```
7. Glossary: replace `- **agent 01..07** — peran workflow (creative → cut → caption → aset → motion → assembly → QA).` with `- **fase (phase)** — tahap workflow: Story → Screen Plan → Build → QA opsional (ADR-0008).`; replace `- **handoff artifact** — file output milik satu agent di \`videos/<slug>/\`.` with `- **handoff artifact** — file output milik satu fase di \`videos/<slug>/\`.`; replace `- **Imagegen Decision Log** — log wajib Agent 04 untuk tiap peluang visual-support.` with `- **Visual Decision Log** — log wajib fase Screen Plan di \`visual-plan.md\` untuk tiap peluang visual-support.`; append after it `- **Gate 1 / Gate 2 / Gate 3** — review cut (opsional), rencana visual (kondisional R1–R6), review render (wajib).`

- [ ] **Step 5: Verify links for touched governance docs**

Run: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v3 2>&1 | grep -E 'adr/0008|rd-03|internal/docs/README' ; echo done`
Expected: only lines about `docs/agents/0N-*.md` paths that do not exist yet (they arrive in Tasks 3–7); no `broken link` for `adr/0008-four-phase-workflow.md` and no `ADR-0008 not registered`.

- [ ] **Step 6: Commit**

```bash
git add internal/docs/adr/0008-four-phase-workflow.md internal/docs/adr/0005-seven-agent-workflow-discipline.md internal/docs/requirements/rd-03-video-editing-workflow.md internal/docs/README.md
git commit -q -F - <<'EOF'
docs: add ADR-0008 four-phase workflow and rewrite rd-03 EARS

Supersedes ADR-0005. Gates, artifact contract, and QA-as-subagent are
specified before the phase docs land.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Story phase (old 01 + 02)

**Files:**
- Create: `docs/agents/references/hook-and-angle.md`, `docs/agents/references/cut-and-pacing.md`, `docs/agents/01-story.md`
- Delete: `docs/agents/01-creative-director.md`, `docs/agents/02-transcript-cut-agent.md`

**Interfaces:**
- Consumes: move/verify scripts (Task 1).
- Produces: section names later docs cite — in `hook-and-angle.md`: `## Decision Workflow`, `## Three-Second Transcript Hook`, `## Hook Extraction`, `## Output Template` (brief template with `## Workflow Settings`); in `cut-and-pacing.md`: `## Media Audit`, `## Transcription Workflow`, `## Content Map`, `## Cut Categories` … `## Speed Rules`, `## Edit Decision List`, `## Processed Base Video`, `## Audio Cleanup Handoff`, `## Output Template`. `01-story.md` defines `## Cut Summary` and `## Gate 1 - Cut Review (optional)`.

- [ ] **Step 1: Run V1 for 01,02 to see it fail**

Run: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v1 --old 01,02; echo "exit=$?"`
Expected: `destination missing` for both, `old file still present` for both, `exit=1`.

- [ ] **Step 2: Create reference headers**

`docs/agents/references/hook-and-angle.md`:
```markdown
# Hook And Angle (Reference)

Rules for choosing the angle, the three-second transcript hook, and writing
`creative-brief.md`. Loaded by `docs/agents/01-story.md` at the step that names
it. Workflow order lives in the phase documents, not here.

```

`docs/agents/references/cut-and-pacing.md`:
```markdown
# Cut And Pacing (Reference)

Rules for media audit, transcription, cuts, speed, audio cleanup, and
`edit-decision-notes.md`. Loaded by `docs/agents/01-story.md` at the step that
names it. Workflow order lives in the phase documents, not here.

```

- [ ] **Step 3: Move sections into hook-and-angle.md**

```bash
M=docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs
D=docs/agents/references/hook-and-angle.md
node $M --old 01 --from 99  --to 290 --expect "## Decision Workflow" --dest $D
node $M --old 02 --from 221 --to 252 --expect "## Three-Second Transcript Hook" --dest $D
node $M --old 02 --from 349 --to 395 --expect "## Hook Extraction" --dest $D
node $M --old 01 --from 291 --to 408 --expect "## Output Template" --dest $D
node $M --old 01 --from 409 --to 483 --expect "## Quality Bar" --dest $D
node $M --old 01 --from 496 --to 519 --expect "## Failure Modes" --dest $D
```
Expected: six `moved ...` lines, no `Error`.

- [ ] **Step 4: Move sections into cut-and-pacing.md**

```bash
M=docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs
D=docs/agents/references/cut-and-pacing.md
node $M --old 02 --from 117 --to 220 --expect "## Media Audit" --dest $D
node $M --old 02 --from 253 --to 348 --expect "## Cut Categories" --dest $D
node $M --old 02 --from 396 --to 584 --expect "## Edit Decision List" --dest $D
node $M --old 02 --from 615 --to 689 --expect "## Quality Bar" --dest $D
```
Expected: four `moved ...` lines.

- [ ] **Step 5: Apply the intentional hook edits in hook-and-angle.md**

Use Edit with these exact replacements (text shown after the move script's renames):

(a) old:
```
The hook strategy starts here, but the final opening audio must be grounded in
the transcript. If a transcript already exists, base the primary and backup
hooks on exact spoken lines and include their source timestamps. If the
transcript does not exist yet, mark the hook as `provisional`, define the
tension Story phase should search for, and let Story phase lock the verbatim source
excerpt after transcription. Do not invent a spoken claim and hand it off as
though it exists in the footage.
```
new:
```
The hook strategy starts here, and the final opening audio must be grounded in
the transcript. The Story phase transcribes the source before this step, so
base the primary and backup hooks on exact spoken lines and include their
source timestamps. Do not invent a spoken claim and hand it off as though it
exists in the footage.
```

(b) `Status: <provisional|locked-from-transcript>` → `Status: locked-from-transcript`

(c) `Exact spoken quote, if transcript exists:` → `Exact spoken quote:`

(d) `Source timestamp, if transcript exists:` → `Source timestamp:`

(e) `## Asset Requests` → `## Visual Direction Notes`

(f) old:
```
- The hook is either locked to an exact transcript quote or clearly marked
  provisional for Story phase to validate after transcription.
```
new:
```
- The hook is locked to an exact transcript quote with its source timestamp.
```

(g) old:
```
## Handoff

For Story phase:

- Transcript tension to find:
- Hook status to validate:
- Required opening: verbatim source excerpt at 00:00.00-00:03.00, followed by
  the explanation flow.

For Screen Plan phase (captions step):
```
new:
```
## Handoff

For Screen Plan phase (captions step):

- Required opening: verbatim source excerpt at 00:00.00-00:03.00, followed by
  the explanation flow.
```

(h) Workflow settings — old:
```
- Why this format:

## Visual Direction

- Visual grammar:
```
new:
```
- Why this format:

## Workflow Settings

- visual_density: <light|medium|heavy> (default medium)
- gate_cut: <on|off> (default off)

## Visual Direction

- Visual grammar:
```

Then run: `grep -n -i "provisional" docs/agents/references/hook-and-angle.md; echo "count=$?"`
Expected: no output, `count=1`.

- [ ] **Step 6: Write the phase doc**

Create `docs/agents/01-story.md`:

````markdown
# Phase 1 - Story

## Purpose

The Story phase decides what the video should become and produces the base cut
that every later phase builds on.

It inspects the source, transcribes it, chooses the angle, locks a verbatim
three-second hook from the transcript, removes dead air and redundant speech,
applies the default `1.2x` speed, and writes `processed.mp4` with a cut plan that
later phases can trust.

This phase does not design captions, plan or produce visuals, author HyperFrames
compositions, or render the final video.

## When To Use

Use this phase when:

- Dena provides a new raw video in `raw/` or `videos/<slug>/`.
- Dena provides a reference video in `references/` and asks to adapt the style.
- A previous edit feels weak and needs a stronger angle or hook.
- The request is broad, such as "make this viral", "edit like this reference",
  "buat lebih cinematic", or "bikin orang stop scrolling".
- A rough cut needs silence, filler, and repeated words removed, or pacing/speed
  changed.
- Later phases need accurate timing, transcript, and processed base footage.

Do not use this phase for:

- Caption styling or caption typo fixes (Screen Plan).
- Visual, overlay, or motion work (Screen Plan, Build).
- Render/lint/debug tasks (Build).
- Sources with no speech that are purely montage/B-roll, unless the user asks
  for a structural cut.

## Core Principles

### Direction

Dena's strongest social videos should feel like:

> A credible AI systems builder showing real founder/operator insight in a way that is direct, human, and scroll-stopping.

Protect this identity. Do not turn Dena into a generic motivational creator,
generic CapCut account, or copycat of a reference.

Reference styles are ingredients, not costumes.

### Cut

Cut for meaning first, rhythm second, speed third.

The goal is not to remove every breath. The goal is to make Dena sound sharp,
natural, and credible.

A good cut preserves:

- Dena's real voice
- The strongest insight
- Natural emotion
- Sentence meaning
- Proof moments
- Context needed for the hook and CTA

A bad cut creates:

- Robotic pacing
- Missing context
- Jump cuts that feel anxious
- Captions that no longer match speech
- A video that is shorter but less persuasive

## Inputs

- Raw video: `raw/<file>.mp4` or a file in `videos/<slug>/`
- Reference video: `references/<file>.mp4`, if any
- Existing `transcript.json`, `edit-decision-notes.md`, `cut-list.json`, or
  `processed.mp4` for the same slug
- User goal, such as "edit like Kumar", "make this more viral", "more
  cinematic", "cut silent/redundant words", "add hook, overlay, CTA"
- Target platform: Instagram Reels, TikTok, YouTube Shorts
- Optional constraints: target duration, speed multiplier, preserve a specific
  quote or moment, cut a specific section, keep original audio feel, no
  AI-generated faces, must include a specific CTA, draft only

## Steps

1. **Read context.** `docs/dena-social-video-style-guide.md`, the user request,
   reference notes, and existing artifacts for the slug. If a reference video
   exists, inspect it as evidence; do not infer from memory when a local file is
   available.
2. **Audit and transcribe.** Read `docs/agents/references/cut-and-pacing.md`
   sections Media Audit, Transcription Workflow, and Content Map. Write
   `metadata.json` and `transcript.json`.
3. **Direct.** Read `docs/agents/references/hook-and-angle.md` section Decision
   Workflow (and Kumar-Inspired Adaptation Rules when a reference calls for it).
   Choose content lane, premise, audience, emotional promise, retention spine,
   format, visual grammar, visual direction notes, and CTA from the transcript.
4. **Lock the hook.** Read `docs/agents/references/hook-and-angle.md` sections
   Three-Second Transcript Hook and Hook Extraction. Rank at least three hook
   candidates and lock one verbatim excerpt for processed output
   `00:00.00-00:03.00`. If no intact phrase fits, stop and ask the user; never
   fabricate or splice speech.
5. **Write the brief.** Use the Output Template in
   `docs/agents/references/hook-and-angle.md` to write `creative-brief.md`,
   including Workflow Settings `visual_density` and `gate_cut`. Check it against
   Quality Bar and Dena-Specific Guardrails in the same reference.
6. **Cut.** Read `docs/agents/references/cut-and-pacing.md` sections Cut
   Categories through Speed Rules and Edit Decision List. Write `cut-list.json`.
7. **Build the base video.** Sections Processed Base Video and Audio Cleanup
   Handoff. Write `processed.mp4` (and `audio-clean.wav` when audio is cleaned
   separately). Verify orientation with a frame grab before a long encode (DJI
   rotation note in the style guide).
8. **Write notes.** Use the Output Template in
   `docs/agents/references/cut-and-pacing.md` for `edit-decision-notes.md`, and
   end it with the Cut Summary below.
9. **Gate 1.** Apply Gate 1 below.

## Outputs

All in `videos/<slug>/`:

- `creative-brief.md` (hook `locked-from-transcript`, `visual_density`, `gate_cut`)
- `metadata.json`
- `transcript.json`
- `edit-decision-notes.md` (ends with `## Cut Summary`)
- `cut-list.json`
- `processed.mp4`
- Conditional: `audio-clean.wav`, `preview/contact-sheet.jpg` or
  `preview/processed-sheet.jpg`

Leave enough information for another session to reproduce or revise the cut.

## Cut Summary

Append to `edit-decision-notes.md`:

```md
## Cut Summary

- Hook (output 00:00.00-00:03.00): "<exact spoken quote>" (source <mm:ss.s-mm:ss.s>)
- Duration: <raw mm:ss> -> <processed mm:ss> at <speed>x
- Removed:
  - <source range>: <what was removed> - <why>
```

## Gate 1 - Cut Review (optional)

- Default: off.
- On only when the user asks ("cek cut dulu") or `creative-brief.md` sets
  `gate_cut: on`.
- When on: stop, show `processed.mp4` and the Cut Summary, and wait for the
  user's approval before Screen Plan starts.
- When off: write the Cut Summary and continue to
  `docs/agents/02-screen-plan.md`.

## Handoff

Hand off decisions, not tasks alone.

Bad handoff:

> Add cool overlays and make captions better.

Good handoff:

> Use `cinematic-operator` grammar. Keep captions sparse during the manifesto line. Add dashboard proof overlay only when Dena mentions workflow automation. Do not add random AI robot imagery. CTA should invite a comment without promising a future breakdown.

`edit-decision-notes.md` must give timing precise enough for caption and
visual work:

- final processed video path
- exact output duration
- transcript path
- processed-timeline word-level transcript or raw-to-processed timing map
- cut-list path
- three hook candidate timestamps
- locked three-second hook quote, source timing, output timing, transition, and
  original-occurrence handling
- key quote timestamps
- sections where captions need extra care
- sections where visuals should support meaning
- sections where ASR is uncertain

Bad handoff:

> I cut the boring parts. Captions can start now.

Good handoff:

> `processed.mp4` is 54.2s at 1.18x. The locked verbatim hook is source
> `00:42.1-00:44.7`, now output `00:00.0-00:02.6`; its original occurrence is
> removed and the explanation resumes at output `00:02.6`. ASR may confuse
> `Claude` with `cloud` at output `00:18.2`.

## Fix Routing

This phase owns: weak hook, wrong format, wrong CTA direction, rambling cut,
missing context, rough jump cut, bad base audio edit, wrong speed, or an
undocumented slower speed.

A change here invalidates Screen Plan outputs for the affected time ranges:
realign `caption-beats.json`, `visual-plan.md`, and `overlay-timeline.json` from
the new processed transcript before Build runs again.
````

- [ ] **Step 7: Delete the old docs and run V1**

```bash
git rm -q docs/agents/01-creative-director.md docs/agents/02-transcript-cut-agent.md
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v1 --old 01,02; echo "exit=$?"
```
Expected: 15 `[v1] 01 intentional change (review): ...` lines, then `PASS: v1`, `exit=0`. If any `missing line` appears, copy that line back verbatim into the reference file at its section (a move range was wrong); do not edit the verify script.

- [ ] **Step 8: Commit**

```bash
git add docs/agents/01-story.md docs/agents/references/hook-and-angle.md docs/agents/references/cut-and-pacing.md
git commit -q -F - <<'EOF'
docs: add Story phase from creative director + transcript/cut agents

Hook is locked from the transcript (no provisional status); brief gains
visual_density and gate_cut. Governance: ADR-0008, rd-03 (previous commit).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Caption references (old 03)

**Files:**
- Create: `docs/agents/references/captions.md`, `docs/agents/references/caption-artifacts.md`
- Delete: `docs/agents/03-caption-subtitle-agent.md`

**Interfaces:**
- Produces: `captions.md` sections `## Caption Timing Lock`, `## Caption Types` … `## ASR Correction Rules`, `## Hook Caption Rules`, `## CTA Caption Rules`, `## Quality Bar`, `## Failure Modes`, `## Dena-Specific Guardrails`; `caption-artifacts.md` sections `## Caption Data Format`, `## Caption Plan Template`, `## Platform Publish Caption Rules`, `## QA Checklist`. Task 5 cites these names.

- [ ] **Step 1: Create headers**

`docs/agents/references/captions.md`:
```markdown
# Captions (Reference)

Rules for on-screen captions, hook text, and CTA text. Loaded by
`docs/agents/02-screen-plan.md` in the captions step. Workflow order lives in the
phase documents, not here.

```

`docs/agents/references/caption-artifacts.md`:
```markdown
# Caption Artifacts (Reference)

Formats for `caption-beats.json`, `caption-plan.md`, and `publish-captions.md`,
plus the caption self-check. Loaded by `docs/agents/02-screen-plan.md` in the
captions step.

```

- [ ] **Step 2: Move sections**

```bash
M=docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs
C=docs/agents/references/captions.md
F=docs/agents/references/caption-artifacts.md
node $M --old 03 --from 58  --to 66  --expect "## Caption Timing Lock" --dest $C
node $M --old 03 --from 120 --to 415 --expect "## Caption Types" --dest $C
node $M --old 03 --from 559 --to 621 --expect "## Hook Caption Rules" --dest $C
node $M --old 03 --from 698 --to 767 --expect "## Quality Bar" --dest $C
node $M --old 03 --from 416 --to 558 --expect "## Caption Data Format" --dest $F
node $M --old 03 --from 622 --to 660 --expect "## Platform Publish Caption Rules" --dest $F
node $M --old 03 --from 680 --to 697 --expect "## QA Checklist" --dest $F
```
Expected: seven `moved ...` lines.

- [ ] **Step 3: Delete old doc and run V1 (expected partial fail)**

```bash
git rm -q docs/agents/03-caption-subtitle-agent.md
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v1 --old 03; echo "exit=$?"
```
Expected: exactly one failure, `[v1] 03: destination missing: docs/agents/02-screen-plan.md`, `exit=1`. The phase doc arrives in Task 5; Task 5 re-runs V1 for 03.

- [ ] **Step 4: Commit**

```bash
git add docs/agents/references/captions.md docs/agents/references/caption-artifacts.md
git commit -q -F - <<'EOF'
docs: move caption agent rules into caption references

Screen Plan phase doc follows in the next commit. Governance: ADR-0008, rd-03.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Screen Plan phase (captions + old 04 planning + old 05)

**Files:**
- Create: `docs/agents/references/visual-planning.md`, `docs/agents/references/motion-grammar.md`, `docs/agents/references/asset-production.md`, `docs/agents/02-screen-plan.md`
- Delete: `docs/agents/04-asset-generation-agent.md`, `docs/agents/05-motion-overlay-agent.md`

**Interfaces:**
- Consumes: caption references (Task 4).
- Produces: `visual-planning.md` with `## Visual Plan Template` (sections `## Inputs`, `## Strategy`, `## Visual Decision Log`, `## Timeline`, `## Asset Briefs For Build`, `## Conflicts And Resolutions`, `## Gate 2 Result`, `## Handoff`); `motion-grammar.md` with `## Overlay Timeline Format` and `## Visual Density Mapping`; `asset-production.md` with `## Asset Production Steps`, `## Asset Manifest Format`, `## Capture And Privacy Record`; `02-screen-plan.md` with `## Gate 2 - Visual Plan Review (conditional)` and triggers `R1`–`R6`. Task 6 cites `asset-production.md` and `## Gate 2 Result`.

- [ ] **Step 1: Create headers**

`docs/agents/references/visual-planning.md`:
```markdown
# Visual Planning (Reference)

Rules for deciding which moments get visuals, what type, and why, plus the
`visual-plan.md` template. Loaded by `docs/agents/02-screen-plan.md` in the
visual step. Workflow order lives in the phase documents, not here.

```

`docs/agents/references/motion-grammar.md`:
```markdown
# Motion Grammar (Reference)

Rules for motion, pattern interrupts, placement, density, SFX cues, and the
`overlay-timeline.json` format. Loaded by `docs/agents/02-screen-plan.md` in the
visual step.

```

`docs/agents/references/asset-production.md`:
```markdown
# Asset Production (Reference)

Rules for capturing and generating the assets that `visual-plan.md` asks for,
and for recording them in `assets/asset-manifest.json`. Loaded by
`docs/agents/03-build.md` in the asset production step.

## Asset Production Steps

```

- [ ] **Step 2: Move sections**

```bash
M=docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs
V=docs/agents/references/visual-planning.md
G=docs/agents/references/motion-grammar.md
P=docs/agents/references/asset-production.md
node $M --old 04 --from 148 --to 362 --expect "## Asset Categories" --dest $V
node $M --old 04 --from 410 --to 456 --expect "## Dena-Specific Asset Rules" --dest $V
node $M --old 04 --from 773 --to 843 --expect "## Dena-Specific Examples" --dest $V
node $M --old 05 --from 118 --to 139 --expect "## Motion Layer Responsibilities" --dest $G
node $M --old 05 --from 152 --to 576 --expect "## Motion Grammar By Format" --dest $G
node $M --old 05 --from 676 --to 789 --expect "## Dena-Specific Motion Rules" --dest $G
node $M --old 04 --from 363 --to 409 --expect "### 5. Generate Or Prepare Asset" --dest $P --agent04 build
node $M --old 04 --from 457 --to 612 --expect "## Generated Image Prompt Rules" --dest $P --agent04 build
node $M --old 04 --from 717 --to 772 --expect "## Quality Bar" --dest $P --agent04 build
```
Expected: nine `moved ...` lines. (05 lines 641–675, HyperFrames Compatibility Notes, move in Task 6.)

- [ ] **Step 3: Append the Visual Plan Template to visual-planning.md**

Append:

````markdown
## Visual Plan Template

Create `videos/<slug>/visual-plan.md`. It replaces the old asset plan and motion
plan: every visual moment is chosen once, here. The `Line` column of the Visual
Decision Log records the spoken words for the window, in addition to the fields
in `### 3A. Visual Decision Log`.

```md
# Visual Plan - <video slug>

## Inputs

- Creative brief:
- Edit decision notes:
- Processed video:
- Transcript:
- Caption beats:
- References:

## Strategy

- Visual grammar:
- Visual density (`visual_density`):
- Primary visual types:
- Primary motion primitives:
- Pattern interrupt cadence:
- Safe area concerns:
- Privacy constraints:
- Generated media policy:

## Visual Decision Log

| Time | Line | Purpose | Best real asset | Simple asset option | Imagegen candidate | Decision | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.0-3.0 | "<hook words>" | reset-attention | none | hook text card | yes | generate | The hook needs a grounded visual plate, and a static text card would feel stiff. |

## Timeline

| ID | In-Out | Line | Visual type | Placement / Track | Motion in / out | SFX cue | Illustrative | Gate 2 trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Asset Briefs For Build

### <timeline-id>

- Type:
- Content:
- Style:
- Dimensions:
- Safe area notes:
- Source / URL to capture:
- Prompt direction (generated media only):
- Do not show:
- Required:

## Conflicts And Resolutions

- Conflict:
  Resolution:

## Gate 2 Result

- Triggers found: <none | timeline IDs with R1-R6>
- User decision per flagged row:
- Result: <Gate 2: no triggers | Gate 2: approved by user on YYYY-MM-DD>

## Handoff

For Build phase:

For QA phase:
```
````

- [ ] **Step 4: Append the density mapping to motion-grammar.md**

Append:

```markdown
## Visual Density Mapping

`creative-brief.md` sets `visual_density`. Map it to the levels above:

| `visual_density` | Motion density level | Asset density |
| --- | --- | --- |
| `light` | `low` | lower end of Default Asset Density in `visual-planning.md` |
| `medium` (default) | `medium` | Default Asset Density |
| `heavy` | `high` | upper end of Default Asset Density; still one idea per visual |
```

- [ ] **Step 5: Append the capture and privacy record to asset-production.md**

Append:

````markdown
## Capture And Privacy Record

For every captured or generated asset, add this block to
`videos/<slug>/assembly-notes.md` under `## Asset Production`:

```md
### <asset-id>

Prompt (generated media only):

Negative prompt / exclusions:

Reason:

Screenshot/Capture Notes:
- Source:
- URL researched:
- Screen recording:
- Crop:
- Redactions:

Privacy Review:
- Sensitive data found:
- Redactions applied:
- Remaining risk:
```
````

- [ ] **Step 6: Write the phase doc**

Create `docs/agents/02-screen-plan.md`:

````markdown
# Phase 2 - Screen Plan

## Purpose

The Screen Plan phase decides everything that appears on screen over
`processed.mp4`: first the captions, then one visual plan that chooses which
moments get visuals, what type, where they sit, how they move, and which SFX
cues support them.

Every visual moment is chosen once, in `visual-plan.md`. This phase does not cut
video, capture or generate asset files, author HyperFrames HTML, or render.

## When To Use

Use this phase when:

- `processed.mp4` exists and the cut timing is locked.
- The video needs social captions, hook text, editorial titles, CTA text, or
  publish captions.
- The edit needs screenshots, product captures, tool UI, diagrams, generated
  visuals, b-roll, stickers, proof cards, zooms, flashes, progress bars,
  lower-thirds, transitions, pattern interrupts, or SFX cues.
- The user provides a URL, or the transcript mentions a tool, product, site,
  workflow, dashboard, CRM, ERP, code, or AI agent that needs visual context.
- A reference style needs caption or motion mechanics adapted.
- The video feels visually flat after the base cut.

Do not use this phase when:

- The cut is still changing significantly (Story).
- The task is only producing asset files or HTML for an approved plan (Build).
- The task is only QA or publishing.

## Core Principles

### Captions

Captions are not just transcription.

For Dena's videos, captions must do four jobs:

- Make the video understandable with sound off.
- Emphasize the exact words that sell the idea.
- Create rhythm and pattern interrupts.
- Preserve Dena's natural voice.

For default Dena storytelling/talking-head edits, captions must cover every
spoken word that survives the cut. Sparse editorial titles may replace running
captions only for an explicitly chosen cinematic/manifesto section, and that
tradeoff must be documented.

### Visuals

Visuals must clarify, prove, or reset attention. They are not decoration.

Good visuals answer one of these questions:

- What is Dena talking about?
- Why should the viewer believe this?
- What is the contrast?
- What should the viewer look at right now?
- How do we make an abstract AI/workflow idea visible?

Bad visuals are:

- random AI robot images
- AI slop: generic generated visuals that could fit any AI video
- generic stock business photos
- unrelated stickers
- dense screenshots nobody can read
- visuals that make Dena look like a generic AI influencer
- images that compete with the speaker instead of supporting the point

### Motion

Motion must guide attention. Every motion choice needs a reason: reveal meaning,
emphasize a claim, prove a point, reset attention, transition between ideas,
create rhythm, or protect readability. Motion is not decoration. If an effect
does not improve understanding, retention, or emotional force, remove it.

## Inputs

From `videos/<slug>/`: `creative-brief.md`, `edit-decision-notes.md` (including
Cut Summary), `transcript.json` with processed-timeline timing, `processed.mp4`,
`cut-list.json`. Also: user notes about caption or visual style, reference video
notes, user-provided URLs or screenshots, platform target (Instagram Reels,
TikTok, YouTube Shorts), and user constraints (minimal effects, no generated
media, no generated people, no fake product UI, no client data, keep face
unobstructed, use only project-local assets).

## Steps

### Captions step

1. **Confirm cut lock.** Read `docs/agents/references/captions.md` section
   Caption Timing Lock. If `processed.mp4` or processed-timeline word timing is
   missing, write only a provisional caption plan marked as provisional and
   route back to Story.
2. **Write caption beats.** Follow `docs/agents/references/captions.md` (caption
   types, mode selection, running word coverage, style, highlights, grouping,
   timing, safe area, language, ASR corrections, hook and CTA caption rules).
   The hook card uses the exact words of the locked hook for
   `00:00.00-00:03.00`.
3. **Write caption artifacts.** Use `docs/agents/references/caption-artifacts.md`
   for `caption-beats.json` (Caption Data Format), `caption-plan.md` (Caption
   Plan Template), and `publish-captions.md` (Platform Publish Caption Rules).
   Self-check with its QA Checklist. Captions stay editable as their own layer:
   track `2` for subtitles, track `5` for hook card, editorial title, and CTA.
   Do not burn captions into video.

### Visual step

4. **Map and decide.** Read `docs/agents/references/visual-planning.md` (Asset
   Categories, Asset Decision Workflow steps 1–4, Dena-Specific Asset Rules,
   Dena-Specific Examples, Default Asset Density). Write a Visual Decision Log
   entry for every visual-support opportunity before concluding generated media
   is unnecessary.
5. **Research links and tools.** If the user gave a URL or the transcript names
   a tool/product/site, inspect it now and write what Build must capture in the
   Asset Briefs For Build section, tied to the transcript window.
6. **Plan motion.** Read `docs/agents/references/motion-grammar.md` (grammar by
   format, primitives, pattern interrupts, timing, placement, density levels and
   Visual Density Mapping, sound/motion coordination, Dena-specific motion
   rules). Tracks and z-index follow
   `internal/docs/design-system/visual-system.md`.
7. **Write the plan.** Use the Visual Plan Template in
   `docs/agents/references/visual-planning.md` for `visual-plan.md`, and the
   Overlay Timeline Format in `docs/agents/references/motion-grammar.md` for
   `overlay-timeline.json`. All times are processed-video time and share one
   cue map with `caption-beats.json`.
8. **Gate 2.** Apply Gate 2 below.

If no visuals are needed, still write `visual-plan.md` with a Visual Decision
Log whose decisions are `skip`, each with a reason, and a Gate 2 Result.

## Outputs

All in `videos/<slug>/`:

- `caption-plan.md`
- `caption-beats.json`
- `publish-captions.md`
- `visual-plan.md` (with `## Gate 2 Result`)
- `overlay-timeline.json`
- Optional: `caption-review-notes.md`, `caption-style-preview.html`

## Gate 2 - Visual Plan Review (conditional)

Check every Timeline row of `visual-plan.md` against these triggers and write
the matching trigger IDs in the row's `Gate 2 trigger` column (`-` when none):

| # | Trigger |
| --- | --- |
| R1 | A number, price, percentage, result, client name, or quote on screen that is not verbatim from the transcript and was not given by the user |
| R2 | A screenshot or recording that shows real client or product data, or private information |
| R3 | A visual that covers Dena's face completely for more than 6 seconds, or covers a personal, emotional, or opinion line |
| R4 | A visual that covers Dena's face in `00:00.00-00:03.00`, unless `creative-brief.md` explicitly chose that hook visual (for example a manifesto background still). Hook card, captions, progress bar, punch zoom, and flash do not cover the face and do not trigger R4 |
| R5 | A CTA that implies a promise ("nanti gue share/kirim/bahas…") without the user's explicit approval |
| R6 | Generated image or video that depicts a real person or a real brand |

- Any trigger found: stop. Show only the flagged rows, each with its trigger and
  one safe alternative. The user approves, changes, or drops each row. Record
  the decisions in `## Gate 2 Result`, update the plan, then continue.
- No trigger found: write `Result: Gate 2: no triggers` and continue to
  `docs/agents/03-build.md`.

## Handoff

Hand off visuals as ingredients with a decided place, not as loose ideas. Every
Timeline row plus its Asset Brief gives Build:

- time range and the spoken line
- purpose
- required/optional flag
- placement and track
- motion in/out and SFX cue
- privacy/provenance expectation (real capture vs. generated, never presented
  as proof when generated)
- what not to cover or obscure

Bad handoff:

> Use these cool AI images somewhere.

Good handoff:

> `V-02` covers output `12-16s`, line "AI bukan gimmick". Subtle background/side card on track 4, not full-screen; fade in 0.3s with a soft whoosh under speech. Generated, so it must not be presented as proof. No robots, no readable fake UI. Keep Dena's face visible.

## Fix Routing

This phase owns:

- Captions step: caption wording, missing spoken words, ASR, phrase grouping,
  highlight logic, caption position, CTA text, publish captions.
- Visual step: visual at the wrong moment, irrelevant visual, missing URL/tool
  context, noisy motion, weak pattern interrupt, missing or inaudible SFX cue,
  overlay timing conflict, wrong density.

A change here invalidates Build outputs for the affected elements: Build
re-produces the affected assets and re-assembles those clips.
````

- [ ] **Step 7: Delete old docs and run V1 for 03, 04**

```bash
git rm -q docs/agents/04-asset-generation-agent.md docs/agents/05-motion-overlay-agent.md
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v1 --old 03; echo "exit03=$?"
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v1 --old 04; echo "exit04=$?"
```
Expected: `PASS: v1` / `exit03=0`. For 04: exactly one failure, `destination missing: docs/agents/03-build.md`, `exit04=1` (Build arrives in Task 6, which re-runs 04 and 05).

- [ ] **Step 8: Commit**

```bash
git add docs/agents/02-screen-plan.md docs/agents/references/visual-planning.md docs/agents/references/motion-grammar.md docs/agents/references/asset-production.md
git commit -q -F - <<'EOF'
docs: add Screen Plan phase with one visual plan and conditional Gate 2

visual-plan.md replaces asset-plan.md + motion-plan.md; Visual Decision
Log keeps the imagegen rules. Governance: ADR-0008, rd-03.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Build phase (old 04 production + 06 + 05 compat notes)

**Files:**
- Create: `docs/agents/references/hyperframes-assembly.md`, `docs/agents/03-build.md`
- Delete: `docs/agents/06-hyperframes-assembly-agent.md`

**Interfaces:**
- Consumes: `asset-production.md`, `## Gate 2 Result` (Task 5).
- Produces: `03-build.md` with `## Gate 3 - Final Review (mandatory)`; `hyperframes-assembly.md` sections `## HyperFrames Contract`, `## Assembly Procedure`, `## HTML Skeleton`, `## Assembly Notes Format`, `## Assembly Checklist Format`, `## Common Failure Modes`, `## HyperFrames Compatibility Notes`. Task 7 cites Gate 3.

- [ ] **Step 1: Create header and move sections**

Create `docs/agents/references/hyperframes-assembly.md`:
```markdown
# HyperFrames Assembly (Reference)

Contract, procedure, skeleton, and handoff formats for assembling the edit in
HyperFrames. Loaded by `docs/agents/03-build.md` in the assembly step, after the
`/hyperframes` and `/hyperframes-core` skills. Tracks and z-index follow
`internal/docs/design-system/visual-system.md`.

```

Then:
```bash
M=docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs
H=docs/agents/references/hyperframes-assembly.md
node $M --old 06 --from 156 --to 199 --expect "## HyperFrames Contract" --dest $H
node $M --old 06 --from 227 --to 725 --expect "## Assembly Procedure" --dest $H
node $M --old 05 --from 641 --to 675 --expect "## HyperFrames Compatibility Notes" --dest $H
```
Expected: three `moved ...` lines.

- [ ] **Step 2: Write the phase doc**

Create `docs/agents/03-build.md`:

````markdown
# Phase 3 - Build

## Purpose

The Build phase turns the approved Story and Screen Plan artifacts into real
files: it captures or generates the planned assets, assembles an editable
HyperFrames composition, verifies it, and renders it for the user's review.

This phase does not change the creative idea, the cut, the captions, or the
visual decisions. When one of those is wrong, route it back to the owning phase.

## When To Use

Use this phase when:

- Story and Screen Plan artifacts exist, including `## Gate 2 Result` in
  `visual-plan.md`.
- Planned assets need to be captured, generated, cropped, or recorded.
- `index.html` or `compositions/*.html` must be created or updated to match the
  plans.
- The video must stay editable as separate layers instead of being burned into
  the source MP4.
- A render is needed for user review.

Do not use this phase when:

- The cut, captions, or visual plan are still being decided.
- The user only wants analysis, a brief, or a plan.
- The task is only QA review or publishing.
- The project is not a HyperFrames project and no conversion/initialization has
  been approved.

## Core Principle

Assembly must be faithful, inspectable, and deterministic.

The composition should make the approved edit real without hiding decisions
inside a rendered file. Captions, overlays, cards, screenshots, video, and audio
should remain separate timed layers that can be inspected and adjusted.

Good assembly:

- preserves the approved cut and timing
- keeps each visual layer editable
- follows the HyperFrames timing contract exactly
- uses local assets with stable paths
- passes validation before handoff
- avoids clever runtime behavior that can break rendering

Bad assembly:

- burns all overlays into the source video too early
- uses random timing or runtime clocks
- loads remote assets during render
- creates overlapping clips on the same track
- hides text behind platform UI
- fixes visual problems by ignoring lint warnings
- changes the creative idea without sending it back upstream

## Inputs

From `videos/<slug>/`: `creative-brief.md`, `edit-decision-notes.md`,
`processed.mp4` (and separate audio, if present), `caption-plan.md`,
`caption-beats.json`, `visual-plan.md`, `overlay-timeline.json`. Also: existing
`index.html`, `compositions/*.html`, `meta.json`, local fonts, textures,
screenshots, b-roll, stickers, icons, generated media, and user constraints
(keep all overlays editable, no generated media, no remote assets, no heavy
motion, match Dena default style, reuse existing project structure).

## Steps

1. **Readiness.** Confirm every input above exists and `visual-plan.md` has a
   filled `## Gate 2 Result`. If anything is missing, stop and write an assembly
   readiness report naming the missing artifact and its owning phase; do not
   guess.
2. **Produce assets.** Read `docs/agents/references/asset-production.md`. For
   each Asset Brief in `visual-plan.md`, capture or generate the file into
   `videos/<slug>/assets/`, record it in `videos/<slug>/assets/asset-manifest.json`
   (Asset Manifest Format), and add a Capture And Privacy Record to
   `assembly-notes.md`. Use stable, descriptive filenames:
   - Good: `assets/ai-workflow-control-room-12s.png`,
     `assets/crm-dashboard-proof-28s.png`,
     `assets/manual-to-automated-diagram.svg`
   - Bad: `assets/image1.png`, `assets/final-final.png`, `assets/cool-bg.mp4`
3. **Load HyperFrames rules.** Read the `/hyperframes` and `/hyperframes-core`
   skills, and as needed `npx hyperframes docs data-attributes`,
   `compositions`, `gsap`, `rendering`, `troubleshooting`. Tracks, z-index, and
   safe area follow `internal/docs/design-system/visual-system.md`.
4. **Assemble.** Follow `docs/agents/references/hyperframes-assembly.md`
   (HyperFrames Contract, Assembly Procedure, HTML Skeleton, HyperFrames
   Compatibility Notes, Common Failure Modes).
5. **Verify.** Run `npm run check` and fix every error; review warnings. Preview
   keyframes as listed in the Render Gate of
   `docs/skills/dena-video-editing-workflow/references/quality-gates.md`.
6. **Write handoff notes.** `assembly-notes.md` and `assembly-checklist.md`
   (formats in `docs/agents/references/hyperframes-assembly.md`).
7. **Render.** `npm run render`, then the export sanity check from the Render
   Gate (file exists, duration plausible, audio present, first/last frames not
   blank).
8. **Gate 3.** Apply Gate 3 below.

## Outputs

- `index.html`
- `compositions/*.html`, only when sub-compositions are justified
- `videos/<slug>/assets/*` and `videos/<slug>/assets/asset-manifest.json`, when
  assets exist
- `videos/<slug>/assembly-notes.md`
- `videos/<slug>/assembly-checklist.md`
- Render MP4
- Optional: `videos/<slug>/storyboard.json`, `videos/<slug>/preview/keyframes/`,
  `videos/<slug>/warnings.md`, `videos/<slug>/render-notes.md`

## Gate 3 - Final Review (mandatory)

Stop after the render and send it to the user with:

- composition file paths
- asset paths
- source video path
- audio path
- `assembly-notes.md`
- `assembly-checklist.md`
- latest verification command output summary
- unresolved warnings
- known visual risks
- key moments the user should inspect

Offer three paths:

1. **Approve** (default): go to the publish gate.
2. **QA first**: run `docs/agents/04-qa.md` as a fresh-context subagent, then
   return here.
3. **Revise**: route each fix to its owning phase (Fix Routing in each phase
   doc), then re-assemble and re-render.

Do not upload or schedule publishing from this phase.

## Publish Gate

Only after the user's explicit approval:

```bash
npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved
```

QA artifacts are not required when the user approves without QA. Details:
`docs/repliz/integration-spec.md`.

## Fix Routing

This phase owns: unreadable or badly cropped asset, weak generated asset,
missing capture of a planned item, privacy issue in a produced asset, broken
HyperFrames contract, missing media, track overlap, z-index, and render
failure.
````

- [ ] **Step 3: Delete old doc and run V1 for 04, 05, 06**

```bash
git rm -q docs/agents/06-hyperframes-assembly-agent.md
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v1 --old 04,05,06; echo "exit=$?"
```
Expected: `PASS: v1`, `exit=0`.

- [ ] **Step 4: Commit**

```bash
git add docs/agents/03-build.md docs/agents/references/hyperframes-assembly.md
git commit -q -F - <<'EOF'
docs: add Build phase with asset production, assembly, and Gate 3

Governance: ADR-0008, rd-03.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: QA phase (old 07)

**Files:**
- Create: `docs/agents/references/qa-checklist.md`, `docs/agents/04-qa.md`
- Delete: `docs/agents/07-qa-review-agent.md`

**Interfaces:**
- Produces: `04-qa.md` section `## How To Run` with the subagent prompt; Tasks 8–9 cite `docs/agents/04-qa.md`.

- [ ] **Step 1: Create header and move sections**

Create `docs/agents/references/qa-checklist.md`:
```markdown
# QA Checklist (Reference)

Verdicts, severity, review axes, procedure, and report formats for the optional
QA phase. Loaded by `docs/agents/04-qa.md`.

```

Then:
```bash
M=docs/superpowers/plans/2026-09-26-four-phase-workflow-move.mjs
Q=docs/agents/references/qa-checklist.md
node $M --old 07 --from 143 --to 715 --expect "## Verdicts" --dest $Q
node $M --old 07 --from 732 --to 749 --expect "## Definition Of Done" --dest $Q
```

- [ ] **Step 2: Write the phase doc**

Create `docs/agents/04-qa.md`:

````markdown
# Phase 4 - QA (optional)

## Purpose

The QA phase is an optional, independent quality gate. It reviews the assembled
composition and the render against the brief, the Dena style guide, the caption
and visual plans, the HyperFrames contract, audio quality, platform constraints,
and viewer experience.

It audits, classifies issues, gives precise revision instructions, and decides
whether the edit is ready. It does not invent a new creative direction, rewrite
the edit, generate assets, author the composition, upload to R2, or schedule
Repliz.

## When To Use

Run it only when the user chooses QA first at Gate 3, or explicitly asks for a
readiness review, punch list, platform-readiness check, or regression review.

Do not run it when:

- Story, Screen Plan, or Build artifacts are missing.
- The user only wants to review the render personally before deciding.
- The task is to implement a known fix; route that to the owning phase.

## Core Principle

QA must protect both the viewer experience and the render contract.

The review should answer two questions:

1. Would a real Instagram/TikTok viewer understand and keep watching this?
2. Will HyperFrames render the same intended result reliably?

Good QA is evidence-based:

- cites exact timecodes
- cites file paths or clip ids when relevant
- separates blockers from taste notes
- assigns each fix to the right owning phase
- verifies commands before claiming readiness

Bad QA:

- says "looks good" without preview evidence
- accepts unreadable captions because the HTML validates
- accepts broken render behavior because the first frame looks fine
- rewrites the entire concept at the last stage
- hides uncertainty instead of marking it

## How To Run

Always run QA as a fresh-context subagent so it judges only what is on disk. In
Claude Code use the Agent tool (`subagent_type: general-purpose`); in other
agents start a new session. Give it only this prompt, with the two paths filled
in, and no summary of the build session:

```text
You are the QA phase for a Dena Meidina social video. You have no access to the
session that built it; judge only what is on disk.

Slug: videos/<slug>/
Render: <path/to/render.mp4>

1. Read docs/agents/04-qa.md completely and follow it.
2. Read docs/agents/references/qa-checklist.md and docs/dena-social-video-style-guide.md.
3. Read every artifact in videos/<slug>/ and the composition files that
   assembly-notes.md names.
4. Run the technical checks and review the render as the checklist describes.
5. Write videos/<slug>/qa-report.md and videos/<slug>/qa-punch-list.md. Give
   every finding an owner: Story, Screen Plan (captions), Screen Plan (visual),
   or Build.
6. Write videos/<slug>/final-approval.md only when the verdict is pass.

Reply with: verdict, finding count per severity, and the paths you wrote.
```

## Inputs

- `index.html`, `compositions/*.html`
- Every artifact in `videos/<slug>/`, including `assembly-notes.md` and
  `assembly-checklist.md`
- `processed.mp4`, separate audio, the rendered MP4, and any preview keyframes
- User constraints: approval only, fix blockers only, compare against reference,
  prepare for Reels/TikTok, no render yet, final render required

## Steps

Follow `docs/agents/references/qa-checklist.md`: Review Procedure, Review Axes,
Severity Levels, Verdicts, and the Definition Of Done.

## Outputs

In `videos/<slug>/`:

- `qa-report.md`
- `qa-punch-list.md`
- Conditional: `render-review.md` when a rendered MP4 exists or final render was
  requested; `final-approval.md` only when the verdict is `pass`;
  `qa-snapshots/` when keyframes are captured

The QA report is the decision record. It must be clear enough that the owning
phase can execute the revisions without asking what went wrong.

`final-approval.md` is an internal QA pass, not permission to publish. R2 upload
and Repliz scheduling still require the user's explicit approval and
`--approved`.

## Ownership For Routing

- Story: story, hook, content lane, CTA direction, source pacing, silence cuts,
  speech continuity, speed, processed media.
- Screen Plan (captions): caption text, grouping, highlights, ASR corrections,
  caption timing, publish captions.
- Screen Plan (visual): visual choices and Visual Decision Log, placement,
  overlay motion, pattern interrupts, density, SFX cue timing.
- Build: asset file quality, HTML/CSS/GSAP implementation, render contract.
- QA: the QA decision record and revision routing.

After QA, the main session returns to Gate 3 in `docs/agents/03-build.md`.
````

- [ ] **Step 3: Delete old doc and run full V1**

```bash
git rm -q docs/agents/07-qa-review-agent.md
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v1; echo "exit=$?"
ls docs/agents docs/agents/references
```
Expected: 15 intentional-change lines for 01, `PASS: v1`, `exit=0`; `docs/agents` lists `01-story.md 02-screen-plan.md 03-build.md 04-qa.md references`; `references` lists 9 files.

- [ ] **Step 4: Check reference sizes**

Run: `wc -l docs/agents/references/*.md docs/agents/0*.md`
Expected: every reference ≤ 600 lines (spec risk rule). If one exceeds 600, split it at an H2 boundary into two files, update the phase-doc step that loads it, add the new path to `OLD[..].dest` in the verify script, and re-run V1.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/04-qa.md docs/agents/references/qa-checklist.md
git commit -q -F - <<'EOF'
docs: add optional QA phase run as a fresh-context subagent

Governance: ADR-0008, rd-03.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Router and entry doors

**Files:**
- Modify: `docs/skills/dena-video-editing-workflow/SKILL.md`
- Delete: `docs/skills/dena-video-editing-workflow/references/agent-chain.md`
- Create: `docs/skills/dena-video-editing-workflow/references/phase-chain.md`
- Modify: `docs/skills/dena-video-editing-workflow/references/quality-gates.md`
- Modify: `AGENTS.md`, `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: phase doc paths (Tasks 3–7).
- Produces: `references/phase-chain.md` (router reference) used by SKILL.md.

- [ ] **Step 1: SKILL.md — Overview through Stage Router**

Replace everything from `## Overview` up to (not including) `## Lean Fixing Defaults` with:

```markdown
## Overview

Use this skill as the router for Dena Meidina social-video work in this project. It enforces the phase order in `docs/agents/`, the Dena style guide, HyperFrames composition rules, handoff artifacts, and the review gates. Decision record: `internal/docs/adr/0008-four-phase-workflow.md`.

## Start Here

Before any Dena video task:

1. Read `AGENTS.md`.
2. Read `docs/dena-social-video-style-guide.md`.
3. Identify the current phase.
4. Read that phase document in `docs/agents/` completely.
5. Read upstream artifacts in `videos/<slug>/`, not upstream phase documents.
6. Read a reference in `docs/agents/references/` only at the step that names it.
7. Produce the phase's output artifacts in `videos/<slug>/`.

For the full chain, gates, skip rules, and fix routing, read `references/phase-chain.md`.

For validation, QA, and render gates, read `references/quality-gates.md`.

## Phase Router

| User need | Phase |
| --- | --- |
| New raw/reference video, angle, hook, format, style adaptation, transcript, three-second spoken hook, silence/filler cuts, pacing, speed, processed base video | `docs/agents/01-story.md` |
| Captions, subtitles, verbatim hook card, phrase grouping, ASR correction, CTA text, publish captions | `docs/agents/02-screen-plan.md` (captions step) |
| Which moments get screenshots, b-roll, generated images/video, diagrams, stickers, proof cards; overlay timing, pattern interrupts, zooms, effects, transitions, SFX cues | `docs/agents/02-screen-plan.md` (visual step) |
| Capturing/generating asset files, `index.html`, `compositions/*.html`, timed clips, GSAP, HyperFrames assembly, render | `docs/agents/03-build.md` |
| Optional QA, punch list, render/platform readiness review, regression review | `docs/agents/04-qa.md` (fresh-context subagent) |
| R2/Repliz auto publish after explicit user approval | `docs/repliz/integration-spec.md` |

Do not skip ahead unless the user explicitly requests a narrow technical fix and upstream decisions already exist.
```

- [ ] **Step 2: SKILL.md — Lean Fixing Defaults bullets**

Exact replacements:
- `Do not rerun the full agent chain by default.` → `Do not rerun the full phase chain by default.`
- `keep the compact cut as the baseline when it feels denser, Agent 02 restores only missing context, Agent 04 creates local/manual explanatory assets when useful, Agent 05 adds purposeful motion plus SFX timing, Agent 06 assembles, and Agent 07 re-verifies.` → `keep the compact cut as the baseline when it feels denser, the Story phase restores only missing context, the Screen Plan phase plans local/manual explanatory assets plus purposeful motion and SFX timing, the Build phase produces and assembles them, and the QA phase re-verifies when the user chooses QA.`
- `Treat "captions skipped words" as a Caption Agent bug by default.` → `Treat "captions skipped words" as a Screen Plan (captions step) bug by default.`
- `route to Agent 04 for web research/inspection and local screenshot or screen-record capture before motion planning.` → `route to the Screen Plan phase (visual step) for web research/inspection and a planned local screenshot or screen-record capture; the Build phase captures it.`

- [ ] **Step 3: SKILL.md — Non-Negotiables, Handoff Contract, If Inputs Are Missing**

- Replace `  the explanation; Agent 02 documents the source move and Agent 03 captions the` / `  same words for muted viewing.` (two lines, two-space indent) with `  the explanation; the Story phase documents the source move and the Screen Plan` / `  phase captions the same words for muted viewing.`
- Replace `- After final render, stop for user review. Offer publish as-is, QA first, or revisions. Do not upload to R2 or schedule Repliz until the user explicitly approves.` with `- After final render, stop for user review (Gate 3). Offer publish as-is, QA first, or revisions. Do not upload to R2 or schedule Repliz until the user explicitly approves.`
- Replace the whole `## Handoff Contract` section (heading through the paragraph ending `Only create \`final-approval.md\` after QA passes.`) with:

````markdown
## Handoff Contract

For a complete edit, the expected artifact chain is:

```text
Story:        videos/<slug>/creative-brief.md
              videos/<slug>/metadata.json
              videos/<slug>/transcript.json
              videos/<slug>/edit-decision-notes.md   (ends with ## Cut Summary)
              videos/<slug>/cut-list.json
              videos/<slug>/processed.mp4
Screen Plan:  videos/<slug>/caption-plan.md
              videos/<slug>/caption-beats.json
              videos/<slug>/publish-captions.md
              videos/<slug>/visual-plan.md           (ends with ## Gate 2 Result)
              videos/<slug>/overlay-timeline.json
Build:        videos/<slug>/assets/asset-manifest.json   (when assets exist)
              videos/<slug>/assembly-notes.md
              videos/<slug>/assembly-checklist.md
```

Only create QA artifacts when the user chooses QA first or explicitly asks for QA. Only create `final-approval.md` after QA passes.
````

- Replace the `## If Inputs Are Missing` bullet list (from `- Missing direction: run Agent 01.` through `- User chose QA first and QA evidence is missing: run Agent 07.`) with:

```markdown
- Missing direction, transcript, hook, or cut: run the Story phase.
- Missing caption timing or captions: run the Screen Plan phase (captions step).
- Missing `visual-plan.md` or its Gate 2 Result: run the Screen Plan phase (visual step).
- Missing assets, assembly notes, checklist, or render: run the Build phase.
- User chose QA first and QA evidence is missing: run the QA phase as a fresh-context subagent.
```

- [ ] **Step 4: Replace agent-chain.md with phase-chain.md**

```bash
git rm -q docs/skills/dena-video-editing-workflow/references/agent-chain.md
```

Create `docs/skills/dena-video-editing-workflow/references/phase-chain.md`:

```markdown
# Phase Chain

Use this reference when deciding which Dena video phase to run and what artifact must be produced next. Decision record: `internal/docs/adr/0008-four-phase-workflow.md`.

## Default Edit Workflow

1. `docs/agents/01-story.md`
   - Owns: media audit, transcript, angle, audience, content lane, hook locked from transcript, visual grammar, CTA direction, silence/filler/repetition cuts, base pacing, `1.2x` default speed or documented exception.
   - Reads: style guide, user request, reference notes or inspected reference video, source media.
   - Writes: `creative-brief.md`, `metadata.json`, `transcript.json`, `edit-decision-notes.md` (with Cut Summary), `cut-list.json`, `processed.mp4`.
   - Gate 1 (optional): cut review only when the user asks or `gate_cut: on`.

2. `docs/agents/02-screen-plan.md`
   - Owns: caption text, full spoken-word running coverage, phrase grouping, highlights, ASR correction, caption timing, publish captions; then every visual choice, Visual Decision Log, placement, overlay timing, pattern interrupts, zooms, transitions, SFX cue timing.
   - Reads: Story artifacts.
   - Writes: `caption-plan.md`, `caption-beats.json`, `publish-captions.md`, `visual-plan.md`, `overlay-timeline.json`.
   - Gate 2 (conditional): stops only when a timeline row matches R1–R6.

3. `docs/agents/03-build.md`
   - Owns: URL/web captures, screen recordings, generated stills/video, UI crops, diagrams, `index.html`, optional `compositions/*.html`, local asset wiring, timed clips, GSAP timeline registration, render.
   - Reads: Story and Screen Plan artifacts, `/hyperframes` routed docs.
   - Writes: `assets/asset-manifest.json`, asset files, composition files, `assembly-notes.md`, `assembly-checklist.md`, render MP4.
   - Gate 3 (mandatory): stop for user review; offer publish as-is, QA first, or revisions.

4. Optional: `docs/agents/04-qa.md`
   - Owns: final verdict, punch list, render/platform readiness, revision routing.
   - Runs only when the user chooses QA first, asks for readiness/punch-list review, or needs regression review — always as a fresh-context subagent.
   - Writes: `qa-report.md`, `qa-punch-list.md`, optionally `render-review.md` and `final-approval.md`.

R2/Repliz publish still requires explicit user approval and `--approved`.

## Skip Rules

Skipping is allowed only when the reason is explicit.

- Skip the visual step only when no visuals are needed and no URL/tool/product context needs visual support; still write `visual-plan.md` with `skip` decisions and a Gate 2 Result.
- Skip Build only when no HyperFrames composition is being created or changed.
- Skip QA by default. Run it only when the user chooses QA first, asks for readiness/punch-list review, or a regression review is needed.

Never skip Story for a new creative edit unless the user asks for a narrow technical operation.

## Fix Routing

Route revisions to the owner:

- Weak hook, wrong format, wrong CTA direction, rambling cut, missing context, rough jump cut, bad base audio edit, wrong speed or undocumented slower speed: Story.
- Caption wording, missing spoken words, ASR, phrase grouping, highlight logic, CTA text: Screen Plan (captions step).
- Visual at the wrong moment, missing URL/tool context, noisy motion, weak pattern interrupt, missing/inaudible SFX cue, overlay timing conflict: Screen Plan (visual step).
- Unreadable screenshot, bad generated asset, privacy issue in an asset, broken HyperFrames contract, missing media, track overlap, z-index, render failure: Build.
- Optional QA decision, punch list, regression review: QA.

## User Shortcuts

If the user says:

- `lanjut fase berikutnya` (or `lanjut agent berikutnya`): continue to the next numbered phase document.
- `cek cut dulu`: turn Gate 1 on for this video.
- `audit dulu`: inspect source/reference and produce evidence before changing files.
- `buat workflow`: create or update docs first; do not jump into editing.
- `render final`: run required technical checks, render, then stop at Gate 3.
- `publish final` or `publish as-is`: verify explicit user approval, then use `npm run repliz:publish -- --slug <videos/slug> --file <render.mp4> --approved`.
- `QA first`: run the QA phase as a fresh-context subagent, then return to Gate 3.
```

- [ ] **Step 5: quality-gates.md replacements**

Exact replacements in `docs/skills/dena-video-editing-workflow/references/quality-gates.md`:
- `If the user provides a URL or the transcript mentions a tool/product/site, Agent 04 must either:` → `If the user provides a URL or the transcript mentions a tool/product/site, the Screen Plan phase must plan, and the Build phase must deliver, either:`
- `When \`asset-plan.md\` exists, QA must check for an \`Imagegen Decision Log\`.` → `When \`visual-plan.md\` exists, QA must check for a \`Visual Decision Log\`.`
- `Fail Agent 04 output when:` → `Fail the visual plan or asset production when:`
- `- visual assets exist but \`asset-plan.md\` has no \`Imagegen Decision Log\`` → `- visual assets exist but \`visual-plan.md\` has no \`Visual Decision Log\``
- `Use Agent 07 verdicts:` → `Use QA phase verdicts:`
- `Full Agent 07 QA waits until the user chooses QA first.` → `The full QA phase waits until the user chooses QA first.`
- `4. If the user chooses QA first, run Agent 07, then return here for explicit publish approval.` → `4. If the user chooses QA first, run the QA phase as a fresh-context subagent, then return here for explicit publish approval.`

Then insert before `## Render Gate`:

```markdown
## Phase Gates

- Gate 1 (cut review, optional): `docs/agents/01-story.md`.
- Gate 2 (visual plan, conditional on R1–R6): `docs/agents/02-screen-plan.md`.
- Gate 3 (final review, mandatory): `docs/agents/03-build.md`.

```

- [ ] **Step 6: AGENTS.md and CLAUDE.md — non-negotiables**

In both files, exact replacements:
- `  \`00:00.00-00:03.00\`, then continue into the explanation. Agent 02 owns the` / `  source move; Agent 03 captions the same words for muted viewing.` → `  \`00:00.00-00:03.00\`, then continue into the explanation. The Story phase owns` / `  the source move; the Screen Plan phase captions the same words for muted viewing.`
- `- When a user provides a URL or the transcript mentions a tool/product/site, Agent 04 must research or inspect it, capture local screenshots/screen recordings when useful, and time those assets to the transcript context.` → `- When a user provides a URL or the transcript mentions a tool/product/site, the Screen Plan phase must research or inspect it and plan captures timed to the transcript context; the Build phase captures local screenshots/screen recordings when useful.`
- `- Agent 04 must write an \`Imagegen Decision Log\` for every visual-support opportunity;` → `- The Screen Plan phase must write a \`Visual Decision Log\` in \`visual-plan.md\` for every visual-support opportunity;` (keep the rest of that bullet unchanged).

- [ ] **Step 7: AGENTS.md and CLAUDE.md — workflow section**

In both files, replace everything from the line `## Dena Agent Workflow Discipline` up to (not including) the first `## ` heading that follows the paragraph starting `Docs-only edits to` with:

```markdown
## Dena Workflow Discipline

For Dena Meidina social-video work, use the phase documents in `docs/agents/` as the operating workflow. They are the project contract for planning, editing, assembling, and reviewing videos. Decision record: `internal/docs/adr/0008-four-phase-workflow.md`.

Start by reading the local workflow skill:

`docs/skills/dena-video-editing-workflow/SKILL.md`

Use that skill as the router, then read the phase document for the current phase. Each phase document names the reference in `docs/agents/references/` to read at each step; read references only when that step needs them.

### Phase Order

1. `docs/agents/01-story.md` — direction, transcript, hook locked from the transcript, cut, `processed.mp4`. Gate 1 (cut review) is optional: on only when the user asks or `creative-brief.md` sets `gate_cut: on`.
2. `docs/agents/02-screen-plan.md` — captions, then one visual plan (`visual-plan.md`). Gate 2 stops only when a timeline row matches a risk trigger R1–R6.
3. `docs/agents/03-build.md` — asset production, HyperFrames assembly, `npm run check`, render. Gate 3: stop for user review after render.
4. `docs/agents/04-qa.md` — optional. Runs only when the user chooses QA first or asks for a readiness, punch-list, or regression review, and always as a fresh-context subagent.

Run the phases in order unless the user explicitly requests a narrow technical fix. Do not start Build before the Story and Screen Plan artifacts exist, including the `Gate 2 Result` section of `visual-plan.md`.

### Routing Rules

- New raw video, reference video, "make this viral", "edit like this", angle, hook, format, transcript, silence/filler cuts, pacing, speed, or processed media: Story.
- Captions, subtitles, hook text, caption grouping, highlights, ASR corrections, CTA text, or publish captions: Screen Plan (captions step).
- Which moments get visuals, visual type (screenshot, generated still/video, diagram, proof card, label, sticker), placement, overlay timing, pattern interrupts, zooms, effects, progress bars, transitions, or SFX cues: Screen Plan (visual step).
- Capturing/generating asset files, editing `index.html`, `compositions/*.html`, timed clips, GSAP timelines, HyperFrames tracks, local asset wiring, or rendering: Build, plus the relevant HyperFrames skill.
- Optional QA, punch list, render/platform readiness review, or regression review: QA.

### Discipline Rules

1. Before acting in a phase, read that phase document completely.
2. Read upstream artifacts in `videos/<slug>/`, not upstream phase documents.
3. Produce the phase's output artifacts in `videos/<slug>/` whenever a slug exists.
4. If an upstream artifact is missing, create it in the correct upstream phase first or write a readiness/blocker note. Do not silently invent missing decisions.
5. Keep each phase inside its boundary. Screen Plan decides visuals and timing; Build implements them in HyperFrames.
6. Review and QA findings route fixes back to the owning phase instead of becoming vague "polish" work.
7. If the user says "lanjut fase berikutnya" (or "lanjut agent berikutnya"), continue to the next numbered phase document.

### Minimum Handoff Chain

- Story: `creative-brief.md`, `metadata.json`, `transcript.json`, `edit-decision-notes.md`, `cut-list.json`, `processed.mp4`
- Screen Plan: `caption-plan.md`, `caption-beats.json`, `publish-captions.md`, `visual-plan.md`, `overlay-timeline.json`
- Build: `assets/asset-manifest.json` (when assets exist), `assembly-notes.md`, `assembly-checklist.md`, render MP4
- Optional QA: `qa-report.md`, `qa-punch-list.md`, and `final-approval.md` only after QA passes

### Repliz/R2 Auto Publish Gate

Auto publish is documented in `docs/repliz/integration-spec.md`.

- After final render, stop and ask the user to review the edited video (Gate 3).
- At the review gate, offer: publish as-is, run QA first, or request revisions.
- Do not upload to Cloudflare R2 or schedule Repliz until the user explicitly approves/confirms.
- If the user chooses publish as-is, QA artifacts are not required.
- If the user chooses QA first, run the QA phase as a fresh-context subagent before asking for final publish approval.
- Only after approval, run `npm run repliz:publish -- --slug <videos/slug> --file <render.mp4> --approved`.
- R2 uses Wrangler remote upload, `CLOUDFLARE_ACCOUNT_ID`, bucket from `R2_BUCKET`, and public base `https://<r2-public-domain>`.
- Do not add S3 access keys, R2 secret keys, or `wrangler.jsonc` for this flow unless the user explicitly asks.
- Do not test or call Repliz unless the user explicitly asks; R2-only smoke tests are allowed when requested.

### Interaction With HyperFrames

The Build phase does not replace HyperFrames skills. When writing or modifying HyperFrames compositions, read `/hyperframes` and the routed HyperFrames skill first, then follow `docs/agents/03-build.md`. After editing any `.html` composition, run `npm run check` before reporting completion.

Docs-only edits to `docs/agents/**/*.md`, `AGENTS.md`, or `CLAUDE.md` do not require `npm run check` unless they also modify `.html` composition files.

```

Then run: `diff <(sed -n '/^## Dena Workflow Discipline/,/^Docs-only edits/p' AGENTS.md) <(sed -n '/^## Dena Workflow Discipline/,/^Docs-only edits/p' CLAUDE.md) && echo same`
Expected: `same`.

- [ ] **Step 8: README.md**

- `docs/agents/                            workflow agent 01-07` → `docs/agents/                            workflow fase 01-04 + references/`
- `4. Agent yang relevan di \`docs/agents/\`` → `4. Dokumen fase yang relevan di \`docs/agents/\``
- Replace the text block
  ````
  ```text
  01 creative director
  02 transcript cut
  03 caption/subtitle
  04 asset generation
  05 motion/overlay
  06 HyperFrames assembly
  07 QA review
  ```
  ````
  with
  ````
  ```text
  01 story        (transcript, hook, cut)
  02 screen plan  (caption + rencana visual)
  03 build        (aset, HyperFrames, render)
  04 QA           (opsional, subagent)
  ```
  ````

- [ ] **Step 9: Run V2 on the touched files**

Run: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v2 2>&1 | grep -E 'AGENTS.md|CLAUDE.md|README.md|docs/skills/' ; echo done`
Expected: only `done` (no stale hits in these files).

- [ ] **Step 10: Commit**

```bash
git add -A docs/skills/dena-video-editing-workflow AGENTS.md CLAUDE.md README.md
git commit -q -F - <<'EOF'
docs: route Dena workflow through four phases in router and entry doors

agent-chain.md becomes phase-chain.md; AGENTS.md and CLAUDE.md share one
phase section. Governance: ADR-0008, rd-03.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Sweep remaining docs and hooks

**Files:**
- Rewrite: `internal/docs/operations/video-editing-workflow.md`
- Modify: `internal/docs/architecture/data-model.md`, `architecture/stack.md`, `architecture/nfr.md`, `design-system/visual-system.md`, `requirements/rd-02-composition-render.md`, `requirements/rd-04-transcription-setup.md`, `requirements/prd.md`, `requirements/frd.md`, `adr/0001-hyperframes-html-to-video.md`, `adr/0004-local-whisper-transcription.md`, `operations/roadmap.md`, `operations/agent-documentation-workflow.md`, `entrypoints/frd.md`, `entrypoints/rd.md`, `product/scope-principles.md`, `product/onboarding.md`
- Modify: `docs/dena-social-video-style-guide.md`, `docs/ai-agent-initial-setup.md`, `docs/repliz/integration-spec.md`, `docs/blueprints/dena-video-editing-project-reverse-engineering-blueprint.md`
- Modify: `.claude/hooks/ensure-docs-updated.py:9`, `.codex/hooks/ensure-learning-docs.py:216`

- [ ] **Step 1: Run V2 and save the hit list**

Run: `node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v2 2>&1 | tee /dev/stderr | grep -c '^\[v2\]'`
Expected: a non-zero count; every hit is in a file listed above.

- [ ] **Step 2: Rewrite operations/video-editing-workflow.md**

Replace its whole content with:

```markdown
# Video Editing Workflow (4 Fase)
Status: operating standard
Date: 2026-09-26

Kanonik untuk: cara operasional menjalankan produksi video Dena via 4 fase.
Aturan/kriteria: [rd-03](../requirements/rd-03-video-editing-workflow.md);
keputusan: [ADR-0008](../adr/0008-four-phase-workflow.md). Sumber detail:
dokumen fase `docs/agents/01-story.md` … `docs/agents/04-qa.md`, referensi di
`docs/agents/references/`, dan router `docs/skills/dena-video-editing-workflow/SKILL.md`.

## Urutan

Story → (Gate 1 opsional) → Screen Plan → (Gate 2 kondisional) → Build →
Gate 3 review user → (QA opsional, subagent) → gate publish. Jangan mulai Build
sebelum artifact Story dan Screen Plan ada, termasuk `Gate 2 Result`. Slug per
video: `videos/<slug>/`. Fase hilir membaca artifact hulu, bukan dokumen fase
hulu; referensi dibaca hanya pada langkah yang menyebutnya.

## Ikhtisar per fase

### 1. Story (`docs/agents/01-story.md`)
Audit media (`ffprobe`/`ffmpeg volumedetect`/`silencedetect=noise=-34dB:d=0.35`)
→ transkripsi whisper lokal → angle, content lane (`ai-systems`,
`developer-craft`, `founder-operator`, `journey-reflection`, `family-vlog`,
`viral-character`), hook (`callout|contrast|mistake|proof|mission|plot-twist`)
yang **selalu dikunci dari transkrip** → cut berbasis amplitudo → **kecepatan
default 1.2x** (1.12–1.18x bila sumber cepat; lebih rendah wajib
didokumentasikan). Hook verbatim dipindah ke output `00:00.00-00:03.00`, kemunculan
aslinya dihapus kecuali callback terdokumentasi. Base video 9:16 1080x1920 30fps
tanpa caption/overlay burned-in. Audio: highpass 70–100Hz, −16..−14 LUFS, true
peak −1.5..−1.0 dBFS. **Output:** `creative-brief.md` (+ `visual_density`,
`gate_cut`), `metadata.json`, `transcript.json`, `edit-decision-notes.md`
(diakhiri `## Cut Summary`), `cut-list.json`, `processed.mp4`.
**Gate 1** (opsional, default off): review cut hanya bila user minta atau
`gate_cut: on`. Referensi: `hook-and-angle.md`, `cut-and-pacing.md`.

### 2. Screen Plan (`docs/agents/02-screen-plan.md`)
**Langkah caption:** tipe `subtitle-beat` (default 1–4 kata, max 6),
`hook-card`, `editorial-title`, `proof-label`, `cta-caption`; **cakupan penuh**
kata terucap; timing min 0.45s, nyaman 0.8–1.4s, hold panjang 1.8–2.5s; safe top
120px, bottom 220px; koreksi ASR; `publish-captions.md` IG max 1200 char, TikTok
max 4000 char. Track 2 subtitle, track 5 hook/title/CTA. Hook card memakai kata
yang sama dengan hook Story.
**Langkah visual:** satu `visual-plan.md` (menggantikan `asset-plan.md` +
`motion-plan.md`): Visual Decision Log wajib untuk tiap peluang visual-support
(time, line, purpose, best_real_asset, simple_asset_option,
imagegen_candidate, decision, reason); prioritas aset real capture > screenshot
bukti > diagram > generated still > generated video; riset URL/tool dan rencana
capture; motion primitives (caption-pop 0.12–0.2s, hook-card-snap 0.2–0.35s,
proof-card-slide 0.25–0.45s, punch-zoom 0.2–0.4s, flash-cut <0.12s, cta-morph
2–4s); density dari `visual_density`; cue SFX audible di HP namun di bawah speech.
**Output:** `caption-plan.md`, `caption-beats.json`, `publish-captions.md`,
`visual-plan.md`, `overlay-timeline.json`.
**Gate 2** (kondisional): berhenti hanya bila baris Timeline kena R1–R6 (angka/
klaim tak verbatim, data asli/privat, wajah tertutup >6s atau saat kalimat
personal, wajah tertutup di 0–3s tanpa pilihan brief, CTA berjanji, generated
yang menggambarkan orang/brand nyata). Referensi: `captions.md`,
`caption-artifacts.md`, `visual-planning.md`, `motion-grammar.md`.

### 3. Build (`docs/agents/03-build.md`)
Cek kesiapan (termasuk `Gate 2 Result`) → capture/generate aset sesuai Asset
Briefs ke `videos/<slug>/assets/` + `assets/asset-manifest.json` (file yang
benar-benar dibuat) → baca skill `/hyperframes` + `/hyperframes-core` → rakit
`index.html` (+ `compositions/*.html` bila perlu). Kontrak: root
`data-composition-id` + `data-width/height/duration`; tiap elemen ber-waktu
`class="clip"` + timing; tanpa overlap track sama; timeline paused terdaftar;
deterministik; video muted + audio terpisah; aset lokal. `npm run check`, fix
semua error, preview keyframe, tulis `assembly-notes.md` +
`assembly-checklist.md`, render. **Gate 3** (wajib): berhenti untuk review user.
Referensi: `asset-production.md`, `hyperframes-assembly.md`.

### 4. QA (`docs/agents/04-qa.md`, opsional)
Hanya bila user memilih QA dulu / minta readiness, punch-list, atau regression.
Selalu dijalankan sebagai **subagent konteks baru** yang hanya menerima path
slug, path render, `04-qa.md`, dan `references/qa-checklist.md`. **Output:**
`qa-report.md`, `qa-punch-list.md`; `final-approval.md` hanya bila `pass`.
Verdict: `pass|pass-with-minor-notes|revise|blocked`. Severity:
`blocker|major|minor|note`. Temuan dirutekan ke fase pemilik. Threshold
caption/audio sama seperti di [nfr](../architecture/nfr.md).
`final-approval.md` = lulus QA internal, **bukan** izin publish.

## Gate review/publish

Setelah render Build: berhenti, minta user review (Gate 3). Tawarkan: publish
as-is (default) / QA dulu / revisi. Publish hanya via
`npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved`
setelah approval; artifact QA tidak disyaratkan. Lihat
[publish-runbook](publish-runbook.md).

## Referensi

- [rd-03](../requirements/rd-03-video-editing-workflow.md),
  [ADR-0008](../adr/0008-four-phase-workflow.md),
  [design-system/visual-system](../design-system/visual-system.md),
  [agent-documentation-workflow](agent-documentation-workflow.md)
```

- [ ] **Step 3: data-model.md**

- Table header `| Entitas | Lokasi | Format | Owner (agent) |` → `| Entitas | Lokasi | Format | Owner (fase) |`
- Owner cells: `Agent 03` → `Screen Plan`; `Agent 02` (three rows) → `Story`; `Agent 04` → `Build`; `Agent 05` → `Screen Plan`; `Agent 06` → `Build`.
- After the `| Publish captions | ...` row insert:
  `| Creative brief | \`videos/<slug>/creative-brief.md\` | Markdown | Story |`
  and after the `| Overlay timeline | ...` row insert:
  `| Visual plan | \`videos/<slug>/visual-plan.md\` | Markdown | Screen Plan |`
- Headings: `## \`cut-list.json\` (Agent 02)` → `(Story)`; `## \`caption-beats.json\` (Agent 03)` → `(Screen Plan)`; `## \`asset-manifest.json\` (Agent 04)` → `(Build)`; `## \`overlay-timeline.json\` (Agent 05)` → `(Screen Plan)`.
- Before `## Komposisi HyperFrames (\`index.html\`)` insert:

```markdown
## `creative-brief.md` — Workflow Settings (Story)

Bagian `## Workflow Settings`: `visual_density` ∈ `light | medium | heavy`
(default `medium`), `gate_cut` ∈ `on | off` (default `off`). Hook `Status` selalu
`locked-from-transcript`.

## `visual-plan.md` (Screen Plan)

Markdown dengan bagian `Inputs`, `Strategy`, `Visual Decision Log` (time, line,
purpose, best real asset, simple asset option, imagegen candidate, decision,
reason), `Timeline` (ID, in–out, line, visual type, placement/track, motion,
SFX cue, illustrative, Gate 2 trigger), `Asset Briefs For Build`,
`Conflicts And Resolutions`, `Gate 2 Result`, `Handoff`. Template:
`docs/agents/references/visual-planning.md`.

```

- [ ] **Step 4: Other internal docs (exact replacements)**

- `architecture/stack.md`: `Dipanggil manual oleh Agent 02 | \`docs/agents/02-transcript-cut-agent.md\`` → `Dipanggil manual di fase Story | \`docs/agents/references/cut-and-pacing.md\``
- `architecture/nfr.md`: `Dari Agent 02 / style guide / Agent 07:` → `Dari fase Story (\`docs/agents/references/cut-and-pacing.md\`) / style guide / fase QA:`
- `design-system/visual-system.md`: `` `docs/dena-social-video-style-guide.md` + `docs/agents/03` & `05`. `` → `` `docs/dena-social-video-style-guide.md` + `docs/agents/references/captions.md` & `motion-grammar.md`. ``; `Dari \`index.html\` (nilai aktual) dan panduan Agent 06:` → `Dari \`index.html\` (nilai aktual) dan \`docs/agents/references/hyperframes-assembly.md\`:`; `## Motion primitives (default, Agent 05)` → `## Motion primitives (default, fase Screen Plan)`
- `requirements/rd-02-composition-render.md`: `` `docs/agents/06-hyperframes-assembly-agent.md`, `hyperframes.json`. `` → `` `docs/agents/03-build.md`, `docs/agents/references/hyperframes-assembly.md`, `hyperframes.json`. ``
- `requirements/rd-04-transcription-setup.md`: `Diturunkan dari setup docs, \`.gitmodules\`, dan Agent 02.` → `Diturunkan dari setup docs, \`.gitmodules\`, dan fase Story (\`docs/agents/references/cut-and-pacing.md\`).`
- `requirements/prd.md`: `1. Produksi video 7-agent →` → `1. Produksi video 4 fase →`
- `requirements/frd.md`: `(workflow 7 agent)` → `(workflow 4 fase)`; `| Workflow editing (7 agent) |` → `| Workflow editing (4 fase) |`
- `adr/0001-hyperframes-html-to-video.md`: `` - `docs/agents/06-hyperframes-assembly-agent.md`, AGENTS.md `` → `` - `docs/agents/references/hyperframes-assembly.md`, AGENTS.md ``
- `adr/0004-local-whisper-transcription.md`: `` - `docs/agents/02-transcript-cut-agent.md`, `docs/dena-social-video-style-guide.md` `` → `` - `docs/agents/references/cut-and-pacing.md`, `docs/dena-social-video-style-guide.md` ``
- `entrypoints/frd.md`: `(1) produksi video 7-agent →` → `(1) produksi video 4 fase →`
- `entrypoints/rd.md`: `— disiplin 7-agent + hook verbatim` → `— workflow 4 fase + gate + hook verbatim`
- `product/scope-principles.md`: replace the two lines `- Pipeline produksi video sosial Dena (7 agent: creative → cut → caption → aset →` / `  motion → assembly → QA opsional).` with `- Pipeline produksi video sosial Dena (4 fase: story → screen plan → build →` / `  QA opsional).`
- `product/onboarding.md`: `` `docs/skills/dena-video-editing-workflow/SKILL.md` → agent 01..06. `` → `` `docs/skills/dena-video-editing-workflow/SKILL.md` → fase 01..03 (QA opsional). ``
- `operations/agent-documentation-workflow.md`: in the sentence ending `lalu agent yang` / `relevan (\`docs/agents/\`).`, replace `agent yang` with `dokumen fase yang` (keep the line break).
- `operations/roadmap.md`: first run `git log --oneline pre-four-phase | grep -i -c imagegen` (expected ≥ 4). Then replace the whole `### Imagegen fix (Agent 04)` subsection (heading through the line `Verifikasi: perubahan docs-only (tanpa \`npm run check\` kecuali \`.html\` diubah).`) with:

```markdown
### Imagegen fix (selesai)
Spec `docs/asset-generation-imagegen-fix-spec.md` (arsip) sudah diterapkan.
Evaluasi image generation untuk setiap peluang visual-support kini tercatat
sebagai `Visual Decision Log` di `visual-plan.md` (fase Screen Plan,
`docs/agents/references/visual-planning.md`), dan QA gagal bila log itu hilang
(`docs/skills/dena-video-editing-workflow/references/quality-gates.md`).

### Validasi workflow 4 fase
Video asli pertama setelah [ADR-0008](../adr/0008-four-phase-workflow.md) menjadi
uji nyata struktur 4 fase. Catat temuan (gate, artifact, referensi yang dibaca)
dan revisi lewat ADR baru bila perlu.
```

- [ ] **Step 5: Style guide**

In `docs/dena-social-video-style-guide.md`:

(a) Replace from `Then route the work through the specialized agents in \`docs/agents/\`:` through the line `Do not jump to HyperFrames assembly before creative direction, cut logic, captions, assets, and motion are either completed or explicitly marked unnecessary.` with:

```markdown
Then route the work through the phase documents in `docs/agents/`:

1. `01-story.md` - source audit, transcript, angle, hook locked from transcript, cuts, base pacing, `processed.mp4`.
2. `02-screen-plan.md` - captions, then one visual plan: visual choices, overlay timing, pattern interrupts, zooms, SFX cues.
3. `03-build.md` - asset production, `index.html`, timed clips, tracks, GSAP, local asset wiring, render.
4. Optional at user review/publish gate: `04-qa.md` - QA, punch list, render/platform readiness review.

Do not jump to HyperFrames assembly before the Story and Screen Plan artifacts exist or are explicitly marked unnecessary.
```

(b) Replace from `## Default Edit Pipeline` up to (not including) `## HyperFrames Layer Contract` with:

```markdown
## Default Edit Pipeline

When user provides a raw vlog/monologue video:

1. Story phase (`docs/agents/01-story.md`)
   - Get duration, fps, resolution, audio levels.
   - Identify whether it is talking-head, handheld vlog, or mixed.
   - Check if existing burned-in captions/text exist.
   - Transcribe word-level before choosing the hook.
   - Choose content lane, hook tension, format, retention spine, visual grammar,
     visual density, and CTA.
   - From the complete transcript, rank at least three hook candidates and lock
     one verbatim excerpt containing the core tension or peak problem.
   - Move the locked excerpt to processed output `00:00.00-00:03.00`, remove its
     later duplicate unless it is an intentional callback, then continue with
     the explanation.
   - Cut silence/dead air.
   - Cut filler and repeated starts when meaning stays intact.
   - Keep human texture; do not remove every pause if it makes speech unnatural.
   - Build a tighter retention structure: hook, problem, insight, example, takeaway, CTA.
   - Write `creative-brief.md`, `metadata.json`, `transcript.json`, `edit-decision-notes.md`, and `cut-list.json`.

2. Audio cleanup and timing (Story phase, when creating `processed.mp4`)
   - Reduce noise.
   - Normalize speech loudness.
   - Enhance clarity.
   - Avoid harsh over-compression.
   - Default speed: `1.2x`.
   - If the speech becomes too rushed, use `1.12x-1.18x`.
   - Any exception to `1.2x` must be written in `edit-decision-notes.md` with the reason.
   - Keep cuts on sentence/phrase boundaries where possible.
   - Gate 1 (optional): show `processed.mp4` and the Cut Summary only when the user asks or `gate_cut: on`.

3. Caption plan (Screen Plan phase, captions step)
   - Create readable caption beats, hook text, ASR corrections, and highlight logic.
   - For storytelling/talking-head edits, cover every spoken word that survives the cut with running active captions; group words into readable 1-4 word beats instead of dropping words.
   - Write `caption-plan.md`, `caption-beats.json`, and `publish-captions.md`.

4. Visual plan (Screen Plan phase, visual step)
   - Decide which moments need screenshots, generated visuals, b-roll, diagrams, proof assets, overlays, cards, zooms, effects, or pattern interrupts.
   - If the user gives a URL or the story mentions a live tool/product/site, research/inspect it and plan local screenshots, screen recordings, or captures matched to the transcript timeline.
   - For every visual-support opportunity, write a `Visual Decision Log` entry in `visual-plan.md`; try Codex/image generation for grounded bitmap stills when a mood, abstract workflow, reset-attention, texture, transition, or background moment would otherwise become a stiff card/SVG.
   - Do not generate AI slop: reject generic, fake-looking, or transcript-detached generated assets.
   - Plan purposeful SFX cues for designed recuts, and keep them audible under speech instead of merely present as files.
   - Skip visuals only when they are explicitly unnecessary, and record that in `visual-plan.md`.
   - Write `visual-plan.md` and `overlay-timeline.json`.
   - Gate 2: stop only when a timeline row matches a risk trigger R1-R6.

5. Assets and visual layers in HyperFrames (Build phase)
   - Capture/generate the planned assets and record them in `assets/asset-manifest.json`.
   - Video/audio base layer.
   - Caption layer.
   - Effect layer.
   - Context overlay layer: text/sticker/image/video/screenshot.
   - CTA/end layer.
   - Keep layers editable until final render.

6. User review gate and optional QA
   - Render and send the edit to the user first (Gate 3).
   - Offer: publish as-is, QA first, or revisions.
   - Run the QA phase only when the user chooses QA first or asks for readiness/punch-list review, as a fresh-context subagent.
   - If QA runs, write `qa-report.md` and `qa-punch-list.md`.
   - Create `final-approval.md` only after QA passes.

```

(c) `If no intact phrase fits the window, route the hook back to Agent 01 or the user` → `If no intact phrase fits the window, stop and ask the user`

(d) `Do not default to a red-black villain palette unless Agent 01 explicitly chooses that direction.` → `Do not default to a red-black villain palette unless the Story phase brief explicitly chooses that direction.`

(e) `If an asset pass uses only screenshots, SVGs, labels, or text cards, \`asset-plan.md\` must explain the imagegen decision per visual opportunity.` → `If a visual plan uses only screenshots, SVGs, labels, or text cards, the \`Visual Decision Log\` in \`visual-plan.md\` must explain the imagegen decision per visual opportunity.`

(f) In the expected-files list, replace the two lines `- \`asset-plan.md\` and \`asset-manifest.json\`, when assets are needed.` / `- \`motion-plan.md\`.` with `- \`visual-plan.md\`.` / `- \`assets/asset-manifest.json\`, when assets exist.`

(g) `- Agent 07 must write a verdict in \`qa-report.md\`.` → `- The QA phase must write a verdict in \`qa-report.md\`.`; `Use Agent 07 verdicts only when QA runs:` → `Use QA phase verdicts only when QA runs:`

- [ ] **Step 6: Remaining docs and hooks**

- `docs/ai-agent-initial-setup.md`: `- Use Agent 02 for transcript/cut work.` → `- Use the Story phase (\`docs/agents/01-story.md\`) for transcript/cut work.`; `- Use Agent 06 only when editing HyperFrames composition HTML.` → `- Use the Build phase (\`docs/agents/03-build.md\`) only when editing HyperFrames composition HTML.`
- `docs/repliz/integration-spec.md`: `# Jika user memilih QA dulu, jalankan Agent 07 lalu kembali ke gate review ini.` → `# Jika user memilih QA dulu, jalankan fase QA (docs/agents/04-qa.md) lalu kembali ke gate review ini.`
- `docs/blueprints/dena-video-editing-project-reverse-engineering-blueprint.md`: insert as the second line (after the H1):
  `> Catatan: struktur sebelum 2026-09 (7 agent). Struktur berlaku: ADR-0008 (\`internal/docs/adr/0008-four-phase-workflow.md\`).`
- `.claude/hooks/ensure-docs-updated.py`: `#   docs/agents/    -> kontrak workflow 7-agent (perilaku produksi)` → `#   docs/agents/    -> kontrak workflow 4 fase + references (perilaku produksi)`
- `.codex/hooks/ensure-learning-docs.py`: `    assert is_doc("docs/agents/02-transcript-cut-agent.md")` → `    assert is_doc("docs/agents/01-story.md")`

- [ ] **Step 7: Run V2 + V3 and the hook self-tests**

```bash
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs --check v2,v3; echo "exit=$?"
python3 .codex/hooks/ensure-learning-docs.py --self-test
python3 .claude/hooks/ensure-docs-updated.py < /dev/null; echo "hook-exit=$?"
```
Expected: `PASS: v2, v3`, `exit=0`; `ensure-learning-docs self-test passed`; no JSON output and `hook-exit=0`. Fix any remaining hit by editing the named line (never by widening `ARCHIVE` or loosening `STALE`).

- [ ] **Step 8: Commit**

```bash
git add -A internal/docs docs/dena-social-video-style-guide.md docs/ai-agent-initial-setup.md docs/repliz/integration-spec.md docs/blueprints .claude/hooks/ensure-docs-updated.py .codex/hooks/ensure-learning-docs.py
git commit -q -F - <<'EOF'
docs: sync internal docs, style guide, and hooks to four-phase workflow

Operations workflow rewritten per phase; data model gains visual-plan.md
and brief workflow settings; stale agent references removed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Fresh-context walkthrough (V4) and final verification

**Files:** fixes only, in whichever phase/reference doc a finding names.

- [ ] **Step 1: Dispatch the walkthrough subagent**

Agent tool, `subagent_type: general-purpose`, prompt:

```text
You are reviewing a documentation-defined video editing workflow. Do not edit files.
Read only: AGENTS.md, docs/skills/dena-video-editing-workflow/SKILL.md,
docs/skills/dena-video-editing-workflow/references/phase-chain.md,
docs/skills/dena-video-editing-workflow/references/quality-gates.md,
docs/agents/*.md, docs/agents/references/*.md, docs/dena-social-video-style-guide.md.

Simulate this job end to end: a 60-second 9:16 talking-head raw video
raw/demo.mp4 in Indonesian where the speaker names a CRM tool with a URL and
says "omzet naik 3 kali" once. The user chooses QA first at Gate 3.

Walk through Story, Screen Plan, Build, and QA. Report, with file:line for each item:
1. For every phase, each input it needs and which earlier phase produces it; flag any input no phase produces.
2. Any artifact name or path that differs between two documents.
3. For each trigger R1-R6: whether it is decidable from visual-plan.md alone, and which timeline row in this job would trip it.
4. Contradictions between any two documents.
5. Any instruction that names a file, section, or heading that does not exist.
6. Any step that tells a phase to read another phase's document instead of an artifact.
Reply as a numbered list; say "none" for an empty category.
```

- [ ] **Step 2: Fix findings**

For each reported item, edit the named doc at the named line so the item is resolved; keep moved text verbatim unless the finding is a real contradiction (then change the phase doc, not the reference). Record each fix in one line for the final report.

- [ ] **Step 3: Re-run the walkthrough once**

Dispatch a new subagent with the same prompt. Expected: categories 1, 2, 4, 5, 6 are "none"; category 3 names the "omzet naik 3 kali" row under R1 only if it is not verbatim-sourced (it is verbatim, so R1 must not trip — the subagent should say so). If new real issues appear, fix them and stop; do not loop a third time without asking the user.

- [ ] **Step 4: Full verification**

```bash
node docs/superpowers/plans/2026-09-26-four-phase-workflow-verify.mjs; echo "exit=$?"
python3 .codex/hooks/ensure-learning-docs.py --self-test
git status --short
```
Expected: `PASS: v1, v2, v3`, `exit=0`; `ensure-learning-docs self-test passed`; only the Step 2 fixes listed as modified.

- [ ] **Step 5: Commit**

```bash
git add -A docs/agents docs/skills internal/docs AGENTS.md CLAUDE.md docs/dena-social-video-style-guide.md
git commit -q -F - <<'EOF'
docs: resolve four-phase walkthrough findings

V1-V3 pass; fresh-context walkthrough rerun clean.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
If Step 2 produced no fixes, skip this commit.

- [ ] **Step 6: Final report to the user**

List: commits on the branch (`git log --oneline pre-four-phase..HEAD`), docs created/changed/deleted, V1–V5 results, walkthrough findings and fixes, and that the branch is not merged or pushed.
