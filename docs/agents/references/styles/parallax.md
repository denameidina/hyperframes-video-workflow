# Parallax (Style Reference)

2.5D parallax: a still image or collage split into 2–5 depth layers — a cut-out
subject, a midground, a background plate — and a virtual camera that dollies,
pans, orbits a little, or dolly-zooms through them, with depth-of-field blur.
Also the `parallax-stage` treatment: the layered scene moves behind Dena's
matted cut-out while she keeps talking. Loaded by `docs/agents/02-screen-plan.md`
(visual step, after `styles/README.md`) and `docs/agents/03-build.md` (author
step). Engine: `vendor/style-kit/` (`SK.layer`, `SK.camera`, `SK.dof`,
`SK.dollyZoom`) on top of `vendor/motion-kit/`. Sources: `npm run video -- layers`
(photo/frame + matted subject), Codex (plates and layered scenes), the paper
pack. Worked examples: `docs/agents/references/style-examples/parallax/` (`px-01` …
`px-11`, `npm run check:style-examples -- parallax`).

## When To Use

Use `parallax` when a line should **put the viewer inside a scene or a memory**:

- a story beat anchored to a photo ("dulu waktu 2018…"), a place, or a moment;
- a realization or turn ("ternyata…") — a dolly-zoom, once;
- a mood or context line where a flat image would feel static;
- context behind Dena while she talks (`parallax-stage`).

Do not use it for:

- proof (a reconstructed plate is never evidence — use a capture or `vox`);
- a number, a list, or a UI action (use `motion-graphic`, `broll-text`,
  `motion-broll`);
- more than one or two clips per video — the depth move loses its effect.

## Layer Sources

