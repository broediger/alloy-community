-- CreateEnum
CREATE TYPE "FieldCardinality" AS ENUM ('ONE', 'MANY');

-- AlterTable
ALTER TABLE "canonical_fields" ADD COLUMN     "cardinality" "FieldCardinality",
ADD COLUMN     "items_data_type" "DataType",
ADD COLUMN     "referenced_entity_id" UUID;

-- AlterTable
ALTER TABLE "mappings" ADD COLUMN     "system_entity_id" UUID;

-- AddForeignKey
ALTER TABLE "canonical_fields" ADD CONSTRAINT "canonical_fields_referenced_entity_id_fkey" FOREIGN KEY ("referenced_entity_id") REFERENCES "canonical_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_system_entity_id_fkey" FOREIGN KEY ("system_entity_id") REFERENCES "system_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
