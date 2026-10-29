import { normalizeRole } from '../utils/roleNormalizer.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const userRole = normalizeRole(req.user.role);
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

export const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  const userRole = normalizeRole(req.user.role);
  if (userRole === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Forbidden' });
};

export const isHQAdmin = isAdmin;

export const isAreaManager = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  const userRole = normalizeRole(req.user.role);
  if (userRole === 'areaManager' || userRole === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Forbidden' });
};

export const isBranchManager = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  const userRole = normalizeRole(req.user.role);
  if (['admin', 'areaManager', 'branchManager', 'supervisor'].includes(userRole)) return next();
  return res.status(403).json({ success: false, message: 'Forbidden' });
};

export const isSupervisor = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  const userRole = normalizeRole(req.user.role);
  if (['admin', 'branchManager', 'supervisor'].includes(userRole)) return next();
  return res.status(403).json({ success: false, message: 'Forbidden' });
};

export const isStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  return next();
};

export const isManagerOrAbove = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  const userRole = normalizeRole(req.user.role);
  const managerRoles = ['admin', 'areaManager', 'branchManager'];
  if (managerRoles.includes(userRole)) return next();
  return res.status(403).json({ success: false, message: 'Forbidden' });
};

export const canApprove = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  const userRole = normalizeRole(req.user.role);
  const approverRoles = ['admin', 'areaManager', 'branchManager', 'supervisor'];
  if (approverRoles.includes(userRole)) return next();
  return res.status(403).json({ success: false, message: 'Forbidden' });
};

export const canApproveByPosition = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  const approverPositions = ['Branch Manager', 'Operation Supervisor', 'Customer Relationship Supervisor'];
  if (!approverPositions.includes(req.user.position)) {
    return res.status(403).json({
      success: false,
      message: `Your position '${req.user.position}' cannot approve tasks`,
    });
  }
  next();
};
