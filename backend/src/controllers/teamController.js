import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';
import { POSITION_MAP } from '../utils/prismaHelpers.js';
import { normalizeRole } from '../utils/roleNormalizer.js';

const ensureBranchAccess = async (req, branchId) => {
  if (!branchId) return false;
  const role = normalizeRole(req.user.role);
  if (role === 'admin') return true;
  if (req.user.branchId && req.user.branchId === branchId) return true;
  return false;
};

export const getTeams = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const targetBranchId = branchId || req.user.branchId;

  if (!(await ensureBranchAccess(req, targetBranchId))) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this branch' });
  }

  const teams = await prisma.team.findMany({
    where: { branchId: targetBranchId, isActive: true },
    include: {
      manager: { select: { id: true, name: true, email: true, role: true, position: true } },
      members: { select: { id: true, name: true, email: true, position: true } },
    },
    orderBy: { name: 'asc' },
  });

  const mappedTeams = teams.map(team => ({
    ...team,
    _id: team.id,
    memberCount: team.members.length,
    managerId: team.manager ? {
      ...team.manager,
      _id: team.manager.id,
      position: POSITION_MAP[team.manager.position] || team.manager.position
    } : null,
  }));

  res.status(200).json({ success: true, count: mappedTeams.length, data: mappedTeams });
});

export const createTeam = asyncHandler(async (req, res) => {
  const { name, code, managerId, memberIds, branchId } = req.body;
  const targetBranchId = branchId || req.user.branchId;

  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Name and code are required' });
  }

  if (!(await ensureBranchAccess(req, targetBranchId))) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this branch' });
  }

  const branch = await prisma.branch.findUnique({ where: { id: targetBranchId } });
  if (!branch) {
    return res.status(404).json({ success: false, message: 'Branch not found' });
  }

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || normalizeRole(manager.role) !== 'supervisor') {
      return res.status(400).json({ success: false, message: 'Manager must be a Supervisor' });
    }
  }

  const team = await prisma.team.create({
    data: {
      name,
      code,
      branchId: targetBranchId,
      managerId: managerId || null,
    },
  });

  const validMemberIds = Array.isArray(memberIds) ? memberIds.filter(Boolean) : [];
  if (validMemberIds.length > 0) {
    const alreadyAssigned = await prisma.user.findMany({
      where: { id: { in: validMemberIds }, teamId: { not: null } },
      select: { id: true, name: true, teamId: true },
    });
    if (alreadyAssigned.length > 0) {
      const names = alreadyAssigned.map(u => u.name).join(', ');
      return res.status(400).json({
        success: false,
        message: `These staff are already assigned to another team: ${names}. Remove them from their current team first.`,
        conflicts: alreadyAssigned.map(u => u.id),
      });
    }
    await prisma.user.updateMany({
      where: { id: { in: validMemberIds } },
      data: { teamId: team.id },
    });
  }

  const created = await prisma.team.findUnique({
    where: { id: team.id },
    include: {
      manager: { select: { id: true, name: true, email: true, role: true, position: true } },
      members: { select: { id: true, name: true, email: true, position: true } },
    },
  });

  res.status(201).json({ success: true, message: 'Team created', data: { ...created, _id: created.id, managerId: created.manager ? { ...created.manager, _id: created.manager.id } : null } });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const { name, code, managerId, memberIds } = req.body;

  const existing = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Team not found' });

  if (!(await ensureBranchAccess(req, existing.branchId))) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || normalizeRole(manager.role) !== 'supervisor') {
      return res.status(400).json({ success: false, message: 'Manager must be a Supervisor' });
    }
  }

  await prisma.team.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(code && { code }),
      managerId: managerId !== undefined ? (managerId || null) : undefined,
    },
  });

  if (Array.isArray(memberIds)) {
    const currentMemberIds = (await prisma.user.findMany({
      where: { teamId: existing.id },
      select: { id: true },
    })).map(u => u.id);

    const newMemberIds = memberIds.filter(Boolean).filter(id => !currentMemberIds.includes(id));
    if (newMemberIds.length > 0) {
      const alreadyAssigned = await prisma.user.findMany({
        where: { id: { in: newMemberIds }, teamId: { not: null } },
        select: { id: true, name: true, teamId: true },
      });
      if (alreadyAssigned.length > 0) {
        const names = alreadyAssigned.map(u => u.name).join(', ');
        return res.status(400).json({
          success: false,
          message: `These staff are already assigned to another team: ${names}. Remove them from their current team first.`,
          conflicts: alreadyAssigned.map(u => u.id),
        });
      }
    }

    await prisma.user.updateMany({
      where: { teamId: existing.id },
      data: { teamId: null },
    });
    const valid = memberIds.filter(Boolean);
    if (valid.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: valid } },
        data: { teamId: existing.id },
      });
    }
  }

  const updated = await prisma.team.findUnique({
    where: { id: req.params.id },
    include: {
      manager: { select: { id: true, name: true, email: true, role: true, position: true } },
      members: { select: { id: true, name: true, email: true, position: true } },
    },
  });

  res.status(200).json({ success: true, message: 'Team updated', data: { ...updated, _id: updated.id, managerId: updated.manager ? { ...updated.manager, _id: updated.manager.id } : null } });
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

  if (!(await ensureBranchAccess(req, team.branchId))) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  await prisma.team.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.status(200).json({ success: true, message: 'Team deactivated' });
});
