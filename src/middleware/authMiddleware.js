'use strict';

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { sendError } = require('../utils/response');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

/**
 * Middleware to protect routes.
 * Requires a valid JWT in the Authorization header (Bearer <token>).
 * Validates the token and attaches the user object to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Authentication required. Please provide a Bearer token.', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Access token has expired. Please refresh.', 'TOKEN_EXPIRED');
      }
      return sendError(res, 401, 'Invalid access token.', 'INVALID_TOKEN');
    }

    // Optionally fetch full user from DB if you need more than what's in the JWT payload.
    // For performance, we could just use payload.sub and payload.role, but fetching ensures
    // the user wasn't deleted or deactivated since the token was issued.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user) {
      return sendError(res, 401, 'User no longer exists.', 'USER_NOT_FOUND');
    }
    if (!user.isActive) {
      return sendError(res, 403, 'User account is deactivated.', 'ACCOUNT_DEACTIVATED');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware factory to enforce Role-Based Access Control (RBAC).
 * Must be used AFTER requireAuth.
 * @param {...string} allowedRoles - The roles permitted to access the route.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 500, 'requireRole called without requireAuth', 'INTERNAL_ERROR');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`,
        'FORBIDDEN'
      );
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
