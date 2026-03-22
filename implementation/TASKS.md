# Interface Manager — Development Tasks

Tasks are ordered by implementation dependency. Complete each phase before starting the next.

---

## Phase 1 — Project Scaffold

### T-001 — Initialize project structure ✅
Set up the monorepo with backend and frontend packages.

**Acceptance criteria:**
- [x] Root `package.json` with workspaces for `backend/` and `frontend/`
- [x] `backend/` initialized with Node.js + TypeScript + Fastify
- [x] `frontend/` initialized with Vite + React + TypeScript
- [x] Shared `tsconfig.json` base with strict mode enabled
- [x] `.env.example` with all required environment variables documented
- [x] `.gitignore` covers `node_modules`, `dist`, `.env`

---

### T-002 — Docker Compose setup ✅
Production-ready Docker Compose configuration.

**Acceptance criteria:**
- [x] `docker-compose.yml` defines three services: `backend`, `frontend`, `db`
- [x] `backend` Dockerfile builds from `backend/` with multi-stage build (build + runtime)
- [x] `frontend` Dockerfile builds from `frontend/` and serves via Nginx
- [x] `db` uses `postgres:16` with a named volume for data persistence
- [x] Environment variables passed to containers via `.env` file
- [ ] `docker compose up` starts all three services and they communicate correctly — **not yet verified end-to-end (requires running Docker)**
- [x] Backend waits for PostgreSQL to be ready before starting (healthcheck)
- [x] Ports: backend on `3000`, frontend on `80`, db on `5432`

---

### T-003 — Backend Fastify app foundation ✅
Core Fastify application with plugin registration and route structure.

**Acceptance criteria:**
- [x] Fastify app instantiated in `src/app.ts`, server entry in `src/server.ts`
- [x] `GET /health` returns `{ status: "ok" }` with 200
- [x] JSON Schema error formatter remaps Fastify validation errors to `{ error: { code, message, details } }`
- [x] Request logging enabled via Fastify's built-in Pino logger
- [x] All routes registered under `/api/v1/`
- [x] TypeScript compilation passes with no errors

---

### T-004 — Database setup and Prisma migrations ⚠️ Partial
PostgreSQL connected, Prisma schema migrated, client available.

**Acceptance criteria:**
- [x] Prisma schema from `implementation/prisma-schema.prisma` applied, extended with versioning tables (see T-033)
- [ ] `prisma migrate dev` runs successfully and creates all tables — **requires a running PostgreSQL instance**
- [x] Prisma client generated and importable from `src/lib/prisma.ts`
- [x] postgres.js client instantiated and exportable from `src/lib/sql.ts`
- [x] `DATABASE_URL` sourced from environment
- [ ] Migration files committed to version control — **no migrations generated yet (requires running DB)**

---

## Phase 2 — Backend Infrastructure

### T-005 — Error handling ✅
AppError class hierarchy and global Fastify error handler.

**Acceptance criteria:**
- [x] All `AppError` subclasses implemented in `src/errors/index.ts`: `ValidationError`, `NotFoundError`, `ConflictError`, `DeleteConflictError`, `ReferenceNotFoundError`
- [x] Global error handler registered in `src/plugins/error-handler.ts`
- [x] `AppError` instances serialise to `{ error: { code, message, details? } }` with correct HTTP status
- [x] Prisma `P2002`, `P2003`, `P2025`, `P2014` errors mapped to correct `AppError` — P2002 parses `error.meta.target` for specific field message
- [x] Unhandled errors return 500 with `INTERNAL_ERROR` code and are logged
- [x] Unit tests cover each error class and the global handler mapping — 7 tests in `errors/index.test.ts`, 11 tests in `plugins/error-handler.test.ts`

---

### T-006 — Workspace middleware ✅
Fastify `preHandler` hook for workspace validation and ownership.

**Acceptance criteria:**
- [x] Hook implemented in `src/middleware/workspace.ts`
- [x] Hook fires on all routes with `:workspaceId` in the path
- [x] Returns `NotFoundError` if workspace does not exist
- [x] Attaches workspace to `request.workspace` on success
- [x] TypeScript declaration merge adds `workspace` to Fastify request type
- [x] Ownership check stub present with comment indicating post-MVP implementation point
- [x] Unit tests cover: valid workspace, non-existent workspace — 3 tests in `middleware/workspace.test.ts`

---

