import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const PASSWORD = '1234';

const ACCOUNTS_CSV = path.resolve(__dirname, '../../../Accounts.csv');
const PLAN_XLSX = path.resolve(__dirname, '../../../WSodo Plan FY 26 - 27.xlsx');

const sciCounters = {};

function parseCsv(filePath) {
  const workbook = XLSX.readFile(filePath, { type: 'file', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  return data;
}

function normalizeAccountNo(raw, customerNo) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.includes('E+')) {
    const custNum = String(customerNo || '').trim();
    if (!custNum) return `CSV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (!sciCounters[custNum]) sciCounters[custNum] = 0;
    sciCounters[custNum]++;
    return `CSV-${custNum}-${sciCounters[custNum]}`;
  }
  return s.replace(/\.0+$/, '');
}

async function main() {
  console.log('🌱 Seeding from Accounts.csv + WSodo Plan FY 26 - 27.xlsx...\n');

  if (!fs.existsSync(ACCOUNTS_CSV)) {
    console.error(`❌ Accounts.csv not found at ${ACCOUNTS_CSV}`);
    process.exit(1);
  }
  if (!fs.existsSync(PLAN_XLSX)) {
    console.error(`❌ WSodo Plan FY 26 - 27.xlsx not found at ${PLAN_XLSX}`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);

  // ========== READ ACCOUNTS CSV ==========
  console.log('📖 Reading Accounts.csv...');
  const csvRows = parseCsv(ACCOUNTS_CSV);
  const accountRows = csvRows.slice(8).filter(r => r[0] && String(r[0]).trim());

  console.log(`   ${accountRows.length} raw rows`);

  const accounts = [];
  const registeredBySet = new Set();

  for (const row of accountRows) {
    const custName = String(row[0] || '').trim();
    const custNo = String(row[1] || '').trim();
    const category = String(row[3] || '').trim();
    const acctNo = normalizeAccountNo(row[4], row[1]);
    const credits = parseFloat(String(row[6] || '0').replace(/,/g, '')) || 0;
    const debits = parseFloat(String(row[7] || '0').replace(/,/g, '')) || 0;
    const balance = parseFloat(String(row[9] || '0').replace(/,/g, '')) || 0;
    const registeredBy = String(row[12] || '').trim();
    const status = String(row[13] || '').trim();

    if (!acctNo) continue;
    if (registeredBy) registeredBySet.add(registeredBy);

    accounts.push({ custName, custNo, category, acctNo, credits, debits, balance, registeredBy, status });
  }

  console.log(`   ${accounts.length} valid accounts from ${registeredBySet.size} staff`);

  // ========== READ PLAN XLSX ==========
  console.log('\n📖 Reading WSodo Plan FY 26 - 27.xlsx...');
  const planWb = XLSX.readFile(PLAN_XLSX, { cellFormula: false });
  const planWs = planWb.Sheets['Operational Target'];
  const planData = XLSX.utils.sheet_to_json(planWs, { header: 1, defval: '', raw: true });

  // Product deposit plans: rows 9-20 (1-indexed) = indices 8-19 (0-indexed)
  // Col 1 = name, Col 5 = actual, Col 6 = annual target, Col 9-20 = monthly
  const productPlans = [];
  for (let i = 8; i < 20; i++) {
    const row = planData[i];
    if (!row) continue;
    const name = String(row[1] || '').trim();
    if (!name || name.startsWith('Total')) continue;
    const prevActual = parseFloat(String(row[5] || '0').replace(/,/g, '')) || 0;
    const annualTarget = parseFloat(String(row[6] || '0').replace(/,/g, '')) || 0;
    const monthlyTargets = [];
    for (let j = 9; j <= 20; j++) {
      const val = parseFloat(String(row[j] || '0').replace(/,/g, '')) || 0;
      monthlyTargets.push(val);
    }
    if (annualTarget > 0) {
      productPlans.push({ name, prevActual, annualTarget, monthlyTargets });
    }
  }

  const monthNames = ['July', 'Aug', 'September', 'October', 'November', 'December',
    'January', 'February', 'March', 'April', 'May', 'June'];

  console.log(`   ${productPlans.length} product plans:`);
  for (const p of productPlans) {
    console.log(`     ${p.name}: ${p.annualTarget.toLocaleString()} ETB`);
  }

  // Customer base plans: rows 23-35 (1-indexed) = indices 22-34
  const customerPlans = [];
  for (let i = 22; i < 34; i++) {
    const row = planData[i];
    if (!row) continue;
    const name = String(row[1] || '').trim();
    if (!name || name.startsWith('Total')) continue;
    const prevCount = parseFloat(String(row[5] || '0').replace(/,/g, '')) || 0;
    const annualTarget = parseFloat(String(row[6] || '0').replace(/,/g, '')) || 0;
    if (annualTarget > 0) {
      customerPlans.push({ name, prevCount, annualTarget });
    }
  }
  console.log(`   ${customerPlans.length} customer base plans`);
  for (const p of customerPlans) {
    console.log(`     ${p.name}: ${p.annualTarget.toLocaleString()} accounts`);
  }

  // ========== CREATE ORG STRUCTURE ==========
  console.log('\n🏗️  Creating organization structure...');

  await prisma.cBSDiscrepancy.deleteMany();
  await prisma.cBSValidation.deleteMany();
  await prisma.nplSnapshot.deleteMany();
  await prisma.team.deleteMany();
  await prisma.performanceScore.deleteMany();
  await prisma.behavioralEvaluation.deleteMany();
  await prisma.taskApproval.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.accountMapping.deleteMany();
  await prisma.juneBalance.deleteMany();
  await prisma.productKpiMapping.deleteMany();
  await prisma.staffPlan.deleteMany();
  await prisma.loanSchedule.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.kpiFrameworkConfig.deleteMany();
  await prisma.branch.updateMany({ where: { managerId: { not: null } }, data: { managerId: null } });
  await prisma.area.updateMany({ where: { managerId: { not: null } }, data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.area.deleteMany();
  await prisma.region.deleteMany();
  console.log('   ✅ Cleared existing data');

  const region = await prisma.region.create({
    data: { name: 'South Region', code: 'SOUTH', isActive: true },
  });
  console.log('   ✅ Region: South Region (SOUTH)');

  const area = await prisma.area.create({
    data: { name: 'Wolayta Area', code: 'WOLAYTA_AREA', regionId: region.id, isActive: true },
  });
  console.log('   ✅ Area: Wolayta Area (WOLAYTA_AREA)');

  const branch = await prisma.branch.create({
    data: { name: 'Wolayta Sodo Branch', code: 'WOLAYTA_SODO', areaId: area.id, isActive: true },
  });
  console.log('   ✅ Branch: Wolayta Sodo (WOLAYTA_SODO)');

  // ========== CREATE USERS ==========
  console.log('\n👤 Creating users...');

  // Admin
  const admin = await prisma.user.create({
    data: {
      employeeId: 'ADMIN001', name: 'Biruk Assefa', email: 'admin@ghion.et',
      password: hashed, role: 'admin', position: 'CEO', isActive: true,
    },
  });
  console.log('   ✅ Admin: Biruk Assefa (admin@ghion.et)');

  // Area Manager
  const areaManager = await prisma.user.create({
    data: {
      employeeId: 'AM001', name: 'Abebech G/Hiwot', email: 'am@wolayta.et',
      password: hashed,       role: 'areaManager', position: 'Area_Manager',
      areaId: area.id, isActive: true,
    },
  });
  await prisma.area.update({ where: { id: area.id }, data: { managerId: areaManager.id } });

  // Branch Manager
  const branchManager = await prisma.user.create({
    data: {
      employeeId: 'BM001', name: 'Meron Kebede', email: 'bm@sodo.et',
      password: hashed, role: 'branchManager', position: 'Branch_Manager',
      branchId: branch.id, branch_code: 'WOLAYTA_SODO', areaId: area.id, isActive: true,
    },
  });
  await prisma.branch.update({ where: { id: branch.id }, data: { managerId: branchManager.id } });

  // Create staff users from Registered By in CSV
  const staffUsernames = Array.from(registeredBySet).sort();
  const staffUsers = [];
  let staffCount = 0;

  // Supervisor names
  const supervisorNames = ['melisachew-GNS', 'tsehada-GNS', 'kidistale-GNS'];

  for (const username of staffUsernames) {
    const cleanName = username.replace(/-GNS$/, '').replace(/-/g, ' ');
    const displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    const email = `${username.replace(/-/g, '_').toLowerCase()}@ghion.et`;
    const isSupervisor = supervisorNames.includes(username);

    const user = await prisma.user.create({
      data: {
        employeeId: `STF-${String(++staffCount).padStart(3, '0')}`,
        name: displayName,
        email,
        password: hashed,
        role: isSupervisor ? 'supervisor' : 'staff',
        position: isSupervisor ? 'Operation_Supervisor' : 'Customer_Service_Officer_I',
        branchId: branch.id,
        branch_code: 'WOLAYTA_SODO',
        areaId: area.id,
        isActive: true,
      },
    });
    staffUsers.push({ user, username });
    console.log(`   ${isSupervisor ? '🔶' : '   '} ${displayName.padEnd(20)} (${username}) — ${isSupervisor ? 'Supervisor' : 'Staff'}`);
  }
  console.log(`   ✅ ${staffUsers.length} staff users created`);

  // ========== CREATE PLANS ==========
  console.log('\n📋 Creating plans from Excel targets...');

  const kpiCategoryMap = {
    'Loan Saving Deposit': 'Deposit_Mobilization',
    'Michu Current Saving Deposit': 'Deposit_Mobilization',
    'Gihon Regular  Saving Deposit': 'Deposit_Mobilization',
    'Mothers Saving Deposit': 'Deposit_Mobilization',
    'Young Womens Saving Deposit': 'Deposit_Mobilization',
    'Elders Saving Deposit': 'Deposit_Mobilization',
    'Children Saving Deposit': 'Deposit_Mobilization',
    'Fixed Time Deposit': 'Deposit_Mobilization',
    'Premium saving deposit': 'Deposit_Mobilization',
    'Special Saving': 'Deposit_Mobilization',
    'Segment Deposit': 'Deposit_Mobilization',
    'Wadiah IFB Deposit': 'Deposit_Mobilization',
  };

  const productCategoryMap = {
    'Loan Saving Deposit': 'Loan_Saving_Deposit',
    'Michu Current Saving Deposit': 'Michu_Current_Saving',
    'Gihon Regular  Saving Deposit': 'Gihon_Regular_Saving',
    'Mothers Saving Deposit': 'Mothers_Saving',
    'Young Womens Saving Deposit': 'Young_Womens_Saving',
    'Elders Saving Deposit': 'Elders_Saving',
    'Children Saving Deposit': 'Children_Saving',
    'Fixed Time Deposit': 'Fixed_Time_Deposit',
    'Premium saving deposit': 'Premium_Saving_Deposit',
    'Special Saving': 'Special_Saving',
    'Segment Deposit': 'Segment_Deposit',
    'Wadiah IFB Deposit': 'Wadiah_IFB_Deposit',
  };

  const createdPlans = [];
  for (const pp of productPlans) {
    const kpiCategory = kpiCategoryMap[pp.name] || 'Deposit_Mobilization';
    const productCategory = productCategoryMap[pp.name];
    const monthlyPlan = monthNames.map((m, i) => ({
      month: m,
      amount: pp.monthlyTargets[i] || 0,
      count: 0,
    }));

    const plan = await prisma.plan.create({
      data: {
        branch_code: 'WOLAYTA_SODO',
        branchId: branch.id,
        kpi_category: kpiCategory,
        product_category: productCategory,
        period: 'FY-2026-27',
        target_value: pp.annualTarget,
        target_count: 0,
        monthly_plan: monthlyPlan,
        target_type: 'incremental',
        status: 'Active',
        createdById: admin.id,
      },
    });
    createdPlans.push(plan);
    console.log(`   ${pp.name.padEnd(35)} ${pp.annualTarget.toLocaleString().padStart(12)} ETB`);
  }

  // Create KPI-based plans
  const kpiPlans = [
    { name: 'Aggregate Member Deposit', kpi: 'Deposit_Mobilization', target: productPlans.reduce((s, p) => s + p.annualTarget, 0) },
    { name: 'Collection Rate', kpi: 'Collection_Rate', target: 95 },
    { name: 'Portfolio Quality', kpi: 'Portfolio_Quality', target: 98 },
  ];

  for (const kp of kpiPlans) {
    const exists = createdPlans.some(p => p.kpi_category === kp.kpi && !p.product_category);
    if (!exists) {
      const plan = await prisma.plan.create({
        data: {
          branch_code: 'WOLAYTA_SODO',
          branchId: branch.id,
          kpi_category: kp.kpi,
          period: 'FY-2026-27',
          target_value: kp.target,
          target_type: 'incremental',
          status: 'Active',
          createdById: admin.id,
        },
      });
      createdPlans.push(plan);
      console.log(`   ${kp.name.padEnd(35)} ${kp.target.toLocaleString().padStart(12)}`);
    }
  }

  console.log(`   ✅ ${createdPlans.length} plans created`);

  // ========== CASCADE PLANS TO STAFF ==========
  console.log('\n📊 Cascading plans to staff...');
  const { cascadeBranchPlan } = await import('../utils/planCascade.js');
  for (const plan of createdPlans) {
    try {
      await cascadeBranchPlan(plan);
    } catch (e) {
      console.log(`   ⚠️  Cascade warning for ${plan.kpi_category}: ${e.message}`);
    }
  }
  console.log('   ✅ Plans cascaded to staff');

  // ========== CREATE ACCOUNT MAPPINGS ==========
  console.log(`\n💳 Creating ${accounts.length} account mappings...`);

  const staffMap = {};
  for (const su of staffUsers) {
    staffMap[su.username] = su.user;
  }

  // Create product-KPI mappings
  const existingMappings = await prisma.productKpiMapping.findMany();
  if (existingMappings.length === 0) {
    const productToKpi = {
      'Michu Current Account': 'Deposit_Mobilization',
      'LOAN SAVING RESERVE ACCOUNT': 'Deposit_Mobilization',
      'GIHON REGULAR SAVING': 'Deposit_Mobilization',
      'MOTHERS SAVING ACCOUNT': 'Deposit_Mobilization',
      'YOUNG WOMEN SAVING': 'Deposit_Mobilization',
      'ELDERS SAVING ACCOUNT': 'Deposit_Mobilization',
      'CHILDREN SAVING ACCOUNT': 'Deposit_Mobilization',
      'FIXED TIME DEPOSIT': 'Deposit_Mobilization',
      'Premium Saving': 'Deposit_Mobilization',
      'SPECIAL SAVING ACCOUNT': 'Deposit_Mobilization',
      'Segment Account': 'Deposit_Mobilization',
      'WADIAH SAVING ACCOUNT': 'Deposit_Mobilization',
      'REPAYMENT ACCOUNT': 'Collection_Rate',
      'School': 'Deposit_Mobilization',
    };
    for (const [prod, kpi] of Object.entries(productToKpi)) {
      await prisma.productKpiMapping.create({
        data: { cbs_product_name: prod, kpi_category: kpi, min_balance: prod === 'Michu Current Account' ? 1000 : 0, status: 'active', mappedById: admin.id },
      });
    }
    console.log('   ✅ Product-KPI mappings created');
  }

  let mappedCount = 0;
  let skippedCount = 0;
  const batchSize = 100;
  let batch = [];

  // First, assign supervisors for staff
  const supervisors = staffUsers.filter(su => su.user.role === 'supervisor').map(su => su.user);
  const regularStaff = staffUsers.filter(su => su.user.role === 'staff');
  const supCycle = supervisors.length > 0 ? supervisors : [branchManager];

  // Assign supervisors to staff round-robin
  for (let i = 0; i < regularStaff.length; i++) {
    const sup = supCycle[i % supCycle.length];
    await prisma.user.update({
      where: { id: regularStaff[i].user.id },
      data: { supervisorId: sup.id },
    });
  }

  const juneBalances = [];

  for (const acct of accounts) {
    const mappedUser = staffMap[acct.registeredBy] || regularStaff[Math.floor(Math.random() * regularStaff.length)]?.user || admin;

    const juneBal = Math.max(0, acct.balance - (acct.credits > acct.balance ? acct.credits - acct.balance : 0));
    const accountType = acct.category.includes('LOAN') ? 'Loan' : acct.category.includes('SAVING') || acct.category.includes('Saving') ? 'Savings' : 'Current';
    const isProductive = acct.balance >= 1000;

    batch.push({
      accountNumber: acct.acctNo,
      customerName: acct.custName,
      accountType,
      balance: acct.balance,
      current_balance: acct.balance,
      june_balance: juneBal,
      active_status: acct.status === 'Verified',
      isProductive,
      phoneNumber: '',
      status: acct.status === 'Verified' ? 'Active' : 'Inactive',
      mappedToId: mappedUser.id,
      mappedById: admin.id,
      branchId: branch.id,
    });

    if (acct.status === 'Verified') {
      juneBalances.push({
        account_id: acct.acctNo,
        accountNumber: acct.acctNo,
        june_balance: juneBal,
        branch_code: 'WOLAYTA_SODO',
        baseline_period: 'FY-2026-27',
        baseline_date: new Date('2026-06-30'),
        is_active: true,
        importedById: admin.id,
      });
    }

    if (batch.length >= batchSize) {
      await prisma.accountMapping.createMany({ data: batch, skipDuplicates: true });
      mappedCount += batch.length;
      batch = [];
      process.stdout.write(`\r   ${mappedCount} accounts created...`);
    }
  }

  if (batch.length > 0) {
    await prisma.accountMapping.createMany({ data: batch, skipDuplicates: true });
    mappedCount += batch.length;
  }

  console.log(`\n   ✅ ${mappedCount} account mappings created`);

  // ========== CREATE JUNE BALANCES ==========
  console.log(`\n📅 Creating ${juneBalances.length} June balances...`);
  const juneBatchSize = 500;
  for (let i = 0; i < juneBalances.length; i += juneBatchSize) {
    const batch = juneBalances.slice(i, i + juneBatchSize);
    await prisma.juneBalance.createMany({ data: batch, skipDuplicates: true });
    process.stdout.write(`\r   ${Math.min(i + juneBatchSize, juneBalances.length)} / ${juneBalances.length}`);
  }
  console.log(`\n   ✅ June balances created`);

  // ========== SAMPLE DAILY TASKS ==========
  console.log('\n📝 Creating sample daily tasks...');
  const taskTypes = ['Loan_Saving_Deposit', 'Michu_Current_Saving', 'Gihon_Regular_Saving', 'Mothers_Saving', 'Premium_Saving_Deposit'];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  let taskCount = 0;

  for (const su of regularStaff.slice(0, 5)) {
    const staffMappings = await prisma.accountMapping.findMany({
      where: { mappedToId: su.user.id, status: 'Active' },
      take: 3,
    });
    for (let i = 0; i < staffMappings.length; i++) {
      const mapping = staffMappings[i];
      const taskType = taskTypes[i % taskTypes.length];
      const amount = Math.floor(Math.random() * 5000) + 500
        ? Math.floor(Math.random() * 5000) + 500 : 0;
      const taskDate = i < 2 ? today : yesterday;

      const task = await prisma.dailyTask.create({
        data: {
          taskType,
          accountNumber: mapping.accountNumber,
          accountId: mapping.id,
          amount,
          remarks: `${taskType.replace(/_/g, ' ')} - ${mapping.customerName}`,
          submittedById: su.user.id,
          branchId: branch.id,
          mappingStatus: 'Mapped_to_You',
          approvalStatus: 'Approved',
          cbsValidated: true,
          cbsValidatedAt: new Date(),
          taskDate,
        },
      });

      for (const approver of [supCycle[0], branchManager]) {
        await prisma.taskApproval.create({
          data: {
            taskId: task.id,
            approverId: approver.id,
            role: approver.role === 'branchManager' ? 'Branch Manager' : 'supervisor',
            status: 'Approved',
            approvedAt: new Date(),
          },
        });
      }
      taskCount++;
    }
  }
  console.log(`   ✅ ${taskCount} sample daily tasks created`);

  // ========== SUMMARY ==========
  const userCount = await prisma.user.count();
  const planCount = await prisma.plan.count();
  const accountCount = await prisma.accountMapping.count();
  const juneCount = await prisma.juneBalance.count();
  const staffPlanCount = await prisma.staffPlan.count();

  console.log('\n' + '='.repeat(60));
  console.log('✅ SEEDING COMPLETE!');
  console.log('='.repeat(60));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Region:             1 (South Region)`);
  console.log(`   Area:               1 (Wolayta Area)`);
  console.log(`   Branch:             1 (Wolayta Sodo)`);
  console.log(`   Users:              ${userCount}`);
  console.log(`   Plans:              ${planCount}`);
  console.log(`   Staff Plans:        ${staffPlanCount}`);
  console.log(`   Accounts:           ${accountCount}`);
  console.log(`   June Balances:      ${juneCount}`);

  console.log(`\n📋 LOGIN CREDENTIALS (password: ${PASSWORD}):`);
  console.log(`   Admin:              admin@ghion.et`);
  console.log(`   Area Manager:       am@wolayta.et`);
  console.log(`   Branch Manager:     bm@sodo.et`);
  console.log(`   ${staffUsers.length} staff users: {username}@ghion.et`);

  console.log(`\n📋 STAFF EMAILS:`);
  for (const su of staffUsers.slice(0, 10)) {
    console.log(`   ${su.user.role === 'supervisor' ? '🔶' : '   '} ${su.user.name.padEnd(20)} ${su.user.email}`);
  }
  if (staffUsers.length > 10) {
    console.log(`   ... and ${staffUsers.length - 10} more`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main()
  .catch(e => { console.error('❌ Seed error:', e); prisma.$disconnect(); process.exit(1); });
