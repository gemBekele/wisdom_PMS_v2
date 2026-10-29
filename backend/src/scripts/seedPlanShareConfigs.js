import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const seedPlanShareConfigs = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');

    console.log('📊 Seeding Plan Share Configs...\n');

    // Default configs for each KPI category
    const configs = [
      {
        kpi_category: 'Deposit_Mobilization',
        branch_code: null, // Default for all branches
        share_branch_manager: 5,
        share_msm: 15,
        share_accountant: 15,
        share_mso: 65,
        isActive: true,
      },
      {
        kpi_category: 'Digital_Channel_Growth',
        branch_code: null,
        share_branch_manager: 5,
        share_msm: 15,
        share_accountant: 15,
        share_mso: 65,
        isActive: true,
      },
      {
        kpi_category: 'Member_Registration',
        branch_code: null,
        share_branch_manager: 5,
        share_msm: 15,
        share_accountant: 15,
        share_mso: 65,
        isActive: true,
      },
      {
        kpi_category: 'Customer_Base',
        branch_code: null,
        share_branch_manager: 5,
        share_msm: 15,
        share_accountant: 15,
        share_mso: 65,
        isActive: true,
      },
      {
        kpi_category: 'Loan_NPL',
        branch_code: null,
        share_branch_manager: 5,
        share_msm: 15,
        share_accountant: 15,
        share_mso: 65,
        isActive: true,
      },
      {
        kpi_category: 'Shareholder_Recruitment',
        branch_code: null,
        share_branch_manager: 5,
        share_msm: 15,
        share_accountant: 15,
        share_mso: 65,
        isActive: true,
      },
    ];

    for (const config of configs) {
      const existing = await prisma.planShareConfig.findFirst({
        where: {
          kpi_category: config.kpi_category,
          branch_code: null,
        },
      });

      if (existing) {
        console.log(`ℹ️  ${config.kpi_category} - already exists`);
      } else {
        await prisma.planShareConfig.create({ data: config });
        console.log(`✅ Created: ${config.kpi_category}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ PLAN SHARE CONFIGS SEEDED!');
    console.log('='.repeat(50));
    console.log('\n📊 Default Share Distribution:');
    console.log('   Branch Manager: 5%');
    console.log('   MSM: 15%');
    console.log('   Accountant: 15%');
    console.log('   MSO: 65%');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding configs:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedPlanShareConfigs();