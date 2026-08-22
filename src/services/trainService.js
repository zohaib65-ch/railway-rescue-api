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

/** Base where-clause for active trains */
const activeStatuses = ['AVAILABLE', 'IN_RESERVATION', 'ASSIGNED'];

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

async function createTrain(data) {
  const { 
    trainNumber, movementType, operatingPoint, stationId, stationName, region,
    lat, lng, trainLength, totalWeight, numberOfWagons, customerReference,
    requestType, locomotiveRequirement, existingLocomotive, traction,
    destinationStation, destinationOperatingPoint, destLat, destLng,
    requiredDeparture, requiredArrival, parkedFrom, expectedParkedUntil,
    parkingTrack, afterArrivalAction, publishedById 
  } = data;

  // 1. App-layer duplicate check
  const existing = await prisma.train.findFirst({
    where: { trainNumber: Number(trainNumber), status: { in: activeStatuses } },
  });
  if (existing) throw new DuplicateActiveTrainError(trainNumber);

  // 2. Create record
  return guardDuplicate(trainNumber, () =>
    prisma.train.create({
      data: {
        trainNumber: Number(trainNumber),
        movementType,
        operatingPoint,
        stationId,
        stationName,
        region,
        lat,
        lng,
        trainLength,
        totalWeight,
        numberOfWagons,
        customerReference,
        requestType,
        locomotiveRequirement,
        existingLocomotive,
        traction,
        destinationStation,
        destinationOperatingPoint,
        destLat,
        destLng,
        requiredDeparture: requiredDeparture ? new Date(requiredDeparture) : null,
        requiredArrival: requiredArrival ? new Date(requiredArrival) : null,
        parkedFrom: new Date(parkedFrom),
        expectedParkedUntil: new Date(expectedParkedUntil),
        parkingTrack,
        afterArrivalAction,
        status: 'AVAILABLE',
        publishedBy: { connect: { id: publishedById } },
        history: {
          create: { fromStatus: null, toStatus: 'AVAILABLE', notes: 'Request published' },
        },
      },
      include: { history: { orderBy: { changedAt: 'desc' } } },
    })
  );
}

// ─── READ — LIST ──────────────────────────────────────────────────────────────

async function getAllTrains(filters = {}) {
  const {
    dateFrom,
    dateTo,
    region,
    requestType,
    page = 1,
    limit = 20,
  } = filters;

  const where = { status: { not: 'CANCELLED' } };

  if (region && region !== 'ALL') where.region = region;
  if (requestType && requestType !== 'ALL') where.requestType = requestType;
  
  if (dateFrom || dateTo) {
    where.parkedFrom = {};
    if (dateFrom) where.parkedFrom.gte = new Date(dateFrom);
    if (dateTo) where.parkedFrom.lte = new Date(dateTo);
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
      include: {
        _count: { select: { bids: true } }
      }
    }),
    prisma.train.count({ where }),
  ]);

  return {
    data: trains.map(t => ({ ...t, bidsCount: t._count.bids })),
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

async function getTrainById(id) {
  const train = await prisma.train.findUnique({
    where: { id },
    include: { 
      history: { orderBy: { changedAt: 'desc' } },
      bids: { include: { bidder: { select: { name: true, companyName: true, evuCode: true } } } },
      updates: { orderBy: { createdAt: 'desc' } }
    },
  });
  if (!train) throw new AppError('Train request not found', 404);
  return train;
}

// ─── LOCKING ──────────────────────────────────────────────────────────────────

async function reserveTrain(id, userId) {
  const train = await prisma.train.findUnique({ where: { id } });
  if (!train) throw new AppError('Train request not found', 404);
  
  if (train.status !== 'AVAILABLE') {
    throw new AppError('Train is not available for reservation', 400);
  }

  const now = new Date();
  if (train.lockedUntil && train.lockedUntil > now && train.lockedByUserId !== userId) {
    throw new AppError('Train is currently locked by another company', 409);
  }

  const lockUntil = new Date(now.getTime() + 10 * 60000); // 10 minutes from now

  const updatedTrain = await prisma.train.update({
    where: { id },
    data: {
      lockedUntil: lockUntil,
      lockedByUserId: userId,
      status: 'IN_RESERVATION',
    },
  });
  
  await prisma.trainHistory.create({
    data: {
      trainId: id,
      fromStatus: 'AVAILABLE',
      toStatus: 'IN_RESERVATION',
      notes: 'Train reserved for bidding'
    }
  });
  
  return updatedTrain;
}

async function releaseReservation(id, userId) {
  const train = await prisma.train.findUnique({ where: { id } });
  if (!train) throw new AppError('Train request not found', 404);
  
  if (train.lockedByUserId !== userId) {
    throw new AppError('You do not own this reservation', 403);
  }

  const updatedTrain = await prisma.train.update({
    where: { id },
    data: {
      lockedUntil: null,
      lockedByUserId: null,
      status: 'AVAILABLE',
    },
  });
  
  await prisma.trainHistory.create({
    data: {
      trainId: id,
      fromStatus: 'IN_RESERVATION',
      toStatus: 'AVAILABLE',
      notes: 'Reservation released'
    }
  });
  
  return updatedTrain;
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  createTrain,
  getAllTrains,
  getTrainById,
  reserveTrain,
  releaseReservation,
  AppError,
  DuplicateActiveTrainError,
};
