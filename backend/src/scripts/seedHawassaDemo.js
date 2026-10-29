import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

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
];

const BRANCH_CODE = 'HAWASSA_BOLE';

async function clearDemoData(branchId) {
  await prisma.evaluationApproval.deleteMany({ where: { evaluation: { branchId } } });
  await prisma.performanceScore.deleteMany({ where: { branchId } });
  await prisma.behavioralEvaluation.deleteMany({ where: { branchId } });
  await prisma.taskApproval.deleteMany({ where: { task: { branchId } } });
  await prisma.dailyTask.deleteMany({ where: { branchId } });
  await prisma.accountMapping.deleteMany({ where: { branchId } });
  await prisma.juneBalance.deleteMany({ where: { branch_code: BRANCH_CODE } });
  console.log('✅ Cleared existing demo data');
}

async function getHawassaUsers() {
  const branch = await prisma.branch.findFirst({ where: { code: BRANCH_CODE } });
  if (!branch) throw new Error(`Branch ${BRANCH_CODE} not found. Run seedAllData first.`);

  const bm = await prisma.user.findFirst({ where: { branchId: branch.id, role: 'branchManager' } });
  const allStaff = await prisma.user.findMany({ where: { branchId: branch.id, role: 'staff' }, orderBy: { name: 'asc' } });

  if (!bm || allStaff.length === 0) {
    throw new Error('Hawassa BM or staff not found. Run seedAllData first.');
  }

  console.log(`\n👥 Found: BM=${bm.name}, Staff=${allStaff.map(s => s.name).join(', ')}`);
  return { branch, bm, allStaff };
}

function randomBalance(juneBal) {
  const growth = Math.floor(Math.random() * 3500) + 200;
  return { current: juneBal + growth, growth };
}

async function seedJuneBalances() {
  const juneBaselines = HABESHA_CUSTOMERS.map((c, i) => ({
    account_id: `HAW${String(100001 + i).slice(-6)}`,
    june_balance: 1200 + i * 280 + Math.floor(Math.random() * 500),
    baseline_period: '2025',
    baseline_date: new Date('2025-06-30'),
    is_active: true,
    branch_code: BRANCH_CODE,
  }));

  for (const jb of juneBaselines) {
    await prisma.juneBalance.upsert({
      where: { account_id_baseline_period: { account_id: jb.account_id, baseline_period: jb.baseline_period } },
      create: { ...jb, accountNumber: jb.account_id },
      update: { june_balance: jb.june_balance, is_active: true },
    });
  }
  console.log(`✅ Created ${juneBaselines.length} June baseline balances`);
  return juneBaselines;
}

async function seedAccountMappings(branch, juneBaselines, allStaff) {
  let created = 0;
  for (let i = 0; i < HABESHA_CUSTOMERS.length; i++) {
    const c = HABESHA_CUSTOMERS[i];
    const accountNumber = `HAW${String(100001 + i).slice(-6)}`;
    const jb = juneBaselines.find(j => j.account_id === accountNumber);
    const juneBal = jb?.june_balance || 1500;
    const { current } = randomBalance(juneBal);
    const staff = allStaff[i % allStaff.length];

    await prisma.accountMapping.upsert({
      where: { accountNumber },
      create: {
        accountNumber,
        customerName: c.name,
        accountType: 'Savings',
        balance: current,
        current_balance: current,
        june_balance: juneBal,
        active_status: true,
        phoneNumber: c.phone,
        status: 'Active',
        mappedToId: staff.id,
        mappedById: staff.id,
        branchId: branch.id,
      },
      update: {
        customerName: c.name,
        current_balance: current,
        june_balance: juneBal,
        active_status: true,
        phoneNumber: c.phone,
        status: 'Active',
        mappedToId: staff.id,
      },
    });
    created++;
  }
  console.log(`✅ Created ${created} account mappings across ${allStaff.length} staff (${allStaff.map(s => `${s.name}: ${HABESHA_CUSTOMERS.length / allStaff.length}`).join(', ')})`);
}

async function seedDailyTasks(branch, users) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const taskTypes = ['Deposit_Mobilization', 'Digital_Activation', 'Member_Registration', 'New_Customer', 'Loan_Follow_up'];
  let totalTasks = 0;

  for (const staff of users.allStaff) {
    const mappings = await prisma.accountMapping.findMany({
      where: { mappedToId: staff.id, branchId: branch.id, status: 'Active' },
    });
    if (mappings.length === 0) continue;

    const numTasks = Math.min(4, mappings.length);
    for (let i = 0; i < numTasks; i++) {
      const mapping = mappings[i];
      const taskType = taskTypes[i % taskTypes.length];
      const amount = taskType === 'Deposit_Mobilization' || taskType === 'Loan_Follow_up'
        ? Math.floor(Math.random() * 5000) + 500
        : 0;

      const taskDate = new Date(today);
      taskDate.setHours(8 + i, Math.floor(Math.random() * 60), 0, 0);

      const existingTask = await prisma.dailyTask.findFirst({
        where: { accountNumber: mapping.accountNumber, taskDate: { gte: today, lt: todayEnd }, submittedById: staff.id },
      });
      if (existingTask) continue;

      const task = await prisma.dailyTask.create({
        data: {
          taskType, accountNumber: mapping.accountNumber, accountId: mapping.id, amount,
          remarks: `${taskType.replace(/_/g, ' ')} - ${mapping.customerName}`,
          submittedById: staff.id, branchId: branch.id,
          mappingStatus: 'Mapped_to_You', approvalStatus: 'Approved',
          cbsValidated: true, cbsValidatedAt: new Date(), taskDate,
        },
      });

      await prisma.taskApproval.create({
        data: { taskId: task.id, approverId: users.bm.id, role: 'branchManager', status: 'Approved', approvedAt: new Date() },
      });
      totalTasks++;
    }
  }
  console.log(`✅ Created ${totalTasks} daily tasks for today`);
  return totalTasks;
}

