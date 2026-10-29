import prisma from '../config/database.js';
import { calculateKPIScore, calculateRating } from './performanceCalculator.js';

/**
 * Recalculate persisted performance scores for every user with active staff
 * plans in the supplied period. Locked/finalized scores are left untouched.
 */
export const recalculateScoresForPeriod = async (period) => {
  if (!period) return { period: null, calculated: 0, skipped: 0 };

  const assignments = await prisma.staffPlan.findMany({
    where: { status: 'Active', period },
    select: { userId: true, branch_code: true },
    distinct: ['userId', 'branch_code'],
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let calculated = 0;
  let skipped = 0;

  for (const assignment of assignments) {
    const user = await prisma.user.findUnique({
      where: { id: assignment.userId },
      select: { id: true, branchId: true, isActive: true },
    });
    if (!user?.isActive || !user.branchId) { skipped++; continue; }

    const existing = await prisma.performanceScore.findFirst({
      where: { userId: assignment.userId, period, year, month },
      select: { id: true, isLocked: true, status: true },
    });
    if (existing?.isLocked || existing?.status === 'Finalized' || existing?.status === 'Locked') {
      skipped++;
      continue;
    }

    try {
      const result = await calculateKPIScore(assignment.userId, assignment.branch_code, period);
      const evaluation = await prisma.behavioralEvaluation.findFirst({
        where: { evaluatedUserId: assignment.userId, approvalStatus: 'Approved' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, totalScore: true },
      });
      const behavioralScore = evaluation?.totalScore || 0;
      const finalScore = Math.min(100, Math.round((result.kpiTotalScore + behavioralScore) * 100) / 100);

      const data = {
        kpiScores: result.kpiScores,
        kpiTotalScore: result.kpiTotalScore,
        behavioralScore,
        behavioralEvaluationId: evaluation?.id || null,
        finalScore,
        rating: calculateRating(finalScore),
        status: 'Calculated',
      };

      if (existing) {
        await prisma.performanceScore.update({ where: { id: existing.id }, data });
      } else {
        await prisma.performanceScore.create({
          data: {
            userId: assignment.userId,
            branchId: user.branchId,
            period,
            year,
            month,
            ...data,
          },
        });
      }
      calculated++;
    } catch (error) {
      console.error(`[score-recalc] ${assignment.userId}: ${error.message}`);
      skipped++;
    }
  }

  return { period, calculated, skipped };
};
