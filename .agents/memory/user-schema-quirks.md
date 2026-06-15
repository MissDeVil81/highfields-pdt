---
name: User schema quirks
description: Non-obvious type conventions in the User DB schema and generated API types
---

## isActive is stored as text "active" / "inactive"

The `users.isActive` column is `text`, not boolean. Default is `"active"`.

**Why:** Drizzle schema uses `text("is_active").notNull().default("active")`. OpenAPI spec declares it as `type: string`, so Orval generates it as `string`. At runtime the API returns `"active"` or `"inactive"`.

**How to apply:** Always check `user.isActive === "active"` (not `=== true` or `=== "true"`). When creating/updating send `"active"` or `"inactive"` as the string value.

## roles is an array, not a scalar

`users.roles` is `text[]` in Postgres. The generated `User` type has `roles: string[]`, not `role: string`.

**Why:** Multi-role design future-proofs for permission combinations.

**How to apply:** Use `user.roles.includes("manager")` or derive a primary role with `user.roles[0]`. Never access `user.role` — it does not exist on the type.

## email is nullable

`users.email` is declared `text("email").unique()` without `.notNull()`, so `email?: string | null`. Guard with `user.email ?? ""` before calling string methods.
