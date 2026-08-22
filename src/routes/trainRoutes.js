'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/trainController');
const { protect } = require('../middleware/authMiddleware');
const updateRoutes = require('./updateRoutes');

// ─── COLLECTION ROUTES ────────────────────────────────────────────────────────

router
  .route('/')
  .get(ctrl.getAllTrains)
  .post(protect, ctrl.createTrain);

// ─── SINGLE RESOURCE ROUTES ───────────────────────────────────────────────────

router
  .route('/:id')
  .get(ctrl.getTrainById);

// ─── LOCKING ──────────────────────────────────────────────────────────────────

router.patch('/:id/reserve', protect, ctrl.reserveTrain);
router.patch('/:id/release', protect, ctrl.releaseReservation);

router.use('/:id/updates', updateRoutes);

module.exports = router;
