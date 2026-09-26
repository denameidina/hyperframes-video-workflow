# Motion B-roll Planning (Reference)

When and how to plan motion b-roll in `visual-plan.md`. Loaded by
`docs/agents/02-screen-plan.md` in the visual step. Adapted from
Barty-Bart/motion-graphics `skills/motion-broll` (MIT). Build-side rules live in
`motion-broll-authoring.md`; worked examples live in `motion-broll-examples/`.

## What It Is

Every clip is one shape that never cuts. It morphs its size, corners, and colour
from state to state while its content swaps with a short blur. A cursor drives
the changes with real clicks and drags, and every change lands on a spoken word.

## When To Use It

Motion b-roll is the first choice for a line that explains, shows, compares, or
sequences something the viewer should see: a process, a tool, a real number, a
step, a chapter change, or a story moment with a concrete object.

Use something else when:

- the line needs real proof (the actual tool UI or the actual result): use a
  capture; the capture may sit inside one state of the shape;
- the moment is mood, texture, or background: use a generated still;
- the line is personal, emotional, or an opinion: keep Dena's face, no visual.

## Treatment

Decide per clip and write the reason in the brief.

| Treatment | What the viewer sees | Use when |
| --- | --- | --- |
| Cutaway | The shape on `#050505`, full frame; Dena's face is hidden | The idea must be seen in detail: a product, a process, a comparison, a real number, a chapter change. Lasts as long as the idea, 3–10 s. |
| Split | The shape in the top half; Dena's face slides into the bottom half | The visual needs room, but the face should stay on screen. |
| Panel | A transparent shape in empty space (below the hook card, above the head); the face stays full | A short label or status, or a long sequence that can run past 10 s as one continuous morph. |

Rules:

- No cutaway or split that covers Dena's face in `00:00.00–00:03.00` unless
  `## User Approvals` in `creative-brief.md` allows it (Gate 2 R4).
- Leave at least 2 s of face between two cutaways.
- A cutaway longer than 10 s trips Gate 2 R3.
- Never cut away on a personal, emotional, or opinion line.

## Density

| `visual_density` | Clips per minute |
| --- | --- |
| `light` | 2–4, only the strongest moments |
| `medium` (default) | 4–7 |
| `heavy` | most lines, with at least 2 s of face between clips |

## Content Rules

- One idea per clip. A long panel may hold several states of that idea.
- Put each state change on its word, 0.4–1.2 s apart. Prefer the first or last
  word of a caption beat; word times come from `processed-transcript.json`.
- Labels come from the transcript, in the language Dena spoke.
- Never invent numbers, prices, results, names, or quotes (Gate 2 R1). Use
  relative bars, skeleton lines, or transcript labels, and mark what is
  illustrative.
- One accent (`#facc15`) per clip; green `#22c55e` only for a success state.
- SFX: cursor click → `click-soft`; morph → soft `whoosh-short`; both under
  speech.
- Banned: bouncy easing, particles, glows, gradients on UI, mixed icon strokes,
  dead time, anything that looks like a template, made-up data.

## Vocabulary

| Pattern | Use for | Shape behaviour |
| --- | --- | --- |
| Pill + click | One action ("kirim", "klik", "mulai") | Pill with icon and label; the cursor clicks on the word and the shape presses |
| Progress | Something running or loading | A bar or lanes fill from the start word to the result word |
| Check / toast | A result or confirmation | The shape morphs into a green pill with a check |
| Status island | A live state that changes several times | A compact pill whose label and icon swap on each word |
| Card + drag | Moving an item into place (hand-off, upload) | The card follows the cursor while held and drops on a target |
| Slider | A level, intensity, or trade-off | The cursor drags a knob; the value drives the content |
| Toggle | On/off, manual/otomatis | A switch flips on the word and the content swaps |
| Tabs | Switching between options | A liquid indicator slides between tabs (leading edge fast, trailing edge slow) |
| Chart + tooltip | A relative comparison or trend | Bars grow on words and a tooltip appears on the key word; no invented values |
| Search / filter | Finding one thing among many | A typed query filters a list down to one row |
| Drag-drop file | A file going into a tool | A file chip is dragged onto a drop target |
| Terminal typing | A command or prompt | Mono text is typed character by character with a caret |
| Side-by-side | Two options compared | Two columns; a highlight moves to the winner |
| Chapter card | A new section of the story | A short title card between sections |
| Chat thread | A conversation or client messages | Generic bubbles (no brand), lines from the transcript, one per word beat |
| Timeline langkah | A journey or a sequence of steps | Step nodes; a liquid indicator moves to each step on its word |
| Before → after | A change from one state to another | One shape morphs from "sebelum" to "sesudah" with transcript labels |
| Notif / kalender / jam | Time pressure, interruptions, schedules | Stacked notifications, a calendar, or a clock; times only from the transcript |

## Motion B-roll Brief

Use this instead of the generic Asset Brief for a `motion-broll` row in
`visual-plan.md`:

```md
### <ov-NNN>

- Type: motion-broll
- Purpose:
- Privacy notes:
- Planned file: `compositions/broll/NN-name.html`
- Treatment: <cutaway | split | panel> — <reason>
- Pattern: <vocabulary pattern(s)>
- In–out (host time): <start>–<end> s
- States on words:
  - "<word>" @ <host time> → <state>: <what the shape shows>
- Layers: <content per state; labels verbatim from the transcript>
- Cursor: <clicks and drags on words, or none>
- Illustrative: <what is not real data>
- SFX: <cue @ host time>
- Key-word times for the still check: <host times>
```
