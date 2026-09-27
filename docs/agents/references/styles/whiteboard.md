# Whiteboard (Style Reference)

A white board where lines and handwriting appear stroke by stroke, a marker tip
follows the pen, and finished lines "boil" slightly like hand-drawn animation.
Loaded by `docs/agents/02-screen-plan.md` (visual step, after
`styles/README.md`) and `docs/agents/03-build.md` (author step). Engine:
`vendor/style-kit/` (`window.SK`) on top of `vendor/motion-kit/` (`window.M`).
Worked examples: `docs/agents/references/style-examples/` (`wb-01` … `wb-04`,
`npm run check:style-examples`).

## When To Use

Use `whiteboard` for a line that **builds a thought**:

- a framework or steps ("3 langkah", "pertama… terus… akhirnya");
- a map of an idea (mind map around one named concept);
- a correction of a belief ("dulu gue pikir X, ternyata Y");
- a relation between people or parts ("klien → tim → sistem").

Do not use it for:

- a tool or UI action (use `motion-broll`), a spoken number to compare (use
  `motion-graphic`), a punchline (use `broll-text`);
- a personal, emotional, or opinion line (keep Dena's face);
- more than ~6 elements or ~12 words on one board: at phone size it becomes
  unreadable — split it into two clips or pan to a new zone.

Pick the drawing from the question the line answers (Dan Roam, *The Back of the
Napkin*): who/what → portrait or stick figure; how much → sketch chart; where →
map; when → timeline; how → flow; why → cause diagram.

## Look

| Token | Default (`.sk-wb`) | Alt A "kraft" | Alt B "blackboard" | Alt C "blueprint" |
| --- | --- | --- | --- | --- |
| `--sk-bg` | `#fbfbf8` | `#efe6d6` | `#1f2a24` | `#123a6b` |
| `--sk-ink` | `#151515` | `#2b2118` | `#f1f5f0` | `#eaf2ff` |
| `--sk-accent` | `#dc2626` | `#c2410c` | `#fde047` | `#fbbf24` |
| `--sk-accent-2` | `#2563eb` | `#1d4ed8` | `#93c5fd` | `#f472b6` |
| `--sk-muted` | `#9ca3af` | `#a08c70` | `#6b7f72` | `#7ea3d4` |

- Palette is free per clip; write hex values in the brief's `Palette:`. Black
  line art plus one or two accents used only for emphasis (RSA Animate).
- Lettering: Caveat 700 (`.sk-wb` default). Three sizes only — title ~100 px,
  keyword 84–120 px, note ≥ 44 px (Rohde's hierarchy).
- Line weight: 7 px ink (`.sk-wb .sk-stroke`), 9–12 px for accent circles and
  strikes. Round caps and joins.
- Shapes come from the hand-drawn builders so nothing is ruler-straight:
  `SK.line`, `SK.rect`, `SK.ellipse`, `SK.arrow` (seeded, deterministic).
- Pen (brief `Pen:`): `marker` (default) — `SK.MARKER_SVG` placed with
  `SK.placeMarker`; or `hand` — the flat illustrated hand from the paper pack
  (`<img class="sk-hand-img">` placed with `SK.placeHand`, poses `write` and
  `point`). Only this flat hand; a realistic stock hand clashes with line art.

## Timing

- Constant pen speed: lines ~750 px/s (`SK.drawSeq` without `dur`), so long lines
  take longer (vivus `oneByOne`). Short marks (ticks, arrowheads) 0.12–0.22 s.
- Handwriting 5–8 characters per second (`SK.write` over `chars / 6` seconds).
- Finish a stroke 0–0.15 s **before** its anchor word lands.
- Pen lift between strokes: 0.06–0.12 s gap.
- Boil only finished strokes, at 8 fps, ≤ 1.5 px (`SK.drawSeq(t, S, { boil: 1 })`).
- Camera moves (zoom-into-detail, pan) happen in pauses, 0.4–0.6 s, never while
  a stroke is drawing.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **draw-flow** | Box → arrow → box, top to bottom | "pertama… terus… akhirnya" | One node per step word; the arrow in the gap between words | short marker squeak per arrow | Drawing all nodes before they are named | `SK.rect` + `SK.arrow` in `SK.drawSeq` |
| **box-and-arrow** | Two labelled containers joined by a relation arrow | "A bikin B", "X ngobrol sama Y" | Box A on "A", arrow on the verb, box B on "B" | soft felt-tip drag | Arrows without a label | `SK.rect` ×2 + `SK.arrow` + `SK.write` label |
| **mind-map** | Named centre circle; branches grow outward | Facets of one idea | Centre first; a branch every 0.6–1 s | tiny tick per branch | More than 5 branches | `SK.ellipse` + `SK.line` branches + `SK.write` |
| **list-tick** | Handwritten items, then a tick each | Checklists, "3 hal" | Item on its word; tick ~0.2 s after | crisp tick | Ticking everything at once | `SK.write` per item + tick `<path>` in `SK.drawSeq` |
| **underline-circle** | Rough overshooting ellipse or underline on one word | The single key term | Circle starts on the stressed syllable, ~0.3–0.5 s | quick circular squeak | Circling several words | `SK.ellipse(…, seed)` in the accent colour |
| **cross-out** | A strike or X through a belief | "bukan X, tapi Y", myth-busting | Strike on "bukan"/"salah"; Y is written right after | hard scratch | Striking before the wrong idea was read | two `SK.line`s at 10–12 px, accent colour |
| **transform-reveal** | A few strokes turn drawing A into B (UPS truck → plane) | Reframes, "ternyata…" | A drawn early; the transforming strokes land on the payoff word | marker flick + light whoosh | B does not read as a change from A | extra paths drawn late; hide replaced parts with opacity |
| **stick-figure** | Minimal person with a two-stroke face | Customer, founder, "gue" | Figure in ≤ 0.8 s; the face swaps on the emotion word | soft pen tap | Detailed people and hands | `SK.ellipse` head + `SK.line` limbs; swap mouth paths |
| **speech-bubble** | Bubble with a handwritten quote from a figure | Reported speech, "klien bilang…" | Bubble on "bilang", text written with the quoted words | papery pop | Quotes longer than 6 words | `SK.ellipse` + tail `SK.line` + `SK.write` |
| **equation** | "A + B = C" handwritten, the result boxed | Trade-offs, formulas | Each term on its word; a 0.15 s pause at "="; box on the result | two taps for "=" | Real math notation the audience can't parse | `SK.write` per term + `SK.rect` around the result |
| **sketch-chart** | Wobbly axes, a bar or line, the value circled (xkcd) | "How much" / growth claims | Axes before the number; circle on the figure | rising squeak | Fake precision (gridlines, many ticks); invented values | `SK.line` axes + path + `SK.ellipse`; numbers only from transcript |
| **zoom-into-detail** | Camera pushes into one part of a finished board | Going deeper on one node ("nah, yang ini") | 0.4–0.6 s push on "nah"/"khususnya" | low swell | Zooming while strokes are drawing | `SK.cam(el, s, fx, fy)` with `M.track(…, M.SLOW)` |
| **pan-across-board** | A tall board; the camera moves down to the next zone (RSA reuse) | Sequential sections | Pan in the pause between sentences, ≤ 0.5 s | none or a quiet slide | Constant drifting | `SK.cam` focus `y` via `M.track` |
| **erase-redraw** | Part of the board wipes; the corrected version is redrawn | "dulu gue pikir… sekarang" | Erase 0.2–0.3 s on "tapi"; redraw on the new claim | eraser rub | Erasing everything (loses continuity) | wipe via `clip-path` on a group, then `SK.drawSeq` |

## References

### R1 — RSA Animate, "Changing Education Paradigms" (2010), drawn by Andrew Park / Cognitive
- Source: https://www.sirkenrobinson.com/rsa-animate-changing-education-paradigms/ ,
  https://en.wikipedia.org/wiki/Andrew_Park_(animator) , and
  http://linesandcolors.com/2010/08/27/rsa-animate-cognitive-media/
- Steal: words and pictures share one board; new ideas attach to what is already
  drawn instead of wiping; black line art with one or two accents.
- 9:16: one tall board per idea; each spoken keyword adds a label and an icon
  (1.5–2.5 s each), stacking downward so the whole board reads by 6–8 s.

### R2 — UPS "Whiteboard" campaign (2007), The Martin Agency, drawn by Andy Azula
- Source: https://slate.com/business/2007/04/the-mesmerizing-ups-whiteboard-ads.html and
  https://andyazula.com/ups
- Steal: a static camera, one continuous take; transformation reveals (a truck
  becomes a plane) create suspense; presenter and board share the frame.
- 9:16: `transform-reveal` — draw shape A, then 3–4 strokes on the payoff word turn
  it into B.

### R3 — Common Craft "Paperworks", "Twitter in Plain English" (2008)
- Source: https://en.wikipedia.org/wiki/Common_Craft
- Steal: pre-drawn cut-outs slide in instead of being drawn live; one flat plane;
  one concept per board, plain language.
- 9:16: bring a pre-drawn icon in within 0.15–0.2 s on its noun (`'drop'`), and
  hand-draw only the connecting arrows.

### R4 — MinutePhysics (Henry Reich)
- Source: https://en.wikipedia.org/wiki/MinutePhysics and
  https://perimeterinstitute.ca/news/wizard-of-the-whiteboard-five-great-clips-from-minutephysics
- Steal: time-lapsed drawing that arrives ahead of the narration; stick figures and
  bare icons; equations drawn as pictures.
- 9:16: one simple drawing per spoken clause, strokes finished before the key word ends.

### R5 — Dan Roam, *The Back of the Napkin* (2008)
- Source: https://actionablebooks.com/summaries/back-of-the-napkin/ and
  https://readingraphics.com/book-summary-the-back-of-the-napkin/
- Steal: "start any picture with a circle and give it a name"; match the picture
  type to the question (6 Ws); the SQVID choices before drawing.
- 9:16: tag each line with its question in the brief, then choose the pattern
  (the "Pick the drawing" rule above).

### R6 — Mike Rohde, sketchnotes and *The Sketchnote Handbook*
- Source: https://rohdesign.com/sketchnotes
- Steal: containers group ideas; hierarchy through three lettering sizes; a small
  repeatable vocabulary of bullets, arrows, boxes, and people.
- 9:16: three lettering sizes on 1080 px (~110 / 84 / 44) and one container type
  per video.

### R7 — Rough.js (Preet Shihn) and Excalidraw
- Source: https://shihn.ca/posts/2020/roughjs-algorithms/ ,
  https://github.com/rough-stuff/rough/blob/master/README.md , and
  https://plus.excalidraw.com/virgil
- Steal: endpoint jitter plus bowing through the line; circles that overshoot
  their start; a fixed seed for repeatable output.
- 9:16: the `SK.line`/`SK.rect`/`SK.ellipse`/`SK.arrow` builders follow this:
  seeded bow, overlapping corners, overshooting circles.

### R8 — xkcd style via `matplotlib.pyplot.xkcd`
- Source: https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.xkcd.html
- Steal: a low wiggle on long straight lines; hand-drawn charts; a handwritten sans
  keeps labels legible.
- 9:16: `sketch-chart` — wobbly axes, then the line, then circle the one number
  that matters.

### R9 — Line boil (PremiumBeat)
- Source: https://www.premiumbeat.com/blog/how-to-create-line-boil-animations/
- Steal: 3–4 traced variants looped at 8 fps; small amplitude keeps it calm; boil
  drawings that are at rest.
- 9:16: `SK.drawSeq(t, S, { boil: 1 })` — finished strokes jump to a new seeded
  offset 8 times a second, ≤ 1.5 px.

### R10 — vivus.js and perfect-freehand
- Source: https://github.com/maxwellito/vivus and
  https://github.com/steveruizok/perfect-freehand
- Steal: duration proportional to length gives a constant pen speed; author paths
  in true stroke order; tapered ends and pressure from velocity.
- 9:16: order `S` in `SK.drawSeq` the way the words are spoken; leave `dur` out so
  the pen speed stays constant.

### R11 — Graham Shaw, "Why people believe they can't draw" (TEDxHull 2015)
- Source: https://www.ted.com/talks/graham_shaw_why_people_believe_they_can_t_draw
- Steal: expressive faces from a few strokes, drawn live while talking.
- 9:16: a two-stroke emotion face on "frustrasi" or "lega" (the mouth swap in `wb-04`).

### R12 — CGP Grey's stick-figure avatar
- Source: https://en.wikipedia.org/wiki/CGP_Grey
- Steal: a recurring stick figure with one identifying feature represents the narrator.
- 9:16: a Dena stick figure with one signature trait, reused across videos when
  the line is about "gue".

## Build Recipe

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    .lab { position: absolute; width: 560px; text-align: center; font-size: 104px; font-weight: 700; line-height: 1; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="4">
    <div class="sk-stage sk-wb">
      <div class="sk-cam" id="cam">
        <svg class="sk-full" viewBox="0 0 1080 1920" width="1080" height="1920" id="ink"></svg>
        <div class="lab" id="l0" style="left:260px;top:468px">Masalah</div>
      </div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      $('ink').innerHTML = `<path id="b0" class="sk-stroke" d="${SK.rect(270, 420, 540, 190, 1)}"/>`;
      $('cam').insertAdjacentHTML('beforeend', SK.MARKER_SVG);
      const marker = $('cam').querySelector('.sk-marker');
      const S = [{ el: $('b0'), at: 0.25 }];                  // constant pen speed
      SK.clip(ID, { T: 4, update: (t) => {
        let tip = SK.drawSeq(t, S, { boil: 1 });
        const u = SK.smooth((t - 1.2) / 0.6);                   // "Masalah": 7 chars ≈ 0.6 s
        SK.write($('l0'), u);
        if (u > 0 && u < 1) tip = SK.writeTip(360, 720, 550, u);
        SK.placeMarker(marker, tip);
      } });
    })();
  </script>
</template>
```

- Build the SVG paths once, before `SK.clip`; the seed keeps them identical on
  every render.
- The marker lives inside the same layer as the ink (`#cam`), so camera moves keep
  the pen on the stroke.
- `SK.writeTip(x0, x1, y, u)` needs the label's left/right edge and baseline;
  read them off the first Still Check and adjust.
- Never set `visibility` on clip elements; hide with `opacity` (the kit does).
- `Pen: hand`: put `<img class="sk-hand-img" id="hand" alt="">` last in the stage
  (no `src`; `SK.placeHand` sets it). Each frame call
  `SK.placeHand($('hand'), tip, { last: SK.lastTip(t, S, pen) })` so the hand
  hovers after a stroke and glides off at the end; pass `{ pose: 'point' }` with a
  target point to point at something. Worked example: `wb-05-hand`.

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| draw-flow, box-and-arrow | short marker squeak per stroke group | 0.06–0.1 |
| list-tick, equation | crisp tick / two taps | 0.08–0.12 |
| cross-out, underline-circle | hard scratch / circular squeak | 0.1–0.14 |
| zoom-into-detail | low swell | 0.08–0.12 |

Do not play a squeak for every stroke; one per group of strokes on a word.

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/compositions/wb-01-flow.html` | draw-flow + box-and-arrow + underline-circle, camera follows | cutaway |
| `style-examples/compositions/wb-02-framework-panel.html` | list-tick on a small board card | panel |
| `style-examples/compositions/wb-03-mind-map.html` | mind-map + underline-circle + zoom-into-detail | split |
| `style-examples/compositions/wb-04-cross-out.html` | stick-figure + cross-out + face swap | cutaway |
| `style-examples/compositions/wb-05-hand.html` | draw-flow with the paper-pack hand: writes, points, then glides off | cutaway |

## Anti-slop Checklist

- [ ] Strokes draw one at a time in speaking order; nothing appears as a wipe of the whole board.
- [ ] Lines are hand-drawn (seeded builders), not ruler-straight vectors or closed perfect circles.
- [ ] Handwriting is written left to right, never faded in.
- [ ] Each element finishes on its word (±0.15 s); the board is not complete before Dena speaks.
- [ ] Boil is ≤ 1.5 px at 8 fps and only on finished strokes.
- [ ] No generic icon soup (lightbulbs, gears, rockets) unrelated to the line.
- [ ] At most ~6 elements and ~12 words on screen at once.
- [ ] No realistic stock hand (only the paper-pack hand); one or two accent colours only.
- [ ] With `Pen: hand`, the pen tip sits on the stroke, the hand hovers between strokes and glides off at the end.
- [ ] Every label is verbatim from the transcript or given by the user.
