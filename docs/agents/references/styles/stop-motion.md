# Stop-motion (Style Reference)

Paper cut-outs animated in visible steps: pieces slide, drop, tear, pop up, and
swap drawings, each resting pose held for two frames and nudged a little between
frames, with hard paper shadows, torn edges, tape, and pins. Loaded by
`docs/agents/02-screen-plan.md` (visual step, after `styles/README.md`) and
`docs/agents/03-build.md` (author step). Engine: `vendor/style-kit/`
(`window.SK`) on top of `vendor/motion-kit/` (`window.M`); paper textures and
objects: `vendor/paper-pack/` (`paper-pack.css`, licenses in `LICENSES.md`).
Worked examples: `docs/agents/references/style-examples/stop-motion/` (`sm-01` … `sm-04`,
`npm run check:style-examples -- stop-motion`).

## When To Use

Use `stop-motion` for a line that is **physical, manual, or handmade**:

- a manual process or a pile of work ("nota, chat, excel, catatan");
- a story with concrete objects (a laptop, a phone, a receipt, a sticky note);
- a before → after told as objects being swapped, torn away, or crumpled;
- a warm, human, founder-diary tone where a clean UI look would feel cold.

Do not use it for:

- a tool or UI action (use `motion-broll`), a precise number (use
  `motion-graphic`), a punchline that needs pure type (use `broll-text`);
- a personal, emotional, or opinion line (keep Dena's face);
- anything that needs real proof — a paper cut-out is always illustrative.

Objects are cut-outs from the paper pack, pieces drawn in code (SVG + paper
texture + `SK.torn`), or per-video cut-outs listed in the brief's `Assets:`
(see Style Assets in `asset-production.md`). Never generate Dena's likeness;
a Dena cut-out comes only from her footage.

## Look

| Palette | bg | ink | accent | accent-2 | muted | add | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.sk-pal-stop-default` | `#bb8f4d` | `#2b2118` | `#b5452b` | `#2f6f8f` | `#8a7355` | `.sk-kraft` | legacy |
| `.sk-pal-stop-notebook` | `#f5f3f4` | `#1f2937` | `#dc2626` | `#2563eb` | `#9ca3af` | `.sk-lined` | legacy |
| `.sk-pal-stop-night-desk` | `#a68768` | `#f5efe6` | `#f59e0b` | `#7dd3fc` | `#a8a29e` | `.sk-kraft-dark` | legacy — exception: ink |
| `.sk-pal-stop-blueprint-paper` | `#f5f3f4` | `#1e3a5f` | `#b5452b` | `#2f6f8f` | `#7ea3d4` | `.sk-grid` | legacy |
| `.sk-pal-stop-warung` | `#ba8e4e` | `#2b2118` | `#d62828` | `#2a9d8f` | `#8a7355` | `.sk-tex-cardboard` | new |
| `.sk-pal-stop-school-craft` | `#f5f3f4` | `#1f2937` | `#f4a261` | `#3a86ff` | `#adb5bd` | `.sk-paper-white` | new |
| `.sk-pal-stop-midnight-desk` | `#2a1f17` | `#f5efe6` | `#e9c46a` | `#7dd3fc` | `#a8a29e` | overlay `.sk-tex-film` | new |
| `.sk-pal-stop-pastel-cut` | `#f5ebd0` | `#2b2d42` | `#ffafcc` | `#a2d2ff` | `#bdb2a0` | `.sk-paper-cream` | new |

| Type preset | display | body | hand | serif | mono |
| --- | --- | --- | --- | --- | --- |
| `.sk-type-stop-default` | — | Geist | — | — | — |
| `.sk-type-stop-school` | — | Patrick Hand | — | — | — |
| `.sk-type-stop-label` | Archivo Black | Geist | — | — | — |

- `.sk-kraft-dark` averages #a68768: in `night-desk` the light ink goes on dark paper pieces, never straight on the backdrop.

- Put the palette class on the stage (`<div class="sk-stage sk-stop sk-pal-stop-pastel-cut">`),
  plus the `add` class when listed; an overlay is its own full-frame div. Write the class in the
  brief's `Palette:`; hex values are still allowed when a video needs its own colours (say why).
- Type presets set `--sk-font-*`; `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`
  follow them. Font classes for one-offs: `.sk-f-<font>` (see `font.webp`).
- One palette preset per style per video, unless a palette change marks a new story section.

- Paper backgrounds: `.sk-paper-white`, `.sk-paper-cream`, `.sk-paper-grey`,
  `.sk-paper-crumpled`, `.sk-kraft`, `.sk-kraft-ribbed`, `.sk-kraft-dark`,
  `.sk-lined`, `.sk-grid`, `.sk-newsprint` (`paper-pack.css`, loaded after
  `style-kit.css`), plus the library's `.sk-tex-cardboard`, `.sk-tex-wood-desk`, `.sk-tex-cork`,
  `.sk-tex-paper-tan` (`texture-*.webp`). Give each piece its own paper; one texture everywhere reads
  digital (Charlie and Lola).
- Paper objects: `.sk-sticky`, `.sk-pin`, `.sk-clip`, `.sk-tape-a`,
  `.sk-tape-b`, and the library's `.sk-obj-*` (tapes, scraps, stationery, stickers, and
  topic cut-outs such as `.sk-obj-coin-stack`, see `paper-*.webp`) — size them with
  `width` only (`aspect-ratio` keeps the shape).
  Use these divs, not `<img>`, so one clip can repeat an object.
