# VOX (Style Reference)

The Vox-explainer look: a real capture or a clearly illustrative document on
paper, a yellow highlighter sweeping across the exact phrase being spoken, red-pen
circles and underlines, a stepped camera push into the paragraph that matters,
map zooms with pins, grain, and a source line on screen. Loaded by
`docs/agents/02-screen-plan.md` (visual step, after `styles/README.md`) and
`docs/agents/03-build.md` (author step). Engine: `vendor/style-kit/`
(`window.SK`, including `SK.highlight`, `SK.geo`) on top of `vendor/motion-kit/`;
paper, pins, tape, and the Indonesia map: `vendor/paper-pack/`. Worked examples:
`docs/agents/references/style-examples/vox/` (`vx-01` … `vx-11`,
`npm run check:style-examples -- vox`).

## When To Use

Use `vox` for a line that **points at a document, a source, or a place**:

- Dena quotes or paraphrases an article, report, post, policy, or website;
- a claim that is stronger when the viewer sees the words it comes from;
- a place name, a market, a city (map-zoom);
- a pattern across several sources ("semua orang bilang…").

Do not use it for:

- a tool being used (use `motion-broll` or a screen capture);
- a punchline with no source (use `broll-text`);
- a personal, emotional, or opinion line (keep Dena's face).

## Documents

Every VOX clip shows one of two document kinds; the brief says which
(`Document: capture | illustrative`).

| Kind | Source | Must be on screen |
| --- | --- | --- |
| `capture` | A real screenshot from Screen Plan research — the article, document, site, or tool Dena or the user named — saved as `assets/captures/NN-name.png` (Screenshot Rules and URL Research in `asset-production.md`) | A source line (outlet or domain, and date or "diakses <date>") ≥ 28 px, visible ≥ 1.5 s; private data redacted (Gate 2 R2) |
| `illustrative` | A generic sheet built in the clip: a headline from the transcript, body as grey lines (`.sk-doc-line`), never fake prose | The tag **"Ilustrasi"** (`.sk-tag`); no real outlet's masthead, layout, or logo; no invented numbers |

## Document Ethics

- Never fake a source: a capture is a capture of the real page; an illustration
  is labelled "Ilustrasi" and never imitates a real outlet (Kompas, Tempo,
  TechCrunch, …) — doing so trips Gate 2 R6.
- Highlight only the words being spoken, and only where the phrase means the same
  inside its full sentence.
- Crop honestly: keep qualifiers ("perkiraan", "hingga", a date) that change the
  meaning.
- Cite on screen: outlet or domain and date. Licensed text (for example Wikipedia,
  CC BY-SA) names its license in the source line.
- Redact names, phone numbers, emails, account ids, and faces of private people in
  captures (`.sk-redact` or blur before the capture is saved).
- Archival photos: public domain or CC only, license recorded in the asset
  manifest.

## Look

| Palette | bg | ink | accent | accent-2 | muted | add | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.sk-pal-vox-default` | `#f5ebd0` | `#1b1b1b` | `#ffe14d` | `#d7263d` | `#8c8577` | `.sk-paper-cream` | legacy |
| `.sk-pal-vox-newsprint` | `#c4b9b4` | `#1b1b1b` | `#ffe14d` | `#d7263d` | `#6b665c` | `.sk-newsprint` | legacy |
| `.sk-pal-vox-dark-desk` | `#a68768` | `#f5efe6` | `#ffe14d` | `#ff6b6b` | `#a8a29e` | `.sk-kraft-dark` | legacy — exception: ink, accent2 |
| `.sk-pal-vox-blueprint` | `#f5f3f4` | `#1e3a5f` | `#ffe14d` | `#d7263d` | `#7ea3d4` | `.sk-grid` | legacy |
| `.sk-pal-vox-archive-sepia` | `#caa77a` | `#2a1f14` | `#f2c14e` | `#9b2226` | `#8a7a5c` | `.sk-tex-paper-tan` | new |
| `.sk-pal-vox-cork-board` | `#ab6f3e` | `#1b1b1b` | `#ffe14d` | `#6e0d10` | `#6b4f33` | `.sk-tex-cork` | new |
| `.sk-pal-vox-evidence` | `#1d1f22` | `#f1ede4` | `#ffe14d` | `#e5383b` | `#6b6f76` | — | new |
| `.sk-pal-vox-pastel-brief` | `#eef2f7` | `#1e293b` | `#a7f3d0` | `#e11d48` | `#94a3b8` | — | new |

| Type preset | display | body | hand | serif | mono |
| --- | --- | --- | --- | --- | --- |
| `.sk-type-vox-paper` | — | Geist | — | Newsreader | — |
| `.sk-type-vox-magazine` | — | Space Grotesk | — | DM Serif Display | — |
| `.sk-type-vox-archive` | — | Newsreader | — | Special Elite | — |

- `.sk-kraft-dark` averages #a68768: in `dark-desk` the light ink goes on dark paper pieces, never straight on the backdrop.

- Put the palette class on the stage (`<div class="sk-stage sk-vox sk-pal-vox-pastel-brief">`),
  plus the `add` class when listed; an overlay is its own full-frame div. Write the class in the
  brief's `Palette:`; hex values are still allowed when a video needs its own colours (say why).
- Type presets set `--sk-font-*`; `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`
  follow them. Font classes for one-offs: `.sk-f-<font>` (see `font.webp`).
- One palette preset per style per video, unless a palette change marks a new story section.

- One highlighter colour across the whole video, so it reads as a signature
  (*Explained*).
- Documents sit on white or cream paper pieces with torn edges and a hard
  `.sk-cut` shadow; tape or a pin holds a capture.
- Type: headlines and pull-quotes in Newsreader (`.sk-serif`), labels and source
  lines in Geist (`.sk-source`, `.sk-tag`).
- Maps: `vendor/paper-pack/map-indonesia.svg` (Natural Earth, desaturated
  sand/grey) and the library's `world`, `sea`, `id-provinces`, `java`
  (`SK.geo(lat, lon, map)`, `map.webp`; 37 more cities in `SK.CITIES`), pins from `.sk-pin`,
  place labels on a paper chip. The province map is Natural Earth 5.1.2 (33 provinces, before
  the Kalimantan Utara and Papua splits) — never use it to state current borders.
- Grain: one `.sk-grain` overlay moved by `SK.grain`; imperfection is the brand —
  "you don't want it to look perfect" (Vox art director, via Storybench).

## Kit

Library assets for this style — look at the sheets before choosing, then list the ids in the
brief's `Library assets:` (`vendor/asset-lib/CATALOG.md` has every id, tag, and source). Make a
new asset only when nothing here fits the line, and say why in the brief (RD-03-55).

| Need | Catalog ids | Sheet |
| --- | --- | --- |
| Documents (always tagged Ilustrasi) | `doc.article`, `doc.report-page`, `doc.spreadsheet`, `doc.chat-thread`, `doc.email`, `doc.social-post`, `doc.receipt`, `doc.invoice`, `doc.search-results`, `doc.terminal` | `../asset-catalog/sheets/doc-1.webp`, `../asset-catalog/sheets/doc-2.webp` |
| Red pen | `mark.red-circle`, `mark.red-underline`, `mark.red-arrow`, `mark.red-check`, `mark.red-cross` | `../asset-catalog/sheets/frame-2.webp` |
| Stamps | `frame.stamp-ilustrasi`, `frame.stamp-contoh` | `../asset-catalog/sheets/frame-1.webp` |
| Maps | `map.indonesia`, `map.id-provinces`, `map.java`, `map.sea`, `map.world` | `../asset-catalog/sheets/map.webp` |
| Desk | `texture.cork`, `texture.paper-tan`, `paper.washi-grid`, `paper.tape-clear`, `paper.binder-clip` | `../asset-catalog/sheets/texture-1.webp`, `../asset-catalog/sheets/paper-1.webp` |
| Type | `font.dm-serif-display`, `font.special-elite` | `../asset-catalog/sheets/font.webp` |

## Timing

- Step every graphic move on the 15-steps-per-second grid (`SK.onTwos`) — the
  Vox "12 fps inside 24" stutter at a 30 fps render. Dena's footage is never
  stepped.
- A highlight starts ~2 frames before the first highlighted word and finishes on
  the last one (0.3–0.7 s).
- One motion per beat: a push, then a hold. Don't push, pan, and shake at once;
  hold a document long enough to read (Estelle Caswell holds archival images for
  seconds).
- The key image comes after the context (Joss Fong): build 1–2 s of setup, then
  reveal the proof on the payoff word.
- Keep a VOX clip ≤ 7 s; it supports the line, it doesn't outlast it.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **highlight-sweep** | Yellow marker wipes left to right under the exact phrase | Quoting a document or a figure | Starts ~2 frames before the first word, ends on the last | soft marker squeak | Highlighting a paragraph, or words nobody says | `.sk-hl` inside a `position: relative` span of the phrase + `SK.highlight(el, u)` |
| **pen-underline** | Red wavy line under 1–3 words | A contrast word or a number | Drawn during the stressed word, 0.2–0.35 s | pen scratch | A perfect vector line | `SK.line` in the accent-2 colour + `SK.drawSeq` |
| **circle-annotate** | Loose red ellipse around a name or figure, overshooting its start | "Angka ini" / "yang ini" | Closes on the word | quick scribble | Circling several things at once | `SK.ellipse(...)` + `SK.drawSeq` |
| **doc-push** | Stepped camera push 15–35% into the paragraph that matters | Moving from the whole page to one clause | Push on the setup, land as the clause is read | low paper rustle | A push that keeps drifting after the line | `SK.cam` with `SK.onTwos(M.track(...))` |
| **clipping-stack** | 3–4 clippings slap down, rotated, with hard shadows | "Semua orang bilang…", a pattern across sources | One per beat or stressed word | paper slap each | Illegible or fake headlines | `SK.piece` drop + `SK.torn` edges |
| **pinned-source** | A capture pinned or taped to the board with a source line | Proof of a claim | Source line visible ≥ 1.5 s | tape rip | Missing or fake source | `.sk-tape-a`/`.sk-pin` + `.sk-source` |
| **redact-bar** | Black bars wipe over private or irrelevant text | Hiding personal data or noise | Before the document is readable | marker swipe | Redacting to fake a "leak" | `.sk-redact` + `SK.highlight` |
| **pull-quote** | One sentence isolated on paper in a big serif, with its speaker | A strong line from a founder or document | Words appear as they are said | soft typewriter or none | Paraphrase inside quote marks | `.sk-serif` + `SK.reveal(..., 'rise')` |
| **map-zoom** | Desaturated map, stepped zoom, a pin drops, a place label | A place or a market | Pin lands on the place name | pin thud | Wrong borders; a label that drifts off the pin | `SK.geo(lat, lon)` + `SK.cam` on `map-indonesia.svg` |
| **archival-pan** | Slow stepped pan or push across a real photo, with grain | History, an origin story | Movement ends on the detail being named | room tone | Pan and zoom in one 3 s shot | `SK.cam` on an `<img>`, one direction, 3–6% |
| **stamp** | A word stamp ("DICEK", "2019") slams onto the document | Verdicts, dates, turning points | Hard hit on the stressed syllable | rubber stamp | Stamping an opinion as fact | `.sk-display` in a wrapper + `SK.enter(el, dt, 'slam')` |
| **source-line** | Small line at the bottom: outlet or domain, date, license | Every capture, stat, photo, map | For the whole shot | none | Under 28 px, or missing | `.sk-source` |
| **split-docs** | Two documents stacked top and bottom | Claim vs reality, then vs now | Second enters on "tapi" / "sedangkan" | two slaps | Both too small to read | two `SK.piece` sheets, each ≥ 900 px wide |
| **arrow-callout** | Hand-drawn arrow + 1–3 word label pointing at a detail | Pointing at a number or a line in a capture | Arrow draws on the noun | pen flick | Arrows pointing at nothing | `SK.arrow` + `.sk-hand` label |
| **before-after-doc** | The same document, old then new; a wipe or strike changes it | Pivots, price or policy changes | Swap on "sekarang" / "berubah" | paper flip | Implying a change the source doesn't show | two layers + `SK.highlight`-style wipe or `.sk-redact` strike |
| **chat-reveal** | Messages in an illustrative chat appear one by one; the key message gets the highlighter | "klien chat gue bilang…" | One message per quoted line; the highlighter on the key phrase | soft message pop | Messages nobody said; a real person's name or number | `SK.doc('chat-thread', …)` + `SK.enter` per `.sk-doc-msg` + `.sk-hl` |
| **cell-zoom** | A stepped push into one spreadsheet cell; the cell is highlighted and its number underlined | One number in a report | The push lands on the number word | low hum | A number nobody said; zooming into an empty cell | `SK.doc('spreadsheet', …)` with fixed cell sizes + `SK.cam` push + a highlight block; keep a fixed "Ilustrasi" tag in frame |
| **search-query** | A query types into an illustrative results page; the relevant result is pointed at | "coba lo search…" | Typing ends with the query; the pointer lands on the result named | soft typing | A real search engine's look; invented results that pass as real | `SK.doc('search-results', …)` + `SK.typeOn` on `.sk-doc-search` |
| **doc-timeline** | Dated clippings in a row; the camera steps from date to date | A sequence of events | One camera step per date said | click per step | Dates nobody said; more than 4 clippings | `SK.doc` clippings on a wide board + a stepped `SK.cam` focus `x` |
| **loupe-zoom** | A round magnifier enlarges one detail of the document | "lihat baris kecil ini" | The lens arrives on the pointing word, 0.3–0.5 s | small whoosh | A lens over what is not discussed; a shaking lens | a 2× copy of the document inside a round `overflow: hidden` lens, offset so its centre matches |

## References

### R1 — "5 Breakdowns on Replicating the VOX Motion Graphic Look" (PremiumBeat, 2021)
- Source: https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/
- Steal: graphics rendered at 12 fps inside a 24 fps timeline; camera pull-backs
  with blur to hide cuts; layered textures that move slightly.
- 9:16: step the graphic layer (`SK.onTwos`) while Dena stays at 30 fps; a short
  stepped push into the next document replaces a transition.

### R2 — "How Vox uses animation to make complicated topics digestible for everyone" (Storybench, 2024)
- Source: https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/
- Steal: "You don't want it to look perfect because that might make it look more
  like an ad than an editorial piece"; handmade construction-paper visuals; a
  recurring motif per concept.
- 9:16: torn, slightly crooked paper and visible grain; one motif (the
  highlighter) repeated across the video.

### R3 — "Explainer: An Interview with Vox Pop Video Essayist Estelle Caswell" (Film Independent, 2018)
- Source: https://www.filmindependent.org/blog/explainer-an-interview-with-vox-pop-video-essayist-estelle-caswell/
- Steal: "the whole point of video is that you're talking about the thing
  onscreen"; original data first.
- 9:16: every document on screen is the thing being said at that moment — never
  generic "paper vibes".

### R4 — "Vox Earworm Storytelling: A Chat with Estelle Caswell" (School of Motion)
- Source: https://schoolofmotion.com/blog/estelle-caswell-vox-podcast
- Steal: archival material first; colour highlighting on the words that matter;
  jump cuts and long holds instead of flashy transitions.
- 9:16: one clipping, one highlight, one hold — no triple motion on a 4 s beat.

### R5 — "Videogram: How a Vox Video Explains the Science behind the First Photo of a Black Hole" (The Open Notebook, 2020)
- Source: https://www.theopennotebook.com/2020/01/07/videogram-how-a-vox-video-explains-the-science-behind-the-first-photo-of-a-black-hole/
- Steal: context before the key image; label the image when it appears; show that
  illustrations are illustrations.
- 9:16: 1–2 s of setup, then the proof document with its label on the payoff word;
  the "Ilustrasi" tag is the same honesty.

### R6 — "Behind the scenes of the Vox web series 'Borders'" (Storybench, 2020)
- Source: https://www.storybench.org/behind-the-scenes-of-the-vox-web-series-borders/
- Steal: Johnny Harris hunts for visual anchors that carry meaning; the host talks
  to camera and the b-roll is the evidence.
- 9:16: Dena's face carries the voice; each VOX clip is one strong anchor for one
  claim.

### R7 — "How to Create Vox Style Maps in Adobe After Effects" (No Film School, 2020)
- Source: https://nofilmschool.com/how-create-vox-style-map-animations-after-effects
- Steal: camera path over the map, labels parented to the track points; desaturate,
  grade, drop to ~10 fps, add low-opacity grain.
- 9:16: 3–5 s zoom from the country to the city with `SK.geo`, the pin landing on
  the place name.

### R8 — "How I Got a Gig Making Maps for Johnny Harris" (PremiumBeat, 2022)
- Source: https://www.premiumbeat.com/blog/making-maps-for-johnny-harris/
- Steal: call-outs and shapes tracked to the camera move; markers that blink.
- 9:16: the label moves with the pin inside the camera layer; a label that drifts
  off its pin looks cheap.

### R9 — Ken Burns effect and *City of Gold* (NFB, 1957)
- Source: https://en.wikipedia.org/wiki/Ken_Burns_effect and
  https://en.wikipedia.org/wiki/City_of_Gold_(1957_film)
- Steal: slow pan and zoom across stills, settling on the subject being named;
  Burns cites *City of Gold* as the inspiration.
- 9:16: `archival-pan` — one direction, 3–6% over the shot, ending on the detail
  the line names.

### R10 — *Explained* (Netflix / Vox Media) and a Jasper Pictures case study
- Source: https://en.wikipedia.org/wiki/Explained_(TV_series) and
  https://jasperpictures.com.au/blog/vox-explained-a-case-study/
- Steal: the "trademark yellow highlighting" as a series signature.
- 9:16: one highlighter colour for the whole video (`--sk-hl-color` stays the same).

### R11 — "How Vox-Style Edits Are Built" (EarnEdits, secondary source)
- Source: https://earnedits.com/how-vox-style-edits-are-built/?v=0b3b97fa6688
- Steal: "a professional Vox edit uses motion to carry information, and an amateur
  imitation adds motion for decoration."
- 9:16: the QA rule — any move not tied to a spoken word is cut.

## Build Recipe

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    #sheet { position: absolute; left: 110px; top: 330px; width: 860px; height: 900px; }
    #paper { position: absolute; inset: 0; padding: 70px; box-sizing: border-box; }
    #head { font-size: 76px; font-weight: 700; line-height: 1.04; }
    #lede { margin-top: 40px; font-size: 44px; line-height: 1.32; }
    .hlw { position: relative; }
    #hl { left: -8px; right: -8px; top: 14%; bottom: 2%; }
    #tag { right: 30px; top: 30px; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="5">
    <div class="sk-stage sk-vox sk-newsprint">
      <div id="sheet" class="sk-cut">
        <div id="paper" class="sk-paper-white">
          <div id="head" class="sk-serif">Yang bikin capek bukan kerjanya</div>
          <div id="lede" class="sk-serif">tapi harus <span class="hlw"><span class="sk-hl" id="hl"></span>nyari datanya</span> lagi.</div>
          <div class="sk-doc-line" style="width:92%"></div>
        </div>
        <div class="sk-tag" id="tag">Ilustrasi</div>
      </div>
      <div class="sk-grain" id="grain"></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      $('paper').style.clipPath = SK.torn(860, 900, 11, { edges: 'b', amp: 12 });
      SK.clip(ID, { T: 5, update: (t) => {
        SK.highlight($('hl'), SK.smooth((t - 2.3) / 0.45));   // "nyari datanya" at clip time 2.3 s
        SK.grain($('grain'), t, 2);
      } });
    })();
  </script>
