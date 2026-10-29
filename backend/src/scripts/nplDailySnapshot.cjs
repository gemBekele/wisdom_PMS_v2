const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function calculateParMetrics(accountIds) {
  if (accountIds.length === 0) {
    return { totalPortfolio: 0, par1Amount: 0, par30Amount: 0, par90Amount: 0, par1Ratio: 0, par30Ratio: 0, par90Ratio: 0, totalLoans: 0, par1Count: 0, par30Count: 0, par90Count: 0 };
  }

  const now = new Date();
  const schedules = await prisma.loanSchedule.findMany({
    where: { accountId: { in: accountIds }, status: { in: ['Pending', 'Missed', 'Partial'] } },
    select: { accountId: true, expectedDate: true, expectedAmount: true, paidAmount: true },
  });

  const accountDpd = {};
  for (const s of schedules) {
    const dpd = Math.max(0, Math.floor((now - new Date(s.expectedDate)) / (1000 * 60 * 60 * 24)));
    if (!accountDpd[s.accountId]) accountDpd[s.accountId] = 0;
    accountDpd[s.accountId] = Math.max(accountDpd[s.accountId], dpd);
  }

  const accounts = await prisma.accountMapping.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, current_balance: true, loan_principal: true },
  });

  let totalPortfolio = 0, par1Amount = 0, par30Amount = 0, par90Amount = 0;
  let par1Count = 0, par30Count = 0, par90Count = 0;

  for (const acct of accounts) {
    const balance = acct.current_balance || acct.loan_principal || 0;
    totalPortfolio += balance;
    const dpd = accountDpd[acct.id] || 0;
    if (dpd >= 90) { par90Amount += balance; par90Count++; par30Count++; par1Count++; }
    else if (dpd >= 30) { par30Amount += balance; par30Count++; par1Count++; }
    else if (dpd >= 1) { par1Amount += balance; par1Count++; }
  }

  return {
    totalPortfolio,
    par1Amount: par1Amount + par30Amount + par90Amount,
    par30Amount: par30Amount + par90Amount,
    par90Amount,
    par1Ratio: totalPortfolio > 0 ? ((par1Amount + par30Amount + par90Amount) / totalPortfolio) * 100 : 0,
    par30Ratio: totalPortfolio > 0 ? ((par30Amount + par90Amount) / totalPortfolio) * 100 : 0,
    par90Ratio: totalPortfolio > 0 ? (par90Amount / totalPortfolio) * 100 : 0,
    totalLoans: accounts.length,
    par1Count, par30Count, par90Count,
  };
}

async function generateNplSnapshot(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const loanAccounts = await prisma.accountMapping.findMany({
    where: { branchId, accountType: 'Loan', status: 'Active' },
    select: { id: true },
  });

  const accountIds = loanAccounts.map(a => a.id);
  const parMetrics = await calculateParMetrics(accountIds);

  const existing = await prisma.nplSnapshot.findFirst({
    where: { branchId, snapshotDate: { gte: today, lt: tomorrow } },
  });

  const data = {
    branchId,
    snapshotDate: today,
    totalPortfolio: parMetrics.totalPortfolio,
    par1Amount: parMetrics.par1Amount,
    par30Amount: parMetrics.par30Amount,
    par90Amount: parMetrics.par90Amount,
    par1Ratio: Math.round(parMetrics.par1Ratio * 100) / 100,
    par30Ratio: Math.round(parMetrics.par30Ratio * 100) / 100,
    par90Ratio: Math.round(parMetrics.par90Ratio * 100) / 100,
    totalLoans: parMetrics.totalLoans,
    par1Count: parMetrics.par1Count,
    par30Count: parMetrics.par30Count,
    par90Count: parMetrics.par90Count,
  };

  if (existing) {
    await prisma.nplSnapshot.update({ where: { id: existing.id }, data });
  } else {
    await prisma.nplSnapshot.create({ data });
  }

  return data;
}

async function runDailySnapshot() {
  console.log(`[NPL Snapshot] Starting daily snapshot at ${new Date().toISOString()}`);

  const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  console.log(`[NPL Snapshot] Found ${branches.length} active branches`);

  const errors = [];
  for (const branch of branches) {
    try {
      const snap = await generateNplSnapshot(branch.id);
      console.log(`[NPL Snapshot] ${branch.name}: PAR90=${snap.par90Ratio.toFixed(2)}%, Loans=${snap.totalLoans}, Portfolio=${snap.totalPortfolio}`);
    } catch (err) {
      errors.push({ branch: branch.name, error: err.message });
      console.error(`[NPL Snapshot] ERROR ${branch.name}:`, err.message);
    }
  }

  console.log(`[NPL Snapshot] Complete. ${branches.length - errors.length}/${branches.length} branches succeeded.`);
  if (errors.length > 0) {
    console.error(`[NPL Snapshot] Errors:`, errors.map(e => `${e.branch}: ${e.error}`).join('; '));
  }

  await prisma.$disconnect();
  process.exit(errors.length > 0 ? 1 : 0);
}

runDailySnapshot();
