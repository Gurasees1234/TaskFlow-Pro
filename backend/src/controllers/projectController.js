import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Project from '../models/Project.js';
import ProjectMember, { PROJECT_ROLES } from '../models/ProjectMember.js';
import Invitation from '../models/Invitation.js';
import Issue from '../models/Issue.js';
import Sprint from '../models/Sprint.js';
import Comment from '../models/Comment.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';
import Attachment from '../models/Attachment.js';
import DocumentItem from '../models/DocumentItem.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import {
  ROLE_LABELS,
  requireProjectMember,
  withOptionalTransaction,
} from '../utils/projectAuth.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationService.js';
import { emitToProject } from '../utils/socketBus.js';
import { isGmailConfigured, sendInvitationEmail } from '../utils/emailService.js';
import { deleteLocalFile } from '../utils/storageService.js';

const VALID_TYPES = [
  'Software Development',
  'Web Development',
  'Mobile Application',
  'Research',
  'Marketing',
  'Design',
  'General',
];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'];

const normalizeKey = (rawKey) =>
  String(rawKey || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

export const createProject = asyncHandler(async (req, res) => {
  const {
    name,
    key,
    description,
    type,
    team,
    startDate,
    targetEndDate,
    priority,
    status,
    lead,
    goals,
    tags,
    initialMembers,
  } = req.body;

  if (!name?.trim() || name.trim().length < 2) {
    throw new ApiError(400, 'Project name must be at least 2 characters');
  }
  const normalizedKey = normalizeKey(key);
  if (normalizedKey.length < 2) {
    throw new ApiError(400, 'Project key must be 2–10 uppercase alphanumeric characters');
  }
  if (!description?.trim()) {
    throw new ApiError(400, 'Project description is required');
  }
  if (!startDate || !targetEndDate) {
    throw new ApiError(400, 'Start date and target end date are required');
  }

  const start = new Date(startDate);
  const target = new Date(targetEndDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) {
    throw new ApiError(400, 'Invalid start date or target end date');
  }
  if (target < start) {
    throw new ApiError(400, 'Target end date must not precede start date');
  }

  const existingKey = await Project.findOne({ key: normalizedKey });
  if (existingKey) {
    throw new ApiError(409, `Project key "${normalizedKey}" is already in use`);
  }

  const projectLeadId = req.user.id;
  if (lead && lead !== req.user.id) {
    const requestedLead = await User.findById(lead);
    if (!requestedLead) throw new ApiError(404, 'Selected project lead user not found');
  }

  const cleanGoals = Array.isArray(goals)
    ? goals.map((g) => String(g || '').trim()).filter(Boolean)
    : [];
  const cleanTags = Array.isArray(tags)
    ? Array.from(new Set(tags.map((t) => String(t || '').trim()).filter(Boolean)))
    : [];

  const created = await withOptionalTransaction(async (session) => {
    const createOpts = session ? { session } : {};
    const [project] = await Project.create(
      [
        {
          name: name.trim(),
          key: normalizedKey,
          description: description.trim(),
          type: VALID_TYPES.includes(type) ? type : 'Software Development',
          team: team?.trim() || 'Development',
          startDate: start,
          targetEndDate: target,
          priority: VALID_PRIORITIES.includes(priority) ? priority : 'medium',
          status: VALID_STATUSES.includes(status) ? status : 'planning',
          lead: projectLeadId,
          createdBy: req.user.id,
          goals: cleanGoals,
          tags: cleanTags,
        },
      ],
      createOpts
    );

    await ProjectMember.create(
      [
        {
          project: project._id,
          user: req.user.id,
          role: 'project_lead',
          invitedBy: req.user.id,
        },
      ],
      createOpts
    );

    if (cleanGoals.length > 0) {
      await Goal.create(
        cleanGoals.map((gTitle) => ({
          title: gTitle,
          project: project._id,
          createdBy: req.user.id,
        })),
        createOpts
      );
    }

    return project;
  });

  // Optionally send initial invitations if requested
  const invitationWarnings = [];
  if (Array.isArray(initialMembers) && initialMembers.length > 0) {
    const inviterUser = await User.findById(req.user.id).select('name email');
    if (!isGmailConfigured()) {
      invitationWarnings.push(
        'Project created, but initial team invitations were not emailed because Gmail SMTP (GMAIL_USER / GMAIL_APP_PASSWORD) is not configured.'
      );
    } else {
      for (const entry of initialMembers) {
        const email = String(entry?.email || '').trim().toLowerCase();
        if (!email || email === inviterUser?.email?.toLowerCase()) continue;
        const inviteRole = PROJECT_ROLES.includes(entry?.role) && entry.role !== 'project_lead'
          ? entry.role
          : 'developer';
        try {
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
          const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);
          await Invitation.create({
            project: created._id,
            inviter: req.user.id,
            email,
            role: inviteRole,
            tokenHash,
            expiresAt,
          });
          await sendInvitationEmail({
            to: email,
            projectName: created.name,
            projectKey: created.key,
            inviterName: inviterUser?.name || 'Project Lead',
            inviterEmail: inviterUser?.email || '',
            roleLabel: ROLE_LABELS[inviteRole] || inviteRole,
            inviteUrl: `${env.appBaseUrl.replace(/\/$/, '')}/invite/${rawToken}`,
            expiresAt,
          });
        } catch (err) {
          invitationWarnings.push(`Failed to invite ${email}: ${err.message}`);
        }
      }
    }
  }

  await created.populate('lead', 'name email avatarUrl title');
  await created.populate('createdBy', 'name email avatarUrl');

  await logActivity({
    actor: req.user.id,
    project: created._id,
    action: 'project.created',
    entity: 'Project',
    entityId: created._id,
    entityTitle: `${created.key} — ${created.name}`,
  });

  res.status(201).json({
    success: true,
    project: {
      ...created.toObject(),
      myRole: 'project_lead',
      memberCount: 1,
      issueCount: 0,
      completedCount: 0,
      progress: 0,
    },
    invitationWarnings,
  });
});

