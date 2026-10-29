import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

const BRANCH_CODE = 'WOLAYTA_SODO';
const PERIOD = 'FY-2026-27';

// 12 product categories from the client's plan
const PRODUCTS = [
  { name: 'Loan Saving Deposit', cat: 'Loan_Saving_Deposit', targetAmount: 40500000, targetCount: 0 },
  { name: 'Michu Current Saving', cat: 'Michu_Current_Saving', targetAmount: 60750000, targetCount: 13994 },
  { name: 'Gihon Regular Saving', cat: 'Gihon_Regular_Saving', targetAmount: 28350000, targetCount: 9125 },
  { name: 'Mothers Saving', cat: 'Mothers_Saving', targetAmount: 16200000, targetCount: 1788 },
  { name: 'Young Womens Saving', cat: 'Young_Womens_Saving', targetAmount: 16200000, targetCount: 4020 },
  { name: 'Elders Saving', cat: 'Elders_Saving', targetAmount: 12150000, targetCount: 2939 },
  { name: 'Children Saving', cat: 'Children_Saving', targetAmount: 8100000, targetCount: 4355 },
  { name: 'Fixed Time Deposit', cat: 'Fixed_Time_Deposit', targetAmount: 64800000, targetCount: 20 },
  { name: 'Premium Saving Deposit', cat: 'Premium_Saving_Deposit', targetAmount: 101250000, targetCount: 9025 },
  { name: 'Special Saving', cat: 'Special_Saving', targetAmount: 16200000, targetCount: 0 },
  { name: 'Segment Deposit', cat: 'Segment_Deposit', targetAmount: 12150000, targetCount: 120 },
  { name: 'Wadiah IFB Deposit', cat: 'Wadiah_IFB_Deposit', targetAmount: 28350000, targetCount: 967 },
];

// Monthly cumulative factors (proportions of annual target)
const MONTHLY_FACTORS = [
  0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0
];
const MONTH_NAMES = ['July', 'August', 'September', 'October', 'November', 'December',
                     'January', 'February', 'March', 'April', 'May', 'June'];

// CBS product name → KPI category mapping (matches Accounts.csv products)
const CBS_PRODUCT_MAPPINGS = [
  { cbs: 'LOAN SAVING RESERVE ACCOUNT', kpi: 'Deposit_Mobilization', product: 'Loan_Saving_Deposit' },
  { cbs: 'Michu Current Account', kpi: 'Deposit_Mobilization', product: 'Michu_Current_Saving' },
  { cbs: 'GIHON REGULAR SAVING', kpi: 'Deposit_Mobilization', product: 'Gihon_Regular_Saving' },
  { cbs: 'MOTHERS SAVING ACCOUNT', kpi: 'Deposit_Mobilization', product: 'Mothers_Saving' },
  { cbs: 'YOUNG WOMEN SAVING', kpi: 'Deposit_Mobilization', product: 'Young_Womens_Saving' },
  { cbs: 'ELDERS SAVING ACCOUNT', kpi: 'Deposit_Mobilization', product: 'Elders_Saving' },
  { cbs: 'CHILDREN SAVING ACCOUNT', kpi: 'Deposit_Mobilization', product: 'Children_Saving' },
  { cbs: 'FIXED TIME DEPOSIT', kpi: 'Deposit_Mobilization', product: 'Fixed_Time_Deposit' },
  { cbs: 'SPECIAL SAVING ACCOUNT', kpi: 'Deposit_Mobilization', product: 'Special_Saving' },
  { cbs: 'WADIAH SAVING ACCOUNT', kpi: 'Deposit_Mobilization', product: 'Wadiah_IFB_Deposit' },
  { cbs: 'REPAYMENT ACCOUNT', kpi: 'Collection_Rate', product: null },
];

async function seedWolayitaSodoPlan() {
  console.log(`\n=== Seeding Wolayita Sodo Plan for ${PERIOD} ===\n`);

  // Find the branch
  const branch = await prisma.branch.findFirst({
    where: { code: BRANCH_CODE },
  });
  if (!branch) {
    throw new Error(`Branch ${BRANCH_CODE} not found. Run full seed first.`);
  }
  console.log(`Branch: ${branch.name} (${branch.id})`);

  // Find admin user to set as creator
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
  });
  if (!admin) throw new Error('No admin user found');

  // Delete existing plans for this branch + period
  await prisma.staffPlan.deleteMany({
    where: { branch_code: BRANCH_CODE, period: PERIOD },
  });
  await prisma.plan.deleteMany({
    where: { branch_code: BRANCH_CODE, period: PERIOD },
  });
  console.log('Cleared existing plans');

  // Create 12 product-level plans
  for (const prod of PRODUCTS) {
    const monthlyPlan = MONTH_NAMES.map((month, i) => ({
      month,
      amount: Math.round(prod.targetAmount * MONTHLY_FACTORS[i]),
      count: Math.round(prod.targetCount * MONTHLY_FACTORS[i]),
    }));

    const plan = await prisma.plan.create({
      data: {
        branch_code: BRANCH_CODE,
        branchId: branch.id,
        kpi_category: 'Deposit_Mobilization',
        product_category: prod.cat,
        period: PERIOD,
        target_value: prod.targetAmount,
        target_count: prod.targetCount,
        monthly_plan: monthlyPlan,
        target_type: 'incremental',
        status: 'Active',
        createdById: admin.id,
      },
    });
    console.log(`  Plan: ${prod.name} — Amount: ${(prod.targetAmount / 1e6).toFixed(1)}M, Count: ${prod.targetCount}`);
  }

  console.log(`\n✅ Created ${PRODUCTS.length} product plans for Wolayita Sodo`);
}

async function seedCbsProductMappings() {
  console.log(`\n=== Seeding CBS Product → KPI Mappings ===\n`);

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) throw new Error('No admin user found');

  for (const mapping of CBS_PRODUCT_MAPPINGS) {
    // Upsert to avoid duplicates
    await prisma.productKpiMapping.upsert({
      where: { cbs_product_name: mapping.cbs },
      update: { kpi_category: mapping.kpi, status: 'active' },
      create: {
        cbs_product_name: mapping.cbs,
        kpi_category: mapping.kpi,
        status: 'active',
        mappedById: admin.id,
      },
    });
  }
  console.log(`✅ Seeded ${CBS_PRODUCT_MAPPINGS.length} CBS product mappings`);
}

async function main() {
  try {
    await seedCbsProductMappings();
    await seedWolayitaSodoPlan();
    console.log('\n=== Seed Complete ===\n');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
