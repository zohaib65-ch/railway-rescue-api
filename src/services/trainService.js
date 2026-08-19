'use strict';

const { prisma } = require('../config/database');

// ─── CUSTOM ERROR CLASSES ─────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class DuplicateActiveTrainError extends AppError {
  constructor(trainNumber) {
    super(
      `Train number ${trainNumber} is already registered in the platform. ` +
        `A second active request with the same train number cannot be created.`,
      409
    );
    this.trainNumber = trainNumber;
    this.code = 'DUPLICATE_ACTIVE_TRAIN';
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Base where-clause that excludes soft-deleted records. */
const notDeleted = { deletedAt: null };

/** Wraps a Prisma call and re-maps P2002 to DuplicateActiveTrainError. */
async function guardDuplicate(trainNumber, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === 'P2002') throw new DuplicateActiveTrainError(trainNumber);
    throw err;
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Publishes a new active train rescue request.
 *
 * Two-layer duplicate protection:
 *  1. Application-layer — query for existing active record before insert.
 *  2. DB-layer          — partial unique index catches concurrent race-conditions (P2002).
 */
async function createTrain(data) {
  const { trainNumber, movementType = 'standard', description, contactInfo, location } = data;

  // ── 1. App-layer duplicate check ─────────────────────────────────────────
  const existing = await prisma.train.findFirst({
    where: { trainNumber, status: 'active', ...notDeleted },
  });
  if (existing) throw new DuplicateActiveTrainError(trainNumber);

  // ── 2. Create record (DB index is the race-condition safety net) ──────────
  return guardDuplicate(trainNumber, () =>
    prisma.train.create({
      data: {
        trainNumber,
        movementType,
        description,
        contactInfo,
        location,
        history: {
          create: { fromStatus: null, toStatus: 'active', notes: 'Request published' },
        },
      },
      include: { history: { orderBy: { changedAt: 'desc' } } },
    })
  );
}

// ─── READ — LIST ──────────────────────────────────────────────────────────────

/**
 * Returns a paginated, filterable list of train requests.
 *
 * Supported query params:
 *  status, movementType, trainNumber, location (partial match),
 *  search (searches description + location + contactInfo),
 *  dateFrom, dateTo, page, limit
 */
async function getAllTrains(filters = {}) {
  const {
    status,
    movementType,
    trainNumber,
    location,
    search,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = filters;

  const where = { ...notDeleted };

  if (status)       where.status = status;
  if (movementType) where.movementType = movementType;
  if (trainNumber)  where.trainNumber = Number(trainNumber);

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { location:    { contains: search, mode: 'insensitive' } },
      { contactInfo: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(dateTo);
  }

  const pageNum  = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * pageSize;

  const [trains, total] = await Promise.all([
    prisma.train.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.train.count({ where }),
  ]);

  return {
    data: trains,
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
 * Returns all active (non-deleted) train requests, newest first.
 */
async function getActiveTrains() {
  const trains = await prisma.train.findMany({
    where: { status: 'active', ...notDeleted },
    orderBy: { createdAt: 'desc' },
  });
  return trains;
}

/**
 * Returns a single train request by its ID.
 * Throws 404 if not found or soft-deleted.
 */
async function getTrainById(id) {
  const train = await prisma.train.findFirst({
    where: { id, ...notDeleted },
    include: { history: { orderBy: { changedAt: 'desc' } } },
  });
  if (!train) throw new AppError('Train request not found', 404);
  return train;
}

/**
 * Returns the full status-change audit history for a train request.
 */
async function getTrainHistory(id) {
  // Ensure the train exists first
  const train = await prisma.train.findFirst({
    where: { id, ...notDeleted },
    select: { id: true, trainNumber: true },
  });
  if (!train) throw new AppError('Train request not found', 404);

  const history = await prisma.trainHistory.findMany({
    where: { trainId: id },
    orderBy: { changedAt: 'desc' },
  });
  return { train, history };
}

/**
 * Returns aggregated statistics across all train requests.
 */
async function getTrainStats() {
  const [total, active, completed, cancelled, byMovementType] = await Promise.all([
    prisma.train.count({ where: { ...notDeleted } }),
    prisma.train.count({ where: { status: 'active',    ...notDeleted } }),
    prisma.train.count({ where: { status: 'completed', ...notDeleted } }),
    prisma.train.count({ where: { status: 'cancelled', ...notDeleted } }),
    prisma.train.groupBy({
      by: ['movementType'],
      where: { ...notDeleted },
      _count: { movementType: true },
    }),
  ]);

  return {
    total,
    byStatus: { active, completed, cancelled },
    byMovementType: byMovementType.reduce((acc, row) => {
      acc[row.movementType] = row._count.movementType;
      return acc;
    }, {}),
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Edits the details of an active train request.
 * Only description, contactInfo, location, and movementType can be edited.
 * trainNumber cannot be changed after publishing.
 */
async function updateTrainDetails(id, data) {
  const train = await prisma.train.findFirst({ where: { id, ...notDeleted } });
  if (!train) throw new AppError('Train request not found', 404);

  if (train.status !== 'active') {
    throw new AppError(
      `Cannot edit a request that is already "${train.status}". Only active requests can be modified.`,
      400
    );
  }

  const { movementType, description, contactInfo, location } = data;

  return prisma.train.update({
    where: { id },
    data: { movementType, description, contactInfo, location },
    include: { history: { orderBy: { changedAt: 'desc' } } },
  });
}

/**
 * Updates the status of a train request (complete or cancel it).
 * Records an audit entry in TrainHistory.
 * Frees the trainNumber for future active requests once resolved.
 */
async function updateTrainStatus(id, newStatus, notes) {
  const train = await prisma.train.findFirst({ where: { id, ...notDeleted } });
  if (!train) throw new AppError('Train request not found', 404);

  if (train.status !== 'active') {
    throw new AppError(
      `Cannot change status of a request that is already "${train.status}".`,
      400
    );
  }

  // Use a transaction to atomically update the train and insert the history entry
  const [updated] = await prisma.$transaction([
    prisma.train.update({
      where: { id },
      data: {
        status:     newStatus,
        resolvedAt: new Date(),
      },
      include: { history: { orderBy: { changedAt: 'desc' } } },
    }),
    prisma.trainHistory.create({
      data: {
        trainId:    id,
        fromStatus: train.status,
        toStatus:   newStatus,
        notes:      notes || null,
      },
    }),
  ]);

  return updated;
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Soft-deletes a train request (sets deletedAt timestamp).
 * The record is retained in the DB for audit purposes but hidden from queries.
 */
async function deleteTrain(id) {
  const train = await prisma.train.findFirst({ where: { id, ...notDeleted } });
  if (!train) throw new AppError('Train request not found', 404);

  return prisma.train.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  createTrain,
  getAllTrains,
  getActiveTrains,
  getTrainById,
  getTrainHistory,
  getTrainStats,
  updateTrainDetails,
  updateTrainStatus,
  deleteTrain,
  AppError,
  DuplicateActiveTrainError,
};
