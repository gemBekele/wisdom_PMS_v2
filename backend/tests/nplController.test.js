import { jest } from '@jest/globals';

const mockPrisma = {
  accountMapping: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), aggregate: jest.fn().mockResolvedValue({ _sum: { current_balance: 0 } }) },
  loanSchedule: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null), createMany: jest.fn(), update: jest.fn() },
  nplSnapshot: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'snap-1' }), update: jest.fn() },
  branch: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
  area: { findMany: jest.fn().mockResolvedValue([]) },
  user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) },
};

const mockPerfCalc = {
  calculateBatchDpd: jest.fn(),
  calculateParMetrics: jest.fn(),
  calculateStaffCollectionRate: jest.fn(),
  generateNplSnapshot: jest.fn(),
  autoGenerateLoanSchedules: jest.fn(),
  getStaffCollectionAlerts: jest.fn(),
};

function resetPerfCalc() {
  mockPerfCalc.calculateBatchDpd.mockResolvedValue([]);
  mockPerfCalc.calculateParMetrics.mockResolvedValue({ totalPortfolio: 0, par1Amount: 0, par30Amount: 0, par90Amount: 0, totalLoans: 0, par1Count: 0, par30Count: 0, par90Count: 0 });
  mockPerfCalc.calculateStaffCollectionRate.mockResolvedValue(0);
  mockPerfCalc.generateNplSnapshot.mockResolvedValue({ id: 'snap-1', par1Ratio: 5, par30Ratio: 2, par90Ratio: 0.5 });
  mockPerfCalc.autoGenerateLoanSchedules.mockResolvedValue({ generated: 12 });
  mockPerfCalc.getStaffCollectionAlerts.mockResolvedValue([]);
}

resetPerfCalc();

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../src/middleware/asyncHandler.js', () => ({
  asyncHandler: (fn) => (req, res, next) => {
    if (typeof next !== 'function') next = (e) => { if (e) throw e; };
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
}));
jest.unstable_mockModule('../src/utils/performanceCalculator.js', () => mockPerfCalc);

const {
  getStaffNpl, getBranchNpl, getHqNpl, getAreaNpl,
  getLoanSchedule, markInstallmentPaid, generateLoanSchedules,
  triggerNplSnapshot, getTeamCollectionAlerts
} = await import('../src/controllers/nplController.js');

function mockReq(overrides = {}) {
  return { user: { id: 'user-1', role: 'admin', branchId: 'branch-1', branch_code: 'WOLA' }, params: {}, query: {}, body: {}, ...overrides };
}
function mockRes() {
  const res = {}; res.status = jest.fn().mockReturnValue(res); res.json = jest.fn().mockReturnValue(res); return res;
}

describe('getStaffNpl', () => {

  it('returns collection data for staff', async () => {
    mockPrisma.accountMapping.findMany.mockResolvedValue([]);
    mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
    mockPerfCalc.getStaffCollectionAlerts.mockResolvedValue([]);
    mockPerfCalc.calculateStaffCollectionRate.mockResolvedValue(85);
    const req = mockReq({ user: { id: 'staff-1', role: 'staff', branch_code: 'WOLA' } });
    const res = mockRes();
    await getStaffNpl(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('NPL Controller - getBranchNpl', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('returns 400 when no branchId for admin', async () => {
    const req = mockReq({ user: { id: 'admin-1', role: 'admin' }, query: {} });
    const res = mockRes();
    await getBranchNpl(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts branch_code from query', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-wola' });
    mockPrisma.accountMapping.findMany.mockResolvedValue([]);
    mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
    const req = mockReq({ user: { id: 'admin-1', role: 'admin' }, query: { branch_code: 'WOLA' } });
    const res = mockRes();
    await getBranchNpl(req, res, jest.fn());
    expect(mockPrisma.branch.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: 'WOLA' } }));
  });

  it('uses user branchId when available', async () => {
    mockPrisma.accountMapping.findMany.mockResolvedValue([]);
    mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
    const req = mockReq({ query: {} });
    const res = mockRes();
    await getBranchNpl(req, res, jest.fn());
    expect(mockPrisma.accountMapping.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ branchId: 'branch-1' }) })
    );
  });

  it('includes trendData in response', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1' });
    mockPrisma.accountMapping.findMany.mockResolvedValue([]);
    mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
    mockPrisma.nplSnapshot.findMany.mockResolvedValue([
      { snapshotDate: new Date('2026-07-01'), totalPortfolio: 1000000, par90Amount: 50000 },
      { snapshotDate: new Date('2026-07-02'), totalPortfolio: 1000000, par90Amount: 48000 },
      { snapshotDate: new Date('2026-07-03'), totalPortfolio: 1000000, par90Amount: 45000 },
    ]);
    const req = mockReq({ query: { branch_code: 'WOLA' } });
    const res = mockRes();
    await getBranchNpl(req, res, jest.fn());
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.success).toBe(true);
    expect(callArg.data.trendData).toBeDefined();
    expect(Array.isArray(callArg.data.trendData)).toBe(true);
    expect(callArg.data.trendData.length).toBeGreaterThan(0);
  });

  it('trendData calculates par90Ratio correctly', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1' });
    mockPrisma.accountMapping.findMany.mockResolvedValue([]);
    mockPrisma.loanSchedule.findMany.mockResolvedValue([]);
    mockPrisma.nplSnapshot.findMany.mockResolvedValue([
      { snapshotDate: new Date('2026-07-01'), totalPortfolio: 1000000, par90Amount: 50000 },
    ]);
    const req = mockReq({ query: { branch_code: 'WOLA' } });
    const res = mockRes();
    await getBranchNpl(req, res, jest.fn());
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data.trendData[0].par90Ratio).toBe(5);
  });
});