| Source | How | Layers | Provenance |
| --- | --- | --- | --- |
| Photo or frame | `npm run video -- layers <slug> --at <s> --name NN-scene` (a frame of `processed.mp4`) or `--image <file>` (the user's photo) → `assets/layers/NN-scene-src.png` + `NN-scene-fg.png` (the matted person); then the plate with `codex-image` (below) | plate (back), subject (front), optional haze/dust | `dena-footage` or `user` for `src`/`fg`; **`reconstructed`** for the plate |
| Codex layered scene | a full reference scene first; the plate by an edit of it (`--ref`, opaque); foreground objects by an edit onto flat green (`#00FF00`, then keyed) or as separate transparent cut-outs without a reference | 3–4 | `generated` |
| Multiplane collage | paper pack, cut-outs, captures, the map, placed at several depths | 2–5 | as each asset's own |
| Archival photo | a public-domain photo only, its status checked on the asset page (for example Wikimedia Commons "published before 1931", or Library of Congress with no known restrictions); subject via `layers --image`, plate via Codex | plate + subject | `pd-archive` (+ `reconstructed` plate) |

Plate recipe (`codex-image`, `--ref <src>`, `--size` matching the source aspect
rounded to a multiple of 16, plus `--fit`): "remove only the <person / objects>;
fill where they were with the continuing <wall / floor / desk>; this is a
pixel-aligned plate — keep the exact framing, crop, and aspect ratio; every other
pixel stays where it is". Check the plate over the source: anything that moved
means the layers will not line up — regenerate or crop.

Rules:

- A reconstructed plate is never proof and never shown as "what was there".
- Dena's likeness only from her footage; generated layers show no real person or
  brand and contain no text.
- Archival photos: public domain only; record the source page and the reason
  (date, rights statement) in the asset manifest and on screen when it helps.

## Depth Budget

- 3–4 layers is the sweet spot; more than 5 reads like a pop-up book.
- Depth spacing: about −300…−500 (subject/mid) and −1200…−2000 (back) with
  `SK.P` = 1200; the subject near 0.
- Camera travel: background drift within 3–6% of the frame width (30–60 px),
  scale change within 8–12% over 3–5 s; an orbit ≤ 6°.
- Build plates 15–20% larger than the frame (`SK.layer(el, z, { fill: 1.18 })`)
  so an edge never shows.
- Depth of field: 2–6 px on the midground, 6–12 px on the background; the subject
  stays sharp; move the focus at most once per shot.
- Text on a parallax layer is never blurred; keep captions over calm layers.

## Look

| Grade (on the stage) | filter | haze | grain | status |
| --- | --- | --- | --- | --- |
| `.sk-grade-px-default` | `none` | none | 0 | legacy |
| `.sk-grade-px-archive` | `grayscale(.6) contrast(1.05)` | #d9d4c7 12% | 0.18 | legacy |
| `.sk-grade-px-night-desk` | `brightness(.9)` | #0f1e3d 15% | 0.12 | legacy |
| `.sk-grade-px-paper-stage` | `none` | #f5f3f4 20% | 0.1 | legacy |
| `.sk-grade-px-golden-hour` | `sepia(.15) saturate(1.1) brightness(1.03)` | #ffb86b 12% | 0.12 | new |
| `.sk-grade-px-blue-hour` | `saturate(.9) hue-rotate(-8deg) brightness(.92)` | #1e3a8a 18% | 0.12 | new |
| `.sk-grade-px-faded-film` | `contrast(.9) saturate(.8) brightness(1.05)` | #f5e6d0 10% | 0.2 | new |
| `.sk-grade-px-mono-archive` | `grayscale(1) contrast(1.1)` | #d9d4c7 12% | 0.22 | new |

| Type preset | display | body | hand | serif | mono |
| --- | --- | --- | --- | --- | --- |
| `.sk-type-px-memory` | — | Geist | — | Instrument Serif | — |
| `.sk-type-px-label` | — | Geist | — | — | — |

- Put the grade class on the stage (`<div class="sk-stage sk-grade-px-golden-hour">`): it sets the
  `.sk-view` filter, the `.sk-haze` layer (add `<div class="sk-haze"></div>` above the world), and
  the `.sk-grain` opacity. Write the class in the brief's `Palette:`.
- Type presets set `--sk-font-*`; `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`
  follow them. Font classes for one-offs: `.sk-f-<font>` (see `font.webp`).
- One palette preset per style per video, unless a palette change marks a new story section.

- The same grain on every layer so they read as one image.
- A contact shadow under a cut-out subject (a soft ellipse on the plate) sells
  the depth.
- Give the subject a 1–2% scale "breath" over the shot so it isn't a frozen card.

## Kit

Library assets for this style — look at the sheets before choosing, then list the ids in the
brief's `Library assets:` (`vendor/asset-lib/CATALOG.md` has every id, tag, and source). Make a
new asset only when nothing here fits the line, and say why in the brief (RD-03-55).

| Need | Catalog ids | Sheet |
| --- | --- | --- |
| Scenes | `scene.warung-counter`, `scene.cafe-cowork`, `scene.city-dusk`, `scene.server-room`, `scene.street-motor` | `../asset-catalog/sheets/scene.webp` |
| Grain and haze | `texture.film`, `palette.px-golden-hour`, `palette.px-blue-hour`, `palette.px-faded-film` | `../asset-catalog/sheets/texture-1.webp`, `../asset-catalog/sheets/preset-parallax.webp` |
| Memory frame | `frame.polaroid`, `frame.polaroid-tilt` | `../asset-catalog/sheets/frame-1.webp` |
| Collage layers | `paper.lightbulb`, `paper.parcel-box`, `texture.linen` | `../asset-catalog/sheets/paper-2.webp`, `../asset-catalog/sheets/texture-2.webp` |
| Type | `font.instrument-serif` | `../asset-catalog/sheets/font.webp` |
| Moodboard: six technique studies of the references (look first, then pick a direction) | `px-s1` … `px-s6` in `../moodboard/moodboard.json` | `../moodboard/sheets/parallax.webp` |

## Timing

- One camera move per clip, eased in and out (springs such as `[3, 1]` or
  `M.SLOW`), landing on the stressed word; then settle.
- Dolly-zoom 1–1.5 s, peaking on the realization word — once per video.
- Rack focus: the focus arrives on the second noun.
- `stepped-multiplane`: wrap the camera curve in `SK.onTwos` for a Norstein /
  stop-motion feel; otherwise move smoothly.
- `parallax-stage`: the background moves slower than any talking-head motion;
  Dena's cut-out stays still (or breathes 1–2%).

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **dolly-in** | Camera pushes toward the subject; back layers barely move | Building intensity, "ini intinya" | Starts ~0.5 s early, lands on the word | low swell | A push on every shot | `SK.camera(world, { z })` with `M.track` |
| **pan-reveal** | A sideways move uncovers something behind the foreground | "Ternyata…" twists | The reveal edge crosses it on the word | soft whoosh | Revealing a smeared fill | `SK.camera(world, { x })`, plate with `fill` |
| **orbit-drift** | Foreground and background counter-move — a small fake rotation | Showing an object or a desk | Across the phrase | room-tone shift | > 6°, edges tear | `SK.camera(world, { ry })` |
| **dolly-zoom** | Subject keeps its size, background stretches ("vertigo") | Realization, shock | 1–1.5 s, peak on the word | reverse cymbal / low drone | Twice in one video | `SK.dollyZoom(u, { z0, d1 })` → `view.style.perspective`, camera `z` |
| **rack-focus** | Blur moves from one plane to another | Shifting attention between two things | Focus arrives on the second noun | soft focus tick | Blur so strong it looks broken | `SK.dof(items, focusZ)` with `focusZ` from `M.track` |
| **push-through** | The camera passes through a foreground layer | Chapter transition | Crosses the plane on the phrase break | passing whoosh | Cutting through a hard-edged card | dolly past the front layer's z, fade it out as it nears |
| **layer-peel** | Layers slide away one by one to the base | Breaking a problem down, "lapisan" | One layer per counted item | paper slide / tick | Too many layers — a slideshow | per-layer `x` via `M.track`, staggered |
| **foreground-wipe** | A blurred near object sweeps across the frame | Hiding a cut or scene change | Wipe peaks at the cut | whoosh | Covering the captions | a near layer with large `x` travel + blur |
| **multiplane-fog** | A haze layer drifts between planes | Mood, memory, "bayangin" | Fades in on the emotional word | airy pad | Fog so thick the subject vanishes | a translucent layer between mid and back |
| **map-flyover** | The camera travels over a tilted map plate | Places, "dari Jakarta ke…" | Arrives on the place name | light wind | A low-res map stretched | `map-indonesia.svg` as a layer + `rx` tilt + `SK.geo` pins |
| **photo-2.5d** | An archival or personal photo with the subject cut out, slow push | Stories, "dulu waktu 2018" | Settles on the year or name | faint projector hum | Fresh screenshots animated as fake "archive" | `video layers` + plate + dolly-in |
| **stage-behind-speaker** | Dena stays still while a layered scene moves slowly behind her | Context behind what she says | Under the whole sentence, a little faster on the emphasis word | soft bed or none | Background faster than the speaker | treatment `parallax-stage` (host recipe below) |
| **stepped-multiplane** | Layers move in held steps | Punchy lists, a handmade tone | A step on each stressed syllable | tick per step | Uneven steps that read as lag | camera curves wrapped in `SK.onTwos` |
| **tilt-reveal** | The camera tilts up from the foreground to the sky or a headline | Scale, ambition, "gede banget" | The top is reached on the big word | rising whoosh | Tilting past the plate's top | `SK.camera(world, { y, rx })` |
| **depth-headline** | Headline words sit on a plane between the scene's layers (behind the foreground) | Opening a topic with atmosphere | The words read once the camera clears the foreground | low swell | A headline in front of every layer (no depth) | a text plane via `SK.layer` between mid and front; size it for its scale at the end of the move |
| **card-flythrough** | Cards at different depths; each flies out of the depth and past the lens | A list of steps with depth | One card past the lens per step | whoosh per card | More than 4 cards; unreadable while passing | cards in the world with a `translate3d` z that grows over time; the scene sits behind the nearest card |
| **float-objects** | Library cut-outs float at different depths, bobbing slowly | Money, ideas, tools "scattered" | Each object appears on its word | soft chime | Objects nobody named; fast motion | `.sk-obj-*` with `translate3d(x, y, z)` + a slow sine bob; fade with opacity (never `SK.enter`, it replaces the transform) |
| **light-sweep** | A band of light sweeps the planes at different speeds | A change of mood, "pagi hari…" | 1–2 s sweep starting on the time word | light swell | A glare over the subject | a `mix-blend-mode: screen` gradient per plane, offset by depth |
| **dust-motes** | Seeded dust specks in the near plane | Archive or nostalgia mood | Constant, slow | room tone | Large, fast specks (reads as snow) | dots from `SK.rng` in a near `.sk-ly`, drifting and twinkling |
| **handheld-drift** | The camera drifts like a hand-held shot | Making a still scene feel alive | Constant, ≤ 6–8 px | — | Big shake (reads as an earthquake) | `SK.handheld(t, seed, { amp })` into `SK.camera({ x, y, rx })` |

## References

### R1 — Lotte Reiniger, *The Adventures of Prince Achmed* (1926)
- Source: https://theconversation.com/before-walt-disney-there-was-lotte-reiniger-the-story-of-the-worlds-first-animated-feature-125091 and
  https://en.wikipedia.org/wiki/Multiplane_camera
- Steal: silhouettes on stacked, backlit glass planes; soft tinted backgrounds
  behind hard black cut-outs.
- 9:16: a dark, rim-lit cut-out over a soft gradient plate that drifts 2–3% over 4 s.
- Study: moodboard `px-s1` — a self-made study of the technique, on `../moodboard/sheets/parallax.webp`

### R2 — Ub Iwerks' multiplane camera (1933)
- Source: https://en.wikipedia.org/wiki/Multiplane_camera
- Steal: built partly from salvaged car parts; the core rule — distant layers move
  slower — sells depth even on a cheap rig.
- 9:16: a three-layer "poor man's multiplane" with speed ratios near 1.0 / 0.5 / 0.15.
- Study: moodboard `px-s2` — a self-made study of the technique, on `../moodboard/sheets/parallax.webp`

### R3 — Disney, *The Old Mill* (1937)
- Source: https://d23.com/a-to-z/old-mill-the-film/ and
  https://en.wikipedia.org/wiki/Multiplane_camera
- Steal: the first film shot on Disney's multiplane camera, up to seven painted
  glass layers; foreground and background moving in opposite directions read as
  rotation; weather between planes adds depth.
- 9:16: `orbit-drift` as a counter-move on one key noun, with a haze layer
  between mid and back.

### R4 — Yuri Norstein, *Hedgehog in the Fog* (1975) and *Tale of Tales* (1979)
- Source: https://en.wikipedia.org/wiki/Yuri_Norstein and
  https://animationobsessive.substack.com/p/a-guide-to-yuri-norstein-hedgehog
- Steal: glass planes 25–30 cm apart that move sideways and toward the lens; fog
  as tracing paper lifted toward the camera until the subject fades.
- 9:16: `multiplane-fog` — a translucent layer that slides between subject and
  camera to fade a detail on "hilang".
- Study: moodboard `px-s3` — a self-made study of the technique, on `../moodboard/sheets/parallax.webp`

### R5 — *The Kid Stays in the Picture* (2002)
- Source: https://en.wikipedia.org/wiki/The_Kid_Stays_in_the_Picture and
  https://waxy.org/2019/11/turning-photos-into-2-5d-parallax-animations-with-machine-learning/
- Steal: archival photos split into layers, the holes filled, the layers moved in
  Z; each move timed to the narrator's story.
- 9:16: `photo-2.5d` — one photo per beat, a slow push that lands on the name or
  year being said.
- Study: moodboard `px-s4` — a self-made study of the technique, on `../moodboard/sheets/parallax.webp`

### R6 — Ken Burns effect (*The Civil War*, 1990; roots in NFB's *City of Gold*, 1957)
- Source: https://en.wikipedia.org/wiki/Ken_Burns_effect
- Steal: slow pan and zoom across a still, moving from subject to subject — the
  flat baseline that parallax deepens.
- 9:16: the fallback when a photo can't be separated cleanly: 3–6% scale over 4 s
  toward the thing named.

### R7 — Video Copilot, "Virtual 3D Photos" (2007)
- Source: https://www.videocopilot.net/blog/2007/09/tutorial-virtual-3d-photos/
- Steal: clone-stamped plates, layers staggered in Z, an orbiting camera; choke the
  subject's edges and give the foreground small motion of its own.
- 9:16: feather the cut-out ~1 px and give it a 1–2% breath so it isn't a card.

### R8 — Iain Anderson, "Animating parallax images in After Effects and Apple Motion" (ProVideo Coalition)
- Source: https://www.provideocoalition.com/animating-parallax-images-in-after-effects-and-apple-motion/
- Steal: pick photos with three clear depth zones and no fly-away hair; ~500 px Z
  steps; extend the plate under the subject; keyframe focus distance.
- 9:16: a four-layer stack, plates filled well past the subject, focus changing on
  the key word.

### R9 — Joe Fellows (VICE) and PremiumBeat's parallax tutorial
- Source: https://www.vice.com/en/article/joe-fellows-teaches-us-how-to-master-25d-photography/ and
  https://www.premiumbeat.com/blog/add-depth-parallax-after-effects/
- Steal: choosing the right photo is half the work; at least two elements moving
  in different directions; a dust or texture layer in front; titles kept readable.
- 9:16: a grain/dust front layer and caption-safe zones away from fast layers.

### R10 — Niklaus et al., "3D Ken Burns Effect from a Single Image" (ACM TOG 2019)
- Source: https://arxiv.org/abs/1909.05483
- Steal: depth → point cloud → virtual camera → inpaint newly visible areas; known
  failures at object edges and wrong depth.
- 9:16: check the edges where layers meet at the end of the move, frame by frame.

### R11 — *Spider-Man: Into the Spider-Verse* (2018)
- Source: https://www.fxguide.com/fxfeatured/why-spider-verse-has-the-most-inventive-visuals-youll-see-this-year/
- Steal: defocus as offset colour plates instead of lens blur; motion on twos.
- 9:16: for a punchy tech tone, a 3–6 px RGB offset on back layers instead of blur,
  and `stepped-multiplane`.
- Study: moodboard `px-s5` — a self-made study of the technique, on `../moodboard/sheets/parallax.webp`

### R12 — *Vertigo* (1958) and the dolly zoom
- Source: https://en.wikipedia.org/wiki/Dolly_zoom
- Steal: the camera moves one way while the lens zooms the other — the subject
  holds its size and the background stretches; dizziness or sudden realization.
- 9:16: `SK.dollyZoom` once, 1–1.5 s, on the realization word.
- Study: moodboard `px-s6` — a self-made study of the technique, on `../moodboard/sheets/parallax.webp`

### R13 — Apple iOS 26 Spatial Scenes
- Source: https://www.macrumors.com/how-to/ios-3d-lock-screen-effect-spatial-scenes/
- Steal: the subject stays fairly still while the background shifts slightly —
  small moves read as depth to phone viewers.
- 9:16: micro-parallax: 20–40 px of background travel is often enough.

## Build Recipe

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    #desk { left: 0; top: 0; width: 1080px; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="5">
    <div class="sk-stage">
      <div class="sk-view" id="view"><div class="sk-world" id="world">
        <div class="sk-ly" id="back"><img class="sk-plate" src="assets/layers/NN-scene-bg.png" alt="" /></div>
        <div class="sk-ly" id="mid"><img class="sk-plate" src="assets/layers/NN-scene-fg.png" alt="" /></div>
      </div></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      const L = [{ el: $('back'), z: -1400 }, { el: $('mid'), z: -300 }];
      L.forEach(({ el, z }, i) => SK.layer(el, z, { fill: i === 0 ? 1.18 : 1 }));
      const dolly = M.track(0, [[0.3, 260, [3, 1]]]);      // dolly-in, landing ~2 s in
      SK.clip(ID, { T: 5, update: (t) => {
        SK.camera($('world'), { z: dolly(t) });
        SK.dof(L, -300, { k: 110, max: 10 });
      } });
    })();
  </script>
