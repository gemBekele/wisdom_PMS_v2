import express from 'express';
import {
  getTasks,
  getTask,
  createTask,
  approveTask,
  requestTaskEdit,
  reviewTaskEdit,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, isBranchManager, isSupervisor, isStaff } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', protect, getTasks);
router.get('/:id', protect, getTask);
router.post('/', protect, isStaff, createTask);
router.put('/:id/approve', protect, isSupervisor, approveTask);
router.put('/:id/request-edit', protect, requestTaskEdit);
router.put('/:id/review-edit', protect, isSupervisor, reviewTaskEdit);

export default router;