## Phase 3 — Registry: Canonical Model

### T-007 — Workspaces CRUD ✅
Full CRUD for workspaces with summary counts on list.

**Acceptance criteria:**
- [x] `GET /api/v1/workspaces` returns `{ items, total }` with `canonicalFieldCount`, `systemCount`, `interfaceCount` per item
- [x] `POST /api/v1/workspaces` creates workspace — validates `name` and `slug` required, `slug` unique
- [x] `GET /api/v1/workspaces/:wId` returns full workspace fields
- [x] `PATCH /api/v1/workspaces/:wId` updates `name`, `slug`, `settings` — partial update
- [x] `DELETE /api/v1/workspaces/:wId` deletes workspace — returns `DeleteConflictError` if systems, canonical entities, or interfaces exist
- [x] Duplicate `slug` returns 409 `CONFLICT`
- [x] Integration tests cover all endpoints including error cases — 11 tests in `routes/workspaces.test.ts`

---

### T-008 — Canonical entities CRUD ✅
Full CRUD with field count and coverage on list.

**Acceptance criteria:**
- [x] `GET /api/v1/workspaces/:wId/canonical-entities` returns `{ items, total }` with `fieldCount`, `mappedFieldCount` per item
- [x] `POST` validates `name`, `slug` required — `slug` unique per workspace
- [x] `GET /:eId` returns full entity fields
- [x] `PATCH /:eId` partial update of `name`, `slug`, `description`
- [x] `DELETE /:eId` returns `DeleteConflictError` if fields exist — lists `fieldCount` in details
- [x] Workspace middleware enforces workspace scope on all endpoints
- [x] Integration tests cover all endpoints including error cases — 8 tests in `routes/canonical-entities.test.ts`

---

### T-009 — Canonical fields CRUD ✅
Full CRUD with filtering, mapping count on list, inlined detail.

**Acceptance criteria:**
- [x] `GET` supports query params: `?entityId=`, `?dataType=`, `?tags=`, `?mapped=`, `?search=`
- [x] List response includes `mappingCount` per field
- [x] `GET /:fId` inlines `subfields[]`, `examples[]`, `enumValues[]`, `mappingCount`
- [x] `POST` validates all required fields — `name` unique per entity
- [x] `isComposite: true` is valid without subfields at creation (subfields added separately)
- [x] `dataType: ENUM` without `enumValues` is valid at creation
- [x] `DELETE /:fId` returns `DeleteConflictError` with `mappings` and `interfaceFields` counts if dependents exist
- [x] Integration tests cover filtering, composite fields, enum fields, error cases — 15 tests in `routes/canonical-fields.test.ts`

---

### T-010 — Canonical subfields CRUD and reorder ✅
Subfield management for composite canonical fields.

**Acceptance criteria:**
- [x] `GET /canonical-fields/:fId/subfields` returns ordered subfield list
- [x] `POST` validates `name` unique per parent field, `position` assigned automatically as next in sequence
- [x] `PATCH /:sfId` allows updating `name`, `displayName`, `description`, `dataType`, `format`, `nullable`
- [x] `DELETE /:sfId` returns `DeleteConflictError` if subfield has active mappings
- [x] `PUT /reorder` accepts `{ ids: string[] }` and reassigns `position` atomically in a transaction
- [x] `PUT /reorder` returns 400 if provided IDs don't match the subfield set for that field
- [x] Integration tests cover reorder, delete conflict — covered in `routes/canonical-fields.test.ts`

---

### T-011 — Canonical field examples and enum values ✅
Example and enum value management.

**Acceptance criteria:**
- [x] `POST /examples` adds an example value — no validation beyond `value` required
- [x] `DELETE /examples/:exId` removes example — 404 if not found
- [x] `GET /enum-values` returns enum values ordered by `position`
- [x] `POST /enum-values` validates `code` unique per field, assigns next `position`
- [x] `PATCH /enum-values/:evId` updates `code`, `label`
- [x] `DELETE /enum-values/:evId` removes entry — cascades cleanly
- [x] `PUT /enum-values/reorder` reorders atomically — same validation as subfield reorder
- [x] Integration tests cover all endpoints — covered in `routes/canonical-fields.test.ts`

---

## Phase 4 — Systems

### T-012 — Systems CRUD ✅
Full CRUD with coverage counts on list, entity summaries on detail.

