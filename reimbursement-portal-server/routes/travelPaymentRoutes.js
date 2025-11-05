const express = require('express');
const router = express.Router();
const { submitVoucher, getVouchers } = require('../controllers/localTravelController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/submit', authMiddleware, submitVoucher);
router.get('/', authMiddleware, getVouchers);

module.exports = router;
