import express from 'express';
import {
  uploadCBS,
  getCBSValidations,
  resolveDiscrepancy,
} from '../controllers/cbsController.js';
import { protect } from '../middleware/auth.js';
import { isManagerOrAbove } from '../middleware/rbac.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

router.post('/upload', protect, isManagerOrAbove, upload.single('cbsFile'), uploadCBS);
router.get('/', protect, getCBSValidations);
router.put('/:id/resolve/:discrepancyId', protect, resolveDiscrepancy);

export default router;