describe('NPL Controller - getHqNpl', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('returns HQ-level NPL data', async () => {
    mockPrisma.branch.findMany.mockResolvedValue([]);
    mockPrisma.area.findMany.mockResolvedValue([]);
    mockPrisma.nplSnapshot.findMany.mockResolvedValue([]);
    mockPrisma.accountMapping.findMany.mockResolvedValue([]);
    const req = mockReq({ query: {} });
    const res = mockRes();
    await getHqNpl(req, res, jest.fn());
    // Complex nested function, just verify it completes without crashing
    if (res.json.mock.calls.length === 0) {
      const calls = { status: res.status.mock.calls, json: res.json.mock.calls };
      throw new Error(`res.json was not called. status calls: ${JSON.stringify(calls.status)}`);
    }
    expect(res.json).toHaveBeenCalled();
  });
});

describe('NPL Controller - getLoanSchedule', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('returns loan schedule for account', async () => {
    mockPrisma.accountMapping.findUnique.mockResolvedValue({
      id: 'acct-1', accountNumber: 'LN001', customerName: 'John',
      accountType: 'Loan', loan_principal: 12000, payment_frequency: 'Monthly',
      loan_disbursement_date: new Date(), loan_maturity_date: new Date('2027-01-01'),
      interest_rate: 0, current_balance: 10000,
    });
    mockPrisma.loanSchedule.findMany.mockResolvedValue([
      { id: 's1', expectedDate: new Date(), expectedAmount: 1000, paidAmount: 0, status: 'Pending' }
    ]);
    const req = mockReq({ params: { accountId: 'acct-1' } });
    const res = mockRes();
    await getLoanSchedule(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('NPL Controller - markInstallmentPaid', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('rejects when schedule not found', async () => {
    mockPrisma.loanSchedule.findFirst.mockResolvedValue(null);
    const req = mockReq({ params: { id: 'nonexistent' }, body: { paidAmount: 500 } });
    const res = mockRes();
    await markInstallmentPaid(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('marks installment as paid', async () => {
    mockPrisma.loanSchedule.findUnique.mockResolvedValue({ id: 's1', expectedAmount: 1000, paidAmount: 0, status: 'Pending' });
    mockPrisma.loanSchedule.update.mockResolvedValue({ id: 's1', expectedAmount: 1000, paidAmount: 1000, status: 'Paid' });
    const req = mockReq({ params: { id: 's1' }, body: { paidAmount: 1000 } });
    const res = mockRes();
    await markInstallmentPaid(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('NPL Controller - getAreaNpl', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('returns empty data when user has no areaId', async () => {
    const req = mockReq({ user: { id: 'admin-1', role: 'admin' } });
    const res = mockRes();
    await getAreaNpl(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns area NPL data with branches', async () => {
    mockPerfCalc.calculateParMetrics.mockResolvedValue({ totalPortfolio: 500000, par1Amount: 25000, par30Amount: 10000, par90Amount: 5000, totalLoans: 50, par1Count: 10, par30Count: 5, par90Count: 2 });
    mockPrisma.branch.findMany.mockResolvedValue([
      { id: 'b1', name: 'Wolayta Sodo', code: 'WOLA' },
      { id: 'b2', name: 'Sodo Main', code: 'SODO' },
    ]);
    mockPrisma.accountMapping.findMany.mockResolvedValue([]);
    mockPrisma.nplSnapshot.findMany.mockResolvedValue([]);
    const req = mockReq({ user: { id: 'area-1', role: 'areaManager', areaId: 'area-1' } });
    const res = mockRes();
    await getAreaNpl(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('NPL Controller - triggerNplSnapshot', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('returns 400 when no branchId', async () => {
    const req = mockReq({ user: { id: 'admin-1', role: 'admin' }, body: {} });
    const res = mockRes();
    await triggerNplSnapshot(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('generates snapshot for branch', async () => {
    mockPerfCalc.generateNplSnapshot.mockResolvedValue({ id: 'snap-1', par1Ratio: 5 });
    const req = mockReq({ body: { branchId: 'branch-1' } });
    const res = mockRes();
    await triggerNplSnapshot(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('NPL Controller - generateLoanSchedules', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('generates schedules for a loan account', async () => {
    mockPerfCalc.autoGenerateLoanSchedules.mockResolvedValue({ generated: 12 });
    const req = mockReq({ params: { accountId: 'acct-1' } });
    const res = mockRes();
    await generateLoanSchedules(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('NPL Controller - getTeamCollectionAlerts', () => {
  beforeEach(() => { jest.clearAllMocks(); resetPerfCalc(); });

  it('returns empty team alerts when no supervisees', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    const req = mockReq({ user: { id: 'supervisor-1', role: 'supervisor' } });
    const res = mockRes();
    await getTeamCollectionAlerts(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns alerts for team members with overdue payments', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'staff-1', name: 'John Staff' },
      { id: 'staff-2', name: 'Jane Staff' },
    ]);
    mockPerfCalc.getStaffCollectionAlerts
      .mockResolvedValueOnce([{ severity: 'high', accountNumber: 'LN001', remainingAmount: 500 }])
      .mockResolvedValueOnce([]);
    const req = mockReq({ user: { id: 'supervisor-1', role: 'supervisor' } });
    const res = mockRes();
    await getTeamCollectionAlerts(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
