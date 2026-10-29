-- Drop foreign keys first
ALTER TABLE IF EXISTS "users" DROP CONSTRAINT IF EXISTS "users_regionId_fkey";
ALTER TABLE IF EXISTS "regions" DROP CONSTRAINT IF EXISTS "regions_directorId_fkey";
ALTER TABLE IF EXISTS "areas" DROP CONSTRAINT IF EXISTS "areas_regionId_fkey";
ALTER TABLE IF EXISTS "branches" DROP CONSTRAINT IF EXISTS "branches_regionId_fkey";
ALTER TABLE IF EXISTS "teams" DROP CONSTRAINT IF EXISTS "teams_branchId_fkey";
ALTER TABLE IF EXISTS "teams" DROP CONSTRAINT IF EXISTS "teams_managerId_fkey";
ALTER TABLE IF EXISTS "sub_teams" DROP CONSTRAINT IF EXISTS "sub_teams_teamId_fkey";
ALTER TABLE IF EXISTS "sub_teams" DROP CONSTRAINT IF EXISTS "sub_teams_branchId_fkey";
ALTER TABLE IF EXISTS "sub_teams" DROP CONSTRAINT IF EXISTS "sub_teams_leaderId_fkey";
ALTER TABLE IF EXISTS "plan_share_configs" DROP CONSTRAINT IF EXISTS "plan_share_configs_createdById_fkey";
ALTER TABLE IF EXISTS "plan_share_configs" DROP CONSTRAINT IF EXISTS "plan_share_configs_updatedById_fkey";
ALTER TABLE IF EXISTS "evaluation_approvals" DROP CONSTRAINT IF EXISTS "evaluation_approvals_evaluationId_fkey";
ALTER TABLE IF EXISTS "evaluation_approvals" DROP CONSTRAINT IF EXISTS "evaluation_approvals_approverId_fkey";
ALTER TABLE IF EXISTS "_SubTeamMembers" DROP CONSTRAINT IF EXISTS "_SubTeamMembers_A_fkey";
ALTER TABLE IF EXISTS "_SubTeamMembers" DROP CONSTRAINT IF EXISTS "_SubTeamMembers_B_fkey";

-- Drop indices
DROP INDEX IF EXISTS "users_regionId_idx";
DROP INDEX IF EXISTS "areas_regionId_idx";
DROP INDEX IF EXISTS "branches_regionId_idx";

-- Drop old tables that depend on old enum types (before recreating types)
DROP TABLE IF EXISTS "_SubTeamMembers";
DROP TABLE IF EXISTS "evaluation_approvals";
DROP TABLE IF EXISTS "plan_share_configs";
DROP TABLE IF EXISTS "sub_teams";
DROP TABLE IF EXISTS "teams";
DROP TABLE IF EXISTS "regions";

-- Step 1: Convert all enum columns to text so we can freely manipulate data
ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(50);
ALTER TABLE "users" ALTER COLUMN "position" TYPE VARCHAR(100);
ALTER TABLE "plans" ALTER COLUMN "kpi_category" TYPE VARCHAR(50);
ALTER TABLE "staff_plans" ALTER COLUMN "kpi_category" TYPE VARCHAR(50);
ALTER TABLE "product_kpi_mappings" ALTER COLUMN "kpi_category" TYPE VARCHAR(50);
ALTER TABLE "daily_tasks" ALTER COLUMN "taskType" TYPE VARCHAR(50);
ALTER TABLE "performance_scores" ALTER COLUMN "rating" TYPE VARCHAR(50);

-- Step 2: Migrate UserRole data
UPDATE "users" SET "role" = 'areaManager' WHERE "role" = 'regionalDirector';
UPDATE "users" SET "role" = 'supervisor' WHERE "role" = 'lineManager';
UPDATE "users" SET "role" = 'staff' WHERE "role" = 'subTeamLeader';

-- Step 3: Migrate Position data
UPDATE "users" SET "position" = 'Branch Manager' WHERE "position" = 'Regional Director';
UPDATE "users" SET "position" = 'Branch Manager' WHERE "position" = 'Member Service Manager (MSM)';
UPDATE "users" SET "position" = 'Customer Service Officer I' WHERE "position" IN ('Member Service Officer I', 'Member Service Officer II', 'Member Service Officer III');
UPDATE "users" SET "position" = 'Customer Relationship Supervisor' WHERE "position" = 'Accountant';

