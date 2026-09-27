# Motion Graphic (Style Reference)

Flat 2D infographic b-roll: icons, bars, rings, count-ups, arrows, unit charts,
and relationships, with no cursor and no UI chrome. Loaded by
`docs/agents/02-screen-plan.md` (visual step, after `styles/README.md`) and
`docs/agents/03-build.md` (author step). Engine: `vendor/style-kit/`
(`window.SK`) on top of `vendor/motion-kit/` (`window.M`, including `M.icon`).
Worked examples: `docs/agents/references/style-examples/` (`mg-01` … `mg-04`,
`npm run check:style-examples`).

## When To Use

Use `motion-graphic` for a line about **quantity, proportion, or relation**:

- a number or percentage Dena says ("70 persen", "1 dari 10");
- a comparison of two or three things ("manual vs otomatis");
- a cause → effect chain, a loop, a funnel, or a timeline;
- an abstract concept that becomes clear as a simple diagram.

Do not use it for:

- a tool or UI action (use `motion-broll`), a punchline (use `broll-text`), or a
  hand-built framework that should feel thought-out-loud (use `whiteboard`);
- any number, price, percentage, or result that is not verbatim from the
  transcript or given by the user (Gate 2 R1). Without a spoken number, use
  relative shapes, mark them illustrative in the brief, and never add axis values.

One chart, one message (The Economist). If the clip needs a second message, it is
a second clip.

## Look

| Palette | bg | ink | accent | accent-2 | muted | add | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.sk-pal-mg-default` | `#f4efe6` | `#1c1917` | `#2563eb` | `#f97316` | `#a8a29e` | — | legacy — exception: accent2 |
| `.sk-pal-mg-night` | `#0f172a` | `#f8fafc` | `#38bdf8` | `#f472b6` | `#64748b` | — | legacy |
| `.sk-pal-mg-economist` | `#f5f4f0` | `#0d0d0d` | `#e3120b` | `#6b7280` | `#b8b8b8` | — | legacy |
| `.sk-pal-mg-mint` | `#ecfdf5` | `#052e16` | `#059669` | `#f59e0b` | `#86efac` | — | legacy — exception: accent2 |
| `.sk-pal-mg-fintech` | `#0b1220` | `#e6edf7` | `#22c55e` | `#f43f5e` | `#475569` | — | new |
| `.sk-pal-mg-sunrise` | `#fff7ed` | `#1c1917` | `#c2410c` | `#7c3aed` | `#d6c7b4` | — | new |
| `.sk-pal-mg-mono-ink` | `#fafafa` | `#0a0a0a` | `#e11d48` | `#525252` | `#d4d4d4` | — | new |
| `.sk-pal-mg-ai-violet` | `#13111c` | `#f5f3ff` | `#a78bfa` | `#2dd4bf` | `#4c4868` | — | new |

| Type preset | display | body | hand | serif | mono |
| --- | --- | --- | --- | --- | --- |
| `.sk-type-mg-clean` | — | Geist | — | — | — |
| `.sk-type-mg-jakarta` | Plus Jakarta Sans | Plus Jakarta Sans | — | — | — |
| `.sk-type-mg-data` | — | Space Grotesk | — | — | JetBrains Mono |
| `.sk-type-mg-expressive` | Bricolage Grotesque | Geist | — | — | — |

- `.sk-pal-mg-default` and `.sk-pal-mg-mint` accent-2 (2.45:1, 2.04:1) — only as bar or area fills, never for text or thin lines.

- Put the palette class on the stage (`<div class="sk-stage sk-mg sk-pal-mg-ai-violet">`),
  plus the `add` class when listed; an overlay is its own full-frame div. Write the class in the
  brief's `Palette:`; hex values are still allowed when a video needs its own colours (say why).
- Type presets set `--sk-font-*`; `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`
  follow them. Font classes for one-offs: `.sk-f-<font>` (see `font.webp`).
- One palette preset per style per video, unless a palette change marks a new story section.
- The accent marks the one value the speaker names; everything else is ink or muted.
- Type: Geist (`.sk-mg` default) 600–800; big numbers 180–220 px with tight
  tracking (`letter-spacing: -0.04em`), labels 44–64 px, notes ≥ 34 px.
- Shapes: flat fills, no gradients, no 3D, no drop shadows on chart marks. A
  panel card may carry one soft shadow.
- Icons: one set only per clip — line icons `SK.icon(id, { size, sw, color })` (266 Lucide
  icons, see `icon-*.webp`; `M.icon` is the same set) or filled pictograms
  `SK.pict(id, { size, color })` (70 Phosphor, `pictogram.webp`). Never mix the two in one clip.
