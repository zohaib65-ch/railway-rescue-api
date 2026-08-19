'use strict';

const { body, param, query, validationResult } = require('express-validator');

// Assuming Role is an enum from Prisma: 'customer', 'coordinator', 'admin'
const ROLES = ['customer', 'coordinator', 'admin'];

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

const validateListQuery = [
  query('role')
    .optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),

  query('isActive')
    .optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),

  query('search')
    .optional().isString().trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),

  query('page')
    .optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),

  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),

  handleValidationErrors,
];

const validateUpdateUser = [
  cuidParam(),

  body('name')
    .optional().isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('role')
    .optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),

  handleValidationErrors,
];

const validateId = [cuidParam(), handleValidationErrors];

module.exports = {
  validateListQuery,
  validateUpdateUser,
  validateId,
};
