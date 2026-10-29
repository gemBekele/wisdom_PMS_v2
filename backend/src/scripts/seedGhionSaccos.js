import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { normalizePeriod } from '../utils/periodUtils.js';

dotenv.config();

const prisma = new PrismaClient();

const PASSWORD = '1234';

const HABESHA_CUSTOMERS = [
  { name: 'Amanuel G/Hiwot', phone: '+251911123456' },
  { name: 'Birtukan Tadesse', phone: '+251922234567' },
  { name: 'Chaltu Ayana', phone: '+251933345678' },
  { name: 'Dawit Wondimu', phone: '+251944456789' },
  { name: 'Eyerusalem Hailu', phone: '+251955567890' },
  { name: 'Frehiwot Alemu', phone: '+251966678901' },
  { name: 'Genet Gebre', phone: '+251977789012' },
  { name: 'Hiwot Belayneh', phone: '+251988890123' },
  { name: 'Kebede Molla', phone: '+251999901234' },
  { name: 'Lemlem Desta', phone: '+251910112345' },
  { name: 'Meseret Ayele', phone: '+251911223456' },
  { name: 'Mekdes Worku', phone: '+251922334567' },
  { name: 'Selam Tesfaye', phone: '+251933445678' },
  { name: 'Tigist Haile', phone: '+251944556789' },
  { name: 'Wubet Abebe', phone: '+251955667890' },
  { name: 'Yordanos Tekle', phone: '+251966778901' },
  { name: 'Zerihun Assefa', phone: '+251977889012' },
  { name: 'Tsion Wondimu', phone: '+251988990123' },
  { name: 'Ruth Demeke', phone: '+251999001234' },
  { name: 'Meron Tadesse', phone: '+251910223345' },
  { name: 'Abel Hailemariam', phone: '+251911334456' },
  { name: 'Betelhem Assefa', phone: '+251922445567' },
  { name: 'Saron Mamo', phone: '+251933556678' },
  { name: 'Nahom Gebru', phone: '+251944667789' },
  { name: 'Rahel Tekle', phone: '+251955778890' },
  { name: 'Yonas Araya', phone: '+251966889901' },
  { name: 'Mahlet Girma', phone: '+251977990012' },
  { name: 'Biruk Teshome', phone: '+251988001123' },
  { name: 'Sisay Demissie', phone: '+251999112234' },
  { name: 'Hanna Woldemariam', phone: '+251910223345' },
  { name: 'Temesgen Shiferaw', phone: '+251911445567' },
  { name: 'Mulugeta Dagne', phone: '+251922556678' },
  { name: 'Azeb Tekle', phone: '+251933667789' },
  { name: 'Gashaw Andualem', phone: '+251944778890' },
  { name: 'Worknesh Mekonnen', phone: '+251955889901' },
  { name: 'Eyob Kassa', phone: '+251966990012' },
  { name: 'Tigist Wondimu', phone: '+251977001123' },
  { name: 'Behailu Alemu', phone: '+251988112234' },
  { name: 'Mastewal Desta', phone: '+251999223345' },
  { name: 'Henok G/hiwot', phone: '+251910334456' },
];

