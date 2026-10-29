import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { cascadeBranchPlan } from '../utils/planCascade.js';
import { normalizePeriod } from '../utils/periodUtils.js';
import {
  calculateBranchDepositGrowth,
  calculateStaffCollectionRate,
  calculateParMetrics,
  buildTaskAchievementFilter,
} from '../utils/performanceCalculator.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { KPI_CATEGORY_TO_ENUM, CBS_PRODUCT_TO_CATEGORY } from '../utils/prismaHelpers.js';

// @desc    Create plan manually
// @route   POST /api/plans
// @access  Private (Admin)
export const createPlan = asyncHandler(async (req, res) => {
  const { branch_code, kpi_category, period: rawPeriod, target_value, target_count, product_category, monthly_plan, target_type: rawTargetType } = req.body;
  const period = normalizePeriod(rawPeriod);
  const target_type = rawTargetType === 'Numeric' ? 'incremental' : (rawTargetType || 'incremental');

  // Validate required fields
  if (!branch_code || !kpi_category || !period || !target_value) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: branch_code, kpi_category, period, target_value',
    });
  }

  // Find branchId from branch_code
  const branch = await prisma.branch.findUnique({
    where: { code: branch_code.toUpperCase().trim() }
  });

  if (!branch) {
    return res.status(404).json({
      success: false,
      message: `Branch with code ${branch_code} not found`,
    });
  }

  // Convert KPI category string to enum
  const kpiEnum = KPI_CATEGORY_TO_ENUM[kpi_category] || kpi_category;

  // Check if plan already exists (include product_category if provided)
  const existingWhere = {
    branch_code: branch_code.toUpperCase().trim(),
    kpi_category: kpiEnum,
    period,
    status: { in: ['Draft', 'Active'] },
  };
  if (product_category) existingWhere.product_category = product_category;

  const existingPlan = await prisma.plan.findFirst({ where: existingWhere });

  if (existingPlan) {
    return res.status(400).json({
      success: false,
      message: 'A plan already exists for this branch, KPI category, period, and product',
    });
  }

  // Create plan
  const plan = await prisma.plan.create({
    data: {
      branch_code: branch_code.toUpperCase().trim(),
      branchId: branch.id,
      kpi_category: kpiEnum,
      period,
      target_value: parseFloat(target_value),
      target_count: target_count ? parseInt(target_count) : undefined,
      product_category: product_category || null,
      monthly_plan: monthly_plan || undefined,
      target_type: target_type || 'incremental',
      status: 'Active',
      createdById: req.user.id,
    },
  });

  // Cascade to staff
  const cascadeResult = await cascadeBranchPlan(plan);

  await logAudit(
    req.user.id,
    'Plan Created',
    'Plan',
    plan.id,
    `${kpi_category} - ${branch_code}`,
    `Created plan: ${kpi_category} for ${branch_code}`,
    req
  );

  res.status(201).json({
    success: true,
    message: 'Plan created and cascaded successfully',
    data: { ...plan, _id: plan.id },
    cascade: cascadeResult,
  });
});

