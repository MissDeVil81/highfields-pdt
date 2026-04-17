# Career Progression Tracker

## Overview

A full-stack career promotion readiness tool for a 360° recruitment company. Employees pick a career path and current role, self-assess competencies using red/amber/green (RAG) ratings, then pick a target role and build evidence against competencies to demonstrate readiness for promotion. No authentication — sessions are identified by a UUID in localStorage.

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
- `career_paths` — 3 career tracks
- `roles` — 39 total roles across all 3 paths, each with a level and job spec
- `competencies` — Competencies per role, grouped by category
- `assessments` — User RAG ratings per competency (keyed by sessionId)
- `evidence` — Evidence entries per competency for target role (keyed by sessionId)

### Session Management
- Sessions are identified by a UUID stored in localStorage (no authentication required)
- Current role, target role, and career path selections are persisted in localStorage via Zustand

## Seeded Data

3 career paths:
1. **360 Career Path** — 14 roles (Perm + Contract variants), 35–63 competencies per role. Source: xlsx sheets named "XXX 360"
2. **180 Delivery Career Path** — 14 roles (Perm + Contract variants), 24–53 competencies per role. Source: xlsx sheets named "XXX 180 D"
3. **Account Management Career Path** — 11 roles, competencies not yet loaded (user to provide data later)

Competency data sourced from: `attached_assets/Recruitment_Role_Profiles_2026_Final_1776421603221.xlsx`

### Notes on xlsx mapping
- Sheets with "360" → 360 Career Path (both Perm and Contract variants share same competencies)
- Sheets with "180 D" → 180 Delivery Career Path (both Perm and Contract share same competencies)
- "Specialist Recruiter 180 D" and "Team Leader 180 S" sheets exist but have no matching role in DB
- "Associate Director 180 D" sheet does not exist — those roles have 0 competencies
- Account Management sheets in xlsx are incomplete — to be loaded later

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
