'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rescueTeamController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  validateCreateTeam,
  validateUpdateTeam,
  validateAvailability,
  validateListQuery,
  validateId,
} = require('../middleware/validateRescueTeam');

// Rescue team management is typically for 'coordinator' and 'admin' roles
router.use(requireAuth, requireRole('coordinator', 'admin'));

router
  .route('/')
  /** GET /api/rescue-teams — list teams */
  .get(validateListQuery, ctrl.getAllRescueTeams)
  /** POST /api/rescue-teams — create a new team */
  .post(validateCreateTeam, ctrl.createRescueTeam);

router
  .route('/:id')
  /** GET /api/rescue-teams/:id — fetch single team */
  .get(validateId, ctrl.getRescueTeamById)
  /** PATCH /api/rescue-teams/:id — update team details */
  .patch(validateUpdateTeam, ctrl.updateRescueTeam)
  /** DELETE /api/rescue-teams/:id — remove a team */
  .delete(validateId, ctrl.deleteRescueTeam);

/** PATCH /api/rescue-teams/:id/availability — toggle availability */
router.patch('/:id/availability', validateAvailability, ctrl.setAvailability);

module.exports = router;
