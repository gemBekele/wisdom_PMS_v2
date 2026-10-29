import prisma from '../config/database.js';

/**
 * Create a notification for a user.
 * @param {Object} params
 * @param {string} params.userId - recipient
 * @param {string} params.type - NotificationType enum value
 * @param {string} params.title
 * @param {string} params.message
 * @param {Object} [params.data] - optional JSON payload
 * @param {string} [params.link] - optional deep-link URL
 */
export const createNotification = async ({ userId, type, title, message, data, link }) => {
  return prisma.notification.create({
    data: { userId, type, title, message, data: data || undefined, link },
  });
};

/**
 * Create notifications for multiple users at once.
 * @param {Array<{userId: string, type: string, title: string, message: string, data?: Object, link?: string}>} notifications
 */
export const createManyNotifications = async (notifications) => {
  if (notifications.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: notifications.map(n => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data || undefined,
      link: n.link || undefined,
    })),
  });
};

/**
 * Notify staff about their mapped account updates.
 * Gets the staff user ID from mappedToId.
 */
export const notifyStaffMappingUpdated = async ({ accountNumber, customerName, staffId, action }) => {
  if (!staffId) return;
  return createNotification({
    userId: staffId,
    type: 'MAPPING_UPDATED',
    title: 'Account Mapping Updated',
    message: `Account ${accountNumber} (${customerName}) has been ${action}`,
    data: { accountNumber, customerName, action },
    link: null,
  });
};

/**
 * Notify branch manager and area manager about CBS validation results.
 */
export const notifyCbsValidation = async ({ branchId, branchName, validationId, matched, total, discrepancies }) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { areaId: true },
  });

  const managerRole = 'branchManager';
  const areaManagerRole = 'areaManager';

  const branchManagers = await prisma.user.findMany({
    where: { branchId, role: managerRole, isActive: true },
    select: { id: true },
  });

  const areaManagers = branch?.areaId
    ? await prisma.user.findMany({
        where: { areaId: branch.areaId, role: areaManagerRole, isActive: true },
        select: { id: true },
      })
    : [];

  const notifications = [
    ...branchManagers.map(m => ({
      userId: m.id,
      type: 'CBS_VALIDATION',
      title: 'CBS File Processed',
      message: `CBS validation for ${branchName}: ${matched}/${total} records matched${discrepancies > 0 ? `, ${discrepancies} discrepancies` : ''}`,
      data: { branchId, validationId, matched, total, discrepancies },
      link: `/cbs/validations/${validationId}`,
    })),
    ...areaManagers.map(m => ({
      userId: m.id,
      type: 'CBS_VALIDATION',
      title: 'CBS File Processed',
      message: `CBS validation for ${branchName}: ${matched}/${total} records matched${discrepancies > 0 ? `, ${discrepancies} discrepancies` : ''}`,
      data: { branchId, validationId, matched, total, discrepancies },
      link: `/cbs/validations/${validationId}`,
    })),
  ];

  return createManyNotifications(notifications);
};

/**
 * Notify staff and supervisors about NPL alerts.
 */
export const notifyNplAlert = async ({ accountNumber, customerName, dpd, staffId, supervisorId }) => {
  const notifications = [];

  if (staffId) {
    notifications.push({
      userId: staffId,
      type: 'NPL_ALERT',
      title: 'NPL Alert - Overdue Account',
      message: `Account ${accountNumber} (${customerName}) is ${dpd} days past due`,
      data: { accountNumber, customerName, dpd },
      link: `/npl/staff`,
    });
  }

  if (supervisorId) {
    notifications.push({
      userId: supervisorId,
      type: 'NPL_ALERT',
      title: 'NPL Alert - Team Overdue',
      message: `Staff account ${accountNumber} (${customerName}) is ${dpd} days past due`,
      data: { accountNumber, customerName, dpd },
      link: `/npl/team`,
    });
  }

  return createManyNotifications(notifications);
};

/**
 * Notify a staff member about plan achievement.
 */
export const notifyPlanAchievement = async ({ userId, targetType, achieved, target }) => {
  return createNotification({
    userId,
    type: 'PLAN_ACHIEVEMENT',
    title: 'Plan Target Achieved',
    message: `You've achieved your ${targetType} target: ${achieved}/${target}`,
    data: { targetType, achieved, target },
    link: `/plans/my`,
  });
};

/**
 * Notify task submitter about approval/rejection.
 */
export const notifyTaskApproval = async ({ userId, accountNumber, amount, status, comments, approverName }) => {
  const action = status === 'Approved' ? 'approved' : 'rejected';
  const reasonText = status === 'Rejected' && comments
    ? ` Reason: ${comments}`
    : '';
  const byText = status === 'Rejected' && approverName
    ? ` by ${approverName}`
    : '';
  return createNotification({
    userId,
    type: status === 'Approved' ? 'TASK_APPROVED' : 'TASK_REJECTED',
    title: `Task ${status}`,
    message: `Your task for account ${accountNumber} (${amount}) was ${action}${byText}.${reasonText}`,
    data: { accountNumber, amount, status, comments, approverName },
    link: `/tasks`,
  });
};

/**
 * Notify staff about auto-balanced accounts.
 */
export const notifyAutoBalance = async ({ staffId, count }) => {
  if (!staffId) return;
  return createNotification({
    userId: staffId,
    type: 'AUTO_BALANCE',
    title: 'Accounts Auto-Assigned',
    message: `${count} account(s) have been auto-assigned to you`,
    data: { count },
    link: `/mappings`,
  });
};
