import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Goal from '../models/Goal.js';
import { canManageIssues, requireProjectMember } from '../utils/projectAuth.js';

export const listGoals = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId || req.query.projectId;
  const { month } = req.query;
  if (!projectId) throw new ApiError(400, 'projectId is required');
  await requireProjectMember(projectId, req.user.id);

  const filter = { project: projectId };
  if (month) filter.month = month;

  const goals = await Goal.find(filter).sort({ createdAt: 1 });
  res.json({ success: true, goals });
});

export const createGoal = asyncHandler(async (req, res) => {
  const { title, projectId, month } = req.body;
  if (!title?.trim() || !projectId) throw new ApiError(400, 'title and projectId are required');
  const { role } = await requireProjectMember(projectId, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot create project goals');
  }

  const goal = await Goal.create({
    title: title.trim(),
    project: projectId,
    month: month || new Date().toISOString().slice(0, 7),
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, goal });
});

export const toggleGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) throw new ApiError(404, 'Goal not found');
  const { role } = await requireProjectMember(goal.project, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot toggle project goals');
  }

  goal.completed = !goal.completed;
  await goal.save();
  res.json({ success: true, goal });
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) throw new ApiError(404, 'Goal not found');
  const { role } = await requireProjectMember(goal.project, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot delete project goals');
  }

  await goal.deleteOne();
  res.json({ success: true, message: 'Goal deleted' });
});
