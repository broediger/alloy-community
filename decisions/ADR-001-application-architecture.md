---
title: "ADR-001: Application Architecture"
status: Decided
date: 2026-03-13
tags:
  - interface-manager
  - architecture
  - adr
related:
  - "[[30-projects/10-ideas/interface-manager/requirements]]"
---

# ADR-001: Application Architecture

## Status

Decided

---

## Context

Interface Manager is a standalone web application for managing integration field mappings, generating interface specs, and tracing field relations across systems. It is delivered as a self-hosted Docker deployment. The architecture must support:

- A rich relational data model (canonical fields, entities, systems, mappings, propagation chains, composite fields)
- Relation tracing (graph traversal queries across the mapping model)
- Spec generation (OpenAPI 3.0, JSON Schema, AsyncAPI)
- Compose/decompose transformation rules with structured expressions
- Single-user MVP, multi-user post-MVP
- Clean API boundary for future consumers (CLI, VS Code extension, PowerForge integration)

---

## Decisions

### 1 — Overall Structure: Separated Frontend + Backend API

A React SPA (served via Nginx) communicates with a REST backend API. The backend is a single process with clear internal service layers.

**Rationale:** The API is a first-class citizen from day one. Spec generation, relation tracing, and code generation are operations that benefit from being callable independently of the UI — CLI tooling, a VS Code extension, or PowerForge integration can consume the same API without a UI dependency.

**Rejected:** Monolith (API and UI in one process) — couples the frontend to the backend unnecessarily and makes future API consumers harder to add. Microservices — overkill at this stage.

---

### 2 — API Design: REST with Dedicated Trace Endpoint

Standard REST endpoints for all CRUD operations. A dedicated `/trace/:canonicalFieldId` endpoint handles the relation trace query — returning the full graph: systems, entities, fields, mappings, propagation chains, and conflicts in one structured response.

**Rationale:** CRUD is well-served by REST. The trace operation is a graph traversal with a deeply nested result — a dedicated endpoint with a purpose-built response shape is simpler than introducing GraphQL for one use case.

---

### 3 — Database: PostgreSQL

**Rationale:**
- The data model is a relational graph — foreign keys, junction tables, and recursive CTEs for traversal
- JSONB columns for structured expression storage (compose/decompose rules)
- Full-text search for canonical field search
- Mature Docker support, reliable at self-hosted scale
- Clear migration path to managed cloud PostgreSQL (RDS, Cloud SQL, Supabase) when cloud hosting is introduced

**Rejected:** SQLite — no recursive CTEs in older versions, no concurrent writes, harder to migrate to cloud. MongoDB — flexible schema is a liability for a model with strict relational integrity requirements.

---

### 4 — Spec Generation: In-Process Service (MVP)

Spec generation runs inside the backend as a stateless service layer function. Called synchronously by the API, returns the spec document, streamed to the client for download.

**Rationale:** At MVP scale (up to 200 canonical fields), spec generation completes in under one second. A queue adds operational complexity with no benefit.

**Future consideration — Cloud upgrade trigger:**
As the product grows, spec generation will become computationally heavier — particularly code generation for large models (TypeScript mappers, C# classes, validation schemas across many systems). At that point, async queued generation becomes necessary. This is the natural architectural trigger for introducing a cloud-hosted tier:

- Self-hosted users hit generation limits or latency on large models
- Cloud tier offers queued, scalable spec and code generation with no infrastructure management
- Migration is straightforward: PostgreSQL export → cloud import, same API, same data model

**This is a deliberate commercial lever, not just a technical decision.** The self-hosted tier handles the common case well; the cloud tier handles scale. The boundary between them is defined by generation complexity, not by features — which means the upgrade conversation is about capability, not lock-in.

---

### 5 — Compose / Decompose Expressions: Structured Model

Compose and decompose rules are stored as structured objects — not free text. Each expression is an object with: operation type, ordered list of field references, separator or format pattern, and an optional formula for complex cases.

**Example (stored structure):**
```json
{
  "type": "compose",
  "fields": ["countryCode", "cityCode", "number"],
  "pattern": "{countryCode} {cityCode} {number}"
}
```

**Rationale:** A structured model allows the tool to validate that all referenced sub-fields exist, render the expression into multiple output formats (TypeScript template literal, C# string interpolation, mapping language syntax) without regex parsing, and display it cleanly in the UI. Free text moves complexity into every consumer of the expression and makes validation impossible.

---

## Resulting Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Docker Compose                    │
│                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │     Frontend         │  │      Backend API      │ │
│  │   React SPA          │  │   REST + /trace       │ │
│  │   served by Nginx    │  │                       │ │
│  └──────────┬───────────┘  │  ┌────────────────┐  │ │
│             │  HTTP        │  │ Registry       │  │ │
│             └──────────────┤  │ Mapping        │  │ │
│                            │  │ Spec Generator │  │ │
│                            │  │ Trace Engine   │  │ │
│                            │  └────────┬───────┘  │ │
│                            └───────────┼───────────┘ │
│                                        │             │
│                          ┌─────────────▼──────────┐  │
│                          │      PostgreSQL         │  │
│                          └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Three internal service layers in the backend:**
- **Registry service** — CRUD for canonical fields, systems, entities, mappings, propagation chains
- **Trace engine** — graph traversal queries, conflict detection, coverage calculation
- **Spec generator** — transforms registry state into OpenAPI, JSON Schema, AsyncAPI documents

---

## Cloud Tier Strategy

**Free cloud tier: limited, not full.**

A permanently free and fully-featured cloud tier is not viable:
- Infrastructure has a real cost — free users subsidised indefinitely erodes margin
- Integration mapping data is sensitive client data — a free tier with no commitment creates GDPR and data residency liability
- Free full-featured cloud competes directly with the self-hosted paid license, undermining the monetisation model

**The right model:**

| Tier | What It Is | Limit |
|------|-----------|-------|
| **Self-hosted free (open core)** | Full basic features, Docker, own infrastructure | Feature-limited (no spec versioning, no code gen, no team access) |
| **Self-hosted paid license** | Full features, own infrastructure | Annual license fee |
| **Cloud free** | Hosted, managed, no Docker required | 1 workspace, 3 systems, 50 canonical fields — enough to evaluate, not enough to run a real project |
| **Cloud paid** | Full features, managed, scalable spec/code generation | Monthly or annual subscription |

**The cloud free tier is a conversion funnel, not a product tier.** Its job is to remove the Docker barrier for evaluation — not to replace the self-hosted offering. Users who outgrow the cloud free tier either pay for cloud or migrate to self-hosted.

**Migration in both directions must be trivial:** full workspace export as JSON from cloud → import to self-hosted, and vice versa. This is what makes the cloud tier non-threatening to self-hosted users — they can always leave. That trust is what makes them willing to try cloud in the first place.

---

## Consequences

- Backend must expose a clean versioned API (`/api/v1/`) from day one
- PostgreSQL schema must be designed for recursive traversal from the start — adding the entity layer or propagation chains as an afterthought is expensive
- The structured expression model requires defining the expression schema before any mapping UI is built
- Docker Compose configuration must be production-ready at MVP — self-hosted is the delivery model, not a dev convenience
- Data export/import (full workspace as JSON) must be in MVP to support cloud ↔ self-hosted migration
