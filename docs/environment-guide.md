# Environment Guide

## Overview

The Personal Development Tool runs on three separate environments:

| Environment | Purpose | Banner | Database |
|-------------|---------|--------|----------|
| **Development** | Building and testing new features | Red — "DEVELOPMENT ENVIRONMENT" | `DEVELOPMENT_DATABASE_URL` |
| **Demo** | Polished demonstration and training | Amber — "DEMO ENVIRONMENT" | `DEMO_DATABASE_URL` |
| **Live** | Real employee use | None (small "LIVE" pill in admin) | Replit `DATABASE_URL` (or `PRODUCTION_DATABASE_URL` fallback) |

Each environment runs the **same codebase** from the same GitHub repository. They differ only in their secrets and which database they connect to.

---

## Environment Variables Required Per Environment

### How database isolation works

The API server (`lib/db/src/index.ts`) enforces strict isolation: each environment **must** have its own explicit database secret set. If the required secret is absent the server refuses to start, preventing accidental cross-environment writes.

| APP_ENV | Required secret | Production fallback |
|---------|----------------|---------------------|
| `development` | `DEVELOPMENT_DATABASE_URL` | — (none) |
| `demo` | `DEMO_DATABASE_URL` | — (none) |
| `production` | `DATABASE_URL` (runtime-injected by Replit) | `PRODUCTION_DATABASE_URL` |

> **Isolation comes from forking, not from copying secrets.** Each Replit repl provisions its own completely separate Postgres database. Fork the repl for each environment, then set `APP_ENV` and the matching `*_DATABASE_URL` secret to that repl's own `DATABASE_URL` value. The databases are then physically separate and there is no risk of cross-environment writes.
>
> **How to find your DATABASE_URL value**: run `echo $DATABASE_URL` in the repl's Shell tab.

### Development repl
```
APP_ENV=development                        ← required
DEVELOPMENT_DATABASE_URL=<this repl's DB>  ← required (copy from echo $DATABASE_URL)
SESSION_SECRET=<random>                    ← required
```

### Demo repl
```
APP_ENV=demo                               ← required
DEMO_DATABASE_URL=<demo repl's own DB>     ← required (copy from echo $DATABASE_URL in the demo repl)
SESSION_SECRET=<random>                    ← required
```

### Live repl
```
APP_ENV=production                         ← required
# DATABASE_URL is auto-injected by Replit in the production container (Cloud Run)
PRODUCTION_DATABASE_URL=<live repl's DB>   ← required for non-Cloud-Run startup
SESSION_SECRET=<random>                    ← required
```

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
