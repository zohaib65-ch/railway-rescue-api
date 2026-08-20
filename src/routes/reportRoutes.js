'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { validateDateRange } = require('../middleware/validateReport');

// Reports are typically for admins (and maybe coordinators)
router.use(requireAuth, requireRole('admin', 'coordinator'));

// Apply date range validation to all report routes
router.use(validateDateRange);

router.get('/summary', ctrl.getSummary);
router.get('/trains', ctrl.getTrainsOverTime);
router.get('/teams', ctrl.getTeamPerformance);
router.get('/resolution-time', ctrl.getResolutionTime);
router.get('/export', ctrl.exportReport);

module.exports = router;
