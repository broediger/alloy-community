---
title: "ADR-006: Backend Structure"
status: Decided
date: 2026-03-13
tags:
  - interface-manager
  - backend
  - structure
  - adr
related:
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-001-application-architecture]]"
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-002-tech-stack]]"
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-005-error-handling]]"
---

# ADR-006: Backend Structure

## Status

Decided

---

## Decisions

### 1 — Workspace middleware

A Fastify `preHandler` hook validates the workspace exists on every route that carries `:workspaceId`. On success it attaches the workspace to `request.workspace` — route handlers access it without re-fetching.

Ownership is enforced in the middleware from day one. In MVP (single user, no auth) the check is a no-op stub. When auth is introduced post-MVP, the check is filled in without touching any route handler.

```typescript
app.addHook('preHandler', async (request, reply) => {
  const { workspaceId } = request.params as { workspaceId?: string }
  if (!workspaceId) return

  const workspace = await workspaceService.getWorkspace(workspaceId)
  if (!workspace) throw new NotFoundError('Workspace')

  // ownership check — no-op in MVP, enforced post-MVP when userId is on request
  // if (workspace.ownerId !== request.user.id) throw new ForbiddenError()

  request.workspace = workspace
})
```

TypeScript declaration merge adds `workspace` to the Fastify request type so handlers are fully typed.

---

### 2 — Folder structure: domain-grouped services

Services are grouped by domain, mirroring the three internal service layers from ADR-001 (Registry, Trace Engine, Spec Generator). Routes remain flat — one file per resource.

```
src/
  routes/
    workspaces.ts
    canonical-entities.ts
    canonical-fields.ts
    system-fields.ts
    systems.ts
    mappings.ts
    propagation-chains.ts
    interfaces.ts
    trace.ts
    export.ts
  services/
    registry/
      canonical-entities.ts
      canonical-fields.ts
      canonical-subfields.ts
      systems.ts
      system-entities.ts
      system-fields.ts
    mappings/
      mappings.ts
      transformation-rules.ts
      propagation-chains.ts
    interfaces/
      interfaces.ts
      interface-fields.ts
    trace/
      trace-engine.ts      ← postgres.js raw SQL, recursive CTEs
    export/
      openapi-generator.ts
      json-schema-generator.ts
      workspace-export.ts
  middleware/
    workspace.ts
  errors/
    index.ts               ← AppError subclasses
  lib/
    prisma.ts              ← Prisma client singleton
    sql.ts                 ← postgres.js client singleton
  plugins/
    error-handler.ts
    schema-error-formatter.ts
  app.ts
  server.ts
```

**Rationale for Option B over Option A (route-mirrored):**
- Mirrors ADR-001 architecture — Registry, Trace Engine, Spec Generator are proper isolated modules
- Shared logic (e.g. coverage calculation used by both registry and systems) lives naturally inside a domain folder
- Trace engine and export are isolated from the start — cleaner boundary for the postgres.js / Prisma split

---

## Consequences

- Every route with `:workspaceId` gets workspace validation and ownership check for free — no per-handler boilerplate
- Adding auth post-MVP requires filling in one stub in `middleware/workspace.ts` — no route changes
- `trace-engine.ts` is the only file that uses postgres.js — the Prisma / raw SQL boundary is enforced by file structure
- New resources are added by creating a route file in `routes/` and a service file in the appropriate domain folder
