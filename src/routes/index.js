'use strict';

const express = require('express');
const router = express.Router();
const trainRoutes = require('./trainRoutes');

const authRoutes = require('./authRoutes');

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Railway Rescue API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API V1 ───────────────────────────────────────────────────────────────────

const userRoutes = require('./userRoutes');
const rescueTeamRoutes = require('./rescueTeamRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');

router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/rescue-teams', rescueTeamRoutes);
router.use('/api/assignments', assignmentRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/reports', reportRoutes);
router.use('/api/trains', trainRoutes);

// ─── 404 FALLBACK ─────────────────────────────────────────────────────────────

router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

module.exports = router;
