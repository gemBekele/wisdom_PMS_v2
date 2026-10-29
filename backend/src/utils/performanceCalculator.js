import prisma from '../config/database.js';
import { KPI_CATEGORY_TO_ENUM, TASK_TYPE_TO_ENUM, CBS_PRODUCT_TO_CATEGORY, PRODUCT_CATEGORY_TO_KPI } from './prismaHelpers.js';

/**
 * Build Prisma where clause to filter tasks that count toward achievement.
 * Fix 2.1 — Dual Validation Gate: count if CBS-validated OR (approved AND product !requiresCbs)
 * Fix 2.3 — Mapping Enforcement: only count tasks whose account is unmapped or mapped to user
 */
export const buildTaskAchievementFilter = async ({ taskTypes, userId, submittedById, branchId, taskDateRange }) => {
  const activeMappings = await prisma.productKpiMapping.findMany({
    where: { status: 'active' },
    select: { cbs_product_name: true, requiresCbs: true },
  });

  const cbsRequired = new Set();
  for (const m of activeMappings) {
    const taskType = CBS_PRODUCT_TO_CATEGORY[m.cbs_product_name];
    if (taskType && m.requiresCbs) {
      cbsRequired.add(taskType);
    }
  }

  const allTaskTypes = taskTypes || [...new Set(Object.values(CBS_PRODUCT_TO_CATEGORY))];
  const cbsRequiredTaskTypes = allTaskTypes.filter(t => cbsRequired.has(t));
  const cbsOptionalTaskTypes = allTaskTypes.filter(t => !cbsRequired.has(t));

  const andClauses = [];

  if (taskTypes && taskTypes.length > 0) {
    andClauses.push({ taskType: { in: taskTypes } });
  }

  // Dual validation gate (Fix 2.1):
  // - Task types that require CBS: only count if cbsValidated === true
  // - Task types that don't require CBS: count if approved (cbsValidated also counts)
  const orConditions = [];
  if (cbsRequiredTaskTypes.length > 0) {
    orConditions.push({
      taskType: { in: cbsRequiredTaskTypes },
      cbsValidated: true,
    });
  }
  if (cbsOptionalTaskTypes.length > 0) {
    orConditions.push({
      taskType: { in: cbsOptionalTaskTypes },
      approvalStatus: 'Approved',
    });
    orConditions.push({
      taskType: { in: cbsOptionalTaskTypes },
      cbsValidated: true,
    });
  }

  if (orConditions.length > 0) {
    andClauses.push({ OR: orConditions });
  }

  if (submittedById) {
    andClauses.push({ submittedById });
  }
  if (branchId) {
    andClauses.push({ branchId });
  }
  if (taskDateRange) {
    andClauses.push({ taskDate: taskDateRange });
  }

  // Fix 2.3 — Mapping Enforcement: account must be null (no mapping) or mapped to user
  if (userId) {
    andClauses.push({
      OR: [
        { account: null },
        { account: { mappedToId: userId } },
      ],
    });
  }

  return { AND: andClauses };
};

/**
 * Calculate incremental growth for a user in a given period.
 * Optionally filtered by product category for product-level plans.
 * Growth = current_balance - june_balance
 * Only accounts with current_balance ≥ 1,000 ETB count
 */
export const calculateIncrementalGrowth = async (userId, branch_code, kpi_category, period, product_category) => {
  try {
    // Get all mapped accounts for this user (exclude Loan type)
    const mappedAccounts = await prisma.accountMapping.findMany({
      where: {
        mappedToId: userId,
        status: 'Active',
        current_balance: { gte: 1000 },
        accountType: { not: 'Loan' },
      },
    });

    let totalGrowth = 0;

    for (const account of mappedAccounts) {
      // If filtering by product category, check account's product mapping
      if (product_category) {
        const acctProductCat = CBS_PRODUCT_TO_CATEGORY[account.product] || null;
        if (acctProductCat !== product_category) continue;
      }

      const juneBalance = await prisma.juneBalance.findFirst({
        where: {
          OR: [
            { account_id: account.accountNumber },
            { accountNumber: account.accountNumber },
          ],
          is_active: true,
        },
      });

      const june_balance = juneBalance?.june_balance || 0;
      const current_balance = account.current_balance || 0;

      const growth = current_balance - june_balance;
      if (growth > 0) {
        totalGrowth += growth;
      }
    }

    return totalGrowth;
  } catch (error) {
    throw new Error(`Incremental growth calculation error: ${error.message}`);
  }
};