async function clearAllData() {
  await prisma.taskApproval.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.performanceScore.deleteMany();
  await prisma.behavioralEvaluation.deleteMany();
  await prisma.staffPlan.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.accountMapping.deleteMany();
  await prisma.juneBalance.deleteMany();
  await prisma.productKpiMapping.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.branch.updateMany({ where: { managerId: { not: null } }, data: { managerId: null } });
  await prisma.area.updateMany({ where: { managerId: { not: null } }, data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.area.deleteMany();
}

async function main() {
  console.log('🌱 Seeding Ghion SACCOS...\n');

  await clearAllData();
  console.log('✅ Cleared all existing data\n');

  const hashed = await bcrypt.hash(PASSWORD, 10);

  // ===== AREA =====
  const area = await prisma.area.create({
    data: { name: 'Wolayta Zone', code: 'WOLAYTA_AREA', isActive: true },
  });
  console.log('✅ Area created: Wolayta Zone');

  // ===== BRANCH (Bole only) =====
  const sodoBranch = await prisma.branch.create({
    data: { name: 'Wolayta Sodo Branch', code: 'WOLAYTA_SODO', areaId: area.id, isActive: true },
  });
  console.log('✅ Branch created: Wolayta Sodo');

  // ===== USERS =====
  const admin = await prisma.user.create({
    data: { employeeId: 'ADMIN001', name: 'Temesgen', email: 'biruk.assefa@ghion.et', password: hashed, role: 'admin', position: 'CEO', isActive: true },
  });

  const am = await prisma.user.create({
    data: { employeeId: 'AM-WOL-001', name: 'Abebech G/Hiwot', email: 'abebech.ghiwot@ghion.et', password: hashed, role: 'areaManager', position: 'Area_Manager', areaId: area.id, isActive: true },
  });
  await prisma.area.update({ where: { id: area.id }, data: { managerId: am.id } });

  const bmBole = await prisma.user.create({
    data: { employeeId: 'BM-WOL-001', name: 'Meron Kebede', email: 'meron.kebede@ghion.et', password: hashed, role: 'branchManager', position: 'Branch_Manager', branchId: sodoBranch.id, branch_code: 'WOLAYTA_SODO', areaId: area.id, isActive: true },
  });
  await prisma.branch.update({ where: { id: sodoBranch.id }, data: { managerId: bmBole.id } });

  const supBoleOps = await prisma.user.create({
    data: { employeeId: 'SUP-WOL-OPS', name: 'Henok Tadesse', email: 'henok.tadesse@ghion.et', password: hashed, role: 'supervisor', position: 'Operation_Supervisor', branchId: sodoBranch.id, branch_code: 'WOLAYTA_SODO', areaId: area.id, isActive: true },
  });
  const supBoleCR = await prisma.user.create({
    data: { employeeId: 'SUP-WOL-CR', name: 'Tsion Haile', email: 'tsion.haile@ghion.et', password: hashed, role: 'supervisor', position: 'Customer_Relationship_Supervisor', branchId: sodoBranch.id, branch_code: 'WOLAYTA_SODO', areaId: area.id, isActive: true },
  });

  const staffBolCS1 = await prisma.user.create({
    data: { employeeId: 'STF-WOL-CS1', name: 'Lemlem Wondimu', email: 'lemlem.wondimu@ghion.et', password: hashed, role: 'staff', position: 'Customer_Service_Officer_I', branchId: sodoBranch.id, branch_code: 'WOLAYTA_SODO', areaId: area.id, supervisorId: supBoleOps.id, isActive: true },
  });
  const staffBolCS2 = await prisma.user.create({
    data: { employeeId: 'STF-WOL-CS2', name: 'Yonas Alemu', email: 'yonas.alemu@ghion.et', password: hashed, role: 'staff', position: 'Customer_Service_Officer_II', branchId: sodoBranch.id, branch_code: 'WOLAYTA_SODO', areaId: area.id, supervisorId: supBoleOps.id, isActive: true },
  });
  const staffBolCR = await prisma.user.create({
    data: { employeeId: 'STF-WOL-CR1', name: 'Birtukan Mamo', email: 'birtukan.mamo@ghion.et', password: hashed, role: 'staff', position: 'Customer_Relationship_Officer_I', branchId: sodoBranch.id, branch_code: 'WOLAYTA_SODO', areaId: area.id, supervisorId: supBoleCR.id, isActive: true },
  });

  console.log('✅ 8 users created with Ethiopian names and supervisor assignments');

  // ===== PLANS (Deposit Mobilization only) =====
  const PERIOD = normalizePeriod('2025-H2');
  const kpiTargets = {
    Deposit_Mobilization: 10000000,
  };

  for (const [kpi, target] of Object.entries(kpiTargets)) {
    const plan = await prisma.plan.create({
      data: {
        branch_code: 'WOLAYTA_SODO',
        branchId: sodoBranch.id,
        kpi_category: kpi,
        period: PERIOD,
        target_value: target,
        target_type: 'incremental',
        status: 'Active',
        createdById: bmBole.id,
      },
    });
    console.log(`  Plan: ${kpi} = ${target} for WOLAYTA_SODO`);
  }
  console.log('✅ Plans created for Wolayta Sodo branch');

  // ===== CASCADE TO STAFF =====
  const { cascadeBranchPlan } = await import('../utils/planCascade.js');
  const allPlans = await prisma.plan.findMany();
  for (const plan of allPlans) {
    await cascadeBranchPlan(plan);
  }
  console.log('✅ Plans cascaded to all staff via position groups');

  // ===== PRODUCT MAPPINGS (deposit products only) =====
  const products = [
    { name: 'Medbegna Saving', kpi: 'Deposit_Mobilization' },
    { name: 'Felagot Saving', kpi: 'Deposit_Mobilization' },
    { name: 'Super Saving', kpi: 'Deposit_Mobilization' },
    { name: 'Digital Saving', kpi: 'Deposit_Mobilization' },
  ];

  for (const prod of products) {
    await prisma.productKpiMapping.create({
      data: {
        cbs_product_name: prod.name,
        kpi_category: prod.kpi,
        min_balance: 1000,
        requiresCbs: false,
        status: 'active',
        mappedById: admin.id,
      },
    });
  }
  console.log('✅ 4 deposit product mappings created');

  // ===== ACCOUNT MAPPINGS (all to Bole staff) =====
  const bolStaff = [staffBolCS1, staffBolCS2, staffBolCR];

  let accNum = 200001;
  for (let i = 0; i < HABESHA_CUSTOMERS.length; i++) {
    const c = HABESHA_CUSTOMERS[i];
    const staff = bolStaff[i % bolStaff.length];
    const juneBal = 1200 + i * 280 + Math.floor(Math.random() * 500);
    const growth = Math.floor(Math.random() * 3500) + 200;
    const currentBal = juneBal + growth;
    const accountNumber = `GH${String(accNum++)}`;

    await prisma.accountMapping.create({
      data: {
        accountNumber,
        customerName: c.name,
        accountType: i % 5 === 0 ? 'Current' : 'Savings',
        balance: currentBal,
        current_balance: currentBal,
        june_balance: juneBal,
        active_status: true,
        isProductive: currentBal >= 1000,
        phoneNumber: c.phone,
        status: 'Active',
        mappedToId: staff.id,
        mappedById: admin.id,
        branchId: sodoBranch.id,
      },
    });
  }
  console.log(`✅ ${HABESHA_CUSTOMERS.length} account mappings created across 3 Bole staff`);

  // ===== JUNE BALANCES =====
  const mappings = await prisma.accountMapping.findMany();
  for (const m of mappings) {
    await prisma.juneBalance.create({
      data: {
        account_id: m.accountNumber,
        accountNumber: m.accountNumber,
        june_balance: m.june_balance,
        branch_code: 'WOLAYTA_SODO',
        baseline_period: '2025',
        baseline_date: new Date('2025-06-30'),
        is_active: true,
        importedById: admin.id,
      },
    });
  }
  console.log('✅ June balances created for all accounts');

  // ===== SAMPLE DAILY TASKS (Bole CS Officers — fully approved) =====
  const taskTypes = ['Michu_Current_Saving', 'Gihon_Regular_Saving', 'Loan_Saving_Deposit', 'Mothers_Saving', 'Premium_Saving_Deposit'];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const approvedStaff = [staffBolCS1, staffBolCS2];
  for (const staff of approvedStaff) {
    const branchId = staff.branchId;
    const staffMappings = mappings.filter(m => m.mappedToId === staff.id);
    const numTasks = Math.min(3, staffMappings.length);
    for (let i = 0; i < numTasks; i++) {
      const mapping = staffMappings[i];
      const taskType = taskTypes[i % taskTypes.length];
      const amount = Math.floor(Math.random() * 5000) + 500;

      const taskDate = i < 2 ? today : yesterday;

      const task = await prisma.dailyTask.create({
        data: {
          taskType,
          accountNumber: mapping.accountNumber,
          accountId: mapping.id,
          amount,
          remarks: `${taskType.replace(/_/g, ' ')} - ${mapping.customerName}`,
          submittedById: staff.id,
          branchId,
          mappingStatus: 'Mapped_to_You',
          approvalStatus: 'Approved',
          cbsValidated: true,
          cbsValidatedAt: new Date(),
          taskDate,
        },
      });

      // Supervisor approval
      await prisma.taskApproval.create({
        data: {
          taskId: task.id,
          approverId: supBoleOps.id,
          role: 'supervisor',
          status: 'Approved',
          approvedAt: new Date(),
        },
      });

      // Branch Manager approval
      await prisma.taskApproval.create({
        data: {
          taskId: task.id,
          approverId: bmBole.id,
          role: 'Branch Manager',
          status: 'Approved',
          approvedAt: new Date(),
        },
      });
    }
  }
  console.log('✅ Approved daily tasks created for Bole CS Officers');

  // ===== BIRTUKAN MAMO PENDING TASK (for approval workflow demo) =====
  const birtukanMapping = mappings.find(m => m.mappedToId === staffBolCR.id);
  if (birtukanMapping) {
    const pendingTask = await prisma.dailyTask.create({
      data: {
        taskType: 'Michu_Current_Saving',
        accountNumber: birtukanMapping.accountNumber,
        accountId: birtukanMapping.id,
        amount: 10000,
        remarks: `Deposit Mobilization - ${birtukanMapping.customerName}`,
        submittedById: staffBolCR.id,
        branchId: staffBolCR.branchId,
        mappingStatus: 'Mapped_to_You',
        approvalStatus: 'Pending',
        cbsValidated: true,
        cbsValidatedAt: new Date(),
        taskDate: today,
      },
    });

    // Supervisor approval record (Pending — Tsion must approve first)
    await prisma.taskApproval.create({
      data: {
        taskId: pendingTask.id,
        approverId: supBoleCR.id,
        role: 'supervisor',
        status: 'Pending',
      },
    });

    // Branch Manager approval record (Pending — blocked until supervisor approves)
    await prisma.taskApproval.create({
      data: {
        taskId: pendingTask.id,
        approverId: bmBole.id,
        role: 'Branch Manager',
        status: 'Pending',
      },
    });

    console.log(`✅ Pending task created: Birtukan Mamo — Deposit Mobilization — ${birtukanMapping.accountNumber} — 10,000 ETB`);
  } else {
    console.log('⚠️  No mapping found for Birtukan Mamo, skipping pending task');
  }

  // ===== SAMPLE BEHAVIORAL EVALUATIONS =====
  const competencies = [
    { competencyName: 'Communication', score: 4, maxScore: 5 },
    { competencyName: 'Teamwork', score: 3, maxScore: 5 },
    { competencyName: 'Problem Solving', score: 3, maxScore: 5 },
    { competencyName: 'Adaptability', score: 4, maxScore: 5 },
    { competencyName: 'Leadership', score: 3, maxScore: 5 },
    { competencyName: 'Customer Focus', score: 4, maxScore: 5 },
    { competencyName: 'Initiative', score: 3, maxScore: 5 },
    { competencyName: 'Reliability', score: 4, maxScore: 5 },
  ];

  const evalStaff = [staffBolCS1, staffBolCS2, staffBolCR];
  for (const staff of evalStaff) {
    const totalScore = competencies.reduce((s, c) => s + c.score, 0);
    await prisma.behavioralEvaluation.create({
      data: {
        evaluatedUserId: staff.id,
        evaluatedById: staff.supervisorId,
        branchId: staff.branchId,
        period: 'Monthly',
        year: 2026,
        month: 6,
        competencies,
        totalScore,
        overallComments: 'Good performance this month. Continue the excellent work on customer service.',
        approvalStatus: 'Approved',
        isLocked: true,
        lockedAt: new Date(),
      },
    });
  }
  console.log('✅ Behavioral evaluations created for 3 staff members');

  // ===== CREDENTIALS =====
  console.log(`\n============================================================`);
  console.log(`✅ GHION SACCOS SEED COMPLETE!`);
  console.log(`============================================================`);
  console.log(`\n📋 LOGIN CREDENTIALS (password: ${PASSWORD}):\n`);
  console.log(`  Admin (CEO):         biruk.assefa@ghion.et`);
  console.log(`  Area Manager:        abebech.ghiwot@ghion.et`);
  console.log(`  BM Bole:             meron.kebede@ghion.et`);
  console.log(`  Sup Ops (Bole):      henok.tadesse@ghion.et`);
  console.log(`  Sup CR (Bole):       tsion.haile@ghion.et`);
  console.log(`  CS Officer I (Bole): lemlem.wondimu@ghion.et`);
  console.log(`  CS Officer II (Bole): yonas.alemu@ghion.et`);
  console.log(`  CR Officer (Bole):   birtukan.mamo@ghion.et`);

  console.log(`\n📊 Summary:`);
  console.log(`  Area: 1 (Hawassa)`);
  console.log(`  Branches: 1 (Wolayta Sodo)`);
  console.log(`  Users: 8 (1 admin, 1 AM, 1 BM, 2 supervisors, 3 staff)`);
  console.log(`  Plans: 1 (Deposit Mobilization)`);
  console.log(`  Products: 4 mapped`);
  console.log(`  Accounts: ${HABESHA_CUSTOMERS.length} mapped`);
  console.log(`  Tasks: created for 2 CS Officers`);
  console.log(`  Evaluations: 3 behavioral`);
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
