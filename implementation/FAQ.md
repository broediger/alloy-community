# Alloy FAQ

This file is indexed by the Alloy Assistant chatbot to answer user questions.

## What is a workspace?

A workspace is a top-level container for one set of integrations — typically one client or product. Canonical entities, systems, mappings, interfaces, and versions all live inside a workspace.

## What is the canonical model?

The canonical model is the system-neutral vocabulary for your integrations. It consists of **canonical entities** (e.g. Customer, Address) which group related **canonical fields** (e.g. email, street, city). Everything in Alloy derives from this model.

## What's a system?

A system is a connected application (e.g. Salesforce, SAP, Dynamics 365). It has its own entities and fields, which are mapped to canonical fields.

## What's a mapping?

A mapping links a canonical field to a system field with a transformation rule. Rule types: RENAME, TYPE_CAST, VALUE_MAP, COMPOSE, DECOMPOSE.

## What's a transformation rule?

- **Rename**: field name differs but value is identical
- **Type cast**: convert between data types (string ↔ integer)
- **Value map**: lookup table (e.g. "active" → 1, "inactive" → 0)
- **Compose**: multiple system fields merge into one canonical
- **Decompose**: one canonical splits into multiple system fields

## What's an interface?

An interface is a directed contract between a source and target system, listing which canonical fields participate. Each field can be MANDATORY, OPTIONAL, or EXCLUDED.

## What's a propagation chain?

A propagation chain tracks how a value flows through entities within a single system (e.g. Lead.email → Opportunity.email → Account.email).

## What's an entity reference?

A canonical field can reference another canonical entity with a cardinality (1:1 or 1:n). Example: `Customer.addresses` references the Address entity with cardinality MANY (a customer has many addresses).

## How do I file a bug or feature request?

Just ask the Alloy Assistant: "I found a bug: …" or "Could we have a feature for …". The assistant will draft an issue and ask you to confirm before filing it.
