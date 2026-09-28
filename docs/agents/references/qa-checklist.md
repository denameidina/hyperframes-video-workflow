# QA Checklist (Reference)

Verdicts, severity, review axes, procedure, and report formats for the optional
QA phase. Loaded by `docs/agents/04-qa.md`.

## Verdicts

Use exactly one verdict:

- `pass`: ready for final render or publish.
- `pass-with-minor-notes`: usable, with non-blocking polish notes.
- `revise`: not ready; has major viewer or style issues.
- `blocked`: cannot be reviewed properly because required inputs, preview, render, or verification evidence is missing.

Do not use `pass` if any blocker or major issue remains.

## Severity Levels

### `blocker`

The edit cannot render, cannot be reviewed, or would clearly fail on platform.

Examples:

- `npm run video -- check <slug>` fails.
- video or audio is missing.
- captions are invisible or always visible.
- render is blank, frozen, or out of sync.
- remote assets are required in the render path.
- incorrect aspect ratio.
- private data is visible.

### `major`

The edit technically works but fails the brief, viewer experience, or Dena style.

Examples:

- the hook window does not stop scroll.
- captions are hard to read.
- key hook text is too long.
- overlay hides Dena's face or mouth too long.
- motion feels noisy or generic.
- CTA is missing or mismatched.
- Kumar-inspired style becomes copycat instead of adaptation.
- audio is harsh, clipped, or out of sync.

### `minor`

The edit works, but polish would improve it.

Examples:

- one caption beat could be shorter.
- a card could enter slightly earlier.
- a highlight color is overused.
- one screenshot crop is not ideal but still readable.
- CTA hold is slightly short but understandable.

### `note`

Observation only. No revision required.

Examples:

- a stylistic tradeoff was intentional.
- a warning was reviewed and accepted.
- a source limitation explains a visible artifact.

## Review Axes

### 1. Creative Fit

Check:

- The edit matches `creative-brief.md`.
- The chosen content lane is clear.
- The hook works in its window (`00:00.00` to `hook_end`) and ends where its decision lands.
- The hook's opening words stop the scroll muted, and its open loop is only paid off late in the video.
- The story has tension, proof, insight, and CTA.
- The ending feels intentional, not abrupt.
- The edit still sounds like Dena.
- The CTA is non-promissory unless the user explicitly approved a promise.

Fail if:

- the video feels like generic motivation
- the hook is vague
- the main point arrives too late
- the CTA asks for too many actions
- the CTA implies Dena will send, publish, or explain something later without explicit user approval
- the reference style overwhelms Dena's identity

### 2. Dena Style Fit

Check against `docs/dena-social-video-style-guide.md`:

- Indonesian voice is natural.
- Captions use Dena's register, not stiff corporate language.
- Visual system stays clean, readable, and founder/developer credible.
- Black/white/yellow caption language is used with restraint.
- Overlays clarify context or reset attention.
- The edit does not become random sticker or CapCut chaos.

For `kumar-inspired` edits:

- adapt mechanics only
- preserve Dena's AI systems builder identity
- use cinematic confidence without copying the reference's full palette/persona
- include a humanizer or grounded moment when the brief calls for it

### 3. Caption Readability

Review with audio on and audio off.

Check:

- captions are readable at phone size
- captions do not cover mouth, face, important object, or platform bottom UI
- phrase grouping follows meaning
- storytelling/talking-head captions account for every spoken word in the locked processed transcript
- highlight color marks only meaningful words
- no dense paragraph captions
- spelling and ASR corrections are correct
- timing starts and ends near speech
- captions do not flash too quickly
- hook/CTA cards are readable without audio

Default thresholds:

- ideal visible phrase: `1-4` words
- acceptable visible phrase: `1-6` words
- minimum readable duration: `0.45s`
- comfortable duration: `0.8-1.4s`
- bottom safe area: at least `220px`
- top safe area: at least `120px`, unless a hook card intentionally uses it

### 4. Motion And Overlay Quality

Check:

- every overlay has a purpose
- pattern interrupts arrive at a useful cadence
- motion supports attention, not decoration
- screenshots are readable
- generated assets do not feel generic or fake
- proof cards do not compete with active captions
- large overlays do not hide the speaker too long
- motion is not too frantic for the content lane
- CTA transition is clean
- SFX cues from the visual plan are present and audible enough to register without covering speech

Default pattern interrupt cadence:

- talking-head educational: every `4-8s`
- cinematic manifesto: every `8-12s`
- vlog/reflection: only when meaning changes

### 5. Technical HyperFrames Review

Check the composition contract:

- root has stable `data-composition-id`
- root has `data-width`, `data-height`, and `data-duration`
- every timed visible element has `class="clip"`
- every timed element has `data-start`, `data-duration`, and `data-track-index`
- same-track clips do not overlap
- video is muted
- separate audio element exists
- timeline is paused
- timeline is registered on `window.__timelines`
- timeline key matches composition id
- assets are local
- no `Date.now()`
- no `Math.random()`
- no network fetches or remote render assets
- sub-compositions register their own timelines correctly

