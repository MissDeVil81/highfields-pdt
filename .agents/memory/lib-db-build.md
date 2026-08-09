---
name: lib/db build requirement
description: When new schema tables are added to lib/db, TypeScript project references require rebuilding declarations before dependent packages (api-server) can see them.
---

When new files are added to `lib/db/src/schema/` and exported from `schema/index.ts`, the api-server typecheck will fail with "has no exported member" until the lib/db declarations are rebuilt.

**Rule:** After any schema addition, run:
```
pnpm --filter @workspace/db exec tsc -p tsconfig.json
```

**Why:** lib/db uses `composite: true` + `emitDeclarationOnly: true` with `outDir: dist`. TypeScript project references resolve exports through the compiled declarations in `dist/`, not the source. Without rebuilding, the new exports are invisible to consumers.

**How to apply:** Run this any time lib/db/src/schema is changed. Note that lib/db has no "build" npm script — use the raw `tsc` invocation.
