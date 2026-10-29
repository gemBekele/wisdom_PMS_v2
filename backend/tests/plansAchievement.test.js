import { jest } from '@jest/globals';

const mockPrisma = {
  branch: { findUnique: jest.fn(), findFirst: jest.fn() },
  plan: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  staffPlan: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
  accountMapping: { findMany: jest.fn() },
  dailyTask: { count: jest.fn() },
  juneBalance: { findMany: jest.fn() },
};

const mockPerfCalc = {
  calculateBranchDepositGrowth: jest.fn(),
  calculateStaffCollectionRate: jest.fn(),
  calculateParMetrics: jest.fn(),
};

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../src/middleware/asyncHandler.js', () => ({
  asyncHandler: (fn) => (req, res, next) => {
    if (typeof next !== 'function') next = (e) => { if (e) throw e; };
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
}));
jest.unstable_mockModule('../src/utils/performanceCalculator.js', () => mockPerfCalc);

const { getPlansAchievement } = await import('../src/controllers/planController.js');

function mockReq(overrides = {}) {
  return {
    user: { id: 'admin-1', role: 'admin' },
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Plans Achievement - getPlansAchievement', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns 400 when no period provided', async () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    await getPlansAchievement(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns enriched plans with achievement for admin', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'WOLA', kpi_category: 'Deposit_Mobilization', period: '2025-H2', target_value: 100000, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
      { id: 'p2', branch_code: 'WOLA', kpi_category: 'New_Member_Registration', period: '2025-H2', target_value: 50, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
    ]);
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'staff-1' }, { id: 'staff-2' },
    ]);
    mockPerfCalc.calculateBranchDepositGrowth.mockResolvedValue(75000);
    mockPrisma.dailyTask.count.mockResolvedValue(30);
    const req = mockReq({ query: { period: '2025-H2' } });
    const res = mockRes();
    await getPlansAchievement(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2 }));
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data[0].actual).toBeDefined();
    expect(callArg.data[0].achievementPercent).toBeDefined();
    expect(callArg.data[1].actual).toBeDefined();
    expect(callArg.data[1].achievementPercent).toBeDefined();
  });

  it('calculates achievementPercent correctly for Deposit_Mobilization', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'WOLA', kpi_category: 'Deposit_Mobilization', period: '2025-H2', target_value: 100000, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
    ]);
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'staff-1' }]);
    mockPerfCalc.calculateBranchDepositGrowth.mockResolvedValue(50000);
    const req = mockReq({ query: { period: '2025-H2' } });
    const res = mockRes();
    await getPlansAchievement(req, res);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data[0].actual).toBe(50000);
    expect(callArg.data[0].achievementPercent).toBe(50);
  });

  it('handles Collection_Rate KPI category', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'WOLA', kpi_category: 'Collection_Rate', period: '2025-H2', target_value: 80, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
    ]);
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'staff-1' }, { id: 'staff-2' }]);
    mockPerfCalc.calculateStaffCollectionRate
      .mockResolvedValueOnce({ expected: 10000, collected: 8500, percent: 85 })
      .mockResolvedValueOnce({ expected: 8000, collected: 6400, percent: 80 });
    const req = mockReq({ query: { period: '2025-H2' } });
    const res = mockRes();
    await getPlansAchievement(req, res);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data[0].actual).toBeGreaterThan(0);
  });

  it('handles Portfolio_Quality KPI category', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'WOLA', kpi_category: 'Portfolio_Quality', period: '2025-H2', target_value: 95, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
    ]);
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'staff-1' }]);
    mockPrisma.accountMapping.findMany.mockResolvedValue([{ id: 'loan-1' }]);
    mockPerfCalc.calculateParMetrics.mockResolvedValue({ totalPortfolio: 500000, par90Amount: 10000, par90Ratio: 2 });
    const req = mockReq({ query: { period: '2025-H2' } });
    const res = mockRes();
    await getPlansAchievement(req, res);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.success).toBe(true);
    expect(callArg.data[0].actual).toBe(98);
  });

  it('handles product-level plan achievement', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'WOLA', kpi_category: 'Deposit_Mobilization', product_category: 'Loan_Saving_Deposit', period: '2025-H2', target_value: 100000, target_count: 0, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
    ]);
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'staff-1' }]);
    mockPrisma.accountMapping.findMany.mockResolvedValue([
      { id: 'acct-1', accountNumber: 'ACC001', product: 'LOAN SAVING RESERVE ACCOUNT', current_balance: 50000, status: 'Active', branchId: 'branch-1' },
    ]);
    mockPrisma.juneBalance.findMany.mockResolvedValue([
      { account_id: 'ACC001', accountNumber: 'ACC001', june_balance: 10000, is_active: true, baseline_period: '2025' },
    ]);
    const req = mockReq({ query: { period: '2025-H2' } });
    const res = mockRes();
    await getPlansAchievement(req, res);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.success).toBe(true);
  });

  it('restricts by branch_code for non-admin users', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([]);
    const req = mockReq({
      query: { period: '2025-H2' },
      user: { id: 'bm-1', role: 'branchManager', branch_code: 'WOLA' },
    });
    const res = mockRes();
    await getPlansAchievement(req, res);
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ branch_code: 'WOLA' }),
      })
    );
  });

  it('returns achievementPercent 0 when target_value is 0', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'WOLA', kpi_category: 'New_Member_Registration', period: '2025-H2', target_value: 0, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
    ]);
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'staff-1' }]);
    mockPrisma.dailyTask.count.mockResolvedValue(10);
    const req = mockReq({ query: { period: '2025-H2' } });
    const res = mockRes();
    await getPlansAchievement(req, res);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data[0].achievementPercent).toBe(0);
  });

  it('handles branch not found gracefully', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'FAKE', kpi_category: 'Deposit_Mobilization', period: '2025-H2', target_value: 100000, status: 'Active', createdBy: { name: 'Admin' }, createdAt: new Date() },
    ]);
    mockPrisma.branch.findUnique.mockResolvedValue(null);
    const req = mockReq({ query: { period: '2025-H2' } });
    const res = mockRes();
    await getPlansAchievement(req, res);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.success).toBe(true);
    expect(callArg.data[0].actual).toBe(0);
  });
});
