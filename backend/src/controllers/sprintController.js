import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Sprint from '../models/Sprint.js';
import ProjectMember from '../models/ProjectMember.js';
import Issue from '../models/Issue.js';
import { requireProjectMember } from '../utils/projectAuth.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationService.js';
import { emitToProject } from '../utils/socketBus.js';

const attachSprintMetrics = async (sprints) => {
  const sprintIds = sprints.map((s) => s._id);
  const issues = await Issue.find({ sprint: { $in: sprintIds } }).select(
    'sprint status storyPoints priority estimatedEffort actualEffort'
  );
  const bySprint = new Map();
  for (const iss of issues) {
    const sid = iss.sprint.toString();
    if (!bySprint.has(sid)) bySprint.set(sid, []);
    bySprint.get(sid).push(iss);
  }

  return sprints.map((s) => {
    const list = bySprint.get(s._id.toString()) || [];
    const totalIssues = list.length;
    const completedIssues = list.filter((i) => i.status === 'done').length;
    const inProgressIssues = list.filter((i) =>
      ['in_progress', 'in_review', 'testing'].includes(i.status)
    ).length;
    const totalPoints = list.reduce((sum, i) => sum + (i.storyPoints || 1), 0);
    const completedPoints = list
      .filter((i) => i.status === 'done')
      .reduce((sum, i) => sum + (i.storyPoints || 1), 0);

    return {
      ...s.toObject(),
      metrics: {
        totalIssues,
        completedIssues,
        inProgressIssues,
        remainingIssues: totalIssues - completedIssues,
        todoIssues: Math.max(0, totalIssues - completedIssues - inProgressIssues),
        progressPct: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
        totalPoints,
        completedPoints,
        remainingPoints: Math.max(0, totalPoints - completedPoints),
      },
    };
  });
};

export const createSprint = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, goal, projectId } = req.body;
  if (!name?.trim() || !startDate || !endDate || !projectId) {
    throw new ApiError(400, 'name, startDate, endDate, and projectId are required');
  }

  await requireProjectMember(projectId, req.user.id, ['project_lead', 'project_manager']);

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, 'Invalid sprint dates');
  }
  if (end < start) {
    throw new ApiError(400, 'Sprint end date must not precede start date');
  }

  const sprint = await Sprint.create({
    name: name.trim(),
    startDate: start,
    endDate: end,
    goal: goal?.trim() || '',
    project: projectId,
    createdBy: req.user.id,
    status: 'planned',
  });

  await logActivity({
    actor: req.user.id,
    project: projectId,
    action: 'sprint.created',
    entity: 'Sprint',
    entityId: sprint._id,
    entityTitle: sprint.name,
  });

  emitToProject(projectId, 'sprint:updated', sprint);
  res.status(201).json({ success: true, sprint });
});

export const listSprints = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId || req.query.projectId;
  const { status } = req.query;
  if (!projectId) throw new ApiError(400, 'projectId is required');

  await requireProjectMember(projectId, req.user.id);

  const filter = { project: projectId };
  if (status) filter.status = status;

  const sprints = await Sprint.find(filter)
    .populate('project', 'name key')
    .populate('createdBy', 'name email')
    .sort({ status: 1, startDate: -1 });

  const enriched = await attachSprintMetrics(sprints);
  res.json({ success: true, sprints: enriched });
});

export const getSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new ApiError(404, 'Sprint not found');

  await requireProjectMember(sprint.project, req.user.id);
  await sprint.populate([
    { path: 'project', select: 'name key' },
    { path: 'createdBy', select: 'name email' },
  ]);

  const sprintIssues = await Issue.find({ sprint: sprint._id })
    .sort({ order: 1, createdAt: 1 })
    .populate('assignee', 'name email avatarUrl title')
    .populate('reporter', 'name email avatarUrl')
    .populate('project', 'name key');

  const [enriched] = await attachSprintMetrics([sprint]);
  res.json({ success: true, sprint: { ...enriched, issues: sprintIssues } });
});