**Acceptance criteria:**
- [x] `GET` list returns `canonicalFieldCount`, `mappedFieldCount` per system
- [x] `GET /:sId` inlines `entities[]` with `{ id, name, slug, fieldCount, mappedFieldCount }`
- [x] `POST` validates `name` unique per workspace, `systemType` is valid enum value
- [x] `PATCH /:sId` partial update
- [x] `DELETE /:sId` returns `DeleteConflictError` if entities exist
- [x] Integration tests cover coverage calculation, error cases — 8 tests in `routes/systems.test.ts`

---

### T-013 — System entities CRUD ✅
Entity management within a system.

**Acceptance criteria:**
- [x] `GET /systems/:sId/entities` returns entity list with `fieldCount`, `mappedFieldCount`
- [x] `GET /:eId` inlines `fields[]` with `{ id, name, path, dataType, mappedTo: { canonicalFieldId, canonicalFieldName } | null }`
- [x] `POST` validates `slug` unique per system
- [x] `DELETE /:eId` returns `DeleteConflictError` if fields exist
- [x] Integration tests cover inline field mapping resolution — covered in `routes/systems.test.ts`

---

### T-014 — System fields CRUD ✅
Flat system fields with entity and system filtering.

**Acceptance criteria:**
- [x] `GET` supports `?entityId=`, `?systemId=`, `?mapped=`, `?search=`
- [x] `GET /:sfId` inlines current `mapping` with `{ id, canonicalFieldId, canonicalFieldName, deprecated, transformationRule: { type } } | null`
- [x] `POST` validates `entityId` exists and belongs to workspace, `name` unique per entity
- [x] `DELETE /:sfId` returns `DeleteConflictError` if mapping exists
- [x] Integration tests cover filtering, mapping resolution, cross-entity search — 5 tests in `routes/system-fields.test.ts`

---

### T-015 — System entity relationships ✅
Relationship management within a system.

**Acceptance criteria:**
- [x] `GET /systems/:sId/relationships` returns list with inlined entity names and field name
- [x] `POST` validates `sourceEntityId`, `targetEntityId`, `viaFieldId` all belong to the same system and workspace
- [x] `DELETE /:rId` removes relationship — no cascade check needed
- [x] Integration tests cover cross-system validation — covered in `routes/systems.test.ts`

---

## Phase 5 — Mappings

### T-016 — Mappings CRUD ✅
Mapping creation and management with business rule validation.

**Acceptance criteria:**
- [x] `GET` supports `?canonicalFieldId=`, `?systemId=`, `?entityId=`, `?deprecated=`
- [x] `GET /:mId` inlines `transformationRule` if present
- [x] `POST` accepts optional `ruleType` hint — if `COMPOSE` or `DECOMPOSE`, `systemFieldId` optional; otherwise required
- [x] `POST` validates `canonicalFieldId` XOR `canonicalSubfieldId` — exactly one set
- [x] `POST` validates all referenced IDs belong to the same workspace
- [x] `PATCH /:mId` allows updating `notes`, `deprecated`
- [x] `DELETE /:mId` cascades to transformation rule and all child records
- [x] Integration tests cover XOR validation, ruleType hint, workspace scope — 14 tests in `routes/mappings.test.ts`

---

### T-017 — Transformation rules ✅
Atomic PUT for all rule types.

**Acceptance criteria:**
- [x] `PUT /mappings/:mId/rule` creates or fully replaces rule in a single transaction
- [x] `DELETE /mappings/:mId/rule` removes rule and all child records
- [x] RENAME: accepted with no config or child records
- [x] TYPE_CAST: requires `config.from` and `config.to`
- [x] VALUE_MAP: requires `entries[]` with `fromValue`, `toValue`; `fromValue` unique per rule enforced; `bidirectional` flag validated — warns if reverse mapping has conflicts
- [x] COMPOSE: requires `fields[]` with `systemFieldId`, `subfieldId`, `position`; `position` unique per rule; all referenced IDs belong to workspace
- [x] DECOMPOSE: requires `fields[]` with `subfieldId`, `systemFieldId`, `position`; same validations as COMPOSE
- [x] Integration tests cover each rule type, atomicity (failed PUT leaves previous rule intact), delete cascade — covered in `routes/mappings.test.ts`

---

## Phase 6 — Propagation Chains

### T-018 — Propagation chains CRUD and steps ✅
Chain and step management with reorder.

