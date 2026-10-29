-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'regionalDirector', 'areaManager', 'branchManager', 'lineManager', 'subTeamLeader', 'staff');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('Regional Director', 'Area Manager', 'Branch Manager', 'Member Service Manager (MSM)', 'Accountant', 'Member Service Officer I', 'Member Service Officer II', 'Member Service Officer III');

-- CreateEnum
CREATE TYPE "KpiCategory" AS ENUM ('Deposit Mobilization', 'Digital Channel Growth', 'Member Registration', 'Shareholder Recruitment', 'Loan & NPL', 'Customer Base');

-- CreateEnum
CREATE TYPE "PlanPeriod" AS ENUM ('2025-H2', 'Q4-2025', 'December-2025', '2025');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('Draft', 'Active', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('incremental');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit', 'Loan');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('Active', 'Inactive', 'Transferred');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('Deposit Mobilization', 'Loan Follow-up', 'New Customer', 'Digital Activation', 'Member Registration', 'Shareholder Recruitment');

-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('Mapped to You', 'Mapped to Another Staff', 'Unmapped');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Requested Edit');

-- CreateEnum
CREATE TYPE "EvaluationApprovalStatus" AS ENUM ('Draft', 'Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "PerformancePeriod" AS ENUM ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual');

-- CreateEnum
CREATE TYPE "EvaluationPeriod" AS ENUM ('Monthly', 'Quarterly', 'Annual');

-- CreateEnum
CREATE TYPE "CBSValidationStatus" AS ENUM ('Processing', 'Completed', 'Failed', 'Partial');

-- CreateEnum
CREATE TYPE "DiscrepancyType" AS ENUM ('Amount Mismatch', 'Missing in CBS', 'Missing in PMS', 'Account Mismatch');

-- CreateEnum
CREATE TYPE "PerformanceScoreStatus" AS ENUM ('Draft', 'Calculated', 'Locked', 'Finalized');

-- CreateEnum
CREATE TYPE "PerformanceRating" AS ENUM ('Outstanding', 'Very Good', 'Good', 'Needs Support', 'Unsatisfactory');

-- CreateEnum
CREATE TYPE "ProductMappingStatus" AS ENUM ('active', 'pending', 'inactive');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('Plan Upload', 'Plan Update', 'User Created', 'User Updated', 'User Deleted', 'Mapping Updated', 'Mapping Created', 'Task Created', 'Task Approved', 'Task Rejected', 'Approval', 'KPI Framework Updated', 'Competency Framework Updated', 'CBS Upload', 'CBS Validation', 'Behavioral Evaluation', 'Password Reset', 'Login', 'Logout');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('Plan', 'User', 'Mapping', 'Task', 'CBS', 'Evaluation', 'Framework', 'System');

-- CreateTable
CREATE TABLE "users" (
    "_id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "branchId" TEXT,
    "branch_code" TEXT,
    "sub_team" TEXT,
    "regionId" TEXT,
    "areaId" TEXT,
    "position" "Position" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordToken" TEXT,
    "resetPasswordExpire" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "regions" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "directorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "areas" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "managerId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "sub_teams" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "leaderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_teams_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "plans" (
    "_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "kpi_category" "KpiCategory" NOT NULL,
    "period" TEXT NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_type" "TargetType" NOT NULL DEFAULT 'incremental',
    "status" "PlanStatus" NOT NULL DEFAULT 'Draft',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "staff_plans" (
    "_id" TEXT NOT NULL,
    "branchPlanId" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "kpi_category" "KpiCategory" NOT NULL,
    "period" TEXT NOT NULL,
    "target_type" "TargetType" NOT NULL DEFAULT 'incremental',
    "individual_target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearly_target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weekly_target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daily_target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plan_share_percent" DOUBLE PRECISION NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_plans_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "plan_share_configs" (
    "_id" TEXT NOT NULL,
    "branch_code" TEXT,
    "kpi_category" "KpiCategory" NOT NULL,
    "share_branch_manager" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "share_msm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "share_accountant" DOUBLE PRECISION NOT NULL DEFAULT 13,
    "share_mso" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "total_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_share_configs_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "account_mappings" (
    "_id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "june_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active_status" BOOLEAN NOT NULL DEFAULT false,
    "last_transaction_date" TIMESTAMP(3),
    "mappedToId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mappedById" TEXT,
    "isAutoBalanced" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_mappings_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "daily_tasks" (
    "_id" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "productType" TEXT,
    "accountNumber" TEXT NOT NULL,
    "accountId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "evidence" TEXT,
    "submittedById" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "mappingStatus" "MappingStatus" NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'Pending',
    "cbsValidated" BOOLEAN NOT NULL DEFAULT false,
    "cbsValidatedAt" TIMESTAMP(3),
    "cbsValidationId" TEXT,
    "taskDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performanceImpacted" BOOLEAN NOT NULL DEFAULT false,
    "performanceImpactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "task_approvals" (
    "_id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'Pending',
    "approvedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_approvals_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "performance_scores" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "period" "PerformancePeriod" NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "month" INTEGER,
    "week" INTEGER,
    "day" INTEGER,
    "kpiScores" JSONB NOT NULL DEFAULT '{}',
    "kpiTotalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "behavioralScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "behavioralEvaluationId" TEXT,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" "PerformanceRating",
    "status" "PerformanceScoreStatus" NOT NULL DEFAULT 'Draft',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_scores_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "behavioral_evaluations" (
    "_id" TEXT NOT NULL,
    "evaluatedUserId" TEXT NOT NULL,
    "evaluatedById" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "period" "EvaluationPeriod" NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "month" INTEGER,
    "competencies" JSONB NOT NULL DEFAULT '{}',
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallComments" TEXT,
    "approvalStatus" "EvaluationApprovalStatus" NOT NULL DEFAULT 'Draft',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavioral_evaluations_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "evaluation_approvals" (
    "_id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "EvaluationApprovalStatus" NOT NULL DEFAULT 'Pending',
    "approvedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_approvals_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "cbs_validations" (
    "_id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "validationDate" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "matchedRecords" INTEGER NOT NULL DEFAULT 0,
    "unmatchedRecords" INTEGER NOT NULL DEFAULT 0,
    "discrepancyCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CBSValidationStatus" NOT NULL DEFAULT 'Processing',
    "validatedAt" TIMESTAMP(3),
    "validationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unmappedProducts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbs_validations_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "cbs_discrepancies" (
    "_id" TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "taskId" TEXT,
    "cbsAmount" DOUBLE PRECISION,
    "pmsAmount" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "type" "DiscrepancyType" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbs_discrepancies_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "june_balances" (
    "_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "accountNumber" TEXT,
    "june_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "branch_code" TEXT,
    "baseline_period" TEXT NOT NULL DEFAULT '2025',
    "baseline_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "june_balances_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "product_kpi_mappings" (
    "_id" TEXT NOT NULL,
    "cbs_product_name" TEXT NOT NULL,
    "kpi_category" "KpiCategory" NOT NULL,
    "min_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ProductMappingStatus" NOT NULL DEFAULT 'active',
    "mappedById" TEXT NOT NULL,
    "mapped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_kpi_mappings_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType",
    "entityId" TEXT,
    "entityName" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "_SubTeamMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubTeamMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_branchId_idx" ON "users"("branchId");

-- CreateIndex
CREATE INDEX "users_regionId_idx" ON "users"("regionId");

-- CreateIndex
CREATE INDEX "users_areaId_idx" ON "users"("areaId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_position_idx" ON "users"("position");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "areas_code_key" ON "areas"("code");

-- CreateIndex
CREATE INDEX "areas_regionId_idx" ON "areas"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE INDEX "branches_regionId_idx" ON "branches"("regionId");

-- CreateIndex
CREATE INDEX "branches_areaId_idx" ON "branches"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE INDEX "teams_branchId_idx" ON "teams"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_branchId_code_key" ON "teams"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sub_teams_code_key" ON "sub_teams"("code");

-- CreateIndex
CREATE INDEX "sub_teams_branchId_idx" ON "sub_teams"("branchId");

-- CreateIndex
CREATE INDEX "sub_teams_teamId_idx" ON "sub_teams"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "sub_teams_branchId_code_key" ON "sub_teams"("branchId", "code");

-- CreateIndex
CREATE INDEX "plans_branch_code_kpi_category_period_idx" ON "plans"("branch_code", "kpi_category", "period");

-- CreateIndex
CREATE INDEX "plans_branch_code_period_idx" ON "plans"("branch_code", "period");

-- CreateIndex
CREATE INDEX "plans_status_idx" ON "plans"("status");

-- CreateIndex
CREATE INDEX "plans_branchId_idx" ON "plans"("branchId");

-- CreateIndex
CREATE INDEX "staff_plans_userId_kpi_category_period_idx" ON "staff_plans"("userId", "kpi_category", "period");

-- CreateIndex
CREATE INDEX "staff_plans_branch_code_period_idx" ON "staff_plans"("branch_code", "period");

-- CreateIndex
CREATE INDEX "staff_plans_branchPlanId_idx" ON "staff_plans"("branchPlanId");

-- CreateIndex
CREATE INDEX "staff_plans_branchId_idx" ON "staff_plans"("branchId");

-- CreateIndex
CREATE INDEX "plan_share_configs_branch_code_kpi_category_idx" ON "plan_share_configs"("branch_code", "kpi_category");

-- CreateIndex
CREATE INDEX "plan_share_configs_kpi_category_isActive_idx" ON "plan_share_configs"("kpi_category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "account_mappings_accountNumber_key" ON "account_mappings"("accountNumber");

-- CreateIndex
CREATE INDEX "account_mappings_mappedToId_branchId_status_idx" ON "account_mappings"("mappedToId", "branchId", "status");

-- CreateIndex
CREATE INDEX "account_mappings_accountNumber_idx" ON "account_mappings"("accountNumber");

-- CreateIndex
CREATE INDEX "account_mappings_branchId_idx" ON "account_mappings"("branchId");

-- CreateIndex
CREATE INDEX "daily_tasks_submittedById_taskDate_idx" ON "daily_tasks"("submittedById", "taskDate");

-- CreateIndex
CREATE INDEX "daily_tasks_branchId_taskDate_idx" ON "daily_tasks"("branchId", "taskDate");

-- CreateIndex
CREATE INDEX "daily_tasks_approvalStatus_branchId_idx" ON "daily_tasks"("approvalStatus", "branchId");

-- CreateIndex
CREATE INDEX "daily_tasks_cbsValidated_taskDate_idx" ON "daily_tasks"("cbsValidated", "taskDate");

-- CreateIndex
CREATE INDEX "task_approvals_taskId_idx" ON "task_approvals"("taskId");

-- CreateIndex
CREATE INDEX "task_approvals_approverId_idx" ON "task_approvals"("approverId");

-- CreateIndex
CREATE INDEX "performance_scores_userId_period_year_month_idx" ON "performance_scores"("userId", "period", "year", "month");

-- CreateIndex
CREATE INDEX "performance_scores_branchId_period_year_idx" ON "performance_scores"("branchId", "period", "year");

-- CreateIndex
CREATE INDEX "behavioral_evaluations_evaluatedUserId_period_year_month_idx" ON "behavioral_evaluations"("evaluatedUserId", "period", "year", "month");

-- CreateIndex
CREATE INDEX "behavioral_evaluations_branchId_approvalStatus_idx" ON "behavioral_evaluations"("branchId", "approvalStatus");

-- CreateIndex
CREATE INDEX "evaluation_approvals_evaluationId_idx" ON "evaluation_approvals"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluation_approvals_approverId_idx" ON "evaluation_approvals"("approverId");

-- CreateIndex
CREATE INDEX "cbs_validations_branchId_validationDate_idx" ON "cbs_validations"("branchId", "validationDate");

-- CreateIndex
CREATE INDEX "cbs_validations_status_idx" ON "cbs_validations"("status");

-- CreateIndex
CREATE INDEX "cbs_discrepancies_validationId_idx" ON "cbs_discrepancies"("validationId");

-- CreateIndex
CREATE INDEX "june_balances_accountNumber_baseline_period_idx" ON "june_balances"("accountNumber", "baseline_period");

-- CreateIndex
CREATE INDEX "june_balances_branch_code_idx" ON "june_balances"("branch_code");

-- CreateIndex
CREATE INDEX "june_balances_baseline_period_is_active_idx" ON "june_balances"("baseline_period", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "june_balances_account_id_baseline_period_key" ON "june_balances"("account_id", "baseline_period");

-- CreateIndex
CREATE UNIQUE INDEX "product_kpi_mappings_cbs_product_name_key" ON "product_kpi_mappings"("cbs_product_name");

-- CreateIndex
CREATE INDEX "product_kpi_mappings_cbs_product_name_status_idx" ON "product_kpi_mappings"("cbs_product_name", "status");

-- CreateIndex
CREATE INDEX "product_kpi_mappings_kpi_category_status_idx" ON "product_kpi_mappings"("kpi_category", "status");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "_SubTeamMembers_B_index" ON "_SubTeamMembers"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_teams" ADD CONSTRAINT "sub_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_teams" ADD CONSTRAINT "sub_teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_teams" ADD CONSTRAINT "sub_teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_plans" ADD CONSTRAINT "staff_plans_branchPlanId_fkey" FOREIGN KEY ("branchPlanId") REFERENCES "plans"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_plans" ADD CONSTRAINT "staff_plans_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_plans" ADD CONSTRAINT "staff_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_share_configs" ADD CONSTRAINT "plan_share_configs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_share_configs" ADD CONSTRAINT "plan_share_configs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_mappings" ADD CONSTRAINT "account_mappings_mappedToId_fkey" FOREIGN KEY ("mappedToId") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_mappings" ADD CONSTRAINT "account_mappings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_mappings" ADD CONSTRAINT "account_mappings_mappedById_fkey" FOREIGN KEY ("mappedById") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account_mappings"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_cbsValidationId_fkey" FOREIGN KEY ("cbsValidationId") REFERENCES "cbs_validations"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_approvals" ADD CONSTRAINT "task_approvals_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "daily_tasks"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_approvals" ADD CONSTRAINT "task_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_scores" ADD CONSTRAINT "performance_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_scores" ADD CONSTRAINT "performance_scores_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_scores" ADD CONSTRAINT "performance_scores_behavioralEvaluationId_fkey" FOREIGN KEY ("behavioralEvaluationId") REFERENCES "behavioral_evaluations"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_evaluations" ADD CONSTRAINT "behavioral_evaluations_evaluatedUserId_fkey" FOREIGN KEY ("evaluatedUserId") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_evaluations" ADD CONSTRAINT "behavioral_evaluations_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_evaluations" ADD CONSTRAINT "behavioral_evaluations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_approvals" ADD CONSTRAINT "evaluation_approvals_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "behavioral_evaluations"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_approvals" ADD CONSTRAINT "evaluation_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbs_validations" ADD CONSTRAINT "cbs_validations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbs_validations" ADD CONSTRAINT "cbs_validations_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbs_discrepancies" ADD CONSTRAINT "cbs_discrepancies_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "cbs_validations"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbs_discrepancies" ADD CONSTRAINT "cbs_discrepancies_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "june_balances" ADD CONSTRAINT "june_balances_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kpi_mappings" ADD CONSTRAINT "product_kpi_mappings_mappedById_fkey" FOREIGN KEY ("mappedById") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubTeamMembers" ADD CONSTRAINT "_SubTeamMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "sub_teams"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubTeamMembers" ADD CONSTRAINT "_SubTeamMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
