-- CreateTable
CREATE TABLE "interface_entity_bindings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interface_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "side" TEXT NOT NULL,

    CONSTRAINT "interface_entity_bindings_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data: convert sourceEntityId/targetEntityId to bindings
INSERT INTO "interface_entity_bindings" ("interface_id", "entity_id", "side")
SELECT "id", "source_entity_id", 'SOURCE'
FROM "interfaces"
WHERE "source_entity_id" IS NOT NULL;

INSERT INTO "interface_entity_bindings" ("interface_id", "entity_id", "side")
SELECT "id", "target_entity_id", 'TARGET'
FROM "interfaces"
WHERE "target_entity_id" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "interface_entity_bindings_interface_id_entity_id_side_key" ON "interface_entity_bindings"("interface_id", "entity_id", "side");

-- AddForeignKey
ALTER TABLE "interface_entity_bindings" ADD CONSTRAINT "interface_entity_bindings_interface_id_fkey" FOREIGN KEY ("interface_id") REFERENCES "interfaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interface_entity_bindings" ADD CONSTRAINT "interface_entity_bindings_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "system_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "interfaces" DROP CONSTRAINT IF EXISTS "interfaces_source_entity_id_fkey";
ALTER TABLE "interfaces" DROP CONSTRAINT IF EXISTS "interfaces_target_entity_id_fkey";

-- DropColumns
ALTER TABLE "interfaces" DROP COLUMN IF EXISTS "source_entity_id";
ALTER TABLE "interfaces" DROP COLUMN IF EXISTS "target_entity_id";
