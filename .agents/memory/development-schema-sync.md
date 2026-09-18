---
name: Development schema sync
description: Development database columns may need explicit application after Drizzle schema changes
---

Do not assume an API restart has applied new columns merely because startup reports that the database schema is current.

**Why:** An additive Drizzle schema change compiled successfully and the API restarted, but existing-table columns remained absent and caused runtime 500 responses.

**How to apply:** After adding columns, compile the database package, apply the additive DDL to Development through the database tooling, and verify the affected API response before considering the migration complete. Leave Production schema application to the managed publish flow.