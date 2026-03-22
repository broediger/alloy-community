# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Phase 1 scaffold (T-001 through T-003) is complete. Phase 2+ feature implementation is next. See `implementation/TASKS.md` for all 32 tasks across 10 phases.

## Commands

All commands run from the repo root using npm workspaces.

- **Backend dev**: `npm run dev:backend` (runs `tsx watch`)
- **Frontend dev**: `npm run dev:frontend` (runs Vite dev server with API proxy to :3000)
- **Build all**: `npm run build`
- **Docker**: `docker compose up` (backend :3000, frontend :80, db :5432)
- **Docker rebuild**: `docker compose up --build -d` (rebuild images after code changes)
- **Backend tests**: `npm run test:backend` (Vitest + Supertest)
- **Frontend tests**: `npm run test:frontend` (Vitest + RTL)
- **Single test**: `npx -w backend vitest run src/path/to.test.ts` or `npx -w frontend vitest run src/path/to.test.tsx`
- **Type check**: `npm run lint` (runs `tsc --noEmit` in both workspaces)
- **Prisma migrate**: `npm run db:migrate` (runs `prisma migrate dev` in backend)
- **Prisma generate**: `npm run db:generate`
- **Prisma studio**: `npx -w backend prisma studio`

## Architecture

**Interface Manager** is a field mapping and spec generation tool. It maintains a canonical model (system-neutral field definitions) and maps those fields to/from system-specific representations across multiple integrations.

### Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript + Fastify |
| ORM (CRUD) | Prisma |
| DB Access (Trace) | postgres.js (raw SQL only) |
| Database | PostgreSQL 16 |
| Frontend | Vite + React + TypeScript + TanStack Query + React Router v7 |
| UI | Tailwind CSS + shadcn/ui |
| Graph Viz | React Flow |
| Spec Gen | openapi3-ts + js-yaml |
| Testing | Vitest + Supertest (backend), Vitest + RTL (frontend), Playwright (E2E) |

### Monorepo Layout

```
/
├── backend/src/
│   ├── routes/          # One file per resource (e.g., mappings.ts)
│   ├── services/
│   │   ├── registry/    # Prisma-based CRUD services
│   │   ├── mappings/    # Mapping + transformation rule services
│   │   ├── interfaces/  # Interface + interface-field services
│   │   ├── trace/       # trace-engine.ts — postgres.js raw SQL only
│   │   └── export/      # OpenAPI/JSON Schema/workspace export generators
│   ├── middleware/      # workspace.ts — validates workspace + attaches to request
│   ├── errors/          # AppError subclass hierarchy
│   ├── lib/             # prisma.ts + sql.ts singletons
│   ├── plugins/         # error-handler.ts + schema-error-formatter.ts
│   ├── app.ts           # Fastify app factory
│   └── server.ts        # Entry point
└── frontend/src/
    └── lib/api.ts       # Fetch wrapper to backend
```

### Three Internal Services

1. **Registry Service** — CRUD for canonical fields, systems, entities, mappings (via Prisma)
2. **Trace Engine** — Recursive CTE graph traversal + conflict detection (via postgres.js raw SQL, single round-trip)
3. **Spec Generator** — In-process OpenAPI 3.0, JSON Schema, AsyncAPI generation

### Key Domain Concepts

- **Workspace**: Top-level container. All tables carry `workspace_id`; middleware enforces ownership.
- **Canonical Field**: System-neutral field definition (the source of truth). May have sub-fields (max 2 levels deep; sub-fields cannot be composite).
- **System / System Entity / System Field**: A connected application's data model.
- **Mapping**: Canonical ↔ system field relation with a transformation rule (rename, value_map, compose, decompose).
- **Propagation Chain**: Ordered steps showing how a value flows within a single system across entities.
- **Interface**: Directed contract (source system → target system) selecting a set of canonical fields.

### Database

21 tables across 8 domains (includes 3 versioning tables from T-033). Prisma schema lives at `backend/prisma/schema.prisma`.

- All IDs are UUID v7 (time-ordered)
- `workspace_id` on every table
- Interface field resolution happens at **read time** (derived from mappings, not stored) to avoid sync drift
- `canonicalFieldId` XOR `canonicalSubfieldId` is an exact-one constraint enforced at the application layer

### API Conventions

All routes are namespaced under `/api/v1/workspaces/:workspaceId/`.

- Response shape: single resource → bare object; list → `{ items: [], total: N }`
- Error shape: `{ error: { code, message, details? } }`
- Field names: camelCase; dates: ISO 8601 UTC; nullable fields always present as `null`
- Error codes: `VALIDATION_ERROR`, `REFERENCE_NOT_FOUND` (400), `NOT_FOUND` (404), `CONFLICT` / `DELETE_CONFLICT` (409), `INTERNAL_ERROR` (500)

### Error Handling Pattern

- Route handlers do **not** use try/catch — they throw `AppError` subclasses from service layer
- Global Fastify error handler serializes `AppError` and maps Prisma error codes (P2002, P2003, P2025, P2014)
- postgres.js errors are wrapped by a `mapPostgresError()` helper before reaching the global handler
- Two-layer validation: Fastify JSON Schema (request shape) + service layer (business rules)

## Key Documents

- `requirements.md` — vision, personas, MVP scope, open decisions
- `decisions/` — 6 ADRs covering architecture, tech stack, schema, API, error handling, backend structure
- `implementation/TASKS.md` — 32 tasks across 10 phases with acceptance criteria
- `implementation/prisma-schema.prisma` — complete database schema