/**
 * Calculate KPI score for a user in a given period
 * Uses StaffPlan targets and incremental growth
 */
export const calculateKPIScore = async (userId, branch_code, period) => {
  try {
    // Get all staff plans for this user and period
    const staffPlans = await prisma.staffPlan.findMany({
      where: {
        userId,
        branch_code,
        period,
        status: 'Active',
      },
    });

    if (!staffPlans || staffPlans.length === 0) {
      throw new Error('No staff plans found for user in this period');
    }

    // Separate product-level plans from KPI-level plans
    const productStaffPlans = staffPlans.filter(p => p.product_category);
    const kpiStaffPlans = staffPlans.filter(p => !p.product_category);

    const kpiScores = {};
    let totalScorePoints = 0;

    // First pass: calculate product-level achievements for Deposit Mobilization
    const productAchievements = {};
    if (productStaffPlans.length > 0) {
      for (const plan of productStaffPlans) {
        const { product_category, individual_target, target_count } = plan;
        if (!product_category) continue;

        const parentKpi = PRODUCT_CATEGORY_TO_KPI[product_category];
        if (!parentKpi) continue;

        const actualGrowth = await calculateIncrementalGrowth(userId, branch_code, parentKpi, period, product_category);

        if (!productAchievements[parentKpi]) {
          productAchievements[parentKpi] = { totalActual: 0, totalTarget: 0, products: [] };
        }
        productAchievements[parentKpi].totalActual += actualGrowth;
        productAchievements[parentKpi].totalTarget += individual_target;
        productAchievements[parentKpi].products.push({
          product_category,
          target: individual_target,
          target_count,
          actual: actualGrowth,
          percent: individual_target > 0 ? Math.round((actualGrowth / individual_target) * 10000) / 100 : 0,
        });
      }
    }

    // Calculate score for each KPI-level StaffPlan
    for (const plan of kpiStaffPlans) {
      const { kpi_category, individual_target } = plan;

      let actualGrowth = 0;

      if (kpi_category === 'Deposit_Mobilization') {
        // If we have product-level breakdown, use aggregate from products
        if (productAchievements[kpi_category]) {
          actualGrowth = productAchievements[kpi_category].totalActual;
        } else {
          actualGrowth = await calculateIncrementalGrowth(userId, branch_code, kpi_category, period);
        }
      } else if (kpi_category === 'Collection_Rate') {
        const collectionData = await calculateStaffCollectionRate(userId);
        actualGrowth = collectionData.percent;
      } else if (kpi_category === 'Portfolio_Quality') {
        const loanAccounts = await prisma.accountMapping.findMany({
          where: { mappedToId: userId, accountType: 'Loan', status: 'Active' },
          select: { id: true },
        });
        if (loanAccounts.length > 0) {
          const parMetrics = await calculateParMetrics(loanAccounts.map(a => a.id));
          actualGrowth = parMetrics.totalPortfolio > 0 ? 100 - parMetrics.par90Ratio : 100;
        }
      }

      // Calculate percentage and score
      const percent = individual_target > 0 ? (actualGrowth / individual_target) * 100 : 0;

      // KPI weight (sums to 100, then scaled to 85% of final score)
      const config = await prisma.kpiFrameworkConfig.findMany();
      const weights = {};
      for (const c of config) {
        weights[c.kpiId] = c.weight;
      }
      // Fallback if no config exists yet
      if (Object.keys(weights).length === 0) {
        const defaultWeights = {
          'Deposit_Mobilization': 40, 'Collection_Rate': 30, 'Portfolio_Quality': 30,
        };
        Object.assign(weights, defaultWeights);
      }

      const weight = weights[kpi_category] || 0;
      const categoryScore = (percent / 100) * weight;

      const scoreEntry = {
        target: individual_target,
        actual: actualGrowth,
        percent: Math.round(percent * 100) / 100,
        weight: weight,
        score: Math.round(categoryScore * 100) / 100,
      };

      // Attach product-level breakdown if available
      if (productAchievements[kpi_category]) {
        scoreEntry.products = productAchievements[kpi_category].products;
        scoreEntry.productTarget = productAchievements[kpi_category].totalTarget;
        scoreEntry.productActual = productAchievements[kpi_category].totalActual;
      }

      kpiScores[kpi_category] = scoreEntry;

      totalScorePoints += categoryScore;
    }

    // Also handle product-only plans (no KPI-level StaffPlan, only product StaffPlans)
    for (const [kpi, achievement] of Object.entries(productAchievements)) {
      if (kpiScores[kpi]) continue; // Already handled above

      const weight = weights[kpi] || 0;
      const percent = achievement.totalTarget > 0 ? (achievement.totalActual / achievement.totalTarget) * 100 : 0;
      const categoryScore = (percent / 100) * weight;

      kpiScores[kpi] = {
        target: achievement.totalTarget,
        actual: achievement.totalActual,
        percent: Math.round(percent * 100) / 100,
        weight,
        score: Math.round(categoryScore * 100) / 100,
        products: achievement.products,
        productTarget: achievement.totalTarget,
        productActual: achievement.totalActual,
      };

      totalScorePoints += categoryScore;
    }

    // Total KPI score (85% weight)
    const kpiTotalScore = (totalScorePoints / 100) * 85;

    return {
      kpiScores,
      kpiTotalScore: Math.round(kpiTotalScore * 100) / 100,
    };
  } catch (error) {
    throw new Error(`KPI calculation error: ${error.message}`);
  }
};

