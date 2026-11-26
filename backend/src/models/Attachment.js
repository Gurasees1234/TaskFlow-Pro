import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true, trim: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

attachmentSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model('Attachment', attachmentSchema);
