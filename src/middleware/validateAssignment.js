'use strict';

const { body, param, query, validationResult } = require('express-validator');

// Prisma enum values for assignment status
const ASSIGNMENT_STATUSES = ['assigned', 'en_route', 'on_site', 'resolved', 'cancelled'];

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

const cuidParam = () =>
  param('id')
    .notEmpty().withMessage('ID is required')
    .isLength({ min: 20, max: 30 }).withMessage('Invalid ID format');

const validateCreateAssignment = [
  body('trainId')
    .notEmpty().withMessage('trainId is required')
    .isLength({ min: 20, max: 30 }).withMessage('Invalid trainId format'),
  body('rescueTeamId')
    .notEmpty().withMessage('rescueTeamId is required')
    .isLength({ min: 20, max: 30 }).withMessage('Invalid rescueTeamId format'),
  body('notes')
    .optional()
    .isString().trim()
    .isLength({ max: 1000 }).withMessage('notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

const validateUpdateStatus = [
  cuidParam(),
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(ASSIGNMENT_STATUSES).withMessage(`status must be one of: ${ASSIGNMENT_STATUSES.join(', ')}`),
  body('notes')
    .optional()
    .isString().trim()
    .isLength({ max: 1000 }).withMessage('notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

const validateListQuery = [
  query('status')
    .optional()
    .isIn(ASSIGNMENT_STATUSES).withMessage(`status must be one of: ${ASSIGNMENT_STATUSES.join(', ')}`),
  query('teamId')
    .optional()
    .isLength({ min: 20, max: 30 }).withMessage('Invalid teamId format'),
  query('trainId')
    .optional()
    .isLength({ min: 20, max: 30 }).withMessage('Invalid trainId format'),
  query('page')
    .optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  handleValidationErrors,
];

const validateId = [cuidParam(), handleValidationErrors];

module.exports = {
  validateCreateAssignment,
  validateUpdateStatus,
  validateListQuery,
  validateId,
};
