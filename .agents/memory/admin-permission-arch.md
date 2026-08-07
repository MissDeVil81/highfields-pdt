---
name: Admin permission architecture
description: How the hierarchy/permissions system is structured — key decisions for future extension
---

## Structure

- `manager_id` on users IS the "Reports To" field (reused, not duplicated)
- Roles stored as `text[]` — "director" is just another string value, no DB change needed
- Permission tables: additional_user_permissions, additional_team_permissions (owner + target + type)
- Audit log: admin_user_id (who acted), affected_user_id (who was changed), action string, prev/new value

## Auth pattern

No real auth — admin identity stored in localStorage as `adminUserId`. All mutation API calls must include `x-requesting-user-id` header. API routes check this header and verify the user has `admin` in their roles array.

## Permission precedence

Admin → Self → Hierarchy (recursive via managerId chain) → Additional Edit → Additional View → No access

`getReportingSubtree(managerId, allUsers)` — BFS on the managerId column to find all indirect reports.

**Why:** Hierarchy must be recursive with no fixed depth. A single traversal function covers all levels.

## Circular hierarchy protection

`wouldCreateCycle(targetId, newManagerId, allUsers)` — walks up the chain from newManagerId. If it reaches targetId, it's a cycle. Applied server-side in PUT /users/:id before any update.

## DB push note

`drizzle-kit push` on this project has interactive prompts (email unique constraint warning). Use direct psql for new tables rather than fighting the interactive CLI.
