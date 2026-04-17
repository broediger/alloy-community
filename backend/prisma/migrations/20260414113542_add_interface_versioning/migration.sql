-- CreateEnum
CREATE TYPE "InterfaceVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateTable
CREATE TABLE "interface_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "interface_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "status" "InterfaceVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "interface_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interface_version_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interface_version_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interface_version_diffs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "previous_version_id" UUID,
    "diff" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interface_version_diffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interface_versions_interface_id_label_key" ON "interface_versions"("interface_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "interface_version_snapshots_version_id_key" ON "interface_version_snapshots"("version_id");

-- AddForeignKey
ALTER TABLE "interface_versions" ADD CONSTRAINT "interface_versions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interface_versions" ADD CONSTRAINT "interface_versions_interface_id_fkey" FOREIGN KEY ("interface_id") REFERENCES "interfaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interface_version_snapshots" ADD CONSTRAINT "interface_version_snapshots_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "interface_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interface_version_diffs" ADD CONSTRAINT "interface_version_diffs_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "interface_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
