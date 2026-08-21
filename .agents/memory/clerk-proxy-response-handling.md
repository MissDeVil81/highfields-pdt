---
name: Clerk proxy response handling
description: Production Clerk proxy requirements for deployment-edge-safe responses.
---

Use the maintained Clerk proxy middleware response behavior: strip hop-by-hop headers and buffer proxy responses that do not have a content length before forwarding them.

**Why:** Replit's deployment edge can reject chunked responses from the Clerk Frontend API proxy and surface them as HTTP 500 responses, even though the upstream response was successful.

**How to apply:** When changing authentication proxy code, re-sync it with the Clerk setup template rather than simplifying its response handling. Keep the API liveness route separate from the proxy and verify production-style startup locally.