import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';

export const getRegions = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const regions = await prisma.region.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  const mapped = regions.map(r => ({ ...r, _id: r.id }));

  res.status(200).json({
    success: true,
    count: mapped.length,
    data: mapped,
  });
});

export const getRegion = asyncHandler(async (req, res) => {
  const region = await prisma.region.findUnique({
    where: { id: req.params.id },
    include: {
      areas: {
        where: { isActive: true },
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!region) {
    return res.status(404).json({ success: false, message: 'Region not found' });
  }

  res.status(200).json({
    success: true,
    data: { ...region, _id: region.id },
  });
});

export const createRegion = asyncHandler(async (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name and code',
    });
  }

  const existing = await prisma.region.findUnique({ where: { code } });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Region with code '${code}' already exists`,
    });
  }

  const region = await prisma.region.create({
    data: { name, code },
  });

  res.status(201).json({
    success: true,
    message: 'Region created successfully',
    data: { ...region, _id: region.id },
  });
});

export const updateRegion = asyncHandler(async (req, res) => {
  const existing = await prisma.region.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Region not found' });
  }

  const region = await prisma.region.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Region updated successfully',
    data: { ...region, _id: region.id },
  });
});

export const deleteRegion = asyncHandler(async (req, res) => {
  const region = await prisma.region.findUnique({
    where: { id: req.params.id },
  });

  if (!region) {
    return res.status(404).json({ success: false, message: 'Region not found' });
  }

  const updatedRegion = await prisma.region.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.status(200).json({
    success: true,
    message: 'Region deactivated successfully',
    data: { ...updatedRegion, _id: updatedRegion.id },
  });
});