</template>
```

- Layers are full-frame (`.sk-ly`); position content inside them, never offset
  the layer itself — the framing compensation pivots on the frame centre.
- The stage must be opaque (a plate, a paper class, or a colour) so it covers the
  base video.
- `parallax-stage` host recipe: the parallax mount on track 4, Dena's cut-out
  `<video class="clip cutout sk-sticker-cut" muted>` on track 6 (from
  `npm run video -- cutout`), an optional front mount on track 7 — exactly the
  mix-media collage recipe (`mix-media.md`), with the collage replaced by a
  parallax clip. Never tween `#base-video` opacity.
- Dolly-zoom: `const { P, d } = SK.dollyZoom(u, { z0: -400, d1: 250 });` then
  `$('view').style.perspective = P + 'px'` and `SK.camera(world, { z: d })`.
- Push-through: put the planes behind far back (−1600 … −4000) so the camera can pass
  the front plane (≈ 1150 px of travel) without blowing the others up; fade and blur
  the front plane by its apparent scale (`px-05`).
- Map flyover: tilt a large sea plane (`rotateX` ≈ 58°) with its pivot on the
  screen, slide the map on it, and stand pins up with the opposite `rotateX`;
  `overflow: hidden` on the plane would flatten the pins, so make the plane bigger
  than the map's travel instead (`px-08`).
