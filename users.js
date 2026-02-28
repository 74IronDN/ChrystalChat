const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/profile', authenticateToken, userController.getProfile);
router.get('/search', authenticateToken, userController.searchUsers);
router.get('/by-username/:username', authenticateToken, userController.getUserByUsername);
router.get('/chats', authenticateToken, userController.getChats);
router.post('/theme', authenticateToken, userController.updateTheme);
router.post('/privacy', authenticateToken, userController.updatePrivacy);

module.exports = router;