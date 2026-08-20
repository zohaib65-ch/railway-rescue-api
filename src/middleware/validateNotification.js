'use strict';

const { param, query, validationResult } = require('express-validator');

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
  query('isRead')
    .optional()
    .isIn(['true', 'false']).withMessage('isRead must be true or false'),
  query('limit')
    .optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  handleValidationErrors,
];

const validateId = [cuidParam(), handleValidationErrors];

module.exports = {
  validateListQuery,
  validateId,
};
