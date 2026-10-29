import express from 'express';
import {
  getMappings,
  createMapping,
  updateMapping,
  autoBalanceMapping,
  bulkUploadMappings,
} from '../controllers/mappingController.js';
import { protect } from '../middleware/auth.js';
import { isManagerOrAbove } from '../middleware/rbac.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

// Specific routes must come before parameterized routes
router.post('/auto-balance', protect, isManagerOrAbove, autoBalanceMapping);
router.post('/bulk-upload', protect, isManagerOrAbove, upload.single('mappingFile'), bulkUploadMappings);

router.route('/')
  .get(protect, getMappings)
  .post(protect, isManagerOrAbove, createMapping);

router.put('/:id', protect, isManagerOrAbove, updateMapping);

export default router;

