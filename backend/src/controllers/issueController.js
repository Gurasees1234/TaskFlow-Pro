import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Issue, { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from '../models/Issue.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Sprint from '../models/Sprint.js';
import Comment from '../models/Comment.js';
import ActivityLog from '../models/ActivityLog.js';
import Attachment from '../models/Attachment.js';
import {
  canManageIssues,
  requireProjectMember,
} from '../utils/projectAuth.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationService.js';
import { emitToProject } from '../utils/socketBus.js';
import { deleteLocalFile } from '../utils/storageService.js';

const verifyAssigneeInProject = async (projectId, assigneeId) => {
  if (!assigneeId) return null;
  if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
    throw new ApiError(400, 'Invalid assignee user ID');
  }
  const member = await ProjectMember.findOne({ project: projectId, user: assigneeId });
  if (!member) {
    throw new ApiError(400, 'Assignee must be a member of this project');
  }
  return assigneeId;
};

export const createIssue = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type,
    status,
    priority,
    storyPoints,
    estimatedEffort,
    actualEffort,
    assignee,
    dueDate,
    labels,
    projectId,
    sprintId,
    parentIssueId,
  } = req.body;

  if (!title?.trim() || title.trim().length < 2) {
    throw new ApiError(400, 'Issue title must be at least 2 characters');
  }
  if (!projectId) {
    throw new ApiError(400, 'projectId is required');
  }

  const { project, role } = await requireProjectMember(projectId, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers have read-only access and cannot create issues');
  }

  if (assignee) {
    await verifyAssigneeInProject(project._id, assignee);
  }

  let validSprintId = null;
  if (sprintId) {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint || sprint.project.toString() !== project._id.toString()) {
      throw new ApiError(400, 'Invalid sprint for this project');
    }
    validSprintId = sprint._id;
  }

  let validParentId = null;
  if (parentIssueId) {
    const parent = await Issue.findById(parentIssueId);
    if (!parent || parent.project.toString() !== project._id.toString()) {
      throw new ApiError(400, 'Parent issue must belong to the same project');
    }
    validParentId = parent._id;
  }

  const updatedProject = await Project.findByIdAndUpdate(
    project._id,
    { $inc: { issueCounter: 1 } },
    { new: true }
  );
  const issueKey = `${updatedProject.key || 'ISS'}-${updatedProject.issueCounter}`;
  const issueStatus = ISSUE_STATUSES.includes(status) ? status : 'todo';

  const issue = await Issue.create({
    issueKey,
    title: title.trim(),
    description: description?.trim() || '',
    type: ISSUE_TYPES.includes(type) ? type : 'task',
    status: issueStatus,
    priority: ISSUE_PRIORITIES.includes(priority) ? priority : 'medium',
    storyPoints: Number.isFinite(Number(storyPoints)) ? Number(storyPoints) : 1,
    estimatedEffort: Number.isFinite(Number(estimatedEffort)) ? Number(estimatedEffort) : 0,
    actualEffort: Number.isFinite(Number(actualEffort)) ? Number(actualEffort) : 0,
    assignee: assignee || null,
    reporter: req.user.id,
    project: project._id,
    sprint: validSprintId,
    parentIssue: validParentId,
    dueDate: dueDate || null,
    labels: Array.isArray(labels) ? labels.map((l) => String(l).trim()).filter(Boolean) : [],
    completedAt: issueStatus === 'done' ? new Date() : null,
  });

  if (validSprintId) {
    await Sprint.findByIdAndUpdate(validSprintId, { $addToSet: { issues: issue._id } });
  }

  await issue.populate([
    { path: 'assignee', select: 'name email avatarUrl title' },
    { path: 'reporter', select: 'name email avatarUrl title' },
    { path: 'project', select: 'name key type' },
    { path: 'sprint', select: 'name status' },
    { path: 'parentIssue', select: 'issueKey title type' },
  ]);

  await logActivity({
    actor: req.user.id,
    project: project._id,
    action: 'issue.created',
    entity: 'Issue',
    entityId: issue._id,
    entityTitle: `${issue.issueKey} ${issue.title}`,
  });

  if (assignee) {
    await createNotification({
      recipient: assignee,
      actor: req.user.id,
      project: project._id,
      type: 'assignment',
      message: `assigned ${issue.issueKey} "${issue.title}" to you`,
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
    });
  }

  emitToProject(project._id, 'issue:created', issue);
  res.status(201).json({ success: true, issue });
});

