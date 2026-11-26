import Workspace from '../models/Workspace.js';
import { ApiError } from './ApiError.js';

export const requireWorkspaceMember = async (workspaceId, userId, allowedRoles = null) => {
  if (!workspaceId) {
    throw new ApiError(400, 'workspaceId is required');
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }

  const member = workspace.members.find((m) => m.user.toString() === userId.toString());
  if (!member) {
    throw new ApiError(403, 'Access denied: you are not a member of this workspace');
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
    throw new ApiError(403, `Forbidden: requires one of [${allowedRoles.join(', ')}] role`);
  }

  return { workspace, member };
};

