import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';
import { normalizeRole } from '../utils/roleNormalizer.js';

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private (Admin)
export const getBranches = asyncHandler(async (req, res) => {
  const { isActive, areaId } = req.query;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (areaId) where.areaId = areaId;

  const branches = await prisma.branch.findMany({
    where,
    include: {
      area: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Map for backward compatibility
  const mappedBranches = branches.map(branch => ({
    ...branch,
    _id: branch.id,
    areaId: branch.area ? { ...branch.area, _id: branch.area.id } : null,
    managerId: branch.manager ? { ...branch.manager, _id: branch.manager.id } : null,
  }));

  res.status(200).json({
    success: true,
    count: mappedBranches.length,
    data: mappedBranches,
  });
});

// @desc    Get single branch
// @route   GET /api/branches/:id
// @access  Private (Admin)
export const getBranch = asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findUnique({
    where: { id: req.params.id },
    include: {
      area: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  if (!branch) {
    return res.status(404).json({
      success: false,
      message: 'Branch not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { ...branch, _id: branch.id },
  });
});

// @desc    Create branch
// @route   POST /api/branches
// @access  Private (Admin only)
export const createBranch = asyncHandler(async (req, res) => {
  const { name, code, areaId, managerId, address, phone } = req.body;

  // Validate required fields
  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: name, code',
    });
  }

  // Check if branch code already exists
  const existingBranch = await prisma.branch.findUnique({
    where: { code: code.toUpperCase().trim() }
  });
  if (existingBranch) {
    return res.status(400).json({
      success: false,
      message: `Branch with code '${code}' already exists`,
    });
  }

  // Verify area exists (if provided)
  if (areaId) {
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Invalid areaId',
      });
    }
  }

  // Verify manager exists and is a Branch Manager (if provided)
  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) {
      return res.status(400).json({
        success: false,
        message: 'Invalid managerId',
      });
    }

    const managerRole = normalizeRole(manager.role);
    if (managerRole !== 'branchManager') {
      return res.status(400).json({
        success: false,
        message: 'Manager must have Branch Manager role',
      });
    }
  }

  // Create branch
  const branch = await prisma.branch.create({
    data: {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      areaId: areaId || null,
      managerId: managerId || null,
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      isActive: true,
    },
  });

  const populatedBranch = await prisma.branch.findUnique({
    where: { id: branch.id },
    include: {
      area: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Branch created successfully',
    data: { ...populatedBranch, _id: populatedBranch.id },
  });
});

// @desc    Update branch
// @route   PUT /api/branches/:id
// @access  Private (Admin only)
export const updateBranch = asyncHandler(async (req, res) => {
  const { name, code, areaId, managerId, address, phone, isActive } = req.body;

  const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!branch) {
    return res.status(404).json({
      success: false,
      message: 'Branch not found',
    });
  }

  // If code is being changed, check for duplicates
  if (code && code.toUpperCase().trim() !== branch.code) {
    const existingBranch = await prisma.branch.findUnique({
      where: { code: code.toUpperCase().trim() }
    });
    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: `Branch with code '${code}' already exists`,
      });
    }
  }

  // Verify area exists (if being updated)
  if (areaId) {
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Invalid areaId',
      });
    }
  }

  // Verify manager exists and is a Branch Manager (if being updated)
  if (managerId !== undefined && managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) {
      return res.status(400).json({
        success: false,
        message: 'Invalid managerId',
      });
    }

    const managerRole = normalizeRole(manager.role);
    if (managerRole !== 'branchManager') {
      return res.status(400).json({
        success: false,
        message: 'Manager must have Branch Manager role',
      });
    }
  }

  // Update branch
  const updateData = {};
  if (name) updateData.name = name.trim();
  if (code) updateData.code = code.toUpperCase().trim();
  if (areaId !== undefined) updateData.areaId = areaId || null;
  if (managerId !== undefined) updateData.managerId = managerId || null;
  if (address !== undefined) updateData.address = address?.trim() || '';
  if (phone !== undefined) updateData.phone = phone?.trim() || '';
  if (isActive !== undefined) updateData.isActive = isActive;

  const updatedBranch = await prisma.branch.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      area: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Branch updated successfully',
    data: { ...updatedBranch, _id: updatedBranch.id },
  });
});

// @desc    Deactivate branch (soft delete)
// @route   DELETE /api/branches/:id
// @access  Private (Admin only)
export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!branch) {
    return res.status(404).json({
      success: false,
      message: 'Branch not found',
    });
  }

  // Check if branch has active users
  const activeUsers = await prisma.user.count({
    where: {
      branchId: branch.id,
      isActive: true,
    },
  });

  if (activeUsers > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot deactivate branch. ${activeUsers} active user(s) are assigned to this branch. Please reassign users first.`,
    });
  }

  // Soft delete - set isActive to false
  const updatedBranch = await prisma.branch.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.status(200).json({
    success: true,
    message: 'Branch deactivated successfully',
    data: { ...updatedBranch, _id: updatedBranch.id },
  });
});
