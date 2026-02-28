const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/stats', authenticateToken, isAdmin, adminController.getStats);
router.post('/stars/add', authenticateToken, isAdmin, adminController.addStars);
router.post('/stars/remove', authenticateToken, isAdmin, adminController.removeStars);
router.post('/premium/add', authenticateToken, isAdmin, adminController.addPremium);
router.post('/premium/remove', authenticateToken, isAdmin, adminController.removePremium);
router.post('/gift/add', authenticateToken, isAdmin, adminController.addGift);
router.post('/gift/remove', authenticateToken, isAdmin, adminController.removeGift);
router.post('/auction/add', authenticateToken, isAdmin, adminController.addAuctionItem);
router.post('/ban', authenticateToken, isAdmin, adminController.banUser);
router.post('/unban', authenticateToken, isAdmin, adminController.unbanUser);
router.post('/delete', authenticateToken, isAdmin, adminController.deleteUser);

module.exports = router;
