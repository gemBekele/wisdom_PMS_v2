import express from 'express';
import {
  getRegions,
  getRegion,
  createRegion,
  updateRegion,
  deleteRegion,
} from '../controllers/regionController.js';
import { protect } from '../middleware/auth.js';
import { isHQAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.route('/')
  .get(protect, getRegions)
  .post(protect, isHQAdmin, createRegion);

router.route('/:id')
  .get(protect, getRegion)
  .put(protect, isHQAdmin, updateRegion)
  .delete(protect, isHQAdmin, deleteRegion);

export default router;
