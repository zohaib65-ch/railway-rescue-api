'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { prisma } = require('../config/database');

// ─── ERROR CLASSES ────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode  = statusCode;
    this.code        = code || null;
    this.isOperational = true;
  }
}

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES_IN  || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generates a signed JWT access token containing the user's id, email, and role.
 * Short-lived (default 15 min) — used to authenticate API requests.
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP }
  );
}

/**
 * Generates a signed JWT refresh token.
 * Long-lived (default 7 days) — used only to obtain a new access token.
 * A hashed copy is stored in the DB so it can be individually revoked.
 */
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXP }
  );
}

/**
 * Issues both tokens and stores a hashed refresh token against the user row.
 */
async function issueTokens(user) {
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Store hashed refresh token — prevents plain-text exposure even if DB leaks
  const hashed = await bcrypt.hash(refreshToken, 8);
  await prisma.user.update({
    where: { id: user.id },
    data:  { refreshToken: hashed },
  });

  return { accessToken, refreshToken };
}

/** Safe user object — strips passwordHash, refreshToken, resetToken before sending. */
function safeUser(user) {
  const { passwordHash, refreshToken, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

// ─── AUTH SERVICE FUNCTIONS ───────────────────────────────────────────────────

/**
 * Registers a new customer account.
 * Public endpoint — role is always forced to "customer".
 * Coordinators and admins must be created via the User Management module.
 */
async function register({ name, email, password }) {
  // Check for existing email
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new AppError('An account with this email address already exists.', 409, 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'customer', // self-registration is always customer
    },
  });

  const tokens = await issueTokens(user);
  return { user: safeUser(user), ...tokens };
}

/**
 * Authenticates a user with email + password.
 * Returns access + refresh tokens on success.
 *
 * What the client must send:
 *  - email    : registered email address
 *  - password : plain-text password (hashed server-side for comparison)
 *
 * The role is determined entirely from the DB — clients never send a role.
 */
async function login({ email, password }) {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Use a constant-time comparison even on "not found" to prevent timing attacks
  const dummyHash = '$2a$12$dummyhashfortimingattackprevention00000000000000000000';
  const passwordMatch = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);

  if (!user || !passwordMatch) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError(
      'Your account has been deactivated. Please contact support.',
      403,
      'ACCOUNT_DEACTIVATED'
    );
  }

  const tokens = await issueTokens(user);
  return { user: safeUser(user), ...tokens };
}

/**
 * Revokes the user's refresh token (logout).
 * The access token will expire naturally — clients should discard it locally.
 */
async function logout(userId) {
  await prisma.user.update({
    where: { id: userId },
    data:  { refreshToken: null },
  });
}

/**
 * Validates a refresh token and issues a new access + refresh token pair.
 * Implements refresh token rotation — the old token is invalidated.
 */
async function refresh(rawRefreshToken) {
  // Verify JWT signature and expiry
  let payload;
  try {
    payload = jwt.verify(rawRefreshToken, REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user || !user.isActive || !user.refreshToken) {
    throw new AppError('Refresh token has been revoked or user not found.', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Validate the stored hashed token matches
  const tokenMatch = await bcrypt.compare(rawRefreshToken, user.refreshToken);
  if (!tokenMatch) {
    // Possible token reuse attack — revoke all tokens for this user
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
    throw new AppError('Refresh token reuse detected. Please log in again.', 401, 'TOKEN_REUSE');
  }

  // Rotate: issue new tokens
  const tokens = await issueTokens(user);
  return { user: safeUser(user), ...tokens };
}

/**
 * Returns the current authenticated user's profile.
 */
async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  return safeUser(user);
}

/**
 * Updates the current user's own profile (name only).
 * Password changes go through changePassword.
 */
async function updateMe(userId, { name }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data:  { name },
  });
  return safeUser(user);
}

/**
 * Changes the current user's password.
 * Requires the current password for verification before updating.
 * Invalidates all existing sessions (refresh tokens) after change.
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw new AppError('Current password is incorrect.', 400, 'WRONG_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash, refreshToken: null }, // invalidate all sessions
  });
}

/**
 * Initiates the password reset flow.
 * Generates a reset token, saves it with an expiry, and would normally send an email.
 */
const crypto = require('crypto');

async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  
  // We return a generic message even if the user isn't found to prevent email enumeration
  if (!user || !user.isActive) {
    return;
  }

  // Generate a random 64-character hex token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token before storing it in the DB (similar to password/refresh token)
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // Set expiry for 1 hour from now
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: resetTokenHash, resetTokenExpiry },
  });

  // TODO: Send email with the unhashed resetToken (e.g., https://frontend.com/reset-password?token=...)
  // For now, we will just log it in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset token for ${user.email}: ${resetToken}`);
  }
}

/**
 * Completes the password reset flow.
 * Verifies the token, ensures it hasn't expired, and updates the password.
 */
async function resetPassword({ token, newPassword }) {
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetToken: resetTokenHash,
      resetTokenExpiry: { gt: new Date() }, // ensure it hasn't expired
    },
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired.', 400, 'INVALID_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      refreshToken: null, // invalidate existing sessions
    },
  });
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

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
  AppError,
  safeUser,
};
