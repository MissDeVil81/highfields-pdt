---
name: Production seed chain guard conditions
description: Each seed function must guard on a table unique to itself — shared tables cause false skips that leave some data missing.
---

## Rule
Each `seed*IfMissing` function must check a table that ONLY it populates as its guard condition. Checking a shared table causes the function to skip if an earlier seed already wrote to that table.

**Why:** `seedManagerPortalDataIfMissing` previously checked `probation_items`, but the base `SEED_SQL` (run by `seedIfEmpty`) also inserts probation_items. This caused `seedManagerPortalDataIfMissing` to skip entirely on a clean production DB, leaving the `teams` table empty.

**How to apply:** When adding or reviewing a seed guard:
- Pick a table that is ONLY written by that function, not by any earlier seed
- `seedManagerPortalDataIfMissing` → check `teams` (fixed)
- `seedLdDemoDataIfMissing` → check `learning_log_entries` (correct — unique to L&D seed)
- `seedDemoProgressV2IfMissing` → check `assessments WHERE user_id IN (3, 4)` (correct)

**Recovery:** If seed data is missing from production, run the seed SQL directly via `psql "$PRODUCTION_DATABASE_URL"` — all seed inserts use `ON CONFLICT DO NOTHING` so they are safe to re-run.
