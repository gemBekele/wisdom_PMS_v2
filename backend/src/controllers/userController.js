import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { normalizeRole } from '../utils/roleNormalizer.js';
import { hashPassword, POSITION_TO_ENUM, POSITION_MAP } from '../utils/prismaHelpers.js';

// @desc    Get public list of active users for login dropdown
// @route   GET /api/users/public-list
// @access  Public
export const getPublicUsersList = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      role: true,
      branch_code: true,
      branch: { select: { name: true } },
      area: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const data = users.map(u => {
    const location = u.branch?.name || u.area?.name || u.branch_code || '';
    return {
      _id: u.id,
      id: u.id,
      name: u.name,
      email: u.email,
      position: POSITION_MAP[u.position] || u.position,
      role: u.role,
      branch_code: u.branch_code,
      location,
    };
  });

  res.status(200).json({ success: true, data });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private
export const getUsers = asyncHandler(async (req, res) => {
  const { role, branchId, branch_code, isActive, supervisorId } = req.query;

  const where = {};

  const userRole = normalizeRole(req.user.role);

  if (userRole === 'admin') {
    // Admin can see all
  } else if (userRole === 'branchManager' || userRole === 'supervisor') {
    if (req.user.branchId) {
      where.branchId = req.user.branchId;
    } else if (req.user.branch_code) {
      where.branch_code = req.user.branch_code;
    }
  } else if (userRole === 'areaManager') {
    if (req.user.areaId) {
      where.areaId = req.user.areaId;
    }
  } else {
    where.id = req.user.id;
  }

  if (role) {
    if (Array.isArray(role)) {
      where.role = { in: role };
    } else {
      where.role = role;
    }
  }
  if (branchId) where.branchId = branchId;
  if (branch_code) where.branch_code = branch_code;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (supervisorId) where.supervisorId = supervisorId;

  const users = await prisma.user.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      area: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mappedUsers = users.map(user => ({
    ...user,
    _id: user.id,
    branchId: user.branch ? { ...user.branch, _id: user.branch.id } : null,
    areaId: user.area ? { ...user.area, _id: user.area.id } : null,
    position: POSITION_MAP[user.position] || user.position,
  }));

  res.status(200).json({
    success: true,
    count: mappedUsers.length,
    data: mappedUsers,
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      area: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const mappedUser = {
    ...user,
    _id: user.id,
    branchId: user.branch ? { ...user.branch, _id: user.branch.id } : null,
    areaId: user.area ? { ...user.area, _id: user.area.id } : null,
    position: POSITION_MAP[user.position] || user.position,
  };

  res.status(200).json({
    success: true,
    data: mappedUser,
  });
});

// @desc    Get org hierarchy tree
// @route   GET /api/users/hierarchy
// @access  Private
export const getHierarchy = asyncHandler(async (req, res) => {
  const userRole = normalizeRole(req.user.role);
  let result = {};

  if (userRole === 'admin') {
    const areas = await prisma.area.findMany({
      where: { isActive: true },
      include: {
        manager: { select: { id: true, name: true, email: true, role: true, position: true } },
        branches: {
          where: { isActive: true },
          include: {
            manager: { select: { id: true, name: true, email: true, role: true, position: true } },
            users: {
              where: { isActive: true, role: 'supervisor' },
              select: { id: true, name: true, email: true, role: true, position: true, employeeId: true },
              include: {
                supervisees: {
                  where: { isActive: true },
                  select: { id: true, name: true, email: true, role: true, position: true, employeeId: true },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    result = { areas };
  } else if (userRole === 'areaManager') {
    const areas = await prisma.area.findMany({
      where: { id: req.user.areaId, isActive: true },
      include: {
        manager: { select: { id: true, name: true, email: true, role: true, position: true } },
        branches: {
          where: { isActive: true },
          include: {
            manager: { select: { id: true, name: true, email: true, role: true, position: true } },
            users: {
              where: { isActive: true, role: 'supervisor' },
              select: { id: true, name: true, email: true, role: true, position: true, employeeId: true },
              include: {
                supervisees: {
                  where: { isActive: true },
                  select: { id: true, name: true, email: true, role: true, position: true, employeeId: true },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    result = { areas };
  } else if (userRole === 'branchManager' || userRole === 'supervisor') {
    const branches = await prisma.branch.findMany({
      where: { id: req.user.branchId, isActive: true },
      include: {
        manager: { select: { id: true, name: true, email: true, role: true, position: true } },
        area: { select: { id: true, name: true } },
        users: {
          where: { isActive: true },
          select: { id: true, name: true, email: true, role: true, position: true, employeeId: true, supervisorId: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    result = { branches };
  } else {
    result = { self: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } };
  }

  res.status(200).json({ success: true, data: result });
});

const canCreateRole = (creatorRole, targetRole) => {
  const roleHierarchy = {
    'admin': ['areaManager', 'branchManager', 'supervisor', 'staff'],
    'areaManager': ['branchManager', 'supervisor', 'staff'],
    'branchManager': ['supervisor', 'staff'],
    'supervisor': ['staff'],
    'staff': [],
  };

  return roleHierarchy[creatorRole]?.includes(targetRole) || false;
};

// @desc    Create user
// @route   POST /api/users
// @access  Private
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, position, branch_code, employeeId, branchId, areaId } = req.body;

  if (!position || position.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Position is required',
    });
  }

  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role is required',
    });
  }

  const creatorRole = normalizeRole(req.user.role);
  const targetRole = normalizeRole(role);

  if (!canCreateRole(creatorRole, targetRole)) {
    return res.status(403).json({
      success: false,
      message: `You cannot create a user with role '${role}'. Your role '${req.user.role}' does not have permission.`,
    });
  }

  // Auto-populate areaId/branch_code from branch if not provided
  let resolvedAreaId = areaId || null;
  let resolvedBranchCode = branch_code || null;
  const resolvedBranchId = branchId || req.user.branchId;
  if (resolvedBranchId) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: resolvedBranchId },
        select: { areaId: true, code: true },
      });
      if (branch) {
        if (!resolvedAreaId) resolvedAreaId = branch.areaId;
        if (!resolvedBranchCode) resolvedBranchCode = branch.code;
      }
    } catch (e) {
      console.error('Failed to resolve branch area:', e.message);
    }
  }

  const branchRoles = ['branchManager', 'supervisor', 'staff'];
  if (branchRoles.includes(targetRole) && !resolvedBranchCode) {
    return res.status(400).json({
      success: false,
      message: 'branch_code is required for branch-level users',
    });
  }

  const hashedPassword = await hashPassword(password);

  const positionEnum = POSITION_TO_ENUM[position] || position;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: targetRole,
      position: positionEnum,
      branch_code: resolvedBranchCode || req.user.branch_code,
      employeeId: employeeId || email.split('@')[0],
      branchId: resolvedBranchId,
      areaId: resolvedAreaId,
      isActive: true,
    },
  });

  await logAudit(
    req.user.id,
    'User Created',
    'User',
    user.id,
    user.name,
    `Created user: ${user.name} with position ${position}`,
    req
  );

  // Update parent entity managerId for management roles
  if (targetRole === 'areaManager' && resolvedAreaId) {
    await prisma.area.update({
      where: { id: resolvedAreaId },
      data: { managerId: user.id },
    }).catch(e => console.error('Failed to update area manager:', e.message));
  } else if (targetRole === 'branchManager' && resolvedBranchId) {
    await prisma.branch.update({
      where: { id: resolvedBranchId },
      data: { managerId: user.id },
    }).catch(e => console.error('Failed to update branch manager:', e.message));
  }

  res.status(201).json({
    success: true,
    data: { ...user, _id: user.id, position: POSITION_MAP[user.position] || user.position },
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (HQ Admin)
export const updateUser = asyncHandler(async (req, res) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const updateData = { ...req.body };

  if (updateData.password) {
    updateData.password = await hashPassword(updateData.password);
  }

  if (updateData.position) {
    updateData.position = POSITION_TO_ENUM[updateData.position] || updateData.position;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
  });

  await logAudit(
    req.user.id,
    'User Updated',
    'User',
    user.id,
    user.name,
    `Updated user: ${user.name}`,
    req
  );

  res.status(200).json({
    success: true,
    data: { ...user, _id: user.id, position: POSITION_MAP[user.position] || user.position },
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (HQ Admin)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  await logAudit(
    req.user.id,
    'User Deleted',
    'User',
    user.id,
    user.name,
    `Deactivated user: ${user.name}`,
    req
  );

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
  });
});

// @desc    Reset password
// @route   PUT /api/users/:id/reset-password
// @access  Private (HQ Admin)
export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: req.params.id },
    data: { password: hashedPassword },
  });

  await logAudit(
    req.user.id,
    'Password Reset',
    'User',
    user.id,
    user.name,
    `Password reset for user: ${user.name}`,
    req
  );

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
  });
});

