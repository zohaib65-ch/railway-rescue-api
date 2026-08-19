'use strict';

const userService = require('../services/userService');
const { sendSuccess } = require('../utils/response');

/**
 * GET /api/users
 * Lists all users with pagination and optional filters.
 */
async function getAllUsers(req, res, next) {
  try {
    const result = await userService.getAllUsers(req.query);
    return sendSuccess(res, 200, 'Users retrieved successfully', result.data, result.pagination);
  } catch (err) { next(err); }
}

/**
 * GET /api/users/:id
 * Returns a single user by ID.
 */
async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, 200, 'User retrieved successfully', user);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/users/:id
 * Updates a user's role or basic info.
 */
async function updateUser(req, res, next) {
  try {
    const { name, role } = req.body;
    const user = await userService.updateUser(req.params.id, { name, role });
    return sendSuccess(res, 200, 'User updated successfully', user);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/users/:id/deactivate
 * Deactivates a user account (prevents login).
 */
async function deactivateUser(req, res, next) {
  try {
    const user = await userService.deactivateUser(req.params.id);
    return sendSuccess(res, 200, 'User deactivated successfully', user);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/users/:id/activate
 * Reactivates a user account.
 */
async function activateUser(req, res, next) {
  try {
    const user = await userService.activateUser(req.params.id);
    return sendSuccess(res, 200, 'User activated successfully', user);
  } catch (err) { next(err); }
}

/**
 * DELETE /api/users/:id
 * Permanently deletes a user account.
 */
async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    return sendSuccess(res, 200, 'User deleted successfully');
  } catch (err) { next(err); }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
};
