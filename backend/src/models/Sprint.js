import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    goal: { type: String, default: '', trim: true, maxlength: 1000 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned',
    },
    issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
    completionSummary: {
      totalIssues: { type: Number, default: 0 },
      completedIssues: { type: Number, default: 0 },
      incompleteIssues: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      returnedToBacklog: { type: Number, default: 0 },
      movedToSprintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
    },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
  },
  { timestamps: true }
);

sprintSchema.index({ project: 1, status: 1 });

export default mongoose.model('Sprint', sprintSchema);
