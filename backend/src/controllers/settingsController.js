import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';

export const BALANCE_SOURCE_KEY = 'balance_source';
export const BALANCE_SOURCE_DEFAULT = 'approval';

export const getBalanceSource = asyncHandler(async (req, res) => {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: BALANCE_SOURCE_KEY },
  });

  res.status(200).json({
    success: true,
    data: { balanceSource: setting?.value || BALANCE_SOURCE_DEFAULT },
  });
});

export const updateBalanceSource = asyncHandler(async (req, res) => {
  const { balanceSource } = req.body;

  if (balanceSource !== 'cbs' && balanceSource !== 'approval') {
    return res.status(400).json({
      success: false,
      message: "balanceSource must be either 'cbs' or 'approval'",
    });
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key: BALANCE_SOURCE_KEY },
    update: { value: balanceSource, updatedBy: req.user.id },
    create: { key: BALANCE_SOURCE_KEY, value: balanceSource, updatedBy: req.user.id },
  });

  await logAudit(
    req.user.id,
    'Balance Source Updated',
    'SystemSetting',
    setting.id,
    BALANCE_SOURCE_KEY,
    `Balance source set to ${balanceSource}`,
    req
  );
  res.status(200).json({
    success: true,
    data: { balanceSource: setting.value },
  });
});
