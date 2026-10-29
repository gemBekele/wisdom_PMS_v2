import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';

// Helper: Calculate behavioral score
const calculateBehavioralScore = (competencies) => {
  let totalScore = 0;
  const maxScore = 5; // Max score per competency

  Object.values(competencies).forEach(comp => {
    if (comp.score && comp.weight) {
      const normalizedScore = (comp.score / maxScore) * 100;
      totalScore += (normalizedScore * comp.weight) / 100;
    }
  });

  // Convert to 15% scale
  return (totalScore / 100) * 15;
};

// Helper: Build approval chain
const buildBehavioralApprovalChain = async (user) => {
  const chain = [];

  if (user.role === 'staff' || user.role === 'supervisor') {
    const bm = await prisma.user.findFirst({
      where: { branch_code: user.branch_code, position: 'Branch Manager', isActive: true }
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

  const totalScore = calculateBehavioralScore(competencies);
  const approvalChainData = await buildBehavioralApprovalChain(req.user);

  const evaluation = await prisma.$transaction(async (tx) => {
    const newEval = await tx.behavioralEvaluation.create({
      data: {
        evaluatedUserId,
        evaluatedById: req.user.id,
        branchId: req.user.branchId,
        period,
        year: parseInt(year),
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

  if (req.user.role === 'staff') {
    where.evaluatedUserId = req.user.id;
  } else if (evaluatedUserId) {
    where.evaluatedUserId = evaluatedUserId;
  }

  if (branchId) where.branchId = branchId;
  else if (req.user.branchId) where.branchId = req.user.branchId;

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
