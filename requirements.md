---
title: Interface Manager — Requirements
status: Draft
created: 2026-03-12
tags:
  - interface-manager
  - requirements
related:
  - "[[30-projects/10-ideas/interface-manager/_index]]"
  - "[[30-projects/10-ideas/interface-manager/competitive-analysis]]"
---

# Interface Manager — Requirements

---

## Vision

A standalone web application that replaces Excel-based integration mapping files with a queryable, traceable registry — and generates interface definition files and code artifacts directly from the mappings defined in it.

**The source of truth is the canonical model. Everything else is derived from it.**

---

## Users

### Primary User — Integration Architect / Developer
- Managing 3+ system integrations where field names diverge across systems
- Currently maintaining mapping definitions in Excel
- Needs to trace a field across systems, generate specs for handover, and onboard others onto the integration contracts

### Secondary User — Technical Stakeholder / Reviewer
- Needs to review and sign off on integration contracts without maintaining them
- Read-only access to mappings, field definitions, and generated specs

---

## Core Concepts

| Concept | Definition |
|---------|-----------|
| **Workspace** | A logical container for a set of integrations — typically one client or one product |
| **Canonical field** | The system-neutral definition of a concept: name, type, description, examples, validation rules |
| **Composite canonical field** | A canonical field composed of named sub-fields (e.g. `phone` with sub-fields `countryCode`, `cityCode`, `number`). Systems may map to the composite or to individual sub-fields. |
| **System** | A connected application (e.g. Dynamics 365, SAP, a custom REST API) |
| **Entity** | A named data structure within a system (e.g. Lead, Opportunity, Account within Dynamics 365). Fields belong to entities, not directly to systems. |
| **System field** | The system-specific representation of a canonical field, belonging to an entity: local name, local type, path/location in payload |
| **Mapping** | The relation between a canonical field (or sub-field) and a system field, including the transformation rule |
| **Transformation rule** | How the value is converted: rename, type cast, value map, conditional, formula, compose, or decompose |
| **Compose rule** | A transformation that merges multiple system fields into one canonical field (e.g. `countryCode` + `cityCode` + `number` → `phone`) |
| **Decompose rule** | A transformation that splits one canonical field into multiple system fields (e.g. `phone` → `countryCode` + `cityCode` + `number`) |
| **Propagation chain** | An ordered sequence of entity fields within a system that a canonical value passes through on entity conversion (e.g. Lead.street → Opportunity.street → Account.street) |
| **Interface** | A directed contract between two systems: source system → target system, for a defined set of canonical fields |
| **Occurrence** | A record of which interfaces and propagation chains use a given canonical field |

---

## Functional Requirements

### FR-1 — Workspace Management

| ID | Requirement |
|----|------------|
| FR-1.1 | User can create, rename, and delete workspaces |
| FR-1.2 | Each workspace has an independent canonical registry, system list, and interface list |
| FR-1.3 | User can invite other users to a workspace with role-based access (editor / viewer) |

---

### FR-2 — Canonical Field Registry

| ID | Requirement |
|----|------------|
| FR-2.1 | User can create a canonical field with: name (slug), display name, description, data type, format, nullable flag, minimum/maximum (for numeric/string), example values (1–3), and tags |
| FR-2.2 | Data types supported: string, integer, decimal, boolean, date, datetime, enum, object, array |
| FR-2.3 | User can edit any property of a canonical field |
| FR-2.4 | User can delete a canonical field — with a warning if active mappings exist |
| FR-2.5 | User can search and filter canonical fields by name, type, tag, or mapped/unmapped status |
| FR-2.6 | User can group canonical fields into entities (e.g. Address, Contact, Order) |
| FR-2.9 | User can define a **composite canonical field** with named sub-fields, each with their own type and description (e.g. `phone` → `countryCode: string`, `cityCode: string`, `number: string`) |
| FR-2.10 | A composition rule can be defined on a composite field: the expression that derives the composite value from its sub-fields (e.g. `"{countryCode} {cityCode} {number}"`) |
| FR-2.7 | A canonical field displays a count of systems it is mapped to and a count of interfaces it appears in |
| FR-2.8 | Enum canonical fields support a defined value list with labels and codes |

---

### FR-3 — System & Entity Management

| ID | Requirement |
|----|------------|
| FR-3.1 | User can create a system with: name, description, type (REST, SOAP, event, flat-file, other), base URL, and notes |
| FR-3.2 | User can edit and delete systems |
| FR-3.3 | User can create entities within a system (e.g. Lead, Opportunity, Account within Dynamics 365) |
| FR-3.4 | Fields belong to entities — a system field is always scoped to a specific entity within the system |
| FR-3.5 | A system view shows all its entities and their field mappings against the canonical registry |
| FR-3.6 | An entity view shows all its fields, their canonical mappings, and mapping coverage |
| FR-3.7 | User can import field definitions from an OpenAPI/Swagger file to pre-populate system entities and fields |
| FR-3.8 | User can import field definitions from a JSON Schema file to pre-populate system entities and fields |
| FR-3.9 | A system displays a mapping coverage percentage (mapped canonical fields / total canonical fields) across all its entities |

