import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const buildNotificationWhere = (user) => {
  const base = {};
  if (user.role === 'admin') return base;
  if (user.role === 'staff') {
    base.userId = user.id;
    return base;
  }

  // supervisor: own notifications + supervisees' notifications
  if (user.role === 'supervisor') {
    base.userId = user.id;
    return base;
  }

  // branchManager: branch-level + their own
  if (user.role === 'branchManager') {
    const branchUserIds = prisma.user.findMany({
      where: { branchId: user.branchId, isActive: true },
      select: { id: true },
    }).then(users => users.map(u => u.id));
    // We can't do async in where builder, handle via filter later
  }

  return base;
};

// @desc    Get notifications (paginated)
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, unreadOnly } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};

  // Role-based scoping
  if (req.user.role === 'staff') {
    where.userId = req.user.id;
  } else if (req.user.role === 'admin') {
    // admins see everything
  } else if (req.user.role === 'supervisor') {
    const superviseeIds = await prisma.user.findMany({
      where: { supervisorId: req.user.id, isActive: true },
      select: { id: true },
    });
    const ids = [req.user.id, ...superviseeIds.map(s => s.id)];
    where.userId = { in: ids };
  } else if (req.user.role === 'branchManager') {
    const branchUserIds = await prisma.user.findMany({
      where: { branchId: req.user.branchId, isActive: true },
      select: { id: true },
    });
    const ids = [req.user.id, ...branchUserIds.map(u => u.id)];
    where.userId = { in: ids };
  } else if (req.user.role === 'areaManager') {
    const branches = await prisma.branch.findMany({
      where: { areaId: req.user.areaId },
      select: { id: true },
    });
    const branchIds = branches.map(b => b.id);
    const branchUserIds = await prisma.user.findMany({
      where: { branchId: { in: branchIds }, isActive: true },
      select: { id: true },
    });
    const ids = [req.user.id, ...branchUserIds.map(u => u.id)];
    where.userId = { in: ids };
  } else {
    where.userId = req.user.id;
  }

  if (unreadOnly === 'true') {
    where.read = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.notification.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: notifications.map(n => ({ ...n, _id: n.id })),
  });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  let where = { read: false };

  if (req.user.role === 'staff') {
    where.userId = req.user.id;
  } else {
    // For simplicity, count user's own unread
    where.userId = req.user.id;
  }

  const count = await prisma.notification.count({ where });

  res.status(200).json({
    success: true,
    data: { count },
  });
});

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id },
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  // Only the recipient can mark as read
  if (notification.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  });

  res.status(200).json({
    success: true,
    data: { ...updated, _id: updated.id },
  });
});

// @desc    Mark all notifications as read
// @route   POST /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const { role } = req.query;

  let where = { read: false, userId: req.user.id };

  const { count } = await prisma.notification.updateMany({
    where,
    data: { read: true },
  });

  res.status(200).json({
    success: true,
    message: `${count} notifications marked as read`,
    data: { count },
  });
});
