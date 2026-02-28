const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, messagesController.sendMessage);
router.get('/:userId', authenticateToken, messagesController.getMessages);
router.get('/groups/:groupId', authenticateToken, messagesController.getGroupMessages);
router.get('/channels/:channelId', authenticateToken, messagesController.getChannelMessages);
router.put('/:messageId', authenticateToken, messagesController.editMessage);
router.delete('/:messageId', authenticateToken, messagesController.deleteMessage);

module.exports = router;