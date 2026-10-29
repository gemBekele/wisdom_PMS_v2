import express from 'express';
import {
  getStaffPlans,
  getStaffPlan,
} from '../controllers/staffPlanController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getStaffPlans);
router.get('/:id', protect, getStaffPlan);

export default router;
