# Project Audit Remediation Implementation Plan

> **For agentic workers:** Execute this plan in the current session. Steps use checkbox (`- [x]`) syntax for tracking; the user has authorized fixing every audit finding through verification.

**Goal:** Close the project/documentation audit findings without video publishing or changing personal voice configuration.

**Architecture:** Retain the existing Node/Python modules and JSON contracts. Persist publish receipts atomically after each scheduling result, preserve all target history, and use one final-render selection rule in gates and Studio. Keep canonical documentation and entrypoints consistent.

**Tech Stack:** Node.js 22+, node:test, Python 3, Git, HyperFrames 0.7.24, FFmpeg.

**Spec:** RD-01 (publish), RD-02 (composition), RD-03 (workflow/gates), RD-05 (Studio), RD-07 (documentation hooks), and the project audit reported on 2026-09-30.

## Global Constraints

- No live R2 upload or Repliz request; publish tests inject command/network doubles.
- Preserve the pre-existing changes in `config/voices.json` and `config/pronunciation.json`.
- Write EARS changes before implementation; register new docs in the canonical index.
- Validate root HTML with `npm run check` and video HTML with `npm run video -- check <slug>` if changed.
- The audit initially ended with reviewable workspace changes. The user's subsequent
  instruction authorizes committing the audit fixes and pushing to `main`; the
  pre-existing voice configuration edits remain outside that commit. Video publishing
  to R2/Repliz remains outside this task.

## Review Focus

- Blocked or temporarily disabled target accounts retain their prior schedule IDs across multiple runs.
- A polling or receipt-write failure cannot silently discard successful scheduling results or continue scheduling after persistence fails.
- Missing/empty storyboard artifacts cannot be approved; both music formats and explainers obey this rule.
- A newer blur render invalidates approval of an older normal render and is the exact file shown by Studio.
- Hook enforcement handles unstaged, staged, renamed, and Unicode paths, canonical learning docs, and only an explicit mechanical exception from the assistant.

## Task 1: Publish durability

**Files:** `scripts/repliz-publish.mjs`, `scripts/repliz-publish.test.mjs`, RD-01, ADR-0028, publish/data/API/NFR docs.
**Interfaces:** `createSchedules` accepts an optional async checkpoint callback; `runPublish` returns the existing `{ skipped, receipt, blocked }` shape.

- [x] Update RD-01 and record ADR-0028 for incremental atomic receipts.
- [x] Add failing regressions for blocked + new targets + third run, disabled target history, and poll failure followed by resume.
- [x] Save every scheduling result before the next POST; propagate checkpoint-write errors; preserve historical entries and save receipts through rename.
- [x] Run the publish suite (included in `npm test`) and review the failure/resume branches.

## Task 2: Gate completeness and render selection

**Files:** `scripts/lib/gates.mjs`, `scripts/generate-gates.test.mjs`, `scripts/studio/generate.mjs`, `scripts/studio.test.mjs`, RD-03, RD-05, data/API/frontend docs.
**Interfaces:** A shared `finalRender` resolver selects the newest nonempty regular `<slug>.mp4` or `<slug>-blur.mp4` (normal wins a timestamp tie). Fingerprints contain all required gate files.

- [x] Write gate EARS for required nonempty files and shared render selection.
- [x] Add failing regressions for incomplete storyboards, both formats, blur-only output, replacement renders, and the Studio player/fingerprint agreement.
- [x] Implement readiness and strict fingerprints; update incomplete old test fixtures with their required storyboard document.
- [x] Run the video/gate and Studio suites (included in `npm test`).

## Task 3: Documentation hooks

**Files:** `.codex/hooks/ensure-learning-docs.py`, `.claude/hooks/ensure-docs-updated.py`, `scripts/doc-hooks.test.mjs`, RD-07, documentation-operation docs, AGENTS/CLAUDE.
**Interfaces:** Both hooks retain their JSON block protocol. The mechanical exemption is an assistant line `no docs update needed: <reason>`; it never satisfies an outstanding learning requirement.

