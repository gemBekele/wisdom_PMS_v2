import express from 'express';
import { exportScorecard, exportBranchReport } from '../controllers/exportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/scorecard/:userId', protect, exportScorecard);
router.get('/branch-report/:branchId', protect, exportBranchReport);

export default router;