// @desc    Upload plan file and cascade
// @route   POST /api/plans/upload
// @access  Private (Admin)
export const uploadPlan = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a plan file',
    });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false
    });

    data = data.map((row) => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = String(key).toLowerCase().trim().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = row[key] ? String(row[key]).trim() : '';
      });
      return normalizedRow;
    });

    if (!data || data.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File is empty or invalid',
      });
    }

    const results = {
      created: 0,
      errors: [],
      processed: 0,
    };

    const validKpiCategories = [
      'Loan Saving Deposit',
      'Michu Current Saving',
      'Gihon Regular Saving',
      'Mothers Saving',
      'Young Womens Saving',
      'Elders Saving',
      'Children Saving',
      'Fixed Time Deposit',
      'Premium Saving Deposit',
      'Special Saving',
      'Segment Deposit',
      'Wadiah IFB Deposit',
    ];

    const validPeriods = ['FY-2026-27', '2025-H2', 'Q4-2025', 'December-2025', '2025'];

    for (const [index, row] of data.entries()) {
      try {
        results.processed++;

        const branch_code = (row.branch_code || row.branchcode || '').toUpperCase().trim();
        const kpi_category = row.kpi_category || row.kpicategory || '';
        const period = normalizePeriod(row.period) || '';
        const target_value = parseFloat(row.target_value || row.targetvalue || 0);
        const target_count = row.target_count || row.targetcount ? parseInt(row.target_count || row.targetcount) : undefined;
        const product_category = row.product_category || row.productcategory || undefined;

        let monthly_plan = undefined;
        if (row.monthly_plan || row.monthlyplan) {
          try {
            monthly_plan = JSON.parse(row.monthly_plan || row.monthlyplan);
          } catch { }
        }

        if (!branch_code || !kpi_category || !period || isNaN(target_value) || target_value <= 0) {
          results.errors.push(`Row ${index + 2}: Missing or invalid required fields.`);
          continue;
        }

        if (!validKpiCategories.includes(kpi_category)) {
          results.errors.push(`Row ${index + 2}: Invalid kpi_category: "${kpi_category}"`);
          continue;
        }

        if (!validPeriods.includes(period)) {
          results.errors.push(`Row ${index + 2}: Invalid period: "${period}"`);
          continue;
        }

        // Find branchId
        const branch = await prisma.branch.findUnique({
          where: { code: branch_code }
        });

        if (!branch) {
          results.errors.push(`Row ${index + 2}: Branch with code ${branch_code} not found`);
          continue;
        }

        const kpiEnum = KPI_CATEGORY_TO_ENUM[kpi_category] || kpi_category;

        // Check if plan already exists (include product_category if provided)
        const existingWhere = {
          branch_code,
          kpi_category: kpiEnum,
          period,
          status: { in: ['Draft', 'Active'] },
        };
        if (product_category) existingWhere.product_category = product_category;

        const existingPlan = await prisma.plan.findFirst({ where: existingWhere });

        if (existingPlan) {
          results.errors.push(`Row ${index + 2}: Plan already exists`);
          continue;
        }

        // Create plan
        const plan = await prisma.plan.create({
          data: {
            branch_code,
            branchId: branch.id,
            kpi_category: kpiEnum,
            period,
            target_value,
            target_count: target_count || undefined,
            product_category: product_category || null,
            monthly_plan: monthly_plan || undefined,
            target_type: 'incremental',
            status: 'Active',
            createdById: req.user.id,
          },
        });

        // Cascade to staff
        try {
          await cascadeBranchPlan(plan);
          results.created++;
        } catch (cascadeError) {
          await prisma.plan.delete({ where: { id: plan.id } });
          results.errors.push(`Row ${index + 2}: Cascade failed - ${cascadeError.message}`);
        }
      } catch (error) {
        results.errors.push(`Row ${index + 2}: Error - ${error.message}`);
      }
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    await logAudit(
      req.user.id,
      'Plan Upload',
      'Plan',
      null,
      'Bulk Plan Upload',
      `Uploaded ${results.created} plans`,
      req
    );

    res.status(201).json({
      success: true,
      message: `Successfully created ${results.created} plans`,
      data: results,
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw error;
  }
});

// @desc    Get all plans
// @route   GET /api/plans
// @access  Private
export const getPlans = asyncHandler(async (req, res) => {
  const { branch_code, kpi_category, period, status, product_category } = req.query;

  const where = {};

  if (req.user.role !== 'admin' && req.user.branch_code) {
    where.branch_code = req.user.branch_code;
  }

  if (branch_code) where.branch_code = branch_code.toUpperCase().trim();
  if (kpi_category) where.kpi_category = KPI_CATEGORY_TO_ENUM[kpi_category] || kpi_category;
  if (period) where.period = period;
  if (status) where.status = status;
  if (product_category) where.product_category = product_category;

  const plans = await prisma.plan.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ product_category: 'asc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({
    success: true,
    count: plans.length,
    data: plans.map(p => ({ ...p, _id: p.id })),
  });
});

// @desc    Get single plan
// @route   GET /api/plans/:id
// @access  Private
export const getPlan = asyncHandler(async (req, res) => {
  const plan = await prisma.plan.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { ...plan, _id: plan.id },
  });
});

// @desc    Update plan
// @route   PUT /api/plans/:id
// @access  Private (Admin)
export const updatePlan = asyncHandler(async (req, res) => {
  let plan = await prisma.plan.findUnique({ where: { id: req.params.id } });

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found',
    });
  }

  const targetChanged = req.body.target_value && parseFloat(req.body.target_value) !== plan.target_value;

  const updateData = { ...req.body };
  if (updateData.target_value) updateData.target_value = parseFloat(updateData.target_value);
  if (updateData.kpi_category) updateData.kpi_category = KPI_CATEGORY_TO_ENUM[updateData.kpi_category] || updateData.kpi_category;

  plan = await prisma.plan.update({
    where: { id: req.params.id },
    data: updateData,
  });

  if (updateData.target_count) updateData.target_count = parseInt(updateData.target_count);
  if (updateData.monthly_plan) updateData.monthly_plan = updateData.monthly_plan;

  if (targetChanged) {
    await cascadeBranchPlan(plan);
  }

  await logAudit(
    req.user.id,
    'Plan Update',
    'Plan',
    plan.id,
    `${plan.kpi_category} - ${plan.branch_code}`,
    `Updated plan`,
    req
  );

  res.status(200).json({
    success: true,
    data: { ...plan, _id: plan.id },
  });
});

