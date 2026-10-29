import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { ACCOUNT_TYPE_TO_ENUM, PAYMENT_FREQUENCY_MAP } from '../utils/prismaHelpers.js';
import { notifyStaffMappingUpdated, notifyAutoBalance } from '../utils/notificationService.js';

const toISODate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// @desc    Get all account mappings
// @route   GET /api/mappings
// @access  Private
export const getMappings = asyncHandler(async (req, res) => {
  const { branchId, mappedTo, status, accountNumber } = req.query;

  const where = {};

  if (req.user.role === 'staff') {
    where.mappedToId = req.user.id;
  } else if (req.user.role === 'supervisor') {
    const supervisedStaff = await prisma.user.findMany({
      where: { supervisorId: req.user.id, isActive: true },
      select: { id: true },
    });
    const staffIds = supervisedStaff.map(s => s.id);
    if (staffIds.length > 0) {
      where.OR = [
        { mappedToId: { in: staffIds } },
        { mappedToId: req.user.id },
      ];
    } else {
      where.mappedToId = req.user.id;
    }
  } else if (branchId) {
    where.branchId = branchId;
  } else if (req.user.branchId) {
    where.branchId = req.user.branchId;
  }

  if (mappedTo) where.mappedToId = mappedTo;
  if (status) {
    where.status = status === 'Unmapped' ? 'Inactive' : status;
  }
  if (accountNumber) {
    where.accountNumber = { contains: accountNumber, mode: 'insensitive' };
  }

  const mappings = await prisma.accountMapping.findMany({
    where,
    include: {
      mappedTo: { select: { id: true, name: true, employeeId: true, role: true } },
      branch: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: mappings.length,
    data: mappings.map(m => ({
      ...m,
      _id: m.id,
      mappedTo: m.mappedTo ? { ...m.mappedTo, _id: m.mappedTo.id } : null,
      branchId: m.branch ? { ...m.branch, _id: m.branch.id } : null,
    })),
  });
});

// @desc    Create account mapping
// @route   POST /api/mappings
// @access  Private (Branch Manager, HQ Admin)
export const createMapping = asyncHandler(async (req, res) => {
  const accountType = ACCOUNT_TYPE_TO_ENUM[req.body.accountType] || req.body.accountType;
  const paymentFreq = req.body.payment_frequency || req.body.paymentFrequency || null;

  const mapping = await prisma.accountMapping.create({
    data: {
      accountNumber: req.body.accountNumber,
      customerName: req.body.customerName,
      accountType: accountType || 'Savings',
      product: req.body.product || null,
      balance: parseFloat(req.body.balance || 0),
      june_balance: parseFloat(req.body.june_balance || 0),
      current_balance: parseFloat(req.body.current_balance || req.body.balance || 0),
      phoneNumber: req.body.phoneNumber || null,
      notes: req.body.notes || null,
      status: req.body.status || 'Active',
      mappedToId: req.body.mappedTo || req.body.mappedToId,
      mappedById: req.user.id,
      branchId: req.body.branchId || req.user.branchId,
      // Loan-specific fields
      loan_principal: parseFloat(req.body.loan_principal || req.body.loanPrincipal || 0) || 0,
      payment_frequency: PAYMENT_FREQUENCY_MAP[paymentFreq] || null,
      loan_maturity_date: toISODate(req.body.loan_maturity_date || req.body.maturity_date || req.body.maturityDate),
      loan_disbursement_date: toISODate(req.body.loan_disbursement_date || req.body.disbursement_date),
      next_payment_date: toISODate(req.body.next_payment_date || req.body.nextPaymentDate),
      interest_rate: parseFloat(req.body.interest_rate || req.body.interestRate || 0) || 0,
    },
  });

  await logAudit(
    req.user.id,
    'Mapping Created',
    'Mapping',
    mapping.id,
    mapping.accountNumber,
    `Created mapping for account ${mapping.accountNumber}`,
    req
  );

  notifyStaffMappingUpdated({
    accountNumber: mapping.accountNumber,
    customerName: mapping.customerName,
    staffId: mapping.mappedToId,
    action: 'created',
  }).catch(() => {});

  res.status(201).json({
    success: true,
    data: { ...mapping, _id: mapping.id },
  });
});

// @desc    Update account mapping
// @route   PUT /api/mappings/:id
// @access  Private (Branch Manager, HQ Admin)
export const updateMapping = asyncHandler(async (req, res) => {
  const existingMapping = await prisma.accountMapping.findUnique({
    where: { id: req.params.id }
  });

  if (!existingMapping) {
    return res.status(404).json({
      success: false,
      message: 'Mapping not found',
    });
  }

  const updateData = { ...req.body };
  if (updateData.accountType) updateData.accountType = ACCOUNT_TYPE_TO_ENUM[updateData.accountType] || updateData.accountType;
  if (updateData.payment_frequency || updateData.paymentFrequency) {
    updateData.payment_frequency = PAYMENT_FREQUENCY_MAP[updateData.payment_frequency || updateData.paymentFrequency] || null;
  }
  if (updateData.mappedTo) {
    updateData.mappedToId = updateData.mappedTo;
    delete updateData.mappedTo;
  }
  if (updateData.branchId) {
    updateData.branchId = updateData.branchId;
  }
  delete updateData.paymentFrequency;

  const mapping = await prisma.accountMapping.update({
    where: { id: req.params.id },
    data: updateData,
  });

  await logAudit(
    req.user.id,
    'Mapping Updated',
    'Mapping',
    mapping.id,
    mapping.accountNumber,
    `Updated mapping for account ${mapping.accountNumber}`,
    req
  );

  notifyStaffMappingUpdated({
    accountNumber: mapping.accountNumber,
    customerName: mapping.customerName,
    staffId: mapping.mappedToId || existingMapping.mappedToId,
    action: 'updated',
  }).catch(() => {});

  res.status(200).json({
    success: true,
    data: { ...mapping, _id: mapping.id },
  });
});

// @desc    Auto-balance mapping
// @route   POST /api/mappings/auto-balance
// @access  Private (Branch Manager, HQ Admin)
export const autoBalanceMapping = asyncHandler(async (req, res) => {
  let { branchId } = req.body;
  // If branchId is an object (from populated user data), extract the id
  if (branchId && typeof branchId === 'object') {
    branchId = branchId.id || branchId._id;
  }
  const targetBranchId = branchId || req.user.branchId;

  const unmappedAccounts = await prisma.accountMapping.findMany({
    where: {
      branchId: targetBranchId,
      status: 'Inactive',
    },
  });

  const staff = await prisma.user.findMany({
    where: {
      branchId: targetBranchId,
      role: 'staff',
      isActive: true,
    },
  });

  if (staff.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No active staff found in branch',
    });
  }

  const accountsPerStaff = Math.floor(unmappedAccounts.length / staff.length);
  let accountIndex = 0;
  let updateCount = 0;

  for (let i = 0; i < staff.length && accountIndex < unmappedAccounts.length; i++) {
    const endIndex = Math.min(accountIndex + accountsPerStaff, unmappedAccounts.length);

    for (let j = accountIndex; j < endIndex; j++) {
      await prisma.accountMapping.update({
        where: { id: unmappedAccounts[j].id },
        data: {
          mappedToId: staff[i].id,
          status: 'Active',
          isAutoBalanced: true,
          mappedById: req.user.id,
        }
      });
      updateCount++;
    }

    const staffAccountCount = endIndex - accountIndex;
    notifyAutoBalance({ staffId: staff[i].id, count: staffAccountCount }).catch(() => {});

    accountIndex = endIndex;
  }

  await logAudit(
    req.user.id,
    'Mapping Updated',
    'Mapping',
    null,
    'Auto-Balance',
    `Auto-balanced ${updateCount} accounts`,
    req
  );

  res.status(200).json({
    success: true,
    message: `Auto-balanced ${updateCount} accounts`,
    data: {
      accountsBalanced: updateCount,
      staffCount: staff.length,
    },
  });
});

