import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { calculateKPIScore, calculateBranchKPIScore, calculateRating, calculateIncrementalGrowth, calculateStaffCollectionRate, calculateParMetrics } from '../utils/performanceCalculator.js';

// @desc    Calculate performance score
// @route   POST /api/performance/calculate
// @access  Private
export const calculatePerformance = asyncHandler(async (req, res) => {
  const { userId, period } = req.body;
  const targetUserId = userId || req.user.id;
  const branch_code = req.user.branch_code;

  if (!period) {
    return res.status(400).json({
      success: false,
      message: 'Period is required',
    });
  }

  // Determine user role for KPI calculation (BM = branch-level)
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  const isBranchManager = targetUser?.role === 'branchManager';

  let kpiResult;
  if (isBranchManager) {
    kpiResult = await calculateBranchKPIScore(branch_code, period);
  } else {
    kpiResult = await calculateKPIScore(targetUserId, branch_code, period);
  }

  // Get behavioral score (15% weight) — only if period is a valid EvaluationPeriod
  const VALID_EVAL_PERIODS = ['Monthly', 'Quarterly', 'Annual'];
  let behavioralEval = null;
  if (VALID_EVAL_PERIODS.includes(period)) {
    behavioralEval = await prisma.behavioralEvaluation.findFirst({
      where: {
        evaluatedUserId: targetUserId,
        period,
        approvalStatus: 'Approved',
      },
    });
  }

  const behavioralScore = behavioralEval?.totalScore || 0;

  // Calculate final score
  const finalScore = kpiResult.kpiTotalScore + behavioralScore;
  const ratingEnum = calculateRating(finalScore);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Find existing score or create new one
  let performanceScore = await prisma.performanceScore.findFirst({
    where: {
      userId: targetUserId,
      period,
      year,
      month,
    },
  });

  const scoreData = {
    kpiScores: kpiResult.kpiScores,
    kpiTotalScore: kpiResult.kpiTotalScore,
    behavioralScore,
    behavioralEvaluationId: behavioralEval?.id || null,
    finalScore,
    rating: ratingEnum,
    status: 'Calculated',
  };

  if (performanceScore) {
    performanceScore = await prisma.performanceScore.update({
      where: { id: performanceScore.id },
      data: { ...scoreData, updatedAt: now },
    });
  } else {
    performanceScore = await prisma.performanceScore.create({
      data: {
        userId: targetUserId,
        branchId: targetUser?.branchId,
        period,
        year,
        month,
        ...scoreData,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: { ...performanceScore, _id: performanceScore.id },
  });
});

// Since upsert above might fail if the compound index isn't EXACTLY matching, 
// let's provide a safer implementation for calculatePerformance

export const safeCalculatePerformance = asyncHandler(async (req, res) => {
  const { userId, period } = req.body;
  const targetUserId = userId || req.user.id;
  const branch_code = req.user.branch_code;

  if (!period) {
    return res.status(400).json({
      success: false,
      message: 'Period is required',
    });
  }

  // Determine user role for KPI calculation (BM = branch-level)
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  const isBranchManager = targetUser?.role === 'branchManager';

  let kpiResult;
  if (isBranchManager) {
    kpiResult = await calculateBranchKPIScore(branch_code, period);
  } else {
    kpiResult = await calculateKPIScore(targetUserId, branch_code, period);
  }

  // Get behavioral score (15% weight) — only if period is a valid EvaluationPeriod
  const VALID_EVAL_PERIODS = ['Monthly', 'Quarterly', 'Annual'];
  let behavioralEval = null;
  if (VALID_EVAL_PERIODS.includes(period)) {
    behavioralEval = await prisma.behavioralEvaluation.findFirst({
      where: {
        evaluatedUserId: targetUserId,
        period,
        approvalStatus: 'Approved',
      },
    });
  }

  const behavioralScore = behavioralEval?.totalScore || 0;
  const finalScore = kpiResult.kpiTotalScore + behavioralScore;
  const ratingEnum = calculateRating(finalScore);

  const existingScore = await prisma.performanceScore.findFirst({
    where: {
      userId: targetUserId,
      period: period,
    }
  });

  let performanceScore;
  if (existingScore) {
    performanceScore = await prisma.performanceScore.update({
      where: { id: existingScore.id },
      data: {
        kpiScores: kpiResult.kpiScores,
        kpiTotalScore: kpiResult.kpiTotalScore,
        behavioralScore,
        behavioralEvaluationId: behavioralEval?.id || null,
        finalScore,
        rating: ratingEnum,
        status: 'Calculated',
      }
    });
  } else {
    performanceScore = await prisma.performanceScore.create({
      data: {
        userId: targetUserId,
        branchId: targetUser.branchId,
        period,
        year: new Date().getFullYear(),
        kpiScores: kpiResult.kpiScores,
        kpiTotalScore: kpiResult.kpiTotalScore,
        behavioralScore,
        behavioralEvaluationId: behavioralEval?.id || null,
        finalScore,
        rating: ratingEnum,
        status: 'Calculated',
      }
    });
  }

  res.status(200).json({
    success: true,
    data: { ...performanceScore, _id: performanceScore.id },
  });
});

// @desc    Get performance scores
// @route   GET /api/performance
// @access  Private
export const getPerformanceScores = asyncHandler(async (req, res) => {
  const { userId, branchId, period } = req.query;

  const where = {};

  if (req.user.role === 'staff') {
    where.userId = req.user.id;
  } else if (userId) {
    where.userId = userId;
  } else if (branchId) {
    where.branchId = branchId;
  } else if (req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  if (period) where.period = period;

  const scores = await prisma.performanceScore.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, employeeId: true, role: true, position: true } },
      branch: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Backward compatibility mapping
  const mappedScores = scores.map(s => ({
    ...s,
    _id: s.id,
    userId: s.user ? { ...s.user, _id: s.user.id } : null,
    branchId: s.branch ? { ...s.branch, _id: s.branch.id } : null,
  }));

  res.status(200).json({
    success: true,
    count: mappedScores.length,
    data: mappedScores,
  });
});

// @desc    Get single performance score
// @route   GET /api/performance/:id
// @access  Private
export const getPerformanceScore = asyncHandler(async (req, res) => {
  const score = await prisma.performanceScore.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, employeeId: true, role: true } },
      branch: { select: { id: true, name: true, code: true } },
      behavioralEvaluation: true,
    },
  });

  if (!score) {
    return res.status(404).json({
      success: false,
      message: 'Performance score not found',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      ...score,
      _id: score.id,
      userId: score.user ? { ...score.user, _id: score.user.id } : null,
      branchId: score.branch ? { ...score.branch, _id: score.branch.id } : null,
    },
  });
});

