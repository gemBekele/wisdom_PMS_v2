import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { normalizeRole } from '../utils/roleNormalizer.js';
import {
  calculateBatchDpd,
  calculateParMetrics,
  calculateStaffCollectionRate,
  generateNplSnapshot,
  autoGenerateLoanSchedules,
  getStaffCollectionAlerts,
} from '../utils/performanceCalculator.js';
import { notifyNplAlert } from '../utils/notificationService.js';

// @desc    Get staff-level collection alerts and collection rate
// @route   GET /api/npl/staff
export const getStaffNpl = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const alerts = await getStaffCollectionAlerts(userId);
  const collectionRate = await calculateStaffCollectionRate(userId);
  const loanAccounts = await prisma.accountMapping.findMany({
    where: { mappedToId: userId, accountType: 'Loan', status: 'Active' },
    select: { id: true },
  });

  let parMetrics = null;
  if (loanAccounts.length > 0) {
    parMetrics = await calculateParMetrics(loanAccounts.map(a => a.id));
  }

  res.status(200).json({
    success: true,
    data: {
      alerts,
      collectionRate,
      parMetrics,
      alertCount: alerts.filter(a => a.severity === 'high').length,
      totalAlerts: alerts.length,
    },
  });
});

// @desc    Get branch-level NPL dashboard
// @route   GET /api/npl/branch
export const getBranchNpl = asyncHandler(async (req, res) => {
  let branchId = req.user.branchId || req.query.branchId;
  const branchCode = req.query.branch_code || req.user.branch_code;

  if (!branchId && branchCode) {
    const branch = await prisma.branch.findUnique({
      where: { code: branchCode.toUpperCase().trim() },
      select: { id: true }
    });
    if (branch) branchId = branch.id;
  }

  if (!branchId) {
    return res.status(400).json({
      success: false,
      message: 'Branch NPL requires a branch assignment or branch_code parameter'
    });
  }

  const loanAccounts = await prisma.accountMapping.findMany({
    where: { branchId, accountType: 'Loan', status: 'Active' },
    select: { id: true, mappedToId: true, customerName: true, accountNumber: true, current_balance: true },
  });

  const accountIds = loanAccounts.map(a => a.id);
  const parMetrics = await calculateParMetrics(accountIds);
  const dpdDetails = await calculateBatchDpd(accountIds);

  // Group by staff
  const byStaff = {};
  for (const acct of loanAccounts) {
    if (!byStaff[acct.mappedToId]) {
      byStaff[acct.mappedToId] = { accounts: [], totalBalance: 0 };
    }
    byStaff[acct.mappedToId].accounts.push(acct);
    byStaff[acct.mappedToId].totalBalance += acct.current_balance || 0;
  }

  // Attach DPD info to accounts
  const dpdMap = {};
  for (const d of dpdDetails) {
    dpdMap[d.accountId] = d;
  }

  const staffBreakdown = [];
  for (const [staffId, data] of Object.entries(byStaff)) {
    const staffUser = await prisma.user.findUnique({
      where: { id: staffId },
      select: { name: true, employeeId: true, position: true },
    });
    let staffPar = { totalPortfolio: 0, par1Count: 0, par90Amount: 0 };
    for (const acct of data.accounts) {
      const dpd = dpdMap[acct.id]?.dpd || 0;
      staffPar.totalPortfolio += acct.current_balance || 0;
      if (dpd >= 90) staffPar.par90Amount += acct.current_balance || 0;
      if (dpd >= 1) staffPar.par1Count++;
    }
    staffBreakdown.push({
      staffId,
      staffName: staffUser?.name || 'Unknown',
      employeeId: staffUser?.employeeId,
      position: staffUser?.position,
      accountCount: data.accounts.length,
      totalBalance: data.totalBalance,
      par1Count: staffPar.par1Count,
      overdueAccounts: data.accounts.filter(a => (dpdMap[a.id]?.dpd || 0) >= 1).length,
    });
  }

  // Aging ladder
  const agingLadder = [
    { label: 'Current (0 DPD)', min: 0, max: 0, amount: 0, count: 0 },
    { label: '1-29 days', min: 1, max: 29, amount: 0, count: 0 },
    { label: '30-59 days', min: 30, max: 59, amount: 0, count: 0 },
    { label: '60-89 days', min: 60, max: 89, amount: 0, count: 0 },
    { label: '90+ days', min: 90, max: 9999, amount: 0, count: 0 },
  ];

  for (const d of dpdDetails) {
    for (const bucket of agingLadder) {
      if (d.dpd >= bucket.min && d.dpd <= bucket.max) {
        bucket.amount += d.currentBalance || 0;
        bucket.count++;
        break;
      }
    }
  }

  // Also generate today's snapshot
  let snapshot = null;
  try {
    snapshot = await generateNplSnapshot(branchId);
  } catch (e) {
    // Snapshot is optional
  }

  // Get 30-day trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const snapshots = await prisma.nplSnapshot.findMany({
    where: {
      branchId,
      snapshotDate: { gte: thirtyDaysAgo },
    },
    orderBy: { snapshotDate: 'asc' },
  });

  const trendMap = new Map();
  for (const snap of snapshots) {
    const key = new Date(snap.snapshotDate).toISOString().split('T')[0];
    if (!trendMap.has(key)) {
      trendMap.set(key, { date: key, totalPortfolio: 0, par90Amount: 0 });
    }
    const entry = trendMap.get(key);
    entry.totalPortfolio += snap.totalPortfolio;
    entry.par90Amount += snap.par90Amount;
  }

  const trendData = Array.from(trendMap.values()).map(d => ({
    date: d.date,
    par90Ratio: d.totalPortfolio > 0 ? Math.round((d.par90Amount / d.totalPortfolio) * 100 * 100) / 100 : 0,
  }));

  res.status(200).json({
    success: true,
    data: {
      parMetrics,
      agingLadder,
      staffBreakdown,
      snapshot,
      trendData,
      totalLoanAccounts: loanAccounts.length,
      dpdDetails: dpdDetails.filter(d => d.dpd > 0),
    },
  });
});

