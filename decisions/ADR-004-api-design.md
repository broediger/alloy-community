---
title: "ADR-004: API Design"
status: Decided
date: 2026-03-13
tags:
  - interface-manager
  - api
  - rest
  - adr
related:
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-001-application-architecture]]"
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-002-tech-stack]]"
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-003-database-schema]]"
---

# ADR-004: API Design

## Status

Decided

---

## Context

Interface Manager exposes a REST API under `/api/v1/`. The API is a first-class citizen from day one — CLI tooling, VS Code extension, and PowerForge integration will consume the same API as the UI. All design decisions apply to the MVP scope.

---

## Structural Decisions

### 1 — Workspace scoping in path

All workspace-scoped resources are nested under `/api/v1/workspaces/:workspaceId/`. The workspace ID is explicit in the URL, not resolved from middleware or a header.

**Rationale:** Makes requests self-contained and easy to test. Middleware-based resolution is premature without auth in MVP.

---

### 2 — Flat resources with filters, shallow nesting where it adds value

Resources are flat under the workspace path, scoped by query parameters. Exceptions where nesting adds clear semantic value:

| Nested | Rationale |
|--------|-----------|
| `systems/:sId/entities` | Entities only exist in the context of a system |
| `systems/:sId/relationships` | Relationships are scoped to a system |
| `canonical-fields/:fId/subfields` | Subfields only exist on composite fields |
| `canonical-fields/:fId/examples` | Tightly owned by parent field |
| `canonical-fields/:fId/enum-values` | Tightly owned by parent field |
| `mappings/:mId/rule` | 1:1 with mapping, managed as a sub-resource |
| `propagation-chains/:cId/steps` | Steps only exist in the context of a chain |
| `interfaces/:iId/fields` | Interface fields are tightly owned by the interface |

System fields are **flat** (`/system-fields?entityId=`) to avoid 4-level deep nesting under `/systems/:sId/entities/:eId/fields`.

---

### 3 — Inline vs. separate requests

Detail responses inline tightly related child data to avoid unnecessary roundtrips. List responses stay lean with summary counts only.

| Resource | List includes | Detail includes |
|----------|--------------|-----------------|
| Workspaces | `canonicalFieldCount`, `systemCount`, `interfaceCount` | Full fields |
| Canonical entities | `fieldCount`, `mappedFieldCount` | Full fields |
| Canonical fields | `mappingCount` | + `subfields[]`, `examples[]`, `enumValues[]` |
| Systems | `canonicalFieldCount`, `mappedFieldCount` | + `entities[]` with coverage counts |
| System entities | Summary | + `fields[]` with `mappedTo` |
| System fields | Summary | + `mapping` with rule |
| Propagation chains | Summary | + `steps[]` |
| Interfaces | Summary | + `fields[]` with resolved source/target mappings |

---

### 4 — Reorder endpoints

Resources with a `position` field expose a dedicated reorder endpoint to avoid N PATCH calls for drag-and-drop reordering:

```
PUT /canonical-fields/:fId/subfields/reorder
PUT /canonical-fields/:fId/enum-values/reorder
PUT /propagation-chains/:cId/steps/reorder
```

Body: `{ "ids": ["id1", "id2", "id3"] }` — ordered array, backend reassigns positions atomically.

---

### 5 — Transformation rule: atomic PUT

The rule endpoint is `PUT /mappings/:mId/rule` — creates or replaces the rule and all its child records (value map entries, compose/decompose fields) in a single transaction.

**Rationale:** Avoids partial state between calls. The client always sends the full rule state.

---

### 6 — COMPOSE / DECOMPOSE mappings: nullable systemFieldId

A mapping with rule type `COMPOSE` or `DECOMPOSE` has no single system field — the system fields are in the rule tables. POST accepts an optional `ruleType` hint; if `COMPOSE` or `DECOMPOSE`, `systemFieldId` is optional. Otherwise required. Enforced at application layer.

---

### 7 — Export endpoints use POST

Spec generation endpoints (`/export/openapi`, `/export/json-schema`) use POST to carry generation options in the body. Responses are file downloads (`Content-Disposition: attachment`).

`GET /export/workspace` returns the full workspace JSON dump — no options needed.

---

### 8 — Conflict detection on trace, not a separate endpoint

