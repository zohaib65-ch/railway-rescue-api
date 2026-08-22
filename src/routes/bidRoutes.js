'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/bidController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, ctrl.createBid);
router.get('/', ctrl.getBidsForTrain);
router.patch('/:id/accept', protect, ctrl.acceptBid);
router.patch('/:id/reject', protect, ctrl.rejectBid);

module.exports = router;
