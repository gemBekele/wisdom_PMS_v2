import express from 'express';
import {
  importJuneBalance,
  getJuneBalance,
  getAllJuneBalances,
  getBaselinePeriods,
  activateBaselinePeriod,
} from '../controllers/juneBalanceController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

router.post('/import', protect, isAdmin, upload.single('file'), importJuneBalance);
router.get('/periods/list', protect, isAdmin, getBaselinePeriods);
router.put('/periods/:period/activate', protect, isAdmin, activateBaselinePeriod);
router.get('/', protect, isAdmin, getAllJuneBalances);
router.get('/:accountId', protect, getJuneBalance);

export default router;

