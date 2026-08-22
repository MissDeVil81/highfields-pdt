---
name: Development seed dependencies
description: Ordering and compatibility constraints for restoring the published Development synthetic dataset.
---

Run manager reference data before V2 progress data when restoring an empty published Development database.

**Why:** V2 progress includes target-linked records whose reference targets are established by the manager dataset. The published Development database can also retain an older column type, so neutral optional seed values should use `NULL` rather than an empty string.

**How to apply:** Keep Development seeding idempotent and dependency ordered. When a published Development database is being restored, preserve existing test rows with conflict-safe inserts rather than clearing tables.