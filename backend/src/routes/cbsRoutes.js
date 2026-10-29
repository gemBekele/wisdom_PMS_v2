import express from 'express';
import {
  uploadCBS,
  getCBSValidations,
  resolveDiscrepancy,
} from '../controllers/cbsController.js';
import { protect } from '../middleware/auth.js';
import { isManagerOrAbove, authorize } from '../middleware/rbac.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

router.post('/upload', protect, authorize('admin', 'branchManager'), upload.single('cbsFile'), uploadCBS);
router.get('/', protect, isManagerOrAbove, getCBSValidations);
router.put('/:id/resolve/:discrepancyId', protect, isManagerOrAbove, resolveDiscrepancy);

export default router;