export const getProjects = asyncHandler(async (req, res) => {
  const { status, q, sort = 'recent' } = req.query;

  const memberships = await ProjectMember.find({ user: req.user.id }).select('project role joinedAt');
  if (memberships.length === 0) {
    return res.json({ success: true, projects: [] });
  }

  const roleMap = new Map(memberships.map((m) => [m.project.toString(), m.role]));
  const projectIds = memberships.map((m) => m.project);

  const filter = { _id: { $in: projectIds } };
  if (status && status !== 'all') filter.status = status;
  if (q?.trim()) {
    const regex = { $regex: q.trim(), $options: 'i' };
    filter.$or = [{ name: regex }, { key: regex }, { description: regex }, { tags: regex }];
  }

  const sortMap = {
    recent: { updatedAt: -1 },
    newest: { createdAt: -1 },
    name: { name: 1 },
    targetEndDate: { targetEndDate: 1 },
  };

  const projects = await Project.find(filter)
    .populate('lead', 'name email avatarUrl title')
    .populate('createdBy', 'name email avatarUrl')
    .sort(sortMap[sort] || { updatedAt: -1 });

  const matchedIds = projects.map((p) => p._id);

  const [issueAgg, memberAgg] = await Promise.all([
    Issue.aggregate([
      { $match: { project: { $in: matchedIds } } },
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
    ]),
    ProjectMember.aggregate([
      { $match: { project: { $in: matchedIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]),
  ]);

  const issueMap = new Map(issueAgg.map((r) => [r._id.toString(), r]));
  const memberCountMap = new Map(memberAgg.map((r) => [r._id.toString(), r.count]));

  let enriched = projects.map((p) => {
    const pid = p._id.toString();
    const stats = issueMap.get(pid) || { total: 0, done: 0 };
    const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    return {
      ...p.toObject(),
      myRole: roleMap.get(pid) || 'viewer',
      memberCount: memberCountMap.get(pid) || 1,
      issueCount: stats.total,
      completedCount: stats.done,
      progress,
    };
  });

  if (sort === 'progress') {
    enriched = enriched.sort((a, b) => b.progress - a.progress);
  }

  return res.json({ success: true, projects: enriched });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const { role } = await requireProjectMember(req.params.id, req.user.id);

  const project = await Project.findById(req.params.id)
    .populate('lead', 'name email avatarUrl title')
    .populate('createdBy', 'name email avatarUrl');

  const [totalIssues, doneIssues, memberCount, activeSprintsCount] = await Promise.all([
    Issue.countDocuments({ project: project._id }),
    Issue.countDocuments({ project: project._id, status: 'done' }),
    ProjectMember.countDocuments({ project: project._id }),
    Sprint.countDocuments({ project: project._id, status: 'active' }),
  ]);

  res.json({
    success: true,
    project: {
      ...project.toObject(),
      myRole: role,
      memberCount,
      issueCount: totalIssues,
      completedCount: doneIssues,
      activeSprintsCount,
      progress: totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0,
    },
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const { project, role } = await requireProjectMember(req.params.id, req.user.id, [
    'project_lead',
    'project_manager',
  ]);

  const {
    name,
    key,
    description,
    type,
    team,
    startDate,
    targetEndDate,
    priority,
    status,
    goals,
    tags,
    workflowConfig,
  } = req.body;

  if (status === 'archived' && role !== 'project_lead') {
    throw new ApiError(403, 'Only the Project Lead can archive this project');
  }
  if (key !== undefined && normalizeKey(key) !== project.key && role !== 'project_lead') {
    throw new ApiError(403, 'Only the Project Lead can change the project key');
  }

  const nextStart = startDate ? new Date(startDate) : project.startDate;
  const nextEnd = targetEndDate ? new Date(targetEndDate) : project.targetEndDate;
  if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
    throw new ApiError(400, 'Invalid project dates');
  }
  if (nextEnd < nextStart) {
    throw new ApiError(400, 'Target end date must not precede start date');
  }

  if (key !== undefined) {
    const normalizedKey = normalizeKey(key);
    if (normalizedKey.length < 2) {
      throw new ApiError(400, 'Project key must be 2–10 alphanumeric characters');
    }
    if (normalizedKey !== project.key) {
      const taken = await Project.findOne({ key: normalizedKey, _id: { $ne: project._id } });
      if (taken) throw new ApiError(409, `Project key "${normalizedKey}" is already taken`);
      project.key = normalizedKey;
    }
  }

  if (name !== undefined && name.trim()) project.name = name.trim();
  if (description !== undefined) project.description = description.trim();
  if (type && VALID_TYPES.includes(type)) project.type = type;
  if (team !== undefined) project.team = team.trim();
  project.startDate = nextStart;
  project.targetEndDate = nextEnd;
  if (priority && VALID_PRIORITIES.includes(priority)) project.priority = priority;
  if (status && VALID_STATUSES.includes(status)) project.status = status;
  if (Array.isArray(goals)) {
    project.goals = goals.map((g) => String(g || '').trim()).filter(Boolean);
  }
  if (Array.isArray(tags)) {
    project.tags = Array.from(new Set(tags.map((t) => String(t || '').trim()).filter(Boolean)));
  }
  if (workflowConfig && typeof workflowConfig === 'object') {
    if (Array.isArray(workflowConfig.statuses) && workflowConfig.statuses.length >= 2) {
      project.workflowConfig.statuses = workflowConfig.statuses;
    }
    if (Array.isArray(workflowConfig.types) && workflowConfig.types.length >= 1) {
      project.workflowConfig.types = workflowConfig.types;
    }
    if (Array.isArray(workflowConfig.priorities) && workflowConfig.priorities.length >= 1) {
      project.workflowConfig.priorities = workflowConfig.priorities;
    }
  }

  await project.save();
  await project.populate('lead', 'name email avatarUrl title');
  await project.populate('createdBy', 'name email avatarUrl');

  await logActivity({
    actor: req.user.id,
    project: project._id,
    action: status === 'archived' ? 'project.archived' : 'project.updated',
    entity: 'Project',
    entityId: project._id,
    entityTitle: `${project.key} — ${project.name}`,
  });

  emitToProject(project._id, 'project:updated', project);
  res.json({ success: true, project: { ...project.toObject(), myRole: role } });
});

export const transferLeadership = asyncHandler(async (req, res) => {
  const { newLeadUserId } = req.body;
  if (!newLeadUserId || !mongoose.Types.ObjectId.isValid(newLeadUserId)) {
    throw new ApiError(400, 'Valid newLeadUserId is required');
  }

  const { project } = await requireProjectMember(req.params.id, req.user.id, ['project_lead']);
  if (newLeadUserId === req.user.id) {
    throw new ApiError(400, 'You are already the Project Lead');
  }

  const targetMember = await ProjectMember.findOne({ project: project._id, user: newLeadUserId });
  if (!targetMember) {
    throw new ApiError(404, 'Target user must already be a member of this project');
  }

  await withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    await ProjectMember.updateOne(
      { project: project._id, user: req.user.id },
      { $set: { role: 'project_manager' } },
      opts
    );
    await ProjectMember.updateOne(
      { project: project._id, user: newLeadUserId },
      { $set: { role: 'project_lead' } },
      opts
    );
    await Project.updateOne({ _id: project._id }, { $set: { lead: newLeadUserId } }, opts);
  });

  await logActivity({
    actor: req.user.id,
    project: project._id,
    action: 'project.leadership_transferred',
    entity: 'Project',
    entityId: project._id,
    entityTitle: project.name,
    meta: { newLeadUserId },
  });

  await createNotification({
    recipient: newLeadUserId,
    actor: req.user.id,
    project: project._id,
    type: 'member_added',
    message: `transferred Project Lead ownership of "${project.name}" to you`,
    entity: 'Project',
    entityId: project._id,
    entityTitle: project.name,
  });

  emitToProject(project._id, 'project:updated', { projectId: project._id });
  emitToProject(project._id, 'project:members_updated', { projectId: project._id });

  res.json({ success: true, message: 'Project leadership transferred successfully' });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { project } = await requireProjectMember(req.params.id, req.user.id, ['project_lead']);
  const projectId = project._id;

  const attachments = await Attachment.find({ project: projectId }).select('storageKey');
  await Promise.all(attachments.map((att) => deleteLocalFile(att.storageKey)));

  await Promise.all([
    Issue.deleteMany({ project: projectId }),
    Sprint.deleteMany({ project: projectId }),
    Comment.deleteMany({ project: projectId }),
    ActivityLog.deleteMany({ project: projectId }),
    Notification.deleteMany({ project: projectId }),
    Invitation.deleteMany({ project: projectId }),
    Attachment.deleteMany({ project: projectId }),
    DocumentItem.deleteMany({ project: projectId }),
    Goal.deleteMany({ project: projectId }),
    ProjectMember.deleteMany({ project: projectId }),
    project.deleteOne(),
  ]);

  emitToProject(projectId, 'project:deleted', { projectId });
  res.json({ success: true, message: 'Project deleted permanently' });
});

export const getProjectMembers = asyncHandler(async (req, res) => {
  await requireProjectMember(req.params.id, req.user.id);

  const [memberships, issues] = await Promise.all([
    ProjectMember.find({ project: req.params.id })
      .populate('user', 'name email avatarUrl title createdAt')
      .populate('invitedBy', 'name email')
      .sort({ joinedAt: 1 }),
    Issue.find({ project: req.params.id }).select('assignee status'),
  ]);

  const membersWithStats = memberships
    .filter((m) => m.user)
    .map((m) => {
      const uid = m.user._id.toString();
      const userIssues = issues.filter((i) => i.assignee?.toString() === uid);
      const completedCount = userIssues.filter((i) => i.status === 'done').length;
      const activeTaskCount = userIssues.length - completedCount;

      return {
        _id: m._id,
        user: m.user,
        role: m.role,
        roleLabel: ROLE_LABELS[m.role] || m.role,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy,
        assignedCount: userIssues.length,
        activeTaskCount,
        completedCount,
      };
    });

  res.json({ success: true, members: membersWithStats });
});

export const updateProjectMemberRole = asyncHandler(async (req, res) => {
  const { project, role: actorRole } = await requireProjectMember(req.params.id, req.user.id, [
    'project_lead',
    'project_manager',
  ]);

  const targetUserId = req.params.userId;
  const { role } = req.body;
  if (!PROJECT_ROLES.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${PROJECT_ROLES.join(', ')}`);
  }

  const targetMember = await ProjectMember.findOne({ project: project._id, user: targetUserId }).populate(
    'user',
    'name email'
  );
  if (!targetMember) {
    throw new ApiError(404, 'Member not found in this project');
  }

  if (targetMember.role === 'project_lead' && actorRole !== 'project_lead') {
    throw new ApiError(403, 'Project Manager cannot modify the Project Lead role');
  }
  if (role === 'project_lead' && actorRole !== 'project_lead') {
    throw new ApiError(403, 'Only the Project Lead can assign the Project Lead role');
  }

  if (targetMember.role === 'project_lead' && role !== 'project_lead') {
    const leadCount = await ProjectMember.countDocuments({
      project: project._id,
      role: 'project_lead',
    });
    if (leadCount <= 1) {
      throw new ApiError(
        400,
        'Cannot demote the sole Project Lead. Transfer leadership first.'
      );
    }
  }

  const previousRole = targetMember.role;
  targetMember.role = role;
  await targetMember.save();

  if (role === 'project_lead') {
    project.lead = targetUserId;
    await project.save();
  }

  await logActivity({
    actor: req.user.id,
    project: project._id,
    action: 'member.role_changed',
    entity: 'Member',
    entityId: targetMember._id,
    entityTitle: targetMember.user?.name || 'Member',
    meta: { targetUserId, previousRole, newRole: role },
  });

  await createNotification({
    recipient: targetUserId,
    actor: req.user.id,
    project: project._id,
    type: 'member_added',
    message: `updated your role in "${project.name}" to ${ROLE_LABELS[role] || role}`,
    entity: 'Project',
    entityId: project._id,
    entityTitle: project.name,
  });

  emitToProject(project._id, 'project:members_updated', { projectId: project._id });
  res.json({ success: true, member: targetMember });
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  const { project, role: actorRole } = await requireProjectMember(req.params.id, req.user.id, [
    'project_lead',
    'project_manager',
  ]);
  const targetUserId = req.params.userId || req.body?.userId;
  if (!targetUserId) throw new ApiError(400, 'userId is required');

  const targetMember = await ProjectMember.findOne({ project: project._id, user: targetUserId }).populate(
    'user',
    'name email'
  );
  if (!targetMember) {
    throw new ApiError(404, 'Member not found in this project');
  }

  if (targetMember.role === 'project_lead') {
    if (actorRole !== 'project_lead') {
      throw new ApiError(403, 'Project Manager cannot remove the Project Lead');
    }
    const leadCount = await ProjectMember.countDocuments({
      project: project._id,
      role: 'project_lead',
    });
    if (leadCount <= 1) {
      throw new ApiError(400, 'Cannot remove the sole Project Lead. Transfer leadership first.');
    }
  }

  await withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    await targetMember.deleteOne(opts);
    await Issue.updateMany(
      { project: project._id, assignee: targetUserId },
      { $set: { assignee: null } },
      opts
    );
  });

  await logActivity({
    actor: req.user.id,
    project: project._id,
    action: 'member.removed',
    entity: 'Member',
    entityId: targetMember._id,
    entityTitle: targetMember.user?.name || 'Member',
    meta: { targetUserId },
  });

  emitToProject(project._id, 'project:members_updated', { projectId: project._id });
  res.json({ success: true, message: 'Member removed from project' });
});

export const getProjectStats = asyncHandler(async (req, res) => {
  const { project } = await requireProjectMember(req.params.id, req.user.id);

  const now = new Date();
  const [totalIssues, overdueIssues, activeSprintsCount, memberCount, statusAgg, priorityAgg, typeAgg] =
    await Promise.all([
      Issue.countDocuments({ project: project._id }),
      Issue.countDocuments({
        project: project._id,
        status: { $ne: 'done' },
        dueDate: { $lt: now, $ne: null },
      }),
      Sprint.countDocuments({ project: project._id, status: 'active' }),
      ProjectMember.countDocuments({ project: project._id }),
      Issue.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

  const statusCounts = statusAgg.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});
  const priorityCounts = priorityAgg.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});
  const typeCounts = typeAgg.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});
  const doneCount = statusCounts.done || 0;

  res.json({
    success: true,
    totalIssues,
    completedIssues: doneCount,
    overdueIssues,
    activeSprintsCount,
    memberCount,
    progress: totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0,
    statusCounts,
    priorityCounts,
    typeCounts,
  });
});
