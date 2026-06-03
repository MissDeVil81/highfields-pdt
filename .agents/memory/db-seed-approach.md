---
name: DB seed approach for this project
description: How to run one-off seed scripts — scripts/ package can't directly import @workspace/db due to drizzle-orm not hoisting properly.
---

## Rule

For seeding data, prefer direct `psql "$DATABASE_URL" << 'EOF' ... EOF` SQL inserts rather than tsx scripts in scripts/.

**Why:** The `scripts/` package doesn't have `drizzle-orm` as a direct dependency, only via `@workspace/db`. tsx can't resolve the transitive dependency. Adding drizzle-orm explicitly to scripts/ works, but is messier than just using psql for seed data.

**How to apply:** Use `psql "$DATABASE_URL"` with a heredoc for any one-off seed insert. For repeatable seeds, add `drizzle-orm` explicitly to scripts/dependencies in addition to `@workspace/db`.
