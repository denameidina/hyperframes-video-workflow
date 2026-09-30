# Mix-media (Style Reference)

Dena keeps talking, cut out of her own footage, on a paper collage: torn paper,
real screenshots, doodles, stickers, tape, cut-out objects, animated around her.
Loaded by `docs/agents/02-screen-plan.md` (visual step, after
`styles/README.md`) and `docs/agents/03-build.md` (author step). Cut-out:
`npm run video -- cutout` (matte of `processed.mp4`). Engine: `vendor/style-kit/`
on top of `vendor/motion-kit/`; paper and objects: `vendor/paper-pack/`. Worked
examples: `docs/agents/references/style-examples/mix-media/` (`mm-01` … `mm-10`, with a
placeholder silhouette instead of a real person; `npm run check:style-examples -- mix-media`).

## When To Use

Use `mix-media` when **Dena should stay on screen while the world around her
changes**:

- she names several tools, pages, or sources and they gather around her;
- a "gue" / "dulu vs sekarang" moment where her presence is the point;
- the hook or a chapter change that needs energy without hiding her face;
- a proof screenshot that should sit next to her instead of replacing her.

Do not use it for:

- a detailed document or UI that needs the full frame (use `vox`, a capture, or
  `motion-broll` cutaway);
- more than ~20% of the video (it is a peak, not a background);
- shots where the matte fails (fast hands across the face, busy backgrounds with
  the same colours as clothes) — check the cut-out first.

Dena's likeness only ever comes from her footage (`video cutout`); never generate
it. Screenshots are real captures with a source line when they carry information.

## Treatment: collage

A mix-media clip is three layers in the host, all with the same in and out times:

| Layer | Element | Track | z | Notes |
| --- | --- | --- | --- | --- |
| Collage (back) | style-kit mount `.broll` | 4 | 22 | an **opaque full-frame** paper backdrop — it covers the base video |
| Speaker | `<video class="clip cutout sk-sticker-cut" src="assets/cutouts/NN-dena.webm" muted playsinline>` | 6 | 24 | the matted segment of `processed.mp4`, same host start |
| Front (optional) | style-kit mount `.broll-front` | 7 | 26 | arrows, doodles, frames, strips that overlap the speaker |

Rules:

- Make the cut-out for exactly the clip window:
  `npm run video -- cutout <slug> --from <clip start> --dur <clip duration> --name NN-dena`.
  The audio keeps playing from `#base-audio`; the cut-out is muted.
- Never tween `#base-video` opacity to hide it — the linter treats it as a
  full-frame overlay (`gsap_fullscreen_overlay_starts_visible`). The opaque collage
  already covers it.
- Host CSS: `.cutout { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 24; object-fit: cover; }`
  and `.broll-front { position: absolute; inset: 0; z-index: 26; }`.
- Dena stays visible, so `collage` never trips Gate 2 R3 or R4.

## Look

| Palette | bg | ink | accent | accent-2 | muted | add | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.sk-pal-mm-default` | `#f5f3f4` | `#2b2118` | `#b5452b` | `#2f6f8f` | `#8a7355` | `.sk-grid` | legacy |
| `.sk-pal-mm-notebook` | `#f5f3f4` | `#1f2937` | `#dc2626` | `#2563eb` | `#9ca3af` | `.sk-lined` | legacy |
| `.sk-pal-mm-kraft-desk` | `#bb8f4d` | `#2b2118` | `#b5452b` | `#2f6f8f` | `#8a7355` | `.sk-kraft` | legacy |
| `.sk-pal-mm-night-zine` | `#392b20` | `#f5efe6` | `#f59e0b` | `#7dd3fc` | `#a8a29e` | `.sk-kraft-night` | legacy |
| `.sk-pal-mm-zine-pink` | `#f5f3f4` | `#111111` | `#ff3d8b` | `#1f6feb` | `#9e9e9e` | `.sk-paper-white`, overlay `.sk-tex-riso` | new |
| `.sk-pal-mm-scrapbook` | `#bb8f4d` | `#2b2118` | `#e76f51` | `#2a9d8f` | `#8a7355` | `.sk-kraft` | new |
| `.sk-pal-mm-xerox` | `#c4b9b4` | `#111111` | `#ff2a2a` | `#5f5f5f` | `#8a8a8a` | `.sk-paper-grey`, overlay `.sk-tex-halftone` | new |
| `.sk-pal-mm-pop-collage` | `#ffd23f` | `#1a1a1a` | `#ee4266` | `#3bceac` | `#8a7355` | overlay `.sk-tex-halftone` | new |

