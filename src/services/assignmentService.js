'use strict';

const { prisma } = require('../config/database');
const { AppError } = require('./authService');
const { emitNotification } = require('./notificationService');

// ─── CREATE ───────────────────────────────────────────────────────────────────

async function createAssignment({ trainId, rescueTeamId, notes }) {
  // Check if train exists and is active
  const train = await prisma.train.findUnique({ where: { id: trainId } });
  if (!train) {
    throw new AppError('Train request not found', 404, 'NOT_FOUND');
  }
  if (train.status !== 'active') {
    throw new AppError(`Cannot assign a team to a train with status: ${train.status}`, 400, 'INVALID_STATUS');
  }

  // Check if team exists and is available
  const team = await prisma.rescueTeam.findUnique({ where: { id: rescueTeamId } });
  if (!team) {
    throw new AppError('Rescue team not found', 404, 'NOT_FOUND');
  }
  if (!team.isAvailable) {
    throw new AppError('Rescue team is currently not available', 400, 'TEAM_UNAVAILABLE');
  }

  // Check if team is already on an active assignment
  const activeAssignment = await prisma.assignment.findFirst({
    where: {
      rescueTeamId,
      status: { in: ['assigned', 'en_route', 'on_site'] },
    },
  });

  if (activeAssignment) {
    throw new AppError('Rescue team is already on an active assignment', 409, 'TEAM_BUSY');
  }

  // Use a transaction to create assignment and mark team as unavailable
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.create({
      data: {
        trainId,
        rescueTeamId,
        notes,
      },
      include: {
        train: true,
        rescueTeam: true,
      },
    });

    await tx.rescueTeam.update({
      where: { id: rescueTeamId },
      data: { isAvailable: false },
    });

    // Notify the user who published the train request, if any
    if (assignment.train.publishedById) {
      await emitNotification(
        assignment.train.publishedById,
        'Rescue Team Assigned',
        `Team ${assignment.rescueTeam.name} has been assigned to your train request (#${assignment.train.trainNumber}).`,
        `/trains/${trainId}`
      );
    }

    return assignment;
  });
}

// ─── READ ─────────────────────────────────────────────────────────────────────

async function getAllAssignments(filters = {}) {
  const { status, teamId, trainId, page = 1, limit = 20 } = filters;

  const where = {};

  if (status) {
    where.status = status;
  }
  if (teamId) {
    where.rescueTeamId = teamId;
  }
  if (trainId) {
    where.trainId = trainId;
  }

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * pageSize;

  const [assignments, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        train: { select: { trainNumber: true, location: true, status: true } },
        rescueTeam: { select: { name: true, location: true } },
      },
    }),
    prisma.assignment.count({ where }),
  ]);

  return {
    data: assignments,
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

async function getAssignmentById(id) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      train: true,
      rescueTeam: true,
    },
  });
  
  if (!assignment) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND');
  }
  
  return assignment;
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

async function updateAssignmentStatus(id, newStatus, notes) {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND');
  }

  // Prevent changing status of an already finished assignment
  if (assignment.status === 'resolved' || assignment.status === 'cancelled') {
    throw new AppError('Cannot change status of a resolved or cancelled assignment', 400, 'INVALID_STATUS');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({
      where: { id },
      data: { 
        status: newStatus,
        ...(notes && { notes }) // only update notes if provided
      },
      include: {
        train: true,
        rescueTeam: true,
      },
    });

    // If the assignment is now finished, release the team
    if (newStatus === 'resolved' || newStatus === 'cancelled') {
      await tx.rescueTeam.update({
        where: { id: assignment.rescueTeamId },
        data: { isAvailable: true },
      });
    }

    // Notify the user who published the train request, if any
    if (updated.train.publishedById) {
      await emitNotification(
        updated.train.publishedById,
        `Assignment Status Updated`,
        `The rescue assignment for your train (#${updated.train.trainNumber}) is now ${newStatus}.`,
        `/trains/${updated.train.id}`
      );
    }

    return updated;
  });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Hard deletes an assignment. Typically only used if assigned by mistake.
 * Standard workflow should use 'cancelled' status instead of delete.
 */
async function deleteAssignment(id) {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) {
    throw new AppError('Assignment not found', 404, 'NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    // If we delete an active assignment, make the team available again
    if (['assigned', 'en_route', 'on_site'].includes(assignment.status)) {
      await tx.rescueTeam.update({
        where: { id: assignment.rescueTeamId },
        data: { isAvailable: true },
      });
    }

    await tx.assignment.delete({ where: { id } });
  });
}

module.exports = {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignmentStatus,
  deleteAssignment,
};
