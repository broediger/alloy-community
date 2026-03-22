# Interface Manager

A web application that replaces Excel-based integration mapping files with a queryable, traceable registry. Define canonical fields once, map them across systems, trace relationships, and generate OpenAPI and JSON Schema specs directly from the mappings.

The source of truth is the **canonical model** — everything else is derived from it.

---

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up
```

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Health check**: http://localhost:3000/health

The backend waits for PostgreSQL to be ready before starting. On first boot, you'll need to run the database migration:

```bash
docker compose exec backend npx prisma migrate deploy
```

To rebuild after code changes:

```bash
docker compose up --build -d
```

## Local Development

**Prerequisites**: Node.js 22+, PostgreSQL 16

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env — point DATABASE_URL to your local PostgreSQL

# Run database migrations
npm run db:migrate

# Start backend (port 3000) and frontend (port 5173) in separate terminals
npm run dev:backend
npm run dev:frontend
```

The frontend dev server proxies `/api` requests to the backend at `localhost:3000`.

### Running Tests

```bash
npm test                      # Run all tests
npm run test:backend          # Backend only (111 tests)
npm run test:frontend         # Frontend only

# Single test file
npx -w backend vitest run src/routes/workspaces.test.ts
```

### Other Commands

```bash
npm run build                 # Build both workspaces
npm run lint                  # TypeScript check (tsc --noEmit)
npm run db:generate           # Regenerate Prisma client after schema changes
npx -w backend prisma studio  # Visual database browser
```

---

## How It Works

Interface Manager models the field-level contracts between connected systems. The workflow follows a natural progression: define your canonical model, register your systems, create mappings between them, then export specs or trace relationships.

### 1. Create a Workspace

A workspace is a container for one set of integrations — typically one client or product. Everything below is scoped to a workspace.

### 2. Define the Canonical Model

The canonical model is the system-neutral vocabulary for your integration. It consists of **entities** and **fields**.

**Entities** group related fields (e.g. Contact, Address, Order). **Fields** define each data point: name, data type, description, nullable flag, and optional example values.

Fields can be:

- **Simple** — a single value like `email` (string) or `amount` (decimal)
- **Composite** — composed of sub-fields, like `phone` with sub-fields `countryCode`, `cityCode`, `number`. Systems can map to the composite or to individual sub-fields.
- **Enum** — a field with a defined set of values, each with a code and label

### 3. Register Systems and Their Fields

Add the systems involved in your integrations (e.g. Dynamics 365, SAP, a custom REST API). Each system has **entities** (data structures like Lead, Account, Opportunity) containing **fields** (the system-specific representation of each data point).

### 4. Map Canonical Fields to System Fields

Mappings connect canonical fields to system fields with a transformation rule describing how the value converts:

| Rule Type | Use Case |
|-----------|----------|
| **Rename** | Field name differs, value is identical |
| **Value Map** | Lookup table (e.g. `active` → `1`, `inactive` → `0`). Optionally bidirectional. |
| **Compose** | Multiple system fields merge into one canonical field |
| **Decompose** | One canonical field splits into multiple system fields |

A mapping can also be marked as **deprecated** to indicate it's being phased out.

#### Handling discriminated tables

Some systems store multiple logical fields in a single table distinguished by a type column. For example, an ERP identification table might hold both a CRM identifier and a company registration number in the same two columns:

| IdentificationType | IdentificationNumber |
|---|---|
| ZCRMGUID | 1d471f69-969d-ee11-... |
| ZFIRMN | FN 123456a |

In the canonical model these are separate, simple fields (`crmGuid`, `companyRegistrationNumber`). The discriminator is a system-specific concern and does not belong in the canonical layer.

To model this, each canonical field maps to the shared value column (e.g. `IdentificationNumber`) with a **Formula** transformation rule whose config carries the discriminator:

```json
{
  "discriminator": {
    "field": "IdentificationType",
    "value": "ZCRMGUID"
  }
}
```

This keeps the canonical model clean while fully describing how the target system stores the data.

### 5. Define Propagation Chains (optional)