| Type preset | display | body | hand | serif | mono |
| --- | --- | --- | --- | --- | --- |
| `.sk-type-mm-zine` | Permanent Marker | Geist | — | — | — |
| `.sk-type-mm-editorial` | — | Space Grotesk | — | Instrument Serif | — |
| `.sk-type-mm-typewriter` | — | Special Elite | — | — | — |

- `night-zine` sits on `.sk-kraft-night` (the kraft-dark grain multiplied down to #392b20); plain `.sk-kraft-dark` averages #a68768, too light for light ink.

- Put the palette class on the stage (`<div class="sk-stage sk-stop sk-pal-mm-pop-collage">`),
  plus the `add` class when listed; an overlay is its own full-frame div. Write the class in the
  brief's `Palette:`; hex values are still allowed when a video needs its own colours (say why).
- Type presets set `--sk-font-*`; `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`
  follow them. Font classes for one-offs: `.sk-f-<font>` (see `font.webp`).
- One palette preset per style per video, unless a palette change marks a new story section.

- Stage theme `.sk-stop` plus a backdrop class and a palette preset from the table above.
- The speaker always gets `.sk-sticker-cut`: a ~10 px off-white (#F6F2E9) ring and
  a hard shadow — it makes the matte look intentional and hides rough edges.
- Clutter lives in the corners and the top third; keep the **face zone** clear —
  roughly 1.2× the head box, and never over the eyes or mouth.
- No texture, grain, halftone, or colour effect on the speaker; only on the
  collage.
- One light direction for every shadow (`.sk-cut`, `.sk-sticker-cut`).

## Kit

Library assets for this style — look at the sheets before choosing, then list the ids in the
brief's `Library assets:` (`vendor/asset-lib/CATALOG.md` has every id, tag, and source). Make a
new asset only when nothing here fits the line, and say why in the brief (RD-03-55).

| Need | Catalog ids | Sheet |
| --- | --- | --- |
| Frames | `frame.polaroid`, `frame.polaroid-tilt`, `frame.film-strip-3`, `frame.browser-generic`, `frame.phone-generic`, `frame.torn-top` | `../asset-catalog/sheets/frame-1.webp` |
| Stickers | `paper.star-sticker`, `paper.arrow-sticker`, `paper.check-sticker`, `doodle.arrow-loop`, `doodle.circle-double` | `../asset-catalog/sheets/paper-1.webp`, `../asset-catalog/sheets/paper-2.webp`, `../asset-catalog/sheets/doodle-1.webp` |
| Overlays | `texture.riso`, `texture.halftone` | `../asset-catalog/sheets/texture-1.webp` |
| Type | `font.permanent-marker`, `font.instrument-serif`, `font.special-elite` | `../asset-catalog/sheets/font.webp` |
| Moodboard: six technique studies of the references (look first, then pick a direction) | `mm-s1` … `mm-s6` in `../moodboard/moodboard.json` | `../moodboard/sheets/mix-media.webp` |

### Atelier layered artwork

Fourteen additional original SVG assets for this family: sheet [artwork-mix-media](../asset-catalog/sheets/artwork-mix-media.webp). Catalog ids `art.atelier-mm-<name>`; examples: taped-frame / ripped-stack / film-perforations. `SK.asset(id).file` returns the local SVG path. Place pieces around the actual speaker matte, reserve the face zone, and step collage motion while footage stays smooth. See the [collection and usage contract](../../../../internal/docs/design-system/rich-style-assets.md); motion studies are in `videos/style-atelier/` (local production).

## Timing

- The collage moves on the step grid (`SK.onTwos`, `SK.piece`); the speaker stays
  at the full 30 fps — that contrast is what makes it read as a deliberate
  collage and keeps lip-sync credible (Spider-Punk).
- Pieces land on their words: a card per spoken name, a doodle 0–0.1 s before the
  stressed syllable, an arrow on the pronoun.
- Hold: after the pieces land, let them rest (small drift at most) until the clip
  ends; don't keep everything moving.
- 3–7 s per clip; at most two collage clips back to back.

## Matte Notes

- `video cutout` segments are ≤ 15 s; matting runs at roughly 4 frames per second
  on Apple silicon (CoreML), so a 5 s clip takes about a minute.
- Hair, fast hands, and motion blur fray the edge: the sticker ring swallows
  small frizz; a frame layer (polaroid, torn window) hides the rest.
- Furniture behind the shoulders can come along (a chair back): cover it with the
  front layer, or cut the segment where it is out of view.
- The body is cut off at the bottom of the frame; hide the cut behind a front
  frame's bottom band or a paper strip — never let the torso float mid-backdrop.
- Place doodles and arrows from the still check of the real cut-out: the head
  position varies per video (the placeholder is only a guide).
- After a cut-out, run the Still Check at the clip's key-word times and look at
  the mouth, hands, and edges.

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **collage-backdrop** | A paper or photo collage replaces the room behind Dena | Opening or a "world" change | On the cut; held for the beat | soft paper slap | So busy the face loses contrast | back mount with a paper class + `SK.piece` scraps |
| **sticker-outline** | Off-white ring + hard shadow around Dena | Every collage clip | From frame 0 | none | A pure-white ring next to cream paper | `.sk-sticker-cut` on the host `<video>` |
| **doodle-halo** | Stars, rays, question marks drawn around the head | An idea, confusion, excitement | Drawn on twos, just before the stressed syllable | marker squeak | Looping doodles with no meaning | `SK.line`/`SK.ellipse` + `SK.drawSeq(..., { boil })` |
| **torn-window** | A paper sheet tears open around Dena | A reveal, "lihat ini" | The tear opens on the noun | short paper rip | The tear crosses the chin or mouth | front mount: evenodd SVG path, hole scaled on twos |
| **screenshot-orbit** | 2–4 real screenshots drift around the top of the frame | Listing tools, products, sources | One card per spoken name | soft tick per card | Fake or blurry UI; too many cards | back mount, `SK.piece` drop + small stepped drift, `.sk-source` |
| **arrow-to-speaker** | A hand-drawn arrow from a label to Dena | "Gue", credentials | On the pronoun | pen swipe | Arrow crosses the eyes | front mount, `SK.arrow` + `.sk-sticky` label |
| **polaroid-frame** | Dena inside a taped polaroid | Memory, "dulu", a proof photo | On the time word | camera shutter | A polaroid on every beat | front mount: evenodd frame + `.sk-tape-a/b` + `.sk-hand` caption |
| **halftone-duotone** | Two-colour halftone backdrop, Dena in true colour | Serious claims, stats | Switches on a beat | low paper thump | Halftone on the skin | back mount only; never filter the `<video>` |
| **cut-in-object** | A real object cut-out lands beside Dena's hand | Naming a concrete thing | Lands on the noun, one-step overshoot | soft thud | A generic object that isn't the named one | `assets/cutouts/*.png` (Style Assets) + `SK.piece` |
| **paper-strip-caption** | A key phrase on a torn paper strip, taped | Hook line, key phrase | Strip per word group | tape pull | Replacing the running captions | front mount, `SK.torn` + `.sk-display`, above y 1400 |
| **scrapbook-stack** | Proof cards pile up behind Dena | Evidence, momentum | One card per claim, 0.4–0.8 s apart | paper shuffle | The stack buries the face | back mount, `SK.piece` drops in the top third |
| **zoom-punch-cutout** | The speaker layer scales 110–120% on a peak word, stepped | Punchline | On the stressed syllable, back out over 0.3 s | short thud | Every sentence | host `tl.to('#cut-NN', { scale })` with `steps`, backdrop still |
| **split-self** | Two cut-outs of Dena (then vs now) | "Gue dulu vs sekarang" | Second self pops in on the contrast word | two paper slaps | Mismatched outlines or lighting | two `video cutout` segments, two host `<video>`s, both `.sk-sticker-cut` |
| **scribble-emphasis** | A circle or underline over a number in a screenshot beside Dena | Pointing at a figure | The scribble finishes as the number is spoken | marker scratch | Scribbling over nothing | `SK.ellipse` on the card inside the back mount |
| **grid-backdrop** | Notebook or grid paper, faint drift | Calm explanation beats | Held | none | A grid that fights the captions | `.sk-grid` / `.sk-lined` backdrop |
| **frame-in-frame** | Dena shows inside a paper phone or laptop screen | "di HP gue…", digital context | The frame lands on the device word | paper tap | A frame over the face | front mount: a cover with a screen-shaped `clip-path: path(evenodd, …)` hole + a CSS bezel |
| **ransom-caption** | A phrase of mismatched cut-out letters, pasted | A cheeky punchline | Letters paste one by one, done on the last word | paper slap | More than 3 words; unreadable | one chip per letter with a seeded font, colour, and tilt (`SK.rng`), popped on twos |
| **sticker-bomb** | Library stickers pop around Dena on the beats | High energy, celebration | One sticker per beat or word, at most 6 | sticker pop | Stickers on the face; stickers for the whole clip | `.sk-obj-*-sticker` divs on the front mount, 2-step pop with overshoot |
| **torn-panel-list** | Dena on one side; a list on torn paper on the other | A list while the face stays on screen | One item per word | paper swipe | More than 4 items; a panel over the face | manifest `cutouts: [{ x, s }]` moves Dena aside; a torn panel on the back mount |
| **speech-cutout** | A paper speech bubble from Dena with a quote | Quoting someone | The bubble on "bilang"; the words with the quote | paper pop | A quote over 8 words; a tail that misses Dena | a torn paper oval with a tail (`clip-path: polygon`) on the front mount + `SK.write` |

## References

### R1 — Hannah Höch, *Cut with the Kitchen Knife Dada through the Last Weimar Beer-Belly Cultural Epoch in Germany* (1919)
- Source: https://en.wikipedia.org/wiki/Hannah_H%C3%B6ch
- Steal: press photos and text fragments cut and combined on purpose; dense but
  organised around focal clusters; text as image.
- 9:16: keep Dena in a calm centre band; 3–5 real fragments only in the top and
  bottom thirds.
- Study: moodboard `mm-s1` — a self-made study of the technique, on `../moodboard/sheets/mix-media.webp`

### R2 — Richard Hamilton, *Just what is it that makes today's homes so different, so appealing?* (1956)
- Source: https://en.wikipedia.org/wiki/Just_what_is_it_that_makes_today's_homes_so_different,_so_appealing
- Steal: a room built from magazine cut-outs; objects named by showing them;
  deliberately mismatched scale.
- 9:16: build a "room" around Dena from real product screenshots and cut-outs of
  the things she names.
- Study: moodboard `mm-s2` — a self-made study of the technique, on `../moodboard/sheets/mix-media.webp`

### R3 — Zines and DIY print
- Source: https://en.wikipedia.org/wiki/Zine
- Steal: photocopy degradation, cut-and-paste layout, typed text and collage
  together.
- 9:16: a xeroxed/threshold backdrop — never on the face — reads as a founder's
  notebook page.
- Study: moodboard `mm-s3` — a self-made study of the technique, on `../moodboard/sheets/mix-media.webp`

### R4 — *Spider-Man: Into the Spider-Verse* (2018)
- Source: https://en.wikipedia.org/wiki/Spider-Man:_Into_the_Spider-Verse
- Steal: halftone and Ben-Day dots for tone; print misregistration; animation on
  twos with on-screen text.
- 9:16: halftone only on the backdrop; collage on twos while Dena plays at full
  frame rate.

### R5 — Spider-Punk in *Spider-Man: Across the Spider-Verse* (2023)
- Source: https://www.slashfilm.com/1305454/spider-man-across-the-spider-verse-spider-punk-three-years-animate/
- Steal: built from hand-cut, xeroxed punk zines; different parts at different
  frame rates, so it feels like a flyer come to life.
- 9:16: stickers and scraps boil on twos, the footage stays smooth — the contrast is
  the look.
- Study: moodboard `mm-s4` — a self-made study of the technique, on `../moodboard/sheets/mix-media.webp`

### R6 — *The Mitchells vs. the Machines* (2021), "Katie Vision"
- Source: https://collider.com/mitchells-vs-the-machines-animation-explained-video/
- Steal: 2D doodles splattered over the image, motivated by the character's head;
  amateurish on purpose.
- 9:16: doodles come from Dena's own thought — drawn on the key word near her head
  or hands (`doodle-halo`).
- Study: moodboard `mm-s5` — a self-made study of the technique, on `../moodboard/sheets/mix-media.webp`

### R7 — "How Vox uses animation…" (Storybench, 2024)
- Source: https://www.storybench.org/how-vox-uses-animation-to-make-complicated-topics-digestible-for-everyone/
- Steal: construction-paper objects that turn into data; a recurring motif per
  concept; balance illustration and photography.
- 9:16: one physical object per beat that becomes information beside Dena.

### R8 — "Vox / Johnny Harris documentary style" in Final Cut Pro (FCPX Full Access)
- Source: https://fcpxfullaccess.com/blogs/blog/vox-johnny-harris-documentary-style-final-cut-pro
- Steal: cut-out photos with a white stroke and drop shadow, pinned-to-a-wall look,
  small rotation, 12 fps steps, paper-rustle and soft-thud SFX.
- 9:16: the core recipe for the cut-out Dena — stroke, shadow, landing thud.

### R9 — Spotify Wrapped 2022 identity (It's Nice That)
- Source: https://www.itsnicethat.com/features/spotify-wrapped-campaign-identity-2022-graphic-design-301122
- Steal: overlapping shape layers on a grid; each layer gets one motion behaviour.
- 9:16: a grid underneath keeps the collage systematic; one motion verb per layer
  (drop, drift, draw).
- Study: moodboard `mm-s6` — a self-made study of the technique, on `../moodboard/sheets/mix-media.webp`

### R10 — The Instagram "digital scrapbook" trend (Bustle)
- Source: https://www.bustle.com/life/digital-scrapbook-instagram-style-photos-trend-apps
- Steal: stickers, handwriting, layered photos, looking "ripped from a scrapbook".
- 9:16: handwritten margin notes in Indonesian and layered polaroids of real proof.

### R11 — CapCut: background removal for sticker design
- Source: https://www.capcut.com/ideas/remove-image-background/remove-image-background-for-sticker-design-assets
- Steal: the sticker stroke — an expanded copy of the cut-out filled white under
  it; check hair edges; a subtle shadow on busy backgrounds.
- 9:16: `.sk-sticker-cut` does this per frame on the matted video.

### R12 — Ken Burns effect
- Source: https://en.wikipedia.org/wiki/Ken_Burns_effect
- Steal: slow pan and zoom that settles on the named subject; parallax planes
  make a flat image read as depth.
- 9:16: three planes — backdrop, Dena, front scraps — and a slow push into a
  screenshot that lands on the spoken line.

## Build Recipe

Host (in `videos/<slug>/index.html`, after running `video cutout`):

```html
<div id="broll-07-collage-mount" class="broll" data-composition-id="broll-07-collage" data-composition-src="compositions/broll/07-collage.html"
     data-start="31.2" data-duration="5" data-track-index="4" data-width="1080" data-height="1920"></div>
<video id="cut-07" class="clip cutout sk-sticker-cut" src="assets/cutouts/07-dena.webm" muted playsinline
       data-start="31.2" data-duration="5" data-track-index="6"></video>
<div id="broll-07-collage-front-mount" class="broll-front" data-composition-id="broll-07-collage-front" data-composition-src="compositions/broll/07-collage-front.html"
     data-start="31.2" data-duration="5" data-track-index="7" data-width="1080" data-height="1920"></div>
```

made with `npm run video -- cutout <slug> --from 31.2 --dur 5 --name 07-dena`.

Collage clip (back): an opaque paper stage, pieces in the corners and top third:

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    .p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
    #strip { width: 520px; height: 130px; }
  </style>
  <div id="root" data-composition-id="broll-07-collage" data-width="1080" data-height="1920" data-duration="5">
    <div class="sk-stage sk-stop sk-grid">
      <div class="p sk-cut" id="stripW"><div class="p sk-kraft" id="strip"></div></div>
      <div class="sk-grain" id="grain"></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-07-collage';
      const $ = SK.finder(ID);
      $('strip').style.clipPath = SK.torn(520, 130, 71, { edges: 'lr', amp: 14 });
      const k = SK.onTwos(M.track(1, [[0.1, 0, [18, 0.75]]]));
      SK.clip(ID, { T: 5, update: (t) => {
        SK.piece($('stripW'), { x: -60 - 400 * k(t), y: 230, r: -8 }, 1, t);
        SK.grain($('grain'), t, 4);
      } });
    })();
  </script>
