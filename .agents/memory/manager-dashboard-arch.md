---
name: Manager Dashboard Architecture
description: Key design decisions for the Manager Dashboard artifact at /manager/
---

**Route:** `/manager/` — separate React+Vite artifact (`artifacts/manager-dashboard`), blue primary theme to distinguish from career-tracker's gold.

**Identity:** No auth. Manager selects themselves from a list on first visit. Identity stored in `localStorage` key `manager_identity` as `{ id, name }` JSON via Zustand store (`hooks/useManagerStore.ts`).

**Users table (`lib/db/src/schema/users.ts`):**
- `roles text[]` defaults to `["employee"]`; managers have `"manager"` in their roles
- `managerId` links employees to their manager
- `sessionId` links an employee's user record to their career-tracker localStorage session
- Probation status has two live "currently on probation" values; see [probation status compatibility](probation-status-compatibility.md).

**Publish gate:** `publishedAt` on `probation_manager_reviews` controls employee visibility. `null` = draft (manager-only), set timestamp = published (employee can see manager assessment). The career-tracker app still needs to be updated to respect this field before showing manager data.

**Seeded sample data:**
- Managers: Sarah Johnson (id=1, 360 Division), James Williams (id=2, 180 Division)
- Employees: Alex Thompson, Emma Davies, Oliver Brown under Sarah; Charlotte Wilson, Harry Moore under James

**API routes:**
- `GET /api/users` — list users, supports `?managerId=` filter
- `GET /api/users/:id` — single user
- `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id` — CRUD
- `GET /api/manager/team?managerId=` — team members with review counts
- `GET /api/manager/dashboard-stats?managerId=` — summary stats
- `POST /api/probation/manager-reviews/publish` — set publishedAt
