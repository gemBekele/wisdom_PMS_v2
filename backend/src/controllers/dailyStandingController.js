import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getActivePeriod, getPeriodStart, getPeriodEnd, normalizePeriod } from '../utils/periodUtils.js';
import { KPI_TASK_TYPES } from '../utils/performanceCalculator.js';

const KPI_LABELS = {
  Deposit_Mobilization: 'Deposit Mobilization',
  New_Account_Opening: 'New Account Opening',
  New_Member_Registration: 'New Member Registration',
  Share_Capital_Growth: 'Share Capital Growth',
  Account_Productivity: 'Account Productivity',
  Mobile_Banking_Users: 'Mobile Banking Users',
  Merchant_POS_Growth: 'Merchant POS Growth',
  Billers_Recruitment: 'Billers Recruitment',
  Internal_Operations: 'Internal Operations',
  Collection_Rate: 'Collection Rate',
  Portfolio_Quality: 'Portfolio Quality',
};

const KPI_ORDER = Object.keys(KPI_LABELS);
const DEPOSIT_KPIS = new Set(['Deposit_Mobilization']);
const COUNT_KPIS = new Set(['New_Account_Opening', 'New_Member_Registration', 'Share_Capital_Growth', 'Account_Productivity', 'Mobile_Banking_Users', 'Merchant_POS_Growth', 'Billers_Recruitment', 'Internal_Operations']);
const PERCENT_KPIS = new Set(['Collection_Rate', 'Portfolio_Quality']);

const startOfUtcDay = (value = new Date()) => {
  const d = new Date(value);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);
const parseList = (value) => {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
};
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

const resolveFilters = async (req) => {
  const role = req.user.role;
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, areaId: true },
    orderBy: { name: 'asc' },
  });

  let allowed = branches;
  if (role === 'areaManager') {
    allowed = branches.filter(b => b.areaId === req.user.areaId);
  } else if (role === 'branchManager' || role === 'supervisor' || role === 'staff') {
    allowed = branches.filter(b => b.id === req.user.branchId);
  }

  const queryBranchIds = parseList(req.query.branchIds);
  if (queryBranchIds.length) allowed = allowed.filter(b => queryBranchIds.includes(b.id));

  const search = String(req.query.search || '').trim().toLowerCase();
  if (search) {
    allowed = allowed.filter(b => b.name.toLowerCase().includes(search) || b.code.toLowerCase().includes(search));
  }

  const branchIds = allowed.map(b => b.id);

  let staff = await prisma.user.findMany({
    where: { branchId: { in: branchIds }, isActive: true, role: { in: ['staff', 'supervisor'] } },
    select: { id: true, name: true, role: true, position: true, branchId: true, supervisorId: true },
    orderBy: { name: 'asc' },
  });

  if (role === 'staff') {
    staff = staff.filter(s => s.id === req.user.id);
  } else if (role === 'supervisor') {
    staff = staff.filter(s => s.id === req.user.id || s.supervisorId === req.user.id);
  }

  const queryStaffIds = parseList(req.query.staffIds);
  const staffFilterActive = queryStaffIds.length > 0;
  if (queryStaffIds.length) staff = staff.filter(s => queryStaffIds.includes(s.id));
  if (search) {
    staff = staff.filter(s => s.name.toLowerCase().includes(search) || String(s.position || '').toLowerCase().includes(search));
  }

  const scope = role === 'admin' ? 'hq' : role === 'areaManager' ? 'area' : role === 'staff' ? 'staff' : role === 'supervisor' ? 'supervisor' : 'branch';
  return { role, scope, branches: allowed, branchIds, staff, staffIds: staff.map(s => s.id), staffFilterActive };
};

