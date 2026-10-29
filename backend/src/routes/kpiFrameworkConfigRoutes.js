import express from 'express';
import { getKpiConfig, updateKpiConfig, resetKpiConfig } from '../controllers/kpiFrameworkConfigController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', protect, getKpiConfig);
router.put('/:id', protect, isAdmin, updateKpiConfig);
router.post('/reset', protect, isAdmin, resetKpiConfig);

export default router;
