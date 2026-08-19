'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/trainController');
const {
  validateCreateTrain,
  validateUpdateTrain,
  validateUpdateStatus,
  validateListQuery,
  validateSearchQuery,
  validateId,
} = require('../middleware/validateTrain');

// ─── STATIC / NON-PARAM ROUTES (must come before /:id) ───────────────────────

/** GET /api/trains/active  — active requests only */
router.get('/active', ctrl.getActiveTrains);

/** GET /api/trains/stats   — aggregated counts */
router.get('/stats', ctrl.getTrainStats);

/** GET /api/trains/search?q=... — full-text search */
router.get('/search', validateSearchQuery, ctrl.searchTrains);

// ─── COLLECTION ROUTES ────────────────────────────────────────────────────────

router
  .route('/')
  /** GET /api/trains  — paginated list with filters */
  .get(validateListQuery, ctrl.getAllTrains)
  /** POST /api/trains — publish new rescue request */
  .post(validateCreateTrain, ctrl.createTrain);

// ─── SINGLE RESOURCE ROUTES ───────────────────────────────────────────────────

router
  .route('/:id')
  /** GET    /api/trains/:id — fetch one request (includes history) */
  .get(validateId, ctrl.getTrainById)
  /** PATCH  /api/trains/:id — edit mutable fields */
  .patch(validateUpdateTrain, ctrl.updateTrain)
  /** DELETE /api/trains/:id — soft-delete */
  .delete(validateId, ctrl.deleteTrain);

/** GET   /api/trains/:id/history — full audit trail */
router.get('/:id/history', validateId, ctrl.getTrainHistory);

/** PATCH /api/trains/:id/status  — complete or cancel */
router.patch('/:id/status', validateUpdateStatus, ctrl.updateTrainStatus);

module.exports = router;
