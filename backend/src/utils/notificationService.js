import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { emitToUser } from './socketBus.js';

const TYPE_TO_PREF = {
  assignment: 'assignments',
  reassignment: 'assignments',
  mention: 'mentions',
  comment: 'comments',
  status_change: 'statusChanges',
  priority_change: 'statusChanges',
  sprint_started: 'sprintEvents',
  sprint_completed: 'sprintEvents',
  sprint_event: 'sprintEvents',
  invitation: 'invitations',
  invitation_received: 'invitations',
  member_added: 'invitations',
};

export const createNotification = async ({
  recipient,
  actor,
  project,
  type,
  message,
  entity,
  entityId,
  entityTitle,
}) => {
  if (!recipient) return null;
  if (actor && recipient.toString() === actor.toString()) return null;

  try {
    const recipientUser = await User.findById(recipient).select('notificationPreferences');
    const prefKey = TYPE_TO_PREF[type];
    if (recipientUser?.notificationPreferences && prefKey) {
      if (recipientUser.notificationPreferences[prefKey] === false) {
        return null;
      }
    }

    const notif = await Notification.create({
      recipient,
      actor,
      project: project || null,
      type,
      message,
      entity,
      entityId,
      entityTitle,
    });

    const populated = await Notification.findById(notif._id)
      .populate('actor', 'name email avatarUrl')
      .populate('project', 'name key');

    emitToUser(recipient, 'notification:new', populated || notif);
    return populated || notif;
  } catch (err) {
    console.warn('[notificationService] Failed to create notification:', err.message);
    return null;
  }
};
