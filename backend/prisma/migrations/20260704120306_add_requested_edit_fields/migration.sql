-- AlterTable
ALTER TABLE "daily_tasks" ADD COLUMN     "requestedEditAt" TIMESTAMP(3),
ADD COLUMN     "requestedEditData" JSONB;
