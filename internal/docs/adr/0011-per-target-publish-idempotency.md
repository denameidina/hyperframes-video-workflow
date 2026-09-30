# ADR-0011 Per-Target Publish Idempotency (amends ADR-0006)

Status: accepted
Date: 2026-09-26

## Context

ADR-0006 keys idempotency off one global `publishKey` = `sha256({r2Key,
targetAccounts (sorted), description, title})`. That key covers the whole
target set at once: if a video already published successfully to Facebook and
YouTube, and the user later adds a new platform (for example enabling
`REPLIZ_THREADS_ACCOUNT_ID` in `.env` after the fact), `targetAccounts` changes
→ `publishKey` changes → `shouldSkipPublish` returns `false` → `runPublish`
would build a fresh schedule for **every** target, including the two that
already succeeded. That is a real duplicate-post risk on an outward-facing,
hard-to-reverse action (a live social post), not a theoretical one — it is
exactly what happens the first time a slug adds Threads.

## Decision

Replace the single global skip/publish-all gate with a **per-target** decision
inside `runPublish`, keyed by `makeTargetKey({r2Key, platform, accountId,
description, title, replies})` (the last three taken from that platform's own
`buildSchedulePayload` output, so YouTube's sanitized description and Threads'
post+reply chain are keyed on what would actually be sent).

For each configured target account, compare against the matching
`platform:accountId` entry in the existing receipt's `schedules[]`:

- No prior entry, prior `status === "error"`, or `--force` → schedule it.
- Prior entry with the same `targetKey` and a non-error status → reuse the
  prior entry; no new POST. A non-terminal entry may make GET polling calls.
- Prior entry with a **different** `targetKey` (content changed since that
  target's last success) and no `--force` → `blocked`: do not schedule, do not
  touch that target, surface it in the CLI output and in `receipt.blocked[]`
  with a message pointing at `--force`.

R2 upload, `verifyPublicUrl`, and `validateAccounts` only run when at least one
target needs scheduling. If everything is reused (or blocked) and nothing is
new, `runPublish` returns `{ skipped: true, receipt, blocked }` without upload
or new POST; pending reused schedules are refreshed through GET polling.
Receipt persistence/history is amended by [ADR-0028](0028-durable-publish-receipts.md).

`makePublishKey`/`shouldSkipPublish` (ADR-0006) stay exported and tested as
pure functions — they are no longer read by `runPublish`'s control flow, but
removing them would break their existing direct callers/tests for no benefit.
`receipt.publishKey` is still written (a useful "did anything about this whole
run change" summary), just not used to gate per-target scheduling anymore.

## Rationale

- The bug this fixes is specifically the "add a platform later" case — the
  exact shape of adding Threads to an already-published slug — so it had to be
  fixed before Threads support could ship safely, not filed as future work.
- Per-target keys make partial republishing (one platform's caption was wrong,
  the rest were fine) an explicit, `--force`-gated action instead of an
  accidental side effect of touching unrelated config.
- Reusing prior entries verbatim (not re-deriving them) means a target's
  `scheduleId`/`status`/`postId` history is preserved exactly.

## Consequences

- `receipt.schedules[]` entries now carry a `targetKey` field (see
  [architecture/data-model](../architecture/data-model.md)). An older receipt
  entry with no `targetKey` (written before this ADR) is treated as **reused,
  not new and not blocked** — there is no prior content to compare against, so
  it is left alone and stamped with a freshly computed `targetKey` for future
  runs, rather than guessed as "changed" (which would block it) or "absent"
  (which would resend it). A reused entry that has not reached a terminal
  status yet (`pending`/`process`, including a legacy one) is polled once via
  `pollSchedules` even when nothing new needs scheduling, so its status in the
  receipt stays current.
- A content change on an already-succeeded platform now requires `--force` to
  repost that platform specifically — silently changing `publish-captions.md`
  and rerunning no longer reposts anything by itself. Operators must notice
  and act on `blocked` output.
- `docs/repliz/integration-spec.md`, [requirements/rd-01-publish-pipeline](../requirements/rd-01-publish-pipeline.md),
  and [architecture/api-contract](../architecture/api-contract.md) describe
  the per-target flow; ADR-0006 remains the record of the original
  whole-run key design and is not deleted.

## Sources

- `scripts/repliz-publish.mjs` (`makeTargetKey`, `runPublish` per-target
  partition loop)
- `scripts/repliz-publish.test.mjs` ("runPublish adds a newly configured
  platform without re-scheduling already-successful targets", "runPublish
  blocks (does not resend) a platform whose content changed...", "runPublish
  treats a legacy receipt entry with no targetKey as reused, not blocked")
- [ADR-0006](0006-idempotent-publish-receipts.md) (amended, not superseded —
  the global `publishKey` concept still exists in the receipt)
- [requirements/rd-01-publish-pipeline](../requirements/rd-01-publish-pipeline.md)
  (RD-01-13a..13e)
