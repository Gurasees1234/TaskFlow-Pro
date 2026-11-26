// src/routes/commentRoutes.js
import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { addComment, listComments, updateComment, deleteComment } from '../controllers/commentController.js';

const router = Router();
router.use(protect);

router.post('/issue/:issueId', addComment);
router.get('/issue/:issueId', listComments);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;

