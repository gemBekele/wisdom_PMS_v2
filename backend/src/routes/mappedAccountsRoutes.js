import express from 'express';
import {
  getMappedAccountsDashboard,
  getBranchMappedAccounts,
  getAccountDetail,
  getUnmappedAccounts,
} from '../controllers/mappedAccountsController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, isAreaManager, isBranchManager } from '../middleware/rbac.js';

const router = express.Router();

router.get('/dashboard', protect, getMappedAccountsDashboard);
router.get('/branch', protect, isBranchManager, getBranchMappedAccounts);
router.get('/unmapped', protect, getUnmappedAccounts);
router.get('/account/:accountNumber', protect, getAccountDetail);

export default router;
