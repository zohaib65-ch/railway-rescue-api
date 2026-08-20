'use strict';

const assignmentService = require('../services/assignmentService');
const { sendSuccess } = require('../utils/response');

async function createAssignment(req, res, next) {
  try {
    const assignment = await assignmentService.createAssignment(req.body);
    return sendSuccess(res, 201, 'Assignment created successfully', assignment);
  } catch (err) { next(err); }
}

async function getAllAssignments(req, res, next) {
  try {
    const result = await assignmentService.getAllAssignments(req.query);
    return sendSuccess(res, 200, 'Assignments retrieved successfully', result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getAssignmentById(req, res, next) {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    return sendSuccess(res, 200, 'Assignment retrieved successfully', assignment);
  } catch (err) { next(err); }
}

async function updateAssignmentStatus(req, res, next) {
  try {
    const { status, notes } = req.body;
    const assignment = await assignmentService.updateAssignmentStatus(req.params.id, status, notes);
    return sendSuccess(res, 200, 'Assignment status updated successfully', assignment);
  } catch (err) { next(err); }
}

async function deleteAssignment(req, res, next) {
  try {
    await assignmentService.deleteAssignment(req.params.id);
    return sendSuccess(res, 200, 'Assignment deleted successfully');
  } catch (err) { next(err); }
}

module.exports = {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignmentStatus,
  deleteAssignment,
};
