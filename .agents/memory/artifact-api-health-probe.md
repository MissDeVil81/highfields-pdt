---
name: Artifact API health probe
description: The artifact publisher may probe the API mount root even with a custom health path configured.
---

The API health router must serve the readiness response at both `/api/healthz` and the API artifact mount root (`/api`).

**Why:** Artifact publishing probed `/api` during promotion despite the configured `/api/healthz` startup path, causing a failed publish while the application build itself succeeded.

**How to apply:** Keep the mount-root readiness route whenever changing API health routing or its artifact configuration, and verify both URLs return HTTP 200 before publishing.