# ADR-0028 Durable Publish Receipts
Status: accepted
Date: 2026-09-30

## Context

The 2026-09-30 audit reproduced two duplicate-schedule risks: a blocked account disappeared from a receipt while another account was newly scheduled, and a successful scheduling POST had no persisted ID when polling failed. ADR-0011 requires retaining account history to decide reuse or explicit forced reposting.

## Decision

- Retain every prior `platform:accountId` entry, including blocked and temporarily unconfigured accounts; replace an entry only with a result for that same target.
- Checkpoint each successful or failed scheduling result before starting the next target, with the successful `scheduleId`, pending status, and targetKey already stored.
- Write receipts to a temporary sibling and rename them atomically. A checkpoint-write failure stops scheduling immediately and is not treated as a Repliz request failure.
- Poll only after those checkpoints; a polling failure leaves resumable pending IDs on disk. On retry, pending entries are polled, not newly scheduled.
- A POST whose response is lost before its schedule ID reaches the client remains an external uncertainty. The helper does not retry it within the same run; it records `status: "error"`. An explicit rerun schedules error targets again under ADR-0011, even without `--force`, so operators must inspect Repliz before that rerun. These checkpoints guarantee recovery only for schedule IDs actually received.

## Consequences

The receipt remains the same JSON schema and now contains historical targets beyond the current env target set. The `createSchedules` helper accepts an optional async checkpoint callback for its caller to persist progress; direct callers remain compatible. This improves recovery without claiming transactional control over a remote API.

## References

- [ADR-0011](0011-per-target-publish-idempotency.md)
- [RD-01](../requirements/rd-01-publish-pipeline.md)
- [Data model](../architecture/data-model.md)
