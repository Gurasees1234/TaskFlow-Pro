import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Workspace from '../models/Workspace.js';
import Project from '../models/Project.js';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import { requireWorkspaceMember } from '../utils/workspaceAuth.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationService.js';

const VALID_ROLES = ['admin', 'project_manager', 'developer', 'tester'];

export const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find({ 'members.user': req.user.id })
    .populate('members.user', 'name email avatarUrl title')
    .sort({ createdAt: 1 });

  res.json({ success: true, workspaces });
});

export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) throw new ApiError(400, 'Workspace name is required');

  const workspace = await Workspace.create({
    name: name.trim(),
    description: description?.trim() || '',
    owner: req.user.id,
    members: [{ user: req.user.id, role: 'admin' }],
  });

  await workspace.populate('members.user', 'name email avatarUrl title');

  await logActivity({
    actor: req.user.id,
    workspace: workspace._id,
    action: 'workspace.created',
    entity: 'Workspace',
    entityId: workspace._id,
    entityTitle: workspace.name,
  });

  res.status(201).json({ success: true, workspace });
});

export const getWorkspace = asyncHandler(async (req, res) => {
  await requireWorkspaceMember(req.params.id, req.user.id);
  const ws = await Workspace.findById(req.params.id).populate(
    'members.user',
    'name email avatarUrl title'
  );
  res.json({ success: true, workspace: ws });
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const { workspace } = await requireWorkspaceMember(req.params.id, req.user.id, ['admin']);
  const { name, description } = req.body;
  if (name !== undefined && name.trim()) workspace.name = name.trim();
  if (description !== undefined) workspace.description = description.trim();
  await workspace.save();
  await workspace.populate('members.user', 'name email avatarUrl title');

  await logActivity({
    actor: req.user.id,
    workspace: workspace._id,
    action: 'workspace.updated',
    entity: 'Workspace',
    entityId: workspace._id,
    entityTitle: workspace.name,
  });

  res.json({ success: true, workspace });
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  const { workspace } = await requireWorkspaceMember(req.params.id, req.user.id, ['admin']);
  await workspace.deleteOne();
  res.json({ success: true, message: 'Workspace deleted' });
});

export const getWorkspaceMembers = asyncHandler(async (req, res) => {
  await requireWorkspaceMember(req.params.id, req.user.id);
  const ws = await Workspace.findById(req.params.id).populate(
    'members.user',
    'name email avatarUrl title createdAt'
  );

  const [projects, issues] = await Promise.all([
    Project.find({ workspace: ws._id }).select('members createdBy'),
    Issue.find({ workspace: ws._id }).select('assignee status'),
  ]);

  const membersWithMetrics = ws.members
    .filter((m) => m.user)
    .map((m) => {
      const uid = m.user._id.toString();
      const projectCount = projects.filter(
        (p) => p.createdBy?.toString() === uid || p.members.some((pm) => pm.toString() === uid)
      ).length;
      const assignedIssues = issues.filter((i) => i.assignee?.toString() === uid);
      const completedCount = assignedIssues.filter((i) => i.status === 'done').length;
      const activeTaskCount = assignedIssues.filter((i) => i.status !== 'done').length;

      return {
        _id: m._id,
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt,
        projectCount,
        assignedCount: assignedIssues.length,
        activeTaskCount,
        completedCount,
      };
    });

  res.json({ success: true, members: membersWithMetrics });
});

export const addMember = asyncHandler(async (req, res) => {
  const { userId, email, role } = req.body;
  const { workspace } = await requireWorkspaceMember(req.params.id, req.user.id, ['admin']);

  const assignedRole = VALID_ROLES.includes(role) ? role : 'developer';
  let user = null;
  if (userId) {
    user = await User.findById(userId);
  } else if (email) {
    user = await User.findOne({ email: email.trim().toLowerCase() });
  } else {
    throw new ApiError(400, 'userId or email is required');
  }

  if (!user) throw new ApiError(404, 'User account not found with that email/ID');
  if (workspace.members.some((m) => m.user.toString() === user._id.toString())) {
    throw new ApiError(409, 'User is already a member of this workspace');
  }

  workspace.members.push({ user: user._id, role: assignedRole });
  await workspace.save();
  await workspace.populate('members.user', 'name email avatarUrl title');

  await logActivity({
    actor: req.user.id,
    workspace: workspace._id,
    action: 'workspace.member_added',
    entity: 'Workspace',
    entityId: workspace._id,
    entityTitle: user.name,
    meta: { role: assignedRole, targetUserId: user._id },
  });

  await createNotification({
    recipient: user._id,
    actor: req.user.id,
    workspace: workspace._id,
    type: 'invitation',
    message: `added you to workspace "${workspace.name}" as ${assignedRole.replace('_', ' ')}`,
    entity: 'Workspace',
    entityId: workspace._id,
    entityTitle: workspace.name,
  });

  res.status(201).json({ success: true, workspace });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { workspace } = await requireWorkspaceMember(req.params.id, req.user.id, ['admin']);
  const targetUserId = req.params.userId;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const targetMember = workspace.members.find((m) => m.user.toString() === targetUserId);
  if (!targetMember) throw new ApiError(404, 'Member not found in workspace');

  if (targetMember.role === 'admin' && role !== 'admin') {
    const adminCount = workspace.members.filter((m) => m.role === 'admin').length;
    if (adminCount <= 1) {
      throw new ApiError(400, 'Cannot demote the only remaining workspace admin');
    }
  }

  const previousRole = targetMember.role;
  targetMember.role = role;
  await workspace.save();
  await workspace.populate('members.user', 'name email avatarUrl title');

  await logActivity({
    actor: req.user.id,
    workspace: workspace._id,
    action: 'workspace.role_updated',
    entity: 'Workspace',
    entityId: workspace._id,
    entityTitle: workspace.name,
    meta: { targetUserId, previousRole, newRole: role },
  });

  res.json({ success: true, workspace });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { workspace } = await requireWorkspaceMember(req.params.id, req.user.id, ['admin']);
  const targetUserId = req.params.userId || req.body?.userId;
  if (!targetUserId) throw new ApiError(400, 'userId is required');

  const targetMember = workspace.members.find((m) => m.user.toString() === targetUserId);
  if (!targetMember) throw new ApiError(404, 'Member not found in workspace');

  if (targetMember.role === 'admin') {
    const adminCount = workspace.members.filter((m) => m.role === 'admin').length;
    if (adminCount <= 1) {
      throw new ApiError(400, 'Cannot remove the only remaining workspace admin');
    }
  }

  workspace.members = workspace.members.filter((m) => m.user.toString() !== targetUserId);
  await workspace.save();
  await workspace.populate('members.user', 'name email avatarUrl title');

  await logActivity({
    actor: req.user.id,
    workspace: workspace._id,
    action: 'workspace.member_removed',
    entity: 'Workspace',
    entityId: workspace._id,
    entityTitle: workspace.name,
    meta: { targetUserId },
  });

  res.json({ success: true, workspace });
});
