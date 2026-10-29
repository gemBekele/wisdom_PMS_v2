import { jest } from '@jest/globals';

const mockPrisma = {
  accountMapping: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  user: { findFirst: jest.fn(), findMany: jest.fn() },
  juneBalance: { findFirst: jest.fn() },
  loanSchedule: { count: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() },
  productKpiMapping: { findMany: jest.fn().mockResolvedValue([]) },
  dailyTask: { findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
  branch: { findUnique: jest.fn() },
  cBSValidation: { create: jest.fn(), update: jest.fn() },
  cBSDiscrepancy: { createMany: jest.fn() },
};

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../src/utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../src/middleware/asyncHandler.js', () => ({
  asyncHandler: (fn) => (req, res, next) => {
    if (typeof next !== 'function') next = (e) => { if (e) throw e; };
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
}));

import XLSX from 'xlsx';

const {
  createMapping,
  getMappings,
  updateMapping,
  bulkUploadMappings,
} = await import('../src/controllers/mappingController.js');

function mockReq(overrides = {}) {
  return {
    user: { id: 'admin-1', role: 'admin', branchId: 'branch-1' },
    body: {},
    params: {},
    query: {},
    file: null,
    ...overrides,
  };
}
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Mapping Controller', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('createMapping — Savings (default)', () => {
    it('should create a savings mapping with minimal fields', async () => {
      const req = mockReq({
        body: {
          accountNumber: 'SAV-001',
          customerName: 'Test Savings',
          balance: 10000,
        },
      });
      const res = mockRes();

      mockPrisma.accountMapping.create.mockResolvedValue({
        id: 'map-1',
        accountNumber: 'SAV-001',
        customerName: 'Test Savings',
        accountType: 'Savings',
        balance: 10000,
        current_balance: 10000,
        june_balance: 0,
        loan_principal: 0,
        payment_frequency: null,
        loan_maturity_date: null,
        next_payment_date: null,
        interest_rate: 0,
        product: null,
        branchId: 'branch-1',
        mappedToId: null,
        status: 'Active',
      });

      await createMapping(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const call = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      expect(call.accountNumber).toBe('SAV-001');
      expect(call.accountType).toBe('Savings');
      expect(call.loan_principal).toBe(0);
      expect(call.payment_frequency).toBeNull();
    });

    it('should create a loan mapping with all fields', async () => {
      const req = mockReq({
        body: {
          accountNumber: 'LOAN-001',
          customerName: 'Test Loan',
          accountType: 'Loan',
          product: 'LOAN SAVING RESERVE ACCOUNT',
          balance: 200000,
          current_balance: 200000,
          june_balance: 180000,
          loan_principal: 200000,
          payment_frequency: 'Weekly',
          maturity_date: '2029-07-21',
          next_payment_date: '2026-08-01',
          interest_rate: 12,
          mappedTo: 'staff-1',
          branchId: 'branch-1',
        },
      });
      const res = mockRes();

      mockPrisma.accountMapping.create.mockResolvedValue({
        id: 'map-2',
        ...req.body,
        accountType: 'Loan',
        payment_frequency: 'Weekly',
        loan_maturity_date: new Date('2029-07-21'),
        next_payment_date: new Date('2026-08-01'),
        mappedToId: 'staff-1',
        _id: 'map-2',
      });

      await createMapping(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const data = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      expect(data.accountType).toBe('Loan');
      expect(data.loan_principal).toBe(200000);
      expect(data.payment_frequency).toBe('Weekly');
      expect(data.loan_maturity_date).toEqual(new Date('2029-07-21'));
      expect(data.next_payment_date).toEqual(new Date('2026-08-01'));
      expect(data.interest_rate).toBe(12);
    });

    it('should default missing accountType to Savings', async () => {
      const req = mockReq({
        body: {
          accountNumber: 'SAV-002',
          customerName: 'No Type',
          balance: 5000,
        },
      });
      const res = mockRes();

      mockPrisma.accountMapping.create.mockResolvedValue({ id: 'map-3' });

      await createMapping(req, res);
      const data = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      expect(data.accountType).toBe('Savings');
    });

    it('should handle null optional loan fields gracefully', async () => {
      const req = mockReq({
        body: {
          accountNumber: 'LOAN-NULL',
          customerName: 'Null Loan',
          accountType: 'Loan',
          balance: 50000,
        },
      });
      const res = mockRes();

      mockPrisma.accountMapping.create.mockResolvedValue({ id: 'map-4' });

      await createMapping(req, res);
      const data = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      expect(data.loan_principal).toBe(0);
      expect(data.payment_frequency).toBeNull();
      expect(data.loan_maturity_date).toBeNull();
      expect(data.next_payment_date).toBeNull();
    });
  });

  describe('bulkUploadMappings', () => {
    const buildXlsxMock = (rows) => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const tmpPath = '/tmp/test_bulk_' + Date.now() + '.xlsx';
      XLSX.writeFile(wb, tmpPath);
      return tmpPath;
    };

    it('should bulk upload savings accounts', async () => {
      const tmpPath = buildXlsxMock([
        {
          'Account Number': 'BULK-SAV-001',
          'Customer Name': 'Bulk Saver 1',
          'Balance': 15000,
          'June Balance': 14000,
          'Staff ID': 'STF-001',
          'Account Type': 'Savings',
        },
        {
          'Account Number': 'BULK-SAV-002',
          'Customer Name': 'Bulk Saver 2',
          'Balance': 25000,
          'June Balance': 24000,
          'Staff ID': 'STF-001',
          'Account Type': 'Savings',
        },
      ]);

      const req = mockReq({
        file: { path: tmpPath },
        body: { branchId: 'branch-1' },
      });
      const res = mockRes();

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-1', name: 'Staff One', branchId: 'branch-1', employeeId: 'STF-001' });
      mockPrisma.accountMapping.findUnique.mockResolvedValue(null);
      mockPrisma.accountMapping.create.mockResolvedValue({});

      await bulkUploadMappings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonData = res.json.mock.calls[0][0];
      expect(jsonData.success).toBe(true);
      expect(jsonData.data.created).toBe(2);
      expect(jsonData.data.errors.length).toBe(0);

      const createCalls = mockPrisma.accountMapping.create.mock.calls;
      expect(createCalls[0][0].data.accountType).toBe('Savings');
      expect(createCalls[1][0].data.accountType).toBe('Savings');
    });

    it('should bulk upload loan accounts with all fields', async () => {
      const tmpPath = buildXlsxMock([
        {
          'Account Number': 'BULK-LOAN-001',
          'Customer Name': 'Bulk Loaner 1',
          'Balance': 100000,
          'June Balance': 90000,
          'Staff ID': 'STF-002',
          'Account Type': 'Loan',
          'Product': 'LOAN SAVING RESERVE ACCOUNT',
          'Payment Frequency': 'Monthly',
          'Loan Principal': 100000,
          'Maturity Date': '2029-08-15',
        },
      ]);

      const req = mockReq({
        file: { path: tmpPath },
        body: { branchId: 'branch-1' },
      });
      const res = mockRes();

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-2', name: 'Staff Two', branchId: 'branch-1', employeeId: 'STF-002' });
      mockPrisma.accountMapping.findUnique.mockResolvedValue(null);
      mockPrisma.accountMapping.create.mockResolvedValue({});

      await bulkUploadMappings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      expect(data.accountType).toBe('Loan');
      expect(data.product).toBe('LOAN SAVING RESERVE ACCOUNT');
      expect(data.payment_frequency).toBe('Monthly');
      expect(data.loan_principal).toBe(100000);
      expect(data.loan_maturity_date).toEqual(new Date('2029-08-15'));
    });

    it('should update existing mapping instead of creating', async () => {
      const tmpPath = buildXlsxMock([
        {
          'Account Number': 'EXISTING-001',
          'Customer Name': 'Existing Account',
          'Balance': 50000,
          'June Balance': 48000,
          'Staff ID': 'STF-001',
          'Account Type': 'Loan',
          'Payment Frequency': 'Weekly',
          'Loan Principal': 50000,
          'Maturity Date': '2028-12-31',
        },
      ]);

      const req = mockReq({
        file: { path: tmpPath },
        body: { branchId: 'branch-1' },
      });
      const res = mockRes();

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-1', name: 'Staff One', branchId: 'branch-1', employeeId: 'STF-001' });
      mockPrisma.accountMapping.findUnique.mockResolvedValue({
        id: 'existing-map-1',
        accountNumber: 'EXISTING-001',
        customerName: 'Old Name',
      });
      mockPrisma.accountMapping.update.mockResolvedValue({});

      await bulkUploadMappings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data.updated).toBe(1);
      expect(res.json.mock.calls[0][0].data.created).toBe(0);

      const updateData = mockPrisma.accountMapping.update.mock.calls[0][0].data;
      expect(updateData.accountType).toBe('Loan');
      expect(updateData.payment_frequency).toBe('Weekly');
      expect(updateData.loan_principal).toBe(50000);
    });

    it('should reject rows with missing required fields', async () => {
      const tmpPath = buildXlsxMock([
        {
          'Account Number': '',
          'Customer Name': 'No Account Number',
          'Balance': 1000,
          'June Balance': 1000,
          'Staff ID': 'STF-001',
        },
      ]);

      const req = mockReq({
        file: { path: tmpPath },
        body: { branchId: 'branch-1' },
      });
      const res = mockRes();

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-1', name: 'Staff One', branchId: 'branch-1', employeeId: 'STF-001' });

      await bulkUploadMappings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data.errors.length).toBe(1);
      expect(res.json.mock.calls[0][0].data.created).toBe(0);
    });

    it('should handle mixed savings and loan rows in one upload', async () => {
      const tmpPath = buildXlsxMock([
        {
          'Account Number': 'MIX-SAV-001',
          'Customer Name': 'Mixed Saver',
          'Balance': 20000,
          'June Balance': 19000,
          'Staff ID': 'STF-003',
          'Account Type': 'Savings',
        },
        {
          'Account Number': 'MIX-LOAN-001',
          'Customer Name': 'Mixed Loaner',
          'Balance': 150000,
          'June Balance': 140000,
          'Staff ID': 'STF-003',
          'Account Type': 'Loan',
          'Payment Frequency': 'Monthly',
          'Loan Principal': 150000,
          'Maturity Date': '2029-06-30',
        },
      ]);

      const req = mockReq({
        file: { path: tmpPath },
        body: { branchId: 'branch-1' },
      });
      const res = mockRes();

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-3', name: 'Staff Three', branchId: 'branch-1', employeeId: 'STF-003' });
      mockPrisma.accountMapping.findUnique.mockResolvedValue(null);
      mockPrisma.accountMapping.create.mockResolvedValue({});

      await bulkUploadMappings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data.created).toBe(2);
      expect(res.json.mock.calls[0][0].data.errors.length).toBe(0);

      const savingsCall = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      const loanCall = mockPrisma.accountMapping.create.mock.calls[1][0].data;
      expect(savingsCall.accountType).toBe('Savings');
      expect(savingsCall.loan_principal).toBe(0);
      expect(loanCall.accountType).toBe('Loan');
      expect(loanCall.loan_principal).toBe(150000);
      expect(loanCall.payment_frequency).toBe('Monthly');
    });

    it('should handle missing loan fields gracefully (defaults)', async () => {
      const tmpPath = buildXlsxMock([
        {
          'Account Number': 'LOAN-MIN-001',
          'Customer Name': 'Minimal Loan',
          'Balance': 75000,
          'June Balance': 70000,
          'Staff ID': 'STF-004',
          'Account Type': 'Loan',
        },
      ]);

      const req = mockReq({
        file: { path: tmpPath },
        body: { branchId: 'branch-1' },
      });
      const res = mockRes();

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-4', name: 'Staff Four', branchId: 'branch-1', employeeId: 'STF-004' });
      mockPrisma.accountMapping.findUnique.mockResolvedValue(null);
      mockPrisma.accountMapping.create.mockResolvedValue({});

      await bulkUploadMappings(req, res);

      const data = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      expect(data.accountType).toBe('Loan');
      expect(data.payment_frequency).toBeNull();
      expect(data.loan_principal).toBe(0);
      expect(data.loan_maturity_date).toBeNull();
    });

    it('should default to Savings when accountType not provided', async () => {
      const tmpPath = buildXlsxMock([
        {
          'Account Number': 'NO-TYPE-001',
          'Customer Name': 'No Type Specified',
          'Balance': 5000,
          'June Balance': 5000,
          'Staff ID': 'STF-005',
        },
      ]);

      const req = mockReq({
        file: { path: tmpPath },
        body: { branchId: 'branch-1' },
      });
      const res = mockRes();

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'staff-5', name: 'Staff Five', branchId: 'branch-1', employeeId: 'STF-005' });
      mockPrisma.accountMapping.findUnique.mockResolvedValue(null);
      mockPrisma.accountMapping.create.mockResolvedValue({});

      await bulkUploadMappings(req, res);

      const data = mockPrisma.accountMapping.create.mock.calls[0][0].data;
      expect(data.accountType).toBe('Savings');
    });
  });

  describe('updateMapping', () => {
    it('should update accountType and payment_frequency', async () => {
      const req = mockReq({
        params: { id: 'map-1' },
        body: {
          accountType: 'Loan',
          payment_frequency: 'Monthly',
          loan_principal: 100000,
        },
      });
      const res = mockRes();

      mockPrisma.accountMapping.findUnique.mockResolvedValue({ id: 'map-1', accountNumber: 'ACC-001' });
      mockPrisma.accountMapping.update.mockResolvedValue({ id: 'map-1' });

      await updateMapping(req, res);

      const data = mockPrisma.accountMapping.update.mock.calls[0][0].data;
      expect(data.accountType).toBe('Loan');
      expect(data.payment_frequency).toBe('Monthly');
      expect(data.loan_principal).toBe(100000);
    });

    it('should return 404 for non-existent mapping', async () => {
      const req = mockReq({
        params: { id: 'nonexistent' },
        body: { accountType: 'Loan' },
      });
      const res = mockRes();

      mockPrisma.accountMapping.findUnique.mockResolvedValue(null);

      await updateMapping(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json.mock.calls[0][0].message).toBe('Mapping not found');
    });
  });

  describe('CBS upload preserves accountType', () => {
    beforeEach(() => {
      mockPrisma.productKpiMapping.findMany.mockResolvedValue([]);
      mockPrisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', name: 'Test Branch', code: 'BR-001' });
      mockPrisma.cBSValidation.create.mockResolvedValue({ id: 'val-1', validationDate: new Date('2026-07-22') });
      mockPrisma.cBSValidation.update.mockResolvedValue({});
      mockPrisma.cBSDiscrepancy.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.dailyTask.findMany.mockResolvedValue([]);
      mockPrisma.accountMapping.upsert.mockImplementation(({ where, create, update }) =>
        Promise.resolve({ id: 'existing-loan-map', accountNumber: where.accountNumber, ...create, ...update, june_balance: 180000 })
      );
      mockPrisma.juneBalance.findFirst.mockResolvedValue(null);
      mockPrisma.loanSchedule.count.mockResolvedValue(0);
    });

    it('should default new CBS accounts to Savings accountType', async () => {
      const { uploadCBS } = await import('../src/controllers/cbsController.js');

      const tmpPath = '/tmp/cbs_test_' + Date.now() + '.xlsx';
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([
        {
          'Account Number': 'CBS-LOAN-001',
          'Customer Name': 'CBS Loan',
          'Balance': 195000,
          'Product': 'LOAN SAVING RESERVE ACCOUNT',
          'Transaction Date': '2026-07-22',
        },
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, tmpPath);

      const req = mockReq({
        file: { path: tmpPath, filename: 'cbs_test.xlsx' },
        body: { branch_code: 'BR-001', validationDate: '2026-07-22' },
      });
      const res = mockRes();

      await uploadCBS(req, res);

      const upsertCall = mockPrisma.accountMapping.upsert.mock.calls[0][0];
      // CBS creates new accounts with Savings default
      expect(upsertCall.create.accountType).toBe('Savings');
    });

    it('should preserve existing mapped accountType when CBS updates', async () => {
      const { uploadCBS } = await import('../src/controllers/cbsController.js');

      const tmpPath = '/tmp/cbs_test2_' + Date.now() + '.xlsx';
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([
        {
          'Account Number': 'CBS-EXISTING-LOAN',
          'Customer Name': 'Existing Loan',
          'Balance': 180000,
          'Product': 'LOAN SAVING RESERVE ACCOUNT',
          'Transaction Date': '2026-07-22',
        },
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, tmpPath);

      const req = mockReq({
        file: { path: tmpPath, filename: 'cbs_test2.xlsx' },
        body: { branch_code: 'BR-001', validationDate: '2026-07-22' },
      });
      const res = mockRes();

      // Set up the upsert mock so the account already exists (update path preserves accountType)
      mockPrisma.accountMapping.upsert.mockImplementation(({ where, create, update }) => {
        // Simulate update: return the mapped account with Loan type
        return Promise.resolve({
          id: 'existing-loan-map',
          accountNumber: where.accountNumber,
          // The existing mapping has Loan type
          accountType: 'Loan',
          customerName: 'Existing Loan',
          current_balance: update.current_balance || 0,
          product: create.product,
          branchId: 'branch-1',
          status: 'Active',
          june_balance: 0,
        });
      });

      await uploadCBS(req, res);

      // The upsert was called - verify the update path doesn't change accountType
      const upsertCall = mockPrisma.accountMapping.upsert.mock.calls[0][0];
      // create has Savings default, but update doesn't touch accountType
      // The existing accountType 'Loan' is preserved since updateData doesn't include it
      expect(upsertCall.update.accountType).toBeUndefined();
      expect(upsertCall.update.current_balance).toBe(180000);
    });
  });
});
