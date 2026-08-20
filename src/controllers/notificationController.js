'use strict';

const notificationService = require('../services/notificationService');
const { sendSuccess } = require('../utils/response');

async function getMyNotifications(req, res, next) {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    return sendSuccess(res, 200, 'Notifications retrieved', result);
  } catch (err) { next(err); }
}

async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Notification marked as read', notification);
  } catch (err) { next(err); }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, 200, 'All notifications marked as read', result);
  } catch (err) { next(err); }
}

async function deleteNotification(req, res, next) {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Notification deleted successfully');
  } catch (err) { next(err); }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
