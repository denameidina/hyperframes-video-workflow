# ADR-0029 — File-backed Layered SVG Artwork
Status: accepted
Date: 2026-09-30

## Context

The seven-style enrichment request adds original, multi-part vector illustrations and material studies. Existing catalog kinds describe icons, pen strokes, paper PNGs, fixed document/frame helpers, and scene layer kits. Assigning general layered illustrations to those kinds would send them through incompatible renderers (PNG dimension parsing, `SK.doc` or `SK.stamp`). A separate ignored pack would make useful assets hard to discover in future Screen Plan work.

## Decision

Add the catalog kind `artwork` for local, file-backed SVGs, using the existing `src/items.json` metadata and `SK.asset` lookup. No new runtime helper or production style is introduced. Assets have original project provenance, MIT licensing, existing style/topic tags, and a `use` path. Named SVG groups support direct, deterministic animation after inline insertion at setup. Contact sheets display these SVG files as images, grouped by their primary production family.

## Consequences

The existing build, file/license guards, budget, and asset lookup cover the new entries. A sheet regression test covers all new artworks. Existing style APIs and old sample sheets remain compatible; the generated catalog host gains artwork pages. Actual charts/documents require transcript-specific labels and values, and mix-media requires real Dena footage. An `artwork` SVG is reusable illustration, never a proof capture.