- Bars start at zero. Repeat icons to show more; never scale one icon up (Isotype).

## Kit

Library assets for this style — look at the sheets before choosing, then list the ids in the
brief's `Library assets:` (`vendor/asset-lib/CATALOG.md` has every id, tag, and source). Make a
new asset only when nothing here fits the line, and say why in the brief (RD-03-55).

| Need | Catalog ids | Sheet |
| --- | --- | --- |
| Line icons | `icon.coins`, `icon.chart-line`, `icon.users`, `icon.store`, `icon.bot`, `icon.clock`, `icon.receipt`, `icon.truck` | `../asset-catalog/sheets/icon-1.webp`, `../asset-catalog/sheets/icon-2.webp`, `../asset-catalog/sheets/icon-3.webp` |
| Isotype pictograms | `pict.person`, `pict.coins`, `pict.storefront`, `pict.package`, `pict.robot`, `pict.clock` | `../asset-catalog/sheets/pictogram.webp` |
| Maps behind data | `map.world`, `map.sea`, `map.id-provinces` | `../asset-catalog/sheets/map.webp` |
| Type | `font.plus-jakarta-sans`, `font.bricolage-grotesque`, `font.space-grotesk` | `../asset-catalog/sheets/font.webp` |
| Ground | `texture.dots` | `../asset-catalog/sheets/texture-1.webp` |

## Timing

- Entrances 0.4–0.6 s with a decelerating ease (`M.eo`, springs `M.SLOW`); exits
  ~0.2 s. Emphasis hits 0.2–0.3 s.
- Hold 0.8–1.5 s after the value lands.
- Stagger repeated items 0.04–0.08 s (`SK.stagger`).
- At most two stages per beat (Heer & Robertson): e.g. build the axis, then grow
  the bars. Never animate position and size of the same mark at once.
- A count-up starts ~0.3 s before the number word and lands on its last syllable.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **count-up** | Big number ticks to its value, label slides in | A single spoken figure | Lands on the number's last syllable | soft tick run → click | Counting to a number nobody said | `SK.count(t, t0, t1, from, to, dec)` |
| **donut** | Ring arc sweeps to a share with the number inside | A spoken percentage | Arc starts on the subject, lands on "persen" | rising tone | More than 3 segments; not summing to 100 | `<circle>` + `SK.draw(arc, share * u)`, svg `rotate(-90deg)` |
| **icon-grid** | Grid of identical pictograms fills in; some tinted | "1 dari 10", ratios, counts | Tint on "satu"/"dari" | soft pops, staggered | Scaling one icon instead of repeating | `SK.stagger` + `'pop'`, colours via `M.ctrack` |
| **bar-compare** | 2–3 bars grow from a zero baseline | "A vs B" | Each bar grows on its own word | two rising swooshes | Axis not at zero; invented values | height `M.track(0, [[at, h, M.SLOW]])` |
| **bar-race** | Horizontal bars re-order over time | A spoken ranking that changes | Re-sort staggered; the year changes on the spoken year | low whoosh | More than 5 bars | `top` per bar via `M.track`, stagger 0.05 s |
| **scale-compare** | A small mark beside a huge one; camera pulls back | "X kali lebih besar" | Pull back on "kali" | deep boom | Scaling area for a length claim (2× reads as 4×) | wrapper `scale` via `M.track`, compare lengths not areas |
| **arrow-flow** | Nodes linked by arrows that draw in | Process, cause → effect | Each arrow on its connective word ("terus", "jadi") | pen swish | Arrows pointing at nothing | `SK.drawSeq` on straight `<path>`s + node `'pop'` |
| **cycle-loop** | A return arrow closes the flow into a loop | Flywheel, vicious circle | The loop closes on the closing word | low rotating whoosh | Calling a one-way sequence a loop | curved `<path>` in `SK.drawSeq` |
| **timeline** | A line with dated ticks and a moving marker | Years or stages | Marker arrives on each spoken date | tick per stop | Uneven spacing that distorts time | marker `x` via `M.track`, ticks `SK.draw` |
| **before-after** | Split frame or wipe; the "after" value highlighted | Two states | Wipe on "sekarang"/"tapi" | swipe | Different scales on the two sides | two layers, `clip-path` wipe with `M.eo` |
| **venn** | Two circles slide together; the overlap tints | Two qualities meet in one thing | Overlap tints on the payoff noun | soft chime | An overlap that means nothing | two `<circle>`s, `x` via `M.track`, overlap via `mix-blend-mode: multiply` |
| **funnel** | Stacked bands narrowing, stage by stage | Conversion drop-off the speaker names | Each band narrows on its stage word | descending ticks | Band widths not proportional to the spoken counts | band `width` via `M.track`, relative if no numbers |
| **stack-up** | Blocks drop onto a pile to a total | Adding costs or features | Each block lands on its item word | thud per block | Blocks that don't sum to the total shown | `'drop'` per block, `SK.stagger` |
| **dot-matrix** | 10×10 dots; a share fills with the accent | A % that should feel concrete | Fill sweeps in, done on "persen" | rapid soft ticks | Rounding that changes the meaning | 100 dots, fill order by index, `M.ctrack` |
| **map-pin** | Flat map; region tints, pin drops | A named place or market | Pin drops on the place name | pin tick | Wrong geography | flat SVG map asset + `'drop'` (map asset from sub-project 2 pipeline) |
| **bubble-move** | 1–3 bubbles travel across two axes with a big year behind | "dari … ke …" over time | Travel lasts the phrase; stops on the end value | soft whoosh | Unlabelled axes; invented trajectories | `x/y/r` via `M.track`, year via `SK.count` |

