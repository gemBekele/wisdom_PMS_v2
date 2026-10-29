import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';

export const getTransactions = asyncHandler(async (req, res) => {
  const { account_no, branch_code, startDate, endDate, limit } = req.query;

  const where = {};
  if (account_no) where.account_no = account_no;
  if (branch_code) where.branch_code = branch_code;
  if (startDate || endDate) {
    where.transaction_date = {};
    if (startDate) where.transaction_date.gte = new Date(startDate);
    if (endDate) where.transaction_date.lte = new Date(endDate);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { transaction_date: 'desc' },
    take: limit ? parseInt(limit) : 100,
  });

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions.map(t => ({ ...t, _id: t.id })),
  });
});

export const createTransaction = asyncHandler(async (req, res) => {
  const { account_no, transaction_type, credit, debit, description, transaction_date, branch_code, reference } = req.body;

  if (!account_no) {
    return res.status(400).json({ success: false, message: 'account_no is required' });
  }

  const transaction = await prisma.transaction.create({
    data: {
      account_no,
      transaction_type: transaction_type || 'credit',
      credit: parseFloat(credit || 0),
      debit: parseFloat(debit || 0),
      description: description || null,
      transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
      branch_code: branch_code || null,
      reference: reference || null,
    },
  });

  await logAudit(
    req.user.id, 'Transaction', 'System', transaction.id,
    `Transaction: ${account_no}`, `Created ${transaction_type} transaction`,
    req
  );

  res.status(201).json({ success: true, data: { ...transaction, _id: transaction.id } });
});

export const getTodayTotal = asyncHandler(async (req, res) => {
  const { branch_code } = req.query;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const where = { transaction_date: { gte: todayStart } };
  if (branch_code) where.branch_code = branch_code;

  const result = await prisma.transaction.aggregate({
    where,
    _sum: { credit: true, debit: true },
    _count: true,
  });

  res.status(200).json({
    success: true,
    data: {
      totalCredit: result._sum.credit || 0,
      totalDebit: result._sum.debit || 0,
      transactionCount: result._count,
    },
  });
});