Conflicts (type conflicts, missing mappings) are computed inline on `GET /trace/:canonicalFieldId`, scoped to that field. The workspace-wide conflict scan (`GET /conflicts`) is a separate post-MVP endpoint per FR-6.5.

---

### 9 — Export: buffered at MVP

Full workspace export is buffered in memory and sent when complete. Streaming is deferred until scale requires it.

---

## Full Endpoint Map

### Workspaces
```
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/:wId
PATCH  /api/v1/workspaces/:wId
DELETE /api/v1/workspaces/:wId
```

### Canonical Entities
```
GET    /api/v1/workspaces/:wId/canonical-entities
POST   /api/v1/workspaces/:wId/canonical-entities
GET    /api/v1/workspaces/:wId/canonical-entities/:eId
PATCH  /api/v1/workspaces/:wId/canonical-entities/:eId
DELETE /api/v1/workspaces/:wId/canonical-entities/:eId
```

### Canonical Fields
```
GET    /api/v1/workspaces/:wId/canonical-fields
POST   /api/v1/workspaces/:wId/canonical-fields
GET    /api/v1/workspaces/:wId/canonical-fields/:fId
PATCH  /api/v1/workspaces/:wId/canonical-fields/:fId
DELETE /api/v1/workspaces/:wId/canonical-fields/:fId
```

Query params: `?entityId=`, `?dataType=`, `?tags=`, `?mapped=`, `?search=`

### Canonical Subfields
```
GET    /api/v1/workspaces/:wId/canonical-fields/:fId/subfields
POST   /api/v1/workspaces/:wId/canonical-fields/:fId/subfields
PATCH  /api/v1/workspaces/:wId/canonical-fields/:fId/subfields/:sfId
DELETE /api/v1/workspaces/:wId/canonical-fields/:fId/subfields/:sfId
PUT    /api/v1/workspaces/:wId/canonical-fields/:fId/subfields/reorder
```

### Canonical Field Examples
```
POST   /api/v1/workspaces/:wId/canonical-fields/:fId/examples
DELETE /api/v1/workspaces/:wId/canonical-fields/:fId/examples/:exId
```

### Canonical Enum Values
```
GET    /api/v1/workspaces/:wId/canonical-fields/:fId/enum-values
POST   /api/v1/workspaces/:wId/canonical-fields/:fId/enum-values
PATCH  /api/v1/workspaces/:wId/canonical-fields/:fId/enum-values/:evId
DELETE /api/v1/workspaces/:wId/canonical-fields/:fId/enum-values/:evId
PUT    /api/v1/workspaces/:wId/canonical-fields/:fId/enum-values/reorder
```

### Systems
```
GET    /api/v1/workspaces/:wId/systems
POST   /api/v1/workspaces/:wId/systems
GET    /api/v1/workspaces/:wId/systems/:sId
PATCH  /api/v1/workspaces/:wId/systems/:sId
DELETE /api/v1/workspaces/:wId/systems/:sId
```

### System Entities
```
GET    /api/v1/workspaces/:wId/systems/:sId/entities
POST   /api/v1/workspaces/:wId/systems/:sId/entities
GET    /api/v1/workspaces/:wId/systems/:sId/entities/:eId
PATCH  /api/v1/workspaces/:wId/systems/:sId/entities/:eId
DELETE /api/v1/workspaces/:wId/systems/:sId/entities/:eId
```

### System Fields
```
GET    /api/v1/workspaces/:wId/system-fields
POST   /api/v1/workspaces/:wId/system-fields
GET    /api/v1/workspaces/:wId/system-fields/:sfId
PATCH  /api/v1/workspaces/:wId/system-fields/:sfId
DELETE /api/v1/workspaces/:wId/system-fields/:sfId
```

Query params: `?entityId=`, `?systemId=`, `?mapped=`, `?search=`

### System Entity Relationships
```
GET    /api/v1/workspaces/:wId/systems/:sId/relationships
POST   /api/v1/workspaces/:wId/systems/:sId/relationships
DELETE /api/v1/workspaces/:wId/systems/:sId/relationships/:rId
```

### Mappings
```
GET    /api/v1/workspaces/:wId/mappings
POST   /api/v1/workspaces/:wId/mappings
GET    /api/v1/workspaces/:wId/mappings/:mId
PATCH  /api/v1/workspaces/:wId/mappings/:mId
DELETE /api/v1/workspaces/:wId/mappings/:mId
```

