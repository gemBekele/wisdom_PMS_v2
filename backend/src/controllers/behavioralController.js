import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';

// Helper: Calculate behavioral score
const calculateBehavioralScore = (competencies) => {
  const items = Array.isArray(competencies) ? competencies : Object.values(competencies || {});
  if (items.length === 0) return 0;

  const defaultWeight = 100 / items.length;
  let weightedScore = 0;
  let totalWeight = 0;

  for (const comp of items) {
    const score = Number(comp?.score ?? 0);
    const maxScore = Number(comp?.maxScore ?? 5) || 5;
    const weight = Number(comp?.weight ?? defaultWeight);
    if (!Number.isFinite(score) || !Number.isFinite(weight) || weight <= 0) continue;
    weightedScore += (Math.min(score, maxScore) / maxScore) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  // Convert to the 0-15 behavioral scale.
  return Math.round(((weightedScore / totalWeight) * 15) * 100) / 100;
};

// Helper: Build approval chain
const buildBehavioralApprovalChain = async (user) => {
  const chain = [];

  if (user.role === 'staff' || user.role === 'supervisor') {
    const bm = await prisma.user.findFirst({
      where: { branch_code: user.branch_code, position: 'Branch_Manager', isActive: true }
    });
    if (bm) chain.push({ approverId: bm.id, role: 'Branch Manager', status: 'Pending' });
  }

  if (user.role === 'branchManager') {
    const am = await prisma.user.findFirst({
      where: { areaId: user.areaId, role: 'areaManager', isActive: true }
    });
    if (am) chain.push({ approverId: am.id, role: 'Area Manager', status: 'Pending' });
  }

  return chain;
};

// @desc    Create behavioral evaluation
// @route   POST /api/behavioral
// @access  Private (Supervisors)
export const createBehavioralEvaluation = asyncHandler(async (req, res) => {
  const { evaluatedUserId, period, year, month, quarter, competencies, overallComments } = req.body;

  if (!evaluatedUserId) {
    return res.status(400).json({ success: false, message: 'evaluatedUserId is required' });
  }

  const validPeriods = ['Monthly', 'Quarterly', 'Annual'];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ success: false, message: 'period must be Monthly, Quarterly, or Annual' });
  }
  if (period === 'Monthly' && !month) {
    return res.status(400).json({ success: false, message: 'month is required for Monthly evaluations' });
  }
  if (period === 'Quarterly' && !quarter) {
    return res.status(400).json({ success: false, message: 'quarter is required for Quarterly evaluations' });
  }
  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return res.status(400).json({ success: false, message: 'year must be a valid year' });
  }
  const competencyItems = Array.isArray(competencies) ? competencies : Object.values(competencies || {});
  if (competencyItems.length === 0 || competencyItems.some(c => !Number.isFinite(Number(c?.score)))) {
    return res.status(400).json({ success: false, message: 'At least one competency with a numeric score is required' });
  }

  if (evaluatedUserId === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot evaluate yourself' });
  }
  const evaluatedUser = await prisma.user.findUnique({
    where: { id: evaluatedUserId },
    select: { id: true, branchId: true, branch_code: true, isActive: true },
  });
  if (!evaluatedUser || !evaluatedUser.isActive) {
    return res.status(400).json({ success: false, message: 'Evaluated user not found or inactive' });
  }
  if (req.user.role !== 'admin' && req.user.branchId && evaluatedUser.branchId && evaluatedUser.branchId !== req.user.branchId) {
    return res.status(403).json({ success: false, message: 'You can only evaluate users in your branch' });
  }

  const totalScore = calculateBehavioralScore(competencies);
  await buildBehavioralApprovalChain(req.user);

  const evaluation = await prisma.$transaction(async (tx) => {
    const newEval = await tx.behavioralEvaluation.create({
      data: {
        evaluatedUserId,
        evaluatedById: req.user.id,
        branchId: req.user.branchId,
        period,
        year: parsedYear,
        month: month ? parseInt(month) : null,
        quarter: quarter ? parseInt(quarter) : null,
        competencies,
        totalScore,
        overallComments,
        approvalStatus: 'Draft'
      }
    });

    return newEval;
  });

  await logAudit(
    req.user.id,
    'Behavioral Evaluation',
    'Evaluation',
    evaluation.id,
    `Behavioral Evaluation`,
    `Created behavioral evaluation`,
    req
  );

  res.status(201).json({
    success: true,
    data: { ...evaluation, _id: evaluation.id },
  });
});

// @desc    Get behavioral evaluations
// @route   GET /api/behavioral
// @access  Private
export const getBehavioralEvaluations = asyncHandler(async (req, res) => {
  const { evaluatedUserId, branchId, period, year, approvalStatus } = req.query;

  const where = {};
  const role = req.user.role;

  if (role === 'staff') {
    where.evaluatedUserId = req.user.id;
  } else if (evaluatedUserId) {
    where.evaluatedUserId = evaluatedUserId;
  }

  if (role === 'admin') {
    if (branchId) where.branchId = branchId;
  } else if (role === 'areaManager' && req.user.areaId) {
    where.branch = { areaId: req.user.areaId };
  } else if (req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  if (period) where.period = period;
  if (year) where.year = parseInt(year);
  if (approvalStatus) where.approvalStatus = approvalStatus;

  const evaluations = await prisma.behavioralEvaluation.findMany({
    where,
    include: {
      evaluatedUser: { select: { id: true, name: true, employeeId: true, role: true } },
      evaluatedBy: { select: { id: true, name: true, role: true } },
      branch: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: evaluations.length,
    data: evaluations.map(e => ({
      ...e,
      _id: e.id,
      evaluatedUserId: e.evaluatedUser ? { ...e.evaluatedUser, _id: e.evaluatedUser.id } : null,
      evaluatedBy: e.evaluatedBy ? { ...e.evaluatedBy, _id: e.evaluatedBy.id } : null,
      branchId: e.branch ? { ...e.branch, _id: e.branch.id } : null,
    })),
  });
});

// @desc    Approve behavioral evaluation
// @route   PUT /api/behavioral/:id/approve
// @access  Private (Approvers)
export const approveBehavioralEvaluation = asyncHandler(async (req, res) => {
  const { status, comments } = req.body;

  const evaluation = await prisma.behavioralEvaluation.findUnique({
    where: { id: req.params.id },
  });

  if (!evaluation) {
    return res.status(404).json({
      success: false,
      message: 'Evaluation not found',
    });
  }

  if (evaluation.evaluatedById === req.user.id) {
    return res.status(403).json({ success: false, message: 'You cannot approve your own evaluation' });
  }
  if (req.user.role !== 'admin' && req.user.branchId && evaluation.branchId !== req.user.branchId) {
    return res.status(403).json({ success: false, message: 'Evaluation is outside your branch' });
  }
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
  }

  let updateData = { approvalStatus: status };
  if (status === 'Approved') {
    updateData.isLocked = true;
    updateData.lockedAt = new Date();
  }

  await prisma.behavioralEvaluation.update({
    where: { id: evaluation.id },
    data: updateData
  });

  await logAudit(
    req.user.id,
    'Approval',
    'Evaluation',
    evaluation.id,
    'Behavioral Evaluation',
    `${status} behavioral evaluation`,
    req
  );

  const finalEval = await prisma.behavioralEvaluation.findUnique({
    where: { id: req.params.id },
  });

  res.status(200).json({
    success: true,
    data: { ...finalEval, _id: finalEval.id },
  });
});
