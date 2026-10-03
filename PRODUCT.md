# Product

<!-- impeccable:product-schema 1 -->

This record covers **Studio**, the local web UI in `scripts/studio/` of the Dena video repo. The HyperFrames videos it produces are not the design surface.

## Platform

web

## Stack

Existing codebase: plain HTML/CSS/JS served by a Node server (`scripts/studio/public/`), no build step and no framework (ADR-0020). Mobile is the same web app on a phone browser, not a native app.

## Users

Dena Meidina, the only operator. Edits and generates short social videos (Instagram, TikTok) for the Dena Meidina account. Works on a laptop for starting jobs, uploading footage, and watching agent terminals, and from a phone over Tailscale to review gates, watch renders, and schedule posts.

## Product Purpose

Studio turns a raw recording or a topic idea into a reviewed, scheduled social video without Dena reading workflow docs or driving the agent by hand. It starts agent sessions (Claude/Codex in tmux), shows what the agent produced at each gate, records Dena's approve/revise/QA decisions, lists renders, and schedules posts through Repliz. Success: from "I want a video" to "scheduled" in the fewest steps, with Dena always knowing the next action.

## Positioning

A single-operator control room that wraps an agent-driven, gate-based video pipeline (Story, Screen Plan, Build, optional QA; Generate gates) with human decisions at the review points. It shows pipeline state from real handoff artifacts rather than a generic job queue.

## Operating Context

- Two production paths: edit footage (`videos/<slug>/` with sources, cut, captions, visual plan, render) and Generate (topic or URL to explainer, kinetic-post, or motion-short, with gates at script/voice, storyboard, render).
- Agents run in tmux sessions that survive Studio restarts; Dena can open a terminal in the browser.
- Studio runs as a macOS LaunchAgent on port 4777, reachable on localhost and Tailscale.
- Publishing goes Cloudflare R2 then Repliz, only after Dena's explicit approval; the calendar shows Repliz schedules and local receipts in WIB.
- Supporting tools: shared source library, voice listening tests, music library, agent sessions.

## Capabilities and Constraints

- Must stay a no-build, plain-JS static UI with no new runtime dependencies.
- No automatic publishing: scheduling or publishing needs an explicit confirmation step; selecting a date or render must never publish.
- UI language is Indonesian, informal but clear; all times are WIB (Asia/Jakarta) and labeled as such.
- Project stage is derived from handoff artifacts (`processed.mp4`, `visual-plan.md`, renders), not stored separately.
- Behavior is specified in EARS requirements (RD-05); UI changes update `internal/docs/requirements/rd-05-studio.md` in the same commit.
- Undecided: whether a team beyond Dena will ever use Studio; no roles or per-user history exist.

## Brand Commitments

Product name is "Studio" within Dena's video workspace. Voice: santai-jelas Indonesian, no promissory or hype copy. No logo or brand asset is committed for Studio itself.

## Evidence on Hand

- Usability audit with proven findings: `internal/docs/research/studio-usability-audit-2026-10-01.md`.
- Requirements and decisions: `internal/docs/requirements/rd-05-studio.md`, ADR-0020, ADR-0026, ADR-0031, ADR-0033.
- Real projects under `videos/` (about 17) and renders for checking list and detail states.
- Absent: usage analytics, user research beyond Dena's own feedback, and any visual brand guide for Studio.

## Product Principles

1. **Always one next step.** Every screen says what state a video is in and offers the single action that moves it forward.
2. **Humans decide at gates.** Agent work is visible and interruptible; approval, revision, and publish are deliberate, confirmed actions.
3. **Show real pipeline state.** Status comes from actual artifacts and sessions, never optimistic or invented progress.
4. **Phone-first for review, laptop for production.** Decisions, playback, and scheduling must work one-handed at 390 px; heavy tooling can live behind the laptop path.
5. **Tools stay out of the way.** Supporting tools (library, voice, music, sessions) are reachable but never compete with the production flow.

## Accessibility & Inclusion

Target WCAG 2.2 AA: labeled controls, visible keyboard focus, at least 44 px touch targets, announced async errors, light and dark themes following system preference, and reduced-motion respected (RD-05-43).
