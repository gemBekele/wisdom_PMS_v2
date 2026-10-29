import express from 'express';
import {
  getBehavioralEvaluations,
  createBehavioralEvaluation,
  approveBehavioralEvaluation,
} from '../controllers/behavioralController.js';
import { protect } from '../middleware/auth.js';
import { isSupervisor, authorize } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', protect, getBehavioralEvaluations);
router.post('/', protect, isSupervisor, createBehavioralEvaluation);
router.put('/:id/approve', protect, authorize('admin', 'areaManager', 'branchManager'), approveBehavioralEvaluation);

export default router;
