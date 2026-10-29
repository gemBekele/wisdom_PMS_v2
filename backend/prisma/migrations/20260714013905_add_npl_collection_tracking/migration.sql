-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('Pending', 'Paid', 'Partial', 'Missed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "KpiCategory" ADD VALUE 'Collection Rate';
ALTER TYPE "KpiCategory" ADD VALUE 'Portfolio Quality';

-- AlterTable
ALTER TABLE "account_mappings" ADD COLUMN     "interest_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "last_payment_date" TIMESTAMP(3),
ADD COLUMN     "loan_disbursement_date" TIMESTAMP(3),
ADD COLUMN     "loan_maturity_date" TIMESTAMP(3),
ADD COLUMN     "loan_principal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "next_payment_date" TIMESTAMP(3),
ADD COLUMN     "payment_frequency" "PaymentFrequency";

-- CreateTable
CREATE TABLE "loan_schedules" (
    "_id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "expectedAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'Pending',
    "paidDate" TIMESTAMP(3),
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_schedules_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "npl_snapshots" (
    "_id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "totalPortfolio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "par1Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "par30Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "par90Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "par1Ratio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "par30Ratio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "par90Ratio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLoans" INTEGER NOT NULL DEFAULT 0,
    "par1Count" INTEGER NOT NULL DEFAULT 0,
    "par30Count" INTEGER NOT NULL DEFAULT 0,
    "par90Count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npl_snapshots_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "loan_schedules_accountId_expectedDate_idx" ON "loan_schedules"("accountId", "expectedDate");

-- CreateIndex
CREATE INDEX "loan_schedules_status_idx" ON "loan_schedules"("status");

-- CreateIndex
CREATE INDEX "loan_schedules_expectedDate_idx" ON "loan_schedules"("expectedDate");

-- CreateIndex
CREATE INDEX "npl_snapshots_branchId_snapshotDate_idx" ON "npl_snapshots"("branchId", "snapshotDate");

-- CreateIndex
CREATE INDEX "npl_snapshots_snapshotDate_idx" ON "npl_snapshots"("snapshotDate");

-- AddForeignKey
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account_mappings"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npl_snapshots" ADD CONSTRAINT "npl_snapshots_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;
