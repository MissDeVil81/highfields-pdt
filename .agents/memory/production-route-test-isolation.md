---
name: Production route-test isolation
description: Keep production-mode API authorization tests from inheriting a live database connection.
---

## Rule

When API tests intentionally run with `APP_ENV=production`, explicitly unset
`DATABASE_URL` and provide a closed local `PRODUCTION_DATABASE_URL`.

**Why:** Production database resolution prefers `DATABASE_URL`. Merely replacing
`PRODUCTION_DATABASE_URL` still allows an inherited, potentially live database
connection to win, which defeats isolation if a route begins querying before
its authorization guard denies access.

**How to apply:** Keep test fixtures in-process and make the test command use
`env -u DATABASE_URL` with a loopback URL on an unused port. This makes a
guard-order regression fail safely instead of touching production data.