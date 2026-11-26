import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
    },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    type: {
      type: String,
      enum: [
        'Software Development',
        'Web Development',
        'Mobile Application',
        'Research',
        'Marketing',
        'Design',
        'General',
      ],
      default: 'Software Development',
    },
    team: { type: String, default: 'Development', trim: true },
    startDate: { type: Date, required: true },
    targetEndDate: { type: Date, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
      default: 'planning',
      index: true,
    },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    goals: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    issueCounter: { type: Number, default: 100 },
    workflowConfig: {
      statuses: {
        type: [String],
        default: ['todo', 'in_progress', 'in_review', 'testing', 'done', 'blocked'],
      },
      types: {
        type: [String],
        default: ['task', 'bug', 'story', 'epic'],
      },
      priorities: {
        type: [String],
        default: ['low', 'medium', 'high', 'critical'],
      },
    },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
  },
  { timestamps: true }
);

projectSchema.index({ createdAt: -1 });

export default mongoose.model('Project', projectSchema);
