# Quality Gates

Use this reference before claiming a Dena video edit is ready, rendered, or publishable.

## Dena Style Gate

The edit must:

- use Indonesian by default
- preserve Dena's natural voice: `gue`, `lo`, direct, practical, founder/developer tone
- create a strong first `0-3s` hook
- avoid generic motivational language
- avoid random sticker/meme clutter
- use reference videos as mechanics, not identity copying
- end with one clear CTA
- keep CTA non-promissory unless the user explicitly approved a promise

## Pacing Gate

The base edit must:

- use `1.2x` speed for Dena storytelling/talking-head content by default
- document any lower speed in `edit-decision-notes.md`
- keep speech clear enough for viewers to follow without strain

## Caption Gate

Captions must:

- be readable at phone size
- stay out of platform bottom controls
- avoid covering mouth, face, or key objects
- use short phrase beats, ideally `1-4` words
- account for every spoken word in the locked processed transcript for storytelling/talking-head edits
- highlight only meaningful words or short phrases
- use yellow sparingly
- match speech timing closely
- correct obvious ASR issues for tools, names, Indonesian/English mixed terms

## Overlay And Asset Gate

Every overlay or asset must do at least one job:

- clarify what Dena is saying
- prove a point
- reset attention
- show a tool/workflow/dashboard concretely
- transition between ideas
- support CTA

Reject assets that are generic, fake-looking, privacy-risky, unreadable, or unrelated.

If the user provides a URL or the transcript mentions a tool/product/site, Agent 04 must either:

- provide local screenshot/screen-record assets matched to transcript windows, or
- document why capture was unnecessary or unsafe and provide a better generated/diagram alternative.

When `asset-plan.md` exists, QA must check for an `Imagegen Decision Log`.

Fail Agent 04 output when:

- visual assets exist but `asset-plan.md` has no `Imagegen Decision Log`
- an asset opportunity says no generated media was needed without an `imagegen_candidate` decision
- a mood, background, reset-attention, texture, transition, or abstract workflow moment uses only a stiff card/SVG and does not explain why image generation was skipped
- a generated asset has no provenance or prompt summary in `asset-manifest.json`
- a generated asset looks generic, fake, or detached from transcript context

Generated images/video are acceptable when grounded in the brief and clearly not presented as real proof.

## Motion And SFX Gate

Designed recuts must:

- use pattern interrupts at a useful cadence for the content lane
- include purposeful SFX cue notes when transitions, proof reveals, or title hits need impact
- verify SFX is audible in the final render but does not cover speech
- avoid motion/SFX that feels generic, chaotic, or detached from the transcript

## HyperFrames Gate

For `.html` composition work:

- root has `data-composition-id`, `data-width`, `data-height`, `data-duration`
- every timed element has `data-start`, `data-duration`, `data-track-index`
- every visible timed element has `class="clip"`
- same-track clips do not overlap
- video is muted
- separate audio element exists
- GSAP timeline is paused
- timeline key matches the composition id in `window.__timelines`
- assets are local
- no `Date.now()`, `Math.random()`, timers, network fetches, or remote render assets

Run after any `.html` edit:

```bash
npm run check
```

Fix errors before handoff. Review warnings before render.

## Optional QA Verdict Gate

Run this gate only when the user chooses QA first, asks whether the edit is ready, requests a punch list, or needs regression review.

Use Agent 07 verdicts:

- `pass`: ready for final render or publish.
- `pass-with-minor-notes`: usable, with non-blocking polish notes.
- `revise`: not ready; major viewer/style issue remains.
- `blocked`: cannot review because inputs, preview, render, or verification evidence are missing.

Do not create `final-approval.md` unless the verdict is `pass`.

## Render Gate

Before final render:

1. Run `npm run check`.
2. Preview keyframes: first frame, `1.5s`, `3s`, first caption, densest caption, first overlay, most complex motion, CTA, final frame.
3. Confirm no private data is visible.
4. Confirm audio sync and end cut.
5. Render only after blockers are gone.

After render, do a basic export sanity check before user review: file exists, duration is plausible, audio is present when expected, and the first/last frames are not blank. Full Agent 07 QA waits until the user chooses QA first.

## Publish Gate

User review is mandatory. QA is optional and lives inside this review/publish gate.

1. Render the MP4 and send the result to the user.
2. Offer three paths: publish as-is, run QA first, or request revisions.
3. If the user chooses publish as-is, QA artifacts are not required.
4. If the user chooses QA first, run Agent 07, then return here for explicit publish approval.
5. Only after explicit approval/confirmation, run:

```bash
npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved
```

The script must refuse upload/scheduling without `--approved`. R2 uses Wrangler
remote upload to bucket from `R2_BUCKET` and public base `https://<r2-public-domain>`.
Do not call Repliz during QA unless the user explicitly requests it.
