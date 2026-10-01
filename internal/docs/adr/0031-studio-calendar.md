# ADR-0031: Studio calendar and explicit scheduling
Status: accepted
Date: 2026-10-01

## Context

Dena requests a simpler Studio and a Repliz calendar to see content dates and
schedule renders. Studio currently exposes flat tabs and publish confirmation
without a date picker. Repliz's checked-in OpenAPI supports paginated GET
`/public/schedule` filtered by fromDate/toDate and accountIds.

## Decision

Preserve the warm neutral/blue visual identity and dependency-free Studio.
Group navigation by task, add page descriptions, search, accessible controls,
and a month calendar with a day agenda. All calendar dates use Asia/Jakarta.

Local receipts are available offline. An explicit sync reads only configured
accounts for the selected month. An in-memory snapshot is retained on errors;
no new database or automatic background Repliz calls. Limit remote sync to
1000 records/30 seconds and disclose partial/stale data. Old receipts without
actual dates stay undated until remote sync supplies them.

Scheduling uses the existing approval-gated Publisher with an optional
`--schedule-at` argument rather than rewriting metadata before a job starts.
Persist the actual date per target; retain targetKey idempotency and never
force repost from this UI. Future schedules return after checkpointing.

## Consequences

Calendar can show posts created outside Studio after sync. Snapshots disappear
on restart; receipts remain. Calendar schedules new renders; editing/deleting
existing remote posts remains outside this feature. All publishing still
requires Dena's concrete confirmation of the render, caption and date.

Validation: Studio/calendar and publish CLI tests with fake network/processes;
responsive/browser verification when the browser connection is available.
