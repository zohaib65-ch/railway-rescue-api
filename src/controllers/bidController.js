'use strict';

const { prisma } = require('../config/database');
const { sendSuccess } = require('../utils/response');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

async function createBid(req, res, next) {
  try {
    const { trainId, priceOffer, locomotiveDetails, driverEta, comments } = req.body;
    const bidderId = req.user.id;

    // Verify train is locked by this user
    const train = await prisma.train.findUnique({ where: { id: trainId } });
    if (!train) throw new AppError('Train not found', 404);
    
    if (train.lockedByUserId !== bidderId || !train.lockedUntil || train.lockedUntil < new Date()) {
      throw new AppError('You must lock the train before submitting a bid, or your lock has expired.', 403);
    }

    const bid = await prisma.bid.create({
      data: {
        trainId,
        bidderId,
        priceOffer: Number(priceOffer),
        locomotiveDetails,
        driverEta,
        comments,
      },
    });
    
    // Release the lock after successful bid
    await prisma.train.update({
      where: { id: trainId },
      data: {
        lockedUntil: null,
        lockedByUserId: null,
        status: 'AVAILABLE', // Returns to available but now has bids
      }
    });

    return sendSuccess(res, 201, 'Bid submitted successfully', bid);
  } catch (err) { next(err); }
}

async function getBidsForTrain(req, res, next) {
  try {
    const { trainId } = req.query;
    if (!trainId) throw new AppError('trainId query parameter is required', 400);

    const bids = await prisma.bid.findMany({
      where: { trainId },
      include: {
        bidder: {
          select: { id: true, name: true, companyName: true, evuCode: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 200, 'Bids retrieved successfully', bids);
  } catch (err) { next(err); }
}

async function acceptBid(req, res, next) {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const bid = await prisma.bid.findUnique({ 
      where: { id },
      include: { train: true }
    });
    
    if (!bid) throw new AppError('Bid not found', 404);
    if (bid.train.publishedById !== customerId) {
      throw new AppError('Only the publisher of the train can accept a bid', 403);
    }

    // Transaction to update bid, reject other bids, and update train status
    const [updatedBid, trainUpdate] = await prisma.$transaction([
      prisma.bid.update({
        where: { id },
        data: { status: 'ACCEPTED' }
      }),
      prisma.bid.updateMany({
        where: { trainId: bid.trainId, id: { not: id } },
        data: { status: 'REJECTED' }
      }),
      prisma.train.update({
        where: { id: bid.trainId },
        data: { status: 'ASSIGNED' }
      }),
      prisma.trainHistory.create({
        data: {
          trainId: bid.trainId,
          fromStatus: bid.train.status,
          toStatus: 'ASSIGNED',
          notes: `Bid ${id} accepted`
        }
      })
    ]);

    return sendSuccess(res, 200, 'Bid accepted and train assigned successfully', updatedBid);
  } catch (err) { next(err); }
}

async function rejectBid(req, res, next) {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const bid = await prisma.bid.findUnique({ 
      where: { id },
      include: { train: true }
    });
    
    if (!bid) throw new AppError('Bid not found', 404);
    if (bid.train.publishedById !== customerId) {
      throw new AppError('Only the publisher of the train can reject a bid', 403);
    }

    const updatedBid = await prisma.bid.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    return sendSuccess(res, 200, 'Bid rejected successfully', updatedBid);
  } catch (err) { next(err); }
}

module.exports = {
  createBid,
  getBidsForTrain,
  acceptBid,
  rejectBid
};
