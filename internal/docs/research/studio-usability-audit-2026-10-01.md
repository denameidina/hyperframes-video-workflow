# Studio usability audit and remediation
Date: 2026-10-01
Scope: Studio shell, project/result discovery, Repliz scheduling.

Evidence: `scripts/studio/public/index.html`, `app.css`, `app.js`, Studio route
and Publisher code. Baseline browser inspection is blocked by the Browser
plugin's missing codex app-server executable; no visual score is claimed.

| Severity | Proven baseline finding | User impact | Remediation |
| --- | --- | --- | --- |
| P1 | Publish form has no date/time control | Scheduling dates requires editing metadata | WIB schedule picker and calendar-to-render flow |
| P1 | No Repliz schedule view | Content dates/status cannot be inspected in Studio | Month calendar, day agenda, explicit remote sync |
| P1 | Upload inputs hidden inside nonfocusable labels; project slug has no label | Keyboard users cannot reach upload or identify the field | Visible accessible file controls and labels |
| P2 | Seven equal navigation buttons, mixed English/Indonesian | Production flow and supporting tools compete | Two navigation groups, consistent labels, page descriptions |
| P2 | Project/result lists lack search | Finding a render grows harder as projects grow | Client-side search that preserves players |
| P2 | Buttons have 40 px min-height; no mobile layout rules | Small touch targets and cramped navigation | 44 px targets and responsive navigation/calendar |
| P2 | Every render has a primary publish button | Competing primary actions and premature publishing | Calm review rows and focused confirmation |
| P2 | Async errors lack live announcement | Screen-reader users miss feedback | Alert/status regions and contextual errors |

Retained: existing neutral/blue tokens, system typography, dark mode, no build
step, native dialogs, Generate gate behavior, independent audio/video playback,
and per-target publish duplicate protection.

Requirements: [RD-05](../requirements/rd-05-studio.md),
[RD-01](../requirements/rd-01-publish-pipeline.md). Architecture:
[ADR-0031](../adr/0031-studio-calendar.md).

## Verification

- `npm test`: 476 tests passed, zero failures. Calendar backend covers WIB month
  edges/leap dates, account scoping, pagination bounds, merge, stale fallback,
  HTTP auth, and date validation; CLI tests cover date persistence and duplicate
  prevention. UI tests execute the actual scripts in an event/DOM harness and
  cover calendar selection, explicit sync, late-response races, confirmation,
  HTML escaping and search without player replacement.
- Latest UI-only verification: 5 tests passed after guarding duplicate submit
  and the Generate deep-link startup race; the project opens without a competing
  list refresh. This harness checks behavior, not browser layout.
- Live local HTTP: `/api/calendar?month=2026-10` and `/calendar.js` return 200.
  Repliz configuration is available; old undated receipts are exposed explicitly.
  No live Repliz request, R2 upload or content scheduling was performed.
- Impeccable mechanical detector: `[]` for the changed UI files;
  `git diff --check` and JS syntax checks passed.
- Browser paint/responsive/device inspection remains blocked: Chrome discovery
  succeeds, but Browser calls fail with missing codex app-server executable.
  The event/DOM harness does not prove viewport layout or visual contrast.

Updated documentation: RD-05 Studio, RD-01 publish, API contract, data model,
publish runbook, ADR-0031, this audit, and the internal docs index.

## Follow-up: guided flow redesign (2026-10-03)

Request: make the path from "start an edit" or "generate a video" to a scheduled
post obvious. Changes: Beranda with two start cards and a single "Lanjutkan
pekerjaan" list (RD-05-49), navigation in flow order (RD-05-50), project `stage`
from handoff artifacts (RD-05-51), step trackers and next-action cards for
footage and Generate (RD-05-52, RD-05-53), a three-step Generate wizard, drag and
drop upload, and render rows labelled scheduled / not scheduled. Visual check:
headless Chrome via DevTools at 1280 px and 390 px (no horizontal scroll at 390).
