# FORM / FREQUENCY — Motion Asset Showreel
Status: production contract
Date: 2026-09-30

## Scope

The user requested a dynamic motion designer showreel and many assets, with broad creative discretion. This is a standalone asset collection, following the same local-production boundary as [transition-assets](transition-assets.md), rather than a Dena social explainer or music social format. HyperFrames `/general-video` owns the custom multi-scene composition. Story direction, screen plan and Build records remain in the project for traceability; script/voice and social-format gates do not apply to this asset-production request. Rendering is authorized by the requested video deliverable; uploads are not.

Project: `videos/form-frequency/`. Portable deliverable: `shared/showreels/form-frequency/` plus its ZIP. Acceptance criteria: RD-02-56–59 in [composition-render](../requirements/rd-02-composition-render.md).

## Direction

A 48-second, 1920×1080, 30 fps reel in twelve four-second chapters. The visual metaphor is a design instrument: a simple form becomes type, material, a system, a signal, a story, then an entire visual language. Rhythm: punch / punch / breathe / play / build / punch / precise / tactile / flow / tunnel / crescendo / resolve. Original 120 BPM electronic music gives two bars per chapter.

Warm ink `#171918`, paper `#F1EEE5`, acid `#D9FC59`, cobalt `#244BFF`, vermilion `#FA593D`, and lilac `#B6A3EF` are an intentionally varied showreel palette, tied together by common page furniture and type. Local Archivo Black, Instrument Serif and JetBrains Mono separate proclamation, human expression and technical annotations. Full-frame artwork carries the message; labels are secondary.

## Deliverables and limitations

- Twelve scene HTML templates, portable source host, local GSAP/fonts and generator.
- At least 36 original SVG motifs with editable paths, used in the scene collection.
- Main H.264/AAC MP4 and twelve individually trimmed MP4 studies. The clips are full-frame opaque studies; editable sources preserve the separate layers. They are not alpha overlays.
- Original synthesized music and twelve original SFX WAV files, including a separate SFX stem; no third-party music is required.
- Contact sheet, asset manifest, scene timing map, source/provenance notes and checksums.
- Canvas graphics are procedural artwork; no real product, client metrics or proof captures are depicted. Any illustrative interface is labelled as a design study.

## Verification

Run `npm run video -- check form-frequency`. Inspect an assembled-host snapshot of each chapter before rendering. Verify final render and individual clips with FFprobe. Inspect final-render contact sheet and first/last frames. Measure final audio loudness and peak and the separate SFX stem. Record measured results here after production.

## Verified production

- Main showreel: `videos/form-frequency/renders/form-frequency.mp4`, H.264, 48.000 s video, 1920×1080, 30 fps; AAC 48 kHz stereo, 48.021333 s audio; 33,709,556 bytes.
- Twelve source scenes; 42 distinct SVG files (12 symbols, 12 patterns, 12 stickers, six data/interface panels); original 120 BPM music, twelve SFX cues, separate music/SFX stems and mastered mix. Font source records and OFL licenses are supplied.
- All twelve assembled-host scene snapshots and final-render chapter frames inspected. First/last frames contain intended artwork. Main project check: zero lint errors, zero runtime errors, zero layout issues. Two transition-track density warnings were reviewed; the short sequential carriers remain readable in the host source. 165 contrast warnings were reviewed against visible frames: inactive layers and full-bleed child backgrounds account for the warnings; ghost typography is deliberately decorative.
- Final AAC measures −16.72 LUFS, −0.30 dBTP; separate SFX stem peaks at −9.0 dBFS. Audio measurements and stream probe are in the pack preview folder.
- Clean scene exports use `videos/form-frequency-studies/`, an intermediate host without transition carriers. Its check also passes; the twelve delivered MP4 studies are silent, four seconds each, 1920×1080 and 30 fps. Original soundtrack and cue files are available separately. Portable independent source projects are included for all twelve studies.
- Delivery directory: `shared/showreels/form-frequency/`; archive: `shared/showreels/form-frequency.zip`. Includes showreel, clean clips, portable editable source, standalone scene projects, preview sheets and checksum manifest. Everything remains local for user review.
- Portable main source lint passes with the same two density warnings. The independent chrome scene validates with zero console errors and 30 text elements passing contrast; its standalone snapshot was visually inspected. All 42 SVG files have distinct checksums; all twelve clips probe at 4.000 seconds; asset/video checksums and ZIP integrity pass.

## Production learning

The 2026-09-30 continuation adds fourteen original material/optical SVGs (catalog `art.atelier-showreel-*`) and two animated material studies in [rich-style-assets](rich-style-assets.md). The new Atelier pack also includes all seven production-style families. The original FORM / FREQUENCY deliverable remains available alongside this extension.

HyperFrames 0.7.24 `validate`/`inspect` treats symlinked `compositions/` files as empty, even when the render resolves the same files correctly. Materialize composition files in export hosts before checking them. The clean-study host was corrected this way and its check repeated successfully. Vendor/media dependency links do not require the same workaround. This records a tool limitation; it does not change the project workflow or rendering contract.
