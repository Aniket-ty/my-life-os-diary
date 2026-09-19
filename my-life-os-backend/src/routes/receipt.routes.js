const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receipt.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.post('/scan', upload.single('receipt'), receiptController.scanReceipt);
router.get('/', receiptController.getReceipts);
router.get('/:id', receiptController.getReceiptById);
router.put('/:id', receiptController.updateReceipt);
router.post('/preview-splits', receiptController.previewItemSplits);
router.post('/:id/create-expense', receiptController.createExpenseFromReceipt);

module.exports = router;
