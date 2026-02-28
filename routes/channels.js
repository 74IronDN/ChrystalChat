const express = require('express');
const router = express.Router();
const channelsController = require('../controllers/channelsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, channelsController.createChannel);
router.get('/', authenticateToken, channelsController.getUserChannels);
router.get('/:channelId', authenticateToken, channelsController.getChannelInfo);
router.post('/:channelId/subscribe', authenticateToken, channelsController.subscribe);
router.post('/:channelId/unsubscribe', authenticateToken, channelsController.unsubscribe);
router.put('/:channelId/subscribers/:userId', authenticateToken, channelsController.updateSubscriberRole);
router.put('/:channelId', authenticateToken, channelsController.updateChannel);
router.delete('/:channelId', authenticateToken, channelsController.deleteChannel);

module.exports = router;