import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    type: {
      type: String,
      enum: [
        'assignment',
        'reassignment',
        'mention',
        'comment',
        'status_change',
        'priority_change',
        'sprint_started',
        'sprint_completed',
        'sprint_event',
        'invitation',
        'invitation_received',
        'member_added',
      ],
      required: true,
    },
    message: { type: String, required: true },
    entity: { type: String, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    entityTitle: { type: String, default: '' },
    read: { type: Boolean, default: false },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, project: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
