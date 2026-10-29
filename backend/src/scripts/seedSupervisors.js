import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TASK_TYPES = [
  'Loan_Saving_Deposit', 'Michu_Current_Saving', 'Gihon_Regular_Saving',
  'Mothers_Saving', 'Young_Womens_Saving', 'Elders_Saving',
  'Children_Saving', 'Fixed_Time_Deposit', 'Premium_Saving_Deposit',
  'Special_Saving',
];

const AMOUNT_TYPES = ['Loan_Saving_Deposit', 'Premium_Saving_Deposit', 'Fixed_Time_Deposit'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  console.log('🌱 Seeding supervisor daily data...\n');

  const branch = await prisma.branch.findFirst({ where: { code: 'WOLAYTA_SODO' } });
  if (!branch) { console.log('Branch not found'); return; }

  const branchManager = await prisma.user.findFirst({ where: { branchId: branch.id, role: 'branchManager' } });

  const supervisors = await prisma.user.findMany({
    where: { branchId: branch.id, isActive: true, role: 'supervisor' },
    select: { id: true, name: true, position: true },
  });

  console.log(`Found ${supervisors.length} supervisors`);

  let totalTasks = 0;

  for (const sup of supervisors) {
    // Copy some accounts from their supervisees to this supervisor
    const supervisees = await prisma.user.findMany({
      where: { supervisorId: sup.id, isActive: true },
      select: { id: true },
    });
    const superviseeIds = supervisees.map(s => s.id);

    const existingSupAccounts = await prisma.accountMapping.count({ where: { mappedToId: sup.id, status: 'Active' } });
    if (existingSupAccounts === 0) {
      const prefix = sup.position?.includes('Operation') ? 'OPS' : 'CR';
      const customers = [
        { name: 'Abebech Alemu', product: 'Savings' },
        { name: 'Biruk Desta', product: 'Current' },
        { name: 'Chaltu Girma', product: 'Savings' },
        { name: 'Dawit Eshetu', product: 'Fixed Deposit' },
        { name: 'Eyerusalem Fikre', product: 'Loan' },
      ];
      for (let i = 0; i < customers.length; i++) {
        const accNum = `GH${prefix}${String(i + 1).padStart(3, '0')}`;
        const exists = await prisma.accountMapping.findUnique({ where: { accountNumber: accNum } });
        if (!exists) {
          await prisma.accountMapping.create({
            data: {
              accountNumber: accNum,
              customerName: customers[i].name,
              product: customers[i].product,
              accountType: customers[i].product === 'Loan' ? 'Loan' :
                          customers[i].product === 'Fixed Deposit' ? 'Fixed_Deposit' :
                          customers[i].product === 'Current' ? 'Current' : 'Savings',
              mappedToId: sup.id,
              branchId: branch.id,
              mappedById: sup.id,
              status: 'Active',
              balance: 0,
              june_balance: 0,
              current_balance: 0,
            },
          });
        }
      }
    }

    // Get or create accounts for the supervisor
    const supAccounts = await prisma.accountMapping.findMany({
      where: { mappedToId: sup.id, status: 'Active' },
      select: { id: true, accountNumber: true, customerName: true },
    });

    if (supAccounts.length === 0) {
      console.log(`  ${sup.name}: no accounts mapped, skipping tasks`);
      continue;
    }

    console.log(`  ${sup.name}: ${supAccounts.length} accounts`);

    // Create tasks for past 15 days
    for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
      const taskDate = new Date();
      taskDate.setDate(taskDate.getDate() - dayOffset);
      taskDate.setHours(0, 0, 0, 0);
      const dayEnd = new Date(taskDate);
      dayEnd.setHours(23, 59, 59, 999);

      const existingCount = await prisma.dailyTask.count({
        where: { submittedById: sup.id, taskDate: { gte: taskDate, lt: dayEnd } },
      });
      if (existingCount > 0) continue;

      const numTasks = randomInt(1, Math.min(3, supAccounts.length));
      const usedAccounts = new Set();

      for (let i = 0; i < numTasks; i++) {
        let acct;
        let attempts = 0;
        do {
          acct = supAccounts[randomInt(0, supAccounts.length - 1)];
          attempts++;
        } while (usedAccounts.has(acct.id) && attempts < 10);
        usedAccounts.add(acct.id);

        const taskType = TASK_TYPES[randomInt(0, TASK_TYPES.length - 1)];
        const amount = AMOUNT_TYPES.includes(taskType) ? randomInt(500, 15000) : 0;
        const approvalStatus = Math.random() < 0.8 ? 'Approved' : 'Pending';
        const taskTime = new Date(taskDate);
        taskTime.setHours(randomInt(8, 17), randomInt(0, 59), 0, 0);

        const task = await prisma.dailyTask.create({
          data: {
            taskType,
            accountNumber: acct.accountNumber,
            accountId: acct.id,
            amount,
            remarks: `${taskType.replace(/_/g, ' ')} - ${acct.customerName}`,
            submittedById: sup.id,
            branchId: branch.id,
            mappingStatus: 'Mapped_to_You',
            approvalStatus,
            cbsValidated: approvalStatus === 'Approved',
            cbsValidatedAt: approvalStatus === 'Approved' ? taskTime : null,
            taskDate: taskTime,
          },
        });

        if (approvalStatus === 'Approved' && branchManager) {
          await prisma.taskApproval.create({
            data: {
              taskId: task.id,
              approverId: branchManager.id,
              role: 'branchManager',
              status: 'Approved',
              approvedAt: taskTime,
            },
          });
        }

        totalTasks++;
      }
    }
    console.log(`  ✅ Seeded tasks for ${sup.name}`);
  }

  console.log(`\n✅ SEEDED ${totalTasks} SUPERVISOR TASKS`);
  console.log(`📅 Past 14 days + today`);
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
