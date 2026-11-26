import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import projectRoutes from './projectRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';
import invitationRoutes from './invitationRoutes.js';
import issueRoutes from './issueRoutes.js';
import sprintRoutes from './sprintRoutes.js';
import commentRoutes from './commentRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import activityRoutes from './activityRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import backlogRoutes from './backlogRoutes.js';
import attachmentRoutes from './attachmentRoutes.js';
import documentRoutes from './documentRoutes.js';
import goalRoutes from './goalRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/invitations', invitationRoutes);
router.use('/issues', issueRoutes);
router.use('/sprints', sprintRoutes);
router.use('/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity', activityRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/backlog', backlogRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/documents', documentRoutes);
router.use('/goals', goalRoutes);

export default router;
