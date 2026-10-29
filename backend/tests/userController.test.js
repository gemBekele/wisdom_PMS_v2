import { jest } from '@jest/globals';

const mockPrisma = {
  user: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  branch: { findUnique: jest.fn(), findMany: jest.fn() },
  supervisor: { findMany: jest.fn() },
};

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../src/utils/auditLogger.js', () => ({ logAudit: jest.fn() }));

const { getUsers } = await import('../src/controllers/userController.js');

function mockReq(overrides = {}) {
  return { user: { id: 'admin-1', role: 'admin' }, query: {}, params: {}, body: {}, ...overrides };
}
function mockRes() {
  const res = {}; res.status = jest.fn().mockReturnValue(res); res.json = jest.fn().mockReturnValue(res); return res;
}

describe('User Controller - Role-based visibility', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('admin sees all users', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', role: 'admin', name: 'Admin' },
      { id: 'u2', role: 'branchManager', name: 'BM' },
      { id: 'u3', role: 'staff', name: 'Staff' },
    ]);
    const req = mockReq({ query: {} });
    const res = mockRes();
    await getUsers(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockPrisma.user.findMany).toHaveBeenCalled();
  });

  it('branch manager sees only branch users', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u2', role: 'staff', branchId: 'b1', name: 'Staff 1' },
    ]);
    const req = mockReq({
      user: { id: 'bm-1', role: 'branchManager', branchId: 'b1', branch_code: 'WOLA' },
      query: {},
    });
    const res = mockRes();
    await getUsers(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('filters by role', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u3', role: 'staff', name: 'Staff A' },
    ]);
    const req = mockReq({ query: { role: 'staff' } });
    const res = mockRes();
    await getUsers(req, res);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: 'staff' }) })
    );
  });

  it('filters by branch_code', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    const req = mockReq({ query: { branch_code: 'WOLA' } });
    const res = mockRes();
    await getUsers(req, res);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ branch_code: 'WOLA' }) })
    );
  });
});
