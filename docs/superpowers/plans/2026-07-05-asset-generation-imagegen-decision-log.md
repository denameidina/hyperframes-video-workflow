# Asset Generation Imagegen Decision Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Agent 04 actively decide whether Codex/image generation should be used for each visual opportunity, instead of silently defaulting to screenshots, SVGs, or text cards.

**Architecture:** This is a docs-contract fix, not a tooling change. Update Agent 04 as the source of truth, then add matching style-guide, quality-gate, and top-level instruction hooks so future video workflows require an `Imagegen Decision Log` before skipping generated assets.

**Tech Stack:** Markdown workflow docs, Dena agent chain, existing HyperFrames video project conventions.

---

## Scope

In scope:

- Add an `Imagegen Decision Log` requirement to Agent 04.
- Define when image generation must be tried.
- Define when image generation must not be used.
- Update the `asset-plan.md` template.
- Add QA checks for missing decision logs and weak generated assets.
- Mirror the short rule in top-level agent instructions.

Out of scope:

- New image-generation scripts.
- New dependencies.
- Rewriting old video asset plans.
- Forcing generated images into proof moments where screenshots/source footage are better.

## File Structure

- Modify: `docs/agents/04-asset-generation-agent.md`
  - Owns the actual Agent 04 behavior and `asset-plan.md` template.
- Modify: `docs/skills/dena-video-editing-workflow/references/quality-gates.md`
  - Owns QA pass/fail checks for asset outputs.
- Modify: `docs/dena-social-video-style-guide.md`
  - Owns Dena-specific workflow summary.
- Modify: `AGENTS.md`
  - Top-level instruction for agents in this repo.
- Modify: `CLAUDE.md`
  - Mirror of top-level instruction used by Claude-compatible agents.

## Task 1: Update Agent 04 Decision Rules

**Files:**

- Modify: `docs/agents/04-asset-generation-agent.md`

- [ ] **Step 1: Insert the decision-log rule after `### 3. Choose Asset Type`**

Add this text after the generated-video priority paragraph:

```md
### 3A. Imagegen Decision Log

For every visual-support opportunity, write an `Imagegen Decision Log` entry in `asset-plan.md` before deciding that generated media is unnecessary.

Required fields:

| Field | Meaning |
| --- | --- |
| `time` | Transcript window |
| `purpose` | clarify, prove, contrast, reset-attention, background, etc. |
| `best_real_asset` | source footage, screenshot, screen recording, user media, or `none` |
| `simple_asset_option` | diagram, text-support visual, sticker, or `none` |
| `imagegen_candidate` | `yes` or `no` |
| `decision` | `generate`, `use-real`, `use-diagram`, `skip` |
| `reason` | One concrete sentence tied to the transcript |

Do not write "no generated image needed" unless this log explains why for each visual opportunity.
```

- [ ] **Step 2: Add the required-to-try rule after `### 5. Generate Or Prepare Asset`**

Add this text after the existing preparation bullet list:

```md
Image generation must be tried at least once when all are true:

- The asset purpose is `background`, `metaphor`, `abstract AI/workflow idea`, `transition`, `reset-attention`, `texture`, or `impossible b-roll`.
- The asset is not being used as factual proof.
- The current alternative would be a stiff text card, generic SVG, or empty decorative background.
- The prompt can be grounded in the transcript without fake UI, fake client data, generated people, or robot/neon AI cliches.

If the generated result looks generic or fake after one revision, remove it and document the rejection in `asset-plan.md`.
```

- [ ] **Step 3: Add the must-not-generate rule after the required-to-try rule**

Add this text immediately after Step 2's block:

```md
Do not generate when:

- The asset's primary purpose is `prove` and a real capture/source frame exists.
- The viewer needs to inspect a real product, repo, website, app, dashboard, or code state.
- The only possible prompt would create fake evidence.
- The video is family/vlog or emotionally human, and source footage already carries the moment.
- The user explicitly asks for no generated assets.
```

- [ ] **Step 4: Update the `Asset Manifest Format` generated-entry guidance**

After the sample manifest entry, add:

````md
For generated assets, also include:

```json
{
  "promptSummary": "Vertical founder desk workflow still, no readable text, no people, no fake UI.",
  "rejectedAlternatives": ["static text card felt stiff"]
}
```
````

- [ ] **Step 5: Update the `Asset Plan Template`**

Add this section between `## Asset List` and `## Prompts`:

```md
## Imagegen Decision Log

| Time | Purpose | Best real asset | Simple asset option | Imagegen candidate | Decision | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| 0.0-3.0 | reset-attention | none | hook text card | yes | generate | The hook needs a grounded visual plate, and a static text card would feel stiff. |
```

- [ ] **Step 6: Verify Agent 04 docs contain the new contract**

Run:

```bash
rg -n "Imagegen Decision Log|imagegen_candidate|must be tried|Do not generate when|promptSummary|rejectedAlternatives" docs/agents/04-asset-generation-agent.md
```

Expected: every phrase appears at least once.

- [ ] **Step 7: Commit Agent 04 update**

```bash
git add docs/agents/04-asset-generation-agent.md
git commit -m "docs: require imagegen decision log in asset agent"
```

## Task 2: Add QA Gate Coverage

**Files:**

- Modify: `docs/skills/dena-video-editing-workflow/references/quality-gates.md`

