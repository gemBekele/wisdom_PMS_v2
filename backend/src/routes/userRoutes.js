import express from 'express';
import {
  getPublicUsersList,
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getHierarchy,
  resetPassword,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, isAreaManager, isBranchManager, isSupervisor } from '../middleware/rbac.js';

const router = express.Router();

router.get('/hierarchy', protect, getHierarchy);
router.get('/public-list', getPublicUsersList);
router.get('/', protect, getUsers);
router.get('/:id', protect, getUser);
router.post('/', protect, isAdmin, createUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, isAdmin, deleteUser);
router.put('/:id/reset-password', protect, isAdmin, resetPassword);

export default router;