## References

### R1 — Kurzgesagt – In a Nutshell
- Source: https://kurzgesagt.org/what-we-do?visit=videos (studio) and
  https://10.studio/the-incredible-amount-of-work-behind-kurzgesagts-beautiful-animated-videos/ (third-party production write-up)
- Steal: vibrant flat vector illustration on dark fields; artwork split into many
  layers so each part moves on its own; narration timing drives the animation;
  deep booms on key words.
- 9:16: one saturated object on a flat field, built from separately animated
  parts; the main shape lands on the stressed word with a low soft thump.

### R2 — Isotype (Otto Neurath, Marie Neurath, Gerd Arntz)
- Source: https://en.wikipedia.org/wiki/Isotype_(picture_language) and
  https://isotyperevisited.org/2012/08/introduction.php
- Steal: more of something = more copies of the same-sized pictogram, never a
  bigger pictogram; flat, no perspective; a fixed counting unit with a legend.
- 9:16: `icon-grid` of 5 per row, filling row by row on the spoken number, with a
  legend line on top ("1 ikon = 1 klien").

### R3 — Hans Rosling, "The best stats you've ever seen" (TED 2006) and Gapminder
- Source: https://www.ted.com/talks/hans_rosling_the_best_stats_you_ve_ever_seen and
  https://www.gapminder.org/about/about-gapminder/history/
- Steal: bubbles move through time while a huge year label runs behind; the voice
  drives the motion like sports commentary.
- 9:16: `bubble-move` with at most 2–3 bubbles and a big year counter behind;
  move one bubble while Dena says "dari … ke …".

### R4 — Hans Rosling, *200 Countries, 200 Years, 4 Minutes* (BBC Four, 2010)
- Source: https://www.themarginalian.org/2010/12/03/hans-rosling-bbc/
- Steal: the presenter stands inside the chart; milestones anchor points in the data.
- 9:16: keep Dena on screen (panel or split) while a flat chart grows beside her,
  instead of a full cutaway.

### R5 — The Economist chart style
- Source: https://aecharts.com/blog/posts/how-to-create-charts-like-the-economist/ (third-party guide) and
  https://www.niemanlab.org/reading/mistakes-weve-drawn-a-few-learning-from-our-errors-in-data-visualization/ (Sarah Leo, 2019)
- Steal: one chart, one message; the main series in red, the rest grey; values
  labelled directly, no legend; minimal gridlines. Leo's three failure kinds:
  misleading, confusing, failing to make a point.
- 9:16: one accent for the value Dena names; everything else muted; the title is
  the spoken claim (palette "economist" above).

### R6 — Vox explainers (Joss Fong; PremiumBeat breakdown)
- Source: https://www.theopennotebook.com/2020/01/07/videogram-how-a-vox-video-explains-the-science-behind-the-first-photo-of-a-black-hole/ and
  https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/
- Steal: narration that points ("ini", "lihat") while the picture points at the
  same thing; the payoff image is held back; graphics stepped at 12 fps.
- 9:16: build the chart in steps that land on the deictic word ("ini"); push back
  with a short blur into the next beat.

### R7 — Heer & Robertson, "Animated Transitions in Statistical Data Graphics" (IEEE TVCG 2007)
- Source: https://idl.cs.washington.edu/files/2007-AnimatedTransitions-InfoVis.pdf
- Steal: staging (rescale the axis first, then change values), staggering, slow-in
  slow-out, about 1 s per transition — "as long as needed, but no longer".
- 9:16: two stages of 0.6–1 s per beat, 0.04–0.08 s stagger per item.

