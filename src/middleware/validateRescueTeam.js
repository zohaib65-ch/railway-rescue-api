'use strict';

const { body, param, query, validationResult } = require('express-validator');

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

const validateCreateTeam = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('location')
    .notEmpty().withMessage('Location is required')
    .isString().trim()
    .isLength({ min: 2, max: 300 }).withMessage('Location must be between 2 and 300 characters'),
  body('isAvailable')
    .optional()
    .isBoolean().withMessage('isAvailable must be a boolean'),
  body('capacity')
    .optional()
    .isInt({ min: 1 }).withMessage('capacity must be a positive integer').toInt(),
  body('specialties')
    .optional()
    .isString().trim()
    .isLength({ max: 500 }).withMessage('specialties cannot exceed 500 characters'),
  handleValidationErrors,
];

const validateUpdateTeam = [
  cuidParam(),
  body('name')
    .optional()
    .isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('location')
    .optional()
    .isString().trim()
    .isLength({ min: 2, max: 300 }).withMessage('Location must be between 2 and 300 characters'),
  body('capacity')
    .optional()
    .isInt({ min: 1 }).withMessage('capacity must be a positive integer').toInt(),
  body('specialties')
    .optional()
    .isString().trim()
    .isLength({ max: 500 }).withMessage('specialties cannot exceed 500 characters'),
  handleValidationErrors,
];

const validateAvailability = [
  cuidParam(),
  body('isAvailable')
    .notEmpty().withMessage('isAvailable is required')
    .isBoolean().withMessage('isAvailable must be a boolean'),
  handleValidationErrors,
];

const validateListQuery = [
  query('isAvailable')
    .optional()
    .isIn(['true', 'false']).withMessage('isAvailable must be true or false'),
  query('search')
    .optional()
    .isString().trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),
  query('page')
    .optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  handleValidationErrors,
];

const validateId = [cuidParam(), handleValidationErrors];

module.exports = {
  validateCreateTeam,
  validateUpdateTeam,
  validateAvailability,
  validateListQuery,
  validateId,
};
