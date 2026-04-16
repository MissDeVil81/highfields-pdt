# Career Progression Tracker

## Overview

A full-stack career promotion readiness tool. Employees pick a career path and current role, self-assess competencies using red/amber/green ratings, then pick a target role and build evidence against competencies to demonstrate readiness for promotion.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (wouter router, TanStack Query, shadcn/ui)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **State**: Zustand (session persistence in localStorage)

## Artifacts

- `artifacts/career-tracker` — React + Vite frontend (served at `/`)
- `artifacts/api-server` — Express API server (served at `/api`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## App Structure

### Pages
- `/` — Setup: pick career path and current role
- `/current-role` — Self-assessment: job spec + competency ratings (red/amber/green)
- `/target-role` — Target role selection + evidence recording + competency ratings
- `/summary` — Readiness dashboard comparing current vs target role

### Database Schema
- `career_paths` — Career tracks (Engineering, Product Management, HR, etc.)
- `roles` — Roles within a path, each with a level and job spec
- `competencies` — Competencies per role, grouped by category
- `assessments` — User RAG ratings per competency (keyed by sessionId)
- `evidence` — Evidence entries per competency for target role (keyed by sessionId)

### Session Management
- Sessions are identified by a UUID stored in localStorage (no authentication required)
- Current role, target role, and career path selections are persisted in localStorage via Zustand

## Seeded Data

3 career paths pre-seeded:
- **Engineering**: Junior SE → Software Engineer → Senior SE → Staff Engineer
- **Product Management**: Associate PM → PM → Senior PM
- **People & HR**: HR Coordinator → HR Business Partner

Each role has 5-8 competencies grouped by category.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
