import mongoose from 'mongoose';

const documentItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['spec', 'design', 'runbook', 'meeting', 'attachment'],
      default: 'spec',
    },
    content: { type: String, default: '' },
    externalUrl: { type: String, default: '', trim: true },
    fileName: { type: String, default: '', trim: true },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('DocumentItem', documentItemSchema);