- Shadow: `.sk-cut` — a hard offset shadow, one light direction for every piece.
  Put `.sk-cut` on a wrapper and the torn `clip-path` on an inner element; a
  shadow on the clipped element itself is cut away.
- Type on paper: `.sk-display` for stamped labels, `.sk-hand` for handwriting on
  notes; never name a font family in a clip `<style>`.
- Grain: one `.sk-grain` overlay per clip, moved by `SK.grain` each step.

## Kit

Library assets for this style — look at the sheets before choosing, then list the ids in the
brief's `Library assets:` (`vendor/asset-lib/CATALOG.md` has every id, tag, and source). Make a
new asset only when nothing here fits the line, and say why in the brief (RD-03-55).

| Need | Catalog ids | Sheet |
| --- | --- | --- |
| Topic cut-outs | `paper.coin-stack`, `paper.banknote-generic`, `paper.chat-bubble`, `paper.ai-chip`, `paper.warung-front`, `paper.shopping-bag`, `paper.parcel-box`, `paper.lightbulb`, `paper.calculator` | `../asset-catalog/sheets/paper-2.webp` |
| Stationery | `paper.scrap-torn-yellow`, `paper.sticky-pink`, `paper.receipt-blank`, `paper.ticket-stub`, `paper.washi-pink` | `../asset-catalog/sheets/paper-1.webp` |
| Grounds | `texture.cardboard`, `texture.wood-desk`, `texture.kraft` | `../asset-catalog/sheets/texture-1.webp`, `../asset-catalog/sheets/texture-2.webp` |
| Torn edges | `frame.torn-all`, `frame.torn-rough` | `../asset-catalog/sheets/frame-1.webp` |
| Labels | `pict.coins`, `font.patrick-hand`, `font.archivo-black` | `../asset-catalog/sheets/pictogram.webp`, `../asset-catalog/sheets/font.webp` |

## Timing

- Step rate: `SK.STOP_FPS` = 15 steps per second. HyperFrames renders at 30 fps,
  so each pose holds exactly two frames ("on twos"); 12 fps would hold an uneven
  3:2 pattern at 30 fps.
- Write curves as usual (`M.track`, springs) and wrap them in `SK.onTwos(...)`;
  never hand-pose every step (Spider-Verse: quantize a smooth curve).
- Replacement jitter: `SK.piece(el, pose, seed, t)` — ±1.5 px and ±0.5° per
  step by default; keep `amp` ≤ 2, or it reads as camera shake.
- A move lasts 3–10 steps (0.2–0.7 s); rest 6–12 steps between moves. Only the
  piece tied to the spoken word moves (South Park rule).
- Snaps, not glides: Gilliam's cut-outs make sudden moves; overshoot is at most
  one step. No motion blur, morphs, or crossfades on paper.
