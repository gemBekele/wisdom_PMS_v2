import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';

// @desc    Get all areas
// @route   GET /api/areas
// @access  Private (Admin)
export const getAreas = asyncHandler(async (req, res) => {
  const { isActive, regionId } = req.query;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (regionId) where.regionId = regionId;

  const areas = await prisma.area.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Map for backward compatibility
  const mappedAreas = areas.map(area => ({
    ...area,
    _id: area.id,
    managerId: area.manager ? { ...area.manager, _id: area.manager.id } : null,
  }));

  res.status(200).json({
    success: true,
    count: mappedAreas.length,
    data: mappedAreas,
  });
});

// @desc    Get single area
// @route   GET /api/areas/:id
// @access  Private (Admin)
export const getArea = asyncHandler(async (req, res) => {
  const area = await prisma.area.findUnique({
    where: { id: req.params.id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  if (!area) {
    return res.status(404).json({
      success: false,
      message: 'Area not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { ...area, _id: area.id },
  });
});

// @desc    Create area
// @route   POST /api/areas
// @access  Private (Admin)
export const createArea = asyncHandler(async (req, res) => {
  const { name, code, regionId, managerId } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: 'Please enter all required fields: name, code',
    });
  }

  const existingArea = await prisma.area.findUnique({ where: { code } });
  if (existingArea) {
    return res.status(400).json({
      success: false,
      message: `Area with code '${code}' already exists`,
    });
  }

  const area = await prisma.area.create({
    data: {
      name,
      code,
      regionId: regionId || null,
      managerId: managerId || null,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Area created successfully',
    data: { ...area, _id: area.id },
  });
});

// @desc    Update area
// @route   PUT /api/areas/:id
// @access  Private (Admin)
export const updateArea = asyncHandler(async (req, res) => {
  const existingArea = await prisma.area.findUnique({
    where: { id: req.params.id },
  });

  if (!existingArea) {
    return res.status(404).json({
      success: false,
      message: 'Area not found',
    });
  }

  const area = await prisma.area.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Area updated successfully',
    data: { ...area, _id: area.id },
  });
});

// @desc    Delete area (soft delete)
// @route   DELETE /api/areas/:id
// @access  Private (Admin)
export const deleteArea = asyncHandler(async (req, res) => {
  const area = await prisma.area.findUnique({
    where: { id: req.params.id },
  });

  if (!area) {
    return res.status(404).json({
      success: false,
      message: 'Area not found',
    });
  }

  // Soft delete - set isActive to false
  const updatedArea = await prisma.area.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.status(200).json({
    success: true,
    message: 'Area deactivated successfully',
    data: { ...updatedArea, _id: updatedArea.id },
  });
});
