---
title: "ADR-005: Error Handling"
status: Decided
date: 2026-03-13
tags:
  - interface-manager
  - error-handling
  - adr
related:
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-002-tech-stack]]"
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-004-api-design]]"
---

# ADR-005: Error Handling

## Status

Decided

---

## Context

Error handling spans three layers: request validation (Fastify schema), service-layer business rules, and database errors (Prisma + postgres.js). All errors must serialise to the consistent wire format defined in ADR-004.

---

## Decisions

### 1 — Two-layer validation

- **Fastify JSON Schema** validates request shape (required fields, types, enum values)
- **Service layer** validates business rules that cannot be expressed in JSON Schema (e.g. `systemFieldId` required unless `ruleType` is COMPOSE or DECOMPOSE)

Both produce `ValidationError` — same wire format, different trigger point.

---

### 2 — Custom error class hierarchy

All application errors extend `AppError`. The global Fastify error handler checks `instanceof AppError` and serialises accordingly.

```typescript
class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown[]
  ) {
    super(message)
  }
}

class ValidationError extends AppError {
  constructor(details: { field: string; message: string }[]) {
    super('VALIDATION_ERROR', 'Request body is invalid', 400, details)
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

class DeleteConflictError extends AppError {
  constructor(message: string, details: { type: string; count: number }[]) {
    super('DELETE_CONFLICT', message, 409, details)
  }
}

class ReferenceNotFoundError extends AppError {
  constructor(resource: string) {
    super('REFERENCE_NOT_FOUND', `Referenced ${resource} does not exist`, 400)
  }
}
```

---

### 3 — Global error handler

Single Fastify error handler covers all layers. Service methods throw — route handlers have no try/catch.

```typescript
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // parse error.meta.target for specific field message, fall back to generic
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: 'A record with this value already exists' }
        })
      case 'P2003':
        return reply.status(409).send({
          error: { code: 'DELETE_CONFLICT', message: 'Cannot delete — record has dependents' }
        })
      case 'P2025':
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Record not found' }
        })
      case 'P2014':
        return reply.status(400).send({
          error: { code: 'REFERENCE_NOT_FOUND', message: 'Referenced record does not exist' }
        })
      default:
        break
    }
  }

  request.log.error(error)
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  })
})
```

---

### 4 — Prisma error mapping

| Prisma code | Situation | HTTP | Code |
|-------------|-----------|------|------|
| `P2002` | Unique constraint violation | 409 | `CONFLICT` |
| `P2003` | FK constraint failed on delete | 409 | `DELETE_CONFLICT` |
| `P2025` | Record not found | 404 | `NOT_FOUND` |
| `P2014` | Relation violation | 400 | `REFERENCE_NOT_FOUND` |

P2002 and P2003 messages are specific where possible — `error.meta.target` is parsed to name the conflicting field. Falls back to a generic message if meta is unparseable.

---

### 5 — Fastify schema error formatter

Fastify's default validation error format is remapped to `ValidationError` via a custom `schemaErrorFormatter`:

```typescript
const app = fastify({
  schemaErrorFormatter: (errors, dataVar) => {
    return new ValidationError(
      errors.map(e => ({
        field: e.instancePath.replace('/', '') || e.params?.missingProperty,
        message: e.message
      }))
    )
  }
})
```

---

### 6 — Service layer conventions

Service methods throw `AppError` subclasses directly. Route handlers contain no try/catch — all errors bubble to the global handler.

Business rule violations are thrown before database calls:

```typescript
async function createMapping(workspaceId: string, body: CreateMappingBody) {
  const isComposeDecompose = body.ruleType === 'COMPOSE' || body.ruleType === 'DECOMPOSE'
  if (!isComposeDecompose && !body.systemFieldId) {
    throw new ValidationError([{
      field: 'systemFieldId',
      message: 'required unless ruleType is COMPOSE or DECOMPOSE'
    }])
  }
}
```

---

### 7 — postgres.js error handling (trace engine)

The trace engine uses raw SQL via postgres.js. A thin `mapPostgresError` boundary wraps trace queries and maps PostgreSQL error codes to `AppError` before re-throwing. Unmapped errors are re-thrown as-is and caught by the global handler as 500.

```typescript
function mapPostgresError(error: unknown): never {
  if (error instanceof postgres.PostgresError) {
    if (error.code === '23503') throw new ReferenceNotFoundError('field')
    if (error.code === '23505') throw new ConflictError('Duplicate record')
  }
  throw error
}
```

The trace engine is read-only (`SELECT` only) — constraint errors are a safety net, not an expected code path.

---

## Consequences

- Route handlers are thin — no error handling logic, only service calls and replies
- All error shapes are guaranteed by the global handler — no risk of inconsistent formats from individual handlers
- Prisma and postgres.js errors are handled in one place — adding a new error mapping requires a single change
- Service-layer business rule validation is explicit and testable independently of HTTP concerns
