import express from 'express';
import {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  getUsersList,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { isHQAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, isHQAdmin, register);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.get('/users-list', getUsersList);

export default router;