/**
 * Calculate KPI score for a Branch Manager based on aggregated branch performance
 * BM achievement = sum of all staff's achievement vs branch plan target
 */
export const calculateBranchKPIScore = async (branch_code, period) => {
  try {
    const branch = await prisma.branch.findFirst({ where: { code: branch_code } });
    if (!branch) throw new Error(`Branch not found: ${branch_code}`);

    // Get all branch plans for this period
    const branchPlans = await prisma.plan.findMany({
      where: { branch_code, period, status: 'Active' },
    });

    if (!branchPlans || branchPlans.length === 0) {
      throw new Error('No branch plans found for this period');
    }

    // Get all staff in branch (excluding BM themselves)
    const staff = await prisma.user.findMany({
      where: { branchId: branch.id, isActive: true, role: { in: ['staff', 'supervisor'] } },
    });
    const staffIds = staff.map(s => s.id);

    const kpiScores = {};
    let totalScorePoints = 0;

    const config = await prisma.kpiFrameworkConfig.findMany();
    const weights = {};
    for (const c of config) {
      weights[c.kpiId] = c.weight;
    }
    if (Object.keys(weights).length === 0) {
      Object.assign(weights, {
        'Deposit_Mobilization': 40, 'Collection_Rate': 30, 'Portfolio_Quality': 30,
      });
    }

    for (const plan of branchPlans) {
      const { kpi_category, target_value } = plan;
      let actualGrowth = 0;

      if (kpi_category === 'Deposit_Mobilization') {
        actualGrowth = await calculateBranchDepositGrowth(branch_code, period);
      } else if (kpi_category === 'Collection_Rate') {
        // Average collection rate across all staff
        let totalRate = 0;
        let staffWithData = 0;
        for (const sid of staffIds) {
          const cd = await calculateStaffCollectionRate(sid);
          if (cd.expected > 0) {
            totalRate += cd.percent;
            staffWithData++;
          }
        }
        actualGrowth = staffWithData > 0 ? totalRate / staffWithData : 0;
      } else if (kpi_category === 'Portfolio_Quality') {
        const loanAccounts = await prisma.accountMapping.findMany({
          where: { branchId: branch?.id, accountType: 'Loan', status: 'Active' },
          select: { id: true },
        });
        if (loanAccounts.length > 0) {
          const parMetrics = await calculateParMetrics(loanAccounts.map(a => a.id));
          actualGrowth = parMetrics.totalPortfolio > 0 ? 100 - parMetrics.par90Ratio : 100;
        }
      }

      const percent = target_value > 0 ? (actualGrowth / target_value) * 100 : 0;
      const weight = weights[kpi_category] || 0;
      const categoryScore = (percent / 100) * weight;

      kpiScores[kpi_category] = {
        target: target_value,
        actual: actualGrowth,
        percent: Math.round(percent * 100) / 100,
        weight: weight,
        score: Math.round(categoryScore * 100) / 100,
      };

      totalScorePoints += categoryScore;
    }

    const kpiTotalScore = (totalScorePoints / 100) * 85;

    return {
      kpiScores,
      kpiTotalScore: Math.round(kpiTotalScore * 100) / 100,
    };
  } catch (error) {
    throw new Error(`Branch KPI calculation error: ${error.message}`);
  }
};