// @desc    Get area-level NPL dashboard (all branches in area)
// @route   GET /api/npl/area
export const getAreaNpl = asyncHandler(async (req, res) => {
  const areaId = req.user.areaId;
  if (!areaId) {
    return res.status(200).json({
      success: true,
      data: { branches: [], areaSummary: { totalBranches: 0, totalPortfolio: 0, par90Amount: 0, par90Ratio: 0 }, trendData: [] }
    });
  }
  const branches = await prisma.branch.findMany({
    where: { areaId, isActive: true },
    select: { id: true, name: true, code: true },
  });

  const branchResults = [];
  let areaTotalPortfolio = 0;
  let areaPar90Amount = 0;

  for (const branch of branches) {
    const loanAccounts = await prisma.accountMapping.findMany({
      where: { branchId: branch.id, accountType: 'Loan', status: 'Active' },
      select: { id: true, current_balance: true },
    });

    const parMetrics = await calculateParMetrics(loanAccounts.map(a => a.id));
    areaTotalPortfolio += parMetrics.totalPortfolio;
    areaPar90Amount += parMetrics.par90Amount;

    branchResults.push({
      branchId: branch.id,
      branchName: branch.name,
      totalLoans: parMetrics.totalLoans,
      totalPortfolio: parMetrics.totalPortfolio,
      par1Ratio: Math.round(parMetrics.par1Ratio * 100) / 100,
      par30Ratio: Math.round(parMetrics.par30Ratio * 100) / 100,
      par90Ratio: Math.round(parMetrics.par90Ratio * 100) / 100,
      par1Count: parMetrics.par1Count,
      par90Count: parMetrics.par90Count,
    });
  }

  // Get 30-day trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const snapshots = await prisma.nplSnapshot.findMany({
    where: {
      branchId: { in: branches.map(b => b.id) },
      snapshotDate: { gte: thirtyDaysAgo },
    },
    orderBy: { snapshotDate: 'asc' },
  });

  // Aggregate snapshots by day
  const trendMap = new Map();
  for (const snap of snapshots) {
    const key = new Date(snap.snapshotDate).toISOString().split('T')[0];
    if (!trendMap.has(key)) {
      trendMap.set(key, { date: key, totalPortfolio: 0, par90Amount: 0 });
    }
    const entry = trendMap.get(key);
    entry.totalPortfolio += snap.totalPortfolio;
    entry.par90Amount += snap.par90Amount;
  }

  const trendData = Array.from(trendMap.values()).map(d => ({
    date: d.date,
    par90Ratio: d.totalPortfolio > 0 ? Math.round((d.par90Amount / d.totalPortfolio) * 100 * 100) / 100 : 0,
  }));

  res.status(200).json({
    success: true,
    data: {
      branches: branchResults,
      areaSummary: {
        totalBranches: branches.length,
        totalPortfolio: areaTotalPortfolio,
        par90Amount: areaPar90Amount,
        par90Ratio: areaTotalPortfolio > 0 ? Math.round((areaPar90Amount / areaTotalPortfolio) * 100 * 100) / 100 : 0,
      },
      trendData,
    },
  });
});

