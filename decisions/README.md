# Architecture Decision Records

Six ADRs cover the full architecture of Interface Manager. Read in order for a complete picture.

| ADR | Title | Summary |
|-----|-------|---------|
| [ADR-001](ADR-001-application-architecture.md) | Application Architecture | React SPA + Fastify REST API + PostgreSQL, Docker Compose, spec generation in-process, cloud tier strategy |
| [ADR-002](ADR-002-tech-stack.md) | Tech Stack | Node/TS/Fastify, Prisma (CRUD) + postgres.js (trace engine), Vite/React/Tailwind/shadcn, openapi3-ts |
| [ADR-003](ADR-003-database-schema.md) | Database Schema | 18-table schema — canonical model, systems, mappings, propagation chains, interfaces. UUID v7, workspace scoping |
| [ADR-004](ADR-004-api-design.md) | API Design | REST under `/api/v1/workspaces/:wId/`, full endpoint map, response shapes, error codes |
| [ADR-005](ADR-005-error-handling.md) | Error Handling | AppError hierarchy, global Fastify handler, Prisma + postgres.js error mapping, service-layer conventions |
| [ADR-006](ADR-006-backend-structure.md) | Backend Structure | Domain-grouped services (registry, mappings, interfaces, trace, export), workspace ownership middleware |
