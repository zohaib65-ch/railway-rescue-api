'use strict';

const { prisma } = require('../config/database');
const { AppError } = require('./authService');

// ─── CREATE ───────────────────────────────────────────────────────────────────

async function createRescueTeam(data) {
  const { name, location, isAvailable, capacity, specialties } = data;

  const existing = await prisma.rescueTeam.findUnique({
    where: { name },
  });

  if (existing) {
    throw new AppError('A rescue team with this name already exists', 409, 'DUPLICATE_NAME');
  }

  return prisma.rescueTeam.create({
    data: { name, location, isAvailable, capacity, specialties },
  });
}

// ─── READ ─────────────────────────────────────────────────────────────────────

async function getAllRescueTeams(filters = {}) {
  const { isAvailable, search, page = 1, limit = 20 } = filters;

  const where = {};

  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable === 'true';
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { specialties: { contains: search, mode: 'insensitive' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * pageSize;

  const [teams, total] = await Promise.all([
    prisma.rescueTeam.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.rescueTeam.count({ where }),
  ]);

  return {
    data: teams,
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

async function getRescueTeamById(id) {
  const team = await prisma.rescueTeam.findUnique({ where: { id } });
  if (!team) {
    throw new AppError('Rescue team not found', 404, 'NOT_FOUND');
  }
  return team;
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

async function updateRescueTeam(id, data) {
  const { name, location, capacity, specialties } = data;
  
  const team = await prisma.rescueTeam.findUnique({ where: { id } });
  if (!team) {
    throw new AppError('Rescue team not found', 404, 'NOT_FOUND');
  }

  if (name && name !== team.name) {
    const existing = await prisma.rescueTeam.findUnique({ where: { name } });
    if (existing) {
      throw new AppError('A rescue team with this name already exists', 409, 'DUPLICATE_NAME');
    }
  }

  return prisma.rescueTeam.update({
    where: { id },
    data: { name, location, capacity, specialties },
  });
}

async function setAvailability(id, isAvailable) {
  const team = await prisma.rescueTeam.findUnique({ where: { id } });
  if (!team) {
    throw new AppError('Rescue team not found', 404, 'NOT_FOUND');
  }

  return prisma.rescueTeam.update({
    where: { id },
    data: { isAvailable },
  });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function deleteRescueTeam(id) {
  const team = await prisma.rescueTeam.findUnique({ where: { id } });
  if (!team) {
    throw new AppError('Rescue team not found', 404, 'NOT_FOUND');
  }

  // TODO: Before deleting, we might want to check if the team is assigned to any active rescues.
  // We'll handle this properly when the Assignment module is built.

  await prisma.rescueTeam.delete({ where: { id } });
}

module.exports = {
  createRescueTeam,
  getAllRescueTeams,
  getRescueTeamById,
  updateRescueTeam,
  setAvailability,
  deleteRescueTeam,
};
