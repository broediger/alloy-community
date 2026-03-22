-- AlterTable
ALTER TABLE "interfaces" ADD COLUMN     "source_entity_id" UUID,
ADD COLUMN     "target_entity_id" UUID;

-- AddForeignKey
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "system_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_target_entity_id_fkey" FOREIGN KEY ("target_entity_id") REFERENCES "system_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
