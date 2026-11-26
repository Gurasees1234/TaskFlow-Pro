import multer from 'multer';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Attachment from '../models/Attachment.js';
import Issue from '../models/Issue.js';
import { canManageIssues, requireProjectMember } from '../utils/projectAuth.js';
import {
  deleteLocalFile,
  resolveSafeLocalPath,
  saveLocalFile,
} from '../utils/storageService.js';
import { logActivity } from '../utils/activityLogger.js';
import { emitToProject } from '../utils/socketBus.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
]);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ApiError(400, `Unsupported file type "${file.mimetype}". Allowed: images, PDF, text/CSV/JSON, Office docs, ZIP.`));
      return;
    }
    cb(null, true);
  },
});

export const listAttachments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { issueId } = req.query;

  await requireProjectMember(projectId, req.user.id);

  const filter = { project: projectId };
  if (issueId) filter.issue = issueId;

  const attachments = await Attachment.find(filter)
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'name email avatarUrl')
    .populate('issue', 'issueKey title');

  res.json({ success: true, attachments });
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { issueId, description } = req.body;

  const { role } = await requireProjectMember(projectId, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot upload project attachments');
  }

  if (!req.file) {
    throw new ApiError(400, 'Please select a valid file to upload');
  }

  let validIssue = null;
  if (issueId) {
    validIssue = await Issue.findById(issueId);
    if (!validIssue || validIssue.project.toString() !== projectId) {
      throw new ApiError(400, 'Issue does not belong to this project');
    }
  }

  const { storageKey } = await saveLocalFile({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
  });

  const attachment = await Attachment.create({
    project: projectId,
    issue: validIssue ? validIssue._id : null,
    uploadedBy: req.user.id,
    originalName: req.file.originalname,
    storageKey,
    mimeType: req.file.mimetype,
    size: req.file.size,
    description: String(description || '').trim(),
  });

  await attachment.populate([
    { path: 'uploadedBy', select: 'name email avatarUrl' },
    { path: 'issue', select: 'issueKey title' },
  ]);

  await logActivity({
    actor: req.user.id,
    project: projectId,
    action: 'attachment.uploaded',
    entity: 'Attachment',
    entityId: attachment._id,
    entityTitle: attachment.originalName,
    meta: { issueId: validIssue?._id || null },
  });

  emitToProject(projectId, 'attachment:created', attachment);
  res.status(201).json({ success: true, attachment });
});

export const downloadAttachment = asyncHandler(async (req, res) => {
  const attachment = await Attachment.findById(req.params.id);
  if (!attachment) throw new ApiError(404, 'Attachment not found');

  await requireProjectMember(attachment.project, req.user.id);

  const filePath = resolveSafeLocalPath(attachment.storageKey);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(filePath, attachment.originalName);
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  const attachment = await Attachment.findById(req.params.id);
  if (!attachment) throw new ApiError(404, 'Attachment not found');

  const { role } = await requireProjectMember(attachment.project, req.user.id);
  const canDelete =
    attachment.uploadedBy.toString() === req.user.id ||
    ['project_lead', 'project_manager'].includes(role);
  if (!canDelete) {
    throw new ApiError(403, 'Insufficient permissions to delete this attachment');
  }

  await deleteLocalFile(attachment.storageKey);
  const projectId = attachment.project;
  await attachment.deleteOne();

  emitToProject(projectId, 'attachment:deleted', { attachmentId: req.params.id, projectId });
  res.json({ success: true, message: 'Attachment deleted' });
});
