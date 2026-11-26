import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Issue from '../models/Issue.js';
import Sprint from '../models/Sprint.js';
import { requireProjectMember } from '../utils/projectAuth.js';
import { emitToProject } from '../utils/socketBus.js';

export const getBacklog = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, priority, type, q, page = 1, limit = 150 } = req.query;

  await requireProjectMember(projectId, req.user.id);

  const filter = { project: projectId, sprint: null };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (type) filter.type = type;
  if (q?.trim()) {
    const regex = { $regex: q.trim(), $options: 'i' };
    filter.$or = [{ title: regex }, { issueKey: regex }];
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('assignee', 'name email avatarUrl title')
      .populate('reporter', 'name email avatarUrl')
      .populate('project', 'name key'),
    Issue.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: Number(page), limit: Number(limit), issues });
});

export const moveToSprint = asyncHandler(async (req, res) => {
  const { issueId, sprintId } = req.body;
  if (!issueId) throw new ApiError(400, 'issueId is required');

  const issue = await Issue.findById(issueId);
  if (!issue) throw new ApiError(404, 'Issue not found');

  await requireProjectMember(issue.project, req.user.id, [
    'project_lead',
    'project_manager',
    'developer',
  ]);

  if (issue.sprint) {
    await Sprint.findByIdAndUpdate(issue.sprint, { $pull: { issues: issue._id } });
  }

  if (!sprintId) {
    issue.sprint = null;
    await issue.save();
    emitToProject(issue.project, 'issue:updated', issue);
    return res.json({ success: true, issue, sprint: null });
  }

  const sprint = await Sprint.findById(sprintId);
  if (!sprint) throw new ApiError(404, 'Sprint not found');
  if (sprint.project.toString() !== issue.project.toString()) {
    throw new ApiError(400, 'Sprint and issue must belong to the same project');
  }

  if (!sprint.issues.some((i) => i.toString() === issueId)) {
    sprint.issues.push(issue._id);
    await sprint.save();
  }

  issue.sprint = sprint._id;
  await issue.save();
  await issue.populate([
    { path: 'assignee', select: 'name email avatarUrl title' },
    { path: 'project', select: 'name key' },
    { path: 'sprint', select: 'name status' },
  ]);

  emitToProject(issue.project._id || issue.project, 'issue:updated', issue);
  emitToProject(issue.project._id || issue.project, 'sprint:updated', sprint);
  return res.json({ success: true, issue, sprint });
});

export const reorderBacklog = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new ApiError(400, 'orderedIds must be a non-empty array');
  }

  await requireProjectMember(projectId, req.user.id, [
    'project_lead',
    'project_manager',
    'developer',
  ]);

  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: { filter: { _id: id, project: projectId }, update: { $set: { order: index } } },
  }));

  await Issue.bulkWrite(bulkOps);
  emitToProject(projectId, 'backlog:reordered', { projectId, orderedIds });
  res.json({ success: true, message: 'Backlog reordered', count: orderedIds.length });
});
