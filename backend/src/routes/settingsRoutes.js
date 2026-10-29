import express from 'express';
import { getBalanceSource, updateBalanceSource } from '../controllers/settingsController.js';
import { protect } from '../middleware/auth.js';
import { isManagerOrAbove } from '../middleware/rbac.js';

const router = express.Router();

router.get('/balance-source', protect, getBalanceSource);
router.put('/balance-source', protect, isManagerOrAbove, updateBalanceSource);

export default router;
