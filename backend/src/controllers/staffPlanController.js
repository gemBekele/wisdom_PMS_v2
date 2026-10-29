import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { KPI_CATEGORY_TO_ENUM } from '../utils/prismaHelpers.js';

// @desc    Get all staff plans
// @route   GET /api/staff-plans
// @access  Private
export const getStaffPlans = asyncHandler(async (req, res) => {
  const { userId, branch_code, kpi_category, period, branchPlanId } = req.query;

  const where = {};

  // Role-based filtering
  if (req.user.role === 'admin' || req.user.role === 'areaManager') {
    // These roles can see all (or filtered by others)
  } else if (req.user.role === 'branchManager' || req.user.role === 'supervisor') {
    // Branch/Line/Sub-team managers see plans for their branch
    where.branch_code = req.user.branch_code;
  } else {
    // Staff see only their own plans
    where.userId = req.user.id;
  }

  // Apply additional filters
  if (userId) where.userId = userId;
  if (branch_code) where.branch_code = branch_code.toUpperCase().trim();
  if (kpi_category) where.kpi_category = KPI_CATEGORY_TO_ENUM[kpi_category] || kpi_category;
  if (period) where.period = period;
  if (branchPlanId) where.branchPlanId = branchPlanId;

  const staffPlans = await prisma.staffPlan.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, position: true, employeeId: true } },
      branchPlan: { select: { id: true, branch_code: true, kpi_category: true, period: true, target_value: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: staffPlans.length,
    data: staffPlans.map(sp => ({
      ...sp,
      _id: sp.id,
      userId: sp.user ? { ...sp.user, _id: sp.user.id } : null,
      branchPlanId: sp.branchPlan ? { ...sp.branchPlan, _id: sp.branchPlan.id } : null,
    })),
  });
});

// @desc    Get single staff plan
// @route   GET /api/staff-plans/:id
// @access  Private
export const getStaffPlan = asyncHandler(async (req, res) => {
  const staffPlan = await prisma.staffPlan.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, position: true, employeeId: true } },
      branchPlan: { select: { id: true, branch_code: true, kpi_category: true, period: true, target_value: true } },
    },
  });

  if (!staffPlan) {
    return res.status(404).json({
      success: false,
      message: 'Staff plan not found',
    });
  }

  // Check authorization
  const isAuthorized =
    req.user.role === 'admin' ||
    req.user.role === 'branchManager' ||
    staffPlan.userId === req.user.id;

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this staff plan',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      ...staffPlan,
      _id: staffPlan.id,
      userId: staffPlan.user ? { ...staffPlan.user, _id: staffPlan.user.id } : null,
      branchPlanId: staffPlan.branchPlan ? { ...staffPlan.branchPlan, _id: staffPlan.branchPlan.id } : null,
    },
  });
});
