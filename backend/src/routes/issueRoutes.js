import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  createIssue,
  listMyIssues,
  listIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  assignIssue,
  changeStatus,
  changePriority,
  searchIssues,
} from '../controllers/issueController.js';

const router = Router();
router.use(protect);

router.post('/', createIssue);
router.get('/my', listMyIssues);
router.get('/search', searchIssues);
router.get('/project/:projectId', listIssues);
router.get('/:id', getIssue);
router.put('/:id', updateIssue);
router.delete('/:id', deleteIssue);
router.post('/:id/assign', assignIssue);
router.patch('/:id/status', changeStatus);
router.patch('/:id/priority', changePriority);

export default router;
