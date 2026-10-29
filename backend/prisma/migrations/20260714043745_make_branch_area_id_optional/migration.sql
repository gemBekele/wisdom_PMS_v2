-- DropForeignKey
ALTER TABLE "branches" DROP CONSTRAINT "branches_areaId_fkey";

-- AlterTable
ALTER TABLE "branches" ALTER COLUMN "areaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
