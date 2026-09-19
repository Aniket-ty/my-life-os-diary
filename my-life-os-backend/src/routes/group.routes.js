const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', groupController.getUserGroups);
router.post('/', groupController.createGroup);
router.get('/:id', groupController.getGroupById);
router.get('/:id/export/csv', groupController.exportGroupCsv);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);
router.post('/:id/members', groupController.addMember);
router.delete('/:id/members/:memberId', groupController.removeMember);
router.post('/:id/leave', groupController.leaveGroup);

module.exports = router;
