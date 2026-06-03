---
name: E2E test localStorage limitation
description: The testing subagent's browser context does not persist localStorage across hard reloads.
---

## Rule

Do not write E2E tests that verify data persistence across a hard page reload (Ctrl+F5). The testing subagent opens fresh browser contexts where localStorage is not preserved between loads.

**Why:** The test browser starts fresh each time. Zustand's session store (sessionId in localStorage) generates a new UUID on each fresh context, so saved data is keyed to a different sessionId after reload.

**How to apply:** Test persistence by navigating *within the SPA* (away and back) — this tests TanStack Query cache and the re-init logic without relying on localStorage. Persistence across full browser restart is an infrastructure concern, not a test concern here.
