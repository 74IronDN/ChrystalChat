const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premiumController');
const { authenticateToken } = require('../middleware/auth');

router.get('/status', authenticateToken, premiumController.getStatus);
router.post('/purchase', authenticateToken, premiumController.purchasePremium);

module.exports = router;
