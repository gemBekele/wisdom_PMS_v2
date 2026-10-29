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
  console.log('🌱 Seeding daily operations data for the past 14 days...\n');

  const branches = await prisma.branch.findMany({ where: { isActive: true } });
  console.log(`Found ${branches.length} branches`);

  let totalTasks = 0;

  for (const branch of branches) {
    const staff = await prisma.user.findMany({
      where: { branchId: branch.id, isActive: true, role: { in: ['staff', 'supervisor'] } },
      select: { id: true, name: true },
    });

    const branchManager = await prisma.user.findFirst({
      where: { branchId: branch.id, role: 'branchManager' },
    });

    if (staff.length === 0 || !branchManager) {
      console.log(`  Skipping ${branch.name}: no staff or BM found`);
      continue;
    }

    console.log(`\n📌 ${branch.name} (${staff.length} staff)`);

    for (const s of staff) {
      const accounts = await prisma.accountMapping.findMany({
        where: { mappedToId: s.id, status: 'Active' },
        select: { id: true, accountNumber: true, customerName: true },
      });

      if (accounts.length === 0) continue;

      for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
        const taskDate = new Date();
        taskDate.setDate(taskDate.getDate() - dayOffset);
        taskDate.setHours(0, 0, 0, 0);

        const dateStr = formatDate(taskDate);
        const dayEnd = new Date(taskDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingCount = await prisma.dailyTask.count({
          where: { submittedById: s.id, taskDate: { gte: taskDate, lt: dayEnd } },
        });
        if (existingCount > 0) continue;

        const numTasks = randomInt(1, Math.min(4, accounts.length));
        const usedAccounts = new Set();

        for (let i = 0; i < numTasks; i++) {
          let acct;
          let attempts = 0;
          do {
            acct = accounts[randomInt(0, accounts.length - 1)];
            attempts++;
          } while (usedAccounts.has(acct.id) && attempts < 10);
          usedAccounts.add(acct.id);

          const taskType = TASK_TYPES[randomInt(0, TASK_TYPES.length - 1)];
          const amount = AMOUNT_TYPES.includes(taskType) ? randomInt(200, 8000) : 0;
          const approvalStatus = Math.random() < 0.7 ? 'Approved' : 'Pending';
          const taskTime = new Date(taskDate);
          taskTime.setHours(randomInt(8, 17), randomInt(0, 59), 0, 0);

          const task = await prisma.dailyTask.create({
            data: {
              taskType,
              accountNumber: acct.accountNumber,
              accountId: acct.id,
              amount,
              remarks: `${taskType.replace(/_/g, ' ')} - ${acct.customerName}`,
              submittedById: s.id,
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
    }
    console.log(`  ✅ Seeded tasks for ${staff.length} staff across 15 days`);
  }

  console.log(`\n============================================================`);
  console.log(`✅ SEEDED ${totalTasks} DAILY TASKS ACROSS ALL BRANCHES`);
  console.log(`============================================================`);
  console.log(`\n📅 Tasks span the past 14 days + today`);
  console.log(`🗓️  Use the date picker on Branch Monitoring / Operations pages to view`);
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