export const listIssues = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId || req.query.projectId;
  await requireProjectMember(projectId, req.user.id);

  const {
    status,
    priority,
    type,
    assignee,
    label,
    sprintId,
    parentIssueId,
    sort = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 100,
    q,
  } = req.query;

  const filter = { project: projectId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (type) filter.type = type;
  if (assignee === 'unassigned') filter.assignee = null;
  else if (assignee) filter.assignee = assignee;
  if (label) filter.labels = label;
  if (parentIssueId) filter.parentIssue = parentIssueId;
  if (sprintId === 'backlog') filter.sprint = null;
  else if (sprintId) filter.sprint = sprintId;

  if (q?.trim()) {
    const regex = { $regex: q.trim(), $options: 'i' };
    filter.$or = [{ title: regex }, { description: regex }, { issueKey: regex }];
  }

  const allowedSorts = ['createdAt', 'updatedAt', 'priority', 'status', 'dueDate', 'order', 'issueKey'];
  const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .sort({ [sortField]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(Math.min(250, Number(limit)))
      .populate('assignee', 'name email avatarUrl title')
      .populate('reporter', 'name email avatarUrl title')
      .populate('project', 'name key type')
      .populate('sprint', 'name status')
      .populate('parentIssue', 'issueKey title type'),
    Issue.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: Number(page), limit: Number(limit), issues });
});

