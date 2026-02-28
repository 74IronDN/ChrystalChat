const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auctionController');
const { authenticateToken } = require('../middleware/auth');

router.get('/items', authenticateToken, auctionController.getItems);
router.post('/buy', authenticateToken, auctionController.buyItem);

module.exports = router;