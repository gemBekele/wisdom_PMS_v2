import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { TASK_TYPE_MAP, KPI_CATEGORY_MAP, POSITION_MAP } from '../utils/prismaHelpers.js';
import { normalizePeriod } from '../utils/periodUtils.js';

const HARDCODED_TASK_TYPES = Object.entries(TASK_TYPE_MAP).map(([value, label]) => ({ value, label }));

const HARDCODED_TASK_TYPE_TO_KPI = {
  'Loan_Saving_Deposit': 'Deposit_Mobilization',
  'Michu_Current_Saving': 'Deposit_Mobilization',
  'Gihon_Regular_Saving': 'Deposit_Mobilization',
  'Mothers_Saving': 'Deposit_Mobilization',
  'Young_Womens_Saving': 'Deposit_Mobilization',
  'Elders_Saving': 'Deposit_Mobilization',
  'Children_Saving': 'Deposit_Mobilization',
  'Fixed_Time_Deposit': 'Deposit_Mobilization',
  'Premium_Saving_Deposit': 'Deposit_Mobilization',
  'Special_Saving': 'Deposit_Mobilization',
  'Segment_Deposit': 'Deposit_Mobilization',
  'Wadiah_IFB_Deposit': 'Deposit_Mobilization',
};

export const getConfig = asyncHandler(async (req, res) => {
  const activePeriods = await prisma.plan.findMany({
    where: { status: 'Active' },
    select: { period: true },
    distinct: ['period'],
    orderBy: { period: 'desc' }
  });

  const periodOptions = activePeriods.length > 0
    ? [...new Set(activePeriods.map(p => normalizePeriod(p.period)))]
    : ['FY-2026-27'];

  const positions = Object.entries(POSITION_MAP).map(([value, label]) => ({ value, label }));
  const kpiCategories = Object.entries(KPI_CATEGORY_MAP).map(([value, label]) => ({ value, label }));

  const productPlanCategories = await prisma.plan.findMany({
    where: { status: 'Active', product_category: { not: null } },
    select: { product_category: true },
    distinct: ['product_category'],
  });

  const kpiPlanCategories = await prisma.plan.findMany({
    where: { status: 'Active', product_category: null },
    select: { kpi_category: true },
    distinct: ['kpi_category'],
  });

  let taskTypes;
  let taskTypeToKpiMap;

  if (productPlanCategories.length > 0 || kpiPlanCategories.length > 0) {
    taskTypes = [];
    taskTypeToKpiMap = {};

    for (const pc of productPlanCategories) {
      const label = pc.product_category.replace(/_/g, ' ');
      taskTypes.push({ value: pc.product_category, label });
      taskTypeToKpiMap[pc.product_category] = 'Deposit_Mobilization';
    }

    for (const kc of kpiPlanCategories) {
      const label = kc.kpi_category.replace(/_/g, ' ');
      if (!taskTypes.some(t => t.value === kc.kpi_category)) {
        taskTypes.push({ value: kc.kpi_category, label });
        taskTypeToKpiMap[kc.kpi_category] = kc.kpi_category;
      }
    }
  } else {
    taskTypes = HARDCODED_TASK_TYPES;
    taskTypeToKpiMap = HARDCODED_TASK_TYPE_TO_KPI;
  }

  res.status(200).json({
    success: true,
    data: {
      taskTypes,
      kpiCategories,
      positions,
      periodOptions,
      taskTypeToKpiMap,
    }
  });
});