export const listMyIssues = asyncHandler(async (req, res) => {
  const { projectId, status, priority, type, sprintId, dueFilter, q } = req.query;
  const filter = { assignee: req.user.id };

  if (projectId) {
    await requireProjectMember(projectId, req.user.id);
    filter.project = projectId;
  } else {
    const memberships = await ProjectMember.find({ user: req.user.id }).select('project');
    filter.project = { $in: memberships.map((m) => m.project) };
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (type) filter.type = type;
  if (sprintId === 'backlog') filter.sprint = null;
  else if (sprintId) filter.sprint = sprintId;

  const now = new Date();
  if (dueFilter === 'overdue') {
    filter.status = { $ne: 'done' };
    filter.dueDate = { $lt: now, $ne: null };
  } else if (dueFilter === 'due_soon') {
    const soon = new Date(now.getTime() + 7 * 86400000);
    filter.status = { $ne: 'done' };
    filter.dueDate = { $gte: now, $lte: soon };
  } else if (dueFilter === 'completed') {
    filter.status = 'done';
  } else if (dueFilter === 'in_progress') {
    filter.status = { $in: ['in_progress', 'in_review', 'testing'] };
  }

  if (q?.trim()) {
    const regex = { $regex: q.trim(), $options: 'i' };
    filter.$or = [{ title: regex }, { description: regex }, { issueKey: regex }];
  }

  const issues = await Issue.find(filter)
    .sort({ dueDate: 1, createdAt: -1 })
    .populate('assignee', 'name email avatarUrl title')
    .populate('reporter', 'name email avatarUrl title')
    .populate('project', 'name key type')
    .populate('sprint', 'name status');

  res.json({ success: true, issues });
});

export const getIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('assignee', 'name email avatarUrl title')
    .populate('reporter', 'name email avatarUrl title')
    .populate('project', 'name key type status')
    .populate('sprint', 'name status startDate endDate')
    .populate('parentIssue', 'issueKey title type status');

  if (!issue) throw new ApiError(404, 'Issue not found');
  await requireProjectMember(issue.project._id || issue.project, req.user.id);

  const [comments, activity, attachments] = await Promise.all([
    Comment.find({ issue: issue._id })
      .sort({ createdAt: 1 })
      .populate('author', 'name email avatarUrl title'),
    ActivityLog.find({ entity: 'Issue', entityId: issue._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('actor', 'name email avatarUrl'),
    Attachment.find({ issue: issue._id })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email avatarUrl'),
  ]);

  res.json({ success: true, issue, comments, activity, attachments });
});

export const updateIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError(404, 'Issue not found');

  const { role } = await requireProjectMember(issue.project, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot modify project issues');
  }

  // Developers may edit issues assigned to them or reported by them, or transition status/effort
  const {
    title,
    description,
    type,
    status,
    priority,
    storyPoints,
    estimatedEffort,
    actualEffort,
    assignee,
    dueDate,
    labels,
    sprintId,
    parentIssueId,
  } = req.body;

  const isLeadOrPm = ['project_lead', 'project_manager'].includes(role);
  if (assignee !== undefined && !isLeadOrPm && assignee !== req.user.id && assignee !== null) {
    throw new ApiError(403, 'Only Project Lead or Project Manager can assign issues to others');
  }

  const prevStatus = issue.status;
  const prevAssignee = issue.assignee?.toString() || null;
  const prevPriority = issue.priority;

  if (title !== undefined && title.trim()) issue.title = title.trim();
  if (description !== undefined) issue.description = description.trim();
  if (type && ISSUE_TYPES.includes(type)) issue.type = type;
  if (status && ISSUE_STATUSES.includes(status)) {
    issue.status = status;
    issue.completedAt = status === 'done' ? new Date() : null;
  }
  if (priority && ISSUE_PRIORITIES.includes(priority)) {
    issue.priority = priority;
  }
  if (storyPoints !== undefined && Number.isFinite(Number(storyPoints))) {
    issue.storyPoints = Number(storyPoints);
  }
  if (estimatedEffort !== undefined && Number.isFinite(Number(estimatedEffort))) {
    issue.estimatedEffort = Number(estimatedEffort);
  }
  if (actualEffort !== undefined && Number.isFinite(Number(actualEffort))) {
    issue.actualEffort = Number(actualEffort);
  }
  if (dueDate !== undefined) issue.dueDate = dueDate || null;
  if (Array.isArray(labels)) {
    issue.labels = labels.map((l) => String(l).trim()).filter(Boolean);
  }

  if (assignee !== undefined) {
    if (assignee === null || assignee === '') {
      issue.assignee = null;
    } else {
      await verifyAssigneeInProject(issue.project, assignee);
      issue.assignee = assignee;
    }
  }

  if (parentIssueId !== undefined) {
    if (!parentIssueId) {
      issue.parentIssue = null;
    } else {
      if (parentIssueId === issue._id.toString()) {
        throw new ApiError(400, 'An issue cannot be its own parent');
      }
      const parent = await Issue.findById(parentIssueId);
      if (!parent || parent.project.toString() !== issue.project.toString()) {
        throw new ApiError(400, 'Parent issue must belong to the same project');
      }
      issue.parentIssue = parent._id;
    }
  }

  if (sprintId !== undefined) {
    if (issue.sprint && issue.sprint.toString() !== sprintId) {
      await Sprint.findByIdAndUpdate(issue.sprint, { $pull: { issues: issue._id } });
    }
    if (sprintId) {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint || sprint.project.toString() !== issue.project.toString()) {
        throw new ApiError(400, 'Sprint must belong to the same project');
      }
      await Sprint.findByIdAndUpdate(sprintId, { $addToSet: { issues: issue._id } });
      issue.sprint = sprintId;
    } else {
      issue.sprint = null;
    }
  }

  await issue.save();
  await issue.populate([
    { path: 'assignee', select: 'name email avatarUrl title' },
    { path: 'reporter', select: 'name email avatarUrl title' },
    { path: 'project', select: 'name key type' },
    { path: 'sprint', select: 'name status' },
    { path: 'parentIssue', select: 'issueKey title type' },
  ]);

  if (status && status !== prevStatus) {
    await logActivity({
      actor: req.user.id,
      project: issue.project._id || issue.project,
      action: 'issue.status_changed',
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
      meta: { from: prevStatus, to: status },
    });

    for (const target of [
      issue.reporter?._id || issue.reporter,
      issue.assignee?._id || issue.assignee,
    ]) {
      if (target) {
        await createNotification({
          recipient: target,
          actor: req.user.id,
          project: issue.project._id || issue.project,
          type: 'status_change',
          message: `moved ${issue.issueKey} "${issue.title}" to ${status.replace('_', ' ')}`,
          entity: 'Issue',
          entityId: issue._id,
          entityTitle: `${issue.issueKey} ${issue.title}`,
        });
      }
    }
  }

  if (priority && priority !== prevPriority) {
    await logActivity({
      actor: req.user.id,
      project: issue.project._id || issue.project,
      action: 'issue.priority_changed',
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
      meta: { from: prevPriority, to: priority },
    });
  }

  const newAssignee = issue.assignee?._id?.toString() || null;
  if (newAssignee && newAssignee !== prevAssignee) {
    await logActivity({
      actor: req.user.id,
      project: issue.project._id || issue.project,
      action: prevAssignee ? 'issue.reassigned' : 'issue.assigned',
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
      meta: { prevAssignee, assigneeId: newAssignee },
    });

    await createNotification({
      recipient: newAssignee,
      actor: req.user.id,
      project: issue.project._id || issue.project,
      type: prevAssignee ? 'reassignment' : 'assignment',
      message: `assigned ${issue.issueKey} "${issue.title}" to you`,
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
    });
  } else if (
    status === prevStatus &&
    priority === prevPriority &&
    newAssignee === prevAssignee
  ) {
    await logActivity({
      actor: req.user.id,
      project: issue.project._id || issue.project,
      action: 'issue.updated',
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
    });
  }

  emitToProject(issue.project._id || issue.project, 'issue:updated', issue);
  res.json({ success: true, issue });
});

