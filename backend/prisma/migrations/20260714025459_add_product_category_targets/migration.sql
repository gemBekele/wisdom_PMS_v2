-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "monthly_plan" JSONB,
ADD COLUMN     "product_category" TEXT,
ADD COLUMN     "target_count" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "staff_plans" ADD COLUMN     "product_category" TEXT,
ADD COLUMN     "target_count" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "plans_branch_code_product_category_period_idx" ON "plans"("branch_code", "product_category", "period");
