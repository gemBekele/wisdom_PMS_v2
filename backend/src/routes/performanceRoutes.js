import express from 'express';
import {
  calculatePerformance,
  getPerformanceScores,
  getPerformanceScore,
  getTeamStandings,
} from '../controllers/performanceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/team-standings', protect, getTeamStandings);
router.post('/calculate', protect, calculatePerformance);
router.get('/', protect, getPerformanceScores);
router.get('/:id', protect, getPerformanceScore);

export default router;

