import mongoose from 'mongoose';

export const PROJECT_ROLES = ['project_lead', 'project_manager', 'developer', 'tester', 'viewer'];

const projectMemberSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: PROJECT_ROLES,
      default: 'developer',
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

export default mongoose.model('ProjectMember', projectMemberSchema);
