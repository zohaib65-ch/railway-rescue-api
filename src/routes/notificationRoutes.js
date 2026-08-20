'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  validateListQuery,
  validateId,
} = require('../middleware/validateNotification');

// All notification routes require the user to be logged in
router.use(requireAuth);

router.get('/', validateListQuery, ctrl.getMyNotifications);
router.patch('/read-all', ctrl.markAllAsRead);

router.patch('/:id/read', validateId, ctrl.markAsRead);
router.delete('/:id', validateId, ctrl.deleteNotification);

module.exports = router;
