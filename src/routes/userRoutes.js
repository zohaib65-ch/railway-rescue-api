'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  validateListQuery,
  validateUpdateUser,
  validateId,
} = require('../middleware/validateUser');

// ─── ADMIN ONLY ROUTES ────────────────────────────────────────────────────────

// All user management routes require the user to be logged in and have the 'admin' role.
router.use(requireAuth, requireRole('admin'));

router
  .route('/')
  /** GET /api/users — list users with pagination and filters */
  .get(validateListQuery, ctrl.getAllUsers);

router
  .route('/:id')
  /** GET /api/users/:id — fetch single user */
  .get(validateId, ctrl.getUserById)
  /** PATCH /api/users/:id — update user details or role */
  .patch(validateUpdateUser, ctrl.updateUser)
  /** DELETE /api/users/:id — permanently remove a user */
  .delete(validateId, ctrl.deleteUser);

/** PATCH /api/users/:id/deactivate — prevent user from logging in */
router.patch('/:id/deactivate', validateId, ctrl.deactivateUser);

/** PATCH /api/users/:id/activate — allow user to log in again */
router.patch('/:id/activate', validateId, ctrl.activateUser);

module.exports = router;
