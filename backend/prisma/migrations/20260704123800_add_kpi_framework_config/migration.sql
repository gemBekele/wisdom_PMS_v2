-- CreateTable
CREATE TABLE "kpi_framework_config" (
    "_id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "minBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_framework_config_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpi_framework_config_kpiId_key" ON "kpi_framework_config"("kpiId");
