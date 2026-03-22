---
title: "ADR-002: Tech Stack"
status: Decided
date: 2026-03-13
tags:
  - interface-manager
  - tech-stack
  - adr
related:
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-001-application-architecture]]"
  - "[[30-projects/10-ideas/interface-manager/requirements]]"
---

# ADR-002: Tech Stack

## Status

Decided

---

## Context

Tech stack decisions following the architecture decisions in ADR-001. Requirements: self-hosted Docker deployment, TypeScript across the stack, PostgreSQL database, REST API, React frontend with graph visualisation for the trace view, spec generation for OpenAPI and JSON Schema.

---

## Decisions

### 1 — Backend: Node.js + TypeScript + Fastify

**Decided:** Node.js + TypeScript + Fastify

**Rationale:**
- Single language across the full stack — TypeScript types shared between frontend and backend. The canonical field schema defined once, consumed everywhere.
- Fastify's built-in JSON Schema validation is directly relevant — the tool works with schemas; the framework validates against them natively.
- More modern and performant than Express without the ceremony of NestJS.

**Rejected:**
- Python + FastAPI — valid choice but splits the stack without a compelling reason.
- NestJS — opinionated structure adds ceremony that isn't justified at this scale.

---

### 2 — Database Access: Prisma + postgres.js (split approach)

**Decided:** Prisma for CRUD operations on the registry; postgres.js for the trace engine.

**Rationale:**
- Prisma handles the 90% of queries that are standard relation lookups — canonical fields, systems, entities, mappings. Schema-first, fully typed, migration support.
- The trace engine queries are recursive CTEs that walk the mapping graph. Writing these explicitly in postgres.js is cleaner and more maintainable than coaxing an ORM to generate them.
- The split adds cognitive overhead but is worth it — the trace engine is the most performance-sensitive part of the application and benefits from explicit SQL.

**Rejected:**
- Drizzle only — would handle both layers adequately but the recursive CTE queries are cleaner in raw SQL.
- Prisma only — recursive graph traversal via Prisma requires workarounds that obscure the query intent.
- Raw SQL only — unnecessary maintenance burden for standard CRUD.

---

### 3 — Frontend: Vite + React + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Flow

**Decided:**

| Concern | Technology |
|---------|-----------|
| Framework | Vite + React + TypeScript |
| UI components | Tailwind CSS + shadcn/ui |
| Server state | TanStack Query |
| Routing | React Router v7 |
| Graph visualisation | React Flow |

**Rationale:**
- **Vite + React:** No SSR requirement, no SEO requirement. Vite is fast and unopinionated — full control over project structure. Next.js and Remix add complexity with no benefit for a tool app behind a login.
- **Tailwind + shadcn/ui:** Components are copied into the project, not installed as a dependency — full ownership, no version lock-in. Critical for the custom trace view and mapping UI components that don't exist in any component library.
- **TanStack Query:** The application is data-heavy with many related entities. TanStack Query handles caching, background refetch, and loading/error states without Redux overhead.
- **React Flow:** The relation trace (FR-6) is a directed graph. React Flow is purpose-built for this — building the trace view as a table first and rebuilding it as a graph later is wasted effort. The trace view is the flagship UI feature and should be built correctly from the start.

**Rejected:**
- Next.js / Remix — SSR overhead with no benefit.
- MUI / Ant Design — opinionated styling, harder to customise for custom components.
- D3.js — maximum flexibility, excessive complexity for a graph that React Flow handles natively.

---

### 4 — Spec Generation: openapi3-ts + js-yaml, native JSON Schema

**Decided:**

| Output | Approach |
|--------|---------|
| OpenAPI 3.0 | openapi3-ts + js-yaml |
| JSON Schema | Native — plain object construction, no library |
| AsyncAPI | Deferred — hand-built when needed |

**Rationale:**
- **openapi3-ts:** Type safety on the spec structure matters — a malformed OpenAPI output is silent without it. Compile-time errors beat runtime surprises in a tool whose primary output is spec files.
- **JSON Schema native:** JSON Schema is a plain object. A library adds a dependency for something that is straightforward to build directly from canonical field type definitions.
- **AsyncAPI deferred:** AsyncAPI export is post-MVP. No dependency for something not yet in scope — evaluate @asyncapi/generator when the feature is prioritised.

---

### 5 — Testing: Vitest + React Testing Library + Playwright + Supertest

**Decided:**

| Layer | Tool |
|-------|------|
| Backend unit + integration | Vitest + Supertest |
| Frontend unit + integration | Vitest + React Testing Library |
| E2E | Playwright |

**Rationale:**
- **Vitest throughout:** Same test runner across frontend and backend — consistent configuration, no context switching. Faster than Jest, TypeScript-native.
- **Playwright:** Interface Manager will eventually generate Playwright test stubs as part of code generation. Using it internally is a credible dogfood signal and keeps the team familiar with what clients will consume.
- **Supertest:** Standard for testing Fastify HTTP handlers directly without a running server. Clean Vitest integration.

---

## Full Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend framework | Node.js + TypeScript + Fastify |
| ORM (CRUD) | Prisma |
| Database access (trace engine) | postgres.js |
| Database | PostgreSQL |
| Frontend framework | Vite + React + TypeScript |
| UI components | Tailwind CSS + shadcn/ui |
| Server state | TanStack Query |
| Routing | React Router v7 |
| Graph visualisation | React Flow |
| OpenAPI generation | openapi3-ts + js-yaml |
| JSON Schema generation | Native |
| Backend testing | Vitest + Supertest |
| Frontend testing | Vitest + React Testing Library |
| E2E testing | Playwright |
| Container | Docker + Docker Compose |
| Auth (post-MVP) | TBD — Better Auth or Lucia |
