import express from 'express';
import { getAuditLogs, getAuditLog } from '../controllers/auditController.js';
import { protect } from '../middleware/auth.js';
import { isHQAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.route('/')
  .get(protect, isHQAdmin, getAuditLogs);

router.route('/:id')
  .get(protect, isHQAdmin, getAuditLog);

export default router;

