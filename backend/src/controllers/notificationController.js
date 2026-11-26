import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Notification from '../models/Notification.js';
import { requireProjectMember } from '../utils/projectAuth.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const { projectId, page = 1, limit = 40, unreadOnly, type } = req.query;

  const filter = { recipient: req.user.id };
  if (projectId) {
    await requireProjectMember(projectId, req.user.id);
    filter.project = projectId;
  }
  if (unreadOnly === 'true') filter.read = false;
  if (type) filter.type = type;

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const unreadQuery = { recipient: req.user.id, read: false };
  if (projectId) unreadQuery.project = projectId;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('actor', 'name email avatarUrl')
      .populate('project', 'name key'),
    Notification.countDocuments(filter),
    Notification.countDocuments(unreadQuery),
  ]);

  res.json({
    success: true,
    total,
    unreadCount,
    page: Number(page),
    limit: Number(limit),
    notifications,
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const query = { recipient: req.user.id, read: false };
  if (projectId) {
    await requireProjectMember(projectId, req.user.id);
    query.project = projectId;
  }
  const unreadCount = await Notification.countDocuments(query);
  res.json({ success: true, unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findById(req.params.id);
  if (!notif) throw new ApiError(404, 'Notification not found');
  if (notif.recipient.toString() !== req.user.id) throw new ApiError(403, 'Access denied');

  notif.read = true;
  await notif.save();
  res.json({ success: true, notification: notif });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const projectId = req.body?.projectId || req.query?.projectId;
  const filter = { recipient: req.user.id, read: false };
  if (projectId) {
    await requireProjectMember(projectId, req.user.id);
    filter.project = projectId;
  }

  await Notification.updateMany(filter, { $set: { read: true } });
  const remaining = await Notification.countDocuments(filter);
  res.json({ success: true, unreadCount: remaining, message: 'Notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notif = await Notification.findById(req.params.id);
  if (!notif) throw new ApiError(404, 'Notification not found');
  if (notif.recipient.toString() !== req.user.id) throw new ApiError(403, 'Access denied');
  await notif.deleteOne();
  res.json({ success: true, message: 'Notification deleted' });
});
