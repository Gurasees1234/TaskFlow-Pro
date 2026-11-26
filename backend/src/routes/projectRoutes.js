import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  transferLeadership,
  deleteProject,
  getProjectMembers,
  updateProjectMemberRole,
  removeProjectMember,
  getProjectStats,
} from '../controllers/projectController.js';
import {
  createProjectInvitations,
  listProjectInvitations,
  resendInvitation,
  revokeInvitation,
} from '../controllers/invitationController.js';

const router = Router();
router.use(protect);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/stats/:id', getProjectStats);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.post('/:id/transfer-lead', transferLeadership);
router.delete('/:id', deleteProject);

// Project Team Members & RBAC
router.get('/:id/members', getProjectMembers);
router.patch('/:id/members/:userId', updateProjectMemberRole);
router.delete('/:id/members/:userId', removeProjectMember);
router.delete('/:id/members', removeProjectMember);

// Project Gmail Invitations
router.post('/:projectId/invitations', createProjectInvitations);
router.get('/:projectId/invitations', listProjectInvitations);
router.post('/:projectId/invitations/:invitationId/resend', resendInvitation);
router.post('/:projectId/invitations/:invitationId/revoke', revokeInvitation);
router.delete('/:projectId/invitations/:invitationId', revokeInvitation);

export default router;
