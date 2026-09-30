# Motion Craft (Reference)

Optional choreography recipes for any GSAP overlay or `update(t)` clip, through
`vendor/craft-kit/` (`window.CK`). Use them when a card, pill, title, bar, or
icon should move with weight instead of a plain fade. Nothing in the workflow
requires them: Screen Plan still names motion by the primitives in
[motion-grammar.md](motion-grammar.md), and Build may implement a primitive
with a recipe. Spec: `docs/superpowers/specs/2026-09-28-craft-kit-design.md`;
decision: `internal/docs/adr/0021-craft-kit-choreography.md`.

Inspired by the motion in [blixvip/NullMotion](https://github.com/blixvip/NullMotion).
That repo has no licence, so craft-kit is written from scratch: no code, markup,
CSS, or assets were copied. Only the observed techniques below were reused.

## The 12 principles

1. **Travel, overshoot, settle.** Split every move into three tweens: a fast
   `power4.out` travel that passes the rest point (about 24 px), then a short
   `power2.out` settle (about 0.34 s). Bars and rules do the same on scale
   (`0 → 1.08 → 1`).
2. **Squash and stretch.** Stretch along the travel while moving
   (`scaleY 1.045, scaleX 0.98` for a vertical move) and relax at rest.
3. **Opacity is not the motion.** Fade in within 0.08 s and let the transform do
   the work. On exit, keep opacity until the object has nearly left the frame.
4. **Anticipate the exit.** Dip 10 px against the travel and squash for 0.12 s,
   then leave with `power2.in`.
5. **Ground it.** A blurred ellipse under the object follows its height
   (opacity and `scaleX` rise as it lands, shrink as it leaves).
6. **Restrained depth.** `transformPerspective` about 1500, a tilt of 12° that
   overshoots to -2.5° and settles at 0, origin near the bottom (`50% 82%`).
   A flip swaps faces at 88°, never exactly edge-on.
7. **Blur is motion blur.** Words rise out of a mask with `yPercent 118`,
   `skewY 7`, `scale 1.075`, `blur(15px) → 0`, staggered about 0.105 s.
8. **Light after landing.** A skewed light strip crosses a pill or plate only
   after it has settled.
9. **Reveal by shape.** `clip-path` from the centre (`inset`), a circle, or a
   side wipe instead of a fade.
10. **Rubber band.** Lines and bars overshoot their full size, then relax.
11. **Impact recoil.** When a headline lands, the whole group is pushed a few
    pixels and springs back with `back.out`.
12. **Let the idea settle.** A quiet hold gives the viewer time to read or see a
    relationship. Use a slow bob only when it belongs to the subject or material;
    still text, resting objects and resolved diagrams can stay still.

Rhythm follows the line: staged entrance, a readable hold, then a meaningful exit.
Stagger siblings by 0.035–0.13 s; do not start everything on the same frame.
Richness comes from hierarchy, part animation, cause and response, and continuity
across scenes. Applying the same arrive/bob/exit chain to every object does not
replace those decisions. Keep secondary action quieter than the focal action.

## Action and response, beyond arrival recipes

When a focal object passes several waypoints in one action, do not restart
an ease-in/out curve at every point: that forces it to brake at each transit
point. Plan a continuous curve/tangent and preserve travel velocity until an
actual stop. Anticipation belongs before departure; contact, compression,
shadow and delayed part recovery belong at the arrival.

Give animated illustration agency. Content being assembled, the actor's action
and the receiver's response should belong to the same event: cells align because
data is gathered; a payload causes overload; a test stamp confirms a handoff.
An expressive face or articulated limb is useful when it communicates that
event. Adding a bob or sheen to an otherwise static poster does not do this.
Preserve object identity when promising a transformation; newly instantiated
lookalike cards do not show scattered data becoming organized data.

Review anticipation, transit, contact and settle at phone size. A tiny squash
that disappears at 360 px width, a path disconnected from the traveler, and a
completed layout sampled only at rest are insufficient evidence. Keep technical
seek/contrast checks separate from the user's assessment of motion quality.
The [Threads reference analysis](../../../internal/docs/research/threads-motion-reference-2026-09-30.md)
records the concrete revision that exposed these gaps.

## Loading

Per-video projects link the repo `vendor/` folder (`videos/<slug>/vendor →
../../vendor`), so the kit is already on disk. The Dena starter does not load
it; add these lines to `videos/<slug>/index.html` after GSAP (and after
motion-kit/style-kit when a clip uses `SK.clip`):

```html
<script src="vendor/craft-kit/craft-kit.js"></script>
<link rel="stylesheet" href="vendor/craft-kit/craft-kit.css" />
```

## Two ways to call a recipe

GSAP overlay (root timeline or a GSAP sub-composition):

```js
CK.add(tl, '#hook-card', 'arrive', 0.02, { dist: 600 });
CK.add(tl, '#hook-card .ck-sheen', 'sheen', 1.1);
CK.add(tl, '#hook-card', 'exit', 2.6);
```

`update(t)` clip (`SK.clip`, `M.clip`): pass elements, not selectors, and call
recipes in time order every frame. An entrance recipe holds its first frame
before it starts; other recipes leave the element alone until they start.

```js
const words = CK.split($('title'));
SK.clip(ID, { T: 3, bg: null, update: (t) => {
  CK.at($('card'), 'arrive', t - 0.1);
  CK.at(words, 'wordMask', t - 0.4);
  CK.at($('card'), 'exit', t - 2.2);
} });
```

Both calls read the same keyframes, so a recipe looks identical in either mode.

## Recipe catalog

`dir` is the direction of travel: `arrive` with `up` comes from below; `exit`
with `up` leaves off the top. `speed: 2` plays any recipe twice as fast.

| Recipe | Target | What it does | Options (default) | Length |
|---|---|---|---|---|
| `arrive` | element | fade 0.08 s, travel + overshoot + settle, stretch, tilt | `dir` (up), `dist` (1120), `tilt` (12) | 1.24 s |
| `exit` | element | anticipation, fly-off, late fade | `dir` (up), `dist` (1550) | 0.78 s |
| `bob` | element | idle y bob | `amp` (8), `period` (1.2), `cycles` (2) | period × cycles |
| `rubber` | bar, rule | scale 0 → 1.08 → 1 | `axis` (x), `origin` (x: centre, y: bottom) | 1 s |
| `squash` | pill, button | wide/short → narrow/tall → rest | – | 0.77 s |
| `recoil` | group | push and spring back | `push` (6) | 0.6 s |
| `wordMask` | `CK.split` words | rise out of a mask, unskew, sharpen | `stagger` (0.105) | 0.9 s + stagger |
| `sharpen` | element | blur 20 px → sharp | – | 0.9 s |
| `sheen` | `.ck-sheen` | light strip crosses once | – | 0.9 s |
| `clip` | element | clip-path reveal | `shape` (inset, circle, wipe), `radius` (0) | 0.9 s |
| `flip` | card with `.ck-face-front/back` | turn, swap face at 88°, turn back | – | 0.7 s |
| `shadow` | `.ck-shadow` | contact shadow for arrive or exit | `phase` (arrive, exit) | 1.24 / 0.4 s |

Every option also accepts `stagger` (seconds between targets) and `speed`.
`CK.duration(name, { ...opts, count })` returns the length including stagger.

## Markup the recipes expect

- `wordMask`: `CK.split(el)` wraps each word in `.ck-mask > .ck-word` once and
  returns the `.ck-word` spans.
- `sheen`: a `<span class="ck-sheen">` inside a parent with
  `position: relative` (or absolute) and `overflow: hidden`. Colour:
  `--ck-sheen-color`.
- `shadow`: a `.ck-shadow` element placed **before** the object in the DOM (so it
  draws underneath), positioned under its rest position. Colour and softness:
  `--ck-shadow-color`, `--ck-shadow-blur`. On a near-black background a black
  shadow is invisible; skip it there.
- `flip`: the card holds `.ck-face-front` and `.ck-face-back`; the recipe moves
  `--ck-face` from 0 to 1.

## Rules

- Do not centre an animated element with a CSS `transform` (for example
  `translate(-50%, -50%)`): GSAP takes over `transform`. Centre it with
  `left/top` plus negative margins, or animate a wrapper.
- One entrance recipe per element. To combine an entrance with `sharpen` or
  `clip`, put the second one on a child.
- Chain recipes on one element in time order and let each finish before the next
  starts on the same property (`arrive` ends at 1.24 s; start `recoil` after it).
- Keep the Dena caption, hook-card, and CTA rules: recipes change how things
  move, not the safe areas, timing windows, or copy.
- Recipes are deterministic; still never add `Math.random` or clocks around them.

## Examples

`docs/agents/references/craft-examples/`: one clip per recipe (odd clips use
`CK.add`, even clips `CK.at` inside `SK.clip`) plus a headline card that chains
`arrive`, `shadow`, `wordMask`, `rubber`, `recoil`, `squash`, `sheen`, `bob`, and
`exit`. Check and snapshot them with `npm run check:craft-examples` (frames in
`renders/craft-examples/`).