**Acceptance criteria:**
- [x] `GET` supports `?canonicalFieldId=`, `?systemId=`
- [x] `GET /:cId` inlines `steps[]` ordered by `position` with system field and entity name
- [x] `POST` validates `canonicalFieldId` and `systemId` belong to workspace
- [x] `POST /steps` validates `systemFieldId` belongs to the chain's system — returns 400 if system mismatch
- [x] `PATCH /steps/:stepId` updates `stepType`, `notes`
- [x] `DELETE /steps/:stepId` removes step, does not resequence remaining positions
- [x] `PUT /steps/reorder` resequences all steps atomically
- [x] Integration tests cover system mismatch validation, reorder, step deletion — 6 tests in `routes/propagation-chains.test.ts`

---

## Phase 7 — Interfaces

### T-019 — Interfaces CRUD ✅
Interface management with resolved field contract on detail.

**Acceptance criteria:**
- [x] `GET /:iId` resolves `sourceMapping` and `targetMapping` for each interface field at read time via `mappings` table
- [x] `sourceMapping` and `targetMapping` are `null` when no mapping exists for that system — not an error
- [x] `POST` validates `sourceSystemId !== targetSystemId`
- [x] `POST` validates both systems belong to workspace
- [x] `DELETE /:iId` cascades to interface fields
- [x] Integration tests cover mapping resolution, null sides, source/target same system validation — 8 tests in `routes/interfaces.test.ts`

---

### T-020 — Interface fields ✅
Field selection management within an interface.

**Acceptance criteria:**
- [x] `POST` validates `canonicalFieldId` unique per interface — 409 if duplicate
- [x] `POST` validates `canonicalFieldId` belongs to workspace
- [x] `PATCH /:ifId` updates `status` only (`MANDATORY`, `OPTIONAL`, `EXCLUDED`)
- [x] `DELETE /:ifId` removes field selection
- [x] Integration tests cover duplicate field, status update — covered in `routes/interfaces.test.ts`

---

## Phase 8 — Trace Engine

### T-021 — Trace engine (postgres.js) ✅
Recursive CTE implementation for full field graph traversal.

**Acceptance criteria:**
- [x] `trace-engine.ts` uses postgres.js exclusively — no Prisma
- [x] Query returns in a single round-trip: all mappings, propagation chains with steps, interfaces with mapping resolution, conflicts
- [x] Conflict detection: TYPE_CONFLICT flagged when two systems map to the same canonical field with incompatible `dataType` values
- [x] Result correctly scoped to workspace — no cross-workspace data leakage
- [ ] Unit tests with a seeded database cover: field with no mappings, field with multiple systems, field in multiple interfaces, field with propagation chain, field with type conflict — **tests use mocked postgres.js, not a seeded database**
- [ ] Query completes in under 500ms for a workspace with 200 canonical fields and 5 systems (NFR-5) — **not benchmarked (requires running DB with seeded data)**

---

### T-022 — Trace endpoint ✅
REST endpoint wrapping the trace engine.

**Acceptance criteria:**
- [x] `GET /api/v1/workspaces/:wId/trace/:canonicalFieldId` returns full trace response shape per ADR-004
- [x] Returns 404 if canonical field does not exist or does not belong to workspace
- [x] `conflicts[]` included inline — empty array if no conflicts detected
- [x] postgres.js errors mapped via `mapPostgresError` before reaching global handler
- [x] Integration test covers full response shape with a seeded fixture — 3 tests in `routes/trace.test.ts`

---

## Phase 8b — Versioning

### T-033 — Version snapshot schema and DB model ✅
Prisma schema additions for semantic versioning of the canonical model.

**Acceptance criteria:**
- [x] `ModelVersion` table: `id`, `workspaceId`, `label` (e.g. `v1.0`), `description`, `createdAt`, `createdBy`
- [x] `ModelVersionSnapshot` table: stores a full JSON snapshot of the canonical model at the time the version was cut — all canonical entities, fields, subfields, enum values, examples
- [x] `ModelVersionDiff` table: stores a structured diff between two consecutive versions — additions, removals, renames, type changes per field
- [ ] Prisma migration created and committed — **schema defined but migration not yet generated (requires running DB)**
- [x] `label` unique per workspace

---

### T-034 — Version management API ✅
Cut, list, and diff versions of the canonical model.

