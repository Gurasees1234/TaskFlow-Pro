import crypto from 'node:crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Invitation from '../models/Invitation.js';
import ProjectMember, { PROJECT_ROLES } from '../models/ProjectMember.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import {
  ROLE_LABELS,
  requireProjectMember,
  withOptionalTransaction,
} from '../utils/projectAuth.js';
import {
  isGmailConfigured,
  sendInvitationEmail,
  verifyEmailConfiguration,
} from '../utils/emailService.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationService.js';
import { emitToProject } from '../utils/socketBus.js';

const hashToken = (rawToken) => crypto.createHash('sha256').update(String(rawToken)).digest('hex');

export const getEmailStatus = asyncHandler(async (_req, res) => {
  const status = await verifyEmailConfiguration();
  res.json({ success: true, ...status });
});

export const createProjectInvitations = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { project, role: actorRole } = await requireProjectMember(projectId, req.user.id, [
    'project_lead',
    'project_manager',
  ]);

  if (!isGmailConfigured()) {
    throw new ApiError(
      503,
      'Gmail SMTP is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env before sending email invitations.'
    );
  }

  const inviter = await User.findById(req.user.id).select('name email');
  const rawInvites = Array.isArray(req.body.invites)
    ? req.body.invites
    : [{ email: req.body.email, role: req.body.role }];

  const message = String(req.body.message || '').trim();
  const cleanedInvites = rawInvites
    .map((item) => ({
      email: String(item?.email || '').trim().toLowerCase(),
      role: PROJECT_ROLES.includes(item?.role) ? item.role : 'developer',
    }))
    .filter((item) => item.email);

  if (cleanedInvites.length === 0) {
    throw new ApiError(400, 'At least one valid email address is required');
  }

  const sent = [];
  const failed = [];

  for (const item of cleanedInvites) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
      failed.push({ email: item.email, reason: 'Invalid email format' });
      continue;
    }

    if (item.role === 'project_lead' && actorRole !== 'project_lead') {
      failed.push({ email: item.email, reason: 'Only Project Lead can invite another Project Lead' });
      continue;
    }

    const existingUser = await User.findOne({ email: item.email });
    if (existingUser) {
      const alreadyMember = await ProjectMember.exists({
        project: project._id,
        user: existingUser._id,
      });
      if (alreadyMember) {
        failed.push({ email: item.email, reason: 'User is already a member of this project' });
        continue;
      }
    }

    // Revoke any earlier pending invitation to the same email for this project
    await Invitation.updateMany(
      { project: project._id, email: item.email, status: 'pending' },
      { $set: { status: 'revoked' } }
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);
    const inviteUrl = `${env.appBaseUrl.replace(/\/$/, '')}/invite/${rawToken}`;

    const invitation = await Invitation.create({
      project: project._id,
      inviter: req.user.id,
      email: item.email,
      role: item.role,
      message,
      tokenHash,
      expiresAt,
      status: 'pending',
    });

    try {
      await sendInvitationEmail({
        to: item.email,
        projectName: project.name,
        projectKey: project.key,
        inviterName: inviter?.name || 'Project Lead',
        inviterEmail: inviter?.email || '',
        roleLabel: ROLE_LABELS[item.role] || item.role,
        message,
        inviteUrl,
        expiresAt,
      });

      await logActivity({
        actor: req.user.id,
        project: project._id,
        action: 'member.invited',
        entity: 'Invitation',
        entityId: invitation._id,
        entityTitle: item.email,
        meta: { role: item.role },
      });

      if (existingUser) {
        await createNotification({
          recipient: existingUser._id,
          actor: req.user.id,
          project: project._id,
          type: 'invitation_received',
          message: `invited you to join "${project.name}" (${project.key}) as ${ROLE_LABELS[item.role] || item.role}`,
          entity: 'Project',
          entityId: project._id,
          entityTitle: project.name,
        });
      }

      const safeInvite = invitation.toObject();
      delete safeInvite.tokenHash;
      sent.push(safeInvite);
    } catch (err) {
      await invitation.deleteOne();
      failed.push({ email: item.email, reason: err.message });
    }
  }

  if (sent.length === 0 && failed.length > 0) {
    throw new ApiError(400, failed.map((f) => `${f.email}: ${f.reason}`).join('; '));
  }

  emitToProject(project._id, 'project:members_updated', { projectId: project._id });
  res.status(201).json({ success: true, sent, failed });
});

