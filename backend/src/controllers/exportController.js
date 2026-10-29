import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const exportScorecard = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { period, year, month } = req.query;

  const where = { userId };
  if (period) where.period = period;
  if (year) where.year = parseInt(year);
  if (month) where.month = parseInt(month);

  const scores = await prisma.performanceScore.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, employeeId: true, position: true, role: true } },
      branch: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branch: { select: { name: true, code: true } } },
  });

  res.status(200).json({
    success: true,
    data: {
      employee: user ? { name: user.name, email: user.email, employeeId: user.employeeId, position: user.position, role: user.role, branch: user.branch?.name } : null,
      scores: scores.map(s => ({
        period: s.period,
        year: s.year,
        month: s.month,
        kpiScores: s.kpiScores,
        kpiTotalScore: s.kpiTotalScore,
        behavioralScore: s.behavioralScore,
        finalScore: s.finalScore,
        rating: s.rating,
        status: s.status,
      })),
    },
  });
});

export const exportBranchReport = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const { period, year } = req.query;

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { area: { select: { name: true } } },
  });

  if (!branch) {
    return res.status(404).json({ success: false, message: 'Branch not found' });
  }

  const staff = await prisma.user.findMany({
    where: { branchId, isActive: true },
    select: { id: true, name: true, employeeId: true, position: true, role: true },
  });

  const staffScores = [];
  for (const member of staff) {
    const where = { userId: member.id };
    if (period) where.period = period;
    if (year) where.year = parseInt(year);

    const scores = await prisma.performanceScore.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (scores.length > 0) {
      staffScores.push({
        employeeId: member.employeeId,
        name: member.name,
        position: member.position,
        role: member.role,
        finalScore: scores[0].finalScore,
        rating: scores[0].rating,
        kpiTotalScore: scores[0].kpiTotalScore,
        behavioralScore: scores[0].behavioralScore,
      });
    }
  }

  staffScores.sort((a, b) => b.finalScore - a.finalScore);

  res.status(200).json({
    success: true,
    data: {
      branch: { name: branch.name, code: branch.code, area: branch.area?.name },
      staffCount: staff.length,
      staffScores,
    },
  });
});
