-- CreateTable
CREATE TABLE "system_settings" (
    "_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- Seed default balance source to approval (approval method drives balances until CBS is used)
INSERT INTO "system_settings" ("_id", "key", "value", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'balance_source', 'approval', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Audit enums
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'Balance Source Updated';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'SystemSetting';
