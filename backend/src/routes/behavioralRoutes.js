import express from 'express';
import {
  getBehavioralEvaluations,
  createBehavioralEvaluation,
  approveBehavioralEvaluation,
} from '../controllers/behavioralController.js';
import { protect } from '../middleware/auth.js';
import { isSupervisor, isBranchManager } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', protect, getBehavioralEvaluations);
router.post('/', protect, isSupervisor, createBehavioralEvaluation);
router.put('/:id/approve', protect, isBranchManager, approveBehavioralEvaluation);

export default router;
