import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const cleanSystem = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');

    console.log('🧹 Cleaning system data...\n');

    console.log('1️⃣ Deleting Performance Scores...');
    await prisma.performanceScore.deleteMany({});
    console.log('   ✅ Deleted all performance scores');

    console.log('2️⃣ Deleting Behavioral Evaluations...');
    await prisma.behavioralEvaluation.deleteMany({});
    console.log('   ✅ Deleted all behavioral evaluations');

    console.log('3️⃣ Deleting CBS Validations...');
    await prisma.cBSValidation.deleteMany({});
    console.log('   ✅ Deleted all CBS validations');

    console.log('4️⃣ Deleting June Balances...');
    await prisma.juneBalance.deleteMany({});
    console.log('   ✅ Deleted all June balances');

    console.log('5️⃣ Deleting Staff Plans...');
    await prisma.staffPlan.deleteMany({});
    console.log('   ✅ Deleted all staff plans');

    console.log('6️⃣ Deleting Plans...');
    await prisma.plan.deleteMany({});
    console.log('   ✅ Deleted all plans');

    console.log('7️⃣ Deleting Task Approvals...');
    await prisma.taskApproval.deleteMany({});
    console.log('   ✅ Deleted all task approvals');

    console.log('8️⃣ Deleting Daily Tasks...');
    await prisma.dailyTask.deleteMany({});
    console.log('   ✅ Deleted all daily tasks');

    console.log('9️⃣ Deleting Account Mappings...');
    await prisma.accountMapping.deleteMany({});
    console.log('   ✅ Deleted all account mappings');

    console.log('🔟 Deleting Product KPI Mappings...');
    await prisma.productKpiMapping.deleteMany({});
    console.log('   ✅ Deleted all product KPI mappings');

    console.log('1️⃣1️⃣ Deleting Plan Share Configs...');
    await prisma.planShareConfig.deleteMany({});
    console.log('   ✅ Deleted all plan share configs');

    console.log('1️⃣2️⃣ Deleting Audit Logs...');
    await prisma.auditLog.deleteMany({});
    console.log('   ✅ Deleted all audit logs');

    console.log('\n📊 Keeping:');
    console.log('   • Users (HQ Admin, Branch Manager, Teams)');
    console.log('   • Branch, Area, Region');
    console.log('   • Teams, Sub-Teams');
    console.log('   • Account Mappings (cleaned above)');

    console.log('\n' + '='.repeat(50));
    console.log('✅ SYSTEM CLEANED!');
    console.log('='.repeat(50));

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning system:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

cleanSystem();