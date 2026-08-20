'use strict';

const { query, validationResult } = require('express-validator');

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

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('startDate must be a valid ISO8601 date'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('endDate must be a valid ISO8601 date'),
  handleValidationErrors,
];

module.exports = {
  validateDateRange,
};
