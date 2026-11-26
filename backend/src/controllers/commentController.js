import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Comment from '../models/Comment.js';
import Issue from '../models/Issue.js';
import ProjectMember from '../models/ProjectMember.js';
import { canManageIssues, requireProjectMember } from '../utils/projectAuth.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationService.js';
import { emitToProject } from '../utils/socketBus.js';

const extractMentionedUserIds = async (body, projectId) => {
  const matches = body.match(/@([A-Za-z0-9_.-]+)/g);
  if (!matches || matches.length === 0) return [];

  const tokens = matches.map((m) => m.slice(1).toLowerCase());
  const memberships = await ProjectMember.find({ project: projectId }).populate('user', 'name email');

  const matchedIds = [];
  for (const m of memberships) {
    if (!m.user) continue;
    const firstName = m.user.name.split(' ')[0].toLowerCase();
    const fullHandle = m.user.name.replace(/\s+/g, '').toLowerCase();
    const emailPrefix = m.user.email.split('@')[0].toLowerCase();
    if (
      tokens.includes(firstName) ||
      tokens.includes(fullHandle) ||
      tokens.includes(emailPrefix) ||
      tokens.includes(m.user.email.toLowerCase())
    ) {
      matchedIds.push(m.user._id.toString());
    }
  }
  return Array.from(new Set(matchedIds));
};

export const addComment = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) throw new ApiError(400, 'Comment body is required');

  const issue = await Issue.findById(req.params.issueId);
  if (!issue) throw new ApiError(404, 'Issue not found');

  const { role } = await requireProjectMember(issue.project, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot post comments');
  }

  const mentionIds = await extractMentionedUserIds(body, issue.project);

  const comment = await Comment.create({
    body: body.trim(),
    author: req.user.id,
    issue: issue._id,
    project: issue.project,
    mentions: mentionIds,
  });

  issue.comments.push(comment._id);
  await issue.save();
  await comment.populate('author', 'name email avatarUrl title');

  await logActivity({
    actor: req.user.id,
    project: issue.project,
    action: 'comment.added',
    entity: 'Issue',
    entityId: issue._id,
    entityTitle: `${issue.issueKey || ''} ${issue.title}`.trim(),
    meta: { commentId: comment._id, preview: comment.body.slice(0, 80) },
  });

  const notifiedSet = new Set();
  for (const mentionedId of mentionIds) {
    notifiedSet.add(mentionedId);
    await createNotification({
      recipient: mentionedId,
      actor: req.user.id,
      project: issue.project,
      type: 'mention',
      message: `mentioned you in a comment on ${issue.issueKey || ''} "${issue.title}"`,
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey || ''} ${issue.title}`.trim(),
    });
  }

  const participants = [issue.reporter, issue.assignee].filter(Boolean);
  for (const recipient of participants) {
    if (notifiedSet.has(recipient.toString())) continue;
    await createNotification({
      recipient,
      actor: req.user.id,
      project: issue.project,
      type: 'comment',
      message: `commented on ${issue.issueKey || ''} "${issue.title}"`,
      entity: 'Issue',
      entityId: issue._id,
      entityTitle: `${issue.issueKey || ''} ${issue.title}`.trim(),
    });
  }

  emitToProject(issue.project, 'comment:added', { issueId: issue._id, comment });
  res.status(201).json({ success: true, comment });
});

export const listComments = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.issueId);
  if (!issue) throw new ApiError(404, 'Issue not found');
  await requireProjectMember(issue.project, req.user.id);

  const comments = await Comment.find({ issue: issue._id })
    .sort({ createdAt: 1 })
    .populate('author', 'name email avatarUrl title');

  res.json({ success: true, comments });
});

export const updateComment = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) throw new ApiError(400, 'Comment body is required');

  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  await requireProjectMember(comment.project, req.user.id);

  if (comment.author.toString() !== req.user.id) {
    throw new ApiError(403, 'You can only edit your own comments');
  }

  comment.body = body.trim();
  comment.editedAt = new Date();
  await comment.save();
  await comment.populate('author', 'name email avatarUrl title');

  emitToProject(comment.project, 'comment:updated', { issueId: comment.issue, comment });
  res.json({ success: true, comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');

  const { role } = await requireProjectMember(comment.project, req.user.id);
  const isOwner = comment.author.toString() === req.user.id;
  const isPrivileged = ['project_lead', 'project_manager'].includes(role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, 'Insufficient permissions to delete this comment');
  }

  const projectId = comment.project;
  const issueId = comment.issue;
  await comment.deleteOne();
  await Issue.findByIdAndUpdate(issueId, { $pull: { comments: req.params.id } });

  emitToProject(projectId, 'comment:deleted', { issueId, commentId: req.params.id });
  res.json({ success: true, message: 'Comment deleted' });
});
