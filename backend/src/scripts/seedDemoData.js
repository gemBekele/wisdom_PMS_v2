import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { cascadeBranchPlan } from '../utils/planCascade.js';
import { calculateKPIScore, calculateRating, generateNplSnapshot } from '../utils/performanceCalculator.js';

dotenv.config();

const prisma = new PrismaClient();

const PERIOD = 'FY-2026-27';
const BRANCH_CODE = 'DEMO-BRANCH';
const STAFF_PASSWORD = 'staff123';

const CUSTOMERS = [
  'Amanuel G/Hiwot', 'Birtukan Tadesse', 'Chaltu Ayana', 'Dawit Wondimu',
  'Eyerusalem Hailu', 'Frehiwot Alemu', 'Genet Gebre', 'Hiwot Belayneh',
  'Kebede Molla', 'Lemlem Desta', 'Meseret Ayele', 'Mekdes Worku',
  'Selam Tesfaye', 'Tigist Haile', 'Wubet Abebe', 'Yordanos Tekle',
  'Zerihun Assefa', 'Tsion Wondimu', 'Ruth Demeke', 'Meron Tadesse',
  'Abel Hailemariam', 'Betelhem Assefa', 'Saron Mamo', 'Nahom Gebru',
  'Rahel Tekle', 'Yonas Araya', 'Mahlet Girma', 'Biruk Teshome',
  'Sisay Demissie', 'Hanna Woldemariam', 'Temesgen Shiferaw', 'Mulugeta Dagne',
  'Azeb Tekle', 'Gashaw Andualem', 'Worknesh Mekonnen', 'Eyob Kassa',
  'Tigist Wondimu', 'Behailu Alemu', 'Mastewal Desta', 'Henok G/hiwot',
];

const DEPOSIT_TASK_TYPES = [
  'Fixed_Time_Deposit', 'Premium_Saving_Deposit', 'Mothers_Saving',
  'Special_Saving', 'Michu_Current_Saving', 'Gihon_Regular_Saving',
];

const ACCOUNT_PRODUCTS = [
  'FIXED TIME DEPOSIT', 'Premium Saving Deposit', 'MOTHERS SAVING ACCOUNT',
  'SPECIAL SAVING ACCOUNT', 'Michu Current Account',
];

async function clearDemoData() {
  await prisma.performanceScore.deleteMany();
  await prisma.behavioralEvaluation.deleteMany();
  await prisma.taskApproval.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.loanSchedule.deleteMany();
  await prisma.accountMapping.deleteMany();
  await prisma.juneBalance.deleteMany();
  await prisma.nplSnapshot.deleteMany();
  await prisma.staffPlan.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.cBSDiscrepancy.deleteMany();
  await prisma.cBSValidation.deleteMany();
  await prisma.productKpiMapping.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.updateMany({ data: { teamId: null } });
  await prisma.team.deleteMany();
}

