import prisma from '../config/database.js';

const PERIOD_ALIASES = {
  '2025-H2': 'FY-2026-27',
  '2026-27': 'FY-2026-27',
  'H2-2025': 'FY-2026-27',
};

export const normalizePeriod = (input) => {
  if (!input) return null;
  const trimmed = input.trim();
  if (PERIOD_ALIASES[trimmed]) return PERIOD_ALIASES[trimmed];
  if (/^FY-\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `FY-${trimmed}`;
  return trimmed;
};

export const getActivePeriod = async (branchCode) => {
  const where = { status: 'Active' };
  if (branchCode) where.branch_code = branchCode;

  const plan = await prisma.plan.findFirst({
    where,
    select: { period: true },
    orderBy: { createdAt: 'desc' },
  });

  if (plan) return normalizePeriod(plan.period);
  return 'FY-2026-27';
};

export const getPeriodStart = (period) => {
  const match = period?.match(/FY-(\d{4})/);
  if (match) {
    const year = parseInt(match[1]);
    return new Date(year, 6, 1);
  }
  if (period?.includes('H2')) {
    return new Date(2025, 6, 1);
  }
  return new Date(2025, 6, 1);
};

export const getPeriodEnd = (period) => {
  const match = period?.match(/FY-(\d{4})/);
  if (match) {
    const year = parseInt(match[1]);
    return new Date(year + 1, 5, 30);
  }
  if (period?.includes('H2')) {
    return new Date(2025, 11, 31);
  }
  return new Date(2026, 5, 30);
};
