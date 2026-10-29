import prisma from '../config/database.js';
import { AUDIT_ACTION_TO_ENUM } from './prismaHelpers.js';

export const logAudit = async (userId, action, entityType, entityId, entityName, details, req = null) => {
  try {
    // Convert action string to enum value
    const actionEnum = AUDIT_ACTION_TO_ENUM[action] || action;

    await prisma.auditLog.create({
      data: {
        userId: userId?.toString() || userId,
        action: actionEnum,
        entityType: entityType || null,
        entityId: entityId?.toString() || null,
        entityName: entityName || null,
        details: details || null,
        ipAddress: req?.ip || req?.connection?.remoteAddress || null,
        userAgent: req?.get?.('user-agent') || null,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the main flow
  }
};