---

### FR-4 — Field Mapping

| ID | Requirement |
|----|------------|
| FR-4.1 | User can map a canonical field to a system field, defining: system field name, system field type, path in payload (e.g. `address.line1`), and required/optional flag |
| FR-4.2 | User can define a transformation rule per mapping (see FR-4.3) |
| FR-4.3 | Supported transformation rule types: **Rename** (field name differs, value is identical), **Type cast** (e.g. string → integer), **Value map** (lookup table of canonical value → system value), **Conditional** (if/else based on field value), **Formula** (free-text expression for complex transforms), **Compose** (N system fields → 1 canonical field), **Decompose** (1 canonical field → N system fields) |
| FR-4.3a | Value map rules are unidirectional by default. User can flag a value map as bidirectional — the tool derives and displays the reverse mapping automatically. Bidirectional flag is only available when all value pairs are uniquely reversible; the tool warns if conflicts exist. |
| FR-4.3b | **Compose rule:** User selects multiple system fields (within the same entity) and defines an expression that merges them into a single canonical field value. Example: `"{countryCode} {cityCode} {number}"` → canonical `phone` |
| FR-4.3c | **Decompose rule:** User maps a single canonical field to multiple system fields and defines an expression that splits the canonical value. Example: canonical `phone` → `countryCode`, `cityCode`, `number` via split pattern or formula |
| FR-4.3d | A canonical **composite field** can be mapped either as a whole (system has one combined field) or sub-field by sub-field (system has individual fields per sub-field). Both mappings can coexist across different systems. |
| FR-4.4 | User can add notes and examples to a mapping |
| FR-4.5 | User can mark a mapping as deprecated |
| FR-4.6 | System detects and flags type conflicts: where two systems map to the same canonical field with incompatible types |
| FR-4.7 | System detects and flags missing mappings: canonical fields that exist but have no mapping for a given system |

---

### FR-4b — Propagation Chains

| ID | Requirement |
|----|------------|
| FR-4b.1 | User can define a propagation chain for a canonical field within a system: an ordered sequence of entity fields the value passes through on entity conversion (e.g. Lead.address1_line1 → Opportunity.address1_line1 → Quote.address1_line1 → Account.address1_line1) |
| FR-4b.2 | Each step in a propagation chain references an existing entity field mapping within the same system |
| FR-4b.3 | A propagation chain is displayed in the canonical field detail view, alongside cross-system mappings |
| FR-4b.4 | The relation trace view (FR-6) includes propagation chains — a full end-to-end trace shows inbound system → propagation chain → outbound system |
| FR-4b.5 | A propagation step can carry a note describing the trigger (e.g. "copied on Lead qualification to Opportunity") |

---

### FR-5 — Interface Definition

| ID | Requirement |
|----|------------|
| FR-5.1 | User can create an interface between a source system and a target system |
| FR-5.2 | An interface has: name, description, direction (request/response or event), and a selected set of canonical fields |
| FR-5.3 | An interface view shows the full field contract: canonical field → source system field → target system field, with transformation rules for both legs |
| FR-5.4 | User can flag fields in an interface as mandatory, optional, or excluded |
| FR-5.5 | System flags interfaces where a field has no mapping on either the source or target side |

---

### FR-6 — Relation Tracing

| ID | Requirement |
|----|------------|
| FR-6.1 | From any canonical field: see every system it is mapped to, the system field name, type, and transformation rule |
| FR-6.2 | From any canonical field: see every interface it appears in |
| FR-6.3 | From any system: see its complete field map — every canonical field, with mapping status and transformation rule |
| FR-6.4 | From any interface: see the full source-to-target field contract in a side-by-side view |
| FR-6.5 | A conflict view shows all detected type conflicts and missing mappings across the workspace |
| FR-6.6 | User can search across all mappings by system field name — to find what canonical field a system-specific name maps to |

---

### FR-7 — Interface Definition Export & Spec Versioning (MVP)

| ID | Requirement |
|----|------------|
| FR-7.1 | User can generate an **OpenAPI 3.0** spec for a system, based on its field mappings, using defined types, examples, and required flags |
| FR-7.2 | User can generate a **JSON Schema** for a canonical entity or interface |
| FR-7.3 | Generated specs can be downloaded as `.yaml` or `.json` files |
| FR-7.4 | User can configure which canonical entities and fields are included in a generated spec |
| FR-7.5 | Changes to the canonical model are reflected in re-generated specs — specs are always derived, never manually edited inside the tool |
| FR-7.6 | User can generate an **AsyncAPI 3.0** spec for event-based interfaces |
| FR-7.7 | Every generated spec is assigned a version number and stored immutably — once saved, a spec version cannot be modified, only superseded by a new generation |
| FR-7.8 | User can view the full version history of generated specs per system or interface, including timestamp, who generated it, and which canonical model state it was derived from |
| FR-7.9 | User can download any previously generated spec version at any time |
| FR-7.10 | User can compare two spec versions side by side to identify what changed between them |
| FR-7.11 | A spec version can be marked as **released** — indicating it is in active use by a consumer. Released versions are visually distinguished and cannot be silently superseded without a new explicit generation. |

