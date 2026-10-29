import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { normalizePeriod } from '../utils/periodUtils.js';

dotenv.config();

const prisma = new PrismaClient();

const PERIOD = normalizePeriod('2025-H2');

const seedTestData = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');

    console.log('📊 Creating test data...\n');

    // Get Atote branch
    const branch = await prisma.branch.findUnique({
      where: { code: 'ATOTE' }
    });

    if (!branch) {
      console.log('❌ ATOTE branch not found. Run seedAtoteUsers first.');
      process.exit(1);
    }

    console.log('1️⃣ Creating June Baseline balances...');
    const juneBalances = [
      { account_id: '100001', customer_name: 'Tadesse', june_balance: 1500.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100002', customer_name: 'Alem', june_balance: 800.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100003', customer_name: 'Mekonnen', june_balance: 2200.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100004', customer_name: 'Senait', june_balance: 500.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100005', customer_name: 'Tesfaye', june_balance: 1800.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100006', customer_name: 'Hirut', june_balance: 950.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100007', customer_name: 'Abebe', june_balance: 1200.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100008', customer_name: 'Meskerem', june_balance: 600.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100009', customer_name: 'Dereje', june_balance: 2500.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100010', customer_name: 'Firomelak', june_balance: 700.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100011', customer_name: 'Tigist', june_balance: 1800.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100012', customer_name: 'Kemal', june_balance: 3000.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100013', customer_name: 'Asnakech', june_balance: 1100.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100014', customer_name: 'Zerihun', june_balance: 850.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
      { account_id: '100015', customer_name: 'Brhanu', june_balance: 1400.00, baseline_period: '2025', baseline_date: new Date('2025-06-30'), is_active: true },
    ];

    for (const jb of juneBalances) {
      await prisma.juneBalance.upsert({
        where: { account_id_baseline_period: { account_id: jb.account_id, baseline_period: jb.baseline_period } },
        create: { ...jb, accountNumber: jb.account_id },
        update: { june_balance: jb.june_balance },
      });
    }
    console.log(`   ✅ Created ${juneBalances.length} June balances`);

    // Get MSO and Accountant users
    const mso = await prisma.user.findFirst({
      where: { email: 'mso@atote.et' }
    });

    const accountant = await prisma.user.findFirst({
      where: { email: 'acct@atote.et' }
    });

    if (!mso || !accountant) {
      console.log('❌ Users not found. Run seedAtoteUsers first.');
      process.exit(1);
    }

    console.log('2️⃣ Creating Account Mappings...');
    const mappings = [
      { accountNumber: '100001', customerName: 'Tadesse', current_balance: 1800, june_balance: 1500, mappedToId: mso.id, mappedById: mso.id },
      { accountNumber: '100002', customerName: 'Alem', current_balance: 950, june_balance: 800, mappedToId: mso.id, mappedById: mso.id },
      { accountNumber: '100003', customerName: 'Mekonnen', current_balance: 2500, june_balance: 2200, mappedToId: mso.id, mappedById: mso.id },
      { accountNumber: '100004', customerName: 'Senait', current_balance: 650, june_balance: 500, mappedToId: mso.id, mappedById: mso.id },
      { accountNumber: '100005', customerName: 'Tesfaye', current_balance: 2200, june_balance: 1800, mappedToId: mso.id, mappedById: mso.id },
      { accountNumber: '100006', customerName: 'Hirut', current_balance: 1100, june_balance: 950, mappedToId: accountant.id, mappedById: accountant.id },
      { accountNumber: '100007', customerName: 'Abebe', current_balance: 1400, june_balance: 1200, mappedToId: accountant.id, mappedById: accountant.id },
      { accountNumber: '100008', customerName: 'Meskerem', current_balance: 800, june_balance: 600, mappedToId: accountant.id, mappedById: accountant.id },
      { accountNumber: '100009', customerName: 'Dereje', current_balance: 3000, june_balance: 2500, mappedToId: accountant.id, mappedById: accountant.id },
      { accountNumber: '100010', customerName: 'Firomelak', current_balance: 900, june_balance: 700, mappedToId: accountant.id, mappedById: accountant.id },
    ];

    for (const m of mappings) {
      await prisma.accountMapping.upsert({
        where: { accountNumber: m.accountNumber },
        create: { ...m, branchId: branch.id, status: 'Active', accountType: 'Savings' },
        update: m,
      });
    }
    console.log(`   ✅ Created ${mappings.length} account mappings`);

    console.log('3️⃣ Creating Branch Plan...');
    await prisma.plan.upsert({
      where: { id: `ATOTE-DEPO-${PERIOD}` },
      create: {
        id: `ATOTE-DEPO-${PERIOD}`,
        branch_code: 'ATOTE',
        kpi_category: 'Deposit_Mobilization',
        period: PERIOD,
        target_value: 1000000,
        target_type: 'incremental',
        start_date: new Date('2026-07-01'),
        end_date: new Date('2027-06-30'),
        status: 'Active',
      },
      update: {
        target_value: 1000000,
        status: 'Active',
      },
    });
    console.log(`   ✅ Created branch plan: ATOTE Deposit Mobilization ${PERIOD} = 1,000,000`);

    console.log('4️⃣ Creating Staff Plan for MSO...');
    await prisma.staffPlan.upsert({
      where: { id: `MSO-DEPO-${PERIOD}` },
      create: {
        id: `MSO-DEPO-${PERIOD}`,
        userId: mso.id,
        branch_code: 'ATOTE',
        kpi_category: 'Deposit_Mobilization',
        period: PERIOD,
        individual_target: 150000,
        plan_share_percent: 15,
        daily_target: 2467,
        target_type: 'incremental',
        status: 'Active',
      },
      update: {
        individual_target: 150000,
        plan_share_percent: 15,
        status: 'Active',
      },
    });
    console.log(`   ✅ Created staff plan: MSO Deposit Target = 150,000 ETB (${PERIOD})`);

    // Calculate MSO incremental growth
    const msoMappings = await prisma.accountMapping.findMany({
      where: { mappedToId: mso.id, status: 'Active', current_balance: { gte: 1000 } }
    });

    let msoGrowth = 0;
    let msoCurrent = 0;
    let msoJune = 0;

    for (const map of msoMappings) {
      const june = await prisma.juneBalance.findFirst({
        where: { account_id: map.accountNumber, is_active: true }
      });
      const juneBal = june?.june_balance || 0;
      msoJune += juneBal;
      msoCurrent += map.current_balance || 0;
      msoGrowth += (map.current_balance || 0) - juneBal;
    }

    console.log('\n5️⃣ MSO Account Summary:');
    console.log(`   • Accounts: ${msoMappings.length}`);
    console.log(`   • June Balance: ${msoJune.toLocaleString()} ETB`);
    console.log(`   • Current Balance: ${msoCurrent.toLocaleString()} ETB`);
    console.log(`   • Incremental Growth: ${msoGrowth.toLocaleString()} ETB`);
    console.log(`   • Progress: ${((msoGrowth / 150000) * 100).toFixed(2)}%`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST DATA CREATED!');
    console.log('='.repeat(50));
    console.log('\n📊 Test Data Summary:');
    console.log(`   • 15 June baseline accounts`);
    console.log(`   • 10 customer mappings (5 to MSO, 5 to Accountant)`);
    console.log(`   • Branch Plan: ATOTE 1,000,000 ETB`);
    console.log(`   • Staff Plan: MSO 150,000 ETB target`);
    console.log('\n🎯 Expected Performance:');
    console.log(`   • MSO Current Balance: ${msoCurrent.toLocaleString()} ETB`);
    console.log(`   • MSO June Balance: ${msoJune.toLocaleString()} ETB`);
    console.log(`   • MSO Incremental Growth: ${msoGrowth.toLocaleString()} ETB`);
    console.log(`   • Progress: ${msoGrowth.toLocaleString()}/150000 = ${((msoGrowth / 150000) * 100).toFixed(2)}%`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedTestData();