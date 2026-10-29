import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// @desc    Get unmapped accounts (mappedToId is null)
// @route   GET /api/mapped-accounts/unmapped
// @access  Private (Admin, Area Manager, Branch Manager)
export const getUnmappedAccounts = asyncHandler(async (req, res) => {
  const branchCode = req.query.branch_code;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;

  const where = { mappedToId: null };
  if (branchCode) {
    where.branch = { code: branchCode.toUpperCase().trim() };
  }

  const [accounts, total] = await Promise.all([
    prisma.accountMapping.findMany({
      where,
      include: { branch: { select: { name: true, code: true } } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.accountMapping.count({ where }),
  ]);

  const data = accounts.map(a => ({
    id: a.id,
    accountNumber: a.accountNumber,
    customerName: a.customerName,
    phoneNumber: a.phoneNumber,
    accountType: a.accountType,
    currentBalance: a.current_balance,
    juneBalance: a.june_balance,
    difference: (a.current_balance || 0) - (a.june_balance || 0),
    activeStatus: a.active_status,
    isProductive: a.isProductive,
    product: a.product,
    branch: a.branch,
    createdAt: a.createdAt,
  }));

  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

const TASK_TO_KPI = {
  // Deposit product TaskTypes → Deposit_Mobilization KPI
  Loan_Saving_Deposit: 'Deposit_Mobilization',
  Michu_Current_Saving: 'Deposit_Mobilization',
  Gihon_Regular_Saving: 'Deposit_Mobilization',
  Mothers_Saving: 'Deposit_Mobilization',
  Young_Womens_Saving: 'Deposit_Mobilization',
  Elders_Saving: 'Deposit_Mobilization',
  Children_Saving: 'Deposit_Mobilization',
  Fixed_Time_Deposit: 'Deposit_Mobilization',
  Premium_Saving_Deposit: 'Deposit_Mobilization',
  Special_Saving: 'Deposit_Mobilization',
  Segment_Deposit: 'Deposit_Mobilization',
  Wadiah_IFB_Deposit: 'Deposit_Mobilization',
};

const KPI_LABELS = {
  Deposit_Mobilization: 'Deposit Mobilization',
  Collection_Rate: 'Collection Rate',
  Portfolio_Quality: 'Portfolio Quality',
};

const KPI_ORDER = ['Deposit_Mobilization', 'Collection_Rate', 'Portfolio_Quality'];

// @desc    Get mapped accounts dashboard for a user
// @route   GET /api/mapped-accounts/dashboard
// @access  Private
export const getMappedAccountsDashboard = asyncHandler(async (req, res) => {
  const userId = req.query.userId || req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branch: { select: { name: true, id: true } } },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // 1. Fetch mapped accounts
  const accounts = await prisma.accountMapping.findMany({
    where: { mappedToId: userId, status: { not: 'Inactive' } },
    orderBy: { updatedAt: 'desc' },
  });

  const mappedAccounts = accounts.map(a => ({
    id: a.id,
    accountNumber: a.accountNumber,
    customerName: a.customerName,
    phoneNumber: a.phoneNumber,
    accountType: a.accountType,
    balance: a.balance,
    currentBalance: a.current_balance,
    juneBalance: a.june_balance,
    difference: (a.current_balance || 0) - (a.june_balance || 0),
    status: a.status,
    activeStatus: a.active_status,
    lastTransactionDate: a.last_transaction_date,
  }));

  // 2. Fetch staff plans for the user
  const staffPlans = await prisma.staffPlan.findMany({
    where: { userId, status: 'Active' },
    include: { branchPlan: { select: { target_value: true, period: true } } },
  });

  // 3. Fetch approved tasks submitted by the user
  const tasks = await prisma.dailyTask.findMany({
    where: {
      submittedById: userId,
      approvalStatus: 'Approved',
    },
    select: { taskType: true, amount: true },
  });

  // 4. Aggregate task amounts by KPI category
  const taskTotals = {};
  for (const t of tasks) {
    const kpi = TASK_TO_KPI[t.taskType];
    if (kpi) {
      taskTotals[kpi] = (taskTotals[kpi] || 0) + (t.amount || 0);
    }
  }

  // 5. Build plan progress
  const planProgress = KPI_ORDER.map(kpi => {
    const plansForKpi = staffPlans.filter(sp => sp.kpi_category === kpi);
    const target = plansForKpi.reduce((s, sp) => s + (sp.individual_target || 0), 0);
    const monthlyTarget = plansForKpi.reduce((s, sp) => s + (sp.monthly_target || 0), 0);
    const achieved = taskTotals[kpi] || 0;
    const progress = target > 0 ? Math.min(Math.round((achieved / target) * 100), 100) : 0;
    return {
      kpi,
      label: KPI_LABELS[kpi] || kpi,
      target,
      monthlyTarget,
      achieved,
      remaining: Math.max(target - achieved, 0),
      progress,
      period: plansForKpi[0]?.branchPlan?.period || '',
    };
  }).filter(p => p.target > 0);

  // 6. Summary stats
  const totalDeposits = taskTotals['Deposit_Mobilization'] || 0;

  res.status(200).json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, role: user.role, position: user.position, branchName: user.branch?.name || user.branch_code },
      stats: {
        totalAccounts: mappedAccounts.length,
        activeAccounts: mappedAccounts.filter(a => a.activeStatus).length,
        totalDeposits,
        totalDifference: mappedAccounts.reduce((s, a) => s + (a.difference || 0), 0),
      },
      accounts: mappedAccounts,
      planProgress,
    },
  });
});