const getDailyTarget = (planInfo, asOf) => {
  if (!planInfo) return 0;
  if (Number(planInfo.dailyTarget) > 0) return Number(planInfo.dailyTarget);
  const target = Number(planInfo.countTarget) > 0 ? planInfo.countTarget : planInfo.valueTarget || 0;
  if (!target) return 0;

  const monthName = asOf.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const daysInMonth = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + 1, 0)).getUTCDate();
  const mp = planInfo.monthlyPlan;

  if (Array.isArray(mp)) {
    const row = mp.find(r => String(r.month || '').toLowerCase() === monthName.toLowerCase());
    if (row) return (Number(row.amount ?? row.count ?? 0) || 0) / daysInMonth;
  } else if (mp && typeof mp === 'object') {
    const row = mp[monthName] ?? mp[monthName.toLowerCase()] ?? mp[String(asOf.getUTCMonth() + 1)];
    if (typeof row === 'number') return row / daysInMonth;
    if (row && typeof row === 'object') return (Number(row.amount ?? row.count ?? 0) || 0) / daysInMonth;
  }

  return target / 365;
};

const aggregatePlans = (plans, scopeKey) => {
  const grouped = new Map();
  for (const plan of plans) {
    const key = `${plan[scopeKey]}|${plan.kpi_category}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(plan);
  }

  const byDistinctScope = new Map();
  for (const [key, list] of grouped) {
    const [scopeId, kpi] = key.split('|');
    const kpiPlans = list.filter(p => !p.product_category);
    const chosen = kpiPlans.length ? kpiPlans : list;
    const valueTarget = chosen.reduce((s, p) => s + (Number(p.target_value) || 0), 0);
    const countTarget = chosen.reduce((s, p) => s + (Number(p.target_count) || 0), 0);
    const monthlyPlan = chosen.find(p => p.monthly_plan)?.monthly_plan || null;
    const dailyTarget = chosen.reduce((s, p) => s + (Number(p.daily_target) || 0), 0);
    if (!byDistinctScope.has(scopeId)) byDistinctScope.set(scopeId, new Map());
    byDistinctScope.get(scopeId).set(kpi, { valueTarget, countTarget, monthlyPlan, dailyTarget });
  }
  return byDistinctScope;
};

const getPlanTargets = async ({ scope, branchIds, staffIds, period }) => {
  if (scope === 'staff' || scope === 'supervisor') {
    const staffPlans = await prisma.staffPlan.findMany({
      where: { userId: { in: staffIds }, period, status: 'Active' },
      select: {
        userId: true,
        kpi_category: true,
        product_category: true,
        individual_target: true,
        target_count: true,
        daily_target: true,
      },
    });
    const normalized = staffPlans.map(p => ({
      ...p,
      target_value: p.individual_target,
      monthly_plan: null,
    }));
    return aggregatePlans(normalized, 'userId');
  }

  const plans = await prisma.plan.findMany({
    where: { branchId: { in: branchIds }, period, status: 'Active' },
    select: { branchId: true, kpi_category: true, product_category: true, target_value: true, target_count: true, monthly_plan: true },
  });
  return aggregatePlans(plans, 'branchId');
};

const resolveComparisonDate = (asOf, comparison) => {
  if (comparison === 'previous_week') return addDays(asOf, -7);
  if (comparison === 'month_start') return new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  if (comparison === 'custom' && comparison) return asOf;
  return addDays(asOf, -1);
};

const getDepositStanding = async ({ branchIds, staffIds, scope, staffFilterActive, asOf, comparisonDate, products }) => {
  const restrictToStaff = scope === 'staff' || scope === 'supervisor' || staffFilterActive;
  const where = {
    branchId: { in: branchIds },
    status: 'Active',
    accountType: { not: 'Loan' },
    ...(products.length ? { product: { in: products } } : {}),
    ...(restrictToStaff ? { mappedToId: { in: staffIds } } : {}),
  };

  const totals = await prisma.accountMapping.aggregate({
    where,
    _sum: { current_balance: true, june_balance: true },
  });
  const activeAccounts = await prisma.accountMapping.count({
    where: { ...where, current_balance: { gte: 1000 } },
  });

  const snapshot = await prisma.dailyKpiSnapshot.findFirst({
    where: {
      branchId: { in: branchIds },
      kpiCategory: 'Deposit_Mobilization',
      snapshotDate: comparisonDate,
    },
    orderBy: { snapshotDate: 'desc' },
  });

  let yesterday = null;
  if (snapshot) {
    const all = await prisma.dailyKpiSnapshot.findMany({
      where: {
        branchId: { in: branchIds },
        kpiCategory: 'Deposit_Mobilization',
        snapshotDate: snapshot.snapshotDate,
      },
      select: { currentValue: true },
    });
    yesterday = sum(all, 'currentValue');
  }

  const current = Number(totals._sum.current_balance) || 0;
  const june = Number(totals._sum.june_balance) || 0;

  return {
    current,
    june,
    growth: current - june,
    activeAccounts,
    yesterday,
    dayChange: yesterday === null ? null : current - yesterday,
    yesterdaySnapshotDate: snapshot?.snapshotDate || null,
  };
};

const getNewAccountStanding = async ({ branchIds, staffIds, scope, staffFilterActive, asOf, comparisonDate, periodStart, products }) => {
  const restrictToStaff = scope === 'staff' || scope === 'supervisor' || staffFilterActive;
  const baseWhere = {
    branchId: { in: branchIds },
    openedAt: { not: null },
    ...(products.length ? { product: { in: products } } : {}),
    ...(restrictToStaff ? { mappedToId: { in: staffIds } } : {}),
  };
  const todayEnd = addDays(asOf, 1);
  const comparisonEnd = addDays(comparisonDate, 1);

  const [today, yesterday, cycleTotal] = await Promise.all([
    prisma.accountMapping.count({ where: { ...baseWhere, openedAt: { gte: asOf, lt: todayEnd } } }),
    prisma.accountMapping.count({ where: { ...baseWhere, openedAt: { gte: comparisonDate, lt: comparisonEnd } } }),
    prisma.accountMapping.count({ where: { ...baseWhere, openedAt: { gte: periodStart, lt: todayEnd } } }),
  ]);

  return { today, yesterday, cycleTotal };
};

const getTaskMetrics = async ({ branchIds, staffIds, scope, staffFilterActive, asOf, periodStart, periodEnd }) => {
  const restrictToStaff = scope === 'staff' || scope === 'supervisor' || staffFilterActive;
  const where = {
    branchId: { in: branchIds },
    approvalStatus: 'Approved',
    taskDate: { gte: periodStart, lte: periodEnd },
    ...(restrictToStaff ? { submittedById: { in: staffIds } } : {}),
  };
  const tasks = await prisma.dailyTask.findMany({
    where,
    select: { taskType: true, amount: true, taskDate: true },
  });

  const todayStart = asOf;
  const todayEnd = addDays(asOf, 1);
  const yesterdayStart = addDays(asOf, -1);
  const yesterdayEnd = asOf;
  const metrics = {};

  for (const [kpi, taskTypes] of Object.entries(KPI_TASK_TYPES)) {
    const set = new Set(taskTypes);
    const rows = tasks.filter(t => set.has(t.taskType));
    metrics[kpi] = {
      periodCount: rows.length,
      periodAmount: sum(rows, 'amount'),
      todayCount: rows.filter(t => t.taskDate >= todayStart && t.taskDate < todayEnd).length,
      todayAmount: sum(rows.filter(t => t.taskDate >= todayStart && t.taskDate < todayEnd), 'amount'),
      yesterdayCount: rows.filter(t => t.taskDate >= yesterdayStart && t.taskDate < yesterdayEnd).length,
      yesterdayAmount: sum(rows.filter(t => t.taskDate >= yesterdayStart && t.taskDate < yesterdayEnd), 'amount'),
    };
  }
  return metrics;
};

const getPipeline = async ({ branchIds, staffIds, scope, staffFilterActive, periodStart, periodEnd }) => {
  const restrictToStaff = scope === 'staff' || scope === 'supervisor' || staffFilterActive;
  const where = {
    branchId: { in: branchIds },
    taskDate: { gte: periodStart, lte: periodEnd },
    ...(restrictToStaff ? { submittedById: { in: staffIds } } : {}),
  };
  const grouped = await prisma.dailyTask.groupBy({
    by: ['approvalStatus'],
    where,
    _count: { _all: true },
  });
  const pipeline = { Draft: 0, Pending: 0, Approved: 0, Rejected: 0, CBSValidated: 0 };
  for (const row of grouped) {
    const key = row.approvalStatus;
    if (key in pipeline) pipeline[key] = row._count._all;
  }
  const cbs = await prisma.dailyTask.count({ where: { ...where, cbsValidated: true } });
  pipeline.CBSValidated = cbs;
  return pipeline;
};

const getTrend = async ({ branchIds, asOf, trendDays }) => {
  const start = addDays(asOf, -(trendDays - 1));
  const snapshots = await prisma.dailyKpiSnapshot.findMany({
    where: {
      branchId: { in: branchIds },
      kpiCategory: { in: ['Deposit_Mobilization', 'New_Account_Opening'] },
      snapshotDate: { gte: start, lte: asOf },
    },
    select: { snapshotDate: true, kpiCategory: true, currentValue: true, newAccounts: true },
  });
  const byDate = new Map();
  for (const s of snapshots) {
    const key = s.snapshotDate.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { date: key, deposit: 0, newAccounts: 0 });
    const row = byDate.get(key);
    if (s.kpiCategory === 'Deposit_Mobilization') row.deposit += s.currentValue || 0;
    if (s.kpiCategory === 'New_Account_Opening') row.newAccounts += s.newAccounts || s.currentValue || 0;
  }
  const trend = [];
  for (let i = 0; i < trendDays; i++) {
    const d = addDays(start, i).toISOString().slice(0, 10);
    trend.push(byDate.get(d) || { date: d, deposit: null, newAccounts: null });
  }
  return trend;
};

const getRankings = async ({ scope, branchIds, staffIds, staffFilterActive, branches, staff, asOf, period }) => {
  const restrictToStaff = scope === 'staff' || scope === 'supervisor' || staffFilterActive;
  const depositWhere = {
    branchId: { in: branchIds },
    status: 'Active',
    accountType: { not: 'Loan' },
    ...(restrictToStaff ? { mappedToId: { in: staffIds } } : {}),
  };

  const planMap = await getPlanTargets({ scope, branchIds, staffIds, period });
  const byBranch = (scope === 'hq' || scope === 'area') && !staffFilterActive;
  const grouped = await prisma.accountMapping.groupBy({
    by: [byBranch ? 'branchId' : 'mappedToId'],
    where: depositWhere,
    _sum: { current_balance: true, june_balance: true },
  });

  const rows = grouped.map(row => {
    const id = row[byBranch ? 'branchId' : 'mappedToId'];
    if (!id) return null;
    const name = byBranch
      ? branches.find(b => b.id === id)?.name || 'Unknown'
      : staff.find(s => s.id === id)?.name || 'Unknown';
    const planInfo = planMap.get(id)?.get('Deposit_Mobilization');
    const target = planInfo?.valueTarget || 0;
    const current = Number(row._sum.current_balance) || 0;
    const june = Number(row._sum.june_balance) || 0;
    const growth = current - june;
    return {
      id,
      name,
      current,
      june,
      growth,
      planTarget: target,
      planPct: target > 0 ? round((growth / target) * 100) : 0,
    };
  }).filter(Boolean);

  return rows.sort((a, b) => b.planPct - a.planPct);
};

export const getDailyStanding = asyncHandler(async (req, res) => {
  const asOf = req.query.asOfDate ? startOfUtcDay(req.query.asOfDate) : startOfUtcDay(new Date());
  const period = normalizePeriod(req.query.period) || await getActivePeriod();
  const periodStart = getPeriodStart(period);
  const periodEnd = getPeriodEnd(period);
  const cycleDays = daysBetween(startOfUtcDay(periodStart), startOfUtcDay(periodEnd)) + 1;
  const cycleDay = Math.max(1, Math.min(cycleDays, daysBetween(startOfUtcDay(periodStart), asOf) + 1));

  const comparison = req.query.comparison || 'yesterday';
  const comparisonDate = resolveComparisonDate(asOf, comparison);
  const trendDays = Math.min(Math.max(parseInt(req.query.trendDays, 10) || 14, 7), 90);
  const requestedKpis = parseList(req.query.kpiGroups);
  const selectedKpis = requestedKpis.length ? requestedKpis.filter(k => KPI_LABELS[k]) : KPI_ORDER;
  const products = parseList(req.query.products);

  const filters = await resolveFilters(req);
  if (filters.branchIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No branches match the selected filters' });
  }

  const [deposit, newAccounts, planMap, taskMetrics, pipeline, trend, rankings] = await Promise.all([
    getDepositStanding({ ...filters, asOf, comparisonDate, products }),
    getNewAccountStanding({ ...filters, asOf, comparisonDate, periodStart, products }),
    getPlanTargets({ ...filters, period }),
    getTaskMetrics({ ...filters, asOf, periodStart, periodEnd }),
    getPipeline({ ...filters, periodStart, periodEnd }),
    getTrend({ branchIds: filters.branchIds, asOf, trendDays }),
    getRankings({ ...filters, asOf, period }),
  ]);

  const planFor = (kpi) => {
    let valueTarget = 0;
    let countTarget = 0;
    let monthlyPlan = null;
    let dailyTarget = 0;
    const ids = filters.scope === 'staff' || filters.scope === 'supervisor' ? filters.staffIds : filters.branchIds;
    for (const id of ids) {
      const info = planMap.get(id)?.get(kpi);
      if (info) {
        valueTarget += info.valueTarget;
        countTarget += info.countTarget;
        dailyTarget += info.dailyTarget || 0;
        if (!monthlyPlan && info.monthlyPlan) monthlyPlan = info.monthlyPlan;
      }
    }
    return { valueTarget, countTarget, monthlyPlan, dailyTarget };
  };

  const groups = selectedKpis.map(kpi => {
    const plan = planFor(kpi);
    const dailyTarget = getDailyTarget(plan, asOf);
    let current = 0;
    let yesterday = null;
    let today = 0;
    let planTarget = plan.valueTarget || 0;
    let newAccountsToday = null;
    let newAccountsYesterday = null;
    let unit = 'ETB';

    if (DEPOSIT_KPIS.has(kpi)) {
      current = deposit.current;
      yesterday = deposit.yesterday;
      today = deposit.dayChange || 0;
      planTarget = plan.valueTarget || 0;
      newAccountsToday = newAccounts.today;
      newAccountsYesterday = newAccounts.yesterday;
    } else if (kpi === 'New_Account_Opening') {
      unit = 'accounts';
      current = newAccounts.cycleTotal;
      yesterday = newAccounts.yesterday;
      today = newAccounts.today;
      planTarget = plan.countTarget > 0 ? plan.countTarget : plan.valueTarget;
      newAccountsToday = newAccounts.today;
      newAccountsYesterday = newAccounts.yesterday;
    } else if (COUNT_KPIS.has(kpi) || PERCENT_KPIS.has(kpi)) {
      const m = taskMetrics[kpi] || { periodCount: 0, todayCount: 0, yesterdayCount: 0, periodAmount: 0, todayAmount: 0, yesterdayAmount: 0 };
      unit = COUNT_KPIS.has(kpi) ? 'count' : '%';
      current = COUNT_KPIS.has(kpi) ? m.periodCount : m.periodCount;
      yesterday = m.yesterdayCount;
      today = m.todayCount;
      planTarget = plan.countTarget > 0 ? plan.countTarget : plan.valueTarget;
    }

    if (COUNT_KPIS.has(kpi) || kpi === 'New_Account_Opening') planTarget = Math.round(planTarget);
    const isDeposit = DEPOSIT_KPIS.has(kpi);
    const growth = isDeposit ? current - (deposit.june || 0) : current;
    const dayChange = yesterday === null ? null : isDeposit ? current - yesterday : today - yesterday;
    const planPct = planTarget > 0 ? round((current / planTarget) * 100) : 0;
    const todayPct = dailyTarget > 0 ? round((Math.max(0, today) / dailyTarget) * 100) : 0;
    const expectedPct = cycleDays > 0 ? round((cycleDay / cycleDays) * 100) : 0;
    const status = planTarget <= 0 ? 'No Plan' : planPct >= 100 ? 'Ahead' : planPct >= expectedPct ? 'On Track' : 'Behind';

    return {
      key: kpi,
      name: KPI_LABELS[kpi],
      unit,
      current,
      june: DEPOSIT_KPIS.has(kpi) ? deposit.june : null,
      yesterday,
      today,
      dayChange,
      growth,
      planTarget,
      planPct,
      dailyTarget: round(dailyTarget),
      todayPct,
      newAccountsToday,
      newAccountsYesterday,
      status,
    };
  });

  const staffCount = filters.staff.length;
  const submittedToday = await prisma.dailyTask.findMany({
    where: {
      branchId: { in: filters.branchIds },
      taskDate: { gte: asOf, lt: addDays(asOf, 1) },
      submittedById: { in: filters.staffIds },
    },
    distinct: ['submittedById'],
    select: { submittedById: true },
  });

  const lastCbs = await prisma.cBSValidation.findFirst({
    where: { branchId: { in: filters.branchIds }, status: { in: ['Completed', 'Partial'] } },
    orderBy: { validatedAt: 'desc' },
    select: { validatedAt: true, createdAt: true },
  });
  const lastSnapshot = await prisma.dailyKpiSnapshot.findFirst({
    where: { branchId: { in: filters.branchIds } },
    orderBy: { snapshotDate: 'desc' },
    select: { snapshotDate: true },
  });

  const productsInScope = await prisma.accountMapping.findMany({
    where: { branchId: { in: filters.branchIds }, status: 'Active', accountType: { not: 'Loan' }, product: { not: null } },
    distinct: ['product'],
    select: { product: true },
    orderBy: { product: 'asc' },
  });

  const planPeriods = await prisma.plan.findMany({
    where: { branchId: { in: filters.branchIds } },
    distinct: ['period'],
    select: { period: true },
    orderBy: { period: 'desc' },
  });

  const recentTasks = await prisma.dailyTask.findMany({
    where: {
      branchId: { in: filters.branchIds },
      ...(filters.scope === 'staff' || filters.scope === 'supervisor' || filters.staffFilterActive ? { submittedById: { in: filters.staffIds } } : {}),
    },
    orderBy: { taskDate: 'desc' },
    take: 8,
    select: {
      id: true,
      taskType: true,
      amount: true,
      taskDate: true,
      approvalStatus: true,
      submittedBy: { select: { name: true } },
      branch: { select: { name: true, code: true } },
    },
  });

  res.status(200).json({
    success: true,
    data: {
      scope: filters.scope,
      period,
      asOf: asOf.toISOString(),
      cycleDay,
      cycleDays,
      comparison,
      comparisonDate: comparisonDate.toISOString(),
      trendDays,
      summary: {
        deposit: {
          current: deposit.current,
          june: deposit.june,
          growth: deposit.growth,
          yesterday: deposit.yesterday,
          dayChange: deposit.dayChange,
          planTarget: groups.find(g => g.key === 'Deposit_Mobilization')?.planTarget || 0,
          planPct: groups.find(g => g.key === 'Deposit_Mobilization')?.planPct || 0,
        },
        newAccounts: {
          today: newAccounts.today,
          yesterday: newAccounts.yesterday,
          cycleTotal: newAccounts.cycleTotal,
          dailyTarget: groups.find(g => g.key === 'New_Account_Opening')?.dailyTarget || 0,
        },
        activeStaff: { submitted: submittedToday.length, total: staffCount },
        pipeline,
      },
      groups,
      trend,
      rankings: rankings.slice(0, 10),
      filterOptions: {
        branches: filters.branches.map(b => ({ id: b.id, name: b.name, code: b.code, areaId: b.areaId })),
        staff: filters.staff.map(s => ({ id: s.id, name: s.name, role: s.role, position: s.position, branchId: s.branchId })),
        kpiGroups: KPI_ORDER.map(k => ({ key: k, name: KPI_LABELS[k] })),
        products: productsInScope.map(p => p.product).filter(Boolean),
        periods: planPeriods.length ? planPeriods.map(p => p.period) : [period],
      },
      recentTasks: recentTasks.map(t => ({
        id: t.id,
        taskType: t.taskType,
        amount: t.amount,
        taskDate: t.taskDate,
        approvalStatus: t.approvalStatus,
        staff: t.submittedBy?.name || 'Unknown',
        branch: t.branch?.name || '',
      })),
      freshness: {
        lastCbsUpload: lastCbs?.validatedAt || lastCbs?.createdAt || null,
        lastSnapshot: lastSnapshot?.snapshotDate || null,
        yesterdaySnapshotAvailable: deposit.yesterday !== null,
      },
    },
  });
});
