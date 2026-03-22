-- CreateEnum
CREATE TYPE "DataType" AS ENUM ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY');

-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('REST', 'SOAP', 'EVENT', 'FLAT_FILE', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('LOOKUP', 'PARENT', 'ONE_TO_MANY', 'MANY_TO_MANY');

-- CreateEnum
CREATE TYPE "TransformationRuleType" AS ENUM ('RENAME', 'TYPE_CAST', 'VALUE_MAP', 'CONDITIONAL', 'FORMULA', 'COMPOSE', 'DECOMPOSE');

-- CreateEnum
CREATE TYPE "PropagationStepType" AS ENUM ('CONVERSION', 'LOOKUP');

-- CreateEnum
CREATE TYPE "InterfaceDirection" AS ENUM ('REQUEST_RESPONSE', 'EVENT');

-- CreateEnum
CREATE TYPE "InterfaceFieldStatus" AS ENUM ('MANDATORY', 'OPTIONAL', 'EXCLUDED');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canonical_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "data_type" "DataType" NOT NULL,
    "format" TEXT,
    "nullable" BOOLEAN NOT NULL DEFAULT true,
    "min_value" TEXT,
    "max_value" TEXT,
    "is_composite" BOOLEAN NOT NULL DEFAULT false,
    "composition_pattern" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canonical_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_subfields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "parent_field_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "data_type" "DataType" NOT NULL,
    "format" TEXT,
    "nullable" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canonical_subfields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_field_examples" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "canonical_field_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canonical_field_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_enum_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "canonical_field_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canonical_enum_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system_type" "SystemType" NOT NULL,
    "base_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "system_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "data_type" TEXT NOT NULL,
    "format" TEXT,
    "nullable" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_entity_relationships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "source_entity_id" UUID NOT NULL,
    "target_entity_id" UUID NOT NULL,
    "via_field_id" UUID NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_entity_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "canonical_field_id" UUID,
    "canonical_subfield_id" UUID,
    "system_field_id" UUID,
    "notes" TEXT,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transformation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mapping_id" UUID NOT NULL,
    "type" "TransformationRuleType" NOT NULL,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transformation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_map_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "from_value" TEXT NOT NULL,
    "to_value" TEXT NOT NULL,
    "bidirectional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "value_map_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compose_rule_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "system_field_id" UUID NOT NULL,
    "subfield_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compose_rule_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decompose_rule_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "subfield_id" UUID NOT NULL,
    "system_field_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decompose_rule_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propagation_chains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "canonical_field_id" UUID NOT NULL,
    "system_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propagation_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propagation_chain_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chain_id" UUID NOT NULL,
    "system_field_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "step_type" "PropagationStepType" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propagation_chain_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interfaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source_system_id" UUID NOT NULL,
    "target_system_id" UUID NOT NULL,
    "direction" "InterfaceDirection" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interfaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interface_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interface_id" UUID NOT NULL,
    "canonical_field_id" UUID NOT NULL,
    "status" "InterfaceFieldStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interface_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_version_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_version_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_version_diffs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "previous_version_id" UUID,
    "diff" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_version_diffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_entities_workspace_id_slug_key" ON "canonical_entities"("workspace_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_fields_entity_id_name_key" ON "canonical_fields"("entity_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_subfields_parent_field_id_name_key" ON "canonical_subfields"("parent_field_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_enum_values_canonical_field_id_code_key" ON "canonical_enum_values"("canonical_field_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "systems_workspace_id_name_key" ON "systems"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "system_entities_system_id_slug_key" ON "system_entities"("system_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "system_fields_entity_id_name_key" ON "system_fields"("entity_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "transformation_rules_mapping_id_key" ON "transformation_rules"("mapping_id");

-- CreateIndex
CREATE UNIQUE INDEX "value_map_entries_rule_id_from_value_key" ON "value_map_entries"("rule_id", "from_value");

-- CreateIndex
CREATE UNIQUE INDEX "compose_rule_fields_rule_id_position_key" ON "compose_rule_fields"("rule_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "decompose_rule_fields_rule_id_position_key" ON "decompose_rule_fields"("rule_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "propagation_chain_steps_chain_id_position_key" ON "propagation_chain_steps"("chain_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "interface_fields_interface_id_canonical_field_id_key" ON "interface_fields"("interface_id", "canonical_field_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_workspace_id_label_key" ON "model_versions"("workspace_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "model_version_snapshots_version_id_key" ON "model_version_snapshots"("version_id");

-- AddForeignKey
ALTER TABLE "canonical_entities" ADD CONSTRAINT "canonical_entities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_fields" ADD CONSTRAINT "canonical_fields_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_fields" ADD CONSTRAINT "canonical_fields_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "canonical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_subfields" ADD CONSTRAINT "canonical_subfields_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_subfields" ADD CONSTRAINT "canonical_subfields_parent_field_id_fkey" FOREIGN KEY ("parent_field_id") REFERENCES "canonical_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_field_examples" ADD CONSTRAINT "canonical_field_examples_canonical_field_id_fkey" FOREIGN KEY ("canonical_field_id") REFERENCES "canonical_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_enum_values" ADD CONSTRAINT "canonical_enum_values_canonical_field_id_fkey" FOREIGN KEY ("canonical_field_id") REFERENCES "canonical_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_entities" ADD CONSTRAINT "system_entities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_entities" ADD CONSTRAINT "system_entities_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_fields" ADD CONSTRAINT "system_fields_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_fields" ADD CONSTRAINT "system_fields_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "system_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_entity_relationships" ADD CONSTRAINT "system_entity_relationships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_entity_relationships" ADD CONSTRAINT "system_entity_relationships_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "system_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_entity_relationships" ADD CONSTRAINT "system_entity_relationships_target_entity_id_fkey" FOREIGN KEY ("target_entity_id") REFERENCES "system_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_entity_relationships" ADD CONSTRAINT "system_entity_relationships_via_field_id_fkey" FOREIGN KEY ("via_field_id") REFERENCES "system_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_canonical_field_id_fkey" FOREIGN KEY ("canonical_field_id") REFERENCES "canonical_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_canonical_subfield_id_fkey" FOREIGN KEY ("canonical_subfield_id") REFERENCES "canonical_subfields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_system_field_id_fkey" FOREIGN KEY ("system_field_id") REFERENCES "system_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transformation_rules" ADD CONSTRAINT "transformation_rules_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_map_entries" ADD CONSTRAINT "value_map_entries_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "transformation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compose_rule_fields" ADD CONSTRAINT "compose_rule_fields_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "transformation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compose_rule_fields" ADD CONSTRAINT "compose_rule_fields_system_field_id_fkey" FOREIGN KEY ("system_field_id") REFERENCES "system_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compose_rule_fields" ADD CONSTRAINT "compose_rule_fields_subfield_id_fkey" FOREIGN KEY ("subfield_id") REFERENCES "canonical_subfields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decompose_rule_fields" ADD CONSTRAINT "decompose_rule_fields_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "transformation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decompose_rule_fields" ADD CONSTRAINT "decompose_rule_fields_subfield_id_fkey" FOREIGN KEY ("subfield_id") REFERENCES "canonical_subfields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decompose_rule_fields" ADD CONSTRAINT "decompose_rule_fields_system_field_id_fkey" FOREIGN KEY ("system_field_id") REFERENCES "system_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propagation_chains" ADD CONSTRAINT "propagation_chains_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propagation_chains" ADD CONSTRAINT "propagation_chains_canonical_field_id_fkey" FOREIGN KEY ("canonical_field_id") REFERENCES "canonical_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propagation_chains" ADD CONSTRAINT "propagation_chains_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propagation_chain_steps" ADD CONSTRAINT "propagation_chain_steps_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "propagation_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propagation_chain_steps" ADD CONSTRAINT "propagation_chain_steps_system_field_id_fkey" FOREIGN KEY ("system_field_id") REFERENCES "system_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_source_system_id_fkey" FOREIGN KEY ("source_system_id") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_target_system_id_fkey" FOREIGN KEY ("target_system_id") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interface_fields" ADD CONSTRAINT "interface_fields_interface_id_fkey" FOREIGN KEY ("interface_id") REFERENCES "interfaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interface_fields" ADD CONSTRAINT "interface_fields_canonical_field_id_fkey" FOREIGN KEY ("canonical_field_id") REFERENCES "canonical_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_version_snapshots" ADD CONSTRAINT "model_version_snapshots_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "model_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_version_diffs" ADD CONSTRAINT "model_version_diffs_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "model_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
