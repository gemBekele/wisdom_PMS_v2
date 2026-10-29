-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskType" ADD VALUE 'Loan Saving Deposit';
ALTER TYPE "TaskType" ADD VALUE 'Michu Current Saving';
ALTER TYPE "TaskType" ADD VALUE 'Gihon Regular Saving';
ALTER TYPE "TaskType" ADD VALUE 'Mothers Saving';
ALTER TYPE "TaskType" ADD VALUE 'Young Womens Saving';
ALTER TYPE "TaskType" ADD VALUE 'Elders Saving';
ALTER TYPE "TaskType" ADD VALUE 'Children Saving';
ALTER TYPE "TaskType" ADD VALUE 'Fixed Time Deposit';
ALTER TYPE "TaskType" ADD VALUE 'Premium Saving Deposit';
ALTER TYPE "TaskType" ADD VALUE 'Special Saving';
ALTER TYPE "TaskType" ADD VALUE 'Segment Deposit';
ALTER TYPE "TaskType" ADD VALUE 'Wadiah IFB Deposit';