</template>
```

- The front clip uses `bg: null` (transparent) and only draws what overlaps the
  speaker (see `mm-02`, `mm-03`, `mm-04`).
- Frames and windows are one SVG `path` with `fill-rule="evenodd"` (outer rect +
  inner hole); fill it with a paper `<pattern>` whose `<image href="vendor/paper-pack/…">`.
- The placeholder in the examples is `style-examples/assets/placeholder-cutout.webm`,
  rendered from `docs/agents/references/mix-media-placeholder/` (commands in its
  `README.md`).
- Host speaker layers come from the example manifest: `cutout: true` is one
  full-frame speaker; `cutouts: [{ x, y, s, at }]` places one or two (offset px,
  scale about the feet, pop-in second), the second on track 5 (`mm-08`, `mm-10`);
  `punch: [[at, scale]]` steps the speaker in and out on the word (`mm-05`). In a
  video the same host code is written into `videos/<slug>/index.html`.
- The halftone backdrop recolours on the beat by setting `--sk-bg` and the dot
  colour on the stage; never filter the speaker `<video>` (`mm-05`).

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| collage-backdrop, scrapbook-stack | paper slap / shuffle | 0.1–0.14 |
| doodle-halo, arrow-to-speaker, scribble-emphasis | marker squeak / pen swipe | 0.08–0.12 |
| torn-window, paper-strip-caption | paper rip / tape pull | 0.12–0.16 |
| cut-in-object, zoom-punch-cutout | soft thud | 0.12–0.16 |
| polaroid-frame | camera shutter | 0.1–0.14 |
| sticker-bomb, ransom-caption, speech-cutout | sticker pop / paper slap / paper pop | 0.08–0.12 |
| frame-in-frame, torn-panel-list, split-self | paper tap / paper swipe / two paper slaps | 0.08–0.12 |

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/mix-media/compositions/mm-01-collage-doodle.html` | collage-backdrop + sticker-outline + doodle-halo | collage |
| `style-examples/mix-media/compositions/mm-02-orbit-arrow.html` | screenshot-orbit (+ front: arrow-to-speaker) | collage |
| `style-examples/mix-media/compositions/mm-03-torn-window.html` | torn-window (front) + cut-in-object | collage |
| `style-examples/mix-media/compositions/mm-04-polaroid-caption.html` | polaroid-frame + paper-strip-caption (front) | collage |
| `style-examples/mix-media/compositions/mm-05-halftone-punch.html` | halftone-duotone + zoom-punch-cutout (manifest `punch`) | collage |
| `style-examples/mix-media/compositions/mm-06-frame-grid.html` | frame-in-frame (front) + grid-backdrop | collage |
| `style-examples/mix-media/compositions/mm-07-scrapbook-scribble.html` | scrapbook-stack + scribble-emphasis | collage |
| `style-examples/mix-media/compositions/mm-08-split-self.html` | split-self (manifest `cutouts`, the second pops in) | collage |
| `style-examples/mix-media/compositions/mm-09-sticker-ransom.html` | sticker-bomb + ransom-caption (front) | collage |
| `style-examples/mix-media/compositions/mm-10-panel-speech.html` | torn-panel-list + speech-cutout (front) | collage |

## Anti-slop Checklist

- [ ] Every collage piece ties to a spoken word; no generic vintage paper, coffee stains, or random compasses.
- [ ] Screenshots are real and readable, with a source line when they carry information.
- [ ] The sticker ring is steady around hair and hands; frayed edges are hidden by a frame layer.
- [ ] Pieces land and then rest; the collage does not move nonstop.
- [ ] No texture, grain, or colour effect on Dena; the face zone is clear of doodles and cards.
- [ ] One light direction; the outline is off-white, matching the paper, not pure white.
- [ ] Captions stay readable: nothing busy behind the caption band, strips sit above y 1400.
- [ ] The cut-out came from `video cutout` for this exact window; lips match the audio in the still check.
- [ ] Dena's likeness is never generated; generated objects show no real person or brand.
