'use strict';

const { prisma } = require('../config/database');
const { AppError, safeUser } = require('./authService');

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated, filterable list of all users.
 * Supports filters by role and active status, plus full-text search.
 */
async function getAllUsers(filters = {}) {
  const { role, isActive, search, page = 1, limit = 20 } = filters;

  const where = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    // isActive will come in as a string "true" or "false" from query params
    where.isActive = isActive === 'true';
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * pageSize;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map(safeUser),
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: pageNum < Math.ceil(total / pageSize),
      hasPrev: pageNum > 1,
    },
  };
}

/**
 * Returns a single user by ID.
 */
async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return safeUser(user);
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Updates a user's details or role.
 */
async function updateUser(id, { name, role }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { name, role },
  });

  return safeUser(updatedUser);
}

/**
 * Deactivates a user account, preventing them from logging in.
 * Also revokes their current refresh token to log them out immediately.
 */
async function deactivateUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (!user.isActive) {
    throw new AppError('User is already deactivated', 400, 'ALREADY_DEACTIVATED');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: false, refreshToken: null },
  });

  return safeUser(updatedUser);
}

/**
 * Reactivates a user account.
 */
async function activateUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.isActive) {
    throw new AppError('User is already active', 400, 'ALREADY_ACTIVE');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });

  return safeUser(updatedUser);
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Permanently deletes a user.
 * Note: Since Trains have 'publishedById' referencing User with 'onDelete: SetNull',
 * the user's published trains will be preserved but their authorship removed.
 */
async function deleteUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  await prisma.user.delete({ where: { id } });
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
};