- [x] Write RD-07 before changing either hook.
- [x] Run failing tests against temporary Git repositories for unstaged and renamed paths, canonical learning updates, and mechanical exceptions.
- [x] Parse Git porcelain with NUL delimiters; include canonical docs in freshness checks; accept the documented explicit exception in both hooks.
- [x] Run the documentation-hook suite (included in `npm test`).

## Task 4: Documentation and CI synchronization

**Files:** README/setup/onboarding/runbook, architecture docs, RD-02/RD-03, workflow references, AGENTS/CLAUDE, CI and package scripts.

- [x] Correct root vs per-video commands, `shared/` vs legacy `raw/`, and per-source vs processed transcript paths.
- [x] Unify provenance values, sub-composition clip exceptions, mode-specific artifacts/gates, and the R4 hook window.
- [x] Document every Studio route with request/response, status, authentication, and mutation behavior; correct publish side-effect timing and the broken link.
- [x] Make CI run all local test files, including craft-kit, asset-lib, and hooks; document the aggregate command.
- [x] Check active Markdown links and scan for stale operational instructions.

## Task 5: Final verification and audit closure

- [x] Run the complete local test suite and any required composition checks.
- [x] Review the diff against every audit finding and resolve regressions.
- [x] Record the evidence and any remaining limitations below; verify personal config changes remain untouched.

## Closure Evidence

Closed on 2026-09-30. All findings from the project/document sync audit were resolved
before release, including the Studio recovery case found during independent review.
The user subsequently requested a commit and push to `main`. No live Repliz call,
R2 upload, or personal voice configuration change was performed.

### Finding-to-fix ledger

