import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  createSprint,
  listSprints,
  getSprint,
  updateSprint,
  deleteSprint,
  startSprint,
  completeSprint,
  addIssueToSprint,
  removeIssueFromSprint,
} from '../controllers/sprintController.js';

const router = Router();
router.use(protect);

router.post('/', createSprint);
router.get('/', listSprints);
router.get('/project/:projectId', listSprints);
router.get('/:id', getSprint);
router.put('/:id', updateSprint);
router.delete('/:id', deleteSprint);
router.post('/:id/start', startSprint);
router.post('/:id/complete', completeSprint);
router.post('/:id/issues', addIssueToSprint);
router.delete('/:id/issues/:issueId', removeIssueFromSprint);
router.delete('/:id/issues', removeIssueFromSprint);

export default router;
