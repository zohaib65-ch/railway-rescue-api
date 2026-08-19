'use strict';

/**
 * Sends a standardised success response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode   HTTP status code (default 200)
 * @param {string} message      Human-readable message
 * @param {*}      data         Response payload
 * @param {object} [pagination] Optional pagination metadata
 */
function sendSuccess(res, statusCode = 200, message = 'Success', data = null, pagination = null) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (pagination !== null) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

/**
 * Sends a standardised error response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode  HTTP status code (default 500)
 * @param {string} message     Human-readable error message
 * @param {string} [code]      Optional machine-readable error code
 * @param {*}      [details]   Optional extra details (e.g. validation errors)
 */
function sendError(res, statusCode = 500, message = 'Internal Server Error', code = null, details = null) {
  const body = { success: false, message };
  if (code)    body.code    = code;
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
