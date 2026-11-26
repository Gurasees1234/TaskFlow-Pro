import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  listAttachments,
  uploadMiddleware,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} from '../controllers/attachmentController.js';

const router = Router();
router.use(protect);

router.get('/project/:projectId', listAttachments);
router.post('/project/:projectId', uploadMiddleware.single('file'), uploadAttachment);
router.get('/:id/download', downloadAttachment);
router.delete('/:id', deleteAttachment);

export default router;
