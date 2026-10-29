-- AlterTable
ALTER TABLE "areas" ADD COLUMN     "regionId" TEXT;

-- CreateTable
CREATE TABLE "regions" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- CreateIndex
CREATE INDEX "areas_regionId_idx" ON "areas"("regionId");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