async function ensureUsers() {
  const hashed = await bcrypt.hash('admin123', 10);
  const rolePasswords = {
    admin: hashed,
    area: await bcrypt.hash('area123', 10),
    branch: await bcrypt.hash('branch123', 10),
    supervisor: await bcrypt.hash('supervisor123', 10),
    staff: await bcrypt.hash(STAFF_PASSWORD, 10),
  };

  const region = await prisma.region.upsert({
    where: { code: 'DEMO-REG' },
    update: {},
    create: { name: 'Demo Region', code: 'DEMO-REG' },
  });
  const area = await prisma.area.upsert({
    where: { code: 'DEMO-AREA' },
    update: {},
    create: { name: 'Demo Area', code: 'DEMO-AREA', regionId: region.id },
  });
  const branch = await prisma.branch.upsert({
    where: { code: BRANCH_CODE },
    update: {},
    create: { name: 'Demo Branch', code: BRANCH_CODE, areaId: area.id },
  });

  const upsertUser = async (data, password) => prisma.user.upsert({
    where: { email: data.email },
    update: { ...data, password, isActive: true },
    create: { ...data, password, isActive: true },
  });

  const admin = await upsertUser({
    employeeId: 'ADMIN001', name: 'System Administrator', email: 'admin@wisdomsaccos.com',
    role: 'admin', position: 'CEO',
  }, rolePasswords.admin);

  const areaManager = await upsertUser({
    employeeId: 'AM001', name: 'Alem Area Manager', email: 'areamanager@wisdomsaccos.com',
    role: 'areaManager', position: 'Area_Manager', areaId: area.id, branchId: null, branch_code: null,
  }, rolePasswords.area);

  const branchManager = await upsertUser({
    employeeId: 'BM001', name: 'Abebe Branch Manager', email: 'branchmanager@wisdomsaccos.com',
    role: 'branchManager', position: 'Branch_Manager', branchId: branch.id,
    branch_code: branch.code, areaId: area.id,
  }, rolePasswords.branch);

  const supervisor = await upsertUser({
    employeeId: 'SUP001', name: 'Sara Supervisor', email: 'supervisor@wisdomsaccos.com',
    role: 'supervisor', position: 'Operation_Supervisor', branchId: branch.id,
    branch_code: branch.code, areaId: area.id,
  }, rolePasswords.supervisor);

  const staff = await upsertUser({
    employeeId: 'STAFF001', name: 'Selam Staff', email: 'staff@wisdomsaccos.com',
    role: 'staff', position: 'Customer_Service_Officer_I', branchId: branch.id,
    branch_code: branch.code, areaId: area.id, supervisorId: supervisor.id,
  }, rolePasswords.staff);

  const extraStaff = [
    { employeeId: 'STAFF002', name: 'Dawit Bekele', email: 'staff2@wisdomsaccos.com', position: 'Customer_Service_Officer_II' },
    { employeeId: 'STAFF003', name: 'Marta Girma', email: 'staff3@wisdomsaccos.com', position: 'Customer_Relationship_Officer_I' },
    { employeeId: 'STAFF004', name: 'Yonas Tesfaye', email: 'staff4@wisdomsaccos.com', position: 'Sales_Marketing_Officer_I' },
  ];

  const staffUsers = [staff];
  for (const s of extraStaff) {
    staffUsers.push(await upsertUser({
      ...s, role: 'staff', branchId: branch.id, branch_code: branch.code,
      areaId: area.id, supervisorId: supervisor.id,
    }, rolePasswords.staff));
  }

  await prisma.area.update({ where: { id: area.id }, data: { managerId: areaManager.id } });
  await prisma.branch.update({ where: { id: branch.id }, data: { managerId: branchManager.id } });

  const team = await prisma.team.create({
    data: {
      name: 'Demo Branch Team',
      code: 'DEMO-BRANCH-TEAM',
      branchId: branch.id,
      managerId: supervisor.id,
      members: { connect: staffUsers.map(u => ({ id: u.id })) },
    },
  });
  await prisma.user.updateMany({
    where: { id: { in: staffUsers.map(u => u.id) } },
    data: { teamId: team.id },
  });

  return { region, area, branch, admin, areaManager, branchManager, supervisor, staffUsers, team };
}

