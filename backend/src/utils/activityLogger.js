import ActivityLog from '../models/ActivityLog.js';
import { emitToProject } from './socketBus.js';

export const logActivity = async (opts) => {
  try {
    if (!opts.project) return null;
    const entry = await ActivityLog.create(opts);
    const populated = await ActivityLog.findById(entry._id)
      .populate('actor', 'name email avatarUrl')
      .populate('project', 'name key');
    emitToProject(opts.project, 'activity:new', populated || entry);
    return populated || entry;
  } catch (err) {
    console.warn('[activityLogger] Failed to log activity:', err.message);
    return null;
  }
};
