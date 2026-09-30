# Rich Style Assets — Atelier Collection
Status: production contract
Date: 2026-09-30

## Scope and ownership

The user requested enrichment of all seven style-library families plus the FORM / FREQUENCY assets, for richer future videos. This is reusable asset production and a demonstration reel, under the same local-production boundary as [showreel-assets](showreel-assets.md). Social script/voice gates do not apply. Production and local rendering are authorized; publishing is separate.

Owning requirements: RD-02-60–64 in [composition-render](../requirements/rd-02-composition-render.md). Catalog integration: [ADR-0029](../adr/0029-layered-svg-artwork.md). Existing style contracts in `docs/agents/references/styles/` remain authoritative for actual Dena edits.

## Deliverables

- 112 original layered SVG artworks: 14 each for broll-text, motion-graphic, whiteboard, stop-motion, vox, mix-media, parallax, and the showreel extension. Catalog ids use `art.<family>-<name>`; the showreel family is tagged for compatible existing styles rather than introducing an eighth production style.
- File-backed `artwork` entries in the shared `vendor/asset-lib/` catalog, provenance and MIT license rows, per-family contact sheets, plus searchable usage notes. Parts use `data-part` attributes for animation; illustrations contain no baked-in claims or labels.
- A new 64-second, 1920×1080, 30 fps reel in `videos/style-atelier/`: two four-second studies per family, sixteen editable scenes, sixteen clean individual clips, local runtime/fonts, original audio stems, and a portable ZIP in `shared/showreels/style-atelier.zip`.
- A portable source package and manifest with file hashes and timing. Full-frame MP4 clips are opaque; SVG artwork retains transparency and individual editable parts.

## Art direction

Concept: a working motion-design atelier turns an idea into type, a diagram, a sketch, a physical paper object, an annotated document, a collage, a layered world, and finally a sculptural form. Richness comes from specific construction and staged motion, with a clear primary subject and quiet reading areas.

Two complementary studies per family demonstrate reusable choreography rather than a sequence of palette swaps. Text uses oversized masked type and print registration. Motion graphics stays flat and stages relationships before emphasis. Whiteboard draws in authored pen order. Paper/collage/VOX move on twos with consistent hard shadows. Documents are labelled Ilustrasi. Mix-media shows a clearly marked placeholder, reserving space for the real speaker matte in future productions. Parallax uses separate planes with restrained travel. Showreel material studies use original metallic/glass surfaces and optical geometry.

Shared page furniture, local Archivo Black/Instrument Serif/JetBrains Mono, and a paper/ink/cobalt/vermilion/acid palette connect the collection. Family-specific choices are recorded in the project `design.md` and `visual-plan.md`. Real edits still use at most three visual styles per video and choose assets for the spoken meaning.

## Use

Look at the family sheet, choose by semantic purpose in the catalog, copy the local SVG, and animate its named groups. `SK.asset(id).file` supplies the file path; this is not a new `SK.frame`/`SK.doc` preset. Insert inline SVG once during authoring/setup when groups need independent animation, with unique ids per instance. Use an image when the whole asset moves as a piece. Keep fonts as live HTML; replace specimen labels with transcript words and replace relative data marks with actual supplied values before a factual chart.

| Family / id prefix | Distinct construction | Motion specimen |
| --- | --- | --- |
| broll-text / `art.atelier-text-` | Offset plates, folded banners, brush swashes, riso, letter grids, quotation and registration | 01 masked poster; 02 tempo ribbon |
| motion-graphic / `art.atelier-mg-` | Orbit, segmented ring, funnel, branch, radar, bars, modules, linked cells, balance, route, signal and molecule | 03 network; 04 branch flow |
| whiteboard / `art.atelier-wb-` | Authored flow, feedback, tree, graph, thought, notebook, orbit, bulb, magnet, gauge, bridge, check, brain and calendar strokes | 05 pen flow; 06 loop |
| stop-motion / `art.atelier-stop-` | Serrated sun, accordion, torn card, tape, fan, plant, ticket, stack, spiral, zigzag, envelope, frame, plane and cardboard | 07 hinged paper fan; 08 envelope/plane |
| vox / `art.atelier-vox-` | Evidence apparatus, bracket, tab, highlighter, citation, lens, locator, comparison, timeline, chart focus, frame, source badge, link and note | 09 illustrative highlight; 10 linked editorial cards |
| mix-media / `art.atelier-mm-` | Ripped stacks, film, mesh, halftone, ink, tape, string tag, sticker, ring, folded poster, grid, arch, news strip and scissors | 11 speaker-safe template; 12 paste/type |
| parallax / `art.atelier-px-` | Mountain, ridge, trees, cloud, light, contours, city, tower, railing, sun, portal, grid, palms and glass plane | 13 mountain orbit; 14 city pan |
| showreel / `art.atelier-showreel-` | Chrome orb/ribbon, prism, iridescent mesh, glass, star, rubber, coil, optical grid, orbit, signal, contour, petal and cube | 15 material; 16 sculptural finale |

