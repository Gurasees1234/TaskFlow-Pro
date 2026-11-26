import mongoose from 'mongoose';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { ApiError } from './ApiError.js';

export const ROLE_LABELS = {
  project_lead: 'Project Lead',
  project_manager: 'Project Manager',
  developer: 'Developer',
  tester: 'Tester / QA',
  viewer: 'Viewer',
};

export const requireProjectMember = async (projectId, userId, allowedRoles = null) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, 'Valid projectId is required');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const membership = await ProjectMember.findOne({ project: project._id, user: userId });
  if (!membership) {
    throw new ApiError(403, 'Access denied: you are not a member of this project');
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(membership.role)
  ) {
    throw new ApiError(
      403,
      `Forbidden: requires one of [${allowedRoles.map((r) => ROLE_LABELS[r] || r).join(', ')}]`
    );
  }

  return { project, membership, role: membership.role };
};

export const canManageIssues = (role) =>
  ['project_lead', 'project_manager', 'developer', 'tester'].includes(role);

export const canManageSprints = (role) => ['project_lead', 'project_manager'].includes(role);

export const canAssignWork = (role) => ['project_lead', 'project_manager'].includes(role);

export const canInviteMembers = (role) => ['project_lead', 'project_manager'].includes(role);

export const withOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    // Standalone MongoDB instances throw code 20 / IllegalOperation for multi-doc transactions
    if (
      err?.code === 20 ||
      err?.codeName === 'IllegalOperation' ||
      String(err?.message || '').includes('Transaction numbers are only allowed')
    ) {
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};
