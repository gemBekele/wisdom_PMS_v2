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
  },
}));

const { createPlan } = await import('../src/controllers/planController.js');

mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', code: 'WOLA' });
mockPrisma.plan.findFirst.mockResolvedValue(null);
mockPrisma.plan.create.mockResolvedValue({ id: 'plan-1', branch_code: 'WOLA' });

const req = {
  user: { id: 'admin-1', role: 'admin' },
  body: { branch_code: 'WOLA', kpi_category: 'Deposit Mobilization', period: '2025-H2', target_value: '10000' },
};
const res = { status: (c) => { console.log('status called with:', c); return res; }, json: (d) => { console.log('json called with:', JSON.stringify(d).slice(0,200)); } };

await createPlan(req, res);
console.log('done');