- Start a move 2–3 steps before the word; it lands on the word.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **slide-on-twos** | A piece slides in with visible steps and a one-step overshoot | A noun is introduced | Start 3 steps early, land on the word | soft paper slide | 10+ steps, which reads as a laggy tween | `SK.onTwos(M.track(x0, [[at, x1, [14, .7]]]))` + `SK.piece` |
| **pop-up** | A card or object springs up from flat (scaleY 0 → 1) | A reveal, "ternyata…" | 3 steps, peak on the word, 1-step overshoot | card snap | Bouncy elastic easing | `s` from `SK.onTwos(M.track(0, [[at, 1, [24, .55]]]))` |
| **fold/unfold** | A sheet opens 1 → 2 → 4 panels | A list, "ada 3 hal" | 2 steps per fold, one fold per item | crisp crease | Unfolding before the count is said | panels with `scaleX` via `SK.onTwos`, hinge at the fold |
| **tear-reveal** | A torn cover is ripped away, showing the layer below | A contrast or twist | Tear across the word, 6–10 steps | short paper rip | A straight tear edge | cover with `SK.torn(..., {edges:'b'})`, `y`/`r` via `SK.onTwos` |
| **pin-and-swap** | A pinned card is replaced by a new card | "dulu X, sekarang Y" | Swap on the Y word, no in-between | pin click | Crossfading the swap | two pieces, `o` switches at the word |
| **replacement-face** | Mouth or eye drawings swap per step while "talking" | Quoting someone, a reaction | One drawing per step while the quote is spoken; hold closed in pauses | none or a tiny tap | Lip-syncing a figure to Dena's own voice | mouth paths, `SK.cycle(t, n)` picks one |
| **paper-scroll** | A long strip moves through the frame step by step | A timeline or process | One stop per key word | low continuous rustle | A smooth continuous scroll | strip `y` via `SK.onTwos(M.track(...))` |
| **stack-pile** | Cards drop onto a growing, slightly messy pile | Accumulation, "tambah lagi" | One drop per repeated word | card tap per drop | Every card landing perfectly aligned | per-card drop `SK.onTwos` + seeded offsets, `SK.torn` edges |
| **sticky-wall** | Notes slap onto a board with pins | Brainstorm, many small items | Each note lands on its word, ≥ 3 steps apart | sticky slap + pin click | More than 5 notes (unreadable at 9:16) | `.sk-sticky` + `.sk-pin` + `.sk-hand` text, drop from 1.25× scale |
| **flip-card** | A card turns via a 2–3-step squash (not 3D) | Myth vs fact | Edge-on step just before the word, new face on the word | card flick | Smooth 3D `rotateY` | `scaleX` 1 → .1 → 1 on twos, swap faces at the edge-on step |
| **tape-on** | A label drops in and tape strips hold it | Locking a key claim | Label on the word, tape one step later | tape rip-and-press | Tape on everything (it stops meaning emphasis) | `.sk-tape-a`/`.sk-tape-b` on the label's corners |
| **crumple-away** | A piece swaps to a crumpled state, then a ball that leaves | Rejecting an idea, "jangan" | Two replacement states, exit in 3–6 steps | paper crumple | Morph or blur instead of replacement drawings | hide the card, show `.sk-paper-crumpled` ball, exit via `SK.onTwos` |
| **hinge-limb** | A jointed arm or pointer pivots from a pin | Pointing, cause → effect | Rotate across 3–4 steps, reach the target on the word | faint pin creak | Too many joints (a puppet ballet) | limb with `transform-origin` at the joint, `r` via `SK.onTwos` |
| **multiplane-depth** | 3–4 paper layers drift at different rates, a tissue veil lifts | Mood, "bayangin…" | Layers offset one step from each other; 1–2 s total | room tone | Layers moving in sync (kills the depth) | layers with different `M.track` rates, each through `SK.onTwos` |

## References

### R1 — Lotte Reiniger, *Die Abenteuer des Prinzen Achmed* (1926)
- Source: https://en.wikipedia.org/wiki/The_Adventures_of_Prince_Achmed and
  https://en.wikipedia.org/wiki/Lotte_Reiniger
- Steal: silhouette puppets of cardboard and tracing paper, jointed with wire;
  emotion from gesture, not faces; one colour tint per scene; lit from below
  through glass planes.
- 9:16: a black silhouette of the concept against one tinted panel; its jointed
  limb moves on the stressed verb (`hinge-limb`).