export const listProjectInvitations = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await requireProjectMember(projectId, req.user.id, ['project_lead', 'project_manager']);

  await Invitation.updateMany(
    { project: projectId, status: 'pending', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );

  const invitations = await Invitation.find({ project: projectId })
    .select('-tokenHash')
    .populate('inviter', 'name email avatarUrl')
    .populate('acceptedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, invitations });
});

export const resendInvitation = asyncHandler(async (req, res) => {
  const { projectId, invitationId } = req.params;
  const { project } = await requireProjectMember(projectId, req.user.id, [
    'project_lead',
    'project_manager',
  ]);

  if (!isGmailConfigured()) {
    throw new ApiError(
      503,
      'Gmail SMTP is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env.'
    );
  }

  const invitation = await Invitation.findOne({ _id: invitationId, project: projectId });
  if (!invitation) throw new ApiError(404, 'Invitation not found');
  if (invitation.status === 'accepted') {
    throw new ApiError(400, 'This invitation has already been accepted');
  }
  if (invitation.status === 'revoked') {
    throw new ApiError(400, 'This invitation was revoked. Send a new invitation instead.');
  }

  const inviter = await User.findById(req.user.id).select('name email');
  const rawToken = crypto.randomBytes(32).toString('hex');
  invitation.tokenHash = hashToken(rawToken);
  invitation.expiresAt = new Date(Date.now() + 72 * 3600 * 1000);
  invitation.status = 'pending';

  await sendInvitationEmail({
    to: invitation.email,
    projectName: project.name,
    projectKey: project.key,
    inviterName: inviter?.name || 'Project Lead',
    inviterEmail: inviter?.email || '',
    roleLabel: ROLE_LABELS[invitation.role] || invitation.role,
    message: invitation.message,
    inviteUrl: `${env.appBaseUrl.replace(/\/$/, '')}/invite/${rawToken}`,
    expiresAt: invitation.expiresAt,
  });

  await invitation.save();
  const safeInvite = invitation.toObject();
  delete safeInvite.tokenHash;

  res.json({ success: true, invitation: safeInvite });
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  const { projectId, invitationId } = req.params;
  const { project } = await requireProjectMember(projectId, req.user.id, [
    'project_lead',
    'project_manager',
  ]);

  const invitation = await Invitation.findOne({ _id: invitationId, project: projectId });
  if (!invitation) throw new ApiError(404, 'Invitation not found');
  if (invitation.status === 'accepted') {
    throw new ApiError(400, 'Cannot revoke an already accepted invitation');
  }

  invitation.status = 'revoked';
  await invitation.save();

  await logActivity({
    actor: req.user.id,
    project: project._id,
    action: 'invitation.revoked',
    entity: 'Invitation',
    entityId: invitation._id,
    entityTitle: invitation.email,
  });

  res.json({ success: true, message: 'Invitation revoked' });
});

