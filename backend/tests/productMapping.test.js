import { jest } from '@jest/globals';

const mockPrisma = {
  productKpiMapping: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), upsert: jest.fn() },
};

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../src/utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../src/middleware/asyncHandler.js', () => ({
  asyncHandler: (fn) => (req, res, next) => {
    if (typeof next !== 'function') next = (e) => { if (e) throw e; };
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
}));

const {
  createMapping, getAllMappings, getMapping, deleteMapping
} = await import('../src/controllers/productKpiMappingController.js');

function mockReq(overrides = {}) {
  return { user: { id: 'admin-1', role: 'admin' }, body: {}, params: {}, query: {}, ...overrides };
}
function mockRes() {
  const res = {}; res.status = jest.fn().mockReturnValue(res); res.json = jest.fn().mockReturnValue(res); return res;
}

describe('Product Mapping Controller', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('createMapping', () => {
    it('rejects missing required fields', async () => {
      const req = mockReq({ body: { cbs_product_name: 'Test' } });
      const res = mockRes();
      await createMapping(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates mapping successfully', async () => {
      mockPrisma.productKpiMapping.upsert.mockResolvedValue({ id: 'map-1', cbs_product_name: 'Test Product', kpi_category: 'Deposit Mobilization' });
      const req = mockReq({ body: { cbs_product_name: 'Test Product', kpi_category: 'Deposit Mobilization' } });
      const res = mockRes();
      await createMapping(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAllMappings', () => {
    it('returns all active mappings', async () => {
      mockPrisma.productKpiMapping.findMany.mockResolvedValue([
        { id: 'm1', cbs_product_name: 'Product A', kpi_category: 'Deposit Mobilization', status: 'active' }
      ]);
      const req = mockReq({ query: { status: 'active' } });
      const res = mockRes();
      await getAllMappings(req, res, jest.fn());
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('filters by kpi_category', async () => {
      mockPrisma.productKpiMapping.findMany.mockResolvedValue([]);
      const req = mockReq({ query: { kpi_category: 'Deposit Mobilization' } });
      const res = mockRes();
      await getAllMappings(req, res, jest.fn());
      expect(mockPrisma.productKpiMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ kpi_category: 'Deposit_Mobilization' }) })
      );
    });
  });

  describe('deleteMapping', () => {
    it('rejects when not found', async () => {
      mockPrisma.productKpiMapping.findUnique.mockResolvedValue(null);
      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();
      await deleteMapping(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes mapping', async () => {
      mockPrisma.productKpiMapping.findUnique.mockResolvedValue({ id: 'm1', cbs_product_name: 'Test', status: 'active' });
      mockPrisma.productKpiMapping.delete.mockResolvedValue({ id: 'm1' });
      const req = mockReq({ params: { id: 'm1' } });
      const res = mockRes();
      await deleteMapping(req, res, jest.fn());
      expect(mockPrisma.productKpiMapping.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'm1' }) })
      );
    });
  });
});