export const deleteIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError(404, 'Issue not found');

  const { role } = await requireProjectMember(issue.project, req.user.id);
  const canDelete =
    ['project_lead', 'project_manager'].includes(role) ||
    (canManageIssues(role) && issue.reporter.toString() === req.user.id);
  if (!canDelete) {
    throw new ApiError(403, 'Insufficient permissions to delete this issue');
  }

  const projectId = issue.project;
  const issueTitle = `${issue.issueKey || ''} ${issue.title}`.trim();
  const issueId = issue._id;

  const atts = await Attachment.find({ issue: issue._id }).select('storageKey');
  await Promise.all(atts.map((a) => deleteLocalFile(a.storageKey)));

  if (issue.sprint) {
    await Sprint.findByIdAndUpdate(issue.sprint, { $pull: { issues: issue._id } });
  }
  await Promise.all([
    Comment.deleteMany({ issue: issue._id }),
    Attachment.deleteMany({ issue: issue._id }),
    issue.deleteOne(),
  ]);

  await logActivity({
    actor: req.user.id,
    project: projectId,
    action: 'issue.deleted',
    entity: 'Issue',
    entityId: issueId,
    entityTitle: issueTitle,
  });

  emitToProject(projectId, 'issue:deleted', { issueId, projectId });
  res.json({ success: true, message: 'Issue deleted' });
});

