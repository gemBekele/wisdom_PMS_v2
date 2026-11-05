-- Daily standing dashboard support
ALTER TABLE "account_mappings" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "daily_kpi_snapshots" (
    "_id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "kpiCategory" "KpiCategory" NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "juneBaseline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "growth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeAccounts" INTEGER NOT NULL DEFAULT 0,
    "newAccounts" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'CRON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_kpi_snapshots_pkey" PRIMARY KEY ("_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_kpi_snapshots_branchId_kpiCategory_snapshotDate_key"
    ON "daily_kpi_snapshots"("branchId", "kpiCategory", "snapshotDate");

CREATE INDEX IF NOT EXISTS "daily_kpi_snapshots_snapshotDate_branchId_idx"
    ON "daily_kpi_snapshots"("snapshotDate", "branchId");

ALTER TABLE "daily_kpi_snapshots"
    ADD CONSTRAINT "daily_kpi_snapshots_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
