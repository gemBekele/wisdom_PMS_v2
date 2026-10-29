import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: {
    user: { findUnique: jest.fn() },
    branch: { findUnique: jest.fn() },
  }
}));

const {
  isAdmin, isHQAdmin, isAreaManager, isBranchManager,
  isSupervisor, isStaff, isManagerOrAbove, canApprove, authorize
} = await import('../src/middleware/rbac.js');

function mockReqRes(role, extra = {}) {
  const req = { user: { role, ...extra } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

describe('RBAC Middleware - Authentication check', () => {
  it('rejects with 401 when no user', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('RBAC Middleware - isAdmin', () => {
  it('allows admin through', () => {
    const { req, res, next } = mockReqRes('admin');
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects areaManager', () => {
    const { req, res, next } = mockReqRes('areaManager');
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects branchManager', () => {
    const { req, res, next } = mockReqRes('branchManager');
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects supervisor', () => {
    const { req, res, next } = mockReqRes('supervisor');
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects staff', () => {
    const { req, res, next } = mockReqRes('staff');
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows CEO through (CEO role maps to admin)', () => {
    const { req, res, next } = mockReqRes('CEO');
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('RBAC Middleware - isAreaManager', () => {
  it('allows admin through', () => {
    const { req, res, next } = mockReqRes('admin');
    isAreaManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows areaManager through', () => {
    const { req, res, next } = mockReqRes('areaManager');
    isAreaManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects branchManager', () => {
    const { req, res, next } = mockReqRes('branchManager');
    isAreaManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects staff', () => {
    const { req, res, next } = mockReqRes('staff');
    isAreaManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('RBAC Middleware - isBranchManager', () => {
  it('allows admin through', () => {
    const { req, res, next } = mockReqRes('admin');
    isBranchManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows areaManager through', () => {
    const { req, res, next } = mockReqRes('areaManager');
    isBranchManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows branchManager through', () => {
    const { req, res, next } = mockReqRes('branchManager');
    isBranchManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows supervisor through', () => {
    const { req, res, next } = mockReqRes('supervisor');
    isBranchManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects staff', () => {
    const { req, res, next } = mockReqRes('staff');
    isBranchManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('RBAC Middleware - isSupervisor', () => {
  it('allows admin through', () => {
    const { req, res, next } = mockReqRes('admin');
    isSupervisor(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows branchManager through', () => {
    const { req, res, next } = mockReqRes('branchManager');
    isSupervisor(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows supervisor through', () => {
    const { req, res, next } = mockReqRes('supervisor');
    isSupervisor(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects staff', () => {
    const { req, res, next } = mockReqRes('staff');
    isSupervisor(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects areaManager', () => {
    const { req, res, next } = mockReqRes('areaManager');
    isSupervisor(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('RBAC Middleware - isStaff', () => {
  it('allows admin through', () => {
    const { req, res, next } = mockReqRes('admin');
    isStaff(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows staff through', () => {
    const { req, res, next } = mockReqRes('staff');
    isStaff(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows any role through', () => {
    const { req, res, next } = mockReqRes('ceo');
    isStaff(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('RBAC Middleware - isManagerOrAbove', () => {
  it('allows admin', () => {
    const { req, res, next } = mockReqRes('admin');
    isManagerOrAbove(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows areaManager', () => {
    const { req, res, next } = mockReqRes('areaManager');
    isManagerOrAbove(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows branchManager', () => {
    const { req, res, next } = mockReqRes('branchManager');
    isManagerOrAbove(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects supervisor', () => {
    const { req, res, next } = mockReqRes('supervisor');
    isManagerOrAbove(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects staff', () => {
    const { req, res, next } = mockReqRes('staff');
    isManagerOrAbove(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('RBAC Middleware - canApprove', () => {
  it('allows admin', () => {
    const { req, res, next } = mockReqRes('admin');
    canApprove(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows areaManager', () => {
    const { req, res, next } = mockReqRes('areaManager');
    canApprove(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows branchManager', () => {
    const { req, res, next } = mockReqRes('branchManager');
    canApprove(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows supervisor', () => {
    const { req, res, next } = mockReqRes('supervisor');
    canApprove(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects staff', () => {
    const { req, res, next } = mockReqRes('staff');
    canApprove(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('RBAC Middleware - authorize()', () => {
  it('allows matching role', () => {
    const { req, res, next } = mockReqRes('admin');
    const mw = authorize('admin', 'areaManager');
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects non-matching role', () => {
    const { req, res, next } = mockReqRes('staff');
    const mw = authorize('admin', 'areaManager');
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects with no user', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const mw = authorize('admin');
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// Hierarchy visibility tests
describe('Hierarchy - Data visibility logic', () => {
  it('admin should have access to all branches (isBranchManager passes)', () => {
    const { req, res, next } = mockReqRes('admin');
    isBranchManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('branchManager should not see other branches data (isAreaManager fails)', () => {
    const { req, res, next } = mockReqRes('branchManager');
    isAreaManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('staff should only see own data (isSupervisor fails)', () => {
    const { req, res, next } = mockReqRes('staff');
    isSupervisor(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('supervisor can see team data (isBranchManager passes)', () => {
    const { req, res, next } = mockReqRes('supervisor');
    isBranchManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('areaManager can see branch data (isBranchManager passes)', () => {
    const { req, res, next } = mockReqRes('areaManager');
    isBranchManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
