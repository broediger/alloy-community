---
title: "ADR-003: Database Schema"
status: Decided
date: 2026-03-13
tags:
  - interface-manager
  - database
  - schema
  - adr
related:
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-001-application-architecture]]"
  - "[[30-projects/10-ideas/interface-manager/decisions/ADR-002-tech-stack]]"
  - "[[30-projects/10-ideas/interface-manager/requirements]]"
---

# ADR-003: Database Schema

## Status

Decided

---

## Schema Decisions

| # | Decision | Choice |
|---|---------|--------|
| 1 | Workspace isolation | `workspace_id` on all tables, enforced via Fastify middleware (MVP). Migrate to schema-per-workspace (PostgreSQL schemas) as prerequisite for cloud tier. |
| 2 | Canonical model structure | Three separate tables: `canonical_entities`, `canonical_fields`, `canonical_subfields`. Max 2 levels — sub-fields cannot themselves be composite. |
| 3 | Entity relationships | First-class `system_entity_relationships` table. Data model in MVP, UI deferred. |
| 4 | Propagation chain ordering | `position` integer column. Simple, readable, sufficient — reordering is rare. |
| 5 | Transformation rules | Base `transformation_rules` table with JSONB `config` for non-relational data (patterns, formulas). Separate junction tables for relational data (value map entries, compose/decompose field references). |
| 6 | Interface field selections | `interface_fields` stores only `canonical_field_id` + `status`. Source/target field resolution is derived at read time via `mappings` — not stored, to avoid sync drift when mappings change. |
| 7 | ID strategy | UUID v7 — time-ordered, globally unique. Required for cloud migration path and conflict-free import/export. |
| 8 | Deletion behaviour | `ON DELETE RESTRICT` for core registry records with application-layer warning guard. `ON DELETE CASCADE` for dependent junction records (chain steps, interface fields, transformation rules, examples). |
| 9 | Mapping canonical target | Two nullable columns (`canonical_field_id`, `canonical_subfield_id`) with a check constraint enforcing exactly one is set. |

---

## Full Schema

### workspaces
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| name | varchar | |
| slug | varchar UNIQUE | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### canonical_entities
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| name | varchar | |
| slug | varchar | UNIQUE(workspace_id, slug) |
| description | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### canonical_fields
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| entity_id | uuid FK → canonical_entities | RESTRICT |
| name | varchar | slug — UNIQUE(entity_id, name) |
| display_name | varchar | |
| description | text nullable | |
| data_type | enum | string, integer, decimal, boolean, date, datetime, enum, object, array |
| format | varchar nullable | e.g. date-time, email, uri |
| nullable | boolean default true | |
| min_value | varchar nullable | stored as string — applies to numeric range and string length |
| max_value | varchar nullable | |
| is_composite | boolean default false | true = has canonical_subfields |
| composition_pattern | text nullable | expression deriving composite value from sub-fields |
| tags | varchar[] nullable | PostgreSQL array |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### canonical_subfields
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| parent_field_id | uuid FK → canonical_fields | RESTRICT — parent must have is_composite = true |
| name | varchar | UNIQUE(parent_field_id, name) |
| display_name | varchar | |
| description | text nullable | |
| data_type | enum | same as canonical_fields |
| format | varchar nullable | |
| nullable | boolean default true | |
| position | integer | ordering within the composite |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### canonical_field_examples
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| canonical_field_id | uuid FK → canonical_fields | CASCADE |
| value | varchar | |
| created_at | timestamptz | |

---

### canonical_enum_values
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| canonical_field_id | uuid FK → canonical_fields | CASCADE |
| code | varchar | machine value — UNIQUE(canonical_field_id, code) |
| label | varchar | human-readable label |
| position | integer | display order |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### systems
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| name | varchar | UNIQUE(workspace_id, name) |
| description | text nullable | |
| system_type | enum | rest, soap, event, flat_file, other |
| base_url | varchar nullable | |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### system_entities
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| system_id | uuid FK → systems | RESTRICT |
| name | varchar | |
| slug | varchar | UNIQUE(system_id, slug) |
| description | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### system_fields
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| entity_id | uuid FK → system_entities | RESTRICT |
| name | varchar | local field name — UNIQUE(entity_id, name) |
| path | varchar nullable | full payload path e.g. `address.line1` |
| data_type | varchar | system-native type label |
| format | varchar nullable | |
| nullable | boolean default true | |
| required | boolean default false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### system_entity_relationships
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| source_entity_id | uuid FK → system_entities | RESTRICT |
| target_entity_id | uuid FK → system_entities | RESTRICT |
| via_field_id | uuid FK → system_fields | RESTRICT — the lookup field on the source entity |
| relationship_type | enum | lookup, parent, one_to_many, many_to_many |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### mappings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| canonical_field_id | uuid nullable FK → canonical_fields | RESTRICT |
| canonical_subfield_id | uuid nullable FK → canonical_subfields | RESTRICT |
| system_field_id | uuid nullable FK → system_fields | RESTRICT — null for COMPOSE and DECOMPOSE rules where system fields are in the rule tables |
| notes | text nullable | |
| deprecated | boolean default false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| CHECK | | exactly one of canonical_field_id / canonical_subfield_id is not null |
| CHECK | | system_field_id is required unless transformation_rule.type is COMPOSE or DECOMPOSE — enforced at application layer |

