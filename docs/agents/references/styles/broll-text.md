# B-roll Text (Style Reference)

Full-frame kinetic typography: the words Dena says appear, slam, stack, or swap
on screen exactly on the spoken word. Loaded by `docs/agents/02-screen-plan.md`
(visual step, after `styles/README.md`) and `docs/agents/03-build.md` (author
step). Engine: `vendor/style-kit/` (`window.SK`) on top of `vendor/motion-kit/`
(`window.M`). Worked examples: `docs/agents/references/style-examples/broll-text/`
(`tx-01` … `tx-10`, `npm run check:style-examples -- broll-text`).

## When To Use

Use `broll-text` for a line whose **words** are the point:

- a punchline or verdict ("bukan soal tools, tapi sistem");
- a key quote or rule Dena wants the viewer to remember;
- a contrast or correction ("bukan X, tapi Y");
- a short list or escalation ("catat, otomatis, laporan");
- a single number or unit said out loud, when a chart would be overkill.

Do not use it for:

- a line that needs proof (use a capture), a process in a tool (use
  `motion-broll`), or a quantity to compare (use `motion-graphic`);
- a personal, emotional, or opinion line (keep Dena's face);
- more than 8 on-screen words per state: that is a caption, not b-roll.

Every word on screen is verbatim from `processed-transcript.json` (Gate 2 R1).
Show selected words, not the whole sentence (Takahashi, Dylan cue cards).

## Look

| Palette | bg | ink | accent | accent-2 | muted | add | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.sk-pal-text-default` | `#0a0a0a` | `#fafafa` | `#facc15` | `#ef4444` | `#737373` | — | legacy |
| `.sk-pal-text-paper` | `#f2f0ea` | `#111111` | `#ff4d00` | `#2563eb` | `#8a8578` | — | legacy — exception: accent |
| `.sk-pal-text-signal` | `#111111` | `#f5f5f5` | `#22d3ee` | `#f43f5e` | `#525252` | — | legacy |
| `.sk-pal-text-ink-blue` | `#0b1f4d` | `#f8fafc` | `#fde047` | `#fb7185` | `#64748b` | — | legacy |
| `.sk-pal-text-jakarta-dusk` | `#1a1033` | `#fff4e6` | `#ff8a3d` | `#ff4f8b` | `#7a6a99` | — | new |
| `.sk-pal-text-risograph` | `#f6efe2` | `#1d3fbb` | `#e8336d` | `#00897b` | `#a79f8f` | overlay `.sk-tex-riso` | new |
| `.sk-pal-text-terminal` | `#0b0f0c` | `#d7ffd9` | `#39ff88` | `#ffb000` | `#4f6b55` | — | new |
| `.sk-pal-text-cream-red` | `#f3ead8` | `#1a1a1a` | `#d62828` | `#003049` | `#9a8f7a` | — | new |

| Type preset | display | body | hand | serif | mono |
| --- | --- | --- | --- | --- | --- |
| `.sk-type-text-poster` | Anton | Geist | — | — | — |
| `.sk-type-text-editorial` | Bebas Neue | Instrument Serif | — | — | — |
| `.sk-type-text-brutal` | Archivo Black | Space Grotesk | — | — | — |
| `.sk-type-text-terminal` | JetBrains Mono | JetBrains Mono | — | — | JetBrains Mono |

- `.sk-pal-text-paper` accent (2.92:1) — only for payoff words ≥ 180 px.

- Put the palette class on the stage (`<div class="sk-stage sk-text sk-pal-text-cream-red">`),
  plus the `add` class when listed; an overlay is its own full-frame div. Write the class in the
  brief's `Palette:`; hex values are still allowed when a video needs its own colours (say why).
- Type presets set `--sk-font-*`; `.sk-display`, `.sk-sans`, `.sk-hand`, `.sk-serif`, `.sk-mono`
  follow them. Font classes for one-offs: `.sk-f-<font>` (see `font.webp`).
- One palette preset per style per video, unless a palette change marks a new story section.

- One accent per state. The accent marks the payoff word only.
- Type: Anton (`.sk-display`, the `.sk-text` default) for slams and stacks;
  Geist 700–800 (`.sk-sans`) for quotes and sentences; never name a font family
  inside a clip's `<style>` (the linter only sees `@font-face` in the kit sheets).
- Scale on 1080×1920: slam/stack words 180–260 px, quote text 84–110 px, labels
  36–48 px. Nothing under 36 px.
- Safe area: keep text inside x 80–1000 and y 180–1400; below y 1400 belong the
  captions (`--safe-bottom`) and the platform UI.

## Kit

Library assets for this style — look at the sheets before choosing, then list the ids in the
brief's `Library assets:` (`vendor/asset-lib/CATALOG.md` has every id, tag, and source). Make a
new asset only when nothing here fits the line, and say why in the brief (RD-03-55).

| Need | Catalog ids | Sheet |
| --- | --- | --- |
| Display type | `font.anton`, `font.bebas-neue`, `font.archivo-black`, `font.instrument-serif`, `font.jetbrains-mono`, `font.space-grotesk` | `../asset-catalog/sheets/font.webp` |
| Texture and overlay | `texture.halftone`, `texture.riso`, `texture.concrete-light`, `texture.plaster` | `../asset-catalog/sheets/texture-1.webp`, `../asset-catalog/sheets/texture-2.webp` |
| Marks on words | `frame.swash-1`, `frame.swash-2`, `frame.swash-3`, `frame.swash-4`, `doodle.burst`, `doodle.circle-loose`, `doodle.underline-wave` | `../asset-catalog/sheets/frame-1.webp`, `../asset-catalog/sheets/frame-2.webp`, `../asset-catalog/sheets/doodle-1.webp` |

## Timing

- Entrances start 0.03–0.10 s before the word (1–3 frames at 30 fps).
- Hold every word at least 0.4 s; hold the final state 0.8–1.5 s.
- Exits are faster than entrances (0.15–0.2 s) or are hard cuts at clip end.
- Define 3–4 behaviours per video (how words enter, get emphasis, and exit) and
  reuse them (Paone, "Time Is the Material").

## Patterns

| Pattern | Looks like | Use when | Timing vs word | SFX | Common misuse | Build with |
| --- | --- | --- | --- | --- | --- | --- |
| **slam** | Word drops from ~2.2× to 1× with a small overshoot | Verdict or punchline ("GAGAL", "SISTEM") | Impact lands on the word onset; hold 0.6–1 s | low thud | Slamming every word so nothing stands out | `SK.enter(el, t - at, 'slam')` |
| **scale-punch** | A word already on screen jumps to ~108% and settles | Stressed syllable inside a phrase | Peak on the stressed syllable, 0.2–0.3 s total | soft tick | Punching filler words | `M.track(1, [[at, 1.08, [30, .5]], [at + .3, 1, M.SLOW]])` |
| **stack** | Lines pile up into a block, one per word or phrase | Lists, escalation | Each line on its word | soft pop per line, rising pitch | More than 5 lines | `.sk-w { display:block }` + `SK.reveal(…, 'slam')` or `'mask'` |
| **word-swap** | One word leaves and the next takes its slot | "bukan X, tapi Y", replacements | Old word exits on "tapi", new word on its onset | paper flick | Swapping faster than 0.25 s per word | two absolutely-placed `.sk-w`; manual exit + `SK.enter(new, …, 'slam')` |
| **highlight-swipe** | A marker bar wipes behind the keyword left to right | Tie a phrase to the claim | Swipe starts on the word, 0.25–0.4 s | marker swish | Highlighting the whole sentence | `.swipe` child with `transform: scaleX(M.eo(...))` |
| **strike-through** | A bar or line crosses out the wrong word | Myth-busting, "yang orang pikir…" | Strike on "bukan"/"salah"; replacement on the next word | pen scratch | Striking before the wrong word has been read (< 0.8 s on screen) | bar `scaleX` or `SK.draw` on a path |
| **mask-reveal** | Word rises from behind its baseline | Neutral clean entry for most words | Starts 2–3 frames before onset, 0.2–0.35 s | none or faint air | Every word masking identically | `<span class="sk-mask"><span class="sk-w">` + `'mask'` |
| **quote-card** | Big quote mark, sentence builds word by word | A rule or line Dena wants remembered | Card in 0.3 s before the first word | page turn | Quotes longer than ~10 words | `SK.reveal(words, AT, t, 'rise')` + `'drop'` for the mark |
| **type-on** | Characters appear one by one with a caret | Prompts, commands, product names | Typing ends when the word ends | muted key clicks | Typing slower than speech | slice `textContent` by `SK.count`-style progress |
| **counter-word** | A number counts up to its value | Stats, money, time said out loud | Lands on the number's last syllable; 0.5–1 s | tick roll ending in a click | Counting when the exact number doesn't matter | `SK.count(t, t0, t1, 0, N)` |
| **split-word** | A bar slices the word; halves slide apart (Psycho) | "terbelah", "pisah", two-sided ideas | Split on the final syllable, 0.35–0.45 s | short whoosh | Using it for words with no split meaning | two copies clipped top/bottom, opposite `translateX` |
| **grid-column** | Words rise and fall in grid columns (North by Northwest) | Structured comparisons, timelines | Each column moves on its own word | soft slide | Grid lines that never pay off | columns as `.sk-a`, `M.track` on `y` |
| **zoom-assemble** | Extreme close-up on a letter pulls back to the full word | Opening reveal of a product/brand name | 1.5–2 s ease-out, lands on the word | low swell into a soft hit | Mid-explanation (kills pacing) | wrapper `scale` from ~4 to 1 with `M.track` |
| **jitter-flash** | 2–4 frame flash of a distressed word, then a clean hold | Pain points, "masalahnya…" | Flash before the word; clean on the word | tape crackle | Positive or CTA beats | `SK.boil` offset with `fps: 24` for the flash only |
| **over-footage** | Thin, oversized type laid over running footage at partial opacity | Keep the face visible while the word lands | Fade in on the onset, 0.8–1.5 s | none | Heavy type that hides the face | panel treatment, `opacity: .85`, `'fade'` |
| **split-scale** | Phrase in two parts; the second-half keyword is bigger | The final payoff phrase | Big word lands on its onset | soft bass pop | Making every line a two-size split | two lines, second at 1.6× size, `'pop'` |
| **font-swap** | One word cycles through 3–4 display fonts in fast steps, then settles on one | "berubah", "versi baru", identity | Swap every 2 frames (15/s) over the lead-in word; settle on the stressed syllable | shutter click per step | More than 4 fonts; swapping for the whole clip | `.sk-f-*` classes swapped by `SK.cycle(t, n)` until the settle time |
| **stamp-slam** | A stamp or badge drops from 1.4× onto the keyword with a short decaying shake | Verdicts and labels: "GRATIS", "BARU", "HEMAT" | Lands on the first syllable; shake ≤ 0.3 s | rubber-stamp thud | Stamping many words; stamping a claim that is not a verdict | `SK.stamp(id, { text })` + `'slam'` + `SK.shake` |
| **swash-underline** | A hand-drawn swash draws under the payoff word | The last keyword of a sentence | Draws in 0.3–0.5 s from the word onset | marker sweep | Underlining a whole line; more than one swash per screen | `SK.doodle('frame.swash-N')` + `SK.drawSeq` |
| **riso-poster** | The word as a two-ink print: two ink layers offset 6–10 px, riso grain, halftone | A big statement that should feel "printed", zine | The two inks register on the word (0.3 s) | paper slap | A busy image behind; more than two inks | `sk-pal-text-risograph` + two copies of the word (`mix-blend-mode: multiply`) + a `.sk-tex-riso` overlay |

## References

### R1 — Saul Bass, *North by Northwest* titles (1959)
- Source: https://www.artofthetitle.com/title/north-by-northwest/
- Steal: sans-serif blocks rise and fall "as though tethered" on a flat grid; the
  grid dissolves into the building's facade, so type lives inside the scene.
- 9:16: draw thin grid lines first (~0.2 s), slide the keyword along one column
  onto the stressed syllable, match-cut back to the face.

### R2 — Saul Bass, *Psycho* titles (1960)
- Source: https://www.artofthetitle.com/title/psycho/
- Steal: only white bars on black; strict paths that never cross; bars slice the
  type, cut to a jagged score.
- 9:16: two horizontal bars wipe in, split the word, and the halves slide apart on
  its final consonant (`split-word`). Black and white only.

### R3 — Saul Bass, *Anatomy of a Murder* titles (1959)
- Source: https://www.artofthetitle.com/title/anatomy-of-a-murder/
- Steal: cut-paper pieces on flat grey; the whole is taken apart piece by piece,
  acting out the title literally.
- 9:16: for "komponennya" lines, show the whole word, then pull it into labelled
  pieces, one per spoken item.

### R4 — Kyle Cooper / R/GA, *Se7en* titles (1995)
- Source: https://www.artofthetitle.com/title/se7en/
- Steal: scratched lettering mixed with Helvetica; staccato cuts; distress that
  comes from the story, not a preset.
- 9:16: only for dark "problem" beats — a 2–4 frame `jitter-flash`, then the clean
  word on the payoff.

### R5 — Pablo Ferro, *Dr. Strangelove* titles (1964)
- Source: https://www.artofthetitle.com/title/dr-strangelove-or-how-i-learned-to-stop-worrying/
- Steal: thin hand lettering that fills the frame, laid over footage that stays
  readable ("we have to see both at the same time").
- 9:16: `over-footage` panel — thin, very large type across the full width at
  partial opacity so Dena's face reads underneath.

### R6 — Kuntzel + Deygas, *Catch Me If You Can* titles (2002)
- Source: https://www.artofthetitle.com/title/catch-me-if-you-can/
- Steal: a modern Bass tribute; type flows along paths; flat colour changes mark
  place and time.
- 9:16: give each story section its own flat background colour; slide type in on
  a path instead of popping it.

### R7 — Imaginary Forces, *Stranger Things* titles (2016)
- Source: https://www.artofthetitle.com/title/stranger-things/
- Steal: extreme close-ups of letters that slowly assemble; small built-in
  imperfections.
- 9:16: `zoom-assemble` — start on a letter crop at ~400% and ease back over
  1.5–2 s so the word settles as it is spoken.

### R8 — Prince, "Sign o' the Times" lyric video (1987)
- Source: https://en.wikipedia.org/wiki/Sign_o%27_the_Times_(song)
- Steal: considered one of the earliest lyric videos; phrases move between
  windows and shapes on the beat.
- 9:16: a 2×2 window grid; words move between windows on each spoken phrase.

### R9 — Bob Dylan cue cards, "Subterranean Homesick Blues", *Dont Look Back* (1967)
- Source: https://en.wikipedia.org/wiki/Dont_Look_Back
- Steal: handwritten cards with selected words, dropped one by one; lo-fi and
  clearly handmade.
- 9:16: `word-swap` as a card drop — each keyword replaces the last on its word;
  only selected words, never the full sentence.

### R10 — Takahashi method (Masayoshi Takahashi)
- Source: https://en.wikipedia.org/wiki/Takahashi_method
- Steal: one or two huge words per slide, many fast slides; popular in developer
  talks.
- 9:16: one word fills the frame, hard cuts at speech pace, no decoration.

### R11 — Steve Jobs keynote slides (Carmine Gallo)
- Source: https://www.carminegallo.com/auto-draft-21/
- Steal: about three words per slide, huge type; a statistic alone takes over
  half the screen.
- 9:16: for a spoken number ("3 bulan"), the number alone at ~60% of the frame
  height with a small unit label (`counter-word`).

### R12 — Vox motion look (PremiumBeat breakdown)
- Source: https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/
- Steal: graphics stepped at 12 fps for a handmade stutter, swapped paper
  textures, a slow push-in while the line is spoken.
- 9:16: `SK.stepTime(t, 12)` on the text layer's motion plus a slow push-in; the
  paper texture arrives with the VOX style in sub-project 2.

### R13 — Alex Hormozi caption style (Submagic breakdown)
- Source: https://www.submagic.co/blog/how-to-make-alex-hormozi-captions
- Steal: uppercase condensed type; the phrase is split and the second-half keyword
  is made bigger.
- 9:16: borrow only `split-scale` for a payoff line; copying the whole preset
  (white + yellow stroke + shadow) is the template look to avoid.

### R14 — Mitch Paone / DIA, "Time Is the Material"
- Source: https://mitchpaone.substack.com/p/time-is-the-material-from-motion
- Steal: "the letterform is the smallest unit of a kinetic system"; motion
  grounded in Swiss-grid rigour; design the behaviour, not the frame.
- 9:16: pick 3–4 behaviours per video in the brief and reuse them across clips.

## Build Recipe

Skeleton (the root is styled by `#root`; ids only need to be unique within the
clip):

```html
<template>
  <style>
    #root { position: absolute; inset: 0; }
    #stack { position: absolute; left: 0; right: 0; top: 330px; text-align: center; font-size: 250px; }
    #stack .sk-w { display: block; }
  </style>
  <div id="root" data-composition-id="broll-NN-name" data-width="1080" data-height="1920" data-duration="4">
    <div class="sk-stage sk-text">
      <div id="stack"><span class="sk-w">BUKAN</span><span class="sk-w">SOAL</span></div>
    </div>
  </div>
  <script>
    (() => {
      const ID = 'broll-NN-name';
      const $ = SK.finder(ID);
      const words = SK.words($('stack'));
      const AT = [0.2, 0.55];            // clip-local word times from processed-transcript.json
      SK.clip(ID, { T: 4, update: (t) => SK.reveal(words, AT, t, 'slam') });
    })();
  </script>
</template>
```

- Clip-local time = host word time − mount `data-start`.
- `SK.enter` styles: `fade`, `rise`, `pop`, `slam`, `mask`, `drop`.
- `bg: null` in `SK.clip` for split and panel (transparent stage); draw the split
  backdrop yourself in the top 960 px.
- Keep every per-frame value a function of `t`. No timers, no `Math.random`.
- `SK.typeOn(el, text, u)` types `text` up to `u` (0..1) with a blinking caret
  (type-on); `SK.shake(t, t0)` returns a decaying `{x, y, r}` jolt (stamp-slam,
  jitter-flash). Both write the DOM only when the value changes.

## SFX

| Pattern | Cue | Level |
| --- | --- | --- |
| slam, split-scale | low thud / soft kick | 0.14–0.2 |
| stack, pop | soft pop per line | 0.08–0.12 |
| highlight-swipe, strike-through | marker swish / pen scratch | 0.1–0.14 |
| word-swap | paper flick | 0.1 |
| counter-word | tick roll → click | 0.08–0.12 |
| type-on | muted key clicks | 0.06–0.1 |
| stamp-slam | rubber-stamp thud | 0.14–0.18 |
| font-swap | shutter click per step | 0.06–0.1 |

All cues stay under speech (Motion And SFX Gate in `quality-gates.md`).

## Examples

| Clip | Patterns | Treatment |
| --- | --- | --- |
| `style-examples/broll-text/compositions/tx-01-slam.html` | slam + stack + scale-punch, dims the setup words | cutaway |
| `style-examples/broll-text/compositions/tx-02-quote-split.html` | quote-card + highlight-swipe | split |
| `style-examples/broll-text/compositions/tx-03-word-swap.html` | word-swap + strike-through + mask-reveal | panel |
| `style-examples/broll-text/compositions/tx-04-stack.html` | stack + mask-reveal, paper palette, step counter | cutaway |
| `style-examples/broll-text/compositions/tx-05-type-counter.html` | type-on + counter-word, terminal palette and type | cutaway |
| `style-examples/broll-text/compositions/tx-06-split-scale.html` | split-word + split-scale, cream-red palette | panel |
| `style-examples/broll-text/compositions/tx-07-zoom-grid.html` | zoom-assemble + grid-column, editorial type | cutaway |
| `style-examples/broll-text/compositions/tx-08-jitter-footage.html` | jitter-flash + over-footage, brutal type | panel |
| `style-examples/broll-text/compositions/tx-09-stamp-swash.html` | stamp-slam + swash-underline, library stamp and swash | split |
| `style-examples/broll-text/compositions/tx-10-font-riso.html` | font-swap + riso-poster, risograph palette and texture | cutaway |

## Anti-slop Checklist

- [ ] Not every word uses the same entrance; the payoff word has its own behaviour.
- [ ] Each word lands on its syllable (±0.1 s against `processed-transcript.json`).
- [ ] No filler word ("yang", "jadi", "banget") gets emphasis while the idea word stays plain.
- [ ] At most 8 words on screen per state; no full sentences as b-roll.
- [ ] No stacked effects (glow + gradient + shake + particles) on one word.
- [ ] Not the Hormozi preset look (white + yellow stroke + drop shadow) copied whole.
- [ ] No grunge, glitch, or VHS overlay without a story reason.
- [ ] Text stays inside x 80–1000, y 180–1400 and is at least 36 px.
- [ ] Every word is verbatim from the transcript or given by the user.
