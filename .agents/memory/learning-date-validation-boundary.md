---
name: Learning-date validation boundary
description: How shared learning-date validation crosses the DB and API package boundary
---

The database schema package uses Zod 4 while the API package currently uses Zod 3. Share pure validation functions and error messages across that boundary, then compose native Zod schemas inside each consumer package instead of passing schema objects between packages.

**Why:** Zod 3 and Zod 4 schema instances are not type-compatible. The workspace also resolves shared DB declarations from generated output during API typechecking, so new schema exports are invisible until the DB package declaration build is run.

**How to apply:** When changing shared DB schema exports, run the DB package TypeScript declaration build before API typechecking. Keep API route schemas native to the API's Zod version and test both the shared predicate and the resulting HTTP boundary.