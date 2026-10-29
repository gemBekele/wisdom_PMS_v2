-- Token revocation support
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CBS import idempotency
ALTER TABLE "cbs_validations" ADD COLUMN IF NOT EXISTS "fileHash" TEXT;

-- De-duplicate before adding unique constraints
DELETE FROM "staff_plans" a
USING "staff_plans" b
WHERE a."branchPlanId" = b."branchPlanId"
  AND a."userId" = b."userId"
  AND (a."createdAt" < b."createdAt" OR (a."createdAt" = b."createdAt" AND a."_id" < b."_id"));

DELETE FROM "task_approvals" a
USING "task_approvals" b
WHERE a."taskId" = b."taskId"
  AND a."approverId" = b."approverId"
  AND (a."createdAt" < b."createdAt" OR (a."createdAt" = b."createdAt" AND a."_id" < b."_id"));

DELETE FROM "performance_scores" a
USING "performance_scores" b
WHERE a."userId" = b."userId"
  AND a."period" = b."period"
  AND a."year" = b."year"
  AND a."month" = b."month"
  AND a."month" IS NOT NULL
  AND (a."createdAt" < b."createdAt" OR (a."createdAt" = b."createdAt" AND a."_id" < b."_id"));

CREATE UNIQUE INDEX IF NOT EXISTS "cbs_validations_branchId_fileHash_key"
  ON "cbs_validations"("branchId", "fileHash");

CREATE UNIQUE INDEX IF NOT EXISTS "staff_plans_branchPlanId_userId_key"
  ON "staff_plans"("branchPlanId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "task_approvals_taskId_approverId_key"
  ON "task_approvals"("taskId", "approverId");

CREATE UNIQUE INDEX IF NOT EXISTS "performance_scores_userId_period_year_month_key"
  ON "performance_scores"("userId", "period", "year", "month");