export const assignIssue = asyncHandler(async (req, res) => {
  const { assigneeId } = req.body;
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError(404, 'Issue not found');

  await requireProjectMember(issue.project, req.user.id, ['project_lead', 'project_manager']);

  const prevAssignee = issue.assignee?.toString() || null;
  if (assigneeId) {
    await verifyAssigneeInProject(issue.project, assigneeId);
    issue.assignee = assigneeId;
  } else {
    issue.assignee = null;
  }

  await issue.save();
  await issue.populate('assignee', 'name email avatarUrl title');

  await logActivity({
    actor: req.user.id,
    project: issue.project,
    action: prevAssignee ? 'issue.reassigned' : 'issue.assigned',
    entity: 'Issue',
    entityId: issue._id,
    entityTitle: `${issue.issueKey} ${issue.title}`,
    meta: { assigneeId },
  });

  if (assigneeId) {
    await createNotification({
      recipient: assigneeId,
      actor: req.user.id,
      project: issue.project,
      type: prevAssignee ? 'reassignment' : 'assignment',
      message: `assigned ${issue.issueKey} "${issue.title}" to you`,
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
    });
  }

  emitToProject(issue.project, 'issue:updated', issue);
  res.json({ success: true, issue });
});

export const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || !ISSUE_STATUSES.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${ISSUE_STATUSES.join(', ')}`);
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError(404, 'Issue not found');

  const { role } = await requireProjectMember(issue.project, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot change issue status');
  }

  const prevStatus = issue.status;
  issue.status = status;
  issue.completedAt = status === 'done' ? new Date() : null;
  await issue.save();
  await issue.populate([
    { path: 'assignee', select: 'name email avatarUrl title' },
    { path: 'project', select: 'name key type' },
    { path: 'sprint', select: 'name status' },
  ]);

  if (prevStatus !== status) {
    await logActivity({
      actor: req.user.id,
      project: issue.project._id || issue.project,
      action: 'issue.status_changed',
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
      meta: { from: prevStatus, to: status },
    });

    for (const target of [issue.reporter, issue.assignee?._id || issue.assignee]) {
      if (target) {
        await createNotification({
          recipient: target,
          actor: req.user.id,
          project: issue.project._id || issue.project,
          type: 'status_change',
          message: `changed ${issue.issueKey} "${issue.title}" from ${prevStatus.replace('_', ' ')} to ${status.replace('_', ' ')}`,
          entity: 'Issue',
          entityId: issue._id,
          entityTitle: `${issue.issueKey} ${issue.title}`,
        });
      }
    }
  }

  emitToProject(issue.project._id || issue.project, 'issue:updated', issue);
  res.json({ success: true, issue });
});

export const changePriority = asyncHandler(async (req, res) => {
  const { priority } = req.body;
  if (!priority || !ISSUE_PRIORITIES.includes(priority)) {
    throw new ApiError(400, `Priority must be one of: ${ISSUE_PRIORITIES.join(', ')}`);
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError(404, 'Issue not found');

  const { role } = await requireProjectMember(issue.project, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot change issue priority');
  }

  const prevPriority = issue.priority;
  issue.priority = priority;
  await issue.save();

  if (prevPriority !== priority) {
    await logActivity({
      actor: req.user.id,
      project: issue.project,
      action: 'issue.priority_changed',
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey} ${issue.title}`,
      meta: { from: prevPriority, to: priority },
    });
  }

  emitToProject(issue.project, 'issue:updated', issue);
  res.json({ success: true, issue });
});

export const searchIssues = asyncHandler(async (req, res) => {
  const { q, projectId, page = 1, limit = 20 } = req.query;
  if (!q?.trim()) throw new ApiError(400, 'Search query "q" is required');
  if (!projectId) throw new ApiError(400, 'projectId is required');

  await requireProjectMember(projectId, req.user.id);

  const filter = {
    project: projectId,
    $or: [
      { title: { $regex: q.trim(), $options: 'i' } },
      { description: { $regex: q.trim(), $options: 'i' } },
      { issueKey: { $regex: q.trim(), $options: 'i' } },
    ],
  };
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .populate('assignee', 'name email avatarUrl')
      .populate('project', 'name key'),
    Issue.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: Number(page), limit: Number(limit), issues });
});
