'use strict';

const trainService = require('../services/trainService');
const { sendSuccess } = require('../utils/response');

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * POST /api/trains
 * Publishes a new train rescue request.
 * Server-side duplicate active-train-number check is enforced in the service.
 */
async function createTrain(req, res, next) {
  try {
    const { trainNumber, movementType, description, contactInfo, location } = req.body;
    const train = await trainService.createTrain({ trainNumber, movementType, description, contactInfo, location });
    return sendSuccess(res, 201, 'Train rescue request published successfully', train);
  } catch (err) { next(err); }
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/trains
 * Lists all train requests with pagination and optional filters.
 * Query params: status, movementType, trainNumber, location, search, dateFrom, dateTo, page, limit
 */
async function getAllTrains(req, res, next) {
  try {
    const result = await trainService.getAllTrains(req.query);
    return sendSuccess(res, 200, 'Train requests retrieved successfully', result.data, result.pagination);
  } catch (err) { next(err); }
}

/**
 * GET /api/trains/active
 * Returns only active train requests.
 */
async function getActiveTrains(req, res, next) {
  try {
    const trains = await trainService.getActiveTrains();
    return sendSuccess(res, 200, 'Active train requests retrieved successfully', trains);
  } catch (err) { next(err); }
}

/**
 * GET /api/trains/stats
 * Returns aggregated statistics (counts by status, movement type).
 */
async function getTrainStats(req, res, next) {
  try {
    const stats = await trainService.getTrainStats();
    return sendSuccess(res, 200, 'Train statistics retrieved successfully', stats);
  } catch (err) { next(err); }
}

/**
 * GET /api/trains/search
 * Full-text search across description, location, and contactInfo.
 * Query params: q (required), page, limit
 */
async function searchTrains(req, res, next) {
  try {
    const { q, page, limit } = req.query;
    const result = await trainService.getAllTrains({ search: q, page, limit });
    return sendSuccess(res, 200, 'Search results retrieved successfully', result.data, result.pagination);
  } catch (err) { next(err); }
}

/**
 * GET /api/trains/:id
 * Returns a single train request by ID (includes history).
 */
async function getTrainById(req, res, next) {
  try {
    const train = await trainService.getTrainById(req.params.id);
    return sendSuccess(res, 200, 'Train request retrieved successfully', train);
  } catch (err) { next(err); }
}

/**
 * GET /api/trains/:id/history
 * Returns the full status-change audit trail for a train request.
 */
async function getTrainHistory(req, res, next) {
  try {
    const result = await trainService.getTrainHistory(req.params.id);
    return sendSuccess(res, 200, 'Train history retrieved successfully', result);
  } catch (err) { next(err); }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * PATCH /api/trains/:id
 * Edits mutable fields (movementType, description, contactInfo, location).
 * trainNumber cannot be changed after publishing.
 */
async function updateTrain(req, res, next) {
  try {
    const { movementType, description, contactInfo, location } = req.body;
    const train = await trainService.updateTrainDetails(req.params.id, { movementType, description, contactInfo, location });
    return sendSuccess(res, 200, 'Train request updated successfully', train);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/trains/:id/status
 * Marks a train request as "completed" or "cancelled".
 * Frees the train number for future active requests.
 */
async function updateTrainStatus(req, res, next) {
  try {
    const { status, notes } = req.body;
    const train = await trainService.updateTrainStatus(req.params.id, status, notes);
    return sendSuccess(res, 200, `Train request marked as "${train.status}" successfully`, train);
  } catch (err) { next(err); }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/trains/:id
 * Soft-deletes a train request (sets deletedAt — record is retained for audit).
 */
async function deleteTrain(req, res, next) {
  try {
    await trainService.deleteTrain(req.params.id);
    return sendSuccess(res, 200, 'Train request deleted successfully');
  } catch (err) { next(err); }
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  createTrain,
  getAllTrains,
  getActiveTrains,
  getTrainStats,
  searchTrains,
  getTrainById,
  getTrainHistory,
  updateTrain,
  updateTrainStatus,
  deleteTrain,
};