/**
 * Calculate rating based on final score
 */
export const calculateRating = (finalScore) => {
  if (finalScore >= 120) return 'Outstanding';
  if (finalScore >= 100) return 'Exceeds_Expectations';
  if (finalScore >= 90) return 'Meets_Expectations';
  if (finalScore >= 80) return 'Needs_Improvement';
  return 'Unsatisfactory';
};

/**
 * Calculate deposit growth for entire branch (sum of all staff)
 */
export const calculateBranchDepositGrowth = async (branch_code, period) => {
  try {
    // Get branch ID from branch code
    const branch = await prisma.branch.findFirst({ where: { code: branch_code } });
    if (!branch) return 0;

    // Get june baselines (note: branch_code might be null, use account_id)
    const juneBaseline = await prisma.juneBalance.findMany({
      where: { is_active: true }
    });

    const accountIds = juneBaseline.map(j => j.account_id).filter(Boolean);
    const accountNumbers = juneBaseline.map(j => j.accountNumber).filter(Boolean);
    
    if (accountIds.length === 0 && accountNumbers.length === 0) return 0;

    const currentBalances = await prisma.accountMapping.findMany({
      where: {
        branchId: branch.id,
        status: 'Active',
        current_balance: { gte: 1000 },
        OR: [
          { accountNumber: { in: accountIds } },
          { accountNumber: { in: accountNumbers } }
        ]
      },
    });

    let totalGrowth = 0;
    for (const mapping of currentBalances) {
      const baseline = juneBaseline.find(j => 
        j.account_id === mapping.accountNumber || j.accountNumber === mapping.accountNumber
      );
      if (baseline) {
        const growth = mapping.current_balance - baseline.june_balance;
        if (growth > 0) totalGrowth += growth;
      }
    }

    return totalGrowth;
  } catch (error) {
    console.error('Branch deposit growth error:', error);
    return 0;
  }
};

// ============================================================
// NPL & Collection Tracking Engine
// ============================================================

/**
 * Calculate DPD (Days Past Due) for a single loan account.
 * DPD = days since the oldest unpaid installment's expected date.
 */
export const calculateLoanDpd = async (accountId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unpaidInstallments = await prisma.loanSchedule.findMany({
      where: {
        accountId,
        expectedDate: { lte: today },
        status: { in: ['Pending', 'Partial'] },
      },
      orderBy: { expectedDate: 'asc' },
      take: 1,
    });

    if (unpaidInstallments.length === 0) return 0;

    const oldestDue = new Date(unpaidInstallments[0].expectedDate);
    oldestDue.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - oldestDue.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  } catch (error) {
    console.error('DPD calculation error:', error);
    return 0;
  }
};

/**
 * Calculate DPD for all loan accounts in a given scope (branch or staff).
 * Returns an array of { accountId, accountNumber, current_balance, dpd, classification }
 */
export const calculateBatchDpd = async (accountIds) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const accounts = await prisma.accountMapping.findMany({
      where: {
        id: { in: accountIds },
        accountType: 'Loan',
        status: 'Active',
      },
      select: { id: true, accountNumber: true, current_balance: true },
    });

    if (accounts.length === 0) return [];

    const allSchedules = await prisma.loanSchedule.findMany({
      where: {
        accountId: { in: accounts.map(a => a.id) },
        expectedDate: { lte: today },
        status: { in: ['Pending', 'Partial'] },
      },
      orderBy: { expectedDate: 'asc' },
    });

    // Group by account, take the oldest unpaid installment per account
    const oldestPerAccount = {};
    for (const s of allSchedules) {
      if (!oldestPerAccount[s.accountId]) {
        oldestPerAccount[s.accountId] = s;
      }
    }

    return accounts.map(acct => {
      const oldest = oldestPerAccount[acct.id];
      let dpd = 0;
      if (oldest) {
        const dueDate = new Date(oldest.expectedDate);
        dueDate.setHours(0, 0, 0, 0);
        dpd = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
      const classification = dpd >= 180 ? 'Loss' : dpd >= 90 ? 'Doubtful' : dpd >= 30 ? 'Substandard' : dpd >= 1 ? 'Watch' : 'Performing';
      return {
        accountId: acct.id,
        accountNumber: acct.accountNumber,
        currentBalance: acct.current_balance,
        dpd,
        classification,
      };
    });
  } catch (error) {
    console.error('Batch DPD calculation error:', error);
    return [];
  }
};

