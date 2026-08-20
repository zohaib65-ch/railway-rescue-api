'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assignmentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  validateCreateAssignment,
  validateUpdateStatus,
  validateListQuery,
  validateId,
} = require('../middleware/validateAssignment');

// Assignment management is typically for 'coordinator' and 'admin' roles
router.use(requireAuth, requireRole('coordinator', 'admin'));

router
  .route('/')
  /** GET /api/assignments — list all assignments */
  .get(validateListQuery, ctrl.getAllAssignments)
  /** POST /api/assignments — dispatch a team to a train */
  .post(validateCreateAssignment, ctrl.createAssignment);

router
  .route('/:id')
  /** GET /api/assignments/:id — get assignment details */
  .get(validateId, ctrl.getAssignmentById)
  /** DELETE /api/assignments/:id — remove assignment (hard delete) */
  .delete(validateId, ctrl.deleteAssignment);

/** PATCH /api/assignments/:id/status — update dispatch status */
router.patch('/:id/status', validateUpdateStatus, ctrl.updateAssignmentStatus);

module.exports = router;