Required command:

```bash
npm run video -- check <slug>
```

If this command fails, the verdict is `blocked` or `revise` depending on whether visual review is still possible.

### 6. Audio Review

Check:

- speech is clear
- processed speed is `1.2x` unless a documented clarity/emotion exception exists
- no harsh clipping
- no obvious noise pumping
- music, if used, does not cover speech
- cuts do not create jarring audio clicks
- audio stays in sync with mouth movement
- ending does not cut off words
- planned SFX are audible in the final mix but stay below speech
- final loudness is platform-friendly

Useful target:

- integrated loudness around `-14` to `-16 LUFS`
- true peak at or below about `-1 dBTP`

Treat this as a practical target, not a reason to over-process good speech.

### 7. Render Review

If a rendered MP4 exists, review the rendered file separately from the HTML preview.

Check:

- first frame
- the hook window (`00:00.00` to `hook_end`)
- every major caption style
- every overlay type
- every transition type
- CTA/end card
- last frame
- audio sync
- full playback for glitches

Use render review to catch issues that source inspection misses:

- font fallback
- media path differences
- blank frames
- z-index mistakes
- animation timing drift
- dropped audio
- export duration mismatch

### 8. Platform Readiness

Check:

- vertical `9:16`
- readable on phone
- no key text behind Reels/TikTok bottom controls
- first frame works as a scroll-stopper
- CTA matches the platform and topic
- filename/export is clear
- no visible private/client data
- no accidental reference watermark or downloaded-source branding

## Review Procedure

### 1. Confirm Inputs

Verify that the required upstream docs and composition files exist.

If files are missing, write a `blocked` QA report with the missing list. Do not guess.

### 2. Run Technical Checks

Run:

```bash
npm run video -- check <slug>
```

If `.html` was changed after the last assembly handoff, the check must be rerun.

When useful, also run:

```bash
npx hyperframes lint --verbose
npx hyperframes lint --json
```

### 3. Inspect The Composition

Read the composition source enough to verify:

- root metadata
- clip timing
- track indexes
- timeline registration
- media paths
- local assets
- deterministic logic

Do not rely only on source inspection. Source review catches contract issues, but not viewer experience.

### 4. Preview Key Moments

Review at least:

- `0.00s`
- `1.50s`
- `3.00s`
- first caption beat
- densest caption moment
- first overlay moment
- most complex overlay/motion moment
- CTA start
- final frame

For videos under `30s`, full playback is expected.

For longer videos, full playback is still preferred before a `pass` verdict.

### 5. Review Render If Available

Review the MP4 named in the QA prompt after checks pass. Do not re-render: Build owns rendering. If the render is missing or stale, report a `blocker` assigned to the Build phase.

If a render fails, classify the issue as `blocker` and assign it to the Build phase unless the cause is clearly upstream.

### 6. Write Findings

Every actionable finding should include:

- severity
- timecode
- file or clip id when relevant
- problem
- viewer or technical impact
- recommended owner
- suggested fix

Recommended owner values:

- `Story phase`
- `Screen Plan phase (captions step)`
- `Screen Plan phase (visual step)`
- `Build phase`
- `User Decision`

### 7. Decide Verdict

Use the highest remaining severity:

- any blocker -> `blocked`
- any major -> `revise`
- only minor issues -> `pass-with-minor-notes`
- no actionable issues -> `pass`

Do not mark `pass` because the deadline is close.

## QA Report Format

Create `videos/<slug>/qa-report.md`:

```md
# QA Report

## Verdict

- Verdict:
- Reviewed date:
- Reviewer:
- Video slug:
- Duration:
- Render reviewed:

## Evidence

- Composition:
- Render:
- Source video:
- Audio:
- Commands run:
- Preview points checked:

## Summary

One short paragraph explaining whether the edit is ready and why.

## Findings

| Severity | Timecode | Owner | Issue | Required Fix |
| --- | --- | --- | --- | --- |
| major | 00:02.10 | Screen Plan phase (captions step) | Hook text is too long to read muted. | Split into 2 shorter beats or reduce wording. |

## Creative Fit

- Hook:
- Story clarity:
- Dena voice:
- CTA:

## Caption Review

- Readability:
- Word coverage:
- Timing:
- Safe area:
- ASR/text corrections:

## Motion And Overlay Review

- Pattern interrupts:
- Asset readability:
- Motion restraint:
- SFX cues:
- Face/object protection:

## Technical Review

- HyperFrames check:
- Timeline registration:
- Track overlap:
- Local assets:
- Determinism:

## Audio Review

- Speech clarity:
- Speed:
- Sync:
- Loudness/clipping:
- Music/SFX:
- SFX audibility:

## Render Review

- First frame:
- Full playback:
- End frame:
- Export issues:

## Required Next Step

State exactly which phase should act next and what it should fix.
```

## Punch List Format

Create `videos/<slug>/qa-punch-list.md`:

```md
# QA Punch List

## Blockers

- [ ] `00:00.00` Owner: issue and fix.

## Major

- [ ] `00:00.00` Owner: issue and fix.

## Minor

- [ ] `00:00.00` Owner: issue and fix.

## Notes

- Observation only.
```