- A big vertical tilt separates a kit's front props from the ground they stand on;
  use the plate and mid planes only (`px-10`).
- Planes that carry words are never blurred: leave `SK.dof` out when every plane
  has text (`px-06`).

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| dolly-in, tilt-reveal | low swell / rising whoosh | 0.08–0.12 |
| dolly-zoom | reverse cymbal or low drone | 0.1–0.14 |
| rack-focus | soft focus tick | 0.06–0.1 |
| pan-reveal, push-through, foreground-wipe | soft or passing whoosh | 0.08–0.12 |
| photo-2.5d | faint projector hum | 0.04–0.08 |
| card-flythrough, float-objects | whoosh per card / soft chime | 0.06–0.1 |
| light-sweep, multiplane-fog, depth-headline | light or low swell | 0.06–0.1 |

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/parallax/compositions/px-01-collage-dolly.html` | multiplane collage (paper pack + cut-outs + map) + dolly-in + rack-focus | cutaway |
| `style-examples/parallax/compositions/px-02-night-desk.html` | Codex layered scene (plate, keyed desk, chair) + pan-reveal + orbit-drift | split |
| `style-examples/parallax/compositions/px-03-archive-zoom.html` | public-domain archival photo, subject vs reconstructed plate + dolly-zoom | panel |
| `style-examples/parallax/compositions/px-04-stage.html` | stage-behind-speaker (Codex plate behind the placeholder cut-out) | parallax-stage |
| `style-examples/parallax/compositions/px-05-push-headline.html` | push-through + depth-headline (scene.warung-counter) | parallax-stage |
| `style-examples/parallax/compositions/px-06-peel-steps.html` | layer-peel + stepped-multiplane (paper planes) | cutaway |
| `style-examples/parallax/compositions/px-07-wipe-fog.html` | foreground-wipe + multiplane-fog (scene.city-dusk) | cutaway |
| `style-examples/parallax/compositions/px-08-map-flyover.html` | map-flyover over `SK.mapSvg('sea')` | cutaway |
| `style-examples/parallax/compositions/px-09-photo-dust.html` | photo-2.5d + dust-motes (public-domain photo) | cutaway |
| `style-examples/parallax/compositions/px-10-tilt-light.html` | tilt-reveal + light-sweep (scene.street-motor) | cutaway |
| `style-examples/parallax/compositions/px-11-cards-float.html` | card-flythrough + float-objects + handheld-drift (scene.cafe-cowork) | cutaway |

## Anti-slop Checklist

- [ ] No edge halos, smears, or stretched pixels behind the subject at the end of the move.
- [ ] The subject has a soft edge, a light wrap or contact shadow, and a small breath — not a frozen card.
- [ ] The plate lines up with the source (nothing moved in the reconstruction); it is labelled `reconstructed` and never used as proof.
- [ ] One move per clip, tied to its word; not the same push-in on every shot.
- [ ] Camera travel stays inside the Depth Budget; no plate edge or black border shows.
- [ ] Blur never hides a weak asset and never touches text.
- [ ] Every layer belongs to the transcript; archival photos are verified public domain; no fake "archive".
- [ ] In `parallax-stage` the background moves slower than Dena, and the caption band stays calm.
- [ ] Generated layers show no text, no real person, no brand.
