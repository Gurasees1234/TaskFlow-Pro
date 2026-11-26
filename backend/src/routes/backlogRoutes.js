import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getBacklog, moveToSprint, reorderBacklog } from '../controllers/backlogController.js';

const router = Router();
router.use(protect);

router.get('/project/:projectId', getBacklog);
router.post('/move', moveToSprint);
router.patch('/reorder/:projectId', reorderBacklog);

export default router;
