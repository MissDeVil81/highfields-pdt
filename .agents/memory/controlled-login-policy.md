---
name: Controlled production logins
description: Production account access uses administrator-issued, one-time temporary passwords.
---

Production users must be provisioned by an administrator with a verified work email. A temporary password is generated server-side, returned to the administrator exactly once for private handover, and is never stored in the application database or audit data. Every temporary password requires a replacement before normal product APIs are available.

**Why:** The product must support controlled employee access without exposing permanent passwords or permitting public self-registration.

**How to apply:** Keep password generation and Clerk credential updates on the server; mount the password-change endpoint before the ordinary approved-user guard; make any new production-capable frontend respect the forced-password-change state before rendering product features.