// @desc    Get HQ-level NPL dashboard
// @route   GET /api/npl/hq
export const getHqNpl = asyncHandler(async (req, res) => {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, areaId: true },
  });

  const areas = await prisma.area.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const areaMap = {};
  for (const a of areas) areaMap[a.id] = a.name;

  const branchResults = [];
  let companyTotalPortfolio = 0;
  let companyPar1Amount = 0;
  let companyPar30Amount = 0;
  let companyPar90Amount = 0;
  let companyTotalLoans = 0;

  for (const branch of branches) {
    const loanAccounts = await prisma.accountMapping.findMany({
      where: { branchId: branch.id, accountType: 'Loan', status: 'Active' },
      select: { id: true, current_balance: true },
    });

    const parMetrics = await calculateParMetrics(loanAccounts.map(a => a.id));
    companyTotalPortfolio += parMetrics.totalPortfolio;
    companyPar1Amount += parMetrics.par1Amount;
    companyPar30Amount += parMetrics.par30Amount;
    companyPar90Amount += parMetrics.par90Amount;
    companyTotalLoans += parMetrics.totalLoans;

    branchResults.push({
      branchId: branch.id,
      branchName: branch.name,
      area: areaMap[branch.areaId] || 'N/A',
      totalLoans: parMetrics.totalLoans,
      totalPortfolio: parMetrics.totalPortfolio,
      par1Ratio: Math.round(parMetrics.par1Ratio * 100) / 100,
      par30Ratio: Math.round(parMetrics.par30Ratio * 100) / 100,
      par90Ratio: Math.round(parMetrics.par90Ratio * 100) / 100,
      par1Count: parMetrics.par1Count,
      par30Count: parMetrics.par30Count,
      par90Count: parMetrics.par90Count,
    });
  }

  // Per-area summary
  const areaSummary = {};
  for (const br of branchResults) {
    if (!areaSummary[br.area]) {
      areaSummary[br.area] = { totalPortfolio: 0, par90Amount: 0, par90Count: 0, totalLoans: 0, branches: 0 };
    }
    areaSummary[br.area].totalPortfolio += br.totalPortfolio;
    areaSummary[br.area].par90Amount += (br.par90Ratio / 100) * br.totalPortfolio;
    areaSummary[br.area].par90Count += br.par90Count || 0;
    areaSummary[br.area].totalLoans += br.totalLoans;
    areaSummary[br.area].branches++;
  }

  // 90-day trend
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
  ninetyDaysAgo.setHours(0, 0, 0, 0);

  const snapshots = await prisma.nplSnapshot.findMany({
    where: {
      branchId: { in: branches.map(b => b.id) },
      snapshotDate: { gte: ninetyDaysAgo },
    },
    orderBy: { snapshotDate: 'asc' },
  });

  const trendMap = new Map();
  for (const snap of snapshots) {
    const key = new Date(snap.snapshotDate).toISOString().split('T')[0];
    if (!trendMap.has(key)) {
      trendMap.set(key, { date: key, totalPortfolio: 0, par1Amount: 0, par30Amount: 0, par90Amount: 0 });
    }
    const entry = trendMap.get(key);
    entry.totalPortfolio += snap.totalPortfolio;
    entry.par1Amount += snap.par1Amount;
    entry.par30Amount += snap.par30Amount;
    entry.par90Amount += snap.par90Amount;
  }

  const trendData = Array.from(trendMap.values()).map(d => ({
    date: d.date,
    par1Ratio: d.totalPortfolio > 0 ? Math.round((d.par1Amount / d.totalPortfolio) * 100 * 100) / 100 : 0,
    par30Ratio: d.totalPortfolio > 0 ? Math.round((d.par30Amount / d.totalPortfolio) * 100 * 100) / 100 : 0,
    par90Ratio: d.totalPortfolio > 0 ? Math.round((d.par90Amount / d.totalPortfolio) * 100 * 100) / 100 : 0,
  }));

  // Sort branches by PAR 90 (worst first)
  branchResults.sort((a, b) => b.par90Ratio - a.par90Ratio);

  res.status(200).json({
    success: true,
    data: {
      companySummary: {
        totalPortfolio: companyTotalPortfolio,
        par1Ratio: companyTotalPortfolio > 0 ? Math.round((companyPar1Amount / companyTotalPortfolio) * 100 * 100) / 100 : 0,
        par30Ratio: companyTotalPortfolio > 0 ? Math.round((companyPar30Amount / companyTotalPortfolio) * 100 * 100) / 100 : 0,
        par90Ratio: companyTotalPortfolio > 0 ? Math.round((companyPar90Amount / companyTotalPortfolio) * 100 * 100) / 100 : 0,
        totalLoans: companyTotalLoans,
        par90Count: branchResults.reduce((s, b) => s + (b.par90Count || 0), 0),
        totalBranches: branches.length,
      },
      areaSummary: Object.entries(areaSummary).map(([name, data]) => ({
        area: name,
        ...data,
        par90Ratio: data.totalPortfolio > 0 ? Math.round((data.par90Amount / data.totalPortfolio) * 100 * 100) / 100 : 0,
      })),
      branches: branchResults,
      trendData,
    },
  });
});