export const updateSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new ApiError(404, 'Sprint not found');

  await requireProjectMember(sprint.project, req.user.id, ['project_lead', 'project_manager']);

  const { name, startDate, endDate, goal } = req.body;
  const nextStart = startDate ? new Date(startDate) : sprint.startDate;
  const nextEnd = endDate ? new Date(endDate) : sprint.endDate;
  if (nextEnd < nextStart) {
    throw new ApiError(400, 'Sprint end date must not precede start date');
  }

  if (name !== undefined && name.trim()) sprint.name = name.trim();
  sprint.startDate = nextStart;
  sprint.endDate = nextEnd;
  if (goal !== undefined) sprint.goal = goal.trim();

  await sprint.save();
  emitToProject(sprint.project, 'sprint:updated', sprint);
  res.json({ success: true, sprint });
});

export const deleteSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new ApiError(404, 'Sprint not found');

  await requireProjectMember(sprint.project, req.user.id, ['project_lead', 'project_manager']);
  if (sprint.status !== 'planned') {
    throw new ApiError(400, 'Only planned sprints can be deleted');
  }

  await Issue.updateMany({ sprint: sprint._id }, { $set: { sprint: null, order: 0 } });
  const projectId = sprint.project;
  await sprint.deleteOne();

  emitToProject(projectId, 'sprint:updated', { deletedId: req.params.id, projectId });
  res.json({ success: true, message: 'Sprint deleted' });
});

export const startSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new ApiError(404, 'Sprint not found');

  await requireProjectMember(sprint.project, req.user.id, ['project_lead', 'project_manager']);
  if (sprint.status !== 'planned') {
    throw new ApiError(400, 'Only planned sprints can be started');
  }

  const existingActive = await Sprint.findOne({
    project: sprint.project,
    status: 'active',
    _id: { $ne: sprint._id },
  });
  if (existingActive) {
    throw new ApiError(
      409,
      `Sprint "${existingActive.name}" is already active in this project. Complete it before starting another.`
    );
  }

  sprint.status = 'active';
  await sprint.save();

  await logActivity({
    actor: req.user.id,
    project: sprint.project,
    action: 'sprint.started',
    entity: 'Sprint',
    entityId: sprint._id,
    entityTitle: sprint.name,
  });

  const members = await ProjectMember.find({ project: sprint.project }).select('user');
  for (const m of members) {
    await createNotification({
      recipient: m.user,
      actor: req.user.id,
      project: sprint.project,
      type: 'sprint_started',
      message: `started sprint "${sprint.name}"`,
      entity: 'Sprint',
      entityId: sprint._id,
      entityTitle: sprint.name,
    });
  }

  emitToProject(sprint.project, 'sprint:updated', sprint);
  res.json({ success: true, sprint });
});

