'use strict';

const express = require('express');
const router  = express.Router({ mergeParams: true }); // to access :id from parent router
const ctrl    = require('../controllers/updateController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, ctrl.createUpdate);

module.exports = router;