## Final Approval Format

Create `videos/<slug>/final-approval.md` only when the verdict is `pass`:

```md
# Final Approval

## Approved Output

- Video slug:
- Composition:
- Render:
- Duration:
- Aspect ratio:

## Checks Passed

- [ ] Creative brief matched
- [ ] Dena style matched
- [ ] Captions readable
- [ ] Storytelling captions cover every spoken word
- [ ] Overlays purposeful
- [ ] SFX cues audible when planned
- [ ] Speed is `1.2x` or documented exception
- [ ] Audio acceptable
- [ ] `npm run video -- check <slug>` passed
- [ ] Render reviewed
- [ ] No blocker or major issues

## Publish Notes

- Suggested caption:
- Suggested cover frame:
- Platform:
- CTA:
- User publish approval: pending
- R2/Repliz command after approval: `npm run repliz:publish -- --slug videos/<slug> --file videos/<slug>/renders/<slug>.mp4 --approved`
```

Do not create `final-approval.md` for `pass-with-minor-notes`, `revise`, or `blocked`.
Do not run the R2/Repliz command from QA unless the user explicitly approves the rendered edit.

## Common Failure Modes

### The Edit Validates But Feels Weak

Likely causes:

- weak hook
- slow setup
- no clear tension
- generic CTA
- overlays are technically correct but editorially unnecessary

Assign to:

- Story phase for hook/story/CTA
- Screen Plan phase (visual step) for attention rhythm
- Screen Plan phase (captions step) for text force

### Captions Are Technically Correct But Hard To Watch

Likely causes:

- too many words per beat
- weak phrase grouping
- timing too fast
- captions too low
- yellow highlight overused

Assign to:

- Screen Plan phase (captions step) for grouping/text
- Build phase for layout implementation

### Overlay Looks Good In Source But Bad In Render

Likely causes:

- font fallback
- path issue
- z-index issue
- render timing mismatch
- asset too small after scaling

Assign to:

- Build phase
- Screen Plan phase (visual step) if the source asset itself is poor

### Audio Passes But Feels Uncomfortable

Likely causes:

- harsh compression
- noise reduction pumping
- loud music
- clipped consonants
- abrupt cut at sentence boundaries

Assign to:

- Story phase for edit/cut problems
- Build phase for media wiring problems
- User Decision if a source recording limitation cannot be fixed cleanly

### Reference Style Was Copied Too Closely

Likely causes:

- palette copied wholesale
- persona shifted away from Dena
- title style mimics the reference instead of adapting mechanics
- human grounding moment removed

Assign to:

- Story phase for style correction
- Screen Plan phase (visual step) for visual grammar
- Build phase for implementation changes

## Motion B-roll Review

- For every clip in `compositions/broll/`, each state change lands on its word (±0.2 s against `processed-transcript.json`).
- The cursor stays inside the frame at every zoom, including mid-morph.
- Text is readable at phone size in every settled state.
- Treatment rules hold: no face cover in 0–3 s without approval, 2 s of face between cutaways, cutaways ≤ 10 s.
- One accent colour; no invented numbers; illustrative parts match the brief.

## Style B-roll Review

- Every `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, `mix-media`, and `parallax` clip matches its Style B-roll Brief (pattern, palette, font, treatment, assets).
- Parallax: no plate edge, gap, halo, or doubled object shows at the end of the camera move; reconstructed plates and archival photos are recorded as such in the manifest and never used as proof.
- VOX: every capture shows a source line (≥ 28 px, ≥ 1.5 s) and has private data redacted; every illustration carries "Ilustrasi" and imitates no real outlet; highlights sit on the spoken words only.
- Mix-media: the speaker cut-out is in sync with the audio (lips match at the key-word stills), the sticker outline is steady, the face zone is clear, and the collage fully covers the base video.
- Every file in a brief's `Assets:` is in `asset-manifest.json` with its provenance; no generated cut-out shows text, Dena's likeness, or a real person or brand.
- Stop-motion moves in steps (no glides, blur, or crossfades on paper); shadows are hard and point one way.
- Each beat lands on its word (±0.15 s against `processed-transcript.json`); whiteboard strokes finish before their word.
- Every on-screen word and number is verbatim from the transcript or given by the user.
- The style's Anti-slop Checklist (`docs/agents/references/styles/<type>.md`) passes on the stills.
- At most three motion visual types in the video; neighbouring clips differ unless they are one sequence.
- Nothing from a finished clip stays on screen after its mount ends.

## Definition Of Done

A QA pass is complete only when:

- `npm run video -- check <slug>` passes
- preview or render has been reviewed
- no blockers remain
- no major issues remain
- Dena style guide is respected
- captions are readable on phone
- overlays serve the story
- processed speed is `1.2x` or the exception is documented
- audio is clear and synced
- final CTA is present and appropriate
- final CTA is non-promissory unless explicitly approved
- report and punch list are written

If any of these are missing, do not approve the edit.

