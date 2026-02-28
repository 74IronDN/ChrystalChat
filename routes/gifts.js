const express = require('express');
const router = express.Router();
const giftsController = require('../controllers/giftsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, giftsController.getGifts);
router.post('/buy', authenticateToken, giftsController.buyGift);
router.post('/send', authenticateToken, giftsController.sendGift);

module.exports = router;