---

### FR-8 — Code Generation (Post-MVP)

| ID | Requirement |
|----|------------|
| FR-8.1 | User can generate **TypeScript interfaces** per system from its field mappings |
| FR-8.2 | User can generate **C# classes** per system from its field mappings |
| FR-8.3 | User can generate **Zod validation schemas** (TypeScript) from canonical field definitions |
| FR-8.4 | User can generate a **mapper function** between two systems for a defined interface (source → target field mapping, applying transformation rules) |
| FR-8.5 | User can generate **mock payloads** for a system using defined example values |
| FR-8.6 | Generated code is downloaded as files, not executed inside the tool |

---

### FR-9 — Import

| ID | Requirement |
|----|------------|
| FR-9.1 | User can import an existing OpenAPI/Swagger spec to bootstrap a system's field list |
| FR-9.2 | User can import a JSON Schema to bootstrap canonical fields or system fields |
| FR-9.3 | Import creates unmapped fields — the user manually maps them to canonical fields after import |
| FR-9.4 | User can import from a CSV file to bootstrap canonical fields (column headers: name, type, description, example) |

---

## Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NFR-1 | Standalone web application — no dependency on any client's platform or cloud subscription |
| NFR-2 | Data persisted in a relational database |
| NFR-3 | Responsive UI usable in a desktop browser — not required on mobile |
| NFR-4 | All generated file exports complete in under 3 seconds for up to 200 canonical fields |
| NFR-5 | Search results return in under 500ms |
| NFR-6 | Application deployable via Docker — single container or docker-compose |
| NFR-7 | Full data export per workspace as JSON (backup / migration) |

---

## MVP Scope

The MVP proves the core value: **registry → spec generation → relation tracing.**

### In MVP
- FR-1 Workspace management (single user, no invitations)
- FR-2 Canonical field registry including composite fields (FR-2.1–2.10)
- FR-3 System and entity management (manual entry only — no import)
- FR-4 Field mapping: rename, value map (unidirectional + bidirectional opt-in), compose, decompose
- FR-4b Propagation chains (FR-4b.1–4b.5)
- FR-5 Interface definition (basic — field selection only)
- FR-6 Relation tracing (FR-6.1 through FR-6.4) including propagation chain display
- FR-7.1 OpenAPI 3.0 export
- FR-7.2 JSON Schema export
- FR-7.3 File download
- NFR-6 Docker deployment

### Deferred to Post-MVP
- FR-1.3 Multi-user / role-based access
- FR-3.7–3.8 Import from OpenAPI / JSON Schema
- FR-4.3 Type cast, conditional, formula transformation rules
- FR-6.5–6.6 Conflict view and reverse field search
- FR-7.4 Configurable field inclusion
- FR-7.6 AsyncAPI export
- FR-7.7–7.11 Spec versioning (immutable storage, version history, download by version, diff, released flag)
- FR-8 Code generation (full feature area)
- FR-9 Import (full feature area)

---

## Out of Scope

- Runtime integration execution — the tool designs contracts, it does not run them
- Live schema sync from connected systems — import is manual or file-based
- Authentication management for connected systems
- API testing or mocking
- Versioning / change history of the canonical model (post-MVP consideration)

---

## Decisions

| # | Question | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | Does the tool own the canonical model, or import/sync from an external source? | **Import once, then own it (Option B)** | Bootstrap from existing sources (OpenAPI, CSV, Dataverse schema) to reduce setup friction. Interface Manager owns the model after import — no live sync dependency. |
| 2 | How are changes tracked? Are generated specs versioned? | **Spec versioning (Option C) — post-MVP** | Generated specs are versioned, stored, and immutable. Each export gets a version number. Consumers can pin to a spec version. Stored specs can never be modified — only superseded. This is a key selling point: "which version did you build against?" becomes a one-click answer. Deferred from MVP — basic export ships first. |
| 3 | Multi-tenant SaaS or self-hosted? | **Self-hosted (Option B), Open Core monetisation** | Self-hosted via Docker removes operational burden during early adoption. Monetisation model: free open-source core (registry, mapping, basic OpenAPI export) + paid annual license for advanced features (spec versioning, team access, code generation, advanced export formats) + managed hosted tier as the SaaS upgrade path for teams who don't want to run Docker. |
| 4 | Should value map transformation rules support bidirectional mapping? | **Bidirectional as opt-in flag (Option C)** | Unidirectional by default. User can flag a value map as bidirectional; the tool derives the reverse automatically. Not all value maps are reversible — opt-in keeps intent explicit and avoids silent inference on asymmetric maps. |

## Open Questions

*None — all resolved.*

---

## Related

- [[30-projects/10-ideas/interface-manager/_index]] — Project overview
- [[30-projects/10-ideas/interface-manager/competitive-analysis]] — Competitive landscape