export const completeSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new ApiError(404, 'Sprint not found');

  await requireProjectMember(sprint.project, req.user.id, ['project_lead', 'project_manager']);
  if (sprint.status !== 'active') {
    throw new ApiError(400, 'Only active sprints can be completed');
  }

  const { moveIncompleteToBacklog = true, targetSprintId = null } = req.body || {};

  let targetSprint = null;
  if (targetSprintId) {
    targetSprint = await Sprint.findById(targetSprintId);
    if (
      !targetSprint ||
      targetSprint.project.toString() !== sprint.project.toString() ||
      targetSprint._id.toString() === sprint._id.toString() ||
      targetSprint.status === 'completed'
    ) {
      throw new ApiError(400, 'Target sprint must be another non-completed sprint in this project');
    }
  }

  const sprintIssues = await Issue.find({ sprint: sprint._id });
  const completedIssues = sprintIssues.filter((i) => i.status === 'done');
  const incompleteIssues = sprintIssues.filter((i) => i.status !== 'done');
  const incompleteIds = incompleteIssues.map((i) => i._id);

  let returnedToBacklog = 0;
  if (incompleteIds.length > 0) {
    if (targetSprint) {
      await Issue.updateMany({ _id: { $in: incompleteIds } }, { $set: { sprint: targetSprint._id } });
      await Sprint.findByIdAndUpdate(targetSprint._id, {
        $addToSet: { issues: { $each: incompleteIds } },
      });
      sprint.issues = completedIssues.map((i) => i._id);
    } else if (moveIncompleteToBacklog) {
      await Issue.updateMany({ _id: { $in: incompleteIds } }, { $set: { sprint: null } });
      sprint.issues = completedIssues.map((i) => i._id);
      returnedToBacklog = incompleteIds.length;
    }
  }

  const summary = {
    totalIssues: sprintIssues.length,
    completedIssues: completedIssues.length,
    incompleteIssues: incompleteIssues.length,
    completionRate:
      sprintIssues.length > 0
        ? Math.round((completedIssues.length / sprintIssues.length) * 100)
        : 0,
    returnedToBacklog,
    movedToSprintId: targetSprint ? targetSprint._id : null,
  };

  sprint.status = 'completed';
  sprint.completedAt = new Date();
  sprint.completionSummary = summary;
  await sprint.save();

  await logActivity({
    actor: req.user.id,
    project: sprint.project,
    action: 'sprint.completed',
    entity: 'Sprint',
    entityId: sprint._id,
    entityTitle: sprint.name,
    meta: { summary },
  });

  const members = await ProjectMember.find({ project: sprint.project }).select('user');
  for (const m of members) {
    await createNotification({
      recipient: m.user,
      actor: req.user.id,
      project: sprint.project,
      type: 'sprint_completed',
      message: `completed sprint "${sprint.name}" (${completedIssues.length}/${sprintIssues.length} issues done)`,
      entity: 'Sprint',
      entityId: sprint._id,
      entityTitle: sprint.name,
    });
  }

  emitToProject(sprint.project, 'sprint:updated', sprint);
  res.json({ success: true, sprint, summary });
});

export const addIssueToSprint = asyncHandler(async (req, res) => {
  const { issueId } = req.body;
  if (!issueId) throw new ApiError(400, 'issueId is required');

  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new ApiError(404, 'Sprint not found');

  await requireProjectMember(sprint.project, req.user.id, [
    'project_lead',
    'project_manager',
    'developer',
  ]);

  const issue = await Issue.findById(issueId);
  if (!issue) throw new ApiError(404, 'Issue not found');
  if (issue.project.toString() !== sprint.project.toString()) {
    throw new ApiError(400, 'Issue does not belong to this sprint project');
  }

  if (issue.sprint && issue.sprint.toString() !== sprint._id.toString()) {
    await Sprint.findByIdAndUpdate(issue.sprint, { $pull: { issues: issue._id } });
  }

  if (!sprint.issues.some((i) => i.toString() === issueId)) {
    sprint.issues.push(issue._id);
  }
  issue.sprint = sprint._id;
  issue.order = sprint.issues.length;

  await Promise.all([sprint.save(), issue.save()]);
  emitToProject(sprint.project, 'sprint:updated', sprint);
  emitToProject(sprint.project, 'issue:updated', issue);
  res.json({ success: true, sprint, issue });
});

export const removeIssueFromSprint = asyncHandler(async (req, res) => {
  const issueId = req.params.issueId || req.body?.issueId;
  if (!issueId) throw new ApiError(400, 'issueId is required');

  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new ApiError(404, 'Sprint not found');

  await requireProjectMember(sprint.project, req.user.id, [
    'project_lead',
    'project_manager',
    'developer',
  ]);

  sprint.issues = sprint.issues.filter((i) => i.toString() !== issueId);
  await Promise.all([
    sprint.save(),
    Issue.findByIdAndUpdate(issueId, { $set: { sprint: null, order: 0 } }),
  ]);

  emitToProject(sprint.project, 'sprint:updated', sprint);
  res.json({ success: true, sprint });
});
