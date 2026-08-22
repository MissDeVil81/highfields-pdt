---
name: Three-environment structure
description: How the Dev/Demo/Live environment separation works and what was built for it.
---

# Three-Environment Structure

## Architecture
- Three separate Replit repls (dev/demo/live) each with own DB — all share same GitHub repo.
- `APP_ENV` env var (`development | demo | production`) selects which DB URL to use.
- DB URL keys: `DEVELOPMENT_DATABASE_URL`, `DEMO_DATABASE_URL`, `PRODUCTION_DATABASE_URL`.
- `DATABASE_URL` is Replit runtime-managed and cannot be renamed/deleted. In development, falls back to `DATABASE_URL` if `DEVELOPMENT_DATABASE_URL` is not set (explicit warning logged).

## Key files
- `lib/db/src/env.ts` — exports typed `APP_ENV` constant, validates on import.
- `lib/db/src/index.ts` — selects DB URL by APP_ENV, dev-only fallback to DATABASE_URL.
- `lib/db/drizzle.config.ts` — APP_ENV-aware URL selection + `out: ./drizzle` for migrations.
- `artifacts/api-server/src/index.ts` — startup guard: exits if APP_ENV or DB URL missing.
- `artifacts/api-server/src/routes/env.ts` — `GET /api/env` → `{ appEnv }`.

## Environment banners
- Each frontend (career-tracker, admin-dashboard, manager-dashboard) has `EnvironmentBanner` component.
- Fetches `GET /api/env` on load; shows red banner (dev), amber banner (demo), or nothing (prod).
- Admin dashboard also has `LiveBadge` component (green "LIVE" pill in sidebar for production).
- Banner rendered at top of `App.tsx` in all three frontends, outside the router.

## Scripts
- `scripts/seed-config.mjs` — idempotent config seed (career paths, probation items, shared teams). Blocks against demo.
- `scripts/seed-live-admin.mjs` — interactive script to create initial admin user in production.
- `scripts/reset-demo.mjs` — wipes+reseeds demo DB. Requires `APP_ENV=demo` or hard-errors.
- `scripts/reset-dev.mjs` — wipes+reseeds dev DB. Requires `APP_ENV=development` or hard-errors.

## DB package scripts
- `push` — fast dev iteration (drizzle-kit push).
- `generate` + `migrate` — migration-based promotion path for demo and live.
- Migration output: `lib/db/drizzle/`.

## Current state (this dev repl)
- `APP_ENV=development` set as shared env var.
- `DEVELOPMENT_DATABASE_URL` not yet set by user; falls back to runtime `DATABASE_URL` with warning.
- Demo and Live repls don't exist yet — need to be forked and configured (Task 5).

**Why:** User declined to manually copy DATABASE_URL → DEVELOPMENT_DATABASE_URL, so the explicit fallback was added to keep the server running during transition.
