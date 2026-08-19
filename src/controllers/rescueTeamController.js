'use strict';

const rescueTeamService = require('../services/rescueTeamService');
const { sendSuccess } = require('../utils/response');

async function createRescueTeam(req, res, next) {
  try {
    const team = await rescueTeamService.createRescueTeam(req.body);
    return sendSuccess(res, 201, 'Rescue team created successfully', team);
  } catch (err) { next(err); }
}

async function getAllRescueTeams(req, res, next) {
  try {
    const result = await rescueTeamService.getAllRescueTeams(req.query);
    return sendSuccess(res, 200, 'Rescue teams retrieved successfully', result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getRescueTeamById(req, res, next) {
  try {
    const team = await rescueTeamService.getRescueTeamById(req.params.id);
    return sendSuccess(res, 200, 'Rescue team retrieved successfully', team);
  } catch (err) { next(err); }
}

async function updateRescueTeam(req, res, next) {
  try {
    const team = await rescueTeamService.updateRescueTeam(req.params.id, req.body);
    return sendSuccess(res, 200, 'Rescue team updated successfully', team);
  } catch (err) { next(err); }
}

async function setAvailability(req, res, next) {
  try {
    const { isAvailable } = req.body;
    const team = await rescueTeamService.setAvailability(req.params.id, isAvailable);
    return sendSuccess(res, 200, 'Rescue team availability updated', team);
  } catch (err) { next(err); }
}

async function deleteRescueTeam(req, res, next) {
  try {
    await rescueTeamService.deleteRescueTeam(req.params.id);
    return sendSuccess(res, 200, 'Rescue team deleted successfully');
  } catch (err) { next(err); }
}

module.exports = {
  createRescueTeam,
  getAllRescueTeams,
  getRescueTeamById,
  updateRescueTeam,
  setAvailability,
  deleteRescueTeam,
};
