import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    action: { type: String, required: true },
    entity: { type: String, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    entityTitle: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
  },
  { timestamps: true, collection: 'activities' }
);

activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