- [ ] **Step 1: Add decision-log failure criteria under the Asset Gate**

Add this text in the asset quality section after the existing URL/tool/product requirement:

```md
When `asset-plan.md` exists, QA must check for an `Imagegen Decision Log`.

Fail Agent 04 output when:

- visual assets exist but `asset-plan.md` has no `Imagegen Decision Log`
- an asset opportunity says no generated media was needed without an `imagegen_candidate` decision
- a mood, background, reset-attention, texture, transition, or abstract workflow moment uses only a stiff card/SVG and does not explain why image generation was skipped
- a generated asset has no provenance or prompt summary in `asset-manifest.json`
- a generated asset looks generic, fake, or detached from transcript context
```

- [ ] **Step 2: Verify QA gate text is discoverable**

Run:

```bash
rg -n "Imagegen Decision Log|imagegen_candidate|prompt summary|generic, fake" docs/skills/dena-video-editing-workflow/references/quality-gates.md
```

Expected: all phrases appear in the quality-gate file.

- [ ] **Step 3: Commit QA gate update**

```bash
git add docs/skills/dena-video-editing-workflow/references/quality-gates.md
git commit -m "docs: add imagegen asset QA gate"
```

## Task 3: Update Dena Style Guide Summary

**Files:**

- Modify: `docs/dena-social-video-style-guide.md`

- [ ] **Step 1: Replace the loose asset-plan imagegen bullet**

In the `Asset plan` section, replace:

```md
- Use Codex/image generation for grounded bitmap stills or short support visuals when real captures and simple diagrams do not carry the idea.
```

with:

```md
- For every visual-support opportunity, Agent 04 must write an `Imagegen Decision Log`; try Codex/image generation for grounded bitmap stills when a mood, abstract workflow, reset-attention, texture, transition, or background moment would otherwise become a stiff card/SVG.
```

- [ ] **Step 2: Add one revision-learning bullet**

In `Revision learnings from raw talking-head workflow edits`, add:

```md
- Do not skip generated stills by default. If an asset pass uses only screenshots, SVGs, labels, or text cards, `asset-plan.md` must explain the imagegen decision per visual opportunity.
```

- [ ] **Step 3: Verify style guide references the new rule**

Run:

```bash
rg -n "Imagegen Decision Log|Do not skip generated stills" docs/dena-social-video-style-guide.md
```

Expected: both phrases appear.

- [ ] **Step 4: Commit style guide update**

```bash
git add docs/dena-social-video-style-guide.md
git commit -m "docs: document Dena imagegen decision rule"
```

## Task 4: Mirror Top-Level Agent Instructions

**Files:**

- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Dena non-negotiable bullet in both files**

Replace:

```md
- Use Codex/image generation for grounded bitmap support assets when real captures are not enough. Do not default to stiff cards/SVGs if a generated still, texture, or short visual can explain the idea better.
```

with:

```md
- Agent 04 must write an `Imagegen Decision Log` for every visual-support opportunity; use Codex/image generation for grounded bitmap support assets when a mood, abstract workflow, reset-attention, texture, transition, or background moment would otherwise become a stiff card/SVG.
```

- [ ] **Step 2: Verify both top-level files match**

Run:

```bash
rg -n "Imagegen Decision Log" AGENTS.md CLAUDE.md
```

Expected: one match in each file.

- [ ] **Step 3: Commit top-level instruction update**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: mirror imagegen decision log instruction"
```

## Task 5: Final Verification

**Files:**

- Read: `docs/asset-generation-imagegen-fix-spec.md`
- Read: all modified docs

- [ ] **Step 1: Confirm spec coverage**

Run:

```bash
rg -n "Imagegen Decision Log|imagegen_candidate|generated-still|promptSummary|rejectedAlternatives|Do not generate when|must be tried" docs/agents/04-asset-generation-agent.md docs/skills/dena-video-editing-workflow/references/quality-gates.md docs/dena-social-video-style-guide.md AGENTS.md CLAUDE.md
```

Expected: the output shows the decision log, candidate field, generated asset provenance, generation-required rule, and generation-forbidden rule.

- [ ] **Step 2: Confirm no composition check is needed**

Run:

```bash
git diff --name-only HEAD~4..HEAD
```

Expected: only Markdown files are listed. If any `.html` file appears, run `npm run check`.

- [ ] **Step 3: Review the final diff**

Run:

```bash
git diff --stat HEAD~4..HEAD
git diff HEAD~4..HEAD -- docs/agents/04-asset-generation-agent.md docs/skills/dena-video-editing-workflow/references/quality-gates.md docs/dena-social-video-style-guide.md AGENTS.md CLAUDE.md
```

Expected: docs-only diff, no script or composition changes.

## Self-Review

Spec coverage:

- Decision log requirement: Task 1.
- Required-to-try imagegen moments: Task 1.
- Must-not-generate moments: Task 1.
- Generated manifest metadata: Task 1.
- QA failure routing: Task 2.
- Style guide summary: Task 3.
- Top-level agent contract: Task 4.
- Verification: Task 5.

Placeholder scan:

- No placeholder tokens are present.
- No open-ended "handle edge cases".
- No undefined tool or script.

Type consistency:

- The same field names are used everywhere: `Imagegen Decision Log`, `imagegen_candidate`, `promptSummary`, `rejectedAlternatives`, `generated-still`.
