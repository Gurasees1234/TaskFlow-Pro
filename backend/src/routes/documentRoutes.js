import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../controllers/documentController.js';

const router = Router();
router.use(protect);

router.get('/', listDocuments);
router.post('/', createDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;