Rebuild vector files and metadata with `python3 scripts/create-style-atelier.py`, then `npm run asset-lib -- build` and `npm run asset-lib -- sheets`. Existing preset palettes and typography are preserved; these are richer components rather than a new palette dependency. The vector generator and catalog runtime require no network.

## Verification

Run the shared asset library build, regenerate catalog sheets, and run `npm run test:asset-lib`. Run `npm run video -- check style-atelier`, inspect a hero frame for each scene and final render, probe reel/clips, measure audio, verify all SVG checksums are distinct and the ZIP manifest matches. Record results below after production.

## Production results

- 112 new original SVGs (1,396,719 bytes), fourteen per family, with distinct SHA-256 hashes. All are registered in the shared catalog. Eight new family contact sheets bring the catalog host to 34 pages; the pre-existing sheet files remain unchanged. The delivery also contains the prior 42 FORM / FREQUENCY vectors, for 154 reusable SVGs in the portable collection.
- `videos/style-atelier/renders/style-atelier.mp4`: H.264, 1920×1080, 30 fps, exactly 64.000 s video; AAC 48 kHz stereo. Sixteen clean silent MP4 studies each probe at 4.000 s. Sixteen editable sources and sixteen standalone hosts use local fonts/runtime.
- `npm run test:asset-lib`: all 30 tests pass. `npm run video -- check style-atelier`: zero lint errors/warnings, zero runtime errors, zero layout issues across nine inspect samples. 245 contrast warnings were reviewed against the visible hero frames; most concern inactive scene text measured over a different active background. Intentional decorative print/grid and overscan are recorded in source.
- All sixteen assembled and final-render hero frames, plus first/last frames, visually reviewed. A repeated random seek produces a pixel-identical frame. Consecutive frames for stop-motion, VOX and mix-media are pixel-identical within the intended two-frame pose.
- Final AAC measures −17.92 LUFS and −1.64 dBTP. Separate SFX stem peaks at −10.9 dBFS. Sixteen synthesized material cues and separate original music/SFX/mix/master WAVs are included; these are synthesis, not recorded foley.
- Portable source regenerates all sixteen templates and the host byte-identically in an isolated directory without repository assets. Portable main lint has zero errors/warnings; the standalone envelope validates with zero runtime errors, and an independent parallax snapshot was reviewed.
- Delivery: `shared/showreels/style-atelier/` and `shared/showreels/style-atelier.zip`. Contains the reel, sixteen clips, 154 vectors, original audio, portable editable source, independent studies, previews, licenses and checksum manifest. Manifest hashes and ZIP integrity are verified. Everything remains local for user review.

## Production learning

- Landscape style-kit clips must pass `W:1920,H:1080` to `SK.clip`, and explicitly use `ox:960,oy:540` for `SK.layer`/`SK.camera`; their default origins assume portrait dimensions. Artwork geometry inside transparent SVG margins needs separate framing checks from the outer file bounds.
- Font-role classes should be mutually exclusive. Applying both `.sk-mono` and `.sk-serif`/`.sk-hand` allowed the later rule to override the intended font and widened specimen labels. The generator now chooses one role per label.
- AAC reconstruction overshot the initial source master: a −1.2 dBTP source target yielded +0.12 dBTP in the first export. The final source target is −3 dBTP/−17 LUFS, and the actual final AAC measures −1.64 dBTP. Measure the encoded delivery, not just the WAV.