| Audit finding | Resolution | Evidence |
| --- | --- | --- |
| Blocked target history disappears when another platform is scheduled | Retain all prior target entries and upsert only the matching account | Multi-run regression: changed Instagram + new TikTok + third ordinary run stays blocked |
| Temporarily disabled account is mistaken for a new target when re-enabled | Keep inactive targets in receipt history | Disable TikTok, add Threads, then reactivate; no duplicate POST |
| Successful schedule IDs lost when polling fails | Checkpoint every scheduling result before next POST/poll; atomic sibling rename | Poll failure leaves pending IDs; ordinary retry only GET-polls them |
| Persistence failure can continue outbound scheduling | Await callback outside API catch and propagate its error | Regression stops after first POST when checkpoint throws |
| Blur final render absent from gate/Studio | Shared newest nonempty regular normal/blur resolver, actual filename fingerprint | Blur-only approval in all three formats, newer variant reopens gate, Studio serves exact selected render |
| Partial storyboard can be approved | Require nonempty storyboard document and every discovered sheet; reject partial fingerprints | Missing/empty storyboards tested in all three formats |
| Codex misses unstaged/Unicode/renamed files | Parse NUL-delimited porcelain, including both rename paths | Real temporary Git repository hook tests |
| Canonical learning docs ignored | Include internal/docs in freshness scan | Learning is satisfied by an updated canonical doc and state clears |
| Mechanical exception promised but not implemented | Assistant-only standalone line with same-line nonempty reason; learning cannot bypass | Both runtime hook regressions, including empty reason and user-prompt rejection |
| Publish key/skip/history documentation stale | Per-target targetKey includes title/replies; pending GET resume and durable full history documented | RD-01, ADR-0011/0028, API/data/NFR, integration spec and runbook aligned |
| Root vs video commands, legacy raw and transcript paths stale | Blank root template; per-slug check/render; shared/sources and transcripts/id vs processed transcript | README, setup, onboarding, runbook, blueprint, AGENTS/CLAUDE aligned |
| Provenance enum incomplete | Fourteen supported values include cc0, dena-footage, user, reconstructed, pd-archive | Data model, asset-production and RD-03 agree |
| clip rule conflicts with sub-composition mounts | Ordinary timed clips use class=clip; data-composition-src mounts omit it | RD-02, assembly/style/QA references, entrypoints and glossary agree |
| Music-format captions/readiness/gates conflict | Mode-specific handoff table; no voice/transcript/caption-beats/separate BGM; Gate 1 Result before Build | RD-03-03/13/102, phase docs, generate reference/router/quality gates aligned |
| Studio server/API omitted from architecture docs | Document every implemented route, auth, request/response/status/SSE and mutation/retry behavior | API Contract section 5, Stack, RD-05 and onboarding updated |
| CI misses local suites | npm test discovers every scripts/*.test.mjs; CI uses it with Node 24, Python 3 and FFmpeg | Includes craft-kit, asset-lib, and new hooks suite |
| R4 still assumes fixed first three seconds | Use 0–hook_end consistently in active workflow/style/QA references | Stale operational instruction scan returned no matching obsolete rules |
| Publish failures incorrectly described as all before side effects | Separate pre-upload checks from post-upload reachability/account validation; document no rollback | Publish runbook + integration spec + API contract aligned |
| Broken publish-runbook link | Correct relative integration-spec path | Active Markdown link scan: 107 files, zero broken links |
| Additional Studio directory-artifact failure | Safe reads; incomplete phase stays visible; invalid preview/media denied | New real HTTP regression; independent reviewer verified Studio 54/54 |

### Final verification

- `npm test`: **420 passed, 0 failed, 0 skipped** (baseline audit: 401 tests).
- `npm run check`: exit 0, zero lint warnings/errors and zero layout issues.
- `npm run video -- check <slug>`: exit 0 for ai-agent-gagal, badiblum-storynight-explainer, badiblum-storynight-post, and hanoman; all report zero errors and no console errors.
- Active Markdown links: **107 documents scanned, 0 broken**; every canonical document is registered in internal/docs/README.md.
- `git diff --check`: clean. Independent read-only review found no remaining material issue after the Studio recovery fix.
- Existing changes in config/voices.json and config/pronunciation.json were preserved; no video HTML was edited.

### Practical limits and reviewed existing warnings

The checks still emit the same non-blocking video warnings seen in the original audit: ai-agent-gagal has two track-density and two overlap warnings; hanoman has two density warnings; badiblum-storynight-explainer has 35 contrast and two layout warnings. Existing assembly-notes describe their intentional layout/animation and still-frame review. They were not identified as project/document sync defects, and this repair did not redesign private video compositions. Root and badiblum-storynight-post are clean. The npm user configuration also emits a side-effects-cache warning outside this project's configuration.

A Repliz POST whose response is lost before its ID reaches the client is still externally ambiguous; error targets are retried by an explicit rerun, so inspect Repliz first. The fixes cover successfully received IDs and atomic process-level receipt replacement, not remote transactions, power-loss fsync, or concurrent direct CLI publishes. Local injected-boundary tests were run; the modified GitHub Actions workflow has not yet run remotely.

### Documents changed

- Canonical index/entrypoint: internal/docs/README.md, internal/docs/entrypoints/rd.md.
- Requirements: RD-01, RD-02, RD-03, RD-05, RD-07, requirements/frd.md.
- Decisions: ADR-0001/0011 clarifications; new ADR-0028.
- Architecture: api-contract.md, data-model.md, nfr.md, stack.md; frontend/composition-implementation.md.
- Operations: agent-documentation-workflow.md, implementation-standard.md, publish-runbook.md, runbook.md, video-editing-workflow.md, this remediation record.
- Product/security: blueprint.md, onboarding.md, security-standard.md.
- Entry doors/setup: README.md, AGENTS.md, CLAUDE.md, initial-setup.md, ai-agent-initial-setup.md.
- Production contracts: phase 02/03, dena-social-video-style-guide.md, asset-production.md, generate-mode.md, hyperframes-assembly.md, motion-broll-planning.md, qa-checklist.md, styles/README.md.
- Workflow skill: dena-video-editing-workflow/SKILL.md plus phase-chain.md and quality-gates.md; publish integration-spec.md.
