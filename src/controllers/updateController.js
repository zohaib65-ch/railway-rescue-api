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

async function createUpdate(req, res, next) {
  try {
    const trainId = req.params.id; // from /api/trains/:id/updates
    const { message } = req.body;
    const authorId = req.user.id;

    const train = await prisma.train.findUnique({ 
      where: { id: trainId },
      include: { bids: { where: { status: 'ACCEPTED' } } }
    });
    
    if (!train) throw new AppError('Train not found', 404);

    // Only allow publisher or accepted contractor to post updates
    const isPublisher = train.publishedById === authorId;
    const isContractor = train.bids.some(b => b.bidderId === authorId);

    if (!isPublisher && !isContractor) {
      throw new AppError('Only the customer or the assigned contractor can post operational updates', 403);
    }

    const update = await prisma.operationalUpdate.create({
      data: {
        trainId,
        authorId,
        message,
      }
    });

    // Special case: if message contains "TRAIN DEPARTED"
    if (message.toUpperCase().includes('TRAIN DEPARTED')) {
      await prisma.train.update({
        where: { id: trainId },
        data: { 
          status: 'COMPLETED',
          actualDepartureTime: new Date()
        }
      });
      await prisma.trainHistory.create({
        data: {
          trainId,
          fromStatus: train.status,
          toStatus: 'COMPLETED',
          notes: 'Train departed'
        }
      });
    }

    return sendSuccess(res, 201, 'Operational update posted successfully', update);
  } catch (err) { next(err); }
}

module.exports = {
  createUpdate
};
