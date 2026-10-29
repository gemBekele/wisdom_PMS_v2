import express from 'express';
import { getTransactions, createTransaction, getTodayTotal } from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';
import { isManagerOrAbove } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', protect, getTransactions);
router.post('/', protect, isManagerOrAbove, createTransaction);
router.get('/today', protect, getTodayTotal);

export default router;
