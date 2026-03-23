-- DropForeignKey
ALTER TABLE "interface_fields" DROP CONSTRAINT "interface_fields_canonical_field_id_fkey";

-- DropIndex
DROP INDEX "interface_fields_interface_id_canonical_field_id_key";

-- AlterTable
ALTER TABLE "interface_fields" ADD COLUMN     "data_type" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "nullable" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "canonical_field_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "interface_fields" ADD CONSTRAINT "interface_fields_canonical_field_id_fkey" FOREIGN KEY ("canonical_field_id") REFERENCES "canonical_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