</template>
```

- Put the highlight inside a `position: relative` span around the spoken phrase,
  so it follows the text wherever it wraps. On a capture, place `.sk-hl` at the
  phrase's pixel box inside the capture's container.
- On a dark capture (terminal, dark-mode UI) the default `multiply` marker only
  tints the light text and the bar disappears; override it in the clip with
  `mix-blend-mode: screen; background: rgba(255, 225, 77, 0.55)`.
- Redaction bars on a capture are on from the clip's first frame
  (`SK.highlight(bar, 1)`) when the card drops in, so the hidden text is never
  readable mid-motion.
- Map pins: `const p = SK.geo(...SK.CITIES.jakarta)` (or any `[lat, lon]`), put the
  pin and label inside the same camera layer as the map.
- A capture is an `<img>` of `assets/captures/NN-name.png`; always add `.sk-source`.
- When the camera pushes so far into an `SK.doc` that its own tag leaves the frame,
  add a fixed `.sk-tag` "Ilustrasi" outside the camera layer (`vx-06`); the tag must
  stay visible (RD-03-54).
- Private details in an illustrative document (a phone number in a chat) are
  covered by `.sk-redact` from the first frame their line is visible (`vx-05`).
- An archival photo is a print: overscan it about 10% inside its window so a
  stepped push never shows its edge (`vx-11`).

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| highlight-sweep | soft marker squeak | 0.08–0.12 |
| pen-underline, circle-annotate, arrow-callout | pen scratch / flick | 0.08–0.12 |
| clipping-stack, split-docs | paper slap | 0.1–0.14 |
| stamp, map-zoom pin | rubber stamp / pin thud | 0.12–0.16 |
| doc-push, archival-pan | low paper rustle / room tone | 0.06–0.1 |
| chat-reveal, search-query | soft message pop / soft typing | 0.06–0.1 |
| cell-zoom, doc-timeline, loupe-zoom | low hum / click per step / small whoosh | 0.06–0.1 |

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/vox/compositions/vx-01-illustrative.html` | illustrative document + highlight-sweep + doc-push, "Ilustrasi" tag | cutaway |
| `style-examples/vox/compositions/vx-02-capture-split.html` | real capture (Wikipedia, CC BY-SA 4.0) + circle-annotate + highlight-sweep + doc-push + source-line | split |
| `style-examples/vox/compositions/vx-03-map-pin.html` | map-zoom onto Jakarta via `SK.geo` + source-line | cutaway |
| `style-examples/vox/compositions/vx-04-clipping-panel.html` | clipping-stack + stamp, "Ilustrasi" tag | panel |
| `style-examples/vox/compositions/vx-05-chat-redact.html` | chat-reveal + redact-bar on an illustrative chat | cutaway |
| `style-examples/vox/compositions/vx-06-cell-underline.html` | cell-zoom + pen-underline on an illustrative spreadsheet | split |
| `style-examples/vox/compositions/vx-07-search-arrow.html` | search-query + arrow-callout on illustrative results | cutaway |
| `style-examples/vox/compositions/vx-08-timeline-pinned.html` | doc-timeline + pinned-source | cutaway |
| `style-examples/vox/compositions/vx-09-loupe-before-after.html` | loupe-zoom + before-after-doc on an illustrative report | panel |
| `style-examples/vox/compositions/vx-10-quote-split.html` | pull-quote + split-docs | cutaway |
| `style-examples/vox/compositions/vx-11-archival-pan.html` | archival-pan on a public-domain photo with its source line | cutaway |

## Anti-slop Checklist

- [ ] Every document is a real capture with a source line, or an illustration tagged "Ilustrasi" — nothing in between.
- [ ] No real outlet's masthead, layout, or logo on an illustration; no AI gibberish or lorem ipsum anywhere.
- [ ] The highlight covers only the spoken words and finishes as they finish.
- [ ] The highlighted phrase means the same inside its full sentence; qualifiers were not cropped away.
- [ ] One motion per beat, then a hold; nothing keeps drifting after the line.
- [ ] Graphics move on the step grid; Dena's footage is not stepped.
- [ ] Annotations are hand-drawn (seeded builders), not perfect vector shapes.
- [ ] Map places come from `SK.geo` with real coordinates; labels stay on their pins.
- [ ] Source lines are ≥ 28 px and on screen ≥ 1.5 s; private data is redacted.
