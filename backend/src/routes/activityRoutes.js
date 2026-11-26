import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listActivity } from '../controllers/activityController.js';

const router = Router();
router.use(protect);

router.get('/', listActivity);
router.get('/project/:projectId', listActivity);

export default router;
