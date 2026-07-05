# Asset Generation Imagegen Fix Spec

## Problem

Agent 04 technically allows Codex/image generation, but current workflow makes it a weak fallback. In recent Dena edits, `asset-plan.md` chose screenshots, SVG diagrams, labels, and SFX, then wrote "no generated image needed" without a required decision log.

Result: image generation never happens unless a human explicitly asks for it.

## Goal

Make Agent 04 actively evaluate image generation for every visual-support opportunity, while still rejecting generic AI slop and never using generated media as fake proof.

## Non-Goals

- Do not add a new image-generation script or dependency.
- Do not force generated images into every video.
- Do not replace real screenshots, screen recordings, or source footage when they are the better proof.
- Do not generate fake dashboards, fake client evidence, or Dena likenesses.

## Required Workflow Change

Agent 04 must add an `Imagegen Decision Log` to every `asset-plan.md` when assets are needed.

Each visual opportunity must answer:

| Field | Required meaning |
| --- | --- |
| `time` | Transcript window |
| `purpose` | clarify, prove, contrast, reset-attention, background, etc. |
| `best_real_asset` | source footage, screenshot, screen recording, user media, or `none` |
| `simple_asset_option` | diagram, text-support visual, sticker, or `none` |
| `imagegen_candidate` | `yes` or `no` |
| `decision` | `generate`, `use-real`, `use-diagram`, `skip` |
| `reason` | One concrete sentence tied to the transcript |

Agent 04 may only write "no generated image needed" after this log exists.

## When Image Generation Is Required To Be Tried

Agent 04 must create at least one generated-still candidate when all are true:

- The asset purpose is `background`, `metaphor`, `abstract AI/workflow idea`, `transition`, `reset-attention`, `texture`, or `impossible b-roll`.
- The asset is not being used as factual proof.
- The current alternative would be a stiff text card, generic SVG, or empty decorative background.
- The prompt can be grounded in the transcript without fake UI, fake client data, generated people, or robot/neon AI cliches.

If the generated result looks generic or fake after one revision, remove it and document the rejection.

## When Image Generation Must Not Be Used

Do not generate when:

- The asset's primary purpose is `prove` and a real capture/source frame exists.
- The viewer needs to inspect a real product, repo, website, app, dashboard, or code state.
- The only possible prompt would create fake evidence.
- The video is family/vlog or emotionally human, and source footage already carries the moment.
- The user explicitly asks for no generated assets.

## Asset Manifest Change

For generated assets, `asset-manifest.json` entries must include:

```json
{
  "type": "generated-still",
  "provenance": "generated",
  "source": "Codex/image generation",
  "promptSummary": "Vertical founder desk workflow still, no readable text, no people, no fake UI.",
  "rejectedAlternatives": ["static text card felt stiff"]
}
```

For non-generated visual assets, the manifest does not need new fields. The decision log in `asset-plan.md` is enough.

## Documentation Patch Plan

1. Update `docs/agents/04-asset-generation-agent.md`.
   - Add the `Imagegen Decision Log` requirement to the asset decision workflow.
   - Add the "required to be tried" and "must not be used" rules.
   - Update the `asset-plan.md` template with the new section.

2. Update `docs/skills/dena-video-editing-workflow/references/quality-gates.md`.
   - QA must fail Agent 04 output when assets exist but there is no imagegen decision log.
   - QA must fail generated assets that look generic, fake, or detached from transcript context.

3. Update `docs/dena-social-video-style-guide.md`.
   - Replace loose "use image generation when real captures are not enough" language with the decision-log rule.

4. Optionally mirror the short non-negotiable in `AGENTS.md` and `CLAUDE.md`.
   - Keep this to one bullet only; avoid duplicating the full spec.

## Acceptance Criteria

- Future `asset-plan.md` files cannot simply say "No generated-image prompts used" without a decision log.
- At least one generated-still candidate is produced for abstract/mood/background/pattern-interrupt moments when real proof is not the point.
- Real screenshots still win for proof moments.
- Generated assets include prompt summary and provenance.
- QA can route failures back to Agent 04 with a concrete reason.

## Verification

Docs-only change. No `npm run check` required unless `.html` composition files are edited.
