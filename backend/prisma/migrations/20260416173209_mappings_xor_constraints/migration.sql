-- Enforce mapping invariants at the database level in addition to the
-- application-layer checks in services/mappings/mappings.ts create().
--
-- Invariant 1: exactly one of canonical_field_id OR canonical_subfield_id is set.
-- Invariant 2: at most one of system_field_id OR system_entity_id is set.
--
-- "At least one of system_field_id / system_entity_id must be set unless the
-- mapping's transformation rule is COMPOSE/DECOMPOSE" is not encoded here —
-- it requires a cross-table lookup and remains an application-layer rule.

ALTER TABLE "mappings"
  ADD CONSTRAINT "mappings_canonical_xor_chk"
  CHECK (
    (canonical_field_id IS NOT NULL) <> (canonical_subfield_id IS NOT NULL)
  );

ALTER TABLE "mappings"
  ADD CONSTRAINT "mappings_system_not_both_chk"
  CHECK (
    NOT (system_field_id IS NOT NULL AND system_entity_id IS NOT NULL)
  );