// @desc    Get loan schedule for a specific loan account
// @route   GET /api/npl/schedules/:accountId
export const getLoanSchedule = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await prisma.accountMapping.findUnique({
    where: { id: accountId },
    select: {
      accountNumber: true, customerName: true, accountType: true,
      loan_principal: true, payment_frequency: true, loan_disbursement_date: true,
      loan_maturity_date: true, interest_rate: true, current_balance: true,
    },
  });

  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  const schedules = await prisma.loanSchedule.findMany({
    where: { accountId },
    orderBy: { expectedDate: 'asc' },
  });

  res.status(200).json({
    success: true,
    data: {
      account,
      schedules,
      totalExpected: schedules.reduce((s, i) => s + i.expectedAmount, 0),
      totalPaid: schedules.reduce((s, i) => s + i.paidAmount, 0),
      pendingCount: schedules.filter(i => i.status === 'Pending').length,
      missedCount: schedules.filter(i => i.status === 'Missed').length,
    },
  });
});

// @desc    Auto-generate loan schedules
// @route   POST /api/npl/schedules/:accountId/generate
export const generateLoanSchedules = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const result = await autoGenerateLoanSchedules(accountId);
  res.status(200).json({ success: true, data: result });
});

// @desc    Mark an installment as paid
// @route   PUT /api/npl/schedules/:id/pay
export const markInstallmentPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paidAmount, paidDate } = req.body;

  const schedule = await prisma.loanSchedule.findUnique({ where: { id } });
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Installment not found' });
  }

  const amount = paidAmount || schedule.expectedAmount;
  const newStatus = amount >= schedule.expectedAmount ? 'Paid' : 'Partial';

  const updated = await prisma.loanSchedule.update({
    where: { id },
    data: {
      paidAmount: amount,
      status: newStatus,
      paidDate: paidDate ? new Date(paidDate) : new Date(),
      daysPastDue: 0,
    },
  });

  res.status(200).json({ success: true, data: updated });
});

// @desc    Trigger NPL snapshot for a branch
// @route   POST /api/npl/snapshot
export const triggerNplSnapshot = asyncHandler(async (req, res) => {
  const branchId = req.body.branchId || req.user.branchId;

  if (!branchId) {
    return res.status(400).json({ success: false, message: 'branchId is required' });
  }

  const snapshot = await generateNplSnapshot(branchId);

  let overdueAccounts = [];
  try {
    overdueAccounts = await prisma.accountMapping.findMany({
      where: {
        branchId,
        accountType: 'Loan',
        loanSchedules: {
          some: { status: { in: ['Pending', 'Partial', 'Missed'] }, daysPastDue: { gt: 0 } },
        },
      },
      select: {
        id: true,
        accountNumber: true,
        customerName: true,
        mappedToId: true,
        mappedTo: { select: { supervisorId: true } },
      },
    });
  } catch (e) {} // non-critical

  for (const acc of overdueAccounts) {
    const worstDpd = await prisma.loanSchedule.findFirst({
      where: { accountId: acc.id, status: { in: ['Pending', 'Partial', 'Missed'] }, daysPastDue: { gt: 0 } },
      orderBy: { daysPastDue: 'desc' },
      select: { daysPastDue: true },
    });

    if (worstDpd && acc.mappedToId) {
      notifyNplAlert({
        accountNumber: acc.accountNumber,
        customerName: acc.customerName,
        dpd: worstDpd.daysPastDue,
        staffId: acc.mappedToId,
        supervisorId: acc.mappedTo?.supervisorId,
      }).catch(() => {});
    }
  }

  res.status(200).json({ success: true, data: snapshot });
});

// @desc    Get overdue alerts for supervisor's team
// @route   GET /api/npl/team-alerts
export const getTeamCollectionAlerts = asyncHandler(async (req, res) => {
  const supervisorId = req.user.id;

  const supervisees = await prisma.user.findMany({
    where: { supervisorId, isActive: true },
    select: { id: true, name: true },
  });

  const teamAlerts = [];
  for (const member of supervisees) {
    const alerts = await getStaffCollectionAlerts(member.id);
    if (alerts.length > 0) {
      teamAlerts.push({
        staffId: member.id,
        staffName: member.name,
        alerts,
        highPriorityCount: alerts.filter(a => a.severity === 'high').length,
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      teamAlerts,
      totalHighPriority: teamAlerts.reduce((s, m) => s + m.highPriorityCount, 0),
      totalAlerts: teamAlerts.reduce((s, m) => s + m.alerts.length, 0),
    },
  });
});
