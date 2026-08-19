'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateUpdateMe,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} = require('../middleware/validateAuth');

// Optional: Add rate limiting to auth routes to prevent brute-force attacks
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 auth requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});

router.use(authLimiter);

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

router.post('/register', validateRegister, ctrl.register);
router.post('/login', validateLogin, ctrl.login);
router.post('/refresh', validateRefresh, ctrl.refresh);
router.post('/forgot-password', validateForgotPassword, ctrl.forgotPassword);
router.post('/reset-password', validateResetPassword, ctrl.resetPassword);

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────

router.use(requireAuth);

router.post('/logout', ctrl.logout);
router.get('/me', ctrl.getMe);
router.patch('/me', validateUpdateMe, ctrl.updateMe);
router.patch('/password', validateChangePassword, ctrl.changePassword);

module.exports = router;
