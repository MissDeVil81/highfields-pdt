---
name: Artifact API health probe
description: The artifact publisher may probe the API mount root even with a custom health path configured.
---

The API must expose an unauthenticated liveness response at the API artifact mount root (`/api`) before global Clerk middleware; readiness remains at `/api/healthz`.

**Why:** Artifact publishing probed `/api` during promotion despite the configured `/api/healthz` startup path, and a route behind global authentication can fail before the handler is reached.

**How to apply:** Keep `/api` ahead of authentication and database startup, keep database/seed readiness on `/api/healthz`, and verify both URLs return HTTP 200 before publishing.