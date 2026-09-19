const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', syncController.batchSync);
router.get('/snapshot', syncController.getSnapshot);

module.exports = router;