**Acceptance criteria:**
- [x] `POST /api/v1/workspaces/:wId/versions` cuts a new version — captures full canonical model snapshot and computes diff against the previous version atomically in a transaction
- [x] `GET /api/v1/workspaces/:wId/versions` returns list of versions ordered by `createdAt` desc — includes `label`, `description`, `createdAt`, field count at time of snapshot
- [x] `GET /api/v1/workspaces/:wId/versions/:vId` returns version metadata + full snapshot
- [x] `GET /api/v1/workspaces/:wId/versions/:vId/diff` returns structured diff: `added[]`, `removed[]`, `changed[]` (with `before` and `after` per changed field)
- [x] `label` duplicate returns 409 `CONFLICT`
- [x] Integration tests cover: cut version, list, diff with changes across versions — 6 tests in `routes/versions.test.ts`

---

## Phase 9 — Export

### T-023 — OpenAPI 3.0 generator ✅
Generate OpenAPI spec from system mappings.

**Acceptance criteria:**
- [x] `POST /export/openapi` accepts `{ systemId, format: "yaml"|"json", includeEntityIds?: string[], versionId?: string }` — if `versionId` provided, generates spec from the snapshot at that version rather than the current live model
- [x] Generated spec is valid OpenAPI 3.0 — validated with `openapi3-ts` types at generation time
- [x] Each canonical entity maps to an OpenAPI schema object
- [x] Field `dataType` maps to correct OpenAPI type + format
- [x] `nullable: true` fields include `nullable: true` in spec
- [x] `required: true` fields appear in `required[]` array
- [x] Example values included under `examples`
- [x] Enum fields generate `enum:` array from `canonicalEnumValues`
- [x] Response is file download: correct `Content-Disposition` and `Content-Type` headers
- [ ] Generation completes in under 3 seconds for 200 canonical fields (NFR-4) — **not benchmarked**
- [x] Integration tests cover YAML and JSON output, nullable, required, enum fields — 6 tests in `routes/export.test.ts`

---

### T-024 — JSON Schema generator ✅
Generate JSON Schema from canonical entity or interface.

**Acceptance criteria:**
- [x] `POST /export/json-schema` accepts `{ scope: "entity"|"interface", scopeId, format: "json", versionId?: string }` — if `versionId` provided, generates schema from the snapshot at that version
- [x] Entity scope: generates schema for all fields in the canonical entity
- [x] Interface scope: generates schema scoped to fields selected in the interface
- [x] Output is valid JSON Schema Draft 7
- [x] Composite fields generate `object` type with `properties` for each subfield
- [x] File download with correct headers
- [ ] Generation completes under 3 seconds for 200 fields (NFR-4) — **not benchmarked**
- [x] Integration tests cover entity and interface scope — covered in `routes/export.test.ts`

---

### T-025 — Workspace export ✅
Full workspace JSON dump for backup and migration.

**Acceptance criteria:**
- [x] `GET /export/workspace` returns all workspace data as a single JSON file download
- [x] Export includes all tables: canonical model, systems, mappings, propagation chains, interfaces
- [x] Export is self-contained — importing into a new workspace should be fully possible from this file alone
- [x] Response is file download: `Content-Disposition: attachment; filename="workspace-{slug}-{date}.json"`
- [x] Integration test verifies all entities are present in export output — covered in `routes/export.test.ts`

---

## Phase 10 — Frontend

### T-026 — Frontend foundation ✅
Routing, layout, and API client setup.

**Acceptance criteria:**
- [x] React Router v7 configured with routes for all main views
- [x] Base layout with navigation sidebar — `Layout.tsx` with `Sidebar.tsx`
- [x] TanStack Query configured with global error handling — mutation `onError` handler in `main.tsx`
- [x] API client (`src/lib/api.ts`) wraps all fetch calls — handles base URL, JSON headers, error deserialisation, blob downloads
- [x] Error boundary renders friendly message on unhandled errors — `ErrorBoundary.tsx`
- [x] shadcn/ui installed and base components available (`Button`, `Input`, `Select`, `Dialog`, `Table`) — implemented as custom Tailwind components in `src/components/ui/` (not via shadcn CLI, since project uses Tailwind v4)

---

### T-027 — Workspace management UI ✅
Workspace list, create, and settings.

