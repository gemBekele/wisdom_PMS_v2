-- Add audit actions/entities used by controllers but missing from the enums.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'Plan Created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'Bulk Mapping Upload';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'Baseline Balance Import';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'Baseline Activation';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'Product Mapping';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'Transaction';

ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'JuneBalance';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'ProductKpiMapping';

-- Remove indexes that duplicate unique constraints.
DROP INDEX IF EXISTS "account_mappings_accountNumber_idx";

-- De-duplicate NPL snapshots before enforcing uniqueness.
DELETE FROM "npl_snapshots" a
USING "npl_snapshots" b
WHERE a."branchId" = b."branchId"
  AND a."snapshotDate" = b."snapshotDate"
  AND a."createdAt" < b."createdAt";

DROP INDEX IF EXISTS "npl_snapshots_branchId_snapshotDate_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "npl_snapshots_branchId_snapshotDate_key"
  ON "npl_snapshots"("branchId", "snapshotDate");

-- Hot-path indexes.
CREATE INDEX IF NOT EXISTS "users_branch_code_idx" ON "users"("branch_code");
CREATE INDEX IF NOT EXISTS "users_branchId_isActive_role_idx" ON "users"("branchId", "isActive", "role");

CREATE INDEX IF NOT EXISTS "account_mappings_mappedToId_status_idx" ON "account_mappings"("mappedToId", "status");
CREATE INDEX IF NOT EXISTS "account_mappings_accountType_status_branchId_idx" ON "account_mappings"("accountType", "status", "branchId");
CREATE INDEX IF NOT EXISTS "account_mappings_branchId_updatedAt_idx" ON "account_mappings"("branchId", "updatedAt");
CREATE INDEX IF NOT EXISTS "account_mappings_product_idx" ON "account_mappings"("product");

CREATE INDEX IF NOT EXISTS "daily_tasks_branchId_approvalStatus_createdAt_idx" ON "daily_tasks"("branchId", "approvalStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "daily_tasks_submittedById_approvalStatus_createdAt_idx" ON "daily_tasks"("submittedById", "approvalStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "daily_tasks_accountId_approvalStatus_taskDate_idx" ON "daily_tasks"("accountId", "approvalStatus", "taskDate");
CREATE INDEX IF NOT EXISTS "daily_tasks_cbsValidationId_idx" ON "daily_tasks"("cbsValidationId");

CREATE INDEX IF NOT EXISTS "loan_schedules_accountId_status_expectedDate_idx" ON "loan_schedules"("accountId", "status", "expectedDate");

CREATE INDEX IF NOT EXISTS "june_balances_is_active_idx" ON "june_balances"("is_active");

CREATE INDEX IF NOT EXISTS "cbs_validations_validationDate_idx" ON "cbs_validations"("validationDate");
CREATE INDEX IF NOT EXISTS "cbs_validations_createdAt_idx" ON "cbs_validations"("createdAt");
CREATE INDEX IF NOT EXISTS "cbs_validations_branchId_createdAt_idx" ON "cbs_validations"("branchId", "createdAt");

CREATE INDEX IF NOT EXISTS "staff_plans_userId_status_period_idx" ON "staff_plans"("userId", "status", "period");

CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

CREATE INDEX IF NOT EXISTS "task_approvals_approverId_status_idx" ON "task_approvals"("approverId", "status");

CREATE INDEX IF NOT EXISTS "plans_status_period_idx" ON "plans"("status", "period");
