import express from 'express';
import { protect } from '../middleware/auth.js';
import { isAdmin, isAreaManager, isBranchManager, isSupervisor } from '../middleware/rbac.js';
import {
  getStaffNpl,
  getBranchNpl,
  getAreaNpl,
  getHqNpl,
  getLoanSchedule,
  generateLoanSchedules,
  markInstallmentPaid,
  triggerNplSnapshot,
  getTeamCollectionAlerts,
} from '../controllers/nplController.js';

const router = express.Router();

// Staff-level NPL (any authenticated user)
router.get('/staff', protect, getStaffNpl);

// Branch-level NPL
router.get('/branch', protect, isBranchManager, getBranchNpl);

// Area-level NPL
router.get('/area', protect, isAreaManager, getAreaNpl);

// HQ-level NPL
router.get('/hq', protect, isAdmin, getHqNpl);

// Team collection alerts (supervisor)
router.get('/team-alerts', protect, isSupervisor, getTeamCollectionAlerts);

// Loan schedules
router.get('/schedules/:accountId', protect, getLoanSchedule);
router.post('/schedules/:accountId/generate', protect, generateLoanSchedules);
router.put('/schedules/:id/pay', protect, markInstallmentPaid);

// NPL snapshot
router.post('/snapshot', protect, isBranchManager, triggerNplSnapshot);

export default router;
