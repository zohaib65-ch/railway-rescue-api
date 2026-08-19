'use strict';

const { body, param, query, validationResult } = require('express-validator');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MOVEMENT_TYPES = ['standard', 'LZ', 'other'];
const STATUSES       = ['active', 'completed', 'cancelled'];

// ─── SHARED HANDLER ───────────────────────────────────────────────────────────

/** Reads validation results and short-circuits with 422 if there are errors. */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// ─── REUSABLE CHAINS ──────────────────────────────────────────────────────────

const trainNumberChain = () =>
  body('trainNumber')
    .notEmpty().withMessage('Train number is required')
    .isInt({ min: 1, max: 999999 })
    .withMessage('Train number must be a positive integer with a maximum of 6 digits')
    .toInt();

const movementTypeChain = (optional = false) => {
  const chain = optional
    ? body('movementType').optional()
    : body('movementType').notEmpty().withMessage('Movement type is required');
  return chain
    .isIn(MOVEMENT_TYPES)
    .withMessage(`Movement type must be one of: ${MOVEMENT_TYPES.join(', ')}`);
};

const cuidParam = () =>
  param('id')
    .notEmpty().withMessage('ID is required')
    .isLength({ min: 20, max: 30 }).withMessage('Invalid ID format');

// ─── VALIDATORS ───────────────────────────────────────────────────────────────

/** POST /api/trains */
const validateCreateTrain = [
  trainNumberChain(),

  movementTypeChain(true), // optional on create, defaults to 'standard'

  body('description')
    .optional().isString().trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('contactInfo')
    .optional().isString().trim()
    .isLength({ max: 200 }).withMessage('Contact info cannot exceed 200 characters'),

  body('location')
    .optional().isString().trim()
    .isLength({ max: 300 }).withMessage('Location cannot exceed 300 characters'),

  handleValidationErrors,
];

/** PATCH /api/trains/:id — edit mutable fields only */
const validateUpdateTrain = [
  cuidParam(),

  movementTypeChain(true),

  body('description')
    .optional().isString().trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('contactInfo')
    .optional().isString().trim()
    .isLength({ max: 200 }).withMessage('Contact info cannot exceed 200 characters'),

  body('location')
    .optional().isString().trim()
    .isLength({ max: 300 }).withMessage('Location cannot exceed 300 characters'),

  handleValidationErrors,
];

/** PATCH /api/trains/:id/status */
const validateUpdateStatus = [
  cuidParam(),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['completed', 'cancelled'])
    .withMessage('Status must be either "completed" or "cancelled"'),

  body('notes')
    .optional().isString().trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors,
];

/** GET /api/trains — list with optional filters */
const validateListQuery = [
  query('status')
    .optional().isIn(STATUSES)
    .withMessage(`Status must be one of: ${STATUSES.join(', ')}`),

  query('movementType')
    .optional().isIn(MOVEMENT_TYPES)
    .withMessage(`Movement type must be one of: ${MOVEMENT_TYPES.join(', ')}`),

  query('trainNumber')
    .optional()
    .isInt({ min: 1, max: 999999 }).withMessage('trainNumber must be a valid 1–6 digit number')
    .toInt(),

  query('page')
    .optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),

  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),

  query('dateFrom')
    .optional().isISO8601().withMessage('dateFrom must be a valid ISO 8601 date'),

  query('dateTo')
    .optional().isISO8601().withMessage('dateTo must be a valid ISO 8601 date'),

  handleValidationErrors,
];

/** GET /api/trains/search */
const validateSearchQuery = [
  query('q')
    .notEmpty().withMessage('Search query "q" is required')
    .isString().trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),

  query('page')
    .optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),

  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),

  handleValidationErrors,
];

/** Any route with :id param */
const validateId = [cuidParam(), handleValidationErrors];

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  validateCreateTrain,
  validateUpdateTrain,
  validateUpdateStatus,
  validateListQuery,
  validateSearchQuery,
  validateId,
  MOVEMENT_TYPES,
  STATUSES,
};