// @desc    Get all mapped accounts for a branch (for branch manager)
// @route   GET /api/mapped-accounts/branch
// @access  Private (Branch Manager)
export const getBranchMappedAccounts = asyncHandler(async (req, res) => {
  const branchId = req.user.branchId;

  const accounts = await prisma.accountMapping.findMany({
    where: { branchId, status: { not: 'Inactive' } },
    include: {
      mappedTo: { select: { id: true, name: true, employeeId: true, position: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const mapped = accounts.map(a => ({
    id: a.id,
    accountNumber: a.accountNumber,
    customerName: a.customerName,
    phoneNumber: a.phoneNumber,
    currentBalance: a.current_balance,
    juneBalance: a.june_balance,
    difference: (a.current_balance || 0) - (a.june_balance || 0),
    activeStatus: a.active_status,
    isProductive: a.isProductive,
    product: a.product,
    mappedTo: {
      id: a.mappedTo.id,
      name: a.mappedTo.name,
      employeeId: a.mappedTo.employeeId,
      position: a.mappedTo.position,
    },
  }));

  res.status(200).json({ success: true, data: mapped });
});

// @desc    Get mapped accounts for a specific account number
// @route   GET /api/mapped-accounts/account/:accountNumber
// @access  Private
export const getAccountDetail = asyncHandler(async (req, res) => {
  const account = await prisma.accountMapping.findUnique({
    where: { accountNumber: req.params.accountNumber },
    include: {
      mappedTo: { select: { id: true, name: true, employeeId: true } },
      dailyTasks: {
        where: { approvalStatus: 'Approved' },
        orderBy: { taskDate: 'desc' },
        take: 20,
        select: { taskType: true, amount: true, taskDate: true, remarks: true },
      },
    },
  });

  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  res.status(200).json({
    success: true,
    data: {
      id: account.id,
      accountNumber: account.accountNumber,
      customerName: account.customerName,
      phoneNumber: account.phoneNumber,
      accountType: account.accountType,
      balance: account.balance,
      currentBalance: account.current_balance,
      juneBalance: account.june_balance,
      difference: (account.current_balance || 0) - (account.june_balance || 0),
      status: account.status,
      activeStatus: account.active_status,
      lastTransactionDate: account.last_transaction_date,
      mappedTo: account.mappedTo,
      recentTasks: account.dailyTasks,
    },
  });
});
