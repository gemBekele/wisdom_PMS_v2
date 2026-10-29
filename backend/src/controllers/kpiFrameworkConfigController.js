import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';

export const getKpiConfig = asyncHandler(async (req, res) => {
  let configs = await prisma.kpiFrameworkConfig.findMany({ orderBy: { weight: 'desc' } });

  if (configs.length === 0) {
    const defaults = [
      { kpiId: 'Account_Productivity', name: 'Account Productivity', weight: 30, minBalance: 1000 },
      { kpiId: 'Deposit_Mobilization', name: 'Deposit Mobilization', weight: 24, minBalance: 1000 },
      { kpiId: 'Internal_Operations', name: 'Internal Operations', weight: 12, minBalance: 0 },
      { kpiId: 'Share_Capital_Growth', name: 'Share Capital Growth', weight: 9, minBalance: 0 },
      { kpiId: 'New_Member_Registration', name: 'New Member Registration', weight: 6, minBalance: 0 },
      { kpiId: 'New_Account_Opening', name: 'New Account Opening', weight: 6, minBalance: 0 },
      { kpiId: 'Mobile_Banking_Users', name: 'Mobile Banking Users', weight: 5, minBalance: 0 },
      { kpiId: 'Billers_Recruitment', name: 'Billers Recruitment', weight: 5, minBalance: 0 },
      { kpiId: 'Merchant_POS_Growth', name: 'Merchant POS Growth', weight: 3, minBalance: 0 },
      { kpiId: 'Collection_Rate', name: 'Collection Rate', weight: 8, minBalance: 0 },
      { kpiId: 'Portfolio_Quality', name: 'Portfolio Quality', weight: 7, minBalance: 0 },
    ];
    for (const d of defaults) {
      await prisma.kpiFrameworkConfig.upsert({
        where: { kpiId: d.kpiId },
        update: d,
        create: d,
      });
    }
    configs = await prisma.kpiFrameworkConfig.findMany({ orderBy: { weight: 'desc' } });
  }

  res.status(200).json({ success: true, data: configs });
});

export const updateKpiConfig = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { weight, minBalance } = req.body;

  const existing = await prisma.kpiFrameworkConfig.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'KPI config not found' });
  }

  const updated = await prisma.kpiFrameworkConfig.update({
    where: { id },
    data: {
      ...(weight !== undefined ? { weight } : {}),
      ...(minBalance !== undefined ? { minBalance } : {}),
    }
  });

  await logAudit(
    req.user.id,
    'KPI Framework Updated',
    'KPI Framework',
    existing.kpiId,
    existing.name,
    `Updated weight to ${weight}, minBalance to ${minBalance}`,
    req
  );

  res.status(200).json({ success: true, data: updated });
});

export const resetKpiConfig = asyncHandler(async (req, res) => {
  const defaults = [
    { kpiId: 'Account_Productivity', name: 'Account Productivity', weight: 30, minBalance: 1000 },
    { kpiId: 'Deposit_Mobilization', name: 'Deposit Mobilization', weight: 24, minBalance: 1000 },
    { kpiId: 'Internal_Operations', name: 'Internal Operations', weight: 12, minBalance: 0 },
    { kpiId: 'Share_Capital_Growth', name: 'Share Capital Growth', weight: 9, minBalance: 0 },
    { kpiId: 'New_Member_Registration', name: 'New Member Registration', weight: 6, minBalance: 0 },
    { kpiId: 'New_Account_Opening', name: 'New Account Opening', weight: 6, minBalance: 0 },
    { kpiId: 'Mobile_Banking_Users', name: 'Mobile Banking Users', weight: 5, minBalance: 0 },
    { kpiId: 'Billers_Recruitment', name: 'Billers Recruitment', weight: 5, minBalance: 0 },
    { kpiId: 'Merchant_POS_Growth', name: 'Merchant POS Growth', weight: 3, minBalance: 0 },
    { kpiId: 'Collection_Rate', name: 'Collection Rate', weight: 8, minBalance: 0 },
    { kpiId: 'Portfolio_Quality', name: 'Portfolio Quality', weight: 7, minBalance: 0 },
  ];
  for (const d of defaults) {
    await prisma.kpiFrameworkConfig.upsert({
      where: { kpiId: d.kpiId },
      update: d,
      create: d,
    });
  }

  await logAudit(req.user.id, 'KPI Framework Updated', 'KPI Framework', 'all', 'All KPIs', 'Reset to default weights', req);

  const configs = await prisma.kpiFrameworkConfig.findMany({ orderBy: { weight: 'desc' } });
  res.status(200).json({ success: true, message: 'Reset to defaults', data: configs });
});