### R2 — Terry Gilliam, *Monty Python's Flying Circus* animations (1969–74)
- Source: https://www.openculture.com/2014/07/terry-gilliam-reveals-the-secrets-of-monty-python-animations.html and
  https://www.pixartprinting.co.uk/blog/terry-gilliams-unusual-animated-collages/
- Steal: pieces move a few millimetres per frame under glass; the lower jaw is a
  separate piece so a mouth can talk; smooth motion is "damned near impossible",
  sudden moves are easy — build on snaps.
- 9:16: a cut-out with a hinged jaw that flaps on the quoted words, then one
  sudden snap on the punchline.

### R3 — *South Park* pilot, "Cartman Gets an Anal Probe" (1997)
- Source: https://en.wikipedia.org/wiki/Cartman_Gets_an_Anal_Probe
- Steal: construction-paper cut-outs with replacement mouth shapes, shot to
  pre-recorded dialogue; only the speaker moves; backlit holes for stars.
- 9:16: lock the words first, swap mouth drawings per step while the quote runs,
  keep everything else still (`replacement-face`).

### R4 — Yuri Norstein, *Hedgehog in the Fog* (1975)
- Source: https://en.wikipedia.org/wiki/Hedgehog_in_the_Fog and
  https://animationobsessive.substack.com/p/a-guide-to-yuri-norstein-hedgehog
- Steal: cut-out pieces spread over 4–5 glass planes that slide separately; fog is
  tracing paper lifted toward the camera frame by frame.
- 9:16: `multiplane-depth` — 3–4 layers and a tissue veil that lifts to reveal the
  key noun or drops to fade a rejected idea.

### R5 — Smallfilms (Oliver Postgate, Peter Firmin), *Ivor the Engine*
- Source: https://en.wikipedia.org/wiki/Ivor_the_Engine and
  https://blog.animationstudies.org/recollecting-ivor-the-engine-1959/
- Steal: watercolour-painted cardboard cut-outs; simple motion for simple stories;
  home-made sound effects that match the handmade look.
- 9:16: one textured object making one simple move per clause; SFX from real
  paper (rustle, tap) rather than synth whooshes.

### R6 — John Ryan, *Captain Pugwash* (BBC, 1957–66)
- Source: https://en.wikipedia.org/wiki/Captain_Pugwash
- Steal: cardboard cut-outs moved by levers on their backs — a whole piece swings
  from one hidden pivot.
- 9:16: "lever" motion — an arm rises or a sign swings in from one pivot on the
  word.

### R7 — Harry Smith, *Heaven and Earth Magic* (1962)
- Source: https://en.wikipedia.org/wiki/Heaven_and_Earth_Magic
- Steal: Victorian engraving cut-outs on black; objects keep transforming into
  each other; a soundtrack of clocks, water, and effect records.
- 9:16: one object swaps into another on the beat ("dulu… sekarang") —
  `pin-and-swap` with engraved-looking pieces on a dark ground.

### R8 — Jan Lenica, *Labirynt* (1962); with Walerian Borowczyk, *Dom* (1958)
- Source: https://mubi.com/en/notebook/posts/the-forgotten-jan-lenica-s-labyrinth-1963 and
  https://en.wikipedia.org/wiki/Dom_(film)
- Steal: tinted, smudgy old photos and engravings in a collage; looped grotesque
  motion; cut-outs mixed with live action and pixilation.
- 9:16: a desaturated, tinted collage with a 4–6-step loop behind a static label;
  this leads into the mix-media style (sub-project 2b).

### R9 — *Charlie and Lola* (Tiger Aspect, 2005–08)
- Source: https://en.wikipedia.org/wiki/Charlie_and_Lola_(TV_series)
- Steal: paper cut-outs mixed with fabric, real textures, and photomontage.
- 9:16: give each piece its own scanned material (kraft, lined, crumpled, sticky
  note); mixed materials read handmade faster than one texture.

### R10 — Common Craft, "Twitter in Plain English" (2008)
- Source: https://en.wikipedia.org/wiki/Common_Craft
- Steal: paper cut-outs on a plain board explaining tech in plain language; one
  concept per board.
- 9:16: labelled cut-outs (phone, laptop, sticky notes) slide in as each is named
  — the closest match to Dena's topics.

