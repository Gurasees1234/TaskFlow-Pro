import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getEmailStatus,
  verifyInvitationToken,
  acceptInvitation,
  listMyPendingInvitations,
  acceptInvitationById,
} from '../controllers/invitationController.js';

const router = Router();

// Public link token verification (for invite landing page before login/register)
router.get('/verify/:token', verifyInvitationToken);

router.use(protect);
router.get('/email-status', getEmailStatus);
router.get('/my', listMyPendingInvitations);
router.post('/accept', acceptInvitation);
router.post('/:invitationId/accept', acceptInvitationById);

export default router;
