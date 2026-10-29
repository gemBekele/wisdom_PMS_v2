import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { normalizeRole } from '../utils/roleNormalizer.js';
import { hashPassword, POSITION_TO_ENUM, POSITION_MAP } from '../utils/prismaHelpers.js';

const userSafeSelect = {
  id: true, employeeId: true, name: true, email: true, role: true,
  branchId: true, branch_code: true, areaId: true, position: true,
  isActive: true, supervisorId: true, teamId: true, createdAt: true, updatedAt: true,
  branch: { select: { id: true, name: true, code: true } },
  area: { select: { id: true, name: true } },
};

const canAccessUser = (actor, target) => {
  const actorRole = normalizeRole(actor.role);
  if (actorRole === 'admin') return true;
  if (target.id === actor.id) return true;
  if (actorRole === 'areaManager') return !!actor.areaId && target.areaId === actor.areaId;
  if (actorRole === 'branchManager' || actorRole === 'supervisor') {
    if (actor.branchId && target.branchId) return actor.branchId === target.branchId;
    if (actor.branch_code && target.branch_code) return actor.branch_code === target.branch_code;
  }
  return false;
};

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
  if (userRole === 'admin') {
    if (branchId) where.branchId = branchId;
    if (branch_code) where.branch_code = branch_code;
  }
  if (supervisorId) where.supervisorId = supervisorId;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const users = await prisma.user.findMany({
    where,
    select: userSafeSelect,
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
    select: userSafeSelect,
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (!canAccessUser(req.user, user)) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to view this user',
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
              select: {
                id: true, name: true, email: true, role: true, position: true, employeeId: true,
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
              select: {
                id: true, name: true, email: true, role: true, position: true, employeeId: true,
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
  const { name, email, password, role, position, branch_code, employeeId, branchId, areaId, supervisorId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }

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
  let resolvedBranchId = branchId || req.user.branchId || null;

  if (!resolvedBranchId && resolvedBranchCode) {
    const branchByCode = await prisma.branch.findUnique({
      where: { code: String(resolvedBranchCode).toUpperCase() },
      select: { id: true, areaId: true, code: true },
    });
    if (branchByCode) {
      resolvedBranchId = branchByCode.id;
      resolvedBranchCode = branchByCode.code;
      if (!resolvedAreaId) resolvedAreaId = branchByCode.areaId;
    }
  }

  if (resolvedBranchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: resolvedBranchId },
      select: { areaId: true, code: true },
    });
    if (branch) {
      if (!resolvedAreaId) resolvedAreaId = branch.areaId;
      if (!resolvedBranchCode) resolvedBranchCode = branch.code;
    }
  }

  const branchRoles = ['branchManager', 'supervisor', 'staff'];
  if (branchRoles.includes(targetRole) && !resolvedBranchCode) {
    return res.status(400).json({
      success: false,
      message: 'branch_code is required for branch-level users',
    });
  }

  let resolvedSupervisorId = supervisorId || null;
  if (resolvedSupervisorId) {
    const supervisor = await prisma.user.findUnique({
      where: { id: resolvedSupervisorId },
      select: { id: true, branchId: true, branch_code: true, isActive: true },
    });
    if (!supervisor || !supervisor.isActive) {
      return res.status(400).json({ success: false, message: 'Supervisor not found or inactive' });
    }
    if (resolvedBranchId && supervisor.branchId && supervisor.branchId !== resolvedBranchId) {
      return res.status(400).json({ success: false, message: 'Supervisor must belong to the same branch' });
    }
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
      supervisorId: resolvedSupervisorId,
      isActive: true,
    },
    select: userSafeSelect,
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
    select: { id: true, role: true, branchId: true, areaId: true, branch_code: true },
  });

  if (!existingUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const allowedFields = ['name', 'email', 'employeeId', 'role', 'position', 'branchId', 'branch_code', 'areaId', 'supervisorId', 'isActive', 'teamId'];
  const updateData = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updateData[field] = req.body[field];
  }

  if (req.body.password) {
    if (String(req.body.password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    updateData.password = await hashPassword(req.body.password);
  }

  if (updateData.role) {
    const validRoles = ['admin', 'areaManager', 'branchManager', 'supervisor', 'staff'];
    updateData.role = normalizeRole(updateData.role);
    if (!validRoles.includes(updateData.role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
  }

  if (updateData.position) {
    updateData.position = POSITION_TO_ENUM[updateData.position] || updateData.position;
  }

  if (updateData.supervisorId) {
    if (updateData.supervisorId === req.params.id) {
      return res.status(400).json({ success: false, message: 'A user cannot be their own supervisor' });
    }
    const supervisor = await prisma.user.findUnique({
      where: { id: updateData.supervisorId },
      select: { id: true, isActive: true },
    });
    if (!supervisor || !supervisor.isActive) {
      return res.status(400).json({ success: false, message: 'Supervisor not found or inactive' });
    }
  }

  if (updateData.branch_code !== undefined && !updateData.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { code: String(updateData.branch_code).toUpperCase() },
      select: { id: true, code: true, areaId: true },
    });
    if (branch) {
      updateData.branchId = branch.id;
      updateData.branch_code = branch.code;
      if (!updateData.areaId) updateData.areaId = branch.areaId;
    }
  } else if (updateData.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: updateData.branchId },
      select: { code: true, areaId: true },
    });
    if (branch) {
      updateData.branch_code = branch.code;
      if (!updateData.areaId) updateData.areaId = branch.areaId;
    }
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: userSafeSelect,
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

