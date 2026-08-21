---
name: Startup seed resilience
description: Completion sentinels, atomic writes, and serialized seed ownership prevent incomplete demo data after a restart.
---

## Rule
Startup fixture seeds must use a completion sentinel written at the end of their own dataset, run their writes in a transaction, and serialize the sentinel check with the write.

**Why:** A non-empty shared table can be left behind by an earlier or interrupted seed, making a later seed falsely appear complete. Separate instances can also pass an unlocked check simultaneously. Historic partial baseline data must be replayable without duplicate-key failures.

**How to apply:** When adding or reviewing a seed guard:
- Guard on a record only written after that seed's complete fixture set, not a table row count.
- Put the guard and write work behind the same PostgreSQL advisory lock.
- Roll back the entire seed on non-recoverable errors; fixture replays for legacy partial state may skip only duplicate-key statements behind savepoints.
- Order seed phases so records with foreign keys run only after the fixtures they reference are committed.
- When a staged seed uses a final completion record, make every preceding atomic batch replay-safe so a legacy interruption can still reach that record.
- Surface any failed seed step in health/readiness state rather than silently serving incomplete data.