const DEPOSIT_TASK_TYPES = [
  'Loan_Saving_Deposit', 'Michu_Current_Saving',
  'Gihon_Regular_Saving', 'Mothers_Saving', 'Young_Womens_Saving',
  'Elders_Saving', 'Children_Saving', 'Fixed_Time_Deposit',
  'Premium_Saving_Deposit', 'Special_Saving', 'Segment_Deposit', 'Wadiah_IFB_Deposit',
];

const KPI_TASK_TYPES = {
  'Deposit_Mobilization': DEPOSIT_TASK_TYPES,
};

// @desc    Get plans with actual achievement
// @route   GET /api/plans/achievement?period=xxx
// @access  Private (Admin)
export const getPlansAchievement = asyncHandler(async (req, res) => {
  const { period } = req.query;
  if (!period) {
    return res.status(400).json({ success: false, message: 'Period query parameter is required' });
  }

  const where = { period, status: 'Active' };
  if (req.user.role !== 'admin' && req.user.branch_code) {
    where.branch_code = req.user.branch_code;
  }

  const plans = await prisma.plan.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ branch_code: 'asc' }, { kpi_category: 'asc' }],
  });

  const enrichedPlans = [];
  for (const plan of plans) {
    const branch = await prisma.branch.findUnique({ where: { code: plan.branch_code } });
    if (!branch) {
      enrichedPlans.push({ ...plan, actual: 0, achievementPercent: 0 });
      continue;
    }

    const staffList = await prisma.user.findMany({
      where: { branchId: branch.id, isActive: true, role: { in: ['staff', 'supervisor'] } },
    });
    const staffIds = staffList.map(s => s.id);
    let actual = 0;

    if (plan.product_category) {
      // Product-level plan: calculate growth only for accounts in this product category
      const productCat = plan.product_category;
      const branchAccounts = await prisma.accountMapping.findMany({
        where: { branchId: branch.id, status: 'Active', current_balance: { gte: 1000 } },
      });
      const juneBaselines = await prisma.juneBalance.findMany({ where: { is_active: true } });
      let productGrowth = 0;
      for (const acct of branchAccounts) {
        const acctProductCat = CBS_PRODUCT_TO_CATEGORY[acct.product] || null;
        if (acctProductCat !== productCat) continue;
        const baseline = juneBaselines.find(j => j.account_id === acct.accountNumber || j.accountNumber === acct.accountNumber);
        const jb = baseline?.june_balance || 0;
        const growth = (acct.current_balance || 0) - jb;
        if (growth > 0) productGrowth += growth;
      }
      actual = productGrowth;
    } else if (plan.kpi_category === 'Deposit_Mobilization') {
      actual = await calculateBranchDepositGrowth(plan.branch_code, period);
    } else if (plan.kpi_category === 'Collection_Rate') {
      let totalRate = 0;
      let withData = 0;
      for (const sid of staffIds) {
        const cd = await calculateStaffCollectionRate(sid);
        if (cd.expected > 0) { totalRate += cd.percent; withData++; }
      }
      actual = withData > 0 ? Math.round(totalRate / withData) : 0;
    } else if (plan.kpi_category === 'Portfolio_Quality') {
      const loanAccounts = await prisma.accountMapping.findMany({
        where: { branchId: branch.id, accountType: 'Loan', status: 'Active' },
        select: { id: true },
      });
      if (loanAccounts.length > 0) {
        const parMetrics = await calculateParMetrics(loanAccounts.map(a => a.id));
        actual = parMetrics.totalPortfolio > 0 ? Math.round(100 - parMetrics.par90Ratio) : 100;
      }
    } else {
      const taskTypes = KPI_TASK_TYPES[plan.kpi_category] || [];
      if (taskTypes.length > 0) {
        const dualGateFilter = await buildTaskAchievementFilter({ taskTypes });
        actual = await prisma.dailyTask.count({
          where: {
            ...dualGateFilter,
            submittedById: { in: staffIds },
          },
        });
      }
    }

    const achievementPercent = plan.target_value > 0 ? Math.round((actual / plan.target_value) * 100) : 0;

    enrichedPlans.push({
      ...plan,
      _id: plan.id,
      actual,
      achievementPercent,
    });
  }

  res.status(200).json({
    success: true,
    count: enrichedPlans.length,
    data: enrichedPlans,
  });
});
