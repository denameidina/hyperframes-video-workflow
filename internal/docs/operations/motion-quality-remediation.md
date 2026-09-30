# Motion Quality Remediation — 2026-09-30
Status: tooling verified; reference-driven v2 delivered; user aesthetic review pending
Date: 2026-09-30

Scope: implement the findings in the [quality audit](../research/motion-design-quality-audit-2026-09-30.md), then deliver **one** rich-motion explainer for user review. Decision: [ADR-0030](../adr/0030-motion-quality-delivery.md). Plan: [implementation plan](../../../docs/superpowers/plans/2026-09-30-motion-quality-remediation.md).

The first proof project was `videos/ai-agent-gagal-rich/`; the current revision is
`videos/ai-agent-gagal-v2/`. Both reuse the existing approved script, voice and
word timings from `ai-agent-gagal`. The user's latest direction
authorizes completing this revision through the final-render review. This does
not create fabricated approvals in `gates.json` or alter future production gates.
Publishing/upload remains a separate user action.

## User review: motion revision reopened

The user rejected the first proof as stiff and insufficiently rich, and supplied
the [Hemanth Vasi / Sonnet introduction reference](https://www.threads.com/share/FPUuxLuY4/).
F02, F03 and the pilot's F10 visual acceptance are **open**. Passing render,
seek, audio and frame checks does not establish professional motion quality.
The first MP4 and its technical evidence below remain a historical baseline.

Source inspection identifies repeated generic card entrances, straight carrier
segments that brake to zero at every waypoint, instantaneous world replacement,
and subtle part responses that nearly disappear at phone size. Screen Plan must
revise the choreography before Build; reference observations must distinguish
actual video inspection from metadata or poster access. A new proof is not
accepted until the user reviews it.

The exact reference media has now been retrieved and inspected in time-ordered
sequences. [Reference analysis](../research/threads-motion-reference-2026-09-30.md)
records identity, timestamps, inspection limits and adaptations. The new proof
project is `videos/ai-agent-gagal-v2/`, with approved Story/audio preserved and a
new character-led Screen Plan. The first proof below is historical evidence.

## Finding closure map

| Finding | Correction | Evidence to record |
| --- | --- | --- |
| F01 actual storyboard | Project-local `storyboardFrame` + evidence manifest; separate reference sheets | Storyboard/gate tests; pilot actual sheet |
| F02 hierarchy/art direction | Focal subject, live type roles, phone framing and scene reading poses | Pilot design and 360×640 review |
| F03 continuity/holds | Boundary carrier/pose/direction; meaningful secondary response; deliberate reading holds | Pilot continuous timeline and transition notes |
| F04 cut collision | Isolated mounts and exclusive outgoing cut endpoint | Atelier boundary test + snapshots |
| F05 backward seek | Every headline property assigned for every timestamp | Atelier fresh/backward regression |
| F06 audio | Action-specific cue provenance; encoded AAC loudness/true-peak enforcement | Delivery fixtures + pilot quality receipt; listening limits stated |
| F07 blur encode | Explicit final H.264 CRF16/slow/BT.709/faststart | Blur command tests; no second production render |
| F08 gate fingerprint | Creative plan normalization plus actual frames/timeline/design dependencies | Stale-evidence tests; result-only edit stays valid |
| F09 invalid render | Probe + decode validation before gates/promotion; pending atomic delivery | Real valid/corrupt fixture tests; old final preserved on failure |
| F10 material response | Ribbon highlights, prism lighting, extrusion/bevel and individual petals/orbits | Generated scene regression; pilot purposeful layered response |

## Atelier source correction

The composition builder is now tracked at
`scripts/create-style-atelier-composition.py`. It accepts an output directory and
can also run as a bundled `tools/build.py` using local artwork. Three regressions
first reproduced cut collision, stale backward-seek state and missing part
response; the corrected builder passes all three. All fifteen boundaries are
covered at 30/120 fps neighboring samples.

`npm run video -- check style-atelier` passes lint/runtime/layout. Its contrast
report still measures inactive scene text against another active background;
the 245 warnings are reviewed with boundary/hero frames rather than suppressed.
The original Atelier MP4/clips are historical exports; only the new explainer
is rendered in this remediation.

The portable Atelier folder/ZIP now carries the corrected editable and standalone
sources. Its manifest explicitly marks `mediaMatchesSource: false` and labels
the old MP4/clips as `initial-pre-audit`. An isolated regeneration using bundled
assets reproduces all seventeen revised HTML files byte-for-byte. This is a
source-generation check, not a cross-toolchain MP4 repeatability claim.

## Historical verification and first proof

- `npm test`: **462/462 pass**, zero failed/skipped, including real valid/corrupt
  media, image decoding, stale creative fingerprints, fenced headings, concurrent
  rendering, mastering and promotion rollback. Fresh read-only code review found
  no remaining issues after its concrete race/image findings were corrected.
- `npm run check`: root lint/validate/inspect pass. Both starter templates checked
  as temporary instantiated projects with valid tiny media: no errors/warnings,
  runtime errors or layout issues. Atelier passes runtime/layout; its reviewed
  inactive-scene contrast warnings remain visible.
- Pilot check: no lint errors, runtime errors or layout issues. Four density
  warnings are justified by the single persistent-carrier timeline and normal
  caption tracks. Fifteen contrast warnings reference inactive caption text at
  unrelated sample times; active captions have dark backing and were visually
  inspected at phone size.
- Source seek/boundary evidence: **26** fresh-versus-reverse native GSAP pose/state
  comparisons match; sampled boundaries have one active scene; no browser errors.
  Actual production storyboard contains ten project frames with decoded/hashed
  frame/sheet evidence; final readiness returns `ready: true`. Forty-three native
  frames cover all nine boundaries; 123 words/52 beats (22 hybrid-hidden) retain
  the approved transcript. All 39 asset paths/hashes and the seven reused approved
  source files are verified. The two longer scenes have the documented continuous-
  sequence rationale required by RD-03-83.
- **One final production MP4**:
  `videos/ai-agent-gagal-rich/renders/ai-agent-gagal-rich.mp4`, H.264,
  **1080×1920, 30 fps, 49.800 s**, **7,767,242 bytes**. SHA-256:
  `1d9016e148cd9eceff5e834990ea10c16a86f6ede210bea9156a570bd6ea68bd`.
  The delivery pipeline mastered audio with video stream-copy; encoded AAC
  measures **−16.04 LUFS / −3.33 dBTP**. All technical receipt checks pass.
- Final MP4 decoded-frame review: **15** hero frames at **360×640**, plus **27**
  frames around all **nine** boundaries. No outgoing/incoming scene pollution,
  clipped primary text or broken final reading pose observed. Evidence lives in
  the pilot's `preview/final-render/` and `preview/render-review.json`.

Full audiovisual playback/manual listening was not completed or claimed. Cue
semantics/provenance, encoded media, temporal states and sampled visual framing
were verified; the user's first assessment rejected the motion quality. Audible
SFX and the full viewing experience remain unverified. This is the local final-review handoff, not a
formal QA pass or publishing approval. No existing video was fully rerendered.

Tracked verification copies:
[tests](../research/motion-design-quality-audit-2026-09-30-evidence/remediation-tests.txt),
[delivery receipt](../research/motion-design-quality-audit-2026-09-30-evidence/rich-pilot-quality.json),
[frame review](../research/motion-design-quality-audit-2026-09-30-evidence/rich-pilot-frame-review.json),
[final render samples](../research/motion-design-quality-audit-2026-09-30-evidence/rich-pilot-render-samples.jpg).

## Reference-driven revision verification

The parent owns the new Screen Plan and caption decisions; separate workers own
the original visual choreography and local SFX. The actual reference sequences
inform causal actions: anticipation, travel, contact and receiver response, with
the same three documents carrying their contents into the cleanup and task test.
Artwork remains original and reference footage is not used in production.

Phone-size source sequences have been inspected for the opening jump, three
payload arrivals, curved bypass/contact, successive owner gestures, data gather,
task extraction/test/handoff and final question. A separate source reviewer
reproduced and closed endpoint limb snaps, route/contact mismatch, backward-seek
transform-origin leakage, extraction scale/rotation drift and owner arm pivots.
This is baseline source verification, not formal QA or aesthetic acceptance.

All five approved Story/audio/BGM files are byte-identical to `ai-agent-gagal`.
All 123 words and 52 caption-beat timings remain unchanged. Only cap-005 and
cap-051/052 hide their rail after actual frames establish exact full-beat stage
coverage; the other 49 beats remain shown. The SFX stem has 40 deterministic
action cues and its own provenance/level checks. All 49 asset manifest files and
hashes have been independently checked. Final native source verification passes
36 fresh-versus-backward comparisons after visiting the gather/test/final poses,
all nine boundaries have one active world, and 45 stills plus 182 action frames
cover the source. The project check has zero errors, browser/contrast warnings or
layout issues; four density warnings are reviewed against the deliberate shared
actor/caption timeline. The actual ten-scene storyboard was regenerated after
all source/caption/frame writes and its evidence reports `ready: true`. All ten
frozen source/evidence hashes were independently checked before rendering.

The parent's sole new render is
`videos/ai-agent-gagal-v2/renders/ai-agent-gagal-v2.mp4`: **1080×1920, 30 fps,
49.800 s video**, H.264/AAC, **10,963,341 bytes**. SHA-256:
`c3296e8b1dcb0bebe7ceec5e50fa14a3e778ab68cf4f95c8c9d4e7d543ba6bf0`.
Encoded AAC is stereo 48 kHz, **−16.16 LUFS / −3.50 dBTP**, already within the
speech profile without additional mastering. All receipt checks pass, including
full decode. The frozen composition and rejected master remain unchanged.

The parent inspected **105** decoded samples in **13** time-ordered phone sheets,
including **27** frames around all **nine** boundaries. Opening jump/landing,
payloads, bypass/customer contact, owner gestures, actual gathering/test/handoff
and final reveal/hold progress as planned. Persistent foreground documents
briefly cross outgoing type at the planned 36.3–36.4 input transition; settled
reading poses are clear. No new correction was required by this sampled review.
Full audiovisual playback and manual mixed listening were **not** completed.
The final bounded read-only review confirms the generated index embeds current
motion source verbatim, native evidence matches that index and all ten freeze
hashes match; no remaining concrete finding in its established correction scope.
F02, F03 and the pilot's F10 aesthetic acceptance remain **open for user review**;
technical checks are not evidence of professional aesthetic acceptance.

Tracked v2 evidence:
[delivery receipt](../research/motion-design-quality-audit-2026-09-30-evidence/v2-pilot-quality.json),
[temporal frame review](../research/motion-design-quality-audit-2026-09-30-evidence/v2-pilot-frame-review.json),
[render samples](../research/motion-design-quality-audit-2026-09-30-evidence/v2-pilot-render-samples.jpg).

## Documents changed

Requirements RD-02/RD-03/RD-06; ADR-0001/0025 clarification and new ADR-0030;
README registry; architecture data-model/NFR; visual-system/rich-style-assets;
runbook and this remediation record; Screen Plan/Build phase documents and their
motion, visual-planning, assembly, generate-mode and quality-gate references;
the Dena workflow router. The implementation plan records task ownership.

The reference-driven revision additionally updates RD-03 (110–112), the Screen
Plan phase, motion-craft reference, README registry, this record and the
implementation plan, and adds the exact Threads reference research record.

## Main-branch integration verification — 2026-10-01

The user requested commit and push to `main`. Fresh `npm test` passes462/462
with zero failures/skips; fresh `npm run check` passes lint/validate/inspect with
zero composition warnings or layout issues. Evidence:
[full test output](../research/motion-design-quality-audit-2026-09-30-evidence/pre-push-tests.txt),
[root check](../research/motion-design-quality-audit-2026-09-30-evidence/pre-push-check.txt).
Audit logs use `.txt` so they are versioned rather than silently excluded by the
repo's general log ignore. Shared code, workflow, canonical docs and audit
proofs are committed together. Pre-existing pronunciation/voice configuration
edits and project-local `videos/` sources/MP4s remain outside the commit, matching
the repository's media policy. This integration does not grant publishing or
aesthetic approval.