---

### transformation_rules
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| mapping_id | uuid FK → mappings | CASCADE |
| type | enum | rename, type_cast, value_map, conditional, formula, compose, decompose |
| config | jsonb nullable | non-relational data: patterns, formulas, type cast specs |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### value_map_entries
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| rule_id | uuid FK → transformation_rules | CASCADE |
| from_value | varchar | UNIQUE(rule_id, from_value) |
| to_value | varchar | |
| bidirectional | boolean default false | tool derives reverse mapping when true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### compose_rule_fields
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| rule_id | uuid FK → transformation_rules | CASCADE |
| system_field_id | uuid FK → system_fields | RESTRICT — the source system field being composed |
| subfield_id | uuid FK → canonical_subfields | RESTRICT — the canonical subfield it feeds into |
| position | integer | UNIQUE(rule_id, position) |
| created_at | timestamptz | |

> Symmetric with `decompose_rule_fields`: compose maps `system_field → subfield`, decompose maps `subfield → system_field`. Enables validation that all subfields of a composite canonical field are covered by the rule.

---

### decompose_rule_fields
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| rule_id | uuid FK → transformation_rules | CASCADE |
| subfield_id | uuid FK → canonical_subfields | RESTRICT |
| system_field_id | uuid FK → system_fields | RESTRICT |
| position | integer | UNIQUE(rule_id, position) |
| created_at | timestamptz | |

---

### propagation_chains
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| canonical_field_id | uuid FK → canonical_fields | RESTRICT |
| system_id | uuid FK → systems | RESTRICT — chain is scoped to a single system; all steps must belong to this system |
| name | varchar | |
| description | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### propagation_chain_steps
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| chain_id | uuid FK → propagation_chains | CASCADE |
| system_field_id | uuid FK → system_fields | RESTRICT |
| position | integer | UNIQUE(chain_id, position) |
| step_type | enum | conversion, lookup |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### interfaces
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| workspace_id | uuid FK → workspaces | RESTRICT |
| name | varchar | |
| description | text nullable | |
| source_system_id | uuid FK → systems | RESTRICT |
| target_system_id | uuid FK → systems | RESTRICT |
| direction | enum | request_response, event |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### interface_fields
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (v7) PK | |
| interface_id | uuid FK → interfaces | CASCADE |
| canonical_field_id | uuid FK → canonical_fields | RESTRICT |
| status | enum | mandatory, optional, excluded |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE | | (interface_id, canonical_field_id) |

> Source and target system field resolution is derived at read time by joining `mappings` against the interface's source and target systems. Missing mappings are surfaced as derived state, not stored nulls. This avoids sync drift if a mapping changes after the interface field was created.

---

## Table Count

| Domain | Tables |
|--------|--------|
| Workspace | 1 |
| Canonical model | 5 (entities, fields, subfields, examples, enum values) |
| Systems | 3 (systems, entities, fields) |
| Entity relationships | 1 |
| Mappings | 4 (mappings, transformation rules, value map entries, compose/decompose rule fields × 2) |
| Propagation | 2 (chains, steps) |
| Interfaces | 2 (interfaces, interface fields) |
| **Total** | **18** |

---

## Notes

- **`created_by` / `updated_by` columns** deferred to post-MVP when multi-user access is introduced
- **Spec version storage** (post-MVP) will require a `spec_versions` table — designed to sit alongside `interfaces` with a FK reference and an immutable `content` JSONB column
- **Cloud migration:** replacing the `workspace_id` filter pattern with PostgreSQL schema-per-workspace requires moving each workspace's rows into a dedicated schema. UUID v7 IDs ensure no collision during migration. The Prisma schema will need to be adapted to support dynamic schema switching at that point.
