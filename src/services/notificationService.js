'use strict';

const { prisma } = require('../config/database');
const { AppError } = require('./authService');

// TODO: Replace with an actual email provider like Nodemailer or SendGrid when credentials are added
const EMAIL_SERVICE = process.env.EMAIL_SERVICE_API_KEY || null;

/**
 * Internal function to dispatch an email notification.
 */
async function sendEmailNotification(user, title, message) {
  if (EMAIL_SERVICE) {
    // Implement real email sending here in the future
    console.log(`[EMAIL DISPATCHED] To: ${user.email} | Subject: ${title}`);
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV EMAIL MOCK] To: ${user.email} | Subject: ${title}\nBody: ${message}`);
  }
}

// ─── INTERNAL EMIT ────────────────────────────────────────────────────────────

/**
 * Creates an in-app notification and attempts to send an email.
 * This is called internally by other services (e.g. when an assignment is made).
 */
async function emitNotification(userId, title, message, link = null) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return; // Fail silently if user doesn't exist to not break main workflows

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      link,
    },
  });

  // Attempt to send email in background
  sendEmailNotification(user, title, message).catch((err) => {
    console.error('Failed to send email notification:', err);
  });

  return notification;
}

// ─── READ ─────────────────────────────────────────────────────────────────────

async function getUserNotifications(userId, { isRead, limit = 20 }) {
  const where = { userId };
  
  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, parseInt(limit))),
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { notifications, unreadCount };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  
  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }

  if (notification.userId !== userId) {
    throw new AppError('You do not have permission to modify this notification', 403, 'FORBIDDEN');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

async function markAllAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function deleteNotification(notificationId, userId) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  
  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }

  if (notification.userId !== userId) {
    throw new AppError('You do not have permission to delete this notification', 403, 'FORBIDDEN');
  }

  await prisma.notification.delete({ where: { id: notificationId } });
}

module.exports = {
  emitNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