/**
 * Calculate PAR (Portfolio at Risk) metrics for a set of loan accounts.
 * Returns { totalPortfolio, par1Amount, par30Amount, par90Amount, par1Ratio, par30Ratio, par90Ratio, totalLoans, par1Count, par30Count, par90Count }
 */
export const calculateParMetrics = async (accountIds) => {
  try {
    const dpdResults = await calculateBatchDpd(accountIds);
    let totalPortfolio = 0;
    let par1Amount = 0, par30Amount = 0, par90Amount = 0;
    let par1Count = 0, par30Count = 0, par90Count = 0;

    for (const r of dpdResults) {
      totalPortfolio += r.currentBalance || 0;
      if (r.dpd >= 1) { par1Amount += r.currentBalance || 0; par1Count++; }
      if (r.dpd >= 30) { par30Amount += r.currentBalance || 0; par30Count++; }
      if (r.dpd >= 90) { par90Amount += r.currentBalance || 0; par90Count++; }
    }

    return {
      totalPortfolio,
      par1Amount,
      par30Amount,
      par90Amount,
      par1Ratio: totalPortfolio > 0 ? (par1Amount / totalPortfolio) * 100 : 0,
      par30Ratio: totalPortfolio > 0 ? (par30Amount / totalPortfolio) * 100 : 0,
      par90Ratio: totalPortfolio > 0 ? (par90Amount / totalPortfolio) * 100 : 0,
      totalLoans: dpdResults.length,
      par1Count,
      par30Count,
      par90Count,
    };
  } catch (error) {
    console.error('PAR metrics error:', error);
    return {
      totalPortfolio: 0, par1Amount: 0, par30Amount: 0, par90Amount: 0,
      par1Ratio: 0, par30Ratio: 0, par90Ratio: 0,
      totalLoans: 0, par1Count: 0, par30Count: 0, par90Count: 0,
    };
  }
};

/**
 * Calculate a single staff member's collection rate for today.
 * Collection Rate % = total paid / total expected * 100
 */
export const calculateStaffCollectionRate = async (userId, date) => {
  try {
    const queryDate = date ? new Date(date) : new Date();
    const dayStart = new Date(queryDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const loanAccounts = await prisma.accountMapping.findMany({
      where: {
        mappedToId: userId,
        accountType: 'Loan',
        status: 'Active',
      },
      select: { id: true },
    });

    if (loanAccounts.length === 0) return { expected: 0, paid: 0, percent: 0, count: 0, paidCount: 0 };

    const accountIds = loanAccounts.map(a => a.id);

    const todayInstallments = await prisma.loanSchedule.findMany({
      where: {
        accountId: { in: accountIds },
        expectedDate: { gte: dayStart, lt: dayEnd },
      },
    });

    if (todayInstallments.length === 0) return { expected: 0, paid: 0, percent: 0, count: 0, paidCount: 0 };

    const totalExpected = todayInstallments.reduce((s, i) => s + i.expectedAmount, 0);
    const totalPaid = todayInstallments.reduce((s, i) => s + i.paidAmount, 0);
    const paidCount = todayInstallments.filter(i => i.status === 'Paid' || i.status === 'Partial').length;

    return {
      expected: totalExpected,
      paid: totalPaid,
      percent: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100 * 100) / 100 : 0,
      count: todayInstallments.length,
      paidCount,
    };
  } catch (error) {
    console.error('Collection rate error:', error);
    return { expected: 0, paid: 0, percent: 0, count: 0, paidCount: 0 };
  }
};

/**
 * Generate or update daily NPL snapshot for a branch.
 */
