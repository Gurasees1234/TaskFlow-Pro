import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getProjectAnalytics } from '../controllers/analyticsController.js';

const router = Router();
router.use(protect);

router.get('/project/:projectId', getProjectAnalytics);

export default router;
