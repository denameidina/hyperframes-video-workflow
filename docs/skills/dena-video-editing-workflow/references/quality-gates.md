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

## Caption Gate

Captions must:

- be readable at phone size
- stay out of platform bottom controls
- avoid covering mouth, face, or key objects
- use short phrase beats, ideally `1-4` words
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

## QA Verdict Gate

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

After render, review the MP4 separately from the source HTML for font fallback, blank frames, z-index issues, audio loss, timing drift, and export duration mismatch.
