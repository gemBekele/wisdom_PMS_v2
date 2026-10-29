import express from 'express';
import {
  getHQDashboard,
  getAreaDashboard,
  getBranchDashboard,
  getStaffDashboard,
  getSupervisorDashboard,
  getBranchOperations,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, isAreaManager, isBranchManager, isSupervisor, isStaff } from '../middleware/rbac.js';

const router = express.Router();

router.get('/hq', protect, isAdmin, getHQDashboard);
router.get('/area', protect, isAreaManager, getAreaDashboard);
router.get('/branch', protect, isBranchManager, getBranchDashboard);
router.get('/staff', protect, isStaff, getStaffDashboard);
router.get('/supervisor', protect, isSupervisor, getSupervisorDashboard);
router.get('/branch-operations', protect, isAreaManager, getBranchOperations);
router.get('/branch-operations/me', protect, isBranchManager, getBranchOperations);

export default router;