A propagation chain tracks how a value flows through entities *within* a single system. For example, in Dynamics 365: `Lead.phone` → `Opportunity.phone` → `Account.phone`. Each step can carry a note explaining the trigger (e.g. "copied on Lead qualification").

### 6. Create Interfaces

An interface is a directed contract between a source and target system for a defined set of canonical fields. The interface detail view shows the full field contract: canonical field, source system field, target system field, and transformation rules for both sides.

Each field in an interface can be marked as **mandatory**, **optional**, or **excluded**.

### 7. Trace Relationships

The trace view shows a visual graph for any canonical field: every system it's mapped to, every interface it appears in, every propagation chain it flows through, and any detected conflicts (e.g. incompatible data types across systems).

Access the trace from any canonical field's detail page.

### 8. Export Specs

Generate specs directly from the mappings — no manual editing required:

- **OpenAPI 3.0** (YAML or JSON) — per system, with correct types, nullable/required flags, enum values, and examples
- **JSON Schema** (Draft 7) — per canonical entity or per interface
- **Workspace export** — full JSON dump of all data for backup or migration

Specs can also be generated from a saved **version snapshot** of the canonical model, so you can produce specs as they were at a point in time.

### 9. Version the Canonical Model (optional)

Cut a named version (e.g. `v1.0`) to snapshot the current state of the canonical model. View the diff between any two versions to see what fields were added, removed, or changed.

---

## API

All endpoints are documented per [ADR-004](decisions/ADR-004-api-design.md). The base path is `/api/v1/`.

Key endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Health check |
| `GET/POST /api/v1/workspaces` | List / create workspaces |
| `GET/POST /api/v1/workspaces/:wId/canonical-entities` | Canonical entities |
| `GET/POST /api/v1/workspaces/:wId/canonical-fields` | Canonical fields (supports `?entityId`, `?dataType`, `?tags`, `?mapped`, `?search` filters) |
| `GET/POST /api/v1/workspaces/:wId/systems` | Systems |
| `GET/POST /api/v1/workspaces/:wId/mappings` | Mappings |
| `PUT /api/v1/workspaces/:wId/mappings/:mId/rule` | Set transformation rule (atomic replace) |
| `GET /api/v1/workspaces/:wId/trace/:canonicalFieldId` | Trace field across all systems |
| `POST /api/v1/workspaces/:wId/export/openapi` | Generate OpenAPI spec |
| `POST /api/v1/workspaces/:wId/export/json-schema` | Generate JSON Schema |
| `GET /api/v1/workspaces/:wId/export/workspace` | Full workspace JSON export |

See `decisions/ADR-004-api-design.md` for the complete endpoint map, response shapes, and error codes.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Docker Compose                   │
│                                                   │
│  ┌─────────────────┐  ┌───────────────────────┐  │
│  │   Frontend       │  │   Backend API          │  │
│  │   React SPA      │  │   Fastify + TypeScript │  │
│  │   Nginx :80      │  │   :3000                │  │
│  └────────┬─────────┘  │                        │  │
│           │ /api proxy  │  ┌──────────────────┐  │  │
│           └─────────────┤  │ Registry Service │  │  │
│                         │  │ Trace Engine     │  │  │
│                         │  │ Spec Generator   │  │  │
│                         │  └────────┬─────────┘  │  │
│                         └───────────┼────────────┘  │
│                                     │               │
│                         ┌───────────▼────────────┐  │
│                         │   PostgreSQL 16         │  │
│                         │   :5432                 │  │
│                         └────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- **Registry Service** — CRUD for canonical fields, systems, entities, mappings (Prisma ORM)
- **Trace Engine** — Graph traversal via recursive SQL CTEs (postgres.js, raw SQL)
- **Spec Generator** — In-process OpenAPI/JSON Schema generation

Architecture decisions are documented in `decisions/`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `BACKEND_PORT` | `3000` | Backend server port |
| `LOG_LEVEL` | `info` | Pino log level (`debug`, `info`, `warn`, `error`) |
| `VITE_API_BASE_URL` | `` | API base URL (set at frontend build time; empty uses relative path) |

---

## License

Proprietary. See LICENSE for details.