// @desc    Get team standings / leaderboard
// @route   GET /api/performance/team-standings
// @access  Private
export const getTeamStandings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, branchId: true, branch_code: true, teamId: true },
  });

  let memberIds = [];

  if (user.role === 'branchManager') {
    // BM sees all teams in their branch
    const teams = await prisma.team.findMany({
      where: { branchId: user.branchId, isActive: true },
      select: { id: true, name: true, code: true, managerId: true },
    });
    const allMemberIds = await prisma.user.findMany({
      where: { branchId: user.branchId, isActive: true, role: 'staff' },
      select: { id: true },
    });
    memberIds = allMemberIds.map(u => u.id);

    // Rank teams by average achievement
    const teamStandings = [];
    for (const team of teams) {
      const tmIds = (await prisma.user.findMany({
        where: { teamId: team.id, isActive: true },
        select: { id: true },
      })).map(u => u.id);

      let totalScore = 0;
      let count = 0;
      for (const mid of tmIds) {
        const growth = await calculateIncrementalGrowth(mid, user.branch_code, 'Deposit_Mobilization', 'Monthly');
        const plan = await prisma.staffPlan.findFirst({
          where: { userId: mid, status: 'Active', kpi_category: 'Deposit_Mobilization' },
          select: { individual_target: true },
        });
        const pct = plan?.individual_target > 0 ? (growth / plan.individual_target) * 100 : 0;
        totalScore += pct;
        count++;
      }
      teamStandings.push({
        teamId: team.id,
        teamName: team.name,
        teamCode: team.code,
        managerId: team.managerId,
        memberCount: tmIds.length,
        averageAchievement: count > 0 ? Math.round(totalScore / count) : 0,
      });
    }
    teamStandings.sort((a, b) => b.averageAchievement - a.averageAchievement);
    teamStandings.forEach((t, i) => t.rank = i + 1);

    return res.status(200).json({
      success: true,
      data: { view: 'branch', teamStandings },
    });
  }

  // For staff and supervisor — find their team
  if (user.role === 'supervisor') {
    // Supervisor sees supervisees
    const supervisees = await prisma.user.findMany({
      where: { supervisorId: userId, isActive: true },
      select: { id: true },
    });
    memberIds = supervisees.map(u => u.id);
    memberIds.push(userId); // include self
  } else if (user.teamId) {
    // Staff — get teammates
    const teammates = await prisma.user.findMany({
      where: { teamId: user.teamId, isActive: true },
      select: { id: true },
    });
    memberIds = teammates.map(u => u.id);
  } else {
    // Staff without team — fall back to supervisor's supervisees
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { supervisorId: true },
    });
    if (u?.supervisorId) {
      const supervisees = await prisma.user.findMany({
        where: { supervisorId: u.supervisorId, isActive: true },
        select: { id: true },
      });
      memberIds = supervisees.map(s => s.id);
    }
  }

  if (memberIds.length === 0) {
    return res.status(200).json({
      success: true,
      data: { view: 'team', members: [], yourRank: null, totalMembers: 0 },
    });
  }

  // Calculate performance for each member
  const members = [];
  for (const mid of memberIds) {
    const u = await prisma.user.findUnique({
      where: { id: mid },
      select: { id: true, name: true, employeeId: true, position: true },
    });
    if (!u) continue;

    const mappedAccounts = await prisma.accountMapping.count({
      where: { mappedToId: mid, status: 'Active' },
    });

    const depositGrowth = await calculateIncrementalGrowth(mid, user.branch_code, 'Deposit_Mobilization', 'Monthly');

    const depositPlan = await prisma.staffPlan.findFirst({
      where: { userId: mid, status: 'Active', kpi_category: 'Deposit_Mobilization' },
      select: { individual_target: true },
    });
    const depositPercent = depositPlan?.individual_target > 0 ? (depositGrowth / depositPlan.individual_target) * 100 : 0;

    const collectionRate = await calculateStaffCollectionRate(mid);

    const loanAccounts = await prisma.accountMapping.findMany({
      where: { mappedToId: mid, accountType: 'Loan', status: 'Active' },
      select: { id: true },
    });
    let portfolioQuality = 100;
    if (loanAccounts.length > 0) {
      const par = await calculateParMetrics(loanAccounts.map(a => a.id));
      portfolioQuality = par.totalPortfolio > 0 ? 100 - par.par90Ratio : 100;
    }

    // Composite score: deposit (40%) + collection (30%) + portfolio (30%)
    const composite = (depositPercent * 0.4) + (collectionRate.percent * 0.3) + (portfolioQuality * 0.3);

    members.push({
      id: u.id,
      name: u.name,
      employeeId: u.employeeId,
      position: u.position?.replace(/_/g, ' '),
      mappedAccounts,
      kpiAchievement: Math.round(depositPercent),
      depositGrowth: Math.round(depositGrowth),
      collectionRate: Math.round(collectionRate.percent),
      portfolioQuality: Math.round(portfolioQuality),
      compositeScore: Math.round(composite),
    });
  }

  // Sort by composite score descending
  members.sort((a, b) => b.compositeScore - a.compositeScore);
  members.forEach((m, i) => m.rank = i + 1);

  const yourRank = members.find(m => m.id === userId)?.rank || null;

  res.status(200).json({
    success: true,
    data: {
      view: 'team',
      members,
      yourRank,
      totalMembers: members.length,
    },
  });
});