async function main() {
  console.log('🌱 Seeding Wisdom SACCOS demo data...\n');
  await clearDemoData();
  const ctx = await ensureUsers();
  const { branch, admin, branchManager, supervisor, staffUsers } = ctx;

  // Plans
  const planDefs = [
    { kpi_category: 'Deposit_Mobilization', target_value: 250000 },
    { kpi_category: 'Collection_Rate', target_value: 95 },
    { kpi_category: 'Portfolio_Quality', target_value: 90 },
  ];
  for (const def of planDefs) {
    const plan = await prisma.plan.create({
      data: {
        branch_code: branch.code,
        branchId: branch.id,
        kpi_category: def.kpi_category,
        period: PERIOD,
        target_value: def.target_value,
        target_type: 'incremental',
        status: 'Active',
        createdById: branchManager.id,
      },
    });
    await cascadeBranchPlan(plan);
  }

  // Percentage targets are the same per staff member, not share-split.
  for (const sp of await prisma.staffPlan.findMany({
    where: { branch_code: branch.code, kpi_category: { in: ['Collection_Rate', 'Portfolio_Quality'] } },
  })) {
    const target = sp.kpi_category === 'Collection_Rate' ? 95 : 90;
    await prisma.staffPlan.update({
      where: { id: sp.id },
      data: {
        individual_target: target, yearly_target: target, monthly_target: target,
        weekly_target: target, daily_target: target, target_count: 0,
      },
    });
  }
  console.log('✅ Plans and staff targets created');

  // Product mappings
  for (const product of ACCOUNT_PRODUCTS) {
    await prisma.productKpiMapping.upsert({
      where: { cbs_product_name: product },
      update: { kpi_category: 'Deposit_Mobilization', requiresCbs: false, status: 'active' },
      create: {
        cbs_product_name: product, kpi_category: 'Deposit_Mobilization',
        min_balance: 1000, requiresCbs: false, status: 'active', mappedById: admin.id,
      },
    });
  }
  console.log('✅ Product mappings created');

  // Accounts + baselines
  const accounts = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const owner = staffUsers[i % staffUsers.length];
    const june = 10000 + ((i * 1731) % 70000);
    const growth = 2000 + ((i * 977) % 18000);
    const current = june + growth;
    const product = ACCOUNT_PRODUCTS[i % ACCOUNT_PRODUCTS.length];
    const accountNumber = `WD${100000 + i}`;
    const account = await prisma.accountMapping.create({
      data: {
        accountNumber,
        customerName: CUSTOMERS[i],
        accountType: i % 7 === 0 ? 'Current' : 'Savings',
        balance: current,
        current_balance: current,
        june_balance: june,
        active_status: true,
        isProductive: current >= 1000,
        phoneNumber: `+2519${String(10000000 + i * 137).slice(-8)}`,
        product,
        status: 'Active',
        mappedToId: owner.id,
        mappedById: branchManager.id,
        branchId: branch.id,
      },
    });
    accounts.push(account);
    await prisma.juneBalance.create({
      data: {
        account_id: accountNumber,
        accountNumber,
        june_balance: june,
        branch_code: branch.code,
        baseline_period: '2026-06-30',
        baseline_date: new Date('2026-06-30'),
        is_active: true,
        importedById: admin.id,
      },
    });
  }
  console.log(`✅ ${accounts.length} accounts and baselines created`);

  // Tasks + approvals
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let taskCount = 0;
  for (let s = 0; s < staffUsers.length; s++) {
    const owner = staffUsers[s];
    const ownAccounts = accounts.filter(a => a.mappedToId === owner.id);
    for (let i = 0; i < Math.min(4, ownAccounts.length); i++) {
      const account = ownAccounts[i];
      const taskDate = new Date(today);
      taskDate.setDate(taskDate.getDate() - i);
      const task = await prisma.dailyTask.create({
        data: {
          taskType: DEPOSIT_TASK_TYPES[(s + i) % DEPOSIT_TASK_TYPES.length],
          accountNumber: account.accountNumber,
          accountId: account.id,
          amount: 1500 + ((s * 1700 + i * 2300) % 9000),
          remarks: `Deposit mobilization for ${account.customerName}`,
          submittedById: owner.id,
          branchId: branch.id,
          mappingStatus: 'Mapped_to_You',
          approvalStatus: 'Approved',
          cbsValidated: true,
          cbsValidatedAt: taskDate,
          taskDate,
          performanceImpacted: true,
          performanceImpactedAt: taskDate,
        },
      });
      await prisma.taskApproval.createMany({
        data: [
          { taskId: task.id, approverId: supervisor.id, role: 'supervisor', status: 'Approved', approvedAt: taskDate },
          { taskId: task.id, approverId: branchManager.id, role: 'Branch Manager', status: 'Approved', approvedAt: taskDate },
        ],
      });
      taskCount++;
    }
  }

  // Pending approval tasks
  for (let i = 0; i < 2; i++) {
    const owner = staffUsers[i];
    const account = accounts.find(a => a.mappedToId === owner.id);
    if (!account) continue;
    const task = await prisma.dailyTask.create({
      data: {
        taskType: DEPOSIT_TASK_TYPES[i % DEPOSIT_TASK_TYPES.length],
        accountNumber: account.accountNumber,
        accountId: account.id,
        amount: 5000 + i * 2500,
        remarks: `Pending approval - ${account.customerName}`,
        submittedById: owner.id,
        branchId: branch.id,
        mappingStatus: 'Mapped_to_You',
        approvalStatus: 'Pending',
        cbsValidated: false,
        taskDate: today,
      },
    });
    await prisma.taskApproval.createMany({
      data: [
        { taskId: task.id, approverId: supervisor.id, role: 'supervisor', status: 'Pending' },
        { taskId: task.id, approverId: branchManager.id, role: 'Branch Manager', status: 'Pending' },
      ],
    });
    taskCount++;
  }
  console.log(`✅ ${taskCount} daily tasks created`);

  // Behavioral evaluations
  const competencies = ['Communication', 'Teamwork', 'Problem Solving', 'Adaptability', 'Customer Focus', 'Initiative', 'Reliability', 'Integrity'];
  const evaluations = [];
  for (let i = 0; i < staffUsers.length; i++) {
    const totalScore = 11 + (i % 4);
    const ev = await prisma.behavioralEvaluation.create({
      data: {
        evaluatedUserId: staffUsers[i].id,
        evaluatedById: supervisor.id,
        branchId: branch.id,
        period: 'Annual',
        year: 2026,
        competencies: competencies.map((name, idx) => ({ competencyName: name, score: 3 + ((i + idx) % 3), maxScore: 5 })),
        totalScore,
        overallComments: 'Consistent performer with strong customer focus.',
        approvalStatus: 'Approved',
        isLocked: true,
        lockedAt: new Date(),
      },
    });
    evaluations.push(ev);
  }
  console.log('✅ Behavioral evaluations created');

  // Loan accounts + schedules (NPL demo)
  const loanOwners = staffUsers;
  for (let i = 0; i < 8; i++) {
    const owner = loanOwners[i % loanOwners.length];
    const principal = 50000 + i * 15000;
    const outstanding = principal - i * 3000;
    const loan = await prisma.accountMapping.create({
      data: {
        accountNumber: `LN${200000 + i}`,
        customerName: `Loan Customer ${i + 1}`,
        accountType: 'Loan',
        balance: outstanding,
        current_balance: outstanding,
        june_balance: outstanding,
        active_status: true,
        isProductive: false,
        product: 'Loan',
        status: 'Active',
        mappedToId: owner.id,
        mappedById: branchManager.id,
        branchId: branch.id,
        loan_principal: principal,
        loan_disbursement_date: new Date('2026-01-15'),
        loan_maturity_date: new Date('2026-12-15'),
        payment_frequency: 'Monthly',
        interest_rate: 12,
        next_payment_date: new Date('2026-11-05'),
      },
    });

    const installment = Math.round(principal / 6);
    for (let m = 0; m < 6; m++) {
      const expectedDate = new Date(2026, 4 + m, 5);
      const overdue = expectedDate < new Date();
      const status = m < 3 ? 'Paid' : m === 3 ? 'Partial' : 'Pending';
      const paidAmount = m < 3 ? installment : m === 3 ? Math.round(installment / 2) : 0;
      const daysPastDue = status !== 'Paid' && overdue
        ? Math.max(0, Math.floor((Date.now() - expectedDate.getTime()) / 86400000))
        : 0;
      await prisma.loanSchedule.create({
        data: {
          accountId: loan.id,
          expectedDate,
          expectedAmount: installment,
          paidAmount,
          status,
          paidDate: status === 'Paid' || status === 'Partial' ? expectedDate : null,
          daysPastDue,
        },
      });
    }
  }
  try {
    await generateNplSnapshot(branch.id);
  } catch (error) {
    console.warn('⚠️  NPL snapshot skipped:', error.message);
  }
  console.log('✅ Loan accounts, schedules and NPL snapshot created');

  // Performance scores
  for (let i = 0; i < staffUsers.length; i++) {
    const owner = staffUsers[i];
    try {
      const result = await calculateKPIScore(owner.id, branch.code, PERIOD);
      const behavioralScore = evaluations[i].totalScore;
      const finalScore = Math.min(100, Math.round((result.kpiTotalScore + behavioralScore) * 100) / 100);
      await prisma.performanceScore.create({
        data: {
          userId: owner.id,
          branchId: branch.id,
          period: PERIOD,
          year: 2026,
          month: 10,
          kpiScores: result.kpiScores,
          kpiTotalScore: result.kpiTotalScore,
          behavioralScore,
          behavioralEvaluationId: evaluations[i].id,
          finalScore,
          rating: calculateRating(finalScore),
          status: 'Finalized',
          isLocked: true,
          lockedAt: new Date(),
        },
      });
    } catch (error) {
      console.warn(`⚠️  Could not calculate score for ${owner.email}: ${error.message}`);
    }
  }
  console.log('✅ Performance scores calculated');

  // CBS validation demo
  const cbs = await prisma.cBSValidation.create({
    data: {
      branchId: branch.id,
      validationDate: today,
      fileName: 'demo-cbs.xlsx',
      filePath: 'demo/demo-cbs.xlsx',
      uploadedById: branchManager.id,
      totalRecords: accounts.length,
      matchedRecords: accounts.length - 2,
      unmatchedRecords: 2,
      discrepancyCount: 2,
      status: 'Completed',
      validatedAt: today,
      validationRate: Math.round(((accounts.length - 2) / accounts.length) * 10000) / 100,
    },
  });
  await prisma.cBSDiscrepancy.createMany({
    data: [
      {
        validationId: cbs.id,
        accountNumber: accounts[0].accountNumber,
        cbsAmount: accounts[0].current_balance + 500,
        pmsAmount: accounts[0].current_balance,
        difference: 500,
        type: 'Amount_Mismatch',
      },
      {
        validationId: cbs.id,
        accountNumber: accounts[1].accountNumber,
        cbsAmount: null,
        pmsAmount: accounts[1].current_balance,
        difference: -accounts[1].current_balance,
        type: 'Missing_in_CBS',
      },
    ],
  });
  console.log('✅ CBS validation and discrepancies created');

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: supervisor.id,
        type: 'TASK_APPROVED',
        title: 'Pending task approvals',
        message: 'Two team tasks are waiting for your approval.',
        link: '/approvals',
      },
      {
        userId: branchManager.id,
        type: 'NPL_ALERT',
        title: 'NPL alert',
        message: 'Overdue installments were detected in Demo Branch.',
        link: '/npl/branch',
      },
      {
        userId: admin.id,
        type: 'CBS_VALIDATION',
        title: 'CBS validation completed',
        message: 'Demo Branch CBS validation finished with 2 discrepancies.',
        link: '/cbs-validation',
      },
    ],
  });
  console.log('✅ Notifications created');

  console.log('\n🎉 Demo data seed complete!\n');
  console.log(`Branch: ${branch.name} (${branch.code})`);
  console.log(`Accounts: ${accounts.length} savings + 8 loans`);
  console.log(`Tasks: ${taskCount}`);
  console.log(`Demo logins (password shown on login page):`);
  console.log('  admin@wisdomsaccos.com / admin123');
  console.log('  areamanager@wisdomsaccos.com / area123');
  console.log('  branchmanager@wisdomsaccos.com / branch123');
  console.log('  supervisor@wisdomsaccos.com / supervisor123');
  console.log('  staff@wisdomsaccos.com / staff123');
}

main()
  .catch((error) => {
    console.error('❌ Demo data seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
