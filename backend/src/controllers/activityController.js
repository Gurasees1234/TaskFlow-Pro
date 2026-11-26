import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import ActivityLog from '../models/ActivityLog.js';
import { requireProjectMember } from '../utils/projectAuth.js';

export const listActivity = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId || req.query.projectId;
  const { entity, actor, action, from, to, page = 1, limit = 50 } = req.query;

  if (!projectId) throw new ApiError(400, 'projectId is required');
  await requireProjectMember(projectId, req.user.id);

  const filter = { project: projectId };
  if (entity) filter.entity = entity;
  if (actor) filter.actor = actor;
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [activities, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(100, Number(limit)))
      .populate('actor', 'name email avatarUrl')
      .populate('project', 'name key'),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: Number(page), limit: Number(limit), activities });
});
