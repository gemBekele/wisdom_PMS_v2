import express from 'express';
import { generateCBSReport } from '../controllers/cbsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/report', protect, generateCBSReport);

export default router;
