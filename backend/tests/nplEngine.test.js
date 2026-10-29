import { jest } from '@jest/globals';

const mockPrisma = {
  loanSchedule: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  accountMapping: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  nplSnapshot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: mockPrisma,
}));

const {
  calculateLoanDpd,
  calculateBatchDpd,
  calculateParMetrics,
  calculateStaffCollectionRate,
  autoGenerateLoanSchedules,
  getStaffCollectionAlerts,
} = await import('../src/utils/performanceCalculator.js');

describe('DPD Calculation Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date to 2026-07-14
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-14T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateLoanDpd', () => {
    it('returns 0 when no unpaid installments exist', async () => {
      mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
      const dpd = await calculateLoanDpd('account-1');
      expect(dpd).toBe(0);
    });

    it('calculates DPD from oldest unpaid installment', async () => {
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { expectedDate: new Date('2026-07-10') }, // 4 days overdue
      ]);
      const dpd = await calculateLoanDpd('account-1');
      expect(dpd).toBe(4);
    });

    it('returns 0 for installment due today', async () => {
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { expectedDate: new Date('2026-07-14') }, // due today
      ]);
      const dpd = await calculateLoanDpd('account-1');
      expect(dpd).toBe(0);
    });

    it('returns 0 when all installments are paid', async () => {
      mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
      const dpd = await calculateLoanDpd('account-1');
      expect(dpd).toBe(0);
    });
  });

  describe('calculateBatchDpd', () => {
    const loanAccounts = [
      { id: 'a1', accountNumber: 'LN001', current_balance: 10000 },
      { id: 'a2', accountNumber: 'LN002', current_balance: 5000 },
    ];

    it('returns empty array for no loan accounts', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([]);
      const result = await calculateBatchDpd(['none']);
      expect(result).toEqual([]);
    });

    it('classifies loans correctly by DPD', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue(loanAccounts);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { accountId: 'a1', expectedDate: new Date('2026-04-14') }, // 91 days - Doubtful
        { accountId: 'a2', expectedDate: new Date('2026-06-14') }, // 30 days - Substandard
      ]);

      const result = await calculateBatchDpd(['a1', 'a2']);
      expect(result).toHaveLength(2);

      const a1 = result.find(r => r.accountId === 'a1');
      expect(a1.dpd).toBeGreaterThanOrEqual(90);
      expect(a1.classification).toBe('Doubtful');

      const a2 = result.find(r => r.accountId === 'a2');
      expect(a2.dpd).toBeGreaterThanOrEqual(30);
      expect(a2.classification).toBe('Substandard');
    });
  });

  describe('calculateParMetrics', () => {
    it('calculates correct PAR ratios', async () => {
      const accounts = [
        { id: 'a1', accountNumber: 'LN001', current_balance: 100000 },
        { id: 'a2', accountNumber: 'LN002', current_balance: 50000 },
        { id: 'a3', accountNumber: 'LN003', current_balance: 50000 },
      ];
      mockPrisma.accountMapping.findMany.mockResolvedValue(accounts);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { accountId: 'a1', expectedDate: new Date('2026-01-14') }, // 181+ days -> Loss
        { accountId: 'a2', expectedDate: new Date('2026-07-13') }, // 1 day -> Watch
      ]);

      const metrics = await calculateParMetrics(['a1', 'a2', 'a3']);
      expect(metrics.totalLoans).toBe(3);
      expect(metrics.totalPortfolio).toBe(200000);
      // a1 has balance 100000 and is 181d overdue -> PAR 1, 30, 90
      // a2 has balance 50000 and is 1d overdue -> PAR 1 only
      // a3 is current
      expect(metrics.par1Amount).toBe(150000);
      expect(metrics.par1Ratio).toBe(75);
      expect(metrics.par30Amount).toBe(100000);
      expect(metrics.par30Ratio).toBe(50);
      expect(metrics.par90Amount).toBe(100000);
      expect(metrics.par90Ratio).toBe(50);
      expect(metrics.par1Count).toBe(2);
      expect(metrics.par30Count).toBe(1);
      expect(metrics.par90Count).toBe(1);
    });

    it('returns zeros for empty portfolio', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([]);
      const metrics = await calculateParMetrics([]);
      expect(metrics.totalPortfolio).toBe(0);
      expect(metrics.par1Ratio).toBe(0);
    });
  });

  describe('calculateStaffCollectionRate', () => {
    it('returns 0 when staff has no loan accounts', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([]);
      const result = await calculateStaffCollectionRate('staff-1');
      expect(result.expected).toBe(0);
      expect(result.paid).toBe(0);
      expect(result.percent).toBe(0);
    });

    it('calculates collection rate correctly', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([
        { id: 'a1' },
        { id: 'a2' },
      ]);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { accountId: 'a1', expectedAmount: 1000, paidAmount: 1000, status: 'Paid' },
        { accountId: 'a2', expectedAmount: 1000, paidAmount: 0, status: 'Pending' },
      ]);

      const result = await calculateStaffCollectionRate('staff-1');
      expect(result.expected).toBe(2000);
      expect(result.paid).toBe(1000);
      expect(result.percent).toBe(50);
      expect(result.count).toBe(2);
      expect(result.paidCount).toBe(1);
    });
  });

  describe('getStaffCollectionAlerts', () => {
    it('returns empty array when no loan accounts', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([]);
      const alerts = await getStaffCollectionAlerts('staff-1');
      expect(alerts).toEqual([]);
    });

    it('returns overdue installments sorted by DPD', async () => {
      mockPrisma.accountMapping.findMany.mockResolvedValue([
        { id: 'a1', accountNumber: 'LN001', customerName: 'John', current_balance: 10000 },
      ]);
      mockPrisma.loanSchedule.findMany.mockResolvedValue([
        { id: 's1', accountId: 'a1', expectedDate: new Date('2026-07-10'), expectedAmount: 1000, paidAmount: 0, status: 'Pending' },
        { id: 's2', accountId: 'a1', expectedDate: new Date('2026-07-12'), expectedAmount: 1000, paidAmount: 500, status: 'Partial' },
      ]);

      const alerts = await getStaffCollectionAlerts('staff-1');
      expect(alerts).toHaveLength(2);
      expect(alerts[0].dpd).toBeGreaterThanOrEqual(alerts[1].dpd); // sorted by DPD desc
      expect(alerts[0].remaining).toBe(1000);
      expect(alerts[1].remaining).toBe(500);
    });
  });

  describe('autoGenerateLoanSchedules', () => {
    it('throws for non-loan account', async () => {
      mockPrisma.accountMapping.findUnique.mockResolvedValue({
        accountType: 'Savings',
      });
      await expect(autoGenerateLoanSchedules('acct-1')).rejects.toThrow('not a loan account');
    });

    it('throws when loan data is missing', async () => {
      mockPrisma.accountMapping.findUnique.mockResolvedValue({
        accountType: 'Loan',
        payment_frequency: null,
        loan_principal: 0,
      });
      await expect(autoGenerateLoanSchedules('acct-1')).rejects.toThrow('Missing loan data');
    });

    it('generates monthly installments for a 1-year loan', async () => {
      mockPrisma.accountMapping.findUnique.mockResolvedValue({
        id: 'acct-1',
        accountType: 'Loan',
        payment_frequency: 'Monthly',
        loan_principal: 12000,
        loan_maturity_date: new Date('2027-07-14'),
        next_payment_date: new Date('2026-08-14'),
        interest_rate: 0,
      });
      mockPrisma.loanSchedule.findFirst.mockResolvedValue(null);
      mockPrisma.loanSchedule.createMany.mockResolvedValue({ count: 12 });

      const result = await autoGenerateLoanSchedules('acct-1');
      expect(result.generated).toBe(12);
      expect(mockPrisma.loanSchedule.createMany).toHaveBeenCalled();
      const callData = mockPrisma.loanSchedule.createMany.mock.calls[0][0].data;
      expect(callData).toHaveLength(12);
      expect(callData[0].expectedAmount).toBe(1000); // 12000/12
    });
  });
});
