import { jest } from '@jest/globals';

const mockPrisma = {
  branch: { findUnique: jest.fn(), findFirst: jest.fn() },
  plan: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  staffPlan: { findMany: jest.fn(), create: jest.fn() },
  department: { findMany: jest.fn() },
};

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../src/utils/planCascade.js', () => ({ cascadeBranchPlan: jest.fn().mockResolvedValue({ cascaded: 5 }) }));
jest.unstable_mockModule('../src/utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../src/utils/prismaHelpers.js', () => ({
  KPI_CATEGORY_TO_ENUM: {
    'Deposit Mobilization': 'Deposit_Mobilization',
    'New Member Registration': 'New_Member_Registration',
    'Share Capital Growth': 'Share_Capital_Growth',
    'Account Productivity': 'Account_Productivity',
    'New Account Opening': 'New_Account_Opening',
    'Mobile Banking Users': 'Mobile_Banking_Users',
    'Merchant POS Growth': 'Merchant_POS_Growth',
    'Billers Recruitment': 'Billers_Recruitment',
    'Internal Operations': 'Internal_Operations',
  },
  TASK_TYPE_TO_ENUM: {},
  CBS_PRODUCT_TO_CATEGORY: {},
}));
jest.unstable_mockModule('../src/middleware/asyncHandler.js', () => ({
  asyncHandler: (fn) => (req, res, next) => {
    if (typeof next !== 'function') next = (e) => { if (e) throw e; };
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
}));
jest.unstable_mockModule('../src/utils/performanceCalculator.js', () => ({
  calculateBranchDepositGrowth: jest.fn().mockResolvedValue(0),
  calculateStaffCollectionRate: jest.fn().mockResolvedValue({ percent: 0 }),
  calculateParMetrics: jest.fn().mockResolvedValue({ totalPortfolio: 0, par90Ratio: 0 }),
}));

const { createPlan, getPlans, getPlan, updatePlan } = await import('../src/controllers/planController.js');

function mockReq(overrides = {}) {
  return {
    user: { id: 'admin-1', role: 'admin' },
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Plan Controller - createPlan', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('rejects missing required fields', async () => {
    const req = mockReq({ body: { branch_code: 'WOLA' } });
    const res = mockRes();
    await createPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('rejects when branch not found', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue(null);
    const req = mockReq({ body: { branch_code: 'NONEXIST', kpi_category: 'Deposit Mobilization', period: '2025-H2', target_value: '10000' } });
    const res = mockRes();
    await createPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects duplicate plan', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.plan.findFirst.mockResolvedValue({ id: 'existing-1' });
    const req = mockReq({ body: { branch_code: 'WOLA', kpi_category: 'Deposit Mobilization', period: '2025-H2', target_value: '10000' } });
    const res = mockRes();
    await createPlan(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('creates plan with basic fields', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.plan.findFirst.mockResolvedValue(null);
    mockPrisma.plan.create.mockResolvedValue({ id: 'plan-1', branch_code: 'WOLA', kpi_category: 'Deposit_Mobilization', period: '2025-H2', target_value: 10000, target_type: 'incremental', status: 'Active', createdById: 'admin-1' });
    const req = mockReq({ body: { branch_code: 'WOLA', kpi_category: 'Deposit Mobilization', period: '2025-H2', target_value: '10000' } });
    const res = mockRes();
    await createPlan(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('creates plan with product_category and target_count', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.plan.findFirst.mockResolvedValue(null);
    mockPrisma.plan.create.mockResolvedValue({ id: 'plan-2', product_category: 'Michu_Current_Saving', target_value: 50000, target_count: 100 });
    const req = mockReq({ body: { branch_code: 'WOLA', kpi_category: 'Deposit Mobilization', period: 'FY-2026-27', target_value: '50000', product_category: 'Michu_Current_Saving', target_count: '100' } });
    const res = mockRes();
    await createPlan(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.plan.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ product_category: 'Michu_Current_Saving', target_count: 100 })
    }));
  });

  it('creates plan with monthly_plan array', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.plan.findFirst.mockResolvedValue(null);
    const monthlyPlan = [
      { month: 'July', amount: 10000, count: 50 },
      { month: 'August', amount: 15000, count: 75 },
    ];
    mockPrisma.plan.create.mockResolvedValue({ id: 'plan-3', monthly_plan: monthlyPlan });
    const req = mockReq({ body: { branch_code: 'WOLA', kpi_category: 'Deposit Mobilization', period: 'FY-2026-27', target_value: '25000', product_category: 'Michu_Current_Saving', monthly_plan: monthlyPlan } });
    const res = mockRes();
    await createPlan(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.plan.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ monthly_plan: monthlyPlan })
    }));
  });

  it('detects duplicate with same product_category', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
    mockPrisma.plan.findFirst.mockResolvedValue({ id: 'existing-prod' });
    const req = mockReq({ body: { branch_code: 'WOLA', kpi_category: 'Deposit Mobilization', period: 'FY-2026-27', target_value: '50000', product_category: 'Michu_Current_Saving' } });
    const res = mockRes();
    await createPlan(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('Plan Controller - getPlans', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns all plans for admin', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      { id: 'p1', branch_code: 'WOLA', kpi_category: 'Deposit_Mobilization', target_value: 10000, createdBy: { name: 'Admin' } },
      { id: 'p2', branch_code: 'WOLA', kpi_category: 'New_Member_Registration', target_value: 5000, createdBy: { name: 'Admin' } },
    ]);
    const req = mockReq({ query: {} });
    const res = mockRes();
    await getPlans(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2 }));
  });

  it('filters by branch_code', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([{ id: 'p1', branch_code: 'WOLA' }]);
    const req = mockReq({ query: { branch_code: 'WOLAYTA_SODO' } });
    const res = mockRes();
    await getPlans(req, res);
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ branch_code: 'WOLAYTA_SODO' })
    }));
  });

  it('filters by product_category', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([{ id: 'p1', product_category: 'Michu_Current_Saving' }]);
    const req = mockReq({ query: { product_category: 'Michu_Current_Saving' } });
    const res = mockRes();
    await getPlans(req, res);
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ product_category: 'Michu_Current_Saving' })
    }));
  });

  it('filters by period', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([{ id: 'p1', period: 'FY-2026-27' }]);
    const req = mockReq({ query: { period: 'FY-2026-27' } });
    const res = mockRes();
    await getPlans(req, res);
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ period: 'FY-2026-27' })
    }));
  });

  it('restricts by user branch for non-admin', async () => {
    mockPrisma.plan.findMany.mockResolvedValue([{ id: 'p1', branch_code: 'WOLA' }]);
    const req = mockReq({ query: {}, user: { id: 'user-1', role: 'branchManager', branch_code: 'WOLA' } });
    const res = mockRes();
    await getPlans(req, res);
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ branch_code: 'WOLA' })
    }));
  });
});

describe('Plan Controller - updatePlan', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('updates target_count', async () => {
    mockPrisma.plan.findUnique.mockResolvedValue({ id: 'p1', target_value: 10000 });
    mockPrisma.plan.update.mockResolvedValue({ id: 'p1', target_count: 200 });
    const req = mockReq({ params: { id: 'p1' }, body: { target_count: '200' } });
    const res = mockRes();
    await updatePlan(req, res, jest.fn());
    expect(mockPrisma.plan.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('handles not found', async () => {
    mockPrisma.plan.findUnique.mockResolvedValue(null);
    const req = mockReq({ params: { id: 'nonexistent' }, body: {} });
    const res = mockRes();
    await updatePlan(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('Plan Controller - product data validation', () => {
  it('getPlan returns product fields', async () => {
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: 'p1', product_category: 'Michu_Current_Saving', target_value: 50000, target_count: 100,
      monthly_plan: [{ month: 'July', amount: 10000, count: 50 }],
      createdBy: { name: 'Admin' }
    });
    const req = mockReq({ params: { id: 'p1' } });
    const res = mockRes();
    await getPlan(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ product_category: 'Michu_Current_Saving', target_count: 100 })
    }));
  });
});
