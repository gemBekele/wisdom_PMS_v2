import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private (HQ Admin only)
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, entityType, userId, startDate, endDate, limit = 100 } = req.query;

  const where = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });

  res.status(200).json({
    success: true,
    count: auditLogs.length,
    data: auditLogs.map(log => ({
      _id: log.id,
      id: log.id,
      timestamp: log.createdAt,
      createdAt: log.createdAt,
      user: log.user?.name || 'Unknown',
      userName: log.user?.name || 'Unknown',
      action: log.action,
      entity: log.entityName || log.entityType || 'N/A',
      entityName: log.entityName || log.entityType || 'N/A',
      details: log.details || `${log.action} on ${log.entityName || log.entityType || 'entity'}`,
      description: log.details || `${log.action} on ${log.entityName || log.entityType || 'entity'}`,
      entityType: log.entityType,
      ipAddress: log.ipAddress,
    })),
  });
});

// @desc    Get single audit log
// @route   GET /api/audit/:id
// @access  Private (HQ Admin only)
export const getAuditLog = asyncHandler(async (req, res) => {
  const auditLog = await prisma.auditLog.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!auditLog) {
    return res.status(404).json({
      success: false,
      message: 'Audit log not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { ...auditLog, _id: auditLog.id },
  });
});
