const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlement.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', settlementController.createSettlement);
router.get('/group/:groupId', settlementController.getGroupSettlements);
router.delete('/:id', settlementController.deleteSettlement);

module.exports = router;
