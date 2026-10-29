import express from 'express';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  uploadPlan,
  getPlansAchievement,
} from '../controllers/planController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, isBranchManager } from '../middleware/rbac.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

router.get('/', protect, getPlans);
router.get('/achievement', protect, getPlansAchievement);
router.get('/:id', protect, getPlan);
router.post('/', protect, isAdmin, createPlan);
router.put('/:id', protect, isAdmin, updatePlan);
router.post('/upload', protect, isAdmin, upload.single('planFile'), uploadPlan);

export default router;
