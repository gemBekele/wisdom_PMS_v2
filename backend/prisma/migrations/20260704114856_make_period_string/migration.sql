/*
  Warnings:

  - Changed the type of `period` on the `performance_scores` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "performance_scores" DROP COLUMN "period",
ADD COLUMN     "period" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "performance_scores_userId_period_year_month_idx" ON "performance_scores"("userId", "period", "year", "month");

-- CreateIndex
CREATE INDEX "performance_scores_branchId_period_year_idx" ON "performance_scores"("branchId", "period", "year");
