'use strict';

const { sendError } = require('../utils/response');

/**
 * Global Express error handler.
 * Maps Prisma errors, operational AppErrors, and unknown errors
 * to consistent JSON responses.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Always log server-side
  console.error(`[${new Date().toISOString()}] ERROR:`, {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  // ── Prisma: Unique constraint violation (race-condition safety net) ────────
  // P2002 — Unique constraint failed
  if (err.code === 'P2002') {
    return sendError(
      res, 409,
      'A duplicate value was detected. An active request with this train number already exists.',
      'DUPLICATE_KEY'
    );
  }

  // ── Prisma: Record not found ──────────────────────────────────────────────
  // P2025 — Record to update/delete does not exist
  if (err.code === 'P2025') {
    return sendError(res, 404, 'Record not found', 'NOT_FOUND');
  }

  // ── Prisma: Foreign key constraint failed ─────────────────────────────────
  // P2003
  if (err.code === 'P2003') {
    return sendError(res, 400, 'Related record not found', 'FOREIGN_KEY_ERROR');
  }

  // ── Prisma: Value out of range / type mismatch ────────────────────────────
  // P2006, P2007
  if (['P2006', 'P2007'].includes(err.code)) {
    return sendError(res, 422, 'Invalid data type or value', 'VALIDATION_ERROR');
  }

  // ── Operational / known application errors (AppError subclasses) ──────────
  if (err.isOperational) {
    return sendError(res, err.statusCode, err.message, err.code || null);
  }

  // ── Unknown / unexpected errors ───────────────────────────────────────────
  return sendError(
    res,
    500,
    process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    'INTERNAL_ERROR'
  );
}

module.exports = errorHandler;