export const verifyInvitationToken = asyncHandler(async (req, res) => {
  const rawToken = req.params.token;
  if (!rawToken) throw new ApiError(400, 'Invitation token is required');

  const invitation = await Invitation.findOne({ tokenHash: hashToken(rawToken) })
    .populate('project', 'name key description type status')
    .populate('inviter', 'name email');

  if (!invitation) {
    throw new ApiError(404, 'Invitation link is invalid or does not exist');
  }

  if (invitation.status === 'pending' && invitation.expiresAt <= new Date()) {
    invitation.status = 'expired';
    await invitation.save();
  }

  res.json({
    success: true,
    valid: invitation.status === 'pending',
    invitation: {
      _id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      roleLabel: ROLE_LABELS[invitation.role] || invitation.role,
      message: invitation.message,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      project: invitation.project,
      inviter: invitation.inviter,
    },
  });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const rawToken = req.body?.token || req.params?.token;
  if (!rawToken) throw new ApiError(400, 'Invitation token is required');

  const invitation = await Invitation.findOne({ tokenHash: hashToken(rawToken) }).populate(
    'project',
    'name key lead'
  );
  if (!invitation) {
    throw new ApiError(404, 'Invitation link is invalid');
  }

  if (invitation.status === 'pending' && invitation.expiresAt <= new Date()) {
    invitation.status = 'expired';
    await invitation.save();
  }

  if (invitation.status === 'expired') {
    throw new ApiError(410, 'This invitation has expired');
  }
  if (invitation.status === 'revoked') {
    throw new ApiError(403, 'This invitation has been revoked');
  }
  if (invitation.status === 'accepted') {
    throw new ApiError(409, 'This invitation has already been accepted');
  }

  const currentUser = await User.findById(req.user.id).select('name email');
  if (!currentUser) throw new ApiError(404, 'User not found');

  if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new ApiError(
      403,
      `This invitation was issued for ${invitation.email}. Please sign in with that email address.`
    );
  }

  const alreadyMember = await ProjectMember.findOne({
    project: invitation.project._id,
    user: currentUser._id,
  });
  if (alreadyMember) {
    invitation.status = 'accepted';
    invitation.acceptedBy = currentUser._id;
    invitation.acceptedAt = new Date();
    await invitation.save();
    throw new ApiError(409, 'You are already a member of this project');
  }

  const membership = await withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [createdMember] = await ProjectMember.create(
      [
        {
          project: invitation.project._id,
          user: currentUser._id,
          role: invitation.role,
          invitedBy: invitation.inviter,
        },
      ],
      opts
    );

    invitation.status = 'accepted';
    invitation.acceptedBy = currentUser._id;
    invitation.acceptedAt = new Date();
    await invitation.save(opts);

    return createdMember;
  });

  await logActivity({
    actor: currentUser._id,
    project: invitation.project._id,
    action: 'member.joined',
    entity: 'Member',
    entityId: membership._id,
    entityTitle: currentUser.name,
    meta: { role: invitation.role },
  });

  await createNotification({
    recipient: invitation.inviter,
    actor: currentUser._id,
    project: invitation.project._id,
    type: 'member_added',
    message: `${currentUser.name} accepted your invitation to join "${invitation.project.name}"`,
    entity: 'Project',
    entityId: invitation.project._id,
    entityTitle: invitation.project.name,
  });

  emitToProject(invitation.project._id, 'project:members_updated', {
    projectId: invitation.project._id,
  });

  res.json({
    success: true,
    projectId: invitation.project._id,
    project: invitation.project,
    membership,
  });
});

export const listMyPendingInvitations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('email');
  if (!user) throw new ApiError(404, 'User not found');

  await Invitation.updateMany(
    { email: user.email.toLowerCase(), status: 'pending', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );

  const invitations = await Invitation.find({
    email: user.email.toLowerCase(),
    status: 'pending',
  })
    .select('-tokenHash')
    .populate('project', 'name key type status')
    .populate('inviter', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, invitations });
});

export const acceptInvitationById = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findById(req.params.invitationId).populate(
    'project',
    'name key lead'
  );
  if (!invitation) throw new ApiError(404, 'Invitation not found');

  if (invitation.status === 'pending' && invitation.expiresAt <= new Date()) {
    invitation.status = 'expired';
    await invitation.save();
  }
  if (invitation.status !== 'pending') {
    throw new ApiError(400, `Cannot accept invitation in status "${invitation.status}"`);
  }

  const user = await User.findById(req.user.id).select('name email');
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new ApiError(403, 'You can only accept invitations addressed to your email');
  }

  const exists = await ProjectMember.findOne({ project: invitation.project._id, user: user._id });
  if (exists) {
    invitation.status = 'accepted';
    invitation.acceptedBy = user._id;
    invitation.acceptedAt = new Date();
    await invitation.save();
    throw new ApiError(409, 'You are already a member of this project');
  }

  const membership = await withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [m] = await ProjectMember.create(
      [
        {
          project: invitation.project._id,
          user: user._id,
          role: invitation.role,
          invitedBy: invitation.inviter,
        },
      ],
      opts
    );
    invitation.status = 'accepted';
    invitation.acceptedBy = user._id;
    invitation.acceptedAt = new Date();
    await invitation.save(opts);
    return m;
  });

  await logActivity({
    actor: user._id,
    project: invitation.project._id,
    action: 'member.joined',
    entity: 'Member',
    entityId: membership._id,
    entityTitle: user.name,
    meta: { role: invitation.role },
  });

  emitToProject(invitation.project._id, 'project:members_updated', {
    projectId: invitation.project._id,
  });

  res.json({ success: true, projectId: invitation.project._id, membership });
});
