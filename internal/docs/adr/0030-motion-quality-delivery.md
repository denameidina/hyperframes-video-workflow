# ADR-0030 — Actual design evidence and validated delivery

Status: accepted
Date: 2026-09-30

## Context

The motion-design quality audit found reference-only production storyboards,
incomplete creative fingerprints, unvalidated render readiness, uncontrolled blur
compression, inconsistent final-master targets and boundary/seek bugs. The user
requested all audit fixes and one final proof video with richer motion design.

## Decision

Production storyboard sheets use project-local actual scene frames. Reference
sheets remain explicitly separate. Design approvals bind normalized creative
decisions and source evidence, without hashing approval-result text.

A shared offline render-quality module probes/decodes pending output, measures
the encoded mix, masters audio when needed, and promotes a valid output atomically.
Render and delivery workfiles have exclusive per-run ownership; the validated
file is captured before validation and remains the same file through promotion.

The default 2–8 s scene cadence permits a documented continuous sequence when
one shared diagram or causal action needs uninterrupted relationships. It must
contain staged information changes and specified reading holds; a repeated static
layout is insufficient. This supports the pilot's 8.52 s input diagram and 8.04 s
bypass-to-complaint sequence without adding arbitrary decorative cuts.
Normal and blur output share the delivery contract. Gates reject non-video files.
Rendered-media tests use small real fixtures; pure unit tests retain injected tools.

Motion is assessed through hierarchy, visual meaning, timing/holds, continuity,
material and sound. Richness does not mean movement on every frame. Pixel/audio
determinism is distinguished from container byte identity across toolchains.

## Consequences

Legacy reference sheets need actual frames regenerated before a new design
approval. Prior MP4s remain available; a failed new export cannot replace them.
FFmpeg/ffprobe remain local requirements and no new paid service is introduced.
Independent QA and publishing retain their existing user-controlled gates.

The proof revision reuses AI Agent Gagal's approved script/voice and writes a
separate project. The user's instruction to inspect one completed render is the
review mode for this revision; planning evidence is still produced before Build.
