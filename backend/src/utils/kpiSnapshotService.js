import prisma from '../config/database.js';

const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;

// Ethiopia is UTC+3 year-round. Store each snapshot under the UTC midnight of
// the Addis Ababa calendar date so the dashboard's YYYY-MM-DD filters match.
const startOfAddisDay = (value = new Date()) => {
  const local = new Date(new Date(value).getTime() + ADDIS_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

/**
 * Capture the end-of-day KPI standing for one branch or all active branches.
 * Deposit balances are stored per KPI group; new-account counts come from
 * AccountMapping.openedAt (the CBS account-opening date).
 */
export const captureDailyKpiSnapshots = async (date = new Date(), branchId = null, source = 'CRON') => {
  const snapshotDate = startOfAddisDay(date);
  const nextDate = addDays(snapshotDate, 1);

  const branches = branchId
    ? await prisma.branch.findMany({ where: { id: branchId, isActive: true }, select: { id: true } })
    : await prisma.branch.findMany({ where: { isActive: true }, select: { id: true } });

  let captured = 0;

  for (const branch of branches) {
    const depositAccounts = await prisma.accountMapping.findMany({
      where: {
        branchId: branch.id,
        status: 'Active',
        accountType: { not: 'Loan' },
      },
      select: {
        current_balance: true,
        june_balance: true,
        openedAt: true,
      },
    });

    const currentValue = sum(depositAccounts, 'current_balance');
    const juneBaseline = sum(depositAccounts, 'june_balance');
    const activeAccounts = depositAccounts.filter(a => (Number(a.current_balance) || 0) >= 1000).length;
    const newDepositAccounts = depositAccounts.filter(
      a => a.openedAt && a.openedAt >= snapshotDate && a.openedAt < nextDate
    ).length;

    await prisma.dailyKpiSnapshot.upsert({
      where: {
        branchId_kpiCategory_snapshotDate: {
          branchId: branch.id,
          kpiCategory: 'Deposit_Mobilization',
          snapshotDate,
        },
      },
      update: {
        currentValue,
        juneBaseline,
        growth: currentValue - juneBaseline,
        activeAccounts,
        newAccounts: newDepositAccounts,
        source,
      },
      create: {
        branchId: branch.id,
        kpiCategory: 'Deposit_Mobilization',
        snapshotDate,
        currentValue,
        juneBaseline,
        growth: currentValue - juneBaseline,
        activeAccounts,
        newAccounts: newDepositAccounts,
        source,
      },
    });
    captured++;

    const newAccounts = await prisma.accountMapping.count({
      where: {
        branchId: branch.id,
        openedAt: { gte: snapshotDate, lt: nextDate },
      },
    });

    await prisma.dailyKpiSnapshot.upsert({
      where: {
        branchId_kpiCategory_snapshotDate: {
          branchId: branch.id,
          kpiCategory: 'New_Account_Opening',
          snapshotDate,
        },
      },
      update: {
        currentValue: newAccounts,
        newAccounts,
        source,
      },
      create: {
        branchId: branch.id,
        kpiCategory: 'New_Account_Opening',
        snapshotDate,
        currentValue: newAccounts,
        newAccounts,
        source,
      },
    });
    captured++;
  }

  return { snapshotDate, branches: branches.length, captured };
};