### R8 — Google Material motion (duration and easing)
- Source: https://m1.material.io/motion/duration-easing.html and
  https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
- Steal: decelerate to enter, accelerate to exit; exits shorter than entries;
  duration grows with distance.
- 9:16: enter ~0.4–0.5 s decelerating (`M.eo`), exit ~0.2 s; full-height moves
  take the longer end.

### R9 — Our World in Data, "Redesigning our interactive data visualizations" (2023)
- Source: https://ourworldindata.org/redesigning-our-interactive-data-visualizations
- Steal: every chart shows where the data comes from; chart, map, and table are
  views of the same data.
- 9:16: a small source line under any chart with a number ("kata Dena", or the
  source the user gave).

### R10 — Flourish, "How to make Bar Chart Race visualizations without coding" (2019)
- Source: https://flourish.studio/blog/bar-chart-race/
- Steal: bars re-order live with a large time label; the axis can be locked to
  show absolute change.
- 9:16: `bar-race` with at most 5 horizontal bars, only when the speaker lists a
  ranking that changes over time.

### R11 — Datawrapper Academy, "Why our column and bar charts start at zero"
- Source: https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero
- Steal: bars always start at zero — truncated axes make viewers overestimate
  differences (Pandey et al. 2015).
- 9:16: a hard rule for every `bar-compare`, `bar-race`, and `funnel`.

### R12 — Giant Ant (Communication Arts feature)
- Source: https://www.commarts.com/features/giant-ant
- Steal: "if there is no real story, there's no soul"; style frames are locked
  before animation starts.
- 9:16: the Style Brief is the style frame — palette, pattern, and layout are
  decided in Screen Plan, not improvised in Build.

## Build Recipe

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    #ring { position: absolute; left: 190px; top: 420px; width: 700px; height: 700px; transform: rotate(-90deg); }
    #num { position: absolute; left: 0; right: 0; top: 640px; text-align: center; font-size: 210px; font-weight: 800; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="5">
    <div class="sk-stage sk-mg">
      <svg id="ring" viewBox="0 0 700 700" width="700" height="700">
        <circle cx="350" cy="350" r="290" fill="none" stroke="#e7e0d3" stroke-width="64" />
        <circle id="arc" cx="350" cy="350" r="290" fill="none" stroke="var(--sk-accent)" stroke-width="64" />
      </svg>
      <div id="num">0%</div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      SK.clip(ID, { T: 5, update: (t) => {
        SK.draw($('arc'), 0.7 * M.eo((t - 0.5) / 1.6));   // 0.7 = the spoken 70 persen
        $('num').textContent = SK.count(t, 0.5, 2.1, 0, 70) + '%';
      } });
    })();
  </script>
</template>
```

- Numbers go through `SK.count`/`SK.fmt`, which format the Indonesian way
  (`1.250.000`, `2,5`).
- Drawn lines and arcs use `SK.draw`/`SK.drawSeq`; they hide with opacity, so the
  clip disappears cleanly when its mount ends.
- `bg: null` for split and panel; draw the split backdrop in the top 960 px.

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| count-up, dot-matrix | soft tick run → click | 0.08–0.12 |
| bar-compare, stack-up | rising swoosh / soft thud per mark | 0.1–0.14 |
| arrow-flow, cycle-loop | pen swish / low rotating whoosh | 0.08–0.12 |
| scale-compare | deep soft boom | 0.14–0.18 |

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/compositions/mg-01-count.html` | count-up + donut, label words rise | cutaway |
| `style-examples/compositions/mg-02-compare-bars.html` | bar-compare + scale-compare bracket, night palette, relative (no values) | split |
| `style-examples/compositions/mg-03-icon-grid.html` | icon-grid (Isotype legend) + one tinted unit | cutaway |
| `style-examples/compositions/mg-04-arrow-flow.html` | arrow-flow + cycle-loop on a panel card | panel |

## Anti-slop Checklist

- [ ] Every number, percentage, and ratio is verbatim from the transcript or given by the user.
- [ ] Bars start at zero; no axis values on relative (illustrative) charts.
- [ ] More quantity is shown by more icons, never a bigger icon.
- [ ] One message per clip; the title or label states it.
- [ ] One accent colour for the named value; no rainbow palettes.
- [ ] Staged motion: at most two stages per beat; nothing keeps moving after the value lands.
- [ ] One icon style per clip; no generic 3D pies, glossy stock icons, or "Title Here" layouts.
- [ ] Parts sum correctly (shares add to 100, stacks add to the total shown).
- [ ] Labels are readable at phone size (≥ 34 px) and in the language Dena spoke.
