import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import XLSX from 'xlsx';
import fs from 'fs';

// @desc    Import baseline balance snapshot
// @route   POST /api/june-balance/import
// @access  Private (Admin)
export const importJuneBalance = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a baseline balance file',
    });
  }

  const baseline_period = req.body.baseline_period || '2025';
  const baseline_date_str = req.body.baseline_date || '2025-06-30';
  const make_active = req.body.make_active !== 'false';
  const baseline_date = new Date(baseline_date_str);

  if (isNaN(baseline_date.getTime())) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'Invalid baseline_date format. Use YYYY-MM-DD',
    });
  }

  try {
    const workbook = XLSX.read(fs.readFileSync(req.file.path), { type: 'buffer' });
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
      imported: 0,
      updated: 0,
      errors: [],
    };

    const records = [];
    const seen = new Set();

    for (const row of data) {
      const account_id = String(row.account_id || row.accountId || row['Account ID'] || '').trim();
      const june_balance = Number(row.june_balance ?? row.juneBalance ?? row['June Balance'] ?? 0);
      const accountNumber = String(row.accountNumber || row.account_number || row['Account Number'] || '').trim();
      const branch_code = String(row.branch_code || row.branchCode || row['Branch Code'] || '').trim().toUpperCase();

      if (!account_id) {
        results.errors.push('Row missing account_id');
        continue;
      }
      if (seen.has(account_id)) {
        results.errors.push(`Duplicate account_id in file: ${account_id}`);
        continue;
      }
      if (!Number.isFinite(june_balance) || june_balance < 0) {
        results.errors.push(`Invalid june_balance for account ${account_id}`);
        continue;
      }

      seen.add(account_id);
      records.push({ account_id, accountNumber, june_balance, branch_code });
    }

    if (records.length === 0 || results.errors.length > 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'No rows were imported. Fix the file errors and try again.',
        data: results,
      });
    }

    const existingRows = await prisma.juneBalance.findMany({
      where: { baseline_period, account_id: { in: records.map(r => r.account_id) } },
      select: { account_id: true },
    });
    const existingIds = new Set(existingRows.map(r => r.account_id));

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        await tx.juneBalance.upsert({
          where: {
            account_id_baseline_period: {
              account_id: record.account_id,
              baseline_period,
            },
          },
          update: {
            accountNumber: record.accountNumber || null,
            june_balance: record.june_balance,
            branch_code: record.branch_code || null,
            baseline_date,
            is_active: make_active,
            importedById: req.user.id,
            importedAt: new Date(),
          },
          create: {
            account_id: record.account_id,
            accountNumber: record.accountNumber || null,
            june_balance: record.june_balance,
            branch_code: record.branch_code || null,
            baseline_period,
            baseline_date,
            is_active: make_active,
            importedById: req.user.id,
          },
        });
        if (existingIds.has(record.account_id)) results.updated++;
        else results.imported++;
      }

      if (make_active) {
        await tx.juneBalance.updateMany({
          where: { is_active: true, baseline_period: { not: baseline_period } },
          data: { is_active: false },
        });
      }
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    await logAudit(
      req.user.id,
      'Baseline Balance Import',
      'JuneBalance',
      null,
      `${baseline_period} Baseline`,
      `Imported ${results.imported}, updated ${results.updated} balances`,
      req
    );

    res.status(200).json({
      success: true,
      message: `Successfully imported balances for ${baseline_period}`,
      data: results,
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw error;
  }
});

// @desc    Get June balance by account
// @route   GET /api/june-balance/:accountId
// @access  Private
export const getJuneBalance = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { baseline_period } = req.query;

  const where = {
    OR: [
      { account_id: accountId },
      { accountNumber: accountId },
    ]
  };

  if (baseline_period) {
    where.baseline_period = baseline_period;
  } else {
    where.is_active = true;
  }

  const juneBalance = await prisma.juneBalance.findFirst({ where });

  if (!juneBalance) {
    return res.status(404).json({
      success: false,
      message: 'Baseline balance not found for this account',
    });
  }

  const accountNumber = juneBalance.accountNumber || juneBalance.account_id;
  const account = await prisma.accountMapping.findUnique({
    where: { accountNumber },
    select: { mappedToId: true, branchId: true, branch: { select: { areaId: true } } },
  });

  const actorRole = req.user.role;
  const canAccess =
    actorRole === 'admin' ||
    (account && account.mappedToId === req.user.id) ||
    (account && ['branchManager', 'supervisor'].includes(actorRole) && req.user.branchId && account.branchId === req.user.branchId) ||
    (account && actorRole === 'areaManager' && req.user.areaId && account.branch?.areaId === req.user.areaId);

  if (!canAccess) {
    return res.status(403).json({ success: false, message: 'You are not authorized to view this baseline' });
  }

  res.status(200).json({
    success: true,
    data: { ...juneBalance, _id: juneBalance.id },
  });
});

// @desc    Get all June balances
// @route   GET /api/june-balance
// @access  Private (Admin)
export const getAllJuneBalances = asyncHandler(async (req, res) => {
  const { branch_code, baseline_period, is_active } = req.query;

  const where = {};
  if (branch_code) where.branch_code = branch_code.toUpperCase().trim();
  if (baseline_period) where.baseline_period = baseline_period;
  if (is_active !== undefined) where.is_active = is_active === 'true';

  const balances = await prisma.juneBalance.findMany({
    where,
    orderBy: [{ account_id: 'asc' }, { baseline_period: 'desc' }],
    take: 1000,
  });

  res.status(200).json({
    success: true,
    count: balances.length,
    data: balances.map(b => ({ ...b, _id: b.id })),
  });
});

// @desc    Get list of all baseline periods
// @route   GET /api/june-balance/periods/list
// @access  Private (Admin)
export const getBaselinePeriods = asyncHandler(async (req, res) => {
  // Prisma doesn't have a direct "distinct" that returns full objects easily,
  // so we'll use groupBy
  const groups = await prisma.juneBalance.groupBy({
    by: ['baseline_period'],
    _count: {
      account_id: true
    }
  });

  const periodsWithDetails = await Promise.all(
    groups.map(async (group) => {
      const sample = await prisma.juneBalance.findFirst({
        where: { baseline_period: group.baseline_period }
      });
      const activeSample = await prisma.juneBalance.findFirst({
        where: { baseline_period: group.baseline_period, is_active: true }
      });

      return {
        baseline_period: group.baseline_period,
        baseline_date: sample?.baseline_date,
        account_count: group._count.account_id,
        is_active: !!activeSample,
        importedAt: sample?.importedAt,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: periodsWithDetails.sort((a, b) => b.baseline_period.localeCompare(a.baseline_period)),
  });
});

// @desc    Activate a baseline period
// @route   PUT /api/june-balance/periods/:period/activate
// @access  Private (Admin)
export const activateBaselinePeriod = asyncHandler(async (req, res) => {
  const { period } = req.params;

  await prisma.$transaction([
    prisma.juneBalance.updateMany({
      where: { is_active: true },
      data: { is_active: false }
    }),
    prisma.juneBalance.updateMany({
      where: { baseline_period: period },
      data: { is_active: true }
    })
  ]);

  await logAudit(
    req.user.id,
    'Baseline Activation',
    'JuneBalance',
    null,
    `${period} Baseline`,
    `Activated ${period} baseline period`,
    req
  );

  res.status(200).json({
    success: true,
    message: `Activated ${period} baseline period`,
  });
});
