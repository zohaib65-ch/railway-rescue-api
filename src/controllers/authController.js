'use strict';

const authService = require('../services/authService');
const { sendSuccess } = require('../utils/response');

/**
 * POST /api/auth/register
 * Public endpoint to register a new customer account.
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return sendSuccess(res, 201, 'Registration successful', result);
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/login
 * Public endpoint to authenticate and obtain tokens.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, 200, 'Login successful', result);
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/logout
 * Requires Auth. Revokes the user's current refresh token.
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id);
    return sendSuccess(res, 200, 'Logout successful');
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/refresh
 * Public endpoint. Exchanges a valid refresh token for a new access+refresh pair.
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    return sendSuccess(res, 200, 'Token refreshed successfully', result);
  } catch (err) { next(err); }
}

/**
 * GET /api/auth/me
 * Requires Auth. Retrieves the current user's profile.
 */
async function getMe(req, res, next) {
  try {
    const profile = await authService.getMe(req.user.id);
    return sendSuccess(res, 200, 'Profile retrieved', profile);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/auth/me
 * Requires Auth. Updates the current user's profile (name).
 */
async function updateMe(req, res, next) {
  try {
    const { name } = req.body;
    const profile = await authService.updateMe(req.user.id, { name });
    return sendSuccess(res, 200, 'Profile updated', profile);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/auth/password
 * Requires Auth. Changes the user's password.
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { currentPassword, newPassword });
    return sendSuccess(res, 200, 'Password changed successfully');
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/forgot-password
 * Public endpoint. Initiates password reset.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    await authService.forgotPassword({ email });
    // Always return success even if user not found to prevent email enumeration
    return sendSuccess(res, 200, 'If an account with that email exists, a password reset link has been sent.');
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/reset-password
 * Public endpoint. Completes password reset.
 */
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword({ token, newPassword });
    return sendSuccess(res, 200, 'Password has been reset successfully. You can now log in.');
  } catch (err) { next(err); }
}

module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
