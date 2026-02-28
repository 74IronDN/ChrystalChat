const express = require('express');
const router = express.Router();
const starsController = require('../controllers/starsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/balance', authenticateToken, starsController.getBalance);
router.get('/transactions', authenticateToken, starsController.getTransactions);
router.post('/purchase', authenticateToken, starsController.purchaseStars);

module.exports = router;