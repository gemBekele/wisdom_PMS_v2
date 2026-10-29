import { jest } from '@jest/globals';

const mockPrisma = {
  loanSchedule: { findMany: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() },
  accountMapping: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
  nplSnapshot: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }));

const {
  calculateLoanDpd, calculateBatchDpd, calculateParMetrics,
  calculateStaffCollectionRate, autoGenerateLoanSchedules, generateNplSnapshot
} = await import('../src/utils/performanceCalculator.js');

describe('Performance Calculator - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-14T10:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  describe('calculateLoanDpd edge cases', () => {
    it('handles installment due far in the future', async () => {
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { expectedDate: new Date('2027-01-01') }
      ]);
      const dpd = await calculateLoanDpd('acct-1');
      expect(dpd).toBe(0);
    });

    it('handles installment overdue by many days', async () => {
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { expectedDate: new Date('2025-01-01') }
      ]);
      const dpd = await calculateLoanDpd('acct-1');
      expect(dpd).toBeGreaterThan(500);
    });

    it('handles multiple installments with mixed status (return oldest)', async () => {
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { expectedDate: new Date('2026-07-01') }, // 13 days
        { expectedDate: new Date('2026-07-10') }, // 4 days
        { expectedDate: new Date('2026-08-01') }, // future
      ]);
      const dpd = await calculateLoanDpd('acct-1');
      expect(dpd).toBe(13);
    });
  });

  describe('calculateParMetrics edge cases', () => {
    it('classifies PAR buckets correctly (Watch, Substandard, Doubtful, Loss)', async () => {
      const accounts = [
        { id: 'a1', accountNumber: 'LN001', current_balance: 100000 },
        { id: 'a2', accountNumber: 'LN002', current_balance: 100000 },
        { id: 'a3', accountNumber: 'LN003', current_balance: 100000 },
        { id: 'a4', accountNumber: 'LN004', current_balance: 100000 },
      ];
      mockPrisma.accountMapping.findMany.mockResolvedValue(accounts);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { accountId: 'a1', expectedDate: new Date('2026-07-13') }, // 1 day -> Watch
        { accountId: 'a2', expectedDate: new Date('2026-06-14') }, // 30 days -> Substandard
        { accountId: 'a3', expectedDate: new Date('2026-04-14') }, // 91 days -> Doubtful
        { accountId: 'a4', expectedDate: new Date('2026-01-14') }, // 181 days -> Loss
      ]);

      const metrics = await calculateParMetrics(['a1', 'a2', 'a3', 'a4']);
      expect(metrics.totalPortfolio).toBe(400000);
      expect(metrics.par1Amount).toBe(400000);
      expect(metrics.par1Ratio).toBe(100);
      expect(metrics.par30Amount).toBe(300000);
      expect(metrics.par30Ratio).toBe(75);
      expect(metrics.par90Amount).toBe(200000);
      expect(metrics.par90Ratio).toBe(50);
      expect(metrics.par1Count).toBe(4);
      expect(metrics.par30Count).toBe(3);
      expect(metrics.par90Count).toBe(2);
    });

    it('handles single account portfolio', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([
        { id: 'a1', accountNumber: 'LN001', current_balance: 50000 },
      ]);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
      const metrics = await calculateParMetrics(['a1']);
      expect(metrics.totalLoans).toBe(1);
      expect(metrics.totalPortfolio).toBe(50000);
      expect(metrics.par1Ratio).toBe(0);
      expect(metrics.par30Ratio).toBe(0);
    });

    it('handles zero balance accounts', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([
        { id: 'a1', accountNumber: 'LN001', current_balance: 0 },
        { id: 'a2', accountNumber: 'LN002', current_balance: 0 },
      ]);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
      const metrics = await calculateParMetrics(['a1', 'a2']);
      expect(metrics.totalPortfolio).toBe(0);
      expect(metrics.par1Ratio).toBe(0);
    });
  });

  describe('calculateStaffCollectionRate edge cases', () => {
    it('handles all paid installments', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([{ id: 'a1' }]);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { expectedAmount: 1000, paidAmount: 1000, status: 'Paid' },
        { expectedAmount: 2000, paidAmount: 2000, status: 'Paid' },
      ]);
      const result = await calculateStaffCollectionRate('staff-1');
      expect(result.percent).toBe(100);
      expect(result.paidCount).toBe(2);
    });

    it('handles no installments at all', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([{ id: 'a1' }]);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
      const result = await calculateStaffCollectionRate('staff-1');
      expect(result.expected).toBe(0);
      expect(result.paid).toBe(0);
      expect(result.percent).toBe(0);
    });

    it('handles partial payments', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([{ id: 'a1' }]);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { expectedAmount: 1000, paidAmount: 250, status: 'Partial' },
      ]);
      const result = await calculateStaffCollectionRate('staff-1');
      expect(result.expected).toBe(1000);
      expect(result.paid).toBe(250);
      expect(result.percent).toBe(25);
    });
  });

  describe('generateNplSnapshot', () => {
    it('creates snapshot with PAR metrics', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([]);
      mockPrisma.nplSnapshot.findFirst.mockResolvedValue(null);
      mockPrisma.nplSnapshot.create.mockResolvedValue({ id: 'snap-1' });
      const result = await generateNplSnapshot('branch-1', 'WOLA');
      expect(result).toBeDefined();
    });
  });
});