Query params: `?canonicalFieldId=`, `?systemId=`, `?entityId=`, `?deprecated=`

### Transformation Rules
```
PUT    /api/v1/workspaces/:wId/mappings/:mId/rule
DELETE /api/v1/workspaces/:wId/mappings/:mId/rule
```

### Propagation Chains
```
GET    /api/v1/workspaces/:wId/propagation-chains
POST   /api/v1/workspaces/:wId/propagation-chains
GET    /api/v1/workspaces/:wId/propagation-chains/:cId
PATCH  /api/v1/workspaces/:wId/propagation-chains/:cId
DELETE /api/v1/workspaces/:wId/propagation-chains/:cId
```

Query params: `?canonicalFieldId=`, `?systemId=`

### Propagation Chain Steps
```
POST   /api/v1/workspaces/:wId/propagation-chains/:cId/steps
PATCH  /api/v1/workspaces/:wId/propagation-chains/:cId/steps/:stepId
DELETE /api/v1/workspaces/:wId/propagation-chains/:cId/steps/:stepId
PUT    /api/v1/workspaces/:wId/propagation-chains/:cId/steps/reorder
```

### Interfaces
```
GET    /api/v1/workspaces/:wId/interfaces
POST   /api/v1/workspaces/:wId/interfaces
GET    /api/v1/workspaces/:wId/interfaces/:iId
PATCH  /api/v1/workspaces/:wId/interfaces/:iId
DELETE /api/v1/workspaces/:wId/interfaces/:iId
```

### Interface Fields
```
GET    /api/v1/workspaces/:wId/interfaces/:iId/fields
POST   /api/v1/workspaces/:wId/interfaces/:iId/fields
PATCH  /api/v1/workspaces/:wId/interfaces/:iId/fields/:ifId
DELETE /api/v1/workspaces/:wId/interfaces/:iId/fields/:ifId
```

### Trace
```
GET    /api/v1/workspaces/:wId/trace/:canonicalFieldId
```

### Export
```
POST   /api/v1/workspaces/:wId/export/openapi
POST   /api/v1/workspaces/:wId/export/json-schema
GET    /api/v1/workspaces/:wId/export/workspace
```

---

## Response Shape Conventions

### Single resource
Bare resource — no envelope wrapper.
```json
{ "id": "...", "name": "..." }
```

### List resource
Object with `items` array and `total` count. `limit`/`offset` added when pagination is introduced — non-breaking.
```json
{ "items": [...], "total": 42 }
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "details": [
      { "field": "dataType", "message": "must be one of: STRING, INTEGER, ..." }
    ]
  }
}
```
`details` is omitted when not applicable.

### Error codes

| Status | Code | Situation |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Request body fails validation |
| 400 | `REFERENCE_NOT_FOUND` | Referenced FK resource does not exist |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `DELETE_CONFLICT` | Delete blocked by dependent records |
| 409 | `CONFLICT` | Constraint violation (e.g. duplicate slug) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

`DELETE_CONFLICT` includes a `details` array listing what blocks the delete:
```json
{
  "error": {
    "code": "DELETE_CONFLICT",
    "message": "Cannot delete canonical field with active mappings",
    "details": [
      { "type": "mappings", "count": 3 },
      { "type": "interfaceFields", "count": 1 }
    ]
  }
}
```

### Field naming
camelCase throughout — `canonicalFieldId`, `createdAt`. Consistent with Prisma output and TypeScript clients. No snake_case serialisation layer needed.

### Nullable fields
Always included as `null`, never omitted. Clients get a consistent, fully-typed shape regardless of optional field values.

### Dates
ISO 8601 UTC — `"2026-03-13T14:32:00.000Z"`.

---

## Consequences

- All API consumers (UI, CLI, extensions) work against the same versioned endpoint set from day one
- The trace endpoint is the only non-CRUD endpoint in MVP — its dedicated shape avoids GraphQL for one use case
- Reorder endpoints must be implemented before any UI feature that supports drag-and-drop ordering
- The atomic PUT on transformation rules means the client must always send the complete rule state — partial updates are not supported
- Interface field resolution at read time (no stored system field refs) means the interface detail query is a join across mappings — acceptable at MVP scale, worth indexing `mappings(canonical_field_id, system_field_id)`