async function seedBehavioralEvaluations(branch, users) {
  const baseCompetencies = [
    { competencyName: 'Communication', score: 3, maxScore: 5 },
    { competencyName: 'Teamwork', score: 3, maxScore: 5 },
    { competencyName: 'Problem Solving', score: 2, maxScore: 5 },
    { competencyName: 'Adaptability', score: 3, maxScore: 5 },
    { competencyName: 'Leadership', score: 2, maxScore: 5 },
    { competencyName: 'Customer Focus', score: 4, maxScore: 5 },
    { competencyName: 'Initiative', score: 3, maxScore: 5 },
    { competencyName: 'Reliability', score: 3, maxScore: 5 },
  ];

  let count = 0;
  for (const staff of users.allStaff) {
    const existing = await prisma.behavioralEvaluation.findFirst({
      where: { evaluatedUserId: staff.id, branchId: branch.id, year: 2025 },
    });
    if (existing) continue;

    const variance = users.allStaff.indexOf(staff);
    const competencies = baseCompetencies.map(c => ({
      ...c,
      score: Math.max(1, Math.min(5, c.score + (variance > 0 ? 1 : 0))),
    }));
    const totalScore = competencies.reduce((s, c) => s + c.score, 0);

    const evaluation = await prisma.behavioralEvaluation.create({
      data: {
        evaluatedUserId: staff.id, evaluatedById: users.bm.id, branchId: branch.id,
        period: 'Quarterly', year: 2025, quarter: 2,
        competencies, totalScore,
        overallComments: 'Good performance this period.', approvalStatus: 'Approved',
      },
    });

    await prisma.evaluationApproval.create({
      data: {
        evaluationId: evaluation.id, approverId: users.bm.id, role: 'branchManager',
        status: 'Approved', approvedAt: new Date(), comments: 'Good performance this quarter.',
      },
    });
    count++;
  }
  console.log(`✅ Created ${count} behavioral evaluations`);
}

async function seedPerformanceScores(branch, users) {
  const demoFinalScores = [86, 78];
  const demoRatings = ['Very_Good', 'Good'];

  let count = 0;
  for (const staff of users.allStaff) {
    const idx = users.allStaff.indexOf(staff);
    const finalScore = demoFinalScores[idx];
    const rating = demoRatings[idx];

    const kpiScores = {
      Deposit_Mobilization: { target: 150000, actual: 112500, percent: 75, weight: 25, score: 18.75 },
      Digital_Channel_Growth: { target: 8, actual: 6, percent: 75, weight: 20, score: 15 },
      Member_Registration: { target: 5, actual: 4, percent: 80, weight: 10, score: 8 },
      Customer_Base: { target: 8, actual: 6, percent: 75, weight: 15, score: 11.25 },
    };

    const kpiTotalScore = Math.round(Object.values(kpiScores).reduce((sum, k) => sum + (k.score || 0), 0));
    const behavioralEval = await prisma.behavioralEvaluation.findFirst({
      where: { evaluatedUserId: staff.id, branchId: branch.id, approvalStatus: 'Approved' },
      orderBy: { createdAt: 'desc' },
    });

    const existingScore = await prisma.performanceScore.findFirst({
      where: { userId: staff.id, branchId: branch.id, period: 'Quarterly', year: 2025 },
    });

    const scoreData = {
      kpiScores, kpiTotalScore, behavioralScore: 14,
      behavioralEvaluationId: behavioralEval?.id, finalScore, rating,
      status: 'Calculated',
    };

    if (existingScore) {
      await prisma.performanceScore.update({ where: { id: existingScore.id }, data: scoreData });
    } else {
      await prisma.performanceScore.create({
        data: { userId: staff.id, branchId: branch.id, period: 'Quarterly', year: 2025, quarter: 2, month: 6, ...scoreData },
      });
    }
    count++;
  }
  console.log(`✅ Created ${count} performance scores`);
}

async function main() {
  console.log('🌱 Seeding Hawassa demo data...\n');
  const { branch, bm, allStaff } = await getHawassaUsers();
  await clearDemoData(branch.id);

  const juneBaselines = await seedJuneBalances();
  await seedAccountMappings(branch, juneBaselines, allStaff);
  await seedDailyTasks(branch, { bm, allStaff });
  await seedBehavioralEvaluations(branch, { bm, allStaff });
  await seedPerformanceScores(branch, { bm, allStaff });

  console.log(`\n============================================================`);
  console.log(`✅ HAWASSA DEMO DATA SEEDED SUCCESSFULLY!`);
  console.log(`============================================================`);
  console.log(`\n📋 Summary:`);
  console.log(`   Branch: ${branch.name}`);
  console.log(`   Branch Manager: ${bm.name}`);
  console.log(`   Staff: ${allStaff.map(s => s.name).join(', ')}`);
  console.log(`   Customers: ${HABESHA_CUSTOMERS.length} mapped accounts`);
  console.log(`\n🔑 Login: use <email> / 1234`);
  console.log(`   (emails are name@hawassa_bole.et)`);
}

main()
  .catch(e => { console.error('❌ Error seeding Hawassa demo data:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