export const generateNplSnapshot = async (branchId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const loanAccounts = await prisma.accountMapping.findMany({
      where: {
        branchId,
        accountType: 'Loan',
        status: 'Active',
      },
      select: { id: true },
    });

    const accountIds = loanAccounts.map(a => a.id);
    const parMetrics = await calculateParMetrics(accountIds);

    // Upsert today's snapshot
    const existing = await prisma.nplSnapshot.findFirst({
      where: {
        branchId,
        snapshotDate: { gte: today, lt: tomorrow },
      },
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
  } catch (error) {
    console.error('NPL snapshot error:', error);
    throw error;
  }
};

/**
 * Auto-generate loan repayment schedules for a loan account.
 * Creates installments from next_payment_date to maturity_date based on payment_frequency.
 */
export const autoGenerateLoanSchedules = async (accountId) => {
  try {
    const account = await prisma.accountMapping.findUnique({
      where: { id: accountId },
    });

    if (!account || account.accountType !== 'Loan') {
      throw new Error('Account is not a loan account');
    }
    if (!account.payment_frequency || !account.loan_principal || !account.next_payment_date) {
      throw new Error('Missing loan data: payment_frequency, loan_principal, or next_payment_date');
    }

    // Determine installment amount (simple: principal split evenly)
    const maturityDate = account.loan_maturity_date ? new Date(account.loan_maturity_date) : new Date();
    const startDate = new Date(account.next_payment_date);
    const principal = account.loan_principal;

    let installments = [];
    let currentDate = new Date(startDate);
    let remainingPrincipal = principal;
    let count = 0;

    // Generate up to 200 installments (safety limit)
    while (currentDate <= maturityDate && count < 200) {
      count++;

      // Estimate installment amount based on frequency and remaining time
      let installmentAmount;
      let nextDate;
      if (account.payment_frequency === 'Monthly') {
        installmentAmount = Math.round((principal / 12) * 100) / 100;
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (account.payment_frequency === 'Weekly') {
        installmentAmount = Math.round((principal / 52) * 100) / 100;
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        installmentAmount = Math.round((principal / 365) * 100) / 100;
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
      }

      // Check if schedule already exists for this date
      const existing = await prisma.loanSchedule.findFirst({
        where: {
          accountId,
          expectedDate: {
            gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
            lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1),
          },
        },
      });

      if (!existing) {
        installments.push({
          accountId,
          expectedDate: new Date(currentDate),
          expectedAmount: installmentAmount,
          paidAmount: 0,
          status: 'Pending',
          daysPastDue: 0,
        });
      }

      currentDate = nextDate;
    }

    if (installments.length > 0) {
      await prisma.loanSchedule.createMany({ data: installments });
    }

    return { generated: installments.length };
  } catch (error) {
    console.error('Auto-generate schedules error:', error);
    throw error;
  }
};

/**
 * Get staff collection alerts for today.
 * Returns installments due today or overdue that haven't been paid.
 */
export const getStaffCollectionAlerts = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const loanAccounts = await prisma.accountMapping.findMany({
      where: {
        mappedToId: userId,
        accountType: 'Loan',
        status: 'Active',
      },
      select: { id: true, accountNumber: true, customerName: true, current_balance: true },
    });

    if (loanAccounts.length === 0) return [];

    const accountIds = loanAccounts.map(a => a.id);

    const overdueInstallments = await prisma.loanSchedule.findMany({
      where: {
        accountId: { in: accountIds },
        expectedDate: { gte: thirtyDaysAgo, lte: today },
        status: { in: ['Pending', 'Partial'] },
      },
      orderBy: { expectedDate: 'asc' },
    });

    // Build a map of account id -> account info
    const accountMap = {};
    for (const a of loanAccounts) {
      accountMap[a.id] = a;
    }

    const alerts = [];
    for (const inst of overdueInstallments) {
      const acct = accountMap[inst.accountId];
      const dueDate = new Date(inst.expectedDate);
      dueDate.setHours(0, 0, 0, 0);
      const dpd = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = inst.expectedAmount - inst.paidAmount;

      alerts.push({
        scheduleId: inst.id,
        accountNumber: acct?.accountNumber || 'N/A',
        customerName: acct?.customerName || 'N/A',
        currentBalance: acct?.current_balance || 0,
        expectedDate: inst.expectedDate,
        expectedAmount: inst.expectedAmount,
        paidAmount: inst.paidAmount,
        remaining: Math.max(0, remaining),
        dpd,
        status: inst.status,
        severity: dpd >= 30 ? 'high' : dpd >= 7 ? 'medium' : 'low',
      });
    }

    // Sort by DPD descending (most urgent first)
    alerts.sort((a, b) => b.dpd - a.dpd);

    return alerts;
  } catch (error) {
    console.error('Collection alerts error:', error);
    return [];
  }
};