// @desc    Bulk upload account mappings from Excel
// @route   POST /api/mappings/bulk-upload
// @access  Private (Branch Manager, HQ Admin)
export const bulkUploadMappings = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload an Excel file',
    });
  }

  const targetBranchId = req.body.branchId || req.user.branchId;
  // Branch check removed here to allow automatic detection from staff employeeId in rows

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File is empty or invalid',
      });
    }

    const results = {
      created: 0,
      updated: 0,
      successful: [], // Added for better frontend feedback
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const accountNumber = String(row.accountNumber || row['Account Number'] || '').trim();
        const customerName = String(row.customerName || row['Customer Name'] || '').trim();
        const balance = parseFloat(row.balance || row['Balance'] || row.current_balance || row['Current Balance'] || 0);
        const juneBalance = parseFloat(row.june_balance || row['June Balance'] || row.juneBalance || 0);
        const staffID = String(row.staffID || row['Staff ID'] || row.staffId || row.employeeId || '').trim();
        const phoneNumber = String(row.phoneNumber || row['Phone Number'] || '').trim();
        const accountType = ACCOUNT_TYPE_TO_ENUM[row.accountType || row['Account Type']] || row.accountType || row['Account Type'] || 'Savings';
        const product = String(row.product || row['Product'] || row.productName || row['Product Name'] || '').trim() || null;
        const paymentFreqStr = String(row.payment_frequency || row['Payment Frequency'] || row.paymentFrequency || '').trim();
        const paymentFrequency = PAYMENT_FREQUENCY_MAP[paymentFreqStr] || null;
        const loanPrincipal = parseFloat(row.loan_principal || row['Loan Principal'] || row.loanPrincipal || 0) || 0;
        const maturityDate = row.maturity_date || row['Maturity Date'] || row.maturityDate || null;

        if (!accountNumber || !customerName || !staffID) {
          results.errors.push({
            row: i + 2,
            accountNumber,
            customerName,
            staffID,
            error: 'Account Number, Customer Name, and Staff ID are required'
          });
          continue;
        }

        // Search for staff globally first if targetBranchId isn't reliable
        const staffMember = await prisma.user.findFirst({
          where: {
            employeeId: staffID,
            isActive: true,
          }
        });

        if (!staffMember) {
          results.errors.push({
            row: i + 2,
            accountNumber,
            customerName,
            staffID,
            error: `Staff with ID '${staffID}' not found in system`
          });
          continue;
        }

        // Use the staff member's branch - this makes it work for anyone uploading
        const mappingBranchId = staffMember.branchId;

        if (!mappingBranchId) {
          results.errors.push({
            row: i + 2,
            accountNumber,
            customerName,
            staffID,
            error: `Staff '${staffMember.name}' is not assigned to any branch`
          });
          continue;
        }

        const existingMapping = await prisma.accountMapping.findUnique({ where: { accountNumber } });

        if (existingMapping) {
          await prisma.accountMapping.update({
            where: { id: existingMapping.id },
            data: {
              customerName,
              balance,
              current_balance: balance,
              june_balance: juneBalance,
              mappedToId: staffMember.id,
              branchId: mappingBranchId,
              mappedById: req.user.id,
              phoneNumber: phoneNumber || undefined,
              status: 'Active',
              accountType,
              product: product || undefined,
              ...(paymentFrequency ? { payment_frequency: paymentFrequency } : {}),
              ...(loanPrincipal > 0 ? { loan_principal: loanPrincipal } : {}),
              ...(maturityDate ? { loan_maturity_date: new Date(maturityDate) } : {}),
            }
          });
          results.updated++;
          results.successful.push({
            row: i + 2,
            accountNumber,
            customerName,
            staffID,
            staffName: staffMember.name,
            status: 'Updated'
          });
          notifyStaffMappingUpdated({
            accountNumber, customerName, staffId: staffMember.id, action: 'updated'
          }).catch(() => {});
        } else {
          await prisma.accountMapping.create({
            data: {
              accountNumber,
              customerName,
              accountType,
              product,
              balance,
              current_balance: balance,
              june_balance: juneBalance,
              mappedToId: staffMember.id,
              branchId: mappingBranchId,
              mappedById: req.user.id,
              phoneNumber: phoneNumber || undefined,
              status: 'Active',
              loan_principal: loanPrincipal,
              payment_frequency: paymentFrequency,
              loan_maturity_date: maturityDate ? new Date(maturityDate) : null,
            }
          });
          results.created++;
          results.successful.push({
            row: i + 2,
            accountNumber,
            customerName,
            staffID,
            staffName: staffMember.name,
            status: 'Created'
          });
          notifyStaffMappingUpdated({
            accountNumber, customerName, staffId: staffMember.id, action: 'created'
          }).catch(() => {});
        }
      } catch (error) {
        results.errors.push({
          row: i + 2,
          accountNumber: data[i].accountNumber || 'N/A',
          error: error.message
        });
      }
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    await logAudit(
      req.user.id,
      'Bulk Mapping Upload',
      'Mapping',
      null,
      'Bulk Upload',
      `Processed mappings: ${results.created} created, ${results.updated} updated`,
      req
    );

    res.status(200).json({
      success: true,
      message: `Bulk upload completed`,
      data: results,
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: error.message });
  }
});
