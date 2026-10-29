-- Add KPI-category task types back to TaskType enum
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Deposit Mobilization';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'New Member Registration';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'New Account Opening';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Share Capital Growth';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Account Productivity';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Mobile Banking Users';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Merchant POS Growth';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Billers Recruitment';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Internal Operations';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Collection Rate';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'Portfolio Quality';
