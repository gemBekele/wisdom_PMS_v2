import prisma from '../config/database.js';
import { BALANCE_SOURCE_KEY, BALANCE_SOURCE_DEFAULT } from '../controllers/settingsController.js';

const TASK_TYPE_TO_CBS_PRODUCT = {
  'Loan_Saving_Deposit': 'LOAN SAVING RESERVE ACCOUNT',
  'Michu_Current_Saving': 'Michu Current Account',
  'Gihon_Regular_Saving': 'GIHON REGULAR SAVING',
  'Mothers_Saving': 'MOTHERS SAVING ACCOUNT',
  'Young_Womens_Saving': 'YOUNG WOMEN SAVING',
  'Elders_Saving': 'ELDERS SAVING ACCOUNT',
  'Children_Saving': 'CHILDREN SAVING ACCOUNT',
  'Fixed_Time_Deposit': 'FIXED TIME DEPOSIT',
  'Premium_Saving_Deposit': 'Premium Saving',
  'Special_Saving': 'SPECIAL SAVING ACCOUNT',
  'Segment_Deposit': 'Segment Account',
  'Wadiah_IFB_Deposit': 'WADIAH SAVING ACCOUNT',
};

const run = async () => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: BALANCE_SOURCE_KEY } });
  const balanceSource = setting?.value || BALANCE_SOURCE_DEFAULT;

  if (balanceSource !== 'approval') {
    console.log(`Balance source is '${balanceSource}'. Skipping backfill.`);
    return;
  }

  const tasks = await prisma.dailyTask.findMany({
    where: {
      approvalStatus: 'Approved',
      performanceImpacted: false,
      amount: { gt: 0 },
    },
  });

  console.log(`Found ${tasks.length} approved, non-impacted tasks to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const task of tasks) {
    const account = await prisma.accountMapping.findUnique({
      where: { accountNumber: task.accountNumber },
    });

    if (!account || account.accountType === 'Loan') {
      skipped++;
      continue;
    }

    const cbsProduct = TASK_TYPE_TO_CBS_PRODUCT[task.taskType];

    await prisma.$transaction([
      prisma.accountMapping.update({
        where: { id: account.id },
        data: {
          current_balance: (account.current_balance || 0) + task.amount,
          ...(cbsProduct && !account.product ? { product: cbsProduct } : {}),
        },
      }),
      prisma.dailyTask.update({
        where: { id: task.id },
        data: { performanceImpacted: true, performanceImpactedAt: new Date() },
      }),
    ]);

    updated++;
  }

  console.log(`Backfilled ${updated} tasks, skipped ${skipped}`);
};

run()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