### R11 — Animating "on twos"; *Spider-Man: Into the Spider-Verse* (2018)
- Source: https://en.wikipedia.org/wiki/Inbetweening and
  https://www.cgspectrum.com/blog/spider-man-into-the-spider-verse-how-they-got-that-mind-blowing-look
- Steal: one new drawing every two frames; Spider-Verse animated smoothly and then
  stepped the result, using sharp stepped poses instead of motion blur.
- 9:16: write a smooth curve and wrap it in `SK.onTwos` (15 steps/s at a 30 fps
  render); no blur.

## Build Recipe

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
    #label { width: 760px; height: 170px; }
    #paper { position: absolute; inset: 0; }
    #paper span { position: absolute; left: 0; right: 0; top: 30px; text-align: center; font-size: 104px; color: var(--sk-accent); }
    #label .tp { top: -26px; width: 190px; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="4">
    <div class="sk-stage sk-stop sk-kraft">
      <img class="p sk-cut" id="obj" src="assets/cutouts/NN-laptop.png" alt="" style="width:760px" />
      <div class="p sk-cut" id="label">
        <div id="paper" class="sk-paper-cream"><span class="sk-display">semua manual</span></div>
        <div class="tp sk-tape-a" style="left:-40px;transform:rotate(-24deg)"></div>
      </div>
      <div class="sk-grain" id="grain"></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      $('paper').style.clipPath = SK.torn(760, 170, 4, { edges: 'lr', amp: 12 });
      const x = SK.onTwos(M.track(-900, [[0.2, 160, [14, 0.7]]]));   // slide-on-twos
      const drop = SK.onTwos(M.track(1, [[1.6, 0, [22, 0.7]]]));       // tape-on label
      SK.clip(ID, { T: 4, update: (t) => {
        SK.piece($('obj'), { x: x(t), y: 300 }, 1, t);
        const k = drop(t);
        SK.piece($('label'), { x: 160, y: 1420 + 260 * k, r: -2 + 6 * k, o: t >= 1.6 ? 1 : 0 }, 2, t);
        SK.grain($('grain'), t, 3);
      } });
    })();
  </script>
</template>
```

- `SK.piece` owns the element's `transform`: set position, rotation, scale, and
  opacity through the pose, not in CSS.
- Per-video cut-outs live in `assets/cutouts/`; paper-pack objects are classes.
- The host must load `vendor/paper-pack/paper-pack.css` after `style-kit.css`
  (the Dena starter does).

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| slide-on-twos, paper-scroll | soft paper slide / rustle | 0.08–0.12 |
| stack-pile, pop-up, flip-card | card tap / snap | 0.1–0.14 |
| sticky-wall, pin-and-swap | sticky slap + pin click | 0.1–0.14 |
| tear-reveal, tape-on | paper rip / tape rip-and-press | 0.12–0.16 |
| crumple-away | paper crumple | 0.12–0.16 |

Prefer recorded paper sounds over synthetic whooshes (Smallfilms).

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/stop-motion/compositions/sm-01-slide-pin.html` | slide-on-twos (Codex laptop) + sticky-wall + tape-on | cutaway |
| `style-examples/stop-motion/compositions/sm-02-tear-split.html` | tear-reveal + pop-up (Codex phone) | split |
| `style-examples/stop-motion/compositions/sm-03-replace-panel.html` | replacement-face + pin-and-swap on a taped card | panel |
| `style-examples/stop-motion/compositions/sm-04-stack-crumple.html` | stack-pile + crumple-away + slide-on-twos + tape-on | cutaway |

## Anti-slop Checklist

- [ ] Motion is stepped (`SK.onTwos` / `SK.piece`); nothing glides at 30 fps under a paper texture.
- [ ] Pieces use different papers; the grain moves each step instead of sitting still.
- [ ] Shadows are hard, small, and all point the same way; no big soft blur.
- [ ] Jitter is present but ≤ 2 px; resting pieces still breathe a little.
- [ ] No motion blur, morphs, or crossfades on paper — swaps are replacement drawings.
- [ ] Edges are cut or torn (`SK.torn`), not perfect vector rectangles.
- [ ] Tape, pins, and sticky notes mark a spoken beat; they are not decoration everywhere.
- [ ] Every cut-out matches a transcript noun; no generic vintage collage, gears, or lightbulbs.
- [ ] Generated cut-outs contain no text and no real person or brand; words are live text.
