import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import DocumentItem from '../models/DocumentItem.js';
import { canManageIssues, requireProjectMember } from '../utils/projectAuth.js';
import { logActivity } from '../utils/activityLogger.js';

export const listDocuments = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId || req.query.projectId;
  const { category, q } = req.query;
  if (!projectId) throw new ApiError(400, 'projectId is required');
  await requireProjectMember(projectId, req.user.id);

  const filter = { project: projectId };
  if (category) filter.category = category;
  if (q?.trim()) filter.title = { $regex: q.trim(), $options: 'i' };

  const documents = await DocumentItem.find(filter)
    .sort({ updatedAt: -1 })
    .populate('createdBy', 'name email avatarUrl')
    .populate('project', 'name key');

  res.json({ success: true, documents });
});

export const createDocument = asyncHandler(async (req, res) => {
  const { title, category, content, externalUrl, projectId } = req.body;
  if (!title?.trim() || !projectId) {
    throw new ApiError(400, 'title and projectId are required');
  }
  const { role } = await requireProjectMember(projectId, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot create documents');
  }

  const doc = await DocumentItem.create({
    title: title.trim(),
    category: category || 'spec',
    content: content || '',
    externalUrl: externalUrl?.trim() || '',
    project: projectId,
    createdBy: req.user.id,
  });

  await doc.populate([
    { path: 'createdBy', select: 'name email avatarUrl' },
    { path: 'project', select: 'name key' },
  ]);

  await logActivity({
    actor: req.user.id,
    project: projectId,
    action: 'document.created',
    entity: 'Document',
    entityId: doc._id,
    entityTitle: doc.title,
  });

  res.status(201).json({ success: true, document: doc });
});

export const updateDocument = asyncHandler(async (req, res) => {
  const doc = await DocumentItem.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Document not found');

  const { role } = await requireProjectMember(doc.project, req.user.id);
  if (!canManageIssues(role)) {
    throw new ApiError(403, 'Viewers cannot update documents');
  }

  const { title, category, content, externalUrl } = req.body;
  if (title !== undefined && title.trim()) doc.title = title.trim();
  if (category) doc.category = category;
  if (content !== undefined) doc.content = content;
  if (externalUrl !== undefined) doc.externalUrl = externalUrl.trim();

  await doc.save();
  await doc.populate([
    { path: 'createdBy', select: 'name email avatarUrl' },
    { path: 'project', select: 'name key' },
  ]);
  res.json({ success: true, document: doc });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await DocumentItem.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Document not found');

  const { role } = await requireProjectMember(doc.project, req.user.id);
  const canDelete =
    doc.createdBy.toString() === req.user.id || ['project_lead', 'project_manager'].includes(role);
  if (!canDelete) throw new ApiError(403, 'Insufficient permissions');

  await doc.deleteOne();
  res.json({ success: true, message: 'Document deleted' });
});
