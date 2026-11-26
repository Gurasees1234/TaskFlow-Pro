import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listGoals, createGoal, toggleGoal, deleteGoal } from '../controllers/goalController.js';

const router = Router();
router.use(protect);

router.get('/', listGoals);
router.post('/', createGoal);
router.patch('/:id/toggle', toggleGoal);
router.delete('/:id', deleteGoal);

export default router;