**Acceptance criteria:**
- [x] Workspace list page shows all workspaces with `canonicalFieldCount`, `systemCount`, `interfaceCount`
- [x] Create workspace dialog — validates slug format client-side before submit (regex: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), auto-generates slug from name
- [x] Edit workspace name/slug via settings page — `WorkspaceSettingsPage.tsx`
- [x] Delete workspace with confirmation dialog — shows blocking dependents if `DELETE_CONFLICT` returned, displays count and type per blocker
- [x] Navigation persists selected workspace across page changes — sidebar shows current workspace, all links scoped to `workspaceId` route param

---

### T-028 — Canonical field registry UI ✅
Entity and field management.

**Acceptance criteria:**
- [x] Entity list page with `fieldCount` and `mappedFieldCount` — coverage shown as percentage via `CoverageBar` component
- [x] Field list with search, filter by type/tag/mapped status — search input, dataType select, mapped/unmapped filter in `CanonicalEntityDetailPage.tsx`
- [x] Field detail page shows subfields (if composite), examples, enum values, `mappingCount`
- [x] Create/edit field form supports all `dataType` values — shows relevant fields per type (enum values for ENUM, subfields for composite)
- [x] Subfield reorder via ~~drag-and-drop~~ up/down buttons — calls `PUT /reorder` on click
- [x] Enum value reorder via ~~drag-and-drop~~ up/down buttons
- [x] Delete field shows confirmation with blocking dependent counts if `DELETE_CONFLICT`

**Note:** Reorder uses up/down buttons instead of drag-and-drop. Functionally equivalent — calls the same `PUT /reorder` endpoint.

---

### T-029 — Systems UI ✅
System, entity, and field management.

**Acceptance criteria:**
- [x] System list with coverage percentage — `CoverageBar` component
- [x] System detail shows entities with coverage per entity
- [x] Entity detail shows fields with `mappedTo` canonical field (or unmapped badge)
- [x] Create system form with type selection — all `SystemType` values (REST, SOAP, EVENT, FLAT_FILE, OTHER)
- [x] Create/edit system fields ~~inline~~ on entity detail page — uses modal dialog instead of true inline editing

**Note:** Field creation uses a modal dialog rather than inline row editing. Same functionality, different UX pattern.

---

### T-030 — Mapping UI ⚠️ Mostly complete
Mapping creation and transformation rule editor.

**Acceptance criteria:**
- [x] Mapping creation: select canonical field → ~~select system → select entity →~~ select system field — simplified to canonical field + system field selection with optional rule type hint
- [x] Rule type selector — shows relevant form per type (value map table, compose/decompose field picker, etc.)
- [x] VALUE_MAP: add/remove/edit entries inline — bidirectional toggle ~~with conflict warning~~
- [ ] COMPOSE/DECOMPOSE: ~~field picker lists system fields in the entity, maps each to a canonical subfield~~ — **shows placeholder message; full field picker not implemented in the mapping list UI**
- [x] Deprecated flag toggleable on existing mappings
- [ ] Unsaved rule changes show confirmation before navigating away — **not implemented**

---

### T-031 — Trace view ✅
React Flow graph for canonical field relation tracing.

**Acceptance criteria:**
- [x] Accessible from canonical field detail page — "View Trace" button navigates to `/trace/:fieldId`
- [x] React Flow graph renders: canonical field node in centre, system nodes as leaves, interface nodes connecting system pairs
- [x] Propagation chain rendered as a linear sequence of entity field nodes within a system
- [x] Conflict nodes visually distinct (colour/icon) — red background, red border, red text for conflicting systems; conflict panel in top-right corner
- [x] Clicking a system field node navigates to that field's detail — `onNodeClick` handler with `navigateTo` data
- [x] Graph layout is automatic — no manual positioning required from user — circular layout for systems, calculated positions
- [x] Empty state shown when field has no mappings — "No mappings found" with icon and description

---

### T-032 — Interface UI and export ✅
Interface management and spec download.

**Acceptance criteria:**
- [x] Interface list shows source → target system pairs — with direction badge
- [x] Interface detail shows full field contract: canonical field | source field | target field | status
- [x] Missing mappings highlighted (null source or target side) — yellow background row, red "Missing" badge
- [x] Add/remove canonical fields to interface — status selector per field (MANDATORY, OPTIONAL, EXCLUDED)
- [x] Export buttons: OpenAPI (YAML/JSON), JSON Schema — triggers file download via `triggerDownload()` helper
- [x] Workspace export button in settings — downloads full JSON dump in `WorkspaceSettingsPage.tsx`
