import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const prisma = new PrismaClient();

const checkPlanShareConfigs = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');

    const configs = await prisma.planShareConfig.findMany({
      where: { isActive: true },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: [{ kpi_category: 'asc' }, { branch_code: 'asc' }],
    });

    console.log(`📋 Found ${configs.length} active plan share config(s):\n`);

    if (configs.length === 0) {
      console.log('⚠️  NO PLAN SHARE CONFIGS FOUND!');
      console.log('\nYou need to create plan share configs before uploading plans.');
      console.log('Required configs:');
      console.log('  - Deposit Mobilization');
      console.log('  - Digital Channel Growth');
      console.log('  - Member Registration');
      console.log('  - Shareholder Recruitment');
      console.log('  - Loan & NPL');
      console.log('  - Customer Base');
      console.log('\nGo to Plan Share Config page in the admin UI to create them.');
    } else {
      configs.forEach((config, index) => {
        console.log(`${index + 1}. ${config.kpi_category} - ${config.branch_code || 'Default (All Branches)'}`);
        console.log(`   Total: ${config.total_percent}%`);
        console.log(`   Branch Manager: ${config.share_branch_manager}%, MSM: ${config.share_msm}%, Accountant: ${config.share_accountant}%, MSO: ${config.share_mso}%`);
        console.log(`   Created: ${config.createdBy?.name || 'N/A'}`);
        console.log('');
      });
    }

    await prisma.$disconnect();
    console.log('✅ Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

checkPlanShareConfigs();
