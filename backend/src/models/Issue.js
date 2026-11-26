import mongoose from 'mongoose';

export const ISSUE_TYPES = ['task', 'bug', 'story', 'epic'];
export const ISSUE_STATUSES = ['todo', 'in_progress', 'in_review', 'testing', 'done', 'blocked'];
export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const issueSchema = new mongoose.Schema(
  {
    issueKey: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    description: { type: String, default: '', trim: true },
    type: { type: String, enum: ISSUE_TYPES, default: 'task' },
    status: { type: String, enum: ISSUE_STATUSES, default: 'todo' },
    priority: { type: String, enum: ISSUE_PRIORITIES, default: 'medium' },
    storyPoints: { type: Number, default: 1, min: 0, max: 100 },
    estimatedEffort: { type: Number, default: 0, min: 0, max: 10000 },
    actualEffort: { type: Number, default: 0, min: 0, max: 10000 },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null, index: true },
    parentIssue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
    order: { type: Number, default: 0 },
    dueDate: { type: Date, default: null },
    labels: [{ type: String, trim: true }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    completedAt: { type: Date, default: null },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
  },
  { timestamps: true }
);

issueSchema.index({ project: 1, issueKey: 1 }, { unique: true });
issueSchema.index({ project: 1, status: 1 });
issueSchema.index({ project: 1, sprint: 1 });
issueSchema.index({ assignee: 1, project: 1, status: 1 });

export default mongoose.model('Issue', issueSchema);
