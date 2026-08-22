# Environment Guide

## Overview

The Personal Development Tool runs on three separate environments:

| Environment | Purpose | Banner | Database |
|-------------|---------|--------|----------|
| **Development** | Building and testing new features | Red — "DEVELOPMENT ENVIRONMENT" | `DEVELOPMENT_DATABASE_URL` |
| **Demo** | Polished demonstration and training | Amber — "DEMO ENVIRONMENT" | `DEMO_DATABASE_URL` |
| **Live** | Real employee use | None (small "LIVE" pill in admin) | `PRODUCTION_DATABASE_URL` |

Each environment runs the **same codebase** from the same GitHub repository. They differ only in their secrets and which database they connect to.

---

## Environment Variables Required Per Environment

Replit automatically injects `DATABASE_URL` for every repl's built-in Postgres database. In a normal fork-based setup **you only need to set `APP_ENV`** — each forked repl already has its own isolated database.

The env-specific secrets (`DEVELOPMENT_DATABASE_URL`, `DEMO_DATABASE_URL`, `PRODUCTION_DATABASE_URL`) are optional overrides, useful only if you want to point a repl at an external or shared database.

### Development repl
```
APP_ENV=development          ← required
# DATABASE_URL               ← auto-injected by Replit
SESSION_SECRET=<random>      ← required
```

### Demo repl
```
APP_ENV=demo                 ← required
# DATABASE_URL               ← auto-injected by Replit (fresh DB in the fork)
SESSION_SECRET=<random>      ← required
```

### Live repl
```
APP_ENV=production           ← required
# DATABASE_URL               ← auto-injected by Replit (fresh DB in the fork)
SESSION_SECRET=<random>      ← required
```

> **Isolation comes from forking, not from copying secrets.** Each Replit repl provisions its own completely separate Postgres database — the `DATABASE_URL` in the Demo repl will never be the same value as the one in the Dev repl. No manual copying of connection strings is needed.

> **How to find your DATABASE_URL value** (needed only if you want to set the override): run `echo $DATABASE_URL` in the repl's Shell tab.

---

## Workflow: Building a New Feature

```
1. Build the feature in the Development repl (this repl).
2. Test thoroughly against the development database.
3. Commit and push to GitHub (git push origin dev).
4. In the Demo repl: git pull origin dev, restart server, verify with demo data.
5. Once approved: merge dev → main in GitHub.
6. In the Live repl: git pull origin main, restart server.
```

---

## Database Migration Process

Schema changes should follow the same promotion flow.

### Generating a migration

From the Development repl:
```bash
# Generate migration files from current schema changes
DEVELOPMENT_DATABASE_URL=$DEVELOPMENT_DATABASE_URL APP_ENV=development \
  pnpm --filter @workspace/db run generate

# Apply to development database
DEVELOPMENT_DATABASE_URL=$DEVELOPMENT_DATABASE_URL APP_ENV=development \
  pnpm --filter @workspace/db run migrate
```

Migration files are saved to `lib/db/drizzle/` and committed to Git.

### Applying to Demo

From the Demo repl (after pulling the latest code containing the migration files):
```bash
DEMO_DATABASE_URL=$DEMO_DATABASE_URL APP_ENV=demo \
  pnpm --filter @workspace/db run migrate
```

### Applying to Live

From the Live repl:
```bash
PRODUCTION_DATABASE_URL=$PRODUCTION_DATABASE_URL APP_ENV=production \
  pnpm --filter @workspace/db run migrate
```

> **Never use `push` or `push-force` against Demo or Live.** Only use `migrate` with reviewed migration files.

---

## Setting Up a Fresh Live Environment

After forking the repl and setting secrets:

```bash
# 1. Apply schema to the live database
PRODUCTION_DATABASE_URL=$PRODUCTION_DATABASE_URL APP_ENV=production \
  pnpm --filter @workspace/db run push

# 2. Seed system configuration (career paths, roles)
DATABASE_URL=$PRODUCTION_DATABASE_URL node scripts/seed-config.mjs

# 3. Create the initial admin user (interactive)
DATABASE_URL=$PRODUCTION_DATABASE_URL node scripts/seed-live-admin.mjs

# 4. Start the server — it will NOT seed demo users in production
```

---

## Demo Reset

To restore the demo environment to its standard state (admin-only):

```bash
# From the Demo repl only
DEMO_DATABASE_URL=$DEMO_DATABASE_URL APP_ENV=demo node scripts/reset-demo.mjs
```

This is guarded: the script refuses to run unless `APP_ENV=demo`.
After running, restart the demo API server — it will re-seed all demo data on startup.

---

## Development Reset

To wipe and reseed the development database:

```bash
# From the Development repl only
DEVELOPMENT_DATABASE_URL=$DEVELOPMENT_DATABASE_URL APP_ENV=development \
  node scripts/reset-dev.mjs
```

Guarded: refuses to run unless `APP_ENV=development`. After running, restart the API server.

---

## Data Classification

### System Configuration (safe to copy across environments)
- `career_paths` — recruitment career tracks
- `roles` — job levels within each career path
- `competencies` — behavioural competency frameworks
- `financial_targets` — quota/billing target templates
- `probation_items` — standard probation checklist items

### User Data (must NOT move between environments)
- `users`, `user_teams`, `teams`
- `assessments`, `evidence`
- `probation_assessments`, `probation_reflections`, `probation_actions`, `probation_action_evidence`, `probation_manager_reviews`
- `financial_progress`
- `additional_user_permissions`, `additional_team_permissions`
- `audit_log`

---

## Live Backup and Recovery

Replit-provisioned PostgreSQL databases (Core/Pro plans) include:

- **Automated backups**: Point-in-time recovery via the Replit database dashboard
- **Storage limit**: 10 GiB per production database
- **Recovery**: Contact Replit support or use the database restore option in the workspace

**Recommendations:**
- Before any significant migration, take a manual backup using `pg_dump`:
  ```bash
  pg_dump $PRODUCTION_DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```
- Store this backup in a secure location (not in the repl itself).
- Test the restore process in the Development environment before relying on it.

---

## Secrets Summary

Never store database credentials in application code. All secrets are managed via Replit Secrets in each repl. A secret in the Development repl is not visible to the Demo or Live repls.

| Secret | Dev | Demo | Live |
|--------|-----|------|------|
| `APP_ENV` | `development` | `demo` | `production` |
| `DEVELOPMENT_DATABASE_URL` | ✅ | ❌ absent | ❌ absent |
| `DEMO_DATABASE_URL` | ❌ absent | ✅ | ❌ absent |
| `PRODUCTION_DATABASE_URL` | ❌ absent | ❌ absent | ✅ |
| `SESSION_SECRET` | own value | own value | own value |
