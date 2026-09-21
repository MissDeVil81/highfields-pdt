---
name: Path-routed Vite resources
description: Replit artifact path routing only forwards resources under each registered artifact path.
---

For path-routed Vite artifacts, development plugins must emit scripts and other resources under the artifact's registered base path. Root-scoped plugin resources can return proxy 502s even when the application page itself renders correctly.

**Why:** The Replit development banner plugin injects a root-scoped script, while managed artifact services forward only their configured paths.

**How to apply:** When adding or upgrading Vite plugins in a path-routed artifact, inspect generated HTML and verify every development-only resource is reachable through the artifact preview path.