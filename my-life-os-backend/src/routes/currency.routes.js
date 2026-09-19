const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currency.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', currencyController.getCurrencies);
router.get('/rate', currencyController.getExchangeRate);
router.post('/convert', currencyController.convert);

module.exports = router;
