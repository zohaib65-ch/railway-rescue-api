'use strict';

const trainService = require('../services/trainService');
const { sendSuccess } = require('../utils/response');

// ─── CREATE ───────────────────────────────────────────────────────────────────

async function createTrain(req, res, next) {
  try {
    const data = { ...req.body, publishedById: req.user.id };
    const train = await trainService.createTrain(data);
    return sendSuccess(res, 201, 'Train request published successfully', train);
  } catch (err) { next(err); }
}

// ─── READ ─────────────────────────────────────────────────────────────────────

async function getAllTrains(req, res, next) {
  try {
    const result = await trainService.getAllTrains(req.query);
    return sendSuccess(res, 200, 'Train requests retrieved successfully', result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getTrainById(req, res, next) {
  try {
    const train = await trainService.getTrainById(req.params.id);
    return sendSuccess(res, 200, 'Train request retrieved successfully', train);
  } catch (err) { next(err); }
}

// ─── LOCKING ──────────────────────────────────────────────────────────────────

async function reserveTrain(req, res, next) {
  try {
    const train = await trainService.reserveTrain(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Train reserved for bidding for 10 minutes', train);
  } catch (err) { next(err); }
}

async function releaseReservation(req, res, next) {
  try {
    const train = await trainService.releaseReservation(req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Train reservation released successfully', train);
  } catch (err) { next(err); }
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  createTrain,
  getAllTrains,
  getTrainById,
  reserveTrain,
  releaseReservation,
};
