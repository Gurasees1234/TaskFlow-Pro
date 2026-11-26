import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../controllers/workspaceController.js';

const router = Router();
router.use(protect);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.get('/:id/members', getWorkspaceMembers);
router.post('/:id/members', addMember);
router.patch('/:id/members/:userId', updateMemberRole);
router.delete('/:id/members/:userId', removeMember);
router.delete('/:id/members', removeMember);

export default router;