-- Step 4: Migrate KpiCategory data
UPDATE "plans" SET "kpi_category" = 'Deposit Mobilization' WHERE "kpi_category" IN ('Member Registration', 'Shareholder Recruitment', 'Loan & NPL', 'Customer Base', 'Digital Channel Growth');
UPDATE "staff_plans" SET "kpi_category" = 'Deposit Mobilization' WHERE "kpi_category" IN ('Member Registration', 'Shareholder Recruitment', 'Loan & NPL', 'Customer Base', 'Digital Channel Growth');
UPDATE "product_kpi_mappings" SET "kpi_category" = 'Deposit Mobilization' WHERE "kpi_category" IN ('Member Registration', 'Shareholder Recruitment', 'Loan & NPL', 'Customer Base', 'Digital Channel Growth');

-- Step 5: Migrate TaskType data
UPDATE "daily_tasks" SET "taskType" = 'Deposit Mobilization' WHERE "taskType" IN ('Loan Follow-up', 'New Customer', 'Digital Activation', 'Member Registration', 'Shareholder Recruitment');

-- Step 6: Migrate PerformanceRating data
UPDATE "performance_scores" SET "rating" = 'Needs Improvement' WHERE "rating" IN ('Very Good', 'Good', 'Needs Support');

-- Step 7: Drop old enum types (safe now since tables are dropped and columns are varchar)
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "Position" CASCADE;
DROP TYPE IF EXISTS "KpiCategory" CASCADE;
DROP TYPE IF EXISTS "TaskType" CASCADE;
DROP TYPE IF EXISTS "PerformanceRating" CASCADE;

-- Step 8: Create new enum types
CREATE TYPE "UserRole" AS ENUM ('admin', 'areaManager', 'branchManager', 'supervisor', 'staff');
CREATE TYPE "Position" AS ENUM ('CEO', 'Area Manager', 'Branch Manager', 'Operation Supervisor', 'Customer Service Officer I', 'Customer Service Officer II', 'Customer Relationship Supervisor', 'Sales & Marketing Officer I', 'Customer Relationship Officer I', 'Internal Auditor');
CREATE TYPE "KpiCategory" AS ENUM ('Account Productivity', 'Deposit Mobilization', 'New Member Registration', 'New Account Opening', 'Share Capital Growth', 'Mobile Banking Users', 'Merchant POS Growth', 'Billers Recruitment', 'Internal Operations');
CREATE TYPE "TaskType" AS ENUM ('Account Productivity Improvement', 'Deposit Mobilization', 'New Member Registration', 'New Account Opening', 'Share Capital', 'Mobile Banking Activation', 'Merchant POS Activation', 'Biller Recruitment', 'Transaction Processing', 'SMS Alert Configuration', 'Complaint Resolution');
CREATE TYPE "PerformanceRating" AS ENUM ('Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory');

-- Step 9: Convert columns back to new enum types
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "users" ALTER COLUMN "position" TYPE "Position" USING ("position"::"Position");
ALTER TABLE "plans" ALTER COLUMN "kpi_category" TYPE "KpiCategory" USING ("kpi_category"::"KpiCategory");
ALTER TABLE "staff_plans" ALTER COLUMN "kpi_category" TYPE "KpiCategory" USING ("kpi_category"::"KpiCategory");
ALTER TABLE "product_kpi_mappings" ALTER COLUMN "kpi_category" TYPE "KpiCategory" USING ("kpi_category"::"KpiCategory");
ALTER TABLE "daily_tasks" ALTER COLUMN "taskType" TYPE "TaskType" USING ("taskType"::"TaskType");
ALTER TABLE "performance_scores" ALTER COLUMN "rating" TYPE "PerformanceRating" USING ("rating"::"PerformanceRating");

-- Step 10: AlterTable: users - drop old columns, add supervisorId
ALTER TABLE "users" DROP COLUMN IF EXISTS "regionId",
DROP COLUMN IF EXISTS "sub_team",
ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;

-- Step 11: AlterTable: areas - drop regionId
ALTER TABLE "areas" DROP COLUMN IF EXISTS "regionId";

-- Step 12: AlterTable: branches - drop regionId
ALTER TABLE "branches" DROP COLUMN IF EXISTS "regionId";

-- Step 13: AlterTable: account_mappings - add isProductive
ALTER TABLE "account_mappings" ADD COLUMN IF NOT EXISTS "isProductive" BOOLEAN NOT NULL DEFAULT false;

-- Step 14: CreateIndex: new indices
CREATE INDEX IF NOT EXISTS "users_supervisorId_idx" ON "users"("supervisorId");
CREATE INDEX IF NOT EXISTS "account_mappings_isProductive_idx" ON "account_mappings"("isProductive");

-- Step 15: AddForeignKey: supervisor relation
ALTER TABLE "users" ADD CONSTRAINT "users_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
