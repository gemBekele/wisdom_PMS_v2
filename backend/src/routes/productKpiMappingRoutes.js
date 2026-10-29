import express from 'express';
import {
  getAllMappings,
  getMapping,
  createMapping,
  bulkCreateMappings,
  getUnmappedProducts,
  deleteMapping,
} from '../controllers/productKpiMappingController.js';
import { protect } from '../middleware/auth.js';
import { isHQAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', protect, isHQAdmin, getAllMappings);
router.get('/unmapped', protect, isHQAdmin, getUnmappedProducts);
router.get('/:productName', protect, isHQAdmin, getMapping);
router.post('/', protect, isHQAdmin, createMapping);
router.post('/bulk', protect, isHQAdmin, bulkCreateMappings);
router.delete('/:id', protect, isHQAdmin, deleteMapping);

export default router;

