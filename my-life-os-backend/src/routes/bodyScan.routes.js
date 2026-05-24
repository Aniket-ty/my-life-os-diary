const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getScans, createScan, deleteScan } = require('../controllers/bodyScan.controller');

router.use(authenticate);
router.get('/', getScans);
router.post('/', createScan);
router.delete('/:id', deleteScan);

module.exports = router;
