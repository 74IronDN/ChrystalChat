const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, groupsController.createGroup);
router.get('/', authenticateToken, groupsController.getUserGroups);
router.get('/:groupId', authenticateToken, groupsController.getGroupInfo);
router.post('/:groupId/members', authenticateToken, groupsController.addMember);
router.put('/:groupId/members/:userId', authenticateToken, groupsController.updateMemberRole);
router.delete('/:groupId/members/:userId', authenticateToken, groupsController.removeMember);
router.put('/:groupId', authenticateToken, groupsController.updateGroup);
router.delete('/:groupId', authenticateToken, groupsController.deleteGroup);

module.exports = router;